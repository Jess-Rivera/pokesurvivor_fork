// Rescue event (#135, S4) and catch phase (#136, S5) offline checks (Node only). Usage from the repo root:  node docs/proposals/rescue-harness.js .
// Real js/systems/rescue.js, js/systems/catch.js, js/systems/copies.js, js/core/db.js (a guest save, never stored),
// js/data/stage-one.js, js/data/pokedex.js, js/data/sprites-meta.js and js/data/species-traits.js, with stubbed engine globals.
// The expected values come from the acquisition spec sections 2 to 4 (docs/ASCII Concept Maps/Old txt files/Acquisition v2 -
// Spec.txt: the cadence figures, the pool table, the 8:4:2:1 weights, the nature buckets, a 6-ball start) and from pokeapi's
// pokemon_species.csv read here on its own, never from what the modules print. Part 6 checks relations (docs/TEST-FIRST.md).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
global.window = global;
let s = 987654; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
const said = [];
const guards = [];
global.G = {
  Coop: { active: false },
  GymArena: { inArena: false },
  Enemies: { region: 1, eliteDef: () => ({ dex: 6, baseHp: 78 }), scale: () => ({}) },
  Elites: { K: { powMul: 1.5, xpMul: 1.2 }, hpFor: () => ({ hp: 500, mul: 4 }) },
  Sprites: { Animator: class { update() {} loop() {} draw() {} }, bodyRadius: () => 10, preload() {} },
  World: { isFree: () => true },
  Camera: { outerRadius: () => 500 },
  Spawner: { say: (text) => said.push(text) },
  EnemyMgr: { add: e => guards.push(e) },
  Audio: { sfx() {} },
  UberElite: class { constructor(def, x, y) { this.def = def; this.x = x; this.y = y; this.dead = false; this.leaving = false; } },
  Game: { player: { x: 0, y: 0, dead: false }, st: { time: 100 }, openCatch: () => false },
};
load('js/data/pokedex.js'); load('js/data/sprites-meta.js'); load('js/data/species-traits.js'); load('js/data/stage-one.js');
load('js/systems/copies.js'); load('js/core/db.js'); load('js/systems/catch.js');
load('js/systems/rescue.js');
G.DB.playAsGuest(); // a fresh save in memory: the belt and the box the catch writes to
const Rz = G.Rescue, K = Rz.K;
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
Math.random = () => 0.999; // the clock-driven rolls in update() never fire on their own; each event is started with debugFire

// 1. the cadence: certain by roll 25, back to the base after a rescue, a miss adds one step (spec: 4% base, +4% after each failed roll)
{ Rz.reset(); let fired = 0, rolls = 0;
  for (; rolls < 40 && !fired; rolls++) fired = Rz.tickRoll(K.rollEvery, () => 0.999) ? rolls + 1 : 0;
  if (fired !== 25) bad('a rescue is certain by roll 25, fired at ' + fired);
  if (Rz.chance() !== K.baseChance) bad('the chance is back to the base after a rescue');
  Rz.tickRoll(K.rollEvery, () => 0.999);
  if (!near(Rz.chance(), K.baseChance + K.chanceStep, 1e-9)) bad('a miss adds one step to the chance');
  console.log('1 cadence: certain by roll 25, reset after a rescue, one step per miss'); }

// 2. the expected rescues by minute 10 / 20 / 30 / 60: the spec's figures, from an exact walk of its rule, then the module by simulation
{ const exact = n => { let d = new Map([[0, 1]]), total = 0; // fails so far -> probability
    for (let i = 0; i < n; i++) { const next = new Map(); for (const [f, p] of d) { const c = Math.min(1, 0.04 * (f + 1)); total += p * c; next.set(0, (next.get(0) || 0) + p * c); next.set(f + 1, (next.get(f + 1) || 0) + p * (1 - c)); } d = next; }
    return total; };
  for (const [mins, want] of [[10, 1.4], [20, 3.1], [30, 4.7], [60, 9.8]]) {
    if (!near(exact(mins), want, 0.06)) bad('the spec rule gives ' + exact(mins).toFixed(2) + ' rescues by ' + mins + ' min, the spec says about ' + want);
    let count = 0; const runs = 4000;
    for (let r = 0; r < runs; r++) { Rz.reset(); for (let i = 0; i < mins; i++) if (Rz.tickRoll(K.rollEvery, rnd)) count++; }
    if (!near(count / runs, exact(mins), 0.08)) bad('simulated ' + (count / runs).toFixed(2) + ' rescues by ' + mins + ' min, the rule gives ' + exact(mins).toFixed(2));
  }
  Rz.reset(); for (let i = 0; i < 500; i++) Rz.update(0, G.Game.player, 100);
  if (Rz.chance() !== K.baseChance || Rz.active) bad('no run time passing: no roll');
  console.log('2 expected rescues by 10 / 20 / 30 / 60 min match the spec, and no time means no roll'); }

