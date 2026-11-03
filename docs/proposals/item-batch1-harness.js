// Item batch 1 offline checks (Node only). Usage from the repo root:  node docs/proposals/item-batch1-harness.js .
// Real items.js, stats.js, stages.js and the Player methods (moveFactor, setActive, equip, hasItem), with stubbed engine globals. Expected numbers are
// hand-derived from docs/proposals/item-rework-v2-handoff.md and DECISIONS 2026-11-03, not read back from the items. The crit multiplier inside
// MoveEffects.damage and the live pickup flow are covered by a headless run.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global; global.location = { search: '?dev' };
global.G = new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
G.U = { pick: a => a[0], TYPE_COLOR: {} };
load('js/core/stats.js'); load('js/systems/stages.js'); load('js/data/items.js'); load('js/entities/player.js');
const P = G.Player, I = G.Items;
if (!P) { console.log('FAIL G.Player missing'); process.exit(1); }

// A real Player without its constructor: the fields the methods read, fresh multipliers and no upgrades
const mk = () => Object.assign(Object.create(P.prototype), { item: null, runItems: [], benched: false, level: 30, baseAtkStat: 80, baseSpAStat: 80, atkMul: 1, physMul: 1, specMul: 1, critDmgMul: 1, critChance: 0, cdMul: 1,
  slots: [[{ id: 'a' }], [{ id: 'b' }]], active: 0, swapT: 0, x: 0, y: 0, r: 10, bodyH: 20, incOf: () => 0, runDmgMul: () => 1, skillAt: () => null });
const PHYS = { cat: 'physical', dmg: 40 }, SPEC = { cat: 'special', dmg: 40 }, STAT = { cat: 'status', dmg: 40 };
const ratio = (id, m) => { const a = mk(), b = mk(); a.equip(id); return a.moveFactor(m) / b.moveFactor(m); };

// 1. category damage: [item, physical, special, status]
for (const [id, ph, sp] of [['choiceband', 1.4, 1], ['choicespecs', 1, 1.4], ['muscleband', 1.1, 1], ['wiseglasses', 1, 1.1], ['thickclub', 1.3, 1], ['lightball', 1, 1.3], ['lifeorb', 1.3, 1.3]]) {
  if (!near(ratio(id, PHYS), ph)) bad(id + ' physical x' + ratio(id, PHYS) + ' want ' + ph);
  if (!near(ratio(id, SPEC), sp)) bad(id + ' special x' + ratio(id, SPEC) + ' want ' + sp);
}
for (const id of ['choiceband', 'choicespecs', 'muscleband', 'wiseglasses', 'thickclub', 'lightball']) if (!near(ratio(id, STAT), 1)) bad(id + ' must not boost a status-category move');
console.log('1 Band, Specs, Muscle Band, Wise Glasses, Thick Club and Light Ball boost one category; status moves get neither; Life Orb stays all damage');

// 2. the costs and crit numbers
{ for (const id of ['thickclub', 'lightball']) { const p = mk(); p.equip(id); if (!near(p.cdMul, 1.1)) bad(id + ' cooldown x' + p.cdMul); }
  const lp = mk(); lp.equip('luckypunch'); if (!near(lp.critChance, 0.15) || !near(lp.critDmgMul, 1)) bad('lucky punch +15% crit only');
  const lk = mk(); lk.equip('leek'); if (!near(lk.critChance, 0.1) || !near(1.5 * lk.critDmgMul, 2.25)) bad('leek +10% crit, crits 2.25x');
  console.log('2 Thick Club and Light Ball +10% cooldown; Lucky Punch +15% crit; Leek +10% crit and 2.25x crits'); }

// 3. equip and unequip are clean, and swapping items moves the effect
{ for (const id of ['choiceband', 'choicespecs', 'muscleband', 'wiseglasses', 'thickclub', 'lightball', 'luckypunch', 'leek']) { const p = mk(); p.equip(id); p.equip(null);
    if (!near(p.physMul, 1) || !near(p.specMul, 1) || !near(p.cdMul, 1) || !near(p.critChance, 0) || !near(p.critDmgMul, 1)) bad(id + ' leaves a drift'); }
  const a = mk(), b = mk(); a.equip('choicespecs'); a.swapHeldItem(b); if (!near(a.specMul, 1) || !near(b.specMul, 1.4)) bad('specs follow the swap');
  console.log('3 no drift on unequip; a swap moves the multiplier'); }

// 4. the Choice lock: both items lock the move slot, others do not, a benched holder is free
{ for (const id of ['choiceband', 'choicespecs']) { const p = mk(); p.equip(id); p.setActive(1, true); if (p.active !== 0) bad(id + ' must lock the move slot');
    const q = mk(); q.equip(id); q.benched = true; if (q.choiceLocked()) bad(id + ' does nothing on the bench'); }
  const f = mk(); f.equip('muscleband'); f.setActive(1, true); if (f.active !== 1) bad('Muscle Band must not lock');
  const n = mk(); n.setActive(1, true); if (n.active !== 1) bad('no item, no lock');
  console.log('4 Choice Band and Choice Specs lock the move slot, Muscle Band does not'); }

// 5. no item is species-locked: every batch item has a ps: icon and works the same on any holder (the icons are real sheet cells)
{ const idx = fs.readFileSync(R + '/js/data/pokesprite-index.js', 'utf8');
  for (const id of ['choicespecs', 'thickclub', 'lightball', 'luckypunch', 'leek']) { const it = I.BY[id]; if (!it || it.tier !== 'pokemon') { bad('missing ' + id); continue; }
    const cell = (it.icon || '').replace(/^ps:/, ''); if (!idx.includes(cell)) bad(id + ' icon not in the sheet: ' + it.icon); }
  console.log('5 the five new items exist in the Pokemon tier with real icons'); }

// 6. step 1a: a rock and a chest take 2 to 3 hits of a 40 power move early, with no upgrades (Jess 2026-11-03). Prop damage has no STAB or type.
{ const w = fs.readFileSync(R + '/js/world/world.js', 'utf8'), hp = k => +(w.match(new RegExp('\\b' + k + ': \\{ solid: true, hp: (\\d+)')) || [])[1];
  // Charmander's Ember, Squirtle's Water Gun, Bulbasaur's Tackle; [SpA or Atk base]
  const hits = (base, cat, lv, H) => Math.ceil(H / G.Stats.applyDamageProp(G.Stats.attackFactor(base, base, lv, { cat, dmg: 40 }, 1)));
  for (const k of ['rock', 'chest']) { const H = hp(k); if (!(H > 0)) { bad(k + ' hp not found'); continue; }
    for (const [name, base, cat] of [['Ember', 60, 'special'], ['Water Gun', 50, 'special'], ['Tackle', 49, 'physical']]) for (const lv of [1, 5, 10]) { const n = hits(base, cat, lv, H);
      if (n < 2 || n > 3) bad(k + ' ' + name + ' at level ' + lv + ' takes ' + n + ' hits'); } }
  console.log('6 rocks and chests take 2 to 3 hits of Ember, Water Gun or Tackle at levels 1 to 10'); }

console.log(fail ? fail + ' FAILED' : 'item batch 1 harness: all passed');
process.exit(fail ? 1 : 0);
