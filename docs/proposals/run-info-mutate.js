// Mutation check for #91-2 parts D and E, the Run Info panel and its debug calls (Node only; not a harness, so tools/check.js
// does not run it). Usage from the repo root:  node docs/proposals/run-info-mutate.js
// Each mutation breaks pause-run-info.js, pause-menu.js, debug.js, game.js, gym.js, hud-overlay.js, dev.html or main.js in one
// deliberate way, writes the copy to a temp folder, and runs docs/proposals/run-info-harness.js against it (RI_<FILE> env vars).
// The harness must fail every time; a mutation it misses is a gap.
// Not mutated, with the reason: the Preact view and CSS (drawn, feel-tested and covered by tools/smoke-pause-menu.js), the
// snapshot() reads (they need a running game; the smoke reads every row through the debug calls), and the debug seeds' numbers.
const path = require('path');
const root = path.resolve(__dirname, '../..');
const SRC = {
  panel: ['js/ui/pause-run-info.js', 'RI_PANEL'],
  menu: ['js/ui/pause-menu.js', 'RI_MENU'],
  debug: ['js/core/debug.js', 'RI_DEBUG'],
  game: ['js/game.js', 'RI_GAME'],
  gym: ['js/systems/gym.js', 'RI_GYM'],
  overlay: ['js/ui/hud-overlay.js', 'RI_OVERLAY'],
  dev: ['dev.html', 'RI_DEV'],
  main: ['js/main.js', 'RI_MAIN'],
};
const M = [
  // ---- the panel's rules ----
  ['Kills per minute shows a number before 1:00', 'panel', [["snap.time < 60 ? '--'", "snap.time < 0 ? '--'"]]],
  ['the Faints lines show with no faint', 'panel', [['    if (snap.faints > 0) {', '    if (snap.faints >= 0) {']]],
  ['a status at 0 is listed', 'panel', [['(kind) => snap.statuses[kind] > 0', '(kind) => snap.statuses[kind] >= 0']]],
  ['"None yet" never shows', 'panel', [["      : [{ label: 'None yet', value: '' }];", '      : [];']]],
  ['ticks count below the super effective line', 'panel', [['const hitDamage = snap.teamDamage - snap.dotDamage;', 'const hitDamage = snap.teamDamage;']]],
  ['ahead reads red', 'panel', [["clock(pace.delta), tone: 'ahead' }", "clock(pace.delta), tone: 'behind' }"]]],
  ['the Best wordings are swapped', 'panel', [['    if (best.fighting)\n      bestText', '    if (!best.fighting)\n      bestText']]],
  ["the in-fight Best names the gym before the fight", 'panel', [["', Gym ' + (gyms + 1) + ', reached it '", "', Gym ' + gyms + ', reached it '"]]],
  ['behind reads as ahead', 'panel', [['value: "You\'re behind by " + clock', 'value: "You\'re ahead by " + clock']]],
  ['the badges keep " Badge"', 'panel', [["String(badge).replace(/ Badge$/, '')", 'String(badge)']]],
  // ---- wiring ----
  ['the panel does not read on open', 'menu', [['      if (runInfo) runInfo.read(); // #91-2: one snapshot of the run, the world is held still from here\n', '']]],
  ['the panel is not mounted', 'menu', [['${runInfo ? html`<${runInfo.Panel} />` : null}', '']]],
  ['a dry recordcheck writes', 'debug', [['G.Game.regionRecord({ write: writing })', 'G.Game.regionRecord({ write: true })']]],
  ['runinfo does not flag the run', 'debug', [['    game.debugMaxed(); // like every debug call: this run never sets a record or posts a score\n', '']]],
  ['shiniesCaught reads the save', 'game', [['      return caught.length;', '      return G.DB.save.stats.shinies;']]],
  ['debugBadges forgets the splits', 'gym', [['      splits = entries.map((entry) => entry.at);\n', '']]],
  ['the scroll thumb cannot be dragged', 'overlay', [['                onPointerMove=${dragThumb}\n', '']]],
  ['the script tag is missing', 'dev', [['    <script defer src="js/ui/pause-run-info.js"></script>\n', '']]],
  ['the NEED array misses PauseRunInfo', 'main', [["    'PauseRunInfo',\n", '']]],
];

require('../../tools/mutate-runner.js')({
  label: 'run-info-mutate',
  root,
  harnesses: ['docs/proposals/run-info-harness.js'],
  args: [root],
  crlf: true,
  mutants: M.map(([name, which, edits]) => ({ name, file: SRC[which][0], edits, env: { [SRC[which][1]]: '<out>' } })),
});
