// Move schema slice 4c-2 (returns and repositions), offline checks (Node only). Usage from the repo root:
//   node docs/proposals/move-motion-harness.js .
// Loads the REAL stats.js, enemies.js, types.js, status.js, stages.js, enemy.js and player.js plus the move data chain, G.MoveGeom,
// G.MoveSim, G.MoveEffects and G.SimBus, with the stubs of move-persist-harness.js. Checks: Quick Attack A to B to A (R1: one hit at
// B, nothing in transit, returned at the exact origin, duration 2 x distance / (dashMult x speed), no second dash over a live one),
// legs (R2, H1, H22: two hits per bone per enemy, returnHits out, a fresh pierce budget per leg), the returns motion (D26: turnaround
// at range, homing on a moving owner, returned, no leaks), knockback `direction: travel` and the pull clamp (D33), range and walls
// (R9, D27), i-frames and the dash root (P8), Aerial Ace's confusion roll and determinism. The mutation runner
// (move-motion-mutate.js) points MOTION_SIM and MOTION_FX at altered copies; every mutation must make this harness fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/move-sim.js': 'MOTION_SIM', 'js/systems/move-effects.js': 'MOTION_FX' };
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
      if (slide) { e.x += e.kx * dt; e.y += e.ky * dt; const f = Math.pow(0.0015, dt); e.kx *= f; e.ky *= f; }
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
/** One dash of the owner's first cast: its instance id, the frame time it ended and where the owner stood then. */
function dash(o, es, secs, opt = {}) {
  let id0 = null, endAt = null, endPos = null, maxX = -Infinity; const more = opt.each;
  const tape = run(o, es, secs, Object.assign({}, opt, { each: (k, t) => {
    const q = Sim.list().filter(i => i.dash || i.spec.delivery.motion === 'repositions');
    if (id0 == null && q.length) id0 = q[0].id;
    if (id0 != null && endAt == null) { maxX = Math.max(maxX, o.x); if (!q.some(i => i.id === id0)) { endAt = t; endPos = [o.x, o.y]; } }
    if (more) more(k, t, { id0, endAt });
  } }));
  return { tape, id0, endAt, endPos, maxX };
}

// 1. R1: Quick Attack goes A to B, hits at B, comes back to A (move-consistency-review:CP1-Q3, MOVE-INTENT quick-attack)
{ for (const dt of DTS) {
    const o = mkP([['quick-attack']]), B = mkE(205, 0), V = o.spd * 10; let decoy = null;
    const r = dash(o, [B], 0.5, { dt, each: k => { if (k === 2) { decoy = mkE(o.x + 40, 0); enemies.push(decoy); } } });     // ahead on the line, after the cast
    const mine = hitsOf(r.tape, 'quick-attack').filter(h => h.instId === r.id0), end = ends(r.tape).find(e => e.instId === r.id0);
    ok(r.id0 != null && mine.length === 1 && mine[0].enemyId === B.id, 'R1 dt ' + dtName(dt) + ': B damaged exactly once (' + mine.length + ')');
    ok(decoy && !hitsOf(r.tape).some(h => h.enemyId === decoy.id && h.instId === r.id0), 'R1 dt ' + dtName(dt) + ': the decoy on the line takes nothing (hitbox off in transit and back)');
    ok(end && end.reason === 'returned', 'R1 dt ' + dtName(dt) + ': the dash ends by returned (' + (end && end.reason) + ')');
    ok(r.endPos && Math.hypot(r.endPos[0], r.endPos[1]) <= 1e-6, 'R1 dt ' + dtName(dt) + ': the owner is snapped to the exact origin (' + r.endPos + ')');
    ok(near(r.maxX, 205, 1e-9), 'R1 dt ' + dtName(dt) + ': the dash reaches the target centre, no stand-off (' + r.maxX + ')');
    ok(r.endAt != null && Math.abs(r.endAt - 2 * 205 / V) <= 2 * dt + 1e-9, 'R1 dt ' + dtName(dt) + ': duration 2 x 205 / (10 x ' + o.spd + ') within one step per leg (' + r.endAt + ')');
  }
  { const o = mkP([['quick-attack']]), B = mkE(205, 0);
    const r = dash(o, [B], 0.5, { each: k => { if (k === 3) B.dead = true; } });
    const end = ends(r.tape).find(e => e.instId === r.id0);
    ok(hitsOf(r.tape, 'quick-attack').length === 0 && end && end.reason === 'returned' && near(r.maxX, 205, 1e-9) && Math.hypot(r.endPos[0], r.endPos[1]) <= 1e-6,
      'B dies mid-dash: the owner still goes to the captured point and returns, nothing is hit'); }
  { const o = mkP([['quick-attack']], { baseSpd: 20 }), r = dash(o, [mkE(205, 0)], 1.5);     // a 2 s dash against a 0.583 s cooldown
    ok(castsOf(r.tape, 'quick-attack').length === 1, 'no second dash while one lives (' + castsOf(r.tape, 'quick-attack').length + ' casts in 1.5 s)'); }
  { const o = mkP([['quick-attack']], { spdMul: 0 }); ok(castsOf(run(o, [mkE(205, 0)], 0.3), 'quick-attack').length === 0, 'a swept dash at speed 0 waits (no cast)'); }
  { const o = mkP([['quick-attack']], { mvRoot: true }), V = (o.mvRoot = false, o.spd * 10); o.mvRoot = true;
    const r = dash(o, [mkE(205, 0)], 0.5);
    ok(r.endAt != null && Math.abs(r.endAt - 2 * 205 / V) <= 2 / 60 + 1e-9, 'the dash speed ignores the root flag (read as the final move speed, P6)'); }
  console.log('1 R1: one hit at B, nothing in transit, returned at the exact origin, duration from dashMult x speed, no overlapping dash'); }

