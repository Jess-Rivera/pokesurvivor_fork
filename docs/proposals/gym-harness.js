// Gym pilot (Brock) offline checks (Node only). Usage from the repo root:  node docs/proposals/gym-harness.js .
// Real stats, pokedex, moves, the new move data chain, team cards, G.MoveGeom, G.MoveSim, G.MoveEffects, enemies, enemy, boss-ai, elites, gyms,
// gym and simbus files with stubbed engine globals. Covers: the authoring validation (every rule with a negative case), stage ladders (stageFor),
// the loop-N lineup, the loop accessor and roster, a leader def for every roster slot at several levels (with a regression guard for the
// single-mon path), every slot through the real brain and G.MoveSim, the sim events (and that the sim never calls Spawner/Audio itself) and the
// gym-present subscriber text. Also: the leader def (level locked at gate spawn, HP from the 60 s TTK model), the folded Power and STAB through
// the ratio path, the Attack stage and the enrage clock on the factor, a 60 s simulated fight through the brain and the sim (only authored
// moves, Harden climbing), and the gate schedule. Slice 7a moved the tell, cooldown and Harden rules to boss-owner-harness.js.
// The arena, HUD and live game are NOT covered (no browser).
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
['js/core/stats.js', 'js/core/simbus.js', 'js/data/pokedex.js', 'js/data/sprites-meta.js', 'js/data/moves.js', 'js/data/enemy-classes.js', 'js/data/enemies.js',
 'js/data/move-attributes.js', 'js/data/moves-generated.js', 'js/data/move-overrides.js', 'js/data/move-handler.js', 'js/data/move-resolver.js', 'js/data/gyms.js', 'js/systems/stages.js',
 'js/systems/team-cards.js', 'js/systems/move-geom.js', 'js/systems/move-sim.js', 'js/systems/move-effects.js', 'js/entities/enemy.js', 'js/entities/boss-ai.js', 'js/systems/elites.js', 'js/systems/gym.js'].forEach(p => {
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
    ['unknown move', c => c.signatures[0].moves.push({ id: 'not-a-move' }), 'unknown move not-a-move'],
    ['five moves', c => c.signatures[0].moves.push({ id: 'body-slam' }, { id: 'bite' }), 'more than 4 moves'],
    ['no moves', c => { c.signatures[0].moves = []; }, 'has no moves'],
    ['no damaging move', c => { c.signatures[0].moves = [{ id: 'harden' }]; }, 'at least one damaging move'],
    ['move without a gym form', c => { c.signatures[0].moves[1].id = 'rock-slide'; }, 'no gym form yet'],
    ['card the rules do not know', c => { c.signatures[0].cards = { 'not-a-card': 1 }; }, 'unknown card'],
    ['ladder not increasing', c => { c.signatures[0].line[1].minLevel = 1; }, 'stage levels must increase'],
    ['ladder first stage not 1', c => { c.signatures[0].line[0].minLevel = 5; }, 'first stage must start at level 1'],
    ['unknown dex in a stage', c => { c.signatures[0].line[2].dex = 99999; }, 'unknown dex 99999'],
    ['non-integer stage level', c => { c.signatures[0].line[1].minLevel = 20.5; }, 'integer minLevel'],
    ['empty ladder', c => { c.signatures[0].line = []; }, 'non-empty stage ladder'],
    ['bad stance', c => { c.signatures[0].stance = 'sideways'; }, 'bad stance'],
    ['power out of range', c => { c.signatures[0].power = 9; }, 'power must be in'],
    ['typo field on a slot', c => { c.signatures[0].tempoo = 1; }, 'unknown field tempoo'],
    ['typo field on a move', c => { c.signatures[0].moves[0].hpBelw = 0.5; }, 'unknown field hpBelw'],
    ['typo field on a gym', c => { c.bagde = 'x'; }, 'unknown field bagde'],
    ['too many slots', c => { c.signatures.push(c.signatures[0]); }, 'signatures must be 1 to 6'],
    ['bad boost', c => { c.boost = { stat: 'luck', pct: 0.1 }; }, 'boost needs a stat']
  ];
  for (const [name, mut, needle] of cases) { const out = flags(mut); if (!out.some(m => m.includes(needle))) bad('validate missed "' + name + '" (wanted ' + needle + '): ' + JSON.stringify(out)); }
  console.log('1 authoring: Brock (six slots) valid across every region; ' + cases.length + ' negative cases each flagged'); }

