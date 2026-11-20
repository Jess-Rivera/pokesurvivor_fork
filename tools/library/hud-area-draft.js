// tools/library/hud-area-draft.js: the composite run.hud.playerActive.area, the run screen's bottom centre built from the
// board's pieces (Jess 2026-11-19): the four move slots (panel.slanted and their wells), the portrait, Lv, the bar
// (run.hud.playerActive.bar), the bad and good chip bands, the held item (square.item) and Silver. Places are today's
// (js/ui/hud-player-panel.js), colours and fonts Unified. A plain script sharing the board's globals; it loads after
// every draft it uses (clean, squares, portraits, chips, hud-exp). A board copy: nothing here reads the game.
'use strict';
// ---------- places: today's numbers (hud-player-panel.js), x from the screen's centre line, y up from its bottom ----------
const AREA = {
  stage: { width: 900, height: 300 }, // px, the board's crop of the screen's bottom centre
  slots: { x: -216, y: 36, columnGap: 6, rowGap: 4 }, // today's GRID; the bar lines up with its left and right edges
  // one gap stacks the column (Jess 2026-11-19): slots, bar (its lowest pixel, the EXP plate), the bad band, the good band
  stackGap: 8,
  wells: { size: 36, top: 4, first: 47, perSlot: 4 }, // today's wells: 36 px, centres 47 px in from each end
  // the left side mirrors the right (Jess 2026-11-19): the item's gap off the slots, the stack gap upward
  portrait: { size: 88, stroke: 4 }, // 88 px, no ring (EXP is on the bar); centred on the slots' height
  level: { numberSize: 40, labelSize: 20 }, // Silver 40 and 20, as today's two sizes
  item: { x: 222, y: 74, artSize: 20, nameY: 48 }, // today's ITEM
  silver: { coinSize: 32, gap: 6 }, // over the portrait, its right edge on the portrait's
  // the chip bands (#76): two lines each, filling the lower line first; 1 px chips (40 x 17), 6 to a line, from the
  // slots' left edge like the bar
  chips: { lineGap: 6, perLine: 6 },
};
const AREA_FONTS = {
  silver: "'Silver 10px'", // font.silver: Lv, the slot keys, the item name (the Pokemon tier)
  counter: "'HudDigits'", // font.boldPixels: the Silver count (a world number; fonts.js says 32 px)
};
const AREA_COLOURS = {
  stage: greyTone('raised'), // the board's stand-in for the map under the HUD
  text: greyTone('white'),
  outline: greyTone('ink'),
  lv: '#FAC000', // color.type.electric.base, Lv's yellow (as the bar's middle band)
  wellEmpty: SLANTED_COLOURS.body, // grey.panel
  cooldown: rgbaOf(greyTone('ink'), 0.6), // today's clock-wipe shade, ink at 60%
};
const typeRamp = (type) =>
  Object.fromEntries(['light', 'base', 'dark'].map((part) => [part, valueOf([part, `color.type.${type}.${part}`])]));
const typeGlyph = (type) => `${ROOT}assets/icons/types/${capitalised(type)}_icon.png`;

// ---------- the sample: Pikachu, three moves and a bond ----------
const AREA_SAMPLE = {
  portrait: PORTRAIT_SAMPLES.pikachu,
  portraitType: 'electric', // active: the rim takes the Pokemon's own type base
  level: 42,
  hp: 87,
  exp: 0.4,
  silver: '1250',
  item: { name: 'Leftovers', sprite: `${ROOT}assets/items/pokesprite-inventory.png`, at: '-1530px -136px' },
  // in today's order: I and J on the top row, K and L under them
  slots: [
    { key: 'I', moves: [{ type: 'electric' }] },
    { key: 'J', moves: [{ type: 'normal', cooldown: 0.6 }] },
    { key: 'K', moves: [{ type: 'electric' }, { type: 'steel', cooldown: 0.3 }, { type: 'normal' }] }, // a bond
    { key: 'L', moves: [] },
  ],
  bad: ['PAR', 'PSN', 'CNF', 'ATK', 'SPE'], // statuses, then stat drops
  good: ['DEF', 'SPA', 'REG', 'LAN', 'OCC'], // stat raises, then the team's timed effects
};
const chipByLabel = (label) =>
  CHIP_GROUPS.flatMap((group) => group.chips).find((chip) => chip.label === label && !chip.note) ||
  CHIP_GROUPS.flatMap((group) => group.chips).find((chip) => chip.label === label);

