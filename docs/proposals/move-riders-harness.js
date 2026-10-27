// Move schema slice 4a (riders on hit), offline checks (Node only). Usage from the repo root:  node docs/proposals/move-riders-harness.js .
// Loads the REAL stats.js, enemies.js, status.js, stages.js and enemy.js (pattern: status-sliceD1/D2 harness) plus the real move data
// chain, G.MoveGeom, G.MoveSim, G.MoveEffects and G.SimBus, with stubs for the enemy manager, world, weather and FX. Checks: rider proc
// counts, the D31 stat key map, the D30 per-move cap, the trap root on every enemy movement phase, knockback, crit, heal from dealt,
// thaw, the riders-only hit, the hop hook and determinism. The mutation runner (move-riders-mutate.js) points RIDERS_<FILE> at altered copies.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/move-effects.js': 'RIDERS_FX', 'js/systems/stages.js': 'RIDERS_STAGES', 'js/systems/status.js': 'RIDERS_STATUS',
  'js/entities/enemy.js': 'RIDERS_ENEMY', 'js/systems/move-sim.js': 'RIDERS_SIM' };
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
  Weather: { mult: () => 1, speedFor: () => 1 }, Game: new Proxy({ everyone: () => [] }, { get: (t, k) => (k in t ? t[k] : noop) }),
  World: { collide: () => false, isLiquid: () => false, projectileBlock: () => null, propsInCircle: () => [] } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
for (const p of ['js/core/stats.js', 'js/data/enemies.js', 'js/data/types.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/core/simbus.js',
  'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js',
  'js/systems/move-sim.js', 'js/systems/move-effects.js']) { try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } }
G.EnemyMgr = { all: () => enemies, queryCircle(x, y, r) { const o = []; this.queryCircleEach(x, y, r, e => o.push(e)); return o; }, queryCircleEach(x, y, r, fn) { for (const e of enemies.slice()) if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= (r + e.r) ** 2) fn(e); } };     // after enemy.js, which defines the real one
const St = G.Status, S = G.Stages, FX = G.MoveEffects, Enemy = G.Enemy; Enemy.prototype.die = function () { this.dead = true; };
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 40) console.log('FAIL', m); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
let eid = 0;
const mk = (x = 30, y = 0, o = {}) => { const e = new Enemy({ dex: 1, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: o.behavior || 'chase' }, x, y, { t: 0, dmg: 1, hp: 1, spd: 1 }, false);
  e.maxHp = e.hp = 1e6; e.id = ++eid; if (!(e.r > 0)) e.r = 10; return Object.assign(e, o); };
const mkO = (ids = [], o = {}) => Object.assign({ id: 'p1', x: 0, y: 0, r: 12, aim: 0, level: 30, atk: 84, spa: 109, cdMul: 1, critChance: 0, dead: false, stgTeam: {}, moveRadiusMul: 1,
  hp: 50, maxHp: 1000, healed: [], slots: [ids.map(id => ({ id, t: 0 }))], activeGroup() { return this.slots[0]; },
  moveFactor(m) { return G.Stats.attackFactor(this.atk, this.spa, this.level, m, 1.1); }, stabFor() { return false; }, onDealt() {}, heal(a) { this.healed.push(a); } }, o);
const hitWith = (id, e, o = mkO(), rng = () => 0.99, hop = 0, at = { x: 0, y: 0 }) => FX.applyHit({ spec: typeof id === 'string' ? G.MoveDefs[id] : id, cast: { owner: o }, x: at.x, y: at.y }, e, hop, rng);
const syn = (payload, extra = {}) => Object.assign({ id: 'syn-' + (++eid), type: 'normal', category: 'physical', basePower: 40, payload }, extra);
const stepE = (e, secs, pl, dt = 0.05) => { for (let i = 0; i < Math.round(secs / dt); i++) e.update(dt, pl); };
const far = { level: 5, x: 3000, y: 0, hp: 100, r: 10, dead: false, spd: 100 };
const throws = () => { throw new Error('a roll happened where none was expected'); };
const within4sd = (k, N, p) => Math.abs(k - N * p) <= 4 * Math.sqrt(N * p * (1 - p));

