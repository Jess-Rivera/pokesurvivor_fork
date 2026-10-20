// Status rework slice B offline checks (Node only). Usage from the repo root:  node docs/proposals/status-sliceB-harness.js .
// Real stats, kinds, mechanics, moves, enemies, enemy and combat files with stubbed engine globals. Covers: who can take the
// Ailment Chance card (all 64 moves) and the reason shown for each of the rest, the +10 point step with the 100% cap, card and
// preview text, independence from the damage cards, the chance roll with stacks, the DoT damage-pool multiplier through the
// real Enemy ticks, and the sheet ailment line. The sheet screen itself and the live game are NOT covered (no browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
global.window = global; global.location = { search: '?dev' };
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: () => 0.5, pickN: a => a },
  DEX_BY: { 1: { name: 'Normie', types: ['normal'] } }, DEX: [],
  Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
['js/core/stats.js', 'js/data/kinds.js', 'js/systems/status.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/data/enemies.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/systems/combat.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
const Enemy = G.Enemy || (G.Enemies && G.Enemies.Enemy) || G.Entities && G.Entities.Enemy;
Enemy.prototype.die = function () { this.dead = true; };
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const mk = (hp = 160) => { const e = new Enemy({ dex: 1, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'plain' }, 0, 0, { t: 0, dmg: 1, hp: 1, spd: 1 }, false); e.maxHp = hp; e.hp = hp; return e; };
const pl = { level: 5, x: 5000, y: 5000, hp: 100 };
const run = (e, secs, dt = 0.05) => { const n = Math.round(secs / dt); for (let i = 0; i < n; i++) { try { e.update(dt, pl); } catch (x) { if (!/primitive|not a function|undefined|noop/i.test(String(x))) throw x; } } };
const M = G.Mechanics, AC = M.BY_ID.ailchance, inst = id => G.Moves.instance(id);
const stack = (m, id, n) => { let k = 0; for (let i = 0; i < n; i++) if (G.Moves.addStack(m, id)) k++; return k; };

// 1. who can take it: exactly the six damage moves with a live burn / poison and a chance under 100; reasons for the rest
{ const ok = [], why = {};
  for (const d of G.Moves.ALL) { const m = inst(d.id), c = M.check(m, AC); if (c.ok) ok.push(d.id); else (why[M.reason(m, AC)] = why[M.reason(m, AC)] || []).push(d.id); }
  const want = ['ember', 'flamethrower', 'flame-wheel', 'heat-wave', 'poison-sting', 'sludge', 'thunder-shock', 'discharge', 'thunderbolt', 'body-slam', 'lick', 'confusion', 'psybeam', 'ice-beam', 'powder-snow'].sort();   // slice C: the control ailments are wired too
  if (JSON.stringify(ok.slice().sort()) !== JSON.stringify(want)) bad('eligible set: ' + ok.sort());
  const rs = r => (why[r] || []);
  if (!rs('Chance is already 100%').includes('fire-spin')) bad('fire-spin should be capped at 100%');
  for (const id of ['will-o-wisp', 'toxic', 'toxic-spikes']) if (!rs('Always applies').includes(id)) bad(id + ' should say Always applies');
  if (!rs('Has no ailment').includes('tackle')) bad('tackle should say Has no ailment');
  const buffs = G.Moves.ALL.filter(d => G.Kinds.BY[d.kind] && G.Kinds.BY[d.kind].payload === 'buff').map(d => d.id);
  for (const id of buffs) if (!rs('Has no ailment').includes(id)) bad('buff move ' + id + ' reason: ' + M.reason(inst(id), AC));
  const unw = G.Moves.ALL.filter(d => d.ailment && !['none', 'burn', 'poison', 'trap', 'paralysis', 'freeze', 'sleep', 'confusion'].includes(d.ailment) && !d.burn && !d.poison).map(d => d.id);
  for (const id of unw) { const r = M.reason(inst(id), AC); if (r !== 'Ailment not in the game yet') bad(id + ' (' + G.Moves.BY_ID[id].ailment + ') reason: ' + r); }
  console.log('1 eligibility: ' + ok.length + ' moves (' + ok.join(', ') + ');', Object.keys(why).map(k => k + ' x' + why[k].length).join(', ')); }

// 2. the step: +10 points, cap 100, clamp, text, preview
{ const e = inst('ember'), s = inst('sludge');
  if (e.ailmentChance !== 10 || s.ailmentChance !== 30) bad('base chances');
  const seen = []; for (let i = 0; i < 9; i++) { G.Moves.addStack(e, 'ailchance'); seen.push(e.ailmentChance); }
  if (JSON.stringify(seen) !== JSON.stringify([20, 30, 40, 50, 60, 70, 80, 90, 100])) bad('ember chances ' + seen);
  if (G.Moves.addStack(e, 'ailchance')) bad('10th stack accepted at 100%');
  if (M.reason(e, AC) !== 'Chance is already 100%') bad('capped reason: ' + M.reason(e, AC));
  if (stack(s, 'ailchance', 20) !== 7 || s.ailmentChance !== 100) bad('sludge should take exactly 7 stacks, chance ' + s.ailmentChance);
  const f = inst('ember'); f.mods.ailchance = 15; G.Moves.derive(f); if (f.ailmentChance !== 100) bad('derive clamp ' + f.ailmentChance);
  const t0 = M.text(inst('ember'), AC), t1 = M.text(inst('sludge'), AC), pv = M.preview(inst('ember'), AC), pv2 = M.preview(Object.assign(inst('ember'), { mods: { ailchance: 8 } }, {}), AC);
  if (t0 !== '+10 points Burn Chance' || t1 !== '+10 points Poison Chance') bad('texts: ' + t0 + ' | ' + t1);
  if (pv !== '10% to 20%') bad('preview ' + pv);
  const g = inst('ember'); stack(g, 'ailchance', 8); if (M.preview(g, AC) !== '90% to 100%') bad('preview at 90: ' + M.preview(g, AC));
  console.log('2 step: ember', seen.join(' > ') + '%, 10th refused; sludge 30 > 100 in 7; clamp ok;', JSON.stringify(t0), JSON.stringify(pv)); }

// 3. independence from the damage pool, order independent
{ const a = inst('ember'), b = inst('ember'), base = inst('ember').dmg;
  stack(a, 'ailchance', 3); stack(a, 'effect', 2); stack(b, 'effect', 2); stack(b, 'ailchance', 3);
  if (a.ailmentChance !== 40 || b.ailmentChance !== 40) bad('chance after 3 stacks ' + a.ailmentChance);
  if (!near(a.dmg, base * 1.2) || !near(b.dmg, a.dmg)) bad('dmg: ' + a.dmg + ' vs ' + base * 1.2);
  console.log('3 independent: 3 chance stacks + 2 Increased Effect = chance 40, Power x1.2, order does not matter'); }

// 4. chance roll with stacks
const rate = (id, n, N = 40000) => { let hit = 0; const m = inst(id); stack(m, 'ailchance', n); for (let i = 0; i < N; i++) { const e = mk(); G.Combat.procAilments(e, m.burn, m.poison, m); if (e.burn || e.poison) hit++; } return hit / N; };
{ const r5 = rate('ember', 5), r9 = rate('ember', 9, 2000), rs = rate('sludge', 2);
  if (Math.abs(r5 - 0.60) > 0.012) bad('ember +5 rate ' + r5); if (r9 !== 1) bad('ember +9 rate ' + r9); if (Math.abs(rs - 0.50) > 0.012) bad('sludge +2 rate ' + rs);
  console.log('4 roll: ember +5 stacks', r5.toFixed(3), '(want 0.60), +9 stacks', r9, ', sludge +2 stacks', rs.toFixed(3), '(want 0.50)'); }

// 5. DoT follows the damage pool (through the real Enemy ticks)
{ const em = inst('ember'); stack(em, 'effect', 3); stack(em, 't:fire', 2);
  const mul = G.Moves.dotMul(em); if (!near(mul, 1.6)) bad('dotMul ' + mul);
  if (G.Moves.dotMul(inst('ember')) !== 1 || G.Moves.dotMul(inst('toxic')) !== 1 || G.Moves.dotMul(inst('will-o-wisp')) !== 1 || G.Moves.dotMul(null) !== 1) bad('dotMul base / status / null');
  const tick = (e, secs) => { const h = e.hp; run(e, secs); return h - e.hp; };
  const a = mk(160); a.applyBurn(1, false, 1.6); const d1 = tick(a, 2.1); if (!near(d1, 16)) bad('burn tick at 1.6x: ' + d1);
  const b = mk(160); b.applyBurn(1, false, 1.6); b.applyBurn(1, false, 1.0); const d2 = tick(b, 2.1); if (!near(d2, 16)) bad('weaker source lowered the DoT: ' + d2);
  const c = mk(160); c.applyBurn(1, false, 1.0); c.applyBurn(1, false, 1.6); const d3 = tick(c, 2.1); if (!near(d3, 16)) bad('stronger source did not raise the DoT: ' + d3);
  const d = mk(160); d.applyBurn(1, false, 1.6); run(d, 9); d.applyBurn(1); const d4 = tick(d, 2.1); if (!near(d4, 10)) bad('fresh burn after the old one ended should be 1.0x: ' + d4);
  const p = mk(160); p.applyPoison(1, 1.2); const d5 = tick(p, 2.1); if (!near(d5, 24)) bad('poison tick at 1.2x: ' + d5);
  const t = mk(1e6); t.hp = 1e9; t.applyPoison(2, 2); const d6 = tick(t, 2.1); if (!near(d6, 1e6 / 16 * 2)) bad('toxic first tick at 2x: ' + d6);
  // full path: a 9-stack chance (always procs) Ember with +3 Increased Effect, through procAilments
  const full = inst('ember'); stack(full, 'ailchance', 9); stack(full, 'effect', 3);
  const f = mk(160); G.Combat.procAilments(f, full.burn, full.poison, full); const d7 = tick(f, 2.1); if (!near(d7, 13)) bad('procAilments path burn tick: ' + d7);
  console.log('5 DoT multiplier: dotMul 1.6 -> burn tick 16 (base 10); weaker source never lowers it; resets after the state ends; poison 1.2x = 24; toxic 2x; full path 13'); }

// 6. sheet ailment line
{ const T = id => M.ailmentText(inst(id));
  const want = { ember: 'Burn chance 10% per hit: 6.3% max HP every 2 s, 4 times', sludge: 'Poison chance 30% per hit: 12.5% max HP every 2 s, 4 times',
    toxic: 'Bad poison chance always: 6.3% max HP, rising by 6.3% every 2 s, up to 8 times', 'will-o-wisp': 'Burn chance always: 6.3% max HP every 2 s, 4 times',
    'fire-spin': 'Trap chance 100% per hit: 6.3% max HP every 2 s, 4 times, and moves at quarter speed', tackle: '',
    'thunder-shock': 'Paralysis chance 10% per hit: half speed, 25% of attacks fizzle, 10 s' };
  for (const id in want) if (T(id) !== want[id]) bad('ailment line ' + id + ': ' + JSON.stringify(T(id)));
  const m = inst('ember'); stack(m, 'ailchance', 5); stack(m, 'effect', 3);
  if (M.ailmentText(m) !== 'Burn chance 60% per hit: 8.1% max HP every 2 s, 4 times') bad('scaled line: ' + M.ailmentText(m));
  console.log('6 sheet line:', JSON.stringify(T('ember'))); console.log('  with 5 chance + 3 effect stacks:', JSON.stringify(M.ailmentText(m))); }

console.log(fail ? ('\n' + fail + ' FAILURES') : '\nALL PASS');
process.exit(fail ? 1 : 0);
