/* ============ move-overrides.js, per-move overrides (slice 2 of the move-schema rewrite, #2) ============
 * Only the moves and fields that are hand-set. Keyed by move id; each entry holds the fields it replaces (the whole
 * field is replaced, nothing is merged) plus a one-line `why`. A rule change belongs in move-resolver.js, not here.
 * Load order: move-attributes.js, moves-generated.js, move-overrides.js, move-handler.js, move-resolver.js.
 * GROUNDWORK: not listed in dev.html and read by nothing in the game yet.
 *
 * Each entry sets a hand cd: status and flat-damage moves have no Power, so the cooldown formula does not apply, and a few
 * powered moves are hand-tuned (the why says so). Swords Dance, Agility, Harden and Dragon Dance have no entry: they are pure
 * buffs and cast on their Gate, with no cooldown (COMBAT-RULES "Stat stages" SS8, slice 5a). Aqua Ring has none either: it is a
 * persistent aura (slice 5a, MOVE-INTENT aqua-ring 2026-10-31).
 * The legacy hand cd (js/data/moves.js) is noted in each why, for reference only; nothing reads it. */
(() => {
  G.MoveOverrides = {
    'string-shot': { cd: 1.1, why: 'Jess 2026-10-29: 0.5 was a regression, restored to legacy 1.1' },
    spikes: { cd: 1.1, why: 'no cd set yet (legacy 1.2)' },
    'toxic-spikes': { cd: 1.1, why: 'no cd set yet (legacy 1.1)' },
    hail: { cd: 1.2, why: 'no cd set yet (legacy 1.2)' },
    'will-o-wisp': { cd: 3.5, why: 'no cd set yet (legacy 3.5)' },
    substitute: { cd: 12, why: 'slice 4b S1: 12 s, armed when the 4 s shield ends (cooldown freeze); legacy 4' },
    'dragon-rage': { cd: 3.5, why: 'no cd set yet (legacy 1)' },
    'bug-bite': { cd: 0.42, why: 'no cd set yet (legacy 0.42)' },
    'shadow-ball': { cd: 1.2, why: 'no cd set, needs longer to make up for benefits' },
    gust: {
      cd: 0.7,
      why: 'Jess 2026-10-31 (slice 6 movechecker pass): the 0.5 formula cd felt too fast, hand-set to 0.7',
    },
    // Kanto import batch 1 (2026-11-01), signed off in the batch review (Jess 2026-11-02): status shots near Will-O-Wisp, foe drops shorter, big heals long.
    'sand-tomb': { cd: 2.5, why: 'Jess 2026-11-02 (batch 1 review): one patch at a time, cd matches its 2.5 s life' },
    'lovely-kiss': { cd: 4, why: 'Kanto batch 1: sleep shot, proposed 4' },
    sing: { cd: 4, why: 'Kanto batch 1: sleep shot, proposed 4' },
    hypnosis: { cd: 4, why: 'Kanto batch 1: sleep shot, proposed 4' },
    'sleep-powder': { cd: 4, why: 'Kanto batch 1: sleep shot, proposed 4' },
    spore: { cd: 4, why: 'Kanto batch 1: sleep shot, proposed 4' },
    'thunder-wave': { cd: 3.5, why: 'Kanto batch 1: paralysis shot, proposed 3.5 (as Will-O-Wisp)' },
    'stun-spore': { cd: 3.5, why: 'Kanto batch 1: paralysis shot, proposed 3.5 (as Will-O-Wisp)' },
    glare: { cd: 3.5, why: 'Kanto batch 1: paralysis shot, proposed 3.5 (as Will-O-Wisp)' },
    'poison-powder': { cd: 3.5, why: 'Kanto batch 1: poison shot, proposed 3.5 (as Will-O-Wisp)' },
    supersonic: { cd: 3.5, why: 'Kanto batch 1: confusion shot, proposed 3.5' },
    'confuse-ray': { cd: 3.5, why: 'Kanto batch 1: confusion shot, proposed 3.5' },
    'mean-look': { cd: 3.5, why: 'Kanto batch 1: trap shot, proposed 3.5' },
    screech: { cd: 3, why: 'Kanto batch 1: foe Defense -2 shot, proposed 3' },
    'scary-face': { cd: 3, why: 'Kanto batch 1: foe Speed -2 shot, proposed 3' },
    growl: { cd: 3, why: 'Kanto batch 1: foe Attack -1 ring, proposed 3' },
    leer: { cd: 3, why: 'Kanto batch 1: foe Defense -1 ring, proposed 3' },
    'tail-whip': { cd: 3, why: 'Kanto batch 1: foe Defense -1 ring, proposed 3' },
    recover: { cd: 12, why: 'Kanto batch 1: heals 50% max HP, proposed 12 (as Substitute)' },
    synthesis: { cd: 12, why: 'Kanto batch 1: heals 50% max HP, proposed 12 (as Substitute)' },
    moonlight: { cd: 12, why: 'Kanto batch 1: heals 50% max HP, proposed 12 (as Substitute)' },
    roar: { cd: 5, why: 'Lore-set import 2026-11-02: push-only ring, TUNE 5 so it does not crowd out the attacks' },
  };
})();
