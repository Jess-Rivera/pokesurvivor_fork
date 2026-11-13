// tools/smoke-pause.js: headless browser check for #54, the ?dev quiet pause (G.Debug.quietPause). A check, not a harness:
// tools/check.js only syntax-checks it, since it needs a browser. Playwright is NOT a repo dependency (PLAYWRIGHT_DIR, as in
// tools/smoke-gym.js). Usage from the repo root:  node tools/smoke-pause.js
// Runs dev.html?dev over file:// (how Jess plays), starts a run, then presses the real Escape key:
//   toggle off: Escape pauses with the pause menu open and the run clock stopped; Escape again closes it and the clock runs;
//   toggle on:  Escape pauses with no screen open and the clock stopped; Escape again resumes play, still no screen.
// Fails on any page error, console error or failed local request (file:// font noise is a note, as in smoke-gym.js).
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

async function main() {
  const browser = await chromium.launch();
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
  await page.goto(url.pathToFileURL(path.join(root, 'dev.html')).href + '?dev', { waitUntil: 'load' });
  await page.waitForFunction(() => window.G && G.Game && G.DB && G.Debug, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    const t = document.getElementById('tap-start');
    if (t && !t.classList.contains('hidden')) t.click(); // headless cannot play sound: pass "press to start" first
    const s = G.DB.save;
    s.team = [{ dex: 7, shiny: false }, null, null, null, null, null];
    s.partner = 7;
    s.partnerShiny = false;
  });
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 15000 });
  await page.evaluate(() => {
    G.Spawner.update = () => {}; // test page only: no wild spawns
    G.EnemyMgr.clear();
    window.__keep = setInterval(() => {
      const pl = G.Game.player;
      if (pl && !pl.dead) pl.hp = pl.maxHp; // nothing ends the run mid-check
    }, 50);
  });

  const escape = async () => {
    await page.keyboard.down('Escape');
    await sleep(80);
    await page.keyboard.up('Escape');
    await sleep(900); // the Poke Ball menu's opening or closing (#88, about 0.7 s) has finished
  };
  const look = () =>
    page.evaluate(() => ({
      state: G.Game.state,
      time: G.Log.t,
      menu: G.PauseMenu.isOpen(), // the solo pause menu (#88; scr-pause is co-op only now)
      anyScreen: [...document.querySelectorAll('.scr')].some((s) => !s.classList.contains('hidden')),
    }));
  const clockMoves = async () => {
    const a = (await look()).time;
    await sleep(400);
    return (await look()).time > a;
  };

  // ---- toggle off: the normal pause menu ----
  ok((await page.evaluate(() => G.Debug.quietPauseActive())) === false, 'off by default');
  await escape();
  let s = await look();
  ok(s.state === 'paused' && s.menu, 'off: Escape pauses and opens the pause menu (state ' + s.state + ')');
  ok(!(await clockMoves()), 'off: the run clock is stopped while paused');
  await escape();
  s = await look();
  ok(s.state === 'playing' && !s.menu, 'off: Escape again closes the menu and resumes (state ' + s.state + ')');
  ok(await clockMoves(), 'off: the run clock runs again');

  // ---- toggle on: quiet pause ----
  ok((await page.evaluate(() => G.Debug.quietPause())) === true, 'quietPause() with no argument turns it on');
  await escape();
  s = await look();
  ok(s.state === 'paused' && !s.menu && !s.anyScreen, 'on: Escape pauses with no screen open (state ' + s.state + ')');
  ok(!(await clockMoves()), 'on: the run clock is stopped while paused');
  await escape();
  s = await look();
  ok(s.state === 'playing' && !s.anyScreen, 'on: Escape again resumes, still no screen (state ' + s.state + ')');
  ok(await clockMoves(), 'on: the run clock runs again');

  // ---- set it off again explicitly ----
  ok((await page.evaluate(() => G.Debug.quietPause(false))) === false, 'quietPause(false) turns it off');
  await escape();
  s = await look();
  ok(s.state === 'paused' && s.menu, 'off again: Escape opens the pause menu');

  await page.evaluate(() => clearInterval(window.__keep));
  ok(errs.length === 0, 'no page or console errors' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  if (notes.length) console.log('note  known file:// font noise (not a failure): ' + notes.length + ' line(s)');
  await browser.close();
  console.log(fail ? 'smoke-pause: ' + fail + ' FAILED' : 'smoke-pause: all passed');
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
