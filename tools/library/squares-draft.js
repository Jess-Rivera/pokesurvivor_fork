// tools/library/squares-draft.js: the Squares page tabs (Unified, Current) and the held item square comparison. A plain
// script sharing the board's globals (it uses clean-draft.js's panel.pixel copy and helpers); index.html loads the
// board's files in order, board.js first and start.js last.
'use strict';
// ---------- Squares, Unified (Jess 2026-11-19): the held item square ----------
// The held item is one Pokemon's, so it is pixel (decision 2026-11-18-155-pixel-panels-for-one-pokemon-clean-for-the-
// rest), and it keeps square.item, the B2 bag button, folded to Unified at today's sizes (decision
// 2026-11-19-157-held-item-keeps-square-item; panel.pixel was tried at 64 px and not taken). A board copy: nothing here
// reads the game.
const SQUARE_ART_PIXEL = 2;
const SQUARE_ICON = 32; // px, the item icon in the centre (square.css .hud-item-icon)
// square.item, a copy of js/ui/lib/primitives/square/square.js bagButtonRow, its colours folded to Unified
const SQUARE_COLOURS = {
  outline: greyTone('ink'), // was #101010, the same
  filledRim: '#FAC000', // the canon paralysis yellow, color.type.electric.base (Unified: Lv uses it); was #f3b200
  emptyRim: greyTone('slate'), // was #495151, the same
  // the body: panel.slanted's slot grid (Jess 2026-11-19), not today's 1 art pixel checker; the squares, lines and tile
  // are read from clean-draft.js's board copy (SLANTED_COLOURS, SLANTED_GRID), so the two always match
  gridSquare: SLANTED_COLOURS.gridSquare, // grey.panel
  gridLine: SLANTED_COLOURS.gridLine, // grey.raised
};
const SQUARE_SIZES = { detail: 24, run: 20 }; // art pixels: pause.pokemonDetail.heldItem, run.hud.heldItem
/** One art row of the bag button: chamfered corners 2 art pixels deep, a 1 art pixel rim, the grid body. */
function squareRow(row, artSize, rim) {
  const chamfer = row < 2 ? 2 - row : row > artSize - 3 ? row - (artSize - 3) : 0,
    left = chamfer,
    right = artSize - 1 - chamfer,
    outline = SQUARE_COLOURS.outline;
  if (row === 0 || row === artSize - 1) return [[left, right - left + 1, outline]];
  if (row === 1 || row === artSize - 2)
    return [
      [left, 1, outline],
      [left + 1, right - left - 1, rim],
      [right, 1, outline],
    ];
  return [
    [left, 1, outline],
    [left + 1, 1, rim],
    [left + 2, right - left - 3, 'url(#GRID)'],
    [right - 1, 1, rim],
    [right, 1, outline],
  ];
}
let squareCount = 0;
const SQUARE_BODY_START = 2; // art pixels: the outline and the rim, so the grid starts on a whole square
/** square.item as an SVG string, its grid a pattern local to this SVG, starting at the body's top-left corner. */
function squareSvg(artSize, filled) {
  const id = 'board-square-grid-' + ++squareCount,
    rim = filled ? SQUARE_COLOURS.filledRim : SQUARE_COLOURS.emptyRim,
    rects = [];
  for (let row = 0; row < artSize; row++)
    for (const [x, width, fill] of squareRow(row, artSize, rim))
      if (width > 0)
        rects.push(`<rect x="${x}" y="${row}" width="${width}" height="1" fill="${fill.replace('GRID', id)}" />`);
  const size = artSize * SQUARE_ART_PIXEL;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${artSize} ${artSize}" shape-rendering="crispEdges"
    style="display:block"><defs><pattern id="${id}" x="${SQUARE_BODY_START}" y="${SQUARE_BODY_START}"
      width="${SLANTED_GRID.tile}" height="${SLANTED_GRID.tile}" patternUnits="userSpaceOnUse">
      <rect width="${SLANTED_GRID.tile}" height="${SLANTED_GRID.tile}" fill="${SQUARE_COLOURS.gridLine}" />
      <rect width="${SLANTED_GRID.square}" height="${SLANTED_GRID.square}" fill="${SQUARE_COLOURS.gridSquare}" />
    </pattern></defs>${rects.join('')}</svg>`;
}
// the board's placeholder icon: a 32 px circle in the centre, as the old story's picture
const squareIcon = () => `<div style="position:absolute;left:50%;top:50%;width:${SQUARE_ICON}px;height:${SQUARE_ICON}px;
  margin:${-SQUARE_ICON / 2}px 0 0 ${-SQUARE_ICON / 2}px;border-radius:50%;background:${greyTone('mid')}"></div>`;
const squareHolder = (inner, filled) => `<div style="position:relative;display:inline-block">${inner}${
  filled ? squareIcon() : ''
}</div>`;
const SQUARE_TILES = [
  { id: 'filled', title: 'Filled, 48 px (the detail panel)', artSize: SQUARE_SIZES.detail, filled: true },
  { id: 'empty', title: 'Empty, 48 px', artSize: SQUARE_SIZES.detail, filled: false },
  { id: 'filledRun', title: 'Filled, 40 px (the run HUD)', artSize: SQUARE_SIZES.run, filled: true },
];
const squareTile = (state, title, inner) => `<figure class="lib-state">
  <div class="lib-stage" data-state="${esc(state)}" style="background:${CLEAN_STAGE}">${inner}</div>
  <figcaption>${nameButton(state.replace(':', '.'))}<br>${esc(title)}</figcaption></figure>`;
function heldItemSection() {
  const squareTiles = SQUARE_TILES.map((tile) =>
    squareTile('square.item:' + tile.id, tile.title, squareHolder(squareSvg(tile.artSize, tile.filled), tile.filled))
  ).join('');
  return `<section class="lib-story" data-draft="heldItem">
    <h3>${nameButton('square.item')} ${draftTag('pixel: one Pokemon\u2019s held item (a board copy)')}</h3>
    <div class="lib-states">${squareTiles}</div>
    <dl class="lib-facts">
      ${cleanColour('Outline', 'color.grey.ink', SQUARE_COLOURS.outline)}
      ${cleanColour('Rim, filled', 'color.type.electric.base', SQUARE_COLOURS.filledRim)}
      <dd class="lib-dim">The canon paralysis yellow, as Unified gives Lv; was the Lv yellow #f3b200 (the only change)</dd>
      ${cleanColour('Rim, empty', 'color.grey.slate', SQUARE_COLOURS.emptyRim)}
      ${cleanColour('Grid squares', 'color.grey.panel', SQUARE_COLOURS.gridSquare)}
      ${cleanColour('Grid lines', 'color.grey.raised', SQUARE_COLOURS.gridLine)}
      <dd class="lib-dim">panel.slanted's slot grid (8 x 8 px tiles: 6 px squares, 2 px lines), in place of today's 1 art
        pixel checker; it starts on a whole square at the body's top-left</dd>
      <dt>Shape</dt><dd>The B2 bag button: corners chamfered 2 art pixels, a 1 art pixel rim, the slot grid body; ${SQUARE_ART_PIXEL} px per art pixel</dd>
      <dt>Fits</dt><dd>Today's sizes as they are: 48 px on the detail panel, 40 px on the run HUD</dd>
    </dl>
    <dl class="lib-facts">
      <dt>Board copy</dt><dd>Every value lives in tools/library/squares-draft.js; changing one changes only the
        board</dd>
      <dt>Used at</dt><dd>${['pause.pokemonDetail.heldItem', 'run.hud.heldItem'].map(nameButton).join('')}</dd>
    </dl></section>`;
}
// ---------- square.clean (Jess 2026-11-19): the team's slots, a small panel.clean ----------
// What the team shares is clean (decision 2026-11-18-155-pixel-panels-for-one-pokemon-clean-for-the-rest): the berry
// bag, the run items, the pockets and the Shop's owned items. A small panel.clean: square corners, the grey.panel body,
// a 1 px edge. Filled takes its pocket's colour as the edge (Jess 2026-11-19: passed in by the screen, as on
// panel.clean; the pause menu's pockets, for one), teal.base shown here; empty the default grey.slate; locked (a slot
// not bought yet) is the empty look at 30%, as today's grid dims it. The name is a placeholder. Board only: it uses
// clean-draft.js's panel.clean values and the .lib-clean style.
const CLEAN_SQUARE = { size: 40, lockedOpacity: 0.3 }; // px: today's pocket squares
const CLEAN_SQUARE_EDGES = { filled: unifiedTone(UNIFIED_TEAL, 'base'), empty: CLEAN_PANEL.edge };
const CLEAN_SQUARE_STATES = [
  { id: 'filled', title: 'Filled: the pocket\u2019s colour as the edge (teal.base shown), the item in the centre', filled: true },
  { id: 'empty', title: 'Empty: the default grey.slate edge', filled: false },
  { id: 'locked', title: 'Locked (not bought yet): the empty look at 30%', filled: false, locked: true },
];
/** One clean square: panel.clean at the square's size, its edge picked by filled, the icon on top. */
function cleanSquare(state) {
  const style = [
    ['--clean-body', CLEAN_PANEL.body],
    ['--clean-edge', state.filled ? CLEAN_SQUARE_EDGES.filled : CLEAN_SQUARE_EDGES.empty],
    ['--clean-edge-width', CLEAN_PANEL.edgeWidth + 'px'],
    ['width', CLEAN_SQUARE.size + 'px'],
    ['height', CLEAN_SQUARE.size + 'px'],
    ['opacity', state.locked ? CLEAN_SQUARE.lockedOpacity : 1],
  ]
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
  return `<div class="lib-clean" style="${style}">${state.filled ? squareIcon() : ''}</div>`;
}
function cleanSquareSection() {
  const tiles = CLEAN_SQUARE_STATES.map((state) =>
    squareTile('square.clean:' + state.id, state.title, cleanSquare(state))
  ).join('');
  return `<section class="lib-story" data-draft="square.clean">
    <h3>${nameButton('square.clean')} ${draftTag('clean: the team\u2019s slots (name a placeholder)')}</h3>
    <div class="lib-states">${tiles}</div>
    <dl class="lib-facts">
      ${cleanColour('Body', 'color.grey.panel', CLEAN_PANEL.body)}
      ${cleanColour('Edge, filled', 'color.teal.base', CLEAN_SQUARE_EDGES.filled)}
      <dd class="lib-dim">Shown in teal.base. A screen passes the pocket's colour in (the pause menu's pockets, the
        Shop's), so a filled slot reads as belonging to its pocket.</dd>
      ${cleanColour('Edge, empty and locked', 'color.grey.slate', CLEAN_SQUARE_EDGES.empty)}
      <dt>Shape</dt><dd>panel.clean: a ${CLEAN_PANEL.edgeWidth} px edge, square corners, no cut and no bar</dd>
      <dt>Locked</dt><dd>The empty look at ${CLEAN_SQUARE.lockedOpacity * 100}% (today's grid dims a locked slot the
        same way)</dd>
      <dt>Size</dt><dd>${CLEAN_SQUARE.size} px here (today's pockets); a ${SQUARE_ICON} px icon in the centre</dd>
      <dt>Used at</dt><dd>${['run.hud.berryBag', 'pause.inventory.berries', 'pause.inventory.runItems',
        'pause.inventory.pocket', 'main.shop.items.owned', 'main.shop.upgrades.pocketSlots'].map(nameButton).join('')}</dd>
    </dl></section>`;
}

const SQUARE_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note:
      'The squares going forward. The held item keeps square.item (pixel, one Pokemon); the team\u2019s squares ' +
      '(berry bag, run items, pockets, the Shop) are clean: square.clean.',
    draw: () => heldItemSection() + cleanSquareSection(),
  },
  {
    id: 'current',
    title: 'Current',
    note: 'What the game draws today, for comparing.',
    draw: () => primitiveBody('primitives/squares'),
  },
];
const squaresPage = (tab) => tabbedPage('Squares', SQUARE_TABS, tab);
