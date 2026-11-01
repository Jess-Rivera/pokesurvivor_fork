/* ============ sheet.js: the team summary sheet (upgrade rework, slices 2d-1 and 2d-2) ============
 * One component, two uses: the pause screen and the team view from the end-of-run screen. It shows the roster strip, and for
 * the selected Pokemon: name, level, types, HP, the stat hexagon (white = species base stat underneath, 60% yellow = the in-run
 * bonus on top, "+X%" beside each number), the held item, and ALL its moves grouped by bond, each with its current numbers and
 * the damage of one hit against a typical enemy.
 *
 *   G.Sheet.render(mount, roster, { sel, onSelect, canMoveItems })   fill `mount` (a container element)
 *   G.Sheet.keys(mount)            keyboard: swap keys and Left/Right switch Pokemon, Up/Down scroll the moves
 *   G.Sheet.moveLines(pl, m)       { raw, hit, stacks, ail } text for one move (also used by tests)
 *   G.Sheet.typicalDef()           { def, spd }: median base Def / SpD of the roster
 *   Slice 5b: a "Run Cards" item tab lists the run's team-wide cards, from G.TeamCards.summary.
 *   Slice 7b-2a (Jess 2026-11-01): every move's rows come from the team's folded def; the legacy rows, the per-move upgrade
 *   stacks and the level-up choose mode (it only served the legacy mechanic and stat cards) are gone.
 *
 * Hit damage uses the same two halves as combat (pl.moveFactor, G.Stats.applyDamage) against a NEUTRAL
 * enemy of the median base Def/SpD at the Pokemon's level: no type matchup, no crit. It is for comparing
 * builds, not a prediction of the number you will see in play.
 */
