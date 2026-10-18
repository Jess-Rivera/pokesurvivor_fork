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
 * The upgrades (lvl 1 -> 5) come from a common ladder per `kind`:
 *   mods multiplicativos -> dmg, cd, speed, radius, dur, amount, arc
 *   mods aditivos        -> count, pierce, stacks
 */
(() => {
  const LADDERS = {
    projectile: [
      { t: '+1 proyectil',                  m: { count: 1, spread: 1.4 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+1 proyectil y +1 perforación',   m: { count: 1, pierce: 1, spread: 1.2 } }
    ],
    melee: [
      { t: '+40% daño',                     m: { dmg: 1.40 } },
      { t: '+25% alcance',                  m: { radius: 1.25 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: 'Golpea en 360° y +50% daño',    m: { arc: 9, dmg: 1.50 } }
    ],
    beam: [
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '+30% alcance y grosor',         m: { radius: 1.30, width: 1.30 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+50% daño',                     m: { dmg: 1.50 } }
    ],
    orbit: [
      { t: '+1 orbe',                       m: { count: 1 } },
      { t: '+55% daño',                     m: { dmg: 1.55 } },
      { t: '+25% radio y gira más rápido',  m: { radius: 1.25, speed: 1.35 } },
      { t: '+1 orbe y +55% daño',           m: { count: 1, dmg: 1.55 } }
    ],
    nova: [
      { t: '+4 proyectiles',                m: { count: 4 } },
      { t: '+40% daño',                     m: { dmg: 1.40 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+4 proyectiles y +1 perforación', m: { count: 4, pierce: 1 } }
    ],
    aura: [
      { t: '+30% radio',                    m: { radius: 1.30 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: 'Golpea un 40% más a menudo',    m: { cd: 0.70 } },
      { t: '+30% radio y +50% daño',        m: { radius: 1.30, dmg: 1.50 } }
    ],
    boomerang: [
      { t: '+1 bumerán',                    m: { count: 1 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '+30% alcance',                  m: { radius: 1.30 } },
      { t: '+1 bumerán y +40% daño',        m: { count: 1, dmg: 1.40 } }
    ],
    chain: [
      { t: '+2 saltos',                     m: { count: 2 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+2 saltos y +40% daño',         m: { count: 2, dmg: 1.40 } }
    ],
    mine: [
      { t: '+1 mina',                       m: { count: 1 } },
      { t: '+50% daño',                     m: { dmg: 1.50 } },
      { t: '+30% radio de explosión',       m: { radius: 1.30 } },
      { t: '+1 mina y -25% recarga',        m: { count: 1, cd: 0.75 } }
    ],
    meteor: [
      { t: '+1 meteoro',                    m: { count: 1 } },
      { t: '+45% daño',                     m: { dmg: 1.45 } },
      { t: '+30% radio',                    m: { radius: 1.30 } },
      { t: '+2 meteoros y -20% recarga',    m: { count: 2, cd: 0.80 } }
    ],
    turret: [
      { t: '+50% daño',                     m: { dmg: 1.50 } },
      { t: 'Dispara un 35% más rápido',     m: { rate: 0.74 } },
      { t: '+1 a la vez',                   m: { count: 1 } },
      { t: '+50% duración y +40% daño',     m: { dur: 1.50, dmg: 1.40 } }
    ],
    dash: [
      { t: '+40% daño',                     m: { dmg: 1.40 } },
      { t: '+30% distancia',                m: { radius: 1.30 } },
      { t: '-25% recarga',                  m: { cd: 0.75 } },
      { t: '+60% daño y más ancho',         m: { dmg: 1.60, width: 1.40 } }
    ],
    trail: [
      { t: '+40% daño',                     m: { dmg: 1.40 } },
      { t: '+40% duración',                 m: { dur: 1.40 } },
      { t: 'Charcos un 30% más grandes',    m: { radius: 1.30 } },
      { t: '+50% daño y +30% radio',        m: { dmg: 1.50, radius: 1.30 } }
    ],
    cone: [
      { t: '+3 disparos',                   m: { count: 3 } },
      { t: '+40% daño',                     m: { dmg: 1.40 } },
      { t: '+30% alcance',                  m: { life: 1.30 } },
      { t: '+3 disparos y +1 perforación',  m: { count: 3, pierce: 1 } }
    ],
    buff: [
      { t: '+1 acumulación máxima',         m: { stacks: 1 } },
      { t: '+40% potencia',                 m: { amount: 1.40 } },
      { t: '+50% duración',                 m: { dur: 1.50 } },
      { t: '+1 acumulación y +40% potencia', m: { stacks: 1, amount: 1.40 } }
    ]
  };

  const RAW = [
    // ---------------- NORMAL (pool common to all) ----------------
    { id: 'tackle', name: 'Tackle', type: 'normal', kind: 'melee', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage with no additional effect.',
      cd: 0.50, dmg: 40, radius: 48, arc: 1.7, knock: 90 },

    { id: 'quick-attack', name: 'Quick Attack', type: 'normal', kind: 'dash', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage with no additional effect.',
      cd: 0.75, dmg: 40, radius: 110, width: 34, knock: 40 },

    { id: 'swords-dance', name: 'Swords Dance', type: 'normal', kind: 'buff', cat: 'status', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0, dmg: 0,
      desc: 'Raises the user\'s Attack by two stages.',
      cd: 0.85, stat: 'atk', amount: 0.13, dur: 7, stacks: 5 },

    { id: 'agility', name: 'Agility', type: 'normal', kind: 'buff', cat: 'status', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0, dmg: 0,
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

    { id: 'fire-spin', name: 'Fire Spin', type: 'fire', kind: 'orbit', cat: 'special', ailment: 'trap', ailmentChance: 100, flinch: 0, statChance: 0,
      desc: 'Prevents the target from fleeing and inflicts damage for 2-5 turns.',
      cd: 0.30, dmg: 35, count: 3, radius: 62, speed: 2.4, size: 9, burn: 1 },

    { id: 'heat-wave', name: 'Heat Wave', type: 'fire', kind: 'nova', cat: 'special', ailment: 'burn', ailmentChance: 10, flinch: 0, statChance: 0,
      desc: 'Has a chance to burn the target.',
      cd: 1.25, dmg: 95, speed: 250, count: 10, pierce: 1, life: 1.1, size: 7, burn: 1 },

    // ---------------- AGUA ----------------
    { id: 'water-gun', name: 'Water Gun', type: 'water', kind: 'projectile', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Inflicts regular damage with no additional effect.',
      cd: 0.44, dmg: 40, speed: 350, count: 1, spread: 0.10, pierce: 1, life: 1.5, size: 6 },

    { id: 'bubble', name: 'Bubble', type: 'water', kind: 'nova', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 10,
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

    // (Formerly Giga Drain: it healed with every hit and was broken. Same id so as not to break saves.)
    { id: 'giga-drain', name: 'Giga Drain', type: 'grass', kind: 'aura', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Drains half the damage inflicted to heal the user.',
      cd: 0.55, dmg: 75, radius: 76 },

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

    { id: 'psychic', name: 'Psychic', type: 'psychic', kind: 'nova', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 10,
      desc: 'Has a chance to lower the target\'s Special Defense by one stage.',
      cd: 1.35, dmg: 90, speed: 230, count: 12, pierce: 1, life: 1.6, size: 7, homing: 1.0 },

    // ---------------- TIPOS SECUNDARIOS ----------------
    { id: 'sludge', name: 'Sludge', type: 'poison', kind: 'projectile', cat: 'special', ailment: 'poison', ailmentChance: 30, flinch: 0, statChance: 0,
      desc: 'Has a chance to poison the target.',
      cd: 0.60, dmg: 65, speed: 290, count: 1, spread: 0.12, pierce: 0, life: 1.5, size: 8, poison: 1 },

    { id: 'mud-shot', name: 'Mud Shot', type: 'ground', kind: 'nova', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 100,
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
      cd: 0.3, dmg: 0, radius: 26, dur: 3, poison: 1 },

    // ---------------- TIERRA (extra) ----------------
    { id: 'bulldoze', name: 'Bulldoze', type: 'ground', kind: 'aura', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 100,
      desc: 'Has a chance to lower the target\'s Speed by one stage.',
      cd: 0.7, dmg: 60, radius: 80, slow: 0.35 },

    // ---------------- BICHO ----------------
    { id: 'bug-bite', name: 'Bug Bite', type: 'bug', kind: 'melee', cat: 'physical', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'If target has a berry, inflicts double damage and uses the berry.',
      cd: 0.42, dmg: 60, radius: 44, arc: 1.6, knock: 40 },

    { id: 'string-shot', name: 'String Shot', type: 'bug', kind: 'mine', cat: 'status', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 0,
      desc: 'Lowers the target\'s Speed by two stages.',
      cd: 1.1, dmg: 0, count: 2, radius: 56, dur: 7, slow: 0.6 },

    { id: 'bug-buzz', name: 'Bug Buzz', type: 'bug', kind: 'aura', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 10,
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
      cd: 0.48, dmg: 30, radius: 48, arc: 1.8, slow: 0.4 },

    { id: 'shadow-ball', name: 'Shadow Ball', type: 'ghost', kind: 'projectile', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 20,
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

    { id: 'flash-cannon', name: 'Flash Cannon', type: 'steel', kind: 'beam', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 10,
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

    { id: 'bubble-beam', name: 'Bubble Beam', type: 'water', kind: 'cone', cat: 'special', ailment: 'none', ailmentChance: 0, flinch: 0, statChance: 10,
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

  // Per-cast normalization (DECISIONS 2026-10-18, fix/attack-calc slice 2).
  //   norm = (acc/100) * hits / E     multiplies FINAL per-event damage (Stats.applyDamage)
  //   floor = 1 / E                   smallest per-event damage, so one cast always does >= 1 HP in total
  // E = events ONE target takes per cast at the move's BASE config (upgrades that add pellets or
  // orbs add damage; they do not change E). The game has no miss roll, so accuracy is folded in here.
  // Cone: pellets a target takes at typical range, not the full fan. Boomerang: out and back.
  // Orbit, trail and aura are still E = 1: their E depends on the final cooldown (PP slice).
  const CONE_E = 3;
  for (const m of RAW) {
    const c = CANON[m.id] || {};
    m.pp = c.pp; m.acc = c.acc || 100; m.hits = c.hits || 1;
    const E = m.kind === 'cone' ? Math.min(m.count || 1, CONE_E) : m.kind === 'boomerang' ? 2 : 1;
    m.norm = (m.acc / 100) * m.hits / E;
    m.floor = 1 / E;
  }

  // Move pool by type. The `normal` pool is shared by all.
  const POOL = {};
  for (const m of RAW) (POOL[m.type] = POOL[m.type] || []).push(m.id);

  const BY_ID = {};
  for (const m of RAW) {
    m.ups = LADDERS[m.kind];
    m.maxLvl = m.ups.length + 1;
    BY_ID[m.id] = m;
  }

  /** Moves this Pokemon can learn (its types + normal). */
  function poolFor(mon) {
    const ids = new Set(POOL.normal);
    for (const t of mon.types) for (const id of (POOL[t] || [])) ids.add(id);
    return [...ids];
  }

  /**
   * A move instance in a run: the base numbers of `def` with all
   * the ladder upgrades up to `lvl` already applied.
   */
  function instance(id, lvl = 1) {
    const def = BY_ID[id];
    const s = Object.assign({}, def, { id, def, lvl, t: 0 });
    delete s.ups;
    for (let i = 0; i < lvl - 1; i++) applyMods(s, def.ups[i].m);
    return s;
  }

  const MULT = ['dmg', 'cd', 'speed', 'radius', 'dur', 'amount', 'arc', 'width', 'spread', 'life', 'size', 'rate'];
  const ADD = ['count', 'pierce', 'stacks'];

  function applyMods(s, m) {
    for (const k in m) {
      if (MULT.includes(k) && s[k] != null) s[k] *= m[k];
      else if (ADD.includes(k)) s[k] = (s[k] || 0) + m[k];
      else s[k] = m[k];
    }
  }

  /** Levels up an already-created instance. */
  function levelUp(s) {
    if (s.lvl >= s.def.maxLvl) return false;
    applyMods(s, s.def.ups[s.lvl - 1].m);
    s.lvl++;
    return true;
  }

  /** Text of the next upgrade, for the level-up card. */
  function nextUpText(s) {
    return s.lvl >= s.def.maxLvl ? null : s.def.ups[s.lvl - 1].t;
  }

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

  // ---------------- move evolution ----------------
  /*
   * A move at MAX LEVEL evolves if in that run you have ever taken
   * its condition upgrade (`needs`, a LevelUp.STATS id). A
   * carta dorada. Los potenciadores (buff) no evolucionan.
   */
  const NEED_NAME = { hp: 'Vigor', atk: 'Potencia', spd: 'Carrera', cd: 'Reflejos', def: 'Coraza',
                      rgn: 'Síntesis', mag: 'Imán', xp: 'Aprendizaje' };
  const EVO = {
    'tackle': ['Derribo', 'hp'],             'quick-attack': ['Velocidad Extrema', 'spd'],
    'body-slam': ['Gigaimpacto', 'atk'],     'hyper-voice': ['Alboroto', 'cd'],
    'ember': ['Llamarada', 'atk'],           'flamethrower': ['Sofoco', 'cd'],
    'fire-spin': ['Fuego Sagrado', 'rgn'],   'heat-wave': ['Erupción', 'hp'],
    'water-gun': ['Escaldar', 'atk'],        'bubble': ['Surf', 'spd'],
    'hydro-pump': ['Hidrocañón', 'atk'],     'vine-whip': ['Latigazo', 'atk'],
    'razor-leaf': ['Lluevehojas', 'cd'],     'leaf-storm': ['Danza Pétalo', 'rgn'],
    'giga-drain': ['Planta Feroz', 'hp'],    'thunder-shock': ['Trueno', 'atk'],
    'discharge': ['Campo Eléctrico', 'def'], 'thunderbolt': ['Electrocañón', 'cd'],
    'confusion': ['Psicocarga', 'cd'],       'psybeam': ['Premonición', 'atk'],
    'psychic': ['Vasta Fuerza', 'mag'],      'sludge': ['Bomba Lodo', 'atk'],
    'poison-sting': ['Puya Nociva', 'spd'],  'toxic': ['Gas Venenoso', 'rgn'],
    'mud-shot': ['Tierra Viva', 'atk'],      'bulldoze': ['Terremoto', 'atk'],
    'gust': ['Vendaval', 'spd'],             'wing-attack': ['Pájaro Osado', 'atk'],
    'bug-bite': ['Tijera X', 'atk'],         'string-shot': ['Red Viscosa', 'cd'],
    'bug-buzz': ['Enjambre', 'rgn'],         'rock-throw': ['Roca Afilada', 'atk'],
    'rock-slide': ['Trampa Rocas', 'cd'],    'ice-beam': ['Ventisca', 'atk'],
    'powder-snow': ['Viento Hielo', 'spd'],  'karate-chop': ['A Bocajarro', 'atk'],
    'aura-sphere': ['Onda Certera', 'cd'],   'lick': ['Puño Sombra', 'atk'],
    'shadow-ball': ['Golpe Fantasma', 'cd'], 'dragon-rage': ['Cometa Draco', 'atk'],
    'fairy-wind': ['Fuerza Lunar', 'atk'],   'dazzling-gleam': ['Campo de Niebla', 'rgn'],
    'metal-claw': ['Cabeza de Hierro', 'atk'], 'flash-cannon': ['Rayo Metálico', 'def'],
    'bite': ['Triturar', 'atk'],             'dark-pulse': ['Alarido', 'spd'],
    'night-shade': ['Pesadilla', 'rgn'],
    'bonemerang': ['Ataque Óseo', 'atk'],    'psycho-cut': ['Psicocolmillo', 'cd'],
    'spikes': ['Fisura', 'atk'],             'toxic-spikes': ['Lanza Mugre', 'rgn'],
    'hail': ['Alud', 'cd'],                  'meteor-mash': ['Bomba Imán', 'atk'],
    'will-o-wisp': ['Infierno', 'cd'],       'substitute': ['Doble Equipo', 'def'],
    'aerial-ace': ['Acróbata', 'spd'],       'flame-wheel': ['Envite Ígneo', 'spd'],
    'bubble-beam': ['Acua Cola', 'atk'],     'hex': ['Poltergeist', 'mag']
  };
  // What it gains on evolving, based on how it works.
  const EVO_MODS = {
    projectile: { t: '×1,8 daño, +2 proyectiles, +2 perforación y más grandes', m: { dmg: 1.8, count: 2, pierce: 2, size: 1.3, spread: 1.1 } },
    melee:      { t: '×1,9 daño, más alcance y golpea en 360°', m: { dmg: 1.9, radius: 1.3, arc: 9 } },
    beam:       { t: '×1,8 daño, rayo un 50% más grueso y más largo', m: { dmg: 1.8, width: 1.5, radius: 1.2, cd: 0.85 } },
    orbit:      { t: '+2 orbes, ×1,7 daño y más radio', m: { count: 2, dmg: 1.7, radius: 1.15 } },
    nova:       { t: '+6 proyectiles, ×1,6 daño y +1 perforación', m: { count: 6, dmg: 1.6, pierce: 1 } },
    aura:       { t: '×1,8 daño y un 35% más de radio', m: { dmg: 1.8, radius: 1.35 } },
    boomerang:  { t: '×1,8 daño, +1 bumerán y más alcance', m: { dmg: 1.8, count: 1, radius: 1.2, size: 1.2 } },
    chain:      { t: '×1,7 daño y +3 saltos', m: { dmg: 1.7, count: 3, radius: 1.2 } },
    mine:       { t: '×1,8 daño, +2 minas y explosión más grande', m: { dmg: 1.8, count: 2, radius: 1.25 } },
    meteor:     { t: '×1,7 daño, +2 meteoros y más radio', m: { dmg: 1.7, count: 2, radius: 1.2 } },
    turret:     { t: '×1,8 daño, +1 a la vez y dispara más rápido', m: { dmg: 1.8, count: 1, rate: 0.8 } },
    dash:       { t: '×1,9 daño, más distancia y menos recarga', m: { dmg: 1.9, radius: 1.25, cd: 0.8 } },
    trail:      { t: '×1,8 daño, charcos más grandes y duraderos', m: { dmg: 1.8, radius: 1.25, dur: 1.3 } },
    cone:       { t: '×1,7 daño, +4 disparos y +1 perforación', m: { dmg: 1.7, count: 4, pierce: 1 } }
  };

  /** Can it evolve yet? -> { name, needs, needName, text, ready } or null */
  function evoInfo(m, statsTaken) {
    const e = EVO[m.id];
    if (!e || m.evolved || m.lvl < m.def.maxLvl || !EVO_MODS[m.kind]) return null;
    const [name, needs] = e;
    return { name, needs, needName: NEED_NAME[needs], text: EVO_MODS[m.kind].t,
             ready: !!(statsTaken && statsTaken[needs]) };
  }

  /** Evolves an instance (changes name and power; it stays the same type). */
  function evolve(m) {
    const e = EVO[m.id];
    if (!e || m.evolved) return false;
    applyMods(m, EVO_MODS[m.kind].m);
    m.baseName = m.name;
    m.name = e[0];
    m.evolved = true;
    return true;
  }

  G.Moves = { ALL: RAW, BY_ID, POOL, poolFor, instance, levelUp, nextUpText, startFor,
              EVO, NEED_NAME, evoInfo, evolve };
})();
