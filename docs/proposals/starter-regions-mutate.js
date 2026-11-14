// Mutation check for the starter regions data (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/starter-regions-mutate.js
// Each mutation breaks js/data/starters.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/starter-regions-harness.js against it (SR_STARTERS). The harness must fail every time; a miss is a gap.
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const REL = 'js/data/starters.js';
const M = [
  ['two regions swap places', [["{ name: 'Kanto', dex: [1, 4, 7] },\n  { name: 'Johto', dex: [152, 155, 158] },", "{ name: 'Johto', dex: [152, 155, 158] },\n  { name: 'Kanto', dex: [1, 4, 7] },"]]],
  ['a member is dropped', [["dex: [152, 155, 158]", "dex: [152, 155]"]]],
  ['a trio is out of Grass, Fire, Water order', [["dex: [252, 255, 258]", "dex: [255, 252, 258]"]]],
  ['Psyduck replaces a starter', [["dex: [387, 390, 393]", "dex: [387, 390, 54]"]]],
  ['a starter is from the wrong generation', [["dex: [650, 653, 656]", "dex: [650, 653, 258]"]]],
  ['a region is missing', [["  { name: 'Paldea', dex: [906, 909, 912] },\n", ""]]],
  ['a starter has no starting move', [["{ dex: 501, start: 'water-gun', traits: ['valiente', 'travieso'] },\n", ""]]],
];

require('../../tools/mutate-runner.js')({
  label: 'starter-regions-mutate',
  root,
  harnesses: ['docs/proposals/starter-regions-harness.js'],
  mutants: M.map(([name, edits]) => ({ name, file: REL, edits, env: { SR_STARTERS: '<out>' } })),
});