// ---------- the stack: slots, then the bar, then the bands, each stackGap over the one under it ----------
function areaStack() {
  const slotHeight = SLANTED_SLOT.artRows * SLANTED_SLOT.artPixel,
    slotsTop = AREA.slots.y + 2 * slotHeight + AREA.slots.rowGap,
    barY = slotsTop + AREA.stackGap,
    firstInkRow = EXP_ROWS.findIndex((row) => /[^.]/.test(row)), // the bar's top rows can be empty
    barTop = barY + (EXP_BAR.artRows - firstInkRow) * EXP_PX,
    chipLine = CHIP_SCALES.one.rows * CHIP_SCALES.one.artPixel,
    bandHeight = 2 * chipLine + AREA.chips.lineGap,
    badY = barTop + AREA.stackGap;
  return { barY, barTop, badY, goodY: badY + bandHeight + AREA.stackGap };
}

// ---------- the left side: the same gap off the slots as the held item on the right ----------
function areaLeftSide() {
  const slotWidth = SLANTED_SLOT.artWidth * SLANTED_SLOT.artPixel,
    slotHeight = SLANTED_SLOT.artRows * SLANTED_SLOT.artPixel,
    slotsRight = AREA.slots.x + 2 * slotWidth + AREA.slots.columnGap,
    sideGap = AREA.item.x - slotsRight, // 12 px, the held item's
    p = AREA.portrait,
    portraitX = AREA.slots.x - sideGap - p.size,
    portraitY = AREA.slots.y + (2 * slotHeight + AREA.slots.rowGap - p.size) / 2;
  return {
    portraitX,
    portraitY,
    levelRight: portraitX - sideGap,
    labelY: AREA.slots.y + AREA.level.numberSize + AREA.stackGap,
    silverRight: portraitX + p.size,
    silverY: portraitY + p.size + AREA.stackGap,
  };
}

// ---------- pieces ----------
const areaPlace = (x, y) => `left:${AREA.stage.width / 2 + x}px;bottom:${y}px`;
const areaPlaceRight = (x, y) => `right:${AREA.stage.width / 2 - x}px;bottom:${y}px`;
const areaText = (text, size, font, style, colour = AREA_COLOURS.text) =>
  `<div class="lib-area-text" style="${style};--area-size:${size}px;--area-font:${font};--area-pixel:${size / 10}px;
    --area-outline:${AREA_COLOURS.outline};color:${colour}">${esc(text)}</div>`;

