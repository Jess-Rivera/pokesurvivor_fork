// Mutation check for slice 4c-1, persistence and orbits (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/move-persist-mutate.js
// Each mutation breaks move-sim.js, move-effects.js or move-resolver.js in one deliberate way, writes the copy to a temp folder, and
// runs docs/proposals/move-persist-harness.js against it. The harness must fail every time; a mutation it misses is a gap in the tests.
// The validator rules are guarded by their own self-test fixtures in tools/validate_moves.js (run by tools/check.js).
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = { sim: 'js/systems/move-sim.js', fx: 'js/systems/move-effects.js', res: 'js/data/move-resolver.js' };
const ENV = { sim: 'PERSIST_SIM', fx: 'PERSIST_FX', res: 'PERSIST_RESOLVER' };
const M = [
  ['persistent group respawns every frame', 'sim', [['else if (!mine.length) spawnPersistent(o, slot, def, now);', 'else spawnPersistent(o, slot, def, now);']]],
  ['survives a swap away', 'sim', [["else if (stunned || !act.includes(slot)) endGroup(mine, 'notActive');", "else if (stunned) endGroup(mine, 'notActive');"]]],
  ['survives a stun', 'sim', [["else if (stunned || !act.includes(slot)) endGroup(mine, 'notActive');", "else if (!act.includes(slot)) endGroup(mine, 'notActive');"]]],
  ['never recreated after a swap back', 'sim', [['else if (!mine.length) spawnPersistent(o, slot, def, now);', 'else if (!mine.length && !slot.spawnedOnce) { slot.spawnedOnce = true; spawnPersistent(o, slot, def, now); }']]],
  ['a removed slot leaves its group alive', 'sim', [["if (orphans.length) endGroup(orphans, o.dead ? 'ownerDeath' : 'notActive');", 'if (orphans.length) {}']]],
  ['a faint leaves the group alive', 'sim', [["if (o.dead) endGroup(mine, 'ownerDeath');", 'if (o.dead) {}']]],
  ['reuses old hit records after a swap back', 'sim', [['hits: new Map(), done', 'hits: cast.persist ? (cast.slot.rec = cast.slot.rec || new Map()) : new Map(), done']]],
  ['persistent move arms a cooldown', 'sim', [['const self = G.MoveEffects.applyCast(def, cast, rng), roots = []', 'slot.t = 1; const self = G.MoveEffects.applyCast(def, cast, rng), roots = []']]],
  ['orbit hitbox squashed in the sim', 'sim', [['inst.y = o.y + Math.sin(a) * r;', 'inst.y = o.y + Math.sin(a) * r * 0.7;']]],
  ['orbit ignores the lens', 'sim', [['r = d.orbitRadius * lensOf(o);', 'r = d.orbitRadius;']]],
  ['orbit does not follow the caster', 'sim', [['inst.x = o.x + Math.cos(a) * r; inst.y = o.y + Math.sin(a) * r;', 'inst.x = inst.cast.x + Math.cos(a) * r; inst.y = inst.cast.y + Math.sin(a) * r;']]],
  ['orbit tests only the current point (no sweep)', 'sim', [['MOTION[inst.spec.delivery.motion](inst, dt);', "MOTION[inst.spec.delivery.motion](inst, dt); if (inst.spec.delivery.motion === 'orbits') { inst.prevX = inst.x; inst.prevY = inst.y; }"]]],
  ['orbit not started on the ring', 'sim', [["if (d.motion === 'orbits') { MOTION.orbits(inst); inst.prevX = inst.x; inst.prevY = inst.y; }", '']]],
  ['persistent shapes ignore their radius (lens 2)', 'sim', [['lens: lensOf(inst.cast.owner) });', 'lens: inst.spec.persistent ? 2 : lensOf(inst.cast.owner) });']]],
  ['Leaf Storm self drop on the base Gate', 'fx', [['else G.Stages.trackOwn(o, k, fx.stages, src, G.Stages.gateOf(fx.stages < 0));', 'else G.Stages.trackOwn(o, k, fx.stages, src, G.Stages.gateOf(false));']]],     // slice 5a (SS12); was 'stacks per hit' on the retired maxStacks
  ['Night Shade takes a multiplier', 'fx', [['flat(inst, e, inst.cast.owner.level || 1, hop, hit)', 'flat(inst, e, (inst.cast.owner.level || 1) * 1.5, hop, hit)']]],
  ['freeze removed', 'res', [['G.MoveDefs = freeze(resolve(G.MoveData, G.MoveOverrides, G.MoveHandlers));', 'G.MoveDefs = resolve(G.MoveData, G.MoveOverrides, G.MoveHandlers);']]],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'move-persist-mut-'));
let caught = 0;
for (const [name, file, edits] of M) {
  let s = fs.readFileSync(path.join(root, SRC[file]), 'utf8');
  for (const [a, b] of edits) { if (!s.includes(a)) { console.log('MUTATION DID NOT APPLY: ' + name + '  (' + a + ')'); process.exit(2); } s = s.replace(a, b); }
  const out = path.join(tmp, file + '.js'); fs.writeFileSync(out, s);
  const env = Object.assign({}, process.env, { [ENV[file]]: out });
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/move-persist-harness.js'), root], { env, encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n'), hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find(l => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')' : ''));
}
console.log('mutations caught: ' + caught + '/' + M.length);
process.exit(caught === M.length ? 0 : 1);
