/* ============ enemy.js — wild Pokemon and their manager ============
 * (x, y) are the FEET. Mystery Dungeon animations:
 *   Walk when moving · Idle when still · Charge when aiming a charge ·
 *   Attack when charging or hitting you · Shoot when firing · Hurt when taking a hit ·
 *   Faint when going down (it stays on the ground and fades away).
 *
 * The fliers, ghosts and bosses ignore the terrain. The rest collide
 * with walls and objects, moves slower in water and burns in lava.
 *
 * The manager keeps a spatial grid (rebuilt every frame) for
 * separation between enemies and the projectile collisions.
 */
(() => {
  let nextId = 1;
  /** Signed difference a - b of two angles, in [-PI, PI). */
  const angDiff = (a, b) => ((a - b + Math.PI) % 6.2832 + 6.2832) % 6.2832 - Math.PI;
  /** Bosses are enlarged up to ~110 tall, based on how big their sprite already is. */
  function bossScale(dex) {
    const m = G.Sprites.animMeta(dex, 'Idle');
    const h = (m ? m.ay : 30) * G.Sprites.PX;
    // In multiples of 0.5: with the camera at x2 each art pixel takes a
    // whole number of screen pixels (scales like 1.37 distort it).
    return G.U.clamp(Math.round(110 / h * 2) / 2, 1, 2);
  }

  class Enemy {
    constructor(def, x, y, sc, boss = false) {
      this.id = nextId++;
      this.def = def;
      this.dex = def.dex;
      this.name = (G.DEX_BY[def.dex] && G.DEX_BY[def.dex].name) || def.name;
      this.x = x; this.y = y;
      this.boss = boss;
      this.scale = boss ? bossScale(def.dex) : 1;
      this.anim = new G.Sprites.Animator(def.dex, this.scale);
      this.r = G.Sprites.bodyRadius(def.dex, this.scale);
      this.bodyH = G.Sprites.bodyHeight(def.dex, this.scale);

      // Enemy HP = real base HP through the mainline formula at the level-for-run-time
      // (sc.t). Bosses keep their bespoke def.hp (BOSS_SLOTS) for now; wild enemies use
      // the formula. No role/elite/co-op/density HP multipliers (removed this slice).
      this.maxHp = boss ? Math.round(def.hp * (sc.hp || 1)) : G.Enemies.enemyHp(def.baseHp != null ? def.baseHp : 50, sc.t || 0);
      this.hp = this.maxHp;
      // Speed = fixed species identity (def.spd is already px/s via G.Stats.speedToPx).
      // No run-time ramp (sc.spd) for wild enemies: Speed does not scale in-run, same as
      // the player. Bosses keep their own def.spd (unchanged this slice).
      this.spd = boss ? def.spd * (sc.spd || 1) : def.spd;
      this.dmg = def.dmg * sc.dmg;
      this.xp = def.xp;
      // Wild enemies: XP is computed at the kill from the species base_experience (die()). Bosses
      // and Judgment legendaries (def.bx undefined) keep the flat def.xp. xpMul collects the
      // tank / elite / shiny / golden multipliers.
      this.bx = def.bx != null ? def.bx : null;
      this.xpMul = def.xpMul || 1;
      this.behavior = def.behavior;

      const types = (G.DEX_BY[def.dex] && G.DEX_BY[def.dex].types) || [];
      this.types = types.length ? types : ['normal'];
      this.atkType = this.types[0];         // tipo de sus golpes (tabla de tipos)
      // Sub-slice C: enemy attack category + offensive base stat, from real species stats.
      // Category = higher of Atk(stats[1]) / SpA(stats[3]). Bosses are EXCLUDED this slice
      // (they keep the flat def.dmg path); only wild enemies carry an atkFactor.
      const _st = (G.DEX_BY[def.dex] && G.DEX_BY[def.dex].stats) || null;
      this.atkBase = _st ? _st[1] : 50;
      this.spaBase = _st ? _st[3] : 50;
      this.atkCat = G.Stats.enemyCat(this.atkBase, this.spaBase);
      this.atkLvl = boss ? 0 : G.Stats.levelForTime(sc.t || 0);
      this.atkFactor = boss ? null : G.Stats.enemyAttackFactor(this.atkBase, this.spaBase, this.atkLvl);
      // Only those that FLOAT in their sprite fly over rocks and water (a
      // Rowlet walks even though it is Flying). Bosses, by their size, do too.
      this.flying = boss || G.Sprites.hovers(def.dex);

      this.flash = 0;
      this.slow = 0; this.slowT = 0;
      // Status (slice A, G.Enemies.STATUS): burn is 0/1; poison is 0 none, 1 poisoned, 2 badly poisoned (Toxic, N/16 per turn).
      // *Left = ticks still to come, *Tick = seconds to the next one, poisonN = Toxic turn counter, ailRoll = per-move roll gap.
      this.burn = 0; this.burnLeft = 0; this.burnTick = 0;
      this.poison = 0; this.poisonLeft = 0; this.poisonTick = 0; this.poisonN = 0;
      this.ailRoll = null;
      this.lavaTick = 0;
      this.kx = 0; this.ky = 0;
      this.touchCd = 0;
      this.dead = false;
      this.fade = 0;             // tiempo de desvanecimiento tras caer

      // embestida
      this.phase = 'walk'; this.pt = 0; this.dx = 0; this.dy = 0;
      // distancia
      this.shotCd = def.shotCd ? G.U.rand(0.3, def.shotCd) : 0;
      // desatasco
      this.stuckT = 0; this.sideT = 0; this.side = 1;
      this.bob = Math.random() * 6.28;
      this.shiny = false;
      this.sparkT = 0;
      // personalidades
      this.sc = sc;                       // escala de la run (para sus invocaciones)
      this.shield = 0; this.shieldT = 0;  // shield that absorbs damage
      this.skillCd = G.U.rand(1, 4);      // escudos / saltos
      this.minions = [];
      this.jump = null;                   // { sx, sy, tx, ty, t, dur }
      // Stragglers: if they fall behind, out of sight, while you flee,
      // come back out ahead (see EnemyMgr.update).
      this.lagT = 0;
      // Class from the table (null for bosses); active flanker state (flankCheck); crowd-seeking state (seekMove).
      this.cls = boss || !G.DEX_BY[def.dex] ? null : G.Enemies.classOf(G.DEX_BY[def.dex]);
      this.fl = null; this.flT = 0;
      this.seekT = 0; this.seekTarget = null; this.weakCd = G.U.rand(1, G.Enemies.SEEK.shotCd);
    }

    cy() { return this.y; }

    /** Makes it shiny: another sprite, more endurance and much more XP. */
    makeShiny() {
      this.shiny = true;
      this.anim = new G.Sprites.Animator(this.dex, this.scale, true);
      this.maxHp *= 2; this.hp = this.maxHp;
      this.xp *= 5; this.xpMul *= 5;
      G.Sprites.preload([this.dex], 4000, true);
    }

    /** Golden hour (events.js): double experience and sometimes coins. */
    makeGolden() {
      if (this.golden || this.boss || this.behavior === 'thief') return;
      this.golden = true;
      this.xp *= 2; this.xpMul *= 2;
    }

    /** @param eff  'super' | 'weak' | null (type chart, just to show it) */
    hurt(amount, color = '#fff', dirX = 0, dirY = 0, knock = 0, eff = null) {
      if (this.dead || !(amount > 0)) return;
      // HP is fractional now (the per-hit 1 HP floor lives at the combat call sites);
      // `d` is only what is SHOWN and what goes over the network (whole numbers).
      const d = Math.max(1, Math.round(amount));
      // Copy of a host's enemy: the hit is sent to the host, who
      // decides if it falls. Here it is only shown (number, flash and animation).
      if (this.remote) {
        G.Coop.hit(this, d, color, dirX, dirY, knock);
        this.hp = Math.max(1, this.hp - d);
        this.showHurt(d, color, dirX, dirY, eff);
        return;
      }
      // Escudo: absorbe primero.
      if (this.shield > 0) {
        const a = Math.min(this.shield, amount);
        this.shield -= a;
        if (a >= amount) { G.FX.dmgText(this.x, this.y - this.bodyH - 4, d, '#9fd8ff'); this.flash = 0.05; return; }
        amount -= a;
      }
      this.hp -= amount;
      G.Judgment.noteDmg(amount, this);
      this.showHurt(d, color, dirX, dirY, eff);
      if (knock > 0 && !this.boss) {
        const [nx, ny] = G.U.norm(dirX, dirY);
        this.kx += nx * knock;
        this.ky += ny * knock;
      }
      if (G.Coop.isHost) G.Coop.hurtShown(this, d, color);
      if (this.hp <= 0) this.die();
    }

    /** Damage over time (burn/poison): a normal hit plus a dev-log line. */
    dot(kind, amount, color) {
      const hp0 = this.hp;
      this.hurt(amount, color);
      if (G.Log.on) G.Log.dot(this, kind, amount, hp0, Math.max(0, this.hp));
    }

    /** What is SEEN when taking a hit. */
    showHurt(d, color, dirX = 0, dirY = 0, eff = null) {
      this.flash = 0.09;
      // Super effective: big yellow number. Not very effective: gray. Critical: big orange.
      G.FX.dmgText(this.x, this.y - this.bodyH - 4, d, eff === 'crit' ? '#ff9a3c' : eff === 'super' ? '#ffe14d' : eff === 'weak' ? '#a3abb8' : color,
                   this.boss || eff === 'super' || eff === 'crit');
      G.FX.spark(this.x, this.y - this.bodyH * 0.5, color, dirX, dirY, 3);
      if (!this.anim.busy() && this.phase !== 'dash') this.anim.play('Hurt');
      G.Audio.sfx('hit');
    }

    applySlow(factor, dur = 1.2) {
      if (this.remote) { G.Coop.status(this, 's', factor); return; }
      this.slow = Math.max(this.slow, factor);
      this.slowT = Math.max(this.slowT, dur);
    }
    /** Mainline type immunity to a status ('burn' | 'poison' | 'toxic', see G.Enemies.STATUS). */
    statusImmune(kind) {
      const S = G.Enemies.STATUS[kind];
      return !!S && this.types.some(t => S.immune.includes(t));
    }
    immuneText() { G.FX.dmgText(this.x, this.y - this.bodyH - 4, 'Immune', '#a3abb8'); }

    /** Burn: one state; a re-hit refreshes the duration and leaves the tick timer alone (constant re-hits cannot stall it).
     *  ignoreImmune: Fire Spin's trap damage rides on the burn flag until the trap status exists, and a trap is not type-blocked. */
    applyBurn(lv = 1, ignoreImmune = false) {
      if (!ignoreImmune && this.statusImmune('burn')) { this.immuneText(); return; }
      if (this.remote) { G.Coop.status(this, 'b', 1); return; }
      const S = G.Enemies.STATUS.burn;
      if (this.burn <= 0) { this.burn = 1; this.burnTick = S.turn; }
      this.burnLeft = S.turns;
    }
    /** Poison: lv 1 = poisoned (1/8 per turn), lv 2 or more = badly poisoned (Toxic, N/16 per turn). Badly poisoned never downgrades. */
    applyPoison(lv = 1) {
      const bad = lv >= 2, S = G.Enemies.STATUS[bad ? 'toxic' : 'poison'];
      if (this.statusImmune(bad ? 'toxic' : 'poison')) { this.immuneText(); return; }
      if (this.remote) { G.Coop.status(this, 'p', bad ? 2 : 1); return; }
      const was = this.poison;
      if (was <= 0) this.poisonTick = S.turn;
      if (bad && was !== 2) { this.poison = 2; this.poisonN = 0; }
      else if (!bad && was <= 0) this.poison = 1;
      this.poisonLeft = Math.max(this.poisonLeft, S.turns);
    }

    die() {
      if (this.dead) return;
      this.dead = true;
      this.fade = 0.9;
      this.anim.play('Faint', { hold: true });
      const col = this.boss ? '#ffd95e' : '#ffffff';
      const cy = this.y - this.bodyH * 0.5;
      G.FX.burst(this.x, cy, col, this.boss ? 34 : 9, this.boss ? 260 : 120);
      G.FX.ring(this.x, this.y, this.r, this.r * (this.boss ? 6 : 2.6), col, this.boss ? 0.6 : 0.3, this.boss ? 6 : 3);
      // In a copy, the loot and the shinies are distributed by the host.
      if (this.remote) {
        if (this.boss) G.Camera.kick(0.9);
        G.Audio.sfx(this.boss ? 'bossDown' : 'faint');
        if (this.shiny) { G.FX.burst(this.x, cy, '#ffe9a0', 30, 220); G.FX.ring(this.x, this.y, this.r, this.r * 7, '#9ae6ff', 0.7, 5); }
        return;
      }
      // (The legendaries from Arceus's Judgment only give experience.)
      if (this.boss && !this.judge) {
        G.Camera.kick(0.9);
        for (let i = 0; i < 10; i++) G.Pickups.drop('coin', this.x + G.U.rand(-40, 40), this.y + G.U.rand(-30, 30), 5);
        // Bosses always drop an equippable item.
        G.Pickups.drop('item', this.x - 26, this.y - 10, G.Items.roll());
      }
      // Wild enemy: Gen 5 yield from its species base_experience, its spawn level and the player's
      // level right now (shared run level, so the highest among the players).
      if (!this.boss && this.bx != null) {
        const lvl = Math.max(1, ...G.Game.everyone().map(p => p.level || 1));
        this.xp = G.Stats.xpYield(this.bx, this.atkLvl, lvl) * this.xpMul;
      }
      G.Pickups.dropXp(this.x, this.y, this.xp, this.boss, !!this.legend, !!this.judge);
      if (this.golden && Math.random() < 0.35) G.Pickups.drop('coin', this.x + 6, this.y - 4, 3);
      // Treasure imp: Meowth drops coins; Gholdengo, an x10 ticket.
      if (this.behavior === 'thief') {
        const n = this.def.loot === 'ticket10' ? 6 : 20;
        for (let i = 0; i < n; i++) G.Pickups.drop('coin', this.x + G.U.rand(-36, 36), this.y + G.U.rand(-26, 26), 5);
        if (this.def.loot === 'ticket10') G.Pickups.drop('ticket10', this.x, this.y - 12, 1);
        G.FX.ring(this.x, this.y, this.r, this.r * 5, '#ffd23f', 0.6, 4);
      }
      if (this.legend) {
        // The rift legendary: loose tickets and coins (the x10, about
        // half the time; it used to always give 2).
        for (let i = 0; i < 3; i++) G.Pickups.drop('ticket', this.x + G.U.rand(-30, 30), this.y + G.U.rand(-20, 20), 1);
        for (let i = 0; i < 10; i++) G.Pickups.drop('coin', this.x + G.U.rand(-50, 50), this.y + G.U.rand(-35, 35), 8);
      }
      G.Audio.sfx(this.boss ? 'bossDown' : 'faint');
      if (this.shiny) {
        G.FX.burst(this.x, cy, '#ffe9a0', 30, 220);
        G.FX.ring(this.x, this.y, this.r, this.r * 7, '#9ae6ff', 0.7, 5);
        if (G.onShinyCaught) G.onShinyCaught(this);
      }
    }

    /**
     * Copy of a host's enemy: it moves toward the last position received
     * (plus the estimated speed, so it does not advance in jumps) and animates based on
     * how it moves or the animation it has on the host.
     */
    netUpdate(dt) {
      this.anim.update(dt);
      if (this.flash > 0) this.flash -= dt;
      if (this.dead) { this.fade -= dt; return; }
      if (this.touchCd > 0) this.touchCd -= dt;
      this.bob += dt * 6;
      if (this.shiny) {
        this.sparkT -= dt;
        if (this.sparkT <= 0) { this.sparkT = 0.22; G.FX.twinkle(this.x + G.U.rand(-this.r, this.r) * 1.2, this.y - G.U.rand(4, this.bodyH * 1.1)); }
      }
      const n = this.net;
      if (!n) return;
      // It extrapolates up to 0.3 s (over TURN 4 positions arrive per second).
      const lead = Math.min(0.3, n.age);
      n.age += dt;
      const tx = n.x + n.vx * lead, ty = n.y + n.vy * lead;
      const ox = this.x, oy = this.y;
      if (G.U.dist2(this.x, this.y, tx, ty) > 160 * 160) { this.x = tx; this.y = ty; }
      else { this.x = G.U.damp(this.x, tx, 12, dt); this.y = G.U.damp(this.y, ty, 12, dt); }
      const vx = (this.x - ox) / (dt || 1), vy = (this.y - oy) / (dt || 1);
      const moving = Math.abs(vx) + Math.abs(vy) > 8;
      this.anim.dir = n.dir;
      // One-shot animations (dash, shot...) started by the host.
      if (n.anim !== this.lastNetAnim) {
        this.lastNetAnim = n.anim;
        const a = G.Coop.ANIMS[n.anim];
        if (a && a !== 'Idle' && a !== 'Walk' && a !== 'Faint') this.anim.play(a, { speed: 1.4 });
      }
      this.anim.loop(moving ? 'Walk' : 'Idle');
    }

    update(dt, pl) {
      // Off-screen there is no need to animate (but to move and think, yes).
      const seen = G.Camera.sees(this.x, this.y, 120);
      if (seen || this.dead) this.anim.update(dt);
      if (this.flash > 0) this.flash -= dt;
      if (this.dead) { this.fade -= dt; return; }
      if (this.shiny && seen) {
        this.sparkT -= dt;
        if (this.sparkT <= 0) {
          this.sparkT = 0.22;
          G.FX.twinkle(this.x + G.U.rand(-this.r, this.r) * 1.2, this.y - G.U.rand(4, this.bodyH * 1.1));
        }
      }
      if (this.touchCd > 0) this.touchCd -= dt;
      this.bob += dt * 6;

      // --- estados ---
      if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slow = 0; }
      // Burn and poison (slice A): a fraction of MAX HP per turn, one tick per turn, see G.Enemies.STATUS.
      if (this.burn > 0) {
        this.burnTick -= dt;
        if (this.burnTick <= 0) {
          const S = G.Enemies.STATUS.burn;
          this.burnTick += S.turn;
          this.dot('burn', this.maxHp * S.frac, S.color);
          if (--this.burnLeft <= 0) this.burn = 0;
        }
      }
      if (this.poison > 0 && !this.dead) {
        this.poisonTick -= dt;
        if (this.poisonTick <= 0) {
          const bad = this.poison === 2, S = G.Enemies.STATUS[bad ? 'toxic' : 'poison'];
          this.poisonTick += S.turn;
          let frac = S.frac;
          if (bad) { this.poisonN = Math.min(S.cap, this.poisonN + 1); frac = S.step * this.poisonN; }
          this.dot(bad ? 'toxic' : 'poison', this.maxHp * frac, S.color);
          if (--this.poisonLeft <= 0) { this.poison = 0; this.poisonN = 0; }
        }
      }
      if (this.ailRoll) {
        let any = false;
        for (const k in this.ailRoll) { if ((this.ailRoll[k] -= dt) <= 0) delete this.ailRoll[k]; else any = true; }
        if (!any) this.ailRoll = null;
      }
      if (this.dead) return;

      // --- terreno ---
      let terrainMul = 1;
      // (The legendary is at home: its arena does not affect it. Arceus's ones, neither.)
      if (!this.flying && !this.legend && !this.judge && G.World.isLiquid(this.x, this.y)) {
        const le = G.World.liquidEffect(this.types);
        if (le.dmg) {
          this.lavaTick -= dt;
          if (this.lavaTick <= 0) { this.lavaTick = le.every; this.hurt(6 + this.maxHp * 0.04, le.color); }
          if (this.dead) return;
        } else if (le.slow) terrainMul = le.slow < 0.5 ? 0.45 : 0.55;
      }

      const spd = this.spd * (1 - this.slow) * terrainMul * G.Weather.speedFor(this.types);
      let [dx, dy] = G.U.norm(pl.x - this.x, pl.y - this.y);
      const dist = G.U.dist(this.x, this.y, pl.x, pl.y);
      const band = this.bandOf(), s = band ? this.screenDist(pl) : 0;     // spacing band (slice 1b)
      // Treasure imp: it flees from you (zigzagging) as soon as you approach.
      if (this.behavior === 'thief') {
        this.zig = (this.zig || 0) + dt;
        const near = dist < 300, a = Math.atan2(-dy, -dx) + Math.sin(this.zig * 2.2) * 0.7;
        const k = near ? 1 : 0.35;
        const vx0 = Math.cos(a) * spd * k, vy0 = Math.sin(a) * spd * k;
        const ox = this.x, oy = this.y;
        this.x += (vx0 + this.kx) * dt; this.y += (vy0 + this.ky) * dt;
        this.kx *= Math.pow(0.0015, dt); this.ky *= Math.pow(0.0015, dt);
        if (G.World.collide(this) && Math.hypot(this.x - ox, this.y - oy) < spd * k * dt * 0.3) this.zig += 1.4;
        if (Math.random() < dt * 6 && G.Camera.sees(this.x, this.y, 0)) G.FX.twinkle(this.x + G.U.rand(-this.r, this.r), this.y - G.U.rand(4, this.bodyH));
        this.anim.dir = G.Sprites.dirFromAngle(a);
        this.anim.loop('Walk', 1.4);
        return;
      }
      // Flanker: only a few individuals of the species are active at a time (FLANK.cap).
      if (this.def.flanker && !this.boss) this.flankCheck(dt);

      // --- personality (shields, jumps, explosion) ---
      if (this.shieldT > 0 && (this.shieldT -= dt) <= 0) this.shield = 0;
      if (this.jump) { this.updateJump(dt); return; }
      if (this.behavior === 'bomber' && this.phase === 'fuse') {
        this.pt -= dt;
        this.flash = Math.floor(this.pt * 10) % 2 ? 0.05 : 0;
        if (this.pt <= 0) { this.hp = 0; this.die(); }
        this.anim.loop('Idle');
        return;
      }
      if (this.behavior === 'bomber' && dist < this.r + pl.r + 26) { this.startFuse(); return; }
      if (this.behavior === 'shielder' || this.behavior === 'jumper') {
        this.skillCd -= dt;
        if (this.skillCd <= 0) {
          if (this.behavior === 'shielder') { this.skillCd = 6; this.castShields(); }
          else if (dist < 250) { this.skillCd = G.U.rand(5, 7); this.startJump(pl); return; }
          else this.skillCd = 0.5;
        }
      }

      // If it has been stuck against something for a while, it goes around one side.
      if (this.sideT > 0) {
        this.sideT -= dt;
        const a = Math.atan2(dy, dx) + this.side * 1.25;
        dx = Math.cos(a); dy = Math.sin(a);
      }

      // Path around the obstacles (the ones that do not fly).
      if (!this.flying && this.phase !== 'dash' && this.sideT <= 0 && !this.fl && !this.isSeeker()) {
        const pd = G.Path.dirFor(this, pl);
        // Inside its band a unit moves straight (no path-following); bosses keep the old range test.
        const near = band ? s < band[1] : this.keepsDistance() && dist < (this.def.range || 200) * 0.82;
        if (pd && !near) { dx = pd[0]; dy = pd[1]; }
      }

      let vx = dx * spd, vy = dy * spd;
      let animBase = 'Walk';

      if (this.boss) {
        [vx, vy, animBase] = this.bossMove(dt, pl, dist, dx, dy, spd);
      } else if (this.fl) {
        [vx, vy, animBase] = this.flankMove(dt, pl, spd, dist);
      } else if (this.isSeeker()) {
        [vx, vy, animBase] = this.seekMove(dt, pl, spd, dist);
      } else if (this.behavior === 'charger') {
        this.pt -= dt;
        if (this.phase === 'walk') {
          if (dist < 200 && this.pt <= 0) {
            this.phase = 'aim'; this.pt = 0.55;
            this.dx = dx; this.dy = dy;      // the line is locked now, so the warning shows exactly where the dash goes
            this.anim.play('Charge', { speed: 1.6 });
            // Warning only (warn: true = no damage). Its length is the dash distance: 0.42 s at 3.4x speed.
            G.Hazards.add({ kind: 'beam', warn: true, src: this, x: this.x, y: this.y, angle: Math.atan2(dy, dx),
                            len: spd * 3.4 * 0.42 + this.r, w: this.r * 2, delay: 0.55, dmg: 0, type: this.atkType, color: '#ff6b6b' });
          }
        } else if (this.phase === 'aim') {
          vx = vy = 0; animBase = 'Idle';
          if (this.pt <= 0) {
            this.phase = 'dash'; this.pt = 0.42;
            this.anim.play('Attack', { speed: 1.4 });
            G.FX.ring(this.x, this.y, this.r, this.r * 2.4, '#ff6b6b', 0.25, 2);
          }
        } else if (this.phase === 'dash') {
          vx = this.dx * spd * 3.4; vy = this.dy * spd * 3.4;
          if (this.pt <= 0) { this.phase = 'walk'; this.pt = 1.1; }
        }
      } else if (band) {
        // Spacing band (slice 1b): approach beyond band[1], hold between the two numbers, back away (0.8x) below band[0].
        // Straight toward you (not the path) to move away.
        const [ddx, ddy] = G.U.norm(pl.x - this.x, pl.y - this.y);
        if (s < band[0]) {
          let rx = -ddx, ry = -ddy;
          // Cornered: the stuck side-step also turns the retreat, so the unit slides along the wall instead of pushing into it.
          if (this.sideT > 0) { const a = Math.atan2(ry, rx) + this.side * 1.25; rx = Math.cos(a); ry = Math.sin(a); }
          vx = rx * spd * 0.8; vy = ry * spd * 0.8;
        } else if (s < band[1]) { vx *= 0.1; vy *= 0.1; animBase = 'Idle'; }
        if (this.keepsDistance()) {
          this.shotCd -= dt;
          if (this.shotCd <= 0 && s < band[1] * 1.05) {      // the ability gate follows the band, not def.range
            this.shotCd = this.def.shotCd || 2;
            this.special(pl, ddx, ddy);
          }
        }
      }

      // Contact gap: a melee walker stops a little short of overlapping you; the hit test (combat.js) reaches farther.
      if (this.meleeWalker() && dist <= (this.r + pl.r) * G.Enemies.CONTACT.stop) { vx = 0; vy = 0; }

      // --- integration ---
      const ox = this.x, oy = this.y;
      this.x += this.kx * dt; this.y += this.ky * dt;
      this.kx *= Math.pow(0.0015, dt); this.ky *= Math.pow(0.0015, dt);
      this.x += vx * dt; this.y += vy * dt;

      if (!this.flying && G.World.collide(this)) {
        // Did it advance quite a bit less than it wanted?
        const want = Math.hypot(vx, vy) * dt;
        const got = Math.hypot(this.x - ox, this.y - oy);
        if (want > 0.5 && got < want * 0.35) {
          this.stuckT += dt;
          if (this.stuckT > 0.35 && this.sideT <= 0) {
            this.sideT = 0.7; this.stuckT = 0;
            this.side = Math.random() < 0.5 ? -1 : 1;
          }
        } else this.stuckT = 0;
      }

      // --- animation ---
      const moving = Math.abs(vx) + Math.abs(vy) > 2;
      const faceA = this.phase === 'dash' ? Math.atan2(this.dy, this.dx)
                  : moving ? Math.atan2(vy, vx) : Math.atan2(pl.y - this.y, pl.x - this.x);
      this.anim.dir = G.Sprites.dirFromAngle(faceA);
      this.anim.loop(moving ? animBase : 'Idle', moving ? Math.max(0.6, spd / 70) : 1);
    }

    // ---------------- jefes ----------------
    // Each boss (and each rift legendary) has 4 attacks: 2 at
    // close (Stomp always + Dash or Jump) and 2 from range by type.
    // It alternates between coming at you and fighting from range, so the one that
    // shoots also charges at you and the melee one also
    // shoots. Everything warns on the ground. Below half health it
    // enrages: faster, less waiting and sometimes it chains two attacks.

    bossInit() {
      const T = this.types, has = (...xs) => xs.some(x => T.includes(x));
      const melee = ['slam', G.U.hash(this.dex, 3, 7) < 0.5 ? 'dash' : 'leap'];
      const pref = has('fire', 'ground', 'poison', 'rock', 'grass') ? 'rain'
                 : has('electric', 'psychic', 'dragon', 'ice', 'steel') ? 'beam'
                 : has('fairy', 'ghost', 'water', 'flying') ? 'nova' : 'volley';
      const others = ['rain', 'beam', 'nova', 'volley'].filter(x => x !== pref);
      const ranged = [pref, others[Math.floor(G.U.hash(this.dex, 5, 9) * 3) % 3]];
      const far = this.behavior === 'ranged';
      this.ai = { melee, ranged, farLike: far ? 0.65 : 0.35, mode: far ? 'far' : 'close', modeT: G.U.rand(6, 8),
                  cd: 1.6, cast: null, fury: false, side: Math.random() < 0.5 ? -1 : 1 };
    }

    bossMove(dt, pl, dist, dx, dy, spd) {
      if (!this.ai) this.bossInit();
      const ai = this.ai;
      if (!ai.fury && this.hp < this.maxHp * 0.5) this.enrage();
      const k = ai.fury ? 1.25 : 1;
      if (ai.cast) return this.bossCast(dt, pl);
      ai.modeT -= dt; ai.cd -= dt * k;
      // It always alternates: at its favorite range it stays longer (7-9 s) than at the other (4-5 s).
      if (ai.modeT <= 0) {
        ai.mode = ai.mode === 'far' ? 'close' : 'far';
        ai.modeT = (ai.mode === 'far') === (ai.farLike > 0.5) ? G.U.rand(7, 9) : G.U.rand(4, 5);
        ai.side = -ai.side;
      }
      let vx = dx * spd * k * 1.1, vy = dy * spd * k * 1.1;
      const [ddx, ddy] = G.U.norm(pl.x - this.x, pl.y - this.y);
      if (ai.mode === 'far') {
        if (dist < 170) { vx = -ddx * spd; vy = -ddy * spd; }
        else if (dist < 300) { vx = -ddy * spd * 0.55 * ai.side; vy = ddx * spd * 0.55 * ai.side; }   // te rodea
      }
      if (ai.cd <= 0) {
        let id = null;
        if (ai.mode === 'close') {
          const ok = ai.melee.filter(m => m === 'slam' ? dist < 125 : dist < 320);
          // Now and then, even when close, it also shoots.
          id = ok.length && Math.random() < 0.8 ? G.U.pick(ok) : dist < 480 ? G.U.pick(ai.ranged) : null;
        } else {
          id = dist < 115 ? 'slam' : dist < 430 ? G.U.pick(ai.ranged) : null;
        }
        if (id) this.bossStart(id, pl);
      }
      return [vx, vy, 'Walk'];
    }

    enrage() {
      this.ai.fury = true;
      this.spd *= 1.15;
      if (!this.judge) G.Spawner.say('¡' + this.name + ' se ha enfurecido!', 2.4);
      G.FX.ring(this.x, this.y, this.r, this.r * 5, '#ff4a4a', 0.6, 5);
      G.Camera.kick(0.5);
      G.Audio.sfx('boss');
    }

    bossStart(id, pl) {
      const ai = this.ai, f = ai.fury ? 0.8 : 1, type = this.atkType;
      const col = G.U.TYPE_COLOR[type] || '#ff7a9e';
      const ang = Math.atan2(pl.y - this.y, pl.x - this.x);
      const c = ai.cast = { id, t: 0, wind: 0.6 * f, after: 0.35, ang };
      switch (id) {
        case 'slam':       // stomp: a wave around
          c.wind = 0.85 * f;
          G.Hazards.add({ kind: 'zone', atkFactor: this.atkFactor, atkCat: this.atkCat, src: this, x: this.x, y: this.y, r: 96 + this.r, delay: c.wind, dmg: this.dmg * 1.3, type, color: col });
          this.anim.play('Charge', { speed: 1.2 });
          break;
        case 'dash':       // dash in a straight line
          c.wind = 0.75 * f; c.len = 330; c.dur = 0.32;
          G.Hazards.add({ kind: 'beam', atkFactor: this.atkFactor, atkCat: this.atkCat, src: this, x: this.x, y: this.y, angle: ang, len: c.len + this.r, w: this.r * 2 + 16,
                          delay: c.wind + c.dur, dmg: this.dmg * 1.2, type, color: col });
          this.anim.play('Charge', { speed: 1.3 });
          break;
        case 'leap':       // jump and land on you
          this.jump = { sx: this.x, sy: this.y, tx: pl.x, ty: pl.y, t: -0.5 * f, dur: 0.65 };
          G.Hazards.add({ kind: 'zone', atkFactor: this.atkFactor, atkCat: this.atkCat, src: this, x: pl.x, y: pl.y, r: 82, delay: 0.5 * f + 0.65, dmg: this.dmg * 1.25, type, color: col });
          this.anim.play('Charge', { speed: 1.4 });
          ai.cast = null; ai.cd = G.U.rand(1.4, 2) + 0.6;
          break;
        case 'rain': {     // zonas que caen alrededor de ti
          const n = ai.fury ? 6 : 4;
          for (let i = 0; i < n; i++) {
            const a = i ? Math.random() * 6.2832 : 0, d = i ? G.U.rand(40, 120) : 0;
            G.Hazards.add({ kind: 'zone', atkFactor: this.atkFactor, atkCat: this.atkCat, src: this, x: pl.x + Math.cos(a) * d, y: pl.y + Math.sin(a) * d * 0.8, r: 50,
                            delay: 1.05 + i * 0.12, dmg: this.shotDmg() * 1.15, type, color: col });
          }
          c.wind = 0.5; this.anim.play('Shoot');
          break;
        }
        case 'beam': {     // rayos en abanico
          const n = ai.fury ? 5 : 3, sp = ai.fury ? 0.42 : 0.5;
          for (let i = 0; i < n; i++) {
            G.Hazards.add({ kind: 'beam', atkFactor: this.atkFactor, atkCat: this.atkCat, src: this, x: this.x, y: this.y, angle: ang + (i - (n - 1) / 2) * sp, len: 400, w: 26,
                            delay: 1.0, dmg: this.shotDmg() * 1.2, type, color: col });
          }
          c.wind = 1.0; c.after = 0.25; this.anim.play('Charge', { speed: 1.1 });
          break;
        }
        case 'volley':     // abanico de disparos
        case 'nova':       // anillo de disparos
          c.wind = (id === 'nova' ? 0.7 : 0.5) * f;
          this.anim.play('Charge', { speed: 1.4 });
          G.FX.ring(this.x, this.y, this.r, this.r * 2.4, col, c.wind, 2);
          break;
      }
    }

    bossCast(dt, pl) {
      const ai = this.ai, c = ai.cast;
      c.t += dt;
      if (c.id === 'dash' && c.t >= c.wind) {
        if (!c.go) { c.go = true; this.anim.play('Attack', { speed: 1.6 }); }
        if (c.t >= c.wind + c.dur) return this.bossEnd();
        const sp = c.len / c.dur;
        return [Math.cos(c.ang) * sp, Math.sin(c.ang) * sp, 'Walk'];
      }
      if (c.t >= c.wind && !c.fired) {
        c.fired = true;
        const [ax, ay] = G.U.norm(pl.x - this.x, pl.y - this.y);
        if (c.id === 'volley') this.shoot(ax, ay, 1.1, ai.fury ? 9 : 7, 0.8);
        else if (c.id === 'nova') { const n = ai.fury ? 18 : 14; this.shoot(ax, ay, 6.2832 * (n - 1) / n, n, 0.7); }
        else if (c.id === 'slam') this.anim.play('Attack', { speed: 1.4 });
      }
      if (c.t >= c.wind + c.after) return this.bossEnd();
      return [0, 0, 'Idle'];
    }

    bossEnd() {
      const ai = this.ai;
      ai.cast = null;
      ai.cd = G.U.rand(1.3, 2.0);
      if (ai.fury && Math.random() < 0.35) ai.cd = 0.3;    // encadena otro
      return [0, 0, 'Idle'];
    }

    keepsDistance() { return ['ranged', 'fan', 'beamer', 'zoner', 'summoner'].includes(this.behavior); }

    /** Spacing band [retreat below, approach above] in screen units, or null. Bosses keep their own movement. */
    bandOf() { return this.boss ? null : (G.Enemies.BANDS[this.behavior] || null); }

    /** Distance to the player in screen units: 1.0 = the edge of the screen in that direction (the view is wider than tall). */
    screenDist(pl) { return Math.hypot((pl.x - this.x) / (G.Camera.w / 2), (pl.y - this.y) / (G.Camera.h / 2)); }

    shotDmg() { return (this.def.shotDmg || 10) * (this.dmg / this.def.dmg); }

    /** Life (seconds) of this enemy's normal shot: by class, see G.Enemies.SHOT_LIFE. */
    shotLife() { return (this.cls && G.Enemies.SHOT_LIFE[this.cls]) || G.Enemies.SHOT_LIFE_BASE; }

    /** Shielder and healer: they seek the biggest group of allies instead of holding a band. */
    isSeeker() { return !this.boss && (this.behavior === 'shielder' || this.behavior === 'healer'); }

    /** Walkers that stop at the contact gap: plain chasers, a charger while walking, a flanker only while striking. */
    meleeWalker() {
      if (this.boss) return false;
      if (this.fl) return this.fl.ph === 'strike' && this.behavior === 'chase';
      return this.behavior === 'chase' || (this.behavior === 'charger' && this.phase === 'walk');
    }

    /** Multiplier on the FINAL damage of this enemy's touch (combat.js): weak support melee, the flanker's strike. */
    contactMul() {
      if (this.fl) return G.Enemies.FLANK.strike;
      if (this.isSeeker()) return G.Enemies.SEEK.weakMelee;
      return 1;
    }

    /** Pixels from you, along direction `a`, of the middle of the shooter band (screen units to pixels). */
    bandPx(a) {
      const b = G.Enemies.BANDS.ranged;
      return ((b[0] + b[1]) / 2) / Math.hypot(Math.cos(a) / (G.Camera.w / 2), Math.sin(a) / (G.Camera.h / 2));
    }

    // ---------------- crowd-seeking support (shielder, healer) ----------------

    /** Picks the group of allies to stand by: the one with most allies inside its effect radius (healer: most WOUNDED). */
    seekPick() {
      const K = G.Enemies.SEEK, heal = this.behavior === 'healer', R = heal ? 150 : 160;
      let pool = G.EnemyMgr.queryCircle(this.x, this.y, K.scanR).filter(e => !e.dead && !e.boss && e !== this && !(heal && e.behavior === 'healer'));
      const hurt = heal ? pool.filter(e => e.hp < e.maxHp) : pool;
      if (hurt.length) pool = hurt;           // healer with nobody wounded just stays with the crowd
      if (!pool.length) { this.seekTarget = null; return; }
      const score = c => { let n = 0; for (const e of pool) if (G.U.dist2(e.x, e.y, c.x, c.y) <= R * R) n++; return n; };
      const cand = pool.slice().sort((a, b) => G.U.dist2(a.x, a.y, this.x, this.y) - G.U.dist2(b.x, b.y, this.x, this.y)).slice(0, K.sample);
      let best = null, bs = -1;
      for (const c of cand) { const sc = score(c); if (sc > bs) { bs = sc; best = c; } }
      const cur = this.seekTarget && !this.seekTarget.dead && pool.includes(this.seekTarget) ? this.seekTarget : null;
      if (!cur || bs - score(cur) >= K.switchBy) this.seekTarget = best;
    }

    /** Shielder / healer movement and attacks. Returns [vx, vy, anim]. */
    seekMove(dt, pl, spd, dist) {
      const K = G.Enemies.SEEK, s = this.screenDist(pl);
      this.seekT -= dt;
      if (this.seekT <= 0) { this.seekT = K.every; this.seekPick(); }
      const tg = this.seekTarget && !this.seekTarget.dead ? this.seekTarget : null;
      const [px, py] = G.U.norm(pl.x - this.x, pl.y - this.y);           // toward you
      let vx = 0, vy = 0;
      if (s < K.floor) { vx = -px * spd * 0.8; vy = -py * spd * 0.8; }   // too close: back away
      else if (tg) {
        const [tx, ty] = G.U.norm(tg.x - this.x, tg.y - this.y);
        const R = this.behavior === 'healer' ? 150 : 160;
        const intoFloor = s < K.floor * 1.15 && tx * px + ty * py > 0;   // the group is on your side of the floor: wait
        if (!intoFloor && G.U.dist(this.x, this.y, tg.x, tg.y) > R * K.stopK) { vx = tx * spd; vy = ty * spd; }
      } else if (s > K.alone) { vx = px * spd; vy = py * spd; }          // no allies in sight: stand off at `alone`
      if ((vx || vy) && this.sideT > 0) {
        const a = Math.atan2(vy, vx) + this.side * 1.25, m = Math.hypot(vx, vy);
        vx = Math.cos(a) * m; vy = Math.sin(a) * m;
      }
      if (this.behavior === 'healer') {
        this.shotCd -= dt;
        if (this.shotCd <= 0) { this.shotCd = this.def.shotCd || 2; this.healAround(); }
      }
      // Weak shot from range; touching you is the weak melee (combat.js, contactMul). Never both at once.
      this.weakCd -= dt;
      if (this.weakCd <= 0 && s < K.shotS && dist > this.r + pl.r + K.meleeGap) {
        this.weakCd = K.shotCd;
        this.shoot(px, py, 0, 1, 1, G.Enemies.SHOT_LIFE_BASE, K.weakShot);
      }
      return [vx, vy, vx || vy ? 'Walk' : 'Idle'];
    }

    // ---------------- flanker ----------------

    /** An individual becomes an ACTIVE flanker only while fewer than FLANK.cap are alive; the rest act as their base class. */
    flankCheck(dt) {
      if (this.fl) return;                    // once active it stays active until it dies
      this.flT -= dt;
      if (this.flT > 0) return;
      this.flT = 2;
      let n = 0;
      for (const e of G.EnemyMgr.all()) if (e.fl && !e.dead) n++;
      if (n < G.Enemies.FLANK.cap) this.fl = { ph: 'approach', sector: -1, scanT: 0, t: 0, holdT: 0 };
    }

    /** Enemies around you per wedge, within FLANK.scanR (it does not count itself). */
    flankSector(pl) {
      const F = G.Enemies.FLANK, cnt = new Array(F.sectors).fill(0);
      for (const e of G.EnemyMgr.queryCircle(pl.x, pl.y, F.scanR)) {
        if (e === this || e.dead) continue;
        cnt[Math.floor((Math.atan2(e.y - pl.y, e.x - pl.x) + Math.PI) / 6.2832 * F.sectors) % F.sectors]++;
      }
      return cnt;
    }

    /** Chooses the emptiest wedge; keeps the current one unless the best is FLANK.switchBy emptier. */
    flankPick(pl) {
      const F = G.Enemies.FLANK, fl = this.fl, cnt = this.flankSector(pl);
      const me = Math.atan2(this.y - pl.y, this.x - pl.x);
      let best = 0, bs = Infinity;
      for (let k = 0; k < cnt.length; k++) {
        const c = -Math.PI + (k + 0.5) * 6.2832 / F.sectors;
        const score = cnt[k] + Math.abs(angDiff(c, me)) * 0.01;         // fewest first, the nearer wedge breaks ties
        if (score < bs) { bs = score; best = k; }
      }
      if (fl.sector < 0 || cnt[fl.sector] - cnt[best] >= F.switchBy) fl.sector = best;
    }

    /** Called by combat.js when its strike landed: now it runs. */
    flankStruck() { this.fl.ph = 'retreat'; this.fl.t = 0; }

    /**
     * Phases: approach (curve round to the emptiest wedge, then dive to its stand point) > strike (ONE attack: a hit for
     * a melee flanker, waiting out your invulnerability up to FLANK.hold s; one shot for a shooter) > retreat (run to the
     * screen edge) > rest (FLANK.rest s) > approach again. Returns [vx, vy, anim].
     */
    flankMove(dt, pl, spd, dist) {
      const F = G.Enemies.FLANK, fl = this.fl, shooter = this.behavior === 'ranged';
      const speedAt = m => Math.max(spd, Math.min(spd * m, F.maxVsPlayer * (pl.spd || spd)));
      const ix = (pl.x - this.x) / (dist || 1), iy = (pl.y - this.y) / (dist || 1);     // toward you
      const ang = Math.atan2(this.y - pl.y, this.x - pl.x);                              // where it stands around you
      let vx = 0, vy = 0, sp = speedAt(F.approach);
      fl.t += dt;
      if (fl.ph === 'approach') {
        fl.scanT -= dt;
        if (fl.sector < 0 || fl.scanT <= 0) { fl.scanT = F.recheck; this.flankPick(pl); }
        const th = -Math.PI + (fl.sector + 0.5) * 6.2832 / F.sectors;
        const stand = shooter ? this.bandPx(th) : F.meleeStand;
        const dth = angDiff(th, ang), aligned = Math.abs(dth) < F.alignTol;
        // Not yet on its side: spiral inward to the orbit ring while circling toward the wedge. On it: dive to the stand point.
        const wantR = aligned ? stand : Math.max(stand, F.orbit);
        const wr = G.U.clamp((dist - wantR) / 80, -1, 1), sg = dth >= 0 ? 1 : -1, wt = aligned ? 0 : 1;
        const mx = ix * wr - Math.sin(ang) * sg * wt, my = iy * wr + Math.cos(ang) * sg * wt, m = Math.hypot(mx, my) || 1;
        vx = mx / m * sp; vy = my / m * sp;
        if (aligned && dist <= stand + 30) { fl.ph = 'strike'; fl.t = 0; fl.holdT = F.hold; }
      } else if (fl.ph === 'strike') {
        if (shooter) {
          this.shoot(ix, iy, 0, 1, 1, this.shotLife(), F.strike);
          fl.ph = 'retreat'; fl.t = 0;
        } else {
          vx = ix * sp; vy = iy * sp;            // dive on you; the contact gap stops it and combat.js lands the hit
          // The hold timer only runs once it is next to you; fl.t also caps the dive itself.
          if (dist <= (this.r + pl.r) * G.Enemies.CONTACT.hit + 2) fl.holdT -= dt;
          if (fl.holdT <= 0 || fl.t > F.hold + 3) { fl.ph = 'retreat'; fl.t = 0; }
        }
      } else if (fl.ph === 'rest') {
        if (fl.t >= F.rest) { fl.ph = 'approach'; fl.sector = -1; fl.scanT = 0; fl.t = 0; }
      } else {
        sp = speedAt(F.retreat);
        vx = -ix * sp; vy = -iy * sp;
        if (this.screenDist(pl) >= F.edge || fl.t > F.maxRetreat) { fl.ph = 'rest'; fl.t = 0; }
      }
      if ((vx || vy) && this.sideT > 0) {
        const a = Math.atan2(vy, vx) + this.side * 1.25, m = Math.hypot(vx, vy);
        vx = Math.cos(a) * m; vy = Math.sin(a) * m;
      }
      if ((vx || vy) && G.Camera.sees(this.x, this.y, 0) && Math.random() < dt * 10) G.FX.px(this.x - vx / sp * 8 + G.U.rand(-4, 4), this.y, '#e8dcc0', { vy: -12, life: 0.35 });
      return [vx, vy, vx || vy ? 'Walk' : 'Idle'];
    }

    /** Normal enemy shot (one, or several in a fan). */
    shoot(ax, ay, spread = 0, n = 1, k = 1, life = G.Enemies.SHOT_LIFE_BASE, mul = 1) {
      const sp = 190, type = this.atkType;
      const base = Math.atan2(ay, ax);
      for (let i = 0; i < n; i++) {
        const a = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread);
        const shot = G.Projectiles.spawn({
          x: this.x, y: this.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          dmg: this.shotDmg() * k, r: 7, life, mul, friendly: false, color: '#ff7a9e', mtype: type,
          atkFactor: this.atkFactor, atkCat: this.atkCat, src: this,
          vis: G.VFX.forType(type)
        });
        if (G.Coop.isHost) G.Coop.enemyShot(shot, type);
      }
      this.anim.play('Shoot');
      G.FX.ring(this.x, this.y - G.LIFT, 4, 14, '#ff7a9e', 0.2, 2);
    }

    /** What each personality does on its turn (host / solo). */
    special(pl, dx, dy) {
      const col = G.U.TYPE_COLOR[this.atkType] || '#ff7a9e';
      switch (this.behavior) {
        case 'fan': { const n = this.def.fanN || 5; this.shoot(dx, dy, n === 3 ? 0.6 : 0.9, n, 0.65); break; }
        case 'beamer':
          // Warned beam: first the strip is shown on the ground.
          G.Hazards.add({ kind: 'beam', atkFactor: this.atkFactor, atkCat: this.atkCat, src: this, x: this.x, y: this.y, angle: Math.atan2(dy, dx), len: 360, w: 22,
                          delay: 1.0, dmg: this.shotDmg() * 1.05, type: this.atkType, color: col });
          this.anim.play('Charge', { speed: 1.2 });
          break;
        case 'zoner': {
          const n = G.U.randInt(1, this.def.zones || 3);
          for (let i = 0; i < n; i++) {
            G.Hazards.add({ kind: 'zone', atkFactor: this.atkFactor, atkCat: this.atkCat, src: this, x: pl.x + (i ? G.U.rand(-70, 70) : 0), y: pl.y + (i ? G.U.rand(-55, 55) : 0), r: 44,
                            delay: 1.2, dmg: this.shotDmg() * 0.95, type: this.atkType, color: col });
          }
          this.anim.play('Shoot');
          break;
        }
        case 'summoner': this.summon(); break;
        default: this.shoot(dx, dy, 0, 1, 1, this.shotLife());
      }
    }

    healAround() {
      // Heal amount per target: 7% of max HP, scaled up by the player's attack
      // power (so healers stay relevant as you get stronger) to at most x2.5.
      const pow = Math.max(1, ...G.Game.everyone().map(p => (p.atk > 0 && p.baseAtk > 0 ? p.atk / p.baseAtk : 1)));
      const k = 0.07 * Math.min(2.5, Math.pow(pow, 0.35));

      // Self-preservation: below 35% HP the healer panics and patches ITSELF
      // only this turn (it skips the group). A one-off, so you can still finish
      // it off by out-damaging a single heal tick.
      if (this.hp < this.maxHp * 0.35) {
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * k);
        this.anim.play('Charge');
        G.FX.burst(this.x, this.y - this.bodyH * 0.6, '#ffe066', 8, 90);   // yellow = self-heal
        G.FX.ring(this.x, this.y, 6, 90, '#ffe066', 0.5, 3);
        if (G.Coop.isHost) G.Coop.broadcast(['fxr', Math.round(this.x), Math.round(this.y), 90, '#ffe066']);
        if (G.Camera.sees(this.x, this.y, 0)) G.Audio.sfx('heal');
        return;
      }

      // Otherwise heal the 3 MOST-WOUNDED allies in range. Never heals other
      // healers (so a healer cluster can't self-sustain and can be broken apart).
      const hurt = G.EnemyMgr.queryCircle(this.x, this.y, 150)
        .filter(e => !e.dead && e.hp < e.maxHp && e.behavior !== 'healer' && e !== this)
        .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))
        .slice(0, 3);
      for (const e of hurt) {
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * k);
        G.FX.burst(e.x, e.y - e.bodyH * 0.6, '#7dffb0', 5, 60);
      }
      this.anim.play('Charge');
      G.FX.ring(this.x, this.y, 8, 150, '#5fe08a', 0.5, 3);
      if (G.Coop.isHost) G.Coop.broadcast(['fxr', Math.round(this.x), Math.round(this.y), 150, '#5fe08a']);
      if (hurt.length && G.Camera.sees(this.x, this.y, 0)) G.Audio.sfx('heal');
    }

    castShields() {
      const near = G.EnemyMgr.queryCircle(this.x, this.y, 160).filter(e => !e.dead)
        .sort((a, b) => G.U.dist2(a.x, a.y, this.x, this.y) - G.U.dist2(b.x, b.y, this.x, this.y)).slice(0, 6);
      for (const e of near) { e.shield = Math.max(e.shield, e.maxHp * 0.35); e.shieldT = 8; }
      this.anim.play('Charge');
      G.FX.ring(this.x, this.y, 8, 160, '#7fc8ff', 0.5, 3);
      if (G.Coop.isHost) G.Coop.broadcast(['fxr', Math.round(this.x), Math.round(this.y), 160, '#7fc8ff']);
    }

    summon() {
      this.minions = this.minions.filter(m => !m.dead && G.EnemyMgr.get(m.id));
      // With the general enemy cap (fewer Pokemon on screen), with a small margin.
      if (this.minions.length >= 4 || G.EnemyMgr.count > G.Spawner.CAP + 15) return;
      const dex = this.def.unique === 'summon-from-cast' ? G.Enemies.minionFromCast((this.sc && this.sc.t) || 0, this.dex) : (this.def.minion || this.dex);
      const mon = G.DEX_BY[dex];
      // Minion HP comes from the mainline formula at spawn (via its own baseHp), like any
      // wild enemy. (Was 0.35x the summoner's HP under the old flat model.)
      const def = { dex, name: mon ? mon.name : '', baseHp: (mon && mon.stats) ? mon.stats[0] : 50, spd: Math.round(this.def.spd * 1.1),
                    dmg: Math.round(this.def.dmg * 0.6), xp: Math.max(1, Math.round(this.def.xp * 0.25)), behavior: 'chase',
                    bx: (mon && mon.bx != null) ? mon.bx : 100, xpMul: 0.25 };   // minions pay a quarter of a normal kill
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * 6.2832;
        const m = new Enemy(def, this.x + Math.cos(a) * 30, this.y + Math.sin(a) * 22, this.sc || { hp: 1, spd: 1, dmg: 1 });
        G.EnemyMgr.add(m);
        this.minions.push(m);
        G.FX.burst(m.x, m.y - 8, '#c47bff', 8, 90);
      }
      this.anim.play('Charge');
      G.FX.ring(this.x, this.y, 8, 50, '#c47bff', 0.4, 3);
    }

    startFuse() {
      this.phase = 'fuse'; this.pt = 1.0;
      G.Hazards.add({ kind: 'zone', atkFactor: this.atkFactor, atkCat: this.atkCat, src: this, x: this.x, y: this.y, r: 62, delay: 1.0, dmg: this.dmg * 1.4, type: this.atkType, color: '#ff7b3d' });
    }

    startJump(pl) {
      const tx = pl.x, ty = pl.y;
      this.jump = { sx: this.x, sy: this.y, tx, ty, t: -0.45, dur: 0.6 };
      this.anim.play('Charge', { speed: 1.4 });
      G.Hazards.add({ kind: 'zone', atkFactor: this.atkFactor, atkCat: this.atkCat, src: this, x: tx, y: ty, r: 50, delay: 1.05, dmg: this.dmg * 1.2, type: this.atkType,
                      color: G.U.TYPE_COLOR[this.atkType] || '#ff7a9e' });
    }

    /** Jump: it crouches, flies in an arc and lands where you were. */
    updateJump(dt) {
      const j = this.jump;
      j.t += dt;
      if (j.t < 0) { this.anim.loop('Idle'); return; }
      const k = Math.min(1, j.t / j.dur);
      this.x = j.sx + (j.tx - j.sx) * k;
      this.y = j.sy + (j.ty - j.sy) * k;
      this.jumpLift = Math.sin(k * Math.PI) * 46;
      this.anim.dir = G.Sprites.dirFromAngle(Math.atan2(j.ty - j.sy, j.tx - j.sx));
      if (k >= 1) {
        this.jump = null; this.jumpLift = 0;
        if (!this.flying) G.World.collide(this);
        this.anim.play('Attack', { speed: 1.4 });
      }
    }

    /** Called by combat.js when it hits you: animates the hit. */
    strike(pl) {
      if (!this.anim.busy()) {
        this.anim.dir = G.Sprites.dirFromAngle(Math.atan2(pl.y - this.y, pl.x - this.x));
        this.anim.play('Attack', { speed: 1.5 });
      }
    }

    draw(ctx) {
      const alpha = this.dead ? G.U.clamp(this.fade / 0.5, 0, 1) : 1;
      if (alpha <= 0) return;

      const gold = this.golden || this.behavior === 'thief' || (this.remote && !this.boss && G.Events.golden);
      if ((this.boss || this.shiny || gold) && !this.dead) {
        ctx.save();
        ctx.globalAlpha = (gold && !this.boss ? 0.32 : 0.22) + Math.sin(this.bob * 0.5) * 0.06;
        ctx.fillStyle = this.ai && this.ai.fury ? '#ff4a4a' : this.shiny ? '#9ae6ff' : gold ? '#ffd23f' : '#ffd95e';
        ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r * 1.6, this.r * 0.6, 0, 0, 6.2832); ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      G.Sprites.drawShadow(ctx, this.dex, this.x, this.y, this.scale);
      // Those that float are already in the air in their sprite: they only sway a bit.
      // (And the ones that jump, in an arc.)
      const lift = (this.flying && !this.boss ? 1 + Math.sin(this.bob) * 1.5 : 0) + (this.jumpLift || 0);
      this.anim.draw(ctx, this.x, this.y - lift, { flash: this.flash > 0, alpha });
      ctx.restore();

      if (this.dead) return;

      // Escudo: burbuja azul.
      if (this.shield > 0 || (this.net && this.net.st & 4)) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(this.bob) * 0.08;
        ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(127,200,255,.14)';
        ctx.beginPath(); ctx.ellipse(this.x, this.y - this.bodyH * 0.45, this.r * 1.5, this.bodyH * 0.65, 0, 0, 6.2832);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      if (this.burn > 0 || this.poison > 0 || (this.net && this.net.st & 3)) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = this.burn > 0 || (this.net && this.net.st & 1) ? '#ff8a3d' : '#c86bdc';
        ctx.beginPath(); ctx.ellipse(this.x, this.y, this.r * 1.2, this.r * 0.5, 0, 0, 6.2832); ctx.fill();
        ctx.restore();
      }

      // Support ones: an icon above, to know who to go for first.
      const SUP = { healer: 'heart', shielder: 'shield', summoner: 'friends' };
      if (SUP[this.behavior]) G.Icons.draw(ctx, SUP[this.behavior], Math.round(this.x - 6), Math.round(this.y - this.bodyH - (this.hp < this.maxHp ? 26 : 18)), 12);

      if (this.boss || this.hp < this.maxHp) {
        const w = this.boss ? 90 : Math.max(22, this.r * 2);
        const y = this.y - this.bodyH - 10;
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(this.x - w / 2, y, w, 3.4);
        ctx.fillStyle = this.boss ? '#ffcb3d' : '#ff5f6d';
        ctx.fillRect(this.x - w / 2, y, w * Math.max(0, this.hp / this.maxHp), 3.4);
      }
    }
  }

  // ---------------- gestor ----------------

  G.Enemy = Enemy;

  G.EnemyMgr = (() => {
    let list = [];            // vivos
    let corpses = [];         // falling / fading away
    const CELL = 52;
    const grid = new Map();

    const byId = new Map();
    function clear() { list = []; corpses = []; grid.clear(); byId.clear(); }
    function all() { return list; }
    function add(e) {
      list.push(e);
      byId.set(e.id, e);
      if (G.Coop.isHost) G.Coop.enemyAdded(e);
      return e;
    }
    function get(id) { return byId.get(id); }

    /** Local copy of a host's enemy (co-op). */
    function addRemote(o) {
      if (byId.has(o.id)) return byId.get(o.id);
      const def = { dex: o.dex, hp: o.hp, spd: 0, dmg: o.dmg, xp: 0, behavior: o.beh || 'remote' };
      const e = new Enemy(def, o.x, o.y, { hp: 1, spd: 1, dmg: 1 }, o.boss);
      e.id = o.id;
      e.remote = true;
      if (o.shiny) e.makeShiny();
      e.maxHp = o.hp; e.hp = o.hp;
      e.net = { x: o.x, y: o.y, vx: 0, vy: 0, age: 0, dir: 0, anim: 0, st: 0 };
      list.push(e);
      byId.set(e.id, e);
      return e;
    }

    // --- rift arena ---
    let stashed = null;

    /** Stashes the map enemies while the arena lasts. */
    function stash() {
      stashed = list.filter(e => !e.dead);
      for (const e of stashed) byId.delete(e.id);
      list = []; corpses = [];
    }

    /** On returning: removes the arena ones and brings back the map ones (notifying the others). */
    function restore() {
      for (const e of list) { byId.delete(e.id); if (G.Coop.isHost) G.Coop.enemyGone(e, false); }
      list = []; corpses = [];
      for (const e of stashed || []) add(e);
      stashed = null;
    }

    /** Guest: deletes the copies (they will arrive again from the host). */
    function clearRemote() {
      for (const e of list) if (e.remote) byId.delete(e.id);
      list = list.filter(e => !e.remote);
      corpses = corpses.filter(e => !e.remote);
    }

    /** Removes a copy (the host says it fell or moved away). */
    function removeRemote(id, died) {
      const e = byId.get(id);
      if (!e) return;
      byId.delete(id);
      if (died) { e.die(); G.Progress.kill(e); }
      const i = list.indexOf(e);
      if (i >= 0) list.splice(i, 1);
      if (died) corpses.push(e);
    }

    function key(cx, cy) { return cx * 73856093 ^ cy * 19349663; }

    function rebuildGrid() {
      grid.clear();
      for (const e of list) {
        if (e.dead) continue;
        const k = key(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
        let b = grid.get(k);
        if (!b) grid.set(k, b = []);
        b.push(e);
      }
    }

    /** Live enemies whose circle touches this circle. */
    function queryCircle(x, y, r) {
      const out = [];
      const c0x = Math.floor((x - r) / CELL) - 1, c1x = Math.floor((x + r) / CELL) + 1;
      const c0y = Math.floor((y - r) / CELL) - 1, c1y = Math.floor((y + r) / CELL) + 1;
      for (let cy = c0y; cy <= c1y; cy++) {
        for (let cx = c0x; cx <= c1x; cx++) {
          const b = grid.get(key(cx, cy));
          if (!b) continue;
          for (const e of b) {
            if (e.dead) continue;
            const rr = r + e.r;
            if (G.U.dist2(x, y, e.x, e.y) <= rr * rr) out.push(e);
          }
        }
      }
      return out;
    }

    function separate(dt) {
      for (const e of list) {
        if (e.dead) continue;
        const cx = Math.floor(e.x / CELL), cy = Math.floor(e.y / CELL);
        let px = 0, py = 0, n = 0;
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const b = grid.get(key(cx + i, cy + j));
            if (!b) continue;
            for (const o of b) {
              if (o === e || o.dead) continue;
              const min = (e.r + o.r) * 0.82;
              const dx = e.x - o.x, dy = e.y - o.y;
              const d2 = dx * dx + dy * dy;
              if (d2 > min * min || d2 < 1e-4) continue;
              const d = Math.sqrt(d2);
              const f = (min - d) / min;
              px += (dx / d) * f; py += (dy / d) * f;
              if (++n > 6) break;
            }
          }
        }
        if (n) {
          e.x += px * 42 * dt;
          e.y += py * 42 * dt;
          if (!e.flying) G.World.collide(e);
        }
      }
    }

    /** The nearest live player (the downed ones attract no one). */
    function nearestPlayer(players, x, y) {
      let best = null, bd = Infinity;
      for (const p of players) {
        if (p.dead) continue;
        const d = G.U.dist2(x, y, p.x, p.y);
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }

    /**
     * @param players  [local player, ...teammates]. The stats of the
     *                 run (defeated, bosses) are recorded on the first one.
     */
    // Seconds a straggler has to be out of sight before coming back out ahead.
    const LAG_T = 2.5;

    function update(dt, players) {
      if (!Array.isArray(players)) players = [players];
      const pl = players[0];
      // Smoothed speed of each player (also valid for the teammates).
      for (const p of players) {
        if (p._px != null && dt > 0) {
          const k = Math.min(1, dt * 5);
          p._vx += ((p.x - p._px) / dt - p._vx) * k; p._vy += ((p.y - p._py) / dt - p._vy) * k;
          if (Math.abs(p.x - p._px) > 200 || Math.abs(p.y - p._py) > 200) p._vx = p._vy = 0;    // teletransporte
        } else { p._vx = 0; p._vy = 0; }
        p._px = p.x; p._py = p.y;
      }
      rebuildGrid();
      for (const e of list) {
        if (e.remote) e.netUpdate(dt);
        else e.update(dt, nearestPlayer(players, e.x, e.y) || pl);
      }
      if (!G.Coop.active || G.Coop.isHost) separate(dt);
      for (let i = list.length - 1; i >= 0; i--) {
        const e = list[i];
        if (e.remote) continue;
        if (e.dead) {
          pl.kills++;
          if (G.Log.on) G.Log.kill(e);
          if (e.boss && !e.judge) pl.bosses++;
          G.Progress.kill(e);
          corpses.push(e);
          list.splice(i, 1);
          byId.delete(e.id);
          if (G.Coop.isHost) G.Coop.enemyGone(e, true);
          continue;
        }
        const near = nearestPlayer(players, e.x, e.y) || pl;
        // The treasure imp escapes if you do not catch it in time.
        if (e.behavior === 'thief' && (e.life -= dt) <= 0) {
          G.FX.burst(e.x, e.y - 10, '#ffd23f', 16, 140);
          G.Spawner.say('¡' + e.name + ' se ha escapado!', 2.4);
          list.splice(i, 1); byId.delete(e.id);
          if (G.Coop.isHost) G.Coop.enemyGone(e, false);
          continue;
        }
        if (e.boss || e.shiny || G.Rift.inArena) continue;
        // Stragglers: the ones that fall behind while you run and have been a while
        // OUT OF SIGHT (of everyone) come back out ahead of you. This way
        // you cannot just flee, and one you are looking at never disappears.
        const d2 = G.U.dist2(e.x, e.y, near.x, near.y);
        const R = G.Camera.outerRadius() + 40;
        const unseen = d2 > R * R && !G.Camera.sees(e.x, e.y, 60);
        const sp = Math.hypot(near._vx || 0, near._vy || 0);
        const behind = sp > 40 && ((e.x - near.x) * near._vx + (e.y - near.y) * near._vy) < -0.2 * Math.sqrt(d2) * sp;
        if (unseen && behind) e.lagT += dt;
        else if (!unseen) e.lagT = 0;
        if ((unseen && e.lagT > LAG_T) || d2 > 1400 * 1400) {
          e.lagT = 0;
          if (!G.Spawner.ahead(e, near)) { list.splice(i, 1); byId.delete(e.id); if (G.Coop.isHost) G.Coop.enemyGone(e, false); }
        }
      }
      for (let i = corpses.length - 1; i >= 0; i--) {
        if (corpses[i].remote) corpses[i].netUpdate(dt); else corpses[i].update(dt, pl);
        if (corpses[i].fade <= 0) corpses.splice(i, 1);
      }
      if (corpses.length > 120) corpses.splice(0, corpses.length - 120);
    }

    /** What to draw sorted by Y along with the rest of the scene. */
    function drawables(cam) {
      const out = [];
      for (const e of corpses) if (cam.sees(e.x, e.y, 80)) out.push(e);
      for (const e of list) if (cam.sees(e.x, e.y, 80)) out.push(e);
      return out;
    }

    function bossAlive() { return list.some(e => e.boss && !e.dead); }
    function shinies() { return list.filter(e => e.shiny && !e.dead); }

    return { clear, all, add, get, addRemote, removeRemote, stash, restore, clearRemote, update, drawables, queryCircle, rebuildGrid, bossAlive, shinies, nearestPlayer,
             get count() { return list.length; } };
  })();
})();
