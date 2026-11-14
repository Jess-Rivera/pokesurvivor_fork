/* ============ gym.js: gym gates, leaders and the badge package (feature/boss-rework) ============
 * Gyms are the only bosses (2026-10-31). Gym 1 gate opens at 4:00; each later gate opens GAP seconds after the previous gym is beaten
 * AND the player is back on the map. A gate stays until entered. The gym level is the run-time level at gate spawn + LEVEL_OFFSET,
 * locked at spawn and shown on the gate. Inside, the leader fights with hand-authored moves and cards (G.Gyms). Losing (team wipe)
 * ends the run. There is no arena timer: 120 s after the first hit the leader enrages (damage ramps). A switched gym (G.GymLeader)
 * enrages only when it authors `enrage` (slice 6, Q1).
 * The gate and the arena themselves are systems/gym-arena.js; this module owns the schedule, the leader's def and the rewards.
 * Kanto gyms 1 to 8 (js/data/gyms.js), opened in list order. The badge boost is a team-wide stat bonus (Player.badge). See BOSS-REWORK.md section 3 and docs/BOSS-AUTHORING.md.
 * SIM/PRESENT: this module is simulation only. Everything the player sees or hears about the gym schedule (escalation toast and sound,
 * the badge line, the calm line) is EMITTED as a plain-data event on G.SimBus and rendered by ui/gym-present.js (docs/SIM-PRESENT-BOUNDARY.md).
 */
