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
 * icon: a Pokesprite cell ('ps:<category>.<name>', see data/pokesprite-index.js), drawn the same way the
 *       ground items are. Pokemon-tier held items all carry one (F3b, 2026-10-21).
 */
G.Items = (() => {
  const LIST = [
    { id: 'leftovers', tier: 'pokemon', name: 'Leftovers', icon: 'ps:hold-item.leftovers', desc: 'Recover 1.5% of your max HP per second.',
      on: p => { p.regenFlat += p.maxHp * 0.015; p._itemRegen = p.maxHp * 0.015; },
      off: p => { p.regenFlat -= p._itemRegen || 0; } },
    { id: 'choiceband', tier: 'pokemon', name: 'Choice Band', icon: 'ps:hold-item.choice-band', desc: '+40% damage, but you cannot switch moves.',
      on: p => { p.atkMul *= 1.4; }, off: p => { p.atkMul /= 1.4; } },
    { id: 'quickclaw', tier: 'pokemon', name: 'Quick Claw', icon: 'ps:hold-item.quick-claw', desc: '-20% cooldown on all your moves.',
      on: p => { p.cdMul *= 0.8; }, off: p => { p.cdMul /= 0.8; } },
    { id: 'focussash', tier: 'pokemon', name: 'Focus Sash', icon: 'ps:hold-item.focus-sash', desc: 'A hit that would KO you leaves you at 1 HP instead (once every 60 s).',
      on: () => {}, off: () => {} },
    { id: 'shellbell', tier: 'pokemon', name: 'Shell Bell', icon: 'ps:hold-item.shell-bell', desc: 'Recover HP from the damage you deal.',
      on: () => {}, off: () => {} },
    { id: 'lifeorb', tier: 'pokemon', name: 'Life Orb', icon: 'ps:hold-item.life-orb', desc: '+30% damage, but each attack costs you a little HP.',
      on: p => { p.atkMul *= 1.3; }, off: p => { p.atkMul /= 1.3; } },
    { id: 'choicescarf', tier: 'pokemon', name: 'Choice Scarf', icon: 'ps:hold-item.choice-scarf', desc: '+35% speed.',
      on: p => { p.spdMul *= 1.35; }, off: p => { p.spdMul /= 1.35; } },
    { id: 'rockyhelmet', tier: 'pokemon', name: 'Rocky Helmet', icon: 'ps:hold-item.rocky-helmet', desc: 'Foes that hit you in melee take damage.',
      on: () => {}, off: () => {} },
    { id: 'assaultvest', tier: 'pokemon', name: 'Assault Vest', icon: 'ps:hold-item.assault-vest', desc: '+20% damage reduction.',
      on: p => { p.dmgReduce += 0.2; }, off: p => { p.dmgReduce -= 0.2; } },
    // ---- F3b imports (2026-10-21): stat/crit multipliers and two combat-site conditionals ----
    { id: 'muscleband', tier: 'pokemon', name: 'Muscle Band', icon: 'ps:hold-item.muscle-band', desc: '+10% damage.',
      on: p => { p.atkMul *= 1.1; }, off: p => { p.atkMul /= 1.1; } },
    { id: 'wiseglasses', tier: 'pokemon', name: 'Wise Glasses', icon: 'ps:hold-item.wise-glasses', desc: '+10% damage.',
      on: p => { p.atkMul *= 1.1; }, off: p => { p.atkMul /= 1.1; } },
    { id: 'scopelens', tier: 'pokemon', name: 'Scope Lens', icon: 'ps:hold-item.scope-lens', desc: '+5% critical hit chance.',
      on: p => { p.critChance += 0.05; }, off: p => { p.critChance -= 0.05; } },
    { id: 'razorclaw', tier: 'pokemon', name: 'Razor Claw', icon: 'ps:evo-item.razor-claw', desc: '+5% critical hit chance.',
      on: p => { p.critChance += 0.05; }, off: p => { p.critChance -= 0.05; } },
    { id: 'expertbelt', tier: 'pokemon', name: 'Expert Belt', icon: 'ps:hold-item.expert-belt', desc: '+20% damage on super effective hits.',
      on: p => { p.expertBelt = true; }, off: p => { p.expertBelt = false; } },
    { id: 'bigroot', tier: 'pokemon', name: 'Big Root', icon: 'ps:hold-item.big-root', desc: '+30% HP recovered from draining moves.',
      on: p => { p.bigRoot = true; }, off: p => { p.bigRoot = false; } },
    { id: 'blacksludge', tier: 'pokemon', name: 'Black Sludge', icon: 'ps:hold-item.black-sludge', desc: 'Poison types recover 1.5% max HP per second; others lose a little.',
      on: p => {
        if (p.myTypes.includes('poison')) { p.regenFlat += p.maxHp * 0.015; p._sludgeRegen = p.maxHp * 0.015; }
        else { p.sludgeHurt = true; }
      },
      off: p => { p.regenFlat -= p._sludgeRegen || 0; p._sludgeRegen = 0; p.sludgeHurt = false; } },
    { id: 'widelens', tier: 'pokemon', name: 'Wide Lens', icon: 'ps:hold-item.wide-lens', desc: '+15% area on all your moves.',
      on: p => { p.moveRadiusMul = (p.moveRadiusMul || 1) * 1.15; },
      off: p => { p.moveRadiusMul = (p.moveRadiusMul || 1) / 1.15; } },
    { id: 'zoomlens', tier: 'pokemon', name: 'Zoom Lens', icon: 'ps:hold-item.zoom-lens', desc: '-50% area but +20% damage on all your moves.',
      on: p => { p.moveRadiusMul = (p.moveRadiusMul || 1) * 0.5; p.atkMul *= 1.2; },
      off: p => { p.moveRadiusMul = (p.moveRadiusMul || 1) / 0.5; p.atkMul /= 1.2; } },
    // ---- F3b type-damage items (2026-10-21): one per type, shared pl.typeBoost hook read at the hit sites in combat.js ----
    { id: 'silkscarf', tier: 'pokemon', name: 'Silk Scarf', icon: 'ps:hold-item.silk-scarf', desc: '+20% Normal-type move damage.',
      on: p => { p.typeBoost = 'normal'; }, off: p => { if (p.typeBoost === 'normal') p.typeBoost = null; } },
    { id: 'charcoal', tier: 'pokemon', name: 'Charcoal', icon: 'ps:hold-item.charcoal', desc: '+20% Fire-type move damage.',
      on: p => { p.typeBoost = 'fire'; }, off: p => { if (p.typeBoost === 'fire') p.typeBoost = null; } },
    { id: 'mysticwater', tier: 'pokemon', name: 'Mystic Water', icon: 'ps:hold-item.mystic-water', desc: '+20% Water-type move damage.',
      on: p => { p.typeBoost = 'water'; }, off: p => { if (p.typeBoost === 'water') p.typeBoost = null; } },
    { id: 'magnet', tier: 'pokemon', name: 'Magnet', icon: 'ps:hold-item.magnet', desc: '+20% Electric-type move damage.',
      on: p => { p.typeBoost = 'electric'; }, off: p => { if (p.typeBoost === 'electric') p.typeBoost = null; } },
    { id: 'miracleseed', tier: 'pokemon', name: 'Miracle Seed', icon: 'ps:hold-item.miracle-seed', desc: '+20% Grass-type move damage.',
      on: p => { p.typeBoost = 'grass'; }, off: p => { if (p.typeBoost === 'grass') p.typeBoost = null; } },
    { id: 'nevermeltice', tier: 'pokemon', name: 'Never-Melt Ice', icon: 'ps:hold-item.never-melt-ice', desc: '+20% Ice-type move damage.',
      on: p => { p.typeBoost = 'ice'; }, off: p => { if (p.typeBoost === 'ice') p.typeBoost = null; } },
    { id: 'blackbelt', tier: 'pokemon', name: 'Black Belt', icon: 'ps:hold-item.black-belt', desc: '+20% Fighting-type move damage.',
      on: p => { p.typeBoost = 'fighting'; }, off: p => { if (p.typeBoost === 'fighting') p.typeBoost = null; } },
    { id: 'poisonbarb', tier: 'pokemon', name: 'Poison Barb', icon: 'ps:hold-item.poison-barb', desc: '+20% Poison-type move damage.',
      on: p => { p.typeBoost = 'poison'; }, off: p => { if (p.typeBoost === 'poison') p.typeBoost = null; } },
    { id: 'softsand', tier: 'pokemon', name: 'Soft Sand', icon: 'ps:hold-item.soft-sand', desc: '+20% Ground-type move damage.',
      on: p => { p.typeBoost = 'ground'; }, off: p => { if (p.typeBoost === 'ground') p.typeBoost = null; } },
    { id: 'sharpbeak', tier: 'pokemon', name: 'Sharp Beak', icon: 'ps:hold-item.sharp-beak', desc: '+20% Flying-type move damage.',
      on: p => { p.typeBoost = 'flying'; }, off: p => { if (p.typeBoost === 'flying') p.typeBoost = null; } },
    { id: 'twistedspoon', tier: 'pokemon', name: 'Twisted Spoon', icon: 'ps:hold-item.twisted-spoon', desc: '+20% Psychic-type move damage.',
      on: p => { p.typeBoost = 'psychic'; }, off: p => { if (p.typeBoost === 'psychic') p.typeBoost = null; } },
    { id: 'silverpowder', tier: 'pokemon', name: 'Silver Powder', icon: 'ps:hold-item.silver-powder', desc: '+20% Bug-type move damage.',
      on: p => { p.typeBoost = 'bug'; }, off: p => { if (p.typeBoost === 'bug') p.typeBoost = null; } },
    { id: 'hardstone', tier: 'pokemon', name: 'Hard Stone', icon: 'ps:hold-item.hard-stone', desc: '+20% Rock-type move damage.',
      on: p => { p.typeBoost = 'rock'; }, off: p => { if (p.typeBoost === 'rock') p.typeBoost = null; } },
    { id: 'spelltag', tier: 'pokemon', name: 'Spell Tag', icon: 'ps:hold-item.spell-tag', desc: '+20% Ghost-type move damage.',
      on: p => { p.typeBoost = 'ghost'; }, off: p => { if (p.typeBoost === 'ghost') p.typeBoost = null; } },
    { id: 'dragonfang', tier: 'pokemon', name: 'Dragon Fang', icon: 'ps:hold-item.dragon-fang', desc: '+20% Dragon-type move damage.',
      on: p => { p.typeBoost = 'dragon'; }, off: p => { if (p.typeBoost === 'dragon') p.typeBoost = null; } },
    { id: 'blackglasses', tier: 'pokemon', name: 'Black Glasses', icon: 'ps:hold-item.black-glasses', desc: '+20% Dark-type move damage.',
      on: p => { p.typeBoost = 'dark'; }, off: p => { if (p.typeBoost === 'dark') p.typeBoost = null; } },
    { id: 'metalcoat', tier: 'pokemon', name: 'Metal Coat', icon: 'ps:hold-item.metal-coat', desc: '+20% Steel-type move damage.',
      on: p => { p.typeBoost = 'steel'; }, off: p => { if (p.typeBoost === 'steel') p.typeBoost = null; } },
    { id: 'pixieplate', tier: 'pokemon', name: 'Pixie Plate', icon: 'ps:plate.pixie', desc: '+20% Fairy-type move damage.',
      on: p => { p.typeBoost = 'fairy'; }, off: p => { if (p.typeBoost === 'fairy') p.typeBoost = null; } },
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
