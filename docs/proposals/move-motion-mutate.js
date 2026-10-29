// Mutation check for slice 4c-2, returns and repositions (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/move-motion-mutate.js
// Each mutation breaks move-sim.js or move-effects.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/move-motion-harness.js against it. The harness must fail every time; a mutation it misses is a gap in the tests.
// Not mutated: the range cap on the dash point, since the nearest-target cast gate (R9) already keeps every target inside range.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = { sim: 'js/systems/move-sim.js', fx: 'js/systems/move-effects.js' };
const ENV = { sim: 'MOTION_SIM', fx: 'MOTION_FX' };
const M = [
  ['the hit record leg stays 0', 'sim', [['inst.hits.set(key, { t: inst.age, leg: inst.leg });', 'inst.hits.set(key, { t: inst.age, leg: 0 });']]],
  ['the leg is ignored in eligibility', 'sim', [['rec = had && had.leg === inst.leg ? had : null', 'rec = had']]],
  ['the pierce budget is not reset per leg', 'sim', [['function newLeg(inst, armed) { inst.leg++; inst.struck = 0; inst.armed = armed; }', 'function newLeg(inst, armed) { inst.leg++; inst.armed = armed; }']]],
  ['returns never turn around', 'sim', [['if (inst.dist >= R - EPS) inst.turn = true;', 'if (false) inst.turn = true;']]],
  ['the turnaround at the wrong distance', 'sim', [['const R = rangeOf(inst.spec), s = Math.min(v * dt, Math.max(0, R - inst.dist));', 'const R = rangeOf(inst.spec) * 0.8, s = Math.min(v * dt, Math.max(0, R - inst.dist));']]],
  ['the back leg aims at the origin, not the owner', 'sim', [['const dx = o.x - inst.bx, dy = o.y - inst.by, D = Math.hypot(dx, dy), s = Math.min(v * dt, D);', 'const dx = inst.cast.x - inst.bx, dy = inst.cast.y - inst.by, D = Math.hypot(dx, dy), s = Math.min(v * dt, D);']]],
  ['returned never fires', 'sim', [["returned: inst => !!inst.returned && 'returned'", 'returned: inst => false']]],
  ['the hitbox is armed in transit', 'sim', [['if (inst.armed === false) return;', 'if (false) return;']]],
  ['the dash ignores walls', 'sim', [['if (!G.World.isFree(o.x + ux * d, o.y + uy * d, pr, true)) break;', 'if (false) break;']]],
  ['no snap at the end of a leg', 'sim', [['inst.px = tx; inst.py = ty;     // snap', 'inst.px += dx / rem * s; inst.py += dy / rem * s;     // snap']]],
  ['pierce exhaustion ends a dash or a bone', 'sim', [['if (owned) return null;', 'if (false) return null;']]],
  // 4c-2 review: the root gate, the one-way dash end and the unrooted speed read
  ['a root does not hold a reposition', 'sim', [["!cms.some(m => m.o === o && m.part === 'movement' && m.type === 'rooted') &&", '']]],
  ['a one-way dash never ends on arrival', 'sim', [["if (inst.dash && inst.phase === 'done' && !inst.spec.delivery.returnToOrigin) return 'arrived';", '']]],
  ['the dash speed reads the root flag', 'sim', [['const speedOf = o => (o.unrootedSpd != null ? o.unrootedSpd : o.spd) || 0;', 'const speedOf = o => o.spd || 0;']]],
  ['i-frames on the out leg only', 'sim', [['if (iv) o.invuln = Math.max(o.invuln || 0, iv);     // P8', "if (iv && inst.phase === 'out') o.invuln = Math.max(o.invuln || 0, iv);     // P8"]]],
  ['no 0.3 s tail', 'sim', [['if (iv) o.invuln = Math.max(o.invuln || 0, iv);     // P8', 'if (iv && !inst.returned) o.invuln = Math.max(o.invuln || 0, iv);     // P8']]],
  ['the dash root is never cleared', 'sim', [['for (const o of unroot) rootOf(o);', '']]],
  ['the dash root is never set', 'sim', [["|| insts.some(i => i.dash && i.cast.owner === o); };", '; };']]],
  ['a dash over a live dash', 'sim', [['(!insts.some(i => i.dash && i.cast.owner === o) &&', '(true &&']]],
  ['a faint leaves the bones alive', 'sim', [["if (owned && inst.cast.owner.dead) return 'ownerDeath';", '']]],
  ['the teleport does not move the owner', 'sim', [['o.x = p.x; o.y = p.y; inst.x = inst.prevX = p.x;', 'inst.x = inst.prevX = p.x;']]],
  ['knockback ignores travel', 'fx', [['dx = inst.vx; dy = inst.vy;', '']]],
  ['the pull is not clamped', 'fx', [['if (dx * tx + dy * ty > 0) k = Math.min(', 'if (false) k = Math.min(']]],
  ['the clamp also cuts pushes', 'fx', [['if (dx * tx + dy * ty > 0) k = Math.min(', 'if (true) k = Math.min(']]],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'move-motion-mut-'));
let caught = 0;
for (const [name, file, edits] of M) {
  let s = fs.readFileSync(path.join(root, SRC[file]), 'utf8');
  for (const [a, b] of edits) { if (!s.includes(a)) { console.log('MUTATION DID NOT APPLY: ' + name + '  (' + a + ')'); process.exit(2); } s = s.replace(a, b); }
  const out = path.join(tmp, file + '.js'); fs.writeFileSync(out, s);
  const env = Object.assign({}, process.env, { [ENV[file]]: out });
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/move-motion-harness.js'), root], { env, encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n'), hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find(l => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')' : ''));
}
console.log('mutations caught: ' + caught + '/' + M.length);
process.exit(caught === M.length ? 0 : 1);
