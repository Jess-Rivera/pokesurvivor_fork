// Status rework slice E2a (team stage buffs), offline checks (Node only). Usage from the repo root:  node docs/proposals/status-sliceE2a-harness.js .
// Loads the REAL stats.js, kinds.js, mechanics.js, moves.js, gyms.js, status.js, stages.js, player.js and combat.js with stubbed engine globals and checks:
// the five buff moves' data (cd = duration = 8 s at base), the retired Buff Stacks / Increased Effect cards on stage buffs, sustain at base (exactly the
// stages one cast gives, no dip, no double, in both frame orders and with jittery frames), stacking through Recharge and Duration (duration / cooldown is
// the cap), the +-6 clamp, team-wide raises vs per-Pokemon drops, the stat reads (Attack stage on physical moves only), Dragon Dance (two stats), Aqua Ring
// regen applications, and Brock's authored Harden. Rendering, HUD and game.js wiring are NOT covered (no browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
global.window = global; global.location = { search: '?dev' }; global.addEventListener = () => { };
let seed = 4242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
Math.random = rnd;
const DEX_BY = {}; for (let d = 1; d <= 1000; d++) DEX_BY[d] = { dex: d, name: 'M' + d, types: ['normal'], stats: [50, 50, 50, 50, 50, 50] };
DEX_BY[74] = { dex: 74, name: 'Geodude', types: ['rock', 'ground'], stats: [40, 80, 100, 30, 30, 20] };
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => a + (b - a) * rnd(), pickN: a => a,
    dist: (a, b, c, d) => Math.hypot(a - c, b - d), norm: (x, y) => { const n = Math.hypot(x, y) || 1; return [x / n, y / n]; } },
  VFX: { forMove: () => ({}) }, DEX_BY, DEX: [], Settings: { get: () => undefined, set() { } },
  Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
