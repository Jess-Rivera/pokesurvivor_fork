/* ============ gym-leader.js: a gym leader as a Player entity (G.GymLeader) ============
 * Entity model slice 5 (docs/proposals/host-model-plan.md, Jess 2026-11-06): a leader's mon follows the rules you follow (G.PlayerEntity:
 * HP formula, hit defense, statuses, stages, walls), driven by the AI player (G.LeaderAI) with its cast rules in G.GymLeader.Caster
 * (below; leader AI slice 5a, #34: GymBrain is the old body's only). G.Boss.make builds one for a
 * gym with `playerEntity` in js/data/gyms.js; the other gyms stay on the wild body until slice 12. It lives in the enemy list, so your
 * aim, your moves and the HUD find it as before. One mon with all its moves in one group, as before: teams are slice 7, one active
 * slot slice 8. Slice 6: your attack formula (x the enrage, only when the gym authors
 * it), your stat profile, cards (team cards included) and items. Its own: HP x hpMult, the authored restrictions (status cut, hard CC
 * gap, auto shake, hit i-frames; none authored means your rules), no touch damage (combat.js), the enrage trigger, drops and faint
 * effects, and the boss look. COMBAT-RULES "Host model".
 * Slice 7 (Jess 2026-11-07, map: docs/ASCII Concept Maps/Entity Model Slice 7 - Leader Team and Faint Swaps.txt): a switched gym
 * fields its loop lineup as one G.Team (G.GymLeader.team, below; the arena sends them out). Only the last to fall is the boss kill.
 * Slice 8 (Jess 2026-11-07, map: docs/ASCII Concept Maps/Entity Model Slice 8 - Leader Slot Choice.txt): one slot per authored move
 * line and one active slot under your slot hold (the AI player picks it), your melee cushion and your flinch rule.
 * Leader AI slice 1 (#22, docs/LEADER-AI.md): the AI player (G.LeaderAI, js/entities/leader-ai.js) drives it through your controller;
 * its heading and slot choice reach the body only as its answers.
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
    this.caster = new G.GymLeader.Caster(this); // first (slice 6, finding C): its card store holds the Vitamins that max HP reads
    this.maxHp = this.maxHpAt(this.level);
    this.hp = this.maxHp;
    this.moves = this.slots.flat(); // every slot's moves (slice 8: one slot per authored line, bonded lines share one)
    for (const s of this.moves) s.type = G.MoveDefs[s.id].type;
    this.arm();
    this.heading = [0, 0]; // the AI player's last heading for this mon (G.LeaderAI.think); the edge unstick reads it too
    this.ai = new G.LeaderAI([this]); // its own AI player until G.GymLeader.team gives the team one (LEADER-AI "One module")
    this.controller = this.ai.controller;
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

  /** One frame: the AI shakes off at the auto rate, the AI player thinks (its heading and slot presses, G.LeaderAI.think), and the
   *  Player entity rules do the rest. The enemy list passes the nearest player, and keeps updating a corpse for its fade. */
  update(dt, pl) {
    if (this.dead) {
      this.anim.update(dt);
      this.fade -= dt;
      return;
    }
    if (this.swapT > 0) this.swapT = Math.max(0, this.swapT - dt); // slice 8: the slot hold (yours ticks in game.js)
    if (this.rule('autoShake') !== false) G.Status.autoShake(this, dt); // N3: on unless the gym turns it off (an AI has no hands)
    this.ai.think(this, dt, pl);
    const ox = this.x,
      oy = this.y;
    super.update(dt);
    this.noteStuck(dt, ox, oy);
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
    if (Math.abs(l - r) < U.tie) return this.ai.legsOf(this).side < 0 ? -1 : 1;
    return l > r ? -1 : 1;
  }
  /** How far a test circle of her radius gets in UNSTICK.probe px along the turned heading, sliding on walls in 8 px steps. */
  probeSide(s) {
    const U = GymLeader.UNSTICK,
      [hx, hy] = this.heading,
      a = Math.atan2(hy, hx) + s * U.turn;
    return this.room(Math.cos(a), Math.sin(a), U.probe);
  }
  /** The open floor along the unit way (dx, dy): how far a test circle of her radius gets in `dist` px, sliding on walls in 8 px
   *  steps. The edge unstick and the AI player's dodge side (LEADER-AI DODGE DIRECTION) read it. */
  room(dx, dy, dist) {
    const b = { x: this.x, y: this.y, r: this.r },
      n = Math.ceil(dist / 8);
    for (let k = 0; k < n; k++) {
      b.x += (dx * dist) / n;
      b.y += (dy * dist) / n;
      G.World.collide(b);
    }
    return Math.hypot(b.x - this.x, b.y - this.y);
  }

  /** The first hit that lands on the field starts the enrage clock, damage over time included; an immune hit does not, and
   *  neither does damage on the bench (field only, Jess 2026-11-07, slice 7). */
  hurt(amount, type, pure, atk, who) {
    const hp0 = this.hp,
      res = super.hurt(amount, type, pure, atk, who);
    if (this.benched) return res;
    if (this.hp < hp0 && this.gym.engagedAt == null) this.gym.engagedAt = G.Gym.now();
    return res;
  }
  /** Flinch, your rule since slice 8 (Q7, replacing D5): the tell is lost, and the active slot's moves restart plus the 0.3 s hold
   *  (G.MoveSim.flinch); the other slots are untouched and no extra recovery wait follows. */
  applyFlinch() {
    if (this.dead || G.Status.stunned(this)) return false;
    this.caster.tell = null;
    G.MoveSim.flinch(this);
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
    if (this.benched) return; // a faint on the bench is silent: no burst, sound or drop (the arena pays the kill, LEADER-AI slice 2)
    this.fade = 0.9;
    const q = G.Game.player;
    if (q && q.runItems && q.runItems.includes('snowballbadge') && G.Items.snowballAdd) G.Items.snowballAdd(this.maxHp);
    if (this.team && (this.team.living().length || G.GymLeader.redoReady(this.team))) {
      // slice 7 (Q3): a member falls and the fight goes on (slice 7b: so does the last, while an unused Re-Do is held).
      // A kill like any (the enemy list pays it, the EVs and Silver);
      // the boss count, the gym drop and the big burst wait for the last one.
      this.boss = false;
      G.FX.burst(this.x, this.y - this.bodyH * 0.5, '#ffd95e', 16, 160);
      G.Audio.sfx('faint');
      return;
    }
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

/** Leader AI slice 5a (#34, docs/LEADER-AI.md "Build order"): the leader's cast rules, moved off G.Boss.GymBrain unchanged. What
 *  differs from yours is authored (COMBAT-RULES "Host model"): every attack is telegraphed under the `tells` restriction (a wind-up
 *  with the aim locked at its start, then a recovery, one at a time, standing still), it starts only when you are inside the move's
 *  real reach (a shot: how far it flies), self heals are capped per fight (`healLimit`, else the loop number), and the first attack
 *  waits 1.6 s. Pure buffs and self heals cast with no tell. Movement and the slot choice are the AI player's (G.LeaderAI); it reads
 *  what its moves can do here (pool, ready, reach, ranged, attack scores), as you read your HUD. The tuning is G.Boss.TUNE, shared
 *  with the wild bodies of gyms 3 to 8 until they switch. */
G.GymLeader.Caster = class Caster {
  /** The body becomes a sim owner: one slot per authored move line (bonded lines share one), its card store, tempo as the cooldown
   *  multiplier, the player as its only foe. */
  constructor(e) {
    this.e = e;
    this.on = false; // the fight state starts on the first step (init)
    const g = e.gym;
    e.atkLvl = g.level;
    e.slots = G.Boss.slotsOf(g.moves); // its `active` starts at 0 (G.PlayerEntity)
    e.teamCards = G.TeamCards.store();
    for (const id of Object.keys(g.cards || {})) G.TeamCards.add(e.teamCards, id, g.cards[id]);
    e.cdMul = 1 / g.tempo;
    const rules = g.restrictions || {}; // the gym's authored restrictions (js/data/gyms.js); absent means the defaults below
    this.tells = rules.tells !== false;
    this.healsLeft = rules.healLimit != null ? rules.healLimit : Math.max(1, Math.floor(g.loop) || 1); // self heals this fight: by default the loop number (Jess 2026-11-05)
    e.aim = 0;
    e.strongHost = true;
    e.foes = () => {
      const p = G.Game.player;
      return p && !p.dead ? [p] : [];
    };
    e.activeGroup = () => (e.slots[e.active] || []).filter((s) => G.Boss.open(e, s)); // the open moves of the active slot
    e.atkFactor0 = e.atkFactor;
  }

  init() {
    this.on = true;
    this.tell = null;
    this.wait = 1.6;
  }

  /** The def this mon casts: the frozen move data with its cards folded in (G.TeamCards). */
  def(id) {
    return G.TeamCards.defOf(this.e, id);
  }

  /** The start of the mon's frame (the AI player calls it from its steer): every move recharges (inactive slots too, as yours do),
   *  the slot choice `pick` is pressed under your slot hold, buffs and self heals cast, the persistent and heal over time upkeep runs.
   *  True while the body is held: a live dash carries it, or a tell runs (its release fires here). */
  prepare(dt, now, pick) {
    if (!this.on) this.init();
    const e = this.e;
    for (const g of e.slots) for (const s of g) if (s.t > 0) s.t = Math.max(0, s.t - dt);
    if (this.wait > 0) this.wait -= dt;
    pick();
    this.buffs(now);
    this.heals(now);
    G.MoveSim.persist(e, now); // a persistent slot (Toxic's trail) lives while it is in the active group, as yours does
    G.MoveEffects.upkeep(dt, e); // heal over time ticks (a self heal lands on its first tick), as the sim does for you
    if (e.mvRoot) return true; // a live dash (Quick Attack) carries the body
    if (this.tell) {
      this.telling(dt, now);
      return true;
    }
    return false;
  }
  /** After the AI player's movement: the first attack's wait over and no flinch hold, an attack you are in reach of starts its tell.
   *  True when one did (the body stands still this frame). */
  release(dist, pl, now) {
    return this.wait <= 0 && !this.e.stFl && this.attack(dist, pl, now);
  }

  /** Every move the mon moves for: the open moves of all its slots, so it walks in for a move on another slot and switches to it
   *  once in reach. */
  pool() {
    const e = this.e;
    return e.slots.flat().filter((s) => G.Boss.open(e, s));
  }
  /** The first ready move of `form` the mon moves for (pool), or null. */
  ready(form) {
    for (const s of this.pool()) if (s.t <= 0 && G.Gyms.formOf(this.def(s.id)) === form) return s;
    return null;
  }
  /** The reach of the mon's close moves (the largest melee cone or nova), from its center: yours, since the mon is player-sized. */
  reach() {
    let r = 0;
    for (const s of this.e.slots.flat()) {
      const d = this.def(s.id),
        f = G.Gyms.formOf(d);
      if (G.Boss.TUNE.CLOSE.includes(f)) r = Math.max(r, G.Gyms.reachOf(d, f));
    }
    return r;
  }
  /** The reach of the longest ready ranged move it moves for (pool), or Infinity when none is ready: far mode keeps you inside it. */
  ranged() {
    let r = -Infinity;
    for (const s of this.pool()) {
      if (s.t > 0) continue;
      const d = this.def(s.id),
        f = G.Gyms.formOf(d);
      if (G.Boss.TUNE.RANGED.includes(f)) r = Math.max(r, G.Gyms.reachOf(d, f));
    }
    return r > -Infinity ? r : Infinity;
  }

  /** The utility pick (Jess 2026-11-01): every ready attack you are in reach of (a melee cone or a nova: its reach plus your body; a
   *  strike: its range; a shot: how far it flies, capped at its range) gets a score, and the highest starts its tell. Score =
   *  freshness x fit x opportunity. Freshness: seconds since the move's last tell started (the fight's first pick for one never
   *  cast), over its cooldown. Fit: 1, or POINT_BLANK for a shot or strike while you are inside the mon's close reach. Ties: ORDER,
   *  then the move's place in the group. No randomness. this.scores keeps the last pick's scores for the ?dev overlay. `group`
   *  defaults to the active group; `dry` only scores it and returns the best candidate (the AI player's slot choice reads every slot). */
  attack(dist, pl, now, group = this.e.activeGroup(), dry = false) {
    const T = G.Boss.TUNE;
    if (this.t0 == null) this.t0 = now;
    const close = this.reach(),
      blank = close > 0 && dist <= close + (pl.r || 0);
    let best = null;
    const scores = [];
    for (const s of group) {
      if (s.t > 0) continue;
      const d = this.def(s.id),
        form = G.Gyms.formOf(d),
        rank = T.ORDER.indexOf(form);
      if (rank < 0) continue;
      const near = T.CLOSE.includes(form);
      if (dist > G.Gyms.reachOf(d, form) + (near ? pl.r || 0 : 0)) continue;
      const fresh = (now - (s.last != null ? s.last : this.t0)) / Math.max(0.05, d.cd * this.e.cdMul),
        c = { s, d, form, rank, score: fresh * (blank && !near ? T.POINT_BLANK : 1) * this.opp(d, pl) };
      scores.push(c);
      if (!best || c.score > best.score || (c.score === best.score && c.rank < best.rank)) best = c;
    }
    if (dry) return best;
    this.scores = scores.map((c) => ({ id: c.s.id, score: c.score, picked: c === best }));
    if (!best) return false;
    best.s.last = now;
    this.start(best.s, best.d, best.form, pl);
    return true;
  }
  /** The other attack moves of the active slot that are ready now (a bonded slot holds 2 to 4), marked as cast now. */
  bondOf(slot) {
    const now = G.Gym.now(),
      out = [];
    for (const s of this.e.activeGroup()) {
      const form = G.Gyms.formOf(this.def(s.id));
      if (s === slot || s.t > 0 || G.Boss.TUNE.ORDER.indexOf(form) < 0) continue;
      s.last = now;
      out.push({ s, form });
    }
    return out;
  }
  /** Opportunity (Jess 2026-11-01): x OPP_HEX for a statusBonus move while you carry a major ailment, x OPP_BLOCKED for a move with a
   *  major ailment rider while you already carry one, x OPP_DROP for a move with a foe stat drop that is not on you yet (no tracker from
   *  this move and mon). Each applies once; 1 otherwise. */
  opp(d, pl) {
    const T = G.Boss.TUNE,
      p = d.payload || [],
      major = G.Status.majorKind(pl);
    let k = 1;
    if (major && p.some((fx) => fx.t === 'special' && fx.handler === 'statusBonus')) k *= T.OPP_HEX;
    if (major && p.some((fx) => fx.t === 'ailment' && fx.side === 'foe' && T.MAJOR.has(fx.id))) k *= T.OPP_BLOCKED;
    const src = G.MoveEffects.srcOf(d, this.e);
    if (
      p.some(
        (fx) =>
          fx.t === 'stat' &&
          fx.side === 'foe' &&
          fx.stages < 0 &&
          !G.Stages.tracker(pl, G.MoveEffects.statKey(fx.stat), src, false)
      )
    )
      k *= T.OPP_DROP;
    return k;
  }

  /** The tell: the aim is locked now; the move fires along it when the tell ends, whether or not you are still there. A strike locks
   *  your spot instead and marks it on the ground; a nova's ring shows its full reach. A dash locks your spot too and shows the wild
   *  charger's warning line to it (capped at its range) plus its hit circle there (Jess 2026-11-02). */
  start(slot, d, form, pl) {
    const T = G.Boss.TUNE,
      e = this.e,
      tempo = e.gym.tempo,
      ang = Math.atan2(pl.y - e.y, pl.x - e.x),
      col = G.U.TYPE_COLOR[d.type] || '#ff7a9e';
    // the other ready attacks of a bonded slot fire with this one
    const bond = this.bondOf(slot),
      // a gym with tells off fires on the next frame, with no warning shown; a bonded tell lasts its longest member's
      wind = this.tells ? bond.reduce((w, b) => Math.max(w, T.TELL[b.form]), T.TELL[form]) / tempo : 0,
      spot = form === 'strike' || form === 'dash' || form === 'delayed' ? { x: pl.x, y: pl.y } : null;
    this.tell = { slot, id: d.id, form, t: 0, wind, after: T.RECOVER / tempo, ang, spot, fired: false };
    if (bond.length) Object.assign(this.tell, { bond, lock: { x: pl.x, y: pl.y } });
    e.aim = ang;
    if (!this.tells) return;
    e.anim.play('Charge', { speed: 1.4 });
    if (form === 'dash') {
      const len = Math.min(Math.hypot(spot.x - e.x, spot.y - e.y), G.Gyms.reachOf(d, form)),
        end = { x: e.x + Math.cos(ang) * len, y: e.y + Math.sin(ang) * len },
        w = {
          kind: 'beam',
          warn: true,
          src: e,
          x: e.x,
          y: e.y,
          angle: ang,
          len,
          w: d.space.radRadius * 2,
          delay: wind,
          dmg: 0,
          type: d.type,
          color: col,
        };
      G.Hazards.add(w);
      G.Hazards.add(Object.assign({}, w, { kind: 'zone', x: end.x, y: end.y, r: d.space.radRadius }));
    } else if (form === 'beam')
      // the warning line along the locked aim, the beam's full length and width (Jess 2026-11-02)
      G.Hazards.add({
        kind: 'beam',
        warn: true,
        src: e,
        x: e.x,
        y: e.y,
        angle: ang,
        len: d.space.linLength,
        w: d.space.linWidth,
        delay: wind,
        dmg: 0,
        type: d.type,
        color: col,
      });
    else if (form === 'delayed')
      return; // the marker is the move's own instance, drawn through its delay (move-render.js)
    else if (spot) G.FX.ring(spot.x, spot.y, d.space.radRadius * 3, d.space.radRadius, col, wind, 2);
    else G.FX.ring(e.x, e.y, e.r, form === 'nova' ? G.Gyms.reachOf(d, form) : e.r * 2.4, col, wind, 2);
  }
  telling(dt, now) {
    const e = this.e,
      c = this.tell;
    c.t += dt;
    if (!c.fired && c.t >= c.wind) {
      c.fired = true;
      e.aim = c.ang;
      if (G.MoveSim.castAt(e, c.slot, this.def(c.id), now, c.ang, c.spot)) {
        G.Gym.noteCast(c.id);
        this.orbCost(this.def(c.id));
        e.anim.play(G.Boss.TUNE.CLOSE.includes(c.form) || c.form === 'dash' ? 'Attack' : 'Shoot', { speed: 1.4 });
      }
      if (c.bond) for (const b of c.bond) this.fireBond(b, c, now);
    }
    if (c.t >= c.wind + c.after) this.tell = null;
  }
  /** A bonded member's cast on the tell's release: the same aim; a spot form takes your spot locked at the tell's start. */
  fireBond(b, c, now) {
    const d = this.def(b.s.id);
    if (!G.MoveSim.castAt(this.e, b.s, d, now, c.ang, G.Boss.TUNE.SPOT.includes(b.form) ? c.lock : null)) return;
    G.Gym.noteCast(b.s.id);
    this.orbCost(d);
  }

  /** Pure buffs cast the moment their Gate opens (SS8), with no tell, even during an attack's tell; only from the active slot, so the
   *  slot choice visits it. A fizzle waits one Gate (the sim). */
  buffs(now) {
    const e = this.e;
    for (const s of e.activeGroup()) {
      const d = this.def(s.id);
      if (s.t > 0 || G.Gyms.formOf(d) !== 'buff' || !G.MoveEffects.statReady(d, e)) continue;
      if (!G.MoveSim.castAt(e, s, d, now, e.aim)) continue;
      G.Gym.noteCast(s.id);
      this.orbCost(d);
      const col = G.U.TYPE_COLOR[d.type] || '#ff7a9e',
        vis = G.VFX.forMove(d); // your buff look: a ring and rising sprites
      G.FX.ring(e.x, e.y, e.r * 2.4, e.r * 1.1, col, 0.35, 2.5);
      for (let i = 0; i < 3; i++)
        G.FX.sp(vis.buff || 'arrow', vis.pal, e.x + G.U.rand(-e.r * 1.4, e.r * 1.4), e.y - G.U.rand(0, e.bodyH * 0.8), {
          vy: -70,
          life: 0.6,
        });
    }
  }
  /** Self heals (Recover, Synthesis, Moonlight; Jess 2026-11-02, mainline strength) cast with no tell, as buffs do, whenever the mon
   *  is hurt and the move is off cooldown, at most healsLeft times this fight. A drain move (Giga Drain) is not a self heal. */
  heals(now) {
    const e = this.e;
    if (!(e.hp < e.maxHp)) return;
    for (const s of e.activeGroup()) {
      if (this.healsLeft <= 0) return;
      const d = this.def(s.id);
      if (s.t > 0 || G.Gyms.formOf(d) !== 'heal') continue;
      if (!G.MoveSim.castAt(e, s, d, now, e.aim)) continue;
      this.healsLeft--;
      G.Gym.noteCast(s.id);
      this.orbCost(d);
      G.FX.ring(e.x, e.y, e.r * 2.4, e.r * 1.1, '#5fe08a', 0.35, 2.5);
    }
  }
  /** Life Orb (slice 6, N6): each cast costs 1% of max HP (at least 1), never below 1 HP, the rule Player.cast applies to you. An
   *  always-on move (a persistent def) is not an attack. */
  orbCost(d) {
    const e = this.e;
    if (e.hasItem('lifeorb') && !(d && d.persistent)) e.hp = Math.max(1, e.hp - Math.max(1, e.maxHp * 0.01));
  }
};

/** Slice 7: the members (G.GymLeader, slot order) as one G.Team, the module your team uses, so the same stores are shared: team
 *  stages, team cards, run items, dodges, berries, links. Team.link hands every member fresh shared stores, so the gym's cards
 *  (one pool per gym, Jess 2026-11-05) and run item ids go back in once; each member's run item on() already ran in arm(). */
G.GymLeader.team = function (members) {
  const ids = members[0].runItems.slice(),
    cards = members[0].gym.cards || {};
  members.forEach((m, i) => (m.teamSlot = i));
  const t = G.Team.create(members, null);
  t.ai = new G.LeaderAI(members, t); // one AI player for the team (LEADER-AI): every member presses through its one controller
  for (const id of Object.keys(cards)) G.TeamCards.add(t.cards, id, cards[id]);
  t.runItems.push(...ids);
  for (const m of members) {
    m.refreshMaxHp();
    m.hp = m.maxHp;
  }
  return t;
};
/** Slice 7b (Q3): the team holds Re-Do and has not used it this fight. */
G.GymLeader.redoReady = (t) => t.runItems.includes('redo') && !t.redoUsed;
/** Slice 7b (Q3, Q4): Re-Do as yours. Every member back to full HP, statuses cleared (your revive), the boss mark back on, each
 *  enrage clock reset (it restarts on each send-out); the last to fall takes the field. Once per fight. */
G.GymLeader.redo = function (t) {
  t.redoUsed = true;
  for (const m of t.members) {
    m.revive(1);
    m.boss = true;
    m.gym.engagedAt = null;
  }
  return t.sendIn(t.activeIdx);
};
