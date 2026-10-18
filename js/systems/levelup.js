/* ============ levelup.js — the three level-up cards ============
 * Card types (upgrade rework in progress, see DECISIONS 2026-10-18):
 *   new   learn a new move (only if there are free slots of the 4; a link frees slots)
 *   up    upgrade a move you already have (the Lv 1-5 ladder; mechanic cards replace it next)
 * The old stat cards (Vigor, Potencia, Carrera, Reflejos, Coraza, Sintesis, Iman,
 * Aprendizaje, Baya Zidra) and move evolutions were removed on 2026-10-18.
 */
G.LevelUp = (() => {

  /** Builds the set of candidate cards, with weights. */
  function candidates(pl) {
    const out = [];

    // --- movimientos nuevos ---
    if (pl.slots.length < pl.maxMoves) {
      // With 2 buffs no more are offered: buffs do no damage and
      // filling the 4 slots with them leaves the run with no way out.
      const buffs = pl.moves.filter(m => m.kind === 'buff').length;
      const pool = G.Moves.poolFor(pl.mon).filter(id =>
        !pl.hasMove(id) && !(pl.banned && pl.banned.has(id)) && !(buffs >= 2 && G.Moves.BY_ID[id].kind === 'buff'));
      for (const id of G.U.pickN(pool, 6)) {
        const d = G.Moves.BY_ID[id];
        out.push({
          w: 10, type: 'new', key: 'new:' + id,
          icon: 'move:' + id, color: G.U.TYPE_COLOR[d.type],
          tag: G.U.TYPE_NAME[d.type],
          title: d.name, desc: d.desc,
          apply: p => p.addMove(id)
        });
      }
    }

    // --- upgrades of moves you already have ---
    for (const m of pl.moves) {
      const txt = G.Moves.nextUpText(m);
      if (!txt) continue;
      out.push({
        w: 8, type: 'up', key: 'up:' + m.id,
        icon: 'move:' + m.id, color: G.U.TYPE_COLOR[m.type],
        tag: 'Nv.' + m.lvl + ' > ' + (m.lvl + 1),
        title: m.name, desc: txt,
        apply: () => G.Moves.levelUp(m)
      });
    }

    return out;
  }

  /** Returns up to 3 different cards, chosen by weight (an empty list when nothing is left to offer). */
  function offer(pl, n = 3) {
    const pool = candidates(pl);
    const picked = [];
    const used = new Set();
    while (picked.length < n && pool.length) {
      const total = pool.reduce((a, c) => a + c.w, 0);
      let r = Math.random() * total, idx = 0;
      for (let i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) { idx = i; break; } }
      const c = pool.splice(idx, 1)[0];
      if (used.has(c.key)) continue;
      used.add(c.key);
      picked.push(c);
    }
    if (G.Log.on) {
      G.Log.offer(pl.level, picked, pl.rerolls || 0);
      for (const c of picked) { const f = c.apply; c.apply = function (p) { G.Log.pick(c.key); return f.call(this, p); }; }
    }
    return picked;
  }

  return { offer };
})();
