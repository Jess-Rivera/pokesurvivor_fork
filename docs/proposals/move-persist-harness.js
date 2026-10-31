// Move schema slice 4c-1 (persistence and orbits), offline checks (Node only). Usage from the repo root:
//   node docs/proposals/move-persist-harness.js .
// Loads the REAL stats.js, enemies.js, types.js, status.js, stages.js, enemy.js and player.js plus the move data chain, G.MoveGeom,
// G.MoveSim, G.MoveEffects and G.SimBus, with stubs for the enemy manager, world, weather, audio, camera and FX (pattern:
// move-selfcast-harness.js). Checks: the persistent lifecycle (R7, combat-architecture:H25: one group while active, notActive on a
// swap or stun, ownerDeath on a faint, fresh group and hit records on return, no cooldown, respawn after an instance end), orbit
// geometry (D25, H15, D36: true circle, follows the owner, lens, swept hits, nothing inside the ring), interval cadence, Fire Spin,
// Leaf Storm (slice 5a trackers: refresh on hit, Self-drop Gate 12 s, 6.1 s after the last), Night Shade (flat level damage), a synthetic pulse (persistent plus
// endOn time), the deep-freeze of G.MoveDefs (I2) and determinism. The mutation runner (move-persist-mutate.js) points PERSIST_SIM,
// PERSIST_FX and PERSIST_RESOLVER at altered copies; every mutation must make this harness fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/move-sim.js': 'PERSIST_SIM', 'js/systems/move-effects.js': 'PERSIST_FX', 'js/data/move-resolver.js': 'PERSIST_RESOLVER' };
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
/** Ticks the owner for `secs` (each event on the tape is stamped with its time). es: the enemy list (null keeps the current one). */
function run(o, es, secs, { dt = 1 / 60, each = null, reset = true, rng = () => 0.99 } = {}) {
  if (es) enemies = es;
  if (reset) Sim.clear();
  Sim.setRng(rng); Sim.setView(null); Sim.setFilter(() => true);
  const tape = G.SimBus.record(), N = Math.round(secs / dt); let seen = 0;
  for (let k = 1; k <= N; k++) {
    const t = (o.clock = (o.clock || 0) + dt);
    Sim.tick(dt, o, t); S.tick(o, dt);
    for (const e of enemies) if (!e.dead) S.tick(e, dt);
    for (; seen < tape.length; seen++) tape[seen].t = t;
    if (each) each(k, t);
  }
  G.SimBus.stopRecording();
  return tape;
}
const groupsOf = (o, id) => new Set(Sim.list().filter(i => i.cast.owner === o && i.spec.id === id && i.cast.persist).map(i => i.cast.serial));
const ofMove = id => Sim.list().filter(i => i.spec.id === id);
const ends = (tape, why) => tape.filter(e => e.type === 'move:end' && (!why || e.reason === why));
const hitsOf = (tape, id) => tape.filter(e => e.type === 'move:hit' && (id == null || e.moveId === id));

