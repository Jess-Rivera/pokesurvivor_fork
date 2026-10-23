/* ============ gyms.js: hand-authored gym leaders (feature/boss-rework) ============
 * One entry per gym, in region order. Format and rules: docs/BOSS-AUTHORING.md. Roster DESIGN (who, in what order, why): docs/GYM-ROSTERS.md.
 * Moves may only be ids from G.Moves (js/data/moves.js). Each move line: id, weight, range (close | far | any), optional hpBelow
 * (use only below that fraction of max HP) and optional `stacks`: upgrade-card stacks the move carries, by mechanic id from
 * js/data/mechanics.js (effect, recharge, count, pierce, area, width, arc, size, range, speed, duration, knock, stacks...). They go
 * through the SAME upgrade system as the player's cards (G.Moves.addStack), so a leader's move is a leveled-up player move.
 * A move kind decides its boss form (see Enemy.gymStart); BOSS_FORMS lists the kinds that are actually built.
 *
 * A SIGNATURE is one roster slot (an evolution LINE). Its `line` is an ordered stage ladder [{ dex, minLevel }]: the stage shown is the
 * last one whose minLevel is <= the gym's effective level (stageFor), so a slot evolves as the level climbs, and evolution requirements
 * are ignored. Moves, stance, power and tempo belong to the slot, so one move set serves every stage of the line.
 * Loop N fields the first N signatures at once (lineup). The gym level is the run-time level when the gate spawns plus LEVEL_OFFSET,
 * locked at spawn.
 */
