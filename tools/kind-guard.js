// tools/kind-guard.js: the slice 7a search guard. No game file reads the legacy move table (G.Moves.BY_ID, G.Kinds, a move's
// `kind`) outside the files slice 7b deletes. A line tagged "legacy-7b" is a known flag-off or D-BUBBLE reader: allowed, and listed so
// 7b starts with a work list. Used by tools/check.js and docs/proposals/ui-readers-harness.js.
//   scanText(text) -> [{ line, rule }]   the offending lines of one file (tagged lines left out)
//   tagged(text)   -> [line]             the tagged lines
//   run(root)      -> { bad: [{ file, line, rule }], tagged: [{ file, line }], files }
const fs = require('fs'), path = require('path');

// Files and folders 7b deletes or purges (slice-7b.md Scope), plus js/net/ (deferred, D-COOP).
const EXEMPT = ['js/data/moves.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/systems/combat.js', 'js/systems/move-route.js'];
const EXEMPT_DIR = ['js/net/'];
// A `kind` that is not a move, named per file and rule.
const NOT_MOVE = { 'js/core/audio.js': { rule: 'kind compared to a move family', why: 'the shot sound\'s family parameter (G.Audio.sfx(\'shot\', { kind }))' } };
const FAMILY = 'projectile|melee|beam|orbit|nova|aura|buff|boomerang|chain|mine|meteor|turret|dash|trail|cone';
const RULES = [
  ['G.Moves.BY_ID', /\bG\.Moves\.BY_ID\b/],
  ['G.Kinds', /\bG\.Kinds\b/],
  ['a move object\'s kind', /\b(m|mv|move|slot|def|d)\.kind\b/],
  ['kind compared to a move family', new RegExp('\\.kind\\s*[!=]==?\\s*[\'"](' + FAMILY + ')[\'"]')]
];
const TAG = 'legacy-7b';

function scanText(text) {
  const out = [];
  text.split('\n').forEach((l, i) => {
    if (l.includes(TAG)) return;
    for (const [rule, re] of RULES) if (re.test(l)) { out.push({ line: i + 1, rule }); break; }
  });
  return out;
}
const tagged = text => text.split('\n').map((l, i) => (l.includes(TAG) ? i + 1 : 0)).filter(Boolean);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}
function run(root) {
  const bad = [], tags = [];
  const files = walk(path.join(root, 'js')).map(p => path.relative(root, p).replace(/\\/g, '/'))
    .filter(f => !EXEMPT.includes(f) && !EXEMPT_DIR.some(d => f.startsWith(d)));
  for (const f of files) {
    const text = fs.readFileSync(path.join(root, f), 'utf8');
    for (const h of scanText(text)) if (!(NOT_MOVE[f] && NOT_MOVE[f].rule === h.rule)) bad.push({ file: f, line: h.line, rule: h.rule });
    for (const line of tagged(text)) tags.push({ file: f, line });
  }
  return { bad, tagged: tags, files: files.length };
}

module.exports = { EXEMPT, EXEMPT_DIR, NOT_MOVE, RULES, TAG, scanText, tagged, run };
