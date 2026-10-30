// Move schema slice 4d (emitters, mines and the instance cap), offline checks (Node only). Usage from the repo root:
//   node docs/proposals/move-emit-harness.js .
// Same engine setup and stubs as move-travel-harness.js (the REAL stats, enemy, player, status and stage files plus the move data chain,
// G.MoveGeom, G.MoveSim, G.MoveEffects and G.SimBus). Checks (slice-4d.md Tests): Meteor Mash (1 parent hit and 0 shard hits on the struck
// enemy, 3 shards at the impact point, R6 deferral); Toxic Spikes (11 emissions in 3 s, 0.125 s to an enemy at 150 px, none at 250 px, a
// plate with no hitbox); Discharge (two rings 0.2 s apart, the shapeless emitter of H4); Toxic and Flame Wheel (patch count follows owner
// moving time); Spikes (the 9th mine removes the slot's oldest, H6; contact trigger; the new notActive check); Gust (D-GUST: 3 shots at
// once at -0.25, 0, +0.25 rad, full parent power, H13); Will-O-Wisp (interval first at every, shot range 300); D-LOC (caster's feet);
// the D29 schedule (H14, the count cap, several emissions in one step); determinism; the termination trigger (test 11). Expected values are derived by hand from the data,
// MOVE-INTENT and the D-table (formulas in the comments), never copied from a run. The mutation runner (move-emit-mutate.js) points
// EMIT_SIM, EMIT_FX and EMIT_GEOM at altered copies; every mutation must make this harness fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/move-sim.js': 'EMIT_SIM', 'js/systems/move-effects.js': 'EMIT_FX', 'js/systems/move-geom.js': 'EMIT_GEOM' };
const load = p => { const f = process.env[SRC[p]] || R + '/' + p; vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: p }); };
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
const DEX_BY = { 1: { name: 'Normie', types: ['normal'], stats: [50, 50, 50, 50, 50, 65] } };
global.window = global; global.location = { search: '?dev' };
let seed = 4242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; Math.random = rnd;
const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
let enemies = [];
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => a + (b - a) * rnd(), randInt: (a, b) => a + Math.floor((b - a + 1) * rnd()),
    pickN: a => a, damp: (a, b) => b, norm: (x, y) => { const n = Math.hypot(x, y) || 1; return [x / n, y / n]; }, dist: (a, b, c, d) => Math.hypot(a - c, b - d),
    dist2: (a, b, c, d) => (a - c) * (a - c) + (b - d) * (b - d), hash: () => 0.5, pick: a => a[0] },
  DEX_BY, DEX: [], FX: { dmgText() {}, spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {} },
  Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, dirFromAngle: () => 0 },
  Weather: { mult: () => 1, speedFor: () => 1, force() {} }, Game: new Proxy({ everyone: () => [] }, { get: (t, k) => (k in t ? t[k] : noop) }),
  Audio: { sfx() {} }, Camera: { kick() {} }, Log: { on: false },
  World: { collide: () => false, isLiquid: () => false, isFree: () => true, projectileBlock: () => null, propsInCircle: () => [] } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
for (const p of ['js/core/stats.js', 'js/data/enemies.js', 'js/data/types.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/player.js',
  'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js',
  'js/data/move-resolver.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js']) { try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } }
G.EnemyMgr = { all: () => enemies, queryCircle(x, y, r) { const o = []; this.queryCircleEach(x, y, r, e => o.push(e)); return o; },
  queryCircleEach(x, y, r, fn) { for (const e of enemies.slice()) if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= (r + e.r) ** 2) fn(e); } };
const REAL = G.MoveDefs;
G.MoveDefs = Object.assign({}, REAL);     // synthetic moves sit beside the real ones in a copy of the container; the real defs stay frozen (I2)
const St = G.Status, S = G.Stages, Sim = G.MoveSim, Enemy = G.Enemy, D = G.MoveDefs; Enemy.prototype.die = function () { this.dead = true; };
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 60) console.log('FAIL', m); } };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const TAU = Math.PI * 2, DTS = [1 / 60, 1 / 30], dtName = dt => (dt === 1 / 60 ? '1/60' : '1/30');