G.Gyms = (() => {
  const LEVEL_OFFSET = 4;
  const TTK = 60;                 // target seconds of focused fire (Jess, 2026-10-19: about 60 s for the pilot)
  const ENRAGE_AFTER = 120;       // seconds after engagement
  const LOOPS = 6;                // loops per region (docs/FULL-GAME-STRUCT.md); loop N fields N roster slots
  const MAX_MOVES = 4;
  // Placeholder stage bands (TUNE, docs/GYM-ROSTERS.md): a 2-stage line shows its final form at 35; a 3-stage line shows its mid form at 20.
  const STAGE_BANDS = { mid: 20, final: 35 };
  // Move kinds that have a built boss form (Enemy.gymCast: melee and buff have their own form, everything else is the projectile path).
  // Add a kind here only when its boss form is built and tested; validate() rejects every other kind instead of letting it misfire.
  const BOSS_FORMS = ['melee', 'projectile', 'buff'];
  const STANCES = ['close', 'far', 'mixed'];
  const RANGES = ['close', 'far', 'any'];
  const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const GYM_KEYS = ['id', 'leader', 'badge', 'arena', 'boost', 'signatures'];
  const SIG_KEYS = ['line', 'stance', 'power', 'tempo', 'moves'];
  const MOVE_KEYS = ['id', 'weight', 'range', 'hpBelow', 'stacks'];

  /** Builds a stage ladder from national dex numbers, base form first. Levels default to STAGE_BANDS; pass `levels` to override per line. */
  function ladder(dexes, levels) {
    const n = dexes.length;
    const lv = levels || (n === 1 ? [1] : n === 2 ? [1, STAGE_BANDS.final] : [1, STAGE_BANDS.mid, STAGE_BANDS.final]);
    return dexes.map((dex, i) => ({ dex, minLevel: lv[i] }));
  }

  const KANTO = [
    // boost: the badge's run-long team buff (mainline: Boulder = +10% Attack). stat is one of hp, atk, def, spa, spd, spe.
    { id: 'kanto-gym-1', leader: 'Brock', badge: 'Boulder Badge', arena: 'rock', boost: { stat: 'atk', pct: 0.10 },
      signatures: [
        // power: damage multiplier on the ratio path; tempo: attack-rate multiplier (shorter wind-up/recovery/cooldown). Both TUNE, default 1.
        // Slot 1: Geodude -> Graveler -> Golem (the pilot; hand-tuned).
        { line: ladder([74, 75, 76]), stance: 'mixed', power: 1, tempo: 1, moves: [
          { id: 'tackle', weight: 2, range: 'close', stacks: { effect: 2, area: 1, arc: 1, recharge: 2 } },
          { id: 'rock-throw', weight: 3, range: 'any', stacks: { effect: 3, count: 2, recharge: 2, size: 1, speed: 1 } },
          // Slice E2a: Harden is the player's stage version now (+1 Defense per cast, 8 s). Buff Stacks no longer exists for it, so only Duration is authored.
          { id: 'harden', weight: 1, range: 'any', stacks: { duration: 2 } }
        ] },
        // Slots 2 to 6: PROVISIONAL move sets (TUNE, no stacks yet), built only from the boss forms that exist. Balance pass pending.
        // Slot 2: Rhyhorn -> Rhydon, the Ground-lean bruiser.
        { line: ladder([111, 112]), stance: 'close', power: 1, tempo: 1, moves: [
          { id: 'body-slam', weight: 3, range: 'close' },
          { id: 'rock-throw', weight: 2, range: 'any' },
          { id: 'swords-dance', weight: 1, range: 'any', hpBelow: 0.5 }
        ] },
        // Slot 3: Omanyte -> Omastar, the special threat.
        { line: ladder([138, 139]), stance: 'far', power: 1, tempo: 1, moves: [
          { id: 'water-gun', weight: 3, range: 'far' },
          { id: 'rock-throw', weight: 2, range: 'any' },
          { id: 'harden', weight: 1, range: 'any' }
        ] },
        // Slot 4: Kabuto -> Kabutops, the fast physical one.
        { line: ladder([140, 141]), stance: 'close', power: 1, tempo: 1, moves: [
          { id: 'metal-claw', weight: 3, range: 'close' },
          { id: 'water-gun', weight: 2, range: 'any' },
          { id: 'swords-dance', weight: 1, range: 'any', hpBelow: 0.6 }
        ] },
        // Slot 5: Onix -> Steelix (Gen-2 line-completion), the Defense wall.
        { line: ladder([95, 208]), stance: 'close', power: 1, tempo: 1, moves: [
          { id: 'body-slam', weight: 2, range: 'close' },
          { id: 'rock-throw', weight: 3, range: 'any' },
          { id: 'harden', weight: 2, range: 'any' }
        ] },
        // Slot 6: Aerodactyl, the speed ace (single stage).
        { line: ladder([142]), stance: 'mixed', power: 1, tempo: 1, moves: [
          { id: 'wing-attack', weight: 3, range: 'close' },
          { id: 'rock-throw', weight: 2, range: 'any' },
          { id: 'agility', weight: 1, range: 'any' }
        ] }
      ] }
  ];
  const REGIONS = { 1: KANTO };

  /** The ordered gym list for a run region (null = all regions: Kanto for now). */
  function listFor(region) { return REGIONS[region == null ? 1 : region] || []; }
  /** Every region's gym list, for validation sweeps. */
  function allRegions() { return Object.keys(REGIONS).map(r => ({ region: +r, gyms: REGIONS[r] })); }

  /** Index into sig.line of the stage that applies at `level`: the last stage whose minLevel is <= level (the first stage if none). Pure. */
  function stageIndex(sig, level) {
    let at = 0;
    for (let i = 1; i < sig.line.length; i++) if (level >= sig.line[i].minLevel) at = i;
    return at;
  }
  /** The stage { dex, minLevel } a slot shows at `level`. Pure. */
  function stageFor(sig, level) { return sig.line[stageIndex(sig, level)]; }

  /** The mons a gym fields in loop `loop` at `level`: the FIRST N signatures in slot order (N = loop, clamped to 1..roster size),
   *  each as { index, sig, stage, dex }. This is the one place the "loop N fields the first N" rule lives. Pure. */
  function lineup(entry, loop, level) {
    const want = Number.isFinite(loop) ? Math.floor(loop) : 1;
    const n = Math.max(1, Math.min(entry.signatures.length, want));
    const out = [];
    for (let i = 0; i < n; i++) {
      const sig = entry.signatures[i], at = stageIndex(sig, level);
      out.push({ index: i, sig, stage: at, dex: sig.line[at].dex });
    }
    return out;
  }

  const unknownKeys = (o, allowed) => Object.keys(o).filter(k => !allowed.includes(k));
  const sigName = s => (s && s.line && s.line[0] && G.DEX_BY[s.line[0].dex] ? G.DEX_BY[s.line[0].dex].name : '?');

  /** Checks an entry against the catalog; returns a list of problems (empty = valid). */
  function validate(g) {
    const bad = [];
    if (!g.leader || !g.badge || !g.arena) bad.push('missing leader, badge or arena');
    for (const k of unknownKeys(g, GYM_KEYS)) bad.push((g.leader || '?') + ': unknown field ' + k);
    if (g.boost && (!STATS.includes(g.boost.stat) || !(g.boost.pct > 0 && g.boost.pct <= 1))) bad.push('boost needs a stat (hp, atk, def, spa, spd, spe) and a pct in (0, 1]');
    if (!g.signatures || !g.signatures.length || g.signatures.length > 6) bad.push('signatures must be 1 to 6');
    for (const s of g.signatures || []) {
      const who = sigName(s);
      for (const k of unknownKeys(s, SIG_KEYS)) bad.push(who + ': unknown field ' + k);
      if (s.stance != null && !STANCES.includes(s.stance)) bad.push(who + ': bad stance ' + s.stance);
      for (const k of ['power', 'tempo']) if (s[k] != null && !(s[k] > 0 && s[k] <= 5)) bad.push(who + ': ' + k + ' must be in (0, 5]');
      // the stage ladder: non-empty, starts at level 1, strictly increasing, every dex real
      if (!Array.isArray(s.line) || !s.line.length) bad.push(who + ': line must be a non-empty stage ladder');
      else {
        s.line.forEach((st, i) => {
          if (!G.DEX_BY[st.dex]) bad.push(who + ': unknown dex ' + st.dex);
          if (!Number.isInteger(st.minLevel) || st.minLevel < 1) bad.push(who + ': stage ' + i + ' needs an integer minLevel >= 1');
          else if (i === 0 && st.minLevel !== 1) bad.push(who + ': the first stage must start at level 1');
          else if (i > 0 && st.minLevel <= s.line[i - 1].minLevel) bad.push(who + ': stage levels must increase');
        });
      }
      if (!s.moves || !s.moves.length) bad.push(who + ' has no moves');
      else if (s.moves.length > MAX_MOVES) bad.push(who + ' has more than ' + MAX_MOVES + ' moves');
      let damaging = 0;
      for (const m of s.moves || []) {
        for (const k of unknownKeys(m, MOVE_KEYS)) bad.push(who + ': ' + m.id + ' has unknown field ' + k);
        if (!(m.weight > 0)) bad.push(who + ': ' + m.id + ' needs a weight');
        if (!RANGES.includes(m.range)) bad.push(who + ': ' + m.id + ' has a bad range');
        const cat = G.Moves.BY_ID[m.id];
        if (!cat) { bad.push(who + ': unknown move ' + m.id); continue; }
        if (cat.cat !== 'status') damaging++;
        if (!BOSS_FORMS.includes(cat.kind)) bad.push(who + ': ' + m.id + ' is a ' + cat.kind + ' move, which has no boss form yet');
        const inst = G.Moves.instance(m.id);      // every authored stack must be accepted by the real upgrade rules, in order
        for (const id in m.stacks || {}) for (let i = 0; i < m.stacks[id]; i++) {
          if (!G.Moves.addStack(inst, id)) { bad.push(who + ': ' + m.id + ' cannot take ' + id + ' x' + (i + 1) + ' (' + (G.Mechanics.BY_ID[id] ? G.Mechanics.reason(inst, G.Mechanics.BY_ID[id]) : 'unknown mechanic') + ')'); break; }
        }
      }
      if (s.moves && s.moves.length && !damaging) bad.push(who + ' needs at least one damaging move');
    }
    return bad;
  }

  const STAT_LABEL = { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };

  return { STAT_LABEL, LEVEL_OFFSET, TTK, ENRAGE_AFTER, LOOPS, STAGE_BANDS, BOSS_FORMS, KANTO, listFor, allRegions, stageIndex, stageFor, lineup, validate };
})();
