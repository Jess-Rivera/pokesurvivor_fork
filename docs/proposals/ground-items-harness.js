// Ground items (item rework F3a-1) offline checks (Node only). Usage from the repo root:  node docs/proposals/ground-items-harness.js .
// Real data/ground-items.js, systems/stages.js, data/pokesprite-index.js and Player.incOf with stubbed engine globals. Covers: the table (unique ids,
// English text, icons present in the Pokesprite index, 18 guard berries, weights add to 100 by family), the weighted roll, every effect on a fake team
// (heal fractions, X items +1 for 30 s, berries for 10 s, Starf +2 on one stat, Lansat crit, Kee / Maranga pct, Pinap drop bonus), refresh versus
// stacking, expiry, dropRate, HUD chip labels. The type-guard halving inside Player.hurt, the pickup draw and the HUD are covered by the headless run.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global; global.location = { search: '?dev' };
global.G = new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
G.U = { rand: (a, b) => a, pick: a => a[0], TYPE_COLOR: { fire: '#f00' } };
['js/systems/stages.js', 'js/data/pokesprite-index.js', 'js/data/ground-items.js'].forEach(p => load(p));
load('js/entities/player.js');
const Gr = G.Grounds, S = G.Stages;
const mk = () => ({ berries: [], stgTeam: {}, hp: 50, maxHp: 100, x: 0, y: 0, bodyH: 20, heal(a) { this.hp = Math.min(this.maxHp, this.hp + a); },
  inc: { def: 0, spd: 0 }, badge: { def: 0, spd: 0 }, incOf: G.Player.prototype.incOf });
const sum = (p, k) => S.teamSum(p.stgTeam, k), tm = (p, k) => (S.teamTimer(p.stgTeam, k) || {}).t;

// 1. the table
{ const ids = Gr.LIST.map(i => i.id);
  if (new Set(ids).size !== ids.length) bad('duplicate ids');
  if (Object.keys(Gr.GUARD).length !== 18 || new Set(Object.values(Gr.GUARD)).size !== 18) bad('18 distinct guard types');
  if (!near(Gr.TOTAL_W, 100, 1e-6)) bad('weights add to ' + Gr.TOTAL_W);
  const fam = { x: 0, heal: 0, guard: 0, pinch: 0, kee: 0, pinap: 0, status: 0 };
  for (const i of Gr.LIST) { const f = i.bag ? 'status' : i.id.startsWith('x-') ? 'x' : ['oran', 'sitrus'].includes(i.id) ? 'heal' : i.id in Gr.GUARD ? 'guard' : ['kee', 'maranga'].includes(i.id) ? 'kee' : i.id.includes('pinap') ? 'pinap' : 'pinch'; fam[f] += i.w; }
  const want = { x: 30, heal: 15.5, guard: 20, pinch: 15, kee: 6, pinap: 4, status: 9.5 };
  for (const f in want) if (!near(fam[f], want[f], 1e-9)) bad('family ' + f + ' ' + fam[f]);
  const SPAN = /[ñáíóúÁÉÍÓÚ¡¿]|\b(de|los|tu|un|el|la)\b/;
  for (const i of Gr.LIST) {
    if (!G.PokeSprite[i.icon]) bad('icon missing in index: ' + i.id + ' ' + i.icon);
    if (SPAN.test(i.name) || SPAN.test(i.desc || '') || !i.desc) bad('text ' + i.id);
    if (typeof i.apply !== 'function' || !(i.w > 0)) bad('shape ' + i.id);
  }
  console.log('1 table: ' + ids.length + ' items, 18 guard berries, weights 30/15.5/20/15/6/4/9.5, icons in the Pokesprite index, English text'); }

// 2. the weighted roll
{ let s = 7; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const N = 400000, c = {}; for (let i = 0; i < N; i++) { const id = Gr.roll(rnd); c[id] = (c[id] || 0) + 1; }
  for (const i of Gr.LIST) { const got = (c[i.id] || 0) / N * 100; if (Math.abs(got - i.w) > Math.max(0.25, i.w * 0.06)) bad('roll share ' + i.id + ' ' + got.toFixed(2) + ' vs ' + i.w.toFixed(2)); }
  if (Gr.roll(() => 0) !== 'x-attack' || !Gr.BY[Gr.roll(() => 0.999999)]) bad('roll ends');
  console.log('2 roll: shares match the weights over 400k rolls'); }

