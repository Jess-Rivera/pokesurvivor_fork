/* ============ util.js — shared helpers ============ */
window.G = window.G || {};

/** Height at which projectiles and effects fly above the ground plane. */
G.LIFT = 18;

G.U = {
  clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  },
  lerp(a, b, t) {
    return a + (b - a) * t;
  },
  rand(a, b) {
    return a + Math.random() * (b - a);
  },
  randInt(a, b) {
    return Math.floor(a + Math.random() * (b - a + 1));
  },
  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /** Picks n distinct elements at random. */
  pickN(arr, n) {
    const c = arr.slice();
    const out = [];
    while (out.length < n && c.length) out.push(c.splice(Math.floor(Math.random() * c.length), 1)[0]);
    return out;
  },

  dist(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
  },
  dist2(ax, ay, bx, by) {
    const dx = bx - ax,
      dy = by - ay;
    return dx * dx + dy * dy;
  },

  /** Normalizes a vector; returns [0,0] if it is null. */
  norm(x, y) {
    const m = Math.hypot(x, y);
    return m > 1e-6 ? [x / m, y / m] : [0, 0];
  },

  /** Framerate-independent interpolation. */
  damp(a, b, rate, dt) {
    return b + (a - b) * Math.exp(-rate * dt);
  },

  /** Deterministic 2D hash -> [0,1). To generate the map the same way every time. */
  hash(x, y, seed = 0) {
    // Everything in 32-bit integers with Math.imul: this is the most-called function
    // when baking the map, so V8 never leaves the fast path.
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  },

  /** "3:07" from seconds. */
  mmss(s) {
    const m = Math.floor(s / 60);
    return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  },

  /** "1,204" up to 9,999, then "41.2k" and "1.3M": one decimal, a trailing .0 dropped ("10k") (#91-3, 91d P4). */
  compact(n) {
    const value = Math.round(n || 0),
      size = Math.abs(value);
    if (size < 10000) return value.toLocaleString('en-US');
    const [unit, step] = size >= 999950 ? ['M', 1e6] : ['k', 1e3]; // 999,950 reads 1M, never 1000k
    return String(Math.round((value / step) * 10) / 10) + unit;
  },

  /**
   * Pokemon type colours, from the design tokens (js/ui/lib/tokens/tokens.js, color.type.<type>.<tone>; the Bulbapedia
   * Scarlet/Violet palette, docs/HUD-STYLE.md "Type colours", checked by tools/type_colors.js). TYPE_COLOR is the Base
   * tone, for fills, projectiles and effects. TYPE_COLOR_LIGHT is for highlights and for type-coloured text drawn over
   * the map (Base is too dark there for Ghost, Dark, Ground). TYPE_COLOR_DARK is for shades and outlines.
   */
  TYPE_COLOR: G.Tokens.typeTable('base'),
  TYPE_COLOR_LIGHT: G.Tokens.typeTable('light'),
  TYPE_COLOR_DARK: G.Tokens.typeTable('dark'),

  TYPE_NAME: {
    normal: 'Normal',
    fire: 'Fuego',
    water: 'Agua',
    grass: 'Planta',
    electric: 'Eléctrico',
    ice: 'Hielo',
    fighting: 'Lucha',
    poison: 'Veneno',
    ground: 'Tierra',
    flying: 'Volador',
    psychic: 'Psíquico',
    bug: 'Bicho',
    rock: 'Roca',
    ghost: 'Fantasma',
    dragon: 'Dragón',
    dark: 'Siniestro',
    steel: 'Acero',
    fairy: 'Hada',
  },
};
