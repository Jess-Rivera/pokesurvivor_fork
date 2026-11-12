// #91-2 parts D and E: the Run Info panel's rules and wiring, offline checks (Node only). Usage from the repo root:
//   node docs/proposals/run-info-harness.js .
// Loads the real js/core/util.js (G.U.mmss) and js/ui/pause-run-info.js with no HUD kit, so the file exposes only its pure
// sections(), and feeds it hand-built snapshots. Expected text is hand-derived from the approved rules (PAUSE-MENU section 6,
// maps 91c and 91-2D: DK1, F3, S2, DD3, DR1, DR5, mm:ss always), never copied from code output. The wiring (pause-menu.js,
// debug.js, game.js and gym.js getters, the ScrollBox drag, dev.html, main.js NEED) is read as text.
// The mutation runner (run-info-mutate.js) points the RI_* variables (SRC below) at altered copies; every one must fail this.
const fs = require('fs'),
  vm = require('vm');
const R = process.argv[2] || '.';
const SRC = {
  'js/ui/pause-run-info.js': 'RI_PANEL',
  'js/ui/pause-menu.js': 'RI_MENU',
  'js/core/debug.js': 'RI_DEBUG',
  'js/game.js': 'RI_GAME',
  'js/systems/gym.js': 'RI_GYM',
  'js/ui/hud-overlay.js': 'RI_OVERLAY',
  'dev.html': 'RI_DEV',
  'js/main.js': 'RI_MAIN',
  'js/core/util.js': 'RI_UTIL',
  'js/ui/pause-pokemon.js': 'RI_POKEMON',
};
const pathOf = (p) => process.env[SRC[p]] || R + '/' + p;
const read = (p) => fs.readFileSync(pathOf(p), 'utf8').replace(/\r\n/g, '\n');
let fail = 0,
  n = 0;
const ok = (condition, message) => {
  n++;
  if (!condition) {
    fail++;
    console.log('FAIL ' + message);
  }
};
global.window = global;
global.location = { search: '' };
const loads = ['js/core/util.js', 'js/ui/pause-run-info.js', 'js/systems/run-stats.js', 'js/systems/dps-history.js'];
for (const p of loads.concat('js/ui/pause-pokemon.js')) vm.runInThisContext(read(p), { filename: p });
const RI = G.PauseRunInfo;
if (!RI || RI.ready !== false || typeof RI.sections !== 'function') {
  console.log('FAIL pause-run-info.js did not load its pure part without the HUD kit');
  process.exit(1);
}

// a 20:03 Kanto run, loop 1, two badges; every field the panel reads (snapshot() in pause-run-info.js)
const base = () => ({
  regionName: 'Kanto',
  time: 1203,
  loop: 1,
  badges: ['Boulder Badge', 'Cascade Badge'],
  splits: [292, 550],
  kills: 1204,
  elites: 3,
  biggestHit: { name: 'Charizard', move: 'Flamethrower', amount: 2450 },
  teamDamage: 10000,
  superDamage: 4000,
  dotDamage: 2000,
  taken: 3100,
  healed: 1800,
  faints: 9,
  mostFaints: { name: 'Charmander', faints: 6 },
  downTime: 192,
  statuses: { burn: 41, paralysis: 20, drowsy: 0 },
  coins: 312,
  silverSpent: 240,
  silverEarned: 410.9,
  items: 14,
  shiniesSeen: 1,
  shiniesCaught: 0,
  evs: [2, 11, 4, 0, 1, 6],
  best: null,
  pace: { kind: 'none', delta: 0, next: null },
});
const view = (changes) => RI.sections(Object.assign(base(), changes));
const section = (shown, title) => shown.sections.find((each) => each.title === title) || { rows: [] };
const rowsOf = (shown, title) => {
  const found = section(shown, title);
  return (found.rows || []).concat(found.footer ? [found.footer] : []);
};
const row = (shown, title, label) => rowsOf(shown, title).find((each) => each.label === label) || null;
const value = (shown, title, label) => (row(shown, title, label) || {}).value;

