// tools/smoke-pause-menu.js: headless browser check for the Poke Ball pause menu (#82, slice 1 #88; spec docs/PAUSE-MENU.md).
// A check, not a harness: tools/check.js only syntax-checks it, since it needs a browser. Playwright is NOT a repo
// dependency (PLAYWRIGHT_DIR, as in tools/smoke-gym.js). Usage from the repo root:
//   node tools/smoke-pause-menu.js [folder for screenshots]
// Runs dev.html?dev over file:// (how Jess plays), starts a solo run and presses real keys and clicks:
//   pause stops the run clock; the opening steps play in order; circle, ball, three buttons and four panels show;
//   the HUD overlay steps aside; Up / Down and hover move the green focus; Esc closes with the clock still stopped
//   until the menu is gone; Esc mid-close turns it around; Resume resumes; Settings opens over the menu and Esc
//   returns to it; End Run asks (No white and default, End red), Enter keeps playing, End ends the run.
// Fails on any page error, console error or failed local request (file:// font noise is a note, as in smoke-gym.js).
const path = require('path'),
  url = require('url'),
  fs = require('fs');
const root = path.resolve(__dirname, '..');
const PW_DIRS = [
  process.env.PLAYWRIGHT_DIR,
  path.join(require('os').homedir(), 'tools', 'playwright'),
  'C:\\Users\\boric\\tools\\playwright',
]
  .filter(Boolean)
  .map((d) => path.join(d, 'node_modules', 'playwright'));
