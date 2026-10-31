/* ============ move-effects.js: payload appliers for the new move system (G.MoveEffects) ============
 *
 * Slice 3c: damage. Slice 4a: the riders on a hit (ailment, flinch, knockback, crit, heal from dealt, stat). Slice 4b: the
 * cast-time effects (recoil, shield, heal over time, self stats, setWeather), the special handlers and chain hops. Emit is
 * skipped until 4d. Loaded by the game since slice 3d; only reached through G.MoveSim with ?dev&newcombat.
 *
 *   applyHit(inst, e, hop, rng)  runs the instance's payload list in data order for one eligible hit (the sim decided
 *                                eligibility first, invariant I4). Always returns { dmg, crit, typeMult, dealt } for the
 *                                'move:hit' event: a hit with no damage entry (String Shot) still lands its riders, dmg 0.
 *   applyProp(inst, p)           a rock, chest or grass the sim found eligible: legacy prop damage, no event.
 *   statKey(stat)                schema stat -> stages.js key (D31), the only translation point.
 *   canCast(def, o)              false while the cast must wait (P3): recoil would leave 0 HP or less, or a shield is live.
 *   applyCast(def, cast, rng)    the cast-time effects: recoil and setWeather on any move, and the whole payload of a shapeless
 *                                self-cast (recoil, shield, self stat, heal over time). Returns { paid, shield }.
 *   upkeep(dt, o), endSelf(o)    heal over time ticks for the owner; endSelf drops its heal over time and its shield (swap, faint).
 *   hopReduction(def), srcOf(def, o), evalFormula(expr, ctx)
 *   isPureBuff(def), statReady(def, o)   slice 5a (SS8): a shapeless move whose payload is only self stat changes casts on its Gate,
 *                                with no cooldown; statReady is true when one of its trackers is missing or has an open Gate.
 *
 * Slice 4b: a stat change is tagged with the move id plus the casting Pokemon (S4; foe drops too since slice 5a), so each Pokemon
 * has its own tracker (COMBAT-RULES "Stat stages" SS1): three roster members that know Swords Dance climb separately and add up,
 * while one Pokemon's recast inside its Gate only refreshes its own. Flat damage (fixedDamage,
 * levelDamage) skips every multiplier (S5) but still goes through Enemy.hurt. statusBonus multiplies POWER before the attacker
 * half when the target has a major ailment (D13). A chain hop k multiplies its full damage LAST by (1 - hopReduction)^k (D15).
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
  const CRIT_MUL = 1.5, BIG_ROOT = 1.3, EPS = 1e-9;

  // Defender-side helpers: copies of the private combat.js ones (Jess, S7, 2026-10-26). combat.js is deleted in slice 7.
  function enemyDefStats(e) {
    const s = G.DEX_BY[e.dex] && G.DEX_BY[e.dex].stats;
    return { def: s && s[2] != null ? s[2] : 50, spd: s && s[4] != null ? s[4] : 50 };
  }
  const defLevel = (e, fallback) => (e.atkLvl > 0 ? e.atkLvl : fallback);
  const defStage = (e, cat) => (!(e.stg || e.trk) || cat === 'status' ? 1 : G.Stages.mul(e, cat === 'special' ? 'spd' : 'def'));
  function typeK(owner, type, e) {     // D9: chart x weather, floored at 1 for the Power Stone's held type
    const k = G.Types.mult(type, e.types) * G.Weather.mult(type);
    return owner.stoneType && owner.stoneType === type ? Math.max(1, k) : k;
  }
  const critOf = o => (o.critChance || 0) + (o.stgTeam ? G.Stages.teamSum(o.stgTeam, 'crit') : 0);
  const pct = v => v / 100;                                                        // I9: the one percent conversion
  const fxOf = (def, t) => (def.payload || []).find(fx => fx.t === t);
  const specialOf = (def, h) => (def.payload || []).find(fx => fx.t === 'special' && fx.handler === h);
  const foe = e => !e.dead && !e.remote;

  // S4: a stable tag per Pokemon (the Player object persists across swaps), so a source is move id plus caster
  const tags = new WeakMap(); let tagN = 0;
  function srcOf(def, o) {
    if (!tags.has(o)) tags.set(o, 'p' + (++tagN));
    return def.id + '@' + tags.get(o);
  }
  /** D15: the per-hop reduction declared by a chainDamageFalloff entry (0 when the move has none). */
  const hopReduction = def => { const f = specialOf(def, 'chainDamageFalloff'); return f ? f.hopReduction : 0; };
  const hopMul = (def, hop) => (hop > 0 ? Math.pow(1 - hopReduction(def), hop) : 1);

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

  // ---- knockback direction and the pull clamp (D33, slice 4c-2) ----
  // Enemy.hurt adds knock x the unit direction to the enemy's slide velocity, which enemy.js decays by G.Enemy.KNOCK_DECAY ^ dt (0.0015),
  // so a knock k slides about k x dt / (1 - KNOCK_DECAY ^ dt) px: 0.16 at dt 1/60, 0.17 at 1/30 (game.js's frame cap), 0.18 at 1/20.
  // SLIDE covers that with room, so a clamped pull never carries an enemy past the caster's edge. move-motion-harness.js section 4
  // recomputes it from KNOCK_DECAY and fails if a retune makes SLIDE too small.
  const SLIDE = 0.18;
  /** [dirX, dirY, knock] for e.hurt. `direction: travel` uses the instance's velocity when it has one (returns, travels), else away
   *  from the instance centre as before. A travel knock toward the owner is cut so the enemy stops at the owner's edge (Bonemerang). */
  function knockOf(inst, e, kfx) {
    let dx = e.x - inst.x, dy = e.y - inst.y, k = kfx ? kfx.distance || 0 : 0;
    if (!k || kfx.direction !== 'travel' || !(inst.vx || inst.vy)) return [dx, dy, k];
    dx = inst.vx; dy = inst.vy;
    const o = inst.cast.owner, tx = o.x - e.x, ty = o.y - e.y;
    if (dx * tx + dy * ty > 0) k = Math.min(k, Math.max(0, Math.hypot(tx, ty) - (o.r || 0) - (e.r || 0)) / SLIDE);     // a pull: clamp; a push: never
    return [dx, dy, k];
  }

  function damage(inst, e, rng, fx, hop, hit) {
    const def = inst.spec, o = inst.cast.owner;
    const sb = specialOf(def, 'statusBonus');                                       // D13: a POWER term, checked per hop target
    const m = { cat: def.category, dmg: (def.basePower || 0) * (sb && G.Status.majorKind(e) ? sb.multiplier : 1), type: def.type };     // adapter into G.Stats (D5: P = basePower)
    const A = o.moveFactor(m);                                                      // D6, at hit time
    const ds = enemyDefStats(e);
    const D = G.Stats.applyDamage(A, ds.def, ds.spd, m, defLevel(e, o.level), o.stabFor(m), defStage(e, m.cat));     // D7, D8
    const k = typeK(o, def.type, e);
    const cfx = fxOf(def, 'crit'), kfx = fxOf(def, 'knockback');
    const c = critOf(o) + (cfx ? pct(cfx.critChance || 0) : 0), crit = c > 0 && rng() < c;     // D10: one roll per damage hit, only when it can crit
    const full = Math.max(1, D * k * G.Stats.itemDmgMul(o, def.type, k) * (crit ? CRIT_MUL : 1));     // D11
    const dmg = Math.max(1, full * hopMul(def, hop));                                                 // D15: the chain reduction is applied last
    const col = (G.U && G.U.TYPE_COLOR && G.U.TYPE_COLOR[def.type]) || '#fff';
    const hp0 = e.hp, sh0 = e.shield || 0;
    const kn = knockOf(inst, e, kfx);
    e.hurt(dmg, col, kn[0], kn[1], kn[2], crit ? 'crit' : G.Types.label(hit.typeMult));     // D33
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

  // SS2 (slice 5a): the self-side roll memory. A cast is one use, rolled on its first enemy hit (a shapeless self-cast rolls at cast);
  // a persistent or rehit instance makes each of its collision steps a new use (inst.age is the same for every hit of one step).
  function firstUse(inst, fx) {
    const c = inst.cast, rehit = inst.spec.persistent || inst.spec.hitPolicy === 'interval';
    const use = rehit ? inst.id + ':' + inst.age : 'cast';
    const u = c.used || (c.used = new Map());
    if (u.get(fx) === use) return false;
    u.set(fx, use);
    return true;
  }
  /** H26 (slice 5a): every success lands on a tracker per (recipient, move@caster, stat). Foe side: one roll per enemy hit, on the
   *  enemy's own tracker. Self side: one roll per use (SS2); team scope on the roster's team tracker, individual on the owner's own.
   *  A drop a Pokemon puts on itself climbs on the Self-drop Gate (SS12). */
  function stat(inst, e, rng, fx, hop) {
    const o = inst.cast.owner, k = statKey(fx.stat), onFoe = fx.side === 'foe', src = srcOf(inst.spec, o);     // S4, foe side too (SS1)
    if (onFoe ? !foe(e) : o.dead) return;
    if (!onFoe && !firstUse(inst, fx)) return;
    if (!rolls(fx, hop, rng)) return;
    if (onFoe) G.Stages.trackOwn(e, k, fx.stages, src, G.Stages.gateOf(false));
    else if (fx.scope === 'team') G.Stages.trackTeam(o, k, fx.stages, src, G.Stages.gateOf(fx.stages < 0));
    else G.Stages.trackOwn(o, k, fx.stages, src, G.Stages.gateOf(fx.stages < 0));
  }

  // SS8 (slice 5a): a pure buff move has no damage and no shape: its payload is only self stat changes (Swords Dance, Agility, Harden,
  // Dragon Dance). It casts when its Gate opens instead of on a cooldown.
  const pureMemo = new WeakMap();
  function isPureBuff(def) {
    let v = pureMemo.get(def);
    if (v === undefined) {
      const p = def.payload || [];
      v = !def.space && p.length > 0 && p.every(fx => fx.t === 'stat' && fx.side !== 'foe');
      pureMemo.set(def, v);
    }
    return v;
  }
  /** True when a pure buff may cast: one of its stat trackers is missing or has an open Gate (SS8). */
  function statReady(def, o) {
    const src = srcOf(def, o);
    for (const fx of def.payload || []) {
      if (fx.t !== 'stat') continue;
      const t = G.Stages.tracker(o, statKey(fx.stat), src, fx.scope === 'team');
      if (!t || t.g <= EPS) return true;
    }
    return false;
  }

  /** D34, from dealt only, no cap (as legacy Giga Drain). The maxHP-over-time form is a cast effect (applyCast). */
  function heal(inst, e, rng, fx, hop, hit) {
    const o = inst.cast.owner, a = fx.amount || {};
    if (a.from !== 'dealt' || o.dead || !(hit.dealt > 0)) return;
    o.heal(hit.dealt * a.fraction * (o.bigRoot ? BIG_ROOT : 1));
  }

  /** S5: flat damage skips STAB, type, crit, stages, weather, items and cards; the chain factor and the 1 HP floor still apply. */
  function flat(inst, e, amount, hop, hit) {
    if (!foe(e)) return;
    const def = inst.spec, o = inst.cast.owner, kfx = fxOf(def, 'knockback');
    const dmg = Math.max(1, amount * hopMul(def, hop));
    const col = (G.U && G.U.TYPE_COLOR && G.U.TYPE_COLOR[def.type]) || '#fff';
    const hp0 = e.hp, sh0 = e.shield || 0;
    const kn = knockOf(inst, e, kfx);
    e.hurt(dmg, col, kn[0], kn[1], kn[2], null);
    o.dmgDealt = (o.dmgDealt || 0) + dmg;
    if (o.onDealt) o.onDealt(dmg);
    hit.dmg = dmg; hit.crit = false; hit.typeMult = 1;
    hit.dealt = Math.max(0, hp0 - Math.max(0, e.hp)) + Math.max(0, sh0 - (e.shield || 0));
  }
  // special handlers on a hit, by name (declarations in move-handler.js; an unknown name fails at load in the resolver)
  const read = () => {};     // statusBonus and chainDamageFalloff are read by damage(); setWeather runs at cast; berrySteal is a stub
  const SPECIAL = {
    fixedDamage: (inst, e, rng, fx, hop, hit) => flat(inst, e, fx.amount, hop, hit),     // D12: ignoresType and ignoresDefense hold by construction
    levelDamage: (inst, e, rng, fx, hop, hit) => flat(inst, e, inst.cast.owner.level || 1, hop, hit),     // D14
    statusBonus: read, chainDamageFalloff: read, setWeather: read, berrySteal: read
  };
  function special(inst, e, rng, fx, hop, hit) {
    const f = SPECIAL[fx.handler];
    if (!f) throw new Error('MoveEffects: no executor for handler ' + fx.handler + ' (' + inst.spec.id + ')');
    f(inst, e, rng, fx, hop, hit);
  }

  const inDamage = () => {};     // crit and knockback are read by damage(); their entries exist so an unknown t fails loudly
  const APPLY = { damage, ailment, flinch, stat, heal, special, crit: inDamage, knockback: inDamage };     // one applier per effect t (I3)
  const LATER = new Set(['emit', 'shield', 'recoil']);     // emit: slice 4d; shield and recoil act at cast (applyCast)

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

  // ---- cast-time effects (slice 4b) ----
  /** Typed formula (schema): a number, { op: 'ref', path: 'cast.paid' | 'effect.<field>' } or { op: 'multiply', args }. No eval, no Function. */
  function evalFormula(x, ctx) {
    if (typeof x === 'number') return x;
    if (x && x.op === 'multiply') return x.args.reduce((p, a) => p * evalFormula(a, ctx), 1);
    if (x && x.op === 'ref') {
      if (x.path === 'cast.paid') return ctx.paid;
      if (x.path.startsWith('effect.')) return evalFormula(ctx.effect[x.path.slice(7)], ctx);
    }
    throw new Error('MoveEffects: bad formula ' + JSON.stringify(x));
  }
  const paidOf = (fx, o) => fx.fraction * o.maxHp;     // D35
  /** P3: recoil never kills (the cast waits while current HP is at or below the cost), and one shield at a time. */
  function canCast(def, o) {
    for (const fx of def.payload || []) {
      if (fx.t === 'recoil' && fx.trigger === 'cast' && o.hp <= paidOf(fx, o)) return false;
      if (fx.t === 'shield' && o.shield) return false;
    }
    return true;
  }

  // heal over time (D34, P5): one entry per source; a recast refreshes the time left and keeps the tick phase (never stacks)
  let hots = [];
  function healOverTime(o, fx, src) {
    const old = hots.find(h => h.o === o && h.src === src);
    if (old) { old.left = fx.duration; return; }
    hots.push({ o, src, frac: fx.amount.fraction, per: fx.per || 1, left: fx.duration, acc: 0 });
  }
  function upkeep(dt, o) {
    for (const h of hots) {
      if (h.o !== o) continue;
      h.acc += dt;
      while (h.acc >= h.per - EPS && h.left > EPS) { h.acc -= h.per; h.left -= h.per; o.heal(h.frac * o.maxHp); }
    }
    hots = hots.filter(h => h.left > EPS);
  }
  /** Swap-out, faint or run end: the owner's heal over time and its shield end (S1, P5). No owner = everything. */
  function endSelf(o) {
    hots = o ? hots.filter(h => h.o !== o) : [];
    if (o) o.shield = null;
  }

  // the self-side appliers of a shapeless cast; anything else on a shapeless move fails loudly
  const CAST = {
    recoil(def, o, fx, out) { if (fx.trigger !== 'cast') return; out.paid = paidOf(fx, o); o.payHp(out.paid); },
    shield(def, o, fx, out) {
      const ctx = { paid: out.paid, effect: fx };
      const max = evalFormula(fx.max != null ? fx.max : fx.amount, ctx);
      out.shield = o.shield = { v: Math.min(max, evalFormula(fx.amount, ctx)), max, regen: fx.regen != null ? evalFormula(fx.regen, ctx) : 0,
        t: fx.duration, dur: fx.duration, overflow: fx.overflow !== false, src: srcOf(def, o) };
    },
    heal(def, o, fx) {
      if (!fx.amount || fx.amount.of !== 'maxHP') throw new Error('MoveEffects: a self-cast heal needs of maxHP (' + def.id + ')');
      healOverTime(o, fx, srcOf(def, o));
    },
    stat(def, o, fx, out, cast, rng) {
      if (fx.side === 'foe') throw new Error('MoveEffects: a foe stat on a shapeless cast (' + def.id + ')');
      stat({ spec: def, cast }, null, rng, fx, 0);
    },
    emit() { },     // 4d: a shapeless emitter's emissions are scheduled by the sim (move-sim.js runEmits), nothing happens at cast
    special(def, o, fx) {
      if (fx.handler !== 'setWeather') throw new Error('MoveEffects: ' + fx.handler + ' on a shapeless cast (' + def.id + ')');
      G.Weather.force(fx.weather, fx.duration);
    }
  };
  function applyCast(def, cast, rng) {
    const o = cast.owner, out = { paid: 0, shield: null }, shapeless = !def.space;
    for (const fx of def.payload || []) {
      if (shapeless) {
        const f = CAST[fx.t];
        if (!f) throw new Error('MoveEffects: no cast applier for effect ' + fx.t + ' (' + def.id + ')');
        f(def, o, fx, out, cast, rng);
      } else if (fx.t === 'recoil' && fx.trigger === 'cast') CAST.recoil(def, o, fx, out);
      else if (fx.t === 'special' && fx.handler === 'setWeather') CAST.special(def, o, fx);
    }
    return out;
  }

  return { applyHit, applyProp, statKey, rolls, canCast, applyCast, upkeep, endSelf, hopReduction, srcOf, evalFormula, knockOf, SLIDE, isPureBuff, statReady };
})();
