// tools/library/hud-area-draft.js: the composite run.hud.playerActive.area, the run screen's bottom centre built from the
// board's pieces (Jess 2026-11-19): the four move slots (panel.slanted and their wells), the portrait, Lv, the bar
// (run.hud.playerActive.bar), the bad and good chip bands, the held item (square.item) and Silver; and (Jess
// 2026-11-20) the slots' inside detail (the active slot's cursor, the family badges, the cast flash), the bond
// count under Lv, the Shake Off prompt and the run timer, with a zoomed view of two slots. Places are today's
// (js/ui/hud-player-panel.js), colours and fonts Unified. A plain script sharing the board's globals; it loads after
// every draft it uses (clean, squares, cursor, bars, portraits, chips, hud-exp). A board copy: nothing here reads the
// game.
'use strict';
// ---------- places: today's numbers (hud-player-panel.js), x from the screen's centre line, y up from its bottom ----------
const AREA = {
  stage: { width: 900, height: 300 }, // px, the board's crop of the screen's bottom centre
  slots: { x: -216, y: 36, columnGap: 6, rowGap: 4 }, // today's GRID; the bar lines up with its left and right edges
  // one gap stacks the column (Jess 2026-11-19): slots, bar (its lowest pixel, the EXP plate), the bad band, the good band
  stackGap: 8,
  // the wells, centres 47 px in from each end (today's). 32 px at 6 px down, 2 px clear of the slot's dark bands above
  // and below (Jess 2026-11-20); today's are 36 px at 4 px down, flush against both bands
  wells: { size: 32, top: 6, first: 47, perSlot: 4 },
  // the left side mirrors the right (Jess 2026-11-19): the item's gap off the slots, the stack gap upward
  portrait: { size: 88, stroke: 4 }, // 88 px, no ring (EXP is on the bar); centred on the slots' height
  level: { numberSize: 40, labelSize: 20 }, // Silver 40 and 20, as today's two sizes
  item: { x: 222, y: 74, artSize: 20, nameY: 48 }, // today's ITEM
  silver: { coinSize: 32, gap: 6 }, // over the portrait, its right edge on the portrait's
  // the chip bands (#76): two lines each, filling the lower line first; 1 px chips (40 x 17), 6 to a line, from the
  // slots' left edge like the bar
  chips: { lineGap: 6, perLine: 6 },
  // the move family badge: 7 x 7 art at 2 px in the well's bottom right corner, so it stays off the slot's bottom band
  // (Jess 2026-11-20); today's hangs 2 px past the well (hud-overlay.css .hud-well-badge), onto the band
  badge: { artSize: 7, artPixel: 2, overhang: 0 },
  castFlash: 0.55, // the cast flash's peak opacity (white), fading over 180 ms in the game; shown at its peak
  bond: { icon: 24, gap: 4 }, // the bond icon (12 x 12 art at 2 px) and its count, under the Lv number
  // the Shake Off prompt: the B2 "FIGHT!" badge, 24 art rows at 2 px, its pointed ends 13 art px each, the text padded
  // 1 art px past them; the draining bar 2 art rows high, 1 off the bottom, 11 in from each end (today's PROMPT_TIMER)
  prompt: {
    artRows: 24,
    artPixel: 2,
    endArt: 13,
    textPad: 2,
    textSize: 20,
    timer: { bottomArt: 1, heightArt: 2, insetArt: 11 },
  },
  timer: { y: 10, size: 16, opacity: 0.45 }, // the run timer, dim, centred under the slots (today's TIMER)
  zoom: { scale: 3, pad: 12 }, // the zoomed slots
  // the slots the keys are not on are dimmed, darkened rather than see-through so the map does not show through
  // (Jess 2026-11-20; a dark-fill body on the active slot was tried first and dropped)
  inactiveBrightness: 0.5,
};
const AREA_FONTS = {
  silver: "'Silver 10px'", // font.silver: Lv, the slot keys, the item name (the Pokemon tier)
  // font.boldPixels: the Silver count (a world number; fonts.js says 32 px) and the run timer (16)
  counter: "'HudDigits'",
  meta: "'HudModule'", // font.michroma: the Shake Off prompt (the game talking, Jess 2026-11-20)
  world: "'Monogram 16px'", // font.monogram: world words (run.hud.runInfo's labels and weather, hud-top-draft.js)
};
const AREA_COLOURS = {
  stage: greyTone('raised'), // the board's stand-in for the map under the HUD
  text: greyTone('white'),
  outline: greyTone('ink'),
  lv: '#FAC000', // color.type.electric.base, Lv's yellow (as the bar's middle band)
  wellEmpty: SLANTED_COLOURS.body, // grey.panel
  cooldown: rgbaOf(greyTone('ink'), 0.6), // today's clock-wipe shade, ink at 60%
  flash: greyTone('white'), // the cast flash
  badgeSquare: '#2b3454', // today's badge square; no Unified tone yet
  badgeGlyph: unifiedTone(UNIFIED_YELLOW, 'base'), // today's #ffd23f, the cursor's yellow
  promptTimer: BAR_COLOURS.timer, // bar.timer's white
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
  // family: the move's family badge (icons.js KIND_GLYPH); flash: just cast; active: the slot the keys use now
  slots: [
    { key: 'I', moves: [{ type: 'electric', family: 'projectile' }] },
    { key: 'J', active: true, moves: [{ type: 'normal', family: 'melee', cooldown: 0.6 }] },
    {
      key: 'K',
      moves: [
        { type: 'electric', family: 'beam', flash: true },
        { type: 'steel', family: 'orbit', cooldown: 0.3 },
        { type: 'normal', family: 'nova' },
      ],
    }, // a bond
    { key: 'L', moves: [] },
  ],
  bonds: 2, // two bonds, so the count shows (one bond: the icon alone; two or more add ×N)
  prompt: { text: 'Press H to Shake Off!', timer: 0.6 },
  timer: '12:34',
  bad: ['PAR', 'PSN', 'CNF', 'ATK', 'SPE'], // statuses, then stat drops
  good: ['DEF', 'SPA', 'REG', 'LAN', 'OCC'], // stat raises, then the team's timed effects
};
const chipByLabel = (label) =>
  CHIP_GROUPS.flatMap((group) => group.chips).find((chip) => chip.label === label && !chip.note) ||
  CHIP_GROUPS.flatMap((group) => group.chips).find((chip) => chip.label === label);

