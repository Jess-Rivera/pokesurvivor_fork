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
  'js/data/gyms.js': 'OWNER_GYMS', 'js/systems/move-route.js': 'OWNER_ROUTE', 'js/systems/move-render.js': 'OWNER_RENDER', 'js/entities/enemy.js': 'OWNER_ENEMY',
  'js/entities/player.js': 'OWNER_PLAYER' };
const read = p => fs.readFileSync((SRC[p] && process.env[SRC[p]]) || R + '/' + p, 'utf8');
const load = p => vm.runInThisContext(read(p), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
const DEX_BY = { 1: { name: 'Normie', types: ['normal'], stats: [50, 50, 50, 50, 50, 65] }, 74: { name: 'Geodude', types: ['rock', 'ground'], stats: [40, 80, 100, 30, 30, 20] } };
for (const d of [75, 76, 95, 111, 112, 138, 139, 140, 141, 142, 208]) DEX_BY[d] = { name: 'M' + d, types: ['rock'], stats: [50, 50, 50, 50, 50, 50] };     // Brock's other stages (validate checks every dex)
global.window = global; global.location = { search: '?dev' };     // 7b flip: the new path is always on, flag or not
let seed = 4242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; Math.random = rnd;
let clock = 0, enrage = 1; const casts = {}, warns = [], hazards = [];
const plTackle = { id: 'tackle', t: Infinity };     // 7b flip: G.MoveSim ticks the player's slots too; this one never recharges, so the player never casts
const pl = { x: 0, y: 0, r: 12, dead: false, hp: 1e9, maxHp: 1e9, bodyH: 20, mon: { types: ['normal'] }, hurts: [], isPlayer: true, loss: 0,     // loss: the HP a hit takes (drain tests)
  hurt(...a) { this.hurts.push({ a, t: clock, x: this.x, y: this.y }); this.hp -= this.loss; }, slots: [[plTackle]], activeGroup: () => [plTackle], cast() { pl.casted = (pl.casted || 0) + 1; } };
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => a + (b - a) * rnd(), randInt: (a, b) => a + Math.floor((b - a + 1) * rnd()),
    pickN: a => a, damp: (a, b) => b, norm: (x, y) => { const n = Math.hypot(x, y) || 1; return [x / n, y / n]; }, dist: (a, b, c, d) => Math.hypot(a - c, b - d),
    dist2: (a, b, c, d) => (a - c) * (a - c) + (b - d) * (b - d), hash: () => 0.5, pick: a => a[0] },
  DEX_BY, DEX: [], FX: { dmgText() {}, spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {}, slash() {} }, VFX: { forMove: () => ({}) },
  Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, dirFromAngle: () => 0,
    animMeta: () => ({ ay: 20 }), PX: 1 },
  Weather: { mult: () => 1, speedFor: () => 1, force() {} }, Game: { player: pl, everyone: () => [pl] }, Audio: { sfx() {} }, Log: { on: false },
  Camera: { kick() {}, sees: () => true, left: () => -2000, top: () => -2000, w: 4000, h: 4000 }, Coop: { active: false },
  World: { collide: () => false, isLiquid: () => false, isFree: () => true, projectileBlock: () => null, propsInCircle: () => [] }, Path: { dirFor: () => null },
  Gym: { now: () => clock, enrageMul: () => enrage, noteCast: id => { casts[id] = (casts[id] || 0) + 1; } }, Hazards: { add: h => { hazards.push(h); return h; } } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
for (const p of ['js/core/stats.js', 'js/data/enemies.js', 'js/data/types.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/entities/player.js',
  'js/core/simbus.js', 'js/systems/move-geom.js', 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js',
  'js/data/move-resolver.js', 'js/data/moves.js', 'js/systems/team-cards.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js', 'js/data/gyms.js', 'js/entities/boss-ai.js',
  'js/systems/move-route.js', 'js/systems/move-render.js']) { try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } }
const origWarn = console.warn; console.warn = m => warns.push(String(m));
const Sim = G.MoveSim, S = G.Stages, Gy = G.Gyms; G.Enemy.prototype.die = function () { this.dead = true; };
pl.applyFlinch = G.Player.prototype.applyFlinch; pl.flinchMove = G.Player.prototype.flinchMove;     // the real player flinch on the stub body
let fail = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 60) console.log('FAIL', m); } };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const DT = 1 / 60;
const BROCK = Gy.KANTO[0], SLOT1 = BROCK.signatures[0], PILOT = SLOT1.sets[2]; // the tuned pilot set (loop 2 on since 2026-11-02)

// ---- builders ----
const gymOf = (o = {}) => Object.assign({ level: 20, leader: 'Brock', badge: 'Boulder Badge', species: 'Geodude', stance: 'mixed', power: 1, tempo: 1,
  cards: Object.assign({}, SLOT1.cards), moves: PILOT.map(m => Object.assign({}, m)), engagedAt: null }, o);
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
function fresh() { Sim.clear(); Sim.setRng(rnd); pl.hurts = []; pl.dead = false; pl.x = 0; pl.y = 0; clock = 0; enrage = 1; for (const k in casts) delete casts[k];
  G.Status.clear(pl); S.clear(pl); pl.stFl = pl.flRoll = null; pl.walking = false; pl.svx = pl.svy = 0; pl.loss = 0; pl.hp = pl.maxHp; pl.mon.types = ['normal']; plTackle.t = Infinity; }
const tackleFactor = (lvl = 20) => G.Stats.enemyAttackFactor(80, 30, lvl, 40 * 1.3, 'physical');                 // Normal on a Rock/Ground mon: no STAB
const rockFactor = (lvl = 20) => G.Stats.enemyAttackFactor(80, 30, lvl, 45 * 1.3, 'physical') * 1.5;             // Rock: STAB

