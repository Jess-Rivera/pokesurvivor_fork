// tools/smoke-team.js: headless browser check for real team swapping (entity model slice 2, docs/proposals/host-model-plan.md).
// A check, not a harness: tools/check.js only syntax-checks it, since it needs a browser. Playwright is NOT a repo dependency
// (PLAYWRIGHT_DIR, default C:\Users\boric\tools\playwright), as in tools/smoke-ui.js. Usage from the repo root:
//   node tools/smoke-team.js
// Runs dev.html?dev over file:// (how Jess plays), a team of 3 (Squirtle, Charmander, Pikachu in slots 1 to 3). Written to pass on
// the code BEFORE the Team module moves anything, then to pass unchanged after it. It covers:
//   refusals: same slot, fainted target, in the air (Fly), trapped ("Trapped!"); the five shared stores are one object per run;
//   manual swap: run progress and unspent links carry, 0.5 s i-frames, 5 s lock (HUD reads 5 / 5), dodges are not refilled;
//   the lock counts down and refuses a swap while it runs; the slot key swaps, the previous key skips a fainted member;
//   faint swap: lowest living slot comes in, the lock clears, i-frames, links and progress carry;
//   the bond screen on a BENCHED member spends exactly one link; bench poison faints a benched member with its toast;
//   Re-Do revives the team once and resumes on the last to faint; a wipe ends the run;
//   G.Game.player is roster[activeIndex] after every swap, faint and revive.
// Enemy spawns are switched off on the test page so nothing else hurts the team. Fails on any page error, console error,
// or a failed local (file://) request; remote requests (fonts, CDNs) are ignored so the check also runs offline.
// Known file:// noise, reported as a note and not a failure: Chromium blocks font files over file:// (CORS, origin 'null'), so
// assets/fonts/*.ttf fails to load in this run. It is not team behavior (first seen 2026-11-06, the preload in dev.html line 52).
const path = require('path'),
  url = require('url');
const root = path.resolve(__dirname, '..');
// Playwright lookup, first that exists: PLAYWRIGHT_DIR, then <your user folder>\tools\playwright (work: jessvri), then the home default.
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
const near = (a, b, tol) => typeof a === 'number' && Math.abs(a - b) <= tol;

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
  await page.waitForFunction(() => window.G && G.Game && G.DB && G.Status && G.Spawner, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    const t = document.getElementById('tap-start');
    if (t && !t.classList.contains('hidden')) t.click(); // headless cannot play sound: pass "press to start" first
    const s = G.DB.save;
    s.team = [{ dex: 7, shiny: false }, { dex: 4, shiny: false }, { dex: 25, shiny: false }, null, null, null];
    s.partner = 7; // slot 1 mirrors the partner (db.js normalizeTeam), so pin it
    s.partnerShiny = false;
  });
  return { ctx, page, errs };
}

// Run in the page: the team view used by most checks.
const VIEW = () => {
  const r = G.Game.roster,
    i = G.Game.activeIndex;
  return {
    i,
    slot: r[i] && r[i].teamSlot,
    same: G.Game.player === r[i],
    lock: G.Game.swapCooldown,
    max: G.Game.swapMax,
    inv: G.Game.player.invuln,
    state: G.Game.state,
    alive: r.map((f) => !f.dead),
  };
};

