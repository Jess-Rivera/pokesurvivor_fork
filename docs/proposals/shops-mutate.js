// Mutation check for Move Shop step 3, the shop buildings (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/shops-mutate.js
// Each mutation breaks shops.js, game.js, gym.js, dev.html or main.js in one deliberate way, writes the copy to a temp folder, and
// runs docs/proposals/shops-harness.js against it (SH_<FILE> env vars). The harness must fail every time; a mutation it misses is
// a gap.
// Not mutated, with the reason: the arrow and marker drawing (drawn per frame, feel-tested; the harness only checks they are
// wired); the building art and shadow (drawn, feel-tested); G.Debug.shops (dev only, no game path); the mask baking (its own
// --check in tools/check.js compares the data to the PNGs).
const path = require('path');
const root = path.resolve(__dirname, '../..');
const SRC = { shops: ['js/systems/shops.js', 'SH_SHOPS'], game: ['js/game.js', 'SH_GAME'], gym: ['js/systems/gym.js', 'SH_GYM'],
  dev: ['dev.html', 'SH_DEV'], main: ['js/main.js', 'SH_MAIN'] };
const M = [
  // ---- placement ----
  ['the 90 degree rule is gone', 'shops', [['a0 + (100 + Math.random() * 160) * DEG', 'Math.random() * 360 * DEG']]],
  ['a building can spawn on screen', 'shops', [['d = R0 + NEAR + Math.random() * (FAR - NEAR),', 'd = Math.random() * (FAR - NEAR),']]],
  ['the retry never comes', 'shops', [['else nextAt = t + RETRY;', 'else nextAt = null;']]],
  // ---- life and schedule ----
  ['the minute never ends', 'shops', [['shops = shops.filter((s) => s.t < LIFE);', '']]],
  ['the 2:00 pair repeats', 'shops', [['if (place(pl)) nextAt = null;', 'if (place(pl)) nextAt = t + LIFE;']]],
  ['shops spawn and age in an arena', 'shops', [['if (G.GymArena.inArena) return; // hidden in an arena, and their minute stops', '']]],
  ['shops spawn in co-op', 'shops', [['if (G.Coop.active) return; // no shops in co-op until co-op shops exist', '']]],
  // ---- entering ----
  ['entering again without stepping off', 'shops', [['if (on && !s.on && !enter(s)) continue;', 'if (on && !enter(s)) continue;']]],
  ['a refused entry is used up', 'shops', [['if (on && !s.on && !enter(s)) continue;', 'if (on && !s.on) enter(s);']]],
  // ---- wiring ----
  ['the gym return hook is gone', 'gym', [['if (G.Shops) G.Shops.afterGym(now());', '']]],
  ['the run start does not reset the shops', 'game', [['G.Shops.reset(); // Move Shop step 3: the first pair is due at 2:00 again', '']]],
  ['the frame never updates the shops', 'game', [['G.Shops.update(dt, pl, time); // Move Shop step 3: the buildings on the map', '']]],
  ['the script tag is missing', 'dev', [['<script defer src="js/systems/shops.js"></script>', '']]],
  ['the contact data tag is missing', 'dev', [['<script defer src="js/data/shop-contact.js"></script>', '']]],
  ['the NEED array misses Shops', 'main', [["    'Shops',\n", '']]],
];

require('../../tools/mutate-runner.js')({
  label: 'shops-mutate',
  root,
  harnesses: ['docs/proposals/shops-harness.js'],
  args: [root],
  crlf: true,
  mutants: M.map(([name, which, edits]) => ({ name, file: SRC[which][0], edits, env: { [SRC[which][1]]: '<out>' } })),
});