// ---- builders (owner: a REAL Player prototype on a hand-built body, as in move-selfcast-harness.js; `act` picks the active group) ----
let eid = 0;
const mkE = (x, y, o = {}) => { const e = new Enemy({ dex: 1, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'chase' }, x, y, { t: 0, dmg: 1, hp: 1, spd: 1 }, false);
  e.maxHp = e.hp = 1e9; e.id = ++eid; if (!(e.r > 0)) e.r = 10; return Object.assign(e, o); };
const mkP = (groups, o = {}) => Object.assign(Object.create(G.Player.prototype), { id: 'p1', x: 0, y: 0, r: 12, bodyH: 20, aim: 0, level: 30, cdMul: 1,
  critChance: 0, dead: false, benched: false, stgTeam: {}, stg: null, moveRadiusMul: 1, hp: 500, maxHp: 1000, invuln: 0, flash: 0, dmgReduce: 0, shield: null, mvRoot: false,
  mon: { types: ['normal'] }, inc: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, badge: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, baseSpd: 100, spdMul: 1,
  inLiquid: false, runItems: [], item: null, sashT: -1e9, anim: { play() {} }, slots: groups.map(g => g.map(id => ({ id, t: 0 }))), act: 0,
  activeGroup() { return this.slots[this.act] || []; }, moveFactor(m) { return G.Stats.attackFactor(84, 109, this.level, m, 1.1); }, stabFor() { return false; }, onDealt() {} }, o);
const syn = (id, def) => { D[id] = Object.assign({ id, name: id, type: 'normal', category: 'physical', power: 40, basePower: 40, hitPolicy: 'oncePerInstance', payload: [{ t: 'damage' }] }, def); return id; };

/** Ticks the owner for `secs` (each event on the tape is stamped with its time). Before the sim each frame the player's invuln counts
 *  down, as player.update does (game.js runs it first). slide: enemies slide on their knockback velocity with enemy.js's decay. */
function run(o, es, secs, { dt = 1 / 60, each = null, reset = true, rng = () => 0.99, slide = false } = {}) {
  if (es) enemies = es;
  if (reset) Sim.clear();
  Sim.setRng(rng); Sim.setView(null); Sim.setFilter(() => true);
  const tape = G.SimBus.record(), N = Math.round(secs / dt); let seen = 0;
  for (let k = 1; k <= N; k++) {
    const t = (o.clock = (o.clock || 0) + dt);
    if (o.invuln > 0) o.invuln -= dt;
    Sim.tick(dt, o, t); S.tick(o, dt);
    for (const e of enemies) if (!e.dead) {
      S.tick(e, dt);
      if (slide) { e.x += e.kx * dt; e.y += e.ky * dt; const f = Math.pow(Enemy.KNOCK_DECAY, dt); e.kx *= f; e.ky *= f; }
    }
    for (; seen < tape.length; seen++) tape[seen].t = t;
    if (each) each(k, t);
  }
  G.SimBus.stopRecording();
  return tape;
}
const ofMove = id => Sim.list().filter(i => i.spec.id === id);
const ends = (tape, why) => tape.filter(e => e.type === 'move:end' && (!why || e.reason === why));
const hitsOf = (tape, id) => tape.filter(e => e.type === 'move:hit' && (id == null || e.moveId === id));
const castsOf = (tape, id) => tape.filter(e => e.type === 'move:cast' && (id == null || e.moveId === id));

const inst1 = id => ofMove(id)[0] || null;
const counter = (v = 0.5) => { const f = () => { f.calls++; return v; }; f.calls = 0; return f; };
const between = (t, a, b) => t != null && t >= a - 1e-9 && t <= b + 1e-9;
const firstHit = (tape, e, id) => { const h = hitsOf(tape, id).find(x => x.enemyId === e.id); return h ? h.t : null; };
const hitCount = (tape, e, id) => hitsOf(tape, id).filter(x => x.enemyId === e.id).length;

