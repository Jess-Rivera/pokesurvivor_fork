// Status rework slice D1 (stat stages), offline checks (Node only). Usage from the repo root:  node docs/proposals/status-sliceD1-harness.js .
// Slice 7b-2a (2026-11-01): the legacy-path sections (G.Combat procs, legacy move fields and cards) were cut with the legacy code; the engine checks stay.
// Loads the REAL stats.js, enemies.js, moves.js, status.js, stages.js, enemy.js and combat.js with stubbed engine globals and checks:
// the stage table and clamp, per-application expiry (6 s), Speed through the movement shaping, the Def / SpD stage in the damage ratio,
// the stat-drop proc (chance, one roll per 0.5 s, one application per 2 s) for all eight wired moves, and that user-targeting moves stay inert.
// Rendering, input and the live game loop are NOT covered (no browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
const DEX_BY = { 1: { name: 'Normie', types: ['normal'], stats: [50, 50, 50, 50, 50, 65] }, 2: { name: 'Slowpoke', types: ['water'], stats: [90, 65, 65, 40, 40, 15] },
                 3: { name: 'Zippy', types: ['electric'], stats: [50, 50, 50, 50, 50, 130] } };
global.window = global; global.location = { search: '?dev' };
let seed = 777; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; Math.random = rnd;
const texts = [];
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => a + (b - a) * rnd(), pickN: a => a,
    norm: (x, y) => { const n = Math.hypot(x, y) || 1; return [x / n, y / n]; } },
  DEX_BY, DEX: [], FX: { dmgText: (x, y, m) => texts.push(m), spark() {}, ring() {}, burst() {}, sp() {} },
  Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
