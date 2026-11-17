// tools/smoke-berry-slots.js: headless browser check for #96, buying berry slots on the Shop's Character Upgrades tab. A check, not
// a harness: tools/check.js only syntax-checks it, since it needs a browser. Playwright is NOT a repo dependency (PLAYWRIGHT_DIR,
// as in tools/smoke-gym.js). Usage from the repo root:  node tools/smoke-berry-slots.js
// Runs dev.html?dev over file:// (how Jess plays):
//   an old save with no berrySlots field reads as 1 slot;
//   the Shop's Berry Pocket (149b) lights 1 of its 4 squares and its Buy offers slot 2 for 9,000;
//   clicking Buy and confirming spends 9,000 PokeCoins and gives 2 slots (saved, 2 squares lit); slot 3 is next;
//   cancelling the confirm spends nothing;
//   slot 4 cannot be bought before slot 3, nothing past 4, and too few coins refuses;
//   a run started with 3 slots lets the bag take 3 different berries and refuses a 4th.
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

let fail = 0;
const ok = (condition, message) => {
  console.log((condition ? 'ok    ' : 'FAIL  ') + message);
  if (!condition) fail++;
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
  await page.waitForFunction(() => window.G && G.Game && G.DB && G.Debug && G.GachaUI, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    const t = document.getElementById('tap-start');
    if (t && !t.classList.contains('hidden')) t.click(); // headless cannot play sound: pass "press to start" first
    delete G.DB.save.berrySlots; // an old save: the field is absent
    G.DB.save.coins = 10000;
  });
  ok((await page.evaluate(() => G.Grounds.berrySlots(G.DB.save))) === 1, 'old save without berrySlots reads as 1 slot');

  // The Shop, Character Upgrades tab: the Berry Pocket (149b)
  await page.evaluate(() => G.GachaUI.open());
  await page.click('.shop-tab[data-tab="upgrades"]');
  const berryPocket = () =>
    page.evaluate(() => {
      const squares = [...document.querySelectorAll('.shop-pocket-grid[data-pocket="berry"] .hud-grid-slot')];
      const button = document.querySelector('[data-action="buy-berry"]');
      return {
        lit: squares.filter((square) => !square.classList.contains('is-locked')).length,
        total: squares.length,
        text: button.textContent.trim(),
        disabled: button.disabled,
        refused: button.closest('.shop-button').classList.contains('refused'), // #151: refuses with a toast
      };
    });
  const before = await berryPocket();
  ok(before.lit === 1 && before.total === 4, 'the Berry Pocket lights 1 of its 4 squares');
  ok(
    !before.disabled && !before.refused && before.text === 'Buy 9,000',
    'its Buy offers slot 2 for 9,000 (' + before.text + ')'
  );

  // Cancel spends nothing
  await page.click('[data-action="buy-berry"]');
  await page.waitForSelector('#scr-ask:not(.hidden)');
  ok((await page.textContent('#ask-msg')).includes('9,000'), 'confirm names the 9,000 price');
  await page.click('#ask-no');
  ok(
    await page.evaluate(() => G.DB.save.coins === 10000 && G.Grounds.berrySlots(G.DB.save) === 1),
    'cancel spends nothing and keeps 1 slot'
  );

  // Buy slot 2
  await page.click('[data-action="buy-berry"]');
  await page.waitForSelector('#scr-ask:not(.hidden)');
  await page.click('#ask-ok');
  await page.waitForFunction(() => G.Grounds.berrySlots(G.DB.save) === 2, null, { timeout: 5000 }).catch(() => {});
  const afterBuy = await page.evaluate(() => ({
    coins: G.DB.save.coins,
    slots: G.Grounds.berrySlots(G.DB.save),
    field: G.DB.save.berrySlots,
  }));
  ok(
    afterBuy.coins === 1000 && afterBuy.slots === 2 && afterBuy.field === 2,
    'buying slot 2 spends 9,000 and saves 2 slots'
  );
  const after = await berryPocket();
  ok(after.lit === 2, 'the Berry Pocket lights 2 squares');
  ok(
    after.text === 'Buy 23,000' && after.refused,
    'slot 3 is next but unaffordable (refuses) at 1,000 (' + after.text + ')'
  );

  // The buy function's own rules
  const rules = await page.evaluate(() => {
    const save = { coins: 1000000, berrySlots: 2 };
    const poor = G.Grounds.buyBerrySlot({ coins: 100, berrySlots: 2 });
    const third = G.Grounds.buyBerrySlot(save),
      coinsAfterThird = save.coins,
      fourth = G.Grounds.buyBerrySlot(save),
      fifth = G.Grounds.buyBerrySlot(save);
    return {
      poor: poor.error,
      third: third.slots,
      thirdCost: 1000000 - coinsAfterThird,
      fourth: fourth.slots,
      fourthCost: coinsAfterThird - save.coins,
      fifth: fifth.error,
      prices: [2, 3, 4].map((n) => G.Grounds.berrySlotPrice(n) === G.Items.slotPrice(n)),
    };
  });
  ok(rules.poor === 'poor', 'too few coins refuses');
  ok(rules.third === 3 && rules.thirdCost === 23000, 'slot 3 costs 23,000');
  ok(rules.fourth === 4 && rules.fourthCost === 60000, 'slot 4 costs 60,000 and comes only after slot 3');
  ok(rules.fifth === 'max', 'nothing past 4 slots');
  ok(rules.prices.every(Boolean), 'berry slot prices are the team item slot prices');

  // A run with 3 slots: the bag takes 3 different berries, refuses a 4th
  await page.evaluate(() => {
    G.DB.save.berrySlots = 3;
    const s = G.DB.save;
    s.team = [{ dex: 7, shiny: false }, null, null, null, null, null];
    s.partner = 7;
    s.partnerShiny = false;
    G.UI.show('scr-menu', true);
  });
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 15000 });
  const bag = await page.evaluate(() => {
    G.Spawner.update = () => {}; // test page only: no wild spawns
    G.EnemyMgr.clear();
    const pl = G.Game.player,
      took = [];
    for (const id of ['cheri', 'chesto', 'pecha', 'rawst']) {
      const can = G.Grounds.canTake(id, pl);
      took.push(can);
      if (can) G.Grounds.apply(pl, id);
    }
    return { took, size: pl.berries.length };
  });
  ok(bag.took.join(',') === 'true,true,true,false' && bag.size === 3, 'a 3-slot run holds 3 berries and refuses a 4th');

  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  if (notes.length) console.log('note  ' + notes.length + ' file:// font request(s) blocked (expected)');
  await browser.close();
  console.log(fail ? 'smoke-berry-slots: ' + fail + ' FAILED' : 'smoke-berry-slots: all passed');
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
