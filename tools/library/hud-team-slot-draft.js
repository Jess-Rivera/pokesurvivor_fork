// tools/library/hud-team-slot-draft.js: the composite run.hud.teamSlot, one row of the run screen's team roster (lower left)
// built from the board's pieces (Jess 2026-11-19): the pixel box rimmed in the Pokemon's first type, its portrait in a
// circle, its name, its key, a benched Pokemon's status chip, the HP bar and the held item square beside it. The HP bar
// is bar.life's format (the run.hud.playerActive.bar holder: the HP tab with 3 x 5 pixel letters on an ink plate, the 5-row
// track) without the holder's checker, wings and shadow (Jess 2026-11-19): only the plate and the track. Two views:
// one slot zoomed in to inspect, and the team of six as the run screen shows it. Places are today's
// (js/ui/hud-roster-panel.js, js/ui/hud-kit-hp-bars.js), colours and fonts Unified. A plain script sharing the board's
// globals; it loads after every draft it uses (clean, squares, portraits, chips, cursor, bars, hud-area). A board
// copy: nothing here reads the game.
'use strict';
// ---------- places: today's numbers, in px from the slot's top left ----------
const TEAM_SLOT = {
  box: { artWidth: 139, artRows: 32, artPixel: 2 }, // 278 x 64 px
  face: { left: 14, top: 10, size: 44, stroke: 2 }, // the portrait circle: 40 px picture in a 2 px stroke
  name: { left: 66, top: 15 }, // Silver 20, just right of the portrait; 2 px higher than today (Jess 2026-11-19)
  key: { left: -2, top: 0 }, // Silver 20, the box's top left corner
  chips: { right: 14, top: 12 }, // a benched Pokemon's chip, top right inside the box
  // the HP bar: art pixels from the box's left and top; its right end is one pixel clear of the right rim, as today's track
  bar: { artLeft: 33, artTop: 19, rightInset: 8 },
  // the held item square, right of the box, centred on it: today's 8 px gap plus the cursor bar's 2 px gap and 6 px width
  // (Jess 2026-11-19: 2 px between the cursor and the item, the same on every row). Game: hud-roster-panel.js HELD.gap
  held: { artSize: 24, gap: 10 },
  // the berry pocket (Jess 2026-11-19): a small panel.pixel holding a 2x2 of 36 px circles, the move slot's wells; a circle
  // has a solid dark fill, an ink stroke when empty and the pocket's green when it holds a berry. Tight: 6 px between circles, the
  // inside padded 4 px past the rim.
  berries: { gapAbove: 12, columns: 2, wellSize: 36, wellGap: 6, rimPx: 12, padding: 4 },
  // a two-type Pokemon's box rim (trial, Jess 2026-11-20): the first type pure on the left half, the second pure on the
  // right, joined by a dithered band across the middle (seam, a share of the width), each rim pixel one type's ramp part whole.
  // A long dither on the 1 px top and bottom rim read as dashes (Jess 2026-11-20), so the blend is a joint, not a fade.
  rimDither: { seam: 0.25, pattern: 'shuffled', seed: 1 }, // seam: the dithered middle, a share of the box's width (Jess 2026-11-20: 25%); pattern 'shuffled' or 'ordered'
  pitch: 68, // px from one row to the next: the box and a 4 px gap
  stage: { left: 16, bottom: 42 }, // today's screen offsets of the roster
  cooldownSteps: 50, // the swap shade, whole 2% steps
};
const TEAM_SLOT_COLOURS = {
  text: greyTone('white'),
  outline: greyTone('ink'),
  cooldown: rgbaOf(greyTone('ink'), 0.6), // the swap shade, ink at 60%
  fainted: { light: greyTone('mid'), base: greyTone('slate'), dark: greyTone('raised') }, // the fainted grey ramp
};
// one sample per row of the team of six, in team order; the first one is out now
const TEAM_SLOT_SAMPLES = [
  { key: '1', dex: 25, name: 'Pikachu', type: 'electric', hp: 0.78, item: 'Leftovers', active: true },
  { key: '2', dex: 4, name: 'Charmander', type: 'fire', hp: 1, item: 'Leftovers', chip: 'PAR', cooldown: 0.6 },
  { key: '3', dex: 7, name: 'Squirtle', type: 'water', hp: 0.42, cooldown: 0.6 },
  { key: '4', dex: 1, name: 'Bulbasaur', type: 'grass', types: ['grass', 'poison'], hp: 0.12, chip: 'PSN', item: 'Leftovers', cooldown: 0.6 },
  { key: '5', dex: 94, name: 'Gengar', type: 'ghost', types: ['ghost', 'poison'], hp: 0.9, cooldown: 0.6 },
  { key: '6', dex: 130, name: 'Gyarados', type: 'water', types: ['water', 'flying'], hp: 0, fainted: true, item: 'Leftovers' },
];
// a two-type Pokemon out now, for the split active stroke trial (Jess 2026-11-20): Bulbasaur, Grass then Poison
// (Gyarados read too faintly: Water and Flying are both blues)
const TEAM_SLOT_TWO_TYPES = {
  key: '1',
  dex: 1,
  name: 'Bulbasaur',
  type: 'grass',
  types: ['grass', 'poison'],
  hp: 0.65,
  item: 'Leftovers',
  active: true,
};
// the berry pocket's purchased slots (up to four): a filled circle carries its berry, an empty one is bare
const TEAM_SLOT_BERRIES = [
  { at: '-1360px -34px' }, // Oran
  { at: '-2108px -34px' }, // Sitrus
  { at: '-1054px -34px' }, // Lum
  {},
];
const TEAM_SLOT_ITEM = { sprite: `${ROOT}assets/items/pokesprite-inventory.png`, at: '-1530px -136px' };
const teamSlotWidth = () => TEAM_SLOT.box.artWidth * TEAM_SLOT.box.artPixel;
const teamSlotHeight = () => TEAM_SLOT.box.artRows * TEAM_SLOT.box.artPixel;

