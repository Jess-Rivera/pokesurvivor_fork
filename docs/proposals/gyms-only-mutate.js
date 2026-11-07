// Mutation check for the gyms-only removal (slice 7a-0, commit A; Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/gyms-only-mutate.js
// Each mutation breaks gym-arena.js, spawner.js, enemies.js, achievements.js or goals-ui.js in one deliberate way, writes the copy to a temp
// folder, and runs docs/proposals/gyms-only-harness.js against it (GYMSONLY_<FILE> env vars). The harness must fail every time.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gymsonly-mut-'));
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
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/gyms-only-harness.js'), root], { env: Object.assign({}, process.env, { [env]: f }), encoding: 'utf8' });
  const hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name);
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught !== M.length) process.exitCode = 1;