// ---- slice 4d ----
const GU = 'gust', FW = 'fairy-wind', DC = 'discharge', TX = 'toxic', FL = 'flame-wheel', TS = 'toxic-spikes', WW = 'will-o-wisp', MM = 'meteor-mash', SK = 'spikes';
const NINE = [DC, GU, FW, TX, FL, TS, WW, MM, SK];
const emitsIn = (tape, id) => tape.filter(e => e.type === 'move:emit' && (id == null || e.moveId === id));
const kidsOf = id => Sim.list().filter(i => i.spec.id === id && i.cast.parent != null);

// 0. data: the D-GUST and D-LOC rulings and the Will-O-Wisp shot range reach the resolved defs
{ const g = REAL[GU].payload.find(f => f.t === 'emit');
  ok(g.trigger === 'cast' && g.count === 1 && g.move.space.count === 3 && near(g.move.space.spread, 0.5), 'D-GUST: one cast emission of 3 shapes in a 0.5 rad fan');
  ok([SK, TS, WW].every(id => REAL[id].delivery.locationPick === 'caster'), "D-LOC: Spikes, Toxic Spikes and Will-O-Wisp land at the caster's feet");
  ok(REAL[WW].payload.find(f => f.t === 'emit').move.delivery.range === 300, "Will-O-Wisp's shot range is 300 (Jess 2026-10-30)");
  console.log('0 data: D-GUST, D-LOC and the Will-O-Wisp shot range'); }

// 1. Meteor Mash (MOVE-INTENT meteor-mash, R6): the punch stops on A (pierce 0); 3 shards leave A's position at -0.3, 0, +0.3 rad
//    (spread 0.6 around heading 0) and ignore A. B sits on the 0 line, C and E on the side lines, 100 px from the impact point
//    (the lines are 100 sin 0.3 = 29.6 px apart there, more than shard 6 + enemy 10).
{ for (const dt of DTS) {
    const c3 = Math.cos(0.3), s3 = Math.sin(0.3);
    const A = mkE(100, 0), B = mkE(200, 0), C = mkE(100 + 100 * c3, -100 * s3), E = mkE(100 + 100 * c3, 100 * s3);
    let seen = null;
    const tape = run(mkP([[MM]], { cdMul: 100 }), [A, B, C, E], 1.0, { dt, each: () => { const k = kidsOf(MM); if (!seen && k.length) seen = k.map(i => ({ age: i.age, x: i.x, y: i.y, h: i.heading })); } });
    const em = emitsIn(tape, MM);
    ok(hitCount(tape, A, MM) === 1, 'dt ' + dtName(dt) + ': the struck enemy takes 1 parent hit and 0 shard hits (' + hitCount(tape, A, MM) + ')');
    ok(em.length === 1 && em[0].count === 3 && near(em[0].x, 100) && near(em[0].y, 0), 'dt ' + dtName(dt) + ': one emission of 3 shards at the impact point (100, 0)');
    ok(seen && seen.length === 3 && seen.every(s => s.age === 0 && near(s.x, 100) && near(s.y, 0)), 'dt ' + dtName(dt) + ': R6, the shards join at the end of the step (age 0) at the impact point');
    ok(seen && [-0.3, 0, 0.3].every((a, i) => near(seen[i].h, a, 1e-12)), 'dt ' + dtName(dt) + ': the shard fan is 0.6 rad around the punch heading');
    ok([B, C, E].every(e => hitCount(tape, e, MM) === 1), 'dt ' + dtName(dt) + ': each shard hits the enemy on its line once');
    ok(ends(tape, 'pierce').length === 4, 'dt ' + dtName(dt) + ': the punch and the three shards end by pierce');
  }
  console.log('1 Meteor Mash: 1 parent hit, 0 shard hits, 3 shards at the impact point'); }