// 1. header and section order
{
  const shown = view();
  ok(shown.header.title === 'KANTO RUN' && shown.header.time === '20:03', 'header: KANTO RUN, 20:03');
  ok(view({ regionName: null }).header.title === 'ALL REGIONS RUN', 'header with no region picked: ALL REGIONS RUN');
  const order = shown.sections.map((each) => each.title).join('|');
  ok(order === 'Progress|Combat|Faints|Statuses inflicted|Loot|EVs earned|Region best', 'sections in the 91c order: ' + order);
}

// 2. progress
{
  const shown = view();
  ok(value(shown, 'Progress', 'Loop') === '1', 'Loop 1');
  ok(value(shown, 'Progress', 'Badges') === 'Boulder, Cascade (2)', 'Badges as names and count (R3)');
  ok(value(shown, 'Progress', 'Gym splits') === 'Boulder 4:52, Cascade 9:10', 'Gym splits in mm:ss');
  const none = view({ badges: [], splits: [] });
  ok(value(none, 'Progress', 'Badges') === 'None yet' && !row(none, 'Progress', 'Gym splits'), 'no badge: None yet, no splits row');
}

// 3. combat (DK1, DD3)
{
  const shown = view();
  ok(value(shown, 'Combat', 'Kills') === '1,204', 'Kills with a thousands comma');
  ok(value(shown, 'Combat', 'Kills per minute') === '60', 'Kills per minute: 1,204 in 20:03 is 60.05, shown 60');
  ok(value(view({ time: 59, kills: 12 }), 'Combat', 'Kills per minute') === '--', 'Kills per minute before 1:00: -- (DK1)');
  ok(value(view({ time: 60, kills: 97 }), 'Combat', 'Kills per minute') === '97', 'Kills per minute at exactly 1:00: 97');
  ok(value(shown, 'Combat', 'Biggest hit') === 'Charizard · Flamethrower · 2,450', 'Biggest hit: who, the move, the number');
  ok(value(view({ biggestHit: null }), 'Combat', 'Biggest hit') === '--', 'no hit yet: --');
  ok(value(shown, 'Combat', 'Super effective') === '50%', 'Super effective: 4,000 of the 8,000 hit damage, ticks left out (DD3)');
  const noHits = view({ teamDamage: 900, dotDamage: 900, superDamage: 0 });
  ok(value(noHits, 'Combat', 'Super effective') === '--', 'only ticks, no hit damage: --');
  ok(value(shown, 'Combat', 'Damage taken / healed') === '3,100 / 1,800', 'Damage taken / healed');
}

// 4. faints (F3)
{
  const shown = view();
  ok(value(shown, 'Faints', 'Faints') === '9', 'Faints: the team total');
  ok(value(shown, 'Faints', 'Most faints') === 'Charmander · 6 times', 'Most faints: the name and count');
  ok(value(shown, 'Faints', 'Time fainted') === '3:12', 'Time fainted in mm:ss');
  ok(row(shown, 'Faints', 'Most faints').indent && row(shown, 'Faints', 'Time fainted').indent, 'the two lines sit indented');
  const one = view({ faints: 1, mostFaints: { name: 'Squirtle', faints: 1 } });
  ok(value(one, 'Faints', 'Most faints') === 'Squirtle · 1 time', 'one faint: 1 time');
  const none = view({ faints: 0, mostFaints: null, downTime: 0 });
  ok(rowsOf(none, 'Faints').length === 1 && value(none, 'Faints', 'Faints') === '0', 'no faint: Faints 0, its lines hidden');
}

// 5. statuses inflicted (S2)
{
  const shown = view();
  const labels = section(shown, 'Statuses inflicted').rows.map((each) => each.label).join(',');
  ok(labels === 'Burn,Paralysis', 'only kinds landed, in the fixed order (Drowsy at 0 hidden): ' + labels);
  ok(section(shown, 'Statuses inflicted').columns === 2, 'two columns');
  ok(value(shown, 'Statuses inflicted', 'Burn') === '41', 'Burn 41');
  ok(value(shown, 'Statuses inflicted', 'Damage over time') === '2,000', 'Damage over time: the ticks');
  const none = view({ statuses: {} });
  ok(section(none, 'Statuses inflicted').rows.map((each) => each.label).join() === 'None yet', 'nothing landed: None yet');
  const odd = view({ statuses: { leech: 2, burn: 1 } });
  ok(section(odd, 'Statuses inflicted').rows.map((each) => each.label).join() === 'Burn,Leech', 'an unknown kind goes last');
}

