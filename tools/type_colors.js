// tools/type_colors.js: check that the game-wide type colours in js/core/util.js (G.U.TYPE_COLOR, TYPE_COLOR_LIGHT,
// TYPE_COLOR_DARK) match the Bulbapedia Scarlet/Violet table in docs/HUD-STYLE.md "Type colours" for all 18 types (#68).
// Usage: node tools/type_colors.js    prints "type colors: current (18 types)" or every mismatch, exit 1 (used by tools/check.js)
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const root = path.resolve(__dirname, '..');

// The spec table: rows like "| Fire     | `#EF7374` | `#E62829` | `#961A1B` |" under "### Type colours".
function specTable() {
  const doc = fs.readFileSync(path.join(root, 'docs/HUD-STYLE.md'), 'utf8').replace(/\r\n/g, '\n'),
    start = doc.indexOf('### Type colours');
  if (start < 0) throw new Error('docs/HUD-STYLE.md has no "### Type colours" section');
  const sectionEnd = doc.indexOf('\n#', start + 1),
    section = doc.slice(start, sectionEnd < 0 ? doc.length : sectionEnd),
    rowPattern =
      /^\|\s*([A-Za-z]+)\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|/gm,
    table = {};
  let row;
  while ((row = rowPattern.exec(section))) table[row[1].toLowerCase()] = { light: row[2], base: row[3], dark: row[4] };
  return table;
}

// The game's tables: run util.js in a sandbox with a bare G and read G.U.
function gameTables() {
  const sandbox = { window: {}, console };
  sandbox.window = sandbox;
  sandbox.G = {};
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/core/util.js'), 'utf8'), sandbox, { filename: 'util.js' });
  const utilities = (sandbox.G && sandbox.G.U) || (sandbox.window.G && sandbox.window.G.U);
  if (!utilities) throw new Error('js/core/util.js did not define G.U');
  return { base: utilities.TYPE_COLOR, light: utilities.TYPE_COLOR_LIGHT, dark: utilities.TYPE_COLOR_DARK };
}

const spec = specTable(),
  game = gameTables(),
  problems = [];
const specTypes = Object.keys(spec).sort();
if (specTypes.length !== 18) problems.push('HUD-STYLE table has ' + specTypes.length + ' types, expected 18');
for (const tone of ['light', 'base', 'dark']) {
  const tableName = tone === 'base' ? 'TYPE_COLOR' : 'TYPE_COLOR_' + tone.toUpperCase(),
    gameTable = game[tone];
  if (!gameTable) {
    problems.push('G.U.' + tableName + ' is missing');
    continue;
  }
  for (const type of Object.keys(gameTable))
    if (!spec[type]) problems.push('G.U.' + tableName + '.' + type + ' has no row in HUD-STYLE');
  for (const type of specTypes) {
    const wanted = spec[type][tone],
      actual = gameTable[type];
    if (!actual || actual.toUpperCase() !== wanted.toUpperCase())
      problems.push('G.U.' + tableName + '.' + type + ' is ' + actual + ', HUD-STYLE says ' + wanted);
  }
}
if (problems.length) {
  for (const problem of problems) console.log('MISMATCH ' + problem);
  process.exit(1);
}
console.log('type colors: current (' + specTypes.length + ' types)');
