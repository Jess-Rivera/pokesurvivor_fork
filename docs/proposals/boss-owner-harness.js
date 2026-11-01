// Slice 7a (D-ENEMY, Jess 2026-10-31): a gym leader's mon plays like the player. Offline checks (Node only). Usage from the repo root:
//   node docs/proposals/boss-owner-harness.js .
// Loads the REAL stats.js, enemies.js, types.js, status.js, stages.js, enemy.js, the move data chain, G.MoveGeom, G.TeamCards, G.MoveSim,
// G.MoveEffects, G.SimBus, gyms.js, boss-ai.js, move-route.js and move-render.js, with stubs for the world, camera, FX, the gym clock and the
// player (a body that records its hurt calls). Expected numbers are hand-derived from the rulings (DECISIONS 2026-10-31, gym leader mons play
// like the player; slice-7a.md) and the card steps (Damage +10%, Area +15%, Velocity +15% per stack, Count +1), never read from the code
// under test. The mutation runner (boss-owner-mutate.js) points OWNER_<FILE> at altered copies; every mutation must make this harness fail.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/entities/boss-ai.js': 'OWNER_BRAIN', 'js/systems/move-sim.js': 'OWNER_SIM', 'js/systems/move-effects.js': 'OWNER_FX',
  'js/data/gyms.js': 'OWNER_GYMS', 'js/systems/move-route.js': 'OWNER_ROUTE', 'js/systems/move-render.js': 'OWNER_RENDER', 'js/entities/enemy.js': 'OWNER_ENEMY' };
const read = p => fs.readFileSync((SRC[p] && process.env[SRC[p]]) || R + '/' + p, 'utf8');
const load = p => vm.runInThisContext(read(p), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
const DEX_BY = { 1: { name: 'Normie', types: ['normal'], stats: [50, 50, 50, 50, 50, 65] }, 74: { name: 'Geodude', types: ['rock', 'ground'], stats: [40, 80, 100, 30, 30, 20] } };
for (const d of [75, 76, 95, 111, 112, 138, 139, 140, 141, 142, 208]) DEX_BY[d] = { name: 'M' + d, types: ['rock'], stats: [50, 50, 50, 50, 50, 50] };     // Brock's other stages (validate checks every dex)
global.window = global; global.location = { search: '?dev' };     // 7b flip: the new path is always on, flag or not
let seed = 4242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; Math.random = rnd;
let clock = 0, enrage = 1; const casts = {}, warns = [];
const plTackle = { id: 'tackle', t: Infinity };     // 7b flip: G.MoveSim ticks the player's slots too; this one never recharges, so the player never casts
const pl = { x: 0, y: 0, r: 12, dead: false, hp: 1e9, maxHp: 1e9, bodyH: 20, mon: { types: ['normal'] }, hurts: [],
  hurt(...a) { this.hurts.push({ a, t: clock, x: this.x, y: this.y }); }, slots: [[plTackle]], activeGroup: () => [plTackle], cast() { pl.casted = (pl.casted || 0) + 1; } };
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => a + (b - a) * rnd(), randInt: (a, b) => a + Math.floor((b - a + 1) * rnd()),
    pickN: a => a, damp: (a, b) => b, norm: (x, y) => { const n = Math.hypot(x, y) || 1; return [x / n, y / n]; }, dist: (a, b, c, d) => Math.hypot(a - c, b - d),
    dist2: (a, b, c, d) => (a - c) * (a - c) + (b - d) * (b - d), hash: () => 0.5, pick: a => a[0] },
  DEX_BY, DEX: [], FX: { dmgText() {}, spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {}, slash() {} }, VFX: { forMove: () => ({}) },
  Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, dirFromAngle: () => 0,
    animMeta: () => ({ ay: 20 }), PX: 1 },
  Weather: { mult: () => 1, speedFor: () => 1, force() {} }, Game: { player: pl, everyone: () => [pl] }, Audio: { sfx() {} }, Log: { on: false },
  Camera: { kick() {}, sees: () => true, left: () => -2000, top: () => -2000, w: 4000, h: 4000 }, Coop: { active: false },
  World: { collide: () => false, isLiquid: () => false, isFree: () => true, projectileBlock: () => null, propsInCircle: () => [] }, Path: { dirFor: () => null },
  Gym: { now: () => clock, enrageMul: () => enrage, noteCast: id => { casts[id] = (casts[id] || 0) + 1; } } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
