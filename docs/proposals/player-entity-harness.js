// G.PlayerEntity and G.HumanPlayer offline checks (Node only), entity model slice 3. Usage from the repo root:
//   node docs/proposals/player-entity-harness.js
// Under test: js/entities/player.js (the base class, the human subclass, the IDLE and KEYBOARD controllers) and, as text, the
// controller reads in js/game.js, the NEED entry in js/main.js and the 14 isPlayer sites (js/systems/status.js, move-effects.js; the 14th is slice 4a's target routing).
// Plan: docs/proposals/host-model-plan.md slice 3; map: docs/ASCII Concept Maps/Entity Model Slice 3 - PlayerEntity and HumanPlayer.txt.
// Real util.js and stats.js; the engine around the entity is stubbed, and the input, camera and sound stubs record every call.
// Expected values are worked out by hand (DODGE 150 px in 0.5 s, Medium Fast XP 3L^2 + 3L + 1, the pre-slice field values),
// never copied from output. The mutation runner (player-entity-mutate.js) points the PE3_* variables at altered copies.
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const R = path.resolve(__dirname, '..', '..');
const SRC = {
  'js/entities/player.js': 'PE3_PLAYER',
  'js/game.js': 'PE3_GAME',
  'js/main.js': 'PE3_MAIN',
  'js/systems/status.js': 'PE3_STATUS',
  'js/systems/move-effects.js': 'PE3_FX',
  'js/systems/team.js': 'PE3_TEAM', // LEADER-AI slice 1: the swap input is read by G.Team.requested
  'js/entities/player-sim-pass.js': 'PE3_SIMPASS', // #43: the movement steps
};
const read = (p) => fs.readFileSync(process.env[SRC[p]] || path.join(R, p), 'utf8');
const load = (p) => vm.runInThisContext(read(p), { filename: p });
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global;
global.location = { search: '?dev' };

const rec = { input: [], cam: [], sfx: [] };
let keyAxis = [0, 1],
  pressed = new Set(),
  ENEMIES = [];
const ROCK = { x: 50, y: 50, rock: true };
const base = {
  Sprites: {
    hasShiny: () => false,
    Animator: class {
      update() {}
      loop() {}
      play() {}
      _start() {}
    },
    bodyRadius: () => 10,
    bodyHeight: () => 20,
    dirFromAngle: () => 0,
  },
  Status: { tick() {}, stunned: () => false, swapLocked: (h) => !!h.stTrap, clear() {}, speedMul: () => 1 },
  Stages: { teamTick() {}, tick() {}, teamSum: () => 0, clear() {}, mul: () => 1, stage: () => 0, speedMul: () => 1 },
  World: { collide() {}, isLiquid: () => false, isFree: () => true, liquidEffect: () => ({}), nearestBreakable: () => ROCK },
  Projectiles: {
    nearest(list, x, y, r) {
      let best = null,
        bd = r * r;
      for (const e of list) {
        const d = (e.x - x) ** 2 + (e.y - y) ** 2;
        if (!e.dead && d <= bd) {
          bd = d;
          best = e;
        }
      }
      return best;
    },
  },
  EnemyMgr: { all: () => ENEMIES },
  Input: {
    axis() {
      rec.input.push('axis');
      return keyAxis;
    },
    action(n) {
      rec.input.push(n);
      return pressed.has(n);
    },
  },
  Camera: { kick: (k) => rec.cam.push(k) },
  Audio: { sfx: (k) => rec.sfx.push(k) },
  Log: { on: false },
  MoveDefs: {},
  MoveEffects: { skillOf: () => null, skillFx: () => null },
};
global.G = new Proxy(base, {
  get: (t, k) => (k in t ? t[k] : noop),
  set: (t, k, v) => {
    t[k] = v;
    return true;
  },
});
for (const p of ['js/core/util.js', 'js/core/stats.js', 'js/entities/player.js', 'js/entities/player-sim-pass.js']) {
  try {
    load(p);
  } catch (e) {
    console.log('FAIL load ' + p + ': ' + e.message);
    process.exit(1);
  }
}

let fail = 0,
  n = 0;
