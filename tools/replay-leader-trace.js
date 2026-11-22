// tools/replay-leader-trace.js: rescore a saved leader trace under other goal weights (#109, dev only).
// Plan: docs/AI Outputs/Issue-109/109 - Weights Scale The Whole Score Plan.md, step 4.
//
//   node tools/replay-leader-trace.js <trace.json> [more traces] [--weights finish=0.35,maintain=1.2]
//
// A trace is what G.Debug.leaderTrace('save') downloads (put it in tools/cache/). For each recorded choice the tool
// rebuilds every ranked goal's net (value minus its misread cost), rescores it with G.LeaderPlanner's own rule
// (utility and weightedScore) under the recorded goal weights with --weights laid over them, and ranks again. It
// prints the share of fight time each goal leads, as recorded and as replayed. With no --weights it sweeps Finish.
// Limits: the plans stay the ones recorded (a new weight can change which plan is a goal's best only when its net
// sign changes, and that is not replayed); randomness draws are not replayed (the top total is taken).
'use strict';
const fs = require('fs');
const path = require('path');

global.G = {};
require(path.join(__dirname, '..', 'js', 'systems', 'leader-planner.js'));
const P = G.LeaderPlanner;
const FINISH_SWEEP = [1, 0.5, 0.35, 0.25];

/** The utility a recorded entry was scored with: its own field when the trace has it, else rebuilt from the inputs. */
function recordedUtility(entry, inputs) {
  if (entry.weight != null) return entry.weight;
  return P.utility(entry.goal, { goalWeights: inputs.goalWeights, confidence: inputs.confidence });
}

/** A recorded entry's net (value minus misread cost) and its unweighted value. A trace without `weight` was saved
 *  under the old rule (score = value x utility - misread cost, `value` already weighted). */
function netOf(entry, inputs) {
  const goalUtility = recordedUtility(entry, inputs);
  if (entry.weight == null) {
    const misreadCost = entry.value - entry.score;
    return entry.value / goalUtility - misreadCost;
  }
  return entry.score > 0 && goalUtility > 0 ? entry.score / goalUtility : entry.score;
}

/** The goal on top of one recorded choice, rescored with `weights` laid over the recorded ones. */
function replayedPick(record, weights) {
  const inputs = record.inputs,
    world = { goalWeights: Object.assign({}, inputs.goalWeights, weights), confidence: inputs.confidence };
  let best = null;
  for (const entry of record.ranking) {
    const oldUtility = recordedUtility(entry, inputs),
      newUtility = P.utility(entry.goal, world);
    if (!(newUtility > 0)) continue;
    // the commitment bonus scales with the goal's utility (G.LeaderPlanner choose)
    const bonus = oldUtility > 0 ? (entry.bonus || 0) * (newUtility / oldUtility) : 0,
      total = P.weightedScore(netOf(entry, inputs), newUtility) + bonus;
    if (!best || total > best.total) best = { goal: entry.goal, total };
  }
  return best ? best.goal : 'none';
}

/** Share of fight time (each choice lasts until the next one) by goal, from a list of { t, goal }. */
function timeShares(choices) {
  const time = {};
  let total = 0;
  for (let index = 0; index < choices.length - 1; index++) {
    const lasted = choices[index + 1].t - choices[index].t;
    time[choices[index].goal] = (time[choices[index].goal] || 0) + lasted;
    total += lasted;
  }
  const shares = Object.entries(time)
    .filter(([, seconds]) => seconds > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([goal, seconds]) => goal + ' ' + Math.round((100 * seconds) / total) + '%');
  return shares.join(', ') || 'no time';
}

/** --weights finish=0.35,maintain=1.2 as an object. */
function parseWeights(text) {
  const weights = {};
  for (const pair of text.split(',')) {
    const [goal, number] = pair.split('=');
    if (!P.GOALS.includes(goal) || !(Number(number) >= 0)) throw new Error('bad weight: ' + pair);
    weights[goal] = Number(number);
  }
  return weights;
}

function main(args) {
  const flag = args.indexOf('--weights'),
    files = flag < 0 ? args : args.filter((arg, index) => index !== flag && index !== flag + 1),
    weightSets = flag >= 0 ? [parseWeights(args[flag + 1])] : FINISH_SWEEP.map((finish) => ({ finish }));
  if (!files.length) {
    console.log('usage: node tools/replay-leader-trace.js <trace.json> [more] [--weights finish=0.35,maintain=1.2]');
    process.exit(1);
  }
  for (const file of files) {
    const trace = JSON.parse(fs.readFileSync(file, 'utf8')),
      records = trace.records || [],
      oldRule = records.some((record) => record.ranking.some((entry) => entry.weight == null));
    console.log(
      trace.leader +
        ' (' +
        path.basename(file) +
        ', ' +
        records.length +
        ' choices' +
        (oldRule ? ', saved under the old rule' : '') +
        ')'
    );
    console.log('  recorded: ' + timeShares(records.map((record) => ({ t: record.t, goal: record.pick || 'none' }))));
    for (const weights of weightSets) {
      const choices = records.map((record) => ({ t: record.t, goal: replayedPick(record, weights) }));
      console.log('  ' + JSON.stringify(weights) + ': ' + timeShares(choices));
    }
  }
}

main(process.argv.slice(2));
