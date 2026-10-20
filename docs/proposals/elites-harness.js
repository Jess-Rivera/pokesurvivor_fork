// Overworld Elites offline checks (Node only). Usage from the repo root:  node docs/proposals/elites-harness.js .
// Real stats, pokedex, sprite meta, class table, enemies, enemy and elites files with stubbed engine globals. Covers: the shared
// XP boost window, the elite species draw (band, no legendaries, no repeats, region), the HP model, the elite Enemy (size, HP, XP
// multiplier, power x enrage), engagement and the enrage ramp, the wild cap/rate window, the trim (walk-off) and the exclusions.
// The HUD, the sprites and the live game are NOT covered (no browser).
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () { }, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global; global.location = { search: '?dev' };
const base = { U: null, Sprites: { Animator: class { update() { } loop() { } play() { } busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hovers: () => false, preload() { }, animMeta: () => ({ ay: 40 }), PX: 2, dirFromAngle: () => 0 },
  Camera: { sees: () => false, outerRadius: () => 400, kick() { } }, Game: { player: { x: 0, y: 0 }, everyone: () => [{ level: 5 }] } };
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
['js/core/util.js'].forEach(p => { try { load(p); } catch (e) { } });
if (!G.U || !G.U.clamp) { console.log('util failed'); process.exit(1); }
['js/core/stats.js', 'js/data/pokedex.js', 'js/data/sprites-meta.js', 'js/data/kinds.js', 'js/data/mechanics.js', 'js/data/moves.js', 'js/data/enemy-classes.js', 'js/data/enemies.js', 'js/systems/stages.js', 'js/entities/enemy.js', 'js/systems/elites.js'].forEach(p => {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); } });
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const placed = [];
G.Spawner = { CAP: 64, placeElite: (def, t) => { const e = new G.Enemy(def, 100, 100, G.Enemies.scale(t)); e.id = placed.length + 1; placed.push(e); G.EnemyMgr._list.push(e); return e; } };
const EL = []; G.EnemyMgr = { _list: EL, all: () => EL, get count() { return EL.length; } };
G.Enemy.prototype.die = function () { this.dead = true; };

// 1. shared window
{ if (G.Stats.XP_BOOST_END !== 180) bad('XP_BOOST_END ' + G.Stats.XP_BOOST_END);
  if (G.Enemies.openingHpK(180) !== 1 || !near(G.Enemies.openingHpK(0), 0.55)) bad('openingHpK ends');
  if (G.Stats.levelForTime(0) !== 1 || G.Stats.levelForTime(1800) !== 50 || G.Stats.levelForTime(5000, false) !== 50) bad('level curve');
  console.log('1 window: XP_BOOST_END 180, openingHpK 0.55 -> 1, level 1 -> 50 clamped'); }

// 2. species draw
{ G.Enemies.rollRun();
  for (const reg of [null, 1, 3]) {
    G.Enemies.setRegion(reg);
    const used = new Set(); const seen = [];
    for (const t of [0, 150, 300, 500, 800, 1500, 1800, 2400, 2400, 2400]) {
      const d = G.Enemies.eliteDef(t, used); if (!d) { bad('no def at ' + t + ' region ' + reg); continue; }
      const p = G.DEX_BY[d.dex]; if (used.has(d.dex)) bad('repeat ' + d.dex); used.add(d.dex);
      if (p.leg) bad('legendary ' + p.name); if (reg != null && p.gen > reg) bad('region ' + reg + ' got gen ' + p.gen);
      const ti = G.Enemies.TIERS.findIndex((x, i, a) => !(a[i + 1] && t >= a[i + 1].from)); const top = ti >= G.Enemies.TIERS.length - 1;
      const band = top ? [600, 700] : G.Enemies.TIERS[ti + 1].bst;
      if (reg == null && (p.bst < band[0] || p.bst > band[1])) bad('bst ' + p.bst + ' outside ' + band + ' at ' + t);
      seen.push(p.name + ' ' + p.bst);
    }
    console.log('2 draw region ' + (reg == null ? 'all' : reg) + ': ' + seen.slice(0, 5).join(', ')); }
  G.Enemies.setRegion(null); }

