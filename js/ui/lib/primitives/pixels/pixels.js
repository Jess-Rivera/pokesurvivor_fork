/* ============ pixels.js: pixel-art shapes (G.Lib.Pixels; #155 155b) ============
 * The library's lowest primitive: a shape drawn as rows of art pixels, scaled up with crisp edges (HUD-STYLE "Shapes").
 * Every pixel-art piece draws with it: the buttons, HP bars, chips, item boxes, the map, the cursor. Props only, no
 * game state. PixelPatterns (155c-2) defines the fills the shapes paint with by url(#id), once per page (the HUD's
 * root, the board). Moved unchanged from js/ui/hud-kit.js, which passes it on under the same names. Style: pixels.css.
 * Plan: docs/ASCII Concept Maps/155b - Buttons Plan.md.
 */
G.Lib = G.Lib || {};
G.Lib.Pixels = (() => {
  const preact = window.preact,
    htmFactory = window.htm;
  if (!preact || !htmFactory) return { ready: false };
  const html = htmFactory.bind(preact.h);

  /**
   * A shape drawn as rows of art pixels, scaled up by artPixel with crisp edges (how the B2 rips are redrawn at the HUD's
   * size, HUD-STYLE "Shapes"). paintRow(row) returns [x, width, fill] runs for that row, in art pixels.
   */
  function PixelShape({ artWidth, artRows, artPixel, paintRow, className }) {
    const rectangles = [];
    for (let row = 0; row < artRows; row++)
      for (const [x, width, fill] of paintRow(row))
        if (width > 0) rectangles.push(html`<rect x=${x} y=${row} width=${width} height="1" fill=${fill} />`);
    return html`<svg
      class=${'hud-pixels' + (className ? ' ' + className : '')}
      width=${artWidth * artPixel}
      height=${artRows * artPixel}
      viewBox=${'0 0 ' + artWidth + ' ' + artRows}
    >
      ${rectangles}
    </svg>`;
  }

  /** paintRow for a grid of letters: runs of one letter become one rectangle. */
  const letterRows = (grid, colours) => (row) => {
    const line = grid[row],
      runs = [];
    let start = 0;
    for (let column = 1; column <= line.length; column++) {
      if (column < line.length && line[column] === line[start]) continue;
      if (line[start] !== ' ') runs.push([start, column - start, colours[line[start]]]);
      start = column;
    }
    return runs;
  };

  // ---------- the shared fills (moved from js/ui/hud-overlay.js, 155c-2): SVG patterns a shape paints with ----------
  const PATTERNS = {
    barChecker: 'url(#hud-bar-checker)', // the B2 HP bar body: 1-pixel checker of the panel body and checker
    typeChecker: 'url(#hud-type-checker)', // the B2 type checker body
    slotGrid: 'url(#hud-slot-grid)', // the HUD move slots: the same grid with 3x3 dark squares (Jess, 2026-11-10)
  };
  /** The pattern definitions, drawn once per page; their ids are what PATTERNS points at. */
  function PixelPatterns() {
    const colour = (key) => G.Tokens.color('color.hud.' + key);
    return html`<svg class="hud-defs" width="0" height="0" aria-hidden="true">
      <defs>
        <pattern id="hud-bar-checker" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="2" height="2" fill=${colour('checker')} />
          <rect x="0" y="0" width="1" height="1" fill=${colour('body')} />
          <rect x="1" y="1" width="1" height="1" fill=${colour('body')} />
        </pattern>
        <pattern id="hud-type-checker" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="3" height="3" fill=${colour('typeBodyLight')} />
          <rect x="0" y="0" width="2" height="2" fill=${colour('typeBodyDark')} />
        </pattern>
        <pattern id="hud-slot-grid" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="4" height="4" fill=${colour('typeBodyLight')} />
          <rect x="0" y="0" width="3" height="3" fill=${colour('typeBodyDark')} />
        </pattern>
      </defs>
    </svg>`;
  }

  return { ready: true, PixelShape, letterRows, PATTERNS, PixelPatterns };
})();
