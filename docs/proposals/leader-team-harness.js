// Entity model slice 7a: a leader's team and faint swaps (Node only). Usage from the repo root:  node docs/proposals/leader-team-harness.js
// Plan: docs/ASCII Concept Maps/Entity Model Slice 7 - Leader Team and Faint Swaps.txt (approved 2026-11-07, Q1 to Q5).
// Loads the REAL util, stats, pokedex, types, enemies, status, stages, enemy, player, gym-leader, team, team cards, the move sim and
// effects, gyms, boss-ai, combat, gym and gym-arena, with stubs for the world, tiles, camera, FX, sound and the game. Drives the real
// arena: open the gate, enter, faint the mon on the field, watch the send-out and the win. Expected values come from the map (beat
// 1.3 s, swap i-frames 0.5 s, Duration 6.1 s, PER MON vs ONCE, Zinc 3 = +15%, hpMult 25 / 19), never from the code.
// leader-team-mutate.js points LT_<FILE> at altered copies.
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const R = path.resolve(__dirname, '..', '..');
const SRC = {
  'js/entities/gym-leader.js': 'LT_LEADER',
  'js/systems/gym-arena.js': 'LT_ARENA',
  'js/data/gyms.js': 'LT_GYMS',
  'js/systems/team.js': 'LT_TEAM',
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
  says = [];
const evKills = [];
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
  Game: { player: human, everyone: () => [human], evKill: (e) => evKills.push(e.id), st: { time: 0 }, grantLevels() {}, reviveTeam() {}, badgeBoost() {}, flash() {}, offerBond() {} },
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
  Items: {},
  Silver: { kill() {} },
  Progress: { kill: (e) => credits.push(!!(e.boss || e.elite)) },
  Spawner: { xpBoost: () => 1, say: (t) => says.push(t) },
  Elites: { hpFor: () => ({ hp: 1000 }), afterGate() {} },
  Pickups: { pullAll() {} },
};
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
try {
  load('js/core/util.js');
} catch (e) {
  /* it reads the DOM at the end; G.U is set before that */
}
for (const p of ['js/core/stats.js', 'js/data/pokedex.js', 'js/data/types.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/elite.js', 'js/entities/player.js', 'js/entities/player-sim-pass.js', 'js/entities/gym-leader.js', 'js/systems/leader-memory.js', 'js/systems/leader-info.js', 'js/entities/leader-ai.js', 'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/data/moves.js', 'js/systems/team-cards.js', 'js/systems/team.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js', 'js/data/gyms.js', 'js/entities/boss-ai.js', 'js/systems/combat.js', 'js/systems/gym.js', 'js/systems/gym-arena.js']) {
  try {
    load(p);
  } catch (e) {
    console.log('load failed', p, e.message);
    process.exit(1);
  }
}

// Leader AI slice 2 (#31): this harness predates the AI player's own swap and dodge decisions; they stay off here (leader-ai-harness.js tests them)
if (G.LeaderAI && G.LeaderAI.off) Object.assign(G.LeaderAI.off, { swaps: true, dodges: true, confidence: true, pacing: true, triggers: true }); // and slice 3's (#32)
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
const K = G.Gyms.listFor(null);
const gymIdx = (name) => K.findIndex((g) => g.leader === name);
/** The gate info G.Gym builds (gym.js update), for the named leader at `level`. */
function infoOf(name, level) {
  const idx = gymIdx(name),
    e = K[idx];
  return { idx, id: e.id, leader: e.leader, badge: e.badge, arena: e.arena, boost: e.boost || null, dex: e.signatures[0].line[0].dex, level, openedAt: 0 };
}
/** A fresh run state, then the named gym's gate at loop `loop`, entered. Returns the live arena. */
function open(name, loop, level = 12) {
  G.GymArena.reset();
  G.Gym.reset();
  G.EnemyMgr.clear();
  G.MoveSim.clear();
  G.MoveSim.setRng(Math.random);
  G.Gym.debugLoop(loop);
  drops = [];
  credits = [];
  says = [];
  evKills.length = 0;
  Object.assign(human, { kills: 0, bosses: 0, dead: false, hp: 1e6, hurts: [] });
  ok(G.GymArena.openGate(infoOf(name, level)), name + ' loop ' + loop + ': the gate opens');
  G.GymArena.enterRequest();
  ok(G.GymArena.inArena, name + ' loop ' + loop + ': the arena starts');
  const a = G.GymArena.arena;
  human.x = a.x; // far south, so the leader's moves never reach the stub human (no riders to stub)
  human.y = a.y + 5000;
  return a;
}
/** One game frame: the clock, the enemy list (kill credit), the arena (send-out, win). */
function frame() {
  G.Game.st.time += DT;
  G.EnemyMgr.update(DT, human);
  G.GymArena.update(DT, human);
}
function run(secs) {
  for (let i = 0; i < Math.round(secs / DT); i++) frame();
}
const faint = (e) => e.hurt(e.hp + 1, null, true);

