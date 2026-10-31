// Move schema slice 5a (stat stage trackers), offline checks (Node only). Usage from the repo root:
//   node docs/proposals/stat-stage-harness.js .
// Rules under test: docs/COMBAT-RULES.md "Stat stages" SS1 to SS13 and combat-architecture:H26. Loads the REAL stats.js, enemies.js, types.js,
// status.js, stages.js, enemy.js and player.js plus the move data chain, G.MoveGeom, G.MoveSim, G.MoveEffects and G.SimBus, with stubs for the
// enemy manager, world, weather, audio, camera and FX (pattern: move-intent-harness.js). Expected numbers are hand-derived from the rules
// (Gate 6.0 s, Duration 6.1 s, Self-drop Gate 12 s), never read from the code under test. The mutation runner (stat-stage-mutate.js)
// points STAGE_STAGES, STAGE_FX and STAGE_SIM at altered copies; every mutation must make this harness fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/stages.js': 'STAGE_STAGES', 'js/systems/move-effects.js': 'STAGE_FX', 'js/systems/move-sim.js': 'STAGE_SIM' };
const load = p => { const f = process.env[SRC[p]] || R + '/' + p; vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: p }); };
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
const DEX_BY = { 1: { name: 'Normie', types: ['normal'], stats: [50, 50, 50, 50, 50, 65] } };
global.window = global; global.location = { search: '?dev' };
let seed = 4242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; Math.random = rnd;
const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const texts = [];
let enemies = [];
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => a + (b - a) * rnd(), randInt: (a, b) => a + Math.floor((b - a + 1) * rnd()),
    pickN: a => a, damp: (a, b) => b, norm: (x, y) => { const n = Math.hypot(x, y) || 1; return [x / n, y / n]; }, dist: (a, b, c, d) => Math.hypot(a - c, b - d),
    dist2: (a, b, c, d) => (a - c) * (a - c) + (b - d) * (b - d), hash: () => 0.5, pick: a => a[0] },
  DEX_BY, DEX: [], FX: { dmgText: (x, y, m) => texts.push(m), spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {} },
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
G.MoveDefs = Object.assign({}, G.MoveDefs);     // the live defs are deep-frozen (I2); synthetic moves go in a copy of the container
const St = G.Status, S = G.Stages, FX = G.MoveEffects, Sim = G.MoveSim, Enemy = G.Enemy, D = G.MoveDefs; Enemy.prototype.die = function () { this.dead = true; };
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 60) console.log('FAIL', m); } };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const within4sd = (k, N, p) => Math.abs(k - N * p) <= 4 * Math.sqrt(N * p * (1 - p));
const DTS = [1 / 60, 1 / 30];

// ---- builders (owner: a REAL Player prototype on a hand-built body; `act` picks the active group) ----
let eid = 0;
const mkE = (x, y, o = {}) => { const e = new Enemy({ dex: 1, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'chase' }, x, y, { t: 0, dmg: 1, hp: 1, spd: 1 }, false);
  e.maxHp = e.hp = 1e9; e.id = ++eid; if (!(e.r > 0)) e.r = 10; return Object.assign(e, o); };
const mkP = (groups = [[]], o = {}) => Object.assign(Object.create(G.Player.prototype), { id: 'p1', x: 0, y: 0, r: 12, bodyH: 20, aim: 0, level: 30, cdMul: 1,
  critChance: 0, dead: false, benched: false, stgTeam: {}, stg: null, moveRadiusMul: 1, hp: 500, maxHp: 1000, invuln: 0, flash: 0, dmgReduce: 0, shield: null, mvRoot: false,
  mon: { types: ['normal'] }, inc: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, badge: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, baseSpd: 100, spdMul: 1,
  inLiquid: false, runItems: [], item: null, sashT: -1e9, anim: { play() {} }, slots: groups.map(g => g.map(id => ({ id, t: 0 }))), act: 0,
  activeGroup() { return this.slots[this.act] || []; }, moveFactor(m) { return G.Stats.attackFactor(84, 109, this.level, m, 1.1); }, stabFor() { return false; }, onDealt() {} }, o);
