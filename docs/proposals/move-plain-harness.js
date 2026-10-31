// Move schema slice 4r (the 20 plain moves), offline checks (Node only). Usage from the repo root:  node docs/proposals/move-plain-harness.js .
// Loads the REAL stats.js, enemies.js, status.js, stages.js and enemy.js plus the real move data chain, G.MoveGeom, G.MoveSim,
// G.MoveEffects and G.SimBus, with stubs for the enemy manager, world, weather and FX (pattern: move-riders-harness.js). No new
// runtime logic is under test, so there is no mutation runner. Damage is re-derived here from the D6 to D11 text (pattern:
// move-sim-harness.js property test), never read from the code under test. Expected hit lists are hand-derived from the move data
// (docs/MOVE-INTENT.md where there is an entry) and the geometry rules D17 to D21, with margins so no case sits on a float edge.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
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
  Weather: { mult: () => 1, speedFor: () => 1 }, Game: new Proxy({ everyone: () => [] }, { get: (t, k) => (k in t ? t[k] : noop) }),
  World: { collide: () => false, isLiquid: () => false, projectileBlock: () => null, propsInCircle: () => [] } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
for (const p of ['js/core/stats.js', 'js/data/enemies.js', 'js/data/types.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/core/simbus.js',
  'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js',
  'js/systems/move-sim.js', 'js/systems/move-effects.js']) { try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } }
G.EnemyMgr = { all: () => enemies, queryCircle(x, y, r) { const o = []; this.queryCircleEach(x, y, r, e => o.push(e)); return o; }, queryCircleEach(x, y, r, fn) { for (const e of enemies.slice()) if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= (r + e.r) ** 2) fn(e); } };
const St = G.Status, S = G.Stages, FX = G.MoveEffects, Enemy = G.Enemy, D = G.MoveDefs; Enemy.prototype.die = function () { this.dead = true; };
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 40) console.log('FAIL', m); } };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const within4sd = (k, N, p) => Math.abs(k - N * p) <= 4 * Math.sqrt(N * p * (1 - p));
const DTS = [1 / 60, 1 / 30];

const ARCS = ['vine-whip', 'karate-chop', 'lick', 'metal-claw', 'powder-snow', 'wing-attack', 'bug-bite'];
const NOVAS = ['dazzling-gleam', 'hyper-voice', 'dark-pulse', 'bug-buzz'];
const BEAMS = ['flash-cannon', 'psybeam'];
const SHOTS = ['poison-sting', 'rock-throw', 'shadow-ball', 'thunder-shock', 'sludge'];
const SELF = ['agility', 'harden'];
const ALL = [...ARCS, ...NOVAS, ...BEAMS, ...SHOTS, ...SELF];
ok(ALL.length === 20 && new Set(ALL).size === 20 && ALL.every(id => D[id]), 'the 20 moves of slice 4r all exist in the resolved data');

// ---- world builders ----
let eid = 0;
/** A real Enemy (fire typed: no type is immune to it, every ailment can land). */
const mk = (x, y, o = {}) => { const e = new Enemy({ dex: 1, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'chase' }, x, y, { t: 0, dmg: 1, hp: 1, spd: 1 }, false);
  e.maxHp = e.hp = 1e9; e.id = ++eid; e.r = 10; e.atkLvl = 0; e.types = ['fire']; return Object.assign(e, o); };
const sv = (b, L) => Math.floor(2 * b * L / 100) + 5, lad = s => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
/** The owner contract. The attacker half is written out in moveFactor from the D6 text, so it does not share arithmetic with G.Stats. */
const mkO = (ids = [], o = {}) => { const x = Object.assign({ id: 'p1', x: 0, y: 0, r: 12, aim: 0, level: 30, atk: 84, spa: 109, cdMul: 1, critChance: 0, dead: false, stgTeam: {}, moveRadiusMul: 1,
  hp: 500, maxHp: 1000, extraMul: 1.1, myTypes: [], slots: [ids.map(id => ({ id, t: 0 }))], activeGroup() { return this.slots[0]; },
  moveFactor(m) { const sp = m.cat === 'special'; return (2 * this.level / 5 + 2) * m.dmg * sv(sp ? this.spa : this.atk, this.level) / 50 * this.extraMul; },
  stabFor(m) { return this.myTypes.includes(m.type); }, onDealt() {}, heal() {} }, o); return x; };