const PW = PW_DIRS.find((d) => fs.existsSync(d)) || PW_DIRS[0];
const { chromium } = require(PW);
const shotDir = process.argv[2] || null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const ok = (c, m) => {
  console.log((c ? 'ok    ' : 'FAIL  ') + m);
  if (!c) fail++;
};
const FULL_MS = 600; // the whole opening is 0.31 s (OPEN_MS) and the closing 0.16 s (CLOSE_MS), plus slack

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
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
  await page.waitForFunction(() => window.G && G.Game && G.DB && G.PauseMenu, null, { timeout: 30000 });
  ok(await page.evaluate(() => G.PauseMenu.ready), 'the pause menu module is ready');
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
    G.Spawner.update = () => {}; // test page only: no wild spawns
    G.EnemyMgr.clear();
    window.__keep = setInterval(() => {
      const pl = G.Game.player;
      if (pl && !pl.dead) pl.hp = pl.maxHp; // nothing ends the run mid-check
    }, 50);
  });

  const key = async (name, wait = 0) => {
    await page.keyboard.down(name);
    await sleep(60);
    await page.keyboard.up(name);
    if (wait) await sleep(wait);
  };
  const look = () =>
    page.evaluate(() => {
      const layer = document.querySelector('.pause-menu');
      const visible = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect(),
          cs = getComputedStyle(el);
        return (
          r.width > 0 && r.height > 0 && cs.opacity > 0.95 && r.right > 0 && r.left < innerWidth && r.top < innerHeight
        );
      };
      const focused = document.querySelector('.pm-button.focused');
      return {
        state: G.Game.state,
        time: G.Log.t,
        open: G.PauseMenu.isOpen(),
        closing: G.PauseMenu.isClosing(),
        fully: G.PauseMenu.isFullyOpen(),
        steps: [1, 2].filter((n) => layer.classList.contains('pm-step' + n)),
        ball: visible(document.querySelector('.pm-centre')),
        buttons: [...document.querySelectorAll('.pm-button')].map((b) => b.textContent.trim()),
        buttonsShown: getComputedStyle(document.querySelector('.pm-buttons')).opacity > 0.95,
        panels: [...document.querySelectorAll('.pm-panel')].filter(visible).map((p) => p.dataset.panel),
        focus: focused ? focused.textContent.trim() : null,
        // the move slot rim's base colour, drawn as SVG rects (the kit's moveSlotRow)
        focusRim: focused ? [...focused.querySelectorAll('rect')].map((r) => r.getAttribute('fill')) : [],
        otherRim: [...document.querySelector('.pm-button:not(.focused)').querySelectorAll('rect')].map((r) =>
          r.getAttribute('fill')
        ),
        centreButton: !!document.querySelector('.pm-cap-top .pm-cap-button'),
        hudOpacity: +getComputedStyle(document.querySelector('.hud-overlay')).opacity,
        oldScreen: G.UI.isOpen('scr-pause'),
        settings: G.SettingsUI.isOpen,
        ask: G.UI.isOpen('scr-ask'),
      };
    });
  const clockMoves = async () => {
    const a = (await look()).time;
    await sleep(400);
    return (await look()).time > a;
  };
  const shot = async (name) => {
    if (shotDir) await page.screenshot({ path: path.join(shotDir, name) });
  };

  // ---- opening ----
  const openedAt = Date.now();
  await key('Escape');
  let s = await look();
  ok(s.state === 'paused' && s.open && !s.oldScreen, 'Escape pauses and shows the Poke Ball menu, not the old sheet');
  ok(s.steps.length === 1, 'mid-opening: step 1 (dim, closed ball) plays first (' + s.steps.join(',') + ')');
  ok(s.centreButton, 'the top cap carries the white centre button');
  await shot('pause-menu-closed-ball.png');
  await page.waitForFunction(() => G.PauseMenu.isFullyOpen(), null, { timeout: 3000 });
  const openMs = Date.now() - openedAt;
  await sleep(80); // the last transitions settle a frame or two after the step timer
  ok(openMs >= 250 && openMs <= 600, 'opening takes about 0.31 s (' + openMs + ' ms, key press included)');
  s = await look();
  ok(s.fully && s.steps.join(',') === '1,2', 'fully open after the opening (steps ' + s.steps.join(',') + ')');
  ok(!(await clockMoves()), 'the run clock is stopped while paused');
  ok(s.ball, 'the circle and ball are shown');
  ok(s.buttons.join('|') === 'Resume|End Run|Settings' && s.buttonsShown, 'buttons: ' + s.buttons.join(', '));
  ok(
    ['runInfo', 'detail', 'team', 'inventory'].every((p) => s.panels.includes(p)),
    'all four panels slid in: ' + s.panels.join(', ')
  );
  ok(s.hudOpacity === 0, 'the run HUD steps aside (opacity ' + s.hudOpacity + ')');
  ok(s.focus === 'Resume', 'Resume has the focus first');
  ok(
    s.focusRim.includes('#38d030') && !s.otherRim.includes('#38d030') && s.otherRim.includes('#e7e7e7'),
    'move slot shaped buttons: focus rim green, others white'
  );
  await shot('pause-menu-open.png');

  // ---- focus by key and by hover ----
  await key('ArrowDown', 100);
  ok((await look()).focus === 'End Run', 'Down moves the focus to End Run');
  await key('ArrowDown', 100);
  await key('ArrowDown', 100);
  ok((await look()).focus === 'Resume', 'Down wraps around to Resume');
  await key('ArrowUp', 100);
  ok((await look()).focus === 'Settings', 'Up wraps to Settings');
  await page.hover('.pm-button[data-action="endRun"]');
  await sleep(80);
  ok((await look()).focus === 'End Run', 'hover moves the focus');

  // ---- closing, and turning it around ----
  const closedAt = Date.now();
  await key('Escape');
  s = await look();
  ok(s.state === 'paused' && s.closing, 'Escape starts the closing, the game still paused');
  const timeAtClose = s.time;
  await page.waitForFunction(() => !G.PauseMenu.isOpen(), null, { timeout: 3000 });
  const closeMs = Date.now() - closedAt;
  ok(
    closeMs <= 380,
    'closing takes about 0.16 s, about twice as fast as opening (' + closeMs + ' ms, key press included)'
  );
  ok((await page.evaluate(() => G.Log.t)) - timeAtClose < 0.1, 'the run clock stayed stopped during the closing');
  s = await look();
  ok(s.state === 'playing' && !s.open, 'once the menu is gone, play resumes');
  ok(await clockMoves(), 'the run clock runs again');
  ok(s.hudOpacity === 1 || (await sleep(300), (await look()).hudOpacity === 1), 'the run HUD is back');

  await key('Escape', FULL_MS);
  await key('Escape', 20); // the closing lasts about 0.16 s: turn it around early
  ok((await look()).closing, 'reopened, then closing again');
  await key('Escape', FULL_MS);
  s = await look();
  ok(s.state === 'paused' && s.fully, 'Escape mid-close turns it around: open again, still paused');

  // ---- Resume ----
  await page.click('.pm-button[data-action="resume"]');
  await page.waitForFunction(() => !G.PauseMenu.isOpen(), null, { timeout: 3000 });
  ok((await look()).state === 'playing', 'Resume closes the menu and play resumes');

  // ---- Settings over the menu ----
  await key('Escape', FULL_MS);
  await page.click('.pm-button[data-action="settings"]');
  await sleep(200);
  s = await look();
  ok(s.settings && s.open && s.state === 'paused', 'Settings opens over the menu');
  await key('Escape', 300);
  s = await look();
  ok(!s.settings && s.fully && s.state === 'paused', 'Escape closes Settings and the menu stays open');

  // ---- End Run asks ----
  await page.click('.pm-button[data-action="endRun"]');
  await sleep(200);
  const ask = await page.evaluate(() => ({
    title: document.getElementById('ask-title').textContent,
    ok: document.getElementById('ask-ok').textContent,
    okRed: document.getElementById('ask-ok').classList.contains('danger'),
    no: document.getElementById('ask-no').textContent,
    noWhite: document.getElementById('ask-no').classList.contains('white'),
    noFocused: document.activeElement === document.getElementById('ask-no'),
  }));
  ok((await look()).ask && ask.title === 'End Run?', 'End Run asks "End Run?"');
  ok(ask.no === 'No' && ask.noWhite && ask.noFocused, '"No" is white and has the focus');
  ok(ask.ok === 'End' && ask.okRed, '"End" is red');
  await shot('pause-menu-end-run.png');
  await key('Enter', 200);
  s = await look();
  ok(!s.ask && s.state === 'paused' && s.fully, 'Enter answers No: the run goes on, menu still open');
  await page.click('.pm-button[data-action="endRun"]');
  await sleep(200);
  await page.click('#ask-ok');
  await sleep(300);
  s = await look();
  ok(
    !s.open && s.state !== 'paused' && s.state !== 'playing',
    'End ends the run, the menu is gone (state ' + s.state + ')'
  );

  await page.evaluate(() => clearInterval(window.__keep));
  ok(errs.length === 0, 'no page or console errors' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  if (notes.length) console.log('note  known file:// font noise (not a failure): ' + notes.length + ' line(s)');
  await browser.close();
  console.log(fail ? 'smoke-pause-menu: ' + fail + ' FAILED' : 'smoke-pause-menu: all passed');
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
