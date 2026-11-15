/* ============ rescue.js: the rescue event (G.Rescue) ============
 * Acquisition rework, slice S4 (#135). Spec: docs/ASCII Concept Maps/Old txt files/Acquisition v2 - Spec.txt section 2; plan:
 * docs/ASCII Concept Maps/135 - Rescue Event Slice Opening.md.
 *
 * Every run minute the game rolls: 4% the first time, +4% after each miss, back to 4% after a rescue fires (so it is certain by
 * roll 25). The roll counts run time (the dt it is given), so a pause, the pause menu and later the catch phase stop it; it keeps
 * going in gyms, during elites and during other events. A fired roll picks a Stage 1 of the run region's own gen (weighted by
 * star), rolls its nature, shows "A Timid Dratini needs help!" with an arrow, and builds an UberElite (js/entities/uber-elite.js)
 * on free ground beyond the view with the rescued Stage 1 standing beside it.
 *   waiting  REACH_TIME s to reach it (the first hit on the UberElite ends the wait); untouched = gone, both leave
 *   fight    the first hit starts FIGHT_TIME s (X, set in playtest); beaten in time = won with the time left locked in
 *            (a fraction 0 to 1), too slow = the Stage 1 runs off and the UberElite leaves
 *   catch    (#136) won with balls on the belt: the Stage 1 waits CATCH_WAIT s where it stood; touching it opens the catch screen
 *            (G.Game.openCatch, js/systems/catch.js), refused over another screen and retried next frame, as a shop. Not
 *            reached in time, it wanders off. Won with an empty belt: it runs off at once, the UberElite's drops only.
 * A roll that fires while you are in a gym arena, while a rescue is already up, or in co-op (deferred) is lost: it still resets the
 * chance. Entering a gym arena with a rescue up loses it. The result is kept in G.Rescue.lastResult; the catch reads it.
 */