G.Sheet = (() => {
  const E = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const STAT_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];       // = the index order of pokedex stats[]
  const state = new WeakMap();                                          // mount -> { sel, roster, onSelect, itemTab, giving }

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
  // ---- slice 7a: a routed move's rows come from the team's folded def (G.TeamCards.defOf), never the legacy table ----
  const TAU = Math.PI * 2;
  const routed = m => !!G.MoveDefs[m.id];
  const folded = (pl, m) => G.TeamCards.defOf(pl, m.id);
  const kidsOf = d => (d.payload || []).filter(fx => fx.t === 'emit' && fx.move && typeof fx.move === 'object');
  const dealsDamage = d => (d.payload || []).some(fx => fx.t === 'damage') || kidsOf(d).some(fx => dealsDamage(fx.move));
  /** One hit of a def against the typical enemy, through the same adapter as move-effects.js damage() (null when it deals no damage). */
  function defHit(pl, d) {
    if (!(d.basePower > 0) || !dealsDamage(d)) return null;
    const t = typicalDef(), m = { cat: d.category, dmg: d.basePower, type: d.type };
    return G.Stats.applyDamage(pl.moveFactor(m), t.def, t.spd, m, pl.level, pl.stabFor(m));
  }
  /** The def's numbers as [text, text with the held item or null]. An emitter with no shape shows its first child's shape. */
  function defRows(pl, d) {
    const kid = !d.space && kidsOf(d)[0], s = d.space || (kid && kid.move.space) || {}, dv = (kid ? kid.move.delivery : d.delivery) || {};
    const cdm = (pl && pl.cdMul) || 1, lens = (pl && pl.moveRadiusMul) || 1, out = [];
    const row = (t, w) => out.push([t, w && w !== t ? w : null]);
    if (d.basePower > 0 && dealsDamage(d)) row('Power ' + r0(d.basePower));
    if (d.cd > 0) row('every ' + r1(d.cd) + ' s', cdm !== 1 ? 'every ' + r1(d.cd * cdm) + ' s' : null);
    const n = Math.max(s.count || 1, (kid && kid.count) || 1);
    if (n > 1) row('×' + r0(n));
    if (s.radRadius > 0) { const w = dv.motion === 'travels' ? 'size ' : 'area '; row(w + r0(s.radRadius), lens !== 1 ? w + r0(s.radRadius * lens) : null); }
    if (s.radArc > 0 && s.radArc < TAU - 0.01) row('arc ' + r0(s.radArc * 180 / Math.PI) + '°');
    if (s.linLength > 0) row('length ' + r0(s.linLength), lens !== 1 ? 'length ' + r0(s.linLength * lens) : null);
    if (s.linWidth > 0) row('width ' + r0(s.linWidth));
    if (s.pierce > 0 && isFinite(s.pierce)) row('pierce ' + r0(s.pierce));
    if (dv.moveSpeed > 0) row('speed ' + r0(dv.moveSpeed));
    const life = (dv.endOn || []).find(e => e.time > 0), flies = dv.motion === 'travels' || dv.motion === 'returns';
    if (life && !d.persistent && (flies || life.time >= 0.5)) row((flies ? 'range ' : 'lasts ') + r1(life.time) + ' s');     // a swing's 0.15 s is not worth a row
    return out;
  }
  function defSummary(pl, d) {
    const h = defHit(pl, d);
    if (h != null) return 'Hits for about ' + r1d(h);
    const t = G.MoveInfo.effects(d).slice(0, 2).join(', ');
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Support move';
  }
  /** The effects line of a def, minus the plain words the numbers already say. */
  const defAil = d => G.MoveInfo.effects(d).filter(t => t !== 'damage').join(', ');

  /** Damage of one hit against the typical enemy (null for moves that do no damage). */
  function hitOf(pl, m) { return routed(m) ? defHit(pl, folded(pl, m)) : null; }

  /** One-line summary for the collapsed card: hit damage, heal, or a short effect. */
  function summaryOf(pl, m) { return routed(m) ? defSummary(pl, folded(pl, m)) : 'Support move'; }

  /** Detail rows for the hover/tap panel: every stat, with base (with item) on the fields a held item changes. */
  function detailOf(pl, m) {
    if (!routed(m)) return { raw: '', ail: '', hit: '' };
    const d = folded(pl, m), h = defHit(pl, d), am = (pl && pl.atkMul) || 1, base = am !== 1 && h != null ? h / am : h;
    return { raw: defRows(pl, d).map(([t, w]) => (w ? t + ' (' + w + ')' : t)).join(' · '), ail: defAil(d),
      hit: h == null ? '' : am !== 1 ? 'Hits for about ' + r1d(base) + ' (' + r1d(h) + ')' : 'Hits for about ' + r1d(h) };
  }

  /** Text for one move: raw numbers, one-hit damage and effects. `stacks` stays for the tests (always empty since 7b-2a). */
  function moveLines(pl, m) {
    if (!routed(m)) return { raw: '', hit: '', stacks: '', ail: '' };
    const d = folded(pl, m), h = defHit(pl, d);
    return { raw: defRows(pl, d).map(([t]) => t).join(' · '), hit: h == null ? '' : 'Hits for about ' + r1d(h), stacks: '', ail: defAil(d) };
  }

  const hpText = pl => Math.max(0, Math.ceil(pl.hp)) + '/' + Math.round(pl.maxHp);

  function statBlock(pl) {
    const st = pl.mon.stats || [0, 0, 0, 0, 0, 0];
    const bonus = STAT_ORDER.map(k => pl.incOf ? pl.incOf(k) : (pl.inc[k] || 0));
    return G.StatChart.make(st, '#ffffff', 340, 262, { bonus, hpText: hpText(pl), layered: true });
  }

  function rosterStrip(S) {
    return S.roster.map((f, i) => {
      const slot = f.teamSlot != null ? f.teamSlot : i;
      return `<button class="sh-tab${i === S.sel ? ' on' : ''}${f.dead ? ' dead' : ''}" data-i="${i}" title="${E(f.mon.name)}"><span class="sh-sp"></span><i>${G.Input.keyLabel('swap_' + (slot + 1))}</i></button>`;
    }).join('');
  }

  /** The moves in the order they are shown (grouped by bond). */
  function shownMoves(pl) { return (pl.slots.length ? pl.slots : pl.moves.map(m => [m])).flat(); }

  function moveRows(S, pl) {
    const groups = pl.slots.length ? pl.slots : pl.moves.map(m => [m]);
    const act = G.Game && G.Game.player === pl ? pl.active : -1;
    const order = shownMoves(pl);
    return groups.map((g, gi) => {
      const rows = g.map(m => {
        const col = G.U.TYPE_COLOR[m.type];
        const det = detailOf(pl, m);                 // full breakdown for the hover/tap panel (base + item deltas)
        const summary = summaryOf(pl, m);            // the one collapsed line
        // Collapsed card: icon, name + chips, one summary line. Full detail lives in the hover/tap panel.
        const panel = `<div class="sh-detail" role="tooltip">`
          + (det.raw ? `<div class="ds">${E(det.raw)}</div>` : '')
          + (det.ail ? `<div class="ail">${E(det.ail)}</div>` : '')
          + (det.hit ? `<div class="hit">${E(det.hit)}</div>` : '')
          + `</div>`;
        return `<div class="sh-move" data-mi="${order.indexOf(m)}" tabindex="0">
          <div class="ico" style="background:${col}33">${G.Icons.html('move:' + m.id, 32)}</div>
          <div class="txt"><div class="nm">${E(m.name)} <span class="type" style="background:${col}">${E(G.U.TYPE_NAME[m.type])}</span></div>
            <div class="sum">${E(summary)}</div>
          </div>${panel}</div>`;
      }).join('');
      const bonded = g.length > 1;
      return `<div class="sh-group${bonded ? ' bonded' : ''}${gi === act ? ' on' : ''}">${bonded ? '<div class="sh-bond">Cast together</div>' : ''}${rows}</div>`;
    }).join('') || '<div class="ds">No moves yet.</div>';
  }

  function render(mount, roster, opts = {}) {
    const S = { roster, sel: Math.max(0, Math.min(roster.length - 1, opts.sel != null ? opts.sel : 0)), onSelect: opts.onSelect, scrollFor: -1,
      canMoveItems: !!opts.canMoveItems, giving: false };
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
            <div class="sh-legend"><i class="w"></i> base <i class="y"></i> from cards</div>
            ${(() => {
              // Mini tabs for the item area: Berry | Held Item | Team Items (one panel at a time, so the column does not scroll).
              const tab = S.itemTab || 'held';
              const runCards = !!pl.teamCards;     // slice 5b: the run's team-wide cards
              const tabs = [['berry', 'Berry'], ['held', 'Held Item'], ['team', 'Team Items']].concat(runCards ? [['cards', 'Run Cards']] : [])
                .map(([k, n]) => `<button type="button" class="sh-itab${tab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('');
              let body = '';
              if (tab === 'held') {
                body = item
                  ? `<span class="sh-iico">${G.Icons.html(item.icon || pl.item, 28)}</span><b>${E(item.name)}</b>${S.canMoveItems && S.roster.length > 1 ? `<button type="button" class="sh-mv${S.giving ? ' on' : ''}">${S.giving ? 'Cancel' : 'Move item'}</button>` : ''}<div class="ds">${S.giving ? 'Click a teammate in the top right to give it this item (they swap if it holds one).' : E(item.desc || '')}</div>`
                  : `<div class="sh-bag empty"><span class="sh-iico sh-bagbox"></span><b>Held item</b> (none)</div>`;
              } else if (tab === 'cards' && runCards) {
                const rows = G.TeamCards.summary(pl.teamCards).map(r => `<div class="sh-bag"><b>${E(r.label)}${r.stacks > 1 ? ' x' + r.stacks : ''}</b><div class="ds">${E(r.total)}</div></div>`);
                body = `<span class="ds">Team-wide, whole run</span>${rows.join('') || '<div class="ds">No cards yet</div>'}`;
              } else if (tab === 'team') {
                const have = pl.runItems || [], n = G.Items.runSlots(G.DB && G.DB.save), rows = [];
                for (let k = 0; k < n; k++) {
                  const r = G.Items.BY[have[k]];
                  rows.push(r ? `<div class="sh-bag"><span class="sh-iico">${G.Icons.html(r.icon || r.id, 22)}</span><b>${E(r.name)}</b><div class="ds">${E(r.desc || '')}</div></div>`
                    : `<div class="sh-bag empty"><span class="sh-iico sh-bagbox"></span><b>Team item slot</b> (empty)</div>`);
                }
                body = `<span class="ds">Team-wide, whole run</span>${rows.join('')}`;
              } else {
                const bag = pl.berries || [], slots = G.Grounds.berrySlots(G.DB && G.DB.save), rows = [];
                for (let k = 0; k < slots; k++) {
                  const b = G.Grounds.BY[bag[k]];
                  rows.push(b ? `<div class="sh-bag"><span class="sh-iico">${G.Icons.html('ps:' + b.icon, 22)}</span><b>${E(b.name)}</b><div class="ds">${E(b.desc || '')}</div></div>`
                    : `<div class="sh-bag empty"><span class="sh-iico sh-bagbox"></span><b>Berry slot</b> (empty)</div>`);
                }
                body = `<span class="ds">Team-wide, used automatically</span>${rows.join('')}`;
              }
              return `<div class="sh-item"><div class="sh-itabs">${tabs}</div><div class="sh-ipanel">${body}</div></div>`;
            })()}
          </div>
        </div>
      </div>`;
    mount.querySelector('.sh-face').appendChild(G.UI.spriteCanvas(pl.dex, 96, 96, { scale: 3, hero: true, shiny: pl.shiny }));
    mount.querySelector('.sh-hex').appendChild(statBlock(pl));
    (slot || mount).querySelectorAll('.sh-tab').forEach(b => {
      const f = S.roster[+b.dataset.i];
      b.querySelector('.sh-sp').appendChild(G.UI.spriteCanvas(f.dex, 44, 44, { scale: 1, shiny: f.shiny }));
      b.onclick = () => { if (S.giving) giveTo(mount, +b.dataset.i); else select(mount, +b.dataset.i); };
    });
    mount.querySelectorAll('.sh-itab').forEach(b => {
      b.onclick = () => { S.itemTab = b.dataset.tab; S.giving = false; G.Audio.sfx('select'); paint(mount); };
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
    G.Audio.sfx('select');
    paint(mount);
    if (S.onSelect) S.onSelect(i);
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

  return { render, keys, moveLines, typicalDef, select };
})();
