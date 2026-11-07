// Mutation check for entity model slice 1 (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/elite-class-mutate.js
// Each mutation breaks one file in one deliberate way, writes the copy to a temp folder, and runs elite-class-harness.js against it
// (EC_FILE, EC_FROM). The harness must fail every time; a miss is a gap.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const ELITE = 'js/entities/elite.js', WILD = 'js/entities/enemy.js', ST = 'js/systems/status.js', ME = 'js/systems/move-effects.js', SP = 'js/systems/spawner.js';
const M = [
  ['the spawner builds a plain wild entity', SP, 'const e = new G.Elite(def, pt[0], pt[1], G.Enemies.scale(t));', 'const e = new G.Enemy(def, pt[0], pt[1], G.Enemies.scale(t));'],
  ['Elite no longer extends the wild class', ELITE, 'G.Elite = class Elite extends G.WildEntity {', 'G.Elite = class Elite extends class { constructor() { return new G.WildEntity(...arguments); } } {'],
  ['Elite copies a wild method instead of inheriting', ELITE, '  /** Never golden. */', '  bandOf() { return null; }\n  /** Never golden. */'],
  ['the descriptor is not set', ELITE, 'this.elite = def.elite;', ''],
  ['the XP multiplier is lost', ELITE, 'this.xpMul *= this.elite.xpMul;', ''],
  ['an Elite keeps a carrier', ELITE, 'this.carrier = null;', ''],
  ['an Elite can be pushed', ELITE, 'this.immovable = true;', ''],
  ['an Elite can be KOd', ELITE, 'this.koImmune = true;', ''],
  ['an Elite takes wild status timers', ELITE, 'this.strongStatus = true;', ''],
  ['an Elite has morale', ELITE, 'this.noMorale = true;', ''],
  ['liquids hurt an Elite', ELITE, 'this.ignoresLiquid = true;', ''],
  ['an Elite has the plain bar size', ELITE, 'this.bigFx = true;', ''],
  ['an Elite has the plain bar color', ELITE, "this.barColor = '#ff9f43';", ''],
  ['the 1.5 size floor is gone', ELITE, 'Math.max(1.5, G.WildEntity.bossScale(def.dex))', 'G.WildEntity.bossScale(def.dex)'],
  ['escalation reaches an Elite', ELITE, '  spawnBump() {\n    return 0;', '  spawnBump() {\n    return 3;'],
  ['Elite HP is the wild formula', ELITE, 'return def.elite.hp;', 'return super.spawnHp(def, { t: 0 }, 0);'],
  ['an Elite can turn golden', ELITE, 'makeGolden() {}', 'makeGolden() { this.golden = true; }'],
  ['a hit does not engage', ELITE, 'G.Elites.engage(this);', ''],
  ['the XP burst is not plain', ELITE, 'G.Pickups.dropXp(this.x, this.y, this.xp, true);', 'G.Pickups.dropXp(this.x, this.y, this.xp);'],
  ['no elite drop roll', ELITE, "G.Drops.roll('elite', this.x, this.y);", ''],
  ['no TTK note', ELITE, 'G.Elites.noteDeath(this);', ''],
  ['no name tag', ELITE, 'const left = G.Elites.enrageIn(this),', 'return; const left = G.Elites.enrageIn(this),'],
  ['an elite branch comes back in the wild class', WILD, 'this.onDamaged();', 'this.onDamaged(); if (this.elite) this.pain = 0;'],
  ['wild morale is switched off for all', WILD, 'if (this.noMorale) return 1;', 'return 1;'],
  ['knockback ignores the rule', WILD, 'if (knock > 0 && !this.boss && !this.immovable) {', 'if (knock > 0 && !this.boss) {'],
  ['the hit hook is never called', WILD, 'this.onDamaged();', ''],
  ['faint fear ignores the rule', WILD, 'if (!this.boss && !this.noMorale) this.spreadFear();', 'if (!this.boss) this.spreadFear();'],
  ['a faint scares an Elite', WILD, 'e.boss || e.noMorale ||', 'e.boss ||'],
  ['liquid ignores the rule', WILD, '!this.flying && !this.ignoresLiquid && G.World.isLiquid', '!this.flying && G.World.isLiquid'],
  ['loot is not delegated', WILD, 'this.dropLoot();', 'G.Pickups.dropXp(this.x, this.y, this.xp);'],
  ['plain wild entities lose escalation', WILD, 'return !boss && !def.gym && G.Gym ? G.Gym.escBump() : 0;', 'return 0;'],
  ['status ignores the rule', ST, 'h.boss || h.strongStatus || h.gym', 'h.boss || h.gym'],
  ['Fissure ignores the rule', ME, 'e.boss || e.koImmune || e.gym', 'e.boss || e.gym'],
  ['the push ignores the rule', ME, 'if (e.boss || e.immovable) return;', 'if (e.boss) return;'],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'elite-mut-'));
let caught = 0;
for (const [name, rel, a, b] of M) {
  const s = fs.readFileSync(path.join(root, rel), 'utf8');
  if (!s.includes(a)) { console.log('STALE mutation (pattern not found): ' + name); process.exitCode = 1; continue; }
  const f = path.join(tmp, 'mutated.js');
  fs.writeFileSync(f, s.replace(a, b));
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/elite-class-harness.js')], { cwd: root, env: Object.assign({}, process.env, { EC_FILE: rel, EC_FROM: f }), encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n'), hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find((l) => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 100) + ')' : ''));
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(caught + '/' + M.length + ' mutations caught');
if (caught < M.length) process.exitCode = 1;
