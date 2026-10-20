/* ============ items.js, equippable items (three tiers) ============
 * Tiers (DECISIONS 2026-10-20, Item rework):
 *   pokemon  each Pokemon holds ONE. Its effect works only while that Pokemon is the active one
 *            (every roster member is its own Player, so on() only touches the holder's stats, and
 *            hasItem() ignores a benched holder). Found items go to the active Pokemon.
 *   run      very rare, shared by the whole team for the whole run, kept in a small grid
 *            (1 slot at the start of the full game, meta progression unlocks more, max 4).
 *            on()/off() are applied to EVERY roster member (G.Game owns that).
 *   ground   activates on contact, never stored (heal berry pickups for now; content comes in F3).
 *
 *   on(p)   equip it (what it does while carried)
 *   off(p)  unequip it (undoes what on did)
 * Items that react to something (lethal hit, damage dealt...) are checked with p.hasItem(id).
 * Stat items use their own multiplier (atkMul, spdMul, cdMul, xpMul, coinMul), separate from the additive
 * increase pool, so numbers stay as they were.
 */
G.Items = (() => {
  const LIST = [
    { id: 'leftovers', tier: 'pokemon', name: 'Leftovers', desc: 'Recover 1.5% of your max HP per second.',
      on: p => { p.regenFlat += p.maxHp * 0.015; p._itemRegen = p.maxHp * 0.015; },
      off: p => { p.regenFlat -= p._itemRegen || 0; } },
    { id: 'choiceband', tier: 'pokemon', name: 'Choice Band', desc: '+40% damage, but you cannot switch moves.',
      on: p => { p.atkMul *= 1.4; }, off: p => { p.atkMul /= 1.4; } },
    { id: 'quickclaw', tier: 'pokemon', name: 'Quick Claw', desc: '-20% cooldown on all your moves.',
      on: p => { p.cdMul *= 0.8; }, off: p => { p.cdMul /= 0.8; } },
    { id: 'focussash', tier: 'pokemon', name: 'Focus Sash', desc: 'A hit that would KO you leaves you at 1 HP instead (once every 60 s).',
      on: () => {}, off: () => {} },
    { id: 'shellbell', tier: 'pokemon', name: 'Shell Bell', desc: 'Recover HP from the damage you deal.',
      on: () => {}, off: () => {} },
    { id: 'lifeorb', tier: 'pokemon', name: 'Life Orb', desc: '+30% damage, but each attack costs you a little HP.',
      on: p => { p.atkMul *= 1.3; }, off: p => { p.atkMul /= 1.3; } },
    { id: 'choicescarf', tier: 'pokemon', name: 'Choice Scarf', desc: '+35% speed.',
      on: p => { p.spdMul *= 1.35; }, off: p => { p.spdMul /= 1.35; } },
    { id: 'rockyhelmet', tier: 'pokemon', name: 'Rocky Helmet', desc: 'Foes that hit you in melee take damage.',
      on: () => {}, off: () => {} },
    { id: 'assaultvest', tier: 'pokemon', name: 'Assault Vest', desc: '+20% damage reduction.',
      on: p => { p.dmgReduce += 0.2; }, off: p => { p.dmgReduce -= 0.2; } },
    // ---- run tier (whole team, whole run) ----
    { id: 'amuletcoin', tier: 'run', name: 'Amulet Coin', desc: '+50% PokéCoins at the end of the run.',
      on: p => { p.coinMul *= 1.5; }, off: p => { p.coinMul /= 1.5; } },
    { id: 'luckyegg', tier: 'run', name: 'Lucky Egg', desc: '+30% experience.',
      on: p => { p.xpMul *= 1.3; }, off: p => { p.xpMul /= 1.3; } }
  ];
  const BY = {};
  for (const it of LIST) BY[it.id] = it;

  /** Run slots a save owns. Absent in old saves, so it defaults to 1 (the full game starts with one slot). */
  const RUN_SLOTS_DEFAULT = 1, RUN_SLOTS_MAX = 4;
  function runSlots(save) {
    const n = (save && save.runSlots) | 0;
    return Math.max(RUN_SLOTS_DEFAULT, Math.min(RUN_SLOTS_MAX, n || RUN_SLOTS_DEFAULT));
  }

  /** Placeholder chance that a drop source gives a RUN item instead of a Pokemon item (tune later). */
  const RUN_CHANCE = { gym: 0.10, boss: 0.05 };

  /** A random item of `tier`, different from `except` (the one already carried). */
  function roll(except, tier = 'pokemon') {
    const pool = LIST.filter(i => i.tier === tier && i.id !== except);
    return pool.length ? G.U.pick(pool).id : null;
  }

  /**
   * An item for a drop source: usually a Pokemon item, with the source's RUN_CHANCE of a run item
   * (skipped when the team already holds every run item).
   * @param src     'gym' | 'boss' | anything else (never a run item)
   * @param owned   run item ids already held
   */
  function rollFor(src, owned = []) {
    if (Math.random() < (RUN_CHANCE[src] || 0)) {
      const pool = LIST.filter(i => i.tier === 'run' && !owned.includes(i.id));
      if (pool.length) return G.U.pick(pool).id;
    }
    return roll();
  }

  return { LIST, BY, roll, rollFor, runSlots, RUN_CHANCE, RUN_SLOTS_DEFAULT, RUN_SLOTS_MAX };
})();
