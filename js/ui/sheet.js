/* ============ sheet.js — the team summary sheet (upgrade rework, slice 2d-1) ============
 * One component, three uses: the pause screen, the team view from the end-of-run screen, and (2d-2) the
 * choose mode of the level-up screen. It shows the roster strip, and for the selected Pokemon: name, level,
 * types, HP, the stat hexagon (white = species base stat underneath, 60% yellow = the in-run stat-card bonus
 * on top, "+X%" beside each number), the held item, and ALL its moves grouped by bond, each with its
 * upgrade stacks, its current numbers and the damage of one hit against a typical enemy.
 *
 *   G.Sheet.render(mount, roster, { sel, onSelect })   fill `mount` (a container element)
 *   G.Sheet.keys(mount)                                 keyboard for the pause sheet (solo): swap keys, arrows
 *   G.Sheet.moveLines(pl, m)                            { raw, hit, stacks } text for one move (also used by tests)
 *   G.Sheet.typicalDef()                                { def, spd }: median base Def / SpD of the roster
 *
 * Hit damage uses the same two halves as combat (pl.moveFactor, G.Stats.applyDamage) against a NEUTRAL
 * enemy of the median base Def/SpD at the Pokemon's level: no type matchup, no crit. It is for comparing
 * builds, not a prediction of the number you will see in play.
 */
G.Sheet = (() => {
  const E = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const STAT_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];       // = the index order of pokedex stats[]
  const state = new WeakMap();                                          // mount -> { sel, roster, onSelect }

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

  /** Text for one move: raw numbers (what the cards change), stack list, and one-hit damage. */
  function moveLines(pl, m) {
    const k = G.Kinds.BY[m.kind];
    const bits = [];
    if (k) for (const key of k.keys) { if (m[key] == null) continue; const t = FMT[key] && FMT[key](m[key], m); if (t) bits.push(t); }
    const stacks = [];
    for (const id in (m.mods || {})) {
      const mech = G.Mechanics.BY_ID[id], n = m.mods[id];
      if (mech && n > 0) stacks.push(mech.label + ' +' + n);
    }
    let hit = '';
    if (k && k.payload === 'damage' && m.dmg > 0) {
      const t = typicalDef();
      const d = G.Stats.applyDamage(pl.moveFactor(m), t.def, t.spd, m, pl.level, pl.stabFor(m));
      hit = 'Hits for about ' + (d >= 100 ? r0(d) : String(+d.toFixed(1)));
    }
    return { raw: bits.join(' · '), hit, stacks: stacks.join(' · ') };
  }

  const pct = v => '+' + Math.round(v * 100) + '%';

  function statBlock(pl) {
    const st = pl.mon.stats || [0, 0, 0, 0, 0, 0];
    const bonus = STAT_ORDER.map(k => pl.inc[k] || 0);
    const hp = Math.max(0, Math.ceil(pl.hp)) + '/' + Math.round(pl.maxHp);
    return G.StatChart.make(st, '#ffffff', 340, 262, { bonus, hpText: hp, layered: true });
  }

  function rosterStrip(S) {
    return S.roster.map((f, i) => {
      const slot = f.teamSlot != null ? f.teamSlot : i;
      return `<button class="sh-tab${i === S.sel ? ' on' : ''}${f.dead ? ' dead' : ''}" data-i="${i}" title="${E(f.mon.name)}"><span class="sh-sp"></span><i>${G.Input.keyLabel('swap_' + (slot + 1))}</i></button>`;
    }).join('');
  }

  function moveRows(pl) {
    const groups = pl.slots.length ? pl.slots : pl.moves.map(m => [m]);
    const act = G.Game && G.Game.player === pl ? pl.active : -1;
    return groups.map((g, gi) => {
      const rows = g.map(m => {
        const t = moveLines(pl, m), n = G.Moves.stackTotal(m), col = G.U.TYPE_COLOR[m.type];
        return `<div class="sh-move">
          <div class="ico" style="background:${col}33">${G.Icons.html('move:' + m.id, 32)}</div>
          <div class="txt"><div class="nm">${E(m.name)} <span class="type" style="background:${col}">${E(G.U.TYPE_NAME[m.type])}</span>${n ? ` <span class="tag-chip" style="background:${col}">+${n}</span>` : ''}</div>
            ${t.stacks ? `<div class="stk">${E(t.stacks)}</div>` : ''}
            <div class="ds">${E(t.raw)}</div>
            ${t.hit ? `<div class="hit">${E(t.hit)}</div>` : ''}
          </div></div>`;
      }).join('');
      const bonded = g.length > 1;
      return `<div class="sh-group${bonded ? ' bonded' : ''}${gi === act ? ' on' : ''}">${bonded ? '<div class="sh-bond">Cast together</div>' : ''}${rows}</div>`;
    }).join('') || '<div class="ds">No moves yet.</div>';
  }

  function render(mount, roster, opts = {}) {
    const S = { roster, sel: Math.max(0, Math.min(roster.length - 1, opts.sel != null ? opts.sel : 0)), onSelect: opts.onSelect };
    state.set(mount, S);
    paint(mount);
  }

  function paint(mount) {
    const S = state.get(mount); if (!S) return;
    const pl = S.roster[S.sel]; if (!pl) { mount.innerHTML = ''; return; }
    const item = pl.item && G.Items.BY[pl.item];
    // The roster strip sits in the title row when the screen provides a slot for it (right-aligned), else above the card.
    const slot = mount.parentElement && mount.parentElement.querySelector('.sh-strip-slot');
    const strip = `<div class="sh-strip">${rosterStrip(S)}</div>`;
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
          <div class="sh-moves"><h3>Moves</h3><div class="sh-scroll">${moveRows(pl)}</div></div>
          <div class="sh-stats"><h3>Stats</h3><div class="sh-hex"></div>
            <div class="sh-legend"><i class="w"></i> base <i class="y"></i> from cards</div>
            ${item ? `<div class="sh-item"><span class="sh-itag">Held item</span><span class="sh-iico">${G.Icons.html(pl.item, 28)}</span><b>${E(item.name)}</b><div class="ds">${E(item.desc || '')}</div></div>` : ''}
          </div>
        </div>
      </div>`;
    mount.querySelector('.sh-face').appendChild(G.UI.spriteCanvas(pl.dex, 96, 96, { scale: 3, hero: true, shiny: pl.shiny }));
    mount.querySelector('.sh-hex').appendChild(statBlock(pl));
    (slot || mount).querySelectorAll('.sh-tab').forEach(b => {
      const f = S.roster[+b.dataset.i];
      b.querySelector('.sh-sp').appendChild(G.UI.spriteCanvas(f.dex, 44, 44, { scale: 1, shiny: f.shiny }));
      b.onclick = () => select(mount, +b.dataset.i);
    });
  }

  function select(mount, i) {
    const S = state.get(mount); if (!S || !S.roster[i] || i === S.sel) return;
    S.sel = i;
    G.Audio.sfx('select');
    paint(mount);
    if (S.onSelect) S.onSelect(i);
  }

  /** Keyboard (solo pause only; in a group the game keeps running and the swap keys act in the game). */
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
