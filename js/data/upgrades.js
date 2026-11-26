/* ============ upgrades.js, the per-copy upgrades (#97, G.Upgrades) ============
 * Bought with PokeCoins for one copy in the Team menu's Upgrade popup; the levels live on the copy (G.Copies, key p).
 * Rules: docs/AI Outputs/Issue-97/97 - Upgrade System Design.md, decisions 2026-11-23-97-upgrade-price-shape-bst-and-bands
 * and 2026-11-26-97-upgrade-popup-open-questions. The numbers are the design's "Numbers (draft)", [Proposed] until #166
 * has run data.
 * - Price: a level's 3-star price times the species' BST stars / 3, rounded to 10. Stars are BST / 100 in half-star
 *   steps, held between 3 and 7 (below 3 pays the 3-star price). Levels survive evolution; the price follows the species.
 * - Bands: the power upgrades' caps open with the copy's OOR level (G.Candy), `levelsPerBand` at each of BAND_LEVELS.
 *   Starting moves have no band.
 * - Starting moves are bought and saved now; the #150 picker makes them act.
 * - Names: the popup sketch's (assets/excalidraw/poke-upgrade.excalidraw), Regeneration++ Jess's (2026-11-26).
 * The old account-wide upgrades (Magnet, Fortune, Card Reroll, Veto) and the per-species save.pupg levels are no longer
 * read; the four return in Character Upgrades.
 */
G.Upgrades = (() => {
  const BAND_LEVELS = [1, 10, 20, 40, 80];
  const STARS_MIN = 3,
    STARS_MAX = 7,
    BST_PER_HALF_STAR = 50,
    PRICE_STARS = 3, // the stars the listed prices are for
    PRICE_ROUNDING = 10;

  const baseStat = (id, name, statIndex) => ({
    id,
    name,
    kind: 'baseStat',
    statIndex, // HP, Atk, Def, SpA, SpD, Spe
    perLevel: 0.015, // +1.5% of the species base stat
    levels: 10,
    levelsPerBand: 2,
    firstPrice: 50,
    priceGrowth: 1.6,
  });
  const power = (id, name, perLevel) => ({
    id,
    name,
    kind: id,
    perLevel,
    levels: 5,
    levelsPerBand: 1,
    firstPrice: 100,
    priceGrowth: 2,
  });

  const LIST = [
    baseStat('baseHp', 'HP++', 0),
    baseStat('baseAtk', 'Atk++', 1),
    baseStat('baseDef', 'Def++', 2),
    baseStat('baseSpa', 'Sp.Atk++', 3),
    baseStat('baseSpd', 'Sp.Def++', 4),
    baseStat('baseSpe', 'Speed++', 5),
    power('crit', 'Critical Hit++', 0.02), // +2% crit chance
    power('reflexes', 'Cooldown++', 0.02), // -2% move cooldowns (the design's Reflexes)
    power('regeneration', 'Regeneration++', 0.001), // +0.1% max HP a second, on the field and on the bench
    { id: 'startingMoves', name: 'Starting Moves', kind: 'startingMoves', levels: 2, prices: [300, 2000] },
  ];
  const BY = {};
  for (const upgrade of LIST) BY[upgrade.id] = upgrade;

  /** A species' BST as stars: half-star steps, between 3 and 7. A dex with no data pays the 3-star price. */
  function starsOf(dex) {
    const species = G.DEX_BY && G.DEX_BY[dex];
    if (!species) return STARS_MIN;
    const stars = Math.round(species.bst / BST_PER_HALF_STAR) / 2;
    return Math.max(STARS_MIN, Math.min(STARS_MAX, stars));
  }

  const roundPrice = (price) => Math.round(price / PRICE_ROUNDING) * PRICE_ROUNDING;

  /** The price of the level after `level` (0 = the first level) of upgrade `id` for species `dex`: the design's listed
   *  3-star price (itself rounded to 10), times stars / 3, rounded to 10 again. */
  function priceOf(id, level, dex) {
    const upgrade = BY[id];
    const listed = upgrade.prices
      ? upgrade.prices[level]
      : roundPrice(upgrade.firstPrice * upgrade.priceGrowth ** level);
    return roundPrice((listed * starsOf(dex)) / PRICE_STARS);
  }

  /** How many levels of upgrade `id` a copy at OOR level `oorLevel` may hold. */
  function capOf(id, oorLevel) {
    const upgrade = BY[id];
    if (!upgrade.levelsPerBand) return upgrade.levels;
    const bandsOpen = BAND_LEVELS.filter((bandLevel) => oorLevel >= bandLevel).length;
    return Math.min(upgrade.levels, bandsOpen * upgrade.levelsPerBand);
  }

  function readCopy(save, uid) {
    try {
      return typeof uid === 'string' ? G.Copies.get(save, uid) : null;
    } catch (e) {
      return null; // a malformed id is no copy
    }
  }

  /**
   * Buys the next level of upgrade `id` for copy `uid`. The caller saves.
   * @returns { ok: true, level, price } | { ok: false, error: 'upgrade' | 'none' | 'max' | 'band' | 'poor' }
   */
  function buy(save, uid, id) {
    if (!BY[id]) return { ok: false, error: 'upgrade' };
    const copy = readCopy(save, uid);
    if (!copy) return { ok: false, error: 'none' };
    const level = copy.upgrades[id] || 0;
    if (level >= BY[id].levels) return { ok: false, error: 'max' };
    if (level >= capOf(id, G.Candy.levelFor(copy.speciesID, copy.candyXp))) return { ok: false, error: 'band' };
    const price = priceOf(id, level, copy.speciesID);
    if (!(save.coins >= price)) return { ok: false, error: 'poor' };
    save.coins -= price;
    G.Copies.setUpgradeLevel(save, uid, id, level + 1);
    return { ok: true, level: level + 1, price };
  }

  /** What a copy's upgrade levels ({ id -> level }) add up to. Unknown ids and levels past the maximum give nothing.
   *  baseStatMul: six multipliers on the species base stats; critChance: added chance; cooldownMul: on move cooldowns;
   *  regenPerSecond: the fraction of max HP healed a second; startingMoves: the level bought (#150 reads it). */
  function summary(levels = {}) {
    const levelOf = (id) => Math.max(0, Math.min(BY[id].levels, Math.floor(+levels[id] || 0)));
    const baseStatMul = [1, 1, 1, 1, 1, 1];
    for (const upgrade of LIST)
      if (upgrade.kind === 'baseStat') baseStatMul[upgrade.statIndex] = 1 + levelOf(upgrade.id) * upgrade.perLevel;
    return {
      baseStatMul,
      critChance: levelOf('crit') * BY.crit.perLevel,
      cooldownMul: 1 - levelOf('reflexes') * BY.reflexes.perLevel,
      regenPerSecond: levelOf('regeneration') * BY.regeneration.perLevel,
      startingMoves: levelOf('startingMoves'),
    };
  }

  return { LIST, BY, BAND_LEVELS, starsOf, priceOf, capOf, buy, summary };
})();
