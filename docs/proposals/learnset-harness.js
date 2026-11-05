// Learnset pools (Move Shop step 1) offline checks (Node only). Usage from the repo root:  node docs/proposals/learnset-harness.js
// Real data/learnsets.js and data/moves.js over the real resolved moves. Expected species facts are from the main games
// and the rules in docs/proposals/move-shop-plan.md "Pools", never copied from the code's output.
const fs = require('fs'), vm = require('vm');
const load = p => vm.runInThisContext(fs.readFileSync(p, 'utf8'), { filename: p });
global.window = global; global.G = {};
for (const m of fs.readFileSync('dev.html', 'utf8').matchAll(/src="(js\/data\/move-[^"]+|js\/data\/moves-generated\.js)"/g)) load(m[1]);
load('js/data/pokedex.js');
load('js/data/learnsets.js');
load('js/data/moves.js');
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL ' + m); } };
const M = G.Moves, mon = dex => G.DEX_BY[dex], pool = dex => M.poolFor(mon(dex));
const attack = id => G.MoveDefs[id].power != null;

// 1. real species, level-up and egg
{ const c = pool(4);
  ok(c.includes('ember') && c.includes('flamethrower') && c.includes('dragon-rage'), 'Charmander learns Ember, Flamethrower and Dragon Rage');
  ok(!c.includes('water-gun') && !c.includes('hydro-pump'), 'Charmander has no Water moves');
  ok(!pool(1).includes('ember'), 'Bulbasaur does not learn Ember');
  ok(pool(1).includes('vine-whip'), 'Bulbasaur learns Vine Whip');
  ok(pool(25).includes('thunderbolt'), 'Pikachu learns Thunderbolt');
  ok(pool(68).includes('karate-chop'), 'Machamp learns Karate Chop');
  ok(!pool(4).includes('dragon-claw'), 'Dragon Claw is a TM for Charmander, not in its level-up and egg pool');
  for (const d of [172, 25, 26]) ok(pool(d).includes('volt-tackle'), 'the Pikachu line learns Volt Tackle by hand: ' + d); }

// 2. the top-up: under 4 fills to exactly 4, from its types then Normal, attacks first
{ const k = pool(129);
  ok(k.length === 4 && k.includes('tackle'), 'Magikarp keeps Tackle and tops up to 4: ' + k);
  ok(k.filter(id => id !== 'tackle').every(id => attack(id) && G.MoveDefs[id].type === 'water'), 'Magikarp tops up with Water attacks: ' + k);
  const d = pool(132);
  ok(d.length === 4 && d.every(id => attack(id) && G.MoveDefs[id].type === 'normal'), 'Ditto (no learnset) gets 4 Normal attacks: ' + d);
  ok(pool(4).length > 4, 'a full learnset gets no top-up');
  ok(pool(129) === pool(129), 'the pool is cached'); }

// 3. every species, every move
{ const short = G.DEX.filter(p => M.poolFor(p).length < 4).map(p => p.name);
  ok(!short.length, 'every species has at least 4 moves: ' + short.slice(0, 6));
  const reach = new Set();
  for (const p of G.DEX) { M.poolFor(p).forEach(id => reach.add(id)); M.tmList().forEach(id => { if (M.canUseTm(p, id)) reach.add(id); }); }
  const live = Object.keys(G.MoveDefs).filter(id => !M.RETIRED[id]);
  const miss = live.filter(id => !reach.has(id));
  ok(!miss.length, 'every live move has a learner: ' + miss);
  ok(!reach.has('hail') && !reach.has('bubble'), 'a retired move has no learner');
  ok(G.DEX.every(p => M.poolFor(p).every(id => G.MoveDefs[id])), 'every pool id is a real move');
  ok(M.HELD === undefined, 'the Kanto hold is gone'); }

// 4. TMs
{ const t = M.tmList();
  ok(t.includes('earthquake') && t.includes('flamethrower') && t.includes('thunderbolt'), 'the classic TMs are on the list');
  ok(!t.includes('hail'), 'a retired move is no TM');
  ok(M.canUseTm(mon(68), 'earthquake') && M.canUseTm(mon(68), 'fire-blast'), 'Machamp can use Earthquake and Fire Blast (its TM list was empty in the latest-game dataset)');
  ok(M.canUseTm(mon(4), 'dragon-claw'), 'Charmander can use Dragon Claw');
  ok(M.canUseTm(mon(4), 'ember'), 'a pool move counts, TM list or not');
  ok(!M.canUseTm(mon(1), 'fire-blast'), 'Bulbasaur cannot use Fire Blast');
  ok(!M.canUseTm(mon(132), 'earthquake'), 'Ditto cannot use a TM outside its pool'); }

// 5. a Pokemon with no learnset entry falls back to its types and Normal (old saves, harness stubs)
{ const f = M.poolFor({ dex: 99999, types: ['fire'] });
  ok(f.includes('ember') && f.includes('tackle') && !f.includes('water-gun'), 'no entry: its types and Normal');
  ok(attack(f[0]), 'no entry: attacks first'); }

console.log(fail ? 'learnset harness: ' + fail + ' FAILED of ' + n : 'learnset harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
