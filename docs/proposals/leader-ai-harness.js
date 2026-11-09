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
  sounds = [],
  bannerUp = false; // slice 3: whether another banner is showing (a leader's line waits for it)
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
  Spawner: { xpBoost: () => 1, say: (t) => says.push(t), banner: () => (bannerUp ? { text: '', t: 1 } : null) },
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
const FILES = ['js/core/stats.js', 'js/data/pokedex.js', 'js/data/types.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/elite.js', 'js/entities/player.js', 'js/entities/player-sim-pass.js', 'js/entities/gym-leader.js', 'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/data/moves.js', 'js/systems/team-cards.js', 'js/systems/team.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js', 'js/data/gyms.js', 'js/entities/boss-ai.js', 'js/systems/leader-memory.js', 'js/systems/leader-info.js', 'js/systems/leader-belief.js', 'js/entities/leader-ai.js', 'js/systems/combat.js', 'js/systems/gym.js', 'js/systems/gym-arena.js'];
const NEW = ['js/systems/leader-info.js', 'js/entities/leader-ai.js'];
// leader-ai-mutate.js points one of these at a broken copy
const OVERRIDE = { 'js/entities/leader-ai.js': 'LA_AI', 'js/systems/leader-memory.js': 'LA_MEM', 'js/systems/leader-info.js': 'LA_INFO', 'js/systems/leader-belief.js': 'LA_BELIEF', 'js/systems/gym-arena.js': 'LA_ARENA', 'js/entities/gym-leader.js': 'LA_LEADER', 'js/entities/boss-ai.js': 'LA_BRAIN', 'js/data/gyms.js': 'LA_GYMS', 'js/systems/move-sim.js': 'LA_SIM', 'js/systems/move-effects.js': 'LA_EFFECTS' };
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
// swap checks see the behavior-neutral wrapper. Sections 5 on turn them on. Slice 3's own (confidence, pacing, triggers) stay off
// through section 10 too, so slice 2's checks see slice 2's behavior; sections 11 on turn them on.
if ('LeaderAI' in base && G.LeaderAI.off) Object.assign(G.LeaderAI.off, { swaps: true, dodges: true, confidence: true, pacing: true, triggers: true });

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
// Slice 5a (#34): the same walk with every AI decision on (swaps, dodges, confidence, pacing, triggers), loops 1 and 2, so the
// movement that pacing holds, the slot choice, the tells and the casts all show. The active mon takes 30% of its max HP at 5 s and
// 40% more at 9 s (the low HP stance, Misty's Recover, the hp triggers) and faints at 16 s. Every 6th frame: who, where, the
// active slot, the stance and the tell (move, wind-up to 3 decimals, fired); every tell start; every cast with its aim.
const TRACE5 = path.join(__dirname, 'leader-ai-5a-trace.json');
const tellOf = (e) => (e.brain && e.brain.tell) || (e.isHeld ? e.tell : null) || null;
function trace5(name, loop) {
  const was = Object.assign({}, G.LeaderAI.off),
    seed0 = G.LeaderAI.seed;
  Object.assign(G.LeaderAI.off, { swaps: false, dodges: false, confidence: false, pacing: false, triggers: false, memory: false });
  G.LeaderAI.seed = 7;
  const a = open(name, loop, 160),
    t = a.team,
    cx = human.x,
    cy = human.y,
    casts = [],
    tells = [],
    ticks = [];
  const off = G.SimBus.on('move:cast', (ev) => {
    const i = t.members.findIndex((m) => m.id === ev.ownerId);
    if (i >= 0) casts.push([frameNo, ev.moveId, i, +ev.aim.toFixed(3)]);
  });
  let last = null;
  frameNo = 0;
  try {
    for (let f = 0; f < 26 * 60; f++) {
      const ang = (f * DT * 2 * Math.PI) / 8;
      human.x = cx + Math.cos(ang) * 120;
      human.y = cy + Math.sin(ang) * 120;
      const e0 = t.active;
      if (!e0.dead && (f === 5 * 60 || f === 9 * 60)) e0.hurt(e0.maxHp * (f === 5 * 60 ? 0.3 : 0.4), null, true);
      if (f === 16 * 60 && !e0.dead) faint(e0);
      // a breather at 2 s (3 s long: the far stance and the quiet slot) and a voluntary swap request at 19 s (the bench has one)
      if (f === 2 * 60) (t.ai || e0.ai).startStance('breather', 'trace', 3);
      if (f === 19 * 60 && t.living().length > 1) (t.ai || e0.ai).requestSwap(t.members.findIndex((m) => m !== t.active && !m.dead));
      frame();
      const e = t.active,
        c = tellOf(e);
      if (c && c !== last) tells.push([frameNo, t.activeIdx, c.id, +c.wind.toFixed(3)]);
      last = c;
      if (frameNo % 6 === 0) {
        const ai = t.ai || e.ai;
        ticks.push([frameNo, t.activeIdx, +e.x.toFixed(2), +e.y.toFixed(2), e.active, ai.stance, c ? c.id : null, c ? +c.t.toFixed(3) : null, c ? c.fired : null]);
      }
    }
  } finally {
    off();
    Object.assign(G.LeaderAI.off, was);
    G.LeaderAI.seed = seed0;
  }
  return { casts, tells, ticks };
}
const trace5All = () => {
  const out = {};
  for (const name of ['Misty', 'Brock']) for (const loop of [1, 2]) out[name + loop] = trace5(name, loop);
  return out;
};
if (process.env.LA_RECORD5A) {
  const out = Object.assign({ recorded: new Date().toISOString().slice(0, 10) }, trace5All());
  fs.writeFileSync(TRACE5, JSON.stringify(out));
  console.log('leader-ai-harness: 5a trace recorded to ' + path.relative(R, TRACE5) + ' (' + Object.keys(out).filter((k) => k !== 'recorded').map((k) => k + ' ' + out[k].casts.length + ' casts, ' + out[k].tells.length + ' tells').join('; ') + ')');
  process.exit(0);
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
// Slice 5a (#34) parity: the AI player without GymBrain plays the fights recorded on GymBrain (LA_RECORD5A=1, before the slice).
// Re-recorded on #40 (2026-11-09) for two named changes: the sim pass runs after the body (your flow; on its own at most 2 frames
// per cast and 5.5 px, same moves) and firstWait 0 (the first wind-up starts at once instead of after 1.6 s). Both traces.
// Re-recorded on #43 step B (2026-11-09) for your order (decision 2026-11-09-42-one-swap-clock-and-one-swap-point): only Misty2 moved. Its
// voluntary swap lands before the body, so the incoming mon walks one frame more (at most 2.2 px, aims within 0.008 rad); the slot hold
// ticks after the body, so the wind-ups after the swap back start 1 frame later. Same moves in the same order, no cast moved over 1 frame.
// Re-recorded on #47a (2026-11-09) for your cast gate (decision 2026-11-09-42-leader-attacks-wait-on-your-cast-gate): a refused attack
// waits your 0.05 s retry instead of being re-asked every frame. Misty1 identical. Misty2: same casts on the same frames, positions
// within 2.74 px (a refused slot reads 0.05 s on her HUD for 3 frames). Brock1 and Brock2: 7 tells and 9 casts up to 2 frames later
// (the retry grid), same moves in the same order, positions within 1.9 px, release aims within 0.153 rad (you circle 2 frames more
// at Tackle range).
{
  const want = fs.existsSync(TRACE5) ? JSON.parse(fs.readFileSync(TRACE5, 'utf8')) : null;
  ok(want, 'parity 5a: the trace exists (record it on the code before the slice: LA_RECORD5A=1)');
  if (want) {
    const got = trace5All();
    for (const k of Object.keys(got)) {
      const w = want[k],
        g = got[k];
      ok(w && w.casts.length > 10 && w.tells.length > 5, k + ': the recorded fight casts and tells (a trace worth comparing)');
      if (!w) continue;
      for (const part of ['ticks', 'tells', 'casts']) {
        const i = g[part].findIndex((x, j) => JSON.stringify(x) !== JSON.stringify(w[part][j]));
        ok(i < 0 && g[part].length === w[part].length, k + ': every ' + part.slice(0, -1) + ' matches the GymBrain fight' + (i >= 0 ? ', first drift at ' + JSON.stringify(g[part][i]) + ' vs ' + JSON.stringify(w[part][i]) : g[part].length !== w[part].length ? ', ' + g[part].length + ' vs ' + w[part].length : ''));
      }
    }
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
    // the slot choice (GymBrain's until slice 5a, now the AI player's) never switches by itself: it returns the slot
    const e = t.active;
    let direct = 0;
    const s1 = e.setActive;
    e.setActive = () => direct++;
    e.swapT = 0;
    const pick = e.ai.pickSlot(e, human, G.Gym.now());
    e.setActive = s1;
    ok(direct === 0 && typeof pick === 'number', 'the slot choice returns its choice (' + pick + ') and never calls setActive');
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
    ok(!off.length, 'Misty authors none of these, so each is the agreed baseline' + (off.length ? ': ' + off.map((k) => k + '=' + ai.set[k]).join(', ') : ''));
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
      (e) => (e.tell = { fired: false, t: 0, wind: 99, after: 0 }),
      (e) => (e.tell = null),
      2.5
    );
    ok(h.during == null && h.after != null && h.after <= DT + 1e-9, 'a tell\'s wind-up holds it the same: ' + h.after);
    // the recovery after the move fired is not the tell: the swap comes on its tick
    h = hold(
      (e) => (e.tell = { fired: true, t: 0, wind: 0, after: 2.4 }),
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
    lone.s1.healsLeft = 0;
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
    ai.set.aggression = 0.5; // slice 3: no dodge lean, so these see slice 2's sideways dodge (Misty authors 0.68)
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
    ai.set.aggression = 0.5;
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

  // ======================= slice 3 (#32): confidence, pacing, triggers and lines =======================
  // Expected values are hand-derived from LEADER-AI (CONFIDENCE, PACING, DODGE DIRECTION, GAP-CLOSING DODGE, TRIGGERS, LINES) and
  // the agreed numbers in issue #32 and decision 2026-11-08-leader-ai-slice-3-opened-breather-is-back-off-plus-slot-choice:
  // Misty authors aggression 0.68, Brock 0.35; aggr = aggression + (conf - 0.5) x 0.6.
  const built3 = AI.CONF && AI.PACE && typeof AI.prototype.aggr === 'function';
  ok(built3, 'slice 3 is built: G.LeaderAI.CONF, PACE and aggr() defined');
  if (built3) {
    const C = AI.CONF,
      P = AI.PACE;
    /** A fight with only the named switches on, your HP at 100 (a hit's fraction reads plainly) and no other banner up. */
    const go3 = (name, loop, on = {}, dist) => {
      Object.assign(AI.off, { swaps: !on.swaps, dodges: !on.dodges, confidence: !on.confidence, pacing: !on.pacing, triggers: !on.triggers });
      const r = at(open(name, loop, dist));
      Object.assign(human, { hp: 100, maxHp: 100 });
      bannerUp = false;
      return r;
    };
    // a hit on screen: a leader mon's shape strikes you (its instance names the owner), or yours strikes it (the event names it)
    let fakeId = -5e6;
    const hitYou = (e, frac) => {
      const inst = { id: --fakeId, cast: { owner: e } },
        L = G.MoveSim.list();
      L.push(inst);
      G.SimBus.emit('move:hit', { moveId: 'tackle', instId: inst.id, enemyId: null, dmg: frac * human.maxHp, crit: false, typeMult: 1, x: 0, y: 0, hop: 0 });
      L.splice(L.indexOf(inst), 1);
    };
    const hitHer = (e, frac) => G.SimBus.emit('move:hit', { moveId: 'ember', instId: -1, enemyId: e.id, dmg: frac * e.maxHp, crit: false, typeMult: 1, x: 0, y: 0, hop: 0 });
    const TICK = 0.25 + DT + 1e-9; // a choice made on the think tick lands within one tick (no tell: you stand far away)

    // ---------------- 11. the settings, the constants, the authoring and the validator ----------------
    {
      const want = { aggression: 0.5, confStart: 0.5, confSwing: 1, confMin: 0.2, confMax: 0.9, pushAfter: 6, breatherMax: 0.25, gapClose: 0.7, lean: 45 };
      const bad = Object.keys(want).filter((k) => AI.BASE[k] !== want[k]);
      ok(!bad.length, 'the slice 3 baselines are the agreed ones' + (bad.length ? ': ' + bad.map((k) => k + '=' + AI.BASE[k]).join(', ') : ''));
      ok(near(C.hit, 0.03) && near(C.faint, 0.15) && near(C.drift, 0.01) && near(C.trade, 0.1) && near(C.pull, 0.6) && near(C.swing, 0.25) && C.swingCd === 20, 'the confidence constants: hit 0.03, faint 0.15, drift 0.01 at a 10% trade, pull 0.6, a 0.25 swing line every 20 s at most');
      ok(P.pushLen === 5 && near(P.pressConf, 0.7) && near(P.pressHp, 0.4) && near(P.pressure, 0.15) && P.breathLen === 3 && P.gap0 === 8 && P.gapK === 16, 'the pacing constants: push 5 s, press at 0.7 with you under 40%, a breather after 15% in 2 s, 3 s long, then 8 + 16 x aggr s');
      ok(AI.LINE_WAIT === 4, 'a line waits at most 4 s for the banner');
      ok(go3('Misty', 2).ai.set.aggression === 0.68 && go3('Brock', 2).ai.set.aggression === 0.35, 'Misty authors aggression 0.68, Brock 0.35 (Jess 2026-11-08)');
      const misty = K[gymIdx('Misty')],
        errs = (ai) => G.Gyms.validate(Object.assign({}, misty, { ai })),
        n0 = errs(undefined).length;
      ok(errs(misty.ai).length === n0 && errs(K[gymIdx('Brock')].ai).length === n0, "Misty's and Brock's authored ai pass the validator");
      ok(errs({ aggression: 1.2 }).some((s) => /ai aggression is from 0 to 1/.test(s)), 'an aggression above 1 is refused');
      ok(errs({ triggers: [{ on: 'dawn', line: 'x' }] }).some((s) => /unknown trigger on dawn/.test(s)), 'an unknown condition is named');
      ok(errs({ triggers: [{ on: 'hp', line: 'x' }] }).some((s) => /hp needs below/.test(s)), 'an HP trigger needs its line');
      ok(errs({ triggers: [{ on: 'faint', side: 'theirs', line: 'x' }] }).some((s) => /faint needs side/.test(s)), 'a faint trigger needs a side');
      ok(errs({ triggers: [{ on: 'time', line: 'x' }] }).some((s) => /time needs at/.test(s)), 'a time trigger needs its seconds');
      ok(errs({ triggers: [{ on: 'start' }] }).some((s) => /does nothing/.test(s)), 'a trigger with no action is refused');
      ok(errs({ triggers: [{ on: 'start', set: { bogus: 1 } }] }).some((s) => /set bogus/.test(s)), 'a set names a known setting');
      ok(errs({ triggers: [{ on: 'start', line: 'x', jump: 1 }] }).some((s) => /unknown key jump/.test(s)), 'an unknown trigger key is named');
      ok(errs({ triggers: [{ on: 'start', swap: 0 }] }).some((s) => /swap is a 1-based/.test(s)), 'a swap is a 1-based team slot');
      ok(errs({ lines: { up: 3 } }).some((s) => /ai line up is text/.test(s)) && errs({ lines: { sideways: 'x' } }).some((s) => /unknown ai line/.test(s)), 'swing lines are up and down, as text');
      const all = { triggers: [{ on: 'start', line: 'a' }, { on: 'hp', below: 0.5, swap: 2, set: { aggression: 0.9 }, for: 3 }, { on: 'faint', side: 'own', slot: 1 }, { on: 'sendIn', line: 'b', repeat: true }, { on: 'time', at: 9, line: 'c' }, { on: 'exploit', line: 'e' }], lines: { up: 'u', down: 'd' } };
      ok(errs(all).length === n0, 'every condition and action the spec names (exploiting a pattern since slice 4) passes');
    }

    // ---------------- 12. confidence ----------------
    {
      let { t, ai, s1 } = go3('Misty', 2, { confidence: true });
      run(1);
      ok(near(ai.conf, 0.5), 'confidence starts at confStart 0.5: ' + ai.conf);
      hitHer(s1, 0.05);
      frame();
      ok(near(ai.conf, 0.47), 'a hit taken: -0.03: ' + ai.conf);
      hitYou(s1, 0.05);
      hitYou(s1, 0.05);
      frame();
      ok(near(ai.conf, 0.53), 'two hits landed: +0.06: ' + ai.conf);
      you[1].dead = true;
      frame();
      ok(near(ai.conf, 0.68), 'one of your mons faints: +0.15: ' + ai.conf);
      you[1].dead = false;
      faint(t.active);
      until(2, () => t.active !== s1 && !t.active.dead);
      frame();
      ok(near(ai.conf, 0.53), 'its own mon faints: -0.15 (heard once the next mon thinks): ' + ai.conf);
      ({ ai, s1 } = go3('Misty', 2, { confidence: true }));
      for (let i = 0; i < 30; i++) hitHer(s1, 0.001);
      frame();
      ok(near(ai.conf, 0.2), '30 hits taken stop at the floor 0.2: ' + ai.conf);
      for (let i = 0; i < 40; i++) hitYou(s1, 0.001);
      frame();
      ok(near(ai.conf, 0.9), 'and 40 landed stop at the ceiling 0.9: ' + ai.conf);
      ({ ai, s1 } = go3('Misty', 2, { confidence: true }));
      ai.set.confSwing = 2;
      hitYou(s1, 0.01);
      frame();
      ok(near(ai.conf, 0.56), 'confSwing 2 doubles a hit: ' + ai.conf);
      // the long window: one 12% hit (a 10%+ trade) drifts it +0.01 a second for the 10 s it stays in the window (#50: the long window is 10 s)
      ({ ai, s1 } = go3('Misty', 2, { confidence: true }));
      run(0.5);
      hitYou(s1, 0.12);
      frame();
      ok(near(ai.conf, 0.53 + 0.01 * DT), 'a 12% hit: +0.03, then the drift starts: ' + ai.conf);
      run(16);
      ok(Math.abs(ai.conf - 0.63) <= 2e-3, 'and stops when it leaves the 10 s window: 0.53 + 0.10 = 0.63: ' + ai.conf);
      // effective aggression and the swap margin
      const ag = (c) => ((ai.conf = c), ai.aggr()),
        mg = (c) => ((ai.conf = c), ai.swapMargin());
      ok(near(ag(0.5), 0.68) && near(ag(0.9), 0.92) && near(ag(0.2), 0.5), 'Misty aggr: 0.68 at 0.5, 0.92 at the ceiling, 0.50 at the floor: ' + [ag(0.5), ag(0.9), ag(0.2)].join(', '));
      ok(near(mg(0.5), 1.1) && near(mg(0.9), 1.21) && near(mg(0.2), 1.0175), 'the swap margin: 1.1 at 0.5, 1.21 at the ceiling, 1.0175 at the floor');
      const b = go3('Brock', 2, { confidence: true }).ai;
      b.conf = 0.9;
      ok(near(b.aggr(), 0.59) && b.aggr() < b.set.gapClose, 'Brock at his ceiling: aggr 0.59, under the gap-closing line: ' + b.aggr());
      ({ ai, s1 } = go3('Misty', 2, {}));
      hitYou(s1, 0.5);
      hitHer(s1, 0.01);
      you[1].dead = true;
      run(1);
      you[1].dead = false;
      ok(near(ai.conf, 0.5), 'with confidence off nothing moves it: ' + ai.conf);
      // only her own shapes count as her hits (the harness does not step the sim, so hits are emitted as the sim emits them)
      ({ ai, s1 } = go3('Misty', 2, { confidence: true }));
      const wild = { id: -4e6, cast: { owner: { foes: () => [human] } } },
        L = G.MoveSim.list();
      L.push(wild);
      G.SimBus.emit('move:hit', { moveId: 'tackle', instId: wild.id, enemyId: null, dmg: 50, crit: false, typeMult: 1, x: 0, y: 0, hop: 0 });
      L.splice(L.indexOf(wild), 1);
      G.SimBus.emit('move:hit', { moveId: 'tackle', instId: -123, enemyId: null, dmg: 50, crit: false, typeMult: 1, x: 0, y: 0, hop: 0 });
      G.SimBus.emit('move:hit', { moveId: 'ember', instId: -1, enemyId: 999999, dmg: 50, crit: false, typeMult: 1, x: 0, y: 0, hop: 0 });
      frame();
      const w = G.GymArena.leaderInfo.windows();
      ok(near(ai.conf, 0.5) && w.dealtLong === 0 && w.takenLong === 0, "another owner's hit, an unknown shape and a hit on a mon not hers count for nothing");
      hitYou(s1, 0.2);
      hitHer(s1, 0.05);
      frame();
      const w2 = G.GymArena.leaderInfo.windows();
      ok(near(w2.dealt, 0.2) && near(w2.taken, 0.05) && near(w2.dealtLong, 0.2) && w2.sinceHit < 2 * DT, 'her hit and yours fill both windows as fractions of max HP: ' + JSON.stringify(w2));
      run(2.1);
      const w3 = G.GymArena.leaderInfo.windows();
      ok(w3.dealt === 0 && near(w3.dealtLong, 0.2), 'after 2 s they leave the short window and stay in the long one');
    }

    // ---------------- 13. pacing: push, breather, the cap, a mon arriving ----------------
    {
      // frustration: Misty at 0.68 waits 6 x (1.5 - 0.68) = 4.92 s without landing a hit
      let { t, ai, s1, s2 } = go3('Misty', 2, { pacing: true });
      const pushAt = until(8, () => ai.stance === 'push');
      ok(pushAt != null && pushAt >= 4.92 - 1e-9 && pushAt <= 4.92 + TICK, 'frustration: a push after 4.92 s with no hit landed: ' + pushAt);
      ok(/frustration/.test(ai.stanceWhy), 'its reason: ' + ai.stanceWhy);
      frame();
      ok(G.LeaderAI.HOLD[ai.stance] === 'close' && ai.legsOf(s1).mode === 'close', 'a push holds the close stance: ' + G.LeaderAI.HOLD[ai.stance] + ' ' + ai.legsOf(s1).mode);
      const endAt = until(6, () => ai.stance !== 'push');
      ok(endAt != null && Math.abs(endAt - 5) <= 2 * DT + 1e-9, 'with no hit the push ends after 5 s: ' + endAt);
      const again = until(6, () => ai.stance === 'push');
      ok(again != null && again >= 4.92 - 1e-9 && again <= 4.92 + TICK, 'the next push waits 4.92 s from the end of the last: ' + again);
      hitYou(t.active, 0.01);
      frame();
      ok(ai.stance === 'neutral' && /landed/.test(ai.stanceWhy), 'a hit landed ends the push: ' + ai.stance + ' (' + ai.stanceWhy + ')');
      frame();
      ok(G.LeaderAI.HOLD[ai.stance] == null, 'and releases the stance');
      // bolder: aggression 0.9 waits 6 x 0.6 = 3.6 s
      ({ ai } = go3('Misty', 2, { pacing: true }));
      ai.set.aggression = 0.9;
      const bold = until(8, () => ai.stance === 'push');
      ok(bold != null && bold >= 3.6 - 1e-9 && bold <= 3.6 + TICK, 'higher aggression pushes sooner: 3.6 s at 0.9: ' + bold);
      // pressing an advantage: confidence 0.7 or more while you are under 40%
      ({ ai } = go3('Misty', 2, { pacing: true }));
      run(1);
      ai.conf = 0.75;
      human.hp = 45;
      run(0.3);
      ok(ai.stance === 'neutral', 'confident, you at 45%: no press');
      human.hp = 39;
      run(0.3);
      ok(ai.stance === 'push' && /press/.test(ai.stanceWhy), 'you at 39%: it presses: ' + ai.stanceWhy);
      ({ ai } = go3('Misty', 2, { pacing: true }));
      run(1);
      ai.conf = 0.69;
      human.hp = 10;
      run(0.3);
      ok(ai.stance === 'neutral', 'at confidence 0.69 it does not press');
      // a breather: 16% dealt in the short window, 3 x (1.5 - 0.68) = 2.46 s long, then a wait of 8 + 16 x 0.68 = 18.88 s
      ({ t, ai, s1, s2 } = go3('Misty', 2, { pacing: true }));
      run(20);
      hitYou(s1, 0.16);
      const br = until(0.5, () => ai.stance === 'breather');
      ok(br != null && br <= TICK, 'sustained pressure (16% in 2 s) earns a breather on the next tick: ' + br);
      ok(/pressure/.test(ai.stanceWhy), 'its reason: ' + ai.stanceWhy);
      frame();
      ok(G.LeaderAI.HOLD[ai.stance] === 'far' && ai.legsOf(s1).mode === 'far', 'a breather holds the far stance');
      let endClock = null;
      const len = until(4, () => ai.stance !== 'breather' && (endClock = ai.clock) != null);
      ok(len != null && Math.abs(len - 2.46) <= 2 * DT + 1e-9, 'it lasts 2.46 s: ' + len);
      ok(endClock != null && near(ai.breathNext, endClock + 18.88), 'the next may start 18.88 s after it ends: ' + (ai.breathNext - endClock));
      run(3);
      hitYou(s1, 0.16);
      ok(until(0.5, () => ai.stance === 'breather') == null, 'pressure 3 s later: no breather yet');
      while (ai.clock < ai.breathNext - 0.6) frame();
      hitYou(s1, 0.16);
      ok(until(0.5, () => ai.stance === 'breather') == null, 'nor 0.6 s before the wait ends');
      while (ai.clock < ai.breathNext) frame();
      hitYou(s1, 0.16);
      ok(until(0.5, () => ai.stance === 'breather') != null, 'but once it ends');
      // its quiet slot: Staryu's Harden (slot 3) when its Gate is open (statReady stands in for an open Gate), with you 120 px off,
      // inside Water Gun's reach, where GymBrain alone keeps an attack slot
      const sr = G.MoveEffects.statReady;
      const quiet = (breathe) => {
        const r = go3('Misty', 2, { pacing: true });
        run(20);
        G.MoveEffects.statReady = () => true;
        if (breathe) {
          hitYou(r.s1, 0.16);
          until(0.5, () => r.ai.stance === 'breather');
        }
        let on = null,
          off = 0;
        for (let i = 1; i <= 140; i++) {
          human.x = r.s1.x;
          human.y = r.s1.y + 120;
          frame();
          if (r.s1.active === 2 && on == null) on = i * DT;
          else if (on != null && r.s1.active !== 2) off++;
        }
        G.MoveEffects.statReady = sr;
        return { on, off };
      };
      const alone = quiet(false),
        calm = quiet(true);
      ok(alone.on == null || alone.off > 0, 'with you in reach and no breather, GymBrain does not stay on Harden: ' + JSON.stringify(alone));
      ok(calm.on != null && calm.on <= 0.5 && calm.off === 0, 'in a breather it presses its buff slot (Harden, slot 3) and stays on it: ' + JSON.stringify(calm));
      // it never holds back a cast: Psyduck (Misty loop 3, no buff open at full HP) keeps casting at you through its breather
      ({ t, ai } = go3('Misty', 3, { pacing: true }));
      run(1);
      ai.requestSwap(2);
      frame();
      const psy = t.active;
      ok(psy.dex === 54, 'Psyduck is on the field: ' + psy.dex);
      run(19);
      hitYou(psy, 0.16);
      until(0.5, () => ai.stance === 'breather');
      let casts = 0;
      const offCast = G.SimBus.on('move:cast', (ev) => ev.ownerId === psy.id && casts++);
      for (let i = 0; i < 200 && ai.stance === 'breather'; i++) {
        human.x = psy.x;
        human.y = psy.y + 180;
        frame();
      }
      offCast();
      ok(ai.stance === 'neutral' && casts > 0, 'in a breather it still casts (nothing is held back): ' + casts + ' casts');
      // a mon arriving ends a breather and starts neutral; the breather share is the fight's, the swap does not reset it
      ({ t, ai, s1, s2 } = go3('Misty', 2, { pacing: true }));
      run(20);
      hitYou(s1, 0.16);
      until(0.5, () => ai.stance === 'breather');
      run(1);
      const bt = ai.breathT;
      ai.requestSwap(1);
      frame();
      ok(t.active === s2 && ai.stance === 'neutral', 'a mon arriving ends the breather: Seel starts neutral');
      ok(ai.breathT >= bt - 1e-9, 'and the breather time is kept: ' + bt.toFixed(2) + ' then ' + ai.breathT.toFixed(2));
      frame();
      ok(G.LeaderAI.HOLD[ai.stance] == null && ai.legsOf(s2).mode != null, 'Seel holds no stance');
      // the cap: at aggression 0 a breather is 4.5 s and the wait 8 s (36% of the time), so breatherMax 25% has to cut them
      ({ t, ai } = go3('Misty', 2, { pacing: true }));
      ai.set.aggression = 0;
      let worst = -1,
        cut = 0;
      const end0 = ai.endStance.bind(ai);
      ai.endStance = (why) => {
        if (why === 'breatherMax') cut++;
        end0(why);
      };
      for (let i = 0; i < 60 * 60; i++) {
        if (i % 30 === 0) hitYou(t.active, 0.16);
        frame();
        worst = Math.max(worst, ai.breathT - 0.25 * ai.clock);
      }
      ok(worst <= DT + 1e-9, 'under constant pressure the breathers never pass 25% of the fight: worst ' + worst.toFixed(4));
      ok(cut > 0 && ai.breathT > 0.2 * ai.clock, 'the cap cut ' + cut + ' of them, and they still fill most of the share: ' + (ai.breathT / ai.clock).toFixed(3));
    }

    // ---------------- 14. the dodge lean ----------------
    {
      // you stand 300 px east of her (or `at`); the shot passes just north of her going east, so slice 2's dodge is straight south.
      // The angle is measured from south toward east (you): (aggr - 0.5) x 2 x 45 degrees, never past you.
      const leanOf = (aggression, conf, at = [300, 0]) => {
        const { ai, s1: e } = go3('Misty', 2, { dodges: true });
        ai.set.aggression = aggression;
        ai.conf = conf;
        for (let k = 0; k < 10; k++) {
          run(3);
          e.dodges.cd = [0, 0];
          const s = shoot(e);
          let read = null,
            dv = null;
          for (let i = 0; i < 60; i++) {
            human.x = e.x + at[0];
            human.y = e.y + at[1];
            const was = e.dodgeT > 0;
            step();
            const n = ai.log.find((d) => d.act === 'threat' && d.serial === s.cast.serial);
            if (n && read == null) read = n.read;
            if (read && !dv && !was && e.dodgeT > 0) dv = [e.dodgeVx, e.dodgeVy];
          }
          drop();
          if (dv) return (Math.atan2(dv[0], dv[1]) * 180) / Math.PI;
        }
        return null;
      };
      const deg = (a, b) => a != null && Math.abs(a - b) <= 0.01;
      let a = leanOf(0.68, 0.9);
      ok(deg(a, 37.8), 'Misty winning (conf 0.9, aggr 0.92): 37.8 degrees toward you: ' + a);
      a = leanOf(0.68, 0.2);
      ok(deg(a, 0), 'Misty at the floor (aggr 0.50): straight sideways: ' + a);
      a = leanOf(0.35, 0.5);
      ok(deg(a, -13.5), "Brock's 0.35 at neutral: 13.5 degrees away from you: " + a);
      a = leanOf(0.5, 0.5);
      ok(deg(a, 0), 'aggr 0.5: straight sideways: ' + a);
      const past = (Math.atan2(100, 275) * 180) / Math.PI;
      a = leanOf(1, 0.9, [100, 275]);
      ok(deg(a, past), 'aggr 1 (45 degrees) with you ' + past.toFixed(2) + ' degrees off: it turns only as far as you: ' + a);
    }

    // ---------------- 15. the gap-closing dodge ----------------
    {
      // Misty loop 2 Staryu has Tackle (melee). You stand east, `extra` px past its reach (plus your body); one dodge is 150 px.
      const gap = (name, loop, conf, { cd = [0, 0], reserve = 0, extra = 75, ready = true, stance = null } = {}) => {
        const { ai, s1: e } = go3(name, loop, { pacing: true });
        ai.conf = conf;
        ai.set.dodgeReserve = reserve;
        if (stance) {
          ai.clock = 100; // so breatherMax (25% of the fight so far) does not end it at once
          ai.startStance(stance, 'test', 10);
        }
        const reach = e.ai.reach(e) + human.r;
        let dv = null,
          at = null;
        for (let i = 1; i <= 30 && !dv; i++) {
          e.dodges.cd = cd.slice();
          if (!ready) for (const g of e.slots) for (const s of g) s.t = 99;
          human.x = e.x + reach + extra;
          human.y = e.y;
          const was = e.dodgeT > 0;
          frame();
          if (!was && e.dodgeT > 0) {
            dv = [e.dodgeVx, e.dodgeVy];
            at = i * DT;
          }
        }
        return { dv, at, noted: ai.log.some((d) => d.act === 'gap') };
      };
      let g = gap('Misty', 2, 0.6);
      ok(g.dv && g.dv[0] > 0 && Math.abs(g.dv[1]) < 1e-6 && g.noted, 'aggr 0.74, Tackle ready, you 75 px out of reach: it dodges straight at you: ' + JSON.stringify(g.dv));
      ok(g.at != null && g.at <= TICK, 'on the think tick: ' + g.at);
      ok(!gap('Misty', 2, 0.53).dv, 'aggr 0.698, just under 0.7: no');
      ok(!gap('Misty', 2, 0.6, { cd: [0, 6] }).dv, 'one charge ready: kept back for threats');
      ok(!gap('Misty', 2, 0.6, { reserve: 1 }).dv, 'dodgeReserve 1 with two ready: kept back (it needs one more than the reserve plus one)');
      ok(gap('Misty', 2, 0.6, { extra: 150 }).dv, 'you exactly one dodge out: it goes');
      ok(!gap('Misty', 2, 0.6, { extra: 151 }).dv, 'one px more than a dodge: no');
      ok(!gap('Misty', 2, 0.6, { extra: -5 }).dv, 'you already in reach: no');
      ok(!gap('Misty', 2, 0.6, { ready: false }).dv, 'no close move ready: no');
      ok(!gap('Misty', 2, 0.6, { stance: 'breather' }).dv, 'in a breather: no');
      ok(!gap('Brock', 2, 0.9).dv, 'Brock at his ceiling (aggr 0.59): never');
    }

    // ---------------- 16. triggers and lines ----------------
    {
      // Misty's authored lines
      let { t, ai, s1, s2 } = go3('Misty', 2, { triggers: true });
      run(0.1);
      ok(says.includes('Misty: Think you can keep your head above water?'), 'the fight-start line: ' + says.join(' | '));
      says = [];
      s1.hp = s1.maxHp * 0.49;
      run(0.05);
      const annoyed = () => says.filter((x) => x === "Misty: Okay, now I'm annoyed!").length;
      ok(annoyed() === 1, 'crossing half HP says her line: ' + says.join(' | '));
      s1.hp = s1.maxHp * 0.6;
      frame();
      s1.hp = s1.maxHp * 0.4;
      run(0.2);
      ok(annoyed() === 1, 'once: crossing again says nothing');
      // Brock's: aggression 0.5 for 10 s, then back to 0.35
      ({ ai, s1 } = go3('Brock', 2, { triggers: true }));
      run(1);
      says = [];
      s1.hp = s1.maxHp * 0.45;
      run(0.1);
      ok(says.includes('Brock: Time to get serious.') && ai.set.aggression === 0.5, 'Brock under half HP: his line and aggression 0.5: ' + says.join(' | '));
      run(9.8);
      ok(ai.set.aggression === 0.5, 'for 10 s');
      run(0.3);
      ok(ai.set.aggression === 0.35, 'then back to 0.35: ' + ai.set.aggression);
      // each condition and action, on Misty with one authored trigger at a time
      const fresh = (list, loop = 2) => {
        const r = go3('Misty', loop, { triggers: true });
        r.ai.useTriggers(list);
        says = [];
        return r;
      };
      const said = (x) => says.filter((s) => s === 'Misty: ' + x).length;
      ({ s1 } = fresh([{ on: 'hp', below: 0.5, line: 'R', repeat: true }]));
      s1.hp = s1.maxHp * 0.4;
      frame();
      s1.hp = s1.maxHp * 0.6;
      frame();
      s1.hp = s1.maxHp * 0.4;
      run(0.1);
      ok(said('R') === 2, 'a repeating HP trigger fires on each crossing: ' + said('R'));
      fresh([{ on: 'faint', side: 'yours', line: 'F' }]);
      run(0.2);
      you[1].dead = true;
      run(0.1);
      you[1].dead = false;
      ok(said('F') === 1, 'your faint');
      ({ t } = fresh([{ on: 'faint', side: 'own', line: 'O' }]));
      run(0.5);
      faint(t.active);
      run(2);
      ok(said('O') === 1, 'its own faint (said once the next mon is out)');
      fresh([{ on: 'sendIn', line: 'S' }]);
      run(0.2);
      ok(said('S') === 0, 'no send-in of yours yet');
      youActive = 1;
      run(0.1);
      ok(said('S') === 1, 'you send in a mon');
      youActive = 0;
      fresh([{ on: 'time', at: 3, line: 'T' }]);
      const tAt = until(4, () => said('T') > 0);
      ok(tAt != null && tAt >= 3 - 1e-9 && tAt <= 3 + DT + 1e-9, 'time 3 s: at 3 s: ' + tAt);
      fresh([{ on: 'time', at: 2, line: 'P', repeat: true }]);
      run(6.1);
      ok(said('P') === 3, 'time every 2 s, repeating: 3 in 6.1 s: ' + said('P'));
      // actions through your controls
      ({ t, s1, s2 } = fresh([{ on: 'time', at: 1, swap: 2 }]));
      run(1.1);
      ok(t.active === s2 && says.includes('Misty switches to Seel!'), 'a swap action goes through your swap: Seel is in');
      ({ t, s1 } = fresh([{ on: 'time', at: 1, swap: 2 }]));
      t.lock = 3;
      run(1.2);
      ok(t.active === s1, 'under the swap lock it is refused');
      run(3);
      ok(t.active === s1, 'and dropped, as your key press is');
      ({ s1 } = fresh([{ on: 'time', at: 1, slot: 3 }]));
      ok(until(1.1, () => s1.active === 2) != null, 'a slot action presses slot 3');
      ({ s1 } = fresh([{ on: 'time', at: 1, slot: 3 }]));
      s1.swapT = 5;
      run(1.2);
      ok(s1.active !== 2, 'under your 0.4 s slot hold (here 5 s) it is refused');
      ({ ai } = fresh([{ on: 'time', at: 1, set: { aggression: 0.9 } }]));
      run(1.1);
      ok(ai.set.aggression === 0.9, 'a set with no `for` holds');
      run(20);
      ok(ai.set.aggression === 0.9, 'for the rest of the fight');
      // a trigger waits out a commitment; a line waits for the banner, at most 4 s
      ({ s1 } = fresh([{ on: 'time', at: 1, line: 'B' }]));
      run(0.5);
      s1.mvRoot = true;
      run(1.5);
      ok(said('B') === 0, 'inside a commitment the trigger waits');
      s1.mvRoot = false;
      frame();
      ok(said('B') === 1, 'and fires on the first free frame');
      fresh([{ on: 'time', at: 1, line: 'Q' }]);
      bannerUp = true;
      run(1.5);
      ok(said('Q') === 0, 'another banner up: the line waits');
      bannerUp = false;
      frame();
      ok(said('Q') === 1, 'and shows once it clears');
      fresh([{ on: 'time', at: 1, line: 'D' }]);
      bannerUp = true;
      run(5.2);
      bannerUp = false;
      run(0.1);
      ok(said('D') === 0, 'a line that waited more than 4 s is dropped');
      // swing lines: up at +0.27, down only after the 20 s cooldown
      ({ ai, s1 } = go3('Misty', 2, { triggers: true, confidence: true }));
      run(0.5);
      says = [];
      for (let i = 0; i < 9; i++) hitYou(s1, 0.001);
      run(0.05);
      ok(said('Go with the flow, or get swept away!') === 1, 'a swing of +0.27 says her up line: ' + says.join(' | '));
      for (let i = 0; i < 9; i++) hitHer(s1, 0.001);
      run(1);
      ok(said('Hmph. Lucky shot.') === 0, 'back down 0.27 at once: no line inside the 20 s cooldown');
      ok(until(20, () => said('Hmph. Lucky shot.') > 0) != null, 'the down line once the cooldown is over');
      ok(says.filter((x) => /^Misty: (Go with|Hmph)/.test(x)).length === 2, 'two swing lines in all, no spam');
    }

    // ---------------- 17. a close fight with everything on ----------------
    {
      const { t, ai } = go3('Misty', 2, { swaps: true, dodges: true, confidence: true, pacing: true, triggers: true }, 160);
      const look = () => t.members.map((m) => [m.maxHp, m.cdMul, m.gym.tempo, m.gym.power, m.gym.level].join()).join('|');
      const before = look(),
        stances = new Set();
      let worst = -1,
        err = null;
      for (let i = 0; i < 40 * 60 && !err; i++) {
        try {
          frame();
        } catch (x) {
          err = x;
        }
        stances.add(ai.stance);
        worst = Math.max(worst, ai.breathT - ai.set.breatherMax * ai.clock);
      }
      ok(!err, 'a 40 s close fight runs: ' + (err ? err.stack : 'no error'));
      ok(stances.size >= 2, 'and changes stance: ' + [...stances].join(', '));
      ok(worst <= DT + 1e-9, 'the breathers stay under their share');
      ok(ai.conf >= 0.2 - 1e-9 && ai.conf <= 0.9 + 1e-9, 'confidence stays between floor and ceiling: ' + ai.conf.toFixed(3));
      ok(look() === before, 'no HP, cooldown, tempo, power or level was changed (NO RUBBER BANDING)');
    }

    // ======================= slice 4 (#33): run memory and the first exploit =======================
    // Expected values are hand-derived from LEADER-AI ("Run memory and behavior tracking", STALE REVEALS, PREDICTION CAP) and the
    // opening agreed in issue #33 (Jess 2026-11-08): learnRate 3 (Misty authors 2), predictCap 7 in 10 as a seeded run-long bag, the
    // usual lead = the mon of yours with the most field time in a fight, its read skips minField, no swap but the line when already
    // on the best matchup. Your mons: Bulbasaur 'uid-bulba' (Grass/Poison), Charmander 'slot:1' (Fire, no copy uid).
    const Mem = G.LeaderMemory;
    const built4 = !!(Mem && Mem.lead && AI.BASE.learnRate != null && typeof AI.prototype.open === 'function');
    ok(built4, 'slice 4 is built: G.LeaderMemory, G.LeaderAI.BASE.learnRate and the opening read defined');
    if (built4) {
      const B = 'uid-bulba',
        C4 = 'slot:1',
        MISTY = K[gymIdx('Misty')].id,
        BROCK = K[gymIdx('Brock')].id;
      /** One whole fight: `plan` is [[your roster index on the field, seconds], ...]; then the arena resets, which books it. */
      const fight = (name, loop, plan = [[0, 1]], on = {}) => {
        const r = go3(name, loop, on);
        for (const [act, secs] of plan) {
          youActive = act;
          run(secs);
        }
        G.GymArena.reset();
        return r;
      };
      const fresh4 = () => {
        G.GymArena.reset();
        Mem.start();
      };
      const exploits = (ai) => ai.log.filter((d) => d.act === 'exploit' && /^your usual lead/.test(d.text)).length;
      const holds = (ai) => ai.log.filter((d) => d.act === 'exploit' && /^held back/.test(d.text)).length;
      const MLINE = "Misty: I know who you lean on. Let's see them handle this!";

      // ---------------- 18. the settings and the authoring ----------------
      {
        ok(AI.BASE.learnRate === 3 && AI.BASE.predictCap === 7, 'the baselines: learnRate 3, predictCap 7 (of 10)');
        ok(go3('Misty', 2).ai.set.learnRate === 2 && go3('Brock', 2).ai.set.learnRate === 3, 'Misty authors learnRate 2; Brock keeps the baseline 3');
        ok(go3('Misty', 2).ai.set.predictCap === 7 && go3('Brock', 2).ai.set.predictCap === 7, 'both keep predictCap 7');
        const errs = (ai) => G.Gyms.validate(Object.assign({}, K[gymIdx('Misty')], { ai })),
          n0 = errs(undefined).length;
        ok(errs(K[gymIdx('Misty')].ai).length === n0 && errs(K[gymIdx('Brock')].ai).length === n0, "Misty's and Brock's ai (with their exploit lines) pass the validator");
        ok(errs({ learnRate: 2, predictCap: { 1: 5, 2: 9 } }).length === n0, 'learnRate and predictCap take numbers and loop keys');
        ok(errs({ predictCap: 11 }).some((s) => /predictCap is from 0 to 10/.test(s)), 'a predictCap above 10 is refused');
        ok(errs({ triggers: [{ on: 'exploit' }] }).some((s) => /does nothing/.test(s)), 'an exploit trigger needs an action');
        const said = (who) => (K[gymIdx(who)].ai.triggers || []).some((t) => t.on === 'exploit' && t.line);
        ok(said('Misty') && said('Brock'), 'Misty and Brock each author an exploit line');
      }

      // ---------------- 19. the store: run-scoped, never saved, fed only by the information layer ----------------
      {
        Mem.end();
        ok(!Mem.on && Mem.record(MISTY) === null, 'outside a run there is no store and no record');
        Mem.start();
        const rec = Mem.record(MISTY);
        ok(rec && rec.fights === 0 && rec.mons.size === 0 && rec.team.leads.size === 0, 'startRun: an empty record');
        ok(Mem.record(BROCK) !== rec && Mem.record(MISTY) === rec, 'one record per leader, keyed by gym id');
        Mem.end();
        ok(Mem.record(MISTY) === null, 'endRun: the store is gone');
        const src = (p) => fs.readFileSync(path.join(R, p), 'utf8'),
          body = (s, fn) => s.slice(s.indexOf('function ' + fn + '('), s.indexOf('\n  function ', s.indexOf('function ' + fn + '(') + 10));
        ok(/G\.LeaderMemory\.start\(\)/.test(body(src('js/game.js'), 'startRun')), 'G.Game.startRun starts the store');
        ok(/G\.LeaderMemory\.end\(\)/.test(body(src('js/game.js'), 'endRun')), 'G.Game.endRun drops it');
        const ms = src('js/systems/leader-memory.js');
        ok(!/SimBus|G\.DB|localStorage/.test(ms), 'the memory module hears nothing and writes no save (only G.LeaderInfo feeds it)');
        // a cast with no fight running, or after one ends, is not remembered
        fresh4();
        reveal(bulba, 'vine-whip');
        ok(Mem.record(MISTY).mons.size === 0, 'a cast outside a fight is not remembered');
        const { t, ai, s1, s2 } = go3('Misty', 2),
          mon = (k) => Mem.record(MISTY).mons.get(k);
        G.SimBus.emit('move:cast', { moveId: 'water-gun', ownerId: s1.id, ownerUid: null, ownerSlot: 0, rival: true, x: 0, y: 0, aim: 0, enemy: true });
        ok(!mon(B) && !mon(C4), "her own cast writes nothing about your mons");
        reveal(bulba, 'vine-whip');
        reveal(bulba, 'razor-leaf');
        ok(mon(B).moves.get('vine-whip') === 1 && mon(B).moves.get('razor-leaf') === 1, 'your casts are remembered with the fight they were confirmed in (fight 1)');
        ok(mon(B).bonds.length === 1 && mon(B).bonds[0].ids.slice().sort().join() === 'razor-leaf,vine-whip' && mon(B).bonds[0].fight === 1, 'and the bond, as the information layer revealed it');
        G.SimBus.emit('slot:switch', { ownerUid: B, ownerSlot: 0, rival: false, slot: 2 });
        ok(mon(B).switches === 1 && mon(B).toSlot[2] === 1, 'a slot switch is counted, with the slot it went to');
        // field time and range, against the distance this harness measures each frame
        let want = 0;
        const t0 = mon(B).fieldT,
          r0 = mon(B).range;
        for (let i = 0; i < 120; i++) {
          want += G.U.dist(human.x, human.y, t.active.x, t.active.y) * DT;
          frame();
        }
        ok(near(mon(B).fieldT - t0, 2, 0.02), 'two seconds on the field: ' + (mon(B).fieldT - t0).toFixed(3));
        ok(near(mon(B).range - r0, want, 0.02), 'its range is distance x seconds as the screen shows it: ' + Math.round(mon(B).range - r0) + ' vs ' + Math.round(want));
        // dodges: one per dodge, however many frames it lasts
        human.dodgeT = 0.3;
        run(0.2);
        human.dodgeT = 0;
        frame();
        human.dodgeT = 0.3;
        frame();
        human.dodgeT = 0;
        frame();
        ok(mon(B).dodges === 2, 'two dodges of yours: ' + mon(B).dodges);
        // swaps and their tags. Staryu (Water) hits Charmander super effectively, not Bulbasaur (x0.5).
        run(3); // past the 2 s after her send-out
        Object.assign(bulba, { hp: 50, maxHp: 100 });
        youActive = 1;
        frame();
        ok(mon(B).swapsOut === 1 && mon(B).into.get(C4) === 1 && mon(C4).swapsIn === 1, 'your swap: Bulbasaur out, into Charmander');
        ok(Mem.TAGS.every((k) => mon(B).tags[k] === 0), 'at 50% HP, not at a disadvantage, no status, slot ready, 5 s after her send-out: no tag: ' + JSON.stringify(mon(B).tags));
        run(1);
        youActive = 0;
        frame();
        ok(mon(C4).tags.disadvantage === 1 && mon(C4).tags.low === 0, 'Charmander out against Staryu: the type disadvantage tag');
        run(1);
        Object.assign(bulba, { hp: 20, stMajor: { k: 'burn', t: 3 }, slots: [[{ t: 2 }]], active: 0 });
        youActive = 1;
        frame();
        ok(mon(B).tags.low === 1 && mon(B).tags.status === 1 && mon(B).tags.cooldown === 1, 'at 20%, burned, slot on cooldown: low, status and cooldown: ' + JSON.stringify(mon(B).tags));
        Object.assign(bulba, { hp: 100, stMajor: null, slots: [[{ t: 0 }]] });
        run(1);
        youActive = 0;
        frame();
        ai.requestSwap(1);
        frame();
        ok(t.active === s2, 'she sends in Seel');
        run(1);
        youActive = 1;
        frame();
        ok(mon(B).tags.sentIn === 1 && mon(B).tags.cooldown === 1, 'your swap 1 s after her mon arrived: the sentIn tag (and a ready slot adds no cooldown): ' + JSON.stringify(mon(B).tags));
        run(2.5);
        youActive = 0;
        frame();
        ok(mon(C4).tags.sentIn === 0, 'Charmander out 2.5 s later: no sentIn');
        const outs = mon(B).swapsOut;
        bulba.dead = true;
        youActive = 1;
        frame();
        ok(Mem.record(MISTY).team.afterFaint.get(C4) === 1 && mon(B).swapsOut === outs, 'a send-in after a faint counts as who you send in, not a swap');
        for (const k of ['hp', 'maxHp', 'stMajor', 'slots', 'active']) delete bulba[k];
        bulba.dead = false;
        G.GymArena.reset();
        reveal(bulba, 'sleep-powder');
        ok(!mon(B).moves.has('sleep-powder'), 'after the fight ends, a cast is not remembered');
      }

      // ---------------- 20. the lead sighting and when a pattern is believed ----------------
      {
        fresh4();
        const rec = () => Mem.record(MISTY);
        fight('Misty', 2, [[0, 4], [1, 6]]);
        ok(rec().fights === 1 && rec().team.leads.get(C4) === 1 && !rec().team.leads.has(B), 'Bulbasaur 4 s then Charmander 6 s: one lead sighting, Charmander (the most field time)');
        fight('Misty', 2, [[0, 5]]);
        ok(Mem.lead(rec(), 1) === null && Mem.lead(rec(), 2) === null, 'one each: a tie is no pattern');
        fight('Misty', 2, [[0, 5]]);
        ok(Mem.lead(rec(), 2) && Mem.lead(rec(), 2).key === B && Mem.lead(rec(), 3) === null, 'Bulbasaur 2, Charmander 1: believed at learnRate 2, not at 3');
        go3('Misty', 2);
        G.GymArena.reset();
        ok(rec().fights === 4 && Mem.lead(rec(), 2).n === 2, 'a fight with no field time is booked but adds no sighting');
        // Misty (2) and Brock (3) on real fights, with a cap that always acts so only learnRate decides
        const reads = (name, n) => {
          fresh4();
          const id = name === 'Misty' ? MISTY : BROCK,
            got = [];
          for (let i = 0; i < n; i++) {
            Mem.record(id).cap = new AI.Bag(10, 1);
            const { ai } = go3(name, 2);
            run(0.5);
            got.push(exploits(ai));
            G.GymArena.reset();
          }
          return got.join('');
        };
        ok(reads('Misty', 4) === '0011', 'Misty acts on your lead from her third fight (2 sightings): ' + reads('Misty', 4));
        ok(reads('Brock', 5) === '00011', 'Brock from his fourth (3 sightings): ' + reads('Brock', 5));
      }

      // ---------------- 21. the read: the counter of your usual lead, at once, with its line ----------------
      {
        // Misty loop 2: Staryu (Water Gun, Tackle) and Seel (Powder Snow, Water Gun). Against Bulbasaur (nothing revealed, guessed
        // Grass): Staryu 1 / 2 = 0.5, Seel 2 / 2 = 1.0, so Seel. Against Charmander (guessed Fire): both 3 / 0.5 = 6, a tie, so Staryu stays.
        const seeded = (key, n = 2, cap = 10) => {
          fresh4();
          const rec = Mem.record(MISTY);
          for (let i = 0; i < n; i++) Mem.bump(rec.team.leads, key);
          rec.cap = new AI.Bag(cap, 1);
          return rec;
        };
        seeded(B);
        let { t, ai, s2 } = go3('Misty', 2, { swaps: true, triggers: true });
        youActive = 1; // Charmander on the field: the read is of Bulbasaur, who it expects to see
        let at = until(1, () => t.active === s2);
        ok(at != null && at <= TICK, 'believed (Bulbasaur 2): Seel comes in on the first think tick, not after minField 8 s: ' + at);
        ok(ai.swaps === 1, 'it counts as a voluntary swap: ' + ai.swaps);
        ok(says.includes(MLINE), 'and she says so: ' + says.join(' | '));
        const note = ai.log.find((d) => d.act === 'exploit');
        ok(note && note.key === B && /Staryu 0\.50, Seel 1\.00/.test(note.text), 'the log names the read and the scores: ' + (note && note.text));
        run(10);
        ok(exploits(ai) === 1 && says.filter((x) => x === MLINE).length === 1, 'once a fight');
        const startAt = says.indexOf('Misty: Think you can keep your head above water?');
        ok(startAt > says.indexOf(MLINE), 'the read goes ahead of her start line, which still shows after it: ' + says.join(' | '));
        // already on the best matchup: no swap, the line still shows
        seeded(C4);
        ({ t, ai } = go3('Misty', 2, { swaps: true, triggers: true }));
        const s1c = t.active;
        run(1);
        ok(t.active === s1c && ai.swaps === 0 && says.includes(MLINE), 'expecting Charmander (a tie, 6 and 6): Staryu stays, and she still says her line');
        // not believed: no line, and the matchup swap waits out minField as before
        seeded(B, 1);
        ({ t, ai, s2 } = go3('Misty', 2, { swaps: true, triggers: true }));
        at = until(9, () => t.active === s2);
        ok(at != null && at >= 8 - 1e-9 && !says.includes(MLINE) && exploits(ai) === 0, 'one sighting: no read; Seel comes in at minField: ' + at);
        // the memory switch
        seeded(B);
        AI.off.memory = true;
        ({ t, ai } = go3('Misty', 2, { swaps: true, triggers: true }));
        run(1);
        AI.off.memory = false;
        ok(t.active === t.members[0] && !says.includes(MLINE), 'G.LeaderAI.off.memory: no read');
        // a lone mon (Misty loop 1, Staryu alone): the line, nothing to swap to
        seeded(B);
        let err = null;
        try {
          ({ t, ai } = go3('Misty', 1, { swaps: true, triggers: true }));
          run(1);
        } catch (x) {
          err = x;
        }
        ok(!err && t.members.length === 1 && says.includes(MLINE), 'loop 1, a lone Staryu: the line only: ' + (err ? err.stack : 'no error'));
      }

      // ---------------- 22. the prediction cap: 7 in every 10, run long ----------------
      {
        fresh4();
        const rec = Mem.record(MISTY);
        Mem.bump(rec.team.leads, B);
        Mem.bump(rec.team.leads, B);
        const got = [];
        for (let i = 0; i < 20; i++) {
          const { ai } = go3('Misty', 2);
          run(0.4);
          got.push(exploits(ai) ? 1 : holds(ai) ? 0 : '?');
          G.GymArena.reset();
        }
        const block = (k) => got.slice(k * 10, k * 10 + 10).reduce((a, b) => a + (b === 1 ? 1 : 0), 0);
        ok(!got.includes('?'), 'every fight with a believed pattern draws once: ' + got.join(''));
        ok(block(0) === 7 && block(1) === 7, 'exactly 7 acts in each block of 10 chances: ' + block(0) + ', ' + block(1));
        ok(rec.cap.blocks === 2, 'one bag for the run, refilled per block: ' + rec.cap.blocks);
        ok(got.includes(0) && got.slice(0, 10).indexOf(0) >= 0, 'so it can be baited: it holds back 3 times a block');
      }

      // ---------------- 23. stale reveals ----------------
      {
        fresh4();
        let r = go3('Misty', 2);
        reveal(bulba, 'vine-whip');
        run(1);
        G.GymArena.reset();
        // the next fight: remembered before any cast
        r = go3('Misty', 2);
        let info = G.GymArena.leaderInfo;
        ok(info.reveals(bulba).moves.join() === 'vine-whip' && info.reveals(charm).moves.length === 0, 'fight 2: Vine Whip still counts as revealed, before any cast');
        ok(r.ai.yourAttack(r.s1).id === 'vine-whip', 'and the matchup reads it, not the guess');
        youActive = 1;
        run(20);
        ok(info.reveals(bulba).moves.includes('vine-whip'), 'Bulbasaur off the field for 20 s: it still counts (its first 10 s on the field are not used)');
        youActive = 0;
        run(9.9);
        ok(info.reveals(bulba).moves.includes('vine-whip'), 'after 9.9 s on the field: still');
        run(0.2);
        ok(!info.reveals(bulba).moves.includes('vine-whip'), 'after 10 s on the field: no longer');
        reveal(bulba, 'vine-whip');
        ok(info.reveals(bulba).moves.includes('vine-whip') && Mem.record(MISTY).mons.get(B).moves.get('vine-whip') === 2, 'cast again: revealed, and confirmed in fight 2');
        G.GymArena.reset();
        // seen missing: a whole move set (4) cast without it
        go3('Misty', 2);
        info = G.GymArena.leaderInfo;
        for (const id of ['tackle', 'growl', 'razor-leaf']) reveal(bulba, id);
        ok(info.reveals(bulba).moves.includes('vine-whip'), 'three other moves cast: Vine Whip may still be the fourth');
        reveal(bulba, 'sleep-powder');
        ok(!info.reveals(bulba).moves.includes('vine-whip'), 'a fourth: the set is seen without it');
        G.GymArena.reset();
        go3('Misty', 2);
        ok(G.GymArena.leaderInfo.reveals(bulba).moves.includes('vine-whip'), 'the memory keeps it: stale again in the next fight');
        ok(G.GymArena.leaderInfo.reveals(charm).moves.length === 0, 'a mon that never cast has nothing remembered');
        G.GymArena.reset();
        Mem.end();
        go3('Misty', 2);
        ok(G.GymArena.leaderInfo.reveals(bulba).moves.length === 0, 'with no run store, nothing is remembered');
      }

      // ---------------- 24. a close fight with a read and everything on ----------------
      {
        fresh4();
        const rec = Mem.record(MISTY);
        Mem.bump(rec.team.leads, B);
        Mem.bump(rec.team.leads, B);
        rec.cap = new AI.Bag(10, 1);
        const { t, ai } = go3('Misty', 2, { swaps: true, dodges: true, confidence: true, pacing: true, triggers: true }, 160);
        const look = () => t.members.map((m) => [m.maxHp, m.cdMul, m.gym.tempo, m.gym.power, m.gym.level].join()).join('|');
        const before = look();
        let err = null;
        for (let i = 0; i < 30 * 60 && !err; i++) {
          try {
            frame();
          } catch (x) {
            err = x;
          }
        }
        ok(!err, 'a 30 s close fight with a read runs: ' + (err ? err.stack : 'no error'));
        ok(exploits(ai) === 1, 'with its one read');
        ok(look() === before, 'no HP, cooldown, tempo, power or level was changed (NO RUBBER BANDING)');
        G.GymArena.reset();
        Mem.end();
      }
    }
    Object.assign(human, { hp: 1e6, maxHp: 1e6 });
    bannerUp = false;
    Object.assign(AI.off, { confidence: false, pacing: false, triggers: false });
  }
  set(true, true);
}

// ---------------- 12. #40: the leader's frame takes your shape (decision 2026-11-09-every-player-entity-runs-one-flow-decide-hands-body-sim) ----------------
// The AI decides, the controller carries it, the body follows it under its rules, the sim pass resolves. Expected values are
// hand-derived from the rulings: a stun blocks movement, dodge and a new wind-up only; timers, heal over time and commitments keep
// running (2026-11-09-a-stunned-leader-keeps-its-timers-running-like-you); slot presses land as yours do (your setActive has no stun
// rule); a stun mid wind-up cancels it with the move still ready and its freshness restored; the first-attack wait is the authored
// `firstWait`, 0 when absent (2026-11-09-leader-first-attack-wait-defaults-to-0).
{
  const AI = G.LeaderAI,
    was = Object.assign({}, AI.off);
  Object.assign(AI.off, { swaps: true, dodges: true, confidence: true, pacing: true, triggers: true });
  const sleep = (m, t = 10) => (m.stMajor = { k: 'sleep', t, age: 0 });
  const wake = (m) => (m.stMajor = null);
  const casts = [];
  const offCast = G.SimBus.on('move:cast', (ev) => casts.push({ f: frameNo, id: ev.moveId, owner: ev.ownerId }));
  // a self cast with a timed commitment (a cooldown freeze naming no slot, so no timer is held) and a heal over time
  const HOLD = {
    id: 'la40-hold',
    cd: 1,
    type: 'normal',
    category: 'status',
    delivery: { anchor: 'self', targeting: 'self' },
    casterState: { commitment: { cooldown: { type: 'freeze', id: 'la40-none', t: 3 } } },
    payload: [{ t: 'heal', amount: { fraction: 0.02, of: 'maxHP' }, per: 0.5, duration: 4, side: 'self' }],
  };
  try {
    // 12a. timers, heal over time and commitments advance during a stun, exactly as a stunned owner on your sim path
    {
      const a = open('Misty', 2, 160),
        e = a.team.active;
      run(1);
      // your side: a plain sim owner (no castDue, as you are) with the same slots, asleep for the same frames
      const twin = { id: 'la40-twin', x: e.x, y: e.y, r: 10, dead: false, hp: e.maxHp * 0.5, maxHp: e.maxHp, cdMul: e.cdMul, aim: 0, active: e.active };
      twin.slots = e.slots.map((g) => g.map((s) => ({ id: s.id, t: s.t, hpBelow: s.hpBelow })));
      twin.activeGroup = () => twin.slots[twin.active];
      twin.heal = (h) => (twin.hp = Math.min(twin.maxHp, twin.hp + h));
      for (const o of [e, twin]) {
        G.MoveSim.castAt(o, { id: HOLD.id, t: 0 }, HOLD, G.Gym.now(), 0);
        for (const s of o.slots.flat()) s.t = 5;
        sleep(o);
      }
      e.hp = e.maxHp * 0.5;
      e.regen = 0;
      e.bellHeal = 0;
      const t0 = e.slots.flat().map((s) => s.t),
        w0 = twin.slots.flat().map((s) => s.t),
        c0 = G.MoveSim.commits(e).find((c) => c.moveId === HOLD.id),
        tc0 = G.MoveSim.commits(twin).find((c) => c.moveId === HOLD.id),
        hp0 = e.hp,
        th0 = twin.hp,
        x0 = e.x,
        y0 = e.y;
      ok(c0 && tc0 && near(c0.left, 3) && near(tc0.left, 3), '12a: both carry the 3 s commitment');
      let still = true,
        tellSeen = false;
      for (let i = 0; i < 60; i++) {
        frame();
        G.MoveSim.turn(DT, twin, G.Gym.now());
        still = still && G.Status.stunned(e);
        tellSeen = tellSeen || !!e.tell;
      }
      ok(still, '12a: she stays asleep for the whole second');
      const t1 = e.slots.flat().map((s) => s.t),
        w1 = twin.slots.flat().map((s) => s.t);
      ok(t1.every((t, i) => near(t0[i] - t, 1, 1e-6)), '12a: every slot timer of hers ran 1 s while asleep: ' + t0.map((t, i) => (t - t1[i]).toFixed(4)).join());
      ok(w1.every((t, i) => near(w0[i] - t, 1, 1e-6)), '12a: and so did yours: ' + w0.map((t, i) => (t - w1[i]).toFixed(4)).join());
      const c1 = G.MoveSim.commits(e).find((c) => c.moveId === HOLD.id),
        tc1 = G.MoveSim.commits(twin).find((c) => c.moveId === HOLD.id);
      ok(c1 && tc1 && near(c1.left, 2, 1e-6) && near(tc1.left, 2, 1e-6), '12a: the commitment ran 1 s on both: ' + (c1 && c1.left) + ' vs ' + (tc1 && tc1.left));
      ok(near(e.hp - hp0, 2 * 0.02 * e.maxHp, 1e-6), '12a: her heal over time ticked twice (0.5 s apart): ' + ((e.hp - hp0) / e.maxHp).toFixed(4));
      ok(near(twin.hp - th0, e.hp - hp0, 1e-6), '12a: the same as yours');
      // 12b. the body refuses what a stun blocks: no movement and no new wind-up
      ok(e.x === x0 && e.y === y0, '12b: asleep, she does not move');
      ok(!tellSeen, '12b: asleep, no wind-up starts (her moves were ready again before the end, you in reach)');
      G.MoveSim.clear(twin);
    }
    // 12c. a slot press during a stun lands under your rules (your slot keys work while you are asleep)
    {
      const a = open('Misty', 2, 160),
        e = a.team.active;
      run(1);
      sleep(e);
      e.swapT = 0;
      const j = e.slots.findIndex((g, k) => k !== e.active && !e.skillAt(k));
      ok(j >= 0, '12c: she has another slot to press');
      e.ai.pressSlot(e, j, true);
      frame();
      ok(e.active === j, '12c: asleep, her slot press lands: ' + e.active + ' vs ' + j);
      e.ai.pressSlot(e, e.active === 0 ? 1 : 0, true);
      frame();
      ok(e.active === j, '12c: and your 0.4 s slot hold refuses the next one, as yours');
    }
    // 12d. a stun mid wind-up cancels it: no fire, the move stays ready, its freshness restored; after waking she casts normally
    {
      const a = open('Misty', 2, 160),
        e = a.team.active;
      let c = null,
        lasts = new Map();
      for (let i = 0; i < 20 * 60 && !c; i++) {
        lasts = new Map(e.slots.flat().map((s) => [s, s.last]));
        frame();
        const t = e.tell;
        if (t && !t.fired && t.wind > 3 * DT) c = t;
      }
      ok(c, '12d: a wind-up starts');
      if (c) {
        const marked = [c.slot].concat((c.bond || []).map((b) => b.s));
        sleep(e, 1);
        const f0 = frameNo;
        frame();
        ok(e.tell == null, '12d: the stun cancels the wind-up');
        // ready: its cooldown is not spent; asleep, the Body refuses it and it waits your 0.05 s retry, as yours (#47a)
        ok(c.slot.t <= G.MoveSim.RETRY + 1e-9, '12d: the move stays ready (at most your retry wait): ' + c.slot.t);
        ok(marked.every((s) => s.last === lasts.get(s)), '12d: its freshness is restored (a cancelled attack is not a cast)');
        run(0.9);
        ok(!casts.some((k) => k.f > f0 && k.id === c.id && k.owner === e.id), '12d: it never fires while she sleeps');
        wake(e);
        const f1 = frameNo;
        let fired = false;
        for (let i = 0; i < 6 * 60 && !fired; i++) {
          frame();
          fired = casts.some((k) => k.f > f1 && k.owner === e.id);
        }
        ok(fired, '12d: after waking she casts normally');
      }
    }
    // 12e. a stun during the recovery leaves the recovery alone: it ends on time
    {
      const a = open('Misty', 2, 160),
        e = a.team.active;
      let c = null;
      for (let i = 0; i < 20 * 60 && !c; i++) {
        frame();
        const t = e.tell;
        if (t && t.fired && t.wind + t.after - t.t > 6 * DT) c = t;
      }
      ok(c, '12e: a tell fires and its recovery runs');
      if (c) {
        const left = Math.round((c.wind + c.after - c.t) / DT);
        sleep(e);
        for (let i = 0; i < left - 2; i++) frame();
        ok(e.tell === c, '12e: asleep, the recovery is still running ' + (left - 2) + ' frames on');
        frame();
        frame();
        frame();
        ok(e.tell !== c, '12e: and it ends on time while she sleeps');
      }
    }
    // 12f. the first-attack wait: 0 when absent (you attack the moment the fight starts), else the authored firstWait
    {
      const firstTell = (name) => {
        const a = open(name, 2, 60),
          e = a.team.active;
        for (let i = 0; i < 8 * 60; i++) {
          frame();
          if (e.tell) return e.ai.clock;
        }
        return null;
      };
      for (const name of ['Misty', 'Brock']) {
        const g = K[gymIdx(name)];
        ok(!g.restrictions || g.restrictions.firstWait == null, '12f: ' + name + ' authors no firstWait');
        const at = firstTell(name);
        ok(at != null && at <= 2 * DT + 1e-9, '12f: ' + name + ' with none: the first wind-up starts at once: ' + at);
      }
      const g = K[gymIdx('Misty')],
        old = g.restrictions;
      g.restrictions = Object.assign({}, old, { firstWait: 1 });
      try {
        const at = firstTell('Misty');
        ok(at != null && at >= 1 - 1e-9 && at <= 1 + 2 * DT + 1e-9, '12f: an authored firstWait 1 s is honored: ' + at);
      } finally {
        g.restrictions = old;
      }
      const errs = (r) => G.Gyms.validate(Object.assign({}, g, { restrictions: Object.assign({}, old, r) }));
      ok(errs({ firstWait: 1.5 }).length === 0 && errs({ firstWait: 0 }).length === 0, '12f: the validator accepts firstWait 0 or more');
      ok(errs({ firstWait: -1 }).some((x) => /firstWait/.test(x)) && errs({ firstWait: 'soon' }).some((x) => /firstWait/.test(x)), '12f: and rejects a negative or non-number one');
    }
    // 12g. the shape: steering runs no sim pass and presses no slot directly, and the AI has no stun gate
    {
      const src = fs
        .readFileSync(process.env.LA_AI || path.join(R, 'js/entities/leader-ai.js'), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, ''); // the code only, not its comments
      ok(!/MoveSim\.turn|\.prepare\(/.test(src), '12g: the AI never runs the sim pass');
      ok(!/takeSlotInput/.test(src), '12g: the AI never makes the body read its keys (the body does, as yours)');
      ok(!/stunned\(e\)\s*\?\s*\[0,\s*0\]/.test(src), '12g: the AI has no stun gate on its heading');
    }
  } finally {
    offCast();
    Object.assign(AI.off, was);
    G.GymArena.reset();
  }
}

// ---------------- 13. #41: each role does only its own job (decisions 2026-11-09-four-roles-decider-controller-body-sim-pass, ----------------
// 2026-11-09-the-leader-ai-chooses-its-attacks, 2026-11-09-41-the-caster-splits-into-body-and-sim-pass). Expected values are
// hand-derived from the rulings, never from code output: the Decider chooses (slots, the heal score), the Body holds the state and
// accepts or refuses (stun, flinch hold, firstWait), the SimPass resolves (the wind-up, every cast); there is no Caster.
{
  const AI = G.LeaderAI,
    was = Object.assign({}, AI.off);
  Object.assign(AI.off, { swaps: true, dodges: true, confidence: true, pacing: true, triggers: true });
  const code = (env, file) =>
    fs
      .readFileSync(process.env[env] || path.join(R, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
  const defOf = (e, id) => e.moveDef(id);
  const tellNow = (e) => e.tell;
  const healsOf = (e) => e.healsLeft;
  const accepts = (e) => (typeof e.acceptsAttack === 'function' ? e.acceptsAttack() : null);
  const casts = [];
  const offCast = G.SimBus.on('move:cast', (ev) => casts.push({ f: frameNo, id: ev.moveId, owner: ev.ownerId }));
  try {
    // 13a. the shape: the Caster is gone; the Body has its acceptance check, the leader's SimPass its own module
    {
      const a = open('Misty', 2, 160),
        e = a.team.active;
      ok(G.GymLeader.Caster === undefined && e.caster === undefined, '13a: there is no Caster');
      ok(G.GymLeader.SimPass && typeof G.GymLeader.SimPass.frame === 'function', "13a: the leader's SimPass is its own module");
      ok(typeof e.acceptsAttack === 'function', '13a: the Body has an acceptance check for an attack');
      const leader = code('LA_LEADER', 'js/entities/gym-leader.js');
      ok(!/POINT_BLANK|OPP_HEX|OPP_DROP|OPP_BLOCKED/.test(leader), '13a: no attack scoring is left on the Body or the SimPass');
      ok(/POINT_BLANK/.test(code('LA_AI', 'js/entities/leader-ai.js')), '13a: the scoring lives in the Decider');
    }
    // 13b. item 8: the old brain's fields are gone from the Body
    {
      const a = open('Brock', 1, 160),
        e = a.team.active;
      ok(e.atkBase === undefined && e.spaBase === undefined && e.atkFactor0 === undefined, '13b: no atkBase, spaBase or atkFactor0 on a leader');
    }
    // 13c. item 16: the Decider keeps its tell and commitment gate while stunned (no stun check of its own): a think tick that lands
    // while she is asleep inside a commitment waits for the first frame out of it, exactly as it would awake
    {
      const a = open('Misty', 2, 160),
        e = a.team.active;
      run(0.5);
      const HOLD = { id: 'la41-hold', cd: 1, type: 'normal', category: 'status', delivery: { anchor: 'self', targeting: 'self' }, casterState: { commitment: { cooldown: { type: 'freeze', id: 'la41-none', t: 2 } } }, payload: [] };
      G.MoveSim.castAt(e, { id: HOLD.id, t: 0 }, HOLD, G.Gym.now(), 0);
      e.stMajor = { k: 'sleep', t: 10, age: 0 };
      run(0.5); // two think ticks (0.25 s) pass inside the commitment
      ok(G.MoveSim.commits(e).length > 0 && G.Status.stunned(e), '13c: asleep inside the commitment');
      ok(e.ai.due === true, '13c: the tick waits (it is not spent while she is asleep in a commitment)');
      e.stMajor = null;
      G.MoveSim.clear(e);
    }
    // 13d. item 17 and the stun: the Body accepts an attack only with the first wait over, awake and with no flinch hold
    {
      const g = K[gymIdx('Misty')],
        old = g.restrictions;
      g.restrictions = Object.assign({}, old, { firstWait: 1 });
      try {
        const a = open('Misty', 2, 60),
          e = a.team.active;
        run(0.5);
        ok(accepts(e) === false, '13d: with firstWait 1 s the Body refuses an attack at 0.5 s');
        ok(!tellNow(e), '13d: and no wind-up has started');
        run(0.6);
        ok(accepts(e) === true || !!tellNow(e), '13d: past 1 s it accepts');
        e.tell = null;
        e.stMajor = { k: 'sleep', t: 10, age: 0 };
        ok(accepts(e) === false, '13d: asleep, it refuses');
        e.stMajor = null;
        e.stFl = 0.2;
        ok(accepts(e) === false, '13d: in a flinch hold, it refuses');
        e.stFl = 0;
      } finally {
        g.restrictions = old;
      }
    }
    // 13e. item 10: an attack starts only through your sim's due handoff: not while its timer runs, and on the frame it comes due
    {
      const a = open('Misty', 2, 60),
        e = a.team.active;
      run(0.1);
      e.tell = null;
      e.swapT = 5; // the slot hold keeps the active slot (no slot press lands)
      const act = e.slots[e.active].filter((s) => G.Gyms.formOf(defOf(e, s.id)) !== 'buff' && G.Gyms.formOf(defOf(e, s.id)) !== 'heal');
      ok(act.length > 0, '13e: the active slot holds an attack');
      for (const s of e.slots.flat()) s.t = 0.5;
      let started = null;
      for (let i = 0; i < 60 && !started; i++) {
        frame();
        const t = tellNow(e);
        if (t) started = { f: i + 1, slot: t.slot };
      }
      ok(started && act.includes(started.slot), '13e: the wind-up is for the active slot: ' + (started && started.slot.id));
      ok(started && started.f >= 29 && started.f <= 31, '13e: it starts on the frame the 0.5 s timer comes due (frame 30): ' + (started && started.f));
    }
    // 13f. item 5: a status-category hit on a leader takes your rule (no wild divisor of 50); the authored wildStatusDivisor brings it back
    {
      const SYN = { id: 'la41-status-hit', name: 'la41', type: 'normal', category: 'status', basePower: 40, power: null, hitPolicy: 'oncePerInstance', payload: [{ t: 'damage' }], delivery: { anchor: 'self', targeting: 'self' } };
      const hitOn = (e, owner) => {
        let blow = null;
        const take = e.takeHit;
        e.takeHit = (b) => ((blow = b), take.call(e, b));
        const hp0 = e.hp;
        G.MoveEffects.applyHit({ spec: SYN, cast: { owner, time: 0 }, age: 0 }, e, 0, () => 0.99);
        e.takeHit = take;
        return { blow, lost: hp0 - e.hp };
      };
      const g = K[gymIdx('Misty')],
        old = g.restrictions;
      const a = open('Misty', 2, 160),
        e = a.team.active,
        owner = a.team.members.find((m) => m !== e);
      e.invuln = 0;
      const mine = hitOn(e, owner);
      ok(mine.blow && mine.blow.neutral === false, '13f: with none authored, the hit takes your rule (no neutral divisor)');
      e.hp = e.maxHp;
      e.invuln = 0;
      Object.defineProperty(e, 'isRival', { value: false, configurable: true });
      const yours = hitOn(e, owner);
      delete e.isRival;
      ok(near(mine.lost, yours.lost, 1e-9), '13f: it deals what the same hit deals on you: ' + mine.lost.toFixed(3) + ' vs ' + yours.lost.toFixed(3));
      g.restrictions = Object.assign({}, old, { wildStatusDivisor: true });
      const live = e.gym.restrictions;
      e.gym.restrictions = g.restrictions; // the leader was built before the edit: hand it the authored set
      try {
        e.hp = e.maxHp;
        e.invuln = 0;
        const wild = hitOn(e, owner);
        ok(wild.blow && wild.blow.neutral === true, '13f: wildStatusDivisor true divides by the neutral 50 again');
        const errs = (r) => G.Gyms.validate(Object.assign({}, g, { restrictions: Object.assign({}, old, r) }));
        ok(errs({ wildStatusDivisor: true }).length === 0 && errs({ wildStatusDivisor: false }).length === 0, '13f: the validator accepts true or false');
        ok(errs({ wildStatusDivisor: 1 }).some((x) => /wildStatusDivisor/.test(x)), '13f: and rejects anything else');
      } finally {
        g.restrictions = old;
        e.gym.restrictions = live;
      }
    }
    // 13g. item 6: a self heal is the Decider's choice. The SimPass casts a due heal whenever the Body accepts it, as yours (full HP
    // too); the Decider scores a heal slot low while unhurt, so with another slot to press it moves off it
    {
      const healSlot = (e) => e.slots.findIndex((g) => g.some((s) => G.Gyms.formOf(defOf(e, s.id)) === 'heal'));
      const a = open('Misty', 1, 5000),
        e = a.team.active,
        h = healSlot(e);
      ok(h >= 0, '13g: Misty loop 1 carries a self heal');
      if (h >= 0) {
        const hs = e.slots[h].find((s) => G.Gyms.formOf(defOf(e, s.id)) === 'heal');
        hs.hpBelow = undefined; // open at any HP for this check (her Recover is authored below 35%)
        e.active = h;
        e.hp = e.maxHp;
        e.swapT = 5; // the slot hold keeps her on it
        hs.t = 0;
        const left = healsOf(e),
          f0 = frameNo;
        frame();
        ok(casts.some((c) => c.f > f0 && c.id === hs.id && c.owner === e.id), '13g: at full HP a due heal on the active slot casts, as yours');
        ok(healsOf(e) === left - 1, '13g: and spends one heal: ' + left + ' -> ' + healsOf(e));
      }
      const b = open('Misty', 1, 5000),
        f = b.team.active,
        k = healSlot(f);
      if (k >= 0) {
        const hs = f.slots[k].find((s) => G.Gyms.formOf(defOf(f, s.id)) === 'heal');
        hs.hpBelow = undefined;
        f.active = k;
        f.hp = f.maxHp;
        f.swapT = 0;
        hs.t = 0;
        // no other pull: every other move is recharging and every buff is closed, so only the heal's low score moves her off it
        for (const g of f.slots)
          for (const s of g) {
            if (s === hs) continue;
            if (G.Gyms.formOf(defOf(f, s.id)) === 'buff') s.hpBelow = 0;
            else s.t = 5;
          }
        const left = healsOf(f),
          f0 = frameNo;
        frame();
        ok(f.active !== k, '13g: unhurt, with only recharging slots to press, the Decider still moves off the heal slot: ' + f.active);
        ok(!casts.some((c) => c.f > f0 && c.id === hs.id) && healsOf(f) === left, '13g: and no heal is spent');
      }
    }
    // 13h. item 7: the edge unstick is the Decider's (its answer is the heading); the Body has none
    {
      const leader = code('LA_LEADER', 'js/entities/gym-leader.js');
      ok(!/noteStuck|unstick|UNSTICK|probeSide/.test(leader), '13h: no edge unstick on the Body');
      ok(G.LeaderAI.UNSTICK && typeof G.LeaderAI.prototype.unstick === 'function', '13h: the Decider holds it');
    }
  } finally {
    offCast();
    Object.assign(AI.off, was);
    G.GymArena.reset();
  }
}

// ---------------- 14. #50 (#49 slice 1): Belief, the Decider's only door (docs/LEADER-AI.md BELIEF, COOLDOWN WINDOW) ----------------
// Written at the slice's start. Expected values are hand-derived from the spec and decision
// 2026-11-09-50-cooldown-window-memoryuse-and-baseline (memoryUse 0.5 baseline, start width 1.8 s, min width 0.2 s), never from code
// output. Gaps and readiness run on your mon's field time (the live bench rule: a benched mon's cooldowns wait).
{
  const AI = G.LeaderAI,
    B = G.LeaderBelief,
    Mem = G.LeaderMemory,
    was = Object.assign({}, AI.off),
    realDefs = G.MoveDefs;
  Object.assign(AI.off, { swaps: true, dodges: true, confidence: true, pacing: true, triggers: true, memory: true });
  const cast = (m, moveId) => G.SimBus.emit('move:cast', { moveId, ownerId: null, ownerUid: m.copyUid, ownerSlot: m.teamSlot, rival: false, x: 0, y: 0, aim: 0, enemy: false });
  const switched = (m) => G.SimBus.emit('slot:switch', { ownerUid: m.copyUid, ownerSlot: m.teamSlot, rival: false, slot: 1 });
  const win = (w, lo, hi) => !!w && near(w.lo, lo, 1e-9) && near(w.hi, hi, 1e-9);
  const show = (w) => (w ? w.lo.toFixed(4) + ' to ' + w.hi.toFixed(4) : 'null');
  const bulba = you[0];
  try {
    // 14a. the baselines
    ok(B && B.TUNE.startWidth === 1.8 && B.TUNE.minWidth === 0.2 && AI.BASE.memoryUse === 0.5, '14a: start width 1.8 s, min width 0.2 s, memoryUse 0.5');
    // 14b. the worked examples (the rule alone)
    ok(win(B.opened(1.1), 0.2, 2.0), '14b: a reveal of a 1.1 s move opens 0.2 to 2.0: ' + show(B.opened(1.1)));
    ok(win(B.learn({ lo: 0.2, hi: 2.0 }, 1.2, 0.5), 0.7, 1.6), '14b: clean gap 1.2, memoryUse 0.5: 0.7 to 1.6: ' + show(B.learn({ lo: 0.2, hi: 2.0 }, 1.2, 0.5)));
    ok(win(B.learn({ lo: 0.2, hi: 2.0 }, 1.2, 0.8), 1.0, 1.36), '14b: memoryUse 0.8 learns faster: 1.0 to 1.36: ' + show(B.learn({ lo: 0.2, hi: 2.0 }, 1.2, 0.8)));
    // 14c. a gap outside: stretch by the overshoot (1.8 x 0.5 = 0.9), then narrow
    ok(win(B.learn({ lo: 0.2, hi: 2.0 }, 3.0, 0.5), 1.6, 3.45), '14c: slower, gap 3.0: stretch to 3.9, narrow to 1.6 to 3.45: ' + show(B.learn({ lo: 0.2, hi: 2.0 }, 3.0, 0.5)));
    ok(win(B.learn({ lo: 0.7, hi: 1.6 }, 0.6, 0.5), 0.15, 1.1), '14c: faster, 0.7 to 1.6, gap 0.6: stretch to -0.3, narrow to 0.15 to 1.1: ' + show(B.learn({ lo: 0.7, hi: 1.6 }, 0.6, 0.5)));
    // 14d. the minimum width: never under 0.2, the gap kept inside
    {
      let w = { lo: 0.2, hi: 2.0 },
        good = true;
      for (let i = 0; i < 12; i++) {
        w = B.learn(w, 1.2, 0.5);
        if (w.hi - w.lo < 0.2 - 1e-9 || w.lo > 1.2 || w.hi < 1.2) good = false;
      }
      ok(good && near(w.hi - w.lo, 0.2, 1e-9), '14d: 12 clean gaps of 1.2: the width stops at 0.2 with 1.2 inside: ' + show(w));
    }
    // 14e. readiness on 0.7 to 1.6
    const W = { lo: 0.7, hi: 1.6 };
    ok(B.readinessIn(W, 0.5) === 0 && near(B.readinessIn(W, 1.15), 0.5) && B.readinessIn(W, 2.0) === 1, '14e: readiness 0 at 0.5 s, 0.5 at 1.15 s, 1 at 2.0 s');
    ok(B.readinessIn(W, null) === 1, '14e: a move with no cast seen this fight is believed ready');

    // a fight: vine-whip's base cooldown is 1.1 s for these checks (test only)
    G.MoveDefs = Object.assign({}, realDefs, { 'vine-whip': Object.assign({}, realDefs['vine-whip'], { cd: 1.1 }) });
    const fight = () => {
      const a = open('Misty', 2);
      return { a, b: G.GymArena.leaderBelief, info: G.GymArena.leaderInfo, e: a.team.active };
    };
    // 14f. the arena holds one Belief over its Info; an unrevealed move has no window and is ready
    let { b, info, e } = fight();
    ok(b && b.info === info && B.current === b, '14f: the arena makes a Belief over its Info');
    ok(b.window(bulba, 'vine-whip') === null && b.readiness(bulba, 'vine-whip') === 1, '14f: an unrevealed move has no window and is believed ready');
    cast(bulba, 'vine-whip');
    ok(win(b.window(bulba, 'vine-whip'), 0.2, 2.0), '14f: its first cast opens 0.2 to 2.0: ' + show(b.window(bulba, 'vine-whip')));
    ok(b.readiness(bulba, 'vine-whip') === 0, '14f: right after the cast it is believed not ready');
    run(1.2);
    cast(bulba, 'vine-whip');
    ok(win(b.window(bulba, 'vine-whip'), 0.7, 1.6), '14f: a clean field-time gap of 1.2 narrows it to 0.7 to 1.6: ' + show(b.window(bulba, 'vine-whip')));
    run(1.15);
    ok(near(b.readiness(bulba, 'vine-whip'), 0.5, 1e-6), '14f: 1.15 s later it is half ready: ' + b.readiness(bulba, 'vine-whip'));
    // 14g. a slot switch between two casts spoils the gap, but not the time of the last cast (your cooldowns run on every slot):
    // 1.2 s after the cast on 0.2 to 2.0, readiness (1.2 - 0.2) / 1.8 = 5 / 9
    ({ b, info, e } = fight());
    cast(bulba, 'vine-whip');
    run(0.6);
    switched(bulba);
    run(0.6);
    ok(near(info.sinceCast(bulba, 'vine-whip'), 1.2, 1e-6) && near(b.readiness(bulba, 'vine-whip'), 5 / 9, 1e-6), '14g: after a switch the last cast still counts: 1.2 s since it, readiness 5/9: ' + b.readiness(bulba, 'vine-whip'));
    cast(bulba, 'vine-whip');
    ok(win(b.window(bulba, 'vine-whip'), 0.2, 2.0) && info.gapsOf(bulba, 'vine-whip').length === 0, '14g: a switch between the casts: no gap, the window stays 0.2 to 2.0: ' + show(b.window(bulba, 'vine-whip')));
    ok(b.readiness(bulba, 'vine-whip') === 0, '14g: and the cast after the switch restarts its clock');
    // 14h. the bench: field time only, so a benched mon's clock waits
    ({ b, info, e } = fight());
    cast(bulba, 'vine-whip');
    run(0.3);
    youActive = 1;
    run(5);
    youActive = 0;
    ok(near(info.sinceCast(bulba, 'vine-whip'), 0.3, 1e-6), '14h: 0.3 s on the field, 5 s benched: 0.3 s since the cast: ' + info.sinceCast(bulba, 'vine-whip'));
    run(0.9);
    cast(bulba, 'vine-whip');
    ok(win(b.window(bulba, 'vine-whip'), 0.7, 1.6), '14h: the gap across the bench stint is 1.2 field seconds: 0.7 to 1.6: ' + show(b.window(bulba, 'vine-whip')));
    // 14i. run memory: fight 2 opens with fight 1's learned window
    Mem.start();
    try {
      ({ b, info, e } = fight());
      cast(bulba, 'vine-whip');
      run(1.2);
      cast(bulba, 'vine-whip');
      ({ b, info, e } = fight());
      ok(info.fight === 2, '14i: the second fight of the run');
      ok(win(b.window(bulba, 'vine-whip'), 0.7, 1.6), '14i: it opens with the learned 0.7 to 1.6 (the reveal is remembered): ' + show(b.window(bulba, 'vine-whip')));
      ok(b.readiness(bulba, 'vine-whip') === 1, '14i: not cast yet this fight: believed ready');
      G.GymArena.leaderAI.set.memoryUse = 0.8;
      frame();
      ok(win(b.window(bulba, 'vine-whip'), 1.0, 1.36), '14i: the window is derived from the kept gaps, so the Decider setting memoryUse 0.8 reads them as 1.0 to 1.36: ' + show(b.window(bulba, 'vine-whip')));
    } finally {
      Mem.end();
    }
    // 14j. the long window is 10 s
    ({ b, info, e } = fight());
    info.hit('dealt', 0.1);
    run(9.9);
    ok(near(b.windows().dealtLong, 0.1), '14j: a hit is in the long window at 9.9 s: ' + b.windows().dealtLong);
    run(0.2);
    ok(b.windows().dealtLong === 0, '14j: and out of it at 10.1 s: ' + b.windows().dealtLong);
    // 14k. danger and opportunity. The visible hit, hand-derived: Bulbasaur (49 Atk) level 20 on Staryu (55 Def, 30 HP) level 12, a
    // 45-power physical move, STAB 1.5, scale 1: Atk 24, factor (10 x 45 x 24) / 50 = 216, Def 18, (216 / 18 + 2) x 1.5 = 21;
    // HP round((7 + 12 + 10) x 2) = 58. Neutral 21 / 58, a 2x type 42 / 58.
    const bul = G.DEX_BY[1].stats,
      sta = G.DEX_BY[120].stats;
    ok(near(G.Stats.visibleHitFrac(bul, 20, sta, 12, 45, 'physical', 1.5, 1, 1), 21 / 58, 1e-9), '14k: the visible hit, neutral: 21 / 58');
    ok(near(G.Stats.visibleHitFrac(bul, 20, sta, 12, 45, 'physical', 1.5, 2, 1), 42 / 58, 1e-9), '14k: a 2x type doubles it: 42 / 58');
    ok(G.Stats.visibleHitFrac(bul, 20, sta, 12, 45, 'physical', 1.5, 0, 1) === 0, '14k: an immune hit is 0');
    ({ b, info, e } = fight());
    cast(bulba, 'vine-whip');
    ok(b.danger(e, bulba) === 0, '14k: danger is 0 right after your cast (readiness 0)');
    run(2.1);
    const full = b.danger(e, bulba);
    ok(full > 0 && b.readiness(bulba, 'vine-whip') === 1, '14k: and full once past the window: ' + full.toFixed(4));
    for (const g of e.slots) for (const s of g) s.t = 5;
    ok(b.opportunity(e, bulba) === 0, '14k: opportunity is 0 while every one of her moves recharges (her exact timers)');
    const dmgSlot = e.slots.flat().find((s) => (e.moveDef(s.id).basePower || 0) > 0);
    dmgSlot.t = 0;
    ok(b.opportunity(e, bulba) > 0, '14k: and above 0 once a damaging move is ready: ' + b.opportunity(e, bulba).toFixed(4));
    // 14l. the Decider reads Belief, never Info
    const ai = fs
      .readFileSync(process.env.LA_AI || path.join(R, 'js/entities/leader-ai.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    ok(!/G\.LeaderInfo/.test(ai) && /G\.LeaderBelief\.current/.test(ai), '14l: the Decider has no G.LeaderInfo read; it reads G.LeaderBelief');
  } finally {
    G.MoveDefs = realDefs;
    Object.assign(AI.off, was);
    youActive = 0;
    G.GymArena.reset();
  }
}

console.log(fail ? 'leader-ai-harness: ' + fail + ' of ' + n + ' FAILED' : 'leader-ai-harness: all ' + n + ' passed');
process.exit(fail ? 1 : 0);
