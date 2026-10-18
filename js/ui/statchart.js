/* ============ statchart.js — the six base stats as a hexagon ============
 * Like the summary screen in the main games: HP at the top, then clockwise
 * Attack, Defense, Speed, Sp. Def, Sp. Atk.
 *
 *   G.StatChart.make(stats, color, w, h, opts)  ->  a <canvas> (drawn once, not animated)
 *     opts.bonus   six in-run percentages (same order as `stats`, 0.1 = +10%). With opts.layered the base shape is drawn
 *                  as the lower layer and a 60% yellow shape (base x (1 + bonus)) on top of it, and each number gets
 *                  a yellow "+10%" beside it. The yellow layer is skipped while every bonus is 0.
 *     opts.hpText  replaces the HP number (for example "105/105")
 *
 * `stats` is the pokedex array [HP, Atk, Def, SpA, SpD, Spe]. The outer edge of the
 * hexagon is MAX (200): bigger values (Blissey's 255 HP) are clamped to the edge, so
 * ordinary Pokemon do not end up as a tiny shape in the middle.
 */
G.StatChart = (() => {
  const MAX = 200;
  // Clockwise from the top: [index into stats[], label]
  const AXES = [[0, 'HP'], [1, 'Atk'], [2, 'Def'], [5, 'Spe'], [4, 'SpD'], [3, 'SpA']];
  const FONT = 'Pixelify,"Segoe UI",system-ui,sans-serif';
  const SCALE = 2;                                    // backing-store scale, for sharp text

  function make(stats, color, w = 220, h = 192, opts = {}) {
    const cv = document.createElement('canvas');
    cv.width = w * SCALE; cv.height = h * SCALE;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.className = 'stat-hex';
    const ctx = cv.getContext('2d');
    ctx.scale(SCALE, SCALE);

    const cx = w / 2, cy = h / 2 + 2, R = Math.min(w, h) * 0.30;
    const pt = (i, frac) => {
      const a = -Math.PI / 2 + i * Math.PI / 3;          // 6 axes, 60 degrees apart, starting at the top
      return [cx + Math.cos(a) * R * frac, cy + Math.sin(a) * R * frac];
    };
    const poly = fracs => {
      ctx.beginPath();
      fracs.forEach((f, i) => { const [x, y] = pt(i, f); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath();
    };

    // grid: rings at 25 / 50 / 75 / 100 % and the six spokes
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach(r => {
      poly([r, r, r, r, r, r]);
      ctx.strokeStyle = r === 1 ? 'rgba(244,248,255,.4)' : 'rgba(244,248,255,.16)';
      ctx.stroke();
    });
    ctx.strokeStyle = 'rgba(244,248,255,.16)';
    for (let i = 0; i < 6; i++) {
      const [x, y] = pt(i, 1);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    }

    // the Pokemon's shape (the lower layer when `layered`)
    const bonus = opts.bonus || [0, 0, 0, 0, 0, 0];
    const fr = AXES.map(([k]) => Math.max(0, Math.min(1, (stats[k] || 0) / MAX)));
    poly(fr);
    ctx.fillStyle = color + (opts.layered ? '40' : '59');   // ~25% / ~35% opacity
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.fillStyle = color;
    fr.forEach((f, i) => { const [x, y] = pt(i, f); ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 6.2832); ctx.fill(); });
    // the in-run layer: 60% yellow on top; values past the outer edge are clamped to it (the numbers stay true)
    if (opts.layered && AXES.some(([k]) => bonus[k] > 0)) {
      const fy = AXES.map(([k]) => Math.max(0, Math.min(1, (stats[k] || 0) * (1 + (bonus[k] || 0)) / MAX)));
      poly(fy);
      ctx.fillStyle = 'rgba(255,210,63,.6)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#ffd23f'; ctx.stroke();
    }

    // labels: name (small, muted) over value (bold), pushed outward from each corner
    ctx.textBaseline = 'alphabetic';
    AXES.forEach(([k, label], i) => {
      const [x, y] = pt(i, 1.3);
      const al = Math.abs(x - cx) < 4 ? 'center' : x > cx ? 'left' : 'right';
      const lx = al === 'left' ? x - 10 : al === 'right' ? x + 10 : x;
      ctx.textAlign = al;
      ctx.font = `700 11px ${FONT}`;
      ctx.fillStyle = '#b9cbf0';
      ctx.fillText(label, lx, y - 2);
      // value, then (layered) the yellow "+10%". Laid out as one line so it stays aligned on either side.
      const val = k === 0 && opts.hpText ? opts.hpText : String(stats[k]);
      const bon = opts.layered && bonus[k] > 0 ? ' +' + Math.round(bonus[k] * 100) + '%' : '';
      ctx.font = `800 14px ${FONT}`; const w1 = ctx.measureText(val).width;
      ctx.font = `700 11px ${FONT}`; const w2 = bon ? ctx.measureText(bon).width : 0;
      const x0 = al === 'left' ? lx : al === 'right' ? lx - w1 - w2 : lx - (w1 + w2) / 2;
      ctx.textAlign = 'left';
      ctx.font = `800 14px ${FONT}`; ctx.fillStyle = '#ffffff'; ctx.fillText(val, x0, y + 12);
      if (bon) { ctx.font = `700 11px ${FONT}`; ctx.fillStyle = '#ffd23f'; ctx.fillText(bon, x0 + w1, y + 12); }
    });
    return cv;
  }

  return { make, MAX };
})();
