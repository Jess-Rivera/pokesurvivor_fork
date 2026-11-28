// tools/smoke-move-review.js: the Move Review page (#141 end-goal test), headless. Usage: node tools/smoke-move-review.js [batch]
// It copies the code and move data into a temp folder (assets linked, not copied), starts tools/move-review-server.js from
// there and drives tools/move-review.html, so every Save and sign-off writes into the copy and the repo is never touched.
// Checks, as relations (docs/TEST-FIRST.md), never numbers copied from the code:
//   every move of the batch is listed with a review state;
//   each move with a catalog entry casts in the embedded arena with no page error, and a move with a damage payload hurts the
//   dummy; a move waiting for its ruling shows no arena;
//   a shape number changed and saved on the page is the number the arena's resolved def holds after its reload;
//   Sign off puts the move in batchReviewed and Back to proposed takes it out;
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
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
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

    // 3. Save a shape number and see it in the arena
    const target = ids.find((id) => batch.moves[id].pattern);
    await page.click(`#moves .move-row[data-id="${target}"]`);
    await waitFor(async () => (await page.textContent('#arena-status')).trim() === 'ready', 60000, 'arena before save');
    const field = page.locator('#fields input[data-number]').first();
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
