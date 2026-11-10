// tools/mutate-runner.js: the shared runner every mutation check (docs/proposals/*-mutate.js) uses (#55).
// A mutate script lists its mutations and calls this module; the runner applies each mutation to a copy of the file,
// runs the harness against every copy in parallel, and reports the verdicts in the script's own mutation order.
//
// Every harness run goes to completion (no fail-fast), so a caught mutation reports how many checks it broke.
// The runner and every harness it starts run at below-normal priority, so the machine stays usable during a run.
//
// Command-line flags, read from the mutate script's own command line:
//   --workers N   run N harnesses at once (also MUTATE_WORKERS=N). Default: half the cores.
//   --full        use every core but two (still low priority). For when you step away.
//   -v            print every FAIL line of a caught mutation, not only the first.
// MUTATE_JSON=<file> also writes the verdicts as JSON (tools/mutate-compare.js reads it).
//
// Usage from a mutate script:
//   require('../../tools/mutate-runner.js')({ label, root, harnesses, mutants, ...options });
// mutants: [{ name, file, edits: [[from, to], ...], env }]. file is relative to root; env maps each environment variable
// the harness reads to the mutated copy's path (the string '<out>'), or is a function (outPath) => env object.
// Options:
//   args        extra harness arguments (most harnesses take [root])
//   cwd         the harness working directory (default root)
//   crlf        true: read the source with CRLF turned into LF before matching the patterns
//   applyMode   'all' (default: every edit must match, else STALE) or 'any' (STALE only when no edit matches)
// A STALE mutation (its pattern no longer matches) is reported and the rest still run, so one stale pattern never hides
// the other verdicts (the old move-* scripts stopped at the first one).
//   baseline    true: run the harnesses on the real code first; a failure there stops the run (exit 2)
//   failed      (result) => boolean, when a harness has its own failure rule (default: a nonzero exit)
//   timeout     ms per harness run (default 10 minutes; a timeout counts as caught, and says so)
// Exit code: 0 when every mutation is caught and none is STALE, 1 otherwise, 2 for a failed baseline.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');

const LOW = os.constants.priority.PRIORITY_BELOW_NORMAL;

function readFlags(argv) {
  const flags = { workers: 0, full: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--full') flags.full = true;
    else if (argv[i] === '-v' || argv[i] === '--verbose') flags.verbose = true;
    else if (argv[i] === '--workers') flags.workers = +argv[++i] || 0;
    else if (argv[i].startsWith('--workers=')) flags.workers = +argv[i].slice(10) || 0;
  }
  if (!flags.workers && +process.env.MUTATE_WORKERS) flags.workers = +process.env.MUTATE_WORKERS;
  return flags;
}

function workerCount(flags) {
  const cores = os.cpus().length;
  if (flags.workers > 0) return flags.workers;
  if (flags.full) return Math.max(1, cores - 2);
  return Math.max(1, Math.floor(cores / 2));
}

function lowerPriority(pid) {
  try {
    os.setPriority(pid, LOW);
  } catch (e) {
    /* not allowed on this machine: the run still works, just at normal priority */
  }
}

// Runs one harness and resolves with { status, timedOut, out }.
function runHarness(harness, opts, env) {
  return new Promise((resolve) => {
    const child = cp.spawn(process.execPath, [harness].concat(opts.args || []), {
      cwd: opts.cwd || opts.root,
      env: Object.assign({}, process.env, env),
    });
    lowerPriority(child.pid);
    let out = '',
      timedOut = false;
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, opts.timeout || 600000);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ status: timedOut ? null : code, timedOut, stdout: out, out });
    });
  });
}

function failLines(out) {
  return out
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.trimStart().startsWith('FAIL'));
}

// Applies a mutant's edits to its source; returns the mutated text, or null when it is STALE.
function applyEdits(opts, mutant) {
  let s = fs.readFileSync(path.join(opts.root, mutant.file), 'utf8');
  if (opts.crlf) s = s.replace(/\r\n/g, '\n');
  let applied = 0;
  for (const [from, to] of mutant.edits) {
    if (s.includes(from)) {
      s = s.replace(from, to);
      applied++;
    } else if (opts.applyMode !== 'any') return null;
  }
  return applied ? s : null;
}

// A tiny pool: runs task functions with at most `size` in flight.
function pool(tasks, size) {
  let next = 0;
  const lane = () => (next < tasks.length ? tasks[next++]().then(lane) : Promise.resolve());
  return Promise.all(Array.from({ length: Math.min(size, tasks.length) }, lane));
}

