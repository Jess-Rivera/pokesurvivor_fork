// Move sim offline checks, slice 3c (Node only). Usage from the repo root:  node docs/proposals/move-sim-harness.js .
// Loads the real move data chain, G.MoveGeom, G.Stats, G.Types, G.Stages, G.Status and G.SimBus, with small stubs for the enemy
// manager, world walls, weather and FX. Math.random and performance.now throw while the sim runs (invariant I7). Since slice 4a the
// riders roll too (burn on the fire canaries): a world without a seed runs on seed 0 when a move has a chance rider, and on the
// throwing rng otherwise, so any other stray roll still fails loudly. The rider rules themselves are checked in
// docs/proposals/move-riders-harness.js against the real enemy, status and stages modules. Every canary runs at dt 1/60 and 1/30 and the hit counts
// must agree. Damage is checked two ways, neither sharing arithmetic with the code under test: pinned numbers from
// docs/proposals/move-sim-golden.py (written from the architecture text), and a random property test that re-derives D6 to D11 here.
// The mutation runner (docs/proposals/move-sim-mutate.js) points MOVE_SIM_SRC / MOVE_FX_SRC at altered copies.
// MOVE_SIM_TABLE=1 prints the damage numbers table.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SIM = process.env.MOVE_SIM_SRC || R + '/js/systems/move-sim.js', FXS = process.env.MOVE_FX_SRC || R + '/js/systems/move-effects.js';
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 40) console.log('FAIL', m); } };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const load = f => vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const TAU = Math.PI * 2, DTS = [1 / 60, 1 / 30];
const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// ---- engine: real modules plus stubs ----
global.G = {}; global.window = global;
for (const f of ['js/core/util.js', 'js/core/stats.js', 'js/data/types.js', 'js/systems/stages.js', 'js/systems/status.js', 'js/core/simbus.js',
  'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js',
  'js/data/move-resolver.js']) load(R + '/' + f);
G.MoveDefs = Object.assign({}, G.MoveDefs);     // slice 4c-1: the live defs are deep-frozen (I2); synthetic moves go in a copy of the container, the real defs stay frozen
G.FX = new Proxy({}, { get: () => () => {} });
G.DEX_BY = { 7: { stats: [44, 48, 65, 50, 64, 43] } };       // Squirtle: Def 65, SpD 64
let weather = {}, wallX = Infinity, enemies = [], props = [], clock = 0;
G.Weather = { mult: t => weather[t] || 1 };
G.World = { projectileBlock: (x, y, r) => (x + r >= wallX ? 'wall' : null),
  propsInCircle: (x, y, r) => props.filter(p => p.hp > 0 && (p.x - x) ** 2 + (p.y - y) ** 2 <= (r + p.r) ** 2),
  damageProp(p, a) { p.log.push({ a, t: clock }); p.hp -= a; } };
G.EnemyMgr = { all: () => enemies,
  queryCircleEach(x, y, r, fn) { for (const e of enemies.slice()) if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= (r + e.r) ** 2) fn(e); } };
const trap = what => () => { throw new Error('I7 breach: ' + what + ' called inside the sim'); };
Math.random = trap('Math.random');
Object.defineProperty(performance, 'now', { value: trap('performance.now'), configurable: true });
const fresh = () => { load(SIM); load(FXS); };     // fresh module state (instance serials) per run

// ---- synthetic defs (added beside the real ones; G.MoveDefs is not frozen yet, architecture I2 is still open) ----
const syn = (id, space, delivery, extra = {}) => { G.MoveDefs[id] = Object.assign({ id, type: 'normal', category: 'physical', basePower: 40, cd: 10,
  space: Object.assign({ shape: 'radial', count: 1, spread: 0, pierce: Infinity }, space), delivery: Object.assign({ anchor: 'caster', endOn: [{ time: 1 }] }, delivery),
  hitPolicy: 'oncePerInstance', payload: [{ t: 'damage' }] }, extra); return id; };
const CIRCLE = r => ({ radRadius: r, radArc: 6.2832 });

// ---- world builders ----
const mkE = (id, x, y, o = {}) => Object.assign({ id, x, y, r: 10, dex: 7, atkLvl: 25, types: ['normal'], hp: 1e12, dead: false, log: [],
  hurt(a) { this.log.push({ a, t: clock }); this.hp -= a; if (this.hp <= 0) this.dead = true; },
  applyBurn() {}, applyPoison() {}, applyFlinch() {} }, o);     // riders (slice 4a) are checked in move-riders-harness.js
