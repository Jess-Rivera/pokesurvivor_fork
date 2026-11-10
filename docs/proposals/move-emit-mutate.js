// Mutation check for slice 4d, emitters, mines and the instance cap (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/move-emit-mutate.js
// Each mutation breaks move-sim.js in one deliberate way, writes the copy to a temp folder, and runs docs/proposals/move-emit-harness.js
// against it. The harness must fail every time; a mutation it misses is a gap in the tests.
const path = require('path');
const root = path.resolve(__dirname, '../..');
const SRC = { sim: 'js/systems/move-sim.js', fx: 'js/systems/move-effects.js', geom: 'js/systems/move-geom.js' };
const ENV = { sim: 'EMIT_SIM', fx: 'EMIT_FX', geom: 'EMIT_GEOM' };
const M = [
  ['an enemyHit child does not ignore the triggering enemy', 'sim', [['if (skip) c.hits.set(skip.id, { t: 0, leg: 0 });', '']]],
  ['enemyHit children start at the carrier, not the impact point', 'sim', [['emitOne(inst, st, e, inst.heading, e)', 'emitOne(inst, st, inst, inst.heading, e)']]],
  ['an interval emitter also emits at activation', 'sim', [["next: fx.trigger === 'interval' ? fx.every : 0", 'next: 0']]],
  ['an emitter emits at its end (H14 off)', 'sim', [['st.next < end - EPS', 'st.next <= end + EPS']]],
  ['count does not cap the emissions', 'sim', [['const capOk = st => st.fx.count == null || st.done < st.fx.count;', 'const capOk = () => true;']]],
  ['casterMove counts standing time too', 'sim', [['if (moved) st.acc += dt;', 'st.acc += dt;']]],
  ['at most one emission per step', 'sim', [['while (capOk(st) && st.next <= inst.age + EPS', 'if (capOk(st) && st.next <= inst.age + EPS']]],
  ['the cap never removes a mine', 'sim', [['const drop = live.slice(0, Math.max(0, live.length + add - G.MoveResolver.TUNING.INSTANCE_CAP));', 'const drop = [];']]],
  ['the cap removes the newest, not the oldest', 'sim', [['const drop = live.slice(0, Math.max(0, live.length + add - G.MoveResolver.TUNING.INSTANCE_CAP));',
    'const drop = live.slice(live.length - Math.max(0, live.length + add - G.MoveResolver.TUNING.INSTANCE_CAP), live.length);']]],
  ['a mine never goes off', 'sim', [["if (inst.fired) return 'triggered';", '']]],
  ['notActive never ends an instance', 'sim', [["notActive: inst => { const o = inst.cast.owner; return !!o.activeGroup && !o.activeGroup().includes(inst.cast.slot) && 'notActive'; },", 'notActive: () => false,']]],
  ['a pure emitter has a hitbox', 'sim', [['if (inst.armed === false || inst.hitless || !inst.shape) return;', 'if (inst.armed === false || !inst.shape) return;']]],
  ['children lose the parent power (H13)', 'sim', [['accuracy: def.accuracy, basePower: def.basePower }', 'accuracy: def.accuracy, basePower: 0 }']]],
  ['a turret fires with nothing in range', 'sim', [['if (!target) return false;', 'if (!target) target = null;']]],
  ['the turret ignores the shot range', 'sim', [['const R = rangeOf(kid);', 'const R = 420;']]],
  ['the child fan ignores its spread', 'sim', [['fanAngle(heading, i, n, (kid.space && kid.space.spread) || 0)', 'fanAngle(heading, i, n, 0)']]],
  ['a shapeless persistent emitter never spawns', 'sim', [['(!def.space && !emitting(def))', '!def.space']]],
  ['children are not deferred (they take a step in their emit frame)', 'sim', [['(later ? pending : insts).push(inst);', 'insts.push(inst); if (later) { inst.age += 1 / 60; }']]],
  ['termination never bursts', 'sim', [['if (inst.done && inst.emits && BURST[inst.done]) burst(inst);', '']]],
  ['a burst on ownerDeath', 'sim', [['const BURST = { time: true,', 'const BURST = { ownerDeath: true, time: true,']]],
  ['a burst on notActive', 'sim', [['const BURST = { time: true,', 'const BURST = { notActive: true, time: true,']]],
  ['a burst when the cap removes an instance', 'sim', [["i.done = 'cap';", "i.done = 'cap'; if (i.emits) burst(i);"]]],
  ['offScreen does not burst', 'sim', [['arrived: true, offScreen: true };', 'arrived: true };']]],
  ['the burst starts at the cast point, not the end position', 'sim', [['emitOne(inst, st, { x: inst.x, y: inst.y }, inst.heading)', 'emitOne(inst, st, { x: inst.cast.x, y: inst.cast.y }, inst.heading)']]],
  ['a burst child takes a step in its emit frame', 'sim', [['emitOne(inst, st, { x: inst.x, y: inst.y }, inst.heading)) st.done++;', 'emitOne(inst, st, { x: inst.x, y: inst.y }, inst.heading)) { st.done++; for (const c of pending) c.age += 1 / 60; }']]],
];

require('../../tools/mutate-runner.js')({
  label: 'move-emit-mutate',
  root,
  harnesses: ['docs/proposals/move-emit-harness.js'],
  args: [root],
  applyMode: 'any',
  mutants: M.map(([name, which, edits]) => ({ name, file: SRC[which], edits, env: { [ENV[which]]: '<out>' } })),
});
