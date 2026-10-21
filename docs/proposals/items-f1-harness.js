// Item rework F1 offline checks (Node only). Usage from the repo root:  node docs/proposals/items-f1-harness.js .
// Real js/data/items.js and the Player item methods (hasItem, equip, onDealt) with stubbed engine globals. Covers: tiers and the
// 11-item port (9 Pokemon, 2 run), English names, on/off symmetry for every stat item, the run-slot count with old saves,
// tier-aware rolls and the run-chance drop, held effects only while the holder is not benched, run items for the whole team,
// per-holder state (Focus Sash timer, Shell Bell charge), and F2 swapHeldItem (move, swap, no stat drift, sash cooldown travels). The live pickup flow and the HUD are NOT covered (no browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global; global.location = { search: '?dev' };
const base = {};
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
G.U = { pick: a => a[Math.floor(Math.random() * a.length)] };
load('js/data/items.js');
let P;
try { load('js/entities/player.js'); P = G.Player; } catch (e) { console.log('player.js load failed', e.message); process.exit(1); }
if (!P) { console.log('G.Player missing'); process.exit(1); }
const I = G.Items;
const mk = () => ({ item: null, runItems: [], benched: false, atkMul: 1, spdMul: 1, cdMul: 1, dmgReduce: 0, regenFlat: 0, xpMul: 1, coinMul: 1, maxHp: 200, bellHeal: 0, sashT: -999,
  hasItem: P.prototype.hasItem, equip: P.prototype.equip, onDealt: P.prototype.onDealt, swapHeldItem: P.prototype.swapHeldItem });

// 1. the port
{ const pk = I.LIST.filter(i => i.tier === 'pokemon').map(i => i.id), rn = I.LIST.filter(i => i.tier === 'run').map(i => i.id);
  if (I.LIST.length !== 11 || pk.length !== 9) bad('counts ' + I.LIST.length + '/' + pk.length);
  if (rn.sort().join() !== 'amuletcoin,luckyegg') bad('run tier ' + rn);
  if (I.LIST.some(i => !['pokemon', 'run', 'ground'].includes(i.tier))) bad('unknown tier');
  const SPAN = /[ñáéíóúÁÉÍÓÚ¡¿]|\b(de|los|tu|un|el|la)\b/;
  for (const i of I.LIST) if (SPAN.test(i.name.replace(/Poké/g, 'Poke')) || SPAN.test(i.desc.replace(/Poké/g, 'Poke'))) bad('not English: ' + i.id + ' ' + i.name + ' / ' + i.desc);
  console.log('1 port: 11 items (9 pokemon, 2 run), English text'); }

// 2. on/off symmetry (separate multiplier, no drift)
{ for (const it of I.LIST) { const p = mk(), b = JSON.stringify(p); it.on(p); it.off(p);
    const a = JSON.stringify(p); if (a !== b && !(it.id === 'leftovers')) bad('drift ' + it.id + ' ' + b + ' -> ' + a);
    if (it.id === 'leftovers' && !near(p.regenFlat, 0)) bad('leftovers drift'); }
  const p = mk(); I.BY.choiceband.on(p); if (!near(p.atkMul, 1.4)) bad('choiceband 1.4'); I.BY.lifeorb.on(p); if (!near(p.atkMul, 1.4 * 1.3)) bad('multipliers stack multiplicatively');
  const q = mk(); I.BY.leftovers.on(q); if (!near(q.regenFlat, 3)) bad('leftovers 1.5% of 200 = 3, got ' + q.regenFlat);
  const r = mk(); I.BY.luckyegg.on(r); I.BY.amuletcoin.on(r); if (!near(r.xpMul, 1.3) || !near(r.coinMul, 1.5)) bad('run item mults');
  console.log('2 on/off round-trip clean for all 11; stat mults 1.4/1.3/0.8/1.35/+0.2/1.3/1.5 as before'); }

// 3. hasItem: held only while on the field; run items always
{ const p = mk(); p.equip('focussash');
  if (!p.hasItem('focussash')) bad('holder active should have it');
  p.benched = true; if (p.hasItem('focussash')) bad('benched holder must not have held effects');
  p.benched = false; p.runItems.push('luckyegg'); if (!p.hasItem('luckyegg')) bad('run item');
  p.benched = true; if (!p.hasItem('luckyegg')) bad('run item survives bench'); p.benched = false;
  p.equip('choicescarf'); if (p.hasItem('focussash') || !p.hasItem('choicescarf') || !near(p.spdMul, 1.35)) bad('equip replaces');
  console.log('3 hasItem: held effects only when not benched; run items always; equip swaps cleanly'); }

