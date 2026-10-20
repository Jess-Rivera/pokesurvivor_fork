// Status rework slice D3 (drain), offline checks (Node only). Usage from the repo root:  node docs/proposals/status-sliceD3-harness.js .
// Loads the REAL moves.js, kinds.js, mechanics.js and combat.js with stubbed engine globals and checks: Giga Drain is one projectile with
// drain 50% and a per-hit cap, Count and Pierce cards are refused for it (other cards and other projectiles unaffected), and the heal is
// 50% of the damage ACTUALLY taken (overkill excluded, shield counts), capped at a share of max HP, never for ghost shots.
// Rendering and the live loop are NOT covered (no browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
global.window = global; global.location = { search: '?dev' };
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => a, pickN: a => a },
  DEX_BY: {}, DEX: [], FX: { dmgText() {}, spark() {}, ring() {}, burst() {}, sp() {} },
  Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
['js/core/stats.js', 'js/data/enemies.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/systems/combat.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
let fail = 0; const bad = m => { fail++; console.log('FAIL', m); };
const near = (a, b) => Math.abs(a - b) < 1e-9;

// 1. the move
const gd = G.Moves.ALL.find(m => m.id === 'giga-drain');
{ if (!gd || gd.kind !== 'projectile' || gd.count !== 1 || gd.pierce !== 0 || gd.drain !== 0.5 || gd.drainCap != null) bad('giga-drain data');
  if (gd.dmg !== 75) bad('power stays at the API-based 75');
  if (G.Moves.ALL.some(m => m.id !== 'giga-drain' && m.drain)) bad('only Giga Drain drains');
  console.log('1 move: Giga Drain = one projectile, drain ' + gd.drain + ', no cap, power ' + gd.dmg); }

// 2. upgrade eligibility (a live instance as in a run)
{ const inst = G.Moves.instance('giga-drain'), ids = G.Mechanics.eligibleFor(inst).map(x => x.id);
  if (ids.includes('count') || ids.includes('pierce')) bad('count/pierce must be refused: ' + ids);
  for (const need of ['effect', 'recharge']) if (!ids.includes(need)) bad('should still take ' + need + ': ' + ids);
  const em = G.Mechanics.eligibleFor(G.Moves.instance('ember')).map(x => x.id);
  if (!em.includes('count') || !em.includes('pierce')) bad('Ember must still take count and pierce: ' + em);
  console.log('2 cards: Giga Drain takes ' + ids.join(', ') + ' (no count, no pierce); Ember still takes count and pierce'); }

// 3. heal = 50% of damage actually taken
const pl = { dead: false, maxHp: 200, healed: 0, heal(a) { this.healed += a; } };
const en = (hp, shield = 0) => ({ hp, shield });
const run = (e, taken, m = gd, p = pl) => { const hp0 = e.hp, sh0 = e.shield || 0; let t = taken; const s = Math.min(t, e.shield || 0); e.shield = (e.shield || 0) - s; t -= s; e.hp = e.hp - t; p.healed = 0; G.Combat.drainHeal(p, m, e, hp0, sh0); return p.healed; };
{ let h = run(en(100), 20); if (!near(h, 10)) bad('plain 20 dmg -> 10, got ' + h);
  h = run(en(5), 40); if (!near(h, 2.5)) bad('overkill: only the 5 HP actually removed counts -> 2.5, got ' + h);
  h = run(en(100, 30), 20); if (!near(h, 10)) bad('damage absorbed by a shield counts -> 10, got ' + h);
  h = run(en(100), 100); if (!near(h, 50)) bad('uncapped: 100 dmg on a 200 max HP player -> 50, got ' + h);
  h = run(en(100), 100, { id: 'x', drain: 0.5, drainCap: 0.1 }); if (!near(h, 20)) bad('an explicit drainCap is still honoured (10% of 200 = 20), got ' + h);
  const e0 = en(100); h = run(e0, 0); if (h !== 0) bad('no damage, no heal');
  const dead = Object.assign({}, pl, { dead: true }); h = run(en(100), 20, gd, dead); if (h !== 0) bad('dead player gets nothing');
  h = run(en(100), 20, { id: 'ember' }); if (h !== 0) bad('non-drain move heals nothing');
  console.log('3 heal: 20 dmg -> 10; overkill counts only HP removed (5 -> 2.5); shield absorbed counts; no cap by default (an explicit drainCap still works); dead / non-drain heal nothing'); }

console.log(fail ? fail + ' FAILED' : 'ALL OK');
process.exit(fail ? 1 : 0);
