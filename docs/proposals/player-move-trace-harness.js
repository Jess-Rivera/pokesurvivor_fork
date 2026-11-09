// #43 step A: the movement trace (Node only). Usage from the repo root:
//   node docs/proposals/player-move-trace-harness.js             replay every scenario against the recorded trace
//   PM_RECORD=1 node docs/proposals/player-move-trace-harness.js record the trace from the code as it is (before the split)
// Issue #43 (movement split: the Body accepts, the SimPass moves) and decision 2026-11-09-43-movement-split-opening. Written at the
// slice's start as its end-goal test (docs/branch-rules/feature-gym-leader-ai.md "Slice shape"), recorded on the code before any
// game edit. Step A is behavior-neutral, so every scenario must replay frame for frame after the split.
// Two Player entities run every scenario on a scripted controller:
//   you    a real G.HumanPlayer (Bulbasaur), stepped in game.js order (slot keys, body, slot lock, G.MoveRoute.tick)
//   leader Misty's lead (loop 1) in a real gym fight, stepped as the game steps it (G.EnemyMgr.update, then G.GymArena.update);
//          its AI player still thinks and casts, only the Controller's answers are scripted
// The world is a small stub map laid out around the entity's start: a wall, a fence with a narrow gap, one liquid patch (ice or lava).
// Every frame records position, HP, the dodge state, the body radius, velocity, walking and heading (6 decimals); every cast too.
// The engine loads as in leader-ai-harness.js. The RNG is seeded per scenario (flinch hold, confusion, daze, the AI player's bag).
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const R = path.resolve(__dirname, '..', '..');
const RECORD = !!process.env.PM_RECORD;
const TRACE = path.join(__dirname, 'player-move-trace.json');
const load = (p) => vm.runInThisContext(fs.readFileSync(process.env[OVERRIDE[p]] || path.join(R, p), 'utf8'), { filename: p });
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global;
global.location = { search: '?dev' };
global.document = { querySelectorAll: () => [], getElementById: () => noop, createElement: () => noop, body: noop, addEventListener() {} };
if (!global.performance) global.performance = { now: () => 0 };
let seed = 4242;
Math.random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

// ---------------- the stub map ----------------
// Set per scenario, in absolute coordinates, from the entity's start (sx, sy). Nothing is solid unless a scenario says so.
let MAP = {};
const solidAt = (x, y, r) => {
  if (MAP.wallX != null && x + r > MAP.wallX) return true;
  const F = MAP.fence;
  if (F && y + r > F.y0 && y - r < F.y1 && (x - r < F.gx0 || x + r > F.gx1)) return true;
  return false;
};
const inLiquid = (x, y) => {
  const L = MAP.liquid;
  return !!L && x >= L.x0 && x <= L.x1 && y >= L.y0 && y <= L.y1;
};
const LIQ = {
  ice: { slide: true, immune: ['ice'] },
  longFrame: {
    // a hitch (15 fps): the dodge covers 20 px a frame, so it steps in 4 px pieces and a 6 px fence still stops the shrunk body
    frames: 20,
    dt: 1 / 15,
    map: (sx, sy) => ({ fence: { y0: sy + 30, y1: sy + 36, gx0: sx + 500, gx1: sx + 500 } }),
    axis: () => [0, 1],
    dodge: (f) => f === 0,
  },
  lava: { dmg: 0.06, flat: 5, every: 0.5, color: '#ff8a3d', immune: ['fire'] },
};
const World = {
  TS: 32,
  biome: 0,
  /** Out of the wall to its left, out of the fence to the nearer side (above or below). Returns whether it pushed. */
  collide(e) {
    let hit = false;
    if (MAP.wallX != null && e.x + e.r > MAP.wallX) {
      e.x = MAP.wallX - e.r;
      hit = true;
    }
    const F = MAP.fence;
    if (F && e.y + e.r > F.y0 && e.y - e.r < F.y1 && (e.x - e.r < F.gx0 || e.x + e.r > F.gx1)) {
      const mid = (F.y0 + F.y1) / 2;
      e.y = e.y < mid ? F.y0 - e.r : F.y1 + e.r;
      hit = true;
    }
    return hit;
  },
  isLiquid: (x, y) => inLiquid(x, y),
  liquidKind: () => (MAP.liquid && MAP.liquid.kind) || 'ice',
  isFree: (x, y, r = 12) => !solidAt(x, y, r),
  liquidEffect(types) {
    const e = LIQ[(MAP.liquid && MAP.liquid.kind) || 'ice'];
    if (e.immune && types && types.some((t) => e.immune.includes(t))) return {};
    return e;
  },
  landing(x, y, r) {
    if (solidAt(x, y, r)) return { x: MAP.wallX != null ? MAP.wallX - r : x, y, wall: true };
    return { x, y, wall: false };
  },
  nearestBreakable: () => null,
  projectileBlock: () => null,
  propsInCircle: () => [],
  setArena() {},
  setBiome() {},
};

