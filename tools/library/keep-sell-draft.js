// tools/library/keep-sell-draft.js: main.keepOrSell, the keep-or-sell list (#146, APPROVED 2026-11-26). When a run's kept
// catches do not all fit the Pokebox, the main menu shows one list of every held catch, each marked Keep or Sell, with a
// free places counter (decision 2026-11-26-146-keep-or-sell-open-decisions: the first catches that fit start as Keep;
// Make Room goes into the Team menu to sell box copies and comes back). Built from the board's approved pieces: the
// window panel.clean, each row panel.shopCard, the face portrait.round (a Sell row takes the Team menu's sale rim), the
// mark toggle.power, the buttons button.glitch, the result a toast. A plain script sharing the board's globals; it loads
// after every draft it uses (shop, portraits, cursor, toggle, catch). A board copy: nothing here reads the game.
'use strict';
// ---------- places: px in the window ----------
const KEEP_SELL = {
  stage: { pad: 20, toastRoom: 96 },
  window: { width: 760, height: 560 },
  inset: 24,
  title: { top: 20, size: 20 },
  line: { top: 54, size: 12 },
  counter: { top: 22, size: 14 },
  list: { top: 88, rowHeight: 64, gap: 8 },
  row: { face: 48, stroke: 2, faceLeft: 12, nameLeft: 76, nameSize: 20, starsTop: 38, starSize: 12, priceLeft: 440 },
  toggle: { left: 580, width: 110, labelSize: 14 }, // a fixed column, so the mark never moves as the label changes
  button: { width: 220, height: 54, bottom: 20 },
  sellDim: 0.55, // a Sell row's text, so the Keeps read first
};
const KEEP_SELL_COLOURS = {
  title: unifiedTone(UNIFIED_YELLOW, 'base'), // #fff000, the menus' title yellow (Jess 2026-11-26)
  keepEdge: unifiedTone(UNIFIED_TEAL, 'base'), // a Keep row: panel.shopCard's own teal edge
  sellEdge: CLEAN_PANEL.edge, // a Sell row: grey.slate, the plain clean edge
  saleRim: unifiedTone(UNIFIED_RED, 'dark'), // portrait.round's sale state (the Team menu's sell pick)
  stars: unifiedTone(UNIFIED_YELLOW, 'base'),
  counterFull: unifiedTone(UNIFIED_RED, 'base'), // the counter when every free place has a Keep
};
// board copy of G.Copies SELL_PRICE (js/systems/copies.js): PokeCoins by the species' rarity, 1 to 5 stars
const KEEP_SELL_PRICE = { 1: 15, 2: 30, 3: 60, 4: 120, 5: 300 };
const KEEP_SELL_CATCHES = [
  { dex: 147, name: 'Dratini', nature: 'Adamant', rarity: 4 },
  { dex: 133, name: 'Eevee', nature: 'Timid', rarity: 3 },
  { dex: 58, name: 'Growlithe', nature: 'Jolly', rarity: 3 },
  { dex: 43, name: 'Oddish', nature: 'Modest', rarity: 2 },
  { dex: 16, name: 'Pidgey', nature: 'Hasty', rarity: 1 },
];
const KEEP_SELL_STATES = [
  {
    id: 'opening',
    title: 'Opening: 5 catches, 3 free places; the first three that fit start as Keep, the cursor on the first row',
    free: 3,
    keeps: [true, true, true, false, false],
    cursor: { area: 'row', index: 0 },
  },
  {
    id: 'refused',
    title: 'Keep refused: every free place has a Keep, so Pidgey stays Sell (the counter turns red, a bad-news toast)',
    free: 3,
    keeps: [true, true, true, false, false],
    cursor: { area: 'row', index: 4 },
    toast: { text: 'No free places left. Set one to Sell, or Make Room.', bad: true },
  },
  {
    id: 'madeRoom',
    title:
      'Back from Make Room: two box copies sold in the Team menu, so 5 free places; the Keep marks are as they were',
    free: 5,
    keeps: [true, true, true, false, true],
    cursor: { area: 'row', index: 4 },
    toast: { text: 'You have 5 free places.' },
  },
  {
    id: 'confirm',
    title: 'Confirm: the Keeps are placed, the rest sold; one notice with the totals, then the main menu',
    free: 3,
    keeps: [true, true, true, false, false],
    cursor: { area: 'button', index: 1 },
    toast: { text: 'Dratini, Eevee and Growlithe joined your Pokebox. Oddish and Pidgey were sold for 45 PokeCoins.' },
  },
];

