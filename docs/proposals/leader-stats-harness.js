// Entity model slice 6: leader stats and cards (Node only). Usage from the repo root:  node docs/proposals/leader-stats-harness.js
// Plan: docs/ASCII Concept Maps/Entity Model Slice 6 - Leader Stats and Cards.txt (approved 2026-11-07).
// Section a (step 0) is the neutral parity case; it passed on the code BEFORE slice 6 moved anything. A plain G.PlayerEntity and a G.GymLeader built from the same inputs (Staryu, level 20, neutral IVs, EVs and nature, no
// cards, no items) must give the same HP before hpMult, the same attack factor before power and enrage, and take the same damage by
// Def and by Sp. Def. Sections b to h (step A): profile, cards, items, restrictions, enrage, validator, card budget.
// Every expected number is worked by hand from COMBAT-RULES "Stats and HP" and "Damage", never read from the code:
//   HP    = round((floor((2 x base + IV + floor(EV / 4)) x L / 100) + L + 10) x HP_SCALAR 2)
//   stat  = floor((2 x base + IV + floor(EV / 4)) x L / 100) + 5, times the nature
//   A     = (2 x L / 5 + 2) x Power x attacker stat / 50
//   taken = (A / defender stat + 2) x STAB x scale (DMG_SCALAR 1 for every Player entity but the human)
// leader-stats-mutate.js (step A) points LS_<FILE> at altered copies.
const fs = require('fs'),
  vm = require('vm'),
  path = require('path');
const R = path.resolve(__dirname, '..', '..');
const SRC = {
  'js/entities/gym-leader.js': 'LS_LEADER',
  'js/entities/player.js': 'LS_PLAYER',
  'js/entities/boss-ai.js': 'LS_BRAIN',
  'js/systems/status.js': 'LS_STATUS',
  'js/systems/move-effects.js': 'LS_FX',
  'js/systems/combat.js': 'LS_COMBAT',
  'js/data/gyms.js': 'LS_GYMS',
  'js/systems/gym.js': 'LS_GYM',
  'js/data/items.js': 'LS_ITEMS',
  'js/ui/hud.js': 'LS_HUD',
};
const read = (p) => fs.readFileSync(process.env[SRC[p]] || path.join(R, p), 'utf8');
const load = (p) => vm.runInThisContext(read(p), { filename: p });
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global;
global.location = { search: '?dev' };
global.document = { querySelectorAll: () => [], getElementById: () => noop, createElement: () => noop, body: noop, addEventListener() {} };
if (!global.performance) global.performance = { now: () => 0 };
let seed = 4242;
Math.random = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

// The same stubs as gym-leader-harness.js: the world, camera, FX and the gym clock (enrage x1 until step A authors it).
const human = { x: 0, y: 300, r: 12, dead: false, hp: 1e6, maxHp: 1e6, bodyH: 20, level: 20, mon: { types: ['typeless'] }, hurts: [], isPlayer: true, invuln: 0 };
human.hurt = (...a) => human.hurts.push(a);
human.takeHit = (b) => human.hurts.push([b]);
human.applyFlinch = () => false;
human.hasItem = () => false;
human.activeGroup = () => [];
const base = {
  U: null,
  Sprites: { Animator: class { update() {} loop() {} play(a) { this.last = a; } busy() { return false; } draw() {} }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, dirFromAngle: () => 0, animMeta: () => ({ ay: 20 }), hasShiny: () => false, drawShadow() {}, PX: 1 },
  FX: { dmgText() {}, spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {}, slash() {} },
  VFX: { forMove: () => ({}) },
  Weather: { mult: () => 1, speedFor: () => 1, force() {} },
  Game: { player: human, everyone: () => [human], evKill() {}, st: { time: 0 } },
  Audio: { sfx() {} },
  Log: { on: false, who: () => null },
  Camera: { kick() {}, sees: () => true, outerRadius: () => 400 },
  Coop: { active: false, isHost: false },
  World: { collide: () => false, isLiquid: () => false, isFree: () => true, projectileBlock: () => null, propsInCircle: () => [], TS: 32 },
  Path: { dirFor: () => null },
  GymArena: { inArena: true, arena: null },
  Hazards: { add: (h) => h },
  Projectiles: { all: () => [], nearest: () => null },
  Drops: { roll() {} },
  Grounds: { berryGuard: () => false },
  Items: {},
  Silver: { kill() {} },
  Progress: { kill() {} },
  Spawner: { xpBoost: () => 1 },
  Elites: { hpFor: () => ({ hp: 2000 }) },
};
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
try {
  load('js/core/util.js');
} catch (e) {
  /* it reads the DOM at the end; G.U is set before that */
}
for (const p of ['js/core/stats.js', 'js/data/species-traits.js', 'js/data/items.js', 'js/data/pokedex.js', 'js/data/types.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/elite.js', 'js/entities/player.js', 'js/entities/player-sim-pass.js', 'js/entities/gym-leader.js', 'js/systems/leader-memory.js', 'js/systems/leader-info.js', 'js/entities/leader-ai.js', 'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/data/moves.js', 'js/systems/team-cards.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js', 'js/data/gyms.js', 'js/entities/boss-ai.js', 'js/systems/combat.js', 'js/systems/gym.js']) {
  try {
    load(p);
  } catch (e) {
    console.log('load failed', p, e.message);
    process.exit(1);
  }
}