// 1. loop 1: one mon, a team of one, and the win as before
{
  const a = open('Misty', 1),
    t = a.team;
  ok(t && t.members.length === 1, 'loop 1: Misty fields one mon (a team of 1, so no pips)');
  ok(G.EnemyMgr.all().length === 1 && G.GymArena.leaderTeam === t, 'loop 1: one body in the enemy list');
  ok(t.active.hpMult === 25, 'loop 1: hpMult 25 (authored)');
  run(0.1);
  faint(t.active);
  run(0.1);
  ok(a.phase === 'won', 'loop 1: her one faint wins at once, no beat');
  ok(G.Gym.badges.length === 1 && drops.join() === 'gym', 'loop 1: one badge and one gym drop: ' + drops.join());
  ok(human.kills === 1 && human.bosses === 1 && credits.join() === 'true', 'loop 1: one kill, one boss count');
  ok(says.includes('Gym Leader Misty Defeated!'), 'loop 1: the win line names the leader: ' + says[says.length - 1]);
}

// 2. loop 2: two mons, the send-out beat, shared stores, raises past a faint, per mon vs once
{
  const a = open('Misty', 2),
    t = a.team,
    [s1, s2] = t ? t.members : [];
  ok(t && t.members.length === 2, 'loop 2: Misty fields two mons');
  ok([120, 121].includes(s1.dex) && [86, 87].includes(s2.dex), 'slot 1 is the Staryu line, slot 2 the Seel line: ' + s1.dex + ', ' + s2.dex);
  ok(t.active === s1 && G.EnemyMgr.all().length === 1 && G.EnemyMgr.get(s2.id) == null, 'only slot 1 is on the field; the bench is not in the enemy list');
  ok(s1.gym !== s2.gym, 'each mon has its own gym object, so its own enrage clock');
  ok(s1.stgTeam === s2.stgTeam && s1.teamCards === s2.teamCards && s1.runItems === s2.runItems && s1.dodges === s2.dodges && s1.berries === s2.berries, 'the team stores are shared, as yours');
  ok(near(G.TeamCards.vit(s2.teamCards, 'spd'), 0.15), "the gym's cards are on the shared store once (Zinc 3 = +15%): " + G.TeamCards.vit(s2.teamCards, 'spd'));
  ok(s1.hpMult === 19 && s2.hpMult === 19, 'loop 2: hpMult 19 a mon (authored)');
  ok(s1.hp === s1.maxHp && s2.hp === s2.maxHp, 'both start at full HP');

  // a team raise and an own drop on Staryu, then it faints
  ok(G.Stages.trackTeam(s1, 'atk', 1, 'lt-raise'), 'Staryu lands a team raise on Attack');
  ok(G.Stages.trackOwn(s1, 'spd', -1, 'lt-drop'), 'and takes an own drop on Sp. Def');
  faint(s1);
  ok(s1.gym.engagedAt != null, "Staryu's clock started on the hit that fainted it");
  let k = 0;
  while (!G.EnemyMgr.get(s2.id) && k < 200) {
    frame();
    k++;
    if (k === 72) ok(a.phase === 'fight' && !G.EnemyMgr.get(s2.id), 'at 1.2 s of the beat Seel is not out yet');
  }
  const beat = k * DT;
  ok(beat > 1.25 && beat < 1.36, 'Seel is sent out 1.3 s after the faint: ' + beat.toFixed(3));
  ok(t.active === s2 && a.bossId === s2.id, 'the arena follows Seel');
  ok(s2.x === s1.x && s2.y === s1.y, 'Seel takes the fainted spot');
  ok(near(s2.invuln, 0.5), 'with the 0.5 s swap i-frames: ' + s2.invuln);
  ok(says.some((s) => s.includes('sends out ' + s2.name)), 'the send-out line names it');
  ok(a.phase === 'fight' && G.Gym.badges.length === 0 && drops.length === 0, 'the first faint is no win, no badge, no gym drop');
  ok(human.kills === 1 && human.bosses === 0 && credits.join() === 'false' && evKills.length === 1, 'the first faint is a kill (EVs, Silver) but not the boss count');
  ok(s2.gym.engagedAt == null, "Seel's enrage clock has not started");
  ok(G.Stages.stage(s2, 'atk') === 1, 'the team raise from Staryu carries to Seel after the faint');
  ok(G.Stages.stage(s2, 'spd') === 0 && G.Stages.stage(s1, 'spd') === 0, 'the own drop on Staryu was cleared at the faint and does not carry');

  run(0.6); // past the swap i-frames
  s2.hurt(10, null, true);
  ok(s2.gym.engagedAt != null && s2.gym.engagedAt > s1.gym.engagedAt, "Seel's clock starts on its own first hit");
  run(5.6 - beat - 0.6);
  ok(G.Stages.stage(s2, 'atk') === 1, 'the raise is still up 5.6 s after its last success');
  run(1.0);
  ok(G.Stages.stage(s2, 'atk') === 0, 'and gone by 6.6 s (Duration 6.1 s, the beat counted)');

  faint(s2);
  run(0.1);
  ok(a.phase === 'won', 'the wipe wins');
  ok(G.Gym.badges.length === 1 && drops.join() === 'gym', 'one badge and one gym drop for the team: ' + drops.join());
  ok(human.kills === 2 && human.bosses === 1 && credits.join() === 'false,true' && evKills.length === 2, 'two kills, one boss count, EVs per mon');
  ok(says.includes('Gym Leader Misty Defeated!') && !says.some((s) => s.includes(s1.name + '!') && !s.includes('sends out')), 'the win line names the leader, not a mon');
}

