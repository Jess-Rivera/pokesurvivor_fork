/* ============ catch.js: the catch phase, the belt and the held catches (G.Catch) ============
 * Acquisition rework, slice S5 (#136). Spec: docs/ASCII Concept Maps/Old txt files/Acquisition v2 - Spec.txt sections 3 and 4;
 * plan and rulings: docs/ASCII Concept Maps/136 - Catch Phase Slice Opening.md.
 *
 * A won rescue (js/systems/rescue.js) leaves its Stage 1 waiting; touching it opens the catch screen (js/ui/catch-ui.js) with the
 * run paused. This file holds every rule; the screen only draws and routes input.
 *   odds     #148, Jess's mainline-style shake formula (docs/ASCII Concept Maps/pokeball-math-human-made.txt, decision
 *            2026-11-16-148-catch-odds-mainline-shake-formula). A rate from 0 to 255: the species' capture rate (pokedex
 *            cr) x the time term (a faster win is bigger) x ball x star x the badge cap penalty x the early World Level
 *            bonus. A throw first rolls a critical catch (a sure catch, from 31 species in the Pokedex), then three shakes
 *            that must all pass; the screen wobbles once per passed shake. Plain decimals, not the txt's 4096 integers.
 *   band     the screen never shows the exact chance: a range 2 x bandAccuracy points wide (K.bandAccuracy, 15 to start, a
 *            #97 meta upgrade later) that always holds it. Where the true chance sits inside is rolled once per catch
 *            (session.bandShift) and shared by every ball, so a better ball always reads better (Jess, 2026-11-16, plan
 *            docs/ASCII Concept Maps/136b - Catch Screen Redesign Plan.md). The range slides to stay inside 0 to 100.
 *   flee     misses allowed by the rescued Pokemon's nature (FLEE). The last allowed miss, or a miss that empties the belt,
 *            and it runs off.
 *   belt     save.belt: one shared count of balls, any mix of tiers ({ size, poke, great, ultra, unlocked }). size
 *            is the slots bought, six per belt, three belts at most. A throw uses one ball, caught or not; nothing refills it.
 *   shop     #137: the Main Menu Shop's Pokeballs tab (js/ui/shop-balls.js) buys balls, the Great and Ultra
 *            unlocks (unlocked lists them; Poke needs none) and the next belt, each paid in PokeCoins. Prices:
 *            js/data/balls.js.
 *   held     every catch of a run is held, never placed mid-run. At the run end (settle): kept when the run ends with its EVs
 *            (a fall, a crash), all lost on a quit (End Run, signing out). Kept ones become copies (method rescue, the
 *            rescue's nature); a full box sells the overflow at the copy's price (G.DB.obtain).
 * Checks: docs/proposals/rescue-harness.js (part 6).
 */
