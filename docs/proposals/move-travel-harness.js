// Move schema slice 4c-3 (aimTrack, location, delay, falls and the travelling moves), offline checks (Node only). Usage from the repo root:
//   node docs/proposals/move-travel-harness.js .
// Loads the REAL stats.js, enemies.js, types.js, status.js, stages.js, enemy.js and player.js plus the move data chain, G.MoveGeom,
// G.MoveSim, G.MoveEffects and G.SimBus, with the stubs of move-motion-harness.js. Checks (the 4c-3 handoff Tests 1 to 10): aimTrack's
// clamped turn, sticky target, re-pick and the reach limit (Jess 2026-10-29: tracking stops past min(range, reach + radius)); Flamethrower's
// riders and commitment; Rock Slide's location pick (seeded, uniform, in range, no roll while waiting), 0.4 s delay, 0.2 s live window and
// flinch; locationPick caster; delay in general (no motion, aging, collision or endOn while waiting); Psychic (validation 2.5 scenario 5,
// growth, clamped steering, ONE re-pick); Bubble Beam's exact oscillation; Aura Sphere's curve and reach; Confusion's homing; determinism.
// Expected values are derived by hand from the data and the D-table (formulas in the comments), never copied from a run. The mutation
// runner (move-travel-mutate.js) points TRAVEL_SIM, TRAVEL_FX and TRAVEL_GEOM at altered copies; every mutation must make this harness fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/move-sim.js': 'TRAVEL_SIM', 'js/systems/move-effects.js': 'TRAVEL_FX', 'js/systems/move-geom.js': 'TRAVEL_GEOM' };
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
/** n applyHit calls of a real move on fresh enemies with a seeded rng; returns the fraction where got(e) is true. */
function rate(id, got, N = 10000, s = 21) {
  const rng = seeded(s), o = mkP([[]]); let k = 0;
  for (let i = 0; i < N; i++) { const e = mkE(30, 0); G.MoveEffects.applyHit({ id: 1, spec: REAL[id], cast: { owner: o, slot: null, target: null }, x: 0, y: 0, leg: 0 }, e, 0, rng); if (got(e)) k++; }
  return k / N;
}
const FT = 'flamethrower', RS = 'rock-slide', PS = 'psychic', CF = 'confusion', BB = 'bubble-beam', AS = 'aura-sphere';