// ---------- the box: panel.pixel's rows with the HP track stamped in, on the slot grid ----------
// the HP bar's art, read off the full bar so the two stay one look: the plate (the tab's ink, the letters) from
// EXP_ROWS, the track's five rows (shade, light, light, shade, shade) from its first column
const TEAM_PLATE = { left: 5, width: 9 }; // the plate's columns in EXP_ROWS: ink 5 to 13 (13 is also the track's left frame)
const teamBarTrackArt = () => TEAM_SLOT.box.artWidth - TEAM_SLOT.bar.rightInset - TEAM_SLOT.bar.artLeft + 1 - TEAM_PLATE.width - 1;
function teamBarRows() {
  const trackWidth = teamBarTrackArt(),
    ink = (width) => 'o'.repeat(width),
    rows = [ink(TEAM_PLATE.width + trackWidth + 1)];
  for (let row = EXP_BAR.hpRow; row < EXP_BAR.hpRow + EXP_BAR.hpRows; row++)
    rows.push(
      EXP_ROWS[row].slice(TEAM_PLATE.left, TEAM_PLATE.left + TEAM_PLATE.width) +
        EXP_ROWS[row][EXP_HP_TRACK.left].repeat(trackWidth) +
        'o'
    );
  rows.push(rows[0]);
  return rows;
}
let teamBoxCount = 0;
// the rim's dither (Jess 2026-11-20): the top and bottom rim's colour is a single row, and a regular one-row pattern read
// as striping, so each 8 px block gets its own shuffle of the 8 thresholds. The density still climbs evenly block by block
// (no clumps longer than a block) but the spacing is irregular, and the top and bottom rows shuffle differently. Seeded,
// so it is the same on every reload; change rimDither.seed to reroll. pattern 'ordered' brings back the regular Bayer row.
const DITHER_BLOCK = 8;
const BAYER_ROW = [0, 4, 2, 6, 1, 5, 3, 7];
/** A 32-bit integer hash of whole numbers (deterministic, for the seeded shuffle). */
const ditherHash = (...numbers) => {
  let hash = 0x9e3779b9;
  for (const number of numbers) {
    hash = Math.imul(hash ^ number, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
  }
  return hash >>> 0;
};
/** One block's thresholds in a seeded shuffled order (Fisher-Yates). */
function ditherBlockOrder(row, block) {
  const order = Array.from({ length: DITHER_BLOCK }, (_, index) => index);
  for (let index = DITHER_BLOCK - 1; index > 0; index--) {
    const swap = ditherHash(TEAM_SLOT.rimDither.seed, row, block, index) % (index + 1);
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}
const ditherThreshold = (x, row) =>
  ((TEAM_SLOT.rimDither.pattern === 'ordered'
    ? BAYER_ROW[x % DITHER_BLOCK]
    : ditherBlockOrder(row, Math.floor(x / DITHER_BLOCK))[x % DITHER_BLOCK]) +
    0.5) /
  DITHER_BLOCK;
/** panel.pixel as an SVG string (the roster box's size by default): the rim ramp on the rim letters, the slot grid (panel.slanted's) on the body.
 *  rimRight (a second ramp) dithers the rim left to right from rim to rimRight, for a two-type Pokemon. */
function teamBoxSvg(rim, artWidth = TEAM_SLOT.box.artWidth, artRows = TEAM_SLOT.box.artRows, rimRight) {
  const { artPixel } = TEAM_SLOT.box,
    gridId = 'board-team-grid-' + ++teamBoxCount,
    seam = Math.round(TEAM_SLOT.rimDither.seam * artWidth), // the dithered middle, in whole art px
    parts = { D: 'dark', B: 'base', L: 'light' },
    blendAt = (x) => Math.min(1, Math.max(0, (x - (artWidth - seam) / 2 + 0.5) / seam)), // 0 left of the seam, 1 right of it
    fillAt = (letter, x, row) => {
      if (letter === ' ') return null;
      if (letter === 'o') return TEAM_SLOT_COLOURS.outline;
      if (letter === 'G') return `url(#${gridId})`;
      const ramp = rimRight && blendAt(x) > ditherThreshold(x, row) ? rimRight : rim;
      return ramp[parts[letter]];
    },
    rects = [];
  pixelPanelCopyRows(artWidth, artRows).forEach((line, row) => {
    let start = 0;
    for (let x = 1; x <= line.length; x++) {
      if (x < line.length && fillAt(line[x], x, row) === fillAt(line[start], start, row)) continue;
      const fill = fillAt(line[start], start, row);
      if (fill) rects.push(`<rect x="${start}" y="${row}" width="${x - start}" height="1" fill="${fill}" />`);
      start = x;
    }
  });
  return `<svg width="${artWidth * artPixel}" height="${artRows * artPixel}" viewBox="0 0 ${artWidth} ${artRows}"
    shape-rendering="crispEdges" style="display:block;position:absolute;left:0;top:0">
    <defs><pattern id="${gridId}" width="${SLANTED_GRID.tile}" height="${SLANTED_GRID.tile}" patternUnits="userSpaceOnUse">
      <rect width="${SLANTED_GRID.tile}" height="${SLANTED_GRID.tile}" fill="${SLANTED_COLOURS.gridLine}" />
      <rect width="${SLANTED_GRID.square}" height="${SLANTED_GRID.square}" fill="${SLANTED_COLOURS.gridSquare}" />
    </pattern></defs>${rects.join('')}</svg>`;
}

// ---------- the pieces ----------
const teamText = (text, style, extra = '') =>
  `<div class="lib-area-text lib-team-text${extra}" style="${style};--area-size:20px;--area-font:${AREA_FONTS.silver};
    --area-pixel:2px;--area-outline:${TEAM_SLOT_COLOURS.outline};color:${TEAM_SLOT_COLOURS.text}">${esc(text)}</div>`;
/** The HP fill's width in px: whole art pixels of the track, at least one while alive, none once fainted. */
const teamFillPixels = (fraction) =>
  (fraction > 0 ? Math.max(1, Math.round(Math.min(1, fraction) * teamBarTrackArt())) : 0) * TEAM_SLOT.box.artPixel;
function teamSlotBody(sample) {
  const { box, face, name, key, chips, bar } = TEAM_SLOT,
    px = box.artPixel,
    width = teamSlotWidth(),
    height = teamSlotHeight(),
    rim = sample.fainted ? TEAM_SLOT_COLOURS.fainted : typeRamp(sample.type),
    band = BAR_BANDS[bandOf(sample.hp)],
    portrait = { src: `${PORTRAIT_ART}${sample.dex}/Portrait.png` },
    cooldown = sample.cooldown
      ? `<div class="lib-team-cooldown" style="clip-path:${teamBoxClip()}"><div style="background:${TEAM_SLOT_COLOURS.cooldown};
          transform:scaleX(${sample.cooldown})"></div></div>`
      : '';
  const rimRight = !sample.fainted && sample.types && sample.types.length === 2 ? typeRamp(sample.types[1]) : undefined;
  return `${teamBoxSvg(rim, undefined, undefined, rimRight)}
    <div class="lib-team-bar" style="left:${bar.artLeft * px}px;top:${bar.artTop * px}px">${expShapeSvg(teamBarRows())}</div>
    <div class="lib-team-fill" style="left:${(bar.artLeft + TEAM_PLATE.width) * px}px;top:${(bar.artTop + 1) * px}px;
      width:${teamFillPixels(sample.hp)}px;height:${EXP_BAR.hpRows * px}px;background:${expHpStripes(band.fill, band.shade)}"></div>
    <div class="lib-team-face" style="left:${face.left}px;top:${face.top}px">${portraitFace({
      size: face.size,
      stroke: face.stroke,
      sample: portrait,
      rim: sample.active ? typeRamp(sample.type).base : undefined,
      fainted: sample.fainted,
    })}</div>
    ${teamText(sample.name, `left:${name.left}px;top:${name.top}px`, sample.fainted ? ' is-fainted' : '')}
    ${sample.chip ? `<div class="lib-team-chip" style="right:${chips.right}px;top:${chips.top}px">${chipHtml(chipByLabel(sample.chip))}</div>` : ''}
    ${cooldown}
    ${teamText(sample.key, `left:${key.left}px;top:${key.top}px`)}
    ${sample.active ? `<span class="lib-cursor-bar" style="left:calc(100% + ${CURSOR.gap}px);top:0;height:100%"></span>` : ''}`;
}
/** The swap shade's clip: the box's outline, the corners' 45 degree steps without the bumps (hud-roster-panel.js). */
function teamBoxClip() {
  const px = TEAM_SLOT.box.artPixel,
    w = teamSlotWidth(),
    h = teamSlotHeight(),
    top = 2 * px,
    side = 6 * px,
    inset = 4 * px;
  return `polygon(${inset}px ${top}px, ${w - inset}px ${top}px, ${w}px ${side}px, ${w}px ${h - side}px, ${w - inset}px ${h - top}px, ${inset}px ${h - top}px, 0 ${h - side}px, 0 ${side}px)`;
}
function teamHeld(sample, x, bottom) {
  const { held } = TEAM_SLOT,
    size = held.artSize * SQUARE_ART_PIXEL,
    filled = !!sample.item;
  return `<div class="lib-area-piece" style="left:${x}px;bottom:${bottom + (teamSlotHeight() - size) / 2}px;
    width:${size}px;height:${size}px">${squareSvg(held.artSize, filled)}${
      filled
        ? `<div class="lib-area-item-icon" style="left:${(size - 32) / 2}px;top:${(size - 32) / 2}px;
            background-image:url('${TEAM_SLOT_ITEM.sprite}');background-position:${TEAM_SLOT_ITEM.at}"></div>`
        : ''
    }</div>`;
}
/** One row at (x, bottom) on a stage: its box with everything inside, and the held item square beside it. */
function teamSlotRow(sample, x, bottom) {
  return `<div class="lib-area-piece lib-team-row${sample.fainted ? ' is-fainted' : ''}" style="left:${x}px;bottom:${bottom}px;
    width:${teamSlotWidth()}px;height:${teamSlotHeight()}px;${cursorStyle()}">${teamSlotBody(sample)}</div>
    ${teamHeld(sample, x + teamSlotWidth() + TEAM_SLOT.held.gap, bottom)}`;
}

// ---------- view 1: two slots, zoomed: the one out now (cursor, no chips) and a benched one (chip) ----------
const TEAM_ZOOM = { scale: 3, pad: 12, rowGap: 12 };
function teamZoomHtml(sample, id) {
  const width = teamSlotWidth() + TEAM_SLOT.held.gap + TEAM_SLOT.held.artSize * SQUARE_ART_PIXEL + 2 * TEAM_ZOOM.pad,
    height = teamSlotHeight() + 2 * TEAM_ZOOM.pad;
  return `<div style="width:${width * TEAM_ZOOM.scale}px;height:${height * TEAM_ZOOM.scale}px">
    <div class="lib-area" data-state="run.hud.teamSlot:${id}" style="width:${width}px;height:${height}px;
      background:${AREA_COLOURS.stage};transform:scale(${TEAM_ZOOM.scale});transform-origin:0 0">
      ${teamSlotRow(sample, TEAM_ZOOM.pad, TEAM_ZOOM.pad)}</div></div>`;
}

// ---------- view 2: the lower left of the run screen: the team of six and the berry pocket, two prototypes ----------
// color.pocketBerries, read from the canon pocket swatches (reference swatches, so not in the Unified colour lookup)
const berryRamp = () => {
  const swatch = POCKET_SWATCHES.find((entry) => entry.label === 'color.pocketBerries');
  return Object.fromEntries(swatch.colours.map(([part, , hex]) => [part, hex.toLowerCase()]));
};
const teamBerryIcon = (berry, size) =>
  `<div class="lib-area-item-icon" style="left:${(size - 32) / 2}px;top:${(size - 32) / 2}px;
    background-image:url('${TEAM_SLOT_ITEM.sprite}');background-position:${berry.at}"></div>`;
/** A panel.pixel in the berry pocket's ramp, sized to hold contentWidth x contentHeight px; where the content starts. */
function teamPocketPanel(contentWidth, contentHeight) {
  const { rimPx, padding } = TEAM_SLOT.berries,
    artPixel = TEAM_SLOT.box.artPixel,
    evenArt = (px) => 2 * Math.ceil(Math.ceil(px / artPixel) / 2), // art pixels, rounded up to an even number
    artWidth = evenArt(contentWidth + 2 * (rimPx + padding)),
    artRows = evenArt(contentHeight + 2 * (rimPx + padding)),
    width = artWidth * artPixel,
    height = artRows * artPixel;
  return {
    width,
    height,
    offsetX: (width - contentWidth) / 2,
    offsetY: (height - contentHeight) / 2,
    svg: teamBoxSvg(berryRamp(), artWidth, artRows),
  };
}
/** The berry pocket: a panel.pixel in the berries ramp holding a 2x2 of circles, as the move slot's wells hold moves. */
function teamPocket(left, bottom) {
  const { wellSize, wellGap, columns } = TEAM_SLOT.berries,
    rows = Math.ceil(TEAM_SLOT_BERRIES.length / columns),
    ramp = berryRamp(),
    panel = teamPocketPanel(columns * wellSize + (columns - 1) * wellGap, rows * wellSize + (rows - 1) * wellGap),
    wells = TEAM_SLOT_BERRIES.map((berry, index) => {
      const x = panel.offsetX + (index % columns) * (wellSize + wellGap),
        y = panel.offsetY + Math.floor(index / columns) * (wellSize + wellGap),
        filled = !!berry.at;
      return `<div class="lib-area-well lib-team-well" style="left:${x}px;top:${y}px;width:${wellSize}px;height:${wellSize}px;
        --well-fill:${AREA_COLOURS.wellEmpty};--well-ring:${filled ? ramp.base : AREA_COLOURS.outline}">${filled ? teamBerryIcon(berry, wellSize) : ''}</div>`;
    }).join('');
  return {
    height: panel.height,
    html: `<div class="lib-area-piece" style="left:${left}px;bottom:${bottom}px;width:${panel.width}px;height:${panel.height}px">
      ${panel.svg}${wells}</div>`,
  };
}
function teamAreaHtml() {
  const count = TEAM_SLOT_SAMPLES.length,
    { left, bottom } = TEAM_SLOT.stage,
    width = left + teamSlotWidth() + TEAM_SLOT.held.gap + TEAM_SLOT.held.artSize * SQUARE_ART_PIXEL + 40,
    pocketBottom = bottom + count * TEAM_SLOT.pitch - 4 + TEAM_SLOT.berries.gapAbove, // above the roster, as today
    pocket = teamPocket(left, pocketBottom);
  return `<div class="lib-area" data-state="run.hud.teamSlot:six" style="width:${width}px;height:${pocketBottom + pocket.height + 16}px;
    background:${AREA_COLOURS.stage}">
    ${TEAM_SLOT_SAMPLES.map((sample, index) => teamSlotRow(sample, left, bottom + (count - 1 - index) * TEAM_SLOT.pitch)).join('')}
    ${pocket.html}
  </div>`;
}

function teamSlotSection() {
  const factPieces = `${nameButton('panel.pixel')} in the first type’s ramp (fainted: the grey ramp), the slot grid for the
    body, ${nameButton('portrait.round')} at 44 px, ${nameButton('chip.status')} at 1 px, ${nameButton('square.item')}
    at 48 px, ${nameButton('cursor.bar')} on the active row`;
  return `<section class="lib-story" data-draft="run.hud.teamSlot">
    <h3>${nameButton('run.hud.teamSlot')} ${draftTag('composite: one row of the team roster (a board copy)')}</h3>
    <h4>The active slot, zoomed ${TEAM_ZOOM.scale}x: the cursor bar sits ${CURSOR.gap} px off the box, the item square ${TEAM_SLOT.held.gap} px</h4>
    <div class="lib-area-scroll">${teamZoomHtml({ ...TEAM_SLOT_SAMPLES[0] }, 'zoomedActive')}</div>
    <h4>Trial: two types out now, zoomed ${TEAM_ZOOM.scale}x: ${TEAM_SLOT_TWO_TYPES.name}, the stroke the first type only, the rim ${capitalised(TEAM_SLOT_TWO_TYPES.types[0])} on the left, ${capitalised(TEAM_SLOT_TWO_TYPES.types[1])} on the right, the middle ${TEAM_SLOT.rimDither.seam * 100}% dithered</h4>
    <div class="lib-area-scroll">${teamZoomHtml({ ...TEAM_SLOT_TWO_TYPES }, 'zoomedActiveTwoTypes')}</div>
    <h4>A benched slot, zoomed ${TEAM_ZOOM.scale}x (a status chip)</h4>
    <div class="lib-area-scroll">${teamZoomHtml({ ...TEAM_SLOT_SAMPLES[1], cooldown: 0, chip: 'PAR' }, 'zoomedBenched')}</div>
    <h4>The lower left of the run screen at 1x: the team of six and the berry pocket above it</h4>
    <p class="lib-note">Row 1 is out now (the cursor bar), rows 2, 4 and 5 are under the swap cooldown shade, row 4 is on low HP
      with a chip, row 6 has fainted. A team of one shows no roster.</p>
    <div class="lib-area-scroll">${teamAreaHtml()}</div>
    <dl class="lib-facts">
      <dt>Pieces</dt><dd>${factPieces}</dd>
      <dt>Fonts</dt><dd>${nameButton('font.silver')}<span>the name and the key at 20 px, the chip at 10 px</span></dd>
      <dt>Places</dt><dd>Today’s numbers from js/ui/hud-roster-panel.js and js/ui/hud-kit-hp-bars.js: a 278 x 64 px box, the
        portrait at (14, 10), the name at (66, 15), 2 px higher than today’s 17, the chip 14 px in from the right and 12 px down, the HP track along the
        bottom right of the portrait, the item square 10 px right of the box (8 today, plus the cursor’s 2 px gap), rows 68 px apart, the lowest 42 px up</dd>
      <dt>HP bar</dt><dd>${nameButton('bar.life')}’s format without the holder: the HP tab (3 x 5 pixel letters on an ink
        plate) and the 5-row track, no checker, wings or shadow. Green, yellow and red bands as the bar</dd>
      <dt>Berry pocket</dt><dd>${nameButton('panel.pixel.rest')} in the berries ramp (${nameButton('color.pocketBerries.light')},
        ${nameButton('color.pocketBerries.base')}, ${nameButton('color.pocketBerries.dark')}), the slot grid for the body,
        ${TEAM_SLOT.berries.gapAbove} px above the roster, only the purchased slots (three filled, one empty), no names.
        A 2x2 of ${TEAM_SLOT.berries.wellSize} px circles as the move slot’s wells, ${TEAM_SLOT.berries.wellGap} px apart, the inside
        padded ${TEAM_SLOT.berries.padding} px past the rim. A solid dark fill (grey.panel, the move slot’s empty well) whether empty or not; an empty circle has the ink stroke, one holding a berry the
        stroke in ${nameButton('color.pocketBerries.base')}</dd>
      <dt>Two types (trial)</dt><dd>The active stroke is the first type only. The box rim is the first type's ramp on the
        left half and the second's on the right, joined by a dithered band across the middle ${TEAM_SLOT.rimDither.seam * 100}% of the width on
        the top and bottom rim (shuffled, seeded). Every rim pixel is one type's light, base or dark whole, never a mix.
        A long dither on the 1 px rim read as dashes, so the blend is a short joint. Every two-type slot, not only the active
        one; fainted stays grey. Decision 2026-11-20-155-two-type-team-slot-rim-dithered-middle-band</dd>
      <dt>Not shown</dt><dd>The weather and buff chips to the right of the roster</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/hud-team-slot-draft.js; changing one changes only the board</dd>
    </dl></section>`;
}
const TEAM_SLOT_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note: 'Today’s run HUD roster row, rebuilt from the board’s Unified pieces.',
    draw: teamSlotSection,
  },
];
const teamSlotPage = (tab) => tabbedPage('run.hud.teamSlot', TEAM_SLOT_TABS, tab);
