/* ============ gacha.js — one banner per generation ============
 * Pure logic: it does not touch the interface. The screen is in ui/gacha-ui.js.
 *
 * 9 banners (Kanto ... Paldea). Each with its own pity.
 * Probabilities per pull:  1★ 45% · 2★ 30% · 3★ 17% · 4★ 6.5% · 5★ 1.5%
 * Guarantees:
 *   - the x10 pull brings at least a 4★ or higher
 *   - at 70 pulls without a 5★ in that banner, the next is a guaranteed 5★
 * Shiny: 1 in every 100 pulls comes in its shiny version.
 * Repeats: every pull is a new copy in the box, repeats and repeat shinies included (docs/proposals/pokebox-plan.md).
 * REFUND is kept as the sell price by rarity (x3 for a shiny), for selling from the box (step 3a-3).
 *
 * Pulled with TICKETS (earned by playing):
 *   ×1   1 ticket
 *   x10  10 normal tickets, or 1 x10 ticket (you choose which)
 */
G.Gacha = (() => {
  /** What does a pull of n cost? -> { t1, t10 } or null if you cannot afford it. */
  /** @param use  't1' (normal tickets) or 't10' (an x10 ticket, only for the x10) */
  function costOf(save, n, use = 't1') {
    const t = save.tickets || { t1: 0, t10: 0 };
    if (n === 10 && use === 't10') return t.t10 >= 1 ? { t1: 0, t10: 1 } : null;
    return t.t1 >= n ? { t1: n, t10: 0 } : null;
  }
  const RATES = [
    [1, 45],
    [2, 30],
    [3, 17],
    [4, 6.5],
    [5, 1.5],
  ];
  const PITY_5 = 70;
  const SHINY_RATE = 1 / 100;
  const REFUND = { 1: 15, 2: 30, 3: 60, 4: 120, 5: 300 }; // the sell price from step 3a-3; a pull no longer pays it
  let forceShiny = 0; // for testing and videos: the next N come shiny

  const RARITY_NAME = { 1: 'Común', 2: 'Poco común', 3: 'Rara', 4: 'Épica', 5: 'Legendaria' };
  const RARITY_COLOR = { 1: '#9fb1c9', 2: '#5fe08a', 3: '#4fb4ff', 4: '#c47bff', 5: '#ffcb3d' };

  const BANNERS = [
    { gen: 1, name: 'Kanto', color: ['#3a1d6e', '#1b2f78', '#0f4d6e'] },
    { gen: 2, name: 'Johto', color: ['#5a2a1a', '#7a3d1f', '#2d4a6e'] },
    { gen: 3, name: 'Hoenn', color: ['#0f4d6e', '#1b6a5a', '#2a3d78'] },
    { gen: 4, name: 'Sinnoh', color: ['#2a2a5e', '#3d3d8a', '#5a2a6e'] },
    { gen: 5, name: 'Teselia', color: ['#1a1a2a', '#3a3a4e', '#2a4a6e'] },
    { gen: 6, name: 'Kalos', color: ['#4a1a3a', '#2a3a7a', '#1a5a7a'] },
    { gen: 7, name: 'Alola', color: ['#7a3a1a', '#1a6a6a', '#2a4a8a'] },
    { gen: 8, name: 'Galar', color: ['#4a1a5a', '#1a3a6a', '#6a1a3a'] },
    { gen: 9, name: 'Paldea', color: ['#6a2a1a', '#4a1a5a', '#1a4a6a'] },
  ];

  function inBanner(p, gen) {
    return p.gen === gen && !!G.SPRITE_META[p.dex];
  }

  /** Pokemon of a rarity in a banner. */
  function pool(rarity, gen) {
    return G.DEX.filter((p) => inBanner(p, gen) && p.rarity === rarity);
  }

  /** Nearest non-empty pool (some generations have nearly empty rarities). */
  function poolNear(rarity, gen) {
    for (const d of [0, -1, 1, -2, 2, -3, 3, -4, 4]) {
      const r = rarity + d;
      if (r < 1 || r > 5) continue;
      const p = pool(r, gen);
      if (p.length) return { rarity: r, list: p };
    }
    return { rarity, list: G.DEX.filter((p) => inBanner(p, gen)) };
  }

  function rollRarity(min = 1) {
    const rates = RATES.filter(([r]) => r >= min);
    const total = rates.reduce((a, [, w]) => a + w, 0);
    let x = Math.random() * total;
    for (const [r, w] of rates) {
      x -= w;
      if (x <= 0) return r;
    }
    return rates[rates.length - 1][0];
  }

  /** The 3 strongest of the generation, for the banner poster. */
  function featured(gen) {
    return G.DEX.filter((p) => inBanner(p, gen) && p.rarity === 5)
      .sort((a, b) => b.bst - a.bst)
      .slice(0, 3)
      .map((p) => p.dex);
  }

  /**
   * Does `n` pulls on banner `gen` on the save `save` (it modifies it).
   * Returns null if there are no coins, or the list of results:
   *   { dex, rarity, shiny, isNew, uid, box }
   * isNew: new to the Pokedex, or a first shiny. uid and box (from 0): the copy it made.
   */
  function pull(save, n, gen = 1, use = 't1') {
    const cost = costOf(save, n, use);
    if (!cost) return null;
    save.tickets.t1 -= cost.t1;
    save.tickets.t10 -= cost.t10;
    save.pity = save.pity || {};
    save.shiny = save.shiny || {};
    save.pity[gen] = save.pity[gen] || 0;

    const out = [];
    for (let i = 0; i < n; i++) {
      save.pity[gen]++;
      let want;
      if (save.pity[gen] >= PITY_5) want = 5;
      else if (n === 10 && i === n - 1 && !out.some((r) => r.rarity >= 4)) want = rollRarity(4);
      else want = rollRarity();

      const { rarity, list } = poolNear(want, gen);
      if (rarity === 5) save.pity[gen] = 0;
      const mon = G.U.pick(list);
      const canShiny = G.Sprites.hasShiny(mon.dex);
      const shiny = canShiny && (forceShiny > 0 ? (forceShiny--, true) : Math.random() < SHINY_RATE);
      // Every pull is a copy, a repeat shiny included (it is no longer re-rolled). A repeat pays nothing: sell it from the box.
      const got = G.DB.obtain(mon.dex, shiny, 'gacha', save);
      out.push({ dex: mon.dex, rarity, shiny, isNew: got.isNew, uid: got.uid, box: got.box });
    }
    save.stats.pulls = (save.stats.pulls || 0) + n;
    return out;
  }

  return {
    debugForceShiny(n = 1) {
      forceShiny = n;
    },
    costOf,
    RATES,
    PITY_5,
    SHINY_RATE,
    REFUND,
    RARITY_NAME,
    RARITY_COLOR,
    BANNERS,
    pool,
    featured,
    pull,
  };
})();