const hitWith = (id, e, o = mkO(), rng = () => 0.99, hop = 0, at = { x: 0, y: 0 }) => FX.applyHit({ spec: typeof id === 'string' ? D[id] : id, cast: { owner: o }, x: at.x, y: at.y }, e, hop, rng);
/** Hand-derived D6 to D11 for a neutral-stat owner against a fire enemy (def 50, level fallback = owner level). */
function want(id, o, e, defStage = 0) {
  const def = D[id], sp = def.category === 'special', L = o.level, P = def.basePower;
  const A = (2 * L / 5 + 2) * P * sv(sp ? o.spa : o.atk, L) / 50 * o.extraMul;
  const dl = e.atkLvl > 0 ? e.atkLvl : L, dS = sv(50, dl) * lad(defStage);
  const Dm = (A / Math.max(1, dS) + 2) * (o.myTypes.includes(def.type) ? 1.5 : 1);
  return Math.max(1, Dm * G.Types.mult(def.type, e.types));
}
/** Runs `ids` for `secs` at dt. pin keeps every slot on cooldown after the first frame, so a world holds exactly one cast. */
function run(ids, es, secs, dt, { pin = true, seed = 3, owner = null, each = null } = {}) {
  enemies = es; G.MoveSim.clear(); G.MoveSim.setRng(seeded(seed)); G.MoveSim.setView(null);
  const o = owner || mkO(ids), tape = G.SimBus.record(), N = Math.round(secs / dt);
  for (let k = 1; k <= N; k++) {
    G.MoveSim.tick(dt, o, k * dt);
    for (const e of es) { St.tick(e, dt); S.tick(e, dt); }
    S.tick(o, dt); S.teamTick(o.stgTeam, dt);
    if (pin) o.slots[0].forEach(sl => { sl.t = Math.max(sl.t, 99); });
    if (each) each(k, k * dt, o);
  }
  G.SimBus.stopRecording();
  return { tape, o, es, hits: id => es.map(e => tape.filter(t => t.type === 'move:hit' && t.moveId === id && t.enemyId === e.id).length) };
}
const evs = (w, t) => w.tape.filter(e => e.type === t);

// ---- 1. every move casts headlessly without throwing, against a standard layout and against nothing ----
{ const layout = () => [0, 1, 2, 3, 4, 5].flatMap(i => [40, 100, 200].map((d, j) => mk(d * Math.cos(i * Math.PI / 3 + j * 0.2), d * Math.sin(i * Math.PI / 3 + j * 0.2))));
  for (const id of ALL) for (const dt of DTS) {
    let threw = null, w = null; try { w = run([id], layout(), 3, dt, { pin: false }); w = run([id], [], 1, dt, { pin: false }); } catch (x) { threw = x; }
    ok(!threw, id + ' casts at dt ' + dt.toFixed(3) + ' without throwing' + (threw ? ': ' + threw.message : ''));
    const needsNone = ['none', 'self'].includes(D[id].delivery.targeting);     // a nearest or direction move waits for an enemy in range (gate S1)
    ok(w && (evs(w, 'move:cast').length >= 1) === needsNone, id + ' with no enemy: casts only when it needs no target (' + (w && evs(w, 'move:cast').length) + ' casts)');
  } }

