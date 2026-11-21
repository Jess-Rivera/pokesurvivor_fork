// tools/library/catch-draft.js: the composite catch.window, the catch screen (Jess 2026-11-20), today's layout and
// places (js/ui/catch-ui.js, css/bw-catch.css) rebuilt from the board's approved pieces. The window and Pokemon owned
// are clean (the code's interface, a list from your collection); the Pokemon being caught is panel.pixel in its
// type colours with the two-type rim and a plain grey.raised body (Jess 2026-11-20); the belts are
// main.shop.pokeball's; the buttons button.glitch; the Let It Go ask modal.dialog,
// opening on its cancel; the result a toast (Jess 2026-11-20). Text is Silver (the catch screen is the Pokemon
// tier). A plain script sharing the board's globals; it loads after every draft it uses (shop, hud-team-slot, hud-area,
// portraits, cursor, tooltip, modal). A board copy: nothing here reads the game.
'use strict';
// ---------- places: px in the window. Today's (catch-ui.js) but shorter (Jess 2026-11-20): a smaller flee ring and no
// result line, so the window is only as tall as a belt (424, today 500) ----------
const CATCH = {
  stage: { pad: 20, tipRoom: 330, toastRoom: 96 }, // the board's margin; room for the owned tooltip and a toast
  window: { width: 980, height: 424 }, // today's width again: the ring needs no room beside the belts
  mon: { left: 20, top: 20, width: 340, height: 384 }, // as tall as a belt (today 460)
  ring: { size: 160, top: 24, stroke: 4 }, // the flee ring, one step per miss (today 192)
  text: { nameTop: 204, bandTop: 254, ballTop: 308, size: 30, bandSize: 40, inset: 20 },
  // a belt is main.shop.pokeball's: 84 px, the well in the panel's own padding, which holds the cursor ring (it reaches
  // 5 px) without widening it (Jess 2026-11-20); 12 px apart
  belt: { firstLeft: 372, step: 96, wells: 6, well: 52, wellGap: 8, keySize: 20 },
  // the faces 20 px apart across and 16 down, so the cursor ring (it reaches 5 px) clears the next face's ring
  owned: {
    left: 676,
    top: 20,
    width: 284,
    height: 244,
    inset: 16,
    columns: 4,
    face: 48,
    stroke: 2,
    columnGap: 20,
    rowGap: 16,
  },
  // button.glitch at the menus' 54 px, Let It Go on the window's bottom padding, Throw 16 px above it
  button: { left: 678, width: 280, height: 54, tops: [280, 350] },
  tipGap: 12,
  // the result toast (today the result line in the Pokemon panel): G.UI.toast's look in the Unified pieces, bottom
  // centre; Michroma 20 on 30 px lines, wrapping at 720
  toast: { size: 20, lineHeight: 30, maxWidth: 720, padding: '12px 24px', outline: 2 },
};
// the Pokemon being caught: a two-type sample, so the rim shows its split
const CATCH_SAMPLE = {
  dex: 43,
  name: 'Oddish',
  nature: 'Modest',
  types: ['grass', 'poison'],
  misses: 1,
  allowed: 3,
  band: '35-45%',
  ball: 'Poke Ball',
  belts: [
    { bought: true, balls: ['poke', 'poke', 'great', 'poke', 'ultra', 'poke'] },
    { bought: true, balls: ['poke', 'great'] },
    { bought: false, balls: [] },
  ],
  owned: 7, // copies of Oddish in the Pokebox
  tip: { name: 'Oddish \u2642  Box 2', text: 'HP 38   Atk 41   Def 30   Spe 22   SpA 52   SpD 44' },
};
const CATCH_STATES = [
  {
    id: 'rest',
    title: 'At rest: the cursor on the selected Poke Ball (belt 1 numbered), one miss of three, belt 3 not bought',
    cursor: { area: 'slot', belt: 0, slot: 0 },
  },
  {
    id: 'owned',
    title: 'Pokemon owned: the cursor on a copy, its tooltip beside the window',
    cursor: { area: 'owned', index: 1 },
    tip: true,
  },
  {
    id: 'missed',
    title:
      'A miss: a bad-news toast, the ring a step further (a flee closes the screen: \u201cOddish broke free and ' +
      'ran off!\u201d)',
    misses: 2,
    toast: { text: 'Oh no! It broke free.', bad: true },
  },
  {
    id: 'caught',
    title: 'Caught: the result is a toast, not a line in the panel (the throw, wobble and click are motion, not drawn)',
    toast: { text: 'Gotcha! Oddish was caught! It joins your Pokebox when the run ends.' },
  },
  {
    id: 'letGo',
    title: 'Let It Go: the ask opens on Keep trying; Let it go red, Keep trying neutral (Jess 2026-11-20)',
    cursor: { area: 'button', index: 1 },
    ask: true,
  },
];
// the Let It Go ask: modal.dialog's Negative ask with today's words (catch-ui.js letGo)
const CATCH_ASK = {
  ...MODAL_ASKS.find((ask) => ask.id === 'negative'),
  title: 'Let it go?',
  message: 'Let Oddish go? It runs off and your Poke Balls stay on your belt.',
  confirm: 'Let it go',
  cancel: 'Keep trying',
};

