/* ============ move-effects.js: payload appliers for the new move system (G.MoveEffects) ============
 *
 * Slice 3c: damage. Slice 4a: the riders on a hit (ailment, flinch, knockback, crit, heal from dealt, stat). Shield, recoil,
 * emit, specials and heal over time are skipped until 4b and 4d. Loaded by the game since slice 3d; only reached through
 * G.MoveSim with ?dev&newcombat.
 *
 *   applyHit(inst, e, hop, rng)  runs the instance's payload list in data order for one eligible hit (the sim decided
 *                                eligibility first, invariant I4). Always returns { dmg, crit, typeMult, dealt } for the
 *                                'move:hit' event: a hit with no damage entry (String Shot) still lands its riders, dmg 0.
 *   applyProp(inst, p)           a rock, chest or grass the sim found eligible: legacy prop damage, no event.
 *   statKey(stat)                schema stat -> stages.js key (D31), the only translation point.
 *
 * Damage (architecture D5 to D11): the attacker half is computed AT HIT TIME from the owner (owner.moveFactor, the existing
 * player.js D6 composition: stat cards, stages, run items), so a stage change mid-flight reaches later hits. The defender half is
 * G.Stats.applyDamage against the enemy's own Def/SpD (STAB and the scalar inside). Then type x weather (Power Stone floor),
 * held items, crit, and a 1 HP floor. Enemy.hurt is called as-is (it still draws its own number, the documented I8 exception).
 *
 * Riders (slice 4a): every eligible hit rolls its own riders (Q14, no roll gap). A chance is percent / 100 in pct() only (I9),
 * halved per chain hop (D15; hop is 0 until 4b); no chance means guaranteed, with no roll. Crit and knockback are read by the
 * damage applier, so there is one Enemy.hurt call: the crit percent adds to the D10 chance, the knockback distance is hurt's
 * impulse from the instance centre to the enemy (D33). Foe riders skip a dead or remote enemy; self riders (heal, self stat)
 * still apply after a kill. A Fire hit thaws ice once per landed hit (G.Status.onHit, legacy behavior).
 */
