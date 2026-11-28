// tools/move_import.js: a move import batch (#141) -> catalog proposals. A batch is one JSON file in
// docs/move_rework_holding/import-batches/: per move its shape pattern and options (the patterns of tools/move-import-patterns.js),
// the facts pokeapi leaves out (Gen 9 rows have no effect data), and the edits saved from the Move Review page
// (tools/move-review.html): `json` replaces those top-level fields of the built entry, `cd` and `cdWhy` become a row in
// js/data/move-overrides.js, `status` and `note` are the review's own. A move whose pattern is null waits for its ruling: the
// page shows its facts, and it stays out of the catalog (an apply takes it back out) until a pattern is set.
// Usage: node tools/move_import.js                    list the batches and their moves
//        node tools/move_import.js <batch> --apply    write the batch into move-conversions-described.json and its cd rows into
//                                                     move-overrides.js (then run node tools/export_moves.js)
//        node tools/move_import.js --check            exit 1 if any batch differs from the source json or the overrides (check.js)
// The cd rows of a batch live between its two marker comments in move-overrides.js; the whole region is rewritten on each apply.
// A batch with "inPools": false keeps its moves out of every learnset (tools/export_learnsets.js reads heldIds), so no Pokemon
// learns them until the batch is signed off.
const fs = require('fs'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..');
const { entry, applyToSource, loadApi, SRC } = require('./move-import-patterns.js');
const BATCH_DIR = path.join(root, 'docs/move_rework_holding/import-batches');
const OVERRIDES = path.join(root, 'js/data/move-overrides.js');
// What a pokeapi row without effect data (meta null) reads as: no ailment, flinch, crit, drain, healing or stat chance.
const NO_META = {
  category: 'damage',
  ailment: 'none',
  ailment_chance: 0,
  flinch_chance: 0,
  crit_rate: 0,
  drain: 0,
  healing: 0,
  stat_chance: 0,
};
// The edit fields the review page may save (the helper server refuses any other).
const EDIT_FIELDS = ['pattern', 'options', 'json', 'cd', 'cdWhy', 'status', 'note'];
const STATUSES = ['proposed', 'needs-ruling', 'signed-off'];

const batchPath = (name) => path.join(BATCH_DIR, name.endsWith('.json') ? name : name + '.json');
const listBatches = () =>
  fs.existsSync(BATCH_DIR) ? fs.readdirSync(BATCH_DIR).filter((file) => file.endsWith('.json')) : [];
const readBatch = (name) => JSON.parse(fs.readFileSync(batchPath(name), 'utf8'));
const writeBatch = (name, batch) => fs.writeFileSync(batchPath(name), JSON.stringify(batch, null, 2) + '\n');

/** The pokeapi row of `id` with the batch's `facts` laid over it: power and accuracy replace the source's, meta is merged
 *  over the empty meta a Gen 9 row lacks, effect is the mainline text the card shows. */
function factsOf(api, id, facts = {}) {
  const row = api[id];
  if (!row) throw new Error('no pokeapi entry for ' + id);
  const patched = {
    ...row,
    source: { ...row.source },
    meta: { ...NO_META, ...(row.meta || {}), ...(facts.meta || {}) },
  };
  if ('power' in facts) patched.source.power = facts.power;
  if ('accuracy' in facts) patched.source.accuracy = facts.accuracy;
  return patched;
}

/** Every move of a batch built: { label, moves: id -> catalog entry, rows: what the review page shows per move }. */
function buildBatch(batch) {
  const api = loadApi(),
    patched = {},
    moves = {},
    rows = [];
  for (const [id, plan] of Object.entries(batch.moves)) patched[id] = factsOf(api, id, plan.facts);
  for (const [id, plan] of Object.entries(batch.moves)) {
    const built = plan.pattern ? entry(patched, id, plan.pattern, { ...(plan.options || {}) }, batch.label) : null;
    if (built) moves[id] = Object.assign(built.e, plan.json || {});
    const facts = patched[id];
    rows.push({
      id,
      name: facts.name,
      type: facts.type,
      category: facts.damage_class,
      power: facts.source.power,
      pp: facts.source.pp,
      accuracy: facts.source.accuracy,
      priority: facts.source.priority,
      target: facts.target,
      effect: (plan.facts && plan.facts.effect) || (facts.effect ? facts.effect.short_effect : ''),
      factsWhy: (plan.facts && plan.facts.why) || '',
      plan,
      words: built ? built.w : null,
      built: built ? built.e : null,
    });
  }
  return { label: batch.label, moves, rows };
}

/** The marker comments around a batch's cd rows in move-overrides.js. */
const markers = (name) => [
  `    // @@IMPORT ${name} BEGIN (written by tools/move_import.js from its batch file; edit the batch, not these rows)`,
  `    // @@IMPORT ${name} END`,
];

/** move-overrides.js with this batch's cd rows (its region) replaced or added before the closing brace. */
function overridesWith(name, batch, text) {
  const [begin, end] = markers(name);
  const rows = Object.entries(batch.moves)
    .filter(([, plan]) => plan.cd != null)
    .map(
      ([id, plan]) =>
        `    ${JSON.stringify(id)}: { cd: ${plan.cd}, why: ${JSON.stringify(plan.cdWhy || 'move import')} },`
    );
  const region = [begin, ...rows, end].join('\n');
  const start = text.indexOf(begin),
    stop = text.indexOf(end);
  if (start >= 0 && stop > start) return text.slice(0, start) + region + text.slice(stop + end.length);
  const close = text.lastIndexOf('\n  };');
  if (close < 0) throw new Error('cannot find the end of G.MoveOverrides in ' + OVERRIDES);
  return text.slice(0, close) + '\n' + region + text.slice(close);
}

/** Takes the moves in `ids` out of the source json (a move waiting for its ruling). Spliced as text like applyToSource. */
function removeFromSource(ids) {
  const raw = fs.readFileSync(SRC, 'utf8'),
    crlf = raw.includes('\r\n');
  let text = raw.replace(/\r\n/g, '\n');
  for (const id of ids) text = text.replace(new RegExp(',\\n    "' + id + '": \\{[\\s\\S]*?\\n    \\}'), '');
  JSON.parse(text); // parse check before writing
  fs.writeFileSync(SRC, crlf ? text.replace(/\n/g, '\r\n') : text);
}

/** Writes a batch's moves into the source json and its cd rows into move-overrides.js (prettier-formatted afterwards). */
function applyBatch(name) {
  const batch = readBatch(name);
  const { moves } = buildBatch(batch);
  removeFromSource(Object.keys(batch.moves).filter((id) => !moves[id]));
  const count = applyToSource(moves);
  const raw = fs.readFileSync(OVERRIDES, 'utf8'),
    crlf = raw.includes('\r\n');
  const next = overridesWith(name.replace(/\.json$/, ''), batch, raw.replace(/\r\n/g, '\n'));
  fs.writeFileSync(OVERRIDES, crlf ? next.replace(/\n/g, '\r\n') : next);
  const prettier = path.join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
  if (fs.existsSync(prettier)) cp.execFileSync(process.execPath, [prettier, '--write', OVERRIDES], { stdio: 'ignore' });
  return count;
}

/** The ids of every batch whose moves stay out of the learnsets ("inPools": false). */
function heldIds() {
  const held = new Set();
  for (const file of listBatches()) {
    const batch = readBatch(file);
    if (batch.inPools === false) for (const id of Object.keys(batch.moves)) held.add(id);
  }
  return held;
}

/** Differences between every batch and what is written: the source json entry and the cd in move-overrides.js. */
function checkAll() {
  const source = JSON.parse(fs.readFileSync(SRC, 'utf8')).moves;
  global.G = global.G || {};
  delete require.cache[require.resolve(OVERRIDES)];
  require(OVERRIDES);
  const overrides = G.MoveOverrides,
    problems = [];
  for (const file of listBatches()) {
    const batch = readBatch(file);
    const { moves } = buildBatch(batch);
    for (const id of Object.keys(batch.moves)) {
      const built = moves[id];
      if (JSON.stringify(source[id]) !== JSON.stringify(built))
        problems.push(`${file} ${id}: the source json differs from the batch (run the apply)`);
      const want = batch.moves[id].cd,
        have = overrides[id] ? overrides[id].cd : undefined;
      if (want != null ? have !== want : have !== undefined)
        problems.push(`${file} ${id}: move-overrides.js cd ${have} but the batch says ${want}`);
    }
  }
  return problems;
}

module.exports = {
  BATCH_DIR,
  batchPathOf: batchPath,
  EDIT_FIELDS,
  STATUSES,
  listBatches,
  readBatch,
  writeBatch,
  buildBatch,
  applyBatch,
  heldIds,
  checkAll,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--check')) {
    const problems = checkAll();
    for (const line of problems) console.log(line);
    console.log(
      problems.length
        ? 'move import: ' + problems.length + ' difference(s)'
        : 'move import batches are current (' + listBatches().length + ')'
    );
    process.exit(problems.length ? 1 : 0);
  }
  const name = args.find((arg) => !arg.startsWith('--'));
  if (!name) {
    for (const file of listBatches()) console.log(file + ': ' + Object.keys(readBatch(file).moves).join(', '));
    process.exit(0);
  }
  if (args.includes('--apply')) {
    const count = applyBatch(name);
    console.log('applied ' + name + ' (' + count + ' moves in the source); now run node tools/export_moves.js');
  } else {
    for (const row of buildBatch(readBatch(name)).rows)
      console.log(row.id + ': ' + (row.words ? row.words.shape : 'waits for its ruling (no pattern)'));
  }
}
