// Mutation check for entity model slice 4b (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/type-chart-mutate.js
// Each mutation breaks one file in one deliberate way, writes the copy to a temp folder, and runs type-chart-harness.js against it
// (the TY_* variables). The harness must fail every time; a miss is a gap. A STALE line means the target text moved: fix the pattern.
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const ENV = {
  'js/data/types.js': 'TY_TYPES',
  'js/core/stats.js': 'TY_STATS',
  'js/systems/status.js': 'TY_STATUS',
  'js/entities/player.js': 'TY_PLAYER',
  'js/systems/move-effects.js': 'TY_FX',
  'js/systems/combat.js': 'TY_COMBAT',
  'js/systems/hazards.js': 'TY_HAZARDS',
  'js/entities/boss-ai.js': 'TY_BOSSAI',
  'js/core/debug.js': 'TY_DEBUG',
};
const TY = 'js/data/types.js',
  ST = 'js/core/stats.js',
  SS = 'js/systems/status.js',
  PL = 'js/entities/player.js',
  FX = 'js/systems/move-effects.js',
  CB = 'js/systems/combat.js',
  HZ = 'js/systems/hazards.js',
  BA = 'js/entities/boss-ai.js',
  DB = 'js/core/debug.js';
const M = [
  // the chart (types.js)
  ['the softened values come back', TY, 'for (const t of def) if (row[t] != null) m *= row[t];', 'for (const t of def) if (row[t] != null) m *= { 2: 1.6, 0.5: 0.6, 0: 0.3 }[row[t]];'],
  ['the clamp lifts an immunity', TY, 'return m === 0 ? 0 : G.U.clamp(m, MIN, MAX);', 'return G.U.clamp(m, MIN, MAX);'],
  ['the old x2.4 cap', TY, 'MAX = 4;', 'MAX = 2.4;'],
  ['dual types add instead of multiply', TY, 'm *= row[t];', 'm += row[t] - 1;'],
  ['no immune label', TY, "m === 0 ? 'immune' : ", ''],
  // immunity on moves (move-effects.js)
  ['an immune wild takes the hit and its side effects', FX, 'if (immuneTo(inst, e)) return immuneHit(e); // slice 4b', '// immune gate removed'],
  ['an immune you takes the move and its side effects', FX, 'if (immuneTo(inst, pl)) return immuneHit(pl); // slice 4b', '// immune gate removed'],
  ['fixed-damage moves skip immunity', FX, "fx.t === 'damage' || (fx.t === 'special' && (FLAT[fx.handler] || fx.handler === 'ohkoWild'))", "fx.t === 'damage'"],
  ['Power Stone no longer pierces immunity', FX, 'return owner.stoneType && owner.stoneType === type ? Math.max(1, k) : k;', 'return k;'],
  ['flat damage takes STAB', FX, 'const dmg = Math.max(1, amount * hopMul(def, hop));', 'const dmg = Math.max(1, amount * hopMul(def, hop) * 1.5);'],
  ['an immune hit shows no note', FX, '    G.Status.immuneNote(e);\n    return { dmg: 0', '    return { dmg: 0'],
  // immunity on you (player.js)
  ['an immune hit on you falls through to the floor of 1', PL, '      if (tk === 0 && !stone) {\n        // slice 4b', '      if (false) {\n        // slice 4b'],
  ['an immune hit on you gives i-frames', PL, "        G.Status.immuneNote(this);\n        return 'immune';", "        G.Status.immuneNote(this);\n        this.invuln = 0.45;\n        return 'immune';"],
  // the Immune note gap (status.js)
  ['the Immune note on every hit', SS, '    if (h.immCd > 0) return false;\n', ''],
  ['the Immune note gap never counts down', SS, '    if (h.immCd > 0) h.immCd -= dt; // the Immune note gap (slice 4b, I4)\n', ''],
  // side effects of non-move hits on you (combat.js)
  ['an immune touch still lands its carrier ailment', CB, "if (e.carrierSec && !pl.dead && res !== 'immune') {", 'if (e.carrierSec && !pl.dead) {'],
  ['an immune shot still lands its ailment', CB, "if (p.ail && landed && !pl.dead && res !== 'immune')", 'if (p.ail && landed && !pl.dead)'],
  // STAB everywhere and the wild Power
  ['wild contact without STAB', CB, 'stab: stabOf(e, e.atkType),\n          mul: e.contactMul()', 'stab: 1,\n          mul: e.contactMul()'],
  ['wild shots without STAB', CB, 'stab: stabOf(p.src, p.mtype)', 'stab: 1'],
  ['STAB on any attack type', CB, 'const stabOf = (a, t) => (a && t && a.types && a.types.includes(t) ? G.Stats.STAB : 1);', 'const stabOf = () => G.Stats.STAB;'],
  ['hazards without STAB', HZ, 'const stab = h.src && h.src.types && h.src.types.includes(h.type) ? G.Stats.STAB : 1;', 'const stab = 1;'],
  ['the wild Power back to 40', ST, 'const ENEMY_POWER = 27;', 'const ENEMY_POWER = 40;'],
  ['a leader folds STAB before the +2 again', BA, '        e.gym.power *\n        G.Gym.enrageMul(e) *', '        e.gym.power *\n        (e.types.includes(m.type) ? 1.5 : 1) *\n        G.Gym.enrageMul(e) *'],
  ['a leader declares no STAB', BA, '      e.stabFor = (m) => e.types.includes(m.type);', ''],
  // test dummies (debug.js)
  ['debug dummies keep their species types', DB, "    e.types = ['typeless'];\n", ''],
];

require('../../tools/mutate-runner.js')({
  label: 'type-chart-mutate',
  root,
  harnesses: ['docs/proposals/type-chart-harness.js'],
  mutants: M.map(([name, file, a, b]) => ({ name, file, edits: [[a, b]], env: { [ENV[file]]: '<out>' } })),
});
