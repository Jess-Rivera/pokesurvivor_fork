/* ============ move-overrides.js, per-move overrides (slice 2 of the move-schema rewrite, #2) ============
 * Only the moves and fields that are hand-set. Keyed by move id; each entry holds the fields it replaces (the whole
 * field is replaced, nothing is merged) plus a one-line `why`. A rule change belongs in move-resolver.js, not here.
 * Load order: move-attributes.js, moves-generated.js, move-overrides.js, move-handler.js, move-resolver.js.
 * GROUNDWORK: not listed in dev.html and read by nothing in the game yet.
 *
 * The 14 entries below are empty on purpose: these moves have no Power (status moves plus Dragon Rage and Night Shade),
 * so the cooldown formula does not apply, and the data carries no cd for them. Fill in `cd` to give each one a cooldown.
 * The legacy hand cd (js/data/moves.js) is noted in each why, for reference only; nothing reads it. */
(() => {
  G.MoveOverrides = {
    'swords-dance': { why: 'no cd set yet (legacy 8)' },
    'agility':      { why: 'no cd set yet (legacy 8)' },
    'harden':       { why: 'no cd set yet (legacy 8)' },
    'aqua-ring':    { why: 'no cd set yet (legacy 8)' },
    'dragon-dance': { why: 'no cd set yet (legacy 8)' },
    'toxic':        { why: 'no cd set yet (legacy 0.3)' },
    'string-shot':  { why: 'no cd set yet (legacy 1.1)' },
    'spikes':       { why: 'no cd set yet (legacy 1.2)' },
    'toxic-spikes': { why: 'no cd set yet (legacy 1.1)' },
    'hail':         { why: 'no cd set yet (legacy 1.2)' },
    'will-o-wisp':  { why: 'no cd set yet (legacy 3.5)' },
    'substitute':   { why: 'no cd set yet (legacy 4)' },
    'dragon-rage':  { why: 'no cd set yet (legacy 1)' },
    'night-shade':  { why: 'no cd set yet (legacy 0.5)' },
  };
})();