for (const p of ['js/core/stats.js', 'js/data/enemies.js', 'js/data/types.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js',
  'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js',
  'js/data/move-resolver.js', 'js/systems/team-cards.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js', 'js/data/gyms.js', 'js/entities/boss-ai.js',
  'js/systems/move-route.js', 'js/systems/move-render.js']) { try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } }
const origWarn = console.warn; console.warn = m => warns.push(String(m));
const Sim = G.MoveSim, S = G.Stages, Gy = G.Gyms; G.Enemy.prototype.die = function () { this.dead = true; };
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 60) console.log('FAIL', m); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const DT = 1 / 60;
const BROCK = Gy.KANTO[0], SLOT1 = BROCK.signatures[0];

// ---- builders ----
const gymOf = (o = {}) => Object.assign({ level: 20, leader: 'Brock', badge: 'Boulder Badge', species: 'Geodude', stance: 'mixed', power: 1, tempo: 1,
  cards: Object.assign({}, SLOT1.cards), moves: SLOT1.moves.map(m => Object.assign({}, m)), engagedAt: null }, o);
function mkBoss(gym = gymOf()) {
  const e = G.Boss.make({ dex: 74, name: 'Geodude', hp: 1e6, spd: 40, dmg: 20, xp: 0, behavior: 'chase', shotDmg: 10, shotCd: 1, range: 260, gym }, 0, 0);
  e.flying = false; return e;
}
/** One game frame in the game's order: the enemy update (brain casts), then the one shared sim step (MoveRoute.tick). The boss is held
 *  at (bx, by) to isolate the AI; `each` can move the player. */
function frame(e, { bx = 0, by = 0, each = null } = {}) {
  clock += DT;
  if (each) each();
  e.x = bx; e.y = by; e.kx = e.ky = 0;
  e.update(DT, pl);
  G.MoveRoute.tick(DT, pl, clock);
}
const run = (e, secs, opt) => { for (let i = 0, N = Math.round(secs / DT); i < N; i++) frame(e, opt); };
function fresh() { Sim.clear(); Sim.setRng(rnd); pl.hurts = []; pl.dead = false; pl.x = 0; pl.y = 0; clock = 0; enrage = 1; for (const k in casts) delete casts[k]; }
const tackleFactor = (lvl = 20) => G.Stats.enemyAttackFactor(80, 30, lvl, 40 * 1.3, 'physical');                 // Normal on a Rock/Ground mon: no STAB
const rockFactor = (lvl = 20) => G.Stats.enemyAttackFactor(80, 30, lvl, 45 * 1.3, 'physical') * 1.5;             // Rock: STAB