const mkO = (ids, o = {}) => Object.assign({ id: 'p1', x: 0, y: 0, r: 12, aim: 0, level: 30, atk: 84, spa: 109, myTypes: ['fire'], extraMul: 1.1,
  atkStage: 1, spaStage: 1, cdMul: 1, critChance: 0, dead: false, stgTeam: null, moveRadiusMul: 1, dmgDealt: 0,
  slots: [ids.map(id => ({ id, t: 0 }))], activeGroup() { return this.slots[0]; },
  moveFactor(m) { return G.Stats.attackFactor(this.atk, this.spa, this.level, m, this.extraMul * (m.cat === 'special' ? this.spaStage : m.cat === 'physical' ? this.atkStage : 1)); },
  stabFor(m) { return this.myTypes.includes(m.type); }, onDealt() {} }, o);

/** Runs a world for `secs` at `dt`. w = { owner, enemies, seed, view, wall, onStep(k, t, w), weather, watch }. Time is k x dt, never accumulated. */
function run(w, secs, dt) {
  fresh();
  enemies = w.enemies || []; props = w.props || []; weather = w.weather || {}; wallX = w.wall != null ? w.wall : Infinity;
  const rolls = w.owner.slots.some(g => g.some(sl => (G.MoveDefs[sl.id].payload || []).some(fx => fx.chance != null && fx.chance < 100)));
  G.MoveSim.setRng(w.seed != null ? seeded(w.seed) : rolls ? seeded(0) : trap('the sim rng (no roll expected)'));
  G.MoveSim.setView(w.view || null);
  if (w.filter) G.MoveSim.setFilter(w.filter);
  const tape = G.SimBus.record(), N = Math.round(secs / dt);
  w.steps = [];
  for (let k = 1; k <= N; k++) {
    clock = k * dt;
    if (w.onStep) w.onStep(k, clock, w);
    G.MoveSim.tick(dt, w.owner, clock);
    if (w.watch) w.steps.push(G.MoveSim.list().map(i => ({ id: i.id, x: i.x, y: i.y, h: i.heading, age: i.age })));
  }
  G.SimBus.stopRecording();
  w.tape = tape; w.alive = G.MoveSim.list().length;
  return w;
}
const counts = w => w.enemies.map(e => e.log.length);
const evs = (w, t) => w.tape.filter(e => e.type === t);
const reasons = w => evs(w, 'move:end').map(e => e.reason);
/** Tape integrity: one 'move:hit' per landed hurt (per enemy), each instance ends at most once, and casts x count = ends + alive. */
function tapeOk(w, label, count = 1) {
  const hits = evs(w, 'move:hit'), ends = evs(w, 'move:end');
  for (const e of w.enemies) ok(hits.filter(h => h.enemyId === e.id).length === e.log.length, label + ': one move:hit per hurt on enemy ' + e.id);
  ok(new Set(ends.map(e => e.instId)).size === ends.length, label + ': an instance ended twice');
  ok(evs(w, 'move:cast').length * count === ends.length + w.alive, label + ': casts x count = ends + alive');
  ok(w.tape.every(e => Object.values(e).every(v => v === null || ['number', 'string', 'boolean'].includes(typeof v))), label + ': plain-data events');
}
/** Runs the same world builder at both timesteps; hit counts and end reasons must agree, and match `want`. */
function both(label, build, secs, want, count = 1) {
  const ws = DTS.map(dt => run(build(), secs, dt));
  ws.forEach((w, i) => { tapeOk(w, label + ' dt ' + i, count); if (want) ok(JSON.stringify(counts(w)) === JSON.stringify(want), label + ' dt ' + ['1/60', '1/30'][i] + ' hits ' + counts(w) + ', want ' + want); });
  ok(JSON.stringify(counts(ws[0])) === JSON.stringify(counts(ws[1])), label + ': 1/60 and 1/30 disagree, ' + counts(ws[0]) + ' vs ' + counts(ws[1]));
  ok(JSON.stringify(reasons(ws[0])) === JSON.stringify(reasons(ws[1])), label + ': end reasons differ between timesteps');
  return ws;
}

// ---- 1. pinned damage numbers (python golden) ----
const GOLDEN = {
  'neutral tackle': 20.313513513513513, 'neutral ember': 37.962162162162166, 'neutral water-gun': 25.30810810810811,
  'neutral hydro-pump': 53.27783783783784, 'neutral heat-wave': 77.73162162162163, 'neutral mud-shot': 32.446216216216214,
  'neutral flamethrower': 81.66486486486487, 'ember vs grass (x1.6, STAB)': 60.73945945945947, 'ember vs grass, crit': 91.10918918918921,
  'water-gun in rain (weather x1.5)': 37.962162162162166, 'ember, owner SpA stage x2': 72.92432432432433, 'tackle vs Def stage -1': 29.470270270270273,
  'water-gun vs grass with Power Stone (floor 1)': 25.30810810810811, 'ember vs grass, Expert Belt + fire boost': 87.46482162162162,
  'boss (atkLvl 0) defends at owner level': 33.08372093023256, 'weak owner tackle vs ghost (x0.3), crit, floor': 1.1179459459459458,
  'weak owner tackle vs ghost, no crit, floor': 1.0 };