// 2. R2, H1, H22: legs
{ const pair = (id, secs) => { for (const dt of DTS) {
    const o = mkP([[id]]), es = [-0.25, 0.25].map(h => mkE(Math.cos(h) * 120, Math.sin(h) * 120));
    const tape = run(o, es, secs, { dt }), back = ends(tape, 'returned').slice(0, 2), ids = back.map(e => e.instId);
    ok(back.length === 2 && ends(tape, 'time').length === 0, id + ' dt ' + dtName(dt) + ': both bones of the first cast end by returned, none by time');
    for (const e of es) {
      const by = {};
      for (const h of hitsOf(tape, id)) if (h.enemyId === e.id && ids.includes(h.instId)) by[h.instId] = (by[h.instId] || 0) + 1;
      const v = Object.values(by);
      ok(v.length === 1 && v[0] === 2, id + ' dt ' + dtName(dt) + ': the enemy on one bone path takes 2 hits from that bone (out and back), none from the other (' + JSON.stringify(by) + ')');
    }
  } };
  pair('razor-leaf', 1.5); pair('bonemerang', 1.7);
  const RET = { anchor: 'caster', targeting: 'direction', motion: 'returns', moveSpeed: 330, range: 210, endOn: [{ time: 2 }, { returned: true }] };
  syn('syn-ret-out', { cd: 5, space: { shape: 'radial', radRadius: 6, count: 1, spread: 0, pierce: Infinity }, delivery: Object.assign({}, RET, { returnHits: 'out' }) });
  { const e = mkE(120, 0), tape = run(mkP([['syn-ret-out']]), [e], 1.5);
    ok(hitsOf(tape, 'syn-ret-out').length === 1 && ends(tape, 'returned').length === 1, 'returnHits out: the back leg never hits (' + hitsOf(tape).length + ' hits)'); }
  syn('syn-ret-p1', { cd: 5, space: { shape: 'radial', radRadius: 6, count: 1, spread: 0, pierce: 1 }, delivery: Object.assign({}, RET, { returnHits: 'outAndBack' }) });
  { const es = [60, 100, 140].map(x => mkE(x, 0)), tape = run(mkP([['syn-ret-p1']]), es, 1.5), cnt = e => hitsOf(tape).filter(h => h.enemyId === e.id).length;
    ok(cnt(es[0]) === 1 && cnt(es[1]) === 2 && cnt(es[2]) === 1, 'pierce 1 out and back: 60 and 100 on the way out, 140 and 100 on the way back, a fresh budget per leg (' + es.map(cnt) + ')');
    ok(ends(tape, 'returned').length === 1 && ends(tape, 'pierce').length === 0, 'pierce exhaustion disarms a returns move, it does not end it (H22)'); }
  console.log('2 R2: two hits per bone per enemy, returnHits out never hits back, per-leg pierce budget'); }