// 2b. the bench ticks as yours: a burn on the benched slot 2 costs it HP
{
  const a = open('Misty', 2),
    s2 = a.team.members[1];
  s2.applyBurn(1);
  run(2.5);
  ok(s2.hp < s2.maxHp && !s2.dead, 'a burn on the bench ticks (bench parity): ' + Math.round(s2.hp) + ' of ' + s2.maxHp);
  ok(s2.gym.engagedAt == null, "bench damage does not start the benched mon's enrage clock (field only)");
}

// 3. scope guard: an old-body gym stays one mon at loop 2
{
  const a = open('Lt. Surge', 2); // close-out: Brock is switched since 2026-11-07, Lt. Surge is the next old-body gym
  ok(a.team === null && G.GymArena.leaderTeam === null, 'Lt. Surge (old body) has no team, so no pips');
  ok(G.EnemyMgr.all().filter((e) => e.boss).length === 1, 'and fields one mon at loop 2, as before');
  const b = G.EnemyMgr.all().find((e) => e.boss);
  b.hp = 0;
  b.dead = true;
  run(0.1);
  ok(a.phase === 'won' && says.includes('Gym Leader Lt. Surge Defeated!'), 'the old body wins with the leader line too: ' + says[says.length - 1]);
}

// 4. the team builder: run item ids back in once, slots in roster order
{
  G.Gym.reset();
  G.Gym.debugLoop(2);
  const info = infoOf('Misty', 12),
    m = [G.Boss.make(G.Gym.makeDef(info, 0), 0, 0), G.Boss.make(G.Gym.makeDef(info, 1), 0, 0)];
  for (const f of m) f.runItems.push('lt-item'); // what arm() leaves on each member before the team links
  const t = G.GymLeader.team(m);
  ok(t.runItems.length === 1 && t.runItems[0] === 'lt-item' && m[1].runItems === t.runItems, "the gym's run item ids go back in once, on one shared list");
  ok(m[0].teamSlot === 0 && m[1].teamSlot === 1 && t.active === m[0], 'slots in roster order, slot 1 leads');
}

// 5. the data
{
  const misty = K[gymIdx('Misty')];
  ok(G.Gyms.hpMultFor(misty, 1) === 25 && G.Gyms.hpMultFor(misty, 2) === 19 && G.Gyms.hpMultFor(misty, 3) === 19, 'Misty hpMult: 25 at loop 1, 19 from loop 2');
  ok(!G.Gyms.validate(misty).length, 'Misty validates: ' + G.Gyms.validate(misty).join('; '));
}

console.log(fail ? 'leader-team-harness: ' + fail + ' of ' + n + ' FAILED' : 'leader-team-harness: all ' + n + ' passed');
process.exit(fail ? 1 : 0);