['js/core/stats.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/data/gyms.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/player.js', 'js/systems/combat.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
const Sg = G.Stages, Player = G.Player, M = G.Mechanics;
let fail = 0; const bad = m => { fail++; if (fail < 40) console.log('FAIL', m); };
const near = (a, b, e = 0.06) => Math.abs(a - b) <= e;
const STAGE_MOVES = { 'swords-dance': ['atk', 2], 'agility': ['spe', 2], 'harden': ['def', 1], 'dragon-dance': ['atk', 1] };

// 1. data: every buff move recasts exactly when its last cast ends (cd = dur = 8 s), so one cast is sustained at base
for (const id of ['swords-dance', 'agility', 'harden', 'dragon-dance', 'aqua-ring']) {
  const d = G.Moves.BY_ID[id]; if (!d) { bad('missing move ' + id); continue; }
  if (d.cd !== 8 || d.dur !== 8) bad(id + ' cd / dur should be 8 / 8, got ' + d.cd + ' / ' + d.dur);
  if (d.stacks != null) bad(id + ' still carries the old stacks field');
}
{ const sd = G.Moves.BY_ID['swords-dance'], ag = G.Moves.BY_ID['agility'], hd = G.Moves.BY_ID['harden'], dd = G.Moves.BY_ID['dragon-dance'];
  if (sd.stageN !== 2 || sd.stat !== 'atk' || ag.stageN !== 2 || ag.stat !== 'spd' || (hd.stageN || 1) !== 1 || hd.stat !== 'def') bad('per-cast stages: SD +2 Atk, Agility +2 Spe, Harden +1 Def');
  if ((dd.stageN || 1) !== 1 || dd.stat !== 'atk' || !dd.stage2 || dd.stage2.stat !== 'spe' || dd.stage2.n !== 1) bad('Dragon Dance +1 Atk and +1 Spe');
  console.log('1 data: all five buff moves cd 8 s / duration 8 s; SD +2 Atk, Agility +2 Spe, Harden +1 Def, Dragon Dance +1 Atk and +1 Spe, no stack fields'); }

// 2. cards: Buff Stacks and Increased Effect are gone for stage buffs; Duration and Recharge stay; Aqua Ring keeps Increased Effect (its potency) but not Buff Stacks
{ const ok = (id, mech) => M.check(G.Moves.instance(id), M.BY_ID[mech]).ok;
  for (const id in STAGE_MOVES) {
    if (ok(id, 'stacks')) bad(id + ' must refuse Buff Stacks'); if (ok(id, 'effect')) bad(id + ' must refuse Increased Effect');
    if (!ok(id, 'duration')) bad(id + ' must take Duration'); if (!ok(id, 'recharge')) bad(id + ' must take Recharge');
  }
  if (ok('aqua-ring', 'stacks')) bad('Aqua Ring must refuse Buff Stacks'); if (!ok('aqua-ring', 'effect')) bad('Aqua Ring keeps Increased Effect'); if (!ok('aqua-ring', 'duration') || !ok('aqua-ring', 'recharge')) bad('Aqua Ring takes Duration and Recharge');
  console.log('2 cards: stage buffs take Duration and Recharge only; Aqua Ring also Increased Effect; nobody takes Buff Stacks'); }

// 3. real casts through Combat.tick: sustain at base, stacking by investment, clamp
const mkHost = (store) => { const p = Object.create(Player.prototype); Object.assign(p, { x: 0, y: 0, r: 10, bodyH: 20, isPlayer: true, dead: false, swapT: 0, cdMul: 1, target: null, stgTeam: store || {},
    inc: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, badge: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, atkMul: 1, regenFlat: 0, baseAtkStat: 100, baseSpAStat: 100, baseAtk: 100, level: 50,
    slots: [], active: 0, activeGroup() { return this.slots[0]; }, cast() { } }); return p; };
// stage over time for one buff move on a host: returns { min, max, avg, live } after the first cast, 200 s, frame times from `dts`
function sim(id, stacks, stat, order, dtf) {
  const p = mkHost(), m = G.Moves.instance(id); for (const k in stacks) for (let i = 0; i < stacks[k]; i++) if (!G.Moves.addStack(m, k)) bad('cannot stack ' + k + ' on ' + id);
  m.t = 0; p.slots = [[m]]; let t = 0, started = false, min = 99, max = -99, sum = 0, n = 0, maxLive = 0;
  while (t < 200) {
    const dt = dtf(); t += dt;
    if (order === 'combat-first') { G.Combat.tick(dt, p, t); Sg.teamTick(p.stgTeam, dt); } else { Sg.teamTick(p.stgTeam, dt); G.Combat.tick(dt, p, t); }
    const v = stat === 'regen' ? Sg.teamSum(p.stgTeam, 'regen') : Sg.stage(p, stat), live = (p.stgTeam[stat] || []).length;
    if (!started && live) started = true;
    if (started && t > 16) { min = Math.min(min, v); max = Math.max(max, v); sum += v; n++; maxLive = Math.max(maxLive, live); }
  }
  return { min, max, avg: sum / n, live: maxLive, m };
}
const fixed = () => 1 / 60, jit = () => 0.012 + rnd() * 0.012;
{ const rows = [];
  for (const id in STAGE_MOVES) { const [stat, n] = STAGE_MOVES[id];
    for (const order of ['combat-first', 'tick-first']) for (const [nm, f] of [['60 fps', fixed], ['jitter', jit]]) {
      const r = sim(id, {}, stat, order, f);
      if (r.min !== n || r.max !== n) bad(id + ' base (' + order + ', ' + nm + ') should hold exactly +' + n + ': min ' + r.min + ' max ' + r.max);
    }
    rows.push(id + ' +' + STAGE_MOVES[id][1]); }
  const ar = sim('aqua-ring', {}, 'regen', 'combat-first', jit); if (!near(ar.min, 1.6, 1e-9) || !near(ar.max, 1.6, 1e-9)) bad('Aqua Ring base holds one application (1.6 HP/s): ' + ar.min + ' to ' + ar.max);
  console.log('3 sustain at base (cooldown = duration): ' + rows.join(', ') + ' hold exactly their per-cast stage for 200 s, both frame orders, 60 fps and jittery frames; Aqua Ring one application (1.6 HP/s)'); }

{ const out = [];
  // Recharge and Duration each multiply duration / cooldown by (1 + 0.15 x stacks): the sustained stage is that ratio times the per-cast stages
  for (const [id, stat, n] of [['harden', 'def', 1], ['swords-dance', 'atk', 2]]) for (const [r, d] of [[4, 0], [0, 4], [2, 2], [7, 0], [5, 5]]) {
    const q = sim(id, { recharge: r, duration: d }, stat, 'combat-first', jit), want = n * (1 + 0.15 * r) * (1 + 0.15 * d);
    if (Math.abs(q.avg - Math.min(6, want)) > 0.25 + (want > 6 ? 0.5 : 0)) bad(id + ' r' + r + ' d' + d + ': average ' + q.avg.toFixed(2) + ' vs ratio ' + want.toFixed(2));
    if (q.max > 6) bad(id + ' over the clamp: ' + q.max); if (q.min < n - 1e-9) bad(id + ' dipped below base: ' + q.min);
    out.push(id + ' r' + r + '/d' + d + ' avg ' + q.avg.toFixed(2) + ' (' + q.min + '-' + q.max + ')'); }
  const big = sim('swords-dance', { recharge: 40, duration: 0 }, 'atk', 'combat-first', jit); if (big.max > 6) bad('clamp +6: ' + big.max);
  console.log('4 stacking: ' + out.join('; ') + '; 40 Recharge stacks still clamp at +' + big.max); }

// 5. team-wide raises, per-Pokemon drops, net stage
{ const store = {}, a = mkHost(store), b = mkHost(store);       // two roster members share ONE store
  a.addTeamStage('atk', 2, 8, 'swords-dance'); if (Sg.stage(b, 'atk') !== 2) bad('a teammate sees the raise');
  Sg.add(a, 'atk', -1, 6); if (Sg.stage(a, 'atk') !== 1 || Sg.stage(b, 'atk') !== 2) bad('own drop only on the one who took it: ' + Sg.stage(a, 'atk') + ' / ' + Sg.stage(b, 'atk'));
  Sg.add(a, 'atk', -6, 6); if (Sg.stage(a, 'atk') !== -5) bad('net of team +2 and own -7 is -5: ' + Sg.stage(a, 'atk'));
  const c = mkHost({}); c.addTeamStage('def', 4, 8, 'x'); c.addTeamStage('def', 4, 8, 'y'); if (Sg.stage(c, 'def') !== 6) bad('clamp +6');
  Sg.teamTick(store, 8.2); if (Sg.stage(b, 'atk') !== 0 || Object.keys(store).length) bad('expires 0.1 s after the end');
  console.log('5 team-wide raise (both members), own drop only on the Pokemon that took it, net = raises + drops clamped to +-6, expiry in place'); }

// 6. stat reads
{ const phys = G.Moves.ALL.find(m => m.cat === 'physical' && m.dmg > 0 && m.kind !== 'buff'), spec = G.Moves.ALL.find(m => m.cat === 'special' && m.dmg > 0 && m.kind !== 'buff'), st = G.Moves.ALL.find(m => m.cat === 'status' && m.kind !== 'buff');
  const p = mkHost(), f0 = [phys, spec].map(m => p.moveFactor(m));
  p.addTeamStage('atk', 2, 8, 'swords-dance'); const f1 = [phys, spec].map(m => p.moveFactor(m));
  if (!near(f1[0] / f0[0], 2, 1e-6)) bad('Atk +2 doubles a physical move: ' + f1[0] / f0[0]); if (!near(f1[1] / f0[1], 1, 1e-6)) bad('Atk +2 does not touch a special move: ' + f1[1] / f0[1]);
  Sg.add(p, 'spa', -1, 6); const f2 = p.moveFactor(spec); if (!near(f2 / f0[1], 0.66, 1e-6)) bad('own Sp. Atk -1 is x0.66 on a special move: ' + f2 / f0[1]);
  if (st) { const q = mkHost(); const a0 = q.moveFactor(st); q.addTeamStage('atk', 2, 8, 's'); if (!near(q.moveFactor(st), a0, 1e-9)) bad('a status move ignores the Attack stage'); }
  if (!near(p.atk / p.baseAtk, 2, 1e-6)) bad('pl.atk follows the Attack stage: ' + p.atk / p.baseAtk);
  const q = mkHost(); q.addTeamStage('regen', 1.6, 8, 'aqua-ring'); q.addTeamStage('regen', 1.6, 8, 'aqua-ring'); if (!near(q.regen, 3.2, 1e-9)) bad('regen = sum of applications: ' + q.regen);
  const s = mkHost(); s.addTeamStage('spe', 2, 8, 'agility'); if (!near(Sg.speedMul(s), 2, 1e-9)) bad('Speed +2 is x2.0 on movement: ' + Sg.speedMul(s)); s.addTeamStage('spe', 4, 8, 'agility2'); if (!near(Sg.speedMul(s), 4, 1e-9)) bad('Speed +6 is x4');
  const d = mkHost(); d.addTeamStage('def', 1, 8, 'harden'); if (!near(Sg.mul(d, 'def'), 1.5, 1e-9)) bad('Defense +1 is x1.5');
  console.log('6 stat reads: Atk +2 doubles physical moves only, own Sp. Atk -1 is x0.66, status moves ignore it, regen sums applications, Speed +2 is x2 (+6 x4), Def +1 is x1.5'); }

// 7. real cast hooks: Dragon Dance raises two stats; Aqua Ring regen; the same move recast refreshes at the end, stacks mid-way
{ const p = mkHost(), m = G.Moves.instance('dragon-dance'); m.t = 0; p.slots = [[m]]; G.Combat.tick(0.016, p, 0);
  if (Sg.stage(p, 'atk') !== 1 || Sg.stage(p, 'spe') !== 1) bad('Dragon Dance: Atk +1 and Spe +1, got ' + Sg.stage(p, 'atk') + ' / ' + Sg.stage(p, 'spe'));
  const q = mkHost(); q.addTeamStage('def', 1, 8, 'harden'); Sg.teamTick(q.stgTeam, 4); q.addTeamStage('def', 1, 8, 'harden'); if (Sg.stage(q, 'def') !== 2) bad('a mid-way recast stacks');
  const r = mkHost(); r.addTeamStage('def', 1, 8, 'harden'); Sg.teamTick(r.stgTeam, 7.95); r.addTeamStage('def', 1, 8, 'harden'); if (Sg.stage(r, 'def') !== 1) bad('a recast in the last 0.1 s renews, it does not double: ' + Sg.stage(r, 'def'));
  const w = mkHost(); for (let i = 0; i < 20; i++) w.addTeamStage('atk', 1, 8, 'x'); if (w.stgTeam.atk.length !== Sg.TEAM_LIVE) bad('safety limit on live applications per move: ' + w.stgTeam.atk.length);
  console.log('7 casts: Dragon Dance Atk +1 and Spe +1 in one real cast, a recast mid-way stacks, one in the last 0.1 s renews, 8 live applications per move at most'); }

// 8. Brock: Harden is the stage version (Duration x2 authored; Buff Stacks is gone for it)
{ const bad0 = G.Gyms.validate(G.Gyms.KANTO[0]); if (bad0.length) bad('Brock fails validation: ' + bad0.join('; '));
  const h = G.Moves.instance('harden'); G.Moves.addStack(h, 'duration'); G.Moves.addStack(h, 'duration');
  if (!near(h.dur, 8 * 1.3, 1e-9) || h.stat !== 'def' || (h.stageN || 1) !== 1) bad('Brock Harden: dur ' + h.dur + ' stat ' + h.stat + ' stageN ' + h.stageN);
  const e = { stg: null }; Sg.add(e, 'def', h.stageN || 1, h.dur, h.stacks | 0 || Sg.MAX); Sg.add(e, 'def', 1, h.dur, h.stacks | 0 || Sg.MAX); if (Sg.stage(e, 'def') !== 2) bad('gym enemies still stack stage applications');
  console.log('8 Brock: validates against the real card rules, Harden +1 Def per cast lasting ' + h.dur.toFixed(1) + ' s (8 s x 1.3 for his two Duration stacks), no stack cap (the +-6 clamp), no Buff Stacks'); }

console.log(fail ? fail + ' FAILED' : 'all slice E2a checks passed');
process.exit(fail ? 1 : 0);