const syn = (id, def) => { D[id] = Object.assign({ id, name: id, type: 'normal', category: 'physical', power: 40, basePower: 40, hitPolicy: 'oncePerInstance' }, def); return id; };
const hit = (spec, e, o, rng = () => 0.99, cast = { owner: o }) => FX.applyHit({ spec: typeof spec === 'string' ? D[spec] : spec, cast, x: 0, y: 0 }, e, 0, rng);
/** Ticks the owner and the enemies for `secs` in the game's per-frame order for these systems. */
function run(o, es, secs, { dt = 1 / 60, rng = () => 0.99, each = null, reset = true } = {}) {
  if (es) enemies = es;
  if (reset) Sim.clear();
  Sim.setRng(rng); Sim.setView(null); Sim.setFilter(() => true);
  const tape = G.SimBus.record(), N = Math.round(secs / dt);
  for (let k = 1; k <= N; k++) {
    const t = (o.clock = (o.clock || 0) + dt);
    Sim.tick(dt, o, t); S.tick(o, dt); S.teamTick(o.stgTeam, dt);
    for (const e of enemies) if (!e.dead) S.tick(e, dt);
    if (each) each(k, t);
  }
  G.SimBus.stopRecording();
  return tape;
}
const casts = (tape, id) => tape.filter(t => t.type === 'move:cast' && (!id || t.moveId === id));
const hitsOf = (tape, id) => tape.filter(t => t.type === 'move:hit' && (!id || t.moveId === id));
/** The stage of `stats` on a host the first time t reaches each sample, over one run. */
function timeline(o, es, secs, samples, stats, host, dt) {
  const out = [], want = samples.slice(); let i = 0;
  run(o, es, secs, { dt, each: (k, t) => { while (i < want.length && t + 1e-9 >= want[i]) { out.push(stats.map(s => S.stage(host || o, s)).join('/')); i++; } } });
  return out.join(' ');
}

// 1. timelines at base timers (SS7, SS8, SS12), the same at dt 1/60 and 1/30
for (const dt of DTS) {
  const tag = ' at dt ' + (dt === 1 / 60 ? '1/60' : '1/30');
  const sd = timeline(mkP([['swords-dance']]), [], 18, [1, 5.9, 6.2, 11.9, 12.2, 17.9], ['atk'], null, dt);
  ok(sd === '2 2 4 4 6 6', 'Swords Dance +2 / +4 / +6 at 0 / 6 / 12 s, then holds (' + sd + ')' + tag);
  const hd = timeline(mkP([['harden']]), [], 30.3, [1, 6.2, 12.2, 18.2, 24.2, 30.2], ['def'], null, dt);
  ok(hd === '1 2 3 4 5 6', 'Harden +1 per 6 s to +6 at 30 s (' + hd + ')' + tag);
  const dd = timeline(mkP([['dragon-dance']]), [], 6.3, [1, 5.9, 6.2], ['atk', 'spe'], null, dt);
  ok(dd === '1/1 1/1 2/2', 'Dragon Dance: two trackers, +1/+1 then +2/+2 at 6 s (' + dd + ')' + tag);
  const ls = timeline(mkP([['leaf-storm']]), [mkE(95, 0)], 25.5, [1, 7, 11.5, 13, 23.5, 25.5], ['spa'], null, dt);
  ok(ls === '-2 -2 -2 -4 -4 -6', 'Leaf Storm -2 / -4 / -6 on the 12 s Self-drop Gate, never on the 6 s Gate (' + ls + ')' + tag);
}
console.log('1 timelines: Swords Dance, Harden, Dragon Dance, Leaf Storm, equal at dt 1/60 and 1/30');