const CANARY = ['tackle', 'ember', 'water-gun', 'hydro-pump', 'heat-wave', 'mud-shot', 'flamethrower'];
function firstHit(id, o = {}, e = {}, extra = {}) {
  const w = run(Object.assign({ owner: mkO([id], o), enemies: [mkE(1, 30, 0, e)], seed: 7 }, extra), 0.5, 1 / 60);
  return w.enemies[0].log.length ? w.enemies[0].log[0].a : NaN;
}
const GC = [...CANARY.map(id => ['neutral ' + id, () => firstHit(id)]),
  ['ember vs grass (x1.6, STAB)', () => firstHit('ember', {}, { types: ['grass'] })],
  ['ember vs grass, crit', () => firstHit('ember', { critChance: 1 }, { types: ['grass'] })],
  ['water-gun in rain (weather x1.5)', () => firstHit('water-gun', {}, {}, { weather: { water: 1.5 } })],
  ['ember, owner SpA stage x2', () => firstHit('ember', { spaStage: 2 })],
  ['tackle vs Def stage -1', () => firstHit('tackle', {}, { stg: { def: [{ n: -1 }] } })],
  ['water-gun vs grass with Power Stone (floor 1)', () => firstHit('water-gun', { stoneType: 'water' }, { types: ['grass'] })],
  ['ember vs grass, Expert Belt + fire boost', () => firstHit('ember', { expertBelt: true, typeBoost: 'fire' }, { types: ['grass'] })],
  ['boss (atkLvl 0) defends at owner level', () => firstHit('ember', {}, { atkLvl: 0 })],
  ['weak owner tackle vs ghost (x0.3), crit, floor', () => firstHit('tackle', { level: 2, extraMul: 1, critChance: 1 }, { types: ['ghost'] })],
  ['weak owner tackle vs ghost, no crit, floor', () => firstHit('tackle', { level: 2, extraMul: 1 }, { types: ['ghost'] })]];
for (const [k, f] of GC) { const v = f(); ok(near(v, GOLDEN[k]), 'golden ' + k + ': got ' + v + ', want ' + GOLDEN[k]); if (process.env.MOVE_SIM_TABLE) console.log('TABLE|' + k + '|' + v + '|' + GOLDEN[k]); }

// ---- 2. property test: D6 to D11 re-derived here from the text, against applyHit called directly ----
{ fresh();
  const rnd = seeded(99), ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)), pick = a => a[ri(0, a.length - 1)];
  const sv = (b, L) => Math.floor(2 * b * L / 100) + 5, lad = s => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
  const TY = ['normal', 'fire', 'water', 'grass', 'ghost', 'rock', 'steel', 'dragon', 'ground', 'electric'];
  for (let i = 0; i < 1500; i++) {
    const def = G.MoveDefs[pick(CANARY)], crit = rnd() < 0.5;
    const o = mkO([def.id], { level: ri(1, 100), atk: ri(5, 200), spa: ri(5, 200), extraMul: 0.5 + rnd() * 2.5, atkStage: lad(ri(-6, 6)), spaStage: lad(ri(-6, 6)),
      myTypes: [pick(TY), pick(TY)], critChance: crit ? 1 : 0, stoneType: rnd() < 0.3 ? def.type : null, expertBelt: rnd() < 0.3, typeBoost: rnd() < 0.3 ? def.type : null });
    const ds = ri(-6, 6), e = mkE(1, 0, 0, { atkLvl: rnd() < 0.2 ? 0 : ri(1, 100), types: [pick(TY), pick(TY)], stg: { def: [{ n: ds }], spd: [{ n: ds }] } });
    weather = rnd() < 0.3 ? { [def.type]: 1.5 } : {};
    const r = G.MoveEffects.applyHit({ spec: def, cast: { owner: o }, x: -20, y: 0 }, e, 0, () => 0.5);
    // hand computation from the architecture text
    const L = o.level, sp = def.category === 'special';
    const A = (2 * L / 5 + 2) * def.basePower * sv(sp ? o.spa : o.atk, L) / 50 * o.extraMul * (sp ? o.spaStage : o.atkStage);
    const dl = e.atkLvl > 0 ? e.atkLvl : L, dS = sv(sp ? 64 : 65, dl) * lad(ds);
    const D = (A / Math.max(1, dS) + 2) * (o.myTypes.includes(def.type) ? 1.5 : 1) * 1.0;
    let k = G.Types.mult(def.type, e.types) * (weather[def.type] || 1);
    if (o.stoneType === def.type) k = Math.max(1, k);
    const item = (o.expertBelt && k > 1 ? 1.2 : 1) * (o.typeBoost === def.type ? 1.2 : 1);
    const want = Math.max(1, D * k * item * (crit ? 1.5 : 1));
    ok(r && near(r.dmg, want) && near(e.log[0].a, want) && r.crit === crit, 'property case ' + i + ' ' + def.id + ': ' + (r && r.dmg) + ' vs ' + want);
  }
  weather = {}; }

