// Mutation check for Move Shop step 4, the shop screens (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/shop-screens-mutate.js
// Each mutation breaks shops.js, player.js, game.js, dev.html, main.js or ui.js in one deliberate way, writes the copy to a temp
// folder, and runs docs/proposals/shop-screens-harness.js against it (SS_<FILE> env vars). The harness must fail every time; a
// mutation it misses is a gap.
// Not mutated, with the reason: js/ui/shop-ui.js drawing (DOM, checked by tools/smoke-ui.js and feel-tested; every rule it shows comes
// from G.Shops.check, which is mutated here); only its step 4b confirm wiring is mutated. G.Debug.trainer / mart (dev only, no game path).
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = { shops: ['js/systems/shops.js', 'SS_SHOPS'], player: ['js/entities/player.js', 'SS_PLAYER'], game: ['js/game.js', 'SS_GAME'],
  dev: ['dev.html', 'SS_DEV'], main: ['js/main.js', 'SS_MAIN'], ui: ['js/ui/ui.js', 'SS_UI'], shopui: ['js/ui/shop-ui.js', 'SS_SHOPUI'],
  levelup: ['js/systems/levelup.js', 'SS_LEVELUP'] };
const M = [
  // ---- price and paying ----
  ['the price drops the run level', 'shops', [['return 5 * Math.floor(G.Stats.levelForTime(t)) * lvl;', 'return 5 * Math.floor(G.Stats.levelForTime(t));']]],
  ['a buy is free', 'shops', [['    G.Silver.spend(c.cost);\n', '']]],
  ['a forgotten move is refunded', 'shops', [['if (!f.replaceMove(f.slots[slot][0].id, id)) return false;', 'if (!f.replaceMove(f.slots[slot][0].id, id)) return false;\n      G.Silver.set(G.Silver.amount + c.cost);']]],
  ['a refused or cancelled pick still charges', 'shops', [['const c = check(shop, f, id);\n    if (!c.ok) return false;', 'const c = check(shop, f, id);\n    if (c.ok) G.Silver.spend(c.cost);\n    if (!c.ok) return false;']]],
  // ---- stock ----
  ['known moves are offered', 'shops', [['G.Moves.poolFor(f.mon).filter((id) => !f.hasMove(id))', 'G.Moves.poolFor(f.mon)'], ['return ids.filter((id) => !f.hasMove(id));', 'return ids;']]],
  ['the stock rerolls on reopen', 'shops', [['if (!ids) shop.stock.set(f,', 'shop.stock.set(f,']]],
  // ---- the rules ----
  ['a purchase switches the active slot', 'shops', [['} else if (!f.addMove(id, true)) return false;', '} else if (!f.addMove(id)) return false;']]],
  ['the 2-buff limit is gone', 'shops', [['capped = isBuff(id) && f.moves.filter((m) => isBuff(m.id)).length >= 2;', 'capped = false;']]],
  ['a fainted member can buy', 'shops', [["if (!f || f.dead) return { ok: false, why: 'Fainted', cost };", "if (!f) return { ok: false, why: 'Fainted', cost };"]]],
  ['a bond slot is on the forget list', 'shops', [['if (g.length === 1 && (!capped || isBuff(g[0].id))) allowed.push(i);', 'if (!capped || isBuff(g[0].id)) allowed.push(i);']]],
  ['a TM anyone can learn', 'shops', [["if (shop.kind === 'mart' && !G.Moves.canUseTm(f.mon, id)) return { ok: false, why: \"Can't learn\", cost };", '']]],
  // ---- the player ----
  ['replaceMove accepts a bonded move', 'player', [['const i = this.slots.findIndex((g) => g.length === 1 && g[0].id === oldId);', 'const i = this.slots.findIndex((g) => g.some((m) => m.id === oldId));']]],
  ['replace appends instead of taking the slot', 'player', [['    this.slots[i] = [m];\n', '    this.slots.splice(i, 1);\n    this.slots.push([m]);\n']]],
  ['addMove stay is ignored', 'player', [['    if (stay) return true;\n', '']]],
  // ---- wiring ----
  ['the shop opens over another screen', 'game', [["    if (['scr-bond', 'scr-pause', 'scr-item', 'scr-levelup', 'scr-shop'].some(G.UI.isOpen)) return false;\n", '']]],
  ['the shop no longer holds back the bond screen', 'game', [["if (['scr-bond', 'scr-pause', 'scr-item', 'scr-levelup', 'scr-shop'].some(G.UI.isOpen)) return; // a shop holds it back until you leave", "if (['scr-bond', 'scr-pause', 'scr-item', 'scr-levelup'].some(G.UI.isOpen)) return;"]]],
  ['the shop screen gets no keys', 'game', [["    if (G.UI.isOpen('scr-shop')) {\n      G.ShopUI.keys();\n      return;\n    }\n", '']]],
  ['the script tag is missing', 'dev', [['<script defer src="js/ui/shop-ui.js"></script>', '']]],
  ['the NEED array misses ShopUI', 'main', [["    'ShopUI',\n", '']]],
  ['SCREENS misses scr-shop', 'ui', [["    'scr-shop', // Move Shop step 4 (js/ui/shop-ui.js), so hideAll closes it too\n", '']]],
  // ---- step 4b: the purchase confirm ----
  ['a pick buys without asking', 'shopui', [['G.UI.ask(msg, opts).then(', 'Promise.resolve(true).then(']]],
  ['keys work under the dialog', 'shopui', [['const busy = () => !cur || cur.asking;', 'const busy = () => !cur;']]],
  ['Cancel on a forget drops the list', 'shopui', [['if (slot == null) cur.forget = null;', 'cur.forget = null;']]],
  // ---- step 4c: Shop Rerolls ----
  ['a reroll is free forever', 'shops', [['    shop.rerolls--;\n', '']]],
  ['a reroll can show the same 4', 'shops', [['pool.filter((id) => !shown.includes(id)),', 'pool,']]],
  ['a reroll offers known moves', 'shops', [['pool = mart ? G.Moves.tmList() : G.Moves.poolFor(f.mon).filter((id) => !f.hasMove(id)),', 'pool = mart ? G.Moves.tmList() : G.Moves.poolFor(f.mon),']]],
  ['the count is per member', 'shops', [['    if (!(shop.rerolls > 0)) return false;\n', "    const rk = f ? 'rr' + f.dex : 'rerolls';\n    if (shop[rk] == null) shop[rk] = shop.rerolls;\n    if (!(shop[rk] > 0)) return false;\n"], ['    shop.rerolls--;\n', '    shop[rk]--;\n']]],
  ['a reroll costs Silver', 'shops', [['    shop.rerolls--;\n', '    shop.rerolls--;\n    G.Silver.spend(1);\n']]],
  ['rerolls work under the dialog', 'shopui', [['function rerollNow() {\n    if (busy() || cur.forget) return;', 'function rerollNow() {\n    if (cur.forget) return;']]],
  ['bans still filter the level-up pool', 'levelup', [['(id) => !pl.hasMove(id) && !(buffs >= 2', '(id) => !pl.hasMove(id) && !(pl.banned && pl.banned.has(id)) && !(buffs >= 2']]],
  ['bans still filter Starting Moves', 'game', [['    f.addMove(G.startMoveOf(mon.dex));\n', '    f.addMove(G.startMoveOf(mon.dex));\n    f.banned = new Set((save.pban && save.pban[mon.dex]) || []);\n']]],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shop-screens-mut-'));
let caught = 0;
for (const [name, which, edits] of M) {
  const [rel, env] = SRC[which];
  let s = fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
  for (const [a, b] of edits) {
    if (!s.includes(a)) { console.log('STALE mutation (pattern not found): ' + name); process.exitCode = 1; s = null; break; }
    s = s.replace(a, b);
  }
  if (s == null) continue;
  const f = path.join(tmp, path.basename(rel));
  fs.writeFileSync(f, s);
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/shop-screens-harness.js'), root], { env: Object.assign({}, process.env, { [env]: f }), encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n'), hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find(l => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')' : ''));
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught < M.length) process.exitCode = 1;
