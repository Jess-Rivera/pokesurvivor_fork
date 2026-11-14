// Entity model slice 4b: the mainline type chart, true immunity and STAB everywhere (Node only). Usage from the repo root:
//   node docs/proposals/type-chart-harness.js
// Rules (Jess 2026-11-06, docs/COMBAT-RULES.md "Damage" and "Type chart"): x2 / x0.5 / x0 both ways, dual types multiply and clamp to
// [x0.25, x4] unless immune; an immune hit does 0 (it beats the floor of 1), has no side effects and no hurt feedback, shows a grey
// Immune note at most once per 0.5 s per target, and applies on every target class; Power Stone pierces immunity for its type;
// fixed-damage moves check immunity only; STAB 1.5 from every attacker after the +2; the stand-in wild Power is 27; flat damage
// has no STAB; test dummies are typeless. Map: docs/ASCII Concept Maps/Entity Model Slice 4 - Hit Contract and Hard Typing.txt.
// Same engine setup as hit-parity-harness.js (which pins the numbers on every hit path); this file pins the 4b rules. Expected
// values are worked by hand from the rules above, never copied from output. type-chart-mutate.js points the TY_* variables at
// altered copies; every mutation must make this fail.
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const R = path.resolve(__dirname, '..', '..');
const SRC = {
  'js/core/stats.js': 'TY_STATS',
  'js/data/types.js': 'TY_TYPES',
  'js/systems/status.js': 'TY_STATUS',
  'js/entities/enemy.js': 'TY_ENEMY',
  'js/entities/elite.js': 'TY_ELITE',
  'js/entities/player.js': 'TY_PLAYER',
  'js/systems/move-effects.js': 'TY_FX',
  'js/systems/combat.js': 'TY_COMBAT',
  'js/systems/hazards.js': 'TY_HAZARDS',
  'js/entities/boss-ai.js': 'TY_BOSSAI',
  'js/core/debug.js': 'TY_DEBUG',
};
const read = (p) => fs.readFileSync(process.env[SRC[p]] || path.join(R, p), 'utf8');
const load = (p) => vm.runInThisContext(read(p), { filename: p });
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global;
global.location = { search: '?dev' };
let seed = 4242;
Math.random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

// ---------------- the rules, by hand (COMBAT-RULES "Damage", "Type chart"; slice 4b edits K, the flags and TYPE only) ----------------
const K = {
  STAB: 1.5,
  WILD_SCALE: 1.0, // DMG_SCALAR: every target that is not the human
  YOU_SCALE: 0.5, // ENEMY_DMG_SCALAR: the human's damage-taken scale
  CRIT: 1.5,
  PROP_DEF: 50, // a status-category move divides by this, no STAB
  ITEM: 1.2, // Expert Belt on a super-effective hit, a matching type item
  CUSHION: 0.75, // you take less with a melee move active
  REDUCE_CAP: 0.8,
  GUARD: 0.5, // a type-guard berry
  IFRAME: 0.45,
  SASH_IFRAME: 1.2,
  HELMET: (lvl) => 15 + lvl * 4,
};
const LEADER_STAB = true; // slice 4b (H1): a leader's STAB travels in the hit, after the +2 (it was folded into its attack half)
const WILD_STAB = true; // slice 4b (S1): wild contact, shots and hazards carry STAB (they had none)
// Mainline chart rows for the attack types used here (js/data/types.js CHART, 6th gen onward).
const RAW = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
};
// How the live chart maps the mainline values (slice 4b: the mainline values themselves; any immune type makes the hit x0).
const TYPE = { map: { 2: 2, 0.5: 0.5, 0: 0 }, min: 0.25, max: 4 };
const tk = (atk, defTypes) => {
  let m = 1;
  for (const t of defTypes) if (RAW[atk][t] != null) m *= TYPE.map[RAW[atk][t]];
  return m === 0 ? 0 : Math.min(TYPE.max, Math.max(TYPE.min, m));
};
const floor1 = (x) => Math.max(1, x); // the floor of 1 on every hit (COMBAT-RULES "Floor")
const stageMul = (n) => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n)); // mainline stat stage multiplier

