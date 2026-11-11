// tools/smoke-hud-overlay.js: headless browser check for the HTML HUD: the #64 pilot (the enemy name bar and the leader portrait
// circles), the #62 character info panel, the #66 DPS-Upgrades panel (js/ui/hud-*.js, docs/HUD-STYLE.md). A check, not a harness: check.js syntax-checks it.
// Playwright is NOT a repo dependency (PLAYWRIGHT_DIR, default C:\Users\boric\tools\playwright), as in tools/smoke-gym.js.
// Usage from the repo root:
//   node tools/smoke-hud-overlay.js          dev.html over file:// (how Jess plays)
//   node tools/smoke-hud-overlay.js --built  also the built index.html (run node tools/build.js first): the libraries load there
// Fights Brock at loop 2 (two Pokemon, a switched gym) and Lt. Surge (the old one-Pokemon body until slice 12). Wild spawns off.
// Expected values are hand-derived from docs/HUD-STYLE.md (sizes, colours, timings), never read back from the overlay code.
const path = require('path'),
  fs = require('fs'),
  url = require('url');
const root = path.resolve(__dirname, '..');
const PW_DIRS = [
  process.env.PLAYWRIGHT_DIR,
  path.join(require('os').homedir(), 'tools', 'playwright'),
  'C:\\Users\\boric\\tools\\playwright',
]
  .filter(Boolean)
  .map((dir) => path.join(dir, 'node_modules', 'playwright'));
const PW = PW_DIRS.find((dir) => fs.existsSync(dir)) || PW_DIRS[0];
const { chromium } = require(PW);

let failures = 0;
const ok = (condition, message) => {
  console.log((condition ? 'ok    ' : 'FAIL  ') + message);
  if (!condition) failures++;
};

// HUD-STYLE, hand-copied
const ROCK_BASE = 'rgb(175, 169, 129)', // #AFA981
  ELECTRIC_BASE = 'rgb(250, 192, 0)', // #FAC000
  BLACK_STROKE = 'rgb(16, 16, 16)', // #101010
  BAR_WIDTH = 696,
  BAR_TOP = 43,
  CIRCLE_SIZE = 48, // 4 px stroke (Jess, 2026-11-10)
  CIRCLE_PITCH = 54;

async function openPage(browser, file) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  const errors = [];
  const FONT = /assets\/fonts\/[^ ]*\.(ttf|otf|woff2?)/i;
  page.notes = [];
  page.on('pageerror', (error) => errors.push('pageerror: ' + error.message));
  page.on('requestfailed', (request) => {
    if (request.url().startsWith('file:'))
      (FONT.test(request.url()) ? page.notes : errors).push('requestfailed: ' + request.url());
  });
  page.on('console', (message) => {
    if (message.type() !== 'error' || /net::ERR_/.test(message.text())) return;
    (FONT.test(message.text()) ? page.notes : errors).push('console: ' + message.text().slice(0, 140));
  });
  await page.goto(url.pathToFileURL(path.join(root, file)).href + '?dev', { waitUntil: 'load' });
  return { context, page, errors };
}

async function boot(browser) {
  const opened = await openPage(browser, 'dev.html');
  const { page } = opened;
  await page.waitForFunction(() => window.G && G.Game && G.DB && G.GymArena && G.HudOverlay, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    const tapStart = document.getElementById('tap-start');
    if (tapStart && !tapStart.classList.contains('hidden')) tapStart.click();
    const save = G.DB.save;
    save.team = [{ dex: 7, shiny: false }, null, null, null, null, null];
    save.partner = 7;
    save.partnerShiny = false;
  });
  return opened;
}

/** Start a run, open gym n at the given loop, walk in, and keep you alive and the leader still. */
async function enterGym(page, gymNumber, loop) {
  const waitFor = (fn, arg, ms = 15000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 50 });
  await page.evaluate(() => G.Game.startRun());
  await waitFor(() => G.Game.player && G.Game.state === 'playing');
  await page.evaluate(
    ([number, loopNumber]) => {
      G.Spawner.update = () => {}; // test page only: no wild spawns
      G.EnemyMgr.clear();
      G.Gym.debugLoop(loopNumber);
      G.Debug.gym(number);
    },
    [gymNumber, loop]
  );
  await waitFor(() => !!G.GymArena.gate);
  await page.evaluate(() => G.GymArena.enterRequest());
  await waitFor(() => G.GymArena.inArena && G.EnemyMgr.all().some((enemy) => enemy.boss && !enemy.dead));
  await page.evaluate(() => {
    window.__keep = setInterval(() => {
      const player = G.Game.player;
      if (player && !player.dead) {
        player.maxHp = 1e6;
        player.hp = 1e6;
        player.x = G.GymArena.arena.x; // far from the leader: no hits but the test's own
        player.y = G.GymArena.arena.y + 400;
      }
      const card = G.UI.isOpen('scr-levelup') && document.querySelector('#cards .card');
      if (card) card.click();
    }, 20);
    if (G.Debug.leaderAI) G.Debug.leaderAI({ swaps: false, dodges: false }); // only the test swaps
  });
  await waitFor(() => !!document.querySelector('.hud-boss'), null, 5000).catch(() => {});
}

const overlayState = (page) =>
  page.evaluate(() => {
    const panel = document.querySelector('.hud-boss');
    if (!panel) return null;
    const line = panel.querySelectorAll('.hud-boss-line span'),
      bar = panel.querySelector('.hud-boss-bar svg').getBoundingClientRect(),
      circles = [...panel.querySelectorAll('.hud-circle')];
    return {
      name: line[0] && line[0].textContent,
      level: line[1] && line[1].textContent,
      panelTop: panel.getBoundingClientRect().top,
      barLeft: bar.left,
      barWidth: bar.width,
      barRightGap: innerWidth - bar.right,
      pieces: panel.querySelectorAll('.hud-lifebar-piece').length,
      // the test's own hit is 30% of the bar; Brock's Life Orb costs (1% a cast) cut small pieces of their own
      bigPieces: [...panel.querySelectorAll('.hud-lifebar-piece')].filter((piece) => piece.offsetWidth > 100).length,
      growing: !!panel.querySelector('.hud-lifebar-fill.is-growing'),
      circles: circles.map((circle) => {
        const box = circle.getBoundingClientRect();
        return {
          left: box.left,
          size: box.width,
          active: circle.classList.contains('is-active'),
          pulsing: circle.classList.contains('is-pulsing'),
          fainted: circle.classList.contains('is-fainted'),
          stroke: getComputedStyle(circle).borderTopColor,
          image: circle.querySelector('img').getAttribute('src'),
        };
      }),
    };
  });

