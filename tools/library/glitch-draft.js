// tools/library/glitch-draft.js: the Buttons page tabs and the Glitch Draft button. A plain script sharing the board's globals; index.html
// loads the board's files in order, board.js first and start.js last.
'use strict';
// ---------- Buttons, Glitch Draft (Jess 2026-11-18): a possible new button design, one state at a time ----------
// The shape from tools/library/idea-holding/glitch-button-base.css with its colours swapped for Unified ones. Rest: the
// red body becomes grey.raised, the teal bar and the text grey.white. Focus (under the cursor or the mouse): one swipe
// from right to left turns the bar black (grey.ink), the body the kind's colour and the text black. The source's hover
// glitch layer is not drawn. Board only: not a library piece yet, so no story file and no game file. It replaces
// button.slanted and button.rounded on every screen at #126 (decision 2026-11-18-155-button-glitch-replaces-slanted-and-rounded).
const GLITCH_REST = { body: greyTone('raised'), bar: greyTone('white'), text: greyTone('white') };
const rampBase = (ramp) => valueOf(ramp.colours.find((colour) => colour[0] === 'base'));
// One piece, button.glitch, named by its look (decision 2026-11-18-155-library-pieces-named-by-look). Its intent
// (Jess 2026-11-18) is part of the state name, as in button.glitch.focusNegative: only the focus body differs. Neutral
// is the standard; negative takes or gives something away; positive spends something.
const GLITCH_INTENTS = [
  {
    intent: 'Neutral',
    job: 'The standard button',
    token: 'color.teal.base',
    focusBody: rampBase(UNIFIED_TEAL),
    glitchSplit: [rampBase(UNIFIED_YELLOW), rampBase(UNIFIED_RED)],
    splitToken: 'color.red.base',
    labels: ['Resume', 'Settings', 'Team'],
  },
  {
    intent: 'Negative',
    job: 'Takes or gives something away',
    token: 'color.red.base',
    focusBody: rampBase(UNIFIED_RED),
    glitchSplit: [rampBase(UNIFIED_YELLOW), rampBase(UNIFIED_TEAL)],
    splitToken: 'color.teal.base',
    labels: ['End Run', 'Sell', 'Let It Go'],
  },
  {
    intent: 'Positive',
    job: 'Spends something',
    token: 'color.green.base',
    focusBody: rampBase(UNIFIED_GREEN),
    glitchSplit: [rampBase(UNIFIED_YELLOW), rampBase(UNIFIED_TEAL)],
    splitToken: 'color.teal.base',
    labels: ['Buy 9k', 'Reroll', 'Upgrade'],
  },
];
const GLITCH_FOCUS = { bar: greyTone('ink'), text: greyTone('ink') };
const GLITCH_STAGE = greyTone('panel'); // the box the draft buttons sit in (Jess 2026-11-18)
const GLITCH_SWIPE_MS = 120; // the whole swipe, right edge to left edge (a draft, for the feel test)
const GLITCH_PRESS_MS = 80; // press: the CRT switching off, label to line to dot (a draft, for the feel test)
const GLITCH_RELEASE_MS = 70; // release: the CRT switching on, dot to line to label (a draft, for the feel test)
const GLITCH_SHAKE_MS = 120; // refused press: a sideways shake, "no" (a draft, for the feel test)
// Refused (Jess 2026-11-18): the button says "not now" before it is pressed, like a Buy 23k you cannot afford. At rest
// the bar and label go grey.mid; under the cursor the swipe still plays, but the body is grey.mid instead of the kind's
// colour (colour means "you can") and the bar keeps the kind's colour, so it still shows what the button would do.
// A press on one shakes it sideways instead of switching it off: the press landed and was turned down (Jess
// 2026-11-18; the screen still plays its sound and toast).
const GLITCH_REFUSED = { bar: greyTone('mid'), text: greyTone('mid'), focusBody: greyTone('mid') };
// Disabled (Jess 2026-11-18): not an option at all, so the cursor skips it: rest only, no swipe and no press. Refused's
// rest look with ink text, so it reads fainter than a refused button.
const GLITCH_DISABLED = { bar: greyTone('mid'), text: greyTone('ink') };
// Cancel (Jess 2026-11-19): the answer that backs out of an ask. At rest it is exactly button.glitch.rest. Under the
// cursor the same swipe uncovers the inverse of the intent's focus look: a grey.ink body with the intent's colour for
// the bar and the text (a neutral cancel is teal on ink, a positive one green, a negative one red), where the confirm
// uncovers the intent's colour with ink bar and text. So the two only differ once the cursor is on one. The dialog
// (modal-draft.js) uses it.
const GLITCH_CANCEL = { focusBody: greyTone('ink'), labels: ['Cancel', 'Keep', 'Back'] };
const glitchCancelColours = (kind) =>
  glitchColours(kind, false, false) +
  [
    ['--glitch-focus-body', GLITCH_CANCEL.focusBody],
    ['--glitch-focus-bar', kind.focusBody],
    ['--glitch-focus-text', kind.focusBody],
  ]
    .map(([name, value]) => `;${name}:${value}`)
    .join('');
