// Entity model slice 8: leader AI, slot choice (Node only). Usage from the repo root:  node docs/proposals/leader-slots-harness.js
// Map: docs/ASCII Concept Maps/Entity Model Slice 8 - Leader Slot Choice.txt (Q1 to Q10, Jess 2026-11-07). Loads the same real modules
// and stubs as gym-leader-harness.js. Expected values are hand-derived from the map and the move data (cooldowns, reaches, TELL), never
// read from the brain's own output. leader-slots-mutate.js points LS_<FILE> at altered copies.
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const R = path.resolve(__dirname, '..', '..');
const SRC = {
  'js/entities/gym-leader.js': 'LS_LEADER',
  'js/entities/player.js': 'LS_PLAYER',
  'js/entities/boss-ai.js': 'LS_BRAIN',
  'js/systems/status.js': 'LS_STATUS',
  'js/systems/move-effects.js': 'LS_FX',
  'js/systems/combat.js': 'LS_COMBAT',
  'js/data/gyms.js': 'LS_GYMS',
  'js/systems/gym.js': 'LS_GYM',
  'js/entities/enemy.js': 'LS_ENEMY',
  'js/entities/leader-ai.js': 'LS_AI', // leader AI slice 5a: the slot choice moved to the AI player
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
for (const p of ['js/core/stats.js', 'js/data/pokedex.js', 'js/data/types.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/elite.js', 'js/entities/player.js', 'js/entities/gym-leader.js', 'js/systems/leader-memory.js', 'js/systems/leader-info.js', 'js/entities/leader-ai.js', 'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/data/moves.js', 'js/systems/team-cards.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js', 'js/data/gyms.js', 'js/entities/boss-ai.js', 'js/systems/combat.js']) {
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


const sfx = [];
G.Audio.sfx = (k) => sfx.push(k);
const MISTY = G.Gyms.KANTO.find((g) => g.leader === 'Misty');
const L1 = () => G.Gyms.movesFor(MISTY.signatures[0], 0, 1).map((m) => Object.assign({}, m));
const ids = (e) => e.slots.map((g) => g.map((s) => s.id).join('+')).join(',');
const reachOf = (e, id) => G.Gyms.reachOf(e.caster.def(id), G.Gyms.formOf(e.caster.def(id)));
/** Every move ready, its last tell k(id) cooldowns ago, so its freshness is exactly k(id). */
const fresh = (e, k) => {
  for (const g of e.slots)
    for (const s of g) {
      s.t = 0;
      s.last = clock - k(s.id) * e.caster.def(s.id).cd * e.cdMul;
    }
};
const TWO = () => [{ id: 'tackle' }, { id: 'water-pulse' }];
const at = (e, x) => {
  e.x = e.y = 0;
  human.x = x;
  human.y = 0;
};
const run = (e, frames, x) => {
  for (let i = 0; i < frames; i++) {
    clock += DT;
    at(e, x);
    e.update(DT, human);
  }
};

// 1. layout (Q1, Q5)
reset();
{
  const e = leader(STARYU, gymOf({ moves: L1() }));
  ok(ids(e) === 'tackle,harden,water-pulse,recover', 'Misty loop 1: one slot per line: ' + ids(e));
  ok(e.moves.length === 4 && e.moves.every((s) => s.type), 'the flat moves list holds all four, typed');
  const b = leader(STARYU, gymOf({ moves: [{ id: 'water-gun', bond: true }, { id: 'tackle', bond: true }, { id: 'harden' }] }));
  ok(ids(b) === 'water-gun+tackle,harden', 'bonded lines share one slot, where the first stands: ' + ids(b));
  b.active = 0;
  ok(b.activeGroup().length === 2, 'the bonded slot is one active group of 2');
  const o = oldBody(STARYU, gymOf({ playerEntity: false, moves: L1() }));
  ok(o.slots.length === 1 && o.slots[0].length === 4, 'the wild body keeps one group (the old brain is untouched)');
}

// 2. the hold (your 0.4 s SWAP_LOCK) and the switch feel (Q8)
reset();
{
  const e = leader(STARYU, gymOf({ moves: TWO() }));
  e.active = 0;
  sfx.length = 0;
  e.setActive(1);
  ok(e.active === 1 && near(e.swapT, 0.4), 'a switch holds the slot 0.4 s: ' + e.swapT);
  ok(!sfx.includes('select'), 'a leader switch plays no select sound');
  e.setActive(0);
  ok(e.active === 1, 'no switch inside the hold');
  e.ai.pickSlot = () => -1;
  run(e, 25, 5000);
  ok(e.swapT === 0, 'the hold ticks down on the leader itself, with no game.js: ' + e.swapT);
  e.setActive(0);
  ok(e.active === 0, 'after the hold the switch goes through');
  sfx.length = 0;
  G.HumanPlayer.prototype.onSwitchFeel.call({});
  ok(sfx.includes('select'), 'your switch still plays the select sound');
}

// 3. the pick (Q2). Score = freshness x fit (POINT_BLANK 0.5 for a shot inside the close reach) x opportunity (1 here).
reset();
{
  const mk = (active) => {
    const e = leader(STARYU, gymOf({ moves: TWO() }));
    e.active = active;
    return e;
  };
  const e0 = mk(0),
    TK = reachOf(e0, 'tackle'),
    WP = reachOf(e0, 'water-pulse'),
    mid = TK + human.r + 20,
    close = Math.max(1, TK - 5);
  ok(mid < WP, 'precondition: a spot past Tackle and inside Water Pulse: ' + TK + ' / ' + WP);
  // a. past Tackle's reach, on Tackle: only Water Pulse scores, so it switches, with the hold
  const a = mk(0);
  fresh(a, () => 1);
  at(a, mid);
  a.ai.pressSlot(a, a.ai.pickSlot(a, human, clock));
  a.takeSlotInput(); // the AI presses its choice and the body reads it, as yours (LEADER-AI slice 1, #40)
  ok(a.active === 1 && near(a.swapT, 0.4), 'out of Tackle reach it switches to Water Pulse, holding 0.4 s: ' + a.active + ' ' + a.swapT);
  // b. inside reach, on Water Pulse: Tackle 1 against Water Pulse 1 x 0.5; 1 >= 1.5 x 0.5, so it switches to Tackle
  const b = mk(1);
  fresh(b, () => 1);
  at(b, close);
  b.ai.pressSlot(b, b.ai.pickSlot(b, human, clock));
  b.takeSlotInput(); // the AI presses its choice and the body reads it, as yours (LEADER-AI slice 1, #40)
  ok(b.active === 0, 'up close Tackle (1) beats Water Pulse (0.5) by 2x: switch');
  // c. the stay rule: on Tackle (1), Water Pulse 2.8 x 0.5 = 1.4 < 1.5, so it stays
  const c = mk(0);
  fresh(c, (id) => (id === 'tackle' ? 1 : 2.8));
  at(c, close);
  c.ai.pressSlot(c, c.ai.pickSlot(c, human, clock));
  c.takeSlotInput(); // the AI presses its choice and the body reads it, as yours (LEADER-AI slice 1, #40)
  ok(c.active === 0, 'Water Pulse at 1.4x does not pull it off a ready Tackle');
  // d. Water Pulse 3.2 x 0.5 = 1.6 >= 1.5, so it switches
  const d = mk(0);
  fresh(d, (id) => (id === 'tackle' ? 1 : 3.2));
  at(d, close);
  d.ai.pressSlot(d, d.ai.pickSlot(d, human, clock));
  d.takeSlotInput(); // the AI presses its choice and the body reads it, as yours (LEADER-AI slice 1, #40)
  ok(d.active === 1, 'Water Pulse at 1.6x does');
  // e. never inside the hold or a tell
  const h = mk(1);
  fresh(h, () => 1);
  at(h, close);
  h.swapT = 0.2;
  h.ai.pressSlot(h, h.ai.pickSlot(h, human, clock));
  h.takeSlotInput(); // the AI presses its choice and the body reads it, as yours (LEADER-AI slice 1, #40)
  ok(h.active === 1, 'no pick inside the hold');
  h.swapT = 0;
  h.caster.tell = { fired: false };
  h.ai.pressSlot(h, h.ai.pickSlot(h, human, clock));
  h.takeSlotInput(); // the AI presses its choice and the body reads it, as yours (LEADER-AI slice 1, #40)
  ok(h.active === 1, 'nor inside a tell');
}

// 4. only the active slot casts
reset();
{
  const e = leader(STARYU, gymOf({ moves: TWO() }));
  e.active = 0;
  e.caster.init();
  e.caster.wait = 0;
  e.ai.pickSlot = () => -1;
  run(e, 30, reachOf(e, 'tackle') + human.r + 20);
  ok(!casts['water-pulse'] && !e.caster.tell, 'a ready Water Pulse on an inactive slot never starts a tell: ' + JSON.stringify(casts));
}

// 5. buff visits (Q3)
reset();
{
  const mk = () => leader(STARYU, gymOf({ moves: [{ id: 'tackle' }, { id: 'harden' }] }));
  const e = mk();
  e.active = 0;
  const away = reachOf(e, 'tackle') + human.r + 20;
  ok(G.MoveEffects.statReady(e.caster.def('harden'), e), "precondition: Harden's Gate is open on a fresh leader");
  at(e, away);
  e.ai.pressSlot(e, e.ai.pickSlot(e, human, clock));
  e.takeSlotInput(); // the AI presses its choice and the body reads it, as yours (LEADER-AI slice 1, #40)
  ok(e.active === 1, 'nothing in reach is ready: it visits the Harden slot');
  const f = mk();
  f.active = 0;
  f.caster.init();
  f.caster.wait = 0;
  f.ai.pickSlot = () => -1;
  run(f, 30, away);
  ok(!casts.harden, 'Harden never casts from the bench: ' + JSON.stringify(casts));
  f.active = 1;
  run(f, 5, away);
  ok(casts.harden === 1, 'from the active slot it casts: ' + casts.harden);
}

// 6. the self heal visit (Q4) and the closed hpBelow slot (Q1)
reset();
{
  const mk = (o = {}) => {
    const e = leader(STARYU, gymOf(Object.assign({ moves: [{ id: 'tackle' }, { id: 'water-pulse' }, { id: 'recover', hpBelow: 0.35 }] }, o)));
    e.active = 0;
    fresh(e, () => 1);
    at(e, reachOf(e, 'tackle') + human.r + 20);
    return e;
  };
  const a = mk();
  a.hp = a.maxHp * 0.3;
  a.ai.pressSlot(a, a.ai.pickSlot(a, human, clock));
  a.takeSlotInput(); // the AI presses its choice and the body reads it, as yours (LEADER-AI slice 1, #40)
  ok(a.active === 2, 'below 35%: the Recover slot first, ahead of a ready Water Pulse: ' + a.active);
  const b = mk();
  b.hp = b.maxHp * 0.5;
  b.ai.pressSlot(b, b.ai.pickSlot(b, human, clock));
  b.takeSlotInput(); // the AI presses its choice and the body reads it, as yours (LEADER-AI slice 1, #40)
  ok(b.active === 1, 'above its line the Recover slot is closed: Water Pulse: ' + b.active);
  const c = mk({ restrictions: { healLimit: 0 } });
  c.hp = c.maxHp * 0.3;
  c.ai.pressSlot(c, c.ai.pickSlot(c, human, clock));
  c.takeSlotInput(); // the AI presses its choice and the body reads it, as yours (LEADER-AI slice 1, #40)
  ok(c.active === 1, 'healLimit 0: no heal visit: ' + c.active);
}

// 7. bonds (Q5): one tell, the longest member's length, every ready member fires on the release; the validator
reset();
{
  const e = leader(STARYU, gymOf({ moves: [{ id: 'tackle', bond: true }, { id: 'water-pulse', bond: true }, { id: 'harden' }] }));
  e.active = 0;
  e.caster.init();
  e.caster.wait = 0;
  e.ai.pickSlot = () => -1;
  fresh(e, () => 1);
  const close = Math.max(1, reachOf(e, 'tackle') - 5);
  run(e, 1, close);
  const t = e.caster.tell;
  ok(!!t && t.id === 'tackle' && !!t.bond && t.bond.length === 1 && t.bond[0].s.id === 'water-pulse', 'one tell for the bonded slot: Tackle leads, Water Pulse rides');
  ok(!!t && near(t.wind, Math.max(G.Boss.TELL.melee, G.Boss.TELL.shot)), 'the tell lasts its longest member (0.5 s): ' + (t && t.wind));
  run(e, 40, close);
  ok(casts.tackle === 1 && casts['water-pulse'] === 1, 'both fire on the one release: ' + JSON.stringify(casts));
  const v = (sets, o = {}) => {
    const g = JSON.parse(JSON.stringify(MISTY));
    g.signatures[0].sets = sets;
    return G.Gyms.validate(Object.assign(g, o));
  };
  const two = [{ id: 'tackle', bond: true }, { id: 'water-pulse', bond: true }, { id: 'harden' }];
  ok(!v({ 1: two }).length, 'a bond of 2 passes: ' + v({ 1: two }).join('; '));
  ok(v({ 1: [{ id: 'tackle', bond: true }, { id: 'water-pulse' }] }).some((m) => m.includes('a bond needs 2 to 4')), 'a bond of one is rejected');
  ok(v({ 1: [{ id: 'tackle', bond: 'yes' }, { id: 'water-pulse' }] }).some((m) => m.includes('bond is true or absent')), 'a bad bond value is rejected');
  ok(v({ 1: two }, { playerEntity: undefined }).some((m) => m.includes('bond needs playerEntity')), 'a bond on the wild body is rejected');
}

// 8. the melee cushion (Q6). Staryu L20 Def floor(2 x 55 x 20 / 100) + 5 = 27, A 1000, neutral: 1000 / 27 + 2
reset();
{
  const D = 1000 / 27 + 2,
    e = leader();
  e.active = e.slots.findIndex((g) => g[0].id === 'tackle');
  const t = hit(e, spec({ type: 'normal' })).took;
  ok(near(t, D * 0.75), 'Tackle active: a hit lands at 0.75: ' + t);
  const w = leader();
  w.active = w.slots.findIndex((g) => g[0].id === 'water-pulse');
  const u = hit(w, spec({ type: 'normal' })).took;
  ok(near(u, D), 'Water Pulse active: in full: ' + u);
}

// 9. flinch (Q7): the tell is lost, the active slot restarts at cd + 0.3, the other slots are untouched, no extra wait
reset();
{
  const e = leader(STARYU, gymOf({ moves: TWO() }));
  e.active = 1;
  e.caster.init();
  e.caster.wait = 0;
  const act = e.slots[1][0],
    other = e.slots[0][0];
  act.t = 0;
  other.t = 0;
  e.caster.tell = { slot: act, id: 'water-pulse', form: 'shot', t: 0, wind: 0.5, after: 0.3, ang: 0, spot: null, fired: false };
  ok(e.applyFlinch() === true && e.caster.tell === null, 'a flinch loses the tell');
  ok(near(act.t, e.caster.def('water-pulse').cd * e.cdMul + 0.3), 'the active slot restarts at cd + 0.3: ' + act.t);
  ok(other.t === 0 && e.caster.wait === 0, 'the other slot is untouched, no extra wait');
  const s = leader();
  s.stMajor = { k: 'sleep', t: 2, age: 0 };
  ok(s.applyFlinch() === false, 'an asleep leader cannot flinch');
}

// 10. sensing (Q9): a plain snapshot, no gym rule in it
{
  const s = G.Boss.sense({ x: 0, y: 0, hp: 50, maxHp: 200 }, { x: 30, y: 40, r: 12, stMajor: { k: 'paralysis', t: 5 } });
  ok(near(s.dist, 50) && near(s.hpFrac, 0.25) && s.foeMajor === 'paralysis' && s.foeR === 12, 'sense: dist 50, HP 25%, your paralysis, your radius');
  ok(!/\bgym\b/.test(G.Boss.sense.toString()), 'sense reads no gym rule');
}

console.log(fail ? 'leader-slots-harness: ' + fail + ' of ' + n + ' FAILED' : 'leader-slots-harness: all ' + n + ' passed');
process.exit(fail ? 1 : 0);
