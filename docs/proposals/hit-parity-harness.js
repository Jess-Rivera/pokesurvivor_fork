// Entity model slice 4a, step 1: hit parity (Node only). Usage from the repo root:  node docs/proposals/hit-parity-harness.js
// Pins every number a hit produces TODAY, through entry points that survive slice 4a: G.MoveEffects.applyHit (your moves on a wild
// or an Elite, a leader's move on you), G.Combat.resolve (wild contact and shots on you), G.Hazards.update (hazards on you),
// G.Status.tick (burn and poison on you) and WildEntity.update (burn and poison on a wild). Written BEFORE slice 4a moves anything:
// it must pass on today's code and, unchanged, after 4a. Plan: docs/ASCII Concept Maps/Entity Model Slice 4 - Hit Contract and Hard
// Typing.txt. Expected numbers are worked by hand from docs/COMBAT-RULES.md "Damage": D = (A / max(1, Dstat) + 2) x STAB x scale,
// then type, items, crit, chain falloff, floor of 1. The attacker half A is an input here (slice 4 does not touch it); Dstat comes
// from the G.Stats stat primitives. Every rule constant sits in K, the STAB flags and the type values in RAW / TYPE: slice 4b edits
// those tables and nothing else. Sections 1 to 6 were written first and passed on the pre-4a code (2026-11-06). Sections 7 and 8
// came with the 4a build: they check the new rules and wiring and could not pass before it. hit-parity-mutate.js points the HP_*
// variables (SRC) at altered copies; every mutation must make this fail.
// Slice 4b (Jess 2026-11-06) edits, each deliberate: the TYPE table becomes mainline, LEADER_STAB and WILD_STAB turn on, the
// hand helpers return 0 for an immune hit (I1: immunity beats the floor of 1), the fake leader declares STAB with stabFor (as the
// real leader body now does), and the two floor-of-1 cases move from an immune target (Spooky) to a new x0.25 one (Stony).
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const R = path.resolve(__dirname, '..', '..');
const SRC = {
  'js/core/stats.js': 'HP_STATS',
  'js/data/types.js': 'HP_TYPES',
  'js/systems/status.js': 'HP_STATUS',
  'js/entities/enemy.js': 'HP_ENEMY',
  'js/entities/elite.js': 'HP_ELITE',
  'js/entities/player.js': 'HP_PLAYER',
  'js/systems/move-effects.js': 'HP_FX',
  'js/systems/combat.js': 'HP_COMBAT',
  'js/systems/hazards.js': 'HP_HAZARDS',
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
      strongHost: true,
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

// 1. the chart as the game reads it
{
  for (const a of Object.keys(RAW))
    for (const d of Object.keys(DEX_BY)) {
      const ts = DEX_BY[d].types;
      ok(near(G.Types.mult(a, ts), tk(a, ts)), 'chart: ' + a + ' on ' + ts.join('/') + ' is x' + f3(tk(a, ts)) + ' (game x' + f3(G.Types.mult(a, ts)) + ')');
    }
  ok(G.Types.label(tk('fire', ['grass'])) === 'super' && G.Types.label(tk('fire', ['water'])) === 'weak' && G.Types.label(1) === null, 'chart: super and weak labels');
  console.log('1 chart: 4 attack types x 8 species match the hand table');
}

// 2. your moves on a wild
{
  const cases = [
    ['physical STAB (Normal on Normal)', 1, mv('normal', 'physical', 40), 1],
    ['special STAB, super effective (Fire on Grass/Poison)', 5, mv('fire', 'special', 40), 2],
    ['dual weakness hits the cap (Water on Rock/Ground)', 6, mv('water', 'special', 40), 3],
    ['immune in the chart (Normal on Ghost/Poison)', 1, mv('normal', 'physical', 60), 4],
    ['weak x super (Fighting on Normal/Flying), no STAB', 1, mv('fighting', 'physical', 60), 7],
    ['resisted (Fire on Water)', 5, mv('fire', 'special', 90), 6],
    ['status category: PROP_DEF, no STAB', 1, mv('normal', 'status', 40), 1],
  ];
  for (const [name, yd, def, ed] of cases) {
    const you = mkYou(yd),
      e = mkW(ed);
    const got = lossOf(e, () => hit(def, e, you));
    ok(near(got, expWild(you, def, e)), 'you -> wild, ' + name + ': ' + f3(got) + ' want ' + f3(expWild(you, def, e)));
  }
  // defender stages
  {
    const you = mkYou(1),
      e = mkW(1),
      def = mv('normal', 'physical', 40);
    G.Stages.add(e, 'def', -2, 30);
    ok(near(G.Stages.mul(e, 'def'), stageMul(-2)), 'stages: Def -2 is x0.5 (' + f3(G.Stages.mul(e, 'def')) + ')');
    const got = lossOf(e, () => hit(def, e, you));
    ok(near(got, expWild(you, def, e, { stage: stageMul(-2) })), 'you -> wild, Def -2 halves its Def: ' + f3(got));
    const e2 = mkW(1),
      sp = mv('fire', 'special', 40);
    G.Stages.add(e2, 'spd', 2, 30);
    const g2 = lossOf(e2, () => hit(sp, e2, mkYou(5)));
    ok(near(g2, expWild(curPl, sp, e2, { stage: stageMul(2) })), 'you -> wild, Sp. Def +2 doubles its Sp. Def: ' + f3(g2));
    const e3 = mkW(1),
      g3 = lossOf(e3, () => hit(mv('normal', 'status', 40), e3, mkYou(1)));
    G.Stages.add(e3, 'def', -2, 30);
    const g3b = lossOf(e3, () => hit(mv('normal', 'status', 40), e3, curPl));
    ok(near(g3, g3b), 'you -> wild, a status-category hit ignores the Def stage');
  }
  // crit, items, Power Stone, weather, chain falloff
  {
    const def = mv('normal', 'physical', 40);
    const you = mkYou(1, { critChance: 1, critDmgMul: 1.5 }),
      e = mkW(1);
    const got = lossOf(e, () => hit(def, e, you));
    ok(near(got, expWild(you, def, e, { crit: true })), 'you -> wild, crit x1.5 x Leek 1.5: ' + f3(got));
    const y2 = mkYou(5, { expertBelt: true }),
      e2 = mkW(2),
      fd = mv('fire', 'special', 40);
    ok(near(lossOf(e2, () => hit(fd, e2, y2)), expWild(y2, fd, e2)), 'you -> wild, Expert Belt on a super-effective hit');
    const y2b = mkYou(5, { expertBelt: true }),
      e2b = mkW(6);
    ok(near(lossOf(e2b, () => hit(fd, e2b, y2b)), expWild(y2b, fd, e2b)), 'you -> wild, Expert Belt does nothing on a resisted hit');
    const y3 = mkYou(5, { typeBoost: 'fire' }),
      e3 = mkW(1);
    ok(near(lossOf(e3, () => hit(fd, e3, y3)), expWild(y3, fd, e3)), 'you -> wild, a matching type item x1.2');
    const y4 = mkYou(1, { stoneType: 'normal' }),
      e4 = mkW(4);
    ok(near(lossOf(e4, () => hit(def, e4, y4)), expWild(y4, def, e4)), 'you -> wild, Power Stone floors its type at x1 through the chart');
    W.water = 1.5;
    const y5 = mkYou(6),
      e5 = mkW(5),
      wd = mv('water', 'special', 40);
    ok(near(lossOf(e5, () => hit(wd, e5, y5)), expWild(y5, wd, e5)), 'you -> wild, weather x1.5 on Water');
    wipeW();
    const chain = mv('normal', 'special', 60, [{ t: 'damage' }, { t: 'special', handler: 'chainDamageFalloff', hopReduction: 0.25 }]);
    const y6 = mkYou(1),
      e6 = mkW(1);
    const g6 = lossOf(e6, () => hit(chain, e6, y6, { hop: 2 }));
    ok(near(g6, expWild(y6, chain, e6, { hop: 2, fall: 0.25 })), 'you -> wild, chain hop 2 at 25% falloff (x0.5625): ' + f3(g6));
  }
  // shield, i-frames, floor of 1
  {
    const def = mv('normal', 'physical', 40),
      you = mkYou(1),
      e = mkW(1, { shield: 5 });
    const d = expWild(you, def, e),
      got = lossOf(e, () => hit(def, e, you));
    ok(near(got, d - 5) && e.shield === 0, 'you -> wild, its Substitute takes 5 first: ' + f3(got) + ' want ' + f3(d - 5));
    const e2 = mkW(1, { invuln: 1 });
    ok(lossOf(e2, () => hit(def, e2, you)) === 0, 'you -> wild, its i-frames: the hit misses');
    const weak = mkYou(5, { atkMul: 1e-9 }),
      e3 = mkW(8); // slice 4b: Stony (Normal x0.25, so the floor of 1 acts), since Spooky is now immune
    const g3 = lossOf(e3, () => hit(mv('normal', 'physical', 40), e3, weak));
    ok(near(g3, 1) && near(expWild(weak, mv('normal', 'physical', 40), e3), 1), 'you -> wild, the floor of 1: ' + f3(g3));
  }
  // riders on a wild: knockback every hit, a flinch every hit, burn on its own fields, a push-only move shoves it
  {
    const you = mkYou(1),
      e = mkW(1);
    hit(mv('normal', 'physical', 40, [{ t: 'damage' }, { t: 'knockback', distance: 100 }]), e, you);
    ok(near(e.kx, 100) && near(e.ky, 0), 'you -> wild, knockback 100 away from the hit (' + f3(e.kx) + ', ' + f3(e.ky) + ')');
    const e2 = mkW(1);
    let fl = 0;
    e2.applyFlinch = () => {
      fl++;
      return true;
    };
    const fd = mv('normal', 'physical', 40, [{ t: 'damage' }, { t: 'flinch' }]);
    hit(fd, e2, you);
    hit(fd, e2, you);
    ok(fl === 2, 'you -> wild, a flinch on every hit (' + fl + ')');
    const e3 = mkW(1);
    hit(mv('normal', 'physical', 40, [{ t: 'damage' }, { t: 'ailment', id: 'burn', side: 'foe' }]), e3, you);
    ok(e3.burn === 1 && !e3.stDot, 'you -> wild, burn lands on its own burn field');
    const e4 = mkW(1),
      g4 = lossOf(e4, () => hit(mv('normal', 'status', 0, [{ t: 'knockback', distance: 140 }]), e4, you));
    ok(near(e4.kx, 140) && g4 === 0, 'you -> wild, a push-only move shoves it 140 and deals nothing');
  }
  // an Elite takes the wild defense and no knockback
  {
    const you = mkYou(1),
      el = mkE(1),
      def = mv('normal', 'physical', 40, [{ t: 'damage' }, { t: 'knockback', distance: 100 }]);
    ok(el instanceof G.Elite && el instanceof G.WildEntity, 'Elite fixture is an Elite');
    const got = lossOf(el, () => hit(def, el, you));
    ok(near(got, expWild(you, def, el)), 'you -> Elite, the wild defense: ' + f3(got));
    ok(el.kx === 0, 'you -> Elite, no knockback');
  }
  console.log('2 you -> wild: physical, special, status, STAB, chart, stages, crit, items, Power Stone, weather, chain, shield, floor, riders, Elite');
}

// 3. a gym leader's move on you
{
  const L = mkLeader(3000),
    cases = [
      ['physical (Normal on Normal)', 1, mv('normal', 'physical', 40)],
      ['special super effective (Water on Fire)', 5, mv('water', 'special', 60)],
      ['special resisted (Water on Grass/Poison)', 2, mv('water', 'special', 60)],
      ['immune in the chart (Normal on Ghost/Poison)', 4, mv('normal', 'physical', 60)],
      ['dual weakness (Water on Rock/Ground)', 3, mv('water', 'special', 60)],
    ];
  for (const [name, yd, def] of cases) {
    const pl = mkYou(yd),
      want = expYou(pl, 3000, def.category, def.type, { stab: leaderStab(L, def.type) });
    const got = lossOf(pl, () => hit(def, pl, L));
    ok(near(got, want), 'leader -> you, ' + name + ': ' + f3(got) + ' want ' + f3(want));
  }
  const nd = mv('normal', 'physical', 40),
    wd = mv('water', 'special', 60);
  {
    const pl = mkYou(1),
      Lc = mkLeader(3000, { critChance: 1 });
    ok(near(lossOf(pl, () => hit(nd, pl, Lc)), expYou(pl, 3000, 'physical', 'normal', { mul: K.CRIT })), 'leader -> you, a crit x1.5 after your defense');
  }
  {
    const pl = mkYou(1);
    pl.inc.def = 0.2;
    ok(near(lossOf(pl, () => hit(nd, pl, L)), expYou(pl, 3000, 'physical', 'normal', { inc: 0.2 })), 'leader -> you, Iron +20% Def');
  }
  {
    const pl = mkYou(1);
    G.Stages.add(pl, 'def', 2, 30);
    ok(near(lossOf(pl, () => hit(nd, pl, L)), expYou(pl, 3000, 'physical', 'normal', { stage: stageMul(2) })), 'leader -> you, your Def +2');
  }
  {
    const pl = mkYou(1);
    pl.slots = [[{ id: 'syn-melee' }]];
    pl.active = 0;
    ok(near(lossOf(pl, () => hit(nd, pl, L)), expYou(pl, 3000, 'physical', 'normal', { cushion: true })), 'leader -> you, the melee cushion x0.75');
  }
  {
    const pl = mkYou(1, { dmgReduce: 0.9 });
    ok(near(lossOf(pl, () => hit(nd, pl, L)), expYou(pl, 3000, 'physical', 'normal')), 'leader -> you, damage reduction capped at 80%');
  }
  {
    W.water = 1.5;
    const pl = mkYou(5);
    ok(near(lossOf(pl, () => hit(wd, pl, L)), expYou(pl, 3000, 'special', 'water', { stab: leaderStab(L, 'water') })), 'leader -> you, weather x1.5');
    wipeW();
  }
  {
    const pl = mkYou(5);
    pl.stgTeam = { guard_water: [{ n: 1, t: 10, dur: 10, src: 'berry' }] };
    ok(near(lossOf(pl, () => hit(wd, pl, L)), expYou(pl, 3000, 'special', 'water', { stab: leaderStab(L, 'water'), guard: true })), 'leader -> you, a type-guard berry halves a super-effective hit');
    const p2 = mkYou(1);
    p2.stgTeam = { guard_normal: [{ n: 1, t: 10, dur: 10, src: 'berry' }] };
    ok(near(lossOf(p2, () => hit(nd, p2, L)), expYou(p2, 3000, 'physical', 'normal', { guard: true })), 'leader -> you, Chilan halves every Normal hit');
  }
  {
    const pl = mkYou(1);
    // Substitute as G.MoveEffects builds it: overflow on unless the move says false (move-effects.js applyCast shield)
    pl.shield = { v: 10, max: 10, regen: 0, t: 30, dur: 30, overflow: true };
    const d = expYou(pl, 3000, 'physical', 'normal'),
      got = lossOf(pl, () => hit(nd, pl, L));
    ok(near(got, d - 10) && !pl.shield, 'leader -> you, Substitute takes 10, the rest spills: ' + f3(got) + ' want ' + f3(d - 10));
    const p2 = mkYou(1);
    p2.shield = { v: 10, max: 10, regen: 0, t: 30, dur: 30, overflow: false };
    const g2 = lossOf(p2, () => hit(nd, p2, L));
    ok(g2 === 0 && !p2.shield && p2.invuln === 0, 'leader -> you, a shield with overflow off eats the whole hit and breaks, no i-frames');
  }
  {
    const pl = mkYou(1);
    hit(nd, pl, L);
    ok(near(pl.invuln, K.IFRAME), 'leader -> you, 0.45 s i-frames after a hit (' + f3(pl.invuln) + ')');
    ok(lossOf(pl, () => hit(nd, pl, L)) === 0, 'leader -> you, a second hit inside the i-frames misses');
  }
  {
    const pl = mkYou(1, { item: 'focussash' });
    pl.hp = 5;
    hit(nd, pl, mkLeader(1e7));
    ok(pl.hp === 1 && !pl.dead && near(pl.invuln, K.SASH_IFRAME), 'leader -> you, Focus Sash holds at 1 HP with 1.2 s i-frames');
  }
  {
    const pl = mkYou(1, { flyT: 1 });
    ok(lossOf(pl, () => hit(nd, pl, L)) === 0, 'leader -> you, in the air (Fly) the hit misses');
  }
  {
    const pl = mkYou(8); // slice 4b: Stony (Normal x0.25, so the floor of 1 acts), since Spooky is now immune
    const got = lossOf(pl, () => hit(nd, pl, mkLeader(1e-9)));
    ok(near(got, 1) && near(expYou(pl, 1e-9, 'physical', 'normal'), 1), 'leader -> you, the floor of 1: ' + f3(got));
  }
  // riders on you: a flinch at most every 0.5 s per move, only push moves move you, burn on your DoT, paralysis through G.Status
  {
    const pl = mkYou(1);
    let fl = 0;
    pl.applyFlinch = () => {
      fl++;
      return true;
    };
    const fd = mv('normal', 'physical', 40, [{ t: 'damage' }, { t: 'flinch' }]);
    hit(fd, pl, L, { time: 0 });
    hit(fd, pl, L, { time: 0.2 });
    ok(fl === 1, 'leader -> you, a second flinch inside 0.5 s does not roll (' + fl + ')');
    hit(fd, pl, L, { time: 0.6 });
    ok(fl === 2, 'leader -> you, a flinch after 0.5 s rolls again (' + fl + ')');
    const p2 = mkYou(1);
    hit(mv('normal', 'physical', 40, [{ t: 'damage' }, { t: 'knockback', distance: 100 }]), p2, L);
    ok(!p2.stPush, 'leader -> you, a damaging hit never knocks you back');
    const p3 = mkYou(1);
    hit(mv('normal', 'status', 0, [{ t: 'knockback', distance: 140 }]), p3, L, { x: 100 });
    ok(p3.stPush && near(p3.stPush.vx, -700) && near(p3.stPush.vy, 0), 'leader -> you, a push-only move slides you 140 px in 0.2 s, away from it');
    const p4 = mkYou(1);
    hit(mv('normal', 'physical', 40, [{ t: 'damage' }, { t: 'ailment', id: 'burn', side: 'foe' }]), p4, L);
    ok(p4.stDot && p4.stDot.k === 'burn' && !p4.burn, 'leader -> you, burn lands on your DoT (G.Status)');
    const p5 = mkYou(1);
    hit(mv('normal', 'status', 0, [{ t: 'ailment', id: 'paralysis', side: 'foe' }]), p5, L);
    ok(p5.stMajor && p5.stMajor.k === 'paralysis', 'leader -> you, paralysis through G.Status');
  }
  console.log('3 leader -> you: physical, special, chart, crit, Iron, stages, cushion, reduction, weather, berries, Substitute, i-frames, Sash, Fly, floor, riders');
}

// 4. wild contact and shots on you (G.Combat.resolve)
{
  {
    shots = [];
    const pl = mkYou(5),
      e = mkW(6, { x: 15, y: 0, atkFactor: 2500, atkCat: 'physical', touchCd: 0 });
    enemies = [e];
    ok(e.atkType === 'water' && e.contactMul() === 1, 'contact fixture: a Water wild, contact x1');
    const want = expYou(pl, 2500, 'physical', 'water', { stab: wildStab(e.types, 'water') });
    const got = lossOf(pl, () => G.Combat.resolve(0.016, pl, 0));
    ok(near(got, want), 'wild contact -> you, Water on Fire: ' + f3(got) + ' want ' + f3(want));
    ok(near(e.touchCd, 0.55) && near(pl.invuln, K.IFRAME), 'wild contact -> you, the 0.55 s contact gap and your i-frames');
  }
  {
    const pl = mkYou(1, { item: 'rockyhelmet' }),
      e = mkW(1, { x: 15, y: 0, atkFactor: 2000, atkCat: 'physical', touchCd: 0 });
    enemies = [e];
    const ge = lossOf(e, () => G.Combat.resolve(0.016, pl, 0));
    ok(near(ge, K.HELMET(LVL)), 'Rocky Helmet: the toucher takes 15 + 4 x level flat (' + f3(ge) + ')');
  }
  {
    const pl = mkYou(1),
      e = mkW(1, { x: 15, y: 0, atkFactor: null, dmg: 12, atkType: 'normal', touchCd: 0 });
    enemies = [e];
    ok(near(lossOf(pl, () => G.Combat.resolve(0.016, pl, 0)), expFlatYou(pl, 12, 'normal')), 'flat contact -> you (no attack factor): the number, typed, no defense');
  }
  {
    enemies = [];
    const pl = mkYou(1),
      src = mkW(1);
    shots = [{ x: 0, y: 0, r: 7, atkFactor: 1800, mtype: 'normal', atkCat: 'special', mul: 1.25, color: '#fff', src }];
    const want = expYou(pl, 1800, 'special', 'normal', { mul: 1.25, stab: wildStab(src.types, 'normal') });
    const got = lossOf(pl, () => G.Combat.resolve(0.016, pl, 0));
    ok(near(got, want) && shots.length === 0, 'wild shot -> you, special with its x1.25: ' + f3(got) + ' want ' + f3(want));
  }
  enemies = [];
  shots = [];
  console.log('4 wild -> you: contact, Rocky Helmet, flat contact, a shot');
}

// 5. hazards on you (G.Hazards.update)
{
  G.Hazards.clear();
  const pl = mkYou(2),
    src = mkW(5);
  G.Hazards.add({ kind: 'zone', x: 0, y: 0, r: 30, delay: 0, atkFactor: 2000, atkCat: 'physical', type: 'fire', color: '#f00', src });
  const want = expYou(pl, 2000, 'physical', 'fire', { stab: wildStab(src.types, 'fire') });
  const got = lossOf(pl, () => G.Hazards.update(0.016));
  ok(near(got, want), 'hazard -> you, a Fire zone on Grass/Poison: ' + f3(got) + ' want ' + f3(want));
  G.Hazards.clear();
  const p2 = mkYou(2);
  G.Hazards.add({ kind: 'zone', x: 0, y: 0, r: 30, delay: 0, dmg: 20, type: 'fire', color: '#f00' });
  ok(near(lossOf(p2, () => G.Hazards.update(0.016)), expFlatYou(p2, 20, 'fire')), 'flat hazard -> you: 20, typed, no defense');
  G.Hazards.clear();
  console.log('5 hazards -> you: an attack-factor zone, a flat zone');
}

// 6. damage over time
{
  const far = { level: 5, x: 3000, y: 0, hp: 100, r: 10, dead: false, spd: 100 };
  const stepW = (e, secs) => {
    for (let i = 0; i < Math.round(secs / 0.05); i++) e.update(0.05, far);
  };
  const stepY = (p, secs) => {
    for (let i = 0; i < Math.round(secs / 0.05); i++) G.Status.tick(p, 0.05);
  };
  {
    const e = mkW(1);
    e.maxHp = e.hp = 1600;
    e.applyBurn(1);
    const g1 = lossOf(e, () => stepW(e, 2.05));
    ok(near(g1, 1600 / 16), 'DoT on a wild: burn 1/16 of max HP per 2 s turn (' + f3(g1) + ')');
    const g4 = lossOf(e, () => stepW(e, 6.5));
    ok(near(g4, 3 * (1600 / 16)) && e.burn === 0, 'DoT on a wild: burn lasts 4 turns (' + f3(g1 + g4) + ' total)');
  }
  {
    const e = mkW(1);
    e.maxHp = e.hp = 1600;
    e.applyPoison(1);
    ok(near(lossOf(e, () => stepW(e, 2.05)), 1600 / 8), 'DoT on a wild: poison 1/8 per turn');
    const t = mkW(1);
    t.maxHp = t.hp = 1600;
    t.applyPoison(2);
    ok(near(lossOf(t, () => stepW(t, 4.05)), 1600 / 16 + 2 * (1600 / 16)), 'DoT on a wild: toxic 1/16 then 2/16');
  }
  {
    const pl = mkYou(1, { invuln: 1 });
    pl.maxHp = pl.hp = 1600;
    ok(G.Status.applyDot(pl, 'burn') === 'ok', 'DoT on you: burn applies');
    const g = lossOf(pl, () => stepY(pl, 2.05));
    ok(near(g, 1600 / 16) && pl.invuln === 1, 'DoT on you: burn 1/16 per turn, through your i-frames, i-frames kept (' + f3(g) + ')');
    const p2 = mkYou(1);
    p2.maxHp = p2.hp = 1600;
    G.Status.applyDot(p2, 'poison');
    ok(near(lossOf(p2, () => stepY(p2, 2.05)), 1600 / 8), 'DoT on you: poison 1/8 per turn');
    const p3 = mkYou(1, { flyT: 1 });
    p3.maxHp = p3.hp = 1600;
    G.Status.applyDot(p3, 'burn');
    ok(near(lossOf(p3, () => stepY(p3, 2.05)), 1600 / 16), 'DoT on you: it still lands in the air (Fly)');
    const p4 = mkYou(1);
    p4.maxHp = p4.hp = 1600;
    p4.shield = { v: 50, max: 50, regen: 0, t: 30, dur: 30, overflow: true };
    G.Status.applyDot(p4, 'burn');
    const g4 = lossOf(p4, () => stepY(p4, 2.05));
    ok(near(g4, 1600 / 16 - 50) && !p4.shield, 'DoT on you: Substitute takes 50 first, the rest spills (' + f3(g4) + ')');
  }
  console.log('6 DoT: burn, poison, toxic on a wild; burn and poison on you, i-frames, Fly, Substitute');
}

// 7. slice 4a: the target picks the side-effect rules (H3) and the damage scale (H2); the attacker's STAB lands after the +2 (H1).
//    These could not pass before 4a: a hit on a Player entity used to be routed by the attacker.
{
  const mkPE = (dex) => {
    const t = new G.PlayerEntity(Object.assign({ hp: 50, spd: 60, atk: 50 }, DEX_BY[dex]));
    t.level = LVL;
    t.maxHp = t.hp = 1e6;
    t.x = 40;
    t.y = 0;
    return t;
  };
  const you = mkYou(1),
    tgt = mkPE(6);
  ok(tgt.dmgTakenScale === K.WILD_SCALE && you.dmgTakenScale === K.YOU_SCALE, 'H2: a Player entity takes x' + tgt.dmgTakenScale + ', the human x' + you.dmgTakenScale);
  const nd = mv('normal', 'physical', 40),
    A = you.moveFactor({ cat: 'physical', dmg: 40, type: 'normal' });
  const want = expYou(tgt, A, 'physical', 'normal', { stab: K.STAB, scale: K.WILD_SCALE });
  const got = lossOf(tgt, () => hit(nd, tgt, you));
  ok(near(got, want), 'you -> a Player entity: its own defense, your STAB after the +2, scale 1.0: ' + f3(got) + ' want ' + f3(want));
  const t2 = mkPE(6);
  let fl = 0;
  t2.applyFlinch = () => {
    fl++;
    return true;
  };
  const rd = mv('normal', 'physical', 40, [{ t: 'damage' }, { t: 'knockback', distance: 100 }, { t: 'flinch' }]);
  hit(rd, t2, you, { time: 0 });
  hit(rd, t2, you, { time: 0.2 });
  ok(fl === 1 && !t2.stPush && !t2.kx, 'you -> a Player entity: its side-effect rules (one flinch per 0.5 s, no knockback from a damaging hit)');
  const t3 = mkPE(6);
  hit(mv('normal', 'physical', 40, [{ t: 'damage' }, { t: 'ailment', id: 'burn', side: 'foe' }]), t3, you);
  ok(t3.stDot && t3.stDot.k === 'burn' && !t3.burn, 'you -> a Player entity: burn lands on its DoT (G.Status), not on wild burn fields');
  const L = mkLeader(3000),
    e = mkW(1),
    wd = mv('water', 'special', 60, [{ t: 'damage' }, { t: 'knockback', distance: 100 }]);
  const gw = lossOf(e, () => hit(wd, e, L));
  const ww = floor1((3000 / Math.max(1, S.spDef(DEX_BY[1].stats[4], LVL)) + 2) * leaderStab(L, 'water') * K.WILD_SCALE * tk('water', ['normal']));
  ok(near(gw, ww) && near(e.kx, 100), 'a leader -> a wild: the wild defense (scale 1.0, its STAB folded) and the wild side effects (knockback 100): ' + f3(gw) + ' want ' + f3(ww));
  console.log('7 slice 4a rules: the target picks the side effects and the scale; your STAB on a Player entity lands after the +2');
}

// 8. slice 4a structure (text and prototypes): who sends hits and DoT through the contract.
{
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const body = (src, name) => {
    const i = src.indexOf(name);
    return i < 0 ? '' : src.slice(i, src.indexOf('\n  }\n', i));
  };
  const fxs = strip(read('js/systems/move-effects.js'));
  const ah = body(fxs, 'function applyHit(');
  ok(/if \(e\.isPlayer\) return hitPlayer\(inst, e, hop, rng\);/.test(ah) && !/owner\.foes/.test(ah), 'applyHit picks the side-effect rules by the target, never the attacker (H3)');
  const hp = body(fxs, 'function hurtPlayer(');
  ok(/pl\.takeHit\(b\);/.test(hp) && !/pl\.hurt\(/.test(hp), 'a move on a Player entity goes through takeHit');
  const cb = strip(read('js/systems/combat.js'));
  ok((cb.match(/pl\.takeHit\(\{/g) || []).length === 2 && !/pl\.hurt\([pe]\.atkFactor/.test(cb), 'combat.js: wild contact and shots go through takeHit');
  const hz = strip(read('js/systems/hazards.js'));
  ok(/pl\.takeHit\(\{ A: h\.atkFactor/.test(hz) && !/pl\.hurt\(h\.atkFactor/.test(hz), 'hazards.js: an attack-factor hazard goes through takeHit');
  const sx = strip(read('js/systems/status.js'));
  ok(/function damage\(h, name, amount, color\) \{\s*if \(h\.takeDot\) h\.takeDot\(name, amount, color\);/.test(sx), 'status.js: DoT damage calls takeDot first (H4)');
  ok((strip(read('js/entities/enemy.js')).match(/this\.takeDot\(/g) || []).length === 2, "enemy.js: a wild entity's burn and poison ticks go through takeDot (H4)");
  ok(typeof G.PlayerEntity.prototype.takeHit === 'function' && typeof G.PlayerEntity.prototype.takeDot === 'function' && typeof G.WildEntity.prototype.takeDot === 'function', 'both families answer takeDot; Player entities answer takeHit');
  const own = (C, k) => Object.prototype.hasOwnProperty.call(C.prototype, k);
  ok(!own(G.Elite, 'takeDot') && !own(G.HumanPlayer, 'takeHit') && !own(G.HumanPlayer, 'takeDot'), 'Elite and the human inherit their family entries, no override');
  const d50 = S.defense(50, 20),
    plain = (1000 / d50 + 2) * K.WILD_SCALE,
    ph = { cat: 'physical' };
  ok(near(S.applyDamage(1000, 50, 50, ph, 20, 1), plain) && near(S.applyDamage(1000, 50, 50, ph, 20, false), plain), 'applyDamage: a stab of 1 or false is no STAB');
  ok(near(S.applyDamage(1000, 50, 50, ph, 20, true), plain * K.STAB) && near(S.applyDamage(1000, 50, 50, ph, 20, K.STAB), plain * K.STAB), 'applyDamage: a stab of true or 1.5 is STAB, after the +2');
  ok(near(S.applyDamage(1000, 50, 50, { cat: 'status' }, 20, K.STAB), (1000 / K.PROP_DEF + 2) * K.WILD_SCALE), 'applyDamage: a status-category hit never takes STAB');
  console.log('8 slice 4a structure: target routing, takeHit and takeDot callers, inheritance, the stab argument');
}

console.log(fail ? 'hit-parity harness: ' + fail + ' of ' + n + ' checks FAILED' : 'hit-parity harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
