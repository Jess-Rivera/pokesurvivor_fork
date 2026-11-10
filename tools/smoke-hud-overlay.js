// tools/smoke-hud-overlay.js: headless browser check for the HTML HUD pilot (#64): the enemy name bar and the leader portrait
// circles on the overlay (js/ui/hud-overlay.js, docs/HUD-STYLE.md). A check, not a harness: tools/check.js only syntax-checks it.
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
      pieces: panel.querySelectorAll('.hud-boss-piece').length,
      // the test's own hit is 30% of the bar; Brock's Life Orb costs (1% a cast) cut small pieces of their own
      bigPieces: [...panel.querySelectorAll('.hud-boss-piece')].filter((piece) => piece.offsetWidth > 100).length,
      growing: !!panel.querySelector('.hud-boss-fill.is-growing'),
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
  const runs = [brock, surge];
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
