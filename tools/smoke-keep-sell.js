// tools/smoke-keep-sell.js: the keep-or-sell list (#146) in the real game, headless. Usage: node tools/smoke-keep-sell.js
// [shot folder]. A fall with more held catches than free places opens the list; the first that fit start as Keep; Keep
// past the free places is refused; Make Room goes to the Team menu and Esc there comes back with the new count and the
// marks kept; Esc confirms (places the Keeps, sells the rest); the next load with the list unanswered sells every catch.
// Relations, not numbers (docs/TEST-FIRST.md): prices are read from G.Copies, never typed here.
const path = require('path'),
  url = require('url'),
  fs = require('fs');
const root = path.resolve(__dirname, '..');
const shotDir = process.argv[2] || null;
const PW_DIRS = [
  process.env.PLAYWRIGHT_DIR,
  path.join(require('os').homedir(), 'tools', 'playwright'),
  'C:\\Users\\boric\\tools\\playwright',
]
  .filter(Boolean)
  .map((dir) => path.join(dir, 'node_modules', 'playwright'));
const PW = PW_DIRS.find((dir) => fs.existsSync(dir)) || PW_DIRS[0];
const { chromium } = require(PW);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let fail = 0;
const ok = (condition, message) => {
  console.log((condition ? 'ok    ' : 'FAIL  ') + message);
  if (!condition) fail++;
};
const CATCHES = [
  { dex: 147, name: 'Dratini', nature: 3, natureName: 'Adamant' },
  { dex: 133, name: 'Eevee', nature: 11, natureName: 'Timid' },
  { dex: 58, name: 'Growlithe', nature: 14, natureName: 'Jolly' },
  { dex: 43, name: 'Oddish', nature: 16, natureName: 'Modest' },
  { dex: 16, name: 'Pidgey', nature: 12, natureName: 'Hasty' },
];

