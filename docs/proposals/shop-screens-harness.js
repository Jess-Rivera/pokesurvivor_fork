// Move Shop step 4 (the Move Trainer and TM Mart screens: stock, price, buying, the forget step) offline checks (Node only).
// Usage from the repo root:  node docs/proposals/shop-screens-harness.js .
// Under test, the sim side: js/systems/shops.js (G.Shops.price, offers, check, buy) and js/entities/player.js (addMove's stay option,
// replaceMove) over the REAL move data, pokedex, learnsets, G.Moves, G.TeamCards (the buff test), G.MoveInfo, G.Stats and G.Silver,
// with stubs for the game, audio and effects; plus the lines that wire the screen in (dev.html, js/main.js NEED, js/ui/ui.js SCREENS,
// js/game.js openShop / offerBond / keys). The screen itself (js/ui/shop-ui.js) is DOM, checked by tools/smoke-ui.js and feel-tested.
// Plan: docs/ASCII Concept Maps/Move Shop step 4 - Shop screens.txt sections 1 to 3 and 6 (v3: bonds are FIXED, Jess 2026-11-05);
// spec docs/proposals/move-shop-plan.md. Expected values are hand-derived from the plan and the spec (price = 5 x the whole ENEMY LV x
// the run level; 4 offers; loose moves only in the forget step; 2 buffs at most), never read from the code under test.
// The mutation runner (shop-screens-mutate.js) points the SS_* variables (SRC below) at altered copies; every mutation must make this fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/shops.js': 'SS_SHOPS', 'js/entities/player.js': 'SS_PLAYER', 'js/game.js': 'SS_GAME', 'dev.html': 'SS_DEV',
  'js/main.js': 'SS_MAIN', 'js/ui/ui.js': 'SS_UI' };
const pathOf = p => process.env[SRC[p]] || R + '/' + p;
const read = p => fs.readFileSync(pathOf(p), 'utf8').replace(/\r\n/g, '\n');
const load = p => vm.runInThisContext(read(p), { filename: p });
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // comments off, so a note never trips a guard
const body = (src, head) => { const i = src.indexOf(head); if (i < 0) return ''; const j = src.indexOf('\n  function ', i + head.length); return src.slice(i, j < 0 ? undefined : j); };
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL ' + m); } };

// ---- stubs (G is a proxy: anything not stubbed is a harmless no-op) ----
let seed = 11;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const game = { player: null, roster: [], st: { time: 390 }, openShop: () => true };
const base = {
  U: { clamp: (v, a, b) => Math.max(a, Math.min(b, v)), TYPE_COLOR: new Proxy({}, { get: () => '#888' }),
    pickN: (arr, k) => { const c = arr.slice(), out = []; while (out.length < k && c.length) out.push(c.splice(Math.floor(rnd() * c.length), 1)[0]); return out; } },
  Game: game, Coop: { active: false }, GymArena: { inArena: false }, Audio: { sfx() {} }, FX: { ring() {}, dmgText() {} },
};
global.window = global;
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
const FILES = ['js/core/stats.js'];
for (const m of fs.readFileSync(R + '/dev.html', 'utf8').matchAll(/src="(js\/data\/move-[^"]+|js\/data\/moves-generated\.js)"/g)) FILES.push(m[1]);
FILES.push('js/data/pokedex.js', 'js/data/learnsets.js', 'js/data/moves.js', 'js/systems/team-cards.js', 'js/ui/move-info.js',
  'js/entities/player.js', 'js/systems/silver.js', 'js/data/shop-contact.js', 'js/systems/shops.js');
for (const p of FILES) { try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } }
const S = G.Shops, Sv = G.Silver, M = G.Moves, isBuff = G.MoveInfo.isBuff;

// a team member: a REAL Player prototype on a hand-built body (pattern: move-persist-harness.js)
const mkF = (dex, groups, o = {}) => {
  const f = Object.assign(Object.create(G.Player.prototype), { dex, mon: G.DEX_BY[dex], dead: false, benched: false, level: 12, maxMoves: 4,
    bind: null, item: null, runItems: [], swapT: 0, x: 0, y: 0, r: 10, bodyH: 20, active: 0 }, o);
  f.slots = groups.map(g => g.map(id => M.instance(id)));
  f.moves = f.slots.flat();
  return f;
};
const ids = f => f.slots.map(g => g.map(m => m.id).join('+')).join(',');
const trainer = () => ({ kind: 'trainer', stock: new Map(), tms: null });
const mart = () => ({ kind: 'mart', stock: new Map(), tms: null });
const near = (a, b) => Math.abs(a - b) < 1e-9;
const lead = mkF(25, [['thunder-shock']]);
game.player = lead; game.roster = [lead];

