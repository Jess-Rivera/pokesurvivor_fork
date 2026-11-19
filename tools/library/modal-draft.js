// tools/library/modal-draft.js: the Modal page tabs (Unified, Current) and the dialog draft. A plain script sharing the
// board's globals (it draws with clean-draft.js's panel.clean and glitch-draft.js's button.glitch, so it loads after
// them); index.html loads the board's files in order, board.js first and start.js last.
'use strict';
// ---------- Modal, Unified (Jess 2026-11-19): the dialog as panel.clean, Michroma and button.glitch ----------
// A dialog is the game talking, the code's interface, so it is clean (decision
// 2026-11-18-155-pixel-panels-for-one-pokemon-clean-for-the-rest): panel.clean, Michroma for every line (the meta tier,
// decision 2026-11-18-155-font-scheme-three-tiers) and button.glitch (decision
// 2026-11-18-155-button-glitch-replaces-slanted-and-rounded). Each ask has an intent (neutral, positive, negative) and
// both its buttons take it. The confirm is button.glitch as it is. The cancel is a new state, button.glitch.cancel
// (Jess 2026-11-19): at rest both are button.glitch.rest; under the cursor the confirm uncovers the intent's colour
// (ink bar and text) and the cancel its inverse (ink body, the intent's bar and text), so the focused one always says
// which answer Enter gives. A board copy: nothing here reads the game's modal.
const MODAL = {
  width: 720, // px, today's on the 1920 x 1080 menu stage
  padding: '32px 40px 36px',
  gap: 24, // px between the buttons, today's
  title: 24, // px Michroma, from the Fonts candidates (14, 18, 24, 32); today 30
  message: 18, // px Michroma; today GameFont 27.1429
  note: 14, // px Michroma; today GameFont 20
  text: greyTone('white'),
  note_colour: unifiedTone(UNIFIED_TEAL, 'base'), // Unified teal: secondary text
};
const intentOf = (name) => GLITCH_INTENTS.find((kind) => kind.intent === name);
/** button.glitch's colours for a dialog button: the confirm as it is, the cancel's focus inverted (glitch-draft.js). */
const modalButtonStyle = (kind, cancel) => (cancel ? glitchCancelColours(kind) : glitchColours(kind, false, false));
// the asks the board shows: one per intent, plus a notice (one button). opensOn: the button the cursor starts on
const MODAL_ASKS = [
  {
    id: 'positive',
    intent: 'Positive',
    title: 'Buy TM',
    message: 'Spend 7,000 Pok\u00e9Coins on TM Thunderbolt?',
    note: 'You will have 2,000 left.',
    confirm: 'Buy',
    cancel: 'Cancel',
    opensOn: 0,
    places: ['main.shop.buyAsk'],
  },
  {
    id: 'negative',
    intent: 'Negative',
    title: 'Let It Go',
    message: 'Let Pikachu go? It will not come back.',
    note: null,
    confirm: 'Let It Go',
    cancel: 'Keep',
    opensOn: 1, // a destructive ask opens on the cancel, so a stray Enter loses nothing (pending, Jess)
    places: ['catch.letGoAsk', 'main.team.sellAsk'],
  },
  {
    id: 'neutral',
    intent: 'Neutral',
    title: 'Unsaved changes',
    message: 'Leave the Team screen without saving?',
    note: 'Your changes will be lost.',
    confirm: 'Leave',
    cancel: 'Keep editing',
    opensOn: 0,
    places: ['main.team.unsavedAsk', 'ev.goHomeAsk'],
  },
  {
    id: 'notice',
    intent: 'Neutral',
    title: 'New save',
    message: 'Your save is from an older version, so it was started fresh.',
    note: null,
    confirm: 'OK',
    cancel: null,
    opensOn: 0,
    places: ['main.newSaveNotice'],
  },
];
function modalHtml(ask) {
  const kind = intentOf(ask.intent),
    buttons = [[ask.confirm, false]];
  if (ask.cancel) buttons.push([ask.cancel, true]);
  const buttonHtml = buttons
    .map(
      ([label, cancel], index) => `<button type="button" class="lib-glitch-button${index === ask.opensOn ? ' focused' : ''}"
      tabindex="-1" data-modal-button="${index}" data-label="${esc(label)}" style="${modalButtonStyle(kind, cancel)}"
      >${esc(label)}</button>`
    )
    .join('');
  const style = [
    ['--clean-body', CLEAN_PANEL.body],
    ['--clean-edge', CLEAN_PANEL.edge],
    ['--clean-edge-width', CLEAN_PANEL.edgeWidth + 'px'],
    ['--modal-title', MODAL.title + 'px'],
    ['--modal-message', MODAL.message + 'px'],
    ['--modal-note', MODAL.note + 'px'],
    ['--modal-text', MODAL.text],
    ['--modal-note-colour', MODAL.note_colour],
    ['--modal-gap', MODAL.gap + 'px'],
    ['width', MODAL.width + 'px'],
  ]
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
  return `<div class="lib-clean lib-modal" role="dialog" style="${style}"><div class="lib-modal-inner"
    style="padding:${MODAL.padding}">
    <div class="lib-modal-title">${esc(ask.title)}</div>
    <p class="lib-modal-message">${esc(ask.message)}</p>
    ${ask.note ? `<p class="lib-modal-note">${esc(ask.note)}</p>` : ''}
    <div class="lib-modal-buttons">${buttonHtml}</div></div></div>`;
}

