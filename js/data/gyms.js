/* ============ gyms.js: hand-authored gym leaders (feature/boss-rework) ============
 * One entry per gym, in region order. Format and rules: docs/BOSS-AUTHORING.md. Roster DESIGN (who, in what order, why): docs/GYM-ROSTERS.md.
 * Slice 7a (D-ENEMY, Jess 2026-10-31): a leader's mon plays like the player. Moves are ids from G.MoveDefs (the new move data); each
 * move line is the id plus an optional hpBelow (the move joins the mon's moves only below that fraction of max HP). They all cast
 * through G.MoveSim on their own cooldowns, pure buffs on their Gate (js/entities/boss-ai.js). A slot's `cards` are upgrade cards by
 * id from G.TeamCards (damage, count, velocity, area...), held by that mon only and folded by the SAME rules as the player's cards, so
 * each card applies to every one of the mon's moves it fits. Team cards (Gate, Duration, Regen, Vitamins) are not allowed: enemies
 * use the base stage timers (COMBAT-RULES:SS10). formOf says which moves a leader can cast (melee cones, shots, self buffs).
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
  const STANCES = ['close', 'far', 'mixed'];
  const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const GYM_KEYS = ['id', 'leader', 'badge', 'arena', 'boost', 'signatures'];
  const SIG_KEYS = ['line', 'stance', 'power', 'tempo', 'cards', 'moves'];
  const MOVE_KEYS = ['id', 'hpBelow'];

  /** How a leader casts a new-path move (slice 7a), or null when it cannot yet: 'melee' (a cone at its body, aimed at you), 'shot' (shapes
   *  that travel straight along the aim) or 'buff' (a pure self stat change). Emitters, chains, delays, persistent moves and caster
   *  commitments have no gym form; validate() rejects them instead of letting them misfire. Read by the GymBrain too. */
  function formOf(d) {
    if (!d) return null;
    const v = d.delivery || {}, p = d.payload || [];
    if (p.some(fx => fx.t === 'emit') || d.persistent || d.casterState || v.delay || (d.space && d.space.chainHops)) return null;
    if (!d.space) return p.length && p.every(fx => fx.t === 'stat' && fx.side !== 'foe') ? 'buff' : null;
    if (v.anchor !== 'caster') return null;
    if (v.motion === 'static' && v.targeting === 'nearest' && d.space.shape === 'radial') return 'melee';     // a cone; beams wait for their own form
    if (v.motion === 'travels' && v.targeting === 'direction' && !v.path && !v.aimTrack) return 'shot';
    return null;
  }

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
        // power: damage multiplier on the ratio path; tempo: attack-rate multiplier (cooldowns, tell and recovery divided by it). Both TUNE, default 1.
        // Slot 1: Geodude -> Graveler -> Golem (the pilot; hand-tuned). Cards (Jess 2026-10-31): Tackle Power 52, reach 70; Rock Throw Power 58.5,
        // 3 rocks of size 11.7 at 377 px/s; Harden takes none.
        { line: ladder([74, 75, 76]), stance: 'mixed', power: 1, tempo: 1, cards: { damage: 3, count: 2, velocity: 3, area: 2 }, moves: [
          { id: 'tackle' },
          { id: 'rock-throw' },
          { id: 'harden' }
        ] },
        // Slots 2 to 6: PROVISIONAL move sets (TUNE, no cards yet; the gym-roster branch authors them). Balance pass pending.
        // Slot 2: Rhyhorn -> Rhydon, the Ground-lean bruiser.
        { line: ladder([111, 112]), stance: 'close', power: 1, tempo: 1, moves: [
          { id: 'body-slam' },
          { id: 'rock-throw' },
          { id: 'swords-dance', hpBelow: 0.5 }
        ] },
        // Slot 3: Omanyte -> Omastar, the special threat.
        { line: ladder([138, 139]), stance: 'far', power: 1, tempo: 1, moves: [
          { id: 'water-gun' },
          { id: 'rock-throw' },
          { id: 'harden' }
        ] },
        // Slot 4: Kabuto -> Kabutops, the fast physical one.
        { line: ladder([140, 141]), stance: 'close', power: 1, tempo: 1, moves: [
          { id: 'metal-claw' },
          { id: 'water-gun' },
          { id: 'swords-dance', hpBelow: 0.6 }
        ] },
        // Slot 5: Onix -> Steelix (Gen-2 line-completion), the Defense wall.
        { line: ladder([95, 208]), stance: 'close', power: 1, tempo: 1, moves: [
          { id: 'body-slam' },
          { id: 'rock-throw' },
          { id: 'harden' }
        ] },
        // Slot 6: Aerodactyl, the speed ace (single stage).
        { line: ladder([142]), stance: 'mixed', power: 1, tempo: 1, moves: [
          { id: 'wing-attack' },
          { id: 'rock-throw' },
          { id: 'agility' }
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
        if (m.hpBelow != null && !(m.hpBelow > 0 && m.hpBelow < 1)) bad.push(who + ': ' + m.id + ' hpBelow must be in (0, 1)');
        const d = G.MoveDefs[m.id];
        if (!d) { bad.push(who + ': unknown move ' + m.id); continue; }
        if (d.basePower > 0) damaging++;
        if (!formOf(d)) bad.push(who + ': ' + m.id + ' has no gym form yet (leaders cast melee cones, straight shots and self buffs)');
      }
      if (s.moves && s.moves.length && !damaging) bad.push(who + ' needs at least one damaging move');
      // cards: the player's card rules, per mon (slice 7a); each must exist, be a move card, respect its cap and fit at least one move
      const cards = s.cards || {};
      for (const id of Object.keys(cards)) {
        const c = G.TeamCards.BY_ID[id], n = cards[id];
        if (!c) bad.push(who + ': unknown card ' + id);
        else if (c.team) bad.push(who + ': ' + id + ' is a team card, and leaders use the base stage timers');
        else if (!Number.isInteger(n) || n < 1) bad.push(who + ': card ' + id + ' needs a whole number of stacks');
        else if (c.cap && n > c.cap) bad.push(who + ': card ' + id + ' is capped at ' + c.cap);
        else if (!(s.moves || []).some(m => G.MoveDefs[m.id] && G.TeamCards.targets(c, G.MoveDefs[m.id]).length)) bad.push(who + ': card ' + id + ' fits none of its moves');
      }
    }
    return bad;
  }

  const STAT_LABEL = { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };

  return { STAT_LABEL, LEVEL_OFFSET, TTK, ENRAGE_AFTER, LOOPS, STAGE_BANDS, KANTO, listFor, allRegions, stageIndex, stageFor, lineup, formOf, validate };
})();