// 1. aimTrack (MOVE-INTENT flamethrower): turn at most 1.4 x dt toward the tracked enemy, sticky, re-picked, reach-limited
{ const RATE = 1.4, REACH = 250 + 10;     // radRadius 250, lens 1, enemy radius 10: the cast gate's min(420, reach + r)
  for (const dt of DTS) {     // the cast frame's step aims straight at A; from frame 2 the cone turns toward A moved to 90 degrees
    const o = mkP([[FT]]), A = mkE(150, 0), hs = [];
    run(o, [A], 0.9, { dt, each: k => { const c = inst1(FT); hs.push(c ? c.heading : null); if (k === 1) { A.x = 0; A.y = 150; } } });
    let bad = 0, fast = 0;
    hs.forEach((h, i) => { const want = Math.min(Math.PI / 2, RATE * i * dt); if (h == null || !near(h, want, 1e-9)) bad++; if (i && h - hs[i - 1] > RATE * dt + 1e-12) fast++; });
    ok(bad === 0 && fast === 0, 'aimTrack dt ' + dtName(dt) + ': heading after step k is 1.4 x (k - 1) x dt, never faster (' + bad + ' off, ' + fast + ' fast; last ' + (hs[hs.length - 1] || 0).toFixed(4) + ')');
  }
  for (const [y, why] of [[300, 'beyond reach 260 but inside range 420 (the reach limit)'], [500, 'beyond range']]) {
    const o = mkP([[FT]]), A = mkE(150, 0); let moved = 0;
    run(o, [A], 0.9, { each: k => { const c = inst1(FT); if (k === 1) { A.x = 0; A.y = y; } else if (c && c.heading !== 0) moved++; } });
    ok(moved === 0, 'the heading holds when the only enemy moves ' + why + ' (' + moved + ' frames turned)');
  }
  { const o = mkP([[FT]]), A = mkE(200, 0); let B = null, moved = 0, wrong = 0;
    run(o, [A], 0.9, { each: k => { const c = inst1(FT); if (k === 1) { B = mkE(0, 60); enemies.push(B); } else if (c) { if (c.heading !== 0) moved++; if (c.track !== A) wrong++; } } });
    ok(moved === 0 && wrong === 0, 'sticky: the live cast target in reach is kept while a nearer enemy appears (' + moved + ' turned, ' + wrong + ' off target)'); }
  { const o = mkP([[FT]]), A = mkE(200, 0); let B, C; const log = {};
    run(o, [A], 0.9, { each: k => { const c = inst1(FT);
      if (k === 1) { B = mkE(0, 150); C = mkE(0, -100); enemies.push(B, C); }
      if (c) log[k] = { h: c.heading, t: c.track };
      if (k === 5) A.dead = true;
      if (k === 25) C.dead = true; } });
    const dh = k => log[k].h - log[k - 1].h;
    ok(log[6].t === C && near(dh(6), -RATE / 60, 1e-9), 'the cast target dies: the cone re-picks the nearest in reach (C at 100) and turns toward it');
    ok(log[26].t === B && near(dh(26), RATE / 60, 1e-9), 'that one dies too: it re-picks again (B) and turns back, sticky re-pick whenever lost'); }
  for (const dt of DTS) {     // S at 90 degrees, 180 px: inside the cone once heading >= pi/2 - 0.45 - asin(10 / 180) (D18)
    const o = mkP([[FT]]), A = mkE(220, 0); let S = null;
    const tape = run(o, [A], 0.95, { dt, each: k => { if (k === 1) { A.x = 0; A.y = 220; S = mkE(0, 180); enemies.push(S); } } });
    const need = Math.PI / 2 - 0.45 - Math.asin(10 / 180); let k = 2; while (RATE * (k - 1) * dt < need - 1e-12) k++;
    ok(near(firstHit(tape, S, FT), k * dt, 1e-9), 'dt ' + dtName(dt) + ': the side enemy is first hit as the cone swings onto it at ' + (k * dt).toFixed(4) + ' s (' + firstHit(tape, S, FT) + ')');
  }
  { const o = mkP([[FT]]); let bad = 0;
    run(o, [mkE(150, 0)], 0.9, { each: () => { const c = inst1(FT); if (c && (c.x !== o.x || c.y !== o.y)) bad++; o.x += 2; o.y -= 1; } });
    ok(bad === 0, 'the tracking cone still rides a walking owner (R8) (' + bad + ' frames off)'); }
  { const d = Object.assign({}, REAL[FT].delivery); delete d.aimTrack;
    syn('syn-cone-fixed', Object.assign({}, REAL[FT], { id: 'syn-cone-fixed', delivery: d }));
    const o = mkP([['syn-cone-fixed']]), A = mkE(150, 0); let moved = 0;
    run(o, [A], 0.9, { each: k => { const c = inst1('syn-cone-fixed'); if (k === 1) { A.x = 0; A.y = 150; } else if (c && c.heading !== 0) moved++; } });
    ok(moved === 0, 'a cone without aimTrack never turns (' + moved + ')'); }
  { const o = mkP([[FT]]), A = mkE(200, 0); let B; const log = {};
    run(o, [A], 0.5, { each: k => { const c = inst1(FT); if (k === 1) { A.x = 0; A.y = REACH + 15; B = mkE(0, -200); enemies.push(B); } if (c) log[k] = c; } });
    ok(log[3] && log[3].track === B && log[3].heading < 0, 'the cast target walks out of reach (275 > 260): the cone drops it and re-picks the enemy in reach'); }
  console.log('1 aimTrack: clamped at 1.4 rad/s, holds with nothing in reach, sticky, re-picks whenever lost, reach-limited, rides the owner'); }