// 1. roster data and the validator
{ ok(!Gy.validate(BROCK).length, 'Brock validates: ' + Gy.validate(BROCK).join('; '));
  ok(JSON.stringify(SLOT1.cards) === JSON.stringify({ damage: 3, count: 2, velocity: 3, area: 2 }), 'slot 1 cards are Damage 3, Count 2, Velocity 3, Area 2');
  ok(SLOT1.moves.map(m => m.id).join() === 'tackle,rock-throw,harden', 'slot 1 moves');
  const forms = id => Gy.formOf(G.MoveDefs[id]);
  ok(forms('tackle') === 'melee' && forms('rock-throw') === 'shot' && forms('harden') === 'buff', 'forms: Tackle melee, Rock Throw shot, Harden buff');
  ok(forms('body-slam') === 'melee' && forms('water-gun') === 'shot' && forms('swords-dance') === 'buff' && forms('agility') === 'buff', 'slots 2 to 6 forms');
  ok(!forms('rock-slide') && !forms('discharge') && !forms('aqua-ring') && !forms('quick-attack') && !forms('thunderbolt'), 'no gym form for falls, emitters, persistent auras, dashes and chains');
  ok(!forms('ice-beam') && !forms('hydro-pump') && !forms('heat-wave') && !forms('confusion') && !forms('bonemerang'), 'no gym form for beams, novas, homing shots and returning shots');
  const flags = mut => { const c = JSON.parse(JSON.stringify(BROCK)); mut(c.signatures[0], c); return Gy.validate(c); };
  const cases = [
    ['unknown card', s => { s.cards.luck = 1; }, 'unknown card luck'],
    ['team card', s => { s.cards.duration = 2; }, 'is a team card'],
    ['card over its cap', s => { s.cards.count = 4; }, 'capped at 3'],
    ['card that fits no move', s => { s.cards.heal = 1; }, 'fits none of its moves'],
    ['fractional stacks', s => { s.cards.damage = 1.5; }, 'whole number of stacks'],
    ['zero stacks', s => { s.cards.area = 0; }, 'whole number of stacks'],
    ['hpBelow out of range', s => { s.moves[2].hpBelow = 1.2; }, 'hpBelow must be in (0, 1)'],
    ['unknown move', s => { s.moves.push({ id: 'not-a-move' }); }, 'unknown move not-a-move'],
    ['move with no gym form', s => { s.moves[1].id = 'rock-slide'; }, 'has no gym form yet'],
    ['old weight field', s => { s.moves[0].weight = 2; }, 'unknown field weight'],
    ['old stacks field', s => { s.moves[0].stacks = { effect: 1 }; }, 'unknown field stacks'],
    ['no damaging move', s => { s.moves = [{ id: 'harden' }]; }, 'at least one damaging move'],
    ['typo on a slot', s => { s.cardz = {}; }, 'unknown field cardz']
  ];
  for (const [name, mut, needle] of cases) { const out = flags(mut); ok(out.some(m => m.includes(needle)), 'validate missed "' + name + '" (wanted ' + needle + '): ' + JSON.stringify(out)); }
  console.log('1 data: Brock valid; slot 1 = Tackle, Rock Throw, Harden with Damage 3, Count 2, Velocity 3, Area 2; ' + cases.length + ' negative cases flagged'); }

// 2. the owner: player size, its own folded defs, the player as its only foe
{ fresh(); const e = mkBoss(), b = e.brain;
  ok(e.scale === 1, 'a gym leader mon is drawn at player size (scale ' + e.scale + ')');
  const wild = G.Boss.make({ dex: 74, name: 'Geodude', hp: 100, spd: 40, dmg: 20, xp: 0, behavior: 'chase' }, 0, 0); ok(wild.scale > 1, 'a non-gym boss keeps its enlarged scale');
  const t = b.def('tackle'), r = b.def('rock-throw'), h = b.def('harden');
  ok(near(t.basePower, 52) && near(t.space.radRadius, 70.2) && near(t.space.radArc, 1.7) && near(t.cd, 0.5), 'Tackle folded: Power 52, reach 70.2, arc 1.7, cd 0.5: ' + JSON.stringify([t.basePower, t.space.radRadius, t.space.radArc, t.cd]));
  ok(near(r.basePower, 58.5) && r.space.count === 3 && near(r.space.radRadius, 11.7) && near(r.delivery.moveSpeed, 377) && near(r.cd, 35 / 15 * 0.5, 1e-3), 'Rock Throw folded: Power 58.5, 3 rocks, size 11.7, 377 px/s, cd 1.167: ' + JSON.stringify([r.basePower, r.space.count, r.space.radRadius, r.delivery.moveSpeed, r.cd]));
  ok(h === G.MoveDefs.harden, 'no card fits Harden, so it runs the frozen def');
  ok(G.MoveDefs.tackle.basePower === 40 && G.MoveDefs['rock-throw'].space.count === 1, 'the frozen defs are untouched');
  ok(e.foes().length === 1 && e.foes()[0] === pl, 'the player is its only foe'); pl.dead = true; ok(e.foes().length === 0, 'a fainted player is no foe'); pl.dead = false;
  ok(e.strongHost === true && near(e.cdMul, 1) && near(G.MoveEffects.gateMulOf(e), S.STRONG_HOST_GATE_MUL), 'a strong host: the strong-host Gate multiplier, cdMul 1 at tempo 1');
  ok(near(G.MoveEffects.gateMulOf({}), 1), 'an owner with no cards and not a strong host keeps the base Gate');
  console.log('2 owner: player size, Tackle 52 / 70.2 px / cd 0.5, Rock Throw 58.5 x3 rocks 11.7 px at 377 px/s / cd 1.167, Harden unfolded, the player is its only foe'); }

