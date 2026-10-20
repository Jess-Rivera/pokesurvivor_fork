// Status rework slice E1 (statuses on the player), offline checks (Node only). Usage from the repo root:  node docs/proposals/status-sliceE1-harness.js .
// Loads the REAL status.js, stages.js, enemies.js, enemy-classes.js, enemy.js, combat.js and input.js with stubbed engine globals and checks:
// Shake off (tap table, floor, rate cap, order), daze jitter, drowsy x1.5, trap as a swap lock, the 2.5 s hard-CC grace, the 63 carrier assignments
// against the class table, the active-carrier cap (haste exempt), the sleep/drowsy 2:1 draw, secondary half duration, the haste nova (caster excluded),
// the slow stage limit, and the control presets (compact / full, no conflicts, saved-key collision). Rendering, Player.update and game.js are NOT covered (no browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
global.window = global; global.location = { search: '?dev' }; global.addEventListener = () => { };
let seed = 777; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
Math.random = rnd;
const DEX_BY = {}; for (let d = 1; d <= 1000; d++) DEX_BY[d] = { dex: d, name: 'M' + d, types: ['normal'], stats: [50, 50, 50, 50, 50, 50] };
let saved;       // what G.Settings.get('keybinds') returns
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => a + (b - a) * rnd(), pickN: a => a,
    norm: (x, y) => { const n = Math.hypot(x, y) || 1; return [x / n, y / n]; } },
  DEX_BY, DEX: [], Settings: { get: () => saved, set() { } },
  Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
