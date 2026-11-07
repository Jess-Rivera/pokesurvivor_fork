// Entity model slice 5: G.GymLeader, a gym leader as a Player entity (Node only). Usage from the repo root:  node docs/proposals/gym-leader-harness.js
// Loads the REAL util, stats, pokedex, types, enemies, status, stages, enemy, player, gym-leader, boss-ai, combat, gyms, team cards and the move
// sim and effects, with stubs for the world, camera, FX and the gym clock. Plan: docs/ASCII Concept Maps/Entity Model Slice 5 - GymLeader, Misty First.txt.
// Parity: one hit, the old wild body against the leader, same species, level and max HP, and both against the number worked by hand from
// COMBAT-RULES "Damage": D = (A / Dstat + 2) x STAB x scale, then type, items, crit, floor of 1. A is an input. Everything else is hand-derived from
// the approved plan ("Leader status rules", decisions 2 to 10), never read from the code. gym-leader-mutate.js points GL_<FILE> at altered copies.
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
for (const p of ['js/core/stats.js', 'js/data/pokedex.js', 'js/data/types.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/elite.js', 'js/entities/player.js', 'js/entities/gym-leader.js', 'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/data/moves.js', 'js/systems/team-cards.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js', 'js/data/gyms.js', 'js/entities/boss-ai.js', 'js/systems/combat.js']) {
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

// 1. the class and the switch
reset();
{
  const e = leader();
  ok(e instanceof G.GymLeader && e instanceof G.PlayerEntity, 'G.Boss.make builds a G.GymLeader for a switched gym');
  ok(!(e instanceof G.HumanPlayer), 'a leader is not the human');
  ok(e.isPlayer === true && e.isRival === true && e.boss === true && !!e.gym && e.level === LEVEL, 'it follows Player entity rules, and is still the boss the HUD finds');
  ok(oldBody() instanceof G.Enemy && !oldBody().isPlayer, 'a gym with the switch off keeps the wild body');
  ok(e.foes()[0] === human, "the leader's foe is you");
  ok(typeof e.id === 'number' && e.id !== leader().id, 'each leader takes its own enemy list id');
  ok(e.gym.engagedAt === null && e.types.join() === 'water', 'it starts unengaged, with its species types');
}
// 2. HP: player formula x hpMult (plan decision 2; Staryu level 18: floor(2 x 30 x 18 / 100) + 18 + 10 = 38, x HP_SCALAR 2 = 76, x 26 = 1976)
{
  const e = G.Boss.make(defOf(STARYU, gymOf({ level: 18, hpMult: 26 })), 0, 0);
  ok(e.maxHp === 1976 && e.hp === 1976, 'Staryu level 18 at hpMult 26 has 1976 HP: ' + e.maxHp);
  const m = { hpMult: { 1: 26, 3: 30 } };
  ok(G.Gyms.hpMultFor(m, 1) === 26 && G.Gyms.hpMultFor(m, 2) === 26 && G.Gyms.hpMultFor(m, 3) === 30 && G.Gyms.hpMultFor(m, 6) === 30, 'hpMult carries forward by loop');
  ok(G.Gyms.hpMultFor({}, 1) === 1, 'a gym with no hpMult reads 1');
}
// 3. hit parity. Dstat = floor(2 x 55 x 20 / 100) + 5 = 27 on Def and on SpD, A = 1000
const D = 1000 / 27 + 2;
reset();
parity('neutral physical', spec({ type: 'normal' }), D);
parity('neutral special', spec({ type: 'normal', category: 'special' }), D);
parity('super effective, Grass on Water', spec({ type: 'grass' }), D * 2);
parity('resisted, Fire on Water', spec({ type: 'fire' }), D * 0.5);
parity('crit', spec({ type: 'normal' }), D * 1.5, { critChance: 1 });
parity('the attacker STAB lands after the +2', spec({ type: 'normal' }), D * 1.5, { stabFor: () => true });
parity('Expert Belt on a super-effective hit', spec({ type: 'grass' }), D * 2 * 1.2, { expertBelt: true });
parity('Expert Belt does nothing on a neutral hit', spec({ type: 'normal' }), D, { expertBelt: true });
parity('a matching type item', spec({ type: 'normal' }), D * 1.2, { typeBoost: 'normal' });
parity('Power Stone floors a resisted hit at x1', spec({ type: 'fire' }), D, { stoneType: 'fire' });
parity('a status-category hit divides by the neutral 50, no STAB', spec({ type: 'normal', category: 'status' }), 1000 / 50 + 2, { stabFor: () => true });
W.water = 1.5;
parity('weather on the type', spec({ type: 'water' }), D * 0.5 * 1.5);
W = {};
// Gastly: Normal is immune. Def 30: floor(2 x 30 x 20 / 100) + 5 = 17. Power Stone pierces at x1.
{
  const G1 = 1000 / 17 + 2;
  const a = parity('immune: no damage', spec({ type: 'normal' }), 0, {}, GASTLY);
  ok(a.r.immune === true, 'an immune hit on a leader reports immune');
  parity('Power Stone pierces immunity', spec({ type: 'normal' }), G1, { stoneType: 'normal' }, GASTLY);
}
// the melee cushion is yours since slice 8 (Q6, replacing D4): 25% less while a melee move is in the active slot
{
  const e = leader();
  e.active = e.slots.findIndex((g) => g[0].id === 'tackle');
  ok(G.MoveDefs.tackle.balanceClass === 'melee' && e.activeGroup()[0].id === 'tackle', 'the cushion check is live: Tackle is the active slot');
  const t = hit(e, spec({ type: 'normal' })).took;
  ok(near(t, D * 0.75), 'with Tackle active a hit lands at 0.75: ' + t + ' want ' + D * 0.75);
  const w = hit(leader(), spec({ type: 'normal' })).took;
  ok(near(w, D), 'with Water Pulse active it lands in full: ' + w);
}
// flat damage: fixed and level damage
{
  parity('fixed damage', spec({ payload: [{ t: 'special', handler: 'fixedDamage', amount: 40 }] }), 40);
  parity('level damage', spec({ payload: [{ t: 'special', handler: 'levelDamage' }] }), LEVEL);
  const e = leader();
  e.takeFlat(100, '#ff7b3d', 5, 5, 160);
  ok(near(e.hp, HP - 100) && e.x === 0 && e.y === 0, 'takeFlat: the amount alone, the knock does not move it');
  texts = [];
  leader().takeFlat(10, '#ff7b3d');
  ok(texts.some((t) => t.c === '#ff7b3d'), 'takeFlat shows its own color: a color is never read as a type');
  const w = oldBody();
  w.takeFlat(100, '#ff7b3d');
  ok(near(w.hp, HP - 100), 'takeFlat answers on the old body too');
}
// a leader's own flat move on you stays not built (the human path unchanged)
{
  reset();
  human.hurts = [];
  const own = leader();
  hit(human, spec({ payload: [{ t: 'special', handler: 'fixedDamage', amount: 40 }] }), own);
  ok(human.hurts.length === 0, "a leader's flat move on you is still not applied");
}
// your damage counts
{
  const b = hit(leader(), spec({ type: 'normal' }));
  ok(near(b.own.dealt, D) && near(b.own.dmgDealt, D), 'your hit on a leader counts in damage dealt and reaches onDealt (Shell Bell)');
}
// no hit i-frames: two hits in one frame both land
{
  const e = leader(),
    s = spec({ type: 'normal' });
  hit(e, s);
  ok(e.invuln === 0, 'a hit leaves no i-frames on a leader');
  hit(e, s);
  ok(near(HP - e.hp, D * 2), 'two hits in one frame both land');
  const eb = leader();
  eb.invuln = 0.5;
  ok(hit(eb, s).took === 0, 'move i-frames (a dash) still stop a hit');
}
// the look (D6)
{
  texts = [];
  hit(leader(), spec({ type: 'grass' }));
  ok(texts.some((t) => t.c === '#ffe14d' && t.big && t.t === Math.round(D * 2)), 'a super hit on a leader: the big yellow number, no minus sign');
  texts = [];
  hit(leader(), spec({ type: 'normal' }), owner({ critChance: 1 }));
  ok(texts.some((t) => t.c === '#ff9a3c' && t.big), 'a crit on a leader: the big orange number');
}

// 4. the leader status rules (plan table)
const St = G.Status;
{
  const e = leader();
  St.apply(e, 'freeze');
  ok(near(e.stMajor.t, 1), 'freeze lasts 1 s: ' + e.stMajor.t);
  for (let i = 0; i < 20; i++) {
    const s = leader();
    St.apply(s, 'sleep');
    ok(s.stMajor.t >= 1 && s.stMajor.t <= 3, 'sleep rolls 1 to 3 s: ' + s.stMajor.t);
  }
  const o = oldBody();
  St.apply(o, 'freeze');
  ok(near(o.stMajor.t, 0.5), 'the old body keeps its 0.5 s freeze: ' + o.stMajor.t);
  const el = leader();
  St.apply(el, 'freeze');
  St.tick(el, 1.01);
  ok(!el.stMajor && near(el.stWin.hard, 5, 1e-3), 'after a hard CC ends, a 5 s gap: ' + (el.stWin && el.stWin.hard));
  ok(St.apply(el, 'sleep') === 'window', 'no new sleep inside the gap');
  ok(St.apply(el, 'paralysis') === 'window', 'no new paralysis inside the gap');
  St.tick(el, 5.01);
  ok(St.apply(el, 'sleep') === 'ok', 'the gap ends after 5 s');
  const fr = leader();
  St.apply(fr, 'freeze');
  St.tick(fr, 1.01);
  St.tick(fr, 5.01);
  ok(St.apply(fr, 'freeze') === 'ok', 'the same status lands again after the 5 s gap: no old 10 s window');
  const p = leader();
  St.apply(p, 'paralysis');
  ok(near(p.stMajor.t, 10), 'paralysis runs at full length: ' + p.stMajor.t);
  St.tick(p, 10.01);
  ok(near(p.stWin.hard, 5, 1e-3), 'paralysis counts as hard CC for the gap (the player rule)');
  const t = leader();
  St.apply(t, 'trap');
  ok(near(t.stTrap.t, 8) && !St.rooted(t) && St.speedMul(t) === 1, 'trap is an 8 s swap lock and never roots a leader');
  const c = leader();
  St.apply(c, 'confusion');
  ok(c.stCnf.t >= 2 && c.stCnf.t <= 8, 'confusion at full length');
  const d = leader();
  ok(St.applyDot(d, 'burn') === 'ok', 'burn lands through the Player entity DoT');
}
// shake off: 3 taps a second, 0.25 s each, never below 0.5 s. Sleep 3 s from now: one tap at once, then every 1/3 s
{
  const e = leader();
  e.stMajor = { k: 'sleep', t: 3, age: 0 };
  e.update(DT, human);
  ok(near(e.stMajor.t, 3 - 0.25 - DT), 'the first frame: one tap (0.25 s) and the clock: ' + e.stMajor.t);
  for (let i = 0; i < 59; i++) e.update(DT, human);
  // 1 s later: the clock took 1 s and 3 taps took 0.75 s (at frame 0, 20 and 40)
  ok(near(e.stMajor.t, 3 - 1 - 0.75, 1e-6), 'one second: 1 s of clock and 3 taps: ' + e.stMajor.t);
  ok(!!St.shake(leader()) === false, 'nothing to shake, no tap');
}

// 5. the brain drives the entity
reset();
{
  const e = leader(STARYU, gymOf({ moves: [{ id: 'water-pulse' }, { id: 'tackle' }], stance: 'far' }));
  human.x = 100;
  human.y = 0;
  let tell = null,
    aim0 = null;
  for (let i = 0; i < 240 && !tell; i++) {
    clock += DT;
    e.update(DT, human);
    if (e.brain.tell) {
      tell = e.brain.tell;
      aim0 = tell.ang;
    }
  }
  ok(!!tell, 'the brain starts a tell on the entity');
  human.x = -300; // you move: the aim stays locked
  human.y = 200;
  e.update(DT, human);
  ok(e.brain.tell && e.brain.tell.ang === aim0, 'the tell keeps its locked aim while the Player entity update re-aims each frame');
  for (let i = 0; i < 60; i++) {
    clock += DT;
    e.update(DT, human);
  }
  ok(casts['water-pulse'] >= 1 || casts.tackle >= 1, 'the tell fires a move: ' + JSON.stringify(casts));
}
{
  reset();
  const e = leader();
  human.x = 1000;
  human.y = 0;
  for (let i = 0; i < 100; i++) {
    clock += DT;
    e.update(DT, human);
  }
  ok(e.x > 10, 'the heading moves it with the Player entity movement: x ' + e.x);
  // frozen: no step, no movement
  const x0 = e.x;
  e.stMajor = { k: 'freeze', t: 5, age: 0 };
  e.slots[0][0].t = 3;
  for (let i = 0; i < 10; i++) e.update(DT, human);
  ok(e.x === x0 && e.slots[0][0].t === 3, 'frozen: it does not move and the brain does not step (no recharge, as before)');
  ok(e.moves.length === e.slots.flat().length && e.moves.every((s) => s.type) && e.activeGroup().every((s) => s.type), 'its slots carry the move type (the halo)');
}
// heal cap and tells from restrictions
{
  reset();
  const eLoop = leader(STARYU, gymOf({ loop: 2 }));
  ok(eLoop.brain.healsLeft === 2, 'with no restriction the heal cap is the loop number');
  const eNone = leader(STARYU, gymOf({ restrictions: { healLimit: 0 } }));
  ok(eNone.brain.healsLeft === 0, 'healLimit 0 allows none');
  const eTwo = leader(STARYU, gymOf({ restrictions: { healLimit: 3 } }));
  ok(eTwo.brain.healsLeft === 3, 'healLimit overrides the loop number');
  const noTell = leader(STARYU, gymOf({ restrictions: { tells: false }, moves: [{ id: 'water-pulse' }] }));
  human.x = 100;
  human.y = 0;
  let wind = null;
  for (let i = 0; i < 240 && wind == null; i++) {
    clock += DT;
    noTell.update(DT, human);
    if (noTell.brain.tell) wind = noTell.brain.tell.wind;
  }
  ok(wind === 0, 'tells off: no wind-up, got ' + wind);
  ok(leader().brain.tells === true, 'tells are on by default');
}
// recoil and heal come from the Player entity
{
  const e = leader();
  e.hp = 500;
  e.payHp(10000);
  ok(e.hp === 1, 'a cast cost never drops it below 1 HP');
  e.heal(100);
  ok(e.hp === 101, 'a heal lands');
  ok(!Object.prototype.hasOwnProperty.call(e, 'heal') && !Object.prototype.hasOwnProperty.call(e, 'stabFor'), 'heal and stabFor are inherited, not installed by the brain');
  ok(Object.prototype.hasOwnProperty.call(oldBody(), 'heal'), 'the old body still gets them from the brain');
}
// flinch: your rule since slice 8 (Q7, replacing D5): the tell is lost, the active slot restarts (cd + the 0.3 s hold), the others do not
{
  const e = leader();
  e.brain.init();
  e.brain.wait = 0;
  const act = e.activeGroup()[0], // Water Pulse, the starting slot
    other = e.slots[0][0]; // Tackle
  act.t = 0;
  other.t = 0;
  e.brain.tell = { slot: act, id: 'water-pulse', form: 'shot', t: 0, wind: 0.5, after: 0.3, ang: 0, spot: null, fired: false };
  ok(e.applyFlinch() === true, 'a leader can flinch');
  ok(e.brain.tell === null, 'a flinch loses the tell');
  ok(near(act.t, G.MoveDefs['water-pulse'].cd * e.cdMul + 0.3), 'the active slot restarts with the 0.3 s hold: ' + act.t);
  ok(other.t === 0 && e.brain.wait === 0, 'another slot is untouched and no extra wait follows');
  ok(!!e.stFl, 'the recoil runs');
  const a = leader();
  a.stMajor = { k: 'sleep', t: 2, age: 0 };
  ok(a.applyFlinch() === false, 'an asleep leader cannot flinch');
}

// every move of Misty's loop 1 set fires through the real G.GymLeader, her real cards folded (moved here from gym-harness, which keeps the old body)
{
  reset();
  const misty = G.Gyms.KANTO.find((g) => g.leader === 'Misty'),
    sig = misty.signatures[0],
    want = G.Gyms.movesFor(sig, 0, 1).map((m) => m.id);
  const e = leader(STARYU, gymOf({ cards: G.Gyms.cardsFor(misty, 1), stance: sig.stance, moves: G.Gyms.movesFor(sig, 0, 1).map((m) => Object.assign({}, m)) }));
  const hold = (secs, hx) => {
    for (let i = 0, N = Math.round(secs / DT); i < N; i++) {
      clock += DT;
      human.x = hx;
      human.y = 0;
      e.x = e.y = 0;
      e.update(DT, human);
    }
  };
  hold(20, 30);
  e.hp = e.maxHp * 0.3;
  hold(20, 200);
  ok(want.every((id) => casts[id] >= 1), 'every Misty loop 1 move casts: ' + JSON.stringify(casts) + ' want ' + want.join());
  ok(Object.keys(casts).every((id) => want.includes(id)), 'and nothing else');
  ok(casts.recover === 1, 'Recover once, the loop 1 heal cap: ' + casts.recover);
}

// 6. the enrage trigger
{
  const e = leader();
  clock = 50;
  hit(e, spec({ type: 'normal' }));
  ok(e.gym.engagedAt === 50, 'the first hit starts the enrage clock');
  clock = 60;
  hit(e, spec({ type: 'normal' }));
  ok(e.gym.engagedAt === 50, 'a later hit does not restart it');
  const d = leader();
  clock = 70;
  d.takeDot('burn', 20, '#f00');
  ok(d.gym.engagedAt === 70, 'damage over time engages it, as before');
  const i = leader(GASTLY);
  clock = 80;
  hit(i, spec({ type: 'normal' }));
  ok(i.gym.engagedAt === null, 'an immune hit does not engage it');
  i.takeHit({ A, cat: 'physical', type: 'normal', stab: 1 });
  ok(i.gym.engagedAt === null, 'nor does an immune hit that reaches its defense');
  const b = leader();
  b.invuln = 1;
  b.takeHit({ A, cat: 'physical', type: 'normal', stab: 1 });
  ok(b.gym.engagedAt === null, 'nor does a hit stopped by a dash');
  clock = 0;
}

// 7. no touch damage
{
  reset();
  human.x = 0;
  human.y = 0;
  human.flyT = 0;
  G.EnemyMgr.clear();
  const e = leader();
  G.EnemyMgr.add(e);
  G.EnemyMgr.rebuildGrid();
  G.Combat.resolve(DT, human, 0);
  ok(human.hurts.length === 0, 'touching a leader does not hurt you');
  G.EnemyMgr.clear();
  const o = oldBody();
  o.atkFactor = 100;
  o.atkCat = 'physical';
  o.touchCd = 0;
  G.EnemyMgr.add(o);
  G.EnemyMgr.rebuildGrid();
  G.Combat.resolve(DT, human, 0);
  ok(human.hurts.length === 1, 'the old body still hurts by touch (the control)');
  G.EnemyMgr.clear();
}

// 8. faint: drops, fade, and the enemy list pays once
{
  reset();
  G.EnemyMgr.clear();
  evKills.length = 0;
  human.kills = 0;
  human.bosses = 0;
  const e = leader();
  G.EnemyMgr.add(e);
  e.hp = 5;
  hit(e, spec({ type: 'normal' }));
  ok(e.dead === true && e.hp === 0, 'the hit faints it');
  ok(drops.join() === 'gym', 'it rolls the gym drop once: ' + drops.join());
  ok(e.fade > 0, 'it starts the fade');
  G.EnemyMgr.update(DT, human);
  ok(human.kills === 1 && human.bosses === 1 && evKills.length === 1, 'the enemy list pays one kill, one boss and one EV bank');
  ok(!G.EnemyMgr.get(e.id) && !G.EnemyMgr.bossAlive(), 'it is gone from the list, so the arena sees the win');
  for (let i = 0; i < 90; i++) G.EnemyMgr.update(DT, human);
  ok(human.kills === 1 && drops.length === 1, 'a corpse pays nothing more');
  ok(e.fade <= 0, 'the corpse fade ran out, so the list drops it');
  G.EnemyMgr.clear();
}

// 9. what ground traps and G.Debug call on the enemy list
{
  const e = leader();
  e.applyBurn(1);
  ok(e.stDot && e.stDot.k === 'burn', 'applyBurn lands');
  const p = leader();
  p.applyPoison(2);
  ok(p.stDot && p.stDot.k === 'toxic', 'applyPoison 2 is Toxic');
  const s = leader();
  s.applySlow(0.65, 4.5);
  ok(s.slowT === 4.5, 'applySlow lands');
  const c = leader();
  ok(c.applyStatus('confusion') === 'ok' && !!c.stCnf, 'applyStatus lands');
}

// 10. the data and the validator
{
  const K = G.Gyms.KANTO,
    misty = K.find((g) => g.leader === 'Misty');
  ok(misty.playerEntity === true && misty.hpMult[1] === 25, 'Misty is switched on, hpMult 25 on loop 1 (slice 6)');
  ok(!G.Gyms.validate(misty).length, 'Misty validates: ' + G.Gyms.validate(misty).join('; '));
  ok(K.filter((g) => g.playerEntity).map((g) => g.leader).join() === 'Brock,Misty', 'Brock and Misty are switched on, nothing else');
  const brock = K.find((g) => g.leader === 'Brock');
  ok(brock.hpMult[1] === 16 && brock.hpMult[2] === 12, 'Brock hpMult 16 on loop 1, 12 on loop 2 (close-out B1)');
  ok(!G.Gyms.validate(brock).length, 'Brock validates: ' + G.Gyms.validate(brock).join('; '));
  ok(JSON.stringify(brock.restrictions) === JSON.stringify({ hitIframes: 0, autoShake: true, ccWindow: 5, statusCut: 0.5 }), "Brock carries Misty's restriction set (B2)");
  const bad = (o) => G.Gyms.validate(Object.assign(JSON.parse(JSON.stringify(misty)), o));
  ok(bad({ restrictions: { contact: true } }).some((m) => m.includes('unknown restriction contact')), 'an unknown restriction is rejected');
  ok(bad({ restrictions: { tells: 'no' } }).some((m) => m.includes('tells')), 'a bad tells value is rejected');
  ok(bad({ restrictions: { healLimit: -1 } }).some((m) => m.includes('healLimit')), 'a bad healLimit is rejected');
  ok(bad({ hpMult: null }).some((m) => m.includes('hpMult')), 'the switch needs an hpMult');
  ok(bad({ hpMult: { 1: 26, 9: 2 } }).some((m) => m.includes('hpMult')), 'hpMult loops are checked');
  ok(bad({ playerEntity: 'yes' }).some((m) => m.includes('playerEntity')), 'the switch is true or absent');
  ok(!bad({ restrictions: { tells: false, healLimit: 2 } }).length, 'good restrictions pass');
}

// 11. edge unstick (Jess 2026-11-07, docs/ASCII Concept Maps/Gym Leader - Edge Unstick.txt). Hand-derived from the map:
// stuck = moved under 35% of the heading's step for over 0.35 s; side-step 0.7 s at 1.25 rad; smart side by look-ahead.
{
  reset();
  human.x = 0;
  human.y = 5000;
  const collide0 = G.World.collide;
  // a wall on the north (y < 0), and with east, one on the east too (x > 0)
  const wall = (east) => (b) => {
    let hit = false;
    if (b.y < 0) {
      b.y = 0;
      hit = true;
    }
    if (east && b.x > 0) {
      b.x = 0;
      hit = true;
    }
    return hit;
  };
  const run = (e, secs) => {
    for (let i = 0; i < Math.round(secs / DT); i++) e.update(DT, human);
  };
  // a. pinned on the north wall, both sides open: after 0.35 s she side-steps to the side she circles, and slides along
  G.World.collide = wall(false);
  const a = leader();
  a.steer = () => [0, -1];
  a.brain.side = -1;
  run(a, 0.3);
  ok(a.sideT <= 0, 'unstick: no side-step after 0.3 s pinned');
  run(a, 0.1);
  ok(a.sideT > 0, 'unstick: pinned 0.4 s, she side-steps');
  ok(a.side === -1, 'unstick: both sides open, she takes the side she circles: ' + a.side);
  const x0 = a.x;
  run(a, 0.2);
  ok(a.x < x0 - 5, 'unstick: the side-step slides her west along the wall: ' + (a.x - x0).toFixed(1));
  // b. a corner (north and east walls): the west side has room, the east has none, so she goes west over her circling side
  G.World.collide = wall(true);
  const b = leader();
  b.steer = () => [0, -1];
  b.brain.side = 1;
  run(b, 0.4);
  ok(b.sideT > 0 && b.side === -1, 'unstick: in a corner she takes the open side, not her circling side: ' + b.side);
  // c. moving freely she never side-steps
  G.World.collide = () => false;
  const c = leader();
  c.steer = () => [1, 0];
  let stepped = false;
  for (let i = 0; i < 120; i++) {
    c.update(DT, human);
    if (c.sideT > 0) stepped = true;
  }
  ok(!stepped && c.x > 10, 'unstick: moving freely she never side-steps (moved ' + Math.round(c.x) + ')');
  // d. frames that do not count: no heading (attacking or stunned), and a flinch moving her
  G.World.collide = wall(false);
  const d = leader();
  d.steer = () => [0, 0];
  run(d, 1);
  ok(d.stuckT === 0 && d.sideT <= 0, 'unstick: standing still (attacking, stunned) is never stuck');
  const f = leader();
  f.heading = [0, -1];
  f.stFl = { t: 1 };
  for (let i = 0; i < 60; i++) f.noteStuck(DT, f.x, f.y);
  ok(f.stuckT === 0 && f.sideT <= 0, 'unstick: a flinch frame is never stuck');
  f.stFl = null;
  for (let i = 0; i < 30; i++) f.noteStuck(DT, f.x, f.y);
  ok(f.sideT > 0, 'unstick: the same frames with no flinch are stuck (so the check above is not vacuous)');
  G.World.collide = collide0;
}

// 12. Brock on the new body (entity model close-out): every loop 1 move casts through the real G.GymLeader with his real cards, and
// nothing else does. Up close 20 s, then at range 20 s (no hpBelow line in his set). Geodude, dex 74.
{
  reset();
  const brock = G.Gyms.KANTO.find((g) => g.leader === 'Brock'),
    sig = brock.signatures[0],
    want = G.Gyms.movesFor(sig, 0, 1).map((m) => m.id);
  ok(want.join() === 'tackle,defense-curl,rock-throw', 'Brock loop 1 set by hand: ' + want.join());
  const e = leader(74, gymOf({ leader: 'Brock', species: 'Geodude', cards: G.Gyms.cardsFor(brock, 1), stance: sig.stance, moves: G.Gyms.movesFor(sig, 0, 1).map((m) => Object.assign({}, m)) }));
  ok(e instanceof G.GymLeader && e.slots.length === 3, 'Brock builds as a G.GymLeader with one slot per move');
  const hold = (secs, hx) => {
    for (let i = 0, N = Math.round(secs / DT); i < N; i++) {
      clock += DT;
      human.x = hx;
      human.y = 0;
      e.x = e.y = 0;
      e.update(DT, human);
    }
  };
  hold(20, 30);
  hold(20, 200);
  ok(want.every((id) => casts[id] >= 1), 'every Brock loop 1 move casts: ' + JSON.stringify(casts) + ' want ' + want.join());
  ok(Object.keys(casts).every((id) => want.includes(id)), 'and nothing else');
}

console.log(fail ? 'gym-leader-harness: ' + fail + ' of ' + n + ' FAILED' : 'gym-leader-harness: all ' + n + ' passed');
process.exit(fail ? 1 : 0);
