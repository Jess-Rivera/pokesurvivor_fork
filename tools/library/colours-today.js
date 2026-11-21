// tools/library/colours-today.js: the colour swatch helpers and today's colour kits. A plain script sharing the board's globals; index.html
// loads the board's files in order, board.js first and start.js last.
'use strict';
// Colours (Jess 2026-11-18): two tabs, Unified (the scheme) and Fold Map (today's colours to Unified). The kits below
// hold today's colours (the old Colours 2.0 Used in Game tab); the Fold Map reads them. The game reads nothing here.
/** An rgba() colour as its #hex and alpha (labelRefused is white at 45%); null for a plain #hex. */
function seeThrough(value) {
  const parts = value.startsWith('rgba') ? value.match(/[\d.]+/g).map(Number) : null;
  if (!parts) return null;
  const hex =
    '#' +
    parts
      .slice(0, 3)
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('');
  return { hex, alpha: parts[3] };
}
/** A colour's HSL saturation and lightness (0 to 1). */
function hslOf(hex) {
  const see = seeThrough(hex);
  if (see) return { saturation: 0, lightness: see.alpha };
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    lightness = (max + min) / 2;
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
  return { saturation, lightness };
}
// Under 6% saturation counts as a grey: the divider (#495151, 5.3%) is one; the Dark type's light tone (#998b8c, 6.4%)
// is not, so its ramp stays in order
const GREY_SATURATION = 0.06;
/** Swatch order (Jess 2026-11-18): greys first, then the coloured ones, each dark to light by HSL lightness. */
function swatchOrder(a, b) {
  const one = hslOf(a.hex),
    two = hslOf(b.hex);
  const greyFirst = (one.saturation >= GREY_SATURATION) - (two.saturation >= GREY_SATURATION);
  return greyFirst || one.lightness - two.lightness;
}
const SWATCH_COLOUR_WIDTH = 50, // px: the color.hudPanel baseline (350 px for 7); a colour is never thinner
  SWATCH_MIN_WIDTH = 200; // px: the white bar's room for the longest name (.trackLight) and a #HEX
/** A swatch (tools/library/swatch.css): its header (color.hudPanel.*), the colours side by side, dark to light, 50 px
 *  each, then its story info (the job, and the tokens.js tokens it reads today), wrapped to the swatch's width.
 *  Hovering a colour shows its name (.body) and #HEX in the white bar; clicking one copies its #HEX.
 *  group: { label, job, colours: [[part, token, hex], ...] }; a part is the name after the label, in camelCase (body,
 *  trackLight); hex, if given, is the prototype's new value in place of the token's (the info line shows both).
 *  Order: greys first, then the coloured ones, each dark to light by HSL lightness (swatchOrder).
 *  A colour the game writes as a raw hex has no token: [part, null, hex], and the group says where (written: 'file'). */
/** What the white bar shows for a colour: its #hex, or "#ffffff 45%" for a see-through one. */
const shown = (value) => {
  const see = seeThrough(value);
  return see ? see.hex + ' ' + Math.round(see.alpha * 100) + '%' : value;
};
/** Every Colours 2.0 swatch, kit by kit. */
const allSwatches = () =>
  [
    HUD_KIT_SWATCHES,
    HP_SWATCHES,
    RIM_SWATCHES,
    SCROLL_SWATCHES,
    TEXT_SWATCHES,
    STATUS_SWATCHES,
    STAT_SWATCHES,
    EFFECT_SWATCHES,
    TYPE_SWATCHES,
  ].flat();
/** Every Colours 2.0 colour by its full name (color.hudBonus.fill), built once when a page first draws. */
let boardEntries = null;
function boardEntry(name) {
  if (!boardEntries) {
    boardEntries = new Map();
    for (const group of allSwatches())
      for (const colour of group.colours) boardEntries.set(group.label + '.' + colour[0], colour);
  }
  return boardEntries.get(name);
}
/** A #hex at an alpha, written the way the game writes see-through colours ("rgba(255, 210, 63, 0.75)"). */
const rgbaOf = (hex, alpha) =>
  `rgba(${[1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)).join(', ')}, ${alpha})`;
/** A colour's value: [part, name, hex, alpha]. name is a tokens.js token or another Colours 2.0 colour (a shared one);
 *  hex, if given, is the prototype's new value; alpha paints it see-through. */
