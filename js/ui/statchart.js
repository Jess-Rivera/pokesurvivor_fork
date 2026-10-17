/* ============ statchart.js — the six base stats as a hexagon ============
 * Like the summary screen in the main games: HP at the top, then clockwise
 * Attack, Defense, Speed, Sp. Def, Sp. Atk.
 *
 *   G.StatChart.make(stats, color, w, h)  ->  a <canvas> (drawn once, not animated)
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

  function make(stats, color, w = 220, h = 192) {
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

    // the Pokemon's shape
    const fr = AXES.map(([k]) => Math.max(0, Math.min(1, (stats[k] || 0) / MAX)));
    poly(fr);
    ctx.fillStyle = color + '59';                         // ~35% opacity
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.fillStyle = color;
    fr.forEach((f, i) => { const [x, y] = pt(i, f); ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 6.2832); ctx.fill(); });

    // labels: name (small, muted) over value (bold), pushed outward from each corner
    ctx.textBaseline = 'alphabetic';
    AXES.forEach(([k, label], i) => {
      const [x, y] = pt(i, 1.3);
      ctx.textAlign = Math.abs(x - cx) < 4 ? 'center' : x > cx ? 'left' : 'right';
      const lx = ctx.textAlign === 'left' ? x - 10 : ctx.textAlign === 'right' ? x + 10 : x;
      ctx.font = `700 11px ${FONT}`;
      ctx.fillStyle = '#b9cbf0';
      ctx.fillText(label, lx, y - 2);
      ctx.font = `800 14px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(stats[k]), lx, y + 12);
    });
    return cv;
  }

  return { make, MAX };
})();
