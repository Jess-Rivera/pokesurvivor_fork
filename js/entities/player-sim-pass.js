/* ============ player-sim-pass.js: the SimPass's movement step for every Player entity (G.PlayerEntity.SimPass, #43) ============
 *
 * LEADER-AI "FRAME": the Body (G.PlayerEntity: acceptHeading, acceptDodge, acceptsCast) only accepts or refuses; this pass carries out
 * what it accepted and everything nobody asked for, and never learns why a request did not come (a refusal passes nothing on). It runs
 * inside the entity's update, in the order the update ran before the split (decision 2026-11-09-43-movement-split-opening):
 *   tick(e, dt)              timers and statuses: i-frames, flash, Fly, dodge charges, the skill slot, stages, slow, statuses
 *   overTime(e, dt)          heal and damage over time: Heal Bell, the power, the shield, regen, Black Sludge
 *   cancelDodge(e)           a push, a flinch, freezing or sleep cancels the dodge in progress
 *   startDodge(e, dodge)     a dodge the Body accepted starts: the charge is spent, the body shrinks
 *   move(e, heading, dt)     the velocity (push, flinch, dodge, ice glide, ice slide, walking), the 4 px steps with walls, the dodge's
 *                            timing and grow-back, the facing, liquid terrain. Returns the speed it walked at (the walk animation's)
 *   aim(e)                   the target pick: the nearest foe by the active move's range, else the fallback, else where it walks
 * Applies to you and to leaders alike (G.HumanPlayer, G.GymLeader); a leader's cast rules stay in G.GymLeader.SimPass.
 */
