// Drop tables (feature/item-rework-v2) offline checks (Node only). Usage from the repo root:  node docs/proposals/drops-harness.js .
// Real data/drops.js with stubbed engine globals. The expected rates below are hand-derived from the code that data/drops.js replaced
// (pickup.js dropXp, enemy.js die(), events.js rescued, elites.js itemChance, items.js RUN_CHANCE), not read back from drops.js.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
const load = p => vm.runInThisContext(fs.readFileSync(R + '/' + p, 'utf8'), { filename: p });
global.window = global;
let s = 12345; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
global.G = { U: { pick: a => a[0] }, Pickups: { drop() {} }, Game: { player: { runItems: [] } },
  Grounds: { roll: r => 'pool', dropBonus: pl => (pl && pl.bonus) || 0 },
  Items: { roll: () => 'poke', rollRun: owned => (owned.includes('run') ? null : 'run') } };
load('js/data/drops.js');
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const N = 300000;
// ground pickups are counted by value: ground:oran / ground:sitrus are the direct berries, ground:pool is a roll of the ground item pool
const key = d => (d.pickup === 'ground' ? 'ground:' + d.value : d.pickup);
const sample = (src, opts = {}) => { const c = {}; for (let i = 0; i < N; i++) for (const d of G.Drops.roll(src, 0, 0, { rnd, place() {}, ...opts })) c[key(d)] = (c[key(d)] || 0) + 1; return c; };
const rate = (c, k) => (c[k] || 0) / N;
const near = (got, want, tol) => Math.abs(got - want) <= tol;
const chk = (name, got, want, tol) => { if (!near(got, want, tol)) bad(name + ' ' + got.toFixed(5) + ' want ' + want); };

// wild: ticket 1/400, then ONE shared roll: Oran 0.55%, Sitrus 0.40%, magnet 0.8%, bomb 0.6%; ground pool 1% + Pinap bonus.
// The berries replace the old 1.2% heal pickup (30% heal): 0.55% x 30% + 0.40% x 50% = 0.365% of max HP per kill, the old 0.36%.
{ const c = sample('wild');
  chk('wild ticket', rate(c, 'ticket'), 1 / 400, 0.0006);
  chk('wild oran', rate(c, 'ground:oran'), 0.0055, 0.001);
  chk('wild sitrus', rate(c, 'ground:sitrus'), 0.004, 0.0009);
  chk('wild magnet', rate(c, 'magnet'), 0.008, 0.0012);
  chk('wild bomb', rate(c, 'bomb'), 0.006, 0.001);
  chk('wild ground pool', rate(c, 'ground:pool'), 0.01, 0.0015);
  if (c.heal) bad('the old heal pickup no longer drops from wild kills');
  chk('wild healing per kill (fraction of max HP)', rate(c, 'ground:oran') * 0.3 + rate(c, 'ground:sitrus') * 0.5, 0.0036, 0.0006);
  const b = sample('wild', { lead: { bonus: 0.1 } });
  chk('wild ground pool with golden pinap', rate(b, 'ground:pool'), 0.11, 0.003);
  // berry, magnet and bomb never drop together (one shared roll)
  let both = 0; for (let i = 0; i < N; i++) { const k = G.Drops.roll('wild', 0, 0, { rnd, place() {} }).map(key).filter(k => k === 'ground:oran' || k === 'ground:sitrus' || k === 'magnet' || k === 'bomb'); if (k.length > 1) both++; }
  if (both) bad('berry/magnet/bomb dropped together ' + both);
  console.log('wild: ticket 1/400, Oran 0.55%, Sitrus 0.40%, magnet 0.8%, bomb 0.6%, ground pool 1% + Pinap, exclusive extras, heal same as before'); }

// guaranteed and fixed-count sources
const once = (src, want) => { const out = G.Drops.roll(src, 0, 0, { rnd, place() {} }); const c = {}; out.forEach(d => (c[d.pickup] = (c[d.pickup] || 0) + 1));
  for (const k in want) if ((c[k] || 0) !== want[k]) bad(src + ' ' + k + ' ' + (c[k] || 0) + ' want ' + want[k]); return out; };
once('boss', { coin: 10, item: 1 });
once('gym', { item: 1 });
once('thief', { coin: 20 });
once('thiefTicket', { coin: 6, ticket10: 1 });
once('rescue', { coin: 12, ticket: 1 });
{ const c = sample('elite'); chk('elite berry always', rate(c, 'ground:oran') + rate(c, 'ground:sitrus'), 1, 1e-9); chk('elite berry is 50/50 Oran', rate(c, 'ground:oran'), 0.5, 0.006); chk('elite ground pool roll always', rate(c, 'ground:pool'), 1, 1e-9); chk('elite item 50%', rate(c, 'item'), 0.5, 0.006); }
{ const c = sample('golden'); chk('golden coin 35%', rate(c, 'coin'), 0.35, 0.006); }
console.log('boss 10 coins + item, gym item, thief 20 coins, thief ticket 6 + x10, rescue 12 + ticket, elite berry + ground + 50% item, golden 35%');

// run item share: boss 5%, gym 10%, elites never; a held run item is not rolled again
{ for (const [src, want] of [['boss', 0.05], ['gym', 0.1], ['elite', 0]]) { let run = 0, items = 0;
    for (let i = 0; i < N; i++) for (const d of G.Drops.roll(src, 0, 0, { rnd, place() {} })) if (d.pickup === 'item') { items++; if (d.value === 'run') run++; }
    chk(src + ' run share', run / items, want, 0.004); }
  G.Game.player.runItems = ['run'];
  for (let i = 0; i < 2000; i++) for (const d of G.Drops.roll('boss', 0, 0, { rnd, place() {} })) if (d.value === 'run') { bad('held run item rolled again'); i = 1e9; break; }
  G.Game.player.runItems = [];
  console.log('run item share: boss 5%, gym 10%, elite 0, never a held one'); }

// positions: fixed offsets and spreads (boss item at -26,-10; elite berry at +24,0; coins within +/-40 x +/-30)
{ const it = G.Drops.roll('boss', 100, 200, { rnd, place() {} }).find(d => d.pickup === 'item'); if (it.x !== 74 || it.y !== 190) bad('boss item position');
  const el = G.Drops.roll('elite', 100, 200, { rnd, place() {} }).find(d => d.pickup === 'ground' && d.value !== 'pool'); if (el.x !== 124 || el.y !== 200) bad('elite berry position');
  for (const d of G.Drops.roll('boss', 100, 200, { rnd, place() {} })) if (d.pickup === 'coin' && (Math.abs(d.x - 100) > 40 || Math.abs(d.y - 200) > 30)) bad('coin spread');
  if (G.Drops.roll('nope', 0, 0).length) bad('unknown source drops nothing'); }
// place() receives the same results roll() returns
{ const seen = []; const out = G.Drops.roll('rescue', 5, 5, { rnd, place: (k, x, y, v) => seen.push(k) }); if (seen.length !== out.length) bad('place called once per drop'); }

console.log(fail ? fail + ' FAILED' : 'drops harness: all passed');
process.exit(fail ? 1 : 0);