// ---- 2. geometry: each move hits what its shape contains, once, and nothing else ----
/** Expected hit lists: layout is [[x, y, expected hits]]; the first enemy is the nearest, so it sets the aim of a nearest-targeted move. */
function geo(id, layout, secs = 0.6, endReason = null) {
  const ws = DTS.map(dt => run([id], layout.map(([x, y]) => mk(x, y)), secs, dt));
  ws.forEach((w, i) => {
    const got = w.hits(id), exp = layout.map(l => l[2]);
    ok(JSON.stringify(got) === JSON.stringify(exp), id + ' hits at dt ' + ['1/60', '1/30'][i] + ': ' + got + ', want ' + exp);
    const casts = evs(w, 'move:cast').length, ends = evs(w, 'move:end');
    ok(casts === 1 && new Set(ends.map(e => e.instId)).size === ends.length, id + ': one cast, no instance ended twice');
    if (endReason) ok(ends.length === 1 && ends[0].reason === endReason, id + ' ends on ' + endReason + ', got ' + ends.map(e => e.reason));
  });
}
// Arcs (aim at the nearest enemy, 25 px out, heading 0). Rule D18: distance <= radius + 10, angle <= arc/2 + asin(10 / d).
const ARC = { 'vine-whip': [1.3, 68], 'karate-chop': [1.2, 50], 'lick': [0.8, 64], 'metal-claw': [1.6, 50], 'powder-snow': [1.7, 48], 'wing-attack': [1.9, 58], 'bug-bite': [1.6, 44] };
for (const id of ARCS) {
  const [arc, r] = ARC[id], h = arc / 2, pol = (d, a) => [d * Math.cos(a), d * Math.sin(a)];
  geo(id, [[25, 0, 1],                                 // nearest, dead ahead
    [...pol(r - 5, h - 0.25), 1], [...pol(r - 5, -(h - 0.25)), 1],     // inside the arc, either flank
    [...pol(r + 8, 0), 1],                             // edge of reach (radius + 10, 2 px to spare)
    [...pol(r + 14, 0), 0],                            // just past reach
    [...pol(r - 5, h + 0.45), 0], [...pol(r - 5, -(h + 0.45)), 0],     // just outside the angle (beyond the enemy-size tolerance)
    [...pol(40, Math.PI), 0]]);                        // behind the caster
}
// Novas, rings (no targeting, grow from 1 px): everything inside the final reach once, nothing beyond it. Reach = max + 10.
geo('hyper-voice', [[20, 0, 1], [100, 0, 1], [0, -200, 1], [-300, 0, 1], [0, 385, 1], [0, -395, 0], [-391, 0, 0]], 0.7);       // max 380 at 760 px/s over 0.5 s
geo('dark-pulse', [[20, 0, 1], [0, 120, 1], [-205, 0, 1], [0, 215, 0], [300, 0, 0]], 0.6);                                       // max 200 at 500 px/s over 0.4 s
// Dazzling Gleam: a growing half circle aimed at the nearest enemy (the first growing partial arc). max 130, reach 140, 650 px/s over 0.2 s.
geo('dazzling-gleam', [[30, 0, 1], [100, 60, 1], [100, -60, 1], [135, 0, 1], [141, 0, 0], [-40, 100, 0], [-30, -20, 0], [-100, 0, 0]], 0.5);
// Bug Buzz: a persistent static circle, radius 120 (reach 130), hits on the first step; the rehit schedule is checked in section 5.
geo('bug-buzz', [[10, 0, 1], [0, 100, 1], [-125, 0, 1], [135, 0, 0], [0, -200, 0]], 0.3);
// Beams (linear, aim at the nearest, 50 px out): along in [-10, len + 10], side <= 25 (D20).
geo('flash-cannon', [[50, 0, 1], [200, 20, 1], [229, 0, 1], [150, 30, 0], [235, 0, 0], [-60, 0, 0], [100, -26, 0]], 0.7);       // length 220
geo('psybeam', [[50, 0, 1], [195, 24, 1], [224, 0, 1], [150, 26, 0], [226, 0, 0], [-60, 0, 0], [100, -26, 0]], 0.7);           // length 215
// Travelling points fly along the aim (0) with no scatter at count 1; pierce 0 ends on the first enemy, Shadow Ball (pierce 1) on the second.
geo('poison-sting', [[100, 0, 1], [200, 0, 0], [100, 30, 0], [100, -30, 0]], 1.1, 'pierce');
geo('rock-throw', [[100, 0, 1], [200, 0, 0], [100, 40, 0]], 1.5, 'pierce');
geo('sludge', [[100, 0, 1], [200, 0, 0], [100, 40, 0]], 1.7, 'pierce');
geo('shadow-ball', [[100, 0, 1], [200, 0, 1], [300, 0, 0], [100, 40, 0]], 1.3, 'pierce');
// no scatter: the first enemy sits dead ahead and a thin sliver off the aim would miss it (Poison Sting r 4 + enemy 10)
geo('poison-sting', [[300, 14.5, 0], [300, 0, 1]], 1.1);
// a shot that meets nothing ends on time or the wall, never on pierce
{ const w = run(['poison-sting'], [mk(0, 400)], 1.2, 1 / 60); ok(evs(w, 'move:end').every(e => e.reason !== 'pierce') && w.hits('poison-sting')[0] === 0, 'a shot that hits nothing ends without pierce'); }