// Leader AI slice 2 (#31): this harness predates the AI player's own swap and dodge decisions; they stay off here (leader-ai-harness.js tests them)
if (G.LeaderAI && G.LeaderAI.off) Object.assign(G.LeaderAI.off, { swaps: true, dodges: true, confidence: true, pacing: true, triggers: true }); // and slice 3's (#32)
let fail = 0,
  n = 0;
const ok = (c, m) => {
  n++;
  if (!c) {
    fail++;
    console.log('FAIL ' + m);
  }
};
const near = (a, b, e = 1e-6) => typeof a === 'number' && Math.abs(a - b) <= e * Math.max(1, Math.abs(b));

const STARYU = 120; // Water; base stats 30 HP, 45 Atk, 55 Def, 70 SpA, 55 SpD, 85 Spe
const LEVEL = 20,
  HP_MULT = 26;
const MOVES = [{ id: 'tackle' }, { id: 'water-pulse' }];
function gymOf(o = {}) {
  return Object.assign({ level: LEVEL, loop: 1, leader: 'Misty', badge: 'Cascade Badge', species: 'Staryu', stance: 'far', power: 1, tempo: 1, cards: {}, moves: MOVES.map((m) => Object.assign({}, m)), engagedAt: null, playerEntity: true, hpMult: HP_MULT, restrictions: null }, o);
}
const defOf = (gym) => ({ dex: STARYU, name: 'X', hp: 2000, spd: 100, dmg: 20, xp: 0, behavior: 'chase', shotDmg: 10, shotCd: 1, range: 260, gym });
/** A leader built the game's way (G.Boss.make on a switched gym). */
const leader = (gym = gymOf()) => {
  const e = G.Boss.make(defOf(gym), 0, 0);
  e.active = Math.max(0, e.slots.findIndex((g) => g[0].id !== 'tackle')); // slice 8: off the Tackle slot, so no melee cushion
  return e;
};
/** A plain Player entity from the same inputs: same species, same level, neutral profile, no perks, no cards, no items. Its melee cushion
 *  is turned off by an empty active group, and the leader starts off its Tackle slot (slice 8), since this compares the defender math only. */
function plain(prof = null) {
  const p = new G.PlayerEntity(G.DEX_BY[STARYU], {}, false, prof);
  p.level = LEVEL;
  p.maxHp = p.hp = 1e5; // a pool deep enough that a test hit never faints it (a fresh entity starts at its level 1 HP, 22)
  p.activeGroup = () => [];
  return p;
}