G.PlayerEntity.SimPass = {
  /** Timers and statuses, before the Body reads this frame's requests. A faint here ends the frame (the caller checks). */
  tick(e, dt) {
    if (e.invuln > 0) e.invuln -= dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.attackFace > 0) e.attackFace -= dt;
    if (e.flyT > 0 && (e.flyT -= dt) <= 0) e.land();
    else if (e.flyT <= 0 && e.flyCd > 0) e.flyCd = Math.max(0, e.flyCd - dt);
    e.tickDodges(dt);
    if (e.skillAt(e.active)) {
      // a skill never stays active (it may land there when slots change): the first castable slot takes over
      const i = e.slots.findIndex((g, k) => !e.skillAt(k));
      if (i >= 0) e.active = i;
    }
    G.Stages.teamTick(e.stgTeam, dt); // the shared team raises: only the active member runs update(), so they tick exactly once per frame
    if (e.slowT > 0) e.slowT -= dt;
    G.Status.tick(e, dt);
    G.Stages.tick(e, dt);
  },

  /** Heal and damage over time. Heals go through restoreHp (#91: they count as Healed). */
  overTime(e, dt) {
    if (e.bellHeal > 0) {
      const h = Math.min(e.bellHeal, 4 * dt);
      e.restoreHp(h);
      e.bellHeal -= h;
    }
    if (e.power && (e.power.t -= dt) <= 0) {
      e.power.def.off(e);
      e.power = null;
    }
    e.tickShield(dt);
    if (e.regen > 0) e.restoreHp(e.regen * dt);
    // Black Sludge on a non-Poison holder: small chip, never lethal (F3b).
    if (e.sludgeHurt && !e.dead) e.hp = Math.max(1, e.hp - e.maxHp * 0.01 * dt);
  },

  /** Dodge: a push, a flinch, freezing or sleep cancels the one in progress (its charge stays spent). */
  cancelDodge(e) {
    if (e.dodgeT > 0 && (e.frozen || e.stFl || e.stPush || G.Status.stunned(e))) e.endDodge();
  },

  /** A dodge the Body accepted (acceptDodge: the charge and the heading) starts: the charge goes on its cooldown, the body shrinks. */
  startDodge(e, dodge) {
    const D = G.PlayerEntity.DODGE,
      v = D.dist / D.dur;
    e.dodges.cd[dodge.charge] = D.cd;
    e.dodgeT = D.dur;
    e.dodgeEl = 0;
    e.dodgeVx = dodge.nx * v;
    e.dodgeVy = dodge.ny * v;
    e.iceGlide = false;
    if (!e.dodgeR0) {
      e.dodgeR0 = e.r;
      e.r *= D.shrink;
    }
    G.FX.burst(e.x, e.y, '#d8d0b8', 6, 60);
  },

  /** Movement with collisions. `heading` is what the Body accepted, or null when it refused or nothing was asked. */
  move(e, heading, dt) {
    const [ax, ay] = heading || [0, 0],
      D = G.PlayerEntity.DODGE,
      dodging = e.dodgeT > 0;
    e.walking = ax !== 0 || ay !== 0 || dodging;
    const s = e.spd;
    // Ice: you slide (the velocity changes slowly).
    const slide = e.inLiquid && G.World.liquidEffect(e.mon.types).slide;
    if (!slide) e.iceGlide = false;
    if (e.stPush) {
      // a push (Roar) moves you; it ends after PUSH_T
      e.svx = e.stPush.vx;
      e.svy = e.stPush.vy;
      if ((e.stPush.t -= dt) <= 0) e.stPush = null;
    } else if (e.stFl)
      [e.svx, e.svy] = e.flinchMove(dt); // the flinch recoil moves you
    else if (dodging) {
      // a dodge holds its heading and speed, ice or not
      e.svx = e.dodgeVx;
      e.svy = e.dodgeVy;
    } else if (e.iceGlide) {
      // a dodge that ended on ice keeps its speed until you leave the ice; your keys turn the heading as slowly as ice steering
      const v = D.dist / D.dur,
        [hx, hy] = ax || ay ? [ax, ay] : G.U.norm(e.svx || 0, e.svy || 0);
      const gx = G.U.damp(e.svx || 0, hx * v, 1.6, dt),
        gy = G.U.damp(e.svy || 0, hy * v, 1.6, dt),
        g = Math.hypot(gx, gy) || 1;
      e.svx = (gx / g) * v;
      e.svy = (gy / g) * v;
    } else {
      e.svx = slide ? G.U.damp(e.svx || 0, ax * s * 1.15, 1.6, dt) : ax * s;
      e.svy = slide ? G.U.damp(e.svy || 0, ay * s * 1.15, 1.6, dt) : ay * s;
    }
    // Fast moves step in 4 px pieces so the shrunk body cannot skip over a thin obstacle on a long frame.
    const steps = Math.max(1, Math.ceil((Math.hypot(e.svx, e.svy) * dt) / 4));
    for (let k = 0; k < steps; k++) {
      e.x += (e.svx * dt) / steps;
      e.y += (e.svy * dt) / steps;
      if (e.flyT > 0) e.keepInArena();
      else G.World.collide(e); // in the air walls and objects do not block
    }
    if (dodging) {
      e.moveAngle = Math.atan2(e.dodgeVy, e.dodgeVx);
      e.dodgeEl += dt;
      // past the shrink window the body grows back as soon as it fits where you stand (it never pops out of a gap mid-dodge)
      const fits = e.flyT > 0 || G.World.isFree(e.x, e.y, e.dodgeR0, true);
      if (e.dodgeR0 && e.dodgeEl >= D.shrinkT && fits) {
        e.r = e.dodgeR0;
        e.dodgeR0 = 0;
      }
      if (e.dodgeT > dt + 1e-6)
        e.dodgeT -= dt; // the epsilon keeps 0.5 s at 30 frames, not 31
      else {
        e.endDodge();
        e.iceGlide = !(e.flyT > 0) && G.World.isLiquid(e.x, e.y) && !!G.World.liquidEffect(e.mon.types).slide;
      }
    } else if (e.walking) e.moveAngle = Math.atan2(ay, ax);

    // --- liquid terrain ---
    e.inLiquid = !(e.flyT > 0) && G.World.isLiquid(e.x, e.y);
    if (e.inLiquid) {
      const le = G.World.liquidEffect(e.mon.types);
      if (le.dmg) {
        e.lavaTick -= dt;
        if (e.lavaTick <= 0) {
          e.lavaTick = le.every;
          e.invuln = 0;
          e.hurt(Math.max(le.flat, e.maxHp * le.dmg * 0.5));
          G.FX.burst(e.x, e.y - 4, le.color, 5, 70);
        }
      } else if (e.walking && Math.random() < dt * 8) {
        G.FX.burst(e.x, e.y, le.slide ? '#ffffff' : '#b3defa', 2, 40);
      }
    }
    return s;
  },

  /** Targeting: nearest foe; if none, the fallback; if none, toward where it walks. Priority by the active attack:
   *    ranged (a shot that travels, or a beam): the boss if in range > what is touching it > the nearest
   *    melee and the rest:           what is touching it > the boss > the nearest
   *  With a horde on top something is almost always touching you; if that always won, ranged attacks would never hit the boss.
   *  Foes are e.aimTargets() (slice 3; yours: the enemies); the fallback e.aimFallback() (yours: the nearest rock or chest). */
  aim(e) {
    const all = e.aimTargets();
    const m = e.activeMove();
    const md = m && G.MoveDefs[m.id];
    const ranged = !!md && ((md.delivery || {}).motion === 'travels' || (md.space || {}).shape === 'linear');
    const threat = G.Projectiles.nearest(all, e.x, e.y, e.r + 24);
    const boss = all.find((f) => f.boss && !f.dead && G.U.dist(e.x, e.y, f.x, f.y) < 330);
    const tg =
      (ranged ? boss || threat : threat || boss) || G.Projectiles.nearest(all, e.x, e.y, 520) || e.aimFallback();
    e.target = tg;
    if (tg) e.aim = Math.atan2(tg.y - e.y, tg.x - e.x);
    else if (e.walking) e.aim = e.moveAngle;
  },
};