// 2. Flamethrower: riders and commitment unchanged
{ const p = rate(FT, e => St.list(e).some(s => s.k === 'burn'));
  ok(Math.abs(p - 0.1) <= 0.01, 'burn on about 10% of hits (' + p.toFixed(3) + ')');
  ok(REAL[FT].rehit === 0.2 && REAL[FT].hitPolicy === 'interval', 'rehit 0.2, interval');
  const o = mkP([[FT]]); run(o, [mkE(150, 0)], 0.5);
  const c = Sim.commits(o).map(m => m.part + ':' + m.type).sort().join(',');
  ok(c === 'cooldown:freeze,movement:slowed', 'the 4b commitment (slowed plus freeze) is live while the cone swings (' + c + ')');
  console.log('2 Flamethrower: burn ' + p.toFixed(3) + ', rehit 0.2, commitment unchanged'); }

// 3. Rock Slide: location pick, 0.4 s delay, 0.2 s live window, oncePerInstance, flinch 30%
{ for (const dt of DTS) {     // cast frame t = dt; first live step 0.4 s later (D28); live for ceil(0.2 / dt) steps
    const o = mkP([[RS]]), E = mkE(200, 0); const xs = new Set();
    const tape = run(o, [E], 0.9, { dt, each: () => { const i = inst1(RS); if (i) xs.add(i.x + ',' + i.y); } });
    const h = hitsOf(tape, RS), land = tape.find(e => e.type === 'move:land'), end = ends(tape)[0], live = Math.ceil(0.2 / dt - 1e-9);
    ok(h.length === 1 && near(h[0].t, dt + 0.4, 1e-9), 'dt ' + dtName(dt) + ': one hit, at the first live step 0.4 s after the cast (' + h.map(x => x.t.toFixed(4)) + ')');
    ok(land && near(land.t, dt + 0.4, 1e-9), 'dt ' + dtName(dt) + ': move:land at that same step');
    ok(end && end.reason === 'time' && near((end.t - land.t) / dt + 1, live, 1e-6), 'dt ' + dtName(dt) + ': live for exactly ' + live + ' steps (0.2 s), then ends by time');
    ok(xs.size === 1 && xs.has('200,0'), 'dt ' + dtName(dt) + ': the point is the enemy position at the cast and never moves');
  }
  { const o = mkP([[RS]]), E = mkE(200, 0); let pts = new Set();
    const tape = run(o, [E], 0.9, { each: k => { if (k === 10) E.x = 300; const i = inst1(RS); if (i) pts.add(i.x); } });
    ok(hitCount(tape, E, RS) === 0 && pts.size === 1 && pts.has(200), 'the enemy walks 100 px away during the wait: no hit, the point did not follow'); }
  for (const [x, want] of [[200 + 79.9, 1], [200 + 80.1, 0]]) {     // radius 70 + enemy radius 10
    const o = mkP([[RS]]), E = mkE(200, 0); const tape = run(o, [E], 0.9, { each: k => { if (k === 5) E.x = x; } });
    ok(hitCount(tape, E, RS) === want, 'an enemy ' + (x - 200).toFixed(1) + ' px from the point at the landing: ' + want + ' hit');
  }
  { const proto = Enemy.prototype.applyFlinch; let n = 0; Enemy.prototype.applyFlinch = function () { n++; return true; };
    const p = rate(RS, () => { const v = n; n = 0; return v > 0; });
    Enemy.prototype.applyFlinch = proto;
    ok(Math.abs(p - 0.3) <= 0.01, 'flinch rolls on about 30% of hits (' + p.toFixed(3) + ')'); }
  { const o = mkP([[RS]]), E = mkE(430, 0), r = counter(); let at = null, calls = null, slotT = null;
    const tape = run(o, [E], 1.5, { rng: r, each: (k, t) => {
      if (k === 60) E.x = 400;
      if (at == null && inst1(RS)) { at = t; calls = r.calls; slotT = o.slots[0][0].t; } } });
    ok(castsOf(tape, RS).length === 1 && near(at, 61 / 60, 1e-9), 'no cast while the only enemy is past range 420; it casts the frame after it steps inside (' + at + ')');
    ok(calls === 1, 'no rng drawn while waiting; one draw for the pick (' + calls + ')');
    ok(near(slotT, REAL[RS].cd, 1e-9), 'the cooldown is spent only on the real cast (' + slotT + ')'); }
  { const pos = [[100, 50], [-80, 120], [0, -150], [210, 0]], es = pos.map(([x, y]) => mkE(x, y)), far = mkE(-430, 0);
    for (const [v, k] of [[0, 0], [0.6, 2], [0.999, 3]]) {
      const o = mkP([[RS]]); run(o, es.concat(far), 1 / 60, { rng: () => v });
      const i = inst1(RS), t = es[k];
      ok(i && i.cast.target === t && i.x === t.x && i.y === t.y, 'rng ' + v + ' picks candidate ' + k + ' of 4 by id (enemy ' + t.id + '), never the one past range');
    } }
  { const es = [[60, 0], [0, 90], [-120, 0], [0, -200]].map(([x, y]) => mkE(x, y)), cnt = () => {
      const c = new Map(), seen = new Set(), o = mkP([[RS]], { cdMul: 0.001 });
      run(o, es, 150, { rng: seeded(9), each: () => { for (const i of ofMove(RS)) if (!seen.has(i.id)) { seen.add(i.id); c.set(i.cast.target.id, (c.get(i.cast.target.id) || 0) + 1); } } });
      return es.map(e => c.get(e.id) || 0); };
    const a = cnt(), b = cnt(), N = a.reduce((s, v) => s + v, 0);
    ok(N > 2500 && a.every(v => Math.abs(v / N - 0.25) <= 0.03), 'the pick is uniform over 4 candidates (' + a + ' of ' + N + ')');
    ok(a.join() === b.join(), 'and deterministic for a fixed seed'); }
  { const o = mkP([[RS]]), E = mkE(200, 0); const tape = run(o, [E], 0.9, { each: k => { if (k === 5) o.dead = true; } });
    ok(hitCount(tape, E, RS) === 1, 'a faint during the wait does not cancel the boulder (its endOn has no ownerDeath, D28: only what would end it anyway)'); }
  console.log('3 Rock Slide: hit at 0.4 s, live 0.2 s, point fixed, 70 px circle, flinch 30%, seeded uniform pick inside range, no roll while waiting'); }

