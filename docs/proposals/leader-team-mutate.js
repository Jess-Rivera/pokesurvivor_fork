// Mutation check for entity model slice 7a (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/leader-team-mutate.js
// Each mutation breaks one file in one deliberate way, writes the copy to a temp folder, and runs leader-team-harness.js against it
// (LT_<FILE>). The harness must fail every time; a miss is a gap, a stale pattern is reported as STALE.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const LD = 'js/entities/gym-leader.js',
  AR = 'js/systems/gym-arena.js',
  GY = 'js/data/gyms.js';
const ENV = { [LD]: 'LT_LEADER', [AR]: 'LT_ARENA', [GY]: 'LT_GYMS' };
const M = [
  // the lineup
  ['only slot 1 is built', AR, 'for (let i = 1; i < n; i++) members.push(', 'for (let i = 1; i < 1; i++) members.push('],
  ['an old-body gym fields a team', AR, 'if (first.gym.playerEntity) {', 'if (true) {'],
  ['the bench joins the enemy list', AR, 'e = arena.team.active;', 'e = arena.team.active;\n      for (const b of members.slice(1)) G.EnemyMgr.add(b);'],
  ['the team path is skipped', AR, 'if (arena.team) return teamTick(dt);', ''],
  // the send-out
  ['no send-out beat', AR, 'if (arena.sendT == null) arena.sendT = SEND_BEAT;', 'if (arena.sendT == null) arena.sendT = 0;'],
  ['the first faint wins', AR, 'if (!t.living().length && !redo) {', 'if (true) {'], // slice 7b retarget
  ['the beat does not tick team raises', AR, 'G.Stages.teamTick(t.stages, dt);', ''],
  ['the bench does not tick', AR, 't.benchTick(dt, benchFaint);', ''],
  ['the arena does not follow the next mon', AR, 'arena.bossId = next.id;', ''],
  // per mon vs once
  ['a mid-team faint is the boss', LD, 'this.boss = false;', ''],
  ['a mid-team faint rolls the gym drop', LD, "G.Audio.sfx('faint');\n      return;", "G.Audio.sfx('faint');"],
  // the team builder
  ['the cards are lost on the team', LD, 'for (const id of Object.keys(cards)) G.TeamCards.add(t.cards, id, cards[id]);', ''],
  ['the run item ids are lost', LD, 't.runItems.push(...ids);', ''],
  ['slots are not numbered', LD, 'members.forEach((m, i) => (m.teamSlot = i));', ''],
  // the win line and the clock (Jess 2026-11-07)
  ['the win line names a mon', AR, "'Gym Leader ' + arena.gym.leader + ' Defeated!'", "'Gym Leader ' + arena.gym.species + ' Defeated!'"],
  ['a bench DoT starts the clock', LD, 'if (this.benched) return res;', ''],
  // the data
  ['Misty has no loop 2 hpMult', GY, 'hpMult: { 1: 25, 2: 19 },', 'hpMult: { 1: 25 },'],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'leader-team-mut-'));
let caught = 0,
  bad = 0;
for (const [name, file, a, b] of M) {
  const s = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
  if (!s.includes(a)) {
    console.log('STALE mutation (pattern not found): ' + name);
    bad++;
    continue;
  }
  const out = path.join(tmp, path.basename(file));
  fs.writeFileSync(out, s.replace(a, b));
  const env = Object.assign({}, process.env, { [ENV[file]]: out });
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/leader-team-harness.js')], { env, encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n');
  if (r.status !== 0) {
    caught++;
    console.log('caught  ' + name + '  (' + (lines.find((l) => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')');
  } else {
    bad++;
    console.log('MISSED  ' + name);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(caught + '/' + M.length + ' mutations caught');
process.exit(bad ? 1 : 0);
