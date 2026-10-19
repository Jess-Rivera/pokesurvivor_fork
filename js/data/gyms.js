/* ============ gyms.js: hand-authored gym leaders (feature/boss-rework) ============
 * One entry per gym, in region order. Format and rules: docs/BOSS-AUTHORING.md. This is the PILOT: Kanto gym 1 only.
 * Moves may only be ids from G.Moves (js/data/moves.js). Each move line: id, weight, range (close | far | any), optional hpBelow
 * (use only below that fraction of max HP). A move kind decides its boss form (see Enemy.gymStart).
 * The gym level is the run-time level when the gate spawns plus LEVEL_OFFSET, locked at spawn.
 */
G.Gyms = (() => {
  const LEVEL_OFFSET = 4;
  const TTK = 60;                 // target seconds of focused fire (Jess, 2026-10-19: about 60 s for the pilot)
  const ENRAGE_AFTER = 120;       // seconds after engagement
  const KANTO = [
    { id: 'kanto-gym-1', leader: 'Brock', badge: 'Boulder Badge', arena: 'rock',
      signatures: [
        { species: 'Geodude', dex: 74, stance: 'mixed', moves: [
          { id: 'tackle', weight: 2, range: 'close' },
          { id: 'rock-throw', weight: 3, range: 'any' },
          { id: 'harden', weight: 1, range: 'any' }
        ] }
      ] }
  ];
  const REGIONS = { 1: KANTO };

  /** The ordered gym list for a run region (null = all regions: Kanto for now). */
  function listFor(region) { return REGIONS[region == null ? 1 : region] || []; }

  /** Checks an entry against the catalog; returns a list of problems (empty = valid). */
  function validate(g) {
    const bad = [];
    if (!g.leader || !g.badge || !g.arena) bad.push('missing leader, badge or arena');
    if (!g.signatures || !g.signatures.length || g.signatures.length > 6) bad.push('signatures must be 1 to 6');
    for (const s of g.signatures || []) {
      if (!G.DEX_BY[s.dex]) bad.push('unknown dex ' + s.dex);
      else if (G.DEX_BY[s.dex].name !== s.species) bad.push('species/dex mismatch ' + s.species);
      if (!s.moves || !s.moves.length) bad.push(s.species + ' has no moves');
      for (const m of s.moves || []) {
        if (!G.Moves.BY_ID[m.id]) bad.push(s.species + ': unknown move ' + m.id);
        if (!(m.weight > 0)) bad.push(s.species + ': ' + m.id + ' needs a weight');
        if (!['close', 'far', 'any'].includes(m.range)) bad.push(s.species + ': ' + m.id + ' has a bad range');
      }
    }
    return bad;
  }

  return { LEVEL_OFFSET, TTK, ENRAGE_AFTER, KANTO, listFor, validate };
})();
