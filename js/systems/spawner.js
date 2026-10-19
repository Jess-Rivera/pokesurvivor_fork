/* ============ spawner.js — waves, elites and shinies ============
 * Enemies appear in a ring just outside the view, so they never
 * materialize on screen. Every ~45 s there is a "tide": a concentrated
 * surge from one particular side, to break the rhythm.
 *
 * Each enemy has a 1/4096 chance of being shiny (like in the classic games).
 * A run kills 1,500-4,000, so one shows up every 1-3 games.
 *
 * Co-op (host only): they appear around a random live player,
 * out of sight of EVERYONE, and there are more and stronger ones depending on how many
 * are playing (see G.Coop.scaleRate / scaleHp).
 */
G.Spawner = (() => {
  // Cap of enemies at once (was 420: with that many it slowed down). When
  // the cap is reached, the Density Bonus pays more XP (see DENSITY_FROM).
  const CAP = 64;
  // Density Bonus (was the "crowd bump"): XP only, x1.6 on a spawn while this many are alive, once the opening XP boost is over.
  const DENSITY_FROM = 54, DENSITY_XP = 1.6;
  // Fewer Pokemon but stronger (the screen does not get crowded): ~24% of
  // the previous number spawn, each with more health, damage and experience.
  const DENSITY = 0.24, DMG_K = 2.4;
  // The extra toughness grows with the run: x3.3 at first and up to x5
  // toward minute 6, when you already have attacks to take them down.
  const hpK = t => 3.3 + Math.min(1.7, t / 210);
  const SHINY_RATE = 1 / 4096;
  // Opening XP boost: wild kills pay XP_BOOST x until the first boss slot (3:00).
  const XP_BOOST = 2.0;
  let acc = 0, surgeT = 32, announce = null, announceT = 0, preloadT = 0, runT = 0;
  let forceShiny = 0;           // for testing: the next N spawn shiny
  let debugMul = 1;             // ?dev: scales the drip, the tides, bursts and the elite timer (0 = nothing spawns), see G.Debug.spawn

  function reset() {
    acc = 0; surgeT = 32; preloadT = 0; runT = 0;
    announce = Math.round(G.Stats.XP_BOOST_END / 60) + ' Min XP boost!'; announceT = 4;
    G.Enemies.rollRun();
    G.Elites.reset();
    G.Sprites.preload(G.Enemies.upcomingDex(0, 80));
  }

  /** Enemies per second based on the run's minute. */
  function rate(t) {
    return (1.6 + t * 0.028 + Math.pow(t / 60, 1.6) * 0.5) * DENSITY;
  }

  function ringPoint(pl, angle) {
    const d = G.Camera.outerRadius() + G.U.rand(10, 70);
    return [pl.x + Math.cos(angle) * d, pl.y + Math.sin(angle) * d * 0.9];
  }

  let players = [];

  /** Would any player see it? (to avoid spawning in front of anyone) */
  function seenByAnyone(x, y) {
    const r = G.Camera.outerRadius() - 30;
    return players.some(o => G.U.dist2(o.x, o.y, x, y) < r * r);
  }

  /** A ring point where it fits: not inside walls or in the water. */
  function freePoint(pl, angle, flying) {
    for (let i = 0; i < 8; i++) {
      const a = angle + (i === 0 ? 0 : G.U.rand(-0.9, 0.9));
      const [x, y] = ringPoint(pl, a);
      if (players.length > 1 && seenByAnyone(x, y)) continue;
      if (flying || G.World.isFree(x, y, 14)) return [x, y];
    }
    return null;
  }

  /** The player around which the next enemy spawns. */
  function anchor() {
    const alive = players.filter(o => !o.dead);
    return alive.length ? G.U.pick(alive) : players[0];
  }

  // HP is no longer scaled here: wild-enemy HP comes from the mainline formula
  // (G.Enemies.enemyHp) inside the Enemy constructor. This passes sc through unchanged
  // (the co-op/density k no longer multiplies HP; it stays dormant with deferred MP).
  function scaled(sc, k) { return sc; }

  function isFlyer(def) { return G.Sprites.hovers(def.dex); }

  function rollShiny(dex) {
    if (!G.Sprites.hasShiny(dex)) return false;
    if (forceShiny > 0) { forceShiny--; return true; }
    return Math.random() < SHINY_RATE;
  }

  /** Band-holders alive and units alive (the ceiling in G.Enemies.HOLDER_CAP). */
  function holderCount() {
    let h = 0, n = 0;
    for (const e of G.EnemyMgr.all()) if (!e.dead && !e.boss && !e.elite && !e.leaving) { n++; if (e.keepsDistance()) h++; }
    return [h, n];
  }

  function spawnOne(pl, t, angle) {
    const bag = G.Enemies.bagAt(t), HC = G.Enemies.HOLDER_CAP;
    let def = G.U.pick(bag);
    if (G.Enemies.BANDS[def.behavior]) {                  // a band-holder: keep them to HC.share of what is alive
      const [h, n] = holderCount();
      if (h >= HC.floor && h + 1 > HC.share * (n + 1)) {
        for (let i = 0; i < HC.rerolls && G.Enemies.BANDS[def.behavior]; i++) def = G.U.pick(bag);
      }
    }
    const pt = freePoint(pl, angle == null ? Math.random() * 6.2832 : angle, isFlyer(def));
    if (!pt) return null;
    const shiny = rollShiny(def.dex);
    const e = new G.Enemy(def, pt[0], pt[1], G.Enemies.scale(t));
    e.dmg *= DMG_K;
    // Density Bonus: XP only (the old x1.25 damage part is gone). Absolute count, from the end of the opening XP boost.
    if (t >= G.Stats.XP_BOOST_END && G.EnemyMgr.count >= DENSITY_FROM) e.xpMul *= DENSITY_XP;
    if (shiny) e.makeShiny();
    if (G.Events.golden) e.makeGolden();
    G.EnemyMgr.add(e);
    if (shiny) {
      say('¡Un ' + e.name + ' shiny anda cerca!', 3.4);
      G.Audio.sfx('shiny');
    }
    return e;
  }

  /** Puts an elite (def carries the `elite` descriptor, see systems/elites.js) just outside the view. */
  function placeElite(def, t) {
    const pl = anchor();
    let pt = null;
    for (let i = 0; i < 6 && !pt; i++) pt = freePoint(pl, Math.random() * 6.2832, isFlyer(def));
    if (!pt) pt = ringPoint(pl, Math.random() * 6.2832);
    const e = new G.Enemy(def, pt[0], pt[1], G.Enemies.scale(t));
    if (rollShiny(def.dex)) e.makeShiny();
    G.EnemyMgr.add(e);
    say('¡Un ' + e.name + ' élite apareció!', 3.2);
    G.Camera.kick(0.8);
    G.Audio.sfx('boss');
    return e;
  }

  /** @param who  the player or the list of players (co-op) */
  function update(dt, who, t) {
    players = Array.isArray(who) ? who : [who];
    runT = t;
    if (announceT > 0) announceT -= dt;
    // In the rift arena nothing else spawns (and the boss clock waits).
    // In Arceus's Judgment, only its legendaries (systems/judgment.js).
    if (G.Rift.inArena || G.Judgment.active) return;

    // Preloads what will spawn in the next minute.
    preloadT -= dt;
    if (preloadT <= 0) { preloadT = 10; G.Sprites.preload(G.Enemies.upcomingDex(t, 60)); }

    // --- elites (systems/elites.js): spawn, enrage, and the lowered wild cap / rate around them ---
    if (debugMul > 0) G.Elites.update(dt, t);
    const capNow = Math.floor(CAP * G.Elites.capMul());
    const eliteOn = !!G.Elites.current();

    // --- goteo normal ---
    if (G.EnemyMgr.count < capNow) {
      acc += rate(t) * G.Coop.scaleRate(players.length) * G.Elites.rateMul() * debugMul * dt;
      let n = Math.floor(acc);
      acc -= n;
      while (n-- > 0 && G.EnemyMgr.count < capNow) spawnOne(anchor(), t);
    }

    // --- marea (no tides while an elite is alive) ---
    if (!eliteOn && debugMul > 0) surgeT -= dt;
    if (surgeT <= 0) {
      surgeT = G.U.rand(38, 56);
      const base = Math.random() * 6.2832;
      const target = anchor();
      const n = Math.min(capNow - G.EnemyMgr.count, Math.round((14 + Math.floor(t / 22)) * G.Coop.scaleRate(players.length) * 0.4));
      for (let i = 0; i < n; i++) spawnOne(target, t, base + G.U.rand(-0.55, 0.55));
      say('¡Marea de Pokémon!', 2.2);
      G.Audio.sfx('surge');
    }
  }

  /** A handful at once from one side (when starting a horde). */
  function burst(n) {
    if (debugMul <= 0) return;
    const base = Math.random() * 6.2832, target = anchor() || G.Game.player, t = G.Game.st.time;
    for (let i = 0; i < n && G.EnemyMgr.count < CAP + 10; i++) spawnOne(target, t, base + G.U.rand(-0.6, 0.6));
  }

  /**
   * A straggler comes back out ahead of the player (toward where they run),
   * out of sight. Returns false if there is no room (then it is removed).
   */
  function ahead(e, pl) {
    if (!players.length) players = [pl];
    const sp = Math.hypot(pl._vx || 0, pl._vy || 0);
    const a0 = sp > 20 ? Math.atan2(pl._vy, pl._vx) : Math.random() * 6.2832;
    const pt = freePoint(pl, a0 + G.U.rand(-0.9, 0.9), e.flying);
    if (!pt) return false;
    e.x = pt[0]; e.y = pt[1]; e.kx = e.ky = 0;
    e.phase = 'walk'; e.pt = 0; e.jump = null; e.jumpLift = 0;
    return true;
  }

  /** Big on-screen notice (also used by the biome and the shinies). */
  /** @param local  only on this computer (not sent to teammates) */
  function say(text, secs = 2.6, local = false) {
    announce = text; announceT = secs;
    if (G.Coop.isHost && !local) G.Coop.say(text, secs);
  }

  function banner() { return announceT > 0 ? { text: announce, t: announceT } : null; }

  /** Guest in co-op: only runs the notice clock. */
  function tickBanner(dt) { if (announceT > 0) announceT -= dt; }

  /** XP multiplier for wild kills: XP_BOOST until the first boss slot, then 1. */
  function xpBoost() { return runT < G.Stats.XP_BOOST_END ? XP_BOOST : 1; }
  return { reset, update, ahead, placeElite, burst, tickBanner, banner, say, rate, xpBoost, SHINY_RATE, CAP,
           debugForceShiny(n = 1) { forceShiny = n; },
           debugRate(k) { debugMul = Math.max(0, +k); if (!isFinite(debugMul)) debugMul = 1; return debugMul; } };
})();