async function brock(browser) {
  const { context, page, errors } = await boot(browser);
  await enterGym(page, 1, 2);
  const team = await page.evaluate(() => {
    const leaderTeam = G.GymArena.leaderTeam;
    return leaderTeam.members.map((member) => ({ name: member.name, dex: member.dex, level: member.gym.level }));
  });
  ok(team.length === 2, 'Brock: loop 2 fields 2 Pokemon');
  await page.waitForTimeout(700); // past the send-in i-frames
  let state = await overlayState(page);
  ok(!!state, 'Brock: the overlay shows the name bar in the arena');
  if (!state) return { context, errors, page };
  ok(state.name === "Brock's " + team[0].name, 'Brock: name line reads "' + state.name + '"');
  ok(state.level === 'Lv. ' + team[0].level, 'Brock: level reads "' + state.level + '" on the right');
  ok(state.panelTop === BAR_TOP, 'Brock: the name line starts at y ' + BAR_TOP + ' (got ' + state.panelTop + ')');
  ok(
    state.barWidth === BAR_WIDTH && Math.abs(state.barLeft - state.barRightGap) <= 1,
    'Brock: the bar is ' + BAR_WIDTH + ' px wide and centred (got ' + state.barWidth + ' at x ' + state.barLeft + ')'
  );
  ok(state.circles.length === 2, 'Brock: one circle per team member');
  ok(
    state.circles.every((circle) => circle.size === CIRCLE_SIZE) &&
      state.circles[1].left - state.circles[0].left === CIRCLE_PITCH &&
      state.circles[0].left === state.barLeft,
    "Brock: circles are 48 px, 54 px apart, the first on the bar's left edge"
  );
  ok(
    state.circles[0].active && !state.circles[0].pulsing && state.circles[0].stroke === ROCK_BASE,
    'Brock: the active circle is solid Rock colour (' + state.circles[0].stroke + ')'
  );
  ok(
    !state.circles[1].active && state.circles[1].stroke === BLACK_STROKE,
    'Brock: the benched circle has a black stroke'
  );
  ok(
    state.circles[0].image === 'assets/pokemon/' + team[0].dex + '/Portrait.png',
    'Brock: the circle shows the portrait ' + state.circles[0].image
  );

  // cut and fall: a hit makes one piece that holds about 1 s, falls for 0.4 s, and is removed
  await page.evaluate(() => {
    const active = G.GymArena.leaderTeam.active;
    active.hp = Math.max(1, active.hp - active.maxHp * 0.3);
  });
  await page.waitForTimeout(100);
  state = await overlayState(page);
  ok(state.bigPieces === 1, 'Brock: a hit cuts one piece off the bar');
  await page.waitForTimeout(800);
  ok((await overlayState(page)).bigPieces === 1, 'Brock: the piece is still there at 0.9 s (the 1 s hold)');
  await page.waitForTimeout(900);
  ok((await overlayState(page)).bigPieces === 0, 'Brock: the piece is gone by 1.8 s (held 1 s, fell 0.4 s, removed)');

  // a heal grows the fill
  await page.evaluate(() => {
    const active = G.GymArena.leaderTeam.active;
    active.hp = Math.min(active.maxHp, active.hp + active.maxHp * 0.2);
  });
  await page.waitForTimeout(60);
  state = await overlayState(page);
  ok(state.growing && state.bigPieces === 0, 'Brock: a heal grows the fill and cuts no piece');

  // a swap: the outgoing ring turns black, the incoming one pulses through its i-frames, then holds
  await page.evaluate(() => G.Debug.leaderSwap(2)); // the real swap path: the arena hands the field over
  await page.waitForTimeout(100);
  state = await overlayState(page);
  ok(
    !state.circles[0].active && state.circles[0].stroke === BLACK_STROKE,
    'Brock: after a swap the outgoing ring is black'
  );
  ok(state.circles[1].active && state.circles[1].pulsing, 'Brock: the incoming ring pulses');
  ok(
    state.name === "Brock's " + team[1].name && state.bigPieces === 0,
    'Brock: the bar names the new Pokemon, no piece'
  );
  await page.waitForTimeout(600);
  state = await overlayState(page);
  ok(state.circles[1].active && !state.circles[1].pulsing, 'Brock: the ring holds solid once the 0.5 s i-frames end');

  // a faint dims its circle (the benched one, so the fight goes on)
  await page.evaluate(() => {
    G.GymArena.leaderTeam.members[0].dead = true;
  });
  await page.waitForTimeout(100);
  state = await overlayState(page);
  ok(state.circles[0].fainted && !state.circles[0].active, 'Brock: a fainted circle is dimmed');

  // the debug toggle hides it
  await page.evaluate(() => G.Debug.hudOverlay(false));
  await page.waitForTimeout(60);
  ok((await overlayState(page)) === null, 'G.Debug.hudOverlay(false) hides the overlay');
  await page.evaluate(() => G.Debug.hudOverlay(true));
  await page.waitForTimeout(60);
  ok((await overlayState(page)) !== null, 'G.Debug.hudOverlay(true) brings it back');

  return { context, errors, page };
}

async function surge(browser) {
  const { context, page, errors } = await boot(browser);
  await enterGym(page, 3, 1);
  await page.waitForTimeout(300);
  const boss = await page.evaluate(() => {
    const enemy = G.EnemyMgr.all().find((each) => each.boss && !each.dead);
    return { name: enemy.name, level: enemy.gym.level, isPlayer: !!enemy.isPlayer };
  });
  const state = await overlayState(page);
  ok(!boss.isPlayer, 'Lt. Surge: still the old one-Pokemon body');
  ok(
    !!state && state.name === "Lt. Surge's " + boss.name,
    'Lt. Surge: name line reads "' + (state && state.name) + '"'
  );
  ok(
    !!state && state.circles.length === 1 && state.circles[0].active && state.circles[0].stroke === ELECTRIC_BASE,
    'Lt. Surge: one active circle in Electric colour'
  );
  return { context, errors, page };
}

// #62 character info panel, HUD-STYLE "Panel sizes at 1080p" hand-copied: x from the screen centre (960), y from the
// bottom edge (1080) to the piece's bottom. Screen top = 1080 - y - height.
const PANEL = {
  life: { left: 960 - 252, top: 1080 - 140 - 24, width: 462 },
  portrait: { left: 960 - 281 - 58, top: 1080 - 36 - 116, size: 116 },
  slots: [
    { left: 744, top: 1080 - 84 - 44 },
    { left: 960, top: 1080 - 84 - 44 },
    { left: 744, top: 1080 - 36 - 44 },
    { left: 960, top: 1080 - 36 - 44 },
  ],
  slotWidth: 210,
  slotHeight: 44, // the rip's 44 rows (Jess, 2026-11-10)
  well: 36,
  chip: { left: 960 - 244, top: 1080 - 172 - 24, width: 70, height: 24 },
  prompt: { top: 1080 - 304 - 48, height: 48, centre: 960 - 21 }, // above the four chip lines (#76)
  // #76: chip lines, as tops at 1080p: the bad band at y 172 and 202, the good band at 238 and 268
  chipLineTops: { bad: [1080 - 172 - 24, 1080 - 202 - 24], good: [1080 - 238 - 24, 1080 - 268 - 24] },
  item: { left: 960 + 222, top: 1080 - 74 - 40, size: 40 }, // right of the slots (swapped with Lv, 2026-11-10)
  coin: { right: 960 - 260, top: 1080 - 160 - 32, size: 32 }, // 12 px below the chips' line
  levelRight: 960 - 351, // left of the portrait, right-aligned (swapped with the held item)
  hpTextLeft: 960 + 218,
  timerCentre: 960 - 3,
  bondPink: '#ff8ad8',
  slotGrid: 'url(#hud-slot-grid)', // the B2 grid, dark squares 50% larger (Jess, 2026-11-10)
  capital: (type) => type.charAt(0).toUpperCase() + type.slice(1),
  // SV Base, as computed colours (HUD-STYLE "Type colours")
  typeBase: {
    normal: 'rgb(159, 161, 159)',
    fire: 'rgb(230, 40, 41)',
    water: 'rgb(41, 128, 239)',
    grass: 'rgb(63, 161, 41)',
    electric: 'rgb(250, 192, 0)',
    ice: 'rgb(61, 206, 243)',
    fighting: 'rgb(255, 128, 0)',
    poison: 'rgb(145, 65, 203)',
    ground: 'rgb(145, 81, 33)',
    flying: 'rgb(129, 185, 239)',
    psychic: 'rgb(239, 65, 121)',
    bug: 'rgb(145, 161, 25)',
    rock: 'rgb(175, 169, 129)',
    ghost: 'rgb(112, 65, 112)',
    dragon: 'rgb(80, 96, 225)',
    dark: 'rgb(98, 77, 78)',
    steel: 'rgb(96, 161, 184)',
    fairy: 'rgb(239, 112, 239)',
  },
  parFill: 'rgb(239, 173, 0)', // #efad00
  badPoisonShade: 'rgb(57, 16, 66)', // #391042
};

