// tools/smoke-gym.js: headless browser check for a real gym fight (entity model slice 5, docs/proposals/host-model-plan.md).
// A check, not a harness: tools/check.js only syntax-checks it, since it needs a browser. Playwright is NOT a repo dependency
// (PLAYWRIGHT_DIR, default C:\Users\boric\tools\playwright), as in tools/smoke-team.js. Usage from the repo root:
//   node tools/smoke-gym.js
// Runs dev.html?dev over file:// (how Jess plays) and fights gym 2 (Misty, a G.GymLeader from slice 5 on) and gym 1 (Brock, the old
// body until slice 12) through the real game: the gate opens, the arena starts, the leader casts at you, YOUR OWN MOVES take its last
// HP, and the win pays one badge, one link, a kill, a boss count and the leader's EVs, then you return to the map. Written to pass on
// the code BEFORE slice 5 changes a leader, then to pass with Misty switched over: only the body lines at the marked spot differ.
// The test keeps your Pokemon alive and beside the leader, and switches wild spawns off. Fails on any page error, console error or
// failed local request. Chromium blocks font files over file://, reported as a note, not a failure (see tools/smoke-team.js).
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

let fail = 0;
const ok = (c, m) => {
  console.log((c ? 'ok    ' : 'FAIL  ') + m);
  if (!c) fail++;
};

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = [];
  const FONT = /assets\/fonts\/[^ ]*\.(ttf|otf|woff2?)/i;
  page.notes = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => {
    if (r.url().startsWith('file:')) (FONT.test(r.url()) ? page.notes : errs).push('requestfailed: ' + r.url());
  });
  page.on('console', (m) => {
    if (m.type() !== 'error' || /net::ERR_/.test(m.text())) return;
    (FONT.test(m.text()) ? page.notes : errs).push('console: ' + m.text().slice(0, 140));
  });
  await page.goto(url.pathToFileURL(path.join(root, 'dev.html')).href + '?dev', { waitUntil: 'load' });
  await page.waitForFunction(() => window.G && G.Game && G.DB && G.Gym && G.GymArena && G.Debug, null, {
    timeout: 30000,
  });
  await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    const t = document.getElementById('tap-start');
    if (t && !t.classList.contains('hidden')) t.click(); // headless cannot play sound: pass "press to start" first
    const s = G.DB.save;
    s.team = [{ dex: 7, shiny: false }, null, null, null, null, null];
    s.partner = 7;
    s.partnerShiny = false;
  });
  return { ctx, page, errs };
}

