/* ============ events.js — mid-game events and treasure imps ============
 *
 * Every 4-5 minutes (never with a boss alive or in the gym arena) one of these happens:
 *
 *   horde   Horde of a type: 30 s in which everything that spawns is of one
 *           same type (if your type beats them, it is your moment)
 *   gold    Golden hour: 30 s of golden enemies that give double the
 *           experience and sometimes drop coins
 *   lost    Lost Pokemon (#138, S7 of #128): a Stage 1 that can still evolve, of any region, floaters
 *           included, its nature named on the toast. You touch it, it follows you and you take it to the
 *           mark. Enemies damage it; if it falls (or you take more than 2 min), it leaves. Floaters hover
 *           (no collision) and, on a map whose liquid does not hurt, may spawn and be marked on it
 *           (decision 2026-11-21-138-floater-escort-hover-and-water-spots). Prize: heals half your
 *           health, coins, and a recruit chance by star (RECRUIT_ODDS); a recruit is held like a catch
 *           (G.Catch.hold) and becomes a copy when the run settles.
 *
 * Treasure imps (1-2 per game, see Enemy behavior 'thief'): a
 * Meowth loaded with coins (or, 1 in 4, a Gholdengo with a jackpot coin)
 * that flees and escapes at 15 s if you do not catch it.
 *
 * Co-op: the host decides and announces with 'ev' (see coop.js). Everyone sees what
 * same and the prize is for everyone.
 */
