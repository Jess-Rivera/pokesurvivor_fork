// tools/library/cursor-draft.js: the Cursor page and the bar cursor draft. A plain script sharing the board's globals
// (it draws with the Panels and Squares drafts' pieces, so it loads after them); index.html loads the board's files in
// order, board.js first and start.js last.
'use strict';
// ---------- Cursor (Jess 2026-11-19): the selection cursor as button.glitch's bar, board only ----------
// The keyboard selection cursor is the code's interface, so it is clean (decision
// 2026-11-18-155-pixel-panels-for-one-pokemon-clean-for-the-rest), and it should speak button.glitch's language
// (docs/META-NARRATIVE.md: clean, consistent, deliberate). Today's cursor is the B2 art's four yellow corner brackets
// with an outline (js/ui/hud-kit.js CursorCorner). The draft: button.glitch's 6 px bar on its own, to the right of the
// selected item and its full height. At rest it blinks like a terminal cursor (Jess 2026-11-19); the CRT plays only on
// a move: CRT off (the button's press), the bar moves, CRT on (the button's release), then the blink starts again. A
// button.glitch shows its own focus swipe instead, so the bar hides on one. Holding an arrow skips the CRT off (the
// key repeats faster than off plus on), so a held key moves at once and plays only the CRT on. Mouse (Jess
// 2026-11-19): the bar hides as soon as the mouse is over a button, and comes back only on a click on something else
// (or an arrow key); moving the mouse off the button does not bring it back. Board only: the game's cursor changes at
// #126.
const CURSOR = {
  width: 6, // px, button.glitch's bar
  gap: 2, // px between the item and the bar
  colour: unifiedTone(UNIFIED_YELLOW, 'base'), // yellow.base: Unified keeps it for selection
  offMs: GLITCH_PRESS_MS, // CRT off, the button's press
  onMs: GLITCH_RELEASE_MS, // CRT on, the button's release
  blinkMs: 530, // each half of the blink, on then off (a terminal cursor's)
};
const CARD_SAMPLE = { width: 186, height: 120 }; // a card-sized panel.clean
const cursorStyle = () =>
  [
    ['--cursor-colour', CURSOR.colour],
    ['--cursor-off', CURSOR.offMs + 'ms'],
    ['--cursor-on', CURSOR.onMs + 'ms'],
    ['--cursor-blink', CURSOR.blinkMs * 2 + 'ms'],
  ]
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
const cursorCard = () => `<div class="lib-clean" style="--clean-body:${CLEAN_PANEL.body};--clean-edge:${CLEAN_PANEL.edge};
  --clean-edge-width:${CLEAN_PANEL.edgeWidth}px;width:${CARD_SAMPLE.width}px;height:${CARD_SAMPLE.height}px"></div>`;
const cursorButton = (label) => `<button type="button" class="lib-glitch-button" tabindex="-1" data-label="${esc(label)}"
  style="${glitchColours(GLITCH_INTENTS[0], false, false)}">${esc(label)}</button>`;
// the items the page draws the cursor beside: the clean square, the move slot and a card
const CURSOR_SAMPLES = {
  square: () => cleanSquare(CLEAN_SQUARE_STATES[0]),
  emptySquare: () => cleanSquare(CLEAN_SQUARE_STATES[1]),
  slot: () => slantedSvg(SLANTED_STATES[1]),
  bondSlot: () => slantedSvg(SLANTED_STATES[2]),
  card: cursorCard,
};
// blink: menus (nothing else moves, the blink helps you find your place); solid: during a run (the move slot and the
// roster row), where a blink at the edge of vision pulls the eye off the horde (Jess 2026-11-19). Which one a screen
// uses is behavior, set at #126; both are states the bar shows.
const staticBar = (solid) =>
  `<span class="lib-cursor-bar${solid ? '' : ' is-blinking'}" style="left:calc(100% + ${CURSOR.gap}px);top:0;height:100%"></span>`;
