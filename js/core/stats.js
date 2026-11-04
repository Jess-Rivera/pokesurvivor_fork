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
 * IVs and the nature come from the copy of a Pokemon on the team (pokebox step 4): G.Copies.profileOf builds a profile(),
 * G.Player carries it as statProf. Enemies pass none and play neutral (0 IV, no nature). EVs stay 0 until pokebox step 5.
 * Nature: x1.1 raised, x0.9 lowered, on the final stat, rounded down in whole numbers like the games. HP never.
 */
G.Stats = (() => {
  // ---- tunables (see BALANCE.md) ----
  const HP_SCALAR = 2.0; // mainline HP * this
  const SPEED_MEDIAN = 65; // roster median base Speed (verified)
  const BASE_PX = 107; // px/s at movement r = 1.0 (median mon)
  const MOVE_K = 1.0,
    MOVE_MAX = 1.3,
    MOVE_MIN = 0.7; // movement transfer: slope + asymptotes
  const XP_SCALAR = 0.035; // turn-based -> survivor XP scalar (the one XP knob; tune by feel)

  // ---- per-copy stat profile (pokebox step 4) ----
  // iv: six IVs, nat: six nature multipliers, both in stat order (HP, Atk, Def, SpA, SpD, Spe). HP's nature is always 1.
  const NEUTRAL_PROFILE = Object.freeze({
    iv: Object.freeze([0, 0, 0, 0, 0, 0]),
    nat: Object.freeze([1, 1, 1, 1, 1, 1]),
  });
  /** The profile of a read copy (G.Copies.read): its IVs and nature. No copy, or one without six IVs, is neutral. */
  function profile(copy) {
    if (!copy || !Array.isArray(copy.iv) || copy.iv.length !== 6) return NEUTRAL_PROFILE;
    const iv = copy.iv.map((v) => Math.min(31, Math.max(0, Math.floor(+v) || 0))),
      nat = [1, 1, 1, 1, 1, 1],
      up = copy.natureUp,
      down = copy.natureDown;
    if (up >= 1 && up <= 5 && down >= 1 && down <= 5 && up !== down) {
      nat[up] = 1.1;
      nat[down] = 0.9;
    }
    return { iv, nat };
  }

  // ---- mainline stat core ----
  /** Mainline non-HP stat value. IV/EV additive, default 0. nature: 1.1 raised, 0.9 lowered, 1 otherwise. It applies to the
   *  final stat, rounded down, in whole numbers (stat x 110 / 100) like the games, so a float can never cost a point. */
  function statValue(base, level, iv = 0, ev = 0, nature = 1) {
    const s = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
    return nature == null || nature === 1 ? s : Math.floor((s * Math.round(nature * 100)) / 100);
  }

  // ---- HP (player + enemy, scales with level) ----
  /** Mainline HP * HP_SCALAR. IV/EV default 0. */
  function hpForLevel(baseHp, level, iv = 0, ev = 0) {
    return Math.round((Math.floor(((2 * baseHp + iv + Math.floor(ev / 4)) * level) / 100) + level + 10) * HP_SCALAR);
  }

  // ---- Speed -> movement px/s (fixed species identity, level cancels) ----
  function moveTransfer(r) {
    if (r <= 0) return MOVE_MIN;
    const lr = Math.log(r);
    const w = lr >= 0 ? Math.log(MOVE_MAX) : Math.log(1 / MOVE_MIN);
    return Math.exp(w * Math.tanh((MOVE_K * lr) / w));
  }
  /** Base Speed stat -> movement px/s. Same for player and enemy. iv / nature: a copy's Speed IV and nature, default neutral. */
  function speedToPx(baseSpe, iv = 0, nature = 1) {
    const r = statValue(baseSpe, 50, iv, 0, nature) / statValue(SPEED_MEDIAN, 50);
    return BASE_PX * moveTransfer(r);
  }

  // ---- enemy level from run time (Phase 1: linear L1 at 0:00 -> L50 at 30:00) ----
  // Enemy level for run time. Three states (feature/boss-rework): under 30:00 a linear ramp L1 to L50; past 30:00 it
  // stays clamped at L50 until every gym is beaten (gymsDone false); the slow post-gym ramp is TBD, so for now
  // gymsDone also clamps. Callers that know the gym state pass it as the second argument.
  function levelForTime(t, gymsDone) {
    return 1 + 49 * G.U.clamp(t / 1800, 0, 1);
  }
  // Wild XP boost / opening HP discount window end (seconds). Shared so the spawner banner, xpBoost and openingHpK agree.
  const XP_BOOST_END = 180;

  // ---- XP (feature/xp-curve) ----
  // Cost: mainline Medium Fast. Total XP to reach level n is n^3, so L -> L+1 costs (L+1)^3 - L^3.
  function xpToNext(level) {
    return 3 * level * level + 3 * level + 1;
  }
  // Yield: Gen 5 scaled formula. bx = species base_experience (PokeAPI), enemyLevel = the level
  // the enemy spawned at, playerLevel = the player's level at the kill. The ((2Le+10)/(Le+Lp+10))^2.5
  // term shrinks the reward as you outlevel the cast. Multipliers (tank, elite, shiny, golden) are
  // applied by the caller. Returns a float (do not round, early levels would quantize).
  function xpYield(bx, enemyLevel, playerLevel) {
    const a = 2 * enemyLevel + 10,
      b = enemyLevel + playerLevel + 10;
    return XP_SCALAR * (((bx * enemyLevel) / 5) * Math.pow(a / b, 2.5) + 1);
  }

  // ---- Atk/Def/SpA/SpD: scale with level via the mainline statValue ----
  function attack(base, level, iv = 0, ev = 0, nature = 1) {
    return statValue(base, level, iv, ev, nature);
  }
  function defense(base, level, iv = 0, ev = 0, nature = 1) {
    return statValue(base, level, iv, ev, nature);
  }
  function spAtk(base, level, iv = 0, ev = 0, nature = 1) {
    return statValue(base, level, iv, ev, nature);
  }
  function spDef(base, level, iv = 0, ev = 0, nature = 1) {
    return statValue(base, level, iv, ev, nature);
  }

  // ---- damage model (mainline A/D ratio, split into cast + impact halves) ----
  // Single survivor-feel scalar (locked). STAB = same-type attack bonus. PROP_DEF is the
  // neutral denominator for things without a Def stat: destructible props AND status-cat
  // damaging moves (toxic/spikes/etc. have no phys/spec class, so they do not swing on an
  // enemy's Def/SpD split). See DECISIONS.md / BALANCE.md.
  const DMG_SCALAR = 1.0; // re-centered 2026-10-17 for canonical move power (median fork dmg 14 -> canon 60); tune by feel
  const STAB = 1.5;
  const PROP_DEF = 50;

  // Attacker half, computed at cast. `power` is the move's tuned base dmg (m.dmg).
  // atkBase/spaBase = attacker real base Atk/SpA (stats[1]/stats[3]). extraMul folds in the
  // upgrade/buff layer that used to live in pl.atk (atkMul * atk buffs). A status-cat move
  // uses Atk as its attacker stat (arbitrary but stable; its denominator is neutral anyway).
  // prof: the attacker copy's IVs and nature (profile()); none is neutral. A status-cat move takes neither, like the stat cards.
  function attackFactor(atkBase, spaBase, level, move, extraMul = 1, prof = null) {
    const cat = moveCat(move),
      p = cat === 'status' || !prof ? NEUTRAL_PROFILE : prof;
    const aStat =
      cat === 'special' ? spAtk(spaBase, level, p.iv[3], 0, p.nat[3]) : attack(atkBase, level, p.iv[1], 0, p.nat[1]);
    return ((((2 * level) / 5 + 2) * (move.dmg || 0) * aStat) / 50) * extraMul;
  }

  // Defender half, computed at impact against a specific enemy's real base Def/SpD
  // (stats[2]/stats[4]). Returns damage INCLUDING STAB and the scalar but BEFORE type/crit
  // (those stay at the call site). A status-cat move divides by the neutral PROP_DEF and
  // never gets STAB. The +2 is mainline: after the division, before the multipliers.
  function applyDamage(factor, defBase, spdBase, move, level, stab, defMul = 1) {
    // defMul: the defender's Def / SpD STAGE multiplier (G.Stages.mul), applied to the final stat. A status-cat move ignores it.
    const cat = moveCat(move);
    const dStat =
      cat === 'status'
        ? PROP_DEF
        : cat === 'special'
          ? spDef(spdBase, level) * defMul
          : defense(defBase, level) * defMul;
    const stabMul = stab && cat !== 'status' ? STAB : 1;
    // Slice 7b-2b: the legacy per-cast norm factor is gone (COMBAT-RULES "Damage"); every hit is a full mainline event.
    return (factor / Math.max(1, dStat) + 2) * stabMul * DMG_SCALAR;
  }

  // Prop damage: same attacker factor, neutral denominator, no STAB (props are typeless).
  function applyDamageProp(factor) {
    return (factor / PROP_DEF + 2) * DMG_SCALAR;
  }

  // Held-item damage multiplier, applied at the hit site on top of the type/crit multipliers.
  // Pure function of the holder's item fields + the move's type + the already-computed type
  // effectiveness (k / tk). Keeps the per-item damage layer in ONE place so the two hit sites
  // (combat.js hit() and the projectile resolve) cannot drift and new items slot in here.
  //   expertBelt  +20% when the hit is super effective (typeMult > 1)
  //   typeBoost   +20% when the move's type matches the held type-damage item
  function itemDmgMul(pl, moveType, typeMult) {
    let m = 1;
    if (pl.expertBelt && typeMult > 1) m *= 1.2;
    if (pl.typeBoost && pl.typeBoost === moveType) m *= 1.2;
    return m;
  }

  // Held-item multiplier for one damage category, part of the attacker factor (Player.moveFactor). Status-category moves get neither,
  // like the Attack and Sp. Atk stages. Choice Band and Muscle Band set physMul, Choice Specs and Wise Glasses specMul.
  function itemCatMul(pl, cat) {
    return cat === 'special' ? pl.specMul || 1 : cat === 'status' ? 1 : pl.physMul || 1;
  }

  // ---- enemy -> player damage (sub-slice C), mirror of the player A/D ratio ----
  // Enemy "Power" is a flat placeholder for now (no per-enemy move yet). TEMPORARY:
  // swap to canonical move power when enemies draw real moves (see DECISIONS). Gentle
  // opening (~6% of L1 HP), natural ramp; late threat comes from density, not per-hit %.
  const ENEMY_DMG_SCALAR = 0.5;
  const ENEMY_POWER = 40;

  // Enemy attack category from the higher offensive stat: SpA > Atk => 'special'.
  function enemyCat(atkBase, spaBase) {
    return spaBase > atkBase ? 'special' : 'physical';
  }

  // Attacker half for an enemy at its level, using its winning offensive stat and the
  // flat placeholder Power. Mirrors attackFactor (no extraMul; enemies have no upgrades).
  // power / cat are optional: a gym leader's authored move passes its catalog Power and its physical/special category.
  function enemyAttackFactor(atkBase, spaBase, level, power = ENEMY_POWER, cat = null) {
    const special = (cat || enemyCat(atkBase, spaBase)) === 'special';
    const aStat = special ? spAtk(spaBase, level) : attack(atkBase, level);
    return (((2 * level) / 5 + 2) * power * aStat) / 50;
  }

  // Defender half at impact: complete the ratio against the PLAYER's real base Def/SpD
  // (stats[2]/stats[4]) matching the attack category. Returns damage BEFORE type/weather/
  // reduction/melee-cushion (those stay in player.hurt). +2 mainline, then the scalar.
  function applyPlayerDefense(factor, playerDefBase, playerSpdBase, cat, playerLevel, defMul = 1, prof = null) {
    // defMul: Iron / Zinc stat cards. Applied to the final stat (not the base) so +5% is not lost to the level-1 floor.
    // prof: the player copy's IVs and nature (profile()); none is neutral.
    const p = prof || NEUTRAL_PROFILE;
    const stat =
      cat === 'special'
        ? spDef(playerSpdBase, playerLevel, p.iv[4], 0, p.nat[4])
        : defense(playerDefBase, playerLevel, p.iv[2], 0, p.nat[2]);
    return (factor / Math.max(1, stat * defMul) + 2) * ENEMY_DMG_SCALAR;
  }

  // A move's damage category: 'physical' | 'special' | 'status'. Prefer the move's
  // own cat; a move missing it takes its resolved def's category (slice 7a), else physical.
  function moveCat(m) {
    if (m && m.cat) return m.cat;
    const d = m && G.MoveDefs && G.MoveDefs[m.id];
    return d ? d.category : 'physical';
  }

  return {
    NEUTRAL_PROFILE,
    profile,
    HP_SCALAR,
    SPEED_MEDIAN,
    BASE_PX,
    MOVE_K,
    MOVE_MAX,
    MOVE_MIN,
    statValue,
    hpForLevel,
    moveTransfer,
    speedToPx,
    levelForTime,
    XP_BOOST_END,
    XP_SCALAR,
    xpToNext,
    xpYield,
    attack,
    defense,
    spAtk,
    spDef,
    moveCat,
    DMG_SCALAR,
    STAB,
    attackFactor,
    applyDamage,
    applyDamageProp,
    itemDmgMul,
    itemCatMul,
    ENEMY_DMG_SCALAR,
    ENEMY_POWER,
    enemyCat,
    enemyAttackFactor,
    applyPlayerDefense,
  };
})();
