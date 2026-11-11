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
 * End Run asks inside the ball, no popup (Jess, 2026-11-11): Resume slides off to a random side and Settings to the other,
 * each vanishing at the ball's inner edge (the button layer is clipped to it). End (red rim) and No (white rim), short
 * enough to share Settings' row, chase in behind Settings from the side Resume left by; focused, an answer keeps its rim
 * and its body turns the rim's dark shade. No has the focus first;
 * Move_Left / Move_Right switch, Enter presses, Esc or the pause key answer No. No sends End and No back out the way they
 * came and brings Resume and Settings back. End ends the run (G.Game's endRun).
 *
 * Layout: a 1920x1080 stage (the mockup's pixels), scaled down to fit smaller windows, never up.
 * Slice 1 draws the four panels as empty frames; their contents come in slices 2 to 4 (#89, #90, #91).
 */
G.PauseMenu = (() => {
  const overlay = G.HudOverlay;
  if (!overlay || !overlay.ready) return { ready: false };
  const { html, signal, preact, PALETTE, PixelShape, moveSlotRow } = overlay.kit;

  // Step lengths in ms: dim and closed ball in, then ball opens with the panels sliding in. Open is about 0.23 s (Jess,
  // 2026-11-11, third feel test: halfway between the 0.31 s open and the close) and close about 0.16 s. Each matches a
  // transition in css/pause-menu.css.
  const OPEN_MS = [55, 175],
    CLOSE_MS = [38, 118],
    STEPS = OPEN_MS.length;
  const BUTTON_ART_WIDTH = 105, // the run screen's move slot shape (105 x 22 art pixels)
    BUTTON_ART_ROWS = 22,
    BUTTON_ART_PIXEL = 3; // 315 x 66 px, 1.5x the run screen's slots (Jess, 2026-11-11)
  // Rim ramps (HUD-STYLE "Pause menu"): white at rest, green on focus.
  const REST_RIM = { light: '#ffffff', base: PALETTE.paper, dark: PALETTE.paperEdge },
    FOCUS_RIM = { light: '#9be895', base: '#38d030', dark: '#1d6c19' },
    END_RIM = { light: '#ff8a90', base: '#e8202a', dark: '#7c1016' }; // the End answer's red
  const ANSWER_ART_WIDTH = 56; // End and No: 168 x 66 px each, side by side in Settings' row inside the ball
  const ANSWERS = [
    // Focused, each answer keeps its rim and its body turns the rim's dark shade (Jess, 2026-11-11)
    { id: 'end', label: 'End', rim: END_RIM, focusRim: END_RIM, focusBody: END_RIM.dark },
    { id: 'no', label: 'No', rim: REST_RIM, focusRim: REST_RIM, focusBody: REST_RIM.dark },
  ];
  const STAGE_WIDTH = 1920,
    STAGE_HEIGHT = 1080;
  const BUTTONS = [
    { id: 'resume', label: 'Resume' },
    { id: 'endRun', label: 'End Run' },
    { id: 'settings', label: 'Settings' },
  ];

  const focus = signal(0); // index into BUTTONS
  const answerFocus = signal(1); // index into ANSWERS while asking (No first)
  const asking = signal(false);
  let settingsSide = 1; // the side Settings leaves by while asking (+1 right, -1 left), picked at random each time
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

  /** One button in the move slot shape: rim colours (at rest and focused), focused body, art width, label. */
  function SlotButton({ id, label, rim, focusRim, focusBody, artWidth, focused, onEnter, onPress }) {
    const rimNow = focused ? focusRim || FOCUS_RIM : rim,
      bodyNow = focused && focusBody ? focusBody : PALETTE.body;
    return html`<button
      type="button"
      class=${'pm-button' + (focused ? ' focused' : '')}
      data-action=${id}
      onMouseEnter=${onEnter}
      onClick=${onPress}
    >
      <${PixelShape}
        artWidth=${artWidth}
        artRows=${BUTTON_ART_ROWS}
        artPixel=${BUTTON_ART_PIXEL}
        paintRow=${(row) => moveSlotRow(row, artWidth, BUTTON_ART_ROWS, rimNow, bodyNow)}
      />
      <span class="hud-text hud-text-30">${label}</span>
    </button>`;
  }

  function Buttons() {
    const isAsking = asking.value;
    return html`<div class="pm-buttons">
      ${BUTTONS.map(
        (button, index) =>
          html`<${SlotButton}
            key=${button.id}
            id=${button.id}
            label=${button.label}
            rim=${REST_RIM}
            artWidth=${BUTTON_ART_WIDTH}
            focused=${!isAsking && focus.value === index}
            onEnter=${() => {
              if (!asking.value) focus.value = index;
            }}
            onPress=${() => press(index)}
          />`
      )}
      <div class="pm-answers">
        ${ANSWERS.map(
          (answer, index) =>
            html`<${SlotButton}
              key=${answer.id}
              id=${answer.id}
              label=${answer.label}
              rim=${answer.rim}
              focusRim=${answer.focusRim}
              focusBody=${answer.focusBody}
              artWidth=${ANSWER_ART_WIDTH}
              focused=${isAsking && answerFocus.value === index}
              onEnter=${() => {
                if (asking.value) answerFocus.value = index;
              }}
              onPress=${() => pressAnswer(index)}
            />`
        )}
      </div>
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
      resetAsking();
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
    resetAsking();
    root.classList.add('pm-hidden');
    document.body.classList.remove('pm-open');
  }

  const isOpen = () => !root.classList.contains('pm-hidden');
  const isClosing = () => isOpen() && target === 0;
  const isFullyOpen = () => level === STEPS && target === STEPS && !stepTimer; // the last step has finished

  // ---------- End Run, asked inside the ball ----------
  const buttonsLayer = () => root.querySelector('.pm-buttons');
  /** Jump End and No to their waiting side (off the ball, opposite where Settings will leave) with no animation. */
  function setSide(side) {
    const layer = buttonsLayer();
    layer.classList.add('pm-no-slide');
    layer.classList.toggle('pm-settings-right', side > 0);
    layer.classList.toggle('pm-settings-left', side < 0);
    void layer.offsetWidth;
    layer.classList.remove('pm-no-slide');
    settingsSide = side;
  }
  function startAsking() {
    if (asking.value) return;
    setSide(Math.random() < 0.5 ? -1 : 1); // presentation only, not the run's seeded random
    answerFocus.value = 1; // No
    asking.value = true;
    buttonsLayer().classList.add('pm-asking');
  }
  function stopAsking() {
    if (!asking.value) return false;
    asking.value = false;
    buttonsLayer().classList.remove('pm-asking');
    focus.value = BUTTONS.findIndex((button) => button.id === 'endRun');
    return true;
  }
  function resetAsking() {
    asking.value = false;
    const layer = buttonsLayer();
    layer.classList.add('pm-no-slide');
    layer.classList.remove('pm-asking');
    void layer.offsetWidth;
    layer.classList.remove('pm-no-slide');
  }
  /** Esc or the pause key while End Run is asking: answer No. True when it did (G.Game then keeps the menu open). */
  function answerNo() {
    if (!stopAsking()) return false;
    G.Audio.sfx('back');
    return true;
  }
  function pressAnswer(index) {
    if (!asking.value || target !== STEPS) return;
    if (ANSWERS[index].id === 'no') {
      answerNo();
      return;
    }
    G.Audio.sfx('confirm');
    if (actions.endRun) actions.endRun();
  }

  // ---------- buttons and keys ----------
  function press(index) {
    if (target !== STEPS || asking.value) return; // closing, or End Run is asking
    focus.value = index;
    G.Audio.sfx('confirm');
    const id = BUTTONS[index].id;
    if (id === 'endRun') startAsking();
    else if (actions[id]) actions[id]();
  }
  /** Keys while paused (G.Game): Up / Down move the focus (Move_Left / Move_Right while End Run asks), Enter presses.
   *  Not while a dialog or Settings is on top. */
  function keys() {
    if (!isOpen() || target !== STEPS || G.UI.isOpen('scr-ask') || G.SettingsUI.isOpen) return;
    if (asking.value) {
      const step = (G.Input.action('move_right') ? 1 : 0) - (G.Input.action('move_left') ? 1 : 0);
      if (step) {
        answerFocus.value = Math.max(0, Math.min(ANSWERS.length - 1, answerFocus.value + step));
        G.Audio.sfx('hover');
      }
      if (G.Input.tap('enter')) pressAnswer(answerFocus.value);
      return;
    }
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

  const isAsking = () => asking.value;
  const askedSide = () => settingsSide;

  return {
    ready: true,
    open,
    close,
    hideNow,
    isOpen,
    isClosing,
    isFullyOpen,
    isAsking,
    askedSide,
    answerNo,
    keys,
    wire,
    OPEN_MS,
    CLOSE_MS,
  };
})();
