// Move schema slice 4b (self-casts, specials, chains, caster-state commitment), offline checks (Node only). Usage from the repo root:
//   node docs/proposals/move-selfcast-harness.js .
// Loads the REAL stats.js, enemies.js, status.js, stages.js, enemy.js and player.js (the Player prototype: hurt, absorb, tickShield,
// payHp, heal, spd) plus the real move data chain, G.MoveGeom, G.MoveSim, G.MoveEffects and G.SimBus, with stubs for the enemy manager,
// world, weather, audio, camera and FX (pattern: move-riders-harness.js). Checks the numbered cases of slice-4b-codehandoff.md (Tests).
// The mutation runner (move-selfcast-mutate.js) points SELF_<FILE> at altered copies; every mutation must make this harness fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/move-effects.js': 'SELF_FX', 'js/systems/move-sim.js': 'SELF_SIM', 'js/systems/stages.js': 'SELF_STAGES',
  'js/entities/player.js': 'SELF_PLAYER' };
const load = p => { const f = process.env[SRC[p]] || R + '/' + p; vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: p }); };
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
const DEX_BY = { 1: { name: 'Normie', types: ['normal'], stats: [50, 50, 50, 50, 50, 65] } };
global.window = global; global.location = { search: '?dev' };
let seed = 4242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; Math.random = rnd;
const seeded = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const texts = [], forced = [];
let enemies = [], sfx = 0, kicks = 0, wmul = 1;
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => a + (b - a) * rnd(), randInt: (a, b) => a + Math.floor((b - a + 1) * rnd()),
    pickN: a => a, damp: (a, b) => b, norm: (x, y) => { const n = Math.hypot(x, y) || 1; return [x / n, y / n]; }, dist: (a, b, c, d) => Math.hypot(a - c, b - d),
    dist2: (a, b, c, d) => (a - c) * (a - c) + (b - d) * (b - d), hash: () => 0.5, pick: a => a[0] },
  DEX_BY, DEX: [], FX: { dmgText: (x, y, m) => texts.push(m), spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {} },
  Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, dirFromAngle: () => 0 },
  Weather: { mult: () => wmul, speedFor: () => 1, force: (k, d) => forced.push([k, d]) }, Game: new Proxy({ everyone: () => [] }, { get: (t, k) => (k in t ? t[k] : noop) }),
  Audio: { sfx: () => { sfx++; } }, Camera: { kick: () => { kicks++; } }, Log: { on: false },
  World: { collide: () => false, isLiquid: () => false, projectileBlock: () => null, propsInCircle: () => [] } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
for (const p of ['js/core/stats.js', 'js/data/enemies.js', 'js/data/types.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/player.js',
  'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js',
  'js/data/move-resolver.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js']) { try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } }
G.EnemyMgr = { all: () => enemies, queryCircle(x, y, r) { const o = []; this.queryCircleEach(x, y, r, e => o.push(e)); return o; }, queryCircleEach(x, y, r, fn) { for (const e of enemies.slice()) if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= (r + e.r) ** 2) fn(e); } };
const St = G.Status, S = G.Stages, FX = G.MoveEffects, Sim = G.MoveSim, Enemy = G.Enemy, D = G.MoveDefs; Enemy.prototype.die = function () { this.dead = true; };
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 40) console.log('FAIL', m); } };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
let eid = 0;
const mk = (x = 30, y = 0, o = {}) => { const e = new Enemy({ dex: 1, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'chase' }, x, y, { t: 0, dmg: 1, hp: 1, spd: 1 }, false);
  e.maxHp = e.hp = 1e9; e.id = ++eid; if (!(e.r > 0)) e.r = 10; return Object.assign(e, o); };
const slotsOf = groups => groups.map(g => g.map(id => ({ id, t: 0 })));
/** A stub owner (the sim's owner contract) for hit-side tests. */
const mkO = (groups = [[]], o = {}) => Object.assign({ x: 0, y: 0, r: 12, aim: 0, level: 30, atk: 84, spa: 109, cdMul: 1, critChance: 0, dead: false, stgTeam: {}, moveRadiusMul: 1,
  hp: 500, maxHp: 1000, slots: slotsOf(groups), activeGroup() { return this.slots[0]; }, moveFactor(m) { return G.Stats.attackFactor(this.atk, this.spa, this.level, m, 1.1); },
  stabFor() { return false; }, onDealt() {}, heal() {}, payHp(v) { this.hp = Math.max(1, this.hp - v); } }, o);