// ---- 3. canaries ----
// Tackle: every enemy in its arc once (1.7 rad, r 48, enemy r 10); behind, beside and beyond are missed
both('tackle arc', () => ({ owner: mkO(['tackle']), enemies: [mkE(1, 30, 0), mkE(2, 35, 20), mkE(3, 0, 40), mkE(4, -30, 0), mkE(5, 55, 0), mkE(6, 60, 0)] }), 0.3, [1, 1, 0, 0, 1, 0]);
// cast gate reach (S1): 48 + 10 = 58 px; lens 2 doubles the radius (and the arc), so 100 px is in reach
both('tackle gate, out of reach', () => ({ owner: mkO(['tackle']), enemies: [mkE(1, 100, 0)] }), 1, [0]).forEach(w => ok(evs(w, 'move:cast').length === 0, 'tackle cast at an enemy out of reach'));
both('tackle gate, edge of reach', () => ({ owner: mkO(['tackle']), enemies: [mkE(1, 57.9, 0)] }), 0.3, [1]);
both('tackle gate, lens 2', () => ({ owner: mkO(['tackle'], { moveRadiusMul: 2 }), enemies: [mkE(1, 100, 0)] }), 0.3, [1]);
// Ember: dies on its first enemy (pierce 0); the direction gate needs any enemy within range 420
both('ember pierce 0', () => ({ owner: mkO(['ember']), enemies: [mkE(1, 60, 0), mkE(2, 120, 0), mkE(3, 0, 400)] }), 0.6, [1, 0, 0])
  .forEach(w => ok(reasons(w)[0] === 'pierce', 'ember ends on pierce, got ' + reasons(w)));
both('ember gate, nothing in range', () => ({ owner: mkO(['ember']), enemies: [mkE(1, 0, 430)] }), 1, [0]).forEach(w => ok(evs(w, 'move:cast').length === 0, 'ember cast with no enemy in range'));
both('ember wall', () => ({ owner: mkO(['ember']), enemies: [mkE(1, 0, 400)], wall: 150 }), 0.6, [0]).forEach(w => ok(reasons(w)[0] === 'wall', 'ember wall end, got ' + reasons(w)));
both('ember offScreen', () => ({ owner: mkO(['ember']), enemies: [mkE(1, 0, 300)], view: { x: -100, y: -100, w: 200, h: 200 } }), 1.3, [0])
  .forEach(w => ok(reasons(w)[0] === 'offScreen', 'ember offScreen end, got ' + reasons(w)));
both('ember time', () => ({ owner: mkO(['ember']), enemies: [mkE(1, 0, 400)] }), 1.7, [0]).forEach(w => ok(reasons(w)[0] === 'time', 'ember time end, got ' + reasons(w)));
// Water Gun: passes one, dies on the second
both('water gun pierce 1', () => ({ owner: mkO(['water-gun']), enemies: [mkE(1, 60, 0), mkE(2, 120, 0), mkE(3, 180, 0)] }), 0.6, [1, 1, 0])
  .forEach(w => ok(reasons(w)[0] === 'pierce', 'water gun ends on pierce'));
// Hydro Pump: every enemy in the band once (length 250, width 30, enemy r 10: along up to 260, side up to 25)
both('hydro pump band', () => ({ owner: mkO(['hydro-pump']), enemies: [mkE(1, 40, 0), mkE(2, 150, 10), mkE(3, 240, 20), mkE(4, 250, 0), mkE(5, 270, 0), mkE(6, 100, 40)] }), 0.6, [1, 1, 1, 1, 0, 0]);
both('hydro pump lens 1.2 scales length, not width', () => ({ owner: mkO(['hydro-pump'], { moveRadiusMul: 1.2 }), enemies: [mkE(1, 40, 0), mkE(5, 270, 0), mkE(6, 100, 40), mkE(7, 330, 0)] }), 0.6, [1, 1, 0, 0]);
// the far corner of the band needs boundsOf's enemy-radius pad (along 259 of 260, side 24 of 25)
both('hydro pump far corner', () => ({ owner: mkO(['hydro-pump']), enemies: [mkE(1, 40, 0), mkE(2, 259, 24)] }), 0.6, [1, 1]);
both('hydro pump gate', () => ({ owner: mkO(['hydro-pump']), enemies: [mkE(1, 265, 0)] }), 0.6, [0]);
// Heat Wave: grows from 1 px at 625 px/s to 250; each enemy once, on the first step the ring reaches it
{ const D = [20, 100, 200, 255, 265];
  const ws = both('heat wave', () => ({ owner: mkO(['heat-wave']), enemies: D.map((d, i) => mkE(i + 1, d, 0)) }), 0.5, [1, 1, 1, 1, 0]);
  ws.forEach((w, j) => { const dt = DTS[j];
    D.slice(0, 4).forEach((d, i) => { const k = Math.max(1, Math.ceil((d - 11) / 625 / dt - 1e-9)), t = w.enemies[i].log[0] && w.enemies[i].log[0].t;
      ok(near(t, k * dt), 'heat wave reaches ' + d + ' px at step ' + k + ', got t ' + t); }); });
  ok(evs(run({ owner: mkO(['heat-wave']), enemies: [] }, 0.1, 1 / 60), 'move:cast').length === 1, 'heat wave (targeting none) casts with no enemies'); }
