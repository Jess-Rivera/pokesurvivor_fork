/* ============ candy.js, Exp Candy (G.Candy; #139 8a) ============
 * The bag of Exp Candy on the save, and giving it to a copy. Candy XP fills the copy's species' mainline growth curve
 * (G.GrowthCurves); its out-of-run (OOR) level is the mainline level for that XP, up to 100. The OOR level sets only the
 * copy's evolution stage and the moves it may start a run with; it changes no stat in a run (runs start at level 1).
 * Drops: G.Drops rolls the candy tables and banks each candy here the moment it drops (kept if the run is lost).
 * Rules: decision 2026-11-22-139-candy-target-and-drop-model; plan docs/AI Outputs/Issue-139/139a - Candy Build Plan.md.
 * Save: save.candy = { size: count } (an absent size is 0); the copy's candy XP is G.Copies' compact key c.
 */
G.Candy = (() => {
  // The canon sizes, never scaled (decision 2026-11-22-139-candy-target-and-drop-model), smallest first.
  const SIZES = Object.freeze({ xs: 100, s: 800, m: 3000, l: 10000, xl: 30000 });
  const SIZE_ORDER = Object.freeze(['xs', 's', 'm', 'l', 'xl']);
  const SIZE_LABEL = Object.freeze({ xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL' });
  const DROP_TOAST_MS = 2600;
  const maxLevel = () => G.GrowthCurves.MAX_LEVEL;
  const whole = (value) => (Number.isFinite(+value) && +value > 0 ? Math.floor(+value) : 0);

  // ---------------- the bag ----------------

  /** The bag's count of every size (0 when absent). */
  function bagOf(save) {
    const stored = (save && save.candy) || {},
      bag = {};
    for (const size of SIZE_ORDER) bag[size] = whole(stored[size]);
    return bag;
  }

  /** One candy of `size` into the bag. The caller saves (saveAndAnnounce after a drop). False for an unknown size. */
  function bank(size, save = G.DB && G.DB.save) {
    if (!SIZES[size] || !save) return false;
    save.candy = save.candy && typeof save.candy === 'object' ? save.candy : {};
    save.candy[size] = whole(save.candy[size]) + 1;
    return true;
  }

  /** After a kill's drops: if any candy dropped, save at once (it was banked as it dropped) and toast the sizes. */
  function saveAndAnnounce(drops) {
    if (!Array.isArray(drops)) return;
    const counts = {};
    for (const drop of drops) if (drop.pickup === 'candy') counts[drop.value] = (counts[drop.value] || 0) + 1;
    const sizes = SIZE_ORDER.filter((size) => counts[size]);
    if (!sizes.length) return;
    if (G.DB && G.DB.commit) G.DB.commit(true);
    const text = sizes.map((size) => SIZE_LABEL[size] + (counts[size] > 1 ? ' x' + counts[size] : '')).join(', ');
    if (G.UI && G.UI.toast) G.UI.toast('Exp Candy: ' + text, DROP_TOAST_MS);
  }

  /** Cleans a hand-edited bag: whole, non-negative counts of known sizes only. */
  function clean(save) {
    const stored = save.candy && typeof save.candy === 'object' ? save.candy : {};
    save.candy = {};
    for (const size of SIZE_ORDER) if (whole(stored[size])) save.candy[size] = whole(stored[size]);
  }

  // ---------------- levels ----------------

  /** The XP total a species needs for `level` (1 to 100), or null for a dex with no curve. */
  function xpForLevel(dex, level) {
    const curve = G.GrowthCurves.curveOf(dex);
    if (!curve) return null;
    return curve[Math.max(1, Math.min(maxLevel(), Math.floor(level))) - 1];
  }

  /** The OOR level for `xp` candy XP on a species' curve: the highest level whose total it has reached (1 at 0 XP). */
  function levelFor(dex, xp) {
    const curve = G.GrowthCurves.curveOf(dex);
    if (!curve) return 1;
    let level = 1;
    while (level < maxLevel() && curve[level] <= xp) level++;
    return level;
  }

  // ---------------- giving ----------------

  /** The copy (G.Copies.read shape), or null for a missing copy or a malformed id. */
  function copyOf(save, uid) {
    try {
      return typeof uid === 'string' ? G.Copies.get(save, uid) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Gives one candy of `size` to copy `uid`. Refused only at OOR level 100 (a copy whose next evolution has no level
   * still levels). The caller saves.
   * @returns { ok: true, xp, level } | { ok: false, error: 'size' | 'empty' | 'none' | 'max' }
   */
  function give(save, uid, size) {
    if (!SIZES[size]) return { ok: false, error: 'size' };
    if (!bagOf(save)[size]) return { ok: false, error: 'empty' };
    const copy = copyOf(save, uid);
    if (!copy) return { ok: false, error: 'none' };
    if (levelFor(copy.speciesID, copy.candyXp) >= maxLevel()) return { ok: false, error: 'max' };
    const xp = G.Copies.addCandyXp(save, uid, SIZES[size]);
    save.candy[size] = whole(save.candy[size]) - 1;
    if (!save.candy[size]) delete save.candy[size];
    return { ok: true, xp, level: levelFor(copy.speciesID, xp) };
  }

  /** The size Give until gives next for `remaining` XP: the largest held that fits, else the smallest held that covers
   *  it; null when the bag is empty. */
  function nextSizeFor(bag, remaining) {
    const held = SIZE_ORDER.filter((size) => bag[size] > 0);
    const fits = held.filter((size) => SIZES[size] <= remaining);
    if (fits.length) return fits[fits.length - 1];
    return held.find((size) => SIZES[size] >= remaining) || null;
  }

  /**
   * "Give until [level]": the largest candy that fits without overshooting, repeated, then the smallest that covers the
   * rest. It may overshoot the target level and stops at 100. The caller saves.
   * @returns { ok: true, level, given: { size: count }, ranOut } (ranOut: the bag emptied before the target)
   *        | { ok: false, error: 'none' | 'max' }
   */
  function giveUntil(save, uid, targetLevel) {
    const copy = copyOf(save, uid);
    if (!copy) return { ok: false, error: 'none' };
    const dex = copy.speciesID,
      target = Math.max(1, Math.min(maxLevel(), Math.floor(targetLevel) || 1)),
      given = {};
    let xp = copy.candyXp,
      ranOut = false;
    if (levelFor(dex, xp) >= maxLevel()) return { ok: false, error: 'max' };
    while (levelFor(dex, xp) < target) {
      const size = nextSizeFor(bagOf(save), xpForLevel(dex, target) - xp);
      if (!size) {
        ranOut = true;
        break;
      }
      const result = give(save, uid, size);
      if (!result.ok) break;
      xp = result.xp;
      given[size] = (given[size] || 0) + 1;
    }
    return { ok: true, level: levelFor(dex, xp), given, ranOut };
  }

  return {
    SIZES,
    SIZE_ORDER,
    SIZE_LABEL,
    bagOf,
    bank,
    saveAndAnnounce,
    clean,
    xpForLevel,
    levelFor,
    give,
    giveUntil,
  };
})();