// 3. Tackle: a 0.45 s tell with the aim locked at its start, damage only, no tell starts out of reach
{ fresh(); const e = mkBoss(), b = e.brain; b.init(); b.wait = 0; b.mode = 'close';
  pl.x = 60; pl.y = 0; frame(e);
  ok(b.tell && b.tell.form === 'melee' && b.tell.id === 'tackle' && near(b.tell.wind, 0.45) && near(b.tell.ang, 0), 'a Tackle tell starts with the player in reach: ' + JSON.stringify(b.tell && [b.tell.id, b.tell.wind, b.tell.ang]));
  run(e, 0.45 - 2 * DT); ok(!pl.hurts.length && !casts.tackle, 'nothing lands before the tell ends');
  run(e, 3 * DT); ok(casts.tackle === 1 && pl.hurts.length === 1, 'the cone lands when the tell ends (' + pl.hurts.length + ' hit)');
  const h = pl.hurts[0]; ok(h && near(h.a[0], tackleFactor()) && h.a[1] === 'normal' && h.a[3].cat === 'physical' && h.a[3].mul === 1, 'the hit is the boss ratio factor with Power 52, Normal, physical: ' + (h && h.a[0]) + ' vs ' + tackleFactor());
  ok(h && h.x === 60 && h.y === 0, 'no knockback on the player');
  // locked aim: the player sidesteps 90 degrees during the tell (still within 70 px) and the cone misses
  fresh(); const e2 = mkBoss(), b2 = e2.brain; b2.init(); b2.wait = 0; b2.mode = 'close';
  pl.x = 60; pl.y = 0; frame(e2); ok(b2.tell && near(b2.tell.ang, 0), 'second tell aimed at 0');
  pl.x = 0; pl.y = 60; run(e2, 0.6); ok(casts.tackle === 1 && pl.hurts.length === 0, 'the cone fires along the locked aim and misses a player who stepped aside');
  // out of reach: 70.2 + 12 = 82.2 px
  fresh(); const e3 = mkBoss(), b3 = e3.brain; b3.init(); b3.wait = 0; b3.mode = 'close';
  for (const s of e3.slots[0]) if (s.id === 'rock-throw') s.t = 99;     // only Tackle is ready
  pl.x = 84; pl.y = 0; frame(e3); ok(!b3.tell, 'no Tackle tell at 84 px (reach 70.2 + body 12)');
  pl.x = 81; frame(e3); ok(b3.tell && b3.tell.id === 'tackle', 'a Tackle tell at 81 px');
  console.log('3 Tackle: 0.45 s tell, lands at its end with the Power 52 factor ' + tackleFactor().toFixed(1) + ', no knockback, the locked aim misses a sidestep, reach 82 px with your body'); }