// ---------------- the engine ----------------
let current = null; // whoever G.Game.player is this scenario: your real mon, or the target stub in a leader scenario
const target = { x: 0, y: 0, r: 12, dead: false, hp: 1e6, maxHp: 1e6, bodyH: 20, level: 20, mon: { types: ['typeless'] }, isPlayer: true, invuln: 0, kills: 0, bosses: 0, bonds: 0, runItems: [] };
target.hurt = () => {};
target.takeHit = () => {};
target.applyFlinch = () => false;
target.hasItem = () => false;
target.activeGroup = () => [];
target.revive = () => {};
const base = {
  U: null,
  Sprites: { Animator: class { update() {} loop() {} play(a) { this.last = a; } busy() { return false; } draw() {} _start() {} }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, dirFromAngle: () => 0, animMeta: () => ({ ay: 20 }), hasShiny: () => false, drawShadow() {}, preload() {}, PX: 1 },
  FX: { dmgText() {}, spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {}, slash() {} },
  VFX: { forMove: () => ({}) },
  Weather: { mult: () => 1, speedFor: () => 1, force() {}, clear() {} },
  Game: {
    get player() {
      return current;
    },
    everyone: () => [current],
    evKill() {},
    st: { time: 0 },
    roster: [{ dex: 1, copyUid: 'uid-bulba', teamSlot: 0, dead: false }],
    activeIndex: 0,
    grantLevels() {},
    reviveTeam() {},
    badgeBoost() {},
    flash() {},
    offerBond() {},
  },
  Settings: { get: () => false },
  Input: { axis: () => [0, 0], action: () => false },
  Audio: { sfx() {} },
  Log: { on: false, who: () => null },
  Camera: { kick() {}, sees: () => true, outerRadius: () => 400, x: 0, y: 0, w: 800, h: 600, left: () => -400, top: () => -300 },
  Coop: { active: false, isHost: false, broadcast() {} },
  World,
  Tiles: { T: 16, arenaBiome: () => 0, ARENA_THEMES: {} },
  Path: { dirFor: () => null },
  Hazards: { add: (h) => h, clear() {} },
  Projectiles: { all: () => [], nearest: (all, x, y, r) => all.find((e) => !e.dead && Math.hypot(e.x - x, e.y - y) <= r) || null, clear() {} },
  Drops: { roll() {} },
  Grounds: { berryGuard: () => false },
  Items: {},
  Silver: { kill() {} },
  Progress: { kill() {} },
  Spawner: { xpBoost: () => 1, say() {}, banner: () => null },
  Elites: { hpFor: () => ({ hp: 1000 }), afterGate() {} },
  Pickups: { pullAll() {} },
};
const warn0 = console.warn;
console.warn = (m, ...a) => (/^\[Gym\]/.test(m) ? undefined : warn0(m, ...a)); // the card-stack dev warning, once per fight
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
const OVERRIDE = { 'js/entities/player.js': 'PM_PLAYER', 'js/entities/gym-leader.js': 'PM_LEADER', 'js/systems/move-sim.js': 'PM_SIM', 'js/systems/gym-arena.js': 'PM_ARENA' };
try {
  load('js/core/util.js');
} catch (e) {
  /* it reads the DOM at the end; G.U is set before that */
}
// dev.html order. A file the split adds is listed in OPTIONAL and loads only when it exists, so the record run works on the code before.
const FILES = ['js/core/stats.js', 'js/data/pokedex.js', 'js/data/types.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/elite.js', 'js/entities/player.js', 'js/entities/player-sim-pass.js', 'js/entities/gym-leader.js', 'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/data/moves.js', 'js/systems/team-cards.js', 'js/systems/team.js', 'js/systems/move-sim.js', 'js/systems/move-route.js', 'js/systems/move-effects.js', 'js/data/gyms.js', 'js/entities/boss-ai.js', 'js/systems/leader-memory.js', 'js/systems/leader-info.js', 'js/entities/leader-ai.js', 'js/systems/combat.js', 'js/systems/gym.js', 'js/systems/gym-arena.js'];
const OPTIONAL = ['js/entities/player-sim-pass.js'];
for (const p of FILES) {
  if (OPTIONAL.includes(p) && !fs.existsSync(path.join(R, p))) continue;
  try {
    load(p);
  } catch (e) {
    console.log('load failed', p, e.message);
    process.exit(1);
  }
}
// the AI player's own decisions off (as leader-ai-harness trace5): the trace is about the body, not the AI's choices
Object.assign(G.LeaderAI.off, { swaps: true, dodges: true, confidence: true, pacing: true, triggers: true, memory: true });