// 2. tracker rules on one host (SS3 to SS6)
{ const e = mkE(0, 0);
  S.trackOwn(e, 'def', -1, 'a'); S.tick(e, 3); S.trackOwn(e, 'def', -1, 'a');
  ok(S.stage(e, 'def') === -1 && near(S.tracker(e, 'def', 'a').d, S.DURATION), 'a success inside the Gate refreshes Duration and does not climb');
  S.tick(e, 3.05); S.trackOwn(e, 'def', -1, 'a'); ok(S.stage(e, 'def') === -2 && near(S.tracker(e, 'def', 'a').g, S.GATE), 'a success with the Gate open climbs and restarts the Gate');
  S.tick(e, 6.05); ok(S.stage(e, 'def') === -2, 'holds 6.05 s after the last success');
  S.tick(e, 0.1); ok(S.stage(e, 'def') === 0 && !e.trk, 'ends 6.15 s after the last success (Duration 6.1 s)');
  const h = mkE(0, 0); S.trackOwn(h, 'atk', -1, 'x'); S.trackOwn(h, 'atk', -1, 'y');
  for (let i = 0; i < 7; i++) { S.tick(h, 1); S.trackOwn(h, 'atk', -1, 'y'); }
  ok(!S.tracker(h, 'atk', 'x') && S.tracker(h, 'atk', 'y') && S.tracker(h, 'atk', 'y').n === -2 && S.stage(h, 'atk') === -2, 'a dry window resets only its own tracker; the other keeps its climb to -2 (SS5)');
  const c = mkE(0, 0); S.trackOwn(c, 'atk', 4, 'up'); S.tick(c, S.GATE + 0.01); S.trackOwn(c, 'atk', 4, 'up'); S.trackOwn(c, 'atk', -2, 'down');
  ok(S.tracker(c, 'atk', 'up').n === 6 && S.stage(c, 'atk') === 4, 'each tracker clamps at +6 on its own, so a -2 shows at once: +4 (' + S.stage(c, 'atk') + ')');
  const k = mkE(0, 0); for (const s of ['p', 'q', 'r', 's']) S.trackOwn(k, 'spe', -2, s); ok(S.stage(k, 'spe') === -6, 'the host sum clamps at -6');
  texts.length = 0; const t = mkE(0, 0); S.trackOwn(t, 'def', -1, 'z'); S.trackOwn(t, 'def', -1, 'z'); ok(texts.length === 1, 'stage text only when the stage changes');
  console.log('2 rules: refresh, climb, Duration 6.1 s, own reset only, per-tracker clamp, host clamp, quiet refresh'); }

// 3. two Pokemon are two trackers (SS1): a team raise and a foe drop
{ const team = {}, a = mkP([[]], { stgTeam: team }), b = mkP([[]], { stgTeam: team });
  hit('metal-claw', mkE(30, 0), a, () => 0); hit('metal-claw', mkE(30, 0), b, () => 0); hit('metal-claw', mkE(30, 0), a, () => 0);
  ok(S.teamSum(team, 'atk') === 2 && S.stage(b, 'atk') === 2 && Object.keys(S.trackers(a).team.atk).length === 2, 'Metal Claw on two roster members: two team trackers, +2');
  const e = mkE(30, 0); hit('bubble-beam', e, a, () => 0); hit('bubble-beam', e, b, () => 0); hit('bubble-beam', e, a, () => 0);
  ok(S.stage(e, 'spe') === -2 && Object.keys(e.trk.spe).length === 2, 'Bubble Beam from two Pokemon: two trackers on the enemy, -2');
  console.log('3 two Pokemon: two trackers each way'); }

// 4. who rolls (SS2): a missed cast rolls nothing; a 3-shot cast rolls once; each rehit step of a persistent move is a new use
{ const o = mkP([['leaf-storm']]); run(o, [], 2); ok(!o.trk && S.stage(o, 'spa') === 0, 'Leaf Storm with nothing in reach: no self drop');
  const shot = { space: { shape: 'radial', radRadius: 6, count: 3, pierce: 0, spread: 0 }, cd: 50,
    delivery: { anchor: 'caster', targeting: 'direction', motion: 'travels', moveSpeed: 350, endOn: [{ time: 1.5 }] } };
  syn('syn-3s', Object.assign({}, shot, { payload: [{ t: 'damage' }, { t: 'stat', stat: 'atk', stages: 1, side: 'self', scope: 'team', chance: 50 }] }));
  syn('syn-3s0', Object.assign({}, shot, { payload: [{ t: 'damage' }] }));
  const calls = id => { let c = 0; const w = mkP([[id]]); const tp = run(w, [mkE(100, 0)], 1, { rng: () => { c++; return 0.99; } }); return [c, hitsOf(tp).length]; };
  const [c1, h1] = calls('syn-3s'), [c0, h0] = calls('syn-3s0');
  ok(h1 === 3 && h0 === 3 && c1 - c0 === 1, 'three shots of one cast hit three times and the self raise rolls once (' + h1 + ' hits, ' + (c1 - c0) + ' roll)');
  const none = mkP([['syn-3s']]); run(none, [], 1, { rng: () => 0 }); ok(S.teamSum(none.stgTeam, 'atk') === 0, 'a cast that hits nothing rolls nothing (rng 0 would have landed)');
  syn('syn-orb', Object.assign({}, D['leaf-storm'], { id: 'syn-orb', payload: [{ t: 'damage' }, { t: 'stat', stat: 'atk', stages: 1, side: 'self', scope: 'team', chance: 50 }] }));
  syn('syn-orb0', Object.assign({}, D['leaf-storm'], { id: 'syn-orb0', payload: [{ t: 'damage' }] }));
  const pc = id => { let c = 0; const w = mkP([[id]]); const tp = run(w, [mkE(95, 0)], 3, { rng: () => { c++; return 0.99; } }); return [c, hitsOf(tp).length]; };
  const [p1, ph] = pc('syn-orb'), [p0] = pc('syn-orb0');
  ok(ph > 3 && p1 - p0 === ph, 'a persistent orbit: every rehit step is a new use, one roll each (' + (p1 - p0) + ' rolls for ' + ph + ' hits)');
  console.log('4 who rolls: nothing on a miss, once per cast across 3 shots, once per rehit step'); }