// 2. gate and def
let g, def;
{ G.GymArena = { inArena: false, gate: null, openGate: info => { G.GymArena.gate = { gym: info }; return true; } };
  G.Gym.reset(); clock = 239; G.Gym.update(0.1, {}, 239); if (G.Gym.gate) bad('gate before 4:00');
  clock = 240; G.Gym.update(0.1, {}, 240); g = G.Gym.gate; if (!g) bad('no gate at 4:00');
  const wantL = Math.round(G.Stats.levelForTime(240)) + 4; if (g.level !== wantL) bad('level ' + g.level + ' vs ' + wantL);
  def = G.Gym.makeDef(g);
  const wild = G.Stats.hpForLevel(G.DEX_BY[74].stats[0], g.level);
  console.log('2 gate at 4:00: ' + g.leader + ' Lv ' + g.level + ', ' + def.name + ' HP ' + def.hp + ' (' + (def.hp / wild).toFixed(1) + 'x a wild unit at that level)');
  if (def.gym.moves.length !== 3 || def.gym.level !== g.level) bad('def gym descriptor'); }

// 3. leader entity: factors, stages, enrage
const pl = { level: 5, x: 600, y: 0, hp: 100, r: 10, dead: false, mon: { types: ['normal'] }, hurt: (...a) => hurts.push(a) };
G.Game.player = pl;
const mk = () => { const e = G.Boss.make(def, 0, 0); e.flying = false; return e; };
const adapt = d => ({ cat: d.category, dmg: d.basePower, type: d.type });
/** One frame through the brain and the shared sim step (the game's order: enemy update, then MoveRoute.tick). Returns the move:cast ids. */
const castsOf = fn => { const tape = G.SimBus.record(); fn(); G.SimBus.stopRecording(); return tape.filter(x => x.type === 'move:cast').map(x => x.moveId); };
{ const e = mk();
  if (!e.boss || !e.gym) bad('not a gym boss'); if (e.maxHp !== def.hp) bad('maxHp');
  const mt = e.brain.def('tackle'), mr = e.brain.def('rock-throw');
  // Brock's cards folded by the real card rules: Damage +10% each (x3), Count +1 each (x2), Velocity +15% each (x3), Area +15% each (x2)
  if (!near(mr.basePower, 45 * 1.3) || mr.space.count !== 3 || !near(mr.space.radRadius, 9 * 1.3) || !near(mr.delivery.moveSpeed, 260 * 1.45)) bad('Rock Throw cards: ' + JSON.stringify([mr.basePower, mr.space.count, mr.space.radRadius, mr.delivery.moveSpeed]));
  if (!near(mt.basePower, 40 * 1.3) || !near(mt.space.radRadius, 54 * 1.3) || !near(mt.space.radArc, 1.7)) bad('Tackle cards: ' + JSON.stringify([mt.basePower, mt.space.radRadius, mt.space.radArc]));
  const ft = e.brain.factor(adapt(mt)), fr = e.brain.factor(adapt(mr));
  const want = G.Stats.enemyAttackFactor(e.atkBase, e.spaBase, def.gym.level, 58.5, 'physical') * 1.5 / G.Stats.enemyAttackFactor(e.atkBase, e.spaBase, def.gym.level, 52, 'physical');
  if (!near(fr / ft, want)) bad('power ratio incl. STAB ' + fr / ft + ' vs ' + want);
  if (e.atkFactor == null || e.atkCat !== 'physical') bad('contact factor / cat'); if (e.atkType !== 'normal') bad('contact type ' + e.atkType);
  const hp0 = e.hp; e.hurt(100); const taken = hp0 - e.hp; if (!near(taken, 100)) bad('hurt() does not cut (the Defense stage acts in the damage ratio): ' + taken);
  // the attacker half: an Attack stage multiplies the leader's physical factor
  { const f0 = e.brain.factor(adapt(mt)); G.Stages.add(e, 'atk', 2, 5); if (!near(e.brain.factor(adapt(mt)) / f0, 2)) bad('atk stage on the factor ' + e.brain.factor(adapt(mt)) / f0); G.Stages.clear(e); }
  // enrage clock (engaged by the hit above at clock 240)
  const t0 = e.gym.engagedAt; if (t0 !== 240) bad('engagement ' + t0);
  const f = s => { clock = t0 + s; return e.brain.factor(adapt(mt)) / ft; };
  const r = [f(60), f(120), f(135), f(150), f(400)];
  if (!near(r[0], 1) || !near(r[1], 1) || !near(r[2], 1.5) || !near(r[3], 2) || !near(r[4], 2)) bad('enrage ramp ' + r);
  clock = 240;
  console.log('3 leader: Tackle Power 52 factor ' + ft.toFixed(1) + ', Rock Throw x' + (fr / ft).toFixed(2) + ' (Power 58.5, STAB), 3 rocks of 11.7 px at 377 px/s, enrage x' + r.map(v => v.toFixed(2)).join(' / ') + ' at +60/120/135/150/400 s'); }

