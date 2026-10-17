/* ============ stats.js — shared base-stats model (G.Stats) ============
 * Single source of truth for the mainline-style stat formulas used by BOTH the
 * player (js/entities/player.js) and enemies (js/data/enemies.js, enemy.js).
 * Must load AFTER core/util.js (which creates G) and BEFORE player/enemy/enemies.
 *
 * Mainline stat core:  S = floor((2*base + IV + floor(EV/4)) * L / 100) + 5
 *   HP variant:        HP = floor((2*base + IV + floor(EV/4)) * L / 100) + L + 10, then * HP_SCALAR
 *
 * SPEED is a FIXED species identity (constant within a run): r = Speed/SPEED_MEDIAN
 * (level cancels), soft-saturated by g(r) toward asymmetric bounds, * BASE_PX px/s.
 * See docs/stat-model-design-notes.md, BALANCE.md, DECISIONS.md.
 *
 * IV/EV are in the formula but fixed at 0 for now (deferred; own storage later).
 */
G.Stats = (() => {
  // ---- tunables (see BALANCE.md) ----
  const HP_SCALAR = 2.0;                                   // mainline HP * this
  const SPEED_MEDIAN = 65;                                 // roster median base Speed (verified)
  const BASE_PX = 107;                                     // px/s at movement r = 1.0 (median mon)
  const MOVE_K = 1.0, MOVE_MAX = 3.0, MOVE_MIN = 0.5;      // movement transfer: slope + asymptotes

  // ---- mainline stat core ----
  /** Mainline non-HP stat value. IV/EV additive, default 0. */
  function statValue(base, level, iv = 0, ev = 0) {
    return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
  }

  // ---- HP (player + enemy, scales with level) ----
  /** Mainline HP * HP_SCALAR. IV/EV default 0. */
  function hpForLevel(baseHp, level, iv = 0, ev = 0) {
    return Math.round((Math.floor((2 * baseHp + iv + Math.floor(ev / 4)) * level / 100) + level + 10) * HP_SCALAR);
  }

  // ---- Speed -> movement px/s (fixed species identity, level cancels) ----
  function moveTransfer(r) {
    if (r <= 0) return MOVE_MIN;
    const lr = Math.log(r);
    const w = lr >= 0 ? Math.log(MOVE_MAX) : Math.log(1 / MOVE_MIN);
    return Math.exp(w * Math.tanh(MOVE_K * lr / w));
  }
  /** Base Speed stat -> movement px/s. Same for player and enemy. */
  function speedToPx(baseSpe) {
    const r = statValue(baseSpe, 50) / statValue(SPEED_MEDIAN, 50);
    return BASE_PX * moveTransfer(r);
  }

  // ---- enemy level from run time (Phase 1: linear L1 at 0:00 -> L50 at 30:00) ----
  function levelForTime(t) { return 1 + 49 * G.U.clamp(t / 1800, 0, 1); }

  // ---- future stats (scaffold; wired in when their slices land) ----
  // Attack / Defense / Sp.Atk / Sp.Def will scale with level via statValue, then
  // feed the damage model (A/D ratio) in a later slice. Placeholders so callers
  // have a single home to extend. Not used yet.
  function attack(base, level, iv = 0, ev = 0)  { return statValue(base, level, iv, ev); }
  function defense(base, level, iv = 0, ev = 0) { return statValue(base, level, iv, ev); }
  function spAtk(base, level, iv = 0, ev = 0)   { return statValue(base, level, iv, ev); }
  function spDef(base, level, iv = 0, ev = 0)   { return statValue(base, level, iv, ev); }

  return {
    HP_SCALAR, SPEED_MEDIAN, BASE_PX, MOVE_K, MOVE_MAX, MOVE_MIN,
    statValue, hpForLevel, moveTransfer, speedToPx, levelForTime,
    attack, defense, spAtk, spDef,
  };
})();
