// Mutation check for entity model slice 4a (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/hit-parity-mutate.js
// Each mutation breaks one file in one deliberate way, writes the copy to a temp folder, and runs hit-parity-harness.js against it
// (the HP_* variables). The harness must fail every time; a miss is a gap. A STALE line means the target text moved: fix the pattern.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const ENV = {
  'js/core/stats.js': 'HP_STATS',
  'js/systems/move-effects.js': 'HP_FX',
  'js/entities/player.js': 'HP_PLAYER',
  'js/entities/enemy.js': 'HP_ENEMY',
  'js/entities/elite.js': 'HP_ELITE',
  'js/systems/combat.js': 'HP_COMBAT',
  'js/systems/hazards.js': 'HP_HAZARDS',
  'js/systems/status.js': 'HP_STATUS',
};
const ST = 'js/core/stats.js',
  FX = 'js/systems/move-effects.js',
  PL = 'js/entities/player.js',
  EN = 'js/entities/enemy.js',
  EL = 'js/entities/elite.js',
  CB = 'js/systems/combat.js',
  HZ = 'js/systems/hazards.js',
  SS = 'js/systems/status.js';
const M = [
  // STAB and the scale in the two defense halves (stats.js)
  ['STAB before the +2 on your hits', ST, 'return (factor / Math.max(1, dStat) + 2) * stabMul * scale;', 'return ((factor * stabMul) / Math.max(1, dStat) + 2) * scale;'],
  ['no STAB on your hits', ST, 'stab === true ? STAB : stab > 0 ? stab : 1;', '1;'],
  ['STAB applied twice', ST, '+ 2) * stabMul * scale;', '+ 2) * stabMul * stabMul * scale;'],
  ['a stab of 1 read as true (the old boolean rule)', ST, 'stab === true ? STAB : stab > 0 ? stab : 1;', 'stab ? STAB : 1;'],
  ['STAB on a status-category hit', ST, "const stabMul = cat === 'status' ? 1 :", "const stabMul = cat === 'status' ? STAB :"],
  ['the Player-entity defense ignores STAB', ST, 'return (factor / Math.max(1, stat * defMul) + 2) * stab * scale;', 'return (factor / Math.max(1, stat * defMul) + 2) * scale;'],
  ['the Player-entity defense ignores the target scale', ST, 'return (factor / Math.max(1, stat * defMul) + 2) * stab * scale;', 'return (factor / Math.max(1, stat * defMul) + 2) * stab * ENEMY_DMG_SCALAR;'],
  // the wild defense half and the hit builder (move-effects.js)
  ['the 0.5 scale on a wild', FX, 'scale = G.Stats.DMG_SCALAR; // slice 4 H2', 'scale = G.Stats.ENEMY_DMG_SCALAR; // slice 4 H2'],
  ['the type chart skipped on a wild', FX, 'const k = typeK(o, def.type, e);', 'const k = 1;'],
  ['the floor of 1 removed on a wild', FX, 'Math.max(1, D * k * G.Stats.itemDmgMul(o, def.type, k) * (b.crit ? b.critMul : 1)); // D11\n    const dmg = Math.max(1, full * hopMul(def, hop));', '(D * k * G.Stats.itemDmgMul(o, def.type, k) * (b.crit ? b.critMul : 1)); // D11\n    const dmg = full * hopMul(def, hop);'],
  ['the chain falloff skipped', FX, 'const dmg = Math.max(1, full * hopMul(def, hop));', 'const dmg = Math.max(1, full);'],
  ['the crit multiplier lost on a wild', FX, '(b.crit ? b.critMul : 1)); // D11', '1); // D11'],
  ['the side-effect rules picked by the attacker again', FX, 'if (e.isPlayer) return hitPlayer(inst, e, hop, rng);', 'if (inst.cast.owner.foes) return hitPlayer(inst, e, hop, rng);'],
  ["STAB ignores the attacker's types", FX, 'o.stabFor && o.stabFor(m) ? G.Stats.STAB : 1', 'false ? G.Stats.STAB : 1'],
  ['Leek ignored on a crit', FX, 'critMul: CRIT_MUL * (o.critDmgMul || 1),', 'critMul: CRIT_MUL,'],
  ['a move on a Player entity skips takeHit', FX, 'pl.takeHit(b); // slice 4a', "pl.hurt(b.A, b.type, false, { factor: b.A, cat: b.cat, mul: b.crit ? b.critMul : 1, crit: b.crit }, b.who); // slice 4a"],
  // the Player-entity defense half (player.js)
  ['the human takes the 1.0 scale', PL, 'return G.Stats.ENEMY_DMG_SCALAR;', 'return G.Stats.DMG_SCALAR;'],
  ['every Player entity takes the 0.5 scale', PL, 'return G.Stats.DMG_SCALAR;', 'return G.Stats.ENEMY_DMG_SCALAR;'],
  ['hurt drops the STAB of the hit', PL, 'stab = atk.stab || 1,', 'stab = 1,'],
  ['takeHit drops the crit', PL, 'const mul = (b.mul || 1) * (b.crit ? b.critMul : 1);', 'const mul = b.mul || 1;'],
  ['the crit folded before your defense', PL, 'return this.hurt(b.A, b.type, false, { factor: b.A, cat: b.cat, mul, crit: !!b.crit, stab: b.stab || 1 }, b.who);', 'const cA = b.A * (b.crit ? b.critMul : 1);\n    return this.hurt(cA, b.type, false, { factor: cA, cat: b.cat, mul: b.mul || 1, crit: !!b.crit, stab: b.stab || 1 }, b.who);'],
  ['your type chart skipped', PL, 'tk = G.Types.mult(type, this.mon.types);', 'tk = 1;'],
  ['Substitute bypassed on you', PL, 'if (this.shield) {\n      // move schema slice 4b (Substitute)', 'if (false) {\n      // move schema slice 4b (Substitute)'],
  ['i-frames ignored on you', PL, 'if (this.invuln > 0 || this.dead) {', 'if (this.dead) {'],
  ['takeDot dropped on you', PL, '  takeDot(kind, amount, color) {\n    this.statusDot(kind, amount, color);\n  }', '  takeDot() {}'],
  // DoT and the other families (enemy.js, elite.js, status.js)
  ['takeDot dropped on a wild', EN, '    takeDot(kind, amount, color) {\n      this.dot(kind, amount, color);\n    }', '    takeDot() {}'],
  ['an Elite takes knockback', EL, 'this.immovable = true;', ''],
  ['DoT skips takeDot', SS, 'if (h.takeDot) h.takeDot(name, amount, color);', 'if (false) h.takeDot(name, amount, color);'],
  // the other callers (combat.js, hazards.js)
  ['wild contact skips takeHit', CB, 'res = pl.takeHit({ A: e.atkFactor, cat: e.atkCat, type: e.atkType, stab: stabOf(e, e.atkType), mul: e.contactMul(), who: w });', 'res = pl.hurt(e.atkFactor, e.atkType, false, { factor: e.atkFactor, cat: e.atkCat, mul: e.contactMul() }, w);'],
  ['a shot loses its multiplier', CB, 'mul: p.mul, who: w', 'mul: 1, who: w'],
  ['a hazard reads the wrong category', HZ, 'pl.takeHit({ A: h.atkFactor, cat: h.atkCat,', "pl.takeHit({ A: h.atkFactor, cat: 'special',"],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hit-parity-mut-'));
let caught = 0;
for (const [name, rel, a, b] of M) {
  const s = fs.readFileSync(path.join(root, rel), 'utf8');
  if (!s.includes(a)) {
    console.log('STALE mutation (pattern not found): ' + name);
    process.exitCode = 1;
    continue;
  }
  const f = path.join(tmp, 'mutated.js');
  fs.writeFileSync(f, s.replace(a, b));
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/hit-parity-harness.js')], {
    cwd: root,
    env: Object.assign({}, process.env, { [ENV[rel]]: f }),
    encoding: 'utf8',
  });
  const lines = (r.stdout + r.stderr).trim().split('\n'),
    hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name + (hit ? '  (' + (lines.find((l) => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 100) + ')' : ''));
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(caught + '/' + M.length + ' mutations caught');
if (caught < M.length) process.exitCode = 1;
