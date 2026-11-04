// Pokebox step 3a-2 offline checks for the gacha, the biggest copy source (Node only). Usage from the repo root:
//   node docs/proposals/pokebox-sources-harness.js .
// Real js/systems/gacha.js, js/core/db.js, js/systems/copies.js and js/data/species-traits.js, with a small stub Pokedex, seeded
// randomness and a fake localStorage. Expected values are hand-derived from the 3a-2 map (docs/ASCII Concept Maps/Pokebox 3a-2 -
// Copies at the Source.txt, D1 and D2) and the gacha rules in gacha.js's header, not read back from code output.
// The rescue, wild shiny, starter and debug sources are one line each through G.DB.obtain, which pokebox-copies-harness.js
// section 12 tests; their messages are checked in the browser.
// PB_COPIES / PB_DB / PB_GACHA=<file> run it against another copy of that file (docs/proposals/pokebox-copies-mutate.js uses these).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = (p, env) => vm.runInThisContext(fs.readFileSync((env && process.env[env]) || R + '/' + p, 'utf8'), { filename: p });
global.window = global;
const store = new Map();
global.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), get length() { return store.size; }, key: i => [...store.keys()][i] };
global.location = { protocol: 'file:', hostname: '', search: '', href: 'file:///dev.html' };
let seed = 424242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
Math.random = rnd;
global.G = { U: { pick: list => list[Math.floor(rnd() * list.length)] }, Items: null, Sprites: { hasShiny: () => true } };
// Stub Pokedex: Kanto has one or more species per rarity; Johto has a single species, so every Johto pull is Chikorita.
G.DEX = [[10, 1, 1], [13, 1, 1], [16, 1, 1], [25, 1, 2], [4, 1, 3], [143, 1, 4], [150, 1, 5], [152, 2, 1]].map(([dex, gen, rarity]) => ({ dex, gen, rarity, bst: 300, name: 'mon' + dex }));
G.DEX_BY = {}; for (const p of G.DEX) G.DEX_BY[p.dex] = p;
G.SPRITE_META = {}; for (const p of G.DEX) G.SPRITE_META[p.dex] = {};
load('js/data/species-traits.js');
load('js/systems/copies.js', 'PB_COPIES');
load('js/core/db.js', 'PB_DB');
load('js/systems/gacha.js', 'PB_GACHA');
const C = G.Copies, GA = G.Gacha;
let fail = 0; const bad = m => { fail++; if (fail < 40) console.log('FAIL', m); };

