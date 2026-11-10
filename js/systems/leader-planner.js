/* ============ leader-planner.js: the Decider's goal choice and planner (G.LeaderPlanner) ============
 * Spec: docs/LEADER-AI.md "The Decider (#49)" (GOALS, GOAL VALUE AND SCORE, COST, CHOICE, PLANS, ACTIONS); #51, #49 slice 2.
 * Pure: it reads only the snapshot G.LeaderBelief hands it (never the game), so the harness can hand-derive every outcome.
 *   GOALS    nine, fixed in code (GOALS, in tie-break order); a leader only weights them (the default leader: every weight 1).
 *   ACTIONS  this slice's six verbs: close (to a slot's reach), hold (at the preferred range), backOff (outside your reach), wait (for
 *            its own slot to be ready, or for a move of yours to fire), use (a slot), recover (a spent charge or cooldown back).
 *            Dash in, Draw your shot, Dodge your shot and Swap are #52's.
 *   SEARCH   every plan of at most TUNE.maxSteps actions, in full (a small tree), and for each goal the best scoring plan whose last
 *            step reaches its target. Costs can be negative (damage dealt is subtracted), which A* cannot search, so the tree is
 *            walked whole; the result is the same cheapest plan per goal.
 *   CHOICE   score = goal value - plan cost, both in HP fractions (a fraction of its own max HP counts one to one with a fraction of
 *            yours, decision 2026-11-09-51-opening-stance-traces-and-set-trigger and the #51 plan); with no plan reaching a goal,
 *            its best plan counts at value x the fraction of the gap it closes. The running plan adds its commitment bonus;
 *            `randomness` draws from the ranking with its own seeded source.
 * All numbers are TUNE (BALANCE.md "Leader AI").
 */
