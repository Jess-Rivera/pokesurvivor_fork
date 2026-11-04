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

  console.log(fail ? fail + ' FAILED' : 'pokebox-sources harness: all passed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL', e && e.stack); process.exit(1); });