G.MoveEffects = (() => {
  const CRIT_MUL = 1.5, BIG_ROOT = 1.3;

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
  const pct = v => v / 100;                                                        // I9: the one percent conversion
  const fxOf = (def, t) => (def.payload || []).find(fx => fx.t === t);
  const foe = e => !e.dead && !e.remote;

  /** One rider roll (Q14, D15): no chance = guaranteed (no roll); otherwise chance / 100 halved per hop, one roll. */
  function rolls(fx, hop, rng) {
    if (fx.chance == null) return true;
    const p = pct(fx.chance) * Math.pow(0.5, hop || 0);
    return p >= 1 || rng() < p;
  }

  const STAT_KEY = { atk: 'atk', def: 'def', spAtk: 'spa', spDef: 'spd', spd: 'spe' };
  /** D31: schema stat -> stages.js key. An unknown stat fails loudly. */
  function statKey(stat) {
    const k = STAT_KEY[stat];
    if (!k) throw new Error('MoveEffects: unknown stat ' + stat);
    return k;
  }

  function damage(inst, e, rng, fx, hop, hit) {
    const def = inst.spec, o = inst.cast.owner;
    const m = { cat: def.category, dmg: def.basePower || 0, type: def.type };     // adapter into G.Stats (D5: P = basePower)
    const A = o.moveFactor(m);                                                      // D6, at hit time
    const ds = enemyDefStats(e);
    const D = G.Stats.applyDamage(A, ds.def, ds.spd, m, defLevel(e, o.level), o.stabFor(m), defStage(e, m.cat));     // D7, D8
    const k = typeK(o, def.type, e);
    const cfx = fxOf(def, 'crit'), kfx = fxOf(def, 'knockback');
    const c = critOf(o) + (cfx ? pct(cfx.critChance || 0) : 0), crit = c > 0 && rng() < c;     // D10: one roll per damage hit, only when it can crit
    const dmg = Math.max(1, D * k * G.Stats.itemDmgMul(o, def.type, k) * (crit ? CRIT_MUL : 1));     // D11
    const col = (G.U && G.U.TYPE_COLOR && G.U.TYPE_COLOR[def.type]) || '#fff';
    const hp0 = e.hp, sh0 = e.shield || 0;
    e.hurt(dmg, col, e.x - inst.x, e.y - inst.y, kfx ? kfx.distance || 0 : 0, crit ? 'crit' : G.Types.label(hit.typeMult));     // D33
    o.dmgDealt = (o.dmgDealt || 0) + dmg;
    if (o.onDealt) o.onDealt(dmg);
    hit.dmg = dmg; hit.crit = crit;
    hit.dealt = Math.max(0, hp0 - Math.max(0, e.hp)) + Math.max(0, sh0 - (e.shield || 0));     // D34: shield counted, overkill excluded
  }

  /** D32: burn and poison through their Enemy entry points, control statuses through G.Status (immunity, 'blocked' and windows live there). */
  function ailment(inst, e, rng, fx, hop) {
    if (fx.side !== 'foe' || !foe(e) || !rolls(fx, hop, rng)) return;
    if (fx.id === 'burn') {
      const B = fx.duration != null && G.Enemies.STATUS.burn;     // a stated length becomes the turn multiplier
      e.applyBurn(1, false, 1, B ? fx.duration / (B.turns * B.turn) : 1);
    } else if (fx.id === 'poison') e.applyPoison(1, 1);     // applyPoison takes no length; no move states a poison duration
    else G.Status.apply(e, fx.id, 1, 1, fx.duration);
  }

  function flinch(inst, e, rng, fx, hop) { if (foe(e) && rolls(fx, hop, rng)) e.applyFlinch(); }

  /** D30: foe on the hit enemy's own list; self team on the owner's team store; self individual on the owner's own list. */
  function stat(inst, e, rng, fx, hop) {
    const o = inst.cast.owner, k = statKey(fx.stat), src = inst.spec.id, onFoe = fx.side === 'foe';
    if (onFoe ? !foe(e) : o.dead) return;
    if (!rolls(fx, hop, rng)) return;
    if (onFoe) G.Stages.add(e, k, fx.stages, fx.duration, G.Stages.MAX, src, fx.maxStacks);
    else if (fx.scope === 'team') { if (o.stgTeam) G.Stages.teamAdd(o.stgTeam, k, fx.stages, fx.duration, src, fx.maxStacks); }
    else G.Stages.add(o, k, fx.stages, fx.duration, G.Stages.MAX, src, fx.maxStacks);
  }

  /** D34, from dealt only, no cap (as legacy Giga Drain). The maxHP-over-time form is slice 4b. */
  function heal(inst, e, rng, fx, hop, hit) {
    const o = inst.cast.owner, a = fx.amount || {};
    if (a.from !== 'dealt' || o.dead || !(hit.dealt > 0)) return;
    o.heal(hit.dealt * a.fraction * (o.bigRoot ? BIG_ROOT : 1));
  }

  const inDamage = () => {};     // crit and knockback are read by damage(); their entries exist so an unknown t fails loudly
  const APPLY = { damage, ailment, flinch, stat, heal, crit: inDamage, knockback: inDamage };     // one applier per effect t (I3)
  const LATER = new Set(['emit', 'shield', 'recoil', 'special']);                                 // slices 4b and 4d

  function applyHit(inst, e, hop, rng) {
    const hit = { dmg: 0, crit: false, typeMult: G.Types.mult(inst.spec.type, e.types), dealt: 0 };
    for (const fx of inst.spec.payload || []) {
      const f = APPLY[fx.t];
      if (f) f(inst, e, rng, fx, hop, hit);
      else if (!LATER.has(fx.t)) throw new Error('MoveEffects: no applier for effect ' + fx.t + ' (' + inst.spec.id + ')');
    }
    if (foe(e)) G.Status.onHit(e, inst.spec.type);     // P3: a Fire hit thaws a freeze older than 0.2 s
    return hit;
  }

  /** A destructible prop the sim found eligible (slice 3d, D2): the legacy prop formula, only when the payload deals damage. */
  function applyProp(inst, p) {
    const def = inst.spec;
    if (!(def.payload || []).some(fx => fx.t === 'damage')) return;
    const m = { cat: def.category, dmg: def.basePower || 0, type: def.type };
    const col = (G.U && G.U.TYPE_COLOR && G.U.TYPE_COLOR[def.type]) || '#fff';
    G.World.damageProp(p, G.Stats.applyDamageProp(inst.cast.owner.moveFactor(m)), col);
  }

  return { applyHit, applyProp, statKey, rolls };
})();
