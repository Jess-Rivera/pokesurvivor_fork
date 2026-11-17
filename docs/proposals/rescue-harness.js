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
load('js/data/balls.js'); load('js/systems/copies.js'); load('js/core/db.js'); load('js/systems/catch.js');
load('js/systems/rescue.js');
G.DB.playAsGuest(); // a fresh save in memory: the belt and the box the catch writes to
// a run start with a full belt of Poke Balls: since #137 nothing refills the belt, so the checks that throw fill it themselves
const refill = (s = G.DB.save) => { G.Catch.startRun(s); Object.assign(s.belt, { poke: s.belt.size, great: 0, ultra: 0 }); };
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
{ refill();
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
  refill(); player.x = 0; player.y = 0;
  console.log('5e after a win: touch opens the catch, refused retries, untouched it wanders off, empty belt it runs off'); }

// 6. the catch (#136): odds, flee, the belt and the held catches
const C = G.Catch, save = G.DB.save, CK = C.K;
const result = (dex, nature, timeFraction) => ({ outcome: 'won', dex, name: G.DEX_BY[dex].name, nature, natureName: 'x', timeFraction });
const natureId = (name) => G.SpeciesTraits.NATURES.findIndex((n) => n[0] === name) + 1;
{ // 6a odds (#148, Jess's shake formula): relations of time, capture rate, star, badges, World Level and the critical catch
  const all = Rz.pool(null), cr = (m) => G.DEX_BY[m.dex].cr;
  const at = (m, over) => Object.assign({ dex: m.dex, timeFraction: 0.5, worldLevel: 20, badges: 2, ownedSpecies: 0 }, over);
  const p = (m, over, ball = 'poke') => C.odds(at(m, over), ball);
  for (const m of all) {
    if (!(Number.isInteger(cr(m)) && cr(m) >= 1 && cr(m) <= 255)) bad(m.name + ' has no capture rate from 1 to 255');
    if (!(p(m, { timeFraction: 1 }) >= p(m, { timeFraction: 0.5 }) && p(m, { timeFraction: 0.5 }) >= p(m, { timeFraction: 0 }))) bad(m.name + ': a faster win never lowers the odds');
    for (let level = 2; level <= 60; level++) if (p(m, { worldLevel: level, badges: 12 }) > p(m, { worldLevel: level - 1, badges: 12 }) + 1e-12) bad(m.name + ': a lower World Level never lowers the odds (WL ' + level + ')');
    for (let badges = 1; badges <= 12; badges++) if (p(m, { worldLevel: 60, badges }) < p(m, { worldLevel: 60, badges: badges - 1 }) - 1e-12) bad(m.name + ': further over the badge cap never raises the odds');
    const cap = C.ODDS.badgeCaps[2];
    if (Math.abs(p(m, { worldLevel: cap, badges: 2 }) - p(m, { worldLevel: cap, badges: 12 })) > 1e-12) bad(m.name + ': at the badge cap, no penalty');
  }
  for (const a of all) for (const b of all) {
    if (a.rarity === b.rarity && cr(a) > cr(b) && p(a) < p(b) - 1e-12) bad(a.name + ' has a higher capture rate but lower odds than ' + b.name);
    if (cr(a) === cr(b) && a.rarity > b.rarity && p(a) > p(b) + 1e-12) bad(a.name + ' is a higher star but has higher odds than ' + b.name);
  }
  if (!all.some((m) => p(m, { worldLevel: 1, badges: 12 }) > p(m, { worldLevel: 13, badges: 12 }))) bad('an early World Level gives a bonus');
  if (all.some((m) => p(m, { worldLevel: 13, badges: 12 }) !== p(m, { worldLevel: 40, badges: 12 }))) bad('the early World Level bonus is gone from World Level 13 (no badge debt)');
  // 148c tuning (decision 2026-11-16-148-catch-tuning-steep-curve-x2-fading-bonus): the early bonus starts no higher than
  // x2 and shrinks at every World Level to 13 (a fade, not a clip); a 5 star is harder than a 4 star
  const parts = (m, over) => C.rateParts(at(m, over), 'poke');
  for (const m of all) if (parts(m, { worldLevel: 1, badges: 12 }).rate > 2 * parts(m, { worldLevel: 13, badges: 12 }).rate + 1e-9) bad(m.name + ': the World Level 1 rate is at most twice the World Level 13 rate (bonus no more than x2)');
  for (let level = 2; level <= 13; level++) if (!(parts(all[0], { worldLevel: level, badges: 12 }).earlyBonus < parts(all[0], { worldLevel: level - 1, badges: 12 }).earlyBonus)) bad('the early bonus shrinks at every World Level from 1 to 13 (WL ' + level + ')');
  const fiveStar = G.DEX.find((m) => m.rarity === 5 && m.cr), fourStar = all.find((m) => m.rarity === 4);
  if (!fiveStar || !(parts(fiveStar).star < parts(fourStar).star)) bad('a 5 star has a lower star factor than a 4 star');
  const best = { timeFraction: 1, worldLevel: 1, badges: 12, ownedSpecies: 0 };
  for (const m of all.filter((x) => x.rarity >= 4 && cr(x) <= 45)) if (!(p(m, best) < 1)) bad(m.name + ': a 4 star at capture rate 45 or less is never a sure catch with a Poke Ball');
  if (C.criticalChance(C.ODDS.rateCap, 30) !== 0) bad('30 or fewer species in the Pokedex: never a critical catch');
  if (!(C.criticalChance(C.ODDS.rateCap, 31) > 0 && C.criticalChance(C.ODDS.rateCap, 601) >= C.criticalChance(C.ODDS.rateCap, 31))) bad('from 31 species a critical catch can happen, and more species never lower it');
  // a critical catch always catches: the first roll hits the critical, every later roll would fail a shake
  const sequence = (rolls) => { let i = 0; return () => rolls[Math.min(i++, rolls.length - 1)]; };
  const owned = {}; for (let d = 1; d <= 31; d++) owned[d] = { at: 0, from: 'x' };
  const keepOwned = save.owned; save.owned = owned;
  refill(); C.begin(result(147, natureId('bold'), 0.5));
  if (C.throwBall('poke', sequence([0, 0.9999])) !== 'caught' || !C.lastThrow.critical) bad('a critical catch always catches');
  delete owned[31]; C.begin(result(147, natureId('bold'), 0.5));
  if (C.throwBall('poke', sequence([0, 0.9999])) === 'caught' || C.lastThrow.critical) bad('with 30 species owned, the same rolls are no critical catch');
  save.owned = keepOwned;
  // the wobbles tell the truth: caught means a critical or every shake passed; a miss passed fewer
  let thrown = 0;
  for (const m of all) {
    refill(); if (!C.begin(result(m.dex, natureId('bold'), rnd()))) continue;
    const outcome = C.throwBall('poke', rnd), roll = C.lastThrow; thrown++;
    if (!(roll.shakes >= 0 && roll.shakes <= C.ODDS.shakes)) bad(m.name + ': shakes ' + roll.shakes + ' out of range');
    if ((outcome === 'caught') !== (roll.critical || roll.shakes === C.ODDS.shakes)) bad(m.name + ': ' + outcome + ' with ' + roll.shakes + ' shakes');
  }
  if (!thrown) bad('no throws checked');
  console.log('6a odds rise with a faster win and capture rate, fall with star, World Level and badge debt; critical from 31 species; wobbles match the roll');
  // #137: a better ball's factor is bigger, and its odds are never lower, for every Pokemon
  const factor = (ballId) => C.rateParts(at(all[0]), ballId).ball;
  if (!(factor('ultra') > factor('great') && factor('great') > factor('poke'))) bad('the ball factor: Ultra above Great above Poke');
  for (const m of all) if (!(p(m, {}, 'ultra') >= p(m, {}, 'great') && p(m, {}, 'great') >= p(m, {}, 'poke'))) bad(m.name + ': a better ball never lowers the odds');
  console.log('6a balls: Ultra above Great above Poke, never lower odds'); }
{ // 6b flee: misses until it runs off follow the nature bucket (spec: easy above default above hard)
  const misses = (name) => { refill(); C.begin(result(147, natureId(name), 0)); let n = 0, o;
    do { o = C.throwBall('poke', () => 0.9999); n++; } while (o === 'miss' && n < 50); return o === 'fled' ? n : -1; };
  const easy = ['bold', 'calm', 'lax', 'relaxed', 'docile', 'gentle', 'mild', 'quiet'].map(misses);
  const def = ['hardy', 'lonely', 'brave', 'adamant', 'impish', 'serious', 'modest', 'bashful', 'sassy', 'quirky'].map(misses);
  const hard = ['timid', 'careful', 'hasty', 'jolly', 'naive', 'rash', 'naughty'].map(misses);
  for (const [nm, list] of [['easy', easy], ['default', def], ['hard', hard]]) if (new Set(list).size !== 1 || list[0] < 1) bad('every ' + nm + ' nature allows the same misses: ' + list.join());
  if (!(easy[0] > def[0] && def[0] > hard[0])) bad('easy natures allow more misses than default, default more than hard: ' + [easy[0], def[0], hard[0]].join(' / '));
  if (easy.length + def.length + hard.length !== 25) bad('the three buckets name all 25 natures');
  console.log('6b flee by nature: easy ' + easy[0] + ' > default ' + def[0] + ' > hard ' + hard[0] + ' misses'); }
{ // 6c the belt: a new save starts with 6 (spec), each throw uses exactly one, an empty belt opens nothing, an old save gets the start belt
  refill();
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
  if (!old.belt || old.belt.size !== 6 || old.belt.poke !== old.belt.size) bad('an old save without a belt gets the start belt');
  if (old.belt.great !== 0 || old.belt.ultra !== 0 || old.belt.unlocked.length || C.isUnlocked('great', old) || !C.isUnlocked('poke', old))
    bad('an old save has no Great or Ultra Balls and nothing unlocked; Poke needs no unlock');
  const kept = { belt: { size: 6, poke: 4 } }; C.belt(kept);
  if (kept.belt.poke !== 4 || C.total(kept) !== 4) bad('an old save keeps the balls on its belt');
  const over = { belt: { size: 6, poke: 3, great: 2, ultra: 3, unlocked: ['great', 'ultra'] } }; C.belt(over);
  if (C.total(over) !== 6 || over.belt.ultra !== 3 || over.belt.great !== 2) bad('a belt over its size is trimmed, worst tier first: ' + JSON.stringify(over.belt));
  save.belt.poke = 2; C.startRun(save);
  if (save.belt.poke !== 2) bad('a run start leaves the belt as it was (no refill, #137)');
  console.log('6c belt: starts at 6, one ball per throw, empty opens nothing, old saves fixed, a run start refills nothing'); }
{ // 6d held catches: nothing enters the box mid-run; a kept run end places each with its nature, a quit places none
  refill(); const box0 = save.box.length, nat = natureId('timid');
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
  const realSave = G.DB.save; refill(full);
  // begin and throwBall read the loaded save's belt; settle writes the save it is given
  C.begin(result(147, nat, 1)); C.throwBall('poke', () => 0);
  const sold = C.settle(true, full);
  if (full.box.length !== 500 * save.boxCount || sold.sold.length !== 1 || !(full.coins > 0)) bad('a full box sells the overflow for coins');
  if (realSave !== G.DB.save) bad('the test save stays loaded');
  refill();
  console.log('6d held until the run ends: a quit loses them, a kept end places them with their nature, a full box sells'); }
{ // 6e the shown band (Jess, 2026-11-16): 2 x bandAccuracy wide, always holds the true chance, inside 0 to 100, off-centre by the
  // catch's own shift; one shift per catch, so the same shift keeps a higher chance's range at or above a lower one's
  const reach = CK.bandAccuracy, shifts = [-reach, -reach / 2, 0, reach / 2, reach];
  const centres = new Set();
  for (let pct = 0; pct <= 100; pct++)
    for (const shift of shifts) {
      const b = C.band(pct / 100, shift);
      if (b.high - b.low !== 2 * reach) bad('a band is ' + 2 * reach + ' points wide: ' + pct + '% shift ' + shift + ' gave ' + b.low + ' to ' + b.high);
      if (!(b.low <= pct && pct <= b.high)) bad('the band holds the true chance: ' + pct + '% shift ' + shift + ' gave ' + b.low + ' to ' + b.high);
      if (b.low < 0 || b.high > 100) bad('the band stays inside 0 to 100: ' + pct + '% gave ' + b.low + ' to ' + b.high);
      if (pct === 47) centres.add(pct - (b.low + b.high) / 2);
      if (pct > 0 && C.band((pct - 1) / 100, shift).low > b.low) bad('with one shift, a higher chance never reads lower: ' + pct + '%');
    }
  if (centres.size < 3) bad('the shift moves the true chance off the middle of the band (47%: ' + [...centres].join() + ')');
  refill();
  const s1 = C.begin(result(147, natureId('bold'), 0.5), () => 0), lowShift = s1.bandShift;
  const s2 = C.begin(result(147, natureId('bold'), 0.5), () => 0.9999);
  if (!(Math.abs(lowShift) <= reach && Math.abs(s2.bandShift) <= reach && lowShift < s2.bandShift)) bad('each catch rolls its own shift inside the reach');
  C.letGo();
  console.log('6e band: ' + 2 * reach + ' wide, holds the true chance, inside 0 to 100, off-centre by a per-catch shift'); }
{ // 6f the Shop (#137): buys take exactly the price, never pass the belt, need the unlock; unlocks pay once; belts go in order
  const PRICE = Object.fromEntries(G.BALL_CATALOG.map((ball) => [ball.id, ball]));
  const shop = { coins: 1000, belt: { size: 6, poke: 2 } }; C.belt(shop);
  const snapshot = () => JSON.stringify([shop.coins, shop.belt]);
  let before = shop.coins, r = C.buyBalls(shop, 'poke', 1);
  if (!r.ok || r.bought !== 1 || before - shop.coins !== PRICE.poke.price || shop.belt.poke !== 3) bad('one Poke Ball costs its price and adds one: ' + JSON.stringify(r));
  const room = C.room(shop); before = shop.coins;
  r = C.buyBalls(shop, 'poke', 10);
  const expected = Math.min(10, room, Math.floor(before / PRICE.poke.price));
  if (!r.ok || r.bought !== expected || before - shop.coins !== expected * PRICE.poke.price) bad('Shift buys min(10, room, affordable): ' + JSON.stringify(r) + ' expected ' + expected);
  if (C.total(shop) > shop.belt.size) bad('the belt never holds more than its size');
  let was = snapshot(); r = C.buyBalls(shop, 'poke', 1);
  if (r.ok || r.error !== 'full' || snapshot() !== was) bad('a full belt refuses and changes nothing');
  shop.belt.poke = 0; shop.coins = PRICE.poke.price - 1; was = snapshot(); r = C.buyBalls(shop, 'poke', 1);
  if (r.ok || r.error !== 'poor' || snapshot() !== was) bad('too few coins refuses and changes nothing');
  shop.coins = 100000; was = snapshot(); r = C.buyBalls(shop, 'great', 1);
  if (r.ok || r.error !== 'locked' || snapshot() !== was) bad('a locked tier refuses and changes nothing');
  shop.coins = PRICE.great.unlockPrice - 1; was = snapshot(); r = C.unlockBall(shop, 'great');
  if (r.ok || r.error !== 'poor' || snapshot() !== was) bad('an unlock without the coins changes nothing');
  shop.coins = PRICE.great.unlockPrice; r = C.unlockBall(shop, 'great');
  if (!r.ok || shop.coins !== 0 || !C.isUnlocked('great', shop) || C.isUnlocked('ultra', shop)) bad('an unlock pays its price once and unlocks only that tier');
  shop.coins = 100000; was = snapshot(); r = C.unlockBall(shop, 'great');
  if (r.ok || r.error !== 'done' || snapshot() !== was) bad('a second unlock refuses and changes nothing');
  before = shop.coins; r = C.buyBalls(shop, 'great', 1);
  if (!r.ok || shop.belt.great !== 1 || before - shop.coins !== PRICE.great.price) bad('an unlocked Great Ball can be bought at its price');
  if (C.unlockBall(shop, 'poke').ok || C.unlockBall(shop, 'master').ok) bad('Poke needs no unlock; a ball with no tier cannot be unlocked');
  // belts: always the next one, so Belt 3 is never bought before Belt 2
  shop.coins = G.BELT_PRICES[2] - 1; was = snapshot(); r = C.buyBelt(shop);
  if (r.ok || r.error !== 'poor' || snapshot() !== was) bad('a belt without the coins changes nothing');
  shop.coins = 100000; before = shop.coins; const size = shop.belt.size; r = C.buyBelt(shop);
  if (!r.ok || r.belts !== 2 || shop.belt.size !== size + CK.ballsPerBelt || before - shop.coins !== G.BELT_PRICES[2]) bad('the first belt bought is Belt 2, six slots, at its price');
  if (C.nextBeltPrice(shop) !== G.BELT_PRICES[3]) bad('after Belt 2, Belt 3 is for sale at its price');
  before = shop.coins; r = C.buyBelt(shop);
  if (!r.ok || r.belts !== 3 || before - shop.coins !== G.BELT_PRICES[3]) bad('the second belt bought is Belt 3 at its price');
  was = snapshot(); r = C.buyBelt(shop);
  if (r.ok || r.error !== 'done' || C.nextBeltPrice(shop) !== null || snapshot() !== was) bad('past the last belt, nothing is for sale');
  if (C.beltsBought(shop) !== CK.maxBelts) bad('three belts at most');
  // the slot order both screens draw: best tier first, one id per ball
  const order = C.ballsBestFirst(shop), rank = (id) => C.BALLS.findIndex((ball) => ball.id === id);
  if (order.length !== C.total(shop) || order.some((id, i) => i && rank(id) > rank(order[i - 1]))) bad('ballsBestFirst lists every ball, best tier first');
  console.log('6f Shop: exact prices, never past the belt, locked tiers refuse, unlocks once, belts in order to three'); }

console.log(fail ? fail + ' FAILED' : 'rescue harness: all passed');
process.exit(fail ? 1 : 0);