async function runMutations(opts) {
  const started = Date.now(),
    flags = readFlags(process.argv.slice(2)),
    workers = workerCount(flags),
    label = opts.label || 'mutations',
    harnesses = opts.harnesses.map((h) => path.resolve(opts.root, h)),
    failed = opts.failed || ((r) => r.status !== 0);
  lowerPriority(0);

  if (opts.baseline) {
    const clean = await Promise.all(harnesses.map((h) => runHarness(h, opts, {})));
    const bad = clean.findIndex(failed);
    if (bad >= 0) {
      console.log('BASELINE FAILS (' + path.basename(harnesses[bad]) + '): fix the harness or the sources first');
      console.log(clean[bad].out.trim().split('\n').slice(0, 8).join('\n'));
      process.exitCode = 2;
      return { aborted: true };
    }
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), label.replace(/[^\w-]/g, '') + '-mut-'));
  const cleanup = () => fs.rmSync(tmp, { recursive: true, force: true });
  process.once('SIGINT', () => {
    cleanup();
    process.exit(130);
  });

  // Write every mutated copy first (each in its own folder, so parallel runs never share a file).
  const results = opts.mutants.map((m, i) => {
    const text = applyEdits(opts, m);
    if (text == null) return { name: m.name, verdict: 'STALE' };
    const dir = path.join(tmp, String(i));
    fs.mkdirSync(dir);
    const outPath = path.join(dir, path.basename(m.file));
    fs.writeFileSync(outPath, text);
    const env = typeof m.env === 'function' ? m.env(outPath) : {};
    if (typeof m.env !== 'function')
      for (const k of Object.keys(m.env || {})) env[k] = m.env[k] === '<out>' ? outPath : m.env[k];
    return { name: m.name, env, runs: [] };
  });
  const stale = results.filter((r) => r.verdict === 'STALE');

  // Print each verdict as soon as every earlier one is known, so the output keeps the mutation order.
  let printed = 0;
  const flush = () => {
    while (printed < results.length && results[printed].verdict) {
      report(results[printed++], flags.verbose);
    }
  };
  const tasks = [];
  results.forEach((r) => {
    if (r.verdict) return;
    harnesses.forEach((h, hi) =>
      tasks.push(() =>
        runHarness(h, opts, r.env).then((run) => {
          r.runs[hi] = {
            harness: path.basename(h),
            hit: failed(run),
            timedOut: run.timedOut,
            fails: failLines(run.out),
            last: run.out.trim().split('\n').pop() || '',
          };
          if (r.runs.filter(Boolean).length === harnesses.length) {
            r.verdict = r.runs.some((x) => x.hit) ? 'caught' : 'MISSED';
          }
          flush();
        })
      )
    );
  });
  flush();
  await pool(tasks, workers);
  flush();
  cleanup();

  const count = (v) => results.filter((r) => r.verdict === v).length,
    caught = count('caught'),
    missed = count('MISSED');
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    label +
      ': ' +
      caught +
      '/' +
      results.length +
      ' caught' +
      (missed ? ', ' + missed + ' MISSED' : '') +
      (stale.length ? ', ' + stale.length + ' STALE' : '') +
      '  (' +
      workers +
      ' workers, ' +
      seconds +
      ' s)'
  );
  if (process.env.MUTATE_JSON) {
    const json = {
      label,
      workers,
      seconds: +seconds,
      results: results.map((r) => ({
        name: r.name,
        verdict: r.verdict,
        fails: r.runs ? r.runs.reduce((n, x) => n + x.fails.length, 0) : 0,
      })),
    };
    fs.writeFileSync(process.env.MUTATE_JSON, JSON.stringify(json, null, 1));
  }
  process.exitCode = missed || stale.length ? 1 : 0;
  return { caught, missed, stale: stale.length, results };
}

function report(r, verbose) {
  if (r.verdict === 'STALE') return console.log('STALE   ' + r.name + '  (pattern not found)');
  if (r.verdict === 'MISSED') return console.log('MISSED  ' + r.name);
  const multi = r.runs.length > 1;
  const fails = [].concat(...r.runs.map((x) => x.fails.map((f) => (multi ? x.harness + ': ' : '') + f.trim())));
  const first = r.runs.find((x) => x.hit);
  let why;
  if (first.timedOut) why = (multi ? first.harness + ': ' : '') + 'timed out';
  else if (fails.length) why = fails.length + ' FAIL: ' + fails[0];
  else why = 'exit, no FAIL line: ' + (multi ? first.harness + ': ' : '') + first.last.trim();
  console.log('caught  ' + r.name + '  (' + why.slice(0, 130) + ')');
  if (verbose) for (const f of fails.slice(1)) console.log('          ' + f.slice(0, 160));
}

module.exports = runMutations;