// 4. locationPick caster (synthetic): the point is the owner's position at the cast
{ syn('syn-loc-caster', { cd: 5, space: { shape: 'radial', radArc: TAU, radRadius: 30, count: 1 }, delivery: { anchor: 'world', targeting: 'location', locationPick: 'caster', motion: 'falls', range: 420, endOn: [{ time: 0.5 }] } });
  const o = mkP([['syn-loc-caster']], { x: 50, y: -20 }), r = counter(); const at = new Set();
  run(o, [mkE(200, 0)], 0.4, { rng: r, each: () => { const i = inst1('syn-loc-caster'); if (i) at.add(i.x + ',' + i.y); o.x += 3; } });
  ok(at.size === 1 && at.has('50,-20') && r.calls === 0, 'the point is the owner position at the cast, it stays while the owner walks, no rng (' + [...at] + ')');
  const o2 = mkP([['syn-loc-caster']]); ok(castsOf(run(o2, [mkE(500, 0)], 0.3), 'syn-loc-caster').length === 0, 'it still waits for a live enemy within range (R9)');
  console.log('4 locationPick caster: owner position, fixed, no roll'); }

// 5. delay in general (synthetic): no motion, aging, collision or endOn while waiting; time counts from activation
{ const SHOT = { cd: 5, space: { shape: 'radial', radRadius: 6, count: 1, pierce: Infinity } };
  syn('syn-delay-shot', Object.assign({}, SHOT, { delivery: { anchor: 'caster', targeting: 'direction', motion: 'travels', moveSpeed: 300, delay: 0.3, endOn: [{ time: 0.5 }, { ownerDeath: true }] } }));
  for (const dt of DTS) {
    const o = mkP([['syn-delay-shot']]), E = mkE(3, 0), W = Math.round(0.3 / dt), log = [];
    const tape = run(o, [E], 1, { dt, each: k => { const i = inst1('syn-delay-shot'); log[k] = i ? { x: i.x, age: i.age } : null; } });
    let bad = 0; for (let k = 1; k <= W; k++) if (!log[k] || log[k].x !== 0 || log[k].age !== 0) bad++;
    ok(bad === 0 && log[W + 1] && near(log[W + 1].age, dt, 1e-9) && near(log[W + 1].x, 300 * dt, 1e-9), 'dt ' + dtName(dt) + ': ' + W + ' waiting steps with no motion and age 0, then it moves (' + bad + ' bad)');
    ok(near(firstHit(tape, E, 'syn-delay-shot'), (W + 1) * dt, 1e-9), 'dt ' + dtName(dt) + ': the enemy on the spawn point is hit only at the first live step');
    const end = ends(tape)[0];
    ok(end && end.reason === 'time' && near(end.t, (W + Math.ceil(0.5 / dt - 1e-9)) * dt, 1e-9), 'dt ' + dtName(dt) + ': endOn time 0.5 counts from activation, ends at ' + (end && end.t.toFixed(4)) + ' (0.8)');
  }
  { const o = mkP([['syn-delay-shot']]), E = mkE(3, 0); const tape = run(o, [E], 0.5, { each: k => { if (k === 5) o.dead = true; } });
    ok(ends(tape, 'ownerDeath').length === 1 && hitsOf(tape).length === 0, 'a faint during the wait ends it when ownerDeath is listed, before any hit'); }
  syn('syn-delay-off', Object.assign({}, SHOT, { delivery: { anchor: 'caster', targeting: 'direction', motion: 'travels', moveSpeed: 300, delay: 0.3, endOn: [{ time: 2 }, { offScreen: true }] } }));
  { const o = mkP([['syn-delay-off']]); const tape = run(o, [mkE(100, 0)], 0.5, { each: k => { if (k === 1) Sim.setView({ x: 5000, y: 5000, w: 10, h: 10 }); } });
    const end = ends(tape)[0];
    ok(end && end.reason === 'offScreen' && near(end.t, 19 / 60, 1e-9), 'offScreen is not evaluated while waiting; it fires on the first live step (' + (end && end.t.toFixed(4)) + ')'); }
  syn('syn-delay-persist', { persistent: true, space: { shape: 'radial', radArc: TAU, radRadius: 40, count: 1 }, delivery: { anchor: 'caster', targeting: 'none', motion: 'static', delay: 0.5, endOn: [{ time: 1 }] } });
  { const o = mkP([['syn-delay-persist'], []]); const tape = run(o, [mkE(20, 0)], 0.3, { each: k => { if (k === 5) o.act = 1; } });
    ok(ends(tape, 'notActive').length === 1 && hitsOf(tape).length === 0, 'a persistent group still waiting ends notActive when its slot leaves the active group'); }
  console.log('5 delay: whole waiting steps, then live as if just cast; faint (when listed) and notActive still end it'); }