['js/core/stats.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/systems/combat.js', 'js/core/input.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
const St = G.Status, Sg = G.Stages, C = G.Enemies.CARRIER, Enemy = G.Enemy;
Enemy.prototype.die = function () { this.dead = true; };
let fail = 0; const bad = m => { fail++; if (fail < 40) console.log('FAIL', m); };
const near = (a, b, e = 0.06) => Math.abs(a - b) <= e;
const mkp = (types = ['normal'], hp = 1000) => { const p = { isPlayer: true, x: 0, y: 0, maxHp: hp, hp, mon: { types }, dead: false, taken: [] }; p.statusDot = (k, a) => { p.hp -= a; p.taken.push([k, a]); }; St.clear(p); return p; };

// 1. Shake off: time left falls at 1 + 0.25 x taps/s, until 0.5 s remain
{ const t = (kind, taps) => { const p = mkp(); St.apply(p, kind); p.stMajor.t = kind === 'paralysis' ? 10 : kind === 'sleep' ? 4 : 2; let el = 0; const dt = 1 / 120, gap = 1 / taps; let next = 0;
    while (p.stMajor && el < 30) { if (el >= next) { St.shake(p); next += gap; } St.tick(p, dt); el += dt; } return el; };
  const want = { paralysis: [3.7, 2.9], sleep: [1.7, 1.4], freeze: [1.0, 0.9] };
  for (const k in want) for (const [i, taps] of [8, 12].entries()) { const got = t(k, taps); if (!near(got, want[k][i], 0.12)) bad('shake ' + k + ' @' + taps + '/s: ' + got.toFixed(2) + ' vs ' + want[k][i]); }
  console.log('1 shake off: paralysis 10 s -> ' + t('paralysis', 8).toFixed(1) + ' / ' + t('paralysis', 12).toFixed(1) + ' s, sleep 4 s -> ' + t('sleep', 8).toFixed(1) + ' / ' + t('sleep', 12).toFixed(1) + ', freeze 2 s -> ' + t('freeze', 8).toFixed(1) + ' / ' + t('freeze', 12).toFixed(1) + ' (8 / 12 taps per s)'); }

// 2. floor, rate cap, order, who can shake
{ const p = mkp(); St.apply(p, 'sleep'); p.stMajor.t = 0.6; St.shake(p); if (!near(p.stMajor.t, 0.5, 1e-9)) bad('floor 0.5: ' + p.stMajor.t);
  p.shakeCd = 0; if (St.shake(p)) bad('nothing left to shake at the floor'); if (St.shakeable(p)) bad('shakeable at the floor');
  const q = mkp(); St.apply(q, 'paralysis'); const t0 = q.stMajor.t; let n = 0; for (let i = 0; i < 100; i++) if (St.shake(q)) n++; if (n !== 1) bad('same-instant taps count once: ' + n);
  q.shakeCd = 0; St.tick(q, 1 / 12 + 1e-6); if (!St.shake(q)) bad('a tap 1/12 s later should count');
  const o = mkp(); St.apply(o, 'paralysis'); St.apply(o, 'confusion'); St.apply(o, 'daze'); St.apply(o, 'trap'); const c0 = o.stCnf.t, p0 = o.stMajor.t; St.shake(o);
  if (!(o.stMajor.t < p0) || o.stCnf.t !== c0) bad('paralysis (more restrictive) is shaken before confusion');
  o.stMajor.t = 0.5; o.shakeCd = 0; St.shake(o); if (!(o.stCnf.t < c0)) bad('then confusion'); 
  const b = mkp(); St.apply(b, 'daze'); St.applyDot(b, 'burn'); St.apply(b, 'drowsy'); const dz = b.stDaze.t; St.shake(b); if (!(b.stDaze.t < dz)) bad('daze is mashable');
  const only = mkp(); St.applyDot(only, 'poison'); St.apply(only, 'drowsy'); if (St.shakeable(only) || St.shake(only)) bad('DoTs and drowsy are not mashable');
  const e = { isPlayer: false, x: 0, y: 0, maxHp: 100, hp: 100, types: ['normal'], dead: false }; St.apply(e, 'paralysis'); if (St.shake(e)) bad('only the player shakes');
  console.log('2 shake rules: floor 0.5 s, 12 taps/s cap, most restrictive first, DoT / drowsy / slow not mashable, enemies cannot shake'); }

// 3. daze, drowsy, grace
{ const p = mkp(); St.apply(p, 'daze'); let mx = 0, tot = 0; for (let i = 0; i < 400; i++) { St.tick(p, 0.05); const [x, y] = St.jitter(p, 1, 0); const a = Math.atan2(y, x); mx = Math.max(mx, Math.abs(a)); tot += Math.abs(a); }
  if (mx > 35 * Math.PI / 180 + 1e-6) bad('daze jitter over 35 deg: ' + mx); if (tot / 400 < 0.05) bad('daze does not jitter');
  const d = mkp(); St.apply(d, 'daze'); tickN(d, 6.1); if (d.stDaze) bad('daze lasts 6 s');
  const w = mkp(); if (St.sleepChance(w, 0.6) !== 0.6) bad('no drowsy: base'); St.apply(w, 'drowsy'); if (!near(St.sleepChance(w, 0.6), 0.9, 1e-9) || St.sleepChance(w, 0.8) !== 1) bad('drowsy x1.5 capped at 100%');
  const g = mkp(); St.apply(g, 'freeze'); tickN(g, 2.01); if (g.stMajor) bad('freeze 2 s'); if (St.apply(g, 'paralysis') !== 'window') bad('no hard CC in the 2.5 s grace'); if (St.apply(g, 'confusion') === 'window') bad('confusion is not blocked by the grace');
  tickN(g, 2.6); if (St.apply(g, 'sleep') !== 'ok') bad('grace ended after 2.5 s');
  console.log('3 daze jitter max ' + (mx * 180 / Math.PI).toFixed(0) + ' deg, 6 s; drowsy sleep chance 0.6 -> 0.9, cap 100%; 2.5 s grace after hard CC'); }
function tickN(h, s, dt = 0.05) { for (let i = 0; i < Math.round(s / dt); i++) St.tick(h, dt); }

// 4. roster vs class table
{ const CO = G.Enemies.CARRIER_OF, ids = Object.keys(CO).map(Number), kinds = new Set(['slow', 'daze', 'paralysis', 'confusion', 'poison', 'trap', 'freeze', 'haste', 'sleep']);
  if (ids.length !== 63) bad('63 carriers, got ' + ids.length); for (const d of ids) if (!kinds.has(CO[d])) bad('kind ' + CO[d]);
  const prim = Object.keys(G.ENEMY_CLASSES).filter(d => G.ENEMY_CLASSES[d].c === 'status').map(Number), sec = Object.keys(G.ENEMY_CLASSES).filter(d => G.ENEMY_CLASSES[d].s === 'status').map(Number);
  const miss = prim.concat(sec).filter(d => !CO[d]), extra = ids.filter(d => !prim.includes(d) && !sec.includes(d));
  if (prim.length !== 47 || sec.length !== 16) bad('class table: ' + prim.length + ' primary / ' + sec.length + ' secondary'); if (miss.length) bad('no carrier status for ' + miss); if (extra.length) bad('carrier not in the Status class: ' + extra);
  const cnt = {}; for (const d of ids) cnt[CO[d]] = (cnt[CO[d]] || 0) + 1; console.log('4 roster: 63 carriers (' + prim.length + ' primary + ' + sec.length + ' secondary)', JSON.stringify(cnt)); }

// 5. cap on active carriers, haste exempt, inactive act as plain chasers
{ const mk = dex => new Enemy({ dex, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'chase' }, 0, 0, { t: 0, dmg: 1, hp: 1, spd: 1 }, false);
  const prim = Object.keys(G.Enemies.CARRIER_OF).map(Number).filter(d => G.ENEMY_CLASSES[d].c === 'status' && G.Enemies.CARRIER_OF[d] !== 'haste');
  const list = prim.slice(0, 8).map(mk); G.EnemyMgr = { all: () => list.concat(hasteL), queryCircle: () => [] };
  const hastePrim = Object.keys(G.Enemies.CARRIER_OF).map(Number).filter(d => G.ENEMY_CLASSES[d].c === 'status' && G.Enemies.CARRIER_OF[d] === 'haste');
  var hasteL = hastePrim.slice(0, 3).map(mk);
  for (let f = 0; f < 600; f++) for (const e of list.concat(hasteL)) e.carrierCheck(0.05);
  const on = list.filter(e => e.carrierOn).length, plain = list.filter(e => !e.carrierOn && e.behavior === 'chase').length, h = hasteL.filter(e => e.carrierOn).length;
  if (on !== C.cap) bad('active non-haste carriers ' + on + ' vs cap ' + C.cap); if (plain !== list.length - on) bad('inactive carriers must stay chasers'); if (h !== hasteL.length) bad('haste is exempt from the cap: ' + h);
  if (list.find(e => e.carrierOn).behavior !== 'carrier' || !G.Enemies.BANDS.carrier) bad('active = carrier behavior and band');
  list.find(e => e.carrierOn).dead = true; for (let f = 0; f < 100; f++) for (const e of list) e.carrierCheck(0.05); if (list.filter(e => e.carrierOn && !e.dead).length !== C.cap) bad('a freed slot is refilled');
  console.log('5 cap: ' + on + ' of ' + list.length + ' primary carriers active (cap ' + C.cap + '), the rest chase; ' + h + '/' + hasteL.length + ' haste active (exempt); a dead one frees its slot'); }

// 6. sleep species: drowsy 2 : sleep 1
{ const sl = Object.keys(G.Enemies.CARRIER_OF).map(Number).find(d => G.Enemies.CARRIER_OF[d] === 'sleep' && G.ENEMY_CLASSES[d].c === 'status');
  const e = new Enemy({ dex: sl, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'chase' }, 0, 0, { t: 0, dmg: 1, hp: 1, spd: 1 }, false); let d = 0, s = 0;
  for (let i = 0; i < 9000; i++) { const k = e.ailKind(); if (k === 'drowsy') d++; else if (k === 'sleep') s++; else bad('sleep species cast ' + k); }
  if (Math.abs(d / s - 2) > 0.15) bad('drowsy:sleep ' + (d / s).toFixed(2)); console.log('6 sleep species: drowsy ' + d + ' : sleep ' + s + ' (' + (d / s).toFixed(2) + ' to 1)'); }

// 7. landing a status: Player.inflict (copied here against the real tables), slow limit, secondary half duration
{ const Player = (() => { try { load('js/entities/player.js'); return G.Player; } catch (x) { return null; } })();
  if (!Player || !Player.prototype.inflict) bad('Player.inflict missing'); else {
    const p = mkp(); p.bodyH = 20; p.inflict = Player.prototype.inflict;
    for (let i = 0; i < 5; i++) p.inflict('slow'); if (Sg.stage(p, 'spe') !== -2) bad('slow from carriers stops at -2: ' + Sg.stage(p, 'spe'));
    if (!near(Sg.speedMul(p), 0.5, 1e-9)) bad('speed multiplier at -2 is 0.5: ' + Sg.speedMul(p)); const L = St.list(p); if (!L.some(x => x.k === 'slow')) bad('slow shows in the HUD list');
    const a = mkp(), b = mkp(); a.inflict = b.inflict = Player.prototype.inflict; a.inflict('paralysis'); b.inflict('paralysis', true); if (!near(a.stMajor.t, 10) || !near(b.stMajor.t, 5)) bad('secondary = half: ' + a.stMajor.t + ' / ' + b.stMajor.t);
    const c = mkp(); c.inflict = Player.prototype.inflict; c.inflict('poison', true); if (c.stDot.left !== 2) bad('secondary poison = 2 turns: ' + c.stDot.left);
    let hit = 0; for (let i = 0; i < 4000; i++) { const z = mkp(); z.inflict = Player.prototype.inflict; z.inflict('sleep'); if (z.stMajor) hit++; } if (Math.abs(hit / 4000 - C.sleepBase) > 0.03) bad('sleep chance ' + hit / 4000);
    let hd = 0; for (let i = 0; i < 4000; i++) { const z = mkp(); z.inflict = Player.prototype.inflict; St.apply(z, 'drowsy'); z.inflict('sleep'); if (z.stMajor) hd++; } if (Math.abs(hd / 4000 - C.sleepBase * 1.5) > 0.03) bad('drowsy sleep chance ' + hd / 4000);
    console.log('7 inflict: slow stage -1 per hit, floor -2 (x0.5); secondary half length (paralysis 5 s, poison 2 turns); sleep ' + (hit / 4000).toFixed(2) + ' -> drowsy ' + (hd / 4000).toFixed(2)); } }

// 8. haste nova: allies get Speed +1, the caster does not, stack cap
{ const mk = dex => new Enemy({ dex, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'chase' }, 0, 0, { t: 0, dmg: 1, hp: 1, spd: 1 }, false);
  const hd = Object.keys(G.Enemies.CARRIER_OF).map(Number).find(d => G.Enemies.CARRIER_OF[d] === 'haste' && G.ENEMY_CLASSES[d].c === 'status'), c = mk(hd), a = mk(1), b = mk(2), boss = Object.assign(mk(3), { boss: true });
  G.EnemyMgr = { all: () => [c, a, b], queryCircle: () => [c, a, b, boss] }; for (let i = 0; i < 4; i++) c.hasteNova();
  if (Sg.stage(c, 'spe') !== 0) bad('the caster is excluded'); if (Sg.stage(a, 'spe') !== N2(C.nova.stack) || Sg.stage(b, 'spe') !== N2(C.nova.stack)) bad('allies stack to the cap: ' + Sg.stage(a, 'spe')); if (Sg.stage(boss, 'spe') !== 0) bad('bosses are skipped');
  console.log('8 haste nova: allies +' + Sg.stage(a, 'spe') + ' Speed (cap ' + C.nova.stack + ' stacks), caster excluded, bosses skipped'); }
function N2(n) { return n; }

// 9. controls
{ const I = G.Input, bound = n => I.bindingsOf(n);
  const keys = n => bound(n).join(',');
  const want = { move_up: 'keyw,arrowup', attack_1: 'keyi,numpad1', attack_2: 'keyj,numpad2', attack_3: 'keyk,numpad3', attack_4: 'keyl,numpad4', swap_1: 'digit1', swap_6: 'digit6', swap_prev: 'keyz', swap_next: 'keyc', shake_off: 'keyh' };
  for (const a in want) if (keys(a) !== want[a]) bad('compact ' + a + ': ' + keys(a));
  if (I.conflicts().length) bad('compact conflicts ' + JSON.stringify(I.conflicts())); if (I.actionList.some(a => bound(a).includes('space'))) bad('space stays free for the dash');
  I.applyPreset('full'); const wf = { attack_1: 'numpad1', attack_4: 'numpad4', swap_1: 'digit1', swap_6: 'digit6', swap_prev: 'keyz', swap_next: 'keyc', shake_off: 'numpadadd', move_left: 'keya,arrowleft' };
  for (const a in wf) if (keys(a) !== wf[a]) bad('full ' + a + ': ' + keys(a)); if (I.conflicts().length) bad('full conflicts'); if (I.keyLabel('shake_off') !== 'Num+') bad('label Num+: ' + I.keyLabel('shake_off'));
  I.applyPreset('compact'); I.rebind('shake_off', 'keyj'); if (!I.conflicts().length === false && bound('attack_2').includes('keyj')) bad('rebind removes the key from the other action');
  I.resetBindings(); if (keys('shake_off') !== 'keyh') bad('reset = compact');
  console.log('9 controls: compact (WASD, IJKL, 1-6, Z/C, H) and full (WASD, Num1-4, 1-6, Z/C, Num+) have no conflicts, Space unbound, reset = compact'); }

if (fail) { console.log(fail + ' FAILURES'); process.exit(1); } else console.log('all slice E1 checks passed');
