// Move schema slice 5b (team-wide cards from fields), offline checks (Node only). Usage from the repo root:
//   node docs/proposals/team-cards-harness.js .
// Under test: js/systems/team-cards.js (the team store, the card field map, the lazy from-scratch fold) and the readers that must use the
// folded def (js/systems/move-sim.js, js/systems/move-render.js). Plan: docs/ASCII Concept Maps/Slice 5b - Build Plan.txt sections 3 and 6;
// rules combat-architecture D4, I2, section C step 3 (Jess 2026-10-31: lazy, one copy per move id). Expected numbers are hand-derived
// from the plan's step table and the move data, never read from the code under test. Parts A and B: sections 1 to 4 (store, fold,
// readers). Parts C to G (Slice 5b - Parts C to G Plan.txt section 3): sections 5 to 9 (Gate and Duration cards, HP Regen and Vitamins,
// the level-up offer, the team sheet summary, the debug set).
// The mutation runner (team-cards-mutate.js) points the TC_* variables (SRC below) at altered copies; every mutation must make this fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/team-cards.js': 'TC_CARDS', 'js/systems/move-sim.js': 'TC_SIM', 'js/systems/move-render.js': 'TC_RENDER', 'js/systems/move-effects.js': 'TC_FX',
  'js/systems/stages.js': 'TC_STAGES', 'js/entities/player.js': 'TC_PLAYER', 'js/systems/levelup.js': 'TC_LEVELUP' };
const pathOf = p => process.env[SRC[p]] || R + '/' + p;
const load = p => vm.runInThisContext(fs.readFileSync(pathOf(p), 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
const DEX_BY = { 1: { name: 'Normie', types: ['normal'], stats: [50, 50, 50, 50, 50, 65] } };
global.window = global; global.location = { search: '?dev' };
let seed = 4242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; Math.random = rnd;
let enemies = [];
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => a + (b - a) * rnd(), randInt: (a, b) => a + Math.floor((b - a + 1) * rnd()),
    pickN: a => a, damp: (a, b) => b, norm: (x, y) => { const n = Math.hypot(x, y) || 1; return [x / n, y / n]; }, dist: (a, b, c, d) => Math.hypot(a - c, b - d),
    dist2: (a, b, c, d) => (a - c) * (a - c) + (b - d) * (b - d), hash: () => 0.5, pick: a => a[0] },
  DEX_BY, DEX: [], FX: { dmgText() {}, spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {} },
  Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, dirFromAngle: () => 0 },
  Weather: { mult: () => 1, speedFor: () => 1, force() {} }, Game: new Proxy({ everyone: () => [] }, { get: (t, k) => (k in t ? t[k] : noop) }),
  Audio: { sfx() {} }, Camera: { kick() {} }, Log: { on: false },
  World: { collide: () => false, isLiquid: () => false, isFree: () => true, projectileBlock: () => null, propsInCircle: () => [] } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
const FILES = ['js/core/stats.js', 'js/data/enemies.js', 'js/data/types.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/player.js',
  'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js',
  'js/data/move-resolver.js', 'js/systems/team-cards.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js'];
for (const p of FILES) { try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } }
G.EnemyMgr = { all: () => enemies, queryCircle(x, y, r) { const o = []; this.queryCircleEach(x, y, r, e => o.push(e)); return o; },
  queryCircleEach(x, y, r, fn) { for (const e of enemies.slice()) if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= (r + e.r) ** 2) fn(e); } };
const REAL = G.MoveDefs, SNAP = JSON.stringify(REAL);
G.MoveDefs = Object.assign({}, REAL);     // synthetic moves go in a copy of the container; the real defs stay frozen (I2)
const TC = G.TeamCards, Sim = G.MoveSim, FX = G.MoveEffects, D = G.MoveDefs, Enemy = G.Enemy; Enemy.prototype.die = function () { this.dead = true; };
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 80) console.log('FAIL', m); } };
const near = (a, b, e = 1e-9) => typeof a === 'number' && Math.abs(a - b) <= e * Math.max(1, Math.abs(b));

// ---- builders ----
let eid = 0;
const mkE = (x, y, o = {}) => { const e = new Enemy({ dex: 1, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'chase' }, x, y, { t: 0, dmg: 1, hp: 1, spd: 1 }, false);
  e.maxHp = e.hp = 1e9; e.id = ++eid; if (!(e.r > 0)) e.r = 10; return Object.assign(e, o); };
const mkP = (groups = [[]], o = {}) => Object.assign(Object.create(G.Player.prototype), { id: 'p1', x: 0, y: 0, r: 12, bodyH: 20, aim: 0, level: 30, cdMul: 1,
  critChance: 0, dead: false, benched: false, stgTeam: {}, stg: null, moveRadiusMul: 1, hp: 500, maxHp: 1000, invuln: 0, flash: 0, dmgReduce: 0, shield: null, mvRoot: false,
  mon: { types: ['normal'] }, inc: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, badge: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, baseSpd: 100, spdMul: 1,
  inLiquid: false, runItems: [], item: null, sashT: -1e9, anim: { play() {} }, slots: groups.map(g => g.map(id => ({ id, t: 0 }))), act: 0,
  activeGroup() { return this.slots[this.act] || []; }, moveFactor(m) { return G.Stats.attackFactor(84, 109, this.level, m, 1.1); }, stabFor() { return false; }, onDealt() {} }, o);
const syn = (id, def) => { D[id] = Object.assign({ id, name: id, type: 'normal', category: 'physical', power: 40, basePower: 40, hitPolicy: 'oncePerInstance' }, def); return id; };
function run(o, es, secs, { dt = 1 / 60, reset = true } = {}) {
  if (es) enemies = es;
  if (reset) Sim.clear();
  Sim.setRng(() => 0.99); Sim.setView(null); Sim.setFilter(() => true);
  const tape = G.SimBus.record(), N = Math.round(secs / dt);
  for (let k = 1; k <= N; k++) { const t = (o.clock = (o.clock || 0) + dt); Sim.tick(dt, o, t); G.Stages.tick(o, dt); G.Stages.teamTick(o.stgTeam, dt); }
  G.SimBus.stopRecording();
  return tape;
}
const castsOf = (tape, id) => tape.filter(t => t.type === 'move:cast' && t.moveId === id);
/** A store with the given picks, in order; and the folded def of `id` for an owner holding it. */
const storeWith = picks => { const s = TC.store(); for (const [c, k] of picks) TC.add(s, c, k || 1); return s; };
const F = (id, picks) => TC.defOf({ teamCards: storeWith(picks) }, id);
const card = id => TC.cardOf(id);
const can = (cid, id) => TC.usable(card(cid), D[id]);
const kid = (d, i = 0) => d.payload.filter(fx => fx.t === 'emit')[i];
const timeOf = list => (list.find(e => e.time != null) || {}).time;