// 5. chance moves hold while they land once per Duration window (SS11): P = 1 - (1 - p)^k
{ const sp = syn('syn-ch', { category: 'status', basePower: 0, payload: [{ t: 'stat', stat: 'def', stages: -1, side: 'foe', scope: 'individual', chance: 30 }] });
  const o = mkP(), r = seeded(77), N = 4000; let held = 0;
  for (let i = 0; i < N; i++) {
    const e = mkE(30, 0); hit(sp, e, o, () => 0);
    for (let k = 0; k < 6; k++) { S.tick(e, 1); hit(sp, e, o, r); }
    S.tick(e, 0.15); if (S.stage(e, 'def') !== 0) held++;
  }
  const p = 1 - Math.pow(0.7, 6);
  ok(within4sd(held, N, p), '30% with 6 rolls per window holds ' + held + ' of ' + N + ' (want about ' + Math.round(N * p) + ')');
  console.log('5 chance hold: ' + held + ' of ' + N + ' vs ' + (N * p).toFixed(0)); }

// 6. bench and faint (SS9, BENCH, FAINT AND REVIVE)
{ const p = mkP(); S.trackOwn(p, 'spa', -2, 'ls', S.gateOf(true));
  for (let i = 0; i < 60; i++) p.benchUpdate(0.1); ok(S.stage(p, 'spa') === -2, 'on the bench the drop still holds 6.0 s after its last success');
  p.benchUpdate(0.1); p.benchUpdate(0.1); ok(S.stage(p, 'spa') === 0 && !p.trk, 'and ends one Duration after it (bench ticks)');
  const f = mkP(); S.trackOwn(f, 'spa', -2, 'ls'); S.trackTeam(f, 'atk', 2, 'sd'); f.clearEffects();
  ok(!f.trk && S.stage(f, 'spa') === 0 && S.stage(f, 'atk') === 2, 'a faint clears own trackers, the team raise stays');
  console.log('6 bench and faint'); }

// 7. pure buffs (SS8): active group only, swap-in waits for a running Gate, fizzle waits one Gate
{ const sw = mkP([['swords-dance'], ['tackle']]); run(sw, [], 1);
  sw.act = 1; const off = run(sw, [], 3, { reset: false });
  ok(casts(off, 'swords-dance').length === 0 && S.stage(sw, 'atk') === 2, 'inactive: no casts, the raise rides its Duration');
  sw.act = 0; const back = run(sw, [], 1, { reset: false }); ok(casts(back, 'swords-dance').length === 0, 'swap-in at 4 s with its Gate running: no cast');
  const open = run(sw, [], 1.5, { reset: false }); ok(casts(open, 'swords-dance').length === 1 && S.stage(sw, 'atk') === 4, 'it casts when the Gate opens and climbs to +4');
  const solo = mkP([['swords-dance'], ['tackle']]); solo.act = 1; const idle = run(solo, [], 13);
  ok(casts(idle, 'swords-dance').length === 0 && S.stage(solo, 'atk') === 0, 'a buff alone in an inactive group never casts and never climbs');
  const ex = mkP([['swords-dance'], ['tackle']]); run(ex, [], 0.5); ex.act = 1; run(ex, [], 6, { reset: false }); ex.act = 0;
  const fresh = run(ex, [], 0.1, { reset: false }); ok(casts(fresh, 'swords-dance').length === 1 && S.stage(ex, 'atk') === 2, 'swap-in after its tracker ended: casts at once, starts over at +2');
  const fz = mkP([['swords-dance']]), f0 = St.fizzle; St.fizzle = () => true; run(fz, [], 1 / 60); St.fizzle = f0;
  const w1 = run(fz, [], 5.9, { reset: false }), w2 = run(fz, [], 0.2, { reset: false });
  ok(casts(w1, 'swords-dance').length === 0 && casts(w2, 'swords-dance').length === 1 && S.stage(fz, 'atk') === 2, 'a fizzle waits one Gate, then casts');
  const cd = mkP([['swords-dance']], { cdMul: 0.01 }); const many = run(cd, [], 7); ok(casts(many, 'swords-dance').length === 2, 'cdMul does not touch a pure buff: 2 casts in 7 s');
  console.log('7 pure buffs: active only, swap-in wait, solo never climbs, restart after reset, fizzle wait, no cooldown'); }

