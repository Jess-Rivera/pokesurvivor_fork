// tools/smoke-ui.js: headless browser check for the slice 7a UI readers. A check, not a harness: tools/check.js only syntax-checks it,
// since it needs a browser. Playwright is NOT a repo dependency (PLAYWRIGHT_DIR, default C:\Users\boric\tools\playwright), as in
// tools/smoke-newcombat.js. Usage from the repo root:  node tools/smoke-ui.js
// On dev.html?dev (one move path since slice 7b; the ?newcombat page it also ran is gone), every move must show correctly:
//   menus: the Team screen's detail moves for every owned Pokemon (so the union of pools covers every move, each name MoveInfo's
//          and with an icon), then the Upgrades popup over it (4 columns, 19 boxes, the points counter, Q/E between party members, Esc);
//   level-up: a "new move" card for every move on the real level-up screen (name, text, type tag, icon);
//   sheet: every move on the pause sheet (name, summary, icon; no "undefined" or "NaN"; routed rows with numbers);
//   icons: every move icon is drawn, with its family badge exactly when G.MoveInfo gives one;
//   region flow: the real menu, Play and region card path, then Space dodges and neither Space nor Enter starts a new run.
// Fails on any page or console error.
const path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..');
const PW = path.join(process.env.PLAYWRIGHT_DIR || 'C:\\Users\\boric\\tools\\playwright', 'node_modules', 'playwright');
const PORT = 8965 + Math.floor(Math.random() * 200);
const { chromium } = require(PW);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0;
const ok = (c, m) => {
  console.log((c ? 'ok    ' : 'FAIL  ') + m);
  if (!c) fail++;
};

