/* ============ hud-kit-hp-bars.js: the HUD kit's HP displays (G.HudKitHpBars) ============
 * Part of the HUD kit (js/ui/hud-kit.js has the overview); it reads only G.HudKit. Panels and screens take these
 * from G.HudOverlay.kit. Split out of js/ui/hud-overlay.js on 2026-11-14 (structural review F1); the code is
 * unchanged.
 */
G.HudKitHpBars = (() => {
  const coreKit = G.HudKit;
  if (!coreKit.ready) return { ready: false };
  const { html, signal, PALETTE, HP_COLOURS, hpBand, SLOT_GRID, BAR_CHECKER, PixelShape, portraitSource } = coreKit;
  const { portraitFallback } = coreKit;

  // ---------- the roster card (b2-lower Y15 to AA16): the run screen's roster rows and the pause menu's team panel ----------
  // HUD-STYLE "Roster rows". The box is drawn at 2 px per art pixel, 32 rows tall; its width varies (the run screen's
  // rows are 139 art pixels, the pause menu's team cards narrower). The same box with no HP bar and a flat body frames
  // the pause menu's detail boxes (any height).
  const ROSTER_ART_PIXEL = 2,
    ROSTER_ART_ROWS = 32,
    ROSTER_FACE = { left: 14, top: 10, size: 44 }, // the portrait circle: a 40 px portrait inside a 2 px stroke
    ROSTER_NAME = { left: 66, top: 17 }, // just right of the portrait, a little below the middle of the space above the bar
    ROSTER_BAR = { artLeft: 33, artTop: 19 }, // the HP bar: right of the portrait, along the bottom
    // The B2 small bar (b2-lower Y16 to Z16): the "HP" label is the life meter's (20 px italic HUD text), then the track's
    // frame (t) and its empty inside (f), rows 2 to 5 of the bar.
    ROSTER_LABEL_ART = 12, // "HP" at 20 px with its outline is 24 px wide, as the life meter's label
    ROSTER_TRACK_TOP = 2, // the track's frame rows: 2 and 5, its inside 3 and 4
    // the label's 24 px line centred on the track's frame
    ROSTER_LABEL_TOP = (ROSTER_BAR.artTop + ROSTER_TRACK_TOP) * ROSTER_ART_PIXEL + 2 * ROSTER_ART_PIXEL - 12;
  // The left end of the rip's top 8 rows and one straight row, one letter per art pixel from the box's left edge; the
  // rest of each row is its last letter's fill. The right end is the mirror, the bottom 8 rows the top's mirror.
  //   o outline, D / B / L the rim's dark, base and light, G the body, space nothing.
  const ROSTER_LEFT_END = [
    ['      oooo', ' '], // the corner bump rises above the top edge
    ['     oDBBDo', ' '],
    ['    oDBooBD', 'o'],
    ['   oDBoLBo', 'B'],
    ['  oDBoLLL', 'o'],
    [' oDBoLLLo', 'G'],
    ['oDBoLLLo', 'G'],
    ['oBoLLL', 'G'],
  ];
  const ROSTER_STRAIGHT_LEFT = ['oBoLLo', 'G'];
  /** The track's right frame column (from the bar's left edge) for a card artWidth wide: one pixel clear of the right rim. */
  const rosterBarRight = (artWidth) => artWidth - 8 - ROSTER_BAR.artLeft;
  /** The fill's width in art pixels for a card artWidth wide. */
  const rosterFillArtWidth = (artWidth) => rosterBarRight(artWidth) - ROSTER_LABEL_ART - 1;
  const ROSTER_FILL_LEFT = ROSTER_BAR.artLeft + ROSTER_LABEL_ART + 1;

  /** The box as a grid of letters, one string per art row; withBar stamps the HP bar's track. Cached per size. */
  const rosterGrids = new Map();
  function rosterBoxGrid(artWidth, artRows = ROSTER_ART_ROWS, withBar = true) {
    const cacheKey = artWidth + 'x' + artRows + (withBar ? 'b' : '');
    if (rosterGrids.has(cacheKey)) return rosterGrids.get(cacheKey);
    const rowOf = ([left, fill]) => {
      const right = left.split('').reverse().join('');
      return left + fill.repeat(artWidth - 2 * left.length) + right;
    };
    const grid = [];
    for (let row = 0; row < artRows; row++) {
      const fromTop = Math.min(row, artRows - 1 - row);
      grid.push(rowOf(fromTop < ROSTER_LEFT_END.length ? ROSTER_LEFT_END[fromTop] : ROSTER_STRAIGHT_LEFT).split(''));
    }
    if (withBar) {
      // stamp the HP bar's track: its frame and its empty inside (the label is text, drawn over it in the row)
      const barRight = rosterBarRight(artWidth);
      for (let trackRow = 0; trackRow < 4; trackRow++) {
        const line = grid[ROSTER_BAR.artTop + ROSTER_TRACK_TOP + trackRow],
          stamp = (column, letter) => (line[ROSTER_BAR.artLeft + column] = letter);
        if (trackRow === 0 || trackRow === 3)
          for (let column = ROSTER_LABEL_ART; column <= barRight; column++) stamp(column, 't');
        else {
          stamp(ROSTER_LABEL_ART, 't');
          for (let column = ROSTER_LABEL_ART + 1; column < barRight; column++) stamp(column, 'f');
          stamp(barRight, 't');
        }
      }
    }
    const lines = grid.map((line) => line.join(''));
    rosterGrids.set(cacheKey, lines);
    return lines;
  }
  /** The letters' colours for a rim ramp; body is the box's inside (the slot grid on the run screen). */
  const rosterColours = (rim, body = SLOT_GRID) => ({
    o: PALETTE.outline,
    D: rim.dark,
    B: rim.base,
    L: rim.light,
    G: body,
    f: PALETTE.frame,
    t: PALETTE.trackEdge,
  });
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
  /** The HP fill for a card artWidth wide: whole art pixels as a fraction of the track, one pixel while alive. */
  function rosterFill(hpFraction, fainted, artWidth) {
    const fillArt = rosterFillArtWidth(artWidth),
      units = fainted || hpFraction <= 0 ? 0 : Math.max(1, Math.round(Math.min(1, hpFraction) * fillArt));
    return units / fillArt;
  }
  const rosterStripes = (band) => {
    const colours = HP_COLOURS[band];
    return `linear-gradient(${colours.fill} 0 ${ROSTER_ART_PIXEL}px, ${colours.shade} ${ROSTER_ART_PIXEL}px ${2 * ROSTER_ART_PIXEL}px)`;
  };
  /**
   * One roster card: the box rimmed in `rim`, the HP fill (fill from rosterFill, band from hpBand), the "HP" label, the
   * portrait in its circle and the name. Extra pieces (chips, the cooldown shade, the key, the cursor) come as children.
   * faceClass adds a class to the portrait circle (the pause menu's selected card).
   */
  function RosterCard({
    artWidth,
    rim,
    fill,
    band,
    dex,
    shiny,
    name,
    fainted,
    className,
    style,
    faceClass,
    onClick,
    attrs,
    children,
  }) {
    const width = artWidth * ROSTER_ART_PIXEL,
      height = ROSTER_ART_ROWS * ROSTER_ART_PIXEL;
    return html`<div
      class=${'hud-roster-row' + (fainted ? ' is-fainted' : '') + (className ? ' ' + className : '')}
      style=${{ ...style, width: width + 'px', height: height + 'px' }}
      onClick=${onClick}
      ...${attrs || {}}
    >
      <${PixelShape}
        artWidth=${artWidth}
        artRows=${ROSTER_ART_ROWS}
        artPixel=${ROSTER_ART_PIXEL}
        paintRow=${letterRows(rosterBoxGrid(artWidth), rosterColours(rim))}
      />
      <div
        class="hud-roster-fill"
        style=${{
          left: ROSTER_FILL_LEFT * ROSTER_ART_PIXEL + 'px',
          top: (ROSTER_BAR.artTop + 3) * ROSTER_ART_PIXEL + 'px',
          width: rosterFillArtWidth(artWidth) * ROSTER_ART_PIXEL + 'px',
          height: 2 * ROSTER_ART_PIXEL + 'px',
          background: rosterStripes(band),
          transform: `scaleX(${fill})`,
        }}
      ></div>
      <span
        class="hud-hp-label"
        style=${{ left: ROSTER_BAR.artLeft * ROSTER_ART_PIXEL + 'px', top: ROSTER_LABEL_TOP + 'px' }}
        >HP</span
      >
      <div
        class=${'hud-roster-face' + (faceClass ? ' ' + faceClass : '')}
        style=${{
          left: ROSTER_FACE.left + 'px',
          top: ROSTER_FACE.top + 'px',
          width: ROSTER_FACE.size + 'px',
          height: ROSTER_FACE.size + 'px',
        }}
      >
        <img src=${portraitSource(dex, shiny)} data-dex=${dex} alt="" onError=${portraitFallback} />
      </div>
      <span class="hud-text hud-roster-name" style=${{ left: ROSTER_NAME.left + 'px', top: ROSTER_NAME.top + 'px' }}
        >${name}</span
      >
      ${children}
    </div>`;
  }

  // ---------- the B2 dark HP bar (b2-upper A1 to L3, HUD-STYLE "Enemy name bar"), at any art-pixel size ----------
  // Each span: [rip row, left offset, right offset from the bar's right edge R]. R is the top row's last pixel.
  const SHADOW_SPANS = [
    [14, 4, 2],
    [15, 4, 3],
    [16, 4, 3],
    [17, 4, 2],
    [18, 4, 2],
    [19, 6, 1],
    [20, 7, 1],
  ];
  const OUTLINE_SPANS = [
    [10, 2, 0],
    [11, 1, 1],
    [12, 1, 2],
    [13, 0, 2],
    [14, 0, 1],
    [15, 1, 1],
    [16, 2, 0],
    [17, 3, 0],
    [18, 4, -1],
  ];
  const CHECKER_SPANS = [
    [11, 2, 0],
    [12, 2, 1],
    [13, 1, 1],
    [14, 1, 0],
    [15, 2, 0],
    [16, 3, -1],
  ];
  const SOLID_BODY_SPANS = [[17, 4, -1]];
  const BAR_ART_ROWS = 12, // rip rows 9 to 20: the HP tab, the bar and its drop shadow
    LABEL_LEFT = 4, // art columns from the bar's left edge to the "HP" label
    LABEL_PIXELS = 24, // "HP" is 11 font pixels of ink (22 px at 20 px text) plus a 2 px outline, less one shared
    TRACK_RIGHT_INSET = 3; // the fill ends where the EXP track ends on the EXP version of the bar (b2-upper L6)

  const barRightEdge = (barArtWidth) => barArtWidth - 4;

  function barRectangles(barArtWidth, trackLeft) {
    const right = barRightEdge(barArtWidth),
      rectangles = [];
    const addSpans = (spans, fill) => {
      for (const [ripRow, leftOffset, rightOffset] of spans)
        rectangles.push({ x: leftOffset, y: ripRow - 9, width: right + rightOffset - leftOffset + 1, height: 1, fill });
    };
    addSpans(SHADOW_SPANS, PALETTE.checker);
    addSpans(OUTLINE_SPANS, PALETTE.outline);
    addSpans(CHECKER_SPANS, BAR_CHECKER);
    addSpans(SOLID_BODY_SPANS, PALETTE.body);
    // the empty track: outline below and on both ends, shade, light, shade inside
    const trackRight = right - TRACK_RIGHT_INSET;
    rectangles.push({
      x: trackLeft - 1,
      y: 14 - 9,
      width: trackRight - trackLeft + 2,
      height: 1,
      fill: PALETTE.outline,
    });
    rectangles.push({ x: trackLeft - 1, y: 11 - 9, width: 1, height: 3, fill: PALETTE.outline });
    rectangles.push({ x: trackRight, y: 11 - 9, width: 1, height: 3, fill: PALETTE.outline });
    [PALETTE.trackShade, PALETTE.trackLight, PALETTE.trackShade].forEach((fill, row) =>
      rectangles.push({ x: trackLeft, y: 11 - 9 + row, width: trackRight - trackLeft, height: 1, fill })
    );
    return rectangles;
  }

  /**
   * One B2 life bar: the shape, the italic "HP" label, the fill and the cut-and-fall pieces (HUD-STYLE "Motion").
   * artWidth is a signal (a panel may narrow it for a small window). update() runs once per frame from the panel's sync.
   */
  function createLifeBar({ artPixel, artWidth, labelTop }) {
    const labelArt = Math.ceil(LABEL_PIXELS / artPixel),
      trackLeft = LABEL_LEFT + labelArt + 1; // the fill starts right after the label and the track's left outline
    const trackInnerArt = (widthArt) => barRightEdge(widthArt) - TRACK_RIGHT_INSET - trackLeft;
    const fillPixels = signal(0),
      fillBand = signal('high'),
      fillGrowing = signal(false),
      pieces = signal([]); // { id, left, width, band }
    let lastIdentity = null,
      lastFillPixels = 0,
      lastBand = 'high',
      lastWidth = 0,
      nextPieceId = 1;

    const stripes = (band) => {
      const colours = HP_COLOURS[band],
        row = artPixel;
      return `linear-gradient(${colours.shade} 0 ${row}px, ${colours.fill} ${row}px ${2 * row}px, ${colours.shade} ${2 * row}px ${3 * row}px)`;
    };
    const trackStyle = (left, width, band) => ({
      left: trackLeft * artPixel + left + 'px',
      top: 2 * artPixel + 'px',
      width: width + 'px',
      height: 3 * artPixel + 'px',
      background: stripes(band),
    });

    function Shape() {
      const widthArt = artWidth.value;
      const rectangles = barRectangles(widthArt, trackLeft).map(
        (rect) => html`<rect x=${rect.x} y=${rect.y} width=${rect.width} height=${rect.height} fill=${rect.fill} />`
      );
      return html`<svg
        class="hud-pixels"
        width=${widthArt * artPixel}
        height=${BAR_ART_ROWS * artPixel}
        viewBox=${'0 0 ' + widthArt + ' ' + BAR_ART_ROWS}
      >
        ${rectangles}
      </svg>`;
    }

    function Fill() {
      const innerPixels = trackInnerArt(artWidth.value) * artPixel;
      const style = trackStyle(0, innerPixels, fillBand.value);
      style.transform = `scaleX(${innerPixels ? fillPixels.value / innerPixels : 0})`;
      return html`<div class=${'hud-lifebar-fill' + (fillGrowing.value ? ' is-growing' : '')} style=${style}></div>`;
    }

    function Pieces() {
      const removePiece = (id) => (pieces.value = pieces.value.filter((piece) => piece.id !== id));
      return pieces.value.map(
        (piece) =>
          html`<div
            key=${piece.id}
            class="hud-lifebar-piece"
            style=${trackStyle(piece.left, piece.width, piece.band)}
            onAnimationEnd=${() => removePiece(piece.id)}
          ></div>`
      );
    }

    function View() {
      return html`<div class="hud-lifebar">
        <${Shape} /><span class="hud-hp-label" style=${{ left: LABEL_LEFT * artPixel + 'px', top: labelTop + 'px' }}
          >HP</span
        ><${Fill} /><${Pieces} />
      </div>`;
    }

    /** identity: who the bar shows; a change (a swap) or a resize restarts the bar with no piece. */
    function update(hp, maxHp, dead, identity) {
      const widthArt = artWidth.value,
        innerArt = trackInnerArt(widthArt),
        fraction = maxHp > 0 ? Math.min(1, Math.max(0, hp / maxHp)) : 0,
        artUnits = hp > 0 && !dead ? Math.max(1, Math.round(fraction * innerArt)) : 0, // whole art pixels, one while alive
        pixels = artUnits * artPixel;
      if (identity !== lastIdentity || widthArt !== lastWidth) {
        lastIdentity = identity;
        lastWidth = widthArt;
        fillGrowing.value = false;
      } else if (pixels < lastFillPixels) {
        // cut and fall: the lost segment, in the colour the fill had before the hit
        pieces.value = pieces.value.concat({
          id: nextPieceId++,
          left: pixels,
          width: lastFillPixels - pixels,
          band: lastBand,
        });
        fillGrowing.value = false;
      } else if (pixels > lastFillPixels) fillGrowing.value = true;
      fillPixels.value = pixels;
      fillBand.value = lastBand = hpBand(fraction);
      lastFillPixels = pixels;
    }

    /** Forget the last value, so the next update starts fresh (a new run, or the panel was hidden). */
    function reset() {
      lastIdentity = null;
    }

    return { View, update, reset, rightEdge: () => barRightEdge(artWidth.value) };
  }

  return {
    ready: true,
    RosterCard,
    ROSTER_ART_PIXEL,
    ROSTER_ART_ROWS,
    rosterBoxGrid,
    rosterColours,
    letterRows,
    rosterFill,
    createLifeBar,
  };
})();