/** A REAL Player prototype on a hand-built body: hurt, absorb, tickShield, payHp, heal and spd are the game's own code. */
const mkP = (groups = [[]], o = {}) => Object.assign(Object.create(G.Player.prototype), { x: 0, y: 0, r: 12, bodyH: 20, aim: 0, level: 30, cdMul: 1,
  critChance: 0, dead: false, benched: false, stgTeam: {}, stg: null, moveRadiusMul: 1, hp: 100, maxHp: 100, invuln: 0, flash: 0, dmgReduce: 0, shield: null, mvRoot: false,
  mon: { types: ['normal'] }, inc: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, badge: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, baseSpd: 100, spdMul: 1,
  inLiquid: false, runItems: [], item: null, sashT: -1e9, anim: { play() {} }, slots: slotsOf(groups), activeGroup() { return this.slots[0]; },
  moveFactor(m) { return G.Stats.attackFactor(84, 109, this.level, m, 1.1); }, stabFor() { return false; }, onDealt() {} }, o);
const syn = (id, def) => { D[id] = Object.assign({ id, name: id, type: 'normal', category: 'status', basePower: 0, power: null, hitPolicy: 'oncePerInstance' }, def); return id; };
const hitWith = (id, e, o = mkO(), rng = () => 0.99, hop = 0) => FX.applyHit({ spec: typeof id === 'string' ? D[id] : id, cast: { owner: o }, x: 0, y: 0 }, e, hop, rng);
/** Run the sim: tick the owner's slots for `secs` (dt steps), optionally recording the SimBus tape. `each(k, t)` runs after every tick. */
function run(o, es, secs, { dt = 1 / 60, rng = () => 0.99, each = null, reset = true } = {}) {
  enemies = es; if (reset) Sim.clear(); Sim.setRng(rng); Sim.setView(null);
  const tape = G.SimBus.record(), N = Math.round(secs / dt);
  for (let k = 1; k <= N; k++) { Sim.tick(dt, o, k * dt); if (o.tickShield) o.tickShield(dt); S.tick(o, dt); S.teamTick(o.stgTeam, dt); if (each) each(k, k * dt); }
  G.SimBus.stopRecording(); return tape;
}
const hits = tape => tape.filter(t => t.type === 'move:hit');
const casts = (tape, id) => tape.filter(t => t.type === 'move:cast' && (!id || t.moveId === id));
/** Fire exactly one cast of the first slot, then keep every slot from casting again (only the first cast is under test). */
const once = o => () => o.slots.flat().forEach(sl => { if (sl.t < 50) sl.t = 99; });
const line = (n0 = 6, x0 = 80, gap = 100) => Array.from({ length: n0 }, (_, i) => mk(x0 + gap * i, 0));

// 1. chain math: Thunderbolt down a line of 6, 100 px apart (hopRange 140): 5 enemies, ratios 0.67^k, applied last
{ const es = line(), o = mkO([['thunderbolt']]), tape = run(o, es, 0.05, { each: once(o) }), h = hits(tape);
  const base = hitWith('thunderbolt', mk(), mkO()).dmg;
  ok(h.length === 5 && h.map(x => x.hop).join() === '0,1,2,3,4', 'five hits, hops 0 to 4 (' + h.map(x => x.hop) + ')');
  ok(h.map(x => es.findIndex(e => e.id === x.enemyId)).join() === '0,1,2,3,4', 'the chain goes forward along the line (' + h.map(x => es.findIndex(e => e.id === x.enemyId)) + ')');
  const want = [1, 0.67, 0.4489, 0.300763, 0.20151121];
  ok(h.every((x, k) => near(x.dmg / base, want[k], 1e-9)), 'ratios ' + h.map(x => (x.dmg / base).toFixed(4)).join(', '));
  ok(h.slice(1).every(x => x.fromX != null && x.fromY != null) && h[1].fromX === es[0].x, 'hop events carry the previous enemy position');
  ok(near(FX.hopReduction(D.thunderbolt), 0.33) && near(FX.hopReduction(D.hex), 0.33) && FX.hopReduction(D.ember) === 0, 'the reduction is declared by the chainDamageFalloff entry');
  console.log('1 chain math: Thunderbolt hits 5 along a line, ratios ' + h.map(x => (x.dmg / base).toFixed(4)).join(' ')); }

