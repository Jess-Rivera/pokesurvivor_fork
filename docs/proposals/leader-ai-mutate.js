// Mutation check for Leader AI slice 2 (#31), swap and dodge decisions (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/leader-ai-mutate.js
// Each mutation breaks one file in one deliberate way, writes the copy to a temp folder, and runs leader-ai-harness.js against it
// (LA_<FILE>). The harness must fail every time; a miss is a gap, a stale pattern is reported as STALE.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const AI = 'js/entities/leader-ai.js',
  IN = 'js/systems/leader-info.js',
  AR = 'js/systems/gym-arena.js',
  LD = 'js/entities/gym-leader.js';
const ENV = { [AI]: 'LA_AI', [IN]: 'LA_INFO', [AR]: 'LA_ARENA', [LD]: 'LA_LEADER' };
const M = [
  // the stall guards and STAY
  ['minField is ignored', AI, "if (this.fieldT < S.minField - LeaderAI.EPS) return 'minField';", ''],
  ['swapLimit is ignored', AI, "if (S.swapLimit != null && this.swaps >= S.swapLimit) return 'swapLimit';", ''],
  ['a send-in does not restart the clock', AR, 't.ai.arrived(false);', ''],
  ['a voluntary swap does not restart the clock', AR, 't.ai.arrived(true);', ''],
  ['the margin is off', AI, 'if (best.score < S.stay * S.margin - LeaderAI.EPS) {', 'if (best.score < S.stay - LeaderAI.EPS) {'],
  ['a swap is decided inside a tell', AI, 'if (this.due && (G.Status.stunned(e) || !this.busy(e))) {', 'if (this.due) {'],
  ['the recovery counts as the tell', AI, 'return !!((c && !c.fired) || e.mvRoot', 'return !!(c || e.mvRoot'],
  // the triggers
  ['cc ignores the time left', AI, 'M.t >= S.ccLeft - LeaderAI.EPS', 'M.t > 0'],
  ['the low HP save repeats', AI, 'if (frac(e) < S.lowHp && !this.saved.has(e) && !this.healLeft(e)) {', 'if (frac(e) < S.lowHp && !this.healLeft(e)) {'],
  ['a spent heal cap still counts', AI, 'return b.healsLeft > 0 && b.pool()', 'return b.pool()'],
  ['the matchup HP floor is off', AI, 'if (frac(c.m) < S.matchupHp - LeaderAI.EPS) continue;', ''],
  // the matchup
  ['no STAB', AI, '(m.types.includes(d.type) ? 1.5 : 1)', '1'],
  ['every move of yours counts as revealed', AI, "for (const id of you && info ? info.reveals(you).moves : []) {", "for (const id of ['vine-whip', 'ember', 'tackle', 'growl']) {"],
  ['a tie ignores power', AI, '(k === best.k && d.basePower > best.power)', 'false'],
  ['the guess takes the first type', AI, 'if (!best || k > best.k) best = { id: null, type, k, power: 0 };', 'if (!best) best = { id: null, type, k, power: 0 };'],
  // dodges
  ['no reflex', AI, 'this.pending = { at: this.clock + S.reflex, serial: th.serial };', 'this.pending = { at: this.clock, serial: th.serial };'],
  ['a dodge inside a commitment', AI, 'if (this.busy(e)) return; // held', 'if (false) return; // held'],
  ['a dodge with no charge to spare', AI, 'if (ready <= S.dodgeReserve) {', 'if (ready <= 0 && false) {'],
  ['dodgeReserve is ignored', AI, 'if (ready <= S.dodgeReserve) {', 'if (ready <= 0) {'],
  ['the bag rolls dice', AI, 'for (let i = 0; i < n; i++) a.push(i < this.reads);', 'for (let i = 0; i < n; i++) a.push(this.rng() < this.reads / n);'],
  ['the floor is ignored', AI, 'left = Math.abs(l - r) < G.GymLeader.UNSTICK.tie ? off >= 0 : l > r;', 'left = off >= 0;'],
  ['it dodges toward the path', AI, '? off >= 0 : l > r;', '? off < 0 : l > r;'],
  ['a still shape: dodged sideways', AI, 'if (!th.vx && !th.vy) return G.U.norm(e.x - th.x, e.y - th.y);', ''],
  ['a miss is a threat', IN, 'if (d2 > reach * reach) return null;', ''],
  // the swap consequences
  ['a bench faint is not paid', AR, 'G.EnemyMgr.payKill(f, G.Game.player);', ''],
  ['a bench faint is the boss kill', AR, 'f.boss = false;\n', ''],
  ['a bench faint is loud', LD, 'if (this.benched) return; // a faint on the bench', 'if (false) return; // a faint on the bench'],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'leader-ai-mut-'));
let caught = 0,
  bad = 0;
for (const [name, file, a, b] of M) {
  const s = fs.readFileSync(path.join(root, file), 'utf8');
  if (!s.includes(a)) {
    console.log('STALE mutation (pattern not found): ' + name);
    bad++;
    continue;
  }
  const out = path.join(tmp, path.basename(file));
  fs.writeFileSync(out, s.replace(a, b));
  const env = Object.assign({}, process.env, { [ENV[file]]: out });
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/leader-ai-harness.js')], { env, encoding: 'utf8' });
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