// ---- 3. Thunder Shock: the first chain on a travelling point. One hop (hopRange 60), full power, nothing past it ----
for (const dt of DTS) {
  const A = mk(100, 0), B = mk(140, 0), C = mk(190, 0), E = mk(100, 90), F = mk(100, -300);
  const w = run(['thunder-shock'], [A, B, C, E, F], 1, dt), h = evs(w, 'move:hit');
  ok(JSON.stringify(w.hits('thunder-shock')) === '[1,1,0,0,0]', 'thunder-shock: the shot hits A, one hop reaches B, C (second hop) and the far ones are spared: ' + w.hits('thunder-shock'));
  const a = h.find(x => x.enemyId === A.id), b = h.find(x => x.enemyId === B.id);
  ok(a.hop === 0 && b.hop === 1 && near(b.dmg, a.dmg), 'the hop is at full damage (no chainDamageFalloff entry): ' + a.dmg + ' then ' + b.dmg);
  ok(near(a.dmg, want('thunder-shock', w.o, A)), 'thunder-shock first hit matches the hand computation');
  // the hop reach is exactly 60 px, centre to centre
  const A2 = mk(100, 0), in60 = mk(100, 59.5), out = mk(100, -61);
  const w2 = run(['thunder-shock'], [A2, in60, out], 1, dt);
  ok(JSON.stringify(w2.hits('thunder-shock')) === '[1,1,0]', 'hop reach: 59.5 px is chained, 61 px is not: ' + w2.hits('thunder-shock'));
}

// ---- 4. damage against an independent D6 to D11 computation (every damaging move, standard owner, STAB on some) ----
{ const o = () => mkO([], { myTypes: ['fire', 'psychic', 'bug', 'steel'] });
  for (const id of ALL.filter(i => D[i].category !== 'status')) {
    const e = mk(30, 0), ow = o(), r = hitWith(id, e, ow, () => 0.99, 0, { x: 0, y: 0 });
    ok(near(r.dmg, want(id, ow, e)), id + ' damage ' + r.dmg + ' vs hand ' + want(id, ow, e));
  }
  // property test: random level, stats, stages, STAB, enemy level, against applyHit
  const rr = seeded(77), ri = (a, b) => a + Math.floor(rr() * (b - a + 1)), dmgIds = ALL.filter(i => D[i].category !== 'status');
  for (let i = 0; i < 1000; i++) {
    const id = dmgIds[ri(0, dmgIds.length - 1)], ow = mkO([], { level: ri(1, 100), atk: ri(5, 200), spa: ri(5, 200), extraMul: 0.5 + rr() * 2.5, myTypes: rr() < 0.5 ? [D[id].type] : [] });
    const e = mk(30, 0, { atkLvl: rr() < 0.3 ? 0 : ri(1, 100) }); const ds = ri(-6, 6); e.stg = { def: [{ n: ds }], spd: [{ n: ds }] };
    const r = hitWith(id, e, ow, () => 0.99);
    ok(near(r.dmg, want(id, ow, e, ds)), 'property case ' + i + ' ' + id + ': ' + r.dmg + ' vs ' + want(id, ow, e, ds));
  } }