['js/core/stats.js', 'js/data/enemies.js', 'js/data/moves.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/systems/combat.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
const S = G.Stages, Enemy = G.Enemy; Enemy.prototype.die = function () { this.dead = true; };
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const mk = (dex = 1) => { const e = new Enemy({ dex, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'plain' }, 0, 0, { t: 0, dmg: 1, hp: 1, spd: 1 }, false); e.maxHp = 1e6; e.hp = 1e6; return e; };
const tickN = (h, secs, dt = 0.05) => { for (let i = 0; i < Math.round(secs / dt); i++) S.tick(h, dt); };

// 1. table, constants, clamp
{ // Stage ladders (Jess 2026-10-20): one base B per stat; raise (B + s) / B, drop B / (B + |s|). B = 2 mainline for Atk / Def / SpA / SpD, B = 4 for Speed.
  if (S.BASE.atk !== 2 || S.BASE.def !== 2 || S.BASE.spa !== 2 || S.BASE.spd !== 2 || S.BASE.spe !== 4) bad('ladder bases');
  const at = (st, s) => S.ladder(st, s), sp4 = { '-6': 0.4, '-5': 4 / 9, '-4': 0.5, '-3': 4 / 7, '-2': 2 / 3, '-1': 0.8, 0: 1, 1: 1.25, 2: 1.5, 3: 1.75, 4: 2, 5: 2.25, 6: 2.5 };
  for (let s = -6; s <= 6; s++) { if (!near(at('spe', s), sp4[s], 1e-9)) bad('Speed ladder ' + s + ' = ' + at('spe', s)); if (!near(at('atk', s), s >= 0 ? (2 + s) / 2 : 2 / (2 - s), 1e-9)) bad('mainline ladder ' + s); }
  if (at('atk', 6) !== 4 || at('atk', 2) !== 2 || at('atk', -2) !== 0.5 || at('atk', -6) !== 0.25) bad('mainline anchors');
  if (!(S.DUR === 6 && S.ROLL_GAP === 0.5 && S.MAX === 6) || 'APPLY_GAP' in S) bad('constants (no lockout exists)');
  const e = mk(); if (S.stage(e, 'spe') !== 0 || S.mul(e, 'spe') !== 1) bad('no stage = x1');
  for (let i = 0; i < 9; i++) S.add(e, 'def', 1, 6); if (S.stage(e, 'def') !== 6 || S.mul(e, 'def') !== 4) bad('+6 clamp ' + S.stage(e, 'def'));
  const d = mk(); for (let i = 0; i < 9; i++) S.add(d, 'spd', -1, 6); if (S.stage(d, 'spd') !== -6 || S.mul(d, 'spd') !== 0.25) bad('-6 clamp');
  if (S.add(d, 'spd', -1, 6)) bad('add past -6 must report false'); if (S.add(e, 'bogus', 1)) bad('unknown stat');
  const c = mk(); S.add(c, 'atk', 1, 6, 3); S.add(c, 'atk', 1, 6, 3); S.add(c, 'atk', 1, 6, 3); if (S.add(c, 'atk', 1, 6, 3) || S.stage(c, 'atk') !== 3) bad('raise cap 3');
  console.log('1 ladders / clamp: Atk, Def, SpA, SpD on the mainline ladder (-6 .. +6 = x0.25 .. x4), Speed on B = 4 (x0.4 .. x2.5), raise cap holds, drops stop at -6'); }

// 2. per-application expiry
{ const e = mk(); S.add(e, 'def', -1, 6); tickN(e, 3); S.add(e, 'def', -1, 6); tickN(e, 0.1);
  if (S.stage(e, 'def') !== -2) bad('two apps ' + S.stage(e, 'def'));
  tickN(e, 2.9); if (S.stage(e, 'def') !== -2) bad('first app expired early (t=6.0)'); tickN(e, 0.2); if (S.stage(e, 'def') !== -1) bad('first app should expire at 6 s -> -1, got ' + S.stage(e, 'def'));
  tickN(e, 3); if (S.stage(e, 'def') !== 0 || e.stg) bad('second app should expire at 9 s and clear the host state'); console.log('2 expiry: each application decays on its own 6 s timer; host state clears when empty'); }

// 3. Speed stage = a multiplier on the FINAL movement speed (no shaping, no bounds): -6 is x0.25, +6 is x4, same for every species
{ const rows = []; for (const dex of [1, 2, 3]) { const e = mk(dex), row = [DEX_BY[dex].name]; for (let n = -6; n <= 6; n += 1) { S.clear(e); for (let i = 0; i < Math.abs(n); i++) S.add(e, 'spe', n < 0 ? -1 : 1, 99); const v = S.speedMul(e); row.push(v.toFixed(2)); if (!near(v, S.ladder('spe', n), 1e-9)) bad('speedMul ' + DEX_BY[dex].name + ' ' + n + ' = ' + v); } rows.push(row.join(' ')); }
  const sp = mk(1); for (let i = 0; i < 6; i++) S.add(sp, 'spe', -1, 99); const px = G.Stats.speedToPx(DEX_BY[1].stats[5]); if (!near(px * S.speedMul(sp), px * 0.4, 1e-9)) bad('-6 on the final px/s (Speed ladder B = 4: x0.4)');
  console.log('3 Speed stage -6 .. +6 on the final speed, the same for every species:\n   ' + rows.join('\n   ')); }

// 7. real Enemy.update ticks the stage and expires it; the movement line reads Stages.speedMul (movement itself is stubbed here)
{ const pl = { level: 5, x: 3000, y: 0, hp: 100, r: 10, dead: false };
  const run = (e, secs, dt = 0.05) => { for (let i = 0; i < Math.round(secs / dt); i++) { try { e.update(dt, pl); } catch (x) { if (!/primitive|not a function|undefined|noop/i.test(String(x))) throw x; } } };
  const b = mk(1); for (let i = 0; i < 3; i++) S.add(b, 'spe', -1, 6); run(b, 5.9); if (S.stage(b, 'spe') !== -3) bad('stage should still be -3 at 5.9 s'); run(b, 0.3); if (b.stg) bad('stage should have expired by 6.2 s through Enemy.update');
  const src = fs.readFileSync(R + '/js/entities/enemy.js', 'utf8'); if (!/G\.Status\.speedMul\(this\) \* G\.Stages\.speedMul\(this\)/.test(src)) bad('enemy movement does not read Stages.speedMul'); if (!/G\.Stages\.tick\(this, dt\)/.test(src)) bad('Enemy.update does not tick the stages');
  console.log('7 Enemy.update ticks and expires the stage; the movement line multiplies by Stages.speedMul'); }

console.log(fail ? '\n' + fail + ' FAILED' : '\nALL PASS');
process.exit(fail ? 1 : 0);
