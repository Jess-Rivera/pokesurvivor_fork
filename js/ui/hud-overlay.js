/* ============ hud-overlay.js: the HTML HUD above the game canvas (core) ============
 * The screen-fixed HUD is an HTML overlay (docs/HUD-STYLE.md, decision 2026-11-10-hud-on-preact-and-pngs-as-design-basis),
 * built with Preact, htm and Preact Signals (js/vendor/) and styled by css/hud-overlay.css.
 *
 * This file is the core: it mounts the layer, holds the kit every panel shares (palette, pixel shapes, the B2 life bar,
 * portraits) and runs the per-frame read. Panels live in their own files and register with addPanel():
 *   js/ui/hud-boss-panel.js    the enemy name bar and leader portrait circles (#64)
 *   js/ui/hud-player-panel.js  the character info panel, bottom centre (#62)
 *
 * Read only: G.HudOverlay.sync(inRun) runs once per frame from G.Game after the canvas is drawn. Each panel copies what it
 * shows into signals and never writes game state. Unchanged values touch nothing on the page.
 *
 * If a library failed to load, ready stays false, a warning is logged, and the canvas HUD keeps drawing its old pieces.
 */
G.HudOverlay = (() => {
  const preact = window.preact,
    preactHooks = window.preactHooks,
    htmFactory = window.htm,
    preactSignals = window.preactSignals;
  const ready = !!(preact && preactHooks && htmFactory && preactSignals);
  if (!ready) {
    console.warn('[HudOverlay] Preact, htm or Signals did not load; the canvas HUD keeps its old pieces');
    return { ready: false, kit: null, addPanel() {}, sync() {}, setHidden() {}, setNameSize() {} };
  }
  const html = htmFactory.bind(preact.h),
    { signal, batch } = preactSignals;

  // ---------- palette (HUD-STYLE "Colour palette"; every colour here has its job named there) ----------
  const PALETTE = {
    outline: '#101010', // text outline, shape outlines
    body: '#181818', // panel body
    frame: '#212121',
    checker: '#303030',
    slate: '#495151', // dividers, empty slots
    trackShade: '#464646', // empty track (dark bar)
    trackLight: '#7f7f7f',
    typeBodyDark: '#292929', // the B2 type checker body
    typeBodyLight: '#393939',
    expFill: '#00baf3',
    expShade: '#00799a',
    lvFill: '#f3b200',
    lvShade: '#9a6110',
    cursor: '#fff000', // Title yellow: the B2 selection cursor
  };
  const HP_COLOURS = {
    high: { fill: '#00fb49', shade: '#008a28' },
    middle: { fill: '#f3b200', shade: '#9a6110' },
    low: { fill: '#fb3041', shade: '#922030' },
  };
  // Bulbapedia Scarlet/Violet type colours (HUD-STYLE "Type colours"): Base for fills, Dark for shades and outlines,
  // Light for highlights.
  const TYPE_COLOURS = {
    normal: { light: '#C1C2C1', base: '#9FA19F', dark: '#676967' },
    fire: { light: '#EF7374', base: '#E62829', dark: '#961A1B' },
    water: { light: '#74ACF5', base: '#2980EF', dark: '#1B539B' },
    grass: { light: '#82C274', base: '#3FA129', dark: '#29691B' },
    electric: { light: '#FCD659', base: '#FAC000', dark: '#A37D00' },
    ice: { light: '#81DFF7', base: '#3DCEF3', dark: '#28869E' },
    fighting: { light: '#FFAC59', base: '#FF8000', dark: '#A65300' },
    poison: { light: '#B884DD', base: '#9141CB', dark: '#5E2A84' },
    ground: { light: '#B88E6F', base: '#915121', dark: '#5E3515' },
    flying: { light: '#ADD2F5', base: '#81B9EF', dark: '#54789B' },
    psychic: { light: '#F584A8', base: '#EF4179', dark: '#9B2A4F' },
    bug: { light: '#B8C26A', base: '#91A119', dark: '#5E6910' },
    rock: { light: '#CBC7AD', base: '#AFA981', dark: '#726E54' },
    ghost: { light: '#A284A2', base: '#704170', dark: '#492A49' },
    dragon: { light: '#8D98EC', base: '#5060E1', dark: '#343E92' },
    dark: { light: '#998B8C', base: '#624D4E', dark: '#403233' },
    steel: { light: '#98C2D1', base: '#60A1B8', dark: '#3E6978' },
    fairy: { light: '#F5A2F5', base: '#EF70EF', dark: '#9B499B' },
  };
  const typeColours = (type) => TYPE_COLOURS[type] || TYPE_COLOURS.normal;
  const hpBand = (fraction) => (fraction > 0.5 ? 'high' : fraction >= 0.2 ? 'middle' : 'low');

  // Shared SVG fills, referenced by id from any shape on the page.
  const BAR_CHECKER = 'url(#hud-bar-checker)', // the B2 HP bar body: 1-pixel checker of the panel body and checker
    TYPE_CHECKER = 'url(#hud-type-checker)'; // the B2 move button body: 2x2 dark squares on 1-pixel light lines

  // ---------- pixel shapes ----------
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

  // ---------- portraits (HUD-STYLE "Assets": SpriteCollab Normal face, 40x40) ----------
  const PORTRAIT_PATH = 'assets/pokemon/';
  const portraitSource = (dex, shiny) => PORTRAIT_PATH + dex + (shiny ? '/s/Portrait.png' : '/Portrait.png');
  /** onError for a portrait <img>: a shiny with no portrait of its own (#958) falls back to the normal face. */
  function portraitFallback(event) {
    const image = event.target,
      normal = portraitSource(image.dataset.dex, false);
    if (!image.src.endsWith(normal)) image.src = normal;
  }

  // ---------- mount ----------
  const panels = signal([]); // { id, View, sync }
  let hiddenByDebug = false;

  function Defs() {
    return html`<svg class="hud-defs" width="0" height="0" aria-hidden="true">
      <defs>
        <pattern id="hud-bar-checker" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="2" height="2" fill=${PALETTE.checker} />
          <rect x="0" y="0" width="1" height="1" fill=${PALETTE.body} />
          <rect x="1" y="1" width="1" height="1" fill=${PALETTE.body} />
        </pattern>
        <pattern id="hud-type-checker" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="3" height="3" fill=${PALETTE.typeBodyLight} />
          <rect x="0" y="0" width="2" height="2" fill=${PALETTE.typeBodyDark} />
        </pattern>
      </defs>
    </svg>`;
  }

  function Root() {
    return html`<${Defs} />${panels.value.map((panel) => html`<${panel.View} key=${panel.id} />`)}`;
  }

  const root = document.createElement('div');
  root.className = 'hud-overlay';
  root.setAttribute('translate', 'no'); // English-only text, and keeps the i18n observer off per-frame changes
  root.setAttribute('aria-hidden', 'true');
  document.body.appendChild(root);
  preact.render(html`<${Root} />`, root);

  /** A panel file registers itself: { id, View (a component), sync(inRun) }. */
  function addPanel(panel) {
    panels.value = panels.value.concat(panel);
  }

  // ---------- the per-frame read (sim to present: read only) ----------
  function sync(inRun) {
    // hidden by G.Debug.hudOverlay: no reads and no renders, so the frame rate shows the overlay's whole cost
    const showing = inRun && !hiddenByDebug;
    batch(() => {
      for (const panel of panels.value) panel.sync(showing);
    }); // one render per frame
  }

  /** ?dev only (G.Debug.hudOverlay): hide the overlay to compare the frame rate with and without it. */
  function setHidden(hidden) {
    hiddenByDebug = !!hidden;
    if (hiddenByDebug) sync(false);
  }

  /** ?dev only (G.Debug.hudNameSize): the enemy name line's text size, 20, 30 or 40 px (whole multiples of the 10 px grid). */
  function setNameSize(pixels) {
    root.style.setProperty('--name-size', pixels + 'px');
    root.style.setProperty('--font-pixel', pixels / 10 + 'px');
    return pixels;
  }

  const kit = {
    preact,
    hooks: preactHooks,
    html,
    signal,
    PALETTE,
    HP_COLOURS,
    TYPE_COLOURS,
    typeColours,
    hpBand,
    BAR_CHECKER,
    TYPE_CHECKER,
    BAR_ART_ROWS,
    PixelShape,
    createLifeBar,
    portraitSource,
    portraitFallback,
  };

  return { ready: true, kit, addPanel, sync, setHidden, setNameSize };
})();