// ---- 5. riders: chance, once per eligible hit, within 4 sd over many seeded rolls ----
{ const N = 10000;
  const procs = (id, probe, mkOwner = () => mkO()) => { const r = seeded(id.length * 131 + 17); let k = 0;
    for (let i = 0; i < N; i++) { const e = mk(30, 0), o = mkOwner(); hitWith(id, e, o, r); if (probe(e, o)) k++; } return k; };
  const T = [['lick', 0.30, e => e.stMajor && e.stMajor.k === 'paralysis'], ['powder-snow', 0.10, e => e.stMajor && e.stMajor.k === 'freeze'],
    ['psybeam', 0.10, e => !!e.stCnf], ['thunder-shock', 0.10, e => e.stMajor && e.stMajor.k === 'paralysis'],
    ['poison-sting', 0.30, e => e.poison], ['sludge', 0.30, e => e.poison], ['dark-pulse', 0.20, e => e.stFl || e.stFlinch || e.fsp > 0],
    ['flash-cannon', 0.10, e => S.stage(e, 'spd') === -1], ['shadow-ball', 0.20, e => S.stage(e, 'spd') === -1]];
  for (const [id, p, probe] of T) { const k = procs(id, e => probe(e)); ok(within4sd(k, N, p), id + ' rider ' + p * 100 + '%: ' + k + ' of ' + N); }
  const kc = procs('metal-claw', (e, o) => S.teamSum(o.stgTeam, 'atk') === 1); ok(within4sd(kc, N, 0.10), 'metal-claw Attack +1 at 10%: ' + kc + ' of ' + N);
  // guaranteed riders: no chance means every hit
  for (const id of ['bug-buzz']) { const k = procs(id, e => S.stage(e, 'spd') === -1); ok(k === N, id + ' Sp. Def -1 on every hit: ' + k); }
  // knockback: the impulse is the data distance, away from the instance centre
  for (const [id, d] of [['vine-whip', 60], ['karate-chop', 110], ['metal-claw', 60], ['wing-attack', 70], ['bug-bite', 40], ['rock-throw', 90]]) {
    const e = mk(30, 0); hitWith(id, e); ok(near(e.kx, d) && Math.abs(e.ky) < 1e-9, id + ' knocks ' + d + ' px (' + e.kx + ')');
  }
  // the other moves do not knock
  for (const id of ['lick', 'powder-snow', 'psybeam', 'flash-cannon', 'poison-sting', 'shadow-ball', 'thunder-shock', 'sludge', 'hyper-voice', 'dark-pulse', 'dazzling-gleam']) {
    const e = mk(30, 0); hitWith(id, e, mkO(), () => 0.99); ok(!e.kx && !e.ky, id + ' has no knockback'); } }

// ---- 6. special checks ----
// Bug Bite: the berrySteal handler is a stub. A hit does not throw and adds nothing (no x2, no stage, no status, no heal).
{ const e = mk(30, 0), ow = mkO([], { myTypes: ['bug'] }); let r = null, threw = null; const before = JSON.stringify([e.stg, e.trk, e.stMajor, e.stCnf, e.burn, e.poison]);
  try { r = hitWith('bug-bite', e, ow); } catch (x) { threw = x; }
  ok(!threw && near(r.dmg, want('bug-bite', ow, e)), 'bug-bite: a hit with a berry-less target does not throw and deals plain damage (no x2): ' + (threw ? threw.message : r.dmg));
  ok(JSON.stringify([e.stg, e.trk, e.stMajor, e.stCnf, e.burn, e.poison]) === before, 'bug-bite: the berrySteal stub changes nothing on the target');
  const e2 = mk(30, 0, { berry: 'oran', hasBerry: true, holdItem: 'oran' }); let t2 = null; try { hitWith('bug-bite', e2); } catch (x) { t2 = x; }
  ok(!t2 && e2.berry === 'oran' && e2.holdItem === 'oran', 'bug-bite: even a berry-holding target is untouched while the handler is a stub'); }
