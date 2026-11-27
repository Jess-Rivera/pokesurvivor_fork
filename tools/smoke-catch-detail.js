// tools/smoke-catch-detail.js: the catch screen's side panels (#173) in the real game, headless. Usage:
// node tools/smoke-catch-detail.js [shot folder]. With three Eevee owned, a catch opens: no tooltip on a face; hovering a
// face previews its panel on the right and leaving takes it away; a click pins it, another face previews over the pin and
// the pin comes back; Esc unpins before it asks to let go; Detail opens the wild copy's panel (its own nature and
// ability) and is remembered; Hex flips only this screen's setting; the lock mark switches and saves. Relations only
// (docs/TEST-FIRST.md): names are read from the game's own copies, never typed here.
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
const EEVEE = 133;

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
  await page.goto(url.pathToFileURL(path.join(root, 'dev.html')).href + '?dev', { waitUntil: 'load' });
  await page.waitForFunction(() => window.G && G.CatchUI && G.DB && G.Game, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    const tap = document.getElementById('tap-start');
    if (tap && !tap.classList.contains('hidden')) tap.click();
  });
  await sleep(300);

  // ---- three Eevee owned, Detail and Hex off, a catch of an Eevee opens ----
  const owned = await page.evaluate((dex) => {
    const save = G.DB.save;
    save.partner = save.partner || 1;
    save.belt = { size: 6, slots: ['poke', 'poke', 'poke', null, null, null], unlocked: [] };
    for (let i = 0; i < 3; i++) G.Copies.add(save, { dex, from: 'other' });
    G.Settings.set('catchDetail', false);
    G.Settings.set('catchHex', false);
    G.Settings.set('keepSellHex', false);
    G.Game.startRun();
    return G.Copies.all(save)
      .filter((copy) => copy.speciesID === dex)
      .map((copy) => copy.pokemonUUID);
  }, EEVEE);
  await sleep(400);
  const opened = await page.evaluate(
    (dex) => G.Game.openCatch({ dex, name: 'Eevee', nature: 5, natureName: 'Timid', timeFraction: 0.5 }),
    EEVEE
  );
  await sleep(400);
  ok(opened && (await page.evaluate(() => G.CatchUI.isOpen)), 'the catch screen opens');
  const look = () =>
    page.evaluate(() => {
      const panel = (side) => {
        const sides = [...document.querySelectorAll('#scr-catch .catch-side')],
          windowBox = document.querySelector('#scr-catch .catch-window').getBoundingClientRect(),
          found = sides.find((element) => {
            const box = element.getBoundingClientRect();
            return side === 'left' ? box.right <= windowBox.left : box.left >= windowBox.right;
          });
        const short = found && found.querySelector('.tm-short');
        return short ? { uid: short.dataset.uid, text: short.textContent } : null;
      };
      const tip = document.querySelector('.hud-tip');
      return {
        open: G.CatchUI.isOpen,
        left: panel('left'),
        right: panel('right'),
        tip:
          !!tip &&
          getComputedStyle(tip).display !== 'none' &&
          getComputedStyle(tip).visibility !== 'hidden' &&
          !!tip.textContent.trim(),
        detail: G.Settings.get('catchDetail'),
        hex: G.Settings.get('catchHex'),
        otherHex: G.Settings.get('keepSellHex'),
        dialog: G.UI.isOpen('scr-ask') || !!document.querySelector('.ask-window:not(.hidden), #ui-ask:not(.hidden)'),
      };
    });
  const face = (index) => page.locator('#scr-catch .catch-owned-cell').nth(index);
  const away = () => page.mouse.move(960, 60);

  let now = await look();
  ok(!now.left && !now.right, 'no side panel before anything is hovered');
  ok((await page.locator('#scr-catch .catch-owned-cell').count()) === owned.length, 'one face per owned Eevee');

  // ---- hover previews, leaving takes it away; no tooltip ----
  await face(0).hover();
  await sleep(150);
  now = await look();
  ok(!!now.right && owned.includes(now.right.uid), 'hovering a face previews its panel on the right');
  ok(!now.tip, 'no tooltip shows on a face');
  const previewed = now.right && now.right.uid;
  await away();
  await sleep(150);
  now = await look();
  ok(!now.right, 'leaving the face takes the preview away');

  // ---- a click pins; another face previews over the pin; the pin comes back ----
  await face(0).click();
  await away();
  await sleep(150);
  now = await look();
  ok(now.right && now.right.uid === previewed, 'a click pins the face: its panel stays');
  await face(1).hover();
  await sleep(150);
  now = await look();
  ok(now.right && now.right.uid !== previewed, 'hovering another face previews it over the pin');
  await away();
  await sleep(150);
  now = await look();
  ok(now.right && now.right.uid === previewed, 'leaving it brings the pinned panel back');
  const pinnedCopy = await page.evaluate((uid) => G.Copies.get(G.DB.save, uid), previewed);
  ok(
    now.right && now.right.text.includes(pinnedCopy.natureName) && now.right.text.includes(pinnedCopy.abilityName),
    'the owned panel names its nature and ability'
  );
  await shot('catch-detail-pinned.png');

  // ---- the lock mark switches and saves ----
  await page.click('#scr-catch .catch-side [data-mark="lock"]');
  await sleep(150);
  const locked = await page.evaluate((uid) => G.Copies.get(G.DB.save, uid).isLocked, previewed);
  ok(locked === !pinnedCopy.isLocked, 'the lock mark switches the copy in the save');

  // ---- Hex flips only this screen's setting ----
  await page.click('#scr-catch .catch-side .toggle-power');
  await sleep(150);
  now = await look();
  ok(now.hex === true && now.otherHex === false, 'Hex flips catchHex only');

  // ---- Esc unpins first, and does not ask to let go ----
  await away();
  await page.keyboard.press('Escape');
  await sleep(200);
  await page.mouse.move(900, 50, { steps: 4 }); // back to the mouse (past its jitter guard): the keys' cursor rests on the face
  await sleep(150);
  now = await look();
  ok(!now.right, 'Esc unpins the face');
  ok(now.open && !now.dialog, 'that Esc does not ask to let go');

  // ---- Detail: the wild copy's panel, remembered ----
  await page.click('#scr-catch [data-cursor-id="detail"]');
  await sleep(200);
  now = await look();
  const wild = await page.evaluate(() => G.Copies.read(G.Catch.session.copy, G.DB.save));
  ok(now.detail === true, 'Detail is remembered on this device');
  ok(
    now.left && now.left.text.includes(wild.natureName) && now.left.text.includes(wild.abilityName),
    'Detail shows the wild copy: its own nature and ability'
  );
  ok(now.left && !owned.includes(now.left.uid), 'the wild copy is not one of the owned ones');
  await shot('catch-detail-wild.png');

  // ---- the keys: Left from the belts reaches Detail ----
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await sleep(150);
  const onDetail = await page.evaluate(
    () =>
      !!document.querySelector(
        '#scr-catch .catch-detail .toggle-power.is-cursor, #scr-catch .catch-side .toggle-power.is-cursor'
      )
  );
  ok(onDetail, 'Left from the belts reaches Detail and the wild panel');

  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  console.log(fail ? 'smoke-catch-detail: ' + fail + ' FAIL' : 'smoke-catch-detail: all passed');
  process.exit(fail ? 1 : 0);
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
