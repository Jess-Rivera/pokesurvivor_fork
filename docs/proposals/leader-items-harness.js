// Entity model slice 7b: team-reading run items and HP Regen on a leader (Node only). Usage from the repo root:
//   node docs/proposals/leader-items-harness.js
// Plan: docs/ASCII Concept Maps/Entity Model Slice 7b - Leader Team Items and Regen.txt (approved 2026-11-07, Q1 to Q6).
// Loads the REAL items, team, team cards, gyms, gym, gym-arena, gym-leader and the rest of the leader stack, with stubs for the world,
// camera, FX, sound and the game. Fixture gyms are clones of Misty pushed onto the Kanto list. Every expected number is worked by
// hand from the map: team HP bonus 1 + (1 - frac) / 0.9 at 3+ members, Pikachu's Tear 1.1 ^ fainted, Regen 0.5% max HP/s per stack,
// the 1.3 s beat, Re-Do once per fight. leader-items-mutate.js points LI_<FILE> at altered copies.
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const R = path.resolve(__dirname, '..', '..');
const SRC = {
  'js/data/items.js': 'LI_ITEMS',
  'js/entities/gym-leader.js': 'LI_LEADER',
  'js/systems/gym-arena.js': 'LI_ARENA',
  'js/data/gyms.js': 'LI_GYMS',
};
const read = (p) => fs.readFileSync(process.env[SRC[p]] || path.join(R, p), 'utf8');
const load = (p) => vm.runInThisContext(read(p), { filename: p });
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global;
global.location = { search: '?dev' };
global.document = { querySelectorAll: () => [], getElementById: () => noop, createElement: () => noop, body: noop, addEventListener() {} };
if (!global.performance) global.performance = { now: () => 0 };
let seed = 4242;
Math.random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

let drops = [],
  credits = [],
  says = [],
  warns = [];
const human = { x: 0, y: 0, r: 12, dead: false, hp: 1e6, maxHp: 1e6, bodyH: 20, level: 20, mon: { types: ['typeless'] }, hurts: [], isPlayer: true, invuln: 0, kills: 0, bosses: 0, bonds: 0, runItems: [] };
human.hurt = (...a) => human.hurts.push(a);
human.takeHit = (b) => human.hurts.push([b]);
human.applyFlinch = () => false;
human.hasItem = () => false;
human.activeGroup = () => [];
human.revive = () => {};
const base = {
  U: null,
  Sprites: { Animator: class { update() {} loop() {} play(a) { this.last = a; } busy() { return false; } draw() {} _start() {} }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, dirFromAngle: () => 0, animMeta: () => ({ ay: 20 }), hasShiny: () => false, drawShadow() {}, PX: 1 },
  FX: { dmgText() {}, spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {}, slash() {} },
  VFX: { forMove: () => ({}) },
  Weather: { mult: () => 1, speedFor: () => 1, force() {}, clear() {} },
  Game: { player: human, everyone: () => [human], evKill() {}, st: { time: 0 }, grantLevels() {}, reviveTeam() {}, badgeBoost() {}, flash() {}, offerBond() {}, roster: [] },
  Audio: { sfx() {} },
  Log: { on: false, who: () => null },
  Camera: { kick() {}, sees: () => true, outerRadius: () => 400, x: 0, y: 0 },
  Coop: { active: false, isHost: false, broadcast() {} },
  World: { collide: () => false, isLiquid: () => false, isFree: () => true, projectileBlock: () => null, propsInCircle: () => [], TS: 32, biome: 0, setArena() {}, setBiome() {}, liquidEffect: () => ({}) },
  Tiles: { T: 16, arenaBiome: () => 0, ARENA_THEMES: {} },
  Path: { dirFor: () => null },
  Hazards: { add: (h) => h, clear() {} },
  Projectiles: { all: () => [], nearest: (all, x, y, r) => all.find((e) => !e.dead && Math.hypot(e.x - x, e.y - y) <= r) || null, clear() {} },
  Drops: { roll: (k) => drops.push(k) },
  Grounds: { berryGuard: () => false },
  Silver: { kill() {} },
  Progress: { kill: (e) => credits.push(!!(e.boss || e.elite)) },
  Spawner: { xpBoost: () => 1, say: (t) => says.push(t) },
  Elites: { hpFor: () => ({ hp: 1000 }), afterGate() {} },
  Pickups: { pullAll() {} },
};
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
console.warn = (m) => warns.push(String(m));
try {
  load('js/core/util.js');
} catch (e) {
  /* it reads the DOM at the end; G.U is set before that */
}
for (const p of ['js/core/stats.js', 'js/data/species-traits.js', 'js/data/items.js', 'js/data/pokedex.js', 'js/data/types.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/elite.js', 'js/entities/player.js', 'js/entities/gym-leader.js', 'js/entities/leader-ai.js', 'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/data/moves.js', 'js/systems/team-cards.js', 'js/systems/team.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js', 'js/data/gyms.js', 'js/entities/boss-ai.js', 'js/systems/combat.js', 'js/systems/gym.js', 'js/systems/gym-arena.js']) {
  try {
    load(p);
  } catch (e) {
    console.log('load failed', p, e.message);
    process.exit(1);
  }
}

