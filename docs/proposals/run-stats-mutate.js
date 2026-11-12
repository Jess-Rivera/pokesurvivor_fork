// Mutation check for #91-1, the run counters (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/run-stats-mutate.js
// Each mutation breaks run-stats.js or one of its hooks in one deliberate way, writes the copy to a temp folder, and runs
// docs/proposals/run-stats-harness.js against it (RS_<FILE> env vars). The harness must fail every time; a miss is a gap.
// Not mutated, with the reason: the Focus Sash rule (no line of this slice holds it: hurt() never reaches onFaint while HP is
// above 0; the harness still checks it), and the Life Orb cost (it never went through hurt(), so it cannot reach Taken).
const path = require('path');
const root = path.resolve(__dirname, '../..');
const SRC = {
  stats: ["js/systems/run-stats.js", "RS_STATS"],
  player: ["js/entities/player.js", "RS_PLAYER"],
  simpass: ["js/entities/player-sim-pass.js", "RS_SIMPASS"],
  enemy: ["js/entities/enemy.js", "RS_ENEMY"],
  effects: ["js/systems/move-effects.js", "RS_EFFECTS"],
  spawner: ["js/systems/spawner.js", "RS_SPAWNER"],
  gym: ["js/systems/gym.js", "RS_GYM"],
  game: ["js/game.js", "RS_GAME"],
  interact: ["js/systems/interact.js", "RS_INTERACT"],
  dev: ["dev.html", "RS_DEV"],
  main: ["js/main.js", "RS_MAIN"],
};
const M = [
  ["best hit sums instead of keeping the biggest", "stats", [["if (amount > counters.bestHit) counters.bestHit = amount;", "counters.bestHit += amount;"]]],
  ["a most faints tie picks the higher slot", "stats", [["(!best || counters.faints > best.faints)", "(!best || counters.faints >= best.faints)"]]],
  ["the down clock keeps running after a revive", "stats", [["    counters.downSince = null;\n", ""]]],
  ["super effective counts neutral hits", "stats", [["if (typeMult > 1) counters.superDamage += amount;", "if (typeMult >= 1) counters.superDamage += amount;"]]],
  ["a DoT tick counts as a hit", "stats", [["counters.dotDamage += amount; // a tick is no hit: no best hit, no super effective share\n      return;", "counters.dotDamage += amount;"]]],
  ["a boss counts as an elite", "enemy", [["!!e.elite);", "!!(e.elite || e.boss));"]]],
  ["the kill goes to the field Pokemon", "enemy", [["e.lastHitBy && e.lastHitBy.team === pl.team ? e.lastHitBy : pl", "pl"]]],
  ["the kill goes to a last hitter off your team", "enemy", [["e.lastHitBy && e.lastHitBy.team === pl.team ? e.lastHitBy : pl", "e.lastHitBy || pl"]]],
  ["a DoT tick is credited to nobody", "enemy", [["      if (by && by.onDealt) by.onDealt(Math.max(0, hp0 - Math.max(0, this.hp)), this, 1, true);\n", ""]]],
  ["a DoT tick is credited to the field Pokemon", "enemy", [["const by = kind === 'burn' ? this.burnBy : this.poisonBy;", "const by = G.Game.player;"]]],
  ["a refreshed burn takes the new caster", "enemy", [["        this.burnBy = by;\n", ""], ["      this.burnLeft = Math.max(this.burnLeft,", "      this.burnBy = by;\n      this.burnLeft = Math.max(this.burnLeft,"]]],
  ["a DoT tick credits its overkill", "enemy", [["by.onDealt(Math.max(0, hp0 - Math.max(0, this.hp)), this, 1, true)", "by.onDealt(amount, this, 1, true)"]]],
  ["a refreshed burn counts as inflicted", "effects", [["landed = !was && e.burn > 0;", "landed = e.burn > 0;"]]],
  ["a refresh on a Player entity counts as inflicted", "effects", [["landed = G.Status.applyDot(pl, fx.id, 1, S ? fx.duration / (S.turns * S.turn) : 1) === 'ok';", "landed = G.Status.applyDot(pl, fx.id, 1, S ? fx.duration / (S.turns * S.turn) : 1) !== 'immune';"]]],
  ["a leader's burn forgets its caster", "effects", [["      if (landed) pl.stDot.by = o;\n", ""]]],
  ["an immune control status counts as inflicted", "effects", [["} else landed = G.Status.apply(e, fx.id, 1, 1, fx.duration) === 'ok';", "} else landed = G.Status.apply(e, fx.id, 1, 1, fx.duration) !== 'refresh';"]]],
  ["a damage hit drops its target and type", "effects", [["o.onDealt(dmg, e, hit.typeMult)", "o.onDealt(dmg)"]]],
  ["Shell Bell hears DoT ticks", "player", [["if (!dot && this.hasItem('shellbell'))", "if (this.hasItem('shellbell'))"]]],
  ["a 0 damage hit takes the last hit", "player", [["if (target && dmg > 0) target.lastHitBy = this;", "if (target) target.lastHitBy = this;"]]],
  ["faints are not recorded", "player", [["    if (stats) G.RunStats.faint(stats, this, G.Game.st.time);\n", ""]]],
  ["the down clock does not stop on a revive", "player", [["    if (stats) G.RunStats.revive(stats, this, G.Game.st.time);\n", ""]]],
  ["a revive counts as Healed", "player", [["    this.hp = Math.max(1, this.maxHp * frac);", "    this.restoreHp(this.maxHp * frac);"]]],
  ["recoil counts as Taken", "player", [["    this.hp = Math.max(1, this.hp - n);", "    this.hp = Math.max(1, this.hp - n);\n    if (this.team && this.team.runStats) G.RunStats.taken(this.team.runStats, this, n);"]]],
  ["Taken counts the overkill", "player", [["G.RunStats.taken(stats, this, hp0 - Math.max(0, this.hp));", "G.RunStats.taken(stats, this, hp0 - this.hp);"]]],
  ["heals skip the record", "player", [["    if (stats) G.RunStats.healed(stats, this, this.hp - before);\n", ""]]],
  ["bench regen skips restoreHp", "player", [["this.restoreHp(rg * this.maxHp * dt);", "this.hp = Math.min(this.maxHp, this.hp + rg * this.maxHp * dt);"]]],
  ["a leader's burn tick credits nobody", "player", [["    if (by && by.onDealt) by.onDealt(Math.max(0, hp0 - Math.max(0, this.hp)), this, 1, true);\n", ""]]],
  ["Shell Bell heals skip restoreHp", "simpass", [["e.restoreHp(h);", "e.hp = Math.min(e.maxHp, e.hp + h);"]]],
  ["Regeneration skips restoreHp", "simpass", [["e.restoreHp(e.regen * dt);", "e.hp = Math.min(e.maxHp, e.hp + e.regen * dt);"]]],
  ["an elite shiny is not counted", "spawner", [["      e.makeShiny();\n      shinySeen();", "      e.makeShiny();"]]],
  ["the run never makes its record", "game", [["runTeam.runStats = G.RunStats.create();", "runTeam.runStats = null;"]]],
  ["ground pickups are not counted", "game", [["(p.kind === 'item' || p.kind === 'ground')", "p.kind === 'item'"]]],
  ["a badge stamps no split", "gym", [["    splits.push(now());\n", ""]]],
  ["a spring skips restoreHp", "interact", [["pl.restoreHp(pl.maxHp * 0.14 * dt)", "pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.14 * dt)"]]],
  ["the script tag is missing", "dev", [["    <script defer src=\"js/systems/run-stats.js\"></script>\n", ""]]],
  ["the NEED array misses RunStats", "main", [["    'RunStats',\n", ""]]],
];

require('../../tools/mutate-runner.js')({
  label: 'run-stats-mutate',
  root,
  harnesses: ['docs/proposals/run-stats-harness.js'],
  args: [root],
  crlf: true,
  mutants: M.map(([name, which, edits]) => ({ name, file: SRC[which][0], edits, env: { [SRC[which][1]]: '<out>' } })),
});