// Flamethrower: a standing enemy in the cone takes 5 hits in 1 s (rehit 0.2)
both('flamethrower', () => ({ owner: mkO(['flamethrower']), enemies: [mkE(1, 100, 0), mkE(2, -100, 0)] }), 1.1, [5, 0]);
// Mud Shot: 6 shots evenly around the circle, each enemy at 80 px hit once
{ const ws = both('mud shot', () => ({ owner: mkO(['mud-shot']), enemies: [0, 1, 2, 3, 4, 5].map(i => mkE(i + 1, 80 * Math.cos(i * TAU / 6), 80 * Math.sin(i * TAU / 6))), watch: true }), 0.6, [1, 1, 1, 1, 1, 1], 6);
  const hs = ws[0].steps[0].map(s => s.h);
  ok(hs.length === 6 && hs.every((h, i) => Math.abs(Math.atan2(Math.sin(h - i * TAU / 6), Math.cos(h - i * TAU / 6))) < 1e-12), 'mud shot fan headings ' + hs); }
{ const id = syn('syn-fan3', { radRadius: 4, count: 3, spread: 1 }, { targeting: 'direction', motion: 'travels', moveSpeed: 100 });
  const w = run({ owner: mkO([id], { aim: 0.3 }), enemies: [mkE(1, 0, 300)], watch: true }, 0.05, 1 / 60);
  ok(JSON.stringify(w.steps[0].map(s => +s.h.toFixed(12))) === JSON.stringify([-0.2, 0.3, 0.8]), 'partial fan is the total spread, ' + w.steps[0].map(s => s.h)); }

// ---- 4. pierce and hit policies ----
syn('syn-unl', { radRadius: 5 }, { targeting: 'direction', motion: 'travels', moveSpeed: 300 });
both('unlimited pierce', () => ({ owner: mkO(['syn-unl']), enemies: [40, 80, 120, 160, 200].map((x, i) => mkE(i + 1, x, 0)) }), 0.9, [1, 1, 1, 1, 1]);
syn('syn-int-p1', Object.assign(CIRCLE(50), { pierce: 1 }), { targeting: 'none', motion: 'static' }, { hitPolicy: 'interval', rehit: 0.2 });
both('interval with pierce 1 (distinct enemies, path order)', () => ({ owner: mkO(['syn-int-p1']), enemies: [mkE(3, 30, 0), mkE(1, 10, 0), mkE(2, 20, 0)] }), 1, [0, 1, 1])
  .forEach(w => ok(reasons(w)[0] === 'pierce', 'interval pierce 1 ends on pierce'));
syn('syn-int', CIRCLE(50), { targeting: 'none', motion: 'static' }, { hitPolicy: 'interval', rehit: 0.2 });
syn('syn-int-edge', CIRCLE(50), { targeting: 'none', motion: 'static', endOn: [{ time: 0.85 }] }, { hitPolicy: 'interval', rehit: 0.2 });
both('interval rehit lands exactly on its period', () => ({ owner: mkO(['syn-int-edge']), enemies: [mkE(1, 10, 0)] }), 1, [5]);
both('interval unlimited', () => ({ owner: mkO(['syn-int']), enemies: [mkE(1, 10, 0), mkE(2, 20, 0), mkE(3, 30, 0)] }), 1, [5, 5, 5]);
// collision steps for an endOn time T: ceil(T / dt), float drift absorbed (0.1 at 1/60 is 6 steps)
for (const [T, a, b] of [[0, 1, 1], [0.1, 6, 3], [0.15, 9, 5], [0.2, 12, 6]]) {
  const id = syn('syn-steps-' + T, CIRCLE(50), { targeting: 'none', motion: 'static', endOn: [{ time: T }] }, { hitPolicy: 'interval', rehit: 1e-6 });
  DTS.forEach((dt, j) => { const w = run({ owner: mkO([id]), enemies: [mkE(1, 10, 0)] }, 0.5, dt);
    ok(w.enemies[0].log.length === [a, b][j], 'time ' + T + ' at dt ' + j + ' collides ' + w.enemies[0].log.length + ' steps, want ' + [a, b][j]); }); }