// 1. proc counts, the one percent conversion, no roll without a chance
{ const N = 10000, r = seeded(11);
  for (const c of [10, 30, 50]) { let k = 0; for (let i = 0; i < N; i++) if (FX.rolls({ chance: c }, 0, r)) k++; ok(within4sd(k, N, c / 100), 'rolls ' + c + '%: ' + k + ' of ' + N); }
  ok(FX.rolls({}, 0, throws) === true, 'no chance: guaranteed, no roll');
  ok(FX.rolls({ chance: 30 }, 0, () => 0.29) && !FX.rolls({ chance: 30 }, 0, () => 0.31), 'a 30% chance is 0.30 (divided by 100 once)');
  ok(FX.rolls({ chance: 100 }, 0, throws), '100% applies without a roll');
  // through applyHit: Bite flinch 30%, Ember burn 10% (a fresh enemy each hit, the real entry points counted)
  const rr = seeded(5); let fl = 0, bu = 0;
  for (let i = 0; i < N; i++) { const e = mk(); e.applyFlinch = () => { fl++; return true; }; hitWith('bite', e, mkO(), rr); }
  for (let i = 0; i < N; i++) { const e = mk(); e.applyBurn = () => { bu++; }; hitWith('ember', e, mkO(), rr); }
  ok(within4sd(fl, N, 0.3), 'Bite flinch 30%: ' + fl); ok(within4sd(bu, N, 0.1), 'Ember burn 10%: ' + bu);
  console.log('1 proc counts: 10/30/50% within 4 sd over 10000; Bite flinch ' + fl + ', Ember burn ' + bu + '; no chance means no roll'); }

// 2. D31 stat key map
{ ok(['atk', 'def', 'spAtk', 'spDef', 'spd'].map(FX.statKey).join() === 'atk,def,spa,spd,spe', 'statKey map');
  let threw = false; try { FX.statKey('speed'); } catch (x) { threw = true; } ok(threw, 'unknown stat fails loudly');
  const a = mk(); hitWith(syn([{ t: 'stat', stat: 'spd', stages: -2, side: 'foe', scope: 'individual', duration: 6, maxStacks: 6 }], { category: 'status', basePower: 0 }), a);
  ok(S.stage(a, 'spe') === -2 && S.stage(a, 'spd') === 0 && near(S.speedMul(a), 4 / 6), 'spd lowers Speed (movement x0.67), Sp. Def untouched');
  const b = mk(), b0 = mk(), sp = syn([{ t: 'damage' }], { category: 'special', basePower: 60 });
  hitWith(syn([{ t: 'stat', stat: 'spDef', stages: -2, side: 'foe', scope: 'individual', duration: 6, maxStacks: 6 }], { category: 'status', basePower: 0 }), b);
  ok(S.stage(b, 'spd') === -2 && S.stage(b, 'spe') === 0 && S.speedMul(b) === 1, 'spDef lowers Sp. Def, not movement');
  const ph = syn([{ t: 'damage' }], { category: 'physical', basePower: 60 });
  const d1 = hitWith(sp, b).dmg, d0 = hitWith(sp, b0).dmg; ok(d1 / d0 > 1.8 && near(hitWith(ph, b).dmg, hitWith(ph, b0).dmg), 'Sp. Def -2 raises special damage (x' + (d1 / d0).toFixed(3) + '), physical untouched');
  for (const [st, key] of [['spAtk', 'spa'], ['atk', 'atk'], ['def', 'def']]) { const e = mk(); hitWith(syn([{ t: 'stat', stat: st, stages: -1, side: 'foe', scope: 'individual', duration: 6, maxStacks: 6 }]), e); ok(S.stage(e, key) === -1, st + ' reaches ' + key); }
  console.log('2 stat keys: spd -> spe (movement), spDef -> spd (special damage x1.95 at -2, physical same), spAtk/atk/def -> spa/atk/def'); }

