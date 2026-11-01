/* ============ boss-ai.js: boss brains (G.Boss) ============
 * A boss is the shared Enemy body (enemy.js: HP, hurt, die, status, stages, the grid slot) plus a brain that makes every
 * decision. The body only delegates: Enemy.update calls brain.step, Enemy.applyFlinch calls brain.flinch. G.Boss.make is
 * the only way to spawn a boss (gym-arena.js). Gyms only since 2026-10-31, so the GymBrain is the only brain; a later boss
 * type (the Elite Four, or a multi-mon gym arena that needs its own pacing) gets its own brain here, with no edit to the wild AI.
 *
 * GymBrain: a leader alternates between coming at you and fighting from range by its stance, picks an authored move by
 * weight, range and HP gate (pick), telegraphs it with a wind-up (start) and casts it (cast). There is no fury: the enrage
 * is the 120 s clock (systems/gym.js). The move list comes from G.Gyms (hand-authored, catalog moves only). A leader uses
 * the PLAYER's version of each move: same radius / arc / speed / size / life / count / spread / pierce, same slash and
 * projectile visuals (G.VFX.forMove), and Harden is the player's Harden (a stage per cast lasting its duration). Only the
 * damage is the enemy ratio path (catalog Power and category). Kinds without a boss form yet fall back to the projectile.
 * The brain writes the body's atkFactor / atkCat / atkType, since contact hits and projectiles read them from the body.
 */