// 3. HP model
{ const d = G.Enemies.eliteDef(120, new Set()); const out = [];
  for (const t of [120, 300, 600, 1200, 1800]) { const h = G.Elites.hpFor(d, t), wild = G.Stats.hpForLevel(d.baseHp, G.Stats.levelForTime(t)); out.push(Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0') + ' ' + h.hp + ' HP (x' + h.mul.toFixed(1) + ' wild ' + wild + ')'); if (h.mul < G.Elites.K.minHpMul - 1e-9) bad('below min mul at ' + t); }
  console.log('3 hp model (' + d.name + ', baseHp ' + d.baseHp + '): ' + out.join(' | ')); }

// 4. elite Enemy + cadence + enrage + wild window
{ G.Elites.reset(); EL.length = 0; placed.length = 0;
  G.Elites.update(0.1, 100); if (placed.length) bad('spawned before 2:00 minus preload');
  G.Elites.update(0.1, 119.9); if (placed.length) bad('spawned early');
  G.Elites.update(0.1, 120.0); if (placed.length !== 1) bad('did not spawn at 2:00'); const e = placed[0];
  if (!e || !e.elite) { bad('no elite'); } else {
    if (e.boss) bad('elite is a boss'); if (e.scale < 1.5 || e.scale > 2) bad('scale ' + e.scale);
    const x = e.elite; if (e.maxHp !== x.hp) bad('maxHp ' + e.maxHp + ' vs ' + x.hp);
    if (!near(e.xpMul, (e.def.xpMul || 1) * x.hpMul * 1.2)) bad('xpMul ' + e.xpMul);
    if (e.moraleNow() !== 1) bad('elite morale'); if (e.atkFactor0 == null || e.atkFactor0 <= 0) bad('atkFactor0');
    G.Elites.update(0.1, 121); if (!near(e.atkFactor, e.atkFactor0 * 1.5)) bad('pre-engage atkFactor ' + e.atkFactor);
    if (G.Elites.enrageIn(e) !== null) bad('enrageIn before engage');
    e.hurt(1); if (x.engagedAt == null) bad('hit did not engage'); const t0 = x.engagedAt; e.hurt(1); if (x.engagedAt !== t0) bad('engagement moved');
    const f = s => { G.Elites.update(0.1, t0 + s); return e.atkFactor / (e.atkFactor0 * 1.5); };
    const r = [f(30), f(60), f(75), f(90), f(200)];
    if (!near(r[0], 1) || !near(r[1], 1) || !near(r[2], 1.5) || !near(r[3], 2) || !near(r[4], 2)) bad('enrage ramp ' + r.join(','));
    if (G.Elites.enrageIn(e) !== 0) bad('enrageIn after');
    console.log('4 elite: size ' + e.scale + ', HP ' + e.maxHp + ', enrage x' + r.map(v => v.toFixed(2)).join(' / ') + ' at +30/60/75/90/200 s');
    // wild window
    const m = [G.Elites.capMul()]; for (const s of [0, 30, 59.9, 60, 75, 89.9, 90, 200]) { G.Elites.update(0.1, 120 + s); m.push(+G.Elites.capMul().toFixed(3)); m[m.length - 1] = m[m.length - 1]; }
    const want = [0.5, 0.5, 0.5, 0.5, 0.75, 0.9993, 1, 1]; want.forEach((w, i) => { if (!near(m[i + 1], w, 0.01)) bad('wild mul step ' + i + ': ' + m[i + 1] + ' vs ' + w); });
    console.log('4 wild cap/rate multiplier at +0/30/59.9/60/75/89.9/90/200 s: ' + m.slice(1).join(' '));
    // no second spawn while alive, then cadence
    G.Elites.update(0.1, 500); if (placed.length !== 1) bad('second spawn while alive');
    e.dead = true; EL.splice(EL.indexOf(e), 1); G.Elites.update(0.1, 470); if (placed.length !== 1) bad('spawned before +6:00 (480)');
    G.Elites.update(0.1, 480); if (placed.length !== 2) bad('no second elite at 8:00'); else if (placed[1].dex === e.dex) bad('repeat species');
  } }

// 5. trim: excess wild units flagged, off screen first
{ G.Elites.reset(); EL.length = 0; placed.length = 0;
  const mk = (x, seen) => { const e = new G.Enemy({ dex: 1, baseHp: 45, spd: 50, dmg: 5, xp: 1, behavior: 'chase', bx: 64 }, x, 0, { t: 0, dmg: 1, hp: 1, spd: 1 }, false); e.seen = seen; return e; };
  for (let i = 0; i < 60; i++) EL.push(mk(i * 10, i % 2 === 0));
  G.Camera.sees = (x) => EL.find(e => e.x === x).seen;
  G.Elites.update(0.1, 120); const lv = EL.filter(e => e.leaving);
  const el = EL.length; if (placed.length !== 1) bad('no elite for trim');
  const want = EL.length - 32;
  if (lv.length !== want) bad('leaving ' + lv.length + ' vs ' + want);
  if (lv.some(e => e.seen) && EL.filter(e => !e.seen && !e.leaving && !e.elite).length) bad('a seen unit left while an unseen stayed');
  console.log('5 trim: ' + EL.length + ' alive, ' + lv.length + ' set to walk off (' + lv.filter(e => !e.seen).length + ' of them off screen)'); }

// 6. real Enemy.update paths: a leaving unit walks away and never touches; an elite runs its class AI without throwing
{ G.Camera.sees = () => true; const pl = { level: 5, x: 0, y: 0, hp: 100, r: 10 }; const errs = [];
  const run = (e, secs) => { for (let i = 0; i < secs * 20; i++) { try { e.update(0.05, pl); } catch (x) { errs.push(e.name + ': ' + x.message); break; } } };
  const w = new G.Enemy({ dex: 1, baseHp: 45, spd: 60, dmg: 5, xp: 1, behavior: 'chase', bx: 64 }, 100, 0, { t: 0, dmg: 1, hp: 1, spd: 1 }, false);
  w.leaving = true; run(w, 3); if (!(w.x > 200)) bad('leaving unit did not walk away: x ' + w.x); if (w.touchCd <= 0) bad('leaving unit can touch');
  for (const beh of ['chase', 'ranged', 'charger', 'zoner', 'fan', 'beamer']) {
    const d = Object.assign({ dex: 130, baseHp: 95, spd: 60, dmg: 8, xp: 1, behavior: beh, bx: 200, shotDmg: 8, shotCd: 2, range: 190, fanN: 3, zones: 2 }, { elite: { hp: 500, hpMul: 5, pow: 1.5, xpMul: 6, engagedAt: null, enrage: 1 } });
    const e = new G.Enemy(d, 300, 0, { t: 60, dmg: 1, hp: 1, spd: 1 }, false); run(e, 4); if (e.dead) bad(beh + ' elite died'); }
  console.log('6 update paths: leaving walks off (x ' + Math.round(w.x) + '), elite ran as chase/ranged/charger/zoner/fan/beamer' + (errs.length ? ', errors: ' + errs.join(' | ') : ', no errors')); if (errs.length) bad('update errors'); }

console.log(fail ? fail + ' FAILED' : 'ALL OK');
process.exit(fail ? 1 : 0);
