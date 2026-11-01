// Mutation check for the boss brain split (slice 7a-0, commit B; Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/boss-split-mutate.js
// Each mutation breaks enemy.js, boss-ai.js or gym-arena.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/boss-split-harness.js against it (BOSSSPLIT_<FILE> env vars). The harness must fail every time.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = { enemy: ['js/entities/enemy.js', 'BOSSSPLIT_ENEMY'], brain: ['js/entities/boss-ai.js', 'BOSSSPLIT_BRAIN'], arena: ['js/systems/gym-arena.js', 'BOSSSPLIT_ARENA'] };
const M = [
  ['update stops delegating to the brain', 'enemy', [['[vx, vy, animBase] = this.brain.step(dt, pl, dist, dx, dy, spd);', 'void 0;']]],
  ['applyFlinch skips the brain', 'enemy', [['if (this.brain) this.brain.flinch();', '']]],
  ['the arena spawns a plain enemy', 'arena', [['G.Boss.make(G.Gym.makeDef(g), arena.x, arena.y - ts * 3.5)', 'new G.Enemy(G.Gym.makeDef(g), arena.x, arena.y - ts * 3.5, { hp: 1, spd: 1, dmg: 1 }, true)']]],
  ['G.Boss.make forgets the brain', 'brain', [['if (e.gym) e.brain = new GymBrain(e);', '']]],
  ['a gym method copied back onto the body', 'enemy', [['cy() { return this.y; }', 'cy() { return this.y; }\n    gymPick(dist) { return null; }']]],
  ['touch stops writing the contact type', 'brain', [["e.atkCat = d.category === 'special' ? 'special' : 'physical'; e.atkType = d.type;", "e.atkCat = d.category === 'special' ? 'special' : 'physical';"]]],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bosssplit-mut-'));
let caught = 0;
for (const [name, which, edits] of M) {
  const [rel, env] = SRC[which];
  let s = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const [a, b] of edits) {
    if (!s.includes(a)) { console.log('STALE mutation (pattern not found): ' + name); process.exitCode = 1; s = null; break; }
    s = s.replace(a, b);
  }
  if (s == null) continue;
  const f = path.join(tmp, path.basename(rel));
  fs.writeFileSync(f, s);
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/boss-split-harness.js'), root], { env: Object.assign({}, process.env, { [env]: f }), encoding: 'utf8' });
  const hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name);
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught !== M.length) process.exitCode = 1;
