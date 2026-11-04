// Pokebox offline checks, steps 1 to 3b-3 (Node only). Usage from the repo root:  node docs/proposals/pokebox-copies-harness.js .
// Real js/systems/copies.js, js/data/species-traits.js and js/core/db.js with a fake localStorage. Expected values are hand-derived from
// docs/proposals/pokebox-plan.md and pokeapi (Snorlax 2.1 m, 460 kg, Immunity / Thick Fat / Gluttony, 12.5% female), not read back from code output.
// PB_COPIES=<file> / PB_DB=<file> run it against another copies.js or db.js (docs/proposals/pokebox-copies-mutate.js uses these).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = (p, env) => vm.runInThisContext(fs.readFileSync((env && process.env[env]) || R + '/' + p, 'utf8'), { filename: p });
global.window = global;
const store = new Map();
global.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), get length() { return store.size; }, key: i => [...store.keys()][i] };
global.location = { protocol: 'file:', hostname: '', search: '', href: 'file:///dev.html' };
global.G = { U: {}, Items: null };
load('js/data/species-traits.js');
load('js/systems/copies.js', 'PB_COPIES');
const C = G.Copies, T = G.SpeciesTraits;
G.DEX_BY = {}; for (const d in T.SPECIES) G.DEX_BY[d] = { dex: +d };
let fail = 0; const bad = m => { fail++; if (fail < 40) console.log('FAIL', m); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

// 1. the plan's Snorlax, from its exact saved line
const LINE = '{"u":"fzwqnksdToqcIV0Oj2obNA","d":143,"t":1793736000,"m":"g","n":11,"i":"47MFWJ","g":0,"x":142,"y":97,"a":2,"s":1,"e":[180,252,78,0,0,0],"k":"Mochi","h":120,"p":{"dmg":3,"hp":2},"f":1,"l":1}';
{ if (LINE.length !== 190) bad('the plan says 190 bytes, the line has ' + LINE.length);
  const c = C.read(JSON.parse(LINE), { trainerId: 'me' });
  const WANT = { abilityName: 'Thick Fat', abilityHidden: false, natureName: 'Adamant', box: 0, pokemonUUID: '7f3c2a9e-4b1d-4e8a-9c21-5d0e8f6a1b34', speciesID: 143, form: 'base', originalTrainerID: 'me', nickname: 'Mochi', dateObtained: 1793736000000, obtainedMethod: 'gacha', nature: 'adamant', natureUp: 1, natureDown: 3, gender: 'male', heightScale: 142, weightScale: 97, abilitySlot: 2, ability: 'thick-fat', isShiny: true, friendship: 120, startingMove: null, isFavorite: true, isLocked: true };
  for (const k in WANT) if (c[k] !== WANT[k]) bad('Snorlax ' + k + ' is ' + c[k]);
  if (!same(c.iv, [28, 31, 12, 5, 22, 9])) bad('Snorlax IVs in game stat order ' + c.iv);
  if (!same(c.ev, [180, 252, 78, 0, 0, 0])) bad('Snorlax EVs ' + c.ev);
  if (!same(c.upgrades, { dmg: 3, hp: 2 })) bad('Snorlax upgrades');
  if (!near(c.heightM, 2.148, 0.001) || !near(c.weightKg, 438.0, 0.1)) bad('Snorlax size ' + c.heightM + ' m ' + c.weightKg + ' kg');
  console.log('1 the plan\'s Snorlax reads back field by field, 190 bytes'); }

// 2. the defaults a fresh copy leaves out
{ const c = C.read({ u: 'fzwqnksdToqcIV0Oj2obNA', d: 143, t: 1, m: 's', n: 1, i: 'AAAAAA', g: 2, x: 0, y: 255, a: 1 }, { trainerId: 'me' });
  if (c.form !== 'base' || c.nickname !== '' || c.isShiny || c.isFavorite || c.isLocked || c.startingMove !== null) bad('fresh defaults');
  if (!same(c.ev, [0, 0, 0, 0, 0, 0]) || !same(c.upgrades, {})) bad('fresh EVs and upgrades');
  if (c.friendship !== 70) bad('friendship starts at Snorlax base 70, got ' + c.friendship);
  if (!near(c.heightM, 2.1 * 0.8, 1e-9) || !near(c.weightKg, 460 * 1.2, 1e-9)) bad('scale 0 is 80%, 255 is 120%');
  console.log('2 defaults: friendship from the species, size 80% to 120%'); }

// 3. UUIDs
{ const seen = new Set();
  for (let i = 0; i < 20000; i++) { const id = C.uuid(); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) bad('not a v4 UUID ' + id); if (seen.has(id)) bad('repeat UUID');
    seen.add(id); const s = C.shortId(id); if (s.length !== 22 || C.longId(s) !== id) bad('short form round trip ' + id); }
  console.log('3 UUID v4, unique, 22 characters there and back'); }

// 4. rolls, against the approved rates
const N = 200000;
const rate = (dex, read) => { const c = {}; for (let i = 0; i < N; i++) { const k = read(C.roll({ dex, from: 'gacha' }, rnd)); c[k] = (c[k] || 0) + 1 / N; } return c; };
{ const a = rate(143, r => r.a); if (!near(a[1], 0.475, 0.004) || !near(a[2], 0.475, 0.004) || !near(a[3], 0.05, 0.003)) bad('two normal + hidden ' + JSON.stringify(a));
  const b = rate(1, r => r.a); if (!near(b[1], 0.95, 0.004) || !near(b[3], 0.05, 0.003) || b[2]) bad('one normal + hidden ' + JSON.stringify(b));
  const m = rate(151, r => r.a); if (m[1] !== undefined && !near(m[1], 1, 1e-6) || m[2] || m[3]) bad('one normal ' + JSON.stringify(m));
  const g = rate(143, r => r.g); if (!near(g[1], 0.125, 0.004) || !near(g[0], 0.875, 0.004) || g[2]) bad('Snorlax 12.5% female ' + JSON.stringify(g));
  if (rate(81, r => r.g)[2] === undefined) bad('Magnemite genderless');
  if (rate(32, r => r.g)[1]) bad('Nidoran male is never female');
  if (rate(113, r => r.g)[0]) bad('Chansey is never male');
  const ivs = new Array(32).fill(0), nats = new Array(26).fill(0); let sum = 0, tails = 0, lo = 999, hi = -1;
  for (let i = 0; i < N; i++) { const r = C.roll({ dex: 143, from: 'gacha' }, rnd), f = C.read(r, {}); f.iv.forEach(v => ivs[v]++); nats[r.n]++; sum += r.x; lo = Math.min(lo, r.x); hi = Math.max(hi, r.x); if (r.x < 26 || r.x > 229) tails++; }
  ivs.forEach((n, v) => { if (!near(n / (N * 6), 1 / 32, 0.002)) bad('IV ' + v + ' rate ' + n / (N * 6)); });
  for (let n = 1; n <= 25; n++) if (!near(nats[n] / N, 1 / 25, 0.003)) bad('nature ' + n + ' rate ' + nats[n] / N);
  if (nats[0]) bad('nature id 0 does not exist');
  if (!near(sum / N, 127.5, 0.6) || lo < 0 || hi > 255) bad('scale mean ' + sum / N + ' range ' + lo + ' to ' + hi);
  if (!near(tails / N, 0.042, 0.004)) bad('about 4% outside 84% to 116%, got ' + tails / N);
  for (const dex in T.SPECIES) { const a = T.SPECIES[dex][1]; for (let i = 0; i < 40; i++) { const f = C.read(C.roll({ dex: +dex, from: 'gacha' }, rnd), {}); if (!f.ability || f.ability !== a[f.abilitySlot - 1]) bad(dex + ' rolled an ability it does not have'); } }
  const fresh = JSON.stringify({ ...C.roll({ dex: 143, from: 'gacha', at: 1793736000000 }, rnd), n: 11, x: 142, y: 97 }).length; if (fresh > 109) bad('a fresh copy is about 108 bytes, got ' + fresh);
  console.log('4 rolls: 47.5 / 47.5 / 5, 95 / 5, 100; real gender ratios; even IVs and natures; bell scale; about 108 bytes'); }

