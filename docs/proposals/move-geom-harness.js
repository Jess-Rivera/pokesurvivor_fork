// Move geometry offline checks (Node only). Usage from the repo root:  node docs/proposals/move-geom-harness.js .
// Loads js/systems/move-geom.js into a bare G (no engine stubs needed, it is pure math). Covers: segDist2 truth cases and parity with the
// legacy copy in combat.js on seeded random cases, shapeOf (families, grow per time and per distance, caps, lens, 2 pi clamp, purity),
// contains for each family (point sweep vs tunneling, arc edges with the enemy radius and the apex rule, full circle, linear ends and
// sides, heading wrap), a growing ring first reaching an enemy on the right step, and boundsOf never under-covering contains.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
global.G = {};
vm.runInThisContext(fs.readFileSync(R + '/js/systems/move-geom.js', 'utf8'), { filename: 'js/systems/move-geom.js' });
const M = G.MoveGeom;
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; if (fail < 30) console.log('FAIL', m); } };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
let seed = 12345; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rr = (a, b) => a + (b - a) * rnd();
const deg = d => d * Math.PI / 180;

// 1. segDist2: truth cases, then parity with the legacy function read from combat.js
ok(M.segDist2(0, 0, 10, 0, 0, 5) === 25, 'segDist2 beside the segment');
ok(M.segDist2(0, 0, 10, 0, 13, 4) === 25, 'segDist2 past the end');
ok(M.segDist2(0, 0, 10, 0, -3, 4) === 25, 'segDist2 before the start');
ok(M.segDist2(1, 1, 1, 1, 4, 5) === 25, 'segDist2 zero-length segment');
{ const src = fs.readFileSync(R + '/js/systems/combat.js', 'utf8').match(/function segDist2\([^)]*\) \{[\s\S]*?\n  \}/);
  ok(!!src, 'legacy segDist2 not found in combat.js');
  if (src) { const legacy = vm.runInNewContext('(' + src[0] + ')');
    for (let i = 0; i < 3000; i++) { const a = [rr(-500, 500), rr(-500, 500), rr(-500, 500), rr(-500, 500), rr(-500, 500), rr(-500, 500)];
      if (i % 10 === 0) { a[2] = a[0]; a[3] = a[1]; }
      ok(M.segDist2(...a) === legacy(...a), 'segDist2 parity ' + a); } } }

// 2. shapeOf
{ const pt = M.shapeOf({ shape: 'radial', radRadius: 6, count: 1 }, null, { x: 1, y: 2, heading: 0.5 });
  ok(pt.family === 'point' && pt.r === 6 && pt.x === 1 && pt.y === 2 && pt.heading === 0.5, 'point shape');
  const arc = M.shapeOf({ shape: 'radial', radArc: 1.7, radRadius: 48 }, null, { x: 0, y: 0, heading: 0 });
  ok(arc.family === 'arc' && arc.arc === 1.7 && arc.r === 48, 'arc shape');
  const lens = M.shapeOf({ shape: 'radial', radArc: 1.7, radRadius: 48 }, null, { x: 0, y: 0, heading: 0, lens: 2 });
  ok(near(lens.r, 96) && near(lens.arc, 3.4) && lens.family === 'arc', 'lens scales radius and arc');
  const lensFull = M.shapeOf({ shape: 'radial', radArc: 4, radRadius: 10 }, null, { x: 0, y: 0, heading: 0, lens: 2 });
  ok(lensFull.family === 'circle' && lensFull.arc === Math.PI * 2, 'lens clamps radArc to 2 pi and makes a circle');
  const full = M.shapeOf({ shape: 'radial', radArc: 6.2832, radRadius: 1 }, null, { x: 0, y: 0, heading: 0 });
  ok(full.family === 'circle', 'radArc 6.2832 is a full circle');
  const nova = { shape: 'radial', radArc: 6.2832, radRadius: 1 }, g = { growSpeed: 100, max: 150 };
  const at = (age, extra) => M.shapeOf(nova, g, Object.assign({ x: 0, y: 0, heading: 0, age }, extra)).r;
  ok(at(0) === 1 && near(at(0.5), 51) && at(2) === 150 && at(-1) === 1, 'grow per time: start, mid, cap, negative age (delay)');
  ok(near(at(0.5, { lens: 2 }), 102), 'lens applies to the grown value');
  ok(near(M.shapeOf(nova, { growSpeed: 5, per: 'distance', max: 500 }, { x: 0, y: 0, heading: 0, age: 9, dist: 10 }).r, 51), 'grow per distance ignores age');
  ok(M.shapeOf({ shape: 'radial', radArc: 1, radRadius: 20 }, { growSpeed: 1, dim: 'radArc', max: 10 }, { x: 0, y: 0, heading: 0, age: 6 }).family === 'circle', 'grown radArc reaching 2 pi becomes a circle');
  const lin = { shape: 'linear', linLength: 100, linWidth: 20 };
  ok(M.shapeOf(lin, { growSpeed: 50, dim: 'linLength', max: 400 }, { x: 0, y: 0, heading: 0, age: 1 }).len === 150, 'grow linLength');
  { const s = M.shapeOf(lin, null, { x: 0, y: 0, heading: 0, lens: 3 }); ok(s.len === 300 && s.w === 20, 'lens scales linLength, never linWidth'); }
  ok(M.shapeOf(lin, { growSpeed: 50, dim: 'linLength', max: 400 }, { x: 0, y: 0, heading: 0, age: 100, lens: 0.5 }).len === 200, 'lens applies to grown linLength after the cap');
  const frozen = JSON.stringify([nova, g]); M.shapeOf(nova, g, { x: 0, y: 0, heading: 0, age: 1 }); ok(JSON.stringify([nova, g]) === frozen, 'shapeOf does not mutate its inputs'); }

