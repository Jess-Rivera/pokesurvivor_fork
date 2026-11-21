// Mutation check for the two-type rim dither (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/pixel-dither-mutate.js
// Each mutation breaks js/ui/lib/primitives/pixels/pixels.js's dither in one deliberate way, writes the copy to a temp
// folder, and runs docs/proposals/pixel-dither-harness.js against it (PD_PIXELS). The harness must fail every time; a
// miss is a gap in it.
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const REL = 'js/ui/lib/primitives/pixels/pixels.js';
const M = [
  ['the band twice as wide', [['const TWO_TYPE_RIM = { band: 0.25,', 'const TWO_TYPE_RIM = { band: 0.5,']]],
  ['the sides swapped', [['line.push(blend > threshold);', 'line.push(blend <= threshold);']]],
  [
    'one shuffle for every row',
    [['order = ditherBlockOrder(row, x / TWO_TYPE_RIM.block);', 'order = ditherBlockOrder(0, x / TWO_TYPE_RIM.block);']],
  ],
  [
    'an unseeded shuffle',
    [
      [
        'const swap = ditherHash(TWO_TYPE_RIM.seed, row, block, index) % (index + 1);',
        'const swap = Math.floor(Math.random() * (index + 1));',
      ],
    ],
  ],
  [
    'a hard edge, no dither',
    [['threshold = (order[x % TWO_TYPE_RIM.block] + 0.5) / TWO_TYPE_RIM.block;', 'threshold = 0.5;']],
  ],
  ['the paint cache forgets the second ramp', [['cacheKey = JSON.stringify([colours, second]);', 'cacheKey = JSON.stringify([colours]);']]],
];

require('../../tools/mutate-runner.js')({
  label: 'pixel-dither-mutate',
  root,
  harnesses: ['docs/proposals/pixel-dither-harness.js'],
  mutants: M.map(([name, edits]) => ({ name, file: REL, edits, env: { PD_PIXELS: '<out>' } })),
});
