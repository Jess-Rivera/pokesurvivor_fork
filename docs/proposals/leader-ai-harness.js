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
// leader-ai-mutate.js points one of these at a broken copy
const OVERRIDE = { 'js/entities/leader-ai.js': 'LA_AI', 'js/systems/leader-info.js': 'LA_INFO', 'js/systems/gym-arena.js': 'LA_ARENA', 'js/entities/gym-leader.js': 'LA_LEADER' };
const missing = [];
for (const p of FILES) {
  const alt = OVERRIDE[p] && process.env[OVERRIDE[p]];
  if (NEW.includes(p) && !alt && !fs.existsSync(path.join(R, p))) {
    missing.push(p);
    continue;
  }
  try {
    if (alt) vm.runInThisContext(fs.readFileSync(alt, 'utf8'), { filename: p });
    else load(p);
  } catch (e) {
    console.log('load failed', p, e.message);
    process.exit(1);
  }
}
// Sections 1 to 4 are slice 1's: its own swap and dodge decisions (slice 2) stay off there, so the parity trace and the forced
// swap checks see the behavior-neutral wrapper. Sections 5 on turn them on.
if ('LeaderAI' in base && G.LeaderAI.off) Object.assign(G.LeaderAI.off, { swaps: true, dodges: true });

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

