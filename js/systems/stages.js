/* ============ stages.js - stat stages (status rework, slice D1) ============
 * Mainline stat stages (-6 to +6) for Atk, Def, SpA, SpD and Spe, on any host that G.Status can carry (wild enemies, elites,
 * bosses, gym leaders). Accuracy and evasion are skipped (the game has no accuracy stat).
 *
 * Real-time rule (Jess 2026-10-19): mainline stages last until switch-out, so here EACH APPLICATION lasts a fixed time and expires
 * on its own. The stage is the sum of the live applications, clamped to +-6. Stat-drop moves use DUR = 6 s.
 *
 * Host state (null until used):
 *   stg      { atk: [{ n, t }], def: [...], spa: [...], spd: [...], spe: [...] }   live applications per stat
 *   stgRoll  { moveId: seconds }   per-move roll gap and the one-application-per-2-s lockout (see procMove)
 *
 * Where it is read: the defender half of the player's damage (Def or SpD, combat.js), the attacker half of a gym leader's
 * moves (Atk or SpA, enemy.js gymFactor) and enemy movement (Speed, BEFORE the movement shaping in G.Stats.speedToPx).
 * The player's own buff moves (Harden, Swords Dance...) are NOT stages yet: they stay on pl.buffs (slice E decides).
 */
G.Stages = (() => {
  // Mainline multipliers for stage -6 .. +6 (index = stage + 6).
  const TABLE = [0.25, 0.28, 0.33, 0.4, 0.5, 0.66, 1, 1.5, 2, 2.5, 3, 3.5, 4];
  const STATS = ['atk', 'def', 'spa', 'spd', 'spe'];
  const LABEL = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };
  const DUR = 6;            // seconds one application lasts (stat-drop moves)
  const ROLL_GAP = 0.5;     // one chance roll per move per target per 0.5 s (same as the ailments)
  const APPLY_GAP = 2;      // after a successful roll, that move cannot apply to that target again for 2 s (one turn)
  const MAX = 6;
  const UP = '#7fe08a', DOWN = '#f08a8a';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /** The stage of `stat` on `h` right now (-6 .. +6). */
  function stage(h, stat) {
    const L = h.stg && h.stg[stat];
    if (!L) return 0;
    let s = 0;
    for (const a of L) s += a.n;
    return clamp(s, -MAX, MAX);
  }
  /** The stat multiplier for `stat` on `h` (1 when it has no stage). */
  function mul(h, stat) { return h.stg ? TABLE[stage(h, stat) + MAX] : 1; }

  function text(h, msg, color) {
    if (G.FX && G.FX.dmgText) G.FX.dmgText(h.x, h.y - (h.bodyH || 30) - 4, msg, color);
  }

  /**
   * Add one application of `n` stages (negative = a drop) to `stat`, lasting `dur` seconds. `cap` (optional, positive) is the most
   * stages a RAISE may reach (an authored move's stack limit). Returns true when it applied, false when capped.
   */
  function add(h, stat, n, dur = DUR, cap = MAX) {
    if (!STATS.includes(stat) || !n || h.dead) return false;
    const cur = stage(h, stat);
    if (n > 0 && cur >= Math.min(MAX, cap)) return false;
    if (n < 0 && cur <= -MAX) return false;
    const g = h.stg || (h.stg = {});
    (g[stat] || (g[stat] = [])).push({ n, t: dur });
    text(h, LABEL[stat] + (n > 0 ? ' +' : ' ') + n, n > 0 ? UP : DOWN);
    return true;
  }

  /** Advance every application timer and the per-move roll gaps. Called once per frame from Enemy.update. */
  function tick(h, dt) {
    if (h.stgRoll) {
      let any = false;
      for (const k in h.stgRoll) { if ((h.stgRoll[k] -= dt) <= 0) delete h.stgRoll[k]; else any = true; }
      if (!any) h.stgRoll = null;
    }
    const g = h.stg;
    if (!g) return;
    let live = false;
    for (const s in g) {
      const L = g[s];
      for (let i = L.length - 1; i >= 0; i--) if ((L[i].t -= dt) <= 0) L.splice(i, 1);
      if (L.length) live = true; else delete g[s];
    }
    if (!live) h.stg = null;
  }

  /** The Speed STAGE as a movement multiplier. The stage multiplies the Speed STAT, then the normal movement shaping applies
   *  (G.Stats.speedToPx), so the shaping bounds still hold. A host with no species Speed falls back to the raw stage multiplier. */
  function speedMul(h) {
    if (!h.stg || !h.stg.spe) return 1;
    const m = TABLE[stage(h, 'spe') + MAX];
    if (m === 1) return 1;
    const dx = G.DEX_BY && G.DEX_BY[h.dex], base = dx && dx.stats ? dx.stats[5] : null;
    if (base == null) return m;
    return G.Stats.speedToPx(base, m) / G.Stats.speedToPx(base);
  }

  /**
   * Roll the stat stage of a hit on an enemy. `m.stage` = { stat, n } (data/moves.js, from PokeAPI move_meta_stat_changes) and
   * `m.statChance` is the PokeAPI chance. One roll per move per target per ROLL_GAP, and after a success that move cannot apply again
   * to that target for APPLY_GAP, so a 100% move (Mud Shot) stacks about one stage per 2 s, never one per hit.
   */
  function procMove(e, m) {
    const f = m && m.stage;
    if (!f || e.dead || e.remote) return;
    const key = m.id || m.type || 'x', r = e.stgRoll || (e.stgRoll = {});
    if (r[key] > 0) return;
    r[key] = ROLL_GAP;
    const c = (m.statChance == null ? 100 : m.statChance) / 100;
    if (c < 1 && Math.random() >= c) return;
    r[key] = APPLY_GAP;
    add(e, f.stat, f.n, DUR);
  }

  function clear(h) { h.stg = h.stgRoll = null; }

  /** Active stages for the HUD / debug: [{ stat, label, stage }] for every stat that is not at 0. */
  function list(h) {
    const out = [];
    for (const s of STATS) { const v = stage(h, s); if (v) out.push({ stat: s, label: LABEL[s], stage: v }); }
    return out;
  }

  return { TABLE, STATS, LABEL, DUR, ROLL_GAP, APPLY_GAP, MAX, stage, mul, add, tick, speedMul, procMove, clear, list };
})();