// 3. D30 per-move cap
{ const e = mk(), up = syn([{ t: 'stat', stat: 'atk', stages: 1, side: 'foe', scope: 'individual', duration: 6, maxStacks: 1 }], { category: 'status', basePower: 0 });
  S.add(e, 'atk', 1, 999); S.add(e, 'atk', 1, 999); let worst = 0;
  for (let t = 0; t < 60; t += 0.05) { if (Math.abs(t % 3) < 1e-6 || Math.abs(t % 3 - 3) < 1e-6) hitWith(up, e); S.tick(e, 0.05); worst = Math.max(worst, S.stage(e, 'atk')); }
  ok(worst === 3, 'Q4: two stages plus a maxStacks 1 move every 3 s never exceeds 3 (worst ' + worst + ')');
  const m = mk(); hitWith('mud-shot', m); for (let i = 0; i < 119; i++) S.tick(m, 0.05); ok(S.stage(m, 'spe') === -1, 'default 6 s: still on at 5.95 s');
  S.tick(m, 0.1); ok(S.stage(m, 'spe') === 0, 'default 6 s: gone after 6 s');
  const c = mk(); for (let i = 0; i < 9; i++) hitWith('mud-shot', c); ok(c.stg.spe.length === 6 && S.stage(c, 'spe') === -6, 'default maxStacks 6: 6 live applications after 9 hits');
  const o = mk(), two = syn([{ t: 'stat', stat: 'def', stages: -1, side: 'foe', scope: 'individual', duration: 6, maxStacks: 2 }]);
  hitWith(two, o); S.tick(o, 1); hitWith(two, o); S.tick(o, 1); hitWith(two, o);
  ok(o.stg.def.length === 2 && near(o.stg.def[0].t, 5) && near(o.stg.def[1].t, 6), 'a capped application drops the OLDEST: ' + o.stg.def.map(a => a.t.toFixed(2)));
  const team = {}, A = mkO([], { stgTeam: team }), B = { stgTeam: team, stg: null };
  for (let i = 0; i < 50; i++) hitWith('metal-claw', mk(), A, () => 0);
  ok(S.teamSum(team, 'atk') === 2 && S.stage(B, 'atk') === 2, 'Metal Claw cap 2 on the team store, seen by the roster: ' + S.teamSum(team, 'atk'));
  const ls = mkO(); for (let i = 0; i < 100; i++) hitWith('leaf-storm', mk(), ls); ok(S.stage(ls, 'spa') === -2 && ls.stg.spa.length === 1, 'Leaf Storm cap 1 holds -2 after 100');
  const mm = mkO(); for (let i = 0; i < 50; i++) { hitWith('metal-claw', mk(), mm, () => 0); hitWith('meteor-mash', mk(), mm, () => 0); }
  ok(S.teamSum(mm.stgTeam, 'atk') === 4, 'caps are per move and add: Metal Claw 2 + Meteor Mash 2 = 4');
  texts.length = 0; const q = mk(), one = syn([{ t: 'stat', stat: 'def', stages: -1, side: 'foe', scope: 'individual', duration: 6, maxStacks: 1 }]);
  hitWith(one, q); hitWith(one, q); hitWith(one, q); ok(texts.filter(t => /Defense/.test(t)).length === 1, 'no stage text when the stage did not change');
  console.log('3 D30: Q4 holds at 3, 6 s default, cap 6 default, oldest dropped, Metal Claw 2 team-wide, Leaf Storm -2 held, caps add across moves'); }

