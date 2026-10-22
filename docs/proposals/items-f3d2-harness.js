// Item rework F3d-2 offline checks (Node only). Usage from the repo root:  node docs/proposals/items-f3d2-harness.js .
// Real js/data/items.js (unlock, starters, cleanLoadout) and the real db.js newSave / migrate / sanitize (pulled out with a test hook,
// the file on disk is NOT modified). Covers: new saves start with Lucky Egg + Amulet Coin and an empty loadout; an OLD save without the
// fields migrates in with the starters and keeps its own data; unlock is once-only; the loadout is cleaned (locked, unknown, duplicate,
// second Stone and over-slot-count entries dropped, order kept); sanitize strips non-team ids. The live pickup flow, run start and the
// Inventory window are NOT covered here (browser).
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
  load('js/core/db.js', src => { const k = '  return {\n    ready, register'; if (!src.includes(k)) throw new Error('db.js export block moved'); return src.replace(k, '  G.__t = { newSave, migrate, sanitize };\n' + k); });
  T = G.__t;
} catch (e) { bad('db.js did not load for the test: ' + e.message); }

// 1. new save
if (T) {
  const s = T.newSave('Tester');
  if (!s.teamItems || !s.teamItems.luckyegg || !s.teamItems.amuletcoin) bad('new save lacks the starters');
  if (Object.keys(s.teamItems).length !== 2) bad('new save should hold exactly the 2 starters, got ' + Object.keys(s.teamItems));
  if (!Array.isArray(s.teamLoadout) || s.teamLoadout.length) bad('new save loadout should be empty');
  console.log('1 new save: starters Lucky Egg + Amulet Coin, empty loadout');
}

// 2. old save migrates in
if (T) {
  const old = T.newSave('Old'); delete old.teamItems; delete old.teamLoadout; old.coins = 777; old.runSlots = 2;
  const m = T.migrate(old, 'Old');
  if (!m.teamItems || !m.teamItems.luckyegg || !m.teamItems.amuletcoin) bad('old save did not get the starters');
  if (!Array.isArray(m.teamLoadout)) bad('old save lost loadout array');
  if (m.coins !== 777 || m.runSlots !== 2) bad('migration clobbered existing fields');
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

console.log(fail ? fail + ' FAILED' : 'ALL PASS');
process.exit(fail ? 1 : 0);
