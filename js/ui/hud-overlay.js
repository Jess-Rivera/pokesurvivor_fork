/* ============ hud-overlay.js: the HTML HUD above the game canvas (core) ============
 * The screen-fixed HUD is an HTML overlay (docs/HUD-STYLE.md, decision 2026-11-10-hud-on-preact-and-pngs-as-design-basis),
 * built with Preact, htm and Preact Signals (js/vendor/) and styled by css/hud-overlay.css.
 *
 * This file is the core: it mounts the layer, holds the kit every panel shares (palette, pixel shapes, the B2 life bar,
 * portraits) and runs the per-frame read. Panels live in their own files and register with addPanel():
 *   js/ui/hud-boss-panel.js    the enemy name bar and leader portrait circles (#64)
 *   js/ui/hud-player-panel.js  the character info panel, bottom centre (#62)
 *   js/ui/hud-roster-panel.js  the team roster, held items and berry bag, lower left (#63)
 *   js/ui/hud-run-items-panel.js  the run item column, lower right (#63)
 *   js/ui/hud-map-panel.js     World Level, Region, Map and the weather card (top right), the kills line (#65)
 *   js/ui/hud-dps-panel.js     the DPS-Upgrades panel: DPS sparkline and the run's team upgrade cards (top left) (#66)
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
    lvDark: '#6d5000', // the Lv yellow at 45% (HUD-STYLE "Ramps for new colours"): the run item box's corner shade
    cursor: '#fff000', // Title yellow: the B2 selection cursor
    trackEdge: '#313131', // the roster HP track's frame (b2-lower Y16 to Z16)
    paperEdge: '#848484', // the run item icon patch's edge (b2-lower AD4 to AG5)
    paper: '#e7e7e7', // the run item icon patch
  };
  // A fainted roster row's rim: the greys of the panel, as a type ramp (HUD-STYLE "Roster rows").
  const FAINTED_RIM = { light: PALETTE.trackLight, base: PALETTE.slate, dark: PALETTE.checker };
  const HP_COLOURS = {
    high: { fill: '#00fb49', shade: '#008a28' },
    middle: { fill: '#f3b200', shade: '#9a6110' },
    low: { fill: '#fb3041', shade: '#922030' },
  };
  // Bulbapedia Scarlet/Violet type colours (HUD-STYLE "Type colours"), the game-wide table in G.U: Base for fills, Dark
  // for shades and outlines, Light for highlights.
  const TYPE_COLOURS = {};
  for (const type of Object.keys(G.U.TYPE_COLOR))
    TYPE_COLOURS[type] = {
      light: G.U.TYPE_COLOR_LIGHT[type],
      base: G.U.TYPE_COLOR[type],
      dark: G.U.TYPE_COLOR_DARK[type],
    };
  const typeColours = (type) => TYPE_COLOURS[type] || TYPE_COLOURS.normal;
  const hpBand = (fraction) => (fraction > 0.5 ? 'high' : fraction >= 0.2 ? 'middle' : 'low');

  // Shared SVG fills, referenced by id from any shape on the page.
  const BAR_CHECKER = 'url(#hud-bar-checker)', // the B2 HP bar body: 1-pixel checker of the panel body and checker
    TYPE_CHECKER = 'url(#hud-type-checker)', // the B2 move button body: 2x2 dark squares on 1-pixel light lines
    SLOT_GRID = 'url(#hud-slot-grid)'; // the HUD move slots: the same grid with 3x3 dark squares (Jess, 2026-11-10)

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

  // ---------- the B2 move button (b2-lower F15 to J16, measured 2026-11-10) ----------
  /**
   * Its left end, row by row, at half the rip's height (22 rows): a short 45 degree run down to a flat point (rows 6 to 8),
   * then a steep run back, one pixel across per two rows. The right end is the same profile turned 180 degrees.
   */
  const moveSlotLeftEdge = (row) => (row <= 5 ? 6 - row : row <= 8 ? 0 : Math.ceil((row - 8) / 2));

  /** One row of the B2 move button: outline, a rim ramp ({ light, base, dark }) at both ends, and bodyFill inside.
   *  Used by the run screen's move slots (hud-player-panel.js) and the pause menu's buttons (pause-menu.js). */
  function moveSlotRow(row, artWidth, artRows, rim, bodyFill) {
    const left = moveSlotLeftEdge(row),
      right = artWidth - 1 - moveSlotLeftEdge(artRows - 1 - row);
    if (row === 0 || row === artRows - 1) return [[left, right - left + 1, PALETTE.outline]];
    const inner = row === 1 || row === artRows - 2 ? rim.dark : null;
    const ends = [
      [left, 1, PALETTE.outline],
      [left + 1, 1, rim.light],
      [left + 2, 1, rim.base],
      [left + 3, 1, PALETTE.outline],
      [right - 3, 1, PALETTE.outline],
      [right - 2, 1, rim.base],
      [right - 1, 1, rim.light],
      [right, 1, PALETTE.outline],
    ];
    return [[left + 4, right - 3 - (left + 4), inner || bodyFill], ...ends];
  }

  // ---------- the B2 bag button (b2-lower Y4 to AB5): a square with chamfered corners, a rim and the checker body ----------
  function bagButtonRow(row, artSize, rimColour) {
    const chamfer = row < 2 ? 2 - row : row > artSize - 3 ? row - (artSize - 3) : 0,
      left = chamfer,
      right = artSize - 1 - chamfer;
    if (row === 0 || row === artSize - 1) return [[left, right - left + 1, PALETTE.outline]];
    if (row === 1 || row === artSize - 2)
      return [
        [left, 1, PALETTE.outline],
        [left + 1, right - left - 1, rimColour],
        [right, 1, PALETTE.outline],
      ];
    return [
      [left, 1, PALETTE.outline],
      [left + 1, 1, rimColour],
      [left + 2, right - left - 3, BAR_CHECKER],
      [right - 1, 1, rimColour],
      [right, 1, PALETTE.outline],
    ];
  }

  /**
   * An item icon (Pokesprite cell or app icon, through G.Icons.draw) painted on a small canvas at 1x. It paints on a change,
   * then again at 0.5, 1, 2 and 4 s, since a Pokesprite cell paints only once its sheet has loaded.
   */
  function IconCanvas({ icon, size, className }) {
    const canvasRef = preactHooks.useRef(null);
    preactHooks.useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return undefined;
      const paint = () => {
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, size, size);
        if (icon) G.Icons.draw(context, icon, 0, 0, size);
      };
      paint();
      const timers = [500, 1000, 2000, 4000].map((delay) => setTimeout(paint, delay));
      return () => timers.forEach(clearTimeout);
    }, [icon, size]);
    return html`<canvas class=${className || ''} width=${size} height=${size} ref=${canvasRef}></canvas>`;
  }

  /**
   * The held item square: the bag button with the item's icon at 1x in its centre; the Lv yellow rim when it holds
   * something, slate when empty (HUD-STYLE "Character info panel"). artSize is in 2 px art pixels.
   */
  function ItemSquare({ icon, artSize }) {
    const size = artSize * 2,
      rim = icon ? PALETTE.lvFill : PALETTE.slate;
    return html`<div class="hud-item-square" style=${{ width: size + 'px', height: size + 'px' }}>
      <${PixelShape}
        artWidth=${artSize}
        artRows=${artSize}
        artPixel=${2}
        paintRow=${(row) => bagButtonRow(row, artSize, rim)}
      />
      ${icon ? html`<${IconCanvas} icon=${icon} size=${32} className="hud-item-icon" />` : null}
    </div>`;
  }

  /**
   * The tight 2x2 item grid (#90, HUD-STYLE "Berry bag"): item squares in two columns, half a square between them, filling
   * row by row. Used by the run screen's berry bag and the pause menu's Run Inventory.
   * slots: [{ key, icon, locked, tip: { name, desc }, className, attrs }]: icon null = empty; locked = dimmed (not bought);
   * tip = the hover tooltip (none on the run screen), drawn in the screen's TooltipLayer; attrs = extra attributes for
   * the slot's element (data-*, handlers). tipPlace: where the tooltip opens (showTooltip's place; above by default).
   */
  function ItemGrid({ slots, artSize = 20, className, tipPlace }) {
    const size = artSize * 2,
      gap = size / 2;
    return html`<div
      class=${'hud-item-grid' + (className ? ' ' + className : '')}
      style=${{ gridTemplateColumns: `${size}px ${size}px`, gap: gap + 'px' }}
    >
      ${slots.map(
        (slot) =>
          html`<div
            key=${slot.key}
            class=${
              'hud-grid-slot' +
              (slot.icon ? ' is-filled' : '') +
              (slot.locked ? ' is-locked' : '') +
              (slot.className ? ' ' + slot.className : '')
            }
            ...${slot.tip && slot.icon ? itemTipHandlers(slot.tip, tipPlace) : {}}
            ...${slot.attrs || {}}
          >
            <${ItemSquare} icon=${slot.icon || null} artSize=${artSize} />
          </div>`
      )}
    </div>`;
  }
  const itemTipHandlers = (tip, place) =>
    tooltipHandlers({ name: tip.name, lines: tip.desc ? [tip.desc] : [], variant: 'item' }, place);

  // ---------- the shared tooltip layer (Jess, 2026-11-12: every hover tooltip is the topmost layer) ----------
  /**
   * One tooltip at a time, drawn by TooltipLayer, which a screen mounts as the LAST child of its stage (the pause
   * menu's 1920 x 1080 stage), above everything else on it. No tooltip lives inside its panel any more: there it was
   * trapped under later panels (the team cards over the move list's tooltip) and clipped by scroll boxes.
   * showTooltip(anchor, content, place): content { name, lines, variant } (variant 'item': name and a 300 px
   *   description; 'detail': the detail panel's 558 px box; 'plain': one line, no name); nothing to show hides it.
   *   place { side: 'above' (default) | 'below' | 'leftOf', align: 'centre' (default) | 'start' | 'end', gap (px,
   *   default 8), beside: for 'leftOf', the element or a selector (closest to the anchor) whose left edge it is off }.
   * hideTooltip(): gone (a scroll, a redraw, a pick-up, the menu closing).
   * tooltipHandlers(content, place): an anchor's hover handlers; content may be a function read on each show. A
   *   pointer move re-shows it after a redraw under a still pointer (an item put down, the next Pokemon by key).
   */
  const tooltipState = signal(null); // { anchor, name, lines, variant, x, y, shift } in stage pixels
  let tooltipLayer = null; // the mounted layer's element
  function hideTooltip() {
    if (tooltipState.value) tooltipState.value = null;
  }
  function showTooltip(anchor, content, place = {}) {
    const layer = tooltipLayer;
    const lines = (content && content.lines ? content.lines : []).filter(Boolean);
    if (!layer || !anchor || !content || !(content.name || lines.length)) return hideTooltip();
    const layerBox = layer.getBoundingClientRect(),
      anchorBox = anchor.getBoundingClientRect(),
      scale = layerBox.width / (layer.offsetWidth || layerBox.width || 1); // the stage is scaled to fit the window
    const toStageX = (x) => (x - layerBox.left) / scale,
      toStageY = (y) => (y - layerBox.top) / scale;
    const side = place.side || 'above',
      align = place.align || 'centre',
      gap = place.gap != null ? place.gap : 8;
    let x, y, shift;
    if (side === 'leftOf') {
      const beside = (typeof place.beside === 'string' ? anchor.closest(place.beside) : place.beside) || anchor;
      x = toStageX(beside.getBoundingClientRect().left) - gap;
      y = toStageY(anchorBox.top);
      shift = 'translate(-100%, 0)';
    } else {
      const edge =
        align === 'start' ? anchorBox.left : align === 'end' ? anchorBox.right : (anchorBox.left + anchorBox.right) / 2;
      x = toStageX(edge);
      y = side === 'below' ? toStageY(anchorBox.bottom) + gap : toStageY(anchorBox.top) - gap;
      const shiftX = align === 'start' ? '0' : align === 'end' ? '-100%' : '-50%';
      shift = 'translate(' + shiftX + ', ' + (side === 'below' ? '0' : '-100%') + ')';
    }
    tooltipState.value = { anchor, name: content.name || '', lines, variant: content.variant || 'item', x, y, shift };
  }
  function tooltipHandlers(content, place) {
    const contentNow = () => (typeof content === 'function' ? content() : content);
    const show = (event) => showTooltip(event.currentTarget, contentNow(), place);
    return {
      onMouseEnter: show,
      onMouseMove: (event) => {
        const shown = tooltipState.value;
        if (!shown || shown.anchor !== event.currentTarget) show(event);
      },
      onMouseLeave: (event) => {
        const shown = tooltipState.value;
        if (shown && shown.anchor === event.currentTarget) hideTooltip();
      },
    };
  }
  /** The layer itself: mount it as the stage's last child. It never catches the pointer. */
  function TooltipLayer() {
    const ref = preactHooks.useRef(null);
    preactHooks.useLayoutEffect(() => {
      tooltipLayer = ref.current;
      return () => {
        if (tooltipLayer === ref.current) tooltipLayer = null;
      };
    }, []);
    const shown = tooltipState.value;
    return html`<div class="hud-tip-layer" ref=${ref}>
      ${
        shown
          ? html`<div
              class=${'hud-tip is-' + shown.variant}
              style=${{ left: shown.x + 'px', top: shown.y + 'px', transform: shown.shift }}
            >
              ${shown.name ? html`<div class="hud-text hud-tip-name">${shown.name}</div>` : null}
              ${shown.lines.map((line, index) => html`<div key=${index} class="hud-text hud-tip-line">${line}</div>`)}
            </div>`
          : null
      }
    </div>`;
  }

  /**
   * A scrolling box with the pause menu's thin scroll bar (dex-buttons AF2-AF20). Made for the move list in #89,
   * shared in #91-2 so Run Info and Cards Taken use the same one. The page's own bar is hidden; the thumb follows
   * the scroll, at least 24 px tall, and hides when the content fits. The wheel scrolls it, and the thumb can be
   * dragged (#91-2 DD1).
   * box: { left, top, width, height } in px, the scrolling area; trackRight: the bar's gap to the parent's right edge;
   * colours: { track, thumb, thumbRim }; resetOn: values that send it back to the top when one changes (fixed length);
   * onScroll: called on every scroll, before the thumb moves (the move list drops its hover tooltip there).
   */
  function ScrollBox({ box, trackRight, colours, resetOn = [], onScroll, children }) {
    const scrollRef = preactHooks.useRef(null),
      thumbState = preactHooks.useRef({ top: 0, height: 0 }); // the thumb, in px
    const [, redraw] = preactHooks.useState(0);
    const drag = preactHooks.useRef(null); // { pointerY, scrollTop } while the thumb is held
    const measure = () => {
      const element = scrollRef.current;
      if (!element) return;
      const ratio = element.clientHeight / Math.max(1, element.scrollHeight);
      const next =
        ratio >= 1
          ? { top: 0, height: 0 }
          : {
              top: (element.scrollTop / element.scrollHeight) * element.clientHeight,
              height: Math.max(24, ratio * element.clientHeight),
            };
      if (next.top !== thumbState.current.top || next.height !== thumbState.current.height) {
        thumbState.current = next;
        redraw((count) => count + 1);
      }
    };
    preactHooks.useLayoutEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      measure();
    }, resetOn);
    const holdThumb = (event) => {
      const element = scrollRef.current;
      if (!element) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { pointerY: event.clientY, scrollTop: element.scrollTop };
    };
    const dragThumb = (event) => {
      const element = scrollRef.current;
      if (!drag.current || !element) return;
      const screenScale = element.getBoundingClientRect().height / element.clientHeight; // the menu is scaled to fit
      const movedThumb = (event.clientY - drag.current.pointerY) / screenScale;
      element.scrollTop = drag.current.scrollTop + movedThumb * (element.scrollHeight / element.clientHeight);
    };
    const dropThumb = () => (drag.current = null);
    const thumbNow = thumbState.current;
    return html`<div
        class="hud-scroll-box"
        ref=${scrollRef}
        onScroll=${() => {
          if (onScroll) onScroll();
          measure();
        }}
        style=${{ left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' }}
      >
        ${children}
      </div>
      <div
        class="hud-scroll-track"
        style=${{ right: trackRight + 'px', top: box.top + 'px', height: box.height + 'px', background: colours.track }}
      >
        ${
          thumbNow.height
            ? html`<div
                class="hud-scroll-thumb"
                onPointerDown=${holdThumb}
                onPointerMove=${dragThumb}
                onPointerUp=${dropThumb}
                onPointerCancel=${dropThumb}
                style=${{
                  top: thumbNow.top + 'px',
                  height: thumbNow.height + 'px',
                  background: colours.thumb,
                  borderColor: colours.thumbRim,
                }}
              ></div>`
            : null
        }
      </div>`;
  }

  // ---------- the B2 selection cursor (b2-lower Z2 to AC3): four yellow corner brackets with an outline ----------
  function CursorCorner({ corner }) {
    const size = 7;
    // one continuous yellow L inside one unbroken outline (row 2 keeps the yellow at the corner)
    const rows = (row) => {
      if (row === 0) return [[0, size, PALETTE.outline]];
      if (row === 2)
        return [
          [0, 1, PALETTE.outline],
          [1, 1, PALETTE.cursor],
          [2, size - 2, PALETTE.outline],
        ];
      if (row === 1)
        return [
          [0, 1, PALETTE.outline],
          [1, size - 2, PALETTE.cursor],
          [size - 1, 1, PALETTE.outline],
        ];
      if (row === size - 1) return [[0, 3, PALETTE.outline]];
      return [
        [0, 1, PALETTE.outline],
        [1, 1, PALETTE.cursor],
        [2, 1, PALETTE.outline],
      ];
    };
    return html`<div class=${'hud-cursor hud-cursor-' + corner}>
      <${PixelShape} artWidth=${size} artRows=${size} artPixel=${2} paintRow=${rows} />
    </div>`;
  }
  const CURSOR_CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  const Cursor = () => CURSOR_CORNERS.map((corner) => html`<${CursorCorner} key=${corner} corner=${corner} />`);

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

  // ---------- status chips (HUD-STYLE "Status chips"): the major statuses plus poison, bad poison and burn, solid; ----------
  // the minor ones hollow (a dark body inside the coloured rim, coloured text), in the character panel only (#78)
  const MINOR_CHIP_BODY = '#101010';
  const CHIP_STYLES = {
    sleep: { label: 'SLP', fill: '#848484', shade: '#4a4a4a' },
    poison: { label: 'PSN', fill: '#d631de', shade: '#6b2942' },
    toxic: { label: 'PSN', fill: '#d631de', shade: '#391042' },
    burn: { label: 'BRN', fill: '#e75a4a', shade: '#b50000' },
    freeze: { label: 'FRZ', fill: '#218cf7', shade: '#005a8c' },
    paralysis: { label: 'PAR', fill: '#efad00', shade: '#ad6b00' },
    // minors: the rim and text take each animation's own colour (assets/status/)
    confusion: { label: 'CNF', fill: MINOR_CHIP_BODY, shade: '#d8b000', text: '#d8b000', minor: true },
    daze: { label: 'DZE', fill: MINOR_CHIP_BODY, shade: '#1f9fe7', text: '#1f9fe7', minor: true },
    drowsy: { label: 'DRW', fill: MINOR_CHIP_BODY, shade: '#e73963', text: '#e73963', minor: true },
    trap: { label: 'TRP', fill: MINOR_CHIP_BODY, shade: '#adb5bd', text: '#adb5bd', minor: true },
  };
  /** Does this status get a chip? Minor ones only where the caller shows them (the character panel). */
  const hasChip = (statusKey, includeMinors = false) =>
    !!CHIP_STYLES[statusKey] && (includeMinors || !CHIP_STYLES[statusKey].minor);
  // Chip outline: the B2 capsule buttons (b2-lower Y17 to Z17), stepped corners at the rip's 12 rows. Each entry is how
  // many art pixels that row's edge sits in from the chip's sides. The shade rim is 2 art pixels thick (Jess, 2026-11-10:
  // the shade border made thicker, in place of the rip's dark outline); the fill is the outline shrunk by the rim.
  const CHIP_ART_PIXEL = 2,
    CHIP_WIDTH = 70,
    CHIP_EDGE_INSETS = [2, 2, 1, 1, 0, 0, 0, 0, 1, 1, 2, 2],
    CHIP_RIM_ART = 2,
    CHIP_ART_WIDTH = CHIP_WIDTH / CHIP_ART_PIXEL,
    CHIP_ART_ROWS = CHIP_EDGE_INSETS.length;
  // Per row: the fill's inset from each side (a pixel is fill when every pixel within the rim's reach is inside the
  // outline), or null for a row that is all rim.
  const CHIP_FILL_INSETS = CHIP_EDGE_INSETS.map((_, row) => {
    if (row < CHIP_RIM_ART || row >= CHIP_ART_ROWS - CHIP_RIM_ART) return null;
    let deepest = 0;
    for (let near = row - CHIP_RIM_ART; near <= row + CHIP_RIM_ART; near++)
      deepest = Math.max(deepest, CHIP_EDGE_INSETS[near]);
    return deepest + CHIP_RIM_ART;
  });
  const chipShapeRows = (fill, shade) => (row) => {
    const edge = CHIP_EDGE_INSETS[row],
      inner = CHIP_FILL_INSETS[row];
    if (inner == null) return [[edge, CHIP_ART_WIDTH - 2 * edge, shade]];
    return [
      [edge, inner - edge, shade],
      [inner, CHIP_ART_WIDTH - 2 * inner, fill],
      [CHIP_ART_WIDTH - inner, inner - edge, shade],
    ];
  };
  // The sliding glow stays on the fill: clipped to the fill's stepped outline, in screen pixels.
  const CHIP_FILL_CLIP = (() => {
    const rows = CHIP_FILL_INSETS.map((inset, row) => ({ inset, row })).filter((entry) => entry.inset != null),
      leftSide = [],
      rightSide = [];
    for (const { inset, row } of rows) {
      const top = row * CHIP_ART_PIXEL,
        bottom = (row + 1) * CHIP_ART_PIXEL,
        left = inset * CHIP_ART_PIXEL,
        right = CHIP_WIDTH - inset * CHIP_ART_PIXEL;
      leftSide.push(left + 'px ' + top + 'px', left + 'px ' + bottom + 'px');
      rightSide.unshift(right + 'px ' + top + 'px', right + 'px ' + bottom + 'px');
    }
    return 'polygon(' + leftSide.concat(rightSide).join(', ') + ')';
  })();
  // The timer bar runs along the lowest fill row, inside the cut corners.
  const CHIP_TIMER_PLACE = (() => {
    const lowestRow = CHIP_ART_ROWS - CHIP_RIM_ART - 1,
      inset = CHIP_FILL_INSETS[lowestRow] * CHIP_ART_PIXEL;
    return {
      left: inset + 'px',
      width: CHIP_WIDTH - 2 * inset + 'px',
      bottom: CHIP_RIM_ART * CHIP_ART_PIXEL + 'px',
    };
  })();

  /** One chip: { key, label, fill, shade, text (a minor's text colour, or null), timer (0 to 1, or null) }. */
  function Chip({ chip }) {
    return html`<div class="hud-chip">
      <${PixelShape}
        artWidth=${CHIP_ART_WIDTH}
        artRows=${CHIP_ART_ROWS}
        artPixel=${CHIP_ART_PIXEL}
        paintRow=${chipShapeRows(chip.fill, chip.shade)}
        className="hud-chip-shape"
      />
      <span class="hud-text" style=${chip.text ? { color: chip.text } : null}>${chip.label}</span>
      <div class="hud-chip-glow" style=${{ clipPath: CHIP_FILL_CLIP }}></div>
      ${
        chip.timer != null
          ? html`<div
              class="hud-chip-timer"
              style=${{ ...CHIP_TIMER_PLACE, transform: `scaleX(${chip.timer})` }}
            ></div>`
          : null
      }
    </div>`;
  }

  /**
   * Reads one Pokemon's chips each frame. Each reader remembers the time each status started with (the highest seen since
   * it appeared), so the timer bar runs from full to empty. read(entity) returns { chips, key }; key changes only when
   * what the chips show changes (timers rounded to the bar's 35 art pixels).
   */
  function createChipReader(includeMinors = false) {
    const statusPeak = {};
    return function read(entity) {
      // G.Status.list puts the major first and the minors after it, so majors sit at the left
      const list = G.Status.list(entity).filter((status) => hasChip(status.k, includeMinors));
      for (const key in statusPeak) if (!list.some((status) => status.k === key)) delete statusPeak[key];
      const chips = list.map((status) => {
        if (status.t != null) statusPeak[status.k] = Math.max(statusPeak[status.k] || 0, status.t);
        const style = CHIP_STYLES[status.k];
        const timer =
          status.t != null && statusPeak[status.k] > 0
            ? Math.max(0, Math.min(1, status.t / statusPeak[status.k]))
            : null;
        return {
          key: status.k,
          label: style.label,
          fill: style.fill,
          shade: style.shade,
          text: style.text || null,
          timer: timer == null ? null : Math.round(timer * CHIP_ART_WIDTH) / CHIP_ART_WIDTH,
        };
      });
      return { chips, key: chips.map((chip) => chip.key + ':' + chip.timer).join('|') };
    };
  }

  // ---------- effect chips (#76, HUD-STYLE "Effect chips: good and bad bands"): statuses and stat drops in the bad ----------
  // band, stat raises, the team's timed effects and the altar power in the good band. All solid; tags are 3 letters.
  // Stat chips: UI-PALETTES "Pokemon Stats" Base and Dark, the colours of the #78 stat effects on the sprite.
  const STAT_CHIP_STYLES = {
    atk: { label: 'ATK', fill: '#EFCC18', shade: '#9B8510' },
    def: { label: 'DEF', fill: '#E86412', shade: '#97410C' },
    spa: { label: 'SPA', fill: '#14C3F1', shade: '#0D7F9D' },
    spd: { label: 'SPD', fill: '#4A6ADF', shade: '#304591' },
    spe: { label: 'SPE', fill: '#D51DAD', shade: '#8B1370' },
  };
  /** A bright colour's shade at about 55% of it (HUD-STYLE "Ramps for new colours"). */
  function rampedShade(brightHex) {
    const value = parseInt(brightHex.slice(1), 16);
    const channel = (shift) =>
      Math.round(((value >> shift) & 255) * 0.55)
        .toString(16)
        .padStart(2, '0');
    return '#' + channel(16) + channel(8) + channel(0);
  }
  const rampedStyle = (label, fill) => ({ label, fill, shade: rampedShade(fill) });
  // The team store's timed keys that are not stat stages, in the good band's order (the berries by their names)
  const TEAM_EFFECT_STYLES = {
    regen: rampedStyle('REG', '#5fe08a'),
    pct_def: { ...STAT_CHIP_STYLES.def, label: 'KEE' },
    pct_spd: { ...STAT_CHIP_STYLES.spd, label: 'MAR' },
    crit: rampedStyle('LAN', '#ffb347'),
    drop: rampedStyle('PIN', '#ffd23f'),
  };
  const ALTAR_POWER_TAGS = { dmg: 'FRY', spd: 'THN', mag: 'MAG', cd: 'HST' };
  const GUARD_KEY_PREFIX = 'guard_';
  let guardTagOfType = null; // type -> its guard berry's tag, built from G.Grounds.GUARD on first use
  function guardTag(type) {
    if (!guardTagOfType) {
      guardTagOfType = {};
      for (const berry in G.Grounds.GUARD) guardTagOfType[G.Grounds.GUARD[berry]] = berry.slice(0, 3).toUpperCase();
    }
    return guardTagOfType[type] || type.slice(0, 3).toUpperCase();
  }
  const EFFECT_BAND_CAPACITY = 12; // two lines of 6; past it the last slot reads "+N"
  const OVERFLOW_STYLE = { fill: PALETTE.slate, shade: PALETTE.frame };

  /** A band of chips that fits its 12 slots: when more are live, the last slot counts the ones left out. */
  function fitBand(chips) {
    if (chips.length <= EFFECT_BAND_CAPACITY) return chips;
    const shown = chips.slice(0, EFFECT_BAND_CAPACITY - 1);
    const hiddenCount = chips.length - shown.length;
    shown.push({ key: 'overflow', label: '+' + hiddenCount, ...OVERFLOW_STYLE, text: null, timer: null });
    return shown;
  }

  /**
   * Reads the active Pokemon's effect chips each frame: read(entity) returns { bad, good, key }. bad holds the status
   * chips (majors, then minors) and then the stats below 0; good holds the stats above 0, REG, the berries (Kee, Maranga,
   * Lansat, Pinap, then each type guard in the order picked up) and the altar power. A stat's chip is its net stage (own
   * plus team); its timer is the longest time left among the changes pushing it that way. Timers run against the most
   * time seen since the chip appeared, as the status chips do.
   */
  function createEffectChipReader() {
    const readStatusChips = createChipReader(true);
    const timePeak = {};
    return function read(entity) {
      const seenKeys = new Set();
      const timerFraction = (key, timeLeft) => {
        seenKeys.add(key);
        if (!(timeLeft > 0)) return null;
        timePeak[key] = Math.max(timePeak[key] || 0, timeLeft);
        return Math.round(Math.min(1, timeLeft / timePeak[key]) * CHIP_ART_WIDTH) / CHIP_ART_WIDTH;
      };
      const bad = readStatusChips(entity).chips.slice(),
        good = [],
        teamStore = entity.stgTeam;
      for (const stat of G.Stages.STATS) {
        const stage = G.Stages.stage(entity, stat);
        if (!stage) continue;
        const direction = Math.sign(stage);
        let timeLeft = G.Stages.remaining(entity, stat, direction);
        const teamTimer = direction > 0 && teamStore ? G.Stages.teamTimer(teamStore, stat) : null;
        if (teamTimer) timeLeft = Math.max(timeLeft, teamTimer.t);
        const key = 'stat_' + stat + (direction > 0 ? '_up' : '_down');
        (direction > 0 ? good : bad).push({
          key,
          ...STAT_CHIP_STYLES[stat],
          text: null,
          timer: timerFraction(key, timeLeft),
        });
      }
      if (teamStore) {
        for (const effectKey in TEAM_EFFECT_STYLES) {
          if (!G.Stages.teamLive(teamStore, effectKey)) continue;
          const teamTimer = G.Stages.teamTimer(teamStore, effectKey);
          good.push({
            key: effectKey,
            ...TEAM_EFFECT_STYLES[effectKey],
            text: null,
            timer: timerFraction(effectKey, teamTimer && teamTimer.t),
          });
        }
        for (const storeKey of G.Stages.teamKeys(teamStore)) {
          if (!storeKey.startsWith(GUARD_KEY_PREFIX) || !G.Stages.teamLive(teamStore, storeKey)) continue;
          const type = storeKey.slice(GUARD_KEY_PREFIX.length),
            colours = typeColours(type),
            teamTimer = G.Stages.teamTimer(teamStore, storeKey);
          good.push({
            key: storeKey,
            label: guardTag(type),
            fill: colours.base,
            shade: colours.dark,
            text: null,
            timer: timerFraction(storeKey, teamTimer && teamTimer.t),
          });
        }
      }
      const power = entity.power;
      if (power && power.def) {
        const key = 'altar_' + power.def.id;
        seenKeys.add(key);
        good.push({
          key,
          ...rampedStyle(ALTAR_POWER_TAGS[power.def.id] || power.def.id.slice(0, 3).toUpperCase(), power.def.color),
          text: null,
          timer:
            power.dur > 0
              ? Math.round(Math.max(0, Math.min(1, power.t / power.dur)) * CHIP_ART_WIDTH) / CHIP_ART_WIDTH
              : null,
        });
      }
      for (const key in timePeak) if (!seenKeys.has(key)) delete timePeak[key];
      const badBand = fitBand(bad),
        goodBand = fitBand(good);
      const keyOf = (band) => band.map((chip) => chip.key + ':' + chip.label + ':' + chip.timer).join('|');
      return { bad: badBand, good: goodBand, key: keyOf(badBand) + '#' + keyOf(goodBand) };
    };
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
        <pattern id="hud-slot-grid" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="4" height="4" fill=${PALETTE.typeBodyLight} />
          <rect x="0" y="0" width="3" height="3" fill=${PALETTE.typeBodyDark} />
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
    SLOT_GRID,
    BAR_ART_ROWS,
    FAINTED_RIM,
    PixelShape,
    bagButtonRow,
    moveSlotRow,
    IconCanvas,
    ItemSquare,
    ItemGrid,
    ScrollBox,
    TooltipLayer,
    showTooltip,
    hideTooltip,
    tooltipHandlers,
    Cursor,
    RosterCard,
    ROSTER_ART_PIXEL,
    ROSTER_ART_ROWS,
    rosterBoxGrid,
    rosterColours,
    letterRows,
    rosterFill,
    CHIP_STYLES,
    hasChip,
    Chip,
    createChipReader,
    createEffectChipReader,
    createLifeBar,
    portraitSource,
    portraitFallback,
  };

  return { ready: true, kit, addPanel, sync, setHidden, setNameSize };
})();