// 1. R7 lifecycle (combat-architecture:H25)
{ const o = mkP([['fire-spin'], ['tackle']]); let max = 0; const serials = new Set();
  run(o, [], 0.5, { each: () => { const g = groupsOf(o, 'fire-spin'); max = Math.max(max, g.size); g.forEach(s => serials.add(s)); } });
  ok(max === 1 && serials.size === 1, 'R7: one live group while active, the same one every frame (' + serials.size + ' spawns, max ' + max + ')');
  ok(ofMove('fire-spin').length === 3, 'the group is the 3 shapes of one spawn (R7 counts groups)');
  ok(o.slots[0][0].t === 0, 'a persistent slot never arms a cooldown (t ' + o.slots[0][0].t + ')');
  const first = [...serials][0], oldIds = ofMove('fire-spin').map(i => i.id);
  o.act = 1; const t1 = run(o, null, 1 / 60, { reset: false });
  ok(groupsOf(o, 'fire-spin').size === 0 && ends(t1, 'notActive').length === 3, 'swap away: the group ends in the same frame, reason notActive');
  o.act = 0; run(o, null, 1 / 60, { reset: false });
  const back = ofMove('fire-spin'), g2 = [...groupsOf(o, 'fire-spin')];
  ok(g2.length === 1 && g2[0] !== first && back.length === 3 && back.every(i => !oldIds.includes(i.id) && near(i.age, 1 / 60, 1e-6)), 'swap back: a fresh group (new instances, phase from 0)');
  o.stMajor = { k: 'freeze', t: 5, age: 0 }; const t2 = run(o, null, 1 / 60, { reset: false });
  ok(groupsOf(o, 'fire-spin').size === 0 && ends(t2, 'notActive').length === 3, 'a stunned owner: the group ends (notActive)');
  o.stMajor = null; run(o, null, 1 / 60, { reset: false });
  ok(groupsOf(o, 'fire-spin').size === 1, 'the stun is over: one group again');
  o.act = 1; let tc = 0, tp = 0;
  run(o, [mkE(30, 0)], 0.3, { reset: false, each: () => ofMove('tackle').forEach(i => { tc++; if (i.cast.persist) tp++; }) });
  ok(tc > 0 && tp === 0, 'a cooldown move never spawns a persistent group (' + tc + ' tackle frames)');
  o.act = 0; run(o, [], 0.1, { reset: false }); o.dead = true; const t3 = run(o, null, 1 / 60, { reset: false });
  ok(groupsOf(o, 'fire-spin').size === 0 && ends(t3, 'ownerDeath').length === 3, 'a faint ends the group (ownerDeath)');
  const p = mkP([['fire-spin']]); run(p, [], 0.1); Sim.clear(p); ok(groupsOf(p, 'fire-spin').size === 0, 'a Pokemon swap (clear of the owner) leaves none');
  run(mkP([['fire-spin']]), [], 0.1); Sim.clear(); ok(Sim.list().length === 0, 'a new run (clear) leaves no persistent instance');
  const q = mkP([['fire-spin'], ['tackle']]), e = mkE(90, 0);
  run(q, [e], 1.0); q.act = 1; run(q, null, 1 / 60, { reset: false }); q.act = 0;
  const t4 = run(q, null, 3 / 60, { reset: false });
  ok(hitsOf(t4, 'fire-spin').length >= 1, 'swap back: the fresh group hits at once (no hit record carried over)');
  const r = mkP([['fire-spin'], ['tackle']]); run(r, [], 0.2);
  const keep = r.slots[0], s0 = [...groupsOf(r, 'fire-spin')][0];
  r.slots = [r.slots[1], keep]; r.act = 1; run(r, null, 1 / 60, { reset: false });
  ok(groupsOf(r, 'fire-spin').size === 1 && [...groupsOf(r, 'fire-spin')][0] === s0, 'slots reordered (arrange): the same slot object keeps its group');
  r.slots = [[{ id: 'tackle', t: 0 }]]; r.act = 0; const t5 = run(r, null, 1 / 60, { reset: false });
  ok(groupsOf(r, 'fire-spin').size === 0 && ends(t5, 'notActive').length === 3, 'its slot removed from the slot list (a debug set switch, a removed move): the group ends that frame, notActive');
  console.log('1 R7: one group while active, notActive on swap, stun and slot removal, ownerDeath on a faint, fresh group on return, no cooldown, clear leaves none'); }