// ---------------- species (only the fields the hit paths read) ----------------
const DEX_BY = {
  1: { dex: 1, name: 'Normie', types: ['normal'], stats: [50, 50, 50, 50, 50, 65] },
  2: { dex: 2, name: 'Leafy', types: ['grass', 'poison'], stats: [45, 49, 49, 65, 65, 45] },
  3: { dex: 3, name: 'Rocky', types: ['rock', 'ground'], stats: [40, 80, 100, 30, 30, 20] },
  4: { dex: 4, name: 'Spooky', types: ['ghost', 'poison'], stats: [30, 35, 30, 100, 35, 80] },
  5: { dex: 5, name: 'Flamey', types: ['fire'], stats: [39, 52, 43, 60, 50, 65] },
  6: { dex: 6, name: 'Splashy', types: ['water'], stats: [44, 48, 65, 50, 64, 43] },
  7: { dex: 7, name: 'Birdy', types: ['normal', 'flying'], stats: [40, 45, 40, 35, 35, 56] },
  8: { dex: 8, name: 'Stony', types: ['rock', 'steel'], stats: [50, 50, 100, 50, 50, 30] }, // slice 4b: a x0.25 target for the floor cases
  9: { dex: 9, name: 'Blank', types: ['typeless'], stats: [50, 50, 50, 50, 50, 50] }, // x1 to everything: isolates STAB
  10: { dex: 10, name: 'Pixie', types: ['fairy'], stats: [50, 50, 50, 50, 50, 50] },
  11: { dex: 11, name: 'Drago', types: ['dragon'], stats: [50, 50, 50, 50, 50, 50] },
};

// ---------------- the engine around the hit, stubbed ----------------
const texts = [];
let enemies = [],
  shots = [],
  curPl = null;
const W = {}; // weather multiplier by attack type, per check
const base = {
  DEX_BY,
  DEX: [],
  FX: { dmgText: (x, y, m) => texts.push(String(m)), spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {} },
  Sprites: {
    hasShiny: () => false,
    Animator: class {
      update() {}
      loop() {}
      play() {}
      _start() {}
      busy() {
        return false;
      }
    },
    bodyRadius: () => 10,
    bodyHeight: () => 20,
    hovers: () => false,
    dirFromAngle: () => 0,
    animMeta: () => ({ ay: 40 }),
    PX: 1,
  },
  Weather: { mult: (t) => W[t] || 1, speedFor: () => 1, force() {} },
  Game: new Proxy(
    {
      everyone: () => (curPl ? [curPl] : []),
      get player() {
        return curPl;
      },
    },
    { get: (t, k) => (k in t ? t[k] : noop) }
  ),
  World: {
    collide: () => false,
    isLiquid: () => false,
    isFree: () => true,
    projectileBlock: () => null,
    propsInCircle: () => [],
    liquidEffect: () => ({}),
    nearestBreakable: () => null,
  },
  Gym: { escBump: () => 0, now: () => 0 },
  Elites: { engage() {}, noteDeath() {}, enrageIn: () => 5 },
  Projectiles: { all: () => shots, nearest: () => null },
  Log: { on: false },
  Audio: { sfx() {} },
  Camera: { kick() {}, sees: () => false, shake: 0 },
};
global.G = new Proxy(base, {
  get: (t, k) => (k in t ? t[k] : noop),
  set: (t, k, v) => {
    t[k] = v;
    return true;
  },
});
for (const p of [
  'js/core/util.js',
  'js/core/stats.js',
  'js/data/enemies.js',
  'js/data/types.js',
  'js/systems/status.js',
  'js/systems/stages.js',
  'js/entities/enemy.js',
  'js/entities/elite.js',
  'js/entities/player.js',
  'js/core/simbus.js',
  'js/systems/move-geom.js',
  'js/data/move-attributes.js',
  'js/data/moves-generated.js',
  'js/data/move-overrides.js',
  'js/data/move-handler.js',
  'js/data/move-resolver.js',
  'js/systems/move-sim.js',
  'js/systems/move-effects.js',
  'js/systems/combat.js',
  'js/systems/hazards.js',
]) {
  try {
    load(p);
  } catch (e) {
    console.log('FAIL load ' + p + ': ' + e.message);
    process.exit(1);
  }
}
G.EnemyMgr = {
  all: () => enemies,
  queryCircle: (x, y, r) => enemies.filter((e) => !e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 <= (r + e.r) ** 2),
  queryCircleEach(x, y, r, fn) {
    for (const e of this.queryCircle(x, y, r)) fn(e);
  },
};
G.MoveDefs = Object.assign({}, G.MoveDefs); // the real defs stay frozen (I2); one synthetic melee move for the cushion
G.MoveDefs['syn-melee'] = { id: 'syn-melee', balanceClass: 'melee', type: 'normal', category: 'physical', basePower: 40, payload: [] };
const FX = G.MoveEffects,
  S = G.Stats;