// 6. Psychic (validation 2.5 scenario 5, D18, D21, D23): wedge 0.5 rad x 70 px, 80 px/s, grows 1.5 rad/s to 2.0, steers 2.5 rad/s
{ const a50 = 50 * Math.PI / 180;
  for (const dt of DTS) {
    // A (120, 0) is the cast target; B and C at +-50 degrees, 90 px appear after the cast. The apex is (80 age, 0), heading 0. A is in
    // reach when 120 - 80 age <= 80 (age 0.5). B is within 80 px only for age 0.216 to 1.23, and there its angle off the heading
    // (>= 1.039 rad, rising) always exceeds the half arc plus asin(10 / d) (<= 0.63 by the time the angle passes 1.146, the most the
    // tolerance can reach): B and C are never hit.
    const o = mkP([[PS]]), A = mkE(120, 0); let B, C;
    const tape = run(o, [A], 1.3, { dt, each: k => { if (k === 1) { B = mkE(90 * Math.cos(a50), 90 * Math.sin(a50)); C = mkE(90 * Math.cos(a50), -90 * Math.sin(a50)); enemies.push(B, C); } } });
    ok(hitCount(tape, A, PS) === 1 && between(firstHit(tape, A, PS), 0.5, 0.5 + dt), 'dt ' + dtName(dt) + ': the enemy ahead is hit once, at age 0.5 (' + firstHit(tape, A, PS) + ')');
    ok(hitCount(tape, B, PS) === 0 && hitCount(tape, C, PS) === 0, 'dt ' + dtName(dt) + ': the +-50 degree enemies at 90 px are left behind, never inside the wedge');
    // W (150, 45): within 80 px from age (150 - sqrt(80^2 - 45^2)) / 80 = 1.0482, where the half arc is 1.0 (grown) and W's angle is
    // atan2(45, 66.14) = 0.597; ungrown (0.25 + asin(10 / 80) = 0.376) it would never be inside.
    const o2 = mkP([[PS]]), F = mkE(400, 0); let Wd;
    const t2 = run(o2, [F], 1.3, { dt, each: k => { if (k === 1) { Wd = mkE(150, 45); enemies.push(Wd); } } });
    const tin = (150 - Math.sqrt(6400 - 2025)) / 80;
    ok(hitCount(t2, Wd, PS) === 1 && between(firstHit(t2, Wd, PS), tin, tin + dt), 'dt ' + dtName(dt) + ': an enemy only the widened wedge covers is hit once, as it comes into reach at ' + tin.toFixed(4) + ' s (' + firstHit(t2, Wd, PS) + ')');
    let bad = 0, at1 = null;
    run(mkP([[PS]]), [mkE(400, 0)], 1.15, { dt, each: () => { const i = inst1(PS); if (!i) return; if (!near(i.shape.arc, Math.min(2, 0.5 + 1.5 * i.age), 1e-9)) bad++; if (Math.abs(i.age - 1) < 1e-6) at1 = i.shape.arc; } });
    ok(bad === 0 && near(at1, 2, 1e-9), 'dt ' + dtName(dt) + ': radArc = min(2, 0.5 + 1.5 age), 2.0 at age 1.0 (' + bad + ' off)');
    const o3 = mkP([[PS]]), T = mkE(150, 0), hs = [];
    run(o3, [T], 0.5, { dt, each: k => { const i = inst1(PS); if (k === 1) { T.x = 0; T.y = 300; } if (i) hs.push(i.heading); } });
    let over = 0, exact = 0; for (let k = 1; k < hs.length; k++) { const d = hs[k] - hs[k - 1]; if (d > 2.5 * dt + 1e-12) over++; if (k <= 10 && near(d, 2.5 * dt, 1e-9)) exact++; }
    ok(over === 0 && exact === 10, 'dt ' + dtName(dt) + ': the heading steers at exactly 2.5 x dt per step toward a target far off, never more (' + over + ', ' + exact + ')');
  }
  { const o = mkP([[PS]]), A = mkE(150, 0); let B, C; const log = {};
    run(o, [A], 1.2, { each: k => { const i = inst1(PS);
      if (k === 1) { B = mkE(0, 200); C = mkE(0, -300); enemies.push(B, C); }
      if (i) log[k] = { h: i.heading, s: i.steer };
      if (k === 3) A.dead = true;
      if (k === 10) B.dead = true; } });
    ok(log[4].s === B && log[4].h > log[3].h, 'D-PSY: the cast target dies, the wedge re-picks the nearest (B) and turns toward it');
    let turned = 0; for (let k = 12; log[k]; k++) if (log[k].h !== log[11].h) turned++;
    ok(turned === 0, 'that one dies too: no second re-pick, it flies straight although C lives in range (' + turned + ' frames turned)'); }
  const p = rate(PS, e => S.list(e).some(s => s.stat === 'spd' && s.stage === -1));
  ok(Math.abs(p - 0.1) <= 0.01, 'Sp. Def -1 on about 10% of hits (' + p.toFixed(3) + ')');
  console.log('6 Psychic: ahead hit at 0.5 s, side enemies left behind, widened-only hit at 1.048 s, radArc 2.0 at 1.0 s, 2.5 rad/s steer, one re-pick, Sp. Def ' + p.toFixed(3)); }

