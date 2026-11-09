/* ============ gym-leader.js: a gym leader as a Player entity (G.GymLeader) ============
 * Entity model slice 5 (docs/proposals/host-model-plan.md, Jess 2026-11-06): a leader's mon follows the rules you follow (G.PlayerEntity:
 * HP formula, hit defense, statuses, stages, walls), driven by the AI player (G.LeaderAI) with its cast rules in its SimPass, G.GymLeader.SimPass
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
    this.fade = 0; // seconds of the faint fade left; the enemy list drops a corpse at 0
    this.level = this.gym.level;
    this.hpMult = this.gym.hpMult;
    this.becomeSimOwner(); // first (slice 6, finding C): its card store holds the Vitamins that max HP reads
    this.maxHp = this.maxHpAt(this.level);
    this.hp = this.maxHp;
    this.moves = this.slots.flat(); // every slot's moves (slice 8: one slot per authored line, bonded lines share one)
    for (const s of this.moves) s.type = G.MoveDefs[s.id].type;
    this.arm();
    this.heading = [0, 0]; // the AI player's last heading for this mon (G.LeaderAI.think), the answer its Controller carries
    this.ai = new G.LeaderAI([this]); // its own AI player until G.GymLeader.team gives the team one (LEADER-AI "One module")
    this.controller = this.ai.controller;
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
  /** The Body becomes a sim owner (#41: once the Caster's setup): one slot per authored move line (bonded lines share one), its card
   *  store, tempo as the cooldown multiplier, the player as its only foe; your sim scheduler hands each due slot to the leader's
   *  SimPass. The fight state it holds: the wind-up (`tell`), the self heals left this fight (by default the loop number, Jess
   *  2026-11-05) and the first-attack wait left (`firstWait`, 0 when absent, #40). */
  becomeSimOwner() {
    const g = this.gym,
      rules = g.restrictions || {};
    this.atkLvl = g.level;
    this.slots = G.Boss.slotsOf(g.moves); // its `active` starts at 0 (G.PlayerEntity)
    this.teamCards = G.TeamCards.store();
    for (const id of Object.keys(g.cards || {})) G.TeamCards.add(this.teamCards, id, g.cards[id]);
    this.cdMul = 1 / g.tempo;
    this.aim = 0;
    this.tell = null;
    this.healsLeft = rules.healLimit != null ? rules.healLimit : Math.max(1, Math.floor(g.loop) || 1);
    this.firstWaitLeft = rules.firstWait != null ? rules.firstWait : 0;
    this.foes = () => {
      const p = G.Game.player;
      return p && !p.dead ? [p] : [];
    };
    this.activeGroup = () => (this.slots[this.active] || []).filter((s) => G.Boss.open(this, s)); // the open moves of the active slot
    this.castDue = (slot, def, now) => G.GymLeader.SimPass.due(this, slot, def, now); // your sim scheduler hands it each due slot
  }
  /** The def this mon casts: the frozen move data with its cards folded in (G.TeamCards). */
  moveDef(id) {
    return G.TeamCards.defOf(this, id);
  }
  /** Attacks are telegraphed unless the gym authors `tells: false` (the SimPass reads it). */
  get tellsOn() {
    return this.rule('tells') !== false;
  }
  /** The Body's acceptance of an attack (LEADER-AI FRAME): refused while stunned, in a flinch hold or before the authored first wait
   *  is over. A refusal passes nothing on. */
  acceptsAttack() {
    return !G.Status.stunned(this) && !this.stFl && !(this.firstWaitLeft > 0);
  }
  /** True while the body is held: a live dash carries it, or a wind-up runs. The AI player reads it as you see your own wind-up. */
  isHeld() {
    return !!(this.mvRoot || this.tell);
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

  /** One frame, the four roles (LEADER-AI "FRAME"): the Decider (G.LeaderAI.think: its heading, slot presses and dodge wait in the
   *  Controller), then the Body reads its slot keys as yours are read in game.js and the Player entity rules follow the answers under
   *  its statuses, then the leader's SimPass resolves (G.GymLeader.SimPass.frame). The AI shakes off at the auto rate first. The enemy list passes the nearest player, and keeps updating a corpse
   *  for its fade. */
  update(dt, pl) {
    if (this.dead) {
      this.anim.update(dt);
      this.fade -= dt;
      return;
    }
    if (this.swapT > 0) this.swapT = Math.max(0, this.swapT - dt); // slice 8: the slot hold (yours ticks in game.js)
    if (this.rule('autoShake') !== false) G.Status.autoShake(this, dt); // N3: on unless the gym turns it off (an AI has no hands)
    this.ai.think(this, dt, pl);
    this.takeSlotInput();
    const ox = this.x,
      oy = this.y;
    super.update(dt);
    this.lastStep = { moved: Math.hypot(this.x - ox, this.y - oy), dt }; // state the Decider reads (its edge unstick, #41)
    if (!this.dead) G.GymLeader.SimPass.frame(this, dt, G.Gym.now());
  }
  aimTargets() {
    return this.foes();
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
    this.tell = null;
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
/** The leader's SimPass (#41, decision 2026-11-09-41-the-caster-splits-into-body-and-sim-pass; LEADER-AI "FRAME"): the end of its frame,
 *  after the Body. It resolves and decides nothing: the state lives on the Body (G.GymLeader: tell, healsLeft, firstWaitLeft), the
 *  choices are the Decider's (G.LeaderAI picks the slot; nothing below the slot is chosen). What differs from yours is authored
 *  (COMBAT-RULES "Host model"): an attack is telegraphed under the `tells` restriction (a wind-up with the aim locked at its start,
 *  then a recovery, one at a time, standing still), it starts only when you are inside the move's real reach (a shot: how far it
 *  flies; #42 item 11, temporary), and self heals are capped per fight (`healLimit`, else the loop number). Pure buffs and self heals
 *  cast with no tell. The tuning is G.Boss.TUNE, shared with the wild bodies of gyms 3 to 8 until they switch. */
G.GymLeader.SimPass = {
  /** One pass: the first wait runs; a stun cancels an unfired wind-up; then your own sim pass runs for it (G.MoveSim.turn: commitments,
   *  heal over time, every move recharging, inactive slots too, the persistent upkeep), handing each due slot to `due`. A live dash
   *  (Quick Attack) carries the body; else a wind-up already running advances (its release fires here). One started by `due` this
   *  frame first advances next frame. */
  frame(e, dt, now) {
    if (e.firstWaitLeft > 0) e.firstWaitLeft -= dt;
    if (e.tell && !e.tell.fired && G.Status.stunned(e)) this.cancel(e);
    const running = e.tell;
    G.MoveSim.turn(dt, e, now);
    if (e.mvRoot) return;
    if (running && e.tell === running) this.telling(e, dt, now);
  },
  /** A due slot of the active group, handed over by your sim scheduler (G.MoveSim.turn: a cooldown run out, a pure buff's Gate open).
   *  A pure buff casts now, with no tell, even during a wind-up; a self heal casts now while a heal is left (full HP too, as yours); an
   *  attack starts its wind-up when the Body accepts it (LEADER-AI FRAME: awake, no flinch hold, the first wait over), no wind-up runs,
   *  no dash carries the body and you are in its reach. Refused, nothing happens: the slot stays due and is handed over again. */
  due(e, s, d, now) {
    const T = G.Boss.TUNE,
      form = G.Gyms.formOf(d);
    if (form === 'buff') return this.buff(e, s, d, now);
    if (form === 'heal') return this.heal(e, s, d, now);
    if (T.ORDER.indexOf(form) < 0 || e.tell || e.mvRoot || !e.acceptsAttack()) return;
    const pl = e.foes()[0];
    if (!pl) return;
    const near = T.CLOSE.includes(form);
    if (G.U.dist(e.x, e.y, pl.x, pl.y) > G.Gyms.reachOf(d, form) + (near ? pl.r || 0 : 0)) return;
    const prev = s.last;
    s.last = now;
    this.start(e, s, d, form, pl);
    e.tell.prevLast = prev; // a stun mid wind-up gives it back (cancel)
  },
  /** A stun mid wind-up (Jess 2026-11-09, option A): the wind-up is dropped, the move and its bonded members keep their cooldown (still
   *  ready) and get back the freshness mark they had before it started, so a cancelled attack does not count as cast. Its warning
   *  visuals fade on their own, as after a flinch. */
  cancel(e) {
    const c = e.tell;
    c.slot.last = c.prevLast;
    for (const b of c.bond || []) b.s.last = b.prev;
    e.tell = null;
  },
  /** The other attack moves of the active slot that are ready now (a bonded slot holds 2 to 4), marked as cast now: a bonded group
   *  fires together, as yours. */
  bondOf(e, slot) {
    const now = G.Gym.now(),
      out = [];
    for (const s of e.activeGroup()) {
      const form = G.Gyms.formOf(e.moveDef(s.id));
      if (s === slot || s.t > 0 || G.Boss.TUNE.ORDER.indexOf(form) < 0) continue;
      out.push({ s, form, prev: s.last });
      s.last = now;
    }
    return out;
  },
  /** The tell: the aim is locked now; the move fires along it when the tell ends, whether or not you are still there. A strike locks
   *  your spot instead and marks it on the ground; a nova's ring shows its full reach. A dash locks your spot too and shows the wild
   *  charger's warning line to it (capped at its range) plus its hit circle there (Jess 2026-11-02). */
  start(e, slot, d, form, pl) {
    const T = G.Boss.TUNE,
      tempo = e.gym.tempo,
      ang = Math.atan2(pl.y - e.y, pl.x - e.x),
      col = G.U.TYPE_COLOR[d.type] || '#ff7a9e';
    // the other ready attacks of a bonded slot fire with this one
    const bond = this.bondOf(e, slot),
      // a gym with tells off fires on the next frame, with no warning shown; a bonded tell lasts its longest member's
      wind = e.tellsOn ? bond.reduce((w, b) => Math.max(w, T.TELL[b.form]), T.TELL[form]) / tempo : 0,
      spot = form === 'strike' || form === 'dash' || form === 'delayed' ? { x: pl.x, y: pl.y } : null;
    e.tell = { slot, id: d.id, form, t: 0, wind, after: T.RECOVER / tempo, ang, spot, fired: false };
    if (bond.length) Object.assign(e.tell, { bond, lock: { x: pl.x, y: pl.y } });
    e.aim = ang;
    if (!e.tellsOn) return;
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
  },
  telling(e, dt, now) {
    const c = e.tell;
    c.t += dt;
    if (!c.fired && c.t >= c.wind) {
      c.fired = true;
      e.aim = c.ang;
      if (G.MoveSim.castAt(e, c.slot, e.moveDef(c.id), now, c.ang, c.spot)) {
        G.Gym.noteCast(c.id);
        this.orbCost(e, e.moveDef(c.id));
        e.anim.play(G.Boss.TUNE.CLOSE.includes(c.form) || c.form === 'dash' ? 'Attack' : 'Shoot', { speed: 1.4 });
      }
      if (c.bond) for (const b of c.bond) this.fireBond(e, b, c, now);
    }
    if (c.t >= c.wind + c.after) e.tell = null;
  },
  /** A bonded member's cast on the tell's release: the same aim; a spot form takes your spot locked at the tell's start. */
  fireBond(e, b, c, now) {
    const d = e.moveDef(b.s.id);
    if (!G.MoveSim.castAt(e, b.s, d, now, c.ang, G.Boss.TUNE.SPOT.includes(b.form) ? c.lock : null)) return;
    G.Gym.noteCast(b.s.id);
    this.orbCost(e, d);
  },

  /** A pure buff (SS8) from the active slot, so the slot choice visits it. A fizzle waits one Gate (the sim). Your buff look: a ring
   *  and rising sprites. */
  buff(e, s, d, now) {
    if (!G.MoveSim.castAt(e, s, d, now, e.aim)) return;
    G.Gym.noteCast(s.id);
    this.orbCost(e, d);
    const col = G.U.TYPE_COLOR[d.type] || '#ff7a9e',
      vis = G.VFX.forMove(d);
    G.FX.ring(e.x, e.y, e.r * 2.4, e.r * 1.1, col, 0.35, 2.5);
    for (let i = 0; i < 3; i++)
      G.FX.sp(vis.buff || 'arrow', vis.pal, e.x + G.U.rand(-e.r * 1.4, e.r * 1.4), e.y - G.U.rand(0, e.bodyH * 0.8), {
        vy: -70,
        life: 0.6,
      });
  },
  /** A self heal (Recover, Synthesis, Moonlight; Jess 2026-11-02, mainline strength) whenever due, as yours (#41: whether to heal
   *  is the Decider's choice, by the slot it presses), at most healsLeft times this fight. A drain move (Giga Drain) is not a self heal. */
  heal(e, s, d, now) {
    if (e.healsLeft <= 0) return;
    if (!G.MoveSim.castAt(e, s, d, now, e.aim)) return;
    e.healsLeft--;
    G.Gym.noteCast(s.id);
    this.orbCost(e, d);
    G.FX.ring(e.x, e.y, e.r * 2.4, e.r * 1.1, '#5fe08a', 0.35, 2.5);
  },
  /** Life Orb (slice 6, N6): each cast costs 1% of max HP (at least 1), never below 1 HP, the rule Player.cast applies to you. An
   *  always-on move (a persistent def) is not an attack. */
  orbCost(e, d) {
    if (e.hasItem('lifeorb') && !(d && d.persistent)) e.hp = Math.max(1, e.hp - Math.max(1, e.maxHp * 0.01));
  },
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
