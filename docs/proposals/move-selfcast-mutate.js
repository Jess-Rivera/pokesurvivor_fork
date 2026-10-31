// Mutation check for slice 4b (self-casts, specials, chains, commitment). Node only; not a harness, so tools/check.js does not run it.
// Usage from the repo root:  node docs/proposals/move-selfcast-mutate.js
// Each mutation breaks move-effects.js, move-sim.js, stages.js or player.js in one deliberate way, writes the copy to a temp folder,
// and runs docs/proposals/move-selfcast-harness.js against it (SELF_<FILE> env vars). The harness must fail every time.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = { fx: ['js/systems/move-effects.js', 'SELF_FX'], sim: ['js/systems/move-sim.js', 'SELF_SIM'], stages: ['js/systems/stages.js', 'SELF_STAGES'],
  player: ['js/entities/player.js', 'SELF_PLAYER'] };
const M = [
  // chains (handoff test 12)
  ['chain excludes all earlier hits instead of only the previous', 'sim', [['return fresh || again;', 'return fresh;']]],
  ['falloff compounding missing', 'fx', [['Math.pow(1 - hopReduction(def), hop)', '(1 - hopReduction(def))']]],
  ['falloff applied before the other multipliers', 'fx', [['(def.basePower || 0) * (sb &&', '(def.basePower || 0) * hopMul(def, hop) * (sb &&'], ['const dmg = Math.max(1, full * hopMul(def, hop));', 'const dmg = full;']]],
  ['rider halving missing', 'fx', [['Math.pow(0.5, hop || 0)', '1']]],
  ['chain exceeds chainHops', 'sim', [['k <= sp.chainHops;', 'k <= sp.chainHops + 1;']]],
  ['every struck enemy starts a chain', 'sim', [['chain(inst, struck.includes(inst.cast.target) ? inst.cast.target : struck[0]);', 'struck.forEach(e => chain(inst, e));']]],
  ['chain starts from the first struck, not the target', 'sim', [['struck.includes(inst.cast.target) ? inst.cast.target : struck[0]', 'struck[struck.length - 1]']]],
  // specials
  ['Hex doubles final damage', 'fx', [[' * (sb && G.Status.majorKind(e) ? sb.multiplier : 1), type', ', type'], ['(crit ? CRIT_MUL : 1));     // D11', '(crit ? CRIT_MUL : 1) * (sb && G.Status.majorKind(e) ? sb.multiplier : 1));']]],
  ['Hex counts confusion', 'fx', [['sb && G.Status.majorKind(e) ?', 'sb && (G.Status.majorKind(e) || e.stCnf) ?']]],
  ['flat damage takes a multiplier', 'fx', [['const dmg = Math.max(1, amount * hopMul(def, hop));', 'const dmg = Math.max(1, amount * hopMul(def, hop) * G.Weather.mult(def.type));']]],
  ['levelDamage uses a fixed number', 'fx', [['inst.cast.owner.level || 1', '30']]],
  ['setWeather not run on a shapeless cast', 'fx', [["      G.Weather.force(fx.weather, fx.duration);\n", '']]],
  // Substitute, recoil, shield
  ['recoil goes through hurt', 'fx', [['o.payHp(out.paid);', 'o.hurt(out.paid);']]],
  ['recoil can kill', 'fx', [["if (fx.t === 'recoil' && fx.trigger === 'cast' && o.hp <= paidOf(fx, o)) return false;", '']]],
  ['payHp has no floor', 'player', [['this.hp = Math.max(1, this.hp - n);', 'this.hp = this.hp - n;']]],
  ['shield absorb after the invulnerability (a full absorb sets it)', 'player', [['if (took >= d) return;', 'if (took >= d) { this.invuln = 0.45; return; }']]],
  ['no spill', 'player', [['return sh.overflow ? took : d;', 'return d;']]],
  ['shield regen missing', 'player', [['sh.v = Math.min(sh.max, sh.v + sh.regen * dt);', '']]],
  ['a broken shield regenerates', 'player', [['if (sh.v <= 1e-9) this.shield = null;', '']]],
  ['two shields at once', 'fx', [["if (fx.t === 'shield' && o.shield) return false;", '']]],
  ['shield survives a swap', 'fx', [['if (o) o.shield = null;', '']]],
  // heal over time, stat buffs
  ['Aqua Ring stacks', 'fx', [['if (old) { old.left = left; return; }', '']]],     // retargeted slice 5a (the refresh line now reads `left`)
  ['Aqua Ring heal outlives its aura', 'sim', [['    for (const i of list) G.MoveEffects.endHeal(i.cast.owner, G.MoveEffects.srcOf(i.spec, i.cast.owner));', '']]],     // slice 5a
  ['heal over time survives a swap', 'fx', [['hots = o ? hots.filter(h => h.o !== o) : [];', 'hots = o ? hots : [];']]],
  ['per-move instead of per-Pokemon stack tag', 'fx', [["return def.id + '@' + tags.get(o);", 'return def.id;']]],
  // commitment (handoff test 16)
  ['freeze runs the timer anyway', 'sim', [['const frozen = (o, id) => cms.some(', 'const frozen = (o, id) => false && cms.some(']]],
  ['freeze arms the timer at the cast', 'sim', [['if (m.part === \'cooldown\' && (!m.ids || m.ids.has(m.def.id))) m.slot.t = Math.max(0.05, m.def.cd * (m.o.cdMul || 1));', ''],
    ["m.part === 'cooldown' && (!m.ids || m.ids.has(id)));", "m.part === 'cooldown' && (!m.ids || m.ids.has(id)) && id !== m.def.id);"]]],
  ['id = all freezes only the owner slot', 'sim', [["m.part === 'cooldown' && (!m.ids || m.ids.has(id)));", "m.part === 'cooldown' && (m.ids ? m.ids.has(id) : id === m.def.id));"]]],
  ['released timer ignores cdMul', 'sim', [['m.slot.t = Math.max(0.05, m.def.cd * (m.o.cdMul || 1));', 'm.slot.t = Math.max(0.05, m.def.cd);']]],
  ['untilEffectEnd waits only for expiry', 'sim', [['return !m.shield || m.o.shield !== m.shield;', 'return !m.shield || m.shield.t <= 0;']]],
  ['slowed shows stage text', 'sim', [["G.Stages.add(o, 'spe', -2, dur, G.Stages.MAX, src, 1, true);", "G.Stages.add(o, 'spe', -2, dur, G.Stages.MAX, src, 1, false);"]]],
  ['slowed stacks per cast instead of per source', 'sim', [["G.Stages.add(o, 'spe', -2, dur, G.Stages.MAX, src, 1, true);", "G.Stages.add(o, 'spe', -2, dur, G.Stages.MAX, src + ':' + castSerial, 1, true);"]]],
  ['slow not dropped with its instance', 'sim', [["if (m.part === 'movement' && m.type === 'slowed') G.Stages.drop(m.o, m.src);", '']]],
  ['root not cleared on swap', 'sim', [['    o.mvRoot = false;\n    G.MoveEffects.endSelf(o);', '    G.MoveEffects.endSelf(o);']]],
  ['root ignored by move speed', 'player', [['return this.mvRoot ? 0 :', 'return']]],
  ['stage quiet flag ignored', 'stages', [['if (now !== cur && !quiet) text(', 'if (now !== cur) text(']]],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'selfcast-mut-'));
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
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/move-selfcast-harness.js'), root], { env: Object.assign({}, process.env, { [env]: f }), encoding: 'utf8', timeout: 120000 });
  const hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name);
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught !== M.length) process.exitCode = 1;