// 0. data preconditions (the cases below lean on them)
{ const need = ['thunder-shock', 'quick-attack', 'tackle', 'swift', 'thunderbolt', 'volt-tackle', 'fly', 'growl', 'tail-whip', 'ember',
    'dragon-claw', 'fire-blast', 'earthquake', 'flamethrower', 'swords-dance', 'agility', 'harden', 'vine-whip', 'water-gun', 'leer'];
  const miss = need.filter(id => !G.MoveDefs[id]);
  ok(!miss.length, 'every move the cases use is a live move: ' + miss);
  ok(isBuff('swords-dance') && isBuff('agility') && isBuff('harden'), 'Swords Dance, Agility and Harden are buffs (the 2-buff cases)');
  ok(!isBuff('thunderbolt') && !isBuff('thunder-shock'), 'Thunderbolt and Thunder Shock are not buffs'); }

// 1. price: 5 x the whole ENEMY LV (1 + 49 t / 1800, rounded down) x the run level
{ ok(S.price(120, 5) === 100, '2:00, ENEMY LV 4, level 5: 100 (' + S.price(120, 5) + ')');
  ok(S.price(120, 8) === 160, '2:00, ENEMY LV 4, level 8: 160 (' + S.price(120, 8) + ')');
  ok(S.price(390, 12) === 660, '6:30, ENEMY LV 11, level 12: 660 (' + S.price(390, 12) + ')');
  ok(S.price(600, 18) === 1530, '10:00, ENEMY LV 17, level 18: 1,530 (' + S.price(600, 18) + ')'); }

// 2. Trainer stock: 4 from the member's pool, none it knows, the same 4 on reopen, a bought move leaves it
{ Sv.set(100000);
  const q = mkF(25, [['thunder-shock']]), shop = trainer(), pool = M.poolFor(q.mon);
  const o1 = S.offers(shop, q);
  ok(o1.length === 4 && o1.every(id => pool.includes(id)) && !o1.some(id => q.hasMove(id)), 'Pikachu is offered 4 moves from its pool, none it knows: ' + o1);
  ok(S.offers(shop, q).join() === o1.join(), 'reopening shows the same 4 (rolled once per building)');
  ok(S.buy(shop, q, o1[0]) && S.offers(shop, q).length === 3 && !S.offers(shop, q).includes(o1[0]), 'a bought move leaves the stock');
  const k = mkF(129, []), kp = M.poolFor(k.mon);
  const k2 = mkF(129, [[kp[0]], [kp[1]]]);
  ok(kp.length === 4 && S.offers(trainer(), k2).length === 2, 'Magikarp (pool of 4) knowing 2 of them is offered the other 2');
  ok(S.offers(trainer(), k2).every(id => id !== kp[0] && id !== kp[1]), 'and never the 2 it knows');
  const other = mkF(4, [['ember']]);
  ok(S.offers(shop, other).every(id => M.poolFor(other.mon).includes(id)), 'each member has its own stock from its own pool'); }

// 3. TM Mart: 4 from the TM list, the same on reopen, never sold out, who can learn
{ const shop = mart(), t1 = S.offers(shop), list = M.tmList();
  ok(t1.length === 4 && t1.every(id => list.includes(id)), 'the Mart offers 4 TMs from the TM list: ' + t1);
  ok(S.offers(shop).join() === t1.join(), 'the same 4 on reopen');
  const m = mart(); m.tms = ['dragon-claw', 'fire-blast', 'earthquake', 'thunderbolt'];
  const ch = mkF(4, [['ember']]), bu = mkF(1, [['vine-whip']]);
  ok(S.check(m, ch, 'dragon-claw').ok, 'Charmander can learn the Dragon Claw TM');
  ok(S.check(m, bu, 'fire-blast').why === "Can't learn", "Bulbasaur can't learn Fire Blast: " + S.check(m, bu, 'fire-blast').why);
  ok(S.check(m, ch, 'flamethrower').why === 'Not sold here', 'a TM this Mart does not stock is not sold');
  ok(S.buy(m, ch, 'dragon-claw') && S.offers(m).includes('dragon-claw') && S.check(m, mkF(4, [['ember']]), 'dragon-claw').ok,
    'a TM is never sold out: another Charmander can still buy it');
  ok(S.check(m, ch, 'dragon-claw').why === 'Knows it', 'a member that knows it is marked'); }

