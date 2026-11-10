// Mutation check for slice 4c-3, aimTrack, location, delay, falls and the travelling moves (Node only; not a harness, so tools/check.js
// does not run it). Usage from the repo root:  node docs/proposals/move-travel-mutate.js
// Each mutation breaks move-sim.js, move-effects.js or move-geom.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/move-travel-harness.js against it. The harness must fail every time; a mutation it misses is a gap in the tests.
const path = require('path');
const root = path.resolve(__dirname, '../..');
const SRC = { sim: 'js/systems/move-sim.js', fx: 'js/systems/move-effects.js', geom: 'js/systems/move-geom.js' };
const ENV = { sim: 'TRAVEL_SIM', fx: 'TRAVEL_FX', geom: 'TRAVEL_GEOM' };
const M = [
  // aimTrack
  ['aimTrack never turns', 'sim', [["if (!rate || inst.spec.delivery.anchor !== 'caster') return;", 'return;']]],
  ['the aimTrack turn is not clamped', 'sim', [['inst.heading = wrap(inst.heading + (want > cap ? cap : want < -cap ? -cap : want));', 'inst.heading = wrap(inst.heading + want);']]],
  ['the aimTrack turn goes the long way round', 'sim', [['const want = wrap(Math.atan2(t.y - inst.y, t.x - inst.x) - inst.heading), cap = rate * dt;',
    'const w0 = wrap(Math.atan2(t.y - inst.y, t.x - inst.x) - inst.heading), want = w0 > 0 ? w0 - Math.PI * 2 : w0 + Math.PI * 2, cap = rate * dt;']]],
  ['aimTrack re-picks the nearest every step (not sticky)', 'sim', [['if (live(t) && Math.hypot(t.x - o.x, t.y - o.y) <= lim(t) + EPS) return t;', '']]],
  ['aimTrack never re-picks when the target is lost', 'sim', [['inst.track = nearest(o.x, o.y, R, lim);\n    return inst.track;', 'return null;'],
    ['inst.track = nearest(o.x, o.y, R, lim);\r\n    return inst.track;', 'return null;']]],
  ['aimTrack tracks out to range, not reach', 'sim', [['lim = e => Math.min(R, reach + e.r);', 'lim = () => R;']]],
  ['the tracking cone does not follow the owner', 'sim', [['      follow(inst);     // R8 first', '      // R8 first']]],
  // location, delay, falls (Rock Slide)
  ['the hitbox is live during the delay', 'sim', [['for (const inst of insts) if (!inst.idle) collide(inst, maxR);', 'for (const inst of insts) collide(inst, maxR);']]],
  ['the delay counts inside the lifetime (ages while waiting)', 'sim', [['        inst.wait -= dt;', '        inst.wait -= dt; inst.age += dt;']]],
  ['the delayed instance moves while waiting', 'sim', [['        inst.wait -= dt;', '        inst.wait -= dt; MOTION[inst.spec.delivery.motion](inst, dt);']]],
  ['endOn is evaluated while waiting', 'sim', [['inst.done = inst.idle ? waitEnd(inst) : checkEnd(inst);', 'inst.done = checkEnd(inst);']]],
  ['a faint never ends a waiting instance', 'sim', [['if (!inst.cast.owner.dead) return null;', 'return null;']]],
  ['the falling point re-tracks its enemy', 'sim', [['falls() { },', 'falls(inst) { const t = inst.cast.target; if (t && !t.dead) { inst.x = t.x; inst.y = t.y; } },']]],
  ['the location pick ignores range', 'sim', [['if (live(e) && Math.hypot(e.x - o.x, e.y - o.y) <= R + EPS) cands.push(e);', 'if (live(e)) cands.push(e);']]],
  ['rng consumed while waiting', 'sim', [['return { aim: o.aim || 0, target: null, cands };', 'rng(); return { aim: o.aim || 0, target: null, cands };']]],
  ['the location pick is not uniform', 'sim', [['Math.floor(rng() * c.length)', 'Math.floor(rng() * rng() * c.length)']]],
  ['the location pick ignores the id order', 'sim', [['cands.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));', 'cands.reverse();']]],
  ['flinch never rolled', 'fx', [['function flinch(inst, e, rng, fx, hop) { if (foe(e) && rolls(fx, hop, rng)) e.applyFlinch(); }', 'function flinch() { }']]],
  // the travelling moves
  ['the wedge does not grow', 'geom', [['const g = start + grow.growSpeed *', 'const g = start + 0 *']]],
  ['the wedge grows past its max', 'geom', [['return grow.max == null ? g : Math.min(g, grow.max);', 'return g;']]],
  ['steering is not clamped', 'sim', [['inst.heading += want > cap ? cap : want < -cap ? -cap : want;', 'inst.heading += want;']]],
  ['steering re-picks every time the target is lost', 'sim', [['if (!inst.retargeted) {', 'if (true) {']]],
  ['the oscillation amplitude is off', 'sim', [['off = p.oscillate.amplitude * Math.sin(', 'off = p.oscillate.amplitude * 0.9 * Math.sin(']]],
  ['the oscillation frequency is off', 'sim', [['Math.sin(TAU * p.oscillate.frequency * inst.age)', 'Math.sin(TAU * p.oscillate.frequency * 1.1 * inst.age)']]],
  ['the oscillation depends on dt', 'sim', [['Math.sin(TAU * p.oscillate.frequency * inst.age)', 'Math.sin(TAU * p.oscillate.frequency * (inst.age + dt))']]],
  ['the curve is ignored', 'sim', [['if (p.curve) inst.heading += p.curve * dt;', '']]],
  // slice 6: path.loop (D38)
  ['the loop radius is off', 'sim', [['along = lr * Math.sin(th);', 'along = lr * 0.9 * Math.sin(th);']]],
  ['the loop frequency is off', 'sim', [['lw = TAU * p.loop.frequency,', 'lw = TAU * p.loop.frequency * 1.1,']]],
  ['the loop depends on dt', 'sim', [['th = lw * inst.age;', 'th = lw * (inst.age + dt);']]],
  ['the loop is not centred (it hangs off the caster)', 'sim', [['off -= lr * Math.cos(th);', 'off += lr * (1 - Math.cos(th));']]],
  ['the shot spawns on the caster (its first sweep crosses the loop)', 'sim', [['inst.x = inst.prevX = at.x + Math.sin(heading) * lr; inst.y = inst.prevY = at.y - Math.cos(heading) * lr;', '']]],
  ['the loop turns the base heading', 'sim', [['const lr = p.loop.radius,', 'inst.heading += 0.5 * dt; const lr = p.loop.radius,']]],
  ['vx / vy left as the base drift', 'sim', [['inst.vx = Math.cos(inst.heading) * va - Math.sin(inst.heading) * vc; inst.vy = Math.sin(inst.heading) * va + Math.cos(inst.heading) * vc;', '']]],
  ['the loop is ignored', 'sim', [['if (p.loop) {', 'if (false) {']]],
];

require('../../tools/mutate-runner.js')({
  label: 'move-travel-mutate',
  root,
  harnesses: ['docs/proposals/move-travel-harness.js'],
  args: [root],
  applyMode: 'any',
  mutants: M.map(([name, which, edits]) => ({ name, file: SRC[which], edits, env: { [ENV[which]]: '<out>' } })),
});