// 2. Toxic Spikes (MOVE-INTENT toxic-spikes): interval every 0.25 over 3 s, first at 0.25, never at 3.0 (H14): 11 emissions. A ring is
//    100 px growing 400 px/s for 0.25 s, so it reaches 150 px (enemy radius 0) at age 0.125 and never 250 px (it ends at 200).
{ for (const dt of DTS) {
    const A = mkE(150, 0, { r: 0 }), B = mkE(250, 0, { r: 0 }), C = mkE(20, 0);
    let plate = null;
    const tape = run(mkP([[TS]], { cdMul: 100 }), [A, B, C], 3.6, { dt, each: k => { if (k === 1) plate = inst1(TS); } });
    const em = emitsIn(tape, TS), hA = hitsOf(tape, TS).filter(h => h.enemyId === A.id);
    ok(em.length === 11, 'dt ' + dtName(dt) + ': 11 emissions in 3 s (first at 0.25, none at 3.0) (' + em.length + ')');
    ok(em.every((e, k) => between(e.t, 0.25 * (k + 1), 0.25 * (k + 1) + dt) && e.x === 0 && e.y === 0 && e.count === 1), 'dt ' + dtName(dt) + ": emission k at 0.25 k s, at the plate (the caster's feet)");
    ok(hA.length === 11 && hA.every((h, k) => between(h.t - em[k].t, 0.125, 0.125 + dt)), 'dt ' + dtName(dt) + ': every ring reaches the enemy at 150 px 0.125 s after its emission (to the next step)');
    ok(hitCount(tape, B, TS) === 0, 'dt ' + dtName(dt) + ': no ring reaches 250 px');
    ok(hitCount(tape, C, TS) === 11 && plate && !tape.some(e => e.type === 'move:hit' && e.instId === plate.id), 'dt ' + dtName(dt) + ': the plate never hits (a pure emitter); the enemy on it takes the 11 rings only');
    ok(ends(tape, 'time').length === 12, 'dt ' + dtName(dt) + ': the plate and its 11 rings end by time');
  }
  console.log('2 Toxic Spikes: 11 emissions, 0.125 s to 150 px, none at 250 px, a plate with no hitbox'); }

// 3. Discharge: a shapeless caster emitter (H4), cast trigger every 0.2 count 2, life 0.6: rings at activation and at 0.2 s. A ring
//    grows to 220 px, so an enemy at 100 px is hit by each and one at 300 px (230 with its radius) by neither.
{ for (const dt of DTS) {
    const A = mkE(100, 0), B = mkE(300, 0);
    let root = null;
    const tape = run(mkP([[DC]], { cdMul: 100 }), [A, B], 1.0, { dt, each: k => { if (k === 1) root = inst1(DC); } });
    const em = emitsIn(tape, DC);
    ok(em.length === 2 && between(em[0].t, dt, dt) && between(em[1].t, 0.2, 0.2 + dt), 'dt ' + dtName(dt) + ': two rings, at activation and 0.2 s later');
    ok(hitCount(tape, A, DC) === 2 && hitCount(tape, B, DC) === 0, 'dt ' + dtName(dt) + ': each ring hits the enemy at 100 px once; 300 px is out');
    ok(root && root.shape === null && root.cast.parent == null && !tape.some(e => e.type === 'move:hit' && e.instId === root.id), 'dt ' + dtName(dt) + ': the emitter is its own shapeless instance (H4) and never hits');
    ok(ends(tape, 'time').length === 3, 'dt ' + dtName(dt) + ': the emitter and both rings end by time');
  }
  console.log('3 Discharge: two rings 0.2 s apart'); }

// 4. trails (casterMove, D29): one patch per `every` s of owner MOVING time. The owner walks 100 px/s for 1 s, then stands for 1 s:
//    Toxic floor(1 / 0.1) = 10 patches, Flame Wheel floor(1 / 0.12) = 8, all on the path, none once it stops.
{ for (const [id, every, want] of [[TX, 0.1, 10], [FL, 0.12, 8]]) for (const dt of DTS) {
    const o = mkP([[id]]), N = Math.round(1 / dt);
    const tape = run(o, [mkE(0, 400)], 2.0, { dt, each: k => { if (k <= N) o.x += 100 * dt; } });
    const em = emitsIn(tape, id);
    ok(em.length === want, 'dt ' + dtName(dt) + ': ' + id + ' lays ' + want + ' patches in 1 s of moving (every ' + every + ' s of moving time) (' + em.length + ')');
    ok(em.every(e => e.y === 0 && e.x > 0 && e.x <= 100 + 1e-9 && e.t <= 1 + dt + 1e-9), 'dt ' + dtName(dt) + ': ' + id + ' patches lie on the path and stop when the owner stops');
    ok(castsOf(tape, id).length === 1, 'dt ' + dtName(dt) + ': ' + id + ' is one persistent emitter (one cast)');
  }
  console.log('4 trails: patch count follows owner moving time (Toxic 10, Flame Wheel 8 per moving second)'); }