// 4. Rock Throw: a 0.5 s tell, three rocks at 377 px/s along the locked aim, Rock STAB, range 420
{ fresh(); const e = mkBoss(), b = e.brain; b.init(); b.wait = 0; b.mode = 'far';
  for (const s of e.slots[0]) if (s.id === 'tackle') s.t = 99;
  pl.x = 300; pl.y = 0; frame(e);
  ok(b.tell && b.tell.form === 'shot' && near(b.tell.wind, 0.5), 'a Rock Throw tell (0.5 s) at 300 px');
  const t0 = clock; run(e, 0.5 - 2 * DT); ok(!Sim.list().length, 'no rock before the tell ends');
  run(e, 3 * DT); const rocks = Sim.list().filter(i => i.spec.id === 'rock-throw');
  ok(rocks.length === 3, 'three rocks (Count Up 2): ' + rocks.length);
  const r0 = rocks[0], x0 = r0.x, y0 = r0.y; Sim.step(DT, clock); ok(near(Math.hypot(r0.x - x0, r0.y - y0) / DT, 377, 1e-6), 'each rock flies 377 px/s: ' + Math.hypot(r0.x - x0, r0.y - y0) / DT);
  ok(near(Math.max(...rocks.map(i => i.heading)) - Math.min(...rocks.map(i => i.heading)), 0.12), 'the three rocks fan 0.12 rad around the aim');
  run(e, 1.2);
  const first = pl.hurts[0];
  ok(first && first.a[1] === 'rock' && near(first.a[0], rockFactor()), 'a rock hit is Rock with STAB and Power 58.5: ' + (first && first.a[0]) + ' vs ' + rockFactor());
  const lands = t0 + 0.5 + (300 - 12 - 11.7) / 377;     // the rock's edge meets the player's edge
  ok(first && Math.abs(first.t - lands) <= 3 * DT, 'the first rock lands about ' + (lands - t0).toFixed(3) + ' s after the tell started: ' + (first && (first.t - t0).toFixed(3)));
  // locked aim: the player moves away from the line during the tell; the rocks keep the old line
  fresh(); const e2 = mkBoss(), b2 = e2.brain; b2.init(); b2.wait = 0; b2.mode = 'far'; for (const s of e2.slots[0]) if (s.id === 'tackle') s.t = 99;
  pl.x = 300; pl.y = 0; frame(e2); pl.x = 0; pl.y = 300; run(e2, 1.6);
  ok(casts['rock-throw'] >= 1 && Sim.list().filter(i => i.spec.id === 'rock-throw').every(i => Math.abs(i.y) < 60) && !pl.hurts.some(h => h.a[1] === 'rock'), 'the rocks follow the aim locked at the tell, not the player');
  // range 420: no tell beyond it
  fresh(); const e3 = mkBoss(), b3 = e3.brain; b3.init(); b3.wait = 0; b3.mode = 'far'; for (const s of e3.slots[0]) if (s.id === 'tackle') s.t = 99;
  pl.x = 430; pl.y = 0; frame(e3); ok(!b3.tell, 'no Rock Throw tell at 430 px (range 420)'); pl.x = 410; frame(e3); ok(b3.tell && b3.tell.id === 'rock-throw', 'a Rock Throw tell at 410 px');
  console.log('4 Rock Throw: 0.5 s tell, 3 rocks fanned 0.12 rad at 377 px/s along the locked aim, Rock STAB factor ' + rockFactor().toFixed(1) + ', first rock lands on time, range 420'); }

