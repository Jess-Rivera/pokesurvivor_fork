// Mutation check for the starter regions data (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/starter-regions-mutate.js
// Each mutation breaks js/data/starters.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/starter-regions-harness.js against it (SR_STARTERS). The harness must fail every time; a miss is a gap.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'starter-regions-mut-'));
let caught = 0;
for (const [name, edits] of M) {
  let s = fs.readFileSync(path.join(root, REL), 'utf8');
  for (const [a, b] of edits) {
    if (!s.includes(a)) { console.log('STALE mutation (pattern not found): ' + name); process.exitCode = 1; s = null; break; }
    s = s.replace(a, b);
  }
  if (s == null) continue;
  const f = path.join(tmp, 'starters.js');
  fs.writeFileSync(f, s);
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/starter-regions-harness.js')], { cwd: root, env: Object.assign({}, process.env, { SR_STARTERS: f }), encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n'), hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find(l => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')' : ''));
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught < M.length) process.exitCode = 1;