// 4. per-holder state and shared run array
{ const a = mk(), b = mk(); a.equip('shellbell'); b.equip('focussash');
  a.onDealt(50); b.onDealt(50);
  if (!near(a.bellHeal, 2) || b.bellHeal !== 0) bad('shell bell charge per holder ' + a.bellHeal + '/' + b.bellHeal);
  a.sashT = 123; if (b.sashT !== -999) bad('sash timer must be per holder');
  const shared = []; a.runItems = shared; b.runItems = shared; shared.push('amuletcoin');
  if (!a.hasItem('amuletcoin') || !b.hasItem('amuletcoin')) bad('shared run array');
  console.log('4 per-holder state (sash timer, bell charge) and one shared run array'); }

// 5. slots, rolls, drop sources
{ if (I.runSlots(null) !== 1 || I.runSlots({}) !== 1 || I.runSlots({ runSlots: 0 }) !== 1 || I.runSlots({ runSlots: 3 }) !== 3 || I.runSlots({ runSlots: 99 }) !== 4) bad('runSlots');
  for (let i = 0; i < 200; i++) { const r = I.roll('leftovers'); if (r === 'leftovers' || I.BY[r].tier !== 'pokemon') bad('pokemon roll ' + r); }
  for (let i = 0; i < 100; i++) { const r = I.roll(null, 'run'); if (I.BY[r].tier !== 'run') bad('run roll'); }
  const N = 40000, cnt = { gym: 0, boss: 0, chest: 0 };
  for (const s of Object.keys(cnt)) for (let i = 0; i < N; i++) if (I.BY[I.rollFor(s, [])].tier === 'run') cnt[s]++;
  if (Math.abs(cnt.gym / N - 0.10) > 0.01) bad('gym run chance ' + cnt.gym / N);
  if (Math.abs(cnt.boss / N - 0.05) > 0.01) bad('boss run chance ' + cnt.boss / N);
  if (cnt.chest !== 0) bad('other sources never give run items');
  for (let i = 0; i < 2000; i++) if (I.BY[I.rollFor('gym', ['luckyegg', 'amuletcoin'])].tier !== 'pokemon') bad('all run items owned falls back to pokemon');
  for (let i = 0; i < 2000; i++) if (I.rollFor('gym', ['luckyegg']) === 'luckyegg') bad('owned run item rolled again');
  console.log('5 slots default 1 (old saves ok, cap 4); rolls by tier; gym ~10%, boss ~5%, others 0%'); }

// 6. F2: moving and swapping held items between Pokemon
{ const a = mk(), b = mk();
  a.equip('choiceband'); a.equip('lifeorb'); const r1 = a.swapHeldItem(b);
  if (!r1 || r1.a !== 'lifeorb' || r1.b !== null) bad('move result ' + JSON.stringify(r1));
  if (a.item !== null || b.item !== 'lifeorb' || !near(a.atkMul, 1) || !near(b.atkMul, 1.3)) bad('move: stats follow the item ' + a.atkMul + '/' + b.atkMul);
  b.equip('quickclaw'); a.equip('choicescarf');             // a: scarf, b: claw
  const r2 = a.swapHeldItem(b);
  if (a.item !== 'quickclaw' || b.item !== 'choicescarf') bad('swap items');
  if (!near(a.spdMul, 1) || !near(a.cdMul, 0.8) || !near(b.spdMul, 1.35) || !near(b.cdMul, 1)) bad('swap stats a:' + a.spdMul + '/' + a.cdMul + ' b:' + b.spdMul + '/' + b.cdMul);
  for (let i = 0; i < 50; i++) { a.swapHeldItem(b); }             // 50 more swaps: no drift
  if (!near(a.spdMul, 1) || !near(b.spdMul, 1.35) || !near(a.cdMul, 0.8) || !near(b.cdMul, 1)) bad('drift after 50 swaps');
  if (a.swapHeldItem(a) !== null || mk().swapHeldItem(mk()) !== null || a.swapHeldItem(null) !== null) bad('no-op cases must return null');
  const c = mk(), d = mk(); c.equip('focussash'); c.sashT = 5000; c.swapHeldItem(d);
  if (d.item !== 'focussash' || d.sashT !== 5000 || c.sashT !== -999) bad('sash cooldown must travel: ' + d.sashT + '/' + c.sashT);
  const e = mk(), f = mk(); e.equip('leftovers'); f.maxHp = 400; e.swapHeldItem(f);
  if (!near(e.regenFlat, 0) || !near(f.regenFlat, 6)) bad('leftovers recomputed from the new holder: ' + e.regenFlat + '/' + f.regenFlat);
  console.log('6 swapHeldItem: move, swap, 50 round-trips clean, no-ops null, sash cooldown travels, Leftovers uses the new holder max HP'); }

console.log(fail ? fail + ' FAILURES' : 'ALL PASS');
process.exit(fail ? 1 : 0);