// ---- 5. anchors (R8) ----
{ const id = syn('syn-target', CIRCLE(20), { anchor: 'target', targeting: 'nearest', motion: 'static', endOn: [{ time: 2 }] });
  const w = run({ owner: mkO([id]), enemies: [mkE(1, 100, 0)], watch: true, onStep: (k, t, w) => { if (k > 1 && k <= 30) w.enemies[0].x += 1; if (k === 30) w.enemies[0].dead = true; } }, 1, 1 / 60);
  ok(w.steps[9][0].x === 109 && w.steps[28][0].x === 128 && w.steps[29][0].x === 128 && w.steps[59][0].x === 128, 'target anchor follows, then freezes at death: ' + [w.steps[9][0].x, w.steps[29][0].x, w.steps[59][0].x]); }
{ const id = syn('syn-world', CIRCLE(20), { anchor: 'world', targeting: 'none', motion: 'static' });
  const w = run({ owner: mkO([id], { x: 5, y: 6 }), enemies: [], watch: true, onStep: (k, t, w) => { w.owner.x += 2; } }, 0.5, 1 / 60);
  ok(w.steps[0][0].x === 7 && w.steps[20][0].x === 7 && w.steps[20][0].y === 6, 'world anchor stays at the cast origin'); }
{ const w = run({ owner: mkO(['tackle']), enemies: [mkE(1, 30, 0)], watch: true, onStep: (k, t, w) => { w.owner.x += 1; } }, 0.1, 1 / 60);
  ok(w.steps[4][0].x === 5 && w.steps[0][0].x === 1, 'caster anchor rides the owner'); }

// ---- 6. casting: cadence, gate retry, stun, fizzle, death, inactive slots, attacker half at hit time ----
both('tackle cadence', () => ({ owner: mkO(['tackle']), enemies: [mkE(1, 30, 0)] }), 2.0, [4])
  .forEach((w, j) => ok(w.enemies[0].log.every((h, i) => near(h.t, DTS[j] + 0.5 * i)), 'tackle casts every 0.5 s from its first frame'));
DTS.forEach(dt => { const w = run({ owner: mkO(['tackle']), enemies: [mkE(1, 1000, 0)], onStep: (k, t, w) => { if (t >= 0.3 - 1e-12) w.enemies[0].x = 30; } }, 1, dt);
  const t0 = w.enemies[0].log[0] && w.enemies[0].log[0].t; ok(t0 >= 0.3 - 1e-9 && t0 <= 0.35 + dt + 1e-9, 'gate retries every 0.05 s, first cast at ' + t0); });
{ const w = run({ owner: mkO(['tackle'], { stMajor: { k: 'sleep' } }), enemies: [mkE(1, 30, 0)], onStep: (k, t, w) => { if (t >= 0.5) w.owner.stMajor = null; } }, 0.6, 1 / 60);
  ok(w.enemies[0].log.length === 1 && w.enemies[0].log[0].t >= 0.5 && w.enemies[0].log[0].t <= 0.55 + 1e-9, 'stunned owner casts nothing, then casts when it wears off'); }
{ const f = s => run({ owner: mkO(['tackle'], { stMajor: { k: 'paralysis' } }), enemies: [mkE(1, 30, 0)], seed: s }, 10, 1 / 60);
  const a = f(5), b = f(5), c = evs(a, 'move:cast').length;
  ok(c >= 10 && c < 20 && JSON.stringify(a.tape) === JSON.stringify(b.tape), 'paralysis fizzles some casts through the seeded rng, cd still spent: ' + c + ' of 20'); }
{ const id = syn('syn-od', { radRadius: 5 }, { targeting: 'none', motion: 'travels', moveSpeed: 100, endOn: [{ ownerDeath: true }] });
  const w = run({ owner: mkO([id]), enemies: [], onStep: (k, t, w) => { if (k === 30) w.owner.dead = true; } }, 1, 1 / 60);
  ok(JSON.stringify(reasons(w)) === '["ownerDeath"]' && evs(w, 'move:cast').length === 1, 'ownerDeath ends the instance');
  const d = run({ owner: mkO(['tackle'], { dead: true }), enemies: [mkE(1, 30, 0)] }, 1, 1 / 60);
  ok(evs(d, 'move:cast').length === 0, 'dead owner casts nothing'); }
{ const o = mkO(['tackle']); o.slots.push([{ id: 'ember', t: 0.7 }]);
  run({ owner: o, enemies: [] }, 1, 1 / 60); ok(o.slots[1][0].t === 0, 'inactive slots recharge too'); }
{ const w = run({ owner: mkO(['ember']), enemies: [mkE(1, 300, 0)], onStep: (k, t, w) => { if (k === 12) w.owner.spaStage = 2; } }, 1.2, 1 / 60);
  ok(near(w.enemies[0].log[0].a, GOLDEN['ember, owner SpA stage x2']), 'attacker half is computed at hit time, not at cast: ' + w.enemies[0].log[0].a); }
{ const w = run({ owner: mkO(['flamethrower']), enemies: [mkE(1, 100, 0)], onStep: (k, t, w) => { if (k === 30) w.owner.spaStage = 2; } }, 1.1, 1 / 60), L = w.enemies[0].log.map(h => h.a);
  ok(L.length === 5 && near(L[0], GOLDEN['neutral flamethrower']) && near(L[2], L[0]) && L[3] > L[0] * 1.5 && near(L[4], L[3]), 'a stage change mid-cast reaches the later hits of the same instance: ' + L); }

