// Drop tables (feature/item-rework-v2) offline checks (Node only). Usage from the repo root:  node docs/proposals/drops-harness.js .
// Real data/drops.js with stubbed engine globals. The expected rates below are hand-derived from the code that data/drops.js replaced
// (pickup.js dropXp, enemy.js die(), events.js rescued, elites.js itemChance, items.js RUN_CHANCE, world.js prop loot), not read back from drops.js.
const fs = require('fs'), vm = require('vm');
const R = process.argv[2] || '.';
// candy-mutate.js points CANDY_DROPS at an altered drops.js (#139 8a)
const load = p => vm.runInThisContext(fs.readFileSync((p === 'js/data/drops.js' && process.env.CANDY_DROPS) || R + '/' + p, 'utf8'), { filename: p });
global.window = global;
let s = 12345; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
global.G = { U: { pick: a => a[0] }, Pickups: { drop() {} }, Game: { player: { runItems: [] }, everyone: () => [{ xpNext: 1000 }], levelXp: () => 777 },
  Grounds: { roll: r => 'pool', dropBonus: pl => (pl && pl.bonus) || 0 },
  Items: { roll: () => 'poke', rollRun: owned => (owned.includes('run') ? null : 'run') } };
load('js/data/drops.js');
let fail = 0; const bad = m => { fail++; if (fail < 30) console.log('FAIL', m); };
const N = 300000;
// ground pickups are counted by value: ground:oran / ground:sitrus are the direct berries, ground:pool is a roll of the ground item pool
const key = d => (d.pickup === 'ground' || d.pickup === 'candy' ? d.pickup + ':' + d.value : d.pickup);
const sample = (src, opts = {}) => { const c = {}; for (let i = 0; i < N; i++) for (const d of G.Drops.roll(src, 0, 0, { rnd, place() {}, ...opts })) c[key(d)] = (c[key(d)] || 0) + 1; return c; };
const rate = (c, k) => (c[k] || 0) / N;
const near = (got, want, tol) => Math.abs(got - want) <= tol;
const chk = (name, got, want, tol) => { if (!near(got, want, tol)) bad(name + ' ' + got.toFixed(5) + ' want ' + want); };

// wild (playtest cut, Jess 2026-11-04; tickets gone, #133): then ONE shared roll: Oran 0.2%, Sitrus 0.1%, magnet 0.4%, bomb 0.1%; ground pool 0.4% + Pinap bonus.
// Direct berries: 0.2% x 30% + 0.1% x 50% = 0.11% of max HP per kill (0.365% before the cut).
{ const c = sample('wild');
  if (c.ticket) bad('a wild kill drops no ticket');
  chk('wild oran', rate(c, 'ground:oran'), 0.002, 0.0006);
  chk('wild sitrus', rate(c, 'ground:sitrus'), 0.001, 0.0005);
  chk('wild magnet', rate(c, 'magnet'), 0.004, 0.0008);
  chk('wild bomb', rate(c, 'bomb'), 0.001, 0.0005);
  chk('wild ground pool', rate(c, 'ground:pool'), 0.004, 0.001);
  if (c.heal) bad('the old heal pickup no longer drops from wild kills');
  chk('wild healing per kill (fraction of max HP)', rate(c, 'ground:oran') * 0.3 + rate(c, 'ground:sitrus') * 0.5, 0.0011, 0.0004);
  const b = sample('wild', { lead: { bonus: 0.02 } });
  chk('wild ground pool with golden pinap', rate(b, 'ground:pool'), 0.024, 0.002);
  // berry, magnet and bomb never drop together (one shared roll)
  let both = 0; for (let i = 0; i < N; i++) { const k = G.Drops.roll('wild', 0, 0, { rnd, place() {} }).map(key).filter(k => k === 'ground:oran' || k === 'ground:sitrus' || k === 'magnet' || k === 'bomb'); if (k.length > 1) both++; }
  if (both) bad('berry/magnet/bomb dropped together ' + both);
  console.log('wild: no ticket, Oran 0.2%, Sitrus 0.1%, magnet 0.4%, bomb 0.1%, ground pool 0.4% + Pinap, exclusive extras'); }

// guaranteed and fixed-count sources
const once = (src, want) => { const out = G.Drops.roll(src, 0, 0, { rnd, place() {} }); const c = {}; out.forEach(d => (c[d.pickup] = (c[d.pickup] || 0) + 1));
  for (const k in want) if ((c[k] || 0) !== want[k]) bad(src + ' ' + k + ' ' + (c[k] || 0) + ' want ' + want[k]); return out; };
