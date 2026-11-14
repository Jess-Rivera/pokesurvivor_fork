// Mutation check for the slice 3c move sim (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/move-sim-mutate.js
// Each mutation breaks move-sim.js or move-effects.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/move-sim-harness.js against it. The harness must fail every time; a mutation it misses is a gap in the tests.
const path = require('path');
const root = path.resolve(__dirname, '../..');
const SRC = { sim: path.join(root, 'js/systems/move-sim.js'), fx: path.join(root, 'js/systems/move-effects.js') };
const M = [
  ['pierce off by one (n + 2 enemies)', 'sim', [['if (inst.struck > inst.pierce) continue;', 'if (inst.struck > inst.pierce + 1) continue;'], ["inst.struck > inst.pierce ? 'pierce'", "inst.struck > inst.pierce + 1 ? 'pierce'"]]],
  ['eligibility check skipped', 'sim', [['if (!elig(rec, inst)) continue;', '']]],
  ['crit applied after the 1 HP floor', 'fx', [['Math.max(1, D * k * G.Stats.itemDmgMul(o, def.type, k) * (b.crit ? b.critMul : 1))', 'Math.max(1, D * k * G.Stats.itemDmgMul(o, def.type, k)) * (b.crit ? b.critMul : 1)']]],
  ['crit rolled even when it cannot crit', 'fx', [['crit: c > 0 && rng() < c', 'crit: rng() < c']]],
  ['crit rolled with Math.random', 'fx', [['crit: c > 0 && rng() < c', 'crit: c > 0 && Math.random() < c']]],
  ['attacker half frozen at cast', 'fx', [['A: o.moveFactor(m), // D6', 'A: inst.cast.A || (inst.cast.A = o.moveFactor(m)), // D6']]],
  ['root instances deferred a frame', 'sim', [['(later ? pending : insts).push(inst);', '(later ? pending : (G.__q = G.__q || [])).push(inst);'], ['insts = insts.filter((i) => !i.done);', 'insts = insts.filter((i) => !i.done); if (G.__q) { insts.push(...G.__q); G.__q = null; }']]],
  ['growth ignored', 'sim', [['inst.spec.delivery.grow || null, // growth', 'null, // growth']]],
  ['full-circle fan spaced 2 pi / (count - 1)', 'sim', [['aim + (i * TAU) / n', 'aim + (i * TAU) / (n - 1)']]],
  ['lens applied twice', 'sim', [['lens: lensOf(inst.cast.owner),', 'lens: lensOf(inst.cast.owner) ** 2,']]],     // retargeted 2026-10-31 (4d made the shape conditional)
  ['termination before collision', 'sim', [['for (const inst of insts) if (!inst.idle) collide(inst, maxR);', ''], ['insts = insts.filter((i) => !i.done);', 'for (const inst of insts) if (!inst.done && !inst.idle) collide(inst, maxR); insts = insts.filter((i) => !i.done);']]],
  ['boundsOf without the enemy radius', 'sim', [['G.MoveGeom.boundsOf(s, inst.prevX, inst.prevY, maxR)', 'G.MoveGeom.boundsOf(s, inst.prevX, inst.prevY, 0)']]],
  ['interval strict, no tolerance', 'sim', [['inst.age - rec.t >= inst.spec.rehit - EPS', 'inst.age - rec.t > inst.spec.rehit']]],
  ['end time without tolerance', 'sim', [["inst.age >= v - EPS && 'time'", "inst.age >= v && 'time'"]]],
  ['no sweep-order sort', 'sim', [['    cands.sort(\n', '    [].sort(\n']]],
  ['cast gate ignores the shape reach', 'sim', [['(e) => Math.min(R, reach + e.r)', '() => R']]],
  ['turn before move (D23 order)', 'sim', [['if (p.curve) inst.heading += p.curve * dt;', ''], ['inst.bx += Math.cos(inst.heading) * v * dt;', 'if (p.curve) inst.heading += p.curve * dt; inst.bx += Math.cos(inst.heading) * v * dt;']]],
  ['turnRate as a damp, not a clamp', 'sim', [['inst.heading += want > cap ? cap : want < -cap ? -cap : want;', 'inst.heading += want * Math.min(1, cap);']]],
  ['steering re-picks forever', 'sim', [['if (!inst.retargeted) {', 'if (true) {']]],
  ['oscillation offset along the heading', 'sim', [['inst.x = inst.bx + Math.cos(inst.heading) * along - Math.sin(inst.heading) * off;', 'inst.x = inst.bx + Math.cos(inst.heading) * along + Math.cos(inst.heading) * off;']]],
  ['cooldown ignores cdMul floor order (cd x 0.9)', 'sim', [['slot.t = buff ? 0 : Math.max(0.05, def.cd * (o.cdMul || 1));', 'slot.t = buff ? 0 : Math.max(0.05, def.cd * 0.9);']]],
  ['stunned owner still casts', 'sim', [['if (o.acceptsCast ? !o.acceptsCast() : G.Status.stunned(o)) {\n      slot.t = RETRY;\n      return null;\n    } // a Player entity', '// a Player entity']]], // #43 retarget: the Body's acceptsCast
  ['fizzle refunds the cooldown', 'sim', [['if (buff) slot.t = G.Stages.gateOf(false, G.MoveEffects.gateMulOf(o));\n      return null;', 'slot.t = RETRY;\n      return null;']]],
  ['STAB dropped (owner.stabFor ignored)', 'fx', [['o.stabFor(m)', 'false']]],
  // slice 3d
  ['routing filter ignored', 'sim', [['!routed(slot.id) || ', '']]],
  ['grass spends pierce', 'sim', [['if (!isProp(e) || e.solid) inst.struck++;', 'inst.struck++;']]],
  ['solid props never spend pierce', 'sim', [['if (!isProp(e) || e.solid) inst.struck++;', 'if (!isProp(e)) inst.struck++;']]],
  ['props left out of the sweep', 'sim', [['p.x, p.y, p.r)) cands.push(p);', 'p.x, p.y, p.r)) {}']]],
  ['props emit move:hit', 'sim', [["if (e.hp > 0) G.MoveEffects.applyProp(inst, e);\n        continue;", "if (e.hp > 0) G.MoveEffects.applyProp(inst, e);\n        G.SimBus.emit('move:hit', { moveId: inst.spec.id, enemyId: null });\n        continue;"]]]
];

require('../../tools/mutate-runner.js')({
  label: 'move-sim-mutate',
  root,
  harnesses: ['docs/proposals/move-sim-harness.js'],
  args: [root],
  mutants: M.map(([name, which, edits]) => ({ name, file: path.relative(root, SRC[which]), edits, env: { [which === 'sim' ? 'MOVE_SIM_SRC' : 'MOVE_FX_SRC']: '<out>' } })),
});
