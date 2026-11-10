/* ============ leader-ai.js: the AI player that drives a Player-entity leader (G.LeaderAI) ============
 * Spec: docs/LEADER-AI.md (Jess 2026-11-08). One AI player per leader team; it acts only through the controller your keyboard
 * answers, the seven calls of G.PlayerEntity.IDLE, so your rules (slot hold, swap lock, trap, Fly, stuns, dodge charges) decide every
 * press. What it can see: G.LeaderBelief (#50), its only door; Belief derives from G.LeaderInfo, which it never reads itself.
 * Slice 1 (#22): the controls layer. It wraps G.Boss.GymBrain: the brain's heading becomes `axis` and its slot choice `slots`, so
 * Misty and Brock move and cast as before. `shake`, `swapDir` and `cycles` answer nothing yet (shake-off stays the authored autoShake).
 * Slice 2 (#31): its own swap and dodge decisions, on its settings (BASE below, or the gym's `ai` in js/data/gyms.js).
 *   SWAPS   on the think tick, never inside a tell's wind-up or a move commitment: a tick that lands inside one waits for the first
 *           frame out of it, stunned or not (#41: no stun check of its own; asleep it may still swap, as you may, outside a commitment). Gates first: minField seconds on the field, swapLimit voluntary swaps a fight. Then each bench mon is scored by
 *           the spec's triggers (asleep or frozen, low HP with no self heal, a better matchup) against STAY, and the best fires only
 *           if it beats STAY x margin. Pressed through `swapSlot`; the arena's swap step runs your rules.
 *   DODGES  a threat (G.LeaderInfo threats) is noticed on any frame; the dodge bag says whether it is read; a read threat is answered
 *           exactly `reflex` later, held while a tell or commitment lasts, dropped once it is gone. It presses `dodge` with a
 *           heading sideways to the threat's path, toward the more open floor, and keeps `dodgeReserve` charges back.
 *   LOG     every decision, with its reason and scores, for the ?dev overlay (move-render.js) and the harness.
 * Slice 3 (#32): confidence, pacing, triggers and lines (Jess 2026-11-08, decision 2026-11-08-leader-ai-slice-3-opened-breather-is-back-off-plus-slot-choice).
 *   CONFIDENCE  one value per team, moved by what G.LeaderInfo shows (hits landed and taken, faints, the long window's trade),
 *               between confMin and confMax. It shifts the effective aggression (aggr) and the swap margin; never a stat or a number.
 *   PACING      (gone in #51: the planner's goals replace it) a stance, neutral, push or breather, on the think tick.
 *   LEAN        the dodge turns toward you with aggr above 0.5, away below it.
 *   TRIGGERS    authored in the gym's ai.triggers, each once unless `repeat`; they wait out a tell or commitment and act through
 *               your controls (a slot press, a swap request), a setting for a while, or a line. ai.lines: up and down on a big swing.
 *   LINES       "<leader>: <line>" on the banner, queued while another banner shows, dropped after LINE_WAIT s.
 * Slice 4 (#33): run memory (G.LeaderMemory, fed by G.LeaderInfo) and the first exploit (Jess 2026-11-08, decision
 * 2026-11-08-leader-ai-slice-4-opened-the-usual-lead-is-the-first-exploit).
 *   LEAD        on the fight's first free think tick: a lead pattern it believes (learnRate sightings of one mon of yours, the one
 *               with the most field time in a fight) asks the prediction cap bag (predictCap acts per BAG chances, run long). When
 *               it acts, the 'exploit' trigger fires and it swaps to its best matchup against that mon, without waiting out minField
 *               (it counts as a voluntary swap); already on the best one, it stays and still says its line.
 * Slice 5a (#34, decision 2026-11-08-leader-ai-slice-5-split-gymbrain-out-first-then-personalities): GymBrain is gone from Player-
 * entity leaders. Movement (steer, legsOf) and the slot choice (pickSlot) are this module's own; the tell, the reach filter and the
 * heal cap are the leader's authored SimPass rules (G.GymLeader.SimPass; #41: the Caster is gone, its attack score is attackScore
 * here), on your sim scheduler (G.MoveSim.turn). Where slices 1 to 4
 * below say "the brain", read those.
 * #51 (#49 slice 2, decision 2026-11-09-51-opening-stance-traces-and-set-trigger): the planner drives it. On every think tick
 * G.LeaderPlanner picks a goal and a plan of up to 4 actions from Belief's snapshot; the executor here steers each action through the
 * controller every frame (the heading, and the slot the action keeps active), ends it on its effect or at 1.5 x its estimate, and
 * replans at once when the plan runs out or the running action's precondition breaks. GONE: the stance clock (far and close), the
 * old slot choice (attackScore, pickSlot, offHeal), pacing (push, neutral, breather) and a trigger's forced slot and swap (an unused
 * hook stays). The swap choice, the lead exploit, reflex dodges and the gap-closing dodge stay until #52.
 */
