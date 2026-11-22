// tools/planner-step-parity.js: the leader planner before and after a behavior-neutral refactor, checked for parity
// (F3, docs/AI Outputs/Refactor-F-series/F3 - Planner Verb Table Plan.md). A dev tool, never shipped; check.js syntax-checks it.
// Usage from the repo root:
//   node tools/planner-step-parity.js [before.js]
// before.js defaults to tools/cache/leader-planner-before.js (git-ignored): copy js/systems/leader-planner.js there
// before the refactor. On made-up worlds (the planner's own snapshot shape, as leader-ai-harness section 15 builds
// them)
// it sends every action the planner offers, two steps deep, through apply() on both copies and compares the next
// state and the step field by field, then compares each world's full choose(). It also checks that every verb was
// exercised, both kinds of wait included, so a clean run means every handler was compared. Prints only differences.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const root = path.resolve(__dirname, '..');
const beforeFile = path.resolve(root, process.argv[2] || 'tools/cache/leader-planner-before.js'),
  afterFile = path.join(root, 'js/systems/leader-planner.js');
if (!fs.existsSync(beforeFile)) {
  console.log('planner-step-parity: no ' + path.relative(root, beforeFile) + ' (copy the planner there first)');
  process.exit(1);
}

/** One copy of the planner on its own G: it reads nothing but G.LeaderPlanner (leader-ai-harness 15i). */
function loadPlanner(file) {
  const sandbox = vm.createContext({ G: {} });
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  return sandbox.G.LeaderPlanner;
}
const before = loadPlanner(beforeFile),
  after = loadPlanner(afterFile);

let failures = 0;
const fail = (message) => {
  failures++;
  console.log('FAIL  ' + message);
};

/** Where two results differ, as "path: before vs after" lines (the first few only). NaN equals NaN. */
function differences(a, b, at = '', out = []) {
  if (out.length >= 4) return out;
  if (typeof a === 'number' && typeof b === 'number') {
    if (a !== b && !(Number.isNaN(a) && Number.isNaN(b))) out.push(at + ': ' + a + ' vs ' + b);
    return out;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    if (a !== b) out.push(at + ': ' + JSON.stringify(a) + ' vs ' + JSON.stringify(b));
    return out;
  }
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) differences(a[key], b[key], at + '.' + key, out);
  return out;
}
const same = (label, a, b) => {
  const found = differences(a, b);
  if (found.length) fail(label + ': ' + found.join('; '));
  return !found.length;
};

// ---------- made-up worlds ----------
const move = (o) =>
  Object.assign(
    { cooldown: 2, remaining: 0, hitFraction: 0.1, tell: 0.5, travelSpeed: 0, halfWidth: 10, setsBack: false },
    o
  );
const jab = (o = {}) => move(Object.assign({ id: 'jab', form: 'melee', tag: 'attack', reach: 50 }, o));
const gun = (o = {}) =>
  move(Object.assign({ id: 'gun', form: 'shot', tag: 'attack', reach: 300, hitFraction: 0.05, cooldown: 1 }, o));
const harden = () =>
  move({ id: 'harden', form: 'buff', tag: 'buff', reach: 0, hitFraction: 0, tell: 0, buffReady: true, buffValue: 0.2 });
const heal = () =>
  move({ id: 'recover', form: 'heal', tag: 'heal', reach: 0, hitFraction: 0, tell: 0, cooldown: 6, healFraction: 0.5 });
const whip = (o = {}) =>
  Object.assign({ id: 'whip', hitFraction: 0.2, reach: 120, cycle: 1, nextFireIn: 0, travelSpeed: 0 }, o);
const ember = (o = {}) =>
  Object.assign({ id: 'ember', hitFraction: 0.2, reach: 150, cycle: 2, nextFireIn: 0, travelSpeed: 300 }, o);
const own = (o = {}) =>
  Object.assign(
    {
      speed: 100,
      radius: 10,
      hpFraction: 1,
      healsLeft: 0,
      activeSlot: 0,
      stunLeft: 0,
      dodgeReserve: 0,
      dodgeCharges: { ready: 2, total: 2, nextBackIn: 0 },
    },
    o
  );
const bench = () => [
  {
    name: 'Seel',
    team: 1,
    hpFraction: 1,
    healsLeft: 0,
    speed: 90,
    radius: 10,
    slots: [{ index: 0, moves: [jab()] }],
    threats: [whip({ hitFraction: 0.1 })],
  },
];
const DODGE_ON = { dodge: { dist: 150, time: 0.5 }, reflex: 0.15, dodgeRead: 6, bag: 10 };
const SWAP_ON = { swap: { allowed: true, iframes: 0.5, will: 1 }, bench: bench() };
/** A world: one slot per move list, you `distance` px off. */
const world = (o = {}) =>
  Object.assign(
    {
      distance: 100,
      preferredRange: 220,
      aimError: 0,
      risk: 1,
      stubbornness: 1,
      randomness: 0,
      misjudge: 0,
      confidence: 0.5,
      own: own(o.own),
      slots: (o.slots || [[jab()], [gun()]]).map((moves, index) => ({ index, moves })),
      you: Object.assign(
        { hpFraction: 1, radius: 10, sidewaysSpeed: 40, bestReach: 120, bestHit: 0.2, baitMoveId: 'whip' },
        { threats: [whip()] },
        o.you || {}
      ),
    },
    o.top || {}
  );