const panelState = (page) =>
  page.evaluate(() => {
    const panel = document.querySelector('.hud-player');
    if (!panel) return null;
    const box = (selector) => {
      const element = panel.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, width: rect.width, height: rect.height };
    };
    const slots = [...panel.querySelectorAll('.hud-slot')].map((slot) => {
      const rect = slot.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        active: slot.classList.contains('is-active'),
        cursors: slot.querySelectorAll('.hud-cursor').length,
        wells: [...slot.querySelectorAll('.hud-well')].map((well) => well.getBoundingClientRect().width),
        icons: slot.querySelectorAll('.hud-well-disc img').length,
        glyphs: [...slot.querySelectorAll('.hud-well-disc img')].map((image) => image.getAttribute('src')),
        discs: [...slot.querySelectorAll('.hud-well-disc')].map((disc) => getComputedStyle(disc).backgroundColor),
        badges: slot.querySelectorAll('.hud-well-badge').length,
        wipes: [...slot.querySelectorAll('.hud-well-shade')].map((shade) => shade.style.getPropertyValue('--wipe')),
        key: slot.querySelector('.hud-slot-key').textContent,
        fills: [...slot.querySelectorAll('rect')].map((shapeRect) => shapeRect.getAttribute('fill').toLowerCase()),
      };
    });
    const chips = [...panel.querySelectorAll('.hud-chip')].map((chip) => {
      const rect = chip.getBoundingClientRect(),
        pixels = [...chip.querySelectorAll('.hud-chip-shape rect')],
        shade = pixels[0] ? getComputedStyle(pixels[0]).fill : null,
        fillPixel = pixels.find((pixel) => getComputedStyle(pixel).fill !== shade);
      return {
        label: chip.textContent.trim(),
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        fill: fillPixel ? getComputedStyle(fillPixel).fill : null,
        shade,
        cornerCut: !!pixels[0] && Number(pixels[0].getAttribute('x')) > 0, // the top row starts in from the side
        timer: !!chip.querySelector('.hud-chip-timer'),
      };
    });
    const text = (selector) => {
      const element = panel.querySelector(selector);
      return element ? element.textContent.trim() : null;
    };
    return {
      life: box('.hud-life svg'),
      portrait: box('.hud-portrait'),
      face: panel.querySelector('.hud-portrait-face img')?.getAttribute('src'),
      exp: panel.querySelector('.hud-portrait').style.getPropertyValue('--exp'),
      slots,
      chips,
      prompt: box('.hud-prompt'),
      promptText: text('.hud-prompt-text'),
      item: box('.hud-item'),
      itemName: text('.hud-item-name'),
      coin: box('.hud-silver-coin'),
      silver: text('.hud-silver-count'),
      level: text('.hud-lv-number'),
      rattling: !!panel.querySelector('.hud-lv-number.is-rattling'),
      levelBox: box('.hud-lv-number'),
      hpText: text('.hud-hp-text'),
      hpTextBox: box('.hud-hp-text'),
      timer: box('.hud-timer'),
      timerText: text('.hud-timer'),
      bond: !!panel.querySelector('.hud-bond'),
    };
  });

const confettiStillFalling = (confetti) => confetti.pieces > 0 && !confetti.fading;