// 5. linkTeam (copies made directly here; the sources are section 12). fill is gone since step 3a-2.
{ const s = { owned: { 143: {}, 25: {} }, shiny: { 25: {} }, box: [], team: [{ dex: 143, shiny: false }, { dex: 25, shiny: true }, null, null, null, null], trainerId: 'me' };
  C.add(s, { dex: 143, at: 1793736000000, from: 'gacha' }, rnd);
  C.add(s, { dex: 25, at: 1000000, from: 'legend' }, rnd);
  C.add(s, { dex: 25, shiny: true, at: 2000000, from: 'wild' }, rnd);
  C.linkTeam(s);
  const list = C.all(s), sn = list.find(c => c.speciesID === 143), sh = list.find(c => c.speciesID === 25 && c.isShiny), nm = list.find(c => c.speciesID === 25 && !c.isShiny);
  if (sn.dateObtained !== 1793736000000 || sn.obtainedMethod !== 'gacha') bad('a copy keeps the date and origin it was made with');
  if (nm.obtainedMethod !== 'other' || nm.dateObtained !== 1000000) bad('an origin not on the list becomes other');
  if (sh.obtainedMethod !== 'wild' || sh.dateObtained !== 2000000 || !sh.isShiny) bad('a shiny copy keeps its date and origin');
  if (s.team[0].uid !== sn.pokemonUUID || s.team[1].uid !== sh.pokemonUUID) bad('team slots link to the matching copy');
  const ids = JSON.stringify(s.box), team = JSON.stringify(s.team);
  for (let i = 0; i < 3; i++) C.linkTeam(s);
  if (JSON.stringify(s.box) !== ids || JSON.stringify(s.team) !== team) bad('linkTeam run again changes nothing');
  if (typeof C.fill !== 'undefined') bad('G.Copies.fill is gone (step 3a-2), or a sold copy comes back');
  s.team[1] = { dex: 25, shiny: false }; C.linkTeam(s); if (s.team[1].uid !== nm.pokemonUUID) bad('a slot the menu rewrote links again');
  s.team[1].uid = sh.pokemonUUID; C.linkTeam(s); if (s.team[1].uid !== nm.pokemonUUID) bad('a uid that does not fit the slot is replaced');
  s.team[1].uid = 'junk'; C.linkTeam(s); if (s.team[1].uid !== nm.pokemonUUID) bad('a junk uid is replaced');
  s.team[2] = { dex: 150, shiny: false }; C.linkTeam(s); if (s.team[2].uid) bad('no copy, no uid');
  console.log('5 copies keep their date and origin; team slots link and relink; no fill'); }

// 6. clean: a hand-edited box
{ const good = JSON.parse(LINE);
  const s = { box: [JSON.parse(LINE), JSON.parse(LINE), { u: 'short', d: 143 }, null, { ...good, u: 'AAAAAAAAAAAAAAAAAAAAAA', d: 99999 },
    { u: 'BBBBBBBBBBBBBBBBBBBBBB', d: 143, t: -5, m: '?', n: 99, i: 'x!', g: 7, x: 999, y: -1, a: 9, s: 'yes', e: [999, 999, 999, 999, 999, 999], k: 'A name that is much too long', h: 9999, p: { dmg: 77 }, f: 'x', l: 0 },
    { u: 'CCCCCCCCCCCCCCCCCCCCCC', d: 81, t: 1, m: 'g', n: 1, i: 'AAAAAA', g: 0, x: 1, y: 1, a: 3 }] };
  C.clean(s);
  if (s.box.length !== 3) bad('repeat, short id, null and unknown species go: ' + s.box.length);
  if (!same(s.box[0], good)) bad('a valid copy is unchanged');
  const c = C.read(s.box[1], {});
  if (c.dateObtained !== 0 || c.obtainedMethod !== 'other' || c.nature !== 'serious' || !same(c.iv, [0, 0, 0, 0, 0, 0]) || c.gender !== 'male' || c.heightScale !== 255 || c.weightScale !== 0 || c.abilitySlot !== 1 || !c.isShiny) bad('clamped fields ' + JSON.stringify(c));
  if (!same(c.ev, [252, 252, 6, 0, 0, 0])) bad('EVs capped at 252 and 510 total ' + c.ev);
  if (c.nickname !== 'A name that is m' || c.friendship !== 255 || c.upgrades.dmg !== 5 || !c.isFavorite || c.isLocked) bad('nickname cut to 16 (3b-2 E1), friendship, rank, flags ' + JSON.stringify(c));
  const m = C.read(s.box[2], {}); if (m.gender !== 'none') bad('a genderless species stays genderless'); if (m.abilitySlot !== 3 && !T.SPECIES[81][1][2]) bad('slot');
  const x = { box: 'nope' }; C.clean(x); if (!same(x.box, [])) bad('a box that is not a list is emptied');
  console.log('6 clean: bad records go, values clamp, a valid copy is untouched'); }