// 1. roster data and the validator
{ ok(!Gy.validate(BROCK).length, 'Brock validates: ' + Gy.validate(BROCK).join('; '));
  ok(JSON.stringify(SLOT1.cards) === JSON.stringify({ damage: 3, count: 2, velocity: 3, area: 2 }), 'slot 1 cards are Damage 3, Count 2, Velocity 3, Area 2');
  ok(PILOT.map(m => m.id).join() === 'tackle,rock-throw,harden', 'slot 1 pilot set (loop 2 on)');
  ok(SLOT1.sets[1].map(m => m.id).join() === 'tackle,defense-curl,rock-throw', 'slot 1 loop 1: Tackle, Defense Curl, Rock Throw (Jess 2026-11-02)');
  ok(Gy.movesFor(SLOT1, 0, 1) === SLOT1.sets[1] && [2, 3, 6].every(L => Gy.movesFor(SLOT1, 0, L) === PILOT), 'movesFor: loop 1 its own set, loops 2 to 6 hold the pilot set');
  const forms = id => Gy.formOf(G.MoveDefs[id]);
  ok(forms('tackle') === 'melee' && forms('rock-throw') === 'shot' && forms('harden') === 'buff', 'forms: Tackle melee, Rock Throw shot, Harden buff');
  ok(forms('body-slam') === 'melee' && forms('water-gun') === 'shot' && forms('swords-dance') === 'buff' && forms('agility') === 'buff', 'slots 2 to 6 forms');
  ok(!forms('rock-slide') && !forms('discharge') && !forms('aqua-ring') && !forms('aerial-ace') && !forms('flamethrower') && !forms('aura-sphere') && !forms('spikes'),
    'no gym form for falls, emitters, persistent auras, teleports, tracking cones, path shots and world hazards');
  ok(forms('quick-attack') === 'dash' && Gy.reachOf(G.MoveDefs['quick-attack'], 'dash') === 420, 'Quick Attack is the dash form, reach its range 420 (Jess 2026-11-02)');
  ok(forms('thunder-shock') === 'shot' && forms('hex') === 'shot', "a chain move takes its shape's form: Thunder Shock and Hex are shots");
  ok(forms('thunderbolt') === 'strike', 'Thunderbolt (target-anchored, static) is a strike');
  ok(['hyper-voice', 'bulldoze', 'dark-pulse', 'dazzling-gleam'].every(id => forms(id) === 'nova'), 'the growing rings are novas, Dazzling Gleam included (no longer a 1 px melee)');
  ok(['heat-wave', 'sludge-wave'].every(id => forms(id) === 'shot'), 'waves (a travelling band at the nearest foe) cast as shots');
  ok(!forms('surf') && !forms('fly'), 'movement skills (Surf, Fly) have no gym form');
  ok(['recover', 'synthesis', 'moonlight'].every(id => forms(id) === 'heal') && forms('defense-curl') === 'buff' && forms('drain-punch') === 'melee', 'self heals of max HP are the heal form; Defense Curl a buff; a drain stays its shape');
  ok(forms('confusion') === 'shot' && forms('psychic') === 'shot', 'homing shots (Confusion, Psychic) cast as shots');
  // lore-set slice 3 (Jess 2026-11-02): reach from the move data, Razor Leaf range 210, Psybeam 215 long, Fury Attack's jab cone 54
  ok(forms('razor-leaf') === 'returns' && forms('bonemerang') === 'returns' && Gy.reachOf(G.MoveDefs['razor-leaf'], 'returns') === 210, 'Razor Leaf and Bonemerang are the returns form, Razor Leaf reach 210');
  ok(forms('psybeam') === 'beam' && Gy.reachOf(G.MoveDefs.psybeam, 'beam') === 215, 'Psybeam (a static linear shape) is the beam form, reach 215');
  ok(forms('fury-attack') === 'multi' && Gy.reachOf(G.MoveDefs['fury-attack'], 'multi') === 54, 'Fury Attack (three cast-emitted cones) is the multi form, reach 54');
  ok(forms('toxic') === 'trail' && forms('flame-wheel') === 'trail', 'Toxic and Flame Wheel (persistent casterMove emitters) are the trail form');
  ok(!forms('string-shot') && !forms('toxic-spikes'), 'an emitter of shots (String Shot) or a placed emitter (Toxic Spikes) still has no form');
  const flags = mut => { const c = JSON.parse(JSON.stringify(BROCK)); mut(c.signatures[0], c); return Gy.validate(c); };
  const cases = [
    ['unknown card', s => { s.cards.luck = 1; }, 'unknown card luck'],
    ['team card', s => { s.cards.duration = 2; }, 'is a team card'],
    ['card over its cap', s => { s.cards.count = 4; }, 'capped at 3'],
    ['card that fits no move', s => { s.cards.heal = 1; }, 'fits none of its moves'],
    ['fractional stacks', s => { s.cards.damage = 1.5; }, 'whole number of stacks'],
    ['zero stacks', s => { s.cards.area = 0; }, 'whole number of stacks'],
    ['hpBelow out of range', s => { s.sets[1][2].hpBelow = 1.2; }, 'hpBelow must be in (0, 1)'],
    ['unknown move', s => { s.sets[1].push({ id: 'not-a-move' }); }, 'unknown move not-a-move'],
    ['move with no gym form', s => { s.sets[1][1].id = 'rock-slide'; }, 'has no gym form yet'],
    ['old weight field', s => { s.sets[1][0].weight = 2; }, 'unknown field weight'],
    ['old stacks field', s => { s.sets[1][0].stacks = { effect: 1 }; }, 'unknown field stacks'],
    ['no damaging move', s => { s.sets[2] = [{ id: 'harden' }]; }, 'at least one damaging move'],
    ['typo on a slot', s => { s.cardz = {}; }, 'unknown field cardz']
  ];
  for (const [name, mut, needle] of cases) { const out = flags(mut); ok(out.some(m => m.includes(needle)), 'validate missed "' + name + '" (wanted ' + needle + '): ' + JSON.stringify(out)); }
  console.log('1 data: Brock valid; slot 1 loop 1 = Tackle, Defense Curl, Rock Throw, loop 2 on the pilot Tackle, Rock Throw, Harden with Damage 3, Count 2, Velocity 3, Area 2; ' + cases.length + ' negative cases flagged'); }

// 2. the owner: player size, its own folded defs, the player as its only foe
{ fresh(); const e = mkBoss(), b = e.brain;
  ok(e.scale === 1, 'a gym leader mon is drawn at player size (scale ' + e.scale + ')');
  const wild = G.Boss.make({ dex: 74, name: 'Geodude', hp: 100, spd: 40, dmg: 20, xp: 0, behavior: 'chase' }, 0, 0); ok(wild.scale > 1, 'a non-gym boss keeps its enlarged scale');
  const t = b.def('tackle'), r = b.def('rock-throw'), h = b.def('harden');
  ok(near(t.basePower, 52) && near(t.space.radRadius, 54 * Math.sqrt(1.3)) && near(t.space.radArc, 1.7) && near(t.cd, 0.5), 'Tackle folded: Power 52, reach 61.6, arc 1.7, cd 0.5: ' + JSON.stringify([t.basePower, t.space.radRadius, t.space.radArc, t.cd]));
  ok(near(r.basePower, 58.5) && r.space.count === 3 && near(r.space.radRadius, 9 * Math.sqrt(1.3)) && near(r.delivery.moveSpeed, 377) && near(r.cd, 35 / 15 * 0.5, 1e-3), 'Rock Throw folded: Power 58.5, 3 rocks, size 10.3, 377 px/s, cd 1.167: ' + JSON.stringify([r.basePower, r.space.count, r.space.radRadius, r.delivery.moveSpeed, r.cd]));
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
  // out of reach: 54 x sqrt 1.3 = 61.6, + 12 = 73.6 px
  fresh(); const e3 = mkBoss(), b3 = e3.brain; b3.init(); b3.wait = 0; b3.mode = 'close';
  for (const s of e3.slots[0]) if (s.id === 'rock-throw') s.t = 99;     // only Tackle is ready
  pl.x = 75; pl.y = 0; frame(e3); ok(!b3.tell, 'no Tackle tell at 75 px (reach 61.6 + body 12)');
  pl.x = 72; frame(e3); ok(b3.tell && b3.tell.id === 'tackle', 'a Tackle tell at 72 px');
  console.log('3 Tackle: 0.45 s tell, lands at its end with the Power 52 factor ' + tackleFactor().toFixed(1) + ', no knockback, the locked aim misses a sidestep, reach 74 px with your body'); }

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

