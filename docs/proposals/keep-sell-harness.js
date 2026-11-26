// Keep-or-sell list (#146) offline checks (Node only). Usage from the repo root:  node docs/proposals/keep-sell-harness.js .
// Real js/systems/catch.js, js/systems/copies.js and js/core/db.js (a guest save, never stored) with the data files they
// read. Every check is a relation from the slice opening's end-goal test (docs/AI Outputs/Issue-146/146 - Keep or Sell
// Slice Opening.md; docs/TEST-FIRST.md): placed or sold never both or neither, placed at most the free places, the box
// grows by the placed count, coins rise by the sold prices, copies already in the box never change. No number is read
// back from the code's own output.
const fs = require('fs'),
  vm = require('vm');
const R = process.argv[2] || '.';
const load = (p) => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
global.window = global;
global.G = { Audio: { sfx() {} }, Coop: { active: false } };
load('js/data/pokedex.js');
load('js/data/sprites-meta.js');
load('js/data/species-traits.js');
load('js/data/balls.js');
load('js/systems/copies.js');
load('js/core/db.js');
load('js/systems/catch.js');
G.DB.playAsGuest();
const C = G.Catch,
  Copies = G.Copies;
let fail = 0;
const bad = (message) => {
  fail++;
  if (fail < 30) console.log('FAIL', message);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const CATCHES = [
  { dex: 147, name: 'Dratini', nature: 3, natureName: 'Adamant' },
  { dex: 133, name: 'Eevee', nature: 11, natureName: 'Timid' },
  { dex: 58, name: 'Growlithe', nature: 14, natureName: 'Jolly' },
  { dex: 43, name: 'Oddish', nature: 16, natureName: 'Modest' },
  { dex: 16, name: 'Pidgey', nature: 12, natureName: 'Hasty' },
];
/** A save whose boxes leave `free` places, holding Caterpie copies in box order. */
function saveWithFree(free) {
  const boxes = Copies.BOX_START || 2,
    filled = boxes * 500 - free;
  return {
    coins: 1000,
    boxCount: boxes,
    owned: {},
    shiny: {},
    box: Array.from({ length: filled }, (_, i) => {
      const copy = { u: 'caterpie' + i, d: 10 };
      if (i >= 500) copy.b = Math.floor(i / 500);
      return copy;
    }),
  };
}
const holdAll = (list = CATCHES) => list.forEach((mon) => C.hold(mon));
const priceOf = (mon) => Copies.priceFor(mon.dex, false);

{
  // 1 room for every catch: nothing pending, all placed, no list
  const save = saveWithFree(10),
    before = save.box.length;
  holdAll();
  const out = C.settle(true, save);
  if (out.pending.length) bad('1 with room for all, nothing is pending');
  if (out.placed.length !== CATCHES.length) bad('1 with room for all, every catch is placed');
  if (save.box.length !== before + CATCHES.length) bad('1 the box grows by every catch');
  if (save.heldCatches && save.heldCatches.length) bad('1 with room for all, the save holds no catches');
  console.log('1 room for all: every catch placed, nothing pending');
}
{
  // 2 a quit keeps nothing and holds nothing
  const save = saveWithFree(1);
  holdAll();
  const out = C.settle(false, save);
  if (out.placed.length || out.pending.length || (save.heldCatches && save.heldCatches.length)) bad('2 a quit places and holds nothing');
  console.log('2 a quit: nothing placed, nothing held');
}
{
  // 3 no room: nothing placed or sold yet, every catch held in the save, coins unchanged
  const save = saveWithFree(3),
    boxBefore = JSON.stringify(save.box),
    coinsBefore = save.coins;
  holdAll();
  const out = C.settle(true, save);
  if (out.placed.length) bad('3 without room, nothing is placed before the list');
  if (out.pending.length !== CATCHES.length) bad('3 every catch is pending');
  if (!Array.isArray(save.heldCatches) || save.heldCatches.length !== CATCHES.length) bad('3 the save holds every catch');
  if (JSON.stringify(save.box) !== boxBefore || save.coins !== coinsBefore) bad('3 the box and coins wait for the list');
  if (C.held.length) bad('3 the run list is cleared');
  console.log('3 no room: every catch held in the save, the box and coins unchanged');
}
{
  // 4 Keeps past the free places are refused and change nothing
  const save = saveWithFree(3);
  holdAll();
  C.settle(true, save);
  const snapshot = JSON.stringify(save);
  const out = C.resolve([true, true, true, true, false], save);
  if (out.ok) bad('4 four Keeps with three free places are refused');
  if (JSON.stringify(save) !== snapshot) bad('4 a refused resolve changes nothing');
  console.log('4 Keeps past the free places refused, nothing changed');
}
{
  // 5 a valid answer: each catch placed or sold, never both or neither; box and coins follow exactly
  const save = saveWithFree(3),
    free = Copies.freePlaces(save),
    oldCopies = JSON.stringify(save.box);
  holdAll();
  C.settle(true, save);
  const keeps = [true, false, true, false, true],
    coinsBefore = save.coins,
    boxBefore = save.box.length;
  const out = C.resolve(keeps, save);
  if (!out.ok) bad('5 three Keeps with three free places are accepted');
  const placed = out.placed || [],
    sold = (out.sold || []).map((entry) => entry.name);
  for (const mon of CATCHES) {
    const inPlaced = placed.includes(mon.name),
      inSold = sold.includes(mon.name);
    if (inPlaced === inSold) bad('5 ' + mon.name + ' is placed or sold, exactly one');
  }
  CATCHES.forEach((mon, i) => {
    if (keeps[i] !== placed.includes(mon.name)) bad('5 ' + mon.name + ' follows its mark');
  });
  if (placed.length > free) bad('5 placed at most the free places');
  if (save.box.length !== boxBefore + placed.length) bad('5 the box grows by exactly the placed count');
  const soldPrice = CATCHES.filter((mon, i) => !keeps[i]).reduce((sum, mon) => sum + priceOf(mon), 0);
  if (save.coins !== coinsBefore + soldPrice) bad('5 coins rise by exactly the sold prices');
  if (out.coins !== soldPrice) bad('5 the result names the coins paid');
  if (JSON.stringify(save.box.slice(0, boxBefore)) !== oldCopies) bad('5 no copy already in the box changes');
  const newCopies = save.box.slice(boxBefore);
  const keptCatches = CATCHES.filter((mon, i) => keeps[i]);
  if (!same(newCopies.map((c) => [c.d, c.n]), keptCatches.map((mon) => [mon.dex, mon.nature])))
    bad('5 each new copy is its catch, with the catch nature');
  if (save.heldCatches && save.heldCatches.length) bad('5 the save no longer holds the catches');
  console.log('5 a valid answer: each catch placed or sold once; box and coins follow; old copies untouched');
}
{
  // 6 places freed before resolving count (Make Room)
  const save = saveWithFree(3);
  holdAll();
  C.settle(true, save);
  if (C.resolve([true, true, true, true, false], save).ok) bad('6 four Keeps refused before making room');
  save.box.splice(0, 2); // two box copies sold in the Team menu
  const out = C.resolve([true, true, true, true, true], save);
  if (!out.ok || out.placed.length !== CATCHES.length) bad('6 freed places count: five Keeps fit in five free places');
  console.log('6 places freed before resolving count toward the Keeps');
}
{
  // 7 the game closed with the list unanswered: the next load sells every held catch
  const save = saveWithFree(3);
  holdAll();
  C.settle(true, save);
  const coinsBefore = save.coins,
    boxBefore = save.box.length;
  const out = C.sellHeld(save);
  const total = CATCHES.reduce((sum, mon) => sum + priceOf(mon), 0);
  if (save.coins !== coinsBefore + total || out.coins !== total) bad('7 coins rise by every held catch price');
  if (save.box.length !== boxBefore || (out.placed && out.placed.length)) bad('7 nothing is placed on load');
  if ((out.sold || []).length !== CATCHES.length) bad('7 every held catch is sold');
  if (save.heldCatches && save.heldCatches.length) bad('7 the save no longer holds the catches');
  // an old save without the field loads unchanged
  const old = saveWithFree(3),
    oldSnapshot = JSON.stringify(old),
    none = C.sellHeld(old);
  if (JSON.stringify(old) !== oldSnapshot || none.sold.length || none.coins) bad('7 an old save without the field is unchanged');
  console.log('7 an unanswered list sells every held catch on the next load; an old save is unchanged');
}

console.log(fail ? 'keep-sell harness: ' + fail + ' FAIL' : 'keep-sell harness: all passed');
process.exit(fail ? 1 : 0);
