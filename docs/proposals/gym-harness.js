// Gym pilot (Brock) offline checks (Node only). Usage from the repo root:  node docs/proposals/gym-harness.js .
// Real stats, pokedex, moves, enemies, enemy, elites, gyms and gym files with stubbed engine globals. Covers: the authoring validation,
// the leader def (level locked at gate spawn, HP from the 60 s TTK model), move power/category through the ratio path, Defense stages
// (stack, cap, expiry, damage cut), the enrage clock, the move picker (range and weights), a 60 s simulated fight through the real boss AI
// (only authored moves, melee only up close, Harden stacking), and the gate schedule. The arena, HUD and live game are NOT covered (no browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global; global.location = { search: '?dev' };
let clock = 240;
const hz = [], shots = [], slashes = [], hurts = [];
const base = { U: null, Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, preload() { }, animMeta: () => ({ ay: 40 }), PX: 2, dirFromAngle: () => 0 },
  Camera: { sees: () => true, outerRadius: () => 400, kick() { } },
  Game: { player: { x: 0, y: 0 }, st: { get time() { return clock; } }, everyone: () => [{ level: 5 }] },
  Hazards: { add: h => hz.push(h) }, FX: new Proxy({ slash: (...a) => slashes.push(a) }, { get: (t, k) => (k in t ? t[k] : noop) }), LIFT: 0, VFX: { forMove: m => ({ id: m.id }), forType: () => null }, Projectiles: { spawn: s => { shots.push(s); return s; } }, Coop: { isHost: false } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