async function playerPanel(browser) {
  const { context, page, errors } = await boot(browser);
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 15000 });
  const moves = await page.evaluate(() => {
    G.Spawner.update = () => {}; // test page only: no wild spawns
    G.EnemyMgr.clear();
    const pl = G.Game.player;
    // three more moves, then bond the first two loose ones: slots are [bond of 2], [one], [one], [empty]
    const extra = Object.keys(G.MoveDefs).filter((id) => !pl.hasMove(id) && !G.MoveDefs[id].persistent);
    for (const id of extra.slice(0, 3)) pl.addMove(id, true);
    pl.bonds = 1;
    const option = pl.bondOptions();
    if (option) pl.fuse(option.loose.slice(0, 2));
    pl.bonds = 0;
    pl.setActive(0, true);
    pl.item = 'leftovers';
    window.__keep = setInterval(() => {
      const p = G.Game.player;
      if (!p || p.dead) return;
      p.maxHp = 300;
      p.hp = 140;
      p.xp = p.xpNext * 0.5;
      const card = !window.__holdCards && G.UI.isOpen('scr-levelup') && document.querySelector('#cards .card');
      if (card) card.click();
    }, 20);
    return pl.slots.map((group) => group.length);
  });
  await page.waitForTimeout(300);
  let state = await panelState(page);
  ok(!!state, 'player: the character info panel shows in a run');
  if (!state) return { context, errors, page };

  ok(
    state.life.left === PANEL.life.left && state.life.top === PANEL.life.top && state.life.width === PANEL.life.width,
    'player: the life meter is ' +
      PANEL.life.width +
      ' px at (' +
      PANEL.life.left +
      ', ' +
      PANEL.life.top +
      ') (got ' +
      [state.life.width, state.life.left, state.life.top].join(', ') +
      ')'
  );
  ok(
    state.hpText === '140 / 300' && state.hpTextBox.left === PANEL.hpTextLeft,
    'player: "' + state.hpText + '" at the end of the life meter'
  );
  ok(
    state.portrait.left === PANEL.portrait.left &&
      state.portrait.top === PANEL.portrait.top &&
      state.portrait.width === PANEL.portrait.size,
    'player: the portrait ring is ' +
      PANEL.portrait.size +
      ' px at (' +
      PANEL.portrait.left +
      ', ' +
      PANEL.portrait.top +
      ')'
  );
  ok(/\/Portrait\.png$/.test(state.face || ''), 'player: the portrait shows ' + state.face);
  ok(state.exp === '180deg', 'player: half the EXP fills half the ring (' + state.exp + ')');

  ok(state.slots.length === 4, 'player: all four move slots show (' + moves.join(',') + ' moves per slot)');
  ok(
    state.slots.every(
      (slot, index) =>
        slot.left === PANEL.slots[index].left &&
        slot.top === PANEL.slots[index].top &&
        slot.width === PANEL.slotWidth &&
        slot.height === PANEL.slotHeight
    ),
    'player: slots are 210 x 48 in a 2x2 grid at their 1080p places'
  );
  ok(
    state.slots.every((slot) => slot.wells.length === 4 && slot.wells.every((width) => width === PANEL.well)),
    'player: every slot has four 36 px wells'
  );
  ok(
    state.slots.map((slot) => slot.icons).join(',') === moves.concat([0, 0, 0, 0]).slice(0, 4).join(','),
    'player: one icon per move, a bond fills one well per move (' +
      state.slots.map((slot) => slot.icons).join(',') +
      ')'
  );
  ok(state.slots[0].fills.includes(PANEL.bondPink), 'player: the bonded slot has the bond pink rim');
  ok(
    state.slots.every((slot) => !slot.fills.includes('url(#hud-type-checker)')) &&
      state.slots[1].fills.includes(PANEL.slotGrid),
    'player: slot bodies are the larger B2 grid'
  );
  const wellTypes = await page.evaluate(() =>
    G.Game.player.slots.map((group) => group.map((move) => move.type || G.MoveInfo.type(move.id)))
  );
  ok(
    state.slots[1].glyphs[0] === 'assets/icons/types/' + PANEL.capital(wellTypes[1][0]) + '_icon.png' &&
      state.slots[1].discs[0] === PANEL.typeBase[wellTypes[1][0]],
    'player: a well is its type colour with the white type glyph (' +
      state.slots[1].glyphs[0] +
      ', ' +
      state.slots[1].discs[0] +
      ')'
  );
  ok(
    state.slots.every((slot) => slot.badges === slot.icons),
    'player: every move shows its family badge (' + state.slots.map((slot) => slot.badges).join(',') + ')'
  );
  ok(
    state.slots.every((slot) => slot.wipes.every((wipe) => /^\d+deg$/.test(wipe))),
    'player: the cooldown is a clock wipe (' + state.slots[0].wipes.join(' ') + ')'
  );
  ok(
    state.slots[3].icons === 0 && !state.slots[3].fills.includes(PANEL.bondPink),
    'player: the empty slot is the dark disabled button'
  );
  ok(
    state.slots[0].active && state.slots[0].cursors === 4 && state.slots.slice(1).every((slot) => slot.cursors === 0),
    'player: only the active slot has the four cursor corners'
  );
  ok(
    state.slots.every((slot) => slot.key.length > 0),
    'player: every slot shows its key (' + state.slots.map((slot) => slot.key).join(' ') + ')'
  );

  ok(
    state.item &&
      state.item.left === PANEL.item.left &&
      state.item.top === PANEL.item.top &&
      state.item.width === PANEL.item.size,
    'player: the held item square is 40 px, right of the slots at x ' + PANEL.item.left
  );
  ok(state.itemName === 'Leftovers', 'player: the held item name reads "' + state.itemName + '"');
  ok(
    state.coin &&
      state.coin.right === PANEL.coin.right &&
      state.coin.top === PANEL.coin.top &&
      state.coin.width === PANEL.coin.size,
    'player: the Silver coin is 32 px (2x), right edge at x ' + PANEL.coin.right
  );
  ok(/^\d[\d,]*$/.test(state.silver || ''), 'player: Silver shows whole coins (' + state.silver + ')');
  ok(
    state.levelBox.right === PANEL.levelRight && /^\d+$/.test(state.level),
    'player: Lv ' + state.level + ' left of the portrait, right edge at x ' + PANEL.levelRight
  );
  ok(
    /^\d+:\d\d$/.test(state.timerText) && Math.abs(state.timer.left + state.timer.width / 2 - PANEL.timerCentre) <= 1,
    'player: the run timer "' + state.timerText + '" is centred under the slots'
  );
  ok(state.chips.length === 0 && state.prompt === null, 'player: no status, no chips and no Shake Off prompt');

  // statuses: paralysis and burn get chips (PAR first, as the status list orders them); Shake Off can work on paralysis
  await page.evaluate(() => {
    const pl = G.Game.player;
    pl.stMajor = { k: 'paralysis', t: 6 };
    pl.burn = 1;
  });
  await page.waitForTimeout(100);
  state = await panelState(page);
  ok(
    state.chips.map((chip) => chip.label).join(' ') === 'PAR BRN',
    'player: paralysis and burn show as chips (' + state.chips.map((chip) => chip.label).join(' ') + ')'
  );
  ok(
    state.chips[0] &&
      state.chips[0].left === PANEL.chip.left &&
      state.chips[0].top === PANEL.chip.top &&
      state.chips[0].width === PANEL.chip.width &&
      state.chips[0].height === PANEL.chip.height &&
      state.chips[0].fill === PANEL.parFill &&
      state.chips[0].cornerCut &&
      state.chips[0].timer,
    'player: the PAR chip is 70 x 24 at its place, in the PAR fill, with cut corners and a timer bar'
  );
  ok(
    state.prompt &&
      state.prompt.top === PANEL.prompt.top &&
      state.prompt.height === PANEL.prompt.height &&
      Math.abs(state.prompt.left + state.prompt.width / 2 - PANEL.prompt.centre) <= 2 &&
      /to Shake Off!$/.test(state.promptText),
    'player: the Shake Off prompt "' + (state.promptText || '') + '" is centred over the life meter'
  );

  // bad poison: the PSN chip with the darker shade
  await page.evaluate(() => {
    const pl = G.Game.player;
    pl.stMajor = null;
    pl.burn = 0;
    pl.poison = 2;
  });
  await page.waitForTimeout(100);
  state = await panelState(page);
  ok(
    state.chips.length === 1 && state.chips[0].label === 'PSN' && state.chips[0].shade === PANEL.badPoisonShade,
    'player: bad poison is the PSN chip with the dark shade (' + (state.chips[0] && state.chips[0].shade) + ')'
  );
  ok(state.prompt === null, 'player: nothing to shake off, no prompt');

  // #76: the bad band (statuses, then stat drops) and the good band (raises, team effects, altar power), two lines each
  await page.evaluate(() => {
    const pl = G.Game.player;
    pl.poison = 0;
    pl.stMajor = { k: 'paralysis', t: 30 };
    pl.stCnf = { t: 30 };
    pl.stDaze = { t: 30 };
    pl.stTrap = { t: 30 };
    pl.stDrow = { t: 30 };
    for (const stat of G.Stages.STATS) G.Stages.add(pl, stat, -1, 30);
  });
  await page.waitForTimeout(100);
  state = await panelState(page);
  const labels = (list) => list.map((chip) => chip.label).join(' ');
  const onLine = (chip, top) => chip && chip.top === top && chip.width === PANEL.chip.width;
  ok(
    labels(state.chips) === 'PAR CNF DZE TRP DRW ATK DEF SPA SPD SPE',
    'effect chips: the worst bad band is 10 chips, statuses then drops (' + labels(state.chips) + ')'
  );
  ok(
    onLine(state.chips[0], PANEL.chipLineTops.bad[0]) &&
      state.chips[0].left === PANEL.chip.left &&
      onLine(state.chips[5], PANEL.chipLineTops.bad[0]) &&
      onLine(state.chips[6], PANEL.chipLineTops.bad[1]) &&
      state.chips[6].left === PANEL.chip.left,
    'effect chips: the bad band fills its lower line (6 chips) first, then the line above'
  );
  ok(
    state.prompt && state.prompt.top === PANEL.prompt.top,
    'effect chips: Shake Off sits above the four chip lines (top ' + (state.prompt && state.prompt.top) + ')'
  );
  const clearance = await page.evaluate(() => {
    const pl = G.Game.player,
      cam = G.Camera,
      canvas = document.querySelector('canvas'),
      ratio = canvas.clientHeight / canvas.height;
    return { feet: (pl.y - cam.top()) * cam.scale * ratio, head: (pl.y - pl.bodyH - cam.top()) * cam.scale * ratio };
  });
  ok(
    state.prompt && state.prompt.top > clearance.feet,
    'effect chips: Shake Off stays below your Pokemon (prompt top ' +
      (state.prompt && state.prompt.top) +
      ', feet at ' +
      Math.round(clearance.feet) +
      ')'
  );
  ok(
    await page.evaluate(() => !document.querySelector('.hud-chip-band.is-good .hud-chip')),
    'effect chips: nothing in the good band while only bad effects are live'
  );

  // the good band: five raises, REG, the four berries, two guards and the altar power is 13, so the last slot is "+2"
  await page.evaluate(() => {
    const pl = G.Game.player;
    pl.stMajor = pl.stCnf = pl.stDaze = pl.stTrap = pl.stDrow = null;
    G.Stages.clear(pl);
    const timed = (key, n) => (pl.stgTeam[key] = [{ n, t: 20, dur: 20, src: 'smoke' }]);
    for (const stat of G.Stages.STATS) timed(stat, 2);
    for (const key of ['regen', 'pct_def', 'pct_spd', 'crit', 'drop', 'guard_fire', 'guard_water']) timed(key, 1);
    pl.power = { def: { id: 'dmg', color: '#ff5f6d', off() {} }, t: 20, dur: 25 };
  });
  await page.waitForTimeout(100);
  state = await panelState(page);
  ok(
    labels(state.chips) === 'ATK DEF SPA SPD SPE REG KEE MAR LAN PIN OCC +2',
    'effect chips: 13 good effects fit as 11 and a "+2" (' + labels(state.chips) + ')'
  );
  ok(
    onLine(state.chips[0], PANEL.chipLineTops.good[0]) && onLine(state.chips[6], PANEL.chipLineTops.good[1]),
    'effect chips: the good band sits at its fixed lines even with the bad band empty'
  );
  ok(
    state.chips[0] && state.chips[0].fill === 'rgb(239, 204, 24)' && state.chips[0].timer,
    'effect chips: ATK is solid in the Attack stat colour, with a timer (' +
      (state.chips[0] && state.chips[0].fill) +
      ')'
  );
  ok(
    state.chips[10] && state.chips[10].fill === PANEL.typeBase.fire,
    'effect chips: the Occa guard is in the Fire type colour (' + (state.chips[10] && state.chips[10].fill) + ')'
  );
  ok(state.prompt === null, 'effect chips: buffs alone bring no Shake Off prompt');

  // net stats: team +2 and own -3 on Speed is one SPE chip in the bad band; the altar chip shows once room is free
  await page.evaluate(() => {
    const pl = G.Game.player;
    for (const key of Object.keys(pl.stgTeam)) delete pl.stgTeam[key];
    pl.stgTeam.spe = [{ n: 2, t: 20, dur: 20, src: 'smoke' }];
    G.Stages.add(pl, 'spe', -3, 20);
  });
  await page.waitForTimeout(100);
  state = await panelState(page);
  ok(
    labels(state.chips) === 'SPE FRY' && state.chips[0].top === PANEL.chipLineTops.bad[0],
    'effect chips: Speed +2 and -3 is one SPE drop chip; the Fury altar power is FRY (' + labels(state.chips) + ')'
  );
  const canvasBuffs = await page.evaluate(() => {
    let drawn = false;
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...rest) {
      if (/^FURIA|^FURY/i.test(String(text))) drawn = true;
      return original.call(this, text, ...rest);
    };
    return new Promise((resolve) =>
      setTimeout(() => {
        CanvasRenderingContext2D.prototype.fillText = original;
        resolve(drawn);
      }, 200)
    );
  });
  ok(!canvasBuffs, 'effect chips: the canvas buff stack stays off while the character panel is up');
  await page.evaluate(() => {
    const pl = G.Game.player;
    for (const key of Object.keys(pl.stgTeam)) delete pl.stgTeam[key];
    G.Stages.clear(pl);
    pl.power = null;
  });

  // level up: the number rattles once, then settles; a pause does not replay it
  ok(!state.rattling, 'player: no rattle before a level-up');
  await page.evaluate(() => G.Game.player.level++);
  await page.waitForTimeout(80);
  ok((await panelState(page)).rattling, 'player: a level-up rattles the Lv number');
  await page.waitForTimeout(800);
  ok(!(await panelState(page)).rattling, 'player: the rattle ends after about 0.6 s');

  // a real level-up (#62, Jess 2026-11-10): the number rattles while you keep playing; the cards open once it settles
  // (1.1 s of run time), with confetti from the popup's top corners; after a pick the confetti fades out within 1 s
  await page.evaluate(() => {
    window.__holdCards = true;
    window.__runTimeAtLevel = G.Game.st.time;
    G.Game.grantLevels(1);
  });
  await page.waitForTimeout(80);
  ok((await panelState(page)).rattling, 'level-up: the Lv number rattles at once');
  await page.waitForTimeout(420);
  let flow = await page.evaluate(() => ({
    cards: G.UI.isOpen('scr-levelup'),
    state: G.Game.state,
    ran: G.Game.st.time - window.__runTimeAtLevel,
  }));
  ok(
    !flow.cards && flow.state === 'playing' && flow.ran > 0.3,
    'level-up: at 0.5 s no cards yet and the game keeps playing (' + flow.state + ', ' + flow.ran.toFixed(2) + ' s run)'
  );
  await page.waitForTimeout(1000);
  flow = await page.evaluate(() => ({
    cards: G.UI.isOpen('scr-levelup'),
    state: G.Game.state,
    confetti: G.Confetti.state(),
  }));
  ok(flow.cards && flow.state === 'levelup', 'level-up: the cards are open by 1.5 s and pause the game');
  ok(
    flow.confetti.pieces > 20 && !flow.confetti.fading,
    'level-up: confetti bursts with the cards (' + flow.confetti.pieces + ' pieces)'
  );
  await page.waitForTimeout(400);
  ok(
    confettiStillFalling(await page.evaluate(() => G.Confetti.state())),
    'level-up: the confetti keeps falling while the game is paused'
  );
  // pick the first card; a Vitamins card asks for a stat on the same screen, so pick again until it closes
  for (let tries = 0; tries < 3 && (await page.evaluate(() => G.UI.isOpen('scr-levelup'))); tries++) {
    await page.evaluate(() => document.querySelector('#cards .card').click());
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(90);
  flow = await page.evaluate(() => ({
    state: G.Game.state,
    confetti: G.Confetti.state(),
    openScreens: [...document.querySelectorAll('.scr:not(.hidden)')].map((screen) => screen.id),
  }));
  ok(
    flow.state === 'playing' && flow.confetti.fading,
    'level-up: a pick resumes play and the confetti starts fading (' +
      flow.state +
      ', open: ' +
      flow.openScreens.join(' ') +
      ')'
  );
  await page.waitForTimeout(1100);
  ok(
    (await page.evaluate(() => G.Confetti.state())).pieces === 0,
    'level-up: the confetti is gone within 1 s of the pick'
  );
  await page.evaluate(() => (window.__holdCards = false));

  // the debug toggle hides the panel with the rest of the overlay
  await page.evaluate(() => G.Debug.hudOverlay(false));
  await page.waitForTimeout(60);
  ok((await panelState(page)) === null, 'player: G.Debug.hudOverlay(false) hides the panel');
  await page.evaluate(() => G.Debug.hudOverlay(true));
  await page.waitForTimeout(60);
  ok((await panelState(page)) !== null, 'player: G.Debug.hudOverlay(true) brings it back');
  return { context, errors, page };
}

