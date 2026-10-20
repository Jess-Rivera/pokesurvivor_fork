/* ============ gyms.js: hand-authored gym leaders (feature/boss-rework) ============
 * One entry per gym, in region order. Format and rules: docs/BOSS-AUTHORING.md. This is the PILOT: Kanto gym 1 only.
 * Moves may only be ids from G.Moves (js/data/moves.js). Each move line: id, weight, range (close | far | any), optional hpBelow
 * (use only below that fraction of max HP) and optional `stacks`: upgrade-card stacks the move carries, by mechanic id from
 * js/data/mechanics.js (effect, recharge, count, pierce, area, width, arc, size, range, speed, duration, knock, stacks...). They go
 * through the SAME upgrade system as the player's cards (G.Moves.addStack), so a leader's move is a leveled-up player move.
 * A move kind decides its boss form (see Enemy.gymStart).
 * The gym level is the run-time level when the gate spawns plus LEVEL_OFFSET, locked at spawn.
 */
G.Gyms = (() => {
  const LEVEL_OFFSET = 4;
  const TTK = 60;                 // target seconds of focused fire (Jess, 2026-10-19: about 60 s for the pilot)
  const ENRAGE_AFTER = 120;       // seconds after engagement
  const KANTO = [
    // boost: the badge's run-long team buff (mainline: Boulder = +10% Attack). stat is one of hp, atk, def, spa, spd, spe.
    { id: 'kanto-gym-1', leader: 'Brock', badge: 'Boulder Badge', arena: 'rock', boost: { stat: 'atk', pct: 0.10 },
      signatures: [
        // power: damage multiplier on the ratio path; tempo: attack-rate multiplier (shorter wind-up/recovery/cooldown). Both TUNE, default 1.
        { species: 'Geodude', dex: 74, stance: 'mixed', power: 1, tempo: 1, moves: [
          { id: 'tackle', weight: 2, range: 'close', stacks: { effect: 2, area: 1, arc: 1, recharge: 2 } },
          { id: 'rock-throw', weight: 3, range: 'any', stacks: { effect: 3, count: 2, recharge: 2, size: 1, speed: 1 } },
          // Slice E2a: Harden is the player's stage version now (+1 Defense per cast, 8 s). Buff Stacks no longer exists for it, so only Duration is authored.
          { id: 'harden', weight: 1, range: 'any', stacks: { duration: 2 } }
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
    if (g.boost && (!['hp', 'atk', 'def', 'spa', 'spd', 'spe'].includes(g.boost.stat) || !(g.boost.pct > 0 && g.boost.pct <= 1))) bad.push('boost needs a stat (hp, atk, def, spa, spd, spe) and a pct in (0, 1]');
    if (!g.signatures || !g.signatures.length || g.signatures.length > 6) bad.push('signatures must be 1 to 6');
    for (const s of g.signatures || []) for (const k of ['power', 'tempo']) if (s[k] != null && !(s[k] > 0 && s[k] <= 5)) bad.push(s.species + ': ' + k + ' must be in (0, 5]');
    for (const s of g.signatures || []) {
      if (!G.DEX_BY[s.dex]) bad.push('unknown dex ' + s.dex);
      else if (G.DEX_BY[s.dex].name !== s.species) bad.push('species/dex mismatch ' + s.species);
      if (!s.moves || !s.moves.length) bad.push(s.species + ' has no moves');
      for (const m of s.moves || []) {
        if (!G.Moves.BY_ID[m.id]) bad.push(s.species + ': unknown move ' + m.id);
        if (!(m.weight > 0)) bad.push(s.species + ': ' + m.id + ' needs a weight');
        if (!['close', 'far', 'any'].includes(m.range)) bad.push(s.species + ': ' + m.id + ' has a bad range');
        if (G.Moves.BY_ID[m.id]) {         // every authored stack must be accepted by the real upgrade rules, in order
          const inst = G.Moves.instance(m.id);
          for (const id in m.stacks || {}) for (let i = 0; i < m.stacks[id]; i++) {
            if (!G.Moves.addStack(inst, id)) { bad.push(s.species + ': ' + m.id + ' cannot take ' + id + ' x' + (i + 1) + ' (' + (G.Mechanics.BY_ID[id] ? G.Mechanics.reason(inst, G.Mechanics.BY_ID[id]) : 'unknown mechanic') + ')'); break; }
          }
        }
      }
    }
    return bad;
  }

  const STAT_LABEL = { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };

  return { STAT_LABEL, LEVEL_OFFSET, TTK, ENRAGE_AFTER, KANTO, listFor, validate };
})();
