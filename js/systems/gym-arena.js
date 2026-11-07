/* ============ gym-arena.js: the gym gate on the map and the gym arena ============
 *
 * G.Gym schedules a gym gate (systems/gym.js); this module places it on the map and runs the arena. The gate never
 * times out. Walking into it takes the player (with the whole group) to a closed arena of the gym's type, against the
 * gym leader (G.Gym.makeDef).
 *
 *   win    the leader falls: G.Gym.onWin pays the badge package, the pickups fly to the player and each player gets a
 *          LINK (fuses moves, see Player.fuse); 5 s later you return to the map where you were and the fusion is chosen
 *   lose   there is no arena timer: a team wipe ends the run (game.js); the enrage clock is the pressure (gym.js)
 *   team   slice 7: a switched gym (G.GymLeader) fields its loop lineup as one G.Team. Only the mon on the field is in the
 *          enemy list; when it faints, SEND_BEAT s later the lowest living slot takes its spot. The win is the team wipe.
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
  const WEATHER_T = 135; // seconds of the arena's own weather (the theme's), unchanged from before the gyms-only change
  const SEND_BEAT = 1.3; // slice 7 (Q2, Jess 2026-11-07): seconds from a leader mon's faint to the next send-out
  let gate = null; // { x, y, t, gym }: the gate on the map; gym = the gate info from G.Gym
  let arena = null; // { tx, ty, r, dex, shiny, type, gym, x, y, back, biome, t, phase, endT, bossId, team, sendT }
  let asked = false;
  const GATE_ART_SCALE = 0.5; // the gym building images are 288x248; drawn at half size on the map
  const GATE_ART_W = 288,
    GATE_ART_H = 248; // art pixels; gym-contact.png has the same size
  const GATE_MASK_TOP = 24; // fallback contact area if the mask data is missing: the art minus this many top rows (the roof)
  const GATE_CLEAR_STEP = 16; // spawn clearance: the contact area is sampled on this grid (world px)...
  const GATE_CLEAR_R = 8; // ...and each sample needs this much free space
  const GATE_SHADOW_DX = 10,
    GATE_SHADOW_DY = -8; // the building's shadow, offset north-east (world px)
  const GATE_SHADOW_A = 0.35;
  const GATE_FALLBACK = '#c9b37a'; // ring color for an arena type with no entry in TYPE_COLOR
  const gateArt = {}; // arena type -> Image of assets/tileset/gyms/gym-<type>.png (loaded when a gate of that type opens)
  const authority = () => !G.Coop.active || G.Coop.isHost;
  const TS = () => G.Tiles.T * G.Sprites.PX;

  /** A black copy of an image (same shape), for the building's shadow. */
  function silhouette(img) {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  /** The gate art for an arena type, started loading on first ask. Returns an entry whose img (and shadow) is drawable once ok is true. */
  function artFor(type) {
    let a = gateArt[type];
    if (!a) {
      a = gateArt[type] = { img: null, shadow: null, ok: false };
      if (typeof Image === 'undefined') return a; // the offline harnesses run without a DOM
      a.img = new Image();
      a.img.onload = () => {
        a.shadow = silhouette(a.img);
        a.ok = true;
      };
      a.img.src = 'assets/tileset/gyms/gym-' + type + '.png';
    }
    return a;
  }

  // The contact area, shared by every gym: the painted pixels of assets/tileset/gyms/gym-contact.png (1 = solid), baked into
  // G.GymContact (js/data/gym-contact.js, by tools/gym_contact.js) so no canvas pixels are read at runtime (Firefox blocks that on file://).
  const mask = { ok: false, solid: null };
  const gc = G.GymContact;
  if (gc && gc.w === GATE_ART_W && gc.h === GATE_ART_H) {
    mask.solid = new Uint8Array(GATE_ART_W * GATE_ART_H);
    gc.rows.split('/').forEach((row, y) => {
      if (row)
        for (const run of row.split(',')) {
          const [x0, x1] = run.split('-').map(Number);
          mask.solid.fill(1, y * GATE_ART_W + x0, y * GATE_ART_W + x1);
        }
    });
    mask.ok = true;
  }

  /** Is world point (x, y) on the contact area of a building whose door (feet) is at (gx, gy)? */
  function onBuilding(gx, gy, x, y) {
    const ix = Math.floor((x - gx) / GATE_ART_SCALE + GATE_ART_W / 2),
      iy = Math.floor((y - gy - 4) / GATE_ART_SCALE + GATE_ART_H);
    if (ix < 0 || iy < 0 || ix >= GATE_ART_W || iy >= GATE_ART_H) return false;
    return mask.ok ? mask.solid[iy * GATE_ART_W + ix] === 1 : iy >= GATE_MASK_TOP;
  }

  /** Is the whole contact area of a building at (gx, gy) on free ground? */
  function spotClear(gx, gy) {
    const w = GATE_ART_W * GATE_ART_SCALE,
      h = GATE_ART_H * GATE_ART_SCALE;
    for (let y = gy + 4 - h; y <= gy + 4; y += GATE_CLEAR_STEP)
      for (let x = gx - w / 2; x <= gx + w / 2; x += GATE_CLEAR_STEP) {
        const px = Math.min(x, gx + w / 2 - 1),
          py = Math.min(y, gy + 3);
        if (onBuilding(gx, gy, px, py) && !G.World.isFree(px, py, GATE_CLEAR_R)) return false;
      }
    return true;
  }

  function reset() {
    gate = null;
    arena = null;
    asked = false;
  }

  // ---------------- the gate on the map ----------------

  function update(dt, pl) {
    if (gate) {
      gate.t += dt;
      if (!arena && !pl.dead && onBuilding(gate.x, gate.y, pl.x, pl.y)) enter();
    }
    if (arena) arenaTick(dt, pl);
  }

  /** Opens the gym gate near the player (it never times out). Returns false if no free spot was found. */
  function openGate(info) {
    const near = G.Game.player;
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * 6.2832,
        d = G.U.rand(380, 560);
      const x = near.x + Math.cos(a) * d,
        y = near.y + Math.sin(a) * d * 0.85;
      if (!spotClear(x, y)) continue;
      gate = { x, y, t: 0, gym: info };
      artFor(info.arena);
      asked = false;
      // (The big notice is drawn by hud.js while gate.t < 4.5 s.)
      G.Audio.sfx('gate');
      G.FX.ring(x, y, 6, 80, G.U.TYPE_COLOR[info.arena] || GATE_FALLBACK, 0.7, 5);
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
      tx: 5000 + Math.floor(Math.random() * 3000),
      ty: 5000 + Math.floor(Math.random() * 3000),
      r: ARENA_R,
      dex: g.dex,
      shiny: false,
      type: g.arena,
      gym: g,
    };
    if (G.Coop.isHost) G.Coop.broadcast(['arena', cfg]);
    begin(cfg);
    spawnLeader(g);
  }

  function spawnLeader(g) {
    const ts = TS(),
      x = arena.x,
      y = arena.y - ts * 3.5,
      first = G.Gym.makeDef(g);
    let e;
    if (first.gym.playerEntity) {
      // slice 7: the whole loop lineup as one team; slot 1 takes the field, the rest wait off it (not in the enemy list)
      const n = G.Gym.roster(g).length,
        members = [G.Boss.make(first, x, y)];
      for (let i = 1; i < n; i++) members.push(G.Boss.make(G.Gym.makeDef(g, i), x, y));
      arena.team = G.GymLeader.team(members);
      e = arena.team.active;
      // slice 7b (Q2): Brass Knuckles or Sharp Scissors on fewer than 3 mons do nothing; a dev warning, never a block
      const warn = G.Gyms.teamItemWarn(first.gym.leader, first.gym.runItems, n);
      if (warn) console.warn('[Gym] ' + warn);
    } else e = G.Boss.make(first, x, y); // the old body: one mon, as before (slice 12 moves it)
    e.flying = false; // collides with walls like you, so your shots can reach it
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
      x: cfg.tx * ts + ts / 2,
      y: cfg.ty * ts + ts / 2,
      back: { x: pl.x, y: pl.y },
      biome: G.World.biome,
      t: 0,
      phase: 'fight',
      endT: 0,
      bossId: 0,
      team: null, // slice 7: a switched gym's G.Team
      sendT: null, // seconds left of the send-out beat, null when none is running
    });
    gate = null;
    asked = false;
    if (authority()) G.EnemyMgr.stash();
    else G.EnemyMgr.clearRemote();
    G.Projectiles.clear();
    G.Hazards.clear();
    G.World.setArena({ tx: cfg.tx, ty: cfg.ty, r: cfg.r, type: cfg.type });
    G.World.setBiome(G.Tiles.arenaBiome(cfg.type), true);
    // Each arena brings its own weather (the volcano, sun; the glacier, snow...).
    const th = G.Tiles.ARENA_THEMES[cfg.type];
    if (th && th.weather) G.Weather.force(th.weather, WEATHER_T);
    // Everyone to the south of the arena, in a row; the leader appears to the north.
    const ps = G.Game.everyone();
    ps.forEach((p, i) => {
      p.x = arena.x + (i - (ps.length - 1) / 2) * 34;
      p.y = arena.y + ts * 3;
    });
    G.Camera.x = pl.x;
    G.Camera.y = pl.y;
    G.Game.flash('#c9a6ff', 0.9);
    G.Audio.sfx('gate');
    G.Spawner.say('Gym Leader ' + cfg.gym.leader + ' wants to battle!', 2.4, true);
  }

  /** No one leaves the arena circle (in case something pushes too hard). */
  function keepInside() {
    const ts = TS(),
      max = (arena.r - 1.4) * ts;
    for (const e of G.EnemyMgr.all()) {
      if (e.remote) continue;
      const dx = e.x - arena.x,
        dy = e.y - arena.y,
        d = Math.hypot(dx, dy);
      if (d > max) {
        e.x = arena.x + (dx / d) * max;
        e.y = arena.y + (dy / d) * max;
      }
    }
  }

  function arenaTick(dt, pl) {
    arena.t += dt;
    if (arena.phase === 'fight') {
      if (!authority()) return;
      keepInside();
      if (arena.team) return teamTick(dt);
      const boss = G.EnemyMgr.get(arena.bossId);
      if (!boss || boss.dead) {
        G.Coop.isHost && G.Coop.broadcast(['aw']);
        won();
      }
      return; // no timer; a team wipe ends the run (game.js), the enrage clock is the pressure
    }
    arena.endT -= dt;
    if (arena.endT <= 0) finish();
  }

  /** Slice 7: a switched gym's fight. The bench ticks as yours does; the faint of the mon on the field starts the send-out
   *  beat, and the lowest living slot takes the fainted spot (G.Team.sendIn: 0.5 s i-frames, the lock cleared). Wipe: the win. */
  function teamTick(dt) {
    const t = arena.team;
    t.benchTick(dt);
    if (!t.active.dead) return;
    const redo = !t.living().length && G.GymLeader.redoReady(t); // slice 7b (Q3): the wipe waits for Re-Do
    if (!t.living().length && !redo) {
      G.Coop.isHost && G.Coop.broadcast(['aw']);
      return won();
    }
    if (arena.sendT == null) arena.sendT = SEND_BEAT;
    G.Stages.teamTick(t.stages, dt); // nobody on the field runs update() in the beat, so the team raises tick here (Q5)
    if ((arena.sendT -= dt) > 0) return;
    arena.sendT = null;
    const next = redo ? G.GymLeader.redo(t) : t.sendIn(t.nextOnFaint());
    next.flying = false;
    G.EnemyMgr.add(next);
    arena.bossId = next.id;
    const line = redo ? ' used Re-Do! The whole team is back!' : ' sends out ' + next.name + '!';
    G.Spawner.say(arena.gym.leader + line, 2.4);
    G.Camera.kick(0.7);
    G.Audio.sfx('boss');
  }

  function won() {
    if (!arena || arena.phase !== 'fight') return;
    arena.phase = 'won';
    arena.endT = 5;
    G.Gym.onWin(arena.gym);
    G.Pickups.pullAll();
    // names the leader, not a mon (Jess 2026-11-07); the old Spanish key in lang-en.js is now unused
    G.Spawner.say('Gym Leader ' + arena.gym.leader + ' Defeated!', 3.4, true);
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
    G.Hazards.clear();
    for (const p of G.Game.everyone()) {
      p.x = a.back.x;
      p.y = a.back.y;
    }
    pl.x = a.back.x;
    pl.y = a.back.y;
    if (pl.dead) pl.revive(0.3);
    G.Camera.x = pl.x;
    G.Camera.y = pl.y;
    G.Game.flash('#c9a6ff', 0.8);
    if (pl.bonds > 0) G.Game.offerBond();
  }

  // ---------------- drawing ----------------

  /** The gate, to sort it by Y with the rest of the scene: the gym building for its arena type, door at the gate's feet. */
  function drawable() {
    if (!gate) return null;
    return {
      y: gate.y,
      draw(ctx) {
        const a = artFor(gate.gym.arena);
        const fadeIn = Math.min(1, gate.t * 2);
        ctx.save();
        if (a.ok) {
          const w = a.img.width * GATE_ART_SCALE,
            h = a.img.height * GATE_ART_SCALE;
          const x = Math.round(gate.x - w / 2),
            y = Math.round(gate.y - h + 4);
          ctx.imageSmoothingEnabled = false;
          ctx.globalAlpha = GATE_SHADOW_A * fadeIn;
          ctx.drawImage(a.shadow, x + GATE_SHADOW_DX, y + GATE_SHADOW_DY, w, h);
          ctx.globalAlpha = fadeIn;
          ctx.drawImage(a.img, x, y, w, h);
        }
        ctx.restore();
      },
    };
  }

  // ---------------- network (deferred scope) ----------------

  function onEvent(ev) {
    switch (ev[0]) {
      case 'arena':
        begin(ev[1]);
        break;
      case 'aw':
        won();
        break;
    }
  }

  return {
    reset,
    update,
    drawable,
    onEvent,
    openGate,
    enterRequest() {
      if (!arena) start();
    },
    get gate() {
      return gate;
    },
    get arena() {
      return arena;
    },
    get inArena() {
      return !!arena;
    },
    /** Slice 7: the leader's G.Team in a switched gym's arena (the HUD pips read it), else null. */
    get leaderTeam() {
      return arena ? arena.team || null : null;
    },
  };
})();
