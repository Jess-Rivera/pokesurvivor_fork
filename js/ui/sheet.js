/* ============ sheet.js — the team summary sheet (upgrade rework, slices 2d-1 and 2d-2) ============
 * One component, three uses: the pause screen, the team view from the end-of-run screen, and the CHOOSE mode of
 * the level-up screen. It shows the roster strip, and for the selected Pokemon: name, level, types, HP, the stat
 * hexagon (white = species base stat underneath, 60% yellow = the in-run stat-card bonus on top, "+X%" beside each
 * number), the held item, and ALL its moves grouped by bond, each with its upgrade stacks, its current numbers and
 * the damage of one hit against a typical enemy.
 *
 *   G.Sheet.render(mount, roster, { sel, onSelect, choose })   fill `mount` (a container element)
 *     choose = { card, targets, onChange(info), onConfirm }     level-up choose mode (see below)
 *   G.Sheet.keys(mount)            keyboard: swap keys and Left/Right switch Pokemon, Up/Down scroll the moves
 *   G.Sheet.chosen(mount)          { pl, move } currently selected (choose mode)
 *   G.Sheet.pickMoveIndex(mount, n) select the n-th shown move if it can take the card (choose mode); true if it did
 *   G.Sheet.moveLines(pl, m)       { raw, hit, stacks } text for one move (also used by tests)
 *   G.Sheet.typicalDef()           { def, spd }: median base Def / SpD of the roster
 *
 * Choose mode: `card` is the level-up card being applied (type 'mech' or 'stat'), `targets` is card.targets(roster)
 * (per Pokemon: ok, moves[{m, ok, why}] or, for stat cards, note). Pokemon that cannot take the card stay viewable
 * but dimmed. A mechanic card is applied to ONE move: the selected move row shows "before to after" for the card's
 * stat and for one-hit damage. A stat card is applied to one Pokemon: the hexagon shows the pending change and the
 * moves it affects (Protein / Calcium) show their new hit damage. onChange({ ok, why }) fires after every repaint
 * so the screen can enable its Confirm button and show why it cannot confirm.
 *
 * Hit damage uses the same two halves as combat (pl.moveFactor, G.Stats.applyDamage) against a NEUTRAL
 * enemy of the median base Def/SpD at the Pokemon's level: no type matchup, no crit. It is for comparing
 * builds, not a prediction of the number you will see in play.
 */
