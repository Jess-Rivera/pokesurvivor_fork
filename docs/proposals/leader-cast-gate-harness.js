// #47a: a leader's attacks go through your cast gate (Node only). Usage from the repo root:
//   node docs/proposals/leader-cast-gate-harness.js
// Issue #47 (47a) and decisions 2026-11-09-42-leader-attacks-wait-on-your-cast-gate and 2026-11-09-47-split-and-utility-ai-overhaul.
// Written at the slice's start as its end-goal test (docs/branch-rules/feature-gym-leader-ai.md "Slice shape"), before any game edit:
// on the code before #47a the leader's own reach check makes it fail.
// Each scenario runs twice, from the same start, with the same one move ready on frame 0:
//   you     a real G.HumanPlayer (Bulbasaur) holding only that move, stepped in game.js order; its foe is a still dummy on the enemy list
//   leader  Misty's lead (loop 1) in a real gym fight holding only that move, stepped as the game steps it; its foe is the player stub
// The foe stands `d` px east of the caster (and moves to `d2` before frame `at`). Recorded: the frame your cast fires and the frame the
// leader's tell starts (its wind-up; a self move casts with no tell, so its cast frame). They must be the same frame, or both never.
// Expected frames are hand-derived from the move data and your gate (js/systems/move-sim.js AIM, RETRY 0.05 s = 3 frames at 60 fps):
//   Tackle (melee, nearest, caster static): fires while the foe's centre is within its cone radius 54 + the foe's body 12 = 66 px.
//   Rock Throw (shot, direction): fires while a foe is within its range 420 px, though it flies only about 373 px.
//   Growl (nova, none): no target needed, fires anywhere. Harden (pure buff, self): casts at once, no tell.
//   A refused cast retries 0.05 s later: refused on frame 0, it tries again on frame 3, 6, 9 ...
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const R = path.resolve(__dirname, '..', '..');
const OVERRIDE = { 'js/entities/gym-leader.js': 'CG_LEADER', 'js/systems/move-sim.js': 'CG_SIM' };
const read = (p) => fs.readFileSync(process.env[OVERRIDE[p]] || path.join(R, p), 'utf8');
const load = (p) => vm.runInThisContext(read(p), { filename: p });
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global;
global.location = { search: '?dev' };
global.document = { querySelectorAll: () => [], getElementById: () => noop, createElement: () => noop, body: noop, addEventListener() {} };
if (!global.performance) global.performance = { now: () => 0 };
let seed = 4242;
Math.random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

// ---------------- the engine (as player-move-trace-harness.js, with an open map) ----------------
let current = null;
const target = { x: 0, y: 0, r: 12, dead: false, hp: 1e6, maxHp: 1e6, bodyH: 20, level: 20, mon: { types: ['typeless'] }, isPlayer: true, invuln: 0, kills: 0, bosses: 0, bonds: 0, runItems: [] };
target.hurt = () => {};
target.takeHit = () => {};
target.applyFlinch = () => false;
target.hasItem = () => false;
target.activeGroup = () => [];
target.revive = () => {};
const World = {
  TS: 32,
  biome: 0,
  collide: () => false,
  isLiquid: () => false,
  liquidKind: () => 'ice',
  isFree: () => true,
  liquidEffect: () => ({}),
  landing: (x, y) => ({ x, y, wall: false }),
  nearestBreakable: () => null,
  projectileBlock: () => null,
  propsInCircle: () => [],
  setArena() {},
  setBiome() {},
};
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
  Projectiles: { all: () => [], nearest: () => null, clear() {} },
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
console.warn = (m, ...a) => (/^\[Gym\]/.test(m) ? undefined : warn0(m, ...a));
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
try {
  load('js/core/util.js');
} catch (e) {
  /* it reads the DOM at the end; G.U is set before that */
}
for (const p of ['js/core/stats.js', 'js/data/pokedex.js', 'js/data/types.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/elite.js', 'js/entities/player.js', 'js/entities/player-sim-pass.js', 'js/entities/gym-leader.js', 'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/data/moves.js', 'js/systems/team-cards.js', 'js/systems/team.js', 'js/systems/move-sim.js', 'js/systems/move-route.js', 'js/systems/move-effects.js', 'js/data/gyms.js', 'js/entities/boss-ai.js', 'js/systems/leader-memory.js', 'js/systems/leader-info.js', 'js/systems/leader-belief.js', 'js/systems/leader-planner.js', 'js/entities/leader-ai.js', 'js/systems/combat.js', 'js/systems/gym.js', 'js/systems/gym-arena.js']) {
  try {
    load(p);
  } catch (e) {
    console.log('load failed', p, e.message);
    process.exit(1);
  }
}
// the AI player's own decisions off: one slot, a scripted still controller; this test is about the gate, not the AI's choices
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
const still = () => ({ axis: () => [0, 0], dodge: () => false, shake: () => false, swapSlot: () => -1, swapDir: () => 0, slots: () => [], cycles: () => [] });