function valueOf([, name, hex, alpha]) {
  const shared = !hex && name && boardEntry(name);
  const value = (hex || (shared ? valueOf(shared) : G.Tokens.color(name))).toLowerCase();
  return alpha == null ? value : rgbaOf(value, alpha);
}
function swatch(group) {
  const entry = (colour) => ({ part: '.' + colour[0], token: colour[1], hex: valueOf(colour) });
  const colours = group.colours.map(entry).sort(swatchOrder);
  const listed = group.colours;
  const head = `<div class="swatch-head">${group.heading ? esc(group.heading) : nameButton(group.label + '.*')}</div>`;
  const named = listed.filter(([, token]) => token);
  const today = group.from
    ? group.from
    : group.source
      ? 'canon, ' + group.source
      : !named.length
        ? 'no token, written as raw hex in ' + group.written
        : listed
            .map(([, token, hex, alpha]) =>
              !token
                ? (group.note ? 'new ' : 'no token ') + hex.toLowerCase()
                : boardEntry(token)
                  ? token + (alpha == null ? '' : ' at ' + Math.round(alpha * 100) + '%') + ' (Colours 2.0)'
                  : hex
                    ? `${token} (${G.Tokens.color(token).toLowerCase()}, here ${hex.toLowerCase()})`
                    : token
            )
            .join(', ') +
          (group.written ? '; written as raw hex in ' + group.written : '') +
          (group.note ? '; ' + group.note : '');
  const info = `<p class="lib-note swatch-info">${esc(group.job)}.
    <span class="lib-dim">Today: ${esc(today)}</span></p>`;
  const width = Math.max(colours.length * SWATCH_COLOUR_WIDTH, SWATCH_MIN_WIDTH);
  return (
    `<div class="swatch-group" style="width:${width}px">` +
    head +
    `<div class="swatch">
    <div class="swatch-palette">${colours
      .map(
        (colour) => `
      <div class="swatch-color" style="background:${esc(colour.hex)}" data-copy="${esc(colour.hex)}"
        data-part="${esc(colour.part)}" data-show="${esc(shown(colour.hex))}"></div>`
      )
      .join('')}</div>
    <div class="swatch-stats"><span class="swatch-part"></span><span class="swatch-hex"></span></div>
  </div>` +
    info +
    '</div>'
  );
}
/** Swatches side by side, wrapping to the next row when the page runs out. */
const swatchRow = (groups) => `<div class="swatch-row">${groups.map(swatch).join('')}</div>`;