// a. NEUTRAL PARITY (step 0: must pass on today's code)
// a1. HP. Staryu L20: floor(2 x 30 x 20 / 100) = 12; 12 + 20 + 10 = 42; x 2 = 84. Leader: round(84 x 26) = 2184.
{
  const e = leader(),
    p = plain();
  ok(p.maxHpAt(LEVEL) === 84, 'a plain Player entity, Staryu L20, has 84 HP by hand: ' + p.maxHpAt(LEVEL));
  ok(e.maxHp === 2184 && e.hp === 2184, 'the leader has 84 x 26 = 2184: ' + e.maxHp + ' / ' + e.hp);
  ok(e.maxHp === Math.round(p.maxHpAt(LEVEL) * HP_MULT), 'leader HP = plain HP x hpMult, nothing else between them');
}
// a2. Attack factor. Atk stat floor(2 x 45 x 20 / 100) + 5 = 23; SpA stat floor(2 x 70 x 20 / 100) + 5 = 33; (2 x 20 / 5 + 2) = 10.
//     Special, Power 60: 10 x 60 x 33 / 50 = 396. Physical, Power 40: 10 x 40 x 23 / 50 = 184.
{
  const e = leader(),
    p = plain(),
    sp = { id: 'test-special', cat: 'special', dmg: 60, type: 'water' },
    ph = { id: 'test-physical', cat: 'physical', dmg: 40, type: 'normal' },
    playerFormula = (who, m) => G.PlayerEntity.prototype.moveFactor.call(who, m);
  ok(near(p.moveFactor(sp), 396), 'plain special factor 396 by hand: ' + p.moveFactor(sp));
  ok(near(p.moveFactor(ph), 184), 'plain physical factor 184 by hand: ' + p.moveFactor(ph));
  ok(near(e.moveFactor(sp), 396), 'leader special factor (power 1, enrage 1) is 396: ' + e.moveFactor(sp));
  ok(near(e.moveFactor(ph), 184), 'leader physical factor (power 1, enrage 1) is 184: ' + e.moveFactor(ph));
  ok(near(playerFormula(e, sp), 396) && near(playerFormula(e, ph), 184), 'your formula run on the leader gives the same numbers, so the D1 swap is neutral today');
}
// a3. Damage taken. Def stat floor(2 x 55 x 20 / 100) + 5 = 27, Sp. Def the same 27. A = 1000, neutral Normal on Water, no STAB:
//     1000 / 27 + 2 = 39.037..., x DMG_SCALAR 1.
{
  const want = 1000 / 27 + 2;
  for (const cat of ['physical', 'special']) {
    const e = leader(),
      p = plain(),
      he = e.hp,
      hp = p.hp;
    e.takeHit({ A: 1000, cat, type: 'normal', stab: 1 });
    p.takeHit({ A: 1000, cat, type: 'normal', stab: 1 });
    ok(near(he - e.hp, want, 1e-4), 'leader takes ' + want.toFixed(3) + ' by ' + cat + ': ' + (he - e.hp));
    ok(near(hp - p.hp, want, 1e-4), 'plain Player entity takes ' + want.toFixed(3) + ' by ' + cat + ': ' + (hp - p.hp));
  }
}


const T = base.Game.st, // the gym clock (G.Gym.now reads it)
  DT = 1 / 60,
  St = G.Status,
  SPC = { id: 'test-special', cat: 'special', dmg: 60, type: 'water' },
  PHY = { id: 'test-physical', cat: 'physical', dmg: 40, type: 'normal' },
  MISTY = G.Gyms.KANTO.find((g) => g.leader === 'Misty'),
  BROCK = G.Gyms.KANTO.find((g) => g.leader === 'Brock'),
  SURGE = G.Gyms.KANTO.find((g) => g.leader === 'Lt. Surge'); // close-out: the wild-body example (Brock is switched since 2026-11-07)
const clone = (g) => JSON.parse(JSON.stringify(g));
const errs = (g) => G.Gyms.validate(g);
const has = (list, s) => list.some((m) => m.includes(s));
const take = (who, cat) => {
  const h0 = who.hp;
  who.takeHit({ A: 1000, cat, type: 'normal', stab: 1 });
  return h0 - who.hp;
};
const ZERO = [0, 0, 0, 0, 0, 0],
  IV31 = [31, 31, 31, 31, 31, 31];