// 2. revisits: A B C A; two enemies ping-pong; one enemy does not hop; none in range stops early; fresh enemies first (S15)
{ const A = mk(100, 0), B = mk(190, 0), C = mk(130, 100), o = mkO([['thunderbolt']]);
  const seq = h => h.map(x => x.enemyId);
  let h = hits(run(o, [A, B, C], 0.05, { each: once(o) }));
  ok(seq(h).slice(0, 4).join() === [A.id, B.id, C.id, A.id].join(), 'A, B, C, then back to A (' + seq(h) + ')');
  const P = mk(100, 0), Q = mk(200, 0), o2 = mkO([['thunderbolt']]); h = hits(run(o2, [P, Q], 0.05, { each: once(o2) }));
  ok(seq(h).join() === [P.id, Q.id, P.id, Q.id, P.id].join(), 'two enemies ping-pong for all 4 hops');
  const L = mk(100, 0), o3 = mkO([['thunderbolt']]); h = hits(run(o3, [L], 0.05, { each: once(o3) }));
  ok(h.length === 1, 'one enemy: no hop (the previous enemy is excluded)');
  const F = mk(100, 0), Far = mk(300, 0), o4 = mkO([['thunderbolt']]); h = hits(run(o4, [F, Far], 0.05, { each: once(o4) }));
  ok(h.length === 1, 'nothing within hopRange: the chain stops early');
  const X = mk(100, 0), Y = mk(200, 0), Z = mk(300, 0), o5 = mkO([['thunderbolt']]); h = hits(run(o5, [X, Y, Z], 0.05, { each: once(o5) }));
  ok(seq(h).join() === [X.id, Y.id, Z.id, Y.id, X.id].join(), 'fresh first, then revisits: X Y Z Y X (' + seq(h) + ')');
  const K = mk(100, 0), J = mk(200, 0), o6 = mkO([['thunderbolt']]); K.hp = 1; h = hits(run(o6, [K, J], 0.05, { each: once(o6) }));
  ok(K.dead && h.length === 2 && h[1].enemyId === J.id, 'a kill still passes the chain on (from the fallen enemy, never back to it)');
  console.log('2 revisits: A B C A; ping-pong for 4 hops; one enemy no hop; out of range stops; fresh first'); }

// 3. per-hop rolls: paralysis 10, 5, 2.5, 1.25, 0.625 % over 10,000 seeded casts; crit rolls at full chance on every hop
{ const N = 10000, par = [0, 0, 0, 0, 0], crit = [0, 0, 0, 0, 0], rr = seeded(77), apply = St.apply;
  let cur = null; St.apply = (e, k, ...a) => { if (k === 'paralysis') par[cur.indexOf(e)]++; return apply(e, k, ...a); };
  const o = mkO([['thunderbolt']], { critChance: 0.5 });
  for (let i = 0; i < N; i++) {
    cur = line(); enemies = cur; Sim.clear(); Sim.setRng(rr); o.slots[0][0].t = 0;
    const tape = G.SimBus.record(); Sim.tick(1 / 60, o, i); G.SimBus.stopRecording();
    hits(tape).forEach(x => { if (x.crit) crit[x.hop]++; });
  }
  St.apply = apply;
  const want = [10, 5, 2.5, 1.25, 0.625];
  ok(par.every((k, i) => Math.abs(100 * k / N - want[i]) <= 1), 'paralysis per hop (%) ' + par.map(k => (100 * k / N).toFixed(2)).join(', '));
  ok(crit.every(k => Math.abs(k / N - 0.5) <= 0.02), 'crit per hop stays 50% (' + crit.map(k => (k / N).toFixed(3)).join(', ') + ')');
  console.log('3 per-hop rolls: paralysis ' + par.map(k => (100 * k / N).toFixed(2)).join('/') + ' %, crit ' + crit.map(k => (k / N).toFixed(3)).join('/')); }

// 4. Hex: POWER doubles on a major ailment (six count, confusion and trap do not), per hop, the reduction last
{ const AIL = { paralysis: e => { e.stMajor = { k: 'paralysis', t: 99, age: 0 }; }, freeze: e => { e.stMajor = { k: 'freeze', t: 99, age: 0 }; },
    sleep: e => { e.stMajor = { k: 'sleep', t: 99, age: 0 }; }, burn: e => { e.burn = 1; }, poison: e => { e.poison = 1; }, toxic: e => { e.poison = 2; } };
  const plain = hitWith('hex', mk()).dmg, dbl = hitWith(Object.assign({}, D.hex, { basePower: 130, payload: [{ t: 'damage' }] }), mk()).dmg;
  for (const k in AIL) { const e = mk(); AIL[k](e); ok(near(hitWith('hex', e).dmg, dbl), 'Hex on ' + k + ' equals a 130-power hit'); }
  const c = mk(); St.apply(c, 'confusion', 1, 1, 5); const t = mk(); t.stTrap = { t: 5 };
  ok(near(hitWith('hex', c).dmg, plain) && near(hitWith('hex', t).dmg, plain), 'confusion and trap do not double');
  ok(dbl / plain > 1.5 && Math.abs(dbl / plain - 2) > 0.01, 'doubled inside the power term, not a final x2 (ratio ' + (dbl / plain).toFixed(4) + ')');
  const A = mk(100, 0), B = mk(200, 0); AIL.burn(B); const o = mkO([['hex']]); const h = hits(run(o, [A, B], 0.5, { each: once(o) }));
  ok(h.length === 2 && h[0].enemyId === A.id && near(h[0].dmg, plain) && h[1].enemyId === B.id && near(h[1].dmg, dbl * 0.67), 'Hex: clean first target, burned hop 1 = doubled x 0.67 (' + h.map(x => x.dmg.toFixed(3)) + ')');
  const A2 = mk(100, 0), B2 = mk(200, 0); AIL.sleep(A2); const o2 = mkO([['hex']]); const h2 = hits(run(o2, [A2, B2], 0.5, { each: once(o2) }));
  ok(near(h2[0].dmg, dbl) && near(h2[1].dmg, plain * 0.67), 'checked per hop target: asleep first doubles, clean hop does not');
  console.log('4 Hex: x' + (dbl / plain).toFixed(4) + ' on the six major ailments (power term), per hop, reduction last'); }

