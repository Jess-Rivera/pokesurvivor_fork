/* ============ spawner.js — waves, bosses and shinies ============
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
  // the cap is reached, those that keep spawning are "elite" (more health, damage and
  // experience), so the difficulty does not drop.
  const CAP = 64, ELITE_FROM = 0.85;
  // Fewer Pokemon but stronger (the screen does not get crowded): ~24% of
  // the previous number spawn, each with more health, damage and experience.
  const DENSITY = 0.24, DMG_K = 2.4;
  // The extra toughness grows with the run: x3.3 at first and up to x5
  // toward minute 6, when you already have attacks to take them down.
  const hpK = t => 3.3 + Math.min(1.7, t / 210);
  const SHINY_RATE = 1 / 4096;
  let acc = 0, bossIdx = 0, surgeT = 32, announce = null, announceT = 0, preloadT = 0;
  let forceShiny = 0;           // for testing: the next N spawn shiny

  function reset() {
    acc = 0; bossIdx = 0; surgeT = 32; announce = null; announceT = 0; preloadT = 0;
    G.Enemies.rollRun();
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

  function spawnOne(pl, t, angle) {
    const def = G.U.pick(G.Enemies.bagAt(t));
    const pt = freePoint(pl, angle == null ? Math.random() * 6.2832 : angle, isFlyer(def));
    if (!pt) return null;
    const shiny = rollShiny(def.dex);
    const e = new G.Enemy(def, pt[0], pt[1], G.Enemies.scale(t));
    e.dmg *= DMG_K;
    // Elite (crowded screen): dmg/xp bump only. HP bump removed this slice; a future
    // elite will be "current enemy level + X", i.e. a higher-level spawn (HP falls out
    // of the formula), not an HP multiplier. See DECISIONS.md.
    if (G.EnemyMgr.count >= CAP * ELITE_FROM) { e.dmg *= 1.25; e.xpMul *= 1.6; }
    if (shiny) e.makeShiny();
    if (G.Events.golden) e.makeGolden();
    G.EnemyMgr.add(e);
    if (shiny) {
      say('¡Un ' + e.name + ' shiny anda cerca!', 3.4);
      G.Audio.sfx('shiny');
    }
    return e;
  }

  function spawnBoss(pl, t, b) {
    const [x, y] = ringPoint(pl, Math.random() * 6.2832);
    const e = new G.Enemy(b, x, y, scaled(G.Enemies.bossScale(t), G.Coop.scaleHp(players.length) * (players.length > 1 ? 1.4 : 1)), true);
    if (rollShiny(b.dex)) e.makeShiny();
    G.EnemyMgr.add(e);
    say('¡' + e.name + (e.shiny ? ' shiny' : '') + ' salvaje apareció!', 3.2);
    G.Camera.kick(1.1);
    G.Audio.sfx('boss');
    return e;
  }

  /** @param who  the player or the list of players (co-op) */
  function update(dt, who, t) {
    players = Array.isArray(who) ? who : [who];
    if (announceT > 0) announceT -= dt;
    // In the rift arena nothing else spawns (and the boss clock waits).
    // In Arceus's Judgment, only its legendaries (systems/judgment.js).
    if (G.Rift.inArena || G.Judgment.active) return;

    // Preloads what will spawn in the next minute.
    preloadT -= dt;
    if (preloadT <= 0) { preloadT = 10; G.Sprites.preload(G.Enemies.upcomingDex(t, 60)); }

    // --- jefes ---
    const b = G.Enemies.BOSSES[bossIdx];
    if (b && t >= b.at) { spawnBoss(anchor(), t, b); bossIdx++; }

    // Boss fight: the waves drop to 25% and there are no tides, so the
    // boss is its own moment and can be targeted amid the crowd.
    const bossFight = G.EnemyMgr.bossAlive();

    // --- goteo normal ---
    if (G.EnemyMgr.count < CAP) {
      acc += rate(t) * G.Coop.scaleRate(players.length) * (bossFight ? 0.25 : 1) * dt;
      let n = Math.floor(acc);
      acc -= n;
      while (n-- > 0 && G.EnemyMgr.count < CAP) spawnOne(anchor(), t);
    }

    // --- marea ---
    if (!bossFight) surgeT -= dt;
    if (surgeT <= 0) {
      surgeT = G.U.rand(38, 56);
      const base = Math.random() * 6.2832;
      const target = anchor();
      const n = Math.min(CAP - G.EnemyMgr.count, Math.round((14 + Math.floor(t / 22)) * G.Coop.scaleRate(players.length) * 0.4));
      for (let i = 0; i < n; i++) spawnOne(target, t, base + G.U.rand(-0.55, 0.55));
      say('¡Marea de Pokémon!', 2.2);
      G.Audio.sfx('surge');
    }
  }

  /** A handful at once from one side (when starting a horde). */
  function burst(n) {
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

  return { reset, update, ahead, burst, tickBanner, banner, say, rate, SHINY_RATE, CAP,
           debugForceShiny(n = 1) { forceShiny = n; } };
})();