try { load('js/core/util.js'); } catch (e) { }
['js/core/stats.js', 'js/data/pokedex.js', 'js/data/sprites-meta.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/data/gyms.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/systems/elites.js', 'js/systems/gym.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
G.Enemy.prototype.die = function () { this.dead = true; };

// 1. authoring
{ const brock = G.Gyms.KANTO[0];
  const v = G.Gyms.validate(brock); if (v.length) bad('Brock invalid: ' + v);
  const broken = JSON.parse(JSON.stringify(brock)); broken.signatures[0].moves.push({ id: 'not-a-move', weight: 1, range: 'any' }, { id: 'tackle', weight: 0, range: 'near' });
  const vb = G.Gyms.validate(broken); if (vb.length !== 3) bad('validation should flag 3 problems, got ' + vb.length + ': ' + vb);
  console.log('1 authoring: Brock valid; a broken copy flags ' + vb.length + ' problems'); }

// 2. gate and def
let g, def;
{ G.Rift = { inArena: false, rift: null, openGate: info => { G.Rift.rift = { gym: info }; return true; } };
  G.Gym.reset(); clock = 239; G.Gym.update(0.1, {}, 239); if (G.Gym.gate) bad('gate before 4:00');
  clock = 240; G.Gym.update(0.1, {}, 240); g = G.Gym.gate; if (!g) bad('no gate at 4:00');
  const wantL = Math.round(G.Stats.levelForTime(240)) + 4; if (g.level !== wantL) bad('level ' + g.level + ' vs ' + wantL);
  def = G.Gym.makeDef(g);
  const wild = G.Stats.hpForLevel(G.DEX_BY[74].stats[0], g.level);
  console.log('2 gate at 4:00: ' + g.leader + ' Lv ' + g.level + ', ' + def.name + ' HP ' + def.hp + ' (' + (def.hp / wild).toFixed(1) + 'x a wild unit at that level)');
  if (def.gym.moves.length !== 3 || def.gym.level !== g.level) bad('def gym descriptor'); }

// 3. leader entity: factors, stages, enrage
const pl = { level: 5, x: 600, y: 0, hp: 100, r: 10 };
const mk = () => { const e = new G.Enemy(def, 0, 0, { hp: 1, spd: 1, dmg: 1 }, true); e.flying = false; return e; };
{ const e = mk();
  if (!e.boss || !e.gym) bad('not a gym boss'); if (e.maxHp !== def.hp) bad('maxHp');
  const I = id => e.gym.moves.find(x => x.id === id).inst;
  const mt = I('tackle'), mr = I('rock-throw');
  // authored stacks went through the real upgrade rules: Effect +10% each, Count +1, Area/Arc/Size/Speed +15%, Recharge divides the cd
  if (!near(mr.dmg, 50 * 1.3) || mr.count !== 3 || !near(mr.size, 9 * 1.15) || !near(mr.speed, 260 * 1.15) || !near(mr.cd, G.Moves.BY_ID['rock-throw'].cd / 1.3)) bad('Rock Throw stacks: ' + JSON.stringify([mr.dmg, mr.count, mr.size, mr.speed, mr.cd]));
  if (!near(mt.dmg, 40 * 1.2) || !near(mt.radius, G.Moves.BY_ID['tackle'].radius * 1.15) || !near(mt.arc, G.Moves.BY_ID['tackle'].arc * 1.15)) bad('Tackle stacks: ' + JSON.stringify([mt.dmg, mt.radius, mt.arc]));
  const ft = e.gymFactor(mt), fr = e.gymFactor(mr);
  if (!near(fr / ft, (mr.dmg * 1.5) / mt.dmg)) bad('power ratio incl. STAB ' + fr / ft);
  if (e.atkFactor == null || e.atkCat !== 'physical') bad('contact factor / cat'); if (e.atkType !== 'normal') bad('contact type ' + e.atkType);
  // Harden is a mainline STAGE now (slice D1): +1 Def per cast, each application on its own timer (the move's dur), stage cap = the move's stacks (6)
  const hd = I('harden'); if (hd.amount !== 0.07 || !near(hd.dur, 7 * 1.3) || hd.stacks !== 6 || hd.stat !== 'def') bad('Harden values: ' + JSON.stringify([hd.amount, hd.dur, hd.stacks, hd.stat]));
  if (G.Stages.stage(e, 'def') !== 0 || G.Stages.mul(e, 'def') !== 1) bad('no cast, no stage');
  e.castBuff(hd); if (G.Stages.stage(e, 'def') !== 1 || !near(G.Stages.mul(e, 'def'), 1.5)) bad('1 cast ' + G.Stages.stage(e, 'def'));
  for (let i = 0; i < 9; i++) e.castBuff(hd); if (G.Stages.stage(e, 'def') !== 6 || !near(G.Stages.mul(e, 'def'), 4)) bad('stage cap ' + G.Stages.stage(e, 'def'));
  const hp0 = e.hp; e.hurt(100); const taken = hp0 - e.hp; if (!near(taken, 100)) bad('hurt() no longer cuts (the stage acts in the damage ratio): ' + taken);
  G.Stages.tick(e, hd.dur - 0.1); if (G.Stages.stage(e, 'def') !== 6) bad('stage expired early'); G.Stages.tick(e, 0.2); if (G.Stages.stage(e, 'def') !== 0 || e.stg) bad('stage did not expire');
  // a stage cap below 6 holds (an authored move with fewer stacks)
  { const f2 = Object.assign({}, hd, { stacks: 3 }); for (let i = 0; i < 6; i++) e.castBuff(f2); if (G.Stages.stage(e, 'def') !== 3) bad('authored cap 3 ' + G.Stages.stage(e, 'def')); G.Stages.clear(e); }
  // the attacker half: an Attack stage multiplies the leader's physical factor, a SpA stage the special one
  { const f0 = e.gymFactor(mt); G.Stages.add(e, 'atk', 2, 5); if (!near(e.gymFactor(mt) / f0, 2)) bad('atk stage on the factor ' + e.gymFactor(mt) / f0); G.Stages.clear(e); }
  // enrage clock (engaged by the hit above at clock 240)
  const t0 = e.gym.engagedAt; if (t0 !== 240) bad('engagement ' + t0);
  const f = s => { clock = t0 + s; return e.gymFactor(mt) / ft; };
  const r = [f(60), f(120), f(135), f(150), f(400)];
  if (!near(r[0], 1) || !near(r[1], 1) || !near(r[2], 1.5) || !near(r[3], 2) || !near(r[4], 2)) bad('enrage ramp ' + r);
  clock = 240;
  console.log('3 leader: contact factor ' + ft.toFixed(1) + ', rock-throw x' + (fr / ft).toFixed(2) + ', Harden = +1 Def stage per cast (x1.5 at +1, x4 at the +6 cap, 9.1 s each), STAB on Rock Throw, enrage x' + r.map(v => v.toFixed(2)).join(' / ') + ' at +60/120/135/150/400 s'); }

// 4. move picker
{ const e = mk(); e.ai = null; e.bossInit(); const cnt = {};
  for (let i = 0; i < 4000; i++) { const id = e.gymPick(50); cnt[id] = (cnt[id] || 0) + 1; }
  const far = {}; for (let i = 0; i < 4000; i++) { const id = e.gymPick(400); far[id] = (far[id] || 0) + 1; }
  if (far.tackle) bad('tackle used at range'); if (!cnt.tackle || !cnt['rock-throw'] || !cnt.harden) bad('close pick set ' + JSON.stringify(cnt));
  if (!near(cnt.tackle / 4000, 2 / 6, 0.1) || !near(far['rock-throw'] / 4000, 3 / 4, 0.1)) bad('weights ' + JSON.stringify(cnt) + ' ' + JSON.stringify(far));
  console.log('4 picker: close ' + JSON.stringify(cnt) + ', far ' + JSON.stringify(far)); }

// 5. simulated fight through the real boss AI
{ const e = mk(); const seen = {}; let maxDef = 0; const origStart = e.gymStart.bind(e);
  let atRange = false;
  e.gymStart = function (id, p) { seen[id] = (seen[id] || 0) + 1; if (atRange && id === 'tackle') bad('tackle STARTED at range'); return origStart(id, p); };
  let errs = [];
  for (let i = 0; i < 60 * 20; i++) {
    clock = 240 + i * 0.05;
    atRange = i >= 640;       // a cast begun just before the switch may still be finishing
    e.x = 0; e.y = 0; pl.y = 0; pl.x = i < 600 ? 55 : 420;      // 30 s up close, then 30 s at range (boss held in place to isolate the AI)
    try { pl.dead = false; pl.hurt = (...a) => hurts.push(a); e.update(0.05, pl); } catch (x) { errs.push(x.message); break; }
    maxDef = Math.max(maxDef, +G.Stages.mul(e, 'def').toFixed(2)); G.Stages.tick(e, 0);
  }
  const kinds = {}; hz.forEach(h => kinds[h.kind] = (kinds[h.kind] || 0) + 1);
  for (const id of Object.keys(seen)) if (!['tackle', 'rock-throw', 'harden'].includes(id)) bad('unauthored move ' + id);
  if (!(seen.tackle && seen['rock-throw'] && seen.harden)) bad('not every move used in 60 s: ' + JSON.stringify(seen));
  if (hz.some(h => h.atkFactor == null)) bad('a hazard without a ratio factor'); if (shots.some(s => s.atkFactor == null)) bad('a shot without a ratio factor');
  if (shots.some(s => s.mtype !== 'rock')) bad('shot type ' + shots.map(s => s.mtype)); if (hz.some(h => h.type !== 'normal')) bad('zone type');
  if (e.ai.fury) bad('fury should stay off');
  const rt = e.gym.moves.find(x => x.id === 'rock-throw').inst, tk = e.gym.moves.find(x => x.id === 'tackle').inst;
  if (shots.some(x => !near(x.r, rt.size) || Math.abs(Math.hypot(x.vx, x.vy) - rt.speed) > 1 || !near(x.life, rt.life) || (x.pierce | 0) !== (rt.pierce | 0))) bad('Rock Throw shot differs from the player version');
  if (!shots.every(x => x.vis && x.vis.id === 'rock-throw')) bad('shot visuals are not the move visuals');
  if (Math.abs(shots.length - (seen['rock-throw'] || 0) * 3) > 3)  // a cast still winding up when the 60 s window ends has not fired yet
    bad('Rock Throw should fire 3 rocks per cast: ' + shots.length + ' vs ' + seen['rock-throw']);
  if (!slashes.length) bad('no Tackle slash visual'); if (slashes.some(a => !near(a[3], tk.radius + e.r) || !near(a[4], tk.arc))) bad('slash radius/arc differ from Tackle: ' + JSON.stringify(slashes[0].slice(3, 5)));
  if (!hurts.length) bad('Tackle never hurt the player at point blank'); if (hurts.some(a => !near(a[0], e.gymFactor(tk), 0.35) || a[3].cat !== 'physical')) bad('tackle damage factor');
  if (maxDef < 1.5) bad('the leader never raised its Defense stage in 60 s');
  e.ai.cast = null; e.gymRestore(); if (e.atkType !== 'normal') bad('type not restored after casts: ' + e.atkType);
  console.log('5 60 s fight: casts ' + JSON.stringify(seen) + ', zones ' + (kinds.zone || 0) + ', shots ' + shots.length + ', peak Def stage multiplier x' + maxDef + ', Tackle slashes ' + slashes.length + ' hurting ' + hurts.length + ' times, shots r' + (shots[0] && shots[0].r) + ' at ' + (shots[0] && Math.round(Math.hypot(shots[0].vx, shots[0].vy))) + ' px/s' + (errs.length ? ', ERRORS ' + errs : ', no errors')); if (errs.length) bad('fight errors'); }

// 6. schedule after the fight
{ G.Gym.onReturn(g); if (G.Gym.beaten !== 1 || G.Gym.gate) bad('onReturn state'); G.Rift.rift = null; clock = 9999; G.Gym.update(0.1, {}, 9999); if (G.Gym.gate) bad('a second gate with one gym in the list');
  console.log('6 schedule: after Brock, beaten ' + G.Gym.beaten + ', no further gate (the list has one entry)'); }

console.log(fail ? fail + ' FAILED' : 'ALL OK');
process.exit(fail ? 1 : 0);
