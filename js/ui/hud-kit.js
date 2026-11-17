/* ============ hud-kit.js: the HUD kit's base (G.HudKit) ============
 * The HTML HUD's shared kit is four files: this one (the library check, palette, pixel shapes, the move and menu
 * buttons, the menu stage fit and button row, the selection cursor, portraits), then hud-kit-items.js,
 * hud-kit-hp-bars.js and hud-kit-chips.js, which read only from this one. js/ui/hud-overlay.js joins them into
 * G.HudOverlay.kit; panels and screens read the kit there, never from these files. Split out of hud-overlay.js on
 * 2026-11-14 (structural review F1, docs/ASCII Concept Maps/F1 - HUD Kit Split Plan.md); the code is unchanged.
 * Style: docs/HUD-STYLE.md. If a library failed to load, ready is false here and in every kit file.
 */
G.HudKit = (() => {
  const preact = window.preact,
    preactHooks = window.preactHooks,
    htmFactory = window.htm,
    preactSignals = window.preactSignals;
  const ready = !!(preact && preactHooks && htmFactory && preactSignals);
  if (!ready) {
    console.warn('[HudOverlay] Preact, htm or Signals did not load; the canvas HUD keeps its old pieces');
    return { ready: false };
  }
  const html = htmFactory.bind(preact.h),
    { signal } = preactSignals;

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

  // ---------- the menu button: the move slot shape at 1.5x (pause menu #88, End Run #103) ----------
  const SLOT_BUTTON = { artWidth: 105, artRows: 22, artPixel: 3 }; // 315 x 66 px (Jess, 2026-11-11)
  // Rim ramps (HUD-STYLE "Pause menu"): white at rest, green on focus.
  const REST_RIM = { light: '#ffffff', base: PALETTE.paper, dark: PALETTE.paperEdge },
    FOCUS_RIM = { light: '#9be895', base: '#38d030', dark: '#1d6c19' };
  // Menu buttons never take the page's keyboard focus (#89, the Enter bug from #88): a focused page button turns Enter
  // into a click on itself, so after one click Enter pressed that button instead of the green one.
  const keepPageFocus = (event) => event.preventDefault();
  /** One menu button in the move slot shape: rim colours (at rest and focused), focused body, art width, label. */
  function SlotButton({
    id,
    label,
    rim = REST_RIM,
    focusRim,
    focusBody,
    artWidth = SLOT_BUTTON.artWidth,
    focused,
    onEnter,
    onPress,
  }) {
    const rimNow = focused ? focusRim || FOCUS_RIM : rim,
      bodyNow = focused && focusBody ? focusBody : PALETTE.body;
    return html`<button
      type="button"
      class=${'pm-button' + (focused ? ' focused' : '')}
      style=${{ width: artWidth * SLOT_BUTTON.artPixel + 'px' }}
      data-action=${id}
      tabindex="-1"
      onMouseDown=${keepPageFocus}
      onMouseEnter=${onEnter}
      onClick=${onPress}
    >
      <${PixelShape}
        artWidth=${artWidth}
        artRows=${SLOT_BUTTON.artRows}
        artPixel=${SLOT_BUTTON.artPixel}
        paintRow=${(row) => moveSlotRow(row, artWidth, SLOT_BUTTON.artRows, rimNow, bodyNow)}
      />
      <span class="hud-text hud-text-30">${label}</span>
    </button>`;
  }

  // ---------- the team menu's button (assets/ui/team/btn.png, the B/W bag button), any colours (catch screen, 136b) ----------
  /**
   * The rip's left end, one letter per art pixel (18 rows); the middle repeats the row's last letter and the right end is
   * the mirror. o outline and inner line, L / B / D the rim's light, base and dark, G the body, space nothing.
   */
  const TEAM_BUTTON_LEFT_END = [
    '   oooo',
    '  oBLLL',
    '  oLDoo',
    ' oDLoGG',
    ' oBBoGG',
    ' oLDGGG',
    ' oLoGGG',
    'oDLoGGG',
    'oBBoGGG',
    'oBBoGGG',
    'oDLoGGG',
    ' oLoGGG',
    ' oLDGGG',
    ' oBBoGG',
    ' oDLoGG',
    '  oLDoo',
    '  oBLLL',
    '   oooo',
  ];
  const TEAM_BUTTON = { artRows: TEAM_BUTTON_LEFT_END.length, artPixel: 4 };
  const teamButtonGrids = new Map();
  function teamButtonGrid(artWidth) {
    if (!teamButtonGrids.has(artWidth))
      teamButtonGrids.set(
        artWidth,
        TEAM_BUTTON_LEFT_END.map((left) => {
          const middle = left[left.length - 1].repeat(artWidth - 2 * left.length);
          return left + middle + left.split('').reverse().join('');
        })
      );
    return teamButtonGrids.get(artWidth);
  }
  /**
   * A button in the team menu's shape: rim ramps ({ light, base, dark }) at rest and focused, body colours, the label left
   * aligned as in the team menu. Never takes the page's keyboard focus (see keepPageFocus). artPixel: screen pixels per
   * art pixel (4 by default, the catch screen; the Main Menu Shop's Exit uses 3, #149a). disabled: the button cannot be
   * pressed at all; the screen dims it and keeps its cursor off it (a Buy that refuses is not disabled, #151).
   */
  function TeamButton({
    id,
    label,
    artWidth,
    artPixel = TEAM_BUTTON.artPixel,
    rim,
    focusRim,
    body = PALETTE.body,
    focusBody,
    focused,
    disabled = false,
    onEnter,
    onPress,
  }) {
    const rimNow = focused ? focusRim || rim : rim,
      bodyNow = focused && focusBody ? focusBody : body;
    const colours = { o: PALETTE.outline, L: rimNow.light, B: rimNow.base, D: rimNow.dark, G: bodyNow };
    return html`<button
      type="button"
      class=${'hud-team-button' + (focused ? ' focused' : '')}
      style=${{ width: artWidth * artPixel + 'px', height: TEAM_BUTTON.artRows * artPixel + 'px' }}
      data-action=${id}
      disabled=${disabled}
      tabindex="-1"
      onMouseDown=${keepPageFocus}
      onMouseEnter=${onEnter}
      onClick=${onPress}
    >
      <${PixelShape}
        artWidth=${artWidth}
        artRows=${TEAM_BUTTON.artRows}
        artPixel=${artPixel}
        paintRow=${letterRows(teamButtonGrid(artWidth), colours)}
      />
      <span class="hud-team-button-label">${label}</span>
    </button>`;
  }

  // ---------- the menu screens' stage (pause menu, End Run, EV screen): 1920 x 1080, scaled to fit, never up ----------
  const STAGE = { width: 1920, height: 1080 };
  /** Keeps root's --pm-scale fitted to the window from now on. Returns the fit, to call again when the screen opens. */
  function fitToStage(root) {
    const fit = () => {
      const scale = Math.min(1, innerWidth / STAGE.width, innerHeight / STAGE.height);
      root.style.setProperty('--pm-scale', String(scale));
    };
    addEventListener('resize', fit);
    fit();
    return fit;
  }

  // ---------- a row of menu buttons on the end of run screens (End Run, EV screen) ----------
  /**
   * focus is the green button's index (a signal, a hover sets it too). keys() moves it with Move_Left / Move_Right (the
   * hover sound) and presses with either Enter key; it does nothing while the shared ask dialog or Settings is up.
   * press(index), also what a click calls, checks isOpen(), focuses the button and calls onPress(index).
   */
  function createButtonRow({ count, isOpen, onPress }) {
    const focus = signal(0);
    function press(index) {
      if (!isOpen() || index < 0 || index >= count()) return;
      focus.value = index;
      onPress(index);
    }
    function keys() {
      if (!isOpen() || G.UI.isOpen('scr-ask') || G.SettingsUI.isOpen) return;
      const step = (G.Input.action('move_right') ? 1 : 0) - (G.Input.action('move_left') ? 1 : 0);
      if (step) {
        const next = Math.max(0, Math.min(count() - 1, focus.value + step));
        if (next !== focus.value) G.Audio.sfx('hover');
        focus.value = next;
      }
      if (G.Input.tap('enter') || G.Input.tap('numpadenter')) press(focus.value);
    }
    return { focus, press, keys };
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

  // ---------- the input mode: which device moves the selection cursor (Jess, 2026-11-16, #149a) ----------
  // 'keys' after any key press: the cursor shows on the last item it was on. 'mouse' once the mouse really moves (more
  // than MOUSE_JITTER_PX from where it was when the keys took over, so a jitter does not count) or clicks: the cursor
  // shows only on the eligible item under the mouse, or nowhere. One page-wide signal; screens read inputMode.value.
  const MOUSE_JITTER_PX = 6;
  const inputMode = signal('keys');
  let mouseAnchor = null; // where the mouse was first seen since the keys took over
  addEventListener(
    'keydown',
    () => {
      mouseAnchor = null;
      if (inputMode.value !== 'keys') inputMode.value = 'keys';
    },
    true
  );
  addEventListener(
    'mousemove',
    (event) => {
      if (inputMode.value === 'mouse') return;
      if (!mouseAnchor) mouseAnchor = { x: event.clientX, y: event.clientY };
      else if (Math.hypot(event.clientX - mouseAnchor.x, event.clientY - mouseAnchor.y) > MOUSE_JITTER_PX)
        inputMode.value = 'mouse';
    },
    true
  );
  addEventListener('mousedown', () => (inputMode.value = 'mouse'), true);

  // ---------- portraits (HUD-STYLE "Assets": SpriteCollab Normal face, 40x40) ----------
  const PORTRAIT_PATH = 'assets/pokemon/';
  const portraitSource = (dex, shiny) => PORTRAIT_PATH + dex + (shiny ? '/s/Portrait.png' : '/Portrait.png');
  /** onError for a portrait <img>: a shiny with no portrait of its own (#958) falls back to the normal face. */
  function portraitFallback(event) {
    const image = event.target,
      normal = portraitSource(image.dataset.dex, false);
    if (!image.src.endsWith(normal)) image.src = normal;
  }

  // HP_COLOURS and BAR_CHECKER are for the other kit files only; G.HudOverlay.kit leaves them out.
  return {
    ready: true,
    preact,
    hooks: preactHooks,
    html,
    signal,
    PALETTE,
    FAINTED_RIM,
    HP_COLOURS,
    typeColours,
    hpBand,
    BAR_CHECKER,
    SLOT_GRID,
    PixelShape,
    letterRows,
    moveSlotRow,
    SLOT_BUTTON,
    REST_RIM,
    SlotButton,
    TeamButton,
    FOCUS_RIM,
    fitToStage,
    createButtonRow,
    Cursor,
    inputMode,
    portraitSource,
    portraitFallback,
  };
})();
