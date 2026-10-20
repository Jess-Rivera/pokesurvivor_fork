// Status rework slice D2 (flinch), offline checks (Node only). Usage from the repo root:  node docs/proposals/status-sliceD2-harness.js .
// Loads the REAL stats.js, enemies.js, moves.js, status.js, stages.js, enemy.js and combat.js with stubbed engine globals and checks: the flinch
// data, the proc roll (chance, one roll per 0.5 s), the lost action per unit kind (wild melee, ranged, charger, boss cast), the recoil (half a sprite
// radius back at 2.0x speed, then 0.2 to 0.3 s still), no immunity and no window, and that frozen / dead / remote units cannot flinch.
// Rendering, input and the live game loop are NOT covered (no browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
const DEX_BY = { 1: { name: 'Normie', types: ['normal'], stats: [50, 50, 50, 50, 50, 65] } };
global.window = global; global.location = { search: '?dev' };
let seed = 4242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; Math.random = rnd;
const texts = [];
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => a + (b - a) * rnd(), pickN: a => a,
    norm: (x, y) => { const n = Math.hypot(x, y) || 1; return [x / n, y / n]; }, dist: (a, b, c, d) => Math.hypot(a - c, b - d), dist2: (a, b, c, d) => (a - c) * (a - c) + (b - d) * (b - d), hash: () => 0.5, pick: a => a[0] },
  DEX_BY, DEX: [], FX: { dmgText: (x, y, m) => texts.push(m), spark() {}, ring() {}, burst() {}, sp() {} },
  Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, dirFromAngle: () => 0 } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
