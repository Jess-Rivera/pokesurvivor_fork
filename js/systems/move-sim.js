/* ============ move-sim.js: headless move simulation (G.MoveSim) ============
 *
 * Slots, casts, instances, motion, eligibility and termination for the new move system. No canvas, camera, audio, clock or
 * Math.random (invariant I7): every step takes dt and the time, every roll goes through the injectable rng, and the view
 * rectangle for offScreen arrives as data (setView). Facts for presentation go out as SimBus events (I8).
 * Loaded by the game since slice 3d, but only ticked with ?dev&newcombat (G.MoveRoute). Slice 3c scope: anchors caster, target and world;
 * targeting direction, nearest, none and self; motions static and travels (path curve, path oscillate, turnRate); grow; endOn
 * time, wall, offScreen and ownerDeath; pierce; hit policies oncePerInstance and interval; payload through G.MoveEffects.
 * Slice 4a: every landed enemy hit emits 'move:hit', with dmg 0 when the payload has riders only (String Shot).
 * Slice 3d: destructible props share the collision sweep (solid ones spend pierce, grass never does), and a routing filter.
 * Slice 4b: cast-time effects through G.MoveEffects.applyCast (self-casts, recoil, shield, setWeather), the cast waits while
 * G.MoveEffects.canCast says no (P3), caster-state commitments (S13) and sequential chain hops (D15, S7, S9, S15).
 * Slice 4c-1: persistent upkeep (R7, combat-architecture:H25). The slot owns a persistent move's life: it spawns while the slot is
 * active, ends on leaving the active group or a stun (notActive) or a faint (ownerDeath), and spawns again after a group ends by its
 * own endOn. Orbits ride a true circle around the owner (D25, H15) with the orbit radius through the lens (D36).
 * Slice 4c-2: legs (R2, H1, H22). An instance carries a leg (0 at spawn); a hit record counts only in the leg it was made in, and a
 * new leg also resets the pierce budget. returns (D26): out along the heading until `range` from the cast origin, then home on the
 * owner's current position, `returned` at owner radius plus own radius. repositions (D27, R1, R9): the point is the cast target's
 * position capped by `range`, walked in 8 px steps with World.isFree and settled with World.collide. swept: the owner is carried at
 * dashMult x its final move speed (read at the cast), hitbox off in transit, armed for one step at the point (a circle there, not a
 * sweep), then back to the origin (leg 1), with i-frames raised every step and the owner rooted (mvRoot) while it lives.
 * teleport: the owner is placed at the point at cast, the hitbox is live for the instance's life, i-frames once from the cast.
 * Pierce exhaustion disarms a returns or repositions instance but never ends it (R1, H22); an owner faint ends both.
 * 4c-2 review: a one-way swept dash (returnToOrigin false) ends `arrived` after its armed step at B; a rooted commitment holds every
 * reposition at the cast gate.
 * Slice 4c-3: aimTrack (MOVE-INTENT flamethrower): a caster-anchored static shape turns its heading toward a tracked enemy by at most
 * aimTrack x dt each step, after it follows the owner and before collision. The tracked enemy is the cast target while it lives and
 * stays within the cast gate's reach (min(range, reach + its radius)); when lost, the nearest within that reach (ties by id), re-picked
 * whenever lost; none in reach and the heading holds. location (R9, H23): `locationPick` enemy picks one live enemy within range with
 * the sim rng (uniform over the candidates sorted by id), drawn only once the cast passes every gate, so a waiting slot never rolls;
 * the point is its position at the cast and does not track it. `locationPick` caster: the owner's position. Both wait for a live enemy
 * within range. delay (D28): an instance with delivery.delay spends whole steps waiting (no motion, collision, aging or endOn; only an
 * owner faint ends it, as it would anyway), then acts as if cast in the frame after its wait ran out; 'move:land' marks that first
 * live step for the render. falls (R8): a world shape that never moves; the drop is drawn by the render, moveSpeed is ignored.
 *
 *   tick(dt, owner, now)  cooldowns and casts for the owner's slots (owner.slots groups, owner.activeGroup()) that pass the
 *                         routing filter, then step.
 *   step(dt, now)         all live instances, in the frame order of architecture B: motion (age first), growth (inside
 *                         G.MoveGeom.shapeOf), collision and eligibility, payload, termination.
 *   setRng(fn), setView({ x, y, w, h }), setFilter(id => bool) (default: every id), clear(owner), list(), commits(owner)
 *
 * Commitments (casterState.commitment, slice 4b S13): cooldown { type: freeze, id, t } holds the named slot timers of the caster
 * (no id = all of them, inactive slots included) and a frozen slot neither recharges nor casts; when the freeze ends the casting
 * slot is armed at max(0.05, cd x cdMul) from that moment. movement { type, t }: slowed is a quiet -2 Speed stage on the caster
 * (source move id plus caster, cap 1), rooted sets owner.mvRoot (player.js reads it as move speed 0). t absent = until the cast's
 * instances end; seconds; or untilEffectEnd = while the cast's shield lives. Every commitment also ends on swap-out (clear) or faint.
 * Chains (D15): an instance starts at most one chain, from the cast target when it is among the hits, else the first enemy hit.
 * Hop k picks the nearest live enemy within hopRange of the enemy hit at hop k - 1, never that enemy; enemies this chain has not
 * hit yet come first (S15, Jess 2026-10-27), and only when none is in range may it revisit one (so two enemies ping-pong).
 * Hops resolve in the same step, ignore the hit policy and pierce, and emit 'move:hit' with hop k and the previous position.
 *
 * Timing conventions (slice 3c, Jess 2026-10-26): a root instance takes its first step in its cast frame (S9); age advances
 * before collision, so an endOn time T instance collides on ceil(T / dt) steps; time comparisons allow EPS for float drift.
 */