async function run(browser) {
  const { ctx, page, errs } = await boot(browser);
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 20000 });
  await page.evaluate((src) => {
    G.Spawner.update = () => {}; // test page only: no wild spawns
    G.EnemyMgr.clear();
    window.__view = (0, eval)('(' + src + ')');
  }, VIEW.toString());
  const view = () => page.evaluate(() => window.__view());
  const waitFor = (fn, arg, ms = 8000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 50 });

  // ---- A. start of run: shared stores and refusals (lock is 0) ----
  const a = await page.evaluate(() => {
    const r = G.Game.roster,
      pl = G.Game.player,
      one = (k) => r.every((f) => f[k] && f[k] === r[0][k]);
    const out = {
      n: r.length,
      slots: r.map((f) => f.teamSlot).join(),
      stores: ['stgTeam', 'teamCards', 'runItems', 'dodges', 'berries'].filter((k) => !one(k)),
      lock0: G.Game.swapCooldown,
      self: G.Game.swap(G.Game.activeIndex),
    };
    r[1].dead = true;
    out.fainted = G.Game.swap(1);
    r[1].dead = false;
    pl.flyT = 1;
    out.flying = G.Game.swap(1);
    pl.flyT = 0;
    const tr = G.Status.apply(pl, 'trap');
    out.trapOk = tr === 'ok' && G.Status.swapLocked(pl);
    out.trapped = G.Game.swap(1);
    G.Status.clear(pl);
    out.after = window.__view();
    return out;
  });
  ok(a.n === 3 && a.slots === '0,1,2', 'start: a team of 3 in slots 1 to 3 (' + a.slots + ')');
  ok(
    !a.stores.length,
    'start: stages, cards, run items, dodges and berries are one shared object' +
      (a.stores.length ? ' (not: ' + a.stores.join(' ') + ')' : '')
  );
  ok(a.lock0 === 0 && a.after.i === 0 && a.after.same, 'start: slot 1 leads, lock 0, player is roster[activeIndex]');
  ok(a.self === false, 'refused: swapping to the slot already on the field');
  ok(a.fainted === false, 'refused: swapping to a fainted member');
  ok(a.flying === false, 'refused: swapping in the air (Fly)');
  ok(a.trapOk && a.trapped === false, 'refused: swapping while trapped');
  ok(a.after.i === 0 && a.after.lock === 0, 'refusals leave the field and the lock alone');

  // ---- B. manual swap: carry, i-frames, lock, dodges ----
  const b = await page.evaluate(() => {
    const pl = G.Game.player;
    Object.assign(pl, { kills: 37, bosses: 2, coins: 123, t1: 4, t10: 1, xp: 5 });
    pl.bonds = 2;
    pl.dodges.cd[0] = 3;
    pl.dodges.cd[1] = 2.5;
    const dodges = pl.dodges,
      aim = (pl.aim = 1.25);
    const okSwap = G.Game.swap(1);
    const n = G.Game.player;
    const out = {
      okSwap,
      carry: [n.kills, n.bosses, n.coins, n.t1, n.t10, n.xp, n.level === pl.level].join(),
      bonds: n.bonds,
      pos: n.x === pl.x && n.y === pl.y && n.aim === aim,
      dodges: n.dodges === dodges && n.dodges.cd[0] === 3 && n.dodges.cd[1] === 2.5,
      v: window.__view(),
    };
    n.bonds = 0; // no frame has run: nothing offered the bond screen
    return out;
  });
  ok(b.okSwap && b.v.slot === 1 && b.v.same, 'manual swap: slot 2 takes the field, player is roster[activeIndex]');
  ok(
    b.carry === '37,2,123,4,1,5,true',
    'manual swap: kills, bosses, coins, tickets, XP and level carry (' + b.carry + ')'
  );
  ok(b.bonds === 2, 'manual swap: unspent links carry (' + b.bonds + ')');
  ok(b.pos, 'manual swap: position and aim carry');
  ok(b.v.inv >= 0.5, 'manual swap: 0.5 s i-frames on the incoming member (' + b.v.inv + ')');
  ok(b.v.lock === 5 && b.v.max === 5, 'manual swap: 5 s lock, the HUD reads ' + b.v.lock + ' / ' + b.v.max);
  ok(b.dodges, 'manual swap: the dodge charges are the same object, not refilled');

  // ---- C. the lock counts down and refuses; then the slot key ----
  await sleep(1000);
  const c = await page.evaluate(() => ({
    lock: G.Game.swapCooldown,
    refused: G.Game.swap(2) === false,
    i: G.Game.activeIndex,
  }));
  ok(
    c.lock > 3.4 && c.lock < 4.6 && c.refused && c.i === 1,
    'lock: about 4 s left after 1 s, a swap is refused (' + c.lock.toFixed(2) + ')'
  );
  await waitFor(() => G.Game.swapCooldown === 0, null, 7000);
  await page.keyboard.press('Digit3');
  await waitFor(() => G.Game.roster[G.Game.activeIndex].teamSlot === 2, null, 2000).catch(() => {});
  const ck = await view();
  ok(
    ck.slot === 2 && ck.lock > 4.5 && ck.same,
    'keys: the slot 3 key swaps to slot 3 and locks (' + ck.slot + ', ' + ck.lock.toFixed(2) + ')'
  );

  // ---- D. faint swap: lowest living slot, lock cleared, i-frames, carry ----
  await page.evaluate(() => {
    for (const f of G.Game.roster) f.bondOptions = () => null; // keep the bond screen shut while a link is held over frames
    const pl = G.Game.player;
    pl.bonds = 1;
    pl.kills = 50;
    pl.invuln = 0;
    pl.hurt(1e9, null, true);
  });
  await waitFor(() => G.Game.roster[G.Game.activeIndex].teamSlot !== 2, null, 3000).catch(() => {});
  const d = await page.evaluate(() => {
    const v = window.__view(),
      pl = G.Game.player,
      out = { v, bonds: pl.bonds, kills: pl.kills };
    pl.bonds = 0;
    for (const f of G.Game.roster) delete f.bondOptions;
    return out;
  });
  ok(d.v.slot === 0 && d.v.same, 'faint: the LOWEST living slot (1) comes in, not the next one (' + d.v.slot + ')');
  ok(d.v.lock === 0, 'faint: the swap lock clears (' + d.v.lock + ')');
  ok(d.v.inv >= 0.4, 'faint: i-frames on the incoming member (' + d.v.inv.toFixed(2) + ')');
  ok(d.bonds === 1 && d.kills === 50, 'faint: unspent links and run progress carry (' + d.bonds + ', ' + d.kills + ')');
  ok(d.v.alive.join() === 'true,true,false' && d.v.state === 'playing', 'faint: slot 3 stays fainted, the run goes on');

  // ---- E. the previous key skips the fainted member (slot 1 -> back past slot 3 -> slot 2) ----
  await page.keyboard.press('KeyZ');
  await waitFor(() => G.Game.activeIndex === 1, null, 2000).catch(() => {});
  const e = await view();
  ok(
    e.slot === 1 && e.same && e.lock > 4.5,
    'keys: the previous key skips the fainted slot 3 and swaps to slot 2 (' + e.slot + ')'
  );

  // ---- F. the bond screen on a benched member spends exactly one link ----
  const f = await page.evaluate(() => {
    const r = G.Game.roster,
      pl = G.Game.player,
      bench = r[0];
    const pool = G.Moves.poolFor(bench.mon).filter((id) => !bench.hasMove(id) && !G.MoveInfo.isBuff(id));
    for (const id of pool) if (!bench.bondOptions()) bench.addMove(id, true);
    const opt0 = bench.bondOptions();
    const showBond = G.RunUI.showBond;
    let got = null;
    G.RunUI.showBond = (choices, cb) => (got = { choices, cb });
    pl.bonds = 2;
    G.Game.offerBond();
    G.RunUI.showBond = showBond;
    const out = { pre: !!opt0, opened: !!got, state1: G.Game.state };
    if (got) {
      const ch = got.choices.find((x) => x.f === bench && x.opt);
      out.benchOffered = !!ch;
      if (ch) {
        const groups0 = bench.slots.filter((s) => s.length > 1).length;
        got.cb(bench, ch.opt, ch.opt.mode === 'pair' ? ch.opt.loose.slice(0, 2) : [ch.opt.loose[0]]);
        out.grouped = bench.slots.filter((s) => s.length > 1).length > groups0 || bench.slots.some((s) => s.length > 2);
      }
    }
    out.bonds = pl.bonds;
    out.state2 = G.Game.state;
    pl.bonds = 0;
    return out;
  });
  ok(f.pre && f.opened && f.benchOffered, 'bond: the screen offers the link to a benched member');
  ok(f.grouped, 'bond: the benched member gets the bond group');
  ok(f.bonds === 1, 'bond: one link spent of two, never two (' + f.bonds + ')');
  ok(f.state1 === 'choice' && f.state2 === 'playing', 'bond: the game holds for the choice, then plays on');

  // ---- G. bench poison faints a benched member, with its toast ----
  await page.evaluate(() => {
    const bench = G.Game.roster[0];
    window.__toasts = [];
    const toast = G.UI.toast;
    G.UI.toast = function (msg) {
      window.__toasts.push(String(msg));
      return toast.apply(this, arguments);
    };
    bench.hp = 1;
    window.__dot = G.Status.applyDot(bench, 'poison', 1, 1);
  });
  await waitFor(() => G.Game.roster[0].dead, null, 10000).catch(() => {});
  const g = await page.evaluate(() => ({
    dot: window.__dot,
    dead: G.Game.roster[0].dead,
    toast: window.__toasts.some((t) => /fainted on the bench/.test(t)),
    v: window.__view(),
  }));
  ok(g.dot === 'ok' && g.dead, 'bench: poison faints a benched member (' + g.dot + ')');
  ok(g.toast, 'bench: the "fainted on the bench" toast shows');
  ok(g.v.slot === 1 && g.v.same && g.v.state === 'playing', 'bench: the member on the field is untouched');

  // ---- H. Re-Do: revive once, resume on the last to faint ----
  await page.evaluate(() => {
    const pl = G.Game.player;
    pl.runItems.push('redo');
    pl.kills = 60;
    pl.invuln = 0;
    pl.hurt(1e9, null, true);
  });
  await waitFor(() => G.Game.roster.every((m) => !m.dead), null, 3000).catch(() => {});
  const h = await page.evaluate(() => ({
    v: window.__view(),
    full: G.Game.roster.every((m) => m.hp === m.maxHp),
    kills: G.Game.player.kills,
  }));
  ok(h.v.alive.every(Boolean) && h.full, 'Re-Do: the whole team is back at full HP');
  ok(h.v.slot === 1 && h.v.same, 'Re-Do: resumes on the last to faint (slot 2), not slot 1 (' + h.v.slot + ')');
  ok(h.v.lock === 0 && h.v.inv >= 0.4 && h.kills === 60, 'Re-Do: lock cleared, i-frames, run progress kept');

  // ---- I. a wipe ends the run (Re-Do is spent) ----
  await page.evaluate(() => {
    const r = G.Game.roster,
      pl = G.Game.player;
    for (const m of r)
      if (m !== pl) {
        m.invuln = 0;
        m.hurt(1e9, null, true);
      }
    pl.invuln = 0;
    pl.hurt(1e9, null, true);
  });
  await waitFor(() => G.Game.state === 'over', null, 6000).catch(() => {});
  ok((await page.evaluate(() => G.Game.state)) === 'over', 'wipe: the run ends (Re-Do is not used twice)');

  ok(
    errs.length === 0,
    'no console or page errors' + (errs.length ? '\n        ' + errs.slice(0, 5).join('\n        ') : '')
  );
  if (page.notes.length)
    console.log(
      'note  known file:// font noise (not a failure): ' +
        page.notes.length +
        ' line(s), e.g. ' +
        page.notes[0].slice(0, 110)
    );
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  try {
    await run(browser);
  } catch (e) {
    fail++;
    console.log('FAIL  crashed: ' + ((e && e.stack) || e));
  }
  await browser.close();
  console.log(fail ? 'smoke-team: ' + fail + ' check(s) FAILED' : 'smoke-team: all checks passed');
  process.exit(fail ? 1 : 0);
})();