// 3. D26: the returns motion
{ for (const dt of DTS) {
    const o = mkP([['razor-leaf']]), far = {}; let id0 = null;
    run(o, [mkE(0, -200)], 1.5, { dt, each: () => { for (const i of ofMove('razor-leaf')) { if (id0 == null) id0 = i.id; if (i.leg === 0) far[i.id] = Math.max(far[i.id] || 0, Math.hypot(i.x - i.cast.x, i.y - i.cast.y)); } } });
    const f = far[id0];
    ok(f != null && near(f, 210, 1e-9), 'dt ' + dtName(dt) + ': the out leg turns at exactly range 210 from the cast origin (' + f + ')');
  }
  { const o = mkP([['razor-leaf']]), at = new Map(); let id0 = null;
    const tape = run(o, [mkE(0, -200)], 2.5, { each: (k, t) => {     // the owner walks 2 px a frame after each tick (120 px/s)
      const q = ofMove('razor-leaf'); if (id0 == null && q.length) id0 = q[0].id;
      at.set(t.toFixed(6), [o.x, o.y]); o.y += 2; } });
    const end = ends(tape).find(e => e.instId === id0), p = end && at.get(end.t.toFixed(6)), gap = p ? Math.hypot(end.x - p[0], end.y - p[1]) : null;
    ok(end && end.reason === 'returned' && gap != null && gap <= 12 + 6 + 1e-6, 'the back leg homes on an owner walking sideways at 120 px/s and ends by returned within owner radius plus its own (' + (end && end.reason) + ', ' + gap + ')'); }
  { const o = mkP([['razor-leaf']]);
    const tape = run(o, [mkE(150, 0)], 0.5, { each: k => { if (k === 10) o.dead = true; } });
    ok(ofMove('razor-leaf').length === 0 && ends(tape, 'ownerDeath').length >= 2, 'a faint ends the bones (ownerDeath), none leak');
    run(mkP([['razor-leaf']]), [mkE(150, 0)], 0.2); Sim.clear(); ok(Sim.list().length === 0, 'a new run (clear) leaves none'); }
  console.log('3 returns: turnaround at range, homes on a moving owner, returned, no leaks'); }

// 4. D33: knockback `direction: travel` and the pull clamp
{ const Fx = G.MoveEffects, BM = REAL.bonemerang, AA = REAL['aerial-ace'], o = mkP([[]]);
  const knock = (spec, e, at, v) => { let got = null; e.hurt = function (a, c, dx, dy, k) { got = { dx, dy, k }; return Enemy.prototype.hurt.apply(this, arguments); };
    Fx.applyHit(Object.assign({ id: 9999, spec, cast: { owner: o, slot: null, target: null }, x: at[0], y: at[1], leg: 0 }, v ? { vx: v[0], vy: v[1] } : {}), e, 0, () => 0.99);
    delete e.hurt; return got; };
  const push = mkE(100, 0), g1 = knock(BM, push, [90, 0], [300, 0]);
  ok(g1.dx > 0 && g1.dy === 0 && g1.k === 40 && near(push.kx, 40, 1e-9), 'the out leg pushes along its travel, away from the caster, unclamped (40)');
  const pushNear = mkE(25, 0), g2 = knock(BM, pushNear, [15, 0], [300, 0]);
  ok(g2.dx > 0 && g2.k === 40, 'a push away from the caster is never clamped, even close in (' + g2.k + ')');
  const pull = mkE(100, 0), g3 = knock(BM, pull, [110, 0], [-300, 0]);
  ok(g3.dx < 0 && g3.k === 40, 'the back leg pulls along its travel, toward the caster; far enough out the full 40 (' + g3.dx + ', ' + g3.k + ')');
  const close = mkE(0, 0); close.x = 12 + close.r + 3; const g4 = knock(BM, close, [close.x + 10, 0], [-300, 0]);
  ok(near(g4.k, 3 / Fx.SLIDE, 1e-9) && g4.k < 40, 'an enemy 3 px from the caster edge is pulled by at most that gap (' + g4.k + ')');
  const edge = mkE(0, 0); edge.x = 12 + edge.r; const g5 = knock(BM, edge, [edge.x + 10, 0], [-300, 0]);
  ok(g5.k === 0 && edge.kx === 0, 'an enemy already at the caster edge is not pulled again');
  const still = mkE(100, 0), g6 = knock(BM, still, [90, 0], null);
  ok(g6.dx === 10 && g6.dy === 0 && g6.k === 40, 'no velocity (static, orbit, teleport): away from the instance centre, as before');
  const aa = mkE(30, 0), g7 = knock(AA, aa, [0, 0], null);
  ok(g7.dx === 30 && g7.k === 80, "Aerial Ace's 80 push away from the landing point is unchanged");
  const boss = mkE(100, 0, { boss: true }); knock(BM, boss, [90, 0], [300, 0]);
  ok(boss.kx === 0 && boss.ky === 0, 'a boss resists knockback as before (Enemy.hurt)');
  for (const dt of DTS) {
    const e = mkE(0, 0), x0 = e.x = 12 + e.r + 3; knock(BM, e, [x0 + 10, 0], [-300, 0]);
    for (let t = 0; t < 3; t += dt) { e.x += e.kx * dt; e.y += e.ky * dt; const f = Math.pow(0.0015, dt); e.kx *= f; e.ky *= f; }
    ok(e.x < x0 && e.x >= 12 + e.r - 1e-9, 'dt ' + dtName(dt) + ': the clamped pull slides toward the caster and stops at or before its edge (' + e.x.toFixed(3) + ')');
  }
  { const e = mkE(Math.cos(0.25) * 120, Math.sin(0.25) * 120), seen = [], o2 = mkP([['bonemerang']]);
    e.hurt = function (a, c, dx, dy, k) { seen.push({ dot: dx * (this.x - o2.x) + dy * (this.y - o2.y), k }); return Enemy.prototype.hurt.apply(this, arguments); };
    run(o2, [e, mkE(Math.cos(-0.25) * 120, Math.sin(-0.25) * 120)], 1.7);
    ok(seen.length === 2 && seen[0].dot > 0 && seen[1].dot < 0, 'in play: the out-leg hit pushes away from the caster, the back-leg hit pulls toward it (' + seen.map(s => Math.sign(s.dot)) + ')'); }
  console.log('4 knockback: travel direction, pull clamped at the caster edge, pushes unclamped, fallback, Aerial Ace and bosses unchanged'); }

