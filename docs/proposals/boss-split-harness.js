// Boss brain split offline checks (slice 7a-0, commit B; Node only). Usage from the repo root:  node docs/proposals/boss-split-harness.js .
// Real util, stats, pokedex, sprite meta, moves, enemies, gyms, stages, enemy, boss-ai, elites, gym-arena and gym files with stubbed engine
// globals. Checks: G.Boss is in, loads between enemy.js and gym-arena.js, and is in the boot NEED list; the Enemy body holds no boss AI
// (prototype and source) and only delegates (update -> brain.step, applyFlinch -> brain.flinch); the arena spawns its leader through
// G.Boss.make with a GymBrain; the brain's setup gives the body the contact numbers (Tackle); a wild enemy has no brain; a flinch cancels a
// tell and spends its cooldown, and a flinch before the first step leaves the brain idle. Since slice 7a the fight itself (tells, casts
// through G.MoveSim, Harden, every roster slot) is in boss-owner-harness.js and gym-harness.js. The mutation runner (boss-split-mutate.js) points BOSSSPLIT_<FILE>
// at altered copies. The live game and the visuals are NOT covered (no browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/entities/enemy.js': 'BOSSSPLIT_ENEMY', 'js/entities/boss-ai.js': 'BOSSSPLIT_BRAIN', 'js/systems/gym-arena.js': 'BOSSSPLIT_ARENA' };
const read = p => fs.readFileSync((SRC[p] && process.env[SRC[p]]) || R + '/' + p, 'utf8');
const load = p => vm.runInThisContext(read(p), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global; global.location = { search: '?dev' };
let clock = 300;
const pl = { x: 50, y: 50, r: 10, level: 8, bonds: 0, dead: false, hp: 40, maxHp: 80, bodyH: 20, mon: { name: 'Butterfree' }, revive() { this.dead = false; }, hurt() { } };
const base = { U: null, Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, preload() { }, animMeta: () => ({ ay: 40 }), PX: 2, dirFromAngle: () => 0 },
  Camera: { sees: () => true, outerRadius: () => 400, kick() { } }, Tiles: { T: 16, arenaBiome: () => 0, ARENA_THEMES: { rock: {} } },
  World: { isFree: () => true, biome: 1, setArena() { }, setBiome() { }, collide() { }, isLiquid: () => false, liquidEffect: () => null }, Weather: { speedFor: () => 1 }, Path: { dirFor: () => null },
  Coop: { active: false, isHost: false }, LIFT: 0, VFX: { forMove: m => ({ id: m.id }), forType: () => null }, Projectiles: { spawn: s => s, clear() { } },
  Game: { player: pl, st: { get time() { return clock; } }, everyone: () => [pl], grantLevels() { }, reviveTeam() { }, badgeBoost() { }, offerBond() { }, flash() { } },
  Spawner: { CAP: 64, say() { } }, Progress: { event() { } }, Pickups: { drop() { }, dropXp() { }, pullAll() { } }, Items: { roll: () => 'x', rollFor: () => 'x' }, Log: { on: false } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
try { load('js/core/util.js'); } catch (e) { }
['js/core/stats.js', 'js/core/simbus.js', 'js/data/pokedex.js', 'js/data/sprites-meta.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/data/enemy-classes.js',
 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/systems/team-cards.js',
 'js/data/enemies.js', 'js/data/gyms.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/boss-ai.js', 'js/systems/elites.js', 'js/systems/gym-arena.js', 'js/systems/gym.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 40) console.log('FAIL', m); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
G.Enemy.prototype.die = function () { this.dead = true; };
const OLD = ['bossInit', 'bossMove', 'bossEnd', 'gymFactor', 'castBuff', 'gymPick', 'gymCd', 'gymStart', 'gymCast', 'gymShoot', 'gymRestore', 'contactMove', 'baseAtkType'];
const wildDef = { dex: 1, baseHp: 50, spd: 50, dmg: 5, xp: 1, behavior: 'chase', bx: 64 };

// 1. module, load order, boot list
{ ok(typeof G.Boss.make === 'function' && typeof G.Boss.GymBrain === 'function', 'G.Boss.make and G.Boss.GymBrain');
  const html = fs.readFileSync(R + '/dev.html', 'utf8'), ie = html.indexOf('js/entities/enemy.js'), ib = html.indexOf('js/entities/boss-ai.js'), ia = html.indexOf('js/systems/gym-arena.js');
  ok(ie > 0 && ib > ie && ia > ib, 'dev.html loads boss-ai.js after enemy.js and before gym-arena.js');
  ok(/'Boss'/.test(fs.readFileSync(R + '/js/main.js', 'utf8')), 'main.js NEED lists Boss');
  console.log('1 module: G.Boss in, loaded between enemy.js and gym-arena.js, in the boot list'); }

// 2. the body holds no boss AI and only delegates
{ const left = OLD.filter(k => k in G.Enemy.prototype); ok(!left.length, 'Enemy.prototype still has ' + left);
  const src = read('js/entities/enemy.js'), re = new RegExp('\\b(' + OLD.join('|') + ')\\b|this\\.ai\\b');
  const hits = src.split('\n').map((l, i) => re.test(l) ? i + 1 + ': ' + l.trim().slice(0, 80) : null).filter(Boolean);
  ok(!hits.length, 'enemy.js still names the old boss AI: ' + hits.join(' | '));
  const e = new G.Enemy(wildDef, 0, 0, { t: 0, dmg: 1, hp: 1, spd: 1 }, false);
  let steps = 0, flinches = 0; e.gym = { level: 5, moves: [] };
  e.brain = { step: () => { steps++; return [0, 0, 'Idle']; }, flinch: () => { flinches++; } };
  for (let i = 0; i < 5; i++) e.update(0.05, pl);
  ok(steps === 5, 'update delegates to brain.step every frame (' + steps + '/5)');
  ok(e.applyFlinch() && flinches === 1, 'applyFlinch delegates to brain.flinch and still applies the body recoil');
  console.log('2 body: no boss method or this.ai left; update and applyFlinch delegate to the brain'); }

// 3. the arena spawns its leader through G.Boss.make, with a GymBrain
let leader = null;
{ G.GymArena.reset(); G.Gym.reset(); G.Elites.reset();
  clock = 240; G.Gym.update(0.1, pl, 240); const gg = G.GymArena.gate; ok(!!gg, 'gate at 4:00');
  pl.x = gg.x; pl.y = gg.y - 10; G.GymArena.update(0.05, pl, 260);
  leader = G.EnemyMgr.all().find(e => e.gym);
  ok(leader && leader.boss && leader.brain instanceof G.Boss.GymBrain && leader.brain.e === leader, 'the arena leader is a boss body with its own GymBrain');
  ok(leader && leader.flying === false, 'the arena keeps the leader grounded');
  const arena = read('js/systems/gym-arena.js'); ok(/G\.Boss\.make\(/.test(arena) && !/new G\.Enemy\(/.test(arena), 'gym-arena.js spawns through G.Boss.make only');
  console.log('3 arena: ' + (leader ? leader.name : 'none') + ' spawned through G.Boss.make with a GymBrain'); }

// 4. setup gives the body the old contact numbers; a def with no gym gets no brain; a wild enemy has no brain
{ G.GymArena.reset(); G.Gym.reset(); clock = 240; G.Gym.update(0.1, pl, 240);
  const e = G.Boss.make(G.Gym.makeDef(G.Gym.gate), 0, 0), b = e.brain;
  ok(b && b.contact === 'tackle', 'contact move is the melee move (Tackle)');
  ok(e.atkLvl === e.gym.level, 'leader level ' + e.atkLvl);
  const td = b && b.def('tackle');
  ok(b && near(e.atkFactor, b.factor({ cat: td.category, dmg: td.basePower, type: td.type })) && e.atkFactor0 === e.atkFactor && e.atkCat === 'physical' && e.atkType === 'normal', 'contact factor, category and type on the body');
  ok(b && b.on === false, 'the fight state starts on the first step');
  const plain = G.Boss.make(Object.assign({}, wildDef, { hp: 500 }), 0, 0); ok(plain.boss && plain.brain === null, 'a boss def with no gym gets no brain');
  const w = new G.Enemy(wildDef, 0, 0, { t: 0, dmg: 1, hp: 1, spd: 1 }, false); ok(w.brain === null, 'a wild enemy has no brain');
  let err = null; try { for (let i = 0; i < 40; i++) w.update(0.05, pl); } catch (x) { err = x.message; } ok(!err, 'a wild enemy updates with no brain: ' + err);
  console.log('4 setup: contact Tackle factor ' + e.atkFactor.toFixed(1) + ' on the body; no-gym boss and wild enemies have no brain'); }

// 5. flinch through the brain
{ const e = G.Boss.make(G.Gym.makeDef(G.Gym.gate), 0, 0), b = e.brain;
  ok(e.applyFlinch() && b.on === false, 'a flinch before the first step leaves the brain idle');
  e.stFl = null; pl.x = 420; pl.y = 0; e.update(0.05, pl); ok(b.on, 'the first step starts the fight state');
  const s = e.slots[0].find(x => x.id === 'rock-throw'); s.t = 0;
  b.tell = null; b.start(s, b.def('rock-throw'), 'shot', pl); ok(!!b.tell && e.atkType === 'normal', 'a Rock Throw tell leaves the contact type Normal (never swapped)');
  ok(e.applyFlinch() && b.tell === null && s.t > 1, 'a flinch cancels the tell and spends its cooldown (' + s.t + ')');
  b.wait = 0; e.stFl = null; e.applyFlinch(); ok(b.wait > 0, 'between attacks a flinch delays the next attack');
  console.log('5 flinch: idle before the first step; mid-tell it cancels and spends the cooldown; contact stays Tackle'); }

console.log(fail ? fail + ' FAILED (' + n + ' checks)' : 'ALL OK (' + n + ' checks)');
process.exit(fail ? 1 : 0);
