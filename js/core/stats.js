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

  // ---- Atk/Def/SpA/SpD: scale with level via the mainline statValue ----
  function attack(base, level, iv = 0, ev = 0)  { return statValue(base, level, iv, ev); }
  function defense(base, level, iv = 0, ev = 0) { return statValue(base, level, iv, ev); }
  function spAtk(base, level, iv = 0, ev = 0)   { return statValue(base, level, iv, ev); }
  function spDef(base, level, iv = 0, ev = 0)   { return statValue(base, level, iv, ev); }

  // ---- damage model (mainline A/D ratio, split into cast + impact halves) ----
  // Single survivor-feel scalar (locked). STAB = same-type attack bonus. PROP_DEF is the
  // neutral denominator for things without a Def stat: destructible props AND status-cat
  // damaging moves (toxic/spikes/etc. have no phys/spec class, so they do not swing on an
  // enemy's Def/SpD split). See DECISIONS.md / BALANCE.md.
  const DMG_SCALAR = 0.47;  // re-centered 2026-10-17 for canonical move power (median fork dmg 14 -> canon 60); tune by feel
  const STAB = 1.5;
  const PROP_DEF = 50;

  // Attacker half, computed at cast. `power` is the move's tuned base dmg (m.dmg).
  // atkBase/spaBase = attacker real base Atk/SpA (stats[1]/stats[3]). extraMul folds in the
  // upgrade/buff layer that used to live in pl.atk (atkMul * atk buffs). A status-cat move
  // uses Atk as its attacker stat (arbitrary but stable; its denominator is neutral anyway).
  function attackFactor(atkBase, spaBase, level, move, extraMul = 1) {
    const aStat = moveCat(move) === 'special' ? spAtk(spaBase, level) : attack(atkBase, level);
    return ((2 * level / 5 + 2) * (move.dmg || 0) * aStat) / 50 * extraMul;
  }

  // Defender half, computed at impact against a specific enemy's real base Def/SpD
  // (stats[2]/stats[4]). Returns damage INCLUDING STAB and the scalar but BEFORE type/crit
  // (those stay at the call site). A status-cat move divides by the neutral PROP_DEF and
  // never gets STAB. The +2 is mainline: after the division, before the multipliers.
  function applyDamage(factor, defBase, spdBase, move, level, stab) {
    const cat = moveCat(move);
    const dStat = cat === 'status' ? PROP_DEF
                : cat === 'special' ? spDef(spdBase, level)
                : defense(defBase, level);
    const stabMul = (stab && cat !== 'status') ? STAB : 1;
    return (factor / Math.max(1, dStat) + 2) * stabMul * DMG_SCALAR;
  }

  // Prop damage: same attacker factor, neutral denominator, no STAB (props are typeless).
  function applyDamageProp(factor) { return (factor / PROP_DEF + 2) * DMG_SCALAR; }

  // ---- enemy -> player damage (sub-slice C), mirror of the player A/D ratio ----
  // Enemy "Power" is a flat placeholder for now (no per-enemy move yet). TEMPORARY:
  // swap to canonical move power when enemies draw real moves (see DECISIONS). Gentle
  // opening (~6% of L1 HP), natural ramp; late threat comes from density, not per-hit %.
  const ENEMY_DMG_SCALAR = 0.5;
  const ENEMY_POWER = 40;

  // Enemy attack category from the higher offensive stat: SpA > Atk => 'special'.
  function enemyCat(atkBase, spaBase) { return (spaBase > atkBase) ? 'special' : 'physical'; }

  // Attacker half for an enemy at its level, using its winning offensive stat and the
  // flat placeholder Power. Mirrors attackFactor (no extraMul; enemies have no upgrades).
  function enemyAttackFactor(atkBase, spaBase, level) {
    const special = enemyCat(atkBase, spaBase) === 'special';
    const aStat = special ? spAtk(spaBase, level) : attack(atkBase, level);
    return ((2 * level / 5 + 2) * ENEMY_POWER * aStat) / 50;
  }

  // Defender half at impact: complete the ratio against the PLAYER's real base Def/SpD
  // (stats[2]/stats[4]) matching the attack category. Returns damage BEFORE type/weather/
  // reduction/melee-cushion (those stay in player.hurt). +2 mainline, then the scalar.
  function applyPlayerDefense(factor, playerDefBase, playerSpdBase, cat, playerLevel) {
    const dStat = cat === 'special' ? spDef(playerSpdBase, playerLevel) : defense(playerDefBase, playerLevel);
    return (factor / Math.max(1, dStat) + 2) * ENEMY_DMG_SCALAR;
  }

  // A move's damage category: 'physical' | 'special' | 'status'. Prefer the move's
  // own cat (stamped in js/data/moves.js from pokeapi). Fallback for a move missing it
  // (e.g. a future custom move): buffs are status; contact-y behaviors physical; the
  // rest (ranged/elemental) special. So a missing cat never breaks the damage model.
  function moveCat(m) {
    if (m && m.cat) return m.cat;
    if (!m) return 'physical';
    if (m.kind === 'buff') return 'status';
    return (m.kind === 'melee' || m.kind === 'dash' || m.kind === 'mine') ? 'physical' : 'special';
  }

  return {
    HP_SCALAR, SPEED_MEDIAN, BASE_PX, MOVE_K, MOVE_MAX, MOVE_MIN,
    statValue, hpForLevel, moveTransfer, speedToPx, levelForTime,
    attack, defense, spAtk, spDef, moveCat,
    DMG_SCALAR, STAB, attackFactor, applyDamage, applyDamageProp,
    ENEMY_DMG_SCALAR, ENEMY_POWER, enemyCat, enemyAttackFactor, applyPlayerDefense,
  };
})();
