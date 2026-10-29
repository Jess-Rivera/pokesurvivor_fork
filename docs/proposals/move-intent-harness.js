// Stage 0 intent scenarios (docs/current feature planning/move-schema-post-auth/stage-0.md), offline checks (Node only).
// Usage from the repo root:  node docs/proposals/move-intent-harness.js .
// Runs every scenario in docs/move_rework_holding/move-intent-scenarios.json whose move is routed (G.MoveRoute ROUTED, read from
// js/systems/move-route.js as text) against the REAL sim, effects, stages, status, enemy and player code, at dt 1/60 and 1/30; the
// hit counts must agree between the two. Scenarios for unrouted moves, with `waitsFor` (a later slice) or with `blockedBy` (an open
// owner decision) are listed and not run. Engine setup copied from docs/proposals/move-selfcast-harness.js (stubs for the enemy
// manager, world, weather, audio, camera and FX). Expected outcomes are hand-written in the JSON, never derived here.
// It also checks that every `source: MOVE-INTENT:<id>` names a real docs/MOVE-INTENT.md entry.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SCEN = process.env.MOVE_INTENT_SCENARIOS || R + '/docs/move_rework_holding/move-intent-scenarios.json';
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
  Weather: { mult: () => 1, speedFor: () => 1, force() {} }, Game: new Proxy({ everyone: () => [] }, { get: (t, k) => (k in t ? t[k] : noop) }),
  Audio: { sfx() {} }, Camera: { kick() {} }, Log: { on: false },
  World: { collide: () => false, isLiquid: () => false, isFree: () => true, projectileBlock: () => null, propsInCircle: () => [] } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
// @@LOAD-BEGIN (the module list; tools that bundle this file replace this block)
for (const p of ['js/core/stats.js', 'js/data/enemies.js', 'js/data/types.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/player.js',
  'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js',
  'js/data/move-resolver.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js']) { try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } }
const SCENARIOS = JSON.parse(fs.readFileSync(SCEN, 'utf8'));
const ROUTE_SRC = fs.readFileSync(R + '/js/systems/move-route.js', 'utf8'), INTENT_SRC = fs.readFileSync(R + '/docs/MOVE-INTENT.md', 'utf8');
// @@LOAD-END
G.EnemyMgr = { all: () => enemies, queryCircle(x, y, r) { const o = []; this.queryCircleEach(x, y, r, e => o.push(e)); return o; },
  queryCircleEach(x, y, r, fn) { for (const e of enemies.slice()) if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= (r + e.r) ** 2) fn(e); } };
const St = G.Status, S = G.Stages, Sim = G.MoveSim, Enemy = G.Enemy, D = G.MoveDefs; Enemy.prototype.die = function () { this.dead = true; };
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 60) console.log('FAIL', m); } };
const near = (a, b, e = 1e-3) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));

