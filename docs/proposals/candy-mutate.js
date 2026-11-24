// Mutation check for #139 8a, the drop function and Exp Candy (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/candy-mutate.js
// Each mutation breaks one file in one deliberate way and runs candy-harness.js and drops-harness.js against the copy
// (CANDY_<NAME> points at it). Either harness failing catches it; a miss is a gap.
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const DROPS = 'js/data/drops.js',
  CANDY = 'js/systems/candy.js',
  COPIES = 'js/systems/copies.js',
  GYMS = 'js/data/gyms.js';
const ENV = { [DROPS]: 'CANDY_DROPS', [CANDY]: 'CANDY_CANDY', [COPIES]: 'CANDY_COPIES', [GYMS]: 'CANDY_GYMS' };
const M = [
  ['tiers rolled commonest first', DROPS, 'for (let i = TIER_NAMES.length - 1; i > 0; i--) {', 'for (let i = 1; i < TIER_NAMES.length; i++) {'],
  ['the roll does not stop at the first hit', DROPS, 'if (tiers[name] && rnd() < K.tierChance[name]) return name;', 'if (tiers[name] && rnd() < K.tierChance[name]) var hit = hit || name;'],
  ['Common is never landed on', DROPS, "    return 'common';\n  }", "    return 'uncommon';\n  }"],
  ['a table without common is accepted', DROPS, "if (!e.tiers.common) bad.push(source + ': a tiered entry needs a common tier');", ''],
  [
    "a skipped tier's chance moves to the next named tier",
    DROPS,
    'if (tiers[name] && rnd() < K.tierChance[name]) return name;',
    'if (!tiers[name]) { carry += K.tierChance[name]; continue; } if (rnd() < K.tierChance[name] + carry) return name;',
    ['    for (let i = TIER_NAMES.length - 1; i > 0; i--) {', '    let carry = 0;\n    for (let i = TIER_NAMES.length - 1; i > 0; i--) {'],
  ],
  ['the roll count is ignored', DROPS, 'return Math.max(1, Math.floor(n) || 1);', 'return 1;'],
  ['gym 8 Common is XS', GYMS, "      candy: 'candyCommonS', // #139 8a", '      // #139 8a'],
  ['giving does not reduce the bag', CANDY, 'save.candy[size] = whole(save.candy[size]) - 1;', 'save.candy[size] = whole(save.candy[size]);'],
  ['give refuses nothing at 100', CANDY, "    if (levelFor(copy.speciesID, copy.candyXp) >= maxLevel()) return { ok: false, error: 'max' };\n", ''],
  ['give until opens with the largest held candy', CANDY, 'if (fits.length) return fits[fits.length - 1];', 'if (held.length) return held[held.length - 1];'],
  ['the bag defaults are gone', CANDY, 'for (const size of SIZE_ORDER) bag[size] = whole(stored[size]);', 'Object.assign(bag, stored);'],
  ['candy XP passes the level 100 total', COPIES, 'c.c = Math.min(candyXpCap(c.d), (c.c || 0) + wholeUpTo(amount, Number.MAX_SAFE_INTEGER));', 'c.c = (c.c || 0) + wholeUpTo(amount, Number.MAX_SAFE_INTEGER);'],
  ['Level Up aims at the level it is on', CANDY, 'Math.min(maxLevel(), from + levels)', 'Math.min(maxLevel(), from)'],
  ['Level Up takes an empty bag', CANDY, "    if (bagIsEmpty(save)) return { ok: false, error: 'empty' };\n", ''],
  ['a handful gives one candy', CANDY, 'while (given < count) {', 'while (given < 1) {'],
  ['the XP bar is never full', CANDY, 'if (level >= maxLevel()) return 1;', ''],
  ['a species with no curve takes candy', CANDY, "    if (!G.GrowthCurves.curveOf(copy.speciesID)) return { ok: false, error: 'none' };\n", ''],
  ['a hand-edited candy XP is not clamped', COPIES, 'if (c.c != null) c.c = wholeUpTo(c.c, candyXpCap(c.d));', 'if (c.c != null) c.c = +c.c;'],
];

require('../../tools/mutate-runner.js')({
  label: 'candy-mutate',
  root,
  baseline: true,
  crlf: true,
  harnesses: ['docs/proposals/candy-harness.js', 'docs/proposals/drops-harness.js'],
  args: [root],
  mutants: M.map(([name, file, a, b, extra]) => ({
    name,
    file,
    edits: extra ? [[a, b], extra] : [[a, b]],
    env: { [ENV[file]]: '<out>' },
  })),
});
