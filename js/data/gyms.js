/* ============ gyms.js: hand-authored gym leaders (feature/boss-rework) ============
 * One entry per gym, in region order. Format and rules: docs/BOSS-AUTHORING.md. Roster DESIGN (who, in what order, why): docs/GYM-ROSTERS.md.
 * Slice 7a (D-ENEMY, Jess 2026-10-31): a leader's mon plays like the player. Moves are ids from G.MoveDefs (the new move data); each
 * move line is the id plus an optional hpBelow (the move joins the mon's moves only below that fraction of max HP). Per-loop sets
 * (Jess 2026-11-02): a slot's `sets` maps a loop number to its move lines, starting at the loop the slot enters (slot N enters loop N);
 * a loop with no set keeps the last earlier one (movesFor). They all cast
 * through G.MoveSim on their own cooldowns, pure buffs on their Gate (js/entities/boss-ai.js). A gym's `cards` are the LEADER's upgrade
 * cards (Jess 2026-11-05: the leader plays like a player), by id from G.TeamCards (damage, count, velocity, area...). They are keyed by
 * loop and hold the cards GAINED at that loop; the pool for loop N is the running sum of loops 1 to N (cardsFor). Every mon the gym
 * fields in that loop holds the whole pool, folded by the SAME rules as the player's cards, so each card applies to every one of that
 * mon's moves it fits. Team cards (Gate, Duration, Vitamins as 'vitamins:<stat>') are allowed only on a switched gym (`playerEntity`, slice 6 D2),
 * since the wild body has no Vitamins path; Regen needs a loop that fields 2+ mons (slice 7b). A switched slot also takes a build per loop
 * (ivs, evs, nature, a held item; slice 6 D3 and Q4) and the gym takes `runItems` per loop, cumulative like cards. formOf says which moves a leader can cast (melee cones, novas, shots, strikes, dashes,
 * returns, beams, bursts, trails, delayed marks, self buffs, self heals).
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
  const GYM_KEYS = [
    'id',
    'leader',
    'badge',
    'arena',
    'boost',
    'cards',
    'signatures',
    'playerEntity',
    'hpMult',
    'restrictions',
    'runItems',
    'ai',
  ];
  // LEADER-AI "Authoring a leader" (slice 2, #31): `ai` is the AI player's settings on a switched gym, each a number from 0 or keyed by
  // loop; a setting not authored takes the baseline in code (G.LeaderAI.BASE). The keys built so far:
  const AI_KEYS = [
    'think',
    'reflex',
    'threatWindow',
    'dodgeRead',
    'dodgeReserve',
    'minField',
    'swapLimit',
    'stay',
    'margin',
    'ccLeft',
    'ccScore',
    'lowHp',
    'lowTo',
    'lowScore',
    'matchupX',
    'matchupHp',
    'randomness',
    // slice 3 (#32): style, confidence and pacing
    'aggression',
    'confStart',
    'confSwing',
    'confMin',
    'confMax',
    'gapClose',
    'lean',
    // slice 4 (#33): run memory. learnRate: sightings before a pattern is believed; predictCap: acts per 10 chances (0 to 10)
    'learnRate',
    'predictCap',
    // #51 (#49 slice 2): the planner's. range (px), aimError (px), risk and stubbornness (multipliers)
    'range',
    'aimError',
    'risk',
    'stubbornness',
  ];
  const AI_UNIT = ['aggression', 'confStart', 'confMin', 'confMax', 'gapClose', 'randomness']; // 0 to 1
  // slice 3: ai.triggers (LEADER-AI TRIGGERS) and ai.lines (up and down, on a big confidence swing). A trigger is { on, ... }:
  // 'start'; 'hp' with `below` (its own HP fraction); 'faint' with `side` ('yours' or 'own'); 'sendIn' (you send in a mon); 'time'
  // with `at` seconds; slice 4: 'exploit' (it starts acting on a pattern it believes: your usual lead). Then any of: line, set
  // ({ setting: value }) with optional `for` seconds, and `repeat` (true: every time, every `at` s for time). #51: a forced `slot` or
  // `swap` is refused (the planner decides slots, decision 2026-11-09-51-opening-stance-traces-and-set-trigger).
  const TRIGGER_ON = ['start', 'hp', 'faint', 'sendIn', 'time', 'exploit'];
  const TRIGGER_KEYS = ['on', 'below', 'side', 'at', 'repeat', 'line', 'slot', 'swap', 'set', 'for'];
  // Entity model slice 5: `playerEntity` true makes the gym's leader a G.GymLeader; `hpMult` then multiplies the player HP formula, keyed by
  // loop (a loop with no entry keeps the last earlier one). `restrictions` starts small: default allow, each key turns one thing down.
  // Slice 6 (Q1 to Q3): enrage (off unless true on a switched gym), statusCut, ccWindow, autoShake (on unless false), hitIframes.
  // With none authored a switched leader follows your rule. #40: firstWait, seconds before the first attack (0 when absent, as yours).
  // #41: wildStatusDivisor, true divides a status-category hit on the leader by the wild neutral 50 (off when absent, as yours).
  const RESTRICTION_KEYS = [
    'tells',
    'healLimit',
    'enrage',
    'statusCut',
    'ccWindow',
    'autoShake',
    'hitIframes',
    'firstWait',
    'wildStatusDivisor',
  ];
  const SIG_KEYS = ['line', 'stance', 'power', 'tempo', 'sets', 'ivs', 'evs', 'nature', 'item'];
  // bond (slice 8, Q5): the marked lines of a set share one slot on a Player-entity leader and fire together
  const MOVE_KEYS = ['id', 'hpBelow', 'bond'];
  // Slice 6 (Q4 and N6, Jess 2026-11-07): items a leader may not hold, each with the reason the validator gives.
  const LEADER_ITEM_BAN = {
    amuletcoin: 'human only (coins)',
    luckyegg: 'human only (XP)',
    snowballbadge: 'it counts your kills',
    choiceband: 'a leader cannot honor the move lock',
    choicespecs: 'a leader cannot honor the move lock',
    rockyhelmet: 'Rocky Helmet is bugged: it fires on body touch only, see TODO',
  };
  const RUN_ITEM_MAX = 4; // your run item cap

  /** How a leader casts a new-path move (slice 7a), or null when it cannot yet: 'melee' (a cone at its body, aimed at you), 'nova' (a ring or
   *  half ring that grows out of its body: Heat Wave, Dazzling Gleam), 'shot' (shapes that travel along the aim, homing ones included:
   *  Psychic), 'strike' (lands on a spot, locked when its tell starts: Thunderbolt), 'buff' (a pure self stat change), 'heal' (a self
   *  heal of max HP: Recover, Synthesis, Moonlight; Jess 2026-11-02) or 'dash' (a swept dash to the spot locked at its tell, a hit
   *  there and back to its start, with the move's i-frames: Quick Attack; Jess 2026-11-02). Slice 3 of the lore sets (Jess 2026-11-02):
   *  'returns' (shapes that fly out along the aim and back to the mon: Razor Leaf), 'beam' (a straight line from its body along the
   *  aim: Psybeam), 'multi' (a burst of melee cones, each re-aimed at you: Fury Attack) and 'trail' (a persistent slot that drops
   *  hazards behind the mon while it moves, as the player's does: Toxic). Import batch (Jess 2026-11-02): 'delayed' (your spot, locked
   *  at the cast, hit when the move's delay ends: Future Sight). A chain move takes its shape's form; its hops search the
   *  caster's foes (G.MoveSim). Other emitters, delays, persistent moves and caster commitments have no gym form; validate() rejects
   *  them instead of letting them misfire. Read by the leader SimPass (G.GymLeader.SimPass) and the GymBrain too. */
  function formOf(d) {
    if (!d) return null;
    const v = d.delivery || {},
      p = d.payload || [];
    // a mark (Future Sight; Jess 2026-11-02): a world spot hit after its delay, the spot locked at the cast; other delays (falls) have no form
    if (v.delay)
      return v.anchor === 'world' &&
        v.targeting === 'location' &&
        v.motion === 'static' &&
        d.space &&
        d.space.shape === 'radial' &&
        !p.some((fx) => fx.t === 'emit')
        ? 'delayed'
        : null;
    const emits = p.filter((fx) => fx.t === 'emit');
    if (d.persistent)
      return !d.space && emits.length && emits.length === p.length && emits.every((fx) => fx.trigger === 'casterMove')
        ? 'trail'
        : null;
    if (emits.length) {
      const fx = emits[0];
      return !d.space &&
        p.length === 1 &&
        fx.trigger === 'cast' &&
        fx.count > 1 &&
        v.anchor === 'caster' &&
        v.motion === 'static' &&
        formOf(fx.move) === 'melee'
        ? 'multi'
        : null;
    }
    // a swept dash to the nearest foe and back (Quick Attack; Jess 2026-11-02), its i-frames included; any other commitment has no form
    if (v.motion === 'repositions')
      return v.repositionMode === 'swept' &&
        v.returnToOrigin &&
        v.targeting === 'nearest' &&
        d.space &&
        d.space.shape === 'radial'
        ? 'dash'
        : null;
    if (d.casterState) return null;
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
    if (v.motion === 'static' && v.targeting === 'nearest' && radial) return 'melee'; // a cone
    if (v.motion === 'static' && v.targeting === 'nearest' && d.space.shape === 'linear' && !v.grow) return 'beam';
    const aimed = v.targeting === 'direction' || v.targeting === 'nearest';
    if (v.motion === 'returns') return aimed && radial ? 'returns' : null;
    if (v.motion === 'travels' && aimed && !v.path && !v.aimTrack) return 'shot';
    return null;
  }
  /** How far a leader's attack reaches from its centre: a melee cone's radius, a nova's full growth, a beam's length, a burst's cone
   *  radius, else the move's range (a strike, a dash, the turnaround of a returns move). A shot reaches no further than it flies (speed x
   *  lifetime + size), capped at that range; a homing shot gets no credit for turning (Jess 2026-11-01). A trail reaches nothing. */
  function reachOf(d, form) {
    if (form === 'melee') return d.space.radRadius;
    if (form === 'nova') return d.delivery.grow.max;
    if (form === 'beam') return d.space.linLength;
    if (form === 'multi') return d.payload[0].move.space.radRadius;
    if (form === 'trail') return 0;
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
      // Entity model close-out (Jess 2026-11-07, map: docs/ASCII Concept Maps/Entity Model Close-Out - Brock Switch.txt):
      // Brock joins Misty on G.GymLeader. hpMult from the old 60 s model at his gate level (Geodude L12: 1029 / 62),
      // loop 2 scaled as Misty's was; TUNE by feel. Status: Misty's restriction set (B2). No enrage (B3), no touch (B4).
      playerEntity: true,
      hpMult: { 1: 16, 2: 12 },
      restrictions: { hitIframes: 0, autoShake: true, ccWindow: 5, statusCut: 0.5 },
      // LEADER-AI slice 3 (#32, Jess 2026-11-08): the defensive wall, low aggression (his ceiling stays under the gap-closing line).
      // Lines are drafts (Jess: ok for now). Half HP: he gets serious, aggression 0.5 for 10 s.
      // Slice 4 (#33): he keeps the baseline learnRate (3 fights to read your usual lead); the exploit line is a draft.
      ai: {
        aggression: 0.35,
        triggers: [
          { on: 'start', line: "Rock holds its ground. Let's see you move it." },
          { on: 'hp', below: 0.5, line: 'Time to get serious.', set: { aggression: 0.5 }, for: 10 },
          { on: 'exploit', line: 'Same partner as last time? I came prepared.' },
        ],
        lines: { up: "That's what solid defense looks like!", down: "You're chipping through. Not bad." },
      },
      // Brock's cards gained per loop (Jess 2026-11-05: per leader, cumulative). Loop 1 (Jess 2026-10-31, the pilot): Tackle Power 52, reach 70;
      // Rock Throw Power 58.5, 3 rocks of size 11.7 at 377 px/s; Harden takes none. Loops 2 to 6 gain nothing yet (TUNE).
      cards: { 1: { damage: 3, count: 2, velocity: 3, area: 2 } },
      signatures: [
        // power: damage multiplier on the ratio path; tempo: attack-rate multiplier (cooldowns, tell and recovery divided by it). Both TUNE, default 1.
        // Slot 1: Geodude -> Graveler -> Golem (the pilot; hand-tuned).
        {
          line: ladder([74, 75, 76]),
          stance: 'mixed',
          power: 1,
          tempo: 1,
          // Loop 1 (Jess 2026-11-02): Red/Blue Geodude, Tackle and Defense Curl, plus Jess's pilot Rock Throw. Loop 2 on: the pilot set.
          sets: {
            1: [{ id: 'tackle' }, { id: 'defense-curl' }, { id: 'rock-throw' }],
            2: [{ id: 'tackle' }, { id: 'rock-throw' }, { id: 'harden' }],
          },
        },
        // Slots 2 to 6 (Gen-1 order, docs/GYM-ROSTERS.md): PROVISIONAL move sets (TUNE; they hold the gym's card pool from the loop they enter). Balance pass pending.
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
      playerEntity: true, // entity model slice 5: the first gym on G.GymLeader
      hpMult: { 1: 25, 2: 19 }, // TUNE by feel (slice 6 D6, slice 7 Q4, Jess 2026-11-07): loop 1 about 60 s, loop 2 about 45 s a mon
      // Slice 6 (Q1, Q3): her authored differences from your rules, the old fixed leader values (half-length freeze and sleep, a 5 s
      // hard CC gap, auto shake, no hit i-frames). No enrage (Q1): absent means off on a switched gym.
      restrictions: { statusCut: 0.5, ccWindow: 5, autoShake: true, hitIframes: 0 },
      // LEADER-AI slice 3 (#32, Jess 2026-11-08): hit and run, high aggression (fast mons, status). Lines are drafts (Jess: ok for now).
      // Slice 4 (#33, Jess 2026-11-08): the sharper reader, learnRate 2 (your usual lead from her third fight); the line is a draft.
      ai: {
        aggression: 0.68,
        learnRate: 2,
        triggers: [
          { on: 'start', line: 'Think you can keep your head above water?' },
          { on: 'hp', below: 0.5, line: "Okay, now I'm annoyed!" },
          { on: 'exploit', line: "I know who you lean on. Let's see them handle this!" },
        ],
        lines: { up: 'Go with the flow, or get swept away!', down: 'Hmph. Lucky shot.' },
      },
      // Misty's cards (Jess 2026-11-05): a special and status gym. Loop 1 (about level 12 to 15 at 8 min): Water Damage 4 and Count 2 and Velocity 3
      // on Water Pulse (96 power, 3 pulses, 40% confusion with Ailment 2), Area 2 on Tackle and Pulse. Zinc 3 (the Vitamins card on Sp. Def,
      // +15%) since slice 6 (D2, Jess 2026-11-07). 16 stacks in all.
      cards: { 1: { 'type:water': 4, count: 2, ailment: 2, velocity: 3, area: 2, 'vitamins:spd': 3 } },
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
            1: [{ id: 'tackle' }, { id: 'harden' }, { id: 'water-pulse' }, { id: 'recover', hpBelow: 0.35 }], // Recover only below 35% (Jess 2026-11-05)
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
          // Loop 1 (Jess 2026-11-02): Red/Blue Pikachu, the full lore set. Loop 2 on: the provisional set.
          sets: {
            1: [{ id: 'thunder-shock' }, { id: 'growl' }, { id: 'thunder-wave' }, { id: 'quick-attack' }],
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
          // Loop 1 (Jess 2026-11-02): Yellow Weepinbell, the full lore set (Razor Leaf in the returns form). Loop 2 on: the provisional set.
          sets: {
            1: [{ id: 'razor-leaf' }, { id: 'acid' }, { id: 'stun-spore' }, { id: 'sleep-powder' }],
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
          // Loop 1 (Jess 2026-11-02): FRLG Koffing, Toxic in the trail form; Smokescreen (accuracy slice) is still to come. Self-Destruct
          // is for later-loop mons only (MOVE-INTENT self-destruct). Loop 2 on: the provisional set.
          sets: {
            1: [{ id: 'sludge' }, { id: 'toxic' }],
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
          // Loop 1 (Jess 2026-11-02): FRLG Kadabra, Psybeam in the beam form, Future Sight as a delayed mark; Reflect waits on the fields
          // slice. Loop 2 on: the provisional set.
          sets: {
            1: [{ id: 'psybeam' }, { id: 'calm-mind' }, { id: 'future-sight' }],
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
          // Loop 1 (Jess 2026-11-02): FRLG Growlithe, the full lore set (Take Down's recoil is paid, Roar pushes you). Loop 2 on: the
          // provisional set.
          sets: {
            1: [{ id: 'roar' }, { id: 'bite' }, { id: 'fire-blast' }, { id: 'take-down' }],
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
          // Loop 1 (Jess 2026-11-02): Stadium Rhydon, the full lore set (Fury Attack in the burst form, Fissure a heavy strike on you).
          // Loop 2 on: the provisional set.
          sets: {
            1: [{ id: 'earthquake' }, { id: 'body-slam' }, { id: 'fury-attack' }, { id: 'fissure' }],
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

  /** The leader's card pool for loop `loop`: the running sum of the cards gained at loops 1 to `loop` ({ id: stacks }). A copy; pure. */
  function cardsFor(entry, loop) {
    const want = Number.isFinite(loop) ? Math.floor(loop) : 1,
      pool = {};
    for (const k of Object.keys((entry && entry.cards) || {}).sort((a, b) => a - b)) {
      if (Number(k) > want) continue;
      for (const id of Object.keys(entry.cards[k])) pool[id] = (pool[id] || 0) + entry.cards[k][id];
    }
    return pool;
  }

  /** A G.GymLeader's HP multiplier in loop `loop`: the entry for that loop, else the last earlier one. 1 for a gym with none. Pure. */
  function hpMultFor(g, loop) {
    const m = g.hpMult || {};
    let at = 1;
    for (const k of Object.keys(m)
      .map(Number)
      .sort((a, b) => a - b))
      if (k <= loop) at = m[k];
    return at;
  }

  /** The value a loop-keyed map holds for loop `loop`: that loop's entry, else the last earlier one; undefined with none. Pure. */
  function perLoop(m, loop) {
    let at;
    for (const k of Object.keys(m || {})
      .map(Number)
      .sort((a, b) => a - b))
      if (k <= loop) at = m[k];
    return at;
  }
  /** A switched slot's stat profile input for loop `loop` (slice 6, D3), shaped like a read copy for G.Stats.profile; null when the
   *  slot authors none (neutral). */
  function profileFor(sig, loop) {
    const iv = perLoop(sig && sig.ivs, loop),
      ev = perLoop(sig && sig.evs, loop),
      nat = perLoop(sig && sig.nature, loop);
    if (!iv && !ev && !nat) return null;
    const N = nat && G.SpeciesTraits ? G.SpeciesTraits.NATURES.find((x) => x[0] === nat) : null;
    return {
      iv: iv || [0, 0, 0, 0, 0, 0],
      ev: ev || [0, 0, 0, 0, 0, 0],
      natureUp: N ? N[1] : 0,
      natureDown: N ? N[2] : 0,
    };
  }
  /** The leader's run items for loop `loop`: the ids gained at loops 1 to `loop`, in order (slice 6, Q4). A copy; pure. */
  function runItemsFor(entry, loop) {
    const out = [];
    for (const k of Object.keys((entry && entry.runItems) || {})
      .map(Number)
      .sort((a, b) => a - b))
      if (k <= loop) out.push(...entry.runItems[k]);
    return out;
  }
  /** Card budget (slice 6, Q5 and N5): one stack is one level-up pick, and a player at level L has had L - 1. A warning when the pool
   *  for loop `loop` is bigger, else null. Never a block. */
  /** Slice 7b (Q2): Brass Knuckles and Sharp Scissors need a team of 3+, as yours; authored on a smaller team they do nothing.
   *  A dev warning, never a block. Pure. */
  function teamItemWarn(leader, runItems, size) {
    const min = (G.Items && G.Items.HP_TEAM_MIN) || 3,
      idle = (runItems || []).filter((id) => id === 'brassknuckles' || id === 'sharpscissors');
    if (!idle.length || size >= min) return null;
    return leader + ' holds ' + idle.join(' and ') + ' with ' + size + ' mons: inactive below ' + min;
  }
  function budgetWarn(entry, loop, level) {
    const n = Object.values(cardsFor(entry, loop)).reduce((a, b) => a + b, 0);
    return n > level - 1
      ? entry.leader +
          ' holds ' +
          n +
          ' card stacks at level ' +
          level +
          ', more than a player could hold (' +
          (level - 1) +
          ')'
      : null;
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
        let damaging = 0,
          bonded = 0;
        for (const m of set) {
          for (const f of unknownKeys(m, MOVE_KEYS)) bad.push(L + ': ' + m.id + ' has unknown field ' + f);
          if (m.hpBelow != null && !(m.hpBelow > 0 && m.hpBelow < 1))
            bad.push(L + ': ' + m.id + ' hpBelow must be in (0, 1)');
          if (m.bond != null && m.bond !== true) bad.push(L + ': ' + m.id + ' bond is true or absent');
          if (m.bond === true) bonded++;
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
                ' has no gym form yet (leaders cast melee cones, novas, shots, strikes, dashes, returns, beams, bursts, trails, delayed marks, self buffs and self heals)'
            );
        }
        // slice 8 (Q5): the marked lines form one bond group of 2 to 4 (your BOND_MAX; MAX_MOVES caps the top), Player entity only
        if (bonded === 1) bad.push(L + ': a bond needs 2 to 4 marked moves');
        if (bonded && !g.playerEntity)
          bad.push(L + ': bond needs playerEntity (the wild body casts every move at once)');
        if (!damaging) bad.push(L + ' needs at least one damaging move');
      }
    });
    // entity model slice 5: the switch needs an hpMult from loop 1; restrictions are checked for shape, not for what they allow
    if (g.playerEntity != null && g.playerEntity !== true)
      bad.push((g.leader || '?') + ': playerEntity is true or absent');
    if (g.playerEntity && !(g.hpMult && g.hpMult[1] > 0))
      bad.push((g.leader || '?') + ': playerEntity needs an hpMult for loop 1');
    for (const k of Object.keys(g.hpMult || {}))
      if (!(Number.isInteger(Number(k)) && Number(k) >= 1 && Number(k) <= LOOPS && g.hpMult[k] > 0))
        bad.push((g.leader || '?') + ': hpMult is keyed by a loop from 1 to ' + LOOPS + ', each above 0');
    const rules = g.restrictions;
    if (rules != null) {
      for (const k of unknownKeys(rules, RESTRICTION_KEYS)) bad.push((g.leader || '?') + ': unknown restriction ' + k);
      if (rules.tells != null && typeof rules.tells !== 'boolean')
        bad.push((g.leader || '?') + ': tells is true or false');
      if (rules.healLimit != null && !(Number.isInteger(rules.healLimit) && rules.healLimit >= 0))
        bad.push((g.leader || '?') + ': healLimit is a whole number from 0');
      if (rules.firstWait != null && !(typeof rules.firstWait === 'number' && rules.firstWait >= 0))
        bad.push((g.leader || '?') + ': firstWait is a number of seconds from 0');
      if (rules.wildStatusDivisor != null && typeof rules.wildStatusDivisor !== 'boolean')
        bad.push((g.leader || '?') + ': wildStatusDivisor is true or false');
    }
    // slice 6 (Q1 to Q4): the new restrictions, power on a switched gym, the build keys and the items
    if (rules != null) {
      for (const k of ['enrage', 'autoShake'])
        if (rules[k] != null && typeof rules[k] !== 'boolean')
          bad.push((g.leader || '?') + ': ' + k + ' is true or false');
      if (
        rules.statusCut != null &&
        !(typeof rules.statusCut === 'number' && rules.statusCut > 0 && rules.statusCut <= 1)
      )
        bad.push((g.leader || '?') + ': statusCut is in (0, 1]');
      for (const k of ['ccWindow', 'hitIframes'])
        if (rules[k] != null && !(typeof rules[k] === 'number' && rules[k] >= 0 && rules[k] <= 10))
          bad.push((g.leader || '?') + ': ' + k + ' is seconds from 0 to 10');
    }
    const loopKey = (k) => Number.isInteger(Number(k)) && Number(k) >= 1 && Number(k) <= LOOPS;
    if (g.ai != null) {
      const L = g.leader || '?',
        num = (v) => typeof v === 'number' && v >= 0;
      if (!g.playerEntity) bad.push(L + ': ai needs playerEntity (the wild body has no AI player)');
      for (const k of unknownKeys(g.ai, AI_KEYS.concat(['triggers', 'lines'])))
        bad.push(L + ': unknown ai setting ' + k);
      for (const k of AI_KEYS) {
        const v = g.ai[k];
        if (v == null || num(v)) continue;
        if (typeof v !== 'object' || Array.isArray(v) || !Object.keys(v).every((n) => loopKey(n) && num(v[n])))
          bad.push(L + ': ai ' + k + ' is a number from 0, or keyed by loop');
      }
      for (const k of AI_UNIT) {
        const v = g.ai[k],
          vals = v == null ? [] : typeof v === 'object' ? Object.values(v) : [v];
        if (vals.some((x) => typeof x === 'number' && x > 1)) bad.push(L + ': ai ' + k + ' is from 0 to 1');
      }
      const cap = g.ai.predictCap,
        caps = cap == null ? [] : typeof cap === 'object' ? Object.values(cap) : [cap];
      if (caps.some((x) => typeof x === 'number' && x > 10))
        bad.push(L + ': ai predictCap is from 0 to 10 (acts per 10)');
      const str = (s) => typeof s === 'string' && s.length > 0;
      const tr = g.ai.triggers;
      if (tr != null && !Array.isArray(tr)) bad.push(L + ': ai triggers is a list');
      (Array.isArray(tr) ? tr : []).forEach((t, i) => {
        const T = L + ': trigger ' + (i + 1);
        if (!t || typeof t !== 'object') return bad.push(T + ' is an object');
        for (const k of unknownKeys(t, TRIGGER_KEYS)) bad.push(T + ': unknown key ' + k);
        if (!TRIGGER_ON.includes(t.on)) bad.push(T + ': unknown trigger on ' + t.on);
        if (t.on === 'hp' && !(typeof t.below === 'number' && t.below > 0 && t.below < 1))
          bad.push(T + ': hp needs below in (0, 1)');
        if (t.on === 'faint' && t.side !== 'yours' && t.side !== 'own')
          bad.push(T + ": faint needs side 'yours' or 'own'");
        if (t.on === 'time' && !(typeof t.at === 'number' && t.at > 0))
          bad.push(T + ': time needs at, seconds above 0');
        if (t.line != null && !str(t.line)) bad.push(T + ': line is text');
        for (const k of ['slot', 'swap'])
          if (t[k] != null)
            bad.push(T + ': ' + k + ' is gone (#51: a trigger forces no slot or swap; the planner decides)');
        if (t.set != null)
          for (const k of Object.keys(t.set))
            if (!AI_KEYS.includes(k) || !num(t.set[k]))
              bad.push(T + ': set ' + k + ' is a known setting with a number from 0');
        if (t.for != null && !(typeof t.for === 'number' && t.for > 0)) bad.push(T + ': for is seconds above 0');
        if (t.line == null && t.set == null) bad.push(T + ' does nothing');
      });
      const ln = g.ai.lines;
      if (ln != null) {
        if (typeof ln !== 'object' || Array.isArray(ln)) bad.push(L + ': ai lines is { up, down }');
        else {
          for (const k of unknownKeys(ln, ['up', 'down'])) bad.push(L + ': unknown ai line ' + k);
          for (const k of ['up', 'down']) if (ln[k] != null && !str(ln[k])) bad.push(L + ': ai line ' + k + ' is text');
        }
      }
    }
    const itemBan = (id, tier, L) => {
      const it = G.Items && G.Items.BY ? G.Items.BY[id] : null;
      if (!it) return L + ': unknown item ' + id;
      if (it.tier !== tier) return L + ': ' + id + ' is a ' + it.tier + ' item, not a ' + tier + ' one';
      if (LEADER_ITEM_BAN[id]) return L + ': ' + id + ' cannot go on a leader, ' + LEADER_ITEM_BAN[id];
      return null;
    };
    (g.signatures || []).forEach((s) => {
      const who = sigName(s);
      if (g.playerEntity && s.power != null && s.power !== 1)
        bad.push(who + ': power must be 1 on a switched gym (cards do that job)');
      for (const key of ['ivs', 'evs', 'nature', 'item']) {
        const m = s[key];
        if (m == null) continue;
        if (!g.playerEntity) {
          bad.push(who + ': ' + key + ' needs playerEntity (the wild body has no stat profile or items)');
          continue;
        }
        if (typeof m !== 'object' || Array.isArray(m)) {
          bad.push(who + ': ' + key + ' is keyed by loop');
          continue;
        }
        for (const k of Object.keys(m)) {
          const v = m[k],
            L = who + ' ' + key + ' loop ' + k,
            six = (max) =>
              Array.isArray(v) && v.length === 6 && v.every((x) => Number.isInteger(x) && x >= 0 && x <= max);
          if (!loopKey(k)) bad.push(L + ': keyed by a loop from 1 to ' + LOOPS);
          else if (key === 'ivs' && !six(31)) bad.push(L + ': six IVs, each a whole number from 0 to 31');
          else if (key === 'evs' && !six(252)) bad.push(L + ': six EVs, each a whole number from 0 to 252');
          else if (key === 'evs' && v.reduce((a, b) => a + b, 0) > 510) bad.push(L + ': EVs total at most 510');
          else if (
            key === 'nature' &&
            !(typeof v === 'string' && G.SpeciesTraits && G.SpeciesTraits.NATURES.some((x) => x[0] === v))
          )
            bad.push(L + ': ' + v + ' is not a nature');
          else if (key === 'item') {
            const why = itemBan(v, 'pokemon', L);
            if (why) bad.push(why);
          }
        }
      }
    });
    if (g.runItems != null) {
      if (!g.playerEntity) bad.push((g.leader || '?') + ': runItems needs playerEntity');
      else if (typeof g.runItems !== 'object' || Array.isArray(g.runItems))
        bad.push((g.leader || '?') + ': runItems is keyed by loop');
      else {
        const held = [],
          groups = {};
        for (const k of Object.keys(g.runItems).sort((a, b) => a - b)) {
          const L = (g.leader || '?') + ' runItems loop ' + k;
          if (!loopKey(k) || !Array.isArray(g.runItems[k])) {
            bad.push(L + ': a list keyed by a loop from 1 to ' + LOOPS);
            continue;
          }
          for (const id of g.runItems[k]) {
            const why = itemBan(id, 'run', L);
            if (why) {
              bad.push(why);
              continue;
            }
            const grp = G.Items.BY[id].group;
            if (held.includes(id)) bad.push(L + ': ' + id + ' is already held');
            else if (grp && groups[grp]) bad.push(L + ': only one ' + grp + ' item (' + groups[grp] + ' is held)');
            held.push(id);
            if (grp && !groups[grp]) groups[grp] = id;
          }
        }
        if (held.length > RUN_ITEM_MAX)
          bad.push((g.leader || '?') + ': at most ' + RUN_ITEM_MAX + ' run items, the player cap');
      }
    }
    // cards (Jess 2026-11-05): the leader's, gained per loop; each must exist, be a move card, a whole number of stacks, keep the running
    // total within its cap, and fit at least one move of a mon fielded in the loop it is gained
    const cards = g.cards || {},
      roster = g.signatures || [];
    if (g.cards != null && (typeof g.cards !== 'object' || Array.isArray(g.cards)))
      bad.push('cards must be an object keyed by loop');
    else {
      const total = {};
      for (const k of Object.keys(cards).sort((a, b) => a - b)) {
        const L = (g.leader || '?') + ' cards loop ' + k;
        if (!(Number.isInteger(Number(k)) && Number(k) >= 1 && Number(k) <= LOOPS)) {
          bad.push(L + ': cards are keyed by a loop from 1 to ' + LOOPS);
          continue;
        }
        const moves = [].concat(
          ...roster.slice(0, Number(k)).map((s, i) => (s && s.sets ? movesFor(s, i, Number(k)) : []))
        );
        for (const id of Object.keys(cards[k] || {})) {
          const vit = id.startsWith('vitamins:') ? id.slice(9) : null, // a Vitamins stack names its stat (G.TeamCards.vit)
            c = G.TeamCards.BY_ID[vit != null ? (STATS.includes(vit) ? 'vitamins' : '') : id],
            n = cards[k][id];
          if (!c) bad.push(L + ': unknown card ' + id);
          else if (c.team && !g.playerEntity)
            bad.push(L + ': ' + id + ' is a team card, and leaders use the base stage timers');
          else if (c.id === 'regen' && Math.min(Number(k), roster.length) < 2)
            bad.push(L + ': regen needs a loop that fields 2+ mons (it heals the bench; slice 7b, Q5)');
          else if (c.id === 'vitamins' && vit == null)
            bad.push(L + ': name the Vitamins stat, vitamins:hp, atk, def, spa, spd or spe');
          else if (!Number.isInteger(n) || n < 1) bad.push(L + ': card ' + id + ' needs a whole number of stacks');
          else {
            total[id] = (total[id] || 0) + n;
            if (c.cap && total[id] > c.cap) bad.push(L + ': card ' + id + ' is capped at ' + c.cap);
            else if (!c.team && !moves.some((m) => G.MoveDefs[m.id] && G.TeamCards.targets(c, G.MoveDefs[m.id]).length))
              bad.push(L + ': card ' + id + ' fits none of the moves fielded that loop');
          }
        }
      }
    }
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
    cardsFor,
    hpMultFor,
    teamItemWarn,
    perLoop,
    profileFor,
    runItemsFor,
    budgetWarn,
    LEADER_ITEM_BAN,
    formOf,
    reachOf,
    validate,
  };
})();
