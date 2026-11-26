// Headless smoke for the Team menu's arrow keys (Jess 2026-11-26): left to right reads as the slot's own buttons, then
// the slot (its cursor bar is on its right edge), then the Pokebox grid. Playwright from PLAYWRIGHT_DIR (default
// C:\Users\boric\tools\playwright), as in tools/smoke-upgrade-popup.js. Usage from the repo root:
//   node tools/smoke-team-menu-keys.js
// Checks: Left from a slot lands on its Level Up; Right from Level Up goes back to the slot; Right from the slot goes to
// the grid; Left from the grid comes back to a slot; Down from a slot's Level Up stays in the slot column (never the
// grid); no console or page errors.
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const ok = (c, m) => {
  console.log((c ? 'ok    ' : 'FAIL  ') + m);
  if (!c) fail++;
};

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const errs = [];
  const FONT = /assets\/fonts\/[^ ]*\.(ttf|otf|woff2?)/i;
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/net::ERR_/.test(m.text()) && !FONT.test(m.text()))
      errs.push('console: ' + m.text().slice(0, 140));
  });
  await page.goto(url.pathToFileURL(path.join(root, 'dev.html')).href + '?dev', { waitUntil: 'load' });
  await page.waitForFunction(() => window.G && G.MenuTeam && G.DB, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    const t = document.getElementById('tap-start');
    if (t && !t.classList.contains('hidden')) t.click();
    const s = G.DB.save;
    const copyOf = (dex) => G.Copies.longId(G.Copies.add(s, { dex, from: 'debug' }).u);
    s.team = [
      { dex: 1, shiny: false, uid: copyOf(1) },
      { dex: 4, shiny: false, uid: copyOf(4) },
      null,
      null,
      null,
      null,
    ];
    s.partner = 1;
    s.partnerShiny = false;
    G.DB.commit(true);
    G.MenuTeam.open();
  });
  await sleep(300);

  // Where the keys' cursor is: a glitch button marks itself data-cursor-shown; a slot, a cell or a tab draws the
  // cursor bar inside its own element; a grid cell carries is-cursor.
  const at = () =>
    page.evaluate(() => {
      const shown = document.querySelector('#scr-roster [data-cursor-shown]');
      if (shown) return shown.dataset.cursorId;
      const mark = document.querySelector('#scr-roster .cursor-bar, #scr-roster .is-cursor');
      const owner = mark && mark.closest('[data-cursor-id]');
      return owner ? owner.dataset.cursorId : null;
    });
  const press = async (key) => {
    await page.keyboard.press(key);
    await sleep(200);
    return at();
  };

  // the cursor starts on slot 1 (the Team menu's home); a first arrow may only wake the keys' cursor
  await page.keyboard.press('ArrowUp');
  await sleep(200);
  let from = await at();
  if (from !== 'slot-0') from = await press('ArrowUp');
  ok(from === 'slot-0', 'the keys start on slot 1 (' + from + ')');
  const left = await press('ArrowLeft');
  ok(left === 'levelup-0', 'Left from slot 1 lands on its Level Up (' + left + ')');
  const back = await press('ArrowRight');
  ok(back === 'slot-0', 'Right from Level Up goes back to slot 1 (' + back + ')');
  const grid = await press('ArrowRight');
  ok(/^(copy|dex)-/.test(grid || ''), 'Right from slot 1 goes into the grid (' + grid + ')');
  const home = await press('ArrowLeft');
  ok(/^slot-\d$/.test(home || ''), 'Left from the grid comes back to a slot (' + home + ')');
  if (home !== 'slot-0') await press('ArrowUp');
  await press('ArrowLeft'); // slot 1's Level Up
  const down = await press('ArrowDown');
  ok(
    /^(favorite|lock|upgrade|levelup)-[01]$/.test(down || '') || down === 'slot-1',
    'Down from Level Up stays in the slot column (' + down + ')'
  );

  ok(!errs.length, 'no console or page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log(fail ? 'smoke-team-menu-keys: ' + fail + ' FAIL' : 'smoke-team-menu-keys: all checks passed');
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.log(e);
  process.exit(1);
});
