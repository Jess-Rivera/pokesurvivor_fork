// Mutation check for the text-field keys fix (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/input-keys-mutate.js
// Each mutation breaks js/core/input.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/input-keys-harness.js against it (IK_INPUT). The harness must fail every time; a miss is a gap.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const REL = 'js/core/input.js';
const M = [
  ['the text-field exemption is dropped (the login Tab bug comes back)', [['if (!typing(e.target) && [', 'if ([']]],
  ['every target counts as a text field (keys scroll the page in a run)', [["return !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '') || !!t.isContentEditable);", 'return true;']]],
  ['a contenteditable is not a text field', [[" || !!t.isContentEditable);", ');']]],
  ['a textarea is not a text field', [['INPUT|TEXTAREA|SELECT', 'INPUT|SELECT']]],
  ['Tab is no longer blocked outside text fields', [["'space', 'tab'].includes(c)", "'space'].includes(c)"]]],
  ['Tab no longer counts for cycle_next', [["cycle_next: ['keye', 'tab'],", "cycle_next: ['keye'],"]]],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'input-keys-mut-'));
let caught = 0;
for (const [name, edits] of M) {
  let s = fs.readFileSync(path.join(root, REL), 'utf8');
  for (const [a, b] of edits) {
    if (!s.includes(a)) { console.log('STALE mutation (pattern not found): ' + name); process.exitCode = 1; s = null; break; }
    s = s.replace(a, b);
  }
  if (s == null) continue;
  const f = path.join(tmp, 'input.js');
  fs.writeFileSync(f, s);
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/input-keys-harness.js')], { cwd: root, env: Object.assign({}, process.env, { IK_INPUT: f }), encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n'), hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find(l => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')' : ''));
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught < M.length) process.exitCode = 1;