['js/core/stats.js', 'js/data/enemies.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/systems/combat.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
const Enemy = G.Enemy; Enemy.prototype.die = function () { this.dead = true; };
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const mk = (behavior = 'plain') => { const e = new Enemy({ dex: 1, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior }, 0, 0, { t: 0, dmg: 1, hp: 1, spd: 1 }, false); e.maxHp = 1e6; e.hp = 1e6; return e; };

// 1. data
{ const want = { 'rock-slide': 30, bite: 30, 'dark-pulse': 20 }, got = {};
  for (const m of G.Moves.LIST || Object.values(G.Moves.BY_ID)) if (m.flinch > 0) got[m.id] = m.flinch;
  if (JSON.stringify(Object.entries(got).sort()) !== JSON.stringify(Object.entries(want).sort())) bad('flinch moves ' + JSON.stringify(got));
  console.log('1 data: flinch moves in the catalogue ' + JSON.stringify(got)); }

// 2. proc roll: chance, one roll per 0.5 s per move per target
{ const rate = (id, n = 20000) => { let k = 0; for (let i = 0; i < n; i++) { const e = mk(); e.applyFlinch = () => { k++; return true; }; G.Combat.procFlinch(e, G.Moves.instance(id)); } return k / n; };
  const rb = rate('bite'), rd = rate('dark-pulse'), rr = rate('rock-slide');
  if (Math.abs(rb - 0.3) > 0.012 || Math.abs(rr - 0.3) > 0.012 || Math.abs(rd - 0.2) > 0.012) bad('flinch rates ' + [rb, rd, rr]);
  const e = mk(); let k = 0; e.applyFlinch = () => { k++; return true; }; const m = G.Moves.instance('bite'); m.flinch = 100;
  for (let i = 0; i < 10; i++) G.Combat.procFlinch(e, m); if (k !== 1) bad('a burst of hits is ONE roll: ' + k);
  G.Stages.tick(e, 0.51); G.Combat.procFlinch(e, m); if (k !== 2) bad('the roll gap is 0.5 s: ' + k);
  const none = mk(); none.applyFlinch = () => { k = 99; }; G.Combat.procFlinch(none, G.Moves.instance('tackle')); if (k === 99) bad('a move without flinch must not roll');
  console.log('2 rolls: Bite ' + rb.toFixed(3) + ', Dark Pulse ' + rd.toFixed(3) + ', Rock Slide ' + rr.toFixed(3) + ' per roll; one roll per 0.5 s per move per target'); }

// 3. the lost action, per unit kind
{ const w = mk(); w.touchCd = 0; w.fsp = 0; if (!w.applyFlinch() || w.touchCd !== 0.55 || !w.stFl || w.stFl.ph !== 'hold') bad('wild melee: contact timer restarts, a stationary unit only freezes');
  const r = mk('ranged'); r.shotCd = 0.2; r.def.shotCd = 3; r.applyFlinch(); if (r.keepsDistance() && r.shotCd !== 3) bad('ranged: shot timer restarts at its full period ' + r.shotCd);
  const c = mk('charger'); c.phase = 'aim'; c.pt = 0.1; c.applyFlinch(); if (c.phase !== 'walk' || !near(c.pt, 1.1)) bad('charger aim is cancelled');
  c.phase = 'dash'; c.pt = 0.2; c.applyFlinch(); if (c.phase !== 'walk') bad('charger dash is cancelled');
  const b = mk(); b.boss = true; b.ai = { cast: { id: 'slam', t: 0.3, wind: 0.8, after: 0.35 }, cd: 0, fury: false }; b.applyFlinch(); if (b.ai.cast !== null || b.ai.cd < 1.3 || b.ai.cd > 2.0) bad('boss cast cancelled, timer restarted: ' + JSON.stringify(b.ai));
  const b2 = mk(); b2.boss = true; b2.ai = { cast: null, cd: 0.1, fury: false }; b2.applyFlinch(); if (b2.ai.cd < 1.3) bad('boss between casts: next attack timer restarts');
  const dead = mk(); dead.dead = true; if (dead.applyFlinch()) bad('dead units do not flinch'); const rem = mk(); rem.remote = true; if (rem.applyFlinch()) bad('remote copies do not flinch (co-op deferred)');
  const fz = mk(); fz.applyStatus('freeze'); if (fz.applyFlinch()) bad('frozen units do not flinch'); const sl = mk(); sl.applyStatus('sleep'); if (sl.applyFlinch()) bad('sleeping units do not flinch');
  const el = mk(); el.elite = { hp: 10 }; el.fsp = 0; if (!el.applyFlinch()) bad('elites flinch (no immunity)'); const bb = mk(); bb.boss = true; bb.ai = { cast: null, cd: 0, fury: false }; if (!bb.applyFlinch()) bad('bosses flinch (no immunity)');
  let n = 0; const f = mk(); f.fsp = 0; for (let i = 0; i < 5; i++) { if (f.applyFlinch()) n++; } if (n !== 5) bad('no window: five flinches in a row all apply ' + n);
  console.log('3 lost action: wild melee contact timer, ranged shot timer, charger aim and dash, boss cast; no immunity, no window; dead, remote, frozen and asleep units cannot flinch'); }

// 4. recoil: half a sprite radius back at 2.0x speed, then 0.2 to 0.3 s still
{ const holds = []; let worstDist = 0;
  for (let t = 0; t < 400; t++) {
    const e = mk(); e.r = 20; e.fsp = 80; e.fdx = 0.6; e.fdy = 0.8; texts.length = 0; e.applyFlinch();
    const F = e.stFl; if (!F || F.ph !== 'back' || !near(F.dx, -0.6) || !near(F.dy, -0.8) || !near(F.sp, 160)) { bad('recoil setup ' + JSON.stringify(F)); break; }
    if (!near(F.t, 10 / 160)) bad('back time = (r/2) / (2 x speed) = ' + F.t);
    let x = 0, y = 0, tb = 0, th = 0, dt = 0.001, phase = 'back';
    for (let i = 0; i < 3000 && e.stFl; i++) { const ph = e.stFl.ph; const [vx, vy] = e.flinchMove(dt); x += vx * dt; y += vy * dt; if (ph === 'back') tb += dt; else { th += dt; if (vx || vy) bad('moving during the hold'); } }
    const d = Math.hypot(x, y); worstDist = Math.max(worstDist, Math.abs(d - 10)); holds.push(th);
    if (x > 0 || y > 0) bad('recoil must go BACK (opposite the heading): ' + x + ',' + y);
    if (!texts.includes('Flinched')) bad('popup');
  }
  const mn = Math.min(...holds), mx = Math.max(...holds); if (mn < 0.199 || mx > 0.302) bad('hold range ' + mn + ' .. ' + mx); if (worstDist > 0.5) bad('recoil distance off by ' + worstDist);
  const still = mk(); still.fsp = 0; still.applyFlinch(); if (!still.stFl || still.stFl.ph !== 'hold' || still.stFl.t < 0.2 || still.stFl.t > 0.3) bad('a stationary unit freezes 0.2 to 0.3 s without recoil: ' + JSON.stringify(still.stFl));
  console.log('4 recoil: ' + (10).toFixed(0) + ' px back (half a r of 20) at 160 px/s (2.0x of 80), then still ' + mn.toFixed(2) + ' to ' + mx.toFixed(2) + ' s; a stationary unit has no recoil but freezes the same 0.2 to 0.3 s'); }

// 5. real Enemy.update: records the heading, runs the recoil, ends it, and a freeze clears it
{ const pl = { level: 5, x: 3000, y: 0, hp: 100, r: 10, dead: false };
  const run = (e, secs, dt = 0.05) => { for (let i = 0; i < Math.round(secs / dt); i++) { e.update(dt, pl); } };
  const e = mk(); run(e, 0.2); e.stFl = { ph: 'hold', dx: 0, dy: 0, sp: 0, t: 0.25 }; run(e, 0.2); if (!e.stFl) bad('flinch hold ended too early through Enemy.update'); run(e, 0.2); if (e.stFl) bad('flinch hold did not end through Enemy.update');
  const z = mk(); z.stFl = { ph: 'back', dx: 1, dy: 0, sp: 100, t: 0.5 }; z.applyStatus('freeze'); run(z, 0.1); if (z.stFl) bad('a freeze clears the recoil');
  const src = fs.readFileSync(R + '/js/entities/enemy.js', 'utf8'); if (!/if \(this\.stFl\) \[vx, vy\] = this\.flinchMove\(dt\);/.test(src)) bad('movement does not read the recoil');
  // the contact timer does not run during the flinch, and runs normally after it
  const t = mk(); t.fsp = 0; t.applyFlinch(); const hold = t.stFl.t; run(t, hold - 0.06); if (!(t.stFl && near(t.touchCd, 0.55))) bad('the contact timer must not tick during the freeze: ' + t.touchCd + ' ' + !!t.stFl);
  run(t, 0.2); if (t.stFl) bad('flinch should be over'); if (t.touchCd > 0.55 || t.touchCd < 0.55 - 0.2 - 1e-6) bad('the contact timer starts after the freeze: ' + t.touchCd); run(t, 0.7); if (t.touchCd > 0) bad('the contact timer should finish ticking after the freeze');
  console.log('5 Enemy.update: the recoil runs and ends, a freeze clears it, and the contact timer waits out the flinch'); }

console.log(fail ? '\n' + fail + ' FAILED' : '\nALL PASS');
process.exit(fail ? 1 : 0);
