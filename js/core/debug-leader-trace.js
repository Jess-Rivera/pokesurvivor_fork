/* ============ debug-leader-trace.js: the leader AI's decision trace (dev only, with ?dev) ============
 * #109 (docs/ASCII Concept Maps/109 - Leader Decision Trace Plan.md, Jess 2026-11-14): under ?dev every switched
 * gym fight's choices are kept, each with the inputs Belief handed the planner and the planner's whole ranking, so a
 * moment can be read back after the fight. The last TRACE.fightsKept fights are kept. The AI calls
 * G.LeaderAI.recorder at each choice (js/entities/leader-ai.js, replan); without ?dev nothing attaches it and nothing
 * is kept. Reads only G.Debug.on until a command runs with ?dev. Not in the NEED array, like the other split debug
 * files (decision 2026-11-14-debug-split-files-stay-out-of-need). Loads after debug-leader.js.
 *
 *   G.Debug.leaderTrace(what)  print the current or last fight. No argument: one row per decision change, with the
 *                              dodges, swaps, triggers and your marks between them. 'all': one row per choice. A number
 *                              of seconds: the full record nearest that time. 'save': download the fight as JSON
 *                              (put it in tools/cache/)
 *   G.Debug.leaderMark(text)   note `text` at the current fight time (to freeze first: G.Debug.quietPause(true), then
 *                              Escape)
 */