// 5. Thunderbolt overlap: both enemies in the strike circle take it, only the target starts the chain
{ const T = mk(100, 0), U = mk(108, 0), o = mkO([['thunderbolt']]); const h = hits(run(o, [T, U], 0.05, { each: once(o) }));
  const h0 = h.filter(x => x.hop === 0), hop = h.filter(x => x.hop > 0);
  ok(h0.length === 2 && h0.some(x => x.enemyId === T.id) && h0.some(x => x.enemyId === U.id), 'both take the strike');
  ok(hop.length === 4 && hop[0].fromX === T.x && hop[0].enemyId === U.id, 'one chain of 4 hops, from the target');
  console.log('5 overlap: 2 strike hits, one chain of ' + hop.length + ' from the target'); }

// 6. flat damage: Dragon Rage is exactly 40 whatever the multipliers; enemy shield absorbs; floor 1; levelDamage = level
{ const big = mkO([[]], { stgTeam: { atk: [{ n: 6, t: 99 }] }, critChance: 1, atk: 999, spa: 999, level: 90, typeBoost: 'dragon', expertBelt: true, stoneType: 'dragon', stabFor: () => true });
  wmul = 2; const r1 = hitWith('dragon-rage', mk(), big, () => 0); wmul = 1;
  ok(r1.dmg === 40 && !r1.crit, 'Dragon Rage is 40 with +6 Attack, STAB, a sure crit, weather x2 and items (' + r1.dmg + ')');
  const sh = mk(); sh.shield = 30; const hp0 = sh.hp, r2 = hitWith('dragon-rage', sh); ok(r2.dealt === 40 && (sh.shield || 0) === 0 && hp0 - sh.hp === 10, 'an enemy shield takes it first (dealt ' + r2.dealt + ')');
  syn('syn-flat', { category: 'special', type: 'dragon', payload: [{ t: 'special', handler: 'fixedDamage', amount: 0.2 }] });
  ok(hitWith('syn-flat', mk()).dmg === 1, 'floor 1');
  syn('syn-level', { category: 'special', type: 'ghost', payload: [{ t: 'special', handler: 'levelDamage' }] });
  const lv = mkO([[]], { level: 37, stgTeam: { spa: [{ n: 6, t: 99 }] }, critChance: 1, stabFor: () => true }); wmul = 2;
  ok(hitWith('syn-level', mk(), lv, () => 0).dmg === 37, 'levelDamage equals the owner level (37) and ignores the same multipliers'); wmul = 1;
  const dr = mkO([['dragon-rage']]), h = hits(run(dr, [mk(100, 0), mk(200, 0)], 0.6, { each: once(dr) }));
  ok(h.length === 2 && h.every(x => x.dmg === 40), 'cast through the sim: the beam pierces and deals 40 to each');
  const killer = mk(); killer.hp = 30; hitWith('dragon-rage', killer); ok(killer.dead, 'flat damage still kills through Enemy.hurt');
  console.log('6 flat damage: Dragon Rage 40 flat, shield first, floor 1, levelDamage 37'); }

// 7. setWeather through a synthetic shapeless move
{ syn('syn-snow', { delivery: { anchor: 'self', targeting: 'none', motion: 'static' }, cd: 5, payload: [{ t: 'special', handler: 'setWeather', weather: 'snow', duration: 10 }] });
  forced.length = 0; const o = mkO([['syn-snow']]); run(o, [], 0.05, { each: once(o) });
  ok(forced.length === 1 && forced[0][0] === 'snow' && forced[0][1] === 10, 'casting forces snow for 10 s (' + JSON.stringify(forced) + ')');
  console.log('7 setWeather: G.Weather.force(snow, 10) on cast'); }