// 5. pacing: one tell at a time, 0.35 s of recovery, per-move cooldowns from the folded defs, tempo divides all of them
{ fresh(); const e = mkBoss(), b = e.brain; b.init(); b.wait = 0; b.mode = 'close';
  pl.x = 60; pl.y = 0; const starts = []; const orig = b.start.bind(b); b.start = (...a) => { starts.push([clock, a[1].id]); return orig(...a); };
  run(e, 4);
  // Tackle's 0.5 s cd counts from its release (0.45 s into the tell), so the next Tackle tell starts at least 0.95 s after the last one; in
  // between, the 0.35 s recovery ends with Tackle still recharging and Rock Throw ready, so up close the two alternate
  const tk = starts.filter(s => s[1] === 'tackle').map(s => s[0]), all = starts.map(s => s[0]);
  const gaps = tk.slice(1).map((t, i) => t - tk[i]);
  ok(gaps.length >= 2 && gaps.every(g => g >= 0.95 - DT), 'up close, Tackle tells at least 0.45 + 0.5 = 0.95 s apart: ' + gaps.map(g => g.toFixed(3)).join(' '));
  ok(all.slice(1).every((t, i) => t - all[i] >= 0.8 - DT), 'any two tells at least 0.45 + 0.35 = 0.8 s apart (tell plus recovery)');
  ok(starts.some(s => s[1] === 'rock-throw') && starts[0][1] === 'tackle', 'up close it opens with Tackle and fills its recharge with Rock Throw: ' + starts.map(s => s[1]).join(' '));
  let overlap = false; const e2 = mkBoss(), b2 = e2.brain; b2.init(); b2.wait = 0; fresh(); pl.x = 60;
  for (let i = 0; i < 240; i++) { const was = b2.tell; frame(e2); if (was && b2.tell && b2.tell !== was) overlap = true; }
  ok(!overlap, 'one tell at a time');
  // after a cast the slot's timer is the folded cd x cdMul
  fresh(); const e3 = mkBoss(), b3 = e3.brain; b3.init(); b3.wait = 0; b3.mode = 'far'; for (const s of e3.slots[0]) if (s.id === 'tackle') s.t = 99;
  pl.x = 300; frame(e3); run(e3, 0.5 + 2 * DT); const rs = e3.slots[0].find(s => s.id === 'rock-throw');
  ok(casts['rock-throw'] === 1 && rs.t > 35 / 15 * 0.5 - 3 * DT && rs.t <= 35 / 15 * 0.5 + 1e-9, 'Rock Throw recharges for its 1.167 s cd after the cast: ' + rs.t);
  // tempo 2: tell, recovery and cooldowns halve
  fresh(); const e4 = mkBoss(gymOf({ tempo: 2 })), b4 = e4.brain; b4.init(); b4.wait = 0; b4.mode = 'close'; pl.x = 60;
  ok(near(e4.cdMul, 0.5), 'tempo 2 is cdMul 0.5'); frame(e4); ok(b4.tell && near(b4.tell.wind, 0.225) && near(b4.tell.after, 0.175), 'tempo 2 halves the tell and recovery: ' + JSON.stringify(b4.tell && [b4.tell.wind, b4.tell.after]));
  run(e4, 0.25); const ts = e4.slots[0].find(s => s.id === 'tackle'); ok(ts.t > 0.2 && ts.t <= 0.25, 'tempo 2 halves the Tackle cd (0.25): ' + ts.t);
  console.log('5 pacing: up close Tackle and Rock Throw alternate (' + starts.slice(0, 4).map(s => s[1]).join(', ') + '), one tell at a time, cooldowns from the folded defs, tempo 2 halves tell, recovery and cooldowns'); }

