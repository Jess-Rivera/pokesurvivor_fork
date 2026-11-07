// G.Elite offline checks (Node only). Usage from the repo root:  node docs/proposals/elite-class-harness.js
// Entity model slice 1 (Jess, 2026-11-05): Elite extends WildEntity, its behavior does not change, and a change to wild entities reaches it.
// Real stats, pokedex, sprite meta, classes, enemies, stages, status, enemy and elite files; real move-effects for the KO and the push;
// engine globals stubbed. Expected values are worked out by hand from the elite rules, never copied from output.
// EC_FILE and EC_FROM (elite-class-mutate.js): load the file EC_FROM in place of the repo file EC_FILE.
const fs = require('fs'), vm = require('vm'), path = require('path');
const R = path.resolve(__dirname, '..', '..');
const src = (p) => (process.env.EC_FILE === p ? fs.readFileSync(process.env.EC_FROM, 'utf8') : fs.readFileSync(path.join(R, p), 'utf8'));
const load = (p) => vm.runInThisContext(src(p), { filename: p });
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const stub = (o) => new Proxy(o, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
global.window = global;
global.location = { search: '?dev' };

const rec = { engaged: [], noted: [], rolls: [], xp: [], fearAsk: 0 };
let liquid = false, spriteAy = 40;
const base = {
  U: null,
  Sprites: stub({
    Animator: class { update() {} loop() {} play() {} busy() { return false; } },
    bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, PX: 1, animMeta: () => ({ ay: spriteAy }),
  }),
  Camera: stub({ sees: () => false, outerRadius: () => 400, kick() {} }),
  Game: stub({ player: { x: 0, y: 0 }, everyone: () => [{ level: 5 }] }),
  Gym: stub({ escBump: () => 3 }),
  World: stub({
    isLiquid: () => liquid,
    liquidEffect: () => ({ dmg: 1, every: 0.01, color: '#f00' }),
    isFree: () => true,
    collide() {},
    moveDir: () => [0, 0],
  }),
  Elites: stub({ engage: (e) => rec.engaged.push(e), noteDeath: (e) => rec.noted.push(e), enrageIn: () => 5 }),
  Drops: stub({ roll: (k) => rec.rolls.push(k) }),
  Pickups: stub({ dropXp: (x, y, v, plain) => rec.xp.push(!!plain) }),
  Spawner: stub({ xpBoost: () => 1 }),
  Types: { mult: () => 1, label: () => null },
  EnemyMgr: stub({ queryCircle: () => { rec.fearAsk++; return near1; }, queryCircleEach() {} }),
};
let near1 = [];
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
load('js/core/util.js');
for (const p of ['js/core/stats.js', 'js/data/pokedex.js', 'js/data/sprites-meta.js', 'js/data/moves.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/systems/stages.js', 'js/systems/status.js', 'js/entities/enemy.js', 'js/entities/elite.js', 'js/systems/move-effects.js']) load(p);
G.Sprites.animMeta = () => ({ ay: spriteAy });
G.Sprites.PX = 1;
G.Enemies.carrierOf = () => 'slow';
G.EnemyMgr = base.EnemyMgr = stub({ queryCircle: () => { rec.fearAsk++; return near1; }, queryCircleEach() {} }); // enemy.js replaced the stub with the real manager

let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL ' + m); } };
const near = (a, b) => Math.abs(a - b) < 1e-6;
const SC = { t: 0, dmg: 1, hp: 1, spd: 1 };
const eliteDef = (o) => Object.assign({ dex: 1, baseHp: 45, spd: 50, dmg: 5, xp: 1, xpMul: 2, behavior: 'chase', bx: 64, elite: { hp: 500, hpMul: 5, pow: 1.5, xpMul: 3, engagedAt: null, enrage: 1 } }, o);
const wildDef = (o) => Object.assign({ dex: 1, baseHp: 45, spd: 50, dmg: 5, xp: 1, xpMul: 2, behavior: 'chase', bx: 64 }, o);
const mkE = (o) => new G.Elite(eliteDef(o), 0, 0, SC);
const mkW = (o) => new G.WildEntity(wildDef(o), 0, 0, SC);
const dt = (e, s) => { for (let t = 0; t < s; t += 0.05) G.Status.tick(e, 0.05); };

// 1. The structure
{ const e = mkE(), w = mkW();
  ok(G.Enemy === G.WildEntity, 'G.Enemy names the wild base class');
  ok(e instanceof G.WildEntity, 'an Elite is a wild entity');
  ok(!(w instanceof G.Elite) && w.elite === null, 'a plain wild entity is not an elite');
  ok(e.elite === e.def.elite, 'the Elite carries its descriptor');
  const want = ['constructor', 'dropLoot', 'drawBarTag', 'makeGolden', 'onDamaged', 'sizeFor', 'spawnBump', 'spawnHp'];
  ok(JSON.stringify(Object.getOwnPropertyNames(G.Elite.prototype).sort()) === JSON.stringify(want.slice().sort()), 'Elite overrides only its mods: ' + Object.getOwnPropertyNames(G.Elite.prototype));
  ok(src('js/systems/spawner.js').includes('new G.Elite(def, pt[0], pt[1], G.Enemies.scale(t))'), 'the spawner builds the Elite class');
  const body = src('js/entities/enemy.js');
  ok((body.match(/this\.elite\b/g) || []).length === 1, 'the wild class has no elite branch left, only the null default'); }

// 2. A change to wild entities reaches elites
{ const P = G.WildEntity.prototype, S = 'changed on the base';
  for (const k of ['bandOf', 'applyFlinch', 'applySlow', 'keepsDistance', 'showHurt', 'update', 'hurt', 'die', 'draw']) {
    const was = P[k]; P[k] = () => S;
    ok(mkE()[k]() === S, 'an elite inherits ' + k + ' from the wild class');
    P[k] = was; } }

// 3. Spawn values: size, HP, XP, level
{ spriteAy = 40; ok(mkE().scale === 2, 'a small sprite scales to the 2 cap (110 / 40 rounds to 3, clamped)');
  spriteAy = 110; ok(mkE().scale === 1.5, 'a tall sprite keeps the 1.5 floor');
  ok(mkW().scale === 1, 'a plain wild entity is scale 1');
  spriteAy = 40;
  const e = mkE(), w = mkW();
  ok(e.maxHp === 500 && e.hp === 500, 'Elite HP is its descriptor: ' + e.maxHp);
  ok(w.maxHp === G.Enemies.enemyHp(45, 0, 3), 'wild HP is the formula with the escalation bump');
  ok(near(e.xpMul, 6), 'Elite XP multiplier is def 2 x descriptor 3: ' + e.xpMul);
  ok(near(w.xpMul, 2), 'wild XP multiplier is the def: ' + w.xpMul);
  ok(near(e.atkLvl, 1), 'no escalation on an Elite: level 1 at t 0, got ' + e.atkLvl);
  ok(near(w.atkLvl, 4), 'escalation on a wild entity: level 1 + 3, got ' + w.atkLvl);
  ok(e.carrier === null && e.carrierSec === false, 'an Elite carries no status');
  ok(w.carrier === 'slow', 'a wild entity keeps its carrier');
  const g = mkE(), xp = g.xp; g.makeGolden(); ok(!g.golden && g.xp === xp, 'an Elite is never golden');
  const h = mkW(), xq = h.xp; h.makeGolden(); ok(h.golden && h.xp === xq * 2, 'a wild entity can be golden'); }

// 4. Taking a hit: engage, no pain, no knockback
{ rec.engaged.length = 0;
  const e = mkE(); e.hurt(10, '#fff', 1, 0, 100);
  ok(rec.engaged.length === 1 && rec.engaged[0] === e, 'a hit engages the Elite');
  ok(e.pain === 0, 'an Elite feels no pain');
  ok(e.kx === 0 && e.ky === 0, 'an Elite takes no knockback');
  ok(e.hp === 490, 'the damage lands on an Elite: ' + e.hp);
  rec.engaged.length = 0;
  const w = mkW(); w.hurt(10, '#fff', 1, 0, 100);
  ok(rec.engaged.length === 0, 'a hit engages nothing on a wild entity');
  ok(w.pain > 0, 'a wild entity feels pain');
  ok(w.kx === 100, 'a wild entity slides: ' + w.kx); }

// 5. Morale: never panics, not scared, scares nobody
{ const e = mkE(); e.fear = 1; e.pain = 1e6; ok(e.moraleNow() === 1, 'an Elite never panics');
  const w = mkW(); w.fear = 1; ok(w.moraleNow() < 1, 'a wild entity loses morale');
  const beh = Object.keys(G.Enemies.BANDS)[0],
    nE = new G.Elite(eliteDef({ behavior: beh }), 5, 0, SC),
    nW = new G.WildEntity(wildDef({ behavior: beh }), 5, 0, SC);
  near1 = [nE, nW];
  mkW().spreadFear();
  ok(nW.fear > 0, 'a wild faint scares a wild band-holder');
  ok(nE.fear === 0, 'a wild faint does not scare an Elite');
  near1 = [];
  rec.fearAsk = 0; mkE().die(); ok(rec.fearAsk === 0, 'an Elite faint spreads no fear');
  rec.fearAsk = 0; mkW().die(); ok(rec.fearAsk === 1, 'a wild faint spreads fear'); }

// 6. Faint: the Elite package
{ rec.xp.length = 0; rec.rolls.length = 0; rec.noted.length = 0;
  const e = mkE(); e.die();
  ok(rec.xp.length === 1 && rec.xp[0] === true, 'an Elite drops one plain XP burst');
  ok(rec.rolls.includes('elite'), 'an Elite rolls the elite table');
  ok(rec.noted.length === 1 && rec.noted[0] === e, 'an Elite faint notes its TTK');
  rec.xp.length = 0; rec.rolls.length = 0; rec.noted.length = 0;
  mkW().die();
  ok(rec.xp.length === 1 && rec.xp[0] === false, 'a wild entity drops normal XP');
  ok(!rec.rolls.includes('elite') && rec.noted.length === 0, 'a wild faint has no Elite package'); }

// 7. Status: the strong timers stay on an Elite
{ const e = mkE(); e.applyStatus('freeze'); ok(near(e.stMajor.t, 0.5), 'Elite freeze is 25% of 2 s: ' + e.stMajor.t);
  const w = mkW(); w.applyStatus('freeze'); ok(near(w.stMajor.t, 2), 'wild freeze is 2 s: ' + w.stMajor.t);
  const s = mkE(); s.applyStatus('sleep'); ok(s.stMajor.t >= 0.5 - 1e-9 && s.stMajor.t <= 1.5 + 1e-9, 'Elite sleep is 25% of 2 to 6 s: ' + s.stMajor.t);
  s.stMajor.t = 0.05; dt(s, 0.1); ok(s.applyStatus('sleep') === 'window', 'an Elite has the no-reapply window after sleep');
  dt(s, 9.7); ok(s.applyStatus('sleep') === 'window', 'the window still holds near 10 s');
  dt(s, 0.4); ok(s.applyStatus('sleep') === 'ok', 'the window ends at 10 s');
  const t = mkE(); G.Status.apply(t, 'trap'); ok(near(t.stTrap.t, 0.5), 'Elite trap root is 25% of 2 s: ' + t.stTrap.t);
  const u = mkW(); G.Status.apply(u, 'trap'); ok(near(u.stTrap.t, 2), 'wild trap root is 2 s: ' + u.stTrap.t);
  ok(mkW().applyStatus('paralysis') !== 'immune', 'paralysis still lands on a wild entity');
  const p = mkE(); p.applyStatus('paralysis'); ok(near(p.stMajor.t, 10), 'paralysis is full strength on an Elite: ' + p.stMajor.t); }

// 8. Moves: no Fissure KO, no Roar push (real G.MoveEffects)
{ const owner = { x: 0, y: 0 },
    hit = (payload, t) => G.MoveEffects.applyHit({ spec: { id: 'x', type: 'normal', payload }, cast: { owner, time: 0 }, x: -50, y: 0, age: 0 }, t, 0, () => 0);
  const ko = [{ t: 'special', handler: 'ohkoWild', koChance: 100 }];
  const e = mkE(); hit(ko, e); ok(e.hp === 500 && !e.dead, 'Fissure never KOs an Elite: ' + e.hp);
  const w = mkW(), hp = w.hp; hit(ko, w); ok(w.hp <= 0 && hp > 0, 'Fissure KOs a wild entity on the roll');
  const push = [{ t: 'knockback', distance: 140 }];
  const f = mkE(); f.x = 0; hit(push, f); ok(f.kx === 0 && f.ky === 0, 'Roar never slides an Elite');
  const g = mkW(); g.x = 0; hit(push, g); ok(g.kx !== 0 || g.ky !== 0, 'Roar slides a wild entity'); }

// 9. Terrain and the bar
{ liquid = true;
  const pl = { x: 500, y: 0, r: 10 };
  const e = mkE(), h0 = e.hp; e.update(0.1, pl); ok(e.hp === h0, 'liquid never burns an Elite');
  const w = mkW(), h1 = w.hp; w.update(0.1, pl); ok(w.hp < h1, 'liquid burns a wild entity');
  liquid = false;
  ok(mkE().bigFx === true && mkE().barColor === '#ff9f43', 'an Elite has the wide orange bar');
  ok(mkW().bigFx === false && mkW().barColor === '#ff5f6d', 'a wild entity has the plain bar');
  const text = [], ctx = stub({ fillText: (s) => text.push(s) });
  const t = mkE(); t.name = 'Onix'; t.drawBarTag(ctx, 0);
  ok(text.length === 2 && text[0] === 'ONIX · 5s', 'the Elite name tag shows the countdown: ' + text[0]);
  text.length = 0; mkW().drawBarTag(ctx, 0); ok(text.length === 0, 'a wild entity has no name tag'); }

console.log(fail ? fail + ' of ' + n + ' checks FAILED' : 'elite-class harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
