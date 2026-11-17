// Item rework F3d-2 offline checks (Node only). Usage from the repo root:  node docs/proposals/items-f3d2-harness.js .
// Real js/data/items.js (unlock, starters, cleanLoadout) and the real db.js newSave / migrate / sanitize (pulled out with a test hook,
// the file on disk is NOT modified). Covers: new saves start with Lucky Egg + Amulet Coin and an empty loadout; an OLD save without the
// fields migrates in with the starters and keeps its own data; unlock is once-only; the loadout is cleaned (locked, unknown, duplicate,
// second Stone and over-slot-count entries dropped, order kept); sanitize strips non-team ids; the Inventory's equip rules (#149d:
// lowest empty slot, unequip, swap, one Stone). The live pickup flow, run start and the
// Inventory window are NOT covered here (browser: tools/smoke-ui.js).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = (p, tweak) => vm.runInThisContext(tweak ? tweak(fs.readFileSync(R + '/' + p, 'utf8')) : fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global; global.location = { search: '?dev' };
global.localStorage = { getItem: () => null, setItem() { }, removeItem() { } };
const base = {};
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
G.U = { pick: a => a[0] };
load('js/data/items.js');
const I = G.Items;
let T = null;
try {
  load('js/core/db.js', src => { src = src.replace(/\r\n/g, '\n'); const k = '  return {\n    ready,\n    register'; if (!src.includes(k)) throw new Error('db.js export block moved'); return src.replace(k, '  G.__t = { newSave, migrate, sanitize };\n' + k); });
  T = G.__t;
} catch (e) { bad('db.js did not load for the test: ' + e.message); }

// 1. new save
if (T) {
  const s = T.newSave('Tester');
  if (!s.teamItems || !s.teamItems.luckyegg || !s.teamItems.amuletcoin) bad('new save lacks the starters');
  if (Object.keys(s.teamItems).length !== 2) bad('new save should hold exactly the 2 starters, got ' + Object.keys(s.teamItems));
  if (!Array.isArray(s.teamLoadout) || s.teamLoadout.length) bad('new save loadout should be empty');
  if (!s.regionBest || typeof s.regionBest !== 'object' || Object.keys(s.regionBest).length) bad('new save should have an empty regionBest (#91-2)');
  console.log('1 new save: starters Lucky Egg + Amulet Coin, empty loadout');
}

// 2. old save migrates in
if (T) {
  const old = T.newSave('Old'); delete old.teamItems; delete old.teamLoadout; old.coins = 777; old.runSlots = 2;
  const m = T.migrate(old, 'Old');
  if (!m.teamItems || !m.teamItems.luckyegg || !m.teamItems.amuletcoin) bad('old save did not get the starters');
  if (!Array.isArray(m.teamLoadout)) bad('old save lost loadout array');
  if (m.coins !== 777 || m.runSlots !== 2) bad('migration clobbered existing fields');
  const pre = T.newSave('Pre'); delete pre.regionBest; const pm = T.migrate(pre, 'Pre');
  if (!pm.regionBest || Object.keys(pm.regionBest).length) bad('an old save without regionBest should get an empty one (#91-2)');
  const kept = T.newSave('Kept'); kept.regionBest = { 1: { loop: 1, gyms: 2 } };
  if (T.migrate(kept, 'Kept').regionBest[1].gyms !== 2) bad('migrate must keep an existing regionBest (#91-2)');
  const again = T.migrate(JSON.parse(JSON.stringify(m)), 'Old');
  if (JSON.stringify(Object.keys(again.teamItems).sort()) !== JSON.stringify(Object.keys(m.teamItems).sort())) bad('migrate is not idempotent');
  console.log('2 old save: starters granted, existing data kept, idempotent');
}

// 3. unlock
{
  const s = { teamItems: {} };
  if (!I.unlock(s, 'redo')) bad('first unlock should be true');
  if (I.unlock(s, 'redo')) bad('second unlock must be false');
  if (I.unlock(s, 'leftovers')) bad('a pokemon-tier item must not unlock as a team item');
  if (I.unlock(s, 'nope')) bad('unknown id must not unlock');
  if (!I.unlocked(s, 'redo') || I.unlocked(s, 'firestone')) bad('unlocked() wrong');
  const bare = {}; if (!I.unlock(bare, 'redo') || !bare.teamItems.redo) bad('unlock should create teamItems on a bare save');
  console.log('3 unlock: once only, team tier only');
}