// b. PROFILE (D3): the same IVs, EVs and nature move a leader and a plain Player entity by the same amount
{
  const prof = { iv: IV31, ev: ZERO, natureUp: 3, natureDown: 1 }; // modest: +Sp. Atk, -Attack
  const e = leader(gymOf({ profile: prof })),
    p = plain(G.Stats.profile(prof));
  // HP: floor((2 x 30 + 31) x 20 / 100) = 18; 18 + 20 + 10 = 48; x 2 = 96; x 26 = 2496
  ok(p.maxHpAt(LEVEL) === 96, 'IV 31: plain HP 96 by hand: ' + p.maxHpAt(LEVEL));
  ok(e.maxHp === 2496, 'IV 31: leader HP 96 x 26 = 2496: ' + e.maxHp);
  // Sp. Atk: floor((140 + 31) x 20 / 100) + 5 = 39, modest x 1.1 rounded down = 42; 10 x 60 x 42 / 50 = 504
  // Attack: floor((90 + 31) x 20 / 100) + 5 = 29, modest x 0.9 rounded down = 26; 10 x 40 x 26 / 50 = 208
  ok(near(e.moveFactor(SPC), 504) && near(p.moveFactor(SPC), 504), 'modest IV 31 special factor 504 on both: ' + e.moveFactor(SPC) + ' / ' + p.moveFactor(SPC));
  ok(near(e.moveFactor(PHY), 208) && near(p.moveFactor(PHY), 208), 'modest IV 31 physical factor 208 on both: ' + e.moveFactor(PHY) + ' / ' + p.moveFactor(PHY));
  // Def and Sp. Def with IV 31: floor((110 + 31) x 20 / 100) + 5 = 33; taken 1000 / 33 + 2
  const want = 1000 / 33 + 2;
  for (const cat of ['physical', 'special']) {
    const a = leader(gymOf({ profile: prof })),
      q = plain(G.Stats.profile(prof));
    ok(near(take(a, cat), want, 1e-4) && near(take(q, cat), want, 1e-4), 'IV 31 defense: both take ' + want.toFixed(3) + ' by ' + cat);
  }
  // EVs: 252 in Sp. Atk is floor(252 / 4) = 63: floor((140 + 63) x 20 / 100) + 5 = 45; 10 x 60 x 45 / 50 = 540
  const ev = { iv: ZERO, ev: [0, 0, 0, 252, 0, 0], natureUp: 0, natureDown: 0 };
  ok(near(leader(gymOf({ profile: ev })).moveFactor(SPC), 540), 'EV 252 Sp. Atk: factor 540');
  // the gym data path: per loop, carried forward, the nature by name
  const sig = { ivs: { 1: IV31, 3: ZERO }, nature: { 1: 'modest' } },
    f1 = G.Gyms.profileFor(sig, 1),
    f2 = G.Gyms.profileFor(sig, 2),
    f3 = G.Gyms.profileFor(sig, 3);
  ok(f1 && f1.iv.join() === IV31.join() && f1.natureUp === 3 && f1.natureDown === 1 && f1.ev.join() === ZERO.join(), 'profileFor loop 1: IV 31, modest');
  ok(!!f2 && !!f3 && f2.iv[0] === 31 && f3.iv[0] === 0 && f3.natureUp === 3, 'profileFor carries forward by loop');
  ok(G.Gyms.profileFor({}, 1) === null, 'a slot with no build is neutral (null)');
}

// c. CARDS (D2, N1, N2)
{
  // c1. the order bug (finding C): HP Up 2 at the Vitamins step 0.05: round(84 x 1.1) = 92; x 26 = 2392
  const e = leader(gymOf({ cards: { 'vitamins:hp': 2 } }));
  ok(e.maxHp === 2392 && e.hp === 2392, 'HP Up 2 counts: 2392 (the cards load before max HP): ' + e.maxHp);
  // c2. Zinc 3: Sp. Def 27 x 1.15 = 31.05; 1000 / 31.05 + 2. Physical stays 1000 / 27 + 2
  const pz = plain();
  pz.teamCards = G.TeamCards.store();
  G.TeamCards.add(pz.teamCards, 'vitamins:spd', 3);
  const zs = 1000 / 31.05 + 2,
    zp = 1000 / 27 + 2;
  ok(near(take(leader(gymOf({ cards: { 'vitamins:spd': 3 } })), 'special'), zs, 1e-4), 'Zinc 3: the leader takes ' + zs.toFixed(3) + ' by special');
  ok(near(take(pz, 'special'), zs, 1e-4), 'Zinc 3: you take the same');
  ok(near(take(leader(gymOf({ cards: { 'vitamins:spd': 3 } })), 'physical'), zp, 1e-4), 'Zinc 3 does nothing for Def');
  // c3. Gate 2 and Duration 2 change her stage timers as yours: Gate x 1 / (1 + 2 x 0.1), Duration 6.1 x (1 + 2 x 0.1)
  const gd = leader(gymOf({ cards: { gate: 2, duration: 2 } })),
    pg = plain();
  pg.teamCards = G.TeamCards.store();
  G.TeamCards.add(pg.teamCards, 'gate', 2);
  G.TeamCards.add(pg.teamCards, 'duration', 2);
  ok(near(G.TeamCards.gateMul(gd), 1 / 1.2) && near(G.TeamCards.gateMul(pg), 1 / 1.2), 'Gate 2: x 0.833 on her and on you');
  ok(near(G.TeamCards.durOf(gd), 6.1 * 1.2) && near(G.TeamCards.durOf(pg), 6.1 * 1.2), 'Duration 2: 7.32 s on her and on you');
  ok(near(G.TeamCards.gateMul(leader()), 1) && near(G.TeamCards.durOf(leader()), 6.1), 'no team cards: the base timers');
  // c4. the validator
  const z = clone(MISTY);
  z.cards[1]['vitamins:spd'] = 3;
  ok(!errs(z).length, 'Misty with Zinc 3 validates: ' + errs(z).join('; '));
  const td = clone(MISTY);
  td.cards[1].gate = 1;
  td.cards[1].duration = 1;
  ok(!errs(td).length, 'Gate and Duration pass on a switched gym (no move fit needed): ' + errs(td).join('; '));
  const rg = clone(MISTY);
  rg.cards[1].regen = 1;
  ok(has(errs(rg), 'regen needs a loop that fields 2+ mons'), 'Regen is rejected at a loop that fields one mon (slice 7b, Q5)');
  const bare = clone(MISTY);
  bare.cards[1].vitamins = 1;
  ok(has(errs(bare), 'name the Vitamins stat'), 'a bare Vitamins card must name its stat');
  const luck = clone(MISTY);
  luck.cards[1]['vitamins:luck'] = 1;
  ok(has(errs(luck), 'unknown card vitamins:luck'), 'a Vitamins stat that does not exist is rejected');
  const wild = clone(SURGE);
  wild.cards = { 1: Object.assign({}, (wild.cards || {})[1], { 'vitamins:spd': 1 }) };
  ok(has(errs(wild), 'is a team card'), 'N1: the wild body still rejects team cards');
}

