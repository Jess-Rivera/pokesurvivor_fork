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

// ---------- #173: a held catch is a whole copy (docs/AI Outputs/Issue-173/173 - Held Catch Compare Slice Opening.md) ----------
const COPY_FIELDS = ['u', 'd', 't', 'm', 'n', 'i', 'g', 'x', 'y', 'a'];
/** Every field a box copy has, each in range, read through G.Copies.read (the game's own view of a copy). */
function wholeCopyProblems(held) {
  const copy = held.copy;
  if (!copy) return ['no copy'];
  const problems = COPY_FIELDS.filter((key) => copy[key] == null).map((key) => 'missing ' + key);
  if (problems.length) return problems;
  const full = Copies.read(copy, G.DB.save);
  if (copy.d !== held.dex) problems.push('dex');
  if (full.iv.length !== 6 || full.iv.some((iv) => !(iv >= 0 && iv <= 31))) problems.push('IVs');
  if (!['male', 'female', 'none'].includes(full.gender)) problems.push('gender');
  if (!(copy.x >= 0 && copy.x <= 255 && copy.y >= 0 && copy.y <= 255)) problems.push('scales');
  if (!full.ability) problems.push('ability');
  if (!full.natureName) problems.push('nature');
  return problems;
}
const withoutBox = ({ b, ...rest }) => rest;
const boxCopyOf = (save, u) => save.box.find((c) => c.u === u);

{
  // 8 a held catch (and a Lost recruit, which is held through the same hold) carries a whole copy, its nature kept
  holdAll();
  const list = C.held;
  list.forEach((held, i) => {
    const problems = wholeCopyProblems(held);
    if (problems.length) bad('8 ' + held.name + ' is a whole copy: ' + problems.join(', '));
    if (held.copy && held.copy.n !== CATCHES[i].nature) bad('8 ' + held.name + ' keeps the rescue nature');
  });
  C.settle(false, saveWithFree(10));
  console.log('8 every held catch is a whole copy in range, with its rescue nature');
}
{
  // 9 placed copies are the held ones, field for field; with room (settle) and from the list (resolve)
  const roomy = saveWithFree(10);
  holdAll();
  const heldRoomy = C.held;
  C.settle(true, roomy);
  for (const held of heldRoomy) {
    const placed = held.copy && boxCopyOf(roomy, held.copy.u);
    if (!placed || !same(withoutBox(placed), withoutBox(held.copy))) bad('9 settle places ' + held.name + ' as held');
  }
  const full = saveWithFree(3);
  holdAll();
  C.settle(true, full);
  const waiting = C.heldCatches(full).map((h) => ({ ...h })),
    keeps = [true, false, true, false, true];
  C.resolve(keeps, full);
  waiting.forEach((held, i) => {
    const placed = held.copy && boxCopyOf(full, held.copy.u);
    if (keeps[i] && (!placed || !same(withoutBox(placed), withoutBox(held.copy)))) bad('9 Keep places ' + held.name + ' as held');
    if (!keeps[i] && placed) bad('9 a sold ' + held.name + ' leaves no copy with its UUID');
  });
  console.log('9 Keep places the held copy unchanged (same UUID); Sell leaves no copy with it');
}
{
  // 10 two held catches of one species roll apart
  C.hold(CATCHES[0]);
  C.hold(CATCHES[0]);
  const [first, second] = C.held;
  if (!first.copy || !second.copy || first.copy.u === second.copy.u) bad('10 two Dratini hold different UUIDs');
  C.settle(false, saveWithFree(10));
  console.log('10 two held catches of one species have different UUIDs');
}
{
  // 11 an old save's held catch (no copy) still places, with a fresh roll, and still sells
  const old = saveWithFree(3);
  old.heldCatches = CATCHES.slice(0, 2).map((mon) => ({ ...mon }));
  const boxBefore = old.box.length,
    coinsBefore = old.coins;
  const out = C.resolve([true, false], old);
  const added = old.box.slice(boxBefore);
  if (!out.ok || added.length !== 1 || added[0].d !== CATCHES[0].dex || added[0].n !== CATCHES[0].nature)
    bad('11 an old held catch is placed with its nature');
  if (added[0] && wholeCopyProblems({ dex: CATCHES[0].dex, copy: added[0] }).length) bad('11 its fresh roll is whole');
  if (old.coins !== coinsBefore + priceOf(CATCHES[1])) bad('11 an old held catch still sells');
  console.log('11 an old held catch without a copy places with a fresh roll and sells');
}
{
  // 12 the catch window rolls the copy when it opens; a caught throw holds that same copy
  const save = G.DB.save;
  save.belt = { size: 6, slots: ['poke', 'poke', null, null, null, null], unlocked: [] };
  const rescue = { dex: 133, name: 'Eevee', nature: 11, natureName: 'Timid', timeFraction: 0 };
  const session = C.begin(rescue, () => 0.5);
  if (!session || !session.copy) bad('12 the open catch has its copy');
  else {
    if (session.copy.n !== rescue.nature) bad('12 the window copy keeps the rescue nature');
    const rolled = { ...session.copy };
    const result = C.throwBall('poke', () => 0); // every roll passes
    const held = C.held.find((h) => h.copy && h.copy.u === rolled.u);
    if (result !== 'caught' || !held || !same(held.copy, rolled)) bad('12 the caught catch holds the copy rolled at open');
  }
  C.begin(rescue, () => 0.5);
  C.letGo();
  if (C.held.length !== 1) bad('12 a let go catch holds nothing');
  C.settle(false, saveWithFree(10));
  console.log('12 the copy rolled when the window opens is the one held after a catch');
}
{
  // 13 the save load cleans a held copy like a box copy; a held copy too broken to clean is dropped, its catch kept
  const save = saveWithFree(0);
  holdAll(CATCHES.slice(0, 2));
  C.settle(true, save); // no room: both wait in save.heldCatches
  const [first, second] = C.heldCatches(save);
  first.copy.i = '!!!!!!'; // not IV characters
  first.copy.x = 9999;
  second.copy.d = 99999; // no such species
  Copies.clean(save);
  const [cleanFirst, cleanSecond] = C.heldCatches(save);
  if (!cleanFirst || !first.copy || wholeCopyProblems(cleanFirst).length) bad('13 a held copy out of range is cleaned in range');
  if (!cleanSecond || cleanSecond.copy) bad('13 a held copy past cleaning is dropped, the catch kept');
  console.log('13 the load cleans held copies; a broken one falls back to a fresh roll');
}

console.log(fail ? 'keep-sell harness: ' + fail + ' FAIL' : 'keep-sell harness: all passed');
process.exit(fail ? 1 : 0);
