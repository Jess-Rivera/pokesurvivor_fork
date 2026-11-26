// Per-copy upgrades offline checks (#97 slice C, part C1; Node only). Usage from the repo root:
//   node docs/proposals/upgrades-harness.js .
// Real js/data/pokedex.js, species-traits.js, growth-curves.js, upgrades.js, js/systems/copies.js, candy.js and the real
// db.js newSave / migrate (pulled out with a test hook; the file on disk is not changed). Expected outcomes are relations
// read from the design ("97 - Upgrade System Design.md", "Numbers (draft)") and decisions
// 2026-11-23-97-upgrade-price-shape-bst-and-bands and 2026-11-26-97-upgrade-popup-open-questions, never values copied
// from the code. The 3-star price lists below are the design's own table.
// Not covered here: stats and combat (C2), the popup and its hover preview (C3, browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/data/upgrades.js': 'UPGRADES_UPGRADES', 'js/systems/copies.js': 'UPGRADES_COPIES' };
const read = p => fs.readFileSync((SRC[p] && process.env[SRC[p]]) || R + '/' + p, 'utf8');
const load = (p, tweak) => vm.runInThisContext(tweak ? tweak(read(p)) : read(p), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global; global.location = { search: '' };
global.localStorage = { getItem: () => null, setItem() { }, removeItem() { } };
global.G = new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
let fail = 0; const bad = m => { fail++; if (fail < 40) console.log('FAIL', m); };
for (const p of ['js/data/pokedex.js', 'js/data/species-traits.js', 'js/systems/copies.js', 'js/data/growth-curves.js',
  'js/systems/candy.js', 'js/data/upgrades.js'])
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); }
let T = null;
try {
  load('js/core/db.js', src => { src = src.replace(/\r\n/g, '\n'); const k = '  return {\n    ready,\n    register'; if (!src.includes(k)) throw new Error('db.js export block moved'); return src.replace(k, '  G.__t = { newSave, migrate, sanitize };\n' + k); });
  T = G.__t;
} catch (e) { bad('db.js did not load for the test: ' + e.message); }
const U = G.Upgrades;

// ---------- the design's numbers ----------
const BASE_STATS = ['baseHp', 'baseAtk', 'baseDef', 'baseSpa', 'baseSpd', 'baseSpe'];
const POWER = ['crit', 'reflexes', 'regeneration'];
const PRICES_AT_3_STARS = {
  baseStat: [50, 80, 130, 200, 330, 520, 840, 1340, 2150, 3440],
  power: [100, 200, 400, 800, 1600],
  startingMoves: [300, 2000],
};
const BANDS = [1, 10, 20, 40, 80];
const PER_BAND = { baseStat: 2, power: 1 };
const listFor = id => (BASE_STATS.includes(id) ? 'baseStat' : POWER.includes(id) ? 'power' : 'startingMoves');
const BULBASAUR = 1, SUNKERN = 191, ARCEUS = 493; // BST 318, 180 (below 3 stars), 720 (above 7)

const fresh = () => { const s = T.newSave('Tester'); s.box = []; return s; };
const addCopy = (s, dex) => G.Copies.longId(G.Copies.add(s, { dex, from: 'debug' }).u);
const levelOf = (s, uid, id) => G.Copies.get(s, uid).upgrades[id] || 0;
const giveOor = (s, uid, oor) => G.Copies.addCandyXp(s, uid, G.Candy.xpForLevel(G.Copies.get(s, uid).speciesID, oor));

// ---------- 1. the catalog is the design's ----------
{ const ids = U.LIST.map(u => u.id);
  for (const id of [...BASE_STATS, ...POWER, 'startingMoves']) if (!U.BY[id]) bad('the catalog has no ' + id);
  if (ids.length !== BASE_STATS.length + POWER.length + 1) bad('the catalog holds ' + ids.length + ' upgrades, the design 10');
  for (const id of ids) if (U.BY[id].levels !== PRICES_AT_3_STARS[listFor(id)].length) bad(id + ': levels differ from the design');
  console.log('catalog: six base stats, three power upgrades, starting moves'); }

