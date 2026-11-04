// Pokebox step 1 offline checks (Node only). Usage from the repo root:  node docs/proposals/pokebox-copies-harness.js .
// Real js/systems/copies.js, js/data/species-traits.js and js/core/db.js with a fake localStorage. Expected values are hand-derived from
// docs/proposals/pokebox-plan.md and pokeapi (Snorlax 2.1 m, 460 kg, Immunity / Thick Fat / Gluttony, 12.5% female), not read back from code output.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
global.window = global;
const store = new Map();
global.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), get length() { return store.size; }, key: i => [...store.keys()][i] };
global.location = { protocol: 'file:', hostname: '', search: '', href: 'file:///dev.html' };
global.G = { U: {}, Items: null };
load('js/data/species-traits.js');
load('js/systems/copies.js');
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

// 5. fill and linkTeam
{ const owned = { 143: { at: 1793736000000, from: 'gacha' }, 25: { at: 1000000, from: 'legend' } };
  const s = { owned, shiny: { 25: { at: 2000000, from: 'wild' } }, box: [], team: [{ dex: 143, shiny: false }, { dex: 25, shiny: true }, null, null, null, null], trainerId: 'me' };
  const before = JSON.stringify([s.owned, s.shiny]);
  C.fill(s, rnd); C.linkTeam(s);
  if (s.box.length !== 3) bad('2 species + 1 shiny is 3 copies, got ' + s.box.length);
  const list = C.all(s), sn = list.find(c => c.speciesID === 143), sh = list.find(c => c.speciesID === 25 && c.isShiny), nm = list.find(c => c.speciesID === 25 && !c.isShiny);
  if (sn.dateObtained !== 1793736000000 || sn.obtainedMethod !== 'gacha') bad('a copy keeps its owned date and origin');
  if (nm.obtainedMethod !== 'other' || nm.dateObtained !== 1000000) bad('an origin no longer used becomes other');
  if (sh.obtainedMethod !== 'wild' || sh.dateObtained !== 2000000) bad('a shiny copy keeps its shiny date and origin');
  if (s.team[0].uid !== sn.pokemonUUID || s.team[1].uid !== sh.pokemonUUID) bad('team slots link to the matching copy');
  const ids = JSON.stringify(s.box), team = JSON.stringify(s.team);
  for (let i = 0; i < 3; i++) { C.fill(s, rnd); C.linkTeam(s); }
  if (JSON.stringify(s.box) !== ids || JSON.stringify(s.team) !== team) bad('fill and linkTeam run again change nothing');
  if (JSON.stringify([s.owned, s.shiny]) !== before) bad('owned and shiny are not touched');
  s.team[1] = { dex: 25, shiny: false }; C.linkTeam(s); if (s.team[1].uid !== nm.pokemonUUID) bad('a slot the menu rewrote links again');
  s.team[1].uid = sh.pokemonUUID; C.linkTeam(s); if (s.team[1].uid !== nm.pokemonUUID) bad('a uid that does not fit the slot is replaced');
  s.team[1].uid = 'junk'; C.linkTeam(s); if (s.team[1].uid !== nm.pokemonUUID) bad('a junk uid is replaced');
  s.team[2] = { dex: 150, shiny: false }; C.linkTeam(s); if (s.team[2].uid) bad('no copy, no uid');
  console.log('5 fill keeps dates and origins and only adds what is missing; team slots link and relink'); }

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
  if (c.nickname.length !== 12 || c.friendship !== 255 || c.upgrades.dmg !== 5 || !c.isFavorite || c.isLocked) bad('nickname, friendship, rank, flags ' + JSON.stringify(c));
  const m = C.read(s.box[2], {}); if (m.gender !== 'none') bad('a genderless species stays genderless'); if (m.abilitySlot !== 3 && !T.SPECIES[81][1][2]) bad('slot');
  const x = { box: 'nope' }; C.clean(x); if (!same(x.box, [])) bad('a box that is not a list is emptied');
  console.log('6 clean: bad records go, values clamp, a valid copy is untouched'); }

// 7. real db.js: the clean save checkpoint, fresh saves, team links through commit and reload
(async () => {
  load('js/core/db.js');
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

  // A starter through the existing grant path, as the personality test does it.
  D.grant(7, 'starter'); s.partner = 7; s.team[0] = { dex: 7, shiny: false }; D.commit(true);
  if (s.box.length !== 1 || s.team[0].uid !== C.all(s)[0].pokemonUUID || C.all(s)[0].obtainedMethod !== 'starter') bad('a new Pokemon becomes a copy on commit, linked to its slot');
  D.grantShiny(25, 'wild'); D.grant(4, 'rescue'); D.commit(true);
  if (s.box.length !== 4) bad('shiny + its normal + a rescue is 3 more copies, got ' + s.box.length);
  const disk = JSON.stringify(getj(SAVE).box), lead = s.team[0].uid, tr = s.trainerId;
  if (disk !== JSON.stringify(s.box)) bad('the box reaches the disk');

  // Reload: the same copies, no second reset, the backup is not overwritten.
  const back = store.get(BACK);
  load('js/core/db.js'); await G.DB.ready(); const r = G.DB.save;
  if (JSON.stringify(r.box) !== disk || r.team[0].uid !== lead || r.trainerId !== tr) bad('a reload keeps the same copies, links and trainer id');
  if (G.DB.takeResetNotice()) bad('no second notice');
  if (store.get(BACK) !== back) bad('the backup is not overwritten');

  // A second old save must not replace the first backup.
  put(SAVE, { ...OLD, coins: 1 }); load('js/core/db.js'); await G.DB.ready();
  if (getj(BACK).coins !== 4242) bad('the first backup wins');
  // Guests: a new save, nothing written.
  const n = store.size; G.DB.playAsGuest(); G.DB.grant(1, 'starter'); G.DB.commit(); if (G.DB.save.box.length !== 1 || store.size > n) bad('a guest has copies and writes nothing');
  console.log('7 clean save checkpoint: backup, one notice, accounts kept; new Pokemon become copies; a reload is stable');

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
    D2.grant(25, 'starter'); D2.normalizeTeam(t); const pika = C.all(t).find(c => c.speciesID === 25).pokemonUUID;
    t.team = [slot(0), { dex: 25, shiny: false, uid: pika }, null, null, null, null]; t.partner = 25; D2.normalizeTeam(t);
    if (t.team[0].uid !== pika || t.team[1] !== null) bad('a new lead already on the team moves up ' + JSON.stringify(t.team));
    t.team = [{ dex: 25, shiny: false }, { dex: 25, shiny: false }, null, null, null, null]; D2.normalizeTeam(t);
    if (t.team[0].uid !== pika || t.team[1] !== null) bad('a repeat with no copy of its own is emptied ' + JSON.stringify(t.team));
    t.partner = 7; t.team = [slot(2), slot(0), null, null, null, null]; D2.normalizeTeam(t);
    if (t.team[0].uid !== ids[2] || t.team[1].uid !== ids[0]) bad('the chosen copy stays the lead ' + JSON.stringify(t.team));
    console.log('10 teams: the same species many times, never one copy twice, the lead keeps its copy'); }
  console.log(fail ? fail + ' FAILED' : 'pokebox-copies harness: all passed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL', e && e.stack); process.exit(1); });