// 4. buying with a free slot: paid, learned, the active slot unchanged
{ Sv.set(10000); game.st.time = 390;
  const p = mkF(25, [['thunder-shock'], ['quick-attack']], { active: 1 }), shop = trainer();
  shop.stock.set(p, ['thunderbolt', 'volt-tackle', 'swift', 'growl']);
  const was = p.slots[1];
  ok(S.buy(shop, p, 'thunderbolt'), 'buys Thunderbolt');
  ok(near(Sv.amount, 9340), 'Silver down by the price, 10,000 - 660 = 9,340: ' + Sv.amount);
  ok(p.hasMove('thunderbolt') && p.slots.length === 3 && p.slots[2][0].id === 'thunderbolt', 'learned into a new slot');
  ok(p.active === 1 && p.slots[1] === was, 'the active slot did not change (index and group)');
  ok(S.offers(shop, p).join() === 'volt-tackle,swift,growl', 'the stock lost it: ' + S.offers(shop, p)); }

// 5. short of Silver: refused, nothing changes
{ Sv.set(659); game.st.time = 390;
  const p = mkF(25, [['thunder-shock']]), shop = trainer(); shop.stock.set(p, ['thunderbolt']);
  ok(S.check(shop, p, 'thunderbolt').why === "Can't afford", "659 Silver for a 660 move: can't afford");
  ok(!S.buy(shop, p, 'thunderbolt') && near(Sv.amount, 659) && ids(p) === 'thunder-shock', 'the buy is refused and nothing changes'); }

// 6. full slots: the forget step, loose moves only (bonds are fixed)
{ Sv.set(10000); game.st.time = 390;
  const p = mkF(25, [['thunder-shock'], ['quick-attack'], ['fly'], ['tackle']]), shop = trainer(); shop.stock.set(p, ['thunderbolt']);
  const c = S.check(shop, p, 'thunderbolt');
  ok(c.ok && c.forget && c.allowed.join() === '0,1,2,3', 'four loose moves: the forget step, every slot may go (' + c.allowed + ')');
  const before = ids(p);
  ok(ids(p) === before && near(Sv.amount, 10000), 'looking (the forget step open) changes nothing');
  ok(!S.buy(shop, p, 'thunderbolt') && ids(p) === before && near(Sv.amount, 10000), 'no slot picked (Cancel): nothing bought, nothing paid');
  ok(S.buy(shop, p, 'thunderbolt', 2), 'forget Fly (a skill is a loose move) for Thunderbolt');
  ok(ids(p) === 'thunder-shock,quick-attack,thunderbolt,tackle' && !p.hasMove('fly') && p.moves.length === 4, 'Thunderbolt takes slot 3 exactly: ' + ids(p));
  ok(p.active === 0 && near(Sv.amount, 9340), 'the active slot stays, the price is paid, no refund for the forgotten move: ' + Sv.amount);
  const b = mkF(25, [['thunder-shock'], ['quick-attack', 'tackle'], ['swift'], ['growl']]), sb = trainer(); sb.stock.set(b, ['thunderbolt']);
  const cb = S.check(sb, b, 'thunderbolt');
  ok(cb.ok && cb.forget && cb.allowed.join() === '0,2,3', 'a bond slot is not on the forget list (bonds are fixed): ' + cb.allowed);
  const bb = ids(b);
  ok(!S.buy(sb, b, 'thunderbolt', 1) && ids(b) === bb && near(Sv.amount, 9340), 'picking the bond slot is refused, nothing changes');
  ok(!b.replaceMove('tackle', 'thunderbolt') && !b.replaceMove('quick-attack', 'thunderbolt') && ids(b) === bb, 'replaceMove never touches a bonded move');
  const all = mkF(25, [['thunder-shock', 'quick-attack'], ['tackle', 'swift'], ['growl', 'tail-whip'], ['leer', 'ember']]), sa = trainer();
  sa.stock.set(all, ['thunderbolt']);
  ok(S.check(sa, all, 'thunderbolt').why === 'Every slot is bonded', 'all 4 slots bonded: that member cannot buy');
  const fr = mkF(25, [['thunder-shock']]); sa.stock.set(fr, ['thunderbolt']);
  ok(S.check(sa, fr, 'thunderbolt').ok, 'another member still can'); }

