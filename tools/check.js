// tools/check.js: syntax-check every game JS file, then run every offline harness.
// Usage: node tools/check.js          (from the repo root or anywhere)
// Exit code 1 if anything fails. Output is one line per failure and a short summary.
const fs = require('fs'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..');
const SKIP = new Set([
  'node_modules',
  'pokeapi-master',
  'assets',
  'cache',
  'out',
  '.git',
  '_delete_',
  'old-bottom-up',
  'review-build',
  'shots2b',
  'functions',
  'cloudflare',
  '__pycache__',
]);

function walk(dir, test, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, test, out);
    else if (test(e.name, p)) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(root, p).replace(/\\/g, '/');

// 1. Syntax check (node --check): game code, tools, the service worker.
const files = [
  ...walk(path.join(root, 'js'), (n) => n.endsWith('.js')),
  ...walk(path.join(root, 'tools'), (n) => n.endsWith('.js') && n !== 'check.js'),
  path.join(root, 'sw.js'),
].filter((f) => fs.existsSync(f));
let bad = 0;
for (const f of files) {
  const r = cp.spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) {
    bad++;
    console.log('SYNTAX FAIL ' + rel(f) + '\n   ' + (r.stderr || '').split('\n').slice(0, 4).join('\n   '));
  }
}
console.log('syntax: ' + (files.length - bad) + '/' + files.length + ' files OK');

// 2. Harnesses: every *harness*.js under docs/ (exit code 0 and no line containing FAIL).
// Known stale harnesses (skipped, with the reason). Remove an entry when it is fixed.
const KNOWN_STALE = {}; // slice 7b-2a retired the two stale upgrade harnesses with the legacy cards
const harnesses = walk(path.join(root, 'docs'), (n) => /harness.*\.js$/.test(n)).filter((h) => {
  const why = KNOWN_STALE[rel(h)];
  if (why) console.log('skip ' + rel(h) + '  (stale: ' + why + ')');
  return !why;
});
let hbad = 0;
for (const h of harnesses) {
  const t0 = Date.now();
  const r = cp.spawnSync(process.execPath, [h], { cwd: root, encoding: 'utf8', timeout: 60000 });
  const out = ((r.stdout || '') + (r.stderr || '')).trim().split('\n');
  const failLine = out.find((l) => /\bFAIL\b/.test(l) || /Error/.test(l));
  const ok = r.status === 0 && !failLine;
  if (!ok) {
    hbad++;
    console.log(
      'HARNESS FAIL ' + rel(h) + '\n   ' + (failLine || out[out.length - 1] || 'exit ' + r.status).slice(0, 200)
    );
  } else
    console.log(
      'ok  ' +
        rel(h) +
        '  (' +
        ((Date.now() - t0) / 1000).toFixed(1) +
        's)  ' +
        (out[out.length - 1] || '').slice(0, 60)
    );
}
console.log('harnesses: ' + (harnesses.length - hbad) + '/' + harnesses.length + ' passed');
// 2b. Invariant I1 guard: the new combat files (js/systems/move-*.js) must never mention the legacy move `kind`, comments included.
let kbad = 0;
const moveFiles = walk(path.join(root, 'js', 'systems'), (n) => /^move-.*\.js$/.test(n));
for (const f of moveFiles) {
  const hit = fs
    .readFileSync(f, 'utf8')
    .split('\n')
    .findIndex((l) => /\bkind\b/i.test(l));
  if (hit >= 0) {
    kbad++;
    console.log('I1 GUARD FAIL ' + rel(f) + ':' + (hit + 1) + '  the word "kind" is not allowed in new combat files');
  }
}
console.log('I1 guard: ' + (kbad ? kbad + ' file(s) mention kind' : 'ok (' + moveFiles.length + ' move-*.js file(s))'));
// 2c. Legacy move guard (slice 7a, final in 7b-2b): no legacy move-table read (G.Moves.BY_ID, G.Kinds, a move's kind) in any game file (tools/kind-guard.js).
const KG = require('./kind-guard.js').run(root);
for (const h of KG.bad)
  console.log('7A GUARD FAIL ' + h.file + ':' + h.line + '  ' + h.rule + ' (read the resolved def or G.MoveInfo)');
console.log(
  '7a guard: ' +
    (KG.bad.length
      ? KG.bad.length + ' legacy read(s)'
      : 'ok (' +
        KG.files +
        ' file(s)' +
        (KG.tagged.length ? '; ' + KG.tagged.length + ' stray legacy-7b tag(s)' : '') +
        ')')
);
kbad += KG.bad.length;
// 3. Generated data: the move file must match its source JSON (no hand edits), every move must pass the grammar, and the resolver self-test and parity run must not crash;
// the gym contact mask must match its PNG, and docs/ITEMS.md must match the item and drop data.
let mbad = 0;
for (const [name, args, show] of [
  ['export_moves.js', ['--check'], /current/],
  ['validate_moves.js', [], /^moves:/],
  ['validate_moves.js', ['--resolved'], /^resolved moves:/],
  ['move_parity.js', [], /^parity:/],
  ['gym_contact.js', ['--check'], /current/],
  ['items_report.js', ['--check'], /current/],
  ['evolvable_data.js', ['--check'], /current/],
  ['species_traits.js', ['--check'], /current/],
]) {
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, name), ...args], { encoding: 'utf8' });
  const out = ((r.stdout || '') + (r.stderr || '')).trim().split('\n');
  if (r.status !== 0) {
    mbad++;
    console.log(
      'MOVE DATA FAIL tools/' +
        name +
        '\n   ' +
        out
          .filter((l) => /INVALID|FAIL|STALE|Error|out of date/.test(l))
          .slice(0, 8)
          .join('\n   ')
    );
  } else console.log('ok  tools/' + name + '  ' + (out.find((l) => show.test(l)) || ''));
}
console.log('move data: ' + (mbad ? mbad + ' step(s) failed' : 'ok'));
const FORMAT_GLOBS = require('../package.json')
  .scripts['format:check'].match(/"[^"]+"|\S+/g)
  .slice(2)
  .map((g) => g.replace(/"/g, ''));
// 4. Lint (ESLint, warn-only for now: the count is printed, it never fails the run). Skipped if dev dependencies are not installed.
try {
  const eslintBin = path.join(root, 'node_modules', 'eslint', 'bin', 'eslint.js');
  if (!fs.existsSync(eslintBin)) throw new Error('no eslint');
  const r = cp.spawnSync(process.execPath, [eslintBin, '-f', 'json', '.'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  let errs = 0,
    warns = 0;
  for (const f of JSON.parse(r.stdout || '[]')) {
    errs += f.errorCount;
    warns += f.warningCount;
  }
  console.log('lint: ' + errs + ' error(s), ' + warns + ' warning(s) (warn-only; run npx eslint . for detail)');
} catch (e) {
  console.log('lint: skipped (npm install to enable)');
}
// 5. Format drift (Prettier, report only: the count is printed, it never fails the run).
try {
  const prettierBin = path.join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
  if (!fs.existsSync(prettierBin)) throw new Error('no prettier');
  const r = cp.spawnSync(process.execPath, [prettierBin, '--list-different', ...FORMAT_GLOBS], {
    cwd: root,
    encoding: 'utf8',
  });
  const drift = (r.stdout || '').split(/\r?\n/).filter(Boolean);
  console.log(
    'format: ' + (drift.length ? drift.length + ' file(s) need npm run format: ' + drift.slice(0, 5).join(', ') : 'ok')
  );
} catch (e) {
  console.log('format: skipped (npm install to enable)');
}
process.exit(bad || hbad || mbad || kbad ? 1 : 0);