// ---------- small pixel art, board copies of js/ui/icons.js ----------
// the family glyphs the sample uses (icons.js KIND_GLYPH, 5 x 5), drawn in a 7 x 7 badge: outline, square, glyph
const AREA_BADGE_GLYPHS = {
  projectile: ['..#..', '...#.', '#####', '...#.', '..#..'],
  melee: ['....#', '...#.', '..#..', '.#...', '#....'],
  beam: ['.....', '#####', '.....', '#####', '.....'],
  orbit: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  nova: ['#.#.#', '.###.', '#####', '.###.', '#.#.#'],
};
// the bond icon (icons.js UI.bond, 12 x 12): k outline, y and w the yellow ring, p and q the pink ring
const AREA_BOND_ROWS = [
  '.kkkkk......',
  'kwyyyyk.....',
  'kykkkyk.....',
  'kyk.kyk.....',
  'kykkkyk.....',
  'kyyyyykkkkk.',
  '.kkkkkqppppk',
  '.....kpkkkpk',
  '.....kpk.kpk',
  '.....kpkkkpk',
  '.....kpppppk',
  '......kkkkk.',
];
const AREA_BOND_FILLS = {
  k: greyTone('ink'),
  y: unifiedTone(UNIFIED_YELLOW, 'base'),
  w: unifiedTone(UNIFIED_YELLOW, 'light'),
  p: pinkRamp('base'),
  q: pinkRamp('light'),
};
/** Character-map art as an SVG string: one rect per run of a letter, '.' left empty. */
function charMapSvg(rows, fills, artPixel) {
  const rects = [];
  rows.forEach((line, row) => {
    let start = 0;
    for (let x = 1; x <= line.length; x++) {
      if (x < line.length && line[x] === line[start]) continue;
      if (line[start] !== '.')
        rects.push(`<rect x="${start}" y="${row}" width="${x - start}" height="1" fill="${fills[line[start]]}" />`);
      start = x;
    }
  });
  const width = rows[0].length,
    height = rows.length;
  return `<svg width="${width * artPixel}" height="${height * artPixel}" viewBox="0 0 ${width} ${height}"
    shape-rendering="crispEdges" style="display:block;flex:none">${rects.join('')}</svg>`;
}
/** A family badge's rows: the outline ring, the square, the glyph inside. */
const badgeRows = (family) => [
  'kkkkkkk',
  ...AREA_BADGE_GLYPHS[family].map((line) => 'k' + line.replace(/\./g, 's').replace(/#/g, 'g') + 'k'),
  'kkkkkkk',
];
const badgeSvg = (family) =>
  charMapSvg(
    badgeRows(family),
    { k: AREA_COLOURS.outline, s: AREA_COLOURS.badgeSquare, g: AREA_COLOURS.badgeGlyph },
    AREA.badge.artPixel
  );

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
  const goodY = badY + bandHeight + AREA.stackGap;
  return { barY, barTop, badY, goodY, promptY: goodY + bandHeight + AREA.stackGap }; // the prompt over the good band
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
/** HUD text with its outline one font pixel out; grid is the face's font pixels per em (Silver's 10 by default;
 *  BoldPixels and monogram are 16). */
const areaText = (text, size, font, style, colour = AREA_COLOURS.text, grid = 10) =>
  `<div class="lib-area-text" style="${style};--area-size:${size}px;--area-font:${font};--area-pixel:${size / grid}px;
    --area-outline:${AREA_COLOURS.outline};color:${colour}">${esc(text)}</div>`;

function areaWell(move, index) {
  const { size, top, first } = AREA.wells,
    last = SLANTED_SLOT.artWidth * SLANTED_SLOT.artPixel - first,
    centre = first + ((last - first) * index) / (AREA.wells.perSlot - 1);
  const wipe =
      move && move.cooldown
        ? `<div class="lib-area-wipe" style="background:conic-gradient(transparent 0 ${Math.round(
            (1 - move.cooldown) * 360
          )}deg, ${AREA_COLOURS.cooldown} 0 360deg)"></div>`
        : '',
    flash =
      move && move.flash
        ? `<div class="lib-area-wipe" style="background:${AREA_COLOURS.flash};opacity:${AREA.castFlash}"></div>`
        : '',
    inner = move ? `<img src="${typeGlyph(move.type)}" alt="" />${wipe}${flash}` : '';
  return `<div class="lib-area-well" style="left:${centre - size / 2}px;top:${top}px;width:${size}px;height:${size}px;
    --well-fill:${move ? typeRamp(move.type).base : AREA_COLOURS.wellEmpty};--well-ring:${AREA_COLOURS.outline}">${inner}</div>
    ${move && move.family ? areaBadge(centre, move.family) : ''}`;
}
/** The family badge, outside the well's circle (so it is not clipped): its bottom right on the well's box corner. */
function areaBadge(centre, family) {
  const { size, top } = AREA.wells,
    badge = AREA.badge.artSize * AREA.badge.artPixel,
    left = centre + size / 2 + AREA.badge.overhang - badge,
    badgeTop = top + size + AREA.badge.overhang - badge;
  return `<div class="lib-area-badge" style="left:${left}px;top:${badgeTop}px">${badgeSvg(family)}</div>`;
}
const slotWidth = () => SLANTED_SLOT.artWidth * SLANTED_SLOT.artPixel;
const slotHeight = () => SLANTED_SLOT.artRows * SLANTED_SLOT.artPixel;
const slotsCentre = () => AREA.slots.x + slotWidth() + AREA.slots.columnGap / 2; // the four slots' centre line
/** One slot at a place (a style): panel.slanted, its wells and badges, its key. dimmed darkens the whole slot: the
 *  slots the keys are not on (Jess 2026-11-20); the cursor bar stays for menus. */
function areaSlotPiece(slot, id, place, dimmed = false) {
  const count = slot.moves.length,
    rim = count === 0 ? 'empty' : count === 1 ? typeRamp(slot.moves[0].type) : 'bond',
    wells = Array.from({ length: AREA.wells.perSlot }, (_, well) => areaWell(slot.moves[well], well)).join(''),
    dim = dimmed ? `;filter:brightness(${AREA.inactiveBrightness})` : '';
  return `<div class="lib-area-piece" style="${place};width:${slotWidth()}px;height:${slotHeight()}px${dim}">
    ${slantedSvg({ id, rim, grid: count > 0 })}${wells}
    ${areaText(slot.key, 20, AREA_FONTS.silver, 'left:-2px;top:4px')}</div>`;
}
/** A slot in the 2 x 2 grid: I and J on the top row, K and L under them. */
function areaSlot(slot, index) {
  const column = index % 2,
    row = Math.floor(index / 2),
    x = AREA.slots.x + column * (slotWidth() + AREA.slots.columnGap),
    y = AREA.slots.y + (row === 0 ? slotHeight() + AREA.slots.rowGap : 0);
  return areaSlotPiece(slot, 'area-' + index, areaPlace(x, y), !slot.active);
}
function areaChipBand(labels, y) {
  const x = AREA.slots.x;
  const width = CHIP_SCALES.one.widths.tag,
    lineWidth = AREA.chips.perLine * width + (AREA.chips.perLine - 1) * AREA.chips.lineGap;
  return `<div class="lib-area-piece lib-area-band" style="${areaPlace(x, y)};width:${lineWidth}px;
    gap:${AREA.chips.lineGap}px">${labels.map((label) => chipHtml(chipByLabel(label))).join('')}</div>`;
}
/** The bond count above Silver, right edges flush with it and the portrait, one stack gap up (Jess 2026-11-20; today
 *  it sits under the Lv number): the bond icon, and its count from two bonds up. */
function areaBond(bonds, right, y) {
  if (!bonds) return '';
  const { icon, gap } = AREA.bond,
    count = bonds > 1 ? areaText('×' + bonds, 20, AREA_FONTS.silver, 'position:relative') : '';
  // the icon in its own box: a bare svg in a piece takes the pieces' absolute art rule and the row collapses
  return `<div class="lib-area-piece lib-area-bond" style="${areaPlaceRight(right, y)};height:${icon}px;gap:${gap}px">
    <span class="lib-area-bond-icon" style="width:${icon}px;height:${icon}px">${charMapSvg(
      AREA_BOND_ROWS,
      AREA_BOND_FILLS,
      icon / AREA_BOND_ROWS.length
    )}</span>${count}</div>`;
}
/** The prompt badge's left pointed end, row by row (today's promptRow): o outline, s shade, f fill. */
function promptEndRows() {
  const { artRows, endArt } = AREA.prompt;
  return Array.from({ length: artRows }, (_, row) => {
    const left = Math.abs(2 * row - (artRows - 1)) >> 1,
      edgeRow = row === 0 || row === artRows - 1,
      shadeRow = row === 1 || row >= artRows - 4;
    return Array.from({ length: endArt }, (_, column) => {
      if (column < left) return '.';
      if (edgeRow || column === left) return 'o';
      if (shadeRow || column === left + 1) return 's';
      return 'f';
    }).join('');
  });
}
/** The badge's middle, stretched to the text: outline, shade, fill and shade rows, top to bottom. */
function promptMiddle(fill, shade) {
  const { artRows, artPixel } = AREA.prompt,
    band = (from, to, colour) => `${colour} ${from * artPixel}px ${to * artPixel}px`;
  return `linear-gradient(${[
    band(0, 1, AREA_COLOURS.outline),
    band(1, 2, shade),
    band(2, artRows - 4, fill),
    band(artRows - 4, artRows - 1, shade),
    band(artRows - 1, artRows, AREA_COLOURS.outline),
  ].join(', ')})`;
}
/** One layer of the badge (the Lv yellow, or the flash's white): both ends and the middle between them. */
function promptLayer(fill, shade, className, middleContent = '') {
  const rows = promptEndRows(),
    fills = { o: AREA_COLOURS.outline, s: shade, f: fill },
    mirrored = rows.map((line) => [...line].reverse().join(''));
  return `<div class="${className}">${charMapSvg(rows, fills, AREA.prompt.artPixel)}
    <div class="lib-area-prompt-middle" style="background:${promptMiddle(fill, shade)};
      padding:0 ${AREA.prompt.textPad}px">
      ${middleContent}</div>${charMapSvg(mirrored, fills, AREA.prompt.artPixel)}</div>`;
}
/** The Shake Off prompt over the good band, centred on the slots: the badge flashing white, the text, the draining
 *  bar. */
function areaPrompt(prompt, y) {
  const { artPixel, textSize, timer } = AREA.prompt,
    lv = typeRamp('electric'),
    text = areaText(prompt.text, textSize, AREA_FONTS.meta, 'position:relative;z-index:2'),
    inset = timer.insetArt * artPixel;
  return `<div class="lib-area-piece lib-area-prompt" style="${areaPlace(slotsCentre(), y)}">
    ${promptLayer(lv.base, lv.dark, 'lib-area-prompt-row', text)}
    ${promptLayer(greyTone('white'), lv.dark, 'lib-area-prompt-row lib-area-prompt-flash')}
    <div class="lib-area-prompt-timer" style="left:${inset}px;right:${inset}px;bottom:${timer.bottomArt * artPixel}px;
      height:${timer.heightArt * artPixel}px"><div style="background:${AREA_COLOURS.promptTimer};
      transform:scaleX(${prompt.timer})"></div></div></div>`;
}
const areaTimer = (text) =>
  areaText(
    text,
    AREA.timer.size,
    AREA_FONTS.counter,
    `${areaPlace(slotsCentre(), AREA.timer.y)};transform:translateX(-50%);opacity:${AREA.timer.opacity}`
  );
function areaHtml() {
  const s = AREA_SAMPLE,
    p = AREA.portrait,
    stack = areaStack(),
    itemPx = AREA.item.artSize * SQUARE_ART_PIXEL,
    silver = AREA.silver,
    left = areaLeftSide();
  const promptHeight = AREA.prompt.artRows * AREA.prompt.artPixel,
    height = Math.max(AREA.stage.height, stack.promptY + promptHeight + AREA.zoom.pad);
  return `<div class="lib-area" data-state="run.hud.playerActive.area:sample" style="width:${AREA.stage.width}px;
      height:${height}px;background:${AREA_COLOURS.stage}">
    ${s.slots.map(areaSlot).join('')}
    <div class="lib-area-piece" style="${areaPlace(AREA.slots.x, stack.barY)}">${expSetHtml(s.hp, EXP_SET.max, s.exp)}</div>
    ${areaChipBand(s.bad, stack.badY)}
    ${areaChipBand(s.good, stack.goodY)}
    <div class="lib-area-piece" style="${areaPlace(left.portraitX, left.portraitY)}">
      ${portraitFace({ size: p.size, stroke: p.stroke, sample: s.portrait, rim: typeRamp(s.portraitType).base })}</div>
    ${areaText('Lv.', AREA.level.labelSize, AREA_FONTS.silver, areaPlaceRight(left.levelRight, left.labelY), AREA_COLOURS.lv)}
    ${areaText(String(s.level), AREA.level.numberSize, AREA_FONTS.silver, areaPlaceRight(left.levelRight, AREA.slots.y))}
    ${areaBond(s.bonds, left.silverRight, left.silverY + silver.coinSize + AREA.stackGap)}
    ${areaPrompt(s.prompt, stack.promptY)}
    ${areaTimer(s.timer)}
    <div class="lib-area-piece" style="${areaPlace(AREA.item.x, AREA.item.y)};width:${itemPx}px;height:${itemPx}px">
      ${squareSvg(AREA.item.artSize, true)}
      <div class="lib-area-item-icon" style="background-image:url('${s.item.sprite}');background-position:${s.item.at}"></div></div>
    ${areaText(s.item.name, 20, AREA_FONTS.silver, areaPlace(AREA.item.x, AREA.item.nameY))}
    <div class="lib-area-piece lib-area-coin" style="${areaPlace(left.silverRight - silver.coinSize, left.silverY)};
      background-image:url('${ROOT}assets/items/pickups/silver16.png')"></div>
    ${areaText(s.silver, 32, AREA_FONTS.counter, areaPlaceRight(left.silverRight - silver.coinSize - silver.gap, left.silverY))}
  </div>`;
}

// ---------- the zoomed slots: the active one beside itself dimmed, and the bond's detail (every well) ---------------
function areaZoomHtml(slot, id, dimmed = false) {
  const { scale, pad } = AREA.zoom,
    width = slotWidth() + 2 * pad,
    height = slotHeight() + 2 * pad;
  return `<div style="width:${width * scale}px;height:${height * scale}px">
    <div class="lib-area" data-state="run.hud.playerActive.area:${id}" style="width:${width}px;height:${height}px;
      background:${AREA_COLOURS.stage};transform:scale(${scale});transform-origin:0 0">
      ${areaSlotPiece(slot, 'area-zoom-' + id, `left:${pad}px;bottom:${pad}px`, dimmed)}</div></div>`;
}

function areaSection() {
  return `<section class="lib-story" data-draft="run.hud.playerActive.area">
    <h3>${nameButton('run.hud.playerActive.area')} ${draftTag('composite: the run screen’s bottom centre (a board copy)')}</h3>
    <div class="lib-area-scroll">${areaHtml()}</div>
    <h4>One slot zoomed ${AREA.zoom.scale}x, active (left) and not (right, dimmed to ${AREA.inactiveBrightness * 100}%
      brightness)</h4>
    <div class="lib-area-scroll lib-area-zooms">${areaZoomHtml(AREA_SAMPLE.slots[1], 'zoomedActive')}${areaZoomHtml(
      AREA_SAMPLE.slots[1],
      'zoomedInactive',
      true
    )}</div>
    <h4>A bond, zoomed ${AREA.zoom.scale}x and drawn undimmed for the detail: a badge on every move, the first just
      cast (the flash at its peak), the second cooling down</h4>
    <div class="lib-area-scroll">${areaZoomHtml(AREA_SAMPLE.slots[2], 'zoomedBond')}</div>
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
      <dt>In the slots</dt><dd>The wells ${AREA.wells.size} px, ${AREA.wells.top} px down, so 2 px clear of the slot’s
        dark bands above and below (today 36 px, flush with both). The type glyph inside the well’s 2 px ring; the
        family badge (7 x 7 art at 2 px, 14 px) in the well’s bottom right corner, clear of the bottom band (today it
        hangs 2 px past) (square: today’s #2b3454, no Unified tone yet; glyph
        ${nameButton('color.yellow.base')}); the cast flash, white at ${AREA.castFlash * 100}% fading over 180 ms
        (shown at its peak)</dd>
      <dt>Active slot</dt><dd>The slot the keys use now stays as it is; the other three are dimmed to
        ${AREA.inactiveBrightness * 100}% brightness, darkened rather than see-through so the map never shows through
        (Jess 2026-11-20). Active is a state of the slots, so it is drawn on them; ${nameButton('cursor.bar')} stays the
        menus’ key focus, and nothing sits outside a slot (the 6 px column gap had no room for the bar). Tried and
        dropped the same day: the active body in its rim’s dark. Today: the B2 corner cursor. Decision
        2026-11-20-155-move-slots-dim-the-inactive-and-wells-clear-the-bands</dd>
      <dt>Bond count</dt><dd>Above Silver (Jess 2026-11-20): the bond icon (12 x 12 art at 2 px, pink and
        yellow), its count (×2 and up) in ${nameButton('font.silver')} 20, one stack gap over the Silver count, right
        edges flush with Silver and the portrait. Today it sits under the Lv number, which left it 4 px off the screen’s
        bottom here (the number now sits on the slots’ bottom)</dd>
      <dt>Shake Off</dt><dd>Today’s B2 “FIGHT!” badge in the Lv yellow
        (${nameButton('color.type.electric.base')}, the shade its dark), flashing white 3 times a second, over the good
        band and centred on the slots (moved from today’s 18 px left of centre), one stack gap up. The text in
        ${nameButton('font.michroma')} ${AREA.prompt.textSize} (the game talking, Jess 2026-11-20; today HudText 30); the
        draining bar is ${nameButton('bar.timer')}</dd>
      <dt>Run timer</dt><dd>${nameButton('font.boldPixels')} ${AREA.timer.size} (the Fonts page’s row), dim at
        ${AREA.timer.opacity * 100}%, centred under the slots ${AREA.timer.y} px up, as today</dd>
      <dt>Not shown</dt><dd>Motion the game plays: the Lv rattle on a level-up, Silver’s pop on a gain, the flash
        fading</dd>
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