const keepSellStars = (rarity) => '★'.repeat(rarity) + '☆'.repeat(5 - rarity);
const keepCount = (state) => state.keeps.filter(Boolean).length;

/** The mark: toggle.power labelled Keep (on: Keep, off: Sell). */
const keepToggle = (on, style) => `<button type="button" class="lib-toggle${on ? ' on' : ''}" tabindex="-1"
  aria-pressed="${on}" style="${toggleStyle};font-size:${px(KEEP_SELL.toggle.labelSize)};${style}">
  <span class="lib-toggle-mark"><span></span></span><span style="text-align:left">${on ? 'Keep' : 'Sell'}</span>
  </button>`;

/** One held catch: panel.shopCard (teal edge when Keep), the face, the nature and name, the rarity, the price, the mark. */
function keepSellRow(mon, index, state) {
  const l = KEEP_SELL.list,
    r = KEEP_SELL.row,
    keep = state.keeps[index],
    width = KEEP_SELL.window.width - 2 * KEEP_SELL.inset,
    top = l.top + index * (l.rowHeight + l.gap),
    textDim = keep ? '' : `opacity:${KEEP_SELL.sellDim}`,
    faceHtml = portraitFace({
      size: r.face,
      stroke: r.stroke,
      sample: { src: `${PORTRAIT_ART}${mon.dex}/Portrait.png` },
      rim: keep ? undefined : KEEP_SELL_COLOURS.saleRim,
    }),
    faceTop = (l.rowHeight - r.face) / 2,
    inner = `<div style="${place(r.faceLeft, faceTop)}">${faceHtml}</div>
      ${shopText(
        `${mon.nature} ${mon.name}`,
        r.nameSize,
        SHOP_COLOURS.text,
        `${place(r.nameLeft, 10)};${textDim}`,
        AREA_FONTS.silver
      )}
      ${shopText(keepSellStars(mon.rarity), r.starSize, KEEP_SELL_COLOURS.stars, `${place(r.nameLeft, r.starsTop)};${textDim}`)}
      ${shopText(
        `Sells for ${KEEP_SELL_PRICE[mon.rarity]}`,
        SHOP.text.name,
        SHOP_COLOURS.text,
        `${place(r.priceLeft, 0)};height:${px(l.rowHeight)};display:flex;align-items:center;${textDim}`
      )}
      <div style="${place(KEEP_SELL.toggle.left, 0)};width:${px(KEEP_SELL.toggle.width)};height:${px(l.rowHeight)};
        display:flex;align-items:center">${keepToggle(keep, 'position:relative')}</div>`,
    row = cleanBox(0, 0, width, l.rowHeight, inner, {
      body: SHOP_CARD_PANEL.body,
      edge: keep ? KEEP_SELL_COLOURS.keepEdge : KEEP_SELL_COLOURS.sellEdge,
    }),
    hasCursor = state.cursor.area === 'row' && state.cursor.index === index;
  return `<div style="${place(KEEP_SELL.inset, top)};width:${px(width)};height:${px(l.rowHeight)};
    ${hasCursor ? cursorStyle() : ''}">${row}${hasCursor ? staticBar() : ''}</div>`;
}

/** The title, the line under it and the free places counter (red once every free place has a Keep). */
function keepSellHeader(state) {
  const k = KEEP_SELL,
    full = keepCount(state) >= state.free;
  return `${shopText('Your Pokebox is full', k.title.size, KEEP_SELL_COLOURS.title, place(k.inset, k.title.top))}
    ${shopText(
      'Choose who to keep. The rest are sold for PokeCoins.',
      k.line.size,
      SHOP_COLOURS.text,
      place(k.inset, k.line.top)
    )}
    ${shopText(
      `Keep ${keepCount(state)} of ${state.free} free places`,
      k.counter.size,
      full ? KEEP_SELL_COLOURS.counterFull : SHOP_COLOURS.name,
      `position:absolute;right:${px(k.inset)};
      top:${px(k.counter.top)}`
    )}`;
}

