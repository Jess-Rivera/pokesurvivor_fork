/* ============ square.js: the item squares and their grid (G.Lib.Square; #155 155c-2) ============
 * The library's squares, named as Jess chose (2026-11-18):
 *   square.item  ItemSquare: the B2 bag button (a square with chamfered corners, a rim, the checker body) with a
 *                picture in its centre; the Lv yellow rim when it holds something, slate when empty
 *   grid.item    ItemGrid: item squares in a grid, half a square apart, filling row by row; each slot filled, empty or
 *                locked (a slot not bought yet, dimmed)
 * Props only, never game state: the screen passes the picture (the kit draws the item's icon) and each slot's
 * attributes (the kit adds the tooltip's hover handlers). Moved from js/ui/hud-kit-items.js, which passes them on under
 * the same names. Style: square.css. Board: tools/library.html, Primitives, Squares (square.story.js).
 * Plan: docs/ASCII Concept Maps/155c-2 - Flat Panel, Item Squares and Slot Box Plan.md. Look: HUD-STYLE "Berry bag".
 */
G.Lib = G.Lib || {};
G.Lib.Square = (() => {
  const preact = window.preact,
    htmFactory = window.htm,
    pixels = G.Lib.Pixels;
  if (!preact || !htmFactory || !pixels || !pixels.ready) return { ready: false };
  const html = htmFactory.bind(preact.h),
    { PixelShape, PATTERNS } = pixels;
  const OUTLINE = G.Tokens.color('color.hud.outline'),
    FILLED_RIM = G.Tokens.color('color.hud.lvFill'),
    EMPTY_RIM = G.Tokens.color('color.hud.slate');
  const SQUARE_ART_PIXEL = 2;

  // ---------- the B2 bag button (b2-lower Y4 to AB5): chamfered corners, a rim and the checker body ----------
  function bagButtonRow(row, artSize, rimColour) {
    const chamfer = row < 2 ? 2 - row : row > artSize - 3 ? row - (artSize - 3) : 0,
      left = chamfer,
      right = artSize - 1 - chamfer;
    if (row === 0 || row === artSize - 1) return [[left, right - left + 1, OUTLINE]];
    if (row === 1 || row === artSize - 2)
      return [
        [left, 1, OUTLINE],
        [left + 1, right - left - 1, rimColour],
        [right, 1, OUTLINE],
      ];
    return [
      [left, 1, OUTLINE],
      [left + 1, 1, rimColour],
      [left + 2, right - left - 3, PATTERNS.barChecker],
      [right - 1, 1, rimColour],
      [right, 1, OUTLINE],
    ];
  }

  /** square.item: the bag button, artSize 2 px art pixels square, with picture in its centre; filled picks the rim. */
  function ItemSquare({ artSize, filled, picture }) {
    const size = artSize * SQUARE_ART_PIXEL,
      rim = filled ? FILLED_RIM : EMPTY_RIM;
    return html`<div class="hud-item-square" style=${{ width: size + 'px', height: size + 'px' }}>
      <${PixelShape}
        artWidth=${artSize}
        artRows=${artSize}
        artPixel=${SQUARE_ART_PIXEL}
        paintRow=${(row) => bagButtonRow(row, artSize, rim)}
      />
      ${picture || null}
    </div>`;
  }

  /**
   * grid.item: item squares in `columns` columns (2 by default), half a square between them, filling row by row.
   * slots: [{ key, filled, picture, locked, className, attrs, overlay }]: locked = dimmed (not bought); attrs = extra
   * attributes for the slot's element (data-*, handlers); overlay = drawn over the square (a selection cursor).
   */
  function ItemGrid({ slots, artSize = 20, columns = 2, className }) {
    const size = artSize * SQUARE_ART_PIXEL,
      gap = size / 2;
    return html`<div
      class=${'hud-item-grid' + (className ? ' ' + className : '')}
      style=${{ gridTemplateColumns: `repeat(${columns}, ${size}px)`, gap: gap + 'px' }}
    >
      ${slots.map(
        (slot) =>
          html`<div
            key=${slot.key}
            class=${
              'hud-grid-slot' +
              (slot.filled ? ' is-filled' : '') +
              (slot.locked ? ' is-locked' : '') +
              (slot.className ? ' ' + slot.className : '')
            }
            ...${slot.attrs || {}}
          >
            <${ItemSquare} filled=${slot.filled} picture=${slot.picture} artSize=${artSize} />
            ${slot.overlay || null}
          </div>`
      )}
    </div>`;
  }

  return { ready: true, ItemSquare, ItemGrid };
})();
