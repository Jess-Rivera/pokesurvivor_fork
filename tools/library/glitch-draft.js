// tools/library/glitch-draft.js: the Buttons page tabs and the Glitch Draft button. A plain script sharing the board's globals; index.html
// loads the board's files in order, board.js first and start.js last.
'use strict';
// ---------- Buttons, Glitch Draft (Jess 2026-11-18): a possible new button design, one state at a time ----------
// The shape from tools/library/idea-holding/glitch-button-base.css with its colours swapped for Unified ones. Rest: the
// red body becomes grey.raised, the teal bar and the text grey.white. Focus (under the cursor or the mouse): one swipe
// from right to left turns the bar black (grey.ink), the body the kind's colour and the text black. The source's hover
// glitch layer is not drawn. Board only: not a library piece yet, so no story file and no game file.
const GLITCH_REST = { body: greyTone('raised'), bar: greyTone('white'), text: greyTone('white') };
const rampBase = (ramp) => valueOf(ramp.colours.find((colour) => colour[0] === 'base'));
// The three kinds (Jess 2026-11-18): the same button, only the focus body differs. Neutral is the standard; negative
// takes or gives something away; positive spends something.
const GLITCH_KINDS = [
  {
    name: 'button.neutral',
    job: 'The standard button',
    token: 'color.teal.base',
    focusBody: rampBase(UNIFIED_TEAL),
    labels: ['Resume', 'Settings', 'Team'],
  },
  {
    name: 'button.negative',
    job: 'Takes or gives something away',
    token: 'color.red.base',
    focusBody: rampBase(UNIFIED_RED),
    labels: ['End Run', 'Sell', 'Let It Go'],
  },
  {
    name: 'button.positive',
    job: 'Spends something',
    token: 'color.green.base',
    focusBody: rampBase(UNIFIED_GREEN),
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
  ]
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
const glitchButtons = (kind, look) =>
  kind.labels
    .map(
      (label) => `<button type="button" class="lib-glitch-button${look ? ' ' + look : ''}"
    tabindex="-1" data-label="${esc(label)}" style="${glitchColours(kind, / refused/.test(' ' + look), / disabled/.test(' ' + look))}">${esc(
      label
    )}</button>`
    )
    .join('');
const glitchTile = (kind, state, title, look) => `<figure class="lib-state">
  <div class="lib-stage" data-state="${kind.name}:${state}"
    style="display:flex;gap:24px;background:${GLITCH_STAGE}">
    ${glitchButtons(kind, look)}</div>
  <figcaption>${nameButton(kind.name + '.' + state)}<br>${esc(title)}</figcaption></figure>`;
const glitchColour = (part, token, value) =>
  `<dt>${esc(part)}</dt><dd>${nameButton(token)}<span>${esc(value)}</span></dd>`;
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
const glitchKindStory = (kind) => `<section class="lib-story" data-draft="${kind.name}">
    <h3>${nameButton(kind.name)} <span class="lib-dim">${esc(kind.job)}</span>
      <span class="lib-dim lib-mono">draft, board only</span></h3>
    <div class="lib-states">
      ${glitchTile(kind, 'rest', 'At rest (hover one to play the swipe, hold the mouse to press)', '')}
      ${glitchTile(kind, 'focus', 'Under the cursor, after the swipe', 'focused')}
      ${glitchTile(kind, 'press', 'Held down, after the switch-off', 'focused pressed')}
      ${glitchTile(kind, 'refused', 'Refused, at rest (hover one to play the swipe, press it to shake)', 'refused')}
      ${glitchTile(kind, 'refusedFocus', 'Refused, under the cursor', 'refused focused')}
      ${glitchTile(kind, 'disabled', 'Disabled: the cursor skips it, so hover and press do nothing', 'disabled')}
    </div>
    <dl class="lib-facts">${glitchColour('Focus body', kind.token, kind.focusBody)}
      ${glitchColour('Refused focus bar', kind.token, kind.focusBody)}</dl></section>`;
function glitchDraftPage() {
  return `${GLITCH_KINDS.map(glitchKindStory).join('')}
    <section class="lib-story"><h3>Shared by all three</h3>
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
      <dt>Refused press</dt><dd>A sideways shake, 4 px each way and settling, ${GLITCH_SHAKE_MS} ms; no colour change and no
        switch-off, so it never looks like a press that worked.</dd>
      <dt>Swipe</dt><dd>One hard edge from the right edge (the bar's) to the left, ${GLITCH_SWIPE_MS} ms, linear; the
        bar, then the body and each letter change as it passes. Leaving swipes it back, left to right.</dd>
      <dt>Press</dt><dd>A CRT switching off, ${GLITCH_PRESS_MS} ms: the label collapses into a 2 px ink line a little
        wider than the word, then shrinks to an ink dot that stays while held.</dd>
      <dt>Release</dt><dd>A CRT switching on, ${GLITCH_RELEASE_MS} ms: the dot draws out into an ink line, the line opens
        into the label, which overshoots, flickers once, then settles.</dd>
      <dt>Font</dt><dd>${nameButton('font.michroma')}<span>18 px, letter spacing 3 px (the source's size)</span></dd>
      <dt>Shape</dt><dd>Padding 16 x 20 px; bottom-left corner cut at 45 degrees (5% of the diagonal); a 6 px bar on the
        right</dd>
      <dt>Source</dt><dd class="lib-mono">tools/library/idea-holding/glitch-button-base.css (Uiverse.io by namecho)</dd>
    </dl></section>`;
}
const BUTTON_TABS = [
  { id: 'current', title: 'Current', draw: () => primitiveBody('primitives/buttons') },
  {
    id: 'glitch',
    title: 'Glitch Draft',
    note:
      'A possible new button design, being worked out one state at a time: button.neutral, button.negative and ' +
      'button.positive, at rest, focused and pressed so far.',
    draw: glitchDraftPage,
  },
];
const buttonsPage = (tab) => tabbedPage('Buttons', BUTTON_TABS, tab);
