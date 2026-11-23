// Exp Candy offline checks (#139 8a; Node only). Usage from the repo root:  node docs/proposals/candy-harness.js .
// Real js/data/drops.js, gyms.js, growth-curves.js, species-traits.js, js/systems/copies.js, candy.js and the real db.js
// newSave / migrate / sanitize (pulled out with a test hook; the file on disk is not changed). Expected outcomes are
// relations read from decision 2026-11-22-139-candy-target-and-drop-model, never values copied from the code: the canon
// sizes, the run's shape (6 loops, 8 gyms and 4 Elite Four a loop, loop N rolls N times, gym 8 and the last Elite Four on
// loop 6 drop S), and the target, which this file computes from pokeapi on its own. The drop function's own cases are
// in drops-harness.js. The mutation runner (candy-mutate.js) points CANDY_<NAME> at altered copies.
// Not covered: the Team menu (Part F) and the toast (browser).
const fs = require('fs'), vm = require('vm'), path = require('path');
const R = process.argv[2] || '.';
const SRC = { 'js/data/drops.js': 'CANDY_DROPS', 'js/systems/candy.js': 'CANDY_CANDY', 'js/systems/copies.js': 'CANDY_COPIES',
  'js/data/gyms.js': 'CANDY_GYMS' };
const read = p => fs.readFileSync((SRC[p] && process.env[SRC[p]]) || R + '/' + p, 'utf8');
const load = (p, tweak) => vm.runInThisContext(tweak ? tweak(read(p)) : read(p), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global; global.location = { search: '' };
global.localStorage = { getItem: () => null, setItem() { }, removeItem() { } };
global.G = new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
let fail = 0; const bad = m => { fail++; if (fail < 40) console.log('FAIL', m); };
for (const p of ['js/data/species-traits.js', 'js/systems/copies.js', 'js/data/growth-curves.js', 'js/systems/candy.js', 'js/data/drops.js', 'js/data/gyms.js'])
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); }
let T = null;
try {
  load('js/core/db.js', src => { src = src.replace(/\r\n/g, '\n'); const k = '  return {\n    ready,\n    register'; if (!src.includes(k)) throw new Error('db.js export block moved'); return src.replace(k, '  G.__t = { newSave, migrate, sanitize };\n' + k); });
  T = G.__t;
} catch (e) { bad('db.js did not load for the test: ' + e.message); }
const C = G.Candy;

// ---------- the decision's numbers ----------
const CANON = { xs: 100, s: 800, m: 3000, l: 10000, xl: 30000 }; // never scaled
const LOOPS = 6, GYMS = 8, ELITE_FOUR = 4;
const CSV = name => { const lines = fs.readFileSync(path.join(R, 'pokeapi-master/data/v2/csv', name), 'utf8').trim().split(/\r?\n/); const h = lines[0].split(',');
  return lines.slice(1).map(l => { const c = l.split(','); const o = {}; h.forEach((k, i) => (o[k] = c[i])); return o; }); };
const species = CSV('pokemon_species.csv'), xpRows = CSV('experience.csv'), evoRows = CSV('pokemon_evolution.csv');
const XP = {}; for (const r of xpRows) (XP[r.growth_rate_id] = XP[r.growth_rate_id] || {})[r.level] = +r.experience;
const BY = {}; for (const r of species) BY[r.id] = r;
const xpAt = (dex, level) => XP[BY[dex].growth_rate_id][level];

// ---------- 1. the floor (the end-goal test) ----------
// The target: the median over every 3-stage line whose two steps are both level-up evolutions of the XP its final
// species needs at the final step's level.
const stepLevel = {}; for (const r of evoRows) if (r.evolution_trigger_id === '1' && r.minimum_level) { const id = r.evolved_species_id, lv = +r.minimum_level; if (stepLevel[id] == null || lv < stepLevel[id]) stepLevel[id] = lv; }
const kids = {}; for (const r of species) if (r.evolves_from_species_id) (kids[r.evolves_from_species_id] = kids[r.evolves_from_species_id] || []).push(r.id);
const pathsXp = [];
for (const base of species.filter(r => !r.evolves_from_species_id)) for (const mid of kids[base.id] || []) for (const fin of kids[mid] || [])
  if (stepLevel[mid] && stepLevel[fin]) pathsXp.push(xpAt(fin, stepLevel[fin]));
