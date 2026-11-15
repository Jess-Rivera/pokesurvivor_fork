// tools/smoke-run-trace.js: headless browser check for the #124 run pace trace (js/core/debug-run-trace.js). A check, not a
// harness: tools/check.js only syntax-checks it, since it needs a browser. Playwright is NOT a repo dependency (PLAYWRIGHT_DIR,
// as in tools/smoke-gym.js). Usage from the repo root:  node tools/smoke-run-trace.js
// Runs dev.html over file:// (how Jess plays). With ?dev: a run gets a start row, pace rows each minute with rising kills,
// a shop row when the first pair appears, a visit row on walking into the Move Trainer that counts a purchase, and an
// end row on quitting; #125: G.Debug.xpBoost(false) removes the opening XP doubling and its banner for the next run, and the
// start row records it. Without ?dev: no recorder attaches, G.Debug.runTrace and G.Debug.xpBoost refuse.
const path = require('path'),
  url = require('url');
const root = path.resolve(__dirname, '..');
const PW_DIRS = [
  process.env.PLAYWRIGHT_DIR,
  path.join(require('os').homedir(), 'tools', 'playwright'),
  'C:\\Users\\boric\\tools\\playwright',
]
  .filter(Boolean)
  .map((d) => path.join(d, 'node_modules', 'playwright'));
const PW = PW_DIRS.find((d) => require('fs').existsSync(d)) || PW_DIRS[0];
const { chromium } = require(PW);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const ok = (c, m) => {
  console.log((c ? 'ok    ' : 'FAIL  ') + m);
  if (!c) fail++;
};

async function open(browser, query) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [],
    notes = [];
  const FONT = /assets\/fonts\/[^ ]*\.(ttf|otf|woff2?)/i;
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => {
    if (r.url().startsWith('file:')) (FONT.test(r.url()) ? notes : errs).push('requestfailed: ' + r.url());
  });
  page.on('console', (m) => {
    if (m.type() !== 'error' || /net::ERR_/.test(m.text())) return;
    (FONT.test(m.text()) ? notes : errs).push('console: ' + m.text().slice(0, 140));
  });
  await page.goto(url.pathToFileURL(path.join(root, 'dev.html')).href + query, { waitUntil: 'load' });
  await page.waitForFunction(() => window.G && G.Game && G.DB && G.Debug, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    const t = document.getElementById('tap-start');
    if (t && !t.classList.contains('hidden')) t.click(); // headless cannot play sound: pass "press to start" first
    const s = G.DB.save;
    s.team = [{ dex: 7, shiny: false }, { dex: 1, shiny: false }, null, null, null, null];
    s.partner = 7;
    s.partnerShiny = false;
  });
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 15000 });
  await page.evaluate(() => {
    window.__keep = setInterval(() => {
      const pl = G.Game.player;
      if (pl && !pl.dead) pl.hp = pl.maxHp; // nothing ends the run mid-check
    }, 50);
  });
  return { page, errs, notes };
}

