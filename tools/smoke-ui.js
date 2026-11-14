// tools/smoke-ui.js: headless browser check for the slice 7a UI readers. A check, not a harness: tools/check.js only syntax-checks it,
// since it needs a browser. Playwright is NOT a repo dependency (PLAYWRIGHT_DIR, default C:\Users\boric\tools\playwright), as in
// tools/smoke-newcombat.js. Usage from the repo root:  node tools/smoke-ui.js
// On dev.html?dev (one move path since slice 7b; the ?newcombat page it also ran is gone), every move must show correctly:
//   menus: the Team screen's detail moves for every owned Pokemon (so the union of pools covers every move, each name MoveInfo's
//          and with an icon), then the Upgrades popup over it (4 columns, 19 boxes, the points counter, Q/E between party members, Esc);
//   level-up: a "new move" card for every move on the real level-up screen (name, text, type tag, icon);
//   sheet: every move on the pause sheet (name, summary, icon; no "undefined" or "NaN"; routed rows with numbers);
//   icons: every move icon is drawn, with its family badge exactly when G.MoveInfo gives one;
//   region flow: the real menu, Play and region card path, then Space dodges and neither Space nor Enter starts a new run;
//   login: a first launch shows the PokeSwarm login, and Tab, Space and the arrows work in its text fields.
//   onboarding: a new guest picks a region (9 cards of 3) and starts with its three starters, Grass leading; a save with a partner skips it.
// Fails on any page or console error.
const path = require('path'),
  cp = require('child_process');
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
    // Move Shop step 5 (Jess 2026-11-05): moves come from the shops, so every move is checked as a Move Trainer offer, four at a time
    // through a stubbed pool: its name, text, type-coloured icon box and icon. (This replaced the level-up New Move card check.)
    const want = ids.filter((id) => id !== 'tackle');
    for (let i = 0; i < want.length; i += 4) {
      const grp = want.slice(i, i + 4);
      G.Moves.poolFor = () => grp.slice();
      G.ShopUI.open({ kind: 'trainer', stock: new Map(), tms: null, rerolls: 1 }, () => {});
      const els = [...document.querySelectorAll('#mshop-offers .card')];
      for (const id of grp) {
        const el = els.find((e) => {
          const n = e.querySelector('.nm');
          return n && n.firstChild && n.firstChild.textContent === G.MoveInfo.name(id);
        });
        const ds = el ? el.querySelector('.ds').textContent : '',
          wd = G.MoveInfo.desc(id);
        out.cards++;
        if (
          !el ||
          wd.length < 5 ||
          !ds.startsWith(wd) ||
          !el.querySelector('.ico').style.background ||
          !el.querySelector('.ico canvas,.ico img,.ico i,.ico span')
        )
          out.bad.push(
            'offer ' + id + ' "' + (el ? el.textContent.replace(/\s+/g, ' ').slice(0, 90) : 'missing') + '"'
          );
      }
      G.ShopUI.leave();
    }
    G.Moves.poolFor = pf;
    // and a level-up never offers a New Move card any more, with free slots and a learnable pool
    let nmCards = 0;
    for (let k = 0; k < 30; k++)
      nmCards += G.LevelUp.offer(pl, 3, roster).filter((c) => c.type === 'new' || c.family === 'newmove').length;
    out.noNewMove = nmCards === 0 && !('newmove' in G.LevelUp.teamFamilies(pl, roster));
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
  ok(run.cards === ALL.length - 1, tag + ': a Move Trainer offer for every move but the held one (' + run.cards + ')');
  ok(run.noNewMove, tag + ': level-ups offer no New Move card (moves come from the shops)');
  ok(run.sheet === ALL.length, tag + ': every move on the pause sheet (' + run.sheet + ')');
  ok(
    !run.bad.length,
    tag +
      ': shop offers and sheet rows read right' +
      (run.bad.length ? '\n        ' + run.bad.slice(0, 8).join('\n        ') : '')
  );
  ok(run.rowsNum >= 55, tag + ': routed sheet rows show the folded numbers (' + run.rowsNum + ' moves with numbers)');
  // Move Shop step 4 and 4b: every purchase asks first (the in-game dialog). The Trainer buys into a free slot, the forget step
  // cancels and replaces, the Mart opens, and a held bond that a purchase made usable opens right after Leave. Last in this page:
  // it leaves the bond screen open.
  const shop = await page.evaluate(async () => {
    const pl = G.Game.player,
      o = {},
      sig = () => pl.slots.map((g) => g.map((m) => m.id).join('+')).join(','),
      tick = () => new Promise((r) => setTimeout(r, 0)),
      answer = async (yes) => {
        if (!G.ShopUI.asking) return false;
        document.getElementById(yes ? 'ask-ok' : 'ask-no').click();
        await tick();
        return true;
      },
      buyOffer = async (i) => {
        G.ShopUI.pickOffer(i);
        return answer(true);
      };
    pl.invuln = 1e9;
    pl.moves = [G.Moves.instance('tackle')];
    pl.slots = [pl.moves.slice()];
    pl.active = 0;
    pl.bonds = 0;
    G.Debug.silver(9999999);
    o.open = G.Debug.trainer() === true && G.UI.isOpen('scr-shop') && G.Game.state === 'choice';
    // 4b: a pick opens the dialog and buys nothing; Cancel changes nothing; a second pick under the dialog does nothing
    const s0 = sig();
    G.ShopUI.pickOffer(0);
    o.asks = G.ShopUI.asking && !document.getElementById('scr-ask').classList.contains('hidden') && sig() === s0;
    G.ShopUI.pickOffer(1);
    G.ShopUI.pickMember(0);
    o.underDialog = G.ShopUI.asking && sig() === s0;
    await answer(false);
    o.cancelBuy = !G.ShopUI.asking && sig() === s0;
    // 4c: a reroll under the dialog does nothing; R (the reroll) gives new offers and greys the button at 0
    const offTxt = () => [...document.querySelectorAll('#mshop-offers .nm')].map((e) => e.textContent).join('|'),
      rb = document.getElementById('mshop-reroll'),
      t0 = offTxt();
    G.ShopUI.pickOffer(0);
    G.ShopUI.reroll();
    o.rerollUnder = G.ShopUI.asking && offTxt() === t0 && !rb.disabled;
    await answer(false);
    G.ShopUI.reroll();
    o.reroll = offTxt() !== t0 && rb.disabled;
    for (let i = 0; i < 4 && pl.slots.length < 2; i++) await buyOffer(i);
    o.buy = pl.slots.length === 2 && pl.active === 0;
    for (let k = 0; k < 8 && pl.slots.length < pl.maxMoves; k++) await buyOffer(k % 4);
    o.full = pl.slots.length === pl.maxMoves;
    const before = sig();
    for (let i = 0; i < 4 && !G.ShopUI.forgetting; i++) G.ShopUI.pickOffer(i);
    o.forget = G.ShopUI.forgetting;
    G.ShopUI.back();
    o.cancel = !G.ShopUI.forgetting && sig() === before;
    for (let i = 0; i < 4 && !G.ShopUI.forgetting; i++) G.ShopUI.pickOffer(i);
    // 4b H2: Cancel on the forget confirm goes back to the forget list
    for (let i = 3; i >= 0 && !G.ShopUI.asking; i--) G.ShopUI.pickSlot(i);
    await answer(false);
    o.forgetCancel = G.ShopUI.forgetting && sig() === before;
    for (let i = 3; i >= 0 && !G.ShopUI.asking; i--) G.ShopUI.pickSlot(i);
    await answer(true);
    o.replace = !G.ShopUI.forgetting && pl.slots.length === pl.maxMoves && sig() !== before;
    G.ShopUI.leave();
    o.left = !G.UI.isOpen('scr-shop') && G.Game.state === 'playing';
    o.mart = G.Debug.mart() === true && G.UI.isOpen('scr-shop');
    for (let i = 0; i < 4; i++) {
      G.ShopUI.pickOffer(i);
      G.ShopUI.pickMember(0);
      await answer(true);
    }
    G.ShopUI.back(); // a TM for a full team ends on the forget list: cancel it first
    G.ShopUI.leave();
    o.martLeft = !G.UI.isOpen('scr-shop');
    // a held bond: open the Trainer with 1 loose move, buy a second, Leave; the bond screen opens on a following frame
    pl.moves = [G.Moves.instance('tackle')];
    pl.slots = [pl.moves.slice()];
    pl.active = 0;
    pl.bonds = 1;
    G.Debug.trainer();
    for (let i = 0; i < 4 && pl.slots.length < 2; i++) await buyOffer(i);
    o.bondHeld = !G.UI.isOpen('scr-bond');
    G.ShopUI.leave();
    return o;
  });
  await sleep(400);
  shop.bondAfter = await page.evaluate(() => G.UI.isOpen('scr-bond'));
  ok(shop.open, tag + ': G.Debug.trainer() opens the Move Trainer and pauses the run');
  ok(shop.asks, tag + ': picking an offer opens the confirm dialog and buys nothing yet');
  ok(shop.underDialog, tag + ': picks under the open dialog do nothing');
  ok(shop.cancelBuy, tag + ': Cancel on the dialog buys nothing');
  ok(shop.rerollUnder, tag + ': a reroll under the open dialog does nothing');
  ok(shop.reroll, tag + ': Reroll gives new offers and greys the button with none left');
  ok(shop.buy, tag + ': Buy fills a free slot and keeps the active slot');
  ok(shop.full && shop.forget, tag + ': with 4 slots full a purchase goes to the forget step');
  ok(shop.cancel, tag + ': Cancel on the forget step changes nothing');
  ok(shop.forgetCancel, tag + ': Cancel on the forget confirm returns to the forget list');
  ok(shop.replace, tag + ': picking a slot and Buy replaces that move');
  ok(shop.left, tag + ': Leave closes the shop and the run goes on');
  ok(shop.mart && shop.martLeft, tag + ': G.Debug.mart() opens the TM Mart, and it closes again');
  ok(shop.bondHeld, tag + ': an open shop holds back the bond screen');
  ok(shop.bondAfter, tag + ': the held bond opens right after Leave');
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