/** A box of a size at a place holding inner, with the cursor bar beside it (the board's cursor.bar). */
const catchCursorAt = (left, top, size, inner) =>
  `<div style="${place(left, top)};width:${px(size)};height:${px(size)};${cursorStyle()}">
    ${inner}${staticBar()}</div>`;
/** The same with cursor.ring around it (round portraits; Jess 2026-11-20, catch window first). */
const catchRingAt = (left, top, size, inner) =>
  `<div style="${place(left, top)};width:${px(size)};height:${px(size)};${cursorStyle()}">
    ${inner}${staticRing()}</div>`;

// ---------- the Pokemon: panel.pixel in its types, the flee ring, its name, the catch band, the ball ----------
function catchMonPanel(state) {
  const m = CATCH.mon,
    t = CATCH.text,
    s = CATCH_SAMPLE,
    rim = typeRamp(s.types[0]),
    rimRight = s.types[1] ? typeRamp(s.types[1]) : undefined,
    artPixel = TEAM_SLOT.box.artPixel,
    frame = teamBoxSvg(rim, m.width / artPixel, m.height / artPixel, rimRight, SHOP_CARD_PANEL.body),
    // the flee ring: the first type's dark fills one step per miss over grey.paper (today's paper white)
    ring = portraitRinged(
      { sample: { src: `${PORTRAIT_ART}${s.dex}/Portrait.png` } },
      CATCH.ring.size,
      CATCH.ring.stroke,
      (state.misses || s.misses) / s.allowed,
      { fill: rim.dark, track: greyTone('paper') }
    ),
    centred = (top) => `left:${px(t.inset)};right:${px(t.inset)};top:${px(top)};text-align:center;white-space:normal`,
    line = (text, top, size, colour) => areaText(text, size, AREA_FONTS.silver, centred(top), colour);
  return `<div class="lib-area-piece" style="${place(m.left, m.top)};width:${px(m.width)};height:${px(m.height)}">
    ${frame}
    <div style="${place((m.width - CATCH.ring.size) / 2, CATCH.ring.top)}">${ring}</div>
    ${line(`${s.nature} ${s.name}`, t.nameTop, t.size)}
    ${line(s.band, t.bandTop, t.bandSize)}
    ${line(`with a ${s.ball}`, t.ballTop, t.size)}</div>`;
}

// ---------- the belts: main.shop.pokeball's, with the selected ball and the numbered belt ----------
/** One belt: panel.pixel in the Poke Balls pocket ramp (not bought: the fainted grey ramp) holding six wells. The
 *  selected ball's well takes the pocket's dark inside and light ring (today's selected slot); the numbered belt (the
 *  one the cursor was last in) shows its keys 1 to 6. */
function catchBelt(belt, index, cursor) {
  const b = CATCH.belt,
    ramp = pocketRamp('color.pocketPokeBalls'),
    panel = teamPocketPanel(
      b.well,
      b.wells * b.well + (b.wells - 1) * b.wellGap,
      belt.bought ? ramp : TEAM_SLOT_COLOURS.fainted
    ),
    top = (CATCH.window.height - panel.height) / 2,
    ballAt = (b.well - SHOP_BALL_STRIP.size * SHOP_BALL_STRIP.scale) / 2,
    numbered = index === 0 && belt.bought,
    wells = Array.from({ length: b.wells }, (_, slot) => {
      const ball = belt.balls[slot],
        selected = index === 0 && slot === 0,
        cursorHere = cursor && cursor.area === 'slot' && cursor.belt === index && cursor.slot === slot,
        fill = selected ? ramp.dark : AREA_COLOURS.wellEmpty,
        ringColour = selected ? ramp.light : ball ? ramp.base : AREA_COLOURS.outline,
        left = panel.offsetX,
        wellTop = panel.offsetY + slot * (b.well + b.wellGap),
        picture = ball
          ? ballSprite(ball, SHOP_BALL_STRIP.beltFrame, { style: `position:absolute;${place(ballAt, ballAt)}` })
          : '',
        well = `<div class="lib-area-well" style="left:0;top:0;width:${px(b.well)};height:${px(b.well)};
          --well-fill:${fill};--well-ring:${ringColour}">${picture}</div>${
            numbered ? areaText(String(slot + 1), b.keySize, AREA_FONTS.silver, 'right:0;bottom:-2px') : ''
          }`;
      return cursorHere
        ? catchRingAt(left, wellTop, b.well, well)
        : `<div style="${place(left, wellTop)};width:${px(b.well)};height:${px(b.well)}">${well}</div>`;
    }).join(''),
    // the belt's number: Michroma 16 in white with a 1 px ink stroke (main.shop.pokeball's)
    stroke = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]
      .map(([x, y]) => `${px(x)} ${px(y)} 0 ${SHOP_COLOURS.outline}`)
      .join(','),
    numberStyle = `${place(4, 0)};text-shadow:${stroke}`,
    number = shopText(String(index + 1), SHOP.text.beltNumber, SHOP_COLOURS.text, numberStyle);
  return `<div class="lib-area-piece" style="${place(b.firstLeft + index * b.step, top)};width:${px(panel.width)};
    height:${px(panel.height)}">${panel.svg}${wells}${number}</div>`;
}