// 4. cleanLoadout
{
  const mk = (loadout, slots) => { const s = { teamItems: {}, teamLoadout: loadout, runSlots: slots }; for (const i of I.LIST) if (i.tier === 'run') s.teamItems[i.id] = { at: 1 }; return s; };
  let s = mk(['redo', 'luckyegg'], 4); I.cleanLoadout(s);
  if (JSON.stringify(s.teamLoadout) !== '["redo","luckyegg"]') bad('order not kept: ' + s.teamLoadout);
  s = mk(['redo', 'luckyegg', 'amuletcoin'], 1); I.cleanLoadout(s);
  if (JSON.stringify(s.teamLoadout) !== '["redo"]') bad('slot cap (1) not applied: ' + s.teamLoadout);
  s = mk(['firestone', 'waterstone', 'redo'], 4); I.cleanLoadout(s);
  if (JSON.stringify(s.teamLoadout) !== '["firestone",null,"redo"]') bad('second Stone should be dropped but its slot stays empty: ' + JSON.stringify(s.teamLoadout));
  s = mk(['redo', 'redo', 'bogus', 'leftovers', null], 4); I.cleanLoadout(s);
  if (JSON.stringify(s.teamLoadout) !== '["redo"]') bad('dupes / unknown / pokemon-tier not dropped: ' + s.teamLoadout);
  s = mk(['redo'], 4); delete s.teamItems.redo; I.cleanLoadout(s);
  if (s.teamLoadout.length) bad('a LOCKED item must not stay in the loadout');
  s = { teamItems: { redo: {} }, teamLoadout: 'garbage' }; I.cleanLoadout(s);
  if (!Array.isArray(s.teamLoadout) || s.teamLoadout.length) bad('non-array loadout not reset');
  s = { teamItems: { redo: {} }, teamLoadout: ['redo', 'redo'] }; I.cleanLoadout(s);
  if (s.teamLoadout.length !== 1) bad('default 1 slot with no runSlots field');
  s = mk(['redo', null, 'luckyegg'], 4); I.cleanLoadout(s);
  if (JSON.stringify(s.teamLoadout) !== '["redo",null,"luckyegg"]') bad('an empty slot in the middle must keep its position: ' + JSON.stringify(s.teamLoadout));
  s = mk(['redo', null, 'luckyegg'], 2); I.cleanLoadout(s);
  if (JSON.stringify(s.teamLoadout) !== '["redo"]') bad('slot 3 item must go with 2 slots, trailing empty trimmed: ' + JSON.stringify(s.teamLoadout));
  s = mk([null, null, 'redo'], 4); I.cleanLoadout(s);
  if (JSON.stringify(s.teamLoadout) !== '[null,null,"redo"]') bad('leading empties must stay: ' + JSON.stringify(s.teamLoadout));
  console.log('4 loadout: order and empty slots kept, slot cap, one Stone, no dupes / unknown / locked');
}

// 5. sanitize
if (T) {
  const s = T.newSave('S'); s.teamItems.leftovers = { at: 1 }; s.teamItems.fake = { at: 1 }; s.teamLoadout = ['luckyegg', 'leftovers'];
  T.sanitize(s);
  if (s.teamItems.leftovers || s.teamItems.fake) bad('sanitize kept a non-team id');
  if (JSON.stringify(s.teamLoadout) !== '["luckyegg"]') bad('sanitize loadout wrong: ' + s.teamLoadout);
  console.log('5 sanitize: non-team ids stripped, loadout cleaned');
}

