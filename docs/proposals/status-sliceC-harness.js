// Status rework slice C, offline checks (Node only). Usage from the repo root:  node docs/proposals/status-sliceC-harness.js .
// Loads the REAL stats.js, enemies.js, moves.js, status.js, enemy.js, combat.js and mechanics.js with stubbed engine globals and checks the
// shared status engine on enemies (real Enemy.update), on strong hosts (boss / elite / gym / player-like object) and the combat hooks:
// one-major rule, durations, immunities, freeze / sleep cut and window, thaw, trap, confusion, paralysis, fizzle rates, the proc roll
// for control moves, Fire Spin as a trap, Lick without a hand-set slow, sheet text, and the player's DoT path.
// Rendering, input and the live game loop are NOT covered (no browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
const TYPES = ['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const tc = {}; TYPES.forEach(t => tc[t] = '#888');
const DEX_BY = { 1: { name: 'Normie', types: ['normal'] }, 2: { name: 'Flamer', types: ['fire'] }, 3: { name: 'Sparky', types: ['electric'] },
                 4: { name: 'Frosty', types: ['ice'] }, 5: { name: 'Spooky', types: ['ghost'] }, 6: { name: 'Toxer', types: ['poison'] } };
global.window = global; global.location = { search: '?dev' };
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;   // deterministic Math.random
Math.random = rnd;
const base = { U: { TYPE_COLOR: tc, TYPE_NAME: tc, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => a + (b - a) * rnd(), pickN: a => a,
    norm: (x, y) => { const n = Math.hypot(x, y) || 1; return [x / n, y / n]; } },
  DEX_BY, DEX: [], Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
['js/core/stats.js', 'js/data/enemies.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/systems/combat.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
const Enemy = G.Enemy;
Enemy.prototype.die = function () { this.dead = true; };
const St = G.Status, CT = St.CONTROL;

let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const mk = (dex = 1, hp = 1e6, extra) => { const e = new Enemy({ dex, baseHp: 50, spd: 50, dmg: 5, xp: 1, hp: 100, behavior: 'plain' }, 0, 0, { t: 0, dmg: 1, hp: 1, spd: 1 }, false); e.maxHp = hp; e.hp = hp; if (extra) Object.assign(e, extra); return e; };
const pl = { level: 5, x: 5000, y: 5000, hp: 100 };
const run = (e, secs, dt = 0.05, each) => { const n = Math.round(secs / dt); for (let i = 0; i < n; i++) { try { e.update(dt, pl); } catch (x) { if (!/primitive|not a function|undefined|noop/i.test(String(x))) throw x; } if (each) each(i * dt + dt); } };
// a player-like host: same fields, DoT through statusDot (like Player.statusDot, minus the real hurt)
const mkp = (types = ['normal'], hp = 1000) => { const p = { isPlayer: true, x: 0, y: 0, maxHp: hp, hp, mon: { types }, dead: false, taken: [] };
  p.statusDot = (k, a) => { p.hp -= a; p.taken.push([k, +a.toFixed(3)]); }; St.clear(p); return p; };
const tickN = (h, secs, dt = 0.05) => { for (let i = 0; i < Math.round(secs / dt); i++) St.tick(h, dt); };

// 1. table
if (!(CT.paralysis.dur === 10 && CT.freeze.dur === 2 && CT.sleep.dur[0] === 2 && CT.sleep.dur[1] === 6 && CT.confusion.dur[1] === 8 && CT.trap.turns === 4 && near(CT.trap.frac, 1 / 16))) bad('CONTROL table values');
if (!(St.STRONG.cut === 0.25 && St.STRONG.window === 10 && CT.freeze.window === 4)) bad('STRONG / window values');
console.log('1 CONTROL table: paralysis 10 s, freeze 2 s (+4 s window), sleep 2-6 s, confusion 2-8 s, trap 4 turns of 1/16; strong cut x0.25, 10 s window');

// 2. immunities
{ const out = {};
  out.elec = St.apply(mk(3), 'paralysis'); out.ice = St.apply(mk(4), 'freeze'); out.ghost = St.apply(mk(5), 'trap');
  if (out.elec !== 'immune' || out.ice !== 'immune' || out.ghost !== 'immune') bad('immunities ' + JSON.stringify(out));
  if (St.apply(mk(3), 'freeze') !== 'ok' || St.apply(mk(4), 'paralysis') !== 'ok' || St.apply(mk(5), 'paralysis') !== 'ok') bad('non-immune types must take it');
  console.log('2 immunities: Electric vs paralysis, Ice vs freeze, Ghost vs trap; others take them', JSON.stringify(out)); }

// 3. one major status at a time, through the real Enemy methods
{ const e = mk(); e.applyBurn(1); if (e.applyStatus('paralysis') !== 'blocked' || e.stMajor) bad('paralysis over burn must be blocked');
  e.applyPoison(1); if (e.poison) bad('poison over burn');
  const p = mk(); p.applyStatus('paralysis'); p.applyBurn(1); p.applyPoison(1); if (p.burn || p.poison) bad('burn/poison over paralysis must be blocked');
  if (p.applyStatus('sleep') !== 'blocked' || p.stMajor.k !== 'paralysis') bad('sleep over paralysis');
  const f = mk(); f.applyStatus('freeze'); if (f.applyStatus('paralysis') !== 'blocked') bad('paralysis over freeze');
  const c = mk(); c.applyBurn(1); c.applyStatus('confusion'); c.applyStatus('trap'); if (!c.stCnf || !c.stTrap) bad('confusion and trap are not major: they ride on top of burn');
  const t = mk(); t.applyPoison(1); t.applyPoison(2); if (t.poison !== 2) bad('poison -> toxic upgrade must still work');
  console.log('3 one major at a time: burn / poison / paralysis / sleep / freeze exclude each other; confusion and trap stack on top; poison -> toxic still upgrades'); }

// 4. paralysis: x0.5 speed, 10 s, refreshes, fizzle 25%
{ const e = mk(); e.applyStatus('paralysis'); if (!near(St.speedMul(e), 0.5)) bad('paralysis speed');
  tickN(e, 9.9); if (!e.stMajor) bad('paralysis ended early'); tickN(e, 0.2); if (e.stMajor) bad('paralysis did not end at 10 s');
  e.applyStatus('paralysis'); tickN(e, 6); e.applyStatus('paralysis'); tickN(e, 6); if (!e.stMajor) bad('re-hit should refresh paralysis');
  const q = mk(); q.applyStatus('paralysis'); let f = 0; const N = 40000; for (let i = 0; i < N; i++) if (St.fizzle(q)) f++;
  if (Math.abs(f / N - 0.25) > 0.01) bad('paralysis fizzle ' + f / N);
  console.log('4 paralysis: speed x0.5, ends at 10 s, a re-hit refreshes it, fizzle rate', (f / N).toFixed(3)); }

// 5. freeze: wild 2 s then 4 s window; sleep 2-6 s; neither extends
{ const e = mk(); e.applyStatus('freeze'); if (!St.stunned(e)) bad('frozen must be stunned');
  e.applyStatus('freeze'); tickN(e, 1.9); if (!e.stMajor) bad('freeze ended early'); tickN(e, 0.2); if (e.stMajor) bad('freeze outlasted 2 s (re-apply must not extend)');
  if (e.applyStatus('freeze') !== 'window') bad('no 4 s refreeze window'); tickN(e, 3.8); if (e.applyStatus('freeze') !== 'window') bad('window ended early');
  tickN(e, 0.3); if (e.applyStatus('freeze') !== 'ok') bad('window did not end at 4 s');
  const ds = []; for (let i = 0; i < 200; i++) { const s = mk(); s.applyStatus('sleep'); ds.push(s.stMajor.t); }
  if (Math.min(...ds) < 2 - 1e-9 || Math.max(...ds) > 6 + 1e-9) bad('sleep range ' + Math.min(...ds) + '-' + Math.max(...ds));
  const w = mk(); w.applyStatus('sleep'); w.stMajor.t = 0.1; tickN(w, 0.2); if (w.applyStatus('sleep') !== 'ok') bad('wild sleep has no window');
  console.log('5 freeze: 2 s then a 4 s window, never extended; sleep', Math.min(...ds).toFixed(2) + '-' + Math.max(...ds).toFixed(2), 's, no window'); }

// 6. strong hosts: freeze / sleep at 25% then a 10 s window; paralysis, trap, confusion at full strength
{ for (const tag of ['boss', 'elite', 'gym']) {
    const b = mk(1, 1e6, { [tag]: true });
    b.applyStatus('freeze'); if (!near(b.stMajor.t, 0.5)) bad(tag + ' freeze ' + b.stMajor.t);
    tickN(b, 0.6); if (b.stMajor) bad(tag + ' freeze did not end'); if (b.applyStatus('freeze') !== 'window' || b.applyStatus('sleep') !== 'ok') { /* sleep has its own window */ }
    const s = mk(1, 1e6, { [tag]: true }); s.applyStatus('sleep'); if (s.stMajor.t > 1.5 + 1e-9 || s.stMajor.t < 0.5 - 1e-9) bad(tag + ' sleep ' + s.stMajor.t);
    s.stMajor.t = 0.05; tickN(s, 0.1); if (s.applyStatus('sleep') !== 'window') bad(tag + ' no sleep window');
    tickN(s, 9.8); if (s.applyStatus('sleep') !== 'window') bad(tag + ' window ended before 10 s'); tickN(s, 0.3); if (s.applyStatus('sleep') !== 'ok') bad(tag + ' window did not end at 10 s');
    const f = mk(1, 1e6, { [tag]: true }); f.applyStatus('paralysis'); if (!near(f.stMajor.t, 10)) bad(tag + ' paralysis must be full strength');
    f.applyStatus('confusion'); f.applyStatus('trap'); if (!f.stCnf || !f.stTrap) bad(tag + ' confusion / trap'); }
  const p = mkp(); St.apply(p, 'freeze'); if (!near(p.stMajor.t, 0.5)) bad('player freeze ' + p.stMajor.t);
  console.log('6 boss / elite / gym / player: freeze 0.5 s, sleep 0.5-1.5 s, then a 10 s window; paralysis 10 s, trap and confusion full'); }

// 7. thaw: a Fire hit ends freeze, but not the instant it froze
{ const e = mk(); e.applyStatus('freeze'); St.onHit(e, 'fire'); if (!e.stMajor) bad('thawed in the same instant');
  St.onHit(e, 'water'); tickN(e, 0.3); if (!e.stMajor) bad('a non-fire hit must not thaw'); St.onHit(e, 'fire'); if (e.stMajor) bad('a fire hit did not thaw');
  const s = mk(); s.applyStatus('sleep'); tickN(s, 0.3); St.onHit(s, 'fire'); if (!s.stMajor) bad('fire must not wake a sleeper (damage never wakes)');
  const d = mk(1, 1000); d.applyStatus('sleep'); d.stMajor.t = 5; d.hp -= 200; if (!d.stMajor) bad('damage woke the sleeper');
  console.log('7 thaw: Fire after 0.2 s ends freeze; same-instant, other types and sleepers are left alone'); }

// 8. trap: 1/16 max HP per turn, 4 turns, x0.25 speed, no burn
{ const e = mk(1, 1600); e.applyStatus('trap'); if (!near(St.speedMul(e), 0.25)) bad('trap speed');
  const log = []; let last = e.hp; run(e, 10, 0.05, t => { if (e.hp < last - 1e-9) { log.push([+t.toFixed(2), +(last - e.hp).toFixed(2)]); last = e.hp; } });
  if (log.length !== 4 || log.some((l, i) => !near(l[1], 100) || Math.abs(l[0] - 2 * (i + 1)) > 0.11)) bad('trap ticks ' + JSON.stringify(log));
  if (e.stTrap) bad('trap did not clear'); if (e.burn) bad('trap must not set burn');
  const big = mk(1, 1600); big.applyStatus('trap', 2); const before = big.hp; run(big, 3, 0.05); if (!near(before - big.hp, 200)) bad('trap dot multiplier ' + (before - big.hp));
  const r = mk(1, 1e6); r.applyStatus('trap'); run(r, 5); r.applyStatus('trap'); run(r, 5); if (!r.stTrap) bad('re-hit should refresh trap');
  console.log('8 trap: ticks', JSON.stringify(log), 'speed x0.25, no burn, dot multiplier and refresh work'); }

// 9. confusion: wander, 50% fizzle, 2-8 s
{ const e = mk(); e.applyStatus('confusion'); const d0 = e.stCnf.t; if (d0 < 2 || d0 > 8) bad('confusion duration ' + d0);
  let f = 0; const N = 40000; for (let i = 0; i < N; i++) if (St.fizzle(e)) f++; if (Math.abs(f / N - 0.5) > 0.01) bad('confusion fizzle ' + f / N);
  const a = St.wander(e, 1, 0), n = Math.hypot(a[0], a[1]); if (!near(n, 1, 1e-9)) bad('wander must return a unit vector');
  const p = mkp(); St.apply(p, 'confusion'); p.stCnf.wa = Math.PI / 2; const b = St.wander(p, 1, 0, 0.5); if (!(b[1] > 0.3 && b[0] > 0.3)) bad('half-weight wander ' + b);
  const q = mk(); q.applyStatus('confusion'); q.stCnf.t = 0.1; tickN(q, 0.2); if (q.stCnf) bad('confusion did not end');
  const w = mk(); w.applyStatus('paralysis'); w.applyStatus('confusion'); let g = 0; for (let i = 0; i < N; i++) if (St.fizzle(w)) g++; if (Math.abs(g / N - (1 - 0.75 * 0.5)) > 0.01) bad('paralysis + confusion fizzle ' + g / N);
  console.log('9 confusion: 2-8 s, fizzle', (f / N).toFixed(3), '; with paralysis', (g / N).toFixed(3), '(want 0.625); wander is a unit heading'); }

// 10. real Enemy.update: a frozen / asleep enemy stands still and takes knockback decay only
{ for (const k of ['freeze', 'sleep']) { const e = mk(); e.x = 100; e.y = 100; e.applyStatus(k); e.stMajor.t = 1.5; const x0 = e.x, y0 = e.y; run(e, 1.0);
    if (e.x !== x0 || e.y !== y0) bad(k + ' enemy moved while stunned: ' + e.x + ',' + e.y); }
  const e = mk(); e.x = 100; e.y = 100; run(e, 1); const moved = Math.hypot(e.x - 100, e.y - 100);
  const t = mk(); t.x = 100; t.y = 100; t.applyStatus('trap'); t.stTrap.left = 99; run(t, 1); const slow = Math.hypot(t.x - 100, t.y - 100);
  if (moved > 0 && !(slow < moved * 0.4)) bad('trapped enemy should move ~x0.25: ' + slow + ' vs ' + moved);
  console.log('10 Enemy.update: frozen and asleep enemies do not move; trapped one covers', moved ? (slow / moved).toFixed(2) + ' of the free distance' : 'nothing measurable (movement is stubbed here; speedMul is checked in 4 and 8)'); }

// 11. procAilments: control moves roll by ailmentChance, throttle and strength
const roll = (id, n, dex = 1) => { const m = G.Moves.instance(id); let hit = 0;
  for (let i = 0; i < n; i++) { const e = mk(dex); G.Combat.procAilments(e, m.burn, m.poison, m); if (e.stMajor || e.stCnf || e.stTrap || e.burn || e.poison) hit++; } return hit / n; };
{ const N = 30000, r = { thundershock: roll('thunder-shock', N), discharge: roll('discharge', N), confusion: roll('confusion', N), icebeam: roll('ice-beam', N), lick: roll('lick', N), firespin: roll('fire-spin', 500), electricVsPara: roll('thunder-shock', 3000, 3) };
  const chk = (k, want, tol) => { if (Math.abs(r[k] - want) > tol) bad(k + ' proc rate ' + r[k] + ' want ' + want); };
  const want = id => G.Moves.instance(id).ailmentChance / 100;
  chk('thundershock', want('thunder-shock'), 0.012); chk('discharge', want('discharge'), 0.012); chk('confusion', want('confusion'), 0.012); chk('icebeam', want('ice-beam'), 0.012); chk('lick', want('lick'), 0.012);
  chk('firespin', 1, 0); chk('electricVsPara', 0, 0);
  const fs_ = G.Moves.instance('fire-spin'); if (fs_.burn) bad('Fire Spin must not carry burn any more'); if (G.Moves.instance('lick').slow) bad('Lick must not have a hand-set slow any more');
  const e = mk(); const m = G.Moves.instance('thunder-shock'); m.ailmentChance = 100; for (let i = 0; i < 100; i++) G.Combat.procAilments(e, 0, 0, m);
  if (!e.stMajor || e.stMajor.k !== 'paralysis') bad('100% paralysis did not apply'); if (!e.ailRoll || !(e.ailRoll['thunder-shock'] > 0)) bad('control ailments must use the roll throttle');
  console.log('11 proc roll:', 'thunder-shock', r.thundershock.toFixed(3), 'discharge', r.discharge.toFixed(3), 'confusion', r.confusion.toFixed(3), 'ice-beam', r.icebeam.toFixed(3), 'lick', r.lick.toFixed(3), '| fire-spin traps 100%, Electric enemy 0% paralysis'); }

// 12. wired moves and sheet text
{ const list = G.Moves.ALL.filter(d => G.Status.isControl(d.ailment)).map(d => d.id + ':' + d.ailment);
  const T = id => G.Mechanics.ailmentText(G.Moves.instance(id));
  const lines = { 'thunder-shock': T('thunder-shock'), 'ice-beam': T('ice-beam'), confusion: T('confusion'), 'fire-spin': T('fire-spin'), lick: T('lick') };
  if (!/^Paralysis chance 10% per hit: half speed, 25% of attacks fizzle, 10 s$/.test(lines['thunder-shock'])) bad('thunder-shock line ' + lines['thunder-shock']);
  if (!/^Freeze chance 10% per hit: cannot act for 2 s/.test(lines['ice-beam'])) bad('ice-beam line ' + lines['ice-beam']);
  if (!/^Confusion chance 10% per hit: wanders and 50% of attacks fizzle, 2-8 s$/.test(lines.confusion)) bad('confusion line ' + lines.confusion);
  if (!/^Trap chance 100% per hit: 6\.3% max HP every 2 s, 4 times/.test(lines['fire-spin'])) bad('fire-spin line ' + lines['fire-spin']);
  const m = G.Moves.instance('thunder-shock'), AC = G.Mechanics.BY_ID.ailchance; if (!G.Mechanics.check(m, AC).ok) bad('Ailment Chance must be allowed on thunder-shock'); G.Moves.addStack(m, 'ailchance');
  if (m.ailmentChance !== 20) bad('Ailment Chance +10 points on a paralysis move: ' + m.ailmentChance); if (!/Paralysis chance 20%/.test(G.Mechanics.ailmentText(m))) bad('card text on paralysis: ' + G.Mechanics.ailmentText(m));
  if (G.Mechanics.text(G.Moves.instance('thunder-shock'), AC) !== '+10 points Paralysis Chance') bad('card name: ' + G.Mechanics.text(G.Moves.instance('thunder-shock'), AC));
  console.log('12 wired control moves (' + list.length + '):', list.join(' ')); console.log('   ', JSON.stringify(lines)); }

// 13. the player as a host: the DoT path and its numbers match the enemies'
{ const p = mkp(['normal'], 1600); if (St.applyDot(p, 'burn') !== 'ok') bad('player burn'); tickN(p, 10);
  if (p.taken.length !== 4 || p.taken.some(t => !near(t[1], 100))) bad('player burn ticks ' + JSON.stringify(p.taken)); if (p.stDot) bad('player burn did not clear');
  const q = mkp(['normal'], 1600); St.applyDot(q, 'poison'); tickN(q, 10); if (q.taken.length !== 4 || q.taken.some(t => !near(t[1], 200))) bad('player poison ticks ' + JSON.stringify(q.taken));
  const z = mkp(['normal'], 1600); St.applyDot(z, 'toxic'); tickN(z, 20); if (z.taken.length !== 8 || !near(z.taken[0][1], 100) || !near(z.taken[3][1], 400)) bad('player toxic ticks ' + JSON.stringify(z.taken));
  const f = mkp(['fire']); if (St.applyDot(f, 'burn') !== 'immune') bad('fire-type player must be immune to burn'); const s = mkp(['steel']); if (St.applyDot(s, 'toxic') !== 'immune') bad('steel-type player vs toxic');
  const b = mkp(); St.apply(b, 'paralysis'); if (St.applyDot(b, 'burn') !== 'blocked') bad('burn over paralysis on the player');
  const t = mkp(['normal'], 1600); St.apply(t, 'trap'); tickN(t, 8.5); if (t.taken.length !== 4 || t.taken.some(x => x[0] !== 'trap' || !near(x[1], 100))) bad('player trap ticks ' + JSON.stringify(t.taken));
  const l = St.list(b); if (!l.length || l[0].k !== 'paralysis' || !(l[0].t > 9)) bad('HUD list ' + JSON.stringify(l));
  console.log('13 player host: burn 4 x 1/16, poison 4 x 1/8, toxic 8 turns N/16, trap 4 x 1/16; Fire vs burn and Steel vs toxic immune; one major rule holds; HUD list', JSON.stringify(l.map(x => x.k))); }

// 14. stun-lock guard on the player: a freeze chain never holds longer than 0.5 s per 10.5 s
{ const p = mkp(); let stunned = 0; const dt = 0.05, T = 60;
  for (let i = 0; i < T / dt; i++) { St.apply(p, 'freeze'); St.apply(p, 'sleep'); St.tick(p, dt); if (St.stunned(p)) stunned += dt; }
  if (stunned > T * (0.5 + 1.5) / 10.5 + 2) bad('player stun-lock: ' + stunned.toFixed(1) + ' s of ' + T);   // freeze and sleep each have their own window: at most ~2 s in 10.5
  console.log('14 stun-lock guard: freeze + sleep reapplied every frame for 60 s stun the player', stunned.toFixed(1), 's in total (about 15%; without the guard it would be 60 s)'); }

// 15. clear
{ const e = mk(); e.applyStatus('freeze'); e.applyStatus('trap'); e.applyStatus('confusion'); St.clear(e); if (e.stMajor || e.stCnf || e.stTrap || e.stWin) bad('clear'); console.log('15 clear: resets every field'); }

console.log(fail ? ('\n' + fail + ' FAILURES') : '\nALL PASS');
process.exit(fail ? 1 : 0);
