/* ============ ev-screen.js: the EV screen at the end of a solo run (#104) ============
 * Spec: docs/PAUSE-MENU.md section 7 "EV screen" and "EV buttons" (mock assets/excalidraw/End Run EV.png). Plan:
 * docs/ASCII Concept Maps/104 - EV Screen Build Plan.txt. It replaces the old allocation screen (scr-evs in run-ui.js).
 *
 * Opened by End Run's "Learn from the Loss". Six portrait circles in team slot order (an empty circle for a slot with
 * no copy), "x / 510" under each, counting this screen's additions. Rows HP, Attack, Defense, Speed, Special Defense,
 * Special Attack (the hex's clockwise order), all six always. The left column is what is left to give in that stat.
 * Each cell is "- N +N +": the copy's EVs before this screen in white, this screen's additions in yellow.
 *   +   greys out when the stat has nothing left, the cell is at 252 or the copy is at 510
 *   -   only takes back this screen's additions (lowering old EVs is the parked 5b berries)
 *   a click moves 1 EV, Shift-click 10, and holding repeats after 0.35 s, about 12 a second (Jess, 2026-11-13)
 * Learn saves what was given, shows the shared toast "Lessons Learned, Returning Home" for 1 s with the screen still up
 * and taking no input, then goes home (#104c); with EVs left over it asks first, and they are discarded. Go Home saves
 * nothing and always asks. Both asks are the shared G.UI.ask dialog: it covers this screen and keeps the Enter that
 * answers it from the game, so nothing here needs guarding. No way back to End Run or Run Review.
 * Keys: the kit's createButtonRow, as End Run: Move_Left / Move_Right move the green focus, either Enter key presses,
 * Learn has it first. Esc does nothing, so a stray key cannot skip the EVs. The stage fit is the kit's fitToStage.
 *
 *   G.EvScreen.show(evs, home)   evs: { bank, team } from G.Game's endRun; home: back to the main menu
 *   G.EvScreen.hide()            gone at once (a new run starts)
 *   G.EvScreen.isOpen(), G.EvScreen.keys()   G.Game calls keys() each frame while the run is over
 */
