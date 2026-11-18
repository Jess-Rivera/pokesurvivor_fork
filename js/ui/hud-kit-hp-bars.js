/* ============ hud-kit-hp-bars.js: the HUD kit's HP displays (G.HudKitHpBars) ============
 * Part of the HUD kit (js/ui/hud-kit.js has the overview); it reads only G.HudKit. Panels and screens take these
 * from G.HudOverlay.kit. Split out of js/ui/hud-overlay.js on 2026-11-14 (structural review F1); the code is
 * unchanged.
 */
G.HudKitHpBars = (() => {
  const coreKit = G.HudKit,
    panel = G.Lib && G.Lib.Panel, // the box shape and Box are the UI library's panel.pixel (#155 155c)
    bars = G.Lib && G.Lib.Bar; // the life bar and the timer strip are its bar.life and bar.timer (155c-3)
  if (!coreKit.ready || !panel || !panel.ready || !bars || !bars.ready) return { ready: false };
  const { html, signal, PALETTE, HP_COLOURS, hpBand, SLOT_GRID, PixelShape } = coreKit;
  const { portraitSource, portraitFallback, letterRows } = coreKit;

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
  /** The track's right frame column (from the bar's left edge) for a card artWidth wide: one pixel clear of the right rim. */
  const rosterBarRight = (artWidth) => artWidth - 8 - ROSTER_BAR.artLeft;
  /** The fill's width in art pixels for a card artWidth wide. */
  const rosterFillArtWidth = (artWidth) => rosterBarRight(artWidth) - ROSTER_LABEL_ART - 1;
  const ROSTER_FILL_LEFT = ROSTER_BAR.artLeft + ROSTER_LABEL_ART + 1;

  /**
   * The box as a grid of letters, one string per art row: the library's panel.pixel shape; withBar stamps the HP bar's
   * track on it. Cached per size.
   */
  const rosterGrids = new Map();
  function rosterBoxGrid(artWidth, artRows = ROSTER_ART_ROWS, withBar = true) {
    if (!withBar) return panel.pixelPanelRows(artWidth, artRows);
    const cacheKey = artWidth + 'x' + artRows;
    if (rosterGrids.has(cacheKey)) return rosterGrids.get(cacheKey);
    const grid = panel.pixelPanelRows(artWidth, artRows).map((line) => line.split(''));
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
    const lines = grid.map((line) => line.join(''));
    rosterGrids.set(cacheKey, lines);
    return lines;
  }
  /** The letters' colours for a rim ramp; body is the box's inside (the slot grid on the run screen); f and t the bar. */
  const rosterColours = (rim, body = SLOT_GRID) => ({
    ...panel.pixelPanelColours(rim, body),
    f: PALETTE.frame,
    t: PALETTE.trackEdge,
  });
  // A box: the roster card's box at any size with a flat body (the pause menu's detail boxes, the catch screen, the
  // Shop's pockets and belts): the library's panel.pixel, under the kit's name.
  const Box = panel.PixelPanel;
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

  // ---------- the B2 life bar: the UI library's bar.life (155c-3); this keeps what changes frame to frame ----------
  /**
   * One B2 life bar: the shape, the italic "HP" label, the fill and the cut-and-fall pieces (HUD-STYLE "Motion").
   * artWidth is a signal (a panel may narrow it for a small window). update() runs once per frame from the panel's sync.
   */
  function createLifeBar({ artPixel, artWidth, labelTop }) {
    const { LifeBarShape, LifeBarLabel, LifeBarFill, LifeBarPiece, lifeBarFill, lifeBarLayout } = bars;
    const fillPixels = signal(0),
      fillBand = signal('high'),
      fillGrowing = signal(false),
      pieces = signal([]); // { id, left, width, band }
    let lastIdentity = null,
      lastFillPixels = 0,
      lastBand = 'high',
      lastWidth = 0,
      nextPieceId = 1;

    // each part reads only its own signals, so a hit redraws the fill and the pieces, never the shape
    const Shape = () => html`<${LifeBarShape} artPixel=${artPixel} artWidth=${artWidth.value} />`;
    const Fill = () =>
      html`<${LifeBarFill}
        artPixel=${artPixel}
        artWidth=${artWidth.value}
        fillPixels=${fillPixels.value}
        band=${fillBand.value}
        growing=${fillGrowing.value}
      />`;
    function Pieces() {
      const removePiece = (id) => (pieces.value = pieces.value.filter((piece) => piece.id !== id));
      return pieces.value.map(
        (piece) =>
          html`<${LifeBarPiece}
            key=${piece.id}
            artPixel=${artPixel}
            left=${piece.left}
            width=${piece.width}
            band=${piece.band}
            onFallen=${() => removePiece(piece.id)}
          />`
      );
    }

    function View() {
      return html`<div class="hud-lifebar">
        <${Shape} /><${LifeBarLabel} artPixel=${artPixel} labelTop=${labelTop} /><${Fill} /><${Pieces} />
      </div>`;
    }

    /** identity: who the bar shows; a change (a swap) or a resize restarts the bar with no piece. */
    function update(hp, maxHp, dead, identity) {
      const widthArt = artWidth.value,
        fraction = maxHp > 0 ? Math.min(1, Math.max(0, hp / maxHp)) : 0,
        pixels = lifeBarFill(artPixel, widthArt, fraction, hp > 0 && !dead); // whole art pixels, one while alive
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

    return { View, update, reset, rightEdge: () => lifeBarLayout(artPixel, artWidth.value).rightEdge };
  }

  // the timer strip (the library's bar.timer), for the panels that draw one (the Shake Off prompt, the weather card)
  const { TimerBar } = bars;

  return {
    ready: true,
    RosterCard,
    ROSTER_ART_PIXEL,
    ROSTER_ART_ROWS,
    rosterBoxGrid,
    rosterColours,
    rosterFill,
    createLifeBar,
    TimerBar,
    Box,
  };
})();
