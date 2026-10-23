// Gym pilot (Brock) offline checks (Node only). Usage from the repo root:  node docs/proposals/gym-harness.js .
// Real stats, pokedex, moves, enemies, enemy, elites, gyms, gym and simbus files with stubbed engine globals. Covers: the authoring validation
// (every rule with a negative case), stage ladders (stageFor), the loop-N lineup, the loop accessor and roster, a leader def for every roster slot
// at several levels (with a regression guard for the single-mon path), every slot through the real boss AI, the sim events (and that the sim
// never calls Spawner/Audio itself) and the gym-present subscriber text. Older coverage: the authoring validation,
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
['js/core/stats.js', 'js/core/simbus.js', 'js/data/pokedex.js', 'js/data/sprites-meta.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/data/gyms.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/systems/elites.js', 'js/systems/gym.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
G.Enemy.prototype.die = function () { this.dead = true; };

// 1. authoring: Brock is valid, and every validation rule has a negative case that must be flagged
{ const brock = G.Gyms.KANTO[0];
  const v = G.Gyms.validate(brock); if (v.length) bad('Brock invalid: ' + v);
  for (const r of G.Gyms.allRegions()) for (const gym of r.gyms) { const vv = G.Gyms.validate(gym); if (vv.length) bad('region ' + r.region + ' ' + gym.leader + ' invalid: ' + vv); }
  if (brock.signatures.length !== 6) bad('Brock should field six slots, has ' + brock.signatures.length);
  const flags = (mut) => { const c = JSON.parse(JSON.stringify(brock)); mut(c); return G.Gyms.validate(c); };
  const cases = [
    ['unknown move', c => c.signatures[0].moves.push({ id: 'not-a-move', weight: 1, range: 'any' }), 'unknown move not-a-move'],
    ['zero weight', c => { c.signatures[0].moves[0].weight = 0; }, 'needs a weight'],
    ['bad range', c => { c.signatures[0].moves[0].range = 'near'; }, 'bad range'],
    ['five moves', c => c.signatures[0].moves.push({ id: 'body-slam', weight: 1, range: 'any' }, { id: 'bite', weight: 1, range: 'any' }), 'more than 4 moves'],
    ['no moves', c => { c.signatures[0].moves = []; }, 'has no moves'],
    ['no damaging move', c => { c.signatures[0].moves = [{ id: 'harden', weight: 1, range: 'any' }]; }, 'at least one damaging move'],
    ['move without a built boss form', c => { c.signatures[0].moves[1].id = 'rock-slide'; }, 'no boss form yet'],
    ['stack the upgrade rules refuse', c => { c.signatures[0].moves[1].stacks = { 'not-a-mechanic': 1 }; }, 'cannot take'],
    ['ladder not increasing', c => { c.signatures[0].line[1].minLevel = 1; }, 'stage levels must increase'],
    ['ladder first stage not 1', c => { c.signatures[0].line[0].minLevel = 5; }, 'first stage must start at level 1'],
    ['unknown dex in a stage', c => { c.signatures[0].line[2].dex = 99999; }, 'unknown dex 99999'],
    ['non-integer stage level', c => { c.signatures[0].line[1].minLevel = 20.5; }, 'integer minLevel'],
    ['empty ladder', c => { c.signatures[0].line = []; }, 'non-empty stage ladder'],
    ['bad stance', c => { c.signatures[0].stance = 'sideways'; }, 'bad stance'],
    ['power out of range', c => { c.signatures[0].power = 9; }, 'power must be in'],
    ['typo field on a slot', c => { c.signatures[0].tempoo = 1; }, 'unknown field tempoo'],
    ['typo field on a move', c => { c.signatures[0].moves[0].wieght = 1; }, 'unknown field wieght'],
    ['typo field on a gym', c => { c.bagde = 'x'; }, 'unknown field bagde'],
    ['too many slots', c => { c.signatures.push(c.signatures[0]); }, 'signatures must be 1 to 6'],
    ['bad boost', c => { c.boost = { stat: 'luck', pct: 0.1 }; }, 'boost needs a stat']
  ];
  for (const [name, mut, needle] of cases) { const out = flags(mut); if (!out.some(m => m.includes(needle))) bad('validate missed "' + name + '" (wanted ' + needle + '): ' + JSON.stringify(out)); }
  console.log('1 authoring: Brock (six slots) valid across every region; ' + cases.length + ' negative cases each flagged'); }

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
  // Slice E2a: Harden is the player's stage version (8 s, +1 Def per cast, no Buff Stacks); Brock authors Duration x2 only, so no stage cap below the +-6 clamp
  const hd = I('harden'); if (hd.amount != null || !near(hd.dur, 8 * 1.3) || hd.stacks != null || hd.stat !== 'def') bad('Harden values: ' + JSON.stringify([hd.amount, hd.dur, hd.stacks, hd.stat]));
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
  console.log('3 leader: contact factor ' + ft.toFixed(1) + ', rock-throw x' + (fr / ft).toFixed(2) + ', Harden = +1 Def stage per cast (x1.5 at +1, x4 at the +6 cap, 10.4 s each), STAB on Rock Throw, enrage x' + r.map(v => v.toFixed(2)).join(' / ') + ' at +60/120/135/150/400 s'); }

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
  // flinch (slice D2): a gym cast in progress is cancelled and the next-attack timer restarts as after a normal gym cast; no immunity
  e.ai.cast = null; e.gymStart('rock-throw', pl); if (!e.ai.cast) bad('flinch test needs a cast'); else { const ok = e.applyFlinch(); if (!ok || e.ai.cast !== null) bad('flinch did not cancel the gym cast'); if (!(e.ai.cd > 0)) bad('flinch did not restart the gym attack timer ' + e.ai.cd); if (e.atkType !== 'normal') bad('type not restored after a flinched cast: ' + e.atkType); }
  e.ai.cast = null; e.gymRestore(); if (e.atkType !== 'normal') bad('type not restored after casts: ' + e.atkType);
  console.log('5 60 s fight: casts ' + JSON.stringify(seen) + ', zones ' + (kinds.zone || 0) + ', shots ' + shots.length + ', peak Def stage multiplier x' + maxDef + ', Tackle slashes ' + slashes.length + ' hurting ' + hurts.length + ' times, shots r' + (shots[0] && shots[0].r) + ' at ' + (shots[0] && Math.round(Math.hypot(shots[0].vx, shots[0].vy))) + ' px/s' + (errs.length ? ', ERRORS ' + errs : ', no errors')); if (errs.length) bad('fight errors'); }

