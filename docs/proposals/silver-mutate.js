// Mutation check for Move Shop step 2, Silver (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/silver-mutate.js
// Each mutation breaks silver.js, game.js, enemy.js, hud.js, dev.html or main.js in one deliberate way, writes the copy to a temp
// folder, and runs docs/proposals/silver-harness.js against it (SV_<FILE> env vars). The harness must fail every time; a mutation
// it misses is a gap.
// Not mutated, with the reason: the HUD pop and roll (drawn per frame, feel-tested); G.Debug.silver (dev only, no game path);
// the coin sheet pixels (checked once against the gold cut when it was made, 2026-11-05).
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = { silver: ['js/systems/silver.js', 'SV_SILVER'], game: ['js/game.js', 'SV_GAME'], enemy: ['js/entities/enemy.js', 'SV_ENEMY'],
  hud: ['js/ui/hud.js', 'SV_HUD'], dev: ['dev.html', 'SV_DEV'], main: ['js/main.js', 'SV_MAIN'] };
const M = [
  // ---- pay ----
  ['the minimum of 1 is gone', 'silver', [['return Math.max(1, G.Stats.levelForTime(t) / 10);', 'return G.Stats.levelForTime(t) / 10;']]],
  ['pay reads the gym level, not the run level', 'silver', [['Math.max(1, G.Stats.levelForTime(t) / 10)', 'Math.max(1, (G.Stats.levelForTime(t) + G.Gyms.LEVEL_OFFSET) / 10)']]],
  ['each kill is rounded instead of keeping the fraction', 'silver', [['amount += payFor(t);', 'amount += Math.round(payFor(t));']]],
  ['the count rounds instead of rounding down', 'silver', [['return Math.floor(amount + 1e-9);', 'return Math.round(amount);']]],
  // ---- balance ----
  ['a run starts at 0', 'silver', [['const START = 100;', 'const START = 0;']]],
  ['a spend can overdraw', 'silver', [['if (!(n >= 0) || n > this.whole) return false;', 'if (!(n >= 0)) return false;']]],
  ['the balance can go negative', 'silver', [['amount = Math.max(0, +n || 0);', 'amount = +n || 0;']]],
  ['Silver is written to the save', 'silver', [['amount += payFor(t);', 'amount += payFor(t);\n      if (G.DB) G.DB.save.silver = amount;']]],
  // ---- wiring ----
  ['the run start does not reset Silver', 'game', [['    G.Silver.reset(); // Move Shop step 2: every run starts with 100 Silver, nothing carries over\n', '']]],
  ['Silver leaks into the end-of-run PokeCoins', 'game', [['recogidas: pl.coins,', 'recogidas: pl.coins + G.Silver.whole,']]],
  ['a kill pays nothing', 'enemy', [['          G.Silver.kill(G.Game.st.time); // Move Shop step 2: every kill pays Silver, the same for every enemy\n', '']]],
  ['a thief that escapes pays', 'enemy', [["G.Spawner.say('¡' + e.name + ' se ha escapado!', 2.4);", "G.Spawner.say('¡' + e.name + ' se ha escapado!', 2.4);\n          G.Silver.kill(G.Game.st.time);"]]],
  ['the counter shows in co-op', 'hud', [['if (!G.Coop.active) {\n      const sa = touch', 'if (true) {\n      const sa = touch']]],
  ['the script tag is missing', 'dev', [['    <script defer src="js/systems/silver.js"></script>\n', '']]],
  ['the NEED array misses Silver', 'main', [["    'Silver',\n", '']]],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'silver-mut-'));
let caught = 0;
for (const [name, which, edits] of M) {
  const [rel, env] = SRC[which];
  let s = fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
  for (const [a, b] of edits) {
    if (!s.includes(a)) { console.log('STALE mutation (pattern not found): ' + name); process.exitCode = 1; s = null; break; }
    s = s.replace(a, b);
  }
  if (s == null) continue;
  const f = path.join(tmp, path.basename(rel));
  fs.writeFileSync(f, s);
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/silver-harness.js'), root], { env: Object.assign({}, process.env, { [env]: f }), encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n'), hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find(l => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')' : ''));
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught < M.length) process.exitCode = 1;
