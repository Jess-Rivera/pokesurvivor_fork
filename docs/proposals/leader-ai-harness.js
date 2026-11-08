// Leader AI slice 1 (#22): the controls layer and the information model (Node only). Usage from the repo root:
//   node docs/proposals/leader-ai-harness.js             run every check
//   LA_RECORD=1 node docs/proposals/leader-ai-harness.js record the parity trace from the code as it is (before the slice)
// Spec: docs/LEADER-AI.md ("The AI player", "What it can see", "Build order" 1). Written at the slice's start as its end-goal test
// (docs/branch-rules/feature-gym-leader-ai.md "Slice shape"). Loads the real engine as leader-team-harness.js does, then:
//   1 parity: a seeded Misty and Brock loop 2 fight replays the trace recorded before the slice, tick for tick (behavior-neutral)
//   2 controls: every call of a leader's controller comes from the one AI player of its team; a slot change arrives only through slots()
//   3 a forced swap request runs your rules end to end (lock, trap, Fly, i-frames, the bench, the enemy list, the line, no kick or sound)
//   4 the information model: both rosters, move reveals only after a cast, bond reveals by the no-switch rule (Jess 2026-11-08), keys
// Expected values come from the spec and COMBAT-RULES (5 s swap lock, 0.5 s i-frames, 1.3 s send-out beat), never from the code.
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const R = path.resolve(__dirname, '..', '..');
const RECORD = !!process.env.LA_RECORD;
const TRACE = path.join(__dirname, 'leader-ai-trace.json');
const load = (p) => vm.runInThisContext(fs.readFileSync(path.join(R, p), 'utf8'), { filename: p });
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global;
global.location = { search: '?dev' };
global.document = { querySelectorAll: () => [], getElementById: () => noop, createElement: () => noop, body: noop, addEventListener() {} };
if (!global.performance) global.performance = { now: () => 0 };
let seed = 4242;
Math.random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

let says = [],
  kicks = 0,
  sounds = [];
