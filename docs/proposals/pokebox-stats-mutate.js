// Mutation check for pokebox step 4, IVs and natures apply (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/pokebox-stats-mutate.js
// Each mutation breaks stats.js, player.js, copies.js or game.js in one deliberate way, writes the copy to a temp folder and runs
// docs/proposals/pokebox-stats-harness.js against it (PS_<FILE> env vars). The harness must fail every time; a mutation it misses is
// a gap. A mutation whose text is not found is STALE (the code moved: update the text here).
// Not mutated, with the reason: the whole-number nature step (stat x 110 / 100) against a plain float x1.1. No stat from 5 to 800
// loses a point to the float, so no check can tell them apart; the whole-number form is a guard, not a behavior. The LOG-only dStat
// line in hurt() (it only feeds the dev log). debug.js fighter and ivs (console readouts, feel-tested; setIvNature is mutated).
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const harness = path.join(root, 'docs/proposals/pokebox-stats-harness.js');
const SRC = { stats: ['js/core/stats.js', 'PS_STATS'], player: ['js/entities/player.js', 'PS_PLAYER'], copies: ['js/systems/copies.js', 'PS_COPIES'],
  game: ['js/game.js', 'PS_GAME'] };
// [name, file key, [[text to find, replacement], ...]]
const M = [
  ["IV dropped from statValue", "stats", [["(2 * base + iv + Math.floor(ev / 4))", "(2 * base + Math.floor(ev / 4))"]]],
  ["IV dropped from hpForLevel", "stats", [["(2 * baseHp + iv + Math.floor(ev / 4))", "(2 * baseHp + Math.floor(ev / 4))"]]],
  ["nature applied to HP", "stats", [["      nat[down] = 0.9;\n", "      nat[down] = 0.9;\n      nat[0] = 1.1;\n"]]],
  ["raised and lowered swapped", "stats", [["      nat[up] = 1.1;\n      nat[down] = 0.9;", "      nat[up] = 0.9;\n      nat[down] = 1.1;"]]],
  ["nature applied before the +5", "stats", [["    const s = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;\n    return nature == null || nature === 1 ? s : Math.floor((s * Math.round(nature * 100)) / 100);", "    const s = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100);\n    return (nature == null || nature === 1 ? s : Math.floor((s * Math.round(nature * 100)) / 100)) + 5;"]]],
  ["the stat functions drop the nature", "stats", [["  function attack(base, level, iv = 0, ev = 0, nature = 1) {\n    return statValue(base, level, iv, ev, nature);", "  function attack(base, level, iv = 0, ev = 0, nature = 1) {\n    return statValue(base, level, iv, ev);"]]],
  ["speedToPx ignores the Speed IV and nature", "stats", [["statValue(baseSpe, 50, iv, ev, nature)", "statValue(baseSpe, 50, 0, ev)"]]],
  ["a status move takes the profile", "stats", [["p = cat === 'status' || !prof ? NEUTRAL_PROFILE : prof;", "p = prof || NEUTRAL_PROFILE;"]]],
  ["applyPlayerDefense ignores the profile", "stats", [["    const p = prof || NEUTRAL_PROFILE;\n    const stat =", "    const p = NEUTRAL_PROFILE;\n    const stat ="]]],
  ["profile ignores the IVs", "stats", [["    return { iv, nat, ev };", "    return { iv: [0, 0, 0, 0, 0, 0], nat, ev };"]]],
  ["constructor HP ignores the IV", "player", [["G.Stats.hpForLevel(this.baseHpStat, 1, this.statIv(0), this.statEv(0))", "G.Stats.hpForLevel(this.baseHpStat, 1, 0, this.statEv(0))"]]],
  ["maxHpAt ignores the IV", "player", [["G.Stats.hpForLevel(this.baseHpStat, level, this.statIv(0), this.statEv(0))", "G.Stats.hpForLevel(this.baseHpStat, level, 0, this.statEv(0))"]]],
  ["constructor movement ignores the profile", "player", [["G.Stats.speedToPx(mon.stats[5], this.statIv(5), this.statNat(5), this.statEv(5))", "G.Stats.speedToPx(mon.stats[5], 0, 1, this.statEv(5))"]]],
  ["moveFactor ignores the profile", "player", [["this.runDmgMul(),\n      this.statProf\n", "this.runDmgMul()\n"]]],
  ["hurt ignores the profile", "player", [["this.level, defMul, this.statProf, stab, scale) * mul;", "this.level, defMul, null, stab, scale) * mul;"]]],
  ["the Player drops its profile", "player", [["this.statProf = statProf || G.Stats.NEUTRAL_PROFILE;", "this.statProf = G.Stats.NEUTRAL_PROFILE;"]]],
  ["profileOf ignores the uid", "copies", [["c = typeof id === 'string' && save ? get(save, id) : null;", "c = null;"]]],
  ["profileOf ignores a species mismatch", "copies", [["G.Stats.profile(c && (dex == null || c.speciesID === dex) ? c : null)", "G.Stats.profile(c)"]]],
  ["setIvNature changes a copy on an unknown nature", "copies", [["      if (!n) return { error: 'nature' };\n", ""]]],
  ["buildFighter ignores the uid", "game", [["new G.Player(mon, perks, shiny, G.Copies.profileOf(save, uid, mon.dex))", "new G.Player(mon, perks, shiny)"]]],
  ["the roster loop drops the uid", "game", [["G.DB.ownsShiny(t.dex), t.uid);", "G.DB.ownsShiny(t.dex));"]]],
];
const runHarness = env => cp.spawnSync(process.execPath, [harness, root], { encoding: 'utf8', env: Object.assign({}, process.env, env) });
const failed = r => r.status !== 0 || /FAIL/.test(r.stdout || '');
const clean = runHarness({});
if (failed(clean)) { console.log('The harness fails on the real code; fix that first.\n' + clean.stdout); process.exit(1); }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pokebox-stats-mut-'));
let caught = 0, missed = 0, stale = 0;
for (const [name, key, edits] of M) {
  const [rel, env] = SRC[key];
  let src = fs.readFileSync(path.join(root, rel), 'utf8'), found = true;
  for (const [a, b] of edits) { if (!src.includes(a)) { found = false; break; } src = src.replace(a, b); }
  if (!found) { stale++; console.log('STALE  ' + name); continue; }
  const f = path.join(tmp, key + '.js');
  fs.writeFileSync(f, src);
  if (failed(runHarness({ [env]: f }))) caught++;
  else { missed++; console.log('MISSED ' + name); }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log('pokebox stats mutations: ' + caught + '/' + M.length + ' caught' + (missed ? ', ' + missed + ' missed' : '') + (stale ? ', ' + stale + ' stale' : ''));
process.exit(missed || stale ? 1 : 0);
