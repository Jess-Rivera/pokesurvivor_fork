/* ============ button.js: the pixel-art buttons (G.Lib.Button; #155 155b) ============
 * The library's two buttons, by their board names:
 *   button.slot  SlotButton: the run screen's move slot shape at 1.5x (pause menu, End Run, EV screen)
 *   button.team  TeamButton: the team menu's button, after assets/ui/team/btn.png (catch screen, Main Menu windows)
 * Props only, never game state: the screen passes the label, size, rims, body and state, and owns onEnter and onPress.
 * Moved unchanged from js/ui/hud-kit.js (which passes them on under the same names), plus button.team's refused.
 * Colours: js/ui/lib/tokens/tokens.js. Style: button.css. Board: tools/library.html, Primitives, Buttons (stories in
 * button.story.js). Plan: docs/ASCII Concept Maps/155b - Buttons Plan.md. Look: docs/HUD-STYLE.md.
 */
G.Lib = G.Lib || {};
G.Lib.Button = (() => {
  const preact = window.preact,
    htmFactory = window.htm,
    pixels = G.Lib.Pixels;
  if (!preact || !htmFactory || !pixels || !pixels.ready) return { ready: false };
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

  // ---------- button.slot: the move slot shape at 1.5x (pause menu #88, End Run #103) ----------
  const SLOT_BUTTON = { artWidth: 105, artRows: 22, artPixel: 3 }; // 315 x 66 px (Jess, 2026-11-11)
  // Rim ramps (HUD-STYLE "Pause menu"): white at rest, green on focus.
  const REST_RIM = G.Tokens.ramp('color.rim.rest'),
    FOCUS_RIM = G.Tokens.ramp('color.rim.focus');
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
      bodyNow = focused && focusBody ? focusBody : BODY;
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

  // ---------- button.team: the team menu's button (assets/ui/team/btn.png, the B/W bag button), any colours ----------
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
   * pressed at all; the screen dims it and keeps its cursor off it (a Buy that refuses is not disabled, #151). refused
   * (#151, 155b): a press only says why (the screen's sound and toast); the rim stays and the label greys (button.css).
   */
  function TeamButton({
    id,
    label,
    artWidth,
    artPixel = TEAM_BUTTON.artPixel,
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

  return { ready: true, moveSlotRow, SLOT_BUTTON, REST_RIM, FOCUS_RIM, SlotButton, TeamButton };
})();
