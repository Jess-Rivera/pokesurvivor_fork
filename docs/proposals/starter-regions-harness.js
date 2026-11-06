// Starter regions (onboarding F3, 2026-11-05) offline checks (Node only). Usage from the repo root:  node docs/proposals/starter-regions-harness.js
// Loads the real js/data/pokedex.js and js/data/starters.js (or SR_STARTERS, for docs/proposals/starter-regions-mutate.js).
// Expected outcomes are Jess's design, not the code's output: 9 regions in the region select's order (Kanto to Paldea), 3 starters each,
// every one from that region's generation, ordered Grass, Fire, Water (the Grass one leads), and no Psyduck or Slowpoke.
const fs = require('fs'), vm = require('vm');
global.G = {};
for (const f of ['js/data/pokedex.js', process.env.SR_STARTERS || 'js/data/starters.js'])
  vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL ' + m); } };
const REGIONS = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'];
const R = G.STARTER_REGIONS || [];

ok(R.length === 9, '9 region groups (got ' + R.length + ')');
REGIONS.forEach((name, i) => {
  const r = R[i];
  ok(r && r.name === name, 'group ' + (i + 1) + ' is ' + name + ' (got ' + (r && r.name) + ')');
  if (!r) return;
  ok(Array.isArray(r.dex) && r.dex.length === 3, name + ' has 3 starters');
  (r.dex || []).forEach((dex, k) => {
    const mon = G.DEX_BY[dex];
    ok(!!mon, name + ' member ' + dex + ' exists in the Pokedex');
    if (!mon) return;
    ok(mon.gen === i + 1, name + ': ' + mon.name + ' is generation ' + (i + 1) + ' (got ' + mon.gen + ')');
    ok(mon.types[0] === ['grass', 'fire', 'water'][k], name + ' slot ' + (k + 1) + ' is ' + ['grass', 'fire', 'water'][k] + ' (got ' + mon.types[0] + ')');
    ok(!!G.STARTER_BY[dex] && !!G.STARTER_BY[dex].start, name + ': ' + mon.name + ' has a starting move');
    ok(dex !== 54 && dex !== 79, name + ': no Psyduck or Slowpoke');
  });
  ok(new Set(r.dex).size === (r.dex || []).length, name + ' has no repeats');
});
const all = R.flatMap((r) => r.dex || []);
ok(new Set(all).size === all.length, 'no Pokemon in two regions');

console.log(fail ? 'starter-regions harness: ' + fail + ' FAILED of ' + n : 'starter-regions harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