// 1b. a shapeless self heal aura (slice 5a, Aqua Ring): one marker instance with no shape, no hits, the same R7 lifecycle
{ const o = mkP([['aqua-ring'], ['tackle']]), es = [mkE(30, 0)];
  const tp = run(o, es, 1);
  const live = ofMove('aqua-ring');
  ok(groupsOf(o, 'aqua-ring').size === 1 && live.length === 1 && !live[0].shape, 'Aqua Ring: one live group of one shapeless marker while active');
  ok(hitsOf(tp, 'aqua-ring').length === 0 && o.slots[0][0].t === 0, 'it never hits and never arms a cooldown');
  o.act = 1; const t1 = run(o, null, 1 / 60, { reset: false });
  ok(groupsOf(o, 'aqua-ring').size === 0 && ends(t1, 'notActive').filter(e => e.moveId === 'aqua-ring').length === 1, 'swap away: it ends, reason notActive');
  o.act = 0; run(o, null, 1 / 60, { reset: false });
  o.stMajor = { k: 'freeze', t: 5, age: 0 }; const t2 = run(o, null, 1 / 60, { reset: false });
  ok(groupsOf(o, 'aqua-ring').size === 0 && ends(t2, 'notActive').filter(e => e.moveId === 'aqua-ring').length === 1, 'a stun ends it (notActive)');
  o.stMajor = null; run(o, null, 1 / 60, { reset: false }); o.dead = true; const t3 = run(o, null, 1 / 60, { reset: false });
  ok(ends(t3, 'ownerDeath').filter(e => e.moveId === 'aqua-ring').length === 1, 'a faint ends it (ownerDeath)');
  console.log('1b Aqua Ring aura: one shapeless marker, no hits, no cd, ends on swap, stun and faint'); }

// 2. orbit geometry (D25, H15, D36)
{ for (const dt of DTS) {
    const o = mkP([['fire-spin']]); let worst = 0, off = 0;
    run(o, [], 1.0, { dt, each: () => {
      for (const i of ofMove('fire-spin')) {
        const a = 3 * i.age + TAU * i.fan / 3;
        worst = Math.max(worst, Math.hypot(i.x - (o.x + Math.cos(a) * 90), i.y - (o.y + Math.sin(a) * 90)));
        off = Math.max(off, Math.abs(Math.hypot(i.x - o.x, i.y - o.y) - 90));
      }
      o.x += 4; o.y -= 2;
    } });
    ok(worst < 1e-6 && off < 1e-6, 'orbit dt ' + dtName(dt) + ': shape i at 3 x age + 2 pi i / 3 on a true 90 px circle that follows a moving owner (worst ' + worst + ')');
  }
  const L2 = mkP([['fire-spin']], { moveRadiusMul: 2 }); run(L2, [], 0.2);
  ok(ofMove('fire-spin').every(i => near(Math.hypot(i.x - L2.x, i.y - L2.y), 180, 1e-9) && near(i.shape.r, 28, 1e-9)), 'lens 2: Fire Spin orbits at 180 px with 28 px shapes (D36)');
  syn('syn-orbit', { persistent: true, space: { shape: 'radial', radRadius: 2, count: 1, spread: 0, pierce: Infinity }, delivery: { anchor: 'caster', targeting: 'none', motion: 'orbits', orbitRadius: 100, angularSpeed: 6 } });
  ok(2 * 100 * Math.sin(0.05) > 2 + 1 + 5, 'the sweep case is real: at dt 1/30 neither end point of the step reaches the enemy');
  for (const dt of DTS) { const o = mkP([['syn-orbit']]), e = mkE(100 * Math.cos(0.1), 100 * Math.sin(0.1), { r: 1 });
    ok(hitsOf(run(o, [e], 2 * dt, { dt })).length === 1, 'swept orbit dt ' + dtName(dt) + ': a small enemy between two samples is hit'); }
  for (const dt of DTS) { const o = mkP([['fire-spin']]), e = mkE(45, 0, { r: 5 });
    ok(hitsOf(run(o, [e], 1.0, { dt })).length === 0, 'dt ' + dtName(dt) + ': nothing inside the ring is hit (the group starts on the ring)'); }
  console.log('2 orbit: true circle, follows the owner, lens 2 = 180 px, swept hits at 1/60 and 1/30, nothing inside the ring'); }