// ---------------- the two hosts ----------------
/** Your mon holding only move `id`, its foe a still dummy on the enemy list, stepped in game.js order. */
function youHost(id) {
  G.EnemyMgr.clear();
  G.MoveSim.clear();
  G.MoveRoute.reset();
  G.MoveSim.setRng(Math.random);
  G.GymArena.reset();
  const e = new G.HumanPlayer(G.DEX_BY[1]);
  const m = G.Moves.instance(id);
  e.moves = [m];
  e.slots = [[m]];
  e.active = 0;
  e.teamCards = G.TeamCards.store(); // no cards: the frozen def, as the leader below
  e.x = 1000;
  e.y = 1000;
  e.controller = still();
  current = e;
  const foe = { id: 777001, x: 0, y: e.y, r: 12, dead: false, hp: 1e9, maxHp: 1e9, bodyH: 20, mon: { types: ['typeless'] }, types: ['typeless'], update() {}, hurt() {}, takeHit() {}, applyFlinch: () => false, push() {}, draw() {} };
  G.EnemyMgr.add(foe);
  let time = 0;
  return {
    e,
    foe,
    step(dt) {
      time += dt;
      G.Game.st.time = time;
      G.EnemyMgr.update(dt, e); // the enemy grid your gate searches is rebuilt here, as in the game
      e.takeSlotInput();
      e.shakeStep(dt);
      e.update(dt);
      e.tickSlotLock(dt);
      G.MoveRoute.tick(dt, e, time);
    },
  };
}
const K = G.Gyms.listFor(null);
/** Misty's lead at loop 1 in a real gym fight, holding only move `id` (no cards), its foe the player stub. */
function leaderHost(id) {
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
  e.slots = [[{ id, t: 0 }]];
  e.active = 0;
  e.teamCards = G.TeamCards.store();
  e.controller = still();
  target.x = e.x;
  target.y = e.y;
  target.dead = false;
  return {
    e,
    foe: target,
    step(dt) {
      G.Game.st.time += dt;
      G.EnemyMgr.update(dt, target);
      G.GymArena.update(dt, target);
    },
  };
}

// ---------------- the scenarios ----------------
// d: the foe's distance east of the caster on frame 0; { at, d2 }: before frame `at`'s step it stands at d2; sleep: [from, to) frames
// the caster is asleep (Body refusal); frames: how long to watch. `want`: the hand-derived frame (null: never).
const SC = {
  tackleIn: { move: 'tackle', d: 60, frames: 30, want: 0 },
  tackleOut: { move: 'tackle', d: 80, frames: 30, want: null },
  tackleEdgeIn: { move: 'tackle', d: 65, frames: 30, want: 0 }, // 65 <= 54 + 12
  tackleEdgeOut: { move: 'tackle', d: 67, frames: 30, want: null }, // 67 > 66
  shotPastFlight: { move: 'rock-throw', d: 400, frames: 30, want: 0 }, // inside range 420, past its ~373 px flight
  shotOutOfRange: { move: 'rock-throw', d: 430, frames: 30, want: null },
  novaFar: { move: 'growl', d: 300, frames: 30, want: 0 }, // a nova needs no target
  selfMove: { move: 'harden', d: 300, frames: 30, want: 0, self: true }, // a pure buff casts at once, with no tell
  retryCadence: { move: 'tackle', d: 80, at: 4, d2: 60, frames: 30, want: 6 }, // refused 0 and 3, the foe steps in before 4, fires 6
  retryAfterSleep: { move: 'tackle', d: 60, sleep: [0, 4], frames: 30, want: 6 }, // the Body refuses 0 and 3 (asleep), fires 6
};

function run(hostOf, name) {
  const S = SC[name];
  seed = 4242;
  const h = hostOf(S.move),
    e = h.e,
    place = (d) => {
      h.foe.x = e.x + d;
      h.foe.y = e.y;
    };
  place(S.d);
  let f = 0,
    first = null;
  const leader = hostOf === leaderHost,
    start0 = G.GymLeader.SimPass.start;
  G.GymLeader.SimPass.start = function (...a) {
    if (first == null) first = f;
    return start0.apply(this, a);
  };
  const off = G.SimBus.on('move:cast', (ev) => {
    if (ev.moveId !== S.move || first != null) return;
    if (!leader || S.self) first = f; // yours casts; the leader's self move casts with no tell
  });
  try {
    for (f = 0; f < S.frames; f++) {
      if (S.at === f) place(S.d2);
      if (S.sleep && f === S.sleep[0]) G.Status.apply(e, 'sleep', 1, 1, 10);
      if (S.sleep && f === S.sleep[1]) e.stMajor = null; // it wakes (the status's own end is private to status.js)
      e.x = Math.round(e.x * 1e6) / 1e6; // it stands still (a still controller); guard against drift from a push
      h.step(DT);
    }
  } finally {
    off();
    G.GymLeader.SimPass.start = start0;
  }
  return first;
}

for (const name of Object.keys(SC)) {
  const S = SC[name],
    you = run(youHost, name),
    lead = run(leaderHost, name);
  ok(you === S.want, name + ': your cast on frame ' + S.want + ' (hand-derived), got ' + you);
  ok(lead === you, name + ": the leader's " + (S.self ? 'cast' : 'tell') + ' starts on the frame yours fires (' + you + '), got ' + lead);
}

// ---------------- the source: no reach check of the leader's own ----------------
{
  const src = read('js/entities/gym-leader.js'),
    i = src.indexOf('G.GymLeader.SimPass = {'),
    j = src.indexOf('  due(e, s, d, now) {', i),
    due = src.slice(j, src.indexOf('\n  },', j)); // the due step only: the tell's warning visuals draw the move's reach, rightly
  ok(i > 0 && j > i, "the leader's SimPass and its due step are found");
  ok(!/reachOf\(|G\.U\.dist|Math\.hypot/.test(due) && /G\.MoveSim\.gateOpen\(/.test(due), "the leader's due step measures no reach of its own; it asks your gate (#47a)");
  ok(typeof G.MoveSim.gateOpen === 'function', 'your cast gate is one check the sim exposes (G.MoveSim.gateOpen)');
}

console.log('leader-cast-gate: ' + (fail ? fail + ' FAILED of ' + n : 'all ' + n + ' passed'));
if (fail) process.exit(1);
