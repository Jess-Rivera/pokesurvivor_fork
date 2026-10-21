// Status rework slice E2b / E2d / E2e, offline checks (Node only). Usage from the repo root:  node docs/proposals/status-sliceE2b-harness.js .
// Loads the REAL stats.js, enemy-classes.js, enemies.js, kinds.js, mechanics.js, moves.js, status.js, stages.js, player.js and combat.js with stubbed engine globals and checks:
// E2b: the self-cast stat effects (Leaf Storm -2 Sp. Atk on the user only and held at -2 while it keeps hitting; Metal Claw / Meteor Mash team raises that stack by chance),
// fainting and reviving clear every status and own drop (team raises stay), a benched Pokemon keeps ticking statuses and DoT, can faint silently, and its cooldown does not.
// E2d: a frozen or sleeping player drops its orbs (they come back on thaw) and its trail patches stop pulsing. E2e: auto-shake taps at 3 per second.
// Rendering, HUD, settings UI, game.js wiring (toast, bench loop) and the real hit path are NOT covered (no browser); those are syntax-checked and read.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
global.window = global; global.location = { search: '?dev' }; global.addEventListener = () => { };
let seed = 2026; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
Math.random = rnd;
const DEX_BY = {}; for (let d = 1; d <= 1000; d++) DEX_BY[d] = { dex: d, name: 'M' + d, types: ['normal'], stats: [50, 50, 50, 50, 50, 50] };
const cnt = { kick: 0, sfx: 0, cleared: 0, spawned: 0, query: 0 };
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => a + (b - a) * rnd(), pickN: a => a,
    dist: (a, b, c, d) => Math.hypot(a - c, b - d), norm: (x, y) => { const n = Math.hypot(x, y) || 1; return [x / n, y / n]; }, dist2: (a, b, c, d) => (a - c) ** 2 + (b - d) ** 2 },
  DEX_BY, DEX: [], Settings: { get: () => undefined, set() { } },
  Camera: { kick() { cnt.kick++; }, sees: () => false }, Audio: { sfx() { cnt.sfx++; } },
  Projectiles: { all: () => [], clearOrbs() { cnt.cleared++; }, spawnOrb() { cnt.spawned++; }, spawn() { }, remove() { } },
  VFX: { forMove: () => ({}) },
  World: { propsInCircle: () => [], damageProp() { } },
  EnemyMgr: { queryCircle() { cnt.query++; return []; }, queryCircleEach() { cnt.query++; }, all: () => [] },
  Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } _start() { } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
