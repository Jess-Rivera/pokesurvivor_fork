/* ============ gyms.js: hand-authored gym leaders (feature/boss-rework) ============
 * One entry per gym, in region order. Format and rules: docs/BOSS-AUTHORING.md. Roster DESIGN (who, in what order, why): docs/GYM-ROSTERS.md.
 * Slice 7a (D-ENEMY, Jess 2026-10-31): a leader's mon plays like the player. Moves are ids from G.MoveDefs (the new move data); each
 * move line is the id plus an optional hpBelow (the move joins the mon's moves only below that fraction of max HP). Per-loop sets
 * (Jess 2026-11-02): a slot's `sets` maps a loop number to its move lines, starting at the loop the slot enters (slot N enters loop N);
 * a loop with no set keeps the last earlier one (movesFor). They all cast
 * through G.MoveSim on their own cooldowns, pure buffs on their Gate (js/entities/boss-ai.js). A slot's `cards` are upgrade cards by
 * id from G.TeamCards (damage, count, velocity, area...), held by that mon only and folded by the SAME rules as the player's cards, so
 * each card applies to every one of the mon's moves it fits. Team cards (Gate, Duration, Regen, Vitamins) are not allowed: enemies
 * use the base stage timers (COMBAT-RULES:SS10). formOf says which moves a leader can cast (melee cones, shots, self buffs, self heals).
 *
 * A SIGNATURE is one roster slot (an evolution LINE). Its `line` is an ordered stage ladder [{ dex, minLevel }]: the stage shown is the
 * last one whose minLevel is <= the gym's effective level (stageFor), so a slot evolves as the level climbs, and evolution requirements
 * are ignored. Moves, stance, power and tempo belong to the slot, so a loop's move set serves every stage of the line.
 * Loop N fields the first N signatures at once (lineup). The gym level is the run-time level when the gate spawns plus LEVEL_OFFSET,
 * locked at spawn.
 */