G.Enemy.prototype.die = function () {
  this.dead = true;
};

let fail = 0,
  n = 0;
const ok = (c, m) => {
  n++;
  if (!c) {
    fail++;
    console.log('FAIL ' + m);
  }
};
const near = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
const f3 = (x) => (typeof x === 'number' ? x.toFixed(3) : String(x));

// ---------------- builders ----------------
const SC = { t: 0, dmg: 1, hp: 1, spd: 1 };
const LVL = 20;
let uid = 0;
const prep = (e, o) => {
  e.maxHp = e.hp = 1e6;
  e.atkLvl = LVL;
  e.id = ++uid;
  e.carrier = null;
  e.carrierSec = false;
  if (!(e.r > 0)) e.r = 10;
  return Object.assign(e, o);
};
const mkW = (dex = 1, o = {}) =>
  prep(new G.Enemy({ dex, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'chase' }, 40, 0, SC, false), o);
const mkE = (dex = 1, o = {}) =>
  prep(
    new G.Elite(
      {
        dex,
        baseHp: 50,
        spd: 50,
        dmg: 5,
        xp: 1,
        xpMul: 2,
        behavior: 'chase',
        bx: 64,
        elite: { hp: 500, hpMul: 5, pow: 1.5, xpMul: 3, engagedAt: null, enrage: 1 },
      },
      40,
      0,
      SC
    ),
    o
  );
const mkYou = (dex = 1, o = {}) => {
  const p = new G.HumanPlayer(Object.assign({ hp: 50, spd: 60, atk: 50 }, DEX_BY[dex]));
  p.level = LVL;
  p.maxHp = p.hp = 1e6;
  p.x = p.y = 0;
  p.sashT = -1e12;
  curPl = p;
  return Object.assign(p, o);
};
const mkLeader = (A = 3000, o = {}) =>
  Object.assign(
    {
      id: 'L',
      x: 100,
      y: 0,
      r: 12,
      level: LVL,
      dead: false,
      critChance: 0,
      stgTeam: {},
      types: ['water'],
      foes: () => (curPl ? [curPl] : []),
      moveFactor: () => A,
      stabFor(m) {
        return this.types.includes(m.type); // slice 4b: as the real leader body (boss-ai.js)
      },
      onDealt() {},
      heal() {},
    },
    o
  );
let mid = 0;
const mv = (type, cat, bp, payload = [{ t: 'damage' }]) => ({ id: 'syn-' + ++mid, type, category: cat, basePower: bp, payload });
const hit = (def, target, owner, o = {}) =>
  FX.applyHit(
    { spec: def, cast: { owner, time: o.time || 0 }, x: o.x != null ? o.x : 0, y: 0, age: 0 },
    target,
    o.hop || 0,
    o.rng || (() => 0.99)
  );
const lossOf = (t, fn) => {
  const h0 = t.hp;
  fn();
  return h0 - t.hp;
};
const leaderStab = (o, type) => (LEADER_STAB && o.types.includes(type) ? K.STAB : 1);
const wildStab = (types, type) => (WILD_STAB && types.includes(type) ? K.STAB : 1);