/** #63: the roster rows, held items, benched chips and berry bag (lower left), and the run item column (lower right). */
const rosterState = (page) =>
  page.evaluate(() => {
    const rows = [...document.querySelectorAll('.hud-roster-row')].map((row) => {
      const rect = row.getBoundingClientRect();
      return {
        name: row.querySelector('.hud-roster-name').textContent.trim(),
        key: row.querySelector('.hud-roster-key').textContent.trim(),
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        cursors: row.querySelectorAll('.hud-cursor').length,
        chips: [...row.querySelectorAll('.hud-chip')].map((chip) => chip.textContent.trim()),
        cooldown: !!row.querySelector('.hud-roster-cooldown'),
        fainted: row.classList.contains('is-fainted'),
      };
    });
    const held = [...document.querySelectorAll('.hud-roster-held')].map((square) => square.getBoundingClientRect());
    const berries = [...document.querySelectorAll('.hud-berry')].length;
    const berryNames = [...document.querySelectorAll('.hud-berry-name')].map((name) => name.textContent.trim());
    const runBoxes = [...document.querySelectorAll('.hud-run-item')].map((box) => box.getBoundingClientRect());
    const runNames = [...document.querySelectorAll('.hud-run-name')].map((name) => name.textContent.trim());
    const runIcons = document.querySelectorAll('.hud-run-icon canvas').length;
    return { rows, held, berries, berryNames, runBoxes, runNames, runIcons };
  });