const human = { x: 0, y: 0, r: 12, dead: false, hp: 1e6, maxHp: 1e6, bodyH: 20, level: 20, mon: { types: ['typeless'] }, hurts: [], isPlayer: true, invuln: 0, kills: 0, bosses: 0, bonds: 0, runItems: [] };
human.hurt = (...a) => human.hurts.push(a);
human.takeHit = (b) => human.hurts.push([b]);
human.applyFlinch = () => false;
human.hasItem = () => false;
human.activeGroup = () => [];
human.revive = () => {};
// your roster as the information layer reads it (G.Game.roster, G.Game.activeIndex): species, copy uid, team slot, fainted
const you = [
  { dex: 1, copyUid: 'uid-bulba', teamSlot: 0, dead: false },
  { dex: 4, copyUid: null, teamSlot: 1, dead: false },
];
let youActive = 0;
const base = {
  U: null,
  Sprites: { Animator: class { update() {} loop() {} play(a) { this.last = a; } busy() { return false; } draw() {} _start() {} }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, dirFromAngle: () => 0, animMeta: () => ({ ay: 20 }), hasShiny: () => false, drawShadow() {}, preload() {}, PX: 1 },
  FX: { dmgText() {}, spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {}, slash() {} },
  VFX: { forMove: () => ({}) },
  Weather: { mult: () => 1, speedFor: () => 1, force() {}, clear() {} },
  Game: {
    get player() {
      return human;
    },
    everyone: () => [human],
    evKill() {},
    st: { time: 0 },
    get roster() {
      return you;
    },
    get activeIndex() {
      return youActive;
    },
    grantLevels() {},
    reviveTeam() {},
    badgeBoost() {},
    flash() {},
    offerBond() {},
  },
  Audio: { sfx: (k) => sounds.push(k) },
  Log: { on: false, who: () => null },
  Camera: { kick: () => kicks++, sees: () => true, outerRadius: () => 400, x: 0, y: 0 },
  Coop: { active: false, isHost: false, broadcast() {} },
  World: { collide: () => false, isLiquid: () => false, isFree: () => true, projectileBlock: () => null, propsInCircle: () => [], TS: 32, biome: 0, setArena() {}, setBiome() {}, liquidEffect: () => ({}) },
  Tiles: { T: 16, arenaBiome: () => 0, ARENA_THEMES: {} },
  Path: { dirFor: () => null },
  Hazards: { add: (h) => h, clear() {} },
  Projectiles: { all: () => [], nearest: (all, x, y, r) => all.find((e) => !e.dead && Math.hypot(e.x - x, e.y - y) <= r) || null, clear() {} },
  Drops: { roll() {} },
  Grounds: { berryGuard: () => false },
  Items: {},
  Silver: { kill() {} },
  Progress: { kill() {} },
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
// The engine in dev.html order. The slice's two new files load only when they exist, so the record run works on the code before it.
const FILES = ['js/core/stats.js', 'js/data/pokedex.js', 'js/data/types.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/elite.js', 'js/entities/player.js', 'js/entities/gym-leader.js', 'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/data/moves.js', 'js/systems/team-cards.js', 'js/systems/team.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js', 'js/data/gyms.js', 'js/entities/boss-ai.js', 'js/systems/leader-info.js', 'js/entities/leader-ai.js', 'js/systems/combat.js', 'js/systems/gym.js', 'js/systems/gym-arena.js'];
const NEW = ['js/systems/leader-info.js', 'js/entities/leader-ai.js'];
const missing = [];
for (const p of FILES) {
  if (NEW.includes(p) && !fs.existsSync(path.join(R, p))) {
    missing.push(p);
    continue;
  }
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
const K = G.Gyms.listFor(null);
const gymIdx = (name) => K.findIndex((g) => g.leader === name);
function infoOf(name, level) {
  const idx = gymIdx(name),
    e = K[idx];
  return { idx, id: e.id, leader: e.leader, badge: e.badge, arena: e.arena, boost: e.boost || null, dex: e.signatures[0].line[0].dex, level, openedAt: 0 };
}
/** A fresh run state and a fixed seed, then the named gym's gate at loop `loop`, entered. You stand `dist` px south of the arena. */
function open(name, loop, dist = 5000, level = 12) {
  seed = 4242;
  G.GymArena.reset();
  G.Gym.reset();
  G.EnemyMgr.clear();
  G.MoveSim.clear();
  G.MoveSim.setRng(Math.random);
  G.Gym.debugLoop(loop);
  G.Game.st.time = 0;
  says = [];
  kicks = 0;
  sounds = [];
  for (const m of you) m.dead = false;
  youActive = 0;
  Object.assign(human, { kills: 0, bosses: 0, dead: false, hp: 1e6, hurts: [] });
  ok(G.GymArena.openGate(infoOf(name, level)), name + ' loop ' + loop + ': the gate opens');
  G.GymArena.enterRequest();
  const a = G.GymArena.arena;
  human.x = a.x;
  human.y = a.y + dist;
  return a;
}
let frameNo = 0;
function frame() {
  frameNo++;
  G.Game.st.time += DT;
  G.EnemyMgr.update(DT, human);
  G.GymArena.update(DT, human);
}
const run = (secs) => {
  for (let i = 0; i < Math.round(secs / DT); i++) frame();
};
const faint = (e) => e.hurt(e.hp + 1, null, true);

// ---------------- 1. parity: the fight runs as before the slice ----------------
// You walk a slow circle (radius 120 px, 8 s a lap) round a point 160 px south of the arena center, close enough that she chases,
// circles, switches slots and casts. Slot 1 is fainted at 12 s so the faint send-in is in the trace. Every 6th frame: who is on the
// field, where (2 decimals) and the active move slot; every cast: the frame, the move and which member cast it.
function trace(name) {
  const a = open(name, 2, 160),
    t = a.team,
    cx = human.x,
    cy = human.y,
    casts = [],
    ticks = [];
  const off = G.SimBus.on('move:cast', (ev) => {
    const i = t.members.findIndex((m) => m.id === ev.ownerId);
    if (i >= 0) casts.push([frameNo, ev.moveId, i]);
  });
  frameNo = 0;
  for (let f = 0; f < 24 * 60; f++) {
    const ang = (f * DT * 2 * Math.PI) / 8;
    human.x = cx + Math.cos(ang) * 120;
    human.y = cy + Math.sin(ang) * 120;
    if (f === 12 * 60 && !t.active.dead) faint(t.active);
    frame();
    if (frameNo % 6 === 0) {
      const e = t.active;
      ticks.push([frameNo, t.activeIdx, +e.x.toFixed(2), +e.y.toFixed(2), e.active]);
    }
  }
  off();
  return { casts, ticks };
}
if (RECORD) {
  const out = { recorded: new Date().toISOString().slice(0, 10), Misty: trace('Misty'), Brock: trace('Brock') };
  fs.writeFileSync(TRACE, JSON.stringify(out));
  console.log('leader-ai-harness: trace recorded to ' + path.relative(R, TRACE) + ' (Misty ' + out.Misty.casts.length + ' casts, Brock ' + out.Brock.casts.length + ')');
  process.exit(0);
}
{
  const want = fs.existsSync(TRACE) ? JSON.parse(fs.readFileSync(TRACE, 'utf8')) : null;
  ok(want, 'parity: the trace exists (record it on the code before the slice: LA_RECORD=1)');
  if (want)
    for (const name of ['Misty', 'Brock']) {
      const got = trace(name),
        w = want[name];
      ok(w.casts.length > 10 && w.ticks.some((k) => k[4] > 0), name + ': the recorded fight casts and switches slots (a trace worth comparing)');
      const ti = got.ticks.findIndex((k, i) => JSON.stringify(k) !== JSON.stringify(w.ticks[i]));
      ok(ti < 0 && got.ticks.length === w.ticks.length, name + ': every tick matches the recorded fight' + (ti >= 0 ? ', first drift at ' + JSON.stringify(got.ticks[ti]) + ' vs ' + JSON.stringify(w.ticks[ti]) : ''));
      const ci = got.casts.findIndex((c, i) => JSON.stringify(c) !== JSON.stringify(w.casts[i]));
      ok(ci < 0 && got.casts.length === w.casts.length, name + ': every cast matches the recorded fight' + (ci >= 0 ? ', first drift at ' + JSON.stringify(got.casts[ci]) + ' vs ' + JSON.stringify(w.casts[ci]) : ''));
    }
}

const built = !missing.length && G.LeaderAI && G.LeaderInfo;
ok(built, 'the slice is built: ' + (missing.length ? missing.join(', ') + ' missing' : 'G.LeaderAI and G.LeaderInfo defined'));
if (built) {
  // ---------------- 2. controls: one AI player per team answers all seven calls ----------------
  {
    const a = open('Misty', 2, 160),
      t = a.team,
      ai = G.GymArena.leaderAI,
      c = ai && ai.controller,
      CALLS = ['axis', 'dodge', 'shake', 'swapSlot', 'swapDir', 'slots', 'cycles'];
    ok(ai && c && CALLS.every((k) => typeof c[k] === 'function'), 'the arena has one AI player whose controller answers the seven calls');
    ok(t.members.every((m) => m.controller === c), 'every member of the team uses that one controller (a swap needs no rewiring)');
    ok(c !== G.PlayerEntity.IDLE, 'and it is not the idle controller');
    // slot changes: every setActive on a member must follow a slots() answer naming that slot in the same frame
    const answers = new Map(),
      sets = [];
    const slots0 = c.slots;
    c.slots = function () {
      const r = slots0.apply(this, arguments);
      if (r.length) answers.set(frameNo, (answers.get(frameNo) || []).concat(r));
      return r;
    };
    for (const m of t.members) {
      const s0 = m.setActive;
      m.setActive = function (i, free) {
        if (!free) sets.push([frameNo, i]);
        return s0.call(this, i, free);
      };
    }
    let other = 0;
    for (let f = 0; f < 10 * 60; f++) {
      frame();
      if (c.dodge() || c.shake() || c.cycles().length || c.swapSlot() >= 0 || c.swapDir()) other++;
    }
    ok(sets.length > 0, 'in 10 s of fighting she changes slot at least once: ' + sets.length);
    ok(sets.every(([f, i]) => (answers.get(f) || []).includes(i)), 'every slot change came through slots() in the same frame');
    ok(other === 0, 'with no request, dodge, shake, cycles and the swap calls answer nothing (slice 1)');
    // GymBrain's choice no longer switches by itself: it returns the slot
    const e = t.active;
    let direct = 0;
    const s1 = e.setActive;
    e.setActive = () => direct++;
    e.swapT = 0;
    const pick = e.brain.pickSlot(human, G.Gym.now());
    e.setActive = s1;
    ok(direct === 0 && typeof pick === 'number', 'GymBrain.pickSlot returns its choice (' + pick + ') and never calls setActive');
  }

  // ---------------- 3. a forced swap request runs your rules ----------------
  {
    const a = open('Misty', 2),
      t = a.team,
      [s1, s2] = t.members,
      ai = G.GymArena.leaderAI;
    run(1);
    // refused: the 5 s lock; a refused request is a no-op, it does not wait for the lock to end
    t.lock = 2;
    ai.requestSwap(1);
    run(2 / 60);
    ok(t.active === s1, 'locked: the request is refused');
    run(2.1);
    ok(t.active === s1, 'and dropped: it does not fire when the lock ends');
    // refused: trapped (COMBAT-RULES trap: a swap lock)
    s1.stTrap = 3;
    ai.requestSwap(1);
    run(2 / 60);
    ok(t.active === s1, 'trapped: the request is refused');
    s1.stTrap = 0;
    // refused: in the air (Fly)
    s1.flyT = 1;
    ai.requestSwap(1);
    frame();
    ok(t.active === s1, 'in the air: the request is refused');
    s1.flyT = 0;
    run(2 / 60);
    // accepted
    const x0 = s1.x,
      y0 = s1.y;
    kicks = 0;
    sounds = [];
    says = [];
    ai.requestSwap(1);
    frame();
    ok(t.active === s2, 'unlocked: the request swaps to slot 2');
    ok(t.lock > 4.9 && t.lock <= 5, 'and starts the 5 s swap lock: ' + t.lock);
    ok(s2.invuln > 0.45 && s2.invuln <= 0.5, 'with the 0.5 s send-in i-frames: ' + s2.invuln);
    ok(Math.hypot(s2.x - x0, s2.y - y0) < 10, 'the incoming mon takes the outgoing spot');
    ok(G.EnemyMgr.get(s2.id) && !G.EnemyMgr.get(s1.id) && a.bossId === s2.id, 'the enemy list and the arena follow the incoming mon; the outgoing one leaves the list');
    ok(t.active !== s1 && !s1.dead, 'the outgoing mon is on the bench, standing (benched is set only during its bench tick)');
    ok(says.includes('Misty switches to ' + s2.name + '!'), 'the line: ' + says.join(' | '));
    ok(kicks === 0 && !sounds.includes('boss'), 'no camera kick and no boss sound (spec LINES)');
    // the bench ticks: a burn on the benched mon spends its turns (its HP may not show it: Misty's benched-only HP Regen card heals it)
    s1.applyBurn(1);
    const turns = s1.stDot && s1.stDot.left;
    run(2.5); // one burn turn is 2 s
    ok(turns && s1.stDot && s1.stDot.left < turns, 'the benched mon ticks its burn: ' + turns + ' turns, then ' + (s1.stDot && s1.stDot.left));
    // back after the lock
    run(3.1);
    ai.requestSwap(0);
    frame();
    ok(t.active === s1 && G.EnemyMgr.get(s1.id) && !G.EnemyMgr.get(s2.id), 'after the lock, a second request swaps back');
    // a faint after a voluntary swap still sends in after the beat (past the send-in i-frames, which block the faint hit)
    run(0.6);
    faint(s1);
    run(1.4);
    ok(t.active === s2 && G.EnemyMgr.get(s2.id) && a.bossId === s2.id, 'a faint after voluntary swaps still sends in the other mon');
  }

  // ---------------- 4. the information model ----------------
  {
    const cast = (m, moveId) => G.SimBus.emit('move:cast', { moveId, ownerId: null, ownerUid: m.copyUid, ownerSlot: m.teamSlot, rival: false, x: 0, y: 0, aim: 0, enemy: false });
    const switched = (m) => G.SimBus.emit('slot:switch', { ownerUid: m.copyUid, ownerSlot: m.teamSlot, rival: false, slot: 1 });
    const a = open('Misty', 2),
      t = a.team,
      info = G.GymArena.leaderInfo,
      [y1, y2] = you;
    ok(info, 'the arena has an information layer');
    // keys: the copy uid, else the team slot
    ok(info.keyOf(y1) === 'uid-bulba' && info.keyOf(y2) === 'slot:1', 'keys: copy uid, else the team slot: ' + info.keyOf(y1) + ', ' + info.keyOf(y2));
    // rosters: both sides, species and state, from the fight's start
    let r = info.rosters();
    const st = (side) => side.map((m) => m.dex + ':' + m.state).join(',');
    ok(st(r.you) === '1:active,4:bench', 'your roster from the start: ' + st(r.you));
    ok(st(r.leader) === t.members[0].dex + ':active,' + t.members[1].dex + ':bench', 'her roster from the start: ' + st(r.leader));
    y2.dead = true;
    ok(st(info.rosters().you) === '1:active,4:fainted', 'a faint of yours shows: ' + st(info.rosters().you));
    y2.dead = false;
    run(1);
    G.GymArena.leaderAI.requestSwap(1);
    frame();
    ok(st(info.rosters().leader) === t.members[0].dex + ':bench,' + t.members[1].dex + ':active', 'her swap shows: ' + st(info.rosters().leader));
    // move reveals: nothing before a cast, the move after it
    ok(info.reveals(y1).moves.length === 0 && info.reveals(y1).bonds.length === 0, 'nothing is revealed before you cast');
    cast(y1, 'vine-whip');
    ok(info.reveals(y1).moves.join() === 'vine-whip', 'a cast reveals the move: ' + info.reveals(y1).moves.join());
    ok(info.reveals(y2).moves.length === 0, 'only for the mon that cast it');
    G.SimBus.emit('move:cast', { moveId: 'water-gun', ownerId: t.active.id, ownerUid: null, ownerSlot: t.active.teamSlot, rival: true, x: 0, y: 0, aim: 0, enemy: true });
    ok(info.reveals(you.find((m) => m.teamSlot === t.active.teamSlot)).moves.every((id) => id !== 'water-gun'), "her own casts reveal nothing about your mons");
    // bonds: two different moves with no slot switch seen between them, at any gap; a switch between breaks it
    cast(y1, 'vine-whip');
    run(10);
    cast(y1, 'razor-leaf');
    const bonds = () => info.reveals(y1).bonds.map((b) => b.slice().sort().join('+'));
    ok(bonds().join() === 'razor-leaf+vine-whip', 'two moves cast 10 s apart with no switch between are a bond (no window): ' + bonds().join());
    cast(y1, 'tackle');
    switched(y1);
    cast(y1, 'growl');
    ok(!bonds().some((b) => b.includes('growl')), 'a switch between two casts 0 s apart is not a bond: ' + bonds().join());
    cast(y1, 'growl');
    ok(!bonds().includes('growl+growl'), 'the same move twice is not a bond');
    cast(y2, 'ember');
    ok(info.reveals(y2).bonds.length === 0 && !bonds().some((b) => b.includes('ember')), 'casts of two different mons are never a bond');
    ok(info.reveals(y1).moves.slice().sort().join() === 'growl,razor-leaf,tackle,vine-whip', 'every cast move is revealed: ' + info.reveals(y1).moves.join());
    // the real notice: a slot switch emits slot:switch, a real cast carries the owner's uid and slot (plain data)
    const tape = G.SimBus.record();
    const m = t.active;
    m.swapT = 0;
    m.setActive(m.active === 0 ? 1 : 0);
    run(3);
    G.SimBus.stopRecording();
    const sw = tape.find((ev) => ev.type === 'slot:switch'),
      mc = tape.find((ev) => ev.type === 'move:cast' && ev.rival);
    ok(sw && sw.rival === true && sw.ownerSlot === m.teamSlot && 'ownerUid' in sw, 'setActive emits slot:switch with the owner slot and uid');
    ok(mc && 'ownerUid' in mc && mc.ownerSlot != null, 'move:cast carries the owner uid and slot');
    // a new fight starts empty, and the old fight's layer no longer listens
    const old = info;
    open('Misty', 2);
    const fresh = G.GymArena.leaderInfo;
    cast(y1, 'sleep-powder');
    ok(fresh !== old && fresh.reveals(y1).moves.join() === 'sleep-powder', 'a new fight starts with nothing revealed');
    ok(!old.reveals(y1).moves.includes('sleep-powder'), 'and the old fight\'s layer hears nothing more');
  }
}

console.log(fail ? 'leader-ai-harness: ' + fail + ' of ' + n + ' FAILED' : 'leader-ai-harness: all ' + n + ' passed');
process.exit(fail ? 1 : 0);