// 7. Bubble Beam: 7 shots fanned 0.12, lateral offset exactly 18 sin(2 pi 3 age) (D24), pierce 0, Speed -1 at 10%
{ for (const dt of DTS) {
    const o = mkP([[BB]]); let bad = 0, frames = 0; const h0 = {};
    run(o, [mkE(0, -400)], 1.3, { dt, each: () => { for (const i of ofMove(BB)) {
      const h = (i.fan / 6 - 0.5) * 0.12, lat = -Math.sin(h) * i.x + Math.cos(h) * i.y, lon = Math.cos(h) * i.x + Math.sin(h) * i.y;
      if (!(i.fan in h0)) h0[i.fan] = i.heading;
      frames++; if (Math.abs(lat - 18 * Math.sin(TAU * 3 * i.age)) > 1e-9 || Math.abs(lon - 330 * i.age) > 1e-9) bad++; } } });
    ok(frames > 0 && bad === 0, 'dt ' + dtName(dt) + ': every shot sits at 330 age along and 18 sin(6 pi age) across its heading (' + bad + ' of ' + frames + ' off)');
    ok(Object.keys(h0).length === 7 && Object.entries(h0).every(([f, h]) => near(h, (f / 6 - 0.5) * 0.12, 1e-12)), 'dt ' + dtName(dt) + ': 7 shots fanned over 0.12 rad');
  }
  { const E = mkE(60, 0), tape = run(mkP([[BB]]), [E], 0.5);
    ok(hitCount(tape, E, BB) === 7 && ends(tape, 'pierce').length === 7, 'all 7 shots land on a close enemy (lateral <= 5 + 3.6 < 17 at 60 px), each spent on contact');
    ok(new Set(hitsOf(tape, BB).map(h => h.instId)).size === 7, 'each shot hits once'); }
  const p = rate(BB, e => S.list(e).some(s => s.stat === 'spe' && s.stage === -1));
  ok(Math.abs(p - 0.1) <= 0.01, 'Speed -1 on about 10% of hits (' + p.toFixed(3) + ')');
  console.log('7 Bubble Beam: exact oscillation at both dts, 7-shot fan, pierce 0, Speed ' + p.toFixed(3)); }

