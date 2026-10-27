// Mutation check for the slice 4a riders (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/move-riders-mutate.js
// Each mutation breaks move-effects.js, stages.js, status.js or enemy.js in one deliberate way, writes the copy to a temp folder, and
// runs docs/proposals/move-riders-harness.js against it (RIDERS_<FILE> env vars). The harness must fail every time.
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const SRC = { fx: ['js/systems/move-effects.js', 'RIDERS_FX'], stages: ['js/systems/stages.js', 'RIDERS_STAGES'],
  status: ['js/systems/status.js', 'RIDERS_STATUS'], enemy: ['js/entities/enemy.js', 'RIDERS_ENEMY'] };
const M = [
  ['chance divided twice', 'fx', [['const pct = v => v / 100;', 'const pct = v => v / 10000;']]],
  ['spd and spDef swapped', 'fx', [["spDef: 'spd', spd: 'spe'", "spDef: 'spe', spd: 'spd'"]]],
  ['cap off by one', 'stages', [['if (mine >= live) L.splice(', 'if (mine > live) L.splice(']]],
  ['cap drops the newest', 'stages', [['if (mine >= live) L.splice(L.findIndex(a => a.src === src), 1);', 'if (mine >= live) L.splice(L.map(a => a.src).lastIndexOf(src), 1);']]],
  ['team cap ignored', 'stages', [['if (mine >= live) { const i', 'if (mine >= TEAM_LIVE) { const i']]],
  ['stage text every time', 'stages', [['if (now !== cur && !quiet) text(', 'text(']]],
  ['root not applied', 'status', [['if (rooted(h)) return 0;', '']]],
  ['root applied to the player', 'status', [['function rooted(h) { return !!h.stTrap && !h.isPlayer; }', 'function rooted(h) { return !!h.stTrap; }']]],
  ['strong hosts not cut', 'status', [["kind === 'freeze' || kind === 'sleep' || (kind === 'trap' && !h.isPlayer)", "kind === 'freeze' || kind === 'sleep'"]]],
  ['no strong window after the root', 'status', [['if (!h.isPlayer && strong(h)) (h.stWin || (h.stWin = {})).trap = STRONG.window;', '']]],
  ['root length = the player lock', 'status', [["kind === 'trap' && !h.isPlayer ? S.root :", "kind === 'trap' && !h.isPlayer ? S.dur :"]]],
  ['overkill counted in heal', 'fx', [['Math.max(0, hp0 - Math.max(0, e.hp))', 'Math.max(0, hp0 - e.hp)']]],
  ['shield not counted in heal', 'fx', [[' + Math.max(0, sh0 - (e.shield || 0));', ';']]],
  ['no Big Root', 'fx', [['(o.bigRoot ? BIG_ROOT : 1)', '1']]],
  ['thaw missing', 'fx', [['if (foe(e)) G.Status.onHit(e, inst.spec.type);', '']]],
  ['riders on a dead target', 'fx', [['const foe = e => !e.dead && !e.remote;', 'const foe = e => !e.remote;']]],
  ['crit effect ignored', 'fx', [["(cfx ? pct(cfx.critChance || 0) : 0)", '0']]],
  ['knockback dropped', 'fx', [['kfx ? kfx.distance || 0 : 0', '0']]],
  ['hop ignored', 'fx', [['Math.pow(0.5, hop || 0)', '1']]],
  ['absent chance rolls anyway', 'fx', [['if (fx.chance == null) return true;', 'if (fx.chance == null) return rng() < 1;']]],
  ['leaving units walk while rooted', 'enemy', [['const spd = G.Status.rooted(this) ? 0 : Math.max(40, this.spd)', 'const spd = Math.max(40, this.spd)']]],
  ['rooted jumper starts a jump', 'enemy', [['else if (dist < 250 && !G.Status.rooted(this))', 'else if (dist < 250)']]],
  ['rooted crouch does not hold', 'enemy', [["if (j.t < 0 && G.Status.rooted(this)) { this.anim.loop('Idle'); return; }", '']]],
  ['rooted boss dash moves', 'enemy', [['const sp = G.Status.rooted(this) ? 0 : c.len / c.dur;', 'const sp = c.len / c.dur;']]],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'riders-mut-'));
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
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/move-riders-harness.js'), root], { env: Object.assign({}, process.env, { [env]: f }), encoding: 'utf8' });
  const hit = r.status !== 0;
  if (hit) caught++;
  console.log((hit ? 'caught  ' : 'MISSED  ') + name);
  fs.unlinkSync(f);
}
console.log(caught + '/' + M.length + ' mutations caught');
if (caught !== M.length) process.exitCode = 1;