const cursorTile = (id, title, inner, solid) => `<figure class="lib-state">
  <div class="lib-stage" data-state="cursor.bar:${id}" style="background:${CLEAN_STAGE};padding-right:24px;${cursorStyle()}">
    <div class="lib-cursor-host">${inner}${staticBar(solid)}</div></div>
  <figcaption>${nameButton('cursor.bar.' + id)}<br>${esc(title)}</figcaption></figure>`;

// ---------- the demo: arrow through a screen's worth of items ----------
const demoItem = (inner, button) =>
  `<div class="lib-cursor-item" data-cursor-item${button ? ' data-cursor-button' : ''}>${inner}</div>`;
const CURSOR_DIRECTIONS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
function startCursorDemo() {
  const demo = document.querySelector('[data-cursor-demo]:not([data-ready])');
  if (!demo) return;
  demo.dataset.ready = '';
  const bar = demo.querySelector('[data-cursor-bar]'),
    items = [...demo.querySelectorAll('[data-cursor-item]')];
  let current = null,
    timer = null;
  const boxOf = (item) => {
    const stage = demo.getBoundingClientRect(),
      box = item.getBoundingClientRect();
    return { left: box.left - stage.left, top: box.top - stage.top, width: box.width, height: box.height };
  };
  const centreOf = (item) => {
    const box = boxOf(item);
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  };
  const isButton = (item) => item && item.hasAttribute('data-cursor-button');
  const buttonOf = (item) => item.querySelector('.lib-glitch-button');
  const isHidden = () => bar.classList.contains('is-off');
  function place(item) {
    const box = boxOf(item);
    bar.style.left = box.left + box.width + CURSOR.gap + 'px';
    bar.style.top = box.top + 'px';
    bar.style.height = box.height + 'px';
    bar.style.setProperty('--dot', (CURSOR.width / box.height).toFixed(3)); // the dot: as tall as the bar is wide
  }
  /** Plays one CRT animation on the bar (the blink stops while it plays), then done. */
  function play(name, ms, done) {
    bar.classList.remove('crt-off', 'crt-on', 'is-blinking');
    void bar.offsetWidth; // restart the keyframes
    bar.classList.add(name);
    clearTimeout(timer);
    timer = setTimeout(() => {
      bar.classList.remove(name);
      if (done) done();
    }, ms);
  }
  function hide() {
    clearTimeout(timer);
    bar.classList.remove('crt-off', 'crt-on', 'is-blinking');
    bar.classList.add('is-off');
  }
  /** The bar arrives at an item: CRT on, then the blink. On a button it stays hidden; the button shows its focus. */
  function show(item) {
    if (isButton(item)) {
      hide();
      buttonOf(item).classList.add('focused');
      return;
    }
    place(item);
    bar.classList.remove('is-off');
    play('crt-on', CURSOR.onMs, () => bar.classList.add('is-blinking'));
  }
  function select(item, quick) {
    if (!item) return;
    if (item === current) {
      if (isHidden()) show(item); // a click on the selected item brings a hidden bar back
      return;
    }
    const leaving = current;
    current = item;
    if (isButton(leaving)) buttonOf(leaving).classList.remove('focused');
    if (!leaving || quick || isHidden()) show(item);
    else play('crt-off', CURSOR.offMs, () => show(item));
  }
  /** The nearest item in an arrow's direction: along the arrow first, sideways counted double. */
  function nearest([dx, dy]) {
    const from = centreOf(current);
    let best = null,
      bestScore = Infinity;
    for (const item of items) {
      if (item === current) continue;
      const to = centreOf(item),
        along = (to.x - from.x) * dx + (to.y - from.y) * dy,
        sideways = Math.abs(dx ? to.y - from.y : to.x - from.x);
      if (along <= 1) continue;
      const score = along + 2 * sideways;
      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    }
    return best;
  }
  demo.addEventListener('keydown', (event) => {
    const direction = CURSOR_DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    const target = nearest(direction);
    if (target) select(target, event.repeat);
    else if (isHidden()) show(current); // no item that way: an arrow still brings a hidden bar back
  });
  items.forEach((item) => {
    item.addEventListener('pointerdown', () => {
      demo.focus();
      select(item, false);
    });
    // the mouse over a button hides the bar at once; leaving the button does not bring it back, a click does
    if (isButton(item)) item.addEventListener('pointerenter', hide);
  });
  select(items[0], true);
}
function cursorDemo() {
  const { square, emptySquare, slot, bondSlot, card } = CURSOR_SAMPLES;
  return `<div class="lib-stage lib-cursor-demo" tabindex="0" data-cursor-demo
    style="background:${CLEAN_STAGE};${cursorStyle()}">
    <div class="lib-cursor-row">${[square, square, emptySquare, emptySquare].map((draw) => demoItem(draw())).join('')}</div>
    <div class="lib-cursor-row">${demoItem(slot())}${demoItem(bondSlot())}</div>
    <div class="lib-cursor-row">${demoItem(card())}${demoItem(cursorButton('Resume'), true)}</div>
    <span class="lib-cursor-bar is-off" data-cursor-bar></span>
  </div>`;
}

