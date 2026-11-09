/* ============ leader-belief.js: what a leader's AI player believes (G.LeaderBelief) ============
 * Spec: docs/LEADER-AI.md "The Decider (#49)" (BELIEF, COOLDOWN WINDOW, OPPONENT MODEL); #50, #49 slice 1. One per fight, between
 * G.LeaderInfo (perception: what the screen shows) and the Decider (G.LeaderAI), and the Decider's only door to what it knows. It only
 * derives; G.LeaderInfo and the run store (G.LeaderMemory) keep the raw observations, so retuning applies to old ones too.
 *   PASS-THROUGH  the fight's events, the rolling windows, your threats, your reveals, the run record and the key of a mon of yours.
 *   COOLDOWN WINDOW  per revealed move of yours: opened on its base cooldown (TUNE.startWidth wide), then every clean gap G.LeaderInfo
 *            saw (GAPS, field time) is replayed in order: a gap outside the window stretches it to the gap plus an overshoot
 *            (startWidth x memoryUse), then each edge closes on the gap by memoryUse; never narrower than TUNE.minWidth (the cooldown
 *            fairness limit). Readiness: 0 before the window, a straight ramp across it, 1 after; an unrevealed move, or one not cast
 *            since your last switch this fight, is believed ready. Decision 2026-11-09-50-cooldown-window-memoryuse-and-baseline.
 *   DERIVED  the matchup and your most threatening attack (moved from the Decider unchanged, slice 2 #31); danger (your likely next
 *            hit on a leader mon: that attack's visible size x its readiness) and opportunity (that mon's best hit on your mon on the
 *            field among its moves ready now, from its own exact timers), both fractions of the struck mon's max HP (G.Stats
 *            visibleHitFrac). No reader until #51.
 * memoryUse is the Decider's setting (G.LeaderAI.BASE), handed in on each tick.
 */