G.EvScreen = (() => {
  const overlay = G.HudOverlay;
  if (!overlay || !overlay.ready) return { ready: false };
  const { html, signal, preact, SlotButton, portraitSource, portraitFallback, fitToStage, createButtonRow } =
    overlay.kit;

  const TEAM_SLOTS = 6;
  // The rows in the hex's clockwise order; stat is the save order (HP Atk Def SpA SpD Spe).
  const ROWS = [
    { stat: 0, name: 'HP' },
    { stat: 1, name: 'Attack' },
    { stat: 2, name: 'Defense' },
    { stat: 5, name: 'Speed' },
    { stat: 4, name: 'Special Defense' },
    { stat: 3, name: 'Special Attack' },
  ];
  const SHIFT_STEP = 10,
    REPEAT_DELAY_MS = 350,
    REPEAT_EVERY_MS = 83; // about 12 a second
  const LEARN_TOAST_MS = 1000; // Learn's toast, then home (Jess, 2026-11-13)

  const columns = signal([]), // per team slot: null, or { uid, dex, shiny, before: six EVs, beforeTotal }
    bank = signal([0, 0, 0, 0, 0, 0]), // the run's whole EVs to give, per stat
    plan = signal([]); // plan[column][stat]: EVs added on this screen
  let home = null,
    repeatTimer = null,
    leaving = false, // Learn's second: the screen stays up and takes no input
    leaveTimer = null;

  // ---------- the giving rules ----------
  const added = (column, stat) => plan.value[column][stat];
  const addedTotal = (column) => plan.value[column].reduce((sum, value) => sum + value, 0);
  const leftIn = (stat) => bank.value[stat] - plan.value.reduce((sum, row) => sum + row[stat], 0);
  const leftTotal = () => ROWS.reduce((sum, row) => sum + leftIn(row.stat), 0);

  /** How many EVs + can still add to this cell: 0 greys it out. */
  function roomFor(column, stat) {
    const member = columns.value[column];
    if (!member) return 0;
    const bankRoom = leftIn(stat),
      statRoom = G.Copies.EV_MAX - member.before[stat] - added(column, stat),
      totalRoom = G.Copies.EV_TOTAL - member.beforeTotal - addedTotal(column);
    return Math.max(0, Math.min(bankRoom, statRoom, totalRoom));
  }
  const canAdd = (column, stat) => roomFor(column, stat) > 0;
  const canRemove = (column, stat) => !!columns.value[column] && added(column, stat) > 0;

  /** One press: up to `amount` EVs, direction +1 or -1. Returns how many moved (0: nothing could). */
  function step(column, stat, direction, amount) {
    const limit = direction > 0 ? roomFor(column, stat) : canRemove(column, stat) ? added(column, stat) : 0;
    const moved = Math.min(amount, limit);
    if (moved <= 0) return 0;
    const next = plan.value.map((row) => row.slice());
    next[column][stat] += direction * moved;
    plan.value = next;
    return moved;
  }

  // ---------- click, Shift-click and hold to repeat ----------
  function stopRepeat() {
    if (repeatTimer) clearTimeout(repeatTimer);
    repeatTimer = null;
  }
  addEventListener('pointerup', stopRepeat);
  addEventListener('pointercancel', stopRepeat);
  addEventListener('blur', stopRepeat);

  function pressStep(event, column, stat, direction) {
    if (event.button !== 0 || leaving) return;
    event.preventDefault(); // the page's focus stays where it is (#89)
    stopRepeat();
    const amount = event.shiftKey ? SHIFT_STEP : 1;
    if (!step(column, stat, direction, amount)) return;
    G.Audio.sfx('click');
    const again = () => {
      if (!step(column, stat, direction, amount)) return stopRepeat();
      G.Audio.sfx('click');
      repeatTimer = setTimeout(again, REPEAT_EVERY_MS);
    };
    repeatTimer = setTimeout(again, REPEAT_DELAY_MS);
  }

  // ---------- the screen ----------
  function StepButton({ column, stat, direction, enabled }) {
    return html`<button
      type="button"
      class="ev-step hud-text"
      data-step=${direction}
      disabled=${!enabled}
      tabindex="-1"
      onPointerDown=${(event) => pressStep(event, column, stat, direction)}
      onPointerLeave=${stopRepeat}
    >
      ${direction > 0 ? '+' : '-'}
    </button>`;
  }

  function Head() {
    return html`<div class="ev-head">
      <div class="ev-label-column"></div>
      ${columns.value.map((member, column) =>
        member
          ? html`<div class="ev-column-head" key=${column}>
              <div class="hud-portrait ev-circle">
                <div class="hud-portrait-face">
                  <img
                    src=${portraitSource(member.dex, member.shiny)}
                    data-dex=${member.dex}
                    alt=""
                    onError=${portraitFallback}
                  />
                </div>
              </div>
              <div class="hud-text ev-total">${member.beforeTotal + addedTotal(column)} / 510</div>
            </div>`
          : html`<div class="ev-column-head" key=${column}>
              <div class="hud-portrait ev-circle ev-empty"></div>
              <div class="hud-text ev-total"></div>
            </div>`
      )}
    </div>`;
  }

  function Row({ row }) {
    const { stat, name } = row;
    return html`<div class="ev-row" data-stat=${stat}>
      <div class="ev-label-column">
        <span class="hud-text ev-stat-name">${name}</span>
        <span class="hud-text ev-left">${leftIn(stat)}</span>
      </div>
      ${columns.value.map((member, column) =>
        member
          ? html`<div class="ev-cell" key=${column} data-column=${column}>
              <${StepButton} column=${column} stat=${stat} direction=${-1} enabled=${canRemove(column, stat)} />
              <span class="hud-text ev-now">${member.before[stat]}</span>
              <span class="hud-text ev-add">${added(column, stat) ? '+' + added(column, stat) : ''}</span>
              <${StepButton} column=${column} stat=${stat} direction=${1} enabled=${canAdd(column, stat)} />
            </div>`
          : html`<div class="ev-cell ev-cell-empty" key=${column} data-column=${column}></div>`
      )}
    </div>`;
  }

  const BUTTONS = [
    { id: 'learn', label: 'Learn', run: () => learn() },
    { id: 'gohome', label: 'Go Home', run: () => goHome() },
  ];
  const row = createButtonRow({
    count: () => BUTTONS.length,
    isOpen: () => isOpen() && !leaving,
    onPress: (index) => {
      G.Audio.sfx('select');
      BUTTONS[index].run();
    },
  });

  function Screen() {
    return html`<div class="er-dim"></div>
      <div class="pm-stage er-stage">
        <div class="ev-panel">
          <${Head} />
          ${ROWS.map((row) => html`<${Row} key=${row.stat} row=${row} />`)}
        </div>
        <div class="ev-buttons">
          ${BUTTONS.map(
            (button, index) =>
              html`<${SlotButton}
                key=${button.id}
                id=${button.id}
                label=${button.label}
                focused=${row.focus.value === index}
                onEnter=${() => {
                  row.focus.value = index;
                }}
                onPress=${() => row.press(index)}
              />`
          )}
        </div>
      </div>`;
  }

  const root = document.createElement('div');
  root.className = 'ev-screen ev-hidden';
  root.setAttribute('translate', 'no'); // English-only text
  document.body.appendChild(root);
  preact.render(html`<${Screen} />`, root);
  const fitStage = fitToStage(root);

  const isOpen = () => !root.classList.contains('ev-hidden');

  /** Open for this run's EVs: evs = { bank (thousandths), team: [{ uid, dex, slot }] }; home goes back to the menu. */
  function show(evs, goHomeTo) {
    const save = G.DB.save,
      slots = new Array(TEAM_SLOTS).fill(null);
    for (const member of (evs && evs.team) || []) {
      let copy = null;
      try {
        copy = save ? G.Copies.get(save, member.uid) : null;
      } catch (error) {
        copy = null; // a malformed id gets no column
      }
      if (!copy) continue;
      const wanted = member.slot >= 0 && member.slot < TEAM_SLOTS && !slots[member.slot] ? member.slot : -1,
        place = wanted >= 0 ? wanted : slots.indexOf(null);
      if (place < 0) continue;
      slots[place] = {
        uid: member.uid,
        dex: member.dex,
        shiny: copy.isShiny,
        before: copy.ev,
        beforeTotal: copy.evTotal,
      };
    }
    columns.value = slots;
    bank.value = G.Copies.wholeEvs((evs && evs.bank) || [0, 0, 0, 0, 0, 0]);
    plan.value = slots.map(() => [0, 0, 0, 0, 0, 0]);
    row.focus.value = 0;
    home = goHomeTo;
    stopLeaving();
    stopRepeat();
    if (root.contains(document.activeElement)) document.activeElement.blur();
    fitStage();
    root.classList.remove('ev-hidden');
    document.body.classList.add('er-open');
  }
  function stopLeaving() {
    if (leaveTimer) clearTimeout(leaveTimer);
    leaveTimer = null;
    leaving = false;
  }
  function hide() {
    stopLeaving();
    stopRepeat();
    root.classList.add('ev-hidden');
    document.body.classList.remove('er-open');
  }
  function leave() {
    const back = home;
    home = null;
    hide();
    if (back) back();
  }

  /** This screen's additions as applyEvPlan's list: [{ uid, stat, n }]. */
  function planned() {
    const list = [];
    columns.value.forEach((member, column) => {
      if (member) plan.value[column].forEach((n, stat) => n && list.push({ uid: member.uid, stat, n }));
    });
    return list;
  }

  async function learn() {
    const left = leftTotal();
    if (left > 0) {
      const yes = await G.UI.ask(left + ' EVs you did not give will be lost.', {
        title: 'Discard leftover EVs?',
        ok: 'Yes',
        cancel: 'Cancel',
      });
      if (!yes) return;
    }
    G.Copies.applyEvPlan(G.DB.save, bank.value, planned());
    G.DB.commit(true);
    G.Audio.sfx('confirm');
    leaving = true; // saved first, so closing the tab during the toast keeps the EVs
    stopRepeat();
    G.UI.toast('Lessons Learned, Returning Home', LEARN_TOAST_MS);
    leaveTimer = setTimeout(leave, LEARN_TOAST_MS);
  }

  async function goHome() {
    const yes = await G.UI.ask('Discard all EVs and return?', { title: 'Go Home', ok: 'Yes', cancel: 'Cancel' });
    if (yes) leave(); // saves nothing
  }

  return { ready: true, show, hide, isOpen, keys: row.keys };
})();
