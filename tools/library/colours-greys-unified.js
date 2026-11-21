// tools/library/colours-greys-unified.js: the grey scale fold and the Unified colour scheme. A plain script sharing the board's globals; index.html
// loads the board's files in order, board.js first and start.js last.
'use strict';
// ---------- the grey scale: the 18 greys of today folded onto 7 (Jess 2026-11-18); Unified shows it ----------
// One grey per job you can see (Jess 2026-11-18: 7): ink, panel (the old frame #212121 folds into it, too close to tell
// apart), raised, the slate, a mid grey, the paper and white.
// Each of today's greys folds onto the nearest one. The Type kit's greys and the see-through ones are not on the scale.
const GREY_DRAFT = {
  label: 'color.grey',
  job:
    'Draft grey scale, dark to light: ink (outlines), panel (bodies and frames), raised (checker, dark shades), slate ' +
    '(dividers, mid-dark shades), mid (tracks, light shades), paper and white',
  written: 'tools/library.html only (a draft)',
  colours: [
    ['ink', 'color.hud.outline'],
    ['panel', 'color.hud.body'],
    ['raised', 'color.hud.checker'],
    ['slate', 'color.hud.slate'],
    ['mid', null, '#828282'], // the canon Status attack base (Jess 2026-11-18; 1.1 from the old #7f7f7f, one hex fewer)
    ['paper', 'color.hud.paper'],
    ['white', 'color.rim.rest.light'],
  ],
};
// today's grey -> the draft grey it folds onto (the nearest)
const GREY_FOLD = {
  '#000000': 'ink',
  '#101010': 'ink',
  '#181818': 'panel',
  '#212121': 'panel',
  '#303030': 'raised',
  '#404040': 'slate',
  '#464646': 'slate',
  '#4a4a4a': 'slate',
  '#4c4c4c': 'slate',
  '#495151': 'slate',
  '#575757': 'slate',
  '#747474': 'mid',
  '#7f7f7f': 'mid',
  '#848484': 'mid',
  '#8c8c8c': 'mid',
  '#c4c4c4': 'paper',
  '#e7e7e7': 'paper',
  '#ffffff': 'white',
};
/** A #hex in CIE Lab, to say how far apart two colours look. */
function labOf(hex) {
  const linear = (channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [1, 3, 5].map((index) => linear(parseInt(hex.slice(index, index + 2), 16)));
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047,
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b,
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (value) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
/** How far apart two colours look: CIEDE2000 (Jess 2026-11-18, in place of CIE76, which overstates saturated colours
 *  and understates greys). About 1 is the smallest step the eye notices; above 5 is clearly different. */
function deltaE(one, two) {
  const [L1, a1, b1] = labOf(one),
    [L2, a2, b2] = labOf(two);
  const rad = Math.PI / 180,
    pow7 = (value) => value ** 7;
  const meanChroma = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const g = 0.5 * (1 - Math.sqrt(pow7(meanChroma) / (pow7(meanChroma) + pow7(25))));
  const a1p = (1 + g) * a1,
    a2p = (1 + g) * a2;
  const C1p = Math.hypot(a1p, b1),
    C2p = Math.hypot(a2p, b2);
  const hue = (b, ap) => (b === 0 && ap === 0 ? 0 : (Math.atan2(b, ap) / rad + 360) % 360);
  const h1p = hue(b1, a1p),
    h2p = hue(b2, a2p);
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dLp = L2 - L1,
    dCp = C2p - C1p,
    dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lbp = (L1 + L2) / 2,
    Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2;
    else hbp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hbp - 30) * rad) +
    0.24 * Math.cos(2 * hbp * rad) +
    0.32 * Math.cos((3 * hbp + 6) * rad) -
    0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const RC = 2 * Math.sqrt(pow7(Cbp) / (pow7(Cbp) + pow7(25)));
  const SL = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2),
    SC = 1 + 0.045 * Cbp,
    SH = 1 + 0.015 * Cbp * T,
    RT = -Math.sin(2 * dTheta * rad) * RC;
  const l = dLp / SL,
    c = dCp / SC,
    h = dHp / SH;
  return Math.sqrt(l * l + c * c + h * h + RT * c * h);
}
const SEEN_FROM = 1,
  SLIGHT_UNDER = 5;
const changeWords = (difference) =>
  difference === 0
    ? 'same'
    : difference < SEEN_FROM
      ? "can't see it"
      : difference < SLIGHT_UNDER
        ? 'slight'
        : 'visible';
