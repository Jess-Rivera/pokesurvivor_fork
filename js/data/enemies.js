/* ============ enemies.js — wild Pokemon from every generation ============
 *
 * The tiers are no longer fixed lists: each tier gathers all the Pokemon
 * (from any generation) whose base stat total falls in its range, and on
 * starting a run a CAST is chosen at random from each tier. This way each game
 * brings different Pokemon without having to load hundreds of sprites at once.
 *
 * The combat stats come from the tier's template, adjusted with
 * each Pokemon's own health and speed.
 *
 * behavior:
 *   chase    goes straight for you
 *   charger  stops, aims and charges
 *   ranged   keeps its distance and shoots
 *   tank     lento, mucha vida
 *   ---- with personality ----
 *   healer   heals those around (Chansey, Blissey, Audino...)
 *   shielder puts shields on its teammates (Shuckle, Bronzong, Mr. Mime...)
 *   summoner calls its pack (Nidoqueen brings Nidoran, Vespiquen Combee...)
 *   bomber   approaches and explodes (Voltorb, Electrode, Koffing, Geodude...)
 *   beamer   a beam that warns on the ground before firing
 *   zoner    damage zones under your feet that burst shortly after
 *   fan      shoots in a fan
 *   jumper   jumps and lands on you (the landing shows on the ground first)
 *   runner   runner: very fast and fragile, goes where you are going to be (cuts
 *            off whoever only flees). One per tier: the fastest of the cast.
 * The warned attacks are in systems/hazards.js.
 *
 * Bosses: strong NON-legendary Pokemon (pseudo-legendaries, Slaking...), at
 * random by power bands. The legendaries only appear in the rifts
 * (systems/rift.js).
 */
