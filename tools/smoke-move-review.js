// tools/smoke-move-review.js: the Move Review page (#141 end-goal test), headless. Usage: node tools/smoke-move-review.js [batch]
// It copies the code and move data into a temp folder (assets linked, not copied), starts tools/move-review-server.js from
// there and drives tools/move-review.html, so every Save and sign-off writes into the copy and the repo is never touched.
// Checks, as relations (docs/TEST-FIRST.md), never numbers copied from the code:
//   every move of the batch is listed with a review state;
//   each move with a catalog entry casts in the embedded arena with no page error, and a move with a damage payload hurts the
//   dummy; a move waiting for its ruling shows no arena;
//   a shape number changed and saved on the page is the number the arena's resolved def holds after its reload;
//   Sign off puts the move in batchReviewed and Back to proposed takes it out;
//   a move with a pattern offers no "none" pattern, and the server refuses a save that clears it;
//   a field the grammar gives fixed values is a dropdown of exactly those values;
//   a number typed outside its grammar range is marked and Save refuses it (the batch file stays as it was);
//   a number typed and not saved is the number the arena's def holds (live preview), and the batch file stays as it was;
//   Copy batch as JSON puts the batch file's own content on the clipboard;
//   the repo's own move files are byte-for-byte what they were before the run.
const path = require('path'),
  fs = require('fs'),
  os = require('os'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..');
const BATCH = process.argv[2] || '141-evolution-moves';
const PW_DIRS = [
  process.env.PLAYWRIGHT_DIR,
  path.join(os.homedir(), 'tools', 'playwright'),
  'C:\\Users\\boric\\tools\\playwright',
]
  .filter(Boolean)
  .map((dir) => path.join(dir, 'node_modules', 'playwright'));
const PW = PW_DIRS.find((dir) => fs.existsSync(dir)) || PW_DIRS[0];
const { chromium } = require(PW);
const PORT = 8800 + Math.floor(Math.random() * 150);
const CAST_MARGIN_MS = 1500; // past the move's own cooldown, so it has cast at least once

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let fail = 0;
const ok = (condition, message) => {
  console.log((condition ? 'ok    ' : 'FAIL  ') + message);
  if (!condition) fail++;
};

// ---- the temp copy ----
const COPY = [
  'js',
  'css',
  'dev.html',
  'favicon.ico',
  'manifest.webmanifest',
  'sw.js',
  'docs/MOVE-INTENT.md',
  'docs/move_rework_holding',
  'docs/proposals',
];
const LINK = ['assets', 'node_modules'];
const WATCHED = [
  'docs/move_rework_holding/move-conversions-described.json',
  'js/data/moves-generated.js',
  'js/data/move-overrides.js',
  'docs/move_rework_holding/move-intent-scenarios.json',
  'docs/move_rework_holding/import-batches/' + BATCH + '.json',
];
const fingerprint = () => WATCHED.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\u0000');

function makeCopy() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'move-review-smoke-'));
  for (const item of COPY) fs.cpSync(path.join(root, item), path.join(dir, item), { recursive: true });
  fs.mkdirSync(path.join(dir, 'tools'));
  for (const file of fs.readdirSync(path.join(root, 'tools')))
    if (/\.(js|html)$/.test(file)) fs.copyFileSync(path.join(root, 'tools', file), path.join(dir, 'tools', file));
  for (const item of LINK) fs.symlinkSync(path.join(root, item), path.join(dir, item), 'junction');
  return dir;
}
function removeCopy(dir) {
  for (const item of LINK) fs.rmdirSync(path.join(dir, item)); // the junction only, never what it points at
  fs.rmSync(dir, { recursive: true, force: true });
}

async function waitFor(check, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return true;
    await sleep(150);
  }
  console.log('      (timed out waiting for ' + label + ')');
  return false;
}