// 5. R9 and D27 geometry
{ for (const id of ['quick-attack', 'aerial-ace']) ok(castsOf(run(mkP([[id]]), [mkE(500, 0)], 0.5), id).length === 0, id + ': no cast while every enemy is beyond range 420');
  { const o = mkP([['aerial-ace']]); run(o, [mkE(300, 0)], 1 / 60);
    ok(Math.hypot(o.x - 300, o.y) <= 1, 'Aerial Ace lands within 1 px of its point (' + o.x + ', ' + o.y + ')'); }
  { const W = G.World, free = W.isFree; W.isFree = x => x < 150;
    const o = mkP([['quick-attack']]), B = mkE(195, 0), r = dash(o, [B], 0.5);
    ok(near(r.maxX, 144, 1e-9), 'a wall at 150: the dash stops at the last free 8 px step, 144 (' + r.maxX + ')');
    ok(hitsOf(r.tape, 'quick-attack').filter(h => h.instId === r.id0).length === 1, 'the arrival hit is tested there (B at 195 is inside 46 + 10)');
    ok(W.isFree(r.maxX, 0), 'the stop is a legal spot');
    W.isFree = free; }
  console.log('5 R9 and walls: no cast past range, teleport lands, the dash stops at the last free step and hits there'); }

// 6. P8: i-frames and the dash root
{ { const o = mkP([['quick-attack']]); let bad = 0, rootBad = 0, tailIn = 0, tailOut = 0, after = 0;
    dash(o, [mkE(205, 0)], 1.0, { each: (k, t, s) => {
      if (s.endAt == null) { if (!(o.invuln > 0)) bad++; if (!o.mvRoot) rootBad++; return; }
      if (k > 0 && o.act === 0) o.act = 1;     // no recast after the first dash
      const m = t - s.endAt;
      if (o.mvRoot) after++;
      if (m <= 0.3 - 1 / 60 - 1e-9 && !(o.invuln > 0)) tailIn++;
      if (m >= 0.3 + 1e-9 && o.invuln > 1e-9) tailOut++;
    } });
    ok(bad === 0 && rootBad === 0, 'the whole dash (out, arrival, back) is invulnerable and rooted (' + bad + ', ' + rootBad + ' bad frames)');
    ok(tailIn === 0 && tailOut === 0 && after === 0, 'then a 0.3 s tail and normal again; the root ends with the dash (' + [tailIn, tailOut, after] + ')'); }
  { const o = mkP([['quick-attack']], { invuln: 2 }); const r = dash(o, [mkE(205, 0)], 0.42);
    ok(o.invuln > 1.5, 'an existing longer invulnerability is never lowered (' + o.invuln.toFixed(2) + ')'); }
  { const o = mkP([['quick-attack']]); run(o, [mkE(205, 0)], 0.1, { each: k => { if (k === 3) Sim.clear(o); } });
    ok(!o.mvRoot && ofMove('quick-attack').length === 0, 'a swap mid-dash (clear of the owner) ends the dash and the root'); }
  { const o = mkP([['quick-attack']]); run(o, [mkE(205, 0)], 0.1, { each: k => { if (k === 3) o.dead = true; } });
    ok(!o.mvRoot && ofMove('quick-attack').length === 0, 'a faint mid-dash ends the dash and the root'); }
  { const o = mkP([['quick-attack']]); run(o, [mkE(205, 0)], 0.1, { each: k => { if (k === 3) Sim.clear(); } });
    ok(!o.mvRoot && Sim.list().length === 0, 'a new run mid-dash leaves no dash and no root'); }
  const ROOT = t => ({ cd: 5, delivery: { anchor: 'self', targeting: 'self', motion: 'static' }, casterState: { commitment: { movement: { type: 'rooted', t } } }, payload: [] });
  syn('syn-root-short', ROOT(0.05)); syn('syn-root-long', ROOT(1.0));
  { const o = mkP([['quick-attack', 'syn-root-short']]); let at = null;
    run(o, [mkE(205, 0)], 0.3, { each: (k, t) => { if (Math.abs(t - 0.2) < 1e-6) at = o.mvRoot; } });
    ok(at === true, 'a rooted commitment ending mid-dash does not free the dash'); }
  { const o = mkP([['quick-attack', 'syn-root-long']]); let mid = null, late = null;
    dash(o, [mkE(205, 0)], 1.2, { each: (k, t, s) => { if (s.endAt != null) o.act = 1; if (Math.abs(t - 0.6) < 1e-6) mid = o.mvRoot; if (Math.abs(t - 1.15) < 1e-6) late = o.mvRoot; } });
    ok(mid === true && late === false, 'a dash ending first does not free a live rooted commitment; it ends on its own time (' + mid + ', ' + late + ')'); }
  { const o = mkP([['aerial-ace']]); let a = null, b = null;
    run(o, [mkE(300, 0)], 0.4, { each: (k, t) => { if (Math.abs(t - 0.25) < 1e-6) a = o.invuln; if (Math.abs(t - 0.35) < 1e-6) b = o.invuln; } });
    ok(a > 0 && b <= 1e-9 && !o.mvRoot, 'Aerial Ace: 0.3 s of i-frames from the cast, no root (' + a + ', ' + b + ')'); }
  console.log('6 i-frames: whole dash plus a 0.3 s tail, never lowered; the root ends on swap, faint, new run, and the two roots never end each other'); }

