/* ============ pixels.js: pixel-art shapes (G.Lib.Pixels; #155 155b) ============
 * The library's lowest primitive: a shape drawn as rows of art pixels, scaled up with crisp edges (HUD-STYLE "Shapes").
 * Every pixel-art piece draws with it: the buttons, HP bars, chips, item boxes, the map, the cursor. Props only, no
 * game state. Moved unchanged from js/ui/hud-kit.js, which passes it on under the same names. Style: pixels.css.
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

  return { ready: true, PixelShape, letterRows };
})();