// 6. schedule after the fight
{ G.Gym.onReturn(g); if (G.Gym.beaten !== 1 || G.Gym.gate) bad('onReturn state'); G.Rift.rift = null; clock = 9999; G.Gym.update(0.1, {}, 9999); if (G.Gym.gate) bad('a second gate with one gym in the list');
  console.log('6 schedule: after Brock, beaten ' + G.Gym.beaten + ', no further gate (the list has one entry)'); }

// 7. stage ladders: the stage a slot shows follows the level (placeholder bands 20 / 35), single-stage lines never change
{ const sg = i => G.Gyms.KANTO[0].signatures[i];
  const at = (i, l) => G.Gyms.stageFor(sg(i), l).dex;
  const geo = [[1, 74], [19, 74], [20, 75], [34, 75], [35, 76], [99, 76]];
  for (const [l, want] of geo) if (at(0, l) !== want) bad('Geodude line at level ' + l + ': dex ' + at(0, l) + ' vs ' + want);
  if (at(1, 34) !== 111 || at(1, 35) !== 112) bad('Rhyhorn line boundary'); if (at(4, 34) !== 95 || at(4, 35) !== 208) bad('Onix line boundary (Steelix at 35)');
  for (const l of [1, 20, 35, 99]) if (at(5, l) !== 142) bad('Aerodactyl is single-stage, got ' + at(5, l) + ' at ' + l);
  if (G.Gyms.stageFor(sg(0), NaN).dex !== 74) bad('a non-finite level should fall back to the first stage');
  console.log('7 stage ladders: Geodude 74 until 19, Graveler 20 to 34, Golem from 35; Steelix at 35; Aerodactyl never changes'); }