/** Your move on a wild or an Elite, by hand. A is your attacker half (not under test). */
function expWild(you, def, e, opt = {}) {
  const m = { cat: def.category, dmg: def.basePower, type: def.type };
  const A = you.moveFactor(m),
    st = DEX_BY[e.dex].stats;
  const status = def.category === 'status';
  const Dstat = status ? K.PROP_DEF : (def.category === 'special' ? S.spDef(st[4], LVL) : S.defense(st[2], LVL)) * (opt.stage || 1);
  const stab = !status && you.mon.types.includes(def.type) ? K.STAB : 1;
  let k = tk(def.type, e.types) * (W[def.type] || 1);
  if (you.stoneType === def.type) k = Math.max(1, k);
  if (k === 0) return 0; // slice 4b (I1): an immune hit does nothing
  let items = 1;
  if (you.expertBelt && k > 1) items *= K.ITEM;
  if (you.typeBoost === def.type) items *= K.ITEM;
  const crit = opt.crit ? K.CRIT * (you.critDmgMul || 1) : 1;
  const D = (A / Math.max(1, Dstat) + 2) * stab * K.WILD_SCALE;
  return floor1(floor1(D * k * items * crit) * Math.pow(1 - (opt.fall || 0), opt.hop || 0));
}
/** An attack (factor A) on you, by hand. */
function expYou(pl, A, cat, type, opt = {}) {
  const st = pl.mon.stats;
  const defMul = (1 + (opt.inc || 0)) * (opt.stage || 1) * (pl.defItemMul || 1);
  const stat = (cat === 'special' ? S.spDef(st[4], LVL) : S.defense(st[2], LVL)) * defMul;
  let a = (A / Math.max(1, stat) + 2) * (opt.stab || 1) * (opt.scale != null ? opt.scale : K.YOU_SCALE) * (opt.mul || 1);
  if (type && tk(type, pl.mon.types) === 0) return 0; // slice 4b (I1)
  if (type) a *= tk(type, pl.mon.types) * (W[type] || 1) * (opt.guard ? K.GUARD : 1);
  return floor1(a * (1 - Math.min(K.REDUCE_CAP, pl.dmgReduce || 0)) * (opt.cushion ? K.CUSHION : 1));
}
/** A flat hit on you (no attack factor): type chart, reduction, cushion and the floor only. */
function expFlatYou(pl, amount, type) {
  if (type && tk(type, pl.mon.types) === 0) return 0; // slice 4b (I1)
  const a = type ? amount * tk(type, pl.mon.types) * (W[type] || 1) : amount;
  return floor1(a * (1 - Math.min(K.REDUCE_CAP, pl.dmgReduce || 0)));
}
const wipeW = () => {
  for (const k of Object.keys(W)) delete W[k];
};


const typesOfDummy = (d) => DEX_BY[d].types;
const immuneNotes = () => texts.filter((t) => t === 'Immune').length;
const rec = { sfx: [], cam: [] };
G.Audio.sfx = (k) => rec.sfx.push(k);
G.Camera.kick = (k) => rec.cam.push(k);

// 1. the chart numbers
{
  const M = G.Types.mult;
  const cases = [
    ['single super effective (Fire on Grass)', 'fire', ['grass'], 2],
    ['single resisted (Fire on Water)', 'fire', ['water'], 0.5],
    ['single immune (Normal on Ghost)', 'normal', ['ghost'], 0],
    ['neutral (Fire on Normal)', 'fire', ['normal'], 1],
    ['double weakness (Water on Rock/Ground)', 'water', ['rock', 'ground'], 4],
    ['double resist (Fire on Water/Rock)', 'fire', ['water', 'rock'], 0.25],
    ['weak x super (Fighting on Normal/Flying)', 'fighting', ['normal', 'flying'], 1],
    ['immune x weak (Electric on Water/Ground)', 'electric', ['water', 'ground'], 0],
    ['immune x resist (Normal on Ghost/Steel)', 'normal', ['ghost', 'steel'], 0],
    ['a type the chart does not know (Fire on typeless)', 'fire', ['typeless'], 1],
    ['an attack type the chart does not know (typeless on Ghost)', 'typeless', ['ghost'], 1],
    ['Dragon on Fairy', 'dragon', ['fairy'], 0],
    ['Ghost on Normal', 'ghost', ['normal'], 0],
    ['Ground on Flying', 'ground', ['flying'], 0],
  ];
  for (const [name, a, d, want] of cases) ok(M(a, d) === want, 'chart: ' + name + ' is x' + want + ' (game x' + M(a, d) + ')');
  ok(G.Types.MIN === 0.25 && G.Types.MAX === 4 && G.Types.SOFT === undefined, 'chart: the clamp is [x0.25, x4], no softened table');
  ok(G.Types.label(0) === 'immune' && G.Types.label(2) === 'super' && G.Types.label(0.5) === 'weak' && G.Types.label(1) === null, 'chart: labels immune, super, weak, none');
  console.log('1 chart: x2, x0.5, x0, dual x4, x1, x0.25, immunity beats any partner, typeless x1, labels');
}