// 8. Substitute (real Player hurt): pay 25, shield 50, refill 50/s, 4 s, spill, no reaction on a full absorb, DoT drains, skip rules, cooldown frozen
{ const p = mkP([['substitute']]); const tape = run(p, [], 1 / 60, { each: () => {} });
  ok(casts(tape).length === 1 && p.hp === 75 && p.shield && p.shield.v === 50 && p.shield.max === 50 && p.shield.regen === 50 && p.shield.t <= 4 && p.shield.t > 3.9,
    'cast pays 25 and raises a 50 shield, regen 50/s, 4 s (hp ' + p.hp + ', shield ' + (p.shield && p.shield.v) + ')');
  sfx = kicks = 0; p.hurt(30);
  ok(p.hp === 75 && p.shield.v === 20 && p.invuln === 0 && p.flash === 0 && sfx === 0 && kicks === 0, 'a fully absorbed hit: no HP loss, no invulnerability, flash, sound or kick');
  p.tickShield(1); ok(p.shield.v === 50, 'regen refills the shield to 50 in a second');
  p.statusDot('burn', 10); ok(p.hp === 75 && p.shield.v === 40, 'DoT drains the shield first');
  p.tickShield(1); p.hurt(80);
  ok(p.hp === 45 && !p.shield && p.invuln > 0 && sfx === 1 && kicks === 1, 'a bigger hit breaks it and spills 30 to HP with the normal reaction (hp ' + p.hp + ')');
  const q = mkP(); q.hp = 25; ok(!FX.canCast(D.substitute, q), 'skipped at HP 25 (the cost)'); q.hp = 25.5; ok(FX.canCast(D.substitute, q), 'allowed above the cost');
  q.shield = { v: 1, max: 1, regen: 0, t: 1, overflow: true }; ok(!FX.canCast(D.substitute, q), 'skipped while a shield is live');
  const r = mkP(); r.payHp(1000); ok(r.hp === 1, 'recoil never takes HP below 1');
  // the cooldown waits for the shield: cast, 4 s of shield, then 12 s (cdMul applies). Each cast shows as an HP drop of 25% of max HP.
  const castFrames = (mut, cdMul = 1, secs = 17.5) => { const w = mkP([['substitute']], { cdMul, maxHp: 1000, hp: 1000 }), out = [];
    let last = w.hp; run(w, [], secs, { each: (k, t) => { if (w.hp < last - 100) out.push(t); last = w.hp; if (mut) mut(w, t); } }); return { out, w }; };
  const ex = castFrames(), dt = 1 / 60;
  ok(ex.out.length === 2 && near(ex.out[0], dt, 1e-6) && Math.abs(ex.out[1] - ex.out[0] - 16) <= 3 * dt, 'expiry: next cast 4 + 12 = 16 s later (' + ex.out.map(t => t.toFixed(3)) + ')');
  const br = castFrames((w, t) => { if (Math.abs(t - 1) < 1e-6) { w.invuln = 0; w.hurt(600); } });
  ok(br.out.length === 2 && Math.abs(br.out[1] - br.out[0] - 13) <= 3 * dt, 'break at 1 s: armed then, next cast 1 + 12 = 13 s later (' + br.out.map(t => t.toFixed(3)) + ')');
  const half = castFrames(null, 0.5, 11);
  ok(half.out.length === 2 && Math.abs(half.out[1] - half.out[0] - 10) <= 3 * dt, 'cdMul 0.5 applies to the 12 s: 4 + 6 = 10 s (' + half.out.map(t => t.toFixed(3)) + ')');
  const sw = mkP([['substitute']]); run(sw, [], 0.5); const tLeft = sw.slots[0][0].t; Sim.clear(sw);
  ok(!sw.shield && near(sw.slots[0][0].t, 12) && tLeft > 11.99, 'swap-out (clear) ends the shield and arms the 12 s then (' + sw.slots[0][0].t + ')');
  const fa = mkP([['substitute']]); run(fa, [], 0.5); fa.hp = 1; fa.shield.v = 0.5; fa.hurt(50); run(fa, [], 1 / 60, { reset: false });
  ok(fa.dead && !fa.shield && near(fa.slots[0][0].t, 12) && Sim.commits(fa).length === 0, 'faint ends the shield and the freeze (armed at 12)');
  console.log('8 Substitute: pay 25, shield 50, refill 50/s, 4 s, spill, quiet full absorb, DoT drains, skip rules, cooldown 16/13/10 s'); }

