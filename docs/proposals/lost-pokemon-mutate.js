// Mutation check for #138, the Lost Pokemon (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/lost-pokemon-mutate.js
// Each mutation breaks events.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/lost-pokemon-harness.js against it (LP_EVENTS). The harness must fail every time; a mutation it misses
// is a gap.
// Not mutated, with the reason: world.js liquidIsSafe (the harness stubs the world, see its header); the drawing
// and the edge arrow (feel-tested); G.Debug.lost (dev only, no game path); co-op broadcasts (deferred).
const path = require('path');
const root = path.resolve(__dirname, '../..');
const EVENTS = 'js/systems/events.js';
const M = [
  ['the can-evolve filter is gone', [[' &&\n        G.Evolvable.has(p.dex)\n', '\n']]],
  ['the hover filter is back',
    [['G.Evolvable.has(p.dex)\n', 'G.Evolvable.has(p.dex) &&\n        !G.Sprites.hovers(p.dex)\n']]],
  ['a flat 20% for every star', [['{ 1: 0.2, 2: 0.12, 3: 0.06 }', '{ 1: 0.2, 2: 0.2, 3: 0.2 }']]],
  ['2 and 3 star odds swapped', [['{ 1: 0.2, 2: 0.12, 3: 0.06 }', '{ 1: 0.2, 2: 0.06, 3: 0.12 }']]],
  ['a recruit goes into the box at once',
    [['if (recruited) G.Catch.hold(L);', "if (recruited) G.DB.obtain(L.dex, false, 'rescue');"]]],
  ['the held nature is not the toast\'s',
    [['      nature,\n      natureName:', '      nature: G.Rescue.rollNature(),\n      natureName:']]],
  ['floaters collide', [['if (!L.floats) G.World.collide(L);', 'G.World.collide(L);']]],
  ['walkers may use liquid', [['G.Sprites.hovers(mon.dex) && G.World.liquidIsSafe()', 'G.World.liquidIsSafe()']]],
  ['floaters use a liquid that hurts',
    [['G.Sprites.hovers(mon.dex) && G.World.liquidIsSafe()', 'G.Sprites.hovers(mon.dex)']]],
  ['the spawn line has no nature', [["'A ' + lost.natureName + ' ' + lost.name", "'A ' + lost.name"]]],
];

require('../../tools/mutate-runner.js')({
  label: 'lost-pokemon-mutate',
  root,
  harnesses: ['docs/proposals/lost-pokemon-harness.js'],
  args: [root],
  crlf: true,
  mutants: M.map(([name, edits]) => ({ name, file: EVENTS, edits, env: { LP_EVENTS: '<out>' } })),
});