// 2. STAB everywhere, the wild Power, flat damage without STAB
{
  ok(S.STAB === 1.5 && S.ENEMY_POWER === 27, 'STAB is x1.5, the stand-in wild Power is 27 (S1)');
  const e = mkW(1),
    L = S.levelForTime(0);
  const want = ((2 * L / 5 + 2) * 27 * S.attack(DEX_BY[1].stats[1], L)) / 50;
  ok(near(e.atkFactor, want), 'a wild attack factor uses Power 27: ' + f3(e.atkFactor) + ' want ' + f3(want));
  // wild contact on a typeless you: STAB when the attack type is the attacker's, x1 type
  {
    shots = [];
    const pl = mkYou(9),
      w = mkW(6, { x: 15, y: 0, atkFactor: 2500, atkCat: 'physical', touchCd: 0 });
    enemies = [w];
    const got = lossOf(pl, () => G.Combat.resolve(0.016, pl, 0));
    ok(near(got, expYou(pl, 2500, 'physical', 'water', { stab: K.STAB })), 'wild contact: Water from a Water wild is STAB x1.5 after the +2: ' + f3(got));
    const p2 = mkYou(9),
      w2 = mkW(6, { x: 15, y: 0, atkFactor: 2500, atkCat: 'physical', touchCd: 0, atkType: 'normal' });
    enemies = [w2];
    ok(near(lossOf(p2, () => G.Combat.resolve(0.016, p2, 0)), expYou(p2, 2500, 'physical', 'normal')), 'wild contact: an attack type the wild does not have is not STAB');
    enemies = [];
    const p3 = mkYou(9),
      src = mkW(5);
    shots = [{ x: 0, y: 0, r: 7, atkFactor: 1800, mtype: 'fire', atkCat: 'special', mul: 1, color: '#fff', src }];
    ok(near(lossOf(p3, () => G.Combat.resolve(0.016, p3, 0)), expYou(p3, 1800, 'special', 'fire', { stab: K.STAB })), 'wild shot: Fire from a Fire wild is STAB');
    shots = [];
  }
  {
    G.Hazards.clear();
    const pl = mkYou(9),
      src = mkW(5);
    G.Hazards.add({ kind: 'zone', x: 0, y: 0, r: 30, delay: 0, atkFactor: 2000, atkCat: 'physical', type: 'fire', color: '#f00', src });
    ok(near(lossOf(pl, () => G.Hazards.update(0.016)), expYou(pl, 2000, 'physical', 'fire', { stab: K.STAB })), "hazard: a Fire zone from a Fire wild is STAB");
    G.Hazards.clear();
  }
  // a leader declares STAB like a player: the hit carries it, after the +2
  {
    const pl = mkYou(9),
      L2 = mkLeader(3000, { types: ['water'] });
    ok(near(lossOf(pl, () => hit(mv('water', 'special', 60), pl, L2)), expYou(pl, 3000, 'special', 'water', { stab: K.STAB })), 'leader move: Water from a Water leader is STAB after the +2');
  }
  // flat damage never takes STAB
  {
    const you = mkYou(11),
      e2 = mkW(8);
    ok(lossOf(e2, () => hit(G.MoveDefs['dragon-rage'], e2, you)) === 40, 'Dragon Rage from a Dragon type is 40 flat, no STAB, resistance ignored (Steel)');
    const g = mkYou(4),
      e3 = mkW(3);
    ok(lossOf(e3, () => hit(G.MoveDefs['night-shade'], e3, g)) === LVL, 'Night Shade from a Ghost type is the owner level (' + LVL + '), no STAB');
  }
  console.log('2 STAB: wild contact, shots, hazards, a leader move, all after the +2; Power 27; flat damage has none');
}