// 3. contains
const S = (space, grow, heading = 0, extra) => M.shapeOf(space, grow, Object.assign({ x: 0, y: 0, heading, age: 0 }, extra));
{ // point: r 10 moved from (0,0) to (100,0), enemy r 5
  const p = S({ shape: 'radial', radRadius: 10 }, null, 0, { x: 100 });
  ok(M.contains(p, 0, 0, 50, 14, 5) && M.contains(p, 0, 0, 50, 15, 5), 'point sweep: inside and exactly on the edge');
  ok(!M.contains(p, 0, 0, 50, 16, 5), 'point sweep: just outside');
  ok(M.contains(p, 0, 0, 50, 0, 5) && !M.contains(p, 100, 0, 50, 0, 5), 'point tunneling: caught by the sweep, missed by a current-position test');
  ok(M.contains(S({ shape: 'radial', radRadius: 10 }, null, 0), 0, 0, 12, 0, 5), 'point on spawn step (prev equals current)'); }
{ // full circle
  const c = S({ shape: 'radial', radArc: 6.2832, radRadius: 20 });
  ok(M.contains(c, 0, 0, 25, 0, 5) && !M.contains(c, 0, 0, 25.01, 0, 5) && M.contains(c, 0, 0, 0, 0, 5), 'full circle edge and centre');
  ok(M.contains(c, 0, 0, -25, 0, 5) && M.contains(c, 0, 0, 0, 25, 5), 'full circle all directions'); }
{ // arc: heading 0, 90 degrees wide (half 45), radius 50
  const a = S({ shape: 'radial', radArc: Math.PI / 2, radRadius: 50 });
  const at = (d, ang, er) => M.contains(a, 0, 0, d * Math.cos(deg(ang)), d * Math.sin(deg(ang)), er);
  ok(at(30, 0, 0) && at(30, 44, 0) && !at(30, 46, 0) && at(30, -44, 0) && !at(30, -46, 0), 'arc edges, enemy radius 0');
  ok(at(30, 50, 10) && !at(30, 70, 10), 'arc edge widened by asin(r / d) (19.47 degrees at d 30, r 10)');
  ok(at(55, 0, 5) && !at(55.1, 0, 5), 'arc range includes the enemy radius');
  ok(!at(30, 180, 5), 'arc behind the caster is outside');
  const narrow = S({ shape: 'radial', radArc: 0.2, radRadius: 50 });
  ok(M.contains(narrow, 0, 0, -3, 0, 5) && M.contains(narrow, 0, 0, 0, 0, 5), 'apex rule: an enemy covering the origin is inside at any angle');
  const hw = (h, ang) => M.contains(S({ shape: 'radial', radArc: 1, radRadius: 50 }, null, h), 0, 0, 30 * Math.cos(ang), 30 * Math.sin(ang), 0);
  ok(hw(3.0, -3.0) && hw(-3.0, 3.0) && !hw(3.0, 0), 'arc wraps across pi');
  ok(hw(7.0, 7.0 - 2 * Math.PI) && hw(-7.0, -7.0 + 2 * Math.PI) && hw(7.0, 7.0), 'arc with headings beyond one turn'); }
{ // linear: length 100, width 20, enemy r 5
  const L = h => S({ shape: 'linear', linLength: 100, linWidth: 20 }, null, h);
  const t = (h, x, y) => M.contains(L(h), 0, 0, x, y, 5);
  ok(t(0, 50, 14) && t(0, 50, -14) && !t(0, 50, 15.1) && !t(0, 50, -15.1), 'linear sides');
  ok(t(0, -5, 0) && !t(0, -5.1, 0) && t(0, 105, 0) && !t(0, 105.1, 0), 'linear ends');
  ok(t(Math.PI / 2, 0, 50) && t(Math.PI / 2, 14, 50) && !t(Math.PI / 2, 16, 50) && t(Math.PI / 2, 0, -4.9) && !t(Math.PI / 2, 0, -5.2), 'linear rotated a quarter turn');
  ok(t(Math.PI, -50, 0) && !t(Math.PI, 50, 0), 'linear pointing back'); }

