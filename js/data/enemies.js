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
 *   (tank is no longer a behavior: it is a modifier on any class, flag t in js/data/enemy-classes.js)
 *   ---- with personality ----
 *   healer   heals those around (Chansey, Blissey, Audino...)
 *   shielder puts shields on its teammates (Shuckle, Bronzong, Mr. Mime...)
 *   summoner calls its pack (Nidoqueen brings Nidoran, Vespiquen Combee...)
 *   bomber   approaches and explodes (Voltorb, Electrode, Koffing, Geodude...)
 *   beamer   a beam that warns on the ground before firing
 *   zoner    damage zones under your feet that burst shortly after
 *   fan      shoots in a fan
 *   jumper   jumps and lands on you (the landing shows on the ground first)
 *   status   (slice 2) applies sleep / paralysis / slow to you, or hastes its allies
 *   flanker  not a class: a flag on the fastest plain and the fastest shooter (never a Tank) of each tier's cast.
 *            At most FLANK.cap of them act as flankers at a time: they curve round to the emptiest side of you,
 *            strike once and run to the screen edge (Enemy.flankMove). The rest of the species act as plain / shooter.
 *
 * Every species' class comes from the generated table js/data/enemy-classes.js (G.ENEMY_CLASSES).
 * The warned attacks are in systems/hazards.js.
 *
 * Bosses: strong NON-legendary Pokemon (pseudo-legendaries, Slaking...), at
 * random by power bands. The legendaries only appear in the rifts
 * (systems/rift.js).
 */
