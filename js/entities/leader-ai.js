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
 */
G.LeaderAI = class LeaderAI {
  /** @param members the leader mons it drives, in slot order; @param team their G.Team, or null for a lone mon */
  constructor(members, team = null) {
    this.members = members;
    this.team = team;
    this.set = LeaderAI.settings(members[0] && members[0].gym);
    this.slotAnswer = LeaderAI.NONE; // this frame's slot presses, set only while the brain's pick is pressed (pressSlot)
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
      slots: () => this.slotAnswer,
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

  /** One frame for mon `e`: its heading from the brain (none while stunned, when the brain does not step at all), with the body's
   *  edge unstick on top. The brain's slot choice is pressed inside its step (pressSlot), before its casts. Then its own decisions:
   *  the dodge watch every frame, the swap choice on the think tick. */
  think(e, dt, pl) {
    e.heading = G.Status.stunned(e) ? [0, 0] : e.unstick(dt, this.steer(e, dt, pl));
    this.clock += dt;
    this.fieldT += dt;
    if (!LeaderAI.off.dodges) this.watch(e, dt);
    if ((this.tickT -= dt) <= LeaderAI.EPS) {
      this.tickT += this.set.think;
      this.due = true;
    }
    // a tick that lands inside a tell or commitment waits for the first frame out of it (it is never skipped)
    if (this.due && (G.Status.stunned(e) || !this.busy(e))) {
      this.due = false;
      if (!LeaderAI.off.swaps) this.decide(e);
    }
  }
  /** Asks the brain where to go: the way to you (around walls, G.Path) and speed 1, so its answer is a heading for the controller. */
  steer(e, dt, pl) {
    let [dx, dy] = G.U.norm(pl.x - e.x, pl.y - e.y);
    const pd = G.Path.dirFor(e, pl);
    if (pd) [dx, dy] = pd;
    const [vx, vy] = e.brain.step(dt, pl, G.U.dist(e.x, e.y, pl.x, pl.y), dx, dy, 1, (i) => this.pressSlot(e, i));
    return [vx, vy];
  }
  /** The brain chose slot i (or -1): `slots` answers it for this press only, and the body reads its controller as yours does. */
  pressSlot(e, i) {
    this.slotAnswer = i >= 0 ? [i] : LeaderAI.NONE;
    e.takeSlotInput();
    this.slotAnswer = LeaderAI.NONE;
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
    if (voluntary) {
      this.swaps++;
      if (this.why && this.why.why === 'low') this.saved.add(this.why.out);
    }
    this.why = null;
  }

  /** Inside a tell (its wind-up, until the move fires; the recovery after it is not the tell) or a move commitment (a dash, a root, a
   *  cooldown freeze): no decision is made. */
  busy(e) {
    const c = e.brain.tell;
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
    if (best.score < S.stay * S.margin - LeaderAI.EPS) {
      this.note('stay', 'nothing beats STAY ' + S.stay + ' x ' + S.margin + ': ' + scores);
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
    const b = e.brain;
    return b.healsLeft > 0 && b.pool().some((s) => G.Gyms.formOf(b.def(s.id)) === 'heal');
  }

  /** LEADER-AI MATCHUP for leader mon m against your mon on the field: offense = its best open damaging move's type x your mon's
   *  types x STAB 1.5; defense = max(0.25, your attack's type x m's types); score = offense / defense. */
  matchup(m) {
    const you = LeaderAI.yours();
    if (!you) return 1;
    const yt = LeaderAI.typesOf(you);
    let off = 0;
    for (const s of m.brain.pool()) {
      const d = m.brain.def(s.id);
      if (!(d.basePower > 0)) continue;
      off = Math.max(off, G.Types.mult(d.type, yt) * (m.types.includes(d.type) ? 1.5 : 1));
    }
    return off / Math.max(0.25, G.Types.mult(this.yourAttack(m).type, m.types));
  }
  /** Your mon's most threatening revealed damaging move against m: the highest type multiplier, then the higher power. Before any is
   *  revealed, a guess of its own type (a two-type mon: the type that hits m harder). Only what G.LeaderInfo has seen is read. */
  yourAttack(m) {
    const you = LeaderAI.yours(),
      info = G.LeaderInfo.current;
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
    if (!th.vx && !th.vy) return G.U.norm(e.x - th.x, e.y - th.y);
    const [ux, uy] = G.U.norm(th.vx, th.vy),
      off = (e.x - th.x) * -uy + (e.y - th.y) * ux, // > 0: the body is on the (-uy, ux) side of the path
      D = G.PlayerEntity.DODGE.dist,
      l = e.room(-uy, ux, D),
      r = e.room(uy, -ux, D),
      left = Math.abs(l - r) < G.GymLeader.UNSTICK.tie ? off >= 0 : l > r;
    return left ? [-uy, ux] : [uy, -ux];
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
});
G.LeaderAI.BAG = 10;
/** Dev and harness switches: turn its own swap or dodge decisions off (the slice 1 parity runs with both off). */
G.LeaderAI.off = { swaps: false, dodges: false };
/** The dodge bag's seed for every fight from now on (the harness fixes it); null: a new one each fight. */
G.LeaderAI.seed = null;

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
