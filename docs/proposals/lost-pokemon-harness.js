// Lost Pokemon (#138, S7 of #128) offline checks (Node only).
// Usage from the repo root:  node docs/proposals/lost-pokemon-harness.js .
// Real js/systems/events.js, catch.js, rescue.js, copies.js, js/core/db.js (a guest save, never stored) and the data
// files, with stubbed engine globals (world, sprites, enemies). The expected outcomes are
// relations from the slice opening (docs/ASCII Concept Maps/138 - Lost Pokemon Slice Opening.md, T1 to T6) and decision
// 2026-11-21-138-floater-escort-hover-and-water-spots; the pool is rebuilt here from pokeapi's pokemon_species.csv and
// the sprite hover flags, never from what events.js returns (docs/TEST-FIRST.md).
// Not covered here: which liquids are safe. The world is stubbed, so the safe-liquid answer is the stub's; the rule
// itself is world.js liquidIsSafe (the liquid table's damage flag, shared with walkable). Drawing and the edge arrow
// are feel-tested. Co-op (deferred).
// The mutation runner (lost-pokemon-mutate.js) points LP_EVENTS at altered copies; every mutation must make this
// fail. Prints failures only; one line when clean.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const SRC = { 'js/systems/events.js': 'LP_EVENTS' };
const pathOf = (p) => process.env[SRC[p]] || R + '/' + p;
const load = (p) => vm.runInThisContext(fs.readFileSync(pathOf(p), 'utf8'), { filename: p });
global.window = global;
let seed = 13579; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
Math.random = rnd;
let fail = 0; const bad = (m) => { fail++; if (fail < 30) console.log('FAIL', m); };

// ---------------- stubs ----------------
const said = [];
const world = { liquidSafe: true, allLiquid: false, wallX: null, collides: 0 };
const player = { x: 0, y: 0, r: 10, spd: 100, dead: false, maxHp: 100, heal() {} };
let touching = []; // what G.EnemyMgr.queryCircle returns (an enemy touching the Lost Pokemon)
global.G = {
  U: {
    pick: (list) => list[Math.floor(rnd() * list.length)],
    rand: (a, b) => a + rnd() * (b - a),
    dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
    dist2: (ax, ay, bx, by) => (bx - ax) ** 2 + (by - ay) ** 2,
    norm: (x, y) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d]; },
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  },
  Coop: { active: false, isHost: false },
  GymArena: { inArena: true }, // events.js stops its own scheduling in an arena (no horde, gold or thief mid-check);
  // the Lost Pokemon still ticks, and debugLost starts one
  Spawner: { say: (text) => said.push(text) },
  Audio: { sfx() {} },
  FX: { burst() {}, ring() {} },
  Drops: { roll() {} },
  EnemyMgr: { queryCircle: () => touching, bossAlive: () => false, all: () => [], add() {} },
  World: {
    // an all-liquid map: only a spot that may use liquid is free
    isFree: (x, y, r, allowLiquid) => !world.allLiquid || !!allowLiquid,
    liquidIsSafe: () => world.liquidSafe,
    collide: (e) => { world.collides++; if (world.wallX != null && e.x > world.wallX) e.x = world.wallX; },
  },
  Sprites: {
    Animator: class { constructor() { this.dir = 0; } update() {} loop() {} draw() {} },
    bodyRadius: () => 10,
    preload() {},
    dirFromAngle: () => 0,
  },
  Game: { player, st: { time: 300 }, everyone: () => [player] },
};
load('js/data/pokedex.js'); load('js/data/sprites-meta.js'); load('js/data/species-traits.js');
load('js/data/stage-one.js'); load('js/data/evolvable.js'); load('js/data/balls.js');
// the hover flag read straight from the sprite data, as js/core/sprites.js does
const floats = (dex) => !!(G.SPRITE_META[dex] && G.SPRITE_META[dex].hv);
G.Sprites.hovers = floats;
load('js/systems/copies.js'); load('js/core/db.js'); load('js/systems/catch.js'); load('js/systems/rescue.js');
load('js/systems/events.js');
G.DB.playAsGuest();
const E = G.Events, C = G.Catch, save = G.DB.save;
const NATURE_NAMES = G.SpeciesTraits.NATURES.map(([name]) => name.charAt(0).toUpperCase() + name.slice(1));
const SPANISH = /[¡¿áéíóúñ]/i;