// 8. Aura Sphere: 6 shots 2 pi / 6 apart, heading += 1.5 dt per step (D23), reach about 2 x (120 / 1.5) x sin(1.5) = 159.6 px
{ for (const dt of DTS) {
    const o = mkP([[AS]], { aim: 0.3 }), prev = {}; let bad = 0, first = 0, far = 0;
    const tape = run(o, [], 2.1, { dt, each: k => { for (const i of ofMove(AS)) {
      if (!(i.id in prev)) { if (k === 1 && near(i.heading, Math.atan2(Math.sin(0.3 + i.fan * TAU / 6 + 1.5 * dt), Math.cos(0.3 + i.fan * TAU / 6 + 1.5 * dt)), 1e-9)) first++; }     // later casts' shots start mid-run
      else { let d = i.heading - prev[i.id]; d = Math.atan2(Math.sin(d), Math.cos(d)); if (!near(d, 1.5 * dt, 1e-9)) bad++; }
      prev[i.id] = i.heading; far = Math.max(far, Math.hypot(i.x, i.y)); } } });
    ok(first === 6 && bad === 0, 'dt ' + dtName(dt) + ': six shots start at aim + i 2 pi / 6 and turn exactly 1.5 x dt per step (' + first + ', ' + bad + ')');
    ok(far >= 155 && far <= 162, 'dt ' + dtName(dt) + ': measured reach ' + far.toFixed(1) + ' px (about 160 expected)');
    ok(ends(tape, 'time').length === 6, 'dt ' + dtName(dt) + ': all six end by time 2');
    console.log('   Aura Sphere reach at dt ' + dtName(dt) + ': ' + far.toFixed(2) + ' px');
  }
  ok(REAL[AS].accuracy == null && REAL[AS].basePower === 80, 'accuracy null folds to basePower 80, never a miss');
  console.log('8 Aura Sphere: six-way fan, curve 1.5 rad/s, reach about 160 px'); }