function areaWell(move, index) {
  const { size, top, first } = AREA.wells,
    last = SLANTED_SLOT.artWidth * SLANTED_SLOT.artPixel - first,
    centre = first + ((last - first) * index) / (AREA.wells.perSlot - 1);
  const inner = move
    ? `<img src="${typeGlyph(move.type)}" alt="" />${
        move.cooldown
          ? `<div class="lib-area-wipe" style="background:conic-gradient(transparent 0 ${Math.round(
              (1 - move.cooldown) * 360
            )}deg, ${AREA_COLOURS.cooldown} 0 360deg)"></div>`
          : ''
      }`
    : '';
  return `<div class="lib-area-well" style="left:${centre - size / 2}px;top:${top}px;width:${size}px;height:${size}px;
    --well-fill:${move ? typeRamp(move.type).base : AREA_COLOURS.wellEmpty};--well-ring:${AREA_COLOURS.outline}">${inner}</div>`;
}
function areaSlot(slot, index) {
  const { artWidth, artRows, artPixel } = SLANTED_SLOT,
    width = artWidth * artPixel,
    height = artRows * artPixel,
    column = index % 2,
    row = Math.floor(index / 2),
    x = AREA.slots.x + column * (width + AREA.slots.columnGap),
    y = AREA.slots.y + (row === 0 ? height + AREA.slots.rowGap : 0),
    count = slot.moves.length,
    rim = count === 0 ? 'empty' : count === 1 ? typeRamp(slot.moves[0].type) : 'bond',
    wells = Array.from({ length: AREA.wells.perSlot }, (_, well) => areaWell(slot.moves[well], well)).join('');
  return `<div class="lib-area-piece" style="${areaPlace(x, y)};width:${width}px;height:${height}px">
    ${slantedSvg({ id: 'area-' + index, rim, grid: count > 0 })}${wells}
    ${areaText(slot.key, 20, AREA_FONTS.silver, 'left:-2px;top:4px')}</div>`;
}
function areaChipBand(labels, y) {
  const x = AREA.slots.x;
  const width = CHIP_SCALES.one.widths.tag,
    lineWidth = AREA.chips.perLine * width + (AREA.chips.perLine - 1) * AREA.chips.lineGap;
  return `<div class="lib-area-piece lib-area-band" style="${areaPlace(x, y)};width:${lineWidth}px;
    gap:${AREA.chips.lineGap}px">${labels.map((label) => chipHtml(chipByLabel(label))).join('')}</div>`;
}
function areaHtml() {
  const s = AREA_SAMPLE,
    p = AREA.portrait,
    stack = areaStack(),
    itemPx = AREA.item.artSize * SQUARE_ART_PIXEL,
    silver = AREA.silver,
    left = areaLeftSide();
  return `<div class="lib-area" data-state="run.hud.playerActive.area:sample" style="width:${AREA.stage.width}px;
      height:${AREA.stage.height}px;background:${AREA_COLOURS.stage}">
    ${s.slots.map(areaSlot).join('')}
    <div class="lib-area-piece" style="${areaPlace(AREA.slots.x, stack.barY)}">${expSetHtml(s.hp, EXP_SET.max, s.exp)}</div>
    ${areaChipBand(s.bad, stack.badY)}
    ${areaChipBand(s.good, stack.goodY)}
    <div class="lib-area-piece" style="${areaPlace(left.portraitX, left.portraitY)}">
      ${portraitFace({ size: p.size, stroke: p.stroke, sample: s.portrait, rim: typeRamp(s.portraitType).base })}</div>
    ${areaText('Lv.', AREA.level.labelSize, AREA_FONTS.silver, areaPlaceRight(left.levelRight, left.labelY), AREA_COLOURS.lv)}
    ${areaText(String(s.level), AREA.level.numberSize, AREA_FONTS.silver, areaPlaceRight(left.levelRight, AREA.slots.y))}
    <div class="lib-area-piece" style="${areaPlace(AREA.item.x, AREA.item.y)};width:${itemPx}px;height:${itemPx}px">
      ${squareSvg(AREA.item.artSize, true)}
      <div class="lib-area-item-icon" style="background-image:url('${s.item.sprite}');background-position:${s.item.at}"></div></div>
    ${areaText(s.item.name, 20, AREA_FONTS.silver, areaPlace(AREA.item.x, AREA.item.nameY))}
    <div class="lib-area-piece lib-area-coin" style="${areaPlace(left.silverRight - silver.coinSize, left.silverY)};
      background-image:url('${ROOT}assets/items/pickups/silver16.png')"></div>
    ${areaText(s.silver, 32, AREA_FONTS.counter, areaPlaceRight(left.silverRight - silver.coinSize - silver.gap, left.silverY))}
  </div>`;
}

function areaSection() {
  return `<section class="lib-story" data-draft="run.hud.playerActive.area">
    <h3>${nameButton('run.hud.playerActive.area')} ${draftTag('composite: the run screen’s bottom centre (a board copy)')}</h3>
    <div class="lib-area-scroll">${areaHtml()}</div>
    <dl class="lib-facts">
      <dt>Pieces</dt><dd>${nameButton('panel.slanted')} with four wells per slot (one move: its type’s ramp; a
        bond: pink; empty: the disabled rim, flat body), ${nameButton('run.hud.playerActive.bar')},
        ${nameButton('chip.status')} at 1 px in two bands (bad under good), ${nameButton('square.item')} with the item
        name, the portrait (88 px, no ring, the active rim in its type’s base), Lv and Silver</dd>
      <dt>Fonts</dt><dd>${nameButton('font.silver')}<span>Lv. at 20 px (Lv yellow, ${nameButton('color.type.electric.base')}),
        the level at 40 px, the slot keys and the item name at 20 px</span>${nameButton('font.boldPixels')}<span>the
        Silver count at 32 px</span></dd>
      <dt>Places</dt><dd>Today’s numbers from js/ui/hud-player-panel.js. Moved: the bar and both chip bands now line up with the
        slots’ left edge (the bar with both edges), and the column stacks on one ${AREA.stackGap} px gap: slots, bar
        (its lowest pixel), bad band, good band. The portrait keeps its centre at 88 px</dd>
      <dt>Not shown</dt><dd>The Shake Off prompt, the bond count under Lv, the run timer, the active slot’s cursor,
        the move family badges</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/hud-area-draft.js; changing one changes only the board</dd>
    </dl></section>`;
}
const AREA_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note: 'Today’s run HUD bottom centre, rebuilt from the board’s Unified pieces.',
    draw: areaSection,
  },
];
const areaPage = (tab) => tabbedPage('run.hud.playerActive.area', AREA_TABS, tab);