// Glitch, the secret state (Jess 2026-11-18): for the meta-narrative later, not used by any screen yet. The source's
// glitch layer: slices of the focused button jump about in hard steps, its label split into two offset colour copies
// (yellow.base up-left and a second Unified base down-right, which also draws the stripe at the cut corner).
// Three settings (Jess 2026-11-18), the props it takes once it is a library piece: burst (how long one glitch lasts),
// gap (the calm between bursts) and count (how many bursts; Infinity for forever). The board shows two setups.
const GLITCH_BURSTS = {
  first: { burst: 400, gap: 0, count: 1 }, // the first time the glitch happens: one short burst (Jess)
  loop: { burst: 1000, gap: 1000, count: Infinity }, // a repeating glitch, looped so it can be watched
};
const glitchColours = (kind, refused, disabled) =>
  [
    ['--glitch-body', GLITCH_REST.body],
    ['--glitch-bar', disabled ? GLITCH_DISABLED.bar : refused ? GLITCH_REFUSED.bar : GLITCH_REST.bar],
    ['--glitch-text', disabled ? GLITCH_DISABLED.text : refused ? GLITCH_REFUSED.text : GLITCH_REST.text],
    ['--glitch-focus-body', refused ? GLITCH_REFUSED.focusBody : kind.focusBody],
    ['--glitch-focus-bar', refused ? kind.focusBody : GLITCH_FOCUS.bar],
    ['--glitch-focus-text', GLITCH_FOCUS.text],
    ['--glitch-swipe', GLITCH_SWIPE_MS + 'ms'],
    ['--glitch-press', GLITCH_PRESS_MS + 'ms'],
    ['--glitch-release', GLITCH_RELEASE_MS + 'ms'],
    ['--glitch-shake', GLITCH_SHAKE_MS + 'ms'],
    ['--glitch-split-a', kind.glitchSplit[0]],
    ['--glitch-split-b', kind.glitchSplit[1]],
  ]
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
const glitchButtons = (kind, look) => {
  const cancel = / cancel/.test(' ' + look);
  return (cancel ? GLITCH_CANCEL.labels : kind.labels)
    .map(
      (label) => `<button type="button" class="lib-glitch-button${look ? ' ' + look : ''}"
    tabindex="-1" data-label="${esc(label)}" style="${
      cancel ? glitchCancelColours(kind) : glitchColours(kind, / refused/.test(' ' + look), / disabled/.test(' ' + look))
    }">${esc(label)}${
      / secret/.test(' ' + look)
        ? `<span class="lib-glitch-slices" aria-hidden="true" data-burst="${look.match(/secret-(\w+)/)[1]}">${esc(label)}</span>`
        : ''
    }</button>`
    )
    .join('');
};
const glitchTile = (kind, state, title, look) => `<figure class="lib-state">
  <div class="lib-stage" data-state="button.glitch:${state}"
    style="display:flex;gap:24px;background:${GLITCH_STAGE}">
    ${glitchButtons(kind, look)}</div>
  <figcaption>${nameButton('button.glitch.' + state)}<br>${esc(title)}</figcaption></figure>`;
const glitchColour = (part, token, value) =>
  `<dt>${esc(part)}</dt><dd>${nameButton(token)}<span>${esc(value)}</span></dd>`;