// 10. riders onto the player (gym-roster, Jess 2026-11-01). Hits are applied straight through G.MoveEffects.applyHit with a fixed roll (0 =
// every chance lands, 0.99 = none does), plus one Body Slam end to end through the brain. Expected values from the move data (Body Slam
// paralysis 30, Sludge poison 30, Ember burn 10, Powder Snow freeze 10, Mud Shot Speed -1 at 100, Metal Claw Attack +1 at 10, Giga Drain
// half of dealt, Hex x2 vs a major, Psycho Cut crit 15, Bite flinch 30), the status table (poison 4 turns), the Gate (6 s x strong-host 1),
// D10 (no base crit, x1.5) and the flinch rule (cooldown + 0.3 s, back half the body at 2x speed, else still 0.2 to 0.3 s, 0.5 s roll gap).
{ const hitWith = (e, id, roll, age = 0, time = 10) => G.MoveEffects.applyHit({ spec: e.brain.def(id), cast: { owner: e, time }, age }, pl, 0, () => roll);
  const boss = (ids) => mkBoss(gymOf({ moves: ids.map(id => ({ id })), cards: {} }));
  // ailments
  { fresh(); const e = boss(['body-slam']); hitWith(e, 'body-slam', 0.99); ok(pl.hurts.length === 1 && !pl.stMajor, 'Body Slam, roll 0.99: damage, no paralysis');
    hitWith(e, 'body-slam', 0); ok(pl.stMajor && pl.stMajor.k === 'paralysis', 'Body Slam, roll 0: paralysis on the player');
    hitWith(e, 'sludge', 0); ok(!pl.stDot, 'Sludge cannot poison a paralyzed player (one major at a time)'); }
  { fresh(); const e = boss(['sludge']); hitWith(e, 'sludge', 0); ok(pl.stDot && pl.stDot.k === 'poison' && pl.stDot.left === 4, 'Sludge poisons through the damage over time: 4 turns: ' + JSON.stringify(pl.stDot));
    fresh(); pl.mon.types = ['poison']; hitWith(e, 'sludge', 0); ok(!pl.stDot, 'a Poison-type player is immune'); pl.mon.types = ['normal'];
    fresh(); hitWith(e, 'ember', 0); ok(pl.stDot && pl.stDot.k === 'burn', 'Ember burns');
    fresh(); hitWith(e, 'powder-snow', 0); ok(pl.stMajor && pl.stMajor.k === 'freeze' && G.Status.stunned(pl), 'Powder Snow freezes');
    fresh(); pl.stWin = { hard: 1 }; hitWith(e, 'powder-snow', 0); ok(!pl.stMajor, 'no freeze inside the 2.5 s hard-CC grace'); }
  // foe drops on your own tracker, the leader's own raise and drain
  { fresh(); const e = boss(['mud-shot']), src = G.MoveEffects.srcOf(e.brain.def('mud-shot'), e);
    hitWith(e, 'mud-shot', 0.99); const t = S.tracker(pl, 'spe', src, false);
    ok(S.stage(pl, 'spe') === -1 && t && near(t.g, 6 * S.STRONG_HOST_GATE_MUL), 'Mud Shot: Speed -1 on your own tracker, the strong-host Gate (6 s): ' + JSON.stringify(t));
    hitWith(e, 'mud-shot', 0.99); ok(S.stage(pl, 'spe') === -1, 'a second hit inside the Gate only refreshes'); }
  { fresh(); const e = boss(['metal-claw']); hitWith(e, 'metal-claw', 0.99); ok(S.stage(e, 'atk') === 0, 'Metal Claw, roll 0.99: no raise');
    hitWith(e, 'metal-claw', 0); ok(S.stage(e, 'atk') === 1 && e.trk && e.trk.atk && S.stage(pl, 'atk') === 0, "Metal Claw, roll 0: Attack +1 on the leader's own tracker, none on you"); }
  { fresh(); const e = boss(['giga-drain']); e.hp = e.maxHp / 2; const h0 = e.hp; pl.loss = 100;
    hitWith(e, 'giga-drain', 0.99); ok(near(e.hp - h0, 50), 'Giga Drain heals the leader half the 100 dealt: ' + (e.hp - h0));
    e.hp = e.maxHp - 10; hitWith(e, 'giga-drain', 0.99); ok(e.hp === e.maxHp, 'the heal stops at max HP');
    pl.loss = 0; e.hp = h0; hitWith(e, 'giga-drain', 0.99); ok(e.hp === h0, 'nothing dealt (a shield took it), no heal'); }
  // recoil (Jess 2026-11-02): Take Down costs the leader 0.25 of the dealt damage, never below 1 HP
  { fresh(); const e = boss(['take-down']); e.hp = 1000; pl.loss = 100;
    hitWith(e, 'take-down', 0.99); ok(near(e.hp, 975), 'Take Down: the leader pays 0.25 of the 100 dealt: ' + e.hp);
    e.hp = 10; hitWith(e, 'take-down', 0.99); ok(e.hp === 1, 'recoil never takes the leader below 1 HP: ' + e.hp);
    pl.loss = 0; e.hp = 1000; hitWith(e, 'take-down', 0.99); ok(e.hp === 1000, 'nothing dealt, no recoil'); }
  // self heal (Jess 2026-11-02, mainline): Recover casts with no tell while hurt, half max HP on its first tick, then its 12 s cooldown
  { fresh(); const e = boss(['tackle', 'recover']); pl.x = 5000; const M = e.maxHp;
    run(e, 1); ok(e.hp === M, 'at full HP no heal is cast');
    e.hp = 0.3 * M; run(e, 0.2); ok(near(e.hp, 0.8 * M), 'hurt to 30%: Recover lands half of max HP at once (80%): ' + (e.hp / M).toFixed(3));
    e.hp = 0.3 * M; run(e, 11); ok(near(e.hp, 0.3 * M), 'no second Recover inside its 12 s cooldown: ' + (e.hp / M).toFixed(3));
    run(e, 1.2); ok(near(e.hp, 0.8 * M), 'the next Recover lands once the 12 s cooldown is up: ' + (e.hp / M).toFixed(3));
    e.hp = 0.8 * M; run(e, 12.5); ok(e.hp === M, 'the heal stops at max HP'); }
  // Hex and crits
  { fresh(); const e = boss(['hex']), hex = (p) => G.Stats.enemyAttackFactor(80, 30, 20, p, 'special');
    hitWith(e, 'hex', 0.99); ok(near(pl.hurts[0].a[0], hex(65)), 'Hex on a clean player: Power 65: ' + pl.hurts[0].a[0]);
    G.Status.apply(pl, 'paralysis'); hitWith(e, 'hex', 0.99); ok(near(pl.hurts[1].a[0], hex(130)), 'Hex vs a paralyzed player: Power 130: ' + pl.hurts[1].a[0]); }
  { fresh(); const e = boss(['psycho-cut']);
    hitWith(e, 'psycho-cut', 0.1); ok(pl.hurts[0].a[3].mul === 1.5 && pl.hurts[0].a[3].crit === true, 'Psycho Cut, roll 0.1 under its 15%: a crit, x1.5');
    hitWith(e, 'psycho-cut', 0.2); ok(pl.hurts[1].a[3].mul === 1 && !pl.hurts[1].a[3].crit, 'Psycho Cut, roll 0.2: no crit');
    hitWith(e, 'tackle', 0); ok(pl.hurts[2].a[3].mul === 1, 'Tackle never crits (no base chance), even on roll 0'); }
  // flinch
  { fresh(); const e = boss(['bite']); plTackle.t = 0.1;
    hitWith(e, 'bite', 0.99); ok(!pl.stFl && plTackle.t === 0.1, 'Bite, roll 0.99: no flinch');
    hitWith(e, 'bite', 0, 0.6); ok(pl.stFl && pl.stFl.ph === 'hold' && pl.stFl.t >= 0.2 && pl.stFl.t <= 0.3, 'Bite, roll 0, standing: still for 0.2 to 0.3 s: ' + JSON.stringify(pl.stFl));
    ok(near(plTackle.t, 0.5 + 0.3), "the active group's Tackle restarts its 0.5 s cooldown plus the 0.3 s hold: " + plTackle.t);
    pl.stFl = null; plTackle.t = 0.1; hitWith(e, 'bite', 0, 0.9); ok(!pl.stFl && plTackle.t === 0.1, 'a second roll 0.3 s later is skipped (0.5 s gap)');
    hitWith(e, 'bite', 0, 1.15); ok(!!pl.stFl, 'a roll 0.55 s after the last lands');
    fresh(); G.Status.apply(pl, 'sleep'); plTackle.t = 0.1; hitWith(e, 'bite', 0); ok(!pl.stFl && plTackle.t === 0.1, 'an asleep player cannot flinch');
    fresh(); pl.walking = true; pl.svx = 100; pl.svy = 0; hitWith(e, 'bite', 0);
    ok(pl.stFl && pl.stFl.ph === 'back' && near(pl.stFl.dx, -1) && near(pl.stFl.sp, 200) && near(pl.stFl.t, 6 / 200), 'moving at 100 px/s: back at 200 px/s for half the body (6 px): ' + JSON.stringify(pl.stFl));
    const v = pl.flinchMove(DT); ok(near(v[0], -200) && v[1] === 0, 'the recoil velocity points back');
    for (let i = 0; i < 40 && pl.stFl; i++) pl.flinchMove(DT); ok(!pl.stFl, 'the flinch ends after the recoil and the hold');
    plTackle.t = Infinity; }
  { const g = [{ id: 'tackle', t: 0.1 }, { id: 'swords-dance', t: 0 }, { id: 'aqua-ring', t: 0.2 }, { id: 'rock-throw', t: 0 }], other = [{ id: 'tackle', t: 0.1 }];
    Sim.flinch({ activeGroup: () => g, slots: [g, other], cdMul: 0.5 });
    ok(near(g[0].t, 0.25 + 0.3) && near(g[3].t, G.MoveDefs['rock-throw'].cd * 0.5 + 0.3), 'every cooldown move of the group restarts (cdMul 0.5) plus the hold: ' + [g[0].t, g[3].t]);
    ok(g[1].t === 0 && g[2].t === 0.2 && other[0].t === 0.1, 'a pure buff, a persistent aura and the inactive group are untouched'); }
  // end to end: the brain's Body Slam paralyzes, with no console note
  { fresh(); warns.length = 0; Sim.setRng(() => 0); const e = boss(['body-slam']), b = e.brain; b.init(); b.wait = 0; b.mode = 'close'; pl.x = 50; run(e, 1.5);
    ok(pl.hurts.length >= 1 && pl.stMajor && pl.stMajor.k === 'paralysis', 'a Body Slam cast by the brain paralyzes the player');
    ok(!warns.some(w => w.includes('body-slam')), 'no "not applied" note any more'); Sim.setRng(rnd); }
  // the opportunity factor (boss-ai.js opp)
  { fresh(); const e = boss(['hex', 'thunder-shock', 'mud-shot', 'confusion', 'tackle']), b = e.brain, o = id => b.opp(b.def(id), pl);
    ok(o('hex') === 1 && o('thunder-shock') === 1 && o('mud-shot') === 1.25 && o('confusion') === 1 && o('tackle') === 1, 'clean player: only the drop move is up (1.25)');
    G.Status.apply(pl, 'paralysis');
    ok(o('hex') === 1.5 && o('thunder-shock') === 0.75 && o('confusion') === 1, 'paralyzed: Hex x1.5, Thunder Shock x0.75, Confusion (not a major) x1');
    hitWith(e, 'mud-shot', 0.99); ok(o('mud-shot') === 1, 'once Mud Shot has dropped you, its opportunity is back to 1'); }
  fresh();
  console.log('10 riders: ailments (paralysis, poison 4 turns, burn, freeze, one major, immunity, grace), Mud Shot -1 on your tracker, Metal Claw +1 on the leader, Giga Drain half of dealt, Hex x2, Psycho Cut crit x1.5 and no base crit, flinch (+0.3 s hold, recoil, 0.5 s gap, not asleep), opportunity 1.5 / 0.75 / 1.25'); }