// 3. the pool: the spec's table per region, and every member is Stage 1 by pokeapi's own csv (plus Gholdengo, the one exception)
{ const lines = fs.readFileSync(R + '/pokeapi-master/data/v2/csv/pokemon_species.csv', 'utf8').trim().split(/\r?\n/);
  const head = lines[0].split(','), idC = head.indexOf('id'), fromC = head.indexOf('evolves_from_species_id');
  const hasPre = new Set(lines.slice(1).map(l => l.split(',')).filter(c => c[fromC]).map(c => +c[idC]));
  const SPEC = { 1: [63, 32, 23, 4, 4], 2: [48, 24, 12, 10, 2], 3: [63, 37, 14, 12, 0], 4: [38, 20, 14, 4, 0], 5: [62, 36, 15, 10, 1], 6: [31, 14, 12, 3, 2], 7: [43, 13, 8, 12, 10], 8: [34, 23, 0, 6, 5], 9: [42, 24, 3, 3, 12] };
  for (let g = 1; g <= 9; g++) {
    const p = Rz.pool(g), got = [p.length, 1, 2, 3, 4].map((r, i) => (i ? p.filter(x => x.rarity === r).length : r));
    if (got.join() !== SPEC[g].join()) bad('region ' + g + ' pool (total, 1 to 4 star) ' + got.join('/') + ' want ' + SPEC[g].join('/'));
    for (const m of p) {
      if (m.gen !== g || m.rarity < 1 || m.rarity > 4 || m.leg || !G.SPRITE_META[m.dex]) bad(m.name + ' does not belong to the region ' + g + ' pool');
      if (hasPre.has(m.dex) && m.dex !== 1000) bad(m.name + ' has a pre-evolution but is in the pool');
    }
  }
  if (Rz.pool(null).length < Rz.pool(1).length * 5) bad('All regions pools every gen');
  if (Rz.pool(9).some(m => m.dex === 617) || Rz.pool(5).some(m => m.dex === 617)) bad('Accelgor is not Stage 1 (Karrablast with a Shed Shell makes it)');
  console.log('3 pool per region matches the spec table; every member is Stage 1 by pokeapi (Gholdengo the exception)'); }

// 4. the pick: weighted by star 8 : 4 : 2 : 1 (spec share of rescues for Kanto 71 / 26 / 2 / 1)
{ const N = 200000, c = [0, 0, 0, 0, 0]; for (let i = 0; i < N; i++) c[Rz.pickSpecies(1, rnd).rarity]++;
  const SHARE = [0, 0.71, 0.26, 0.02, 0.01];
  for (let r = 1; r <= 4; r++) if (!near(c[r] / N, SHARE[r], 0.01)) bad('Kanto ' + r + ' star share ' + (c[r] / N).toFixed(3) + ' want about ' + SHARE[r]);
  const per = r => c[r] / Rz.pool(1).filter(m => m.rarity === r).length;
  if (!near(per(1) / per(4), 8, 1.2) || !near(per(2) / per(4), 4, 0.8)) bad('one 1 star species is 8 times a 4 star one: ' + (per(1) / per(4)).toFixed(1));
  const seen = new Set(), names = new Set(); for (let i = 0; i < 6000; i++) { const n = Rz.rollNature(rnd); seen.add(n); }
  if (seen.size !== 25 || [...seen].some(n => n < 1 || n > 25)) bad('natures cover the pokeapi ids 1 to 25, got ' + seen.size);
  console.log('4 the pick is star weighted 8 : 4 : 2 : 1; natures cover all 25'); }