// ---- 7. path perturbations and steering (D23, D24) ----
{ const c = 1.5, v = 200, id = syn('syn-curve', { radRadius: 4 }, { targeting: 'none', motion: 'travels', moveSpeed: v, path: { curve: c }, endOn: [{ time: 2 }] });
  DTS.forEach(dt => { const w = run({ owner: mkO([id]), enemies: [], watch: true }, 1, dt);
    let x = 0, y = 0, bad = 0;
    w.steps.forEach((s, k) => { x += v * dt * Math.cos(c * k * dt); y += v * dt * Math.sin(c * k * dt);     // D23: move along the heading, then turn
      const i = s[0], h = c * (k + 1) * dt;
      if (!near(i.x, x, 1e-9) || !near(i.y, y, 1e-9) || Math.abs(Math.atan2(Math.sin(i.h - h), Math.cos(i.h - h))) > 1e-9) bad++; });
    const T = w.steps.length * dt, last = w.steps[w.steps.length - 1][0], R0 = v / c;
    ok(bad === 0, 'curve follows D23 at dt ' + dt + ' (' + bad + ' bad steps)');
    ok(Math.hypot(last.x - R0 * Math.sin(c * T), last.y - R0 * (1 - Math.cos(c * T))) < 2 * v * dt, 'curve stays near the analytic circle'); }); }
for (const aim of [0, Math.PI / 2]) {
  const id = syn('syn-osc', { radRadius: 4 }, { targeting: 'none', motion: 'travels', moveSpeed: 150, path: { oscillate: { amplitude: 18, frequency: 3 } } });
  DTS.forEach(dt => { const w = run({ owner: mkO([id], { aim }), enemies: [], watch: true }, 0.9, dt);
    let bad = 0, peak = 0;
    for (const s of w.steps) { const i = s[0], off = 18 * Math.sin(TAU * 3 * i.age), along = i.x * Math.cos(aim) + i.y * Math.sin(aim), side = -i.x * Math.sin(aim) + i.y * Math.cos(aim);
      peak = Math.max(peak, Math.abs(side)); if (Math.abs(side - off) > 1e-9 || !near(along, 150 * i.age, 1e-9)) bad++; }
    ok(bad === 0 && peak <= 18 + 1e-9 && peak > 17, 'oscillate is an exact offset across the heading (aim ' + aim + ', dt ' + dt + ', bad ' + bad + ', peak ' + peak + ')'); }); }
{ const tr = 2, id = syn('syn-turn', { radRadius: 4 }, { targeting: 'nearest', motion: 'travels', moveSpeed: 100, turnRate: tr, endOn: [{ time: 4 }] });
  const ws = both('turnRate homing', () => ({ owner: mkO([id]), enemies: [mkE(1, 200, 0)], watch: true, onStep: (k, t, w) => { if (k === 2) { w.enemies[0].x = 0; w.enemies[0].y = 150; } } }), 4, [1]);
  ws.forEach((w, j) => { const dt = DTS[j]; let over = 0, full = 0;
    for (let k = 2; k < 12; k++) { const a = w.steps[k - 1][0], b = w.steps[k][0]; if (!a || !b) continue;
      const dh = Math.abs(Math.atan2(Math.sin(b.h - a.h), Math.cos(b.h - a.h))); if (dh > tr * dt + 1e-12) over++; if (near(dh, tr * dt, 1e-9)) full++; }
    ok(over === 0 && full >= 9, 'turnRate is a clamped turn of at most ' + tr + ' rad/s (over ' + over + ', full ' + full + ')'); }); }
{ const id = syn('syn-retarget', { radRadius: 4 }, { targeting: 'nearest', motion: 'travels', moveSpeed: 100, turnRate: 3, endOn: [{ time: 3 }] });
  const w = run({ owner: mkO([id]), enemies: [mkE(1, 250, 0), mkE(2, 0, 300), mkE(3, -300, -150)], watch: true,
    onStep: (k, t, w) => { if (k === 5) w.enemies[0].dead = true; if (k === 40) w.enemies[1].dead = true; } }, 1.5, 1 / 60);
  const h = k => w.steps[k][0].h;
  ok(h(38) > h(5) + 0.5, 'after the target dies the instance re-picks the nearest live enemy and turns to it');
  ok(near(h(41), h(70), 1e-12) && near(h(41), h(89), 1e-12), 'after the second death it flies straight even with another enemy in range (one re-pick only)'); }

