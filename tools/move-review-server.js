// tools/move-review-server.js: the local helper server of the Move Review page (#141, dev tool, never ships).
// Usage: node tools/move-review-server.js [--port 8790]     then open the printed address
//        node tools/move-review-server.js --state <batch>   (internal) print one batch's review state as JSON
// It serves the repo folder (like the python server the smokes use) on 127.0.0.1 only, plus a small API:
//   GET  /api/batches                   the import batches (docs/move_rework_holding/import-batches/)
//   GET  /api/state?batch=<name>        per move: facts, MOVE-INTENT entry, batch plan, built entry, resolved def, scenarios
//   POST /api/save    {batch, id, edit} the page's edits into the batch file, then the import, the export and the validator
//   POST /api/status  {batch, id, status}  proposed, needs-ruling or signed-off (signed-off also writes batchReviewed)
//   POST /api/build   {batch, id, pattern, options}  the move built with that pattern, in memory only (writes nothing)
// Writes reach only the batch file and what tools/move_import.js and tools/export_moves.js write (and the learnsets, through
// tools/export_learnsets.js, when a whole batch is signed off or one of its moves goes back). A save that leaves the
// move invalid is undone (every written file goes back to what it was) and the problems are returned.
// Its own port keeps its own localStorage, so the arena's guest save never touches the save you play on.
const http = require('http'),
  fs = require('fs'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..');
const importer = require('./move_import.js');
const { PATTERNS, PATTERN_OPTIONS, COMMON_OPTIONS } = require('./move-import-patterns.js');
const DEFAULT_PORT = 8790;
const SCENARIOS = path.join(root, 'docs/move_rework_holding/move-intent-scenarios.json');
const INTENT = path.join(root, 'docs/MOVE-INTENT.md');
const SOURCE = path.join(root, 'docs/move_rework_holding/move-conversions-described.json');
const GENERATED = path.join(root, 'js/data/moves-generated.js');
const OVERRIDES = path.join(root, 'js/data/move-overrides.js');
// The top-level entry fields a `json` edit may replace (the shape, delivery and payload axes, and the two numbers).
const JSON_FIELDS = ['kind', 'balanceClass', 'space', 'delivery', 'hitPolicy', 'rehit', 'payload', 'power', 'accuracy'];
const TEXT_MAX = 400; // characters in a note or a cd reason
const CD_MAX = 120; // seconds; anything longer is a typing slip
const BODY_MAX = 1e6; // bytes in a request body
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.webmanifest': 'application/manifest+json',
};

// Infinity (unlimited pierce, open-ended ranges) would print as null in JSON
const finite = (key, value) => (value === Infinity ? 'Infinity' : value === -Infinity ? '-Infinity' : value);
const runNode = (args) => cp.spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 64e6 });
const batchFile = (name) => importer.listBatches().find((file) => file === name || file === name + '.json');