async function rosterPanel(browser) {
  const { context, page, errors } = await boot(browser);
  await page.evaluate(() => {
    const save = G.DB.save;
    save.team = [{ dex: 7 }, { dex: 25 }, null, { dex: 1 }, { dex: 4 }, null]; // slot 3 left empty
    save.berrySlots = 3;
    save.runSlots = 2;
  });
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 15000 });
  await page.evaluate(() => {
    G.Spawner.update = () => {}; // test page only: no wild spawns
    G.EnemyMgr.clear();
    for (const member of G.Game.roster) member.invuln = 1e9;
  });
  await page.waitForTimeout(150);
  let state = await rosterState(page);
  ok(
    state.rows.map((row) => row.key).join(' ') === '1 2 4 5',
    'roster: one row per filled slot, in slot order, keeping their keys (' +
      state.rows.map((row) => row.key).join(' ') +
      ')'
  );
  const first = state.rows[0],
    last = state.rows[state.rows.length - 1];
  ok(
    first && first.left === 16 && first.width === 278 && first.height === 64,
    'roster: rows are 278 x 64 at x 16 (' + (first && [first.left, first.width, first.height].join(', ')) + ')'
  );
  ok(last && last.top + last.height === 1080 - 42, 'roster: the lowest row sits 42 px above the bottom');
  ok(
    state.rows.every((row, index) => index === 0 || row.top - state.rows[index - 1].top === 68),
    'roster: rows are 68 px apart'
  );
  ok(
    state.held.length === 4 && state.held[0].left === 16 + 278 + 8 && state.held[0].width === 48,
    'roster: a 48 px held item square 8 px right of each row'
  );
  ok(
    first.cursors === 4 && state.rows.slice(1).every((row) => row.cursors === 0),
    'roster: the active row (slot 1) wears the selection cursor, the others do not'
  );
  ok(
    state.rows.every((row) => !row.cooldown),
    'roster: no swap cooldown shade before a swap'
  );

  // a swap: the cursor moves, every other living row dims under the cooldown
  await page.evaluate(() => G.Game.swap(1));
  await page.waitForTimeout(100);
  state = await rosterState(page);
  ok(
    state.rows[1].cursors === 4 && state.rows[0].cursors === 0,
    'roster: after a swap to slot 2 the cursor is on its row'
  );
  ok(
    !state.rows[1].cooldown && state.rows[0].cooldown && state.rows[2].cooldown && state.rows[3].cooldown,
    'roster: the swap cooldown shades the benched rows, not the active one'
  );

  // a benched Pokemon's status shows as chips in its row; the active one's stay on the bottom panel
  await page.evaluate(() => {
    G.Game.roster[0].burn = 1;
    G.Game.player.stMajor = { k: 'paralysis', t: 6 };
  });
  await page.waitForTimeout(100);
  state = await rosterState(page);
  ok(
    state.rows[0].chips.join(' ') === 'BRN' && state.rows[1].chips.length === 0,
    'roster: a benched burn shows a BRN chip in its row; the active row shows none (' +
      state.rows[0].chips.join(' ') +
      ' / ' +
      state.rows[1].chips.join(' ') +
      ')'
  );

  // a faint: the row dims and takes no cooldown shade
  await page.evaluate(() => {
    const member = G.Game.roster.find((fighter) => fighter.teamSlot === 3);
    member.dead = true;
    member.hp = 0;
  });
  await page.waitForTimeout(100);
  state = await rosterState(page);
  ok(state.rows[2].fainted && !state.rows[2].cooldown, 'roster: a fainted row is dimmed, with no cooldown shade');

  // the berry bag follows the purchased slots; a stored berry shows its name
  await page.evaluate(() => G.Game.player.berries.push('cheri'));
  await page.waitForTimeout(100);
  state = await rosterState(page);
  ok(
    state.berries === 3 && state.berryNames.join(',') === 'Cheri Berry',
    'roster: 3 berry slots for 3 purchased; the stored Cheri Berry shows its name (' +
      state.berries +
      ', ' +
      state.berryNames.join(',') +
      ')'
  );

  // the run items follow the unlocked slots; an item shows its name and icon
  await page.evaluate(() => G.Game.player.runItems.push('amuletcoin'));
  await page.waitForTimeout(100);
  state = await rosterState(page);
  ok(
    state.runBoxes.length === 2 && state.runNames.join(',') === 'Amulet Coin' && state.runIcons === 1,
    'run items: 2 boxes for 2 unlocked slots; Amulet Coin shows its name and icon (' +
      state.runBoxes.length +
      ', ' +
      state.runNames.join(',') +
      ')'
  );
  const lowestRun = state.runBoxes[0];
  ok(
    lowestRun && lowestRun.right === 1920 - 24 && lowestRun.bottom === 1080 - 42 && lowestRun.width === 280,
    'run items: slot 1 is the lowest box, 280 px wide, 24 px from the right and 42 px from the bottom'
  );

  // a team of one shows no roster; the berry bag drops to the corner
  await page.evaluate(() => {
    G.DB.save.team = [{ dex: 7 }, null, null, null, null, null];
    G.Game.startRun();
  });
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 15000 });
  await page.waitForTimeout(150);
  state = await rosterState(page);
  ok(state.rows.length === 0 && state.berries === 3, 'roster: a team of one shows no rows, the berry bag stays');
  return { context, errors, page };
}

/** #65: World Level, Region and Map top right, the weather card's slide and Clear Sky steps, the kills line. */
const mapState = (page) =>
  page.evaluate(() => {
    const panel = document.querySelector('.hud-map'),
      kills = document.querySelector('.hud-kills'),
      card = document.querySelector('.hud-weather');
    return {
      panelRight: panel ? Math.round(panel.getBoundingClientRect().right) : null,
      panelTop: panel ? Math.round(panel.getBoundingClientRect().top) : null,
      lines: panel
        ? [...panel.children].filter((child) => !child.matches('.hud-weather')).map((c) => c.textContent)
        : [],
      kills: kills ? kills.textContent : null,
      killsCentre: kills
        ? Math.round((kills.getBoundingClientRect().left + kills.getBoundingClientRect().right) / 2)
        : 0,
      card: card
        ? {
            phase: ['is-enter', 'is-exit', 'is-fade'].find((name) => card.classList.contains(name)),
            name: card.querySelector('.hud-weather-name').textContent.trim(),
            nameColour: getComputedStyle(card.querySelector('.hud-weather-name')).color,
            icon: card.querySelector('img').getAttribute('src'),
            timer: !!card.querySelector('.hud-weather-timer'),
            timerFill: card.querySelector('.hud-weather-timer')
              ? getComputedStyle(card.querySelector('.hud-weather-timer')).backgroundImage
              : '',
            right: Math.round(card.getBoundingClientRect().right),
            // the icon sits between the two layers of the shape: the stripe is drawn over it
            iconBetweenLayers: [...card.children]
              .map((child) => child.tagName.toLowerCase())
              .join(' ')
              .startsWith('svg img svg'),
          }
        : null,
      expectedLevel: String(Math.floor(G.Enemies.levelForTime(G.Game.st.time))),
      expectedMap: G.T(G.World.biomeName()),
    };
  });