G.Enemies = (() => {
  const TIERS = [
    { from: 0,   bst: [180, 330], hp: 17,  spd: 56, dmg: 6,  xp: 3.5, cast: 7 },
    { from: 70,  bst: [300, 405], hp: 32,  spd: 62, dmg: 8.5, xp: 5,  cast: 7 },
    { from: 160, bst: [385, 465], hp: 52,  spd: 60, dmg: 11, xp: 8,  cast: 7 },
    { from: 260, bst: [445, 515], hp: 88,  spd: 70, dmg: 14, xp: 13, cast: 7 },
    { from: 380, bst: [495, 560], hp: 150, spd: 66, dmg: 22, xp: 24, cast: 7 },
    { from: 500, bst: [530, 620], hp: 250, spd: 72, dmg: 28, xp: 38, cast: 7 }
  ];

  // Boss bands: the minute they appear, base HP and BST band.
  const BOSS_SLOTS = [
    { at: 180, hp: 1400,  dmg: 34, xp: 220,  bst: [490, 545] },
    { at: 360, hp: 3200,  dmg: 42, xp: 420,  bst: [520, 580] },
    { at: 540, hp: 5600,  dmg: 48, xp: 680,  bst: [540, 600] },
    { at: 720, hp: 9000,  dmg: 56, xp: 1000, bst: [580, 700] },
    { at: 900, hp: 16000, dmg: 68, xp: 1800, bst: [600, 700] }
  ];

  // Approximate base stats from the game ones (inverse of fetch_pokedex).
  const baseHp = p => (p.hp - 70) / 0.45;
  const baseSpd = p => (p.spd - 78) / 0.42;

  // Enemy HP/level/speed use the shared base-stats model in js/core/stats.js (G.Stats),
  // the SAME formulas as the player. enemyHp(baseHP, t) = HP at the level-for-run-time.
  // See DECISIONS.md and BALANCE.md.
  const enemyHp = (baseHP, t) => G.Stats.hpForLevel(baseHP, G.Stats.levelForTime(t));
  const levelForTime = t => G.Stats.levelForTime(t);   // re-exported for the HUD / callers

  const H = (d, s) => G.U.hash(d, 7, s);

  // Region filter for the run: null = All regions; otherwise a gen number (1-9).
  // A region's eligible pool = that gen AND all previous gens (p.gen <= region). Per-run,
  // not persisted. Gen-1 edge (thin top tier) accepted as-is. See DECISIONS.md.
  let region = null;
  function setRegion(gen) { region = gen || null; }
  function regionOK(p) { return region == null || p.gen <= region; }

  // Fixed personalities of some Pokemon.
  const HEAL = new Set([35, 36, 113, 173, 183, 184, 242, 301, 440, 531, 594, 700, 764, 858]);
  const SHIELD = new Set([95, 122, 208, 213, 227, 306, 375, 410, 411, 436, 437, 439, 476, 703]);
  const BOMB = new Set([74, 75, 76, 100, 101, 102, 109, 110, 337, 338, 343, 344]);
  // Summoner -> Pokemon of its pack.
  const SUMMON = { 15: 13, 18: 16, 24: 23, 28: 27, 31: 29, 34: 32, 42: 41, 51: 50, 53: 52, 57: 56, 59: 58,
                   62: 60, 68: 66, 73: 72, 78: 77, 82: 81, 85: 84, 91: 90, 117: 116, 130: 129, 168: 167, 169: 41,
                   199: 79, 230: 116, 262: 261, 334: 333, 405: 403, 416: 415, 462: 81, 466: 239, 553: 551, 637: 636 };

  function behaviorOf(p) {
    const t = p.types, h = H(p.dex, 11);
    const has = (...xs) => xs.some(x => t.includes(x));
    if (HEAL.has(p.dex)) return 'healer';
    if (SHIELD.has(p.dex)) return 'shielder';
    if (BOMB.has(p.dex)) return 'bomber';
    if (SUMMON[p.dex] && G.SPRITE_META[SUMMON[p.dex]]) return 'summoner';
    // Swarms: some Bug ones call more of their own (from the start).
    if (has('bug') && h >= 0.6 && h < 0.78) return 'summoner';
    if (has('electric', 'psychic', 'dragon', 'ice') && h < 0.18) return 'beamer';
    if (has('fire', 'ground', 'poison') && h < 0.18) return 'zoner';
    if (has('water', 'grass', 'bug', 'fairy') && h >= 0.18 && h < 0.32) return 'fan';
    if (has('fighting', 'ground', 'normal', 'rock') && h >= 0.42 && h < 0.56) return 'jumper';
    if (has('psychic', 'electric', 'ghost', 'fairy') && h < 0.4) return 'ranged';
    if (has('fire', 'water', 'poison', 'ice') && h < 0.22) return 'ranged';
    if (has('fighting', 'normal', 'ground', 'rock', 'dragon', 'steel', 'dark') && h < 0.4) return 'charger';
    if (baseHp(p) > 95 && baseSpd(p) < 50) return 'tank';
    return 'chase';
  }

  /** Builds a Pokemon's enemy definition for a tier. */
  function defFor(p, tier, ti) {
    const behavior = behaviorOf(p);
    const d = {
      dex: p.dex, name: p.name, behavior,
      // Real base HP (stats[0]); HP itself is computed from the mainline formula at
      // spawn (see enemyHp). No tier-template HP, no tank/role HP multiplier (removed).
      baseHp: (G.DEX_BY[p.dex] && G.DEX_BY[p.dex].stats) ? G.DEX_BY[p.dex].stats[0] : 50,
      // Speed = fixed species identity via the shared model (real base Speed stat[5]),
      // same px/s scale as the player. No tier template, no role mult, no time ramp.
      spd: G.Stats.speedToPx((G.DEX_BY[p.dex] && G.DEX_BY[p.dex].stats) ? G.DEX_BY[p.dex].stats[5] : 65),
      dmg: Math.round(tier.dmg * (behavior === 'tank' ? 1.2 : 1)),
      xp: Math.max(3, Math.round(tier.xp * (behavior === 'tank' ? 1.3 : 1)))
    };
    // The ones that fight from range: shot damage, cooldown and distance.
    const CD = { ranged: 2.2 - ti * 0.15, fan: 3.2 - ti * 0.15, beamer: 4.4 - ti * 0.2, zoner: 4.6 - ti * 0.2,
                 healer: 3.5, summoner: 7 };
    if (CD[behavior]) {
      d.shotDmg = Math.round(tier.dmg * (behavior === 'fan' ? 0.7 : 0.8));
      d.shotCd = +CD[behavior].toFixed(2);
      d.range = (behavior === 'beamer' ? 260 : behavior === 'healer' || behavior === 'summoner' ? 230 : 190) + ti * 6;
    }
    if (behavior === 'summoner') d.minion = SUMMON[p.dex];
    if (behavior === 'fan') d.fanN = ti < 2 ? 3 : 5;             // wider fan later on
    if (behavior === 'zoner') d.zones = ti < 2 ? 1 : ti < 4 ? 2 : 3;   // more zones later on
    if (behavior === 'bomber') { d.spd = Math.round(d.spd * 1.25); }
    return d;
  }

  /** All candidates of a tier (no legendaries or mythicals). */
  function candidates(tier) {
    return G.DEX.filter(p => regionOK(p) && p.rarity < 5 && p.bst >= tier.bst[0] && p.bst <= tier.bst[1] && G.SPRITE_META[p.dex]);
  }

  // ---------------- the run's cast ----------------

  const PLAIN = ['chase', 'charger', 'ranged', 'tank'];
  const SUPPORT = ['healer', 'shielder', 'summoner'];

  /**
   * A tier's cast: always one "support" (healer, shield or summoner)
   * and, from the second tier on, also one of the ones that attack with a warning.
   * In the first there are no more personalities (to ease you in).
   */
  function castFor(tier) {
    const all = candidates(tier);
    const kind = p => behaviorOf(p);
    // First the support type (evenly) and then the Pokemon.
    const kinds = SUPPORT.filter(k => all.some(p => kind(p) === k));
    const sk = kinds.length ? kinds[Math.floor(Math.random() * kinds.length)] : null;
    const pick = sk ? G.U.pickN(all.filter(p => kind(p) === sk), 1) : [];
    if (tier.from > 0) pick.push(...G.U.pickN(all.filter(p => !PLAIN.includes(kind(p)) && !SUPPORT.includes(kind(p))), 1));
    if (tier.from === 0) return pick.concat(G.U.pickN(all.filter(p => !pick.includes(p) && PLAIN.includes(kind(p))), tier.cast - pick.length));
    return pick.concat(G.U.pickN(all.filter(p => !pick.includes(p)), tier.cast - pick.length));
  }

  let cast = null;      // [{ from, list: [def] }]
  let bosses = null;    // [def de jefe]

  /** Draws the cast of a new run. */
  function rollRun() {
    cast = TIERS.map((tier, ti) => ({
      from: tier.from,
      list: castFor(tier).map(p => defFor(p, tier, ti))
    }));
    for (const tier of cast) {
      const plain = tier.list.filter(d => d.behavior === 'chase' || d.behavior === 'charger' || d.behavior === 'tank');
      const r = plain.sort((a, b) => b.spd - a.spd)[0];
      if (r) { r.behavior = 'runner'; r.spd = Math.round(r.spd * 1.6); }
    }
    const used = new Set();
    bosses = BOSS_SLOTS.map(slot => {
      const ok = p => regionOK(p) && !p.leg && G.SPRITE_META[p.dex] && !used.has(p.dex);
      let pool = G.DEX.filter(p => ok(p) && p.bst >= slot.bst[0] && p.bst <= slot.bst[1]);
      if (!pool.length) pool = G.DEX.filter(p => ok(p) && p.bst >= 580);
      // Safety: if a region is too thin to fill a boss band at all, fall back to ALL gens
      // (keeps bosses from ever coming up empty; normal tiers still honor the region rule).
      if (!pool.length) pool = G.DEX.filter(p => !p.leg && G.SPRITE_META[p.dex] && !used.has(p.dex) && p.bst >= 580);
      const p = G.U.pick(pool);
      used.add(p.dex);
      return {
        at: slot.at, dex: p.dex, name: p.name,
        // (Since 2026-10-10 tougher: x1.35 health and x1.2 damage.)
        hp: Math.round(slot.hp * 1.35), spd: Math.round(G.U.clamp(40 + baseSpd(p) * 0.5, 40, 100)),
        dmg: Math.round(slot.dmg * 1.2), xp: slot.xp,
        behavior: behaviorOf(p) === 'ranged' ? 'ranged' : (baseSpd(p) > 90 ? 'charger' : 'chase'),
        shotDmg: Math.round(slot.dmg * 0.55), shotCd: 1.1, range: 260
      };
    });
    return { cast, bosses };
  }

  // (The minute-60 "extra time" was removed when Arceus's Judgment arrived,
  //  that ends every game at minute 30: see systems/judgment.js.)
  function scale(t) {
    // HP now comes from enemyHp(baseHp, t) at spawn; carry t through. dmg/spd ramps
    // unchanged (damage is a later slice).
    return { t, dmg: 1 + t / 420, spd: 1 + Math.min(0.35, t / 1400) };
  }

  /**
   * The bosses already bring their growing base health (1,400 ... 16,000), so
   * they scale much more gently: with the normal curve the last reached 168,000 HP.
   */
  function bossScale(t) { return { hp: 1 + t / 600, dmg: 1 + t / 600, spd: 1 }; }

  /** The tier that applies at second `t`. */
  function tierAt(t) { let ti = 0; TIERS.forEach((tr, i) => { if (t >= tr.from) ti = i; }); return ti; }

  const NO_HORDE = new Set(['bomber', 'healer', 'shielder', 'summoner']);
  /** Types with enough Pokemon in the current tier for a horde (events.js). */
  function hordeTypes(t) {
    const all = candidates(TIERS[tierAt(t)]).filter(p => !NO_HORDE.has(behaviorOf(p)));
    return Object.keys(G.U.TYPE_COLOR).filter(ty => all.filter(p => p.types.includes(ty)).length >= 3);
  }
  /** Up to 4 Pokemon of a type, with the current tier's stats. */
  function hordeDefs(type, t) {
    const ti = tierAt(t);
    const pool = candidates(TIERS[ti]).filter(p => p.types.includes(type) && !NO_HORDE.has(behaviorOf(p)));
    return G.U.pickN(pool, 4).map(p => defFor(p, TIERS[ti], ti));
  }

  /** Bag of enemies available at second `t`. */
  function bagAt(t) {
    // During a horde of a type only those of that type spawn (systems/events.js).
    const horde = G.Events && G.Events.bag();
    if (horde) return horde;
    if (!cast) rollRun();
    const bag = [];
    for (const tier of cast) {
      if (t < tier.from) continue;
      const w = t - tier.from > 260 ? 3 : 10;       // los tramos viejos pierden peso
      for (const e of tier.list) for (let i = 0; i < w; i++) bag.push(e);
    }
    return bag.length ? bag : cast[0].list;
  }

  /** dex of the cast that will appear soon (to preload sprites). */
  function upcomingDex(t, ahead = 60) {
    if (!cast) rollRun();
    const out = [];
    for (const tier of cast) if (tier.from <= t + ahead) for (const e of tier.list) out.push(e.dex);
    for (const b of bosses) if (b.at <= t + ahead) out.push(b.dex);
    return out;
  }

  return {
    TIERS, BOSS_SLOTS, rollRun, scale, bossScale, bagAt, upcomingDex, candidates, hordeTypes, hordeDefs, setRegion,
    enemyHp, levelForTime,
    get BOSSES() { if (!bosses) rollRun(); return bosses; },
    get cast() { if (!cast) rollRun(); return cast; }
  };
})();