// ---------- the review state (run in a fresh child process, so every require reads the files as they are now) ----------
/** MOVE-INTENT.md entries by move id (the text under each `### id` heading, up to the next heading). */
function intentEntries() {
  const entries = {};
  for (const part of fs.readFileSync(INTENT, 'utf8').split(/^### /m).slice(1)) {
    const id = part.split('\n')[0].trim();
    entries[id] = part
      .slice(id.length)
      .split(/^#{2,3} /m)[0]
      .trim();
  }
  return entries;
}

/** The ids of the scenarios the move-intent harness reports as failing. */
function failingScenarios(scenarios) {
  const out = runNode([path.join(root, 'docs/proposals/move-intent-harness.js'), '.']).stdout || '';
  const failLines = out.split('\n').filter((line) => line.startsWith('FAIL'));
  return new Set(scenarios.filter((sc) => failLines.some((line) => line.includes(sc.id + ':'))).map((sc) => sc.id));
}

function reviewState(name) {
  const file = batchFile(name);
  if (!file) throw new Error('no batch ' + name);
  const batch = importer.readBatch(file);
  const { rows } = importer.buildBatch(batch);
  global.G = {};
  for (const module of ['move-attributes', 'moves-generated', 'move-overrides', 'move-handler', 'move-resolver'])
    require(path.join(root, 'js/data', module + '.js'));
  const scenarioFile = JSON.parse(fs.readFileSync(SCENARIOS, 'utf8'));
  const intents = intentEntries();
  const failing = failingScenarios(scenarioFile.scenarios);
  const moves = rows.map((row) => {
    const scenarios = scenarioFile.scenarios
      .filter((sc) => sc.move === row.id)
      .map((sc) => ({ id: sc.id, note: sc.note, source: sc.source, result: failing.has(sc.id) ? 'fail' : 'pass' }));
    return {
      ...row,
      resolved: G.MoveDefs[row.id] || null,
      override: G.MoveOverrides[row.id] || null,
      intent: intents[row.id] || null,
      scenarios,
      signedOff: scenarioFile.batchReviewed.includes(row.id),
    };
  });
  return {
    batch: { file, label: batch.label, issue: batch.issue, inPools: batch.inPools },
    patterns: PATTERNS,
    patternOptions: PATTERN_OPTIONS,
    commonOptions: COMMON_OPTIONS,
    moves,
  };
}

// ---------- writes ----------
const snapshot = (files) => files.map((file) => [file, fs.readFileSync(file)]);
const restore = (saved) => saved.forEach(([file, bytes]) => fs.writeFileSync(file, bytes));

/** The problems with an edit from the page, or [] when every field is one the page may send, in its range. */
function editProblems(edit) {
  const problems = [];
  for (const key of Object.keys(edit)) if (!importer.EDIT_FIELDS.includes(key)) problems.push('unknown field ' + key);
  if ('pattern' in edit && edit.pattern !== null && !PATTERNS[edit.pattern]) problems.push('unknown pattern');
  if ('status' in edit && !importer.STATUSES.includes(edit.status)) problems.push('unknown status');
  if ('cd' in edit && edit.cd !== null && !(Number.isFinite(edit.cd) && edit.cd > 0 && edit.cd <= CD_MAX))
    problems.push('cd must be a number of seconds above 0 and up to ' + CD_MAX);
  for (const key of ['note', 'cdWhy'])
    if (key in edit && edit[key] !== null && !(typeof edit[key] === 'string' && edit[key].length <= TEXT_MAX))
      problems.push(key + ' must be text up to ' + TEXT_MAX + ' characters');
  for (const key of ['options', 'json'])
    if (key in edit && edit[key] !== null && (typeof edit[key] !== 'object' || Array.isArray(edit[key])))
      problems.push(key + ' must be an object');
  if (edit.json)
    for (const key of Object.keys(edit.json)) if (!JSON_FIELDS.includes(key)) problems.push('json may not set ' + key);
  return problems;
}

/** batchReviewed in the scenarios file with `id` added or taken out, spliced as text so the rest keeps its layout. */
function setReviewed(id, signed) {
  let text = fs.readFileSync(SCENARIOS, 'utf8');
  const start = text.indexOf('"batchReviewed": [');
  const end = text.indexOf(']', start);
  const has = JSON.parse(text).batchReviewed.includes(id);
  const quoted = JSON.stringify(id);
  if (signed && !has) text = text.slice(0, end) + ', ' + quoted + text.slice(end);
  if (!signed && has) {
    const list = text.slice(start, end);
    const without = list.includes(', ' + quoted)
      ? list.replace(', ' + quoted, '')
      : list.replace(new RegExp(quoted + ',\\s*'), '');
    text = text.slice(0, start) + without + text.slice(end);
  }
  if (JSON.parse(text).batchReviewed.includes(id) !== signed) throw new Error('could not update batchReviewed');
  fs.writeFileSync(SCENARIOS, text);
}

// A pattern keeps only the effects the game has; a move whose every effect is still unbuilt (Taunt's taunt status) gets none
const NO_EFFECTS =
  'this pattern gives the move no effects: its mainline effect is not in the game yet (a #141 part D status or rule). ' +
  'Leave it waiting for its ruling, or give it a placeholder effect in the options (push: knockback px, or power)';

/** Problems the resolved-move validator reports for one move ([] when it is valid), an empty payload in plain words. */
function validatorProblems(id) {
  const out = runNode([path.join(__dirname, 'validate_moves.js'), '--resolved']).stdout || '';
  return out
    .split('\n')
    .filter((line) => line.startsWith('INVALID ' + id + ' '))
    .map((line) => (/payload: needs at least 1/.test(line) ? id + ': ' + NO_EFFECTS : line));
}

function save({ batch: name, id, edit }) {
  const file = batchFile(name || '');
  if (!file) return { status: 400, body: { problems: ['no batch ' + name] } };
  const batch = importer.readBatch(file);
  if (!batch.moves[id]) return { status: 400, body: { problems: ['no move ' + id + ' in ' + file] } };
  const problems = editProblems(edit || {});
  if (edit && edit.pattern === null && batch.moves[id].pattern)
    problems.push('a move with a pattern cannot go back to waiting for its ruling (pick another pattern instead)');
  if (problems.length) return { status: 400, body: { problems } };
  const saved = snapshot([importer.batchPathOf(file), SOURCE, GENERATED, OVERRIDES, SCENARIOS]);
  const plan = batch.moves[id];
  for (const [key, value] of Object.entries(edit)) {
    if (value === null) delete plan[key];
    else plan[key] = value;
  }
  const shapeChanged = Object.keys(edit).some((key) => !['note', 'status'].includes(key));
  if (shapeChanged && plan.status === 'signed-off') plan.status = 'proposed'; // a changed move needs a fresh sign-off
  importer.writeBatch(file, batch);
  const steps = [[path.join(__dirname, 'move_import.js'), file, '--apply'], [path.join(__dirname, 'export_moves.js')]];
  for (const args of steps) {
    const run = runNode(args);
    if (run.status !== 0) {
      restore(saved);
      return { status: 500, body: { problems: [(run.stderr || run.stdout || 'step failed').trim()] } };
    }
  }
  const invalid = plan.pattern ? validatorProblems(id) : [];
  if (invalid.length) {
    restore(saved);
    return { status: 422, body: { problems: invalid } };
  }
  if (plan.status !== 'signed-off') setReviewed(id, false);
  return { status: 200, body: { saved: true, status: plan.status } };
}

/** The move built with another pattern or other options, for the page to show before a Save. Nothing is written. Hand edits
 *  stay on top only while the pattern stays the same (a Save of a new pattern drops them too). */
function buildPreview({ batch: name, id, pattern, options }) {
  const file = batchFile(name || '');
  if (!file) return { status: 400, body: { problems: ['no batch ' + name] } };
  const batch = importer.readBatch(file);
  const plan = batch.moves[id];
  if (!plan) return { status: 400, body: { problems: ['no move ' + id] } };
  if (!PATTERNS[pattern]) return { status: 400, body: { problems: ['unknown pattern ' + pattern] } };
  if (options != null && (typeof options !== 'object' || Array.isArray(options)))
    return { status: 400, body: { problems: ['options must be an object'] } };
  const trial = { ...plan, pattern, options: options || {} };
  if (pattern !== plan.pattern) delete trial.json;
  batch.moves[id] = trial;
  const row = importer.buildBatch(batch).rows.find((built) => built.id === id);
  const problems = row.built && !row.built.payload.length ? [id + ': ' + NO_EFFECTS] : [];
  return { status: 200, body: { built: row.built, words: row.words, problems } };
}

function setStatus({ batch: name, id, status }) {
  const file = batchFile(name || '');
  if (!file) return { status: 400, body: { problems: ['no batch ' + name] } };
  const batch = importer.readBatch(file);
  if (!batch.moves[id]) return { status: 400, body: { problems: ['no move ' + id] } };
  if (!importer.STATUSES.includes(status)) return { status: 400, body: { problems: ['unknown status ' + status] } };
  if (status === 'signed-off' && !batch.moves[id].pattern)
    return { status: 400, body: { problems: ['a move waiting for its ruling cannot be signed off'] } };
  batch.moves[id].status = status;
  // A batch joins the learnsets when every move in it is signed off, and leaves them if one goes back (Jess 2026-11-27,
  // decision 2026-11-27-141-round-r-rulings-for-the-evolution-moves). Only a change of that state rebakes them.
  const inPools = Object.values(batch.moves).every((plan) => plan.status === 'signed-off');
  const poolsChanged = inPools !== (batch.inPools !== false);
  batch.inPools = inPools;
  importer.writeBatch(file, batch);
  setReviewed(id, status === 'signed-off');
  if (poolsChanged) {
    const bake = runNode([path.join(__dirname, 'export_learnsets.js')]);
    if (bake.status !== 0) return { status: 500, body: { problems: [(bake.stderr || 'learnset bake failed').trim()] } };
  }
  return { status: 200, body: { status, inPools } };
}

// ---------- http ----------
function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type.startsWith('application/json') ? JSON.stringify(body, finite) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > BODY_MAX) reject(new Error('request too large'));
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function serveFile(res, urlPath) {
  const file = path.join(root, decodeURIComponent(urlPath));
  if (!file.startsWith(root + path.sep)) return send(res, 403, 'outside the repo', 'text/plain');
  fs.readFile(file, (error, bytes) => {
    if (error) return send(res, 404, 'not found', 'text/plain');
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(bytes);
  });
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/') {
    res.writeHead(302, { Location: '/tools/move-review.html' });
    return res.end();
  }
  if (!url.pathname.startsWith('/api/')) return serveFile(res, url.pathname);
  try {
    if (req.method === 'GET' && url.pathname === '/api/batches')
      return send(
        res,
        200,
        importer.listBatches().map((file) => {
          const batch = importer.readBatch(file);
          return { file, label: batch.label, count: Object.keys(batch.moves).length };
        })
      );
    if (req.method === 'GET' && url.pathname === '/api/state') {
      const run = runNode([__filename, '--state', url.searchParams.get('batch') || '']);
      if (run.status !== 0) return send(res, 500, { problems: [(run.stderr || '').trim()] });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(run.stdout);
    }
    if (req.method === 'POST' && url.pathname === '/api/save') {
      const result = save(await readBody(req));
      return send(res, result.status, result.body);
    }
    if (req.method === 'POST' && url.pathname === '/api/build') {
      const result = buildPreview(await readBody(req));
      return send(res, result.status, result.body);
    }
    if (req.method === 'POST' && url.pathname === '/api/status') {
      const result = setStatus(await readBody(req));
      return send(res, result.status, result.body);
    }
    send(res, 404, { problems: ['no such api'] });
  } catch (error) {
    send(res, 500, { problems: [error.message] });
  }
}

const args = process.argv.slice(2);
if (args[0] === '--state') {
  process.stdout.write(JSON.stringify(reviewState(args[1]), finite));
} else {
  const portAt = args.indexOf('--port');
  const port = portAt >= 0 ? +args[portAt + 1] : DEFAULT_PORT;
  http.createServer(handle).listen(port, '127.0.0.1', () => {
    console.log('Move Review: http://127.0.0.1:' + port + '/tools/move-review.html');
    console.log('Ctrl+C stops it. Writes go to the batch files and what the importer and the export write.');
  });
}
