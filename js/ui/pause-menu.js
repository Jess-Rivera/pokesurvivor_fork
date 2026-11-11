/* ============ pause-menu.js: the in-run pause menu, the Poke Ball menu (#82, slice 1 #88) ============
 * Spec: docs/PAUSE-MENU.md (Jess's design, mockup assets/ui/In Run Menu Reduced.png). Solo pause only; co-op keeps
 * the old Team summary screen (scr-pause) while multiplayer is deferred.
 *
 * Opening, in three steps (each a class on the layer, its look in css/pause-menu.css):
 *   1. the screen dims and the grey circle fades in with the Poke Ball inside, closed      (STEP_MS[0])
 *   2. the ball opens: the red cap slides up, the dark cap down, cut inside the circle; the buttons show  (STEP_MS[1])
 *   3. the four panels slide in: Run Info from the left, the Pokemon detail panel from the right, the team panel
 *      from the bottom, the Run Inventory from the top                                    (STEP_MS[2])
 * Closing runs the steps in reverse. Asking for the other direction mid-step turns the step around where it is (CSS
 * transitions reverse from their current value). The game stays paused until the last step has closed: close(onClosed)
 * calls onClosed then.
 *
 * Buttons: Resume, End Run, Settings. White rim, a green rim on the focused one (mouse hover or Up / Down); Enter
 * presses the focused one. What they do is wired by G.Game (wire()).
 *
 * Layout: a 1920x1080 stage (the mockup's pixels), scaled down to fit smaller windows, never up.
 * Slice 1 draws the four panels as empty frames; their contents come in slices 2 to 4 (#89, #90, #91).
 */
G.PauseMenu = (() => {
  const overlay = G.HudOverlay;
  if (!overlay || !overlay.ready) return { ready: false };
  const { html, signal, preact } = overlay.kit;

  const STEP_MS = [150, 300, 250]; // dim and circle in, ball opens, panels slide in (Jess: about 0.1 to 0.2 s for the first)
  const STAGE_WIDTH = 1920,
    STAGE_HEIGHT = 1080;
  const BUTTONS = [
    { id: 'resume', label: 'Resume' },
    { id: 'endRun', label: 'End Run' },
    { id: 'settings', label: 'Settings' },
  ];

  const focus = signal(0); // index into BUTTONS
  let level = 0, // how many opening steps are applied (0 closed, 3 fully open)
    target = 0,
    stepTimer = null,
    whenClosed = null,
    actions = {};

  // ---------- the Poke Ball (drawn here, after b2-lower A11 to E14 closed and F15 to J18 open) ----------
  const BALL_SIZE = 510,
    BALL_CENTRE = BALL_SIZE / 2,
    INNER_RADIUS = 214;
  // The caps' cut edges: a straight line with a chamfered notch in the middle; the two notches make the centre hole.
  const TOP_EDGE = [
    [0, 248],
    [192, 248],
    [208, 224],
    [302, 224],
    [318, 248],
    [BALL_SIZE, 248],
  ];
  const BOTTOM_EDGE = TOP_EDGE.map(([x, y]) => [x, BALL_SIZE - y]);
  const points = (list) => list.map(([x, y]) => x + ',' + y).join(' ');
  const topCap = points([[0, 0], ...TOP_EDGE, [BALL_SIZE, 0]]);
  const bottomCap = points([[0, BALL_SIZE], ...BOTTOM_EDGE, [BALL_SIZE, BALL_SIZE]]);

  function Ball() {
    return html`<svg
      class="pm-ball"
      width=${BALL_SIZE}
      height=${BALL_SIZE}
      viewBox=${'0 0 ' + BALL_SIZE + ' ' + BALL_SIZE}
    >
      <defs>
        <clipPath id="pm-ball-inside"><circle cx=${BALL_CENTRE} cy=${BALL_CENTRE} r=${INNER_RADIUS} /></clipPath>
      </defs>
      <circle class="pm-ring-outer" cx=${BALL_CENTRE} cy=${BALL_CENTRE} r=${BALL_CENTRE - 2} />
      <circle class="pm-ring" cx=${BALL_CENTRE} cy=${BALL_CENTRE} r=${BALL_CENTRE - 12} />
      <circle class="pm-ring-inner" cx=${BALL_CENTRE} cy=${BALL_CENTRE} r=${INNER_RADIUS + 6} />
      <g clip-path="url(#pm-ball-inside)">
        <circle class="pm-inside" cx=${BALL_CENTRE} cy=${BALL_CENTRE} r=${INNER_RADIUS} />
        <g class="pm-cap pm-cap-top">
          <polygon class="pm-cap-red" points=${topCap} />
          <polyline class="pm-cap-edge" points=${points(TOP_EDGE)} />
        </g>
        <g class="pm-cap pm-cap-bottom">
          <polygon class="pm-cap-slate" points=${bottomCap} />
          <polyline class="pm-cap-edge" points=${points(BOTTOM_EDGE)} />
        </g>
      </g>
    </svg>`;
  }

  function Buttons() {
    return html`<div class="pm-buttons">
      ${BUTTONS.map(
        (button, index) =>
          html`<button
            type="button"
            class=${'pm-button' + (focus.value === index ? ' focused' : '')}
            data-action=${button.id}
            onMouseEnter=${() => (focus.value = index)}
            onClick=${() => press(index)}
          >
            <span class="hud-text">${button.label}</span>
          </button>`
      )}
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
        <div class="pm-centre"><${Ball} /><${Buttons} /></div>
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
    for (let step = 1; step <= STEP_MS.length; step++) root.classList.toggle('pm-step' + step, level >= step);
  }
  function step() {
    stepTimer = null;
    if (level === target) {
      if (level === 0) finishClose();
      return;
    }
    const opening = target > level;
    const duration = opening ? STEP_MS[level] : STEP_MS[level - 1];
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
    aim(STEP_MS.length);
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
  const isFullyOpen = () => level === STEP_MS.length && target === STEP_MS.length;

  // ---------- buttons and keys ----------
  function press(index) {
    if (target !== STEP_MS.length) return; // closing: the buttons are on their way out
    focus.value = index;
    const action = actions[BUTTONS[index].id];
    G.Audio.sfx('confirm');
    if (action) action();
  }
  /** Keys while paused (G.Game): Up / Down move the focus, Enter presses. Not while a dialog or Settings is on top. */
  function keys() {
    if (!isOpen() || target !== STEP_MS.length || G.UI.isOpen('scr-ask') || G.SettingsUI.isOpen) return;
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

  return { ready: true, open, close, hideNow, isOpen, isClosing, isFullyOpen, keys, wire, STEP_MS };
})();
