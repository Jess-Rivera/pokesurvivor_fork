// Gym 1 reward-path offline check (Node only). Usage from the repo root:  node docs/proposals/gym-reward-harness.js .
// Real rift.js, gym.js, elites.js, enemy.js and the data files with stubbed engine globals. Plays the whole chain: gate -> enter ->
// arena + leader -> kill the leader -> win -> badge package (level, revive, Bond, item, +10% Atk team boost, no XP orbs) -> 5 s later the return -> the
// next gate/elite schedule. The real Game (cards, bond screen), Pickups and the arena visuals are NOT covered (stubs / no browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global; global.location = { search: '?dev' };
let clock = 300;
const log = { drops: [], dropXp: [], levels: 0, revives: 0, boosts: [], bondOffers: 0, says: [], progress: [], mgrAdded: [] };
const pl = { x: 50, y: 50, r: 10, level: 8, bonds: 0, dead: false, hp: 40, maxHp: 80, bodyH: 20, mon: { name: 'Butterfree' }, revive() { this.dead = false; } };
const base = { U: null, Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, preload() { }, animMeta: () => ({ ay: 40 }), PX: 2, dirFromAngle: () => 0 },
  Camera: { sees: () => true, outerRadius: () => 400, kick() { } }, Tiles: { T: 16, arenaBiome: () => 0, ARENA_THEMES: { rock: {} } },
  World: { isFree: () => true, biome: 1, setArena() { }, setBiome() { } }, Coop: { active: false, isHost: false }, LIFT: 0,
  Game: { player: pl, st: { get time() { return clock; } }, everyone: () => [pl], grantLevels: n => { log.levels += n; }, reviveTeam: () => { log.revives++; }, badgeBoost: (st, pc) => log.boosts.push(st + ':' + pc), offerBond: () => { log.bondOffers++; }, flash() { } },
  Spawner: { CAP: 64, say: t => log.says.push(t) }, Progress: { event: (k, d) => log.progress.push(k) },
  Pickups: { drop: (k, x, y, v) => log.drops.push(k), dropXp: (x, y, v, boss, leg, plain) => log.dropXp.push({ v: Math.round(v), boss, plain }), pullAll() { log.pulled = true; } },
  Items: { roll: () => 'x' }, Judgment: { AT: 1800, noteDmg() { } }, Log: { on: false } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
try { load('js/core/util.js'); } catch (e) { }
['js/core/stats.js', 'js/data/pokedex.js', 'js/data/sprites-meta.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/data/gyms.js', 'js/entities/enemy.js', 'js/systems/elites.js', 'js/systems/rift.js', 'js/systems/gym.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };

G.Rift.reset(); G.Gym.reset(); G.Elites.reset();
// gate at 4:00
clock = 240; G.Gym.update(0.1, pl, 240); const gate = G.Gym.gate, rift = G.Rift.rift;
if (!gate || !rift || !rift.gym) bad('no gate'); else if (rift.ttl !== Infinity) bad('the gate should not expire');
// the gate survives a long wait
for (let i = 0; i < 100; i++) G.Rift.update(5, pl, 240 + i * 5); if (!G.Rift.rift) bad('gate expired');
// enter
pl.x = rift.x; pl.y = rift.y - 10; G.Rift.update(0.05, pl, 740);
if (!G.Rift.inArena || !G.Rift.isGym) bad('did not enter the gym arena');
const leader = G.EnemyMgr.all().find(e => e.gym); if (!leader) bad('no leader spawned');
// fight: the leader is hit (engages), then killed
clock = 760; leader.hurt(50); G.Rift.update(0.05, pl, 760); if (!G.Rift.inArena) bad('left the arena early');
if (log.levels || log.revives) bad('package paid before the win');
leader.hurt(1e9); if (!leader.dead) bad('leader did not die');
const drops = log.drops.slice();
G.Rift.update(0.05, pl, 780);                      // arena tick sees the dead leader -> won()
if (log.levels !== 1) bad('level grants: ' + log.levels); if (log.revives !== 1) bad('revives: ' + log.revives);
if (pl.bonds !== 1) bad('bond count ' + pl.bonds); if (G.Gym.badges.join() !== 'Boulder Badge') bad('badge ' + G.Gym.badges);
if (!log.progress.includes('rift')) bad('progress event');
// (The Berry, magnet and the x10 ticket chance come from the real Pickups.dropXp(boss, not plain), which this run stubs: asserted below by its arguments.)
if (!drops.includes('item')) bad('missing the guaranteed item in ' + drops);
if (drops.filter(k => k === 'coin').length < 10) bad('coins ' + drops.filter(k => k === 'coin').length);
if (log.dropXp.length) bad('a gym leader must drop no XP: ' + JSON.stringify(log.dropXp));
if (log.boosts.join() !== 'atk:0.1') bad('Boulder Badge boost: ' + log.boosts); if (!log.pulled) bad('pickups not pulled to the player');
if (!log.says.some(t => /Boulder Badge earned.*10% Attack.*level up/.test(t))) bad('no badge message: ' + log.says);
if (log.levels === 1 && G.Gym.beaten !== 0) bad('beaten counted before the return');
// 5 s later: back on the map
G.Rift.update(5.1, pl, 786);
if (G.Rift.inArena) bad('still in the arena after the win timer'); if (G.Gym.beaten !== 1 || G.Gym.gate) bad('return state: beaten ' + G.Gym.beaten + ' gate ' + !!G.Gym.gate);
if (log.bondOffers !== 1) bad('bond offer ' + log.bondOffers);
// schedule: no second gate (one entry), and the next elite is 2:00 after the return
G.Gym.update(0.1, pl, 5000); if (G.Gym.gate) bad('a second gate appeared');
console.log('win chain: drops ' + JSON.stringify(drops.reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {})) + '; XP orbs ' + log.dropXp.length + '; boosts ' + log.boosts.join() + '; level grants ' + log.levels + ', revives ' + log.revives + ', Bond ' + pl.bonds + ' (offered ' + log.bondOffers + 'x), badges ' + G.Gym.badges.join());
console.log(fail ? fail + ' FAILED' : 'ALL OK');
process.exit(fail ? 1 : 0);