const ok = (c, m) => {
  n++;
  if (!c) {
    fail++;
    console.log('FAIL ' + m);
  }
};
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 1e-9;
const clear = () => {
  rec.input.length = rec.cam.length = rec.sfx.length = 0;
};
const MON = { dex: 1, name: 'Bulbasaur', stats: [45, 49, 49, 65, 65, 45], types: ['grass', 'poison'], hp: 45, spd: 45, atk: 49 };
const speed100 = (e) => Object.defineProperty(e, 'spd', { value: 100 }); // a known speed, so a step is hand-checkable
const script = (o = {}) =>
  Object.assign({ axis: () => [0, 0], dodge: () => false, shake: () => false, swapSlot: () => -1, swapDir: () => 0, slots: () => [], cycles: () => [] }, o);
const PE = G.PlayerEntity,
  HP = G.HumanPlayer;

// 1. structure
ok(typeof PE === 'function' && typeof HP === 'function', 'G.PlayerEntity and G.HumanPlayer exist');
ok(G.Player === HP, 'G.Player names the human class');
ok(Object.getPrototypeOf(HP.prototype) === PE.prototype, 'HumanPlayer extends PlayerEntity');
{
  const h = new HP(MON),
    e = new PE(MON);
  ok(h instanceof PE && h instanceof HP && e instanceof PE && !(e instanceof HP), 'a human is a Player entity; a bare entity is not a human');
  ok(h.isPlayer === true && e.isPlayer === true, 'isPlayer (follows Player entity rules) is true on both');
}
const want = ['aimFallback', 'aimTargets', 'autoShakeOn', 'constructor', 'controller', 'dmgTakenScale', 'gainXp', 'netUpdate', 'onHurtFeel', 'onSwitchFeel', 'syncLevel']; // dmgTakenScale: slice 4a (H2); onSwitchFeel: slice 8 (Q8)
const own = Object.getOwnPropertyNames(HP.prototype).sort();
ok(JSON.stringify(own) === JSON.stringify(want), 'HumanPlayer adds only the human parts: ' + own.join(' '));
ok(PE.prototype.gainXp === undefined && PE.prototype.netUpdate === undefined, 'gainXp and the co-op follow are the human only');
{
  const h = new HP(MON),
    e = new PE(MON);
  ok(!('foes' in h) && !('foes' in e), "no foes on a Player entity: G.MoveSim reads foes() as an enemy owner (a gym leader's mon)");
}
ok(['aimTargets', 'aimFallback', 'onHurtFeel', 'hurt', 'update', 'acceptHeading', 'acceptDodge', 'acceptsCast', 'setActive', 'cycle', 'syncLevel'].every((k) => typeof PE.prototype[k] === 'function'), 'the rules stay on the base');
// #43 (LEADER-AI FRAME): the Body only accepts or refuses; its SimPass steps carry the movement out, for every Player entity
ok(['tick', 'overTime', 'cancelDodge', 'startDodge', 'move', 'aim'].every((k) => PE.SimPass && typeof PE.SimPass[k] === 'function'), 'G.PlayerEntity.SimPass holds the movement steps');
ok(PE.DODGE.dist === 150 && PE.DODGE.dur === 0.5 && HP.DODGE.dist === 150, 'DODGE (150 px in 0.5 s) on both classes');
ok(PE.SWAP_LOCK === 0.4 && HP.SWAP_LOCK === 0.4 && PE.BOND_MAX === 4 && HP.BOND_MAX === 4 && PE.REVIVE_TIME === 3 && HP.REVIVE_TIME === 3, 'slot hold 0.4 s, 4 moves per bond, 3 s revive, on both');
ok(PE.xpFor(1) === 7 && HP.xpFor(1) === 7 && PE.xpFor(5) === 91, 'xpFor: 7 to level 2, 91 from 5 to 6, on both');
ok(!['DODGE', 'SWAP_LOCK', 'BOND_MAX', 'REVIVE_TIME', 'xpFor'].some((k) => Object.getOwnPropertyNames(HP).includes(k)), 'the statics live on the base, the human inherits them');