G.Enemies = (() => {
  const TIERS = [
    { from: 0,   bst: [180, 330], hp: 17,  spd: 56, dmg: 6,  xp: 3.5, cast: 9 },
    { from: 70,  bst: [300, 405], hp: 32,  spd: 62, dmg: 8.5, xp: 5,  cast: 9 },
    { from: 160, bst: [385, 465], hp: 52,  spd: 60, dmg: 11, xp: 8,  cast: 9 },
    { from: 260, bst: [445, 515], hp: 88,  spd: 70, dmg: 14, xp: 13, cast: 9 },
    { from: 380, bst: [495, 560], hp: 150, spd: 66, dmg: 22, xp: 24, cast: 9 },
    { from: 500, bst: [530, 620], hp: 250, spd: 72, dmg: 28, xp: 38, cast: 9 }
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
  // Opening discount: wild-enemy HP starts at OPENING_HP_START x the formula and rises linearly to 1.0 at the
  // first boss slot (the same window as the XP boost in spawner.js). HP is fixed at spawn, so t is the spawn time.
  const OPENING_HP_START = 0.55;
  const openingHpK = t => { const end = G.Stats.XP_BOOST_END; return t >= end ? 1 : OPENING_HP_START + (1 - OPENING_HP_START) * Math.max(0, t) / end; };
  const enemyHp = (baseHP, t) => G.Stats.hpForLevel(baseHP, G.Stats.levelForTime(t)) * openingHpK(t);
  const levelForTime = t => G.Stats.levelForTime(t);   // re-exported for the HUD / callers

  const H = (d, s) => G.U.hash(d, 7, s);

  // Region filter for the run: null = All regions; otherwise a gen number (1-9).
  // A region's eligible pool = that gen AND all previous gens (p.gen <= region). Per-run,
  // not persisted. Gen-1 edge (thin top tier) accepted as-is. See DECISIONS.md.
  let region = null;
  function setRegion(gen) { region = gen || null; }
  function regionOK(p) { return region == null || p.gen <= region; }

  // ---------------- class table ----------------
  // Every wild species has a fixed class in js/data/enemy-classes.js (generated, see DECISIONS.md
  // 2026-10-17 / 2026-10-18): c = class, t = Tank modifier, s = secondary class, fx = status effects,
  // m = summoner minion dex, u = unique behavior. This replaces the old dex hash.
  // Class -> the behavior id enemy.js already understands (every other class is its own id).
  // Status enemies have no status mechanics yet (slice 2 / status slice E), so until then they are plain chasers (2026-10-19;
  // they used to fight as shooters and sat at the shooter band like the rest of the ranged units).
  const BEHAVIOR = { plain: 'chase', shooter: 'ranged', status: 'chase' };      // a Status carrier turns into 'carrier' while active (Enemy.carrierCheck)
  const FAMILY = { plain: 'melee', charger: 'melee', jumper: 'melee', bomber: 'melee',
                   shooter: 'range', beamer: 'range', zoner: 'range', fan: 'range',
                   healer: 'support', shielder: 'support', summoner: 'support', status: 'melee' };   // status: melee while it is a plain chaser
  // A species the table does not know (added to the pokedex later): family by stats, default class.
  const infoOf = p => G.ENEMY_CLASSES[p.dex] || { c: (p.stats && p.stats[3] > p.stats[1]) ? 'shooter' : 'plain' };
  const classOf = p => infoOf(p).c;
  const behaviorOf = p => { const c = classOf(p); return BEHAVIOR[c] || c; };

  /** Builds a Pokemon's enemy definition for a tier. */
  function defFor(p, tier, ti) {
    const behavior = behaviorOf(p), info = infoOf(p);
    const d = {
      dex: p.dex, name: p.name, behavior,
      // Real base HP (stats[0]); HP itself is computed from the mainline formula at
      // spawn (see enemyHp). No tier-template HP, no tank/role HP multiplier (removed).
      baseHp: (G.DEX_BY[p.dex] && G.DEX_BY[p.dex].stats) ? G.DEX_BY[p.dex].stats[0] : 50,
      // Speed = fixed species identity via the shared model (real base Speed stat[5]),
      // same px/s scale as the player. No tier template, no role mult, no time ramp.
      spd: G.Stats.speedToPx((G.DEX_BY[p.dex] && G.DEX_BY[p.dex].stats) ? G.DEX_BY[p.dex].stats[5] : 65),
      dmg: Math.round(tier.dmg * (info.t ? 1.2 : 1)),
      xp: Math.max(3, Math.round(tier.xp * (info.t ? 1.3 : 1))),   // LEGACY for wild enemies (bosses still use their slot xp); XP now comes from bx
      // XP (feature/xp-curve): base_experience of the species, and the tank bonus as a multiplier.
      bx: (G.DEX_BY[p.dex] && G.DEX_BY[p.dex].bx != null) ? G.DEX_BY[p.dex].bx : 100,
      xpMul: info.t ? 1.3 : 1
    };
    if (info.t) d.tank = true;
    // The ones that fight from range: shot damage, cooldown and distance.
    const CD = { ranged: 2.2 - ti * 0.15, fan: 3.2 - ti * 0.15, beamer: 4.4 - ti * 0.2, zoner: 4.6 - ti * 0.2,
                 healer: 3.5, summoner: 7 };
    if (CD[behavior]) {
      d.shotDmg = Math.round(tier.dmg * (behavior === 'fan' ? 0.7 : 0.8));
      d.shotCd = +CD[behavior].toFixed(2);
      d.range = (behavior === 'beamer' ? 260 : behavior === 'healer' || behavior === 'summoner' ? 230 : 190) + ti * 6;
    }
    if (behavior === 'summoner') d.minion = info.m || p.dex;
    if (info.u) d.unique = info.u;
    if (behavior === 'fan') d.fanN = ti < 2 ? 3 : 5;             // wider fan later on
    if (behavior === 'zoner') d.zones = ti < 2 ? 1 : ti < 4 ? 2 : 3;   // more zones later on
    return d;
  }

  /** All candidates of a tier (no legendaries or mythicals). */
  function candidates(tier) {
    return G.DEX.filter(p => regionOK(p) && p.rarity < 5 && p.bst >= tier.bst[0] && p.bst <= tier.bst[1] && G.SPRITE_META[p.dex]);
  }

  // ---------------- the run's cast ----------------

  const SUPPORT = ['healer', 'shielder', 'summoner', 'status'];
  const MELEE_SPECIAL = ['charger', 'jumper', 'bomber'], RANGE_SPECIAL = ['beamer', 'zoner', 'fan'];
  const famCount = pool => { const c = { melee: 0, range: 0, support: 0 }; for (const p of pool) c[FAMILY[classOf(p)]]++; return c; };

  /** The tier's candidates. If the region leaves too few (Kanto and Johto, tier 6), borrow from the next lower band. */
  function poolFor(tier, ti) {
    let pool = candidates(tier);
    const short = () => { const c = famCount(pool); return pool.length < tier.cast || c.melee < 3 || c.range < 3 || c.support < 2; };
    for (let k = ti - 1; k >= 0 && short(); k--) {
      const have = new Set(pool.map(p => p.dex));
      pool = pool.concat(candidates(TIERS[k]).filter(p => !have.has(p.dex)));
    }
    return pool;
  }

  /**
   * A tier's cast: 9 species, 1-2 support, 3-5 melee, 3-5 range (usually 1 / 4 / 4). From tier 2 on
   * each family holds at least one special (melee: charger, jumper, bomber; range: beamer, zoner, fan)
   * AND at least one baseline (plain / shooter); tier 1 eases in with plain and shooter first.
   * Two supports never share a class.
   */
  function castFor(tier, ti) {
    const pool = poolFor(tier, ti);
    const fam = f => pool.filter(p => FAMILY[classOf(p)] === f);
    const sup = fam('support'), mel = fam('melee'), ran = fam('range');
    // How many of each: 1-2 support (30% two), then 3-5 melee and 3-5 range.
    let s = Math.random() < 0.3 ? 2 : 1, m;
    if (s === 1) { const x = Math.random(); m = x < 0.6 ? 4 : x < 0.8 ? 3 : 5; } else m = Math.random() < 0.5 ? 3 : 4;
    let r = tier.cast - s - m;
    // A family the pool cannot fill hands its slots to the other one, then to support.
    s = Math.min(s, sup.length); m = Math.min(m, mel.length); r = Math.min(r, ran.length);
    let need = tier.cast - s - m - r;
    const takeM = () => { const a = Math.min(need, mel.length - m); m += a; need -= a; };
    const takeR = () => { const a = Math.min(need, ran.length - r); r += a; need -= a; };
    if (mel.length - m >= ran.length - r) { takeM(); takeR(); } else { takeR(); takeM(); }
    { const a = Math.min(need, sup.length - s); s += a; need -= a; }

    // Support: the class first (evenly), then the species.
    const picked = [], used = [];
    for (let i = 0; i < s; i++) {
      const left = k => sup.some(p => classOf(p) === k && !picked.includes(p));
      const fresh = SUPPORT.filter(k => !used.includes(k) && left(k));
      const k = G.U.pick(fresh.length ? fresh : SUPPORT.filter(left));
      used.push(k);
      picked.push(G.U.pick(sup.filter(p => classOf(p) === k && !picked.includes(p))));
    }
    const fill = (list, n, specials) => {
      if (ti === 0) {      // tier 1 eases in: no specials unless the pool is short of plain ones
        const base = list.filter(p => !specials.includes(classOf(p)));
        return G.U.pickN(base, n).concat(G.U.pickN(list.filter(p => !base.includes(p)), Math.max(0, n - base.length)));
      }
      // One special and one baseline (plain / shooter) are guaranteed, the rest is random.
      const first = G.U.pickN(list.filter(p => specials.includes(classOf(p))), 1)
        .concat(G.U.pickN(list.filter(p => !specials.includes(classOf(p))), 1)).slice(0, n);
      return first.concat(G.U.pickN(list.filter(p => !first.includes(p)), n - first.length));
    };
    return picked.concat(fill(mel, m, MELEE_SPECIAL), fill(ran, r, RANGE_SPECIAL));
  }

  // Share of the spawns each family gets inside a tier, whatever the species count (a 5-shooter cast no longer
  // means 5/9 shooters on screen). A family a tier lacks gives its share to the others pro rata. Status counts as support.
  const FAMILY_SHARE = { melee: 0.60, range: 0.30, support: 0.10 };   // was 0.45 / 0.40 / 0.15 until 2026-10-19 (ranged units were piling up, see BALANCE)
  // Ceiling on units that hold a spacing band (shooter, beamer, fan, zoner, summoner; Spawner.spawnOne): a spawn draw that
  // would be a band-holder is re-drawn (up to `rerolls` times, then accepted) when band-holders are already at least `floor`
  // and would pass `share` of the units alive. Relative to what is alive, not to the cap, so it also bites early in a run.
  // Healers and shielders are not counted (they walk to allies). Spawn weights (FAMILY_SHARE) are unchanged.
  const HOLDER_CAP = { share: 0.35, floor: 2, rerolls: 8 };
  const BAG_UNIT = 4;     // bag copies per weight point, so the shares survive rounding

  let cast = null;      // [{ from, list: [def] }]
  let bagCache = null, bagKey = '';
  let bosses = null;    // [def de jefe]

  /** Draws the cast of a new run. */
  function rollRun() {
    bagCache = null;
    cast = TIERS.map((tier, ti) => ({
      from: tier.from,
      list: castFor(tier, ti).map(p => defFor(p, tier, ti))
    }));
    for (const tier of cast) {
      // Flanker: the fastest plain and the fastest shooter of the cast (own speed, no multiplier), never a tank.
      // Spawn weight by family: the species count no longer sets the spawn share (see FAMILY_SHARE). d.wt averages 1 per tier.
      const cnt = { melee: 0, range: 0, support: 0 }, fam = d => FAMILY[classOf(G.DEX_BY[d.dex])];
      for (const d of tier.list) cnt[fam(d)]++;
      const tot = Object.keys(cnt).reduce((a, f) => a + (cnt[f] ? FAMILY_SHARE[f] : 0), 0);
      for (const d of tier.list) d.wt = FAMILY_SHARE[fam(d)] / tot * tier.list.length / cnt[fam(d)];
      for (const k of ['plain', 'shooter']) {
        const f = tier.list.filter(d => classOf(G.DEX_BY[d.dex]) === k && !d.tank).sort((a, b) => b.spd - a.spd)[0];
        if (f) f.flanker = true;
      }
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
        behavior: FAMILY[classOf(p)] === 'range' ? 'ranged' : (baseSpd(p) > 90 ? 'charger' : 'chase'),
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
  /**
   * An elite's species (feature/boss-rework): region-accurate, one BST tier above the highest active wild tier; once the top tier is
   * active, the old boss band (600 to 700). No legendaries, no repeats (`used` = dex numbers). Returns a wild-style def
   * (defFor) built with the tier above, or null if nothing is left.
   */
  function eliteDef(t, used) {
    const ti = Math.min(tierAt(t) + 1, TIERS.length - 1);
    const band = tierAt(t) >= TIERS.length - 1 ? [600, 700] : TIERS[ti].bst;
    const ok = p => regionOK(p) && !p.leg && G.SPRITE_META[p.dex] && !used.has(p.dex);
    let pool = G.DEX.filter(p => ok(p) && p.bst >= band[0] && p.bst <= band[1]);
    // A thin region (Gen 1's top end): widen the band downward inside the region before ever leaving it.
    for (const w of [40, 100, 200, 400]) if (!pool.length) pool = G.DEX.filter(p => ok(p) && p.bst >= band[0] - w);
    if (!pool.length) pool = G.DEX.filter(p => !p.leg && G.SPRITE_META[p.dex] && !used.has(p.dex));   // last resort: any region
    if (!pool.length) return null;
    return defFor(G.U.pick(pool), TIERS[ti], ti);
  }

  function tierAt(t) { let ti = 0; TIERS.forEach((tr, i) => { if (t >= tr.from) ti = i; }); return ti; }

  const NO_HORDE = new Set(['bomber', 'healer', 'shielder', 'summoner', 'status']);   // by class
  /** Types with enough Pokemon in the current tier for a horde (events.js). */
  function hordeTypes(t) {
    const all = candidates(TIERS[tierAt(t)]).filter(p => !NO_HORDE.has(classOf(p)));
    return Object.keys(G.U.TYPE_COLOR).filter(ty => all.filter(p => p.types.includes(ty)).length >= 3);
  }
  /** Up to 4 Pokemon of a type, with the current tier's stats. */
  function hordeDefs(type, t) {
    const ti = tierAt(t);
    const pool = candidates(TIERS[ti]).filter(p => p.types.includes(type) && !NO_HORDE.has(classOf(p)));
    return G.U.pickN(pool, 4).map(p => defFor(p, TIERS[ti], ti));
  }

  /** Bag of enemies available at second `t`. */
  function bagAt(t) {
    // During a horde of a type only those of that type spawn (systems/events.js).
    const horde = G.Events && G.Events.bag();
    if (horde) return horde;
    if (!cast) rollRun();
    // The bag only changes when a tier starts or turns old, so it is cached by that.
    const key = cast.map(tier => t < tier.from ? 'x' : t - tier.from > 260 ? 'o' : 'n').join('');
    if (bagCache && key === bagKey) return bagCache;
    const bag = [];
    for (const tier of cast) {
      if (t < tier.from) continue;
      const w = t - tier.from > 260 ? 3 : 10;       // los tramos viejos pierden peso
      for (const e of tier.list) for (let i = Math.max(1, Math.round(w * BAG_UNIT * (e.wt || 1))); i > 0; i--) bag.push(e);
    }
    bagKey = key; bagCache = bag.length ? bag : cast[0].list;
    return bagCache;
  }

  /** Ditto's summon: a random melee or range member of the cast drawn for this tier or an earlier one (never support or bomber). */
  function minionFromCast(t, selfDex) {
    if (!cast) rollRun();
    const out = [];
    for (let i = 0; i <= tierAt(t); i++) for (const d of cast[i].list) {
      const c = classOf(G.DEX_BY[d.dex]);
      if (d.dex !== selfDex && FAMILY[c] !== 'support' && c !== 'bomber') out.push(d.dex);
    }
    return out.length ? G.U.pick(out) : selfDex;
  }

  /** dex of the cast that will appear soon (to preload sprites). */
  function upcomingDex(t, ahead = 60) {
    if (!cast) rollRun();
    const out = [];
    for (const tier of cast) if (tier.from <= t + ahead) for (const e of tier.list) out.push(e.dex);
    return out;
  }

  // Spacing bands (slice 1b), in SCREEN units: 1.0 = the edge of the screen in that direction (see Enemy.screenDist).
  // [retreat below, approach above]; in between the unit holds. Keyed by behavior id, so status species share the
  // shooter band ('ranged') until slice 2. Tuned by playtest: change the numbers here, nowhere else.
  const BANDS = { fan: [0.30, 0.40], beamer: [0.50, 0.62], zoner: [0.72, 0.82], ranged: [0.80, 0.92],
                  summoner: [0.70, 0.82], carrier: [0.30, 0.40] };

  // Band jitter (2026-10-19): so the shooters do not all stop on the same line and form a ring around you.
  //   spread      each unit scales BOTH numbers of its band by 1 + a random value in +-spread, fixed at spawn
  //               (the band centre stays the average; 0.20 on the shooter band is about +-0.17 screens)
  //   recheckMin/Max   a unit decides approach / hold / back away only every random min..max seconds and keeps that
  //               decision in between (random starting phase), instead of re-deciding every frame
  const BAND_JITTER = { spread: 0.20, recheckMin: 0.3, recheckMax: 0.7 };

  // Morale of the band-holding (ranged) units and the healers / shielders, 0..1 (Enemy.moraleNow). morale = (1 - fearWeight x fear) x (1 - painWeight x pain):
  //   fear   0..1. When a wild enemy dies, every band-holder within fearRadiusK x the DEAD enemy's body radius (capped at
  //          fearMaxPx) gets killFear, fading linearly to 0 at the edge of that radius (a big one dying scares farther than a
  //          small one). It decays with time constant fearTau s (your 1 to 3 s window).
  //   pain   0..1. The HP it has lost recently as a fraction of its max HP (decays with time constant painTau s), over painFull:
  //          losing painFull of its max HP inside about painTau s is full pain. Shield damage does not count. Stored pain is
  //          capped at painFull, so an overkill hit does not prolong panic.
  //   meter  a thin panic meter under the HP bar of a damaged unit once it is meterShow (0.5) of the way to panic (full = panic)
  //   weights  fearWeight / painWeight: how much of morale a full fear / full pain takes away (0.6 each: either alone can
  //          leave morale at 0.4 at worst, so it takes both together to get under panicBelow).
  //   retreat  a band-holder backs away ONLY while panicking (inside its band; a panicking unit never approaches). There is no
  //          standard retreat and no retreat delay any more (2026-10-19). Healers and shielders follow the same rule (they back
  //          away only while panicking, inside SEEK.alone; the SEEK floor retreat is gone); panic halves their weak shot too.
  //   panic  morale below panicBelow: it fires at panicFireMul of its normal rate (shot interval / panicFireMul)
  const MORALE = { killFear: 0.35, fearRadiusK: 6, fearMaxPx: 240, fearTau: 1.2, painTau: 1.0, painFull: 0.6, fearWeight: 0.6, painWeight: 0.6,
                   panicBelow: 0.25, panicFireMul: 0.5, meterShow: 0.5 };

  // Shielder and healer hold no band: they seek the biggest group of allies (Enemy.seekMove / seekPick). Screen units.
  //   floor      never closer to you than this (backs away at 0.8x below it)
  //   alone      with no allies in sight they approach to this and hold
  //   scanR/every/sample/switchBy   look for allies within scanR px every `every` s, test the `sample` nearest as group centres,
  //              and only change target when the new group has `switchBy` more allies in reach
  //   stopK      they stop once within stopK x their effect radius of the group centre
  //   weakShot / weakMelee   damage multipliers (on the final damage) of their shot and of touching you; shotCd between
  //              shots; the shot only fires within shotS of you and while you are not in touching range (meleeGap px more)
  const SEEK = { floor: 0.30, alone: 0.55, scanR: 420, every: 0.75, sample: 8, switchBy: 2, stopK: 0.4,
                 weakShot: 0.5, weakMelee: 0.5, shotCd: 2.5, shotS: 0.95, meleeGap: 30 };

  // Melee contact: a walker stops at `stop` x (its radius + yours); the hit test reaches `hit` x that sum.
  const CONTACT = { stop: 1.15, hit: 1.3 };

  // Flanker. Speed = max(own speed, min(own speed x mult, maxVsPlayer x your speed)): lifts slow species, never slows fast ones.
  //   approach / retreat   speed multipliers (1.6 curving round, 1.2 running off)
  //   strike               damage multiplier of its single attack (on the final damage)
  //   sectors / scanR / recheck / switchBy   the area around you is cut into `sectors` wedges; enemies within scanR px are
  //              counted every `recheck` s and the emptiest wedge wins (a new one must be `switchBy` emptier to replace it)
  //   orbit / meleeStand / alignTol   it circles you at `orbit` px (outside the crowd), melee flankers dive in to
  //              `meleeStand` px (just outside your melee reach); alignTol = radians of the wedge it must face before diving
  //   hold       seconds a melee flanker, once next to you, waits for your hit-invulnerability to end before giving up
  //   edge / maxRetreat   it runs until `edge` screens from you (1.0 = the screen edge, 1.15 = just off it), or gives up after maxRetreat s
  //   rest       seconds it waits at the edge before the next approach (0 = straight back; a shooter's edge is close to its band)
  const FLANK = { cap: 2, approach: 1.6, strike: 1.2, retreat: 1.2, maxVsPlayer: 2.0, sectors: 8, scanR: 300, recheck: 0.5,
                  switchBy: 2, orbit: 140, meleeStand: 130, alignTol: 0.35, hold: 1.5, edge: 1.15, maxRetreat: 5, rest: 1.5 };

  // Enemy shot life in seconds by class (shot speed stays 190 px/s). Anything not listed keeps SHOT_LIFE_BASE.
  // Bosses, fans and everything else call shoot() with the base life.
  const SHOT_LIFE_BASE = 2.4, SHOT_LIFE = { shooter: 4.8 };

  // Status class carriers (slice E1, Jess 2026-10-20). One status per species, hand-authored in the Status Roster (the 47 primary Status
  // species plus the 16 secondary ones). CARRIER_OF = dex -> slow | daze | paralysis | confusion | poison | trap | freeze | haste | sleep.
  //   Primary carrier: while ACTIVE it holds the close band (BANDS.carrier, dodgeable) and fires a status shot every `cd` s; otherwise
  //     it acts as a plain chaser. Only `cap` carriers are active at a time (flankers' pattern); haste is exempt from the cap.
  //   Secondary carrier: keeps its own class; its shots and touches carry the status at `secHalf` x the duration, at most one per `secCd` s.
  //   shotMul     damage multiplier of the status shot (final damage)       sleepBase  chance a sleep shot puts you to sleep (drowsy x1.5)
  //   weights     sleep species cast drowsy or sleep by weight                 dur        seconds a landed slow lasts (the other durations are G.Status.CONTROL)
  //   nova        haste: allies within r px get Speed +1 for `dur` s (stack cap `stack`); the caster is excluded; it pulses every `every` s
  const CARRIER = { cap: 2, cd: 3.2, shotMul: 0.5, sleepBase: 0.6, secHalf: 0.5, secCd: 4,
                    weights: { sleep: { drowsy: 2, sleep: 1 } },
                    dur: { slow: 6 },
                    nova: { r: 170, every: 5, dur: 6, stack: 2 } };
  const CARRIER_OF = {
    25:'paralysis', 26:'paralysis', 34:'haste', 38:'confusion', 39:'sleep', 41:'confusion', 44:'poison', 45:'poison',
    46:'paralysis', 47:'paralysis', 48:'poison', 49:'poison', 70:'poison', 81:'daze', 92:'sleep', 93:'poison',
    97:'confusion', 102:'sleep', 124:'freeze', 170:'confusion', 171:'paralysis', 172:'paralysis', 173:'haste', 175:'haste',
    179:'paralysis', 180:'paralysis', 181:'paralysis', 234:'confusion', 261:'trap', 284:'slow', 285:'slow', 286:'haste',
    300:'slow', 301:'slow', 309:'paralysis', 310:'paralysis', 315:'poison', 336:'poison', 370:'daze', 403:'paralysis',
    404:'paralysis', 405:'paralysis', 431:'haste', 432:'haste', 462:'daze', 505:'haste', 549:'haste', 551:'trap',
    575:'sleep', 590:'poison', 601:'slow', 666:'sleep', 700:'slow', 755:'confusion', 763:'slow', 778:'slow',
    795:'daze', 829:'slow', 830:'slow', 849:'poison', 869:'slow', 899:'confusion', 989:'paralysis'
  };
  const carrierOf = dex => CARRIER_OF[dex] || null;
  /** Enemy definition of one species at run time t (debug spawner). */
  function defForDex(dex, t) { const p = G.DEX_BY[dex], ti = tierAt(t); return p ? defFor(p, TIERS[ti], ti) : null; }

  // Status table (status rework, slice A). Damage over time is a fraction of the enemy's MAX HP per turn, from the mainline games:
  // burn 1/16, poison 1/8, Toxic (badly poisoned) N/16 on turn N, N capped at 15 (PokeAPI: Toxic min/max turns = 15). One state per
  // status; a re-hit only refreshes the duration. Every row is its own tuning knob.
  //   frac / step   max-HP fraction per turn (toxic: step x the turn counter N, N capped at `cap`)
  //   turn          seconds per turn. The faithful anchor is 0.5 s (one Tackle at PP 35); 2 s is a deliberate 4x discount because
  //                 DoT works on a whole crowd at once with no aiming
  //   turns         ticks one application lasts (a re-hit refreshes it and never resets the tick timer)
  //   immune        enemy types that cannot get it (mainline type immunities; not in PokeAPI)
  // rollGap: seconds before the same move may roll its ailment chance again on the same target (one roll per cast, and tick kinds
  // such as trail, orbit and aura roll at most this often).
  const STATUS = {
    burn:   { frac: 1 / 16, turn: 2, turns: 4, immune: ['fire'],            color: '#ff9a4d' },
    poison: { frac: 1 / 8,  turn: 2, turns: 4, immune: ['poison', 'steel'], color: '#d47cf0' },
    toxic:  { step: 1 / 16, cap: 15, turn: 2, turns: 8, immune: ['poison', 'steel'], color: '#b44fd6' },
    rollGap: 0.5
  };

  return {
    TIERS, BOSS_SLOTS, eliteDef, rollRun, scale, bossScale, bagAt, upcomingDex, candidates, hordeTypes, hordeDefs, setRegion, classOf, minionFromCast, FAMILY, FAMILY_SHARE, HOLDER_CAP, BANDS, BAND_JITTER, MORALE, SEEK, STATUS, CARRIER, CARRIER_OF, carrierOf, defForDex, CONTACT, FLANK, SHOT_LIFE, SHOT_LIFE_BASE,
    get region() { return region; },           // null = full dex (Paldea-equiv); else gen 1-9
    enemyHp, openingHpK, levelForTime,
    get BOSSES() { if (!bosses) rollRun(); return bosses; },
    get cast() { if (!cast) rollRun(); return cast; }
  };
})();