// 8. lineup: loop N fields the first N slots, in order, each at its stage
{ const brock = G.Gyms.KANTO[0], dexes = lv => G.Gyms.lineup(brock, 6, lv).map(m => m.dex);
  if (dexes(12).join() !== '74,111,138,140,95,142') bad('full lineup at level 12: ' + dexes(12));
  if (dexes(35).join() !== '76,112,139,141,208,142') bad('full lineup at level 35: ' + dexes(35));
  for (let n = 1; n <= 6; n++) { const l = G.Gyms.lineup(brock, n, 12); if (l.length !== n || l.some((m, i) => m.index !== i || m.sig !== brock.signatures[i])) bad('lineup loop ' + n + ' is not the first ' + n + ' in order'); }
  for (const odd of [0, -3, NaN, undefined, null, 'x']) if (G.Gyms.lineup(brock, odd, 12).length !== 1) bad('loop ' + odd + ' should clamp to 1 slot');
  if (G.Gyms.lineup(brock, 99, 12).length !== 6) bad('loop 99 should clamp to the roster size'); if (G.Gyms.lineup(brock, 2.9, 12).length !== 2) bad('a fractional loop floors');
  console.log('8 lineup: loop 1..6 gives the first N slots in order; stage at level 12 is Geodude/Rhyhorn/Omanyte/Kabuto/Onix/Aerodactyl, at 35 the finals; odd loops clamp'); }

// 9. loop accessor, roster and the escalation bump feeding the stage
G.Rift.rift = null; G.Gym.reset(); clock = 240; G.Gym.update(0.1, {}, 240);
const g2 = G.Gym.gate; if (!g2) bad('no gate for sections 9 to 12');
{ if (G.Gym.loop !== 1) bad('default loop'); G.Gym.debugLoop(4); if (G.Gym.loop !== 4 || G.Gym.roster(g2).length !== 4) bad('debugLoop 4 / roster size ' + G.Gym.roster(g2).length);
  G.Gym.debugLoop(99); if (G.Gym.loop !== G.Gyms.LOOPS) bad('debugLoop clamps high'); G.Gym.debugLoop(0); if (G.Gym.loop !== 1) bad('debugLoop clamps low'); G.Gym.debugLoop(NaN); if (G.Gym.loop !== 1) bad('debugLoop NaN');
  G.Gym.debugLoop(3); G.Gym.reset(); if (G.Gym.loop !== 1) bad('reset() should clear the loop');
  G.Rift.rift = null; clock = 240; G.Gym.update(0.1, {}, 240); const g3 = G.Gym.gate;
  if (G.Gym.roster(g3)[0].dex !== 74) bad('slot 1 at gate level ' + g3.level + ' should be Geodude');
  G.Gym.debugEsc(g3.level >= 20 ? 0 : 20 - g3.level); if (G.Gym.roster(g3)[0].dex !== 75) bad('with the bump to level 20 slot 1 should be Graveler, got ' + G.Gym.roster(g3)[0].dex);
  if (G.Gym.gate.dex !== 74) bad('the gate keeps the spawn-time stage for its label');
  console.log('9 loop and roster: default 1, debugLoop clamps 1..6, reset clears it, roster follows loop and the bump (Geodude -> Graveler at Lv 20), gate label keeps its spawn stage'); }
G.Rift.rift = null; G.Gym.reset(); clock = 240; G.Gym.update(0.1, {}, 240);
const gate2 = G.Gym.gate;

