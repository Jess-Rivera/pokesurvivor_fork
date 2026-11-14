// Mutation check for slice 7a, the UI readers (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/ui-readers-mutate.js
// Each mutation breaks move-info.js, sheet.js, levelup.js, player.js or stats.js in one deliberate way, writes the copy to a temp folder,
// and runs docs/proposals/ui-readers-harness.js against it (UR_<FILE> env vars). The harness must fail every time; a miss is a gap.
// Patterns may span lines: .gitattributes pins *.js to LF, so a Windows checkout matches them too. Not mutated, with the reason: the 7a guard (the harness plants
// one line per rule into tools/kind-guard.js scanText directly); hud.js and the menus (DOM, covered by tools/smoke-ui.js).
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const SRC = { info: ['js/ui/move-info.js', 'UR_INFO'], sheet: ['js/ui/sheet.js', 'UR_SHEET'], levelup: ['js/systems/levelup.js', 'UR_LEVELUP'],
  player: ['js/entities/player.js', 'UR_PLAYER'], stats: ['js/core/stats.js', 'UR_STATS'] };
const M = [
  // ---- move-info.js ----
  ['the buff test ignores self-only', 'info', [['return !!d && G.TeamCards.selfOnly(d);\n  };', 'return !!d;\n  };']]],
  ['a self-only move gets no buff badge', 'info', [["if (root && G.TeamCards.selfOnly(d)) return 'buff';", '']]],
  ['the badge ignores motion', 'info', [['if (MOTION[v.motion]) return MOTION[v.motion];', '']]],
  ['an emitter ignores its children', 'info', [['return k.length ? badgeOf(k[0].d, false) : null;', 'return null;']]],
  ['every arc is melee', 'info', [["return d.category === 'physical' ? 'melee' : 'cone';", "return 'melee';"]]],
  ['a persistent full circle is a nova', 'info', [["return d.persistent ? 'aura' : 'nova';", "return 'nova';"]]],
  ['the description drops its effects', 'info', [["return head + (fx.length ? ': ' + fx.join(', ') : '') + '.';", "return head + '.';"]]],
  ['effects skip emitted children', 'info', [['for (const k of kids(x)) walk(', 'for (const k of []) walk(']]],
  ['the chance is dropped', 'info', [["const pct = (c) => (c != null && c < 100 ? c + '% ' : '');", "const pct = (c) => '';"]]],
  ['an unknown or retired move gets a made-up name', 'info', [['const name = (id) => {\n    const d = def(id);\n    return d ? d.name : id;\n  };', "const name = (id) => {\n    const d = def(id);\n    return d ? d.name : 'Move';\n  };"]]],
  // ---- sheet.js ----
  ['the sheet never takes the def rows', 'sheet', [['const routed = (m) => !!G.MoveDefs[m.id];', 'const routed = (m) => false;']]],
  ['the sheet reads the frozen def, not the folded one', 'sheet', [['const folded = (pl, m) => G.TeamCards.defOf(pl, m.id);', 'const folded = (pl, m) => G.MoveDefs[m.id];']]],
  ['a swing timer gets a row', 'sheet', [['(flies || life.time >= 0.5)', 'true']]],
  ['the arc row is dropped', 'sheet', [['if (s.radArc > 0 && s.radArc < TAU - 0.01) row(', 'if (false) row(']]],
  ['the effect line keeps plain damage', 'sheet', [["const defAil = (d) =>\n    G.MoveInfo.effects(d)\n      .filter((t) => t !== 'damage')\n      .join(', ');", "const defAil = (d) =>\n    G.MoveInfo.effects(d)\n      .join(', ');"]]],
  // ---- levelup.js ----
  ['New Move cards are offered again (Move Shop step 5 removed them)', 'levelup', [['    return fam;\n  }', "    (fam.newmove = fam.newmove || []).push({ w: 1, family: 'newmove', type: 'new', key: 'new:x', title: 'x', desc: '', apply: () => true });\n    return fam;\n  }"]]],
  // ---- player.js ----
  ['Life Orb charges an always-on move', 'player', [['!(def && def.persistent) && ', '']]],
  ['the animation ignores the family', 'player', [["cone: 'Shoot',\n      }[fam] || 'Attack';", "cone: 'Shoot',\n      }[null] || 'Attack';"]]],
  // ---- stats.js ----
  ['moveCat with no cat ignores the def', 'stats', [["return d ? d.category : 'physical';", "return 'physical';"]]]
];

require('../../tools/mutate-runner.js')({
  label: 'ui-readers-mutate',
  root,
  harnesses: ['docs/proposals/ui-readers-harness.js'],
  args: [root],
  mutants: M.map(([name, which, edits]) => ({ name, file: SRC[which][0], edits, env: { [SRC[which][1]]: '<out>' } })),
});