// 3. heals
{ const p = mk(); Gr.apply(p, 'oran'); if (!near(p.hp, 80)) bad('oran 30% ' + p.hp);
  const q = mk(); Gr.apply(q, 'sitrus'); if (!near(q.hp, 100)) bad('sitrus 50% ' + q.hp);
  const r = mk(); r.hp = 90; Gr.apply(r, 'sitrus'); if (r.hp !== 100) bad('heal clamps to max');
  console.log('3 heals: Oran 30%, Sitrus 50%, clamped'); }

// 4. stages, refresh versus stacking, expiry
{ const p = mk(); Gr.apply(p, 'x-attack');
  if (sum(p, 'atk') !== 1 || !near(tm(p, 'atk'), 30)) bad('x-attack +1 for 30 s');
  S.teamTick(p.stgTeam, 12); Gr.apply(p, 'x-attack');
  if (sum(p, 'atk') !== 1 || !near(tm(p, 'atk'), 30)) bad('same item refreshes, no stacking: ' + sum(p, 'atk') + ' ' + tm(p, 'atk'));
  Gr.apply(p, 'liechi'); if (sum(p, 'atk') !== 2 || !near(S.mul(p, 'atk'), 2)) bad('different items stack (+2 = x2): ' + sum(p, 'atk') + ' ' + S.mul(p, 'atk'));
  S.teamTick(p.stgTeam, 10.2); if (sum(p, 'atk') !== 1) bad('liechi expired after 10 s');
  S.teamTick(p.stgTeam, 20); if (sum(p, 'atk') !== 0) bad('x-attack expired after its refreshed 30 s');
  for (const [id, st] of [['x-defense', 'def'], ['x-sp-atk', 'spa'], ['x-sp-def', 'spd'], ['x-speed', 'spe'], ['ganlon', 'def'], ['salac', 'spe'], ['petaya', 'spa'], ['apicot', 'spd']]) {
    const q = mk(); Gr.apply(q, id); if (sum(q, st) !== 1) bad(id + ' -> ' + st); }
  const q = mk(); Gr.apply(q, 'starf'); const hit = ['atk', 'def', 'spa', 'spd', 'spe'].filter(k => sum(q, k) === 2); if (hit.length !== 1 || !near(tm(q, hit[0]), 10)) bad('starf: one stat +2 for 10 s');
  console.log('4 stages: X +1/30 s, pinch berries +1/10 s, Starf +2 on one stat, refresh vs stack, expiry'); }

// 5. guard, Lansat, Kee, Maranga, Pinap
{ const p = mk(); Gr.apply(p, 'occa');
  if (sum(p, 'guard_fire') !== 1 || !near(tm(p, 'guard_fire'), 10)) bad('occa guard_fire 10 s');
  Gr.apply(p, 'chilan'); if (sum(p, 'guard_normal') !== 1) bad('chilan guard_normal');
  for (const b in Gr.GUARD) { const q = mk(); Gr.apply(q, b); if (sum(q, 'guard_' + Gr.GUARD[b]) !== 1) bad('guard ' + b); }
  const l = mk(); Gr.apply(l, 'lansat'); if (!near(sum(l, 'crit'), 0.2) || !near(tm(l, 'crit'), 10)) bad('lansat crit +20% 10 s');
  const k = mk(); k.inc.def = 0.2; k.badge.def = 0.05; Gr.apply(k, 'kee');
  if (!near(k.incOf('def'), 0.35) || !near(k.incOf('spd'), 0)) bad('kee +10% on Def only: ' + k.incOf('def') + '/' + k.incOf('spd'));
  Gr.apply(k, 'kee'); if (!near(k.incOf('def'), 0.35)) bad('kee refreshes, no stacking');
  Gr.apply(k, 'maranga'); if (!near(k.incOf('spd'), 0.10)) bad('maranga +10% Sp. Def');
  S.teamTick(k.stgTeam, 10.2); if (!near(k.incOf('def'), 0.25) || !near(k.incOf('spd'), 0)) bad('kee / maranga expire after 10 s');
  console.log('5 guard berries (18), Lansat +20% crit, Kee / Maranga +10% via incOf, expiry'); }

// 6. drop rate
{ const p = mk(); if (!near(Gr.dropRate(p), 0.01)) bad('base 1%');
  Gr.apply(p, 'pinap'); if (!near(Gr.dropRate(p), 0.02)) bad('pinap -> 2%');
  Gr.apply(p, 'pinap'); if (!near(Gr.dropRate(p), 0.02)) bad('pinap refreshes');
  const q = mk(); Gr.apply(q, 'silver-pinap'); if (!near(Gr.dropRate(q), 0.06)) bad('silver -> 6%');
  const g = mk(); Gr.apply(g, 'golden-pinap'); if (!near(Gr.dropRate(g), 0.11) || !near(tm(g, 'drop'), 60)) bad('golden -> 11% for 60 s');
  S.teamTick(g.stgTeam, 60.2); if (!near(Gr.dropRate(g), 0.01)) bad('drop bonus expires after 60 s');
  if (!near(Gr.dropRate(null), 0.01) || !near(Gr.dropRate({}), 0.01)) bad('dropRate tolerates no store');
  console.log('6 dropRate: 1% base, +1 / +5 / +10 points for 60 s'); }