// 10. a def for every slot at several levels, a regression guard for the single-mon path, and every slot through the real boss AI
{ const names = { 74: 'Geodude', 75: 'Graveler', 76: 'Golem', 111: 'Rhyhorn', 112: 'Rhydon', 138: 'Omanyte', 139: 'Omastar', 140: 'Kabuto', 141: 'Kabutops', 95: 'Onix', 208: 'Steelix', 142: 'Aerodactyl' };
  const d0 = G.Gym.makeDef(gate2); if (d0.dex !== 74 || d0.name !== 'Geodude' || d0.hp !== 1029 || d0.gym.moves.length !== 3) bad('REGRESSION: the default leader def changed: ' + [d0.dex, d0.name, d0.hp, d0.gym.moves.length]);
  for (let slot = 0; slot < 6; slot++) for (const lv of [12, 20, 35, 60]) {
    const d = G.Gym.makeDef(Object.assign({}, gate2, { level: lv }), slot), want = G.Gyms.stageFor(G.Gyms.KANTO[0].signatures[slot], lv).dex;
    if (d.dex !== want || d.name !== names[want] || d.gym.species !== names[want]) bad('slot ' + slot + ' level ' + lv + ' def is ' + d.name + ' (dex ' + d.dex + '), wanted dex ' + want);
    if (!Number.isFinite(d.hp) || d.hp <= 0 || !(d.spd > 0)) bad('slot ' + slot + ' level ' + lv + ' bad hp/spd ' + [d.hp, d.spd]);
    if (d.gym.moves.length !== G.Gyms.KANTO[0].signatures[slot].moves.length || d.gym.moves.some(m => !m.inst)) bad('slot ' + slot + ' moves not built');
    if (d.gym.level !== lv) bad('slot ' + slot + ' effective level ' + d.gym.level);
  }
  let threw = false; try { G.Gym.makeDef(gate2, 6); } catch (e) { threw = true; } if (!threw) bad('makeDef must refuse a slot that does not exist');
  // every slot through the real boss AI: close range at full HP, then far at 40% HP (so hpBelow moves can fire); only authored moves, every authored move used, no errors
  const out = [];
  for (let slot = 0; slot < 6; slot++) {
    const sig = G.Gyms.KANTO[0].signatures[slot], d = G.Gym.makeDef(Object.assign({}, gate2, { level: 36 }), slot), e = new G.Enemy(d, 0, 0, { hp: 1, spd: 1, dmg: 1 }, true); e.flying = false;
    const seen = {}, orig = e.gymStart.bind(e); e.gymStart = function (id, p) { seen[id] = (seen[id] || 0) + 1; return orig(id, p); };
    let err = null;
    for (let i = 0; i < 90 * 20 && !err; i++) {
      clock = 240 + i * 0.05; e.x = 0; e.y = 0; pl.y = 0; pl.x = i < 900 ? 55 : 420; if (i === 900) e.hp = e.maxHp * 0.4;
      try { pl.dead = false; pl.hurt = (...a) => hurts.push(a); e.update(0.05, pl); } catch (x) { err = x.message; }
    }
    if (err) bad('slot ' + slot + ' ' + d.name + ' threw in the boss AI: ' + err);
    for (const id of Object.keys(seen)) if (!sig.moves.some(m => m.id === id)) bad('slot ' + slot + ' cast an unauthored move ' + id);
    for (const m of sig.moves) if (!seen[m.id]) bad('slot ' + slot + ' ' + d.name + ' never used ' + m.id + ' in 90 s: ' + JSON.stringify(seen));
    out.push(d.name + ' ' + Object.keys(seen).length + '/' + sig.moves.length);
  }
  clock = 240;
  console.log('10 defs: every slot x levels 12/20/35/60 builds the right stage; default def unchanged (Geodude HP 1029); AI uses every authored move: ' + out.join(', ')); }