// 9. heal over time: Aqua Ring 6.25% max HP per second for 8 s, clamped; a recast refreshes; swap-out ends it
{ const p = mkP([['aqua-ring']], { maxHp: 160, hp: 10 }), healed = []; const h0 = p.heal; p.heal = function (a) { healed.push(a); return h0.call(this, a); };
  run(p, [], 8.5, { each: once(p) });
  ok(healed.length === 8 && healed.every(a => near(a, 10)) && p.hp === 90, '8 heals of 10 (6.25% of 160) in 8 s (' + healed.length + ', hp ' + p.hp + ')');
  const c = mkP([['aqua-ring']], { maxHp: 160, hp: 150 }); run(c, [], 3.5, { each: once(c) }); ok(c.hp === 160, 'clamped at max HP');
  const r = mkP([['aqua-ring']], { maxHp: 160, hp: 1 }), rh = []; const r0 = r.heal; r.heal = function (a) { rh.push(+(this === r) && 1); return r0.call(this, a); };
  run(r, [], 12.5, { each: (k, t) => { if (Math.abs(t - 4) < 1e-6) r.slots[0][0].t = 0; else if (r.slots[0][0].t < 50 && t > 0.1 && Math.abs(t - 4) > 0.05) r.slots[0][0].t = 99; } });
  ok(rh.length === 12, 'a recast at 4 s refreshes to 8 s left without doubling: 12 heals by 12 s (' + rh.length + ')');
  const s = mkP([['aqua-ring']], { maxHp: 160, hp: 1 }), sh = []; const s0 = s.heal; s.heal = function (a) { sh.push(a); return s0.call(this, a); };
  run(s, [], 2.5, { each: once(s) }); Sim.clear(s); run(s, [], 3, { reset: false });
  ok(sh.length === 2, 'swap-out ends it (2 heals, then none)');
  console.log('9 heal over time: 8 x 6.25% in 8 s, clamp, refresh not stack, swap-out ends it'); }

// 10. stat buffs: per Pokemon caps (S4), three Pokemon reach +6, Dragon Dance both stats, individual scope, team grace renewal
{ const team = {}, a = mkO([['swords-dance']], { stgTeam: team }), b = mkO([['swords-dance']], { stgTeam: team }), c = mkO([['swords-dance']], { stgTeam: team }), d4 = mkO([['swords-dance']], { stgTeam: team });
  const cast = o => { enemies = []; Sim.setRng(() => 0.99); o.slots[0][0].t = 0; Sim.tick(1 / 60, o, 0); };
  cast(a); cast(a); ok(S.teamSum(team, 'atk') === 2 && team.atk.length === 1, 'one Pokemon casting twice stays +2');
  cast(b); cast(c); ok(S.stage(a, 'atk') === 6 && team.atk.length === 3, 'three Pokemon each casting once give +6');
  cast(d4); ok(S.stage(a, 'atk') === 6, 'a fourth stays +6 (clamp)');
  const dd = mkO([['dragon-dance']]); cast(dd); ok(S.stage(dd, 'atk') === 1 && S.stage(dd, 'spe') === 1, 'Dragon Dance raises Attack and Speed');
  syn('syn-ind', { delivery: { anchor: 'self', targeting: 'self', motion: 'static' }, cd: 8, payload: [{ t: 'stat', stat: 'def', stages: 1, side: 'self', scope: 'individual', duration: 8, maxStacks: 1 }] });
  const ia = mkO([['syn-ind']]), ib = { stgTeam: ia.stgTeam, stg: null }; cast(ia); ok(S.stage(ia, 'def') === 1 && S.stage(ib, 'def') === 0 && !ia.stgTeam.def, 'individual scope: the owner only');
  const g = mkO([['swords-dance']]); cast(g); S.teamTick(g.stgTeam, 8 - 0.05); cast(g); ok(g.stgTeam.atk.length === 1 && near(g.stgTeam.atk[0].t, 8), 'a recast in the grace window renews (one application)');
  ok(FX.srcOf(D['swords-dance'], a) !== FX.srcOf(D['swords-dance'], b) && FX.srcOf(D['swords-dance'], a) === FX.srcOf(D['swords-dance'], a), 'the source tag is move plus Pokemon, stable');
  const m2 = mkO(); for (let i = 0; i < 50; i++) hitWith('metal-claw', mk(), m2, () => 0); ok(S.teamSum(m2.stgTeam, 'atk') === 1, 'Metal Claw cap 1 (Q14, slice 4c-0; was 2 through 4b)');
  const leg = mk(); S.add(leg, 'atk', 1, 6); S.add(leg, 'atk', 1, 6); ok(S.stage(leg, 'atk') === 2 && leg.stg.atk.every(x => x.src === undefined), 'legacy add (no src) unchanged');
  console.log('10 stat buffs: +2 per Pokemon, +6 for three, Dragon Dance both, individual owner-only, grace renewal'); }