// ---------- Unified: the new colour scheme, one group at a time as Jess settles it (a draft; the game reads nothing) ----
// The unified scheme (Jess 2026-11-18): every colour that is not canon Pokemon is one of 28. Neutrals: the 7 greys.
// Colours: the 7 UI colours, red, green, blue, yellow, purple, pink and teal (Jess 2026-11-18: one group, no Special). Each colour is a 3-tone ramp (light, base, dark) worked out
// from its base by the accent ramp rule (docs/decisions/2026-11-18-155-accent-ramp-rule.md). Everything else the UI
// shows is canon (types, status and stat chips; Lv and HP middle use the canon paralysis yellow). Names come later.
const RAMP_LIGHT = 0.35,
  RAMP_DARK = 0.55;
const rampChannels = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
const rampHex = (channels) =>
  '#' +
  channels
    .map((value) =>
      Math.round(Math.min(255, Math.max(0, value)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('');
const rampLight = (hex) => rampHex(rampChannels(hex).map((value) => value + (255 - value) * RAMP_LIGHT));
const rampDark = (hex) => rampHex(rampChannels(hex).map((value) => value * RAMP_DARK));
/** A 3-tone ramp: base is a token or Colours 2.0 name, or a #hex the game writes raw; light and dark come from the
 *  rule unless a name is given for them. */
function accentRamp(base, tones = {}) {
  const raw = base.startsWith('#');
  const value = raw ? base.toLowerCase() : valueOf(['base', base]);
  const tone = (part, name, worked) =>
    name ? (name.startsWith('#') ? [part, null, name.toLowerCase()] : [part, name]) : [part, null, worked];
  return [
    tone('light', tones.light, rampLight(value)),
    raw ? ['base', null, value] : ['base', base],
    tone('dark', tones.dark, rampDark(value)),
  ];
}
const RAMP_NOTE = 'light and dark worked out by the ramp rule (35% to white, 55% of the base)';
const unifiedRamp = (label, heading, job, colours, note = RAMP_NOTE) => ({ label, heading, job, colours, note });
const UNIFIED_RED = unifiedRamp(
  'unified.red',
  'Red (name later)',
  "Danger: the negative rim (Sell, End, Let It Go, Destroy), low HP, Run Info's behind value, the pause menu's red " +
    'cap and End Run title',
  [
    ['light', 'color.rim.sell.light'],
    ['base', 'color.hp.low.fill'],
    ['dark', 'color.hp.low.shade'],
  ],
  'settled 2026-11-18 from the negative rim light and the low HP fill and shade'
);
const UNIFIED_GREEN = unifiedRamp(
  'unified.green',
  'Green (name later)',
  'Positive: the focus rim, HP high, ahead values, the Berry pocket rim',
  accentRamp('color.rim.focus.base')
);
const UNIFIED_BLUE = unifiedRamp(
  'unified.blue',
  'Blue (name later)',
  "EXP: the EXP bar and ring, live run item text, the menu scroll thumb (dark), the menu windows' card rims",
  accentRamp('color.hud.expFill', { light: '#66d8f6', dark: 'color.statSpa.shade' }),
  'light and dark are the canon Special Attack light and shade (Jess 2026-11-18: one hex fewer each, and the light ' +
    'moves off the Ice base, 1.9 to 3.4)'
);
const UNIFIED_YELLOW = unifiedRamp(
  'unified.yellow',
  'Yellow (name later)',
  "The cursor's yellow: the selection cursor, Run Info's headers, bonus and gold values, the stat hex's run band, " +
    'the Pinap chip',
  accentRamp('color.hud.cursor')
);
const UNIFIED_PURPLE = unifiedRamp(
  'unified.purple',
  'Purple (name later)',
  'The Epic rarity tier (Pokedex, Team screen, TMs filter); the one tier the other ramps did not cover',
  accentRamp('#c47bff'),
  RAMP_NOTE + '; base is the Epic rarity colour js/systems/copies.js writes raw'
);
const UNIFIED_PINK = unifiedRamp(
  'unified.pink',
  'Pink (name later)',
  'Bond and team: bonded move slots and groups, the Team Item pocket rim',
  accentRamp('#ff8ad8'),
  RAMP_NOTE + '; base is the bond pink the game writes raw'
);
const UNIFIED_TEAL = unifiedRamp(
  'unified.teal',
  'Teal (name later)',
  "Secondary text (a card's name, Run Info values); the menu scroll thumb's rim",
  accentRamp('color.text.secondary')
);