pathsXp.sort((a, b) => a - b);
const target = pathsXp[Math.floor((pathsXp.length - 1) / 2)];
if (pathsXp.length < 50) bad('too few 3-stage level-based paths read from pokeapi: ' + pathsXp.length);
// A full run with every roll forced to Common, through the real tables (a roll of 0.999 misses every rarer tier).
const commonOnly = () => 0.999;
const candyOf = (table, loop) => G.Drops.roll(table, 0, 0, { rnd: commonOnly, place() { }, loop }).filter(d => d.pickup === 'candy');
let floorXp = 0, floorDrops = 0;
const gymTables = G.Gyms.KANTO.map(g => G.Gyms.candyTableFor(g));
if (gymTables.length !== GYMS) bad('Kanto holds ' + gymTables.length + ' gyms, the run shape has ' + GYMS);
for (let loop = 1; loop <= LOOPS; loop++) {
  // the Elite Four is not built: its members use the gym 1 table, and the last one on loop 6 uses gym 8's (the decision)
  const eliteFour = Array.from({ length: ELITE_FOUR }, (_, i) => (loop === LOOPS && i === ELITE_FOUR - 1 ? gymTables[GYMS - 1] : gymTables[0]));
  for (const table of gymTables.concat(eliteFour)) for (const d of candyOf(table, loop)) { floorXp += CANON[d.value]; floorDrops++; }
}
if (floorDrops !== (GYMS + ELITE_FOUR) * (LOOPS * (LOOPS + 1)) / 2) bad('a full run rolls ' + floorDrops + ' times, not 12 sources x 21 loop-shares');
if (!(floorXp >= target)) bad('the all-Common full run gives ' + floorXp + ' XP, below the median line ' + target);
if (G.Gyms.candyTableFor(G.Gyms.KANTO[GYMS - 1]) === G.Gyms.candyTableFor(G.Gyms.KANTO[0])) bad('gym 8 rolls the same candy table as gym 1');
for (const s of Object.keys(CANON)) if (C.SIZES[s] !== CANON[s]) bad('candy size ' + s + ' is ' + C.SIZES[s] + ', canon is ' + CANON[s]);
console.log('floor: every roll on Common gives ' + floorXp + ' XP over ' + floorDrops + ' drops, at least the median line (' + target + ', ' + pathsXp.length + ' paths)');

// ---------- 2. the growth data matches pokeapi ----------
{ let off = 0;
  for (const r of species) { const curve = G.GrowthCurves.curveOf(+r.id); for (let lv = 1; lv <= 100; lv++) if (!curve || curve[lv - 1] !== xpAt(r.id, lv)) { off++; break; } }
  if (off) bad(off + ' species have a curve that differs from pokeapi');
  // spot checks from the slice opening: Abra's line evolves at 16 for 2,535 XP, Venusaur's at 32 for 27,021
  if (C.xpForLevel(63, 16) !== 2535) bad('Abra at 16 needs 2,535 XP');
  if (C.xpForLevel(1, 32) !== 27021) bad("Venusaur's line at 32 needs 27,021 XP");
  for (const [dex, want] of [[1, 16], [2, 32], [63, 16], [147, 30], [133, null], [3, null]]) if (G.GrowthCurves.nextEvolutionLevel(dex) !== want) bad('dex ' + dex + ' next level-up evolution is ' + G.GrowthCurves.nextEvolutionLevel(dex) + ', want ' + want);
  console.log('growth data: every species curve matches pokeapi; Abra 2,535, Venusaur 27,021; next level-up evolutions'); }