// 6. Harden: no tell, +1 Def at once, climbs once per Gate to +6 at about 30 s, resets 6.1 s after its last success
{ fresh(); const e = mkBoss(), b = e.brain; pl.x = 2000; pl.y = 0;
  frame(e); const t0 = clock;
  ok(casts.harden === 1 && S.stage(e, 'def') === 1, 'Harden casts on the first step with no tell: +1 Def');
  ok(!b.tell, 'Harden has no tell');
  ok(e.trk && e.trk.def && !e.stgTeam, 'the raise is on the mon\'s own tracker (no team store on a gym mon)');
  run(e, 29.9 - DT); ok(S.stage(e, 'def') === 5, '+5 just before 30 s: ' + S.stage(e, 'def'));
  run(e, 0.2); ok(S.stage(e, 'def') === 6 && near(S.mul(e, 'def'), 4), '+6 (x4 Defense) at about 30 s: ' + S.stage(e, 'def') + ' at ' + (clock - t0).toFixed(2) + ' s');
  ok(casts.harden >= 6, 'Harden recast at each Gate: ' + casts.harden);
  // stunned (the brain does not step, the body still ticks its stages): the tracker ends 6.1 s after its last success (SS5)
  for (let i = 0; i < Math.round(6.2 / DT); i++) S.tick(e, DT);
  ok(S.stage(e, 'def') === 0, 'no success for 6.2 s: the climb resets to 0');
  frame(e); ok(S.stage(e, 'def') === 1, 'the next step starts the climb over at +1');
  // a Harden success fires during an attack's tell
  fresh(); const e2 = mkBoss(), b2 = e2.brain; b2.init(); b2.wait = 0; b2.mode = 'close'; pl.x = 60; pl.y = 0;
  frame(e2); ok(b2.tell && casts.harden === 1, 'Harden and a Tackle tell on the same step');
  // up close the brain is almost always in a tell; Harden's Gate opens at 6 s and 12 s anyway, so the climb never resets
  run(e2, 12.1); ok(S.stage(e2, 'def') === 3, 'up close, with tells running, Harden still climbs on time (+3 at 12.1 s): ' + S.stage(e2, 'def'));
  console.log('6 Harden: no tell, +1 at once, +6 (x4 Defense) at about 30 s, recast each Gate, resets after 6.1 s without a success, never blocked by a tell'); }

// 7. contact: fixed to Tackle, never swapped during a Rock Throw tell; enrage and stages still count
{ fresh(); const e = mkBoss(), b = e.brain; b.init(); b.wait = 0; b.mode = 'far'; for (const s of e.slots[0]) if (s.id === 'tackle') s.t = 99;
  ok(near(e.atkFactor, tackleFactor()) && e.atkType === 'normal' && e.atkCat === 'physical', 'contact = Tackle numbers at spawn');
  pl.x = 300; frame(e); ok(b.tell && b.tell.id === 'rock-throw' && e.atkType === 'normal' && near(e.atkFactor, tackleFactor()), 'during a Rock Throw tell the body still touches as Tackle');
  enrage = 2; frame(e); ok(near(e.atkFactor, tackleFactor() * 2), 'the enrage reaches contact damage');
  console.log('7 contact: Tackle numbers, never swapped by a cast, enrage x2 counts'); }

// 8. hpBelow: the move joins only below its line
{ fresh(); const g = gymOf({ moves: [{ id: 'tackle' }, { id: 'swords-dance', hpBelow: 0.5 }], cards: {} }), e = mkBoss(g);
  ok(e.activeGroup().map(s => s.id).join() === 'tackle', 'at full HP the hpBelow move is out of the group');
  e.hp = e.maxHp * 0.4; ok(e.activeGroup().map(s => s.id).join() === 'tackle,swords-dance', 'below the line it joins');
  pl.x = 2000; frame(e); ok(casts['swords-dance'] === 1 && S.stage(e, 'atk') === 2, 'and casts on its Gate: Attack +2');
  console.log('8 hpBelow: Swords Dance joins below 50% HP and casts at once'); }

// 9. flinch: cancels a tell, spends that move's cooldown, the next attack waits one recovery
{ fresh(); const e = mkBoss(), b = e.brain; b.init(); b.wait = 0; b.mode = 'close'; pl.x = 60;
  frame(e); ok(b.tell, 'a tell to flinch'); e.applyFlinch(); const s = e.slots[0].find(x => x.id === 'tackle');
  ok(!b.tell && near(s.t, 0.5) && near(b.wait, 0.35), 'flinch: tell cancelled, Tackle cd spent, wait 0.35: ' + [s.t, b.wait]);
  run(e, 0.6); ok(!casts.tackle, 'the cancelled Tackle never lands');
  console.log('9 flinch: cancels the tell, spends the cooldown, waits one recovery'); }