// 5. simulated fight through the brain and G.MoveSim: 30 s up close, then 30 s at range (boss held in place to isolate the AI)
{ G.MoveSim.clear(); const e = mk(); const seen = {}; let maxDef = 0, errs = [];
  hurts.length = 0;
  for (let i = 0; i < 60 * 20; i++) {
    clock = 240 + i * 0.05;
    e.x = 0; e.y = 0; pl.y = 0; pl.x = i < 600 ? 55 : 380;
    try { for (const id of castsOf(() => { e.update(0.05, pl); G.MoveSim.step(0.05, clock); })) seen[id] = (seen[id] || 0) + 1; } catch (x) { errs.push(x.message); break; }
    maxDef = Math.max(maxDef, +G.Stages.mul(e, 'def').toFixed(2));
  }
  for (const id of Object.keys(seen)) if (!['tackle', 'rock-throw', 'harden'].includes(id)) bad('unauthored move ' + id);
  if (!(seen.tackle && seen['rock-throw'] && seen.harden)) bad('not every move used in 60 s: ' + JSON.stringify(seen));
  if ('fury' in e.brain) bad('the old fury state is back');
  if (!hurts.length) bad('the leader never hurt the player'); if (hurts.some(a => !(a[0] > 0) || a[3].cat !== 'physical' || !['normal', 'rock'].includes(a[1]))) bad('a hit that is not Tackle or Rock Throw');
  if (maxDef < 4 - 1e-9) bad('Harden should reach +6 (x4 Defense) inside 60 s, peak x' + maxDef);
  console.log('5 60 s fight: casts ' + JSON.stringify(seen) + ', ' + hurts.length + ' hits on the player, peak Def stage multiplier x' + maxDef + (errs.length ? ', ERRORS ' + errs : ', no errors')); if (errs.length) bad('fight errors'); }

// 6. schedule after the fight
{ G.Gym.onReturn(g); if (G.Gym.beaten !== 1 || G.Gym.gate) bad('onReturn state'); G.GymArena.gate = null;
  // the next gates follow in list order, GAP s after each return; none after the last gym
  const order = [];
  for (let i = 1; i < G.Gyms.KANTO.length; i++) {
    clock += G.Gym.GAP - 1; G.Gym.update(0.1, {}, clock); if (G.Gym.gate) bad('gate ' + (i + 1) + ' before GAP');
    clock += 1; G.Gym.update(0.1, {}, clock); const gi = G.Gym.gate;
    if (!gi || gi.leader !== G.Gyms.KANTO[i].leader) { bad('gate ' + (i + 1) + ' should be ' + G.Gyms.KANTO[i].leader); break; }
    order.push(gi.leader); G.Gym.onReturn(gi); G.GymArena.gate = null;
  }
  clock += 9999; G.Gym.update(0.1, {}, clock); if (G.Gym.gate) bad('a gate after the last gym');
  console.log('6 schedule: after Brock, ' + order.join(', ') + ' in order, GAP apart; beaten ' + G.Gym.beaten + ', no gate after the last'); }

