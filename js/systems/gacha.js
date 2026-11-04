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
 * REFUND is the sell price by rarity (x3 for a shiny); it is G.Copies.SELL_PRICE, which owns it (copies.js loads first).
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
  const REFUND = G.Copies.SELL_PRICE; // the sell price (step 3a-3); a pull no longer pays it
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
   *   { dex, rarity, shiny, isNew, uid, box, sold }
   * isNew: new to the Pokedex, or a first shiny. uid and box (from 0): the copy it made.
   * Every roll is made first. With fewer free places than pulls, the places go to new species, then shinies, then higher
   * rarity, then pull order (pokebox 3a-4, D2); the rest are sold on arrival (sold: the PokeCoins). Results stay in pull order.
   */
  function pull(save, n, gen = 1, use = 't1') {
    const cost = costOf(save, n, use);
    if (!cost) return null;
    save.tickets.t1 -= cost.t1;
    save.tickets.t10 -= cost.t10;
    save.pity = save.pity || {};
    save.shiny = save.shiny || {};
    save.pity[gen] = save.pity[gen] || 0;

    const rolls = [];
    for (let i = 0; i < n; i++) {
      save.pity[gen]++;
      let want;
      if (save.pity[gen] >= PITY_5) want = 5;
      else if (n === 10 && i === n - 1 && !rolls.some((r) => r.rarity >= 4)) want = rollRarity(4);
      else want = rollRarity();

      const { rarity, list } = poolNear(want, gen);
      if (rarity === 5) save.pity[gen] = 0;
      const mon = G.U.pick(list);
      const canShiny = G.Sprites.hasShiny(mon.dex);
      const shiny = canShiny && (forceShiny > 0 ? (forceShiny--, true) : Math.random() < SHINY_RATE);
      rolls.push({ dex: mon.dex, rarity, shiny });
    }

    // New or repeat, in pull order: the first of a species (or of its shiny) in this pull is the new one. A shiny also marks the species.
    const seenN = new Set(),
      seenS = new Set();
    for (const r of rolls) {
      r.isNew = r.shiny ? !save.shiny[r.dex] && !seenS.has(r.dex) : !save.owned[r.dex] && !seenN.has(r.dex);
      seenN.add(r.dex);
      if (r.shiny) seenS.add(r.dex);
    }

    // Placing: pull order when everything fits, else the D2 priority. Every pull is a copy, a repeat shiny included; a repeat pays nothing.
    const rank = (r) => (r.isNew ? 100 : 0) + (r.shiny ? 10 : 0) + r.rarity;
    const order = rolls.map((r, i) => i);
    if (G.Copies.freePlaces(save) < n) order.sort((a, b) => rank(rolls[b]) - rank(rolls[a]) || a - b);
    const out = new Array(n);
    for (const i of order) {
      const r = rolls[i],
        got = G.DB.obtain(r.dex, r.shiny, 'gacha', save);
      const res = { dex: r.dex, rarity: r.rarity, shiny: r.shiny, isNew: r.isNew, uid: got.uid, box: got.box };
      if (got.sold) res.sold = got.sold;
      out[i] = res;
    }
    save.stats.pulls = (save.stats.pulls || 0) + n;
    return out;
  }

  /** The pull results "Sell repeats" may sell (3b D11): repeats that made a copy, 1 to 3 stars, not shiny. 4 and 5 stars
   *  and shinies are sold one by one (their confirm rule). */
  const bulkSellable = (results) => (results || []).filter((r) => r && !r.isNew && r.uid && !r.shiny && r.rarity <= 3);

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
    bulkSellable,
  };
})();