// ---------- Pokemon owned: panel.clean with the cards' body, 48 px faces ----------
function catchOwned(cursor) {
  const o = CATCH.owned,
    cells = Array.from({ length: CATCH_SAMPLE.owned }, (_, index) => {
      const left = o.inset + (index % o.columns) * (o.face + o.columnGap),
        top = o.inset + Math.floor(index / o.columns) * (o.face + o.rowGap),
        face = portraitFace({
          size: o.face,
          stroke: o.stroke,
          sample: { src: `${PORTRAIT_ART}${CATCH_SAMPLE.dex}/Portrait.png` },
        });
      // the cursor bar sits 2 px off the face itself, not off its cell (Jess 2026-11-20)
      return cursor && cursor.area === 'owned' && cursor.index === index
        ? catchRingAt(left, top, o.face, face)
        : `<div style="${place(left, top)}">${face}</div>`;
    }).join('');
  return cleanBox(o.left, o.top, o.width, o.height, cells, { body: SHOP_CARD_PANEL.body });
}

// ---------- Throw and Let It Go: button.glitch ----------
function catchButtons(cursor) {
  const b = CATCH.button,
    focused = (index) => !!cursor && cursor.area === 'button' && cursor.index === index;
  return ['Throw', 'Let It Go']
    .map((label, index) =>
      shopButton(label, index ? 'Negative' : 'Positive', b.width, {
        focused: focused(index),
        height: b.height,
        style: place(b.left, b.tops[index]),
      })
    )
    .join('');
}

// ---------- the result toast: panel.clean, teal edge (bad news: red), a 2 px ink outline ----------
function catchToast(toast) {
  const c = CATCH.toast,
    edge = toast.bad ? unifiedTone(UNIFIED_RED, 'base') : unifiedTone(UNIFIED_TEAL, 'base');
  return `<div class="lib-clean" style="--clean-body:${greyTone('panel')};--clean-edge:${edge};
    --clean-edge-width:${px(CLEAN_PANEL.edgeWidth)};box-shadow:0 0 0 ${px(c.outline)} ${greyTone('ink')};
    max-width:${px(c.maxWidth)};padding:${c.padding}">
    <div style="position:relative;font-family:${AREA_FONTS.meta},sans-serif;font-size:${px(c.size)};
      line-height:${px(c.lineHeight)};color:${greyTone('white')};text-align:center">${esc(toast.text)}</div></div>`;
}