once('boss', { coin: 10, item: 1 });
once('gym', { coin: 10, item: 1 }); // exactly one item (Jess 2026-11-03)
once('thief', { coin: 20 });
// #133 (decision 2026-11-15-133-tickets-pay-coins): where a ticket dropped, one coin pickup worth the ticket's exchange rate drops.
const coinsWorth = (out, v) => out.filter(d => d.pickup === 'coin' && d.value === v).length;
{ const o = once('thiefJackpot', { coin: 7 }); if (coinsWorth(o, G.Drops.ticketCoins(0, 1)) !== 1) bad('the Gholdengo drop holds one coin worth an x10 ticket'); }
{ const o = once('rescue', { coin: 13 }); if (coinsWorth(o, G.Drops.ticketCoins(1)) !== 1) bad('the rescue drop holds one coin worth an x1 ticket'); }
// no table can drop a ticket, and the x10 rate is ten pulls of the x1 rate (an x10 ticket was ten pulls)
for (const src in G.Drops.TABLES) { const walk = es => es.forEach(e => { if (e.oneOf) walk(e.oneOf); else if (/ticket/.test(e.pickup)) bad(src + ' still drops ' + e.pickup); }); walk(G.Drops.TABLES[src]); }
if (G.Drops.ticketCoins(0, 1) !== 10 * G.Drops.ticketCoins(1)) bad('an x10 ticket is worth ten x1 tickets');
// #139 8a, the drop function (decision 2026-11-22-139-candy-target-and-drop-model). Expected values are hand-derived from the
// decision: tiers rolled rarest first with Uncommon 1%, Rare 0.4%, Epic 0.1%, Jackpot 0.02%, stop at the first hit, Common
// otherwise; an unnamed tier is skipped (its chance falls to Common); every tiered entry names Common; loop N rolls N times.
{ const CHANCE = { uncommon: 0.01, rare: 0.004, epic: 0.001, jackpot: 0.0002 }, RAREST_FIRST = ['jackpot', 'epic', 'rare', 'uncommon'];
  // the share of rolls landing on each tier of a table naming `named`, by hand: a named tier hits only if every rarer named one missed
  const shares = (named) => { let missed = 1; const out = {}; for (const t of RAREST_FIRST) if (named.includes(t)) { out[t] = missed * CHANCE[t]; missed -= out[t]; } out.common = missed; return out; };
  const tiered = Object.keys(G.Drops.TABLES).filter(src => G.Drops.TABLES[src].some(e => e.tiers));
  if (G.Drops.validate().length) bad('drop tables invalid: ' + G.Drops.validate().join('; '));
  for (const src of tiered) for (const e of G.Drops.TABLES[src]) if (e.tiers && !e.tiers.common) bad(src + ' has a tiered entry without common');
  for (const want of ['elite', 'candyCommonXs', 'candyCommonS']) if (!tiered.includes(want)) bad(want + ' is not a tiered table');
  // a table without common, an unknown tier and an empty list are refused
  { const saved = G.Drops.TABLES.elite;
    G.Drops.TABLES.elite = [{ tiers: { rare: [{ give: [] }] } }]; if (!G.Drops.validate().some(m => /common/.test(m))) bad('a table without common passes validate');
    G.Drops.TABLES.elite = [{ tiers: { common: [{ give: [] }], legendary: [{ give: [] }] } }]; if (!G.Drops.validate().some(m => /unknown tier/.test(m))) bad('an unknown tier passes validate');
    G.Drops.TABLES.elite = [{ tiers: { common: [] } }]; if (!G.Drops.validate().some(m => /empty/.test(m))) bad('an empty tier list passes validate');
    G.Drops.TABLES.elite = saved; }
  // exact tier picks with a fixed roll: rarest first, and a skipped tier is never returned
  const fixed = v => () => v, all = { common: 1, uncommon: 1, rare: 1, epic: 1, jackpot: 1 };
  if (G.Drops.pickTier(all, fixed(0)) !== 'jackpot') bad('the rarest tier is rolled first');
  if (G.Drops.pickTier(all, fixed(0.005)) !== 'uncommon') bad('a 0.5% roll misses Jackpot, Epic and Rare and hits Uncommon');
  if (G.Drops.pickTier({ common: 1, rare: 1, epic: 1, jackpot: 1 }, fixed(0.005)) !== 'common') bad('an unnamed Uncommon is skipped: its chance falls to Common');
  if (G.Drops.pickTier({ common: 1, jackpot: 1 }, fixed(0.0005)) !== 'common') bad('an unnamed Epic is skipped');
  // a gap between named tiers: Epic and Rare unnamed, so a 1.05% roll misses Uncommon (1%) and lands on Common; merged into Uncommon (the rejected rule) it would hit
  if (G.Drops.pickTier({ common: 1, uncommon: 1, jackpot: 1 }, fixed(0.0105)) !== 'common') bad('an unnamed middle tier falls to Common, not to the next named tier');
  if (G.Drops.pickTier(all, fixed(0.5)) !== 'common') bad('a high roll lands on Common');
  // candy tables: one candy per roll, loop N rolls N times, Common is the base, and the candy grows toward the rarest tier
  const ORDER = ['xs', 's', 'm', 'l', 'xl'];
  for (const [src, base] of [['candyCommonXs', 'xs'], ['candyCommonS', 's']]) {
    for (let loop = 1; loop <= 6; loop++) { const out = G.Drops.roll(src, 0, 0, { rnd, place() {}, loop }); if (out.length !== loop || out.some(d => d.pickup !== 'candy')) bad(src + ' loop ' + loop + ' gave ' + out.length + ' drops'); }
    const t = G.Drops.TABLES[src][0].tiers, sizeOf = name => t[name] && t[name][0].give[0].value;
    if (sizeOf('common') !== base) bad(src + ' Common is ' + sizeOf('common'));
    let last = -1; for (const name of G.Drops.TIER_NAMES) if (t[name]) { const at = ORDER.indexOf(sizeOf(name)); if (!(at > last)) bad(src + ' ' + name + ' is not bigger than the tier below'); last = at; }
    const named = Object.keys(t), want = shares(named), c = sample(src);
    for (const name of named) chk(src + ' ' + name + ' share', rate(c, 'candy:' + sizeOf(name)), want[name], Math.max(0.0004, want[name] * 0.03));
  }
  // the elite table: Common is the weighted pick (coins 40, item 30, candy 30, coins and item 15, all three 5, of 120)
  { const rare = shares(['uncommon', 'rare', 'epic', 'jackpot']), C = rare.common, M = 200000; let coin = 0, item = 0, xs = 0, three = 0, s = 0;
    for (let i = 0; i < M; i++) { const k = G.Drops.roll('elite', 0, 0, { rnd, place() {} }).map(key);
      const hc = k.includes('coin'), hi = k.includes('item'), hx = k.includes('candy:xs'); coin += hc; item += hi; xs += hx; three += hc && hi && hx; s += k.includes('candy:s'); }
    chk('elite coins share', coin / M, (60 / 120) * C, 0.004); chk('elite item share', item / M, (50 / 120) * C, 0.004);
    chk('elite XS candy share', xs / M, (35 / 120) * C, 0.004); chk('elite bundle of all three', three / M, (5 / 120) * C, 0.002);
    chk('elite Uncommon S candy', s / M, rare.uncommon, 0.0008);
    for (let i = 0; i < 2000; i++) { const n = G.Drops.roll('elite', 0, 0, { rnd, place() {} }).filter(d => d.pickup === 'coin'); if (n.length && (n.length < 4 || n.length > 7 || n.some(d => d.value !== 3))) { bad('an elite coin drop is 4 to 7 coins worth 3'); break; } }
    const e = sample('elite'); if (e['ground:oran'] || e['ground:sitrus'] || e['ground:pool']) bad('elites no longer drop a berry or a ground item');
    for (let loop = 1; loop <= 6; loop++) { const hits = G.Drops.roll('elite', 0, 0, { rnd: fixed(0.5), place() {}, loop }).filter(d => d.pickup === 'item').length; if (hits !== loop) bad('elite loop ' + loop + ' rolls ' + hits + ' times'); } }
  // pickup 'candy' banks through G.Candy, never onto the ground
  { const seen = [], ground = []; G.Candy = { bank: v => seen.push(v) }; G.Pickups.drop = k => ground.push(k);
    G.Drops.roll('candyCommonXs', 0, 0, { rnd: fixed(0.5), loop: 2 }); if (seen.join() !== 'xs,xs' || ground.length) bad('candy is banked, not dropped: ' + seen + ' / ' + ground);
    G.Pickups.drop = () => {}; delete G.Candy; }
  console.log('drop function: rarest first, stop at the first hit, skipped tiers fall to Common, loop N rolls N times; candy and elite tables as ruled'); }
{ const c = sample('golden'); chk('golden coin 35%', rate(c, 'coin'), 0.35, 0.006); }
console.log('boss 10 coins + item, gym 10 coins + one item, thief 20 coins, Gholdengo 6 + a jackpot coin, rescue 12 + a ticket-worth coin, golden 35%');