let fail = 0,
  n = 0;
const ok = (c, m) => {
  n++;
  if (!c) {
    fail++;
    console.log('FAIL ' + m);
  }
};
const DT = 1 / 60;
const r6 = (v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v);
const script = (o = {}) =>
  Object.assign({ axis: () => [0, 0], dodge: () => false, shake: () => false, swapSlot: () => -1, swapDir: () => 0, slots: () => [], cycles: () => [] }, o);

// ---------------- the two hosts ----------------
/** Your mon, alone on the stub map, stepped in game.js order: slot keys, the body, the slot lock, G.MoveRoute.tick. */
function youHost() {
  G.EnemyMgr.clear();
  G.MoveSim.clear();
  G.MoveRoute.reset();
  G.MoveSim.setRng(Math.random);
  G.GymArena.reset();
  const e = new G.HumanPlayer(G.DEX_BY[1]);
  e.addMove('harden'); // a self move: it casts with nothing in reach, so the stun's cast refusal shows for you too
  e.x = 1000;
  e.y = 1000;
  current = e;
  let time = 0;
  return {
    e,
    step(dt) {
      time += dt;
      G.Game.st.time = time;
      e.takeSlotInput();
      e.update(dt);
      if (!e.dead && e.swapT > 0) e.swapT = Math.max(0, e.swapT - dt);
      G.MoveRoute.tick(dt, e, time);
    },
  };
}
const K = G.Gyms.listFor(null);
/** Misty's lead at loop 1 in a real gym fight, stepped as the game does (the enemy list, then the arena). */
function leaderHost() {
  current = target;
  G.GymArena.reset();
  G.Gym.reset();
  G.EnemyMgr.clear();
  G.MoveSim.clear();
  G.MoveSim.setRng(Math.random);
  G.Gym.debugLoop(1);
  G.Game.st.time = 0;
  const idx = K.findIndex((g) => g.leader === 'Misty'),
    k = K[idx];
  G.GymArena.openGate({ idx, id: k.id, leader: k.leader, badge: k.badge, arena: k.arena, boost: k.boost || null, dex: k.signatures[0].line[0].dex, level: 12, openedAt: 0 });
  G.GymArena.enterRequest();
  const a = G.GymArena.arena,
    e = a.team.active;
  target.x = a.x;
  target.y = a.y + 96;
  target.dead = false;
  return {
    e,
    arena: a,
    step(dt) {
      G.Game.st.time += dt;
      G.EnemyMgr.update(dt, target);
      G.GymArena.update(dt, target);
    },
  };
}

