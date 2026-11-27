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

  // ---- #173: held copies, the owned box, the side panels and an owned sale ----
  // Three Eevee owned (one locked, one on the team, one free to sell); an Eevee and a Growlithe held with one free place.
  const setup = await page.evaluate(() => {
    const save = G.DB.save;
    G.Debug.fillBoxes(4);
    const caterpies = G.Copies.all(save).filter((copy) => copy.speciesID === 10);
    while (G.Copies.freePlaces(save) < 4) G.Copies.sell(save, caterpies.pop().pokemonUUID); // fillBoxes only tops up
    const eevees = [0, 1, 2].map(() => G.Copies.longId(G.Copies.add(save, { dex: 133, from: 'other' }).u));
    G.Copies.setLocked(save, eevees[0], true);
    save.team[0] = { dex: 133, shiny: false, uid: eevees[1] };
    G.Settings.set('keepSellDetail', false);
    G.Settings.set('keepSellHex', false);
    G.Settings.set('catchHex', false);
    G.Catch.startRun(); // nothing held yet; no run is needed to hold and settle
    G.Catch.hold({ dex: 133, name: 'Eevee', nature: 5, natureName: 'Timid' });
    G.Catch.hold({ dex: 58, name: 'Growlithe', nature: 14, natureName: 'Jolly' });
    G.Catch.settle(true, save);
    G.KeepSellUI.open(() => {});
    const held = G.Catch.heldCatches(save);
    return {
      eevees,
      heldUids: held.map((h) => (h.copy ? G.Copies.longId(h.copy.u) : null)),
      growlithesOwned: G.Copies.all(save).filter((copy) => copy.speciesID === 58).length,
      eeveesOwned: G.Copies.all(save).filter((copy) => copy.speciesID === 133).length, // the earlier kept one too
      free: G.Copies.freePlaces(save),
    };
  });
  await sleep(300);
  ok(setup.heldUids.every(Boolean), 'every held catch carries its own copy');
  const panels = () =>
    page.evaluate(() => {
      const windowBox = document.getElementById('ks-window').getBoundingClientRect();
      const side = (left) =>
        [...document.querySelectorAll('#scr-keepsell .ks-side .tm-short')].find((element) => {
          const box = element.getBoundingClientRect();
          return left ? box.right <= windowBox.left : box.left >= windowBox.right;
        });
      const read = (element) => (element ? { uid: element.dataset.uid, text: element.textContent } : null);
      return {
        open: G.KeepSellUI.isOpen(),
        faces: document.querySelectorAll('#ks-window .ks-owned-cell').length,
        none: /None owned yet/.test(document.querySelector('#ks-window .ks-owned').textContent),
        left: read(side(true)),
        right: read(side(false)),
        counter: [...document.querySelectorAll('#ks-window .ks-text')]
          .map((t) => t.textContent.trim())
          .find((t) => /free place/.test(t)),
        toast: (document.querySelector('.toast') || {}).textContent || '',
        asking: G.UI.isOpen('scr-ask'),
        detail: G.Settings.get('keepSellDetail'),
      };
    });
  await page.hover('#ks-window [data-cursor-id="row-0"]');
  await sleep(150);
  now = await panels();
  ok(now.open, 'the list opens for the held Eevee and Growlithe');
  ok(now.faces === setup.eeveesOwned, 'the owned box shows every owned Eevee, the team one too (' + now.faces + ')');
  await page.hover('#ks-window [data-cursor-id="row-1"]');
  await sleep(150);
  now = await panels();
  ok(
    setup.growlithesOwned ? now.faces === setup.growlithesOwned : now.none,
    'the owned box follows the selection to Growlithe'
  );

  // Detail: the selected row's own copy on the left, following the row
  await page.click('#ks-window [data-cursor-id="ks-detail"]');
  await sleep(200);
  now = await panels();
  ok(now.detail === true, 'Detail is remembered on this device');
  ok(now.left && now.left.uid === setup.heldUids[1], 'Detail shows the selected row: the held Growlithe copy');
  await page.hover('#ks-window [data-cursor-id="row-0"]');
  await sleep(150);
  now = await panels();
  ok(now.left && now.left.uid === setup.heldUids[0], 'the held panel follows the row to Eevee');
  const heldEevee = await page.evaluate(() => G.Copies.read(G.Catch.heldCatches(G.DB.save)[0].copy, G.DB.save));
  ok(
    now.left && now.left.text.includes(heldEevee.natureName) && now.left.text.includes(heldEevee.abilityName),
    'the held panel names the catch nature and ability'
  );

  // the owned faces: hover previews, a click pins; Enter on a face by keys opens its panel
  const faceOf = async (uid) =>
    page.evaluate((wanted) => {
      const dex = G.Copies.get(G.DB.save, wanted).speciesID;
      const ivEv = (copy) => copy.iv.reduce((sum, value) => sum + value, 0) + copy.evTotal;
      const list = G.Copies.all(G.DB.save).filter((copy) => copy.speciesID === dex);
      list.sort((a, b) => ivEv(b) - ivEv(a));
      return list.findIndex((copy) => copy.pokemonUUID === wanted);
    }, uid);
  const lockedFace = await faceOf(setup.eevees[0]),
    teamFace = await faceOf(setup.eevees[1]),
    freeFace = await faceOf(setup.eevees[2]);
  await page.hover(`#ks-window [data-cursor-id="own-${freeFace}"]`);
  await sleep(150);
  now = await panels();
  ok(now.right && now.right.uid === setup.eevees[2], 'hovering a face previews its panel');
  await page.keyboard.press('Enter');
  await sleep(150);
  await page.mouse.move(960, 40, { steps: 4 });
  await sleep(150);
  now = await panels();
  ok(now.right && now.right.uid === setup.eevees[2], 'Enter on the face pins its panel');
  ok(/Sell/.test(now.right ? now.right.text : ''), 'the owned panel has Sell');
  await shot('keep-sell-compare.png');

  // Sell refusals: a locked copy, a team copy
  const sellOn = async (face) => {
    await page.click(`#ks-window [data-cursor-id="own-${face}"]`);
    await page.mouse.move(960, 40, { steps: 4 });
    await sleep(150);
    await page.click('#scr-keepsell .ks-side [data-cursor-id="ks-owned-sell"]');
    await sleep(250);
    return panels();
  };
  await page.click(`#ks-window [data-cursor-id="own-${freeFace}"]`); // unpin
  now = await sellOn(lockedFace);
  ok(!now.asking && /Unlock it first/.test(now.toast), 'a locked copy is refused: ' + now.toast);
  now = await sellOn(teamFace);
  ok(!now.asking && /Remove it from your team first/.test(now.toast), 'a team copy is refused: ' + now.toast);

  // an unlocked copy: Esc in the dialog cancels only the dialog; Sell sells it and frees a place
  now = await sellOn(freeFace);
  ok(now.asking, 'Sell asks first');
  await page.keyboard.press('Escape');
  await sleep(250);
  now = await panels();
  ok(now.open && !now.asking, 'Esc in the dialog closes only the dialog');
  ok(await page.evaluate((uid) => !!G.Copies.get(G.DB.save, uid), setup.eevees[2]), 'nothing was sold');
  const freeBefore = await page.evaluate(() => G.Copies.freePlaces(G.DB.save));
  await page.click('#scr-keepsell .ks-side [data-cursor-id="ks-owned-sell"]');
  await sleep(250);
  await page.click('#ask-ok');
  await sleep(300);
  now = await panels();
  ok(await page.evaluate((uid) => !G.Copies.get(G.DB.save, uid), setup.eevees[2]), 'Sell sold the copy');
  ok(
    new RegExp('of ' + (freeBefore + 1) + ' free place').test(now.counter || ''),
    'the sale frees a place for the Keeps (' + now.counter + ')'
  );
  await page.hover('#ks-window [data-cursor-id="row-0"]');
  await sleep(150);
  now = await panels();
  ok(now.faces === setup.eeveesOwned - 1, 'the owned box drops the sold copy');
  await page.evaluate(() => G.Settings.set('keepSellDetail', false));

  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fail ? 'smoke-keep-sell: ' + fail + ' FAIL' : 'smoke-keep-sell: all passed');
  process.exit(fail ? 1 : 0);
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