// 3. an immune hit on a wild entity or an Elite (I1, I2, I3 = A, I4)
{
  const you = mkYou(1),
    e = mkW(4);
  let fl = 0,
    healed = 0;
  e.applyFlinch = () => {
    fl++;
    return true;
  };
  you.heal = (n) => (healed += n);
  const all = mv('normal', 'physical', 60, [
    { t: 'damage' },
    { t: 'knockback', distance: 100 },
    { t: 'flinch' },
    { t: 'ailment', id: 'burn', side: 'foe' },
    { t: 'stat', stat: 'def', stages: -1, side: 'foe', scope: 'individual' },
    { t: 'heal', amount: { from: 'dealt', fraction: 0.5 } },
  ]);
  texts.length = 0;
  const hp0 = e.hp,
    r = hit(all, e, you);
  ok(r && r.immune === true && r.dmg === 0 && r.dealt === 0 && e.hp === hp0, 'immune: a Normal hit on a Ghost does 0 and says so');
  ok(e.kx === 0 && fl === 0 && e.burn === 0 && G.Stages.stage(e, 'def') === 0 && healed === 0, 'immune: no knockback, flinch, burn, stat drop or drain heal');
  ok(immuneNotes() === 1, 'immune: one grey Immune note (' + immuneNotes() + ')');
  hit(all, e, you);
  ok(immuneNotes() === 1, 'immune: a second hit inside 0.5 s shows no second note');
  G.Status.tick(e, 0.5);
  hit(all, e, you);
  ok(immuneNotes() === 2, 'immune: after 0.5 s the note shows again (' + immuneNotes() + ')');
  const el = mkE(4),
    eh = el.hp;
  ok(hit(mv('normal', 'physical', 60), el, you).immune && el.hp === eh, 'immune: an Elite is immune by the same chart (mainline everywhere, I3)');
  const ps = mkYou(1, { stoneType: 'normal' }),
    e2 = mkW(4);
  ok(lossOf(e2, () => hit(mv('normal', 'physical', 60), e2, ps)) > 0, 'Power Stone: its type still hits an immune target (floored at x1)');
  const e3 = mkW(4);
  hit(mv('normal', 'status', 0, [{ t: 'ailment', id: 'paralysis', side: 'foe' }]), e3, you);
  ok(e3.stMajor && e3.stMajor.k === 'paralysis', 'a pure status move keeps its own immunity rules (Normal paralysis lands on a Ghost)');
  console.log('3 immune on a wild: 0, no side effects, one note per 0.5 s, Elites too, Power Stone pierces, status moves unchanged');
}

// 4. fixed-damage moves check immunity only (I5)
{
  const you = mkYou(1);
  const dr = G.MoveDefs['dragon-rage'],
    ns = G.MoveDefs['night-shade'],
    fi = G.MoveDefs.fissure;
  const f1 = mkW(10),
    f2 = mkW(8);
  ok(lossOf(f1, () => hit(dr, f1, you)) === 0 && lossOf(f2, () => hit(dr, f2, you)) === 40, 'Dragon Rage: 0 on a Fairy, 40 on a Steel (resistance ignored)');
  const n1 = mkW(1),
    n2 = mkW(3);
  ok(lossOf(n1, () => hit(ns, n1, you)) === 0 && lossOf(n2, () => hit(ns, n2, you)) === LVL, 'Night Shade: 0 on a Normal, the level on a Rock');
  const b = mkW(7),
    bh = b.hp;
  hit(fi, b, you, { rng: () => 0.1 });
  ok(b.hp === bh && !b.dead, 'Fissure: no damage and no KO on a Flying');
  const k = mkW(1);
  hit(fi, k, you, { rng: () => 0.1 });
  ok(k.dead === true, 'Fissure: a roll under 30% still KOs a plain Normal wild');
  console.log('4 fixed damage: Dragon Rage, Night Shade, Fissure check immunity only');
}