// one event from its start: returns the spawn toast, or null when none started
function startLost(dex) {
  E.reset(); said.length = 0; touching = [];
  player.x = 0; player.y = 0;
  return E.debugLost(dex) ? said[said.length - 1] : null;
}
// touch it, then stand on the mark until it arrives (one long frame covers the walk)
function deliver() {
  const at = E._dbg();
  player.x = at.x; player.y = at.y; E.update(0.016, [player], 300);
  player.x = at.tx; player.y = at.ty; E.update(10, [player], 300);
  return !E._dbg();
}

// ---------------- T1: the pool ----------------
{ const rows = fs.readFileSync(R + '/pokeapi-master/data/v2/csv/pokemon_species.csv', 'utf8').trim().split(/\r?\n/);
  const col = rows[0].split(','), idAt = col.indexOf('id'), fromAt = col.indexOf('evolves_from_species_id');
  const from = new Map(rows.slice(1).map((r) => r.split(',')).map((c) => [+c[idAt], +c[fromAt] || 0]));
  const evolvesInto = new Set([...from.values()].filter(Boolean));
  // Stage 1: no pre-evolution, or one the game does not have (the Gholdengo rule in stage-one.js)
  const stageOne = (dex) => !from.get(dex) || !G.DEX_BY[from.get(dex)];
  const fits = (p) => p.rarity >= 1 && p.rarity <= 3 && !p.leg && G.SPRITE_META[p.dex] && stageOne(p.dex) &&
    evolvesInto.has(p.dex);
  const want = G.DEX.filter(fits).map((p) => p.dex).sort((a, b) => a - b);
  const got = E.pool().map((p) => p.dex).sort((a, b) => a - b);
  if (want.join() !== got.join()) {
    const missing = want.filter((d) => !got.includes(d)), extra = got.filter((d) => !want.includes(d));
    bad('T1 the pool is every Stage 1 that can evolve, rarity 1 to 3, not legendary, with sprites; missing ' +
      missing.slice(0, 8) + ' extra ' + extra.slice(0, 8));
  }
  if (!got.some(floats)) bad('T1 floating species are in the pool');
  for (let i = 0; i < 200; i++) {
    const toast = startLost();
    const dex = toast && E.pool().find((p) => toast.includes(' ' + p.name + ' is lost'));
    if (!dex) { bad('T1 a pool pick names a pool species: ' + toast); break; }
  }
}

// a species of the pool for a star, a floater and a walker
const pool = E.pool();
const ofStar = (star) => pool.find((p) => p.rarity === star && !floats(p.dex));
const floater = pool.find((p) => floats(p.dex)), walker = pool.find((p) => !floats(p.dex));

// ---------------- T2: the odds; T3: held with the toast's nature ----------------
{ const SPEC = { 1: 0.2, 2: 0.12, 3: 0.06 }, N = 3000, rate = {};
  for (const star of [1, 2, 3]) {
    const mon = ofStar(star);
    if (!mon) { bad('T2 the pool has a ' + star + ' star species'); continue; }
    let joined = 0;
    for (let i = 0; i < N; i++) {
      C.startRun(save);
      startLost(mon.dex);
      if (!deliver()) { bad('T2 a delivery arrives'); break; }
      joined += C.held.length;
    }
    rate[star] = joined / N;
    const sigma = Math.sqrt((SPEC[star] * (1 - SPEC[star])) / N);
    if (Math.abs(rate[star] - SPEC[star]) > 4 * sigma)
      bad('T2 ' + star + ' star recruits near ' + SPEC[star] + ': ' + rate[star].toFixed(3));
  }
  if (!(rate[1] > rate[2] && rate[2] > rate[3])) bad('T2 a lower star recruits more often: ' + JSON.stringify(rate));

  // T3: a recruit is held with the toast's nature, the box is unchanged until the run settles, then gains that copy
  const mon = ofStar(1), box0 = save.box.length;
  let toast = null, tries = 0;
  do { C.startRun(save); toast = startLost(mon.dex); deliver(); } while (!C.held.length && ++tries < 200);
  const held = C.held[0], shown = toast && toast.match(/^A (\w+) /);
  if (!held) bad('T3 a delivered Lost Pokemon can be recruited');
  else {
    if (C.held.length !== 1 || held.dex !== mon.dex) bad('T3 a recruit adds one held entry of its species');
    if (!shown || shown[1] !== held.natureName || NATURE_NAMES[held.nature - 1] !== held.natureName)
      bad('T3 the held nature is the one the toast named: ' + (shown && shown[1]) + ' vs ' + JSON.stringify(held));
    if (save.box.length !== box0) bad('T3 a recruit is never placed mid-run');
    C.settle(true, save);
    const copy = save.box[save.box.length - 1];
    if (save.box.length !== box0 + 1 || !copy || copy.d !== mon.dex || copy.n !== held.nature)
      bad('T3 the settle places the recruit with its nature: ' + JSON.stringify(copy));
  }
}