// 2. the human fields: on the human only, with the pre-slice values
const HUMAN = ['magnet', 'itemMagnet', 'xpMul', 'coinMul', 'xp', 'xpNext', 'kills', 'bosses', 'rerollBonus', 'coins', 't1', 't10'];
{
  const e = new PE(MON, { magnetMul: 2, xpMul: 1.5, coinMul: 2, rerolls: 1 }),
    h = new HP(MON),
    hp = new HP(MON, { magnetMul: 2, xpMul: 1.5, coinMul: 2, rerolls: 1 });
  const onBase = HUMAN.filter((k) => Object.prototype.hasOwnProperty.call(e, k));
  ok(!onBase.length, 'a bare Player entity has none of the human fields' + (onBase.length ? ' (has: ' + onBase.join(' ') + ')' : ''));
  const v = HUMAN.map((k) => h[k]).join();
  ok(v === '120,78,1,1,0,7,0,0,0,0,0,0', 'human defaults: magnets 120 and 78, x1 XP and coins, 7 XP to level 2, all counts 0 (' + v + ')');
  ok(hp.magnet === 240 && hp.xpMul === 1.5 && hp.coinMul === 2 && hp.rerollBonus === 1, 'human perks: magnet x2, XP x1.5, coins x2, 1 bought reroll');
  ok(e.level === 1 && h.level === 1 && e.rerolls === 0 && e.maxHp === h.maxHp && e.maxHp > 0, 'level, rerolls used and max HP stay on the base, equal on both');
  ok(e.bonds === 0 && h.bonds === 0, 'links start at 0 on both');
}

// 3. XP and level sync
{
  const h = new HP(MON);
  const lv = h.gainXp(7);
  ok(lv === 1 && h.level === 2 && near(h.xp, 0) && h.xpNext === 19, 'gainXp(7): one level, xp 0, 19 to the next (' + [lv, h.level, h.xp, h.xpNext] + ')');
  const h2 = new HP(MON);
  h2.syncLevel(5);
  ok(h2.level === 5 && h2.xpNext === 91, 'human syncLevel(5): level 5 and 91 XP to the next');
  const e = new PE(MON);
  e.syncLevel(5);
  ok(e.level === 5 && !Object.prototype.hasOwnProperty.call(e, 'xpNext'), 'base syncLevel(5): level 5, no XP field');
  const h3 = new HP(MON),
    m1 = h3.maxHp;
  h3.syncLevel(5);
  ok(h3.maxHp > m1 && h3.hp === h3.maxHp, 'syncLevel raises max HP and keeps the full-HP fraction');
}

// 4. controllers
ok(PE.prototype.controller === PE.IDLE, 'a Player entity defaults to the IDLE controller');
ok(HP.prototype.controller === HP.KEYBOARD, 'the human defaults to the KEYBOARD controller');
{
  const I = PE.IDLE;
  ok(I.axis().join() === '0,0' && !I.dodge() && !I.shake() && I.swapSlot() === -1 && I.swapDir() === 0 && !I.slots().length && !I.cycles().length, 'IDLE presses nothing');
  const K = HP.KEYBOARD,
    with_ = (...k) => (pressed = new Set(k));
  with_();
  ok(K.swapSlot() === -1 && K.swapDir() === 0 && !K.slots().length && !K.cycles().length && !K.shake() && !K.dodge(), 'KEYBOARD with no keys: nothing');
  keyAxis = [0.6, 0.8];
  ok(K.axis() === keyAxis, 'KEYBOARD axis is G.Input.axis()');
  with_('attack_3');
  ok(K.slots().join() === '2', 'attack 3 picks slot index 2');
  with_('attack_1', 'attack_3');
  ok(K.slots().join() === '0,2', 'two attack keys in one frame: both, in key order (as before)');
  with_('cycle_prev');
  ok(K.cycles().join() === '-1', 'cycle previous is -1');
  with_('cycle_next');
  ok(K.cycles().join() === '1', 'cycle next is +1');
  with_('cycle_prev', 'cycle_next');
  ok(K.cycles().join() === '-1,1', 'both cycle keys: previous then next (as before)');
  with_('swap_2');
  ok(K.swapSlot() === 1, 'swap key 2 is slot index 1');
  with_('swap_2', 'swap_5');
  ok(K.swapSlot() === 1, 'two swap keys: the lowest wins (as before)');
  with_('swap_next');
  ok(K.swapDir() === 1, 'swap next is +1');
  with_('swap_prev');
  ok(K.swapDir() === -1, 'swap previous is -1');
  with_('swap_next', 'swap_prev');
  ok(K.swapDir() === 1, 'both swap direction keys: next wins (as before)');
  with_('shake_off');
  ok(K.shake() === true && K.dodge() === false, 'Shake off reads its own key, not the dodge key');
  with_('dodge');
  ok(K.dodge() === true && K.shake() === false, 'dodge reads its own key, not Shake off');
  pressed = new Set();
  keyAxis = [0, 1];
}

