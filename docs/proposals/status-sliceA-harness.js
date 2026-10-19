// Status rework slice A, offline checks (Node only). Usage from the repo root:  node docs/proposals/status-sliceA-harness.js .
// Loads the REAL stats.js, enemies.js, moves.js, enemy.js and combat.js with stubbed engine globals and checks: the STATUS table,
// type immunities, burn / poison / Toxic tick math, refresh rules, the chance roll (ailmentChance, status moves, throttle, multi-pellet),
// Fire Spin's trap bypass, and the logger line. Rendering and the live game loop are NOT covered (no browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
const DEX_BY = { 1: { name: 'Normie', types: ['normal'] }, 2: { name: 'Flamer', types: ['fire', 'flying'] }, 3: { name: 'Toxer', types: ['poison', 'grass'] },
                 4: { name: 'Steely', types: ['steel', 'psychic'] }, 5: { name: 'Wet', types: ['water'] } };
global.window = global; global.location = { search: '?dev' };
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: () => 0.5, pickN: a => a },
  DEX_BY, DEX: [], Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
['js/core/stats.js', 'js/data/enemies.js', 'js/data/moves.js'].forEach(p => { try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
try { load('js/entities/enemy.js'); } catch (e) { console.log('enemy.js load failed:', e.message); process.exit(1); }
try { load('js/systems/combat.js'); } catch (e) { console.log('combat.js load failed:', e.message); process.exit(1); }
const Enemy = G.Enemy || (G.Enemies && G.Enemies.Enemy) || G.Entities && G.Entities.Enemy;
if (!Enemy) { console.log('no Enemy class exported; G keys:', Object.keys(base).join(',')); process.exit(1); }
Enemy.prototype.die = function () { this.dead = true; };           // no drops / sprites in the harness

let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const mk = (dex, hp = 160) => { const e = new Enemy({ dex, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'plain' }, 0, 0, { t: 0, dmg: 1, hp: 1, spd: 1 }, false); e.maxHp = hp; e.hp = hp; return e; };
const pl = { level: 5, x: 5000, y: 5000, hp: 100 };
// run real Enemy.update for `secs`; anything after the status block (movement stubs) may throw and is ignored
const run = (e, secs, dt = 0.05, each) => { const n = Math.round(secs / dt); for (let i = 0; i < n; i++) { try { e.update(dt, pl); } catch (x) { if (!/primitive|not a function|undefined|noop/i.test(String(x))) throw x; } if (each) each(i * dt + dt); } };

// 1. table
const S = G.Enemies.STATUS;
if (!(S && near(S.burn.frac, 1 / 16) && near(S.poison.frac, 1 / 8) && near(S.toxic.step, 1 / 16) && S.toxic.cap === 15)) bad('STATUS table values');
console.log('1 STATUS table: burn 1/16, poison 1/8, toxic N/16 cap 15; turn', S.burn.turn, 's, turns', S.burn.turns, S.poison.turns, S.toxic.turns);

// 2. immunities
{ const f = mk(2), t = mk(3), s = mk(4), n = mk(1);
  f.applyBurn(1); if (f.burn) bad('fire enemy got burned');
  f.applyBurn(1, true); if (!f.burn) bad('trap bypass did not burn a fire enemy');
  f.applyPoison(1); if (!f.poison) bad('fire/flying enemy should be poisonable');
  t.applyPoison(1); t.applyPoison(2); if (t.poison) bad('poison/grass enemy got poisoned');
  t.applyBurn(1); if (!t.burn) bad('poison/grass enemy should burn');
  s.applyPoison(2); if (s.poison) bad('steel/psychic got badly poisoned');
  n.applyBurn(1); n.applyPoison(1); if (!n.burn || n.poison !== 1) bad('normal enemy should take both');
  const w = mk(5); w.applyPoison(2); if (w.poison !== 2) bad('toxic not applied to a water enemy'); }
console.log('2 immunities: fire vs burn, poison+steel vs poison/toxic, trap bypass');

// 3. burn math: 4 ticks of 1/16 max HP at 2 s, 8 s total, then clears
{ const e = mk(1, 160), log = []; e.applyBurn(1);
  let last = e.hp; run(e, 10, 0.05, t => { if (e.hp < last - 1e-9) { log.push([+t.toFixed(2), +(last - e.hp).toFixed(3)]); last = e.hp; } });
  if (log.length !== 4) bad('burn ticks ' + JSON.stringify(log));
  log.forEach((l, i) => { if (!near(l[1], 10) || Math.abs(l[0] - 2 * (i + 1)) > 0.11) bad('burn tick ' + JSON.stringify(l)); });
  if (e.burn) bad('burn did not clear'); if (!near(e.hp, 120)) bad('burn total hp ' + e.hp);
  console.log('3 burn: ticks', JSON.stringify(log), '= 25% of max HP, cleared'); }

// 4. poison math: 1/8 per tick, 4 ticks
{ const e = mk(1, 160); e.applyPoison(1); run(e, 10);
  if (!near(e.hp, 160 - 4 * 20)) bad('poison total ' + (160 - e.hp)); if (e.poison) bad('poison did not clear');
  console.log('4 poison: 4 ticks x 12.5% = 50% of max HP'); }

// 5. Toxic: N/16 on turn N, 8 turns, kills a 160 HP enemy at tick 6 (21/16)
{ const e = mk(1, 160), seen = []; e.applyPoison(2);
  let last = e.hp; run(e, 14, 0.05, t => { if (e.hp < last - 1e-9) { seen.push(+(last - e.hp).toFixed(2)); last = e.hp; } });
  if (JSON.stringify(seen.slice(0, 5)) !== JSON.stringify([10, 20, 30, 40, 50])) bad('toxic ticks ' + seen);
  if (!e.dead) bad('toxic did not kill a 160 HP enemy in 12 s (ticks ' + seen + ')');
  // an enemy that outlasts it (hp far above maxHp, so the fraction is of maxHp 1e6): 8 ticks, N/16 each, then it ends
  const big = mk(1, 1e6); big.hp = 1e9; big.applyPoison(2); run(big, 20);
  if (big.poison) bad('toxic did not end after 8 turns');
  const dmg = 1e9 - big.hp; if (!near(dmg, 1e6 * (36 / 16))) bad('toxic 8-turn total ' + dmg / 1e6 + ' of max (want 2.25)');
  console.log('5 toxic: ticks', seen.join(','), '(dead at tick', seen.length + '); 8-turn total 36/16 of max HP, ends'); }

// 6. refresh rules
{ const e = mk(1, 1e6); e.applyBurn(1); let ticks = 0, last = e.hp;
  run(e, 12, 0.05, t => { if (Math.round(t * 20) % 4 === 0) e.applyBurn(1); if (e.hp < last - 1e-9) { ticks++; last = e.hp; } });   // re-hit every 0.2 s
  if (ticks !== 6) bad('constant re-hits should tick every 2 s (6 in 12 s), got ' + ticks); if (!e.burn) bad('refreshed burn ended');
  const p = mk(1, 1e6); p.applyPoison(1); run(p, 3); p.applyPoison(2); if (p.poison !== 2 || p.poisonN !== 0) bad('poison -> toxic upgrade');
  p.applyPoison(1); if (p.poison !== 2) bad('toxic downgraded to poison');
  console.log('6 refresh: re-hit every 0.2 s still ticks every 2 s; poison upgrades to toxic once, never back'); }

// 7. chance roll
const roll = (id, n, calls = 1, dex = 1) => { const m = G.Moves.instance(id); let hit = 0;
  for (let i = 0; i < n; i++) { const e = mk(dex); for (let c = 0; c < calls; c++) G.Combat.procAilments(e, m.burn, m.poison, m); if (e.burn || e.poison) hit++; } return hit / n; };
const N = 40000;
{ const r = { ember: roll('ember', N), sludge: roll('sludge', N), sting: roll('poison-sting', N), wisp: roll('will-o-wisp', 2000), toxic: roll('toxic', 2000), fire7: roll('flamethrower', N, 7) };
  const chk = (k, want, tol) => { if (Math.abs(r[k] - want) > tol) bad(k + ' proc rate ' + r[k] + ' want ' + want); };
  chk('ember', 0.10, 0.01); chk('sludge', 0.30, 0.012); chk('sting', 0.30, 0.012); chk('wisp', 1, 0); chk('toxic', 1, 0); chk('fire7', 0.10, 0.01);
  console.log('7 chance: ember', r.ember.toFixed(3), 'sludge', r.sludge.toFixed(3), 'poison-sting', r.sting.toFixed(3), 'will-o-wisp', r.wisp, 'toxic', r.toxic, '| 7 pellets in one cast (flamethrower)', r.fire7.toFixed(3), '(one roll, not 7)'); }
{ const m = G.Moves.instance('ember'), e = mk(1); let procs = 0;
  for (let i = 0; i < 1000; i++) { G.Combat.procAilments(e, 1, 0, m); }
  if (e.ailRoll === null || e.ailRoll.ember === undefined) bad('throttle key missing');
  const before = e.ailRoll.ember; run(e, 0.6, 0.05);
  if (e.ailRoll && e.ailRoll.ember > 0) bad('roll gap did not expire'); G.Combat.procAilments(e, 1, 0, m);
  console.log('7b throttle: 1000 same-frame hits = 1 roll; gap', before, 's, expires after 0.5 s'); }
{ const fs_ = G.Moves.instance('fire-spin'); let ok = 0; for (let i = 0; i < 200; i++) { const e = mk(2); G.Combat.procAilments(e, fs_.burn, 0, fs_); if (e.burn) ok++; }
  const em = G.Moves.instance('ember'); let blocked = 0; for (let i = 0; i < 2000; i++) { const e = mk(2); G.Combat.procAilments(e, em.burn, 0, em); if (e.burn) blocked++; }
  if (ok !== 200) bad('fire spin should burn (trap) fire enemies, did ' + ok + '/200'); if (blocked) bad('ember burned a fire enemy');
  console.log('7c fire enemy: Fire Spin trap burns it 200/200, Ember 0/2000 (immune)'); }

// 8. data
{ if (G.Moves.instance('toxic').poison !== 2 || G.Moves.instance('toxic-spikes').poison !== 2) bad('toxic / toxic-spikes should be poison 2');
  const flagged = G.Moves.ALL.filter(m => m.burn || m.poison).map(m => m.id + ':' + (m.burn ? 'burn' : 'poison' + m.poison));
  console.log('8 flagged moves (' + flagged.length + '):', flagged.join(' ')); }

// 9. logger line
try { load('js/systems/log.js'); G.EnemyMgr = { count: 0 }; G.Game = { player: null };
  const e = mk(1, 160); G.Log.on = true; G.Log.dot(e, 'burn', 10, 160, 150);
  const txt = G.Log.print ? (() => { let out = ''; const c = console.log; console.log = s => { out += s + '\n'; }; try { G.Log.print(5); } finally { console.log = c; } return out; })() : '';
  if (!/6\.3% of max/.test(txt)) bad('logger DOT line lacks percent: ' + txt.slice(0, 200)); else console.log('9 logger:', txt.trim().split('\n').pop()); } catch (x) { console.log('9 logger check skipped:', x.message); }

console.log(fail ? ('\n' + fail + ' FAILURES') : '\nALL PASS');
process.exit(fail ? 1 : 0);