// d. ITEMS (Q4, N6)
{
  const FIELDS = ['atkMul', 'physMul', 'specMul', 'defItemMul', 'spdMul', 'cdMul', 'dmgReduce', 'moveRadiusMul', 'critChance', 'critDmgMul', 'regenFlat', 'typeBoost', 'expertBelt', 'bigRoot', 'sludgeHurt', 'stoneType'];
  const ref = leader(),
    base0 = FIELDS.map((k) => ref[k]);
  const back = (e) => FIELDS.every((k, i) => (typeof base0[i] === 'number' ? near(e[k], base0[i], 1e-9) : (e[k] || null) === (base0[i] || null)));
  // the reject list and reasons are written here by hand (N6, Q4), never read from the code, so an emptied or shortened list fails
  const ban = {
    amuletcoin: 'human only (coins)',
    luckyegg: 'human only (XP)',
    snowballbadge: 'it counts your kills',
    choiceband: 'a leader cannot honor the move lock',
    choicespecs: 'a leader cannot honor the move lock',
    rockyhelmet: 'Rocky Helmet is bugged',
  };
  ok(Object.keys(G.Gyms.LEADER_ITEM_BAN).sort().join() === Object.keys(ban).sort().join(), 'the code bans exactly these six (slice 7b lifted the four team readers): ' + Object.keys(G.Gyms.LEADER_ITEM_BAN).join());
  let held = 0;
  for (const it of Object.values(G.Items.BY)) {
    if (it.tier !== 'pokemon' || ban[it.id]) continue;
    held++;
    let e = null,
      err = null;
    try {
      e = leader(gymOf({ item: it.id }));
      ok(e.item === it.id && e.hasItem(it.id), it.name + ' is held by the leader');
      e.equip(null);
    } catch (x) {
      err = x.message;
    }
    ok(!err && back(e), it.name + ' equips and unequips on a leader with every stat back exact' + (err ? ': ' + err : ''));
  }
  ok(held > 30, 'the sweep covered the held items: ' + held);
  // Leftovers reads max HP, so it equips after it: 2184 x 0.015 = 32.76
  ok(near(leader(gymOf({ item: 'leftovers' })).regenFlat, 32.76), 'Leftovers: 32.76 HP/s on 2184');
  // Quick Claw after the brain: tempo 2 sets cdMul 1 / 2, then x 0.8 = 0.4
  ok(near(leader(gymOf({ tempo: 2, item: 'quickclaw' })).cdMul, 0.4), 'Quick Claw stacks on the tempo: 0.4');
  ok(leader(gymOf({ item: 'mysticwater' })).typeBoost === 'water', 'Mystic Water boosts Water');
  // Wise Glasses (special x 1.1) reaches her factor now that it is your formula (D1): 396 x 1.1
  ok(near(leader(gymOf({ item: 'wiseglasses' })).moveFactor(SPC), 396 * 1.1), 'Wise Glasses: special factor 435.6');
  {
    const s = leader(gymOf({ item: 'focussash' }));
    s.sashT = -1e12;
    s.hp = 10;
    s.takeHit({ A: 1e7, cat: 'physical', type: 'normal', stab: 1 });
    ok(s.hp === 1 && !s.dead, 'Focus Sash: a lethal hit leaves her at 1 HP: ' + s.hp);
  }
  // Life Orb (N6): each cast costs 1% of max HP, at least 1, never below 1 HP: 2184 x 0.01 = 21.84
  {
    const wp = G.MoveDefs['water-pulse'],
      o = leader(gymOf({ item: 'lifeorb' }));
    G.GymLeader.SimPass.orbCost(o, wp);
    ok(near(o.maxHp - o.hp, 21.84), 'Life Orb: one cast costs 21.84: ' + (o.maxHp - o.hp));
    o.hp = 5;
    G.GymLeader.SimPass.orbCost(o, wp);
    ok(o.hp === 1, 'Life Orb never drops her below 1 HP: ' + o.hp);
    const n = leader();
    G.GymLeader.SimPass.orbCost(n, wp);
    ok(n.hp === n.maxHp, 'no Life Orb, no cost');
    // through a real cast: the brain pays it on the cast
    const casts = {};
    G.Gym.noteCast = (id) => (casts[id] = (casts[id] || 0) + 1);
    const run = (e) => {
      G.MoveSim.clear();
      human.x = 100;
      human.y = 0;
      for (let i = 0; i < 600 && !casts['water-pulse']; i++) {
        T.time += DT;
        e.x = e.y = 0;
        e.update(DT, human);
      }
    };
    const c = leader(gymOf({ item: 'lifeorb', moves: [{ id: 'water-pulse' }] }));
    run(c);
    ok(casts['water-pulse'] === 1 && near(c.maxHp - c.hp, 21.84, 1e-6), 'a real cast pays the Life Orb cost once: ' + JSON.stringify(casts) + ', ' + (c.maxHp - c.hp));
    delete casts['water-pulse'];
    const c0 = leader(gymOf({ moves: [{ id: 'water-pulse' }] }));
    run(c0);
    ok(casts['water-pulse'] === 1 && c0.hp === c0.maxHp, 'the control: a cast with no Life Orb costs nothing');
    T.time = 0;
    human.x = 0;
    human.y = 300;
  }
  // the reject list, each with its reason
  for (const id of Object.keys(ban)) {
    const it = G.Items.BY[id];
    ok(!!it, 'the ban names a real item: ' + id);
    if (!it) continue;
    const g = clone(MISTY);
    if (it.tier === 'pokemon') g.signatures[0].item = { 1: id };
    else g.runItems = { 1: [id] };
    ok(has(errs(g), 'cannot go on a leader, ' + ban[id]), id + ' is rejected with its reason: ' + errs(g).join('; '));
  }
  // run items: a stone works on her; one stone at most; the tiers; the cap of 4
  const r = leader(gymOf({ runItems: ['firestone'] }));
  ok(r.stoneType === 'fire' && r.runItems.includes('firestone') && r.hasItem('firestone'), 'a Fire Stone on a leader');
  const v = (fn) => {
    const g = clone(MISTY);
    fn(g);
    return errs(g);
  };
  ok(!v((g) => ((g.signatures[0].item = { 1: 'mysticwater' }), (g.runItems = { 1: ['waterstone'] }))).length, 'a held item and a stone validate');
  ok(has(v((g) => (g.runItems = { 1: ['firestone', 'waterstone'] })), 'only one stone item'), 'one stone at most');
  ok(has(v((g) => (g.runItems = { 1: ['leftovers'] })), 'is a pokemon item, not a run one'), 'a held item is not a run item');
  ok(has(v((g) => (g.signatures[0].item = { 1: 'firestone' })), 'is a run item, not a pokemon one'), 'a run item is not a held item');
  ok(has(v((g) => (g.runItems = { 1: ['firestone', 'waterstone', 'grassstone', 'icestone', 'rockstone'] })), 'at most 4 run items'), 'a 5th run item is rejected');
  ok(has(v((g) => (g.signatures[0].item = { 1: 'notanitem' })), 'unknown item notanitem'), 'an unknown item is rejected');
  // the def builder passes the build through (gym.js makeDef), then her body equips it
  const idx = G.Gyms.KANTO.indexOf(MISTY),
    sig0 = MISTY.signatures[0],
    keep = [sig0.item, sig0.ivs, MISTY.runItems];
  sig0.item = { 1: 'mysticwater' };
  sig0.ivs = { 1: IV31 };
  MISTY.runItems = { 1: ['waterstone'] };
  let d = null;
  try {
    d = G.Gym.makeDef({ idx, level: 20 }, 0);
  } catch (x) {
    ok(false, 'makeDef threw: ' + x.message);
  }
  [sig0.item, sig0.ivs, MISTY.runItems] = keep;
  if (keep[0] === undefined) delete sig0.item;
  if (keep[1] === undefined) delete sig0.ivs;
  if (keep[2] === undefined) delete MISTY.runItems;
  ok(!!d && d.gym.item === 'mysticwater' && d.gym.runItems.join() === 'waterstone' && d.gym.profile && d.gym.profile.iv[0] === 31, 'makeDef carries the held item, the run items and the profile');
}

