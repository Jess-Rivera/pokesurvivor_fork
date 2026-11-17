/* ============ balls.js: the ball catalog the Main Menu Shop shows (G.BALL_CATALOG; #149 149e) ============
 * Every ball in shop order (Poke, Great, Ultra, Master, then mainline item order), each with its id (its sprite strip's
 * name, G.BALL_SPRITES), its name and a one-line description (desc, as team items have) for its Shop card. Which
 * balls a throw can use and how well they catch is G.Catch's (js/systems/catch.js BALLS); #137 adds unlock prices and
 * the Great and Ultra tiers here.
 * Descriptions (Jess 2026-11-17, E2): honest lines for the four planned balls; the rest say "Coming soon." until they
 * have a use in this game.
 */
G.BALL_CATALOG = Object.freeze(
  [
    { id: 'poke', name: 'Poke Ball', desc: 'The standard ball for catching rescued Pokemon.' },
    { id: 'great', name: 'Great Ball', desc: 'Catches 1.5x as well as a Poke Ball.' },
    { id: 'ultra', name: 'Ultra Ball', desc: 'Catches 2x as well as a Poke Ball.' },
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