// 5. a Player entity on a scripted controller: moves, dodges, never touches input, camera or the hurt sound
{
  const e = speed100(new PE(MON));
  clear();
  e.update(0.05);
  ok(e.x === 0 && e.y === 0 && !rec.input.length, 'IDLE: it stands still and reads no input');
  e.controller = script({ axis: () => [1, 0] });
  clear();
  e.update(0.05);
  ok(near(e.x, 5) && near(e.y, 0), 'scripted axis (1, 0) at 100 px/s for 0.05 s: 5 px right (' + e.x + ', ' + e.y + ')');
  ok(e.walking === true && near(e.moveAngle, 0), 'it walks, heading 0');
  ok(!rec.input.length && !rec.cam.length && !rec.sfx.length, 'no input, camera or sound calls');
  const d = speed100(new PE(MON));
  d.controller = script({ axis: () => [1, 0], dodge: () => true });
  clear();
  d.update(0.05);
  ok(near(d.x, 15), 'scripted dodge: 300 px/s for 0.05 s, 15 px (' + d.x + ')');
  ok(near(d.dodgeT, 0.45) && near(d.r, 2) && d.dodges.cd[0] === 7, 'the dodge runs: 0.45 s left, body at 20%, a charge on its 7 s cooldown');
  ok(!rec.input.length, 'the dodge came from the controller, not the keys');
  const h = speed100(new HP(MON));
  keyAxis = [0, 1];
  clear();
  h.update(0.05);
  ok(near(h.y, 5) && rec.input.includes('axis') && rec.input.includes('dodge'), 'the human with no controller set walks from the keyboard (axis and dodge read)');
}

// 6. aiming
{
  const A = { x: 100, y: 0, dead: false },
    B = { x: 0, y: -100, dead: false };
  const e = new PE(MON);
  e.aimTargets = () => [A];
  ENEMIES = [B];
  e.update(0.05);
  ok(e.target === A && near(e.aim, 0), 'a scripted foe list wins over the enemy list (aims at A, angle 0)');
  const b = new PE(MON);
  b.update(0.05);
  ok(b.target === null && near(b.aim, Math.PI / 2), 'a bare Player entity has no foes and no fallback: no target, aim unchanged');
  const h = new HP(MON);
  h.controller = script();
  h.update(0.05);
  ok(h.target === B && near(h.aim, -Math.PI / 2), 'the human aims at the enemy list (B, angle -90)');
  ENEMIES = [];
  const r = new HP(MON);
  r.controller = script();
  r.update(0.05);
  ok(r.target === ROCK && near(r.aim, Math.PI / 4), 'with no enemies the human aims at the nearest rock or chest (angle 45)');
}

// 7. hurt feedback
{
  const h = new HP(MON),
    hp0 = h.hp;
  clear();
  h.hurt(10, null, true);
  ok(h.hp === hp0 - 10, 'the human takes 10');
  ok(rec.sfx.join() === 'hurt' && rec.cam.join() === '0.28', 'the human: one hurt sound and one 0.28 camera kick (' + rec.sfx + ' / ' + rec.cam + ')');
  const e = new PE(MON),
    e0 = e.hp;
  clear();
  e.hurt(10, null, true);
  ok(e.hp === e0 - 10 && !rec.sfx.length && !rec.cam.length, 'a bare Player entity takes 10 with no sound and no camera kick');
  const bh = new HP(MON),
    b0 = bh.hp;
  bh.benched = true;
  clear();
  bh.hurt(10, null, true);
  ok(bh.hp === b0 - 10 && !rec.sfx.length && !rec.cam.length, 'a benched human takes it silently');
}

