/* ============ catch.js: the catch phase, the belt and the held catches (G.Catch) ============
 * Acquisition rework, slice S5 (#136). Spec: docs/ASCII Concept Maps/Old txt files/Acquisition v2 - Spec.txt sections 3 and 4;
 * plan and rulings: docs/ASCII Concept Maps/136 - Catch Phase Slice Opening.md.
 *
 * A won rescue (js/systems/rescue.js) leaves its Stage 1 waiting; touching it opens the catch screen (js/ui/catch-ui.js) with the
 * run paused. This file holds every rule; the screen only draws and routes input.
 *   odds     P = min(ceiling, base x ball x (1 + t)); t = the fight's time left, 0 to 1. base slides by BST inside the star's
 *            band (BANDS), with a drop between bands.
 *   flee     misses allowed by the rescued Pokemon's nature (FLEE). The last allowed miss, or a miss that empties the belt,
 *            and it runs off.
 *   belt     save.belt: one shared count of balls ({ size, poke }). A throw uses one ball, caught or not. Only Poke Balls until
 *            #137 adds Great and Ultra and the Shop restock. [Legacy behavior] until #137: every run start refills the belt to
 *            its size (startRun), so a playtest never runs dry.
 *   held     every catch of a run is held, never placed mid-run. At the run end (settle): kept when the run ends with its EVs
 *            (a fall, a crash), all lost on a quit (End Run, signing out). Kept ones become copies (method rescue, the
 *            rescue's nature); a full box sells the overflow at the copy's price (G.DB.obtain).
 * Checks: docs/proposals/rescue-harness.js (part 6).
 */
