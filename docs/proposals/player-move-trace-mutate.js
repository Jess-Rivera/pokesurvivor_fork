// Mutation check for #43 step A (Node only; not a harness, so tools/check.js does not run it).
// Usage from the repo root:  node docs/proposals/player-move-trace-mutate.js
// Each mutation breaks one rule of the Body (acceptHeading, acceptDodge, acceptsCast) or one SimPass step (js/entities/player-sim-pass.js,
// the cast refusal in G.MoveSim), writes the copy to a temp folder and runs player-move-trace-harness.js against it (PM_PLAYER,
// PM_SIMPASS, PM_SIM, PM_LEADER, and for step B PM_GAME, PM_ARENA, PM_ENEMY). The trace must fail every time; a miss is a gap. STALE means the pattern no longer matches.
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  cp = require('child_process');
const root = path.resolve(__dirname, '..', '..');
const ENV = {
  'js/entities/player.js': 'PM_PLAYER',
  'js/entities/player-sim-pass.js': 'PM_SIMPASS',
  'js/systems/move-sim.js': 'PM_SIM',
  'js/entities/gym-leader.js': 'PM_LEADER',
  'js/game.js': 'PM_GAME',
  'js/systems/gym-arena.js': 'PM_ARENA',
  'js/entities/enemy.js': 'PM_ENEMY',
};
const P = 'js/entities/player.js',
  SP = 'js/entities/player-sim-pass.js',
  SM = 'js/systems/move-sim.js',
  LD = 'js/entities/gym-leader.js',
  GM = 'js/game.js',
  AR = 'js/systems/gym-arena.js',
  EN = 'js/entities/enemy.js';
const M = [
  // the Body
  ['a push no longer refuses the heading', P, '    if (this.frozen || this.stFl || this.stPush || G.Status.stunned(this)) return null;\n    let [ax, ay]', '    if (this.frozen || this.stFl || G.Status.stunned(this)) return null;\n    let [ax, ay]'],
  ['a stun no longer refuses the heading', P, '    if (this.frozen || this.stFl || this.stPush || G.Status.stunned(this)) return null;\n    let [ax, ay]', '    if (this.frozen || this.stFl || this.stPush) return null;\n    let [ax, ay]'],
  ['confusion no longer drifts', P, '    if (this.stCnf && (ax || ay)) {', '    if (false) {'],
  ['daze no longer jitters', P, '    if (this.stDaze && (ax || ay)) {', '    if (false) {'],
  ['a stun accepts a dodge', P, '    if (this.frozen || this.stFl || this.stPush || this.mvRoot || G.Status.stunned(this)) return null;\n    const [ax, ay]', '    if (this.frozen || this.stFl || this.stPush || this.mvRoot) return null;\n    const [ax, ay]'],
  ['the dodge gap is ignored', P, '    if (this.dead || this.dodgeT > 0 || c.gap > 0 || i < 0) return null;', '    if (this.dead || this.dodgeT > 0 || i < 0) return null;'],
  ['a standing dodge goes nowhere', P, ': [Math.cos(this.moveAngle), Math.sin(this.moveAngle)];', ': [0, 0];'],
  ['a stun no longer refuses a cast', P, '  acceptsCast() {\n    return !G.Status.stunned(this);', '  acceptsCast() {\n    return true;'],
  ['the sim ignores the Body on a cast', SM, 'if (o.acceptsCast ? !o.acceptsCast() : G.Status.stunned(o)) {', 'if (!o.acceptsCast && G.Status.stunned(o)) {'],
  // the SimPass
  ['a freeze no longer cancels the dodge', SP, 'if (e.dodgeT > 0 && (e.frozen || e.stFl || e.stPush || G.Status.stunned(e))) e.endDodge();', 'if (e.dodgeT > 0 && (e.frozen || e.stFl || e.stPush)) e.endDodge();'],
  ['the dodge never shrinks the body', SP, '    if (!e.dodgeR0) {\n      e.dodgeR0 = e.r;\n      e.r *= D.shrink;\n    }', ''],
  ['the push is ignored', SP, '    if (e.stPush) {\n      // a push', '    if (false) {\n      // a push'],
  ['the flinch recoil is ignored', SP, '      [e.svx, e.svy] = e.flinchMove(dt);', '      [e.svx, e.svy] = [0, 0];'],
  ['ice no longer slides', SP, "    const slide = e.inLiquid && G.World.liquidEffect(e.mon.types).slide;", '    const slide = false;'],
  ['the ice glide is lost', SP, '    } else if (e.iceGlide) {', '    } else if (false) {'],
  ['one step per frame', SP, '    const steps = Math.max(1, Math.ceil((Math.hypot(e.svx, e.svy) * dt) / 4));', '    const steps = 1;'],
  ['walls stop a flying body', SP, '      if (e.flyT > 0) e.keepInArena();\n      else G.World.collide(e);', '      G.World.collide(e);'],
  ['the body never grows back', SP, '      if (e.dodgeR0 && e.dodgeEl >= D.shrinkT && fits) {', '      if (false) {'],
  ['lava never hurts', SP, '          e.hurt(Math.max(le.flat, e.maxHp * le.dmg * 0.5));', ''],
  ['statuses stop ticking', SP, '    G.Status.tick(e, dt);\n', ''],
  ['the facing ignores the dodge', SP, '      e.moveAngle = Math.atan2(e.dodgeVy, e.dodgeVx);', ''],
  // the leader's attack acceptance is built on yours
  ["a leader's attack ignores the stun", LD, 'return this.acceptsCast() && !this.stFl', 'return !this.stFl'],
  // #43 step B: a leader's frame in your order
  ["a leader's slot hold ticks before its Decider again", LD, '    this.ai.think(this, dt, pl);\n    this.takeSlotInput();', '    this.tickSlotLock(dt);\n    this.ai.think(this, dt, pl);\n    this.takeSlotInput();'],
  ["a leader's shake runs after its body", LD, '    this.shakeStep(dt);\n    const ox = this.x,', '    const ox = this.x,'],
  ["a leader's swap lands after its frame", LD, '    const next = this.team ? G.GymArena.swapStep(this.team, dt) : null;\n    (next || this).fieldFrame(dt);', '    this.fieldFrame(dt);\n    if (this.team) G.GymArena.swapStep(this.team, dt);'],
  ['the incoming mon waits a frame', LD, '    (next || this).fieldFrame(dt);', '    if (!next) this.fieldFrame(dt);'],
  ['the swap point ignores the lock', AR, '    t.tickLock(dt);\n    let next = null;', '    let next = null;'],
  ['replace removes and re-adds', EN, '      list[i] = next;\n', '      list.splice(i, 1);\n      list.push(next);\n'],
  ['your frame loses its shake step', GM, '    pl.shakeStep(dt);', ''],
];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-mutate-'));
let caught = 0,
  stale = 0,
  miss = 0;
for (const [name, file, from, to] of M) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  if (!src.includes(from)) {
    console.log('STALE  ' + name);
    stale++;
    continue;
  }
  const out = path.join(tmp, path.basename(file));
  fs.writeFileSync(out, src.replace(from, to));
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'player-move-trace-harness.js')], { cwd: root, env: Object.assign({}, process.env, { [ENV[file]]: out }), encoding: 'utf8' });
  fs.unlinkSync(out);
  if (r.status !== 0) caught++;
  else {
    console.log('MISS   ' + name);
    miss++;
  }
}
fs.rmdirSync(tmp);
console.log('player-move-trace-mutate: ' + caught + '/' + M.length + ' caught' + (stale ? ', ' + stale + ' STALE' : '') + (miss ? ', ' + miss + ' MISS' : ''));