// 5. Spikes (MOVE-INTENT spikes, H6): no timeout; cd 1.1 casts at 0, 1.1, ... so 9 by 9.5 s: the 9th removes the slot's oldest, 8 live.
//    An enemy that steps on a mine is trapped once and the mine is gone; a mine ends when its slot leaves the active group.
{ for (const dt of DTS) {
    let first = null;
    const o = mkP([[SK]]), tape = run(o, [mkE(300, 0)], 9.5, { dt, each: () => { if (!first) first = inst1(SK); } });
    const capEnds = ends(tape, 'cap');
    ok(castsOf(tape, SK).length === 9 && capEnds.length === 1 && ofMove(SK).length === 8, 'dt ' + dtName(dt) + ': the 9th mine removes one, 8 stay live (cap ' + G.MoveResolver.TUNING.INSTANCE_CAP + ')');
    ok(first && capEnds[0] && capEnds[0].instId === first.id, 'dt ' + dtName(dt) + ": the removed mine is the slot's oldest");
    const tape2 = run(o, null, 1.1, { dt, reset: false });
    ok(ends(tape2, 'cap').length === 1 && ofMove(SK).length === 8, 'dt ' + dtName(dt) + ': a 10th cast removes the next oldest, still 8 live');
    const A = mkE(300, 0), tape3 = run(mkP([[SK]], { cdMul: 100 }), [A], 0.6, { dt, each: k => { if (k === 5) A.x = 30; } });
    ok(hitCount(tape3, A, SK) === 1 && ends(tape3, 'triggered').length === 1 && St.rooted(A) && ofMove(SK).length === 0, 'dt ' + dtName(dt) + ': an enemy steps on the mine: one trap hit, the mine is gone (triggered)');
    const p = mkP([[SK], []], { cdMul: 100 }), tape4 = run(p, [mkE(300, 0)], 0.6, { dt, each: k => { if (k === 6) p.act = 1; } });
    ok(ends(tape4, 'notActive').length === 1 && ofMove(SK).length === 0, 'dt ' + dtName(dt) + ': the mine leaves when its slot leaves the active group (notActive)');
  }
  console.log('5 Spikes: cap 8 (oldest out), contact trigger, notActive'); }

// 6. Gust (D-GUST, H13): one emission at activation of 3 shots at -0.25, 0, +0.25 rad from the owner (spread 0.5, the total fan).
//    At 150 px the lines are 150 sin 0.25 = 37 px apart (more than shot 7 + enemy 10), so each shot meets only the enemy on its line.
{ for (const dt of DTS) {
    const a = 0.25, P = ang => mkE(150 * Math.cos(ang), 150 * Math.sin(ang)), A = P(-a), B = P(0), C = P(a);
    let seen = null;
    const tape = run(mkP([[GU]], { cdMul: 100 }), [A, B, C], 0.8, { dt, each: () => { const k = kidsOf(GU); if (!seen && k.length) seen = k.map(i => ({ age: i.age, h: i.heading, x: i.x, y: i.y, spec: i.spec })); } });
    const em = emitsIn(tape, GU);
    ok(em.length === 1 && em[0].count === 3 && between(em[0].t, dt, dt), 'dt ' + dtName(dt) + ': one emission of 3 at activation');
    ok(seen && seen.length === 3 && [-a, 0, a].every((h, i) => near(seen[i].h, h, 1e-12)) && seen.every(s => s.age === 0 && s.x === 0 && s.y === 0), 'dt ' + dtName(dt) + ': the 3 shots start together at the owner, at -0.25, 0 and +0.25 rad');
    ok(seen && REAL[GU].basePower === 40 && seen.every(s => s.spec.id === GU && s.spec.type === 'flying' && s.spec.basePower === 40), 'dt ' + dtName(dt) + ": H13, each shot carries the parent's identity and full power (40)");
    ok([A, B, C].every(e => hitCount(tape, e, GU) === 1) && ends(tape, 'pierce').length === 3, 'dt ' + dtName(dt) + ': each shot hits the enemy on its own line once (pierce 0)');
  }
  console.log('6 Gust: three shots at once in a 0.5 rad fan, full power each'); }