// 7. stage ladders: the stage a slot shows follows the level (placeholder bands 20 / 35), single-stage lines never change
{ const sg = i => G.Gyms.KANTO[0].signatures[i];
  const at = (i, l) => G.Gyms.stageFor(sg(i), l).dex;
  const geo = [[1, 74], [19, 74], [20, 75], [34, 75], [35, 76], [99, 76]];
  for (const [l, want] of geo) if (at(0, l) !== want) bad('Geodude line at level ' + l + ': dex ' + at(0, l) + ' vs ' + want);
  if (at(2, 34) !== 111 || at(2, 35) !== 112) bad('Rhyhorn line boundary'); if (at(1, 34) !== 95 || at(1, 35) !== 208) bad('Onix line boundary (Steelix at 35)');
  for (const l of [1, 20, 35, 99]) if (at(5, l) !== 142) bad('Aerodactyl is single-stage, got ' + at(5, l) + ' at ' + l);
  if (G.Gyms.stageFor(sg(0), NaN).dex !== 74) bad('a non-finite level should fall back to the first stage');
  console.log('7 stage ladders: Geodude 74 until 19, Graveler 20 to 34, Golem from 35; Steelix at 35; Aerodactyl never changes'); }

// 8. lineup: loop N fields the first N slots, in order, each at its stage
{ const brock = G.Gyms.KANTO[0], dexes = lv => G.Gyms.lineup(brock, 6, lv).map(m => m.dex);
  if (dexes(12).join() !== '74,95,111,138,140,142') bad('full lineup at level 12: ' + dexes(12));
  if (dexes(35).join() !== '76,208,112,139,141,142') bad('full lineup at level 35: ' + dexes(35));
  for (let n = 1; n <= 6; n++) { const l = G.Gyms.lineup(brock, n, 12); if (l.length !== n || l.some((m, i) => m.index !== i || m.sig !== brock.signatures[i])) bad('lineup loop ' + n + ' is not the first ' + n + ' in order'); }
  for (const odd of [0, -3, NaN, undefined, null, 'x']) if (G.Gyms.lineup(brock, odd, 12).length !== 1) bad('loop ' + odd + ' should clamp to 1 slot');
  if (G.Gyms.lineup(brock, 99, 12).length !== 6) bad('loop 99 should clamp to the roster size'); if (G.Gyms.lineup(brock, 2.9, 12).length !== 2) bad('a fractional loop floors');
  console.log('8 lineup: loop 1..6 gives the first N slots in order; stage at level 12 is Geodude/Onix/Rhyhorn/Omanyte/Kabuto/Aerodactyl, at 35 the finals; odd loops clamp'); }

// 9. loop accessor, roster and the escalation bump feeding the stage
G.GymArena.gate = null; G.Gym.reset(); clock = 240; G.Gym.update(0.1, {}, 240);
const g2 = G.Gym.gate; if (!g2) bad('no gate for sections 9 to 12');
{ if (G.Gym.loop !== 1) bad('default loop'); G.Gym.debugLoop(4); if (G.Gym.loop !== 4 || G.Gym.roster(g2).length !== 4) bad('debugLoop 4 / roster size ' + G.Gym.roster(g2).length);
  G.Gym.debugLoop(99); if (G.Gym.loop !== G.Gyms.LOOPS) bad('debugLoop clamps high'); G.Gym.debugLoop(0); if (G.Gym.loop !== 1) bad('debugLoop clamps low'); G.Gym.debugLoop(NaN); if (G.Gym.loop !== 1) bad('debugLoop NaN');
  G.Gym.debugLoop(3); G.Gym.reset(); if (G.Gym.loop !== 1) bad('reset() should clear the loop');
  G.GymArena.gate = null; clock = 240; G.Gym.update(0.1, {}, 240); const g3 = G.Gym.gate;
  if (G.Gym.roster(g3)[0].dex !== 74) bad('slot 1 at gate level ' + g3.level + ' should be Geodude');
  G.Gym.debugEsc(g3.level >= 20 ? 0 : 20 - g3.level); if (G.Gym.roster(g3)[0].dex !== 75) bad('with the bump to level 20 slot 1 should be Graveler, got ' + G.Gym.roster(g3)[0].dex);
  if (G.Gym.gate.dex !== 74) bad('the gate keeps the spawn-time stage for its label');
  console.log('9 loop and roster: default 1, debugLoop clamps 1..6, reset clears it, roster follows loop and the bump (Geodude -> Graveler at Lv 20), gate label keeps its spawn stage'); }
