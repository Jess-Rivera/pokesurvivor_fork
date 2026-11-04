// Mutation check for the pokebox copies harness (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/pokebox-copies-mutate.js
// Each mutation breaks js/systems/copies.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/pokebox-copies-harness.js against it (PB_COPIES env var). The harness must fail every time; a mutation it misses is a gap.
// Step 3a-1 (buying boxes). Not mutated, with the reason: the price tabs and the confirm dialog in js/ui/menu.js (DOM, feel-tested and
// probed headless; the harness has no DOM).
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = 'js/systems/copies.js';
const M = [
  // ---- step 3a-1: buying boxes ----
  ['box prices shifted one tier', [['const BOX_PRICES = { 3: 10000, 4: 25000, 5: 60000 };', 'const BOX_PRICES = { 3: 25000, 4: 60000, 5: 100000 };']]],
  ['the coin check is gone', [["if (!(save.coins >= price)) return { ok: false, error: 'poor' };", '']]],
  ['a sixth box is allowed', [["if (n >= BOX_MAX) return { ok: false, error: 'max' };", "if (n > BOX_MAX) return { ok: false, error: 'max' };"]]],
  ['a box is added without charging', [['    save.coins -= price;\n    save.boxCount = n + 1;', '    save.boxCount = n + 1;']]],
  ['coins are charged but no box is added', [['    save.coins -= price;\n    save.boxCount = n + 1;', '    save.coins -= price;']]],
  ['the price of the box you have is charged', [['const price = boxPrice(n + 1);', 'const price = boxPrice(n);']]],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pokebox-mut-'));
let caught = 0;
for (const [name, edits] of M) {
  let s = fs.readFileSync(path.join(root, SRC), 'utf8').replace(/\r\n/g, '\n');
  for (const [a, b] of edits) {
    if (!s.includes(a)) { console.log('STALE mutation (pattern not found): ' + name); process.exitCode = 1; s = null; break; }
    s = s.replace(a, b);
  }
  if (s == null) continue;
  const f = path.join(tmp, 'copies.js');
  fs.writeFileSync(f, s);
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/pokebox-copies-harness.js'), root], { env: Object.assign({}, process.env, { PB_COPIES: f }), encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n'), hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find(l => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')' : ''));
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught < M.length) process.exitCode = 1;