// 7. Will-O-Wisp: a turret living 6 s, interval every 0.8 (first at 0.8, H4): 0.8 to 5.6 is 7 shots, each at the nearest enemy within
//    300 px. An enemy at 350 px passes the 420 px placement gate but is never shot.
{ for (const dt of DTS) {
    const A = mkE(200, 0), B = mkE(350, 0);
    const tape = run(mkP([[WW]], { cdMul: 100 }), [A, B], 6.6, { dt });
    const em = emitsIn(tape, WW);
    ok(em.length === 7 && em.every((e, k) => between(e.t, 0.8 * (k + 1), 0.8 * (k + 1) + dt) && e.x === 0 && e.y === 0), 'dt ' + dtName(dt) + ": 7 shots in 6 s, first at 0.8 s, from the turret at the caster's feet");
    ok(hitCount(tape, A, WW) === 7 && hitCount(tape, B, WW) === 0, 'dt ' + dtName(dt) + ': every shot goes to the nearest enemy within 300 px');
    ok(ends(tape, 'time').length === 1 && ends(tape, 'pierce').length === 7, 'dt ' + dtName(dt) + ': the turret ends at 6 s, each shot on its hit');
    const t2 = run(mkP([[WW]], { cdMul: 100 }), [mkE(350, 0)], 6.6, { dt });
    ok(castsOf(t2, WW).length === 1 && emitsIn(t2, WW).length === 0 && hitsOf(t2, WW).length === 0, 'dt ' + dtName(dt) + ': an enemy at 350 px lets the turret be placed but is never shot');
  }
  console.log('7 Will-O-Wisp: a turret at your feet, shots within 300 px'); }

// 8. D-LOC: the three placed moves sit at the owner's position at the cast, not on the enemy
{ for (const id of [SK, TS, WW]) {
    const o = mkP([[id]], { cdMul: 100, x: 37, y: -12 });
    let at = null; run(o, [mkE(237, -12)], 0.05, { each: k => { if (k === 1) { const i = inst1(id); at = i && [i.x, i.y]; } } });
    ok(at && at[0] === 37 && at[1] === -12, id + ": placed at the caster's feet (37, -12), not on the enemy");
  }
  console.log("8 D-LOC: the three placed moves land at the caster's feet"); }

// 9. the D29 schedule on synthetic emitters: H14 (an interval emitter living 1 s with every 0.25 emits at 0.25, 0.5, 0.75, not at 1.0);
//    count caps a cast emitter (every 0.01, count 6); a step emits every emission that is due (floor(dt / 0.01) + 1 in the first step).
{ const kid = { space: { shape: 'radial', radRadius: 5, count: 1 }, delivery: { anchor: 'world', targeting: 'none', motion: 'static', endOn: [{ time: 0.05 }] }, hitPolicy: 'oncePerInstance', payload: [{ t: 'damage' }] };
  syn('syn-int', { cd: 50, space: { shape: 'radial', radRadius: 5, count: 1 }, delivery: { anchor: 'world', targeting: 'location', locationPick: 'caster', range: 420, motion: 'static', endOn: [{ time: 1 }] },
    payload: [{ t: 'emit', trigger: 'interval', every: 0.25, move: kid }] });
  syn('syn-burst', { cd: 50, delivery: { anchor: 'caster', targeting: 'none', motion: 'static', endOn: [{ time: 0.5 }] }, payload: [{ t: 'emit', trigger: 'cast', every: 0.01, count: 6, move: kid }] });
  for (const dt of DTS) {
    const t1 = run(mkP([['syn-int']]), [mkE(300, 0)], 1.5, { dt });
    ok(emitsIn(t1, 'syn-int').length === 3, 'dt ' + dtName(dt) + ': H14, emissions at 0.25, 0.5 and 0.75, never at the end (' + emitsIn(t1, 'syn-int').length + ')');
    const eb = emitsIn(run(mkP([['syn-burst']]), [mkE(300, 0)], 0.5, { dt }), 'syn-burst');
    const first = eb.filter(e => e.t <= dt + 1e-9).length, want = Math.min(6, Math.floor(dt / 0.01 + 1e-9) + 1);
    ok(eb.length === 6 && first === want, 'dt ' + dtName(dt) + ': count caps at 6 and the first step emits every due emission (' + eb.length + ', ' + first + ', want 6, ' + want + ')');
  }
  console.log('9 schedule: H14 at the end, the count cap, several emissions in one step'); }

