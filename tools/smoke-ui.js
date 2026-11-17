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
//   catch (#136, redesign 136b): touching a won rescue opens the catch screen: the portrait, a band 2 x bandAccuracy wide that
//          holds the true chance, belt 1 full and numbered, belts 2 and 3 locked, every owned copy of the species. The arrow
//          keys move the selection cursor (belt, owned grid with its tooltip, Throw, Let It Go); Esc asks; Enter on Throw
//          throws, leaving that slot empty and filling the flee ring by misses / allowed; a click selects without replacing
//          the slot (what a real double click needs) and a double click throws; the run plays on with the catch held; a quit
//          places nothing; a number key throws from belt 1, and a team fall places the catch in the Pokebox.
//   shop (#149a): the Main Menu Shop over the Main Menu, four rail tabs each with its own pane, a team item and a berry slot
//          bought (price spent, owned), an unaffordable Buy cannot take focus, Q / E switch tabs, Enter on Exit, Esc; the
//          cursor shows only under the mouse while it is in use and snaps back on a key.
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
  // Move Shop step 2: Silver is loaded (dev.html tag and NEED entry); #124: a run starts with 0 (a quick kill may add some).
  const silver = await page.evaluate(() => (G.Silver ? G.Silver.whole : null));
  ok(
    silver != null && silver >= 0 && silver < 50,
    tag + ': a run starts with 0 Silver, a few kills at most (' + silver + ')'
  );
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

