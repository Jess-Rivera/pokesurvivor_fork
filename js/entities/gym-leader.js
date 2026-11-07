/* ============ gym-leader.js: a gym leader as a Player entity (G.GymLeader) ============
 * Entity model slice 5 (docs/proposals/host-model-plan.md, Jess 2026-11-06): a leader's mon follows the rules you follow (G.PlayerEntity:
 * HP formula, hit defense, statuses, stages, walls), driven by the same G.Boss.GymBrain the old body uses. G.Boss.make builds one for a
 * gym with `playerEntity` in js/data/gyms.js; the other gyms stay on the wild body until slice 12. It lives in the enemy list, so your
 * aim, your moves and the HUD find it as before. One mon with all its moves in one group, as before: teams are slice 7, one active
 * slot slice 8. Slice 6: your attack formula (x the enrage, only when the gym authors
 * it), your stat profile, cards (team cards included) and items. Its own: HP x hpMult, the authored restrictions (status cut, hard CC
 * gap, auto shake, hit i-frames; none authored means your rules), no touch damage (combat.js), the enrage trigger, drops and faint
 * effects, and the boss look. COMBAT-RULES "Host model".
 */
G.GymLeader = class GymLeader extends G.PlayerEntity {
  /** @param def the leader's def from G.Gym.makeDef; def.gym holds its level, hpMult, moves, cards and restrictions */
  constructor(def, x, y) {
    super(G.DEX_BY[def.dex], {}, false, def.gym.profile ? G.Stats.profile(def.gym.profile) : null); // slice 6 (D3): IVs, EVs, nature
    this.id = G.EnemyMgr.newId();
    this.def = def;
    this.name = this.mon.name;
    this.x = x;
    this.y = y;
    this.boss = true;
    this.gym = def.gym;
    this.flying = false;
    this.types = this.mon.types || [];
    this.atkBase = this.baseAtkStat; // the brain's attack factor reads these two
    this.spaBase = this.baseSpAStat;
    this.fade = 0; // seconds of the faint fade left; the enemy list drops a corpse at 0
    this.level = this.gym.level;
    this.hpMult = this.gym.hpMult;
    this.brain = new G.Boss.GymBrain(this); // first (slice 6, finding C): its card store holds the Vitamins that max HP reads
    this.maxHp = this.maxHpAt(this.level);
    this.hp = this.maxHp;
    this.moves = this.slots[0];
    for (const s of this.moves) s.type = G.MoveDefs[s.id].type;
    this.arm();
    this.heading = [0, 0];
    this.controller = Object.assign({}, G.PlayerEntity.IDLE, { axis: () => this.heading });
    this.stuckT = 0; // edge unstick (Jess 2026-11-07): seconds of moving far less than the heading meant
    this.sideT = 0; // seconds left of the side-step
    this.side = 1; // which way the side-step turns the heading (+1 is the brain's circling sense)
  }

  /** A Player entity the human fights: the hit paths and the dev log tell it from you by this. */
  get isRival() {
    return true;
  }
  /** Never a STRONG host (G.Status.strong); its status differences are the authored restrictions below (slice 6, Q3). */
  get leaderStatus() {
    return true;
  }
  /** An authored restriction (js/data/gyms.js `restrictions`, slice 6 Q3), or null when the gym authors none (then your rule applies). */
  rule(k) {
    const r = this.gym.restrictions;
    return r && r[k] != null ? r[k] : null;
  }
  /** Hit i-frames: authored, else yours. */
  get hitIframes() {
    const v = this.rule('hitIframes');
    return v != null ? v : super.hitIframes;
  }
  /** Freeze and sleep length multiplier, read by G.Status: authored, else 1 (your length). */
  get statusCut() {
    const v = this.rule('statusCut');
    return v != null ? v : 1;
  }
  /** Seconds after a hard CC ends with no new hard CC, read by G.Status: authored, else your G.Status.GRACE. */
  get ccWindow() {
    const v = this.rule('ccWindow');
    return v != null ? v : G.Status.GRACE;
  }
  /** Your attack formula (slice 6, D1: Protein, IVs, nature, held and run items, stages) x the enrage, which is 1 unless the gym
   *  authors it (G.Gym.enrageMul). The power knob is not read: a switched gym must leave it at 1 (G.Gyms.validate). */
  moveFactor(m) {
    return super.moveFactor(m) * G.Gym.enrageMul(this);
  }
  /** Equips the authored held item and run items through the same on / off code as yours (slice 6, Q4). Runs after the brain (Quick
   *  Claw multiplies its tempo cooldown) and after max HP (Leftovers and Black Sludge read it). */
  arm() {
    if (this.gym.item) this.equip(this.gym.item);
    for (const id of this.gym.runItems || []) {
      G.Items.BY[id].on(this);
      this.runItems.push(id);
    }
  }
  /** The player formula x the authored hpMult (plan decision 2). */
  maxHpAt(level) {
    return Math.round(super.maxHpAt(level) * this.hpMult);
  }

  /** One frame: the AI shakes off at the auto rate, the brain picks the heading (not while frozen or asleep, when it does not step at
   *  all), and the Player entity rules do the rest. The enemy list passes the nearest player, and keeps updating a corpse for its fade. */
  update(dt, pl) {
    if (this.dead) {
      this.anim.update(dt);
      this.fade -= dt;
      return;
    }
    if (this.rule('autoShake') !== false) G.Status.autoShake(this, dt); // N3: on unless the gym turns it off (an AI has no hands)
    this.heading = G.Status.stunned(this) ? [0, 0] : this.unstick(dt, this.steer(dt, pl));
    const ox = this.x,
      oy = this.y;
    super.update(dt);
    this.noteStuck(dt, ox, oy);
  }
  /** Asks the brain where to go: the way to you (around walls, G.Path) and speed 1, so its answer is a heading for the controller. */
  steer(dt, pl) {
    let [dx, dy] = G.U.norm(pl.x - this.x, pl.y - this.y);
    const pd = G.Path.dirFor(this, pl);
    if (pd) [dx, dy] = pd;
    const [vx, vy] = this.brain.step(dt, pl, G.U.dist(this.x, this.y, pl.x, pl.y), dx, dy, 1);
    return [vx, vy];
  }
  aimTargets() {
    return this.foes();
  }

  // Edge unstick (Jess 2026-11-07, map: docs/ASCII Concept Maps/Gym Leader - Edge Unstick.txt). The wild body's side-step
  // (enemy.js) on the Player entity, plus a smart side. Walls already slide her (G.World.collide); this frees her on corners.
  /** While a side-step lasts, the heading turns UNSTICK.turn rad toward this.side. */
  unstick(dt, h) {
    if (this.sideT <= 0) return h;
    this.sideT -= dt;
    if (!h[0] && !h[1]) return h;
    const a = Math.atan2(h[1], h[0]) + this.side * GymLeader.UNSTICK.turn,
      m = Math.hypot(h[0], h[1]);
    return [Math.cos(a) * m, Math.sin(a) * m];
  }
  /** After the step: moving under UNSTICK.slip of what the heading meant, for over UNSTICK.stuck s, starts a side-step. */
  noteStuck(dt, ox, oy) {
    const U = GymLeader.UNSTICK,
      [hx, hy] = this.heading;
    if (this.dead || this.stuckFree(hx, hy)) {
      this.stuckT = 0;
      return;
    }
    const want = Math.hypot(hx, hy) * this.spd * dt,
      got = Math.hypot(this.x - ox, this.y - oy);
    if (want <= 0.5 || got >= want * U.slip) {
      this.stuckT = 0;
      return;
    }
    this.stuckT += dt;
    if (this.stuckT > U.stuck && this.sideT <= 0) {
      this.sideT = U.side;
      this.stuckT = 0;
      this.side = this.pickSide();
    }
  }
  /** Frames that never count as stuck: no heading (attacking, stunned), or something else moves her (dash, flinch, push,
   *  dodge, Fly), a root holds her, or ice is sliding her. */
  stuckFree(hx, hy) {
    if (!hx && !hy) return true;
    if (this.mvRoot || this.stFl || this.stPush || this.dodgeT > 0 || this.flyT > 0 || this.frozen) return true;
    if (G.Status.stunned(this) || G.Status.rooted(this)) return true;
    return this.inLiquid && !!G.World.liquidEffect(this.mon.types).slide;
  }
  /** The side with more room one probe ahead; about even, the side she circles (the brain's); both shut, random. */
  pickSide() {
    const U = GymLeader.UNSTICK,
      l = this.probeSide(-1),
      r = this.probeSide(1);
    if (Math.max(l, r) < U.shut) return Math.random() < 0.5 ? -1 : 1;
    if (Math.abs(l - r) < U.tie) return this.brain.side < 0 ? -1 : 1;
    return l > r ? -1 : 1;
  }
  /** How far a test circle of her radius gets in UNSTICK.probe px along the turned heading, sliding on walls in 8 px steps. */
  probeSide(s) {
    const U = GymLeader.UNSTICK,
      [hx, hy] = this.heading,
      a = Math.atan2(hy, hx) + s * U.turn,
      b = { x: this.x, y: this.y, r: this.r },
      n = Math.ceil(U.probe / 8);
    for (let k = 0; k < n; k++) {
      b.x += (Math.cos(a) * U.probe) / n;
      b.y += (Math.sin(a) * U.probe) / n;
      G.World.collide(b);
    }
    return Math.hypot(b.x - this.x, b.y - this.y);
  }

  /** The first hit that lands starts the enrage clock, damage over time included; an immune hit does not. */
  hurt(amount, type, pure, atk, who) {
    const hp0 = this.hp,
      res = super.hurt(amount, type, pure, atk, who);
    if (this.hp < hp0 && this.gym.engagedAt == null) this.gym.engagedAt = G.Gym.now();
    return res;
  }
  /** Flinch keeps the old leader rule until slice 8 (D5): the tell is lost. Your rule restarts the active group, here every move. */
  applyFlinch() {
    if (this.dead || G.Status.stunned(this)) return false;
    this.brain.flinch();
    return this.flinchRecoil();
  }
  /** The look of a hit on a boss (D6): the move type's color, yellow super, grey weak, orange crit, always big. */
  showHit(d, eff, atk, type) {
    const col = (atk && atk.color) || G.U.TYPE_COLOR[type] || '#fff',
      show = atk && atk.crit ? '#ff9a3c' : eff === 'super' ? '#ffe14d' : eff === 'weak' ? '#a3abb8' : col;
    this.flash = 0.09;
    G.FX.dmgText(this.x, this.y - this.bodyH - 4, Math.round(d), show, true);
    G.FX.spark(this.x, this.y - this.bodyH * 0.5, col, 0, 0, 3);
    if (!this.anim.busy()) this.anim.play('Hurt');
    G.Audio.sfx('hit');
  }
  /** The boss faint: the fade, the burst, its coins and item (a level is paid by the badge, not orbs), and the Snowball Badge's feed. */
  onFaint() {
    this.fade = 0.9;
    const q = G.Game.player;
    if (q && q.runItems && q.runItems.includes('snowballbadge') && G.Items.snowballAdd) G.Items.snowballAdd(this.maxHp);
    G.FX.burst(this.x, this.y - this.bodyH * 0.5, '#ffd95e', 34, 260);
    G.FX.ring(this.x, this.y, this.r, this.r * 6, '#ffd95e', 0.6, 6);
    G.Camera.kick(0.9);
    G.Drops.roll('gym', this.x, this.y);
    G.Audio.sfx('bossDown');
  }

  // What ground traps and G.Debug call on anything in the enemy list, answered by the Player entity status rules.
  applyBurn(lv = 1, ignoreImmune = false, mul = 1, durMul = 1) {
    G.Status.applyDot(this, 'burn', mul, durMul);
  }
  applyPoison(lv = 1, mul = 1) {
    G.Status.applyDot(this, lv >= 2 ? 'toxic' : 'poison', mul);
  }
  applySlow(factor, dur = 1.2) {
    this.slowT = Math.max(this.slowT, dur);
  }
  applyStatus(kind, mul = 1) {
    return G.Status.apply(this, kind, mul);
  }

  /** The Player entity draw, plus the boss glow under it and the gold bar over it (D6). A corpse only fades. */
  draw(ctx) {
    if (this.dead) {
      const alpha = G.U.clamp(this.fade / 0.5, 0, 1);
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      G.Sprites.drawShadow(ctx, this.dex, this.x, this.y);
      this.anim.draw(ctx, this.x, this.y, { alpha });
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(performance.now() / 330) * 0.06;
    ctx.fillStyle = '#ffd95e';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.r * 1.6, this.r * 0.6, 0, 0, 6.2832);
    ctx.fill();
    ctx.restore();
    super.draw(ctx);
    const y = this.y - this.bodyH - 10;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(this.x - 45, y, 90, 3.4);
    ctx.fillStyle = '#ffcb3d';
    ctx.fillRect(this.x - 45, y, 90 * Math.max(0, this.hp / this.maxHp), 3.4);
  }
};
/** Edge unstick numbers (Jess 2026-11-07). slip, stuck, side, turn: the wild body's (enemy.js). probe, tie, shut (px): the
 *  smart side's look-ahead, the gap that counts as even, and the room below which a side counts as shut. */
G.GymLeader.UNSTICK = { slip: 0.35, stuck: 0.35, side: 0.7, turn: 1.25, probe: 24, tie: 4, shut: 4 };
