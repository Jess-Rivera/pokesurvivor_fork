/* ============ drops.js, the ONE place that decides what enemies and events drop ============
 * Every chance, count and position for a drop lives in TABLES below. Nothing else rolls a drop: enemy.js, pickup.js,
 * events.js and world.js call G.Drops.roll(source, x, y) and place whatever comes back. What is INSIDE a pool (the ground item
 * weights, which Pokemon items exist) stays with the item data; this file decides how often a pool is rolled.
 * The size of a kill's XP orb is a formula and not a chance, so Pickups.dropXp still builds it, then rolls the wild table.
 *
 * Entry fields:
 *   pickup   pickup kind ('coin', 'magnet', 'bomb', 'ground', 'item'), or 'xp' (goes through Pickups.dropXp)
 *   p        chance 0..1 (a number, or a function of ctx); omitted = guaranteed
 *   n        how many (default 1), each rolled on its own; [min, max] = a random count
 *   value    pickup value (default 0, or a function of ctx); 'ground' = a ground item id, 'item' = an item id (see `run`)
 *   run      only with value 'item': chance the item is a RUN item instead of a Pokemon item
 *   dx, dy   fixed offset from the drop spot;  jx, jy   random +/- spread on top of it
 *   oneOf    a list of entries of which at most one drops (a single shared roll, in order)
 * Sources: wild, elite, boss, gym, golden, thief, thiefJackpot, rescue, grass, rock, chest, bigchest.
 */