async function main() {
  const browser = await chromium.launch();

  // ---- with ?dev: the trace fills in ----
  const dev = await open(browser, '?dev');
  let page = dev.page;
  ok(
    await page.evaluate(() => typeof G.Game.runRecorder === 'function' && typeof G.Shops.recorder === 'function'),
    '?dev: both recorders are attached'
  );
  await sleep(3000); // a few seconds of real play: wild spawns, some kills
  await page.evaluate(() => G.Game.debugTime(125)); // past minute 2 and the first shop pair (2:00)
  await page.waitForFunction(() => G.Shops.list.length === 2, null, { timeout: 10000 });
  await sleep(500);
  let rows = await page.evaluate(() => G.Debug.runTrace().rows);
  const pace = rows.filter((r) => r.row === 'pace');
  ok(rows[0] && rows[0].row === 'start', 'the run opens with a start row');
  ok(
    pace.length >= 2 && pace[0].minute === 1 && pace[1].minute === 2,
    'pace rows for minutes 1 and 2 (' + pace.length + ')'
  );
  ok(
    pace.every((r, i) => i === 0 || r.kills >= pace[i - 1].kills),
    'total kills never fall from one minute to the next'
  );
  ok(
    pace.every((r) => r.killsThisMinute >= 0 && r.team === 2),
    'kills this minute are not negative; team size is 2'
  );
  const pairs = rows.filter((r) => r.row === 'shops');
  ok(pairs.length === 1 && pairs[0].t >= 120, 'one shop row, at 2:00 or later (' + pairs.length + ')');
  ok(pairs.length && pairs[0].earnedSincePair === pairs[0].earned, 'the first pair counts everything earned so far');

  // walk onto the Move Trainer, then buy one of its moves
  await page.evaluate(() => {
    const door = G.Shops.list.find((s) => s.kind === 'trainer'),
      pl = G.Game.player;
    pl.x = door.x;
    pl.y = door.y - 4;
  });
  await page.waitForFunction(() => G.Game.state === 'choice', null, { timeout: 5000 }).catch(() => {});
  rows = await page.evaluate(() => G.Debug.runTrace().rows);
  const visit = rows.find((r) => r.row === 'visit');
  ok(visit && visit.shop === 'trainer', 'entering the Move Trainer adds a visit row');
  const bought = await page.evaluate(() => {
    G.Silver.set(1e6);
    const shop = { kind: 'trainer', stock: new Map() },
      f = G.Game.player,
      id = G.Shops.offers(shop, f)[0];
    return id ? G.Shops.buy(shop, f, id) : false;
  });
  rows = await page.evaluate(() => G.Debug.runTrace().rows);
  const after = rows.find((r) => r.row === 'visit');
  ok(
    bought && after.bought === 1 && after.spent > 0,
    'a purchase counts on that visit (bought ' + (after && after.bought) + ')'
  );

  await page.evaluate(() => {
    G.UI.closeAll && G.UI.closeAll();
    G.Game.quit();
  });
  await sleep(300);
  rows = await page.evaluate(() => G.Debug.runTrace().rows);
  const end = rows[rows.length - 1];
  ok(end.row === 'end' && end.pairs === 1 && end.visits === 1, 'quitting adds an end row with 1 pair and 1 visit');
  ok((await page.evaluate(() => G.Debug.runTrace.runs.length)) === 1, 'one run kept');
  ok(rows[0].xpBoost === true, 'the start row records the XP boost as on by default');

  // ---- #125: the XP boost switch ----
  ok(
    (await page.evaluate(() => G.Spawner.xpBoostEnabled && G.Debug.xpBoost())) === true,
    'the XP boost is on by default'
  );
  ok((await page.evaluate(() => G.Debug.xpBoost(false))) === false, 'G.Debug.xpBoost(false) turns it off');
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 15000 });
  await sleep(500);
  const off = await page.evaluate(() => ({
    mul: G.Spawner.xpBoost(),
    t: G.Game.st.time,
    start: G.Debug.runTrace().rows[0],
    banner: G.Spawner.banner ? JSON.stringify(G.Spawner.banner()) || '' : '',
  }));
  ok(
    off.t < 180 && off.mul === 1,
    'switched off: a kill before 3:00 gets no boost (x' + off.mul + ' at ' + off.t.toFixed(1) + ' s)'
  );
  ok(off.start.xpBoost === false, 'the next run is traced with the boost off');
  ok(!/XP boost/.test(off.banner), 'no "XP boost" banner when it is off');
  ok(
    (await page.evaluate(() => G.Debug.xpBoost(true) && G.Spawner.xpBoost())) === 2,
    'switched back on: x2 before 3:00 again'
  );
  await page.evaluate(() => {
    G.UI.closeAll && G.UI.closeAll();
    G.Game.quit();
    clearInterval(window.__keep);
  });

  // ---- without ?dev: nothing attaches ----
  const plain = await open(browser, '');
  page = plain.page;
  await sleep(1000);
  ok(
    await page.evaluate(() => G.Game.runRecorder === null && G.Shops.recorder === null),
    'no ?dev: no recorder attached'
  );
  ok((await page.evaluate(() => G.Debug.runTrace())) === false, 'no ?dev: runTrace refuses');
  ok(
    (await page.evaluate(() => G.Debug.xpBoost(false) === false && G.Spawner.xpBoostEnabled)) === true,
    'no ?dev: xpBoost refuses and the boost stays on'
  );
  await page.evaluate(() => clearInterval(window.__keep));

  const errs = dev.errs.concat(plain.errs),
    notes = dev.notes.length + plain.notes.length;
  ok(errs.length === 0, 'no page or console errors' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  if (notes) console.log('note  known file:// font noise (not a failure): ' + notes + ' line(s)');
  await browser.close();
  console.log(fail ? 'smoke-run-trace: ' + fail + ' FAILED' : 'smoke-run-trace: all passed');
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