(() => {
  const on = G.Debug.on;
  const TRACE = Object.freeze({ fightsKept: 3, digits: 3, revokeMs: 1000 });
  const fights = []; // oldest first: { leader, startedAt, ai, records, events, seen }

  const round = (value) => (typeof value === 'number' ? +value.toFixed(TRACE.digits) : value);
  const devOnly = () => console.warn('[Debug] add ?dev to the URL to enable debug tools.');

  /** The fight `ai` runs: the newest one, or a new one when `ai` has started a fight since. */
  function fightOf(ai) {
    const newest = fights[fights.length - 1];
    if (newest && newest.ai === ai) return newest;
    const fight = {
      leader: ai.name,
      startedAt: new Date().toISOString(),
      ai,
      records: [],
      events: [],
      seen: new WeakSet(),
    };
    fights.push(fight);
    if (fights.length > TRACE.fightsKept) fights.shift();
    return fight;
  }

  /** Copies the AI's log lines the fight does not hold yet (its log keeps only the last few). */
  function catchUp(fight) {
    for (const entry of fight.ai.log) {
      if (fight.seen.has(entry)) continue;
      fight.seen.add(entry);
      fight.events.push(Object.assign({}, entry));
    }
  }

  /** One ranked goal as plain data. */
  function rankedGoal(ai, entry) {
    return {
      goal: entry.goal,
      plan: ai.planText(entry),
      value: round(entry.value),
      cost: round(entry.cost),
      noise: round(entry.noise),
      score: round(entry.score),
      bonus: round(entry.bonus),
      total: round(entry.total),
    };
  }

  /** #109: each open move the planner weighed: its slot, its hit on you, its projectile count, its reach, and the
   *  projectiles it expects to land from the recorded distance (G.LeaderPlanner.hitChance). */
  function movesOf(world) {
    return world.slots.flatMap((slot) =>
      slot.moves.map((move) => ({
        slot: slot.index + 1,
        id: move.id,
        hit: round(move.hitFraction),
        count: move.count,
        reach: round(move.reach),
        landed: round(G.LeaderPlanner.hitChance(move, world.distance, world.you, world.aimError)),
      }))
    );
  }

  /** The inputs Belief handed the planner, as plain data (the snapshot itself holds live references). */
  function inputsOf(world) {
    return {
      distance: round(world.distance),
      range: world.preferredRange,
      yourHp: round(world.you.hpFraction),
      ownHp: round(world.own.hpFraction),
      yourBestReach: round(world.you.bestReach),
      yourBestHit: round(world.you.bestHit),
      confidence: round(world.confidence),
      dodgesReady: world.own.dodgeCharges.ready,
      stunLeft: round(world.own.stunLeft),
      risk: world.risk,
      goalWeights: Object.assign({}, world.goalWeights),
      tagMultipliers: Object.assign({}, world.tagMultipliers),
      moves: movesOf(world),
    };
  }

  /** G.LeaderAI.recorder: the AI calls it at each choice, with why it planned. */
  function record(ai, why) {
    const fight = fightOf(ai),
      choice = ai.choice;
    catchUp(fight);
    fight.records.push({
      t: round(ai.clock),
      why,
      pick: choice.pick ? choice.pick.goal : null,
      ranking: choice.ranking.map((entry) => rankedGoal(ai, entry)),
      inputs: inputsOf(ai.world),
    });
  }
  record.fights = fights;
  record.TRACE = TRACE;

  /** One record as a table row: the choice, the runner-up and the inputs that matter most. */
  function rowOf(rec) {
    const chosen = rec.ranking.find((entry) => entry.goal === rec.pick),
      runnerUp = rec.ranking.find((entry) => entry.goal !== rec.pick),
      input = rec.inputs;
    return {
      t: rec.t,
      why: rec.why,
      goal: rec.pick || 'none',
      plan: chosen ? chosen.plan : '',
      value: chosen ? chosen.value : null,
      cost: chosen ? chosen.cost : null,
      noise: chosen ? chosen.noise : null,
      next: runnerUp ? runnerUp.goal : '',
      gap: chosen && runnerUp ? round(chosen.total - runnerUp.total) : null,
      dist: input.distance,
      range: input.range,
      yourHp: input.yourHp,
      ownHp: input.ownHp,
      yourReach: input.yourBestReach,
      conf: input.confidence,
      weights: JSON.stringify(input.goalWeights),
    };
  }

  /** A log line or a mark as a row, so it reads in time order between the choices. */
  const eventRow = (event) => ({ t: round(event.t), why: event.act, goal: '', plan: event.text });

  /** The fight's rows in time order: every choice (`every`), or only those where the goal changed. Goal-change log
   *  lines are left out, since the choices already show them. */
  function rowsOf(fight, every) {
    const rows = [];
    let lastGoal;
    for (const rec of fight.records) {
      if (!every && rec.pick === lastGoal) continue;
      lastGoal = rec.pick;
      rows.push(rowOf(rec));
    }
    for (const event of fight.events) if (event.act !== 'goal') rows.push(eventRow(event));
    return rows.sort((a, b) => a.t - b.t);
  }

  /** The record nearest `seconds` of fight time, or null. */
  function nearest(fight, seconds) {
    let best = null;
    for (const rec of fight.records) if (!best || Math.abs(rec.t - seconds) < Math.abs(best.t - seconds)) best = rec;
    return best;
  }

  /** Downloads the fight as JSON; returns the file name. */
  function save(fight) {
    const name = 'leader-trace-' + fight.leader + '-' + fight.startedAt.replace(/[:.]/g, '-') + '.json',
      data = { leader: fight.leader, startedAt: fight.startedAt, records: fight.records, events: fight.events },
      link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), TRACE.revokeMs);
    return name;
  }

  /** Dev only (#109): prints, reads back or saves the current or last traced fight. Returns what it shows. */
  function leaderTrace(what) {
    if (!on) {
      devOnly();
      return false;
    }
    const fight = fights[fights.length - 1];
    if (!fight) {
      console.warn('[Debug] no fight traced yet: fight a switched gym (Brock or Misty) in dev.html?dev');
      return false;
    }
    catchUp(fight);
    if (typeof what === 'number') {
      const rec = nearest(fight, what);
      const at = rec ? rec.t : '?';
      console.log('[LeaderTrace] ' + fight.leader + ' at ' + at + ' s: ' + JSON.stringify(rec, null, 2));
      return rec;
    }
    if (what === 'save') {
      console.log('[LeaderTrace] saved ' + save(fight) + ': put it in tools/cache/');
      return fight;
    }
    const every = what === 'all';
    const shown = every ? '' : ', changes only';
    console.log('[LeaderTrace] ' + fight.leader + ', ' + fight.records.length + ' choices' + shown);
    console.table(rowsOf(fight, every));
    return fight;
  }

  /** Dev only (#109): notes `text` at the current fight time, so a moment you saw can be found in the trace. */
  function leaderMark(text) {
    if (!on) {
      devOnly();
      return false;
    }
    const ai = G.GymArena.leaderAI;
    if (!ai) {
      console.warn('[Debug] no switched gym fight is running (Brock or Misty).');
      return false;
    }
    const mark = { t: round(ai.clock), act: 'mark', text: String(text == null ? '' : text) };
    fightOf(ai).events.push(mark);
    console.log('[LeaderTrace] marked ' + mark.t + ' s: ' + mark.text);
    return mark;
  }

  if (on && G.LeaderAI) G.LeaderAI.recorder = record;
  Object.assign(G.Debug, { leaderTrace, leaderMark });
})();