G.Sheet = (() => {
  const E = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const STAT_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];       // = the index order of pokedex stats[]
  const state = new WeakMap();                                          // mount -> { sel, roster, onSelect, choose, move }

  let med = null;
  function typicalDef() {
    if (med) return med;
    const pick = i => {
      const a = (G.DEX || []).map(p => p.stats && p.stats[i]).filter(v => v > 0).sort((x, y) => x - y);
      return a.length ? a[a.length >> 1] : 70;
    };
    return (med = { def: pick(2), spd: pick(4) });
  }

  const r1 = v => String(+(+v).toFixed(Math.abs(v) < 10 ? 2 : 1));
  const r0 = v => String(Math.round(v));
  const r1d = v => (v >= 100 ? r0(v) : String(+(+v).toFixed(1)));
  /** One formatter per stat key; returns null to leave the key out. */
  const FMT = {
    dmg: (v, m) => (G.Kinds.BY[m.kind] && G.Kinds.BY[m.kind].payload === 'damage' ? 'Power ' + r0(v) : null),
    cd: v => 'every ' + r1(v) + ' s',
    count: v => (v > 1 ? '×' + r0(v) : null),
    rate: v => 'shoots every ' + r1(v) + ' s',
    pierce: v => (v > 0 ? 'pierce ' + r0(v) : null),
    radius: v => 'area ' + r0(v),
    width: v => 'width ' + r0(v),
    arc: v => 'arc ' + r0(v * 180 / Math.PI) + '°',
    size: v => 'size ' + r0(v),
    life: v => 'range ' + r1(v) + ' s',
    speed: v => 'speed ' + r0(v),
    knock: v => (v > 0 ? 'knockback ' + r0(v) : null),
    dur: v => 'lasts ' + r1(v) + ' s',
    stacks: v => 'up to ' + r0(v) + ' stacks',
    amount: v => 'potency ' + r0(v * 100) + '%'
  };

  /** Damage of one hit against the typical enemy (null for moves that do no damage). */
  function hitOf(pl, m) {
    const k = G.Kinds.BY[m.kind];
    if (!k || k.payload !== 'damage' || !(m.dmg > 0)) return null;
    const t = typicalDef();
    return G.Stats.applyDamage(pl.moveFactor(m), t.def, t.spd, m, pl.level, pl.stabFor(m));
  }

  /** One-line summary for the collapsed card: hit damage, heal, or a short effect. */
  function summaryOf(pl, m) {
    const d = hitOf(pl, m);
    if (d != null) return 'Hits for about ' + r1d(d);
    if (m.drain) return 'Heals from damage dealt';
    if (m.kind === 'buff' && m.stat === 'regen') return 'Heals over time';
    if (m.kind === 'buff' && m.stat) {
      const LBL = { atk: 'Atk', def: 'Def', spa: 'Sp. Atk', spd: 'Speed', spe: 'Speed' };
      return 'Team ' + (LBL[m.stat] || m.stat) + ' +' + (m.stageN || 1) + ' per cast';
    }
    const ail = G.Mechanics.ailmentText(m);
    return ail || 'Support move';
  }

  /** Detail rows for the hover/tap panel: every stat, with base (with item) on the fields a held item changes. */
  function detailOf(pl, m) {
    const k = G.Kinds.BY[m.kind];
    const rm = (pl && pl.moveRadiusMul) || 1, cdm = (pl && pl.cdMul) || 1;
    const rows = [];
    if (k) for (const key of k.keys) {
      if (m[key] == null) continue;
      const t = FMT[key] && FMT[key](m[key], m); if (!t) continue;
      // cooldown (Quick Claw), area + arc (Wide/Zoom Lens) are the only stat fields a held item changes
      let withItem = null;
      if (key === 'cd' && cdm !== 1) withItem = FMT.cd(m.cd * cdm);
      else if ((key === 'radius' || key === 'arc') && rm !== 1) withItem = FMT[key](m[key] * rm, m);
      rows.push(withItem && withItem !== t ? t + ' (' + withItem + ')' : t);
    }
    // hit damage, with the held-item atkMul delta (Muscle Band / Wise Glasses / Life Orb / Zoom Lens)
    const d = hitOf(pl, m);
    let hit = '';
    if (d != null) {
      const am = (pl && pl.atkMul) || 1, base = am !== 1 ? d / am : d;      // strip the item multiplier for the base figure
      hit = am !== 1 ? 'Hits for about ' + r1d(base) + ' (' + r1d(d) + ')' : 'Hits for about ' + r1d(d);
    }
    return { raw: rows.join(' · '), hit, ail: G.Mechanics.ailmentText(m) };
  }

  /** Text for one move: raw numbers (what the cards change), stack list, and one-hit damage. */
  function moveLines(pl, m) {
    const k = G.Kinds.BY[m.kind];
    const bits = [];
    if (k) for (const key of k.keys) { if (m[key] == null) continue; const t = FMT[key] && FMT[key](m[key], m); if (t) bits.push(t); }
    if (m.kind === 'buff' && m.stat && m.stat !== 'regen') {          // team stage raise per cast (slice E2a); the move data calls Speed 'spd'
      const LBL = { atk: 'Atk', def: 'Def', spa: 'Sp. Atk', spd: 'Speed', spe: 'Speed' };
      bits.unshift('team ' + LBL[m.stat] + ' +' + (m.stageN || 1) + (m.stage2 ? ', ' + LBL[m.stage2.stat] + ' +' + m.stage2.n : '') + ' per cast');
    }
    const stacks = [];
    for (const id in (m.mods || {})) {
      const mech = G.Mechanics.BY_ID[id], n = m.mods[id];
      if (mech && n > 0) stacks.push(mech.label + ' +' + n);
    }
    const d = hitOf(pl, m);
    return { raw: bits.join(' · '), hit: d == null ? '' : 'Hits for about ' + r1d(d), stacks: stacks.join(' · '), ail: G.Mechanics.ailmentText(m) };
  }

  /** A copy of move `m` with one more stack of `mech`, rebuilt by the real derive(). */
  function withStack(m, mech) {
    const c = Object.assign({}, m, { mods: Object.assign({}, m.mods) });
    c.mods[mech.id] = (c.mods[mech.id] || 0) + 1;
    return G.Moves.derive(c);
  }
  /** Run fn with the Pokemon's stat card temporarily applied (the stat card preview). */
  function withInc(pl, st, fn) {
    pl.inc[st.id] += st.step;
    try { return fn(); } finally { pl.inc[st.id] -= st.step; }
  }

  const hpText = pl => Math.max(0, Math.ceil(pl.hp)) + '/' + Math.round(pl.maxHp);

  function statBlock(pl, card) {
    const st = pl.mon.stats || [0, 0, 0, 0, 0, 0];
    const bonus = STAT_ORDER.map(k => pl.incOf ? pl.incOf(k) : (pl.inc[k] || 0));
    const o = { bonus, hpText: hpText(pl), layered: true };
    if (card && card.type === 'stat') {
      const s = card.stat, after = bonus.slice();
      after[STAT_ORDER.indexOf(s.id)] += s.step;
      o.after = after;
      if (s.id === 'hp' && pl.baseHpStat != null) {
        const nm = withInc(pl, s, () => pl.maxHpAt(pl.level));
        o.hpText = hpText(pl) + ' to ' + (pl.dead ? Math.max(0, Math.ceil(pl.hp)) : Math.ceil(pl.hp + Math.max(0, nm - pl.maxHp))) + '/' + nm;
      }
    }
    return G.StatChart.make(st, '#ffffff', 340, 262, o);
  }

  function rosterStrip(S) {
    return S.roster.map((f, i) => {
      const slot = f.teamSlot != null ? f.teamSlot : i;
      const T = S.choose && S.choose.targets[i];
      const why = T && !T.ok ? (T.note || 'No move can take it') : '';
      return `<button class="sh-tab${i === S.sel ? ' on' : ''}${f.dead ? ' dead' : ''}${T && !T.ok ? ' dimmed' : ''}" data-i="${i}" title="${E(f.mon.name + (why ? ': ' + why : ''))}"><span class="sh-sp"></span><i>${G.Input.keyLabel('swap_' + (slot + 1))}</i></button>`;
    }).join('');
  }

  /** The moves in the order they are shown (grouped by bond). */
  function shownMoves(pl) { return (pl.slots.length ? pl.slots : pl.moves.map(m => [m])).flat(); }

  function moveRows(S, pl) {
    const groups = pl.slots.length ? pl.slots : pl.moves.map(m => [m]);
    const act = G.Game && G.Game.player === pl ? pl.active : -1;
    const ch = S.choose, card = ch && ch.card;
    const T = ch && ch.targets[S.sel];
    const order = shownMoves(pl);
    return groups.map((g, gi) => {
      const rows = g.map(m => {
        const n = G.Moves.stackTotal(m), col = G.U.TYPE_COLOR[m.type];
        const det = detailOf(pl, m);                 // full breakdown for the hover/tap panel (base + item deltas)
        const summary = summaryOf(pl, m);            // the one collapsed line
        const stacksTxt = moveLines(pl, m).stacks;
        let cls = '', pv = '', hit = '', key = '', tail = '', preview = false;
        if (card && card.type === 'mech') {
          const x = T && T.moves.find(v => v.m === m);
          const ok = !!(x && x.ok);
          cls = ok ? ' pickable' + (S.move === m ? ' pick' : '') : ' dim';
          const ix = order.indexOf(m);
          if (ix < 4) key = `<i class="mk">${E(G.Input.keyLabel('attack_' + (ix + 1)))}</i>`;
          if (!ok) tail = `<div class="why">${E(x ? x.why : '')}</div>`;
          else if (S.move === m) {
            const mech = card.mech, d0 = hitOf(pl, m), d1 = hitOf(pl, withStack(m, mech));
            pv = `<div class="pv">${E(G.Mechanics.text(m, mech))}: ${E(G.Mechanics.preview(m, mech))}</div>`;
            if (d0 != null && d1 != null) hit = 'Hits for about ' + r1d(d0) + ' to ' + r1d(d1);
            preview = true;
          }
        } else if (card && card.type === 'stat') {
          const d0 = hitOf(pl, m), d1 = d0 == null ? null : withInc(pl, card.stat, () => hitOf(pl, m));
          if (d0 != null && Math.abs(d1 - d0) > 1e-9) { hit = 'Hits for about ' + r1d(d0) + ' to ' + r1d(d1); pv = `<div class="pv">${E(card.stat.label)} ${E(card.stat.stat)} +${Math.round((pl.inc[card.stat.id] + card.stat.step) * 100)}%</div>`; preview = true; }
        }
        // Collapsed card: icon, name + chips, upgrades taken, one summary line. Full detail lives in the hover/tap panel.
        // In choose mode the card's inline preview (pv + before/after hit) still shows, that is the decision the screen exists for.
        const panel = `<div class="sh-detail" role="tooltip">`
          + (det.raw ? `<div class="ds">${E(det.raw)}</div>` : '')
          + (det.ail ? `<div class="ail">${E(det.ail)}</div>` : '')
          + (det.hit ? `<div class="hit">${E(det.hit)}</div>` : '')
          + `</div>`;
        return `<div class="sh-move${cls}" data-mi="${order.indexOf(m)}" tabindex="0">
          <div class="ico" style="background:${col}33">${G.Icons.html('move:' + m.id, 32)}</div>
          <div class="txt"><div class="nm">${E(m.name)} <span class="type" style="background:${col}">${E(G.U.TYPE_NAME[m.type])}</span>${n ? ` <span class="tag-chip" style="background:${col}">+${n}</span>` : ''}</div>
            ${stacksTxt ? `<div class="stk">${E(stacksTxt)}</div>` : ''}
            <div class="sum">${E(summary)}</div>
            ${preview ? `${pv}${hit ? `<div class="hit">${E(hit)}</div>` : ''}` : ''}${tail}
          </div>${key}${panel}</div>`;
      }).join('');
      const bonded = g.length > 1;
      return `<div class="sh-group${bonded ? ' bonded' : ''}${gi === act ? ' on' : ''}">${bonded ? '<div class="sh-bond">Cast together</div>' : ''}${rows}</div>`;
    }).join('') || '<div class="ds">No moves yet.</div>';
  }

  /** First move of `pl` (by shown order) that can take the card, or null. */
  function firstOk(S, i) {
    const T = S.choose && S.choose.targets[i];
    if (!T || !T.ok || S.choose.card.type !== 'mech') return null;
    const pl = S.roster[i];
    return shownMoves(pl).find(m => { const x = T.moves.find(v => v.m === m); return x && x.ok; }) || null;
  }

  function info(S) {
    const ch = S.choose, T = ch.targets[S.sel];
    if (!T.ok) return { ok: false, why: ch.card.type === 'stat' ? (T.note || '') : S.roster[S.sel].mon.name + ': no move can take it' };
    if (ch.card.type === 'stat') return { ok: true, why: '' };
    if (!S.move) return { ok: false, why: 'Choose a move' };
    const x = T.moves.find(v => v.m === S.move);
    return x && x.ok ? { ok: true, why: '' } : { ok: false, why: x ? x.why : '' };
  }

  function render(mount, roster, opts = {}) {
    const S = { roster, sel: Math.max(0, Math.min(roster.length - 1, opts.sel != null ? opts.sel : 0)), onSelect: opts.onSelect, choose: opts.choose || null, move: null, scrollFor: -1,
      canMoveItems: !!opts.canMoveItems && !opts.choose, giving: false };
    if (S.choose) {
      // start on the wanted Pokemon if it can take the card, else the first one that can
      const ok = i => S.choose.targets[i] && S.choose.targets[i].ok;
      if (!ok(S.sel)) { const j = roster.findIndex((f, i) => ok(i)); if (j >= 0) S.sel = j; }
      S.move = firstOk(S, S.sel);
    }
    state.set(mount, S);
    paint(mount);
  }

  function paint(mount) {
    const S = state.get(mount); if (!S) return;
    const pl = S.roster[S.sel]; if (!pl) { mount.innerHTML = ''; return; }
    const prevScroll = mount.querySelector('.sh-scroll');
    const keepTop = prevScroll && S.scrollFor === S.sel ? prevScroll.scrollTop : 0;
    const item = pl.item && G.Items.BY[pl.item];
    // The roster strip sits in the title row when the screen provides a slot for it (right-aligned), else above the card.
    const slot = mount.parentElement && mount.parentElement.querySelector('.sh-strip-slot');
    const strip = `<div class="sh-strip${S.giving ? ' giving' : ''}">${rosterStrip(S)}</div>`;
    if (slot) slot.innerHTML = strip;
    const card = S.choose && S.choose.card;
    mount.innerHTML = `
      ${slot ? '' : strip}
      <div class="sh-card">
        <div class="sh-head">
          <span class="sh-face"></span>
          <span class="sh-name" translate="no">${E(pl.mon.name)}</span>
          <span class="sh-lv">Lv. ${pl.level}</span>
          ${pl.dead ? '<span class="sh-fainted">Fainted</span>' : ''}
          <span class="sh-types">${G.UI.typeChips(pl.mon.types)}</span>
        </div>
        <div class="sh-cols">
          <div class="sh-moves"><h3>Moves</h3><div class="sh-scroll">${moveRows(S, pl)}</div></div>
          <div class="sh-stats"><h3>Stats</h3><div class="sh-hex"></div>
            <div class="sh-legend"><i class="w"></i> base <i class="y"></i> from cards${card && card.type === 'stat' ? ' <i class="p"></i> after this card' : ''}</div>
            ${item ? `<div class="sh-item"><span class="sh-itag">Held item</span><span class="sh-iico">${G.Icons.html(item.icon || pl.item, 28)}</span><b>${E(item.name)}</b>${S.canMoveItems && S.roster.length > 1 ? `<button type="button" class="sh-mv${S.giving ? ' on' : ''}">${S.giving ? 'Cancel' : 'Move item'}</button>` : ''}<div class="ds">${S.giving ? 'Click a teammate in the top right to give it this item (they swap if it holds one).' : E(item.desc || '')}</div></div>` : ''}
            ${pl.runItems && pl.runItems.length ? `<div class="sh-item"><span class="sh-itag">Run items</span> ${pl.runItems.map(rid => { const r = G.Items.BY[rid]; return r ? `<span class="sh-iico" title="${E(r.desc || '')}">${G.Icons.html(r.icon || rid, 22)}</span> <b>${E(r.name)}</b>` : ''; }).join(' &nbsp; ')}</div>` : ''}
            ${(() => {
              const bag = pl.berries || [], slots = G.Grounds.berrySlots(G.DB && G.DB.save), rows = [];
              for (let k = 0; k < slots; k++) {
                const b = G.Grounds.BY[bag[k]];
                rows.push(b ? `<div class="sh-bag"><span class="sh-iico">${G.Icons.html('ps:' + b.icon, 22)}</span><b>${E(b.name)}</b><div class="ds">${E(b.desc || '')}</div></div>`
                  : `<div class="sh-bag empty"><span class="sh-iico sh-bagbox"></span><b>Berry slot</b> (empty)</div>`);
              }
              return `<div class="sh-item"><span class="sh-itag">Berry bag</span> <span class="ds">Team-wide, used automatically</span>${rows.join('')}</div>`;
            })()}
          </div>
        </div>
      </div>`;
    mount.querySelector('.sh-face').appendChild(G.UI.spriteCanvas(pl.dex, 96, 96, { scale: 3, hero: true, shiny: pl.shiny }));
    mount.querySelector('.sh-hex').appendChild(statBlock(pl, card));
    (slot || mount).querySelectorAll('.sh-tab').forEach(b => {
      const f = S.roster[+b.dataset.i];
      b.querySelector('.sh-sp').appendChild(G.UI.spriteCanvas(f.dex, 44, 44, { scale: 1, shiny: f.shiny }));
      b.onclick = () => { if (S.giving) giveTo(mount, +b.dataset.i); else select(mount, +b.dataset.i); };
    });
    const mv = mount.querySelector('.sh-mv');
    if (mv) mv.onclick = () => { S.giving = !S.giving; G.Audio.sfx('select'); paint(mount); };
    const sc = mount.querySelector('.sh-scroll');
    if (sc) sc.scrollTop = keepTop;
    S.scrollFor = S.sel;
    // The detail panel is position:fixed (a top layer, never clipped by the scroll box). Show it on hover (mouse)
    // or tap (touch), positioned next to the row and clamped to the viewport so it is never cut off.
    if (sc) {
      const hideAll = () => sc.querySelectorAll('.sh-detail').forEach(p => { p.style.display = 'none'; });
      const showFor = row => {
        const panel = row.querySelector('.sh-detail'); if (!panel) return;
        hideAll();
        panel.style.display = 'block';                       // show first so offsetHeight/Width are real
        const r = row.getBoundingClientRect(), ph = panel.offsetHeight, pw = panel.offsetWidth, M = 8;
        let top = r.top - ph - 4;                            // prefer above the row
        if (top < M) top = r.bottom + 4;                     // no room above -> below
        top = Math.max(M, Math.min(top, window.innerHeight - ph - M));   // clamp vertically
        let left = r.left;
        left = Math.max(M, Math.min(left, window.innerWidth - pw - M));  // clamp horizontally
        panel.style.top = top + 'px';
        panel.style.left = left + 'px';
      };
      sc.querySelectorAll('.sh-move').forEach(row => {
        row.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') showFor(row); });
        row.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hideAll(); });
        row.addEventListener('pointerup', e => {
          if (e.pointerType === 'mouse') return;             // touch: tap toggles
          const panel = row.querySelector('.sh-detail'), open = panel && panel.style.display === 'block';
          hideAll();
          if (!open) showFor(row);
        });
      });
      sc.addEventListener('scroll', hideAll, { passive: true });     // scrolling closes it (fixed panel would detach otherwise)
    }
    if (S.choose) {
      mount.querySelectorAll('.sh-move.pickable').forEach(el => {
        el.onclick = () => pickMove(mount, shownMoves(pl)[+el.dataset.mi]);
        el.ondblclick = () => { pickMove(mount, shownMoves(pl)[+el.dataset.mi]); if (S.choose.onConfirm) S.choose.onConfirm(); };
      });
      if (S.choose.onChange) S.choose.onChange(info(S));
    }
  }

  /** Team sheet (pause only): hand the selected Pokemon's item to roster member i (swap if it holds one). Clicking itself cancels. */
  function giveTo(mount, i) {
    const S = state.get(mount); if (!S || !S.giving) return;
    const from = S.roster[S.sel], to = S.roster[i];
    S.giving = false;
    if (!to || to === from) { paint(mount); return; }
    const r = from.swapHeldItem(to);
    if (r) {
      const nm = id => G.Items.BY[id].name;
      G.UI.toast(r.a && r.b ? `${from.mon.name} and ${to.mon.name} swapped ${nm(r.a)} and ${nm(r.b)}` : `${nm(r.a || r.b)} moved to ${(r.a ? to : from).mon.name}`, 2200);
      G.Audio.sfx('confirm');
    }
    paint(mount);
  }

  function select(mount, i) {
    const S = state.get(mount); if (!S || !S.roster[i] || i === S.sel) return;
    S.giving = false;                      // keyboard / any other switch cancels a pending item move
    S.sel = i;
    if (S.choose) S.move = firstOk(S, i);
    G.Audio.sfx('select');
    paint(mount);
    if (S.onSelect) S.onSelect(i);
  }

  function pickMove(mount, m) {
    const S = state.get(mount); if (!S || !S.choose || !m) return false;
    const T = S.choose.targets[S.sel], x = T && T.moves.find(v => v.m === m);
    if (!x || !x.ok) return false;
    if (S.move !== m) { S.move = m; G.Audio.sfx('select'); paint(mount); }
    return true;
  }

  /** Select the n-th shown move (0-based) when it can take the card. */
  function pickMoveIndex(mount, n) {
    const S = state.get(mount); if (!S) return false;
    return pickMove(mount, shownMoves(S.roster[S.sel])[n]);
  }

  function chosen(mount) {
    const S = state.get(mount);
    return S ? { pl: S.roster[S.sel], move: S.move } : { pl: null, move: null };
  }

  /** Keyboard: swap keys / Left-Right switch Pokemon, Up-Down scroll the moves. */
  function keys(mount) {
    const S = state.get(mount); if (!S) return;
    for (let n = 0; n < 6; n++) {
      if (!G.Input.action('swap_' + (n + 1))) continue;
      const j = S.roster.findIndex((f, i) => (f.teamSlot != null ? f.teamSlot : i) === n);
      if (j >= 0) select(mount, j);
      return;
    }
    const dir = G.Input.tap('arrowright') ? 1 : G.Input.tap('arrowleft') ? -1 : 0;
    if (dir) select(mount, (S.sel + dir + S.roster.length) % S.roster.length);
    const sc = mount.querySelector('.sh-scroll');
    if (sc) { if (G.Input.tap('arrowdown')) sc.scrollTop += 80; if (G.Input.tap('arrowup')) sc.scrollTop -= 80; }
  }

  return { render, keys, chosen, pickMoveIndex, moveLines, typicalDef, select };
})();
