// tools/smoke-pause-inventory.js: headless browser check for #90, the pause menu's Run Inventory and held item moves
// (spec docs/PAUSE-MENU.md sections 3 and 4). A check, not a harness: tools/check.js only syntax-checks it, since it needs
// a browser. Playwright is NOT a repo dependency (PLAYWRIGHT_DIR, as in tools/smoke-gym.js). Usage from the repo root:
//   node tools/smoke-pause-inventory.js [folder for screenshots]
// Runs dev.html?dev over file:// (how Jess plays), starts a solo run and uses the real mouse and keys:
//   the run screen berry bag is the tight grid with no names; the inventory is three 2x2 grids with no frame and no
//   labels, locked slots dimmed to match the bought berry and team item slots, hover tooltips with name and effect;
//   the held slot is a square only with a tooltip; a drag from the held slot to the pocket takes the item off (its effect
//   ends); a drop anywhere else returns it; Esc and Resume with the pocket full ask inside the ball (buttons out, the
//   prompt in, the pocket pulsing); No brings the buttons back; click then click gives from the pocket to a teammate who
//   holds an item (the two swap, effects exact); Esc while carrying returns the item and does not ask; a drag from the
//   pocket onto the held slot gives; pocket slots reorder; Destroy empties the pocket and resumes; an empty pocket
//   resumes at once.
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
const ok = (condition, message) => {
  console.log((condition ? 'ok    ' : 'FAIL  ') + message);
  if (!condition) fail++;
};
const FULL_MS = 600; // the menu's opening or closing, plus slack
const SLIDE_MS = 350; // the in-ball prompt's slides, plus slack

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
  await page.waitForFunction(() => window.G && G.Game && G.DB && G.PauseMenu && G.PauseInventory, null, {
    timeout: 30000,
  });
  ok(await page.evaluate(() => G.PauseInventory.ready), 'the inventory module is ready');
  await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    const t = document.getElementById('tap-start');
    if (t && !t.classList.contains('hidden')) t.click(); // headless cannot play sound: pass "press to start" first
    const s = G.DB.save;
    s.team = [{ dex: 7, shiny: false }, { dex: 1, shiny: false }, null, { dex: 4, shiny: false }, null, null];
    s.partner = 7;
    s.partnerShiny = false;
    s.berrySlots = 2;
    s.runSlots = 2;
  });
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 15000 });
  const base = await page.evaluate(() => {
    G.Spawner.update = () => {}; // test page only: no wild spawns
    G.EnemyMgr.clear();
    window.__keep = setInterval(() => {
      const pl = G.Game.player;
      if (pl && !pl.dead) pl.hp = pl.maxHp; // nothing ends the run mid-check
    }, 50);
    const lead = G.Game.player,
      second = G.Game.roster.find((member) => member.teamSlot === 1);
    window.__lead = lead;
    window.__second = second;
    const plain = { leadPhys: lead.physMul, secondCd: second.cdMul, secondPhys: second.physMul };
    lead.equip('choiceband');
    second.equip('quickclaw');
    lead.berries.push('cheri');
    lead.runItems.push('amuletcoin');
    return plain;
  });
  await sleep(200);

  // ---- the run screen berry bag: the tight grid, no names ----
  const bag = await page.evaluate(() => {
    const grid = document.querySelector('.hud-berry-bag .hud-item-grid');
    return {
      grid: !!grid,
      gap: grid ? getComputedStyle(grid).rowGap : null,
      slots: grid ? grid.querySelectorAll('.hud-grid-slot').length : 0,
      names: document.querySelectorAll('.hud-berry-name').length,
    };
  });
  ok(bag.grid && bag.gap === '20px', 'run screen berry bag is the tight grid, 20 px gaps (got ' + bag.gap + ')');
  ok(bag.slots === 2 && bag.names === 0, 'only the 2 bought slots, no names (' + bag.slots + ', ' + bag.names + ')');

  const key = async (name, wait = 0) => {
    await page.keyboard.down(name);
    await sleep(60);
    await page.keyboard.up(name);
    if (wait) await sleep(wait);
  };
  const centre = (selector) =>
    page.$eval(selector, (element) => {
      const r = element.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  const drag = async (fromSelector, to) => {
    const from = await centre(fromSelector),
      target = typeof to === 'string' ? await centre(to) : to;
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
    await sleep(80);
  };
  const clickAt = async (selector) => {
    const at = await centre(selector);
    await page.mouse.click(at.x, at.y);
    await sleep(80);
  };
  const state = () =>
    page.evaluate(() => {
      const lead = window.__lead,
        second = window.__second,
        team = lead.team;
      const layer = document.querySelector('.pm-buttons');
      return {
        game: G.Game.state,
        open: G.PauseMenu.isOpen(),
        leadItem: lead.item,
        secondItem: second.item,
        leadPhys: lead.physMul,
        secondPhys: second.physMul,
        secondCd: second.cdMul,
        pocket: team.pocket.map((entry) => (entry ? entry.id : null)),
        asking: layer.classList.contains('pm-asking-pocket'),
        pulsing: document.querySelector('.pause-menu').classList.contains('pm-pocket-asking'),
        carrying: G.PauseInventory.isCarrying(),
      };
    });
  const shot = async (name) => {
    if (shotDir) await page.screenshot({ path: path.join(shotDir, name) });
  };

  // ---- open the menu ----
  await key('Escape', FULL_MS);
  let now = await state();
  ok(now.open && now.game === 'paused', 'the menu is open');
  await shot('inventory-open.png');

  // ---- the inventory: three grids, no frame, no labels, locked slots dimmed ----
  const inventory = await page.evaluate(() => {
    const panel = document.querySelector('.pm-panel-inventory');
    const grids = ['berries', 'run-items', 'pocket'].map((name) => {
      const slots = [...document.querySelectorAll('.pm-inv-' + name + ' .hud-grid-slot')];
      return {
        count: slots.length,
        filled: slots.map((slot) => slot.classList.contains('is-filled')),
        locked: slots.map((slot) => slot.classList.contains('is-locked')),
      };
    });
    const tipsHidden = [...panel.querySelectorAll('.hud-grid-tip')].every(
      (tip) => getComputedStyle(tip).display === 'none'
    );
    const visibleText = [...panel.querySelectorAll('.hud-text')].filter(
      (text) => !text.closest('.hud-grid-tip')
    ).length;
    return {
      grids,
      background: getComputedStyle(panel).backgroundColor,
      border: getComputedStyle(panel).borderTopWidth,
      tipsHidden,
      visibleText,
    };
  });
  ok(
    inventory.grids.every((grid) => grid.count === 4),
    'three grids of 4 slots'
  );
  ok(
    inventory.background === 'rgba(0, 0, 0, 0)' && inventory.border === '0px',
    'no panel frame (' + inventory.background + ', ' + inventory.border + ')'
  );
  ok(inventory.visibleText === 0 && inventory.tipsHidden, 'no labels: only hidden tooltips carry text');
  ok(
    inventory.grids[0].filled.join() === 'true,false,false,false' &&
      inventory.grids[0].locked.join() === 'false,false,true,true',
    'berries: one stored, slots 3 and 4 dimmed (2 bought)'
  );
  ok(
    inventory.grids[1].filled.join() === 'true,false,false,false' &&
      inventory.grids[1].locked.join() === 'false,false,true,true',
    'run items: one carried, slots 3 and 4 dimmed (2 bought)'
  );
  ok(
    inventory.grids[2].locked.every((locked) => !locked) && inventory.grids[2].filled.every((filled) => !filled),
    'pocket: 4 open slots, empty'
  );

  // tooltips
  await page.hover('.pm-inv-berries .hud-grid-slot.is-filled');
  await sleep(60);
  const berryTip = await page.$eval('.pm-inv-berries .hud-grid-slot.is-filled .hud-grid-tip', (tip) => ({
    shown: getComputedStyle(tip).display !== 'none',
    text: tip.textContent,
  }));
  ok(berryTip.shown && berryTip.text.includes('Cheri Berry'), 'berry tooltip shows its name on hover');
  await page.hover('.pm-inv-run-items .hud-grid-slot.is-filled');
  await sleep(60);
  ok(
    (await page.$eval('.pm-inv-run-items .hud-grid-slot.is-filled .hud-grid-tip', (tip) => tip.textContent)).includes(
      'Amulet Coin'
    ),
    'run item tooltip shows its name'
  );

  // the held slot: the square only, a tooltip
  const held = await page.evaluate(() => ({
    filled: !!document.querySelector('.pm-detail-held .hud-grid-slot.is-filled'),
    names: document.querySelectorAll('.pm-held-name').length,
    buttons: document.querySelectorAll('.pm-detail-held button').length,
  }));
  ok(held.filled && held.names === 0 && held.buttons === 0, 'held slot: the square only, no name, no buttons');
  await page.hover('.pm-detail-held .hud-grid-slot');
  await sleep(60);
  ok(
    (await page.$eval('.pm-detail-held .hud-grid-tip', (tip) => tip.textContent)).includes('Choice Band'),
    'held item tooltip shows its name'
  );

  // ---- drag the held item into the pocket: it comes off ----
  await drag('.pm-detail-held .hud-grid-slot', '.pm-inv-pocket .hud-grid-slot:nth-child(1)');
  now = await state();
  ok(
    now.leadItem === null && now.pocket[0] === 'choiceband' && Math.abs(now.leadPhys - base.leadPhys) < 1e-9,
    'drag held to pocket: the item is in the pocket and its effect is off'
  );
  ok(
    await page.evaluate(() => !document.querySelector('.pm-detail-held .hud-grid-slot.is-filled')),
    'the held slot shows empty'
  );

  // ---- a drop anywhere else returns it ----
  await drag('.pm-inv-pocket .hud-grid-slot:nth-child(1)', { x: 960, y: 700 });
  now = await state();
  ok(now.pocket[0] === 'choiceband' && now.leadItem === null && !now.carrying, 'a drop on nothing returns the item');

  // ---- Esc with the pocket full asks inside the ball ----
  await key('Escape', SLIDE_MS);
  now = await state();
  ok(now.open && now.game === 'paused' && now.asking, 'Esc with items in the pocket asks; the menu stays');
  const prompt = await page.evaluate(() => {
    const ball = document.querySelector('.pm-centre').getBoundingClientRect(),
      middle = ball.left + ball.width / 2;
    const near = (selector) => {
      const r = document.querySelector(selector).getBoundingClientRect();
      return Math.abs(r.left + r.width / 2 - middle) < 120;
    };
    const mainOut = [...document.querySelectorAll('.pm-buttons > .pm-button')].every((button) => {
      const r = button.getBoundingClientRect();
      return Math.abs(r.left + r.width / 2 - middle) > 300;
    });
    const focused = document.querySelector('.pm-pocket-ask .pm-button.focused');
    return {
      header: document.querySelector('.pm-pocket-header').textContent.trim(),
      headerIn: near('.pm-pocket-header'),
      destroyIn: near('[data-action="pocket-destroy"]'),
      noIn: near('[data-action="pocket-no"]'),
      mainOut,
      focus: focused ? focused.textContent.trim() : null,
      pulse: getComputedStyle(document.querySelector('.pm-inv-pocket .hud-grid-slot.is-filled')).animationName,
      emptyPulse: getComputedStyle(document.querySelector('.pm-inv-pocket .hud-grid-slot:not(.is-filled)'))
        .animationName,
    };
  });
  ok(prompt.header === 'Destroy Items in Pocket?' && prompt.headerIn, 'the header chases into the ball');
  ok(prompt.destroyIn && prompt.noIn, 'Destroy and No are in the ball');
  ok(prompt.mainOut, 'all three buttons slid out');
  ok(prompt.focus === 'No', 'No has the focus first (' + prompt.focus + ')');
  ok(
    prompt.pulse === 'pm-pocket-pulse' && prompt.emptyPulse === 'none',
    'only the filled pocket slots pulse (' + prompt.pulse + ', ' + prompt.emptyPulse + ')'
  );
  await shot('inventory-prompt.png');

  // No brings the buttons back
  await page.click('[data-action="pocket-no"]');
  await page.mouse.move(5, 5);
  await sleep(SLIDE_MS);
  now = await state();
  ok(!now.asking && !now.pulsing && now.open, 'No brings the buttons back, the pulse stops');

  // Resume asks too
  await page.click('.pm-button[data-action="resume"]');
  await sleep(SLIDE_MS);
  now = await state();
  ok(now.asking && now.open, 'Resume with items in the pocket asks');
  await key('Escape', SLIDE_MS);
  now = await state();
  ok(!now.asking && now.open, 'Esc answers No');

  // ---- click, then click: give from the pocket to a teammate who holds an item (they swap) ----
  await clickAt('.pm-inv-pocket .hud-grid-slot:nth-child(1)');
  now = await state();
  ok(now.carrying, 'a click picks the item up');
  ok(await page.evaluate(() => !!document.querySelector('.pm-carry-ghost')), 'the ghost follows the pointer');
  await clickAt('.pm-team-card[data-drop="team:1"]');
  now = await state();
  ok(
    now.secondItem === 'choiceband' && now.pocket[0] === 'quickclaw' && !now.carrying,
    'a second click on a teammate gives it; its old item takes the pocket slot'
  );
  ok(
    Math.abs(now.secondPhys - base.secondPhys * 1.4) < 1e-9 && Math.abs(now.secondCd - base.secondCd) < 1e-9,
    'the swap keeps the effects exact (Choice Band on, Quick Claw off)'
  );

  // ---- Esc while carrying returns the item and does not ask ----
  await clickAt('.pm-inv-pocket .hud-grid-slot:nth-child(1)');
  await key('Escape', 100);
  now = await state();
  ok(
    !now.carrying && !now.asking && now.open && now.pocket[0] === 'quickclaw',
    'Esc while carrying returns the item, no prompt'
  );

  // ---- drag from the pocket onto the held slot gives it to the shown Pokemon ----
  await drag('.pm-inv-pocket .hud-grid-slot:nth-child(1)', '.pm-detail-held .hud-grid-slot');
  now = await state();
  ok(now.leadItem === 'quickclaw' && now.pocket.every((id) => id === null), 'drag pocket to held slot gives it');

  // ---- pocket slots reorder ----
  await drag('.pm-detail-held .hud-grid-slot', '.pm-inv-pocket .hud-grid-slot:nth-child(3)');
  await drag('.pm-inv-pocket .hud-grid-slot:nth-child(3)', '.pm-inv-pocket .hud-grid-slot:nth-child(2)');
  now = await state();
  ok(now.pocket.join() === ',quickclaw,,' && now.leadItem === null, 'a drag between pocket slots moves it');

  // ---- Destroy empties the pocket and resumes ----
  await page.click('.pm-button[data-action="resume"]');
  await sleep(SLIDE_MS);
  await page.click('[data-action="pocket-destroy"]');
  await sleep(FULL_MS);
  now = await state();
  ok(
    now.pocket.every((id) => id === null) && !now.open && now.game === 'playing',
    'Destroy empties the pocket and resumes (' + now.game + ')'
  );

  // ---- an empty pocket resumes at once ----
  await key('Escape', FULL_MS);
  await key('Escape', FULL_MS);
  now = await state();
  ok(!now.open && now.game === 'playing', 'with an empty pocket Esc resumes as before');

  await page.evaluate(() => clearInterval(window.__keep));
  ok(errs.length === 0, 'no page or console errors' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  if (notes.length) console.log('note  known file:// font noise (not a failure): ' + notes.length + ' line(s)');
  await browser.close();
  console.log(fail ? 'smoke-pause-inventory: ' + fail + ' FAILED' : 'smoke-pause-inventory: all passed');
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
