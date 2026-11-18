/* ============ hud-kit.js: the HUD kit's base (G.HudKit) ============
 * The HTML HUD's shared kit is four files: this one (the library check, palette, the menu stage fit and button row, the
 * selection cursor, portraits; it passes on the UI library's pixel shapes and menu buttons from js/ui/lib/primitives/,
 * #155 155b), then hud-kit-items.js,
 * hud-kit-hp-bars.js and hud-kit-chips.js, which read only from this one. js/ui/hud-overlay.js joins them into
 * G.HudOverlay.kit; panels and screens read the kit there, never from these files. Split out of hud-overlay.js on
 * 2026-11-14 (structural review F1, docs/ASCII Concept Maps/F1 - HUD Kit Split Plan.md); the code is unchanged.
 * Style: docs/HUD-STYLE.md. If a library failed to load, ready is false here and in every kit file.
 */
G.HudKit = (() => {
  const preact = window.preact,
    preactHooks = window.preactHooks,
    htmFactory = window.htm,
    preactSignals = window.preactSignals,
    pixels = G.Lib && G.Lib.Pixels,
    buttons = G.Lib && G.Lib.Button;
  const libraryReady = !!(pixels && pixels.ready && buttons && buttons.ready);
  const ready = !!(preact && preactHooks && htmFactory && preactSignals && libraryReady);
  if (!ready) {
    console.warn('[HudOverlay] Preact, htm, Signals or the UI library did not load; the canvas HUD keeps its pieces');
    return { ready: false };
  }
  const html = htmFactory.bind(preact.h),
    { signal } = preactSignals;

  // ---------- palette (HUD-STYLE "Colour palette"): the design tokens color.hud.* (js/ui/lib/tokens/tokens.js), where
  // each colour has its job ----------
  const PALETTE = {};
  for (const key of [
    'outline',
    'body',
    'frame',
    'checker',
    'slate',
    'trackShade',
    'trackLight',
    'typeBodyDark',
    'typeBodyLight',
    'expFill',
    'expShade',
    'lvFill',
    'lvShade',
    'lvDark',
    'cursor',
    'trackEdge',
    'paperEdge',
    'paper',
  ])
    PALETTE[key] = G.Tokens.color('color.hud.' + key);
  // A fainted roster row's rim: the greys of the panel, as a type ramp (HUD-STYLE "Roster rows").
  const FAINTED_RIM = G.Tokens.ramp('color.rim.fainted');
  const HP_COLOURS = {};
  for (const band of ['high', 'middle', 'low'])
    HP_COLOURS[band] = {
      fill: G.Tokens.color('color.hp.' + band + '.fill'),
      shade: G.Tokens.color('color.hp.' + band + '.shade'),
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

  // ---------- pixel shapes and the menu buttons: the UI library's primitives (js/ui/lib/primitives/, 155b) ----------
  const { PixelShape, letterRows } = pixels;
  const { moveSlotRow, SLOT_BUTTON, REST_RIM, FOCUS_RIM, SlotButton, TeamButton } = buttons;

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
  // the species whose shiny has no portrait of its own (no assets/pokemon/<dex>/s/Portrait.png): their shinies show the
  // normal face without asking for the missing file first (the Shop's Pokebox grid draws hundreds of copies, #149 149f)
  const NO_SHINY_PORTRAIT = new Set([588, 820, 847, 868, 896, 916, 933, 958, 1007]);
  const portraitSource = (dex, shiny) =>
    PORTRAIT_PATH + dex + (shiny && !NO_SHINY_PORTRAIT.has(+dex) ? '/s/Portrait.png' : '/Portrait.png');
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