G.LeaderPlanner = (() => {
  const GOALS = Object.freeze([
    'endurance',
    'maintain',
    'pressure',
    'setback',
    'kite',
    'buff',
    'bait',
    'finish',
    'conserve',
  ]);
  /** The words of the cost profiles as weights: damage taken and dealt, and the time term (HP fraction per second). */
  const WEIGHT = Object.freeze({ lowest: 0.3, low: 0.6, neutral: 1, high: 1.5, veryHigh: 2, highest: 2.5, ignored: 0 });
  const TIME = Object.freeze({ veryLow: 0.002, low: 0.005, neutral: 0.01, high: 0.02 });
  /** Each goal's fixed cost profile (LEADER-AI GOALS). */
  const PROFILE = Object.freeze({
    endurance: { taken: WEIGHT.high, dealt: WEIGHT.neutral, time: TIME.veryLow },
    maintain: { taken: WEIGHT.neutral, dealt: WEIGHT.neutral, time: TIME.neutral },
    pressure: { taken: WEIGHT.low, dealt: WEIGHT.high, time: TIME.high },
    setback: { taken: WEIGHT.neutral, dealt: WEIGHT.neutral, time: TIME.neutral },
    kite: { taken: WEIGHT.veryHigh, dealt: WEIGHT.neutral, time: TIME.low },
    buff: { taken: WEIGHT.high, dealt: WEIGHT.ignored, time: TIME.low },
    bait: { taken: WEIGHT.veryHigh, dealt: WEIGHT.high, time: TIME.low },
    finish: { taken: WEIGHT.lowest, dealt: WEIGHT.high, time: TIME.neutral },
    conserve: { taken: WEIGHT.highest, dealt: WEIGHT.ignored, time: TIME.low },
  });
  /** The fixed base values of the goals whose value is not computed (HP fractions). */
  const BASE_VALUE = Object.freeze({
    endurance: 0.1,
    maintain: 0.1,
    pressure: 0.12,
    setback: 0.08,
    kite: 0.1,
    bait: 0.14,
  });
  const TUNE = Object.freeze({
    maxSteps: 4,
    koBonus: 0.3, // Finish only, earned by the KO itself (a plan that falls short gets its partial credit without it)
    holdSeconds: 1, // how long Hold at range circles once at the range
    rangeBand: 20, // px either side of the preferred range that counts as at it
    closeInset: 5, // px inside a slot's reach that Close to reach walks to
    backOffPad: 30, // px beyond your best revealed reach that Back off walks to
    reachFalloff: 40, // px past a shape's reach over which the hit chance falls to 0
    stepTimeout: 1.5, // an action ends at this many times its estimate
    commitPerSecond: 0.01, // the commitment bonus per second invested, x stubbornness
    buffWindow: 10, // seconds a stage is valued over (the long window)
    slack: 40, // px a running action's reach precondition tolerates before it counts as broken
    buffGate: 6, // s a pure buff is closed after it casts, in a plan (the stage Gate, G.Stages GATE)
  });
  const TAGS = Object.freeze({
    close: 'approach',
    hold: 'position',
    backOff: 'retreat',
    wait: 'wait',
    recover: 'wait',
  });
  const HIT_GOALS = new Set(['endurance', 'maintain', 'pressure', 'kite', 'bait']);
  const EPS = 1e-9;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const WIDE_FORMS = new Set(['melee', 'nova', 'multi']);

  /** The chance a move of its own lands on you from `distance`: inside its reach plus your body, else falling to 0 over
   *  reachFalloff px; then your sideways step while its aim is locked (the tell, plus a shot's flight) plus aimError, against the
   *  shape's half width plus your body. A cone, nova or burst is wide enough to count as 1 sideways. */
  function hitChance(move, distance, you, aimError = 0) {
    const reachEdge = move.reach + you.radius,
      inReach = distance <= reachEdge ? 1 : clamp(1 - (distance - reachEdge) / TUNE.reachFalloff, 0, 1);
    if (!inReach || WIDE_FORMS.has(move.form)) return inReach;
    const flight = move.travelSpeed > 0 ? distance / move.travelSpeed : 0,
      escape = you.sidewaysSpeed * (move.tell + flight) + aimError,
      half = move.halfWidth + you.radius;
    return inReach * (half / (half + escape));
  }

  /** The utility multiplier of a goal: its weight, with confidence raising Pressure and Finish and lowering Conserve and Endurance. */
  function utility(goal, world) {
    const weight = world.goalWeights && world.goalWeights[goal] != null ? world.goalWeights[goal] : 1,
      conf = world.confidence;
    if (goal === 'pressure' || goal === 'finish') return weight * (0.5 + conf);
    if (goal === 'conserve' || goal === 'endurance') return weight * (1.5 - conf);
    return weight;
  }
  const tagMultiplier = (world, tag) => (world.tagMultipliers && world.tagMultipliers[tag]) || 1;

  /** The plan state at the start: now, here, its own exact timers, your believed next shots. */
  function startState(world) {
    return {
      time: 0,
      distance: world.distance,
      activeSlot: world.own.activeSlot,
      remaining: world.slots.map((slot) => slot.moves.map((m) => m.remaining)),
      threatNext: world.you.threats.map((t) => t.nextFireIn),
      chargesReady: world.own.dodgeCharges.ready,
      healsLeft: world.own.healsLeft,
      hpFraction: world.own.hpFraction,
      dealt: 0,
    };
  }
  const copy = (s) =>
    Object.assign({}, s, { remaining: s.remaining.map((r) => r.slice()), threatNext: s.threatNext.slice() });

  /** Your shots during an action from `state.time` for `duration`, at its closest distance: each threat fires at its next believed
   *  time when the leader is inside its reach, then every cycle; out of reach a ready shot waits. Returns the damage taken and
   *  advances state.threatNext. */
  function shotsDuring(world, state, closest, duration) {
    const from = state.time,
      to = from + duration;
    let taken = 0;
    world.you.threats.forEach((threat, k) => {
      if (closest > threat.reach + world.own.radius) return;
      let next = Math.max(state.threatNext[k], from);
      while (next < to - EPS) {
        taken += threat.hitFraction;
        next += Math.max(threat.cycle, 0.05);
      }
      state.threatNext[k] = Math.max(state.threatNext[k], next);
    });
    return taken;
  }
  /** True while your best revealed move (Bait's) is believed cooling at plan time `at`. */
  function yourMoveCooling(world, state, at) {
    const k = world.you.threats.findIndex((t) => t.id != null && t.id === world.you.baitMoveId);
    return k >= 0 && at < state.threatNext[k] - EPS;
  }
  const advance = (state, duration) => {
    state.remaining = state.remaining.map((row) => row.map((r) => Math.max(0, r - duration)));
    state.time += duration;
  };
  const inReachOf = (world, move, distance) => distance <= move.reach + world.you.radius + EPS;

  /** The concrete actions open in `state` (the six verbs filled in per slot, range or move of yours). `last` is the previous step,
   *  so a verb never repeats itself back to back. */
  function actionsIn(world, state, last) {
    const out = [],
      same = (verb) => last && last.verb === verb;
    world.slots.forEach((slot, i) => {
      const reachable = slot.moves.filter((m) => m.tag === 'attack' || m.tag === 'status');
      if (reachable.length && !same('close')) {
        const reach = Math.max(...reachable.map((m) => m.reach));
        if (state.distance > reach + world.you.radius) out.push({ verb: 'close', slot: i, reach });
      }
      if (state.remaining[i].some((left) => left > EPS) && !(same('wait') && last.slot === i))
        out.push({ verb: 'wait', slot: i });
      if (canUse(world, state, i)) out.push({ verb: 'use', slot: i });
    });
    if (!same('hold')) out.push({ verb: 'hold', range: world.preferredRange });
    const safe = world.you.bestReach + world.you.radius + TUNE.backOffPad;
    if (!same('backOff') && state.distance < safe - EPS) out.push({ verb: 'backOff', to: safe });
    world.you.threats.forEach((threat, k) => {
      if (threat.id == null || same('wait')) return;
      if (state.distance > threat.reach + world.own.radius) return; // out of its reach it does not fire (Draw your shot is #52)
      if (state.threatNext[k] > state.time + EPS)
        out.push({ verb: 'wait', yourMove: threat.id, threat: k, reach: threat.reach });
    });
    if (!same('recover') && recoverIn(world, state) != null) out.push({ verb: 'recover' });
    return out;
  }
  /** Slot i can be used now: an attack or status move ready within the action and you in its reach, or a buff whose stage can
   *  rise, or a heal while hurt with one left. */
  function canUse(world, state, i) {
    return world.slots[i].moves.some((m) => {
      if (m.tag === 'buff') return m.buffReady;
      if (m.tag === 'heal') return state.healsLeft > 0 && state.hpFraction < 1 - EPS;
      return inReachOf(world, m, state.distance);
    });
  }
  /** Seconds until a resource spent before the plan began comes back (the first spent dodge charge, or the soonest damaging move's
   *  cooldown), with what it is worth, or null when nothing was spent. A cooldown the plan itself spends does not count: Conserve
   *  scores nothing when nothing is spent (LEADER-AI GOAL VALUE AND SCORE). */
  function recoverIn(world, state) {
    let best = null;
    const charges = world.own.dodgeCharges;
    if (state.chargesReady < charges.total && charges.nextBackIn > state.time + EPS)
      best = { seconds: charges.nextBackIn - state.time, worth: world.you.bestHit, what: 'a dodge charge' };
    world.slots.forEach((slot) =>
      slot.moves.forEach((m) => {
        const left = m.remaining - state.time;
        if (m.tag !== 'attack' || left <= EPS) return;
        if (!best || left < best.seconds) best = { seconds: left, worth: m.hitFraction, what: m.id + "'s cooldown" };
      })
    );
    return best;
  }

  /** One action applied: the next state and the step (its duration, damage taken and dealt, tag and what it achieved). */
  function apply(world, state, action) {
    const next = copy(state),
      own = world.own,
      step = Object.assign({ taken: 0, dealt: 0, effect: null }, action);
    const travel = (to) => Math.abs(to - state.distance) / Math.max(1, own.speed);
    if (action.verb === 'close') {
      const to = Math.max(0, action.reach + world.you.radius - TUNE.closeInset);
      step.duration = travel(to);
      step.keepSlot = action.slot;
      step.taken = shotsDuring(world, next, Math.min(state.distance, to), step.duration);
      next.distance = to;
    } else if (action.verb === 'hold') {
      step.duration = travel(action.range) + TUNE.holdSeconds;
      step.taken = shotsDuring(world, next, Math.min(state.distance, action.range), step.duration);
      next.distance = action.range;
      step.effect = { kind: 'atRange' };
    } else if (action.verb === 'backOff') {
      step.duration = travel(action.to);
      step.taken = shotsDuring(world, next, state.distance, step.duration);
      next.distance = action.to;
    } else if (action.verb === 'wait' && action.yourMove != null) {
      step.duration = Math.max(0, state.threatNext[action.threat] - state.time);
      step.taken = shotsDuring(world, next, state.distance, step.duration + EPS); // the shot it waits for lands at the end
      step.effect = { kind: 'yourShot', id: action.yourMove };
    } else if (action.verb === 'wait') {
      const left = state.remaining[action.slot].filter((r) => r > EPS);
      step.duration = left.length ? Math.min(...left) : 0;
      step.taken = shotsDuring(world, next, state.distance, step.duration);
    } else if (action.verb === 'recover') {
      const back = recoverIn(world, state);
      step.duration = back.seconds;
      step.taken = shotsDuring(world, next, state.distance, step.duration);
      step.effect = { kind: 'recovered', worth: back.worth, what: back.what };
      if (back.what === 'a dodge charge') next.chargesReady++;
    } else if (action.verb === 'use') return useSlot(world, state, next, step);
    step.tag = TAGS[action.verb];
    advance(next, step.duration);
    return { state: next, step };
  }
  /** Use slot X: it waits for its moves to be ready, then fires them together (a bonded slot), after the tell. */
  function useSlot(world, state, next, step) {
    const i = step.slot,
      moves = world.slots[i].moves,
      usable = moves
        .map((m, j) => ({ m, j }))
        .filter(({ m }) =>
          m.tag === 'buff'
            ? m.buffReady
            : m.tag === 'heal'
              ? state.healsLeft > 0 && state.hpFraction < 1 - EPS
              : inReachOf(world, m, state.distance)
        ),
      wait = Math.min(...usable.map(({ j }) => state.remaining[i][j])),
      firing = usable.filter(({ j }) => state.remaining[i][j] <= wait + EPS),
      tell = Math.max(0, ...firing.map(({ m }) => (m.tag === 'attack' || m.tag === 'status' ? m.tell : 0)));
    step.duration = wait + tell;
    step.keepSlot = i;
    step.taken = shotsDuring(world, next, state.distance, step.duration);
    const fireAt = state.time + step.duration,
      effect = { kind: null, dealt: 0 };
    for (const { m, j } of firing) {
      if (m.tag === 'attack') {
        const dealt = m.hitFraction * hitChance(m, state.distance, world.you, world.aimError);
        effect.dealt += dealt;
        if (dealt > 0) effect.kind = 'hit';
      }
      if (m.setsBack) effect.setback = true;
      if (m.tag === 'buff') effect.buffValue = (effect.buffValue || 0) + m.buffValue;
      if (m.tag === 'heal') effect.healed = Math.min(m.healFraction, 1 - state.hpFraction);
      // its cooldown from the release (advance() takes the action's time back off); a pure buff has none, so its Gate (BUFF_GATE)
      // stands in, and a heal cannot recast in the plan once its heal is spent
      const recharge = m.tag === 'buff' ? Math.max(m.cooldown, TUNE.buffGate) : m.cooldown;
      next.remaining[i][j] = recharge + wait + tell;
    }
    if (effect.healed) {
      next.healsLeft--;
      next.hpFraction = Math.min(1, state.hpFraction + effect.healed);
      step.taken -= effect.healed; // a heal is negative damage taken, usable by any goal (LEADER-AI COST)
    }
    step.dealt = effect.dealt;
    effect.atRange = Math.abs(state.distance - world.preferredRange) <= TUNE.rangeBand + EPS;
    effect.outsideYourReach = state.distance > world.you.bestReach + world.own.radius + EPS;
    effect.yourMoveCooling = yourMoveCooling(world, state, fireAt);
    step.effect = effect;
    const first = firing[0] && firing[0].m;
    step.tag =
      effect.healed > 0
        ? 'heal'
        : effect.kind === 'hit'
          ? 'attack'
          : effect.buffValue != null
            ? 'buff'
            : first
              ? first.tag
              : 'attack';
    next.dealt += effect.dealt;
    advance(next, step.duration);
    return { state: next, step };
  }

  /** The plan's cost for a goal: per step, damage taken (x risk) minus damage dealt, plus the time term, each weighted by the goal's
   *  profile, x the step's tag multiplier. */
  function costOf(world, goal, steps, countDealt = true) {
    const p = PROFILE[goal],
      dealtWeight = countDealt ? p.dealt : 0;
    let cost = 0;
    for (const s of steps)
      cost +=
        (p.taken * world.risk * s.taken - dealtWeight * s.dealt + p.time * s.duration) * tagMultiplier(world, s.tag);
    return cost;
  }
  /** What a goal's target is worth when the plan's last step reaches it, or null when it does not (LEADER-AI GOALS). */
  function reachedValue(world, goal, steps, state) {
    const last = steps[steps.length - 1],
      e = last.effect || {};
    const hit = last.verb === 'use' && e.kind === 'hit';
    switch (goal) {
      case 'endurance':
      case 'pressure':
        return hit ? BASE_VALUE[goal] : null;
      case 'maintain':
        return hit && e.atRange ? BASE_VALUE.maintain : null;
      case 'kite':
        return hit && e.outsideYourReach ? BASE_VALUE.kite : null;
      case 'bait':
        return hit && e.yourMoveCooling ? BASE_VALUE.bait : null;
      case 'setback':
        return last.verb === 'use' && e.setback ? BASE_VALUE.setback : null;
      case 'buff':
        return last.verb === 'use' && e.buffValue > 0 ? e.buffValue : null;
      case 'finish':
        return hit && state.dealt >= world.you.hpFraction - EPS ? world.you.hpFraction + TUNE.koBonus : null;
      case 'conserve':
        if (last.verb === 'use' && e.healed > 0) return e.healed;
        if (last.verb === 'recover') return e.worth;
        return null;
    }
    return null;
  }
  /** Partial credit (LEADER-AI CHOICE): the goal's value x the fraction of the gap the plan closes, for a goal no plan reaches. Each
   *  goal's gap is the distance to where its target can be reached (gapFor); a goal whose target no move can reach has none.
   *  Finish's gap is your HP: its partial value is the KO bonus x the share dealt, and its cost then leaves out the damage dealt,
   *  since that damage is the progress the share already counts (counting it twice made a 4-hit chain win every tick at any HP;
   *  #51 build, flagged for Jess). Buff and Conserve have none. */
  function partialValue(world, goal, steps, state, gap0 = gapFor(world, goal, world.distance)) {
    if (goal === 'finish') {
      if (!(state.dealt > 0) || !(world.you.hpFraction > 0)) return null;
      return TUNE.koBonus * Math.min(1, state.dealt / world.you.hpFraction);
    }
    if (!HIT_GOALS.has(goal) && goal !== 'setback') return null;
    const gap = gapFor(world, goal, state.distance);
    if (gap0 == null || !(gap0 > EPS) || gap == null) return null;
    return BASE_VALUE[goal] * clamp((gap0 - gap) / gap0, 0, 1);
  }
  /** How far (px) leader mon is from where goal's target can be reached, through its best move for it, or null when none can:
   *  Endurance, Pressure and Bait (Bait only with a revealed move of yours to wait out): outside an attack's reach; Setback:
   *  outside a status move's; Maintain: off the preferred range, by an attack that reaches it; Kite: outside the band between
   *  your best reach and an attack's reach that outreaches it. */
  function gapFor(world, goal, distance) {
    if (goal === 'bait' && world.you.baitMoveId == null) return null;
    const you = world.you,
      yours = you.bestReach + world.own.radius;
    let best = null;
    for (const slot of world.slots)
      for (const m of slot.moves) {
        if (goal === 'setback' ? !m.setsBack : m.tag !== 'attack') continue;
        const edge = m.reach + you.radius;
        let gap;
        if (goal === 'maintain') {
          if (edge < world.preferredRange - TUNE.rangeBand) continue;
          gap = Math.max(0, Math.abs(distance - world.preferredRange) - TUNE.rangeBand);
        } else if (goal === 'kite') {
          if (edge <= yours) continue;
          gap = Math.max(0, yours - distance) + Math.max(0, distance - edge);
        } else gap = Math.max(0, distance - edge);
        if (best == null || gap < best) best = gap;
      }
    return best;
  }

  /** Every plan of at most maxSteps actions from now, each goal's best: { goal: { steps, value, cost, score, partial } }. */
  function search(world) {
    const best = {},
      partial = {},
      consider = (goal, steps, value, cost, isPartial) => {
        const score = value - cost,
          into = isPartial ? partial : best,
          had = into[goal];
        if (!had || score > had.score + EPS) into[goal] = { goal, steps, value, cost, score, partial: isPartial };
      };
    let nodes = 0;
    const utilities = GOALS.map((goal) => utility(goal, world)),
      gaps0 = GOALS.map((goal) => gapFor(world, goal, world.distance));
    // `done`: the goals an earlier step of this path already reached. A plan ends in its payoff (LEADER-AI GOALS), so a longer plan
    // past it is no plan for that goal. A goal with a full plan found never uses partial credit, so that is no longer scored
    const walk = (state, steps, done) => {
      let now = done;
      if (steps.length) {
        nodes++;
        for (let g = 0; g < GOALS.length; g++) {
          const goal = GOALS[g];
          if (done.has(goal)) continue;
          const full = reachedValue(world, goal, steps, state);
          if (full != null) {
            consider(goal, steps, full * utilities[g], costOf(world, goal, steps), false);
            if (now === done) now = new Set(done);
            now.add(goal);
          } else if (!best[goal]) {
            const part = partialValue(world, goal, steps, state, gaps0[g]);
            if (part != null)
              consider(goal, steps, part * utilities[g], costOf(world, goal, steps, goal !== 'finish'), true);
          }
        }
      }
      if (steps.length >= TUNE.maxSteps) return;
      for (const action of actionsIn(world, state, steps[steps.length - 1])) {
        const { state: next, step } = apply(world, state, action);
        walk(next, steps.concat([step]), now);
      }
    };
    walk(startState(world), [], new Set());
    const out = {};
    for (const goal of GOALS) {
      const pick = best[goal] || partial[goal];
      if (pick) out[goal] = pick;
    }
    out.nodes = nodes;
    return out;
  }

  /** Two steps are the same action (the running one, for the commitment bonus). */
  const sameAction = (a, b) =>
    !!a && !!b && a.verb === b.verb && a.slot === b.slot && a.yourMove === b.yourMove && a.range === b.range;

  /** The choice: every goal's best plan ranked by score (fixed tie-break: GOALS order); the running plan's goal gets the commitment
   *  bonus (seconds invested x commitPerSecond x stubbornness, scaled as confidence scales that goal) when its plan still starts with
   *  the running action. `running` { goal, step, invested }; `draw` a seeded 0 to 1 source, read only while randomness > 0. */
  function choose(world, running = null, draw = null) {
    const found = search(world),
      ranking = [];
    for (const goal of GOALS) {
      const c = found[goal];
      if (!c) continue;
      let bonus = 0;
      if (running && running.goal === goal && sameAction(c.steps[0], running.step))
        bonus = running.invested * TUNE.commitPerSecond * world.stubbornness * utility(goal, world);
      ranking.push(Object.assign({}, c, { bonus, total: c.score + bonus }));
    }
    ranking.sort((a, b) => b.total - a.total || GOALS.indexOf(a.goal) - GOALS.indexOf(b.goal));
    let pick = 0;
    if (world.randomness > 0 && draw && ranking.length > 1 && draw() < world.randomness)
      pick = 1 + Math.floor(draw() * (ranking.length - 1));
    return { pick: ranking[pick] || null, ranking, nodes: found.nodes };
  }

  /** A small seeded source (mulberry32) for `randomness`, separate from the dodge and prediction bags. */
  function seeded(seed) {
    let s = seed >>> 0;
    return () => {
      let z = (s = (s + 0x6d2b79f5) >>> 0);
      z = Math.imul(z ^ (z >>> 15), z | 1);
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }

  return {
    GOALS,
    PROFILE,
    BASE_VALUE,
    WEIGHT,
    TIME,
    TUNE,
    hitChance,
    utility,
    actionsIn,
    apply,
    costOf,
    search,
    choose,
    seeded,
    startState,
    sameAction,
  };
})();
