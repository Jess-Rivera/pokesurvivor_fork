/* ============ leader-ai.js: the AI player that drives a Player-entity leader (G.LeaderAI) ============
 * Spec: docs/LEADER-AI.md (Jess 2026-11-08). One AI player per leader team; it acts only through the controller your keyboard
 * answers, the seven calls of G.PlayerEntity.IDLE, so your rules (slot hold, swap lock, trap, Fly, stuns, dodge charges) decide every
 * press. What it can see: G.LeaderInfo.
 * Slice 1 (#22): the controls layer. It wraps G.Boss.GymBrain: the brain's heading becomes `axis` and its slot choice `slots`, so
 * Misty and Brock move and cast as before. `shake`, `swapDir` and `cycles` answer nothing yet (shake-off stays the authored autoShake).
 * Slice 2 (#31): its own swap and dodge decisions, on its settings (BASE below, or the gym's `ai` in js/data/gyms.js).
 *   SWAPS   on the think tick, never inside a tell's wind-up or a move commitment: a tick that lands inside one waits for the first
 *           frame out of it (a stunned mon is not acting, so asleep it may still swap, as you may). Gates first: minField seconds on the field, swapLimit voluntary swaps a fight. Then each bench mon is scored by
 *           the spec's triggers (asleep or frozen, low HP with no self heal, a better matchup) against STAY, and the best fires only
 *           if it beats STAY x margin. Pressed through `swapSlot`; the arena's swap step runs your rules.
 *   DODGES  a threat (G.LeaderInfo threats) is noticed on any frame; the dodge bag says whether it is read; a read threat is answered
 *           exactly `reflex` later, held while a tell or commitment lasts, dropped once it is gone. It presses `dodge` with a
 *           heading sideways to the threat's path, toward the more open floor, and keeps `dodgeReserve` charges back.
 *   LOG     every decision, with its reason and scores, for the ?dev overlay (move-render.js) and the harness.
 * Slice 3 (#32): confidence, pacing, triggers and lines (Jess 2026-11-08, decision 2026-11-08-leader-ai-slice-3-opened-breather-is-back-off-plus-slot-choice).
 *   CONFIDENCE  one value per team, moved by what G.LeaderInfo shows (hits landed and taken, faints, the long window's trade),
 *               between confMin and confMax. It shifts the effective aggression (aggr) and the swap margin; never a stat or a number.
 *   PACING      on the think tick: a stance, neutral, push (GymBrain's close stance: frustration, or pressing an advantage) or
 *               breather (the far stance, plus a buff or heal slot when one is ready; it never holds back a cast). A breather keeps
 *               under breatherMax of the fight; a mon arriving starts neutral. The bold gap-closing dodge rides the same tick.
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
 * heal cap are the body's authored cast rules (G.GymLeader.Caster), on your sim scheduler (G.MoveSim.turn). Where slices 1 to 4
 * below say "the brain", read those.
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
    this.stance = 'neutral'; // 'neutral', 'push' or 'breather'
    this.stanceWhy = '';
    this.stanceT = 0; // seconds in the current stance
    this.stanceLen = 0; // how long it lasts at most
    this.breathT = 0; // breather seconds this fight (breatherMax)
    this.breathNext = 0; // the clock from which another breather may start
    this.lastHit = 0; // the clock when it last landed a hit
    this.pushEnd = 0; // the clock when the last push ended (frustration counts from the later of the two)
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
   *  The heading (with the body's edge unstick on top) and the slot choice come from steer; then the dodge watch every frame, the
   *  swap choice on the think tick. */
  think(e, dt, pl) {
    e.heading = e.unstick(dt, this.steer(e, dt, pl));
    this.clock += dt;
    this.fieldT += dt;
    this.feel(e, dt);
    if (!LeaderAI.off.dodges) this.watch(e, dt);
    if ((this.tickT -= dt) <= LeaderAI.EPS) {
      this.tickT += this.set.think;
      this.due = true;
    }
    // a tick that lands inside a tell or commitment waits for the first frame out of it (it is never skipped)
    const free = G.Status.stunned(e) || !this.busy(e);
    if (this.due && free) {
      this.due = false;
      if (!this.opened) this.open(e);
      if (!LeaderAI.off.pacing) this.pace(e, pl);
      if (!LeaderAI.off.swaps) this.decide(e);
    }
    if (!LeaderAI.off.triggers) {
      this.watchTriggers(e);
      if (free) this.fireTriggers(e);
    }
    this.flushLines();
  }
  /** Where to go (slice 5a: moved off GymBrain unchanged): the way to you (around walls, G.Path) at speed 1, so the answer is a
   *  heading for the controller. The slot choice is pressed first (an answer the body reads, #40); while the body is held (a tell
   *  runs or a dash carries it, as you see your own wind-up), the heading is none. The stance alternates far and close (7 to 9 s at
   *  its favorite range, 4 to 5 s at the other; a mon with no melee move stays far; below LOW_HP it favors far) unless pacing holds one (a push
   *  holds close, a push with no melee move walks to the inner edge of its far band; a breather holds far). Far: it backs off inside
   *  NEAR, circles you inside FAR and walks in beyond it, the band shrunk to its longest ready ranged move's reach. Close with every
   *  close move recharging: it circles just outside its reach. */
  steer(e, dt, pl) {
    const T = G.Boss.TUNE,
      c = e.caster,
      L = this.legsOf(e),
      now = G.Gym.now();
    let [dx, dy] = G.U.norm(pl.x - e.x, pl.y - e.y);
    const pd = G.Path.dirFor(e, pl);
    if (pd) [dx, dy] = pd;
    const dist = G.U.dist(e.x, e.y, pl.x, pl.y);
    if (L.mode == null) this.startLegs(e, L);
    this.pressSlot(e, this.pickSlot(e, pl, now));
    if (c.held()) return [0, 0];
    if (!L.low && e.hp < e.maxHp * T.LOW_HP) {
      L.low = true;
      L.farLike = 0.8;
    }
    const hold = LeaderAI.off.pacing ? null : LeaderAI.HOLD[this.stance],
      tight = hold === 'close' && !L.melee;
    if (hold) L.mode = tight ? 'far' : hold;
    else L.modeT -= dt;
    if (!hold && L.modeT <= 0) {
      L.mode = L.mode === 'far' && L.melee ? 'close' : 'far';
      L.modeT = (L.mode === 'far') === L.farLike > 0.5 ? G.U.rand(7, 9) : G.U.rand(4, 5);
      L.side = -L.side;
    }
    // a leader moves at its species speed, always: no chase bonus, no slower circling (Jess, 2026-10-19)
    let vx = dx,
      vy = dy;
    const [ux, uy] = G.U.norm(pl.x - e.x, pl.y - e.y);
    const circle = () => {
      vx = -uy * L.side;
      vy = ux * L.side;
    };
    if (L.mode === 'far') {
      let out = Math.min(T.FAR, c.ranged() - T.SHOT_IN),
        inn = Math.min(T.NEAR, out - T.BAND);
      if (tight) [out, inn] = [inn, inn - T.BAND];
      if (dist < inn) {
        vx = -ux;
        vy = -uy;
      } else if (dist < out) circle();
    } else if (!T.CLOSE.some((f) => c.ready(f))) {
      const r = c.reach() + (pl.r || 0) + 30;
      if (dist < r) {
        vx = -ux;
        vy = -uy;
      } else if (dist < r + 40) circle();
    }
    return [vx, vy];
  }
  /** Mon e's movement state this fight (its stance, the clock to the next switch, the circling side, its low HP mark): per-fight
   *  state lives on the AI, never on the mons (LEADER-AI SCOPE). */
  legsOf(e) {
    let L = this.legs.get(e);
    if (!L) this.legs.set(e, (L = {}));
    return L;
  }
  /** The fight's first frame of mon e: its favorite range from the authored stance, the first switch in 6 to 8 s, a random side. */
  startLegs(e, L) {
    const st = e.gym.stance;
    L.melee = e.slots.flat().some((s) => G.Boss.TUNE.CLOSE.includes(G.Gyms.formOf(e.caster.def(s.id))));
    L.farLike = st === 'far' ? 0.8 : st === 'close' ? 0.2 : 0.5;
    L.mode = st === 'far' || !L.melee ? 'far' : 'close';
    L.modeT = G.U.rand(6, 8);
    L.side = Math.random() < 0.5 ? -1 : 1;
    L.low = false;
  }
  /** The slot choice (slice 5a: moved off GymBrain unchanged; entity model slice 8, Jess 2026-11-07), under your 0.4 s slot hold and
   *  never inside a tell. In order: 1 a self heal slot that can cast while hurt (the heal cap counts); 2 stay on the active slot
   *  while it has a ready move in reach that no other slot beats by SWITCH_MARGIN; 3 else the slot with the best attack score; 4 with
   *  nothing ready in reach, a buff slot whose Gate is open. The slot to press, or -1 to stay. */
  pickSlot(e, pl, now) {
    const c = e.caster;
    if (e.slots.length < 2 || c.tell || e.mvRoot || e.stFl || e.swapT > 0) return -1;
    const S = G.Boss.sense(e, pl),
      go = (i) => (i !== e.active ? i : -1),
      slotWith = (form, ok) =>
        e.slots.findIndex((g) =>
          g.some((s) => G.Boss.open(e, s) && s.t <= 0 && G.Gyms.formOf(c.def(s.id)) === form && ok(s))
        );
    if (S.hpFrac < 1 && c.healsLeft > 0) {
      const h = slotWith('heal', () => true);
      if (h >= 0) return go(h);
    }
    let cur = null,
      top = null,
      at = -1;
    e.slots.forEach((g, i) => {
      const k = c.attack(
        S.dist,
        pl,
        now,
        g.filter((s) => G.Boss.open(e, s)),
        true
      );
      if (!k) return;
      if (i === e.active) cur = k;
      if (!top || k.score > top.score || (k.score === top.score && k.rank < top.rank)) {
        top = k;
        at = i;
      }
    });
    if (top) return !cur || top.score >= G.Boss.TUNE.SWITCH_MARGIN * cur.score ? go(at) : -1;
    const b = slotWith('buff', (s) => G.MoveEffects.statReady(c.def(s.id), e));
    return b >= 0 ? go(b) : -1;
  }
  /** The slot choice picked slot i (or -1): the press waits in the controller (`slots`, in press order) until the body reads it, as
   *  your keys wait for game.js (#40). In a breather a ready buff or heal slot is pressed instead (pacing); a trigger's own press
   *  (`raw`) is never replaced. */
  pressSlot(e, i, raw = false) {
    if (!raw && this.stance === 'breather' && !LeaderAI.off.pacing) {
      const q = this.quietSlot(e);
      if (q >= 0) i = q !== e.active ? q : -1;
    }
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
    if (this.stance !== 'neutral') this.endStance('a mon arrives');
    if (voluntary) {
      this.swaps++;
      if (this.why && this.why.why === 'low') this.saved.add(this.why.out);
    }
    this.why = null;
  }

  /** Inside a tell (its wind-up, until the move fires; the recovery after it is not the tell) or a move commitment (a dash, a root, a
   *  cooldown freeze): no decision is made. */
  busy(e) {
    const c = e.caster.tell;
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
    const b = e.caster;
    return b.healsLeft > 0 && b.pool().some((s) => G.Gyms.formOf(b.def(s.id)) === 'heal');
  }

  /** LEADER-AI MATCHUP for leader mon m against your mon `you` (the one on the field unless a prediction names another): offense =
   *  its best open damaging move's type x your mon's types x STAB 1.5; defense = max(0.25, your attack's type x m's types); score =
   *  offense / defense. */
  matchup(m, you = LeaderAI.yours()) {
    if (!you) return 1;
    const yt = LeaderAI.typesOf(you);
    let off = 0;
    for (const s of m.caster.pool()) {
      const d = m.caster.def(s.id);
      if (!(d.basePower > 0)) continue;
      off = Math.max(off, G.Types.mult(d.type, yt) * (m.types.includes(d.type) ? 1.5 : 1));
    }
    return off / Math.max(0.25, G.Types.mult(this.yourAttack(m, you).type, m.types));
  }
  /** Your mon's most threatening revealed damaging move against m: the highest type multiplier, then the higher power. Before any is
   *  revealed, a guess of its own type (a two-type mon: the type that hits m harder). Only what G.LeaderInfo has seen is read. */
  yourAttack(m, you = LeaderAI.yours()) {
    const info = G.LeaderInfo.current;
    let best = null;
    for (const id of you && info ? info.reveals(you).moves : []) {
      const d = G.MoveDefs[id];
      if (!d || !(d.basePower > 0)) continue;
      const k = G.Types.mult(d.type, m.types);
      if (!best || k > best.k || (k === best.k && d.basePower > best.power))
        best = { id, type: d.type, k, power: d.basePower };
    }
    if (best) return best;
    for (const type of you ? LeaderAI.typesOf(you) : []) {
      const k = G.Types.mult(type, m.types);
      if (!best || k > best.k) best = { id: null, type, k, power: 0 };
    }
    return best || { id: null, type: 'normal', k: 1, power: 0 };
  }

  // ---------------- run memory (slice 4) ----------------

  /** LEAD: the fight's one chance to act on the lead pattern it believes (the header). A lone mon has no one to swap to, so it
   *  only says its line. */
  open(e) {
    this.opened = true;
    const info = G.LeaderInfo.current,
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
    const info = G.LeaderInfo.current;
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
      l = e.room(-uy, ux, D),
      r = e.room(uy, -ux, D),
      left = Math.abs(l - r) < G.GymLeader.UNSTICK.tie ? off >= 0 : l > r;
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
   *  toward whoever leads the trade, the stance runs its clock, triggers hear their events, and a big swing says a line. */
  feel(e, dt) {
    const info = G.LeaderInfo.current,
      S = this.set,
      C = LeaderAI.CONF,
      k = LeaderAI.off.confidence ? 0 : S.confSwing;
    if (info) {
      info.tick(dt);
      for (const ev of info.events()) {
        if (ev.k === 'landed') {
          this.lastHit = this.clock;
          this.conf += C.hit * k;
          if (this.stance === 'push') this.endStance('landed a hit');
        } else if (ev.k === 'taken') this.conf -= C.hit * k;
        else if (ev.k === 'faint') this.conf += (ev.side === 'yours' ? C.faint : -C.faint) * k;
        this.heard(ev);
      }
      const w = info.windows(),
        lead = w.dealtLong - w.takenLong;
      if (Math.abs(lead) >= C.trade - LeaderAI.EPS) this.conf += Math.sign(lead) * C.drift * dt * k;
    }
    this.conf = G.U.clamp(this.conf, S.confMin, S.confMax);
    if (this.stance !== 'neutral') {
      this.stanceT += dt;
      if (this.stance === 'breather') this.breathT += dt;
      const cap = this.stance === 'breather' && this.breathT >= S.breatherMax * this.clock - LeaderAI.EPS;
      if (cap || this.stanceT >= this.stanceLen - LeaderAI.EPS) this.endStance(cap ? 'breatherMax' : 'its time is up');
    }
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
  /** The pacing choice on the think tick: a breather after sustained pressure on you (the short window, once breathNext has come and
   *  while under breatherMax), else a push on frustration or to press an advantage, else the bold gap-closing dodge. */
  pace(e, pl) {
    const S = this.set,
      P = LeaderAI.PACE,
      a = this.aggr(),
      info = G.LeaderInfo.current;
    if (!info || this.stance === 'breather') return;
    const w = info.windows();
    if (
      w.dealt >= P.pressure - LeaderAI.EPS &&
      this.clock >= this.breathNext - LeaderAI.EPS &&
      this.breathT < S.breatherMax * this.clock - LeaderAI.EPS
    )
      return this.startStance(
        'breather',
        'pressure: ' + Math.round(w.dealt * 100) + '% dealt in 2 s',
        P.breathLen * (1.5 - a)
      );
    if (this.stance === 'push') return this.gapClose(e, pl);
    const quiet = this.clock - Math.max(this.lastHit, this.pushEnd),
      you = G.Game.player;
    if (quiet >= S.pushAfter * (1.5 - a) - LeaderAI.EPS)
      return this.startStance('push', 'frustration: no hit for ' + quiet.toFixed(1) + ' s', P.pushLen);
    if (this.conf >= P.pressConf - LeaderAI.EPS && you && you.hp < you.maxHp * P.pressHp)
      return this.startStance('push', 'press: you are at ' + Math.round((you.hp / you.maxHp) * 100) + '%', P.pushLen);
    this.gapClose(e, pl);
  }
  startStance(stance, why, len) {
    this.stance = stance;
    this.stanceWhy = why;
    this.stanceT = 0;
    this.stanceLen = len;
    this.note(stance, why + ', ' + len.toFixed(2) + ' s at most');
  }
  endStance(why) {
    if (this.stance === 'breather')
      this.breathNext = this.clock + LeaderAI.PACE.gap0 + LeaderAI.PACE.gapK * this.aggr();
    if (this.stance === 'push') this.pushEnd = this.clock;
    this.note('neutral', this.stance + ' ends: ' + why);
    this.stance = 'neutral';
    this.stanceWhy = why;
    this.stanceT = 0;
  }
  /** A breather's quiet slot: a buff slot whose Gate is open, or a heal slot while hurt with a heal left; -1 when none. */
  quietSlot(e) {
    const b = e.caster;
    if (e.slots.length < 2 || b.tell || e.mvRoot || e.stFl) return -1;
    return e.slots.findIndex((g) =>
      g.some((s) => {
        if (s.t > 0 || (s.hpBelow != null && e.hp >= e.maxHp * s.hpBelow)) return false;
        const d = b.def(s.id),
          f = G.Gyms.formOf(d);
        return (f === 'buff' && G.MoveEffects.statReady(d, e)) || (f === 'heal' && e.hp < e.maxHp && b.healsLeft > 0);
      })
    );
  }
  /** LEADER-AI GAP-CLOSING DODGE: bold enough (aggr at gapClose or more), a close move ready, you just outside its reach and inside
   *  one dodge more, and a charge to spare beyond dodgeReserve plus one kept for threats (Jess 2026-11-08). Straight at you. */
  gapClose(e, pl) {
    const S = this.set,
      b = e.caster;
    if (this.aggr() < S.gapClose - LeaderAI.EPS || this.pending || e.dodgeT > 0) return;
    if (!b.pool().some((s) => s.t <= 0 && LeaderAI.CLOSE.includes(G.Gyms.formOf(b.def(s.id))))) return;
    const reach = b.reach() + (pl.r || 0),
      d = G.U.dist(e.x, e.y, pl.x, pl.y);
    if (d <= reach || d - G.PlayerEntity.DODGE.dist > reach) return;
    const ready = e.dodges.cd.filter((c) => c <= 0).length;
    if (ready <= S.dodgeReserve + 1) return;
    e.heading = G.U.norm(pl.x - e.x, pl.y - e.y);
    this.dodgeAnswer = true;
    this.note('gap', 'dodges in: you are ' + Math.round(d) + ' px, its reach ' + Math.round(reach));
  }
  /** One line for the ?dev overlay. */
  status() {
    return (
      'conf ' +
      this.conf.toFixed(2) +
      '  aggr ' +
      this.aggr().toFixed(2) +
      '  ' +
      this.stance +
      (this.stanceWhy ? ': ' + this.stanceWhy : '')
    );
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
      if (d.slot != null) this.pressSlot(e, d.slot - 1, true);
      if (d.swap != null) {
        this.why = { why: 'trigger', out: e };
        this.requestSwap(d.swap - 1);
      }
      for (const k of Object.keys(d.set || {})) {
        const had = this.temp.find((t) => t.k === k),
          until = d.for != null ? this.clock + d.for : Infinity;
        if (had) had.until = until;
        else this.temp.push({ k, old: this.set[k], until });
        this.set[k] = d.set[k];
      }
    }
  }
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
  // slice 3 (#32): style, confidence and pacing. aggression, the conf* values, breatherMax and gapClose are 0 to 1; pushAfter
  // seconds at aggr 0.5 (x (1.5 - aggr)); lean degrees at aggr 0 or 1
  aggression: 0.5,
  confStart: 0.5,
  confSwing: 1,
  confMin: 0.2,
  confMax: 0.9,
  pushAfter: 6,
  breatherMax: 0.25,
  gapClose: 0.7,
  lean: 45,
  // slice 4 (#33): learnRate sightings before a pattern is believed; predictCap acts per BAG chances to act on one
  learnRate: 3,
  predictCap: 7,
});
G.LeaderAI.BAG = 10;
/** Slice 3 (all TUNE, BALANCE.md "Leader AI"). CONF: each hit landed or taken, each faint (yours up, its own down), the drift per
 *  second while the long window's trade is `trade` or more, `pull` (aggr per unit of confidence off 0.5), `marginK` (the swap margin's
 *  share), the swing that says a line and the cooldown between those lines. PACE: a push's length, pressing an advantage (confidence
 *  and your HP fraction), the pressure that earns a breather (dealt in the short window), its length at aggr 0.5 (x (1.5 - aggr)) and
 *  the wait after one (gap0 + gapK x aggr). */
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
G.LeaderAI.PACE = Object.freeze({
  pushLen: 5,
  pressConf: 0.7,
  pressHp: 0.4,
  pressure: 0.15,
  breathLen: 3,
  gap0: 8,
  gapK: 16,
});
G.LeaderAI.HOLD = Object.freeze({ neutral: null, push: 'close', breather: 'far' }); // the movement stance each pacing stance holds (steer)
G.LeaderAI.CLOSE = Object.freeze(['melee', 'nova', 'multi']); // the forms a gap-closing dodge brings into reach
G.LeaderAI.LINE_WAIT = 4; // seconds a line may wait for the banner (the send-out line shows 3.2 s)
G.LeaderAI.LINE_T = 2.4; // seconds a line shows
/** Dev and harness switches: turn its own swap, dodge, confidence, pacing, trigger or memory (slice 4: acting on a pattern) decisions
 *  off (the slice 1 parity runs with all off; slice 2's checks with the slice 3 ones off). */
G.LeaderAI.off = { swaps: false, dodges: false, confidence: false, pacing: false, triggers: false, memory: false };
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