// Onboarding (2026-11-05): a first launch with no save shows the PokeSwarm login, in the menu's title font, and its text fields
// take the browser's own keys (Tab moves to the password, Space and the arrows work while typing a name).
async function loginFlow(browser, query, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }); // fresh storage: no session, no save
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push('console: ' + m.text());
  });
  await page.goto(`http://127.0.0.1:${PORT}/dev.html${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.G && G.DB && G.LoginUI, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await G.DB.ready();
    const t = document.getElementById('tap-start');
    if (t && !t.classList.contains('hidden')) t.click();
    G.LoginUI.open();
  });
  await sleep(300);
  const scr = await page.evaluate(() => {
    const s = document.getElementById('scr-login'),
      t1 = s.querySelector('.logo .t1');
    return {
      shown: !s.classList.contains('hidden'),
      title: t1 && t1.textContent.trim(),
      font: t1 && getComputedStyle(t1).fontFamily,
      michromaLoaded: !!document.fonts && document.fonts.check('16px Michroma'),
      korataki: [...document.styleSheets].some((sh) => {
        try {
          return [...sh.cssRules].some((r) => /korataki/i.test(r.cssText));
        } catch (e) {
          return false; // a sheet the page may not read
        }
      }),
      oldName: /pok[eé]\s?survivor/i.test(s.textContent),
      sub: !!s.querySelector('.logo .t2'),
      official: !!s.querySelector('.login-official'),
      fits: t1 && t1.scrollWidth <= t1.clientWidth,
    };
  });
  ok(scr.fits, tag + ': the PokeSwarm title fits inside the login box');
  ok(scr.shown, tag + ': the login screen shows on a first launch');
  ok(scr.title === 'PokeSwarm', tag + ': the login title reads PokeSwarm (' + scr.title + ')');
  ok(/michroma/i.test(scr.font || ''), tag + ': the login title uses the menu title font, Michroma (' + scr.font + ')');
  ok(scr.michromaLoaded, tag + ': the Michroma face is loaded (#37)');
  ok(!scr.korataki, tag + ': no stylesheet names Korataki (#37, personal-use licence)');
  ok(!scr.oldName && !scr.sub && !scr.official, tag + ': no PokeSurvivor name, subtitle or official-site line');
  await page.focus('#f-user');
  await page.keyboard.type('Ash Ketchu');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('X');
  ok(
    (await page.inputValue('#f-user')) === 'Ash KetchXu',
    tag + ': Space types and ArrowLeft moves the cursor in the name field'
  );
  await page.keyboard.press('Tab');
  ok(
    await page.evaluate(() => document.activeElement && document.activeElement.id === 'f-pass'),
    tag + ': Tab moves from the name to the password'
  );
  ok(
    errs.length === 0,
    tag + ': no console or page errors' + (errs.length ? '\n        ' + errs.slice(0, 5).join('\n        ') : '')
  );
  await ctx.close();
}

// Onboarding F3 (2026-11-05): a new guest goes straight to the region pick (9 cards of 3 sprites), picks Johto and lands in the
// menu with Chikorita leading Cyndaquil and Totodile; a save that already has a partner skips the screen on the next load.
async function onboardingFlow(browser, query, tag) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push('console: ' + m.text());
  });
  await page.goto(`http://127.0.0.1:${PORT}/dev.html${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.G && G.DB && G.LoginUI, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await G.DB.ready();
    const t = document.getElementById('tap-start');
    if (t && !t.classList.contains('hidden')) t.click();
    G.LoginUI.open();
  });
  await sleep(300);
  await page.click('#btn-guest');
  await sleep(600);
  const scr = await page.evaluate(() => {
    const s = document.getElementById('scr-starters'),
      cards = [...s.querySelectorAll('.region-card')];
    return {
      shown: !s.classList.contains('hidden'),
      quiz: !document.getElementById('scr-test').classList.contains('hidden'),
      names: cards.map((c) => c.querySelector('h3').textContent),
      sprites: cards.map((c) => c.querySelectorAll('canvas').length),
      okOff: document.getElementById('starter-ok').disabled,
    };
  });
  ok(scr.shown && !scr.quiz, tag + ': a new guest lands on the starter pick, not the quiz');
  ok(
    scr.names.join() === 'Kanto,Johto,Hoenn,Sinnoh,Unova,Kalos,Alola,Galar,Paldea',
    tag + ': 9 region cards in order (' + scr.names.join() + ')'
  );
  ok(scr.sprites.length === 9 && scr.sprites.every((n) => n === 3), tag + ': each card shows 3 sprites');
  ok(scr.okOff, tag + ': Choose is disabled until a region is picked');
  await page.click('.region-card[data-region="Johto"]');
  const ready = await page.evaluate(() => ({
    off: document.getElementById('starter-ok').disabled,
    label: document.getElementById('starter-ok').textContent,
    info: document.getElementById('starter-info').textContent,
  }));
  ok(!ready.off && ready.label === 'Choose Johto', tag + ': picking Johto enables "' + ready.label + '"');
  ok(
    /Chikorita/.test(ready.info) && /Cyndaquil/.test(ready.info) && /Totodile/.test(ready.info),
    tag + ': the info line names the three'
  );
  await page.click('#starter-ok');
  await sleep(800);
  const res = await page.evaluate(() => {
    const s = G.DB.save;
    return {
      team: s.team.map((t) => t && t.dex),
      uids: s.team.slice(0, 3).every((t) => t && t.uid),
      partner: s.partner,
      starter: s.starter,
      menu: !document.getElementById('scr-menu').classList.contains('hidden'),
    };
  });
  ok(res.team.join() === '152,155,158,,,', tag + ': team is Chikorita, Cyndaquil, Totodile (' + res.team.join() + ')');
  ok(res.uids, tag + ': each of the three slots is linked to its own copy');
  ok(res.partner === 152 && res.starter === 152, tag + ': Chikorita leads (partner and starter)');
  ok(res.menu, tag + ': the main menu opens');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.G && G.DB && G.LoginUI, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await G.DB.ready();
    const t = document.getElementById('tap-start');
    if (t && !t.classList.contains('hidden')) t.click();
  });
  await sleep(800);
  ok(
    await page.evaluate(() => document.getElementById('scr-starters').classList.contains('hidden')),
    tag + ': a save with a partner skips the starter pick'
  );
  ok(
    errs.length === 0,
    tag + ': no console or page errors' + (errs.length ? '\n        ' + errs.slice(0, 5).join('\n        ') : '')
  );
  await ctx.close();
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
    await loginFlow(browser, '?dev', 'login');
    await onboardingFlow(browser, '?dev', 'onboarding');
  } catch (e) {
    fail++;
    console.log('FAIL  crashed: ' + ((e && e.stack) || e));
  }
  await browser.close();
  srv.kill();
  console.log(fail ? 'smoke-ui: ' + fail + ' check(s) FAILED' : 'smoke-ui: all checks passed');
  process.exit(fail ? 1 : 0);
})();