// ===== 1. store, identity and G.MoveDefs =====
{ const s = TC.store(), o = { teamCards: s };
  ok(TC.defOf(o, 'ember') === REAL.ember, 'no card picked: defOf returns the frozen def itself');
  ok(TC.defOf({}, 'ember') === REAL.ember && TC.defOf(null, 'ember') === REAL.ember, 'no store: the frozen def');
  ok(TC.add(s, 'damage') === 1 && s.n === 1 && TC.add(s, 'damage', 2) === 3 && s.n === 3 && TC.stacks(s, 'damage') === 3, 'add counts stacks and the cards-picked count');
  ok(s.cache.size === 0, 'lazy: a pick rebuilds nothing');
  const a = TC.defOf(o, 'ember');
  ok(a !== REAL.ember && near(a.basePower, 40 * 1.3) && s.cache.size === 1, 'the first read after a pick folds (40 x 1.3 = 52)');
  ok(TC.defOf(o, 'ember') === a, 'a second read with no new pick is the same object');
  ok(Object.isFrozen(a) && Object.isFrozen(a.space) && Object.isFrozen(a.payload[1]), 'the folded copy is deep-frozen');
  TC.add(s, 'velocity');
  ok(TC.defOf(o, 'tackle').basePower !== undefined && near(TC.defOf(o, 'tackle').basePower, 40 * 1.3), 'a move first read after 4 picks folds with all of them (learned later)');
  const b = TC.defOf(o, 'ember'); ok(b !== a && near(b.delivery.moveSpeed, 310 * 1.15) && near(b.basePower, 52), 'a pick that touches the move refolds it from scratch');
  const t1 = TC.defOf(o, 'tackle'); TC.add(s, 'type:water'); ok(TC.defOf(o, 'tackle') === t1, 'a pick that changes nothing for a move keeps its object (Water Damage on Tackle)');
  const q = { teamCards: s }; ok(TC.defOf(q, 'ember') === TC.defOf(o, 'ember'), 'two Pokemon on one store share one copy per move id');
  ok(F('water-gun', [['type:fire', 3]]) === REAL['water-gun'], 'a card no field of the move takes returns the frozen def (Fire Damage on Water Gun)');
  const syd = syn('tc-swap', { cd: 2 }); const s2 = storeWith([['cooldown']]), o2 = { teamCards: s2 }; const x1 = TC.defOf(o2, syd);
  D[syd] = Object.assign({}, D[syd], { cd: 4 }); ok(near(TC.defOf(o2, syd).cd, 4 / 1.15) && near(x1.cd, 2 / 1.15), 'a different base def under the same id refolds');
  ok(JSON.stringify(REAL) === SNAP && Object.isFrozen(REAL.ember), 'G.MoveDefs unchanged after every pick and fold');
  console.log('1 store, lazy refold, identity'); }