// 5. the event: toast, a guard on the map, three outcomes, and the cases that lose it
const player = G.Game.player;
const fresh = () => { Rz.reset(); said.length = 0; guards.length = 0; G.GymArena.inArena = false; G.Coop.active = false; player.dead = false; };
{ fresh();
  if (!Rz.debugFire()) bad('a rescue starts');
  const a = Rz.active, toast = said[0] || '';
  if (!a || guards.length !== 1) bad('a rescue puts one guard on the map');
  if (!new RegExp('^A ' + a.natureName + ' ' + a.name + ' needs help!$').test(toast)) bad('the toast names the nature and the species: ' + toast);
  if (Rz.debugFire()) bad('only one rescue is up at a time');
  // untouched: gone at the reach time, the guard leaves
  Rz.update(K.reachTime - 1, player, 100); if (!Rz.active) bad('still up one second before the reach time');
  Rz.update(2, player, 160);
  if (Rz.active || !Rz.lastResult || Rz.lastResult.outcome !== 'gone' || !guards[0].leaving) bad('an untouched rescue is gone at the reach time and the guard leaves');
  console.log('5a toast with the nature, one guard, one rescue at a time, gone when untouched'); }
{ fresh(); Rz.debugFire(); const guard = guards[0];
  Rz.update(10, player, 110); Rz.onUberHit(guard);
  if (Rz.fightLeft() !== K.fightTime) bad('the fight clock starts at the first hit with the whole time');
  Rz.update(K.fightTime / 4, player, 120);
  Rz.onUberDown(guard);
  const r = Rz.lastResult;
  if (!r || r.outcome !== 'won' || r.timeFraction == null || r.timeFraction <= 0 || r.timeFraction >= 1) bad('a win in time locks in a fraction between 0 and 1: ' + JSON.stringify(r));
  if (r && !near(r.timeFraction, 0.75, 0.02)) bad('a fight that used a quarter of the clock leaves about three quarters, got ' + r.timeFraction);
  if (!Rz.active || Rz.active.phase !== 'catch') bad('a won rescue with balls on the belt waits to be caught');
  console.log('5b a win in time keeps the time left as a fraction, and the Stage 1 waits'); }
{ fresh(); Rz.debugFire(); const guard = guards[0];
  Rz.onUberHit(guard); Rz.update(K.fightTime + 1, player, 200);
  if (!Rz.lastResult || Rz.lastResult.outcome !== 'slow' || Rz.lastResult.timeFraction != null || !guard.leaving || Rz.active) bad('too slow: no catch, the guard leaves');
  console.log('5c too slow loses it'); }
{ fresh(); G.GymArena.inArena = true;
  if (Rz.debugFire() || Rz.active) bad('a roll in a gym arena is lost');
  G.GymArena.inArena = false; Rz.debugFire(); G.GymArena.inArena = true; Rz.update(1, player, 100);
  if (Rz.active || !Rz.lastResult || Rz.lastResult.outcome !== 'lost') bad('entering a gym arena loses a rescue that is up');
  fresh(); G.Coop.active = true; Rz.update(K.rollEvery * 30, player, 100);
  if (Rz.active) bad('no rescue in co-op');
  fresh(); const free = G.World.isFree; G.World.isFree = () => false; Rz.debugFire();
  if (!Rz.active || Rz.hudTarget()) bad('with no free ground the rescue waits without an arrow');
  Rz.update(K.spotGiveUp + 1, player, 100); G.World.isFree = free;
  if (Rz.active || !Rz.lastResult || Rz.lastResult.outcome !== 'lost') bad('no free ground for a few seconds: the rescue is lost');
  console.log('5d lost in a gym arena, in co-op not at all, lost when no ground is free'); }