// 7. real db.js: the clean save checkpoint, fresh saves, team links through commit and reload
(async () => {
  load('js/core/db.js', 'PB_DB');
  const D = G.DB, K = 'tester', SAVE = 'ps.save.' + K, BACK = 'ps.backup.prebox.' + K;
  const acc = { [K]: { name: 'Tester', salt: 'x', hash: 'y', created: 1 } };
  const put = (k, v) => store.set(k, JSON.stringify(v)), getj = k => JSON.parse(store.get(k) || 'null');
  const OLD = { v: 3, name: 'Tester', coins: 4242, owned: { 7: { at: 5000, from: 'starter' } }, shiny: {}, partner: 7, team: [{ dex: 7, shiny: false }, null, null, null, null, null], stats: { runs: 9 }, tickets: { t1: 1, t10: 0 } };
  put('ps.accounts', acc); put('ps.session', K); put(SAVE, OLD);
  await D.ready();
  let s = D.save;
  if (!s || s.partner !== null || Object.keys(s.owned).length || s.stats.runs !== 0 || !same(s.box, [])) bad('an old save starts clean ' + JSON.stringify(s && s.partner));
  if (!same(getj(BACK), OLD)) bad('the old save is kept whole as the backup');
  if (!Array.isArray(getj(SAVE).box) || getj(SAVE).coins === 4242) bad('the save on disk is the clean one');
  if (!same(getj('ps.accounts'), acc)) bad('the account is untouched');
  if (D.takeResetNotice() !== true || D.takeResetNotice() !== false) bad('the notice shows once');
  if (!/^[0-9a-f-]{36}$/.test(s.trainerId || '')) bad('a new save has a trainer id');

  // A starter through obtain, as the personality test does it.
  D.obtain(7, false, 'starter'); s.partner = 7; s.team[0] = { dex: 7, shiny: false }; D.commit(true);
  if (s.box.length !== 1 || s.team[0].uid !== C.all(s)[0].pokemonUUID || C.all(s)[0].obtainedMethod !== 'starter') bad('a starter is one copy, linked to its slot on commit');
  D.obtain(25, true, 'wild'); D.obtain(4, false, 'rescue'); D.commit(true);
  if (s.box.length !== 3) bad('a new shiny is one copy (no free normal) and a rescue another: 3 in all, got ' + s.box.length);
  D.grant(1, 'debug'); D.commit(true);
  if (s.box.length !== 3 || !s.owned[1]) bad('a Pokedex record alone makes no copy on commit, got ' + s.box.length);
  const disk = JSON.stringify(getj(SAVE).box), lead = s.team[0].uid, tr = s.trainerId;
  if (disk !== JSON.stringify(s.box)) bad('the box reaches the disk');

  // Reload: the same copies, no second reset, the backup is not overwritten.
  const back = store.get(BACK);
  load('js/core/db.js', 'PB_DB'); await G.DB.ready(); const r = G.DB.save;
  if (JSON.stringify(r.box) !== disk || r.team[0].uid !== lead || r.trainerId !== tr) bad('a reload keeps the same copies, links and trainer id');
  if (G.DB.takeResetNotice()) bad('no second notice');
  if (store.get(BACK) !== back) bad('the backup is not overwritten');

  // A copy taken out of the box stays out through a commit and a reload (what fill would undo once selling exists).
  r.box = r.box.filter(c => c.d !== 4); G.DB.commit(true);
  load('js/core/db.js', 'PB_DB'); await G.DB.ready();
  if (G.DB.save.box.some(c => c.d === 4) || G.DB.save.box.length !== 2 || !G.DB.save.owned[4]) bad('a removed copy does not come back, and the Pokedex keeps the species');

  // A second old save must not replace the first backup.
  put(SAVE, { ...OLD, coins: 1 }); load('js/core/db.js', 'PB_DB'); await G.DB.ready();
  if (getj(BACK).coins !== 4242) bad('the first backup wins');
  // Guests: a new save, nothing written.
  const n = store.size; G.DB.playAsGuest(); G.DB.obtain(1, false, 'starter'); G.DB.commit(); if (G.DB.save.box.length !== 1 || store.size > n) bad('a guest has copies and writes nothing');
  console.log('7 clean save checkpoint: backup, one notice, accounts kept; copies come only from obtain; a removed copy stays gone');

  // 8. display values, by hand from pokeapi
  { const hard = C.read({ u: 'fzwqnksdToqcIV0Oj2obNA', d: 143, t: 1, m: 'g', n: 1, i: 'AAAAAA', g: 0, x: 0, y: 0, a: 3 }, {});
    if (hard.abilityName !== 'Gluttony' || !hard.abilityHidden || hard.natureName !== 'Hardy') bad('hidden ability and nature names ' + hard.abilityName + ' ' + hard.natureName);
    const sp = C.species(143); if (!same(sp.abilities, [{ name: 'Immunity', hidden: false }, { name: 'Thick Fat', hidden: false }, { name: 'Gluttony', hidden: true }]) || sp.heightM !== 2.1 || sp.weightKg !== 460) bad('species view ' + JSON.stringify(sp));
    if (!same(C.species(151).abilities, [{ name: 'Synchronize', hidden: false }])) bad('Mew has one ability'); }

  // 9. boxes
  { const b = { box: [], owned: {}, shiny: {}, team: [null, null, null, null, null, null] };
    if (C.boxCount(b) !== 2 || C.boxCount({ boxCount: 99 }) !== 5 || C.boxCount({ boxCount: 0 }) !== 2) bad('2 to 5 boxes');
    for (let i = 0; i < 500; i++) C.add(b, { dex: 143, from: 'debug' }, rnd);
    if (C.inBox(b, 0) !== 500 || C.inBox(b, 1) !== 0 || b.box.some(c => 'b' in c)) bad('the first 500 fill box 1, no box field saved');
    const c = C.read(C.add(b, { dex: 143, from: 'debug' }, rnd), b);
    if (c.box !== 1 || C.inBox(b, 1) !== 1) bad('copy 501 goes to box 2');
    if (C.move(b, c.pokemonUUID, 0) !== 'full' || C.get(b, c.pokemonUUID).box !== 1) bad('a full box takes no more');
    if (C.move(b, c.pokemonUUID, 2) !== 'none') bad('a box you do not have');
    const first = C.read(b.box[0], b);
    if (C.move(b, first.pokemonUUID, 1) !== 'ok' || C.get(b, first.pokemonUUID).box !== 1 || C.inBox(b, 0) !== 499) bad('a move');
    if (C.move(b, c.pokemonUUID, 0) !== 'ok' || 'b' in b.box[b.box.length - 1]) bad('back to box 1 drops the field');
    const j = { boxCount: 3, box: [{ u: 'AAAAAAAAAAAAAAAAAAAAAA', d: 143, t: 1, m: 'g', n: 1, i: 'AAAAAA', g: 0, x: 1, y: 1, a: 1, b: 9 }] }; C.clean(j); if (j.box[0].b !== 2) bad('a box past your count is clamped');
    console.log('8 display labels and species view; 9 boxes: 500 each, overflow to the next, moves, clean'); }

  // 10. real normalizeTeam: copies on a team
  { const D2 = G.DB; D2.playAsGuest(); const t = D2.save; D2.grant(7, 'starter'); t.partner = 7; D2.normalizeTeam(t);
    for (let i = 0; i < 3; i++) C.add(t, { dex: 7, from: 'debug' }, rnd);
    const ids = C.all(t).map(c => c.pokemonUUID);
    const slot = i => ({ dex: 7, shiny: false, uid: ids[i] });
    t.team = [slot(0), slot(1), slot(2), null, null, null]; D2.normalizeTeam(t);
    if (!same(t.team.slice(0, 3).map(x => x && x.uid), ids.slice(0, 3))) bad('three copies of one species keep their slots ' + JSON.stringify(t.team));
    t.team = [slot(0), slot(1), slot(1), null, null, null]; D2.normalizeTeam(t);
    if (!t.team[0] || t.team[1].uid !== ids[1] || t.team[2] !== null) bad('one copy cannot fill two slots ' + JSON.stringify(t.team));
    D2.obtain(25, false, 'starter'); D2.normalizeTeam(t); const pika = C.all(t).find(c => c.speciesID === 25).pokemonUUID;
    t.team = [slot(0), { dex: 25, shiny: false, uid: pika }, null, null, null, null]; t.partner = 25; D2.normalizeTeam(t);
    if (t.team[0].uid !== pika || t.team[1] !== null) bad('a new lead already on the team moves up ' + JSON.stringify(t.team));
    t.team = [{ dex: 25, shiny: false }, { dex: 25, shiny: false }, null, null, null, null]; D2.normalizeTeam(t);
    if (t.team[0].uid !== pika || t.team[1] !== null) bad('a repeat with no copy of its own is emptied ' + JSON.stringify(t.team));
    t.partner = 7; t.team = [slot(2), slot(0), null, null, null, null]; D2.normalizeTeam(t);
    if (t.team[0].uid !== ids[2] || t.team[1].uid !== ids[0]) bad('the chosen copy stays the lead ' + JSON.stringify(t.team));
    console.log('10 teams: the same species many times, never one copy twice, the lead keeps its copy'); }

  // 11. buying boxes (step 3a-1). Prices from pokebox-plan "Rulings for step 3": Box 3 10,000, Box 4 25,000, Box 5 60,000, in order.
  { if (C.boxPrice(3) !== 10000 || C.boxPrice(4) !== 25000 || C.boxPrice(5) !== 60000) bad('box prices ' + [3, 4, 5].map(C.boxPrice));
    if (C.boxPrice(1) !== null || C.boxPrice(2) !== null || C.boxPrice(6) !== null) bad('boxes 1, 2 and 6 are never sold');
    const s = { coins: 95000, boxCount: 2, box: [] };
    const want = (r, ok, boxes, coins, count, why) => {
      if (!!r.ok !== ok || (ok ? r.boxes !== boxes : r.error !== boxes) || s.coins !== coins || s.boxCount !== count) bad(why + ' ' + JSON.stringify(r) + ' coins ' + s.coins + ' boxCount ' + s.boxCount);
    };
    want(C.buyBox(s), true, 3, 85000, 3, 'Box 3 takes 10,000');
    want(C.buyBox(s), true, 4, 60000, 4, 'Box 4 takes 25,000');
    want(C.buyBox(s), true, 5, 0, 5, 'Box 5 takes 60,000');
    want(C.buyBox(s), false, 'max', 0, 5, 'no sixth box');
    s.coins = 1000000; want(C.buyBox(s), false, 'max', 1000000, 5, 'no sixth box, even when rich');
    const p = { coins: 9999, boxCount: 2, box: [] }, before = JSON.stringify(p), r = C.buyBox(p);
    if (r.ok || r.error !== 'poor' || JSON.stringify(p) !== before) bad('9,999 cannot buy Box 3 and nothing changes ' + JSON.stringify([r, p]));
    const q = { coins: 24999, boxCount: 3, box: [] }, r4 = C.buyBox(q);
    if (r4.ok || r4.error !== 'poor' || q.coins !== 24999 || q.boxCount !== 3) bad('24,999 cannot buy Box 4 ' + JSON.stringify([r4, q]));
    const z = { boxCount: 2, box: [] }, rz = C.buyBox(z);
    if (rz.ok || z.boxCount !== 2) bad('a save with no coins field buys nothing ' + JSON.stringify([rz, z]));
    const e = { coins: 10000, boxCount: 2, box: [] }, re = C.buyBox(e);
    if (!re.ok || e.coins !== 0 || e.boxCount !== 3) bad('exactly 10,000 buys Box 3 ' + JSON.stringify([re, e]));
    // A bought box is used: with Box 1 and 2 full, the next copy lands in Box 3, and clean keeps the bought count.
    const f = { coins: 10000, boxCount: 2, box: [], owned: {}, shiny: {}, team: [null, null, null, null, null, null] };
    for (let i = 0; i < 1000; i++) C.add(f, { dex: 143, from: 'debug' }, rnd);
    C.buyBox(f);
    if (C.read(C.add(f, { dex: 143, from: 'debug' }, rnd), f).box !== 2 || C.inBox(f, 2) !== 1) bad('copy 1001 goes to the bought Box 3');
    C.clean(f); if (f.boxCount !== 3 || f.box.length !== 1001) bad('clean keeps 3 boxes and every copy ' + f.boxCount + ' ' + f.box.length);
    console.log('11 buying boxes: 10,000 / 25,000 / 60,000 in order, never a sixth, short coins change nothing, Box 3 is used'); }

  // 12. G.DB.obtain, the one path every source uses (step 3a-2). Expected from the 3a-2 map, D1 to D7, by hand.
  { const D3 = G.DB; D3.playAsGuest(); const g = D3.save;
    const copiesOf = (dex, shiny) => C.all(g).filter(c => c.speciesID === dex && c.isShiny === !!shiny);
    let r = D3.obtain(143, false, 'gacha');
    const first = g.owned[143] && g.owned[143].at;
    if (!r.isNew || !first || copiesOf(143).length !== 1 || r.uid !== copiesOf(143)[0].pokemonUUID || r.box !== 0) bad('a new species: the record and one copy ' + JSON.stringify(r));
    r = D3.obtain(143, false, 'gacha');
    if (r.isNew || copiesOf(143).length !== 2 || g.owned[143].at !== first) bad('a repeat: one more copy, the record keeps its first date ' + JSON.stringify(r));
    r = D3.obtain(25, true, 'wild');
    if (!r.isNew || !g.owned[25] || !g.shiny[25] || copiesOf(25, true).length !== 1 || copiesOf(25).length !== 0) bad('a shiny of a species you lack: both records, one shiny copy only (D4)');
    r = D3.obtain(25, true, 'wild');
    if (r.isNew || copiesOf(25, true).length !== 2) bad('a repeat shiny is a second shiny copy');
    r = D3.obtain(25, false, 'rescue');
    if (r.isNew || copiesOf(25).length !== 1) bad('a normal after its shiny: a repeat for the Pokedex, and a copy');
    const BY = { starter: 1, gacha: 4, wild: 7, rescue: 39, debug: 52 };
    for (const from in BY) { const u = D3.obtain(BY[from], false, from).uid, c = u && C.get(g, u); if (!c || c.obtainedMethod !== from) bad('method ' + from + ' is kept on the copy'); }
    const before = g.box.length, o = { owned: {}, shiny: {}, box: [] };
    D3.obtain(150, true, 'gacha', o);
    if (o.box.length !== 1 || !o.shiny[150] || !o.owned[150] || g.box.length !== before || g.owned[150]) bad('obtain writes the save it is given (the gacha path)');
    r = D3.obtain(0, false, 'debug');
    if (r.uid !== null || g.box.length !== before) bad('a species with no data: a record, no copy, no crash');
    D3.grant(16, 'debug'); D3.normalizeTeam(g); if (copiesOf(16).length) bad('normalizeTeam makes no copy');
    console.log('12 obtain: one copy every time, repeats too; a shiny is one copy; records keep their first date; methods kept');

    // 13. the top bar coins redraw on every save write while the bar shows (ride-along fix, D8)
    let calls = 0, hidden = false;
    global.document = { getElementById: id => (id === 'topbar' ? { classList: { contains: k => k === 'hidden' && hidden } } : null) };
    G.UI = { refreshCoins: () => calls++ };
    D3.commit(); if (calls !== 1) bad('a save write redraws the top bar coins while it shows, got ' + calls);
    hidden = true; D3.commit(); if (calls !== 1) bad('no redraw while the top bar is hidden (in a run), got ' + calls);
    hidden = false; G.UI = { refreshCoins: () => { throw new Error('bar not built'); } };
    try { D3.commit(); } catch (e) { bad('a redraw that throws never breaks a save'); }
    delete G.UI; try { D3.commit(); } catch (e) { bad('no G.UI, no redraw, no throw'); }
    delete global.document;
    console.log('13 top bar coins: redrawn on a save write when shown, not when hidden, never breaks a save'); }

  // 14. screens redraw on every save write (3a-2b, D2): G.DB.onSave. A signed-in save, so the write itself can be checked.
  put('ps.session', K); load('js/core/db.js', 'PB_DB'); await G.DB.ready();
  { const D4 = G.DB, log = [];
    if (!D4.save) bad('the tester save loads for section 14');
    D4.onSave(() => log.push('a')); D4.onSave(() => log.push('b'));
    D4.commit(); if (log.join('') !== 'ab') bad('two listeners run once per save write, in order, got ' + log.join(''));
    D4.onSave(() => { log.push('x'); throw new Error('a screen broke'); }); D4.onSave(() => log.push('c'));
    D4.save.coins = 777; log.length = 0;
    let threw = false; try { D4.commit(); } catch (e) { threw = true; }
    if (threw || log.join('') !== 'abxc') bad('a listener that throws stops neither the save nor the next listener, got ' + log.join(''));
    if (getj(SAVE).coins !== 777) bad('the save is still written when a listener throws, disk has ' + getj(SAVE).coins);
    global.document = { getElementById: id => (id === 'topbar' ? { classList: { contains: k => k === 'hidden' } } : null) };
    log.length = 0; D4.commit(); if (log.join('') !== 'abxc') bad('listeners run while the top bar is hidden (each screen decides), got ' + log.join(''));
    delete global.document;
    D4.playAsGuest(); log.length = 0; D4.commit(); if (log.join('') !== 'abxc') bad('a guest save write tells the screens too, got ' + log.join(''));
    console.log('14 save listeners: once per write, in order, a failing one stops nothing, guests and a hidden bar included'); }

  // 15. selling (3a-3). Prices from pokebox-plan "Rulings for step 3": 15 / 30 / 60 / 120 / 300 by the species' rarity, x3 shiny.
  { const RAR = { 10: 1, 25: 2, 4: 3, 143: 4, 150: 5, 7: 1 }, WANT = { 10: 15, 25: 30, 4: 60, 143: 120, 150: 300 };
    for (const d in RAR) G.DEX_BY[d].rarity = RAR[d];
    const s = { coins: 0, boxCount: 2, box: [], owned: {}, shiny: {}, team: [null, null, null, null, null, null] };
    const mk = (dex, shiny) => C.read(C.add(s, { dex, shiny, from: 'debug' }, rnd), s).pokemonUUID;
    for (const d in WANT) {
      const n = C.sellPrice(s, mk(+d, false)), sh = C.sellPrice(s, mk(+d, true));
      if (n !== WANT[d] || sh !== WANT[d] * 3) bad('dex ' + d + ' sells for ' + WANT[d] + ' and ' + WANT[d] * 3 + ' shiny, got ' + n + ' and ' + sh);
    }
    if (C.sellPrice(s, C.uuid()) !== null || C.sellPrice(s, 'junk') !== null) bad('a copy you do not have has no price');
    const keep = mk(25), go = mk(25), before = s.box.length; s.coins = 100;
    let r = C.sell(s, go);
    if (!r.ok || r.coins !== 30 || s.coins !== 130 || s.box.length !== before - 1 || C.get(s, go) || !C.get(s, keep)) bad('a sale removes that one copy and pays 30 once ' + JSON.stringify(r) + ' coins ' + s.coins);
    if (r.last) bad('other Pikachu are left, so not the last');
    r = C.sell(s, go); if (r.ok || r.error !== 'none' || s.coins !== 130) bad('selling it again does nothing ' + JSON.stringify(r));
    s.team[0] = { dex: 25, shiny: false, uid: keep };
    r = C.sell(s, keep); if (r.ok || r.error !== 'team' || !C.get(s, keep) || s.coins !== 130) bad('a copy on the team cannot be sold ' + JSON.stringify(r));
    s.team[0] = null;
    r = C.sell(s, keep, [keep]); if (r.ok || r.error !== 'team' || !C.get(s, keep) || s.coins !== 130) bad('a copy in the uncommitted team edits cannot be sold ' + JSON.stringify(r));
    const lk = mk(4); s.box[s.box.length - 1].l = 1;
    r = C.sell(s, lk); if (r.ok || r.error !== 'locked' || !C.get(s, lk) || s.coins !== 130) bad('a locked copy cannot be sold ' + JSON.stringify(r));
    if (C.sell(s, 'junk').ok || s.coins !== 130) bad('a junk id sells nothing');
    s.owned[7] = { at: 1, from: 'debug' }; const solo = mk(7);
    r = C.sell(s, solo); if (!r.ok || !r.last || r.coins !== 15 || !s.owned[7] || s.box.some(c => c.d === 7)) bad('the last copy sells, says last, the Pokedex keeps the species ' + JSON.stringify(r));
    const b2 = mk(10); C.move(s, b2, 1); const inB2 = C.inBox(s, 1), inB1 = C.inBox(s, 0);
    C.sell(s, b2); if (C.inBox(s, 1) !== inB2 - 1 || C.inBox(s, 0) !== inB1) bad('a sale from Box 2 lowers Box 2 only');
    console.log('15 selling: 15 / 30 / 60 / 120 / 300, x3 shiny; one copy, paid once; team, pending, locked refused; the last one keeps the Pokedex'); }

  // 16. a sale through the real save: commit, reload, the copy stays sold and the lead keeps its copy.
  put('ps.session', K); load('js/core/db.js', 'PB_DB'); await G.DB.ready();
  { const D5 = G.DB, t = D5.save;
    if (!t) bad('the tester save loads for section 16');
    const a = D5.obtain(25, false, 'debug').uid, b = D5.obtain(25, false, 'debug').uid;
    t.partner = 25; t.partnerShiny = false; t.team = [{ dex: 25, shiny: false, uid: a }, null, null, null, null, null]; D5.commit(true);
    const lead = t.team[0].uid, r = C.sell(t, b), coins = t.coins; D5.commit(true);
    load('js/core/db.js', 'PB_DB'); await G.DB.ready(); const u = G.DB.save;
    if (!r.ok || lead !== a || C.get(u, b) || !C.get(u, a) || u.team[0].uid !== a || u.coins !== coins) bad('a sale survives a reload and the lead keeps its copy ' + JSON.stringify([r, u.team[0], u.coins, coins]));
    if (C.sell(u, a).error !== 'team') bad('after a reload the lead still cannot be sold');
    console.log('16 a sale survives a reload; the lead keeps its copy and stays unsellable'); }

  // 17. full boxes (3a-4). 500 places per box; with none left, add saves nothing and obtain sells on arrival at the sell price.
  { const s = { coins: 0, boxCount: 2, box: [], owned: {}, shiny: {}, team: [null, null, null, null, null, null] };
    if (C.freePlaces(s) !== 1000) bad('2 empty boxes have 1,000 free places, got ' + C.freePlaces(s));
    for (let i = 0; i < 997; i++) C.add(s, { dex: 10, from: 'debug' }, rnd);
    if (C.freePlaces(s) !== 3) bad('997 copies leave 3 free places, got ' + C.freePlaces(s));
    s.coins = 10000; C.buyBox(s); s.coins = 0;
    if (C.freePlaces(s) !== 503) bad('buying Box 3 adds 500 places: 503, got ' + C.freePlaces(s));
    for (let i = 0; i < 503; i++) if (!C.add(s, { dex: 10, from: 'debug' }, rnd)) bad('copy ' + (998 + i) + ' fits');
    if (C.freePlaces(s) !== 0 || C.inBox(s, 2) !== 500) bad('1,500 copies fill 3 boxes, free ' + C.freePlaces(s) + ', Box 3 ' + C.inBox(s, 2));
    const n = s.box.length;
    if (C.add(s, { dex: 10, from: 'debug' }, rnd) !== null || s.box.length !== n || C.inBox(s, 2) !== 500) bad('a full set of boxes takes no copy, and the last box never overflows');
    s.boxCount = 5; let more = 0;
    for (let k = 0; k < 1100 && C.add(s, { dex: 10, from: 'debug' }, rnd); k++) more++;
    if (more !== 1000 || C.freePlaces(s) !== 0) bad('5 boxes hold 2,500 and no more, added ' + more);
    for (const [dex, sh, want] of [[10, false, 15], [25, false, 30], [4, false, 60], [143, false, 120], [150, false, 300], [150, true, 900], [10, true, 45]])
      if (C.priceFor(dex, sh) !== want) bad('priceFor ' + dex + (sh ? ' shiny' : '') + ' is ' + want + ', got ' + C.priceFor(dex, sh));
    const t = { coins: 0, boxCount: 2, box: [], owned: {}, shiny: {} }, u = C.read(C.add(t, { dex: 143, shiny: true, from: 'debug' }, rnd), t).pokemonUUID;
    if (C.priceFor(143, true) !== C.sellPrice(t, u)) bad('priceFor matches the price of a real copy');
    console.log('17 full boxes: 500 a box, 2,500 at most, a full set takes nothing; priceFor matches the sell price'); }

  // 18. obtain with full boxes: sold on arrival through the real db.js, the Pokedex still counts it, and a reload keeps it.
  put('ps.session', K); load('js/core/db.js', 'PB_DB'); await G.DB.ready();
  { const D6 = G.DB, t = D6.save;
    if (!t) bad('the tester save loads for section 18');
    t.boxCount = 2;
    for (let k = 0; k < 1100 && C.freePlaces(t) > 0; k++) C.add(t, { dex: 10, from: 'debug' }, rnd);
    delete t.owned[150]; delete t.shiny[150]; t.owned[10] = { at: 1, from: 'debug' };
    const n = t.box.length, c0 = Math.floor(+t.coins) || 0;
    let r = D6.obtain(150, true, 'gacha');
    if (r.uid !== null || r.box !== null || r.sold !== 900 || !r.isNew || t.box.length !== n) bad('a new shiny Mewtwo with full boxes is sold for 900, no copy, still new ' + JSON.stringify(r));
    if (!t.owned[150] || !t.shiny[150]) bad('a Pokemon sold on arrival is still in the Pokedex (D4)');
    if (t.coins !== c0 + 900) bad('the 900 goes to the save, coins ' + t.coins + ' from ' + c0);
    r = D6.obtain(10, false, 'rescue');
    if (r.sold !== 15 || r.isNew || t.coins !== c0 + 915) bad('a repeat Caterpie with full boxes is sold for 15 ' + JSON.stringify(r));
    D6.commit(true);
    load('js/core/db.js', 'PB_DB'); await G.DB.ready(); const v = G.DB.save;
    if (v.coins !== c0 + 915 || v.box.length !== n || !v.shiny[150]) bad('the sale on arrival survives a reload ' + JSON.stringify([v.coins, v.box.length, n]));
    console.log('18 obtain with full boxes: sold on arrival for the sell price, the Pokedex counts it, a reload keeps it'); }

  // 19. lock and favorite (3b-1, map D1 and D2). Compact form: l and f are 1 when on, the key is absent when off.
  { const s = { coins: 0, boxCount: 2, box: [], owned: {}, shiny: {}, team: [null, null, null, null, null, null] };
    const a = C.read(C.add(s, { dex: 25, from: 'debug' }, rnd), s).pokemonUUID, b = C.read(C.add(s, { dex: 25, from: 'debug' }, rnd), s).pokemonUUID;
    const rec = id => s.box.find(c => c.u === C.shortId(id));
    if (C.setLocked(s, a, true) !== true || rec(a).l !== 1 || !C.get(s, a).isLocked) bad('lock on: l is 1 and the copy reads locked');
    if (C.setFavorite(s, a, true) !== true || rec(a).f !== 1 || !C.get(s, a).isFavorite || !C.get(s, a).isLocked) bad('favorite on as well: both flags set');
    if ('f' in rec(b) || 'l' in rec(b)) bad('the other copy is untouched');
    C.setLocked(s, a, false); if ('l' in rec(a) || C.get(s, a).isLocked || !C.get(s, a).isFavorite) bad('lock off: the key is gone, favorite stays');
    C.setFavorite(s, a, false); if ('f' in rec(a) || C.get(s, a).isFavorite) bad('favorite off: the key is gone');
    const before = JSON.stringify(s.box);
    if (C.setLocked(s, C.uuid(), true) !== false || C.setFavorite(s, 'junk', true) !== false || JSON.stringify(s.box) !== before) bad('an unknown id changes nothing and returns false');
    C.setLocked(s, a, true);
    let r = C.sell(s, a); if (r.ok || r.error !== 'locked' || !C.get(s, a)) bad('a locked copy cannot be sold (D1) ' + JSON.stringify(r));
    if (C.move(s, a, 1) !== 'ok' || C.get(s, a).box !== 1 || !C.get(s, a).isLocked) bad('a locked copy still moves between boxes, still locked (D1)');
    C.setFavorite(s, b, true); r = C.sell(s, b); if (!r.ok || r.coins !== 30) bad('a favorite can still be sold on its own (D2) ' + JSON.stringify(r));
    console.log('19 lock and favorite: on writes 1, off removes the key; a locked copy cannot be sold but moves; a favorite still sells'); }

  // 19b. both flags survive a commit and a reload through the real db.js.
  put('ps.session', K); load('js/core/db.js', 'PB_DB'); await G.DB.ready();
  { const t = G.DB.save, c = t && C.all(t).find(x => x.speciesID === 10);
    if (!c) bad('section 19b needs a Caterpie copy on the tester save');
    else { C.setLocked(t, c.pokemonUUID, true); C.setFavorite(t, c.pokemonUUID, true); G.DB.commit(true);
      load('js/core/db.js', 'PB_DB'); await G.DB.ready(); const v = C.get(G.DB.save, c.pokemonUUID);
      if (!v || !v.isLocked || !v.isFavorite) bad('lock and favorite survive a reload'); }
    console.log('19b lock and favorite survive a commit and a reload'); }

  // 20. nicknames (3b-2 D6, E1, E2). Expected strings worked out by hand from the rules: the font's Latin set only, no < > & " ' ` \ = { },
  //     no-break space to space, soft hyphen dropped, spaces squeezed and trimmed, 16 at most.
  { const N = C.cleanNickname;
    const CASES = [
      ['  Sparky  ', 'Sparky'], ['Abcdefghijklmnopq', 'Abcdefghijklmnop'], ['Zo\u00eb', 'Zo\u00eb'], ['Pika\u{1F600}', 'Pika'],
      ['\u65e5\u672c', ''], ['   ', ''], ['', ''], [null, ''],
      ['<b>Hi</b>', 'bHi/b'], ['a"b', 'ab'], ["it's", 'its'], ['x=`y`', 'xy'], ['{a}\\b&c', 'abc'],
      ['Bob\u200b', 'Bob'], ['A\u202eB', 'AB'], ['Mr\u00a0\u00a0Mime', 'Mr Mime'], ['Mr   Mime', 'Mr Mime'], ['so\u00adft', 'soft'],
      ['tab\tnew\nline', 'tabnewline'], ['<img onerror=x>', 'img onerrorx'], ['abcdefghijklmno pqr', 'abcdefghijklmno'],
    ];
    for (const [inp, want] of CASES) if (N(inp) !== want) bad('cleanNickname ' + JSON.stringify(inp) + ' is ' + JSON.stringify(want) + ', got ' + JSON.stringify(N(inp)));
    if (N('Mr ', true) !== 'Mr ' || N('  a  b', true) !== '  a  b') bad('while typing, spaces are kept so a space can be typed');
    if (N('<x>"y', true) !== 'xy' || N('Abcdefghijklmnopq', true).length !== 16) bad('while typing, characters are still dropped and capped');
    if (C.NICK_MAX !== 16) bad('16 characters (E1), got ' + C.NICK_MAX);
    const s = { coins: 0, boxCount: 2, box: [], owned: {}, shiny: {}, team: [null, null, null, null, null, null] };
    const u = C.read(C.add(s, { dex: 25, from: 'debug' }, rnd), s).pokemonUUID, rec = () => s.box.find(c => c.u === C.shortId(u));
    if (C.setNickname(s, u, '  Sparky<3 ') !== 'Sparky3' || rec().k !== 'Sparky3' || C.get(s, u).nickname !== 'Sparky3') bad('setNickname stores the cleaned name');
    if (C.setNickname(s, u, '\u65e5\u672c') !== '' || 'k' in rec() || C.get(s, u).nickname !== '') bad('a name that cleans to nothing clears it: no k key, the species name shows');
    const before = JSON.stringify(s.box);
    if (C.setNickname(s, C.uuid(), 'X') !== null || C.setNickname(s, 'junk', 'X') !== null || JSON.stringify(s.box) !== before) bad('an unknown id renames nothing and returns null');
    const h = { box: [{ u: 'DDDDDDDDDDDDDDDDDDDDDD', d: 25, t: 1, m: 'g', n: 1, i: 'AAAAAA', g: 0, x: 1, y: 1, a: 1, k: '<img onerror=x>' },
      { u: 'EEEEEEEEEEEEEEEEEEEEEE', d: 25, t: 1, m: 'g', n: 1, i: 'AAAAAA', g: 0, x: 1, y: 1, a: 1, k: '\u202e\u200b' },
      { u: 'FFFFFFFFFFFFFFFFFFFFFF', d: 25, t: 1, m: 'g', n: 1, i: 'AAAAAA', g: 0, x: 1, y: 1, a: 1, k: 'Twelve chars' }] };
    C.clean(h);
    if (h.box[0].k !== 'img onerrorx' || 'k' in h.box[1] || h.box[2].k !== 'Twelve chars') bad('clean() cleans a hand-edited save the same way, old names untouched ' + JSON.stringify(h.box.map(c => c.k)));
    console.log('20 nicknames: the font set only, markup characters dropped, spaces squeezed, 16 max; setNickname and clean() share the rule'); }

  // 20b. a nickname survives a commit and a reload through the real db.js, cleaned on the way in.
  put('ps.session', K); load('js/core/db.js', 'PB_DB'); await G.DB.ready();
  { const t = G.DB.save, c = t && C.all(t).find(x => x.speciesID === 10);
    if (!c) bad('section 20b needs a Caterpie copy on the tester save');
    else { C.setNickname(t, c.pokemonUUID, 'Wormy  McWormface'); G.DB.commit(true);
      load('js/core/db.js', 'PB_DB'); await G.DB.ready(); const v = C.get(G.DB.save, c.pokemonUUID);
      if (!v || v.nickname !== 'Wormy McWormface') bad('a nickname survives a reload, got ' + (v && JSON.stringify(v.nickname))); }
    console.log('20b a nickname survives a commit and a reload'); }

  // 21. bulk sell and "Select repeats" (3b-3, map D10 to D12). Prices by hand: Caterpie 1 star 15, Pikachu 2 star 30.
  { const s = { coins: 0, boxCount: 2, box: [], owned: {}, shiny: {}, team: [null, null, null, null, null, null] };
    const mk = (dex, o = {}) => { const c = C.add(s, { dex, shiny: o.shiny, from: 'debug' }, rnd); if (o.i) c.i = o.i; if (o.t) c.t = o.t; if (o.box) c.b = o.box; return C.longId(c.u); };
    const five = [1, 2, 3, 4, 5].map(() => mk(10));
    let r = C.sellMany(s, five);
    if (r.sold !== 5 || r.coins !== 75 || s.coins !== 75 || five.some(id => C.get(s, id)) || r.ids.length !== 5) bad('5 Caterpie sell for 75 in one batch ' + JSON.stringify(r));
    const tm = mk(10), pd = mk(10), lk = mk(10), fv = mk(10), x = mk(10);
    s.team[0] = { dex: 10, shiny: false, uid: tm }; C.setLocked(s, lk, true); C.setFavorite(s, fv, true); s.coins = 0;
    r = C.sellMany(s, [tm, pd, lk, fv, x, 'junk', x], [pd]);
    const sk = r.skipped;
    if (r.sold !== 1 || r.coins !== 15 || s.coins !== 15 || sk.team !== 2 || sk.locked !== 1 || sk.favorite !== 1 || sk.none !== 1) bad('a mixed batch sells only the plain one, once; team, pending, locked, favorite and junk are skipped and counted ' + JSON.stringify(r));
    if (![tm, pd, lk, fv].every(id => C.get(s, id)) || C.get(s, x)) bad('the skipped copies are all still there, the plain one is gone');
    // Select repeats: 4 Pikachu in Box 1 with IV totals 10, 90, 50, 90 (the 2nd is older than the 4th). The older 90 is kept.
    const t = { coins: 0, boxCount: 2, box: [], owned: {}, shiny: {}, team: [null, null, null, null, null, null] };
    const mt = (dex, o = {}) => { const c = C.add(t, { dex, shiny: o.shiny, from: 'debug' }, rnd); if (o.i) c.i = o.i; if (o.t) c.t = o.t; if (o.box) c.b = o.box; return C.longId(c.u); };
    const p1 = mt(25, { i: 'KAAAAA', t: 400 }), p2 = mt(25, { i: '774AAA', t: 100 }), p3 = mt(25, { i: '7TAAAA', t: 300 }), p4 = mt(25, { i: '774AAA', t: 200 });
    const lone = mt(10), shinyP = mt(25, { shiny: true, i: 'AAAAAA', t: 50 });
    const set = a => JSON.stringify([...a].sort()), want = (a, b, why) => { if (set(a) !== set(b)) bad(why + ' got ' + JSON.stringify(a)); };
    want(C.repeatsIn(t, 0), [p1, p3, p4], 'the best IVs then the oldest are kept: the older 90 (p2); the lone Caterpie and the lone shiny are never picked');
    C.setFavorite(t, p3, true); want(C.repeatsIn(t, 0), [p1, p2, p4], 'a favorite is kept over better IVs, and never picked');
    C.setFavorite(t, p3, false); C.setLocked(t, p3, true); want(C.repeatsIn(t, 0), [p1, p2, p4], 'a locked one is kept over better IVs, and never picked');
    C.setLocked(t, p3, false); t.team[0] = { dex: 25, shiny: false, uid: p1 }; want(C.repeatsIn(t, 0), [p2, p3, p4], 'the team copy is kept over better IVs, and never picked');
    t.team[0] = null; want(C.repeatsIn(t, 0, [p4]), [p1, p2, p3], 'a copy in the uncommitted team edits is kept and never picked');
    const other = mt(25, { box: 1 }); want(C.repeatsIn(t, 0), [p1, p3, p4], 'a Pikachu in Box 2 does not change Box 1');
    want(C.repeatsIn(t, 1), [], 'a lone copy in Box 2 is not a repeat');
    if (C.get(t, lone) === null || C.get(t, shinyP) === null || C.get(t, other) === null) bad('repeatsIn only reads');
    // Pokebox step 5 F9: the copy with more EVs is kept over better IVs; equal EVs fall back to IVs, then the oldest.
    { const q = { coins: 0, boxCount: 2, box: [], owned: {}, shiny: {}, team: [null, null, null, null, null, null] };
      const mq = (o) => { const c = C.add(q, { dex: 25, from: 'debug' }, rnd); c.i = o.i; c.t = o.t; if (o.e) c.e = o.e; return C.longId(c.u); };
      const hiIv = mq({ i: '777777', t: 100 }), evd = mq({ i: 'AAAAAA', t: 300, e: [4, 0, 0, 0, 0, 0] }), plain = mq({ i: 'BAAAAA', t: 200 });
      const rec = id => q.box.find(c => C.longId(c.u) === id);
      want(C.repeatsIn(q, 0), [hiIv, plain], 'the copy with 4 EVs is kept over one with 31 in every IV (F9)');
      rec(hiIv).e = [0, 0, 4, 0, 0, 0]; want(C.repeatsIn(q, 0), [evd, plain], 'equal EVs (4 and 4): the better IVs are kept');
      rec(hiIv).i = 'AAAAAA'; want(C.repeatsIn(q, 0), [evd, plain], 'equal EVs and IVs: the oldest is kept'); }
    console.log('21 bulk sell: each once, team / pending / locked / favorite skipped; Select repeats keeps team, locked, favorite, most EVs, best IVs, oldest, per box, shinies apart'); }
  console.log(fail ? fail + ' FAILED' : 'pokebox-copies harness: all passed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL', e && e.stack); process.exit(1); });