G.LeaderAI = class LeaderAI {
  /** @param members the leader mons it drives, in slot order; @param team their G.Team, or null for a lone mon */
  constructor(members, team = null) {
    this.members = members;
    this.team = team;
    this.set = LeaderAI.settings(members[0] && members[0].gym);
    this.slotQ = []; // this frame's slot presses (pressSlot), in press order; the body reads them once, as your keys (#40)
    this.swapReq = -1; // a requested team slot, waiting for the arena's swap step
    this.swapAnswer = -1; // the team slot `swapSlot` answers, set only during that step (swapFrame)
    this.dodgeAnswer = false; // a dodge press for this frame's body update; reading it spends it, as a key press
    this.clock = 0; // seconds this AI player has run a mon on the field
    this.tickT = 0; // seconds to the next think tick
    this.due = false; // a think tick came and its swap choice waits for the first frame out of a tell or commitment
    this.fieldT = 0; // seconds the mon on the field has been there (minField)
    this.swaps = 0; // voluntary swaps this fight (swapLimit)
    this.saved = new Set(); // mons already swapped out under the low HP line (once per mon)
    this.why = null; // the reason of the swap request waiting for the arena's swap step
    this.bag = new LeaderAI.Bag(this.set.dodgeRead, LeaderAI.seed != null ? LeaderAI.seed : Date.now() >>> 0);
    this.seen = new Set(); // your casts already counted as threats (one per cast)
    this.pending = null; // a read threat waiting out the reflex: { at, serial }
    this.log = []; // the last LOG_N decisions: { t, act, text, ... }
    this.legs = new Map(); // slice 5a: each mon's movement state this fight (legsOf)
    // slice 3: confidence, pacing, triggers and lines
    const gym = (members[0] && members[0].gym) || {},
      auth = gym.ai || {};
    this.name = gym.leader || 'Leader';
    this.conf = this.set.confStart;
    // #51: the plan it runs ({ goal, steps, at, stepT, lastT }), the last choice (for the overlay), when the goal was taken up
    // (the commitment bonus), and `randomness`'s own seeded source
    this.plan = null;
    this.choice = null;
    this.world = null;
    this.goalSince = 0;
    this.replanNow = false;
    this.draw = G.LeaderPlanner.seeded(
      LeaderAI.seed != null ? (LeaderAI.seed ^ 0x2545f491) >>> 0 : (Date.now() ^ 0x2545f491) >>> 0
    );
    this.swingRef = this.conf; // confidence at the last swing line
    this.swingAt = -Infinity;
    this.lineSet = auth.lines || {};
    this.lines = []; // queued lines: { text, at }
    this.temp = []; // settings a trigger changed for a while: { k, old, until }
    this.started = false;
    this.opened = false; // slice 4: the lead read has had its one chance this fight
    this.useTriggers(auth.triggers || []);
    this.controller = {
      axis: () => this.active.heading,
      dodge: () => {
        const d = this.dodgeAnswer;
        this.dodgeAnswer = false;
        return d;
      },
      shake: () => false,
      swapSlot: () => this.swapAnswer,
      swapDir: () => 0,
      slots: () => {
        const q = this.slotQ;
        if (!q.length) return LeaderAI.NONE;
        this.slotQ = [];
        return q;
      },
      cycles: () => LeaderAI.NONE,
    };
    for (const m of members) {
      m.ai = this;
      m.controller = this.controller;
    }
  }

  /** The mon on the field. */
  get active() {
    return this.team ? this.team.active : this.members[0];
  }

  /** One frame for mon `e`, the decider's part of the flow (#40, decision 2026-11-09-every-player-entity-runs-one-flow-decide-hands-
   *  body-sim): it decides, and its answers wait in the controller for the body, which follows them under its rules (a stun refuses
   *  the heading and the dodge, as yours), then the sim pass resolves. It decides while stunned too, as you can press keys asleep.
   *  #51: Belief updates first; on a think tick (or at once when the plan ran out or broke) it plans; then the executor answers the
   *  heading (with the edge unstick on top) and the slot press; then the dodge watch every frame, and on the tick the gap-closing
   *  dodge and the swap choice. */
  think(e, dt, pl) {
    const L = this.legsOf(e),
      step = e.lastStep;
    if (step && L.lastHeading) this.noteStuck(e, step.dt, step.moved, L.lastHeading);
    this.clock += dt;
    this.fieldT += dt;
    this.feel(e, dt);
    if ((this.tickT -= dt) <= LeaderAI.EPS) {
      this.tickT += this.set.think;
      this.due = true;
    }
    // a tick that lands inside a tell or commitment waits for the first frame out of it (it is never skipped), stunned or not: the
    // Decider keeps no stun check of its own (#41, LEADER-AI FRAME)
    const free = !this.busy(e),
      tick = this.due && free;
    if (tick) {
      this.due = false;
      if (!this.opened) this.open(e);
    }
    if (!LeaderAI.off.planner && free && (tick || this.replanNow)) this.replan(e, tick ? 'tick' : this.replanNow);
    e.heading = this.unstick(e, dt, this.execute(e, dt, pl, free));
    if (!LeaderAI.off.dodges) this.watch(e, dt);
    if (tick) {
      if (!LeaderAI.off.dodges) this.gapClose(e, pl);
      if (!LeaderAI.off.swaps) this.decide(e);
    }
    if (!LeaderAI.off.triggers) {
      this.watchTriggers(e);
      if (free) this.fireTriggers(e);
    }
    this.flushLines();
    L.lastHeading = e.heading; // the next think reads how far the body's step moved her along it (e.lastStep)
  }

  // ---------------- edge unstick (Jess 2026-11-07, map: docs/ASCII Concept Maps/Gym Leader - Edge Unstick.txt) ----------------
  // The wild body's side-step (enemy.js), plus a smart side. Walls already slide her (G.World.collide); this frees her on corners.
  // #41: the Decider's, so it comes out as heading; the state is per mon in legsOf (stuckT, sideStepT, sideStepWay).

  /** While a side-step lasts, the heading turns UNSTICK.turn rad toward its way. */
  unstick(e, dt, h) {
    const L = this.legsOf(e);
    if (!(L.sideStepT > 0)) return h;
    L.sideStepT -= dt;
    if (!h[0] && !h[1]) return h;
    const a = Math.atan2(h[1], h[0]) + L.sideStepWay * LeaderAI.UNSTICK.turn,
      m = Math.hypot(h[0], h[1]);
    return [Math.cos(a) * m, Math.sin(a) * m];
  }
  /** After a body step that moved her `moved` px with `heading` over dt (her own step only, as the Body records it): moving under
   *  UNSTICK.slip of what the heading meant, for over UNSTICK.stuck s, starts a side-step. */
  noteStuck(e, dt, moved, heading = e.heading) {
    const U = LeaderAI.UNSTICK,
      L = this.legsOf(e),
      [hx, hy] = heading;
    if (e.dead || this.stuckFree(e, hx, hy)) {
      L.stuckT = 0;
      return;
    }
    const want = Math.hypot(hx, hy) * e.spd * dt,
      got = moved;
    if (want <= 0.5 || got >= want * U.slip) {
      L.stuckT = 0;
      return;
    }
    L.stuckT = (L.stuckT || 0) + dt;
    if (L.stuckT > U.stuck && !(L.sideStepT > 0)) {
      L.sideStepT = U.side;
      L.stuckT = 0;
      L.sideStepWay = this.pickSide(e, heading);
    }
  }
  /** Frames that never count as stuck: no heading (attacking, stunned), or something else moves her (dash, flinch, push, dodge,
   *  Fly), a root holds her, or ice is sliding her. */
  stuckFree(e, hx, hy) {
    if (!hx && !hy) return true;
    if (e.mvRoot || e.stFl || e.stPush || e.dodgeT > 0 || e.flyT > 0 || e.frozen) return true;
    if (G.Status.stunned(e) || G.Status.rooted(e)) return true;
    return e.inLiquid && !!G.World.liquidEffect(e.mon.types).slide;
  }
  /** The side with more room one probe ahead; about even, the side she circles; both shut, random. */
  pickSide(e, heading) {
    const U = LeaderAI.UNSTICK,
      l = this.probeSide(e, -1, heading),
      r = this.probeSide(e, 1, heading);
    if (Math.max(l, r) < U.shut) return Math.random() < 0.5 ? -1 : 1;
    if (Math.abs(l - r) < U.tie) return this.legsOf(e).side < 0 ? -1 : 1;
    return l > r ? -1 : 1;
  }
  /** How far a test circle of her radius gets in UNSTICK.probe px along the heading turned toward way s. */
  probeSide(e, s, [hx, hy]) {
    const U = LeaderAI.UNSTICK,
      a = Math.atan2(hy, hx) + s * U.turn;
    return this.room(e, Math.cos(a), Math.sin(a), U.probe);
  }
  /** The open floor she sees along the unit way (dx, dy): how far a test circle of her radius gets in `dist` px, sliding on walls in
   *  8 px steps. The edge unstick and the dodge side (LEADER-AI DODGE DIRECTION) read it. */
  room(e, dx, dy, dist) {
    const b = { x: e.x, y: e.y, r: e.r },
      n = Math.ceil(dist / 8);
    for (let k = 0; k < n; k++) {
      b.x += (dx * dist) / n;
      b.y += (dy * dist) / n;
      G.World.collide(b);
    }
    return Math.hypot(b.x - e.x, b.y - e.y);
  }
  // ---------------- the executor (#51): the plan's actions steered through the controller ----------------

  /** Asks the planner for a goal and a plan from Belief's snapshot (LEADER-AI CHOICE). The running plan competes with its commitment
   *  bonus; a new plan that starts with the running action keeps its clock. Logs a change of goal. */
  replan(e, why) {
    this.replanNow = false;
    this.lastWhy = why; // why it last planned: 'tick', 'plan done', 'broken: ...' or 'a mon arrives' (the overlay and the harness)
    const belief = G.LeaderBelief.current,
      world = belief && belief.snapshot ? belief.snapshot(e, this.set, this.conf) : null;
    if (!world || !Array.isArray(world.slots)) {
      this.plan = null;
      return;
    }
    const was = this.plan,
      running = was && was.steps[was.at],
      choice = G.LeaderPlanner.choose(
        world,
        running ? { goal: was.goal, step: running, invested: this.clock - this.goalSince } : null,
        this.draw
      );
    this.world = world;
    this.choice = choice;
    const pick = choice.pick;
    if (!pick) {
      this.plan = null;
      return;
    }
    const keep = !!running && G.LeaderPlanner.sameAction(pick.steps[0], running);
    // only a change of goal is logged (the overlay shows the running plan): plan changes every few ticks would push the other
    // decisions out of the LOG_N log
    if (!was || was.goal !== pick.goal) {
      this.goalSince = this.clock;
      this.note('goal', pick.goal + ' (' + why + '): ' + this.planText(pick));
    }
    this.plan = {
      goal: pick.goal,
      steps: pick.steps,
      at: 0,
      stepT: keep ? was.stepT : 0,
      lastT: keep ? was.lastT : this.timersOf(e, pick.steps[0]),
      value: pick.value,
      cost: pick.cost,
    };
  }
  /** A plan as one line: each step's verb and what it names. */
  planText(c) {
    return c.steps.map((s) => this.stepText(s)).join(', ');
  }
  stepText(s) {
    if (s.verb === 'close' || s.verb === 'use') return s.verb + ' ' + (s.slot + 1);
    if (s.verb === 'hold') return 'hold ' + Math.round(s.range);
    if (s.verb === 'wait') return s.yourMove != null ? 'wait for your ' + s.yourMove : 'wait for ' + (s.slot + 1);
    return s.verb;
  }
  /** The cooldowns of the slot a step names, to see a cast land (a cooldown that jumps up), or null. */
  timersOf(e, step) {
    const g = step && step.slot != null ? e.slots[step.slot] : null;
    return g ? g.map((s) => s.t) : null;
  }
  /** One frame of the running action: is it done (its effect, or 1.5 x its estimate) or broken (its precondition), then the slot it
   *  keeps active and its heading. With no plan (or the planner off) it stands and presses nothing. */
  execute(e, dt, pl, free) {
    let plan = this.plan;
    if (LeaderAI.off.planner || !plan) return [0, 0];
    plan.stepT += dt;
    const state = this.stepState(e, plan.steps[plan.at], pl);
    if (state !== 'running') {
      if (state === 'done' && plan.at + 1 < plan.steps.length) {
        plan.at++;
        plan.stepT = 0;
        plan.lastT = this.timersOf(e, plan.steps[plan.at]);
      } else {
        this.replanNow = state === 'done' ? 'plan done' : 'broken: ' + state;
        if (free && !LeaderAI.off.planner) this.replan(e, this.replanNow);
        plan = this.plan;
        if (!plan) return [0, 0];
      }
    }
    const step = plan.steps[plan.at],
      keep = this.keptSlot(e, plan, step);
    if (keep != null && keep !== e.active && e.slots.length > 1 && !(e.tell || e.mvRoot || e.stFl || e.swapT > 0))
      this.pressSlot(e, keep);
    if (e.isHeld()) return [0, 0];
    return this.headingFor(e, step, pl);
  }
  /** 'done', 'running', or why the running action's precondition broke. */
  stepState(e, step, pl) {
    const T = G.LeaderPlanner.TUNE,
      belief = G.LeaderBelief.current,
      at = (belief && belief.yourGuess()) || pl,
      dist = G.U.dist(e.x, e.y, at.x, at.y),
      r = pl.r || 0,
      plan = this.plan;
    if (plan.stepT >= T.stepTimeout * Math.max(step.duration, this.set.think) - LeaderAI.EPS) return 'done';
    if (step.verb === 'close') return dist <= step.reach + r ? 'done' : 'running';
    if (step.verb === 'hold' || step.verb === 'recover')
      return plan.stepT >= step.duration - LeaderAI.EPS ? 'done' : 'running';
    if (step.verb === 'backOff') return dist >= step.to ? 'done' : 'running';
    if (step.verb === 'wait' && step.yourMove != null) {
      const since = belief && belief.sinceCast(LeaderAI.yours(), step.yourMove);
      if (since != null && since < plan.stepT - LeaderAI.EPS) return 'done';
      return dist > step.reach + (e.r || 0) + T.slack ? 'you left its reach' : 'running';
    }
    const group = e.slots[step.slot] || [];
    if (step.verb === 'wait') return group.some((s) => G.Boss.open(e, s) && s.t <= 0) ? 'done' : 'running';
    // use: done once a move of the slot is cast (its cooldown jumps up); broken when you leave its reach or it can no longer cast
    const was = plan.lastT,
      cast = !!was && group.some((s, i) => s.t > (was[i] || 0) + 0.1);
    plan.lastT = group.map((s) => s.t);
    if (cast) return 'done';
    if (step.tag === 'heal' && !(e.healsLeft > 0)) return 'no heal left';
    if (step.tag === 'buff') return 'running';
    if (step.tag === 'heal') return 'running';
    let reach = 0;
    for (const s of group) {
      const d = e.moveDef(s.id),
        f = G.Gyms.formOf(d);
      if (f && f !== 'buff' && f !== 'heal') reach = Math.max(reach, G.Gyms.reachOf(d, f));
    }
    if (dist > reach + r + T.slack && !e.tell) return 'you left its reach';
    return 'running';
  }
  /** The slot an action keeps active (LEADER-AI ACTIONS: every movement verb names one): its own, else the next Use step's, else the
   *  active slot, unless that one holds only self heals while unhurt (a self heal casts whenever due, so not healing is this
   *  choice): then the first other slot with no self heal. */
  keptSlot(e, plan, step) {
    if (step.keepSlot != null) return step.keepSlot;
    for (let i = plan.at + 1; i < plan.steps.length; i++)
      if (plan.steps[i].keepSlot != null) return plan.steps[i].keepSlot;
    const isHeal = (s) => G.Gyms.formOf(e.moveDef(s.id)) === 'heal',
      act = e.slots[e.active] || [];
    if (e.hp < e.maxHp || !act.length || !act.every(isHeal)) return e.active;
    const j = e.slots.findIndex((g, i) => i !== e.active && g.length && !g.some(isHeal));
    return j >= 0 ? j : e.active;
  }
  /** The heading an action steers: toward your guessed position (around walls, G.Path) to close or reach, at the range band to hold,
   *  away (the more open of three ways) to back off, else circling you at the distance it has. At species speed, always (Jess,
   *  2026-10-19). */
  headingFor(e, step, pl) {
    const belief = G.LeaderBelief.current,
      at = (belief && belief.yourGuess()) || pl,
      L = this.legsOf(e),
      dist = G.U.dist(e.x, e.y, at.x, at.y),
      [ux, uy] = G.U.norm(at.x - e.x, at.y - e.y),
      toward = () => G.Path.dirFor(e, at) || [ux, uy],
      circle = () => [-uy * L.side, ux * L.side],
      band = G.LeaderPlanner.TUNE.rangeBand;
    if (L.side == null) L.side = Math.random() < 0.5 ? -1 : 1;
    if (step.verb === 'close') return toward();
    if (step.verb === 'hold') {
      if (dist > step.range + band) return toward();
      if (dist < step.range - band) return this.awayFrom(e, ux, uy);
      return circle();
    }
    if (step.verb === 'backOff') return this.awayFrom(e, ux, uy);
    if (step.verb === 'use' && step.tag !== 'buff' && step.tag !== 'heal') {
      const group = e.slots[step.slot] || [];
      let reach = 0;
      for (const s of group) {
        const d = e.moveDef(s.id),
          f = G.Gyms.formOf(d);
        if (f && f !== 'buff' && f !== 'heal') reach = Math.max(reach, G.Gyms.reachOf(d, f));
      }
      if (dist > reach + (pl.r || 0) - G.LeaderPlanner.TUNE.closeInset) return toward();
    }
    return circle();
  }
  /** Straight away from you, or 45 degrees either side when that way has more open floor (G.World, as the edge unstick reads it). */
  awayFrom(e, ux, uy) {
    const ways = [0, 0.785, -0.785].map((a) => {
      const c = Math.cos(a),
        s = Math.sin(a),
        dx = -ux * c + uy * s,
        dy = -ux * s - uy * c;
      return { way: [dx, dy], room: this.room(e, dx, dy, 48) };
    });
    return ways.reduce((a, b) => (b.room > a.room + LeaderAI.UNSTICK.tie ? b : a)).way;
  }
  /** Mon e's movement state this fight (its circling side and the edge unstick's clocks): per-fight state lives on the AI, never on
   *  the mons (LEADER-AI SCOPE). */
  legsOf(e) {
    let L = this.legs.get(e);
    if (!L) this.legs.set(e, (L = {}));
    return L;
  }

  // ---------------- what its own moves can do (its HUD) ----------------

  /** Every move mon e moves for: the open moves of all its slots. */
  pool(e) {
    return e.slots.flat().filter((s) => G.Boss.open(e, s));
  }
  /** The reach of mon e's close moves (the largest melee cone or nova), from its center: yours, since the mon is player-sized. */
  reach(e) {
    let r = 0;
    for (const s of e.slots.flat()) {
      const d = e.moveDef(s.id),
        f = G.Gyms.formOf(d);
      if (G.Boss.TUNE.CLOSE.includes(f)) r = Math.max(r, G.Gyms.reachOf(d, f));
    }
    return r;
  }
  /** The slot to press (or -1): the press waits in the controller (`slots`, in press order) until the body reads it, as your keys
   *  wait for game.js (#40). */
  pressSlot(e, i) {
    if (i >= 0) this.slotQ.push(i);
  }

  /** Asks to swap to team slot `slot` (its own swap choice, G.Debug.leaderSwap and the harness). Pressed on the next swap step. */
  requestSwap(slot) {
    this.swapReq = slot;
  }
  /** The arena's swap step: `swapSlot` answers the request while `read` runs, then nothing. A refused request is dropped, as a
   *  key press of yours is: it does not wait for the lock to end. */
  swapFrame(read) {
    this.swapAnswer = this.swapReq;
    this.swapReq = -1;
    try {
      read(this.controller);
    } finally {
      this.swapAnswer = -1;
    }
  }
  /** A mon took the field (the arena calls it): a voluntary swap, a faint send-in or Re-Do. Each starts the minField clock; a
   *  voluntary one counts against swapLimit, and one made under the low HP line uses that mon's one low HP save. */
  arrived(voluntary) {
    this.fieldT = 0;
    this.pending = null;
    this.plan = null; // #51: a mon arriving plans afresh
    this.replanNow = 'a mon arrives';
    if (voluntary) {
      this.swaps++;
      if (this.why && this.why.why === 'low') this.saved.add(this.why.out);
    }
    this.why = null;
  }

  /** Inside a tell (its wind-up, until the move fires; the recovery after it is not the tell) or a move commitment (a dash, a root, a
   *  cooldown freeze): no decision is made. */
  busy(e) {
    const c = e.tell;
    return !!((c && !c.fired) || e.mvRoot || G.MoveSim.commits(e).length);
  }

  // ---------------- swaps ----------------

  /** The swap choice on a think tick (think holds it while the mon is in a tell or commitment). */
  decide(e) {
    const t = this.team;
    if (!t || t.living().length < 2 || e.dead) return;
    if (this.swapGate()) return;
    const S = this.set,
      cands = this.triggers(e);
    if (!cands.length) return;
    const best = cands.reduce((a, b) => (b.score > a.score || (b.score === a.score && b.j < a.j) ? b : a));
    const scores = cands.map((c) => t.members[c.j].name + ' ' + c.why + ' ' + c.score.toFixed(2)).join(', ');
    const margin = this.swapMargin();
    if (best.score < S.stay * margin - LeaderAI.EPS) {
      this.note('stay', 'nothing beats STAY ' + S.stay + ' x ' + margin.toFixed(3) + ': ' + scores);
      return;
    }
    this.note('swap', 'to ' + t.members[best.j].name + ' (' + best.why + '): ' + scores, { j: best.j, why: best.why });
    this.why = { why: best.why, out: e };
    this.requestSwap(best.j);
  }
  /** The first stall guard that holds a voluntary swap ('minField', 'swapLimit'), or null when none does. */
  swapGate() {
    const S = this.set;
    if (this.fieldT < S.minField - LeaderAI.EPS) return 'minField';
    if (S.swapLimit != null && this.swaps >= S.swapLimit) return 'swapLimit';
    return null;
  }
  /** Every bench mon a trigger sends in now: [{ j, why, score }]. LEADER-AI "SWAP AND SLOT CHOICES", the baseline thresholds:
   *  cc (asleep or frozen with ccLeft s or more left: the healthiest bench mon), low (under lowHp with no self heal left, once per
   *  mon: the best matchup at lowTo or more), matchup (a bench mon matchupX times the active's or better, at matchupHp or more). */
  triggers(e) {
    const S = this.set,
      t = this.team,
      frac = (m) => m.hp / m.maxHp,
      bench = t.members.map((m, j) => ({ m, j })).filter((c) => c.j !== t.activeIdx && !c.m.dead),
      top = (list, f) => list.reduce((a, b) => (!a || f(b) > f(a) ? b : a), null),
      out = [];
    const M = e.stMajor;
    if (M && (M.k === 'sleep' || M.k === 'freeze') && M.t >= S.ccLeft - LeaderAI.EPS) {
      const c = top(bench, (c) => frac(c.m));
      if (c) out.push({ j: c.j, why: 'cc', score: S.ccScore });
    }
    if (frac(e) < S.lowHp && !this.saved.has(e) && !this.healLeft(e)) {
      const c = top(
        bench.filter((c) => frac(c.m) >= S.lowTo - LeaderAI.EPS),
        (c) => this.matchup(c.m)
      );
      if (c) out.push({ j: c.j, why: 'low', score: S.lowScore });
    }
    const here = this.matchup(e);
    for (const c of bench) {
      if (frac(c.m) < S.matchupHp - LeaderAI.EPS) continue;
      const r = here > 0 ? this.matchup(c.m) / here : LeaderAI.FAR;
      if (r >= S.matchupX - LeaderAI.EPS) out.push({ j: c.j, why: 'matchup', score: Math.min(r, LeaderAI.FAR) });
    }
    return out;
  }
  /** A self heal it can still cast this fight (the heal cap counts; an hpBelow heal counts once it is open). */
  healLeft(e) {
    return e.healsLeft > 0 && this.pool(e).some((s) => G.Gyms.formOf(e.moveDef(s.id)) === 'heal');
  }

  /** LEADER-AI MATCHUP for leader mon m against your mon `you` (the one on the field unless a prediction names another): offense =
   *  its best open damaging move's type x your mon's types x STAB 1.5; defense = max(0.25, your attack's type x m's types); score =
   *  offense / defense. */
  matchup(m, you = LeaderAI.yours()) {
    return G.LeaderBelief.matchup(m, you); // #50: the matchup is Belief's (moved unchanged)
  }
  /** Your mon's most threatening revealed damaging move against m, as Belief holds it (#50; moved unchanged). */
  yourAttack(m, you = LeaderAI.yours()) {
    return G.LeaderBelief.yourAttack(m, you);
  }

  // ---------------- run memory (slice 4) ----------------

  /** LEAD: the fight's one chance to act on the lead pattern it believes (the header). A lone mon has no one to swap to, so it
   *  only says its line. */
  open(e) {
    this.opened = true;
    const info = G.LeaderBelief.current,
      mem = info && info.mem;
    if (LeaderAI.off.memory || !mem) return;
    const S = this.set,
      pat = G.LeaderMemory.lead(mem, S.learnRate);
    if (!pat) return this.note('memory', 'no lead pattern it believes (learnRate ' + S.learnRate + ')');
    const you = (G.Game.roster || []).find((m) => !m.dead && info.keyOf(m) === pat.key);
    if (!you) return this.note('memory', 'the mon it expects is not on your team: ' + pat.key);
    const who = (you.mon && you.mon.name) || pat.key;
    if (!mem.cap) mem.cap = new LeaderAI.Bag(S.predictCap, LeaderAI.capSeed());
    if (!mem.cap.next()) return this.note('exploit', 'held back by the prediction cap: ' + who + ' x' + pat.n);
    const t = this.team,
      here = t ? t.activeIdx : 0,
      list = t ? t.members.map((m, j) => ({ m, j })).filter((c) => !c.m.dead) : [{ m: e, j: 0 }];
    for (const c of list) c.score = this.matchup(c.m, you);
    // the mon on the field wins a tie: no swap without a better matchup
    const best = list.reduce(
      (a, b) => (b.score > a.score + LeaderAI.EPS ? b : a),
      list.find((c) => c.j === here) || list[0]
    );
    const scores = list.map((c) => c.m.name + ' ' + c.score.toFixed(2)).join(', ');
    this.note('exploit', 'your usual lead is ' + who + ' (' + pat.n + ' sightings): ' + scores, {
      j: best.j,
      key: pat.key,
    });
    this.heard({ k: 'exploit' });
    if (best.j === here) return;
    this.why = { why: 'exploit', out: e };
    this.requestSwap(best.j);
  }

  // ---------------- dodges ----------------

  /** Every frame: new threats go through the bag; a read one is answered `reflex` after it was noticed. */
  watch(e, dt) {
    const info = G.LeaderBelief.current;
    if (!info || e.dead) return;
    const S = this.set,
      list = info.threats(e, S.threatWindow, dt);
    for (const th of list) {
      if (this.seen.has(th.serial)) continue;
      this.seen.add(th.serial);
      const read = this.bag.next();
      this.note('threat', th.moveId + (read ? ' read' : ' let pass') + ', hits in ' + th.eta.toFixed(2) + ' s', {
        serial: th.serial,
        read,
      });
      if (read && !this.pending) this.pending = { at: this.clock + S.reflex, serial: th.serial };
    }
    const p = this.pending;
    if (!p || this.clock < p.at - LeaderAI.EPS) return;
    const th = list.find((x) => x.serial === p.serial);
    if (!th) {
      this.pending = null;
      this.note('dodge', 'the threat is gone');
      return;
    }
    if (this.busy(e)) return; // held while a tell or commitment lasts, as long as the threat does
    this.pending = null;
    const ready = e.dodges.cd.filter((c) => c <= 0).length;
    if (ready <= S.dodgeReserve) {
      this.note('dodge', 'no charge to spare (' + ready + ' ready, ' + S.dodgeReserve + ' kept back)');
      return;
    }
    e.heading = this.dodgeDir(e, th);
    this.dodgeAnswer = true;
    this.note('dodge', 'pressed against ' + th.moveId, { serial: th.serial });
  }
  /** LEADER-AI DODGE DIRECTION: sideways to the threat's path, to the side with more open floor (G.GymLeader room); about even, the
   *  side away from the path. A shape that is not moving (a strike waiting to land, a beam): straight away from it. */
  dodgeDir(e, th) {
    if (!th.vx && !th.vy) return this.lean(e, G.U.norm(e.x - th.x, e.y - th.y));
    const [ux, uy] = G.U.norm(th.vx, th.vy),
      off = (e.x - th.x) * -uy + (e.y - th.y) * ux, // > 0: the body is on the (-uy, ux) side of the path
      D = G.PlayerEntity.DODGE.dist,
      l = this.room(e, -uy, ux, D),
      r = this.room(e, uy, -ux, D),
      left = Math.abs(l - r) < LeaderAI.UNSTICK.tie ? off >= 0 : l > r;
    return this.lean(e, left ? [-uy, ux] : [uy, -ux]);
  }
  /** LEADER-AI DODGE DIRECTION, slice 3: the dodge turns by (aggr - 0.5) x 2 x `lean` degrees, toward you above 0.5 (never past
   *  you) and away below it. */
  lean(e, [dx, dy]) {
    const p = G.Game.player,
      a = (((this.aggr() - 0.5) * 2 * this.set.lean) / 180) * Math.PI;
    if (!p || Math.abs(a) < LeaderAI.EPS) return [dx, dy];
    const [ux, uy] = G.U.norm(p.x - e.x, p.y - e.y),
      to = Math.atan2(dx * uy - dy * ux, dx * ux + dy * uy), // the signed angle from the dodge to you
      r = Math.sign(to) * (a > 0 ? Math.min(a, Math.abs(to)) : a),
      c = Math.cos(r),
      s = Math.sin(r);
    return [dx * c - dy * s, dx * s + dy * c];
  }

  // ---------------- confidence and pacing (slice 3) ----------------

  /** The effective aggression: the authored aggression nudged by confidence (CONF.pull per unit off 0.5), within 0 to 1. */
  aggr() {
    return G.U.clamp(this.set.aggression + (this.conf - 0.5) * LeaderAI.CONF.pull, 0, 1);
  }
  /** The swap margin with confidence: lower when unsure (it swaps more readily), higher when sure. */
  swapMargin() {
    return this.set.margin * (1 + (this.conf - 0.5) * LeaderAI.CONF.marginK);
  }
  /** Every frame: the fight's events move confidence (confSwing scales them; 0 while confidence is off), the long window drifts it
   *  toward whoever leads the trade, triggers hear their events, and a big swing says a line. */
  feel(e, dt) {
    const info = G.LeaderBelief.current,
      S = this.set,
      C = LeaderAI.CONF,
      k = LeaderAI.off.confidence ? 0 : S.confSwing;
    if (info) {
      info.tick(dt, S.memoryUse);
      for (const ev of info.events()) {
        if (ev.k === 'landed') this.conf += C.hit * k;
        else if (ev.k === 'taken') this.conf -= C.hit * k;
        else if (ev.k === 'faint') this.conf += (ev.side === 'yours' ? C.faint : -C.faint) * k;
        this.heard(ev);
      }
      const w = info.windows(),
        lead = w.dealtLong - w.takenLong;
      if (Math.abs(lead) >= C.trade - LeaderAI.EPS) this.conf += Math.sign(lead) * C.drift * dt * k;
    }
    this.conf = G.U.clamp(this.conf, S.confMin, S.confMax);
    for (let i = this.temp.length - 1; i >= 0; i--) {
      const t = this.temp[i];
      if (this.clock < t.until - LeaderAI.EPS) continue;
      S[t.k] = t.old;
      this.temp.splice(i, 1);
    }
    if (!LeaderAI.off.confidence && Math.abs(this.conf - this.swingRef) >= C.swing - LeaderAI.EPS) {
      if (this.clock - this.swingAt >= C.swingCd - LeaderAI.EPS) {
        const up = this.conf > this.swingRef,
          line = this.lineSet[up ? 'up' : 'down'];
        this.note('swing', 'confidence ' + this.swingRef.toFixed(2) + ' to ' + this.conf.toFixed(2));
        if (line) this.say(line);
        this.swingRef = this.conf;
        this.swingAt = this.clock;
      }
    }
  }
  /** LEADER-AI GAP-CLOSING DODGE: bold enough (aggr at gapClose or more), a close move ready, you just outside its reach and inside
   *  one dodge more, and a charge to spare beyond dodgeReserve plus one kept for threats (Jess 2026-11-08). Straight at you. On the
   *  think tick (#51: no longer inside pacing, which is gone; #52 makes it the planner's Dash in). */
  gapClose(e, pl) {
    const S = this.set;
    if (this.aggr() < S.gapClose - LeaderAI.EPS || this.pending || e.dodgeT > 0) return;
    if (!this.pool(e).some((s) => s.t <= 0 && LeaderAI.CLOSE.includes(G.Gyms.formOf(e.moveDef(s.id))))) return;
    const reach = this.reach(e) + (pl.r || 0),
      d = G.U.dist(e.x, e.y, pl.x, pl.y);
    if (d <= reach || d - G.PlayerEntity.DODGE.dist > reach) return;
    const ready = e.dodges.cd.filter((c) => c <= 0).length;
    if (ready <= S.dodgeReserve + 1) return;
    e.heading = G.U.norm(pl.x - e.x, pl.y - e.y);
    this.dodgeAnswer = true;
    this.note('gap', 'dodges in: you are ' + Math.round(d) + ' px, its reach ' + Math.round(reach));
  }
  /** One line for the ?dev overlay: confidence, effective aggression and the goal it runs (#51). */
  status() {
    const p = this.plan;
    return (
      'conf ' +
      this.conf.toFixed(2) +
      '  aggr ' +
      this.aggr().toFixed(2) +
      '  goal ' +
      (p ? p.goal + ' (value ' + p.value.toFixed(3) + ', cost ' + p.cost.toFixed(3) + ')' : 'none')
    );
  }
  /** The ?dev overlay's plan lines (LEADER-AI OVERLAY): the plan's steps, each with its cost for the goal (the running one marked),
   *  then the top three alternatives, each goal with its value and cost. */
  overlayLines() {
    const p = this.plan,
      out = [];
    if (!p || !this.world) return out;
    p.steps.forEach((s, i) =>
      out.push(
        (i === p.at ? '> ' : '  ') +
          (i + 1) +
          ' ' +
          this.stepText(s) +
          ' ' +
          s.duration.toFixed(2) +
          ' s, cost ' +
          G.LeaderPlanner.costOf(this.world, p.goal, [s]).toFixed(3)
      )
    );
    const alts = ((this.choice && this.choice.ranking) || []).filter((c) => c.goal !== p.goal).slice(0, 3);
    for (const c of alts)
      out.push(
        '  alt ' +
          c.goal +
          ' value ' +
          c.value.toFixed(3) +
          ' cost ' +
          c.cost.toFixed(3) +
          (c.partial ? ' (partial)' : '')
      );
    return out;
  }
  /** The cooldown-window bars for the overlay: each revealed move of your mon on the field with its window and the time since its
   *  last cast, as Belief holds them. */
  windowBars() {
    const belief = G.LeaderBelief.current,
      you = LeaderAI.yours();
    if (!belief || !you) return [];
    const out = [];
    for (const id of belief.reveals(you).moves) {
      const win = belief.window(you, id);
      if (win) out.push({ id, lo: win.lo, hi: win.hi, since: belief.sinceCast(you, id) });
    }
    return out;
  }

  // ---------------- triggers and lines (slice 3) ----------------

  /** The authored triggers (gym ai.triggers), each { on, below, side, at, repeat, line, slot, swap, set, for }. */
  useTriggers(list) {
    this.trig = list.map((d) => ({ d, fired: 0, due: false, arm: true }));
  }
  /** A fight event reaches the triggers waiting on it. */
  heard(ev) {
    for (const tr of this.trig) {
      const d = tr.d;
      if (
        (ev.k === 'faint' && d.on === 'faint' && d.side === ev.side) ||
        (ev.k === 'sendIn' && d.on === 'sendIn') ||
        (ev.k === 'exploit' && d.on === 'exploit')
      )
        tr.due = true;
    }
  }
  /** Every frame: the conditions that are states (fight start, an HP line crossed, time). */
  watchTriggers(e) {
    const frac = e.hp / e.maxHp;
    for (const tr of this.trig) {
      const d = tr.d;
      if (d.on === 'start' && !this.started) tr.due = true;
      else if (d.on === 'hp') {
        if (frac >= d.below) tr.arm = true;
        else if (tr.arm) {
          tr.arm = false;
          tr.due = true;
        }
      } else if (d.on === 'time' && this.clock >= d.at * (d.repeat ? tr.fired + 1 : 1) - LeaderAI.EPS) tr.due = true;
    }
    this.started = true;
  }
  /** Fires every due trigger (outside a tell or commitment), once unless `repeat`. Its actions go through your controls. */
  fireTriggers(e) {
    for (const tr of this.trig) {
      if (!tr.due) continue;
      tr.due = false;
      if (tr.fired && !tr.d.repeat) continue;
      tr.fired++;
      const d = tr.d;
      this.note('trigger', d.on + (d.line ? ': ' + d.line : ''));
      if (d.line) this.say(d.line, d.on === 'exploit'); // a read goes ahead of the queue, so the banner does not drop it
      this.forcedAction(e, d);
      for (const k of Object.keys(d.set || {})) {
        const had = this.temp.find((t) => t.k === k),
          until = d.for != null ? this.clock + d.for : Infinity;
        if (had) had.until = until;
        else this.temp.push({ k, old: this.set[k], until });
        this.set[k] = d.set[k];
      }
    }
  }
  /** #51 (LEADER-AI TRIGGERS): the hook a trigger's forced action used (a slot press, a swap). Kept unused: forced slot and swap
   *  actions are gone (the gyms.js validator refuses them); triggers feed lines and settings only. */
  forcedAction() {}
  /** Queues "<leader>: <text>" for the banner (`first`: ahead of the lines already waiting). */
  say(text, first = false) {
    const l = { text: this.name + ': ' + text, at: this.clock };
    if (first) this.lines.unshift(l);
    else this.lines.push(l);
  }
  /** Shows the next queued line once no other banner is up; one older than LINE_WAIT s is dropped. */
  flushLines() {
    while (this.lines.length) {
      const l = this.lines[0];
      if (this.clock - l.at > LeaderAI.LINE_WAIT + LeaderAI.EPS) {
        this.lines.shift();
        this.note('line', 'dropped: ' + l.text);
        continue;
      }
      if (G.Spawner.banner()) return;
      this.lines.shift();
      G.Spawner.say(l.text, LeaderAI.LINE_T);
      return;
    }
  }

  /** One decision for the log (the ?dev overlay reads the last few). */
  note(act, text, extra = null) {
    this.log.push(Object.assign({ t: +this.clock.toFixed(3), act, text }, extra));
    if (this.log.length > LeaderAI.LOG_N) this.log.shift();
  }

  /** Your mon on the field, as the information layer sees your roster. */
  static yours() {
    const r = G.Game.roster;
    return r ? r[G.Game.activeIndex] || null : null;
  }
  static typesOf(m) {
    return (m.mon && m.mon.types) || (G.DEX_BY[m.dex] && G.DEX_BY[m.dex].types) || [];
  }
  /** The settings for gym `gym`: each authored one (a number, or keyed by loop as the build keys are), else the baseline. */
  static settings(gym) {
    const a = (gym && gym.ai) || {},
      loop = (gym && gym.loop) || 1,
      out = {};
    for (const k of Object.keys(LeaderAI.BASE)) {
      const v = a[k],
        at = v != null && typeof v === 'object' ? G.Gyms.perLoop(v, loop) : v;
      out[k] = at != null ? at : LeaderAI.BASE[k];
    }
    return out;
  }
};
G.LeaderAI.NONE = Object.freeze([]);
/** Edge unstick numbers (Jess 2026-11-07). slip, stuck, side, turn: the wild body's (enemy.js). probe, tie, shut (px): the
 *  smart side's look-ahead, the gap that counts as even, and the room below which a side counts as shut. */
