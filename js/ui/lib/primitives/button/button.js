/* ============ button.js: the pixel-art buttons (G.Lib.Button; #155 155b) ============
 * The library's buttons, named by their look (decision 2026-11-18-155-library-pieces-named-by-look):
 *   button.slanted  SlantedButton: the run screen's move slot shape at 1.5x, angled ends (pause menu, End Run, EV)
 *   button.rounded  RoundedButton: the B/W bag button (assets/ui/team/btn.png), rounded ends (catch screen, menus)
 *   button.glitch   GlitchButton: the code's voice, a cut corner and a bar, in Michroma; it replaces the other two on
 *                   every screen at #126 (decision 2026-11-18-155-button-glitch-replaces-slanted-and-rounded). First
 *                   used by the Main Menu Shop (#128 S6). Ported whole from the board (tools/library/glitch-draft.js).
 * Props only, never game state: the screen passes the label, size, rims, body and state, and owns onEnter and onPress.
 * Moved from js/ui/hud-kit.js (155b; it passes them on to the screens), plus button.rounded's refused.
 * Colours: js/ui/lib/tokens/tokens.js. Style: button.css. Board: tools/library.html, Primitives, Buttons (stories in
 * button.story.js). Plan: docs/AI Outputs/Issue-155/155b - Buttons Plan.md. Look: docs/HUD-STYLE.md.
 */
