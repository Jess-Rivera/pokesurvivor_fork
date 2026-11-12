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
  drawn = await countFor(300);
  ok(drawn.world === 0, 'then the world is held still again (' + drawn.world + ')');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await sleep(200);
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
  ok(drawn.world > 0 && drawn.hud > 0, 'after closing: the world draws and the HUD reads again (' + JSON.stringify(drawn) + ')');
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
          shown: label.querySelector('.pm-hex-value').textContent.trim(),
          expected: String(finalOf(order[label.dataset.stat])),
          tip: label.querySelector('.pm-hex-tip').textContent.trim(),
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
  ok(
    hex.texts.every((text) => text.tip === text.expectedTip),
    'each corner hover reads ' + hex.texts[0].tip
  );
  await page.hover('.pm-hex-label[data-stat="Atk"]');
  await sleep(80);
  ok(
    await page.evaluate(
      () => getComputedStyle(document.querySelector('.pm-hex-label[data-stat="Atk"] .pm-hex-tip')).display !== 'none'
    ),
    'hovering a corner shows its tooltip'
  );
  // the HP tooltip opens down over the Atk and SpA corners: it must be the top element across its whole width
  await page.hover('.pm-hex-label[data-stat="HP"]');
  await sleep(80);
  ok(
    await page.evaluate(() => {
      const tip = document.querySelector('.pm-hex-label[data-stat="HP"] .pm-hex-tip'),
        box = tip.getBoundingClientRect();
      tip.style.pointerEvents = 'auto'; // elementFromPoint skips pointer-events: none
      // a grid over the whole tooltip: it overlaps Atk and SpA only near its lower corners
      const onTop = [0.03, 0.25, 0.5, 0.75, 0.97].every((across) =>
        [0.1, 0.5, 0.9].every((down) =>
          tip.contains(document.elementFromPoint(box.left + box.width * across, box.top + box.height * down))
        )
      );
      tip.style.pointerEvents = '';
      return onTop;
    }),
    'the HP tooltip is on top of the other corners'
  );
  await page.mouse.move(5, 5);
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

  await askAndCheck('end');
  await page.click('.pm-button[data-action="end"]');
  await sleep(300);
  s = await look();
  ok(
    !s.open && s.state !== 'paused' && s.state !== 'playing',
    'End ends the run, the menu is gone (state ' + s.state + ')'
  );
  ok(!s.ask, 'no popup was used');

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