// 6. loot and EVs
{
  const shown = view();
  ok(value(shown, 'Loot', 'Coins') === '312', 'Coins');
  ok(value(shown, 'Loot', 'Silver') === 'spent 240 / earned 410', 'Silver in whole coins, rounded down');
  ok(value(shown, 'Loot', 'Items picked up') === '14', 'Items picked up');
  ok(value(shown, 'Loot', 'Shinies') === 'seen 1, caught 0', 'Shinies seen and caught');
  const evs = section(shown, 'EVs earned').evs || [];
  ok(evs.map((each) => each.label + ' ' + each.value).join(',') === 'HP 2,Atk 11,Def 4,SpA 0,SpD 1,Spe 6', 'EVs: one six column row');
}

// 7. Region Best (DR1, DR5)
{
  const none = view();
  ok(value(none, 'Region best', 'Best') === 'No record yet', 'no record: No record yet');
  ok(!row(none, 'Region best', 'Next') && !row(none, 'Region best', 'Pace'), 'no record: no Next, no Pace');
  const cleared = { loop: 3, gyms: 3, fighting: false, reachedAt: null, endTime: 5110, splits: [] };
  const inFight = { loop: 3, gyms: 3, fighting: true, reachedAt: 4950, endTime: 5000, splits: [] };
  const pace = (kind, delta, next) => ({ best: cleared, pace: { kind, delta, next } });
  ok(value(view(pace('onPace', 0, null)), 'Region best', 'Best') === 'Loop 3, Gym 3 cleared, lasted 85:10',
    'Best, cleared: Loop 3, Gym 3 cleared, lasted 85:10 (mm:ss past an hour)');
  ok(value(view({ best: inFight, pace: { kind: 'onPace', delta: 0, next: null } }), 'Region best', 'Best') ===
    'Died at Loop 3, Gym 4, reached it 82:30', 'Best, died in a fight: the fight\'s gym and when it was reached');
  const zero = { loop: 1, gyms: 0, fighting: false, reachedAt: null, endTime: 190, splits: [] };
  ok(value(view({ best: zero, pace: { kind: 'onPace', delta: 0, next: null } }), 'Region best', 'Best') ===
    'Loop 1, no gym cleared, lasted 3:10', 'Best with no gym: no gym cleared');
  const next = view(pace('ahead', 22, { gym: 3, at: 860 }));
  ok(value(next, 'Region best', 'Next') === 'Loop 1, Gym 3 (best got there at 14:20)', 'Next: your next gym and when the best had it');
  ok(value(next, 'Region best', 'Pace') === "You're ahead by 0:22" && row(next, 'Region best', 'Pace').tone === 'ahead',
    'ahead: green');
  const behind = view(pace('behind', 45, { gym: 3, at: 860 }));
  ok(value(behind, 'Region best', 'Pace') === "You're behind by 0:45" && row(behind, 'Region best', 'Pace').tone === 'behind',
    'behind: red');
  const even = view(pace('even', 0, { gym: 2, at: 550 }));
  ok(value(even, 'Region best', 'Pace') === 'Even' && !row(even, 'Region best', 'Pace').tone, 'even: white');
  const start = view(pace('onPace', 0, { gym: 1, at: 292 }));
  ok(value(start, 'Region best', 'Pace') === 'On pace' && !row(start, 'Region best', 'Pace').tone, 'no gym yet: On pace, white');
  const newBest = view(pace('newBest', 0, null));
  ok(value(newBest, 'Region best', 'Pace') === 'New best pace' && row(newBest, 'Region best', 'Pace').tone === 'gold',
    'past the record: New best pace, gold');
  ok(!row(newBest, 'Region best', 'Next'), 'past the record: no Next');
}