// 7. status berries (F3a-2): the bag, canTake, berryGuard
{ const p = mk(); G.DB = { save: {} };
  if (Gr.berrySlots(null) !== 1 || Gr.berrySlots({}) !== 1 || Gr.berrySlots({ berrySlots: 3 }) !== 3 || Gr.berrySlots({ berrySlots: 99 }) !== 4) bad('berrySlots');
  if (!Gr.canTake('oran', p) || !Gr.canTake('x-attack', p)) bad('non-bag items always can be taken');
  if (!Gr.canTake('cheri', p)) bad('empty bag takes cheri');
  Gr.apply(p, 'cheri'); if (p.berries.join() !== 'cheri') bad('stored');
  if (Gr.canTake('chesto', p)) bad('1 slot: full bag refuses');
  G.DB.save.berrySlots = 2; if (!Gr.canTake('chesto', p) || Gr.canTake('cheri', p)) bad('2 slots: second free, duplicate refused');
  Gr.apply(p, 'lum'); if (p.berries.join() !== 'cheri,lum') bad('two stored');
  // exact berry first, Lum last, toxic counts as poison, only the six main statuses
  if (!Gr.berryGuard(p, 'paralysis') || p.berries.join() !== 'lum') bad('cheri consumed by paralysis, lum kept: ' + p.berries);
  if (Gr.berryGuard(p, 'trap') || Gr.berryGuard(p, 'daze') || Gr.berryGuard(p, 'drowsy') || p.berries.length !== 1) bad('lum does not cover trap / daze / drowsy');
  if (!Gr.berryGuard(p, 'toxic') || p.berries.length !== 0) bad('lum covers toxic (poison family)');
  const m = mk(); for (const [b, ks] of [['cheri', ['paralysis']], ['chesto', ['sleep']], ['pecha', ['poison', 'toxic']], ['rawst', ['burn']], ['aspear', ['freeze']], ['persim', ['confusion']]]) {
    for (const k of ['paralysis', 'sleep', 'poison', 'toxic', 'burn', 'freeze', 'confusion']) { m.berries = [b]; const hit = Gr.berryGuard(m, k); if (hit !== ks.includes(k)) bad(b + ' vs ' + k + ' -> ' + hit); } }
  for (const k of ['paralysis', 'sleep', 'poison', 'toxic', 'burn', 'freeze', 'confusion']) { m.berries = ['lum']; if (!Gr.berryGuard(m, k)) bad('lum vs ' + k); }
  m.berries = ['cheri', 'lum']; Gr.berryGuard(m, 'paralysis'); if (m.berries.join() !== 'lum') bad('exact before lum');
  if (Gr.berryGuard({}, 'sleep') || Gr.berryGuard(null, 'sleep')) bad('no bag, no block');
  console.log('7 berry bag: slots default 1 (cap 4), full or duplicate refused, exact berry before Lum, Lum covers the six main statuses only'); }

// 7b. every bag berry has an icon, a name and a readable description (the team sheet shows them)
{ const bag = Gr.LIST.filter(i => i.bag); if (bag.length !== 7) bad('7 bag berries, got ' + bag.length);
  for (const b of bag) if (!b.icon || !b.name || !b.desc || b.desc.length < 10) bad('bag berry sheet text: ' + b.id);
  console.log('7b bag berries carry sheet text'); }

// 8. chips
{ const c = Gr.chip('guard_fire', 1); if (!c || c.label !== 'FIRE GUARD') bad('guard chip');
  if (Gr.chip('pct_def', 0.1).label !== 'DEF +10%' || Gr.chip('pct_spd', 0.1).label !== 'SP.DEF +10%' || Gr.chip('crit', 0.2).label !== 'CRIT +20%' || Gr.chip('drop', 0.05).label !== 'DROPS +5%' || Gr.chip('atk', 1) !== null) bad('chip labels');
  console.log('7 HUD chips'); }

console.log(fail ? fail + ' FAILURES' : 'ALL PASS');
process.exit(fail ? 1 : 0);
