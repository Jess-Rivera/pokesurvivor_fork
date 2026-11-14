/* ============ leader-ai-settings.js: the leader AI's settings (G.LeaderSettings) ============
 * The baseline settings every Player-entity leader starts from, the AI's tuning tables, and how a gym's authored `ai`
 * (js/data/gyms.js) resolves into one leader's settings for a loop. Spec: docs/LEADER-AI.md "Authoring a leader". The
 * numbers are TUNE (BALANCE.md "Leader AI"). Moved out of js/entities/leader-ai.js on 2026-11-14 (structural review
 * F2, decision 2026-11-14-structural-review-new-files-count): G.LeaderAI keeps every name here as an alias, so its
 * readers are unchanged. G.U and G.Gyms are read only when a function is called, so this loads with the data files.
 */
G.LeaderSettings = (() => {
  /** The baseline settings (LEADER-AI "Authoring a leader"; all TUNE, BALANCE.md "Leader AI"). Seconds: think,
   *  reflex, threatWindow, minField. dodgeRead: reads per block of BAG threats. swapLimit null: no cap. randomness:
   *  off until slice 5. #52: the swap choice's stay, margin, cc, low HP and matchup settings and gapClose are gone;
   *  swapWill multiplies the planner's swap cost. */
  const BASE = Object.freeze({
    think: 0.25,
    reflex: 0.15,
    threatWindow: 0.6,
    dodgeRead: 6,
    dodgeReserve: 0,
    minField: 8,
    swapLimit: null,
    swapWill: 1,
    randomness: 0,
    // slice 3 (#32): style and confidence. aggression and the conf* values are 0 to 1; lean degrees at aggr 0 or 1
    // (#52: gapClose gone; #51: pushAfter and breatherMax went with pacing)
    aggression: 0.5,
    confStart: 0.5,
    confSwing: 1,
    confMin: 0.2,
    confMax: 0.9,
    lean: 45,
    // slice 4 (#33): learnRate sightings before a pattern is believed; predictCap acts per BAG chances to act on one
    learnRate: 3,
    predictCap: 7,
    // #50 (#49 slice 1): how fast the cooldown window closes on each clean gap (0 to 1, higher learns faster;
    // G.LeaderBelief)
    memoryUse: 0.5,
    // #51 (#49 slice 2): the planner's settings. range: Maintain's preferred distance (px; the slot stance is not
    // read, decision 2026-11-09-51-opening-stance-traces-and-set-trigger); aimError (px) in the hit chance; risk x
    // the damage-taken weight; stubbornness x the commitment bonus
    range: 220,
    aimError: 10,
    risk: 1,
    stubbornness: 1,
    // #53 (#49 slice 4, decision 2026-11-13-53-leader-intelligence-one-score-with-overrides): intelligence 0 to 1
    // drives misjudge, reflex, dodgeRead, memoryUse and aimError through INTELLIGENCE_CURVES, and at the default it
    // reads the values here. misjudge: each plan's cost is read as cost x (1 + misjudge x a seeded draw in -1 to 1);
    // 0.1 (R1). aimError 10 px (R2, was 0)
    intelligence: 0.5,
    misjudge: 0.1,
  });
  const BAG = 10; // threats per block of the dodge read bag (G.LeaderAI.Bag)
  /** #53 (TUNE, BALANCE.md "Leader AI"): each setting intelligence drives, as two straight lines that meet at the
   *  default intelligence (BASE.intelligence), where it reads its BASE value. The top stops short of perfect: every
   *  setting keeps some error at 1. REFLEX_FLOOR_SECONDS: no authored reflex goes under it (gyms.js validate; the
   *  curve's top is 0.12 s). INTELLIGENCE_GROWTH_MAX: the most intelligence gained per loop (D2).
   *  OVERRIDE_WARN_AT: this many of the five authored directly gets a dev warning. */
  const INTELLIGENCE_CURVES = Object.freeze({
    misjudge: Object.freeze({ atZero: 0.3, atDefault: BASE.misjudge, atOne: 0.04 }),
    reflex: Object.freeze({ atZero: 0.3, atDefault: BASE.reflex, atOne: 0.12 }),
    dodgeRead: Object.freeze({ atZero: 2, atDefault: BASE.dodgeRead, atOne: 8 }),
    memoryUse: Object.freeze({ atZero: 0.15, atDefault: BASE.memoryUse, atOne: 0.7 }),
    aimError: Object.freeze({ atZero: 40, atDefault: BASE.aimError, atOne: 4 }),
  });
  const REFLEX_FLOOR_SECONDS = 0.1;
  const INTELLIGENCE_GROWTH_MAX = 0.2;
  const OVERRIDE_WARN_AT = 3;
  /** Slice 3 (all TUNE, BALANCE.md "Leader AI"). CONF: each hit landed or taken, each faint (yours up, its own
   *  down), the drift per second while the long window's trade is `trade` or more, `pull` (aggr per unit of
   *  confidence off 0.5), the swing that says a line and the cooldown between those lines. (#51: PACE and HOLD went
   *  with pacing; #52: marginK with the swap margin.) */
  const CONF = Object.freeze({
    hit: 0.03,
    faint: 0.15,
    drift: 0.01,
    trade: 0.1,
    pull: 0.6,
    swing: 0.25,
    swingCd: 20,
  });
  // #52: seconds a swap or dash press may wait to land before the step counts as refused by your rules
  const SWAP_WAIT = 0.1;
  const LINE_WAIT = 4; // seconds a line may wait for the banner (the send-out line shows 3.2 s)
  const LINE_T = 2.4; // seconds a line shows
  /** Edge unstick numbers (Jess 2026-11-07). slip, stuck, side, turn: the wild body's (enemy.js). probe, tie, shut
   *  (px): the smart side's look-ahead, the gap that counts as even, and the room below which a side counts as
   *  shut. */
  const UNSTICK = Object.freeze({ slip: 0.35, stuck: 0.35, side: 0.7, turn: 1.25, probe: 24, tie: 4, shut: 4 });

  /** The settings for gym `gym`: each authored one (a number, or keyed by loop as the build keys are), else the
   *  baseline. #53: the five INTELLIGENCE_CURVES settings it does not author come from its intelligence for
   *  this loop. */
  function settings(gym) {
    const a = (gym && gym.ai) || {},
      loop = (gym && gym.loop) || 1,
      out = {};
    for (const k of Object.keys(BASE)) {
      if (k === 'intelligence') continue; // a base and a growth, not keyed by loop: resolved below
      const v = a[k],
        at = v != null && typeof v === 'object' ? G.Gyms.perLoop(v, loop) : v;
      out[k] = at != null ? at : BASE[k];
    }
    // 39a: the Decider's goal weights and tag multipliers, flat per leader and passed on as authored (never keyed by
    // loop; the planner reads an absent table, or an absent name in it, as 1)
    if (a.goalWeights) out.goalWeights = a.goalWeights;
    if (a.tagMultipliers) out.tagMultipliers = a.tagMultipliers;
    out.intelligence = intelligenceForLoop(a.intelligence, loop);
    for (const k of Object.keys(INTELLIGENCE_CURVES))
      if (a[k] == null) out[k] = settingFromIntelligence(k, out.intelligence);
    return out;
  }
  /** #53: the authored intelligence (a number, or { base, growth }) at loop `loop`: base + growth x (loop - 1), held
   *  in 0 to 1. */
  function intelligenceForLoop(authored, loop) {
    const shape = typeof authored === 'number' ? { base: authored } : authored || {},
      base = shape.base != null ? shape.base : BASE.intelligence,
      growth = shape.growth || 0;
    return G.U.clamp(base + growth * (loop - 1), 0, 1);
  }
  /** #53: one setting from intelligence, on its two straight lines that meet at the default intelligence. */
  function settingFromIntelligence(settingName, intelligenceAtLoop) {
    const curve = INTELLIGENCE_CURVES[settingName],
      half = BASE.intelligence;
    return intelligenceAtLoop < half
      ? G.U.lerp(curve.atDefault, curve.atZero, (half - intelligenceAtLoop) / half)
      : G.U.lerp(curve.atDefault, curve.atOne, (intelligenceAtLoop - half) / (1 - half));
  }
  /** #53: a dev warning when gym `gym` authors OVERRIDE_WARN_AT or more of the five curve settings directly, else
   *  null. Pure. */
  function intelligenceOverrideWarning(gym) {
    const a = (gym && gym.ai) || {},
      authored = Object.keys(INTELLIGENCE_CURVES).filter((k) => a[k] != null);
    if (authored.length < OVERRIDE_WARN_AT) return null;
    return gym.leader + ' authors ' + authored.join(', ') + ' directly: most of its intelligence is overridden';
  }

  return {
    BASE,
    BAG,
    INTELLIGENCE_CURVES,
    REFLEX_FLOOR_SECONDS,
    INTELLIGENCE_GROWTH_MAX,
    OVERRIDE_WARN_AT,
    CONF,
    UNSTICK,
    SWAP_WAIT,
    LINE_WAIT,
    LINE_T,
    settings,
    intelligenceForLoop,
    settingFromIntelligence,
    intelligenceOverrideWarning,
  };
})();
