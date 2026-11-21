// tools/move_desc_lengths.js: the longest generated move descriptions (G.MoveInfo.desc), to size the cards that show
// them (the run shops' cards and run.hud.forgetMove's wide card, #155). Dev tool only; it never ships.
// Usage from the repo root:  node tools/move_desc_lengths.js [count]   (count defaults to 10)
// Loads the same files as docs/proposals/ui-readers-harness.js, in the same order, with the same stubs.
'use strict';
const fs = require('fs'),
  vm = require('vm');
const ROOT = process.cwd();
const count = Number(process.argv[2]) || 10;
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global;
global.location = { search: '?dev' };
const base = {
  U: {
    TYPE_COLOR: {},
    TYPE_NAME: {},
    clamp: (value, low, high) => Math.max(low, Math.min(high, value)),
    pickN: (list) => list,
    pick: (list) => list[0],
  },
  DEX: [],
  DEX_BY: {},
  Audio: { sfx: () => {} },
  Sprites: { animMeta: () => null, Animator: class {} },
  Log: { on: false },
};
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => ((t[k] = v), true) });
const FILES = [
  'js/core/stats.js',
  'js/systems/stages.js',
  'js/core/simbus.js',
  'js/systems/move-geom.js',
  'js/data/move-attributes.js',
  'js/data/moves-generated.js',
  'js/data/move-overrides.js',
  'js/data/move-handler.js',
  'js/data/move-resolver.js',
  'js/systems/team-cards.js',
  'js/data/moves.js',
  'js/ui/move-info.js',
];
for (const file of FILES) vm.runInThisContext(fs.readFileSync(`${ROOT}/${file}`, 'utf8'), { filename: file });
const rows = Object.keys(G.MoveDefs)
  .map((id) => ({ id, desc: G.MoveInfo.desc(id) }))
  .sort((a, b) => b.desc.length - a.desc.length);
console.log(`${rows.length} moves; the ${Math.min(count, rows.length)} longest descriptions (characters):`);
for (const row of rows.slice(0, count)) console.log(`${String(row.desc.length).padStart(4)}  ${row.id}: ${row.desc}`);