// ---------- 3. levels ----------
for (const dex of [1, 63, 129, 147, 374]) {
  if (C.levelFor(dex, 0) !== 1) bad(dex + ': 0 XP is level 1');
  for (const lv of [2, 16, 50, 99, 100]) { const need = C.xpForLevel(dex, lv);
    if (C.levelFor(dex, need) !== lv) bad(dex + ': the level ' + lv + ' total reads as ' + C.levelFor(dex, need));
    if (C.levelFor(dex, need - 1) !== lv - 1) bad(dex + ': one XP short of level ' + lv + ' reads as ' + C.levelFor(dex, need - 1)); }
  if (C.levelFor(dex, 1e12) !== 100) bad(dex + ': the level never passes 100');
}

// ---------- 4. the bag, giving, give until ----------
const fresh = () => { const s = T.newSave('Tester'); s.box = []; return s; };
const addCopy = (s, dex) => G.Copies.longId(G.Copies.add(s, { dex, from: 'debug' }).u);
{ const s = fresh();
  for (const size of C.SIZE_ORDER) if (C.bagOf(s)[size] !== 0) bad('a new save has an empty bag');
  if (C.bank('huge', s)) bad('an unknown size is refused');
  C.bank('xs', s); C.bank('xs', s); C.bank('m', s);
  if (C.bagOf(s).xs !== 2 || C.bagOf(s).m !== 1) bad('banking adds one candy each time');
  const id = addCopy(s, 1), before = G.Copies.get(s, id);
  const r = C.give(s, id, 'm');
  if (!r.ok || C.bagOf(s).m !== 0 || G.Copies.get(s, id).candyXp !== before.candyXp + CANON.m) bad('giving takes one from the bag and adds its size in XP');
  if (C.give(s, id, 'm').ok) bad('an empty size is refused');
  if (C.bagOf(s).m !== 0) bad('the bag never goes below 0');
  if (C.give(s, '00000000-0000-4000-8000-000000000000', 'xs').ok || C.give(s, 'junk', 'xs').ok) bad('a missing or malformed copy is refused');
  // candy changes nothing on the copy but its candy XP
  const after = G.Copies.get(s, id); for (const k of Object.keys(before)) if (k !== 'candyXp' && JSON.stringify(after[k]) !== JSON.stringify(before[k])) bad('giving candy changed ' + k);
  // a copy whose next evolution has no level still levels (Eevee)
  const eevee = addCopy(s, 133); if (!C.give(s, eevee, 'xs').ok) bad('Eevee (no level-up evolution) still takes candy');
  // refused only at 100; the copy's XP never passes the level 100 total
  const top = addCopy(s, 129); for (let i = 0; i < 60; i++) C.bank('xl', s);
  let given = 0; while (C.give(s, top, 'xl').ok) given++;
  const cap = C.xpForLevel(129, 100), held = G.Copies.get(s, top).candyXp;
  if (held !== cap || C.levelFor(129, held) !== 100) bad('candy stops at the level 100 total (' + held + ' of ' + cap + ')');
  if (C.give(s, top, 'xs').error !== 'max' || C.giveUntil(s, top, 100).error !== 'max') bad('a level 100 copy refuses candy');
  if (!(C.bagOf(s).xl > 0)) bad('the refused candy stays in the bag');
  console.log('bag and giving: one per press, refused when empty or at 100, capped at the level 100 total, nothing else changes'); }
{ // give until: largest that fits, repeated, then the smallest that covers; may overshoot; reports the level when the bag empties
  const s = fresh(), id = addCopy(s, 63);
  for (let i = 0; i < 20; i++) C.bank('xs', s); for (let i = 0; i < 5; i++) C.bank('s', s); C.bank('m', s);
  const need = C.xpForLevel(63, 16), r = C.giveUntil(s, id, 16), xp = G.Copies.get(s, id).candyXp;
  if (!r.ok || r.level < 16 || C.levelFor(63, xp) !== r.level) bad('give until ends at or past the target and reports the level');
  if (r.given.m) bad('give until never opens with a candy bigger than what is left when a smaller one fits');
  if (xp - need >= CANON.xs) bad('give until overshoots by less than the smallest candy it held (' + (xp - need) + ')');
  const empty = fresh(), id2 = addCopy(empty, 63); C.bank('xs', empty);
  const r2 = C.giveUntil(empty, id2, 50);
  if (!r2.ok || !r2.ranOut || r2.level !== C.levelFor(63, CANON.xs) || C.bagOf(empty).xs !== 0) bad('give until reports the level reached when the bag runs out');
  const big = fresh(), id3 = addCopy(big, 1); for (let i = 0; i < 40; i++) C.bank('xl', big);
  const r3 = C.giveUntil(big, id3, 100); if (r3.level !== 100) bad('give until 100 stops at 100');
  // only the smallest-covering step may overshoot: from 0 toward level 2 (a few XP) with only an XL held, it gives that XL
  const one = fresh(), id4 = addCopy(one, 1); C.bank('xl', one); if (!C.giveUntil(one, id4, 2).given.xl) bad('give until takes the smallest that covers when nothing fits');
  console.log('give until: fits first, then the smallest that covers, stops at 100, reports the level when the bag runs out'); }