async function mapPanel(browser) {
  const { context, page, errors } = await boot(browser);
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 15000 });
  await page.evaluate(() => {
    G.Spawner.update = () => {}; // test page only: no wild spawns
    G.EnemyMgr.clear();
    G.Game.player.invuln = 1e9;
    G.Game.player.kills = 123;
    G.Weather.clear();
  });
  await page.waitForTimeout(150);
  let state = await mapState(page);
  ok(state.panelRight === 1920 - 24 && state.panelTop === 24, 'map: panel 24 px in from the top right corner');
  ok(
    state.lines[0] === state.expectedLevel && state.lines[1] === 'World Level',
    'map: World Level number over its label (' + state.lines.slice(0, 2).join(' / ') + ')'
  );
  ok(
    state.lines.includes(state.expectedMap),
    'map: the Map line names the biome in English (' + state.expectedMap + ')'
  );
  ok(state.kills === '123 Kills', 'kills: "123 Kills" outside an arena (' + state.kills + ')');
  ok(Math.abs(state.killsCentre - 960) <= 1, 'kills: centred at the top');
  ok(state.card === null, 'weather: no card with no weather');

  const card = async () => (await mapState(page)).card;
  await page.evaluate(() => G.Weather.debugStart('rain', 60));
  await page.waitForTimeout(150);
  let shown = await card();
  ok(
    shown && shown.phase === 'is-enter' && shown.name === 'Rain' && /rain-white\.png$/.test(shown.icon) && shown.timer,
    'weather: rain slides in with its icon and a timer (' + JSON.stringify(shown) + ')'
  );
  await page.waitForTimeout(600); // past the 0.6 s slide in
  shown = await card();
  // Water's SV colours (HUD-STYLE Type colours, hand-copied): Light #74ACF5, Base #2980EF
  ok(
    shown && shown.right === 1920,
    'weather: the card runs to the screen edge once it lands (' + (shown && shown.right) + ')'
  );
  ok(shown && shown.nameColour === 'rgb(116, 172, 245)', 'weather: the name is in the weather type Light colour');
  ok(
    shown && /rgb\(116, 172, 245\)/.test(shown.timerFill) && /rgb\(41, 128, 239\)/.test(shown.timerFill),
    'weather: the timer is Light over Base'
  );
  ok(shown && shown.iconBetweenLayers, 'weather: the icon is under the stripe layer');

  // a change of weather: the old card slides off, the new one slides in, no Clear Sky between
  await page.evaluate(() => G.Weather.debugStart('fog', 60));
  await page.waitForTimeout(100);
  shown = await card();
  ok(shown && shown.phase === 'is-exit' && shown.name === 'Rain', 'weather: on a change the old card slides off first');
  await page.waitForTimeout(450); // past the 380 ms slide off
  shown = await card();
  ok(
    shown && shown.phase === 'is-enter' && shown.name === 'Fog',
    'weather: then the new weather slides in (not Clear Sky)'
  );

  // the weather ends: slide off, Clear Sky slides in, holds about 2 s, fades, gone
  await page.evaluate(() => G.Weather.clear());
  await page.waitForTimeout(100);
  shown = await card();
  ok(shown && shown.phase === 'is-exit' && shown.name === 'Fog', 'weather: on its end the card slides off');
  await page.waitForTimeout(450);
  shown = await card();
  ok(
    shown &&
      shown.phase === 'is-enter' &&
      shown.name === 'Clear Sky' &&
      !shown.timer &&
      /clear-white\.png$/.test(shown.icon),
    'weather: Clear Sky slides in after it, with no timer'
  );
  await page.waitForTimeout(1900); // 0.6 s slide in + 2 s hold, from the slide in
  shown = await card();
  ok(shown && shown.phase === 'is-enter', 'weather: Clear Sky still holds just under 2.6 s after it arrived');
  await page.waitForTimeout(900); // Clear Sky landed up to ~170 ms before the first look: now inside the 0.7 s fade
  shown = await card();
  ok(shown && shown.phase === 'is-fade', 'weather: then Clear Sky fades (its only exit that is not a slide)');
  await page.waitForTimeout(800);
  ok((await card()) === null, 'weather: and is gone after the fade');

  // an arena fight hides the kills line; the map panel stays
  await page.evaluate(() => {
    G.Game.state = 'menu';
  });
  await context.close();
  const gym = await boot(browser);
  await enterGym(gym.page, 1, 2);
  await gym.page.waitForTimeout(150);
  state = await mapState(gym.page);
  ok(state.kills === null, 'kills: hidden during an arena fight');
  ok(state.panelRight === 1920 - 24, 'map: the panel stays in the arena');
  await gym.page.evaluate(() => clearInterval(window.__keep));
  errors.push(...gym.errors);
  gym.page.notes.push(...page.notes);
  return { context: gym.context, errors, page: gym.page };
}