// ---------- the demo: each dialog takes the arrows, Enter or Space, Esc and the mouse ----------
// Two input modes (Jess 2026-11-19, as the game's inputMode from #149a): with the keyboard the dialog shows a focused
// button (the one Enter presses, opened on opensOn); with the mouse neither is focused, both rest grey and only the
// button under the pointer swipes, as any button.glitch hover. Moving the mouse switches to mouse mode; a key switches
// back. The keys start from the last button the mouse touched (Jess 2026-11-19, as the menus do: hovering a button
// makes it the keys' starting point without showing focus). From mouse mode the first Enter or Space only reveals the
// focus (Jess 2026-11-19, everywhere: menus too at #126), so a key never presses a button you cannot see; the next one
// presses. Arrows reveal and move at once; Esc cancels at once (backing out is always safe).
function startModalDemos() {
  document.querySelectorAll('[data-modal-demo]:not([data-ready])').forEach((stage) => {
    stage.dataset.ready = '';
    const ask = MODAL_ASKS.find((entry) => entry.id === stage.dataset.modalDemo),
      buttons = [...stage.querySelectorAll('[data-modal-button]')],
      readout = stage.querySelector('[data-modal-readout]');
    let focus = ask.opensOn,
      mouse = false;
    const showFocus = () =>
      buttons.forEach((button, at) => button.classList.toggle('focused', !mouse && at === focus));
    const setFocus = (index) => {
      focus = index;
      showFocus();
    };
    const setMode = (toMouse) => {
      if (mouse === toMouse) return;
      mouse = toMouse;
      stage.classList.toggle('is-mouse', mouse);
      showFocus();
    };
    function press(index) {
      setFocus(index);
      const button = buttons[index];
      button.classList.add('pressed');
      setTimeout(() => {
        button.classList.remove('pressed');
        button.classList.add('released');
        setTimeout(() => button.classList.remove('released'), GLITCH_RELEASE_MS);
        readout.textContent = 'Answered: ' + button.dataset.label + ' (it opens again on ' +
          buttons[ask.opensOn].dataset.label + ')';
        setFocus(ask.opensOn);
      }, GLITCH_PRESS_MS + 120);
    }
    stage.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape'].includes(event.key)) return;
      const wasMouse = mouse;
      setMode(false);
      if (wasMouse && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); // the first press only brings the focus back
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        setFocus(Math.max(0, Math.min(buttons.length - 1, focus + (event.key === 'ArrowRight' ? 1 : -1))));
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        press(focus);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        press(buttons.length - 1); // Esc answers the cancel (a notice's only button)
      }
    });
    stage.addEventListener('pointermove', () => setMode(true));
    buttons.forEach((button, index) => {
      // the mouse touching a button makes it the keys' starting point; in mouse mode no focus shows
      button.addEventListener('pointerenter', () => setFocus(index));
      button.addEventListener('click', () => {
        stage.focus();
        press(index);
      });
    });
  });
}
const modalTile = (ask) => `<figure class="lib-state">
  <div class="lib-stage lib-modal-stage" tabindex="0" data-modal-demo="${ask.id}" data-state="modal.dialog:${ask.id}"
    style="background:${CLEAN_STAGE}">${modalHtml(ask)}
    <div class="lib-dim lib-mono lib-modal-readout" data-modal-readout></div></div>
  <figcaption>${nameButton('modal.dialog.' + ask.id)}<br>${esc(ask.intent)}${ask.cancel ? '' : ', a notice (one button)'}:
    opens on ${esc(ask.opensOn ? ask.cancel : ask.confirm)}. ${ask.places.map(nameButton).join('')}</figcaption></figure>`;

// ---------- button.glitch.cancel on its own: rest and under the cursor, per intent ----------
const cancelTile = (kind, focused) => `<figure class="lib-state">
  <div class="lib-stage" data-state="button.glitch:cancel${focused ? 'Focus' : ''}${kind.intent}"
    style="display:flex;gap:24px;background:${CLEAN_PANEL.body}">
    <button type="button" class="lib-glitch-button" tabindex="-1" data-label="Confirm"
      style="${modalButtonStyle(kind, false)}">Confirm</button>
    <button type="button" class="lib-glitch-button${focused ? ' focused' : ''}" tabindex="-1" data-label="Cancel"
      style="${modalButtonStyle(kind, true)}">Cancel</button></div>
  <figcaption>${nameButton('button.glitch.cancel' + (focused ? 'Focus' : '') + kind.intent)}<br>${esc(kind.intent)}:
    ${focused ? 'the cancel under the cursor: its inverse focus' : 'both at rest, alike (hover one to swipe)'}</figcaption></figure>`;