// ======================= slice 2 (#31): swap and dodge decisions =======================
// Expected values are hand-derived from LEADER-AI ("The decision loop", "Fairness", "SWAP AND SLOT CHOICES", MATCHUP, DODGE
// DIRECTION, DODGE READ BAG, THREAT TIMING) and COMBAT-RULES "LEADER VOLUNTARY SWAPS", and the agreed baselines in issue #31.
const built2 = built && G.LeaderAI.BASE && G.LeaderAI.Bag && G.LeaderInfo.current !== undefined;
ok(built2, 'slice 2 is built: G.LeaderAI.BASE and G.LeaderAI.Bag defined');
if (built2) {
  const AI = G.LeaderAI;
  const set = (swaps, dodges) => Object.assign(AI.off, { swaps: !swaps, dodges: !dodges });
  AI.seed = 7;
  const reveal = (m, id) => G.SimBus.emit('move:cast', { moveId: id, ownerId: null, ownerUid: m.copyUid, ownerSlot: m.teamSlot, rival: false, x: 0, y: 0, aim: 0, enemy: false });
  const [bulba, charm] = you;
  const at = (a) => ({ a, t: a.team, ai: G.GymArena.leaderAI, s1: a.team.members[0], s2: a.team.members[1] });
  /** open() puts your slot 1 on the field; `act` is the mon of yours on the field for this fight. */
  const go = (name, loop, act = 0, dist) => {
    const a = open(name, loop, dist);
    youActive = act;
    return at(a);
  };
  /** Runs up to `secs`, returning the fight second (frames x DT) of the first frame `cond` holds after it, or null. */
  const until = (secs, cond) => {
    for (let i = 1; i <= Math.round(secs / DT); i++) {
      frame();
      if (cond()) return i * DT;
    }
    return null;
  };

  // ---------------- 5. the settings: the baselines, authored ones keyed by loop, the validator ----------------
  {
    const { ai } = at(open('Misty', 2));
    const want = { think: 0.25, reflex: 0.15, threatWindow: 0.6, dodgeRead: 6, dodgeReserve: 0, minField: 8, swapLimit: null, margin: 1.1, ccLeft: 1.5, lowHp: 0.25, lowTo: 0.5, matchupX: 2, matchupHp: 0.4, randomness: 0 };
    const off = Object.keys(want).filter((k) => ai.set[k] !== want[k]);
    ok(!off.length, 'Misty authors no ai, so every setting is the agreed baseline' + (off.length ? ': ' + off.map((k) => k + '=' + ai.set[k]).join(', ') : ''));
    const s2 = AI.settings({ loop: 2, ai: { minField: { 1: 5, 3: 9 }, swapLimit: 2 } }),
      s3 = AI.settings({ loop: 3, ai: { minField: { 1: 5, 3: 9 } } });
    ok(s2.minField === 5 && s3.minField === 9 && s2.swapLimit === 2 && s2.reflex === 0.15, 'an authored setting keyed by loop takes the last earlier loop; one not authored keeps the baseline');
    const misty = K[gymIdx('Misty')],
      errs = (ai) => G.Gyms.validate(Object.assign({}, misty, { ai }));
    ok(errs({ minField: 6, dodgeRead: { 1: 4, 2: 7 } }).length === errs(undefined).length, 'the validator takes numbers and loop-keyed numbers');
    ok(errs({ bogus: 1 }).some((s) => /unknown ai setting bogus/.test(s)), 'and names an unknown setting');
    ok(errs({ minField: -1 }).some((s) => /ai minField/.test(s)) && errs({ reflex: { 0: 1 } }).some((s) => /ai reflex/.test(s)), 'and refuses a negative value or a bad loop key');
  }

  // ---------------- 6. the matchup and its rows (LEADER-AI MATCHUP worked examples) ----------------
  {
    set(true, false);
    youActive = 0;
    let { t, ai, s1, s2 } = at(open('Misty', 2));
    ok(s1.dex === 120 && s2.dex === 86, 'Misty loop 2 fields Staryu then Seel (the worked example): ' + s1.dex + ', ' + s2.dex);
    reveal(bulba, 'vine-whip');
    // Staryu: Tackle 1 (Water Gun 0.5 x 1.5 = 0.75) / Vine Whip on Water 2 = 0.5; Seel: Powder Snow on Grass/Poison 2 / 2 = 1.0
    ok(near(ai.matchup(s1), 0.5) && near(ai.matchup(s2), 1), 'you Bulbasaur with Vine Whip: Staryu 0.5, Seel 1.0: ' + ai.matchup(s1) + ', ' + ai.matchup(s2));
    says = [];
    const swapAt = until(10, () => t.active === s2);
    ok(swapAt != null && swapAt >= 8 - 1e-9, 'Seel comes in, and not before minField 8 s: ' + swapAt);
    ok(swapAt != null && swapAt <= 8.25 + DT + 1e-9, 'on the first think tick after 8 s: ' + swapAt);
    ok(says.includes('Misty switches to Seel!'), 'with the swap line: ' + says.join(' | '));
    ok(ai.log.some((d) => d.act === 'swap' && d.why === 'matchup'), 'and the log names the matchup reason');
    // you Charmander with Ember: Staryu 3 / 0.5 = 6, Seel 3 / 0.5 = 6, no swap
    ({ t, ai, s1, s2 } = go('Misty', 2, 1));
    reveal(charm, 'ember');
    ok(near(ai.matchup(s1), 6) && near(ai.matchup(s2), 6), 'you Charmander with Ember: both 6: ' + ai.matchup(s1) + ', ' + ai.matchup(s2));
    ok(until(12, () => t.active !== s1) == null, 'so no swap in 12 s');
    // the guess before any reveal: Pikachu is guessed Electric; a two-type mon, the type that hits harder
    you.push({ dex: 25, copyUid: 'uid-pika', teamSlot: 2, dead: false });
    ({ ai, s1 } = go('Misty', 2, 2));
    let g = ai.yourAttack(s1);
    ok(g.type === 'electric' && g.id == null, 'Pikachu with nothing revealed is guessed Electric: ' + JSON.stringify(g));
    you.pop();
    youActive = 0;
    ({ ai, s1 } = at(open('Misty', 2)));
    ok(ai.yourAttack(s1).type === 'grass', 'Bulbasaur unrevealed vs Staryu: Grass (x2) over Poison (x1): ' + ai.yourAttack(s1).type);
    reveal(bulba, 'growl');
    ok(ai.yourAttack(s1).type === 'grass', 'a status move does not replace the guess');
    reveal(bulba, 'tackle');
    g = ai.yourAttack(s1);
    ok(g.type === 'normal' && g.id === 'tackle', 'a revealed damaging move replaces the guess, even a weaker one: ' + g.id);
    reveal(bulba, 'body-slam');
    ok(ai.yourAttack(s1).id === 'body-slam', 'an even multiplier goes to the higher power: ' + ai.yourAttack(s1).id);
    you.push({ dex: 34, copyUid: 'uid-nido', teamSlot: 2, dead: false });
    ({ ai, s1 } = go('Brock', 1, 2));
    // Nidoking Poison/Ground on Geodude Rock/Ground: Poison 0.5 x 0.5 = 0.25, Ground 2 x 1 = 2
    ok(ai.yourAttack(s1).type === 'ground', 'Nidoking unrevealed vs Geodude: Ground (x2) over Poison (x0.25): ' + ai.yourAttack(s1).type);
    you.pop();
    youActive = 0;
  }

  // ---------------- 7. the stall guards ----------------
  {
    set(true, false);
    youActive = 0;
    // a voluntary swap starts the clock: swapped out at 1 s and back at 6.5 s, Staryu waits 8 s more before the matchup sends Seel
    let { t, ai, s1, s2 } = at(open('Misty', 2));
    reveal(bulba, 'vine-whip');
    run(1);
    ai.requestSwap(1);
    frame();
    ok(t.active === s2 && ai.swaps === 1 && ai.fieldT < 1e-9, 'a requested swap counts and restarts the field clock');
    run(5.5 - DT);
    ai.requestSwap(0);
    frame();
    ok(t.active === s1, 'back to Staryu at 6.5 s');
    let again = until(9, () => t.active === s2);
    ok(again != null && again >= 8 - 1e-9 && again <= 8.25 + DT + 1e-9, 'the matchup swap waits 8 s from that swap: ' + again);
    // a faint send-in starts it too (Misty loop 3: Staryu, Seel, Psyduck); its own swaps off, the clock still runs
    set(false, false);
    ({ t, ai, s1, s2 } = at(open('Misty', 3)));
    run(9);
    faint(t.active);
    const sent = until(2, () => t.active !== s1 && !t.active.dead);
    ok(sent != null && ai.fieldT < 2 * DT && ai.swapGate() === 'minField', 'a faint send-in restarts the clock: ' + ai.fieldT);
    run(7.8);
    ok(ai.swapGate() === 'minField', 'still held 7.8 s later');
    run(0.3);
    ok(ai.swapGate() === null, 'open after 8 s');
    // and Re-Do
    ({ t, ai, s1, s2 } = at(open('Misty', 2)));
    t.runItems.push('redo');
    run(1);
    faint(s1);
    until(2, () => t.active === s2);
    run(1);
    faint(s2);
    const back = until(3, () => !t.active.dead);
    ok(back != null && t.redoUsed && ai.fieldT < 2 * DT && ai.swapGate() === 'minField', 'Re-Do restarts the clock');
    // swapLimit 0: never; 1: one and done; absent: no cap
    set(true, false);
    ({ t, ai, s1, s2 } = at(open('Misty', 2)));
    reveal(bulba, 'vine-whip');
    ai.set.swapLimit = 0;
    ok(until(12, () => t.active !== s1) == null && ai.swapGate() === 'swapLimit', 'swapLimit 0: no voluntary swap');
    const sleepSeel = (lim) => {
      const r = at(open('Misty', 2));
      reveal(bulba, 'vine-whip');
      r.ai.set.swapLimit = lim;
      until(9, () => r.t.active === r.s2);
      run(16.5 - 9);
      r.s2.stMajor = { k: 'sleep', t: 3, age: 0 };
      return { r, back: until(1, () => r.t.active === r.s1) };
    };
    let z = sleepSeel(1);
    ok(z.r.t.active === z.r.s2 && z.back == null && z.r.ai.swaps === 1, 'swapLimit 1: the matchup swap, then asleep Seel stays');
    z = sleepSeel(null);
    ok(z.back != null && z.r.ai.swaps === 2, 'no swapLimit: asleep Seel swaps out too: ' + z.back);
  }

  // ---------------- 7b. a tick inside a tell's wind-up or a commitment waits for the first frame out of it; the recovery is free ----------------
  {
    set(true, false);
    const hold = (make, clear, secs) => {
      const r = go('Misty', 2, 0);
      reveal(bulba, 'vine-whip');
      run(7.5);
      make(r.s1);
      const during = until(secs, () => r.t.active === r.s2);
      clear(r.s1);
      const after = during == null ? until(0.5, () => r.t.active === r.s2) : null;
      return { during, after };
    };
    let h = hold(
      (e) => (e.mvRoot = true),
      (e) => (e.mvRoot = false),
      2.5
    );
    ok(h.during == null && h.after != null && h.after <= DT + 1e-9, 'a commitment (a dash root) holds the swap; it fires on the first free frame: ' + h.after);
    // a wind-up that never fires (wind 99) stands in for a long tell
    h = hold(
      (e) => (e.brain.tell = { fired: false, t: 0, wind: 99, after: 0 }),
      (e) => (e.brain.tell = null),
      2.5
    );
    ok(h.during == null && h.after != null && h.after <= DT + 1e-9, 'a tell\'s wind-up holds it the same: ' + h.after);
    // the recovery after the move fired is not the tell: the swap comes on its tick
    h = hold(
      (e) => (e.brain.tell = { fired: true, t: 0, wind: 0, after: 2.4 }),
      () => {},
      2.3
    );
    ok(h.during != null && h.during <= 0.75 + 0.25 + DT, 'the recovery after it fires does not hold it: ' + h.during);
  }

  // ---------------- 8. the triggers at their edges, and STAY ----------------
  {
    set(true, false);
    let { t, ai, s1, s2 } = go('Misty', 2, 1);
    reveal(charm, 'ember'); // both matchups 6: no matchup trigger, so each case shows only its own
    run(1);
    const whys = () => ai.triggers(t.active).map((c) => c.why + ':' + t.members[c.j].dex);
    ok(whys().length === 0, 'at full HP, awake, even matchups: no trigger');
    s1.stMajor = { k: 'sleep', t: 1.51, age: 0 };
    ok(whys().join() === 'cc:86', 'asleep with 1.51 s left: to the healthiest bench mon: ' + whys().join());
    s1.stMajor.t = 1.49;
    ok(whys().length === 0, 'with 1.49 s left: none');
    s1.stMajor = { k: 'freeze', t: 1.51, age: 0 };
    ok(whys().join() === 'cc:86', 'frozen counts the same');
    s1.stMajor = null;
    s1.hp = s1.maxHp * 0.249;
    ok(whys().join() === 'low:86', 'under 25% HP with no self heal: to the best matchup at 50%+: ' + whys().join());
    s1.hp = s1.maxHp * 0.251;
    ok(whys().length === 0, 'at 25.1%: none');
    s1.hp = s1.maxHp * 0.249;
    s2.hp = s2.maxHp * 0.49;
    ok(whys().length === 0, 'with the bench mon at 49%: none');
    s2.hp = s2.maxHp * 0.5;
    ok(whys().join() === 'low:86', 'at 50%: it goes');
    // once per mon: the low swap happens, then Staryu back on the field has used its save
    run(8);
    ok(t.active === s2 && ai.saved.has(s1), 'the low HP swap fires and uses Staryu\'s save');
    run(5.1);
    ai.requestSwap(0);
    frame();
    s1.hp = s1.maxHp * 0.2;
    ok(t.active === s1 && whys().length === 0, 'Staryu back under 25%: no second low HP swap: ' + whys().join());
    // a self heal left blocks the low trigger (Misty loop 1 Staryu has Recover below 35%)
    const lone = at(open('Misty', 1));
    lone.s1.hp = lone.s1.maxHp * 0.2;
    ok(lone.ai.healLeft(lone.s1), 'Staryu with Recover open and a heal left: healLeft');
    lone.s1.brain.healsLeft = 0;
    ok(!lone.ai.healLeft(lone.s1), 'with the heal cap spent: none left');
    // matchup: Seel is 2x Staryu exactly (1.0 / 0.5) for you Bulbasaur; it needs Seel at 40%+
    youActive = 0;
    ({ t, ai, s1, s2 } = at(open('Misty', 2)));
    reveal(bulba, 'vine-whip');
    run(1);
    ok(whys().join() === 'matchup:86', 'a bench matchup 2x the active one: ' + whys().join());
    s2.hp = s2.maxHp * 0.39;
    ok(whys().length === 0, 'with Seel at 39%: none');
    s2.hp = s2.maxHp * 0.4;
    ok(whys().join() === 'matchup:86', 'at 40%: it goes');
    // STAY: a trigger must beat stay x margin (the matchup scores its ratio, 2)
    ai.set.margin = 2.5;
    ok(until(9, () => t.active === s2) == null, 'with margin 2.5 the matchup (2) does not beat STAY');
    s1.stMajor = { k: 'sleep', t: 4, age: 0 };
    ok(until(0.5, () => t.active === s2) != null, 'but asleep (ccScore 3) does');
    youActive = 0;
  }

  // ---------------- 9. dodges ----------------
  // A shot of yours is a plain instance in the sim's list (the sim is not stepped here: the harness moves it), owned by you.
  let serial = 1e6;
  const shots = [];
  function shoot(e, { dx = -200, dy = -5, vx = 400, vy = 0, r = 40, wait = 0, family = 'point' } = {}) {
    const x = e.x + dx,
      y = e.y + dy,
      s = { id: -serial, cast: { owner: human, serial: ++serial, moveId: 'ember' }, spec: { id: 'ember', delivery: { motion: 'travels' } }, x, y, prevX: x, prevY: y, vx, vy, wait, armed: true, shape: { family, x, y, heading: 0, r } };
    G.MoveSim.list().push(s);
    shots.push(s);
    return s;
  }
  const fly = () => {
    for (const s of shots) {
      s.prevX = s.x;
      s.prevY = s.y;
      s.x += s.vx * DT;
      s.y += s.vy * DT;
      s.shape.x = s.x;
      s.shape.y = s.y;
    }
  };
  const drop = () => {
    const L = G.MoveSim.list();
    for (const s of shots.splice(0)) if (L.indexOf(s) >= 0) L.splice(L.indexOf(s), 1);
  };
  const step = () => {
    fly();
    frame();
  };
  /** One threat at `e`, then up to 1 s of frames: whether it was read and the frame (from the notice frame, 0) its dodge started. */
  function threat(ai, e, opts) {
    const s = shoot(e, opts);
    let read = null,
      dodge = null;
    for (let i = 0; i < 60; i++) {
      const was = e.dodgeT > 0;
      step();
      const n = ai.log.find((d) => d.act === 'threat' && d.serial === s.cast.serial);
      if (n && read == null) {
        read = n.read;
        i = 0;
      }
      if (read != null && dodge == null && !was && e.dodgeT > 0) dodge = { at: i, vx: e.dodgeVx, vy: e.dodgeVy };
    }
    drop();
    return { read, dodge, serial: s.cast.serial };
  }
  {
    set(false, true);
    let { ai, s1: e } = go('Misty', 2, 1);
    // the bag maps every dodge: 20 threats, 4 s apart (two charges, 7 s each, never run dry at that pace)
    const reads = [];
    let exact = 0,
      wrong = 0,
      dir = 0;
    for (let k = 0; k < 20; k++) {
      run(3);
      const r = threat(ai, e);
      reads.push(r.read);
      if (r.read && r.dodge && r.dodge.at === 9) exact++;
      if (r.read !== !!r.dodge) wrong++;
      if (r.dodge && r.dodge.vy > 0 && Math.abs(r.dodge.vx) < 1e-6) dir++;
    }
    const n1 = reads.slice(0, 10).filter(Boolean).length,
      n2 = reads.slice(10).filter(Boolean).length;
    ok(reads.every((r) => r != null), 'every shot whose path reaches her within 0.6 s is noticed');
    ok(n1 === 6 && n2 === 6, 'the bag reads exactly 6 of each 10: ' + n1 + ', ' + n2 + ' (' + reads.map((r) => (r ? 'D' : '.')).join('') + ')');
    ok(wrong === 0, 'she dodges every read threat and none she lets pass: ' + wrong + ' wrong');
    ok(exact === 12, 'each dodge starts exactly reflex 0.15 s (9 frames) after the notice: ' + exact + ' of 12');
    ok(dir === 12, 'sideways to the path, away from it on even floor (the shot passes north of her: she goes south): ' + dir);
    // the same seed replays the same reads
    ({ ai, s1: e } = go('Misty', 2, 1));
    const again = [];
    for (let k = 0; k < 10; k++) {
      run(3);
      again.push(threat(ai, e).read);
    }
    ok(again.join() === reads.slice(0, 10).join(), 'the same seed gives the same reads');
    // open floor wins over the side away from the path: a wall 20 px south of her
    let r;
    const collide0 = G.World.collide;
    for (let k = 0; k < 10 && !(r && r.read); k++) {
      run(3);
      const lim = e.y + 20;
      G.World.collide = (b) => {
        if (b.y > lim) b.y = lim;
        return false;
      };
      r = threat(ai, e);
      G.World.collide = collide0;
    }
    ok(r && r.dodge && r.dodge.vy < 0, 'with a wall to the south, the dodge goes north, to the open floor');
    // a still shape (a strike waiting 0.3 s to land on her): straight away from its centre
    r = null;
    for (let k = 0; k < 10 && !(r && r.read); k++) {
      run(3);
      r = threat(ai, e, { dx: 0, dy: 10, vx: 0, vy: 0, wait: 0.3, family: 'circle' });
    }
    // its centre is 10 px south of her (the way she walks, to you), so away from it is north
    ok(r && r.dodge && r.dodge.vy < 0 && Math.abs(r.dodge.vx) < 1e-6, 'a still shape: straight away from its centre');
    // a shot that misses (passes 120 px north) is no threat
    run(3);
    const before = ai.log.length;
    shoot(e, { dy: -120 });
    run(1);
    drop();
    ok(!ai.log.slice(before).some((d) => d.act === 'threat'), 'a shot that misses her is not a threat');
    // zero charges: a read threat, no dodge
    const readOne = (prep) => {
      let q;
      for (let k = 0; k < 10 && !(q && q.read); k++) {
        run(3);
        prep();
        q = threat(ai, e);
      }
      return q;
    };
    r = readOne(() => (e.dodges.cd = [5, 5]));
    ok(r.read && !r.dodge && ai.log.some((d) => d.act === 'dodge' && /no charge/.test(d.text)), 'zero charges: no dodge');
    // dodgeReserve 1: one charge ready is kept back; two, one is spent
    ai.set.dodgeReserve = 1;
    r = readOne(() => (e.dodges.cd = [0, 6]));
    ok(r.read && !r.dodge, 'dodgeReserve 1 with one charge ready: kept back');
    r = readOne(() => (e.dodges.cd = [0, 0]));
    ok(r.read && r.dodge && e.dodges.cd.filter((c) => c <= 0).length === 1, 'with two ready: one spent, one kept');
    ai.set.dodgeReserve = 0;
    // a commitment holds a read dodge; it fires on the first free frame while the threat lasts
    r = null;
    for (let k = 0; k < 10 && !(r && r.read); k++) {
      run(3);
      e.dodges.cd = [0, 0];
      const s = shoot(e, { dx: -60, dy: -5, vx: 60 });
      e.mvRoot = true;
      let note = null,
        dodged = null;
      for (let i = 0; i < 50; i++) {
        if (i === 30) e.mvRoot = false;
        const was = e.dodgeT > 0;
        step();
        if (note == null) {
          const n = ai.log.find((d) => d.act === 'threat' && d.serial === s.cast.serial);
          if (n) note = { i, read: n.read };
        }
        if (!was && e.dodgeT > 0 && dodged == null) dodged = i;
      }
      e.mvRoot = false;
      drop();
      r = note && { read: note.read, dodged };
    }
    ok(r && r.read && r.dodged === 30, 'a commitment holds the dodge; it fires on the first free frame: ' + (r && r.dodged));
    // loop 1 (a lone mon) dodges too
    ({ ai, s1: e } = at(open('Brock', 1)));
    r = readOne(() => (e.dodges.cd = [0, 0]));
    ok(r.read && r.dodge, 'Brock loop 1, one mon: a read threat is dodged');
    // the bag on its own: exact per block for any seed; seeds differ; 0 and 10
    let exactBlocks = true;
    const orders = new Set();
    for (let sd = 1; sd <= 20; sd++) {
      const b = new AI.Bag(6, sd),
        seq = [];
      for (let i = 0; i < 30; i++) seq.push(b.next());
      for (let k = 0; k < 3; k++) if (seq.slice(k * 10, k * 10 + 10).filter(Boolean).length !== 6) exactBlocks = false;
      orders.add(seq.slice(0, 10).join());
    }
    ok(exactBlocks, 'the bag: exactly 6 in every block of 10, for 20 seeds and 3 blocks each');
    ok(orders.size > 5, 'and the order differs between seeds: ' + orders.size + ' orders in 20');
    const b0 = new AI.Bag(0, 1),
      b10 = new AI.Bag(10, 1);
    let z0 = 0,
      z10 = 0;
    for (let i = 0; i < 20; i++) {
      z0 += b0.next() ? 1 : 0;
      z10 += b10.next() ? 1 : 0;
    }
    ok(z0 === 0 && z10 === 20, 'dodgeRead 0 never reads, 10 always does');
  }

  // ---------------- 9b. the limits over a real fight: no decision inside a tell or commitment, never sooner than reflex ----------------
  {
    set(true, true);
    youActive = 0;
    const { t, ai } = at(open('Misty', 2, 160));
    reveal(bulba, 'vine-whip');
    let inside = 0,
      dodges = 0,
      swaps = 0,
      early = 0;
    const notes = [];
    const note0 = ai.note.bind(ai);
    ai.note = (act, text, extra) => {
      notes.push(Object.assign({ t: ai.clock, act }, extra));
      note0(act, text, extra);
    };
    const c = ai.controller,
      dodge0 = c.dodge;
    c.dodge = () => {
      const d = dodge0();
      if (d) {
        dodges++;
        if (ai.busy(t.active)) inside++;
      }
      return d;
    };
    const req0 = ai.requestSwap.bind(ai);
    ai.requestSwap = (j) => {
      swaps++;
      if (!G.Status.stunned(t.active) && ai.busy(t.active)) inside++;
      req0(j);
    };
    for (let k = 0; k < 24; k++) {
      t.active.dodges.cd = [0, 0];
      shoot(t.active, { dx: -150, vx: 300 });
      for (let i = 0; i < 60; i++) step();
      drop();
    }
    for (const d of notes.filter((d) => d.act === 'dodge' && d.serial != null)) {
      const n = notes.find((x) => x.act === 'threat' && x.serial === d.serial);
      if (!n || d.t - n.t < 0.15 - 1e-6) early++;
    }
    ok(dodges > 0 && swaps > 0, 'a close 24 s fight has her own dodges and swaps to check: ' + dodges + ' dodges, ' + swaps + ' swaps');
    ok(inside === 0, 'none of them inside a tell or a commitment: ' + inside);
    ok(early === 0, 'no dodge sooner than reflex after its threat was noticed: ' + early);
  }

  // ---------------- 10. the swap consequences (COMBAT-RULES "LEADER VOLUNTARY SWAPS") ----------------
  {
    set(false, false);
    const { a, t, ai, s1, s2 } = at(open('Misty', 2, 160));
    run(3);
    const mine = () => G.MoveSim.list().filter((i) => i.cast.owner === s1).length;
    ok(mine() > 0, 'after 3 s of fighting, Staryu has shapes out: ' + mine());
    s1.hurt(10, null, true);
    const eng = s1.gym.engagedAt;
    s1.hp = Math.round(s1.maxHp * 0.6);
    s1.applyStatus('paralysis');
    const hp = s1.hp,
      kills = human.kills;
    run(0.3);
    ai.requestSwap(1);
    frame();
    ok(t.active === s2, 'the swap happens');
    ok(mine() === 0, 'the outgoing mon\'s shapes end');
    ok(human.kills === kills, 'no kill is paid for leaving');
    ok(s1.hp === hp && s1.stMajor && s1.stMajor.k === 'paralysis', 'it keeps its HP and status on the bench: ' + s1.hp + ' of ' + hp);
    ok(eng != null && s1.gym.engagedAt === eng && s2.gym.engagedAt == null, 'each mon keeps its own enrage clock');
    // a bench faint: paid once, silently, with no gym drop, and the fight goes on
    let drops = 0;
    const roll0 = G.Drops.roll;
    G.Drops.roll = () => drops++;
    s1.stMajor = null;
    s1.hp = 1;
    s1.applyBurn(1);
    says = [];
    sounds = [];
    const bosses = human.bosses;
    run(3);
    ok(s1.dead, 'the burned bench mon faints on the bench');
    ok(human.kills === kills + 1 && human.bosses === bosses, 'paid as one kill, not the boss kill: ' + (human.kills - kills));
    run(2);
    ok(human.kills === kills + 1, 'once');
    ok(drops === 0 && !sounds.includes('faint') && !sounds.includes('bossDown') && !says.length, 'silently, with no gym drop: ' + sounds.join(',') + ' | ' + says.join(','));
    ok(a.phase === 'fight' && t.active === s2 && !s2.dead, 'and the fight goes on');
    G.Drops.roll = roll0;
  }
  set(true, true);
}

console.log(fail ? 'leader-ai-harness: ' + fail + ' of ' + n + ' FAILED' : 'leader-ai-harness: all ' + n + ' passed');
process.exit(fail ? 1 : 0);