/** One fight, gym n of the region. `leaderName` and `badge` are hand-checked from js/data/gyms.js. */
async function fight(browser, n, leaderName, badge, isEntity) {
  const tag = leaderName;
  const { ctx, page, errs } = await boot(browser);
  const waitFor = (fn, arg, ms = 15000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 50 });
  await page.evaluate(() => G.Game.startRun());
  await waitFor(() => G.Game.player && G.Game.state === 'playing');
  await page.evaluate((gymN) => {
    G.Spawner.update = () => {}; // test page only: no wild spawns
    G.EnemyMgr.clear();
    G.Debug.gym(gymN);
  }, n);
  await waitFor(() => !!G.GymArena.gate);
  const gate = await page.evaluate(() => ({
    leader: G.GymArena.gate.gym.leader,
    badge: G.GymArena.gate.gym.badge,
    level: G.GymArena.gate.gym.level,
  }));
  ok(
    gate.leader === leaderName && gate.badge === badge,
    tag + ': G.Debug.gym(' + n + ') opens this gym, level ' + gate.level
  );

  await page.evaluate(() => G.GymArena.enterRequest());
  await waitFor(() => G.GymArena.inArena && G.EnemyMgr.all().some((e) => e.boss && !e.dead));
  // keep your Pokemon alive and in reach for the rest of the test; the real game loop still runs every hit
  await page.evaluate(() => {
    window.__keep = setInterval(() => {
      const pl = G.Game.player,
        b = G.EnemyMgr.all().find((e) => e.boss && !e.dead);
      if (!pl || pl.dead) return;
      pl.maxHp = 1e6;
      pl.hp = 1e6;
      // the badge's level opens the level cards, which hold the game: take the first card
      const card = G.UI.isOpen('scr-levelup') && document.querySelector('#cards .card');
      if (card) card.click();
      if (b) {
        pl.x = b.x + 26;
        pl.y = b.y;
      }
    }, 20);
  });
  const start = await page.evaluate(() => {
    const b = G.EnemyMgr.all().find((e) => e.boss && !e.dead);
    return {
      name: b.name,
      hp: b.hp,
      maxHp: b.maxHp,
      id: b.id,
      isPlayer: !!b.isPlayer,
      hasGym: !!b.gym,
      bar: G.EnemyMgr.bossAlive(),
    };
  });
  ok(
    start.hasGym && start.hp > 1 && start.maxHp >= start.hp && start.bar,
    tag + ': ' + start.name + ' is in the arena, ' + Math.round(start.hp) + ' HP'
  );
  // ---- the body lines: what differs between the two bodies ----
  ok(start.isPlayer === isEntity, tag + ': body is ' + (isEntity ? 'a Player entity' : 'the old wild body'));

  // let the fight run: the leader must cast at you and your moves must hurt it
  const fought = await page
    .waitForFunction(
      (hp0) => {
        const b = G.EnemyMgr.all().find((e) => e.boss && !e.dead);
        return b && b.hp < hp0 && b.slots[0].some((s) => s.last != null);
      },
      start.hp,
      { timeout: 25000, polling: 100 }
    )
    .then(
      () => true,
      () => false
    );
  ok(fought, tag + ': the leader casts and your own moves hurt it');
  const engaged = await page.evaluate(() => {
    const b = G.EnemyMgr.all().find((e) => e.boss && !e.dead);
    return { at: b.gym.engagedAt, left: G.Gym.enrageIn(b), on: G.Gym.enrages(b) };
  });
  // slice 6 (Q1): a switched gym enrages only when it authors one (Misty does not); the wild body always does
  ok(
    engaged.at != null && (engaged.on ? engaged.left > 0 : engaged.left === null),
    tag +
      (engaged.on
        ? ': the first hit starts the enrage clock (' + Math.round(engaged.left) + ' s)'
        : ': the first hit engages it, and it never enrages (none authored)')
  );

  // the last blow comes from your own move
  const before = await page.evaluate(() => {
    const pl = G.Game.player;
    return {
      kills: pl.kills,
      bosses: pl.bosses,
      bonds: pl.bonds,
      badges: G.Gym.badges.length,
      ev: G.Game.evBank.reduce((a, v) => a + v, 0),
      level: pl.level,
    };
  });
  await page.evaluate(() => {
    // held at 1 HP so its self heal cannot outlast a level 1 attacker
    window.__low = setInterval(() => {
      const b = G.EnemyMgr.all().find((e) => e.boss && !e.dead);
      if (b) b.hp = 1;
    }, 20);
  });
  await waitFor(() => G.Gym.badges.length > 0, null, 25000);
  await page.evaluate(() => clearInterval(window.__low));
  const won = await page.evaluate(() => {
    const pl = G.Game.player;
    return {
      kills: pl.kills,
      bosses: pl.bosses,
      bonds: pl.bonds,
      badges: G.Gym.badges.slice(),
      ev: G.Game.evBank.reduce((a, v) => a + v, 0),
      level: pl.level,
      phase: G.GymArena.arena && G.GymArena.arena.phase,
      alive: G.EnemyMgr.all().filter((e) => e.boss && !e.dead).length,
    };
  });
  ok(won.phase === 'won' && won.alive === 0, tag + ': the arena is won and no leader is left');
  ok(won.badges.length === 1 && won.badges[0] === badge, tag + ': one badge, ' + won.badges.join());
  ok(won.bonds === before.bonds + 1, tag + ': one link');
  ok(won.level === before.level + 1, tag + ': the badge pays one level');
  await waitFor((b) => G.Game.player.kills === b + 1, before.kills);
  const paid = await page.evaluate(() => ({
    kills: G.Game.player.kills,
    bosses: G.Game.player.bosses,
    ev: G.Game.evBank.reduce((a, v) => a + v, 0),
    pickups: G.Pickups.all ? G.Pickups.all().length : -1,
  }));
  ok(
    paid.kills === before.kills + 1 && paid.bosses === before.bosses + 1,
    tag + ': one kill and one boss on your record'
  );
  ok(paid.ev > before.ev, tag + ': the leader paid its EVs');

  // back on the map, 5 s later
  await waitFor(() => !G.GymArena.inArena, null, 12000);
  const back = await page.evaluate(() => ({
    beaten: G.Gym.beaten,
    arena: G.GymArena.inArena,
    enemies: G.EnemyMgr.count,
    state: G.Game.state,
    corpses: 0,
  }));
  ok(!back.arena && back.beaten === n, tag + ': back on the map, gym counted beaten (' + back.beaten + ')');
  await page.evaluate(() => clearInterval(window.__keep));
  if (page.notes.length)
    console.log('note  known file:// font noise (not a failure): ' + page.notes.length + ' line(s)');
  ok(
    !errs.length,
    tag + ': no console or page errors' + (errs.length ? '\n        ' + errs.slice(0, 5).join('\n        ') : '')
  );
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  const MISTY_IS_ENTITY = process.env.SMOKE_GYM_BEFORE !== '1'; // SMOKE_GYM_BEFORE=1: the pre-slice run, Misty still on the old body
  try {
    await fight(browser, 2, 'Misty', 'Cascade Badge', MISTY_IS_ENTITY);
    await fight(browser, 1, 'Brock', 'Boulder Badge', false);
  } catch (e) {
    ok(false, 'threw: ' + (e && e.message));
  }
  await browser.close();
  console.log(fail ? 'smoke-gym: ' + fail + ' check(s) FAILED' : 'smoke-gym: all checks passed');
  process.exit(fail ? 1 : 0);
})();
