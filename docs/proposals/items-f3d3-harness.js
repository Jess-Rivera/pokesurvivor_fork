// Item rework F3d-3 offline checks (Node only). Usage from the repo root:  node docs/proposals/items-f3d3-harness.js .
// Real js/data/items.js Shop logic: the price constants, buyTeamItem (afford / owned / unknown / tier checks, exact charge, unlock) and
// buySlot (in order 2 -> 3 -> 4, exact charges, max, cannot afford leaves the save untouched, coins never negative, the loadout cap follows).
// The Shop screen itself (tabs, confirm dialog, buttons) is NOT covered here (browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global; global.location = { search: '?dev' };
global.G = new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
G.U = { pick: a => a[0] };
vm.runInThisContext(fs.readFileSync(R + '/js/data/items.js', 'utf8'), { filename: 'js/data/items.js' });
const I = G.Items;

// 1. prices
if (I.TEAM_ITEM_PRICE !== 100000) bad('team item price ' + I.TEAM_ITEM_PRICE);
if (I.slotPrice(2) !== 9000 || I.slotPrice(3) !== 23000 || I.slotPrice(4) !== 60000) bad('slot prices');
if (I.slotPrice(1) !== null || I.slotPrice(5) !== null) bad('slot 1 is free and 5 does not exist');
console.log('1 prices: items 100000, slots 9000 / 23000 / 60000');

// 2. buyTeamItem
{
  let s = { coins: 99999, teamItems: {} };
  let r = I.buyTeamItem(s, 'redo');
  if (r.ok || r.error !== 'poor' || s.coins !== 99999 || I.unlocked(s, 'redo')) bad('poor: should refuse and change nothing');
  s.coins = 100000; r = I.buyTeamItem(s, 'redo');
  if (!r.ok || s.coins !== 0 || !I.unlocked(s, 'redo') || s.teamItems.redo.from !== 'shop') bad('exact price should buy and unlock');
  s.coins = 500000; r = I.buyTeamItem(s, 'redo');
  if (r.ok || r.error !== 'owned' || s.coins !== 500000) bad('owned: must not charge');
  r = I.buyTeamItem(s, 'leftovers'); if (r.ok || r.error !== 'unknown' || s.coins !== 500000) bad('a pokemon-tier item is not for sale');
  r = I.buyTeamItem(s, 'nope'); if (r.ok || r.error !== 'unknown') bad('unknown id');
  r = I.buyTeamItem(null, 'redo'); if (r.ok) bad('null save');
  const bare = { coins: 100000 }; r = I.buyTeamItem(bare, 'firestone'); if (!r.ok || !bare.teamItems.firestone) bad('should work on a save with no teamItems yet');
  console.log('2 buyTeamItem: poor / exact / owned / unknown / bare save');
}

// 3. buySlot
{
  let s = { coins: 1000000 };
  const seq = [];
  for (let i = 0; i < 4; i++) { const before = s.coins, r = I.buySlot(s); seq.push(r.ok ? [r.slots, before - s.coins] : r.error); }
  if (JSON.stringify(seq) !== JSON.stringify([[2, 9000], [3, 23000], [4, 60000], 'max'])) bad('slot sequence ' + JSON.stringify(seq));
  if (I.runSlots(s) !== 4 || s.coins !== 1000000 - 92000) bad('final slots / coins ' + I.runSlots(s) + ' ' + s.coins);
  s = { coins: 8999 }; let r = I.buySlot(s);
  if (r.ok || r.error !== 'poor' || s.coins !== 8999 || I.runSlots(s) !== 1) bad('poor slot purchase must change nothing');
  s = { coins: 9000 }; r = I.buySlot(s); if (!r.ok || s.coins !== 0 || s.runSlots !== 2) bad('exact slot 2 price');
  r = I.buySlot(s); if (r.ok || s.coins !== 0 || s.runSlots !== 2) bad('slot 3 with 0 coins');
  // the loadout cap follows the bought slots
  s = { coins: 9000, teamItems: { redo: {}, luckyegg: {} }, teamLoadout: ['redo', 'luckyegg'] };
  I.cleanLoadout(s); if (s.teamLoadout.length !== 1) bad('1 slot should hold 1 item');
  s.teamLoadout = ['redo', 'luckyegg']; I.buySlot(s); I.cleanLoadout(s);
  if (s.teamLoadout.length !== 2) bad('after buying slot 2 the loadout may hold 2');
  s = { coins: 1e6, runSlots: 4 }; if (I.buySlot(s).error !== 'max') bad('already at max');
  s = { coins: 1e6, runSlots: 99 }; if (I.runSlots(s) !== 4 || I.buySlot(s).ok) bad('a hand-edited runSlots must clamp to 4');
  console.log('3 buySlot: 2 -> 3 -> 4 in order, exact charges, max, poor leaves the save untouched, loadout cap follows');
}

console.log(fail ? fail + ' FAILED' : 'ALL PASS');
process.exit(fail ? 1 : 0);