async function boot(browser, query) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) =>
    errs.push('requestfailed: ' + r.url() + ' (' + (r.failure() && r.failure().errorText) + ')')
  );
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push('console: ' + m.text());
  });
  await page.goto(`http://127.0.0.1:${PORT}/dev.html${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.G && G.Game && G.DB && G.Debug && G.MoveInfo, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    G.Debug.maxAll();
    const s = G.DB.save;
    if (!(s.team || []).some((t) => t && G.DEX_BY[t.dex])) {
      s.team = [{ dex: 7, shiny: false }, { dex: 4, shiny: false }, null, null, null, null];
      s.partner = s.partner || 7;
    }
  });
  return { page, errs };
}

async function check(browser, query, tag) {
  const { page, errs } = await boot(browser, query);
  const ALL = await page.evaluate(() => G.Moves.ALL.map((m) => m.id));

  // ---- icons: drawn, badge exactly when MoveInfo gives one ----
  const ic = await page.evaluate(
    (ids) =>
      ids.map((id) => {
        const cv = G.Icons.canvas('move:' + id),
          c = cv.getContext('2d'),
          big = cv.width === 18;
        const p = c.getImageData(big ? 12 : 10, big ? 12 : 10, 1, 1).data,
          hex = '#' + [p[0], p[1], p[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
        return {
          id,
          w: cv.width,
          html: G.Icons.html('move:' + id, 16).length,
          badge: G.MoveInfo.badge(id),
          drawn: hex === '#2b3454' || hex === '#ffd23f',
        };
      }),
    ALL
  );
  ok(
    ic.every((x) => x.w > 0 && x.html > 20),
    tag + ': every move icon is drawn (' + ic.length + ')'
  );
  const off = ic.filter((x) => !!x.badge !== x.drawn);
  ok(
    !off.length,
    tag +
      ': the family badge shows exactly when MoveInfo gives one' +
      (off.length ? ' (' + off.map((x) => x.id).join(' ') + ')' : '')
  );

  // ---- menus: the Team screen's detail for every owned Pokemon, then the Upgrades screen ----
  const menu = await page.evaluate(async () => {
    // Headless Chrome cannot play sound, so "press to start" is still waiting: pass it before any key test.
    if (G.UI.isOpen && !document.getElementById('tap-start').classList.contains('hidden'))
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    G.MenuUI.open();
    document.querySelector('#scr-menu [data-go="team"]').click();
    await new Promise((r) => setTimeout(r, 300));
    const byName = new Map(G.Moves.ALL.map((m) => [G.MoveInfo.name(m.id), m.id]));
    const seen = new Set(),
      bad = [];
    let n = 0,
      rowsMax = 0;
    // Pokedex tab: every species once, so the union of pools still covers every move (the box tabs list copies).
    [...document.querySelectorAll('#ros-tabs .ros-tab')].find((t) => t.textContent === 'Pokédex').click();
    for (const cell of document.querySelectorAll('#ros-grid .cell')) {
      if (!G.DB.save.owned[+cell.dataset.dex]) continue;
      cell.click();
      n++;
      const rows = [...document.querySelectorAll('.ros-mv')];
      rowsMax = Math.max(rowsMax, rows.length);
      for (const r of rows) {
        const name = r.querySelector('span').textContent,
          id = byName.get(name);
        if (!id || !r.querySelector('canvas,img,i')) bad.push(cell.dataset.dex + ' "' + name + '"');
        else seen.add(id);
      }
    }
    const dexOk = n > 0 && rowsMax > 0 && !bad.length;
    // Upgrades opens from the Upgrade button on a Team screen slot (the main menu entry is gone, 2026-11-01)
    document.querySelector('.ros-slot .rupg').click();
    const name0 = document.getElementById('upg-name').textContent;
    const key = (k) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    key('e');
    const name1 = document.getElementById('upg-name').textContent;
    const party = G.DB.save.team.filter(Boolean).length;
    const pts = document.getElementById('upg-points');
    const upg = {
      open: G.UI.isOpen('scr-upgrades'),
      cols: document.querySelectorAll('#upg-cols .upg-col').length,
      boxes: document.querySelectorAll('#upg-cols .upg-box').length,
      pips: [...document.querySelectorAll('.upg-box .pips')].map((p) => p.children.length).join(''),
      points: pts.textContent === '0 / 40',
      popup: G.UI.isOpen('scr-roster'),
      swap: party < 2 || (name0 !== name1 && !!name1),
    };
    key('Escape');
    upg.back = G.UI.isOpen('scr-roster') && !G.UI.isOpen('scr-upgrades');
    return { n, seen: [...seen], bad, dexOk, rows: rowsMax, upg };
  });
  const RET = await page.evaluate(() => {
    // not in any level-up and egg pool: retired (slice 7b) and TM-only moves (the TM Mart sells those)
    const inPool = new Set(G.DEX.flatMap((p) => G.Moves.poolFor(p)));
    return G.Moves.ALL.map((m) => m.id).filter((id) => !inPool.has(id));
  });
  const miss = ALL.filter((id) => !RET.includes(id) && !menu.seen.includes(id)),
    shownRet = RET.filter((id) => menu.seen.includes(id));
  ok(
    !menu.bad.length,
    tag +
      ': Team screen move names match MoveInfo over ' +
      menu.n +
      ' Pokemon' +
      (menu.bad.length ? ' (' + menu.bad.slice(0, 6).join(', ') + ')' : '')
  );
  ok(
    !miss.length,
    tag +
      ': the menus showed every move in a level-up and egg pool (' +
      menu.seen.length +
      '/' +
      (ALL.length - RET.length) +
      (miss.length ? '; missing ' + miss.join(' ') : '') +
      ')'
  );
  ok(
    !shownRet.length,
    tag + ': no retired or TM-only move in the menus' + (shownRet.length ? ' (' + shownRet.join(' ') + ')' : '')
  );
  ok(menu.dexOk, tag + ': the Team screen lists its moves with names and icons (up to ' + menu.rows + ' rows)');
  const u = menu.upg;
  ok(
    u.open && u.cols === 4 && u.boxes === 19 && u.pips === '555' + '55555555' + '3333' + '3335',
    tag +
      ': Upgrades shows 4 columns and 19 boxes with 5 or 3 rank dots (' +
      u.cols +
      ', ' +
      u.boxes +
      ', ' +
      u.pips +
      ')'
  );
  ok(u.points, tag + ': the Upgrades top bar shows "0 / 40"');
  ok(u.popup, tag + ': Upgrades is a popup: the Team screen stays open under it');
  ok(u.swap, tag + ': E moves Upgrades to the next party member');
  ok(u.back, tag + ': Esc on Upgrades closes the popup back to the Team screen');

  // ---- a run: level-up cards and the pause sheet for every move ----
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 20000 });
  // Move Shop step 2: Silver is loaded (dev.html tag and NEED entry) and a run starts with 100 (a quick kill may add some).
  const silver = await page.evaluate(() => (G.Silver ? G.Silver.whole : null));
  ok(silver >= 100, tag + ': a run starts with 100 Silver (' + silver + ')');
  // Move Shop step 3: the debug command places both buildings; the frames after it draw them and their red arrows (any draw error lands in errs).
  const shopN = await page.evaluate(() => (G.Debug.shops() ? G.Shops.list.length : 0));
  ok(shopN === 2, tag + ': G.Debug.shops() places a Move Trainer and a TM Mart (' + shopN + ')');
  const run = await page.evaluate(async (ids) => {
    const pl = G.Game.player,
      roster = G.Game.roster,
      pf = G.Moves.poolFor,
      keep = { moves: pl.moves, slots: pl.slots, active: pl.active };
    pl.invuln = 1e9;
    const out = { cards: 0, bad: [], sheet: 0, rowsNum: 0 };
    const newPath = true; // the only path since slice 7b
    pl.moves = [G.Moves.instance('tackle')];
    pl.slots = [pl.moves.slice()];
    pl.active = 0;
    const cards = [];
    for (const id of ids) {
      G.Moves.poolFor = () => [id];
      const fam = G.LevelUp.teamFamilies(pl, roster).newmove || [];
      if (id !== 'tackle') {
        if (fam[0]) cards.push(fam[0]);
        else out.bad.push('no card ' + id);
      }
    }
    G.Moves.poolFor = pf;
    for (let i = 0; i < cards.length; i += 3) {
      G.RunUI.showLevelUp(pl.level, cards.slice(i, i + 3), () => {});
      for (const [k, el] of [...document.querySelectorAll('#cards .card')].entries()) {
        const c = cards[i + k],
          id = c.key.slice(4),
          nm = el.querySelector('.nm').textContent,
          ds = el.querySelector('.ds').textContent;
        out.cards++;
        if (
          !nm.startsWith(G.MoveInfo.name(id)) ||
          !nm.includes(G.U.TYPE_NAME[G.MoveInfo.type(id)]) ||
          ds.length < 5 ||
          ds !== G.MoveInfo.desc(id) ||
          !el.querySelector('.ico canvas,.ico img,.ico i,.ico span')
        )
          out.bad.push('card ' + id + ' "' + nm + '" "' + ds + '"');
      }
    }
    G.UI.hide('scr-levelup');
    // the pause sheet, four moves at a time
    for (let i = 0; i < ids.length; i += 4) {
      pl.moves = ids.slice(i, i + 4).map((id) => G.Moves.instance(id));
      pl.slots = pl.moves.map((m) => [m]);
      pl.active = 0;
      G.RunUI.showPause();
      const rows = [...document.querySelectorAll('#pause-sheet .sh-move')];
      rows.forEach((r, k) => {
        const id = ids[i + k],
          txt = r.innerText + ' ' + (r.querySelector('.sh-detail') || {}).textContent;
        out.sheet++;
        if (
          !r.querySelector('.nm').textContent.includes(G.MoveInfo.name(id)) ||
          !r.querySelector('.sum').textContent.trim() ||
          /undefined|NaN/.test(txt) ||
          !r.querySelector('.ico canvas,.ico img,.ico i,.ico span')
        )
          out.bad.push('sheet ' + id + ' "' + txt.replace(/\s+/g, ' ').slice(0, 90) + '"');
        if (
          newPath &&
          G.MoveRoute.routed(id) &&
          /every|Power|area|size|length|×/.test((r.querySelector('.sh-detail .ds') || {}).textContent || '')
        )
          out.rowsNum++;
      });
      G.UI.hide('scr-pause');
    }
    Object.assign(pl, keep);
    return out;
  }, ALL);
  ok(run.cards === ALL.length - 1, tag + ': a level-up card for every move but the held one (' + run.cards + ')');
  ok(run.sheet === ALL.length, tag + ': every move on the pause sheet (' + run.sheet + ')');
  ok(
    !run.bad.length,
    tag +
      ': cards and sheet rows read right' +
      (run.bad.length ? '\n        ' + run.bad.slice(0, 8).join('\n        ') : '')
  );
  ok(run.rowsNum >= 55, tag + ': routed sheet rows show the folded numbers (' + run.rowsNum + ' moves with numbers)');
  await sleep(500);
  ok(
    errs.length === 0,
    tag + ': no console or page errors' + (errs.length ? '\n        ' + errs.slice(0, 5).join('\n        ') : '')
  );
  await page.close();
}

// The real way into a run: menu, Play, region card. check() above calls startRun directly, which skips the region picker.
async function regionFlow(browser, query, tag) {
  const { page, errs } = await boot(browser, query);
  const toRun = async () => {
    await page.evaluate(() => {
      const t = document.getElementById('tap-start');
      if (!t.classList.contains('hidden')) t.click();
      G.Flow.goMenu();
      document.querySelector('#scr-menu [data-go="play"]').click();
    });
    await page.waitForFunction(() => document.getElementById('rg').classList.contains('open'), null, { timeout: 5000 });
    await page.evaluate(() => document.querySelector('#rg-cards .rg-card:not(.locked)').click());
    await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 20000 });
    await sleep(600);
    await page.evaluate(() => {
      window.__smokePl = G.Game.player;
      G.Game.player.invuln = 1e9;
    });
  };
  const sameRun = () => page.evaluate(() => window.__smokePl === G.Game.player);
  await toRun();
  ok(
    await page.evaluate(() => !document.getElementById('rg').classList.contains('open')),
    tag + ': picking a region closes the picker'
  );
  await page.keyboard.press('Space');
  await sleep(300);
  ok(await sameRun(), tag + ': Space in a run does not start a new run');
  ok(await page.evaluate(() => G.Game.player.dodges.cd.some((t) => t > 0)), tag + ': Space in a run dodges');
  await page.keyboard.press('Enter');
  await sleep(300);
  ok(await sameRun(), tag + ': Enter in a run does not start a new run');
  // back to the menu: the picker opens and closes again as before, and starts a second run
  await page.evaluate(() => {
    G.Game.toUI();
    G.Flow.goMenu();
    document.querySelector('#scr-menu [data-go="play"]').click();
  });
  await sleep(200);
  const opened = await page.evaluate(() => document.getElementById('rg').classList.contains('open'));
  await page.keyboard.press('Escape');
  await sleep(200);
  ok(
    opened && (await page.evaluate(() => !document.getElementById('rg').classList.contains('open'))),
    tag + ': the picker reopens after a run and Esc closes it'
  );
  await toRun();
  ok(await page.evaluate(() => G.Game.state === 'playing'), tag + ': a second run starts from the picker');
  ok(
    errs.length === 0,
    tag + ': no console or page errors' + (errs.length ? '\n        ' + errs.slice(0, 5).join('\n        ') : '')
  );
  await page.close();
}

(async () => {
  const srv = cp.spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: root,
    stdio: 'ignore',
  });
  await sleep(1200);
  const browser = await chromium.launch();
  try {
    await check(browser, '?dev', 'ui');
    await regionFlow(browser, '?dev', 'region');
  } catch (e) {
    fail++;
    console.log('FAIL  crashed: ' + ((e && e.stack) || e));
  }
  await browser.close();
  srv.kill();
  console.log(fail ? 'smoke-ui: ' + fail + ' check(s) FAILED' : 'smoke-ui: all checks passed');
  process.exit(fail ? 1 : 0);
})();