// ===== 2. one row per field card (build plan section 3) =====
{ // Area Up +15%
  let d = F('ember', [['area']]); ok(near(d.space.radRadius, 7 * 1.15), 'Area: a point grows (Ember radRadius 7 to 8.05)');
  d = F('hydro-pump', [['area']]); ok(near(d.space.linLength, REAL['hydro-pump'].space.linLength * 1.15) && d.space.linWidth === REAL['hydro-pump'].space.linWidth, 'Area: beam length, not width');
  d = F('fire-spin', [['area']]); ok(near(d.delivery.orbitRadius, REAL['fire-spin'].delivery.orbitRadius * 1.15) && near(d.space.radRadius, REAL['fire-spin'].space.radRadius * 1.15), 'Area: orbit radius and orb size');
  d = F('heat-wave', [['area', 2]]); ok(near(d.delivery.grow.growSpeed, 625 * 1.3) && near(d.delivery.grow.max, 250 * 1.3), 'Area: a growing radius scales its whole curve (625, 250 x 1.3)');
  d = F('psychic', [['area']]); ok(near(d.delivery.grow.growSpeed, 1.5) && near(d.delivery.grow.max, 2), 'Area: an arc growth is not a size growth');
  d = F('discharge', [['area']]); ok(near(kid(d).move.delivery.grow.max, 220 * 1.15), 'Area: an emitted ring grows too (220 x 1.15)');
  // Presence Up +15%, radArc capped at 360
  d = F('vine-whip', [['presence']]); ok(near(d.space.radArc, 1.3 * 1.15), 'Presence: an arc widens (1.3 x 1.15)');
  d = F('body-slam', [['presence', 20]]); ok(near(d.space.radArc, 6.2832), 'Presence: the arc caps at 360 degrees');
  d = F('hydro-pump', [['presence']]); ok(near(d.space.linWidth, REAL['hydro-pump'].space.linWidth * 1.15), 'Presence: beam width');
  d = F('psychic', [['presence']]); ok(near(d.space.radArc, 0.5 * 1.15) && near(d.delivery.grow.max, 2 * 1.15) && near(d.delivery.grow.growSpeed, 1.5 * 1.15), 'Presence: an arc growth scales');
  ok(!can('presence', 'ember') && !can('presence', 'rock-slide') && !can('presence', 'dazzling-gleam'), 'Presence: never a point, a full circle or a locked arc');
  // Count Up +1, cap +3
  ok(F('ember', [['count']]).space.count === 2 && F('ember', [['count', 5]]).space.count === 4, 'Count: +1 per stack, capped at +3 (Ember 1 to 2, 5 stacks to 4)');
  ok(F('fire-spin', [['count']]).space.count === 4, 'Count: an orbit gets one more orb (3 to 4)');
  ok(kid(F('gust', [['count']])).move.space.count === 4, 'Count: an emitter fan (Gust shots 3 to 4)');
  ok(kid(F('discharge', [['count']])).count === 3 && kid(F('fairy-wind', [['count']])).count === 4, 'Count: emissions spaced in time (Discharge 2 to 3, Fairy Wind 3 to 4)');
  ok(!can('count', 'tackle') && !can('count', 'rock-slide') && !can('count', 'thunderbolt'), 'Count: never one stacked copy, a same-point drop or a locked count');
  // Pierce Up +1, cap +4, never UNLIMITED
  ok(F('ember', [['pierce']]).space.pierce === 1 && F('ember', [['pierce', 6]]).space.pierce === 4, 'Pierce: +1 per stack, capped at +4');
  ok(kid(F('gust', [['pierce']])).move.space.pierce === 1, 'Pierce: emitted shots (Gust 0 to 1)');
  ok(!can('pierce', 'razor-leaf') && !can('pierce', 'aqua-ring') && !can('pierce', 'toxic'), 'Pierce: never UNLIMITED or shapeless');
  // Chain Up +1
  ok(F('thunderbolt', [['chain']]).space.chainHops === 5 && !can('chain', 'ember'), 'Chain: Thunderbolt 4 to 5, only moves that chain');
  // Reach Up +15%: range where it is the reach, and a travelling root's flight time
  d = F('ember', [['reach']]); ok(near(timeOf(d.delivery.endOn), 1.6 * 1.15) && d.delivery.range === undefined, 'Reach: Ember flies 1.6 to 1.84 s');
  d = F('razor-leaf', [['reach']]); ok(near(d.delivery.range, 210 * 1.15) && near(timeOf(d.delivery.endOn), 2 * 1.15), 'Reach: a boomerang turns farther out (210 to 241.5) with a longer cap');
  ok(near(F('rock-slide', [['reach']]).delivery.range, 420 * 1.15) && near(F('quick-attack', [['reach']]).delivery.range, 420 * 1.15), 'Reach: a location pick and a dash');
  ok(!can('reach', 'tackle') && !can('reach', 'toxic-spikes') && !can('reach', 'gust'), 'Reach: not a melee acquisition, a placement at the feet or a static emitter');
  // Delay Down rate 15%, floor 50%
  ok(near(F('rock-slide', [['delay']]).delivery.delay, 0.4 / 1.15) && near(F('rock-slide', [['delay', 30]]).delivery.delay, 0.2), 'Delay: 0.4 / 1.15, floored at half (0.2)');
  ok(!can('delay', 'ember'), 'Delay: only moves with a delay');
  // Velocity Up +15%
  ok(near(F('ember', [['velocity']]).delivery.moveSpeed, 310 * 1.15) && near(F('fire-spin', [['velocity']]).delivery.angularSpeed, REAL['fire-spin'].delivery.angularSpeed * 1.15), 'Velocity: travel and orbit speed');
  ok(near(kid(F('gust', [['velocity']])).move.delivery.moveSpeed, 380 * 1.15), 'Velocity: emitted shots');
  // Time Up +15%: placed things only (Jess, 2026-10-31): never a shot that travels
  ok(near(timeOf(kid(F('toxic', [['time']])).move.delivery.endOn), 0.6 * 1.15), 'Time: a poison puddle lasts 0.6 to 0.69 s');
  d = F('toxic-spikes', [['time']]); ok(near(timeOf(d.delivery.endOn), 3 * 1.15) && near(timeOf(kid(d).move.delivery.endOn), 0.25), 'Time: Toxic Spikes lasts 3.45 s; its uncapped pulse keeps 0.25 s');
  d = F('will-o-wisp', [['time']]); ok(near(timeOf(d.delivery.endOn), 6 * 1.15) && near(timeOf(kid(d).move.delivery.endOn), 1.5), 'Time: the turret lasts 6.9 s; its shots keep 1.5 s');
  ok(!can('time', 'gust') && !can('time', 'fairy-wind') && !can('time', 'meteor-mash'), 'Time: never travelling shots (Gust, Fairy Wind, Meteor Mash)');
  ok(!can('time', 'ember') && !can('time', 'heat-wave') && near(timeOf(F('ember', [['time', 5]]).delivery.endOn), 1.6), 'Time: never a plain move\'s own timer');
  // Cooldown Down rate 15%
  ok(near(F('ember', [['cooldown']]).cd, 0.7 / 1.15), 'Cooldown: cd 0.7 / 1.15');
  d = F('fire-spin', [['cooldown']]); ok(near(d.rehit, REAL['fire-spin'].rehit / 1.15) && d.cd === REAL['fire-spin'].cd, 'Cooldown: a persistent move ticks faster (rehit)');
  d = F('toxic', [['cooldown']]); ok(near(kid(d).move.rehit, 0.25 / 1.15) && near(kid(d).every, 0.1), 'Cooldown: a trail ticks faster but keeps its spacing');
  d = F('will-o-wisp', [['cooldown']]); ok(near(kid(d).every, 0.8 / 1.15) && near(d.cd, 3.5 / 1.15), 'Cooldown: a turret fires faster (absorbs Fire Rate)');
  ok(!can('cooldown', 'swords-dance') && !can('cooldown', 'agility') && !can('cooldown', 'aqua-ring'), 'Cooldown: never a pure buff (Gate Reduction is theirs)');
  // Damage Up +10%, Type +15%, one pool
  ok(near(F('ember', [['damage']]).basePower, 44) && near(F('ember', [['damage'], ['type:fire']]).basePower, 40 * 1.25), 'Damage: 40 to 44; with Fire Damage 40 x 1.25 = 50');
  ok(!can('damage', 'night-shade') && !can('damage', 'swords-dance') && !can('type:fire', 'water-gun'), 'Damage: power > 0; Type: that type only');
  // Knockback Up +20%
  ok(near(F('tackle', [['knockback']]).payload[1].distance, 108) && near(kid(F('gust', [['knockback']])).move.payload[1].distance, 84), 'Knockback: Tackle 90 to 108, Gust shots 70 to 84');
  ok(!can('knockback', 'ember'), 'Knockback: only moves that push');
  // Ailment Chance Up +10 points, cap 100
  ok(F('ember', [['ailment']]).payload[1].chance === 20 && F('ember', [['ailment', 12]]).payload[1].chance === 100, 'Ailment: 10 to 20 points, capped at 100');
  ok(kid(F('discharge', [['ailment']])).move.payload[1].chance === 40, 'Ailment: an emitted ring (30 to 40)');
  ok(!can('ailment', 'fire-spin') && !TC.usable(card('ailment'), F('ember', [['ailment', 9]])), 'Ailment: never at 100 (Fire Spin, Ember after 9 stacks)');
  // Heal Up, Shield Up +15%; Recoil Down rate 15%
  ok(near(F('giga-drain', [['heal']]).payload[1].amount.fraction, 0.5 * 1.15) && near(F('aqua-ring', [['heal']]).payload[0].amount.fraction, 0.0625 * 1.15), 'Heal: drain and aura');
  d = F('substitute', [['shield']]); const sh = d.payload.find(x => x.t === 'shield');
  ok(near(FX.evalFormula(sh.amount, { paid: 100, effect: sh }), 230) && near(FX.evalFormula(sh.max, { paid: 100, effect: sh }), 230), 'Shield: 2 x paid x 1.15 (100 paid to 230)');
  ok(near(F('substitute', [['recoil']]).payload[0].fraction, 0.25 / 1.15), 'Recoil: 0.25 / 1.15');
  { const sd = F('substitute', [['recoil', 3]]), shf = sd.payload.find(x => x.t === 'shield'), paid = 1000 * sd.payload[0].fraction;     // 1000 max HP pays 250 / 1.45
    ok(near(paid, 250 / 1.45) && near(FX.evalFormula(shf.amount, { paid, effect: shf }), 500) && near(FX.evalFormula(shf.max, { paid, effect: shf }), 500), 'Recoil x3: pays 172.4 of 1000 HP, the shield stays 500 (full size)');
    const both = F('substitute', [['recoil'], ['shield']]), sb = both.payload.find(x => x.t === 'shield'), pb = 1000 * both.payload[0].fraction;
    ok(near(FX.evalFormula(sb.amount, { paid: pb, effect: sb }), 500 * 1.15), 'Recoil and Shield Up together: full size x 1.15 (575)'); }
  ok(!can('recoil', 'ember') && !can('shield', 'ember') && !can('heal', 'ember'), 'Heal, Shield, Recoil: only moves that have one');
  // team cards change no move field
  ok(['gate', 'duration', 'regen', 'vitamins'].every(c => Object.keys(REAL).every(id => !can(c, id))), 'Gate, Duration, HP Regen and Vitamins change no move field');
  console.log('2 field cards'); }