G.GymArena.gate = null; G.Gym.reset(); clock = 240; G.Gym.update(0.1, {}, 240);
const gate2 = G.Gym.gate;

// 10. a def for every slot at several levels, a regression guard for the single-mon path, and every slot through the real boss AI
{ const names = { 74: 'Geodude', 75: 'Graveler', 76: 'Golem', 111: 'Rhyhorn', 112: 'Rhydon', 138: 'Omanyte', 139: 'Omastar', 140: 'Kabuto', 141: 'Kabutops', 95: 'Onix', 208: 'Steelix', 142: 'Aerodactyl' };
  const d0 = G.Gym.makeDef(gate2); if (d0.dex !== 74 || d0.name !== 'Geodude' || d0.hp !== 1029 || d0.gym.moves.length !== 3) bad('REGRESSION: the default leader def changed: ' + [d0.dex, d0.name, d0.hp, d0.gym.moves.length]);
  for (let slot = 0; slot < 6; slot++) for (const lv of [12, 20, 35, 60]) {
    const d = G.Gym.makeDef(Object.assign({}, gate2, { level: lv }), slot), want = G.Gyms.stageFor(G.Gyms.KANTO[0].signatures[slot], lv).dex;
    if (d.dex !== want || d.name !== names[want] || d.gym.species !== names[want]) bad('slot ' + slot + ' level ' + lv + ' def is ' + d.name + ' (dex ' + d.dex + '), wanted dex ' + want);
    if (!Number.isFinite(d.hp) || d.hp <= 0 || !(d.spd > 0)) bad('slot ' + slot + ' level ' + lv + ' bad hp/spd ' + [d.hp, d.spd]);
    if (d.gym.moves.length !== G.Gyms.KANTO[0].signatures[slot].moves.length || d.gym.moves.some(m => !G.MoveDefs[m.id])) bad('slot ' + slot + ' moves not in the move data');
    if (d.gym.level !== lv) bad('slot ' + slot + ' effective level ' + d.gym.level);
  }
  let threw = false; try { G.Gym.makeDef(gate2, 6); } catch (e) { threw = true; } if (!threw) bad('makeDef must refuse a slot that does not exist');
  // every slot through the real brain and G.MoveSim: close range at full HP, then far at 40% HP (so hpBelow moves can fire); only authored moves, every authored move used, no errors
  const out = [];
  for (let slot = 0; slot < 6; slot++) {
    G.MoveSim.clear();
    const sig = G.Gyms.KANTO[0].signatures[slot], d = G.Gym.makeDef(Object.assign({}, gate2, { level: 36 }), slot), e = G.Boss.make(d, 0, 0); e.flying = false;
    const seen = {};
    let err = null;
    for (let i = 0; i < 90 * 20 && !err; i++) {
      clock = 240 + i * 0.05; e.x = 0; e.y = 0; pl.y = 0; pl.x = i < 900 ? 55 : 380; if (i === 900) e.hp = e.maxHp * 0.4;
      try { pl.dead = false; for (const id of castsOf(() => { e.update(0.05, pl); G.MoveSim.step(0.05, clock); })) seen[id] = (seen[id] || 0) + 1; } catch (x) { err = x.message; }
    }
    if (err) bad('slot ' + slot + ' ' + d.name + ' threw in the boss AI: ' + err);
    for (const id of Object.keys(seen)) if (!sig.moves.some(m => m.id === id)) bad('slot ' + slot + ' cast an unauthored move ' + id);
    for (const m of sig.moves) if (!seen[m.id]) bad('slot ' + slot + ' ' + d.name + ' never used ' + m.id + ' in 90 s: ' + JSON.stringify(seen));
    out.push(d.name + ' ' + Object.keys(seen).length + '/' + sig.moves.length);
  }
  clock = 240;
  console.log('10 defs: every slot x levels 12/20/35/60 builds the right stage; default def unchanged (Geodude HP 1029); AI uses every authored move: ' + out.join(', ')); }

