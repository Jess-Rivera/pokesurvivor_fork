// tools/library/toggle-draft.js: the Toggles page and the toggle.power draft. A plain script sharing the board's globals;
// index.html loads the board's files in order, board.js first and start.js last.
'use strict';
// ---------- Toggles (Jess 2026-11-18): a possible toggle design, board only ----------
// toggle.power: the power marks of a real switch, drawn (no font has them, so typed characters would differ per
// computer). Off is the power-off ring (the O of an I/O switch) in teal.dark; on is the power-on bar (the I) in
// teal.base, a straight bar with square ends. The flips are the button's CRT turned on its side (Jess 2026-11-18), so
// the line it collapses to is upright: on, the ring collapses sideways into a bright upright line that becomes the bar,
// a little taller, flickers once and settles; off, the bar opens sideways into the ring, a little wider, flickers once
// and settles dim. Two states only, off and on
// (Jess). The label sits to the right.
const tealTone = (part) => valueOf(UNIFIED_TEAL.colours.find((colour) => colour[0] === part));
const TOGGLE_COLOURS = { off: tealTone('dark'), on: tealTone('base'), label: greyTone('white') };
const TOGGLE_STAGE = greyTone('panel'); // the box the draft toggles sit in, as the button draft's
const TOGGLE_ON_MS = 140; // flip on: the ring collapses sideways into the bar (a draft, for the feel test)
const TOGGLE_OFF_MS = 120; // flip off: the bar opens sideways into the ring (a draft, for the feel test)
const TOGGLE_LABELS = ['Able to Learn', 'Music', 'Screen Shake'];
const toggleStyle = [
  ['--toggle-off', TOGGLE_COLOURS.off],
  ['--toggle-on', TOGGLE_COLOURS.on],
  ['--toggle-label', TOGGLE_COLOURS.label],
  ['--toggle-on-time', TOGGLE_ON_MS + 'ms'],
  ['--toggle-off-time', TOGGLE_OFF_MS + 'ms'],
]
  .map(([name, value]) => `${name}:${value}`)
  .join(';');
const toggleRow = (on) =>
  TOGGLE_LABELS.map(
    (label) => `<button type="button" class="lib-toggle${on ? ' on' : ''}" tabindex="-1" aria-pressed="${on}"
      style="${toggleStyle}"><span class="lib-toggle-mark"><span></span></span>${esc(label)}</button>`
  ).join('');
const toggleTile = (state, title, on) => `<figure class="lib-state">
  <div class="lib-stage" data-state="toggle.power:${state}"
    style="display:flex;flex-direction:column;align-items:flex-start;gap:14px;background:${TOGGLE_STAGE}">
    ${toggleRow(on)}</div>
  <figcaption>${nameButton('toggle.power.' + state)}<br>${esc(title)}</figcaption></figure>`;
// a click flips a toggle, so the squish can be tried on either tile
document.addEventListener('click', (event) => {
  const toggle = event.target.closest('.lib-toggle');
  if (!toggle) return;
  const turningOn = !toggle.classList.contains('on');
  toggle.classList.toggle('on', turningOn);
  toggle.setAttribute('aria-pressed', turningOn);
  toggle.classList.remove('flipping-on', 'flipping-off');
  void toggle.offsetWidth; // restart the flip if a quick second click lands mid-animation
  toggle.classList.add(turningOn ? 'flipping-on' : 'flipping-off');
});
const toggleColour = (part, token, value) =>
  `<dt>${esc(part)}</dt><dd>${nameButton(token)}<span>${esc(value)}</span></dd>`;
function togglesPage() {
  return `<h2>Toggles</h2>
    <p class="lib-note">A possible toggle design, board only: two states, off and on. Click any toggle to flip it.</p>
    <section class="lib-story" data-draft="toggle.power">
    <h3>${nameButton('toggle.power')} <span class="lib-dim lib-mono">draft, board only</span></h3>
    <div class="lib-states">
      ${toggleTile('off', 'Off: the power-off ring', false)}
      ${toggleTile('on', 'On: the power-on bar', true)}
    </div>
    <dl class="lib-facts">
      ${toggleColour('Behind', 'color.grey.panel', TOGGLE_STAGE)}
      ${toggleColour('Off mark', 'color.teal.dark', TOGGLE_COLOURS.off)}
      ${toggleColour('On mark', 'color.teal.base', TOGGLE_COLOURS.on)}
      ${toggleColour('Label', 'color.grey.white', TOGGLE_COLOURS.label)}
      <dt>Flip on</dt><dd>The CRT on its side, ${TOGGLE_ON_MS} ms: the ring collapses sideways into a bright upright line
        that becomes the bar, a little taller than it ends, flickers once, then settles.</dd>
      <dt>Flip off</dt><dd>The CRT on its side, ${TOGGLE_OFF_MS} ms: the bar opens sideways into the ring, a little wider
        than it ends, flickers once, then settles dim.</dd>
      <dt>Mark</dt><dd>A 22 px ring with a 2 px stroke; the bar is 4 by 22 px, straight, with square ends</dd>
      <dt>Font</dt><dd>${nameButton('font.michroma')}<span>18 px, letter spacing 3 px (as the button)</span></dd>
    </dl></section>`;
}
