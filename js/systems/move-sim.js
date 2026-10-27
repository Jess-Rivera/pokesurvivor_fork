/* ============ move-sim.js: headless move simulation (G.MoveSim) ============
 *
 * Slots, casts, instances, motion, eligibility and termination for the new move system. No canvas, camera, audio, clock or
 * Math.random (invariant I7): every step takes dt and the time, every roll goes through the injectable rng, and the view
 * rectangle for offScreen arrives as data (setView). Facts for presentation go out as SimBus events (I8).
 * Not loaded by the game until slice 3d (not in dev.html or the NEED array). Slice 3c scope: anchors caster, target and world;
 * targeting direction, nearest, none and self; motions static and travels (path curve, path oscillate, turnRate); grow; endOn
 * time, wall, offScreen and ownerDeath; pierce; hit policies oncePerInstance and interval; payload damage only.
 *
 *   tick(dt, owner, now)  cooldowns and casts for the owner's slots (owner.slots groups, owner.activeGroup()), then step.
 *   step(dt, now)         all live instances, in the frame order of architecture B: motion (age first), growth (inside
 *                         G.MoveGeom.shapeOf), collision and eligibility, payload, termination.
 *   setRng(fn), setView({ x, y, w, h }), clear(owner), list()
 *
 * Timing conventions (slice 3c, Jess 2026-10-26): a root instance takes its first step in its cast frame (S9); age advances
 * before collision, so an endOn time T instance collides on ceil(T / dt) steps; time comparisons allow EPS for float drift.
 */
