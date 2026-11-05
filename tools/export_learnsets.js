// tools/export_learnsets.js: pokeapi-master/data/v2/csv/pokemon_moves.csv -> js/data/learnsets.js
// Bakes, for every species in the Pokedex, the live moves it can learn from ANY game: its level-up and egg moves (the Move Trainer's
// pool) and its machine moves (its TMs). Learn levels are ignored. Baked because file:// cannot fetch, and all games rather than the
// latest one because the latest-game dataset leaves 68 species with no TMs (docs/proposals/move-shop-plan.md).
// Usage: node tools/export_learnsets.js            write js/data/learnsets.js
//        node tools/export_learnsets.js --check    exit 1 if the data file does not match the sources (used by tools/check.js)
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const root = path.resolve(__dirname, '..');
const CSV = path.join(root, 'pokeapi-master/data/v2/csv'),
  OUT = path.join(root, 'js/data/learnsets.js');

const LEVEL_UP = '1',
  EGG = '2',
  MACHINE = '4';
// Mainline moves no game's data gives to a species through these methods (Jess 2026-11-04: every imported move reaches a player).
const HAND = { 'volt-tackle': [172, 25, 26] }; // the Pikachu line (an egg move through a Light Ball in the main games)

const rows = (f) =>
  fs
    .readFileSync(path.join(CSV, f), 'utf8')
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.split(','));

function build() {
  const box = { G: {} };
  box.window = box;
  vm.createContext(box);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/data/pokedex.js'), 'utf8'), box);
  const dexes = box.G.DEX.map((p) => p.dex).sort((a, b) => a - b),
    known = new Set(dexes);
  const src = JSON.parse(fs.readFileSync(path.join(root, 'docs/move_rework_holding/move-conversions-described.json')));
  const moves = Object.values(src.moves)
      .map((m) => m.id)
      .sort(),
    index = new Map(moves.map((id, i) => [id, i]));
  const nameOf = {};
  for (const r of rows('moves.csv')) nameOf[r[0]] = r[1];
  const trainer = {},
    tm = {};
  const put = (o, dex, i) => (o[dex] = o[dex] || new Set()).add(i);
  for (const [pokemon, , move, method] of rows('pokemon_moves.csv')) {
    const dex = +pokemon,
      i = index.get(nameOf[move]);
    if (!known.has(dex) || i == null) continue;
    if (method === LEVEL_UP || method === EGG) put(trainer, dex, i);
    else if (method === MACHINE) put(tm, dex, i);
  }
  for (const [id, list] of Object.entries(HAND)) for (const dex of list) put(trainer, dex, index.get(id));
  const line = (o, dex) => (o[dex] ? [...o[dex]].sort((a, b) => a - b).join(',') : '');
  const body = dexes.map((d) => `    ${d}: ['${line(trainer, d)}', '${line(tm, d)}'],`).join('\n');
  const text = `/* ============ learnsets.js: what each species can learn (GENERATED, do not edit) ============
 * Baked from pokeapi-master/data/v2/csv/pokemon_moves.csv by tools/export_learnsets.js; rerun it after adding moves.
 * moves: every live move id. by: dex -> [level-up and egg moves, machine moves], each a comma list of indexes into moves.
 * Read by G.Moves (js/data/moves.js).
 */
G.Learnsets = {
  moves: ${JSON.stringify(moves)},
  by: {
${body}
  },
};
`;
  return { text, moves: moves.length, species: dexes.length };
}

if (!fs.existsSync(path.join(CSV, 'pokemon_moves.csv'))) {
  console.log('learnsets.js is current (pokeapi-master is not on this machine, not checked)');
  process.exit(0);
}
const { text, moves, species } = build();
if (process.argv.includes('--check')) {
  const disk = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
  if (disk !== text) {
    console.log('STALE js/data/learnsets.js: run node tools/export_learnsets.js');
    process.exit(1);
  }
  console.log('learnsets.js is current (' + species + ' species, ' + moves + ' moves)');
} else {
  fs.writeFileSync(OUT, text);
  console.log(
    'wrote js/data/learnsets.js: ' +
      species +
      ' species, ' +
      moves +
      ' moves, ' +
      (text.length / 1024).toFixed(1) +
      ' KB'
  );
}