let fail = 0,
  n = 0;
const ok = (c, m) => {
  n++;
  if (!c) {
    fail++;
    console.log('FAIL ' + m);
  }
};
const near = (a, b, e = 1e-6) => typeof a === 'number' && Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const DT = 1 / 60;
const K = G.Gyms.listFor(null),
  MISTY = K.find((g) => g.leader === 'Misty');
/** A fixture gym: a clone of Misty under another name, with these run items at loop 1. */
function fixture(name, runItems) {
  const g = JSON.parse(JSON.stringify(MISTY));
  g.id = 'test-' + name;
  g.leader = name;
  g.runItems = { 1: runItems };
  K.push(g);
  return g;
}
fixture('Redo Tester', ['redo']);
fixture('Knuckle Tester', ['brassknuckles']);
fixture('Tear Tester', ['pikachustear']);
const infoOf = (name, level) => {
  const idx = K.findIndex((g) => g.leader === name),
    e = K[idx];
  return { idx, id: e.id, leader: e.leader, badge: e.badge, arena: e.arena, boost: e.boost || null, dex: e.signatures[0].line[0].dex, level, openedAt: 0 };
};
function open(name, loop) {
  G.GymArena.reset();
  G.Gym.reset();
  G.EnemyMgr.clear();
  G.MoveSim.clear();
  G.MoveSim.setRng(Math.random);
  G.Gym.debugLoop(loop);
  drops = [];
  credits = [];
  says = [];
  warns = [];
  Object.assign(human, { kills: 0, bosses: 0, dead: false, hp: 1e6, hurts: [] });
  G.GymArena.openGate(infoOf(name, 12));
  G.GymArena.enterRequest();
  const a = G.GymArena.arena;
  human.x = a.x; // far south, so the leader's moves never reach the stub human
  human.y = a.y + 5000;
  return a;
}
function frame() {
  G.Game.st.time += DT;
  G.EnemyMgr.update(DT, human);
  G.GymArena.update(DT, human);
}
const run = (secs) => {
  for (let i = 0; i < Math.round(secs / DT); i++) frame();
};
const faint = (e) => e.hurt(e.hp + 1, null, true);
/** Your side, plain objects: the readers only look at hp, maxHp and dead. */
const yours = (hp, dead = []) => [0, 1, 2].map((i) => ({ hp: dead.includes(i) ? 0 : hp, maxHp: 100, dead: dead.includes(i) }));

// 1. yours unchanged: a holder whose team IS the roster reads the same as the roster; a holder with no team falls back to it
{
  const R = yours(50);
  G.Game.roster = R;
  const mine = { team: { members: R } };
  ok(near(G.Items.teamHpMul(mine), 1 + 0.5 / 0.9) && near(G.Items.teamHpMul({}), 1 + 0.5 / 0.9), 'team HP 50% on 3: 1.556, with your team or the roster');
  const D = yours(100, [0, 1]);
  G.Game.roster = D;
  ok(near(G.Items.faintMul({ team: { members: D } }), 1.21) && near(G.Items.faintMul({}), 1.21), "Pikachu's Tear, 2 fainted: 1.21 either way");
  ok(G.Items.HP_TEAM_MIN === 3, 'the 3+ rule is 3');
}

// 2. Brass Knuckles reads HER team: 3 mons at 40% = 1 + 0.6 / 0.9 = 1.667; 2 mons = 1 (Q2); your full roster does not leak in
{
  G.Game.roster = yours(100);
  const a = open('Knuckle Tester', 3),
    t = a.team;
  ok(t && t.members.length === 3 && t.members.every((m) => m.brassKnuckles), 'loop 3: three mons, each holds Brass Knuckles');
  for (const m of t.members) m.hp = m.maxHp * 0.4;
  ok(near(G.Items.teamHpMul(t.active), 1 + 0.6 / 0.9), 'her team at 40%: 1.667 (' + G.Items.teamHpMul(t.active) + ')');
  ok(near(t.active.runDmgMul(), 1 + 0.6 / 0.9), 'her damage multiplier carries it');
  ok(!warns.some((w) => w.includes('inactive below')), 'no team item warning at 3 mons'); // the card budget warning may also fire
  const b = open('Knuckle Tester', 2);
  for (const m of b.team.members) m.hp = m.maxHp * 0.4;
  ok(G.Items.teamHpMul(b.team.active) === 1, 'loop 2, two mons: inactive (1)');
  ok(warns.some((w) => w.includes('brassknuckles') && w.includes('2 mons')), 'and the dev warning says so: ' + warns.join(' | '));
  ok(G.Gyms.teamItemWarn('X', ['brassknuckles'], 3) === null && G.Gyms.teamItemWarn('X', ['redo'], 1) === null, 'no warning at 3, none for other items');
  ok(G.Gyms.teamItemWarn('X', ['sharpscissors'], 2).includes('sharpscissors'), 'Sharp Scissors warns too');
}