// world props, hand-derived from the old world.js (the 'heal' pickup there became Oran at the same rate, both heal 30%)
{ const g = sample('grass'); chk('grass oran', rate(g, 'ground:oran'), 0.05, 0.002); chk('grass coin', rate(g, 'coin'), 0.06, 0.002);
  const r = sample('rock'); chk('rock xp', rate(r, 'xp'), 0.4, 0.004); chk('rock coin', rate(r, 'coin'), 0.25, 0.004); chk('rock oran', rate(r, 'ground:oran'), 0.06, 0.002);
  let both = 0; for (let i = 0; i < 20000; i++) { const k = G.Drops.roll('rock', 0, 0, { rnd, place() {} }).map(d => d.pickup); if (k.includes('xp') && k.includes('coin')) both++; }
  if (both) bad('rock xp and coin share one roll');
  const x = G.Drops.roll('rock', 0, 0, { rnd: () => 0.1, place() {} }).find(d => d.pickup === 'xp'); if (!x || x.value !== 10) bad('rock xp is 1% of the next level');
  const c = sample('chest'); chk('chest coins average 5.5', rate(c, 'coin'), 5.5, 0.05); chk('chest oran', rate(c, 'ground:oran'), 0.5, 0.006); chk('chest magnet', rate(c, 'magnet'), 0.5, 0.006); chk('chest sitrus always', rate(c, 'ground:sitrus'), 1, 1e-9); chk('chest xp always', rate(c, 'xp'), 1, 1e-9); chk('chest item 8%', rate(c, 'item'), 0.08, 0.003);
  for (let i = 0; i < 2000; i++) { const n = G.Drops.roll('chest', 0, 0, { rnd, place() {} }).filter(d => d.pickup === 'coin').length; if (n < 4 || n > 7) { bad('chest coin count ' + n); break; } }
  const b = sample('bigchest'); chk('big chest coins: 9, plus 1 to 3 x1-worth coins (average 2), plus 15% an x10-worth coin', rate(b, 'coin'), 9 + 2 + 0.15, 0.02); { let jackpots = 0; for (let i = 0; i < N; i++) jackpots += coinsWorth(G.Drops.roll('bigchest', 0, 0, { rnd, place() {} }), G.Drops.ticketCoins(0, 1)); chk('big chest x10-worth coin 15%', jackpots / N, 0.15, 0.004); } chk('big chest item 50%', rate(b, 'item'), 0.5, 0.006); chk('big chest ground always', rate(b, 'ground:pool'), 1, 1e-9); chk('big chest xp always', rate(b, 'xp'), 1, 1e-9);
  const y = G.Drops.roll('bigchest', 0, 0, { rnd, place() {} }).find(d => d.pickup === 'xp'); if (y.value !== 777) bad('big chest xp is one level');
  const z = G.Drops.roll('chest', 0, 0, { rnd, place() {} }).find(d => d.pickup === 'xp'); if (z.value !== 20) bad('chest xp is 20');
  // the default place sends xp through dropXp and everything else through drop
  const seen = []; G.Pickups.dropXp = (x, y, v) => seen.push('dropXp:' + v); G.Pickups.drop = k => seen.push(k);
  G.Drops.roll('chest', 0, 0, { rnd: () => 0.99 }); if (!seen.includes('dropXp:20') || seen.includes('xp')) bad('xp entries go through Pickups.dropXp');
  G.Pickups.drop = () => {};
  console.log('props: grass, rock, chest and big chest rates as before, Oran in place of the heal pickup'); }
