// Leader AI slice 1 (#22): the controls layer and the information model (Node only). Usage from the repo root:
//   node docs/proposals/leader-ai-harness.js             run every check
// Spec: docs/LEADER-AI.md ("The AI player", "What it can see", "Build order" 1). Written at the slice's start as its end-goal test
// (docs/branch-rules/feature-gym-leader-ai.md "Slice shape"). Loads the real engine as leader-team-harness.js does, then:
//   1 parity: retired in #51 (history); section 15's determinism duel replaces it
//   2 controls: every call of a leader's controller comes from the one AI player of its team; a slot change arrives only through slots()
//   3 a forced swap request runs your rules end to end (lock, trap, Fly, i-frames, the bench, the enemy list, the line, no kick or sound)
//   4 the information model: both rosters, move reveals only after a cast, bond reveals by the no-switch rule (Jess 2026-11-08), keys
// Expected values come from the spec and COMBAT-RULES (5 s swap lock, 0.5 s i-frames, 1.3 s send-out beat), never from the code.
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const R = path.resolve(__dirname, '..', '..');
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
const FILES = ['js/core/stats.js', 'js/data/pokedex.js', 'js/data/types.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/elite.js', 'js/entities/player.js', 'js/entities/player-sim-pass.js', 'js/entities/gym-leader.js', 'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/data/moves.js', 'js/systems/team-cards.js', 'js/systems/team.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js', 'js/data/gyms.js', 'js/entities/boss-ai.js', 'js/systems/leader-memory.js', 'js/systems/leader-info.js', 'js/systems/leader-belief.js', 'js/systems/leader-planner.js', 'js/entities/leader-ai.js', 'js/systems/combat.js', 'js/systems/gym.js', 'js/systems/gym-arena.js'];
const NEW = ['js/systems/leader-info.js', 'js/entities/leader-ai.js'];
// leader-ai-mutate.js points one of these at a broken copy
const OVERRIDE = { 'js/entities/leader-ai.js': 'LA_AI', 'js/systems/leader-memory.js': 'LA_MEM', 'js/systems/leader-info.js': 'LA_INFO', 'js/systems/leader-belief.js': 'LA_BELIEF', 'js/systems/leader-planner.js': 'LA_PLANNER', 'js/systems/gym-arena.js': 'LA_ARENA', 'js/entities/gym-leader.js': 'LA_LEADER', 'js/entities/boss-ai.js': 'LA_BRAIN', 'js/data/gyms.js': 'LA_GYMS', 'js/systems/move-sim.js': 'LA_SIM', 'js/systems/move-effects.js': 'LA_EFFECTS' };
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
if ('LeaderAI' in base && G.LeaderAI.off) Object.assign(G.LeaderAI.off, { swaps: true, dodges: true, confidence: true, triggers: true });

let fail = 0,
  n = 0;
const ok = (c, m) => {
  n++;
  if (!c) {
    fail++;
    console.log('FAIL ' + m);
  }
};
/** A check whose outcome waits on an open issue (CLAUDE.md "Move review rule": blocked, never guessed): it prints its result
 *  and the issue, and does not fail the run. One that starts to pass says so, so the issue can unblock it. */