// e. RESTRICTIONS (Q3, N3): none authored = your rules; Misty's authored values = today's numbers
{
  const none = () => leader(gymOf({ restrictions: null }));
  const f = none();
  St.apply(f, 'freeze');
  ok(near(f.stMajor.t, 2), 'no restriction: freeze at your 2 s: ' + f.stMajor.t);
  St.tick(f, 2.01);
  ok(near(f.stWin.hard, 2.5, 1e-3), 'no restriction: your 2.5 s gap: ' + (f.stWin && f.stWin.hard));
  const i = none();
  ok(i.hitIframes === 0.45, 'no restriction: your 0.45 s hit i-frames');
  i.takeHit({ A: 1000, cat: 'physical', type: 'normal', stab: 1 });
  ok(near(i.invuln, 0.45), 'a hit leaves 0.45 s: ' + i.invuln);
  // auto shake is ON by default (N3): sleep 3 s, one frame = one tap (0.25 s) and the frame
  const sh = none();
  sh.stMajor = { k: 'sleep', t: 3, age: 0 };
  sh.update(DT, human);
  ok(near(sh.stMajor.t, 3 - 0.25 - DT), 'auto shake on by default: ' + sh.stMajor.t);
  const ns = leader(gymOf({ restrictions: { autoShake: false } }));
  ns.stMajor = { k: 'sleep', t: 3, age: 0 };
  ns.update(DT, human);
  ok(near(ns.stMajor.t, 3 - DT), 'autoShake false: no tap: ' + ns.stMajor.t);
  // Misty's step A values (her real data) give today's numbers: freeze 1 s, a 5 s gap, no i-frames
  ok(JSON.stringify(MISTY.restrictions) === JSON.stringify({ statusCut: 0.5, ccWindow: 5, autoShake: true, hitIframes: 0 }), 'Misty authors the old leader values and no enrage (step B): ' + JSON.stringify(MISTY.restrictions));
  const m = leader(gymOf({ restrictions: MISTY.restrictions }));
  St.apply(m, 'freeze');
  ok(near(m.stMajor.t, 1), 'Misty: freeze 1 s: ' + m.stMajor.t);
  St.tick(m, 1.01);
  ok(near(m.stWin.hard, 5, 1e-3), 'Misty: the 5 s gap: ' + (m.stWin && m.stWin.hard));
  ok(m.hitIframes === 0, 'Misty: no hit i-frames');
  // the human is untouched: no statusCut or ccWindow on a plain Player entity
  const p = plain();
  St.apply(p, 'freeze');
  ok(near(p.stMajor.t, 2), 'a plain Player entity: freeze 2 s');
}

