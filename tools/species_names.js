// tools/species_names.js: species names in js/data/pokedex.js are the official English names (#73, Jess 2026-11-11), so the HUD
// shows them as stored and never needs js/data/lang-en.js for a species. Source of truth: pokeapi-master species names, language 9.
// Usage: node tools/species_names.js           prints "species names: current (N species)" or every mismatch, exit 1 (tools/check.js)
//        node tools/species_names.js --write   rewrites each mismatched name in pokedex.js to its English name
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const root = path.resolve(__dirname, '..'),
  dexFile = path.join(root, 'js/data/pokedex.js'),
  csvFile = path.join(root, 'pokeapi-master/data/v2/csv/pokemon_species_names.csv'),
  ENGLISH_LANGUAGE_ID = '9';

/** Species id to English name, from the PokeAPI csv (pokemon_species_id, local_language_id, name, genus). */
function englishNames() {
  const names = {};
  for (const line of fs.readFileSync(csvFile, 'utf8').split(/\r?\n/).slice(1)) {
    const [speciesId, languageId, name] = line.split(',');
    if (languageId === ENGLISH_LANGUAGE_ID && name) names[speciesId] = name;
  }
  return names;
}

function dexEntries() {
  const sandbox = { G: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(dexFile, 'utf8'), sandbox, { filename: 'pokedex.js' });
  return sandbox.G.DEX;
}

const english = englishNames(),
  entries = dexEntries(),
  mismatches = [];
for (const entry of entries) {
  const wanted = english[String(entry.dex)];
  if (!wanted) mismatches.push({ entry, wanted: null });
  else if (entry.name !== wanted) mismatches.push({ entry, wanted });
}

if (process.argv.includes('--write')) {
  let text = fs.readFileSync(dexFile, 'utf8');
  for (const { entry, wanted } of mismatches) {
    if (!wanted) continue;
    const from = '{"dex":' + entry.dex + ',"name":' + JSON.stringify(entry.name) + ',',
      to = '{"dex":' + entry.dex + ',"name":' + JSON.stringify(wanted) + ',';
    if (!text.includes(from)) throw new Error('pokedex.js: no entry text for dex ' + entry.dex);
    text = text.replace(from, to);
    console.log('dex ' + entry.dex + ': ' + entry.name + ' -> ' + wanted);
  }
  fs.writeFileSync(dexFile, text);
  console.log('species names: wrote ' + mismatches.filter((m) => m.wanted).length + ' name(s)');
} else if (mismatches.length) {
  for (const { entry, wanted } of mismatches)
    console.log(
      'dex ' + entry.dex + ': "' + entry.name + '"' + (wanted ? ' should be "' + wanted + '"' : ' has no English name')
    );
  console.log('species names: ' + mismatches.length + ' mismatch(es); run node tools/species_names.js --write');
  process.exit(1);
} else console.log('species names: current (' + entries.length + ' species)');