async function main() {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push('pageerror: ' + error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/net::ERR_|assets\/fonts/.test(message.text()))
      errors.push('console: ' + message.text().slice(0, 140));
  });
  const shot = async (name) => shotDir && page.screenshot({ path: path.join(shotDir, name) });
  const devUrl = url.pathToFileURL(path.join(root, 'dev.html')).href + '?dev';
  const boot = async () => {
    await page.goto(devUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => window.G && G.KeepSellUI && G.DB && G.Debug, null, { timeout: 30000 });
    await page.evaluate(async () => {
      await G.DB.ready();
      if (!G.DB.save) G.DB.playAsGuest();
      const tap = document.getElementById('tap-start');
      if (tap && !tap.classList.contains('hidden')) tap.click();
    });
    await sleep(300);
  };
  await boot();

  // ---- a fall with five held catches and three free places ----
  const before = await page.evaluate((catches) => {
    const save = G.DB.save;
    save.partner = save.partner || 1;
    save.coins = 5000;
    G.Debug.fillBoxes(3);
    G.Game.startRun();
    catches.forEach((mon) => G.Catch.hold(mon));
    return { box: save.box.length, free: G.Copies.freePlaces(save) };
  }, CATCHES);
  ok(before.free === 3, 'the boxes leave three free places (' + before.free + ')');
  await page.evaluate(() => {
    for (const member of G.Game.roster) {
      member.hp = 0;
      member.dead = true;
    }
  });
  await page.waitForFunction(() => G.EndRun.isOpen(), null, { timeout: 8000 });
  await sleep(250);
  const home = await page.$('.end-run .pm-button[data-action="home"]');
  ok(!!home, 'a fall with no EVs offers Return Home');
  if (home) await home.click();
  await page.waitForFunction(() => G.KeepSellUI.isOpen(), null, { timeout: 5000 }).catch(() => {});
  await sleep(300);
  const look = () =>
    page.evaluate(() => {
      const rows = [...document.querySelectorAll('#ks-window .ks-row')];
      return {
        open: G.KeepSellUI.isOpen(),
        rows: rows.length,
        keeps: rows.map((row) => row.querySelector('.toggle-power').classList.contains('on')),
        counter: [...document.querySelectorAll('#ks-window .ks-text')]
          .map((t) => t.textContent.trim())
          .find((t) => /free place/.test(t)),
        held: G.Catch.heldCatches(G.DB.save).length,
        box: G.DB.save.box.length,
        coins: G.DB.save.coins,
        team: G.UI.isOpen('scr-roster'),
        toast: (document.querySelector('.toast') || {}).textContent || '',
      };
    });
  let now = await look();
  await shot('keep-sell-open.png');
  ok(now.open, 'the list opens after the results');
  ok(now.rows === CATCHES.length, 'one row per held catch (' + now.rows + ')');
  ok(now.keeps.join() === 'true,true,true,false,false', 'the first three that fit start as Keep (' + now.keeps + ')');
  ok(now.held === CATCHES.length && now.box === before.box, 'nothing is placed before the answer; the save holds them');

  // ---- Keep past the free places is refused (keys: down to the last row, Enter) ----
  const cursorAt = () =>
    page.evaluate(() => {
      const bar = document.querySelector('#ks-window .cursor-bar'),
        row = bar && bar.closest('[data-cursor-id]');
      const button = document.querySelector('#ks-window [data-cursor-shown]');
      return row ? row.dataset.cursorId : button ? button.dataset.cursorId : null;
    });
  // the mouse rests where Return Home was, over a row, which sets where the keys start: step down to Pidgey's row
  for (let i = 0; i < CATCHES.length && (await cursorAt()) !== 'row-4'; i++) {
    await page.keyboard.press('ArrowDown');
    await sleep(50);
  }
  ok((await cursorAt()) === 'row-4', 'the arrow keys reach the last row');
  await page.keyboard.press('Enter');
  await sleep(150);
  now = await look();
  ok(now.keeps.filter(Boolean).length === 3, 'a fourth Keep with three free places is refused');
  ok(/No free places left/.test(now.toast), 'the refusal says why');

  // ---- Make Room: the Team menu; a box copy sold there; Esc comes back with the new count, the marks kept ----
  await page.click('[data-cursor-id="make-room"]');
  await sleep(300);
  now = await look();
  ok(now.team && !now.open, 'Make Room opens the Team menu');
  await page.evaluate(() => {
    const caterpie = G.DB.save.box.find((copy) => copy.d === 10);
    G.Copies.sell(G.DB.save, G.Copies.longId(caterpie.u));
    G.DB.commit();
  });
  await page.keyboard.press('Escape');
  await sleep(300);
  now = await look();
  ok(now.open && !now.team, 'leaving the Team menu returns to the list');
  ok(/of 4 free places/.test(now.counter || ''), 'the counter shows the freed place (' + now.counter + ')');
  ok(now.keeps.join() === 'true,true,true,false,false', 'the marks are kept (' + now.keeps + ')');

  // ---- a fourth Keep now fits (a click on Pidgey's row); Esc confirms ----
  await page.click('#ks-window [data-cursor-id="row-4"]');
  await sleep(150);
  now = await look();
  ok(now.keeps.join() === 'true,true,true,false,true', 'Pidgey can be kept with the freed place (' + now.keeps + ')');
  const boxBefore = now.box,
    coinsBefore = now.coins,
    oddishPrice = await page.evaluate(() => G.Copies.priceFor(43, false));
  await shot('keep-sell-before-confirm.png');
  await page.keyboard.press('Escape');
  await sleep(300);
  now = await look();
  ok(!now.open, 'Esc confirms and closes the list');
  ok(now.box === boxBefore + 4, 'the box grows by the four Keeps (' + (now.box - boxBefore) + ')');
  ok(now.coins === coinsBefore + oddishPrice, 'coins rise by exactly the sold Oddish price');
  ok(now.held === 0, 'the save no longer holds the catches');
  ok(
    /joined your Pokebox/.test(now.toast) && /Oddish was sold/.test(now.toast),
    'one notice with the totals: ' + now.toast
  );

  // ---- closing the game with the list unanswered: the next load sells every catch ----
  const total = await page.evaluate((catches) => {
    const save = G.DB.save;
    save.heldCatches = catches.map((mon) => ({ ...mon }));
    G.DB.commit(true);
    return { coins: save.coins, price: catches.reduce((sum, mon) => sum + G.Copies.priceFor(mon.dex, false), 0) };
  }, CATCHES);
  // a guest save is never stored, so a page reload starts a new one: run the load's own step (G.Flow.afterLogin) instead
  await page.evaluate(() => G.Flow.afterLogin());
  await sleep(300);
  now = await look();
  ok(now.held === 0 && !now.open, 'on the next load the list does not come back');
  ok(now.coins === total.coins + total.price, 'the load sold every held catch at its price');
  ok(/left open/.test(now.toast), 'the load says what happened: ' + now.toast);

  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fail ? 'smoke-keep-sell: ' + fail + ' FAIL' : 'smoke-keep-sell: all passed');
  process.exit(fail ? 1 : 0);
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
