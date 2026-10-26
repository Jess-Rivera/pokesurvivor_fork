// tools/check.js: syntax-check every game JS file, then run every offline harness.
// Usage: node tools/check.js          (from the repo root or anywhere)
// Exit code 1 if anything fails. Output is one line per failure and a short summary.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', 'pokeapi-master', 'assets', 'cache', 'out', '.git', '_delete_',
  'old-bottom-up', 'review-build', 'shots2b', 'functions', 'cloudflare', '__pycache__']);

function walk(dir, test, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, test, out);
    else if (test(e.name, p)) out.push(p);
  }
  return out;
}
const rel = p => path.relative(root, p).replace(/\\/g, '/');

// 1. Syntax check (node --check): game code, tools, the service worker.
const files = [...walk(path.join(root, 'js'), n => n.endsWith('.js')),
  ...walk(path.join(root, 'tools'), n => n.endsWith('.js') && n !== 'check.js'),
  path.join(root, 'sw.js')].filter(f => fs.existsSync(f));
let bad = 0;
for (const f of files) {
  const r = cp.spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) { bad++; console.log('SYNTAX FAIL ' + rel(f) + '\n   ' + (r.stderr || '').split('\n').slice(0, 4).join('\n   ')); }
}
console.log('syntax: ' + (files.length - bad) + '/' + files.length + ' files OK');

// 2. Harnesses: every *harness*.js under docs/ (exit code 0 and no line containing FAIL).
// Known stale harnesses (skipped, with the reason). Remove an entry when it is fixed.
const KNOWN_STALE = { 'docs/proposals/upgrade-slice2a-harness.js': 'needs a work copy under new/ and a stub G.U.TYPE_COLOR since slice 2c',
  'docs/proposals/upgrade-slice2b-harness.js': 'reads docs/move-catalogue-preview.json, deleted in 050437e' };
const harnesses = walk(path.join(root, 'docs'), n => /harness.*\.js$/.test(n)).filter(h => {
  const why = KNOWN_STALE[rel(h)];
  if (why) console.log('skip ' + rel(h) + '  (stale: ' + why + ')');
  return !why;
});
let hbad = 0;
for (const h of harnesses) {
  const t0 = Date.now();
  const r = cp.spawnSync(process.execPath, [h], { cwd: root, encoding: 'utf8', timeout: 60000 });
  const out = ((r.stdout || '') + (r.stderr || '')).trim().split('\n');
  const failLine = out.find(l => /\bFAIL\b/.test(l) || /Error/.test(l));
  const ok = r.status === 0 && !failLine;
  if (!ok) { hbad++; console.log('HARNESS FAIL ' + rel(h) + '\n   ' + (failLine || out[out.length - 1] || 'exit ' + r.status).slice(0, 200)); }
  else console.log('ok  ' + rel(h) + '  (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)  ' + (out[out.length - 1] || '').slice(0, 60));
}
console.log('harnesses: ' + (harnesses.length - hbad) + '/' + harnesses.length + ' passed');
// 3. Move data: the generated file must match its source JSON (no hand edits), and every move must pass the grammar.
let mbad = 0;
for (const [name, args, show] of [['export_moves.js', ['--check'], /current/], ['validate_moves.js', [], /^moves:/]]) {
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, name), ...args], { encoding: 'utf8' });
  const out = ((r.stdout || '') + (r.stderr || '')).trim().split('\n');
  if (r.status !== 0) { mbad++; console.log('MOVE DATA FAIL tools/' + name + '\n   ' + out.filter(l => /INVALID|FAIL|STALE|Error/.test(l)).slice(0, 8).join('\n   ')); }
  else console.log('ok  tools/' + name + '  ' + (out.find(l => show.test(l)) || ''));
}
console.log('move data: ' + (mbad ? mbad + ' step(s) failed' : 'ok'));
process.exit(bad || hbad || mbad ? 1 : 0);
