/* ============ gym-arena.js: the gym gate on the map and the gym arena ============
 *
 * G.Gym schedules a gym gate (systems/gym.js); this module places it on the map and runs the arena. The gate never
 * times out. Walking into it takes the player (with the whole group) to a closed arena of the gym's type, against the
 * gym leader (G.Gym.makeDef).
 *
 *   win    the leader falls: G.Gym.onWin pays the badge package, the pickups fly to the player and each player gets a
 *          LINK (fuses moves, see Player.fuse); 5 s later you return to the map where you were and the fusion is chosen
 *   lose   there is no arena timer: a team wipe ends the run (game.js); the enrage clock is the pressure (gym.js)
 *
 * While the arena lasts, the map enemies are stashed (EnemyMgr.stash) and nothing else spawns (spawner, events and
 * weather check inArena); on returning everything is as it was.
 *
 * Gyms only since 2026-10-31 (DECISIONS): this replaces the old random boss portals, whose gym half it keeps.
 * Co-op is deferred scope: the host still broadcasts 'arena' and 'aw' (onEvent below), but js/net/coop.js does not route
 * them here yet (TODO, deferred section).
 */
G.GymArena = (() => {
  const ARENA_R = 11;
  const WEATHER_T = 135;          // seconds of the arena's own weather (the theme's), unchanged from before the gyms-only change
  let gate = null;                // { x, y, t, gym }: the gate on the map; gym = the gate info from G.Gym
  let arena = null;               // { tx, ty, r, dex, shiny, type, gym, x, y, back, biome, t, phase, endT, bossId }
  let asked = false;
  const authority = () => !G.Coop.active || G.Coop.isHost;
  const TS = () => G.Tiles.T * G.Sprites.PX;

  function reset() { gate = null; arena = null; asked = false; }

  // ---------------- the gate on the map ----------------

  function update(dt, pl) {
    if (gate) {
      gate.t += dt;
      if (!arena && !pl.dead && G.U.dist2(pl.x, pl.y, gate.x, gate.y - 10) < 30 * 30) enter();
    }
    if (arena) arenaTick(dt, pl);
  }

  /** Opens the gym gate near the player (it never times out). Returns false if no free spot was found. */
  function openGate(info) {
    const near = G.Game.player;
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * 6.2832, d = G.U.rand(380, 560);
      const x = near.x + Math.cos(a) * d, y = near.y + Math.sin(a) * d * 0.85;
      if (!G.World.isFree(x, y, 22)) continue;
      gate = { x, y, t: 0, gym: info };
      asked = false;
      // (The big notice is drawn by hud.js while gate.t < 4.5 s.)
      G.Audio.sfx('gate');
      G.FX.ring(x, y, 6, 80, '#b48aff', 0.7, 5);
      G.Spawner.say('A gym gate opened: ' + info.leader + ' (Lv ' + info.level + ')', 3.4, true);
      return true;
    }
    return false;
  }

  function enter() {
    if (asked) return;
    asked = true;
    if (authority()) start();
    else G.Coop.toHost(['re']);
  }

  // ---------------- arena ----------------

  /** Whoever is in charge: the arena of the gym's type and the authored leader, and notifies everyone. */
  function start() {
    if (arena || !gate) return;
    const g = gate.gym;
    const cfg = {
      tx: 5000 + Math.floor(Math.random() * 3000), ty: 5000 + Math.floor(Math.random() * 3000), r: ARENA_R,
      dex: g.dex, shiny: false, type: g.arena, gym: g
    };
    if (G.Coop.isHost) G.Coop.broadcast(['arena', cfg]);
    begin(cfg);
    spawnLeader(g);
  }

  function spawnLeader(g) {
    const ts = TS();
    const e = G.Boss.make(G.Gym.makeDef(g), arena.x, arena.y - ts * 3.5);
    e.flying = false;                  // collides with walls like you, so your shots can reach it
    G.EnemyMgr.add(e);
    arena.bossId = e.id;
    G.Spawner.say(g.leader + ' sends out ' + e.name + '!', 3.2);
    G.Camera.kick(1.1);
    G.Audio.sfx('boss');
  }

  /** On each computer: trip to the arena. */
  function begin(cfg) {
    const pl = G.Game.player;
    const ts = TS();
    arena = Object.assign({}, cfg, {
      x: cfg.tx * ts + ts / 2, y: cfg.ty * ts + ts / 2,
      back: { x: pl.x, y: pl.y }, biome: G.World.biome, t: 0, phase: 'fight', endT: 0, bossId: 0
    });
    gate = null; asked = false;
    if (authority()) G.EnemyMgr.stash(); else G.EnemyMgr.clearRemote();
    G.Projectiles.clear();
    G.Combat.clearFields();
    G.Hazards.clear();
    G.World.setArena({ tx: cfg.tx, ty: cfg.ty, r: cfg.r, type: cfg.type });
    G.World.setBiome(G.Tiles.arenaBiome(cfg.type), true);
    // Each arena brings its own weather (the volcano, sun; the glacier, snow...).
    const th = G.Tiles.ARENA_THEMES[cfg.type];
    if (th && th.weather) G.Weather.force(th.weather, WEATHER_T);
    // Everyone to the south of the arena, in a row; the leader appears to the north.
    const ps = G.Game.everyone();
    ps.forEach((p, i) => { p.x = arena.x + (i - (ps.length - 1) / 2) * 34; p.y = arena.y + ts * 3; });
    G.Camera.x = pl.x; G.Camera.y = pl.y;
    G.Game.flash('#c9a6ff', 0.9);
    G.Audio.sfx('gate');
    G.Spawner.say('Gym Leader ' + cfg.gym.leader + ' wants to battle!', 2.4, true);
  }

  /** No one leaves the arena circle (in case something pushes too hard). */
  function keepInside() {
    const ts = TS(), max = (arena.r - 1.4) * ts;
    for (const e of G.EnemyMgr.all()) {
      if (e.remote) continue;
      const dx = e.x - arena.x, dy = e.y - arena.y, d = Math.hypot(dx, dy);
      if (d > max) { e.x = arena.x + dx / d * max; e.y = arena.y + dy / d * max; }
    }
  }

  function arenaTick(dt, pl) {
    arena.t += dt;
    if (arena.phase === 'fight') {
      if (!authority()) return;
      keepInside();
      const boss = G.EnemyMgr.get(arena.bossId);
      if (!boss || boss.dead) { G.Coop.isHost && G.Coop.broadcast(['aw']); won(); }
      return;                          // no timer; a team wipe ends the run (game.js), the enrage clock is the pressure
    }
    arena.endT -= dt;
    if (arena.endT <= 0) finish();
  }

  function won() {
    if (!arena || arena.phase !== 'fight') return;
    arena.phase = 'won'; arena.endT = 5;
    G.Gym.onWin(arena.gym);
    G.Pickups.pullAll();
    G.Spawner.say('¡Has vencido a ' + G.DEX_BY[arena.dex].name + '! Recoge el premio…', 3.4, true);
    G.Audio.sfx('legend');
    const pl = G.Game.player;
    if (pl) {
      pl.bonds++;
      G.FX.dmgText(pl.x, pl.y - pl.bodyH - 10, '¡Vínculo!', '#ff8ad8', true);
      G.FX.ring(pl.x, pl.y, 8, 90, '#ff8ad8', 0.7, 5);
    }
  }

  /** On each computer: back to the map. */
  function finish() {
    const pl = G.Game.player;
    const a = arena;
    arena = null;
    G.Gym.onReturn(a.gym);
    G.World.setBiome(a.biome, true);
    G.Weather.clear();
    // Guest: nothing is deleted. The host reports the arena ones that
    // leave and the map ones that return; if the guest finished its countdown
    // a bit later (happens almost always), it deleted the ones that had just
    // returned and they were not visible until they fell (only their attacks).
    if (authority()) G.EnemyMgr.restore();
    G.Projectiles.clear();
    G.Combat.clearFields();
    G.Hazards.clear();
    for (const p of G.Game.everyone()) { p.x = a.back.x; p.y = a.back.y; }
    pl.x = a.back.x; pl.y = a.back.y;
    if (pl.dead) pl.revive(0.3);
    G.Camera.x = pl.x; G.Camera.y = pl.y;
    G.Game.flash('#c9a6ff', 0.8);
    if (pl.bonds > 0) G.Game.offerBond();
  }

  // ---------------- drawing ----------------

  /** The gate, to sort it by Y with the rest of the scene. The art is still the old purple portal (issue #1). */
  function drawable() {
    if (!gate) return null;
    return {
      y: gate.y,
      draw(ctx) {
        const P = G.Sprites.PX;
        const img = G.Tiles.propSprite(0, 'gate', Math.floor(gate.t * 8) % 4);
        const w = img.width * P, h = img.height * P;
        const fadeIn = Math.min(1, gate.t * 2);
        ctx.save();
        ctx.globalAlpha = 0.25 * fadeIn;
        ctx.fillStyle = '#7b3cff';
        ctx.beginPath(); ctx.ellipse(gate.x, gate.y, 34, 12, 0, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = fadeIn;
        ctx.drawImage(img, Math.round(gate.x - w / 2), Math.round(gate.y - h + 4), w, h);
        ctx.restore();
        if (Math.random() < 0.3) G.FX.px(gate.x + G.U.rand(-14, 14), gate.y - G.U.rand(10, 80), '#d9c2ff', { vy: -40, life: 0.6 });
      }
    };
  }

  // ---------------- network (deferred scope) ----------------

  function onEvent(ev) {
    switch (ev[0]) {
      case 'arena': begin(ev[1]); break;
      case 'aw': won(); break;
    }
  }

  return {
    reset, update, drawable, onEvent, openGate, enterRequest() { if (!arena) start(); },
    get gate() { return gate; }, get arena() { return arena; },
    get inArena() { return !!arena; }
  };
})();