/** Make Room (Neutral, into the Team menu) and Confirm (Positive, naming what it does). */
function keepSellButtons(state) {
  const b = KEEP_SELL.button,
    top = KEEP_SELL.window.height - b.bottom - b.height,
    sells = state.keeps.length - keepCount(state),
    focused = (index) => state.cursor.area === 'button' && state.cursor.index === index;
  return [
    shopButton('Make Room', 'Neutral', b.width, {
      focused: focused(0),
      height: b.height,
      style: place(KEEP_SELL.inset, top),
    }),
    shopButton(`Keep ${keepCount(state)}, sell ${sells}`, 'Positive', b.width, {
      focused: focused(1),
      height: b.height,
      style: `position:absolute;right:${px(KEEP_SELL.inset)};top:${px(top)}`,
    }),
  ].join('');
}

function keepSellWindowHtml(state) {
  const { stage, window: frame } = KEEP_SELL,
    windowBottom = frame.height + 2 * stage.pad,
    height = windowBottom + (state.toast ? stage.toastRoom : 0),
    inner = `${keepSellHeader(state)}
      ${KEEP_SELL_CATCHES.map((mon, index) => keepSellRow(mon, index, state)).join('')}
      ${keepSellButtons(state)}`,
    toast = state.toast
      ? `<div style="position:absolute;z-index:10;left:${px(stage.pad)};width:${px(frame.width)};
          top:${px(windowBottom + 12)};display:flex;justify-content:center">${catchToast(state.toast)}</div>`
      : '';
  return `<div class="lib-area" data-state="main.keepOrSell:${state.id}" style="width:${px(frame.width + 2 * stage.pad)};
    height:${px(height)};background:${AREA_COLOURS.stage}">
    ${cleanBox(stage.pad, stage.pad, frame.width, frame.height, inner)}${toast}</div>`;
}

function keepSellSection() {
  const states = KEEP_SELL_STATES.map(
    (state) => `<h4>${esc(state.title)}</h4><div class="lib-area-scroll">${keepSellWindowHtml(state)}</div>`
  ).join('');
  return `<section class="lib-story" data-draft="main.keepOrSell">
    <h3>${nameButton('main.keepOrSell')} ${draftTag('composite: the keep-or-sell list (#146)')}</h3>
    ${states}
    <dl class="lib-facts">
      <dt>Pieces</dt><dd>The window ${nameButton('panel.clean')}; each catch a ${nameButton('panel.shopCard')} row
        (teal edge when Keep, the plain slate edge when Sell); a 48 px ${nameButton('portrait.round')} face (a Sell row
        takes the sale rim, red.dark, as the Team menu's sell pick); the mark ${nameButton('toggle.power')} labelled Keep
        or Sell; ${nameButton('cursor.bar')}; ${nameButton('button.glitch')} (Make Room Neutral, Confirm Positive); the
        result a toast (good news teal, bad news red)</dd>
      <dt>Fonts</dt><dd>${nameButton('font.silver')}<span>the nature and name at ${KEEP_SELL.row.nameSize} (the
        Pokemon tier)</span>${nameButton('font.michroma')}<span>the title, the counter, the price and the toast (the
        game talking)</span></dd>
      <dt>Stars</dt><dd>The species' rarity (what sets the sell price), not the copy's own stars: a held catch has no
        copy yet, so its stars roll only when it is placed</dd>
      <dt>Rules shown</dt><dd>The first catches that fit start as Keep. Keep is refused once the Keeps fill the free
        places. Make Room opens the Team menu (its Sell Pokemon mode) and returns here with the counter updated and
        the marks kept. Confirm places every Keep and sells the rest; closing the game with the list open sells every
        unplaced catch</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/keep-sell-draft.js; changing one changes only the board</dd>
    </dl></section>`;
}
const KEEP_SELL_TABS = [
  {
    id: 'approved',
    title: 'Approved',
    note:
      'APPROVED (Jess 2026-11-26, with the title yellow, the price white in its own column and the toggles in one ' +
      'column): decision 2026-11-26-146-keep-or-sell-open-decisions.',
    draw: keepSellSection,
  },
];
const keepSellPage = (tab) => tabbedPage('main.keepOrSell', KEEP_SELL_TABS, tab);
