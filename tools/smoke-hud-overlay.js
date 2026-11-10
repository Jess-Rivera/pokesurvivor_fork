// tools/smoke-hud-overlay.js: headless browser check for the HTML HUD: the #64 pilot (the enemy name bar and the leader portrait
// circles) and the #62 character info panel (js/ui/hud-*.js, docs/HUD-STYLE.md). A check, not a harness: check.js syntax-checks it.
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
  prompt: { top: 1080 - 208 - 48, height: 48, centre: 960 - 21 },
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
      const rect = chip.getBoundingClientRect();
      return {
        label: chip.textContent.trim(),
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        fill: getComputedStyle(chip).backgroundColor,
        shade: getComputedStyle(chip).borderTopColor,
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
      state.chips[0].timer,
    'player: the PAR chip is 70 x 24 at its place, in the PAR fill, with a timer bar'
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
  const runs = [brock, surge, playerPanel];
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
