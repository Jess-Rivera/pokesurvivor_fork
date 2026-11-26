// Headless smoke for the Team menu's Upgrade popup (#97 slice C, part C3). Playwright from PLAYWRIGHT_DIR (default
// C:\Users\boric\tools\playwright), as in tools/smoke-team.js. Usage from the repo root:
//   node tools/smoke-upgrade-popup.js [folder for a screenshot]
// Checks: a slot's Upgrade opens the popup for that copy (a slot with no copy refuses); eleven cards; the button states
// (price, refused when you cannot afford it, disabled "Needs Lv N" above the band, none and a shine once bought); the
// hover preview equals the summary after the buy (the end-goal test); the starting move cards in order; Enter buys by
// keys and Esc closes back to the Team menu; no console or page errors. Expected outcomes are relations from the design
// and decisions 2026-11-26-97-upgrade-popup-open-questions and 2026-11-23-97-139-team-menu-and-upgrade-popup-rulings.
// With a folder given, a screenshot of the popup goes there as upgrade-popup.png.
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
  const errs = [],
    notes = [];
  const FONT = /assets\/fonts\/[^ ]*\.(ttf|otf|woff2?)/i;
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error' || /net::ERR_/.test(m.text())) return;
    (FONT.test(m.text()) ? notes : errs).push('console: ' + m.text().slice(0, 140));
  });
  await page.goto(url.pathToFileURL(path.join(root, 'dev.html')).href + '?dev', { waitUntil: 'load' });
  await page.waitForFunction(() => window.G && G.MenuTeam && G.DB && G.Upgrades, null, { timeout: 30000 });
  const uid = await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    const t = document.getElementById('tap-start');
    if (t && !t.classList.contains('hidden')) t.click();
    const s = G.DB.save;
    s.box = (s.box || []).filter((c) => c.d !== 1 && c.d !== 132); // no Bulbasaur or Ditto copy but ours
    const copy = G.Copies.longId(G.Copies.add(s, { dex: 1, from: 'debug' }).u);
    s.team = [{ dex: 1, shiny: false, uid: copy }, { dex: 132, shiny: false }, null, null, null, null];
    s.partner = 1;
    s.partnerShiny = false;
    s.coins = 100000;
    G.DB.commit(true);
    G.MenuTeam.open();
    return copy;
  });
  await sleep(300);
  const popupOpen = () => page.evaluate(() => !!document.querySelector('.upg-popup'));
  const levels = () => page.evaluate((id) => G.Copies.get(G.DB.save, id).upgrades, uid);
  const coins = () => page.evaluate(() => G.DB.save.coins);
  const card = (key) =>
    page.evaluate((cardKey) => {
      const box = document.querySelector(`.upg-card[data-upgrade="${cardKey}"]`);
      if (!box) return null;
      const button = box.querySelector('button[data-action]');
      return {
        maxed: box.classList.contains('is-maxed'),
        button: button ? button.dataset.label : null,
        disabled: button ? button.disabled : null,
        refused: !!box.querySelector('.shop-button.refused'),
        pips: [...box.querySelectorAll('.upg-pip')].map((pip) => pip.className.replace('upg-pip is-', '')).join(','),
      };
    }, key);
  const row = (name) =>
    page.evaluate((label) => {
      const line = document.querySelector(`.upg-row[data-row="${label}"]`);
      return {
        change: line.querySelector('.upg-row-change').textContent,
        value: line.querySelector('.upg-row-new').textContent,
        preview: line.classList.contains('is-preview'),
      };
    }, name);
  const awayFromCards = () => page.mouse.move(5, 5);

  // ---- a slot with no copy refuses ----
  const slotTwo = await page.evaluate(() => G.MenuTeam.roster()[1]);
  if (slotTwo && !slotTwo.uid) {
    await page.click('[data-action="upgrade-1"]');
    await sleep(200);
    ok(!(await popupOpen()), 'a team slot with no copy does not open the popup');
  } else console.log('note  slot 2 was given a copy on load; the no-copy refusal is not checked');

  // ---- opening ----
  await page.click('[data-action="upgrade-0"]');
  await sleep(300);
  ok(await popupOpen(), "a slot's Upgrade opens the popup");
  const cardKeys = await page.evaluate(() =>
    [...document.querySelectorAll('.upg-card')].map((box) => box.dataset.upgrade)
  );
  ok(cardKeys.length === 11, 'eleven cards: six base stats, three power, two starting move (' + cardKeys.length + ')');
  ok(
    (await page.evaluate(() => document.querySelector('.upg-name').textContent.trim())) === 'Bulbasaur',
    'the popup names the copy'
  );

  // ---- states at OOR level 1 ----
  let hp = await card('baseHp');
  ok(
    hp.button === '50' && !hp.disabled && !hp.refused,
    'HP++ at Lv 1: a positive button with the 3-star price (' + hp.button + ')'
  );
  ok(hp.pips === 'open,open,' + Array(8).fill('locked').join(','), 'HP++ pips: two open at band 1, eight locked');
  ok((await card('crit')).pips === 'open,locked,locked,locked,locked', 'Critical Hit++ opens one level at band 1');
  const second = await card('startingMoves:2');
  ok(second.disabled && second.button === 'Locked', 'Second Starting Move is locked until the first is bought');

  // ---- the hover preview equals the summary after the buy (end-goal test) ----
  const before = await row('HP'),
    coinsBefore = await coins();
  await page.hover('[data-action="upgrade-buy-baseHp"]');
  await sleep(150);
  const preview = await row('HP');
  ok(
    preview.preview && preview.value !== before.value,
    'hovering HP++ shows the HP row in preview (' + preview.value + ')'
  );
  await page.click('[data-action="upgrade-buy-baseHp"]');
  await sleep(400);
  await awayFromCards();
  await sleep(150);
  const after = await row('HP');
  ok(
    after.value === preview.value && after.change === preview.change && !after.preview,
    'after the buy the HP row equals the preview (' + after.change + ' ' + after.value + ')'
  );
  ok((await levels()).baseHp === 1, 'the buy raised HP++ to level 1');
  ok(coinsBefore - (await coins()) === 50, 'the buy took its price (' + (coinsBefore - (await coins())) + ')');
  const crit = await row('Crit');
  await page.hover('[data-action="upgrade-buy-crit"]');
  await sleep(150);
  const critPreview = await row('Crit');
  await page.click('[data-action="upgrade-buy-crit"]');
  await sleep(400);
  await awayFromCards();
  await sleep(150);
  ok(
    critPreview.value !== crit.value && (await row('Crit')).value === critPreview.value,
    'Critical Hit++: the preview equals the row after the buy (' + critPreview.value + ')'
  );

  // ---- the band ----
  await page.click('[data-action="upgrade-buy-baseHp"]');
  await sleep(400);
  hp = await card('baseHp');
  ok(hp.disabled && hp.button === 'Needs Lv 10', 'HP++ above band 1: disabled "Needs Lv 10" (' + hp.button + ')');
  ok((await card('crit')).button === 'Needs Lv 10', 'Critical Hit++ above band 1: "Needs Lv 10"');

  // ---- refused when you cannot afford it ----
  await page.evaluate(() => {
    G.DB.save.coins = 10;
    G.DB.commit(true);
  });
  await sleep(200);
  const poor = await card('baseAtk');
  ok(poor.refused && !poor.disabled && poor.button === '50', 'Atk++ with 10 coins: the refused look, price kept');
  await page.click('[data-action="upgrade-buy-baseAtk"]');
  await sleep(400);
  ok(!(await levels()).baseAtk && (await coins()) === 10, 'a refused buy changes nothing');

  // ---- the starting move cards ----
  await page.evaluate(() => {
    G.DB.save.coins = 100000;
    G.DB.commit(true);
  });
  await sleep(200);
  await page.click('[data-action="upgrade-buy-startingMoves:1"]');
  await sleep(400);
  const first = await card('startingMoves:1');
  ok(first.maxed && first.button === null, 'Starting Move Choice bought: no button, the shine');
  ok((await card('startingMoves:2')).button === '2,000', 'then Second Starting Move offers its price');

  // ---- every card bought ----
  await page.evaluate((id) => {
    const s = G.DB.save;
    G.Copies.addCandyXp(s, id, G.Candy.xpForLevel(1, 100));
    for (const upgrade of G.Upgrades.LIST) G.Copies.setUpgradeLevel(s, id, upgrade.id, upgrade.levels);
    G.DB.commit(true);
  }, uid);
  await sleep(300);
  const all = await page.evaluate(() => ({
    maxed: document.querySelectorAll('.upg-card.is-maxed').length,
    buttons: document.querySelectorAll('.upg-card button').length,
  }));
  ok(all.maxed === 11 && all.buttons === 0, 'everything bought: eleven shining cards and no buy button');
  await page.evaluate((id) => {
    for (const upgrade of G.Upgrades.LIST) G.Copies.setUpgradeLevel(G.DB.save, id, upgrade.id, 0);
    G.Copies.setUpgradeLevel(G.DB.save, id, 'baseHp', 4);
    G.Copies.setUpgradeLevel(G.DB.save, id, 'crit', 5);
    G.DB.commit(true);
  }, uid);
  await sleep(300);
  await page.hover('[data-action="upgrade-buy-baseAtk"]');
  await sleep(200);
  if (shotDir) await page.screenshot({ path: path.join(shotDir, 'upgrade-popup.png') });

  // ---- keys: Enter buys the card under the cursor, Esc closes ----
  await awayFromCards();
  const keyLevels = await levels();
  await page.keyboard.press('ArrowDown');
  await sleep(150);
  await page.keyboard.press('Enter');
  await sleep(500);
  const changed = Object.entries(await levels()).filter(([id, level]) => level !== (keyLevels[id] || 0));
  ok(
    changed.length === 1,
    'Enter buys one level of the card under the cursor (' + changed.map(([id]) => id).join() + ')'
  );

  // ---- keys: buying a card out keeps the cursor in the popup (review 2026-11-26: it fell to the slot behind) ----
  const boughtOut = changed.length ? changed[0][0] : 'baseDef';
  await page.evaluate(
    ({ id, upgradeId }) => {
      G.Copies.setUpgradeLevel(G.DB.save, id, upgradeId, G.Upgrades.BY[upgradeId].levels - 1);
      G.DB.commit(true);
    },
    { id: uid, upgradeId: boughtOut }
  );
  await sleep(300);
  await page.keyboard.press('Enter');
  await sleep(400);
  const beforeNext = await levels();
  ok(
    beforeNext[boughtOut] === (await page.evaluate((upgradeId) => G.Upgrades.BY[upgradeId].levels, boughtOut)),
    'Enter buys the last level of ' + boughtOut
  );
  await page.keyboard.press('Enter');
  await sleep(400);
  const nextChanged = Object.entries(await levels()).filter(([id, level]) => level !== (beforeNext[id] || 0));
  ok(
    (await popupOpen()) && nextChanged.length === 1 && nextChanged[0][0] !== boughtOut,
    'then the cursor moved on: the next Enter buys another card (' + nextChanged.map(([id]) => id).join() + ')'
  );
  await page.keyboard.press('Escape');
  await sleep(300);
  ok(
    !(await popupOpen()) && (await page.evaluate(() => G.UI.isOpen('scr-roster'))),
    'Esc closes the popup back to the Team menu'
  );

  ok(!errs.length, 'no console or page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  if (notes.length) console.log('note  known file:// font noise (not a failure): ' + notes.length + ' line(s)');
  await browser.close();
  console.log(fail ? 'smoke-upgrade-popup: ' + fail + ' FAIL' : 'smoke-upgrade-popup: all checks passed');
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.log(e);
  process.exit(1);
});