(async () => {
  await G.DB.ready();
  G.DB.playAsGuest();
  const s = G.DB.save;
  s.tickets = { t1: 100, t10: 5 }; s.coins = 500;
  const copies = (dex, shiny) => C.all(s).filter(c => c.speciesID === dex && c.isShiny === !!shiny).length;

  // 1. a 10-pull across a box edge: Box 1 has 5 free places, so pulls 1 to 5 land in Box 1 and 6 to 10 in Box 2.
  for (let i = 0; i < 495; i++) C.add(s, { dex: 10, from: 'debug' }, rnd);
  const res = GA.pull(s, 10, 1);
  if (!res || res.length !== 10) bad('a 10-pull gives 10 results');
  else {
    if (s.box.length !== 505) bad('a 10-pull makes exactly 10 copies, box has ' + s.box.length);
    if (s.coins !== 500) bad('repeats pay no coins (D1), coins ' + s.coins);
    if (s.tickets.t1 !== 90 || s.stats.pulls !== 10) bad('10 tickets spent and 10 pulls counted');
    const owned = new Set(), shinies = new Set();
    res.forEach((r, i) => {
      const want = i < 5 ? 0 : 1;
      if (r.box !== want) bad('pull ' + (i + 1) + ' lands in Box ' + (want + 1) + ', reported ' + r.box);
      const c = r.uid && C.get(s, r.uid);
      if (!c || c.speciesID !== r.dex || c.isShiny !== !!r.shiny || c.box !== r.box || c.obtainedMethod !== 'gacha') bad('pull ' + (i + 1) + ' result matches its copy ' + JSON.stringify(r));
      const isNew = r.shiny ? !shinies.has(r.dex) : !owned.has(r.dex);
      if (r.isNew !== isNew) bad('pull ' + (i + 1) + ' isNew follows the Pokedex record, expected ' + isNew);
      owned.add(r.dex); if (r.shiny) shinies.add(r.dex);
      if ('refund' in r) bad('a result carries no refund');
    });
    if (!res.some(r => r.rarity >= 4)) bad('a 10-pull has a 4 star or better');
  }
  console.log('1 a 10-pull: 10 copies, no coins, the right box per pull, isNew from the Pokedex');

  // 2. a repeat shiny is kept, not re-rolled (D2): Johto has only Chikorita, forced shiny twice.
  GA.debugForceShiny(2);
  const a = GA.pull(s, 1, 2)[0], b = GA.pull(s, 1, 2)[0];
  if (a.dex !== 152 || !a.shiny || !a.isNew) bad('the first shiny Chikorita is new ' + JSON.stringify(a));
  if (b.dex !== 152 || !b.shiny || b.isNew) bad('the second stays a shiny Chikorita, a repeat ' + JSON.stringify(b));
  if (copies(152, true) !== 2 || copies(152, false) !== 0) bad('two shiny copies and no normal one (D4), got ' + copies(152, true) + ' and ' + copies(152, false));
  if (s.coins !== 500) bad('a repeat shiny pays nothing, coins ' + s.coins);
  console.log('2 a repeat shiny is kept as a second shiny copy, no coins');

  // 3. pity: at 69 pulls without a 5 star, the next is a 5 star and the count resets.
  s.pity[1] = 69;
  const p = GA.pull(s, 1, 1)[0];
  if (p.rarity !== 5 || p.dex !== 150 || s.pity[1] !== 0) bad('pity gives the 5 star and resets ' + JSON.stringify([p, s.pity[1]]));
  console.log('3 pity at 70 still holds');

  // 4. the 4 star guarantee: every roll as low as it goes, so 9 one-stars and a 4 star last.
  Math.random = () => 0.001;
  const low = GA.pull(s, 10, 1);
  Math.random = rnd;
  if (!low.slice(0, 9).every(r => r.rarity === 1) || low[9].rarity !== 4 || low[9].dex !== 143) bad('the 10th is the guaranteed 4 star ' + low.map(r => r.rarity));
  console.log('4 the 10-pull 4 star guarantee still holds');

  // 5. no tickets: nothing happens; the sell price table stays for step 3a-3.
  const n = s.box.length; s.tickets.t1 = 0;
  if (GA.pull(s, 1, 1) !== null || s.box.length !== n) bad('no ticket, no pull, no copy');
  if (JSON.stringify(GA.REFUND) !== JSON.stringify({ 1: 15, 2: 30, 3: 60, 4: 120, 5: 300 })) bad('the sell price table 15 / 30 / 60 / 120 / 300 is kept');
  if (GA.REFUND !== C.SELL_PRICE) bad('the gacha and the box share one sell price table (G.Copies owns it)');
  if (s.coins !== 500) bad('coins never moved, ' + s.coins);
  console.log('5 no ticket, no pull; the sell price table is kept');

  // 6. selling what a pull gave (3a-3): the result's uid sells for its rarity price, a shiny for x3.
  const PRICE = { 1: 15, 2: 30, 3: 60, 4: 120, 5: 300 };
  const normal = res.find(r => !r.shiny && C.get(s, r.uid));
  if (!normal) bad('the 10-pull left a normal copy to sell');
  else {
    const before = s.coins, r = C.sell(s, normal.uid);
    if (!r.ok || r.coins !== PRICE[normal.rarity] || s.coins !== before + PRICE[normal.rarity] || C.get(s, normal.uid)) bad('a pulled ' + normal.rarity + ' star sells for ' + PRICE[normal.rarity] + ' ' + JSON.stringify(r));
  }
  const shiny = C.all(s).find(c => c.speciesID === 152 && c.isShiny), b4 = s.coins, rs = shiny && C.sell(s, shiny.pokemonUUID);
  if (!rs || !rs.ok || rs.coins !== 45 || s.coins !== b4 + 45) bad('a pulled shiny Chikorita (1 star) sells for 45 ' + JSON.stringify(rs));
  console.log('6 a pulled copy sells for its rarity price, a shiny for x3');

  // 7. full boxes on a pull (3a-4). Places go to new species, then shinies, then higher rarity, then pull order (D2); the rest sell.
  const PR = { 1: 15, 2: 30, 3: 60, 4: 120, 5: 300 };
  const rank = r => (r.isNew ? 100 : 0) + (r.shiny ? 10 : 0) + r.rarity;
  const fresh = (free) => { G.DB.playAsGuest(); const g = G.DB.save; g.tickets = { t1: 100, t10: 0 }; g.coins = 0; g.boxCount = 2;
    for (let i = 0; i < 1000 - free; i++) C.add(g, { dex: 10, from: 'debug' }, rnd); return g; };
  // a) 3 places, a random 10-pull: 3 copies, 7 sold for their prices, and no sold pull outranks a placed one.
  { const g = fresh(3), n0 = g.box.length, out = GA.pull(g, 10, 1);
    if (g.box.length !== n0 + 3) bad('3 free places take exactly 3 copies, got ' + (g.box.length - n0));
    const sold = out.filter(r => r.sold), kept = out.filter(r => r.uid);
    if (sold.length !== 7 || kept.length !== 3 || out.some(r => !!r.uid === !!r.sold)) bad('every result is kept or sold, never both ' + JSON.stringify(out));
    const sum = sold.reduce((a, r) => a + PR[r.rarity] * (r.shiny ? 3 : 1), 0);
    if (g.coins !== sum || sold.some(r => r.sold !== PR[r.rarity] * (r.shiny ? 3 : 1))) bad('each sold pull pays its price, total ' + sum + ', coins ' + g.coins);
    if (sold.some(r => !g.owned[r.dex])) bad('a sold pull is still in the Pokedex');
    for (const k of kept) for (const q of sold) { const a = out.indexOf(k), b = out.indexOf(q);
      if (rank(q) > rank(k) || (rank(q) === rank(k) && b < a)) bad('a sold pull ' + b + ' outranks a placed pull ' + a); }
    console.log('7a 3 free places: 3 placed by priority, 7 sold for their prices, all in the Pokedex'); }
  // b) 1 place, rolls fixed: 9 repeat Pikachu (2 star) then a new Snorlax (the 4 star guarantee). The new one gets the place.
  { const g = fresh(1); g.owned[25] = { at: 1, from: 'debug' };
    const keepR = Math.random; Math.random = () => 0.5;
    const out = GA.pull(g, 10, 1);
    Math.random = keepR;
    if (out[9].dex !== 143 || !out[9].isNew || !out[9].uid) bad('the new Snorlax in pull 10 gets the one place ' + JSON.stringify(out[9]));
    if (out.slice(0, 9).some(r => r.dex !== 25 || r.isNew || r.sold !== 30)) bad('the 9 repeat Pikachu are sold for 30 each, in pull order ' + JSON.stringify(out.slice(0, 9)));
    if (g.coins !== 270) bad('9 x 30 = 270, got ' + g.coins);
    console.log('7b a new species in the last pull takes the only place; results stay in pull order'); }
  // c) 1 place, rolls fixed: a repeat shiny Pikachu (2 star) first, 8 repeat Pikachu, a repeat Snorlax (4 star) last. The shiny wins.
  { const g = fresh(1); g.owned[25] = g.owned[143] = { at: 1, from: 'debug' }; g.shiny[25] = { at: 1, from: 'debug' };
    const keepR = Math.random; Math.random = () => 0.5; GA.debugForceShiny(1);
    const out = GA.pull(g, 10, 1);
    Math.random = keepR;
    if (!out[0].shiny || !out[0].uid || out[9].dex !== 143 || out[9].sold !== 120) bad('the repeat shiny gets the place over the repeat 4 star ' + JSON.stringify([out[0], out[9]]));
    if (out.slice(1, 9).some(r => r.sold !== 30)) bad('the 8 plain Pikachu are sold for 30');
    if (g.coins !== 8 * 30 + 120) bad('8 x 30 + 120 = 360, got ' + g.coins);
    console.log('7c a shiny outranks a higher rarity'); }
  // c2) 1 place, rolls fixed, no shiny, all repeats: 9 Pikachu (2 star), Snorlax (4 star) last. The higher rarity beats pull order.
  { const g = fresh(1); g.owned[25] = g.owned[143] = { at: 1, from: 'debug' };
    const keepR = Math.random; Math.random = () => 0.5;
    const out = GA.pull(g, 10, 1);
    Math.random = keepR;
    if (!out[9].uid || out[9].dex !== 143 || out.slice(0, 9).some(r => r.sold !== 30) || g.coins !== 270) bad('the 4 star in pull 10 beats the earlier 2 stars ' + JSON.stringify(out[9]) + ' coins ' + g.coins);
    console.log('7c2 a higher rarity outranks pull order'); }
  // d) enough room: no priority, pull order (the box edge in section 1 already checks the order).
  { const g = fresh(10); const out = GA.pull(g, 10, 1);
    if (out.some(r => r.sold || !r.uid) || g.coins !== 0) bad('with room for all 10, nothing is sold');
    console.log('7d room for all: nothing sold'); }

  console.log(fail ? fail + ' FAILED' : 'pokebox-sources harness: all passed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL', e && e.stack); process.exit(1); });