// 4. trap: the root on every movement phase, strong hosts, ghosts, the player
{ const root = e => { e.stTrap = null; return St.apply(e, 'trap'); };
  const still = (label, e, pl, secs = 1.9) => { const x0 = e.x, y0 = e.y; stepE(e, secs, pl); ok(Math.hypot(e.x - x0, e.y - y0) < 1e-9, label + ' did not move while rooted (moved ' + Math.hypot(e.x - x0, e.y - y0).toFixed(3) + ')'); };
  const w = mk(0, 0); ok(root(w) === 'ok' && near(w.stTrap.t, 2), 'wild root is 2 s'); still('wild walker', w, far);
  { const x0 = w.x; stepE(w, 0.3, far); ok(!w.stTrap && w.x > x0 + 1, 'wild walker moves after 2 s'); }
  const near1 = { level: 5, x: 150, y: 0, hp: 100, r: 10, dead: false, spd: 100 };
  for (const b of ['charger', 'ranged', 'thief', 'healer', 'jumper', 'shielder', 'bomber']) { const e = mk(0, 0, { behavior: b }); e.skillCd = 0; e.pt = 0; root(e); still(b, e, near1); ok(!e.jump, b + ': no jump started while rooted'); }
  { const e = mk(0, 0); e.leaving = true; root(e); still('leaving unit', e, near1); }
  { const e = mk(0, 0); e.jump = { sx: 0, sy: 0, tx: 100, ty: 0, t: -0.3, dur: 0.6 }; root(e); e.updateJump(0.2); ok(e.x === 0 && e.jump.t === -0.3, 'rooted: a crouching jump holds');
    e.jump.t = 0.1; e.updateJump(0.1); ok(e.x > 0, 'rooted: a jump in the air still lands'); }
  { const e = mk(0, 0); e.ai = { cast: { id: 'dash', t: 1, wind: 0.75, len: 330, dur: 0.32, go: true, ang: 0 } }; root(e); const v = e.bossCast(0.016, near1); ok(v[0] === 0 && v[1] === 0, 'boss dash: no motion while rooted');
    e.stTrap = null; e.ai.cast.t = 0.8; const v2 = e.bossCast(0.016, near1); ok(v2[0] > 0, 'boss dash moves when not rooted'); }
  { const e = mk(0, 0); e.fl = { ph: 'approach', t: 0, sector: -1, scanT: 0 }; root(e); const v = e.flankMove(0.05, near1, 0, 150); ok(v[0] === 0 && v[1] === 0, 'flanker: no motion at speed 0'); }
  { const e = mk(0, 0); root(e); const x0 = e.x; e.kx = 200; stepE(e, 0.3, far); ok(e.x > x0 + 5, 'a rooted enemy is still pushed by knockback'); }
  for (const k of ['boss', 'elite', 'gym']) { const h = { x: 0, y: 0, maxHp: 100, hp: 100, types: ['normal'], [k]: k === 'gym' ? {} : true };
    ok(St.apply(h, 'trap') === 'ok' && near(h.stTrap.t, 0.5), k + ': root cut to 0.5 s'); ok(St.apply(h, 'trap') === 'refresh' && near(h.stTrap.t, 0.5), k + ': no extension');
    St.tick(h, 0.55); ok(!h.stTrap && near(h.stWin.trap, 10), k + ': 10 s window after'); ok(St.apply(h, 'trap') === 'window', k + ': reapply blocked in the window');
    for (let i = 0; i < 101; i++) St.tick(h, 0.1); ok(St.apply(h, 'trap') === 'ok', k + ': reapply after the window'); }
  const g = mk(0, 0); g.types = ['ghost']; ok(root(g) === 'immune' && St.speedMul(g) === 1, 'ghost immune');
  const p = { isPlayer: true, mon: { types: ['normal'] }, x: 0, y: 0, maxHp: 100, hp: 100 };
  ok(St.apply(p, 'trap') === 'ok' && near(p.stTrap.t, 8) && St.speedMul(p) === 1 && St.swapLocked(p) && !St.rooted(p), 'player: 8 s swap lock, speed unchanged, never rooted');
  console.log('4 trap: 2 s root on walkers, charger, ranged, thief, healer, jumper, shielder, bomber, leaving, jumps, boss dash, flanker; strong 0.5 s + 10 s window; ghost immune; player swap lock unchanged'); }