const WORLDS = {
  'near, in your whip': world({ top: { distance: 40 } }),
  'far, your ember drawable': world({
    you: { threats: [ember()], bestReach: 150 },
    top: { distance: 400, ...DODGE_ON },
  }),
  'your ember inside reach, due soon': world({
    you: { threats: [ember({ nextFireIn: 1.2 })] },
    top: { distance: 120 },
  }),
  'asleep with a bench': world({ own: { stunLeft: 2 }, top: { distance: 60, ...SWAP_ON } }),
  'slots cooling, buff and heal ready': world({
    own: { hpFraction: 0.5, healsLeft: 1 },
    slots: [[jab({ remaining: 1.5 })], [harden()], [heal()]],
    top: { distance: 80 },
  }),
  'a charge and a cooldown to recover': world({
    own: { dodgeCharges: { ready: 0, total: 2, nextBackIn: 2 } },
    slots: [[jab()], [gun({ remaining: 3 })]],
    top: { distance: 250, ...DODGE_ON },
  }),
  'one dodge from its reach': world({ top: { distance: 200, ...DODGE_ON, ...SWAP_ON } }),
  'nearly fainted under fire': world({
    own: { hpFraction: 0.1 },
    you: { threats: [whip({ hitFraction: 0.5 })] },
    top: { distance: 40, ...SWAP_ON },
  }),
  'a weighted leader': world({
    top: {
      distance: 180,
      ...DODGE_ON,
      goalWeights: { endurance: 1.4, kite: 0.6 },
      tagMultipliers: { approach: 1.5, dodge: 0.5 },
      misjudge: 0.1,
    },
  }),
};

// ---------- the comparison ----------
const exercised = new Set();
/** The verb, with the two kinds of wait told apart (D2: one verb, two handlers). */
function verbKey(action) {
  if (action.verb !== 'wait') return action.verb;
  return action.yourMove != null ? 'wait:yourShot' : 'wait:slot';
}
const clone = (value) => structuredClone(value);
let steps = 0;

/** Every action the planner offers in `state`, through both copies; `depth` more levels from each result. */
function compareFrom(name, theWorld, state, last, depth, trail) {
  const offeredBefore = before.actionsIn(clone(theWorld), clone(state), last && clone(last)),
    offeredAfter = after.actionsIn(clone(theWorld), clone(state), last && clone(last));
  if (!same(name + trail + ' actionsIn', offeredBefore, offeredAfter)) return;
  for (const action of offeredBefore) {
    const label = name + trail + ' > ' + verbKey(action);
    const stepBefore = before.apply(clone(theWorld), clone(state), clone(action)),
      stepAfter = after.apply(clone(theWorld), clone(state), clone(action));
    steps++;
    exercised.add(verbKey(action));
    if (!same(label, stepBefore, stepAfter) || depth <= 0) continue;
    compareFrom(name, theWorld, stepAfter.state, stepAfter.step, depth - 1, trail + ' > ' + verbKey(action));
  }
}

for (const [name, theWorld] of Object.entries(WORLDS)) {
  compareFrom(name, theWorld, before.startState(clone(theWorld)), null, 1, '');
  same(name + ' choose()', before.choose(clone(theWorld)), after.choose(clone(theWorld)));
  const pick = before.choose(clone(theWorld)).pick;
  if (pick) {
    const running = { goal: pick.goal, step: pick.steps[0], invested: 2 };
    same(
      name + ' choose() with a running plan',
      before.choose(clone(theWorld), running),
      after.choose(clone(theWorld), running)
    );
  }
  same(
    name + ' choose() with misjudge noise',
    before.choose(clone(theWorld), null, null, before.seeded(7)),
    after.choose(clone(theWorld), null, null, after.seeded(7))
  );
}

const EVERY_VERB = [
  'close',
  'hold',
  'backOff',
  'wait:yourShot',
  'wait:slot',
  'recover',
  'dash',
  'draw',
  'dodge',
  'swap',
  'use',
];
const notExercised = EVERY_VERB.filter((verb) => !exercised.has(verb));
if (notExercised.length) fail('never exercised, so not compared: ' + notExercised.join(', ') + ' (add a world)');

// D1 (F3): a verb with no handler throws in the new planner, naming the verb
try {
  const anyWorld = clone(WORLDS['near, in your whip']);
  after.apply(anyWorld, after.startState(anyWorld), { verb: 'teleport' });
  fail('a verb with no handler did not throw');
} catch (error) {
  if (!/teleport/.test(error.message)) fail('the missing-handler error does not name the verb: ' + error.message);
}

const summary = Object.keys(WORLDS).length + ' worlds, ' + steps + ' steps, ' + EVERY_VERB.length + ' verbs';
const verdict = failures ? 'planner-step-parity: ' + failures + ' FAILED' : 'planner-step-parity: all match';
console.log(verdict + ' (' + summary + ')');
process.exit(failures ? 1 : 0);
