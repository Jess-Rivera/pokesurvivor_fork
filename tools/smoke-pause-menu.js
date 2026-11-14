// tools/smoke-pause-menu.js: headless browser check for the Poke Ball pause menu (#82, slices #88 and #89; spec docs/PAUSE-MENU.md).
// A check, not a harness: tools/check.js only syntax-checks it, since it needs a browser. Playwright is NOT a repo
// dependency (PLAYWRIGHT_DIR, as in tools/smoke-gym.js). Usage from the repo root:
//   node tools/smoke-pause-menu.js [folder for screenshots]
// Runs dev.html?dev over file:// (how Jess plays), starts a solo run and presses real keys and clicks:
//   pause stops the run clock; the opening steps play in order; circle, ball, three buttons and four panels show;
//   the HUD overlay steps aside; Up / Down and hover move the green focus; Esc closes with the clock still stopped
//   until the menu is gone; Esc mid-close turns it around; Resume resumes; Settings opens over the menu and Esc
//   returns to it; End Run asks inside the ball: Resume and Settings slide off opposite sides, End (red) and No
//   (white, focused) chase in behind Settings into its row; Move_Left / Move_Right switch (End keeps its red rim, its
//   body goes dark red); Esc, Enter on No and a click on No bring the buttons back; End ends the run.
//   #89: either Enter key presses the green button once, even after a click; the detail panel shows the shown
//   Pokemon's name, level, HP numbers and fill, type coloured bars, the hex layers and every move; the arrows,
//   Move_Left / Move_Right and team card clicks change it; missing members are empty frames.
//   F2 (2026-11-12): fully open, the world is held still and the HUD is hidden and unread; a resize or a setting
//   change redraws one frame; after closing both run again.
//   #91-2: Run Info, seeded through G.Debug.runinfo / regionbest / recordcheck: every section in order, the empty
//   and full presets, the move name on Biggest hit, a tie, the bar dragged and the wheel, the pinned header, the reopen
//   at the top, Region Best's Best / Next / Pace, clear and old, a dry and a written recordcheck.
//   #91-3: the Run Stats box: its twelve rows, the shown Pokemon's numbers on next and a card click, a compact
//   Damage, no row overflowing, the box scrolling at 200 px, the Statuses hover.
//   #83: Cards Taken, seeded through G.Debug.cards: its 400 px box, takenBy's rows (Vitamins by name), no row
//   overflowing, the move tooltip's "Cards:" line, the Gate and Bench Regeneration hovers.
//   Tooltips (Jess, 2026-11-12: every hover tooltip is the topmost layer): each is read from the stage's shared
//   tooltip layer and must be the top element across its box: every hex corner, Statuses, Cards Taken's Gate and
//   Bench Regeneration, the last move (over the team cards, 16 px clear of both side panels); leaving or scrolling hides.
//   #92 Run Review: after End, the results screen's Team button reopens the menu read-only: one Back button, Run Info,
//   detail and team panels, no Run Inventory, no drop places, a move tooltip on top, Move_Right steps; Esc, Enter and a
//   click on Back each return to End Run; the next run's pause menu is the full one again.
//   #103 End Run: a quit with EVs seeded shows "EXPEDITION OVER" (Michroma) with Run Review and Return Home (no EVs on
//   quit), the HUD and old card hidden, Esc does nothing, Left / Right move the focus, Run Review comes back here,
//   Return Home goes to the menu; a fall with EVs offers Learn from the Loss, which opens the EV screen.
//   #104 the EV screen: six circles (empty for a slot with no copy), x / 510, all six rows in the hex order, the bank in
//   the left column; + gives 1 (white stays, yellow +N), greys at 252, at 510 and with nothing left; Shift-click gives 10
//   (cut to what is left); holding repeats; - takes back; Esc does nothing; Learn asks with EVs left, Cancel stays, Yes
//   saves exactly the adds; a third run's Go Home asks, Cancel stays, Yes saves nothing.
//   #104b the shared stage fit: the pause menu, End Run and EV screen stages scale to the window and back.
//   #104c Learn: the shared toast "Lessons Learned, Returning Home" (Michroma, the main menu bars' charcoal and teal
//   rim) with the EVs already saved and the screen up but deaf, then home after about 2 s; the bad tone's red rim;
//   the toast stays centred while it pops in (it used to show right of centre, then snap).
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
const FULL_MS = 600; // the whole opening is 0.23 s (OPEN_MS) and the closing 0.16 s (CLOSE_MS), plus slack
const SLIDE_MS = 350; // End Run's question: 0.15 s slides, the chasers 0.05 s behind, plus slack

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
    s.team = [{ dex: 7, shiny: false }, { dex: 1, shiny: false }, null, { dex: 4, shiny: false }, null, null]; // a gap: empty frames
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
  // the 1920x1080 stage's fit (the kit's fitToStage, #104b): --pm-scale on a screen's root
  const stageScale = (selector) =>
    page.evaluate((sel) => Number(document.querySelector(sel).style.getPropertyValue('--pm-scale')), selector);
  const checkStageScale = async (selector, label) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await sleep(120);
    const small = await stageScale(selector);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await sleep(120);
    const full = await stageScale(selector);
    ok(
      Math.abs(small - 2 / 3) < 0.001 && full === 1,
      label + ' fits the window: ' + small.toFixed(3) + ' at 1280 x 720, ' + full + ' at 1920 x 1080'
    );
  };
  // The shown tooltip, read from the menu's shared tooltip layer (Jess, 2026-11-12: every hover tooltip is the topmost
  // layer): its name and lines, whether the layer is the stage's last child, and how many sample points across the
  // tooltip's box are covered by something else (0 = on top everywhere). Points off the window are not sampled.
  const tipNow = () =>
    page.evaluate(() => {
      const tip = document.querySelector('.hud-tip-layer .hud-tip');
      if (!tip) return null;
      const box = tip.getBoundingClientRect();
      tip.style.pointerEvents = 'auto'; // elementFromPoint skips pointer-events: none
      let covered = 0,
        sampled = 0;
      for (let across = 0.02; across < 1; across += 0.08)
        for (let down = 0.1; down < 1; down += 0.2) {
          const x = box.left + box.width * across,
            y = box.top + box.height * down;
          if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
          sampled++;
          if (!tip.contains(document.elementFromPoint(x, y))) covered++;
        }
      tip.style.pointerEvents = '';
      const name = tip.querySelector('.hud-tip-name');
      return {
        name: name ? name.textContent.trim() : '',
        lines: [...tip.querySelectorAll('.hud-tip-line')].map((line) => line.textContent.trim()),
        covered,
        sampled,
        last: document.querySelector('.pm-stage').lastElementChild === tip.parentElement,
        left: box.left,
        right: box.right,
      };
    });
  const onTop = (tip) => !!tip && tip.last && tip.sampled > 0 && tip.covered === 0;
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
        buttons: [...document.querySelectorAll('.pm-buttons > .pm-button')].map((b) => b.textContent.trim()),
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
  // step 1 lasts only 55 ms: catch the steps the moment the menu opens (recorded in the page, no round trip)
  await page.evaluate(() => {
    window.__firstSteps = null;
    const watch = () => {
      const layer = document.querySelector('.pause-menu');
      if (G.PauseMenu.isOpen()) window.__firstSteps = [1, 2].filter((n) => layer.classList.contains('pm-step' + n));
      else requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  });
  await key('Escape');
  let s = await look();
  const firstSteps = await page.evaluate(() => window.__firstSteps || []);
  ok(s.state === 'paused' && s.open && !s.oldScreen, 'Escape pauses and shows the Poke Ball menu, not the old sheet');
  ok(firstSteps.join(',') === '1', 'mid-opening: step 1 (dim, closed ball) plays first (' + firstSteps.join(',') + ')');
  ok(s.centreButton, 'the top cap carries the white centre button');
  await shot('pause-menu-closed-ball.png');
  await page.waitForFunction(() => G.PauseMenu.isFullyOpen(), null, { timeout: 3000 });
  const openMs = Date.now() - openedAt;
  await sleep(80); // the last transitions settle a frame or two after the step timer
  ok(openMs >= 180 && openMs <= 500, 'opening takes about 0.23 s (' + openMs + ' ms, key press included)');
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

  // ---- F2: the world held still behind the fully open menu (2026-11-12) ----
  // counts world frames (G.Projectiles.draw runs once per render) and HUD reads (G.HudOverlay.sync)
  await page.evaluate(() => {
    window.__drawn = { world: 0, hud: 0 };
    const draw = G.Projectiles.draw,
      sync = G.HudOverlay.sync;
    G.Projectiles.draw = function () {
      window.__drawn.world++;
      return draw.apply(this, arguments);
    };
    G.HudOverlay.sync = function () {
      window.__drawn.hud++;
      return sync.apply(this, arguments);
    };
  });
  const countFor = async (ms) => {
    await page.evaluate(() => (window.__drawn = { world: 0, hud: 0 }));
    await sleep(ms);
    return page.evaluate(() => window.__drawn);
  };
  const hudVisibility = () => page.evaluate(() => getComputedStyle(document.querySelector('.hud-overlay')).visibility);
  await sleep(150); // the HUD hides once its 75 ms fade ends
  let drawn = await countFor(300);
  ok(drawn.world === 0 && drawn.hud === 0, 'fully open: no world redraw, no HUD read (' + JSON.stringify(drawn) + ')');
  ok((await hudVisibility()) === 'hidden', 'fully open: the run HUD is hidden, not only see-through');
  // the menu's grids use the HUD's shared patterns: they must stay visible while the HUD layer is hidden
  const patternVisibility = await page.evaluate(() => {
    const square = document.querySelector('#hud-slot-grid rect');
    return square ? getComputedStyle(square).visibility : 'missing';
  });
  ok(patternVisibility === 'visible', 'fully open: the shared grid patterns stay visible (' + patternVisibility + ')');
  await page.evaluate(() => (window.__drawn = { world: 0, hud: 0 }));
  await page.setViewportSize({ width: 1600, height: 900 });
  await sleep(200);
  drawn = await page.evaluate(() => window.__drawn);
  ok(drawn.world >= 1 && drawn.hud === 0, 'a resize while open redraws the world (' + drawn.world + '), no HUD read');
  const menuScale = await stageScale('.pause-menu');
  ok(Math.abs(menuScale - 900 / 1080) < 0.001, 'the pause menu stage fits 1600 x 900 (' + menuScale.toFixed(3) + ')');
  drawn = await countFor(300);
  ok(drawn.world === 0, 'then the world is held still again (' + drawn.world + ')');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(200);
  ok((await stageScale('.pause-menu')) === 1, 'the pause menu stage is back to 1 at 1920 x 1080');
  await page.evaluate(() => {
    window.__drawn = { world: 0, hud: 0 };
    const vignette = G.Settings.get('vignette');
    G.Settings.set('vignette', !vignette);
    G.Settings.set('vignette', vignette); // back as it was
  });
  await sleep(150);
  drawn = await page.evaluate(() => window.__drawn);
  ok(drawn.world >= 1, 'a setting changed while open redraws the world (' + drawn.world + ')');

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
  drawn = await countFor(300);
  ok(
    drawn.world > 0 && drawn.hud > 0,
    'after closing: the world draws and the HUD reads again (' + JSON.stringify(drawn) + ')'
  );
  ok((await hudVisibility()) === 'visible', 'after closing: the run HUD is visible');

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

  // ---- Enter, either key, presses the green button even after a click (#89: the Enter bug from #88) ----
  // Settings was just clicked: a page button holding the browser's focus used to turn Enter into a click on itself.
  const pressed = async (enterKey, buttonsDown) => {
    await page.mouse.move(5, 5); // off the buttons: a reopening menu under the pointer takes the focus by hover
    await sleep(60);
    for (let n = 0; n < buttonsDown; n++) await key('ArrowDown', 60);
    await key(enterKey, 300);
    return look();
  };
  s = await look();
  ok(s.focus === 'Settings', 'after the Settings click, Settings has the green focus');
  s = await pressed('Enter', 1); // Settings -> Resume
  ok(!s.settings && (s.closing || !s.open), 'main Enter on Resume (after a click) resumes, not the clicked button');
  await page.waitForFunction(() => !G.PauseMenu.isOpen(), null, { timeout: 3000 });
  await key('Escape', FULL_MS);
  s = await pressed('NumpadEnter', 1); // Resume -> End Run
  ok(
    (await page.evaluate(() => G.PauseMenu.isAsking())) && s.fully,
    'number pad Enter on End Run asks once (it stays asking)'
  );
  await key('Escape', SLIDE_MS);
  await page.click('.pm-button[data-action="settings"]');
  await sleep(200);
  await key('Escape', 300);
  await page.mouse.move(5, 5);
  s = await pressed('Enter', 2); // Settings -> Resume -> End Run
  ok(
    (await page.evaluate(() => G.PauseMenu.isAsking())) && !s.settings,
    'main Enter on End Run after a Settings click asks once, Settings stays shut'
  );
  await key('Escape', SLIDE_MS);
  ok(
    await page.evaluate(() => !document.querySelector('.pause-menu').contains(document.activeElement)),
    'no menu button holds the page focus'
  );

  // ---- the Pokemon detail panel and the team panel (#89) ----
  const panel = () =>
    page.evaluate(() => {
      const detail = document.querySelector('.pm-detail'),
        fill = detail.querySelector('.hud-lifebar-fill');
      const match = /scaleX\(([0-9.]+)\)/.exec((fill && fill.style.transform) || '');
      const member = G.Game.roster.find((m) => m.teamSlot === +detail.dataset.slot);
      const cards = [...document.querySelectorAll('.pm-team-card')];
      return {
        slot: +detail.dataset.slot,
        activeSlot: G.Game.player.teamSlot,
        name: detail.querySelector('.pm-detail-name').textContent,
        level: detail.querySelector('.pm-detail-lv').textContent,
        hpText: detail.querySelector('.pm-detail-hp').textContent.trim(),
        hpFill: match ? +match[1] : null,
        hpFraction: member.hp / member.maxHp,
        expected: {
          name: member.mon.name,
          level: String(member.level),
          hp: Math.ceil(member.hp) + ' / ' + Math.round(member.maxHp),
          moves: (member.slots.length ? member.slots : member.moves.map((move) => [move])).flat().length,
          topType: G.U.TYPE_COLOR[member.mon.types[0]],
          bottomType: G.U.TYPE_COLOR[member.mon.types[1] || member.mon.types[0]],
        },
        topColour: detail.querySelector('.pm-detail-top').getAttribute('fill'),
        bottomColour: detail.querySelector('.pm-detail-bottom').getAttribute('fill'),
        layers: ['start', 'now', 'run'].filter((layer) => detail.querySelector('.pm-hex-' + layer)),
        hexStats: [...detail.querySelectorAll('.pm-hex-label')].map((label) => label.dataset.stat),
        moveRows: detail.querySelectorAll('.pm-move').length,
        cards: cards.length,
        empties: document.querySelectorAll('.pm-team-empty').length,
        shownFaces: cards.filter((card) => card.querySelector('.pm-face-shown')).length,
        teamShown: +document.querySelector('.pm-team').dataset.shown,
      };
    });
  const filled = await page.evaluate(() =>
    G.Game.roster.map((member) => member.teamSlot).sort((first, second) => first - second)
  );
  let p = await panel();
  ok(p.slot === p.activeSlot, 'the detail panel opens on the Pokemon on the field (slot ' + p.slot + ')');
  ok(p.name === p.expected.name && p.level === p.expected.level, 'name and level: ' + p.name + ', Lv ' + p.level);
  ok(p.hpText === p.expected.hp, 'HP numbers: ' + p.hpText);
  ok(
    p.hpFill != null && Math.abs(p.hpFill - p.hpFraction) < 0.02,
    'HP bar fill matches current / max (' + p.hpFill + ' vs ' + p.hpFraction.toFixed(3) + ')'
  );
  ok(
    p.topColour === p.expected.topType && p.bottomColour === p.expected.bottomType,
    'bars in the type colours (top ' + p.topColour + ', bottom ' + p.bottomColour + ')'
  );
  ok(p.layers.includes('start') && p.layers.includes('now'), 'stat hex: the level 1 shape and the white growth band');
  ok(p.hexStats.join(',') === 'HP,Atk,Def,Spe,SpD,SpA', 'stat hex: six labels clockwise from HP');
  const hexMakeUp = () =>
    page.evaluate(() => {
      const detail = document.querySelector('.pm-detail'),
        member = G.Game.roster.find((m) => m.teamSlot === +detail.dataset.slot);
      const order = { HP: 0, Atk: 1, Def: 2, SpA: 3, SpD: 4, Spe: 5 };
      const keyOf = { 1: 'atk', 2: 'def', 3: 'spa', 4: 'spd', 5: 'spe' };
      const finalOf = (i) =>
        i === 0
          ? Math.round(member.maxHp) // HP: the game's number, after HP_SCALAR
          : Math.round(
              G.Stats.statValue(
                member.mon.stats[i],
                member.level,
                member.statIv(i),
                member.statEv(i),
                member.statNat(i)
              ) *
                (1 + Math.max(0, member.incOf(keyOf[i])))
            );
      const hexBox = detail.querySelector('.pm-hex'),
        centreY = hexBox.offsetHeight / 2 + 4,
        radius = +hexBox.dataset.radius,
        edgePath = hexBox.querySelector('.pm-hex-ring.is-edge').getAttribute('d'),
        edgeLabel = hexBox.querySelector('.pm-hex-edge');
      return {
        texts: [...detail.querySelectorAll('.pm-hex-label')].map((label) => ({
          stat: label.dataset.stat,
          shown: label.querySelector('.pm-hex-value').textContent.trim(),
          expected: String(finalOf(order[label.dataset.stat])),
          expectedTip:
            'Base: ' +
            member.mon.stats[order[label.dataset.stat]] +
            ', IV: ' +
            member.statIv(order[label.dataset.stat]) +
            ', EV: ' +
            member.statEv(order[label.dataset.stat]),
        })),
        edge: +hexBox.dataset.edge,
        edgeLabel: edgeLabel.textContent.trim(),
        // the label sits at the middle of the HP to Atk side, and the outer line starts and ends either side of it
        edgeLabelAt: [parseFloat(edgeLabel.style.left), parseFloat(edgeLabel.style.top)],
        sideMiddle: [
          hexBox.offsetWidth / 2 + (radius * Math.cos(-Math.PI / 6)) / 2,
          centreY - radius / 2 - (radius * 0.5) / 2,
        ],
        edgeOpen: !/Z\s*$/.test(edgePath),
        hpStartReach:
          (centreY - +hexBox.querySelector('.pm-hex-start').getAttribute('points').split(/[ ,]/)[1]) / radius,
        startFill: detail.querySelector('.pm-hex-start').style.fill,
        typeColour: G.U.TYPE_COLOR[member.mon.types[0]],
      };
    });
  let hex = await hexMakeUp();
  ok(
    hex.texts.every((text) => text.shown === text.expected),
    'stat hex corners show the final stats (HP the game number): ' + hex.texts.map((text) => text.shown).join(', ')
  );
  // each corner's hover: the copy's make-up, in the shared layer, on top (HP's opens down over Atk and SpA)
  const cornerTips = [];
  for (const text of hex.texts) {
    await page.hover('.pm-hex-label[data-stat="' + text.stat + '"]');
    await sleep(60);
    const shown = await tipNow();
    cornerTips.push({
      stat: text.stat,
      line: shown ? shown.lines.join(' | ') : '',
      want: text.expectedTip,
      top: onTop(shown),
    });
  }
  ok(
    cornerTips.every((corner) => corner.line === corner.want),
    'each corner hover reads ' + cornerTips[0].line
  );
  ok(
    cornerTips.every((corner) => corner.top),
    'every corner tooltip is on top (' +
      cornerTips
        .filter((corner) => !corner.top)
        .map((corner) => corner.stat)
        .join(', ') +
      ')'
  );
  await page.mouse.move(5, 5);
  await sleep(60);
  ok((await tipNow()) === null, 'leaving a corner hides its tooltip');
  // sized for the widest labels: a 4 digit stat and "+100%" on the side corners stay inside the hex box
  const savedForFit = await page.evaluate(() => {
    const member = G.Game.player,
      saved = { maxHp: member.maxHp, atk: member.inc.atk, spa: member.inc.spa };
    member.maxHp = 9999;
    member.inc.atk += 1;
    member.inc.spa += 1;
    G.PauseMenu.hideNow();
    G.PauseMenu.open();
    return saved;
  });
  await sleep(FULL_MS);
  ok(
    await page.evaluate(() => {
      const box = document.querySelector('.pm-box-hex').getBoundingClientRect();
      return [...document.querySelectorAll('.pm-hex-label')].every((label) =>
        [...label.querySelectorAll('.pm-hex-name, .pm-hex-value, .pm-hex-bonus')].every((line) => {
          const r = line.getBoundingClientRect();
          return r.left >= box.left + 4 && r.right <= box.right - 4 && r.top >= box.top && r.bottom <= box.bottom;
        })
      );
    }),
    'with 9999 HP and +100% on Atk and SpA every hex label stays inside its box'
  );
  // #98: on the side corners the +X% is its own line under the number; HP and Spe keep it on the name line
  const bonusPlaces = await page.evaluate(() => {
    const place = (stat) => {
      const label = document.querySelector('.pm-hex-label[data-stat="' + stat + '"]'),
        bonus = label.querySelector('.pm-hex-bonus'),
        value = label.querySelector('.pm-hex-value').getBoundingClientRect();
      if (!bonus) return 'none';
      const r = bonus.getBoundingClientRect();
      if (label.querySelector('.pm-hex-name').contains(bonus)) return 'name';
      return r.top >= value.bottom - 1 ? 'under' : 'elsewhere';
    };
    return { hp: place('HP'), atk: place('Atk'), spa: place('SpA'), def: place('Def') };
  });
  ok(
    bonusPlaces.atk === 'under' && bonusPlaces.spa === 'under' && bonusPlaces.def === 'none',
    'side corners: the +X% sits under the number (' + JSON.stringify(bonusPlaces) + ')'
  );
  await shot('pause-menu-hex-bonus.png');
  ok(bonusPlaces.hp === 'name', 'HP (9999, a run bonus) keeps its +X% beside the name (' + bonusPlaces.hp + ')');
  await page.evaluate((saved) => {
    const member = G.Game.player;
    member.maxHp = saved.maxHp;
    member.hp = Math.min(member.hp, saved.maxHp);
    member.inc.atk = saved.atk;
    member.inc.spa = saved.spa;
    G.PauseMenu.hideNow();
    G.PauseMenu.open();
  }, savedForFit);
  await sleep(FULL_MS);
  ok(hex.edge === 300, 'at level 1 the hex edge is 300 (' + hex.edge + ')');
  ok(
    hex.edgeLabel === '300' &&
      hex.edgeOpen &&
      Math.abs(hex.edgeLabelAt[0] - hex.sideMiddle[0]) < 1.5 &&
      Math.abs(hex.edgeLabelAt[1] - hex.sideMiddle[1]) < 1.5,
    'the edge number sits in a break of the outer line, midway between HP and Atk'
  );
  ok(
    Math.abs(hex.hpStartReach - 0.1) < 0.02,
    'a tiny level 1 stat is drawn at 10% of the radius (' + hex.hpStartReach.toFixed(3) + ')'
  );
  ok(
    await page.evaluate((colour) => {
      const probe = document.createElement('div');
      probe.style.color = colour;
      document.body.appendChild(probe);
      const rgb = getComputedStyle(probe).color;
      probe.remove();
      return document.querySelector('.pm-hex-start').style.fill === rgb;
    }, hex.typeColour),
    'the level 1 shape is in the first type colour'
  );
  ok(p.moveRows === p.expected.moves && p.moveRows > 0, 'move list: every move (' + p.moveRows + ')');
  ok(
    p.cards === filled.length && p.empties === 6 - filled.length,
    'team panel: ' + p.cards + ' cards, ' + p.empties + ' empty frames'
  );
  const teamFrame = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.pm-panel-team'));
    return { background: cs.backgroundColor, border: cs.borderTopWidth, shadow: cs.boxShadow };
  });
  ok(
    teamFrame.background === 'rgba(0, 0, 0, 0)' && teamFrame.border === '0px' && teamFrame.shadow === 'none',
    'team panel: no frame behind the cards (' + JSON.stringify(teamFrame) + ')'
  );
  ok(p.shownFaces === 1 && p.teamShown === p.slot, 'the shown card has the green portrait stroke');
  // the yellow layer: a card's bonus on the shown Pokemon
  await page.evaluate(() => {
    G.Game.player.inc.atk += 0.25;
    G.PauseMenu.hideNow();
    G.PauseMenu.open();
  });
  await sleep(FULL_MS);
  p = await panel();
  ok(p.layers.join(',') === 'start,now,run', 'a card bonus adds the yellow layer');
  ok(
    await page.evaluate(() => /\+25%/.test(document.querySelector('.pm-hex-label[data-stat="Atk"]').textContent)),
    'Atk shows the yellow +25%'
  );
  await shot('pause-menu-detail.png');
  // the edge steps 300, 600, 1000; HP is drawn at mainline size; past 1000 a value clamps to the rim
  const savedMaxHp = await page.evaluate(() => G.Game.player.maxHp);
  const withMainlineHp = async (mainline) => {
    await page.evaluate((value) => {
      G.Game.player.maxHp = value * G.Stats.HP_SCALAR;
      G.PauseMenu.hideNow();
      G.PauseMenu.open();
    }, mainline);
    await sleep(FULL_MS);
    const drawn = await page.evaluate(() => {
      const hexBox = document.querySelector('.pm-hex'),
        top = hexBox
          .querySelector('.pm-hex-run') // the outermost band: its first point is HP's tip
          .getAttribute('d')
          .match(/M[0-9.]+ ([0-9.]+)/)[1];
      return (hexBox.offsetHeight / 2 + 4 - +top) / +hexBox.dataset.radius;
    });
    return { edge: (await hexMakeUp()).edge, reach: drawn };
  };
  for (const [mainline, edge] of [
    [250, 300],
    [400, 600],
    [700, 1000],
    [1500, 1000],
  ]) {
    const seen = await withMainlineHp(mainline),
      reach = Math.min(1, mainline / edge);
    ok(
      seen.edge === edge && Math.abs(seen.reach - reach) < 0.02,
      'a mainline HP of ' + mainline + ': edge ' + seen.edge + ', drawn at ' + seen.reach.toFixed(3) + ' of the radius'
    );
  }
  await page.evaluate((saved) => {
    G.Game.player.maxHp = saved;
    G.Game.player.hp = Math.min(G.Game.player.hp, saved);
    G.PauseMenu.hideNow();
    G.PauseMenu.open();
  }, savedMaxHp);
  await sleep(FULL_MS);
  p = await panel();

  const focusBefore = (await look()).focus; // the reopen above put it back on Resume
  const nextOf = (slot, direction) => filled[(filled.indexOf(slot) + direction + filled.length) % filled.length];
  let before = p.slot;
  await page.click('.pm-arrow[data-step="next"]');
  await sleep(100);
  p = await panel();
  ok(p.slot === nextOf(before, 1) && p.name === p.expected.name, 'next arrow shows the next Pokemon (' + p.name + ')');
  ok(
    p.hpFill != null && Math.abs(p.hpFill - p.hpFraction) < 0.02 && p.hpText === p.expected.hp,
    'its HP bar and numbers follow'
  );
  before = p.slot;
  await page.click('.pm-arrow[data-step="prev"]');
  await sleep(100);
  ok((await panel()).slot === nextOf(before, -1), 'previous arrow goes back');
  before = (await panel()).slot;
  await key('ArrowRight', 100);
  ok((await panel()).slot === nextOf(before, 1), 'Move_Right shows the next Pokemon');
  await key('ArrowLeft', 100);
  await key('ArrowLeft', 100);
  ok((await panel()).slot === nextOf(before, -1), 'Move_Left shows the previous one, wrapping');
  const target = filled[filled.length - 1];
  await page.click('.pm-team-card >> nth=' + (filled.length - 1));
  await sleep(100);
  p = await panel();
  ok(p.slot === target && p.teamShown === target, 'clicking a team card shows that Pokemon (slot ' + target + ')');
  await page.click('.pm-team-empty >> nth=0');
  await sleep(100);
  ok((await panel()).slot === target, 'clicking an empty frame changes nothing');
  ok(
    (await look()).fully && (await look()).focus === focusBefore,
    'the menu stays open, the focus untouched (' + focusBefore + ' then ' + (await look()).focus + ')'
  );

  // ---- #91-2: the Run Info panel (map 91c), seeded through the debug calls; it reads when the menu opens ----
  const reopen = async () => {
    await key('Escape', FULL_MS); // close
    await key('Escape', FULL_MS); // open again: Run Info reads now
  };
  const runInfo = () =>
    page.evaluate(() => {
      const panel = document.querySelector('.pm-info');
      if (!panel) return null;
      const body = panel.querySelector('.hud-scroll-box'),
        rows = {},
        tones = {};
      for (const each of panel.querySelectorAll('.pm-info-row')) {
        const label = each.querySelector('.pm-info-label').textContent.trim(),
          value = each.querySelector('.pm-info-value');
        rows[label] = value.textContent.trim();
        tones[label] = value.className;
      }
      const thumb = panel.querySelector('.hud-scroll-thumb');
      const box = thumb ? thumb.getBoundingClientRect() : null;
      return {
        title: panel.querySelector('.pm-info-run').textContent.trim(),
        sections: [...panel.querySelectorAll('.pm-info-title')].map((each) => each.textContent.trim()),
        rows,
        tones,
        scrollTop: body.scrollTop,
        overflows: body.scrollHeight > body.clientHeight + 1,
        headerTop: Math.round(panel.querySelector('.pm-info-header').getBoundingClientRect().top),
        thumb: box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null,
      };
    });
  const lowestSlot = () =>
    page.evaluate(() => {
      const lead = G.Game.roster.slice().sort((first, second) => first.teamSlot - second.teamSlot)[0];
      return { name: lead.mon.name, move: lead.moves[0] ? lead.moves[0].name : '' };
    });
  await page.evaluate(() => {
    G.Debug.runinfo('empty');
    G.Debug.regionbest('clear');
  });
  await reopen();
  let info = await runInfo();
  ok(info && /RUN$/.test(info.title), 'Run Info shows, headed by the run name (' + (info && info.title) + ')');
  ok(
    info && info.sections.join('|') === 'Progress|Combat|Faints|Statuses inflicted|Loot|EVs earned|Region best',
    'Run Info sections in the 91c order (' + (info && info.sections.join(', ')) + ')'
  );
  ok(info.rows.Faints === '0' && !('Most faints' in info.rows), "runinfo('empty'): Faints 0, its two lines hidden");
  ok('None yet' in info.rows, "runinfo('empty'): Statuses inflicted reads None yet");
  ok(info.rows.Best === 'No record yet' && !('Pace' in info.rows), 'no record: No record yet, no Next or Pace');
  await page.evaluate(() => G.Debug.runinfo('full'));
  await reopen();
  info = await runInfo();
  const lead = await lowestSlot();
  ok(
    info.rows['Biggest hit'].includes(lead.move) && info.rows['Biggest hit'].endsWith('2,450'),
    "runinfo('full'): Biggest hit names its move (" + info.rows['Biggest hit'] + ')'
  );
  const kinds = ['Burn', 'Poison', 'Toxic', 'Paralysis', 'Sleep', 'Freeze', 'Confusion', 'Trap', 'Daze', 'Drowsy'];
  ok(
    kinds.every((kind) => kind in info.rows),
    "runinfo('full'): every status kind shows"
  );
  ok(
    info.rows['Most faints'].startsWith(lead.name) && 'Time fainted' in info.rows,
    'Most faints and Time fainted show'
  );
  ok(
    info.overflows && info.thumb && info.scrollTop === 0,
    'the full panel overflows, shows its bar and opens at the top'
  );
  const headerAt = info.headerTop;
  await page.mouse.move(info.thumb.x, info.thumb.y);
  await page.mouse.down();
  await page.mouse.move(info.thumb.x, info.thumb.y + 120, { steps: 4 });
  await page.mouse.up();
  await sleep(100);
  info = await runInfo();
  ok(
    info.scrollTop > 0 && info.headerTop === headerAt,
    'dragging the bar scrolls the body (DD1); the header stays put'
  );
  await reopen();
  info = await runInfo();
  ok(info.scrollTop === 0, 'it reopens at the top');
  await page.mouse.move(350, 600);
  await page.mouse.wheel(0, 400);
  await sleep(150);
  info = await runInfo();
  ok(info.scrollTop > 0 && info.headerTop === headerAt, 'the wheel scrolls the body; the header stays put');
  await page.evaluate(() => G.Debug.runinfo('tie'));
  await reopen();
  info = await runInfo();
  ok(
    info.rows['Most faints'].startsWith(lead.name),
    "runinfo('tie'): Most faints shows the lower slot (" + info.rows['Most faints'] + ')'
  );
  // the seeded run has 3 gyms by 14:20 and is past 20:00; this record had its 4th gym at 16:40, so the gap is growing
  await page.evaluate(() => G.Debug.regionbest({ loop: 1, gyms: 4, time: 1500, splits: [250, 500, 800, 1000] }));
  await reopen();
  info = await runInfo();
  ok(info.rows.Best === 'Loop 1, Gym 4 cleared, lasted 25:00', 'regionbest({..}): Best reads ' + info.rows.Best);
  ok(info.rows.Next === 'Loop 1, Gym 4 (best got there at 16:40)', 'Next: ' + info.rows.Next);
  ok(
    /^You're behind by /.test(info.rows.Pace) && info.tones.Pace.includes('is-behind'),
    'Pace: behind, red (' + info.rows.Pace + ')'
  );
  for (const arg of ['clear', 'old']) {
    await page.evaluate((how) => G.Debug.regionbest(how), arg);
    await reopen();
    info = await runInfo();
    ok(info.rows.Best === 'No record yet', "regionbest('" + arg + "'): No record yet");
  }
  const dry = await page.evaluate(() => {
    const result = G.Debug.recordcheck();
    return { better: result.better, written: result.written, best: G.Game.regionBest };
  });
  ok(dry.better && !dry.written && dry.best === null, 'recordcheck(): a new best, nothing written');
  const wrote = await page.evaluate(() => {
    const result = G.Debug.recordcheck('write');
    return { written: result.written, best: G.Game.regionBest };
  });
  ok(wrote.written && wrote.best && wrote.best.gyms === 3, "recordcheck('write'): this run is the record now");
  await reopen();
  info = await runInfo();
  ok(
    /^Loop 1, Gym 3 cleared, lasted /.test(info.rows.Best) && info.rows.Pace === 'New best pace',
    'the written record shows'
  );

  // ---- #91-3: the Run Stats box on the detail panel, seeded through runinfo('full') ----
  const statsBox = () =>
    page.evaluate(() => {
      const box = document.querySelector('.pm-box-run-stats'),
        rows = {};
      const rowEls = [...box.querySelectorAll('.pm-stats-row')];
      for (const each of rowEls)
        rows[each.querySelector('.pm-stats-label').textContent.trim()] = each
          .querySelector('.pm-stats-value')
          .textContent.trim();
      const slot = +document.querySelector('.pm-detail').dataset.slot;
      const scroller = box.querySelector('.hud-scroll-box');
      return {
        order: rowEls.map((each) => each.querySelector('.pm-stats-label').textContent.trim()).join('|'),
        rows,
        slot,
        kills: G.RunStats.member(G.Game.runStats, slot).kills,
        overflow: rowEls.some((each) => each.scrollWidth > each.clientWidth + 1),
        scrolls: scroller.scrollHeight > scroller.clientHeight + 1,
        height: Math.round(
          box.getBoundingClientRect().height /
            (document.querySelector('.pm-detail').getBoundingClientRect().height / 1028)
        ),
      };
    });
  await page.evaluate(() => {
    G.Debug.runinfo('full');
    const lead = G.Game.player;
    G.DpsHistory.record(lead.team.dpsHistory, lead, 40000); // a five digit Damage, to read compact
  });
  await reopen();
  let stats = await statsBox();
  ok(
    stats.order === 'Kills|Field|Damage|Share|Best hit|Super eff.|Taken|Healed|Faints|Down|Statuses|DoT dmg',
    'Run Stats box: twelve rows in the 91d order'
  );
  ok(stats.rows.Kills === String(stats.kills), "Run Stats Kills is the shown Pokemon's (" + stats.rows.Kills + ')');
  ok(/^\d+(\.\d)?k$/.test(stats.rows.Damage), 'a five digit Damage reads compact (' + stats.rows.Damage + ')');
  ok(!stats.overflow, 'no Run Stats row overflows the 200 px column');
  ok(stats.scrolls && stats.height === 200, 'the box keeps its 200 px and scrolls its rows (Jess, 2026-11-12)');
  const firstShown = stats.slot;
  await key('ArrowRight', 100);
  stats = await statsBox();
  ok(
    stats.slot !== firstShown && stats.rows.Kills === String(stats.kills),
    "Move_Right: the box shows the next Pokemon's run"
  );
  await page.click('.pm-team-card >> nth=0');
  await sleep(100);
  stats = await statsBox();
  ok(stats.rows.Kills === String(stats.kills), "a team card click: the box shows that Pokemon's run");
  await page.evaluate(() => {
    const row = [...document.querySelectorAll('.pm-stats-row')].find((each) => each.textContent.includes('Statuses'));
    row.scrollIntoView({ block: 'nearest' });
  });
  await sleep(100);
  await page.hover('.pm-stats-row >> text=Statuses');
  await sleep(100);
  const statusesTip = (await tipNow()) || { name: '', lines: [] };
  ok(
    statusesTip.name === 'Statuses' && /^\w+ \d+(, \w+ \d+)*$/.test(statusesTip.lines.join(' | ')),
    'hovering Statuses lists the kinds (' + statusesTip.name + ': ' + statusesTip.lines.join(' | ') + ')'
  );
  ok(onTop(statusesTip), 'the Statuses tooltip is on top (' + statusesTip.covered + ' points covered)');

  // ---- #83: Cards Taken (the cards that touch the shown Pokemon) and the move tooltip's cards line ----
  const cardsBox = () =>
    page.evaluate(() => {
      const box = document.querySelector('.pm-box-cards');
      const rows = [...box.querySelectorAll('.pm-card-row')].map((row) => ({
        id: row.dataset.card,
        label: row.querySelector('.pm-card-label').textContent.trim(),
        picks: row.querySelector('.pm-card-picks').textContent.trim(),
      }));
      const slot = +document.querySelector('.pm-detail').dataset.slot;
      const member = G.Game.roster.find((each) => each.teamSlot === slot);
      const want = G.TeamCards.takenBy(
        member.teamCards,
        member.moves.map((move) => move.id),
        G.Game.roster.length
      );
      const scale = document.querySelector('.pm-detail').getBoundingClientRect().height / 1028;
      return {
        got: rows.map((row) => row.id + ' ' + row.label + ' ' + row.picks).join('|'),
        want: want.map((row) => row.id + ' ' + row.label + ' x' + row.picks).join('|'),
        rows: rows.length,
        empty: !!box.querySelector('.pm-empty-note'),
        height: Math.round(box.getBoundingClientRect().height / scale),
        overflow: [...box.querySelectorAll('.pm-card-row')].some((row) => row.scrollWidth > row.clientWidth + 1),
        changed: member.moves
          .map((move) => ({ id: move.id, texts: G.TeamCards.changes(member, move.id).map((change) => change.text) }))
          .filter((move) => move.texts.length),
      };
    });
  let taken = await cardsBox();
  ok(taken.height === 400, 'Cards Taken keeps its 400 px box (' + taken.height + ')');
  ok(taken.rows > 0 || taken.empty, 'Cards Taken: rows, or "No cards yet." with none');
  await page.evaluate(() => {
    for (const [id, picks] of [
      ['damage', 2],
      ['cooldown', 2],
      ['ailment', 3],
      ['vitamins:atk', 2],
      ['gate', 2],
      ['regen', 1],
      ['chain', 1],
    ])
      G.Debug.cards(id, picks);
  });
  await reopen();
  taken = await cardsBox();
  ok(taken.rows > 0 && taken.got === taken.want, "Cards Taken lists takenBy's rows (" + taken.got + ')');
  ok(taken.got.includes('vitamins:atk Protein x2'), "Cards Taken: Vitamins by the vitamin's name, with its pick count");
  ok(!taken.overflow, 'no Cards Taken row overflows the column (long names wrap)');
  ok(taken.changed.length > 0, "the cards change at least one of the shown Pokemon's moves");
  if (taken.changed.length) {
    const target = taken.changed[0];
    await page.evaluate(
      (id) => document.querySelector('.pm-move[data-move="' + id + '"]').scrollIntoView({ block: 'nearest' }),
      target.id
    );
    await page.hover('.pm-move[data-move="' + target.id + '"]');
    await sleep(100);
    const moveTip = ((await tipNow()) || { lines: [] }).lines;
    const cardsLine = moveTip.find((line) => line.startsWith('Cards: ')) || '';
    ok(
      target.texts.every((text) => cardsLine.includes(text)),
      "the move tooltip's cards line shows every change (" + cardsLine + ')'
    );
  }
  for (const id of ['gate', 'regen']) {
    const has = await page.evaluate((card) => !!document.querySelector('.pm-card-row[data-card="' + card + '"]'), id);
    if (!has) continue; // gate only with a stat move, regen only with a team of 2 or more
    await page.evaluate(
      (card) => document.querySelector('.pm-card-row[data-card="' + card + '"]').scrollIntoView({ block: 'nearest' }),
      id
    );
    await page.hover('.pm-card-row[data-card="' + id + '"]');
    await sleep(100);
    const shownTip = await tipNow();
    const cardTip = await page.evaluate((card) => {
      const slot = +document.querySelector('.pm-detail').dataset.slot;
      const member = G.Game.roster.find((each) => each.teamSlot === slot);
      const rows = G.TeamCards.takenBy(
        member.teamCards,
        member.moves.map((move) => move.id),
        G.Game.roster.length
      );
      return { want: (rows.find((row) => row.id === card) || {}).tip };
    }, id);
    cardTip.shown = shownTip ? shownTip.lines.join(' | ') : '';
    ok(onTop(shownTip), 'the ' + id + ' tooltip in Cards Taken is on top');
    ok(
      !!cardTip.want &&
        cardTip.shown === cardTip.want &&
        (id === 'gate'
          ? /^Stat stage Gate 6\.0 s to \d/.test(cardTip.shown)
          : /^Benched Pokemon regain /.test(cardTip.shown)),
      'hovering ' + id + ' in Cards Taken shows its real number (' + cardTip.shown + ')'
    );
  }
  await page.mouse.move(5, 5);

  // ---- every hover tooltip is the topmost layer (Jess, 2026-11-12): the move list's last move, whose tooltip reaches
  // down over the team cards, and its place 16 px clear of both side panels ----
  await page.evaluate(() => {
    const moves = document.querySelectorAll('.pm-move');
    moves[moves.length - 1].scrollIntoView({ block: 'nearest' });
  });
  await sleep(100);
  await page.hover('.pm-move >> nth=-1');
  await sleep(100);
  const lastMoveTip = await tipNow();
  const panelEdges = await page.evaluate(() => ({
    info: document.querySelector('.pm-panel-info').getBoundingClientRect().right,
    detail: document.querySelector('.pm-detail').getBoundingClientRect().left,
    lastName: [...document.querySelectorAll('.pm-move .pm-move-name')].pop().textContent.trim(),
  }));
  ok(
    !!lastMoveTip && lastMoveTip.name === panelEdges.lastName,
    "the last move's tooltip shows (" + (lastMoveTip && lastMoveTip.name) + ')'
  );
  ok(
    onTop(lastMoveTip),
    "the last move's tooltip is on top, the team cards under it (" + (lastMoveTip && lastMoveTip.covered) + ' covered)'
  );
  ok(
    !!lastMoveTip &&
      Math.abs(lastMoveTip.left - panelEdges.info - 16) <= 1 &&
      Math.abs(panelEdges.detail - lastMoveTip.right - 16) <= 1,
    'the move tooltip sits 16 px clear of Run Info and of the detail panel (' +
      (lastMoveTip && Math.round(lastMoveTip.left - panelEdges.info)) +
      ', ' +
      (lastMoveTip && Math.round(panelEdges.detail - lastMoveTip.right)) +
      ')'
  );
  const scrolled = await page.evaluate(() => {
    const box = document.querySelector('.pm-move').closest('.hud-scroll-box');
    if (box.scrollHeight <= box.clientHeight + 1) return false; // the list fits: nothing to scroll
    box.scrollTop = box.scrollTop > 0 ? 0 : 40;
    return true;
  });
  await sleep(100);
  if (scrolled) ok((await tipNow()) === null, 'scrolling the move list hides its tooltip');
  await page.mouse.move(5, 5);

  // ---- End Run asks inside the ball ----
  // where each button sits, relative to the ball's centre, and whether the ball's clip leaves any of it showing
  const places = () =>
    page.evaluate(() => {
      const ball = document.querySelector('.pm-ball-back').getBoundingClientRect(),
        centreX = ball.left + ball.width / 2,
        centreY = ball.top + ball.height / 2;
      const at = (id) => {
        const r = document.querySelector('.pm-button[data-action="' + id + '"]').getBoundingClientRect();
        return {
          x: Math.round(r.left + r.width / 2 - centreX),
          y: Math.round(r.top + r.height / 2 - centreY),
          w: r.width,
        };
      };
      const rims = (id) =>
        [...document.querySelectorAll('.pm-button[data-action="' + id + '"] rect')].map((r) => r.getAttribute('fill'));
      // the body: the widest rect that is not the outline
      const body = (id) => {
        const rects = [...document.querySelectorAll('.pm-button[data-action="' + id + '"] rect')].filter(
          (r) => r.getAttribute('fill') !== '#101010'
        );
        rects.sort((a, b) => +b.getAttribute('width') - +a.getAttribute('width'));
        return rects[0].getAttribute('fill');
      };
      const focused = document.querySelector('.pm-button.focused');
      return {
        endBody: body('end'),
        noBody: body('no'),
        asking: G.PauseMenu.isAsking(),
        side: G.PauseMenu.askedSide(),
        resume: at('resume'),
        settings: at('settings'),
        end: at('end'),
        no: at('no'),
        focus: focused ? focused.dataset.action : null,
        endRims: rims('end'),
        noRims: rims('no'),
      };
    });
  const insideBall = (b) => Math.abs(b.x) + b.w / 2 < 214;
  const offBall = (b) => Math.abs(b.x) - b.w / 2 > 214;
  const askAndCheck = async (label) => {
    await page.click('.pm-button[data-action="endRun"]');
    await sleep(SLIDE_MS);
    const p = await places();
    ok(p.asking, label + ': End Run asks');
    ok(
      offBall(p.resume) &&
        offBall(p.settings) &&
        Math.sign(p.resume.x) === -p.side &&
        Math.sign(p.settings.x) === p.side,
      label +
        ': Resume and Settings left by opposite sides (Settings to ' +
        (p.side > 0 ? 'the right' : 'the left') +
        ')'
    );
    ok(
      insideBall(p.end) && insideBall(p.no) && p.end.y === p.settings.y && p.no.y === p.settings.y && p.end.x < p.no.x,
      label + ": End and No sit side by side in Settings' row, inside the ball"
    );
    ok(p.focus === 'no', label + ': No has the focus');
    return p;
  };
  const backAndCheck = async (label, side) => {
    await sleep(SLIDE_MS);
    const p = await places();
    ok(!p.asking && Math.abs(p.resume.x) < 2 && Math.abs(p.settings.x) < 2, label + ': Resume and Settings are back');
    ok(
      offBall(p.end) && offBall(p.no) && Math.sign(p.end.x) === -side,
      label + ': End and No went back out the side they came in by'
    );
    ok(p.focus === 'endRun', label + ': End Run has the focus');
    s = await look();
    ok(s.state === 'paused' && s.fully, label + ': still paused, the menu still open');
  };

  let asked = await askAndCheck('click');
  ok(asked.endRims.includes('#e8202a') && asked.endBody === '#181818', 'End: red rim, plain body');
  ok(
    asked.noRims.includes('#e7e7e7') && !asked.noRims.includes('#38d030') && asked.noBody === '#848484',
    'No focused: still a white rim, body the dark shade of white'
  );
  await shot('pause-menu-end-run.png');
  await key('ArrowLeft', 100);
  asked = await places();
  ok(asked.focus === 'end', 'Move_Left moves the focus to End');
  ok(
    asked.endRims.includes('#e8202a') && asked.endBody === '#7c1016' && !asked.endRims.includes('#38d030'),
    'End focused: still a red rim, body the dark red'
  );
  ok(asked.noRims.includes('#e7e7e7') && asked.noBody === '#181818', 'No unfocused: white rim, plain body');
  await key('ArrowUp', 100);
  ok((await places()).focus === 'end', 'Up does nothing while asking');
  await key('ArrowRight', 100);
  ok((await places()).focus === 'no', 'Move_Right moves the focus back to No');
  await key('Escape');
  await backAndCheck('Esc', asked.side);

  asked = await askAndCheck('again');
  await page.click('.pm-button[data-action="no"]');
  await page.mouse.move(5, 5); // off the buttons, or Settings sliding back under the pointer takes the focus by hover
  await backAndCheck('click No', asked.side);

  asked = await askAndCheck('keys');
  await key('Enter');
  await backAndCheck('Enter on No', asked.side);

  const sides = new Set([asked.side]);
  for (let tries = 0; tries < 12 && sides.size < 2; tries++) {
    await page.click('.pm-button[data-action="endRun"]');
    await sleep(60);
    sides.add(await page.evaluate(() => G.PauseMenu.askedSide()));
    await key('Escape', SLIDE_MS);
  }
  ok(sides.size === 2, 'the side is picked at random (both seen)');

  // #103: give the run whole EVs and a Pokebox copy to receive them, so a fall WOULD offer them; a quit must not
  const seedEvs = () =>
    page.evaluate(() => {
      const copy = G.Copies.add(G.DB.save, { dex: G.Game.player.dex });
      G.Game.player.copyUid = G.Copies.longId(copy.u);
      G.Game.evBank = [5 * G.Copies.EV_UNIT, 0, 0, 0, 0, 0];
      return G.Copies.wholeEvs(G.Game.evBank)[0];
    });
  ok((await seedEvs()) === 5, 'the run holds 5 whole HP EVs and a copy to give them to');
  await askAndCheck('end');
  await page.click('.pm-button[data-action="end"]');
  await sleep(300);
  s = await look();
  ok(
    !s.open && s.state !== 'paused' && s.state !== 'playing',
    'End ends the run, the menu is gone (state ' + s.state + ')'
  );
  ok(!s.ask, 'no popup was used');

  // ---- #103 the End Run screen (docs/PAUSE-MENU.md section 7) ----
  const endRunNow = () =>
    page.evaluate(() => {
      const layer = document.querySelector('.end-run');
      const focused = layer.querySelector('.pm-button.focused');
      return {
        open: G.EndRun.isOpen(),
        title: (layer.querySelector('.er-title') || {}).textContent,
        titleFont: getComputedStyle(layer.querySelector('.er-title')).fontFamily,
        buttons: [...layer.querySelectorAll('.pm-button')].map((button) => button.textContent.trim()),
        focus: focused ? focused.textContent.trim() : null,
        oldCard: G.UI.isOpen('scr-over'),
        hudHidden: getComputedStyle(document.querySelector('.hud-overlay')).visibility === 'hidden',
        state: G.Game.state,
      };
    });
  await page.waitForFunction(() => G.EndRun.isOpen(), null, { timeout: 5000 });
  await sleep(250);
  let ending = await endRunNow();
  await shot('end-run-quit.png');
  ok(
    ending.title === 'EXPEDITION OVER' && /Michroma|HudModule/.test(ending.titleFont),
    'End Run: "EXPEDITION OVER" in Michroma'
  );
  ok(
    ending.buttons.join('|') === 'Run Review|Return Home',
    'a quit offers Run Review and Return Home, no EVs (' + ending.buttons.join(', ') + ')'
  );
  ok(ending.focus === 'Run Review', 'End Run: Run Review has the focus first');
  ok(!ending.oldCard && ending.hudHidden, 'End Run: the old results card stays hidden, the run HUD hides');
  await checkStageScale('.end-run', 'End Run');
  await key('Escape', 100);
  ok((await endRunNow()).open, 'End Run: Esc does nothing');
  await key('ArrowRight', 100);
  ok((await endRunNow()).focus === 'Return Home', 'End Run: Move_Right moves the focus');
  await key('ArrowLeft', 100);
  ok((await endRunNow()).focus === 'Run Review', 'End Run: Move_Left moves it back');

  // ---- #92 Run Review: End Run's Run Review reopens the menu read-only (docs/PAUSE-MENU.md section 7) ----
  const openReview = async (label) => {
    await page.click('.end-run .pm-button[data-action="review"]');
    await page.waitForFunction(() => G.PauseMenu.isFullyOpen(), null, { timeout: 3000 });
    await sleep(80);
    const r = await look();
    const extra = await page.evaluate(() => ({
      reviewing: G.PauseMenu.isReviewing(),
      over: G.EndRun.isOpen() || G.UI.isOpen('scr-over'),
      teamSheet: G.UI.isOpen('scr-team'),
      inventory: !!document.querySelector('.pm-panel-inventory .pm-inventory'),
      infoRows: document.querySelectorAll('.pm-panel-info .pm-info-row').length,
      detail: !!document.querySelector('.pm-detail'),
      teamCards: document.querySelectorAll('.pm-team-card').length,
      drops: document.querySelectorAll('.pause-menu [data-drop]').length,
    }));
    ok(
      r.open && extra.reviewing && !extra.over && !extra.teamSheet,
      label + ': Run Review opens over the hidden results'
    );
    ok(
      r.buttons.join('|') === 'Back' && r.focus === 'Back',
      label + ': the ball holds one button, Back (' + r.buttons.join(', ') + ')'
    );
    return { r, extra };
  };
  let review = await openReview('Team button');
  await shot('run-review.png');
  ok(!review.extra.inventory, 'Run Review: no Run Inventory');
  ok(review.extra.infoRows > 0, 'Run Review: Run Info shows the run (' + review.extra.infoRows + ' rows)');
  ok(
    review.extra.detail && review.extra.teamCards >= 2,
    'Run Review: the detail and team panels (' + review.extra.teamCards + ' cards)'
  );
  ok(review.extra.drops === 0, 'Run Review: nothing accepts an item (' + review.extra.drops + ' places)');
  await page.hover('.pm-move >> nth=0');
  await sleep(100);
  const reviewTip = await tipNow();
  ok(onTop(reviewTip), 'Run Review: a move tooltip shows in the shared layer (' + (reviewTip && reviewTip.name) + ')');
  await page.mouse.move(5, 5);
  const shownBefore = await page.evaluate(() => G.PausePokemon.shownSlot());
  await key('ArrowRight', 100);
  ok(
    (await page.evaluate(() => G.PausePokemon.shownSlot())) !== shownBefore,
    'Run Review: Move_Right shows the next Pokemon'
  );
  const backTo = async (how) => {
    await page.waitForFunction(() => !G.PauseMenu.isOpen(), null, { timeout: 3000 });
    const after = await page.evaluate(() => ({ back: G.EndRun.isOpen(), reviewing: G.PauseMenu.isReviewing() }));
    ok(after.back && !after.reviewing, how + ' goes back to the End Run screen');
  };
  await key('Escape');
  await backTo('Esc');
  await openReview('again');
  await key('Enter');
  await backTo('Enter on Back');
  await openReview('again');
  await page.click('.pm-button[data-action="back"]');
  await backTo('a click on Back');
  ending = await endRunNow();
  ok(
    ending.buttons.join('|') === 'Run Review|Return Home',
    'End Run comes back as it was (' + ending.buttons.join(', ') + ')'
  );
  await key('ArrowRight', 100);
  await key('Enter', 300);
  ending = await endRunNow();
  ok(!ending.open && ending.state === 'ui', 'Return Home (Enter) goes back to the menu (state ' + ending.state + ')');

  // the next run's pause menu is the full one again
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 15000 });
  await key('Escape');
  await page.waitForFunction(() => G.PauseMenu.isFullyOpen(), null, { timeout: 3000 });
  await sleep(80);
  s = await look();
  const nextRun = await page.evaluate(() => ({
    reviewing: G.PauseMenu.isReviewing(),
    inventory: !!document.querySelector('.pm-panel-inventory .pm-inventory'),
    drops: document.querySelectorAll('.pause-menu [data-drop]').length,
  }));
  ok(
    !nextRun.reviewing && s.buttons.join('|') === 'Resume|End Run|Settings' && nextRun.inventory && nextRun.drops > 0,
    "the next run's pause menu is the full one (" + s.buttons.join(', ') + ', ' + nextRun.drops + ' places)'
  );

  // ---- #103 a fall with EVs: Learn from the Loss opens the EV screen ----
  await key('Escape');
  await page.waitForFunction(() => G.Game.state === 'playing', null, { timeout: 3000 });
  // #104: every fighter gets a copy (its EVs before the screen set by team slot) and the run banks EVs (save order)
  const evSeedTeam = (bank, evsBySlot) =>
    page.evaluate(
      ({ bank, evsBySlot }) => {
        const save = G.DB.save,
          uids = {};
        for (const member of G.Game.roster) {
          if (!member.copyUid || !G.Copies.get(save, member.copyUid))
            member.copyUid = G.Copies.longId(G.Copies.add(save, { dex: member.dex }).u);
          // a slot not listed starts at 0 EVs: the next run reuses these copies, so last run's EVs must not carry in
          G.Copies.setEvs(save, member.copyUid, evsBySlot[member.teamSlot] || [0, 0, 0, 0, 0, 0]);
          uids[member.teamSlot] = member.copyUid;
        }
        G.Game.evBank = bank.map((value) => value * G.Copies.EV_UNIT);
        return uids;
      },
      { bank, evsBySlot }
    );
  const evSaved = (uids) =>
    page.evaluate((uids) => {
      const out = {};
      for (const slot of Object.keys(uids)) {
        const copy = G.Copies.get(G.DB.save, uids[slot]);
        out[slot] = copy ? copy.ev.join(' ') : null;
      }
      return out;
    }, uids);
  // to give: 5 HP, 3 Attack, 2 Special Attack (save order HP Atk Def SpA SpD Spe)
  const teamUids = await evSeedTeam([5, 3, 0, 2, 0, 0], {
    0: [250, 0, 0, 0, 0, 0],
    1: [0, 252, 0, 0, 0, 0],
    3: [252, 252, 0, 0, 0, 6],
  });
  ok(
    Object.keys(teamUids).join(' ') === '0 1 3',
    'the second run has copies in team slots 0, 1 and 3 (' + Object.keys(teamUids).join(' ') + ')'
  );
  await page.evaluate(() => {
    clearInterval(window.__keep);
    for (const member of G.Game.roster) {
      member.hp = 0;
      member.dead = true;
    }
  });
  await page.waitForFunction(() => G.EndRun.isOpen(), null, { timeout: 8000 });
  await sleep(250);
  ending = await endRunNow();
  await shot('end-run-fall.png');
  ok(
    ending.buttons.join('|') === 'Run Review|Learn from the Loss',
    'a fall with EVs offers Learn from the Loss (' + ending.buttons.join(', ') + ')'
  );
  await page.click('.end-run .pm-button[data-action="learn"]');
  await sleep(200);

  // ---- #104 the EV screen (docs/PAUSE-MENU.md section 7) ----
  const evNow = () =>
    page.evaluate(() => {
      const layer = document.querySelector('.ev-screen');
      const focused = layer.querySelector('.pm-button.focused');
      const cell = (stat, column) => {
        const box = layer.querySelector(`.ev-row[data-stat="${stat}"] .ev-cell[data-column="${column}"]`);
        if (!box || !box.querySelector('.ev-step')) return null;
        const [minus, plus] = box.querySelectorAll('.ev-step');
        return {
          now: box.querySelector('.ev-now').textContent.trim(),
          add: box.querySelector('.ev-add').textContent.trim(),
          minus: !minus.disabled,
          plus: !plus.disabled,
        };
      };
      const cells = {};
      for (const row of layer.querySelectorAll('.ev-row'))
        for (let column = 0; column < 6; column++)
          cells[row.dataset.stat + ':' + column] = cell(row.dataset.stat, column);
      return {
        open: G.EvScreen.isOpen(),
        endRun: G.EndRun.isOpen(),
        oldScreen: !!document.getElementById('scr-evs'),
        circles: layer.querySelectorAll('.ev-circle').length,
        empty: layer.querySelectorAll('.ev-circle.ev-empty').length,
        totals: [...layer.querySelectorAll('.ev-total')].map((total) => total.textContent.trim()),
        rows: [...layer.querySelectorAll('.ev-row .ev-stat-name')].map((name) => name.textContent.trim()),
        left: [...layer.querySelectorAll('.ev-row .ev-left')].map((left) => +left.textContent),
        cells,
        focus: focused ? focused.textContent.trim() : null,
        ask: G.UI.isOpen('scr-ask'),
        askText: document.getElementById('ask-msg').textContent,
        state: G.Game.state,
      };
    });
  const evCell = (screen, stat, column) => screen.cells[stat + ':' + column];
  const evStep = (stat, column, direction) =>
    `.ev-screen .ev-row[data-stat="${stat}"] .ev-cell[data-column="${column}"] .ev-step[data-step="${direction}"]`;
  const evPress = async (selector, options) => {
    await page.click(selector, options);
    await sleep(60);
    return evNow();
  };
  let evState = await evNow();
  await shot('ev-screen.png');
  ok(
    evState.open && !evState.endRun && !evState.oldScreen,
    'Learn from the Loss opens the EV screen; the old one is gone'
  );
  await checkStageScale('.ev-screen', 'EV screen');
  ok(evState.circles === 6 && evState.empty === 3, 'EV screen: six circles, three empty (' + evState.empty + ' empty)');
  ok(
    evState.totals[0] === '250 / 510' && evState.totals[1] === '252 / 510' && evState.totals[3] === '510 / 510',
    'EV screen: x / 510 under each copy (' + evState.totals.join(', ') + ')'
  );
  ok(
    evState.rows.join('|') === 'HP|Attack|Defense|Speed|Special Defense|Special Attack',
    'EV screen: all six rows in the hex order (' + evState.rows.join(', ') + ')'
  );
  ok(
    evState.left.join(' ') === '5 3 0 0 0 2',
    'EV screen: the left column is the bank (' + evState.left.join(' ') + ')'
  );
  const firstHp = evCell(evState, 0, 0);
  ok(
    firstHp.now === '250' && firstHp.add === '' && firstHp.plus && !firstHp.minus,
    'EV screen: white 250, no yellow yet, - grey with nothing added'
  );
  ok(
    !evCell(evState, 1, 1).plus && evCell(evState, 0, 1).plus,
    'EV screen: + greys at 252 in a stat, not in the others'
  );
  ok(
    [0, 1, 2, 5, 4, 3].every((stat) => !evCell(evState, stat, 3).plus),
    'EV screen: every + greys on a copy at 510'
  );
  ok(
    [0, 1, 3].every((column) => !evCell(evState, 2, column).plus),
    'EV screen: + greys in a stat with nothing left'
  );
  ok(evCell(evState, 0, 2) === null, 'EV screen: an empty slot has no buttons');
  evState = await evPress(evStep(0, 0, 1));
  ok(
    evCell(evState, 0, 0).now === '250' && evCell(evState, 0, 0).add === '+1' && evState.left[0] === 4,
    'EV screen: + keeps the white 250, shows a yellow +1 and takes 1 from what is left'
  );
  ok(evState.totals[0] === '251 / 510' && evCell(evState, 0, 0).minus, 'EV screen: x / 510 counts the add; - wakes up');
  evState = await evPress(evStep(0, 0, 1));
  ok(evCell(evState, 0, 0).add === '+2' && !evCell(evState, 0, 0).plus, 'EV screen: + greys once the cell reaches 252');
  evState = await evPress(evStep(0, 1, 1), { modifiers: ['Shift'] });
  ok(
    evCell(evState, 0, 1).add === '+3' && evState.left[0] === 0,
    'EV screen: Shift-click gives 10, cut to the 3 left (' + evCell(evState, 0, 1).add + ')'
  );
  ok(
    [0, 1].every((column) => !evCell(evState, 0, column).plus),
    'EV screen: nothing left in HP greys every HP +'
  );
  await page.hover(evStep(1, 0, 1));
  await page.mouse.down();
  await sleep(900);
  await page.mouse.up();
  await sleep(60);
  evState = await evNow();
  ok(
    evCell(evState, 1, 0).add === '+3' && evState.left[1] === 0,
    'EV screen: holding + repeats until Attack runs out (' + evCell(evState, 1, 0).add + ')'
  );
  evState = await evPress(evStep(0, 1, -1));
  ok(evCell(evState, 0, 1).add === '+2' && evState.left[0] === 1, 'EV screen: - takes one back');
  ok(evState.focus === 'Learn', 'EV screen: Learn has the focus first');
  await key('Escape', 100);
  ok((await evNow()).open, 'EV screen: Esc does nothing');
  await key('ArrowRight', 100);
  ok((await evNow()).focus === 'Go Home', 'EV screen: Move_Right moves the focus');
  await key('ArrowLeft', 100);
  ok((await evNow()).focus === 'Learn', 'EV screen: Move_Left moves it back');
  await page.click('.ev-screen .pm-button[data-action="learn"]');
  await sleep(200);
  evState = await evNow();
  ok(
    evState.ask && evState.open && /^3 EVs/.test(evState.askText),
    'Learn with 3 EVs left asks first (' + evState.askText + ')'
  );
  await page.click('#ask-no');
  await sleep(250);
  evState = await evNow();
  ok(!evState.ask && evState.open && evCell(evState, 0, 0).add === '+2', 'Learn: Cancel stays, with what was given');
  await page.click('.ev-screen .pm-button[data-action="learn"]');
  await sleep(200);
  // #104c: the shared toast (G.UI.toast), the screen up but taking no input, then home after about 2 s
  const toastNow = () =>
    page.evaluate(() => {
      const toast = document.querySelector('.toast');
      if (!toast) return null;
      const style = getComputedStyle(toast);
      return {
        shown: style.display !== 'none',
        text: toast.textContent,
        font: style.fontFamily,
        body: style.backgroundColor,
        rim: style.borderTopColor,
      };
    });
  const learnedAt = Date.now();
  await page.click('#ask-ok');
  await sleep(150);
  const learnToast = await toastNow();
  evState = await evNow();
  ok(
    learnToast &&
      learnToast.shown &&
      learnToast.text === 'Lessons Learned, Returning Home' &&
      /HudModule|Michroma/.test(learnToast.font),
    'Learn: the toast says Lessons Learned, Returning Home in Michroma (' + (learnToast && learnToast.text) + ')'
  );
  ok(
    learnToast && learnToast.body === 'rgb(24, 24, 24)' && learnToast.rim === 'rgb(41, 206, 255)',
    "the shared toast: the main menu bars' charcoal and teal rim (" +
      (learnToast && learnToast.body + ', ' + learnToast.rim) +
      ')'
  );
  ok(evState.open && !evState.ask, 'Learn: the EV screen stays up during the toast');
  let evsAfter = await evSaved(teamUids);
  ok(
    evsAfter[0] === '252 3 0 0 0 0' && evsAfter[1] === '2 252 0 0 0 0' && evsAfter[3] === '252 252 0 0 0 6',
    'Learn saved exactly the adds, before the toast ends (' + JSON.stringify(evsAfter) + ')'
  );
  const deaf = await page.evaluate(
    async (plusSelector) => {
      const plus = document.querySelector(plusSelector);
      plus.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      document.querySelector('.ev-screen .pm-button[data-action="gohome"]').click();
      await new Promise((resolve) => setTimeout(resolve, 60));
      return {
        plusEnabled: !plus.disabled,
        added: plus.parentElement.querySelector('.ev-add').textContent.trim(),
        ask: G.UI.isOpen('scr-ask'),
      };
    },
    evStep(3, 0, 1)
  );
  ok(
    deaf.plusEnabled && deaf.added === '' && !deaf.ask,
    'during the toast a + press and a Go Home click do nothing (' + JSON.stringify(deaf) + ')'
  );
  await page.waitForFunction(() => !G.EvScreen.isOpen(), null, { timeout: 5000 });
  const learnTook = Date.now() - learnedAt;
  evState = await evNow();
  ok(
    evState.state === 'ui' && learnTook >= 1900 && learnTook < 3500,
    'Learn: home after about 2 s (' + learnTook + ' ms, state ' + evState.state + ')'
  );
  const badToast = await page.evaluate(() => {
    G.UI.toast('Smoke check', 400, 'bad');
    return getComputedStyle(document.querySelector('.toast')).borderTopColor;
  });
  ok(
    badToast === 'rgb(200, 20, 28)',
    "the shared toast's bad tone keeps the shape with the red rim (" + badToast + ')'
  );
  await sleep(450);
  const toastDrift = await page.evaluate(async () => {
    G.UI.toast('Smoke check, a longer line so the toast is wide', 600);
    await new Promise((resolve) => setTimeout(resolve, 50)); // mid pop-in (0.2 s)
    const box = document.querySelector('.toast').getBoundingClientRect();
    return Math.round(box.left + box.width / 2 - innerWidth / 2);
  });
  ok(Math.abs(toastDrift) <= 2, 'the toast is centred while it pops in (' + toastDrift + ' px off)');
  await sleep(450);

  // a third run: Go Home saves nothing
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 15000 });
  const homeUids = await evSeedTeam([4, 0, 0, 0, 0, 0], {});
  await page.evaluate(() => {
    for (const member of G.Game.roster) {
      member.hp = 0;
      member.dead = true;
    }
  });
  await page.waitForFunction(() => G.EndRun.isOpen(), null, { timeout: 8000 });
  await sleep(250);
  await page.click('.end-run .pm-button[data-action="learn"]');
  await sleep(200);
  evState = await evPress(evStep(0, 0, 1));
  ok(evState.open && evCell(evState, 0, 0).add === '+1', 'the third run gives 1 HP on the EV screen');
  await page.click('.ev-screen .pm-button[data-action="gohome"]');
  await sleep(200);
  evState = await evNow();
  ok(evState.ask && evState.askText === 'Discard all EVs and return?', 'Go Home always asks (' + evState.askText + ')');
  await page.click('#ask-no');
  await sleep(250);
  ok((await evNow()).open, 'Go Home: Cancel stays');
  await page.click('.ev-screen .pm-button[data-action="gohome"]');
  await sleep(200);
  await page.click('#ask-ok');
  await sleep(300);
  evState = await evNow();
  ok(!evState.open && evState.state === 'ui', 'Go Home: Yes goes home (state ' + evState.state + ')');
  evsAfter = await evSaved(homeUids);
  ok(
    Object.values(evsAfter).every((evs) => evs === '0 0 0 0 0 0'),
    'Go Home saved nothing (' + JSON.stringify(evsAfter) + ')'
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
