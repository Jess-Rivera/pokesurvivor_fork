// Mutation check for entity model slice 5 (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/gym-leader-mutate.js
// Each mutation breaks one file in one deliberate way, writes the copy to a temp folder, and runs gym-leader-harness.js against it (GL_<FILE>).
// The harness must fail every time; a miss is a gap, a stale pattern is reported as STALE.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const LD = 'js/entities/gym-leader.js',
  PL = 'js/entities/player.js',
  BR = 'js/entities/boss-ai.js',
  ST = 'js/systems/status.js',
  FX = 'js/systems/move-effects.js',
  CB = 'js/systems/combat.js',
  GY = 'js/data/gyms.js',
  AI = 'js/entities/leader-ai.js';
const ENV = { [AI]: 'GL_AI', [LD]: 'GL_LEADER', [PL]: 'GL_PLAYER', [BR]: 'GL_BRAIN', [ST]: 'GL_STATUS', [FX]: 'GL_FX', [CB]: 'GL_COMBAT', [GY]: 'GL_GYMS' };
const M = [
  // edge unstick (Jess 2026-11-07; #41: the Decider's, G.LeaderAI)
  ['no edge side-step', AI, 'e.heading = this.unstick(e, dt, this.execute(e, dt, pl, free));', 'e.heading = this.execute(e, dt, pl, free);'], // #51 retarget
  ['the stuck test never runs', AI, '    if (step && L.lastHeading) this.noteStuck(e, step.dt, step.moved, L.lastHeading);\n', ''],
  ['no wait before the side-step', AI, 'if (L.stuckT > U.stuck && !(L.sideStepT > 0)) {', 'if (!(L.sideStepT > 0)) {'],
  ['moving freely counts as stuck', AI, 'if (want <= 0.5 || got >= want * U.slip) {', 'if (want <= 0.5) {'],
  ['a flinch counts as stuck', AI, 'if (e.mvRoot || e.stFl || ', 'if (e.mvRoot || '],
  ['the smart side is ignored', AI, 'return l > r ? -1 : 1;', 'return this.legsOf(e).side < 0 ? -1 : 1;'],
  ['the circling side is ignored', AI, 'return this.legsOf(e).side < 0 ? -1 : 1;\n', 'return 1;\n'],
  // the class and the switch
  ['the switch is ignored', BR, 'if (def.gym && def.gym.playerEntity) return new G.GymLeader(def, x, y);', ''],
  ['every gym takes the leader body', BR, 'if (def.gym && def.gym.playerEntity) return', 'if (def.gym) return'],
  ['no enemy list id', LD, 'this.id = G.EnemyMgr.newId();', ''],
  ['it is not the boss', LD, 'this.boss = true;', 'this.boss = false;'],
  ['hpMult is dropped', LD, 'return Math.round(super.maxHpAt(level) * this.hpMult);', 'return super.maxHpAt(level);'],
  ['hpMult does not carry forward', GY, 'if (k <= loop) at = m[k];', 'if (k === loop) at = m[k];'],
  // hit parity
  ['hit i-frames stay on', LD, "get hitIframes() {\n    const v = this.rule('hitIframes');", "get hitIframes() {\n    return 0.45;\n    const v = this.rule('hitIframes');"], // slice 6 retarget
  ['the melee cushion is off for a leader', PL, 'const close = this.activeGroup().some(', 'const close = !this.isRival && this.activeGroup().some('], // slice 8 retarget
  ['the attacker items are dropped', FX, 'b.itemMul = G.Stats.itemDmgMul(b.owner, def.type, typeK(b.owner, def.type, pl));', 'b.itemMul = 1;'],
  ['takeHit ignores the items', PL, '* (b.itemMul || 1);', ';'],
  ['Power Stone is dropped', FX, 'b.stone = b.owner.stoneType === def.type;', 'b.stone = false;'],
  ['Power Stone does not pierce immunity', PL, 'if (tk === 0 && !stone) {', 'if (tk === 0) {'],
  ['Power Stone has no floor', PL, '(stone ? Math.max(1, tk * wk) : tk * wk)', '(tk * wk)'],
  ['wildStatusDivisor is ignored', FX, " && pl.rule('wildStatusDivisor') === true;", ';'], // #41: your rule unless authored
  ['a leader never takes the wild divisor', FX, " && pl.rule('wildStatusDivisor') === true;", ' && false;'],
  ['flat moves do nothing on a leader', FX, 'if (pl.isRival && FLAT[fx.handler]) return special(inst, pl, rng, fx, hop, hit);', ''],
  ['a leader flat move hits you', FX, 'if (pl.isRival && FLAT[fx.handler]) return', 'if (FLAT[fx.handler]) return'],
  ['your damage is not counted', FX, 'b.owner.dmgDealt = (b.owner.dmgDealt || 0) + hit.dealt;', ''],
  ['Shell Bell hears nothing', FX, 'if (b.owner.onDealt) b.owner.onDealt(hit.dealt);', ''],
  ['takeFlat reads the color as a type', PL, 'return this.hurt(amount, null, true, color ? { color } : null);', 'return this.hurt(amount, color, false);'],
  ['the wild flat entry drops the amount', 'js/entities/enemy.js', 'this.hurt(amount, color, dirX, dirY, knock, null);', ''],
  ['the leader shows the player number', LD, "show = atk && atk.crit ? '#ff9a3c' : eff === 'super' ? '#ffe14d' : eff === 'weak' ? '#a3abb8' : col;", "show = '#ff6b7a';"],
  // status
  ['a leader is strong', ST, '&& !h.leaderStatus;', ';'],
  ['no leader freeze and sleep cut', ST, "if (h.statusCut != null && (kind === 'freeze' || kind === 'sleep')) return base * h.statusCut;", ''], // slice 6 retarget
  ['the 5 s gap is 2.5 s', ST, 'h.ccWindow != null ? h.ccWindow : GRACE', 'GRACE'], // slice 6 retarget
  ['the AI never shakes off', LD, "    return this.rule('autoShake') !== false;", '    return false;'], // slice 6 retarget; #43: the leader's autoShakeOn
  // the brain
  ["a frozen leader's timers stop", LD, '    G.MoveSim.turn(dt, e, now);', '    if (!G.Status.stunned(e)) G.MoveSim.turn(dt, e, now);'], // #40 retarget: a stun keeps the timers running, as yours
  ['the heading never reaches the controller', AI, 'axis: () => this.active.heading,', 'axis: () => [0, 0],'], // LEADER-AI slice 1 retarget
  ['no self heal restriction', LD, 'rules.healLimit != null ? rules.healLimit : ', ''],
  ['tells cannot be turned off', LD, "return this.rule('tells') !== false;", 'return true;'], // #41 retarget: the Body's tellsOn
  ['the caster installs heal on the leader', LD, '    this.aim = 0;\n', '    this.aim = 0;\n    this.heal = (n) => n;\n'], // slice 5a, #41 retarget, #45 retarget
  ['flinch keeps the old D5 rule', LD, '    this.tell = null;\n    G.MoveSim.flinch(this);', '    this.tell = null;\n    this.firstWaitLeft = 1;'], // slice 8, 5a, #41 retarget
  ['flinch keeps the tell', LD, '    this.tell = null;\n    G.MoveSim.flinch(this);', '    G.MoveSim.flinch(this);'], // slice 8, 5a, #41 retarget
  ['an asleep leader flinches', LD, 'applyFlinch() {\n    if (this.dead || G.Status.stunned(this)) return false;', 'applyFlinch() {\n    if (this.dead) return false;'],
  ['the aim follows you through the tell', LD, 'after: T.RECOVER / tempo, ang, spot, fired: false };', 'after: T.RECOVER / tempo, ang, spot, fired: false, get ang2() { return 0; } }; Object.defineProperty(this.tell, "ang", { get: () => Math.atan2(G.Game.player.y - e.y, G.Game.player.x - e.x) });'],
  // enrage
  ['no enrage clock', LD, 'if (this.hp < hp0 && this.gym.engagedAt == null) this.gym.engagedAt = G.Gym.now();', ''],
  ['every hit restarts the clock', LD, 'if (this.hp < hp0 && this.gym.engagedAt == null)', 'if (this.hp < hp0)'],
  ['an immune hit engages', LD, 'if (this.hp < hp0 && this.gym.engagedAt == null)', 'if (this.gym.engagedAt == null)'],
  // touch, faint
  ['touch damage stays', CB, 'if (e.isRival) continue;', ''],
  ['no drop on the faint', LD, "G.Drops.roll('gym', this.x, this.y);", ''],
  ['no faint hook', PL, '      this.onFaint();\n', ''],
  ['the corpse never fades', LD, 'this.fade -= dt;', ''],
  ['no fade starts', LD, 'this.fade = 0.9;', ''],
  // what the enemy list calls
  ['applyBurn missing', LD, "G.Status.applyDot(this, 'burn', mul, durMul);", ''],
  ['applyPoison ignores Toxic', LD, "lv >= 2 ? 'toxic' : 'poison'", "'poison'"],
  ['applySlow missing', LD, 'this.slowT = Math.max(this.slowT, dur);', ''],
  // data and validator
  ['Misty is not switched on', GY, 'playerEntity: true, // entity model slice 5', '// entity model slice 5'],
  ['Misty loses her hpMult', GY, 'hpMult: { 1: 25, 2: 19 },', 'hpMult: { 1: 13, 2: 19 },'], // slice 7 retarget
  ['unknown restrictions pass', GY, "for (const k of unknownKeys(rules, RESTRICTION_KEYS)) bad.push((g.leader || '?') + ': unknown restriction ' + k);", ''],
  ['bad tells pass', GY, "if (rules.tells != null && typeof rules.tells !== 'boolean')", 'if (false)'],
  ['bad healLimit passes', GY, 'if (rules.healLimit != null && !(Number.isInteger(rules.healLimit) && rules.healLimit >= 0))', 'if (false)'],
  ['the switch needs no hpMult', GY, 'if (g.playerEntity && !(g.hpMult && g.hpMult[1] > 0))', 'if (false)'],
];
ENV['js/entities/enemy.js'] = 'GL_ENEMY';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-leader-mut-'));
let caught = 0,
  bad = 0;
for (const [name, file, a, b] of M) {
  const s = fs.readFileSync(path.join(root, file), 'utf8');
  if (!s.includes(a)) {
    console.log('STALE mutation (pattern not found): ' + name);
    bad++;
    continue;
  }
  const out = path.join(tmp, path.basename(file));
  fs.writeFileSync(out, s.replace(a, b));
  const env = Object.assign({}, process.env, { [ENV[file]]: out });
  const r = cp.spawnSync(process.execPath, [path.join(root, 'docs/proposals/gym-leader-harness.js')], { env, encoding: 'utf8' });
  const lines = (r.stdout + r.stderr).trim().split('\n');
  if (r.status !== 0) {
    caught++;
    console.log('caught  ' + name + '  (' + (lines.find((l) => l.startsWith('FAIL')) || lines[lines.length - 1]).slice(0, 110) + ')');
  } else {
    bad++;
    console.log('MISSED  ' + name);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(caught + '/' + M.length + ' mutations caught');
process.exit(bad ? 1 : 0);