// 14. commitment cooldown: Flamethrower freeze(all), id = substitute only, untilEffectEnd (8), seconds, cdMul, none = normal ticking
{ const dt = 1 / 60, ft = D.flamethrower;
  const ftCasts = (cdMul = 1, secs = 4.6) => { const o = mkO([['flamethrower'], ['tackle']], { cdMul }); o.slots[1][0].t = 0.4; const tk = [];
    const tape = run(o, [mk(100, 0)], secs, { each: () => tk.push(o.slots[1][0].t) }); return { at: casts(tape, 'flamethrower').map(c => c), o, tk, tape }; };
  const r = ftCasts();
  // a cast is the frame the slot timer jumps up to the cooldown (a freeze holds it there; its release re-arms it without a jump)
  const castTimes = (cdMul, secs) => { const o = mkO([['flamethrower']], { cdMul }), at = []; let prev = 0;
    run(o, [mk(100, 0)], secs, { each: (k, t) => { if (o.slots[0][0].t > prev + 0.3) at.push(t); prev = o.slots[0][0].t; } }); return at; };
  const times = castTimes(1, 4.6);
  ok(times.length === 3 && Math.abs(times[1] - times[0] - (1 + ft.cd)) <= 3 * dt && Math.abs(times[2] - times[1] - (1 + ft.cd)) <= 3 * dt, 'Flamethrower cycle = 1.0 s cone + 1.167 s (' + times.map(t => t.toFixed(3)) + ')');
  ok(near(r.tk[30], 0.4) && near(r.tk[55], 0.4) && r.tk[70] < 0.4, 'freeze(all): an inactive slot does not recharge during the cone, then resumes (' + [r.tk[30], r.tk[55], r.tk[70]].map(v => v.toFixed(3)) + ')');
  const half = castTimes(0.5, 3.5);
  ok(half.length >= 2 && Math.abs(half[1] - half[0] - (1 + ft.cd * 0.5)) <= 3 * dt, 'the released timer uses cdMul (' + half.map(t => t.toFixed(3)) + ')');
  const s = mkP([['substitute'], ['tackle']]); s.slots[1][0].t = 1; run(s, [], 0.5);
  ok(near(s.slots[1][0].t, 0.5, 1e-6) && s.slots[0][0].t === 12, 'freeze id = substitute: only Substitute holds, Tackle keeps recharging');
  syn('syn-sec', { delivery: { anchor: 'self', targeting: 'self', motion: 'static' }, cd: 3, casterState: { commitment: { cooldown: { type: 'freeze', t: 0.5 } } },
    payload: [{ t: 'stat', stat: 'def', stages: 1, side: 'self', scope: 'team', duration: 1 }] });
  const sc = mkO([['syn-sec'], ['tackle']]); sc.slots[1][0].t = 2; const tk = []; run(sc, [], 1, { each: () => tk.push(sc.slots[1][0].t) });
  ok(near(tk[20], 2) && near(tk[59], 2 - 30 * dt, 1e-6), 't = 0.5 s: other timers hold for 0.5 s, then run (' + [tk[20], tk[59]].map(v => v.toFixed(3)) + ')');
  const bonded = mkO([['flamethrower', 'tackle']]), btk = []; const btape = run(bonded, [mk(30, 0)], 1.3, { each: () => btk.push(bonded.slots[0][1].t) });
  ok(casts(btape, 'tackle').length === 1 && near(btk[30], 0.5) && near(btk[58], 0.5), 'bonded: Tackle fires with Flamethrower, then its timer holds during the cone (' + [btk[30], btk[58]].map(v => v.toFixed(3)) + ')');
  const plain = mkO([['tackle'], ['ember']]); plain.slots[1][0].t = 1; run(plain, [], 0.5); ok(near(plain.slots[1][0].t, 0.5, 1e-6), 'no commitment: normal ticking');
  console.log('14 commitment cooldown: Flamethrower ' + times.map(t => t.toFixed(2)).join(' / ') + ' s, freeze(all) holds other slots, substitute only, seconds, cdMul'); }