G.MoveSim = (() => {
  const TAU = Math.PI * 2, EPS = 1e-9, RETRY = 0.05, OFF_MARGIN = 260;
  const PROP_R = 14;     // largest destructible prop radius (world.js grass), the broad-phase pad for the prop query
  let rng = Math.random, view = null, insts = [], serial = 0, castSerial = 0, routed = () => true, cms = [], pending = [];

  const isProp = x => x.destructible === true;     // world props carry it, enemies never do
  const rangeOf = def => (def.delivery.range != null ? def.delivery.range : G.MoveResolver.TUNING.RANGE);
  const live = e => e && !e.dead;
  const lensOf = o => o.moveRadiusMul || 1;
  /** Slice 5b: the def a slot runs is the team's folded copy (G.TeamCards, lazy); an owner with no team store runs the frozen def. */
  const defOf = (o, id) => (o && o.teamCards ? G.TeamCards.defOf(o, id) : G.MoveDefs[id]);
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
    self: o => ({ aim: o.aim || 0, target: null }),
    // 4c-3 (R9, H23): the candidates are gathered here; the rng draw waits for settle(), after every gate has passed
    location(o, def) {
      const R = rangeOf(def), cands = [];
      G.EnemyMgr.queryCircleEach(o.x, o.y, R, e => { if (live(e) && Math.hypot(e.x - o.x, e.y - o.y) <= R + EPS) cands.push(e); });
      if (!cands.length) return null;
      if (def.delivery.locationPick === 'caster') return { aim: o.aim || 0, target: null, point: { x: o.x, y: o.y } };
      cands.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      return { aim: o.aim || 0, target: null, cands };
    }
  };
  /** The location pick's one rng draw (H23), made only for a cast that happens: the point is the picked enemy's position now. */
  function settle(o, pick) {
    if (!pick.cands) return pick;
    const c = pick.cands, t = c[Math.min(c.length - 1, Math.floor(rng() * c.length))];
    return { aim: Math.atan2(t.y - o.y, t.x - o.x), target: t, point: { x: t.x, y: t.y } };
  }

  /** Root-instance fan (review F1): spread is the TOTAL fan; at 2 pi or more the instances sit 2 pi / count apart. */
  function fanAngle(aim, i, n, spread) {
    if (n === 1) return aim;
    return spread >= TAU ? aim + (i * TAU) / n : aim + (i / (n - 1) - 0.5) * spread;
  }

  function spawnInstance(spec, cast, heading, i, later) {
    const d = spec.delivery, o = cast.owner;
    const at = d.anchor === 'target' && cast.target ? cast.target : d.anchor === 'world' ? cast.point || cast : o;
    const inst = { id: ++serial, spec, cast, fan: i, x: at.x, y: at.y, prevX: at.x, prevY: at.y, bx: at.x, by: at.y,
      heading, age: 0, dist: 0, steer: cast.target, retargeted: false, track: cast.target, wait: d.delay || 0, struck: 0, leg: 0, armed: true,
      pierce: !spec.space || spec.space.pierce == null ? Infinity : spec.space.pierce, hits: new Map(), done: null, shape: null,
      emits: emitsOf(spec), hitless: hitlessOf(spec), mvX: o.x, mvY: o.y };     // 4d: emitter state (C6) and the owner's last position (casterMove)
    if (d.motion === 'orbits') { MOTION.orbits(inst); inst.prevX = inst.x; inst.prevY = inst.y; }     // start on the ring, so the first sweep does not cross the circle
    if (d.motion === 'repositions') setupReposition(inst);
    (later ? pending : insts).push(inst);     // roots act in their cast frame (S9); emitted children wait for the end of the step (R6)
    if (inst.dash) rootOf(o);
    return inst;
  }

  // ---- emitters (slice 4d, D29, H4, H13, H14, R6, C6): an emitter is its own instance and keeps one state per emit effect ----
  const endAt = spec => { const c = (spec.delivery.endOn || []).find(c => c.time != null); return c ? c.time : Infinity; };
  const emitting = spec => (spec.payload || []).some(fx => fx.t === 'emit');
  const emitsOf = spec => (emitting(spec) ? spec.payload.filter(fx => fx.t === 'emit').map(fx => ({ fx, done: 0, next: fx.trigger === 'interval' ? fx.every : 0, acc: 0 })) : null);
  // slice 5a: a shapeless move whose payload is only self heals (Aqua Ring) can be persistent too: its live group is one marker instance
  // with no shape (collide skips it); the heal over time it starts at spawn ends with the group (endGroup).
  const selfHealOnly = spec => !spec.space && (spec.payload || []).length > 0 && spec.payload.every(fx => fx.t === 'heal' && fx.side === 'self');
  const hitlessOf = spec => !(spec.payload || []).some(fx => fx.t !== 'emit');     // a pure emitter (Toxic Spikes' plate, Will-O-Wisp's turret) has no hitbox
  const capOk = st => st.fx.count == null || st.done < st.fx.count;     // D29: count caps the total emissions; absent, unlimited while the carrier lives
  const kids = new WeakMap();
  /** The child of an emit effect: an inline move takes the parent's identity, type and power (H13); a named move is used as it is. */
  function childOf(def, fx, o) {
    if (typeof fx.move === 'string') return defOf(o, fx.move);     // 5b: a named child folds by its own id
    let c = kids.get(fx);
    if (!c) {
      c = Object.assign({ id: def.id, name: def.name, type: def.type, category: def.category, power: def.power, accuracy: def.accuracy, basePower: def.basePower }, fx.move);
      kids.set(fx, c);
    }
    return c;
  }
  /** One emission at `at`: the child's space.count shapes in its fan around `aim`. An enemyHit child ignores the enemy that triggered it
   *  (R6, MOVE-INTENT meteor-mash). A child that targets nearest (Will-O-Wisp's shot) is not fired when nothing is within its range. */
  function emitOne(inst, st, at, aim, skip) {
    const kid = childOf(inst.spec, st.fx, inst.cast.owner);
    let target = null, heading = aim;
    if (kid.delivery.targeting === 'nearest') {
      const R = rangeOf(kid);
      target = nearest(at.x, at.y, R, () => R);
      if (!target) return false;
      heading = Math.atan2(target.y - at.y, target.x - at.x);
    }
    const cast = Object.assign({}, inst.cast, { x: at.x, y: at.y, point: { x: at.x, y: at.y }, aim: heading, target, persist: false, parent: inst.id });
    const n = Math.max(1, (kid.space && kid.space.count) || 1);
    for (let i = 0; i < n; i++) {
      const c = spawnInstance(kid, cast, fanAngle(heading, i, n, (kid.space && kid.space.spread) || 0), i, true);
      if (skip) c.hits.set(skip.id, { t: 0, leg: 0 });
    }
    G.SimBus.emit('move:emit', { moveId: inst.spec.id, parentId: inst.id, x: at.x, y: at.y, count: n });
    return true;
  }
  /** D29 schedule, on every live step of the carrier: cast emits first at activation, then every `every`; interval first at `every`;
   *  casterMove once per `every` s of owner moving time. H14: never at or after the carrier's end. enemyHit runs in collide().
   *  termination runs in burst(), when the carrier ends (step). */
  function runEmits(inst, dt) {
    const o = inst.cast.owner, end = endAt(inst.spec), moved = Math.hypot(o.x - inst.mvX, o.y - inst.mvY) > EPS;
    inst.mvX = o.x; inst.mvY = o.y;
    for (const st of inst.emits) {
      const tr = st.fx.trigger, every = st.fx.every;
      if (tr === 'cast' || tr === 'interval') {
        while (capOk(st) && st.next <= inst.age + EPS && st.next < end - EPS) {
          if (emitOne(inst, st, inst, inst.heading)) st.done++;
          st.next = every > 0 ? st.next + every : Infinity;
        }
      } else if (tr === 'casterMove' && every > 0) {
        if (moved) st.acc += dt;
        while (capOk(st) && st.acc >= every - EPS && inst.age < end - EPS) {
          if (emitOne(inst, st, inst, inst.heading)) st.done++;
          st.acc -= every;
        }
      }
    }
  }
  /** D29 termination (Jess 2026-10-30): one emission when the carrier ends naturally, at its final position; never on ownerDeath,
   *  notActive or cap (a faint, a swap or the cap cleanup). Its children wait for the end of the step like every child (R6). */
  const BURST = { time: true, pierce: true, wall: true, triggered: true, returned: true, arrived: true, offScreen: true };
  function burst(inst) {
    for (const st of inst.emits) if (st.fx.trigger === 'termination' && capOk(st) && emitOne(inst, st, { x: inst.x, y: inst.y }, inst.heading)) st.done++;
  }
  /** H6: a placed object with neither a time lifetime nor HP (Spikes) is capped at TUNING.INSTANCE_CAP live per move slot; the 9th removes that slot's oldest. */
  const capped = def => !!def.space && def.delivery.anchor === 'world' && !def.persistent && endAt(def) === Infinity;
  function capSlot(o, slot, def, add) {
    const live = insts.filter(i => i.spec === def && i.cast.owner === o && i.cast.slot === slot);
    const drop = live.slice(0, Math.max(0, live.length + add - G.MoveResolver.TUNING.INSTANCE_CAP));
    if (!drop.length) return;
    for (const i of drop) { i.done = 'cap'; G.SimBus.emit('move:end', { moveId: i.spec.id, instId: i.id, reason: 'cap', x: i.x, y: i.y }); }
    insts = insts.filter(i => !drop.includes(i));
  }

  // ---- repositions (slice 4c-2, D27, R9) ----
  const STEP = 8;     // the legacy dash's wall probe step (combat.js dash), radius 0.8 x the owner's
  /** The landing point: the cast target's position, capped by range on the line from the owner, cut at the last free 8 px step. */
  function repoPoint(o, def, t) {
    const dx = t.x - o.x, dy = t.y - o.y, D = Math.hypot(dx, dy), want = Math.min(rangeOf(def), D), pr = (o.r || 12) * 0.8;
    let len = 0;
    if (want > EPS) {
      const ux = dx / D, uy = dy / D;
      for (let k = 1; ; k++) {
        const d = Math.min(k * STEP, want);
        if (!G.World.isFree(o.x + ux * d, o.y + uy * d, pr, true)) break;
        len = d;
        if (d >= want - EPS) break;
      }
      const p = { x: o.x + ux * len, y: o.y + uy * len, r: o.r || 12 };
      G.World.collide(p);     // a legal final spot, not inside a wall or a solid prop
      return p;
    }
    return { x: o.x, y: o.y };
  }
  /** The owner's final move speed without the root, which would read as 0 (P6): player.js unrootedSpd; an owner without it reads spd. */
  const speedOf = o => (o.unrootedSpd != null ? o.unrootedSpd : o.spd) || 0;
  function setupReposition(inst) {
    const d = inst.spec.delivery, o = inst.cast.owner, p = repoPoint(o, inst.spec, inst.cast.target || o), iv = (inst.spec.casterState || {}).iframes || 0;
    inst.ox = o.x; inst.oy = o.y; inst.tx = p.x; inst.ty = p.y; inst.heading = Math.atan2(p.y - o.y, p.x - o.x);
    if (d.repositionMode === 'teleport') {
      o.x = p.x; o.y = p.y; inst.x = inst.prevX = p.x; inst.y = inst.prevY = p.y;
      if (iv) o.invuln = Math.max(o.invuln || 0, iv);     // once, from the cast
      return;
    }
    inst.dash = true; inst.phase = 'out'; inst.armed = false; inst.px = o.x; inst.py = o.y;
    inst.v = (d.dashMult || 1) * speedOf(o);
    if (iv) o.invuln = Math.max(o.invuln || 0, iv);
  }
  /** Cast gate for repositions: a dash never overlaps a live dash of the same owner (both would write its position), a swept
   *  dash at speed 0 would never arrive, and a rooted commitment holds every reposition, teleport included (Jess 2026-10-29,
   *  MOVE-INTENT quick-attack). Each way the slot retries, so the cooldown counts from when the move can start. */
  const repoCanGo = (def, o) => def.delivery.motion !== 'repositions' || (!insts.some(i => i.dash && i.cast.owner === o) &&
    !cms.some(m => m.o === o && m.part === 'movement' && m.type === 'rooted') &&
    (def.delivery.repositionMode !== 'swept' || speedOf(o) * (def.delivery.dashMult || 1) > EPS));

  function castSlot(o, slot, def, now) {
    if (G.Status.stunned(o)) { slot.t = RETRY; return null; }       // a stunned owner casts nothing; the move stays ready
    const gate = AIM[def.delivery.targeting] ? AIM[def.delivery.targeting](o, def) : null;
    if (!gate) { slot.t = RETRY; return null; }                       // cast gate: retry every 0.05 s
    if (!G.MoveEffects.canCast(def, o)) { slot.t = RETRY; return null; }     // P3: the cost would kill, or a shield is live; cooldown not spent
    if (!repoCanGo(def, o)) { slot.t = RETRY; return null; }         // 4c-2: no dash over a live dash, no dash at speed 0
    const buff = G.MoveEffects.isPureBuff(def);                       // SS8 (slice 5a): a pure buff has no cooldown; its trackers decide when it casts
    slot.t = buff ? 0 : Math.max(0.05, def.cd * (o.cdMul || 1));      // D3
    if (G.Status.fizzle(o, rng)) { if (buff) slot.t = G.Stages.gateOf(false, o.teamCards ? G.TeamCards.gateMul(o) : 1); return null; }     // fizzle spends the cooldown; a pure buff waits one Gate (SS8)
    const pick = settle(o, gate);                                     // 4c-3: the location roll, only for a real cast
    const cast = { owner: o, slot, moveId: def.id, time: now, x: o.x, y: o.y, aim: pick.aim, target: pick.target, point: pick.point, serial: ++castSerial };
    const self = G.MoveEffects.applyCast(def, cast, rng);             // recoil, shield, self stats, heal over time, setWeather (4b)
    const roots = [];
    if (def.space) {
      const n = Math.max(1, def.space.count || 1);
      if (capped(def)) capSlot(o, slot, def, n);     // 4d (H6)
      for (let i = 0; i < n; i++) roots.push(spawnInstance(def, cast, fanAngle(pick.aim, i, n, def.space.spread || 0), i));
    } else if (emitting(def)) roots.push(spawnInstance(def, cast, pick.aim, 0));     // 4d (H4): a shapeless emitter (Gust, Discharge) is still its own instance
    commit(o, slot, def, roots, self.shield);
    G.SimBus.emit('move:cast', { moveId: def.id, ownerId: o.id != null ? o.id : null, x: o.x, y: o.y, aim: pick.aim });
    return cast;
  }

  // ---- caster-state commitments (slice 4b, S13) ----
  const lifeOf = def => { const c = (def.delivery.endOn || []).find(c => c.time != null); return c ? c.time : 0; };
  function commit(o, slot, def, roots, shield) {
    const cs = def.casterState && def.casterState.commitment;
    if (!cs) return;
    const src = G.MoveEffects.srcOf(def, o);
    for (const part of ['cooldown', 'movement']) {
      const c = cs[part];
      if (!c) continue;
      const old = cms.findIndex(m => m.src === src && m.part === part);     // a recast replaces this caster's own commitment
      if (old >= 0) cms.splice(old, 1);
      const m = { o, slot, def, src, part, type: c.type, ids: c.id == null ? null : new Set([].concat(c.id)), left: Infinity, insts: null, shield: null };
      if (c.t == null) { if (roots.length) m.insts = roots; else m.left = lifeOf(def); }     // default: the parent's lifetime
      else if (c.t === 'untilEffectEnd') m.shield = shield;
      else m.left = c.t;
      cms.push(m);
      if (part === 'movement' && c.type === 'slowed') {     // a quiet stage that ends by itself, and is dropped early by release()
        const dur = isFinite(m.left) ? m.left : m.shield ? m.shield.t : lifeOf(def);
        G.Stages.add(o, 'spe', -2, dur, G.Stages.MAX, src, 1, true);
      }
    }
    rootOf(o);
  }
  function over(m) {
    if (m.o.dead || m.left <= EPS) return true;
    if (m.insts) return m.insts.every(i => i.done);
    if (m.left === Infinity) return !m.shield || m.o.shield !== m.shield;     // untilEffectEnd: expired, broken, swap or faint
    return false;
  }
  function release(m) {
    if (m.part === 'cooldown' && (!m.ids || m.ids.has(m.def.id))) m.slot.t = Math.max(0.05, m.def.cd * (m.o.cdMul || 1));     // armed from now
    if (m.part === 'movement' && m.type === 'slowed') G.Stages.drop(m.o, m.src);
  }
  // one flag, two sources rebuilt together: a rooted commitment (4b) or a live swept dash (4c-2), so neither ends the other early
  const rootOf = o => { o.mvRoot = cms.some(m => m.o === o && m.part === 'movement' && m.type === 'rooted') || insts.some(i => i.dash && i.cast.owner === o); };
  function upkeepCommits(dt, o) {
    if (!cms.length) return;
    for (const m of cms) if (m.o === o) m.left -= dt;
    const done = cms.filter(m => m.o === o && over(m));
    if (!done.length) return;
    cms = cms.filter(m => !done.includes(m));
    done.forEach(release);
    rootOf(o);
  }
  const frozen = (o, id) => cms.some(m => m.o === o && m.part === 'cooldown' && (!m.ids || m.ids.has(id)));

  // ---- persistent upkeep (slice 4c-1, R7, combat-architecture:H25): the slot, not endOn, owns a persistent move's life ----
  // A routed persistent slot keeps one live group (the count shapes of one spawn) while it is in the active group and the owner is
  // not stunned. Leaving the active group or a stun ends the group (reason notActive), a faint ends it (ownerDeath), and a group that
  // ended by its own endOn (a pulse's time, pierce) is spawned again on the next tick. No cooldown, no fizzle roll, fresh hit records.
  const groupOf = (o, slot) => insts.filter(i => i.cast.persist && i.cast.owner === o && i.cast.slot === slot);
  function endGroup(list, reason, keepHeal = false) {
    if (!list.length) return;
    for (const i of list) { i.done = reason; G.SimBus.emit('move:end', { moveId: i.spec.id, instId: i.id, reason, x: i.x, y: i.y }); }
    if (!keepHeal) for (const i of list) G.MoveEffects.endHeal(i.cast.owner, G.MoveEffects.srcOf(i.spec, i.cast.owner));     // slice 5a: an aura's heal ends with its group (5b: not on a card restart)
    insts = insts.filter(i => !list.includes(i));
  }
  /** `carry` (slice 5b, a card restart): { phase } puts the new orbs where the old ones were; the cast event says restart, so the render
   *  plays no cast (no animation, sound or Life Orb cost). */
  function spawnPersistent(o, slot, def, now, carry = null) {
    const gate = AIM[def.delivery.targeting] ? AIM[def.delivery.targeting](o, def) : null;
    if (!gate || !G.MoveEffects.canCast(def, o)) return null;     // the gate holds; the upkeep tries again next tick
    const pick = settle(o, gate);
    const cast = { owner: o, slot, moveId: def.id, time: now, x: o.x, y: o.y, aim: pick.aim, target: pick.target, point: pick.point, serial: ++castSerial, persist: true };
    slot.persistDef = def;     // 5b: the def this group was spawned from, so a card pick that changes it respawns the group
    const self = G.MoveEffects.applyCast(def, cast, rng), roots = [], n = def.space ? Math.max(1, def.space.count || 1) : 1;     // 4d: a shapeless emitter is one instance
    for (let i = 0; i < n; i++) roots.push(spawnInstance(def, cast, fanAngle(pick.aim, i, n, (def.space && def.space.spread) || 0), i));
    if (carry && carry.phase != null) for (const r of roots) r.phase = carry.phase;
    commit(o, slot, def, roots, self.shield);
    G.SimBus.emit('move:cast', { moveId: def.id, ownerId: o.id != null ? o.id : null, x: o.x, y: o.y, aim: pick.aim, restart: !!carry });
    return cast;
  }
  function upkeepPersistent(o, now) {
    const act = o.activeGroup(), stunned = G.Status.stunned(o);
    for (const g of o.slots) for (const slot of g) {
      const def = defOf(o, slot.id);
      if (!def || !def.persistent || ((!def.space && !emitting(def)) && !selfHealOnly(def)) || !routed(slot.id)) continue;     // 4d: a shapeless persistent emitter (Toxic, Flame Wheel) counts; 5a: so does a self heal aura (Aqua Ring)
      const mine = groupOf(o, slot);
      if (o.dead) endGroup(mine, 'ownerDeath');
      else if (stunned || !act.includes(slot)) endGroup(mine, 'notActive');
      else if (!mine.length) spawnPersistent(o, slot, def, now);
      else if (slot.persistDef && slot.persistDef !== def) {     // 5b: a card changed this move's numbers: the live group restarts on the new def
        // Jess 2026-10-31: the heal keeps its clock (only its amount updates), the orbs keep their angle, and no cast plays.
        const lead = mine.find(i => i.fan === 0 && i.spec.delivery.motion === 'orbits');
        const phase = lead ? (lead.phase || 0) + lead.spec.delivery.angularSpeed * lead.age : null;
        endGroup(mine, 'notActive', true);
        if (!spawnPersistent(o, slot, def, now, { phase })) G.MoveEffects.endHeal(o, G.MoveEffects.srcOf(def, o));     // the gate held: no group, so no heal
      }
    }
    // A group whose slot is no longer in the owner's slots (a slot list rebuilt or a move removed) has no slot left to end it, so it
    // ends here: notActive, or ownerDeath on a faint. Moving the same slot objects around (arrange, fuse) keeps their groups.
    const orphans = insts.filter(i => i.cast.persist && i.cast.owner === o && !o.slots.some(g => g.includes(i.cast.slot)));
    if (orphans.length) endGroup(orphans, o.dead ? 'ownerDeath' : 'notActive');
  }

  function tick(dt, o, now) {
    if (o.dead) { upkeepPersistent(o, now); endOwner(o); }     // a faint ends its persistent groups, then the caster's commitments, heal over time and shield
    else {
      upkeepCommits(dt, o);
      G.MoveEffects.upkeep(dt, o);
      const act = o.activeGroup();
      // S13: a frozen timer does not run and does not cast. The active group goes first and its hold is decided before its casts (a
      // bonded group fires together); the inactive slots run after it, so a freeze cast this frame already holds them.
      // SS8 (slice 5a): a pure buff casts only here, in the active group, when one of its trackers is missing or its Gate is open, so a
      // swapped-in buff with a Gate running waits for it. slot.t is only its fizzle or retry wait.
      const hold = cms.length ? new Set(act.filter(sl => frozen(o, sl.id))) : null;
      for (const slot of act) {
        const def = defOf(o, slot.id);
        if (!def || !routed(slot.id) || def.persistent) continue;       // persistent slots belong to upkeepPersistent (slice 4c-1)
        if (hold && hold.has(slot)) continue;
        if (G.MoveEffects.isPureBuff(def)) {
          if (slot.t > EPS) { slot.t -= dt; if (slot.t > EPS) continue; }
          if (G.MoveEffects.statReady(def, o)) castSlot(o, slot, def, now);
          continue;
        }
        if (def.cd == null) continue;
        slot.t -= dt;
        if (slot.t <= EPS) castSlot(o, slot, def, now);
      }
      for (const g of o.slots) if (g !== act) for (const slot of g) {     // inactive slots recharge too
        const def = defOf(o, slot.id);
        if (!def || !routed(slot.id) || def.persistent || (def.cd == null && !G.MoveEffects.isPureBuff(def)) || frozen(o, slot.id)) continue;
        if (slot.t > 0) slot.t = Math.max(0, slot.t - dt);
      }
      upkeepPersistent(o, now);     // slice 4c-1 (R7): after the casts, so a new group acts this frame like any root
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
  /** 4c-3 aimTrack target (MOVE-INTENT flamethrower): sticky on the cast target while it lives within the cast gate's reach, then the
   *  nearest within that reach, re-picked whenever lost (a static cone has no fly-straight fallback, unlike D23 steering). */
  function trackTarget(inst) {
    const o = inst.cast.owner, R = rangeOf(inst.spec), reach = reachOf(inst.spec, o), lim = e => Math.min(R, reach + e.r);
    const t = inst.track;
    if (live(t) && Math.hypot(t.x - o.x, t.y - o.y) <= lim(t) + EPS) return t;
    inst.track = nearest(o.x, o.y, R, lim);
    return inst.track;
  }
  const MOTION = {
    static(inst, dt) {
      follow(inst);     // R8 first, then the turn, then collision at the new heading
      const rate = inst.spec.delivery.aimTrack;
      if (!rate || inst.spec.delivery.anchor !== 'caster') return;
      const t = trackTarget(inst);
      if (!t) return;     // nothing in reach: the heading holds
      const want = wrap(Math.atan2(t.y - inst.y, t.x - inst.x) - inst.heading), cap = rate * dt;
      inst.heading = wrap(inst.heading + (want > cap ? cap : want < -cap ? -cap : want));     // the turnRate clamp and wrap (Q13)
    },
    falls() { },     // R8: a world shape that never moves by itself; the drop is render-only and moveSpeed is ignored (4c-3)
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
      inst.vx = Math.cos(inst.heading) * v; inst.vy = Math.sin(inst.heading) * v;     // knockback `direction: travel` (D33)
      let off = 0;     // D24: exact positional offset across the current heading, independent of dt
      if (p.oscillate) off = p.oscillate.amplitude * Math.sin(TAU * p.oscillate.frequency * inst.age);
      inst.x = inst.bx - Math.sin(inst.heading) * off;
      inst.y = inst.by + Math.cos(inst.heading) * off;
    },
    orbits(inst) {     // D25 (slice 4c-1): shape i at angularSpeed x age + 2 pi i / count (+ the carried phase after a 5b card restart), orbitRadius x lens (D36) from the owner (R8), a true circle (H15)
      const d = inst.spec.delivery, o = inst.cast.owner, n = Math.max(1, inst.spec.space.count || 1), r = d.orbitRadius * lensOf(o);
      const a = (inst.phase || 0) + d.angularSpeed * inst.age + (TAU * inst.fan) / n;
      inst.x = o.x + Math.cos(a) * r; inst.y = o.y + Math.sin(a) * r; inst.heading = wrap(a + Math.PI / 2);
    },
    returns(inst, dt) {     // D26 (slice 4c-2): out to range from the cast origin, then home on the owner's current position
      const d = inst.spec.delivery, v = d.moveSpeed || 0, o = inst.cast.owner;
      if (inst.turn) { inst.turn = false; newLeg(inst, d.returnHits === 'outAndBack'); }     // leg 1 starts the step after the turnaround
      if (inst.leg === 0) {
        const R = rangeOf(inst.spec), s = Math.min(v * dt, Math.max(0, R - inst.dist));
        inst.bx += Math.cos(inst.heading) * s; inst.by += Math.sin(inst.heading) * s; inst.dist += s;
        inst.vx = Math.cos(inst.heading) * v; inst.vy = Math.sin(inst.heading) * v;
        if (inst.dist >= R - EPS) inst.turn = true;     // the turnaround is this step, never more than one step past range
      } else {
        const dx = o.x - inst.bx, dy = o.y - inst.by, D = Math.hypot(dx, dy), s = Math.min(v * dt, D);
        if (D > EPS) { inst.bx += dx / D * s; inst.by += dy / D * s; inst.heading = Math.atan2(dy, dx); inst.vx = dx / D * v; inst.vy = dy / D * v; }
        inst.dist += s;
        const own = (inst.spec.space.radRadius || 0) * lensOf(o);
        if (Math.hypot(o.x - inst.bx, o.y - inst.by) <= (o.r || 0) + own + EPS) inst.returned = true;
      }
      inst.x = inst.bx; inst.y = inst.by;
    },
    repositions(inst, dt) {     // D27 (slice 4c-2): teleport rides the owner; swept carries it to the point and back
      const d = inst.spec.delivery, o = inst.cast.owner;
      if (!inst.dash) { follow(inst); return; }
      if (inst.legUp) { inst.legUp = false; newLeg(inst, false); }
      inst.armed = false;
      if (inst.phase === 'out' || inst.phase === 'back') {
        const out = inst.phase === 'out', tx = out ? inst.tx : inst.ox, ty = out ? inst.ty : inst.oy;
        const dx = tx - inst.px, dy = ty - inst.py, rem = Math.hypot(dx, dy), s = inst.v * dt;
        if (rem > EPS) inst.heading = Math.atan2(dy, dx);
        if (rem <= s + EPS) {
          inst.px = tx; inst.py = ty;     // snap: the point, or the exact origin
          if (out) { inst.armed = true; inst.phase = d.returnToOrigin ? 'back' : 'done'; inst.legUp = true; }     // R1: the one armed step at B
          else { inst.phase = 'done'; inst.returned = true; inst.armed = d.returnHits === 'outAndBack'; }
        } else { inst.px += dx / rem * s; inst.py += dy / rem * s; }
      }
      o.x = inst.px; o.y = inst.py; inst.x = o.x; inst.y = o.y;
      if (inst.armed) { inst.prevX = inst.x; inst.prevY = inst.y; }     // the arrival hit is a circle at the point, not a sweep of the last step
      const iv = (inst.spec.casterState || {}).iframes || 0;
      if (iv) o.invuln = Math.max(o.invuln || 0, iv);     // P8: the whole dash, the last raise leaves the tail; never lowered
    }
  };
  /** R2, H22: a new leg has its own once-per-instance memory and a fresh pierce budget. `armed` says whether it may hit at all. */
  function newLeg(inst, armed) { inst.leg++; inst.struck = 0; inst.armed = armed; }

  // ---- eligibility table, keyed by hitPolicy (I3): the only place hit timing is decided ----
  const ELIGIBLE = {
    oncePerInstance: rec => !rec,
    interval: (rec, inst) => !rec || inst.age - rec.t >= inst.spec.rehit - EPS
  };

  function collide(inst, maxR) {
    if (inst.armed === false || inst.hitless || !inst.shape) return;     // 4c-2: a disarmed hitbox tests nothing; 4d: nor does a pure emitter
    const s = inst.shape, b = G.MoveGeom.boundsOf(s, inst.prevX, inst.prevY, maxR), cands = [];
    G.EnemyMgr.queryCircleEach(b.x, b.y, b.r, e => { if (G.MoveGeom.contains(s, inst.prevX, inst.prevY, e.x, e.y, e.r)) cands.push(e); });
    // destructible props join the same sweep (slice 3d, D2): solid ones spend pierce like an enemy, grass never does
    const pb = G.MoveGeom.boundsOf(s, inst.prevX, inst.prevY, PROP_R);
    for (const p of G.World.propsInCircle(pb.x, pb.y, pb.r)) if (G.MoveGeom.contains(s, inst.prevX, inst.prevY, p.x, p.y, p.r)) cands.push(p);
    // sweep order: nearest to the previous position first, ties by id (S8) with enemies before props, so a pierce budget is spent in path order
    cands.sort((a, c) => ((a.x - inst.prevX) ** 2 + (a.y - inst.prevY) ** 2) - ((c.x - inst.prevX) ** 2 + (c.y - inst.prevY) ** 2) ||
      isProp(a) - isProp(c) || (a.id < c.id ? -1 : a.id > c.id ? 1 : 0));
    const elig = ELIGIBLE[inst.spec.hitPolicy || 'oncePerInstance'], go = [];
    for (const e of cands) {     // I4: every eligibility decision before any payload runs
      const key = isProp(e) ? e : e.id, had = inst.hits.get(key), rec = had && had.leg === inst.leg ? had : null;     // a prop is keyed by itself; a record from an earlier leg counts as absent (R2)
      if (!elig(rec, inst)) continue;
      if (!rec) {
        if (inst.struck > inst.pierce) continue;
        if (!isProp(e) || e.solid) inst.struck++;     // D16: pierce n damages n + 1 distinct enemies (or solid props)
      }
      inst.hits.set(key, { t: inst.age, leg: inst.leg });
      go.push(e);
    }
    const struck = [];
    for (const e of go) {
      if (isProp(e)) { if (e.hp > 0) G.MoveEffects.applyProp(inst, e); continue; }     // props emit no 'move:hit' (enemy-only event)
      if (e.dead) continue;
      const r = G.MoveEffects.applyHit(inst, e, 0, rng);     // always a result: a riders-only hit still counts (4a, P4)
      G.SimBus.emit('move:hit', { moveId: inst.spec.id, instId: inst.id, enemyId: e.id, dmg: r.dmg, crit: r.crit, typeMult: r.typeMult, x: e.x, y: e.y, hop: 0 });
      struck.push(e);
      if (inst.emits) for (const st of inst.emits) if (st.fx.trigger === 'enemyHit' && capOk(st) && emitOne(inst, st, e, inst.heading, e)) st.done++;     // 4d (D29): once per hit event
    }
    if (struck.length && inst.spec.delivery.trigger === 'contact') inst.fired = true;     // 4d: a mine goes off once, on the step an enemy touches it
    if (struck.length && inst.spec.space.chainHops && !inst.chained) {     // S9: the cast target starts the chain when it was struck, else the first enemy hit
      inst.chained = true;
      chain(inst, struck.includes(inst.cast.target) ? inst.cast.target : struck[0]);
    }
  }

  /** D15, S15: the next hop from prev, never prev itself; an enemy this chain has not hit yet first, else the nearest revisit. */
  function hopFrom(prev, R, seen) {
    let fresh = null, fd = Infinity, again = null, ad = Infinity;
    G.EnemyMgr.queryCircleEach(prev.x, prev.y, R, e => {
      if (e === prev || e.dead || e.remote) return;
      const d = Math.hypot(e.x - prev.x, e.y - prev.y);
      if (d > R + EPS) return;
      const better = (bd, b) => d < bd - EPS || (Math.abs(d - bd) <= EPS && e.id < b.id);
      if (!seen.has(e)) { if (better(fd, fresh)) { fresh = e; fd = d; } }
      else if (better(ad, again)) { again = e; ad = d; }
    });
    return fresh || again;
  }
  function chain(inst, origin) {
    const sp = inst.spec.space, seen = new Set([origin]);
    let prev = origin;
    for (let k = 1; k <= sp.chainHops; k++) {     // bounded by chainHops, so no chain can run away
      const next = hopFrom(prev, sp.hopRange, seen);
      if (!next) return;
      const r = G.MoveEffects.applyHit(inst, next, k, rng);
      G.SimBus.emit('move:hit', { moveId: inst.spec.id, instId: inst.id, enemyId: next.id, dmg: r.dmg, crit: r.crit, typeMult: r.typeMult,
        x: next.x, y: next.y, hop: k, fromX: prev.x, fromY: prev.y });
      seen.add(next);
      prev = next;
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
    ownerDeath: inst => !!inst.cast.owner.dead && 'ownerDeath',
    notActive: inst => { const o = inst.cast.owner; return !!o.activeGroup && !o.activeGroup().includes(inst.cast.slot) && 'notActive'; },     // 4d: Spikes leaves with its slot
    returned: inst => !!inst.returned && 'returned'     // 4c-2: returns home (D26) or a swept dash back at its origin (D27)
  };
  const OWNED = { returns: true, repositions: true };     // motions that ride or chase the owner (4c-2)
  function checkEnd(inst) {
    const owned = OWNED[inst.spec.delivery.motion];
    if (owned && inst.cast.owner.dead) return 'ownerDeath';     // a faint ends a bone or a dash, listed or not
    if (inst.dash && inst.phase === 'done' && !inst.spec.delivery.returnToOrigin) return 'arrived';     // a one-way dash ends after its armed step at B, listed or not
    if (inst.fired) return 'triggered';     // 4d: a contact mine is gone once it has gone off
    for (const c of inst.spec.delivery.endOn || []) for (const k in c) {
      const r = END[k] && END[k](inst, c[k]);
      if (r) return r;
    }
    if (owned) return null;     // R1, H22: pierce exhaustion only disarms (the per-leg budget); returned or time ends it
    return inst.struck > inst.pierce ? 'pierce' : null;
  }
  /** 4c-3 (D28): while waiting no endOn is evaluated; only a faint ends it, where it would end the active instance too. */
  function waitEnd(inst) {
    if (!inst.cast.owner.dead) return null;
    return OWNED[inst.spec.delivery.motion] || (inst.spec.delivery.endOn || []).some(c => c.ownerDeath) ? 'ownerDeath' : null;
  }

  function step(dt, now) {
    if (!insts.length) return;
    let maxR = 0;
    for (const e of G.EnemyMgr.all()) if (live(e) && e.r > maxR) maxR = e.r;     // boundsOf needs it for linear shapes
    for (const inst of insts) {     // motion (age first, so collisions see the new age)
      inst.idle = inst.wait > EPS;     // 4c-3 (D28): a waiting step does nothing but count the wait down
      if (inst.idle) {
        inst.wait -= dt;
        if (inst.wait <= EPS) inst.wait = 0;
      } else {
        if (inst.age === 0 && inst.spec.delivery.delay) G.SimBus.emit('move:land', { moveId: inst.spec.id, instId: inst.id, x: inst.x, y: inst.y });     // its first live step
        inst.prevX = inst.x; inst.prevY = inst.y;
        inst.age += dt;
        MOTION[inst.spec.delivery.motion](inst, dt);
      }
      inst.shape = inst.spec.space ? G.MoveGeom.shapeOf(inst.spec.space, inst.spec.delivery.grow || null,     // growth (D21) and the lens live in shapeOf
        { x: inst.x, y: inst.y, heading: inst.heading, age: inst.age, dist: inst.dist, lens: lensOf(inst.cast.owner) }) : null;     // 4d: a shapeless emitter has none
    }
    for (const inst of insts) if (!inst.idle && inst.emits) runEmits(inst, dt);     // 4d: emissions after motion, so a child starts where its carrier is now
    for (const inst of insts) if (!inst.idle) collide(inst, maxR);
    const unroot = new Set();
    for (const inst of insts) {
      inst.done = inst.idle ? waitEnd(inst) : checkEnd(inst);
      if (inst.done) G.SimBus.emit('move:end', { moveId: inst.spec.id, instId: inst.id, reason: inst.done, x: inst.x, y: inst.y });
      if (inst.done && inst.emits && BURST[inst.done]) burst(inst);     // 4d: termination bursts on a natural end
      if (inst.done && inst.dash) unroot.add(inst.cast.owner);
    }
    insts = insts.filter(i => !i.done);
    if (pending.length) { insts.push(...pending); pending = []; }     // R6: children join at the end of the step and act from the next one
    for (const o of unroot) rootOf(o);     // 4c-2: the dash root ends with the dash; a live rooted commitment keeps the flag
  }

  /** Swap-out or faint (S1, S13): end the owner's commitments (a frozen casting slot is armed now), heal over time and shield. */
  function endOwner(o) {
    const mine = cms.filter(m => m.o === o);
    if (mine.length) { cms = cms.filter(m => m.o !== o); mine.forEach(release); }
    o.mvRoot = false;
    G.MoveEffects.endSelf(o);
  }
  function clear(o) {
    if (o) { insts = insts.filter(i => i.cast.owner !== o); endOwner(o); }
    else { for (const i of insts) if (i.dash) i.cast.owner.mvRoot = false; insts = []; pending = []; cms = []; G.MoveEffects.endSelf(null); }     // run start or back to the menu
  }

  return {
    tick, step, clear,
    setRng: fn => { rng = fn || Math.random; },
    setView: v => { view = v || null; },
    setFilter: fn => { routed = fn || (() => true); },     // slice 3d: the game passes its routed-id check; a rejected slot is never touched
    list: () => insts,
    persisted: o => [...new Set(insts.filter(i => i.cast.persist && (!o || i.cast.owner === o)).map(i => i.cast))]     // dev overlay and harness (plain data)
      .map(c => ({ moveId: c.moveId, shapes: insts.filter(i => i.cast === c).length })),
    commits: o => cms.filter(m => !o || m.o === o).map(m => ({ moveId: m.def.id, part: m.part, type: m.type, left: m.left,
      until: m.insts ? 'instance' : m.shield ? 'effect' : 'time' }))     // dev overlay and harness (plain data)
  };
})();
