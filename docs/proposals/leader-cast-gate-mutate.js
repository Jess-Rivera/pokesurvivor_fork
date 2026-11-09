// Mutation check for #47a (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/leader-cast-gate-mutate.js
// Each mutation breaks one part of "a leader's attack goes through your cast gate" (js/entities/gym-leader.js, the leader's due step;
// js/systems/move-sim.js, gateOf and gateOpen), writes the copy to a temp folder and runs leader-cast-gate-harness.js against it
// (CG_LEADER, CG_SIM). The harness must fail every time; a miss is a gap. STALE means the pattern no longer matches.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const ENV = { 'js/entities/gym-leader.js': 'CG_LEADER', 'js/systems/move-sim.js': 'CG_SIM' };
const LD = 'js/entities/gym-leader.js',
  SM = 'js/systems/move-sim.js';
const M = [
  // the leader's due step
  ['the gate is bypassed', LD, ' || !G.MoveSim.gateOpen(e, d)) {', ') {'],
  ['a refusal is re-asked every frame', LD, '      s.t = G.MoveSim.RETRY;\n      return;', '      return;'],
  ['the nova is gated by its reach again', LD, ' || !G.MoveSim.gateOpen(e, d)) {', " || !G.MoveSim.gateOpen(e, d) || (form === 'nova' && G.U.dist(e.x, e.y, pl.x, pl.y) > G.Gyms.reachOf(d, form))) {"],
  ['the shot is limited by its flight again', LD, ' || !G.MoveSim.gateOpen(e, d)) {', " || !G.MoveSim.gateOpen(e, d) || (form === 'shot' && G.U.dist(e.x, e.y, pl.x, pl.y) > G.Gyms.reachOf(d, form))) {"],
  ['the Body refusal no longer waits the retry', LD, '    if (!pl || !e.acceptsAttack() || !G.MoveSim.gateOpen(e, d)) {', '    if (!e.acceptsAttack()) return;\n    if (!pl || !G.MoveSim.gateOpen(e, d)) {'],
  // your gate
  ['gateOpen ignores the targeting gate', SM, '  const gateOpen = (o, def) => !!gateOf(o, def, null);', '  const gateOpen = (o, def) => !!gateOf(o, def, { aim: 0, target: null });'],
  ['the retry is one frame', SM, '    RETRY = 0.05,', '    RETRY = 1 / 60,'],
  ['the melee gate ignores the foe body', SM, '      const t = nearest(o, o.x, o.y, R, (e) => Math.min(R, reach + e.r));', '      const t = nearest(o, o.x, o.y, R, () => Math.min(R, reach));'],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-mutate-'));
let caught = 0,
  stale = 0,
  miss = 0;
for (const [name, file, from, to] of M) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  if (!src.includes(from)) {
    console.log('STALE  ' + name);
    stale++;
    continue;
  }
  const out = path.join(tmp, path.basename(file));
  fs.writeFileSync(out, src.replace(from, to));
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'leader-cast-gate-harness.js')], { cwd: root, env: Object.assign({}, process.env, { [ENV[file]]: out }), encoding: 'utf8' });
  fs.unlinkSync(out);
  if (r.status !== 0) caught++;
  else {
    console.log('MISS   ' + name);
    miss++;
  }
}
fs.rmdirSync(tmp);
console.log('leader-cast-gate-mutate: ' + caught + '/' + M.length + ' caught' + (stale ? ', ' + stale + ' STALE' : '') + (miss ? ', ' + miss + ' MISS' : ''));
