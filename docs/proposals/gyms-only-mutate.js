// Mutation check for the gyms-only removal (slice 7a-0, commit A; Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/gyms-only-mutate.js
// Each mutation breaks gym-arena.js, spawner.js, enemies.js, achievements.js or goals-ui.js in one deliberate way, writes the copy to a temp
// folder, and runs docs/proposals/gyms-only-harness.js against it (GYMSONLY_<FILE> env vars). The harness must fail every time.
const path = require('path');
const root = path.resolve(__dirname, '../..');
const SRC = { arena: ['js/systems/gym-arena.js', 'GYMSONLY_ARENA'], spawner: ['js/systems/spawner.js', 'GYMSONLY_SPAWNER'], enemies: ['js/data/enemies.js', 'GYMSONLY_ENEMIES'],
  ach: ['js/data/achievements.js', 'GYMSONLY_ACH'], goals: ['js/ui/goals-ui.js', 'GYMSONLY_GOALS'] };
const LEG = 'const ok = (p) => regionOK(p) && !p.leg && G.SPRITE_META[p.dex] && !used.has(p.dex);', NOLEG = 'const ok = (p) => regionOK(p) && G.SPRITE_META[p.dex] && !used.has(p.dex);';
const M = [
  ['G.Judgment left registered', 'arena', [['G.GymArena = (() => {', 'G.Judgment = { active: false };\nG.GymArena = (() => {']]],
  ['spawner ignores the gym arena', 'spawner', [['if (G.GymArena.inArena) return;', '']]],
  ['leg filter dropped in enemies.js (boss slots and elites)', 'enemies', [[LEG, NOLEG]]],
  ['rift1 back in achievements', 'ach', [["{\n      id: 'mis10',", "{ id: 'rift1', cat: 'otros', tier: 1, name: 'Al otro lado', desc: 'x', value: () => 0, goal: 1, reward: { t1: 3 } },\n    {\n      id: 'mis10',"]]],
  ['goals screen crashes on an unknown saved id', 'goals', [['if (!a) continue;', '']]],
  ['a gym win stops granting the Bond', 'arena', [['pl.bonds++;', '']]],
];

require('../../tools/mutate-runner.js')({
  label: 'gyms-only-mutate',
  root,
  harnesses: ['docs/proposals/gyms-only-harness.js'],
  args: [root],
  mutants: M.map(([name, which, edits]) => ({ name, file: SRC[which][0], edits, env: { [SRC[which][1]]: '<out>' } })),
});
