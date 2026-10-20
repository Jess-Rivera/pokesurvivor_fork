/* ============ moves.js — move catalog ============
 *
 * kind (comportamiento, implementado en systems/combat.js):
 *   projectile  fires `count` projectiles at the nearest enemy
 *   melee       an arc hit around the Pokemon
 *   beam        a straight beam that pierces everything it catches
 *   orbit       orbs that spin around while the move is active
 *   nova        a radial burst in every direction
 *   aura        a continuous damage circle around
 *   buff        boosts the Pokemon itself (stackable, expires)
 *   ---- since 2026-10-10 (same graphics, a different way to play) ----
 *   boomerang   goes out toward the enemy and returns to you, hitting on the way out and back
 *   chain       hits one and jumps to the `count` nearest next ones
 *   mine        mines on the ground that burst when stepped on
 *   meteor      `count` meteors fall on nearby enemies (the shadow warns)
 *   turret      leaves something that fires on its own for `dur` seconds
 *   dash        you cross toward the enemy hitting the whole path (taking no damage)
 *   trail       you leave puddles that damage whatever steps on them
 *   cone        muchos disparos cortos en abanico (aliento, chorro...)
 *
 * Only the ACTIVE move is executed. It is changed with 1-4 / Q / E.
 *
 * The icon is not stored here: G.Icons composes it (type emblem +
 * family badge), see ui/icons.js.
 *
 * Upgrades are mechanic cards (data/mechanics.js): an instance keeps `mods = { mechanicId: stacks }`
 * and derive() rebuilds its live fields from the base definition. Moves have no level.
 */