// ===== 3. cardLock, eligibility counts, order =====
{ ok(!can('count', 'giga-drain') && !can('pierce', 'giga-drain') && !can('count', 'meteor-mash') && !can('pierce', 'meteor-mash'), 'cardLock: Giga Drain and Meteor Mash (its shots too)');
  ok(F('giga-drain', [['count', 3], ['pierce', 3]]) === REAL['giga-drain'], 'cardLock: locked fields never move');
  const list = c => Object.keys(REAL).filter(id => can(c, id)).sort().join(' ');
  const want = { count: 'aura-sphere bonemerang bubble-beam discharge ember fairy-wind fire-spin gust leaf-storm mud-shot poison-sting razor-leaf rock-throw shadow-ball string-shot water-gun',
    pierce: 'aura-sphere bubble-beam confusion ember fairy-wind gust hex mud-shot poison-sting quick-attack rock-throw shadow-ball sludge string-shot thunder-shock water-gun will-o-wisp',
    time: 'discharge flame-wheel toxic toxic-spikes will-o-wisp', chain: 'hex thunder-shock thunderbolt', delay: 'rock-slide', recoil: 'substitute' };
  for (const c of Object.keys(want)) ok(list(c) === want[c], 'eligible ' + c + ': ' + list(c));
  const picks = [['damage', 2], ['type:fire'], ['area'], ['count'], ['cooldown', 3], ['reach'], ['velocity'], ['ailment']];
  const a = F('ember', picks), b = F('ember', picks.slice().reverse()), c = F('ember', [...picks.slice(3), ...picks.slice(0, 3)]);
  ok(TC.same(a, b) && TC.same(a, c) && a.basePower === b.basePower, 'same stacks in any order give the same def');
  ok(near(F('ember', [['damage'], ['damage']]).basePower, 48), 'from scratch: two Damage Up stacks give 40 x 1.2 = 48');
  console.log('3 cardLock, counts, order'); }