function cursorPage() {
  queueMicrotask(startCursorDemo);
  return `<h2>Cursor</h2>
    <p class="lib-note">A possible selection cursor, board only: button.glitch's bar on its own, beside what is
      selected. It replaces today's corner brackets at #126.</p>
    <section class="lib-story" data-draft="cursor.bar">
    <h3>${nameButton('cursor.bar')} <span class="lib-dim lib-mono">draft, board only</span></h3>
    <h4 class="lib-dim">Blink: in the menus, beside a clean square and a card</h4>
    <div class="lib-states">
      ${cursorTile('blink', 'Beside square.clean (40 px)', CURSOR_SAMPLES.square())}
      ${cursorTile('blinkCard', 'Beside a card (panel.clean)', CURSOR_SAMPLES.card())}
    </div>
    <h4 class="lib-dim">Solid: during a run, beside the move slot</h4>
    <div class="lib-states">
      ${cursorTile('solid', 'Beside panel.slanted, the move slot: no blink', CURSOR_SAMPLES.slot(), true)}
    </div>
    <h4 class="lib-dim">Try it: click the box, then use the arrow keys (hold one for the quick move); put the mouse
      on Resume to hide the bar, click another item to bring it back</h4>
    ${cursorDemo()}
    <dl class="lib-facts">
      ${cleanColour('Bar', 'color.yellow.base', CURSOR.colour)}
      <dd class="lib-dim">Unified keeps yellow for selection, so selected never reads as a pocket's edge colour</dd>
      <dt>Bar</dt><dd>${CURSOR.width} px wide (button.glitch's), ${CURSOR.gap} px right of the item, the item's full
        height; no outline</dd>
      <dt>Move</dt><dd>CRT off ${CURSOR.offMs} ms (the button's press: a short stub a little wider, then a dot), the
        bar moves, CRT on ${CURSOR.onMs} ms (the button's release: dot, stub, past full height, one flicker)</dd>
      <dt>Blink</dt><dd>In the menus: like a terminal cursor, ${CURSOR.blinkMs} ms on, ${CURSOR.blinkMs} ms off, hard
        steps; it restarts on, after each move</dd>
      <dt>Solid</dt><dd>During a run (the move slot, the roster row): no blink, so it never flickers at the edge of
        vision while you watch the horde. The CRT still plays on a move. Which screen takes which is set at #126.</dd>
      <dt>Held key</dt><dd>A repeating arrow skips the CRT off: the bar moves at once and plays only the CRT on</dd>
      <dt>On a button</dt><dd>The bar hides; button.glitch shows its own focus swipe (Resume in the demo)</dd>
      <dt>Mouse</dt><dd>The bar hides the moment the mouse is over a button and stays hidden when it leaves; a click
        on another item brings it back there (with the CRT on), as does an arrow key</dd>
      <dt>Replaces</dt><dd>Today's B2 corner brackets (js/ui/hud-kit.js CursorCorner), at #126</dd>
      <dt>Open</dt><dd>Yellow beside yellow (an Electric move slot, a gold item) has no outline to separate it; a tall
        Shop card makes a tall bar</dd>
    </dl></section>`;
}
