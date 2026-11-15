// Rescue event (#135, acquisition rework S4) offline checks (Node only). Usage from the repo root:  node docs/proposals/rescue-harness.js .
// Real js/systems/rescue.js, js/data/stage-one.js, js/data/pokedex.js, js/data/sprites-meta.js and js/data/species-traits.js, with
// stubbed engine globals. The expected values come from the acquisition spec section 2 (docs/ASCII Concept Maps/Old txt files/
// Acquisition v2 - Spec.txt: the cadence figures, the pool table, the 8:4:2:1 weights) and from pokeapi's pokemon_species.csv read
// here on its own, never from what rescue.js or stage-one.js print.
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
  Game: { player: { x: 0, y: 0, dead: false }, st: { time: 100 } },
};
load('js/data/pokedex.js'); load('js/data/sprites-meta.js'); load('js/data/species-traits.js'); load('js/data/stage-one.js');
load('js/systems/rescue.js');
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
  if (Rz.active) bad('a won rescue is over');
  console.log('5b a win in time keeps the time left as a fraction'); }
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

console.log(fail ? fail + ' FAILED' : 'rescue harness: all passed');
process.exit(fail ? 1 : 0);