// Colours 2.0 groups: prototype names in camelCase (Jess, 2026-11-18), each colour read from today's tokens.js token
const HUD_KIT_SWATCHES = [
  {
    label: 'color.hudPanel',
    job:
      'The colours every HUD and menu panel is drawn with: outlines, bodies, frames, dividers, ' +
      "the menu windows' teal and the yellow selection cursor",
    colours: [
      ['outline', 'color.hud.outline'],
      ['body', 'color.hud.body'],
      ['frame', 'color.hud.frame'],
      ['checker', 'color.hud.checker'],
      ['divider', 'color.hud.slate'],
      ['teal', 'color.hud.teal'],
      ['cursor', 'color.hud.cursor'],
    ],
  },
  {
    label: 'color.hudCheckerPattern',
    job: 'The move slot grid: dark squares on light lines (from the B2 type checker)',
    colours: [
      ['dark', 'color.hud.typeBodyDark', '#303030'],
      ['light', 'color.hud.typeBodyLight', '#404040'],
    ],
  },
  {
    label: 'color.hudLevel',
    job: 'The Lv yellow: Lv and gold fill and shade, and the run item box corner shade',
    colours: [
      ['fill', 'color.hud.lvFill'],
      ['shade', 'color.hud.lvShade'],
      ['dark', 'color.hud.lvDark'],
    ],
  },
  {
    label: 'color.hudBonus',
    job:
      "The bonus yellow: what a bonus adds (the stat hex's run band, the EV screen's adds, bonus and gold values) and " +
      "the Pinap Berry chip (PIN). textPause.bonus, hudPauseHex.run and effectDrop point at it; shade is the chip's, " +
      'at 55% of the fill',
    written: 'css/pause-menu.css, css/hud-overlay.css, js/ui/hud-kit-chips.js (PIN, shade worked out by rampedShade)',
    colours: [
      ['fill', null, '#ffd23f'],
      ['shade', null, '#8c7423'],
    ],
  },
  {
    label: 'color.hudWhite',
    job:
      "The HUD's white: every white rim at rest (light, base, shade), the run item box's icon patch and its edge, " +
      "the catch screen's flee ring",
    colours: [
      ['light', 'color.rim.rest.light'],
      ['base', 'color.hud.paper'],
      ['shade', 'color.hud.paperEdge'],
    ],
  },
  {
    label: 'color.hudPauseRed',
    job: "The pause menu's red: the Poke Ball's red cap the menu opens from, and the End Run title",
    written: 'css/pause-menu.css (--pm-red and .er-title)',
    colours: [['base', null, '#c8141c']],
  },
  {
    label: 'color.hudPauseBall',
    job:
      'The Poke Ball the pause menu opens from: its outer ring, ring, black inside and slate bottom cap. It also ' +
      'reuses hudPauseRed (the top cap), hudPanel.outline (the inner ring, the centre button stroke) and white (the ' +
      "caps' edge, the centre button)",
    written: 'css/pause-menu.css (.pm-ring-outer, .pm-ring, .pm-inside, --pm-slate)',
    colours: [
      ['ringOuter', null, '#747474'],
      ['ring', null, '#575757'],
      ['inside', null, '#000000'],
      ['capSlate', null, '#313a46'],
    ],
  },
  {
    label: 'color.hudPauseHex',
    job:
      "The pause menu's stat hex: its grid lines (16%) and outer ring (40%), the now band (60%) and its edge, and " +
      "the run band (the bonus yellow at 75%). The start band is the Pokemon's first type at 60%",
    written: 'css/pause-menu.css (.pm-hex-*)',
    colours: [
      ['line', null, 'rgba(244, 248, 255, 0.16)'],
      ['lineEdge', null, 'rgba(244, 248, 255, 0.4)'],
      ['now', null, 'rgba(244, 248, 255, 0.6)'],
      ['nowEdge', null, '#f4f8ff'],
      ['run', 'color.hudBonus.fill', null, 0.75],
    ],
  },
  {
    label: 'color.hudExp',
    job: "The EXP blue: the EXP bar and ring fill and shade, and live run item text; empty is the ring's unfilled part",
    colours: [
      ['fill', 'color.hud.expFill'],
      ['shade', 'color.hud.expShade'],
      ['empty', 'color.hud.trackLight'],
    ],
  },
];
const ramp = (token) => [
  ['light', token + '.light'],
  ['base', token + '.base'],
  ['dark', token + '.dark'],
];
// HP kit: the life meter fills by how much HP is left (bar.life, the roster bar, the boss bar)
const HP_SWATCHES = [
  ['High', 'high', 'over half: green'],
  ['Middle', 'middle', 'from a fifth to half: yellow'],
  ['Low', 'low', 'under a fifth: red'],
].map(([title, band, when]) => ({
  label: 'color.hp' + title,
  job: 'HP ' + when + '. Fill for the bar, shade for its edge rows',
  colours: [
    ['fill', 'color.hp.' + band + '.fill'],
    ['shade', 'color.hp.' + band + '.shade'],
  ],
}));
// the empty track the fills slide along (moved from hudPanel, Jess 2026-11-18). trackLight also paints the EXP ring's
// empty part (named color.hudExp.empty), the grey rim's light row (color.rim.fainted.light) and Run Info's scroll thumb
// rim: those get their own names in the colour pass
HP_SWATCHES.unshift({
  label: 'color.hpTrack',
  job: "The life bar's empty track behind the fill: shade for its top and bottom rows, light for its middle row",
  colours: [
    ['shade', 'color.hud.trackShade'],
    ['light', 'color.hud.trackLight'],
  ],
});
const RIM_SWATCHES = [
  {
    label: 'color.rimButtonRest',
    job: 'A button at rest (and a refused one): the white rim',
    colours: ramp('color.rim.rest'),
  },
  {
    label: 'color.rimButtonFocusPositive',
    job: 'A button under the cursor that moves forward or buys: the green rim',
    colours: ramp('color.rim.focus'),
  },
  {
    label: 'color.rimButtonFocusNegative',
    job: 'A button under the cursor that takes something away (Sell, Let It Go, End, Destroy): the red rim',
    colours: ramp('color.rim.sell'),
  },
  {
    label: 'color.rimInactive',
    job: 'A fainted roster row or pixel panel, and a locked belt: the grey rim',
    colours: ramp('color.rim.fainted'),
  },
  {
    label: 'color.rimBelt',
    job: 'A bought ball belt in the Shop (the Poke Balls pocket colours): the gold rim',
    colours: ramp('color.rim.belt'),
  },
  {
    label: 'color.rimButtonNeutral',
    job: "A button that neither moves forward nor takes away, at rest and under the cursor: the pocket prompt's No",
    written: 'js/ui/pause-menu.js GREY_RIM',
    colours: [
      ['light', null, '#c4c4c4'],
      ['base', null, '#8c8c8c'],
      ['dark', null, '#4c4c4c'],
    ],
  },
  {
    label: 'color.rimBond',
    job: "Bonded moves: the run HUD's bonded move slots and the pause menu's bonded move groups (the bond pink)",
    written: 'js/ui/hud-player-panel.js BOND_RIM; base also in pause-pokemon.js and pause-menu.css',
    colours: [
      ['light', null, '#ffd3f1'],
      ['base', null, '#ff8ad8'],
      ['dark', null, '#8c4c77'],
    ],
  },
  {
    label: 'color.rimPocketBerry',
    job: "The Shop's Upgrades tab: the Berry pocket card's green rim",
    written: 'js/ui/gacha-ui.js BERRY_POCKET_RIM',
    colours: [
      ['light', null, '#6ec188'],
      ['base', null, '#20a048'],
      ['dark', null, '#15682f'],
    ],
  },
  {
    label: 'color.rimPocketTeamItem',
    job: "The Shop's Upgrades tab: the Team Item pocket card's pink rim",
    written: 'js/ui/gacha-ui.js TEAM_ITEM_POCKET_RIM',
    colours: [
      ['light', null, '#d89db7'],
      ['base', null, '#c86890'],
      ['dark', null, '#82445e'],
    ],
  },
];
// Scroll kit: the two scroll bars the game draws
const SCROLL_SWATCHES = [
  {
    label: 'color.scrollMenu',
    job: "The menu windows' scroll bar (Shop, Inventory, the pause menu's move list): a teal thumb on the checker",
    // the thumb is the EXP shade, which moved to the canon SpA shade (Jess 2026-11-18), so it points there; its rim
    // stays teal, so the rim reads the teal itself, not the thumb it aliases in tokens.js
    colours: [
      ['track', 'color.scroll.track'],
      ['thumb', 'color.statSpa.shade'],
      ['thumbRim', 'color.hud.teal'],
    ],
  },
  {
    label: 'color.scrollRunInfo',
    job: "Run Info's scroll bar: a slate thumb with a grey rim on the panel frame (written in pause-run-info.js, no token)",
    colours: [
      ['track', 'color.hud.frame'],
      ['thumb', 'color.hud.slate'],
      ['thumbRim', 'color.hud.trackLight'],
    ],
  },
];
// Text kit: the menu windows' and library pieces' text, and the pause menu's text
const TEXT_SWATCHES = [
  {
    label: 'color.textMenu',
    job:
      "Menu text: a button's label, a refused button's label (white at 45%, shown over the board), and secondary " +
      "text (a card's name)",
    colours: [
      ['label', 'color.text.label'],
      ['labelRefused', 'color.text.labelRefused'],
      ['secondary', 'color.text.secondary'],
    ],
  },
  {
    label: 'color.textPause',
    job:
      "The pause menu's text: body white; box titles and empty notes grey; the stat hex's names, move summaries and " +
      "stat values blue; the hex edge's number; bonuses and gold yellow; Run Info's headers; ahead green and behind " +
      "red; the EV screen's soft white. It also reuses the Lv yellow, the low HP red, the pause red (End Run title), " +
      'the divider (a disabled EV step) and textMenu.secondary (Run Info values)',
    written: 'css/pause-menu.css',
    colours: [
      ['body', 'color.text.label'],
      ['title', 'color.hud.trackLight'],
      ['soft', 'color.hud.paper'],
      ['value', null, '#b9cbf0'],
      ['edge', null, '#3d8ee0'],
      ['bonus', 'color.hudBonus.fill'],
      ['header', 'color.hud.cursor'],
      ['ahead', 'color.rim.focus.base'],
      ['behind', 'color.rim.sell.base'],
    ],
  },
];
// Status kit: the chips' colours (js/ui/hud-kit-chips.js), all raw hex today. Rows: the statuses, the stat chips, the
// team's timed effects.
const CHIPS = 'js/ui/hud-kit-chips.js';
const chip = (label, job, written, fill, shade) => ({
  label,
  job,
  written,
  colours: [
    ['fill', null, fill],
    ['shade', null, shade],
  ],
});
const STATUS_SWATCHES = [
  chip('color.statusSleep', 'Sleep (SLP)', CHIPS + ' CHIP_STYLES', '#848484', '#4a4a4a'),
  chip('color.statusPoison', 'Poison (PSN)', CHIPS + ' CHIP_STYLES', '#d631de', '#6b2942'),
  chip(
    'color.statusToxic',
    'Bad poison (PSN): the poison fill with a darker shade',
    CHIPS + ' CHIP_STYLES',
    '#d631de',
    '#391042'
  ),
  chip('color.statusBurn', 'Burn (BRN)', CHIPS + ' CHIP_STYLES', '#e75a4a', '#b50000'),
  chip('color.statusFreeze', 'Freeze (FRZ)', CHIPS + ' CHIP_STYLES', '#218cf7', '#005a8c'),
  chip('color.statusParalysis', 'Paralysis (PAR)', CHIPS + ' CHIP_STYLES', '#efad00', '#ad6b00'),
  {
    label: 'color.statusMinor',
    job:
      'The minor statuses, shown only on the character panel: a hollow chip, the colour as its rim and its text over ' +
      "a color.hudPanel.outline body (each colour is its animation's, assets/status/)",
    written: CHIPS + ' CHIP_STYLES',
    colours: [
      ['confusion', null, '#d8b000'],
      ['daze', null, '#1f9fe7'],
      ['drowsy', null, '#e73963'],
      ['trap', null, '#adb5bd'],
    ],
  },
];
const STAT_SWATCHES = [
  ['Atk', 'Attack (ATK)', '#efcc18', '#9b8510'],
  ['Def', 'Defense (DEF); also the Kee Berry chip (KEE)', '#e86412', '#97410c'],
  ['Spa', 'Special Attack (SPA)', '#14c3f1', '#0d7f9d'],
  ['Spd', 'Special Defense (SPD); also the Maranga Berry chip (MAR)', '#4a6adf', '#304591'],
  ['Spe', 'Speed (SPE)', '#d51dad', '#8b1370'],
].map(([stat, job, fill, shade]) =>
  chip(
    'color.stat' + stat,
    job + ': a raise or drop chip (UI-PALETTES "Pokemon Stats" Base and Dark)',
    CHIPS + ' STAT_CHIP_STYLES',
    fill,
    shade
  )
);
const RAMPED = CHIPS + ' TEAM_EFFECT_STYLES (shade worked out at 55% of the fill, rampedShade)';
const EFFECT_SWATCHES = [
  chip('color.effectRegen', 'The team regenerating (REG)', RAMPED, '#5fe08a', '#347b4c'),
  chip('color.effectCrit', 'The Lansat Berry: a raised critical hit rate (LAN)', RAMPED, '#ffb347', '#8c6227'),
  {
    label: 'color.effectDrop',
    job: 'The Pinap Berry: more drops (PIN), in the shared bonus yellow',
    colours: [
      ['fill', 'color.hudBonus.fill'],
      ['shade', 'color.hudBonus.shade'],
    ],
  },
];
// Type kit: one swatch per Pokemon type (color.typeFire.*), read from tokens.js color.type.<type>.<tone>, in the
// type chart's order as tokens.js lists them
const TYPE_NAMES = [
  ...new Set(
    G.Tokens.palettes.find((palette) => palette.id === 'type').colours.map((token) => token.name.split('.')[2])
  ),
];
const TYPE_SWATCHES = TYPE_NAMES.map((type) => ({
  label: 'color.type' + type[0].toUpperCase() + type.slice(1),
  job:
    'The ' + type + ' type: base for fills, light for highlights and text over the map, dark for shades and outlines',
  colours: ramp('color.type.' + type),
}));
