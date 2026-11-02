// tools/smoke-ui.js: headless browser check for the slice 7a UI readers. A check, not a harness: tools/check.js only syntax-checks it,
// since it needs a browser. Playwright is NOT a repo dependency (PLAYWRIGHT_DIR, default C:\Users\boric\tools\playwright), as in
// tools/smoke-newcombat.js. Usage from the repo root:  node tools/smoke-ui.js
// On dev.html?dev (one move path since slice 7b; the ?newcombat page it also ran is gone), every move must show correctly:
//   menus: the Upgrades screen's ban picker and move-slot selects (every owned Pokemon, so the union of pools covers every move), the
//          Pokedex detail (start move and learnable icons);
//   level-up: a "new move" card for every move on the real level-up screen (name, text, type tag, icon);
//   sheet: every move on the pause sheet (name, summary, icon; no "undefined" or "NaN"; routed rows with numbers);
//   icons: every move icon is drawn, with its family badge exactly when G.MoveInfo gives one.
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

  // ---- menus: the Upgrades screen for every owned Pokemon (ban picker + move-slot selects), then the Pokedex detail ----
  const menu = await page.evaluate(async () => {
    G.MenuUI.open();
    // Upgrades opens from the Team screen's Upgrade button on the previewed Pokemon (the main menu entry is gone, 2026-11-01)
    document.querySelector('#scr-menu [data-go="team"]').click();
    document.getElementById('ros-upg').click();
    const sel = document.getElementById('upg-mon'),
      seen = new Set(),
      bad = [];
    const opts = [...sel.options].map((o) => o.value);
    for (const v of opts) {
      sel.value = v;
      sel.dispatchEvent(new Event('change'));
      const ban = document.querySelector('[data-ban]');
      if (ban && !document.querySelector('.ban-moves')) ban.click();
      for (const b of document.querySelectorAll('.ban-moves [data-id]')) {
        const id = b.dataset.id;
        seen.add(id);
        if (!b.textContent.includes(G.MoveInfo.name(id)) || !b.querySelector('canvas,img,svg,i,span'))
          bad.push('ban ' + id);
      }
      for (const o of document.querySelectorAll('.bind-slot select option[value]')) {
        if (!o.value) continue;
        seen.add(o.value);
        if (o.textContent !== G.MoveInfo.name(o.value)) bad.push('bind ' + o.value + ' "' + o.textContent + '"');
      }
    }
    // the Team screen's detail: the start move first, then the pool, each a name MoveInfo gives and an icon
    G.MenuUI.open();
    document.querySelector('#scr-menu [data-go="team"]').click();
    await new Promise((r) => setTimeout(r, 300));
    const names = new Set(G.Moves.ALL.map((m) => G.MoveInfo.name(m.id)));
    const rows = [...document.querySelectorAll('.ros-mv')];
    const dexOk =
      rows.length > 0 &&
      rows.every((r) => names.has(r.querySelector('span').textContent) && r.querySelector('canvas,img,i'));
    return { n: opts.length, seen: [...seen], bad, dexOk, rows: rows.length };
  });
  const RET = await page.evaluate(() => Object.keys(G.Moves.RETIRED)); // slice 7b: Bubble and Hail are learnable by no one
  const miss = ALL.filter((id) => !RET.includes(id) && !menu.seen.includes(id)),
    shownRet = RET.filter((id) => menu.seen.includes(id));
  ok(
    !menu.bad.length,
    tag +
      ': ban picker and move-slot names match MoveInfo over ' +
      menu.n +
      ' Pokemon' +
      (menu.bad.length ? ' (' + menu.bad.slice(0, 6).join(', ') + ')' : '')
  );
  ok(
    !miss.length,
    tag +
      ': the menus showed every move but the retired ones (' +
      menu.seen.length +
      '/' +
      (ALL.length - RET.length) +
      (miss.length ? '; missing ' + miss.join(' ') : '') +
      ')'
  );
  ok(
    !shownRet.length,
    tag + ': no retired move in the menus' + (shownRet.length ? ' (' + shownRet.join(' ') + ')' : '')
  );
  ok(menu.dexOk, tag + ': the Team screen lists its moves with names and icons (' + menu.rows + ' rows)');

  // ---- a run: level-up cards and the pause sheet for every move ----
  await page.evaluate(() => G.Game.startRun());
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 20000 });
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

(async () => {
  const srv = cp.spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: root,
    stdio: 'ignore',
  });
  await sleep(1200);
  const browser = await chromium.launch();
  try {
    await check(browser, '?dev', 'ui');
  } catch (e) {
    fail++;
    console.log('FAIL  crashed: ' + ((e && e.stack) || e));
  }
  await browser.close();
  srv.kill();
  console.log(fail ? 'smoke-ui: ' + fail + ' check(s) FAILED' : 'smoke-ui: all checks passed');
  process.exit(fail ? 1 : 0);
})();
