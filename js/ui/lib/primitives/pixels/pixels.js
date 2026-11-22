/* ============ pixels.js: pixel-art shapes (G.Lib.Pixels; #155 155b) ============
 * The library's lowest primitive: a shape drawn as rows of art pixels, scaled up with crisp edges (HUD-STYLE "Shapes").
 * Every pixel-art piece draws with it: the buttons, HP bars, chips, item boxes, the map, the cursor. Props only, no
 * game state. PixelPatterns (155c-2) defines the fills the shapes paint with by url(#id), once per page (the HUD's
 * root, the board). Moved unchanged from js/ui/hud-kit.js, which passes it on under the same names. Style: pixels.css.
 * The two-type rim (#128 catch.window) and letterRows are pure, so they are there even without Preact.
 * Plan: docs/ASCII Concept Maps/155b - Buttons Plan.md.
 */
G.Lib = G.Lib || {};
G.Lib.Pixels = (() => {
  // ---------- the pure parts (no page needed, so the harnesses load them in Node) ----------
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

  // ---------- the two-type rim (#128 catch.window) ----------
  // Decision 2026-11-20-155-two-type-team-slot-rim-dithered-middle-band.
  // A two-type Pokemon's rim: the first type's ramp on the left, the second's on the right, joined by a dithered band
  // across the middle TWO_TYPE_RIM.band of the shape's width. Every rim pixel is one ramp's colour whole, never a mix.
  // The thresholds are shuffled per TWO_TYPE_RIM.block pixels, seeded, and every row shuffles differently, so the 1 px
  // top and bottom rims never read as dashes. Ported from the board (tools/library/hud-team-slot-draft.js
  // ditherThreshold, TEAM_SLOT.rimDither). Checked by docs/proposals/pixel-dither-harness.js.
  const TWO_TYPE_RIM = { band: 0.25, block: 8, seed: 1 };
  const RIM_LETTERS = 'LBD'; // the rim's light, base and dark in a letter grid (panel.pixel's)
  /** A 32-bit integer hash of whole numbers (deterministic, for the seeded shuffle). */
  function ditherHash(...numbers) {
    let hash = 0x9e3779b9;
    for (const number of numbers) {
      hash = Math.imul(hash ^ number, 0x85ebca6b);
      hash ^= hash >>> 13;
      hash = Math.imul(hash, 0xc2b2ae35);
      hash ^= hash >>> 16;
    }
    return hash >>> 0;
  }
  /** One block's thresholds (0 to block - 1) in a seeded shuffled order (Fisher-Yates). */
  function ditherBlockOrder(row, block) {
    const order = Array.from({ length: TWO_TYPE_RIM.block }, (_, index) => index);
    for (let index = TWO_TYPE_RIM.block - 1; index > 0; index--) {
      const swap = ditherHash(TWO_TYPE_RIM.seed, row, block, index) % (index + 1);
      [order[index], order[swap]] = [order[swap], order[index]];
    }
    return order;
  }
  const twoTypeMasks = new Map();
  /** For a shape artWidth x artRows: per row, per column, true where the rim takes the second type. Cached per size. */
  function twoTypeRimMask(artWidth, artRows) {
    const cacheKey = artWidth + 'x' + artRows;
    if (twoTypeMasks.has(cacheKey)) return twoTypeMasks.get(cacheKey);
    const band = Math.round(TWO_TYPE_RIM.band * artWidth),
      bandStart = (artWidth - band) / 2,
      mask = [];
    for (let row = 0; row < artRows; row++) {
      const line = [];
      let order = null;
      for (let x = 0; x < artWidth; x++) {
        if (x % TWO_TYPE_RIM.block === 0) order = ditherBlockOrder(row, x / TWO_TYPE_RIM.block);
        const blend = Math.min(1, Math.max(0, (x - bandStart + 0.5) / band)),
          threshold = (order[x % TWO_TYPE_RIM.block] + 0.5) / TWO_TYPE_RIM.block;
        line.push(blend > threshold);
      }
      mask.push(line);
    }
    twoTypeMasks.set(cacheKey, mask);
    return mask;
  }
  const twoTypeRuns = new WeakMap();
  /**
   * paintRow for a grid of letters whose rim letters (L, B, D) take colours on the left and the second ramp
   * ({ light, base, dark }) on the right, dithered across the middle (twoTypeRimMask); every other letter takes
   * colours.
   * The runs are worked out once per grid and pair of colourings, since the run HUD draws its roster every frame.
   */
  function twoTypeLetterRows(grid, colours, secondRamp) {
    if (!twoTypeRuns.has(grid)) twoTypeRuns.set(grid, new Map());
    const byColours = twoTypeRuns.get(grid),
      second = { L: secondRamp.light, B: secondRamp.base, D: secondRamp.dark },
      cacheKey = JSON.stringify([colours, second]);
    if (!byColours.has(cacheKey)) {
      const mask = twoTypeRimMask(grid[0].length, grid.length);
      const rowRuns = grid.map((line, row) => {
        const fillAt = (x) => {
          const letter = line[x];
          if (letter === ' ') return null;
          return RIM_LETTERS.includes(letter) && mask[row][x] ? second[letter] : colours[letter];
        };
        const runs = [];
        let start = 0;
        for (let column = 1; column <= line.length; column++) {
          if (column < line.length && fillAt(column) === fillAt(start)) continue;
          if (fillAt(start)) runs.push([start, column - start, fillAt(start)]);
          start = column;
        }
        return runs;
      });
      byColours.set(cacheKey, rowRuns);
    }
    const rows = byColours.get(cacheKey);
    return (row) => rows[row];
  }
  const pure = { letterRows, TWO_TYPE_RIM, twoTypeRimMask, twoTypeLetterRows };

  // ---------- the drawn parts (Preact) ----------
  const preact = window.preact,
    htmFactory = window.htm;
  if (!preact || !htmFactory) return { ready: false, ...pure };
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

  // ---------- the shared fills (moved from js/ui/hud-overlay.js, 155c-2): SVG patterns a shape paints with ----------
  const PATTERNS = {
    barChecker: 'url(#hud-bar-checker)', // the B2 HP bar body: 1-pixel checker of the panel body and checker
    typeChecker: 'url(#hud-type-checker)', // the B2 type checker body
    slotGrid: 'url(#hud-slot-grid)', // the HUD move slots: the same grid with 3x3 dark squares (Jess, 2026-11-10)
    // the slot grid in the Unified greys (grey.panel squares, grey.raised lines; board SLANTED_GRID): the bodies of the
    // unified pixel panels, starting with the Shop's ball belts (#128 S6); the move slots move onto it at #126
    slotGridUnified: 'url(#hud-slot-grid-unified)',
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
        <pattern id="hud-slot-grid-unified" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="4" height="4" fill=${G.Tokens.color('color.grey.raised')} />
          <rect x="0" y="0" width="3" height="3" fill=${G.Tokens.color('color.grey.panel')} />
        </pattern>
      </defs>
    </svg>`;
  }

  return { ready: true, ...pure, PixelShape, PATTERNS, PixelPatterns };
})();