// ---------- 5. old saves, hand-edited saves, the round trip ----------
if (T) {
  const old = T.newSave('Old'); delete old.candy; old.box = []; const oid = addCopy(old, 25);
  const m = T.migrate(JSON.parse(JSON.stringify(old)), 'Old');
  if (!m.candy || Object.values(C.bagOf(m)).some(v => v !== 0)) bad('an old save loads with an empty bag');
  if (G.Copies.get(m, oid).candyXp !== 0) bad('an old copy reads 0 candy XP');
  const hand = T.newSave('Hand'); hand.box = []; const hid = addCopy(hand, 25), low = addCopy(hand, 26), word = addCopy(hand, 27);
  hand.candy = { xs: -3, s: '2', m: 1.7, bogus: 9 };
  hand.box.find(c => c.u === G.Copies.shortId(hid)).c = 1e12;
  hand.box.find(c => c.u === G.Copies.shortId(low)).c = -5;
  hand.box.find(c => c.u === G.Copies.shortId(word)).c = 'abc';
  T.sanitize(hand);
  if (JSON.stringify(hand.candy) !== JSON.stringify({ s: 2, m: 1 })) bad('a hand-edited bag keeps whole, positive counts of known sizes: ' + JSON.stringify(hand.candy));
  if (G.Copies.get(hand, hid).candyXp !== C.xpForLevel(25, 100)) bad('candy XP above the level 100 total clamps to it');
  if (G.Copies.get(hand, low).candyXp !== 0 || G.Copies.get(hand, word).candyXp !== 0) bad('negative or non-number candy XP reads 0');
  if (['c'].some(k => k in hand.box.find(c => c.u === G.Copies.shortId(low)))) bad('0 candy XP is left out of the compact copy');
  const trip = fresh(), tid = addCopy(trip, 4); C.bank('s', trip); C.bank('l', trip); C.give(trip, tid, 'l');
  const back = T.migrate(JSON.parse(JSON.stringify(trip)), 'Tester');
  if (G.Copies.get(back, tid).candyXp !== CANON.l || C.bagOf(back).s !== 1 || C.bagOf(back).l !== 0) bad('the bag and candy XP survive a save round trip');
  console.log('saves: an old save loads with an empty bag and 0 XP, hand edits are cleaned, a round trip keeps both');
}

// ---------- 6. gyms.js names a tiered candy table ----------
{ const g8 = JSON.parse(JSON.stringify(G.Gyms.KANTO[GYMS - 1]));
  const candyProblems = g => G.Gyms.validate(g).filter(msg => /candy/.test(msg));
  if (candyProblems(g8).length) bad('gym 8 names a valid candy table: ' + candyProblems(g8));
  g8.candy = 'wild'; if (!candyProblems(g8).length) bad('a gym naming a table that is not tiered is refused');
  g8.candy = 'nope'; if (!candyProblems(g8).length) bad('a gym naming no table is refused');
  console.log('gyms.js: candy names a tiered table, gym 8 its own'); }

console.log(fail ? 'candy harness: ' + fail + ' FAIL' : 'candy harness: all passed');
process.exit(fail ? 1 : 0);