/** #66: the DPS-Upgrades panel (top left): header, sparkline colours and swap tick, the team upgrade list. */
const dpsState = (page) =>
  page.evaluate(() => {
    const panel = document.querySelector('.hud-dps');
    if (!panel) return null;
    const rect = panel.getBoundingClientRect(),
      canvas = panel.querySelector('.hud-dps-spark canvas'),
      pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data,
      colours = new Set();
    let tickColumns = 0;
    for (let x = 0; x < canvas.width; x++) {
      // a swap tick: a faint white column from top to bottom (sampled at the top row, where the line rarely is)
      const top = (x + 0 * canvas.width) * 4;
      if (pixels[top + 3] > 0 && pixels[top] > 200 && pixels[top + 1] > 200 && pixels[top + 2] > 200) tickColumns++;
    }
    for (let index = 0; index < pixels.length; index += 4)
      if (pixels[index + 3] === 255)
        colours.add('#' + [0, 1, 2].map((k) => pixels[index + k].toString(16).padStart(2, '0')).join(''));
    return {
      left: rect.left,
      top: rect.top,
      width: Math.round(rect.width),
      name: panel.querySelector('.hud-dps-name').textContent.trim(),
      number: panel.querySelector('.hud-dps-number').textContent.trim(),
      divider: !!panel.querySelector('.hud-dps-divider'),
      cards: [...panel.querySelectorAll('.hud-dps-card')].map((row) => ({
        label: row.querySelector('.hud-dps-card-name').textContent.trim(),
        count: row.querySelector('.hud-dps-card-count').textContent.trim(),
      })),
      colours: [...colours],
      tickColumns,
      fonts: ['.hud-dps-name', '.hud-dps-number', '.hud-dps-unit'].map((selector) =>
        getComputedStyle(panel.querySelector(selector)).fontFamily.split(',')[0].replace(/['"]/g, '').trim()
      ),
    };
  });

async function dpsPanel(browser) {
  const { context, page, errors } = await boot(browser);
  // Squirtle (Water) in slot 1, Charmander (Fire) in slot 2
  await page.evaluate(
    () => (G.DB.save.team = [{ dex: 7, shiny: false }, { dex: 4, shiny: false }, null, null, null, null])
  );
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 15000 });
  await page.evaluate(() => {
    G.Spawner.update = () => {}; // test page only: no wild spawns, so no damage but the test's own
    G.EnemyMgr.clear();
    for (const member of G.Game.roster) member.invuln = 1e9;
  });
  await page.waitForTimeout(150);
  let state = await dpsState(page);
  ok(!!state, 'dps: the panel shows in a run');
  if (!state) return { context, errors, page };
  // HUD-STYLE "DPS-Upgrades panel", hand-copied: 16 px in from the top left, 320 px wide
  ok(state.left === 16 && state.top === 16 && state.width === 320, 'dps: 16 px in from the top left, 320 px wide');
  ok(state.name === 'Squirtle', 'dps: the header names the active Pokemon (' + state.name + ')');
  ok(state.number === '0', 'dps: 0 DPS before any hit (' + state.number + ')');
  ok(!state.divider && state.cards.length === 0, 'dps: no divider and no list before a card is picked');
  // the panel is a "module": Michroma for all its text (Jess, 2026-11-10), declared as HudModule
  ok(
    state.fonts.every((font) => font === 'HudModule'),
    'dps: name, number and unit use Michroma (' + state.fonts.join(' ') + ')'
  );
  ok(
    /font-family: 'HudModule';[^}]*Michroma-Regular.ttf/.test(
      fs.readFileSync(path.join(root, 'css/hud-overlay.css'), 'utf8')
    ),
    'dps: HudModule is the Michroma file'
  );

  // a 600 damage hit by Squirtle, through the real after-hit hook: the 5 s number is 600 over the finished seconds (at
  // most 5) once its second finishes
  const hitSecond = await page.evaluate(() => {
    G.Game.player.onDealt(600);
    return G.DpsHistory.finishedSeconds(G.Game.player.team.dpsHistory);
  });
  await page.waitForFunction(
    (second) => G.DpsHistory.finishedSeconds(G.Game.player.team.dpsHistory) > second,
    hitSecond,
    { timeout: 3000, polling: 50 }
  );
  await page.waitForTimeout(80);
  const finished = await page.evaluate(() => G.DpsHistory.finishedSeconds(G.Game.player.team.dpsHistory));
  state = await dpsState(page);
  const expected = String(Math.round(600 / Math.min(5, finished)));
  ok(
    state.number === expected,
    'dps: 600 damage reads ' + expected + ' DPS after ' + finished + ' s (' + state.number + ')'
  );
  // Water Base #2980EF (HUD-STYLE Type colours)
  ok(state.colours.includes('#2980ef'), "dps: Squirtle's stretch is Water Base (" + state.colours.join(' ') + ')');

  // swap to Charmander and hit: the line turns Fire Base #E62829 and a swap tick appears
  await page.evaluate(() => G.Game.swap(1));
  await page.waitForFunction(() => G.Game.player.mon.name === 'Charmander', null, { timeout: 3000 });
  const swapSecond = await page.evaluate(() => {
    G.Game.player.invuln = 1e9;
    G.Game.player.onDealt(900);
    return G.DpsHistory.finishedSeconds(G.Game.player.team.dpsHistory);
  });
  await page.waitForFunction(
    (second) => G.DpsHistory.finishedSeconds(G.Game.player.team.dpsHistory) > second + 1,
    swapSecond,
    { timeout: 4000, polling: 50 }
  );
  await page.waitForTimeout(80);
  state = await dpsState(page);
  ok(state.name === 'Charmander', 'dps: the header follows the swap (' + state.name + ')');
  ok(
    state.colours.includes('#2980ef') && state.colours.includes('#e62829'),
    'dps: one continuous line, Water then Fire (' + state.colours.join(' ') + ')'
  );
  ok(state.tickColumns >= 1, 'dps: a swap tick marks the change (' + state.tickColumns + ' columns)');

  // team upgrade cards: two Gate Reduction picks and one Vitamins (Attack); each row is the name and its pick count (#77)
  await page.evaluate(() => {
    G.TeamCards.add(G.Game.player.teamCards, 'gate', 2);
    G.TeamCards.add(G.Game.player.teamCards, 'vitamins:atk', 1);
  });
  await page.waitForTimeout(100);
  state = await dpsState(page);
  ok(state.divider, 'dps: the divider shows once a card is picked');
  ok(
    state.cards.map((card) => card.label).join(' | ') === 'Gate Reduction | Protein',
    'dps: the list names the run cards (' + state.cards.map((card) => card.label).join(' | ') + ')'
  );
  ok(
    state.cards.map((card) => card.count).join(' ') === 'x2 x1',
    'dps: each row shows its pick count, not a total (' + state.cards.map((card) => card.count).join(' ') + ')'
  );

  // Settings > DPS Panel Opacity: the whole panel at one opacity, default 60%, 20% at the least (Jess, 2026-11-10)
  const opacity = () => page.evaluate(() => +getComputedStyle(document.querySelector('.hud-dps')).opacity);
  ok(
    Math.abs((await opacity()) - 0.6) < 0.001,
    'dps: the whole panel is at 60% by default (' + (await opacity()) + ')'
  );
  await page.evaluate(() => G.Settings.set('dpsPanelOpacity', 0.9));
  await page.waitForTimeout(100);
  ok(Math.abs((await opacity()) - 0.9) < 0.001, 'dps: the slider value applies at once (' + (await opacity()) + ')');
  await page.evaluate(() => G.Settings.set('dpsPanelOpacity', 0.05));
  await page.waitForTimeout(100);
  ok(Math.abs((await opacity()) - 0.2) < 0.001, 'dps: never below 20% (' + (await opacity()) + ')');
  await page.evaluate(() => G.Settings.set('dpsPanelOpacity', 0.6));

  // the Settings toggle (default on) hides the panel and brings it back; the record keeps running while hidden
  ok(await page.evaluate(() => G.Settings.get('showDpsPanel')), 'dps: the setting defaults to on');
  const secondsBefore = await page.evaluate(() => {
    G.Settings.set('showDpsPanel', false);
    return G.DpsHistory.finishedSeconds(G.Game.player.team.dpsHistory);
  });
  await page.waitForTimeout(1200);
  ok((await dpsState(page)) === null, 'dps: the setting off hides the panel');
  ok(
    (await page.evaluate(() => G.DpsHistory.finishedSeconds(G.Game.player.team.dpsHistory))) > secondsBefore,
    'dps: the record keeps running while the panel is hidden'
  );
  await page.evaluate(() => G.Settings.set('showDpsPanel', true));
  await page.waitForTimeout(100);
  ok((await dpsState(page)) !== null, 'dps: the setting on brings it back');
  return { context, errors, page };
}

async function built(browser) {
  const { context, page, errors } = await openPage(browser, 'index.html');
  await page.waitForTimeout(1500);
  const loaded = await page.evaluate(() => ({
    libraries: !!(
      window.preact &&
      window.preactHooks &&
      window.htm &&
      window.preactSignals &&
      window.preactSignalsCore
    ),
    overlay: !!document.querySelector('.hud-overlay'),
  }));
  ok(loaded.libraries, 'built index.html: Preact, hooks, htm and Signals load from the bundle');
  ok(loaded.overlay, 'built index.html: the overlay layer is mounted');
  return { context, errors, page };
}

(async () => {
  const browser = await chromium.launch();
  const runs = [brock, surge, playerPanel, rosterPanel, mapPanel, dpsPanel];
  if (process.argv.includes('--built')) {
    if (fs.existsSync(path.join(root, 'index.html'))) runs.push(built);
    else ok(false, 'built index.html: missing, run node tools/build.js first');
  }
  for (const run of runs) {
    try {
      const { context, errors, page } = await run(browser);
      ok(
        errors.length === 0,
        run.name + ': no page errors' + (errors.length ? ' (' + errors.slice(0, 3).join(' | ') + ')' : '')
      );
      if (page.notes.length)
        console.log('note  ' + run.name + ': ' + page.notes.length + ' font request(s) blocked by headless file://');
      await context.close();
    } catch (error) {
      ok(false, run.name + ': threw ' + error.message);
    }
  }
  await browser.close();
  console.log(failures ? 'smoke-hud-overlay: ' + failures + ' FAILED' : 'smoke-hud-overlay: all passed');
  process.exit(failures ? 1 : 0);
})();