G.LeaderBelief = (() => {
  let cur = null;
  /** All TUNE (BALANCE.md "Leader AI"): the window's starting and minimum width (s), and the power assumed for your own-type guess. */
  const TUNE = Object.freeze({ startWidth: 1.8, minWidth: 0.2, guessPower: 60 });

  /** A fresh window for a move of base cooldown `baseCd`: { lo, hi }, centered on it. */
  function opened(baseCd) {
    return { lo: Math.max(0, baseCd - TUNE.startWidth / 2), hi: baseCd + TUNE.startWidth / 2 };
  }
  /** One clean gap learned: stretch to cover a gap outside the window (plus the overshoot), then each edge closes on the gap by
   *  memoryUse; then the minimum width, about the window's middle. */
  function learn(win, gap, memoryUse) {
    let lo = win.lo,
      hi = win.hi;
    const overshoot = TUNE.startWidth * memoryUse;
    if (gap < lo) lo = gap - overshoot;
    else if (gap > hi) hi = gap + overshoot;
    lo += (gap - lo) * memoryUse;
    hi -= (hi - gap) * memoryUse;
    if (hi - lo < TUNE.minWidth) {
      const mid = (lo + hi) / 2;
      lo = mid - TUNE.minWidth / 2;
      hi = mid + TUNE.minWidth / 2;
    }
    return { lo: Math.max(0, lo), hi };
  }
  /** How ready a move is believed to be, `since` s after its last cast: 0 before the window, a ramp across it, 1 after. */
  function readinessIn(win, since) {
    if (!win || since == null || since >= win.hi) return 1;
    if (since <= win.lo) return 0;
    return (since - win.lo) / (win.hi - win.lo);
  }

  const typesOf = (m) => (m && m.mon && m.mon.types) || (m && G.DEX_BY[m.dex] && G.DEX_BY[m.dex].types) || [];
  const statsOf = (m) => (m && m.mon && m.mon.stats) || (m && G.DEX_BY[m.dex] && G.DEX_BY[m.dex].stats) || null;
  const levelOf = (m) => (m && m.level) || (G.Game.player && G.Game.player.level) || 1;
  const yours = () => {
    const r = G.Game.roster;
    return r ? r[G.Game.activeIndex] || null : null;
  };
  /** The moves leader mon m moves for: the open moves of all its slots (its own exact state). */
  const poolOf = (m) => m.slots.flat().filter((s) => G.Boss.open(m, s));

  /** Your mon's most threatening revealed damaging move against m: the highest type multiplier, then the higher power. Before any is
   *  revealed, a guess of its own type (a two-type mon: the type that hits m harder). Only what G.LeaderInfo has seen is read. */
  function yourAttack(m, you = yours(), belief = cur) {
    let best = null;
    for (const id of you && belief ? belief.reveals(you).moves : []) {
      const d = G.MoveDefs[id];
      if (!d || !(d.basePower > 0)) continue;
      const k = G.Types.mult(d.type, m.types);
      if (!best || k > best.k || (k === best.k && d.basePower > best.power))
        best = { id, type: d.type, k, power: d.basePower };
    }
    if (best) return best;
    for (const type of you ? typesOf(you) : []) {
      const k = G.Types.mult(type, m.types);
      if (!best || k > best.k) best = { id: null, type, k, power: 0 };
    }
    return best || { id: null, type: 'normal', k: 1, power: 0 };
  }
  /** LEADER-AI MATCHUP (slice 2): m's best open damaging move on your mon (type x STAB) over your best attack's multiplier on m. */
  function matchup(m, you = yours(), belief = cur) {
    if (!you) return 1;
    const yt = typesOf(you);
    let off = 0;
    for (const s of poolOf(m)) {
      const d = m.moveDef(s.id);
      if (!(d.basePower > 0)) continue;
      off = Math.max(off, G.Types.mult(d.type, yt) * (m.types.includes(d.type) ? 1.5 : 1));
    }
    return off / Math.max(0.25, G.Types.mult(yourAttack(m, you, belief).type, m.types));
  }

  class Belief {
    /** @param info the fight's G.LeaderInfo record */
    constructor(info) {
      this.info = info;
      this.memoryUse = G.LeaderAI ? G.LeaderAI.BASE.memoryUse : 0.5;
      this.feed = [];
    }
    /** One frame: perception runs, and its events wait here for the Decider. */
    tick(dt, memoryUse = this.memoryUse) {
      this.memoryUse = memoryUse;
      this.info.tick(dt);
      for (const ev of this.info.events()) this.feed.push(ev);
    }
    events() {
      return this.feed.splice(0);
    }
    windows() {
      return this.info.windows();
    }
    threats(body, horizon, dt) {
      return this.info.threats(body, horizon, dt);
    }
    reveals(m) {
      return this.info.reveals(m);
    }
    keyOf(m) {
      return this.info.keyOf(m);
    }
    get mem() {
      return this.info.mem;
    }
    get t() {
      return this.info.t;
    }
    /** The cooldown window of revealed move `id` of mon `m` of yours: { lo, hi } s, or null (not revealed, or no cooldown). */
    window(m, id) {
      const d = G.MoveDefs[id];
      if (!m || !d || !(d.cd > 0) || !this.reveals(m).moves.includes(id)) return null;
      let win = opened(d.cd);
      for (const gap of this.info.gapsOf(m, id)) win = learn(win, gap, this.memoryUse);
      return win;
    }
    /** How ready move `id` of mon `m` of yours is believed to be, 0 to 1. */
    readiness(m, id) {
      const win = this.window(m, id);
      return win ? readinessIn(win, this.info.sinceCast(m, id)) : 1;
    }
    yourAttack(m, you = yours()) {
      return yourAttack(m, you, this);
    }
    matchup(m, you = yours()) {
      return matchup(m, you, this);
    }
    /** Your likely next hit on leader mon m: your most threatening attack's visible size x its readiness (your own-type guess,
     *  TUNE.guessPower, is believed ready). */
    danger(m, you = yours()) {
      if (!m || !you) return 0;
      const a = yourAttack(m, you, this),
        d = a.id && G.MoveDefs[a.id],
        stats = statsOf(you),
        cat = d ? d.category : stats ? G.Stats.enemyCat(stats[1], stats[3]) : 'physical',
        stab = typesOf(you).includes(a.type) ? G.Stats.STAB : 1,
        size = G.Stats.visibleHitFrac(
          stats,
          levelOf(you),
          statsOf(m),
          levelOf(m),
          a.id ? a.power : TUNE.guessPower,
          cat,
          stab,
          a.k,
          G.Stats.DMG_SCALAR
        );
      return size * (a.id ? this.readiness(you, a.id) : 1);
    }
    /** Leader mon m's best hit on your mon on the field, among its damaging moves ready now (its own exact timers). Your mon takes
     *  your damage-taken scale (G.Stats.ENEMY_DMG_SCALAR). */
    opportunity(m, you = yours()) {
      if (!m || !you) return 0;
      const yt = typesOf(you);
      let best = 0;
      for (const s of poolOf(m)) {
        const d = m.moveDef(s.id);
        if (s.t > 0 || !d || !(d.basePower > 0)) continue;
        const stab = typesOf(m).includes(d.type) ? G.Stats.STAB : 1,
          size = G.Stats.visibleHitFrac(
            statsOf(m),
            levelOf(m),
            statsOf(you),
            levelOf(you),
            d.basePower,
            d.category,
            stab,
            G.Types.mult(d.type, yt),
            G.Stats.ENEMY_DMG_SCALAR
          );
        best = Math.max(best, size);
      }
      return best;
    }
  }

  return {
    TUNE,
    opened,
    learn,
    readinessIn,
    yourAttack,
    matchup,
    /** A switched gym's fight starts: the Belief over its G.LeaderInfo record. */
    create(info) {
      return (cur = info ? new Belief(info) : null);
    },
    /** The fight is over (or the arena reset). */
    end() {
      cur = null;
    },
    get current() {
      return cur;
    },
  };
})();
