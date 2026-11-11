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

  /**
   * Pokemon type colours: the Bulbapedia Scarlet/Violet palette (docs/HUD-STYLE.md "Type colours"), checked against that
   * table by tools/type_colors.js. TYPE_COLOR is the Base tone, for fills, projectiles and effects. TYPE_COLOR_LIGHT is
   * for highlights and for type-coloured text drawn over the map (Base is too dark there for Ghost, Dark, Ground).
   * TYPE_COLOR_DARK is for shades and outlines.
   */
  TYPE_COLOR: {
    normal: '#9FA19F',
    fire: '#E62829',
    water: '#2980EF',
    grass: '#3FA129',
    electric: '#FAC000',
    ice: '#3DCEF3',
    fighting: '#FF8000',
    poison: '#9141CB',
    ground: '#915121',
    flying: '#81B9EF',
    psychic: '#EF4179',
    bug: '#91A119',
    rock: '#AFA981',
    ghost: '#704170',
    dragon: '#5060E1',
    dark: '#624D4E',
    steel: '#60A1B8',
    fairy: '#EF70EF',
  },
  TYPE_COLOR_LIGHT: {
    normal: '#C1C2C1',
    fire: '#EF7374',
    water: '#74ACF5',
    grass: '#82C274',
    electric: '#FCD659',
    ice: '#81DFF7',
    fighting: '#FFAC59',
    poison: '#B884DD',
    ground: '#B88E6F',
    flying: '#ADD2F5',
    psychic: '#F584A8',
    bug: '#B8C26A',
    rock: '#CBC7AD',
    ghost: '#A284A2',
    dragon: '#8D98EC',
    dark: '#998B8C',
    steel: '#98C2D1',
    fairy: '#F5A2F5',
  },
  TYPE_COLOR_DARK: {
    normal: '#676967',
    fire: '#961A1B',
    water: '#1B539B',
    grass: '#29691B',
    electric: '#A37D00',
    ice: '#28869E',
    fighting: '#A65300',
    poison: '#5E2A84',
    ground: '#5E3515',
    flying: '#54789B',
    psychic: '#9B2A4F',
    bug: '#5E6910',
    rock: '#726E54',
    ghost: '#492A49',
    dragon: '#343E92',
    dark: '#403233',
    steel: '#3E6978',
    fairy: '#9B499B',
  },

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
