/* ============ drops.js, the ONE place that decides what enemies and events drop ============
 * Every chance, count and position for a drop lives in TABLES below. Nothing else rolls a drop: enemy.js, pickup.js and
 * events.js call G.Drops.roll(source, x, y) and place whatever comes back. What is INSIDE a pool (the ground item weights,
 * which Pokemon items exist) stays with the item data; this file decides how often a pool is rolled.
 * XP orbs are a formula and not a chance, so Pickups.dropXp still builds them.
 *
 * Entry fields:
 *   pickup   pickup kind ('coin', 'ticket', 'ticket10', 'heal', 'magnet', 'bomb', 'ground', 'item')
 *   p        chance 0..1 (a number, or a function of ctx); omitted = guaranteed
 *   n        how many (default 1), each rolled on its own
 *   value    pickup value (default 0); 'ground' = a ground item id, 'item' = an item id (see `run`)
 *   run      only with value 'item': chance the item is a RUN item instead of a Pokemon item
 *   dx, dy   fixed offset from the death spot;  jx, jy   random +/- spread on top of it
 *   oneOf    a list of entries of which at most one drops (a single shared roll, in order)
 * Sources: wild, elite, boss, gym, golden, thief, thiefTicket, rescue.
 */
G.Drops = (() => {
  const K = {
    groundBase: 0.01, // extra ground item roll per wild kill (Jess: 1%)
    eliteItem: 0.5, // chance of a Pokemon item from an elite (its Berry is guaranteed)
    runBoss: 0.05, // placeholder chance a boss item is a RUN item (boss will become run-only later)
    runGym: 0.1, // placeholder chance a gym item is a RUN item
    ticket: 1 / 400, // x2 ticket off a wild kill (was 1/260; rarer since 2026-10-10)
    golden: 0.35, // a golden enemy's extra coin
  };

  const TABLES = {
    // Every non-elite, non-gym kill (bosses included), through Pickups.dropXp.
    wild: [
      { pickup: 'ticket', p: K.ticket, value: 1, jx: 6 },
      {
        oneOf: [
          // The healing berries replace the old heal pickup (1.2% x 30% heal = 0.36% of max HP per kill); 0.55% Oran (30%) + 0.40% Sitrus (50%) is the same total.
          { pickup: 'ground', p: 0.0055, value: 'oran', jx: 8 },
          { pickup: 'ground', p: 0.004, value: 'sitrus', jx: 8 },
          { pickup: 'magnet', p: 0.008 },
          { pickup: 'bomb', p: 0.006 },
        ],
      },
      { pickup: 'ground', p: (ctx) => K.groundBase + G.Grounds.dropBonus(ctx.lead), value: 'ground', jx: 10, jy: 6 },
    ],
    elite: [
      // The guaranteed heal berry: Oran (30%) or Sitrus (50%), 50/50.
      {
        oneOf: [
          { pickup: 'ground', p: 0.5, value: 'oran', dx: 24 },
          { pickup: 'ground', p: 0.5, value: 'sitrus', dx: 24 },
        ],
      },
      { pickup: 'ground', dx: 4, dy: 22, value: 'ground' },
      { pickup: 'item', p: K.eliteItem, dx: -26, dy: -10, value: 'item' },
    ],
    boss: [
      { pickup: 'coin', n: 10, value: 5, jx: 40, jy: 30 },
      { pickup: 'item', dx: -26, dy: -10, value: 'item', run: K.runBoss },
    ],
    gym: [{ pickup: 'item', dx: -26, dy: -10, value: 'item', run: K.runGym }], // picked up by the arena's pullAll
    golden: [{ pickup: 'coin', p: K.golden, value: 3, dx: 6, dy: -4 }],
    thief: [{ pickup: 'coin', n: 20, value: 5, jx: 36, jy: 26 }], // Meowth
    thiefTicket: [
      { pickup: 'coin', n: 6, value: 5, jx: 36, jy: 26 },
      { pickup: 'ticket10', value: 1, dy: -12 },
    ], // Gholdengo
    rescue: [
      { pickup: 'coin', n: 12, value: 5, jx: 40, jy: 30 },
      { pickup: 'ticket', value: 1, dy: -12 },
    ], // an overworld lost-Pokemon event
  };

  function itemValue(e, rnd) {
    if (e.run && rnd() < e.run) {
      const owned = (G.Game && G.Game.player && G.Game.player.runItems) || [];
      const id = G.Items.rollRun(owned);
      if (id) return id;
    }
    return G.Items.roll();
  }

  function make(e, x, y, rnd) {
    const j = (a) => (a ? (rnd() * 2 - 1) * a : 0);
    let value = e.value || 0;
    if (value === 'ground') value = G.Grounds.roll(rnd);
    else if (value === 'item') value = itemValue(e, rnd);
    return { pickup: e.pickup, x: x + (e.dx || 0) + j(e.jx), y: y + (e.dy || 0) + j(e.jy), value };
  }

  function chance(e, ctx) {
    return typeof e.p === 'function' ? e.p(ctx) : e.p;
  }

  /**
   * Roll one source's table at (x, y). Places each result with opts.place (default G.Pickups.drop) and returns the list.
   * @param opts  { lead: a roster member (Pinap bonus), rnd: random source for tests, place: (kind, x, y, value) => void }
   */
  function roll(source, x, y, opts = {}) {
    const table = TABLES[source];
    if (!table) return [];
    const rnd = opts.rnd || Math.random;
    const place = opts.place || ((k, px, py, v) => G.Pickups.drop(k, px, py, v));
    const out = [];
    const emit = (e) => {
      const d = make(e, x, y, rnd);
      out.push(d);
      place(d.pickup, d.x, d.y, d.value);
    };
    for (const e of table) {
      if (e.oneOf) {
        let r = rnd();
        for (const o of e.oneOf) {
          if (r < chance(o, opts)) {
            emit(o);
            break;
          }
          r -= chance(o, opts);
        }
        continue;
      }
      for (let i = 0; i < (e.n || 1); i++) if (e.p === undefined || rnd() < chance(e, opts)) emit(e);
    }
    return out;
  }

  return { K, TABLES, roll };
})();
