/* ============ move-geom.js: collision geometry for the new move system (G.MoveGeom) ============
 *
 * Pure math: no state, no canvas, no clock, no randomness. This is the ONE implementation of hit geometry
 * (architecture invariant I6): the sim, the harness, the hitbox overlay and the renderer all call it.
 * Not loaded by the game until slice 3d (not in dev.html or the NEED array).
 * Units are pixels and radians (I9). Containment is chosen by a table keyed by shape family only (I3).
 *
 *   shapeOf(space, grow, st)  the step's plain shape object. space = the move's space block, grow = delivery.grow or null,
 *                             st = { x, y, heading, age, dist, lens }. The authored dimension is the START and grow.max the
 *                             end (D21). The lens scales the grown radial values and radArc is clamped to 2 pi (D36).
 *                             Families: point (radial, no radArc), arc, circle (radArc at 2 pi or more), linear.
 *   contains(shape, px, py, ex, ey, er)  is the enemy circle inside, or swept through, the shape. (px, py) is the
 *                             instance's previous position; only the point family uses it (D17).
 *   boundsOf(shape, px, py, maxEnemyR)   a query circle for centers, to be used with a query that adds each enemy's
 *                             own radius (EnemyMgr.queryCircleEach does). maxEnemyR is only needed for linear shapes.
 */
G.MoveGeom = (() => {
  const TAU = Math.PI * 2;

  /** Squared distance from point (cx, cy) to the segment (ax, ay)-(bx, by). Same results as the legacy combat.js copy. */
  function segDist2(ax, ay, bx, by, cx, cy) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((cx - ax) * dx + (cy - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + dx * t - cx, qy = ay + dy * t - cy;
    return qx * qx + qy * qy;
  }

  /** D21: start + growSpeed x (age, or distance travelled), capped by max when there is one. */
  function grown(start, grow, st) {
    const g = start + grow.growSpeed * (grow.per === 'distance' ? (st.dist || 0) : Math.max(0, st.age || 0));
    return grow.max == null ? g : Math.min(g, grow.max);
  }

  function shapeOf(space, grow, st) {
    const dim = grow ? (grow.dim || 'radRadius') : null, lens = st.lens || 1;
    const dimOf = k => (dim === k ? grown(space[k] || 0, grow, st) : space[k]);
    const base = { x: st.x, y: st.y, heading: st.heading };
    if (space.shape === 'linear') return { ...base, family: 'linear', len: dimOf('linLength'), w: space.linWidth };
    const r = dimOf('radRadius') * lens;
    if (space.radArc == null && dim !== 'radArc') return { ...base, family: 'point', r };
    const arc = Math.min(dimOf('radArc') * lens, TAU);
    return { ...base, family: arc >= TAU ? 'circle' : 'arc', r, arc };
  }

  const CONTAINS = {
    // D17: swept test along prev -> current, so a fast point cannot tunnel
    point: (s, px, py, ex, ey, er) => segDist2(px, py, s.x, s.y, ex, ey) <= (s.r + er) ** 2,
    // D19: the arc test without the angle
    circle: (s, px, py, ex, ey, er) => (ex - s.x) ** 2 + (ey - s.y) ** 2 <= (s.r + er) ** 2,
    // D18: distance plus angular offset with the enemy-size tolerance. An enemy that covers the apex is inside at any angle
    // (Jess, 2026-10-26; also avoids dividing by a zero distance).
    arc(s, px, py, ex, ey, er) {
      const dx = ex - s.x, dy = ey - s.y, d2 = dx * dx + dy * dy;
      if (d2 > (s.r + er) ** 2) return false;
      const d = Math.sqrt(d2);
      if (d <= er) return true;
      let off = (Math.atan2(dy, dx) - s.heading) % TAU;
      if (off > Math.PI) off -= TAU; else if (off < -Math.PI) off += TAU;
      return Math.abs(off) <= s.arc / 2 + Math.asin(er / d);
    },
    // D20: project onto the band axis from the anchor along the heading; both ends and the sides widened by the enemy radius
    linear(s, px, py, ex, ey, er) {
      const c = Math.cos(s.heading), n = Math.sin(s.heading), rx = ex - s.x, ry = ey - s.y;
      const along = rx * c + ry * n, side = Math.abs(ry * c - rx * n);
      return along >= -er && along <= s.len + er && side <= s.w / 2 + er;
    }
  };

  const BOUNDS = {
    point: (s, px, py) => ({ x: (px + s.x) / 2, y: (py + s.y) / 2, r: Math.hypot(s.x - px, s.y - py) / 2 + s.r }),
    circle: s => ({ x: s.x, y: s.y, r: s.r }),
    arc: s => ({ x: s.x, y: s.y, r: s.r }),
    // the band widened by a square margin has corners up to (sqrt 2 - 1) x the enemy radius beyond a round one; 0.42 covers that
    linear(s, px, py, pad) {
      const h = s.len / 2;
      return { x: s.x + Math.cos(s.heading) * h, y: s.y + Math.sin(s.heading) * h, r: Math.hypot(h, s.w / 2) + pad * 0.42 };
    }
  };

  return {
    segDist2, shapeOf,
    contains: (s, px, py, ex, ey, er) => CONTAINS[s.family](s, px, py, ex, ey, er),
    boundsOf: (s, px, py, maxEnemyR) => BOUNDS[s.family](s, px, py, maxEnemyR || 0)
  };
})();
