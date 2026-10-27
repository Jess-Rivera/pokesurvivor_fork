// tools/smoke-newcombat.js: headless browser smoke test for the new move path (slice 3d). A check, not a harness: tools/check.js
// only syntax-checks it, since it needs a browser. Playwright is NOT a repo dependency: it is loaded from an install outside the
// repo (PLAYWRIGHT_DIR, default C:\Users\boric\tools\playwright). Usage from the repo root:  node tools/smoke-newcombat.js
// It serves the repo with python -m http.server, then for dev.html?dev (flag off) and dev.html?dev&newcombat (flag on): boots a
// guest run, steps the game, calls G.Debug.newcombat() on the flag-on page and cycles the routed slots, then a density run at
// G.Debug.skipTo(20). Fails on any page error or console error, on a routed slot ticked by both systems, or on no hits landing.
const path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '..');
const PW = path.join(process.env.PLAYWRIGHT_DIR || 'C:\\Users\\boric\\tools\\playwright', 'node_modules', 'playwright');
const PORT = 8765 + Math.floor(Math.random() * 200);
const { chromium } = require(PW);

const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok    ' : 'FAIL  ') + m); if (!c) fail++; };

async function boot(browser, query) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(`http://127.0.0.1:${PORT}/dev.html${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.G && G.Game && G.DB && G.Debug, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    G.Debug.maxAll();
    const s = G.DB.save;
    if (!(s.team || []).some(t => t && G.DEX_BY[t.dex])) { s.team = [{ dex: 7, shiny: false }, { dex: 4, shiny: false }, null, null, null, null]; s.partner = s.partner || 7; }
    G.Game.startRun();
  });
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 20000 });
  return { page, errs };
}

/** Average frame time (ms) of the real loop over `ms`, read with requestAnimationFrame in the page. */
const frameMs = (page, ms) => page.evaluate(ms => new Promise(res => {
  let n = 0; const t0 = performance.now();
  const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res((performance.now() - t0) / n); };
  requestAnimationFrame(f);
}), ms);

async function density(page) {
  await page.evaluate(() => { G.Debug.skipTo(20); G.Debug.spawn(4); });
  await sleep(6000);
  const n = await page.evaluate(() => G.EnemyMgr.all().length);
  return { n, ms: await frameMs(page, 3000) };
}

(async () => {
  const srv = cp.spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await sleep(1200);
  const browser = await chromium.launch();
  try {
    // ---- flag off: the game plays, nothing from the new path runs ----
    { const { page, errs } = await boot(browser, '?dev');
      await sleep(4000);
      const s = await page.evaluate(() => ({ on: G.MoveRoute.on, routed: G.MoveRoute.routed('ember'), live: G.MoveSim.list().length,
        alive: !G.Game.player.dead, time: G.Game.time != null }));
      ok(!s.on && !s.routed && s.live === 0, 'flag off: MoveRoute off, nothing routed, no sim instances');
      const d = await density(page);
      console.log('      flag off density: ' + d.n + ' enemies, ' + d.ms.toFixed(1) + ' ms/frame');
      ok(errs.length === 0, 'flag off: no console or page errors' + (errs.length ? '\n        ' + errs.slice(0, 5).join('\n        ') : ''));
      await page.close(); }

    // ---- flag on: quick-test helper, every routed slot, overlay ----
    { const { page, errs } = await boot(browser, '?dev&newcombat');
      const n = await page.evaluate(() => {
        G.Game.player.invuln = 1e9;     // the smoke run must not die mid-check
        window.__hits = 0; window.__casts = {}; window.__propHits = 0;
        G.SimBus.on('move:hit', () => window.__hits++);
        G.SimBus.on('move:cast', e => { window.__casts[e.moveId] = (window.__casts[e.moveId] || 0) + 1; });
        return G.Debug.newcombat();
      });
      ok(n === 24, 'newcombat() placed 24 dummies (' + n + ')');
      const ids = await page.evaluate(() => G.Game.player.slots.map(g => g[0].id));
      for (let i = 0; i < ids.length; i++) {
        await page.evaluate(i => { G.Game.player.setActive(i, true); }, i);
        // double-tick probe: an active routed slot's timer must fall by one dt per frame, not two
        const probe = await page.evaluate(() => new Promise(res => {
          const s = G.Game.player.activeGroup()[0], seen = [];
          const f = () => { seen.push(s.t); if (seen.length < 40) requestAnimationFrame(f); else res(seen); };
          requestAnimationFrame(f);
        }));
        const drops = probe.slice(1).map((t, k) => probe[k] - t).filter(d => d > 0 && d < 0.2);
        const maxDrop = Math.max(0, ...drops);
        await sleep(1500);
        const st = await page.evaluate(() => { const s = G.Game.player.activeGroup()[0]; return { id: s.id, simCd: s.simCd, castAt: s.castAt || 0, live: G.MoveSim.list().length }; });
        const casts = await page.evaluate(id => window.__casts[id] || 0, ids[i]);
        ok(casts > 0 && st.simCd > 0 && st.castAt > 0, ids[i] + ': cast ' + casts + 'x, simCd ' + st.simCd + ', HUD flash stamped');
        ok(maxDrop < 0.05, ids[i] + ': timer falls one frame per frame (largest drop ' + maxDrop.toFixed(4) + ' s)');
      }
      const s = await page.evaluate(() => ({ hits: window.__hits, overlay: G.MoveRender.overlay }));
      ok(s.hits > 0 && s.overlay, 'hits landed on the dummies (' + s.hits + ') with the overlay on');
      // Life Orb: a routed cast still pays its HP cost through Player.cast
      await page.evaluate(() => { const pl = G.Game.player; G.Debug.item('lifeorb', true); pl.setActive(0, true); pl.hp = pl.maxHp; window.__hp0 = pl.hp; });
      await sleep(1500);
      const lo = await page.evaluate(() => ({ has: G.Game.player.hasItem('lifeorb'), hp: G.Game.player.hp, hp0: window.__hp0 }));
      ok(lo.has && lo.hp < lo.hp0, 'Life Orb costs HP on routed casts (' + lo.hp0 + ' -> ' + lo.hp.toFixed(1) + ')');
      ok(await page.evaluate(() => G.Game.player.slots.every(g => g.every(m => G.MoveRoute.routed(m.id)))), 'every slot of the quick test is routed');
      await page.screenshot({ path: path.join(require('os').tmpdir(), 'smoke-newcombat.png') });
      // density: same skipTo minute as the flag-off page, with the dummies gone and a mid-range routed move active
      await page.evaluate(() => { G.Debug.hitbox(false); G.EnemyMgr.clear(); G.Game.player.setActive(G.Game.player.slots.findIndex(g => g[0].id === 'flamethrower'), true); });
      const d = await density(page);
      console.log('      flag on density: ' + d.n + ' enemies, ' + d.ms.toFixed(1) + ' ms/frame');
      ok(errs.length === 0, 'flag on: no console or page errors' + (errs.length ? '\n        ' + errs.slice(0, 5).join('\n        ') : ''));
      await page.close(); }
  } catch (e) { fail++; console.log('FAIL  ' + (e.stack || e)); }
  await browser.close();
  srv.kill();
  console.log(fail ? 'smoke: ' + fail + ' FAILED' : 'smoke: all passed');
  process.exit(fail ? 1 : 0);
})();
