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
    startBelt: 6, // a new save's belt size
    bandAccuracy: 15, // the shown range reaches this many points either side of its middle (#97 narrows it later)
  };
  // Ball tiers. Great (1.5) and Ultra (2) arrive with the Shop unlocks (#137).
  const BALLS = [{ id: 'poke', name: 'Poke Ball', mult: 1, icon: 'ps:ball.poke' }];
  const BALL_BY = Object.fromEntries(BALLS.map((b) => [b.id, b]));
  // The catch formula's numbers (#148, Jess's txt file; the step each comes from in brackets).
  const ODDS = {
    rateCap: 255, // the most a modified rate can be; at it every shake passes (step 6)
    timeTermWhole: 3, // the time term is (3 - 2 x share of the fight clock used) / 3 (step 1, flipped: faster is bigger)
    timeTermPerUsed: 2,
    starMult: [1, 0.75, 0.5, 0.25], // by star, 1 to 4; higher stars use the 4 star value (step 3b)
    badgeCaps: [10, 18, 26, 34, 42, 50, 58, 66, 75, 83, 91, 99, 100], // World Level cap by badges this run, 0 to 12 (step 4)
    overCapLevelsPerStep: 4, // each 4 World Levels over the cap is one penalty step
    overCapPenalty: 0.85, // x per step
    overCapMaxSteps: 6,
    earlyBonusBase: 36, // early World Level bonus: max(1, (36 - 2 x World Level) / 10) (step 5)
    earlyBonusPerLevel: 2,
    earlyBonusDivisor: 10,
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
  let lastThrow = null; // the last throw's roll: { critical, shakes, caught }

  // ---------------- odds and flee ----------------

  const clampShare = (share) => Math.max(0, Math.min(1, share || 0));

  /** The badge cap penalty: x overCapPenalty for each overCapLevelsPerStep World Levels past this run's badge cap. */
  function badgeCapPenalty(worldLevel, badges) {
    const caps = ODDS.badgeCaps;
    const cap = caps[Math.max(0, Math.min(caps.length - 1, badges || 0))];
    const overCap = Math.max(0, (worldLevel || 1) - cap);
    const steps = Math.min(ODDS.overCapMaxSteps, Math.floor(overCap / ODDS.overCapLevelsPerStep));
    return Math.pow(ODDS.overCapPenalty, steps);
  }

  /** The early World Level bonus: large at World Level 1, gone from World Level 13. */
  function earlyLevelBonus(worldLevel) {
    const bonus = ODDS.earlyBonusBase - ODDS.earlyBonusPerLevel * (worldLevel || 1);
    return Math.max(1, bonus / ODDS.earlyBonusDivisor);
  }

  /** The modified catch rate (0 to 255) of one catch with one ball. catchState is a session or any object with its
   *  fields: { dex, timeFraction (share of the fight clock left, 0 to 1), worldLevel, badges }. */
  function modifiedRate(catchState, ballId) {
    const ball = BALL_BY[ballId],
      mon = G.DEX_BY[catchState.dex];
    if (!ball || !mon) return 0;
    const timeUsed = 1 - clampShare(catchState.timeFraction);
    const timeTerm = (ODDS.timeTermWhole - ODDS.timeTermPerUsed * timeUsed) / ODDS.timeTermWhole;
    const star = ODDS.starMult[Math.min(ODDS.starMult.length, mon.rarity || 1) - 1];
    const rate =
      (mon.cr || 0) *
      timeTerm *
      ball.mult *
      star *
      badgeCapPenalty(catchState.worldLevel, catchState.badges) *
      earlyLevelBonus(catchState.worldLevel);
    return Math.min(ODDS.rateCap, rate);
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

  /** Rolls one throw: { critical, shakes (passed, 0 to 3), caught }. A critical catch is sure; otherwise the shakes stop
   *  at the first that fails. */
  function rollThrow(catchState, ballId, rnd) {
    const rate = modifiedRate(catchState, ballId);
    if (rnd() < criticalChance(rate, catchState.ownedSpecies)) return { critical: true, shakes: 1, caught: true };
    const shakePass = shakeChance(rate);
    let shakes = 0;
    while (shakes < ODDS.shakes && rnd() < shakePass) shakes++;
    return { critical: false, shakes, caught: shakes === ODDS.shakes };
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