// 7b. a self drop outlives a slot swap (MOVE-INTENT leaf-storm: it ends one Duration after the last hit, including after the move stops being active)
for (const other of ['tackle', 'swords-dance', 'bug-buzz', 'string-shot']) {
  const o = mkP([['leaf-storm'], [other]]), es = [mkE(95, 0), mkE(0, 95)];
  run(o, es, 3);     // the orbit keeps hitting the two dummies, so the last hit is within a frame or two of the swap at 3 s
  o.act = 1; const st = [];
  run(o, es, 6.3, { reset: false, each: (k, t) => st.push([k / 60, S.stage(o, 'spa')]) });
  const at = x => (st.find(y => y[0] >= x - 1e-9) || [0, null])[1];
  ok(at(0.1) === -2 && at(5.5) === -2 && at(6.3) === 0, 'swap Leaf Storm to ' + other + ': Sp. Atk -2 holds after the swap and ends about 6.1 s after the last hit (' + [at(0.1), at(5.5), at(6.3)] + ')');
}
console.log('7b Leaf Storm swap: the self drop holds after a slot swap, for every move in the stages debug set');

// 8. the legacy store, carriers and readers beside the trackers (5a map section 10, carrier statuses)
{ const p = mkP(); S.add(p, 'spe', -1, 6); S.trackTeam(p, 'spe', 2, 'ag'); ok(S.stage(p, 'spe') === 1 && near(S.speedMul(p), 5 / 4), 'a SLOW carrier -1 and an Agility tracker +2 sum to +1');
  S.teamAdd(p.stgTeam, 'regen', 1, 8, 'aq'); S.teamAdd(p.stgTeam, 'pct_def', 0.2, 8, 'kee'); S.trackTeam(p, 'atk', 2, 'sd'); S.teamTick(p.stgTeam, 1);
  ok(S.teamSum(p.stgTeam, 'regen') === 1 && near(S.teamSum(p.stgTeam, 'pct_def'), 0.2) && S.teamSum(p.stgTeam, 'atk') === 2, 'Aqua Ring regen and a berry key keep working beside the trackers');
  ok(S.teamLive(p.stgTeam, 'atk') && S.teamLive(p.stgTeam, 'regen') && !S.teamLive(p.stgTeam, 'def') && S.teamKeys(p.stgTeam).includes('atk') && S.teamKeys(p.stgTeam).includes('regen'), 'HUD readers see legacy keys and tracker stats');
  const tm = S.teamTimer(p.stgTeam, 'atk'); ok(tm && near(tm.t, S.DURATION - 1) && tm.dur === S.DURATION, 'HUD timer: the tracker Duration left (' + (tm && tm.t) + ')');
  const e = mkE(30, 0), e0 = mkE(30, 0), sp = syn('syn-sp', { category: 'special', basePower: 60, payload: [{ t: 'damage' }] }); S.trackOwn(e, 'spd', -2, 'x');
  const d1 = hit(sp, e, p).dmg, d0 = hit(sp, e0, p).dmg; ok(d1 / d0 > 1.5, 'a tracker Sp. Def drop raises new-path special damage (x' + (d1 / d0).toFixed(2) + ')');
  ok(S.remaining(e, 'spd', -1) > 6, 'remaining() reports a tracker drop for the HUD status list');
  console.log('8 legacy store, carriers, berries and readers beside the trackers'); }

console.log(fail ? '\nstat-stage harness: ' + fail + ' FAILED of ' + n : '\nstat-stage harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
