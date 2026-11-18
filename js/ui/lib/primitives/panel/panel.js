/* ============ panel.js: the panels and the card (G.Lib.Panel; #155 155c) ============
 * The library's frames, named by their look (decision 2026-11-18-155-library-pieces-named-by-look):
 *   panel.pixel    PixelPanel: the B2 roster box (corner bumps, a light / base / dark rim) at 2 px per art pixel with a
 *                  flat body, any size; a second rim ramp blends left to right (a dual-type Pokemon)
 *   panel.thin     ThinPanel: a 2 px flat rim on a flat body (the menu windows' cards)
 *   card.vertical  VerticalCard: a thin panel with a picture on top, a divider, a name, a description and a button
 *                  at the bottom; lit, dimmed, or dimmed with its button still lit
 *   panel.flat     FlatPanel and the panel-flat class: the windows' flat body, 1 px frame and 2 px outline (the pause
 *                  menu's Run Info and detail panels, the Shop and Inventory, the catch and EV screens; 155c-2)
 *   card.horizontal  HorizontalCard: the B2 run item box (a picture in a white patch, a name band, text beside it), any
 *                  width and art pixel; a team item slot (155c-2, moved from js/ui/hud-kit-items.js RunItemBox)
 * Props only, never game state: the screen passes the picture and the button as content. Moved from
 * js/ui/hud-kit-hp-bars.js (Box, the roster box shape) and js/ui/menu-window-kit.js (ItemCard's layout, CARD), which
 * pass them on to the screens. Style: panel.css. Board: tools/library.html, Primitives, Panels (panel.story.js).
 * Plan: docs/ASCII Concept Maps/155c - Panels Plan.md. Look: docs/HUD-STYLE.md "Roster rows".
 */