G.LeaderAI.UNSTICK = Object.freeze({ slip: 0.35, stuck: 0.35, side: 0.7, turn: 1.25, probe: 24, tie: 4, shut: 4 });
G.LeaderAI.EPS = 1e-6;
G.LeaderAI.FAR = 99; // the matchup ratio when your mon cannot be hurt by the one on the field (offense 0)
G.LeaderAI.LOG_N = 40;
/** The baseline settings (LEADER-AI "Authoring a leader"; all TUNE, BALANCE.md "Leader AI"). Seconds: think, reflex, threatWindow,
 *  minField, ccLeft. dodgeRead: reads per block of BAG threats. swapLimit null: no cap. HP lines are fractions of max HP. stay, margin
 *  and the scores: a trigger scores ccScore, lowScore or the matchup ratio, and must beat stay x margin. randomness: off until slice 5. */
G.LeaderAI.BASE = Object.freeze({
  think: 0.25,
  reflex: 0.15,
  threatWindow: 0.6,
  dodgeRead: 6,
  dodgeReserve: 0,
  minField: 8,
  swapLimit: null,
  stay: 1,
  margin: 1.1,
  ccLeft: 1.5,
  ccScore: 3,
  lowHp: 0.25,
  lowTo: 0.5,
  lowScore: 2.5,
  matchupX: 2,
  matchupHp: 0.4,
  randomness: 0,
  // slice 3 (#32): style and confidence. aggression, the conf* values and gapClose are 0 to 1; lean degrees at aggr 0 or 1
  // (#51: pushAfter and breatherMax went with pacing)
  aggression: 0.5,
  confStart: 0.5,
  confSwing: 1,
  confMin: 0.2,
  confMax: 0.9,
  gapClose: 0.7,
  lean: 45,
  // slice 4 (#33): learnRate sightings before a pattern is believed; predictCap acts per BAG chances to act on one
  learnRate: 3,
  predictCap: 7,
  // #50 (#49 slice 1): how fast the cooldown window closes on each clean gap (0 to 1, higher learns faster; G.LeaderBelief)
  memoryUse: 0.5,
  // #51 (#49 slice 2): the planner's settings. range: Maintain's preferred distance (px; the slot stance is not read, decision
  // 2026-11-09-51-opening-stance-traces-and-set-trigger); aimError (px) in the hit chance; risk x the damage-taken weight;
  // stubbornness x the commitment bonus
  range: 220,
  aimError: 0,
  risk: 1,
  stubbornness: 1,
});
G.LeaderAI.BAG = 10;
/** Slice 3 (all TUNE, BALANCE.md "Leader AI"). CONF: each hit landed or taken, each faint (yours up, its own down), the drift per
 *  second while the long window's trade is `trade` or more, `pull` (aggr per unit of confidence off 0.5), `marginK` (the swap margin's
 *  share), the swing that says a line and the cooldown between those lines. (#51: PACE and HOLD went with pacing.) */