// Plays a glitch layer's bursts: each burst runs the keyframes once over its burst length, then waits out the gap.
// Stops when the page is redrawn (the layer leaves the document).
function playGlitch(layer, { burst, gap, count }) {
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
const startGlitches = (root) =>
  root.querySelectorAll('.lib-glitch-slices[data-burst]:not([data-playing])').forEach((layer) => {
    layer.dataset.playing = '';
    playGlitch(layer, GLITCH_BURSTS[layer.dataset.burst]);
  });
new MutationObserver(() => startGlitches(document)).observe(document.getElementById('main'), { childList: true });
// a click on a first-time tile plays its one burst again
document.addEventListener('click', (event) => {
  const stage = event.target.closest('.lib-stage');
  if (!stage) return;
  stage
    .querySelectorAll('.lib-glitch-slices[data-burst="first"]')
    .forEach((layer) => playGlitch(layer, GLITCH_BURSTS.first));
});
// Release: CSS has no "just stopped being pressed" state, so the board marks the pressed button and plays the switch-on
// as a class when the mouse comes up anywhere.
let glitchHeld = null;
document.addEventListener('pointerdown', (event) => {
  glitchHeld = event.target.closest && event.target.closest('.lib-glitch-button');
});
document.addEventListener('pointerup', () => {
  const button = glitchHeld;
  glitchHeld = null;
  if (!button || button.classList.contains('refused') || button.classList.contains('disabled')) return;
  button.classList.remove('released');
  void button.offsetWidth; // restart the switch-on if a quick second press lands mid-animation
  button.classList.add('released');
  setTimeout(() => button.classList.remove('released'), GLITCH_RELEASE_MS);
});
// the states that look the same whatever the intent; hovering the rest tile plays the neutral swipe
const glitchSharedStates = (neutral) => `<h4 class="lib-dim">Every intent</h4>
    <div class="lib-states">
      ${glitchTile(neutral, 'rest', 'At rest (hover one to play the neutral swipe, hold the mouse to press)', '')}
      ${glitchTile(neutral, 'refused', 'Refused, at rest (hover one to play the swipe, press it to shake)', 'refused')}
      ${glitchTile(neutral, 'disabled', 'Disabled: the cursor skips it, so hover and press do nothing', 'disabled')}
    </div>`;
const glitchIntentStates = (kind) => `<h4 class="lib-dim">${esc(kind.intent)}: ${esc(kind.job)}</h4>
    <div class="lib-states">
      ${glitchTile(kind, 'focus' + kind.intent, 'Under the cursor, after the swipe', 'focused')}
      ${glitchTile(kind, 'press' + kind.intent, 'Held down, after the switch-off', 'focused pressed')}
      ${glitchTile(kind, 'cancel' + kind.intent, 'Cancel, at rest: the same as rest (hover one to swipe)', 'cancel')}
      ${glitchTile(kind, 'cancelFocus' + kind.intent, 'Cancel, under the cursor: ink body, the intent\u2019s bar and text', 'cancel focused')}
      ${glitchTile(kind, 'refusedFocus' + kind.intent, 'Refused, under the cursor', 'refused focused')}
      ${glitchTile(kind, 'glitch' + kind.intent, 'Secret, the first time: one 400 ms burst (click it to replay)', 'secret secret-first')}
      ${glitchTile(kind, 'glitch' + kind.intent, 'Secret, repeating: 1 s bursts with 1 s gaps, forever', 'secret secret-loop')}
    </div>
    <dl class="lib-facts">${glitchColour('Focus body', kind.token, kind.focusBody)}
      ${glitchColour('Cancel focus bar and text', kind.token, kind.focusBody)}
      ${glitchColour('Refused focus bar', kind.token, kind.focusBody)}
      ${glitchColour('Glitch split, up-left', 'color.yellow.base', kind.glitchSplit[0])}
      ${glitchColour('Glitch split, down-right', kind.splitToken, kind.glitchSplit[1])}</dl>`;
function glitchDraftPage() {
  return `<section class="lib-story" data-draft="button.glitch">
    <h3>${nameButton('button.glitch')} <span class="lib-dim lib-mono">draft, board only</span></h3>
    ${glitchSharedStates(GLITCH_INTENTS[0])}
    ${GLITCH_INTENTS.map(glitchIntentStates).join('')}
    <h4 class="lib-dim">Shared by every intent</h4>
    <dl class="lib-facts">
      ${glitchColour('Behind', 'color.grey.panel', GLITCH_STAGE)}
      ${glitchColour('Rest body', 'color.grey.raised', GLITCH_REST.body)}
      ${glitchColour('Rest bar', 'color.grey.white', GLITCH_REST.bar)}
      ${glitchColour('Rest text', 'color.grey.white', GLITCH_REST.text)}
      ${glitchColour('Focus bar', 'color.grey.ink', GLITCH_FOCUS.bar)}
      ${glitchColour('Focus text', 'color.grey.ink', GLITCH_FOCUS.text)}
      ${glitchColour('Refused bar and text', 'color.grey.mid', GLITCH_REFUSED.text)}
      ${glitchColour('Refused focus body', 'color.grey.mid', GLITCH_REFUSED.focusBody)}
      ${glitchColour('Disabled bar', 'color.grey.mid', GLITCH_DISABLED.bar)}
      ${glitchColour('Disabled text', 'color.grey.ink', GLITCH_DISABLED.text)}
      ${glitchColour('Cancel focus body', 'color.grey.ink', GLITCH_CANCEL.focusBody)}
      <dt>Cancel</dt><dd>The answer that backs out of an ask (a dialog's Cancel, Keep, Keep editing). At rest exactly
        button.glitch.rest; under the cursor the same swipe uncovers the inverse of the intent's focus look (ink body,
        the intent's bar and text), so a focused cancel never reads like a focused confirm. Press and release as any.</dd>
      <dt>Refused press</dt><dd>A sideways shake, 4 px each way and settling, ${GLITCH_SHAKE_MS} ms; no colour change and no
        switch-off, so it never looks like a press that worked.</dd>
      <dt>Swipe</dt><dd>One hard edge from the right edge (the bar's) to the left, ${GLITCH_SWIPE_MS} ms, linear; the
        bar, then the body and each letter change as it passes. Leaving swipes it back, left to right.</dd>
      <dt>Press</dt><dd>A CRT switching off, ${GLITCH_PRESS_MS} ms: the label collapses into a 2 px ink line a little
        wider than the word, then shrinks to an ink dot that stays while held.</dd>
      <dt>Release</dt><dd>A CRT switching on, ${GLITCH_RELEASE_MS} ms: the dot draws out into an ink line, the line opens
        into the label, which overshoots, flickers once, then settles.</dd>
      <dt>Glitch</dt><dd>The source's slice-and-jump layer over the focused look, in hard steps. Set by burst, gap and
        count: the first time ${GLITCH_BURSTS.first.burst} ms once; repeating ${GLITCH_BURSTS.loop.burst} ms bursts with
        ${GLITCH_BURSTS.loop.gap} ms gaps. Secret: no screen uses it until the meta-narrative.</dd>
      <dt>Font</dt><dd>${nameButton('font.michroma')}<span>18 px, letter spacing 3 px (the source's size)</span></dd>
      <dt>Shape</dt><dd>Padding 16 x 20 px; bottom-left corner cut at 45 degrees (5% of the diagonal); a 6 px bar on the
        right</dd>
      <dt>Source</dt><dd class="lib-mono">tools/library/idea-holding/glitch-button-base.css (Uiverse.io by namecho)</dd>
    </dl></section>`;
}
const BUTTON_TABS = [
  // The Current (retiring) tab is gone (Jess 2026-11-19): the board shows only the buttons in use going forward.
  // button.slanted and button.rounded still ship in the game until #126 swaps them for button.glitch.
  {
    id: 'glitch',
    title: 'Glitch Draft',
    note:
      'A possible new button design, button.glitch: its states for every intent, then the ones that change with the ' +
      'intent (neutral, negative, positive), the cancel included.',
    draw: glitchDraftPage,
  },
];
const buttonsPage = (tab) => tabbedPage('Buttons', BUTTON_TABS, tab);
