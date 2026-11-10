// tools/smoke-leader-overlay.js: headless browser check for #51, the ?dev leader planner overlay (LEADER-AI OVERLAY). A check, not a
// harness: tools/check.js only syntax-checks it, since it needs a browser. Playwright is NOT a repo dependency (PLAYWRIGHT_DIR, as
// in tools/smoke-gym.js). Usage from the repo root:  node tools/smoke-leader-overlay.js
// Runs dev.html?dev over file:// (how Jess plays), opens Misty's gym (G.Debug.gym(2)), enters, turns the hitbox overlay on, and
// lets the fight run with you 70 px from her. Checks: she runs a plan (a goal and its steps), the overlay's status, plan lines and a
// window bar for a revealed move of yours read out, frames keep drawing with the overlay on, and the quiet pause freezes it.
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const ok = (c, m) => {
  console.log((c ? 'ok    ' : 'FAIL  ') + m);
  if (!c) fail++;
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
  const waitFor = (fn, arg, ms = 15000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 50 });
  await page.goto(url.pathToFileURL(path.join(root, 'dev.html')).href + '?dev', { waitUntil: 'load' });
  await waitFor(() => window.G && G.Game && G.DB && G.GymArena && G.Debug && G.LeaderPlanner, null, 30000);
  await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    const t = document.getElementById('tap-start');
    if (t && !t.classList.contains('hidden')) t.click(); // headless cannot play sound: pass "press to start" first
    const s = G.DB.save;
    s.team = [{ dex: 1, shiny: false }, null, null, null, null, null];
    s.partner = 1;
    s.partnerShiny = false;
  });
  await page.evaluate(() => G.Game.startRun());
  await waitFor(() => G.Game.player && G.Game.state === 'playing');
  await page.evaluate(() => {
    G.Spawner.update = () => {}; // test page only: no wild spawns
    G.EnemyMgr.clear();
    G.Debug.gym(2);
  });
  await waitFor(() => !!G.GymArena.gate);
  ok((await page.evaluate(() => G.GymArena.gate.gym.leader)) === 'Misty', 'G.Debug.gym(2) opens Misty');
  await page.evaluate(() => G.GymArena.enterRequest());
  await waitFor(() => G.GymArena.inArena && G.GymArena.leaderAI && G.EnemyMgr.all().some((e) => e.boss && !e.dead));
  await page.evaluate(() => {
    G.Debug.hitbox(true);
    window.__frames = 0;
    const raf = () => {
      window.__frames++;
      window.__raf = requestAnimationFrame(raf);
    };
    raf();
    // keep your Pokemon alive, 70 px east of her, and take any level card that would hold the game
    window.__keep = setInterval(() => {
      const pl = G.Game.player,
        b = G.EnemyMgr.all().find((e) => e.boss && !e.dead);
      if (!pl || pl.dead) return;
      pl.maxHp = 1e6;
      pl.hp = 1e6;
      const card = G.UI.isOpen('scr-levelup') && document.querySelector('#cards .card');
      if (card) card.click();
      if (b) {
        pl.x = b.x + 70;
        pl.y = b.y;
      }
    }, 50);
  });
  await sleep(6000);
  const read = await page.evaluate(() => {
    const ai = G.GymArena.leaderAI;
    return {
      overlay: G.MoveRender.overlay,
      plan: ai.plan && { goal: ai.plan.goal, steps: ai.plan.steps.length },
      status: ai.status(),
      lines: ai.overlayLines(),
      bars: ai.windowBars(),
      reveals: (() => {
        const you = G.Game.roster[G.Game.activeIndex];
        return G.GymArena.leaderInfo.reveals(you).moves;
      })(),
      frames: window.__frames,
    };
  });
  ok(read.overlay === true, 'the hitbox overlay is on');
  ok(!!read.plan && read.plan.steps >= 1, 'she runs a plan: ' + JSON.stringify(read.plan));
  ok(/goal \w+ \(value/.test(read.status), 'the status line: ' + read.status);
  ok(read.lines.length >= 1 && /cost/.test(read.lines[0]), 'the plan lines: ' + read.lines.join(' / '));
  ok(
    !read.reveals.length || read.bars.length >= 1,
    'a window bar per revealed move of yours (' + read.reveals.join(', ') + '): ' + JSON.stringify(read.bars)
  );
  ok(read.frames > 120, 'frames keep drawing with the overlay on: ' + read.frames + ' in 6 s');

  // the quiet pause freezes the frame with the overlay still up
  await page.evaluate(() => G.Debug.quietPause(true));
  await page.keyboard.down('Escape');
  await sleep(80);
  await page.keyboard.up('Escape');
  await sleep(200);
  const a = await page.evaluate(() => ({ state: G.Game.state, t: G.Log.t, overlay: G.MoveRender.overlay }));
  await sleep(400);
  const b = await page.evaluate(() => G.Log.t);
  ok(a.state === 'paused' && a.overlay && b === a.t, 'Escape freezes it with the overlay up (state ' + a.state + ')');

  await page.evaluate(() => {
    clearInterval(window.__keep);
    cancelAnimationFrame(window.__raf);
  });
  ok(errs.length === 0, 'no page or console errors' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  if (notes.length) console.log('note  known file:// font noise (not a failure): ' + notes.length + ' line(s)');
  await browser.close();
  console.log(fail ? 'smoke-leader-overlay: ' + fail + ' FAILED' : 'smoke-leader-overlay: all passed');
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
