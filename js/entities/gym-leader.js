/* ============ gym-leader.js: a gym leader as a Player entity (G.GymLeader) ============
 * Entity model slice 5 (docs/proposals/host-model-plan.md, Jess 2026-11-06): a leader's mon follows the rules you follow (G.PlayerEntity:
 * HP formula, hit defense, statuses, stages, walls), driven by the same G.Boss.GymBrain the old body uses. G.Boss.make builds one for a
 * gym with `playerEntity` in js/data/gyms.js; the other gyms stay on the wild body until slice 12. It lives in the enemy list, so your
 * aim, your moves and the HUD find it as before. One mon with all its moves in one group, as before: teams are slice 7, one active
 * slot slice 8. Its own: the attack factor (the brain's, slice 6 changes it), HP x hpMult, the fixed leader status rules (G.Status),
 * no hit i-frames, no touch damage (combat.js), the enrage trigger, drops and faint effects, and the boss look. COMBAT-RULES "Host model".
 */
G.GymLeader = class GymLeader extends G.PlayerEntity {
  /** @param def the leader's def from G.Gym.makeDef; def.gym holds its level, hpMult, moves, cards and restrictions */
  constructor(def, x, y) {
    super(G.DEX_BY[def.dex]);
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
    this.maxHp = this.maxHpAt(this.level);
    this.hp = this.maxHp;
    this.brain = new G.Boss.GymBrain(this);
    this.moves = this.slots[0];
    for (const s of this.moves) s.type = G.MoveDefs[s.id].type;
    this.heading = [0, 0];
    this.controller = Object.assign({}, G.PlayerEntity.IDLE, { axis: () => this.heading });
  }

  /** A Player entity the human fights: the hit paths and the dev log tell it from you by this. */
  get isRival() {
    return true;
  }
  /** The fixed leader status rules (G.Status LEADER), not per gym. */
  get leaderStatus() {
    return true;
  }
  get hitIframes() {
    return 0;
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
    G.Status.autoShake(this, dt);
    this.heading = G.Status.stunned(this) ? [0, 0] : this.steer(dt, pl);
    super.update(dt);
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