// 10b. gyms 2 to 8: every slot of every later gym through the real brain and G.MoveSim, same drill as 10 (close at full HP, far at 40% HP)
{ const out = [];
  for (let gi = 1; gi < G.Gyms.KANTO.length; gi++) {
    const entry = G.Gyms.KANTO[gi], gate = Object.assign({}, gate2, { idx: gi, leader: entry.leader, level: 36 });
    let used = 0, total = 0;
    for (let slot = 0; slot < entry.signatures.length; slot++) {
      G.MoveSim.clear();
      const sig = entry.signatures[slot], d = G.Gym.makeDef(gate, slot), e = G.Boss.make(d, 0, 0); e.flying = false;
      const near = Math.max(1, e.brain.reach() + (pl.r || 0) - 1); // where the brain stops walking in: just inside its largest melee reach
      if (d.dex !== G.Gyms.stageFor(sig, 36).dex) bad(entry.leader + ' slot ' + slot + ' def dex ' + d.dex);
      const seen = {}; let err = null;
      for (let i = 0; i < 90 * 20 && !err; i++) {
        clock = 240 + i * 0.05; e.x = 0; e.y = 0; pl.y = 0; pl.x = i < 900 ? near : 380; if (i === 900) e.hp = e.maxHp * 0.4;
        try { pl.dead = false; for (const id of castsOf(() => { e.update(0.05, pl); G.MoveSim.step(0.05, clock); })) seen[id] = (seen[id] || 0) + 1; } catch (x) { err = x.message; }
      }
      if (err) bad(entry.leader + ' slot ' + slot + ' ' + d.name + ' threw in the boss AI: ' + err);
      for (const id of Object.keys(seen)) if (!sig.moves.some(m => m.id === id)) bad(entry.leader + ' slot ' + slot + ' cast an unauthored move ' + id);
      for (const m of sig.moves) if (!seen[m.id]) bad(entry.leader + ' slot ' + slot + ' ' + d.name + ' never used ' + m.id + ' in 90 s: ' + JSON.stringify(seen));
      used += Object.keys(seen).length; total += sig.moves.length;
    }
    out.push(entry.leader + ' ' + used + '/' + total);
  }
  clock = 240;
  console.log('10b later gyms: every slot casts every authored move through the boss AI: ' + out.join(', ')); }

// 11. the sim emits events and never calls presentation itself (Spawner and Audio throw if touched; no subscriber is loaded yet)
{ G.Spawner = { say: () => bad('SIM called Spawner.say directly'), CAP: 64 }; G.Audio = { sfx: () => bad('SIM called Audio.sfx directly') };
  const grants = { levels: 0, boosts: [] }; G.Game.grantLevels = n => { grants.levels += n; }; G.Game.reviveTeam = () => { }; G.Game.badgeBoost = (st, p) => grants.boosts.push(st + ':' + p);
  G.GymArena.gate = null; G.Gym.reset(); clock = 240; G.Gym.update(0.1, {}, 240); const g4 = G.Gym.gate;
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
  if (said.join('|') !== want.join('|')) bad('gym-present text: ' + JSON.stringify(said)); if (sfx.join() !== 'gate') bad('gym-present sound ' + sfx);
  console.log('12 gym-present: escalate, calm and badge events render the exact toasts and the escalation sound'); }

console.log(fail ? fail + ' FAILED' : 'ALL OK');
process.exit(fail ? 1 : 0);