// 6. the Main Menu Inventory's equip rules (#149d, Jess 2026-11-17): Equip fills the lowest empty bought slot; Unequip keeps
// the other slots' places; Swap puts the item in a chosen slot and the old one leaves; one Stone: a second Stone takes the
// first one's slot (Equip and Swap alike)
{
  const mk = (loadout, slots) => { const s = { teamItems: {}, teamLoadout: loadout, runSlots: slots }; for (const i of I.LIST) if (i.tier === 'run') s.teamItems[i.id] = { at: 1 }; return s; };
  const stones = I.LIST.filter((i) => i.tier === 'run' && i.group === 'stone').map((i) => i.id);
  const plain = I.LIST.filter((i) => i.tier === 'run' && !i.group).map((i) => i.id);
  const stonesIn = (s) => s.teamLoadout.filter((id) => stones.includes(id)).length;
  // a gap below a filled slot: Equip lands in the gap, the lowest empty slot
  let s = mk([null, plain[0]], 4), r = I.equipTeamItem(s, plain[1]);
  const lowestEmpty = 0;
  if (!r.ok || r.slot !== lowestEmpty || s.teamLoadout[lowestEmpty] !== plain[1] || s.teamLoadout[1] !== plain[0]) bad('Equip must fill the lowest empty slot and leave the others: ' + JSON.stringify(s.teamLoadout));
  if (r.replaced !== null) bad('Equip into an empty slot replaces nothing');
  // every bought slot full: Equip refuses and changes nothing
  s = mk(plain.slice(0, 2), 2); const before = JSON.stringify(s.teamLoadout); r = I.equipTeamItem(s, plain[2]);
  if (r.ok || r.error !== 'full' || JSON.stringify(s.teamLoadout) !== before) bad('Equip with every slot full must refuse and change nothing');
  // an item already equipped, or locked, is refused
  s = mk([plain[0]], 2); if (I.equipTeamItem(s, plain[0]).ok) bad('Equip of an equipped item must refuse');
  s = mk([], 2); delete s.teamItems[plain[0]]; if (I.equipTeamItem(s, plain[0]).ok || s.teamLoadout.length) bad('Equip of a locked item must refuse');
  // Unequip empties only its slot
  s = mk(plain.slice(0, 3), 4); r = I.unequipTeamItem(s, plain[1]);
  if (!r.ok || s.teamLoadout[1] || s.teamLoadout[0] !== plain[0] || s.teamLoadout[2] !== plain[2]) bad('Unequip must empty only its slot: ' + JSON.stringify(s.teamLoadout));
  if (I.unequipTeamItem(s, plain[3]).ok) bad('Unequip of an item not equipped must refuse');
  // Swap into a chosen slot: the old item leaves, the others stay
  s = mk(plain.slice(0, 4), 4); r = I.swapTeamItem(s, plain[4], 2);
  if (!r.ok || r.slot !== 2 || r.replaced !== plain[2] || s.teamLoadout[2] !== plain[4] || s.teamLoadout.includes(plain[2]) || s.teamLoadout.filter(Boolean).length !== 4) bad('Swap must replace only the chosen slot: ' + JSON.stringify(s.teamLoadout));
  s = mk(plain.slice(0, 2), 2); if (I.swapTeamItem(s, plain[2], 3).ok) bad('Swap into a slot not bought must refuse');
  // one Stone: a second Stone takes the first one's slot, by Equip (with room) and by Swap (any slot chosen)
  s = mk([plain[0], stones[0]], 4); r = I.equipTeamItem(s, stones[1]);
  if (!r.ok || r.slot !== 1 || r.replaced !== stones[0] || stonesIn(s) !== 1) bad('Equip of a second Stone must take the first one\'s slot: ' + JSON.stringify(s.teamLoadout));
  s = mk([plain[0], stones[0], plain[1], plain[2]], 4); r = I.swapTeamItem(s, stones[1], 0);
  if (!r.ok || r.slot !== 1 || r.replaced !== stones[0] || s.teamLoadout[0] !== plain[0] || stonesIn(s) !== 1) bad('Swap of a second Stone must take the first one\'s slot, not the chosen one: ' + JSON.stringify(s.teamLoadout));
  console.log('6 equip rules: lowest empty slot, full refuses, unequip keeps places, swap, one Stone');
}

console.log(fail ? fail + ' FAILED' : 'ALL PASS');
process.exit(fail ? 1 : 0);