// ---------------- the scenarios ----------------
// Each: the map around the start (sx, sy), the controller per frame f (0-based), and events applied before frame f's step.
// `frames` at 60 fps. Distances stay within 130 px of the start so the leader never meets the arena edge (checked below).
const SC = {
  walk: {
    frames: 75,
    axis: (f) => (f < 36 ? [1, 0.5] : f < 60 ? [-1, 0] : [0, 0]),
  },
  wallSlide: {
    frames: 60,
    map: (sx, sy) => ({ wallX: sx + 40 }),
    axis: () => [1, 0.3],
  },
  dodgeGap: {
    // a 12 px gap in a fence 30 px above: walking cannot pass (body r 10), the dodge's shrunk body can; then a standing dodge
    frames: 110,
    map: (sx, sy) => ({ fence: { y0: sy - 30, y1: sy - 20, gx0: sx - 6, gx1: sx + 6 } }),
    axis: (f) => (f < 70 ? [0, -1] : [0, 0]),
    dodge: (f) => f === 4 || f === 10 || f === 95, // the second press lands in the gap time and is refused
  },
  ice: {
    frames: 150,
    map: (sx, sy) => ({ liquid: { kind: 'ice', x0: sx - 60, x1: sx + 110, y0: sy - 200, y1: sy + 200 } }),
    axis: (f) => (f < 30 ? [1, 0] : f < 55 ? [0, 0] : f < 90 ? [0, 1] : [1, 0]),
    dodge: (f) => f === 58, // ends on ice: the glide
  },
  push: {
    frames: 70,
    axis: () => [0, 1],
    dodge: (f) => f === 30,
    at: { 8: (e) => e.push(1, 0, 140), 34: (e) => e.push(-1, 0.5, 80) }, // the second cancels the dodge in progress
  },
  flinch: {
    frames: 100,
    axis: (f) => (f < 50 ? [1, 0] : [0, 0]),
    at: { 10: (e) => e.applyFlinch(), 70: (e) => e.applyFlinch() }, // moving, then standing
  },
  confusion: {
    frames: 90,
    axis: () => [1, 0],
    at: { 1: (e) => G.Status.apply(e, 'confusion') },
  },
  daze: {
    frames: 90,
    axis: () => [0.6, 0.8],
    at: { 1: (e) => G.Status.apply(e, 'daze') },
  },
  stun: {
    // asleep: no walking, no dodge, no new attack; the timers run on. The leader's target stands 60 px to its right, so it casts
    // before the sleep and after it ends; your Harden casts on its own (a self move).
    frames: 720,
    axis: (f) => (f < 6 ? [1, 0] : [0, 0]),
    dodge: (f) => f === 160 || f === 700,
    targetAt: (sx, sy) => [sx + 60, sy],
    at: { 120: (e) => G.Status.apply(e, 'sleep') },
  },
  freezeDodge: {
    frames: 60,
    axis: () => [-1, 0],
    dodge: (f) => f === 3,
    at: { 8: (e) => G.Status.apply(e, 'freeze') }, // cancels the dodge in progress
  },
  flyLand: {
    // in the air walls do not block; coming down inside the wall costs 1/16 max HP and puts it beside the wall
    frames: 50,
    map: (sx, sy) => ({ wallX: sx + 30 }),
    axis: () => [1, 0],
    at: { 0: (e) => (e.flyT = 0.4) },
  },
  longFrame: {
    // a hitch (15 fps): the dodge covers 20 px a frame, so it steps in 4 px pieces and a 6 px fence still stops the shrunk body
    frames: 20,
    dt: 1 / 15,
    map: (sx, sy) => ({ fence: { y0: sy + 30, y1: sy + 36, gx0: sx + 500, gx1: sx + 500 } }),
    axis: () => [0, 1],
    dodge: (f) => f === 0,
  },
  lava: {
    frames: 100,
    map: (sx, sy) => ({ liquid: { kind: 'lava', x0: sx - 40, x1: sx + 40, y0: sy - 40, y1: sy + 40 } }),
    axis: (f) => (f < 60 ? [0.3, 0] : [1, 0]),
  },
};

function run(hostOf, name) {
  const S = SC[name];
  seed = 4242;
  const h = hostOf(),
    e = h.e,
    sx = e.x,
    sy = e.y;
  MAP = S.map ? S.map(sx, sy) : {};
  if (S.targetAt) [target.x, target.y] = S.targetAt(sx, sy);
  let f = 0;
  e.controller = script({ axis: () => S.axis(f), dodge: () => !!(S.dodge && S.dodge(f)) });
  const casts = [],
    rows = [];
  const off = G.SimBus.on('move:cast', (ev) => {
    if (e.id != null ? ev.ownerId === e.id : !ev.rival) casts.push([f, ev.moveId]); // yours carries no id (ownerId null)
  });
  let outside = false;
  try {
    for (f = 0; f < S.frames; f++) {
      if (S.at && S.at[f]) S.at[f](e);
      h.step(S.dt || DT);
      rows.push([f, r6(e.x - sx), r6(e.y - sy), r6(e.hp), r6(e.dodgeT || 0), r6(e.r), r6(e.svx || 0), r6(e.svy || 0), e.walking ? 1 : 0, r6(e.moveAngle || 0), e.stMajor ? e.stMajor.k : '']);
      if (h.arena && Math.hypot(e.x - h.arena.x, e.y - h.arena.y) > (h.arena.r - 1.4) * World.TS - 1) outside = true;
    }
  } finally {
    off();
    MAP = {};
  }
  return { rows, casts, outside };
}