// ---------- the whole screen ----------
function catchWindowHtml(state) {
  const { stage, window: frame, owned, tipGap } = CATCH,
    width = frame.width + 2 * stage.pad + stage.tipRoom,
    windowBottom = frame.height + 2 * stage.pad,
    height = windowBottom + (state.toast ? stage.toastRoom : 0),
    // over the window's pieces (they sit at z-index 1 inside it)
    layer = (inner) => `<div style="position:absolute;inset:0;z-index:10">${inner}</div>`,
    inner = `${catchMonPanel(state)}
      ${CATCH_SAMPLE.belts.map((belt, index) => catchBelt(belt, index, state.cursor)).join('')}
      ${catchOwned(state.cursor)}
      ${catchButtons(state.cursor)}`,
    // the owned tooltip: right of the window, level with the copy under the cursor (today's rightOf beside the window)
    cursorRow = state.cursor ? Math.floor(state.cursor.index / owned.columns) : 0,
    cellTop = owned.top + owned.inset + cursorRow * (owned.face + owned.rowGap),
    tip = state.tip
      ? `<div style="${place(stage.pad + frame.width + tipGap, stage.pad + cellTop)}">${tooltipHtml(
          TOOLTIP_STATES[0],
          CATCH_SAMPLE.tip
        )}</div>`
      : '',
    // the ask: the screen dimmed under it (ink at 60%), the dialog centred on the window
    ask = state.ask
      ? layer(`<div style="position:absolute;inset:0;background:${rgbaOf(greyTone('ink'), 0.6)}"></div>
          <div style="${place(stage.pad + (frame.width - MODAL.width) / 2, stage.pad + 80)}">
          ${modalHtml(CATCH_ASK)}</div>`)
      : '',
    // the toast: bottom centre of the screen, here centred under the window
    toast = state.toast
      ? layer(`<div style="position:absolute;left:${px(stage.pad)};width:${px(frame.width)};
          top:${px(windowBottom + 12)};
          display:flex;justify-content:center">${catchToast(state.toast)}</div>`)
      : '';
  return `<div class="lib-area" data-state="catch.window:${state.id}" style="width:${px(width)};height:${px(height)};
    background:${AREA_COLOURS.stage}">
    ${cleanBox(stage.pad, stage.pad, frame.width, frame.height, inner)}${tip}${toast}${ask}</div>`;
}
function catchSection() {
  const states = CATCH_STATES.map(
    (state) => `<h4>${esc(state.title)}</h4><div class="lib-area-scroll">${catchWindowHtml(state)}</div>`
  ).join('');
  return `<section class="lib-story" data-draft="catch.window">
    <h3>${nameButton('catch.window')} ${draftTag('composite: the catch screen (a board copy)')}</h3>
    ${states}
    <dl class="lib-facts">
      <dt>Pieces</dt><dd>The window ${nameButton('panel.clean')}. The Pokemon ${nameButton('panel.pixel')} in its types
        (first type left, second right, the middle 25% dithered, as ${nameButton('run.hud.teamSlot')}), its body plain
        grey.raised (Jess 2026-11-20); the flee ring ${nameButton('portrait.round')}\u2019s ring, the first
        type\u2019s dark
        over grey.paper, one step per miss. The belts ${nameButton('main.shop.pokeball')}\u2019s (six 52 px wells, the
        number in Michroma 16; not bought: the fainted grey ramp); the selected ball\u2019s well the pocket\u2019s
        dark with
        its light ring. Pokemon owned ${nameButton('panel.clean')} with the cards\u2019 grey.raised body, 48 px
        ${nameButton('portrait.round')} faces at rest. ${nameButton('cursor.ring')} (round wells and faces), ${nameButton('tooltip')},
        ${nameButton('button.glitch')} (Throw Positive, Let It Go Negative), ${nameButton('modal.dialog')}</dd>
      <dt>Fonts</dt><dd>${nameButton('font.silver')}<span>the name, the ball line and the slot keys at
        ${CATCH.text.size} and ${CATCH.belt.keySize}, the band at ${CATCH.text.bandSize}; today GameFont 27 and
        40</span>${nameButton('font.michroma')}<span>the toast at ${CATCH.toast.size} (the game talking)</span></dd>
      <dt>Places</dt><dd>Today\u2019s order (the Pokemon left, three belts, Pokemon owned and the buttons right), in a
        ${CATCH.window.width} x ${CATCH.window.height} px window (today 980 x 500, the same width): the flee ring ${CATCH.ring.size} px
        (today 192); the Pokemon panel and the belts the same height; the belts 84 px wide
        (main.shop.pokeball\u2019s, the ring sits in their padding) and ${CATCH.belt.step - 84} px apart; Pokemon
        owned ${CATCH.owned.height} px tall (today 280, it scrolls); the buttons ${CATCH.button.height} px tall (the
        menus\u2019) at the bottom right. The owned faces are ${CATCH.owned.columnGap} px apart across and ${CATCH.owned.rowGap} down, so the cursor
        ring clears the next face\u2019s</dd>
      <dt>Changes the game</dt><dd>Let It Go keeps its ask and opens on Keep trying, Let it go red and Keep trying neutral (Jess 2026-11-20:
        letting a rescue go is a loss you cannot earn back); today it opens on its confirm. The result (caught, broke
        free, fled) is a toast, not a line in the Pokemon panel (Jess 2026-11-20); good news teal, bad news red</dd>
      <dt>Not shown</dt><dd>The throw (spin, arc, absorb, wobble, the click), the ring catching up after a miss, the
        portrait fading when it flees</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/catch-draft.js; changing one changes only the board</dd>
    </dl></section>`;
}
const CATCH_TABS = [
  {
    id: 'unified',
    title: 'Approved',
    note:
      'APPROVED (Jess 2026-11-20): decisions 2026-11-20-155-catch-window-look, ' +
      '-catch-result-is-a-toast-and-the-window-is-shorter and -catch-let-it-go-ask-opens-on-keep-trying.',
    draw: catchSection,
  },
];
const catchPage = (tab) => tabbedPage('catch.window', CATCH_TABS, tab);
