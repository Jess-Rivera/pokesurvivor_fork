// Mutation check for Move Shop step 2, Silver (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/silver-mutate.js
// Each mutation breaks silver.js, game.js, enemy.js, hud.js, dev.html or main.js in one deliberate way, writes the copy to a temp
// folder, and runs docs/proposals/silver-harness.js against it (SV_<FILE> env vars). The harness must fail every time; a mutation
// it misses is a gap.
// Not mutated, with the reason: the HUD pop and roll (drawn per frame, feel-tested); G.Debug.silver (dev only, no game path);
// the coin sheet pixels (checked once against the gold cut when it was made, 2026-11-05).
const path = require('path');
const root = path.resolve(__dirname, '../..');
const SRC = { silver: ['js/systems/silver.js', 'SV_SILVER'], game: ['js/game.js', 'SV_GAME'], enemy: ['js/entities/enemy.js', 'SV_ENEMY'],
  hud: ['js/ui/hud.js', 'SV_HUD'], dev: ['dev.html', 'SV_DEV'], main: ['js/main.js', 'SV_MAIN'] };
const M = [
  // ---- pay (#124: a kill pays 1, at any run time) ----
  ['a kill pays 2', 'silver', [['KILL_PAY = 1;', 'KILL_PAY = 2;']]],
  ['the pay follows the run time again', 'silver', [['      amount += KILL_PAY;\n      earned += KILL_PAY;', '      const pay = Math.max(1, G.Stats.levelForTime(arguments[0] || 0) / 10);\n      amount += pay;\n      earned += pay;']]],
  ['the count rounds instead of rounding down', 'silver', [['return Math.floor(amount + 1e-9);', 'return Math.round(amount);']]],
  // ---- balance ----
  ['a run starts at 100', 'silver', [['const START = 0,', 'const START = 100,']]],
  ['a spend can overdraw', 'silver', [['if (!(n >= 0) || n > this.whole) return false;', 'if (!(n >= 0)) return false;']]],
  ['the balance can go negative', 'silver', [['amount = Math.max(0, +n || 0);', 'amount = +n || 0;']]],
  ['Silver is written to the save', 'silver', [['amount += KILL_PAY;', 'amount += KILL_PAY;\n      if (G.DB) G.DB.save.silver = amount;']]],
  // ---- #91-2 run totals (DS1) ----
  ['reset() sets earned to the kill pay', 'silver', [['      earned = 0;\n      spent = 0;', '      earned = KILL_PAY;\n      spent = 0;']]],
  ['reset keeps what was earned', 'silver', [['      earned = 0;\n      spent = 0;', '      spent = 0;']]],
  ['a refused spend counts as spent', 'silver', [['      if (!(n >= 0) || n > this.whole) return false;\n      amount -= n;\n      spent += n;', '      spent += n;\n      if (!(n >= 0) || n > this.whole) return false;\n      amount -= n;']]],
  // ---- wiring ----
  ['the run start does not reset Silver', 'game', [['    G.Silver.reset(); // Move Shop step 2: every run starts from the same balance (0 since #124), nothing carries over\n', '']]],
  ['Silver leaks into the end-of-run PokeCoins', 'game', [['recogidas: pl.coins,', 'recogidas: pl.coins + G.Silver.whole,']]],
  ['a kill pays nothing', 'enemy', [['      G.Silver.kill(); // Move Shop step 2, #124: every kill pays 1 Silver, the same for every enemy\n', '']]],
  ['a thief that escapes pays', 'enemy', [["G.Spawner.say('¡' + e.name + ' se ha escapado!', 2.4);", "G.Spawner.say('¡' + e.name + ' se ha escapado!', 2.4);\n          G.Silver.kill();"]]],
  ['the counter shows in co-op', 'hud', [['if (!G.Coop.active && !overlayDrawsPlayer) {\n      const sa = touch', 'if (!overlayDrawsPlayer) {\n      const sa = touch']]],
  ['the script tag is missing', 'dev', [['    <script defer src="js/systems/silver.js"></script>\n', '']]],
  ['the NEED array misses Silver', 'main', [["    'Silver',\n", '']]],
];

require('../../tools/mutate-runner.js')({
  label: 'silver-mutate',
  root,
  harnesses: ['docs/proposals/silver-harness.js'],
  args: [root],
  crlf: true,
  mutants: M.map(([name, which, edits]) => ({ name, file: SRC[which][0], edits, env: { [SRC[which][1]]: '<out>' } })),
});