// 3. interval cadence: per shape, per enemy
{ const cad = (id, rehit, mk, least) => { for (const dt of DTS) {
    const o = mkP([[id]]), tape = run(o, [mk()], 2.0, { dt }), by = {};
    for (const h of hitsOf(tape, id)) (by[h.instId] = by[h.instId] || []).push(h.t);
    let bad = 0, total = 0;
    for (const ts of Object.values(by)) { total += ts.length; for (let k = 1; k < ts.length; k++) { const g = ts[k] - ts[k - 1]; if (g < rehit - 1e-9 || g > rehit + dt + 1e-9) bad++; } }
    ok(total >= least && bad === 0, id + ' dt ' + dtName(dt) + ': every shape re-hits every ' + rehit + ' s (' + total + ' hits, ' + bad + ' off-cadence)');
    ok(ends(tape).length === 0, id + ' dt ' + dtName(dt) + ': unlimited pierce never ends the group');
  } };
  cad('fire-spin', 0.4, () => mkE(0, 0, { r: 130 }), 15);
  cad('leaf-storm', 0.25, () => mkE(0, 0, { r: 130 }), 32);
  cad('night-shade', 0.5, () => mkE(100, 0), 4);
  console.log('3 cadence: Fire Spin 0.4 s, Leaf Storm 0.25 s, Night Shade 0.5 s per enemy, never ended by pierce'); }

// 4. Fire Spin
{ ok(near(REAL['fire-spin'].basePower, 29.75), 'Fire Spin basePower 35 x 85 / 100 = 29.75 (D1)');
  const o = mkP([['fire-spin']]), e = mkE(90, 0); run(o, [e], 0.1);
  ok(St.list(e).some(s => s.k === 'burn') && St.rooted(e), 'Fire Spin: burn and the trap root land at 100% with no roll');
  console.log('4 Fire Spin: basePower 29.75, burn and root'); }

// 5. Leaf Storm (MOVE-INTENT leaf-storm, COMBAT-RULES "Stat stages" SS2, SS4, SS12): -2 held by one tracker, its Duration reset on every hit,
//    a climb only on the 12 s Self-drop Gate (never on the 6 s base Gate), gone 6.1 s after the last hit
{ const FXm = G.MoveEffects, o = mkP([['leaf-storm']]); run(o, [mkE(95, 0)], 1.0);
  const tr = () => S.tracker(o, 'spa', FXm.srcOf(D['leaf-storm'], o), false);
  ok(S.stage(o, 'spa') === -2 && tr() && Object.keys(o.trk.spa).length === 1, 'Leaf Storm: the self Sp. Atk drop holds at -2 over many hits (one tracker)');
  ok(tr().d > S.DURATION - 0.25 - 2 / 60, 'every hit resets its 6.1 s Duration (' + tr().d.toFixed(2) + ' s left)');
  run(o, [], 5.5, { reset: false }); ok(S.stage(o, 'spa') === -2, 'with nothing in reach it still holds 5.5 s after the last hit');
  run(o, [], 0.8, { reset: false }); ok(S.stage(o, 'spa') === 0, 'and ends 6.1 s after the last hit');
  const c = mkP([['leaf-storm']]), st = []; run(c, [mkE(95, 0)], 13, { each: (k, t) => st.push([t, S.stage(c, 'spa')]) });
  const at = x => (st.find(y => y[0] >= x - 1e-9) || [0, null])[1];
  ok(at(7) === -2 && at(11.5) === -2 && at(13) === -4, 'climbs on the Self-drop Gate: -2 at 7 and 11.5 s, -4 by 13 s (' + [at(7), at(11.5), at(13)] + ')');
  const a = mkP([['leaf-storm']]), b = mkP([['leaf-storm']]); run(a, [mkE(95, 0)], 0.3);
  ok(S.stage(a, 'spa') === -2 && S.stage(b, 'spa') === 0, 'per Pokemon: one Leaf Storm user does not drop another');
  console.log('5 Leaf Storm: -2 held by one tracker, Duration reset per hit, -4 only on the 12 s Self-drop Gate, gone 6.1 s after the last'); }

