// Mutation check for slice 5a, stat stage trackers (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/stat-stage-mutate.js
// Each mutation breaks stages.js, move-effects.js or move-sim.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/stat-stage-harness.js against it (STAGE_<FILE> env vars). The harness must fail every time; a mutation it misses is a gap.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = { stages: ['js/systems/stages.js', 'STAGE_STAGES'], fx: ['js/systems/move-effects.js', 'STAGE_FX'], sim: ['js/systems/move-sim.js', 'STAGE_SIM'] };
const M = [
  ['climb ignores the Gate', 'stages', [['if (t.g > EPS) return false;', 'if (false) return false;']]],
  ['a refresh skips the Duration reset', 'stages', [['t.d = dur;                                                       // SS4', '// SS4']]],
  ['a dry window wipes every tracker on the stat', 'stages', [['if ((t.d -= dt) <= 0) delete T[k]; }', 'if ((t.d -= dt) <= 0) { for (const j in T) delete T[j]; break; } }']]],
  ['no per-tracker clamp', 'stages', [['t.n = clamp(t.n + n, -MAX, MAX); t.g = gate;', 't.n = t.n + n; t.g = gate;']]],
  ['self drop on the base Gate', 'fx', [['else G.Stages.trackOwn(o, k, fx.stages, src, G.Stages.gateOf(fx.stages < 0, gm), dur);', 'else G.Stages.trackOwn(o, k, fx.stages, src, G.Stages.gateOf(false, gm), dur);']]],
  ['self change rolls on every hit', 'fx', [['if (u.get(fx) === use) return false;', '']]],
  ['a rehit step is not a new use', 'fx', [["const use = rehit ? inst.id + ':' + inst.age : 'cast';", "const use = 'cast';"]]],
  ['foe tag without the caster (2 Pokemon share a tracker)', 'fx', [['src = srcOf(inst.spec, o);     // S4, foe side too (SS1)', 'src = onFoe ? inst.spec.id : srcOf(inst.spec, o);']]],
  ['a pure buff ignores its Gate (swap-in casts at once)', 'fx', [['if (!t || t.g <= EPS) return true;', 'if (t || !t) return true;']]],
  ['an inactive pure buff casts', 'sim', [['        if (slot.t > 0) slot.t = Math.max(0, slot.t - dt);\n',
    '        if (G.MoveEffects.isPureBuff(def) && G.MoveEffects.statReady(def, o)) castSlot(o, slot, def, now);\n        if (slot.t > 0) slot.t = Math.max(0, slot.t - dt);\n']]],
  ['a fizzled pure buff does not wait', 'sim', [['{ if (buff) slot.t = G.Stages.gateOf(false, o.teamCards ? G.TeamCards.gateMul(o) : 1); return null; }', '{ return null; }']]],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stat-stage-mut-'));
let caught = 0;
for (const [name, which, edits] of M) {
  const [rel, env] = SRC[which];
  let s = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const [a, b] of edits) {
    if (!s.includes(a)) { console.log('STALE mutation (pattern not found): ' + name); process.exitCode = 1; s = null; break; }
    s = s.replace(a, b);
  }
  if (s == null) continue;
  const f = path.join(tmp, path.basename(rel));
  fs.writeFileSync(f, s);
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/stat-stage-harness.js'), root], { env: Object.assign({}, process.env, { [env]: f }), encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n'), hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find(l => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')' : ''));
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught !== M.length) process.exitCode = 1;