G.Drops = (() => {
  const K = {
    groundBase: 0.004, // extra ground item roll per wild kill (Jess 2026-11-04, playtest: 0.4%, was 1%)
    eliteItem: 0.5, // chance of a Pokemon item from an elite (its Berry is guaranteed)
    runBoss: 0.05, // placeholder chance a boss item is a RUN item (boss will become run-only later)
    runGym: 0.1, // placeholder chance a gym item is a RUN item
    // The gacha tickets are gone (#133, decision 2026-11-15-133-tickets-pay-coins). Where a ticket dropped, a coin pickup of what
    // it was worth drops now: an x1 ticket was one pull, about 38 coins of sell value; an x10 ticket ten pulls with a 4 star
    // guaranteed, about 400. Provisional until #97 settles what PokeCoins buy. Missions and achievements use ticketCoins().
    ticketCoins: 40,
    ticket10Coins: 400,
    golden: 0.35, // a golden enemy's extra coin
  };

  const TABLES = {
    // Every non-elite, non-gym kill (bosses included) and every world XP orb (rocks, chests), through Pickups.dropXp.
    wild: [
      {
        oneOf: [
          // Playtest cut (Jess 2026-11-04): Oran 0.55% to 0.2%, Sitrus 0.4% to 0.1%, magnet 0.8% to 0.4%, bomb 0.6% to 0.1%.
          { pickup: 'ground', p: 0.002, value: 'oran', jx: 8 },
          { pickup: 'ground', p: 0.001, value: 'sitrus', jx: 8 },
          { pickup: 'magnet', p: 0.004 },
          { pickup: 'bomb', p: 0.001 },
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
    // A gym leader is a boss too, but it rolls only this table: its 10 coins and ONE item (Jess 2026-11-03), picked up by the arena's pullAll.
    gym: [
      { pickup: 'coin', n: 10, value: 5, jx: 40, jy: 30 },
      { pickup: 'item', dx: -26, dy: -10, value: 'item', run: K.runGym },
    ],
    golden: [{ pickup: 'coin', p: K.golden, value: 3, dx: 6, dy: -4 }],
    thief: [{ pickup: 'coin', n: 20, value: 5, jx: 36, jy: 26 }], // Meowth
    thiefJackpot: [
      { pickup: 'coin', n: 6, value: 5, jx: 36, jy: 26 },
      { pickup: 'coin', value: K.ticket10Coins, dy: -12 },
    ], // Gholdengo
    rescue: [
      { pickup: 'coin', n: 12, value: 5, jx: 40, jy: 30 },
      { pickup: 'coin', value: K.ticketCoins, dy: -12 },
    ], // an overworld lost-Pokemon event
    // World props (world.js). Oran replaces the old heal pickup at the same rates (both heal 30%).
    grass: [
      {
        oneOf: [
          { pickup: 'ground', p: 0.05, value: 'oran' },
          { pickup: 'coin', p: 0.06, value: 1 },
        ],
      },
    ],
    rock: [
      {
        oneOf: [
          { pickup: 'xp', p: 0.4, value: () => G.Game.everyone()[0].xpNext * 0.01 }, // flat 1% of the next level
          { pickup: 'coin', p: 0.25, value: 2 },
        ],
      },
      { pickup: 'ground', p: 0.06, value: 'oran', dx: 8 },
    ],
    chest: [
      { pickup: 'coin', n: [4, 7], value: 3, jx: 14, jy: 10 },
      {
        oneOf: [
          { pickup: 'ground', p: 0.5, value: 'oran' },
          { pickup: 'magnet', p: 0.5 },
        ],
      },
      { pickup: 'ground', value: 'sitrus', dx: 12, dy: -6 }, // a small chest always holds a Sitrus Berry
      { pickup: 'xp', value: 20 },
      { pickup: 'item', p: 0.08, dy: -12, value: 'item' },
    ],
    bigchest: [
      { pickup: 'coin', n: 9, value: 4, jx: 22, jy: 14 },
      { pickup: 'coin', n: [1, 3], value: K.ticketCoins, jx: 16, jy: 10 },
      { pickup: 'coin', p: 0.15, value: K.ticket10Coins, dy: -10 },
      { pickup: 'item', p: 0.5, dx: 14, dy: -14, value: 'item' },
      { pickup: 'ground', dx: -14, dy: -14, value: 'ground' }, // a big chest always holds one ground item
      { pickup: 'xp', value: () => G.Game.levelXp() }, // enough to level up once
    ],
  };

  function itemValue(e, rnd) {
    if (e.run && rnd() < e.run) {
      const owned = (G.Game && G.Game.player && G.Game.player.runItems) || [];
      const id = G.Items.rollRun(owned);
      if (id) return id;
    }
    return G.Items.roll();
  }

  function make(e, x, y, rnd, ctx) {
    const j = (a) => (a ? (rnd() * 2 - 1) * a : 0);
    let value = typeof e.value === 'function' ? e.value(ctx) : e.value || 0;
    if (value === 'ground') value = G.Grounds.roll(rnd);
    else if (value === 'item') value = itemValue(e, rnd);
    return { pickup: e.pickup, x: x + (e.dx || 0) + j(e.jx), y: y + (e.dy || 0) + j(e.jy), value };
  }

  function chance(e, ctx) {
    return typeof e.p === 'function' ? e.p(ctx) : e.p;
  }

  function count(e, rnd) {
    if (!Array.isArray(e.n)) return e.n || 1;
    return e.n[0] + Math.floor(rnd() * (e.n[1] - e.n[0] + 1));
  }

  function placeDrop(k, x, y, v) {
    if (k === 'xp') G.Pickups.dropXp(x, y, v);
    else G.Pickups.drop(k, x, y, v);
  }

  /**
   * Roll one source's table at (x, y). Places each result with opts.place (default placeDrop) and returns the list.
   * @param opts  { lead: a roster member (Pinap bonus), rnd: random source for tests, place: (kind, x, y, value) => void }
   */
  function roll(source, x, y, opts = {}) {
    const table = TABLES[source];
    if (!table) return [];
    const rnd = opts.rnd || Math.random;
    const place = opts.place || placeDrop;
    const out = [];
    const emit = (e) => {
      const d = make(e, x, y, rnd, opts);
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
      const n = count(e, rnd);
      for (let i = 0; i < n; i++) if (e.p === undefined || rnd() < chance(e, opts)) emit(e);
    }
    return out;
  }

  /** The coins a mission or achievement pays where it used to pay x1 and x10 tickets. */
  const ticketCoins = (x1 = 0, x10 = 0) => x1 * K.ticketCoins + x10 * K.ticket10Coins;

  return { K, TABLES, roll, ticketCoins };
})();
