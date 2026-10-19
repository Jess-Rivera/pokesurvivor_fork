/* ============ elites.js: overworld elites (feature/boss-rework) ============
 * An elite is a regular (non-boss) wild Enemy, sized up, with a big HP pool and a power multiplier. It reuses the wild AI of its
 * class and the wild damage path (atkFactor). Species: region-accurate, one BST tier above the highest active wild tier, no
 * legendaries, no repeats. The player's FIRST hit engages it; 60 s after that it ENRAGES (damage ramps, no speed bonus).
 * While one is alive and for a minute after it spawns, the wild cap and spawn rate are halved (then ramp back over 30 s) and
 * the excess wild units walk off screen and are removed (no XP). See BOSS-REWORK.md section 2 and BALANCE.md.
 * Cadence is TEMPORARY until gyms exist: first at 2:00, then every 6:00 (one alive at a time).
 */
G.Elites = (() => {
  const K = {
    first: 120, every: 360,                 // TEMP cadence (seconds)
    ttk: 25,                                // target seconds of focused fire to kill one (design: 20 to 30)
    uptime: 0.7, hitGap: 0.7, build: 0.2,   // reference damage model (TUNE by the TTK readout on elite death)
    minHpMul: 3,                            // never less than this x a wild unit's HP at that level
    powMul: 1.5,                            // power multiplier on the wild ratio attack path (TUNE)
    xpMul: 1.2,                             // XP = wild yield x HP multiplier x this
    itemChance: 0.5,                        // chance of an item on death (a Berry is guaranteed)
    enrageAfter: 60, enrageRamp: 30, enrageMax: 2,   // damage x1.0 -> x2.0 over 30 s, starting 60 s after engagement
    capFrac: 0.5, hold: 60, ramp: 30,       // wild cap and rate: 50% for 60 s after spawn, then back to 100% over 30 s
    preload: 12                             // pick the species this many seconds before, so its sprite is ready
  };
  let nextAt = K.first, alive = null, pending = null, used = new Set(), lastSpawn = -1e9, runT = 0, lastTtk = null;

  function reset() { nextAt = K.first; alive = null; pending = null; used = new Set(); lastSpawn = -1e9; runT = 0; lastTtk = null; }

  /** HP for an elite of this species at run time t, from the reference damage model (no opening HP discount). */
  function hpFor(def, t) {
    const L = G.Stats.levelForTime(t), st = (G.DEX_BY[def.dex] && G.DEX_BY[def.dex].stats) || [50, 50, 50, 50, 50, 50];
    const wild = G.Stats.hpForLevel(def.baseHp != null ? def.baseHp : 50, L);
    const dStat = (G.Stats.statValue(st[2], L) + G.Stats.statValue(st[4], L)) / 2;
    const hit = ((2 * L / 5 + 2) * 40 * G.Stats.spAtk(65, L) / 50) / Math.max(1, dStat) + 2;
    const dps = hit / K.hitGap * (1 + K.build * t / 60) * K.uptime;
    const hp = Math.max(dps * K.ttk, wild * K.minHpMul);
    return { hp: Math.round(hp), mul: hp / wild };
  }

  function pickSpecies(t) {
    const def = G.Enemies.eliteDef(t, used);
    if (def) used.add(def.dex);
    return def;
  }

  /** Builds the elite descriptor on a COPY of the wild def and puts it on the map. */
  function spawn(t, def) {
    def = def || pending || pickSpecies(t);
    pending = null;
    if (!def) return null;
    const h = hpFor(def, t);
    const d = Object.assign({}, def, { elite: { hp: h.hp, hpMul: h.mul, pow: K.powMul, xpMul: h.mul * K.xpMul, engagedAt: null, enrage: 1, spawnedAt: t } });
    const e = G.Spawner.placeElite(d, t);
    if (!e) { used.delete(def.dex); return null; }
    alive = e; lastSpawn = t; nextAt = t + K.every;
    trim();
    return e;
  }

  /** Over the lowered cap: the farthest/off-screen wild units walk off and are deleted (no XP). */
  function trim() {
    const target = Math.floor(G.Spawner.CAP * K.capFrac);
    const wild = G.EnemyMgr.all().filter(e => !e.dead && !e.boss && !e.elite && !e.shiny && !e.leaving && !e.remote);
    let excess = G.EnemyMgr.count - target;
    if (excess <= 0) return;
    const pl = G.Game.player;
    wild.sort((a, b) => (G.Camera.sees(a.x, a.y, 40) - G.Camera.sees(b.x, b.y, 40)) || (G.U.dist2(b.x, b.y, pl.x, pl.y) - G.U.dist2(a.x, a.y, pl.x, pl.y)));
    for (const e of wild) { if (excess-- <= 0) break; e.leaving = true; }
  }

  /** 0..1 position in the post-spawn window: wild cap / rate multiplier (1 = normal). */
  function wildMul() {
    const s = runT - lastSpawn;
    if (s < 0 || s >= K.hold + K.ramp) return 1;
    if (s < K.hold) return K.capFrac;
    return K.capFrac + (1 - K.capFrac) * (s - K.hold) / K.ramp;
  }

  function update(dt, t) {
    runT = t;
    if (alive && alive.dead) alive = null;
    if (alive) {
      const x = alive.elite, s = x.engagedAt == null ? -1 : t - x.engagedAt;
      x.enrage = s <= K.enrageAfter ? 1 : 1 + (K.enrageMax - 1) * Math.min(1, (s - K.enrageAfter) / K.enrageRamp);
      alive.atkFactor = alive.atkFactor0 * x.pow * x.enrage;
      return;
    }
    if (!pending && t >= nextAt - K.preload) {
      pending = pickSpecies(t);
      if (pending) G.Sprites.preload([pending.dex]);
    }
    if (t >= nextAt) spawn(t);
  }

  /** The player's first damage on an elite. */
  function engage(e) { const x = e.elite; if (x && x.engagedAt == null) { x.engagedAt = runT; } }

  /** Seconds left to enrage (0 once enraged), or null when not engaged yet. */
  function enrageIn(e) {
    const x = e.elite;
    if (!x || x.engagedAt == null) return null;
    return Math.max(0, K.enrageAfter - (runT - x.engagedAt));
  }

  /** TTK readout (for retuning): seconds from first hit to the kill. */
  function noteDeath(e) {
    const x = e.elite;
    lastTtk = x.engagedAt == null ? null : +(runT - x.engagedAt).toFixed(1);
    // Matchup, so a 4x result is not read as a weak model: the player's best type multiplier against the elite.
    let match = '';
    try {
      const pl = G.Game.player, pt = (pl && pl.types) || (G.DEX_BY[pl.dex] && G.DEX_BY[pl.dex].types) || [];
      const best = Math.max(...pt.map(t => G.Types.mult(t, e.types)));
      match = ', ' + ((G.DEX_BY[pl.dex] && G.DEX_BY[pl.dex].name) || 'player') + ' (' + pt.join('/') + ') vs ' + e.types.join('/') + ' x' + best + ', player L' + pl.level;
    } catch (x) { }
    if (G.Log && G.Log.on) console.log('[Elite] ' + e.name + ' down at ' + runT.toFixed(0) + ' s: TTK ' + lastTtk + ' s (target ' + K.ttk + '), HP ' + e.maxHp + ', x' + x.hpMul.toFixed(1) + ' wild HP, enrage x' + x.enrage.toFixed(2));
  }

  return {
    K, reset, update, spawn, engage, enrageIn, noteDeath, hpFor,
    capMul: wildMul, rateMul: wildMul,
    current() { return alive && !alive.dead ? alive : null; },
    now() { return runT; },
    get lastTtk() { return lastTtk; },
    /** Dev: the clock was jumped (G.Debug.skipTo). Syncs our clock and pushes the natural cadence a full interval out, so a skip
     *  never drops a surprise elite on top of a test one. */
    setClock(t) { runT = t; pending = null; if (!alive) nextAt = t + K.every; },
    debugSpawn() { return spawn(G.Game.st.time); }
  };
})();
