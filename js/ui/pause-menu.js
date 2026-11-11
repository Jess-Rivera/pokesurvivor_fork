/* ============ pause-menu.js: the in-run pause menu, the Poke Ball menu (#82, slice 1 #88) ============
 * Spec: docs/PAUSE-MENU.md (Jess's design, mockup assets/ui/In Run Menu Reduced.png). Solo pause only; co-op keeps
 * the old Team summary screen (scr-pause) while multiplayer is deferred.
 *
 * Opening, in two steps (each a class on the layer, its look in css/pause-menu.css; Jess's feel test 2026-11-11):
 *   1. the screen dims and the grey circle fades in with the Poke Ball inside, closed                    (OPEN_MS[0])
 *   2. together: the ball opens (red cap up, dark cap down, cut inside the circle) and the four panels slide in
 *      (Run Info from the left, the Pokemon detail panel from the right, team from the bottom, Run Inventory from
 *      the top)                                                                                          (OPEN_MS[1])
 * The caps are a layer ABOVE the buttons, so the opening ball uncovers them. Closing runs the steps in reverse at about
 * twice the speed (CLOSE_MS). Asking for the other direction mid-step turns the step around where it is (CSS transitions
 * reverse from their current value). The game stays paused until the last step has closed: close(onClosed) calls
 * onClosed then.
 *
 * Buttons: Resume, End Run, Settings, in the run screen's move slot shape (the kit's moveSlotRow), flat body, no grid. White rim, a green rim
 * on the focused one (mouse hover or Up / Down); Enter presses the focused one. What they do is wired by G.Game (wire()).
 *
 * Layout: a 1920x1080 stage (the mockup's pixels), scaled down to fit smaller windows, never up.
 * Slice 1 draws the four panels as empty frames; their contents come in slices 2 to 4 (#89, #90, #91).
 */