// 11. the sim emits events and never calls presentation itself (Spawner and Audio throw if touched; no subscriber is loaded yet)
{ G.Spawner = { say: () => bad('SIM called Spawner.say directly'), CAP: 64 }; G.Audio = { sfx: () => bad('SIM called Audio.sfx directly') };
  const grants = { levels: 0, boosts: [] }; G.Game.grantLevels = n => { grants.levels += n; }; G.Game.reviveTeam = () => { }; G.Game.badgeBoost = (st, p) => grants.boosts.push(st + ':' + p);
  G.Rift.rift = null; G.Gym.reset(); clock = 240; G.Gym.update(0.1, {}, 240); const g4 = G.Gym.gate;
  const tape = G.SimBus.record();
  G.Gym.debugEsc(0); G.Gym.update(10.5, {}, 260);                   // one escalation tick after the grace
  G.Gym.makeDef(g4);                                                 // entering with bump > 0 marks the gate
  G.Gym.onWin(g4); G.Gym.onReturn(g4);
  G.SimBus.stopRecording();
  const types = tape.map(e => e.type).join();
  if (types !== 'gym:escalate,gym:badge,gym:calm') bad('event order ' + types);
  const esc = tape.find(e => e.type === 'gym:escalate'), bg = tape.find(e => e.type === 'gym:badge'), calm = tape.find(e => e.type === 'gym:calm');
  if (!esc || esc.leader !== 'Brock' || esc.bump !== 1) bad('gym:escalate ' + JSON.stringify(esc));
  if (!bg || bg.badge !== 'Boulder Badge' || bg.stat !== 'atk' || bg.pct !== 0.1) bad('gym:badge ' + JSON.stringify(bg));
  if (!calm || calm.leader !== 'Brock') bad('gym:calm ' + JSON.stringify(calm));
  for (const e of tape) if (JSON.stringify(JSON.parse(JSON.stringify(e))) !== JSON.stringify(e)) bad('event is not plain data: ' + e.type);
  if (grants.levels !== 1 || grants.boosts.join() !== 'atk:0.1') bad('onWin sim effects ' + JSON.stringify(grants));
  // a throwing subscriber is isolated and the others still run
  { let ran = 0; const origErr = console.error; console.error = () => { }; const u1 = G.SimBus.on('t:x', () => { throw new Error('boom'); }), u2 = G.SimBus.on('t:x', () => { ran++; });
    G.SimBus.emit('t:x', {}); u1(); u2(); G.SimBus.emit('t:x', {}); console.error = origErr; if (ran !== 1) bad('SimBus isolation/unsubscribe: ran ' + ran); }
  console.log('11 sim events: ' + types + ' emitted as plain data with the sim never touching Spawner/Audio; a throwing subscriber is isolated'); }

// 12. the presentation layer turns those events into the player-facing words and sound
{ const said = [], sfx = []; G.Spawner = { say: (t, d, f) => said.push(t), CAP: 64 }; G.Audio = { sfx: k => sfx.push(k) };
  load('js/ui/gym-present.js');
  G.SimBus.emit('gym:escalate', { leader: 'Brock', bump: 1 }); G.SimBus.emit('gym:calm', { leader: 'Brock' });
  G.SimBus.emit('gym:badge', { badge: 'Boulder Badge', stat: 'atk', pct: 0.1 }); G.SimBus.emit('gym:badge', { badge: 'Cascade Badge', stat: null, pct: null });
  const want = ['Brock gets stronger, and so does the world!', 'The world calms with Brock defeated.', 'Boulder Badge earned! +10% Attack for the whole team, and a level up', 'Cascade Badge earned! and a level up'];
  if (said.join('|') !== want.join('|')) bad('gym-present text: ' + JSON.stringify(said)); if (sfx.join() !== 'rift') bad('gym-present sound ' + sfx);
  console.log('12 gym-present: escalate, calm and badge events render the exact toasts and the escalation sound'); }

console.log(fail ? fail + ' FAILED' : 'ALL OK');
process.exit(fail ? 1 : 0);