G.MoveSim = (() => {
  const TAU = Math.PI * 2, EPS = 1e-9, RETRY = 0.05, OFF_MARGIN = 260;
  let rng = Math.random, view = null, insts = [], serial = 0, castSerial = 0;

  const rangeOf = def => (def.delivery.range != null ? def.delivery.range : G.MoveResolver.TUNING.RANGE);
  const live = e => e && !e.dead;
  const lensOf = o => o.moveRadiusMul || 1;
  const wrap = a => { a %= TAU; return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a; };

  /** Nearest live enemy to (x, y) whose centre distance passes limit(e); ties by lower id (S10, no rng). */
  function nearest(x, y, far, limit) {
    let best = null, bd = Infinity;
    G.EnemyMgr.queryCircleEach(x, y, far, e => {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d > limit(e) + EPS) return;
      if (d < bd - EPS || (Math.abs(d - bd) <= EPS && e.id < best.id)) { best = e; bd = d; }
    });
    return best;
  }

  /** Outer reach of a shape at full growth, lens included (S1): radius for radial shapes, length for linear. */
  function reachOf(def, o) {
    const s = G.MoveGeom.shapeOf(def.space, def.delivery.grow || null, { x: 0, y: 0, heading: 0, age: Infinity, dist: Infinity, lens: lensOf(o) });
    return s.family === 'linear' ? s.len : s.r;
  }

  // Aim and cast gate per targeting value (S1 to S3). Returns { aim, target } or null when the gate holds the cast.
  const AIM = {
    // a caster-anchored static shape waits until the target is inside its reach (capped by range); everything else uses range
    nearest(o, def) {
      const R = rangeOf(def), d = def.delivery;
      const reach = d.anchor === 'caster' && d.motion === 'static' ? reachOf(def, o) : Infinity;
      const t = nearest(o.x, o.y, R, e => Math.min(R, reach + e.r));
      return t ? { aim: Math.atan2(t.y - o.y, t.x - o.x), target: t } : null;
    },
    direction(o, def) {
      const R = rangeOf(def);
      return nearest(o.x, o.y, R, () => R) ? { aim: o.aim || 0, target: null } : null;
    },
    none: o => ({ aim: o.aim || 0, target: null }),
    self: o => ({ aim: o.aim || 0, target: null })
  };

  /** Root-instance fan (review F1): spread is the TOTAL fan; at 2 pi or more the instances sit 2 pi / count apart. */
  function fanAngle(aim, i, n, spread) {
    if (n === 1) return aim;
    return spread >= TAU ? aim + (i * TAU) / n : aim + (i / (n - 1) - 0.5) * spread;
  }

  function spawnInstance(spec, cast, heading, i) {
    const d = spec.delivery, o = cast.owner;
    const at = d.anchor === 'target' && cast.target ? cast.target : d.anchor === 'world' ? cast.point || cast : o;
    const inst = { id: ++serial, spec, cast, fan: i, x: at.x, y: at.y, prevX: at.x, prevY: at.y, bx: at.x, by: at.y,
      heading, age: 0, dist: 0, steer: cast.target, retargeted: false, struck: 0,
      pierce: spec.space.pierce == null ? Infinity : spec.space.pierce, hits: new Map(), done: null, shape: null };
    insts.push(inst);     // roots act in their cast frame (S9); children (slice 4d) will be deferred to the end of the step (R6)
    return inst;
  }

  function castSlot(o, slot, def, now) {
    if (G.Status.stunned(o)) { slot.t = RETRY; return null; }       // a stunned owner casts nothing; the move stays ready
    const pick = AIM[def.delivery.targeting] ? AIM[def.delivery.targeting](o, def) : null;
    if (!pick) { slot.t = RETRY; return null; }                       // cast gate: retry every 0.05 s
    slot.t = Math.max(0.05, def.cd * (o.cdMul || 1));                 // D3
    if (G.Status.fizzle(o, rng)) return null;                         // fizzle spends the cooldown
    const cast = { owner: o, slot, moveId: def.id, time: now, x: o.x, y: o.y, aim: pick.aim, target: pick.target, serial: ++castSerial };
    if (def.space) {
      const n = Math.max(1, def.space.count || 1);
      for (let i = 0; i < n; i++) spawnInstance(def, cast, fanAngle(pick.aim, i, n, def.space.spread || 0), i);
    }
    G.SimBus.emit('move:cast', { moveId: def.id, ownerId: o.id != null ? o.id : null, x: o.x, y: o.y, aim: pick.aim });
    return cast;
  }

  function tick(dt, o, now) {
    if (!o.dead) {
      const act = o.activeGroup();
      for (const g of o.slots) for (const slot of g) {
        const def = G.MoveDefs[slot.id];
        if (!def || def.persistent || def.cd == null) continue;       // persistent upkeep arrives with orbits (slice 4c)
        if (g !== act) { if (slot.t > 0) slot.t = Math.max(0, slot.t - dt); continue; }     // inactive slots recharge too
        slot.t -= dt;
        if (slot.t <= EPS) castSlot(o, slot, def, now);
      }
    }
    step(dt, now);
  }

  // ---- motion table, keyed by delivery.motion (I3) ----
  function follow(inst) {     // R8: caster shapes ride the owner; target shapes follow the target until it dies, then freeze
    const a = inst.spec.delivery.anchor, c = inst.cast;
    if (a === 'caster') { inst.x = c.owner.x; inst.y = c.owner.y; }
    else if (a === 'target' && live(c.target)) { inst.x = c.target.x; inst.y = c.target.y; }
  }
  /** D23 steering target (S4): the cast target while it lives, then one re-pick of the nearest live enemy within range. */
  function steerTarget(inst) {
    if (live(inst.steer)) return inst.steer;
    if (!inst.retargeted) {
      inst.retargeted = true;
      const R = rangeOf(inst.spec);
      inst.steer = nearest(inst.x, inst.y, R, () => R);
    }
    return live(inst.steer) ? inst.steer : null;
  }
  const MOTION = {
    static: follow,
    travels(inst, dt) {
      const d = inst.spec.delivery, v = d.moveSpeed || 0, p = d.path || {};
      inst.bx += Math.cos(inst.heading) * v * dt;     // D23: position first, then the turn
      inst.by += Math.sin(inst.heading) * v * dt;
      inst.dist += v * dt;
      if (p.curve) inst.heading += p.curve * dt;
      if (d.turnRate) {
        const t = steerTarget(inst);
        if (t) {
          const want = wrap(Math.atan2(t.y - inst.by, t.x - inst.bx) - inst.heading), cap = d.turnRate * dt;
          inst.heading += want > cap ? cap : want < -cap ? -cap : want;     // clamped turn in rad/s (Q13), not a damp
        }
      }
      inst.heading = wrap(inst.heading);
      let off = 0;     // D24: exact positional offset across the current heading, independent of dt
      if (p.oscillate) off = p.oscillate.amplitude * Math.sin(TAU * p.oscillate.frequency * inst.age);
      inst.x = inst.bx - Math.sin(inst.heading) * off;
      inst.y = inst.by + Math.cos(inst.heading) * off;
    }
  };

  // ---- eligibility table, keyed by hitPolicy (I3): the only place hit timing is decided ----
  const ELIGIBLE = {
    oncePerInstance: rec => !rec,
    interval: (rec, inst) => !rec || inst.age - rec.t >= inst.spec.rehit - EPS
  };

  function collide(inst, maxR) {
    const s = inst.shape, b = G.MoveGeom.boundsOf(s, inst.prevX, inst.prevY, maxR), cands = [];
    G.EnemyMgr.queryCircleEach(b.x, b.y, b.r, e => { if (G.MoveGeom.contains(s, inst.prevX, inst.prevY, e.x, e.y, e.r)) cands.push(e); });
    // sweep order: nearest to the previous position first, ties by id (S8), so a pierce budget is spent in path order
    cands.sort((a, c) => ((a.x - inst.prevX) ** 2 + (a.y - inst.prevY) ** 2) - ((c.x - inst.prevX) ** 2 + (c.y - inst.prevY) ** 2) || a.id - c.id);
    const elig = ELIGIBLE[inst.spec.hitPolicy || 'oncePerInstance'], go = [];
    for (const e of cands) {     // I4: every eligibility decision before any payload runs
      const rec = inst.hits.get(e.id);
      if (!elig(rec, inst)) continue;
      if (!rec) { if (inst.struck > inst.pierce) continue; inst.struck++; }     // D16: pierce n damages n + 1 distinct enemies
      inst.hits.set(e.id, { t: inst.age, leg: 0 });
      go.push(e);
    }
    for (const e of go) {
      if (e.dead) continue;
      const r = G.MoveEffects.applyHit(inst, e, 0, rng);
      if (r) G.SimBus.emit('move:hit', { moveId: inst.spec.id, instId: inst.id, enemyId: e.id, dmg: r.dmg, crit: r.crit, typeMult: r.typeMult, x: e.x, y: e.y, hop: 0 });
    }
  }

  // ---- termination table, keyed by the endOn condition (first true wins, data order) ----
  const END = {
    time: (inst, v) => inst.age >= v - EPS && 'time',
    contact: inst => {
      const blk = G.World.projectileBlock(inst.x, inst.y, inst.shape.r || 0);
      return (blk === 'wall' || (blk && !blk.destructible)) && 'wall';
    },
    offScreen: inst => !!view && (inst.x < view.x - OFF_MARGIN || inst.y < view.y - OFF_MARGIN ||
      inst.x > view.x + view.w + OFF_MARGIN || inst.y > view.y + view.h + OFF_MARGIN) && 'offScreen',
    ownerDeath: inst => !!inst.cast.owner.dead && 'ownerDeath'
  };
  function checkEnd(inst) {
    for (const c of inst.spec.delivery.endOn || []) for (const k in c) {
      const r = END[k] && END[k](inst, c[k]);
      if (r) return r;
    }
    return inst.struck > inst.pierce ? 'pierce' : null;
  }

  function step(dt, now) {
    if (!insts.length) return;
    let maxR = 0;
    for (const e of G.EnemyMgr.all()) if (live(e) && e.r > maxR) maxR = e.r;     // boundsOf needs it for linear shapes
    for (const inst of insts) {     // motion (age first, so collisions see the new age)
      inst.prevX = inst.x; inst.prevY = inst.y;
      inst.age += dt;
      MOTION[inst.spec.delivery.motion](inst, dt);
      inst.shape = G.MoveGeom.shapeOf(inst.spec.space, inst.spec.delivery.grow || null,     // growth (D21) and the lens live in shapeOf
        { x: inst.x, y: inst.y, heading: inst.heading, age: inst.age, dist: inst.dist, lens: lensOf(inst.cast.owner) });
    }
    for (const inst of insts) collide(inst, maxR);
    for (const inst of insts) {
      inst.done = checkEnd(inst);
      if (inst.done) G.SimBus.emit('move:end', { moveId: inst.spec.id, instId: inst.id, reason: inst.done, x: inst.x, y: inst.y });
    }
    insts = insts.filter(i => !i.done);
  }

  return {
    tick, step,
    setRng: fn => { rng = fn || Math.random; },
    setView: v => { view = v || null; },
    clear: o => { insts = o ? insts.filter(i => i.cast.owner !== o) : []; },
    list: () => insts
  };
})();
