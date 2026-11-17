/* ============ tms.js: TMs, moves a Pokemon learns for good (G.TMs; #149 149f) ============
 * Bought with PokeCoins in the Main Menu Shop's TMs tab (js/ui/shop-tms.js). A TM teaches one copy (by its UUID), never
 * the species, and it stays learned; in every later run the move joins that copy's Move Trainer pool (js/systems/shops.js),
 * one more move it may be offered, not a guaranteed one. Rulings: decision 2026-11-17-tm-for-good-tr-for-one-run (names)
 * and docs/ASCII Concept Maps/149 - Shop Rework Opening.md (R2, R6 to R8, F1 to F9). The copy's saved list is G.Copies'.
 *   list()                    every TM: each move on some species' TM list (G.Moves.tmList), sorted by name
 *   price(moveId)             PokeCoins, by the move's power (F1 bands, temporary)
 *   learned(save, uid)        the move ids copy uid has learned ([] for none or no such copy)
 *   standing(save, uid, id)   'buy' | 'learned' (bought already) | 'known' (in its level-up and egg pool, so the Move
 *                             Trainer offers it anyway) | 'cannot' (not on its TM list) | 'none' (no such copy)
 *   teach(save, uid, id)      spends the price and saves the move on the copy: { ok: true } or { ok: false, error:
 *                             'none' | 'cannot' | 'known' | 'learned' | 'poor' }. The caller saves (G.DB.commit).
 */
G.TMs = (() => {
  // F1 (Jess 2026-11-17): temporary price bands by move power, PokeCoins (TUNE; BALANCE.md "TMs"). A status move has no
  // power; buffs are strong here, so it sits between the middle bands.
  const POWER_BANDS = [
    { below: 60, price: 2000 },
    { below: 90, price: 4000 },
    { below: 110, price: 7000 },
    { below: Infinity, price: 12000 },
  ];
  const STATUS_PRICE = 5000;

  let sorted = null;
  const nameOf = (moveId) => (G.MoveDefs[moveId] ? G.MoveDefs[moveId].name : moveId);
  function list() {
    if (!sorted) sorted = [...G.Moves.tmList()].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    return sorted;
  }

  function price(moveId) {
    const def = G.MoveDefs[moveId];
    if (!def || def.power == null) return STATUS_PRICE;
    return POWER_BANDS.find((band) => def.power < band.below).price;
  }

  /** The copy as the move rules read it, or null: the read copy and its species. */
  function copyOf(save, uid) {
    let copy = null;
    try {
      copy = save && typeof uid === 'string' ? G.Copies.get(save, uid) : null;
    } catch (error) {
      copy = null; // a malformed id is no copy
    }
    const species = copy && G.DEX_BY[copy.speciesID];
    return species ? { copy, species } : null;
  }

  function learned(save, uid) {
    const found = copyOf(save, uid);
    return found ? found.copy.tmsLearned : [];
  }

  function standing(save, uid, moveId) {
    const found = copyOf(save, uid);
    if (!found) return 'none';
    if (found.copy.tmsLearned.includes(moveId)) return 'learned';
    if (G.Moves.poolFor(found.species).includes(moveId)) return 'known';
    if (!G.Moves.canUseTm(found.species, moveId)) return 'cannot';
    return 'buy';
  }

  function teach(save, uid, moveId) {
    const now = standing(save, uid, moveId);
    if (now !== 'buy') return { ok: false, error: now };
    const cost = price(moveId);
    if (!(save.coins >= cost)) return { ok: false, error: 'poor' };
    if (!G.Copies.learnTm(save, uid, moveId)) return { ok: false, error: 'none' };
    save.coins -= cost;
    return { ok: true, cost };
  }

  return { list, price, learned, standing, teach };
})();
