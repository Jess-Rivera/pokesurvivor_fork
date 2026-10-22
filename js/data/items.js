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
    { id: 'amuletcoin', tier: 'run', name: 'Amulet Coin', icon: 'ps:hold-item.amulet-coin', desc: '+50% PokéCoins at the end of the run.',
      on: p => { p.coinMul *= 1.5; }, off: p => { p.coinMul /= 1.5; } },
    { id: 'luckyegg', tier: 'run', name: 'Lucky Egg', icon: 'ps:hold-item.lucky-egg', desc: '+30% experience.',
      on: p => { p.xpMul *= 1.3; }, off: p => { p.xpMul /= 1.3; } },
    // ---- F3c run items (2026-10-21): team-wide, whole-run. See docs/RUN-ITEM-THINK-DOC.md. ----
    { id: 'sharpscissors', tier: 'run', name: 'Sharp Scissors', icon: 'ps:hold-item.grip-claw', desc: 'The lower your team HP, the faster you move (up to 2x). Needs a team of 3+.',
      on: p => { p.sharpScissors = true; }, off: p => { p.sharpScissors = false; } },
    { id: 'brassknuckles', tier: 'run', name: 'Brass Knuckles', icon: 'ps:hold-item.lucky-punch', desc: 'The lower your team HP, the more damage you deal (up to 2x). Needs a team of 3+.',
      on: p => { p.brassKnuckles = true; }, off: p => { p.brassKnuckles = false; } },
    { id: 'snowballbadge', tier: 'run', name: 'Snowball Badge', icon: 'ps:hold-item.snowball', desc: 'Every kill feeds the Snowball: +damage for the total HP of everything you have slain.',
      on: p => { p.snowball = true; }, off: p => { p.snowball = false; } },
    { id: 'redo', tier: 'run', name: 'Re-Do', icon: 'ps:hold-item.soul-dew', desc: 'When your last Pokemon faints, revive your whole team to full HP. Once per run.',
      on: p => { p.redo = true; }, off: p => { p.redo = false; } },
    { id: 'pikachustear', tier: 'run', name: "Pikachu's Tear", icon: 'ps:hold-item.light-ball', desc: 'Each fainted teammate boosts your damage and speed by 1.1x.',
      on: p => { p.pikaTear = true; }, off: p => { p.pikaTear = false; } },
    // Power Stones: one per type; group 'stone' = only ONE may ever be carried (mutual exclusion, enforced in game.equipRun).
    { id: 'normalstone', tier: 'run', name: 'Normal Stone', icon: 'ps:gem.normal', group: 'stone', desc: 'Your Normal attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'normal'; }, off: p => { if (p.stoneType === 'normal') p.stoneType = null; } },
    { id: 'firestone', tier: 'run', name: 'Flame Stone', icon: 'ps:gem.fire', group: 'stone', desc: 'Your Fire attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'fire'; }, off: p => { if (p.stoneType === 'fire') p.stoneType = null; } },
    { id: 'waterstone', tier: 'run', name: 'Wave Stone', icon: 'ps:gem.water', group: 'stone', desc: 'Your Water attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'water'; }, off: p => { if (p.stoneType === 'water') p.stoneType = null; } },
    { id: 'electricstone', tier: 'run', name: 'Lightning Stone', icon: 'ps:gem.electric', group: 'stone', desc: 'Your Electric attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'electric'; }, off: p => { if (p.stoneType === 'electric') p.stoneType = null; } },
    { id: 'grassstone', tier: 'run', name: 'Leaf Stone', icon: 'ps:gem.grass', group: 'stone', desc: 'Your Grass attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'grass'; }, off: p => { if (p.stoneType === 'grass') p.stoneType = null; } },
    { id: 'icestone', tier: 'run', name: 'Frost Stone', icon: 'ps:gem.ice', group: 'stone', desc: 'Your Ice attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'ice'; }, off: p => { if (p.stoneType === 'ice') p.stoneType = null; } },
    { id: 'fightingstone', tier: 'run', name: 'Fist Stone', icon: 'ps:gem.fighting', group: 'stone', desc: 'Your Fighting attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'fighting'; }, off: p => { if (p.stoneType === 'fighting') p.stoneType = null; } },
    { id: 'poisonstone', tier: 'run', name: 'Venom Stone', icon: 'ps:gem.poison', group: 'stone', desc: 'Your Poison attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'poison'; }, off: p => { if (p.stoneType === 'poison') p.stoneType = null; } },
    { id: 'groundstone', tier: 'run', name: 'Earth Stone', icon: 'ps:gem.ground', group: 'stone', desc: 'Your Ground attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'ground'; }, off: p => { if (p.stoneType === 'ground') p.stoneType = null; } },
    { id: 'flyingstone', tier: 'run', name: 'Gale Stone', icon: 'ps:gem.flying', group: 'stone', desc: 'Your Flying attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'flying'; }, off: p => { if (p.stoneType === 'flying') p.stoneType = null; } },
    { id: 'psychicstone', tier: 'run', name: 'Mind Stone', icon: 'ps:gem.psychic', group: 'stone', desc: 'Your Psychic attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'psychic'; }, off: p => { if (p.stoneType === 'psychic') p.stoneType = null; } },
    { id: 'bugstone', tier: 'run', name: 'Bug Stone', icon: 'ps:gem.bug', group: 'stone', desc: 'Your Bug attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'bug'; }, off: p => { if (p.stoneType === 'bug') p.stoneType = null; } },
    { id: 'rockstone', tier: 'run', name: 'Rock Stone', icon: 'ps:gem.rock', group: 'stone', desc: 'Your Rock attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'rock'; }, off: p => { if (p.stoneType === 'rock') p.stoneType = null; } },
    { id: 'ghoststone', tier: 'run', name: 'Spirit Stone', icon: 'ps:gem.ghost', group: 'stone', desc: 'Your Ghost attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'ghost'; }, off: p => { if (p.stoneType === 'ghost') p.stoneType = null; } },
    { id: 'dragonstone', tier: 'run', name: 'Dragon Stone', icon: 'ps:gem.dragon', group: 'stone', desc: 'Your Dragon attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'dragon'; }, off: p => { if (p.stoneType === 'dragon') p.stoneType = null; } },
    { id: 'darkstone', tier: 'run', name: 'Shadow Stone', icon: 'ps:gem.dark', group: 'stone', desc: 'Your Dark attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'dark'; }, off: p => { if (p.stoneType === 'dark') p.stoneType = null; } },
    { id: 'steelstone', tier: 'run', name: 'Steel Stone', icon: 'ps:gem.steel', group: 'stone', desc: 'Your Steel attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'steel'; }, off: p => { if (p.stoneType === 'steel') p.stoneType = null; } },
    { id: 'fairystone', tier: 'run', name: 'Fae Stone', icon: 'ps:gem.fairy', group: 'stone', desc: 'Your Fairy attacks ignore enemy resistance and immunity. Only one Stone at a time.',
      on: p => { p.stoneType = 'fairy'; }, off: p => { if (p.stoneType === 'fairy') p.stoneType = null; } },
  ];
  const BY = {};
  for (const it of LIST) BY[it.id] = it;

  /** Run slots a save owns. Absent in old saves, so it defaults to 1 (the full game starts with one slot). */
  const RUN_SLOTS_DEFAULT = 1, RUN_SLOTS_MAX = 4;
  function runSlots(save) {
    const n = (save && save.runSlots) | 0;
    return Math.max(RUN_SLOTS_DEFAULT, Math.min(RUN_SLOTS_MAX, n || RUN_SLOTS_DEFAULT));
  }

  // ---- F3d-2: unlocked team items + the pre-run loadout. save.teamItems { id: { at, from } } (absent in old saves, filled by db.js migrate),
  // save.teamLoadout [id, ...] in slot order. "Team items" is the player-facing name for the run tier. ----
  const STARTER_TEAM_ITEMS = ['luckyegg', 'amuletcoin'];
  const isTeamItem = id => !!(BY[id] && BY[id].tier === 'run');
  function unlocked(save, id) { return !!(save && save.teamItems && save.teamItems[id]); }
  /** Permanently unlock a team item on `save`. True only the first time (so the caller can toast it). */
  function unlock(save, id, from = 'found') {
    if (!save || !isTeamItem(id)) return false;
    const t = save.teamItems = save.teamItems || {};
    if (t[id]) return false;
    t[id] = { at: Date.now(), from };
    return true;
  }
  function grantStarters(save) { for (const id of STARTER_TEAM_ITEMS) unlock(save, id, 'starter'); }
  /**
   * Clean save.teamLoadout IN PLACE and return it. Slots KEEP THEIR POSITION (an empty slot in the middle is null): only unlocked team
   * items stay, no duplicates, at most one per group (one Power Stone), nothing past the unlocked run slots, trailing empties trimmed.
   * Callers that equip it (run start) skip the nulls.
   */
  function cleanLoadout(save) {
    const raw = Array.isArray(save.teamLoadout) ? save.teamLoadout : [];
    const cap = runSlots(save), out = [], groups = {};
    for (let k = 0; k < Math.min(raw.length, cap); k++) {
      const id = raw[k];
      let keep = isTeamItem(id) && unlocked(save, id) && !out.includes(id);
      if (keep) { const g = BY[id].group; if (g) { if (groups[g]) keep = false; else groups[g] = true; } }
      out.push(keep ? id : null);
    }
    while (out.length && out[out.length - 1] == null) out.pop();
    save.teamLoadout = out;
    return out;
  }

  // ---- F3d-3: Shop prices (PLACEHOLDERS, tune here). Team items are a flat price (a bad-luck valve against the rare drops); slots are bought in order. ----
  const TEAM_ITEM_PRICE = 100000;
  const SLOT_PRICES = { 2: 9000, 3: 23000, 4: 60000 };    // price of owning the Nth team item slot (slot 1 is free)
  const slotPrice = n => SLOT_PRICES[n] || null;
  /** Buy a team item with PokeCoins: -> { ok:true } or { ok:false, error:'unknown'|'owned'|'poor' }. Unlocks it for good (the Inventory equips it). */
  function buyTeamItem(save, id) {
    if (!save || !isTeamItem(id)) return { ok: false, error: 'unknown' };
    if (unlocked(save, id)) return { ok: false, error: 'owned' };
    if (!(save.coins >= TEAM_ITEM_PRICE)) return { ok: false, error: 'poor' };
    save.coins -= TEAM_ITEM_PRICE;
    unlock(save, id, 'shop');
    return { ok: true };
  }
  /** Buy the NEXT team item slot (slots go in order): -> { ok:true, slots } or { ok:false, error:'max'|'poor' }. */
  function buySlot(save) {
    if (!save) return { ok: false, error: 'unknown' };
    const n = runSlots(save);
    if (n >= RUN_SLOTS_MAX) return { ok: false, error: 'max' };
    const price = slotPrice(n + 1);
    if (!(save.coins >= price)) return { ok: false, error: 'poor' };
    save.coins -= price;
    save.runSlots = n + 1;
    return { ok: true, slots: n + 1 };
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

  // ---- F3c run-item shared math (team-wide; read by Player.runSpeedMul / runDmgMul) ----
  const HP_SCALE_MIN = 0.10;          // at or below 10% team HP, the HP-scaled bonus is maxed (2x)
  const HP_TEAM_MIN = 3;              // Sharp Scissors / Brass Knuckles need a roster of 3+ (fixed at run start)
  const SNOWBALL_DIV = 10000;         // Snowball: +damage = total killed HP / this (TUNE)
  const FAINT_STEP = 1.1;             // Pikachu's Tear: x this per fainted teammate
  let snowballHp = 0;                 // total max HP of enemies killed this run (reset in resetRun)

  /** The run roster. G.Game.roster is a GETTER that returns the array (game.js), not a function; tolerate both so a test stub can use either. */
  function rosterOf() {
    const r = G.Game && G.Game.roster;
    return (typeof r === 'function' ? r() : r) || [];
  }
  /** Team-HP-scaled multiplier 1.0 (full) -> 2.0 (<=10%), linear; OFF (1.0) unless the roster has HP_TEAM_MIN+ members. */
  function teamHpMul(pl) {
    const roster = rosterOf();
    if (roster.length < HP_TEAM_MIN) return 1;
    let hp = 0, max = 0;
    for (const f of roster) { hp += Math.max(0, f.hp); max += f.maxHp; }
    if (max <= 0) return 1;
    const frac = hp / max;
    if (frac >= 1) return 1;
    if (frac <= HP_SCALE_MIN) return 2;
    return 1 + (1 - frac) / (1 - HP_SCALE_MIN);      // 100% -> 1.0, 10% -> 2.0, linear between
  }
  /** Pikachu's Tear: FAINT_STEP ^ (number of fainted teammates). */
  function faintMul(pl) {
    const roster = rosterOf();
    let n = 0; for (const f of roster) if (f.dead) n++;
    return Math.pow(FAINT_STEP, n);
  }
  /** Snowball Badge: x (1 + total killed HP / SNOWBALL_DIV). */
  function snowballMul() { return 1 + snowballHp / SNOWBALL_DIV; }
  /** Called from enemy.die() when a Snowball Badge is held by the team. */
  function snowballAdd(hp) { snowballHp += Math.max(0, hp || 0); }
  function resetRun() { snowballHp = 0; }

  return { LIST, BY, roll, rollFor, runSlots, STARTER_TEAM_ITEMS, unlocked, unlock, grantStarters, cleanLoadout, TEAM_ITEM_PRICE, SLOT_PRICES, slotPrice, buyTeamItem, buySlot, RUN_CHANCE, RUN_SLOTS_DEFAULT, RUN_SLOTS_MAX,
           teamHpMul, faintMul, snowballMul, snowballAdd, resetRun };
})();
