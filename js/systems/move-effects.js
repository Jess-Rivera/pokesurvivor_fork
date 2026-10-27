/* ============ move-effects.js: payload appliers for the new move system (G.MoveEffects) ============
 *
 * Slice 3c: damage only. Every other payload entry is skipped until slice 4a (riders) and 4b (specials).
 * Loaded by the game since slice 3d; only reached through G.MoveSim with ?dev&newcombat.
 *
 *   applyHit(inst, e, hop, rng)  runs the instance's payload list in data order for one eligible hit (the sim decided
 *                                eligibility first, invariant I4). Returns { dmg, crit, typeMult } for the 'move:hit' event,
 *                                or null when the payload deals no damage.
 *   applyProp(inst, p)           a rock, chest or grass the sim found eligible: legacy prop damage, no event.
 *
 * Damage (architecture D5 to D11): the attacker half is computed AT HIT TIME from the owner (owner.moveFactor, the existing
 * player.js D6 composition: stat cards, stages, run items), so a stage change mid-flight reaches later hits. The defender half is
 * G.Stats.applyDamage against the enemy's own Def/SpD (STAB and the scalar inside). Then type x weather (Power Stone floor),
 * held items, crit, and a 1 HP floor. Enemy.hurt is called as-is (it still draws its own number, the documented I8 exception).
 */
G.MoveEffects = (() => {
  const CRIT_MUL = 1.5;

  // Defender-side helpers: copies of the private combat.js ones (Jess, S7, 2026-10-26). combat.js is deleted in slice 7.
  function enemyDefStats(e) {
    const s = G.DEX_BY[e.dex] && G.DEX_BY[e.dex].stats;
    return { def: s && s[2] != null ? s[2] : 50, spd: s && s[4] != null ? s[4] : 50 };
  }
  const defLevel = (e, fallback) => (e.atkLvl > 0 ? e.atkLvl : fallback);
  const defStage = (e, cat) => (!e.stg || cat === 'status' ? 1 : G.Stages.mul(e, cat === 'special' ? 'spd' : 'def'));
  function typeK(owner, type, e) {     // D9: chart x weather, floored at 1 for the Power Stone's held type
    const k = G.Types.mult(type, e.types) * G.Weather.mult(type);
    return owner.stoneType && owner.stoneType === type ? Math.max(1, k) : k;
  }
  const critOf = o => (o.critChance || 0) + (o.stgTeam ? G.Stages.teamSum(o.stgTeam, 'crit') : 0);

  function damage(inst, e, rng) {
    const def = inst.spec, o = inst.cast.owner;
    const m = { cat: def.category, dmg: def.basePower || 0, type: def.type };     // adapter into G.Stats (D5: P = basePower)
    const A = o.moveFactor(m);                                                      // D6, at hit time
    const ds = enemyDefStats(e);
    const D = G.Stats.applyDamage(A, ds.def, ds.spd, m, defLevel(e, o.level), o.stabFor(m), defStage(e, m.cat));     // D7, D8
    const k = typeK(o, def.type, e);
    const c = critOf(o), crit = c > 0 && rng() < c;                                // D10: one roll per damage hit, only when it can crit
    const dmg = Math.max(1, D * k * G.Stats.itemDmgMul(o, def.type, k) * (crit ? CRIT_MUL : 1));     // D11
    const typeMult = G.Types.mult(def.type, e.types);
    const col = (G.U && G.U.TYPE_COLOR && G.U.TYPE_COLOR[def.type]) || '#fff';
    e.hurt(dmg, col, e.x - inst.x, e.y - inst.y, 0, crit ? 'crit' : G.Types.label(typeMult));
    o.dmgDealt = (o.dmgDealt || 0) + dmg;
    if (o.onDealt) o.onDealt(dmg);
    return { dmg, crit, typeMult };
  }

  const APPLY = { damage };     // one applier per effect t (I3); riders arrive in 4a

  function applyHit(inst, e, hop, rng) {
    let out = null;
    for (const fx of inst.spec.payload || []) {
      const f = APPLY[fx.t];
      if (f) out = f(inst, e, rng, fx, hop) || out;
    }
    return out;
  }

  /** A destructible prop the sim found eligible (slice 3d, D2): the legacy prop formula, only when the payload deals damage. */
  function applyProp(inst, p) {
    const def = inst.spec;
    if (!(def.payload || []).some(fx => fx.t === 'damage')) return;
    const m = { cat: def.category, dmg: def.basePower || 0, type: def.type };
    const col = (G.U && G.U.TYPE_COLOR && G.U.TYPE_COLOR[def.type]) || '#fff';
    G.World.damageProp(p, G.Stats.applyDamageProp(inst.cast.owner.moveFactor(m)), col);
  }

  return { applyHit, applyProp };
})();
