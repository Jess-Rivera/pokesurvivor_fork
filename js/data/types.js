/* ============ types.js: the type chart ============
 * The mainline chart (6th gen onward), as in the games (entity model slice 4b, Jess 2026-11-06):
 *   x2 super effective, x0.5 not very effective, x0 immune.
 * Two types multiply (x4, x1, x0.25). A combo with no immune type stays within [x0.25, x4]; any immune type makes
 * the hit x0 (no damage and no side effects, see js/systems/move-effects.js). Used both ways: your attacks on
 * enemies and theirs on you. A type the chart does not know (the test dummies' 'typeless') takes x1 from all.
 */
G.Types = (() => {
  // attacker -> { defender: the games' multiplier } (the x1 ones are not listed)
  const CHART = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass: {
      fire: 0.5,
      water: 2,
      grass: 0.5,
      poison: 0.5,
      ground: 2,
      flying: 0.5,
      bug: 0.5,
      rock: 2,
      dragon: 0.5,
      steel: 0.5,
    },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: {
      normal: 2,
      ice: 2,
      poison: 0.5,
      flying: 0.5,
      psychic: 0.5,
      bug: 0.5,
      rock: 2,
      ghost: 0,
      dark: 2,
      steel: 2,
      fairy: 0.5,
    },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: {
      fire: 0.5,
      grass: 2,
      fighting: 0.5,
      poison: 0.5,
      flying: 0.5,
      psychic: 2,
      ghost: 0.5,
      dark: 2,
      steel: 0.5,
      fairy: 0.5,
    },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
  };
  const MIN = 0.25,
    MAX = 4;

  /** Multiplier of an attack of type `atk` against a Pokemon of types `def`. */
  function mult(atk, def) {
    const row = CHART[atk];
    if (!row || !def) return 1;
    let m = 1;
    for (const t of def) if (row[t] != null) m *= row[t];
    return m === 0 ? 0 : G.U.clamp(m, MIN, MAX); // the clamp never lifts an immunity
  }

  /** 'immune' | 'super' | 'weak' | null, to show the notice. */
  function label(m) {
    return m === 0 ? 'immune' : m > 1.05 ? 'super' : m < 0.95 ? 'weak' : null;
  }

  return { CHART, MIN, MAX, mult, label };
})();