// #136: the catch screen in a real run. The won rescue is set up by hand (the UberElite fight is the harness's job): the rescue's
// Stage 1 waits beside the player, who touches it on the next frame.
async function catchFlow(browser, query, tag) {
  const { page, errs } = await boot(browser, query);
  // Headless Chrome cannot play sound, so "press to start" is still waiting and would take the clicks: pass it first.
  await page.evaluate(() => {
    if (!document.getElementById('tap-start').classList.contains('hidden'))
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  const run = async () => {
    await page.evaluate(() => G.Game.startRun());
    await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 20000 });
  };
  // ownCopies: copies of the rescued species put in the box first (method other), for the owned grid. The nature is set to
  // Bold (an easy nature, more than one miss allowed) so a forced miss never ends the catch.
  const winAndTouch = (ownCopies = 0) =>
    page.evaluate((copies) => {
      const pl = G.Game.player;
      G.Rescue.debugFire();
      const e = G.Rescue.active;
      // #148: a species whose odds stay under a sure catch at World Level 1 (capture rate 45), so a forced roll can miss;
      // a random pick with a high capture rate is a sure catch this early (the early World Level bonus)
      e.dex = 1;
      e.name = G.DEX_BY[1].name;
      e.nature = G.SpeciesTraits.NATURES.findIndex((n) => n[0] === 'bold') + 1;
      e.natureName = 'Bold';
      for (let i = 0; i < copies; i++) G.DB.obtain(e.dex, false, 'other', G.DB.save, 1 + i);
      e.x = pl.x - G.Rescue.K.monOffsetX; // the Stage 1 stands right on the player
      e.y = pl.y;
      G.Rescue.onUberHit(e.uber);
      G.Rescue.onUberDown(e.uber);
      return e.name;
    }, ownCopies);
  await run();
  // Rescue copies only (method r): other copies can join the box at a run end too (a wild shiny).
  const rescued = () => page.evaluate(() => G.DB.save.box.filter((c) => c.m === 'r').length);
  const box0 = await rescued();
  const name = await winAndTouch(5);
  await page.waitForFunction(() => G.UI.isOpen('scr-catch'), null, { timeout: 5000 }).catch(() => {});
  // what the screen shows, read from the page
  const screen = () =>
    page.evaluate(() => {
      const root = document.getElementById('scr-catch'),
        session = G.Catch.session,
        cursorAt = root.querySelector('.hud-cursor'),
        faceImage = root.querySelector('.catch-face img');
      const host = cursorAt && cursorAt.closest('[data-slot], [data-owned-index], .catch-button');
      const ring = root.querySelector('.catch-ring'),
        ringDeg = ring ? parseFloat(ring.style.getPropertyValue('--flee')) : NaN;
      const tip = document.querySelector('.hud-tip-layer .hud-tip'), // the page's one tooltip layer
        frame = root.querySelector('.catch-window'); // absent while the screen is closed
      let cursor = 'none';
      if (host && host.dataset.slot != null) cursor = 'slot ' + host.dataset.belt + '.' + host.dataset.slot;
      else if (host && host.dataset.ownedIndex != null) cursor = 'owned ' + host.dataset.ownedIndex;
      else if (host) cursor = host.classList.contains('catch-let-go') ? 'let go' : 'throw';
      return {
        open: G.UI.isOpen('scr-catch'),
        paused: G.Game.state === 'choice',
        name: (root.querySelector('.catch-name') || {}).textContent || '',
        portrait: faceImage ? faceImage.getAttribute('src') || '' : '',
        band: (root.querySelector('.catch-band') || {}).textContent || '',
        truth: session ? Math.round(G.Catch.odds(session, 'poke') * 100) : null,
        reach: G.Catch.K.bandAccuracy,
        beltBalls: root.querySelectorAll('[data-belt="0"].is-full').length,
        lockedBelts: root.querySelectorAll('.catch-belt.is-locked').length,
        keysOn: [0, 1, 2].map((b) => root.querySelectorAll('[data-belt="' + b + '"] .catch-slot-key').length),
        total: G.Catch.total(),
        owned: root.querySelectorAll('[data-owned-index]').length,
        ownedInBox: session ? G.Copies.all(G.DB.save).filter((c) => c.speciesID === session.dex).length : null,
        cursor,
        tipRightOfWindow: !!tip && !!frame && tip.getBoundingClientRect().left >= frame.getBoundingClientRect().right,
        misses: session ? session.misses : null,
        allowed: session ? session.allowed : null,
        ringShare: ringDeg / 360,
        selected: (root.querySelector('.catch-slot.is-selected') || { dataset: {} }).dataset.slot,
        asking: G.UI.isOpen('scr-ask'),
        // why a catch did not open: the run's state and the screens up
        why:
          G.Game.state + ' / ' + [...document.querySelectorAll('section.scr:not(.hidden)')].map((x) => x.id).join(','),
      };
    });
  // one key, then a few frames so the game loop reads it (headless frames can be slow)
  const key = async (code) => {
    await page.keyboard.press(code);
    await page.waitForTimeout(150);
  };
  const forceRandom = (value) =>
    page.evaluate((v) => {
      window.realRandom = window.realRandom || Math.random;
      Math.random = () => v;
    }, value);
  const realRandom = () => page.evaluate(() => (Math.random = window.realRandom || Math.random));
  let shown = await screen();
  ok(
    shown.open && shown.paused,
    tag +
      ': touching the won Stage 1 opens the catch screen and pauses the run' +
      (shown.open ? '' : ' (' + shown.why + ')')
  );
  const [low, high] = (shown.band.match(/\d+/g) || []).map(Number);
  ok(
    shown.name.endsWith(name) && /Portrait\.png$/.test(shown.portrait) && /^\d+-\d+%$/.test(shown.band),
    tag + ': it shows "Nature Name", the portrait and a catch band (' + shown.name + ', ' + shown.band + ')'
  );
  ok(
    high - low === 2 * shown.reach && low <= shown.truth && shown.truth <= high,
    tag + ': the band is 2 x bandAccuracy wide and holds the true chance (' + shown.truth + '% in ' + shown.band + ')'
  );
  ok(
    shown.beltBalls === shown.total && shown.lockedBelts === 2 && shown.keysOn.join() === '6,0,0',
    tag +
      ': belt 1 holds every ball and shows 1 to 6, belts 2 and 3 are locked (' +
      shown.beltBalls +
      ' balls, keys ' +
      shown.keysOn.join('/') +
      ')'
  );
  ok(
    shown.owned === shown.ownedInBox && shown.owned >= 5,
    tag + ': Pokemon owned shows every copy of the species in the box (' + shown.owned + ')'
  );
  // the cursor: down the belt, right into the owned grid (tooltip right of the window), down to Throw and Let It Go
  const path = [];
  for (const code of ['ArrowDown', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowUp']) {
    await key(code);
    const now = await screen();
    path.push(now.cursor + (now.cursor.startsWith('owned') ? (now.tipRightOfWindow ? ' tip' : ' no tip') : ''));
  }
  ok(
    path.join(', ') === 'slot 0.1, owned 0 tip, owned 4 tip, throw, let go, throw',
    tag +
      ': the arrow keys walk the cursor belt, owned grid (with its tooltip), Throw, Let It Go (' +
      path.join(', ') +
      ')'
  );
  await key('Escape');
  ok((await screen()).asking, tag + ': Esc asks before letting it go');
  await page.click('#ask-no');
  await page.waitForTimeout(150);
  shown = await screen();
  ok(shown.open && !shown.asking, tag + ': Keep trying keeps the catch open');
  // Enter on Throw: a sure miss; the selected slot empties and the ring fills by misses / allowed, after the break-out
  const before = shown;
  await forceRandom(0.9999);
  await key('Enter');
  await realRandom();
  const midThrow = await screen();
  ok(
    midThrow.misses === 1 && midThrow.ringShare < 0.01,
    tag + ': the flee ring waits for the throw to end (' + midThrow.ringShare.toFixed(2) + ' mid-throw, 1 miss counted)'
  );
  await page.waitForFunction(() => !G.CatchUI.busy, null, { timeout: 6000 }).catch(() => {});
  shown = await screen();
  const printed = await page.evaluate(() => {
    const tables = [],
      realTable = console.table;
    console.table = (rows) => tables.push(rows);
    const math = G.Debug.catchMath();
    console.table = realTable;
    const rows = tables[0] || [];
    return {
      rows: rows.length,
      result: (rows.find((row) => row.step === 'result') || {}).value || '',
      rolls: math ? math.shakeRolls.length : -1,
    };
  });
  ok(
    printed.rows > 0 && printed.rolls === 1 && /broke free after 0 shakes/.test(printed.result),
    tag + ': G.Debug.catchMath() prints the last throw (' + printed.rows + ' rows, "' + printed.result + '")'
  );
  const thrownEmpty = await page.evaluate(
    (slot) =>
      !document.querySelector('#scr-catch [data-belt="0"][data-slot="' + slot + '"]').classList.contains('is-full'),
    before.selected
  );
  ok(
    shown.total === before.total - 1 && thrownEmpty && shown.misses === 1,
    tag + ': Enter on Throw throws the selected ball and leaves its slot empty (a miss)'
  );
  ok(
    Math.abs(shown.ringShare - shown.misses / shown.allowed) < 0.01,
    tag +
      ': the flee ring fills misses / allowed (' +
      shown.ringShare.toFixed(2) +
      ' at ' +
      shown.misses +
      '/' +
      shown.allowed +
      ')'
  );
  // a click selects without replacing the slot (a real double click needs the same element twice), then a double click throws
  const slot = await page.$('#scr-catch [data-belt="0"].is-full:not(.is-selected)');
  await slot.click();
  await page.waitForTimeout(100);
  ok(
    await slot.evaluate((element) => element.isConnected && element.classList.contains('is-selected')),
    tag + ': a click selects the ball and keeps the same slot element'
  );
  await forceRandom(0);
  await slot.dblclick();
  await realRandom();
  await page.waitForFunction(() => !G.UI.isOpen('scr-catch'), null, { timeout: 8000 }).catch(() => {});
  const after = await page.evaluate(() => ({
    open: G.UI.isOpen('scr-catch'),
    state: G.Game.state,
    held: G.Catch.held.length,
    left: G.Catch.total(),
    box: G.DB.save.box.filter((c) => c.m === 'r').length,
  }));
  ok(
    !after.open &&
      after.state === 'playing' &&
      after.held === 1 &&
      after.left === shown.total - 1 &&
      after.box === box0,
    tag + ': a double click throws one ball, the catch is held (not boxed) and the run plays on'
  );
  await page.evaluate(() => G.Game.quit());
  await page.waitForFunction(() => G.Game.state === 'over', null, { timeout: 5000 }).catch(() => {});
  ok((await rescued()) === box0, tag + ': a quit loses the held catch');
  await page.evaluate(() => G.UI.hideAll());
  await run();
  await winAndTouch();
  await page.waitForFunction(() => G.UI.isOpen('scr-catch'), null, { timeout: 5000 }).catch(() => {});
  // number key 2 throws from belt 1 (a sure catch)
  const total2 = await page.evaluate(() => G.Catch.total());
  await forceRandom(0);
  await key('Digit2');
  await realRandom();
  await page
    .waitForFunction(() => G.Game.state === 'playing' && G.Catch.held.length === 1, null, { timeout: 8000 })
    .catch(() => {});
  const byKey = await page.evaluate(() => ({ held: G.Catch.held.length, total: G.Catch.total() }));
  ok(byKey.held === 1 && byKey.total === total2 - 1, tag + ': number key 2 throws a ball from belt 1');
  await page.evaluate(() => {
    for (const f of G.Game.roster) {
      f.runItems = [];
      f.hp = 0;
      f.dead = true;
    }
  });
  await page.waitForFunction(() => G.Game.state === 'over', null, { timeout: 8000 }).catch(() => {});
  ok((await rescued()) === box0 + 1, tag + ': a team fall places the held catch in the Pokebox');
  ok(
    errs.length === 0,
    tag + ': no console or page errors' + (errs.length ? '\n        ' + errs.slice(0, 5).join('\n        ') : '')
  );
  await page.close();
}

// Onboarding F3 (2026-11-05): a new guest goes straight to the region pick (9 cards of 3 sprites), picks Johto and lands in the
// menu with Chikorita leading Cyndaquil and Totodile; a save that already has a partner skips the screen on the next load.
// #149a: the Main Menu Shop opens over the Main Menu with four rail tabs, each showing its own pane; a team item and a berry
// slot bought there spend PokeCoins and read as owned; a Buy you cannot afford cannot take focus; Q and E switch tabs, the
// cursor sits on Exit (never a tab) and Enter presses it; Esc leaves too. Relations only: prices are read from the game.
// #149b: the Character Upgrades pocket cards: each grid lights one square per slot owned and dims the rest up to the cap;
// a Buy adds one slot for the price its label shows; Full and unaffordable Buys are disabled (the price still shown) and
// the arrows skip them; the arrows step Berry Buy, Team Items Buy, Exit, and Enter on a Buy asks first.
// #149c: the Team Items pane: sale cards plus owned items cover every team item, the owned grid is 4 across with dimmed
// empties; a card Buy moves its item to the owned grid for its label's price; each search bar narrows its grid; owned
// squares show their tooltip at once by mouse and after the Tooltip Delay by keys; unaffordable Buys are skipped;
// Inventory opens the Inventory screen. Feel-test fixes: cursor corners unclipped, movement keys, whole cards scrolled
// into view with the pane still, the sale grid level with the buttons' bottom.
async function shopFlow(browser, query, tag) {
  const { page, errs } = await boot(browser, query);
  await page.evaluate(() => {
    if (!document.getElementById('tap-start').classList.contains('hidden'))
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const save = G.DB.save;
    save.teamItems = {}; // maxAll may own every team item: start with none, so the Team Items tab has something to sell
    save.berrySlots = 1;
    G.MenuUI.open();
  });
  await sleep(300);
  const shown = () =>
    page.evaluate(() => ({
      shop: G.UI.isOpen('scr-gacha'),
      menu: G.UI.isOpen('scr-menu'),
      panes: [...document.querySelectorAll('#scr-gacha .shop-pane')]
        .filter((p) => !p.classList.contains('hidden'))
        .map((p) => p.id),
      selected: [...document.querySelectorAll('.shop-tab.is-selected')].map((t) => t.dataset.tab),
      // where the keys' cursor shows: the item its corners sit on (the button's action, or the item's cursor id), or a
      // search bar showing it by its green rim ('' when it shows nowhere, always so with the mouse)
      cursorOn: (() => {
        const corner = document.querySelector('#scr-gacha .hud-cursor');
        const host = corner
          ? corner.closest('[data-cursor-id]')
          : document.querySelector('.shop-search-host.is-cursor');
        const button = host && host.querySelector('button');
        return (button && button.dataset.action) || (host && host.dataset.cursorId) || '';
      })(),
      // the button with the green (focused) rim, whether by keys or under the mouse
      greenOn: (document.querySelector('#scr-gacha .hud-team-button.focused') || { dataset: {} }).dataset.action || '',
    }));
  const arrowKey = async (key) => {
    await page.keyboard.press(key);
    await sleep(80);
    return (await shown()).cursorOn;
  };
  const clickConfirm = async () => {
    await page.waitForFunction(() => G.UI.isOpen('scr-ask'), null, { timeout: 3000 });
    await page.click('#ask-ok');
    await sleep(200);
  };

  await page.click('#scr-menu [data-go="gacha"]');
  await sleep(300);
  let now = await shown();
  const tabs = await page.evaluate(() => [...document.querySelectorAll('.shop-tab')].map((t) => t.dataset.tab));
  ok(now.shop && now.menu, tag + ': the Shop opens over the Main Menu, which stays shown');
  ok(tabs.length === 4, tag + ': the rail has four tabs (' + tabs.join(', ') + ')');
  let paneRight = true;
  for (const key of tabs) {
    await page.click('.shop-tab[data-tab="' + key + '"]');
    await sleep(100);
    now = await shown();
    if (!(now.panes.length === 1 && now.panes[0] === 'shop-' + key && now.selected.join() === key)) paneRight = false;
  }
  ok(paneRight, tag + ': each tab shows its own pane, alone, and is the one selected tab');

  // the cursor follows the device in use: with the mouse no corners show anywhere (decision
  // 2026-11-17-no-selection-cursor-with-the-mouse), the button under it shows its green rim and nothing does over a card
  // or a tab; a key press brings the corners back on the last item
  await page.click('.shop-tab[data-tab="items"]');
  await sleep(100);
  const centreOf = async (selector) => {
    const box = await (await page.$(selector)).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const mouseOver = async (selector) => {
    const at = await centreOf(selector);
    await page.mouse.move(at.x, at.y, { steps: 5 });
    await sleep(100);
    return shown();
  };
  const mouseTo = async (selector) => (await mouseOver(selector)).cursorOn;
  const overExit = await mouseOver('.shop-exit .hud-team-button');
  const onExitByMouse = overExit.cursorOn === '' && overExit.greenOn === 'shop-exit';
  const overCard = await mouseOver('.shop-card-icon');
  const offOnCard = overCard.cursorOn === '' && overCard.greenOn === '';
  const overTab = await mouseOver('.shop-tab[data-tab="trs"]');
  const offOnTab = overTab.cursorOn === '' && overTab.greenOn === '';
  await page.keyboard.press('Shift');
  await sleep(100);
  const snapsBack = (await shown()).cursorOn.includes('shop-exit');
  ok(
    onExitByMouse && offOnCard && offOnTab && snapsBack,
    tag + ': with the mouse no cursor shows, only the green rim of the button under it; a key brings the cursor back'
  );

  // 149c: the Team Items pane. Cards for sale plus owned items cover every team item; the owned grid is 4 across with
  // dimmed empties filling whole rows
  const itemsNow = () =>
    page.evaluate(() => {
      const save = G.DB.save,
        teamItems = G.Items.LIST.filter((item) => item.tier === 'run');
      const ownedSquares = [...document.querySelectorAll('.shop-owned-grid .hud-grid-slot')];
      return {
        coins: save.coins,
        total: teamItems.length,
        ownedInSave: teamItems.filter((item) => G.Items.unlocked(save, item.id)).length,
        cards: [...document.querySelectorAll('.shop-card')].map((card) => ({
          id: card.dataset.item,
          name: card.querySelector('.shop-card-name').textContent.trim(),
          label: card.querySelector('button').textContent.trim(),
          disabled: card.querySelector('button').disabled,
        })),
        owned: ownedSquares
          .filter((square) => square.dataset.cursorId)
          .map((square) => G.Items.BY[square.dataset.cursorId.slice(4)].name),
        dimmed: ownedSquares.filter((square) => square.classList.contains('is-locked')).length,
        squares: ownedSquares.length,
        columns: getComputedStyle(document.querySelector('.shop-owned-grid')).gridTemplateColumns.split(' ').length,
      };
    });
  const setSaveItems = (fields) =>
    page.evaluate((values) => {
      Object.assign(G.DB.save, values);
      G.DB.commit(true);
    }, fields);
  await setSaveItems({ coins: 10000000 });
  await sleep(100);
  let items = await itemsNow();
  ok(
    items.cards.length + items.owned.length === items.total &&
      items.owned.length === items.ownedInSave &&
      items.columns === 4 &&
      items.squares % 4 === 0 &&
      items.dimmed === items.squares - items.owned.length,
    tag +
      ': sale cards plus owned items cover every team item; the owned grid is 4 across, empties dimmed to whole rows'
  );

  // a card's Buy: the item leaves the sale grid for the owned grid, for the price its label showed
  const bought = items.cards[0];
  await page.click('.shop-card[data-item="' + bought.id + '"] button');
  await clickConfirm();
  const afterCardBuy = await itemsNow();
  ok(
    !afterCardBuy.cards.some((card) => card.id === bought.id) &&
      afterCardBuy.owned.includes(bought.name) &&
      items.coins - afterCardBuy.coins === Number(bought.label.replace(/\D/g, '')),
    tag + ': a card Buy moves the item from the sale grid to the owned grid for the price its label shows'
  );

  // each search bar narrows its own grid by name; clearing it brings every item back
  const searchRight = async (selector, listOf) => {
    const before = listOf(await itemsNow());
    const word = before[0].split(' ')[0].toLowerCase();
    await page.fill(selector, word);
    await sleep(100);
    const narrowed = listOf(await itemsNow());
    await page.fill(selector, '');
    await page.keyboard.press('Escape'); // Esc while typing hands the keys back to the Shop (and does not close it)
    await sleep(100);
    const cleared = listOf(await itemsNow());
    return (
      narrowed.length > 0 &&
      narrowed.every((name) => name.toLowerCase().includes(word)) &&
      before.filter((name) => name.toLowerCase().includes(word)).length === narrowed.length &&
      cleared.length === before.length
    );
  };
  const saleSearch = await searchRight('.shop-sale-search', (view) => view.cards.map((card) => card.name));
  const ownedSearch = await searchRight('.shop-owned-search', (view) => view.owned);
  const stillOpen = await page.evaluate(() => G.UI.isOpen('scr-gacha') && !document.activeElement.closest('input'));
  ok(
    saleSearch && ownedSearch && stillOpen,
    tag + ': each search bar narrows its own grid by name, and clearing it restores it'
  );

  // the mouse over an owned square shows its tooltip at once
  await mouseTo('.shop-owned-grid [data-cursor-id]');
  const hoverTip = await page.evaluate(() => {
    const square = document.querySelector('.shop-owned-grid [data-cursor-id]'),
      tip = document.querySelector('.hud-tip');
    return !!tip && tip.textContent.includes(G.Items.BY[square.dataset.cursorId.slice(4)].name);
  });
  ok(hoverTip, tag + ': the mouse over an owned square shows its tooltip naming the item');

  // too poor: every card Buy is disabled, its label still shows the price, and the arrows never land on one; by keys,
  // resting on an owned square shows its tooltip only after the Tooltip Delay setting (1 s)
  await page.mouse.move(5, 5);
  await setSaveItems({ coins: 0 });
  await page.evaluate(() => G.Settings.set('cursorTooltipDelay', 1));
  await page.keyboard.press('Shift');
  await sleep(100);
  items = await itemsNow();
  const visits = [];
  for (const key of [
    'ArrowRight',
    'ArrowDown',
    'ArrowLeft',
    'ArrowLeft',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowDown',
  ])
    visits.push(await arrowKey(key));
  ok(
    items.cards.every((card) => card.disabled && Number(card.label.replace(/\D/g, '')) > 0) &&
      !visits.some((id) => id.startsWith('sale-')) &&
      visits.some((id) => id.startsWith('own-')) &&
      visits.some((id) => id === 'shop-inventory' || id === 'shop-exit'),
    tag +
      ': unaffordable card Buys keep their price, are disabled and the arrows skip them (' +
      visits.join(' > ') +
      ')'
  );
  const tipShown = () => page.evaluate(() => !!document.querySelector('.hud-tip'));
  if (!(await shown()).cursorOn.startsWith('own-')) await arrowKey('ArrowUp'); // from Inventory, up into the owned grid
  const restingOn = (await shown()).cursorOn;
  const tipEarly = await tipShown();
  await sleep(1300);
  const tipLate = await page.evaluate((id) => {
    const tip = document.querySelector('.hud-tip');
    return !!tip && tip.textContent.includes(G.Items.BY[id.slice(4)].name);
  }, restingOn);
  ok(
    restingOn.startsWith('own-') && !tipEarly && tipLate,
    tag + ': by keys an owned square shows its tooltip only after the Tooltip Delay (1 s)'
  );

  // 149c feel-test fixes (Jess 2026-11-17): the cursor's corners on an owned square stay inside its scroll box; the
  // movement keys move the cursor as the arrows do; a key move onto a card's Buy scrolls the whole card into view while
  // the pane itself never scrolls (search bars and the owned panel unclipped); the sale grid and its bar end level with
  // the bottom of Inventory and Exit
  const cornersInside = await page.evaluate(() => {
    const corners = [...document.querySelectorAll('.shop-owned-grid .hud-cursor')],
      box = document.querySelector('.shop-owned .hud-scroll-box').getBoundingClientRect();
    return (
      corners.length === 4 &&
      corners.every((corner) => {
        const rect = corner.getBoundingClientRect();
        return rect.left >= box.left && rect.right <= box.right && rect.top >= box.top && rect.bottom <= box.bottom;
      })
    );
  });
  ok(cornersInside, tag + ': the cursor on an owned square shows all four corners inside its scroll box');
  await setSaveItems({ coins: 10000000 });
  await sleep(100);
  const moveKeys = await page.evaluate(() =>
    ['move_left', 'move_up', 'move_right', 'move_down'].map((name) =>
      G.Input.bindingsOf(name).find((code) => code.startsWith('key'))
    )
  );
  const letter = (code) => code.slice(3); // 'keya' -> 'a'
  // the same walk from the same start (a fresh Shop opens with the cursor on Exit), once by arrows, once by movement keys
  const walk = async (keys) => {
    await page.keyboard.press('Escape');
    await sleep(150);
    await page.click('#scr-menu [data-go="gacha"]');
    await sleep(200);
    await page.keyboard.press('Shift');
    const visited = [];
    for (const key of keys) visited.push(await arrowKey(key));
    return visited;
  };
  const byArrows = await walk(['ArrowLeft', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
  const byLetters = await walk([moveKeys[0], moveKeys[1], moveKeys[0], moveKeys[3], moveKeys[2]].map(letter));
  ok(
    moveKeys.every(Boolean) && byArrows.join() === byLetters.join() && new Set(byArrows).size > 1,
    tag + ': the movement keys move the cursor as the arrows do (' + byLetters.join(' > ') + ')'
  );
  for (let step = 0; step < 6; step++) await arrowKey('ArrowLeft');
  let cardInView = true;
  for (let step = 0; step < 4; step++) {
    const id = await arrowKey(letter(moveKeys[3]));
    const view = await page.evaluate((cursorId) => {
      const card = document.querySelector('[data-cursor-id="' + cursorId + '"]').closest('.shop-card'),
        box = card.closest('.hud-scroll-box').getBoundingClientRect(),
        rect = card.getBoundingClientRect();
      return rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1;
    }, id);
    if (!id.startsWith('sale-') || !view) cardInView = false;
  }
  const paneStill = await page.evaluate(() => {
    const pane = document.getElementById('shop-items'),
      paneRect = pane.getBoundingClientRect();
    const inside = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return rect.top >= paneRect.top && rect.left >= paneRect.left;
    };
    return pane.scrollTop === 0 && inside('.shop-sale-search') && inside('.shop-owned') && inside('.shop-owned-search');
  });
  ok(
    cardInView && paneStill,
    tag +
      ': moving down the cards by key shows each whole card; the pane never scrolls (search bars and owned panel unclipped)'
  );
  const bottoms = await page.evaluate(() => {
    const bottom = (selector) => Math.round(document.querySelector(selector).getBoundingClientRect().bottom);
    return {
      list: bottom('.shop-sale .hud-scroll-box'),
      bar: bottom('.shop-sale .hud-scroll-track'),
      exit: bottom('.shop-exit'),
      inventory: bottom('.shop-inventory'),
    };
  });
  ok(
    bottoms.list === bottoms.exit && bottoms.bar === bottoms.exit && bottoms.inventory === bottoms.exit,
    tag +
      ': the sale grid and its bar end level with the bottom of Inventory and Exit (' +
      JSON.stringify(bottoms) +
      ')'
  );

  // second feel-test round (Jess 2026-11-17): at the end of its scroll the last card shows whole; the owned panel's rim
  // sits inside the pane; Up from an area's top item goes to that area's search bar (cursor whole on it), Down comes back
  // into the same grid, and Enter on a search bar starts typing
  const edges = await page.evaluate(() => {
    const box = document.querySelector('.shop-sale .hud-scroll-box');
    box.scrollTop = box.scrollHeight;
    const cards = [...box.querySelectorAll('.shop-card')],
      boxRect = box.getBoundingClientRect(),
      lastRect = cards[cards.length - 1].getBoundingClientRect(),
      pane = document.getElementById('shop-items').getBoundingClientRect(),
      owned = document.querySelector('.shop-owned').getBoundingClientRect();
    box.scrollTop = 0;
    return {
      lastWhole: lastRect.bottom <= boxRect.bottom,
      ownedInside: owned.right <= pane.right - 1 && owned.top >= pane.top,
    };
  });
  ok(
    edges.lastWhole && edges.ownedInside,
    tag + ': the last card shows whole at the end of the scroll; the owned panel sits inside the pane'
  );
  const toTop = async (start) => {
    // from the given area's first item, Up until the cursor stops moving
    let at = start,
      last = '';
    for (let step = 0; step < 6 && at !== last; step++) {
      last = at;
      at = await arrowKey('ArrowUp');
    }
    return at;
  };
  await walk([]); // a fresh Shop: the cursor on Exit, the grids at the top
  await arrowKey('ArrowLeft'); // Inventory
  const ownedStart = await arrowKey('ArrowUp'); // into the owned grid
  const ownedTop = await toTop(ownedStart);
  const ownedBack = await arrowKey('ArrowDown');
  const firstCardBuy = await page.evaluate(
    () => document.querySelector('.shop-card [data-cursor-id]').dataset.cursorId
  );
  let saleTop = '';
  for (let step = 0; step < 6 && saleTop !== firstCardBuy; step++) saleTop = await arrowKey('ArrowLeft');
  saleTop = await toTop(saleTop);
  // on a search bar the cursor shows no corners, only the bar's green rim
  const searchLook = await page.evaluate(
    () =>
      !document.querySelector('#scr-gacha .hud-cursor') &&
      getComputedStyle(document.querySelector('.shop-sale-search')).borderTopColor === 'rgb(56, 208, 48)'
  );
  // Up goes to the row above even when that row is scrolled out of sight; the search bar only from the top row
  const saleBack = await arrowKey('ArrowDown');
  await arrowKey('ArrowDown');
  const thirdRow = await arrowKey('ArrowDown');
  const upFromThird = await arrowKey('ArrowUp');
  const upFromSecond = await arrowKey('ArrowUp');
  const upFromFirst = await arrowKey('ArrowUp');
  ok(
    thirdRow.startsWith('sale-') &&
      upFromThird.startsWith('sale-') &&
      upFromSecond === saleBack &&
      upFromFirst === 'search-sale',
    tag +
      ': Up goes row by row (' +
      [thirdRow, upFromThird, upFromSecond, upFromFirst].join(' > ') +
      '), the search bar only from the top row'
  );
  await page.keyboard.press('Enter');
  await sleep(100);
  const typing = await page.evaluate(() => document.activeElement.classList.contains('shop-sale-search'));
  await page.keyboard.press('Escape');
  await sleep(100);
  ok(
    ownedStart.startsWith('own-') && ownedTop === 'search-owned' && ownedBack.startsWith('own-'),
    tag +
      ": Up from the owned grid's top row goes to its search bar, Down comes back (" +
      [ownedStart, ownedTop, ownedBack].join(' > ') +
      ')'
  );
  ok(
    saleTop === 'search-sale' && searchLook && saleBack.startsWith('sale-') && typing,
    tag +
      ': Up from the top cards goes to the sale search bar (its green rim, no corners), Down comes back, Enter there starts typing'
  );

  // 149b: the Character Upgrades pocket cards, read from the drawn page and the save
  await page.click('.shop-tab[data-tab="upgrades"]');
  await sleep(100);
  const pocketsNow = () =>
    page.evaluate(() => {
      const read = (key, owned, max) => {
        const grid = document.querySelector('.shop-pocket-grid[data-pocket="' + key + '"]');
        const squares = grid ? [...grid.querySelectorAll('.hud-grid-slot')] : [];
        const button = document.querySelector('[data-action="buy-' + key + '"]');
        return {
          owned,
          max,
          lit: squares.filter((square) => !square.classList.contains('is-locked')).length,
          total: squares.length,
          label: button ? button.textContent.trim() : '',
          disabled: !button || button.disabled,
        };
      };
      const save = G.DB.save;
      return {
        coins: save.coins,
        berry: read('berry', G.Grounds.berrySlots(save), G.Grounds.BERRY_SLOTS_MAX),
        item: read('item', G.Items.runSlots(save), G.Items.RUN_SLOTS_MAX),
      };
    });
  const POCKET_KEYS = ['berry', 'item'];
  const priceOn = (label) => Number(label.replace(/\D/g, ''));
  const gridsMatch = (pockets) =>
    POCKET_KEYS.every((key) => pockets[key].lit === pockets[key].owned && pockets[key].total === pockets[key].max);
  const setSave = (fields) =>
    page.evaluate((values) => {
      Object.assign(G.DB.save, values);
      G.DB.commit(true);
    }, fields);
  await setSave({ berrySlots: 1, runSlots: 1, coins: 10000000 });
  await sleep(100);
  let pockets = await pocketsNow();
  ok(gridsMatch(pockets), tag + ': each pocket grid lights one square per slot owned, dimmed up to the cap');

  // a Buy on each pocket: one more slot and one more lit square, for the price its label showed
  let buysRight = true;
  for (const key of POCKET_KEYS) {
    const before = await pocketsNow();
    await page.click('[data-action="buy-' + key + '"]');
    await clickConfirm();
    const after = await pocketsNow();
    if (!(
      after[key].owned === before[key].owned + 1 &&
      after[key].lit === before[key].lit + 1 &&
      before.coins - after.coins === priceOn(before[key].label) &&
      gridsMatch(after)
    ))
      buysRight = false;
  }
  ok(buysRight, tag + ': a pocket Buy adds one slot and one lit square for the price its label shows');

  // keys: the arrows step Berry Buy, Team Items Buy, Exit (no wrap); Enter on a Buy asks first
  await page.keyboard.press('Shift');
  await sleep(50);
  const arrow = arrowKey;
  const arrowWalk = [];
  for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowDown'])
    arrowWalk.push(await arrow(key));
  ok(
    arrowWalk.join() === 'shop-exit,buy-item,buy-berry,buy-berry,buy-item,shop-exit',
    tag + ': the arrows step Berry Buy, Team Items Buy and Exit (' + arrowWalk.join(' > ') + ')'
  );
  await arrow('ArrowLeft');
  await arrow('ArrowLeft');
  const coinsBeforeEnter = (await pocketsNow()).coins;
  await page.keyboard.press('Enter');
  await sleep(150);
  const enterAsks = await page.evaluate(() => G.UI.isOpen('scr-ask'));
  if (enterAsks) await page.click('#ask-no');
  await sleep(150);
  ok(
    enterAsks && (await pocketsNow()).coins === coinsBeforeEnter,
    tag + ': Enter on a Buy asks first; No spends nothing'
  );

  // a full pocket reads Full and cannot be pressed; the arrows skip it
  await setSave({ berrySlots: 99 });
  await sleep(100);
  pockets = await pocketsNow();
  const skipsFull = (await arrow('ArrowLeft')) === 'buy-item' && (await arrow('ArrowLeft')) === 'buy-item';
  ok(
    pockets.berry.owned === pockets.berry.max && pockets.berry.label === 'Full' && pockets.berry.disabled && skipsFull,
    tag + ': a full pocket reads Full, is disabled, and the arrows skip it'
  );

  // too poor: both Buys disabled with their price still shown, cannot take focus, and the cursor stays on Exit
  await setSave({ berrySlots: 1, coins: 0 });
  await sleep(100);
  pockets = await pocketsNow();
  const poor = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('.shop-buy button')];
    buttons.forEach((button) => button.focus());
    return buttons.includes(document.activeElement);
  });
  const stuckOnExit = (await arrow('ArrowRight')) === 'shop-exit' && (await arrow('ArrowLeft')) === 'shop-exit';
  ok(
    POCKET_KEYS.every((key) => pockets[key].disabled && priceOn(pockets[key].label) > 0) && !poor && stuckOnExit,
    tag + ': an unaffordable Buy shows its price, is disabled, cannot take focus, and the cursor stays on Exit'
  );

  // keys: Q is the tab above (Character Upgrades to Pokeballs), E the one below; the tabs never take the cursor, which
  // sits on Exit, and Enter there leaves
  await page.keyboard.press('q');
  await sleep(100);
  now = await shown();
  const qPicked = now.selected.join() === 'balls' && now.panes.join() === 'shop-balls';
  await page.keyboard.press('e');
  await sleep(100);
  now = await shown();
  const ePicked = now.selected.join() === 'upgrades' && now.panes.join() === 'shop-upgrades';
  const onExit = now.cursorOn.includes('shop-exit') && !(await page.$('.shop-tab .hud-cursor'));
  await page.keyboard.press('Enter');
  await sleep(200);
  now = await shown();
  ok(qPicked && ePicked, tag + ': Q and E switch to the tab above and below');
  ok(onExit && !now.shop && now.menu, tag + ': no tab takes the cursor; it sits on Exit, and Enter there leaves');
  await page.click('#scr-menu [data-go="gacha"]');
  await sleep(200);
  await page.keyboard.press('Escape');
  await sleep(200);
  now = await shown();
  ok(!now.shop && now.menu, tag + ': Esc leaves the Shop for the Main Menu');
  await page.click('#scr-menu [data-go="gacha"]');
  await sleep(200);
  await page.click('.shop-tab[data-tab="items"]');
  await sleep(100);
  const inventoryOpen = () =>
    page.evaluate(() => G.UI.isOpen('scr-inventory') && !G.UI.isOpen('scr-gacha') && G.UI.isOpen('scr-menu'));
  // by keys (Jess 2026-11-17: Enter there closed the Shop and the Inventory never showed), then by mouse
  await page.hover('.shop-inventory button');
  await page.keyboard.press('Enter');
  await sleep(200);
  const byKeys = await inventoryOpen();
  await page.evaluate(() => G.GachaUI.open());
  await sleep(200);
  await page.click('.shop-inventory button');
  await sleep(200);
  ok(
    byKeys && (await inventoryOpen()),
    tag + ': Inventory, by Enter or a click, leaves the Shop for the Inventory screen'
  );
  ok(
    errs.length === 0,
    tag + ': no console or page errors' + (errs.length ? '\n        ' + errs.slice(0, 5).join('\n        ') : '')
  );
  await page.close();
}