// ---- routed list and MOVE-INTENT headings, read as text (move-route.js needs a browser location; MOVE-INTENT is Markdown) ----
const routedBlock = (ROUTE_SRC.match(/ROUTED\s*=\s*new Set\(\[([\s\S]*?)\]\)/) || [])[1] || '';
const ROUTED = new Set((routedBlock.match(/'([a-z0-9-]+)'/g) || []).map(s => s.slice(1, -1)));
const INTENT = new Set((INTENT_SRC.match(/^### ([a-z0-9-]+)/gm) || []).map(s => s.slice(4)));
ok(ROUTED.size > 0, 'read the ROUTED list from move-route.js');

// ---- world builders (owner: a REAL Player prototype on a hand-built body, as in move-selfcast-harness.js) ----
let eid = 0;
const mkE = (x, y, o = {}) => { const e = new Enemy({ dex: 1, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'chase' }, x, y, { t: 0, dmg: 1, hp: 1, spd: 1 }, false);
  e.maxHp = e.hp = 1e9; e.id = ++eid; if (!(e.r > 0)) e.r = 10; return Object.assign(e, o); };
const mkP = (ids, o = {}) => Object.assign(Object.create(G.Player.prototype), { id: 'p1', x: 0, y: 0, r: 12, bodyH: 20, aim: 0, level: 30, cdMul: 100,
  critChance: 0, dead: false, benched: false, stgTeam: {}, stg: null, moveRadiusMul: 1, hp: 500, maxHp: 1000, invuln: 0, flash: 0, dmgReduce: 0, shield: null, mvRoot: false,
  mon: { types: ['normal'] }, inc: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, badge: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, baseSpd: 100, spdMul: 1,
  inLiquid: false, runItems: [], item: null, sashT: -1e9, anim: { play() {} }, slots: [ids.map(id => ({ id, t: 0 }))], activeGroup() { return this.slots[0]; },
  moveFactor(m) { return G.Stats.attackFactor(84, 109, this.level, m, 1.1); }, stabFor() { return false; }, onDealt() {} }, o);
const rngOf = r => r === 'always' ? () => 0 : typeof r === 'number' ? seeded(r) : () => 0.99;

/** One scenario at one dt: returns the tape (each event stamped with its time), the enemies, the owner and timed snapshots. */
function runOne(sc, dt) {
  eid = 0; enemies = (sc.enemies || []).map(([x, y, o]) => mkE(x, y, o || {}));
  const owner = mkP([sc.move], sc.owner || {}), at = (sc.expect.at || []).slice().sort((a, b) => a.t - b.t), snaps = [];
  Sim.clear(); Sim.setRng(rngOf(sc.rng)); Sim.setView(null); Sim.setFilter(() => true);
  const tape = G.SimBus.record(), N = Math.round(sc.secs / dt); let seen = 0, ai = 0;
  for (let k = 1; k <= N; k++) {
    const t = k * dt;
    Sim.tick(dt, owner, t); if (owner.tickShield) owner.tickShield(dt); S.tick(owner, dt); S.teamTick(owner.stgTeam, dt);
    for (const e of enemies) if (!e.dead) { S.tick(e, dt); }
    for (; seen < tape.length; seen++) tape[seen].t = t;
    while (ai < at.length && t + 1e-9 >= at[ai].t) { snaps.push({ want: at[ai], stages: stagesOf(owner, at[ai].ownerStage) }); ai++; }
  }
  G.SimBus.stopRecording();
  return { tape, enemies, owner, snaps };
}
const stagesOf = (h, want) => { const o = {}; for (const k of Object.keys(want || {})) o[k] = S.stage(h, k); return o; };
const hitsOn = (w, i) => w.tape.filter(e => e.type === 'move:hit' && e.enemyId === w.enemies[i].id);

/** Every check in `expect`, against one run. Each message names the scenario, the dt and the check. */
function check(sc, w, tag) {
  const x = sc.expect, L = sc.id + ' ' + tag + ': ';
  const counts = w.enemies.map((e, i) => hitsOn(w, i).length);
  if (x.hits) ok(JSON.stringify(counts) === JSON.stringify(x.hits), L + 'hits ' + counts + ', want ' + x.hits);
  if (x.hitsMin) ok(x.hitsMin.every((m, i) => counts[i] >= m), L + 'hits ' + counts + ', want at least ' + x.hitsMin);
  if (x.casts != null) { const c = w.tape.filter(e => e.type === 'move:cast').length; ok(c === x.casts, L + 'casts ' + c + ', want ' + x.casts); }
  if (x.ends) for (const [why, k] of Object.entries(x.ends)) { const c = w.tape.filter(e => e.type === 'move:end' && e.reason === why).length; ok(c === k, L + 'ends by ' + why + ': ' + c + ', want ' + k); }
  if (x.firstHit) for (const [i, [a, b]] of Object.entries(x.firstHit)) { const h = hitsOn(w, +i)[0]; ok(h && h.t >= a - 1e-9 && h.t <= b + 1e-9, L + 'first hit on ' + i + ' at ' + (h && h.t.toFixed(3)) + ', want ' + a + ' to ' + b); }
  if (x.ratios) { const d0 = (hitsOn(w, 0)[0] || {}).dmg;
    for (const [i, r] of Object.entries(x.ratios)) { const d = (hitsOn(w, +i)[0] || {}).dmg; ok(d0 > 0 && near(d / d0, r), L + 'damage ratio on ' + i + ' ' + (d / d0) + ', want ' + r); } }
  if (x.dmg != null) { const hs = w.tape.filter(e => e.type === 'move:hit'); ok(hs.length > 0 && hs.every(h => near(h.dmg, x.dmg, 1e-9)), L + 'every hit deals ' + x.dmg + ' (' + hs.map(h => h.dmg) + ')'); }
  if (x.crit != null) { const h = w.tape.find(e => e.type === 'move:hit'); ok(h && h.crit === x.crit, L + 'first hit crit ' + (h && h.crit) + ', want ' + x.crit); }
  if (x.enemyStage) for (const [i, want] of Object.entries(x.enemyStage)) { const got = stagesOf(w.enemies[+i], want); ok(JSON.stringify(got) === JSON.stringify(want), L + 'enemy ' + i + ' stages ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); }
  if (x.rooted) for (const i of x.rooted) ok(St.rooted(w.enemies[i]), L + 'enemy ' + i + ' rooted (trap)');
  if (x.status) for (const [i, k] of Object.entries(x.status)) ok(St.list(w.enemies[+i]).some(s => s.k === k), L + 'enemy ' + i + ' has ' + k + ' (' + St.list(w.enemies[+i]).map(s => s.k) + ')');
  if (x.ownerStage) { const got = stagesOf(w.owner, x.ownerStage); ok(JSON.stringify(got) === JSON.stringify(x.ownerStage), L + 'owner stages ' + JSON.stringify(got) + ', want ' + JSON.stringify(x.ownerStage)); }
  if (x.at) { ok(w.snaps.length === x.at.length, L + 'timed checks taken ' + w.snaps.length + ' of ' + x.at.length);
    for (const s of w.snaps) ok(JSON.stringify(s.stages) === JSON.stringify(s.want.ownerStage), L + 'at ' + s.want.t + ' s owner stages ' + JSON.stringify(s.stages) + ', want ' + JSON.stringify(s.want.ownerStage)); }
  if (x.ownerHp != null) ok(near(w.owner.hp, x.ownerHp, 1e-9), L + 'owner hp ' + w.owner.hp + ', want ' + x.ownerHp);
  if (x.shield != null) ok(w.owner.shield && near(w.owner.shield.v, x.shield, 1e-9), L + 'shield ' + (w.owner.shield && w.owner.shield.v) + ', want ' + x.shield);
  if (x.healFraction != null) { const dealt = w.tape.filter(e => e.type === 'move:hit').reduce((a, h) => a + h.dmg, 0), hp0 = (sc.owner && sc.owner.hp) || 500;
    ok(dealt > 0 && near(w.owner.hp - hp0, dealt * x.healFraction), L + 'healed ' + (w.owner.hp - hp0) + ' of ' + dealt + ' dealt, want x' + x.healFraction); }
  if (x.casterEnd) { const [cx, cy, tol] = x.casterEnd; ok(Math.hypot(w.owner.x - cx, w.owner.y - cy) <= tol, L + 'caster ends at ' + w.owner.x.toFixed(1) + ', ' + w.owner.y.toFixed(1) + ', want within ' + tol + ' of ' + cx + ', ' + cy); }
  return counts;
}

// ---- run ----
const pending = [], blocked = [], ran = [];
const KNOWN = new Set(['hits', 'hitsMin', 'casts', 'ends', 'firstHit', 'ratios', 'dmg', 'crit', 'enemyStage', 'rooted', 'status', 'ownerStage', 'at', 'ownerHp', 'shield', 'healFraction', 'casterEnd']);
for (const sc of SCENARIOS.scenarios) {
  ok(D[sc.move], sc.id + ': unknown move ' + sc.move);
  ok(sc.source === 'data' || (/^MOVE-INTENT:/.test(sc.source) && INTENT.has(sc.source.slice(12))), sc.id + ': source ' + sc.source + ' is "data" or a real MOVE-INTENT entry');
  for (const k of Object.keys(sc.expect || {})) ok(KNOWN.has(k), sc.id + ': unknown expect key ' + k);
  if (!D[sc.move]) continue;
  if (sc.blockedBy) { blocked.push(sc.id + ' (' + sc.blockedBy + ')'); continue; }
  if (!ROUTED.has(sc.move) || sc.waitsFor) { pending.push(sc.id + ' (' + (sc.waitsFor || 'not routed') + ')'); continue; }
  const [a, b] = [1 / 60, 1 / 30].map(dt => runOne(sc, dt));
  const ca = check(sc, a, 'dt 1/60'), cb = check(sc, b, 'dt 1/30');
  ok(JSON.stringify(ca) === JSON.stringify(cb), sc.id + ': 1/60 and 1/30 disagree, ' + ca + ' vs ' + cb);
  ran.push(sc.id);
}
const movesWith = new Set(SCENARIOS.scenarios.map(s => s.move));
const routedNoScenario = [...ROUTED].filter(id => !movesWith.has(id));
ok(routedNoScenario.length === 0, 'every routed move has a scenario (missing: ' + routedNoScenario.join(', ') + ')');
console.log('move-intent: ran ' + ran.length + ' scenarios on routed moves; pending ' + pending.length + ' (' + pending.join(', ') + '); blocked ' + blocked.length + ' (' + blocked.join(', ') + ')');
console.log(fail ? 'move-intent harness: ' + fail + ' FAILED of ' + n : 'move-intent harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