// ---------- 2. prices: the design's list at 3 stars, times stars / 3 ----------
{ for (const id of Object.keys(U.BY)) PRICES_AT_3_STARS[listFor(id)].forEach((price, level) => {
    if (U.priceOf(id, level, BULBASAUR) !== price) bad(id + ' level ' + (level + 1) + ' at 3 stars: ' + U.priceOf(id, level, BULBASAUR) + ', the design ' + price);
    if (U.priceOf(id, level, SUNKERN) !== U.priceOf(id, level, BULBASAUR)) bad(id + ': below 3 stars must pay the 3-star price');
    const seven = U.priceOf(id, level, ARCEUS);
    if (Math.abs(seven - (price * 7) / 3) > 5) bad(id + ' level ' + (level + 1) + ' at 7 stars: ' + seven + ', not 7/3 of ' + price + ' rounded to 10');
    if (seven % 10) bad(id + ': a price is not rounded to 10');
    if (level && !(U.priceOf(id, level, BULBASAUR) > U.priceOf(id, level - 1, BULBASAUR))) bad(id + ': a level is not dearer than the one before');
  });
  if (!(U.starsOf(ARCEUS) === 7 && U.starsOf(SUNKERN) === 3)) bad('stars are not held between 3 and 7');
  if (U.starsOf(3) !== Math.round(G.DEX_BY[3].bst / 50) / 2) bad('stars are not BST / 100 in half-star steps');
  console.log('prices: the design list at 3 stars, x stars / 3, floor 3, cap 7'); }

// ---------- 3. a buy (the end-goal test) ----------
{ const s = fresh(), uid = addCopy(s, BULBASAUR);
  s.coins = 10000;
  const price = U.priceOf('baseAtk', 0, BULBASAUR), before = s.coins, r = U.buy(s, uid, 'baseAtk');
  if (!r.ok) bad('a buy with coins enough was refused: ' + r.error);
  if (s.coins !== before - price) bad('a buy took ' + (before - s.coins) + ', the price is ' + price);
  if (levelOf(s, uid, 'baseAtk') !== 1) bad('a buy did not raise the level to 1');
  for (const id of Object.keys(U.BY)) if (id !== 'baseAtk' && levelOf(s, uid, id)) bad('a buy raised ' + id + ' too');
  // unaffordable: nothing changes
  s.coins = U.priceOf('baseAtk', 1, BULBASAUR) - 10;
  const poor = U.buy(s, uid, 'baseAtk');
  if (poor.ok || poor.error !== 'poor') bad('a buy one coin short was not refused as poor');
  if (levelOf(s, uid, 'baseAtk') !== 1 || s.coins !== U.priceOf('baseAtk', 1, BULBASAUR) - 10) bad('a refused buy changed the save');
  // unknown upgrade and missing copy
  if (U.buy(s, uid, 'magnet').error !== 'upgrade') bad('an old account-wide upgrade is buyable per copy');
  if (U.buy(s, G.Copies.longId(G.Copies.add(fresh(), { dex: 1, from: 'debug' }).u), 'baseAtk').error !== 'none') bad('a copy not in this save was upgraded');
  if (U.buy(s, 'not-an-id', 'baseAtk').error !== 'none') bad('a malformed id was not refused');
  console.log('buy: takes its price, raises one level, refuses poor, unknown and missing'); }

// ---------- 4. bands follow the OOR level ----------
{ const s = fresh(), uid = addCopy(s, BULBASAUR);
  s.coins = 1e9;
  BANDS.forEach((bandLevel, band) => {
    if (bandLevel > 1) giveOor(s, uid, bandLevel);
    for (const id of [...BASE_STATS, ...POWER]) {
      const open = (band + 1) * PER_BAND[listFor(id)];
      while (levelOf(s, uid, id) < open) if (!U.buy(s, uid, id).ok) { bad(id + ' refused below its band ' + (band + 1) + ' cap'); break; }
      const above = U.buy(s, uid, id);
      const expected = open >= U.BY[id].levels ? 'max' : 'band';
      if (above.ok || above.error !== expected) bad(id + ' at band ' + (band + 1) + ': above the cap gave ' + (above.ok ? 'a buy' : above.error) + ', not ' + expected);
    }
  });
  const fresh1 = fresh(), other = addCopy(fresh1, BULBASAUR); fresh1.coins = 1e9;
  if (!(U.buy(fresh1, other, 'startingMoves').ok && U.buy(fresh1, other, 'startingMoves').ok)) bad('starting moves are gated by a band');
  if (U.buy(fresh1, other, 'startingMoves').error !== 'max') bad('a third starting move was not refused as max');
  console.log('bands: base stats open 2 levels and power upgrades 1 at OOR 1, 10, 20, 40, 80; starting moves no band'); }