// 8. text: the base never reads the keyboard, camera or enemy list; game.js asks the controller; NEED; isPlayer sites
{
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const ps = read('js/entities/player.js'),
    a = ps.indexOf('G.PlayerEntity = class PlayerEntity {'),
    z = ps.indexOf('G.PlayerEntity.IDLE = {'),
    baseBody = strip(ps.slice(a, z));
  ok(a >= 0 && z > a, 'player.js: the base class comes first, then IDLE');
  {
    // #43 done-condition: the body's update holds only acceptance checks and state; the SimPass moves, ticks and aims
    const u0 = baseBody.indexOf('  update(dt) {'),
      upd = baseBody.slice(u0, baseBody.indexOf('\n  }\n', u0)),
      moves = ['G.World', '.x +=', '.y +=', '.svx =', 'G.Status.tick', 'this.hp =', 'aimTargets()', 'dodgeT -='].filter((k) => upd.includes(k));
    ok(u0 >= 0 && !moves.length, "the base update moves, ticks and aims nothing itself (#43)" + (moves.length ? ' (' + moves.join(' ') + ')' : ''));
  }
  const leaks = ['G.Input', 'G.Camera', 'G.EnemyMgr', 'nearestBreakable', "sfx('hurt')"].filter((k) => baseBody.includes(k));
  ok(!leaks.length, 'the base class never reads the keyboard, camera, enemy list, rocks or the hurt sound' + (leaks.length ? ' (' + leaks.join(' ') + ')' : ''));
  ok(/if \(!this\.benched\) \{\s*this\.onHurtFeel\(\);/.test(baseBody), 'hurt calls the hook only while on the field');
  ok(ps.indexOf('G.HumanPlayer = class HumanPlayer extends G.PlayerEntity {') > z, 'HumanPlayer is defined after the base');
  const g = read('js/game.js'),
    body = (name) => {
      const i = g.indexOf(name);
      return i < 0 ? '' : g.slice(i, g.indexOf('\n  }\n', i));
    };
  const hs = strip(body('function handleSwap('));
  ok(hs.length > 100 && !hs.includes('G.Input'), 'handleSwap reads no keys itself');
  // LEADER-AI slice 1: the controller's swap input is read by G.Team.requested, the same for a leader's AI player
  const tm = read('js/systems/team.js');
  ok(/const j = runTeam\.requested\(pl\.controller\);/.test(hs) && /n = c\.swapSlot\(\);/.test(tm) && /const dir = c\.swapDir\(\);/.test(tm), 'handleSwap asks the controller for the slot key and the direction (through G.Team.requested)');
  // #43 step B: the shake is one Player entity step (shakeStep), called by game.js at your swap point
  ok(/pl\.shakeStep\(dt\);/.test(g) && /if \(this\.controller\.shake\(\) && G\.Status\.shake\(this\)\)/.test(ps) && !g.includes("G.Input.action('shake_off')"), 'Shake off asks the controller');
  // LEADER-AI slice 1: the slot and cycle presses are PlayerEntity.takeSlotInput, the same for a leader's AI player
  const pe = read('js/entities/player.js');
  ok(/if \(state !== 'playing' \|\| !pl\) return;\s*(\/\/[^\n]*\n\s*)*pl\.takeSlotInput\(\);\s*\}/.test(g) && /takeSlotInput\(\) \{\s*const c = this\.controller;\s*for \(const i of c\.slots\(\)\) this\.setActive\(i\);\s*for \(const d of c\.cycles\(\)\) this\.cycle\(d\);\s*\}/.test(pe), 'in play, the slot and cycle keys come from the controller, each once, then the handler ends');
  ok(/if \(G\.Input\.action\('attack_' \+ \(i \+ 1\)\)\) G\.RunUI\.itemKey\(i\);/.test(g), 'the menus still read the attack keys themselves (D4)');
  ok(/'Pickups',\s*'PlayerEntity',\s*'Player',/.test(read('js/main.js')), 'the NEED array lists PlayerEntity before Player');
  const count = (t) => (strip(t).match(/\bisPlayer\b/g) || []).length;
  ok(count(read('js/systems/status.js')) === 11, 'status.js: the 11 isPlayer rules are unchanged (' + count(read('js/systems/status.js')) + ')');
  // 3 since slice 4a (H3, Jess 2026-11-06): Fissure's no-KO and the push rule from slice 3, plus applyHit's routing by target
  const fxText = read('js/systems/move-effects.js');
  ok(count(fxText) === 3, 'move-effects.js: 3 isPlayer rules (' + count(fxText) + ')');
  ok(/if \(e\.isPlayer\) return hitPlayer\(inst, e, hop, rng\);/.test(strip(fxText)), 'move-effects.js: the third is the target routing in applyHit (slice 4a, H3)');
  ok(count(ps) === 1 && /this\.isPlayer = true;/.test(baseBody), 'player.js: isPlayer is set once, on the base');
}

console.log(fail ? 'player-entity harness: ' + fail + ' of ' + n + ' checks FAILED' : 'player-entity harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
