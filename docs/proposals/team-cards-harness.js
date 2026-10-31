// Move schema slice 5b (team-wide cards from fields), offline checks (Node only). Usage from the repo root:
//   node docs/proposals/team-cards-harness.js .
// Under test: js/systems/team-cards.js (the team store, the card field map, the lazy from-scratch fold) and the readers that must use the
// folded def (js/systems/move-sim.js, js/systems/move-render.js). Plan: docs/ASCII Concept Maps/Slice 5b - Build Plan.txt sections 3 and 6;
// rules combat-architecture D4, I2, section C step 3 (Jess 2026-10-31: lazy, one copy per move id). Expected numbers are hand-derived
// from the plan's step table and the move data, never read from the code under test. Part A and B only (store, fold, readers); the team
// cards (Gate, Duration, HP Regen, Vitamins), the offer and the sheet get their rows when they are built.
// The mutation runner (team-cards-mutate.js) points TC_CARDS, TC_SIM and TC_RENDER at altered copies; every mutation must make this fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/team-cards.js': 'TC_CARDS', 'js/systems/move-sim.js': 'TC_SIM', 'js/systems/move-render.js': 'TC_RENDER', 'js/systems/move-effects.js': 'TC_FX' };
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

console.log(fail ? '\nteam-cards harness: ' + fail + ' FAILED of ' + n : '\nteam-cards harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