// 9. Confusion: homing capped at 3 rad/s (D23), pierce 0, confusion 10%
{ const o = mkP([[CF]]), A = mkE(0, 100), hs = [];
  run(o, [A], 0.4, { each: k => { const i = inst1(CF); if (k === 1) { A.x = -150; A.y = -50; } if (i) hs.push(i.heading); } });
  let over = 0, exact = 0; for (let k = 1; k < hs.length; k++) { const d = Math.abs(Math.atan2(Math.sin(hs[k] - hs[k - 1]), Math.cos(hs[k] - hs[k - 1]))); if (d > 3 / 60 + 1e-12) over++; if (k <= 8 && near(d, 3 / 60, 1e-9)) exact++; }
  ok(over === 0 && exact === 8, 'the homing turn is exactly 3 x dt per step toward a target behind, never more (' + over + ', ' + exact + ')');
  { const A2 = mkE(100, 0), B2 = mkE(160, 0), tape = run(mkP([[CF]]), [A2, B2], 0.8);
    ok(hitCount(tape, A2, CF) === 1 && hitCount(tape, B2, CF) === 0 && ends(tape, 'pierce').length === 1, 'pierce 0: the first enemy ends it, the one behind is untouched'); }
  const p = rate(CF, e => !!e.stCnf);
  ok(Math.abs(p - 0.1) <= 0.01, 'confusion on about 10% of hits (' + p.toFixed(3) + ')');
  console.log('9 Confusion: 3 rad/s homing, pierce 0, confusion ' + p.toFixed(3)); }

// 10. determinism: the five moves plus Flamethrower, same seed and tape twice, at both dts
{ for (const dt of DTS) {
    const f = () => { eid = 0; const tape = run(mkP([[PS, CF, BB, AS, RS, FT]]), [mkE(120, 10), mkE(150, -40), mkE(-90, 10), mkE(30, 200)], 2.5, { dt, rng: seeded(3) });
      return JSON.stringify(tape.map(({ instId, ...r }) => r)); };
    ok(f() === f(), 'dt ' + dtName(dt) + ': same inputs, same tape');
  }
  console.log('10 determinism: same tape twice at 1/60 and 1/30'); }

console.log(fail ? 'move-travel harness: ' + fail + ' FAILED of ' + n : 'move-travel harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
