/* ============ end-run.js: the End Run screen, shown when a solo run ends (#103) ============
 * Spec: docs/PAUSE-MENU.md section 7 (mock assets/excalidraw/End Run.png). Co-op keeps the old results card
 * (scr-over) while multiplayer is deferred.
 *
 * The run's world stays behind it, dimmed; the run HUD hides as it does for the pause menu. The title "EXPEDITION OVER"
 * (Michroma, red) over two buttons in the pause menu's button shape (the kit's SlotButton), side by side:
 *   Run Review              the pause menu reopened read-only (#92); its Back comes back here
 *   Learn from the Loss     when the run has whole EVs to give: the EV screen
 *   Return Home             when it has none (a quit never has any, #103): back to the main menu
 * Hover or Move_Left / Move_Right move the green focus, either Enter key presses; Run Review has it first. Esc does
 * nothing here, so a stray key cannot skip the EVs (Jess, 2026-11-12).
 *
 * Layout: the pause menu's 1920x1080 stage, scaled down to fit smaller windows, never up.
 *
 *   G.EndRun.show({ hasEvs, review, learn, home })   review / learn / home: what each button does
 *   G.EndRun.hide()                                  gone at once (a button was pressed, or a new run starts)
 *   G.EndRun.isOpen(), G.EndRun.keys()               G.Game calls keys() each frame while the run is over
 */
G.EndRun = (() => {
  const overlay = G.HudOverlay;
  if (!overlay || !overlay.ready) return { ready: false };
  const { html, signal, preact, SlotButton } = overlay.kit;

  const STAGE_WIDTH = 1920,
    STAGE_HEIGHT = 1080;
  const BUTTON_ART_WIDTH = 140; // 420 x 66 px: "Learn from the Loss" fits at the buttons' 30 px text

  const buttons = signal([]), // [{ id, label, run }] for this ending
    focus = signal(0);
  let shownWith = null; // the last show() options, so Run Review's Back can bring the screen back

  /** Either Enter key (the main one or the number pad's) on this frame. */
  const enterTapped = () => G.Input.tap('enter') || G.Input.tap('numpadenter');

  function Screen() {
    return html`<div class="er-dim"></div>
      <div class="pm-stage er-stage">
        <div class="er-title">EXPEDITION OVER</div>
        <div class="er-buttons">
          ${buttons.value.map(
            (button, index) =>
              html`<${SlotButton}
                key=${button.id}
                id=${button.id}
                label=${button.label}
                artWidth=${BUTTON_ART_WIDTH}
                focused=${focus.value === index}
                onEnter=${() => {
                  focus.value = index;
                }}
                onPress=${() => press(index)}
              />`
          )}
        </div>
      </div>`;
  }

  const root = document.createElement('div');
  root.className = 'end-run er-hidden';
  root.setAttribute('translate', 'no'); // English-only text
  document.body.appendChild(root);
  preact.render(html`<${Screen} />`, root);

  function fitStage() {
    const scale = Math.min(1, innerWidth / STAGE_WIDTH, innerHeight / STAGE_HEIGHT);
    root.style.setProperty('--pm-scale', String(scale));
  }
  addEventListener('resize', fitStage);

  const isOpen = () => !root.classList.contains('er-hidden');

  /** Show the screen for this ending. hasEvs picks the second button; review, learn and home are what they do. */
  function show(options) {
    shownWith = options;
    buttons.value = [
      { id: 'review', label: 'Run Review', run: options.review },
      options.hasEvs
        ? { id: 'learn', label: 'Learn from the Loss', run: options.learn }
        : { id: 'home', label: 'Return Home', run: options.home },
    ];
    focus.value = 0;
    if (root.contains(document.activeElement)) document.activeElement.blur();
    fitStage();
    root.classList.remove('er-hidden');
    document.body.classList.add('er-open');
  }
  /** Bring the screen back as it was (Run Review's Back). */
  function reopen() {
    if (shownWith) show(shownWith);
  }
  function hide() {
    root.classList.add('er-hidden');
    document.body.classList.remove('er-open');
  }

  function press(index) {
    const button = buttons.value[index];
    if (!isOpen() || !button) return;
    G.Audio.sfx('confirm');
    hide();
    if (button.run) button.run();
  }

  /** Keys while the screen shows (G.Game, while the run is over): Move_Left / Move_Right and Enter. */
  function keys() {
    if (!isOpen() || G.UI.isOpen('scr-ask') || G.SettingsUI.isOpen) return;
    const step = (G.Input.action('move_right') ? 1 : 0) - (G.Input.action('move_left') ? 1 : 0);
    if (step) {
      const next = Math.max(0, Math.min(buttons.value.length - 1, focus.value + step));
      if (next !== focus.value) G.Audio.sfx('hover');
      focus.value = next;
    }
    if (enterTapped()) press(focus.value);
  }

  return { ready: true, show, reopen, hide, isOpen, keys };
})();