// MISTY, STEP B (hand numbers): Staryu L20 HP 84 x 25 = 2100; Zinc 3: Sp. Def 27 x 1.15 = 31.05; no enrage
{
  const e = G.Boss.make(defOf(gymOf({ hpMult: G.Gyms.hpMultFor(MISTY, 1), cards: G.Gyms.cardsFor(MISTY, 1), restrictions: MISTY.restrictions })), 0, 0);
  ok(e.maxHp === 2100, 'Misty at level 20: 2100 HP: ' + e.maxHp);
  ok(G.Gyms.cardsFor(MISTY, 1)['vitamins:spd'] === 3, 'Misty holds Zinc 3');
  ok(near(take(e, 'special'), 1000 / 31.05 + 2, 1e-4) && near(take(e, 'physical'), 1000 / 27 + 2, 1e-4), 'Misty: Zinc softens special hits only');
  e.gym.engagedAt = 0;
  T.time = 400;
  ok(G.Gym.enrageMul(e) === 1 && G.Gym.enrageIn(e) === null, 'Misty never enrages');
  T.time = 0;
}

// f. ENRAGE (Q1): off on a switched gym unless authored; the ramp as today when authored; the wild body as today
{
  const off = leader(gymOf({ restrictions: null }));
  off.gym.engagedAt = 0;
  T.time = 300;
  ok(G.Gym.enrageMul(off) === 1 && G.Gym.enrageIn(off) === null && G.Gym.enrages(off) === false, 'no enrage authored: x1 at 300 s, no countdown');
  ok(near(off.moveFactor(SPC), 396), 'and her factor stays 396');
  const on = leader(gymOf({ restrictions: { enrage: true } }));
  on.gym.engagedAt = 0;
  const at = (t) => ((T.time = t), G.Gym.enrageMul(on));
  ok(near(at(60), 1) && near(at(120), 1) && near(at(135), 1.5) && near(at(150), 2) && near(at(400), 2), 'enrage authored: x1 to 120 s, then to x2 over 30 s');
  T.time = 150;
  ok(near(on.moveFactor(SPC), 792), 'the enrage reaches her factor: 396 x 2 = 792: ' + on.moveFactor(SPC));
  T.time = 60;
  ok(near(G.Gym.enrageIn(on), 60), 'the countdown: 60 s left');
  const w = G.Boss.make(defOf(gymOf({ playerEntity: false })), 0, 0);
  w.gym.engagedAt = 0;
  T.time = 150;
  ok(G.Gym.enrages(w) && near(G.Gym.enrageMul(w), 2), 'the wild body enrages as today');
  T.time = 0;
}