// 5. an immune hit on you (I1, I2, I4)
{
  const pl = mkYou(4, { item: 'focussash' });
  pl.shield = { v: 10, max: 10, regen: 0, t: 30, dur: 30, overflow: true };
  const sash0 = pl.sashT,
    L = mkLeader(1e7);
  rec.sfx.length = rec.cam.length = 0;
  texts.length = 0;
  const hp0 = pl.hp,
    pm = mv('normal', 'physical', 60, [{ t: 'damage' }, { t: 'ailment', id: 'paralysis', side: 'foe' }]);
  const r = hit(pm, pl, L);
  ok(r.immune && pl.hp === hp0, 'leader move on you, immune: 0 damage');
  ok(pl.invuln === 0 && pl.shield && pl.shield.v === 10 && pl.sashT === sash0, 'leader move on you, immune: no i-frames, Substitute untouched, Focus Sash unused');
  ok(!rec.sfx.includes('hurt') && !rec.cam.length && !pl.stMajor && immuneNotes() === 1, 'leader move on you, immune: no hurt sound or camera kick, no paralysis, one Immune note');
  const c = mkYou(1),
    cr = hit(pm, c, L);
  ok(!cr.immune && c.stMajor && c.stMajor.k === 'paralysis', 'control: the same move on a Normal you lands its paralysis');
  // contact and shots
  {
    shots = [];
    const me = mkYou(4),
      w = mkW(1, { x: 15, y: 0, atkFactor: 2500, atkCat: 'physical', touchCd: 0, carrierSec: true });
    w.secAil = () => 'paralysis';
    enemies = [w];
    const h0 = me.hp;
    G.Combat.resolve(0.016, me, 0);
    ok(me.hp === h0 && me.invuln === 0 && !me.stMajor && near(w.touchCd, 0.55), 'wild contact on you, immune: 0, no i-frames, no carrier ailment (the touch still counts)');
    const ctl = mkYou(1),
      w2 = mkW(1, { x: 15, y: 0, atkFactor: 2500, atkCat: 'physical', touchCd: 0, carrierSec: true });
    w2.secAil = () => 'paralysis';
    enemies = [w2];
    G.Combat.resolve(0.016, ctl, 0);
    ok(ctl.hp < ctl.maxHp && ctl.stMajor && ctl.stMajor.k === 'paralysis', 'control: the same touch on a Normal you hurts and paralyzes');
    enemies = [];
    const me2 = mkYou(4),
      src = mkW(1);
    shots = [{ x: 0, y: 0, r: 7, atkFactor: 1800, mtype: 'normal', atkCat: 'special', mul: 1, color: '#fff', src, ail: 'paralysis' }];
    const s0 = me2.hp;
    G.Combat.resolve(0.016, me2, 0);
    ok(me2.hp === s0 && !me2.stMajor && shots.length === 0, 'wild shot on you, immune: 0, no ailment, the shot is used up');
    shots = [];
  }
  {
    G.Hazards.clear();
    const me = mkYou(4);
    G.Hazards.add({ kind: 'zone', x: 0, y: 0, r: 30, delay: 0, dmg: 20, type: 'normal', color: '#f00' });
    const h0 = me.hp;
    G.Hazards.update(0.016);
    ok(me.hp === h0, 'a flat typed hazard on you, immune: 0 (the floor of 1 does not apply)');
    G.Hazards.clear();
  }
  console.log('5 immune on you: leader moves, contact, shots, flat typed hazards; no feedback, no side effects');
}

// 6. text: the rules live where the plan put them
{
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const body = (src, name) => {
    const i = src.indexOf(name);
    return i < 0 ? '' : src.slice(i, src.indexOf('\n    }\n', i));
  };
  const ba = strip(read('js/entities/boss-ai.js')),
    fac = body(ba, '    factor(m) {');
  ok(fac.length > 50 && !/stab|1\.5/i.test(fac), "boss-ai: the leader factor folds no STAB");
  ok(/e\.stabFor = \(m\) => e\.types\.includes\(m\.type\);/.test(ba), 'boss-ai: the leader body declares STAB with stabFor');
  const cb = strip(read('js/systems/combat.js'));
  ok((cb.match(/stab: stabOf\(/g) || []).length === 2, 'combat.js: contact and shots send STAB by the attacker types');
  const hz = strip(read('js/systems/hazards.js'));
  ok(/h\.src\.types\.includes\(h\.type\) \? G\.Stats\.STAB : 1/.test(hz), 'hazards.js: a hazard is STAB when its type is its source type');
  const fx = strip(read('js/systems/move-effects.js'));
  const flatBody = fx.slice(fx.indexOf('function flat('), fx.indexOf('\n  }\n', fx.indexOf('function flat(')));
  ok(flatBody.length > 50 && !/stab|STAB/.test(flatBody), 'move-effects: flat damage has no STAB');
  const dbg = strip(read('js/core/debug.js'));
  ok((dbg.match(/dummyTypes\(e\);/g) || []).length === 8 && /e\.types = \['typeless'\];/.test(dbg), 'debug.js: all 8 test-dummy spawns are typeless (D-T)');
  console.log('6 text: leader STAB, combat and hazard STAB, flat damage, typeless debug dummies');
}

console.log(fail ? 'type-chart harness: ' + fail + ' of ' + n + ' checks FAILED' : 'type-chart harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