// 7. the 2-buff limit: a third buff refused, a buff may replace a buff
{ Sv.set(10000); game.st.time = 390;
  const w = mkF(25, [['swords-dance'], ['agility'], ['thunder-shock']]), shop = trainer(); shop.stock.set(w, ['harden', 'thunderbolt']);
  const c = S.check(shop, w, 'harden');
  ok(c.ok && c.forget && c.allowed.join() === '0,1', 'two buffs, a third offered: only a buff may be forgotten (' + c.allowed + ')');
  ok(S.check(shop, w, 'thunderbolt').ok && !S.check(shop, w, 'thunderbolt').forget, 'an attack still goes into the free slot');
  ok(!S.buy(shop, w, 'harden', 2) && !w.hasMove('harden'), 'a third buff in place of an attack is refused');
  ok(S.buy(shop, w, 'harden', 0) && w.hasMove('harden') && !w.hasMove('swords-dance') && w.moves.filter(m => isBuff(m.id)).length === 2, 'Harden replaces Swords Dance: still 2 buffs'); }

// 8. a fainted member cannot shop
{ Sv.set(10000);
  const d = mkF(25, [['thunder-shock']], { dead: true }), shop = trainer(); shop.stock.set(d, ['thunderbolt']);
  ok(S.check(shop, d, 'thunderbolt').why === 'Fainted' && !S.buy(shop, d, 'thunderbolt') && near(Sv.amount, 10000), 'fainted: refused, nothing paid'); }

// 9. addMove: level-up cards still switch to the new move, a purchase (stay) does not
{ const x = mkF(25, [['thunder-shock'], ['quick-attack']]);
  ok(x.addMove('thunderbolt') && x.active === 2, 'addMove (a level-up card) switches to the new move, as before');
  ok(x.addMove('swift', true) && x.active === 2 && x.slots.length === 4, 'addMove with stay keeps the active slot'); }

// 10. wiring
{ const html = read('dev.html'), b = html.indexOf('<!-- scripts:begin -->'), e = html.indexOf('<!-- scripts:end -->');
  const at = f => html.indexOf('src="' + f + '"'), su = at('js/ui/shop-ui.js');
  ok(/<section id="scr-shop"/.test(html), 'dev.html has the shop screen');
  ok(su > b && su < e && at('js/ui/ui.js') < su && su < at('js/game.js'), 'dev.html loads shop-ui.js inside the build block, after ui.js and before game.js');
  ok(/NEED = \[[^\]]*'ShopUI'/.test(read('js/main.js')), 'main.js lists ShopUI in the NEED array');
  ok(/const SCREENS = \[[^\]]*'scr-shop'/.test(code(read('js/ui/ui.js'))), 'ui.js lists scr-shop, so hideAll closes it');
  const sh = code(read('js/systems/shops.js'));
  ok(/function enter\(s\) \{\s*return G\.Game\.openShop\(s\);/.test(sh) && !/opens soon/.test(sh), 'shops.js: entering opens the screen, no notice');
  const g = code(read('js/game.js')), op = body(g, 'function openShop(');
  ok(/state !== 'playing'/.test(op) && ['scr-bond', 'scr-pause', 'scr-item', 'scr-levelup'].every(s => op.includes("'" + s + "'")),
    'game.js: openShop never opens over another screen');
  ok(/state = 'choice'/.test(op), 'game.js: the shop pauses the run');
  ok(body(g, 'function offerBond(').includes("'scr-shop'"), 'game.js: an open shop holds back the bond screen');
  ok(/G\.UI\.isOpen\('scr-shop'\)\) \{\s*G\.ShopUI\.keys\(\);/.test(g), 'game.js: the keys go to the shop screen while it is open');
  ok(/^\s*openShop,/m.test(g), 'game.js: G.Game.openShop is exported'); }

console.log(fail ? 'shop screens: ' + fail + ' of ' + n + ' checks FAILED' : 'shop screens: all ' + n + ' checks passed');
process.exitCode = fail ? 1 : 0;