G.Events = (() => {
  const EVERY = [240, 300],
    DUR = 30,
    LOST_TIME = 120;
  // #138: the chance a delivered Lost Pokemon joins you, by its star (pokedex rarity, 1 to 3). Tuned in BALANCE.md.
  const RECRUIT_ODDS = { 1: 0.2, 2: 0.12, 3: 0.06 };
  const THIEF_FIRST = [120, 240],
    THIEF_NEXT = [240, 360],
    THIEF_LIFE = 15;
  const authority = () => !G.Coop.active || G.Coop.isHost;

  let nextT = 0,
    cur = null,
    last = null,
    thiefT = 0,
    thieves = 0;
  let lost = null; // { dex, name, nature, natureName, floats, x, y, hp, maxHp, state, follow, tx, ty, t, anim, r, ... }

  function reset() {
    nextT = G.U.rand(EVERY[0], EVERY[1]);
    cur = null;
    last = null;
    lost = null;
    thiefT = G.U.rand(THIEF_FIRST[0], THIEF_FIRST[1]);
    thieves = 0;
  }

  // ---------------- ciclo ----------------

  function update(dt, players, time) {
    if (cur) {
      cur.t += dt;
      if (cur.id !== 'lost' && cur.t >= cur.dur && authority()) end();
    }
    if (lost) lostTick(dt, players);
    if (!authority() || G.GymArena.inArena) return;

    if (thieves < 2) {
      thiefT -= dt;
      if (thiefT <= 0) {
        if (G.EnemyMgr.bossAlive()) thiefT = 8;
        else {
          spawnThief(players, time);
          thieves++;
          thiefT = G.U.rand(THIEF_NEXT[0], THIEF_NEXT[1]);
        }
      }
    }

    if (cur) return;
    nextT -= dt;
    if (nextT > 0) return;
    if (G.EnemyMgr.bossAlive()) {
      nextT = 10;
      return;
    }
    nextT = G.U.rand(EVERY[0], EVERY[1]);
    const ids = ['horde', 'gold', 'lost'].filter((id) => id !== last);
    start(G.U.pick(ids), time, players);
  }

  function start(id, time, players, dex = null) {
    last = id;
    if (id === 'horde') {
      const types = G.Enemies.hordeTypes(time);
      if (!types.length) return start('gold', time, players);
      const type = G.U.pick(types);
      const defs = G.Enemies.hordeDefs(type, time);
      G.Sprites.preload(defs.map((d) => d.dex));
      cur = { id, t: 0, dur: DUR, type, defs };
      G.Spawner.burst(Math.round(6 * G.Coop.scaleRate(players.length)));
    } else if (id === 'gold') {
      cur = { id, t: 0, dur: DUR };
      for (const e of G.EnemyMgr.all()) if (!e.remote) e.makeGolden();
    } else {
      if (!spawnLost(players, dex)) return;
      cur = { id, t: 0, dur: Infinity };
    }
    announce();
    if (G.Coop.isHost) G.Coop.broadcast(['ev', 's', id, cur.type || '']);
  }

  function announce() {
    if (!cur) return;
    if (cur.id === 'horde') say('¡Horda de tipo ' + G.U.TYPE_NAME[cur.type] + '!', 3, G.U.TYPE_COLOR[cur.type]);
    else if (cur.id === 'gold') say('¡Hora dorada! Doble de experiencia', 3, '#ffd23f');
    else if (lost)
      say(
        'A ' + lost.natureName + ' ' + lost.name + ' is lost! Find it and take it to the green marker',
        3.4,
        '#7dffb0'
      );
    G.Audio.sfx(cur.id === 'gold' ? 'shiny' : 'surge');
  }

  function say(text, secs) {
    G.Spawner.say(text, secs, true);
  }

  function end() {
    if (!cur) return;
    cur = null;
    if (G.Coop.isHost) G.Coop.broadcast(['ev', 'e']);
  }

  /** What spawns during a horde (used by G.Enemies.bagAt). */
  function bag() {
    return cur && cur.id === 'horde' && cur.defs.length ? cur.defs : null;
  }

  // ---------------- duende del tesoro ----------------

  function spawnThief(players, time) {
    const gold = Math.random() < 0.25;
    const dex = gold ? 1000 : 52;
    const mon = G.DEX_BY[dex];
    if (!mon || !G.SPRITE_META[dex]) return;
    const pl = G.U.pick(players.filter((p) => !p.dead).length ? players.filter((p) => !p.dead) : players);
    G.Sprites.preload([dex]);
    const def = {
      dex,
      name: mon.name,
      behavior: 'thief',
      hp: Math.round(60 * (1 + time / 95) * (gold ? 1.5 : 1)),
      spd: 92,
      dmg: 0,
      xp: 10,
      loot: gold ? 'jackpot' : 'coins',
    };
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * 6.2832,
        d = G.U.rand(230, 300);
      const x = pl.x + Math.cos(a) * d,
        y = pl.y + Math.sin(a) * d * 0.8;
      if (!G.World.isFree(x, y, 14)) continue;
      const e = new G.Enemy(def, x, y, { hp: 1, spd: 1, dmg: 1 });
      e.life = THIEF_LIFE;
      G.EnemyMgr.add(e);
      G.FX.ring(x, y, 4, 40, '#ffd23f', 0.5, 3);
      G.Spawner.say(
        gold
          ? 'A ' + mon.name + ' with a Master Ball! Catch it before it runs away!'
          : '¡Un ' + mon.name + ' cargado de monedas! ¡Atrápalo antes de que huya!',
        3.2
      );
      G.Audio.sfx('shiny');
      return;
    }
  }

  // ---------------- Lost Pokemon ----------------

  /** Who can be lost (#138): Stage 1s that can still evolve, rarity 1 to 3, non-legendary, with sprites, from any
   *  region (not the run's, on purpose); floating species included. */
  function pool() {
    return G.DEX.filter(
      (p) =>
        p.rarity >= 1 &&
        p.rarity <= 3 &&
        !p.leg &&
        G.SPRITE_META[p.dex] &&
        G.StageOne.has(p.dex) &&
        G.Evolvable.has(p.dex)
    );
  }

  /** Starts one Lost Pokemon: a pool pick (or dex, from G.Debug.lost), its nature, a spawn spot and a mark. */
  function spawnLost(players, dex = null) {
    const alive = players.filter((p) => !p.dead);
    const pl = G.U.pick(alive.length ? alive : players);
    const mon = dex ? G.DEX_BY[dex] : G.U.pick(pool());
    if (!mon) return false;
    // #138 H2 and D1: a floater's spawn and mark may sit on liquid, when the map's liquid does not hurt
    const mayUseLiquid = G.Sprites.hovers(mon.dex) && G.World.liquidIsSafe();
    let at = null,
      to = null;
    for (let i = 0; i < 20 && !at; i++) {
      const a = Math.random() * 6.2832,
        d = G.U.rand(220, 300);
      const x = pl.x + Math.cos(a) * d,
        y = pl.y + Math.sin(a) * d * 0.8;
      if (G.World.isFree(x, y, 16, mayUseLiquid)) at = [x, y];
    }
    for (let i = 0; i < 30 && at && !to; i++) {
      const a = Math.random() * 6.2832,
        d = G.U.rand(700, 850);
      const x = at[0] + Math.cos(a) * d,
        y = at[1] + Math.sin(a) * d * 0.85;
      if (G.World.isFree(x, y, 30, mayUseLiquid)) to = [x, y];
    }
    if (!at || !to) return false;
    const nature = G.Rescue.rollNature();
    makeLost({
      dex: mon.dex,
      x: at[0],
      y: at[1],
      tx: to[0],
      ty: to[1],
      state: 'wait',
      hp: 100,
      nature,
      natureName: G.Rescue.natureName(nature),
    });
    G.Sprites.preload([mon.dex]);
    return true;
  }

  function makeLost(o) {
    const mon = G.DEX_BY[o.dex];
    lost = Object.assign(
      {
        name: mon ? mon.name : '',
        maxHp: 100,
        t: 0,
        hitCd: 0,
        netT: 0,
        follow: null,
        floats: G.Sprites.hovers(o.dex), // #138 H1: a floater escorts with hover movement
        anim: new G.Sprites.Animator(o.dex, 1),
        r: G.Sprites.bodyRadius(o.dex),
      },
      o
    );
  }

  function lostTick(dt, players) {
    const L = lost;
    L.t += dt;
    L.anim.update(dt);
    if (!authority()) {
      L.anim.loop(L.moving ? 'Walk' : 'Idle');
      return;
    }

    if (L.state === 'wait') {
      const p = players.find((o) => !o.dead && G.U.dist2(o.x, o.y, L.x, L.y) < (o.r + L.r + 18) ** 2);
      if (p) {
        L.state = 'follow';
        L.follow = p;
        say(L.name + ' is following you! Take it to the green marker', 3, '#7dffb0');
        G.Audio.sfx('confirm');
      }
      L.moving = false;
    } else {
      const p = L.follow && !L.follow.dead ? L.follow : players.find((o) => !o.dead) || L.follow;
      const d = G.U.dist(L.x, L.y, p.x, p.y),
        keep = p.r + L.r + 14;
      L.moving = d > keep;
      if (L.moving) {
        const sp = Math.min(d - keep, Math.max(120, p.spd * 1.15) * dt);
        const [nx, ny] = G.U.norm(p.x - L.x, p.y - L.y);
        L.x += nx * sp;
        L.y += ny * sp;
        if (!L.floats) G.World.collide(L); // #138 H1 and D2: floaters skip collision, as hover enemies do
        L.anim.dir = G.Sprites.dirFromAngle(Math.atan2(ny, nx));
      }
      if (G.U.dist2(L.x, L.y, L.tx, L.ty) < 56 * 56) return rescued();
    }
    L.anim.loop(L.moving ? 'Walk' : 'Idle');

    // Enemies that touch it deal damage to it.
    if ((L.hitCd -= dt) <= 0) {
      const hits = G.EnemyMgr.queryCircle(L.x, L.y, L.r).filter((e) => !e.dead && e.behavior !== 'thief');
      if (hits.length) {
        L.hitCd = 0.5;
        L.hp -= Math.min(
          30,
          hits.reduce((a, e) => a + 4 + e.dmg * 0.12, 0)
        );
        L.flash = 0.1;
        G.FX.burst(L.x, L.y - 10, '#ff5f6d', 4, 60);
        if (L.hp <= 0) return gone(L.name + ' got scared and ran away!');
      }
    }
    if (L.flash > 0) L.flash -= dt;
    if (L.t > LOST_TIME) return gone(L.name + ' got tired of waiting and left.');

    if (G.Coop.isHost && (L.netT -= dt) <= 0) {
      L.netT = 0.1;
      G.Coop.broadcast([
        'ev',
        'lp',
        L.dex,
        Math.round(L.x),
        Math.round(L.y),
        Math.round(L.hp),
        L.state === 'follow' ? 1 : 0,
        Math.round(L.tx),
        Math.round(L.ty),
        L.anim.dir,
        L.moving ? 1 : 0,
      ]);
    }
  }

  /** #138: does a delivered Lost Pokemon join you? One roll at its star's odds. */
  const rollsRecruit = (dex) => Math.random() < (RECRUIT_ODDS[(G.DEX_BY[dex] || {}).rarity] || 0);

  function rescued() {
    const L = lost;
    G.Drops.roll('rescue', L.tx, L.ty);
    const recruited = rollsRecruit(L.dex);
    if (recruited) G.Catch.hold(L); // held like a catch, with the toast's nature; it settles when the run ends
    if (G.Coop.isHost) G.Coop.broadcast(['ev', 'rw', L.dex, recruited ? 1 : 0]);
    reward(L.dex, recruited);
    lost = null;
    end();
  }

  /** On each computer: it heals, and the thanks line says whether it joins you when the run ends. */
  function reward(dex, recruited) {
    const pl = G.Game.player;
    if (pl && !pl.dead) {
      pl.heal(pl.maxHp * 0.5);
      G.FX.ring(pl.x, pl.y, 6, 70, '#5fe08a', 0.5, 3);
    }
    const name = (G.DEX_BY[dex] || {}).name || '';
    G.FX.burst(lost ? lost.tx : pl.x, lost ? lost.ty - 10 : pl.y, '#7dffb0', 24, 180);
    G.Audio.sfx('legend');
    if (recruited) {
      say('You brought ' + name + ' home! It will join you when the run ends.', 3.2, '#7dffb0');
      G.Audio.sfx('shinyGet');
    } else say('You brought ' + name + ' home! It thanks you.', 3.2, '#7dffb0');
  }

  function gone(msg) {
    if (G.Coop.isHost) G.Coop.broadcast(['ev', 'lx', msg]);
    say(msg, 3);
    lost = null;
    end();
  }

  // ---------------- red ----------------

  function onNet(ev) {
    switch (ev[1]) {
      case 's':
        cur = { id: ev[2], t: 0, dur: ev[2] === 'lost' ? Infinity : DUR, type: ev[3] || null };
        break;
      case 'e':
        cur = null;
        break;
      case 'lp': {
        const [, , dex, x, y, hp, follow, tx, ty, dir, moving] = ev;
        if (!lost || lost.dex !== dex) makeLost({ dex, x, y, tx, ty, hp, state: follow ? 'follow' : 'wait' });
        Object.assign(lost, { x, y, hp, tx, ty, moving: !!moving, state: follow ? 'follow' : 'wait' });
        lost.anim.dir = dir;
        break;
      }
      case 'rw':
        reward(ev[2], !!ev[3]);
        lost = null;
        break;
      case 'lx':
        say(ev[2], 3);
        lost = null;
        break;
    }
  }

  // ---------------- dibujo ----------------

  /** The lost Pokemon and the mark, to sort them by Y with the rest. */
  function drawables() {
    if (!lost) return [];
    const L = lost;
    const now = performance.now() / 1000;
    const goal = {
      y: L.ty - 4000, // en el suelo, debajo de todo
      draw(ctx) {
        const k = 0.5 + Math.sin(now * 4) * 0.5;
        ctx.save();
        ctx.globalAlpha = 0.25 + k * 0.15;
        ctx.fillStyle = '#5fe08a';
        ctx.beginPath();
        ctx.ellipse(L.tx, L.ty, 56, 40, 0, 0, 6.2832);
        ctx.fill();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#7dffb0';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.ellipse(L.tx, L.ty, 56, 40, 0, 0, 6.2832);
        ctx.stroke();
        ctx.restore();
        G.Icons.draw(ctx, 'heart', Math.round(L.tx - 8), Math.round(L.ty - 30 - k * 6), 16);
      },
    };
    const mon = {
      y: L.y,
      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#7dffb0';
        ctx.beginPath();
        ctx.ellipse(L.x, L.y, L.r * 1.5, L.r * 0.6, 0, 0, 6.2832);
        ctx.fill();
        ctx.restore();
        G.Sprites.drawShadow(ctx, L.dex, L.x, L.y, 1);
        L.anim.draw(ctx, L.x, L.y, { flash: L.flash > 0 });
        const h = G.Sprites.bodyHeight(L.dex, 1);
        if (L.state === 'wait') {
          // "!" bouncing above: it is waiting for you to touch it.
          const by = L.y - h - 14 - Math.abs(Math.sin(now * 5)) * 6;
          ctx.save();
          ctx.font = '700 16px GameFont, monospace';
          ctx.textAlign = 'center';
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#000';
          ctx.strokeText('!', L.x, by);
          ctx.fillStyle = '#7dffb0';
          ctx.fillText('!', L.x, by);
          ctx.restore();
        }
        const w = 30,
          y = L.y - h - 6;
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(L.x - w / 2, y, w, 3.4);
        ctx.fillStyle = '#5fe08a';
        ctx.fillRect(L.x - w / 2, y, w * Math.max(0, L.hp / L.maxHp), 3.4);
      },
    };
    return [goal, mon];
  }

  /** Edge arrow toward the lost Pokemon (or toward the mark, if it already follows you). */
  function drawHud(ctx, w, h, pl, F) {
    const cam = G.Camera;
    if (lost) {
      const L = lost,
        to = L.state === 'wait' ? [L.x, L.y - 10] : [L.tx, L.ty];
      edgeArrow(
        ctx,
        w,
        h,
        cam,
        to[0],
        to[1],
        '#7dffb0',
        (L.state === 'wait' ? L.name : 'Marca') + ' · ' + Math.round(G.U.dist(pl.x, pl.y, to[0], to[1]) / 32) + ' m',
        F
      );
    }
    for (const e of G.EnemyMgr.all()) {
      if (e.behavior === 'thief' && !e.dead) edgeArrow(ctx, w, h, cam, e.x, e.y - 10, '#ffd23f', e.name, F);
    }
    if (cur && cur.id !== 'lost') {
      const left = Math.max(0, Math.ceil(cur.dur - cur.t));
      const txt =
        (cur.id === 'gold' ? 'HORA DORADA' : 'HORDA ' + G.U.TYPE_NAME[cur.type].toUpperCase()) + ' · ' + left + ' s';
      ctx.save();
      ctx.font = F(800, 12);
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,.8)';
      ctx.strokeText(txt, w / 2, 112);
      ctx.fillStyle = cur.id === 'gold' ? '#ffd23f' : G.U.TYPE_COLOR_LIGHT[cur.type] || '#fff'; // map text: Light tone
      ctx.fillText(txt, w / 2, 112);
      ctx.restore();
    }
  }

  function edgeArrow(ctx, w, h, cam, x, y, col, label, F) {
    const sx = (x - cam.left()) * cam.scale,
      sy = (y - cam.top()) * cam.scale;
    if (sx > 0 && sx < w && sy > 0 && sy < h) return;
    const M = 44,
      ex = G.U.clamp(sx, M, w - M),
      ey = G.U.clamp(sy, M + 70, h - M - 80);
    const a = Math.atan2(sy - ey, sx - ex),
      ca = Math.cos(a),
      sa = Math.sin(a);
    const pulse = 0.65 + Math.sin(performance.now() / 160) * 0.35;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.moveTo(ca * 30, sa * 30);
    ctx.lineTo(Math.cos(a + 2.45) * 15, Math.sin(a + 2.45) * 15);
    ctx.lineTo(Math.cos(a - 2.45) * 15, Math.sin(a - 2.45) * 15);
    ctx.closePath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = F(800, 11);
    ctx.textAlign = ca > 0.3 ? 'right' : ca < -0.3 ? 'left' : 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.strokeText(label, -ca * 26, -sa * 24 + 4);
    ctx.fillStyle = col;
    ctx.fillText(label, -ca * 26, -sa * 24 + 4);
    ctx.restore();
  }

  return {
    reset,
    update,
    bag,
    pool,
    onNet,
    drawables,
    drawHud,
    get golden() {
      return !!cur && cur.id === 'gold';
    },
    get current() {
      return cur ? cur.id : null;
    },
    /** Para pruebas. */
    debugStart(id) {
      start(id, G.Game.st.time, G.Game.everyone());
    },
    /** Dev (G.Debug.lost): start a Lost Pokemon now, of that species when given. False when none started. */
    debugLost(dex) {
      if (cur || lost) return false;
      start('lost', G.Game.st.time, G.Game.everyone(), dex);
      return !!lost;
    },
    debugThief() {
      spawnThief(G.Game.everyone(), G.Game.st.time);
    },
    _dbg() {
      return lost && { x: lost.x, y: lost.y, tx: lost.tx, ty: lost.ty, state: lost.state, hp: lost.hp };
    },
  };
})();