G.Gyms = (() => {
  const LEVEL_OFFSET = 4;
  const TTK = 60; // target seconds of focused fire (Jess, 2026-10-19: about 60 s for the pilot)
  const ENRAGE_AFTER = 120; // seconds after engagement
  const LOOPS = 6; // loops per region (docs/FULL-GAME-STRUCT.md); loop N fields N roster slots
  const MAX_MOVES = 4;
  // Placeholder stage bands (TUNE, docs/GYM-ROSTERS.md): a 2-stage line shows its final form at 35; a 3-stage line shows its mid form at 20.
  const STAGE_BANDS = { mid: 20, final: 35 };
  const STANCES = ['close', 'far', 'mixed'];
  const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const GYM_KEYS = ['id', 'leader', 'badge', 'arena', 'boost', 'signatures'];
  const SIG_KEYS = ['line', 'stance', 'power', 'tempo', 'cards', 'sets'];
  const MOVE_KEYS = ['id', 'hpBelow'];

  /** How a leader casts a new-path move (slice 7a), or null when it cannot yet: 'melee' (a cone at its body, aimed at you), 'nova' (a ring or
   *  half ring that grows out of its body: Heat Wave, Dazzling Gleam), 'shot' (shapes that travel along the aim, homing ones included:
   *  Psychic), 'strike' (lands on a spot, locked when its tell starts: Thunderbolt), 'buff' (a pure self stat change) or 'heal' (a self
   *  heal of max HP: Recover, Synthesis, Moonlight; Jess 2026-11-02). A chain move takes
   *  its shape's form; its hops search the caster's foes (G.MoveSim). Emitters, delays, persistent moves and caster commitments have no gym
   *  form; validate() rejects them instead of letting them misfire. Read by the GymBrain too. */
  function formOf(d) {
    if (!d) return null;
    const v = d.delivery || {},
      p = d.payload || [];
    if (p.some((fx) => fx.t === 'emit') || d.persistent || d.casterState || v.delay) return null;
    if (!d.space) {
      if (p.length && p.every((fx) => fx.t === 'stat' && fx.side !== 'foe')) return 'buff';
      return p.length && p.every((fx) => fx.t === 'heal' && fx.side === 'self' && fx.amount && fx.amount.of === 'maxHP')
        ? 'heal'
        : null;
    }
    const radial = d.space.shape === 'radial';
    if (v.anchor === 'target') return v.motion === 'static' && v.targeting === 'nearest' && radial ? 'strike' : null;
    if (v.anchor !== 'caster') return null;
    if (v.motion === 'static' && radial && v.grow && v.grow.dim === 'radRadius') return 'nova';
    if (v.motion === 'static' && v.targeting === 'nearest' && radial) return 'melee'; // a cone; beams wait for their own form
    if (v.motion === 'travels' && (v.targeting === 'direction' || v.targeting === 'nearest') && !v.path && !v.aimTrack)
      return 'shot';
    return null;
  }
  /** How far a leader's attack reaches from its centre: a melee cone's radius, a nova's full growth, else the move's range. A shot
   *  reaches no further than it flies (speed x lifetime + size), capped at that range; a homing shot gets no credit for turning
   *  (Jess 2026-11-01). */
  function reachOf(d, form) {
    if (form === 'melee') return d.space.radRadius;
    if (form === 'nova') return d.delivery.grow.max;
    const v = d.delivery,
      range = v.range != null ? v.range : G.MoveResolver.TUNING.RANGE;
    if (form !== 'shot') return range;
    const life = (v.endOn || []).find((c) => c.time != null);
    return life ? Math.min(range, v.moveSpeed * life.time + ((d.space && d.space.radRadius) || 0)) : range;
  }

  /** The move lines slot `index` (0-based) casts in loop `loop`: the set for that loop, else the last earlier one. A loop before the
   *  slot enters gets its first set (the slot is not fielded then anyway). Pure. */
  function movesFor(sig, index, loop) {
    const keys = Object.keys(sig.sets || {})
      .map(Number)
      .sort((a, b) => a - b);
    if (!keys.length) return [];
    const want = Number.isFinite(loop) ? Math.floor(loop) : index + 1;
    let at = keys[0];
    for (const k of keys) if (k <= want) at = k;
    return sig.sets[at];
  }

  /** Builds a stage ladder from national dex numbers, base form first. Levels default to STAGE_BANDS; pass `levels` to override per line. */
  function ladder(dexes, levels) {
    const n = dexes.length;
    const lv = levels || (n === 1 ? [1] : n === 2 ? [1, STAGE_BANDS.final] : [1, STAGE_BANDS.mid, STAGE_BANDS.final]);
    return dexes.map((dex, i) => ({ dex, minLevel: lv[i] }));
  }

  const KANTO = [
    // boost: the badge's run-long team buff (mainline: Boulder = +10% Attack). stat is one of hp, atk, def, spa, spd, spe.
    {
      id: 'kanto-gym-1',
      leader: 'Brock',
      badge: 'Boulder Badge',
      arena: 'rock',
      boost: { stat: 'atk', pct: 0.1 },
      signatures: [
        // power: damage multiplier on the ratio path; tempo: attack-rate multiplier (cooldowns, tell and recovery divided by it). Both TUNE, default 1.
        // Slot 1: Geodude -> Graveler -> Golem (the pilot; hand-tuned). Cards (Jess 2026-10-31): Tackle Power 52, reach 70; Rock Throw Power 58.5,
        // 3 rocks of size 11.7 at 377 px/s; Harden takes none.
        {
          line: ladder([74, 75, 76]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          cards: { damage: 3, count: 2, velocity: 3, area: 2 },
          // Loop 1 (Jess 2026-11-02): Red/Blue Geodude, Tackle and Defense Curl, plus Jess's pilot Rock Throw. Loop 2 on: the pilot set.
          sets: {
            1: [{ id: 'tackle' }, { id: 'defense-curl' }, { id: 'rock-throw' }],
            2: [{ id: 'tackle' }, { id: 'rock-throw' }, { id: 'harden' }],
          },
        },
        // Slots 2 to 6 (Gen-1 order, docs/GYM-ROSTERS.md): PROVISIONAL move sets (TUNE, no cards yet; the gym-roster branch authors them). Balance pass pending.
        // Slot 2: Onix -> Steelix (Gen-2 line-completion), the Defense wall.
        {
          line: ladder([95, 208]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 2: [{ id: 'body-slam' }, { id: 'rock-throw' }, { id: 'harden' }] },
        },
        // Slot 3: Rhyhorn -> Rhydon, the Ground-lean bruiser.
        {
          line: ladder([111, 112]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 3: [{ id: 'body-slam' }, { id: 'rock-throw' }, { id: 'swords-dance', hpBelow: 0.5 }] },
        },
        // Slot 4: Omanyte -> Omastar, the special threat.
        {
          line: ladder([138, 139]),
          stance: 'far',
          power: 1,
          tempo: 1,
          sets: { 4: [{ id: 'water-gun' }, { id: 'rock-throw' }, { id: 'harden' }] },
        },
        // Slot 5: Kabuto -> Kabutops, the fast physical one.
        {
          line: ladder([140, 141]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 5: [{ id: 'metal-claw' }, { id: 'water-gun' }, { id: 'swords-dance', hpBelow: 0.6 }] },
        },
        // Slot 6: Aerodactyl, the speed ace (single stage).
        {
          line: ladder([142]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 6: [{ id: 'wing-attack' }, { id: 'rock-throw' }, { id: 'agility' }] },
        },
      ],
    },
    {
      id: 'kanto-gym-2',
      leader: 'Misty',
      badge: 'Cascade Badge',
      arena: 'water',
      boost: { stat: 'spd', pct: 0.1 },
      signatures: [
        // PROVISIONAL move sets (TUNE, no cards yet; catalog moves with a gym form only). Balance pass pending.
        // Slot 1: Staryu -> Starmie, the signature ace.
        {
          line: ladder([120, 121]),
          stance: 'far',
          power: 1,
          tempo: 1,
          // Loop 1 (Jess 2026-11-02): FRLG Staryu, the full lore set. Loop 2 on: the provisional set.
          sets: {
            1: [{ id: 'tackle' }, { id: 'harden' }, { id: 'water-pulse' }, { id: 'recover' }],
            2: [{ id: 'water-gun' }, { id: 'tackle' }, { id: 'harden' }],
          },
        },
        // Slot 2: Seel -> Dewgong, Water/Ice.
        {
          line: ladder([86, 87]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 2: [{ id: 'powder-snow' }, { id: 'water-gun' }, { id: 'harden' }] },
        },
        // Slot 3: Psyduck -> Golduck.
        {
          line: ladder([54, 55]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 3: [{ id: 'water-gun' }, { id: 'psycho-cut' }, { id: 'agility', hpBelow: 0.5 }] },
        },
        // Slot 4: Poliwag -> Poliwhirl -> Poliwrath, the Fighting profile (Karate Chop stands in for its Fighting moves).
        {
          line: ladder([60, 61, 62]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 4: [{ id: 'water-gun' }, { id: 'karate-chop' }, { id: 'swords-dance', hpBelow: 0.5 }] },
        },
        // Slot 5: Lapras, the bulky Water/Ice anchor.
        {
          line: ladder([131]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 5: [{ id: 'water-gun' }, { id: 'powder-snow' }] },
        },
        // Slot 6: Magikarp -> Gyarados, the physical powerhouse.
        {
          line: ladder([129, 130]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 6: [{ id: 'bite' }, { id: 'water-gun' }, { id: 'dragon-dance', hpBelow: 0.5 }] },
        },
      ],
    },
    {
      id: 'kanto-gym-3',
      leader: 'Lt. Surge',
      badge: 'Thunder Badge',
      arena: 'electric',
      boost: { stat: 'spe', pct: 0.1 },
      signatures: [
        // PROVISIONAL move sets (TUNE, no cards yet; catalog moves with a gym form only). Balance pass pending.
        // Electric sets (Jess 2026-11-01): Thunder Shock on every Electric mon, each keeps a Normal or Steel melee (no Electric melee in the
        // catalog) as its contact move; Thunderbolt only on the ace, below 50% HP. If the paralysis is too much, cut Voltorb's Thunder Shock first.
        // Slot 1: Pikachu -> Raichu, the signature ace.
        {
          line: ladder([25, 26]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          // Loop 1 (Jess 2026-11-02): Red/Blue Pikachu; Quick Attack waits on a leader dash form. Loop 2 on: the provisional set.
          sets: {
            1: [{ id: 'thunder-shock' }, { id: 'growl' }, { id: 'thunder-wave' }],
            2: [{ id: 'thunder-shock' }, { id: 'tackle' }, { id: 'agility' }, { id: 'thunderbolt', hpBelow: 0.5 }],
          },
        },
        // Slot 2: Porygon, the off-type tech pick (Psycho Cut stands in for Psybeam).
        {
          line: ladder([137]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 2: [{ id: 'psycho-cut' }, { id: 'agility' }] },
        },
        // Slot 3: Magnemite -> Magneton, Electric/Steel.
        {
          line: ladder([81, 82]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 3: [{ id: 'thunder-shock' }, { id: 'metal-claw' }, { id: 'harden' }] },
        },
        // Slot 4: Voltorb -> Electrode, the fastest.
        {
          line: ladder([100, 101]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 4: [{ id: 'thunder-shock' }, { id: 'tackle' }, { id: 'agility' }] },
        },
        // Slot 5: Electabuzz, the mixed attacker (Karate Chop stands in for its punches).
        {
          line: ladder([125]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 5: [{ id: 'thunder-shock' }, { id: 'karate-chop' }, { id: 'agility' }] },
        },
        // Slot 6: Eevee -> Jolteon, the speed glass cannon.
        {
          line: ladder([133, 135]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 6: [{ id: 'thunder-shock' }, { id: 'tackle' }, { id: 'agility' }] },
        },
      ],
    },
    {
      id: 'kanto-gym-4',
      leader: 'Erika',
      badge: 'Rainbow Badge',
      arena: 'grass',
      boost: { stat: 'hp', pct: 0.1 },
      signatures: [
        // PROVISIONAL move sets (TUNE, no cards yet; catalog moves with a gym form only). Balance pass pending.
        // Slot 1: Bellsprout -> Weepinbell -> Victreebel, the RBY ace.
        {
          line: ladder([69, 70, 71]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          // Loop 1 (Jess 2026-11-02): Yellow Weepinbell; Razor Leaf waits on an out-and-back form. Loop 2 on: the provisional set.
          sets: {
            1: [{ id: 'acid' }, { id: 'stun-spore' }, { id: 'sleep-powder' }],
            2: [{ id: 'vine-whip' }, { id: 'giga-drain' }, { id: 'sludge', hpBelow: 0.5 }],
          },
        },
        // Slot 2: Tangela, the pure-Grass wall.
        {
          line: ladder([114]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 2: [{ id: 'vine-whip' }, { id: 'giga-drain' }, { id: 'harden' }] },
        },
        // Slot 3: Oddish -> Gloom -> Vileplume.
        {
          line: ladder([43, 44, 45]),
          stance: 'far',
          power: 1,
          tempo: 1,
          sets: { 3: [{ id: 'giga-drain' }, { id: 'sludge' }, { id: 'poison-sting' }] },
        },
        // Slot 4: Paras -> Parasect, the Bug typing.
        {
          line: ladder([46, 47]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 4: [{ id: 'bug-bite' }, { id: 'giga-drain' }, { id: 'swords-dance', hpBelow: 0.5 }] },
        },
        // Slot 5: Bulbasaur -> Ivysaur -> Venusaur, the iconic Grass ace.
        {
          line: ladder([1, 2, 3]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 5: [{ id: 'vine-whip' }, { id: 'giga-drain' }, { id: 'swords-dance', hpBelow: 0.5 }] },
        },
        // Slot 6: Exeggcute -> Exeggutor, the special nuke.
        {
          line: ladder([102, 103]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 6: [{ id: 'giga-drain' }, { id: 'psycho-cut' }] },
        },
      ],
    },
    {
      id: 'kanto-gym-5',
      leader: 'Koga',
      badge: 'Soul Badge',
      arena: 'poison',
      boost: { stat: 'def', pct: 0.1 },
      signatures: [
        // PROVISIONAL move sets (TUNE, no cards yet; catalog moves with a gym form only). Balance pass pending.
        // Slot 1: Koffing -> Weezing, the signature wall.
        {
          line: ladder([109, 110]),
          stance: 'far',
          power: 1,
          tempo: 1,
          // Loop 1 (Jess 2026-11-02): FRLG Koffing; Self-Destruct (utility weight 0, not imported), Smokescreen (accuracy slice) and Toxic
          // (trail form) are still to come. Loop 2 on: the provisional set.
          sets: {
            1: [{ id: 'sludge' }],
            2: [{ id: 'sludge' }, { id: 'tackle' }, { id: 'harden' }],
          },
        },
        // Slot 2: Grimer -> Muk, the bulky one.
        {
          line: ladder([88, 89]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 2: [{ id: 'sludge' }, { id: 'body-slam' }, { id: 'harden' }] },
        },
        // Slot 3: Ekans -> Arbok.
        {
          line: ladder([23, 24]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 3: [{ id: 'bite' }, { id: 'poison-sting' }, { id: 'sludge' }] },
        },
        // Slot 4: Venonat -> Venomoth, the Bug typing (Psycho Cut stands in for Psybeam).
        {
          line: ladder([48, 49]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 4: [{ id: 'poison-sting' }, { id: 'psycho-cut' }] },
        },
        // Slot 5: Tentacool -> Tentacruel, the Water coverage (Harden stands in for Barrier).
        {
          line: ladder([72, 73]),
          stance: 'far',
          power: 1,
          tempo: 1,
          sets: { 5: [{ id: 'water-gun' }, { id: 'sludge' }, { id: 'harden' }] },
        },
        // Slot 6: Zubat -> Golbat -> Crobat (Gen-2 line-completion), the speed ace.
        {
          line: ladder([41, 42, 169]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 6: [{ id: 'wing-attack' }, { id: 'poison-sting' }, { id: 'agility' }] },
        },
      ],
    },
    {
      id: 'kanto-gym-6',
      leader: 'Sabrina',
      badge: 'Marsh Badge',
      arena: 'psychic',
      boost: { stat: 'spa', pct: 0.1 },
      signatures: [
        // PROVISIONAL move sets (TUNE, no cards yet; catalog moves with a gym form only). Balance pass pending.
        // Psycho Cut is the only Psychic move with a gym form; the ranged pressure comes from Shadow Ball until boss casts are widened.
        // Slot 1: Abra -> Kadabra -> Alakazam, the signature ace.
        {
          line: ladder([63, 64, 65]),
          stance: 'far',
          power: 1,
          tempo: 1,
          // Loop 1 (Jess 2026-11-02): FRLG Kadabra. STAND-IN: Confusion for Psybeam until the beam form; Future Sight and Reflect are not
          // imported yet. Loop 2 on: the provisional set.
          sets: {
            1: [{ id: 'confusion' }, { id: 'calm-mind' }],
            2: [{ id: 'shadow-ball' }, { id: 'psycho-cut' }, { id: 'agility' }],
          },
        },
        // Slot 2: Mr. Mime, the barrier mon (Harden stands in for Barrier).
        {
          line: ladder([122]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 2: [{ id: 'psycho-cut' }, { id: 'shadow-ball' }, { id: 'harden' }] },
        },
        // Slot 3: Jynx, Ice/Psychic.
        {
          line: ladder([124]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 3: [{ id: 'powder-snow' }, { id: 'shadow-ball' }] },
        },
        // Slot 4: Drowzee -> Hypno, the SpD wall.
        {
          line: ladder([96, 97]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 4: [{ id: 'psycho-cut' }, { id: 'harden' }] },
        },
        // Slot 5: Slowpoke -> Slowbro, Water/Psychic (Harden stands in for Withdraw).
        {
          line: ladder([79, 80]),
          stance: 'far',
          power: 1,
          tempo: 1,
          sets: { 5: [{ id: 'water-gun' }, { id: 'psycho-cut' }, { id: 'harden' }] },
        },
        // Slot 6: Gastly -> Haunter -> Gengar, her anime ace.
        {
          line: ladder([92, 93, 94]),
          stance: 'far',
          power: 1,
          tempo: 1,
          sets: { 6: [{ id: 'shadow-ball' }, { id: 'lick' }, { id: 'sludge' }] },
        },
      ],
    },
    {
      id: 'kanto-gym-7',
      leader: 'Blaine',
      badge: 'Volcano Badge',
      arena: 'fire',
      boost: { stat: 'spa', pct: 0.1 },
      signatures: [
        // PROVISIONAL move sets (TUNE, no cards yet; catalog moves with a gym form only). Balance pass pending.
        // Slot 1: Growlithe -> Arcanine, the signature ace.
        {
          line: ladder([58, 59]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          // Loop 1 (Jess 2026-11-02): FRLG Growlithe (Take Down's recoil is paid); Roar is not imported yet. Loop 2 on: the provisional set.
          sets: {
            1: [{ id: 'bite' }, { id: 'fire-blast' }, { id: 'take-down' }],
            2: [{ id: 'ember' }, { id: 'bite' }, { id: 'agility' }],
          },
        },
        // Slot 2: Ponyta -> Rapidash, fast physical.
        {
          line: ladder([77, 78]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 2: [{ id: 'tackle' }, { id: 'ember' }, { id: 'agility' }] },
        },
        // Slot 3: Magmar, the special attacker (Karate Chop stands in for Fire Punch, Sludge for Smog).
        {
          line: ladder([126]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 3: [{ id: 'ember' }, { id: 'karate-chop' }, { id: 'sludge' }] },
        },
        // Slot 4: Vulpix -> Ninetales (Shadow Ball stands in for Hex).
        {
          line: ladder([37, 38]),
          stance: 'far',
          power: 1,
          tempo: 1,
          sets: { 4: [{ id: 'ember' }, { id: 'shadow-ball' }, { id: 'agility' }] },
        },
        // Slot 5: Eevee -> Flareon, the physical bruiser.
        {
          line: ladder([133, 136]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 5: [{ id: 'bite' }, { id: 'ember' }, { id: 'swords-dance', hpBelow: 0.5 }] },
        },
        // Slot 6: Charmander -> Charmeleon -> Charizard, the capstone.
        {
          line: ladder([4, 5, 6]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 6: [{ id: 'wing-attack' }, { id: 'ember' }, { id: 'dragon-dance', hpBelow: 0.5 }] },
        },
      ],
    },
    {
      id: 'kanto-gym-8',
      leader: 'Giovanni',
      badge: 'Earth Badge',
      arena: 'ground',
      boost: { stat: 'atk', pct: 0.1 },
      signatures: [
        // PROVISIONAL move sets (TUNE, no cards yet; catalog moves with a gym form only). Balance pass pending.
        // Slot 1: Rhyhorn -> Rhydon, the ace (shared with Brock slot 3).
        {
          line: ladder([111, 112]),
          stance: 'close',
          power: 1,
          tempo: 1,
          // Loop 1 (Jess 2026-11-02): Stadium Rhydon; Fury Attack waits on a multi-hit form, Fissure is not imported yet. Loop 2 on: the
          // provisional set.
          sets: {
            1: [{ id: 'earthquake' }, { id: 'body-slam' }],
            2: [{ id: 'body-slam' }, { id: 'mud-shot' }, { id: 'rock-throw' }, { id: 'swords-dance', hpBelow: 0.5 }],
          },
        },
        // Slot 2: Diglett -> Dugtrio, the glass cannon (Metal Claw stands in for Slash).
        {
          line: ladder([50, 51]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 2: [{ id: 'metal-claw' }, { id: 'mud-shot' }, { id: 'agility' }] },
        },
        // Slot 3: Nidoran(F) -> Nidorina -> Nidoqueen.
        {
          line: ladder([29, 30, 31]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 3: [{ id: 'poison-sting' }, { id: 'bite' }, { id: 'body-slam' }] },
        },
        // Slot 4: Nidoran(M) -> Nidorino -> Nidoking (Karate Chop stands in for Double Kick).
        {
          line: ladder([32, 33, 34]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 4: [{ id: 'poison-sting' }, { id: 'mud-shot' }, { id: 'karate-chop' }] },
        },
        // Slot 5: Cubone -> Marowak, the Def wall (Mud Shot stands in for Bonemerang).
        {
          line: ladder([104, 105]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          sets: { 5: [{ id: 'mud-shot' }, { id: 'body-slam' }, { id: 'harden' }] },
        },
        // Slot 6: Meowth -> Persian, off-type.
        {
          line: ladder([52, 53]),
          stance: 'close',
          power: 1,
          tempo: 1,
          sets: { 6: [{ id: 'bite' }, { id: 'agility' }] },
        },
      ],
    },
  ];
  const REGIONS = { 1: KANTO };

  /** The ordered gym list for a run region (null = all regions: Kanto for now). */
  function listFor(region) {
    return REGIONS[region == null ? 1 : region] || [];
  }
  /** Every region's gym list, for validation sweeps. */
  function allRegions() {
    return Object.keys(REGIONS).map((r) => ({ region: +r, gyms: REGIONS[r] }));
  }

  /** Index into sig.line of the stage that applies at `level`: the last stage whose minLevel is <= level (the first stage if none). Pure. */
  function stageIndex(sig, level) {
    let at = 0;
    for (let i = 1; i < sig.line.length; i++) if (level >= sig.line[i].minLevel) at = i;
    return at;
  }
  /** The stage { dex, minLevel } a slot shows at `level`. Pure. */
  function stageFor(sig, level) {
    return sig.line[stageIndex(sig, level)];
  }

  /** The mons a gym fields in loop `loop` at `level`: the FIRST N signatures in slot order (N = loop, clamped to 1..roster size),
   *  each as { index, sig, stage, dex }. This is the one place the "loop N fields the first N" rule lives. Pure. */
  function lineup(entry, loop, level) {
    const want = Number.isFinite(loop) ? Math.floor(loop) : 1;
    const n = Math.max(1, Math.min(entry.signatures.length, want));
    const out = [];
    for (let i = 0; i < n; i++) {
      const sig = entry.signatures[i],
        at = stageIndex(sig, level);
      out.push({ index: i, sig, stage: at, dex: sig.line[at].dex });
    }
    return out;
  }

  const unknownKeys = (o, allowed) => Object.keys(o).filter((k) => !allowed.includes(k));
  const sigName = (s) => (s && s.line && s.line[0] && G.DEX_BY[s.line[0].dex] ? G.DEX_BY[s.line[0].dex].name : '?');

  /** Checks an entry against the catalog; returns a list of problems (empty = valid). */
  function validate(g) {
    const bad = [];
    if (!g.leader || !g.badge || !g.arena) bad.push('missing leader, badge or arena');
    for (const k of unknownKeys(g, GYM_KEYS)) bad.push((g.leader || '?') + ': unknown field ' + k);
    if (g.boost && (!STATS.includes(g.boost.stat) || !(g.boost.pct > 0 && g.boost.pct <= 1)))
      bad.push('boost needs a stat (hp, atk, def, spa, spd, spe) and a pct in (0, 1]');
    if (!g.signatures || !g.signatures.length || g.signatures.length > 6) bad.push('signatures must be 1 to 6');
    (g.signatures || []).forEach((s, si) => {
      const who = sigName(s);
      for (const k of unknownKeys(s, SIG_KEYS)) bad.push(who + ': unknown field ' + k);
      if (s.stance != null && !STANCES.includes(s.stance)) bad.push(who + ': bad stance ' + s.stance);
      for (const k of ['power', 'tempo'])
        if (s[k] != null && !(s[k] > 0 && s[k] <= 5)) bad.push(who + ': ' + k + ' must be in (0, 5]');
      // the stage ladder: non-empty, starts at level 1, strictly increasing, every dex real
      if (!Array.isArray(s.line) || !s.line.length) bad.push(who + ': line must be a non-empty stage ladder');
      else {
        s.line.forEach((st, i) => {
          if (!G.DEX_BY[st.dex]) bad.push(who + ': unknown dex ' + st.dex);
          if (!Number.isInteger(st.minLevel) || st.minLevel < 1)
            bad.push(who + ': stage ' + i + ' needs an integer minLevel >= 1');
          else if (i === 0 && st.minLevel !== 1) bad.push(who + ': the first stage must start at level 1');
          else if (i > 0 && st.minLevel <= s.line[i - 1].minLevel) bad.push(who + ': stage levels must increase');
        });
      }
      // per-loop sets (Jess 2026-11-02): loop keys from the slot's entry loop (slot N enters loop N) to LOOPS, each a valid move set
      const keys = Object.keys(s.sets || {});
      if (!keys.length) bad.push(who + ' has no moves');
      else if (!keys.includes(String(si + 1)))
        bad.push(who + ': its first set must be for loop ' + (si + 1) + ', the loop it enters');
      for (const k of keys) {
        const L = who + ' loop ' + k,
          set = s.sets[k];
        if (!(Number(k) >= si + 1 && Number(k) <= LOOPS && Number.isInteger(Number(k))))
          bad.push(L + ': sets are keyed by a loop from ' + (si + 1) + ' to ' + LOOPS);
        if (!Array.isArray(set) || !set.length) {
          bad.push(L + ' has no moves');
          continue;
        }
        if (set.length > MAX_MOVES) bad.push(L + ' has more than ' + MAX_MOVES + ' moves');
        let damaging = 0;
        for (const m of set) {
          for (const f of unknownKeys(m, MOVE_KEYS)) bad.push(L + ': ' + m.id + ' has unknown field ' + f);
          if (m.hpBelow != null && !(m.hpBelow > 0 && m.hpBelow < 1))
            bad.push(L + ': ' + m.id + ' hpBelow must be in (0, 1)');
          const d = G.MoveDefs[m.id];
          if (!d) {
            bad.push(L + ': unknown move ' + m.id);
            continue;
          }
          if (d.basePower > 0) damaging++;
          if (!formOf(d))
            bad.push(
              L +
                ': ' +
                m.id +
                ' has no gym form yet (leaders cast melee cones, novas, shots, strikes, self buffs and self heals)'
            );
        }
        if (!damaging) bad.push(L + ' needs at least one damaging move');
      }
      // cards: the player's card rules, per mon (slice 7a); each must exist, be a move card, respect its cap and fit at least one move
      // of any of its loop sets
      const cards = s.cards || {},
        allMoves = [].concat(...Object.values(s.sets || {}).filter(Array.isArray));
      for (const id of Object.keys(cards)) {
        const c = G.TeamCards.BY_ID[id],
          n = cards[id];
        if (!c) bad.push(who + ': unknown card ' + id);
        else if (c.team) bad.push(who + ': ' + id + ' is a team card, and leaders use the base stage timers');
        else if (!Number.isInteger(n) || n < 1) bad.push(who + ': card ' + id + ' needs a whole number of stacks');
        else if (c.cap && n > c.cap) bad.push(who + ': card ' + id + ' is capped at ' + c.cap);
        else if (!allMoves.some((m) => G.MoveDefs[m.id] && G.TeamCards.targets(c, G.MoveDefs[m.id]).length))
          bad.push(who + ': card ' + id + ' fits none of its moves');
      }
    });
    return bad;
  }

  const STAT_LABEL = { hp: 'HP', atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed' };

  return {
    STAT_LABEL,
    LEVEL_OFFSET,
    TTK,
    ENRAGE_AFTER,
    LOOPS,
    STAGE_BANDS,
    KANTO,
    listFor,
    allRegions,
    stageIndex,
    stageFor,
    lineup,
    movesFor,
    formOf,
    reachOf,
    validate,
  };
})();
