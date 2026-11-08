// Slice 8 DPS report (Node only; NOT a harness, so tools/check.js never runs it). Usage:  node docs/proposals/leader-dps-report.js
// Map: docs/ASCII Concept Maps/Entity Model Slice 8 - Leader Slot Choice.txt (Q10). Misty loop 1, her real moves, cards and restrictions,
// 60 s against a still dummy at three distances, twice: slice 8 (one slot per move) and slice 7 (the same slots rebuilt as one group, so
// every move is live, as before). Output index = casts x the move's attack factor, as if every cast landed (it compares the two modes,
// it is not a damage number). It prints; it never fails.
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const R = path.resolve(__dirname, '..', '..');
const SRC = {
  'js/entities/gym-leader.js': 'GL_LEADER',
  'js/entities/player.js': 'GL_PLAYER',
  'js/entities/boss-ai.js': 'GL_BRAIN',
  'js/systems/status.js': 'GL_STATUS',
  'js/systems/move-effects.js': 'GL_FX',
  'js/systems/combat.js': 'GL_COMBAT',
  'js/data/gyms.js': 'GL_GYMS',
  'js/systems/gym.js': 'GL_GYM',
  'js/entities/enemy.js': 'GL_ENEMY',
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

let clock = 0,
  drops = [],
  texts = [],
  casts = {},
  kicks = 0,
  W = {};
const human = { x: 0, y: 0, r: 12, dead: false, hp: 1e6, maxHp: 1e6, bodyH: 20, level: 20, mon: { types: ['typeless'] }, hurts: [], isPlayer: true, invuln: 0 };
human.hurt = (...a) => human.hurts.push(a);
human.takeHit = (b) => human.hurts.push([b]);
human.applyFlinch = () => false;
human.hasItem = () => false;
human.activeGroup = () => [];
const evKills = [];
const base = {
  U: null,
  Sprites: { Animator: class { update() {} loop() {} play(a) { this.last = a; } busy() { return false; } draw() {} }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, dirFromAngle: () => 0, animMeta: () => ({ ay: 20 }), hasShiny: () => false, drawShadow() {}, PX: 1 },
  FX: { dmgText: (x, y, t, c, big) => texts.push({ t, c, big }), spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {}, slash() {} },
  VFX: { forMove: () => ({}) },
  Weather: { mult: (t) => (W[t] != null ? W[t] : 1), speedFor: () => 1, force() {} },
  Game: { player: human, everyone: () => [human], evKill: (e) => evKills.push(e.id), st: { time: 0 } },
  Audio: { sfx() {} },
  Log: { on: false, who: () => null },
  Camera: { kick() { kicks++; }, sees: () => true, outerRadius: () => 400 },
  Coop: { active: false, isHost: false },
  World: { collide: () => false, isLiquid: () => false, isFree: () => true, projectileBlock: () => null, propsInCircle: () => [], TS: 32 },
  Path: { dirFor: () => null },
  Gym: { now: () => clock, enrageMul: () => 1, noteCast: (id) => (casts[id] = (casts[id] || 0) + 1), escBump: () => 0 },
  GymArena: { inArena: true, arena: null },
  Hazards: { add: (h) => h },
  Projectiles: { all: () => [], nearest: (all, x, y, r) => all.find((e) => !e.dead && Math.hypot(e.x - x, e.y - y) <= r) || null },
  Drops: { roll: (k) => drops.push(k) },
  Grounds: { berryGuard: () => false },
  Items: {},
  Silver: { kill() {} },
  Progress: { kill() {} },
  Spawner: { xpBoost: () => 1 },
};
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
try {
  load('js/core/util.js');
} catch (e) {
  /* it reads the DOM at the end; G.U is set before that */
}
for (const p of ['js/core/stats.js', 'js/data/pokedex.js', 'js/data/types.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/elite.js', 'js/entities/player.js', 'js/entities/gym-leader.js', 'js/entities/leader-ai.js', 'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/data/moves.js', 'js/systems/team-cards.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js', 'js/data/gyms.js', 'js/entities/boss-ai.js', 'js/systems/combat.js']) {
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
const STARYU = 120; // Water; base stats 30 HP, 45 Atk, 55 Def, 70 SpA, 55 SpD, 85 Spe
const GASTLY = 92; // Ghost/Poison, immune to Normal
const LEVEL = 20,
  HP = 2000;
const MOVES = [{ id: 'tackle' }, { id: 'water-pulse' }, { id: 'recover', hpBelow: 0.35 }];

// Slice 6: the old fixed leader values are now authored restrictions (Misty's step A values), so these tests keep their meaning.
const MISTY_A = { enrage: true, statusCut: 0.5, ccWindow: 5, autoShake: true, hitIframes: 0 };
function gymOf(o = {}) {
  return Object.assign({ level: LEVEL, loop: 1, leader: 'Misty', badge: 'Cascade Badge', species: 'Staryu', stance: 'far', power: 1, tempo: 1, cards: {}, moves: MOVES.map((m) => Object.assign({}, m)), engagedAt: null, playerEntity: true, hpMult: 26, restrictions: MISTY_A }, o);
}
const defOf = (dex, gym) => ({ dex, name: 'X', hp: HP, spd: 100, dmg: 20, xp: 0, behavior: 'chase', shotDmg: 10, shotCd: 1, range: 260, gym });
function leader(dex = STARYU, gym = gymOf()) {
  const e = G.Boss.make(defOf(dex, gym), 0, 0);
  e.maxHp = e.hp = HP; // the same pool on both bodies, so a hit compares directly (the hpMult has its own check)
  // slice 8: start off the Tackle slot, so the melee cushion (its own check in section 3) stays out of the hand numbers
  e.active = Math.max(0, e.slots.findIndex((g) => g[0].id !== 'tackle'));
  return e;
}
function oldBody(dex = STARYU, gym = gymOf({ playerEntity: false })) {
  const e = G.Boss.make(defOf(dex, gym), 0, 0);
  e.flying = false;
  return e;
}
const A = 1000;
/** A hand-made attacker: its attacker half is the input A. */
const owner = (o = {}) => Object.assign({ x: 0, y: -200, r: 10, level: LEVEL, dead: false, moveFactor: () => A, stabFor: () => false, dealt: 0, onDealt(d) { this.dealt += d; } }, o);
const spec = (o) => Object.assign({ id: 'test-' + ++serial, type: 'normal', category: 'physical', basePower: 40, payload: [{ t: 'damage' }], delivery: {} }, o);
let serial = 0;
function hit(target, s, own = owner()) {
  const inst = { id: ++serial, spec: s, cast: { owner: own, time: clock }, age: 0, x: 0, y: 0, vx: 0, vy: 0 };
  const hp0 = target.hp;
  const r = G.MoveEffects.applyHit(inst, target, 0, () => 0.99);
  return { took: hp0 - target.hp, r, own };
}
/** The same hit on both bodies, against the hand number. */
function parity(name, s, want, ownerOpts = {}, dex = STARYU) {
  texts = [];
  const a = hit(oldBody(dex), s, owner(ownerOpts)),
    b = hit(leader(dex), s, owner(ownerOpts));
  ok(near(a.took, want), name + ': the old body takes the hand number: ' + a.took + ' want ' + want);
  ok(near(b.took, want), name + ': the leader takes the hand number: ' + b.took + ' want ' + want);
  return b;
}
function reset() {
  clock = 0;
  drops = [];
  texts = [];
  casts = {};
  W = {};
  G.MoveSim.clear();
  G.MoveSim.setRng(Math.random);
  human.hurts = [];
  human.x = 0;
  human.y = 300;
}


const MISTY = G.Gyms.KANTO.find((g) => g.leader === 'Misty'),
  SIG = MISTY.signatures[0];
const SECS = 60;
function fight(dist, slice7) {
  reset();
  const e = leader(STARYU, gymOf({ cards: G.Gyms.cardsFor(MISTY, 1), stance: SIG.stance, restrictions: MISTY.restrictions, moves: G.Gyms.movesFor(SIG, 0, 1).map((m) => Object.assign({}, m)) }));
  e.active = 0;
  if (slice7) e.slots = [e.slots.flat()];
  for (let i = 0, N = Math.round(SECS / DT); i < N; i++) {
    clock += DT;
    human.x = dist;
    human.y = 0;
    e.x = e.y = 0;
    e.update(DT, human);
  }
  let out = 0;
  for (const id of Object.keys(casts)) {
    const d = e.brain.def(id);
    if (d.basePower > 0) out += casts[id] * e.moveFactor({ cat: d.category, dmg: d.basePower, type: d.type });
  }
  return { casts: Object.assign({}, casts), out, def: G.Stages.stage(e, 'def') };
}
console.log('Misty loop 1, ' + SECS + ' s per fight. index = casts x attack factor (if every cast landed)');
for (const dist of [60, 160, 250]) {
  const a = fight(dist, true),
    b = fight(dist, false),
    pct = a.out > 0 ? ((b.out / a.out - 1) * 100).toFixed(1) + '%' : 'n/a';
  console.log('\n' + dist + ' px');
  console.log('  slice 7  casts ' + JSON.stringify(a.casts) + '  index ' + a.out.toFixed(0) + '  Def stage ' + a.def);
  console.log('  slice 8  casts ' + JSON.stringify(b.casts) + '  index ' + b.out.toFixed(0) + '  Def stage ' + b.def);
  console.log('  change   ' + pct);
}
process.exit(0);