// ---------------- T4: hover ----------------
function crossRock(mon) {
  startLost(mon.dex);
  const at = E._dbg();
  player.x = at.x; player.y = at.y; E.update(0.016, [player], 300); // it follows you now
  world.wallX = at.x + 40; world.collides = 0;
  player.x = at.x + 300; player.y = at.y; E.update(3, [player], 300); // you walk past a rock 40 px on
  const end = E._dbg(); world.wallX = null;
  return { x: end ? end.x : null, wall: at.x + 40, collides: world.collides };
}
if (!floater || !walker) bad('T4 the pool has a floater and a walker');
else {
  const f = crossRock(floater), w = crossRock(walker);
  if (!(f.x > f.wall) || f.collides) bad('T4 a floater crosses a rock with no collision: ' + JSON.stringify(f));
  if (!(w.x <= w.wall) || !w.collides) bad('T4 a walker is pushed out by the rock: ' + JSON.stringify(w));
}

// ---------------- T5: spawn and mark spots ----------------
if (floater && walker) {
  world.allLiquid = true;
  world.liquidSafe = true;
  if (!startLost(floater.dex)) bad('T5 on a safe liquid, a floater may spawn and be marked on it');
  if (startLost(walker.dex)) bad('T5 a walker never spawns or is marked on liquid');
  world.liquidSafe = false;
  if (startLost(floater.dex)) bad('T5 on a liquid that hurts, a floater stays off it');
  world.allLiquid = false; world.liquidSafe = true;
  if (!startLost(walker.dex)) bad('T5 a walker spawns on ground');
}

// ---------------- T6: the lines ----------------
{ const lines = [], mon = walker || pool[0];
  const run = (fn) => { fn(); lines.push(...said); };
  run(() => { C.startRun(save); startLost(mon.dex); deliver(); }); // lost, follows, home (thanks or recruit)
  run(() => { // scared off: an enemy touches it until its HP is gone
    startLost(mon.dex); touching = [{ dead: false, behavior: 'chase', dmg: 1000 }];
    for (let i = 0; i < 20 && E._dbg(); i++) E.update(0.6, [player], 300);
  });
  run(() => { startLost(mon.dex); touching = []; E.update(130, [player], 300); }); // tired of waiting
  let recruitLine = null, thanksLine = null;
  for (let i = 0; i < 300 && !(recruitLine && thanksLine); i++) {
    C.startRun(save); startLost(mon.dex); deliver();
    const home = said.find((s) => s.includes(' home!'));
    if (home && C.held.length) recruitLine = home;
    else if (home) thanksLine = home;
  }
  lines.push(recruitLine || '', thanksLine || '');
  const spawn = lines.find((s) => / is lost!/.test(s)), m = spawn && spawn.match(/^A (\w+) (.+) is lost!/);
  if (!m || !NATURE_NAMES.includes(m[1]) || m[2] !== mon.name)
    bad('T6 the spawn line names its nature and species: ' + spawn);
  const kinds = [/ is following you!/, / got scared and ran away/, / got tired of waiting/, / home! It thanks you/,
    / home! It will join you when the run ends/];
  for (const k of kinds)
    if (!lines.some((s) => k.test(s) && s.includes(mon.name))) bad('T6 an English line ' + k + ' with the name');
  for (const s of lines) if (SPANISH.test(s)) bad('T6 every Lost Pokemon line is English: ' + s);
}

console.log(fail ? fail + ' FAILED' : 'lost-pokemon harness: all passed');
process.exit(fail ? 1 : 0);