// 5e. the wait after a win (#136): touching it opens the catch, a refusal retries, untouched it wanders off, an empty belt skips it
const win = () => { fresh(); Rz.debugFire(); const guard = guards[0]; Rz.onUberHit(guard); Rz.update(10, player, 110); Rz.onUberDown(guard); return Rz.active; };
{ G.Catch.startRun(G.DB.save);
  let asked = 0; G.Game.openCatch = () => (asked++, false);
  const e = win(); player.x = 5000; player.y = 5000;
  Rz.update(1, player, 120);
  if (asked) bad('far from the Stage 1, no catch opens');
  const at = Rz.hudTarget(); player.x = at.x; player.y = at.y;
  if (at.phase !== 'catch') bad('the arrow points at the waiting Stage 1');
  Rz.update(0.1, player, 120); Rz.update(0.1, player, 120);
  if (asked < 2 || Rz.active !== e) bad('a refused catch (another screen open) is tried again next frame and the Stage 1 stays');
  let given = null; G.Game.openCatch = (res) => ((given = res), true);
  Rz.update(0.1, player, 120);
  if (!given || given.dex !== e.dex || given.nature !== e.nature || given !== Rz.lastResult || Rz.active) bad('touching it opens the catch with the won result and the Stage 1 leaves the map');
  G.Game.openCatch = () => false; player.x = 5000; player.y = 5000;
  win(); Rz.update(K.catchWait + 1, player, 200);
  if (Rz.active) bad('untouched, the Stage 1 wanders off after the catch wait');
  G.DB.save.belt.poke = 0; win();
  if (Rz.active || !said.some((t) => /ran off/.test(t))) bad('an empty belt at the win: it runs off at once');
  G.Catch.startRun(G.DB.save); player.x = 0; player.y = 0;
  console.log('5e after a win: touch opens the catch, refused retries, untouched it wanders off, empty belt it runs off'); }