// 15. commitment movement: slowed -2 Speed quietly for the cone, adds with Agility, clamps, cleared on swap and death; rooted; bonded slows add
{ const p = mkP([['flamethrower']]); texts.length = 0; const st = []; run(p, [mk(100, 0)], 1.2, { each: (k, t) => st.push(S.stage(p, 'spe')) });
  ok(st[5] === -2 && near(S.speedMul(p), 1) && st[58] === -2 && st[65] === 0, 'Flamethrower: Speed -2 during the 1.0 s cone, gone after (' + [st[5], st[58], st[65]] + ')');
  ok(!texts.some(t => /Speed/.test(t)), 'no stage text for the commitment slow');
  const q = mkP([['flamethrower']]); q.stgTeam.spe = [{ n: 2, t: 99 }]; run(q, [mk(100, 0)], 0.1); ok(S.stage(q, 'spe') === 0, 'adds with Agility +2 (cancels)');
  const sp = mkP([['flamethrower']]); run(sp, [mk(100, 0)], 0.1); ok(near(sp.spd, 100 * 4 / 6), 'move speed x0.667 while it fires (' + sp.spd.toFixed(2) + ')');
  const c6 = mkP([['flamethrower']]); S.add(c6, 'spe', -6, 99); run(c6, [mk(100, 0)], 0.1); ok(S.stage(c6, 'spe') === -6, 'clamps at -6');
  const w = mkP([['flamethrower']]); run(w, [mk(100, 0)], 0.2); Sim.clear(w); ok(S.stage(w, 'spe') === 0 && Sim.commits(w).length === 0, 'cleared on swap');
  const dd = mkP([['flamethrower']]); run(dd, [mk(100, 0)], 0.2); dd.hp = 1; dd.hurt(50); run(dd, [mk(100, 0)], 1 / 60, { reset: false }); ok(S.stage(dd, 'spe') === 0 && !dd.mvRoot && Sim.commits(dd).length === 0, 'cleared on death');
  syn('syn-root', { delivery: { anchor: 'self', targeting: 'self', motion: 'static' }, cd: 9, casterState: { commitment: { movement: { type: 'rooted', t: 0.5 } } },
    payload: [{ t: 'stat', stat: 'def', stages: 1, side: 'self', scope: 'team', duration: 1 }] });
  const rt = mkP([['syn-root']]), sp2 = []; run(rt, [], 1, { each: () => sp2.push(rt.spd) });
  ok(sp2[10] === 0 && sp2[28] === 0 && sp2[32] === 100 && sp2[50] === 100, 'rooted: speed 0 for 0.5 s and not longer (' + [sp2[10], sp2[28], sp2[32]] + ')');
  const rs = mkP([['syn-root']]); run(rs, [], 0.2); const was = rs.spd; Sim.clear(rs); ok(was === 0 && rs.spd === 100, 'the root is cleared on swap');
  syn('syn-slow3', { delivery: { anchor: 'self', targeting: 'self', motion: 'static' }, cd: 1, casterState: { commitment: { movement: { type: 'slowed', t: 3 } } },
    payload: [{ t: 'stat', stat: 'def', stages: 1, side: 'self', scope: 'team', duration: 1 }] });
  const ps = mkP([['syn-slow3']]), pst = []; run(ps, [], 2.5, { each: () => pst.push(S.stage(ps, 'spe')) });
  ok(pst[30] === -2 && pst[90] === -2 && pst[140] === -2, 'a recast of a slow refreshes it (per source), never -4 (' + [pst[30], pst[90], pst[140]] + ')');
  syn('syn-slow2', { category: 'special', type: 'fire', basePower: 10, space: { shape: 'radial', radArc: 0.5, radRadius: 120, pierce: Infinity, count: 1, spread: 0 }, rehit: 0.2, hitPolicy: 'interval',
    delivery: { anchor: 'caster', targeting: 'nearest', motion: 'static', endOn: [{ time: 1 }], range: 420 }, cd: 1, casterState: { commitment: { movement: { type: 'slowed' } } }, payload: [{ t: 'damage' }] });
  const bd = mkP([['flamethrower', 'syn-slow2']]); run(bd, [mk(100, 0)], 0.1); ok(S.stage(bd, 'spe') === -4 && near(bd.spd, 50), 'two bonded slowed moves: Speed -4, x0.5 (' + S.stage(bd, 'spe') + ')');
  console.log('15 commitment movement: slow -2 quiet for the cone, Agility cancels, -6 clamp, swap and death clear, root 0.5 s, bonded -4'); }

// 11. regression bits: determinism of a chain tape at dt 1/60 and 1/30, flat/self-cast data as approved
{ const tapeOf = dt => { const es = line(), o = mkO([['thunderbolt']], { critChance: 0.3 }); return hits(run(o, es, 0.05, { dt, rng: seeded(3), each: once(o) })).map(x => [x.hop, x.crit, +x.dmg.toFixed(6)]); };
  ok(JSON.stringify(tapeOf(1 / 60)) === JSON.stringify(tapeOf(1 / 60)), 'same seed, identical chain tape');
  ok(JSON.stringify(tapeOf(1 / 60)) === JSON.stringify(tapeOf(1 / 30)), 'same tape at dt 1/60 and 1/30');
  ok(['swords-dance', 'dragon-dance', 'harden', 'agility'].every(id => D[id].payload.every(f => f.maxStacks === 1)), 'maxStacks 1 on the four buffs');
  ok(D.substitute.cd === 12 && D.substitute.payload[1].duration === 4 && D.substitute.casterState.commitment.cooldown.t === 'untilEffectEnd', 'Substitute data: cd 12, 4 s, freeze until effect end');
  ok(D.flamethrower.casterState.commitment.movement.type === 'slowed' && D.flamethrower.casterState.commitment.cooldown.type === 'freeze' && D.flamethrower.rehit === 0.2, 'Flamethrower data: slowed and freeze, rehit 0.2');
  ok(!(D.hail.handlers[0].stub) && D['bug-bite'].handlers[0].stub, 'handlers implemented except berrySteal');
  console.log('11 regression: deterministic chain tapes, approved data'); }

console.log(fail ? '\nmove-selfcast harness: ' + fail + ' FAILED of ' + n : '\nmove-selfcast harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