G.Catch = (() => {
  const K = {
    ballsPerBelt: 6, // slots on one belt; a new save has one belt
    maxBelts: 3,
    bandAccuracy: 15, // the shown range reaches this many points either side of its middle (#97 narrows it later)
  };
  // Ball tiers, worst first: the catalog's balls that have a catch multiplier (js/data/balls.js; Poke, Great, Ultra).
  const BALLS = G.BALL_CATALOG.filter((ball) => ball.catchMultiplier);
  const BALL_BY = Object.fromEntries(BALLS.map((b) => [b.id, b]));
  // The catch formula's numbers (#148, Jess's txt file; the step each comes from in brackets).
  const ODDS = {
    rateCap: 255, // the most a modified rate can be; at it every shake passes (step 6)
    timeTermWhole: 3, // the time term is (3 - 2 x share of the fight clock used) / 3 (step 1, flipped: faster is bigger)
    timeTermPerUsed: 2,
    // by star, 1 to 5 (step 3b); Steep curve after the feel test (decision 2026-11-16-148-catch-tuning-steep-curve-x2-fading-bonus)
    starMult: [1, 0.5, 0.25, 0.1, 0.05],
    badgeCaps: [10, 18, 26, 34, 42, 50, 58, 66, 75, 83, 91, 99, 100], // World Level cap by badges this run, 0 to 12 (step 4)
    overCapLevelsPerStep: 4, // each 4 World Levels over the cap is one penalty step
    overCapPenalty: 0.85, // x per step
    overCapMaxSteps: 6,
    // early World Level bonus (step 5): earlyBonusStart at World Level 1, falling in equal steps to x1 at earlyBonusEndLevel,
    // x1 after (same ruling: x2 fading, not clipped)
    earlyBonusStart: 2,
    earlyBonusEndLevel: 13,
    criticalBySpecies: [
      // species owned in the Pokedex -> critical multiplier (step 7); fewer than 31: no critical catch
      [601, 2.5],
      [451, 2],
      [301, 1.5],
      [151, 1],
      [31, 0.5],
    ],
    criticalDivisor: 6, // a critical catch's chance is rate x multiplier / 6, out of 256 (mainline)
    criticalRolls: 256,
    shakePower: 3 / 16, // one shake passes with (rate / 255) ^ (3 / 16) (step 8)
    shakes: 3,
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
  let session = null; // the open catch: { dex, name, nature, natureName, star, timeFraction, worldLevel, badges,
  //                     ownedSpecies, misses, allowed, bandShift }
  let lastThrow = null; // the last throw's roll: { critical, shakes, caught, math }

  // ---------------- odds and flee ----------------

  const clampShare = (share) => Math.max(0, Math.min(1, share || 0));

  /** The World Level cap for this many badges this run. */
  const badgeCap = (badges) => ODDS.badgeCaps[Math.max(0, Math.min(ODDS.badgeCaps.length - 1, badges || 0))];

  /** The badge cap penalty: x overCapPenalty for each overCapLevelsPerStep World Levels past this run's badge cap. */
  function badgeCapPenalty(worldLevel, badges) {
    const overCap = Math.max(0, (worldLevel || 1) - badgeCap(badges));
    const steps = Math.min(ODDS.overCapMaxSteps, Math.floor(overCap / ODDS.overCapLevelsPerStep));
    return Math.pow(ODDS.overCapPenalty, steps);
  }

  /** The early World Level bonus: earlyBonusStart at World Level 1, shrinking every level, gone from earlyBonusEndLevel. */
  function earlyLevelBonus(worldLevel) {
    const levelsLeft = ODDS.earlyBonusEndLevel - (worldLevel || 1);
    const stepPerLevel = (ODDS.earlyBonusStart - 1) / (ODDS.earlyBonusEndLevel - 1);
    return Math.max(1, 1 + levelsLeft * stepPerLevel);
  }

  /** Every factor of one catch's rate with one ball, and the rate (0 to 255) they make. catchState is a session or any
   *  object with its fields: { dex, timeFraction (share of the fight clock left, 0 to 1), worldLevel, badges }. Null for
   *  an unknown ball or species. */
  function rateParts(catchState, ballId) {
    const ball = BALL_BY[ballId],
      mon = G.DEX_BY[catchState.dex];
    if (!ball || !mon) return null;
    const timeUsed = 1 - clampShare(catchState.timeFraction);
    const parts = {
      captureRate: mon.cr || 0,
      timeTerm: (ODDS.timeTermWhole - ODDS.timeTermPerUsed * timeUsed) / ODDS.timeTermWhole,
      ball: ball.catchMultiplier,
      star: ODDS.starMult[Math.min(ODDS.starMult.length, mon.rarity || 1) - 1],
      badgePenalty: badgeCapPenalty(catchState.worldLevel, catchState.badges),
      earlyBonus: earlyLevelBonus(catchState.worldLevel),
    };
    const product = Object.values(parts).reduce((total, factor) => total * factor, 1);
    parts.rate = Math.min(ODDS.rateCap, product);
    return parts;
  }

  /** The modified catch rate (0 to 255) of one catch with one ball (see rateParts). */
  function modifiedRate(catchState, ballId) {
    const parts = rateParts(catchState, ballId);
    return parts ? parts.rate : 0;
  }

  /** The chance a throw is a critical catch (a sure catch), by its rate and the species owned in the Pokedex. */
  function criticalChance(rate, ownedSpecies) {
    const step = ODDS.criticalBySpecies.find(([fromSpecies]) => (ownedSpecies || 0) >= fromSpecies);
    if (!step) return 0;
    return Math.min(1, (rate * step[1]) / ODDS.criticalDivisor / ODDS.criticalRolls);
  }

  /** The chance one shake passes, by the rate. */
  const shakeChance = (rate) => Math.pow(Math.max(0, rate) / ODDS.rateCap, ODDS.shakePower);

  /** The chance one throw of this ball catches it: a critical catch, or else every shake passes. catchState also needs
   *  ownedSpecies here (see modifiedRate for the rest). */
  function odds(catchState, ballId) {
    const rate = modifiedRate(catchState, ballId),
      critical = criticalChance(rate, catchState.ownedSpecies);
    return critical + (1 - critical) * Math.pow(shakeChance(rate), ODDS.shakes);
  }

  /** The range the screen shows for a true chance (0 to 1): { low, high } in whole percent, 2 x bandAccuracy wide, holding
   *  the true chance (rounded). shift (-bandAccuracy to +bandAccuracy) moves the range off-centre; 0 centres it. */
  function band(chance, shift = 0) {
    const reach = K.bandAccuracy,
      truth = Math.round(chance * 100),
      offset = Math.max(-reach, Math.min(reach, Math.round(shift)));
    const low = Math.max(0, Math.min(100 - 2 * reach, truth - reach + offset));
    return { low, high: low + 2 * reach };
  }

  /** Misses allowed before it runs off, by its nature (the pokeapi id, 1 to 25). */
  function fleeAllowance(nature) {
    const entry = G.SpeciesTraits.NATURES[nature - 1];
    return FLEE[FLEE_BUCKET[entry ? entry[0] : ''] || 'default'];
  }

  // ---------------- the belt ----------------

  const save = () => G.DB.save;

  /** The save's belt, fixed up when absent or broken (an older save): every tier's count (0 when absent), the unlocked
   *  list, and never more balls than slots (the worst tier goes first). */
  function belt(s = save()) {
    if (!s) return { size: 0, poke: 0, great: 0, ultra: 0, unlocked: [] };
    const whole = (value, fallback) => (Number.isFinite(+value) && +value >= 0 ? Math.floor(+value) : fallback);
    if (!s.belt || typeof s.belt !== 'object') s.belt = { size: K.ballsPerBelt, poke: K.ballsPerBelt };
    const fixed = s.belt;
    fixed.size = Math.min(K.maxBelts * K.ballsPerBelt, whole(fixed.size, K.ballsPerBelt));
    fixed.poke = whole(fixed.poke, fixed.size);
    for (const ball of BALLS) fixed[ball.id] = whole(fixed[ball.id], 0);
    if (!Array.isArray(fixed.unlocked)) fixed.unlocked = [];
    let over = BALLS.reduce((sum, ball) => sum + fixed[ball.id], 0) - fixed.size;
    for (const ball of BALLS) {
      if (over <= 0) break;
      const trimmed = Math.min(over, fixed[ball.id]);
      fixed[ball.id] -= trimmed;
      over -= trimmed;
    }
    return fixed;
  }

  /** Balls of one tier on the belt. */
  const count = (ballId, s = save()) => (BALL_BY[ballId] ? belt(s)[ballId] || 0 : 0);
  /** Every ball on the belt. */
  const total = (s = save()) => BALLS.reduce((sum, b) => sum + count(b.id, s), 0);
  /** The best stocked ball, or null for an empty belt. */
  const bestStocked = (s = save()) => [...BALLS].reverse().find((b) => count(b.id, s) > 0) || null;
  /** Every ball on the belt as its id, best tier first: the order the Shop and the catch screen fill the slots in. */
  function ballsBestFirst(s = save()) {
    const ids = [];
    for (const ball of [...BALLS].reverse()) for (let n = count(ball.id, s); n > 0; n--) ids.push(ball.id);
    return ids;
  }
  /** Belts bought (six slots each), 1 to K.maxBelts. */
  const beltsBought = (s = save()) => Math.max(1, Math.floor(belt(s).size / K.ballsPerBelt));
  /** Empty slots left on the bought belts. */
  const room = (s = save()) => Math.max(0, belt(s).size - total(s));
  /** A tier a throw can use and the Shop sells: Poke from the start, Great and Ultra once their unlock is bought. */
  const isUnlocked = (ballId, s = save()) =>
    !!BALL_BY[ballId] && (!BALL_BY[ballId].unlockPrice || belt(s).unlocked.includes(ballId));
  /** The next belt's price, or null when every belt is bought. */
  const nextBeltPrice = (s = save()) =>
    beltsBought(s) < K.maxBelts ? G.BELT_PRICES[beltsBought(s) + 1] || null : null;

  // ---------------- the Shop (#137) ----------------
  // Each buy returns { ok: true, ... } or { ok: false, error }: 'none' (not a tier), 'locked', 'full', 'poor' or
  // 'done'.

  /** Buys up to wanted balls of one tier: as many as fit on the belts and the coins pay for, at least one. */
  function buyBalls(s, ballId, wanted = 1) {
    const ball = BALL_BY[ballId];
    if (!s || !ball) return { ok: false, error: 'none' };
    if (!isUnlocked(ballId, s)) return { ok: false, error: 'locked' };
    if (room(s) <= 0) return { ok: false, error: 'full' };
    const bought = Math.min(wanted, room(s), Math.floor((s.coins || 0) / ball.price));
    if (bought < 1) return { ok: false, error: 'poor' };
    const cost = bought * ball.price;
    s.coins -= cost;
    belt(s)[ballId] += bought;
    return { ok: true, bought, cost };
  }

  /** The one-time unlock of Great or Ultra. */
  function unlockBall(s, ballId) {
    const ball = BALL_BY[ballId];
    if (!s || !ball || !ball.unlockPrice) return { ok: false, error: 'none' };
    if (isUnlocked(ballId, s)) return { ok: false, error: 'done' };
    if (!((s.coins || 0) >= ball.unlockPrice)) return { ok: false, error: 'poor' };
    s.coins -= ball.unlockPrice;
    belt(s).unlocked.push(ballId);
    return { ok: true, cost: ball.unlockPrice };
  }

  /** The next belt: six more slots, bought in order. */
  function buyBelt(s) {
    const price = s ? nextBeltPrice(s) : null;
    if (!price) return { ok: false, error: 'done' };
    if (!((s.coins || 0) >= price)) return { ok: false, error: 'poor' };
    s.coins -= price;
    belt(s).size += K.ballsPerBelt;
    return { ok: true, cost: price, belts: beltsBought(s) };
  }

  // ---------------- a run ----------------

  /** A run starts: nothing held. The belt keeps what it has (balls are bought in the Shop, #137). */
  function startRun(s = save()) {
    held = [];
    session = null;
    belt(s);
  }

  /** The run's World Level (the whole number the HUD shows), 1 outside a run. */
  function worldLevelNow() {
    const runTime = (G.Game && G.Game.st && G.Game.st.time) || 0;
    return G.Enemies && G.Enemies.levelForTime ? Math.floor(G.Enemies.levelForTime(runTime)) : 1;
  }

  /** Touching a won rescue's Pokemon: the catch it opens, or null when the belt is empty. The odds' inputs from the run
   *  (World Level, badges, species owned) are taken now and kept for the whole catch. */
  function begin(result, rnd = Math.random) {
    if (!result || total() <= 0) return null;
    const mon = G.DEX_BY[result.dex],
      s = save();
    session = {
      dex: result.dex,
      name: result.name,
      nature: result.nature,
      natureName: result.natureName,
      star: (mon && mon.rarity) || 1,
      timeFraction: result.timeFraction || 0,
      worldLevel: worldLevelNow(),
      badges: G.Gym ? G.Gym.badges.length : 0,
      ownedSpecies: Object.keys((s && s.owned) || {}).length,
      misses: 0,
      allowed: fleeAllowance(result.nature),
      bandShift: Math.round((rnd() * 2 - 1) * K.bandAccuracy), // where the true chance sits in the shown range
    };
    lastThrow = null;
    return session;
  }

  /** Rolls one throw: { critical, shakes (passed, 0 to 3), caught } plus the math behind it (G.Debug.catchMath prints it):
   *  the rate's parts, the run inputs, each chance and each roll. A critical catch is sure; otherwise the shakes stop at
   *  the first that fails. */
  function rollThrow(catchState, ballId, rnd) {
    const parts = rateParts(catchState, ballId) || { rate: 0 };
    const math = {
      dex: catchState.dex,
      ballId,
      worldLevel: catchState.worldLevel,
      badges: catchState.badges,
      badgeCap: badgeCap(catchState.badges),
      ownedSpecies: catchState.ownedSpecies,
      timeLeft: clampShare(catchState.timeFraction),
      ...parts,
      criticalChance: criticalChance(parts.rate, catchState.ownedSpecies),
      shakeChance: shakeChance(parts.rate),
      throwChance: odds(catchState, ballId),
      criticalRoll: rnd(),
      shakeRolls: [],
    };
    if (math.criticalRoll < math.criticalChance) return { critical: true, shakes: 1, caught: true, math };
    let shakes = 0;
    while (shakes < ODDS.shakes) {
      const roll = rnd();
      math.shakeRolls.push(roll);
      if (roll >= math.shakeChance) break;
      shakes++;
    }
    return { critical: false, shakes, caught: shakes === ODDS.shakes, math };
  }

  /** One throw. 'caught' (held for the run), 'miss' (try again), 'fled' (the last allowed miss, or the belt is empty), or
   *  'none' (no catch open, or no ball of that tier). Every throw but 'none' uses one ball. How it went (critical, shakes
   *  passed) is in lastThrow, for the screen's wobbles. */
  function throwBall(ballId, rnd = Math.random) {
    const c = session;
    if (!c || count(ballId) <= 0) return 'none';
    belt()[ballId]--;
    lastThrow = rollThrow(c, ballId, rnd);
    if (lastThrow.caught) {
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
    ODDS,
    FLEE,
    rateParts,
    modifiedRate,
    criticalChance,
    shakeChance,
    odds,
    band,
    fleeAllowance,
    belt,
    count,
    total,
    bestStocked,
    ballsBestFirst,
    beltsBought,
    room,
    isUnlocked,
    nextBeltPrice,
    buyBalls,
    unlockBall,
    buyBelt,
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
    get lastThrow() {
      return lastThrow;
    },
  };
})();
