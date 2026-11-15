// #123 speed band and dodge recharge, offline checks (Node only). Usage from the repo root:
//   node docs/proposals/speed-band-harness.js .
// Plan: docs/ASCII Concept Maps/123 - Speed Band And Dodge Recharge Plan.md. Ruling: decision
// 2026-11-15-123-speed-band-and-dodge-recharge. Rules: docs/COMBAT-RULES.md "SPEED".
// Relations only (decision 2026-11-14-tests-check-relations-not-values): every bound is read from G.Stats, no px/s or
// second count is written here. Loads the REAL js/data/pokedex.js, js/core/stats.js and js/entities/player.js with stubs
// (pattern: pokebox-stats-harness.js). The leader's read of its own recharge is checked in leader-ai-harness.js (16j).
const fs = require('fs'),
  vm = require('vm');
const R = process.argv[2] || '.';
const load = (p) => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined, construct: () => ({}) });
global.window = global;
global.location = { search: '?dev' };
const base = {
  U: { clamp: (v, a, b) => Math.max(a, Math.min(b, v)), rand: (a, b) => (a + b) / 2, randInt: (a) => a, pick: (a) => a[0], TYPE_COLOR: {}, TYPE_NAME: {} },
  FX: { dmgText() {}, spark() {}, ring() {}, burst() {}, sp() {}, px() {}, twinkle() {} },
  Sprites: { Animator: class { update() {} loop() {} play() {} busy() { return false; } }, bodyRadius: () => 10, bodyHeight: () => 20, hasShiny: () => false, hovers: () => false, dirFromAngle: () => 0 },
  Weather: { mult: () => 1, speedFor: () => 1, force() {} },
  Game: new Proxy({ everyone: () => [] }, { get: (t, k) => (k in t ? t[k] : noop) }),
  Audio: { sfx() {} }, Camera: { kick() {} }, Log: { on: false },
  World: { collide: () => false, isLiquid: () => false, isFree: () => true, projectileBlock: () => null, propsInCircle: () => [] },
};
global.G = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
for (const p of ['js/data/pokedex.js', 'js/core/stats.js', 'js/data/types.js', 'js/systems/status.js', 'js/systems/stages.js', 'js/entities/player.js']) {
  try { load(p); } catch (e) { console.log('load failed', p, e.message); process.exit(1); }
}
const S = G.Stats;
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('FAIL', m); } };
const near = (a, b, e = 1e-9) => typeof a === 'number' && Math.abs(a - b) <= e * Math.max(1, Math.abs(b));
const hasRate = typeof S.dodgeRechargeRate === 'function';
const rate = (...args) => (hasRate ? S.dodgeRechargeRate(...args) : NaN);
const speeds = [...new Set(G.DEX.filter((d) => d.stats && d.stats[5] != null).map((d) => d.stats[5]))].sort((a, b) => a - b);
ok(speeds.length > 100, 'the roster loads: ' + speeds.length + ' distinct base Speeds');

// 1. Band: over every roster species, fastest movement / slowest is at most the band's max / min.
{
  const px = speeds.map((b) => S.speedToPx(b)),
    spread = Math.max(...px) / Math.min(...px),
    allowed = S.MOVE_MAX / S.MOVE_MIN;
  ok(S.MOVE_MIN >= 0.95 - 1e-12 && S.MOVE_MAX <= 1.05 + 1e-12, '1: the movement band is 0.95 to 1.05 (#123): ' + S.MOVE_MIN + ' to ' + S.MOVE_MAX);
  ok(spread <= allowed + 1e-12, '1: roster movement spread ' + spread.toFixed(4) + ' within the band ' + allowed.toFixed(4));
}

// 2. Order: sorted by base Speed, movement never falls and dodge recharge rate never falls.
{
  const px = speeds.map((b) => S.speedToPx(b)),
    rates = speeds.map((b) => rate(b));
  ok(px.every((v, i) => i === 0 || v >= px[i - 1]), '2: a higher base Speed never moves slower');
  ok(hasRate && rates.every((v, i) => i === 0 || v >= rates[i - 1]), '2: a higher base Speed never recharges slower');
}