G.Catch = (() => {
  const K = {
    ceiling: 0.9, // the most a throw can be ([Open] playtest)
    startBelt: 6, // a new save's belt size
  };
  // Ball tiers. Great (1.5) and Ultra (2) arrive with the Shop unlocks (#137).
  const BALLS = [{ id: 'poke', name: 'Poke Ball', mult: 1, icon: 'ps:ball.poke' }];
  const BALL_BY = Object.fromEntries(BALLS.map((b) => [b.id, b]));
  // Base odds per star: the band's BST range and the base at its bottom and top (spec section 3, E3).
  const BANDS = {
    1: { lo: 175, hi: 319, from: 0.8, to: 0.6 },
    2: { lo: 320, hi: 405, from: 0.55, to: 0.4 },
    3: { lo: 410, hi: 490, from: 0.35, to: 0.22 },
    4: { lo: 495, hi: 570, from: 0.18, to: 0.06 },
  };
  // Misses allowed, by nature ([Open] playtest values 5 / 3 / 1). Natures not named here are default.
  const FLEE = { easy: 5, default: 3, hard: 1 };
  const FLEE_BUCKET = {
    bold: 'easy',
    calm: 'easy',
    lax: 'easy',
    relaxed: 'easy',
    docile: 'easy',
    gentle: 'easy',
    mild: 'easy',
    quiet: 'easy',
    timid: 'hard',
    careful: 'hard',
    hasty: 'hard',
    jolly: 'hard',
    naive: 'hard',
    rash: 'hard',
    naughty: 'hard',
  };

  let held = []; // { dex, name, nature, natureName } caught this run
  let session = null; // the open catch: { dex, name, nature, natureName, star, timeFraction, misses, allowed }

  // ---------------- odds and flee ----------------

  const bst = (dex) => {
    const mon = G.DEX_BY[dex];
    return (mon && mon.bst) || ((mon && mon.stats) || []).reduce((sum, v) => sum + v, 0);
  };

  /** The base catch chance of a species: its star's band, slid by its BST inside it. */
  function baseOdds(dex) {
    const mon = G.DEX_BY[dex];
    const band = BANDS[(mon && mon.rarity) || 1] || BANDS[1];
    const along = Math.max(0, Math.min(1, (bst(dex) - band.lo) / (band.hi - band.lo)));
    return band.from + (band.to - band.from) * along;
  }

  /** The chance one throw of this ball catches it, with t (0 to 1) of the fight clock left. */
  function odds(dex, ballId, timeFraction) {
    const ball = BALL_BY[ballId];
    if (!ball) return 0;
    const t = Math.max(0, Math.min(1, timeFraction || 0));
    return Math.min(K.ceiling, baseOdds(dex) * ball.mult * (1 + t));
  }

  /** Misses allowed before it runs off, by its nature (the pokeapi id, 1 to 25). */
  function fleeAllowance(nature) {
    const entry = G.SpeciesTraits.NATURES[nature - 1];
    return FLEE[FLEE_BUCKET[entry ? entry[0] : ''] || 'default'];
  }

  // ---------------- the belt ----------------

  const save = () => G.DB.save;

  /** The save's belt, fixed up when absent or broken (an older save). */
  function belt(s = save()) {
    if (!s) return { size: 0, poke: 0 };
    const whole = (v, d) => (Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : d);
    if (!s.belt || typeof s.belt !== 'object') s.belt = { size: K.startBelt, poke: K.startBelt };
    s.belt.size = whole(s.belt.size, K.startBelt);
    s.belt.poke = Math.min(s.belt.size, whole(s.belt.poke, s.belt.size));
    return s.belt;
  }

  /** Balls of one tier on the belt. */
  const count = (ballId, s = save()) => (BALL_BY[ballId] ? belt(s)[ballId] || 0 : 0);
  /** Every ball on the belt. */
  const total = (s = save()) => BALLS.reduce((sum, b) => sum + count(b.id, s), 0);
  /** The best stocked ball, or null for an empty belt. */
  const bestStocked = (s = save()) => [...BALLS].reverse().find((b) => count(b.id, s) > 0) || null;

  // ---------------- a run ----------------

  /** A run starts: nothing held. [Legacy behavior] until #137: the belt refills to its size. */
  function startRun(s = save()) {
    held = [];
    session = null;
    const b = belt(s);
    if (s) b.poke = b.size;
  }

  /** Touching a won rescue's Pokemon: the catch it opens, or null when the belt is empty. */
  function begin(result) {
    if (!result || total() <= 0) return null;
    const mon = G.DEX_BY[result.dex];
    session = {
      dex: result.dex,
      name: result.name,
      nature: result.nature,
      natureName: result.natureName,
      star: (mon && mon.rarity) || 1,
      timeFraction: result.timeFraction || 0,
      misses: 0,
      allowed: fleeAllowance(result.nature),
    };
    return session;
  }

  /** One throw. 'caught' (held for the run), 'miss' (try again), 'fled' (the last allowed miss, or the belt is empty), or
   *  'none' (no catch open, or no ball of that tier). Every throw but 'none' uses one ball. */
  function throwBall(ballId, rnd = Math.random) {
    const c = session;
    if (!c || count(ballId) <= 0) return 'none';
    belt()[ballId]--;
    if (rnd() < odds(c.dex, ballId, c.timeFraction)) {
      held.push({ dex: c.dex, name: c.name, nature: c.nature, natureName: c.natureName });
      session = null;
      return 'caught';
    }
    c.misses++;
    if (c.misses >= c.allowed || total() <= 0) {
      session = null;
      return 'fled';
    }
    return 'miss';
  }

  /** Letting it go (the screen's Let it go, after asking): it runs off, the belt keeps its balls. */
  function letGo() {
    session = null;
  }

  /** The run ended. keep: the run ended with its EVs (a fall, a crash), so every held catch becomes a copy; otherwise (a quit)
   *  all are lost. Returns { placed: [names], sold: [{ name, coins }] } for the main menu notice. */
  function settle(keep, s = save()) {
    const out = { placed: [], sold: [] };
    const list = held;
    held = [];
    session = null;
    if (!keep || !s) return out;
    for (const h of list) {
      const got = G.DB.obtain(h.dex, false, 'rescue', s, h.nature);
      if (got.sold) out.sold.push({ name: h.name, coins: got.sold });
      else out.placed.push(h.name);
    }
    return out;
  }

  return {
    K,
    BALLS,
    BANDS,
    FLEE,
    baseOdds,
    odds,
    fleeAllowance,
    belt,
    count,
    total,
    bestStocked,
    startRun,
    begin,
    throwBall,
    letGo,
    settle,
    get held() {
      return held.slice();
    },
    get session() {
      return session;
    },
  };
})();