// g. VALIDATOR
{
  ok(!errs(MISTY).length, 'Misty validates: ' + errs(MISTY).join('; '));
  const v = (fn, src = MISTY) => {
    const g = clone(src);
    fn(g);
    return errs(g);
  };
  ok(has(v((g) => (g.signatures[0].power = 2)), 'power must be 1 on a switched gym'), 'power 2 on a switched gym is rejected');
  ok(!has(v((g) => (g.signatures[0].power = 2), SURGE), 'power must be 1'), 'the wild body keeps its power knob');
  ok(has(v((g) => (g.signatures[0].ivs = { 1: [32, 0, 0, 0, 0, 0] })), 'six IVs'), 'IV 32 is rejected');
  ok(has(v((g) => (g.signatures[0].evs = { 1: [253, 0, 0, 0, 0, 0] })), 'six EVs'), 'EV 253 is rejected');
  ok(has(v((g) => (g.signatures[0].evs = { 1: [252, 252, 7, 0, 0, 0] })), 'EVs total at most 510'), 'EVs 511 in total are rejected');
  ok(!v((g) => (g.signatures[0].evs = { 1: [252, 252, 6, 0, 0, 0] })).length, 'EVs 510 in total pass');
  ok(has(v((g) => (g.signatures[0].nature = { 1: 'grumpy' })), 'grumpy is not a nature'), 'a fake nature is rejected');
  ok(!v((g) => ((g.signatures[0].nature = { 1: 'modest' }), (g.signatures[0].ivs = { 1: IV31 }))).length, 'a real nature and IVs pass');
  ok(has(v((g) => (g.signatures[0].ivs = { 9: ZERO })), 'keyed by a loop from 1 to'), 'a build loop out of range is rejected');
  ok(has(v((g) => (g.signatures[0].ivs = { 1: ZERO }), SURGE), 'needs playerEntity'), 'a build on the wild body is rejected');
  ok(has(v((g) => (g.runItems = { 1: ['firestone'] }), SURGE), 'runItems needs playerEntity'), 'run items on the wild body are rejected');
  ok(has(v((g) => (g.restrictions.statusCut = 2)), 'statusCut is in (0, 1]'), 'statusCut 2 is rejected');
  ok(has(v((g) => (g.restrictions.enrage = 'yes')), 'enrage is true or false'), 'enrage yes is rejected');
  ok(has(v((g) => (g.restrictions.autoShake = 1)), 'autoShake is true or false'), 'autoShake 1 is rejected');
  ok(has(v((g) => (g.restrictions.ccWindow = -1)), 'ccWindow is seconds'), 'a negative ccWindow is rejected');
  ok(has(v((g) => (g.restrictions.hitIframes = 11)), 'hitIframes is seconds'), 'hitIframes 11 is rejected');
}

// h. CARD BUDGET (Q5, N5): one stack is one pick; a player at level L has had L - 1. A warning, never a block
{
  const z = clone(MISTY);
  z.cards[1]['vitamins:spd'] = 3; // 13 + 3 = 16 stacks
  ok(typeof G.Gyms.budgetWarn(z, 1, 16) === 'string', '16 stacks at level 16 warns');
  ok(G.Gyms.budgetWarn(z, 1, 17) === null, '16 stacks at level 17 does not');
  ok(G.Gyms.budgetWarn(MISTY, 1, 17) === null && typeof G.Gyms.budgetWarn(MISTY, 1, 16) === 'string', "Misty's 16 stacks (with Zinc): fine at 17, a warning at 16");
  ok(!errs(z).length, 'the budget never blocks validation');
  const said = [],
    w0 = console.warn;
  console.warn = (m) => said.push(m);
  try {
    G.Gym.makeDef({ idx: G.Gyms.KANTO.indexOf(MISTY), level: 5 }, 0);
  } catch (x) {
    said.push('threw ' + x.message);
  }
  console.warn = w0;
  ok(said.length === 1 && said[0].includes('16 card stacks at level 5'), 'makeDef warns at fight start: ' + JSON.stringify(said));
}

console.log(fail ? 'leader-stats-harness: ' + fail + ' of ' + n + ' FAILED' : 'leader-stats-harness: all ' + n + ' passed');
process.exit(fail ? 1 : 0);