// 8. wiring, read as text
{
  const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // comments off
  const menu = read('js/ui/pause-menu.js');
  ok(menu.includes('const runInfo = G.PauseRunInfo && G.PauseRunInfo.ready ? G.PauseRunInfo : null;'), 'pause-menu.js finds the panel');
  ok(/data-panel="runInfo">\s*\$\{runInfo \? html`<\$\{runInfo\.Panel\} \/>` : null\}\s*<\/div>/.test(menu), 'it mounts in the Run Info slot');
  const open = menu.slice(menu.indexOf('  function open() {'), menu.indexOf('\n  }\n', menu.indexOf('  function open() {')));
  ok(/if \(runInfo\) runInfo\.read\(\);/.test(open), 'the panel reads when the menu opens');
  const panel = code('js/ui/pause-run-info.js');
  ok(!/addPanel\(|requestAnimationFrame|setInterval/.test(panel), 'the panel never reads per frame (F2: the world is held still)');
  const dev = read('dev.html');
  const at = (file) => dev.indexOf('<script defer src="js/ui/' + file + '"></script>');
  ok(at('pause-pokemon.js') > 0 && at('pause-run-info.js') > at('pause-pokemon.js') && at('pause-menu.js') > at('pause-run-info.js'),
    'dev.html loads pause-run-info.js after pause-pokemon.js and before pause-menu.js');
  ok(/'PauseMenu',\s*'PauseRunInfo',/.test(read('js/main.js')), 'the NEED array lists PauseRunInfo');
  const debug = read('js/core/debug.js');
  ok(/\n    runinfo,\n    regionbest,\n    recordcheck,\n/.test(debug), 'G.Debug has runinfo, regionbest and recordcheck (T2)');
  ok(debug.includes('G.Game.regionRecord({ write: writing })'), 'recordcheck runs the one end-of-run compare, written only on write');
  const runinfoBody = debug.slice(debug.indexOf('  function runinfo('), debug.indexOf('  function regionbest('));
  ok(/game\.debugMaxed\(\);/.test(runinfoBody), 'runinfo flags the run');
  const game = read('js/game.js');
  ok(/get shiniesCaught\(\) \{\s*return caught\.length;/.test(game), 'G.Game.shiniesCaught reads the run\'s caught list');
  ok(/get runIsClean\(\) \{\s*return clean\(\);/.test(game) && /\n    regionKey,\n/.test(game), 'G.Game.runIsClean and regionKey');
  ok(/debugBadges\(entries\) \{\s*badges = entries\.map\(\(entry\) => entry\.badge\);\s*splits = entries\.map\(\(entry\) => entry\.at\);/
    .test(read('js/systems/gym.js')), 'G.Gym.debugBadges sets the badges and their splits together');
  const overlay = read('js/ui/hud-overlay.js');
  ok(overlay.includes('event.currentTarget.setPointerCapture(event.pointerId);') && overlay.includes('onPointerMove=${dragThumb}'),
    'the shared ScrollBox thumb can be dragged (DD1)');
}

// 9. the Run Stats box (#91-3, map 91-3; 91d rows and P3 / P4, RS1, RS3, Jess 2026-11-12), pause-pokemon.js's pure part
{
  const compact = G.U.compact;
  ok(compact(0) === '0' && compact(9999) === '9,999', 'compact: 0 and 9,999 stay whole numbers');
  ok(compact(10000) === '10k' && compact(41234) === '41.2k', 'compact past 9,999: 10k (no .0) and 41.2k');
  ok(compact(1300000) === '1.3M' && compact(999950) === '1M', 'compact: 1.3M, and 999,950 reads 1M, never 1000k');
  const PP = G.PausePokemon;
  ok(PP && PP.ready === false && typeof PP.runStatsRows === 'function', 'pause-pokemon.js loads its pure part with no HUD kit');
  const numbers = (changes) =>
    Object.assign(
      { kills: 312, field: 400, damage: 41234, teamDamage: 108511, bestHit: 2450, superDamage: 15000, dotDamage: 5400 },
      { taken: 3100, healed: 1800, faints: 6, down: 72, statuses: { sleep: 3, burn: 12, paralysis: 8 } },
      changes
    );
  const rowsFor = (changes) => PP.runStatsRows(numbers(changes));
  const cell = (rows, label) => rows.find((each) => each.label === label) || {};
  const rows = rowsFor();
  const order = rows.map((each) => each.label).join('|');
  ok(order === 'Kills|Field|Damage|Share|Best hit|Super eff.|Taken|Healed|Faints|Down|Statuses|DoT dmg', 'twelve rows: ' + order);
  ok(cell(rows, 'Kills').value === '312' && cell(rows, 'Field').value === '6:40' && cell(rows, 'Down').value === '1:12',
    'Kills, and Field and Down in mm:ss');
  ok(cell(rows, 'Damage').value === '41.2k' && cell(rows, 'Taken').value === '3,100' && cell(rows, 'DoT dmg').value === '5,400',
    'compact numbers past 9,999 only (P4)');
  ok(cell(rows, 'Share').value === '38%', 'Share: 41,234 of the team 108,511 is 38%');
  ok(cell(rows, 'Super eff.').value === '42%', 'Super eff.: 15,000 of its 35,834 hit damage, ticks left out (RS1)');
  ok(cell(rows, 'Statuses').value === '23' && cell(rows, 'Statuses').tip === 'Burn 12, Paralysis 8, Sleep 3',
    'Statuses: one total, the kinds on hover in the fixed order (P3)');
  const nothing = { kills: 0, field: 0, damage: 0, teamDamage: 0, bestHit: 0, superDamage: 0, dotDamage: 0, taken: 0 };
  const zeros = rowsFor(Object.assign(nothing, { healed: 0, faints: 0, down: 0, statuses: {} }));
  ok(zeros.length === 12, 'zeros: still twelve rows (RS3)');
  ok(cell(zeros, 'Kills').value === '0' && cell(zeros, 'Field').value === '0:00' && cell(zeros, 'Down').value === '0:00',
    'zeros read 0 and 0:00');
  ok(cell(zeros, 'Share').value === '--' && cell(zeros, 'Super eff.').value === '--', 'no damage: Share and Super eff. read --');
  ok(cell(zeros, 'Statuses').value === '0' && cell(zeros, 'Statuses').tip === null, 'no status landed: 0, and no hover');
  ok(cell(rowsFor({ damage: 900, dotDamage: 900, superDamage: 0 }), 'Super eff.').value === '--',
    'only ticks, no hit damage: Super eff. reads --');
  // the numbers, read from real records
  const record = G.RunStats.create(),
    history = G.DpsHistory.create();
  const first = { teamSlot: 0 },
    second = { teamSlot: 2 };
  G.DpsHistory.advance(history, 1, first);
  G.DpsHistory.advance(history, 1, second);
  G.DpsHistory.record(history, first, 300);
  G.DpsHistory.record(history, second, 100);
  G.RunStats.kill(record, first);
  G.RunStats.faint(record, first, 5);
  G.RunStats.revive(record, first, 10);
  G.RunStats.faint(record, first, 30);
  const mine = PP.runStatsNumbers(record, history, 0, 40);
  ok(mine.kills === 1 && mine.damage === 300 && mine.teamDamage === 400, 'runStatsNumbers: its kills, its damage, the team damage');
  ok(mine.field === 1 && mine.faints === 2 && mine.down === 15, 'runStatsNumbers: its field seconds, and down 5 s closed + 10 s open');
  const list = G.PauseRunInfo.statusList({ sleep: 3, leech: 1, burn: 12, drowsy: 0 });
  ok(list.map((each) => each.name + ' ' + each.count).join(', ') === 'Burn 12, Sleep 3, Leech 1',
    'statusList: kinds landed, the fixed order, an unknown kind last (Run Info and the box share it)');
  const pokemon = read('js/ui/pause-pokemon.js');
  ok(pokemon.includes('children: html`<${RunStatsBox} member=${member} rim=${rim} />`'), 'the detail panel draws the box');
  ok(/function RunStatsBox[\s\S]*?<\$\{ScrollBox\}[\s\S]*?resetOn=\$\{\[member, readCount\.value\]\}/.test(pokemon),
    'the box scrolls in the shared ScrollBox and goes back to the top for each Pokemon');
}

console.log(fail ? 'run-info-harness: ' + fail + ' of ' + n + ' FAILED' : 'run-info-harness: all ' + n + ' passed');
process.exit(fail ? 1 : 0);
