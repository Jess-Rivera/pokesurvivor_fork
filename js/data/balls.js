/* ============ balls.js: the ball catalog the Main Menu Shop shows (G.BALL_CATALOG; #149 149e) ============
 * Every ball in shop order (Poke, Great, Ultra, Master, then mainline item order), each with its id (its sprite strip's
 * name, G.BALL_SPRITES), its name and a one-line description (desc, as team items have) for its Shop card.
 * The balls a throw can use (#137) also carry catchMultiplier (the catch formula's ball factor), price (PokeCoins per
 * ball) and unlockPrice (a one-time Shop purchase; absent when the ball is owned from the start). G.Catch builds its
 * tiers from these entries (js/systems/catch.js BALLS). Prices: Jess 2026-11-17, B1 and B2 (TUNE, BALANCE.md).
 * Descriptions (Jess 2026-11-17, E2): honest lines for the four planned balls; the rest say "Coming soon." until they
 * have a use in this game.
 */
G.BALL_CATALOG = Object.freeze(
  [
    {
      id: 'poke',
      name: 'Poke Ball',
      desc: 'The standard ball for catching rescued Pokemon.',
      catchMultiplier: 1,
      price: 50,
    },
    {
      id: 'great',
      name: 'Great Ball',
      desc: 'Catches 1.5x as well as a Poke Ball.',
      catchMultiplier: 1.5,
      price: 150,
      unlockPrice: 5000,
    },
    {
      id: 'ultra',
      name: 'Ultra Ball',
      desc: 'Catches 2x as well as a Poke Ball.',
      catchMultiplier: 2,
      price: 300,
      unlockPrice: 15000,
    },
    { id: 'master', name: 'Master Ball', desc: 'Catches any Pokemon without fail.' },
    { id: 'safari', name: 'Safari Ball' },
    { id: 'net', name: 'Net Ball' },
    { id: 'dive', name: 'Dive Ball' },
    { id: 'nest', name: 'Nest Ball' },
    { id: 'repeat', name: 'Repeat Ball' },
    { id: 'timer', name: 'Timer Ball' },
    { id: 'luxury', name: 'Luxury Ball' },
    { id: 'premier', name: 'Premier Ball' },
    { id: 'dusk', name: 'Dusk Ball' },
    { id: 'heal', name: 'Heal Ball' },
    { id: 'quick', name: 'Quick Ball' },
    { id: 'cherish', name: 'Cherish Ball' },
    { id: 'dream', name: 'Dream Ball' },
  ].map((ball) => Object.freeze({ desc: 'Coming soon.', ...ball }))
);

// Belt prices in PokeCoins, by belt number (#137; Jess 2026-11-16 mockup, 2026-11-17 B3; TUNE, BALANCE.md).
// Belt 1 comes with every save; each belt holds six balls and is bought in order.
G.BELT_PRICES = Object.freeze({ 2: 10000, 3: 15000 });