// 11. the shared sim: MoveRoute.tick steps every instance once per frame; an enemy cast is not the player's cast
{ fresh(); ok(G.MoveRoute.routed('tackle') && G.MoveRoute.on === undefined, 'the new path is the only path (no flag since 7b)');
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

// 13. new forms (gym-roster): chains search the caster's foes, novas, strikes, homing. Expected numbers from the move data: Thunder Shock
// hopRange 60, Bulldoze grows to 200, Dazzling Gleam to 130, Thunderbolt radius 10 at the default range 420, Confusion turns 3 rad/s.
{ const one = (id) => { fresh(); const e = mkBoss(gymOf({ moves: [{ id }], cards: {} })), b = e.brain; b.init(); b.wait = 0; b.mode = 'far'; return [e, b]; };
  // a wild enemy beside the player: a leader's chain must never hop to it, nor to the leader itself
  const decoy = { id: 9001, x: 0, y: 0, r: 10, dead: false, types: ['normal'], hits: 0, hurt() { this.hits++; }, applyBurn() {}, applyPoison() {}, applyFlinch() {} };
  const savedMgr = G.EnemyMgr; G.EnemyMgr = { queryCircleEach: (x, y, R, f) => { if (Math.hypot(decoy.x - x, decoy.y - y) <= R) f(decoy); }, queryCircle: () => [decoy], all: () => [decoy] };
  { const [e, b] = one('thunder-shock'); pl.x = 200; pl.y = 0; decoy.x = 230; decoy.y = 0; decoy.hits = 0; const hp0 = e.hp;
    frame(e); ok(b.tell && b.tell.form === 'shot' && b.tell.id === 'thunder-shock', 'a Thunder Shock tell at 200 px');
    run(e, 1.2); ok(pl.hurts.length === 1, 'Thunder Shock hits the player once: ' + pl.hurts.length);
    ok(decoy.hits === 0 && e.hp === hp0, 'its hop never reaches a wild enemy 30 px away, nor the leader');
    // co-op ready: a second foe within the 60 px hop range takes the hop
    fresh(); const [e2, b2] = one('thunder-shock'), pl2 = { x: 240, y: 0, r: 12, dead: false, mon: { types: ['normal'] }, hurts: [], hurt(...a) { this.hurts.push(a); } };
    e2.foes = () => [pl, pl2]; pl.x = 200; pl.y = 0; run(e2, 1.2);
    ok(pl.hurts.length === 1 && pl2.hurts.length === 1, 'with two foes 40 px apart the chain hops to the second: ' + [pl.hurts.length, pl2.hurts.length]); }
  { const [e, b] = one('hex'); pl.x = 200; pl.y = 0; decoy.x = 260; decoy.hits = 0; run(e, 1.2);
    ok(casts.hex >= 1 && pl.hurts.length >= 1 && decoy.hits === 0, 'Hex is cast, hits the player and never hops to the wild enemy'); }
  { const [e, b] = one('bulldoze'); pl.x = 155; pl.y = 0; frame(e); ok(!b.tell, 'no Bulldoze tell at 155 px (reach 140 + body 12)');
    pl.x = 145; frame(e); ok(b.tell && b.tell.form === 'nova' && near(b.tell.wind, 0.45), 'a 0.45 s nova tell at 145 px');
    run(e, 1); ok(pl.hurts.length === 1, 'the ring reaches the player at 145 px: ' + pl.hurts.length);
    ok(near(b.reach(), 140), "the brain's close reach is the nova's full growth (140)"); }
  { const [e, b] = one('dazzling-gleam'); pl.x = 140; pl.y = 0; frame(e); ok(b.tell && b.tell.form === 'nova', 'a Dazzling Gleam tell at 140 px (reach 130 + body 12)');
    run(e, 1); ok(pl.hurts.length === 1, 'Dazzling Gleam lands (it never could as a 1 px melee): ' + pl.hurts.length);
    const [e2, b2] = one('dazzling-gleam'); pl.x = 100; pl.y = 0; frame(e2); pl.x = -100; run(e2, 1); ok(pl.hurts.length === 0, 'its half ring keeps the locked aim and misses a player behind it'); }
  { const [e, b] = one('thunderbolt'); pl.x = 430; pl.y = 0; frame(e); ok(!b.tell, 'no Thunderbolt tell past its 420 px range');
    pl.x = 300; decoy.x = 300; decoy.y = 15; decoy.hits = 0; frame(e);
    ok(b.tell && b.tell.form === 'strike' && near(b.tell.wind, 0.5) && b.tell.spot && b.tell.spot.x === 300 && b.tell.spot.y === 0, "a 0.5 s strike tell locks the player's spot");
    run(e, 0.8); ok(pl.hurts.length === 1 && decoy.hits === 0, 'it lands on the player who stayed, and does not hop to the wild enemy: ' + [pl.hurts.length, decoy.hits]);
    const [e2, b2] = one('thunderbolt'); pl.x = 300; pl.y = 0; frame(e2); pl.y = 40; run(e2, 0.8); ok(pl.hurts.length === 0, 'a player 40 px off the spot (radius 10 + body 12) is missed'); }
  { const [e, b] = one('confusion'); pl.x = 200; pl.y = 0; frame(e); ok(b.tell && near(b.tell.ang, 0), 'a Confusion tell aimed at 0');
    pl.y = 60; run(e, 1.6); ok(pl.hurts.length === 1, 'the shot homes on the player, who moved 60 px off the locked aim: ' + pl.hurts.length); }
  G.EnemyMgr = savedMgr; pl.x = 0; pl.y = 0;
  console.log('13 forms: Thunder Shock and Hex hop only between foes (a second player takes the hop), Bulldoze and Dazzling Gleam novas, Thunderbolt strike on a locked spot, Confusion homes'); }

// 14. the utility pick (Jess 2026-11-01): score = freshness (seconds since the move's last tell started, over its cooldown) x fit (0.5 for a
// shot or strike inside the mon's close reach, else 1); ties by form order, then group order. Cooldowns from the move data, no cards:
// Tackle 0.5, Rock Throw 1.167, Thunder Shock 0.583, Confusion 0.7, Psychic 1.75. Expected values hand-derived from those. Psychic sets are
// scored at 150 px, inside Psychic's 166 px flight (section 15).
{ const mk3 = (ids) => { fresh(); const e = mkBoss(gymOf({ moves: ids.map(id => ({ id })), cards: {} })), b = e.brain; b.init(); b.wait = 0; b.mode = 'far'; return [e, b]; };
  const slot = (e, id) => e.slots[0].find(x => x.id === id);
  { const [e, b] = mk3(['thunder-shock', 'confusion', 'psychic']); b.t0 = 0; const T = 10; pl.x = 300; pl.y = 0;
    slot(e, 'thunder-shock').last = T - 1; slot(e, 'confusion').last = T - 1; slot(e, 'psychic').last = T - 4;   // 1.715, 1.429, 2.286 x 1.25 (its drop is not on you)
    b.attack(150, pl, T); ok(b.tell && b.tell.id === 'psychic', 'the stalest move by its own cooldown wins: Psychic 4/1.75 x 1.25 = 2.86 over Thunder Shock 1/0.583 = 1.71');
    const sc = Object.fromEntries(b.scores.map(x => [x.id, x.score]));
    ok(near(sc['thunder-shock'], 1 / 0.583, 1e-2) && near(sc.confusion, 1 / 0.7, 1e-2) && near(sc.psychic, 4 / 1.75 * 1.25, 1e-2), 'scores are seconds over cooldown (x opportunity): ' + JSON.stringify(sc));
    ok(b.scores.filter(x => x.picked).length === 1 && b.scores.find(x => x.picked).id === 'psychic', 'the overlay record marks one pick');
    ok(slot(e, 'psychic').last === T, 'the pick stamps its last cast at the tell start');
    const [e2, b2] = mk3(['thunder-shock', 'confusion', 'psychic']); b2.t0 = 0;
    slot(e2, 'thunder-shock').last = T - 1; slot(e2, 'confusion').last = T - 1; slot(e2, 'psychic').last = T - 2.3;   // 1.715 vs 1.643
    b2.attack(150, pl, T); ok(b2.tell && b2.tell.id === 'thunder-shock', 'Psychic at 2.3/1.75 x 1.25 = 1.64 loses to Thunder Shock at 1.71'); }
  { const [e, b] = mk3(['psychic', 'thunder-shock']); b.t0 = 5; b.attack(150, pl, 5);
    ok(b.tell && b.tell.id === 'psychic', 'equal scores (both never cast, 0) go to the first move in the group'); }
  { const [e, b] = mk3(['rock-throw', 'tackle']); b.t0 = 5; b.attack(60, pl, 5);
    ok(b.tell && b.tell.id === 'tackle', 'equal scores go to the earlier form: melee before shot, whatever the group order'); }
  { const [e, b] = mk3(['tackle', 'rock-throw']); b.t0 = 0; const T = 10;
    slot(e, 'tackle').last = T - 1; slot(e, 'rock-throw').last = T - 1;
    b.attack(60, pl, T); let sc = Object.fromEntries(b.scores.map(x => [x.id, x.score]));
    ok(b.tell && b.tell.id === 'tackle' && near(sc.tackle, 2, 1e-2) && near(sc['rock-throw'], 0.5 / 1.167, 1e-2), 'point-blank (60 px, inside Tackle 70 + body 12): Tackle 2, Rock Throw halved to 0.43: ' + JSON.stringify(sc));
    slot(e, 'tackle').last = T - 1; slot(e, 'rock-throw').last = T - 6; b.tell = null;
    b.attack(60, pl, T); sc = Object.fromEntries(b.scores.map(x => [x.id, x.score]));
    ok(b.tell && b.tell.id === 'rock-throw' && near(sc['rock-throw'], 0.5 * 6 / 1.167, 1e-2), 'a stale enough shot still wins point-blank: 0.5 x 6 / 1.167 = 2.57 over Tackle 2');
    b.tell = null; slot(e, 'rock-throw').last = T - 1; b.attack(300, pl, T); sc = Object.fromEntries(b.scores.map(x => [x.id, x.score]));
    ok(b.tell && b.tell.id === 'rock-throw' && !('tackle' in sc) && near(sc['rock-throw'], 1 / 1.167, 1e-2), 'at 300 px Tackle is out of reach and Rock Throw keeps its full score: ' + JSON.stringify(sc)); }
  { const [e, b] = mk3(['rock-throw', 'harden']); b.t0 = 0; slot(e, 'rock-throw').last = 9; b.attack(30, pl, 10);
    ok(b.scores.length === 1 && near(b.scores[0].score, 1 / 1.167, 1e-2), 'a mon with no close move gets no point-blank cut at 30 px; a buff is never scored'); }
  { const [e, b] = mk3(['tackle', 'rock-throw']); pl.x = 60; frame(e); const t = clock; ok(b.tell, 'a tell to flinch');
    const id = b.tell && b.tell.id; e.applyFlinch();
    ok(!b.tell && id && slot(e, id).last === t, 'a flinched tell still stamps its move (' + id + ') as used at the tell start'); }
  // the two starvation sets from the 2026-11-01 browser run: every move is cast within 25 s
  const sets = [[['bulldoze', 'thunderbolt', 'thunder-shock', 'confusion'], 145], [['thunder-shock', 'confusion', 'psychic'], 150]];
  const outs = [];
  for (const [ids, at] of sets) { const [e] = mk3(ids); pl.x = at; pl.y = 0; run(e, 25);
    for (const id of ids) ok(casts[id] >= 1, ids.join('+') + ' at ' + at + ' px: ' + id + ' cast within 25 s: ' + JSON.stringify(casts));
    outs.push(ids.map(id => id + ' ' + (casts[id] || 0)).join(', ')); }
  pl.x = 0; pl.y = 0;
  console.log('14 utility pick: freshness over cooldown, point-blank cut 0.5, ties by form then group order, flinch counts as used; starvation sets now rotate: ' + outs.join(' | ')); }

// 15. shot reach from flight (Jess 2026-11-01): a shot reaches speed x lifetime + size, capped at its range (default 420), with no credit
// for homing; far mode keeps you inside its longest ready shot or strike. From the move data, no cards: Shadow Ball 280 x 1.2 + 9 = 345,
// Psychic 80 x 1.2 + 70 = 166, Rock Throw 260 x 1.4 + 9 = 373, Thunder Shock 480 x 1.5 + 7 = 727 -> 420, Confusion 280 x 1.6 + 7 = 455 -> 420.
{ const one = (ids) => { fresh(); const e = mkBoss(gymOf({ moves: ids.map(id => ({ id })), cards: {}, stance: 'far' })), b = e.brain; b.init(); b.wait = 0; b.mode = 'far'; return [e, b]; };
  const R = (id) => Gy.reachOf(G.MoveDefs[id], Gy.formOf(G.MoveDefs[id]));
  ok(near(R('shadow-ball'), 345) && near(R('psychic'), 166) && near(R('rock-throw'), 373), 'flight reach: Shadow Ball 345, Psychic 166, Rock Throw 373: ' + [R('shadow-ball'), R('psychic'), R('rock-throw')]);
  ok(R('thunder-shock') === 420 && R('confusion') === 420, 'long and homing shots cap at the 420 range: ' + [R('thunder-shock'), R('confusion')]);
  { const [e, b] = one(['shadow-ball']); pl.x = 350; pl.y = 0; frame(e); ok(!b.tell, 'no Shadow Ball tell at 350 px (flies 345)');
    pl.x = 340; frame(e); ok(b.tell && b.tell.id === 'shadow-ball', 'a Shadow Ball tell at 340 px'); }
  { const [e, b] = one(['thunder-shock']); pl.x = 430; pl.y = 0; frame(e); ok(!b.tell, 'no Thunder Shock tell at 430 px (capped at 420)');
    pl.x = 410; frame(e); ok(b.tell && b.tell.id === 'thunder-shock', 'a Thunder Shock tell at 410 px'); }
  { const [e, b] = one(['psychic', 'harden']); ok(near(b.ranged(), 166), 'the far band follows the ready Psychic (166)');
    e.slots[0][0].t = 1; ok(b.ranged() === Infinity, 'with Psychic recharging there is no short ranged move: the 170 to 300 band');
    const [e2, b2] = one(['rock-throw']); ok(near(b2.ranged(), 373), 'Rock Throw ready: 373, the band stays 170 to 300'); }
  // the walk-in: a far-stance Psychic user 250 px away, free to move (not held), steps in and lands it
  { const [e, b] = one(['psychic']); pl.x = 250; pl.y = 0; let minD = Infinity;
    for (let i = 0; i < 8 * 60; i++) { clock += DT; e.kx = e.ky = 0; e.update(DT, pl); G.MoveRoute.tick(DT, pl, clock); minD = Math.min(minD, Math.hypot(pl.x - e.x, pl.y - e.y)); }
    ok(casts.psychic >= 1 && pl.hurts.length >= 1, 'a far Psychic user walks in and lands it within 8 s: casts ' + (casts.psychic || 0) + ', hits ' + pl.hurts.length + ', closest ' + Math.round(minD) + ' px');
    ok(minD < 166 && minD >= 166 - 20 - 40 - 5, 'it closes inside 166 but keeps the shrunk band (no closer than about 106 px): ' + Math.round(minD)); }
  pl.x = 0; pl.y = 0;
  console.log('15 shot reach: flight capped at range (Shadow Ball 345, Psychic 166, Thunder Shock and Confusion 420); far mode walks in for a short ready shot'); }

// 12. guards: the old picker, stacks and kind reads are gone from the gym path
{ const brain = read('js/entities/boss-ai.js'), gyms = read('js/data/gyms.js'), gym = fs.readFileSync(R + '/js/systems/gym.js', 'utf8');
  ok(!/\bkind\b/.test(brain.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/kind: '(beam|zone)'/g, '')), 'boss-ai.js reads no kind (a G.Hazards warning shape, beam or zone, is not a move kind)');
  ok(!/Moves\.BY_ID|addStack|BOSS_FORMS/.test(brain + gyms + gym), 'no legacy move table, addStack or BOSS_FORMS on the gym path');
  ok(!/\.weight\b|\bpick\(|cdAfter/.test(brain), 'no weight picker left in the brain');
  console.log('12 guards: no kind, BY_ID, addStack, BOSS_FORMS or weight picker on the gym path'); }

// 16. dash form (Jess 2026-11-02): Quick Attack from the move data: range 420, hit circle 46, dashMult 10 x the mon's speed (40 here, so
// 400 px/s), back to its start, i-frames the whole dash plus 0.3 s. Wind-up 0.6 s (TUNE). The boss is NOT held in place here.
{ const free = (secs) => { for (let i = 0, N = Math.round(secs / DT); i < N; i++) { clock += DT; e.update(DT, pl); G.MoveRoute.tick(DT, pl, clock); } };
  const boss = (ids) => mkBoss(gymOf({ moves: ids.map(id => ({ id })), cards: {} })), at = [];
  const off = G.SimBus.on('move:cast', ev => { if (ev.moveId === 'quick-attack') at.push({ x: ev.x, y: ev.y, t: clock }); });
  let e;
  // a) the warning, the hit at the locked spot, the way back
  { fresh(); hazards.length = 0; at.length = 0; e = boss(['quick-attack']); e.x = 0; e.y = 0; pl.x = 200; pl.y = 0;
    let tellAt = null; for (let i = 0; i < 120 && tellAt == null; i++) { free(DT); if (e.brain.tell) tellAt = clock; }
    ok(tellAt != null && e.brain.tell.form === 'dash', 'the leader starts a dash tell at 200 px');
    const sx = e.x, sy = e.y, spot = e.brain.tell.spot, len = Math.min(Math.hypot(spot.x - sx, spot.y - sy), 420);
    const line = hazards.find(h => h.kind === 'beam'), zone = hazards.find(h => h.kind === 'zone');
    ok(line && line.warn && near(line.len, len) && line.w === 92 && near(line.delay, 0.6) && zone && zone.warn && zone.r === 46 && near(zone.x, sx + (spot.x - sx) * len / Math.hypot(spot.x - sx, spot.y - sy)),
      'the tell shows a warn-only line to the locked spot (len ' + (line && line.len.toFixed(1)) + ', width 92, 0.6 s) and the 46 px circle there');
    free(0.6); ok(at.length === 1, 'the dash casts when the 0.6 s wind-up ends');
    const hurts0 = pl.hurts.length; let maxOut = 0, inv = true, hitT = null;
    free(DT); ok(e.mvRoot, 'the dash is live (the body is rooted to it)');
    for (let i = 0; i < 120 && e.mvRoot; i++) { free(DT); maxOut = Math.max(maxOut, Math.hypot(e.x - sx, e.y - sy)); if (e.mvRoot && !(e.invuln > 0)) inv = false; if (hitT == null && pl.hurts.length > hurts0) hitT = clock; }
    ok(pl.hurts.length === hurts0 + 1, 'one hit on a player standing on the locked spot (' + (pl.hurts.length - hurts0) + ')');
    ok(near(maxOut, Math.hypot(spot.x - sx, spot.y - sy), 1e-3), 'it dashes all the way to the locked spot: ' + maxOut.toFixed(1));
    ok(!e.mvRoot && Math.hypot(e.x - sx, e.y - sy) < 1e-6, 'and back to its start, unrooted');
    ok(inv, 'i-frames on the whole dash');
    const hp = e.hp = 1e5; e.hurt(500); ok(e.invuln > 0 && e.hp === hp, 'just after the dash, inside the 0.3 s tail, a hit misses');
    free(0.35); e.hurt(500); ok(e.hp === hp - 500, 'after the tail a hit lands: ' + (hp - e.hp)); }
  // b) a player who steps aside during the wind-up is missed
  { fresh(); hazards.length = 0; at.length = 0; e = boss(['quick-attack']); e.x = 0; e.y = 0; pl.x = 200; pl.y = 0;
    for (let i = 0; i < 120 && !e.brain.tell; i++) free(DT);
    pl.y = 120; const h0 = pl.hurts.length; free(2); ok(at.length >= 1 && pl.hurts.length === h0, 'a player who moved 120 px off the locked spot is missed (46 + 12 < 120)'); }
  // c) out of range: no dash; a wall cuts it short
  { fresh(); e = boss(['quick-attack']); e.x = 0; e.y = 0; pl.x = 460; pl.y = 0; let told = false;
    for (let i = 0; i < 60; i++) { clock += DT; e.x = 0; e.y = 0; e.update(DT, pl); G.MoveRoute.tick(DT, pl, clock); if (e.brain.tell) told = true; }
    ok(!told, 'no dash tell at 460 px, past the 420 range'); }
  { fresh(); at.length = 0; const W = G.World.isFree; G.World.isFree = (x) => x < 100; e = boss(['quick-attack']); e.x = 0; e.y = 0; pl.x = 200; pl.y = 0;
    for (let i = 0; i < 120 && !e.brain.tell; i++) free(DT);
    const sx = e.x; let maxX = -1e9; free(0.6); for (let i = 0; i < 90; i++) { free(DT); maxX = Math.max(maxX, e.x); }
    G.World.isFree = W; ok(maxX < 100 && maxX > sx, 'a wall at x 100 stops the dash short: furthest x ' + maxX.toFixed(1)); }
  off && off();
  console.log('16 dash: warn line and circle at the locked spot, one hit there, back to the start, i-frames + 0.3 s tail, a sidestep dodges, 420 range, walls cut it'); }

// 17. lore-set slice 3 forms (Jess 2026-11-02), from the move data: Razor Leaf 2 leaves radius 6 in a 0.5 rad fan (each 0.25 rad off the
// aim), 210 px out at 330 px/s and back, one hit per leaf per leg; Psybeam a 215 x 30 line for 0.5 s; Fury Attack 3 cones of radius 54
// every 0.11 s, each re-aimed at the nearest foe; Toxic a persistent trail, one 22 px puddle per 0.1 s of moving time, poison 100.
// Wind-ups (TUNE): returns and beam 0.5 s, multi 0.45 s. The player's body radius is 12. The boss is held in place unless it walks.
{ const one = (ids) => { fresh(); hazards.length = 0; const e = mkBoss(gymOf({ moves: ids.map(id => ({ id })), cards: {} })), b = e.brain; b.init(); b.wait = 0; return [e, b]; };
  const ends = [], emits = [];
  const offE = G.SimBus.on('move:end', ev => ends.push(ev)), offM = G.SimBus.on('move:emit', ev => emits.push(ev));
  // a) returns: at 60 px dead ahead each leaf passes 60 x sin 0.25 = 14.8 px off the player (< 6 + 12), so 2 leaves x 2 legs = 4 hits;
  // at 150 px the gap is 37 px, so a player dead centre slips between them
  { const [e, b] = one(['razor-leaf']); pl.x = 60; pl.y = 0; ends.length = 0; frame(e);
    ok(b.tell && b.tell.form === 'returns' && near(b.tell.wind, 0.5), 'a 0.5 s returns tell at 60 px');
    for (let i = 0; i < 180 && ends.filter(ev => ev.moveId === 'razor-leaf').length < 2; i++) frame(e); // until both leaves of the first throw end
    ok(pl.hurts.length === 4, 'two leaves, out and back, hit a player at 60 px four times: ' + pl.hurts.length);
    const rl = ends.filter(ev => ev.moveId === 'razor-leaf');
    ok(rl.length === 2 && rl.every(ev => ev.reason === 'returned'), 'both leaves end by returning to the leader: ' + rl.map(ev => ev.reason)); }
  { const [e, b] = one(['razor-leaf']); pl.x = 150; pl.y = 0; run(e, 2.5); ok(casts['razor-leaf'] >= 1 && pl.hurts.length === 0, 'a player 150 px dead ahead slips between the two leaves'); }
  { const [e, b] = one(['razor-leaf']); pl.x = 240; pl.y = 0; frame(e); ok(!b.tell, 'no returns tell at 240 px, past its 210 range'); }
  // b) beam: a warning line along the locked aim, one hit, a sidestep past 15 + 12 px dodges it
  { const [e, b] = one(['psybeam']); pl.x = 200; pl.y = 0; frame(e);
    const line = hazards.find(h => h.kind === 'beam');
    ok(b.tell && b.tell.form === 'beam' && near(b.tell.wind, 0.5), 'a 0.5 s beam tell at 200 px');
    ok(line && line.warn && line.len === 215 && line.w === 30 && near(line.delay, 0.5) && near(line.angle, 0), 'the tell shows a warn-only line 215 long, 30 wide, for 0.5 s along the aim');
    run(e, 1.2); ok(pl.hurts.length === 1, 'Psybeam hits the player who stayed once: ' + pl.hurts.length); }
  { const [e, b] = one(['psybeam']); pl.x = 200; pl.y = 0; frame(e); pl.y = 40; run(e, 1.2); ok(casts.psybeam >= 1 && pl.hurts.length === 0, 'a player 40 px off the locked line is missed'); }
  { const [e, b] = one(['psybeam']); pl.x = 235; pl.y = 0; frame(e); ok(!b.tell, 'no beam tell at 235 px, past 215 + 12'); }
  // c) multi: three jabs, each re-aimed, so a player who walks behind the leader during the wind-up still takes all three
  { const [e, b] = one(['fury-attack']); pl.x = 40; pl.y = 0; frame(e);
    ok(b.tell && b.tell.form === 'multi' && near(b.tell.wind, 0.45), 'a 0.45 s multi tell at 40 px');
    pl.x = -40; run(e, 1); ok(pl.hurts.length === 3, 'three jabs, each re-aimed, hit a player who moved behind the leader: ' + pl.hurts.length); }
  { const [e, b] = one(['fury-attack']); pl.x = 70; pl.y = 0; frame(e); ok(!b.tell, 'no multi tell at 70 px, past 54 + 12');
    ok(near(b.reach(), 54) && b.melee, 'the burst is a close move: the brain walks in for it, reach 54'); }
  { const [e, b] = one(['fury-attack', 'body-slam']); ok(b.contact === 'body-slam', 'contact stays the melee cone (Body Slam), not the burst'); }
  // d) trail: a persistent slot, puddles only while the leader moves, ended by a stun and a faint, back after the stun
  { const [e, b] = one(['toxic']); pl.x = 300; pl.y = 300; emits.length = 0; run(e, 1);
    ok(Sim.persisted(e).length === 1 && Sim.persisted(e)[0].moveId === 'toxic', 'Toxic lives as a persistent group while it is in the active group');
    ok(!emits.some(ev => ev.moveId === 'toxic') && !b.tell, 'a leader standing still drops no puddles, and the trail never starts a tell');
    let x = 0; pl.x = 60; pl.y = 0; run(e, 1, { each: () => { x += 2; }, get bx() { return x; } });
    const n = emits.filter(ev => ev.moveId === 'toxic').length;
    ok(n >= 9 && n <= 10, '1 s of walking drops about 10 puddles (one per 0.1 s of moving time): ' + n);
    ok(G.Status.majorKind(pl) === 'poison', 'a player standing on the trail is poisoned');
    G.Status.apply(e, 'sleep'); frame(e, { bx: x }); ok(Sim.persisted(e).length === 0, 'a stun ends the trail');
    G.Status.clear(e); frame(e, { bx: x }); ok(Sim.persisted(e).length === 1, 'the trail comes back once the stun is gone');
    e.dead = true; G.MoveRoute.tick(DT, pl, clock); ok(Sim.persisted(e).length === 0, 'a faint ends the trail'); }
  offE && offE(); offM && offM(); pl.x = 0; pl.y = 0;
  console.log('17 slice-3 forms: Razor Leaf 4 hits at 60 px and returns (a centred player slips the gap at 150), Psybeam warn line and one hit, Fury Attack 3 re-aimed jabs, Toxic trail only while moving, ended by stun and faint'); }

// 18. lore-set imports (Jess 2026-11-02, MOVE-INTENT roar, fissure, future-sight), from the approved proposals: Roar a ring growing
// to 160 px, no damage, push 140 px, cd 5; Fissure power 120, a 60 px strike, 30% one-hit KO on wild foes only; Future Sight power
// 120, a 60 px mark hit 2 s after the cast. The player's push lasts 0.2 s, so 140 px is 700 px/s.
{ const one = (ids) => { fresh(); hazards.length = 0; const e = mkBoss(gymOf({ moves: ids.map(id => ({ id })), cards: {} })), b = e.brain; b.init(); b.wait = 0; return [e, b]; };
  const pushes = []; pl.push = function (dx, dy, k) { pushes.push({ dx, dy, k }); return G.Player.prototype.push.call(this, dx, dy, k); };
  // a) Roar: a nova with no damage that pushes the player 140 px straight away from the leader
  { const [e, b] = one(['roar']); pl.x = 100; pl.y = 0; pushes.length = 0; frame(e);
    ok(b.tell && b.tell.form === 'nova' && near(b.tell.wind, 0.45), 'a 0.45 s Roar tell at 100 px (reach 160 + body 12)');
    run(e, 1); const p = pushes[0];
    ok(pushes.length === 1 && p.k === 140 && near(Math.atan2(p.dy, p.dx), 0, 1e-3) && pl.hurts.length === 0, 'Roar pushes the player once, 140 px away from the leader, with no damage: ' + JSON.stringify(pushes));
    ok(pl.stPush && near(pl.stPush.vx, 700) && near(pl.stPush.vy, 0) && near(pl.stPush.t, 0.2), 'the push is a 0.2 s slide at 700 px/s');
    ok(near(e.brain.def('roar').cd, 5), 'Roar cd 5'); pl.stPush = null; }
  { const [e, b] = one(['roar']); pl.x = 0; pl.y = 0; pl.flyT = 1; pushes.length = 0; G.Player.prototype.push.call(pl, 1, 0, 140); ok(!pl.stPush, 'a flying player is never pushed'); pl.flyT = 0; }
  // the player's Roar on enemies: a wild one slides, a boss or an elite does not
  { const roar = G.MoveDefs.roar, mk = (o) => Object.assign({ id: 7000 + Math.random(), x: 50, y: 0, r: 10, dead: false, kx: 0, ky: 0, types: ['normal'], hurt() {} }, o),
      cast = { spec: roar, cast: { owner: pl, time: 0 }, x: 0, y: 0, age: 0 };
    const w = mk(), bo = mk({ boss: true }), el = mk({ elite: true });
    for (const t of [w, bo, el]) G.MoveEffects.applyHit(cast, t, 0, () => 0);
    ok(w.kx === 140 && w.ky === 0 && bo.kx === 0 && el.kx === 0, 'the player\'s Roar slides a wild enemy (knock 140 away) and never a boss or an elite: ' + [w.kx, bo.kx, el.kx]); }
  // b) Fissure: the KO roll on wild foes only; on the player a strike of power 120
  { const fx = G.MoveDefs.fissure.payload.find(f => f.handler === 'ohkoWild'), only = { spec: Object.assign({}, G.MoveDefs.fissure, { payload: [fx] }), cast: { owner: pl, time: 0 }, x: 0, y: 0, age: 0 };
    const mk = (o) => Object.assign({ x: 0, y: 0, r: 10, dead: false, hp: 500, shield: 0, types: ['normal'], hurt(n) { this.hp -= n; if (this.hp <= 0) this.dead = true; } }, o);
    const w1 = mk(), w2 = mk(), bo = mk({ boss: true }), gy = mk({ gym: {} }), el = mk({ elite: true });
    G.MoveEffects.applyHit(only, w1, 0, () => 0.29); G.MoveEffects.applyHit(only, w2, 0, () => 0.3);
    for (const t of [bo, gy, el]) G.MoveEffects.applyHit(only, t, 0, () => 0);
    ok(fx.koChance === 30 && w1.dead && !w2.dead, 'a wild foe is KO\'d on a roll under 0.30 and not at 0.30');
    ok(!bo.dead && !gy.dead && !el.dead && bo.hp === 500 && gy.hp === 500 && el.hp === 500, 'a boss, a gym mon and an elite are never KO\'d outright'); }
  { const [e, b] = one(['fissure']); pl.x = 200; pl.y = 0; warns.length = 0; frame(e);
    ok(b.tell && b.tell.form === 'strike' && near(b.tell.wind, 0.5) && b.tell.spot.x === 200, 'a 0.5 s Fissure strike tell locks the player\'s spot');
    run(e, 0.8); ok(pl.hurts.length === 1 && !pl.dead && !warns.some(w => /ohkoWild/.test(w)), 'one power-120 hit on the player, never a KO, and no unapplied-effect note');
    ok(e.brain.def('fissure').basePower === 120, 'Fissure Power 120'); }
  // c) Future Sight: no tell, the mark sits on the player's spot at the cast, hits 2 s later; a step of 80 px (> 60 + 12) dodges it
  { const [e, b] = one(['future-sight']); pl.x = 200; pl.y = 0; let at = null;
    for (let i = 0; i < 10 && at == null; i++) { frame(e); if (casts['future-sight']) at = clock; }
    const mark = Sim.list().find(i => i.spec.id === 'future-sight');
    ok(at != null && at <= 2 * DT + 1e-9 && b.tell && b.tell.form === 'delayed', 'the mark is cast at once (no wind-up), as the delayed form');
    ok(mark && near(mark.x, 200) && near(mark.y, 0), 'the mark sits on the player\'s spot at the cast: ' + (mark && [mark.x, mark.y]));
    run(e, 1.9); ok(pl.hurts.length === 0, 'no hit before the 2 s delay');
    run(e, 0.3); ok(pl.hurts.length === 1, 'one hit when it lands on the player who stayed: ' + pl.hurts.length); }
  { const [e, b] = one(['future-sight']); pl.x = 200; pl.y = 0; frame(e); frame(e); pl.y = 80; run(e, 2.3); ok(casts['future-sight'] >= 1 && pl.hurts.length === 0, 'a player who stepped 80 px away is missed'); }
  { // a wild enemy beside the leader: a leader's mark still goes on the player, never on the wild enemy (castAt passes the spot as the point)
    const decoy = { id: 9002, x: 30, y: 0, r: 10, dead: false, types: ['normal'], hurt() {} }, saved = G.EnemyMgr;
    G.EnemyMgr = { queryCircleEach: (x, y, R, f) => f(decoy), queryCircle: () => [decoy], all: () => [decoy] };
    const [e, b] = one(['future-sight']); pl.x = 250; pl.y = 0; frame(e); frame(e);
    const mark = Sim.list().find(i => i.spec.id === 'future-sight'); G.EnemyMgr = saved;
    ok(mark && near(mark.x, 250), 'with a wild enemy at 30 px the mark still lands on the player at 250: ' + (mark && mark.x)); }
  delete pl.push; pl.stPush = null; pl.x = 0; pl.y = 0;
  console.log('18 imports: Roar pushes the player 140 px (0.2 s slide, never in the air) and wild enemies only, cd 5; Fissure KOs wild foes on a roll under 30% only, a 120 strike on you; Future Sight marks your spot, lands 2 s later, a step dodges it'); }

console.warn = origWarn;
console.log(fail ? fail + ' FAILED (' + n + ' checks)' : 'ALL OK (' + n + ' checks)');
process.exit(fail ? 1 : 0);
