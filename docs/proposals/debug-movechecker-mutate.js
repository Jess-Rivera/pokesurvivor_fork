// Mutation check for G.Debug.movechecker (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/debug-movechecker-mutate.js
// Each mutation breaks js/core/debug.js or js/systems/move-render.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/debug-movechecker-harness.js against it. The harness must fail every time; a mutation it misses is a gap in the tests.
// The unmutated sources must pass first. The list below is plain JSON (double quotes) so a sandbox bundler can read it too.
const path = require('path');
const root = path.resolve(__dirname, '../..');
const SRC = { debug: path.join(root, 'js/core/debug.js'), render: path.join(root, 'js/systems/move-render.js') };
const ENV = { debug: 'MC_DEBUG_SRC', render: 'MC_RENDER_SRC' };
// @@M-BEGIN
const M = [
  ["spawning not stopped", "debug", [["spawn(0);     // movechecker start", "// (no spawn stop)"]]],
  ["live enemies not cleared", "debug", [["G.EnemyMgr.clear();     // movechecker start: the dummy is the only target", ""]]],
  ["two dummies", "debug", [["G.EnemyMgr.add(e);\n    mcOn = true;", "G.EnemyMgr.add(e); G.EnemyMgr.add(Object.assign(Object.create(Object.getPrototypeOf(e)), e));\n    mcOn = true;"]]],
  ["dummy keeps its speed", "debug", [["    e.spd = 0;\n", "\n"]]],
  ["dummy not pinned", "debug", [["this.x = ax; this.y = ay; ", ""]]],
  ["knockback slide kept", "debug", [["this.kx = 0; this.ky = 0; };", "};"]]],
  ["contact damage left on", "debug", [["e.touchCd = Infinity;", ""]]],
  ["distance argument ignored", "debug", [["const dist = nums.length ? nums[0] : MC_DIST;", "const dist = MC_DIST;"]]],
  ["seven moves allowed", "debug", [["const MC_MAX = 6,", "const MC_MAX = 7,"]]],
  ["base def printed instead of the folded one", "debug", [["const live = G.TeamCards.defOf(pl, id)", "const live = G.MoveDefs[id]"]]],
  ["Infinity printed as null", "debug", [["JSON.stringify(live, fin, 2)", "JSON.stringify(live, null, 2)"]]],
  ["override row not printed", "debug", [["ov = G.MoveOverrides && G.MoveOverrides[id];", "ov = null;"]]],
  ["bad ids still clear the field", "debug", [["if (!ids.length) { console.warn('[Debug] no usable move ids, nothing changed.'); return 0; }", ""]]],
  ["off leaves spawning stopped", "debug", [["spawn(1);     // movechecker off", ""]]],
  ["off leaves the rings on", "debug", [["    if (!strs.length) {\n      G.MoveRender.rings = false;", "    if (!strs.length) {"]]],
  ["off leaves the dummy", "debug", [["if (mcOn) G.EnemyMgr.clear();", ""]]],
  ["shared helper drops the last slot", "debug", [["pl.slots = pl.moves.map(m => [m]);", "pl.slots = pl.moves.slice(0, -1).map(m => [m]);"]]],
  ["rings centred on 0,0", "render", [["ctx.arc(pl.x, pl.y, r, 0, TAU)", "ctx.arc(0, 0, r, 0, TAU)"]]],
  ["ring step 100", "render", [["RING_STEP = 50", "RING_STEP = 100"]]],
  ["rings stop at 450", "render", [["RING_MAX = 600", "RING_MAX = 450"]]],
  ["rings drawn with the flag off", "render", [["if (R.rings) drawRings(ctx);", "drawRings(ctx);"]]],
  ["rings unlabelled", "render", [["ctx.fillText(String(r), pl.x, pl.y - r - 2);", ""]]]
];
// @@M-END

require('../../tools/mutate-runner.js')({
  label: 'debug-movechecker-mutate',
  root,
  harnesses: ['docs/proposals/debug-movechecker-harness.js'],
  baseline: true,
  mutants: M.map(([name, which, edits]) => ({ name, file: path.relative(root, SRC[which]), edits, env: { [ENV[which]]: '<out>' } })),
});