async function main() {
  const before = fingerprint();
  const copy = makeCopy();
  const server = cp.spawn(
    process.execPath,
    [path.join(copy, 'tools', 'move-review-server.js'), '--port', String(PORT)],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  let serverLog = '';
  server.stdout.on('data', (chunk) => (serverLog += chunk));
  server.stderr.on('data', (chunk) => (serverLog += chunk));
  const browser = await chromium.launch();
  try {
    await waitFor(() => serverLog.includes('http://'), 10000, 'the server');
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://127.0.0.1:${PORT}` });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push('pageerror: ' + error.message));
    await page.goto(`http://127.0.0.1:${PORT}/tools/move-review.html?batch=${BATCH}`, { waitUntil: 'load' });
    const batch = JSON.parse(
      fs.readFileSync(path.join(copy, 'docs/move_rework_holding/import-batches', BATCH + '.json'))
    );
    const ids = Object.keys(batch.moves);
    await waitFor(async () => (await page.locator('#moves .move-row').count()) === ids.length, 20000, 'the move list');

    // 1. the list
    const listed = await page.$$eval('#moves .move-row', (rows) =>
      rows.map((row) => ({ id: row.dataset.id, state: row.querySelector('.state').textContent.trim() }))
    );
    ok(
      ids.every((id) => listed.some((row) => row.id === id)),
      'every batch move is listed (' + listed.length + ')'
    );
    ok(
      listed.every((row) => row.state.length > 0),
      'every move shows a review state'
    );

    // 2. each move in the arena
    for (const id of ids) {
      await page.click(`#moves .move-row[data-id="${id}"]`);
      const plan = batch.moves[id];
      if (!plan.pattern) {
        const shown = await page.textContent('#arena-status');
        ok(/ruling/i.test(shown), id + ': waits for its ruling, no arena (' + shown.trim() + ')');
        continue;
      }
      const ready = await waitFor(async () => (await page.textContent('#arena-status')).trim() === 'ready', 60000, id);
      const cooldown = await page.evaluate((moveId) => window.MoveReview.arena().G.MoveDefs[moveId].cd || 0, id);
      await sleep(cooldown * 1000 + CAST_MARGIN_MS);
      const readout = await page.evaluate(() => ({
        damage: +document.querySelector('#readout').dataset.damage,
        arenaErrors: document.querySelector('#readout').dataset.errors || '',
      }));
      const damaging = await page.evaluate(
        (moveId) =>
          window.MoveReview.arena().G.MoveDefs[moveId].payload.some(function hasDamage(fx) {
            return fx.t === 'damage' || (fx.t === 'emit' && fx.move.payload.some(hasDamage));
          }),
        id
      );
      ok(ready && !readout.arenaErrors, id + ': casts in the arena with no error ' + readout.arenaErrors);
      if (damaging) ok(readout.damage > 0, id + ': its damage lands on the dummy (' + readout.damage + ')');
    }

    const target = ids.find((id) => batch.moves[id].pattern);
    const batchPath = path.join(copy, 'docs/move_rework_holding/import-batches', BATCH + '.json');
    const batchText = () => fs.readFileSync(batchPath, 'utf8');
    const arenaValue = (moveId, dotted) =>
      page.evaluate(
        ([id, at]) => at.split('.').reduce((value, key) => value[key], window.MoveReview.arena().G.MoveDefs[id]),
        [moveId, dotted]
      );
    await page.click(`#moves .move-row[data-id="${target}"]`);
    await waitFor(async () => (await page.textContent('#arena-status')).trim() === 'ready', 60000, 'arena before save');

    // 3a. the pattern cannot be wiped
    const patternValues = await page.$$eval('#pattern option', (options) => options.map((option) => option.value));
    ok(!patternValues.includes(''), target + ': its pattern dropdown offers no "none"');
    const beforeWipe = batchText();
    const wipe = await page.evaluate(
      async ([batchName, id]) =>
        (
          await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch: batchName, id, edit: { pattern: null } }),
          })
        ).status,
      [BATCH + '.json', target]
    );
    ok(wipe === 400 && batchText() === beforeWipe, 'the server refuses to clear a pattern (' + wipe + ')');

    // 3b. dropdowns hold the grammar's values
    global.G = {};
    require(path.join(copy, 'js/data/move-attributes.js'));
    const shapeSelect = page.locator('#fields select[data-path$=".shape"]').first();
    const shapeChoices = (await shapeSelect.count())
      ? await shapeSelect.locator('option').evaluateAll((options) => options.map((option) => option.value))
      : [];
    ok(
      JSON.stringify(shapeChoices) === JSON.stringify(G.MoveAttrs.MOVE.f.space.f.shape.v),
      'the shape field is a dropdown of the grammar values (' + shapeChoices.join(', ') + ')'
    );

    // 3c. a number past its range is refused
    const arcField = page.locator('#fields input[data-path$="radArc"]').first();
    if (await arcField.count()) {
      const beforeRange = batchText();
      await arcField.fill(String(G.MoveAttrs.MOVE.f.space.f.radArc.max + 1));
      const marked = await arcField.evaluate((input) => input.classList.contains('invalid'));
      await page.click('#save');
      await sleep(500);
      ok(marked, 'radArc past its max is marked invalid');
      ok(
        /not saved/.test(await page.textContent('#save-status')) && batchText() === beforeRange,
        'Save refuses it and the batch file stays as it was'
      );
      await arcField.fill(await arcField.getAttribute('data-was'));
    } else ok(false, target + ' has no radArc field to range-check');

    // 3d. live preview: typed, not saved, already in the arena
    const previewField = page.locator('#fields input[data-number]:not([max])').first();
    const previewPath = await previewField.getAttribute('data-path');
    const previewValue = +(await previewField.inputValue()) + 3;
    const beforePreview = batchText();
    await previewField.fill(String(previewValue));
    await waitFor(async () => (await arenaValue(target, previewPath)) === previewValue, 10000, 'the preview');
    ok(
      (await arenaValue(target, previewPath)) === previewValue && batchText() === beforePreview,
      `preview: ${previewPath} is ${previewValue} in the arena before any Save, batch file untouched`
    );
    await previewField.fill(await previewField.getAttribute('data-was'));

    // 3d2. a new pattern shows its own numbers and plays in the arena before any Save
    const savedPattern = batch.moves[target].pattern;
    const otherPattern = savedPattern === 'melee' ? 'shot' : 'melee';
    const pathsShown = () => page.$$eval('#fields [data-path]', (fields) => fields.map((field) => field.dataset.path));
    const pathsBefore = await pathsShown();
    const beforeSwitch = batchText();
    await page.selectOption('#pattern', otherPattern);
    await waitFor(async () => /preview/.test(await page.textContent('#save-status')), 20000, 'the pattern preview');
    const pathsAfter = await pathsShown();
    ok(
      JSON.stringify(pathsAfter) !== JSON.stringify(pathsBefore) &&
        /not saved/.test(await page.textContent('#proposal')),
      `pattern ${savedPattern} to ${otherPattern}: the shape fields and the proposal follow it, marked not saved`
    );
    const arenaHasTopShape = () => page.evaluate((id) => !!window.MoveReview.arena().G.MoveDefs[id].space, target);
    ok(
      (await arenaHasTopShape()) === pathsAfter.some((dotted) => dotted.startsWith('space.')) &&
        batchText() === beforeSwitch,
      'the arena plays the new pattern and the batch file stays as it was'
    );
    await page.selectOption('#pattern', savedPattern);
    await waitFor(
      async () => JSON.stringify(await pathsShown()) === JSON.stringify(pathsBefore),
      20000,
      'the saved pattern back'
    );
    ok(
      JSON.stringify(await pathsShown()) === JSON.stringify(pathsBefore),
      'picking the saved pattern again shows its fields'
    );

    // 3e. Copy batch as JSON
    await page.click('#copy-json');
    await waitFor(async () => /copied/.test(await page.textContent('#copy-status')), 5000, 'the copy');
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    const sameLines = (text) => text.replace(/\r\n/g, '\n'); // the Windows clipboard may turn line ends into CRLF
    ok(
      sameLines(clipboard) === sameLines(batchText()),
      'Copy batch as JSON puts the batch file on the clipboard (' + clipboard.length + ' characters)'
    );

    // 3. Save a shape number and see it in the arena
    const field = page.locator('#fields input[data-number]:not([max])').first();
    const fieldPath = await field.getAttribute('data-path');
    const wanted = +(await field.inputValue()) + 7;
    await field.fill(String(wanted));
    await page.click('#save');
    await waitFor(async () => /saved/.test(await page.textContent('#save-status')), 60000, 'the save');
    await waitFor(async () => (await page.textContent('#arena-status')).trim() === 'ready', 60000, 'arena after save');
    const live = await page.evaluate(
      ([moveId, dotted]) =>
        dotted.split('.').reduce((value, key) => value[key], window.MoveReview.arena().G.MoveDefs[moveId]),
      [target, fieldPath]
    );
    ok(live === wanted, `Save: ${target} ${fieldPath} is ${live} in the arena (entered ${wanted})`);

    // 4. sign off and back
    const reviewed = () =>
      JSON.parse(fs.readFileSync(path.join(copy, 'docs/move_rework_holding/move-intent-scenarios.json'))).batchReviewed;
    await page.click('#sign-off');
    await waitFor(async () => reviewed().includes(target), 20000, 'the sign-off');
    ok(reviewed().includes(target), 'Sign off puts ' + target + ' in batchReviewed');
    await page.click('#to-proposed');
    await waitFor(async () => !reviewed().includes(target), 20000, 'back to proposed');
    ok(!reviewed().includes(target), 'Back to proposed takes it out again');

    ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally {
    await browser.close();
    server.kill();
    await sleep(300);
    removeCopy(copy);
  }
  ok(fingerprint() === before, "the repo's own move files are unchanged");
  console.log(fail ? `smoke-move-review: ${fail} FAILED` : 'smoke-move-review: all passed');
  process.exit(fail ? 1 : 0);
}

main().catch((error) => {
  console.log('FAIL  ' + error.stack);
  process.exit(1);
});