// ===== 4. readers use the folded def =====
{ const s1 = fs.readFileSync(pathOf('js/systems/move-sim.js'), 'utf8'), s2 = fs.readFileSync(pathOf('js/systems/move-render.js'), 'utf8');
  const raw = s => (s.match(/G\.MoveDefs\[/g) || []).length;
  ok(raw(s1) === 1 && /const defOf = \(o, id\) => \(o && o\.teamCards \? G\.TeamCards\.defOf\(o, id\) : G\.MoveDefs\[id\]\);/.test(s1), 'move-sim: the only raw G.MoveDefs read is the defOf fallback');
  ok(raw(s2) === 2 && /slot\.simCd = \(pl\.teamCards \? G\.TeamCards\.defOf\(pl, ev\.moveId\)/.test(s2), 'move-render: the cooldown ring reads the folded cd; the other read is the bolt colour');
  // cast cadence (active slot): 3 Cooldown Down stacks, cd 0.7 / 1.45 = 0.483 s (29 frames) against 0.7 s (42 frames) at 60 fps.
  // Casts land on frames 1, 43, 85, 127, 169 (5 in 180) without, and 1, 30, 59, 88, 117, 146, 175 (7) with.
  const P0 = mkP([['ember']]), P1 = mkP([['ember']], { teamCards: storeWith([['cooldown', 3]]) });
  const t0 = run(P0, [mkE(200, 0)], 3), t1 = run(P1, [mkE(200, 0)], 3);
  const n0 = castsOf(t0, 'ember').length, n1 = castsOf(t1, 'ember').length;
  ok(n0 === 5 && n1 === 7, 'active slot: Cooldown Down x3 casts 5 to 7 times in 3 s (' + n0 + ', ' + n1 + ')');
  // persistent upkeep: a pick that changes the move restarts the live group on the new def
  { const s = TC.store(), P = mkP([['fire-spin']], { teamCards: s });
    run(P, [], 0.5);
    const before = Sim.list().filter(i => i.cast.owner === P && i.spec.id === 'fire-spin');
    TC.add(s, 'count'); TC.add(s, 'area');
    const tape = run(P, null, 1 / 60, { reset: false });
    const after = Sim.list().filter(i => i.cast.owner === P && i.spec.id === 'fire-spin');
    ok(before.length === 3 && after.length === 4, 'persistent: Count Up on a live orbit respawns it with 4 orbs (' + before.length + ' to ' + after.length + ')');
    ok(after.every(i => near(i.spec.delivery.orbitRadius, REAL['fire-spin'].delivery.orbitRadius * 1.15)), 'persistent: the new group rides the folded orbit radius');
    ok(tape.filter(t => t.type === 'move:end' && t.reason === 'notActive').length === 3, 'persistent: the old group ended once');
    TC.add(s, 'type:water');
    const t2 = run(P, null, 0.2, { reset: false });
    ok(!t2.some(t => t.type === 'move:end'), 'persistent: a pick that changes nothing for the move keeps the group running'); }
  // restart costs (Jess 2026-10-31, "apply all three"): the heal keeps its clock, the orbs keep their angle, no cast plays
  { // Aqua Ring, 1/16 max HP every 2 s. Frame order: heal upkeep, then the group's upkeep. The heal is born on frame 1 with a 0 clock and
    // gains 1/60 per later frame, so it ticks on frame 121 (120 / 60 = 2 s). A Heal Up pick after frame 108 must not move that tick
    // (13 frames later), and the tick heals 0.0625 x 1.15 x 1000 = 71.875. Without the fix the clock restarts: 120 frames later.
    const s = TC.store(), P = mkP([['aqua-ring']], { teamCards: s, hp: 100 }), got = [];
    P.heal = v => got.push(v);
    run(P, [], 108 / 60);
    TC.add(s, 'heal');
    let k = 0; while (!got.length && k < 300) { run(P, null, 1 / 60, { reset: false }); k++; }
    ok(k === 13 && near(got[0], 71.875), 'restart: Aqua Ring\'s next heal keeps its clock (13 frames after the pick, got ' + k + ') and heals the new amount (' + got[0] + ')'); }
  { // Fire Spin: each orb sits at phase + angularSpeed x age + 2 pi i / n. A restart carries the lead orb's angle, so on the restart frame
    // every orb is exactly one frame further on, as if nothing happened (Area Up changes the radius, not the count or the speed).
    const s = TC.store(), P = mkP([['fire-spin']], { teamCards: s }), w = REAL['fire-spin'].delivery.angularSpeed / 60;
    const ang = () => Sim.list().filter(i => i.cast.owner === P && i.spec.id === 'fire-spin').sort((a, b) => a.fan - b.fan).map(i => Math.atan2(i.y - P.y, i.x - P.x));
    run(P, [], 47 / 60);
    const a0 = ang(); TC.add(s, 'area');
    const tape = run(P, null, 1 / 60, { reset: false }), a1 = ang();
    const dA = (x, y) => { let d = (y - x) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
    ok(a0.length === 3 && a1.length === 3 && a1.every((a, i) => near(dA(a0[i], a), w, 1e-6)), 'restart: Fire Spin\'s orbs carry on from their angle (each +' + w.toFixed(4) + ' rad, got ' + a1.map((a, i) => dA(a0[i], a).toFixed(4)).join(' ') + ')');
    const c = castsOf(tape, 'fire-spin');
    ok(c.length === 1 && c[0].restart === true, 'restart: the restart cast is marked restart');
    const first = run(mkP([['fire-spin']], { teamCards: TC.store() }), [], 1 / 60);
    ok(castsOf(first, 'fire-spin').length === 1 && castsOf(first, 'fire-spin')[0].restart === false, 'restart: a normal spawn is not marked restart'); }
  { const s2 = fs.readFileSync(pathOf('js/systems/move-render.js'), 'utf8');
    ok(/if \(!pl \|\| ev\.restart \|\| !G\.MoveRoute\.routed\(ev\.moveId\)\) return;/.test(s2), 'restart: the render plays no cast for a restart (no animation, sound or Life Orb cost)'); }
  // a named emitted child folds by its own id
  { const id = syn('tc-named-emit', { space: undefined, delivery: { anchor: 'caster', targeting: 'direction', motion: 'static', endOn: [{ time: 0.3 }] },
      payload: [{ t: 'emit', trigger: 'cast', count: 1, move: 'ember' }], cd: 5 });
    const P = mkP([[id]], { teamCards: storeWith([['pierce', 2]]) });
    run(P, [mkE(300, 0)], 0.1);
    const shots = Sim.list().filter(i => i.cast.owner === P && i.spec.id === 'ember');
    ok(shots.length > 0 && shots.every(i => i.spec.space.pierce === 2), 'emit: a named child (Ember) runs its folded def (pierce 0 to 2, ' + shots.length + ' shots)'); }
  // no store: the sim runs the frozen def (every earlier harness relies on this)
  { const P = mkP([['ember']]); run(P, [mkE(200, 0)], 0.1); ok(Sim.list().filter(i => i.cast.owner === P).every(i => i.spec === REAL.ember), 'no store: instances carry the frozen def'); }
  console.log('4 readers'); }

// ===== 5. Gate Reduction and Duration Increase (part C, COMBAT-RULES:SS10) =====
// Hand-derived: base Gate 6.0 s, Duration 6.1 s, Self-drop Gate x2 (SS7, SS12). Gate Reduction is a rate card, step 0.10, so two stacks
// give 6.0 / 1.2 = 5.0 s (a self drop 12 / 1.2 = 10.0 s). Duration Increase is an inc card, step 0.10, so two stacks give 6.1 x 1.2 = 7.32 s.
{ const S = G.Stages, dt = 1 / 60;
  ok(near(TC.gateMul({}), 1) && near(TC.durOf({}), 6.1) && near(TC.gateMul(null), 1), 'no store: Gate x1 and Duration 6.1 s');
  const two = { teamCards: storeWith([['gate', 2], ['duration', 2]]) };
  ok(near(TC.gateMul(two), 1 / 1.2) && near(TC.durOf(two), 7.32), 'two stacks each: Gate x 1/1.2, Duration 7.32 s');
  ok(near(S.gateOf(false, 1 / 1.2), 5) && near(S.gateOf(true, 1 / 1.2), 10) && near(S.gateOf(false), 6) && near(S.gateOf(true), 12), 'gateOf takes the team multiplier (5 and 10 s; base 6 and 12 s)');
  // Swords Dance (+2 Attack, team scope, a pure buff that casts when its Gate opens)
  const sdAt = (picks, secs) => { const P = mkP([['swords-dance']], picks ? { teamCards: storeWith(picks) } : {}); run(P, [], secs); return S.stage(P, 'atk'); };
  ok(sdAt(null, 5.8) === 2 && sdAt(null, 6.3) === 4 && sdAt(null, 11.8) === 4 && sdAt(null, 12.3) === 6, 'no card: Swords Dance +2 / +4 / +6 at 0 / 6 / 12 s (the 5a timeline)');
  ok(sdAt([['gate', 2]], 4.8) === 2 && sdAt([['gate', 2]], 5.3) === 4 && sdAt([['gate', 2]], 9.8) === 4 && sdAt([['gate', 2]], 10.3) === 6, 'two Gate stacks: Swords Dance +2 / +4 / +6 at 0 / 5 / 10 s');
  // the hold after the last success: one cast at 0 s, swap to an empty slot at 0.1 s (the raise was 1/60 s old when the swap happened)
  const holdAt = (picks, pre, secs) => { const P = mkP([['swords-dance'], []], picks ? { teamCards: storeWith(picks) } : {}); run(P, [], pre); P.act = 1; run(P, null, secs, { reset: false }); return S.stage(P, 'atk'); };
  ok(holdAt(null, 0.1, 5.9) === 2 && holdAt(null, 0.1, 6.2) === 0, 'no card: a raise holds 6.1 s after its first success');
  ok(holdAt([['duration', 2]], 0.1, 7.1) === 2 && holdAt([['duration', 2]], 0.1, 7.4) === 0, 'two Duration stacks: the first success holds 7.32 s');
  // after a climb at 6 s, swap at 6.3 s: Duration left is about 6.1 - 0.28 = 5.82 s (7.32 - 0.28 = 7.04 s with the card)
  ok(holdAt(null, 6.3, 5.6) === 4 && holdAt(null, 6.3, 6.0) === 0, 'no card: a climb refreshes 6.1 s');
  ok(holdAt([['duration', 2]], 6.3, 6.9) === 4 && holdAt([['duration', 2]], 6.3, 7.3) === 0, 'two Duration stacks: a climb refreshes 7.32 s');
  // a self drop (a shapeless self-cast that lowers its own Sp. Atk, Leaf Storm's rule): Self-drop Gate 12 s x 1/1.2 = 10 s, Duration 7.32 s
  const drop = syn('tc-selfdrop', Object.assign(JSON.parse(JSON.stringify(REAL['swords-dance'])), { id: 'tc-selfdrop', payload: [{ t: 'stat', stat: 'spAtk', stages: -2, side: 'self', scope: 'individual' }] }));
  const trkOf = P => S.tracker(P, 'spa', FX.srcOf(D[drop], P), false);
  { const P = mkP([[drop]], { teamCards: storeWith([['gate', 2], ['duration', 2]]) }); run(P, [], dt); const t = trkOf(P);
    ok(t && t.n === -2 && near(t.g, 10, 0.01) && near(t.d, 7.32, 0.01), 'self drop: Gate 10 s and Duration 7.32 s with two stacks each (' + (t && [t.g, t.d].map(v => v.toFixed(3)).join(', ')) + ')'); }
  { const P = mkP([[drop]]); run(P, [], dt); const t = trkOf(P); ok(t && near(t.g, 12, 0.01) && near(t.d, 6.1, 0.01), 'self drop, no card: Gate 12 s, Duration 6.1 s'); }
  // a foe drop our move causes (a copy of Ember whose payload is a guaranteed Speed -1 on the enemy hit): the enemy gets OUR team's timers
  const fd = syn('tc-foedrop', Object.assign(JSON.parse(JSON.stringify(REAL.ember)), { id: 'tc-foedrop', payload: [{ t: 'damage' }, { t: 'stat', stat: 'spd', stages: -1, side: 'foe', scope: 'individual' }] }));
  const foeTrk = picks => { const P = mkP([[fd]], picks ? { teamCards: storeWith(picks) } : {}), e = mkE(60, 0);
    run(P, [e], dt); for (let k = 0; k < 120 && !(e.trk && e.trk.spe); k++) run(P, null, dt, { reset: false });
    const T = e.trk && e.trk.spe; return T ? T[Object.keys(T)[0]] : null; };
  { const a = foeTrk([['gate', 2], ['duration', 2]]), b = foeTrk(null);
    ok(a && near(a.g, 5) && near(a.d, 7.32) && b && near(b.g, 6) && near(b.d, 6.1), 'foe drop: the enemy gets the caster team\'s Gate and Duration (5 / 7.32 s; base 6 / 6.1 s)'); }
  // an enemy-caused change: a direct success with no caster team (the enemy path) keeps the base timers, even on our Pokemon
  { const P = mkP([[]], { teamCards: storeWith([['gate', 3], ['duration', 3]]) }); S.trackOwn(P, 'spe', -1, 'wild-x'); const t = S.tracker(P, 'spe', 'wild-x', false);
    ok(t && near(t.g, 6) && near(t.d, 6.1), 'an enemy-caused change keeps the base Gate and Duration'); }
  // a fizzled pure buff waits one Gate: the team's (SS8 with SS10)
  { const f0 = G.Status.fizzle; G.Status.fizzle = () => true;
    const P = mkP([['swords-dance']], { teamCards: storeWith([['gate', 2]]) }), Q = mkP([['swords-dance']]); run(P, [], dt); run(Q, [], dt);
    G.Status.fizzle = f0;
    ok(near(P.slots[0][0].t, 5) && near(Q.slots[0][0].t, 6), 'a fizzled pure buff waits the team Gate (5 s; 6 s with no card)'); }
  console.log('5 Gate and Duration cards'); }

// ===== 6. HP Regen and Vitamins (part D) =====
{ const s = storeWith([['regen', 2]]);
  const B = mkP([[]], { teamCards: s, hp: 500, maxHp: 1000 }); B.benchUpdate(1);
  ok(near(B.hp, 510), 'HP Regen x2: a benched member regains 2 x 0.5% = 1% of max HP per second (500 to ' + B.hp + ')');
  const C = mkP([[]], { teamCards: s, hp: 995, maxHp: 1000 }); C.benchUpdate(1); ok(near(C.hp, 1000), 'HP Regen stops at max HP');
  const Df = mkP([[]], { teamCards: s, hp: 0, maxHp: 1000, dead: true }); Df.benchUpdate(1); ok(Df.hp === 0, 'HP Regen never heals a fainted member');
  const N = mkP([[]], { hp: 500, maxHp: 1000 }); N.benchUpdate(1); ok(N.hp === 500, 'no store: no regen');
  const src = fs.readFileSync(pathOf('js/entities/player.js'), 'utf8'), at = src.indexOf('  benchUpdate(dt) {'), body = src.slice(at, src.indexOf('\n  }\n', at));
  ok((src.match(/G\.TeamCards\.regen\(/g) || []).length === 1 && body.includes('G.TeamCards.regen('), 'HP Regen is read only in benchUpdate (the active member never regenerates)');
  const v = storeWith([['vitamins:atk', 2]]), A = mkP([[]], { teamCards: v });
  ok(near(A.incOf('atk'), 0.10) && near(A.incOf('def'), 0), 'Vitamins: two Attack picks give +10% Attack and nothing else');
  TC.add(v, 'vitamins:spe'); const later = mkP([[]], { teamCards: v });
  ok(near(later.incOf('spe'), 0.05) && near(later.incOf('atk'), 0.10), 'Vitamins: a member that joins after the picks has them (a team read)');
  ok(near(mkP([[]]).incOf('atk'), 0), 'no store: no Vitamins');
  // HP: refreshMaxHp re-derives max HP from maxHpAt (mainline HP x (1 + bonus)) and tops up the gain; a fainted member is not revived
  const hpP = (o, dead) => { const p = mkP([[]], Object.assign({ baseHpStat: 80, perksHp: 0, level: 30, dead: !!dead }, o)); p.maxHp = p.maxHpAt(30); p.hp = dead ? 0 : p.maxHp - 10; return p; };
  const hs = TC.store(), H1 = hpP({ teamCards: hs }), H2 = hpP({ teamCards: hs }, true), base = G.Stats.hpForLevel(80, 30);
  TC.add(hs, 'vitamins:hp'); H1.refreshMaxHp(); H2.refreshMaxHp();
  ok(H1.maxHp === Math.round(base * 1.05) && H1.hp === H1.maxHp - 10, 'HP Vitamin: max HP x1.05 and the gain tops up current HP (' + H1.maxHp + ')');
  ok(H2.maxHp === H1.maxHp && H2.hp === 0, 'HP Vitamin: a fainted member gets the new max HP but stays at 0 HP');
  console.log('6 HP Regen and Vitamins'); }

// ===== 7. the level-up offer (part E) =====
['js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/systems/levelup.js'].forEach(p => { try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
{ const L = G.LevelUp, ROUTE = G.MoveRoute, COOP = G.Coop;
  G.Coop = { active: false };
  G.MoveRoute = { on: true, routed: id => !!REAL[id] && !!G.Moves.BY_ID[id] };
  const mkT = (ids, o = {}) => { const p = mkP([ids], Object.assign({ maxMoves: 4 }, o)); p.moves = ids.map(id => G.Moves.instance(id)); return p; };
  const flat = (p, roster) => Object.values(L.teamFamilies(p, roster || [p])).flat();
  const s1 = TC.store(), P = mkT(['ember', 'swords-dance'], { teamCards: s1 }), all = flat(P), ids = all.map(c => c.team).filter(Boolean);
  ok(all.length && all.every(c => c.type === 'team' || c.type === 'vitamins' || c.type === 'new'), 'flag on: only team cards, Vitamins and new moves (no legacy mechanic or stat card)');
  const field = all.filter(c => c.type === 'team' && TC.cardOf(c.team).targets);
  ok(field.length && field.every(c => ['ember', 'swords-dance'].some(id => TC.usable(TC.cardOf(c.team), TC.defOf(P, id)))), 'every offered field card has a taker (' + field.map(c => c.team).join(' ') + ')');
  // Ember: a radial shot (count 1, spread 0.12, pierce 0) that travels, power 40, burn 10%; Swords Dance takes no field card
  ok(['area', 'count', 'pierce', 'damage', 'ailment', 'cooldown', 'velocity'].every(k => ids.includes(k)) && !['chain', 'knockback', 'heal', 'shield', 'recoil', 'time', 'delay', 'presence'].some(k => ids.includes(k)),
    'Ember\'s field cards: Area, Count (its fan spreads), Pierce, Damage, Ailment, Cooldown, Velocity; never Chain, Knockback, Heal, Shield, Recoil, Time, Delay, Presence');
  ok(field.filter(c => c.team.startsWith('type:')).map(c => c.team).join() === 'type:fire', 'one Type card, and only a type a team move deals (Fire)');
  { const two = flat(mkT(['ember', 'water-gun'], { teamCards: TC.store() })).filter(c => c.team && c.team.startsWith('type:'));
    ok(two.length === 1 && ['type:fire', 'type:water'].includes(two[0].team), 'two team types: still exactly one Type card per offer (' + two.map(c => c.team) + ')'); }
  ok(ids.includes('gate') && ids.includes('duration'), 'a stat move on the team (Swords Dance): Gate Reduction and Duration Increase offered');
  ok(!ids.includes('regen') && ids.includes('vitamins'), 'a team of one: no HP Regen; Vitamins offered');
  { const Q = mkT(['ember'], { teamCards: TC.store() }), Q2 = mkT(['tackle'], { teamCards: Q.teamCards }), i2 = flat(Q, [Q, Q2]).map(c => c.team);
    ok(!i2.includes('gate') && !i2.includes('duration') && i2.includes('regen'), 'no stat move: no Gate or Duration; two members: HP Regen offered'); }
  { const has = p => flat(p).some(c => c.team === 'count');
    ok(has(mkT(['fire-spin'], { teamCards: TC.store() })) && !has(mkT(['fire-spin'], { teamCards: storeWith([['count', 3]]) })), 'Count Up leaves the pool at its cap (+3)'); }
  { const c = field.find(x => x.team === 'pierce'), n0 = s1.n; c.apply(P);
    ok(s1.n === n0 + 1 && TC.stacks(s1, 'pierce') === 1 && TC.defOf(P, 'ember').space.pierce === 1, 'a field card applies one team stack, and the next read folds it (Ember pierce 0 to 1)'); }
  // Vitamins: Attack / Sp. Atk only with a move of that category (the old Protein / Calcium rule); the harness pickN keeps the list order
  const vOf = p => flat(p).find(c => c.type === 'vitamins');
  ok(vOf(P).options.map(o => o.id).join() === 'hp,def,spa', 'Vitamins, special team (Ember): HP, Defense, Sp. Atk (no Attack)');
  ok(vOf(mkT(['tackle'], { teamCards: TC.store() })).options.map(o => o.id).join() === 'hp,atk,def', 'Vitamins, physical team (Tackle): HP, Attack, Defense');
  ok(vOf(mkT(['swords-dance'], { teamCards: TC.store() })).options.map(o => o.id).join() === 'hp,def,spd', 'Vitamins, status-only team: HP, Defense, Sp. Def (no Attack or Sp. Atk)');
  { const vc = vOf(P); ok(vc.apply(P) === false && !Object.keys(s1.stacks).some(k => k.startsWith('vitamins:')), 'Vitamins: apply with no choice does nothing');
    vc.choice = 'def'; vc.apply(P); ok(TC.stacks(s1, 'vitamins:def') === 1 && near(P.incOf('def'), 0.05), 'Vitamins: the chosen stat gets +5% team-wide'); }
  { const H = mkT(['tackle'], { teamCards: TC.store(), baseHpStat: 80, perksHp: 0, level: 30 }); H.maxHp = H.maxHpAt(30); H.hp = H.maxHp - 10;
    const vc = vOf(H); vc.choice = 'hp'; vc.apply(H);
    ok(H.maxHp === Math.round(G.Stats.hpForLevel(80, 30) * 1.05) && H.hp === H.maxHp - 10, 'Vitamins HP: the pick refreshes every member\'s max HP'); }
  // the 2-buff learn limit on the new path (Jess 2026-10-31, self-only): a buff is a move whose every effect lands on its own side
  ok(['swords-dance', 'agility', 'harden', 'dragon-dance', 'aqua-ring', 'substitute'].every(L.teamBuff), 'self-only buffs: the five stat and heal buffs plus Substitute (recoil and shield)');
  ok(!['string-shot', 'toxic', 'will-o-wisp', 'spikes', 'toxic-spikes', 'night-shade', 'dragon-rage', 'ember', 'gust', 'discharge'].some(L.teamBuff),
    'not buffs: a foe-side effect (String Shot, Toxic, Will-O-Wisp, Spikes, Toxic Spikes, Night Shade, Dragon Rage) or damage (Ember; Gust and Discharge through their children)');
  { const up = { t: 'stat', stat: 'atk', stages: 1, side: 'self', scope: 'team' }, kid = p => ({ t: 'emit', trigger: 'cast', count: 1, move: { payload: p } });
    ok(!TC.selfOnly({ payload: [up, kid([{ t: 'damage' }])] }) && TC.selfOnly({ payload: [up, kid([{ t: 'heal', amount: { of: 'maxHP', fraction: 0.1 } }])] }),
      'self-only test walks emitted children: a damaging child is not a buff, a self-heal child is');
    ok(!TC.selfOnly({ payload: [{ t: 'stat', stat: 'spd', stages: -1, side: 'foe', scope: 'individual' }] }) && !TC.selfOnly({ payload: [] }), 'a lone foe stat drop is not a buff; a move with no effect is not one either'); }
  { const pf = G.Moves.poolFor; G.Moves.poolFor = () => ['agility', 'night-shade', 'ember'];
    const nm = p => (L.teamFamilies(p, [p]).newmove || []).map(c => c.key);
    const two = nm(mkT(['swords-dance', 'harden'], { teamCards: TC.store() })), one = nm(mkT(['swords-dance'], { teamCards: TC.store() }));
    G.Moves.poolFor = pf;
    ok(!two.includes('new:agility') && two.includes('new:night-shade') && two.includes('new:ember') && one.includes('new:agility'), '2-buff limit: with two buffs no third (Agility), Night Shade still offered; with one, Agility offered'); }
  { const o1 = L.offer(mkT(['ember', 'swords-dance'], { teamCards: TC.store() }), 3);
    ok(o1.length === 3 && o1.every(c => c.type === 'team' || c.type === 'vitamins' || c.type === 'new'), 'offer(), flag on: three new-path cards'); }
  G.MoveRoute = { on: false, routed: () => false };
  { const o2 = L.offer(mkT(['ember', 'swords-dance'], { teamCards: TC.store() }), 3);
    ok(o2.length > 0 && o2.every(c => c.type === 'mech' || c.type === 'stat' || c.type === 'new'), 'offer(), flag off: the legacy cards only (' + o2.map(c => c.type).join(' ') + ')'); }
  G.MoveRoute = ROUTE; G.Coop = COOP;
  console.log('7 level-up offer'); }

// ===== 8. the team sheet summary (part F) =====
{ const rows = TC.summary(storeWith([['area', 2], ['cooldown', 1], ['vitamins:atk', 1], ['count', 5], ['regen', 1]])), by = id => rows.find(r => r.id === id) || {};
  ok(rows.length === 5, 'summary: one row per picked card');
  ok(by('area').label === 'Area Up' && by('area').stacks === 2 && by('area').total === '+30%', 'summary: Area Up x2 is +30%');
  ok(by('cooldown').total === '-13%', 'summary: a rate card shows its real cut (1 - 1/1.15 = 13%)');
  ok(by('count').total === '+3 (max)', 'summary: Count Up x5 shows its cap (+3)');
  ok(by('vitamins:atk').label === 'Vitamins: Attack' && by('vitamins:atk').total === '+5%', 'summary: Vitamins names its stat');
  ok(by('regen').total === '+0.5% max HP/s, benched only', 'summary: HP Regen');
  ok(rows[0].family === 'General' && rows[rows.length - 1].family === 'Delivery' && TC.summary(TC.store()).length === 0 && TC.summary(null).length === 0, 'summary: General first; no rows for an empty store');
  const sh = fs.readFileSync(R + '/js/ui/sheet.js', 'utf8');
  ok(sh.includes("[['cards', 'Run Cards']]") && sh.includes('G.TeamCards.summary(pl.teamCards)') && sh.includes('G.MoveRoute.on === true'), 'sheet: a Run Cards tab, flag on only, fed by G.TeamCards.summary');
  console.log('8 team sheet summary'); }

// ===== 9. the debug set (part G) =====
{ const dbg = fs.readFileSync(R + '/js/core/debug.js', 'utf8'), rt = fs.readFileSync(R + '/js/systems/move-route.js', 'utf8');
  const m = dbg.match(/cards: \[([^\]]*)\]/), ids = m ? (m[1].match(/'([^']+)'/g) || []).map(x => x.slice(1, -1)) : [];
  ok(ids.join(' ') === 'ember razor-leaf rock-slide substitute' && ids.every(id => rt.includes("'" + id + "'")), 'debug: the cards set is Ember, Razor Leaf, Rock Slide and Substitute, all routed');
  ok(dbg.includes("|| set === 'cards') {") && dbg.includes('function cards(id, n = 1)') && dbg.includes('hitbox, newcombat, cards };'), 'debug: the cards set gets dummy rings and G.Debug.cards is exported');
  console.log('9 debug set'); }

console.log(fail ? '\nteam-cards harness: ' + fail + ' FAILED of ' + n : '\nteam-cards harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
