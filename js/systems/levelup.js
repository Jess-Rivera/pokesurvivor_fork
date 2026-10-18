/* ============ levelup.js — the three level-up cards ============
 * Upgrade rework (DECISIONS 2026-10-18). Two kinds of card:
 *   new   learn a new move (active Pokemon only; only if there is a free slot; a link frees slots)
 *   stat  a per-Pokemon stat card (HP Up, Protein, ...): after picking it the player chooses a Pokemon (no move step)
 *   mech  a mechanic card (data/mechanics.js): +1 Projectile, +15% Area, ... It is MOVE-SPECIFIC: after
 *         picking it the player chooses a Pokemon, then one of its moves (run-ui.js does the steps).
 * The draw rolls a FAMILY first, then a card inside it, so the 14 mechanics cannot swamp new moves.
 * A card is only offered if at least one move on the team can take it. Weights are a draft (balance later).
 */
G.LevelUp = (() => {

  // Family weights: new move, then the three mechanic value classes.
  const FAMILY_W = { newmove: 10, DPS: 14, Coverage: 10, Utility: 6, Stats: 8 };
  const CLASS_COLOR = { DPS: '#ff8a4d', Coverage: '#6ea4ff', Utility: '#b99dff' };
  const NEW_CANDIDATES = 6;

  /** For every team member, which of its moves can take `mech` (and why not, for the dimmed rows). */
  function targetsOf(roster, mech) {
    return roster.map(f => {
      const moves = f.moves.map(m => {
        const c = G.Mechanics.check(m, mech);
        return { m, ok: c.ok, why: c.ok ? '' : G.Mechanics.reason(m, mech) };
      });
      return { pl: f, moves, ok: moves.some(x => x.ok) };
    });
  }

  const stepText = mech => (mech.mode === 'add' ? '+' + mech.step : '+' + Math.round(mech.step * 100) + '%');

  function mechCard(mech, roster) {
    const ts = targetsOf(roster, mech);
    const ok = [];
    for (const t of ts) for (const x of t.moves) if (x.ok) ok.push(x.m);
    if (!ok.length) return null;
    const texts = [...new Set(ok.map(m => G.Mechanics.text(m, mech)))];
    const names = [...new Set(ok.map(m => m.name))];
    const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ' +' + (names.length - 3) + ' more' : '');
    return {
      w: mech.w || 1, family: mech.cls, type: 'mech', key: 'mech:' + mech.id, mech,
      icon: null, ico: stepText(mech), color: CLASS_COLOR[mech.cls] || '#9fb1c9', tag: mech.cls,
      title: texts.length === 1 ? texts[0] : mech.label + ' ' + stepText(mech),
      desc: 'Applies to one move. Works on: ' + shown,
      targets: r => targetsOf(r, mech),
      apply: (active, tp, m) => G.Moves.addStack(m, mech.id)
    };
  }

  /** A stat card: applies to one Pokemon. Protein / Calcium are only offered when a Pokemon has moves of that category,
   *  and are drawn lighter when few of the team's moves are (share floored at 0.25). */
  function statCard(st, roster) {
    const pct = v => Math.round(v * 100) + '%';
    const targets = r => r.map(f => {
      const dmg = f.moves.filter(m => G.Stats.moveCat(m) !== 'status');
      const n = st.cat ? dmg.filter(m => G.Stats.moveCat(m) === st.cat).length : 1;
      const ok = n > 0, cur = f.inc[st.id];
      return { pl: f, moves: [], ok, share: dmg.length ? n / dmg.length : 0,
        note: ok ? st.stat + ' +' + pct(cur) + ' to +' + pct(cur + st.step) : 'No ' + st.cat + ' moves' };
    });
    const ts = targets(roster);
    if (!ts.some(t => t.ok)) return null;
    return {
      w: st.cat ? Math.max(0.25, ...ts.map(t => t.share)) : 1, family: 'Stats', type: 'stat', key: 'stat:' + st.id, stat: st,
      icon: null, ico: '+' + pct(st.step), color: st.color, tag: 'Stat',
      title: st.label + ' +' + pct(st.step),
      desc: 'Raises one Pokémon\'s ' + st.stat + ' by ' + pct(st.step),
      targets,
      apply: (active, tp) => tp.addStat(st.id)
    };
  }

  /** The candidate cards grouped by family (empty families are left out). */
  function families(pl, roster) {
    const fam = {};
    const add = (k, c) => { if (c) (fam[k] = fam[k] || []).push(c); };

    // --- new moves (active Pokemon only) ---
    if (pl.slots.length < pl.maxMoves) {
      // With 2 buffs no more are offered: buffs do no damage and
      // filling the 4 slots with them leaves the run with no way out.
      const buffs = pl.moves.filter(m => m.kind === 'buff').length;
      const pool = G.Moves.poolFor(pl.mon).filter(id =>
        !pl.hasMove(id) && !(pl.banned && pl.banned.has(id)) && !(buffs >= 2 && G.Moves.BY_ID[id].kind === 'buff'));
      for (const id of G.U.pickN(pool, NEW_CANDIDATES)) {
        const d = G.Moves.BY_ID[id];
        add('newmove', {
          w: 1, family: 'newmove', type: 'new', key: 'new:' + id,
          icon: 'move:' + id, color: G.U.TYPE_COLOR[d.type],
          tag: G.U.TYPE_NAME[d.type],
          title: d.name, desc: d.desc,
          apply: p => p.addMove(id)
        });
      }
    }

    // --- mechanic cards, by value class ---
    for (const mech of G.Mechanics.ALL) {
      if (mech.live) add(mech.cls, mechCard(mech, roster));
    }

    // --- scoped damage: ONE random scope per offer (all scopes together count as a single DPS entry) ---
    const sc = G.Mechanics.SCOPED.map(x => mechCard(x, roster)).filter(Boolean);
    if (sc.length) add('DPS', sc[Math.floor(Math.random() * sc.length)]);

    // --- stat cards ---
    for (const st of G.Mechanics.STATS) add('Stats', statCard(st, roster));
    return fam;
  }

  /** Weighted pick of an index: `ws` is a list of weights. */
  function rollIndex(ws) {
    const total = ws.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) return i; }
    return ws.length - 1;
  }

  /**
   * Returns up to `n` different cards (an empty list when nothing is left to offer).
   * @param roster  the team (every member's moves count as targets); defaults to just `pl`
   */
  function offer(pl, n = 3, roster = [pl]) {
    const fam = families(pl, roster);
    const picked = [];
    while (picked.length < n) {
      const names = Object.keys(fam).filter(k => fam[k].length);
      if (!names.length) break;
      const k = names[rollIndex(names.map(x => FAMILY_W[x] || 1))];
      const cards = fam[k];
      picked.push(cards.splice(rollIndex(cards.map(c => c.w)), 1)[0]);
    }
    if (G.Log.on) {
      G.Log.offer(pl.level, picked, pl.rerolls || 0);
      for (const c of picked) {
        const f = c.apply;
        c.apply = function (p, tp, m) { G.Log.pick(c.key + (m ? '>' + m.id : c.type === 'stat' && tp ? '>' + tp.mon.name : '')); return f.apply(this, arguments); };
      }
    }
    return picked;
  }

  return { offer, families, targetsOf, FAMILY_W };
})();