// 5. knockback: the legacy impulse, direction from the instance centre, bosses and elites still, a shield-absorbed hit does not knock
{ const a = mk(30, 0), b = mk(30, 0); hitWith('tackle', a); b.hurt(10, '#fff', 30, 0, 90);
  ok(near(a.kx, 90) && near(b.kx, 90) && a.ky === 0, 'Tackle knock 90 like legacy: ' + a.kx);
  stepE(a, 0.5, far); stepE(b, 0.5, far); ok(near(a.x, b.x, 1e-9) && near(a.y, b.y, 1e-9), 'same displacement as the legacy path');
  const c = mk(0, 40); hitWith('body-slam', c, mkO(), () => 0.99, 0, { x: 0, y: 0 }); ok(near(c.ky, 140) && Math.abs(c.kx) < 1e-9, 'direction instance centre -> enemy');
  for (const k of ['boss', 'elite']) { const e = mk(30, 0); e[k] = k === 'elite' ? { hp: 1, xpMul: 1 } : true; hitWith('tackle', e); ok(e.kx === 0, k + ' is not knocked'); }
  const s = mk(30, 0); s.shield = 1e9; hitWith('tackle', s); ok(s.kx === 0, 'a shield-absorbed hit does not knock');
  console.log('5 knockback: 90 px impulse as legacy, same path, centre-to-enemy, bosses / elites / full shields unmoved'); }

// 6. crit
{ let calls = 0; const r0 = v => () => { calls++; return v; };
  const o = mkO([], { critChance: 0.05 }); ok(hitWith('psycho-cut', mk(), o, r0(0.1999)).crit && !hitWith('psycho-cut', mk(), o, r0(0.2001)).crit, 'Psycho Cut chance = owner 0.05 + 0.15');
  calls = 0; hitWith('psycho-cut', mk(), o, r0(0.5)); ok(calls === 1, 'one roll per damage hit (' + calls + ')');
  const hi = hitWith('psycho-cut', mk(), o, () => 0).dmg, lo = hitWith('psycho-cut', mk(), o, () => 0.99).dmg; ok(near(hi / lo, 1.5), 'crit x1.5');
  ok(!hitWith('tackle', mk(), mkO(), throws).crit, 'no crit chance: no roll');
  console.log('6 crit: Psycho Cut adds 0.15, one roll per hit, x1.5'); }

// 7. heal from dealt
{ const o = mkO(), e = mk(); const r = hitWith('giga-drain', e, o); ok(near(o.healed[0], r.dealt * 0.5) && near(r.dealt, r.dmg), 'heal = dealt x 0.5');
  const br = mkO([], { bigRoot: true }); const r2 = hitWith('giga-drain', mk(), br); ok(near(br.healed[0], r2.dealt * 0.5 * 1.3), 'Big Root x1.3');
  const sh = mk(); sh.shield = 5; const os = mkO(); const r3 = hitWith('giga-drain', sh, os); ok(near(r3.dealt, r3.dmg) && near(os.healed[0], r3.dmg * 0.5), 'shield counts toward dealt');
  const tiny = mk(); tiny.hp = 5; const ot = mkO([], { bigRoot: true }); hitWith('giga-drain', tiny, ot); ok(near(ot.healed[0], 2.5 * 1.3) && tiny.dead, 'overkill excluded: 5 HP heals 2.5 x 1.3');
  const dead = mk(); dead.dead = true; const od = mkO(); hitWith('giga-drain', dead, od); ok(od.healed.length === 0, 'zero dealt heals nothing');
  console.log('7 heal: dealt x 0.5, x1.3 Big Root, shield counted, overkill excluded, nothing on zero'); }

// 8. thaw
{ const e = mk(); St.apply(e, 'freeze'); St.tick(e, 0.1); hitWith('ember', e); ok(e.stMajor && e.stMajor.k === 'freeze', 'Fire at 0.1 s does not thaw');
  St.tick(e, 0.15); hitWith('water-gun', e); ok(e.stMajor && e.stMajor.k === 'freeze', 'non-Fire never thaws'); hitWith('ember', e); ok(!e.stMajor, 'Fire after 0.2 s thaws');
  console.log('8 thaw: Fire after 0.2 s of freeze ends it, other types never'); }