// Bug Buzz (MOVE-INTENT): re-hits every 0.5 s at full power; Sp. Def -1 on the first hit, refreshed (not climbed) inside its first 6 s Gate (slice 5a).
for (const dt of DTS) {
  const e = mk(10, 0), w = run(['bug-buzz'], [e], 2.1, dt, { pin: false }), h = evs(w, 'move:hit');
  ok(h.length === 5, 'bug-buzz re-hits at 0.5 s: 5 hits in 2.1 s at dt ' + dt.toFixed(3) + ', got ' + h.length);
  const o = mkO(), first = want('bug-buzz', o, e, 0), later = want('bug-buzz', o, e, -1);
  ok(near(h[0].dmg, first), 'bug-buzz first hit is full power with Sp. Def 0: ' + h[0].dmg + ' vs ' + first);
  ok(h.slice(1).every(x => near(x.dmg, later)), 'bug-buzz later hits are full power against Sp. Def -1 (inside the Gate, not -2): ' + h.slice(1).map(x => x.dmg.toFixed(2)));
  ok(S.stage(e, 'spd') === -1 && Object.keys(e.trk.spd).length === 1, 'bug-buzz holds Sp. Def at -1 after five hits, one tracker (' + S.stage(e, 'spd') + ')');
  ok(evs(w, 'move:cast').length === 1, 'bug-buzz is one persistent instance, not a recast'); }
// Agility and Harden: team self-buffs on trackers (slice 5a, COMBAT-RULES "Stat stages" SS8): a cast each time the Gate opens, +2 / +1 per climb, clamp +6.
for (const [id, stat, top] of [['agility', 'spe', 6], ['harden', 'def', 5]]) for (const dt of DTS) {
  const es = [mk(60, 0), mk(0, 90)], hp0 = es.map(e => e.hp); let worst = 0, other = 0;
  const w = run([id], es, 25, dt, { pin: false, each: (k, t, o) => { worst = Math.max(worst, S.stage(o, stat)); for (const s of ['atk', 'def', 'spa', 'spd', 'spe']) if (s !== stat) other = Math.max(other, Math.abs(S.stage(o, s))); } });
  ok(worst === top, id + ' climbs to ' + stat + ' +' + top + ' in 25 s (worst ' + worst + ')');
  ok(other === 0, id + ' raises no other stat');
  ok(evs(w, 'move:cast').length === 5, id + ' casts each time its Gate opens: 5 casts in 25 s (' + evs(w, 'move:cast').length + ')');
  ok(es.every((e, i) => e.hp === hp0[i]) && evs(w, 'move:hit').length === 0, id + ' touches no enemy'); }
{ const w = run(['agility'], [mk(60, 0)], 1, 1 / 60); ok(S.stage(w.o, 'spe') === 2 && S.stage(w.o, 'spd') === 0, 'agility +2 lands on Speed through D31, not Sp. Def'); }

// ---- 7. determinism ----
{ const f = s => { const es = [mk(30, 0), mk(60, 5), mk(90, -5)]; const w = run(['lick', 'psybeam', 'shadow-ball'], es, 2, 1 / 60, { seed: s }); return JSON.stringify(w.tape.filter(t => t.type === 'move:hit').map(t => [t.moveId, t.crit, +t.dmg.toFixed(6)])); };
  ok(f(9) === f(9), 'same seed, identical hits'); }

console.log(fail ? '\nmove-plain harness: ' + fail + ' FAILED of ' + n : '\nmove-plain harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
