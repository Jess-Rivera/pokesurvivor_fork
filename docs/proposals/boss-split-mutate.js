// Mutation check for the boss brain split (slice 7a-0, commit B; Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/boss-split-mutate.js
// Each mutation breaks enemy.js, boss-ai.js or gym-arena.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/boss-split-harness.js against it (BOSSSPLIT_<FILE> env vars). The harness must fail every time.
const path = require('path');
const root = path.resolve(__dirname, '../..');
const SRC = { enemy: ['js/entities/enemy.js', 'BOSSSPLIT_ENEMY'], brain: ['js/entities/boss-ai.js', 'BOSSSPLIT_BRAIN'], arena: ['js/systems/gym-arena.js', 'BOSSSPLIT_ARENA'] };
const M = [
  ['update stops delegating to the brain', 'enemy', [['[vx, vy, animBase] = this.brain.step(dt, pl, dist, dx, dy, spd);', 'void 0;']]],
  ['applyFlinch skips the brain', 'enemy', [['if (this.brain) this.brain.flinch();', '']]],
  ['the arena spawns a plain enemy', 'arena', [['G.Boss.make(G.Gym.makeDef(g), arena.x, arena.y - ts * 3.5)', 'new G.Enemy(G.Gym.makeDef(g), arena.x, arena.y - ts * 3.5, { hp: 1, spd: 1, dmg: 1 }, true)']]],
  ['G.Boss.make forgets the brain', 'brain', [['if (e.gym) e.brain = new GymBrain(e);', '']]],
  ['a gym method copied back onto the body', 'enemy', [['cy() {\n      return this.y;\n    }', 'cy() {\n      return this.y;\n    }\n    gymPick(dist) { return null; }']]],
  ['touch stops writing the contact type', 'brain', [["e.atkCat = d.category === 'special' ? 'special' : 'physical';\n      e.atkType = d.type;", "e.atkCat = d.category === 'special' ? 'special' : 'physical';"]]],
];

require('../../tools/mutate-runner.js')({
  label: 'boss-split-mutate',
  root,
  harnesses: ['docs/proposals/boss-split-harness.js'],
  args: [root],
  mutants: M.map(([name, which, edits]) => ({ name, file: SRC[which][0], edits, env: { [SRC[which][1]]: '<out>' } })),
});
