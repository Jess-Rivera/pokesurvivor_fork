// Mutation check for slice 5b, team-wide cards (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/team-cards-mutate.js
// Each mutation breaks team-cards.js, move-sim.js or move-render.js in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/team-cards-harness.js against it (TC_<FILE> env vars). The harness must fail every time; a mutation it misses is a gap.
// Part A and B (store, fold, readers). Rows for the team cards, the offer and the sheet are added when those parts are built.
// Not mutated, with the reason: the sorted stack order in fold (reordering two or three addends of these sizes seldom changes the last
// bit, so a harness catch would be luck; the order row still guards the rule), and the pure-buff guard in Cooldown Down (a pure buff has
// no cd, rehit or emitter, so the guard is a second fence; the eligibility row checks the result).
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = { cards: ['js/systems/team-cards.js', 'TC_CARDS'], sim: ['js/systems/move-sim.js', 'TC_SIM'], render: ['js/systems/move-render.js', 'TC_RENDER'],
  fx: ['js/systems/move-effects.js', 'TC_FX'] };
const M = [
  // ---- fold ----
  ['the fold writes into G.MoveDefs', 'cards', [['const d = clone(base), pools = new Map();', 'const d = base, pools = new Map();']]],
  ['a rate multiplies instead of divides', 'cards', [['let v = (b + p.add) * (1 + p.inc) * (1 + p.comp) / (1 + p.rate);', 'let v = (b + p.add) * (1 + p.inc) * (1 + p.comp) * (1 - p.rate);']]],
  ['cardLock ignored', 'cards', [['filter(([o, k, l, opt]) => !lock.includes(l) &&', 'filter(([o, k, l, opt]) => true &&']]],
  ['caps ignored', 'cards', [['const k = c.cap ? Math.min(n, c.cap) : n;', 'const k = n;']]],
  ['the floor ignored (Delay Down)', 'cards', [['if (p.floor != null) v = Math.max(v, b * p.floor);', '']]],
  ['the max ignored (arc 360, chance 100)', 'cards', [['if (p.max != null) v = Math.min(v, p.max);', '']]],
  ['a refold applies one stack per card (a diff, not from scratch)', 'cards', [['const k = c.cap ? Math.min(n, c.cap) : n;', 'const k = 1;']]],
  ['children are not folded', 'cards', [['const nodes = d => [[d, null], ...kidsOf(d).map(fx => [fx.move, fx])];', 'const nodes = d => [[d, null]];']]],
  ['a type card hits every type', 'cards', [["targets: d => (d.type === t ? damage(d) : [])", 'targets: d => damage(d)']]],
  // ---- field maps ----
  ['Pierce Up on UNLIMITED', 'cards', [['n.space && num(n.space.pierce)', 'n.space && n.space.pierce != null']]],
  ['Count Up ignores the spread rule', 'cards', [["if (s && num(s.count) && (spreads(s) || dv.motion === 'orbits')) return [T(s, 'count')];", "if (s && num(s.count)) return [T(s, 'count')];"]]],
  ['Time Up scales a plain move\'s own timer', 'cards', [["if (emitsOf(d).length && dv.anchor === 'world') for", 'if (true) for']]],
  ['Time Up lengthens travelling shots', 'cards', [["if (kd.motion !== 'static' || (kd.grow && !num(kd.grow.max))) continue;", 'if (kd.grow && !num(kd.grow.max)) continue;']]],
  ['Recoil Down shrinks a paid shield', 'cards', [["p[opt && opt.comp ? 'comp' : c.mode] += k * c.step;", 'if (!(opt && opt.comp)) p[c.mode] += k * c.step;']]],
  ['Reach Up skips the flight time', 'cards', [["if (mo === 'travels' || mo === 'returns') for (const e of dv.endOn || [])", 'if (false) for (const e of dv.endOn || [])']]],
  ['Cooldown Down slows a trail\'s spacing too', 'cards', [["fx.every > 0 && fx.trigger !== 'casterMove'", 'fx.every > 0']]],
  // ---- store and lazy refold ----
  ['a pick does not raise the cards-picked count', 'cards', [['s.stacks[id] = (s.stacks[id] || 0) + k; s.n += k;', 's.stacks[id] = (s.stacks[id] || 0) + k;']]],
  ['a stale copy is never refolded', 'cards', [['if (e && e.n === s.n && e.base === base) return e.def;', 'if (e) return e.def;']]],
  ['an unchanged refold makes a new object', 'cards', [['if (e && e.base === base && same(e.def, def)) def = e.def;', '']]],
  // ---- readers ----
  ['persistent upkeep reads the frozen def', 'sim', [['      const def = defOf(o, slot.id);\n      if (!def || !def.persistent', '      const def = G.MoveDefs[slot.id];\n      if (!def || !def.persistent']]],
  ['the active slot reads the frozen def', 'sim', [['        const def = defOf(o, slot.id);\n        if (!def || !routed(slot.id) || def.persistent) continue;', '        const def = G.MoveDefs[slot.id];\n        if (!def || !routed(slot.id) || def.persistent) continue;']]],
  ['an inactive slot reads the frozen def', 'sim', [['        const def = defOf(o, slot.id);\n        if (!def || !routed(slot.id) || def.persistent || (def.cd == null', '        const def = G.MoveDefs[slot.id];\n        if (!def || !routed(slot.id) || def.persistent || (def.cd == null']]],
  ['a named child reads the frozen def', 'sim', [["if (typeof fx.move === 'string') return defOf(o, fx.move);", "if (typeof fx.move === 'string') return G.MoveDefs[fx.move];"]]],
  ['a changed def never restarts a live persistent group', 'sim', [['else if (slot.persistDef && slot.persistDef !== def) {', 'else if (false) {']]],
  ['the HUD ring reads the frozen cd', 'render', [['slot.simCd = (pl.teamCards ? G.TeamCards.defOf(pl, ev.moveId) : G.MoveDefs[ev.moveId]).cd;', 'slot.simCd = G.MoveDefs[ev.moveId].cd;']]],
  // ---- restart costs (Jess 2026-10-31) ----
  ['a card restart restarts the heal clock', 'sim', [["endGroup(mine, 'notActive', true);", "endGroup(mine, 'notActive');"]]],
  ['a restart keeps the old heal amount', 'fx', [['if (old) { old.left = left; old.frac = fx.amount.fraction; old.per = fx.per || 1; return; }', 'if (old) { old.left = left; return; }']]],
  ['restarted orbs jump back to their start angle', 'sim', [['if (carry && carry.phase != null) for (const r of roots) r.phase = carry.phase;', '']]],
  ['a restart is reported as a cast', 'sim', [['restart: !!carry });', 'restart: false });']]],
  ['the render plays a restart', 'render', [['if (!pl || ev.restart || !G.MoveRoute.routed(ev.moveId)) return;', 'if (!pl || !G.MoveRoute.routed(ev.moveId)) return;']]]
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'team-cards-mut-'));
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
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/team-cards-harness.js'), root], { env: Object.assign({}, process.env, { [env]: f }), encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n'), hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find(l => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')' : ''));
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught < M.length) process.exitCode = 1;