// ---------- 5. the save keeps levels ----------
{ const s = fresh(), uid = addCopy(s, BULBASAUR), other = addCopy(s, SUNKERN);
  G.Copies.setUpgradeLevel(s, uid, 'baseHp', 10);
  G.Copies.setUpgradeLevel(s, uid, 'crit', 99);
  G.Copies.setUpgradeLevel(s, other, 'baseHp', 3);
  const raw = s.box.find(c => c.u === G.Copies.shortId(uid));
  raw.p.magnet = 4; raw.p.reflexes = 2.7; raw.p.regeneration = -1;
  const back = T.migrate(JSON.parse(JSON.stringify(s)), 'Tester');
  const levels = G.Copies.get(back, uid).upgrades;
  if (levels.baseHp !== 10) bad('a level above 5 did not survive a reload: ' + levels.baseHp);
  if (levels.crit !== U.BY.crit.levels) bad('a level past the maximum was not cut to it on load: ' + levels.crit);
  if ('magnet' in levels) bad('an unknown upgrade id survived a reload');
  if (levels.reflexes !== 2) bad('a fractional level was not made whole');
  if ('regeneration' in levels) bad('a negative level was not dropped');
  if (G.Copies.get(back, other).upgrades.baseHp !== 3) bad('a second copy lost its level');
  G.Copies.setUpgradeLevel(back, other, 'baseHp', 0);
  if (back.box.find(c => c.u === G.Copies.shortId(other)).p) bad('a copy with every level at 0 still carries the upgrade field');
  // a save from before the upgrades loads with none
  const old = fresh(), oid = addCopy(old, BULBASAUR);
  const oldBack = T.migrate(JSON.parse(JSON.stringify(old)), 'Tester');
  if (Object.keys(G.Copies.get(oldBack, oid).upgrades).length) bad('a save with no upgrades gained some on load');
  // evolution keeps the levels; the price follows the species
  raw.d = 2;
  if (G.Copies.get(s, uid).upgrades.baseHp !== 10) bad('an evolved copy lost its levels');
  if (U.priceOf('crit', 0, 2) !== Math.round((100 * U.starsOf(2)) / 3 / 10) * 10) bad('the price does not follow the evolved species');
  console.log('save: levels to each maximum survive a reload, junk is cleaned, evolution keeps them'); }

// ---------- 6. the summary adds the levels up ----------
{ const none = U.summary({});
  if (none.baseStatMul.some(m => m !== 1) || none.critChance || none.cooldownMul !== 1 || none.regenPerSecond || none.startingMoves)
    bad('no upgrades is not neutral');
  const full = U.summary(Object.fromEntries(U.LIST.map(u => [u.id, u.levels])));
  if (full.baseStatMul.some(m => Math.abs(m - 1.15) > 1e-9)) bad('a maxed base stat is not +15%');
  if (Math.abs(full.critChance - 0.1) > 1e-9) bad('maxed crit is not 10%');
  if (Math.abs(full.cooldownMul - 0.9) > 1e-9) bad('maxed Reflexes is not -10%');
  if (Math.abs(full.regenPerSecond - 0.005) > 1e-9) bad('maxed Regeneration++ is not 0.5% a second');
  if (full.startingMoves !== 2) bad('maxed starting moves is not 2');
  const one = U.summary({ baseSpe: 1 });
  if (one.baseStatMul.filter(m => m !== 1).length !== 1 || !(one.baseStatMul[5] > 1)) bad('a Speed level raised another stat');
  const hand = U.summary({ crit: 50, baseHp: 'x' });
  if (hand.critChance > full.critChance || hand.baseStatMul[0] !== 1) bad('a hand-edited level gave more than the maximum');
  console.log('summary: neutral at none, the design caps at max, one level touches one stat'); }

console.log(fail ? 'upgrades harness: ' + fail + ' FAIL' : 'upgrades harness: all passed');
process.exit(fail ? 1 : 0);
