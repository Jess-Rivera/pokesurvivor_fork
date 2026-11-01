/* ============ projectile.js — proyectiles y orbes ============
 * The list of enemy shots in flight. Slice 7b-2a (Jess 2026-11-01): the player's moves run in G.MoveSim, so the
 * legacy player shots, orbs, boomerangs and homing are gone from here.
 *
 * They live on the GROUND plane (like the entities' feet) and are drawn
 * raised G.LIFT units with their shadow underneath. The walls and objects
 * solid objects stop them (see combat.js).
 */
G.Projectiles = (() => {
  let list = [];
  let nextId = 1;

  function clear() {
    list = [];
  }
  function all() {
    return list;
  }

  /** An enemy shot. */
  function spawn(o) {
    const p = Object.assign(
      { id: nextId++, x: 0, y: 0, vx: 0, vy: 0, dmg: 10, r: 6, life: 1.4, t: 0, friendly: false, color: '#fff' },
      o
    );
    list.push(p);
    return p;
  }

  function update(dt, player, enemies) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.t += dt;

      if (p.t >= p.life) {
        list.splice(i, 1);
        continue;
      }

      if (p.vis && p.vis.trail && G.Camera.sees(p.x, p.y, 20)) {
        p.trailT = (p.trailT || 0) - dt;
        if (p.trailT <= 0) {
          p.trailT = 0.04;
          G.FX.trail(p.vis.trail, p.vis.pal, p.x, p.y - G.LIFT, p.vx, p.vy);
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Out of view with a generous margin -> discarded.
      if (!G.Camera.sees(p.x, p.y, 260)) {
        list.splice(i, 1);
        continue;
      }
    }
  }

  function nearest(enemies, x, y, maxDist) {
    let best = null,
      bd = maxDist * maxDist;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = G.U.dist2(x, y, e.x, e.cy());
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  function remove(p) {
    const i = list.indexOf(p);
    if (i >= 0) list.splice(i, 1);
  }

  function draw(ctx) {
    const L = G.LIFT;
    // Sombras primero, todas juntas.
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    for (const p of list) {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * 0.9, p.r * 0.38, 0, 0, 6.2832);
      ctx.fill();
    }
    // Enemy shots carry a red ring on the ground: "this hurts you".
    ctx.fillStyle = 'rgba(255,60,80,.35)';
    for (const p of list) {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r * 1.5, p.r * 0.6, 0, 0, 6.2832);
      ctx.fill();
    }
    for (const p of list) {
      const v = p.vis || G.VFX.forType('normal');
      const shape = v.proj;
      const a = Math.min(1, (p.life - p.t) * 4);
      let angle = 0;
      if (G.VFX.isDir(shape)) angle = Math.atan2(p.vy, p.vx);
      else if (G.VFX.spins(shape)) angle = p.t * 9;
      G.VFX.draw(ctx, shape, v.pal, p.x, p.y - L, {
        angle,
        alpha: a,
        scale: p.r >= 8 ? 1.5 : 1,
        frame: Math.floor(p.t * 12),
      });
    }
  }

  return {
    clear,
    all,
    spawn,
    update,
    remove,
    draw,
    nearest,
    get count() {
      return list.length;
    },
  };
})();