// ---- the Main Menu Inventory (#149d): cards of the unlocked team items with Equip / Unequip / Swap, the four slot panels,
// the swap pick, one Stone, search, Shop and Exit. Relations only: what the save holds against what is drawn. ----
async function inventoryFlow(browser, query, tag) {
  const { page, errs } = await boot(browser, query);
  // every team item unlocked; a loadout and a slot count set per check, then the Inventory opened again
  const setUp = (runSlots, loadout) =>
    page.evaluate(
      (slotSetup) => {
        if (!document.getElementById('tap-start').classList.contains('hidden'))
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        const save = G.DB.save;
        for (const item of G.Items.LIST) if (item.tier === 'run') G.Items.unlock(save, item.id);
        save.runSlots = slotSetup.runSlots;
        save.teamLoadout = slotSetup.loadout;
        G.MenuUI.open();
        G.InventoryUI.open();
      },
      { runSlots, loadout }
    );
  const shown = () =>
    page.evaluate(() => {
      const corner = document.querySelector('#scr-inventory .hud-cursor'),
        cornerHost = corner && corner.closest('[data-cursor-id]'),
        swapLine = document.querySelector('#scr-inventory .inv-swap-line'),
        toast = document.querySelector('.toast');
      return {
        inventory: G.UI.isOpen('scr-inventory'),
        shop: G.UI.isOpen('scr-gacha'),
        menu: G.UI.isOpen('scr-menu'),
        loadout: G.DB.save.teamLoadout.slice(),
        runSlots: G.Items.runSlots(G.DB.save),
        cards: [...document.querySelectorAll('#scr-inventory .shop-card')].map((card) => ({
          id: card.dataset.item,
          name: card.querySelector('.shop-card-name').textContent.trim(),
          label: card.querySelector('.hud-team-button').textContent.trim(),
          disabled: card.querySelector('.hud-team-button').disabled,
        })),
        slots: [...document.querySelectorAll('#scr-inventory .inv-slots .hud-run-item')].map((slot) => ({
          dimmed: slot.classList.contains('is-dimmed'),
          name: (slot.querySelector('.hud-run-name') || { textContent: '' }).textContent.trim(),
        })),
        cursorOn: (cornerHost && cornerHost.dataset.cursorId) || '',
        swapLine: swapLine ? swapLine.textContent.trim() : '',
        toast: toast && toast.style.display !== 'none' ? toast.textContent : '',
        teamItems: G.Items.LIST.filter((item) => item.tier === 'run').length,
        unlocked: G.Items.LIST.filter((item) => item.tier === 'run' && G.Items.unlocked(G.DB.save, item.id)).length,
        slotCap: G.Items.RUN_SLOTS_MAX,
        stones: G.Items.LIST.filter((item) => item.tier === 'run' && item.group === 'stone').map((item) => item.id),
        plain: G.Items.LIST.filter((item) => item.tier === 'run' && !item.group).map((item) => item.id),
      };
    });
  const cardOf = (view, id) => view.cards.find((card) => card.id === id);
  const buttonOf = (id) => `#scr-inventory [data-cursor-id="item-${id}"]`;
  /** Puts the keys' cursor on a card's button (the mouse over it makes it the keys' starting point), then a key press. */
  const keyOn = async (id, key) => {
    await page.hover(buttonOf(id));
    await page.keyboard.press(key);
    await sleep(150);
  };

  await setUp(3, []);
  await sleep(300);
  let view = await shown();
  const { plain, stones } = view;
  ok(
    view.inventory && view.menu && view.cards.length === view.unlocked && view.cards.length > 0,
    tag + ': the Inventory opens over the Main Menu with one card per unlocked team item'
  );
  ok(
    view.slots.length === view.slotCap && view.slots.filter((slot) => !slot.dimmed).length === view.runSlots,
    tag + ': the slot panels: one lit per bought slot, dimmed up to the cap'
  );

  // a gap below a filled slot: Equip lands in the lowest empty slot, the card then reads Unequip
  await setUp(3, [null, plain[0]]);
  await sleep(200);
  await page.click(buttonOf(plain[1]) + ' button');
  await sleep(200);
  view = await shown();
  ok(
    view.loadout[0] === plain[1] &&
      view.loadout[1] === plain[0] &&
      cardOf(view, plain[1]).label === 'Unequip' &&
      view.slots[0].name === cardOf(view, plain[1]).name,
    tag +
      ': Equip fills the lowest empty slot (slot 1 under a filled slot 2), the save holds it, its card reads Unequip'
  );
  await page.click(buttonOf(plain[1]) + ' button');
  await sleep(200);
  view = await shown();
  ok(
    !view.loadout[0] && view.loadout[1] === plain[0] && cardOf(view, plain[1]).label === 'Equip',
    tag + ': Unequip empties only that slot'
  );
  await page.click('#scr-inventory .inv-slots [data-slot="1"]');
  await sleep(200);
  view = await shown();
  ok(!view.loadout.includes(plain[0]), tag + ': pressing a filled slot unequips its item');

  // every bought slot full: the other cards read Swap, can be pressed, and the cursor reaches them
  await setUp(2, [plain[0], plain[1]]);
  await sleep(200);
  view = await shown();
  const others = view.cards.filter((card) => !view.loadout.includes(card.id));
  await keyOn(plain[2], 'ArrowDown'); // a key moves off and back: the cursor takes the Swap buttons
  await page.keyboard.press('ArrowUp');
  await sleep(150);
  const reachable = (await shown()).cursorOn.startsWith('item-');
  ok(
    others.every((card) => card.label === 'Swap' && !card.disabled) && reachable,
    tag + ': with every bought slot full the other cards read Swap, are pressable, and the cursor reaches them'
  );

  // Swap by keys: the line shows, the cursor goes to slot 1; Down and Enter swap with slot 2
  await keyOn(plain[2], 'Enter');
  view = await shown();
  const swapStarted = view.swapLine === 'Select a slot to swap.' && view.cursorOn === 'slot-0';
  await page.keyboard.press('ArrowDown');
  await sleep(150);
  await page.keyboard.press('Enter');
  await sleep(200);
  view = await shown();
  ok(
    swapStarted &&
      view.loadout[0] === plain[0] &&
      view.loadout[1] === plain[2] &&
      !view.loadout.includes(plain[1]) &&
      cardOf(view, plain[1]).label !== 'Unequip' &&
      !view.swapLine,
    tag +
      ': Swap by keys shows "Select a slot to swap.", the cursor starts on slot 1, Enter on a slot swaps the two items'
  );

  // Esc cancels: nothing changes, the cursor goes back to that Swap, the Inventory stays open
  const beforeEscape = view.loadout.join();
  await keyOn(plain[3], 'Enter');
  await page.keyboard.press('Escape');
  await sleep(200);
  view = await shown();
  ok(
    view.inventory && !view.swapLine && view.loadout.join() === beforeEscape && view.cursorOn === 'item-' + plain[3],
    tag + ': Esc cancels a swap: the loadout is unchanged and the cursor returns to the Swap'
  );

  // Swap by mouse: click Swap, then a slot; a click anywhere else cancels
  await page.click(buttonOf(plain[3]) + ' button');
  await sleep(150);
  await page.click('#scr-inventory .inv-search');
  await sleep(150);
  view = await shown();
  const mouseCancelled = !view.swapLine && view.loadout.join() === beforeEscape;
  await page.click(buttonOf(plain[3]) + ' button');
  await sleep(150);
  await page.click('#scr-inventory .inv-slots [data-slot="0"]');
  await sleep(200);
  view = await shown();
  ok(
    mouseCancelled && view.loadout[0] === plain[3] && !view.loadout.includes(plain[0]),
    tag + ': with the mouse a click elsewhere cancels a swap, and a click on a slot swaps'
  );

  // one slot bought: Swap swaps with it at once, no slot pick (Jess 2026-11-17)
  await setUp(1, [plain[0]]);
  await sleep(200);
  view = await shown();
  const oneSlotLabel = cardOf(view, plain[1]).label;
  await keyOn(plain[1], 'Enter');
  view = await shown();
  ok(
    oneSlotLabel === 'Swap' && !view.swapLine && view.loadout.join() === plain[1],
    tag + ': with one slot bought, Swap swaps with it at once (no slot pick)'
  );

  // one Stone: a second Stone's Swap goes straight to the first Stone's slot, with the toast
  await setUp(2, [plain[0], stones[0]]);
  await sleep(200);
  await keyOn(stones[1], 'Enter');
  view = await shown();
  ok(
    !view.swapLine &&
      view.loadout[1] === stones[1] &&
      view.loadout.filter((id) => stones.includes(id)).length === 1 &&
      view.toast === 'Can only have One Stone equipped.',
    tag + ': a second Stone takes the first Stone\'s slot, no slot pick, and toasts "Can only have One Stone equipped."'
  );

  // search: narrows to names holding the text; clearing restores every card
  const searchText = view.cards[0].name.slice(0, 3).toLowerCase();
  await page.fill('#scr-inventory .inv-search', searchText);
  await sleep(150);
  const narrowed = (await shown()).cards;
  await page.fill('#scr-inventory .inv-search', '');
  await sleep(150);
  await page.keyboard.press('Escape'); // gives the keys back to the cursor (the search box keeps its Esc)
  await sleep(100);
  ok(
    narrowed.length > 0 &&
      narrowed.length <= view.cards.length &&
      narrowed.every((card) => card.name.toLowerCase().includes(searchText)) &&
      (await shown()).cards.length === view.cards.length,
    tag + ': the search bar narrows the cards by name, and clearing it restores them'
  );

  // the layout (Jess 2026-11-17): no frame inside the window; the cards and slots sit in the window itself, and Exit sits
  // where the Shop's Exit does
  const inventoryLayout = await page.evaluate(() => {
    const windowRect = document.getElementById('inv-window').getBoundingClientRect(),
      inside = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return (
          rect.left >= windowRect.left &&
          rect.right <= windowRect.right &&
          rect.top >= windowRect.top &&
          rect.bottom <= windowRect.bottom
        );
      },
      exit = document.querySelector('#scr-inventory [data-action="inv-exit"]').getBoundingClientRect();
    return {
      framed: !!document.querySelector('#scr-inventory .inv-frame, #scr-inventory .shop-owned'),
      inside: inside('.inv-cards') && inside('.inv-slots') && inside('[data-action="inv-shop"]'),
      exit: [exit.left - windowRect.left, exit.top - windowRect.top].map(Math.round).join(),
    };
  });
  // Shop by keys, then the Shop's Exit measured in its own window
  await page.hover('#scr-inventory [data-action="inv-shop"]');
  await page.keyboard.press('Enter');
  await sleep(200);
  view = await shown();
  const shopExit = await page.evaluate(() => {
    const windowRect = document.querySelector('#scr-gacha .shop-window').getBoundingClientRect(),
      exit = document.querySelector('[data-action="shop-exit"]').getBoundingClientRect();
    return [exit.left - windowRect.left, exit.top - windowRect.top].map(Math.round).join();
  });
  ok(
    !inventoryLayout.framed && inventoryLayout.inside && inventoryLayout.exit === shopExit,
    tag +
      ": no frame inside the window; cards, slots and Shop sit in it; Exit sits where the Shop's does (" +
      inventoryLayout.exit +
      ' / ' +
      shopExit +
      ')'
  );
  const shopTab = await page.evaluate(() =>
    [...document.querySelectorAll('.shop-tab.is-selected')].map((t) => t.dataset.tab)
  );
  ok(
    view.shop && !view.inventory && view.menu && shopTab.join() === 'items',
    tag + ': Shop, by Enter, leaves the Inventory for the Shop on Team Items, over the Main Menu'
  );
  await page.evaluate(() => G.InventoryUI.open());
  await sleep(200);
  await page.keyboard.press('Escape');
  await sleep(200);
  view = await shown();
  ok(!view.inventory && view.menu, tag + ': Esc with no swap open leaves the Inventory for the Main Menu');
  await page.evaluate(() => G.InventoryUI.open());
  await sleep(200);
  await page.click('#scr-inventory [data-action="inv-exit"]');
  await sleep(200);
  view = await shown();
  ok(!view.inventory && !view.shop && view.menu, tag + ': Exit returns to the Main Menu');
  ok(
    errs.length === 0,
    tag + ': no console or page errors' + (errs.length ? '\n        ' + errs.slice(0, 5).join('\n        ') : '')
  );
  await page.close();
}

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
    await catchFlow(browser, '?dev', 'catch');
    await shopFlow(browser, '?dev', 'shop');
    await inventoryFlow(browser, '?dev', 'inventory');
  } catch (e) {
    fail++;
    console.log('FAIL  crashed: ' + ((e && e.stack) || e));
  }
  await browser.close();
  srv.kill();
  console.log(fail ? 'smoke-ui: ' + fail + ' check(s) FAILED' : 'smoke-ui: all checks passed');
  process.exit(fail ? 1 : 0);
})();