G.PauseMenu = (() => {
  const overlay = G.HudOverlay;
  if (!overlay || !overlay.ready) return { ready: false };
  const { html, signal, preact, PALETTE, PixelShape, moveSlotRow } = overlay.kit;

  // Step lengths in ms: dim and closed ball in, then ball opens with the panels sliding in. Open is about 0.31 s and close about
  // twice as fast (Jess, 2026-11-11, second feel test: both halved). Each matches a transition in css/pause-menu.css.
  const OPEN_MS = [75, 235],
    CLOSE_MS = [38, 118],
    STEPS = OPEN_MS.length;
  const BUTTON_ART_WIDTH = 105, // the run screen's move slot: 210 x 44 px at 2 px per art pixel
    BUTTON_ART_ROWS = 22,
    BUTTON_ART_PIXEL = 2;
  // Rim ramps (HUD-STYLE "Pause menu"): white at rest, green on focus.
  const REST_RIM = { light: '#ffffff', base: PALETTE.paper, dark: PALETTE.paperEdge },
    FOCUS_RIM = { light: '#9be895', base: '#38d030', dark: '#1d6c19' };
  const STAGE_WIDTH = 1920,
    STAGE_HEIGHT = 1080;
  const BUTTONS = [
    { id: 'resume', label: 'Resume' },
    { id: 'endRun', label: 'End Run' },
    { id: 'settings', label: 'Settings' },
  ];

  const focus = signal(0); // index into BUTTONS
  let level = 0, // how many opening steps are applied (0 closed, STEPS fully open)
    target = 0,
    stepTimer = null,
    whenClosed = null,
    actions = {};

  // ---------- the Poke Ball (drawn here, after b2-lower A11 to E14 closed and F15 to J18 open) ----------
  const BALL_SIZE = 510,
    BALL_CENTRE = BALL_SIZE / 2,
    INNER_RADIUS = 214;
  // The caps' cut edges: a straight line with a chamfered notch in the middle. Closed, the caps meet at a thin black
  // line and the two notches make the hole the centre button fills (Jess, 2026-11-11: it opens and closes like a Poke Ball).
  const TOP_EDGE = [
    [0, 252],
    [200, 252],
    [214, 226],
    [296, 226],
    [310, 252],
    [BALL_SIZE, 252],
  ];
  const BOTTOM_EDGE = TOP_EDGE.map(([x, y]) => [x, BALL_SIZE - y]);
  const points = (list) => list.map(([x, y]) => x + ',' + y).join(' ');
  const topCap = points([[0, 0], ...TOP_EDGE, [BALL_SIZE, 0]]);
  const bottomCap = points([[0, BALL_SIZE], ...BOTTOM_EDGE, [BALL_SIZE, BALL_SIZE]]);
  // the centre button: the hole between the two notches, white with a black stroke; it rides on the top cap
  const centreButton = points([...TOP_EDGE.slice(1, 5), ...BOTTOM_EDGE.slice(1, 5).reverse()]);
  const band = points([...TOP_EDGE, ...BOTTOM_EDGE.slice().reverse()]); // the gap between the closed caps

  const svgBox = (className, children) =>
    html`<svg class=${className} width=${BALL_SIZE} height=${BALL_SIZE} viewBox=${'0 0 ' + BALL_SIZE + ' ' + BALL_SIZE}>
      ${children}
    </svg>`;

  /** Under the buttons: the grey ring and the black inside. */
  function BallBack() {
    return svgBox(
      'pm-ball pm-ball-back',
      html`<circle class="pm-ring-outer" cx=${BALL_CENTRE} cy=${BALL_CENTRE} r=${BALL_CENTRE - 2} />
        <circle class="pm-ring" cx=${BALL_CENTRE} cy=${BALL_CENTRE} r=${BALL_CENTRE - 12} />
        <circle class="pm-ring-inner" cx=${BALL_CENTRE} cy=${BALL_CENTRE} r=${INNER_RADIUS + 6} />
        <circle class="pm-inside" cx=${BALL_CENTRE} cy=${BALL_CENTRE} r=${INNER_RADIUS} />`
    );
  }

  /** Above the buttons: the two caps (the top one carries the white centre button, Jess 2026-11-11) and the closed
   *  ball's thin black band, which fades as it opens. */
  function BallCaps() {
    return svgBox(
      'pm-ball pm-ball-caps',
      html`<defs>
          <clipPath id="pm-ball-inside"><circle cx=${BALL_CENTRE} cy=${BALL_CENTRE} r=${INNER_RADIUS} /></clipPath>
        </defs>
        <g clip-path="url(#pm-ball-inside)">
          <polygon class="pm-band" points=${band} />
          <g class="pm-cap pm-cap-bottom">
            <polygon class="pm-cap-slate" points=${bottomCap} />
            <polyline class="pm-cap-edge" points=${points(BOTTOM_EDGE)} />
          </g>
          <g class="pm-cap pm-cap-top">
            <polygon class="pm-cap-red" points=${topCap} />
            <polyline class="pm-cap-edge" points=${points(TOP_EDGE)} />
            <polygon class="pm-cap-button" points=${centreButton} />
          </g>
        </g>`
    );
  }

  function MenuButton({ button, index }) {
    const focused = focus.value === index,
      rim = focused ? FOCUS_RIM : REST_RIM;
    return html`<button
      type="button"
      class=${'pm-button' + (focused ? ' focused' : '')}
      data-action=${button.id}
      onMouseEnter=${() => (focus.value = index)}
      onClick=${() => press(index)}
    >
      <${PixelShape}
        artWidth=${BUTTON_ART_WIDTH}
        artRows=${BUTTON_ART_ROWS}
        artPixel=${BUTTON_ART_PIXEL}
        paintRow=${(row) => moveSlotRow(row, BUTTON_ART_WIDTH, BUTTON_ART_ROWS, rim, PALETTE.body)}
      />
      <span class="hud-text">${button.label}</span>
    </button>`;
  }

  function Buttons() {
    return html`<div class="pm-buttons">
      ${BUTTONS.map((button, index) => html`<${MenuButton} key=${button.id} button=${button} index=${index} />`)}
    </div>`;
  }

  // Slice 1: the four panels' frames at their mockup places; contents come in #89 to #91.
  function Panels() {
    return html`<div class="pm-panel pm-panel-info" data-panel="runInfo"></div>
      <div class="pm-panel pm-panel-detail" data-panel="detail">
        <div class="pm-detail-bar pm-detail-top"></div>
        <div class="pm-detail-bar pm-detail-bottom"></div>
      </div>
      <div class="pm-panel pm-panel-team" data-panel="team"></div>
      <div class="pm-panel pm-panel-inventory" data-panel="inventory"></div>`;
  }

  function Menu() {
    return html`<div class="pm-dim"></div>
      <div class="pm-stage">
        <div class="pm-centre"><${BallBack} /><${Buttons} /><${BallCaps} /></div>
        <${Panels} />
      </div>`;
  }

  const root = document.createElement('div');
  root.className = 'pause-menu pm-hidden';
  root.setAttribute('translate', 'no'); // English-only text
  document.body.appendChild(root);
  preact.render(html`<${Menu} />`, root);

  function fitStage() {
    const scale = Math.min(1, innerWidth / STAGE_WIDTH, innerHeight / STAGE_HEIGHT);
    root.style.setProperty('--pm-scale', String(scale));
  }
  addEventListener('resize', fitStage);

  // ---------- the steps ----------
  function applyLevel() {
    for (let step = 1; step <= STEPS; step++) root.classList.toggle('pm-step' + step, level >= step);
  }
  function step() {
    stepTimer = null;
    if (level === target) {
      if (level === 0) finishClose();
      return;
    }
    const opening = target > level;
    const duration = opening ? OPEN_MS[level] : CLOSE_MS[level - 1];
    level += opening ? 1 : -1;
    applyLevel();
    stepTimer = setTimeout(step, duration);
  }
  function aim(newTarget) {
    target = newTarget;
    if (stepTimer) clearTimeout(stepTimer);
    step();
  }
  function finishClose() {
    root.classList.add('pm-hidden');
    document.body.classList.remove('pm-open');
    const done = whenClosed;
    whenClosed = null;
    if (done) done();
  }

  /** Show the menu and play the opening (or turn a closing around). */
  function open() {
    whenClosed = null;
    if (root.classList.contains('pm-hidden')) {
      focus.value = 0;
      fitStage();
      root.classList.remove('pm-hidden');
      document.body.classList.add('pm-open');
      void root.offsetWidth; // start the first step's transitions from the closed look
    }
    aim(STEPS);
  }
  /** Play the closing; onClosed runs once the menu is gone (the game resumes then). */
  function close(onClosed) {
    if (root.classList.contains('pm-hidden')) {
      if (onClosed) onClosed();
      return;
    }
    whenClosed = onClosed || null;
    aim(0);
  }
  /** Gone at once, no animation, no callback (the run ended, or a new one starts). */
  function hideNow() {
    if (stepTimer) clearTimeout(stepTimer);
    stepTimer = null;
    level = target = 0;
    whenClosed = null;
    applyLevel();
    root.classList.add('pm-hidden');
    document.body.classList.remove('pm-open');
  }

  const isOpen = () => !root.classList.contains('pm-hidden');
  const isClosing = () => isOpen() && target === 0;
  const isFullyOpen = () => level === STEPS && target === STEPS && !stepTimer; // the last step has finished

  // ---------- buttons and keys ----------
  function press(index) {
    if (target !== STEPS) return; // closing: the buttons are on their way out
    focus.value = index;
    const action = actions[BUTTONS[index].id];
    G.Audio.sfx('confirm');
    if (action) action();
  }
  /** Keys while paused (G.Game): Up / Down move the focus, Enter presses. Not while a dialog or Settings is on top. */
  function keys() {
    if (!isOpen() || target !== STEPS || G.UI.isOpen('scr-ask') || G.SettingsUI.isOpen) return;
    const move = (G.Input.action('move_down') ? 1 : 0) - (G.Input.action('move_up') ? 1 : 0);
    if (move) {
      focus.value = (focus.value + move + BUTTONS.length) % BUTTONS.length;
      G.Audio.sfx('hover');
    }
    if (G.Input.tap('enter')) press(focus.value);
  }
  /** G.Game hands in what the buttons do: { resume, endRun, settings }. */
  function wire(handlers) {
    actions = handlers || {};
  }

  return { ready: true, open, close, hideNow, isOpen, isClosing, isFullyOpen, keys, wire, OPEN_MS, CLOSE_MS };
})();
