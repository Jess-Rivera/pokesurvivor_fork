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
    'swords-dance': { cd: 8, why: 'no cd set yet (legacy 8)' },
    'agility':      { cd: 8, why: 'no cd set yet (legacy 8)' },
    'harden':       { cd: 8, why: 'no cd set yet (legacy 8)' },
    'aqua-ring':    { cd: 8, why: 'no cd set yet (legacy 8)' },
    'dragon-dance': { cd: 8, why: 'no cd set yet (legacy 8)' },
    'string-shot':  { cd: 0.5, why: 'no cd set yet (legacy 1.1)' },
    'spikes':       { cd: 1.1, why: 'no cd set yet (legacy 1.2)' },
    'toxic-spikes': { cd: 1.1, why: 'no cd set yet (legacy 1.1)' },
    'hail':         { cd: 1.2, why: 'no cd set yet (legacy 1.2)' },
    'will-o-wisp':  { cd: 3.5, why: 'no cd set yet (legacy 3.5)' },
    'substitute':   { cd: 4, why: 'no cd set yet (legacy 4)' },
    'dragon-rage':  { cd: 3.5, why: 'no cd set yet (legacy 1)' },
    'bug-bite':     { cd: 0.42, why: 'no cd set yet (legacy 0.42)' },
    'shadow-ball':  { cd: 1.2, why: 'no cd set, needs longer to make up for benefits' }
  };
})();