// 3. Pikachu's Tear reads HER fainted, not yours: one of hers down = 1.1, while you have two down
{
  G.Game.roster = yours(100, [0, 1]);
  const a = open('Tear Tester', 2),
    t = a.team;
  t.members[1].dead = true;
  t.members[1].hp = 0;
  ok(near(G.Items.faintMul(t.active), 1.1), 'her one fainted: 1.1 (' + G.Items.faintMul(t.active) + ')');
  ok(G.Items.runHud('pikachustear', t.active).live.startsWith('1 fainted'), 'the readout counts hers: ' + G.Items.runHud('pikachustear', t.active).live);
}

// 4. Re-Do: wipe -> no win -> 1.3 s -> the team back at full, the last to fall on the field -> the next wipe wins once
{
  G.Game.roster = yours(100);
  const a = open('Redo Tester', 2),
    t = a.team,
    [s1, s2] = t.members;
  ok(G.GymLeader.redoReady(t), 'the team holds an unused Re-Do');
  run(0.1);
  faint(s1);
  run(1.4);
  ok(t.active === s2 && G.EnemyMgr.get(s2.id), 'slot 2 is sent out as usual');
  run(0.6);
  s2.applyBurn(1);
  faint(s2);
  ok(s1.gym.engagedAt != null && s2.gym.engagedAt != null, 'both clocks started before the wipe');
  run(1.2);
  ok(a.phase === 'fight' && G.Gym.badges.length === 0 && drops.length === 0, 'the first wipe is no win: no badge, no gym drop');
  ok(human.kills === 2 && human.bosses === 0 && credits.join() === 'false,false', 'two kills, no boss count yet');
  ok(s1.dead && s2.dead, 'at 1.2 s of the beat nobody is back');
  run(0.15);
  ok(!s1.dead && !s2.dead && s1.hp === s1.maxHp && s2.hp === s2.maxHp, 'after the 1.3 s beat both are back at full HP');
  ok(!s2.stDot, 'statuses cleared (your revive)');
  ok(t.active === s2 && a.bossId === s2.id && G.EnemyMgr.get(s2.id), 'the last to fall takes the field');
  ok(s1.boss && s2.boss, 'both carry the boss mark again');
  ok(s1.gym.engagedAt == null && s2.gym.engagedAt == null, 'each enrage clock reset (it restarts on each send-out)');
  ok(t.redoUsed && !G.GymLeader.redoReady(t), 'Re-Do is used up');
  ok(says.some((s) => s.includes('Redo Tester used Re-Do')), 'the line says so');
  run(2.1); // past the revive i-frames
  faint(s2);
  run(1.4);
  ok(t.active === s1 && G.EnemyMgr.get(s1.id), 'then slot 1 is sent out');
  run(2.1);
  faint(s1);
  run(0.1);
  ok(a.phase === 'won', 'the second wipe wins');
  ok(G.Gym.badges.length === 1 && drops.join() === 'gym', 'one badge, one gym drop: ' + drops.join());
  ok(human.kills === 4 && human.bosses === 1 && credits.join() === 'false,false,false,true', 'four kills (each revived mon pays again), one boss count');
}

// 5. HP Regen: a benched mon heals 0.5% max HP/s per stack, the one on the field does not
{
  const a = open('Misty', 2),
    t = a.team,
    [s1, s2] = t.members;
  G.TeamCards.add(t.cards, 'regen', 1);
  s1.hp = s1.maxHp * 0.5;
  s2.hp = s2.maxHp * 0.5;
  t.benchTick(1);
  ok(near(s2.hp, s2.maxHp * 0.505, 1e-9), 'the bench heals 0.5% in 1 s: ' + s2.hp + ' of ' + s2.maxHp);
  ok(s1.hp === s1.maxHp * 0.5, 'the mon on the field does not');
}

// 6. the validator
{
  const g = JSON.parse(JSON.stringify(MISTY)),
    errs = () => G.Gyms.validate(g);
  g.runItems = { 1: ['brassknuckles', 'sharpscissors', 'pikachustear', 'redo'] };
  ok(!errs().length, 'the four team readers are legal on a leader: ' + errs().join('; '));
  ok(!G.Gyms.LEADER_ITEM_BAN.redo && G.Gyms.LEADER_ITEM_BAN.snowballbadge, 'Re-Do is off the ban list, Snowball Badge stays');
  delete g.runItems;
  g.cards[1].regen = 1;
  ok(errs().some((m) => m.includes('regen needs a loop that fields 2+ mons')), 'Regen at loop 1 (one mon) is rejected');
  delete g.cards[1].regen;
  g.cards[2] = { regen: 1 };
  ok(!errs().length, 'Regen at loop 2 (two mons) is legal: ' + errs().join('; '));
  ok(!(MISTY.runItems && Object.keys(MISTY.runItems).length) && !Object.values(MISTY.cards).some((c) => c.regen), 'Q6: Misty authors none of them');
}

console.log(fail ? 'leader-items-harness: ' + fail + ' of ' + n + ' FAILED' : 'leader-items-harness: all ' + n + ' passed');
process.exit(fail ? 1 : 0);
