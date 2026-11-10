// tools/mutate-compare.js: checks that a parallel mutation run gives the same verdicts as a serial one (#55).
// Usage from the repo root:  node tools/mutate-compare.js docs/proposals/leader-ai-mutate.js [more scripts...] [--workers N]
// For each script it runs the mutations twice through tools/mutate-runner.js, once with one worker (the serial way) and
// once in parallel (default: half the cores, or --workers N), and compares every mutation's verdict. A difference means
// a harness depends on running alone (a shared file, a timing race) and the parallel result cannot be trusted for it.
// Exit code: 0 when every verdict matches, 1 otherwise.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const wi = args.indexOf('--workers');
const parallel = wi >= 0 ? args.splice(wi, 2)[1] : String(Math.max(1, Math.floor(os.cpus().length / 2)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mutate-compare-'));

function run(script, workers) {
  const json = path.join(tmp, path.basename(script) + '.' + workers + '.json');
  const t0 = Date.now();
  cp.spawnSync(process.execPath, [path.resolve(root, script), '--workers', workers], {
    cwd: root,
    env: Object.assign({}, process.env, { MUTATE_JSON: json }),
    encoding: 'utf8',
  });
  if (!fs.existsSync(json)) return { seconds: (Date.now() - t0) / 1000, results: null };
  return JSON.parse(fs.readFileSync(json, 'utf8'));
}

let differ = 0;
for (const script of args) {
  const serial = run(script, '1'),
    par = run(script, parallel);
  if (!serial.results || !par.results) {
    console.log('NO RESULT  ' + script + ' (its baseline failed: the harness fails on the real code)');
    differ++;
    continue;
  }
  const bad = serial.results.filter(
    (r, i) => !par.results[i] || par.results[i].name !== r.name || par.results[i].verdict !== r.verdict
  );
  for (const r of bad) {
    const p = par.results.find((x) => x.name === r.name);
    console.log(
      'DIFFERS  ' + script + ': ' + r.name + '  serial ' + r.verdict + ', parallel ' + (p ? p.verdict : 'absent')
    );
  }
  differ += bad.length;
  console.log(
    (bad.length ? 'DIFF  ' : 'same  ') +
      path.basename(script) +
      '  ' +
      serial.results.length +
      ' mutations, serial ' +
      serial.seconds +
      ' s, parallel ' +
      par.seconds +
      ' s (' +
      parallel +
      ' workers)'
  );
}
fs.rmSync(tmp, { recursive: true, force: true });
process.exitCode = differ ? 1 : 0;