// 4. a growing ring reaches an enemy on the step where the D21 radius first covers it
{ const nova = { shape: 'radial', radArc: 6.2832, radRadius: 1 }, g = { growSpeed: 100, max: 150 };
  const first = ex => { for (let k = 0; k <= 100; k++) if (M.contains(M.shapeOf(nova, g, { x: 0, y: 0, heading: 0, age: k * 0.05 }), 0, 0, ex, 0, 5)) return k; return -1; };
  ok(first(60) === 11, 'ring first reaches an enemy at 60 on step 11 (radius 56 covers 55), got ' + first(60));
  ok(first(0) === 0, 'an enemy inside at spawn is hit on step 0');
  ok(first(155) === 30, 'ring reaches the capped edge exactly when the cap is hit (step 30), got ' + first(155));
  ok(first(156) === -1, 'ring never reaches past its cap plus the enemy radius'); }

// 5. boundsOf never under-covers: every enemy contains() accepts must be found by a query of (bounds radius + enemy radius)
{ const MAXR = 30; let hits = 0;
  for (let i = 0; i < 6000; i++) {
    const fam = i % 4, ang = rr(-9, 9), x = rr(-200, 200), y = rr(-200, 200), px = i % 2 ? x : x + rr(-150, 150), py = i % 2 ? y : y + rr(-150, 150);
    const space = fam === 0 ? { shape: 'radial', radRadius: rr(2, 60) } : fam === 1 ? { shape: 'radial', radArc: rr(0.2, 6), radRadius: rr(10, 150) }
      : fam === 2 ? { shape: 'radial', radArc: 6.2832, radRadius: rr(10, 150) } : { shape: 'linear', linLength: rr(20, 300), linWidth: rr(4, 80) };
    const s = M.shapeOf(space, null, { x, y, heading: ang, age: 0, lens: rr(0.8, 2) });
    const b = M.boundsOf(s, px, py, MAXR), pxx = fam === 0 ? px : x, pyy = fam === 0 ? py : y;
    ok([b.x, b.y, b.r].every(Number.isFinite), 'bounds finite');
    for (let j = 0; j < 12; j++) { const er = rr(1, MAXR), ex = b.x + rr(-1, 1) * (b.r + 80), ey = b.y + rr(-1, 1) * (b.r + 80);
      if (M.contains(s, pxx, pyy, ex, ey, er)) { hits++; ok(Math.hypot(ex - b.x, ey - b.y) <= b.r + er + 1e-9, 'bounds under-cover family ' + s.family); } } }
  ok(hits > 2000, 'bounds test hit count too low: ' + hits);
  // the linear corner is the case that needs maxEnemyR: an enemy at the square corner of the widened band
  const s = S({ shape: 'linear', linLength: 100, linWidth: 20 }), er = 30, ex = 100 + er, ey = 10 + er, b = M.boundsOf(s, 0, 0, er);
  ok(M.contains(s, 0, 0, ex, ey, er) && Math.hypot(ex - b.x, ey - b.y) <= b.r + er, 'linear corner enemy is covered when maxEnemyR is given'); }

console.log('move-geom harness: ' + (n - fail) + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
