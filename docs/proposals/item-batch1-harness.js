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
load('js/core/stats.js'); load('js/systems/stages.js'); load('js/data/evolvable.js'); load('js/data/items.js'); load('js/data/ground-items.js'); load('js/entities/player.js');
const P = G.Player, I = G.Items;
if (!P) { console.log('FAIL G.Player missing'); process.exit(1); }

// A real Player without its constructor: the fields the methods read, fresh multipliers and no upgrades
const mk = () => Object.assign(Object.create(P.prototype), { item: null, runItems: [], benched: false, level: 30, baseAtkStat: 80, baseSpAStat: 80, atkMul: 1, physMul: 1, specMul: 1, defItemMul: 1, spdMul: 1, critDmgMul: 1, critChance: 0, cdMul: 1, dex: 1, dodgeT: 0, dodges: { gap: 0, cd: [7, 0] },
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

// 7. Eviolite: species hand-picked from the mainline evolution lines. Can still evolve: Bulbasaur, Ivysaur, Pikachu, Eevee, Scyther, Pichu. Cannot: Venusaur, Charizard, Mewtwo, Ditto.
{ for (const [dex, want] of [[1, 1.5], [2, 1.5], [25, 1.5], [133, 1.5], [123, 1.5], [172, 1.5], [3, 1], [6, 1], [150, 1], [132, 1]]) { const p = mk(); p.dex = dex; p.equip('eviolite');
    if (!near(p.defItemMul, want)) bad('eviolite on dex ' + dex + ' x' + p.defItemMul + ' want ' + want); p.equip(null); if (!near(p.defItemMul, 1)) bad('eviolite drift on dex ' + dex); }
  const a = mk(), b = mk(); a.dex = 1; b.dex = 6; a.equip('eviolite'); a.swapHeldItem(b); if (!near(a.defItemMul, 1) || !near(b.defItemMul, 1)) bad('eviolite moved to a final form does nothing, and leaves nothing behind');
  console.log('7 Eviolite 1.5x only on species that can still evolve; clean on unequip and swap'); }

// 7b. the defense multiplier reaches a REAL hit: Player.hurt with an enemy attack, for both categories. Expected from G.Stats.applyPlayerDefense: (factor / (defense x mul) + 2) x 0.5.
{ G.Log = { on: false }; G.Types = { mult: () => 1, label: () => '' }; G.Weather = { mult: () => 1 };
  const taken = (id, cat, dex = 1) => { const p = mk(); p.dex = dex; p.mon = { stats: [50, 50, 80, 50, 80, 50], types: ['normal'] }; p.hp = p.maxHp = 1e6; p.invuln = 0; p.flyT = 0; p.dmgReduce = 0; p.activeGroup = () => []; p.anim = { play() { } }; p.clearEffects = () => { };
    if (id) p.equip(id); p.hurt(5000, 'normal', false, { factor: 5000, cat, mul: 1 }, null); return 1e6 - p.hp; };
  for (const cat of ['physical', 'special']) { const d = (cat === 'special' ? G.Stats.spDef(80, 30) : G.Stats.defense(80, 30)), want = m => (5000 / (d * m) + 2) * 0.5;
    if (!near(taken(null, cat), want(1), 1e-6)) bad('no item ' + cat + ' hit ' + taken(null, cat) + ' want ' + want(1));
    if (!near(taken('metalpowder', cat), want(1.15), 1e-6)) bad('metal powder ' + cat + ' hit ' + taken('metalpowder', cat) + ' want ' + want(1.15));
    if (!near(taken('eviolite', cat, 1), want(1.5), 1e-6)) bad('eviolite ' + cat + ' hit ' + taken('eviolite', cat, 1) + ' want ' + want(1.5));
    if (!near(taken('eviolite', cat, 6), want(1), 1e-6)) bad('eviolite on a final form must not change a hit: ' + taken('eviolite', cat, 6)); }
  console.log('7b Eviolite and Metal Powder reduce real physical and special hits; Eviolite does nothing on a final form'); }

// 8. Metal Powder, Quick Powder, Bright Powder
{ const m = mk(); m.equip('metalpowder'); if (!near(m.defItemMul, 1.15)) bad('metal powder x' + m.defItemMul); m.equip(null); if (!near(m.defItemMul, 1)) bad('metal powder drift');
  const q = mk(); q.equip('quickpowder'); if (!near(q.spdMul, 1.15)) bad('quick powder x' + q.spdMul); q.equip(null); if (!near(q.spdMul, 1)) bad('quick powder drift');
  const secs = (o) => { let t = 0; while (o.dodges.cd[0] > 0 && t < 20) { o.tickDodges(0.01); t += 0.01; } return t; };
  const none = mk(), bp = mk(), bench = mk(); bp.equip('brightpowder'); bench.equip('brightpowder'); bench.benched = true;
  if (Math.abs(secs(none) - 7) > 0.02) bad('dodge cooldown without the item ' + secs(none));
  const got = secs(bp); if (Math.abs(got - 5.95) > 0.02) bad('bright powder: 7 s should take 5.95 s, took ' + got);
  if (Math.abs(secs(bench) - 7) > 0.02) bad('a benched holder does not speed the charges');
  const mid = mk(); mid.equip('brightpowder'); mid.dodgeT = 0.3; const c0 = mid.dodges.cd[0]; mid.tickDodges(1); if (mid.dodges.cd[0] !== c0) bad('charges still wait while a dodge runs');
  console.log('8 Metal Powder 1.15x defense, Quick Powder 1.15x speed, Bright Powder 7 s to 5.95 s only on the field'); }

// 9. pickup lines: hand-written expected text. Every item used up on touch shows exactly one line with its real numbers; bag berries stay "stored".
{ const log = []; G.FX = { notice: (x, y, s) => log.push(s), dmgText: (x, y, s) => log.push('dmg:' + s), ring() { } };
  const team = () => ({ berries: [], stgTeam: {}, hp: 10, maxHp: 100, x: 0, y: 0, bodyH: 20, heal(a) { this.hp += a; } });
  const WANT = { oran: 'Oran Berry: heal 30% HP', sitrus: 'Sitrus Berry: heal 50% HP', 'x-attack': 'X Attack: team Attack +1, 30 s', 'x-defense': 'X Defense: team Defense +1, 30 s', 'x-sp-atk': 'X Sp. Atk: team Sp. Atk +1, 30 s', 'x-sp-def': 'X Sp. Def: team Sp. Def +1, 30 s', 'x-speed': 'X Speed: team Speed +1, 30 s',
    occa: 'Occa Berry: Fire guard, 10 s', chilan: 'Chilan Berry: Normal guard, 10 s', liechi: 'Liechi Berry: team Attack +1, 10 s', apicot: 'Apicot Berry: team Sp. Def +1, 10 s', lansat: 'Lansat Berry: crit +20%, 10 s', kee: 'Kee Berry: Defense +10%, 10 s', maranga: 'Maranga Berry: Sp. Def +10%, 10 s',
    pinap: 'Pinap Berry: drops +1%, 60 s', 'silver-pinap': 'Silver Pinap Berry: drops +5%, 60 s', 'golden-pinap': 'Golden Pinap Berry: drops +10%, 60 s' };
  for (const id in WANT) { log.length = 0; G.Grounds.apply(team(), id); if (log.length !== 1 || log[0] !== WANT[id]) bad(id + ' shows ' + JSON.stringify(log)); }
  for (let i = 0; i < 40; i++) { log.length = 0; const p = team(); G.Grounds.apply(p, 'starf'); const st = Object.keys(p.stgTeam)[0], label = G.Stages.LABEL[st]; if (log[0] !== 'Starf Berry: ' + label + ' +2, 10 s') bad('starf names the stat it raised: ' + log[0] + ' / ' + st); }
  for (const it of G.Grounds.LIST) { log.length = 0; const p = team(); G.Grounds.apply(p, it.id);
    if (it.bag) { if (log.length !== 1 || log[0] !== 'dmg:' + it.name + ' stored') bad(it.id + ' bag line ' + JSON.stringify(log)); continue; }
    if (log.length !== 1 || !log[0].startsWith(it.name + ': ')) bad(it.id + ' needs one line, got ' + JSON.stringify(log));
    const keys = Object.keys(p.stgTeam), secs = (log[0].match(/(\d+) s$/) || [])[1];   // the line's seconds are the real timer
    if (keys.length && +secs !== p.stgTeam[keys[0]][0].dur) bad(it.id + ' says ' + secs + ' s, runs ' + p.stgTeam[keys[0]][0].dur); }
  { const p = team(); G.Grounds.apply(p, 'oran'); if (p.hp !== 40) bad('oran really heals 30'); }
  console.log('9 pickup lines: one per used-up item, real seconds, Starf names its stat, bag berries say stored'); }

// 10. the float text: read from fx.js with its globals stubbed. Never dropped at the cap, lasts longer than a number, and stacks when two land together.
{ const saved = G.FX; G.Settings = { fx: 0, get: () => true }; G.U.rand = () => 0; load('js/entities/fx.js'); const F = G.FX;
  let got = []; const ctx = new Proxy({}, { get: (t, k) => (k === 'fillText' ? (s, x, y) => got.push({ s, y }) : k in t ? t[k] : () => { }), set: (t, k, v) => { t[k] = v; return true; } });
  F.clear(); for (let i = 0; i < 200; i++) F.dmgText(0, 0, 'x');  F.notice(0, 100, 'A'); F.notice(0, 100, 'B');
  F.draw(ctx); const a = got.find(t => t.s === 'A'), b = got.find(t => t.s === 'B');
  if (!a || !b) bad('a line is dropped at the text cap'); else if (a.y - b.y < 10) bad('two lines together must not overlap: ' + a.y + ' / ' + b.y);
  F.clear(); F.dmgText(0, 0, 'num'); F.notice(0, 0, 'line'); F.update(1); got = []; F.draw(ctx);
  if (got.some(t => t.s === 'num') || !got.some(t => t.s === 'line')) bad('after 1 s the line stays and the number is gone: ' + JSON.stringify(got));
  F.update(0.7); got = []; F.draw(ctx); if (got.some(t => t.s === 'line')) bad('the line ends after its 1.6 s');
  G.FX = saved; console.log('10 pickup text survives the cap, outlasts damage numbers, ends, and stacks'); }

console.log(fail ? fail + ' FAILED' : 'item batch 1 harness: all passed');
process.exit(fail ? 1 : 0);