G.Lib = G.Lib || {};
G.Lib.Panel = (() => {
  const preact = window.preact,
    preactHooks = window.preactHooks,
    htmFactory = window.htm,
    pixels = G.Lib.Pixels,
    buttons = G.Lib.Button;
  if (!preact || !preactHooks || !htmFactory || !pixels || !pixels.ready || !buttons || !buttons.ready)
    return { ready: false };
  const html = htmFactory.bind(preact.h),
    { PixelShape, letterRows, PATTERNS } = pixels;
  const HUD_COLOUR = (key) => G.Tokens.color('color.hud.' + key);
  const OUTLINE = G.Tokens.color('color.hud.outline'),
    BODY = G.Tokens.color('color.hud.body');

  // ---------- panel.pixel: the B2 roster box (b2-lower Y15 to AA16, HUD-STYLE "Roster rows") ----------
  const PIXEL_PANEL = { artPixel: 2 };
  // The left end of the rip's top 8 rows and one straight row, one letter per art pixel from the box's left edge; the
  // rest of each row is its last letter's fill. The right end is the mirror, the bottom 8 rows the top's mirror.
  //   o outline, D / B / L the rim's dark, base and light, G the body, space nothing.
  const PIXEL_PANEL_LEFT_END = [
    ['      oooo', ' '], // the corner bump rises above the top edge
    ['     oDBBDo', ' '],
    ['    oDBooBD', 'o'],
    ['   oDBoLBo', 'B'],
    ['  oDBoLLL', 'o'],
    [' oDBoLLLo', 'G'],
    ['oDBoLLLo', 'G'],
    ['oBoLLL', 'G'],
  ];
  const PIXEL_PANEL_STRAIGHT_LEFT = ['oBoLLo', 'G'];

  /** The panel as a grid of letters, one string per art row (the run HUD's roster rows stamp their HP bar on it). */
  const pixelPanelGrids = new Map();
  function pixelPanelRows(artWidth, artRows) {
    const cacheKey = artWidth + 'x' + artRows;
    if (pixelPanelGrids.has(cacheKey)) return pixelPanelGrids.get(cacheKey);
    const rowOf = ([left, fill]) => left + fill.repeat(artWidth - 2 * left.length) + left.split('').reverse().join('');
    const rows = [];
    for (let row = 0; row < artRows; row++) {
      const fromTop = Math.min(row, artRows - 1 - row);
      const end = fromTop < PIXEL_PANEL_LEFT_END.length ? PIXEL_PANEL_LEFT_END[fromTop] : PIXEL_PANEL_STRAIGHT_LEFT;
      rows.push(rowOf(end));
    }
    pixelPanelGrids.set(cacheKey, rows);
    return rows;
  }
  /** The letters' colours for a rim ramp ({ light, base, dark }) and the body inside. */
  const pixelPanelColours = (rim, body) => ({ o: OUTLINE, D: rim.dark, B: rim.base, L: rim.light, G: body });

  /**
   * A pixel panel at any size (width and height in px, even): rimmed in `rim`, its contents go inside. rimRight
   * (optional): a second ramp for the right side, the rim blending from rim to rimRight across the top and bottom (a
   * dual-type Pokemon, Jess 2026-11-16). body: the flat inside's colour, the panel body by default.
   */
  let panelGradientCount = 0;
  function PixelPanel({ left, top, width, height, rim, rimRight, body = BODY, className, children }) {
    const artWidth = width / PIXEL_PANEL.artPixel,
      artRows = height / PIXEL_PANEL.artPixel;
    const gradientId = preactHooks.useMemo(() => 'hud-box-rim-' + ++panelGradientCount, []);
    const blended = rimRight && (rimRight.base !== rim.base || rimRight.light !== rim.light);
    const shade = (part) => (blended ? 'url(#' + gradientId + '-' + part + ')' : rim[part]);
    const colours = pixelPanelColours({ light: shade('light'), base: shade('base'), dark: shade('dark') }, body);
    return html`<div
      class=${'pm-box' + (className ? ' ' + className : '')}
      style=${{ left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' }}
    >
      ${
        blended
          ? html`<svg class="pm-box-gradients" width="0" height="0" aria-hidden="true">
              <defs>
                ${['light', 'base', 'dark'].map(
                  (part) =>
                    html`<linearGradient
                      key=${part}
                      id=${gradientId + '-' + part}
                      gradientUnits="userSpaceOnUse"
                      x1="0"
                      y1="0"
                      x2=${artWidth}
                      y2="0"
                    >
                      <stop offset="0.1" stop-color=${rim[part]} />
                      <stop offset="0.9" stop-color=${rimRight[part]} />
                    </linearGradient>`
                )}
              </defs>
            </svg>`
          : null
      }
      <${PixelShape}
        artWidth=${artWidth}
        artRows=${artRows}
        artPixel=${PIXEL_PANEL.artPixel}
        paintRow=${letterRows(pixelPanelRows(artWidth, artRows), colours)}
      />
      ${children}
    </div>`;
  }

  // ---------- panel.thin: a 2 px flat rim on a flat body (colours: panel.css, from tokens) ----------
  const THIN_PANEL = { rim: 2 };
  /** A thin panel: the screen gives its size and place in style; attrs adds data attributes. */
  function ThinPanel({ className, style, attrs, children }) {
    return html`<div class=${'panel-thin' + (className ? ' ' + className : '')} style=${style} ...${attrs || {}}>
      ${children}
    </div>`;
  }

  // ---------- card.vertical: the menu windows' card (149c), 186 x 350 by default ----------
  // room for a six-line description above the button; the button is the rounded one at 3 px per art pixel
  const CARD = {
    width: 186,
    height: 350,
    gap: 12,
    textInset: 10,
    iconSize: 64,
    iconTop: 12,
    dividerTop: 88,
    nameTop: 100,
    descriptionTop: 130,
    buttonArtWidth: 58,
    buttonArtPixel: 3,
    buttonBottom: 10,
  };
  CARD.buttonWidth = CARD.buttonArtWidth * CARD.buttonArtPixel; // 174
  CARD.buttonHeight = buttons.ROUNDED_BUTTON.artRows * CARD.buttonArtPixel; // 54
  const px = (value) => value + 'px';
  /** Where a card width wide places its button: centred, buttonBottom above the bottom rim. */
  const cardButtonPlace = (width = CARD.width) => ({
    left: px((width - 2 * THIN_PANEL.rim - CARD.buttonWidth) / 2),
    top: px(CARD.height - 2 * THIN_PANEL.rim - CARD.buttonBottom - CARD.buttonHeight),
  });
  /**
   * A vertical card: picture (drawn in the picture box), name, description, and button (placed by the screen with
   * cardButtonPlace, class shop-card-buy). dimmed: the whole card at the locked look; buttonLit (#137c): with dimmed,
   * everything but the button dims. attrs adds data attributes (the screen's item id, the cursor's whole-card mark).
   */
  function VerticalCard({ width = CARD.width, picture, name, description, button, dimmed, buttonLit, attrs }) {
    const inner = width - 2 * THIN_PANEL.rim;
    return html`<${ThinPanel}
      className=${'shop-card' + (dimmed ? (buttonLit ? ' is-dimmed-but-button' : ' is-dimmed') : '')}
      style=${{ width: px(width), height: px(CARD.height) }}
      attrs=${attrs}
    >
      <div class="shop-card-icon" style=${{ left: px((inner - CARD.iconSize) / 2), top: px(CARD.iconTop) }}>
        ${picture}
      </div>
      <div
        class="shop-card-divider"
        style=${{ left: px(CARD.textInset), right: px(CARD.textInset), top: px(CARD.dividerTop) }}
      ></div>
      <div
        class="hud-text shop-card-name"
        style=${{ left: px(CARD.textInset), right: px(CARD.textInset), top: px(CARD.nameTop) }}
      >
        ${name}
      </div>
      <div
        class="hud-text shop-card-description"
        style=${{ left: px(CARD.textInset), right: px(CARD.textInset), top: px(CARD.descriptionTop) }}
      >
        ${description}
      </div>
      ${button}
    </${ThinPanel}>`;
  }

  // ---------- panel.flat: the windows' flat frame (colours: panel.css, from tokens) ----------
  /** A flat panel: the screen gives its size and place in style;
   *  screens with their own markup add the panel-flat class. */
  function FlatPanel({ className, style, attrs, children }) {
    return html`<div class=${'panel-flat' + (className ? ' ' + className : '')} style=${style} ...${attrs || {}}>
      ${children}
    </div>`;
  }

  // ---------- card.horizontal: the B2 run item box (b2-lower AD4 to AG5), a team item slot ----------
  // The run screen draws it at 2 px per art pixel and 140 wide; the Main Menu Inventory sizes it up. Look and numbers:
  // docs/HUD-STYLE.md "Run items". Its shape keeps the run item box's names (RUN_BOX_*, runBox*).
  const RUN_BOX_ROWS = 32,
    RUN_BOX_MIDDLE = (RUN_BOX_ROWS - 1) / 2,
    // the name inside the box's top band (#94, Jess 2026-11-11): from just inside the top rim down to the patch, left
    // aligned over the patch and running across the band, squeezed sideways when it is wider
    RUN_NAME = { artTop: 4, inset: 1 }, // art rows: the rim's first inside row; art pixels: how far into the slant
    RUN_PATCH = { artTop: 13, artWidth: 22 }, // the white patch: from the box's flat middle down to its bottom edge
    RUN_TEXT = { gap: 4, bottom: 3, right: 10 }, // art pixels: the text area right of the patch, from the patch's top down
    RUN_ICON_ART = 16, // the icon's size in art pixels (32 px at the run screen's 2)
    RUN_PATCH_LEFT_INSET = 6; // the patch starts right inside the rim
  /** The ends' slant: flat for 6 rows in the middle, then one pixel in for every three rows out (the rip's slope). */
  const runBoxEdge = (row) => {
    const out = Math.abs(row - RUN_BOX_MIDDLE) - 2.5;
    return out <= 0 ? 0 : Math.ceil(out / 3);
  };
  // The left end of each row, one letter per art pixel from that row's edge; the rest of the row is its last letter's fill.
  // The right end is the mirror, the bottom rows the top's mirror.
  //   o outline, D / B / L the Lv yellow's dark, shade and fill, G the body grid, space nothing.
  const RUN_BOX_TOP_ROWS = [
    ['ooooo', ' '], // the corner bump
    ['oBBBD', 'o'],
    ['oBDooD', 'B'],
    ['oBoLLo', 'o'],
  ];
  const RUN_BOX_BODY_ROW = ['oBoLLo', 'G'];
  const RUN_BOX_COLOURS = {
    o: HUD_COLOUR('outline'),
    D: HUD_COLOUR('lvDark'),
    B: HUD_COLOUR('lvShade'),
    L: HUD_COLOUR('lvFill'),
    G: PATTERNS.slotGrid,
    P: HUD_COLOUR('paper'),
    e: HUD_COLOUR('paperEdge'),
  };

  /** The box's letter grid, one string per art row, for a box artWidth art pixels wide. */
  function runBoxGrid(artWidth) {
    const rows = RUN_BOX_ROWS,
      grid = [];
    for (let row = 0; row < rows; row++) {
      const fromTop = Math.min(row, rows - 1 - row),
        [left, fill] = fromTop < RUN_BOX_TOP_ROWS.length ? RUN_BOX_TOP_ROWS[fromTop] : RUN_BOX_BODY_ROW,
        edge = runBoxEdge(row),
        right = left.split('').reverse().join('');
      grid.push(
        (' '.repeat(edge) + left + fill.repeat(artWidth - 2 * edge - 2 * left.length) + right + ' '.repeat(edge)).split(
          ''
        )
      );
    }
    // the white patch: its top edge, the paper, a shaded right edge; it runs down through the bottom rim to the outline
    for (let row = RUN_PATCH.artTop; row < rows - 1; row++) {
      const left = runBoxEdge(row) + RUN_PATCH_LEFT_INSET,
        right = left + RUN_PATCH.artWidth - 1;
      for (let column = left; column <= right; column++)
        grid[row][column] = row === RUN_PATCH.artTop || row === rows - 2 || column === right ? 'e' : 'P';
    }
    const bottomEdge = runBoxEdge(rows - 1);
    for (let column = bottomEdge; column <= runBoxEdge(rows - 2) + RUN_PATCH_LEFT_INSET + RUN_PATCH.artWidth; column++)
      grid[rows - 1][column] = 'o';
    return grid.map((line) => line.join(''));
  }

  /** Everything a box of this width and art pixel needs (made once per size): its row painter and its places. */
  const runBoxShapes = new Map();
  function runBoxShape(artWidth, artPixel) {
    const sizeKey = artWidth + 'x' + artPixel;
    if (runBoxShapes.has(sizeKey)) return runBoxShapes.get(sizeKey);
    const grid = runBoxGrid(artWidth);
    const paintRow = letterRows(grid, RUN_BOX_COLOURS);
    const width = artWidth * artPixel,
      iconSize = RUN_ICON_ART * artPixel,
      patchMiddleRow = Math.round((RUN_PATCH.artTop + 1 + RUN_BOX_ROWS - 3) / 2);
    // The name band: its left edge lines up with the patch, kept clear of the slanted end at the band's top row.
    const nameSide = Math.max(
      (runBoxEdge(RUN_PATCH.artTop) + RUN_PATCH_LEFT_INSET) * artPixel,
      (runBoxEdge(RUN_NAME.artTop) + RUN_PATCH_LEFT_INSET - RUN_NAME.inset) * artPixel
    );
    const shape = {
      paintRow,
      width,
      height: RUN_BOX_ROWS * artPixel,
      iconSize,
      // the icon sits in the middle of the patch's paper (inside its top edge and the edges at the bottom)
      iconPlace: {
        left:
          (runBoxEdge(patchMiddleRow) + RUN_PATCH_LEFT_INSET + (RUN_PATCH.artWidth - 1) / 2) * artPixel -
          iconSize / 2 +
          'px',
        top: ((RUN_PATCH.artTop + 1 + RUN_BOX_ROWS - 2) / 2) * artPixel - iconSize / 2 + 'px',
      },
      namePlace: {
        left: nameSide + 'px',
        right: nameSide + 'px',
        top: RUN_NAME.artTop * artPixel + 'px',
        height: (RUN_PATCH.artTop - RUN_NAME.artTop) * artPixel + 'px',
      },
      nameRoom: width - 2 * nameSide,
      textPlace: {
        left: (RUN_PATCH_LEFT_INSET + RUN_PATCH.artWidth + RUN_TEXT.gap) * artPixel + 'px',
        right: RUN_TEXT.right * artPixel + 'px',
        top: RUN_PATCH.artTop * artPixel + 'px',
        bottom: RUN_TEXT.bottom * artPixel + 'px',
      },
    };
    runBoxShapes.set(sizeKey, shape);
    return shape;
  }

  /** The item's name, squeezed sideways (held at its left edge) when it is wider than the band. */
  function HorizontalCardName({ text, place, room }) {
    const ref = preactHooks.useRef(null);
    preactHooks.useLayoutEffect(() => {
      const element = ref.current;
      if (!element) return;
      element.style.transform = '';
      const width = element.scrollWidth;
      if (width > room) element.style.transform = `scaleX(${room / width})`;
    });
    return html`<div class="hud-text hud-run-name" style=${place}>
      <span ref=${ref}>${text}</span>
    </div>`;
  }

  /**
   * A horizontal card: the picture (sized by the screen to HORIZONTAL_CARD.iconArt art pixels) in the white patch, the
   * name in the top band, the text right of the patch. item: { name, text, live } or null for an empty slot (no
   * picture, name or text). artWidth and artPixel size it; dimmed draws a slot not bought yet; style places it; attrs
   * adds attributes (data-*, handlers); overlay is drawn on top (a selection cursor).
   */
  function HorizontalCard({ artWidth, artPixel, item, picture, dimmed, className, style, attrs, overlay }) {
    const shape = runBoxShape(artWidth, artPixel);
    return html`<div
      class=${'hud-run-item' + (dimmed ? ' is-dimmed' : '') + (className ? ' ' + className : '')}
      style=${{ ...style, width: shape.width + 'px', height: shape.height + 'px' }}
      ...${attrs || {}}
    >
      <${PixelShape}
        artWidth=${artWidth}
        artRows=${RUN_BOX_ROWS}
        artPixel=${artPixel}
        paintRow=${shape.paintRow}
      />
      ${
        item
          ? html`<${HorizontalCardName} text=${item.name} place=${shape.namePlace} room=${shape.nameRoom} />
              <div class="hud-run-icon" style=${shape.iconPlace}>${picture}</div>
              <div class=${'hud-text hud-run-text' + (item.live ? ' is-live' : '')} style=${shape.textPlace}>
                <span>${item.text}</span>
              </div>`
          : null
      }
      ${overlay || null}
    </div>`;
  }
  const HORIZONTAL_CARD = { artRows: RUN_BOX_ROWS, iconArt: RUN_ICON_ART };

  return {
    ready: true,
    PIXEL_PANEL,
    pixelPanelRows,
    pixelPanelColours,
    PixelPanel,
    ThinPanel,
    CARD,
    cardButtonPlace,
    VerticalCard,
    FlatPanel,
    HORIZONTAL_CARD,
    HorizontalCard,
  };
})();