// 7. Aerial Ace confusion: one 50% roll per hit
{ const rng = seeded(11), o = mkP([[]]); let got = 0; const N = 10000;
  for (let i = 0; i < N; i++) { const e = mkE(30, 0); G.MoveEffects.applyHit({ id: 1, spec: REAL['aerial-ace'], cast: { owner: o, slot: null, target: null }, x: 0, y: 0, leg: 0 }, e, 0, rng); if (e.stCnf) got++; }
  ok(Math.abs(got / N - 0.5) <= 0.02, 'Aerial Ace confuses about half its hits (' + (got / N).toFixed(3) + ' of ' + N + ')');
  console.log('7 confusion: ' + (got / N).toFixed(3) + ' of ' + N + ' hits'); }

// 8. determinism
{ const f = () => { eid = 0; const tape = run(mkP([['razor-leaf', 'bonemerang'], ['quick-attack']]), [mkE(120, 10), mkE(150, -40), mkE(-90, 10)], 1.5, { rng: seeded(3) });
    return JSON.stringify(tape.map(({ instId, ...r }) => r)); };
  ok(f() === f(), 'same inputs, same tape');
  console.log('8 determinism: same tape twice'); }

console.log(fail ? 'move-motion harness: ' + fail + ' FAILED of ' + n : 'move-motion harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