G.Rescue = (() => {
  const K = {
    rollEvery: 60, // s of run time between rolls
    baseChance: 0.04,
    chanceStep: 0.04, // added after each failed roll
    reachTime: 60, // s the rescue waits to be reached
    fightTime: 60, // X: s to beat the UberElite after the first hit (set in playtest)
    fightTtk: 40, // s of focused fire the UberElite's HP is sized for (an elite is 25), tuned in playtest
    starWeight: { 1: 8, 2: 4, 3: 2, 4: 1 }, // pick weight of a species by its star
    near: 140,
    far: 320, // world px beyond the view radius where the guard stands
    spotTries: 24,
    spotClear: 40, // free ground radius around the guard
    monOffsetX: 56, // where the rescued Stage 1 stands, beside the guard
    catchWait: 30, // #136: s the won Stage 1 waits to be touched (run clock)
    touch: 30, // #136: world px past the Stage 1's body radius that count as touching it
    spotGiveUp: 5, // s of retrying when no free ground is found, then it is lost
  };

  let rollClock = 0,
    failedRolls = 0;
  let active = null; // { dex, name, nature, natureName, star, x, y, uber, phase, reachLeft, fightLeft, catchLeft, anim, r, spotWait }
  let lastResult = null; // { outcome: 'won'|'slow'|'gone'|'lost', dex, name, nature, natureName, timeFraction }

  const titled = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function reset() {
    rollClock = 0;
    failedRolls = 0;
    active = null;
    lastResult = null;
  }

  // ---------------- the roll ----------------

  /** The chance of the next roll. */
  const chance = () => Math.min(1, K.baseChance + K.chanceStep * failedRolls);

  /** Advance the roll clock by dt run seconds; true when a roll fired a rescue (at most one per call). */
  function tickRoll(dt, rnd = Math.random) {
    rollClock += dt;
    while (rollClock >= K.rollEvery) {
      rollClock -= K.rollEvery;
      if (rnd() < chance()) {
        failedRolls = 0;
        return true;
      }
      failedRolls++;
    }
    return false;
  }

  // ---------------- which Stage 1 ----------------

  /** The rescue pool of a region (a gen 1 to 9, or null for All regions = every gen): Stage 1s of that gen, wild rarity 1 to 4,
   *  without the leg flag, with sprites. */
  function pool(region) {
    return G.DEX.filter(
      (p) =>
        (region == null || p.gen === region) &&
        p.rarity >= 1 &&
        p.rarity <= 4 &&
        !p.leg &&
        G.SPRITE_META[p.dex] &&
        G.StageOne.has(p.dex)
    );
  }

  /** One species of the pool, each weighted by its star (K.starWeight). */
  function pickSpecies(region, rnd = Math.random) {
    const list = pool(region);
    if (!list.length) return null;
    let r = rnd() * list.reduce((sum, p) => sum + K.starWeight[p.rarity], 0);
    for (const p of list) {
      r -= K.starWeight[p.rarity];
      if (r < 0) return p;
    }
    return list[list.length - 1];
  }

  /** A nature as the copies store it: the pokeapi id, 1 to 25 (G.Copies keeps it on the caught copy). */
  const rollNature = (rnd = Math.random) => 1 + Math.floor(rnd() * G.SpeciesTraits.NATURES.length);
  const natureName = (n) => titled(G.SpeciesTraits.NATURES[n - 1][0]);

  // ---------------- the event ----------------

  /** A free spot beyond the view, around the player, or null. */
  function findSpot(pl) {
    const outer = G.Camera.outerRadius();
    for (let i = 0; i < K.spotTries; i++) {
      const a = Math.random() * 6.2832,
        d = outer + K.near + Math.random() * (K.far - K.near);
      const x = pl.x + Math.cos(a) * d,
        y = pl.y + Math.sin(a) * d;
      if (G.World.isFree(x, y, K.spotClear)) return [x, y];
    }
    return null;
  }

  function record(outcome, e) {
    lastResult = {
      outcome,
      dex: e.dex,
      name: e.name,
      nature: e.nature,
      natureName: e.natureName,
      timeFraction: outcome === 'won' ? Math.max(0, Math.min(1, e.fightLeft / K.fightTime)) : null,
    };
  }

  function say(text, secs = 3.2) {
    G.Spawner.say(text, secs, true);
  }

  /** Remove the guard and the rescued Stage 1 from the map. */
  function clear(e) {
    if (e.uber && !e.uber.dead) e.uber.leaving = true;
    if (active === e) active = null;
  }

  function end(outcome, text) {
    const e = active;
    if (!e) return;
    record(outcome, e);
    clear(e);
    if (text) say(text);
  }

  /** A roll fired: pick, roll the nature, announce, and build the guard. The spot is found now or retried a few seconds. */
  function fire(pl, t) {
    if (active || G.GymArena.inArena || G.Coop.active || !pl || pl.dead) return false;
    const mon = pickSpecies(G.Enemies.region);
    if (!mon) return false;
    const n = rollNature();
    const spot = findSpot(pl);
    const e = (active = {
      dex: mon.dex,
      name: mon.name,
      star: mon.rarity,
      nature: n,
      natureName: natureName(n),
      x: spot ? spot[0] : 0,
      y: spot ? spot[1] : 0,
      uber: null,
      phase: 'waiting',
      reachLeft: K.reachTime,
      fightLeft: null,
      spotWait: spot ? null : K.spotGiveUp,
      t,
      anim: new G.Sprites.Animator(mon.dex, 1),
      r: G.Sprites.bodyRadius(mon.dex),
    });
    G.Sprites.preload([mon.dex]);
    if (spot) build(e, t);
    if (active !== e) return false; // no guard species was left: lost
    announce(e);
    return true;
  }

  function announce(e) {
    say('A ' + e.natureName + ' ' + e.name + ' needs help!', 3.6);
    G.Audio.sfx('shiny');
  }

  /** The UberElite: an elite species of this time, with an HP budget of fightTtk s of focused fire. */
  function build(e, t) {
    const def = G.Enemies.eliteDef(t, new Set([e.dex]));
    if (!def) {
      end('lost', null);
      return;
    }
    const h = G.Elites.hpFor(def, t, K.fightTtk);
    const d = Object.assign({}, def, {
      elite: {
        hp: h.hp,
        hpMul: h.mul,
        pow: G.Elites.K.powMul,
        xpMul: h.mul * G.Elites.K.xpMul,
        engagedAt: null,
        enrage: 1,
        spawnedAt: t,
      },
    });
    G.Sprites.preload([def.dex]);
    e.uber = new G.UberElite(d, e.x, e.y, G.Enemies.scale(t));
    G.EnemyMgr.add(e.uber);
  }

  /** The player's first hit on the UberElite: the wait ends and the fight clock starts. */
  function onUberHit(uber) {
    const e = active;
    if (!e || e.uber !== uber || e.phase !== 'waiting') return;
    e.phase = 'fight';
    e.fightLeft = K.fightTime;
  }

  /** The UberElite fell: won. With balls on the belt the Stage 1 waits to be caught (#136); with none it runs off. */
  function onUberDown(uber) {
    const e = active;
    if (!e || e.uber !== uber || e.phase === 'catch') return;
    if (e.phase === 'waiting') e.fightLeft = K.fightTime; // felled by its first hit: the whole clock is left
    record('won', e);
    G.Audio.sfx('legend');
    if (G.Catch.total() <= 0) {
      clear(e);
      say('No Poke Balls left! ' + e.name + ' ran off.');
      return;
    }
    e.phase = 'catch';
    e.catchLeft = K.catchWait;
    say('The ' + e.natureName + ' ' + e.name + ' is safe! Touch it to catch it.', 3.6);
  }

  /** Where the rescued Stage 1 stands. */
  const monSpot = (e) => [e.x + K.monOffsetX, e.y];

  /** True when the player touches the waiting Stage 1. */
  function touching(e, pl) {
    const [x, y] = monSpot(e);
    return !!pl && !pl.dead && Math.hypot(pl.x - x, pl.y - y) <= e.r + K.touch;
  }

  /** Seconds left on the fight clock, or null when it is not running. */
  const fightLeft = () => (active && active.phase === 'fight' ? Math.max(0, active.fightLeft) : null);

  function update(dt, pl, t) {
    if (G.Coop.active) return;
    if (active) {
      const e = active;
      if (G.GymArena.inArena) end('lost', null);
      else if (e.spotWait != null) {
        // No free ground was found at the start: retry each frame, then give up.
        const spot = findSpot(pl);
        if (spot) {
          e.x = spot[0];
          e.y = spot[1];
          e.spotWait = null;
          build(e, t);
        } else if ((e.spotWait -= dt) <= 0) end('lost', null);
      } else {
        if (e.phase === 'waiting') {
          e.reachLeft -= dt;
          if (e.reachLeft <= 0) end('gone', e.name + ' is gone.');
        } else if (e.phase === 'fight') {
          e.fightLeft -= dt;
          if (e.fightLeft <= 0) end('slow', 'Too slow! ' + e.name + ' ran off.');
        } else if (e.phase === 'catch') {
          e.catchLeft -= dt;
          if (e.catchLeft <= 0) {
            clear(e);
            say(e.name + ' wandered off.');
          } else if (touching(e, pl) && G.Game.openCatch(lastResult)) clear(e); // refused: tried again next frame
        }
      }
      if (active) active.anim.update(dt);
    }
    if (tickRoll(dt)) fire(pl, t);
  }

  // ---------------- drawing and the arrow ----------------

  /** The rescued Stage 1, standing beside the guard. */
  function drawables() {
    const e = active;
    if (!e || e.spotWait != null) return [];
    const [x, y] = monSpot(e);
    return [
      {
        y,
        draw(ctx) {
          const now = performance.now() / 1000;
          ctx.save();
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#7dffb0';
          ctx.beginPath();
          ctx.ellipse(x, y, e.r * 1.5, e.r * 0.6, 0, 0, 6.2832);
          ctx.fill();
          ctx.restore();
          G.Sprites.drawShadow(ctx, e.dex, x, y, 1);
          e.anim.loop('Idle');
          e.anim.draw(ctx, x, y, {});
          const by = y - G.Sprites.bodyHeight(e.dex, 1) - 14 - Math.abs(Math.sin(now * 5)) * 6;
          ctx.save();
          ctx.font = '700 16px GameFont, monospace';
          ctx.textAlign = 'center';
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#000';
          ctx.strokeText('!', x, by);
          ctx.fillStyle = '#7dffb0';
          ctx.fillText('!', x, by);
          ctx.restore();
        },
      },
    ];
  }

  /** For the HUD arrow: where it is and the seconds on the clock (the wait before the first hit, the fight after it, then the
   *  catch wait, pointing at the Stage 1), or null. */
  function hudTarget() {
    const e = active;
    if (!e || e.spotWait != null) return null;
    if (e.phase === 'catch') {
      const [x, y] = monSpot(e);
      return { x, y, left: Math.max(0, e.catchLeft), phase: e.phase };
    }
    return {
      x: e.x,
      y: e.y,
      left: e.phase === 'fight' ? Math.max(0, e.fightLeft) : Math.max(0, e.reachLeft),
      phase: e.phase,
    };
  }

  return {
    K,
    reset,
    update,
    tickRoll,
    chance,
    pool,
    pickSpecies,
    rollNature,
    onUberHit,
    onUberDown,
    fightLeft,
    drawables,
    hudTarget,
    get lastResult() {
      return lastResult;
    },
    get active() {
      return active;
    },
    /** Dev (G.Debug.rescue): fire one now, whatever the roll says. False when one cannot start (a rescue is up, a gym arena). */
    debugFire() {
      return fire(G.Game.player, G.Game.st.time);
    },
  };
})();