// 9. riders-only hit through the sim (String Shot), determinism
function world(ids, es, secs, dt, s) {
  enemies = es; G.MoveSim.clear(); G.MoveSim.setRng(seeded(s)); G.MoveSim.setView(null);
  const o = mkO(ids), tape = G.SimBus.record(), N = Math.round(secs / dt);
  for (let k = 1; k <= N; k++) { G.MoveSim.tick(dt, o, k * dt); for (const e of es) { G.Status.tick(e, dt); G.Stages.tick(e, dt); } o.slots[0].forEach(sl => { sl.t = Math.max(sl.t, 99); }); }
  G.SimBus.stopRecording(); return { tape, o, es };
}
{ for (const dt of [1 / 60, 1 / 30]) {
    const front = mk(60, 0), back = mk(120, 0); const w = world(['string-shot'], [front, back], 1, dt, 3);
    const hits = w.tape.filter(t => t.type === 'move:hit'), ends = w.tape.filter(t => t.type === 'move:end');
    ok(hits.length === 2 && hits.every(h => h.dmg === 0 && h.enemyId === front.id), 'String Shot: two move:hit with dmg 0 on the first enemy (' + hits.length + ')');
    ok(S.stage(front, 'spe') === -4 && front.stTrap && !back.stTrap && !back.stg, 'both strands: Speed -4 and the root on the first enemy only');
    ok(ends.length === 2 && ends.every(e => e.reason === 'pierce'), 'pierce spent on the first enemy');
  }
  const run = (s, dt) => { const es = [mk(30, 0), mk(40, 10), mk(200, 0)], w = world(['body-slam', 'ice-beam', 'bite'], es, 1, dt, s);
    return w.tape.filter(t => t.type === 'move:hit').map(t => [es.findIndex(e => e.id === t.enemyId), t.crit, +t.dmg.toFixed(6)]); };
  ok(JSON.stringify(run(9, 1 / 60)) === JSON.stringify(run(9, 1 / 60)), 'same seed, identical tape');
  const cnt = h => [0, 1, 2].map(i => h.filter(x => x[0] === i).length).join();
  ok(cnt(run(9, 1 / 60)) === cnt(run(9, 1 / 30)), 'hit counts agree at dt 1/60 and 1/30: ' + cnt(run(9, 1 / 60)) + ' vs ' + cnt(run(9, 1 / 30)));
  console.log('9 riders-only hit: String Shot lands dmg 0 twice, -4 Speed and the root, pierce spent; tapes deterministic'); }

// 9b. riders skip a dead target (also one the same hit killed); self riders still apply
{ const d = mk(); d.dead = true; let b = 0; d.applyBurn = () => { b++; }; hitWith('ember', d, mkO(), () => 0); hitWith('mud-shot', d); ok(b === 0 && !d.stg, 'no foe riders on a dead enemy');
  const k = mk(); k.hp = 1; hitWith('mud-shot', k); ok(k.dead && !k.stg, 'no foe riders on an enemy the hit killed');
  const o = mkO(), k2 = mk(); k2.hp = 1; hitWith('leaf-storm', k2, o); ok(S.stage(o, 'spa') === -2, 'self riders still apply after a kill');
  const r = mk(); r.remote = true; hitWith(syn([{ t: 'stat', stat: 'def', stages: -1, side: 'foe', scope: 'individual', duration: 6, maxStacks: 6 }], { category: 'status', basePower: 0 }), r); ok(!r.stg, 'no foe riders on a remote copy');
  console.log('9b dead and remote targets: foe riders skipped, self riders kept'); }

// 10. hop hook
{ ok(FX.rolls({ chance: 100 }, 2, () => 0.249) && !FX.rolls({ chance: 100 }, 2, () => 0.251), 'hop 2 quarters the chance');
  console.log('10 hop: chance x 0.5 per hop'); }

console.log(fail ? '\nmove-riders harness: ' + fail + ' FAILED of ' + n : '\nmove-riders harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