function modalSection() {
  return `<section class="lib-story" data-draft="modal.dialog">
    <h3>${nameButton('modal.dialog')} ${draftTag('clean: the game asking (a board copy)')}</h3>
    <h4 class="lib-dim">Try it: click a dialog, then Left and Right, Enter or Space, Esc; move the mouse over it and both
      go grey (only the one under the pointer swipes), press a key and the focus comes back</h4>
    <div class="lib-states">${MODAL_ASKS.map(modalTile).join('')}</div>
    <dl class="lib-facts">
      ${cleanColour('Body', 'color.grey.panel', CLEAN_PANEL.body)}
      ${cleanColour('Edge', 'color.grey.slate', CLEAN_PANEL.edge)}
      ${cleanColour('Title and message', 'color.grey.white', MODAL.text)}
      ${cleanColour('Note', 'color.teal.base', MODAL.note_colour)}
      <dd class="lib-dim">Unified teal is the secondary text colour; today color.text.secondary #8cfff7</dd>
      <dt>Frame</dt><dd>panel.clean: ${CLEAN_PANEL.edgeWidth} px edge, square corners, ${MODAL.width} px wide (today's);
        today it is panel.flat</dd>
      <dt>Text</dt><dd>${nameButton('font.michroma')}<span>title ${MODAL.title} px, message ${MODAL.message} px, note
        ${MODAL.note} px, from the Fonts candidates; today the title is Michroma 30 px and the rest GameFont 27 and 20
        px. Settled at the Fonts feel test.</span></dd>
      <dt>Buttons</dt><dd>button.glitch, confirm then cancel, ${MODAL.gap} px apart; both take the ask's intent.
        Both rest alike; under the cursor the confirm fills with the intent's colour and the cancel shows its inverse
        (ink body, the intent's bar and text).</dd>
      <dt>Keys</dt><dd>Left and Right move the focus, Enter or Space press it, Esc answers the cancel (today's keys).
        A focused button shows only with the keyboard.</dd>
      <dt>Mouse</dt><dd>Both buttons rest grey; the one under the pointer plays the hover swipe, a click presses it.
        Moving the mouse switches to mouse mode, a key switches back and the focus returns where it was (the game's
        inputMode, #149a). From mouse mode the first Enter or Space only shows the focus, the next presses it; arrows
        show and move it; Esc cancels at once. The keys start from the last button the mouse touched. Today the mouse
        moves the green focus and Enter presses it at once.</dd>
      <dt>Opens on</dt><dd>The confirm, except a negative ask, which opens on the cancel so a stray Enter loses nothing
        (a proposal, pending Jess)</dd>
      <dt>Cursor</dt><dd>No cursor.bar: on a button.glitch the bar hides and the button shows its focus</dd>
      <dt>Behaviour at #126</dt><dd>G.UI.ask gains an intent for each ask (and which button it opens on); the intent
        is a prop, the dialog never reads game state</dd>
    </dl></section>`;
}
function cancelSection() {
  const rows = GLITCH_INTENTS.map(
    (kind) => `<h4 class="lib-dim">${esc(kind.intent)}</h4><div class="lib-states">${cancelTile(kind, false)}${cancelTile(
      kind,
      true
    )}</div>`
  ).join('');
  return `<section class="lib-story" data-draft="button.glitch.cancel">
    <h3>${nameButton('button.glitch.cancel')} ${draftTag('a new button.glitch state (Jess 2026-11-19)')}</h3>
    ${rows}
    <dl class="lib-facts">
      <dt>At rest</dt><dd>Exactly button.glitch.rest: grey.raised body, grey.white bar and text, like the confirm</dd>
      ${cleanColour('Focus body', 'color.grey.ink', GLITCH_CANCEL.focusBody)}
      <dt>Focus bar and text</dt><dd>The intent's colour: teal.base, green.base or red.base, the inverse of the
        confirm's focus look (the intent's body with ink bar and text)</dd>
      <dt>Swipe</dt><dd>The same right-to-left swipe as every button.glitch, uncovering the inverse look</dd>
      <dt>Press</dt><dd>The same CRT switch-off and switch-on as every button.glitch</dd>
      <dt>Open</dt><dd>A focused cancel's ink body on the grey.panel dialog is nearly the same dark (#101010 on
        #181818), so it reads as a coloured bar and word more than as a box; the confirm beside it goes back to rest</dd>
    </dl></section>`;
}

const MODAL_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note:
      'The dialog going forward: panel.clean, Michroma, button.glitch. Each ask has an intent; its cancel is the new ' +
      'button.glitch.cancel state.',
    draw: () => {
      queueMicrotask(startModalDemos);
      return modalSection() + cancelSection();
    },
  },
  {
    id: 'current',
    title: 'Current',
    note: 'What the game draws today, for comparing.',
    draw: () => primitiveBody('primitives/modal'),
  },
];
const modalPage = (tab) => tabbedPage('Modal', MODAL_TABS, tab);