// 6. Night Shade: flat level damage, radius, shield, follows the owner
{ const o = mkP([['night-shade']], { level: 37, critChance: 1, stgTeam: { atk: [{ n: 6, t: 99 }], spa: [{ n: 6, t: 99 }] } });
  const a = mkE(100, 0), b = mkE(140, 0, { r: 10 }), c = mkE(0, 60, { shield: 30 });
  const tape = run(o, [a, b, c], 1.2), on = e => tape.filter(h => h.type === 'move:hit' && h.enemyId === e.id);
  ok(on(a).length === 3 && on(a).every(h => h.dmg === 37), 'Night Shade: exactly the owner level (37) every 0.5 s; crit and stages change nothing (' + on(a).map(h => h.dmg) + ')');
  ok(on(b).length === 0, 'an enemy past 120 px plus its radius takes nothing');
  ok((c.shield || 0) === 0, 'a shield absorbs it first');
  o.x = 600; const d = mkE(680, 0);
  ok(run(o, [d], 0.1, { reset: false }).some(h => h.type === 'move:hit' && h.enemyId === d.id), 'it follows the owner (R8)');
  console.log('6 Night Shade: flat 37 every 0.5 s, 120 px reach, shield first, follows the owner'); }

// 7. a pulse: persistent plus endOn time respawns on the next tick with fresh hit records
{ syn('syn-pulse', { persistent: true, space: { shape: 'radial', radArc: TAU, radRadius: 60, count: 1, spread: 0, pierce: Infinity }, delivery: { anchor: 'caster', targeting: 'none', motion: 'static', endOn: [{ time: 0.5 }] } });
  for (const dt of DTS) { const o = mkP([['syn-pulse']]); let gaps = 0;
    const tape = run(o, [mkE(40, 0)], 1.6, { dt, each: () => { if (!groupsOf(o, 'syn-pulse').size) gaps++; } });
    const c = tape.filter(x => x.type === 'move:cast').length, h = hitsOf(tape).length, te = ends(tape, 'time').length;
    ok(c === 4 && h === 4 && te === 3 && gaps === 3, 'pulse dt ' + dtName(dt) + ': 4 spawns, 4 hits (fresh records each time), 3 time ends, one frame between groups (' + [c, h, te, gaps] + ')');
  }
  console.log('7 pulse: persistent plus endOn time 0.5 spawns again on the next tick'); }

// 8. I2: the live definitions are deep-frozen; resolve() still returns fresh objects
(function () { 'use strict';
  const deep = o => o === null || typeof o !== 'object' || (Object.isFrozen(o) && Object.values(o).every(deep));
  ok(Object.isFrozen(REAL) && Object.values(REAL).every(deep), 'I2: G.MoveDefs and every def in it are deep-frozen');
  const rejects = f => { try { f(); return false; } catch (e) { return e instanceof TypeError; } };
  ok(rejects(() => { REAL.tackle.cd = 9; }) && rejects(() => { REAL.tackle.space.radRadius = 1; }) && rejects(() => { REAL.tackle.payload[0].t = 'x'; })
    && rejects(() => { REAL['fire-spin'].payload.push({ t: 'damage' }); }) && rejects(() => { REAL.ghost = {}; }), 'a write to a def (field, nested object, array element, push, new key) throws');
  const fresh = G.MoveResolver.resolve(G.MoveData, G.MoveOverrides, G.MoveHandlers);
  ok(!Object.isFrozen(fresh) && !Object.isFrozen(fresh.tackle) && fresh.tackle.cd === REAL.tackle.cd, 'resolve() still returns fresh, unfrozen objects for tools');
  console.log('8 I2: deep-frozen, writes throw, resolve() fresh');
})();

// 9. determinism
{ const f = () => { eid = 0; const tape = run(mkP([['fire-spin'], ['leaf-storm']]), [mkE(90, 0), mkE(0, 95), mkE(-90, 10)], 1.0, { rng: seeded(3) });
    return JSON.stringify(tape.map(({ instId, ...r }) => r)); };
  ok(f() === f(), 'same inputs, same tape');
  console.log('9 determinism: same tape twice'); }

console.log(fail ? 'move-persist harness: ' + fail + ' FAILED of ' + n : 'move-persist harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