// ---- 9. slice 3d: routing filter and props ----
{ const o = mkO(['tackle', 'ember']); o.slots.push([{ id: 'water-gun', t: 0.7 }]); o.slots[0][1].t = 0.3;
  const w = run({ owner: o, enemies: [mkE(1, 30, 0)], filter: id => id !== 'ember' && id !== 'water-gun' }, 1, 1 / 60);
  ok(o.slots[0][1].t === 0.3 && o.slots[1][0].t === 0.7, 'a slot the filter rejects is never touched (timers ' + o.slots[0][1].t + ', ' + o.slots[1][0].t + ')');
  ok(evs(w, 'move:cast').every(c => c.moveId === 'tackle') && evs(w, 'move:cast').length === 2, 'only routed moves cast');
  const d = run({ owner: mkO(['tackle', 'ember']), enemies: [mkE(1, 30, 0)] }, 0.1, 1 / 60);
  ok(evs(d, 'move:cast').length === 2, 'the default filter routes every move'); }
const mkP = (id, x, y, solid, o = {}) => Object.assign({ id, x, y, r: solid ? 12 : 14, solid, destructible: true, hp: 1e9, type: solid ? 'rock' : 'grass', log: [] }, o);
{ const w = run({ owner: mkO(['hydro-pump']), enemies: [mkE(1, 200, 0)], props: [mkP(1, 100, 0, true), mkP(2, 100, 60, true)] }, 0.6, 1 / 60), p = w.props[0];
  const m = { cat: G.MoveDefs['hydro-pump'].category, dmg: G.MoveDefs['hydro-pump'].basePower, type: 'water' };
  ok(p.log.length === 1 && near(p.log[0].a, G.Stats.applyDamageProp(w.owner.moveFactor(m))) && w.props[1].log.length === 0, 'a rock in the band takes the legacy prop damage once, one outside takes none');
  ok(evs(w, 'move:hit').length === 1 && evs(w, 'move:hit')[0].enemyId === 1, 'props emit no move:hit'); }
both('solid prop spends pierce (water gun: rock, enemy, then dies)', () => ({ owner: mkO(['water-gun']), enemies: [mkE(1, 120, 0), mkE(2, 180, 0)], props: [mkP(1, 60, 0, true)] }), 0.6, [1, 0])
  .forEach(w => ok(w.props[0].log.length === 1 && reasons(w)[0] === 'pierce', 'water gun spent its pierce on the rock'));
both('grass never spends pierce (ember through grass to the enemy)', () => ({ owner: mkO(['ember']), enemies: [mkE(1, 120, 0)], props: [mkP(1, 60, 0, false)] }), 0.6, [1])
  .forEach(w => ok(w.props[0].log.length === 1, 'ember cut the grass on the way'));
both('enemy behind a solid prop at pierce 0 is not hit', () => ({ owner: mkO(['ember']), enemies: [mkE(1, 120, 0)], props: [mkP(1, 60, 0, true)] }), 0.6, [0])
  .forEach(w => ok(w.props[0].log.length === 1 && reasons(w)[0] === 'pierce', 'ember ended on the rock'));
{ const w = run({ owner: mkO(['ember']), enemies: [mkE(1, 120, 0)], props: [mkP(1, 60, 0, true, { hp: 1 })] }, 0.6, 1 / 60);
  ok(w.props[0].hp <= 0 && w.enemies[0].log.length === 0, 'breaking a rock still spends the pierce'); }

// ---- 8. determinism: the same seed gives the same tape; another seed changes the crits ----
{ const f = s => run({ owner: mkO(['flamethrower'], { critChance: 0.5 }), enemies: [mkE(1, 100, 0), mkE(2, 120, 20), mkE(3, 150, -10)], seed: s }, 1.1, 1 / 60);
  const a = f(42), b = f(42), c = f(43), crits = w => evs(w, 'move:hit').map(h => h.crit);
  ok(JSON.stringify(a.tape) === JSON.stringify(b.tape), 'same seed, identical tape');
  ok(JSON.stringify(crits(a)) !== JSON.stringify(crits(c)), 'a different seed changes the crit pattern');
  ok(crits(a).length === 15 && crits(a).some(x => x) && crits(a).some(x => !x), 'crit rolls are mixed at 50%');
  const h = evs(a, 'move:hit')[0], c0 = evs(a, 'move:cast')[0];
  ok(h.moveId === 'flamethrower' && h.hop === 0 && near(h.typeMult, 1) && typeof h.dmg === 'number' && c0.ownerId === 'p1', 'event fields'); }

console.log(fail ? 'move-sim harness: ' + fail + ' FAILED of ' + n : 'move-sim harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