(() => {
  const RAW = [
    // ---------------- NORMAL (pool common to all) ----------------
    { id: 'tackle', name: 'Tackle', type: 'normal', kind: 'melee', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage with no additional effect.',
      cd: 0.50, dmg: 40, radius: 48, arc: 1.7, knock: 90 },

    { id: 'quick-attack', name: 'Quick Attack', type: 'normal', kind: 'dash', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage with no additional effect.',
      cd: 0.75, dmg: 40, radius: 110, width: 34, knock: 40 },

    { id: 'swords-dance', name: 'Swords Dance', type: 'normal', kind: 'buff', cat: 'status', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0, dmg: 0, stageN: 2,
      desc: 'Raises the user\'s Attack by two stages.',
      cd: 0.85, stat: 'atk', amount: 0.13, dur: 7, stacks: 5 },

    { id: 'agility', name: 'Agility', type: 'normal', kind: 'buff', cat: 'status', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0, dmg: 0, stageN: 2,
      desc: 'Raises the user\'s Speed by two stages.',
      cd: 0.85, stat: 'spd', amount: 0.10, dur: 7, stacks: 5 },

    { id: 'harden', name: 'Harden', type: 'normal', kind: 'buff', cat: 'status', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0, dmg: 0,
      desc: 'Raises the user\'s Defense by one stage.',
      cd: 0.85, stat: 'def', amount: 0.07, dur: 7, stacks: 5 },

    // ---------------- FUEGO ----------------
    { id: 'ember', name: 'Ember', type: 'fire', kind: 'projectile', cat: 'special', ailment: 'burn', ailmentChance: 10, flinch: 0, statChance: 0,
      desc: 'Has a chance to burn the target.',
      cd: 0.52, dmg: 40, speed: 310, count: 1, spread: 0.12, pierce: 0, life: 1.6, size: 7, burn: 1 },

    { id: 'flamethrower', name: 'Flamethrower', type: 'fire', kind: 'cone', cat: 'special', ailment: 'burn', ailmentChance: 10, flinch: 0, statChance: 0,
      desc: 'Has a chance to burn the target.',
      cd: 0.70, dmg: 90, count: 7, arc: 0.9, speed: 380, life: 0.42, size: 6, pierce: 1, burn: 1 },

    { id: 'fire-spin', name: 'Fire Spin', type: 'fire', kind: 'orbit', cat: 'special', ailment: 'burn', ailmentChance: 100, strip: true, burnHalf: true, flinch: 0, statChance: 0,
      desc: 'Strips every stat boost from the target and burns it for half the usual time. Fire types are immune to the burn, not to the strip.',
      cd: 0.30, dmg: 35, count: 3, radius: 62, speed: 2.4, size: 9 },

    { id: 'heat-wave', name: 'Heat Wave', type: 'fire', kind: 'nova', cat: 'special', ailment: 'burn', ailmentChance: 10, flinch: 0, statChance: 0,
      desc: 'Has a chance to burn the target.',
      cd: 1.25, dmg: 95, speed: 250, count: 10, pierce: 1, life: 1.1, size: 7, burn: 1 },

    // ---------------- AGUA ----------------
    { id: 'water-gun', name: 'Water Gun', type: 'water', kind: 'projectile', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage with no additional effect.',
      cd: 0.44, dmg: 40, speed: 350, count: 1, spread: 0.10, pierce: 1, life: 1.5, size: 6 },

    { id: 'bubble', name: 'Bubble', type: 'water', kind: 'nova', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 10, stage: { stat: 'spe', n: -1 },
      desc: 'Has a chance to lower the target\'s Speed by one stage.',
      cd: 1.00, dmg: 40, speed: 210, count: 8, pierce: 0, life: 1.3, size: 8, slow: 0.45 },

    { id: 'hydro-pump', name: 'Hydro Pump', type: 'water', kind: 'beam', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage with no additional effect.',
      cd: 1.50, dmg: 110, radius: 250, width: 30 },

    { id: 'aqua-ring', name: 'Aqua Ring', type: 'water', kind: 'buff', cat: 'status', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0, dmg: 0,
      desc: 'Restores 1/16 of the user\'s max HP each turn.',
      cd: 0.90, stat: 'regen', amount: 1.6, dur: 8, stacks: 4 },

    // ---------------- PLANTA ----------------
    { id: 'vine-whip', name: 'Vine Whip', type: 'grass', kind: 'melee', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage with no additional effect.',
      cd: 0.62, dmg: 45, radius: 68, arc: 1.3, knock: 60 },

    { id: 'razor-leaf', name: 'Razor Leaf', type: 'grass', kind: 'boomerang', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Has an increased chance for a critical hit.',
      cd: 0.90, dmg: 55, speed: 330, count: 2, spread: 0.5, radius: 210, size: 6 },

    { id: 'leaf-storm', name: 'Leaf Storm', type: 'grass', kind: 'orbit', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 100,
      desc: 'Lowers the user\'s Special Attack by two stages after inflicting damage.',
      cd: 0.26, dmg: 130, count: 4, radius: 74, speed: 2.6, size: 8 },

    // Giga Drain (slice D3): ONE heart-shaped shot (a former aura healed per enemy and was broken). Heals `drain` (50%) of the damage it
    // actually deals, UNCAPPED on purpose (Jess: leave it and see if it is broken; `drainCap` is still honoured if a move sets it). `fixed` keys can never take upgrade cards: always one shot, no pierce.
    { id: 'giga-drain', name: 'Giga Drain', type: 'grass', kind: 'projectile', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Drains half the damage inflicted to heal the user.',
      cd: 0.55, dmg: 75, speed: 290, count: 1, spread: 0, pierce: 0, life: 1.5, size: 8, drain: 0.5, fixed: ['count', 'pierce'] },

    // ---------------- ELECTRIC ----------------
    { id: 'thunder-shock', name: 'Thunder Shock', type: 'electric', kind: 'projectile', cat: 'special', ailment: 'paralysis', ailmentChance: 10, flinch: 0, statChance: 0,
      desc: 'Has a chance to paralyze the target.',
      cd: 0.40, dmg: 40, speed: 480, count: 1, spread: 0.08, pierce: 2, life: 1.1, size: 5 },

    { id: 'discharge', name: 'Discharge', type: 'electric', kind: 'aura', cat: 'special', ailment: 'paralysis', ailmentChance: 30, flinch: 0, statChance: 0,
      desc: 'Has a chance to paralyze the target.',
      cd: 0.45, dmg: 80, radius: 70 },

    { id: 'thunderbolt', name: 'Thunderbolt', type: 'electric', kind: 'chain', cat: 'special', ailment: 'paralysis', ailmentChance: 10, flinch: 0, statChance: 0,
      desc: 'Has a chance to paralyze the target.',
      cd: 0.95, dmg: 90, count: 4, radius: 140 },

    // ---------------- PSYCHIC ----------------
    // (2026-10-11: -22/-30% damage and they chase less; they filled the ranking.)
    { id: 'confusion', name: 'Confusion', type: 'psychic', kind: 'projectile', cat: 'special', ailment: 'confusion', ailmentChance: 10, flinch: 0, statChance: 0,
      desc: 'Has a chance to confuse the target.',
      cd: 0.58, dmg: 50, speed: 280, count: 1, spread: 0.1, pierce: 0, life: 2.2, size: 8, homing: 2.0 },

    { id: 'psybeam', name: 'Psybeam', type: 'psychic', kind: 'beam', cat: 'special', ailment: 'confusion', ailmentChance: 10, flinch: 0, statChance: 0,
      desc: 'Has a chance to confuse the target.',
      cd: 1.15, dmg: 65, radius: 215, width: 40 },

    { id: 'psychic', name: 'Psychic', type: 'psychic', kind: 'nova', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 10, stage: { stat: 'spd', n: -1 },
      desc: 'Has a chance to lower the target\'s Special Defense by one stage.',
      cd: 1.35, dmg: 90, speed: 230, count: 12, pierce: 1, life: 1.6, size: 7, homing: 1.0 },

    // ---------------- TIPOS SECUNDARIOS ----------------
    { id: 'sludge', name: 'Sludge', type: 'poison', kind: 'projectile', cat: 'special', ailment: 'poison', ailmentChance: 30, flinch: 0, statChance: 0,
      desc: 'Has a chance to poison the target.',
      cd: 0.60, dmg: 65, speed: 290, count: 1, spread: 0.12, pierce: 0, life: 1.5, size: 8, poison: 1 },

    { id: 'mud-shot', name: 'Mud Shot', type: 'ground', kind: 'nova', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 100, stage: { stat: 'spe', n: -1 },
      desc: 'Has a chance to lower the target\'s Speed by one stage.',
      cd: 1.10, dmg: 55, speed: 200, count: 7, pierce: 0, life: 1.0, size: 9, slow: 0.4 },

    { id: 'gust', name: 'Gust', type: 'flying', kind: 'orbit', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage and can hit Pokémon in the air.',
      cd: 0.26, dmg: 40, count: 3, radius: 72, speed: 2.8, size: 8, knock: 40 },

    { id: 'wing-attack', name: 'Wing Attack', type: 'flying', kind: 'melee', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage with no additional effect.',
      cd: 0.55, dmg: 60, radius: 58, arc: 1.9, knock: 70 },

    // ---------------- NORMAL (extra) ----------------
    { id: 'body-slam', name: 'Body Slam', type: 'normal', kind: 'melee', cat: 'physical', ailment: 'paralysis', ailmentChance: 30, flinch: 0, statChance: 0,
      desc: 'Has a chance to paralyze the target.',
      cd: 0.95, dmg: 85, radius: 46, arc: 2.2, knock: 140 },

    { id: 'hyper-voice', name: 'Hyper Voice', type: 'normal', kind: 'nova', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage with no additional effect.',
      cd: 1.15, dmg: 90, speed: 260, count: 9, pierce: 1, life: 0.9, size: 7 },

    // ---------------- VENENO (extra) ----------------
    { id: 'poison-sting', name: 'Poison Sting', type: 'poison', kind: 'projectile', cat: 'physical', ailment: 'poison', ailmentChance: 30, flinch: 0, statChance: 0,
      desc: 'Has a chance to poison the target.',
      cd: 0.34, dmg: 15, speed: 420, count: 1, spread: 0.08, pierce: 0, life: 1.0, size: 4, poison: 1 },

    { id: 'toxic', name: 'Toxic', type: 'poison', kind: 'trail', cat: 'status', ailment: 'poison', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Badly poisons the target, inflicting more damage every turn.',
      cd: 0.3, dmg: 0, radius: 26, dur: 3, poison: 2 },

    // ---------------- TIERRA (extra) ----------------
    { id: 'bulldoze', name: 'Bulldoze', type: 'ground', kind: 'aura', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 100, stage: { stat: 'spe', n: -1 },
      desc: 'Has a chance to lower the target\'s Speed by one stage.',
      cd: 0.7, dmg: 60, radius: 80, slow: 0.35 },

    // ---------------- BICHO ----------------
    { id: 'bug-bite', name: 'Bug Bite', type: 'bug', kind: 'melee', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'If target has a berry, inflicts double damage and uses the berry.',
      cd: 0.42, dmg: 60, radius: 44, arc: 1.6, knock: 40 },

    { id: 'string-shot', name: 'String Shot', type: 'bug', kind: 'mine', cat: 'status', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Lowers the target\'s Speed by two stages.',
      cd: 1.1, dmg: 0, count: 2, radius: 56, dur: 7, slow: 0.6 },

    { id: 'bug-buzz', name: 'Bug Buzz', type: 'bug', kind: 'aura', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 10, stage: { stat: 'spd', n: -1 },
      desc: 'Has a chance to lower the target\'s Special Defense by one stage.',
      cd: 0.45, dmg: 90, radius: 66 },

    // ---------------- ROCA ----------------
    { id: 'rock-throw', name: 'Rock Throw', type: 'rock', kind: 'projectile', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage with no additional effect.',
      cd: 0.7, dmg: 50, speed: 260, count: 1, spread: 0.12, pierce: 0, life: 1.4, size: 9, knock: 90 },

    { id: 'rock-slide', name: 'Rock Slide', type: 'rock', kind: 'meteor', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 30, statChance: 0,
      desc: 'Has a chance to make the target flinch.',
      cd: 1.3, dmg: 75, count: 3, radius: 46, knock: 50 },     // (12-10-2026: era 26; mataba el doble que la media)

    // ---------------- HIELO ----------------
    { id: 'ice-beam', name: 'Ice Beam', type: 'ice', kind: 'beam', cat: 'special', ailment: 'freeze', ailmentChance: 10, flinch: 0, statChance: 0,
      desc: 'Has a chance to freeze the target.',
      cd: 1.1, dmg: 90, radius: 220, width: 30, slow: 0.7 },

    { id: 'powder-snow', name: 'Powder Snow', type: 'ice', kind: 'aura', cat: 'special', ailment: 'freeze', ailmentChance: 10, flinch: 0, statChance: 0,
      desc: 'Has a chance to freeze the target.',
      cd: 0.55, dmg: 40, radius: 76, slow: 0.45 },

    // ---------------- LUCHA ----------------
    { id: 'karate-chop', name: 'Karate Chop', type: 'fighting', kind: 'melee', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Has an increased chance for a critical hit.',
      cd: 0.5, dmg: 50, radius: 50, arc: 1.2, knock: 110 },

    { id: 'aura-sphere', name: 'Aura Sphere', type: 'fighting', kind: 'projectile', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Never misses.',
      cd: 0.62, dmg: 80, speed: 300, count: 1, spread: 0.1, pierce: 0, life: 2.0, size: 8, homing: 4 },

    // ---------------- FANTASMA ----------------
    { id: 'lick', name: 'Lick', type: 'ghost', kind: 'melee', cat: 'physical', ailment: 'paralysis', ailmentChance: 30, flinch: 0, statChance: 0,
      desc: 'Has a chance to paralyze the target.',
      cd: 0.48, dmg: 30, radius: 48, arc: 1.8 },

    { id: 'shadow-ball', name: 'Shadow Ball', type: 'ghost', kind: 'projectile', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 20, stage: { stat: 'spd', n: -1 },
      desc: 'Has a chance to lower the target\'s Special Defense by one stage.',
      cd: 0.66, dmg: 80, speed: 280, count: 1, spread: 0.1, pierce: 2, life: 1.6, size: 9 },

    // ---------------- DRAGON ----------------
    { id: 'dragon-rage', name: 'Dragon Rage', type: 'dragon', kind: 'beam', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts 40 points of damage.',
      cd: 1.0, dmg: 0, radius: 230, width: 34 },

    { id: 'dragon-dance', name: 'Dragon Dance', type: 'dragon', kind: 'buff', cat: 'status', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0, dmg: 0,
      desc: 'Raises the user\'s Attack and Speed by one stage.',
      cd: 0.7, stat: 'atk', amount: 0.11, dur: 7, stacks: 5 },

    // ---------------- HADA ----------------
    { id: 'fairy-wind', name: 'Fairy Wind', type: 'fairy', kind: 'nova', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage with no additional effect.',
      cd: 1.0, dmg: 40, speed: 230, count: 10, pierce: 0, life: 1.2, size: 7 },

    { id: 'dazzling-gleam', name: 'Dazzling Gleam', type: 'fairy', kind: 'aura', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage with no additional effect.',
      cd: 0.5, dmg: 80, radius: 72 },

    // ---------------- ACERO ----------------
    { id: 'metal-claw', name: 'Metal Claw', type: 'steel', kind: 'melee', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 10,
      desc: 'Has a chance to raise the user\'s Attack by one stage.',
      cd: 0.5, dmg: 50, radius: 50, arc: 1.6, knock: 60 },

    { id: 'flash-cannon', name: 'Flash Cannon', type: 'steel', kind: 'beam', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 10, stage: { stat: 'spd', n: -1 },
      desc: 'Has a chance to lower the target\'s Special Defense by one stage.',
      cd: 1.05, dmg: 80, radius: 220, width: 30 },

    // ---------------- SINIESTRO ----------------
    { id: 'bite', name: 'Bite', type: 'dark', kind: 'melee', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 30, statChance: 0,
      desc: 'Has a chance to make the target flinch.',
      cd: 0.45, dmg: 60, radius: 46, arc: 1.5, knock: 70 },

    { id: 'dark-pulse', name: 'Dark Pulse', type: 'dark', kind: 'nova', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 20, statChance: 0,
      desc: 'Has a chance to make the target flinch.',
      cd: 1.15, dmg: 80, speed: 240, count: 10, pierce: 1, life: 1.1, size: 8 },

    { id: 'night-shade', name: 'Night Shade', type: 'dark', kind: 'aura', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts damage equal to the user\'s level.',
      cd: 0.5, dmg: 0, radius: 72 },

    // ---------------- NEW (2026-10-10): same shapes, different mechanics ----------------
    { id: 'bonemerang', name: 'Bonemerang', type: 'ground', kind: 'boomerang', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Hits twice in one turn.',
      cd: 0.95, dmg: 50, speed: 300, count: 1, radius: 230, size: 8, knock: 40 },

    { id: 'psycho-cut', name: 'Psycho Cut', type: 'psychic', kind: 'boomerang', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Has an increased chance for a critical hit.',
      cd: 0.8, dmg: 70, speed: 360, count: 2, spread: 0.6, radius: 200, size: 7 },

    { id: 'spikes', name: 'Spikes', type: 'ground', kind: 'mine', cat: 'status', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Scatters Spikes, hurting opposing Pokémon that switch in.',
      cd: 1.2, dmg: 0, count: 2, radius: 60, dur: 8 },

    { id: 'toxic-spikes', name: 'Toxic Spikes', type: 'poison', kind: 'mine', cat: 'status', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Scatters poisoned spikes, poisoning opposing Pokémon that switch in.',
      cd: 1.1, dmg: 0, count: 2, radius: 56, dur: 8, poison: 2 },

    { id: 'hail', name: 'Hail', type: 'ice', kind: 'meteor', cat: 'status', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Changes the weather to a hailstorm for five turns.',
      cd: 1.2, dmg: 0, count: 4, radius: 40, slow: 0.4 },

    { id: 'meteor-mash', name: 'Meteor Mash', type: 'steel', kind: 'meteor', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 20,
      desc: 'Has a chance to raise the user\'s Attack by one stage.',
      cd: 1.4, dmg: 90, count: 2, radius: 54, knock: 80 },

    { id: 'will-o-wisp', name: 'Will-O-Wisp', type: 'fire', kind: 'turret', cat: 'status', ailment: 'burn', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Burns the target.',
      cd: 3.5, dmg: 0, rate: 0.55, dur: 6, count: 1, range: 300, speed: 300, size: 7, burn: 1 },

    { id: 'substitute', name: 'Substitute', type: 'normal', kind: 'turret', cat: 'status', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Transfers 1/4 of the user\'s max HP into a doll, protecting the user from further damage or status changes until it breaks.',
      cd: 4.0, dmg: 0, rate: 0.4, dur: 6, count: 1, range: 280, speed: 320, size: 6 },

    { id: 'aerial-ace', name: 'Aerial Ace', type: 'flying', kind: 'dash', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Never misses.',
      cd: 0.75, dmg: 60, radius: 120, width: 40, knock: 60 },

    { id: 'flame-wheel', name: 'Flame Wheel', type: 'fire', kind: 'trail', cat: 'physical', ailment: 'burn', ailmentChance: 10, flinch: 0, statChance: 0,
      desc: 'Has a chance to burn the target. Lets frozen Pokémon thaw themselves.',
      cd: 0.28, dmg: 60, radius: 28, dur: 2.6, burn: 1 },

    { id: 'bubble-beam', name: 'Bubble Beam', type: 'water', kind: 'cone', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 10, stage: { stat: 'spe', n: -1 },
      desc: 'Has a chance to lower the target\'s Speed by one stage.',
      cd: 0.65, dmg: 65, count: 7, arc: 1.0, speed: 340, life: 0.45, size: 6, slow: 0.3 },

    { id: 'hex', name: 'Hex', type: 'ghost', kind: 'chain', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Has double power if the target has a major status ailment.',
      cd: 0.9, dmg: 65, count: 4, radius: 150, hex: 1.7 }
  ];

  // Melee (2026-10-12): +20% damage and +25% range and arc
  // (and -25% damage taken while it is your active attack, in player.js).
  // They hit well, but you had to risk much more than with the ranged ones.
  for (const m of RAW) {
    if (m.kind !== 'melee') continue;
    m.radius = Math.round(m.radius * 1.25);
    if (m.arc) m.arc = Math.min(3, +(m.arc * 1.25).toFixed(2));
  }

  // Canonical move metadata (PokeAPI). pp = Power Points (cooldown source, used by the cooldown slice),
  // acc = accuracy when below 100, hits = hits per use for true multi-hit moves.
  const CANON = {
    'tackle': { pp: 35 },
    'quick-attack': { pp: 30 },
    'swords-dance': { pp: 20 },
    'agility': { pp: 30 },
    'harden': { pp: 30 },
    'ember': { pp: 25 },
    'flamethrower': { pp: 15 },
    'fire-spin': { pp: 15, acc: 85 },
    'heat-wave': { pp: 10, acc: 90 },
    'water-gun': { pp: 25 },
    'bubble': { pp: 30 },
    'hydro-pump': { pp: 5, acc: 80 },
    'aqua-ring': { pp: 20 },
    'vine-whip': { pp: 25 },
    'razor-leaf': { pp: 25, acc: 95 },
    'leaf-storm': { pp: 5, acc: 90 },
    'giga-drain': { pp: 10 },
    'thunder-shock': { pp: 30 },
    'discharge': { pp: 15 },
    'thunderbolt': { pp: 15 },
    'confusion': { pp: 25 },
    'psybeam': { pp: 20 },
    'psychic': { pp: 10 },
    'sludge': { pp: 20 },
    'mud-shot': { pp: 15, acc: 95 },
    'gust': { pp: 35 },
    'wing-attack': { pp: 35 },
    'body-slam': { pp: 15 },
    'hyper-voice': { pp: 10 },
    'poison-sting': { pp: 35 },
    'toxic': { pp: 10, acc: 90 },
    'bulldoze': { pp: 20 },
    'bug-bite': { pp: 20 },
    'string-shot': { pp: 40, acc: 95 },
    'bug-buzz': { pp: 10 },
    'rock-throw': { pp: 15, acc: 90 },
    'rock-slide': { pp: 10, acc: 90 },
    'ice-beam': { pp: 10 },
    'powder-snow': { pp: 25 },
    'karate-chop': { pp: 25 },
    'aura-sphere': { pp: 20 },
    'lick': { pp: 30 },
    'shadow-ball': { pp: 15 },
    'dragon-rage': { pp: 10 },
    'dragon-dance': { pp: 20 },
    'fairy-wind': { pp: 30 },
    'dazzling-gleam': { pp: 10 },
    'metal-claw': { pp: 35, acc: 95 },
    'flash-cannon': { pp: 10 },
    'bite': { pp: 25 },
    'dark-pulse': { pp: 15 },
    'night-shade': { pp: 15 },
    'bonemerang': { pp: 10, acc: 90, hits: 2 },
    'psycho-cut': { pp: 20 },
    'spikes': { pp: 20 },
    'toxic-spikes': { pp: 20 },
    'hail': { pp: 10 },
    'meteor-mash': { pp: 10, acc: 90 },
    'will-o-wisp': { pp: 15, acc: 85 },
    'substitute': { pp: 10 },
    'aerial-ace': { pp: 20 },
    'flame-wheel': { pp: 25 },
    'bubble-beam': { pp: 20 },
    'hex': { pp: 10 }
  };

  // Cooldown and per-cast normalization (DECISIONS 2026-10-18, fix/attack-calc slices 2-3).
  //
  //   period = ANCHOR_CD * (ANCHOR_PP / PP)^BETA     the time one use of the move "costs" (Tackle = 0.5 s)
  //   cd     = period for every DAMAGING move except orbit and trail (see below). Status moves
  //            (dmg 0: buffs, mines, turrets, Dragon Rage, Night Shade...) keep their hand-tuned cd.
  //   norm   = (acc/100) * hits / E     multiplies FINAL per-event damage (Stats.applyDamage)
  //   floor  = 1 / max(1, E)            smallest per-event damage, so one cast always does >= 1 HP in total
  //
  // E = events ONE target takes per cast (or per period for continuous moves) at the move's BASE
  // config: upgrades that add pellets or orbs add damage, they do not change E. The game has no miss
  // roll, so accuracy is folded into norm.
  //   cone       MIN(pellets, CONE_E): pellets a target takes at typical range, not the full fan
  //   boomerang  2 (out and back)
  //   orbit      orbs * (speed / 2pi) * period: passes a target on the ring takes per period.
  //              Its cd is only the re-hit lock, so cd stays hand-set. E can be < 1 (norm > 1).
  //   trail      TRAIL_OVERLAP * period / TAU: puddles overlapping a target, each pulsing every TAU.
  //              Its cd is puddle SPACING (a distance), so cd stays hand-set; Flame Wheel is the only damaging trail.
  //   aura       1: one full pulse per cooldown (pulse mode, decided 2026-10-18)
  //   others     1
  const ANCHOR_CD = 0.5, ANCHOR_PP = 35, BETA = 1.0, CONE_E = 3, TRAIL_OVERLAP = 2, TAU = 0.5;
  for (const m of RAW) {
    const c = CANON[m.id] || {};
    m.pp = c.pp; m.acc = c.acc || 100; m.hits = c.hits || 1;
    if (m.pp && m.dmg > 0) {
      m.period = +(ANCHOR_CD * Math.pow(ANCHOR_PP / m.pp, BETA)).toFixed(3);
      if (m.kind !== 'orbit' && m.kind !== 'trail') m.cd = m.period;
    }
    const per = m.period || m.cd;
    const E = m.kind === 'cone' ? Math.min(m.count || 1, CONE_E)
            : m.kind === 'boomerang' ? 2
            : m.kind === 'orbit' ? (m.count || 1) * (m.speed / (2 * Math.PI)) * per
            : m.kind === 'trail' ? TRAIL_OVERLAP * per / TAU
            : 1;
    m.norm = (m.acc / 100) * m.hits / E;
    m.floor = 1 / Math.max(1, E);
  }

  // Move pool by type. The `normal` pool is shared by all.
  const POOL = {};
  for (const m of RAW) (POOL[m.type] = POOL[m.type] || []).push(m.id);

  const BY_ID = {};
  for (const m of RAW) {
    BY_ID[m.id] = m;
  }

  /** Moves this Pokemon can learn (its types + normal). */
  function poolFor(mon) {
    const ids = new Set(POOL.normal);
    for (const t of mon.types) for (const id of (POOL[t] || [])) ids.add(id);
    return [...ids];
  }

  /** A move instance in a run: the base definition plus its upgrade stacks (none yet). */
  function instance(id) {
    const def = BY_ID[id];
    return Object.assign({}, def, { id, def, t: 0, mods: {} });
  }

  /**
   * Rebuilds the live fields of a move instance from its base definition plus its `mods` stacks
   * (G.Mechanics, upgrade rework). Always starts from `def`, never from the previous value, so the
   * result does not depend on the order the cards were taken. `norm` and `floor` are NOT touched:
   * they stay frozen at the base count, so added pellets add real damage.
   */
  function derive(s) {
    const d = s.def, M = G.Mechanics, byKey = {};
    for (const id in s.mods) {
      const mech = M.BY_ID[id], n = s.mods[id];
      if (!mech || !(n > 0)) continue;
      const key = mech.keyFor(d);
      const g = byKey[key] || (byKey[key] = { add: 0, inc: 0, rate: 0 });
      g[mech.mode] += n * mech.step;
    }
    for (const key in byKey) {
      const g = byKey[key];
      let v = ((d[key] == null ? 0 : d[key]) + g.add) * (1 + g.inc);
      if (g.rate) v /= 1 + g.rate;
      if (key === 'arc') v = Math.min(v, M.TWO_PI);
      if (key === 'ailmentChance') v = Math.min(v, 100);
      s[key] = v;
    }
    return s;
  }

  /**
   * DoT strength of a move's burn / poison (status rework slice B): its current Power over its base Power, so every
   * increased-damage source (Increased Effect, Type and Kind damage cards) strengthens the DoT too. Status moves (Power 0)
   * stay at 1. Attack and Sp. Atk do not scale it (mainline DoT ignores attack).
   */
  function dotMul(m) {
    const b = m && m.def && m.def.dmg;
    return b > 0 && m.dmg > 0 ? m.dmg / b : 1;
  }

  /**
   * Adds one stack of mechanic `id` to move instance `s` if it is eligible right now.
   * @returns {boolean} whether the stack was added
   */
  function addStack(s, id) {
    const mech = G.Mechanics.BY_ID[id];
    if (!mech || !G.Mechanics.check(s, mech).ok) return false;
    s.mods[id] = (s.mods[id] || 0) + 1;
    derive(s);
    return true;
  }

  /** Total mechanic stacks on a move instance (for the HUD badge, slice 2b). */
  function stackTotal(s) { let n = 0; for (const id in s.mods) n += s.mods[id]; return n; }

  /** Starting move based on the main type (if the Pokemon does not bring one). */
  const START = {
    fire: 'ember', water: 'water-gun', grass: 'vine-whip', electric: 'thunder-shock',
    psychic: 'confusion', poison: 'sludge', ground: 'mud-shot', flying: 'gust',
    bug: 'bug-bite', rock: 'rock-throw', ice: 'ice-beam', fighting: 'karate-chop',
    ghost: 'shadow-ball', dragon: 'dragon-rage', fairy: 'fairy-wind', steel: 'metal-claw',
    dark: 'bite', normal: 'tackle'
  };
  function startFor(mon) {
    if (mon.start && BY_ID[mon.start]) return mon.start;
    for (const t of mon.types) if (START[t]) return START[t];
    return 'tackle';
  }

  G.Moves = { ALL: RAW, BY_ID, POOL, poolFor, instance, startFor, derive, addStack, stackTotal, dotMul };
})();