let blockedN = 0;
const blocked = (c, m, issue) => {
  blockedN++;
  console.log((c ? 'BLOCKED (#' + issue + ', now passes: unblock it) ' : 'BLOCKED (#' + issue + ') ') + m);
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
// #53: the sections written before #53 keep testing what they test, so open() pins its two default rule changes off (misjudge 0,
// aimError 0: R1 and R2 would move their traces). Section 17 and the sharpness duel turn this off where they need the defaults.
let pinOldDefaults = true;
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
  const ai = G.GymArena.leaderAI;
  if (pinOldDefaults && ai && ai.set) Object.assign(ai.set, { misjudge: 0, aimError: 0 });
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

// ---------------- 1. parity: RETIRED (#51, decision 2026-11-09-51-opening-stance-traces-and-set-trigger) ----------------
// The slice 1 and 5a parity traces (leader-ai-trace.json, leader-ai-5a-trace.json, kept as history) proved behavior-neutral steps
// against GymBrain. #51 changes behavior by design (the planner drives movement and slots), so they cannot hold; the determinism
// duel in section 15 replaces them.

const built = !missing.length && G.LeaderAI && G.LeaderInfo;
ok(built, 'the slice is built: ' + (missing.length ? missing.join(', ') + ' missing' : 'G.LeaderAI and G.LeaderInfo defined'));
if (built) {
  // ---------------- 2. controls: one AI player per team answers all seven calls ----------------
  {
    // #51: you stand 40 px off (inside Tackle and Water Gun), so its plans use both slots as each recharges
    const a = open('Misty', 2, 40),
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
    // the executor (#51; the slot choice until then) never switches by itself: its press waits in the controller
    const e = t.active;
    let direct = 0;
    const s1 = e.setActive;
    e.setActive = () => direct++;
    e.swapT = 0;
    const heading = e.ai.execute(e, DT, human, true);
    e.setActive = s1;
    ok(direct === 0 && Array.isArray(heading), 'the executor answers a heading and never calls setActive');
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
    // #52: the swap choice's margin, cc, low HP and matchup settings are gone; swapWill 1 is the swap cost's baseline
    const want = { think: 0.25, reflex: 0.15, threatWindow: 0.6, dodgeRead: 6, dodgeReserve: 0, minField: 8, swapLimit: null, swapWill: 1, randomness: 0 };
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
    ok(ai.log.some((d) => d.act === 'swap' && d.why), 'and the log names the goal its plan swapped for (#52: the planner\'s Swap)');
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
      // #52: a sleep is a reason to swap only when it costs: you stand inside your Vine Whip's reach (68) of asleep Seel, 6 s. Staying
      // takes about 6 / 0.8 = 7 whips at 0.03 = 0.21; Staryu's worse matchup costs (0.048 - 0.037) x 10 = 0.11, plus the swap 0.03
      human.x = r.s2.x + 40;
      human.y = r.s2.y;
      r.s2.stMajor = { k: 'sleep', t: 6, age: 0 };
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

  // ---------------- 8. the triggers at their edges, and STAY: RETIRED (#52) ----------------
  // The swap triggers (cc, low HP, matchup) and STAY are gone: a swap is the planner's Swap action (decision
  // 2026-11-09-52-opening-stall-guards-dodge-cost-swap-value). Section 16 holds their replacements: 16b (asleep, swapWill), 16c (the
  // KO term that stands in for the low HP trigger); the matchup swap and the stall guards stay checked in sections 6 and 7.

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
    // a still shape (a strike waiting 0.3 s to land on her): straight away from its centre. #51: her planner is off for this check,
    // so she stands where the shape was placed (it used to rely on her walking straight at you)
    r = null;
    AI.off.planner = true;
    for (let k = 0; k < 10 && !(r && r.read); k++) {
      run(3);
      r = threat(ai, e, { dx: 0, dy: 10, vx: 0, vy: 0, wait: 0.3, family: 'circle' });
    }
    AI.off.planner = false;
    // its centre is 10 px south of her, so away from it is north
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
    // #52 REFLEX: a dodge that would spend down to the reserve goes only when your hit x the goal's taken weight x risk reaches your
    // best hit x 0.5. At risk 0.1 the weight is at most 2.5 x 0.1 = 0.25 of the hit, under the 0.5: one charge ready is kept; two are not
    ai.set.risk = 0.1;
    r = readOne(() => (e.dodges.cd = [0, 6]));
    ok(r.read && !r.dodge && ai.log.some((d) => d.act === 'dodge' && /kept for later/.test(d.text)), '#52: risk 0.1, one charge ready: the reflex dodge is kept for later');
    r = readOne(() => (e.dodges.cd = [0, 0]));
    ok(r.read && r.dodge, '#52: with two ready it keeps a spare, so it dodges');
    ai.set.risk = 1;
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
  const built3 = AI.CONF && typeof AI.prototype.aggr === 'function'; // #51: PACE went with pacing
  ok(built3, 'slice 3 is built: G.LeaderAI.CONF and aggr() defined');
  if (built3) {
    const C = AI.CONF;
    /** A fight with only the named switches on, your HP at 100 (a hit's fraction reads plainly) and no other banner up. */
    const go3 = (name, loop, on = {}, dist) => {
      Object.assign(AI.off, { swaps: !on.swaps, dodges: !on.dodges, confidence: !on.confidence, planner: on.planner === false, triggers: !on.triggers });
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
      const want = { aggression: 0.5, confStart: 0.5, confSwing: 1, confMin: 0.2, confMax: 0.9, lean: 45 }; // #52: gapClose gone
      const bad = Object.keys(want).filter((k) => AI.BASE[k] !== want[k]);
      ok(!bad.length, 'the slice 3 baselines are the agreed ones' + (bad.length ? ': ' + bad.map((k) => k + '=' + AI.BASE[k]).join(', ') : ''));
      ok(near(C.hit, 0.03) && near(C.faint, 0.15) && near(C.drift, 0.01) && near(C.trade, 0.1) && near(C.pull, 0.6) && near(C.swing, 0.25) && C.swingCd === 20, 'the confidence constants: hit 0.03, faint 0.15, drift 0.01 at a 10% trade, pull 0.6, a 0.25 swing line every 20 s at most');
      ok(AI.PACE === undefined && AI.HOLD === undefined && AI.BASE.pushAfter === undefined && AI.BASE.breatherMax === undefined, '#51: pacing is gone (no PACE, HOLD, pushAfter or breatherMax)');
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
      ok(errs({ triggers: [{ on: 'start', swap: 2 }] }).some((s) => /swap is gone/.test(s)) && errs({ triggers: [{ on: 'start', line: 'x', slot: 1 }] }).some((s) => /slot is gone/.test(s)), '#51: a forced swap or slot is refused (the planner decides)');
      ok(errs({ lines: { up: 3 } }).some((s) => /ai line up is text/.test(s)) && errs({ lines: { sideways: 'x' } }).some((s) => /unknown ai line/.test(s)), 'swing lines are up and down, as text');
      const all = { triggers: [{ on: 'start', line: 'a' }, { on: 'hp', below: 0.5, set: { aggression: 0.9 }, for: 3 }, { on: 'faint', side: 'own', line: 'f' }, { on: 'sendIn', line: 'b', repeat: true }, { on: 'time', at: 9, line: 'c' }, { on: 'exploit', line: 'e' }], lines: { up: 'u', down: 'd' } };
      ok(errs(all).length === n0, 'every condition and action the spec names (exploiting a pattern since slice 4; #51: lines and settings) passes');
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
      // effective aggression (#52: the swap margin is gone)
      const ag = (c) => ((ai.conf = c), ai.aggr());
      ok(near(ag(0.5), 0.68) && near(ag(0.9), 0.92) && near(ag(0.2), 0.5), 'Misty aggr: 0.68 at 0.5, 0.92 at the ceiling, 0.50 at the floor: ' + [ag(0.5), ag(0.9), ag(0.2)].join(', '));
      const b = go3('Brock', 2, { confidence: true }).ai;
      b.conf = 0.9;
      ok(near(b.aggr(), 0.59), 'Brock at his ceiling: aggr 0.59: ' + b.aggr());
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

    // ---------------- 13. pacing: RETIRED (#51: the planner's goals replace push, neutral and breather; history in git) ----------------

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

    // ---------------- 15. the gap-closing dodge: RETIRED (#52) ----------------
    // It is the planner's Dash in now (a charge beyond the reserve, your reach within one dodge, the kept-back charge a cost): section
    // 16a.

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
      // #51: a trigger forces no swap or slot (the validator refuses them; the hook is an unused stub), so one fed in anyway does
      // nothing; its line still shows
      ({ t, s1, s2, ai } = fresh([{ on: 'time', at: 1, swap: 2, line: 'W' }]));
      let forced = 0;
      const hook0 = ai.forcedAction;
      ai.forcedAction = function () {
        forced++;
        return hook0.apply(this, arguments);
      };
      run(1.1);
      ok(forced === 1 && t.active === s1 && said('W') === 1, '#51: a forced swap reaches only the unused hook (Seel stays out), its line shows');
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
      const { t, ai } = go3('Misty', 2, { swaps: true, dodges: true, confidence: true, triggers: true }, 160);
      const look = () => t.members.map((m) => [m.maxHp, m.cdMul, m.gym.tempo, m.gym.power, m.gym.level].join()).join('|');
      const before = look(),
        goals = new Set();
      let planned = 0,
        err = null;
      // #51: your Bulbasaur casts Vine Whip every 1.5 s (revealed, so its reach and window are believed)
      for (let i = 0; i < 40 * 60 && !err; i++) {
        if (i % 90 === 0) G.SimBus.emit('move:cast', { moveId: 'vine-whip', ownerId: null, ownerUid: you[0].copyUid, ownerSlot: you[0].teamSlot, rival: false, x: human.x, y: human.y, aim: 0, enemy: false });
        try {
          frame();
        } catch (x) {
          err = x;
        }
        if (ai.plan) {
          planned++;
          goals.add(ai.plan.goal);
        }
      }
      ok(!err, 'a 40 s close fight runs: ' + (err ? err.stack : 'no error'));
      ok(planned >= 0.9 * 40 * 60, '#51: it runs a plan almost all fight: ' + planned + ' of ' + 40 * 60 + ' frames');
      ok(goals.size >= 2, '#51: and changes goal: ' + [...goals].join(', '));
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
        // #52: the read reaches the planner only when it names a better matchup (a tie does not feed it), and it acts only through
        // the plan: with the swaps switch off, a believed read swaps nothing
        const fed = () => {
          const b = G.LeaderBelief.current,
            snap0 = b.snapshot;
          let n = 0;
          b.snapshot = function (e, set, conf, opts) {
            if (opts && opts.expect) n++;
            return snap0.apply(this, arguments);
          };
          return () => n;
        };
        seeded(C4);
        go3('Misty', 2, { swaps: true, triggers: true });
        let fedN = fed();
        run(1);
        ok(fedN() === 0, '#52: a tied read never feeds the planner: ' + fedN());
        seeded(B);
        ({ t, ai } = go3('Misty', 2, { swaps: false, triggers: true }));
        youActive = 1;
        fedN = fed();
        run(1);
        ok(t.active === t.members[0] && ai.swaps === 0 && says.includes(MLINE), '#52: swaps switched off: the read says its line and swaps nothing');
        ok(fedN() === 1, '#52: and feeds the planner once, on its tick: ' + fedN());
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
        const { t, ai } = go3('Misty', 2, { swaps: true, dodges: true, confidence: true, triggers: true }, 160);
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
    Object.assign(AI.off, { confidence: false, triggers: false });
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
  Object.assign(AI.off, { swaps: true, dodges: true, confidence: true, triggers: true });
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
  Object.assign(AI.off, { swaps: true, dodges: true, confidence: true, triggers: true });
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
      // #51: the old attack score is gone; choosing is the planner's (the Decider's own module, G.LeaderPlanner)
      ok(typeof G.LeaderPlanner.choose === 'function' && !/POINT_BLANK/.test(code('LA_AI', 'js/entities/leader-ai.js')), '13a: the scoring lives in the Decider (its planner)');
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
  Object.assign(AI.off, { swaps: true, dodges: true, confidence: true, triggers: true, memory: true });
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

// ---------------- 15. #51 (#49 slice 2): goals, the planner and the executor (docs/LEADER-AI.md "The Decider (#49)") ----------------
// Written at the slice's start (issue #51). Expected values are hand-derived from the spec, decision
// 2026-11-09-51-opening-stance-traces-and-set-trigger and the #51 plan's starting numbers (G.LeaderPlanner PROFILE, BASE_VALUE, TUNE),
// never from code output. The worlds are hand-made snapshots (Belief's shape), so every number below can be checked on paper.
// Profiles (taken, dealt, time per s): Endurance 1.5, 1, 0.002; Maintain 1, 1, 0.01; Pressure 0.6, 1.5, 0.02; Kite 2, 1, 0.005;
// Bait 2, 1.5, 0.005; Finish 0.3, 1.5, 0.01; Conserve 2.5, 0, 0.005. Values: Endurance 0.1, Maintain 0.1, Pressure 0.12, Kite 0.1,
// Bait 0.14; Finish your HP + 0.3; confidence 0.5 leaves every utility at 1.
if (G.LeaderPlanner) {
  const P = G.LeaderPlanner,
    AI = G.LeaderAI;
  /** A hand-made world: one slot per move, you `distance` px off, no danger unless `threats` names some. */
  const world = (o = {}) =>
    Object.assign(
      {
        distance: 100,
        preferredRange: 220,
        aimError: 0,
        risk: 1,
        stubbornness: 1,
        randomness: 0,
        confidence: 0.5,
        own: { speed: 100, radius: 10, hpFraction: 1, healsLeft: 0, activeSlot: 0, dodgeCharges: { ready: 2, total: 2, nextBackIn: 0 } },
        slots: (o.moves || [jab()]).map((m, index) => ({ index, moves: [m] })),
        you: Object.assign({ hpFraction: 1, radius: 10, sidewaysSpeed: 0, bestReach: 160, bestHit: 0, baitMoveId: null, threats: [] }, o.you || {}),
      },
      o.top || {}
    );
  const move = (o) => Object.assign({ cooldown: 2, remaining: 0, hitFraction: 0.1, tell: 0.5, travelSpeed: 0, halfWidth: 10, setsBack: false }, o);
  const jab = (o = {}) => move(Object.assign({ id: 'jab', form: 'melee', tag: 'attack', reach: 50 }, o));
  const gun = (o = {}) => move(Object.assign({ id: 'gun', form: 'shot', tag: 'attack', reach: 300, hitFraction: 0.05, cooldown: 1 }, o));
  const of = (choice, goal) => choice.ranking.find((c) => c.goal === goal);
  const text = (c) => (c ? c.steps.map((s) => s.verb + (s.slot != null ? ' ' + (s.slot + 1) : '')).join(', ') : 'none');

  // 15a. hit chance (LEADER-AI COST): a shot 200 px off at 400 px/s flies 0.5 s, plus its 0.5 s tell, while you step sideways at
  // 60 px/s: escape 60 px against a half width of 10 + your 10: 20 / (20 + 60) = 0.25. A cone in reach: 1. 20 px past a reach (the
  // edge is reach + your body): halfway down the 40 px falloff, 0.5.
  const yu = { radius: 10, sidewaysSpeed: 60 };
  ok(near(P.hitChance(gun({ travelSpeed: 400 }), 200, yu), 0.25), '15a: a shot you strafe: 0.25: ' + P.hitChance(gun({ travelSpeed: 400 }), 200, yu));
  ok(P.hitChance(jab(), 55, yu) === 1, '15a: a cone in reach always lands');
  ok(near(P.hitChance(jab(), 80, { radius: 10, sidewaysSpeed: 0 }), 0.5), '15a: 20 px past its reach: 0.5');
  ok(near(P.hitChance(gun({ travelSpeed: 400 }), 200, yu, 20), 20 / 100), '15a: aimError 20 px adds to the escape: 20 / 100');

  // 15b. the cheapest plan (A world: a jab, reach 50, you 100 px off with your 10 px body). Close to reach walks to 50 + 10 - 5 = 55
  // px: 0.45 s at 100 px/s. Use slot: no wait, its 0.5 s tell, a sure hit for 0.1. Pressure: 0.6 x 0 - 1.5 x 0.1 + 0.02 x 0.95 =
  // -0.131, so 0.12 + 0.131 = 0.251. Endurance: -0.1 + 0.002 x 0.95 = -0.0981, 0.1981. No plan longer than 4 steps.
  {
    const c = P.choose(world());
    const pr = of(c, 'pressure');
    ok(pr && text(pr) === 'close 1, use 1' && near(pr.cost, -0.131) && near(pr.score, 0.251), '15b: Pressure: close 1, use 1, cost -0.131, score 0.251: ' + text(pr) + ' ' + (pr && pr.cost));
    ok(near(of(c, 'endurance').score, 0.1981), '15b: Endurance 0.1981: ' + of(c, 'endurance').score);
    ok(c.pick.goal === 'pressure', '15b: Pressure wins it: ' + c.pick.goal);
    ok(c.ranking.every((r) => r.steps.length <= 4) && c.nodes > 0, '15b: no plan is longer than 4 actions (' + c.nodes + ' plans searched)');
    ok(!of(c, 'kite') && !of(c, 'maintain') && !of(c, 'bait'), '15b: a lone jab cannot outreach you, hold your range or bait: no Kite, Maintain or Bait');
  }

  // 15c. Finish: you at 8%: the jab's 0.1 KOs. Value 0.08 + 0.3 = 0.38; cost 0.3 x 0 - 1.5 x 0.1 + 0.01 x 0.95 = -0.1405; 0.5205.
  // You at 80%: no 4-step plan deals 0.8. Its best partial plan: close, then three jabs (each recast waits its 2 s): 0.3 dealt in
  // 0.95 + 2.5 + 2.5 = 5.95 s; value 0.3 (the KO bonus) x 0.3 / 0.8 = 0.1125, cost (dealt left out, flagged) 0.01 x 5.95 = 0.0595.
  {
    let c = P.choose(world({ you: { hpFraction: 0.08 } }));
    const fi = of(c, 'finish');
    ok(c.pick.goal === 'finish' && near(fi.value, 0.38) && near(fi.score, 0.5205), '15c: you at 8%: Finish wins, value 0.38, score 0.5205: ' + c.pick.goal + ' ' + fi.score);
    c = P.choose(world({ you: { hpFraction: 0.8 } }));
    const part = of(c, 'finish');
    ok(part && part.partial && near(part.value, 0.1125) && near(part.cost, 0.0595) && part.steps.length === 4, '15c: you at 80%: partial credit, value 0.1125, cost 0.0595, 4 steps: ' + (part && [part.value, part.cost, text(part)].join(' ')));
    ok(c.pick.goal === 'pressure', '15c: and Pressure wins at 80%');
  }

  // 15d. Buff (worth 0.2 here), the jab on a 10 s cooldown, no danger: use 2 now, 0 s, cost 0, score 0.2. Endurance must wait out the
  // jab: 0.45 + 9.55 + 0.5 = 10.5 s, -0.1 + 0.002 x 10.5 = -0.079, 0.179. Pressure: -0.15 + 0.21 = 0.06. Conserve: the jab's cooldown
  // back in 10 s, worth its 0.1: 0.1 - 0.005 x 10 = 0.05.
  {
    const harden = move({ id: 'harden', form: 'buff', tag: 'buff', reach: 0, hitFraction: 0, tell: 0, cooldown: 0, buffReady: true, buffValue: 0.2 });
    const c = P.choose(world({ moves: [jab({ remaining: 10 }), harden] }));
    ok(c.pick.goal === 'buff' && text(c.pick) === 'use 2' && near(c.pick.score, 0.2), '15d: Buff wins: use 2, 0.2: ' + c.pick.goal + ' ' + text(c.pick));
    ok(near(of(c, 'endurance').score, 0.179) && near(of(c, 'pressure').score, 0.06) && near(of(c, 'conserve').score, 0.05), '15d: Endurance 0.179, Pressure 0.06, Conserve 0.05');
    const shut = P.choose(world({ moves: [jab({ remaining: 10 }), Object.assign({}, harden, { buffReady: false, buffValue: 0 })] }));
    ok(!of(shut, 'buff'), '15d: a buff worth 0 (its stage at +6) has no plan');
    ok(!of(P.choose(world()), 'conserve'), '15d: with nothing spent, Conserve has no plan (worth 0)');
  }

  // 15e. danger (your revealed Whip, 0.2 a hit, reach 120, every 1 s, ready now). You 200 px off (outside 120 + her 10). The jab
  // (0.1, reach 50) is ready, the gun (0.05, reach 300) is 4 s from ready. Closing for the jab takes 1.45 s inside your reach: two
  // Whips (0.4). Pressure that way: 0.24 - 0.15 + 0.02 x 1.95 = 0.129, so -0.009; waiting 4.5 s for the gun from where it stands:
  // -0.075 + 0.09 = 0.015, so 0.105. Endurance on the gun: -0.05 + 0.009 = -0.041, 0.141. Kite (200 is outside your reach):
  // -0.05 + 0.0225 = -0.0275, 0.1275. So Endurance, then Kite, both above Pressure.
  const D = () =>
    world({
      top: { distance: 200 },
      moves: [jab(), gun({ remaining: 4 })],
      you: { bestReach: 120, baitMoveId: 'whip', threats: [{ id: 'whip', category: 'physical', hitFraction: 0.2, reach: 120, cycle: 1, nextFireIn: 0 }] },
    });
  {
    const c = P.choose(D());
    ok(near(of(c, 'endurance').score, 0.141) && near(of(c, 'kite').score, 0.1275) && near(of(c, 'pressure').score, 0.105), '15e: Endurance 0.141, Kite 0.1275, Pressure 0.105: ' + ['endurance', 'kite', 'pressure'].map((g) => of(c, g).score.toFixed(4)).join(', '));
    ok(c.pick.goal === 'endurance', '15e: with high danger Endurance beats Pressure: ' + c.pick.goal);
    const calm = D();
    calm.you = Object.assign({}, calm.you, { threats: [], baitMoveId: null, bestReach: 160 });
    const c2 = P.choose(calm);
    ok(c2.pick.goal === 'pressure' && near(c2.pick.score, 0.231) && text(c2.pick) === 'close 1, use 1', '15e: the same world with no shots of yours: Pressure closes for the jab, 0.231: ' + c2.pick.goal + ' ' + text(c2.pick));
  }

  // 15f. the commitment bonus: seconds invested x 0.01 x stubbornness 1 (x Kite's utility 1). Kite running 2 s: 0.1275 + 0.02 =
  // 0.1475 beats Endurance's 0.141, so it keeps its plan; 0.5 s: 0.1325, so the clearly better Endurance takes over.
  {
    const first = of(P.choose(D()), 'kite').steps[0];
    ok(P.choose(D(), { goal: 'kite', step: first, invested: 2 }).pick.goal === 'kite', '15f: Kite 2 s in keeps a near-tie (0.1475 against 0.141)');
    ok(P.choose(D(), { goal: 'kite', step: first, invested: 0.5 }).pick.goal === 'endurance', '15f: 0.5 s in (0.1325), Endurance takes over');
    ok(P.choose(D(), { goal: 'kite', step: { verb: 'backOff' }, invested: 2 }).pick.goal === 'endurance', '15f: no bonus when its plan no longer starts with the running action');
  }

  // 15g. randomness: 0 always takes the top and never draws; 1 always draws, and one seed gives one sequence
  {
    let draws = 0;
    const counted = () => (draws++, 0.5);
    for (let k = 0; k < 5; k++) ok(P.choose(D(), null, counted).pick.goal === 'endurance', '15g: randomness 0 takes the top');
    ok(draws === 0, '15g: and never draws');
    const wild = () => Object.assign(D(), { randomness: 1 }),
      seq = (seed) => {
        const draw = P.seeded(seed);
        return Array.from({ length: 12 }, () => P.choose(wild(), null, draw).pick.goal).join();
      };
    ok(seq(7) === seq(7), '15g: one seed, one sequence: ' + seq(7));
    ok(!seq(7).split(',').includes('endurance'), '15g: randomness 1 never takes the top');
  }

  // 15h. the executor in a real fight (Misty loop 2, you 40 px off): an attack it runs breaks once you leave that slot's reach (plus
  // the 40 px slack), and it replans on that frame, not on the next tick
  {
    const a = open('Misty', 2, 40),
      ai = G.GymArena.leaderAI,
      t = a.team;
    let found = false;
    for (let f = 0; f < 20 * 60 && !found; f++) {
      frame();
      const p = ai.plan,
        s = p && p.steps[p.at];
      found = !!(s && s.verb === 'use' && s.tag === 'attack' && !t.active.tell && !ai.busy(t.active));
    }
    ok(found, '15h: it runs a Use slot attack within 20 s');
    human.x += 3000;
    ai.tickT = 1; // no think tick on this frame
    frame();
    ok(/^broken/.test(ai.lastWhy || ''), '15h: you leave its reach: it replans at once: ' + ai.lastWhy);
    human.x -= 3000;
  }

  // 15i. the limits: no choice inside a tell or commitment; the planner reads only its world (no G. read but its own name)
  {
    const a = open('Brock', 1, 60),
      ai = G.GymArena.leaderAI,
      t = a.team;
    let inside = 0,
      plans = 0;
    const re0 = ai.replan;
    ai.replan = function (e, why) {
      plans++;
      if (this.busy(e)) inside++;
      return re0.call(this, e, why);
    };
    run(20);
    ai.replan = re0;
    ok(plans > 40 && inside === 0, '15i: ' + plans + ' plans in 20 s, none inside a tell or commitment');
    const src = fs
      .readFileSync(process.env.LA_PLANNER || path.join(R, 'js/systems/leader-planner.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    ok((src.match(/\bG\.[A-Za-z]+/g) || []).every((m) => m === 'G.LeaderPlanner'), '15i: the planner reads nothing of the game, only its world');
    ok(!t.members.some((m) => m.ai.stance !== undefined) && typeof ai.pace !== 'function' && typeof ai.pickSlot !== 'function', '15i: the old stance, pacing and slot choice are gone');
  }

  // 15j. the determinism duel: Brock loop 1, you circling 120 px round a point 160 px south, casting Vine Whip every 1.5 s, 20 s.
  // Every 15 frames: the goal, the step it runs, its position. One seed twice: one trace. At randomness 0 (the default leader) nothing
  // seeded is read in this duel, so the seed check runs at randomness 0.3: there another seed gives another trace.
  {
    const duel = (duelSeed, randomness = 0) => {
      const seed0 = AI.seed,
        random0 = Math.random;
      AI.seed = duelSeed;
      const a = open('Brock', 1, 160),
        ai = G.GymArena.leaderAI,
        cx = human.x,
        cy = human.y,
        out = [];
      ai.set.randomness = randomness;
      if (duelSeed !== 7) {
        // a different seed: the game's own source too (it sets her circling side)
        let s2 = duelSeed * 7919;
        Math.random = () => (s2 = (s2 * 1664525 + 1013904223) % 4294967296) / 4294967296;
      }
      for (let f = 0; f < 20 * 60; f++) {
        const ang = (f * DT * 2 * Math.PI) / 8;
        human.x = cx + Math.cos(ang) * 120;
        human.y = cy + Math.sin(ang) * 120;
        if (f % 90 === 0) G.SimBus.emit('move:cast', { moveId: 'vine-whip', ownerId: null, ownerUid: you[0].copyUid, ownerSlot: you[0].teamSlot, rival: false, x: human.x, y: human.y, aim: 0, enemy: false });
        frame();
        const e = a.team.active,
          p = ai.plan;
        if (f % 15 === 0) out.push([f, p ? p.goal : null, p ? ai.stepText(p.steps[p.at]) : null, +e.x.toFixed(2), +e.y.toFixed(2)]);
      }
      Math.random = random0;
      AI.seed = seed0;
      return JSON.stringify(out);
    };
    const one = duel(7),
      two = duel(7);
    ok(one === two, '15j: one seed, one trace (' + JSON.parse(one).length + ' samples)');
    ok(duel(7, 0.3) === duel(7, 0.3), '15j: at randomness 0.3 too');
    ok(duel(7, 0.3) !== duel(8, 0.3), '15j: and there another seed gives another trace');
    ok(new Set(JSON.parse(one).map((r) => r[1])).size >= 2, '15j: and the goal changes during the duel: ' + [...new Set(JSON.parse(one).map((r) => r[1]))].join(', '));
  }

  // 15k. the overlay's reads: the plan's lines (each step with its cost, then the alternatives) and a window bar per revealed move
  {
    open('Misty', 2, 40);
    const ai = G.GymArena.leaderAI;
    G.SimBus.emit('move:cast', { moveId: 'vine-whip', ownerId: null, ownerUid: you[0].copyUid, ownerSlot: you[0].teamSlot, rival: false, x: 0, y: 0, aim: 0, enemy: false });
    run(1);
    const lines = ai.overlayLines(),
      bars = ai.windowBars();
    ok(/goal \w+ \(value/.test(ai.status()), '15k: the status line names the goal with its value and cost: ' + ai.status());
    ok(lines.length >= 1 && /cost -?\d/.test(lines[0]), '15k: the plan lines: ' + lines.join(' / '));
    ok(lines.some((l) => /^ {2}alt /.test(l)), '15k: with the alternatives');
    ok(bars.length === 1 && bars[0].id === 'vine-whip' && bars[0].lo < bars[0].hi && bars[0].since != null, '15k: one window bar for your revealed Vine Whip: ' + JSON.stringify(bars));
  }
  // 15l. the frame order checks the retired parity traces used to carry (hand facts, LEADER-AI FRAME and #40, #41, #43):
  // the body steps before the SimPass, a wind-up started this frame first advances next frame, the edge unstick reads the body's
  // own step, and a slot press is answered once
  {
    const a = open('Misty', 2, 60),
      ai = G.GymArena.leaderAI,
      t = a.team,
      sim0 = G.GymLeader.SimPass.frame;
    let order = 0,
      checked = 0,
      before = null;
    G.GymLeader.SimPass.frame = function (e, dt, now) {
      if (e === t.active) {
        checked++;
        if (e.lastStep === before) order++;
      }
      return sim0.call(this, e, dt, now);
    };
    let fresh = null;
    for (let f = 0; f < 10 * 60; f++) {
      before = t.active.lastStep;
      const had = t.active.tell;
      frame();
      const now = t.active.tell;
      if (!had && now && !fresh) fresh = now.t;
    }
    G.GymLeader.SimPass.frame = sim0;
    ok(checked > 500 && order === 0, '15l: every frame the body steps (a new lastStep) before the SimPass runs: ' + order + ' of ' + checked + ' out of order');
    ok(fresh === 0, '15l: a wind-up started this frame has not advanced yet (t 0): ' + fresh);
    // free floor, you 300 px off and moving: she walks without ever being stuck, so no side-step starts
    const b = open('Brock', 1, 300),
      bt = b.team;
    let stepped = 0;
    for (let f = 0; f < 6 * 60; f++) {
      human.x += 1;
      frame();
      if (ai !== G.GymArena.leaderAI && (G.GymArena.leaderAI.legsOf(bt.active).sideStepT || 0) > 0) stepped++;
    }
    ok(stepped === 0, '15l: on open floor the edge unstick never side-steps her (it reads her own step): ' + stepped + ' frames');
    // a press is answered once, as a key press
    const c = G.GymArena.leaderAI.controller;
    c.slots();
    G.GymArena.leaderAI.pressSlot(bt.active, 1);
    const first = c.slots(),
      second = c.slots();
    ok(first.length === 1 && first[0] === 1 && second.length === 0, '15l: a press is answered once: ' + JSON.stringify([first, second]));
  }
  // 15m. risk and confidence, off their neutral values. One step that takes 0.4, deals 0.1 in 1.95 s: Pressure at risk 1 is
  // 0.6 x 0.4 - 1.5 x 0.1 + 0.02 x 1.95 = 0.129; at risk 2 the taken weight doubles: 0.48 - 0.15 + 0.039 = 0.369. Confidence 0.9:
  // Pressure and Finish x (0.5 + 0.9) = 1.4, Conserve and Endurance x (1.5 - 0.9) = 0.6, the rest 1.
  {
    const P = G.LeaderPlanner,
      step = [{ taken: 0.4, dealt: 0.1, duration: 1.95, tag: 'attack' }],
      w = (risk, confidence = 0.5) => ({ risk, confidence });
    ok(near(P.costOf(w(1), 'pressure', step), 0.129) && near(P.costOf(w(2), 'pressure', step), 0.369), '15m: risk 2 doubles the damage-taken weight: ' + P.costOf(w(2), 'pressure', step));
    const u = (g) => P.utility(g, w(1, 0.9));
    ok(near(u('pressure'), 1.4) && near(u('finish'), 1.4) && near(u('conserve'), 0.6) && near(u('endurance'), 0.6) && u('kite') === 1, '15m: confidence 0.9 raises Pressure and Finish to 1.4, lowers Conserve and Endurance to 0.6');
  }

  // ---------------- 16. #52 (#49 slice 3): swap, dash, draw and dodge (docs/LEADER-AI.md ACTIONS, REFLEX) ----------------
  // Written at the slice's start (issue #52; decision 2026-11-09-52-opening-stall-guards-dodge-cost-swap-value). Hand-derived from
  // the spec, that decision and the #52 plan's numbers: one dodge 150 px in 0.5 s (G.PlayerEntity.DODGE), the swap's send-in
  // i-frames 0.5 s (G.Team), the swap cost 0.03 x swapWill, the kept-back charge your best hit x 0.5 (B), a step that takes the
  // leader mon to 0 HP adds the KO bonus 0.3 to its damage taken (A), a planned dodge succeeds dodgeRead / 10 of the time when your
  // shot's flight from its reach beats `reflex` (else it is never offered).
  {
    const own = (o = {}) => Object.assign({ speed: 100, radius: 10, hpFraction: 1, healsLeft: 0, activeSlot: 0, stunLeft: 0, dodgeReserve: 0, dodgeCharges: { ready: 2, total: 2, nextBackIn: 0 } }, o);
    const dodgeOn = { dodge: { dist: 150, time: 0.5 }, reflex: 0.15, dodgeRead: 6, bag: 10 };
    const whip = (o = {}) => Object.assign({ id: 'whip', category: 'physical', hitFraction: 0.2, reach: 120, cycle: 1, nextFireIn: 0, travelSpeed: 0 }, o);
    const ember = (o = {}) => Object.assign({ id: 'ember', category: 'special', hitFraction: 0.2, reach: 150, cycle: 2, nextFireIn: 0, travelSpeed: 300 }, o);

    // 16a. Dash in. A jab (reach 50, your body 10: its edge 60), you 200 px off: one dodge (150) brings you to 50, inside it.
    // Pressure, dash 1 then use 1: taken 0, dealt 0.1, 0.5 + 0.5 s: cost -1.5 x 0.1 + 0.02 x 1 = -0.13. Walking instead (close 1,
    // use 1: 145 px at 100 px/s, 1.45 s, then 0.5 s): -0.15 + 0.02 x 1.95 = -0.111. So it dashes.
    {
      let c = P.choose(world({ top: Object.assign({ distance: 200, own: own() }, dodgeOn) }));
      ok(text(of(c, 'pressure')) === 'dash 1, use 1' && near(of(c, 'pressure').cost, -0.13), '16a: two charges, you one dodge past its reach: dash 1, use 1 at -0.13: ' + text(of(c, 'pressure')) + ' ' + (of(c, 'pressure') || {}).cost);
      c = P.choose(world({ top: Object.assign({ distance: 200, own: own({ dodgeReserve: 1, dodgeCharges: { ready: 1, total: 2, nextBackIn: 3 } }) }, dodgeOn) }));
      ok(text(of(c, 'pressure')) === 'close 1, use 1' && near(of(c, 'pressure').cost, -0.111), '16a: only the reserve ready (1 of reserve 1): it walks, -0.111: ' + text(of(c, 'pressure')));
      c = P.choose(world({ top: Object.assign({ distance: 210, own: own() }, dodgeOn) }));
      ok(text(of(c, 'pressure')) === 'dash 1, use 1', '16a: you exactly one dodge out (210 - 150 = 60, its edge): it dashes');
      c = P.choose(world({ top: Object.assign({ distance: 211, own: own() }, dodgeOn) }));
      ok(!/dash/.test(text(of(c, 'pressure'))), '16a: 1 px more: no dash: ' + text(of(c, 'pressure')));
      // the kept-back charge (B): your whip reaches 20 (never her at 50 or 55), your best hit 0.2. One charge ready, reserve 0: the dash
      // spends down to the reserve, so it takes 0.2 x 0.5 = 0.1: Pressure 0.6 x 0.1 - 0.15 + 0.02 = -0.07 (score 0.19) loses to the
      // walk's -0.111 (0.231). Two ready: the dash keeps a spare, -0.13 (0.25), and wins.
      const short = { threats: [whip({ reach: 20 })], bestReach: 20, bestHit: 0.2 };
      c = P.choose(world({ you: short, top: Object.assign({ distance: 200, own: own({ dodgeCharges: { ready: 1, total: 2, nextBackIn: 3 } }) }, dodgeOn) }));
      ok(text(of(c, 'pressure')) === 'close 1, use 1', '16a: a dash down to the reserve costs your best hit x 0.5, so with one charge it walks: ' + text(of(c, 'pressure')));
      const oneReady = world({ you: short, top: Object.assign({ distance: 200, own: own({ dodgeCharges: { ready: 1, total: 2, nextBackIn: 3 } }) }, dodgeOn) }),
        dashStep = P.apply(oneReady, P.startState(oneReady), { verb: 'dash', slot: 0, reach: 50 });
      ok(near(dashStep.step.taken, 0.1) && near(dashStep.step.duration, 0.5) && near(dashStep.state.distance, 50) && dashStep.state.chargesReady === 0, '16a: that dash step: taken 0.1, 0.5 s, to 50 px, no charge left: ' + JSON.stringify([dashStep.step.taken, dashStep.step.duration, dashStep.state.distance, dashStep.state.chargesReady]));
      c = P.choose(world({ you: short, top: Object.assign({ distance: 200, own: own() }, dodgeOn) }));
      ok(text(of(c, 'pressure')) === 'dash 1, use 1', '16a: with two ready it dashes again');
      c = P.choose(world({ top: { distance: 200 } }));
      ok(!c.ranking.some((r) => r.steps.some((s) => s.verb === 'dash' || s.verb === 'dodge' || s.verb === 'draw' || s.verb === 'swap')), '16a: a world with no dodge and no bench (section 15\'s) offers none of the four');
    }

    // 16b. Swap out of a sleep. Asleep 3 s, in your whip's reach (0.2 a hit, every 1 s, ready now), her jab in reach (you 40 px off).
    // Staying (use 1): she stands out the sleep, then the 0.5 s tell: 3.5 s, your whip at 0, 1, 2 and 3 s: taken 0.8; Endurance
    // 1.5 x 0.8 - 0.1 + 0.002 x 3.5 = 1.107. Swapping to the bench mon (your whip hits it for 0.1): the swap's 0.5 s are its send-in
    // i-frames, so the 0 s whip lands on nothing; then its jab (0.5 s tell) fires at 1.0 s, before the 1 s whip: dealt 0.1. The swap
    // step carries the matchup over the 10 s long window (decision 2026-11-09-52-swap-matchup-window-and-duels): your whip takes 0.1 a
    // second off the bench mon instead of 0.2, so taken (0.1 - 0.2) x 10 = -1.0; both jabs hit 0.1 every 2 s, so dealt 0.
    // 1.5 x -1.0 - 0.1 + 0.002 x 1.0 + the swap cost 0.03 = -1.568.
    {
      const bench = [{ name: 'Seel', team: 1, hpFraction: 1, healsLeft: 0, speed: 100, radius: 10, slots: [{ index: 0, moves: [jab()] }], threats: [whip({ hitFraction: 0.1 })] }];
      const asleep = (allowed, o = {}) =>
        world({ you: { threats: [whip()], bestReach: 120, bestHit: 0.2 }, top: Object.assign({ distance: 40, own: own({ stunLeft: 3 }), swap: { allowed, iframes: 0.5, will: 1 }, bench }, o) });
      let c = P.choose(asleep(true));
      ok(text(of(c, 'endurance')) === 'swap, use 1' && near(of(c, 'endurance').cost, -1.568), '16b: asleep 3 s under fire: swap, use 1 at -1.568: ' + text(of(c, 'endurance')) + ' ' + (of(c, 'endurance') || {}).cost);
      ok(of(c, 'endurance').steps[0].to === 0 && of(c, 'endurance').steps[0].team === 1, '16b: the swap names the bench mon (bench 0, team slot 1)');
      c = P.choose(asleep(false));
      ok(text(of(c, 'endurance')) === 'use 1' && near(of(c, 'endurance').cost, 1.107), '16b: a closed swap (a stall guard, your lock): it sleeps it out, 1.107: ' + text(of(c, 'endurance')) + ' ' + (of(c, 'endurance') || {}).cost);
      c = P.choose(asleep(true, { swap: { allowed: true, iframes: 0.5, will: 2 } }));
      ok(near(of(c, 'endurance').cost, -1.538), '16b: swapWill 2 doubles the swap cost: -1.5 - 0.1 + 0.002 + 0.06 = -1.538: ' + (of(c, 'endurance') || {}).cost);
      ok(c.ranking.every((r) => r.steps.slice(1).every((s) => s.verb !== 'swap')), '16b: a swap is only ever a first step');
      // awake, an even bench mon (the same whip size, the same jab), your whip next at 0.6 s. Staying: the jab fires at 0.5 s, before
      // it: Endurance -0.1 + 0.002 x 0.5 = -0.099. Swapping: no matchup gain, and its jab fires at 1.0 s, after the 0.6 s whip (0.2):
      // 1.5 x 0.2 - 0.1 + 0.002 x 1.0 + 0.03 = 0.232. So it stays.
      const even = [Object.assign({}, bench[0], { threats: [whip({ nextFireIn: 0.6 })] })];
      c = P.choose(world({ you: { threats: [whip({ nextFireIn: 0.6 })], bestReach: 120, bestHit: 0.2 }, top: { distance: 40, own: own(), swap: { allowed: true, iframes: 0.5, will: 1 }, bench: even } }));
      ok(text(of(c, 'endurance')) === 'use 1' && near(of(c, 'endurance').cost, -0.099), '16b: an even bench mon, awake: no swap, -0.099: ' + text(of(c, 'endurance')) + ' ' + (of(c, 'endurance') || {}).cost);
      // a swap is offered at the start, never after a step (awake, so the hold does not KO her: shots at 0.6, 1.6, 2.6 s, 0.6 taken)
      const sw = world({ you: { threats: [whip({ nextFireIn: 0.6 })], bestReach: 120, bestHit: 0.2 }, top: { distance: 40, own: own(), swap: { allowed: true, iframes: 0.5, will: 1 }, bench: even } }),
        s0 = P.startState(sw),
        held = P.apply(sw, s0, { verb: 'hold', range: 220 });
      ok(!held.state.ko && P.actionsIn(sw, s0, null).some((x) => x.verb === 'swap') && !P.actionsIn(sw, held.state, held.step).some((x) => x.verb === 'swap'), '16b: offered at the start, never after a step');
    }

    // 16c. The KO term (A). Awake, your whip ready in reach, her jab's 0.5 s tell: one whip lands (0.2). At full HP the step takes 0.2;
    // at 15% HP that whip would KO her, so it takes 0.2 + 0.3 = 0.5.
    {
      const w = (hp) => world({ you: { threats: [whip()], bestReach: 120, bestHit: 0.2 }, top: { distance: 40, own: own({ hpFraction: hp }) } });
      const at = (hp) => P.apply(w(hp), P.startState(w(hp)), { verb: 'use', slot: 0 }).step.taken;
      ok(near(at(1), 0.2) && near(at(0.15), 0.5), '16c: a hit that would KO her adds the KO bonus 0.3: ' + at(1) + ', ' + at(0.15));
    }

    // 16d. Draw your shot, then Dodge your shot. Your Ember: reach 150, 300 px/s, 0.2 a hit, every 2 s, believed ready now. You 200
    // px off; her gun reaches 300 (0.05 a hit, 1 s cooldown, 0.5 s tell). Draw walks to 150 + 10 - 5 = 155 (45 px, 0.45 s; Ember is
    // ready, so no waiting): Ember fires into her (taken 0.2, its next cast 2 s on). Dodge: Ember flies 155 / 300 = 0.52 s, more than
    // reflex 0.15, so it succeeds 6 in 10: taken -0.12, 0.5 s, one charge spent (one spare left: no B cost).
    // Bait (taken 2, dealt 1.5, time 0.005). Draw, dodge, use 1 (the gun fires at 1.45 s, Ember cooling until 2.45): 2 x 0.08 -
    // 1.5 x 0.05 + 0.005 x 1.45 = 0.09225. Cheaper still: use 1 first (the gun reaches you at 200, out of Ember's reach: fires at
    // 0.5 s, dealt 0.05), then draw (Ember lands; its clock starts from the step's start, so next at 2.5), dodge (to 1.45 s), use 1 (the gun ready at 1.5: waits
    // 0.05, fires at 1.45 + 0.05 + 0.5 = 2.0 s, Ember cooling): 2 x 0.08 - 1.5 x 0.1 + 0.005 x 2.0 = 0.02.
    {
      const w = (o = {}) => world({ moves: [gun()], you: { threats: [o.threat || ember()], baitMoveId: 'ember', bestReach: 150, bestHit: 0.2 }, top: Object.assign({ distance: 200, own: own(o.own) }, dodgeOn) });
      const s0 = P.startState(w());
      const draws = P.actionsIn(w(), s0, null).filter((a) => a.verb === 'draw');
      ok(draws.length === 1 && draws[0].yourMove === 'ember', '16d: outside your Ember\'s reach, Draw your shot is open: ' + JSON.stringify(draws));
      const d1 = P.apply(w(), s0, draws[0]);
      ok(near(d1.step.duration, 0.45) && near(d1.step.taken, 0.2) && near(d1.state.distance, 155), '16d: draw: 0.45 s to 155 px, Ember lands (0.2): ' + JSON.stringify([d1.step.duration, d1.step.taken, d1.state.distance]));
      const dodges = P.actionsIn(w(), d1.state, d1.step).filter((a) => a.verb === 'dodge');
      ok(dodges.length === 1 && dodges[0].yourMove === 'ember', '16d: right after it, Dodge your shot is open');
      const d2 = P.apply(w(), d1.state, dodges[0]);
      ok(near(d2.step.taken, -0.12) && near(d2.step.duration, 0.5) && d2.state.chargesReady === 1, '16d: dodge: -0.2 x 0.6 = -0.12, 0.5 s, one charge spent: ' + JSON.stringify([d2.step.taken, d2.step.duration, d2.state.chargesReady]));
      const c = P.choose(w());
      ok(text(of(c, 'bait')) === 'use 1, draw, dodge, use 1' && near(of(c, 'bait').cost, 0.02), '16d: Bait is use 1, draw, dodge, use 1 at 0.02: ' + text(of(c, 'bait')) + ' ' + (of(c, 'bait') || {}).cost);
      const three = P.apply(w(), d2.state, { verb: 'use', slot: 0 }),
        threeCost = P.costOf(w(), 'bait', [d1.step, d2.step, three.step]);
      ok(three.step.effect.yourMoveCooling && near(threeCost, 0.09225), '16d: and draw, dodge, use 1 reaches Bait too, at 0.09225: ' + threeCost);
      ok(c.ranking.every((r) => r.steps.filter((s) => s.verb === 'draw').length <= 1 && r.steps.filter((s) => s.verb === 'dodge').length <= 1), '16d: Draw and Dodge at most once a plan');
      const melee = ember({ id: 'scratch', reach: 150, travelSpeed: 0 });
      const m1 = P.apply(w({ threat: melee }), P.startState(w({ threat: melee })), { verb: 'draw', yourMove: 'scratch', threat: 0, reach: 150 });
      ok(!P.actionsIn(w({ threat: melee }), m1.state, m1.step).some((a) => a.verb === 'dodge'), '16d: a hit with no flight (it lands before reflex): no Dodge your shot');
      // Ember from 30 px flies 0.1 s, under reflex 0.15: never answered; from 155 px (0.52 s) it succeeds 6 in 10
      ok(P.dodgeSuccess(w(), ember(), 30) === 0 && near(P.dodgeSuccess(w(), ember(), 155), 0.6), '16d: a planned dodge needs reflex time: 0 from 30 px, 0.6 from 155 px');
      // draw once a plan: after a draw and a back off (to 150 + 10 + 30 = 190 px, outside Ember's reach again) no second draw
      const back = P.apply(w(), d1.state, { verb: 'backOff', to: 190 });
      ok(back.state.distance > 160 && !P.actionsIn(w(), back.state, back.step).some((a) => a.verb === 'draw'), '16d: Draw at most once a plan, even back outside your reach');
      ok(!P.actionsIn(w(), back.state, back.step).some((x) => x.verb === 'dodge'), '16d: and a step between the draw and the dodge closes the dodge');
      const z = w({ own: { dodgeCharges: { ready: 0, total: 2, nextBackIn: 3 } } }),
        z1 = P.apply(z, P.startState(z), draws[0]);
      ok(!P.actionsIn(z, z1.state, z1.step).some((a) => a.verb === 'dodge'), '16d: zero charges: no Dodge your shot');
    }

    // 16e. The duels (LEADER-AI TESTS), Brock loop 1 against your Charmander, seeded. You stand still and cast whenever your move is
    // ready and Brock is inside its reach: a shot flies at him (the threat he may dodge). `main` is the move you stay on; with `cycle`
    // you alternate it with `alt`. Your HP bar reads 100, so his hits have their size. Counts: Brock's hits on you (see below), those
    // that land while `main` cools (a punish), your `main` casts. Decision 2026-11-09-52-swap-matchup-window-and-duels (option a):
    // Bait is a draw or a wait for your move, then a dodge, then a use (Brock starts inside Ember's 420 px reach, so a wait is his
    // draw); counter-play and learning run against Fire Blast (3.5 s), since your Ember's 0.7 s leaves almost no cooldown to read.
    // #59 (Jess, 2026-11-09): counter-play and learning measure the share of your `main` shots he avoids, not his hits (his casts
    // fire whenever ready in your reach, so his hits cannot depend on what you do). A shot gets through when it touches his active
    // mon's body as it is that frame (a dodge has no i-frames: it moves him 150 px and shrinks his circle), and is spent; a shot
    // that flies out its 1.5 s without touching him was avoided. Only `main` shots count (Fire Blast; your Embers every 0.7 s
    // would swamp it), and only those whose flight ended.
    {
      const reachOf = (d) => G.Gyms.reachOf(d, G.Gyms.formOf(d));
      const castYours = (d, at, e) => {
        G.SimBus.emit('move:cast', { moveId: d.id, ownerId: null, ownerUid: you[1].copyUid, ownerSlot: you[1].teamSlot, rival: false, x: at.x, y: at.y, aim: 0, enemy: false });
        const speed = (d.delivery && d.delivery.moveSpeed) || 0;
        if (!(speed > 0)) return null;
        const [ux, uy] = G.U.norm(e.x - at.x, e.y - at.y),
          x = at.x,
          y = at.y,
          s = { id: -(9e6 + G.Game.st.time * 1000), cast: { owner: human, serial: Math.round(9e6 + G.Game.st.time * 6000), moveId: d.id }, spec: { id: d.id, delivery: { motion: 'travels' } }, x, y, prevX: x, prevY: y, vx: ux * speed, vy: uy * speed, wait: 0, armed: true, shape: { family: 'point', x, y, heading: 0, r: 12 } };
        G.MoveSim.list().push(s);
        return { s, until: G.Game.st.time + 1.5, main: false };
      };
      // the harness never steps the move sim (section 9), so no shape resolves a hit: a hit of his is a damaging cast that starts
      // with you inside its reach. You stand still, so the planner's own hit chance for it is 1 (LEADER-AI COST)
      // #53 sharpness duel: a hit's size in max-HP fractions, as the leader's last snapshot reads it. 'his': his move on you;
      // 'yours': your move on his mon on the field (Belief's guess while the move is not revealed)
      const hitOf = (ai, moveId, side) => {
        const w = ai && ai.world;
        if (!w) return 0;
        const list = side === 'his' ? w.slots.flatMap((s) => s.moves) : w.you.threats || [],
          v = list.find((m) => m.id === moveId) || (side === 'yours' ? list.find((m) => m.id == null) : null);
        return v ? v.hitFraction : 0;
      };
      let counting = null;
      G.SimBus.on('move:cast', (ev) => {
        if (!counting || ev.ownerId == null) return;
        const e = counting.team.find((m) => m.id === ev.ownerId),
          d = G.MoveDefs[ev.moveId];
        if (!e || !d || !(d.basePower > 0)) return;
        if (G.U.dist(e.x, e.y, human.x, human.y) > reachOf(d) + (human.r || 0)) return;
        counting.n++;
        counting.dealt += hitOf(G.GymArena.leaderAI, ev.moveId, 'his');
      });
      const duel = ({ main = 'ember', alt = 'tackle', cycle = false, secs = 30, duelSeed = 7, trace = null } = {}) => {
        const seed0 = AI.seed;
        AI.seed = duelSeed;
        Object.assign(AI.off, { planner: false, swaps: false, dodges: false, confidence: false, triggers: false, memory: false });
        const a = open('Brock', 1, 200);
        youActive = 1;
        Object.assign(human, { hp: 100, maxHp: 100 });
        counting = { team: a.team.members, n: 0, dealt: 0 };
        const ai = G.GymArena.leaderAI,
          done = [];
        const step0 = ai.stepState.bind(ai);
        ai.stepState = (e, stp, pl) => {
          const r = step0(e, stp, pl);
          if (r === 'done') done.push({ plan: ai.plan, at: ai.plan.at, verb: stp.verb === 'wait' && stp.yourMove != null ? 'waitYours' : stp.verb, goal: ai.plan.goal });
          return r;
        };
        const mainDef = G.MoveDefs[main],
          altDef = G.MoveDefs[alt],
          cooldown = { [main]: 0, [alt]: 0 },
          flying = [];
        let next = main,
          lastMain = -99,
          mainCasts = 0,
          mainShots = 0,
          mainThrough = 0,
          hits = 0,
          punish = 0,
          taken = 0;
        const spend = (i) => {
          const L = G.MoveSim.list();
          if (L.indexOf(flying[i].s) >= 0) L.splice(L.indexOf(flying[i].s), 1);
          flying.splice(i, 1);
        };
        for (let f = 0; f < secs * 60; f++) {
          const e = a.team.active,
            t = G.Game.st.time,
            dist = G.U.dist(e.x, e.y, human.x, human.y);
          cooldown[main] -= DT;
          cooldown[alt] -= DT;
          const pick = cycle ? next : main,
            d = pick === main ? mainDef : altDef;
          if (!e.dead && cooldown[pick] <= 0 && dist <= reachOf(d) + (e.r || 0)) {
            const shot = castYours(d, human, e);
            if (shot) {
              shot.main = pick === main;
              flying.push(shot);
            }
            cooldown[pick] = d.cd;
            if (pick === main) {
              lastMain = t;
              mainCasts++;
            }
            next = pick === main ? alt : main;
          }
          for (const sh of flying) {
            sh.s.prevX = sh.s.x;
            sh.s.prevY = sh.s.y;
            sh.s.x += sh.s.vx * DT;
            sh.s.y += sh.s.vy * DT;
            sh.s.shape.x = sh.s.x;
            sh.s.shape.y = sh.s.y;
          }
          for (let i = flying.length - 1; i >= 0; i--) {
            const sh = flying[i],
              on = a.team.active;
            if (on && !on.dead && G.U.dist(sh.s.x, sh.s.y, on.x, on.y) <= sh.s.shape.r + (on.r || 0)) {
              taken += hitOf(ai, sh.s.cast.moveId, 'yours');
              if (sh.main) {
                mainShots++;
                mainThrough++;
              }
              spend(i);
            } else if (G.Game.st.time >= sh.until) {
              if (sh.main) mainShots++;
              spend(i);
            }
          }
          frame();
          human.hp = 100; // you never faint in a duel
          const got = counting.n;
          if (got > hits) {
            if (G.Game.st.time - lastMain < mainDef.cd) punish += got - hits;
            hits = got;
          }
          if (trace && f % 15 === 0) trace.push([f, ai.plan ? ai.plan.goal : null, ai.plan ? ai.stepText(ai.plan.steps[ai.plan.at]) : null, +e.x.toFixed(2), +e.y.toFixed(2)]);
        }
        for (const sh of flying) {
          const L = G.MoveSim.list();
          if (L.indexOf(sh.s) >= 0) L.splice(L.indexOf(sh.s), 1);
        }
        AI.seed = seed0;
        youActive = 0;
        const dealt = counting.dealt;
        counting = null;
        Object.assign(human, { hp: 1e6, maxHp: 1e6 });
        const avoided = mainShots ? (mainShots - mainThrough) / mainShots : 0;
        return { ai, done, mainCasts, mainShots, mainThrough, avoided, hits, punish, rate: mainCasts ? punish / mainCasts : 0, trade: dealt - taken };
      };
      // Bait emerges: a bait plan whose draw (or wait for your Ember), dodge and use steps all completed, in order, and hits during
      // Ember's cooldown
      // The plan is rebuilt on every think tick (its running action kept), so the check reads the stream of completed steps: a run of
      // them under Bait holding a draw (or a wait for your move), then a dodge, then a use.
      const baitRuns = (done) =>
        done
          .map((d) => (d.goal === 'bait' ? d.verb : '|'))
          .join(' ')
          .split('|')
          .filter((run) => /(draw|waitYours) dodge (\w+ )*?use/.test(run + ' ')).length;
      const r = duel();
      const completed = baitRuns(r.done);
      // BLOCKED on #60 (Jess, 2026-11-09): Bait is parked, since the planner never finds a planned dodge worth it at these cooldowns
      blocked(completed >= 1, '16e: Bait emerges: Brock completes a draw (or wait for your Ember), dodge, use plan (' + completed + ' times; Ember cast ' + r.mainCasts + ' times)', 60);
      ok(r.punish >= 1, '16e: and lands hits while Ember cools: ' + r.punish + ' of ' + r.hits + ' hits');
      // the planned dodge goes through the bag and reflex: every dodge press follows a read threat by reflex or more
      const notes = r.ai.log,
        early = notes.filter((d) => d.act === 'dodge' && d.serial != null && !notes.some((x) => x.act === 'threat' && x.serial === d.serial && x.read));
      ok(early.length === 0, '16e: every dodge answers a threat the bag read: ' + early.length + ' did not');
      // counter-play: cycling slots gets more of your Fire Blasts through than staying on it (cycling keeps his window for it wide).
      // Each side sums several seeded duels, since one duel holds only about a dozen Fire Blasts and one dodge would flip it.
      const SEEDS = [7, 11, 13, 17, 19],
        pct = (x) => Math.round(x * 100) + '%',
        sum = (runs) => {
          const shots = runs.reduce((t, r) => t + r.mainShots, 0),
            through = runs.reduce((t, r) => t + r.mainThrough, 0);
          return { shots, avoided: shots ? (shots - through) / shots : 0 };
        },
        stay = sum(SEEDS.map((duelSeed) => duel({ main: 'fire-blast', alt: 'ember', secs: 40, duelSeed }))),
        cyc = sum(SEEDS.map((duelSeed) => duel({ main: 'fire-blast', alt: 'ember', secs: 40, cycle: true, duelSeed })));
      ok(cyc.shots > 0 && stay.shots > 0 && cyc.avoided < stay.avoided, '16e: counter-play: cycling Fire Blast and Ember gets more Fire Blasts through than staying on it: he avoids ' + pct(cyc.avoided) + ' of ' + cyc.shots + ' vs ' + pct(stay.avoided) + ' of ' + stay.shots);
      // learning: fight 3 of a run avoids a bigger share of your Fire Blasts than fight 1 (run memory keeps the cooldown window),
      // one run per seed
      const firsts = [],
        thirds = [];
      for (const duelSeed of SEEDS) {
        G.GymArena.reset();
        G.LeaderMemory.start();
        firsts.push(duel({ main: 'fire-blast', alt: 'ember', duelSeed }));
        G.GymArena.reset();
        duel({ main: 'fire-blast', alt: 'ember', duelSeed });
        G.GymArena.reset();
        thirds.push(duel({ main: 'fire-blast', alt: 'ember', duelSeed }));
        G.GymArena.reset();
        G.LeaderMemory.end();
      }
      const f1 = sum(firsts),
        f3 = sum(thirds);
      ok(f1.shots > 0 && f3.shots > 0 && f3.avoided > f1.avoided, '16e: learning: fight 3 avoids more of your Fire Blasts than fight 1: ' + pct(f3.avoided) + ' of ' + f3.shots + ' vs ' + pct(f1.avoided) + ' of ' + f1.shots);
      // #53 SHARPNESS DUEL (D3, written at #53's start): Brock's loop 1 team with a test growth of 0.1, against your Fire Blast and
      // Ember cycle, the same 5 seeds. Only the loop his settings read changes: loop 6 holds intelligence 1.0 (0.5 + 0.1 x 5), loop 1
      // the default 0.5. His HP trade (his hits' size on you minus your hits' size on him, max-HP fractions) must be better at loop
      // 6. A fail is a tuning finding for #39, never fixed by changing this test.
      const sharpnessDuel = ({ loop, intelligenceGrowth, duelSeed }) => {
        const settings0 = AI.settings,
          pin0 = pinOldDefaults,
          growth = { intelligence: { base: AI.BASE.intelligence, growth: intelligenceGrowth } };
        AI.settings = (g) => settings0(Object.assign({}, g, { loop, ai: Object.assign({}, g && g.ai, growth) }));
        pinOldDefaults = false;
        try {
          return duel({ main: 'fire-blast', alt: 'ember', cycle: true, secs: 40, duelSeed });
        } finally {
          AI.settings = settings0;
          pinOldDefaults = pin0;
        }
      };
      const sharp = SEEDS.map((duelSeed) => sharpnessDuel({ loop: 6, intelligenceGrowth: 0.1, duelSeed })),
        dull = SEEDS.map((duelSeed) => sharpnessDuel({ loop: 1, intelligenceGrowth: 0.1, duelSeed })),
        tradeOf = (runs) => runs.reduce((t, r) => t + r.trade, 0);
      ok(near(sharp[0].ai.set.intelligence, 1) && near(dull[0].ai.set.intelligence, 0.5) && near(sharp[0].ai.set.reflex, 0.12), '16e (#53): the sharpness duel reads loop 6 at intelligence 1.0 and loop 1 at 0.5, on the same loop 1 team');
      ok(tradeOf(sharp) > tradeOf(dull), '16e (#53, D3): sharpness duel: loop 6 Brock trades better than loop 1 Brock over 5 seeds: ' + tradeOf(sharp).toFixed(3) + ' vs ' + tradeOf(dull).toFixed(3));
      // determinism: one seed, one trace
      const t1 = [],
        t2 = [];
      duel({ secs: 20, trace: t1 });
      duel({ secs: 20, trace: t2 });
      ok(JSON.stringify(t1) === JSON.stringify(t2), '16e: one seed, one trace (' + t1.length + ' samples)');
      ok(!/gapClose|decide|triggers|swapMargin/.test(Object.getOwnPropertyNames(AI.prototype).filter((k) => ['gapClose', 'decide', 'triggers', 'swapMargin'].includes(k)).join()), '16e: the old swap choice and the gap-closing dodge are gone');
      ok(['stay', 'margin', 'ccLeft', 'ccScore', 'lowHp', 'lowTo', 'lowScore', 'matchupX', 'matchupHp', 'gapClose'].every((k) => !(k in AI.BASE)) && AI.BASE.swapWill === 1, '16e: their settings are gone; swapWill 1 is the baseline');
    }
  }
  // ---------------- 17. #53 (#49 slice 4): intelligence, its curves and misjudge (docs/LEADER-AI.md "The Decider (#49)") ----------------
  // Written at the slice's start (issue #53). Expected numbers are hand-derived from decision
  // 2026-11-13-53-leader-intelligence-one-score-with-overrides and the map "53 - Intelligence and Misjudge Build Plan", never from
  // code output: two straight lines per setting, meeting at intelligence 0.5. At 0 / 0.25 / 0.5 / 0.75 / 1: misjudge 0.30 0.20
  // 0.10 0.07 0.04; reflex 0.300 0.225 0.150 0.135 0.120; dodgeRead 2 4 6 7 8; memoryUse 0.150 0.325 0.500 0.600 0.700; aimError
  // 40 25 10 7 4. The sharpness duel (D3) sits in 16e, since it reuses that duel.
  {
    const built53 = typeof AI.settingFromIntelligence === 'function' && !!AI.INTELLIGENCE_CURVES;
    ok(built53, '17: #53 is built: G.LeaderAI.settingFromIntelligence and INTELLIGENCE_CURVES defined');
    if (built53) {
      const FIVE = ['misjudge', 'reflex', 'dodgeRead', 'memoryUse', 'aimError'],
        AT = [0, 0.25, 0.5, 0.75, 1],
        WANT = {
          misjudge: [0.3, 0.2, 0.1, 0.07, 0.04],
          reflex: [0.3, 0.225, 0.15, 0.135, 0.12],
          dodgeRead: [2, 4, 6, 7, 8],
          memoryUse: [0.15, 0.325, 0.5, 0.6, 0.7],
          aimError: [40, 25, 10, 7, 4],
        },
        gymWith = (ai, loop) => ({ leader: 'Test', loop, ai });
      // 17a. the curves, their limits and the default
      const offCurve = [];
      for (const k of FIVE)
        AT.forEach((x, i) => {
          const v = AI.settingFromIntelligence(k, x);
          if (!near(v, WANT[k][i])) offCurve.push(k + ' at ' + x + ' = ' + v);
        });
      ok(!offCurve.length, '17a: each curve at 0, 0.25, 0.5, 0.75 and 1' + (offCurve.length ? ': ' + offCurve.join(', ') : ''));
      ok(Object.keys(AI.INTELLIGENCE_CURVES).sort().join() === FIVE.slice().sort().join(), '17a: the curves drive exactly the five settings: ' + Object.keys(AI.INTELLIGENCE_CURVES).join(', '));
      ok(AI.BASE.intelligence === 0.5 && near(AI.REFLEX_FLOOR_SECONDS, 0.1) && near(AI.INTELLIGENCE_GROWTH_MAX, 0.2) && AI.OVERRIDE_WARN_AT === 3, '17a: default intelligence 0.5, reflex floor 0.1 s, growth limit 0.2 per loop, a warning at 3 overrides');
      // 17b. intelligence for a loop: base + growth x (loop - 1), held inside 0 to 1
      const loops = [1, 2, 3, 4, 5, 6].map((loop) => AI.settings(gymWith({ intelligence: { base: 0.5, growth: 0.1 } }, loop)).intelligence);
      ok(loops.every((v, i) => near(v, 0.5 + 0.1 * i)), '17b: base 0.5, growth 0.1, loops 1 to 6: ' + loops.join(' '));
      const held = AI.settings(gymWith({ intelligence: { base: 0.9, growth: 0.1 } }, 6));
      ok(near(held.intelligence, 1) && near(held.reflex, 0.12), '17b: base 0.9, growth 0.1 holds at 1.0: ' + held.intelligence);
      const top = AI.settings(gymWith({ intelligence: { base: 0.5, growth: 0.1 } }, 6)),
        topOff = FIVE.filter((k) => !near(top[k], WANT[k][4]));
      ok(!topOff.length, "17b: loop 6 at 1.0 reads every curve's top" + (topOff.length ? ': ' + topOff.join(', ') : ''));
      ok(near(AI.settings(gymWith({ intelligence: 0.25 }, 4)).reflex, 0.225), '17b: a plain number is a base with no growth');
      // 17c. an override leaves the curve and its growth; the other four follow the curve
      const over = [1, 3, 6].map((loop) => AI.settings(gymWith({ intelligence: { base: 0.5, growth: 0.1 }, reflex: 0.13 }, loop)));
      ok(over.every((s) => s.reflex === 0.13), '17c: an authored reflex 0.13 stays 0.13 at loops 1, 3 and 6');
      ok(near(over[0].misjudge, 0.1) && near(over[2].misjudge, 0.04) && near(over[2].dodgeRead, 8) && near(over[2].memoryUse, 0.7) && near(over[2].aimError, 4), '17c: while the other four follow the curve');
      ok(AI.settings(gymWith({ reflex: { 1: 0.2, 3: 0.14 } }, 4)).reflex === 0.14, '17c: an override keyed by loop takes its last earlier loop');
      // 17d. the default leader, Misty and Brock (none authors intelligence): R1 and R2, the other three unchanged
      const defaults = [
        ['the default leader', AI.settings({ loop: 1 })],
        ['Misty loop 2', AI.settings(Object.assign({}, K[gymIdx('Misty')], { loop: 2 }))],
        ['Brock loop 1', AI.settings(Object.assign({}, K[gymIdx('Brock')], { loop: 1 }))],
      ];
      for (const [who, s] of defaults)
        ok(near(s.misjudge, 0.1) && s.aimError === 10 && s.reflex === 0.15 && s.dodgeRead === 6 && s.memoryUse === 0.5, '17d: ' + who + ': misjudge 0.10, aimError 10, reflex 0.15, dodgeRead 6, memoryUse 0.5: ' + FIVE.map((k) => s[k]).join(' '));
      // 17e. fractional dodge reads: whole reads per bag, readCarry adds the fraction at each new bag (a counter, not dice)
      const perBag = (reads, seed, bags) => {
        const b = new AI.Bag(reads, seed),
          out = [];
        for (let k = 0; k < bags; k++) {
          let n = 0;
          for (let i = 0; i < AI.BAG; i++) n += b.next() ? 1 : 0;
          out.push(n);
        }
        return out;
      };
      const frac = perBag(6.4, 3, 10);
      ok(frac.join(' ') === '6 6 7 6 7 6 6 7 6 7', '17e: dodgeRead 6.4, bags 1 to 10: ' + frac.join(' '));
      ok(frac.reduce((t, n) => t + n, 0) === 64, '17e: exactly 64 reads per 100 threats');
      // a whole count shuffles as the Bag did before #53: the same seeded order (that shuffle, copied here as the reference)
      const oldOrder = (reads, seed, count) => {
        let s = seed >>> 0;
        const rng = () => {
          let z = (s = (s + 0x6d2b79f5) >>> 0);
          z = Math.imul(z ^ (z >>> 15), z | 1);
          z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
          return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
        };
        const out = [];
        while (out.length < count) {
          const a = [];
          for (let i = 0; i < AI.BAG; i++) a.push(i < reads);
          for (let i = AI.BAG - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          out.push(...a);
        }
        return out.slice(0, count).join();
      };
      const newOrder = (reads, seed, count) => {
        const b = new AI.Bag(reads, seed);
        return Array.from({ length: count }, () => b.next()).join();
      };
      ok([1, 2, 3, 4, 5].every((sd) => newOrder(6, sd, 30) === oldOrder(6, sd, 30) && newOrder(7, sd, 30) === oldOrder(7, sd, 30)), '17e: a whole dodgeRead 6 (and predictCap 7) gives the same sequence as before #53, for 5 seeds');
      // 17f. the validator (D2, T1, T2): refused, then accepted
      const misty = K[gymIdx('Misty')],
        errs = (ai) => G.Gyms.validate(Object.assign({}, misty, { ai })),
        n0 = errs(undefined).length,
        refused = (ai, re) => errs(ai).some((s) => re.test(s));
      ok(refused({ intelligence: 1.5 }, /ai intelligence/), '17f: intelligence 1.5 is refused');
      ok(refused({ intelligence: { base: 0.5, growth: 0.3 } }, /ai intelligence/), '17f: growth 0.3 is refused (D2: 0 to 0.2 per loop)');
      ok(refused({ intelligence: { base: 0.5, growth: -0.1 } }, /ai intelligence/), '17f: negative growth is refused (D2)');
      ok(refused({ intelligence: { base: 1.2 } }, /ai intelligence/) && refused({ intelligence: { base: 0.5, speed: 1 } }, /ai intelligence/), '17f: a base above 1, or an unknown key in it, is refused');
      ok(refused({ misjudge: 2 }, /ai misjudge is from 0 to 1/), '17f: misjudge 2 is refused');
      ok(refused({ reflex: 0.05 }, /ai reflex is at least 0\.1/) && refused({ reflex: { 1: 0.2, 3: 0.05 } }, /ai reflex is at least/), '17f: a reflex under the 0.1 s floor is refused, keyed by loop too');
      ok(refused({ dodgeRead: 11 }, /ai dodgeRead is from 0 to 10/), '17f: dodgeRead 11 is refused');
      ok(refused({ triggers: [{ on: 'start', set: { intelligence: 0.9 } }] }, /set intelligence does nothing/), '17f: T1: a trigger may not set intelligence (it resolves once, at fight start)');
      ok(refused({ triggers: [{ on: 'start', set: { reflex: 0.05 } }] }, /set reflex is at least/), '17f: T2: a trigger may not set reflex under the floor');
      const fine = [
          { intelligence: 0.7 },
          { intelligence: { base: 0.4, growth: 0.2 } },
          { intelligence: { growth: 0.1 } },
          { misjudge: 0.2, reflex: 0.1, dodgeRead: 6.4 },
          { triggers: [{ on: 'start', set: { reflex: 0.2, misjudge: 0.3 } }] },
        ],
        notFine = fine.filter((ai) => errs(ai).length !== n0);
      ok(!notFine.length, '17f: and accepts the shapes above' + (notFine.length ? ': refused ' + JSON.stringify(notFine) : ''));
      // 17g. the override warning (a dev warning at fight start, never a block)
      const warnOf = (ai) => AI.intelligenceOverrideWarning(gymWith(ai, 1)),
        three = warnOf({ reflex: 0.2, dodgeRead: 7, memoryUse: 0.6 });
      ok(typeof three === 'string', '17g: 3 of the five authored directly: a warning: ' + three);
      ok(warnOf({ reflex: 0.2, dodgeRead: 7, aggression: 0.9, range: 200 }) === null && warnOf(undefined) === null, '17g: 2 of them (plus style settings), or none: no warning');
      const arenaCode = fs.readFileSync(process.env.LA_ARENA || path.join(R, 'js/systems/gym-arena.js'), 'utf8');
      ok(/intelligenceOverrideWarning\(first\.gym\)/.test(arenaCode), '17g: the arena raises it at fight start, beside teamItemWarn');
      // 17h. A1: Belief's snapshot carries misjudge, and the overlay shows the chosen plan's noise
      pinOldDefaults = false;
      open('Misty', 2, 40);
      const mistyAI = G.GymArena.leaderAI;
      run(1);
      pinOldDefaults = true;
      ok(!!mistyAI.world && near(mistyAI.world.misjudge, 0.1), "17h: Belief's snapshot carries misjudge 0.1: " + (mistyAI.world && mistyAI.world.misjudge));
      ok(mistyAI.overlayLines().some((l) => /^ {2}noise -?\d\.\d\d \(misjudge 0\.10\)$/.test(l)), "17h: the overlay shows the chosen plan's noise: " + mistyAI.overlayLines().join(' / '));
      // 17i. the noise in the planner, on section 15's hand-made worlds. One draw per plan path per tick: the draw count equals the
      // plan count, so a plan scored for two goals carries one noise (a draw per goal would read more)
      const counted = (seed) => {
        const source = P.seeded(seed);
        let reads = 0;
        const draw = () => {
          reads++;
          return source();
        };
        draw.reads = () => reads;
        return draw;
      };
      const quiet = counted(9),
        quietZero = counted(9);
      P.choose(world(), null, null, quiet);
      P.choose(world({ top: { misjudge: 0 } }), null, null, quietZero);
      ok(quiet.reads() === 0 && quietZero.reads() === 0, '17i: with misjudge absent or 0 the noise source is never read');
      const source = counted(9),
        noisy = P.choose(world({ top: { misjudge: 0.1 } }), null, null, source);
      ok(source.reads() === noisy.nodes, '17i: one draw per plan path per tick: ' + source.reads() + ' draws for ' + noisy.nodes + ' plans');
      ok(noisy.ranking.every((c) => Math.abs(c.noise) <= 1 && Math.abs(c.misreadCost - c.cost) <= 0.1 * Math.abs(c.cost) + 1e-12), '17i: every misread cost is within misjudge (0.1) of its cost');
      ok(noisy.ranking.some((c) => c.misreadCost !== c.cost) && noisy.ranking.every((c) => near(c.score, c.value - c.misreadCost)), '17i: the ranking reads the misread cost, and the true cost is kept');
      const replay = (seed) => JSON.stringify(P.choose(world({ top: { misjudge: 0.1 } }), null, null, P.seeded(seed)).ranking.map((c) => [c.goal, c.misreadCost]));
      ok(replay(1) === replay(1) && replay(1) !== replay(2), '17i: one seed, one misread; another seed, another');
      ok(noisy.chosenPlanNoise === (noisy.pick ? noisy.pick.noise : 0), "17i: choose returns the pick's noise for the overlay");
      // 17j. its own source: randomness's draws and the dodge bag are untouched by 2 s of misjudged plans; pinned at misjudge 0, a
      // fight never reads it (so 15j and 16e replay as before)
      const seed0 = AI.seed;
      AI.seed = 7;
      pinOldDefaults = false;
      open('Brock', 1, 160);
      const brock7 = G.GymArena.leaderAI;
      run(2);
      pinOldDefaults = true;
      ok(brock7.misjudgeSource !== brock7.draw && brock7.draw() === P.seeded((7 ^ 0x2545f491) >>> 0)() && brock7.bag.s === 7, "17j: misjudge has its own source: randomness's next draw is still its first, the dodge bag unread");
      ok(!!brock7.choice && brock7.choice.ranking.some((c) => c.misreadCost !== c.cost), '17j: at misjudge 0.1 its plans are misread in a fight');
      open('Brock', 1, 160);
      const pinned7 = G.GymArena.leaderAI,
        source7 = pinned7.misjudgeSource;
      let pinnedReads = 0;
      pinned7.misjudgeSource = () => {
        pinnedReads++;
        return source7();
      };
      run(2);
      AI.seed = seed0;
      ok(pinnedReads === 0, '17j: at misjudge 0 a fight never reads the noise source: ' + pinnedReads + ' reads');
      // 17k. a real fight with misjudge on: one seed, one trace; another seed, another trace
      const noiseTrace = (duelSeed) => {
        const s0 = AI.seed;
        AI.seed = duelSeed;
        pinOldDefaults = false;
        open('Brock', 1, 160);
        const ai = G.GymArena.leaderAI,
          out = [];
        for (let f = 0; f < 10 * 60; f++) {
          if (f % 90 === 0) G.SimBus.emit('move:cast', { moveId: 'vine-whip', ownerId: null, ownerUid: you[0].copyUid, ownerSlot: you[0].teamSlot, rival: false, x: human.x, y: human.y, aim: 0, enemy: false });
          frame();
          if (f % 15 === 0) out.push([ai.plan ? ai.plan.goal : null, ai.choice ? +ai.choice.chosenPlanNoise.toFixed(6) : null]);
        }
        pinOldDefaults = true;
        AI.seed = s0;
        return JSON.stringify(out);
      };
      ok(noiseTrace(7) === noiseTrace(7), '17k: misjudge on: one seed, one trace');
      ok(noiseTrace(7) !== noiseTrace(8), '17k: and another seed gives another trace');
    }
  }
}

console.log((fail ? 'leader-ai-harness: ' + fail + ' of ' + n + ' FAILED' : 'leader-ai-harness: all ' + n + ' passed') + (blockedN ? ' (' + blockedN + ' blocked)' : ''));
process.exit(fail ? 1 : 0);
