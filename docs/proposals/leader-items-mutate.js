// Mutation check for entity model slice 7b (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/leader-items-mutate.js
// Each mutation breaks one file in one deliberate way, writes the copy to a temp folder, and runs leader-items-harness.js against it
// (LI_<FILE>). The harness must fail every time; a miss is a gap, a stale pattern is reported as STALE.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const IT = 'js/data/items.js',
  LD = 'js/entities/gym-leader.js',
  AR = 'js/systems/gym-arena.js',
  GY = 'js/data/gyms.js';
const ENV = { [IT]: 'LI_ITEMS', [LD]: 'LI_LEADER', [AR]: 'LI_ARENA', [GY]: 'LI_GYMS' };
const M = [
  // the readers (Q1)
  ['Brass Knuckles reads your roster', IT, 'const team = teamOf(pl);\n    if (team.length', 'const team = rosterOf();\n    if (team.length'],
  ["Pikachu's Tear reads your roster", IT, 'const team = teamOf(pl);\n    let n = 0;', 'const team = rosterOf();\n    let n = 0;'],
  ['the readout reads your roster', IT, 'const roster = teamOf(pl);', 'const roster = rosterOf();'],
  ['no fallback for a holder with no team', IT, 'return pl && pl.team && Array.isArray(pl.team.members) ? pl.team.members : rosterOf();', 'return pl.team.members;'],
  ['the 3+ rule is dropped', IT, 'if (team.length < HP_TEAM_MIN) return 1;', ''],
  // Re-Do (Q3, Q4)
  ['Re-Do is ignored', AR, 'const redo = !t.living().length && G.GymLeader.redoReady(t);', 'const redo = false;'],
  ['Re-Do on every wipe', LD, 't.redoUsed = true;', ''],
  ['the first wipe pays the boss credit', LD, ' || G.GymLeader.redoReady(this.team)', ''],
  ['Re-Do resumes on slot 1', LD, 'return t.sendIn(t.activeIdx);', 'return t.sendIn(0);'],
  ['no beat before Re-Do', AR, 'if ((arena.sendT -= dt) > 0) return;', 'if (!redo && (arena.sendT -= dt) > 0) return;'],
  ['the revived keep boss off', LD, 'm.boss = true;', ''],
  ['Re-Do revives at half HP', LD, 'm.revive(1);', 'm.revive(0.5);'],
  ['the enrage clocks are not reset', LD, 'm.gym.engagedAt = null;', ''],
  // the validator (Q2, Q5)
  ['Regen allowed at one mon', GY, 'Math.min(Number(k), roster.length) < 2)', 'Math.min(Number(k), roster.length) < 1)'],
  ['Regen never allowed', GY, "else if (c.id === 'regen' && Math.min(Number(k), roster.length) < 2)", "else if (c.id === 'regen')"],
  ['the ban list keeps Re-Do', GY, '  const LEADER_ITEM_BAN = {\n', "  const LEADER_ITEM_BAN = {\n    redo: 'it reads a team',\n"],
  ['the 3+ warning is dropped', GY, 'if (!idle.length || size >= min) return null;', 'return null;'],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'leader-items-mut-'));
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
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/leader-items-harness.js')], { env, encoding: 'utf8' });
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
