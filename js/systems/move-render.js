/* ============ move-render.js: what the new move system looks like (G.MoveRender, slice 3d) ============
 *
 * Drawing and presentation glue only. It reads G.MoveSim.list() and never writes an instance (invariant I8: the sim never
 * calls FX or audio, this file listens to its SimBus events instead). Shapes come from the sim's own instance.shape, which
 * G.MoveGeom.shapeOf built, so what you see is the hit area. Slice 3d draws outline-quality shapes in the move's type color;
 * the recipes are chosen by motion and shape family, never by a legacy label (I1).
 *
 *   drawGround(ctx)  static shapes as a ground patch (the drawGroundFields patch recipe: soft fill, inner ring, fades out).
 *   drawAir(ctx)     outlines of every live shape, travelling shapes as a glowing ball, then the dev hitbox overlay.
 *   overlay          dev toggle (G.Debug.hitbox): G.MoveGeom.shapeOf for every live instance, recomputed from the same
 *                    inputs the sim used (one geometry implementation, I6), and a ring flash on each 'move:hit' enemy.
 *                    Slice 4a: a dev line over every visible enemy that carries a status or a stat stage (G.Status.list, G.Stages.list).
 *   Subscribed once at load: 'move:cast' plays the routed slot's cast (G.Player.cast: animation, sound, Life Orb cost),
 *   stamps castAt for the HUD flash and simCd for the HUD ring; 'move:hit' feeds the overlay flashes.
 */
G.MoveRender = (() => {
  const TAU = Math.PI * 2, FLASH = 0.25;
  let flashes = [];
  const R = { overlay: false };

  const colOf = inst => (G.U.TYPE_COLOR && G.U.TYPE_COLOR[inst.spec.type]) || '#ffffff';
  const lifeOf = inst => { const c = (inst.spec.delivery.endOn || []).find(c => c.time != null); return c ? c.time : null; };
  /** 0..1 fade: quick in, and out over the last 0.15 s of a timed shape. */
  function fadeOf(inst) {
    const T = lifeOf(inst);
    return Math.max(0, Math.min(1, inst.age * 12, T == null ? 1 : (T - inst.age) / 0.15 + 0.2));
  }

  /** Traces a shape's outline as a path (ground plane, world pixels). */
  function trace(ctx, s) {
    ctx.beginPath();
    if (s.family === 'linear') {
      const c = Math.cos(s.heading), n = Math.sin(s.heading), hx = -n * s.w / 2, hy = c * s.w / 2;
      ctx.moveTo(s.x + hx, s.y + hy);
      ctx.lineTo(s.x + c * s.len + hx, s.y + n * s.len + hy);
      ctx.lineTo(s.x + c * s.len - hx, s.y + n * s.len - hy);
      ctx.lineTo(s.x - hx, s.y - hy);
      ctx.closePath();
    } else if (s.family === 'arc') {
      ctx.moveTo(s.x, s.y);
      ctx.arc(s.x, s.y, s.r, s.heading - s.arc / 2, s.heading + s.arc / 2);
      ctx.closePath();
    } else ctx.arc(s.x, s.y, Math.max(0.5, s.r), 0, TAU);
  }

  function drawGround(ctx) {
    for (const inst of G.MoveSim.list()) {
      const s = inst.shape;
      if (!s || inst.spec.delivery.motion !== 'static' || !G.Camera.sees(s.x, s.y, (s.len || s.r) + 60)) continue;
      const a = fadeOf(inst), col = colOf(inst);
      ctx.save();
      ctx.fillStyle = col; ctx.globalAlpha = 0.24 * a;
      trace(ctx, s); ctx.fill();
      if (s.family !== 'linear') {     // the patch recipe's inner ring
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.45 * a;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.8, s.family === 'arc' ? s.heading - s.arc / 2 : 0, s.family === 'arc' ? s.heading + s.arc / 2 : TAU); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawAir(ctx) {
    const now = performance.now() / 1000;
    for (const inst of G.MoveSim.list()) {
      const s = inst.shape;
      if (!s || !G.Camera.sees(s.x, s.y, (s.len || s.r) + 60)) continue;
      const col = colOf(inst), a = fadeOf(inst);
      ctx.save();
      if (inst.spec.delivery.motion !== 'static' && s.family === 'point') {     // a travelling ball: glow, body, white core
        const pulse = 1 + Math.sin(now * 20 + inst.id) * 0.08;
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.3 * a; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 1.7 * pulse, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.95 * a; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.8 * a; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.45, 0, TAU); ctx.fill();
      } else {
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.85 * a;
        trace(ctx, s); ctx.stroke();
      }
      ctx.restore();
    }
    if (R.overlay) drawOverlay(ctx);
  }

  function drawOverlay(ctx) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ff3df2';
    for (const inst of G.MoveSim.list()) {
      const s = G.MoveGeom.shapeOf(inst.spec.space, inst.spec.delivery.grow || null,
        { x: inst.x, y: inst.y, heading: inst.heading, age: inst.age, dist: inst.dist, lens: inst.cast.owner.moveRadiusMul || 1 });
      trace(ctx, s); ctx.stroke();
      if (s.family === 'point') {     // the swept segment the point test uses (D17)
        ctx.beginPath(); ctx.moveTo(inst.prevX, inst.prevY); ctx.lineTo(s.x, s.y); ctx.stroke();
      }
    }
    const t = performance.now() / 1000;
    flashes = flashes.filter(f => t - f.t < FLASH);
    for (const f of flashes) {
      ctx.globalAlpha = 1 - (t - f.t) / FLASH;
      ctx.strokeStyle = f.crit ? '#ffe14d' : '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff';
    for (const e of G.EnemyMgr.all()) {     // riders (slice 4a): statuses with seconds left, then stat stages
      if (e.dead || !G.Camera.sees(e.x, e.y, 40)) continue;
      const parts = G.Status.list(e).map(s => s.k + (s.t != null ? ' ' + s.t.toFixed(1) : ''))
        .concat(G.Stages.list(e).map(s => s.stat + (s.stage > 0 ? '+' : '') + s.stage));
      if (parts.length) ctx.fillText(parts.join(' | '), e.x, e.y - (e.bodyH || 30) - 16);
    }
    ctx.restore();
  }

  // ---- presentation glue, registered once ----
  G.SimBus.on('move:cast', ev => {
    const pl = G.Game && G.Game.player;
    if (!pl || !G.MoveRoute.routed(ev.moveId)) return;
    const slot = pl.activeGroup().find(s => s.id === ev.moveId);
    if (!slot) return;
    slot.simCd = G.MoveDefs[ev.moveId].cd;     // the HUD ring divides by the resolver's cd for this slot
    slot.castAt = performance.now();
    pl.cast(slot);
  });
  G.SimBus.on('move:hit', ev => {
    if (!R.overlay) return;
    const e = G.EnemyMgr.all().find(x => x.id === ev.enemyId);
    flashes.push({ x: ev.x, y: ev.y, r: e ? e.r : 12, crit: ev.crit, t: performance.now() / 1000 });
  });

  R.drawGround = drawGround;
  R.drawAir = drawAir;
  return R;
})();