G.Gym = (() => {
  const FIRST_AT = 240,
    GAP = 240; // seconds
  const ENRAGE_RAMP = 30,
    ENRAGE_MAX = 2;
  // Gate escalation (rework/gym-progression): a gate opens, GRACE s of come-when-ready, then every ESC_STEP s
  // both the wild spawn level and the gym leader's locked level climb by 1 (UNCAPPED by design: ignoring the gate
  // is meant to end the run). The bump is a single shared integer read by the wild spawner and the leader build.
  const GRACE = 37,
    ESC_STEP = 10; // seconds
  let beaten = 0,
    nextAt = FIRST_AT,
    gate = null,
    badges = [],
    splits = []; // #91: the run time each badge was won, same order as badges (Run Info "Gym splits")
  let fight = null; // readout of the current gym fight: { t0, hp, minFrac, taken, casts }
  let esc = null; // escalation state while a gate is open past grace: { bump, acc } (null = grace or no gate)
  let loop = 1; // which loop of the region this run is in: loop N fields the first N roster slots (G.Gyms.lineup). Dev-set until the real loop counter exists.
  const list = () => G.Gyms.listFor(G.Enemies.region);

  function reset() {
    beaten = 0;
    nextAt = FIRST_AT;
    gate = null;
    badges = [];
    splits = [];
    fight = null;
    esc = null;
    loop = 1;
  }

  function now() {
    return G.Game.st.time;
  }

  /** Gate schedule: called every game frame (solo / host). */
  function update(dt, pl, t) {
    if (G.GymArena.inArena) trackFight(dt, pl, t);
    // Escalation clock: runs while the gate is open on the map (not once you are in the arena). Anchored to run-time
    // (dt is the run clock), so a pause screen or draft does not tick it. Starts after GRACE s since the gate opened.
    if (gate && G.GymArena.gate && !G.GymArena.inArena) escalate(dt);
    if (gate || G.GymArena.inArena || G.GymArena.gate || beaten >= list().length || nextAt == null || t < nextAt)
      return;
    const entry = list()[beaten];
    const level = Math.round(G.Stats.levelForTime(t)) + G.Gyms.LEVEL_OFFSET;
    const lead = G.Gyms.lineup(entry, 1, level)[0]; // the gate shows slot 1 at the level it spawns with
    gate = {
      idx: beaten,
      id: entry.id,
      leader: entry.leader,
      badge: entry.badge,
      arena: entry.arena,
      boost: entry.boost || null,
      dex: lead.dex,
      species: G.DEX_BY[lead.dex].name,
      level,
      openedAt: t,
    };
    if (!G.GymArena.openGate(gate)) {
      gate = null;
      nextAt = t + 2;
      return;
    } // no free spot yet: try again shortly
    esc = null; // fresh gate: grace first
  }

  /** The escalation clock. After GRACE s open, start climbing the shared bump by 1 every ESC_STEP s. Uncapped. */
  function escalate(dt) {
    const since = now() - gate.openedAt;
    if (since < GRACE) return; // grace period: no penalty yet
    if (!esc) {
      esc = { bump: 0, acc: 0 };
    }
    esc.acc += dt;
    while (esc.acc >= ESC_STEP) {
      esc.acc -= ESC_STEP;
      esc.bump++;
      G.SimBus.emit('gym:escalate', { leader: gate.leader, bump: esc.bump }); // ui/gym-present.js renders the toast and the sound
    }
  }

  /** Shared escalation bump (integer levels). Read by the wild spawner (enemy.js) and the leader build (makeDef).
   *  0 during grace or when no gate is open. This is the single source of truth for 'how much have you dawdled'. */
  function escBump() {
    return esc ? esc.bump : 0;
  }
  /** Seconds left in the grace period (0 once escalating), or null when no gate is open. For the gate gauge (hud.js). */
  function graceLeft() {
    return gate ? Math.max(0, GRACE - (now() - gate.openedAt)) : null;
  }

  /** Readout for tuning: how long, how much of your HP it took, the lowest you got, and what it cast. */
  function trackFight(dt, pl, t) {
    if (!fight) fight = { t0: t, hp: pl.hp, minFrac: 1, taken: 0, casts: {}, who: pl.mon && pl.mon.name };
    if (pl.hp < fight.hp) fight.taken += (fight.hp - pl.hp) / (pl.maxHp || 1);
    fight.hp = pl.hp;
    if (pl.maxHp) fight.minFrac = Math.min(fight.minFrac, pl.hp / pl.maxHp);
  }
  function noteCast(id) {
    if (fight) fight.casts[id] = (fight.casts[id] || 0) + 1;
  }
  function report(result) {
    if (!fight) return null;
    const secs = Math.round(now() - fight.t0),
      s =
        (result || 'fight') +
        ' after ' +
        secs +
        ' s: ' +
        (fight.who || 'player') +
        ' took ' +
        Math.round(fight.taken * 100) +
        '% of its max HP in total, lowest ' +
        Math.round(fight.minFrac * 100) +
        '% HP, casts ' +
        JSON.stringify(fight.casts);
    console.log('[Gym] ' + s);
    return s;
  }

  /** The leader's def for roster slot `slot` (0 = first): HP from the elite reference model with the gym's TTK target, at the gym level.
   *  The species is the stage the slot's evolution line shows at the effective level (G.Gyms.stageFor). */
  function makeDef(g, slot = 0) {
    const entry = list()[g.idx],
      sig = entry.signatures[slot];
    if (!sig) throw new Error('Gym.makeDef: ' + entry.leader + ' has no roster slot ' + slot);
    // Effective level = the locked base plus however far escalation has climbed by the moment you enter.
    // Read once here (the leader is only instantiated at entry), so 'Brock got stronger while you waited' is baked in.
    const bump = escBump();
    const lvl = g.level + bump;
    if (bump > 0) g.escBumpSeen = true; // remembered on the gate so onReturn can play the 'world calms' line
    const dex = G.Gyms.stageFor(sig, lvl).dex,
      mon = G.DEX_BY[dex];
    const tEq = Math.max(0, ((lvl - 1) / 49) * 1800);
    const base = { dex, baseHp: mon.stats ? mon.stats[0] : 50 };
    const hp = G.Elites.hpFor(base, tEq, G.Gyms.TTK).hp;
    const warn = G.Gyms.budgetWarn(entry, loop, lvl); // slice 6 (Q5): more cards than a player of this level could hold, never a block
    if (warn) console.warn('[Gym] ' + warn);
    return {
      dex,
      name: mon.name,
      hp,
      spd: G.Stats.speedToPx(mon.stats ? mon.stats[5] : 65),
      dmg: 20,
      xp: 0,
      behavior: 'chase',
      shotDmg: 10,
      shotCd: 1,
      range: 260,
      // moves and cards are read by G.GymLeader and its SimPass on a switched gym (leader AI slice 5a), else by the GymBrain (boss-ai.js); both
      // cast the moves through G.MoveSim with the cards folded in (slice 7a)
      gym: {
        level: lvl,
        loop, // the loop this fight is in: it also caps the leader's self heals per fight (healsLeft)
        leader: g.leader,
        badge: g.badge,
        species: mon.name,
        stance: sig.stance,
        power: sig.power || 1,
        tempo: sig.tempo || 1,
        playerEntity: !!entry.playerEntity, // the slice 5 switch: G.Boss.make builds a G.GymLeader instead of the wild body
        hpMult: G.Gyms.hpMultFor(entry, loop),
        restrictions: entry.restrictions || null,
        ai: entry.ai || null, // LEADER-AI "Authoring a leader": the AI player's settings, each a number or keyed by loop (G.LeaderAI.settings)
        profile: G.Gyms.profileFor(sig, loop), // slice 6 (D3): this loop's IVs, EVs and nature, or null (neutral)
        item: G.Gyms.perLoop(sig.item, loop) || null, // slice 6 (Q4): this loop's held item
        runItems: G.Gyms.runItemsFor(entry, loop), // slice 6 (Q4): the run items gained at loops 1 to this one
        cards: G.Gyms.cardsFor(entry, loop), // the leader's pool for this loop, held by every mon the gym fields (Jess 2026-11-05)
        moves: G.Gyms.movesFor(sig, slot, loop).map((m) => Object.assign({}, m)), // this loop's set (per-loop sets, Jess 2026-11-02)
        engagedAt: null,
      },
    };
  }

  /** Slice 6 (Q1): a switched gym (G.GymLeader) enrages only when it authors `enrage`; the wild body always does. */
  function enrages(e) {
    const x = e && e.gym;
    return !!x && (!x.playerEntity || !!(x.restrictions && x.restrictions.enrage));
  }
  /** Damage multiplier from the enrage clock: x1 until ENRAGE_AFTER s after the first hit, then up to x2 over ENRAGE_RAMP s. */
  function enrageMul(e) {
    const x = e.gym;
    if (!x || x.engagedAt == null || !enrages(e)) return 1;
    const s = now() - x.engagedAt - G.Gyms.ENRAGE_AFTER;
    return s <= 0 ? 1 : 1 + (ENRAGE_MAX - 1) * Math.min(1, s / ENRAGE_RAMP);
  }
  /** Seconds to enrage (0 once enraged), or null before the first hit. */
  function enrageIn(e) {
    const x = e.gym;
    if (!x || x.engagedAt == null || !enrages(e)) return null;
    return Math.max(0, G.Gyms.ENRAGE_AFTER - (now() - x.engagedAt));
  }

  /** Badge package on a win: level, team revive, the run-long team boost. The item and the Bond come from the leader drop / arena win (GymArena.won). */
  function onWin(g) {
    badges.push(g.badge);
    splits.push(now());
    report('won');
    fight = null;
    G.Game.grantLevels(1); // guaranteed level (no XP is dropped; the leader pays a level, not orbs)
    G.Game.reviveTeam(); // full team revive, fainted members included
    if (g.boost) G.Game.badgeBoost(g.boost.stat, g.boost.pct); // the badge's run-long team buff (mainline Boulder Badge: +10% Attack)
    G.SimBus.emit('gym:badge', {
      badge: g.badge,
      stat: g.boost ? g.boost.stat : null,
      pct: g.boost ? g.boost.pct : null,
    });
  }

  /** Back on the map after the arena: schedule the next gate and the next elite. */
  function onReturn(g) {
    beaten++;
    gate = null;
    esc = null; // snap-back: bump cleared, next wild spawns read 0 -> correct run-time level
    nextAt = beaten < list().length ? now() + GAP : null;
    G.Elites.afterGate(now());
    if (G.Shops) G.Shops.afterGym(now()); // Move Shop step 3: the next Trainer and Mart come 90 s after the return (guarded: the gym harnesses load gym.js without shops.js)
    if (g && g.escBumpSeen) G.SimBus.emit('gym:calm', { leader: g.leader });
  }

  /** The roster this gym fights with right now: the first N slots for the current loop, each at its stage for the effective level
   *  (the gate's locked level plus the escalation bump). Pure read; the arena flow that fields them all at once comes in the next slice. */
  function roster(g) {
    return G.Gyms.lineup(list()[g.idx], loop, g.level + escBump());
  }

  return {
    /** Dev: open the next gate on the next frame, or gym n's (1 is the first gym of the region). */
    debugOpen(n) {
      if (Number.isInteger(n) && n >= 1 && n <= list().length) beaten = n - 1;
      nextAt = 0;
    },
    FIRST_AT,
    GAP,
    GRACE,
    ESC_STEP,
    reset,
    update,
    noteCast,
    report,
    makeDef,
    enrageMul,
    enrageIn,
    enrages,
    onWin,
    onReturn,
    now,
    escBump,
    graceLeft,
    roster,
    /** Dev: set the current loop (1 to G.Gyms.LOOPS). Cleared by reset() on a new run. */
    debugLoop(n) {
      loop = Math.max(1, Math.min(G.Gyms.LOOPS, n | 0));
    },
    /** Dev (G.Debug.runinfo, #91-2): set this run's badges and their split times, [{ badge, at }]. The gate schedule
     *  is untouched. Cleared by reset() on a new run. */
    debugBadges(entries) {
      badges = entries.map((entry) => entry.badge);
      splits = entries.map((entry) => entry.at);
    },
    get loop() {
      return loop;
    },
    /** Dev: force the gate past grace and set the bump directly. */
    debugEsc(n) {
      if (gate) {
        gate.openedAt = now() - GRACE - 1;
        esc = { bump: n | 0, acc: 0 };
      }
    },
    get gate() {
      return gate;
    },
    get beaten() {
      return beaten;
    },
    get badges() {
      return badges;
    },
    /** #91: the run time each badge in `badges` was won, by index. */
    get splits() {
      return splits;
    },
    /** #91-2: run time the current gym fight began (its readout's t0), or null outside a fight. A run that ends while
     *  this is set ended inside that fight (Region Best, map 91-2C, RC1). */
    get fightStartedAt() {
      return fight ? fight.t0 : null;
    },
  };
})();