G.LeaderAI.CONF = Object.freeze({
  hit: 0.03,
  faint: 0.15,
  drift: 0.01,
  trade: 0.1,
  pull: 0.6,
  marginK: 0.25,
  swing: 0.25,
  swingCd: 20,
});
G.LeaderAI.CLOSE = Object.freeze(['melee', 'nova', 'multi']); // the forms a gap-closing dodge brings into reach
G.LeaderAI.LINE_WAIT = 4; // seconds a line may wait for the banner (the send-out line shows 3.2 s)
G.LeaderAI.LINE_T = 2.4; // seconds a line shows
/** Dev and harness switches: turn its own planner (#51: off, it stands and presses no slot), swap, dodge (the gap-closing dodge
 *  too), confidence, trigger or memory (slice 4: acting on a pattern) decisions off. */
G.LeaderAI.off = { planner: false, swaps: false, dodges: false, confidence: false, triggers: false, memory: false };
/** The dodge bag's seed for every fight from now on (the harness fixes it); null: a new one each fight. */
G.LeaderAI.seed = null;
/** The prediction cap bag's seed: its own source, derived from `seed` when the harness fixes one. */
G.LeaderAI.capSeed = () =>
  G.LeaderAI.seed != null ? (G.LeaderAI.seed ^ 0x9e3779b9) >>> 0 : (Date.now() ^ 0x5bd1e995) >>> 0;

/** LEADER-AI DODGE READ BAG: each block of BAG threats holds exactly `reads` reads, in an order shuffled from its own seeded source
 *  (mulberry32, separate from the game's Math.random and from `randomness`), so the rate is exact per block and replayable. */
G.LeaderAI.Bag = class Bag {
  constructor(reads, seed) {
    this.reads = Math.max(0, Math.min(G.LeaderAI.BAG, Math.round(reads)));
    this.s = seed >>> 0;
    this.left = [];
    this.blocks = 0;
  }
  rng() {
    let z = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }
  /** The next threat: true when it is read. */
  next() {
    if (!this.left.length) this.fill();
    return this.left.shift();
  }
  fill() {
    const n = G.LeaderAI.BAG,
      a = [];
    for (let i = 0; i < n; i++) a.push(i < this.reads);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    this.left = a;
    this.blocks++;
  }
};
