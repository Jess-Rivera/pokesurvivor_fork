// Mutation check for slice 7a, the UI readers (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/ui-readers-mutate.js
// Each mutation breaks move-info.js, sheet.js, levelup.js, player.js or stats.js in one deliberate way, writes the copy to a temp folder,
// and runs docs/proposals/ui-readers-harness.js against it (UR_<FILE> env vars). The harness must fail every time; a miss is a gap.
// Every pattern is a single line, so a CRLF checkout applies them all. Not mutated, with the reason: the 7a guard (the harness plants
// one line per rule into tools/kind-guard.js scanText directly); hud.js and the menus (DOM, covered by tools/smoke-ui.js).
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const SRC = { info: ['js/ui/move-info.js', 'UR_INFO'], sheet: ['js/ui/sheet.js', 'UR_SHEET'], levelup: ['js/systems/levelup.js', 'UR_LEVELUP'],
  player: ['js/entities/player.js', 'UR_PLAYER'], stats: ['js/core/stats.js', 'UR_STATS'] };
const M = [
  // ---- move-info.js ----
  ['the buff test ignores self-only', 'info', [['return !!d && G.TeamCards.selfOnly(d); };', 'return !!d; };']]],
  ['a self-only move gets no buff badge', 'info', [["if (root && G.TeamCards.selfOnly(d)) return 'buff';", '']]],
  ['the badge ignores motion', 'info', [['if (MOTION[v.motion]) return MOTION[v.motion];', '']]],
  ['an emitter ignores its children', 'info', [['return k.length ? badgeOf(k[0].d, false) : null;', 'return null;']]],
  ['every arc is melee', 'info', [["return d.category === 'physical' ? 'melee' : 'cone';", "return 'melee';"]]],
  ['a persistent full circle is a nova', 'info', [["return d.persistent ? 'aura' : 'nova';", "return 'nova';"]]],
  ['the description drops its effects', 'info', [["return head + (fx.length ? ': ' + fx.join(', ') : '') + '.';", "return head + '.';"]]],
  ['effects skip emitted children', 'info', [['for (const k of kids(x)) walk(', 'for (const k of []) walk(']]],
  ['the chance is dropped', 'info', [["const pct = c => (c != null && c < 100 ? c + '% ' : '');", "const pct = c => '';"]]],
  ['an unknown or retired move gets a made-up name', 'info', [["const name = id => { const d = def(id); return d ? d.name : id; };", "const name = id => { const d = def(id); return d ? d.name : 'Move'; };"]]],
  // ---- sheet.js ----
  ['the sheet never takes the def rows', 'sheet', [['const routed = m => !!G.MoveDefs[m.id];', 'const routed = m => false;']]],
  ['the sheet reads the frozen def, not the folded one', 'sheet', [['const folded = (pl, m) => G.TeamCards.defOf(pl, m.id);', 'const folded = (pl, m) => G.MoveDefs[m.id];']]],
  ['a swing timer gets a row', 'sheet', [['(flies || life.time >= 0.5)', 'true']]],
  ['the arc row is dropped', 'sheet', [['if (s.radArc > 0 && s.radArc < TAU - 0.01) row(', 'if (false) row(']]],
  ['the effect line keeps plain damage', 'sheet', [["const defAil = d => G.MoveInfo.effects(d).filter(t => t !== 'damage').join(', ');", "const defAil = d => G.MoveInfo.effects(d).join(', ');"]]],
  // ---- levelup.js ----
  ['the new-move card loses its text', 'levelup', [['desc: G.MoveInfo.desc(id),', "desc: '',"]]],
  ['the 2-buff limit is dropped', 'levelup', [['!(pl.banned && pl.banned.has(id)) && !(buffs >= 2 && G.MoveInfo.isBuff(id)));', '!(pl.banned && pl.banned.has(id)));']]],
  // ---- player.js ----
  ['Life Orb charges an always-on move', 'player', [['!(def && def.persistent) && ', '']]],
  ['the animation ignores the family', 'player', [["cone: 'Shoot' }[fam] || 'Attack';", "cone: 'Shoot' }[null] || 'Attack';"]]],
  // ---- stats.js ----
  ['moveCat with no cat ignores the def', 'stats', [["return d ? d.category : 'physical';", "return 'physical';"]]]
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-readers-mut-'));
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
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/ui-readers-harness.js'), root], { env: Object.assign({}, process.env, { [env]: f }), encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n'), hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find(l => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')' : ''));
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught < M.length) process.exitCode = 1;
