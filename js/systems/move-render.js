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
 *                    Slice 4b: a dev line over the player (HP, shield value and time left, team stages, commitment timers).
 *   Slice 4b, always drawn: a short zigzag bolt from the previous enemy to each chain hop ('move:hit' with hop > 0), and a ring
 *   around the active Pokemon while its shield (Substitute) lives, brighter when fuller.
 *   Slice 4c-1: orbiting shapes are drawn with the legacy 0.7 vertical squash around the owner (presentation only, combat-architecture:H15;
 *   the sim and the overlay keep the true circle), a standing persistent patch (Night Shade) is drawn lighter, and the dev line over
 *   the player lists its live persistent groups and whether it counts as stunned.
 *   Subscribed once at load: 'move:cast' plays the routed slot's cast (G.Player.cast: animation, sound, Life Orb cost),
 *   stamps castAt for the HUD flash and simCd for the HUD ring; 'move:hit' feeds the overlay flashes and the chain bolts.
 */
G.MoveRender = (() => {
  const TAU = Math.PI * 2, FLASH = 0.25, BOLT = 0.2;
  let flashes = [], bolts = [];
  const R = { overlay: false };

  const SQUASH = 0.7;     // H15: orbit squash is drawing only
  const squash = (inst, s) => { const o = inst.cast.owner; return Object.assign({}, s, { y: o.y + (s.y - o.y) * SQUASH }); };
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
      const soft = inst.spec.persistent ? 0.33 : 1;     // slice 4c-1: a standing patch (Night Shade, 240 px across) stays light so the player reads through it
      ctx.fillStyle = col; ctx.globalAlpha = 0.24 * a * soft;
      trace(ctx, s); ctx.fill();
      if (s.family !== 'linear') {     // the patch recipe's inner ring
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.45 * a * Math.max(soft, 0.6);
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
        const v = inst.spec.delivery.motion === 'orbits' ? squash(inst, s) : s;     // 4c-1: an orbit is drawn squashed, its hitbox is not
        const pulse = 1 + Math.sin(now * 20 + inst.id) * 0.08;
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.3 * a; ctx.beginPath(); ctx.arc(v.x, v.y, v.r * 1.7 * pulse, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.95 * a; ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.8 * a; ctx.beginPath(); ctx.arc(v.x, v.y, v.r * 0.45, 0, TAU); ctx.fill();
      } else {
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.globalAlpha = 0.85 * a;
        trace(ctx, s); ctx.stroke();
      }
      ctx.restore();
    }
    drawBolts(ctx);
    drawShield(ctx);
    if (R.overlay) drawOverlay(ctx);
  }

  /** Chain hops (4b): a jagged line from the previous enemy, fading over BOLT s. Presentation only, built from the event. */
  function drawBolts(ctx) {
    const t = performance.now() / 1000;
    bolts = bolts.filter(b => t - b.t < BOLT);
    if (!bolts.length) return;
    ctx.save();
    ctx.lineJoin = 'round';
    for (const b of bolts) {
      const dx = b.x - b.fx, dy = b.y - b.fy, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      ctx.globalAlpha = 1 - (t - b.t) / BOLT;
      for (const [w, col] of [[4, b.col], [1.5, '#ffffff']]) {
        ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(b.fx, b.fy);
        for (let i = 1; i < 6; i++) ctx.lineTo(b.fx + dx * i / 6 + nx * b.jit[i], b.fy + dy * i / 6 + ny * b.jit[i]);
        ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** The active Pokemon's shield (4b, Substitute): a ring whose opacity follows the shield's fill. */
  function drawShield(ctx) {
    const pl = G.Game && G.Game.player, sh = pl && pl.shield;
    if (!sh || pl.dead) return;
    const r = (pl.r || 12) * 2.2, y = pl.y - (pl.bodyH || 30) * 0.5, fill = sh.max > 0 ? sh.v / sh.max : 0;
    ctx.save();
    ctx.strokeStyle = '#6ec8ff'; ctx.lineWidth = 3; ctx.globalAlpha = 0.25 + 0.6 * fill;
    ctx.beginPath(); ctx.arc(pl.x, y, r, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#6ec8ff'; ctx.globalAlpha = 0.1 * fill;
    ctx.beginPath(); ctx.arc(pl.x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
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
    const pl = G.Game && G.Game.player;     // the player (4b): HP, shield, team stages and commitments
    if (pl && !pl.dead) {
      const sh = pl.shield, parts = ['HP ' + Math.round(pl.hp) + '/' + Math.round(pl.maxHp)];
      if (sh) parts.push('shield ' + Math.round(sh.v) + '/' + Math.round(sh.max) + ' ' + sh.t.toFixed(1) + 's');
      parts.push(...G.Stages.list(pl).map(s => s.stat + (s.stage > 0 ? '+' : '') + s.stage));
      for (const g of G.MoveSim.persisted(pl)) parts.push(g.moveId + ' x' + g.shapes);     // 4c-1: live persistent groups (R7)
      if (G.Status.stunned(pl)) parts.push('stunned');
      for (const c of G.MoveSim.commits(pl)) parts.push(c.moveId + ' ' + (c.part === 'cooldown' ? 'freeze' : c.type) + (c.until === 'time' ? ' ' + c.left.toFixed(1) + 's' : ' (' + c.until + ')'));
      ctx.fillStyle = '#9fe8ff';
      ctx.fillText(parts.join(' | '), pl.x, pl.y - (pl.bodyH || 30) - 26);
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
    if (ev.hop > 0) {     // a chain hop: the bolt is drawn with or without the overlay
      const def = G.MoveDefs[ev.moveId], jit = [0];
      for (let i = 1; i < 6; i++) jit.push((Math.random() - 0.5) * 18);
      bolts.push({ fx: ev.fromX, fy: ev.fromY, x: ev.x, y: ev.y, jit, col: (def && G.U.TYPE_COLOR && G.U.TYPE_COLOR[def.type]) || '#ffe14d', t: performance.now() / 1000 });
    }
    if (!R.overlay) return;
    const e = G.EnemyMgr.all().find(x => x.id === ev.enemyId);
    flashes.push({ x: ev.x, y: ev.y, r: e ? e.r : 12, crit: ev.crit, t: performance.now() / 1000 });
  });

  R.drawGround = drawGround;
  R.drawAir = drawAir;
  return R;
})();