// one table: no source file rolls loot on its own, and nothing drops the retired heal pickup
{ if (JSON.stringify(G.Drops.TABLES).includes('"heal"')) bad('a table still drops the heal pickup');
  for (const f of ['js/world/world.js', 'js/entities/enemy.js', 'js/entities/pickup.js', 'js/systems/events.js']) { const src = fs.readFileSync(R + '/' + f, 'utf8');
    if (/Pickups\.drop\(/.test(src) || /\bdrop\('/.test(src)) bad(f + ' places a drop outside G.Drops'); } }

// run item share: boss 5%, gym 10%, elites never; a held run item is not rolled again
{ for (const [src, want] of [['boss', 0.05], ['gym', 0.1], ['elite', 0]]) { let run = 0, items = 0;
    for (let i = 0; i < N; i++) for (const d of G.Drops.roll(src, 0, 0, { rnd, place() {} })) if (d.pickup === 'item') { items++; if (d.value === 'run') run++; }
    chk(src + ' run share', run / items, want, 0.004); }
  G.Game.player.runItems = ['run'];
  for (let i = 0; i < 2000; i++) for (const d of G.Drops.roll('boss', 0, 0, { rnd, place() {} })) if (d.value === 'run') { bad('held run item rolled again'); i = 1e9; break; }
  G.Game.player.runItems = [];
  console.log('run item share: boss 5%, gym 10%, elite 0, never a held one'); }

// positions: fixed offsets and spreads (boss and elite item at -26,-10; coins within +/-40 x +/-30)
{ const it = G.Drops.roll('boss', 100, 200, { rnd, place() {} }).find(d => d.pickup === 'item'); if (it.x !== 74 || it.y !== 190) bad('boss item position');
  const el = G.Drops.roll('elite', 100, 200, { rnd: () => 0.5, place() {} }).find(d => d.pickup === 'item'); if (!el || el.x !== 74 || el.y !== 190) bad('elite item position');
  for (const d of G.Drops.roll('boss', 100, 200, { rnd, place() {} })) if (d.pickup === 'coin' && (Math.abs(d.x - 100) > 40 || Math.abs(d.y - 200) > 30)) bad('coin spread');
  if (G.Drops.roll('nope', 0, 0).length) bad('unknown source drops nothing'); }
// place() receives the same results roll() returns
{ const seen = []; const out = G.Drops.roll('rescue', 5, 5, { rnd, place: (k, x, y, v) => seen.push(k) }); if (seen.length !== out.length) bad('place called once per drop'); }

// pickup radii (real pickup.js, Jess 2026-11-03): only XP orbs use pl.magnet, every other kind uses pl.itemMagnet; pullAll takes everything.
{ Object.assign(G.U, { rand: () => 0, dist2: (a, b, c, d) => (a - c) ** 2 + (b - d) ** 2, damp: (a, b) => b }); G.Coop = { active: false, isHost: false }; G.Grounds.canTake = () => true;
  load('js/entities/pickup.js'); const P = G.Pickups;
  const KINDS = ['xp', 'xpBig', 'coin', 'ground', 'item', 'magnet', 'bomb'], isXp = k => k === 'xp' || k === 'xpBig';
  const pulledAt = (k, d, pl, all) => { P.clear(); P.drop(k, d, 0, 1); if (all) P.pullAll(); P.update(0.001, pl, () => {}); return P.all()[0].pulled; };
  const pl = { x: 0, y: 0, magnet: 120, itemMagnet: 78 };
  for (const k of KINDS) {
    if (pulledAt(k, 100, pl) !== isXp(k)) bad(k + ' at 100 px, between the two radii');
    if (!pulledAt(k, 70, pl)) bad(k + ' at 70 px, inside both radii');
    if (pulledAt(k, 130, pl)) bad(k + ' at 130 px, outside both radii');
    if (!pulledAt(k, 130, pl, true)) bad(k + ' with the magnet pickup');
    if (!pulledAt(k, 300, { x: 0, y: 0, magnet: 480, itemMagnet: 312 })) bad(k + ' at 300 px with both radii x4');
  }
  console.log('pickup radii: XP orbs 120, the rest 78, the magnet pickup pulls all, x4 scales both');
  // a dropped item draws the icon from its data at 32 (the sheet's 1x cell), the same icon as the held slot; with no icon set, its id
  const drawn = []; G.Icons = { draw: (c, name, x, y, size) => drawn.push([name, size]) }; G.Camera = { sees: () => true }; G.Items.BY = { spec: { icon: 'ps:hold-item.choice-specs' }, old: {} };
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  for (const [id, want] of [['spec', 'ps:hold-item.choice-specs'], ['old', 'old'], ['gone', 'gone']]) { drawn.length = 0; P.clear(); P.drop('item', 0, 0, id); P.draw(ctx);
    if (drawn.length !== 1 || drawn[0][0] !== want || drawn[0][1] !== 32) bad('dropped item ' + id + ' draws ' + JSON.stringify(drawn)); }
  console.log('dropped items: the icon from the item data at 32, the id when none is set'); }

console.log(fail ? fail + ' FAILED' : 'drops harness: all passed');
process.exit(fail ? 1 : 0);