// 10. riders on the player: damage only; a rider is noted once and not applied
{ fresh(); warns.length = 0; const g = gymOf({ moves: [{ id: 'body-slam' }], cards: {} }), e = mkBoss(g), b = e.brain; b.init(); b.wait = 0; b.mode = 'close';
  pl.x = 50; pl.inflict = () => ok(false, 'a rider reached the player'); run(e, 3);
  ok(pl.hurts.length >= 2, 'Body Slam hurts the player: ' + pl.hurts.length);
  ok(warns.filter(w => w.includes('body-slam') && w.includes('ailment')).length === 1, 'its paralysis rider is noted once: ' + JSON.stringify(warns));
  ok(!pl.stMajor, 'no ailment on the player'); delete pl.inflict;
  console.log('10 riders: damage only; Body Slam\'s paralysis noted once in the console and not applied'); }

// 11. the shared sim: MoveRoute.tick steps every instance once per frame; an enemy cast is not the player's cast
{ fresh(); ok(G.MoveRoute.on === true, 'the new path is always on since the 7b flip');
  const e = mkBoss(), b = e.brain; b.init(); b.wait = 0; b.mode = 'far'; for (const s of e.slots[0]) if (s.id === 'tackle') s.t = 99;
  pl.x = 400; frame(e); run(e, 0.5 + 2 * DT); const r = Sim.list().find(i => i.spec.id === 'rock-throw'); ok(!!r, 'a rock in flight');
  const x0 = r.x; G.MoveRoute.tick(DT, pl, clock); ok(near(r.x - x0, 377 * DT * Math.cos(r.heading), 1e-6), 'one MoveRoute.tick moves it one step (' + (r.x - x0).toFixed(3) + ' px)');
  const tape = G.SimBus.record(); fresh(); const e2 = mkBoss(), b2 = e2.brain; b2.init(); b2.wait = 0; b2.mode = 'close'; pl.x = 60; run(e2, 0.6); G.SimBus.stopRecording();
  const c = tape.filter(x => x.type === 'move:cast');
  ok(c.length >= 2 && c.every(x => x.enemy === true && x.ownerId === e2.id), 'a gym leader cast says enemy: true with its id');
  const saved = G.MoveRoute; G.MoveRoute = { routed: () => true }; pl.casted = 0;
  G.SimBus.emit('move:cast', { moveId: 'tackle', ownerId: e2.id, x: 0, y: 0, aim: 0, enemy: true }); ok(pl.casted === 0, 'the render does not play your Tackle for Brock\'s');
  G.SimBus.emit('move:cast', { moveId: 'tackle', ownerId: null, x: 0, y: 0, aim: 0, enemy: false }); ok(pl.casted === 1, 'your own Tackle still plays');
  G.MoveRoute = saved;
  const h = tape.filter(x => x.type === 'move:hit'); ok(h.length >= 1 && h.every(x => x.enemyId === null), 'a hit on the player names no enemy');
  console.log('11 shared sim: MoveRoute.tick steps once per frame; enemy casts are tagged and never play your animation'); }

// 12. guards: the old picker, stacks and kind reads are gone from the gym path
{ const brain = read('js/entities/boss-ai.js'), gyms = read('js/data/gyms.js'), gym = fs.readFileSync(R + '/js/systems/gym.js', 'utf8');
  ok(!/\bkind\b/.test(brain.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'boss-ai.js reads no kind');
  ok(!/Moves\.BY_ID|addStack|BOSS_FORMS/.test(brain + gyms + gym), 'no legacy move table, addStack or BOSS_FORMS on the gym path');
  ok(!/\.weight\b|\bpick\(|cdAfter/.test(brain), 'no weight picker left in the brain');
  console.log('12 guards: no kind, BY_ID, addStack, BOSS_FORMS or weight picker on the gym path'); }

console.warn = origWarn;
console.log(fail ? fail + ' FAILED (' + n + ' checks)' : 'ALL OK (' + n + ' checks)');
process.exit(fail ? 1 : 0);