const HOSTS = { you: youHost, leader: leaderHost };
const got = {};
for (const who of Object.keys(HOSTS)) for (const name of Object.keys(SC)) got[who + '.' + name] = run(HOSTS[who], name);

// sanity: the scenarios show what they claim, on the code as it is (hand facts, not recorded values)
for (const who of Object.keys(HOSTS)) {
  const g = (name) => got[who + '.' + name].rows,
    last = (name) => g(name)[g(name).length - 1];
  ok(!Object.keys(SC).some((s) => got[who + '.' + s].outside), who + ': no scenario reaches the arena edge');
  ok(g('walk')[35][1] > 30 && last('walk')[8] === 0, who + ' walk: it walks right, then stands');
  ok(g('wallSlide').every((r) => r[1] <= 30 + 1e-6) && last('wallSlide')[2] > 5, who + ' wallSlide: held left of the wall (r 10), sliding down');
  ok(last('dodgeGap')[2] < -30, who + ' dodgeGap: the shrunk body passed the fence gap');
  ok(g('ice')[45][6] > 0, who + ' ice: still sliding right 15 frames after letting go');
  ok(g('push')[12][6] > 300, who + ' push: the Roar push carries it right');
  {
    const st = got[who + '.stun'],
      asleep = st.rows.filter((r) => r[10] === 'sleep').map((r) => r[0]);
    ok(asleep.length > 30 && asleep.every((f) => st.rows[f][8] === 0 && st.rows[f][4] === 0), who + ' stun: asleep (' + asleep.length + ' frames), no walking and no dodge');
    ok(st.casts.some((c) => c[0] < asleep[0]) && st.casts.some((c) => c[0] > asleep[asleep.length - 1]), who + ' stun: it casts before the sleep and after it');
    ok(!st.casts.some((c) => asleep.includes(c[0])), who + ' stun: no cast while asleep');
  }
  ok(last('flyLand')[1] <= 20 + 1e-6, who + ' flyLand: it comes down beside the wall');
  ok(g('longFrame').every((r) => r[2] <= 30 + 1e-6), who + ' longFrame: the thin fence holds on a long frame');
  ok(last('lava')[3] < g('lava')[0][3], who + ' lava: the lava hurts it');
}

if (RECORD) {
  const out = {};
  for (const k of Object.keys(got)) out[k] = { rows: got[k].rows, casts: got[k].casts };
  fs.writeFileSync(TRACE, JSON.stringify(out) + '\n');
  console.log('recorded ' + Object.keys(out).length + ' scenarios to ' + path.relative(R, TRACE));
} else {
  const want = JSON.parse(fs.readFileSync(TRACE, 'utf8'));
  ok(Object.keys(want).join() === Object.keys(got).join(), 'the same scenarios as the recording');
  for (const k of Object.keys(want)) {
    const a = want[k],
      b = got[k];
    if (!b) continue;
    let first = -1;
    for (let i = 0; i < Math.max(a.rows.length, b.rows.length); i++)
      if (JSON.stringify(a.rows[i]) !== JSON.stringify(b.rows[i])) {
        first = i;
        break;
      }
    ok(first < 0, k + ': every frame as recorded' + (first < 0 ? '' : ' (first difference at frame ' + first + ': want ' + JSON.stringify(a.rows[first]) + ', got ' + JSON.stringify(b.rows[first]) + ')'));
    ok(JSON.stringify(a.casts) === JSON.stringify(b.casts), k + ': the casts as recorded (' + a.casts.length + ' want, ' + b.casts.length + ' got)');
  }
}
console.log('player-move-trace: ' + (fail ? fail + ' FAILED of ' + n : 'all ' + n + ' passed'));
if (fail) process.exit(1);