G.Boss = (() => {
  class GymBrain {
    /** The old constructor gym block: level, the contact move (the idle attack) and its factor, category and type. */
    constructor(e) {
      this.e = e;
      this.on = false;                      // the fight state starts on the first step (init), as before the split
      e.atkLvl = e.gym.level;
      this.baseType = e.atkType;
      const cm = e.gym.moves.map(x => x.inst).filter(m => m && m.cat !== 'status');
      this.contact = cm.find(m => m.kind === 'melee') || cm[0] || null;
      if (this.contact) { e.atkFactor = this.factor(this.contact); e.atkCat = this.contact.cat; e.atkType = this.contact.type; this.baseType = e.atkType; }
      e.atkFactor0 = e.atkFactor;
    }

    init() {
      const st = this.e.gym.stance;
      this.on = true;
      this.farLike = st === 'far' ? 0.8 : st === 'close' ? 0.2 : 0.5; this.mode = st === 'far' ? 'far' : 'close'; this.modeT = G.U.rand(6, 8);
      this.cd = 1.6; this.casting = null; this.side = Math.random() < 0.5 ? -1 : 1; this.lastMove = null;
    }

    /** One frame of movement and casting; returns [vx, vy, anim] for the body's integration. */
    step(dt, pl, dist, dx, dy, spd) {
      if (!this.on) this.init();
      const e = this.e;
      if (this.casting) return this.cast(dt, pl);
      this.modeT -= dt; this.cd -= dt;
      // It always alternates: at its favorite range it stays longer (7-9 s) than at the other (4-5 s).
      if (this.modeT <= 0) {
        this.mode = this.mode === 'far' ? 'close' : 'far';
        this.modeT = (this.mode === 'far') === (this.farLike > 0.5) ? G.U.rand(7, 9) : G.U.rand(4, 5);
        this.side = -this.side;
      }
      // A gym leader moves at its species speed, always: no chase bonus, no slower circling (Jess, 2026-10-19).
      let vx = dx * spd, vy = dy * spd;
      const [ddx, ddy] = G.U.norm(pl.x - e.x, pl.y - e.y);
      if (this.mode === 'far') {
        if (dist < 170) { vx = -ddx * spd; vy = -ddy * spd; }
        else if (dist < 300) { vx = -ddy * spd * this.side; vy = ddx * spd * this.side; }   // circles you
      }
      if (this.cd <= 0 && G.Status.fizzle(e)) this.cd = 1;       // paralysis / confusion: the attempt fails, it tries again in a second
      if (this.cd <= 0) {
        const id = this.pick(dist);
        if (id) this.start(id, pl); else this.cd = 0.3;
      }
      return [vx, vy, 'Walk'];
    }

    end() {
      this.casting = null;
      this.cd = this.cdAfter();
      this.restore();
      return [0, 0, 'Idle'];
    }

    /** Flinch (slice D2): a cast in progress is cancelled and the next-attack timer restarts as after a normal cast. */
    flinch() {
      if (!this.on) return;
      if (this.casting) this.end();
      else this.cd = this.cdAfter();
    }

    /** Attack factor for an authored move: Power from the catalog, category from the move, level locked at gate spawn, enrage on top. */
    factor(m) {
      const e = this.e;
      const stab = e.types.includes(m.type) ? 1.5 : 1;      // same STAB the player gets on its own types
      const special = m.cat === 'special';
      return G.Stats.enemyAttackFactor(e.atkBase, e.spaBase, e.gym.level, m.dmg || 40, special ? 'special' : 'physical') * stab * e.gym.power * G.Gym.enrageMul(e) * G.Stages.mul(e, special ? 'spa' : 'atk');
    }

    /** A leader's buff cast is a mainline STAGE change (G.Stages): +stageN (default 1) on the move's stat per cast, each application
     *  lasting the move's dur on its own timer, up to the move's stacks as the stage cap (max 6). The player's Speed buff stat is 'spd'. */
    buff(m) {
      const stat = ({ atk: 'atk', def: 'def', spd: 'spe', spe: 'spe' })[m.stat];
      if (stat) G.Stages.add(this.e, stat, m.stageN || 1, m.dur, m.stacks | 0 || G.Stages.MAX);
      if (m.stage2) G.Stages.add(this.e, m.stage2.stat, m.stage2.n, m.dur, G.Stages.MAX);
    }

    /** Weighted pick among the moves allowed by range and HP gate; null if none. */
    pick(dist) {
      const e = this.e;
      // "close" = inside the player's own melee start range for the leader's melee move(s): move radius + body + 40 (combat.js rangeOf
      // starts a swing at radius + 30). With no melee move it is a flat 150.
      const mel = e.gym.moves.map(x => x.inst).filter(m => m && m.kind === 'melee');
      const close = dist < (mel.length ? Math.max(...mel.map(m => m.radius)) + e.r + 40 : 150), frac = e.hp / e.maxHp;
      const ok = e.gym.moves.filter(m => (m.range === 'any' || (m.range === 'close') === close) && (m.hpBelow == null || frac < m.hpBelow));
      if (!ok.length) return null;
      let r = Math.random() * ok.reduce((a, m) => a + m.weight, 0);
      for (const m of ok) if ((r -= m.weight) <= 0) return m.id;
      return ok[ok.length - 1].id;
    }

    /** Cooldown after a cast: damaging moves use the catalog rule 0.5 x (35 / PP); status moves keep their catalog cd. */
    cdAfter() {
      const m = this.lastMove;
      if (!m) return 1.2;
      // A buff move's catalog cd is the PLAYER's recast timer (slice E2a: 8 s); a leader picks moves by weight, so its recovery after a buff cast stays 0.85 s.
      const cd = (m.kind === 'buff' ? 0.85 : Math.max(0.35, m.cd || 1)) + (m.cat === 'status' ? 0 : G.U.rand(0.2, 0.5));   // the move's own cd: 0.5 x (35 / PP) for damaging, shortened by Recharge stacks
      return cd / this.e.gym.tempo;
    }

    start(id, pl) {
      const e = this.e, m = e.gym.moves.find(x => x.id === id).inst, type = m.type || this.baseType, col = G.U.TYPE_COLOR[type] || '#ff7a9e';
      const ang = Math.atan2(pl.y - e.y, pl.x - e.x);
      const c = this.casting = { id, t: 0, wind: 0.5, after: 0.35, ang, kind: m.kind, m };
      this.lastMove = m;
      e.atkType = type;
      if (m.cat !== 'status') { e.atkFactor = this.factor(m); e.atkCat = m.cat === 'special' ? 'special' : 'physical'; }
      if (m.kind === 'buff') c.wind = 0.3;
      else if (m.kind === 'melee') c.wind = 0.45;
      c.wind /= e.gym.tempo; c.after /= e.gym.tempo;
      G.Gym.noteCast(id);
      e.anim.play('Charge', { speed: 1.4 });
      G.FX.ring(e.x, e.y, e.r, e.r * 2.4, col, c.wind, 2);       // the wind-up telegraph (the aim is locked now)
    }

    cast(dt, pl) {
      const e = this.e, c = this.casting, m = c.m;
      c.t += dt;
      if (c.t >= c.wind && !c.fired) {
        c.fired = true;
        const col = G.U.TYPE_COLOR[m.type] || '#ff7a9e';
        if (c.kind === 'buff') {                 // the player's buff cast: the stack, a ring and rising sprites
          this.buff(m);
          const vis = G.VFX.forMove(m);
          G.FX.ring(e.x, e.y, e.r * 2.4, e.r * 1.1, col, 0.35, 2.5);
          for (let i = 0; i < 3; i++) G.FX.sp(vis.buff || 'arrow', vis.pal, e.x + G.U.rand(-e.r * 1.4, e.r * 1.4), e.y - G.U.rand(0, e.bodyH * 0.8), { vy: -70, life: 0.6 });
        } else if (c.kind === 'melee') {          // the player's melee: slash visual, a cone of radius m.radius (from the body edge) and arc m.arc
          const reach = m.radius + e.r, half = Math.min(m.arc, 6.2832) / 2;
          G.FX.slash(e.x, e.y - G.LIFT * 0.5, c.ang, reach, m.arc, col, G.VFX.forMove(m));
          e.anim.play('Attack', { speed: 1.4 });
          const a = Math.atan2(pl.y - e.y, pl.x - e.x);
          const inArc = Math.abs(((a - c.ang + Math.PI * 3) % 6.2832) - Math.PI) <= half;
          if (!pl.dead && inArc && G.U.dist2(e.x, e.y, pl.x, pl.y) <= (reach + pl.r) * (reach + pl.r)) {
            const w = G.Log.on ? G.Log.who(e, 'contact') : null;
            pl.hurt(e.atkFactor, e.atkType, false, { factor: e.atkFactor, cat: e.atkCat, mul: 1 }, w);
          }
        } else {
          this.shoot(m, Math.cos(c.ang), Math.sin(c.ang));
        }
      }
      if (c.t >= c.wind + c.after) return this.end();
      return [0, 0, 'Idle'];
    }

    /** The player's projectile: speed, size, life, count, spread, pierce and visuals from the move; the aim was locked at wind-up. */
    shoot(m, ax, ay) {
      const e = this.e, col = G.U.TYPE_COLOR[m.type], vis = G.VFX.forMove(m);
      const n = Math.max(1, m.count | 0), spread = m.spread || 0;
      const fan = Math.min(spread * n, 6.2832 * (n - 1) / n), base = Math.atan2(ay, ax);
      for (let i = 0; i < n; i++) {
        const off = n === 1 ? 0 : (i / (n - 1) - 0.5) * fan, a = base + off + G.U.rand(-0.03, 0.03);
        G.Projectiles.spawn({
          x: e.x + Math.cos(a) * 3, y: e.y + Math.sin(a) * 3, vx: Math.cos(a) * m.speed, vy: Math.sin(a) * m.speed,
          dmg: e.shotDmg(), r: m.size, life: m.life, mul: 1, friendly: false, color: col, mtype: m.type,
          atkFactor: e.atkFactor, atkCat: e.atkCat, src: e, pierce: m.pierce | 0, vis
        });
      }
      e.anim.play('Shoot');
      G.FX.spark(e.x + Math.cos(base) * e.r, e.y - G.LIFT + Math.sin(base) * e.r, col, Math.cos(base), Math.sin(base), 3);
    }

    /** Back to the leader's idle attack (contact) after a cast. */
    restore() {
      const e = this.e;
      if (this.contact) { e.atkFactor = this.factor(this.contact); e.atkCat = this.contact.cat; e.atkType = this.contact.type; }
    }
  }

  /** The only boss spawn: a boss body (enemy.js) with a GymBrain when the def carries a gym leader descriptor. */
  function make(def, x, y) {
    const e = new G.Enemy(def, x, y, { hp: 1, spd: 1, dmg: 1 }, true);
    if (e.gym) e.brain = new GymBrain(e);
    return e;
  }

  return { make, GymBrain };
})();