// 3. Median: the median species recharges at rate 1 (its charge takes exactly the dodge cooldown); bounds read from G.Stats.
ok(hasRate && near(rate(S.SPEED_MEDIAN), 1), '3: the median species recharges at rate 1: ' + rate(S.SPEED_MEDIAN));
ok(hasRate && speeds.every((b) => rate(b) > S.DODGE_RATE_MIN - 1e-12 && rate(b) < S.DODGE_RATE_MAX + 1e-12),
  '3: every species recharges inside the dodge rate bounds ' + S.DODGE_RATE_MIN + ' to ' + S.DODGE_RATE_MAX);

// 4. Strict: a higher Speed stat value recharges strictly faster (IVs, nature and EVs count, like movement).
{
  const stat = (b) => S.statValue(b, 50),
    distinct = speeds.filter((b, i) => i === 0 || stat(b) !== stat(speeds[i - 1]));
  ok(hasRate && distinct.every((b, i) => i === 0 || rate(b) > rate(distinct[i - 1])), '4: a higher Speed stat always recharges strictly faster');
  ok(hasRate && rate(65, 31) > rate(65, 0) && rate(65, 0, 1.1) > rate(65, 0, 1) && rate(65, 0, 1, 252) > rate(65, 0, 1, 0) && rate(65, 0, 0.9) < rate(65),
    '4: a higher IV, a raised nature and Speed EVs recharge faster, a lowered nature slower');
}

// 5. Wiring: on the field, a fast mon's spent charge returns before a slow one's; Bright Powder shortens it by its own share.
{
  const P = G.PlayerEntity,
    D = P.DODGE,
    mk = (dex) => new G.Player(G.DEX_BY[dex], {}, false),
    secondsBack = (pl) => {
      pl.dodges.cd = [D.cd, 0];
      let t = 0;
      const step = 0.001;
      while (pl.dodges.cd[0] > 0 && t < 60) { pl.tickDodges(step); t += step; }
      return t;
    },
    fast = mk(656), // Froakie
    slow = mk(387), // Turtwig
    slowPowder = mk(387);
  slowPowder.hasItem = (id) => id === 'brightpowder';
  const fastT = secondsBack(fast), slowT = secondsBack(slow), powderT = secondsBack(slowPowder);
  ok(G.DEX_BY[656].stats[5] > G.DEX_BY[387].stats[5] && fastT < slowT, '5: a faster mon\'s charge comes back first: ' + fastT.toFixed(3) + ' s against ' + slowT.toFixed(3) + ' s');
  ok(hasRate && near(slowT, D.cd / rate(G.DEX_BY[387].stats[5]), 2e-3) && near(fastT, D.cd / rate(G.DEX_BY[656].stats[5]), 2e-3),
    '5: the tick runs at the species\' recharge rate');
  ok(near(powderT, slowT * 0.85, 2e-3), '5: Bright Powder shortens it by its share on top: ' + powderT.toFixed(3) + ' against ' + slowT.toFixed(3));
  ok(typeof fast.dodgeRechargeRate === 'function' && near(fast.dodgeRechargeRate(), rate(G.DEX_BY[656].stats[5])) &&
    near(slowPowder.dodgeRechargeRate(), rate(G.DEX_BY[387].stats[5]) / 0.85),
    '5: the Player reports the rate on the field (species rate x Bright Powder)');
  const waiting = mk(656);
  waiting.dodges.cd = [D.cd, 0];
  waiting.dodgeT = 0.3;
  waiting.tickDodges(1);
  ok(waiting.dodges.cd[0] === D.cd, '5: charges still wait while a dodge runs');
}

// 6. Enemies: a wild enemy's walking speed comes from the same movement function.
{
  const text = fs.readFileSync(R + '/js/data/enemies.js', 'utf8');
  ok(/spd:\s*G\.Stats\.speedToPx\(/.test(text), '6: wild enemy speed reads G.Stats.speedToPx');
}

console.log(fail ? 'speed-band-harness: ' + fail + ' of ' + n + ' FAILED' : 'speed-band-harness: all ' + n + ' passed');
process.exit(fail ? 1 : 0);