// 6. the catch (#136): odds, flee, the belt and the held catches
const C = G.Catch, save = G.DB.save, CK = C.K;
const result = (dex, nature, timeFraction) => ({ outcome: 'won', dex, name: G.DEX_BY[dex].name, nature, natureName: 'x', timeFraction });
const natureId = (name) => G.SpeciesTraits.NATURES.findIndex((n) => n[0] === name) + 1;
{ // 6a odds: a relation of time left, BST inside a band, the drop between bands, and the ceiling
  const all = Rz.pool(null);
  for (const m of all) {
    if (!(C.odds(m.dex, 'poke', 1) >= C.odds(m.dex, 'poke', 0.5) && C.odds(m.dex, 'poke', 0.5) >= C.odds(m.dex, 'poke', 0))) bad(m.name + ': more time left never lowers the odds');
    if (C.odds(m.dex, 'poke', 1) > CK.ceiling + 1e-9) bad(m.name + ' passes the ceiling');
  }
  for (let r = 1; r <= 4; r++) {
    const band = all.filter((m) => m.rarity === r).sort((a, b) => a.bst - b.bst);
    for (let i = 1; i < band.length; i++) if (band[i].bst > band[i - 1].bst && !(C.baseOdds(band[i].dex) < C.baseOdds(band[i - 1].dex))) bad(r + ' star: ' + band[i].name + ' has a higher BST but no lower base than ' + band[i - 1].name);
    const next = all.filter((m) => m.rarity === r + 1);
    if (band.length && next.length && !(Math.min(...band.map((m) => C.baseOdds(m.dex))) > Math.max(...next.map((m) => C.baseOdds(m.dex))))) bad('every ' + r + ' star base is above every ' + (r + 1) + ' star base');
  }
  const top = all.filter((m) => m.rarity === 4);
  if (top.length && !top.some((m) => C.odds(m.dex, 'poke', 0) < C.odds(m.dex, 'poke', 1))) bad('a 4 star catch gains from time left');
  console.log('6a odds rise with time left, fall with BST inside a band, drop between bands, never pass the ceiling'); }
{ // 6b flee: misses until it runs off follow the nature bucket (spec: easy above default above hard)
  const misses = (name) => { C.startRun(save); C.begin(result(147, natureId(name), 0)); let n = 0, o;
    do { o = C.throwBall('poke', () => 0.9999); n++; } while (o === 'miss' && n < 50); return o === 'fled' ? n : -1; };
  const easy = ['bold', 'calm', 'lax', 'relaxed', 'docile', 'gentle', 'mild', 'quiet'].map(misses);
  const def = ['hardy', 'lonely', 'brave', 'adamant', 'impish', 'serious', 'modest', 'bashful', 'sassy', 'quirky'].map(misses);
  const hard = ['timid', 'careful', 'hasty', 'jolly', 'naive', 'rash', 'naughty'].map(misses);
  for (const [nm, list] of [['easy', easy], ['default', def], ['hard', hard]]) if (new Set(list).size !== 1 || list[0] < 1) bad('every ' + nm + ' nature allows the same misses: ' + list.join());
  if (!(easy[0] > def[0] && def[0] > hard[0])) bad('easy natures allow more misses than default, default more than hard: ' + [easy[0], def[0], hard[0]].join(' / '));
  if (easy.length + def.length + hard.length !== 25) bad('the three buckets name all 25 natures');
  console.log('6b flee by nature: easy ' + easy[0] + ' > default ' + def[0] + ' > hard ' + hard[0] + ' misses'); }
{ // 6c the belt: a new save starts with 6 (spec), each throw uses exactly one, an empty belt opens nothing, an old save gets the start belt
  C.startRun(save);
  if (C.total() !== 6 || save.belt.size !== 6) bad('a new save starts with a 6-ball belt, got ' + C.total());
  for (const roll of [0.9999, 0]) {
    if (!C.session) C.begin(result(147, natureId('bold'), 0));
    const before = C.total(); C.throwBall('poke', () => roll);
    if (C.total() !== before - 1) bad('a throw uses exactly one ball (' + (roll ? 'miss' : 'catch') + ')');
  }
  save.belt.poke = 0;
  if (C.begin(result(147, 1, 0)) !== null) bad('an empty belt opens no catch');
  save.belt.poke = 1; C.begin(result(147, natureId('bold'), 0));
  if (C.throwBall('poke', () => 0.9999) !== 'fled') bad('a miss that empties the belt: it runs off');
  if (C.throwBall('poke') !== 'none') bad('no catch open: a throw does nothing');
  const old = { coins: 0 }; C.belt(old);
  if (!old.belt || old.belt.size !== save.belt.size || old.belt.poke !== old.belt.size) bad('an old save without a belt gets the start belt');
  save.belt.poke = 2; C.startRun(save);
  if (save.belt.poke !== save.belt.size) bad('[Legacy behavior until #137] a run start refills the belt');
  console.log('6c belt: starts at 6, one ball per throw, empty opens nothing, old saves fixed, refilled at run start'); }
{ // 6d held catches: nothing enters the box mid-run; a kept run end places each with its nature, a quit places none
  C.startRun(save); const box0 = save.box.length, nat = natureId('timid');
  C.begin(result(147, nat, 1)); if (C.throwBall('poke', () => 0) !== 'caught') bad('a sure throw catches');
  C.begin(result(1, natureId('bold'), 1)); C.throwBall('poke', () => 0);
  if (C.held.length !== 2 || save.box.length !== box0) bad('catches are held, never placed mid-run');
  const lost = C.settle(false, save);
  if (save.box.length !== box0 || lost.placed.length || C.held.length) bad('a quit places none and clears the held list');
  C.begin(result(147, nat, 1)); C.throwBall('poke', () => 0);
  const kept = C.settle(true, save), copy = save.box[save.box.length - 1];
  if (save.box.length !== box0 + 1 || kept.placed.length !== 1 || C.held.length) bad('a kept run end places each held catch once');
  if (!copy || copy.d !== 147 || copy.m !== 'r' || copy.n !== nat) bad('the copy is the species, method rescue, the nature of the rescue: ' + JSON.stringify(copy));
  // a full box sells the overflow at the copy's price
  const full = { coins: 0, belt: { size: 6, poke: 6 }, boxCount: save.boxCount, owned: {}, shiny: {},
    box: Array.from({ length: 500 * save.boxCount }, (_, i) => (i >= 500 ? { u: 'x' + i, d: 1, b: Math.floor(i / 500) } : { u: 'x' + i, d: 1 })) };
  const realSave = G.DB.save; C.startRun(full);
  // begin and throwBall read the loaded save's belt; settle writes the save it is given
  C.begin(result(147, nat, 1)); C.throwBall('poke', () => 0);
  const sold = C.settle(true, full);
  if (full.box.length !== 500 * save.boxCount || sold.sold.length !== 1 || !(full.coins > 0)) bad('a full box sells the overflow for coins');
  if (realSave !== G.DB.save) bad('the test save stays loaded');
  C.startRun(save);
  console.log('6d held until the run ends: a quit loses them, a kept end places them with their nature, a full box sells'); }

console.log(fail ? fail + ' FAILED' : 'rescue harness: all passed');
process.exit(fail ? 1 : 0);