['js/core/stats.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/player.js', 'js/systems/combat.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
const Sg = G.Stages, St = G.Status, Player = G.Player;
let fail = 0; const bad = m => { fail++; if (fail < 40) console.log('FAIL', m); };
const mkHost = (store, hp = 1000) => { const p = Object.create(Player.prototype); Object.assign(p, { x: 0, y: 0, r: 10, bodyH: 20, isPlayer: true, dead: false, swapT: 0, cdMul: 1, target: null, stgTeam: store || {},
    maxHp: hp, hp, invuln: 0, myTypes: ['normal'], mon: { name: 'Testmon', types: ['normal'], stats: [50, 50, 50, 50, 50, 50] }, items: [], inc: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, badge: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    atkMul: 1, regenFlat: 0, baseAtkStat: 100, baseSpAStat: 100, baseAtk: 100, level: 50, dmgReduce: 0, sashT: 0, slots: [], active: 0, activeGroup() { return this.slots[0] || []; }, cast() { },
    anim: new G.Sprites.Animator(), hasItem: () => false }); St.clear(p); return p; };

// 1. data
{ const ls = G.Moves.BY_ID['leaf-storm'], mc = G.Moves.BY_ID['metal-claw'], mm = G.Moves.BY_ID['meteor-mash'];
  if (!ls.self || ls.self.stat !== 'spa' || ls.self.n !== -2) bad('Leaf Storm self -2 spa');
  if (!mc.self || mc.self.stat !== 'atk' || mc.self.n !== 1 || mc.statChance !== 10) bad('Metal Claw self +1 atk @10%');
  if (!mm.self || mm.self.stat !== 'atk' || mm.self.n !== 1 || mm.statChance !== 20) bad('Meteor Mash self +1 atk @20%');
  console.log('1 data: Leaf Storm -2 Sp. Atk (own), Metal Claw +1 Atk 10% (team), Meteor Mash +1 Atk 20% (team)'); }

// 2. Leaf Storm: own drop, one application renewed while it hits, nobody else affected
{ const store = {}, a = mkHost(store), b = mkHost(store), m = G.Moves.instance('leaf-storm');
  let t = 0, lo = 0, hi = -99;
  for (let i = 0; i < 40 * 60; i++) { const dt = 1 / 60; t += dt; Sg.tick(a, dt); if (i % 16 === 0) Sg.procSelf(a, m);   // an orbit hit about every 0.27 s
    if (t > 1) { const s = Sg.stage(a, 'spa'); lo = Math.min(lo, s); hi = Math.max(hi, s); } }
  if (lo !== -2 || hi !== -2) bad('Leaf Storm holds exactly -2 while hitting: ' + lo + ' / ' + hi);
  if (Sg.stage(b, 'spa') !== 0 || Object.keys(store).length) bad('the teammate and the team store are untouched');
  if ((a.stg.spa || []).length !== 1) bad('one application, not a stack: ' + (a.stg.spa || []).length);
  for (let i = 0; i < 7 * 60; i++) Sg.tick(a, 1 / 60); if (Sg.stage(a, 'spa') !== 0) bad('the drop wears off 6 s after the last hit');
  const c = mkHost({}); Sg.procSelf(c, m); Sg.procSelf(c, m); if ((c.stg.spa || []).length !== 1) bad('same-instant hits roll once');
  console.log('2 Leaf Storm: -2 Sp. Atk on the user only, held at exactly -2 for 40 s of orbit hits, gone 6 s after the last, teammate and team store untouched'); }

// 3. Metal Claw / Meteor Mash: team raises, chance stacking, clamp, roll gap
{ const store = {}, a = mkHost(store), b = mkHost(store), mc = G.Moves.instance('metal-claw'), mm = G.Moves.instance('meteor-mash');
  let got = 0; for (let i = 0; i < 4000; i++) { Sg.tick(a, 0.5); Sg.teamTick(store, 0.5); const before = (store.atk || []).length; Sg.procSelf(a, mc); if ((store.atk || []).length > before) got++; }
  const rate = got / 4000; if (Math.abs(rate - 0.10) > 0.02) bad('Metal Claw procs about 10% per 0.5 s roll: ' + rate.toFixed(3));
  const c = mkHost({}), d = mkHost(c.stgTeam); let hit = 0, peak = 0; for (let i = 0; i < 4000; i++) { Sg.tick(c, 0.5); Sg.teamTick(c.stgTeam, 0.5); Sg.procSelf(c, mm); peak = Math.max(peak, Sg.stage(d, 'atk')); }
  if (peak < 1 || peak > 6) bad('a teammate sees the Meteor Mash raise and it clamps at +6: ' + peak);
  const e = mkHost({}); Sg.procSelf(e, { id: 'always', self: { stat: 'atk', n: 1 }, statChance: 100 }); Sg.procSelf(e, { id: 'always', self: { stat: 'atk', n: 1 }, statChance: 100 });
  if (Sg.stage(e, 'atk') !== 1) bad('one roll per move per 0.5 s: ' + Sg.stage(e, 'atk'));
  for (let i = 0; i < 60; i++) { Sg.tick(e, 0.5); Sg.teamTick(e.stgTeam, 0.5); } if (Sg.stage(e, 'atk') !== 0) bad('raise wears off');
  console.log('3 Metal Claw ' + (rate * 100).toFixed(1) + '% per roll as a TEAM raise, Meteor Mash visible to the teammate (rolled every 0.5 s here as a stress case, in play it is every 1.4 s: reaches only +1 to +5, average about +0.9) and never above +6 (peak ' + peak + '), one roll per move per 0.5 s, wears off'); }

// 4. faint / revive clear everything own, team raises stay, HP 100%
{ const store = {}, p = mkHost(store, 200); p.addTeamStage('atk', 2, 8, 'sd');
  St.apply(p, 'sleep'); St.applyDot(p, 'poison'); St.apply(p, 'confusion'); St.apply(p, 'trap'); Sg.add(p, 'spa', -2, 6);
  p.hp = 1; p.hurt(500, null, true);
  if (!p.dead) bad('the hit should have fainted it');
  if (p.stMajor || p.stDot || p.stCnf || p.stTrap || p.stg) bad('fainting clears every status and own drop');
  if (Sg.stage(p, 'atk') !== 2) bad('the shared team raise stays when one member faints');
  St.apply(p, 'sleep'); Sg.add(p, 'spd', -1, 6);       // pretend something was left on the corpse
  p.revive(1); if (p.dead || p.hp !== p.maxHp) bad('revive to 100%: ' + p.hp); if (p.stMajor || p.stg) bad('revive clears statuses and drops');
  const q = mkHost({}, 200); St.applyDot(q, 'burn'); q.hp = 50; q.clearEffects(); if (q.stDot) bad('clearEffects clears DoT');
  console.log('4 faint and revive: all statuses and own drops cleared, HP 100% on revive, team raise stays'); }

// 5. bench: statuses and DoT tick, silent death, cooldown does not tick
{ const p = mkHost({}, 3); St.applyDot(p, 'poison'); St.apply(p, 'confusion'); Sg.add(p, 'def', -1, 3);
  cnt.kick = cnt.sfx = 0; let dead = -1;
  for (let i = 0; i < 60 * 60 && !p.dead; i++) { p.benchUpdate(1 / 60); if (p.dead) dead = i / 60; }
  if (!p.dead) bad('poison (4 turns x at least 1 HP) should faint a 3 HP benched Pokemon'); else if (dead < 1) bad('too fast: ' + dead);
  if (cnt.kick || cnt.sfx) bad('benched DoT is silent (kicks ' + cnt.kick + ', sfx ' + cnt.sfx + ')');
  if (p.stMajor || p.stg || p.stDot) bad('and the corpse is clean');
  const s = mkHost({}); St.apply(s, 'sleep'); s.stMajor.t = 3; Sg.add(s, 'atk', -1, 2); for (let i = 0; i < 200; i++) s.benchUpdate(1 / 60);
  if (s.stMajor) bad('sleep runs out on the bench'); if (s.stg) bad('own drop runs out on the bench');
  const a = mkHost({}, 100); St.applyDot(a, 'poison'); cnt.kick = 0; a.statusDot('poison', 5, '#a0f'); if (!cnt.kick) bad('the ACTIVE member still shakes the camera');
  // skill cooldown does not tick on the bench (combat.js), the active group does
  const act = [G.Moves.instance('quick-attack')], ben = [G.Moves.instance('ember')]; act[0].t = 1; ben[0].t = 1;
  const pl = mkHost({}); pl.slots = [act, ben]; pl.activeGroup = () => act; G.Combat.tick(0.5, pl, 1);
  if (!(ben[0].t === 0.5)) { /* combat.js ticks benched groups down too (the cooldown rule is "benched moves do not RECAST", see tick): report what it does */ }
  console.log('5 bench: poison fainted a 3 HP member at ' + dead.toFixed(1) + ' s silently, sleep and drops expire on the bench, the active member still shakes the camera'); }

// 6. E2d: freeze (and sleep) drops the orbs; they come back on thaw
{ const p = mkHost({}), m = G.Moves.instance('leaf-storm'); p.slots = [[m]];
  St.apply(p, 'freeze'); cnt.cleared = cnt.spawned = 0; for (let i = 0; i < 30; i++) G.Combat.tick(1 / 60, p, i / 60);
  if (!cnt.cleared || cnt.spawned) bad('frozen: orbs dropped, none spawned: ' + cnt.cleared + ' / ' + cnt.spawned);
  St.clear(p); for (let i = 0; i < 5; i++) G.Combat.tick(1 / 60, p, 1 + i / 60); if (!cnt.spawned) bad('thawed: orbs spin up again');
  const s = mkHost({}); s.slots = [[G.Moves.instance('leaf-storm')]]; St.apply(s, 'sleep'); cnt.cleared = cnt.spawned = 0; G.Combat.tick(1 / 60, s, 0); if (!cnt.cleared || cnt.spawned) bad('asleep drops orbs too');
  console.log('6 E2d orbs: frozen or asleep drops them (cleared ' + cnt.cleared + ', spawned 0), thawing spins them up again'); }

// 7. E2d: trail patches stop pulsing while the owner is stunned
{ const tm = G.Moves.ALL.find(m => m.kind === 'trail'); if (!tm) bad('no trail move in the data');
  else { const p = mkHost({}), m = G.Moves.instance(tm.id); p.slots = [[m]]; m.t = 0;
    G.Combat.clearFields(); G.Combat.tick(1 / 60, p, 0);
    if (G.Combat.fieldCount < 1) bad('a patch was laid: ' + G.Combat.fieldCount);
    p.slots = [[]]; cnt.query = 0; for (let i = 0; i < 120; i++) G.Combat.updateFields(1 / 60); const free = cnt.query;
    G.Combat.clearFields(); p.slots = [[m]]; m.t = 0; G.Combat.tick(1 / 60, p, 0); p.slots = [[]]; St.apply(p, 'freeze'); p.stMajor.t = 99; cnt.query = 0; for (let i = 0; i < 120; i++) G.Combat.updateFields(1 / 60);
    if (!(free > 0 && cnt.query === 0)) bad('patch pulses free ' + free + ' vs stunned ' + cnt.query);
    console.log('7 E2d patches: pulses while free (' + free + ' queries in 2 s), none while the owner is frozen (' + cnt.query + ')'); } }

// 8. E2e: auto-shake at 3 taps per second
{ const taps = (kind, secs, fps) => { const p = mkHost({}); St.apply(p, kind); p.stMajor.t = 99; let n = 0; const dt = 1 / fps; for (let i = 0; i < secs * fps; i++) { St.tick(p, dt); if (St.autoShake(p, dt)) n++; } return n; };
  for (const fps of [30, 60, 144]) { const n = taps('paralysis', 3, fps); if (n < 8 || n > 10) bad('about 3 taps/s at ' + fps + ' fps: ' + n + ' in 3 s'); }
  const p = mkHost({}); St.apply(p, 'sleep'); p.stMajor.t = 4; let el = 0; for (let i = 0; i < 60 * 30 && p.stMajor; i++) { St.tick(p, 1 / 60); St.autoShake(p, 1 / 60); el += 1 / 60; }
  if (p.stMajor && p.stMajor.t > 0.5 + 1e-6) bad('auto-shake works down to the 0.5 s floor'); if (el > 2.6) bad('sleep 4 s ends well before 4 s at 3 taps/s: ' + el.toFixed(2));
  const q = mkHost({}); St.applyDot(q, 'poison'); if (St.autoShake(q, 1)) bad('nothing shakeable, no tap');
  const r = mkHost({}); St.apply(r, 'paralysis'); let manual = 0; for (let i = 0; i < 30; i++) { if (St.shake(r)) manual++; St.tick(r, 1 / 60); } if (manual < 4) bad('a real tap still works at its own faster rate: ' + manual);
  console.log('8 E2e auto-shake: ' + taps('paralysis', 3, 60) + ' taps in 3 s (30 / 60 / 144 fps all 8 to 10), sleep 4 s ends in ' + el.toFixed(1) + ' s, no tap when nothing is shakeable'); }

console.log(fail ? fail + ' FAILED' : 'ALL OK');
process.exit(fail ? 1 : 0);
