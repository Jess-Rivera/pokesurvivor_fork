/* ============ bar.js: the bars (G.Lib.Bar; #155 155c-3) ============
 * The library's bars, named as Jess chose (2026-11-18):
 *   bar.life   the B2 dark HP bar (b2-upper A1 to L3, HUD-STYLE "Enemy name bar"): the tab, the italic "HP" label, the
 *              track, a fill in the HP band's colours, and the cut-and-fall pieces a hit leaves. Drawn as LifeBarShape,
 *              LifeBarLabel, LifeBarFill and LifeBarPiece, or all at once as LifeBar
 *   bar.timer  TimerBar: a thin strip that drains as time runs out (the chips, the Shake Off prompt, the weather card)
 * Props only, never game state. The HUD kit's createLifeBar (js/ui/hud-kit-hp-bars.js) keeps the per-frame reading and
 * the falling pieces' list, and draws these pieces. Style: bar.css. Board: tools/library.html, Primitives, Bars
 * (bar.story.js). Plan: docs/AI Outputs/Issue-155/155c-3 - Bars Plan.md. Look and motion: docs/HUD-STYLE.md "Motion".
 */
G.Lib = G.Lib || {};
G.Lib.Bar = (() => {
  const preact = window.preact,
    htmFactory = window.htm,
    pixels = G.Lib.Pixels;
  if (!preact || !htmFactory || !pixels || !pixels.ready) return { ready: false };
  const html = htmFactory.bind(preact.h),
    { PATTERNS } = pixels;
  const HUD_COLOUR = (key) => G.Tokens.color('color.hud.' + key);
  const HP_COLOURS = {};
  for (const band of ['high', 'middle', 'low'])
    HP_COLOURS[band] = {
      fill: G.Tokens.color('color.hp.' + band + '.fill'),
      shade: G.Tokens.color('color.hp.' + band + '.shade'),
    };

  // ---------- bar.life: the B2 dark HP bar, at any art-pixel size ----------
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
  const LIFE_BAR = {
    artRows: 12, // rip rows 9 to 20: the HP tab, the bar and its drop shadow
    labelLeft: 4, // art columns from the bar's left edge to the "HP" label
    labelPixels: 24, // "HP" is 11 font pixels of ink (22 px at 20 px text) plus a 2 px outline, less one shared
    trackRightInset: 3, // the fill ends where the EXP track ends on the EXP version of the bar (b2-upper L6)
  };

  /** Where the track starts, in art columns: right after the label and the track's left outline. */
  const lifeBarTrackLeft = (artPixel) => LIFE_BAR.labelLeft + Math.ceil(LIFE_BAR.labelPixels / artPixel) + 1;
  /** The bar's right edge R, in art columns: the top row's last pixel. */
  const lifeBarRightEdge = (artWidth) => artWidth - 4;
  /** A bar artWidth art pixels wide: its right edge and the track's inside, in art pixels. */
  function lifeBarLayout(artPixel, artWidth) {
    const trackLeft = lifeBarTrackLeft(artPixel),
      rightEdge = lifeBarRightEdge(artWidth);
    return { trackLeft, rightEdge, innerArt: rightEdge - LIFE_BAR.trackRightInset - trackLeft };
  }
  /** The fill in screen pixels for a fraction of HP: whole art pixels, one while alive, none once fainted. */
  function lifeBarFill(artPixel, artWidth, fraction, alive) {
    const innerArt = lifeBarLayout(artPixel, artWidth).innerArt,
      artUnits = alive ? Math.max(1, Math.round(fraction * innerArt)) : 0;
    return artUnits * artPixel;
  }

  function barRectangles(barArtWidth, trackLeft) {
    const right = lifeBarRightEdge(barArtWidth),
      rectangles = [];
    const addSpans = (spans, fill) => {
      for (const [ripRow, leftOffset, rightOffset] of spans)
        rectangles.push({ x: leftOffset, y: ripRow - 9, width: right + rightOffset - leftOffset + 1, height: 1, fill });
    };
    addSpans(SHADOW_SPANS, HUD_COLOUR('checker'));
    addSpans(OUTLINE_SPANS, HUD_COLOUR('outline'));
    addSpans(CHECKER_SPANS, PATTERNS.barChecker);
    addSpans(SOLID_BODY_SPANS, HUD_COLOUR('body'));
    // the empty track: outline below and on both ends, shade, light, shade inside
    const trackRight = right - LIFE_BAR.trackRightInset;
    rectangles.push({
      x: trackLeft - 1,
      y: 14 - 9,
      width: trackRight - trackLeft + 2,
      height: 1,
      fill: HUD_COLOUR('outline'),
    });
    rectangles.push({ x: trackLeft - 1, y: 11 - 9, width: 1, height: 3, fill: HUD_COLOUR('outline') });
    rectangles.push({ x: trackRight, y: 11 - 9, width: 1, height: 3, fill: HUD_COLOUR('outline') });
    [HUD_COLOUR('trackShade'), HUD_COLOUR('trackLight'), HUD_COLOUR('trackShade')].forEach((fill, row) =>
      rectangles.push({ x: trackLeft, y: 11 - 9 + row, width: trackRight - trackLeft, height: 1, fill })
    );
    return rectangles;
  }

  /** The fill's three rows in the band's colours: shade, fill, shade. */
  const stripes = (band, artPixel) => {
    const colours = HP_COLOURS[band],
      row = artPixel;
    return (
      `linear-gradient(${colours.shade} 0 ${row}px, ${colours.fill} ${row}px ${2 * row}px, ` +
      `${colours.shade} ${2 * row}px ${3 * row}px)`
    );
  };
  const trackStyle = (artPixel, left, width, band) => ({
    left: lifeBarTrackLeft(artPixel) * artPixel + left + 'px',
    top: 2 * artPixel + 'px',
    width: width + 'px',
    height: 3 * artPixel + 'px',
    background: stripes(band, artPixel),
  });

  /** The bar's shape: tab, body, track and shadow. */
  function LifeBarShape({ artPixel, artWidth }) {
    const rectangles = barRectangles(artWidth, lifeBarTrackLeft(artPixel)).map(
      (rect) => html`<rect x=${rect.x} y=${rect.y} width=${rect.width} height=${rect.height} fill=${rect.fill} />`
    );
    return html`<svg
      class="hud-pixels"
      width=${artWidth * artPixel}
      height=${LIFE_BAR.artRows * artPixel}
      viewBox=${'0 0 ' + artWidth + ' ' + LIFE_BAR.artRows}
    >
      ${rectangles}
    </svg>`;
  }
  /** The italic "HP" label on the tab; labelTop places it (each panel sets its own). */
  const LifeBarLabel = ({ artPixel, labelTop }) =>
    html`<span class="hud-hp-label" style=${{ left: LIFE_BAR.labelLeft * artPixel + 'px', top: labelTop + 'px' }}
      >HP</span
    >`;
  /** The fill: fillPixels of the track in the band's colours (from lifeBarFill); growing eases a heal in. */
  function LifeBarFill({ artPixel, artWidth, fillPixels, band, growing }) {
    const innerPixels = lifeBarLayout(artPixel, artWidth).innerArt * artPixel;
    const style = trackStyle(artPixel, 0, innerPixels, band);
    style.transform = `scaleX(${innerPixels ? fillPixels / innerPixels : 0})`;
    return html`<div class=${'hud-lifebar-fill' + (growing ? ' is-growing' : '')} style=${style}></div>`;
  }
  /** One lost piece of a hit (left and width in px along the track, the band it had): it holds 1 s, then falls. */
  function LifeBarPiece({ artPixel, left, width, band, onFallen }) {
    return html`<div
      class="hud-lifebar-piece"
      style=${trackStyle(artPixel, left, width, band)}
      onAnimationEnd=${onFallen}
    ></div>`;
  }
  /** The whole bar from values (the board, a new screen): pieces [{ id, left, width, band }]. */
  function LifeBar({ artPixel, artWidth, labelTop, fillPixels, band, growing, pieces = [], onPieceFallen }) {
    return html`<div class="hud-lifebar">
      <${LifeBarShape} artPixel=${artPixel} artWidth=${artWidth} />
      <${LifeBarLabel} artPixel=${artPixel} labelTop=${labelTop} />
      <${LifeBarFill}
        artPixel=${artPixel}
        artWidth=${artWidth}
        fillPixels=${fillPixels}
        band=${band}
        growing=${growing}
      />
      ${pieces.map(
        (piece) =>
          html`<${LifeBarPiece}
            key=${piece.id}
            artPixel=${artPixel}
            left=${piece.left}
            width=${piece.width}
            band=${piece.band}
            onFallen=${onPieceFallen && (() => onPieceFallen(piece.id))}
          />`
      )}
    </div>`;
  }

  // ---------- bar.timer: a thin strip that drains (white by default) ----------
  const TIMER_WHITE = G.Tokens.color('color.text.label');
  /**
   * fraction: 0 to 1, the time left. height in px. colour: one colour, or light and base for two rows (the weather
   * card's Light over Base). drainsRight: holds its right end and runs out toward it (the weather card at the screen
   * edge); otherwise it holds its left end. style places it (left, top or bottom, width); className keeps the caller's.
   */
  function TimerBar({ fraction, height, colour = TIMER_WHITE, light, base, drainsRight = false, className, style }) {
    const half = height / 2,
      background = light ? `linear-gradient(${light} 0 ${half}px, ${base} ${half}px ${height}px)` : colour;
    return html`<div
      class=${'bar-timer' + (drainsRight ? ' is-drain-right' : '') + (className ? ' ' + className : '')}
      style=${{ ...style, height: height + 'px', background, transform: 'scaleX(' + fraction + ')' }}
    ></div>`;
  }

  return {
    ready: true,
    LIFE_BAR,
    lifeBarLayout,
    lifeBarFill,
    LifeBarShape,
    LifeBarLabel,
    LifeBarFill,
    LifeBarPiece,
    LifeBar,
    TimerBar,
  };
})();