// 10. determinism: all nine in one group, the owner walking, same seed and tape twice, at both dts
{ for (const dt of DTS) {
    const f = () => { eid = 0; const o = mkP([NINE]);
      const tape = run(o, [mkE(120, 10), mkE(150, -40), mkE(-90, 10), mkE(30, 200), mkE(60, 0)], 3, { dt, rng: seeded(5), each: () => { o.x += 40 * dt; } });
      return JSON.stringify(tape.map(({ instId, parentId, ...r }) => r)); };
    ok(f() === f(), 'dt ' + dtName(dt) + ': same inputs, same tape');
  }
  console.log('10 determinism: same tape twice at 1/60 and 1/30'); }

// 11. termination (D29, Jess 2026-10-30): one burst when the carrier ends naturally (time, pierce, wall, triggered, returned, arrived,
//     offScreen), at its final position; never on ownerDeath, notActive or cap. Burst children join at the end of the step (R6), so a
//     child burst always lands on a later step. Synthetic moves: no routed move uses termination yet.
{ const kid = { space: { shape: 'radial', radRadius: 5, count: 1 }, delivery: { anchor: 'world', targeting: 'none', motion: 'static', endOn: [{ time: 0.05 }] }, hitPolicy: 'oncePerInstance', payload: [{ t: 'damage' }] };
  const kid2 = Object.assign({}, kid, { payload: [{ t: 'damage' }, { t: 'emit', trigger: 'termination', move: kid }] });
  const shot = (life, speed, more = []) => ({ cd: 50, space: { shape: 'radial', radRadius: 5, count: 1, pierce: 0 }, delivery: { anchor: 'caster', targeting: 'direction', motion: 'travels', moveSpeed: speed, range: 420,
    endOn: more.concat([{ time: life }]) }, payload: [{ t: 'damage' }, { t: 'emit', trigger: 'termination', move: kid }] });
  const plate = endOn => ({ cd: 50, space: { shape: 'radial', radRadius: 5, count: 1 }, delivery: { anchor: 'world', targeting: 'location', locationPick: 'caster', range: 420, motion: 'static', endOn },
    payload: [{ t: 'damage' }, { t: 'emit', trigger: 'termination', move: kid }] });
  syn('syn-term-time', shot(0.5, 200));
  syn('syn-term-off', shot(5, 400, [{ offScreen: true }]));
  syn('syn-term-chain', Object.assign(shot(0.2, 200), { payload: [{ t: 'damage' }, { t: 'emit', trigger: 'termination', move: kid2 }] }));
  syn('syn-term-od', plate([{ ownerDeath: true }, { time: 5 }]));
  syn('syn-term-na', plate([{ notActive: true }]));
  syn('syn-term-cap', Object.assign(plate([{ notActive: true }]), { cd: 0.1 }));
  for (const dt of DTS) {
    const L = 'dt ' + dtName(dt) + ': ';
    // time: 200 px/s for 0.5 s ends at (100, 0)
    let seen = null;
    const tape = run(mkP([['syn-term-time']]), [mkE(0, 300)], 0.8, { dt, each: () => { const k = kidsOf('syn-term-time'); if (!seen && k.length) seen = k.map(i => i.age); } });
    const em = emitsIn(tape, 'syn-term-time'), end = ends(tape, 'time')[0];
    ok(em.length === 1 && end && em[0].t === end.t && em[0].x === end.x && near(em[0].x, 100, 1e-6) && near(em[0].y, 0, 1e-9), L + 'a carrier ending on time bursts once, at its end position (100, 0), in its end step');
    ok(seen && seen.length === 1 && seen[0] === 0, L + 'R6: the burst child joins at the end of the step (age 0)');
    // pierce: the same shot meets an enemy at 60 px (contact within 15 px of its centre)
    const tp = run(mkP([['syn-term-time']]), [mkE(60, 0)], 0.8, { dt }), ep = emitsIn(tp, 'syn-term-time'), pe = ends(tp, 'pierce')[0];
    ok(ep.length === 1 && pe && ep[0].x === pe.x && ep[0].t === pe.t && between(ep[0].x, 40, 60), L + 'pierce: one burst at the spot of the hit (' + (ep[0] ? ep[0].x.toFixed(1) : '-') + ')');
    // offScreen: view right edge 50, margin 260, so it ends past x 310
    const to = run(mkP([['syn-term-off']]), [mkE(0, 300)], 1.5, { dt, each: k => { if (k === 1) Sim.setView({ x: -50, y: -50, w: 100, h: 100 }); } });
    Sim.setView(null);
    const eo = emitsIn(to, 'syn-term-off');
    ok(ends(to, 'offScreen').length === 1 && eo.length === 1 && eo[0].x > 310 && eo[0].x <= 310 + 400 * dt + 1e-6, L + 'offScreen: one burst where it left the screen (Jess 2026-10-30)');
    // no burst on ownerDeath, notActive or cap
    const od = mkP([['syn-term-od']]), t1 = run(od, [mkE(300, 0)], 0.5, { dt, each: k => { if (k === 5) od.dead = true; } });
    ok(ends(t1, 'ownerDeath').length === 1 && emitsIn(t1).length === 0, L + 'ownerDeath: no burst');
    const na = mkP([['syn-term-na'], []]), t2 = run(na, [mkE(300, 0)], 0.5, { dt, each: k => { if (k === 5) na.act = 1; } });
    ok(ends(t2, 'notActive').length === 1 && emitsIn(t2).length === 0, L + 'notActive: no burst');
    const t3 = run(mkP([['syn-term-cap']]), [mkE(300, 0)], 1.2, { dt }), c3 = castsOf(t3, 'syn-term-cap').length;
    ok(c3 >= 9 && ends(t3, 'cap').length === c3 - 8 && emitsIn(t3).length === 0, L + 'cap: ' + (c3 - 8) + ' removed by the cap, no burst');
    // a child with its own burst (life 0.05): the second burst lands ceil(0.05 / dt) steps after the first, never in the same step
    const tc = run(mkP([['syn-term-chain']]), [mkE(0, 300)], 0.8, { dt }), ec = emitsIn(tc, 'syn-term-chain');
    ok(ec.length === 2 && ec[1].parentId !== ec[0].parentId && ec[1].t > ec[0].t && between(ec[1].t - ec[0].t, 0.05, 0.05 + dt), L + 'a child burst lands on a later step (' + (ec.length === 2 ? (ec[1].t - ec[0].t).toFixed(4) : ec.length) + ' s)');
    const f = () => { eid = 0; return JSON.stringify(run(mkP([['syn-term-time', 'syn-term-chain']]), [mkE(60, 0), mkE(0, 300)], 1, { dt, rng: seeded(9) }).map(({ instId, parentId, ...r }) => r)); };
    ok(f() === f(), L + 'termination: same inputs, same tape');
  }
  console.log('11 termination: natural ends burst once at the end position, a faint, swap or cap never do'); }

console.log(fail ? 'move-emit harness: ' + fail + ' FAILED of ' + n : 'move-emit harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