G.Lib = G.Lib || {};
G.Lib.Button = (() => {
  const preact = window.preact,
    preactHooks = window.preactHooks,
    htmFactory = window.htm,
    pixels = G.Lib.Pixels;
  if (!preact || !preactHooks || !htmFactory || !pixels || !pixels.ready) return { ready: false };
  const html = htmFactory.bind(preact.h),
    { PixelShape, letterRows } = pixels;
  const OUTLINE = G.Tokens.color('color.hud.outline'),
    BODY = G.Tokens.color('color.hud.body');

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
    if (row === 0 || row === artRows - 1) return [[left, right - left + 1, OUTLINE]];
    const inner = row === 1 || row === artRows - 2 ? rim.dark : null;
    const ends = [
      [left, 1, OUTLINE],
      [left + 1, 1, rim.light],
      [left + 2, 1, rim.base],
      [left + 3, 1, OUTLINE],
      [right - 3, 1, OUTLINE],
      [right - 2, 1, rim.base],
      [right - 1, 1, rim.light],
      [right, 1, OUTLINE],
    ];
    return [[left + 4, right - 3 - (left + 4), inner || bodyFill], ...ends];
  }

  // ---------- button.slanted: the move slot shape at 1.5x (pause menu #88, End Run #103) ----------
  const SLANTED_BUTTON = { artWidth: 105, artRows: 22, artPixel: 3 }; // 315 x 66 px (Jess, 2026-11-11)
  // Rim ramps (HUD-STYLE "Pause menu"): white at rest, green on focus.
  const REST_RIM = G.Tokens.ramp('color.rim.rest'),
    FOCUS_RIM = G.Tokens.ramp('color.rim.focus');
  // Menu buttons never take the page's keyboard focus (#89, the Enter bug from #88): a focused page button turns Enter
  // into a click on itself, so after one click Enter pressed that button instead of the green one.
  const keepPageFocus = (event) => event.preventDefault();
  /** One menu button in the move slot shape: rim colours (at rest and focused), focused body, art width, label. */
  function SlantedButton({
    id,
    label,
    rim = REST_RIM,
    focusRim,
    focusBody,
    artWidth = SLANTED_BUTTON.artWidth,
    focused,
    onEnter,
    onPress,
  }) {
    const rimNow = focused ? focusRim || FOCUS_RIM : rim,
      bodyNow = focused && focusBody ? focusBody : BODY;
    return html`<button
      type="button"
      class=${'pm-button' + (focused ? ' focused' : '')}
      style=${{ width: artWidth * SLANTED_BUTTON.artPixel + 'px' }}
      data-action=${id}
      tabindex="-1"
      onMouseDown=${keepPageFocus}
      onMouseEnter=${onEnter}
      onClick=${onPress}
    >
      <${PixelShape}
        artWidth=${artWidth}
        artRows=${SLANTED_BUTTON.artRows}
        artPixel=${SLANTED_BUTTON.artPixel}
        paintRow=${(row) => moveSlotRow(row, artWidth, SLANTED_BUTTON.artRows, rimNow, bodyNow)}
      />
      <span class="hud-text hud-text-30">${label}</span>
    </button>`;
  }

  // ---------- button.rounded: the B/W bag button (assets/ui/team/btn.png), rounded ends, any colours ----------
  /**
   * The rip's left end, one letter per art pixel (18 rows); the middle repeats the row's last letter and the right end is
   * the mirror. o outline and inner line, L / B / D the rim's light, base and dark, G the body, space nothing.
   */
  const ROUNDED_BUTTON_LEFT_END = [
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
  const ROUNDED_BUTTON = { artRows: ROUNDED_BUTTON_LEFT_END.length, artPixel: 4 };
  const roundedButtonGrids = new Map();
  function roundedButtonGrid(artWidth) {
    if (!roundedButtonGrids.has(artWidth))
      roundedButtonGrids.set(
        artWidth,
        ROUNDED_BUTTON_LEFT_END.map((left) => {
          const middle = left[left.length - 1].repeat(artWidth - 2 * left.length);
          return left + middle + left.split('').reverse().join('');
        })
      );
    return roundedButtonGrids.get(artWidth);
  }
  /**
   * A button in the team menu's shape: rim ramps ({ light, base, dark }) at rest and focused, body colours, the label left
   * aligned as in the team menu. Never takes the page's keyboard focus (see keepPageFocus). artPixel: screen pixels per
   * art pixel (4 by default, the catch screen; the Main Menu Shop's Exit uses 3, #149a). disabled: the button cannot be
   * pressed at all; the screen dims it and keeps its cursor off it (a Buy that refuses is not disabled, #151). refused
   * (#151, 155b): a press only says why (the screen's sound and toast); the rim stays and the label greys (button.css).
   */
  function RoundedButton({
    id,
    label,
    artWidth,
    artPixel = ROUNDED_BUTTON.artPixel,
    rim,
    focusRim,
    body = BODY,
    focusBody,
    focused,
    disabled = false,
    refused = false,
    onEnter,
    onPress,
  }) {
    const rimNow = focused ? focusRim || rim : rim,
      bodyNow = focused && focusBody ? focusBody : body;
    const colours = { o: OUTLINE, L: rimNow.light, B: rimNow.base, D: rimNow.dark, G: bodyNow };
    return html`<button
      type="button"
      class=${'hud-team-button' + (focused ? ' focused' : '') + (refused ? ' refused' : '')}
      style=${{ width: artWidth * artPixel + 'px', height: ROUNDED_BUTTON.artRows * artPixel + 'px' }}
      data-action=${id}
      disabled=${disabled}
      tabindex="-1"
      onMouseDown=${keepPageFocus}
      onMouseEnter=${onEnter}
      onClick=${onPress}
    >
      <${PixelShape}
        artWidth=${artWidth}
        artRows=${ROUNDED_BUTTON.artRows}
        artPixel=${artPixel}
        paintRow=${letterRows(roundedButtonGrid(artWidth), colours)}
      />
      <span class="hud-team-button-label">${label}</span>
    </button>`;
  }

  // ---------- button.glitch (decisions 2026-11-18-155-button-glitch-replaces-slanted-and-rounded and
  // 2026-11-20-155-button-glitch-rest-body-is-transparent) ----------
  // A body with its bottom-left corner cut at 45 degrees and a bar down its right side, outside the body; the label in
  // Michroma (font.hudModule), centred. Every look is button.css, from the Unified tokens:
  //   rest      a transparent body, so it takes the colour of whatever it sits on; the bar and the label grey.white
  //   focus     under the cursor, or the mouse over it: one swipe from the right edge uncovers the intent's body with a
  //             grey.ink bar and label; the rest bar takes the focus bar's colour (no 1 px sliver, Jess 2026-11-20)
  //   press     a CRT switching off (the label to a line to a dot, held while pressed); release: switching on
  //   refused   it says "not now" (#151): grey.mid bar and label; under the cursor a grey.mid body with the bar in the
  //             intent's colour, so it still shows what it would do; a press shakes it sideways and does not switch off
  //   disabled  not an option: rest only, grey.mid bar and grey.slate label, no swipe and no press
  //   secret    the glitch state for the meta-narrative (nothing calls it yet): slices of the focused look jump in hard
  //             steps, the label split into two offset colours, in bursts (GLITCH_BURSTS)
  // The intent (Jess 2026-11-18) only picks the focus body: neutral the standard (teal), negative takes or gives
  // something away (red), positive spends something (green): the class glitch-<intent> in button.css.
  const GLITCH = { barWidth: 6, fontSize: 18 }; // px: the bar outside the body; the label's size when none is given
  // ms, the board's drafts (for the feel test): the swipe, the press (CRT off), the release (CRT on), the refused
  // shake; cursor.ring plays its CRT on the same timings (js/ui/lib/primitives/cursor/cursor.js).
  const GLITCH_TIMING = { swipeMs: 120, pressMs: 80, releaseMs: 70, shakeMs: 120 };
  // the secret state's bursts: burst (ms one lasts), gap (ms between them), count (how many; Infinity for forever)
  const GLITCH_BURSTS = {
    first: { burst: 400, gap: 0, count: 1 }, // the first time the glitch happens: one short burst (Jess)
    loop: { burst: 1000, gap: 1000, count: Infinity }, // a repeating glitch
  };
  const px = (value) => value + 'px';
  // a mouse press releases wherever the pointer comes up: CSS has no "just stopped being pressed" state
  let releaseHeldGlitch = null;
  addEventListener(
    'pointerup',
    () => {
      const release = releaseHeldGlitch;
      releaseHeldGlitch = null;
      if (release) release();
    },
    true
  );

  /** Plays the secret state's bursts on its slices layer until the layer leaves the page. */
  function playGlitchBursts(layer, { burst, gap, count }) {
    let played = 0;
    const next = () => {
      if (!layer.isConnected || played >= count) return;
      played++;
      layer.style.animationDuration = burst + 'ms';
      layer.classList.remove('bursting');
      void layer.offsetWidth; // restart the keyframes
      layer.classList.add('bursting');
      setTimeout(next, burst + gap);
    };
    next();
  }

  /**
   * One button.glitch: at a fixed size (width in px, its bar included, and height), or with no width as wide and tall
   * as its label and the board's padding (the dialog's answers; class glitch-fit); fontSize the label's px. intent:
   * neutral, negative or positive. focused: under the cursor (the screen decides, by keys or the mouse). refused: a
   * press only says why (the screen's sound and toast); disabled: it cannot be pressed at all. held: a toggle that is
   * on (#167), it keeps the focus look and its bar turns yellow under the cursor. mirrored: the shape flipped left to
   * right (cut corner, bar and swipe), the label not (Jess 2026-11-26). pressCount: the screen
   * bumps it each time a key presses this button, so it plays its press by keys too. secret: one of GLITCH_BURSTS, or
   * null. id goes on data-action. Never takes the page's keyboard focus (see keepPageFocus).
   */
  function GlitchButton({
    id,
    label,
    intent = 'neutral',
    width,
    height,
    fontSize = GLITCH.fontSize,
    focused = false,
    held = false,
    refused = false,
    disabled = false,
    mirrored = false,
    pressCount = 0,
    secret = null,
    onEnter,
    onPress,
  }) {
    const [phase, setPhase] = preactHooks.useState(null), // 'pressed', 'released', 'shaking' or null
      timer = preactHooks.useRef(null),
      slices = preactHooks.useRef(null);
    /** Plays [[phase, ms], ...] one after another, then back to no phase. */
    const play = (steps) => {
      clearTimeout(timer.current);
      const next = (index) => {
        if (index >= steps.length) return setPhase(null);
        setPhase(steps[index][0]);
        timer.current = setTimeout(() => next(index + 1), steps[index][1]);
      };
      next(0);
    };
    const keyPressSteps = () =>
      refused
        ? [['shaking', GLITCH_TIMING.shakeMs]]
        : [
            ['pressed', GLITCH_TIMING.pressMs],
            ['released', GLITCH_TIMING.releaseMs],
          ];
    function onPointerDown(event) {
      if (disabled || event.button !== 0) return;
      if (refused) return play(keyPressSteps());
      clearTimeout(timer.current);
      setPhase('pressed'); // held: the dot stays until the pointer comes up
      releaseHeldGlitch = () => play([['released', GLITCH_TIMING.releaseMs]]);
    }
    preactHooks.useEffect(() => {
      if (pressCount && !disabled) play(keyPressSteps());
    }, [pressCount]);
    preactHooks.useEffect(() => {
      if (secret && slices.current) playGlitchBursts(slices.current, secret);
    }, [secret]);
    preactHooks.useEffect(() => () => clearTimeout(timer.current), []);
    const fitted = width == null,
      size = fitted ? {} : { width: px(width - GLITCH.barWidth), height: px(height) };
    const states = [
      fitted && 'glitch-fit',
      focused && 'focused',
      held && 'held',
      refused && 'refused',
      disabled && 'disabled',
      mirrored && 'mirrored',
      phase,
    ];
    const classes = ['glitch-button', 'glitch-' + intent, ...states].filter(Boolean).join(' ');
    return html`<button
      type="button"
      class=${classes}
      style=${{
        ...size,
        fontSize: px(fontSize),
        '--glitch-swipe': GLITCH_TIMING.swipeMs + 'ms',
        '--glitch-press': GLITCH_TIMING.pressMs + 'ms',
        '--glitch-release': GLITCH_TIMING.releaseMs + 'ms',
        '--glitch-shake': GLITCH_TIMING.shakeMs + 'ms',
      }}
      data-action=${id}
      data-label=${label}
      disabled=${disabled}
      tabindex="-1"
      onMouseDown=${keepPageFocus}
      onPointerDown=${onPointerDown}
      onMouseEnter=${onEnter}
      onClick=${onPress}
    >
      <span class="glitch-label">${label}</span>
      ${secret ? html`<span class="glitch-slices" aria-hidden="true" ref=${slices}>${label}</span>` : null}
    </button>`;
  }

  return {
    ready: true,
    moveSlotRow,
    SLANTED_BUTTON,
    ROUNDED_BUTTON,
    REST_RIM,
    FOCUS_RIM,
    SlantedButton,
    RoundedButton,
    GLITCH,
    GLITCH_TIMING,
    GLITCH_BURSTS,
    GlitchButton,
  };
})();
