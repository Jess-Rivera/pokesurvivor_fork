// Mutation check for slice 4c-2, returns and repositions (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/move-motion-mutate.js
// Each mutation breaks move-sim.js or move-effects.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/move-motion-harness.js against it. The harness must fail every time; a mutation it misses is a gap in the tests.
// Not mutated: the range cap on the dash point, since the nearest-target cast gate (R9) already keeps every target inside range.
const path = require('path');
const root = path.resolve(__dirname, '../..');
const SRC = { sim: 'js/systems/move-sim.js', fx: 'js/systems/move-effects.js' };
const ENV = { sim: 'MOTION_SIM', fx: 'MOTION_FX' };
const M = [
  ['the hit record leg stays 0', 'sim', [['inst.hits.set(key, { t: inst.age, leg: inst.leg });', 'inst.hits.set(key, { t: inst.age, leg: 0 });']]],
  ['the leg is ignored in eligibility', 'sim', [['rec = had && had.leg === inst.leg ? had : null', 'rec = had']]],
  ['the pierce budget is not reset per leg', 'sim', [['function newLeg(inst, armed) {\n    inst.leg++;\n    inst.struck = 0;\n    inst.armed = armed;\n  }', 'function newLeg(inst, armed) {\n    inst.leg++;\n    inst.armed = armed;\n  }']]],
  ['returns never turn around', 'sim', [['if (inst.dist >= R - EPS) inst.turn = true;', 'if (false) inst.turn = true;']]],
  ['the turnaround at the wrong distance', 'sim', [['const R = rangeOf(inst.spec),\n          s = Math.min(v * dt, Math.max(0, R - inst.dist));', 'const R = rangeOf(inst.spec) * 0.8,\n          s = Math.min(v * dt, Math.max(0, R - inst.dist));']]],
  ['the back leg aims at the origin, not the owner', 'sim', [['const dx = o.x - inst.bx,\n          dy = o.y - inst.by,\n          D = Math.hypot(dx, dy),\n          s = Math.min(v * dt, D);', 'const dx = inst.cast.x - inst.bx, dy = inst.cast.y - inst.by,\n          D = Math.hypot(dx, dy),\n          s = Math.min(v * dt, D);']]],
  ['returned never fires', 'sim', [["returned: (inst) => !!inst.returned && 'returned'", 'returned: (inst) => false']]],
  ['the hitbox is armed in transit', 'sim', [['if (inst.armed === false || inst.hitless || !inst.shape) return;', 'if (inst.hitless || !inst.shape) return;']]],     // retargeted 2026-10-31 (4d added the hitless and shapeless guards)
  ['the dash ignores walls', 'sim', [['if (!G.World.isFree(o.x + ux * d, o.y + uy * d, pr, true)) break;', 'if (false) break;']]],
  ['no snap at the end of a leg', 'sim', [['inst.px = tx;\n          inst.py = ty; // snap', 'inst.px += dx / rem * s; inst.py += dy / rem * s; // snap']]],
  ['pierce exhaustion ends a dash or a bone', 'sim', [['if (owned) return null;', 'if (false) return null;']]],
  // 4c-2 review: the root gate, the one-way dash end and the unrooted speed read
  ['a root does not hold a reposition', 'sim', [["!cms.some((m) => m.o === o && m.part === 'movement' && m.type === 'rooted') &&", '']]],
  ['a one-way dash never ends on arrival', 'sim', [["if (inst.dash && inst.phase === 'done' && !inst.spec.delivery.returnToOrigin) return 'arrived';", '']]],
  ['the dash speed reads the root flag', 'sim', [['const speedOf = (o) => (o.unrootedSpd != null ? o.unrootedSpd : o.spd) || 0;', 'const speedOf = (o) => o.spd || 0;']]],
  ['i-frames on the out leg only', 'sim', [['if (iv) o.invuln = Math.max(o.invuln || 0, iv); // P8', "if (iv && inst.phase === 'out') o.invuln = Math.max(o.invuln || 0, iv); // P8"]]],
  ['no 0.3 s tail', 'sim', [['if (iv) o.invuln = Math.max(o.invuln || 0, iv); // P8', 'if (iv && !inst.returned) o.invuln = Math.max(o.invuln || 0, iv); // P8']]],
  ['the dash root is never cleared', 'sim', [['for (const o of unroot) rootOf(o);', '']]],
  ['the dash root is never set', 'sim', [["||\n      insts.some((i) => i.dash && i.cast.owner === o);\n  };", ';\n  };']]],
  ['a dash over a live dash', 'sim', [['(!insts.some((i) => i.dash && i.cast.owner === o) &&', '(true &&']]],
  ['a faint leaves the bones alive', 'sim', [["if (owned && inst.cast.owner.dead) return 'ownerDeath';", '']]],
  ['the teleport does not move the owner', 'sim', [['o.x = p.x;\n      o.y = p.y;\n      inst.x = inst.prevX = p.x;', 'inst.x = inst.prevX = p.x;']]],
  ['knockback ignores travel', 'fx', [['dx = inst.vx;\n    dy = inst.vy;', '']]],
  ['the pull is not clamped', 'fx', [['if (dx * tx + dy * ty > 0) k = Math.min(', 'if (false) k = Math.min(']]],
  ['the clamp also cuts pushes', 'fx', [['if (dx * tx + dy * ty > 0) k = Math.min(', 'if (true) k = Math.min(']]],
];

require('../../tools/mutate-runner.js')({
  label: 'move-motion-mutate',
  root,
  harnesses: ['docs/proposals/move-motion-harness.js'],
  args: [root],
  mutants: M.map(([name, which, edits]) => ({ name, file: SRC[which], edits, env: { [ENV[which]]: '<out>' } })),
});
