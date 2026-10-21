/* ============ combat.js — move execution and collisions ============
 * Only the player's ACTIVE move is executed. Each `kind` has its
 * implementation here. All attacks also damage the destructible objects
 * in the scene (rocks, chests, tall grass).
 *
 * Everything happens on the ground plane: (x, y) are feet / shadow.
 *
 * Co-op: each computer executes the attacks of ITS player. Teammates'
 * attacks arrive over the network and are replayed as a "ghost" (ghostCast): they
 * look the same, but do no damage here (their owner already did it).
 *
 * What stays on the map for a while (mines, falling meteors, turrets,
 * trail puddles) lives in `fields` and is updated/drawn here.
 */
G.Combat = (() => {
  let ghost = false;
  let fields = [];

  // ---------------- execute the active move ----------------

  function tick(dt, pl, now) {
    if (pl.dead) return;
    // Every slotted move runs its own cooldown, active or not (swap rule, DECISIONS 2026-10-18).
    // Only the active group fires. A move that finishes recharging while inactive waits, ready,
    // and fires the moment its slot becomes active. swapT only limits how soon you can swap AGAIN.
    if (pl.swapT > 0) pl.swapT = Math.max(0, pl.swapT - dt);
    const act = pl.activeGroup();
    for (const g of pl.slots) {
      if (g === act) continue;
      for (const m of g) if (m.t > 0) m.t = Math.max(0, m.t - dt);
    }
    for (const m of act) tickMove(dt, pl, m, now);
  }

  function tickMove(dt, pl, m, now) {
    // Frozen or asleep (slice E2d, Jess 2026-10-20): the orbs are DROPPED (they hit and roll ailments every tick, so they cannot stay up);
    // they spin up again the moment the stun ends (orbit() respawns whatever is missing).
    if (m.kind === 'orbit') { if (G.Status.stunned(pl)) G.Projectiles.clearOrbs(pl); else orbit(pl, m, dt, now); return; }

    m.t -= dt;
    if (m.t > 0) return;
    // Frozen or asleep (G.Status): nothing casts until it wears off; the move stays ready.
    if (G.Status.stunned(pl)) { m.t = 0.05; return; }
    // Attacks that need a target wait to have one (do not waste the animation on the air).
    if (needsTarget(m) && !(pl.target && G.U.dist(pl.x, pl.y, pl.target.x, pl.target.y) <= reach(m, pl) + meleeExtra(pl, m, pl.target))) {
      m.t = 0.05;
      return;
    }
    m.t = Math.max(0.05, m.cd * pl.cdMul);
    if (G.Status.fizzle(pl)) return;          // paralysis / confusion: the cast fails and the cooldown is still spent
    pl.cast(m);
    if (G.Coop.active) G.Coop.cast(pl, m);
    // Link: its icon flashes in the HUD when cast (one that explodes stuck to the
    // enemy, like Ember after Quick Attack, is barely visible).
    m.castAt = performance.now();

    run(pl, m);
  }

  function run(pl, m) {
    // Wide Lens / Zoom Lens (F3b): scale this holder's move radius + arc for the cast, on a shallow copy so the
    // shared move instance (and its derive()d base) is never mutated. radius=0.5..1.15, arc clamped to 2*PI.
    const rm = pl.moveRadiusMul || 1;
    if (rm !== 1) {
      m = Object.assign({}, m, {
        radius: m.radius != null ? m.radius * rm : m.radius,
        arc: m.arc != null ? Math.min(m.arc * rm, 6.2832) : m.arc
      });
    }
    switch (m.kind) {
      case 'projectile': fireProjectiles(pl, m); break;
      case 'melee':      melee(pl, m); break;
      case 'beam':       beam(pl, m); break;
      case 'nova':       nova(pl, m); break;
      case 'aura':       aura(pl, m); break;
      case 'buff':       buff(pl, m); break;
      case 'boomerang':  boomerang(pl, m); break;
      case 'chain':      chain(pl, m); break;
      case 'mine':       mines(pl, m); break;
      case 'meteor':     meteors(pl, m); break;
      case 'turret':     turret(pl, m); break;
      case 'dash':       dash(pl, m); break;
      case 'trail':      trailPatch(pl, m); break;
      case 'cone':       cone(pl, m); break;
    }
  }

  const TARGETED = ['melee', 'beam', 'projectile', 'boomerang', 'chain', 'meteor', 'dash', 'cone'];
  function needsTarget(m) { return TARGETED.includes(m.kind); }
  /** Melee reach on top of m.radius: the target's body (the hit circle is centre-to-centre PLUS its radius) and the player's own body at the
   *  same CONTACT.hit factor wild melee uses against you, so you can always hit what is already close enough to hit you. */
  function meleeExtra(pl, m, e) {
    return m.kind === 'melee' ? pl.r * G.Enemies.CONTACT.hit + (e ? e.r : 0) - 30 : 0;
  }
  function reach(m, pl) {
    const rm = (pl && pl.moveRadiusMul) || 1;      // Wide/Zoom Lens: targeting matches the scaled radius (F3b)
    if (m.kind === 'melee') return m.radius * rm + 30;
    if (m.kind === 'beam') return m.radius * rm + 20;
    if (m.kind === 'boomerang') return m.radius * rm + 40;
    if (m.kind === 'chain') return 280;
    if (m.kind === 'meteor') return 340;
    if (m.kind === 'dash') return m.radius * rm + 60;
    if (m.kind === 'cone') return m.speed * m.life + 30;
    return 520;
  }

  function payload(m) {
    return { burn: m.burn || 0, poison: m.poison || 0, slow: m.slow || 0, knock: m.knock || 0, mtype: m.type };
  }

  /** Roll the ailments of a hit (status rework, slice A). Chance = the move's PokeAPI ailmentChance (status moves always apply).
   *  A move rolls at most once per STATUS.rollGap seconds per target, so a multi-pellet cast, or a trail / orbit / aura tick, is ONE
   *  roll. Control ailments (paralysis, freeze, sleep, confusion, trap) are read from the move's ailment name and go through G.Status. */
  function procAilments(e, burn, poison, m) {
    const ctl = m && G.Status.isControl(m.ailment) ? m.ailment : null;     // paralysis | freeze | sleep | confusion | trap (slice C)
    const strip = !!(m && m.strip);                                       // Fire Spin (slice E1): remove every beneficial stat stage, then a short burn
    if (!burn && !poison && !ctl && !strip) return;
    const S = G.Enemies.STATUS, key = (m && (m.id || m.type)) || 'x';
    const r = e.ailRoll || (e.ailRoll = {});
    if (r[key] > 0) return;
    r[key] = S.rollGap;
    const c = !m || m.cat === 'status' ? 1 : (m.ailmentChance == null ? 100 : m.ailmentChance) / 100;
    if (c < 1 && Math.random() >= c) return;
    const mul = G.Moves.dotMul(m);     // Power over base Power: damage cards strengthen the DoT (slice B)
    if (burn) e.applyBurn(burn, false, mul);
    if (poison) e.applyPoison(poison, mul);
    if (ctl) e.applyStatus(ctl, mul);
    if (strip && !e.remote) {
      if (G.Stages.stripPositive(e)) G.FX.dmgText(e.x, e.y - (e.bodyH || 30) - 4, 'Boosts stripped', '#f0b36a');
      e.applyBurn(1, false, mul, m.burnHalf ? 0.5 : 1);
    }
  }

  /** Roll the flinch of a hit (slice D2). Chance = the move's flinch percent (PokeAPI move_meta). One roll per move per target per 0.5 s, like the
   *  ailments, so a multi-pellet cast or a tick-kind move is ONE roll. Everyone can flinch; there is no window. */
  function procFlinch(e, m) {
    const c = m && m.flinch;
    if (!(c > 0) || e.dead || e.remote || !e.applyFlinch) return;
    const key = 'f:' + (m.id || m.type || 'x'), r = e.stgRoll || (e.stgRoll = {});
    if (r[key] > 0) return;
    r[key] = G.Stages.ROLL_GAP;
    if (c < 100 && Math.random() * 100 >= c) return;
    e.applyFlinch();
  }

  /** Type chart x weather for an attack of type `type` against `e`. */
  function typeK(type, e) { return G.Types.mult(type, e.types) * G.Weather.mult(type); }

  function fireProjectiles(pl, m) {
    const col = G.U.TYPE_COLOR[m.type];
    const vis = G.VFX.forMove(m);
    const n = Math.max(1, m.count | 0);
    const spread = m.spread || 0;
    // The fan widens with the count but stops just short of a full circle, so a huge count never wraps over itself.
    const fan = Math.min(spread * n, 6.2832 * (n - 1) / n);
    for (let i = 0; i < n; i++) {
      const off = n === 1 ? 0 : (i / (n - 1) - 0.5) * fan;
      const a = pl.aim + off + G.U.rand(-0.03, 0.03);
      G.Projectiles.spawn(Object.assign({
        x: pl.x + Math.cos(a) * 3, y: pl.y + Math.sin(a) * 3,
        vx: Math.cos(a) * m.speed, vy: Math.sin(a) * m.speed,
        dmg: pl.moveFactor(m), r: m.size, life: m.life, move: m, level: pl.level, stab: pl.stabFor(m),
        pierce: m.pierce | 0, color: col, homing: m.homing || 0,
        hits: new Set(), vis, ghost, owner: pl
      }, payload(m)));
    }
    G.FX.spark(pl.x + Math.cos(pl.aim) * pl.r, pl.y - G.LIFT + Math.sin(pl.aim) * pl.r,
               col, Math.cos(pl.aim), Math.sin(pl.aim), 3);
  }

  function nova(pl, m) {
    const col = G.U.TYPE_COLOR[m.type];
    const vis = G.VFX.forMove(m);
    const n = Math.max(3, m.count | 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.2832 + G.U.rand(-0.06, 0.06);
      G.Projectiles.spawn(Object.assign({
        x: pl.x + Math.cos(a) * 3, y: pl.y + Math.sin(a) * 3,
        vx: Math.cos(a) * m.speed, vy: Math.sin(a) * m.speed,
        dmg: pl.moveFactor(m), r: m.size, life: m.life, move: m, level: pl.level, stab: pl.stabFor(m),
        pierce: m.pierce | 0, color: col, homing: m.homing || 0,
        hits: new Set(), vis, ghost, owner: pl
      }, payload(m)));
    }
    G.FX.ring(pl.x, pl.y, pl.r, pl.r * 4, col, 0.3, 3);
  }

  function inArc(px, py, x, y, aim, half) {
    const a = Math.atan2(y - py, x - px);
    return Math.abs(((a - aim + Math.PI * 3) % 6.2832) - Math.PI) <= half;
  }

  function melee(pl, m) {
    const col = G.U.TYPE_COLOR[m.type];
    const half = Math.min(m.arc, 6.2832) / 2;
    G.FX.slash(pl.x, pl.y - G.LIFT * 0.5, pl.aim, m.radius, m.arc, col, G.VFX.forMove(m));
    if (ghost) return;

    for (const e of G.EnemyMgr.queryCircle(pl.x, pl.y, m.radius + pl.r * G.Enemies.CONTACT.hit)) {     // + the player's body: matches the reach wild melee has on you
      if (!inArc(pl.x, pl.y, e.x, e.y, pl.aim, half)) continue;
      hit(pl, e, pl.moveFactor(m), col, e.x - pl.x, e.y - pl.y, m.knock || 0, m);
    }
    for (const p of G.World.propsInCircle(pl.x, pl.y, m.radius)) {
      if (inArc(pl.x, pl.y, p.x, p.y, pl.aim, half)) G.World.damageProp(p, G.Stats.applyDamageProp(pl.moveFactor(m)), col);
    }
  }

  function beam(pl, m) {
    const col = G.U.TYPE_COLOR[m.type];
    const w = m.width;
    const ca = Math.cos(pl.aim), sa = Math.sin(pl.aim);

    // The beam is cut off at the first wall.
    let len = m.radius;
    for (let d = 8; d < m.radius; d += 8) {
      if (G.World.isWall(pl.x + ca * d, pl.y + sa * d)) { len = d; break; }
    }
    G.FX.beam(pl.x, pl.y - G.LIFT, pl.aim, len, w, col, G.VFX.forMove(m));
    if (ghost) return;
    G.Camera.kick(0.08);

    const mx = pl.x + ca * len / 2, my = pl.y + sa * len / 2;
    const onBeam = (x, y, r) => {
      const px = x - pl.x, py = y - pl.y;
      const along = px * ca + py * sa;
      if (along < -r || along > len + r) return false;
      return Math.abs(-px * sa + py * ca) <= w / 2 + r;
    };
    for (const e of G.EnemyMgr.queryCircle(mx, my, len / 2 + w)) {
      if (onBeam(e.x, e.y, e.r)) hit(pl, e, pl.moveFactor(m), col, ca, sa, 0, m);
    }
    for (const p of G.World.propsInCircle(mx, my, len / 2 + w)) {
      if (onBeam(p.x, p.y, p.r)) G.World.damageProp(p, G.Stats.applyDamageProp(pl.moveFactor(m)), col);
    }
  }

  function aura(pl, m) {
    const col = G.U.TYPE_COLOR[m.type];
    G.FX.ring(pl.x, pl.y, m.radius * 0.5, m.radius, col, 0.28, 2);
    const vis = G.VFX.forMove(m);
    if (vis.aura) {
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * 6.2832, r = m.radius * G.U.rand(0.45, 1);
        const x = pl.x + Math.cos(a) * r, y = pl.y + Math.sin(a) * r * 0.8 - G.LIFT * 0.5;
        // Grass Knot pulls toward you; poison and shadows rise; the rest spin.
        const v = vis.inward ? [-Math.cos(a) * r * 2.2, -Math.sin(a) * r * 1.8]
                : vis.rise ? [G.U.rand(-10, 10), -55]
                : [-Math.sin(a) * 70, Math.cos(a) * 55];
        G.FX.sp(vis.aura, vis.pal, x, y, { vx: v[0], vy: v[1], life: 0.42,
          spin: G.VFX.spins(vis.aura) ? G.U.rand(-6, 6) : 0 });
      }
    }
    if (ghost) return;
    for (const e of G.EnemyMgr.queryCircle(pl.x, pl.y, m.radius)) {
      hit(pl, e, pl.moveFactor(m), col, e.x - pl.x, e.y - pl.y, 0, m);
    }
    for (const p of G.World.propsInCircle(pl.x, pl.y, m.radius)) G.World.damageProp(p, G.Stats.applyDamageProp(pl.moveFactor(m)), col);
  }

  /** A buff move's cast (slice E2a): one TEAM application per stat it raises (stages), or Aqua Ring's regen. Each lasts the move's own `dur`;
   *  how many overlap is set by dur / cd (cooldown is the cap), the +-6 stage clamp is the only hard limit. */
  const STAGE_STAT = { atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe' };
  function buff(pl, m) {
    if (m.stat === 'regen') pl.addTeamStage('regen', m.amount || 0, m.dur, m.id);
    else {
      const raises = [{ stat: m.stat === 'spd' ? 'spe' : m.stat, n: m.stageN || 1 }];      // the move data calls Speed 'spd' (the old player buff key)
      if (m.stage2) raises.push({ stat: m.stage2.stat, n: m.stage2.n });
      for (const r of raises) {
        if (!STAGE_STAT[r.stat]) continue;
        if (pl.addTeamStage(r.stat, r.n, m.dur, m.id)) {
          const st = G.Stages.stage(pl, r.stat);
          G.FX.dmgText(pl.x, pl.y - (pl.bodyH || 30) - 4, G.Stages.LABEL[r.stat] + (st > 0 ? ' +' : ' ') + st, G.Stages.UP);
        }
      }
    }
    const col = G.U.TYPE_COLOR[m.type];
    G.FX.ring(pl.x, pl.y, pl.r * 2.4, pl.r * 1.1, col, 0.35, 2.5);
    const vis = G.VFX.forMove(m);
    for (let i = 0; i < 3; i++) {
      G.FX.sp(vis.buff || 'arrow', vis.pal, pl.x + G.U.rand(-pl.r * 1.4, pl.r * 1.4),
              pl.y - G.U.rand(0, pl.bodyH * 0.8), { vy: -70, life: 0.6 });
    }
  }

  // ---------------- new families (2026-10-10) ----------------

  /** Boomerang: goes out toward the enemy, stops and returns to you, hitting on the way out and back. */
  function boomerang(pl, m) {
    const col = G.U.TYPE_COLOR[m.type], vis = G.VFX.forMove(m);
    const n = Math.max(1, m.count | 0), spread = m.spread || 0.5;
    const out = m.radius / m.speed;                       // segundos de ida
    for (let i = 0; i < n; i++) {
      const a = pl.aim + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread * Math.min(n, 3));
      G.Projectiles.spawn(Object.assign({
        x: pl.x, y: pl.y, vx: Math.cos(a) * m.speed, vy: Math.sin(a) * m.speed,
        dmg: pl.moveFactor(m), r: m.size, life: out * 4 + 1.5, pierce: 999, color: col,
        move: m, level: pl.level, stab: pl.stabFor(m),
        hits: new Set(), vis, ghost, owner: pl, boom: out, bsp: m.speed * 1.1
      }, payload(m)));
    }
  }

  /** Chain: hits an enemy and jumps to the nearest next ones (each jump, a bit less). */
  function chain(pl, m) {
    const col = G.U.TYPE_COLOR[m.type], vis = G.VFX.forMove(m);
    let cur = pl.target && !pl.target.dead && pl.target.hurt ? pl.target : G.Projectiles.nearest(G.EnemyMgr.all(), pl.x, pl.y, reach(m, pl));
    if (!cur) return;
    let fx = pl.x, fy = pl.y - G.LIFT, k = 1;
    const done = new Set();
    const n = Math.max(1, m.count | 0);
    for (let i = 0; i < n && cur; i++) {
      done.add(cur.id);
      const tx = cur.x, ty = cur.y - cur.bodyH * 0.5;
      G.FX.beam(fx, fy, Math.atan2(ty - fy, tx - fx), Math.hypot(tx - fx, ty - fy), 10, col, vis);
      if (!ghost) {
        // Hex: more damage to whoever already suffers a status.
        const hex = m.hex && (cur.burn > 0 || cur.poison > 0 || cur.slow > 0) ? m.hex : 1;
        hit(pl, cur, pl.moveFactor(m) * k * hex, col, tx - fx, ty - fy, 0, m);
      }
      k *= 0.85;
      fx = tx; fy = ty;
      let best = null, bd = m.radius * m.radius;
      for (const e of G.EnemyMgr.queryCircle(cur.x, cur.y, m.radius)) {
        if (done.has(e.id)) continue;
        const d = G.U.dist2(cur.x, cur.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      cur = best;
    }
    if (!ghost) G.Camera.kick(0.05);
  }

  /** Mines: they stay on the ground and burst when an enemy steps on them. */
  function mines(pl, m) {
    const col = G.U.TYPE_COLOR[m.type], vis = G.VFX.forMove(m);
    const n = Math.max(1, m.count | 0);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.2832, d = n === 1 ? 0 : G.U.rand(18, 46);
      fields.push({ kind: 'mine', owner: pl, ghost, m, col, vis, x: pl.x + Math.cos(a) * d, y: pl.y + Math.sin(a) * d * 0.8,
                    t: 0, arm: 0.35, life: m.dur || 7, r: m.radius, dmg: pl.moveFactor(m), stab: pl.stabFor(m), lvl: pl.level });
    }
    // A few at most per player: the oldest ones go away.
    const mine = fields.filter(f => f.kind === 'mine' && f.owner === pl);
    for (const f of mine.slice(0, Math.max(0, mine.length - (4 + n * 2)))) f.gone = true;
  }

  /** Meteors: they fall from the sky onto nearby enemies (the shadow shows where). */
  function meteors(pl, m) {
    const col = G.U.TYPE_COLOR[m.type], vis = G.VFX.forMove(m);
    const n = Math.max(1, m.count | 0);
    const near = G.EnemyMgr.queryCircle(pl.x, pl.y, reach(m, pl)).filter(e => !e.dead);
    G.U.shuffle ? G.U.shuffle(near) : near.sort(() => Math.random() - 0.5);
    for (let i = 0; i < n; i++) {
      const e = near[i];
      const x = e ? e.x + G.U.rand(-8, 8) : pl.x + G.U.rand(-140, 140);
      const y = e ? e.y + G.U.rand(-6, 6) : pl.y + G.U.rand(-110, 110);
      fields.push({ kind: 'meteor', owner: pl, ghost, m, col, vis, x, y, t: -i * 0.09, fall: 0.5, r: m.radius, dmg: pl.moveFactor(m), stab: pl.stabFor(m), lvl: pl.level });
    }
  }

  /** Turret: leaves something on the ground that fires on its own for a while. */
  function turret(pl, m) {
    const col = G.U.TYPE_COLOR[m.type], vis = G.VFX.forMove(m);
    const a = pl.aim + Math.PI + G.U.rand(-0.6, 0.6);
    fields.push({ kind: 'turret', owner: pl, ghost, m, col, vis, x: pl.x + Math.cos(a) * 26, y: pl.y + Math.sin(a) * 20,
                  t: 0, life: m.dur || 6, shotT: 0.3, dmg: pl.moveFactor(m), stab: pl.stabFor(m), lvl: pl.level });
    const mine = fields.filter(f => f.kind === 'turret' && f.owner === pl && !f.gone);
    for (const f of mine.slice(0, Math.max(0, mine.length - Math.max(1, m.count | 0)))) f.gone = true;
    G.FX.ring(pl.x, pl.y, 4, 30, col, 0.3, 2);
  }

  /** Dash: you cross like a bolt toward the enemy and hit everything in the path. */
  function dash(pl, m) {
    const col = G.U.TYPE_COLOR[m.type], vis = G.VFX.forMove(m);
    const ca = Math.cos(pl.aim), sa = Math.sin(pl.aim);
    const sx = pl.x, sy = pl.y;
    let len = 0;
    for (let d = 8; d <= m.radius; d += 8) {
      if (!G.World.isFree(sx + ca * d, sy + sa * d, pl.r * 0.8, true)) break;
      len = d;
    }
    // Trail: several copies of the hit along the path.
    for (let d = 0; d <= len; d += 22) G.FX.sp(vis.proj || 'streak', vis.pal, sx + ca * d, sy + sa * d - G.LIFT * 0.6, { life: 0.22, angle: pl.aim });
    G.FX.slash(sx + ca * len, sy + sa * len - G.LIFT * 0.5, pl.aim, 34, 2.2, col, vis);
    if (ghost) return;
    pl.x = sx + ca * len; pl.y = sy + sa * len;
    G.World.collide(pl);
    pl.invuln = Math.max(pl.invuln || 0, 0.3);
    const w = m.width || 34;
    const mx = sx + ca * len / 2, my = sy + sa * len / 2;
    for (const e of G.EnemyMgr.queryCircle(mx, my, len / 2 + w)) {
      if (segDist2(sx, sy, pl.x, pl.y, e.x, e.y) <= (w / 2 + e.r) ** 2) hit(pl, e, pl.moveFactor(m), col, ca, sa, m.knock || 0, m);
    }
    for (const p of G.World.propsInCircle(mx, my, len / 2 + w)) {
      if (segDist2(sx, sy, pl.x, pl.y, p.x, p.y) <= (w / 2 + p.r) ** 2) G.World.damageProp(p, G.Stats.applyDamageProp(pl.moveFactor(m)), col);
    }
    G.Camera.kick(0.12);
  }

  /** Trail: you leave puddles that damage whatever passes over them. */
  function trailPatch(pl, m) {
    const col = G.U.TYPE_COLOR[m.type], vis = G.VFX.forMove(m);
    // When still, it does not leave a new one on top of the previous (only now and then).
    const last = pl.lastPatch;
    if (last && G.U.dist2(last.x, last.y, pl.x, pl.y) < (m.radius * 0.9) ** 2 && last.t < 1) return;
    const f = { kind: 'patch', owner: pl, ghost, m, col, vis, x: pl.x, y: pl.y, t: 0, life: m.dur || 3, r: m.radius,
                tick: 0, dmg: pl.moveFactor(m), stab: pl.stabFor(m), lvl: pl.level };
    fields.push(f);
    pl.lastPatch = f;
    const mine = fields.filter(o => o.kind === 'patch' && o.owner === pl && !o.gone);
    for (const o of mine.slice(0, Math.max(0, mine.length - 18))) o.gone = true;
  }

  /** Short fan: many quick shots that do not reach far (breath, jet...). */
  function cone(pl, m) {
    const col = G.U.TYPE_COLOR[m.type], vis = G.VFX.forMove(m);
    const n = Math.max(2, m.count | 0), arc = m.arc || 0.9;
    for (let i = 0; i < n; i++) {
      const a = pl.aim + (i / (n - 1) - 0.5) * arc + G.U.rand(-0.05, 0.05);
      const sp = m.speed * G.U.rand(0.85, 1.1);
      G.Projectiles.spawn(Object.assign({
        x: pl.x + Math.cos(a) * 4, y: pl.y + Math.sin(a) * 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        dmg: pl.moveFactor(m), r: m.size, life: m.life * G.U.rand(0.85, 1.05), pierce: m.pierce | 0, color: col,
        move: m, level: pl.level, stab: pl.stabFor(m),
        hits: new Set(), vis, ghost, owner: pl
      }, payload(m)));
    }
    G.FX.spark(pl.x + Math.cos(pl.aim) * pl.r, pl.y - G.LIFT + Math.sin(pl.aim) * pl.r, col, Math.cos(pl.aim), Math.sin(pl.aim), 5);
  }

  /** Damage from a field (mine, meteor, puddle) to everything in its circle. */
  function blast(f, r, k = 1) {
    if (f.ghost) return;
    const pl = f.owner, m = f.m;
    for (const e of G.EnemyMgr.queryCircle(f.x, f.y, r)) hit(pl, e, f.dmg * k, f.col, e.x - f.x, e.y - f.y, m.knock || 0, m);
    for (const p of G.World.propsInCircle(f.x, f.y, r)) G.World.damageProp(p, G.Stats.applyDamageProp(f.dmg * k), f.col);
  }

  function updateFields(dt) {
    for (let i = fields.length - 1; i >= 0; i--) {
      const f = fields[i];
      f.t += dt;
      if (f.gone || !f.owner || (f.life && f.t >= f.life && f.kind !== 'mine')) { fields.splice(i, 1); continue; }
      if (f.kind === 'mine') {
        const armed = f.t >= f.arm;
        const trig = armed && G.EnemyMgr.queryCircle(f.x, f.y, 14).length > 0;
        if (trig || f.t >= f.life) {
          G.FX.ring(f.x, f.y, 4, f.r, f.col, 0.3, 4);
          G.FX.burst(f.x, f.y - 6, f.col, 10, 150);
          if (G.Camera.sees(f.x, f.y, 40)) G.Audio.sfx('break');
          blast(f, f.r, trig ? 1 : 0.5);
          fields.splice(i, 1);
        }
      } else if (f.kind === 'meteor') {
        if (f.t >= f.fall) {
          G.FX.ring(f.x, f.y, 4, f.r, f.col, 0.35, 4);
          G.FX.burst(f.x, f.y - 6, f.col, 12, 170);
          if (G.Camera.sees(f.x, f.y, 40)) { G.Audio.sfx('break'); G.Camera.kick(0.12); }
          blast(f, f.r);
          fields.splice(i, 1);
        }
      } else if (f.kind === 'turret') {
        const held = G.Status.stunned(f.owner);                 // E2d: a frozen or sleeping owner's turret holds fire (its life still runs out)
        if (!held) f.shotT -= dt;
        if (!held && f.shotT <= 0) {
          const m = f.m;
          const tg = G.Projectiles.nearest(G.EnemyMgr.all(), f.x, f.y, m.range || 300);
          f.shotT = tg ? m.rate || 0.6 : 0.15;
          if (tg) {
            const a = Math.atan2(tg.y - f.y, tg.x - f.x);
            G.Projectiles.spawn(Object.assign({
              x: f.x, y: f.y, vx: Math.cos(a) * (m.speed || 300), vy: Math.sin(a) * (m.speed || 300),
              dmg: f.dmg, r: m.size || 6, life: 1.4, pierce: m.pierce | 0, color: f.col,
              move: m, level: f.lvl, stab: f.stab,
              hits: new Set(), vis: f.vis, ghost: f.ghost, owner: f.owner
            }, payload(m)));
            f.kick = 0.12;
          }
        }
        if (f.kick > 0) f.kick -= dt;
      } else if (f.kind === 'patch') {
        if (!G.Status.stunned(f.owner)) {                      // E2d: no pulses (damage or ailments) while the owner is frozen or asleep
          f.tick -= dt;
          if (f.tick <= 0) { f.tick = 0.5; blast(f, f.r); }
        }
        if (f.vis.aura && Math.random() < dt * 3 && G.Camera.sees(f.x, f.y, 20)) {
          G.FX.sp(f.vis.aura, f.vis.pal, f.x + G.U.rand(-f.r, f.r) * 0.6, f.y - 4, { vy: -40, life: 0.4 });
        }
      }
    }
  }

  /** The field parts that go on the ground (below the Pokemon). */
  function drawGroundFields(ctx) {
    const now = performance.now() / 1000;
    for (const f of fields) {
      if (!G.Camera.sees(f.x, f.y, 60)) continue;
      ctx.save();
      if (f.kind === 'patch') {
        const a = Math.min(1, (f.life - f.t) * 2, f.t * 6);
        ctx.globalAlpha = 0.32 * a;
        ctx.fillStyle = f.col;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.62, 0, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 0.5 * a;
        ctx.strokeStyle = f.col; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * 0.8, f.r * 0.5, 0, 0, 6.2832); ctx.stroke();
      } else if (f.kind === 'mine') {
        const armed = f.t >= f.arm, blink = armed && Math.sin(now * 8 + f.x) > 0.3;
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = f.col;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * 0.45, f.r * 0.28, 0, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 1;
        G.VFX.draw(ctx, f.vis.proj, f.vis.pal, f.x, f.y - 4, { scale: 1, alpha: blink ? 1 : 0.75, frame: 0 });
      } else if (f.kind === 'meteor') {
        const k = G.U.clamp(f.t / f.fall, 0, 1);
        ctx.globalAlpha = 0.2 + k * 0.3;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.3 + k * 0.7), f.r * 0.6 * (0.3 + k * 0.7), 0, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = f.col; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.6, 0, 0, 6.2832); ctx.stroke();
      } else if (f.kind === 'turret') {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(f.x, f.y, 11, 4.5, 0, 0, 6.2832); ctx.fill();
      }
      ctx.restore();
    }
  }

  /** The field parts that go above (falling meteors, turrets). */
  function drawAirFields(ctx) {
    const now = performance.now() / 1000;
    for (const f of fields) {
      if (!G.Camera.sees(f.x, f.y, 200)) continue;
      if (f.kind === 'meteor' && f.t > 0) {
        const k = G.U.clamp(f.t / f.fall, 0, 1);
        G.VFX.draw(ctx, f.vis.proj, f.vis.pal, f.x + (1 - k) * 40, f.y - (1 - k) * 170 - 6,
                   { scale: 1.5, angle: Math.atan2(170, -40), frame: Math.floor(now * 12) });
      } else if (f.kind === 'turret') {
        const fade = Math.min(1, (f.life - f.t) * 2, f.t * 5);
        const bob = Math.sin(now * 4 + f.x) * 2 - (f.kick > 0 ? 2 : 0);
        G.VFX.draw(ctx, f.vis.proj, f.vis.pal, f.x, f.y - 16 + bob, { scale: 1.5, alpha: fade, frame: Math.floor(now * 8) });
      }
    }
  }

  function clearFields(owner) { fields = owner ? fields.filter(f => f.owner !== owner) : []; }

  function orbit(pl, m, dt, now, isGhost = false) {
    const col = G.U.TYPE_COLOR[m.type];
    const want = Math.max(1, m.count | 0);
    const orad = (m.radius != null ? m.radius : 0) * (pl.moveRadiusMul || 1);     // Wide/Zoom Lens: orbit radius for this holder (F3b)
    // Each orbit move has its own orbs (there can be two in a link).
    const mine = p => p.orb && p.owner === pl && p.mid === m.id;
    const orbs = G.Projectiles.all().filter(mine);
    // If the number of orbs changes (on upgrading the move), they are spread
    // evenly from where the first one is, with no jumps.
    const relayout = orbs.length !== want;
    const base = orbs.length ? orbs[0].oa : now * m.speed;
    if (orbs.length > want) for (const p of orbs.slice(want)) G.Projectiles.remove(p);

    for (let i = orbs.length; i < want; i++) {
      G.Projectiles.spawnOrb({
        owner: pl, ghost: isGhost, mid: m.id,
        x: pl.x, y: pl.y, r: m.size, color: col, vis: G.VFX.forMove(m),
        dmg: pl.moveFactor(m), move: m, level: pl.level, stab: pl.stabFor(m),
        oa: (i / want) * 6.2832, orad: orad, ospeed: m.speed,
        rehit: Math.max(0.12, m.cd),
        knock: m.knock || 0, burn: m.burn || 0, poison: m.poison || 0, slow: m.slow || 0, mtype: m.type
      });
    }
    const live = G.Projectiles.all().filter(mine);
    live.forEach((p, i) => {
      p.dmg = pl.moveFactor(m);
      p.orad = orad;
      p.ospeed = m.speed;
      p.r = m.size;
      if (relayout) p.oa = base + (i / live.length) * 6.2832;
    });

    // A charge-up animation now and then, so it feels alive.
    pl.orbCastT = (pl.orbCastT || 0) - dt;
    if (pl.orbCastT <= 0) { pl.orbCastT = 1.6; pl.cast({ kind: 'orbit', cd: 1.6 }); }
  }

  /** Replays a teammate's attack just to see it (no damage). */
  function ghostCast(pl, id, stacks, aim) {   // `stacks` arrives on the wire but ghosts replay the base move (co-op parked)
    const def = G.Moves.BY_ID[id];
    if (!def || def.kind === 'orbit') return;
    const m = G.Moves.instance(id);
    pl.aim = aim;
    ghost = true;
    try {
      pl.cast(m);
      run(pl, m);
    } finally { ghost = false; }
  }

  /** Orbs of a teammate who has an orbit move active (visual only). */
  function ghostOrbit(pl, dt, now) {
    const m = pl.activeMove();
    if (m && m.kind === 'orbit' && !pl.dead) orbit(pl, m, dt, now, true);
    else if (G.Projectiles.all().some(p => p.orb && p.owner === pl)) G.Projectiles.clearOrbs(pl);
  }

  // Critical hit (Upgrades -> Critical Hit): x1.5 damage, big orange number.
  const CRIT_MUL = 1.5;
  const critOf = pl => pl.critChance + (pl.stgTeam ? G.Stages.teamSum(pl.stgTeam, 'crit') : 0);   // + Lansat Berry (timed team crit chance)
  const isCrit = pl => !ghost && critOf(pl) > 0 && Math.random() < critOf(pl);

  // An enemy's real base Def/SpD (stats[2]/stats[4]) via its species dex. Fallback 50/50
  // (e.g. a boss or minion whose dex lacks a stats array).
  function enemyDefStats(e) {
    const s = G.DEX_BY[e.dex] && G.DEX_BY[e.dex].stats;
    return { def: s && s[2] != null ? s[2] : 50, spd: s && s[4] != null ? s[4] : 50 };
  }

  /** The defender's Def / SpD stage multiplier for a move (G.Stages). Status-category moves use the neutral denominator, so 1. */
  function defStage(e, m) {
    if (!e.stg) return 1;
    const cat = G.Stats.moveCat(m);
    return cat === 'status' ? 1 : G.Stages.mul(e, cat === 'special' ? 'spd' : 'def');
  }

  /** Level the DEFENDER's stats are computed at: the enemy's own (it scales with the clock),
   *  not the attacker's. Bosses carry atkLvl 0, so they fall back to `fallback`. */
  function defLevel(e, fallback) { return e.atkLvl > 0 ? e.atkLvl : fallback; }
  /** A cast always does at least 1 HP in total: each event is floored at m.floor (= 1 / events per cast;
   *  1 for single-event moves). Lives here so Enemy.hurt can take fractional damage. */
  function floorHit(d, m) { const f = m.floor || 1; return d < f ? f : d; }

  // `factor` is the attacker half (pl.moveFactor(m)); the defender half completes here
  // against THIS enemy's real base Def/SpD (STAB + scalar are inside applyDamage), then
  // type x crit on top, exactly where they were before.
  /** Drain (slice D3): heal `m.drain` of the damage ACTUALLY taken (overkill past the enemy's HP excluded, shield counts), at most
   *  `m.drainCap` of max HP per hit. Not for a teammate's ghost shot. */
  function drainHeal(pl, m, e, hp0, sh0) {
    if (!m || !m.drain || ghost || pl.dead) return;
    const dealt = (hp0 - Math.max(0, e.hp)) + (sh0 - (e.shield || 0));
    if (dealt <= 0) return;
    const root = pl.bigRoot ? 1.3 : 1;      // Big Root: +30% from draining moves (F3b)
    pl.heal(Math.min(dealt * m.drain * root, pl.maxHp * (m.drainCap == null ? 1 : m.drainCap)));
  }

  function hit(pl, e, factor, col, dx, dy, knock, m) {
    const ds = enemyDefStats(e), dl = defLevel(e, pl.level), dm = defStage(e, m);
    let dmg = G.Stats.applyDamage(factor, ds.def, ds.spd, m, dl, pl.stabFor(m), dm);
    const k = typeK(m.type, e);
    const crit = isCrit(pl);
    dmg = floorHit(dmg * k * G.Stats.itemDmgMul(pl, m.type, k) * (crit ? CRIT_MUL : 1), m);      // held-item damage layer (Expert Belt, type items)
    const LOG = G.Log.on && !ghost, hp0 = e.hp, sh0 = e.shield || 0;
    e.hurt(dmg, col, dx, dy, knock, crit ? 'crit' : G.Types.label(G.Types.mult(m.type, e.types)));
    if (LOG) {
      const cat = G.Stats.moveCat(m), c = cat === 'status' ? 2 : cat === 'special' ? 1 : 0;
      const dS = c === 2 ? 50 : (c === 1 ? G.Stats.spDef(ds.spd, dl) : G.Stats.defense(ds.def, dl)) * dm;
      G.Log.hitOut(pl, m, e, c, factor, dS, c !== 2 && pl.stabFor(m) ? G.Stats.STAB : 1, k, crit, dmg, hp0, Math.max(0, e.hp), Math.max(0, sh0 - (e.shield || 0)), m.norm || 1);
    }
    drainHeal(pl, m, e, hp0, sh0);
    if (!ghost) pl.onDealt(dmg);
    pl.dmgDealt += dmg;
    procAilments(e, m.burn, m.poison, m);
    G.Stages.procMove(e, m);                   // stat drop (slice D1)
    if (!ghost) G.Stages.procSelf(pl, m);      // the user's own stat effect: Leaf Storm drop, Metal Claw / Meteor Mash team raise (slice E2b)
    procFlinch(e, m);                          // flinch (slice D2)
    G.Status.onHit(e, m.type);                 // a Fire hit thaws ice
    if (m.slow) e.applySlow(m.slow);
  }

  // ---------------- collisions ----------------

  /** Squared distance from point (cx, cy) to the segment (ax, ay)-(bx, by). */
  function segDist2(ax, ay, bx, by, cx, cy) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((cx - ax) * dx + (cy - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + dx * t - cx, qy = ay + dy * t - cy;
    return qx * qx + qy * qy;
  }

  function resolve(dt, pl, now) {
    const projectiles = G.Projectiles.all();

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];

      // --- enemy shots: walls and solid objects give cover ---
      if (!p.friendly) {
        if (G.World.projectileBlock(p.x, p.y, p.r)) {
          G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 70);
          projectiles.splice(i, 1);
          continue;
        }
        if (G.U.dist2(p.x, p.y, pl.x, pl.y) < (p.r + pl.r) * (p.r + pl.r)) {
          const w = G.Log.on ? G.Log.who(p.src, 'shot') : null;
          const landed = pl.invuln <= 0;
          if (p.atkFactor != null) pl.hurt(p.atkFactor, p.mtype, false, { factor: p.atkFactor, cat: p.atkCat, mul: p.mul }, w);
          else pl.hurt(p.dmg, p.mtype, false, null, w);
          if (p.ail && landed && !pl.dead) pl.inflict(p.ail, p.ailHalf);      // a Status carrier's shot (slice E1)
          G.FX.burst(p.x, p.y - G.LIFT, p.color, 7, 110);
          projectiles.splice(i, 1);
        }
        continue;
      }

      // --- player shots ---
      // A teammate's orbs: only shown.
      if (p.orb && p.ghost) continue;
      if (!p.orb) {
        const block = G.World.projectileBlock(p.x, p.y, p.r);
        if (block === 'wall' || (block && !block.destructible)) {
          G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);
          projectiles.splice(i, 1);
          continue;
        }
      }

      // Scene objects (rocks, chests, grass).
      let consumed = false;
      for (const prop of G.World.propsInCircle(p.x, p.y, p.r)) {
        if (p.orb) {
          const k = 'p' + prop.id, last = p.hitLog.get(k) || -99;
          if (now - last < p.rehit) continue;
          p.hitLog.set(k, now);
          G.World.damageProp(prop, p.dmg, p.color);
          continue;
        }
        if (p.phits.has(prop.id)) continue;
        p.phits.add(prop.id);
        if (!p.ghost) G.World.damageProp(prop, p.dmg, p.color);
        // Grass does not slow; solid objects do spend pierce.
        if (prop.solid) {
          if (p.pierce > 0) p.pierce--;
          else { consumed = true; break; }
        }
      }
      if (consumed) {
        G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);
        projectiles.splice(i, 1);
        continue;
      }

      // Enemies. SWEPT collision: the whole span traveled this
      // frame is checked, not just the end point. A Thunder Shock advances 8 units per
      // frame: without this it passed through enemies stuck to the player, which
      // were immune to all projectile moves.
      const sx = p.orb || p.px == null ? p.x : p.px, sy = p.orb || p.py == null ? p.y : p.py;
      const half = Math.hypot(p.x - sx, p.y - sy) / 2;
      for (const e of G.EnemyMgr.queryCircle((sx + p.x) / 2, (sy + p.y) / 2, half + p.r)) {
        if (segDist2(sx, sy, p.x, p.y, e.x, e.y) > (p.r + e.r) * (p.r + e.r)) continue;
        if (p.orb) {
          const last = p.hitLog.get(e.id) || -99;
          if (now - last < p.rehit) continue;
          p.hitLog.set(e.id, now);
          // Orbits last the whole game: old hits are forgotten.
          if (p.hitLog.size > 300) for (const [k, t] of p.hitLog) if (now - t > p.rehit) p.hitLog.delete(k);
        } else {
          if (p.hits.has(e.id)) continue;
          p.hits.add(e.id);
        }

        // A teammate's ghost shot: it collides and is shown, but does no damage.
        if (p.ghost) {
          G.FX.sp('impact', p.vis ? p.vis.pal : 'normal', e.x, e.y - e.bodyH * 0.5, { life: 0.12, scale: 1 });
          if (p.pierce > 0) { p.pierce--; continue; }
          G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);
          projectiles.splice(i, 1);
          break;
        }

        const crit = isCrit(pl);
        // p.dmg carries the attacker factor; complete the A/D ratio against this enemy.
        // p.move/p.stab were stashed at spawn; fall back to a flat typeless shot if absent
        // (e.g. a turret projectile with no move context -> status cat, neutral denominator).
        const ds = enemyDefStats(e);
        const pm = p.move || { type: p.mtype, cat: 'status', dmg: 0 };
        const dl = defLevel(e, p.level || pl.level);
        const dm = defStage(e, pm);
        let dmg = G.Stats.applyDamage(p.dmg, ds.def, ds.spd, pm, dl, !!p.stab, dm);
        const tk = p.mtype ? typeK(p.mtype, e) : 1;
        const k = tk * G.Stats.itemDmgMul(pl, p.mtype, tk) * (crit ? CRIT_MUL : 1);      // held-item damage layer (Expert Belt, type items)
        dmg = floorHit(dmg * k, pm);
        const LOG = G.Log.on && !ghost, hp0 = e.hp, sh0 = e.shield || 0;
        e.hurt(dmg, p.color, p.vx || (e.x - pl.x), p.vy || (e.y - pl.y), p.knock,
               crit ? 'crit' : p.mtype ? G.Types.label(G.Types.mult(p.mtype, e.types)) : null);
        if (LOG) {
          const cat = G.Stats.moveCat(pm), c = cat === 'status' ? 2 : cat === 'special' ? 1 : 0;
          const dS = c === 2 ? 50 : (c === 1 ? G.Stats.spDef(ds.spd, dl) : G.Stats.defense(ds.def, dl)) * dm;
          G.Log.hitOut(pl, pm, e, c, p.dmg, dS, c !== 2 && p.stab ? G.Stats.STAB : 1, tk, crit, dmg, hp0, Math.max(0, e.hp), Math.max(0, sh0 - (e.shield || 0)), pm.norm || 1);
        }
        if (Math.random() < 0.5) G.FX.sp('impact', p.vis ? p.vis.pal : 'normal', e.x, e.y - e.bodyH * 0.5, { life: 0.12, scale: 1 });
        drainHeal(pl, pm, e, hp0, sh0);
        pl.dmgDealt += dmg;
        pl.onDealt(dmg);
        procAilments(e, p.burn, p.poison, pm);
        G.Stages.procMove(e, pm);                 // stat drop (slice D1)
        if (!ghost && !p.ghost) G.Stages.procSelf(pl, pm);      // the user's own stat effect (slice E2b)
        procFlinch(e, pm);                        // flinch (slice D2)
        G.Status.onHit(e, p.mtype);
        if (p.slow) e.applySlow(p.slow);

        if (!p.orb) {
          if (p.pierce > 0) { p.pierce--; }
          else {
            G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 80);
            projectiles.splice(i, 1);
            break;
          }
        }
      }
    }

    // --- enemy <-> player contact ---
    if (pl.dead) return;
    for (const e of G.EnemyMgr.queryCircle(pl.x, pl.y, pl.r + 40)) {
      // Contact gap: wild melee reaches CONTACT.hit x the radius sum (it stops at CONTACT.stop x); bosses keep 1.0.
      const reach = (e.r + pl.r) * (e.boss ? 1 : G.Enemies.CONTACT.hit);
      if (G.U.dist2(e.x, e.y, pl.x, pl.y) > reach * reach) continue;
      if (e.touchCd > 0 || e.behavior === 'thief') continue;
      if (G.Status.stunned(e)) continue;        // frozen or asleep enemies do not hit
      // An active flanker only hits in its strike phase, and waits out your invulnerability instead of wasting the hit.
      if (e.fl && (e.fl.ph !== 'strike' || pl.invuln > 0)) continue;
      e.touchCd = 0.55;
      if (G.Status.fizzle(e)) continue;         // paralysis / confusion: the strike fizzles
      e.strike(pl);
      // Wild: enemy attack factor + category via the A/D ratio. Boss: flat def.dmg (deferred).
      const w = G.Log.on ? G.Log.who(e, 'contact') : null;
      if (e.atkFactor != null) pl.hurt(e.atkFactor, e.atkType, false, { factor: e.atkFactor, cat: e.atkCat, mul: e.contactMul() }, w);
      else pl.hurt(e.dmg, e.atkType, false, null, w);
      if (e.carrierSec && !pl.dead) { const k = e.secAil(); if (k) pl.inflict(k, true); }      // a secondary carrier's touch (slice E1)
      if (e.fl) e.flankStruck();
      if (pl.hasItem('rockyhelmet')) e.hurt(15 + pl.level * 4, '#9aa6b5', e.x - pl.x, e.y - pl.y, 80);
      const [nx, ny] = G.U.norm(e.x - pl.x, e.y - pl.y);
      e.kx += nx * 150; e.ky += ny * 150;
    }
  }

  return { tick, resolve, ghostCast, ghostOrbit, updateFields, drawGroundFields, drawAirFields, clearFields, procAilments, defStage, procFlinch, drainHeal,
           get fieldCount() { return fields.length; } };
})();
