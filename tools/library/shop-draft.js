// tools/library/shop-draft.js: the Main Menu Shop's four tabs as composites in the Unified pieces (Jess 2026-11-20):
// main.shop.pokeball, main.shop.character, main.shop.items and main.shop.tms. The window, the rail and every place are
// today's (css/bw-shop.css; js/ui/gacha-ui.js, shop-balls.js, shop-tms.js, menu-window-kit.js); the rail keeps today's
// icons and their alignment (Jess 2026-11-20). Only the pieces change: panel.clean for the window and the panels; panel.shopCard
// for every card; panel.pixel in a pocket ramp for the belts and the pockets; button.glitch for every button; square.clean or
// a well for every slot; field.text,
// field.dropdown and scroll.bar (inputs-draft.js); toggle.power; portrait.round; cursor.bar; the tooltip. Pictures are
// placeholders. A plain script sharing the board's globals; it loads after every draft it uses. A board copy: nothing
// here reads the game.
// main.shop.pokeball and main.shop.character are APPROVED (decisions 2026-11-20-155-main-shop-pokeball-look and
// 2026-11-20-155-main-shop-character-look). main.shop.items and main.shop.tms are NOT APPROVED
// (Jess 2026-11-20): rough first passes kept only as starting points, redone one tab at a time; nothing in them is a ruling.
'use strict';
// ---------- places: today's numbers ----------
const SHOP = {
  window: { width: 1145, height: 670 }, // bw-shop.css .shop-window
  stagePad: 24, // the board's margin round the window
  rail: { firstTop: 70, step: 130, cell: 96, iconScale: 3 }, // gacha-ui.js RAIL, the icons drawn 3x
  pane: { left: 110, top: 30, width: 1005, height: 616 }, // the panes, down to Exit's bottom (.shop-pane-fixed)
  buttonHeight: 54, // today's rounded button at 3 px per art pixel
  barWidth: 6, // button.glitch's bar, outside its body on the right
  exit: { width: 156 }, // at the pane's bottom right
  inventory: { width: 192, gap: 16 }, // left of Exit, Team Items only
  cursorRoom: 6,
  card: {
    width: 186,
    height: 350,
    gap: 12,
    textInset: 10,
    iconSize: 64,
    iconTop: 12,
    dividerTop: 88,
    nameTop: 100,
    descTop: 130,
    buttonWidth: 174,
    buttonHeight: 54, // today's button
    buttonBottom: 10,
    dimmed: 0.45,
  },
  grid: { columns: 3, width: 600, listWidth: 584, listTop: 56 }, // the card grids (SALE, GRID)
  owned: { left: 624, width: 377, height: 530, inset: 14, searchWidth: 345, listTop: 70, columns: 4, square: 60, gap: 30 },
  pocket: {
    left: 40,
    top: 20,
    gap: 36,
    width: 260, // 130 art px
    height: 392, // 196 art px: panel.pixel takes even art sizes (today 390)
    square: 56,
    squareGap: 28,
    gridTop: 30,
    dividerTop: 196,
    textInset: 18,
    nameTop: 212,
    lineTop: 244,
    buyWidth: 228,
    buyBottom: 18,
  },
  // a belt (Jess 2026-11-20): panel.pixel in color.pocketPokeBalls (the berry pocket's panel, hud-team-slot-draft.js
  // teamPocketPanel) holding six wells in a column, as the berry pocket and the move slots hold theirs. The well is
  // 52 px so a ball at 2x (22 px of art in its 32 px frame, 44 px) fills most of its 48 px inside the 2 px ring.
  belt: { well: 52, wellGap: 8, gap: 20, rightPad: 12, count: 3, wells: 6 },
  sell: { width: 204, gap: 8 }, // above Exit, right-aligned with it; 204 so Sell Pokeball fits (Jess 2026-11-20)
  beltBuy: { width: 186, gap: 12 }, // left of Exit
  tms: {
    bar: { searchWidth: 250, typeLeft: 262, typeWidth: 170, toggleLeft: 446, labelSize: 12 },
    panel: { left: 624, width: 377, height: 530, inset: 14 },
    chosen: { top: 44, size: 88, nameTop: 12 },
    team: { left: 144, top: 44, size: 52, gap: 10, columns: 3 },
    dividerTop: 166,
    finder: { top: 180, searchWidth: 200, filterLeft: 226, filterWidth: 137 },
    box: { top: 232, columns: 4, cell: 76, gap: 10, faceInset: 4 },
  },
  fonts: { meta: "'HudModule'", pokemon: "'Silver 10px'" },
  text: { name: 14, line: 12, lineHeight: 16, pocketName: 16, beltNumber: 16, pokemonName: 20 },
};
// the Pokeballs tab's card (Jess 2026-11-20): shorter, its button sized to the card (button.glitch's look at any size)
SHOP.ballCard = { ...SHOP.card, height: 224, nameTop: 98, descTop: 122, buttonWidth: 140, buttonHeight: 36, buttonFont: 14 };
SHOP.exit.left = SHOP.pane.width - SHOP.exit.width;
SHOP.buttonTop = SHOP.pane.height - SHOP.buttonHeight;
const SHOP_COLOURS = {
  stage: CLEAN_STAGE,
  body: CLEAN_PANEL.body,
  edge: CLEAN_PANEL.edge,
  divider: CLEAN_PANEL.edge, // grey.slate (today #495151 at 2 px)
  name: unifiedTone(UNIFIED_TEAL, 'base'), // the secondary text (today #8cfff7)
  text: greyTone('white'),
  dimLabel: greyTone('mid'), // the toggle's label (today white at 60%)
  ownedEdge: unifiedTone(UNIFIED_TEAL, 'base'), // square.clean filled
  outline: greyTone('ink'), // the belt number's 1 px stroke
};
const SHOP_TABS = [
  { key: 'balls', page: 'main.shop.pokeball', name: 'Pokeballs', icon: 'pokeball' },
  { key: 'upgrades', page: 'main.shop.character', name: 'Character Upgrades', icon: 'character-upgrade' },
  { key: 'items', page: 'main.shop.items', name: 'Team Items', icon: 'team-item' },
  { key: 'tms', page: 'main.shop.tms', name: 'TMs', icon: 'tm-purchase' },
];
// a Bag pocket's ramp from the canon swatches (color.pocketBerries and the rest), lower-case hex by part
const pocketRamp = (label) => {
  const swatch = POCKET_SWATCHES.find((entry) => entry.label === label);
  return Object.fromEntries(swatch.colours.map(([part, , hex]) => [part, hex.toLowerCase()]));
};
// placeholder pictures: Leftovers for every item, the type glyph for a TM
const SHOP_ITEM_SPRITE = { sprite: `${ROOT}assets/items/pokesprite-inventory.png`, at: '-1530px -136px' };
// the balls are today's art (js/data/ball-sprites.js, drawn by hud-kit-items.js BallSprite): one strip of 17 frames of
// 32 px per ball; a card shows frame 9 flipped, a belt frame 0, both at 2x (shop-balls.js CARD_BALL and SLOT)
const SHOP_BALL_STRIP = { size: 32, frames: 17, scale: 2, cardFrame: 9, beltFrame: 0 };
// each frame's centring shift in art px, so the ball's filled pixels (not its 32 px frame) sit in the middle: the
// frame's centre minus the centre of its opaque box, measured from assets/icons/pokeball/balls/ (Jess 2026-11-20).
// Rounded to whole art px; Net is 23 px tall, so it sits half an art px low. A board copy: the game measures its own
// at #126. { ball: { frame: [x, y] } }
const SHOP_BALL_CENTRE = {
  poke: { 0: [0, -1], 9: [0, -3] },
  great: { 0: [-1, -1], 9: [-1, -3] },
  ultra: { 0: [0, -1], 9: [0, -3] },
  master: { 0: [-1, -1], 9: [-1, -3] },
  safari: { 0: [-1, -1], 9: [-1, -3] },
  net: { 0: [-1, 0], 9: [-1, -2] },
};

// ---------- small pieces ----------
const px = (value) => value + 'px';
const place = (left, top) => `position:absolute;left:${px(left)};top:${px(top)}`;
const shopText = (text, size, colour, style = '', font = SHOP.fonts.meta) =>
  `<div class="lib-shop-text" style="font-family:${font},sans-serif;font-size:${px(size)};
    line-height:${px(size === SHOP.text.line ? SHOP.text.lineHeight : size + 4)};color:${colour};${style}">${esc(text)}</div>`;
/** A button.glitch at a box width (its 6 px bar included): intent Neutral, Positive or Negative. height and fontSize
 *  size it (today's 54 px and button.glitch's own 18 px by default). */
function shopButton(label, intent, width, { focused, refused, disabled, style = '', height = SHOP.buttonHeight, fontSize } = {}) {
  const font = fontSize ? `font-size:${px(fontSize)};` : '',
    // the state classes button.glitch reads: refused shakes on a press, disabled drops the focus and press layers
    states = (focused ? ' focused' : '') + (refused ? ' refused' : '') + (disabled ? ' disabled' : '');
  return `<button type="button" class="lib-glitch-button lib-shop-button${states}" tabindex="-1"
    data-label="${esc(label)}" style="${glitchColours(intentOf(intent), !!refused, !!disabled)};
    width:${px(width - SHOP.barWidth)};height:${px(height)};${font}${style}">${esc(label)}</button>`;
}
/** A ball from its strip at a frame, 2x, shifted so its filled pixels are centred in the frame; flipped mirrors it
 *  (the card's), and its shift with it. */
function ballSprite(ball, frame, { flipped = false, style = '' } = {}) {
  const { size, frames, scale } = SHOP_BALL_STRIP,
    drawn = size * scale,
    [shiftX, shiftY] = (SHOP_BALL_CENTRE[ball] || {})[frame] || [0, 0],
    transform = `translate(${px((flipped ? -shiftX : shiftX) * scale)}, ${px(shiftY * scale)})${flipped ? ' scaleX(-1)' : ''}`;
  return `<div class="lib-shop-ball" style="width:${px(drawn)};height:${px(drawn)};
    background-image:url('${ROOT}assets/icons/pokeball/balls/${ball}.png');background-size:${px(drawn * frames)} ${px(drawn)};
    background-position:${px(-frame * drawn)} 0;transform:${transform};${style}"></div>`;
}
/** panel.clean at a place and size; edge defaults to grey.slate. */
const cleanBox = (left, top, width, height, inner, { edge = SHOP_COLOURS.edge, className = '', style = '' } = {}) =>
  `<div class="lib-clean lib-shop-box ${className}" style="--clean-body:${SHOP_COLOURS.body};--clean-edge:${edge};
    --clean-edge-width:${px(CLEAN_PANEL.edgeWidth)};${place(left, top)};width:${px(width)};height:${px(height)};${style}">
    ${inner}</div>`;
/** square.clean at any size: filled takes an edge colour; locked is the empty look at 30%. */
const shopSquare = (size, { edge, locked, icon = '' } = {}) =>
  `<div class="lib-clean lib-shop-square" style="--clean-body:${SHOP_COLOURS.body};--clean-edge:${edge || SHOP_COLOURS.edge};
    --clean-edge-width:${px(CLEAN_PANEL.edgeWidth)};width:${px(size)};height:${px(size)};
    opacity:${locked ? CLEAN_SQUARE.lockedOpacity : 1}">${icon}</div>`;
const itemIcon = (scale = 1) =>
  `<div class="lib-shop-item-icon" style="background-image:url('${SHOP_ITEM_SPRITE.sprite}');
    background-position:${SHOP_ITEM_SPRITE.at};transform:scale(${scale})"></div>`;
const divider = (left, right, top, extra = '') =>
  `<div class="lib-shop-divider" style="left:${px(left)};right:${px(right)};top:${px(top)};height:${px(CLEAN_PANEL.edgeWidth)};
    background:${SHOP_COLOURS.divider};${extra}"></div>`;
/** A scroll box: what it holds, clipped, and scroll.bar beside it (in the room past its right edge). */
const scrollArea = (left, top, width, height, inner, { fraction = 0.5, at = 0 } = {}) =>
  `<div class="lib-shop-scroll" style="${place(left, top)};width:${px(width)};height:${px(height)}">${inner}</div>
  ${scrollBar({ height, fraction, at, style: place(left + width + 4, top) })}`;
/** The cursor bar beside a piece (menus blink), at a place. */
const withCursor = (left, top, inner) =>
  `<div class="lib-cursor-host" style="${place(left, top)};${cursorStyle()}">${inner}${staticBar(false)}</div>`;

// ---------- card.vertical on panel.shopCard (clean-draft.js: panel.clean with a grey.raised body) ----------
/** A card: the picture, a divider, the name, the description, its button. look: lit, dimmed, or dimmedButButton.
 *  card is its sizes (SHOP.card, or the Pokeballs tab's SHOP.ballCard). */
function shopCard({ picture, name, description, button, look = 'lit', card = SHOP.card }) {
  const c = card,
    buttonTop = c.height - c.buttonBottom - c.buttonHeight,
    whole = look === 'dimmed' ? `opacity:${c.dimmed}` : '',
    part = look === 'dimmedButButton' ? `opacity:${c.dimmed}` : '';
  return `<div class="lib-clean lib-shop-card" style="--clean-body:${SHOP_CARD_PANEL.body};
      --clean-edge:${SHOP_CARD_PANEL.edge};--clean-edge-width:${px(SHOP_CARD_PANEL.edgeWidth)};width:${px(c.width)};height:${px(c.height)};${whole}">
    <div class="lib-shop-picture" style="${place((c.width - c.iconSize) / 2, c.iconTop)};width:${px(c.iconSize)};
      height:${px(c.iconSize)};${part}">${picture}</div>
    ${divider(c.textInset, c.textInset, c.dividerTop, part)}
    ${shopText(name, SHOP.text.name, SHOP_COLOURS.name, `${place(c.textInset, c.nameTop)};right:${px(c.textInset)};${part}`)}
    ${shopText(description, SHOP.text.line, SHOP_COLOURS.text, `${place(c.textInset, c.descTop)};right:${px(c.textInset)};${part}`)}
    <div style="${place((c.width - c.buttonWidth) / 2, buttonTop)}">${button}</div></div>`;
}
/** A grid of cards in a scroll box, at the pane's place; no scroll bar when every card fits. */
function cardGrid(cards, left, top, height, card = SHOP.card) {
  const { columns, listWidth } = SHOP.grid,
    rows = Math.ceil(cards.length / columns),
    contentHeight = rows * (card.height + card.gap) - card.gap;
  const grid = `<div class="lib-shop-grid" style="grid-template-columns:repeat(${columns}, ${px(card.width)});
    gap:${px(card.gap)}">${cards.join('')}</div>`;
  if (contentHeight <= height)
    return `<div class="lib-shop-scroll" style="${place(left, top)};width:${px(listWidth)};height:${px(height)}">${grid}</div>`;
  return scrollArea(left, top, listWidth, height, grid, { fraction: height / contentHeight, at: 0 });
}

// ---------- the window: panel.clean, the rail (today's icons and places), the pane, Exit ----------
function shopWindow(tabKey, paneHtml) {
  const { window: frame, rail, pane, stagePad } = SHOP;
  const tabs = SHOP_TABS.map((entry, index) => {
    const selected = entry.key === tabKey;
    // 1 px in (the edge's width): the icon touches the window's edge instead of covering it (Jess 2026-11-20)
    return `<div class="lib-shop-tab" style="${place(CLEAN_PANEL.edgeWidth, rail.firstTop + index * rail.step)};width:${px(rail.cell)};
      height:${px(rail.cell)}"><img src="${ROOT}assets/ui/shop_icons/${entry.icon}${selected ? '-selected' : ''}.png"
      alt="${esc(entry.name)}" style="transform:scale(${rail.iconScale})" /></div>`;
  }).join('');
  return `<div class="lib-shop-stage" data-state="${tabKey}" style="background:${SHOP_COLOURS.stage};padding:${px(stagePad)};
      width:${px(frame.width)};height:${px(frame.height)}">
    <div class="lib-clean lib-shop-window" style="--clean-body:${SHOP_COLOURS.body};--clean-edge:${SHOP_COLOURS.edge};
      --clean-edge-width:${px(CLEAN_PANEL.edgeWidth)};width:${px(frame.width)};height:${px(frame.height)}">
      ${tabs}
      <div class="lib-shop-pane" style="${place(pane.left, pane.top)};width:${px(pane.width)};height:${px(pane.height)}">
        ${paneHtml}
        ${shopButton('Exit', 'Neutral', SHOP.exit.width, { style: place(SHOP.exit.left, SHOP.buttonTop) })}
      </div></div></div>`;
}

// ---------- main.shop.pokeball ----------
const SHOP_BALLS = [
  { id: 'poke', name: 'Poke Ball', desc: 'The standard ball for catching rescued Pokemon.', label: 'Buy 50', look: 'lit', focused: true },
  { id: 'great', name: 'Great Ball', desc: 'Catches 1.5x as well as a Poke Ball.', label: 'Unlock 5k', look: 'dimmedButButton' },
  { id: 'ultra', name: 'Ultra Ball', desc: 'Catches 2x as well as a Poke Ball.', label: 'Unlock 15k', look: 'dimmedButButton', refused: true },
  { id: 'master', name: 'Master Ball', desc: 'Catches any Pokemon without fail.', label: 'Unlock', look: 'dimmedButButton', refused: true },
  { id: 'safari', name: 'Safari Ball', desc: 'Coming soon.', label: 'Unlock', look: 'dimmedButButton', refused: true },
  { id: 'net', name: 'Net Ball', desc: 'Coming soon.', label: 'Unlock', look: 'dimmedButButton', refused: true },
];
// belt 1 holds four balls, belt 2 is bought and empty, belt 3 is not bought yet
const SHOP_BELTS = [
  { bought: true, balls: ['poke', 'poke', 'great', 'poke'] },
  { bought: true, balls: [] },
  { bought: false, balls: [] },
];
/** A belt: panel.pixel in the Poke Balls pocket ramp (not bought: the fainted grey ramp, today's FAINTED_RIM) holding a
 *  column of wells. A well is the berry pocket's: grey.panel inside, an ink ring when empty, the pocket's base when it
 *  holds a ball. */
function shopBelt(belt, index) {
  const size = SHOP.belt,
    ramp = pocketRamp('color.pocketPokeBalls'),
    rim = belt.bought ? ramp : TEAM_SLOT_COLOURS.fainted,
    panel = teamPocketPanel(size.well, size.wells * size.well + (size.wells - 1) * size.wellGap, rim),
    left = SHOP.pane.width - size.rightPad - (size.count - index) * panel.width - (size.count - 1 - index) * size.gap,
    ballAt = (size.well - SHOP_BALL_STRIP.size * SHOP_BALL_STRIP.scale) / 2, // the frame centred; ballSprite centres the art
    wells = Array.from({ length: size.wells }, (_, slot) => {
      const ball = belt.balls[slot];
      return `<div class="lib-area-well" style="left:${px(panel.offsetX)};
        top:${px(panel.offsetY + slot * (size.well + size.wellGap))};width:${px(size.well)};height:${px(size.well)};
        --well-fill:${AREA_COLOURS.wellEmpty};--well-ring:${ball ? ramp.base : AREA_COLOURS.outline}">${
          ball ? ballSprite(ball, SHOP_BALL_STRIP.beltFrame, { style: `position:absolute;${place(ballAt, ballAt)}` }) : ''
        }</div>`;
    }).join(''),
    // the number: Michroma 16 in white with a 1 px ink stroke, eight hard shadows as the HUD's text (Jess 2026-11-20)
    stroke = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]
      .map(([x, y]) => `${px(x)} ${px(y)} 0 ${SHOP_COLOURS.outline}`)
      .join(','),
    number = shopText(String(index + 1), SHOP.text.beltNumber, SHOP_COLOURS.text, `${place(4, 0)};text-shadow:${stroke}`);
  return `<div class="lib-area-piece" style="${place(left, SHOP.cursorRoom)};width:${px(panel.width)};
    height:${px(panel.height)}">${panel.svg}${wells}${number}</div>`;
}
function ballsPane() {
  const card = SHOP.ballCard,
    cards = SHOP_BALLS.map((ball) =>
      shopCard({
        picture: ballSprite(ball.id, SHOP_BALL_STRIP.cardFrame, { flipped: true }),
        name: ball.name,
        description: ball.desc,
        look: ball.look,
        card,
        button: shopButton(ball.label, 'Positive', card.buttonWidth, {
          focused: ball.focused,
          refused: ball.refused,
          height: card.buttonHeight,
          fontSize: card.buttonFont,
        }),
      })
    ),
    room = SHOP.cursorRoom,
    sellLeft = SHOP.pane.width - SHOP.sell.width,
    sellTop = SHOP.buttonTop - SHOP.sell.gap - SHOP.buttonHeight,
    beltBuyLeft = SHOP.exit.left - SHOP.beltBuy.gap - SHOP.beltBuy.width;
  return `${cardGrid(cards, room, room, SHOP.pane.height - room, card)}
    ${SHOP_BELTS.map(shopBelt).join('')}
    ${shopButton('Sell Pokeball', 'Negative', SHOP.sell.width, { style: place(sellLeft, sellTop) })}
    ${shopButton('Belt 3 15k', 'Positive', SHOP.beltBuy.width, { style: place(beltBuyLeft, SHOP.buttonTop) })}`;
}

// ---------- main.shop.character ----------
const SHOP_POCKETS = [
  { name: 'Berry Pocket', line: 'Hold one more berry in your run.', swatch: 'color.pocketBerries', owned: 2, max: 4, label: 'Buy 25k', focused: true },
  { name: 'Team Items Pocket', line: 'Bring one more team item into a run.', swatch: 'color.pocketItems', owned: 4, max: 4, label: 'Full', disabled: true },
];
function shopPocket(pocket, index) {
  const p = SHOP.pocket,
    grid = 2 * p.square + p.squareGap,
    squares = Array.from({ length: pocket.max }, (_, slot) =>
      `<div style="${place((slot % 2) * (p.square + p.squareGap), Math.floor(slot / 2) * (p.square + p.squareGap))}">${shopSquare(
        p.square,
        { locked: slot >= pocket.owned }
      )}</div>`
    ).join('');
  const inner = `<div style="${place((p.width - grid) / 2, p.gridTop)};width:${px(grid)};height:${px(grid)}">${squares}</div>
    ${divider(p.textInset, p.textInset, p.dividerTop)}
    ${shopText(pocket.name, SHOP.text.pocketName, SHOP_COLOURS.name, place(p.textInset, p.nameTop))}
    ${shopText(pocket.line, SHOP.text.line, SHOP_COLOURS.text, `${place(p.textInset, p.lineTop)};right:${px(p.textInset)}`)}
    ${shopButton(pocket.label, 'Positive', p.buyWidth, {
      focused: pocket.focused,
      disabled: pocket.disabled,
      style: place((p.width - p.buyWidth) / 2, p.height - p.buyBottom - SHOP.buttonHeight),
    })}`;
  // panel.pixel in the pocket's own ramp (Jess 2026-11-20), the berry pocket's and the belts' panel at the pocket's size;
  // its body plain grey.raised, the Shop cards' body (panel.shopCard), no grid (Jess 2026-11-20: the grid on a panel
  // this big is not pleasant)
  const artPixel = TEAM_SLOT.box.artPixel,
    frame = teamBoxSvg(pocketRamp(pocket.swatch), p.width / artPixel, p.height / artPixel, undefined, SHOP_CARD_PANEL.body);
  return `<div class="lib-area-piece lib-shop-pocket" style="${place(p.left + index * (p.width + p.gap), p.top)};
    width:${px(p.width)};height:${px(p.height)}">${frame}${inner}</div>`;
}
const upgradesPane = () => SHOP_POCKETS.map(shopPocket).join('');

// ---------- main.shop.items ----------
const SHOP_TEAM_ITEMS = [
  { name: 'Amulet Coin', desc: '+50% PokéCoins at the end of the run.', label: 'Buy 100k' },
  { name: 'Lucky Egg', desc: '+30% experience.', label: 'Buy 100k', refused: true },
  { name: 'Sharp Scissors', desc: 'The lower your team HP, the faster you move (up to 2x). Needs a team of 3+.', label: 'Buy 100k' },
  { name: 'Brass Knuckles', desc: 'The lower your team HP, the more damage you deal (up to 2x). Needs a team of 3+.', label: 'Buy 100k' },
  { name: 'Snowball Badge', desc: 'Every kill feeds the Snowball: +damage for the total HP of everything you have slain.', label: 'Buy 100k' },
  { name: 'Re-Do', desc: 'When your last Pokemon faints, revive your whole team to full HP. Once per run.', label: 'Buy 100k' },
];
const SHOP_OWNED = 7; // owned team items shown; dimmed empty squares fill the visible rows
function ownedPanel() {
  const o = SHOP.owned,
    rows = 5,
    cells = Array.from({ length: o.columns * rows }, (_, index) => {
      const left = o.inset + (index % o.columns) * (o.square + o.gap),
        top = o.listTop + Math.floor(index / o.columns) * (o.square + o.gap),
        filled = index < SHOP_OWNED,
        square = shopSquare(o.square, { edge: filled ? SHOP_COLOURS.ownedEdge : undefined, locked: !filled, icon: filled ? itemIcon() : '' });
      return index === 0 ? withCursor(left, top, square) : `<div style="${place(left, top)}">${square}</div>`;
    }).join(''),
    listHeight = o.height - o.listTop - o.inset;
  const inner = `${fieldText({ width: o.searchWidth, placeholder: 'Search owned', style: place(o.inset, o.inset) })}
    ${cells}
    ${scrollBar({ height: listHeight, fraction: 0.8, style: place(o.width - o.inset - INPUT.scroll.thumb + 6, o.listTop) })}`;
  return cleanBox(o.left, 0, o.width, o.height, inner);
}
function itemsPane() {
  const room = SHOP.cursorRoom,
    o = SHOP.owned,
    cards = SHOP_TEAM_ITEMS.map((item) =>
      shopCard({
        picture: `<div style="${place(0, 0)}">${itemIcon(2)}</div>`, // the 32 px icon at 2x fills the 64 px box
        name: item.name,
        description: item.desc,
        button: shopButton(item.label, 'Positive', SHOP.card.buttonWidth, { refused: item.refused }),
      })
    ),
    // the owned square under the cursor shows its tooltip below it, after the Tooltip Delay
    tip = `<div class="lib-shop-tip" style="${place(o.left + o.inset, o.listTop + o.square + 8)}">${tooltipHtml(TOOLTIP_STATES[0], {
      name: 'Leftovers',
      text: 'Recover 1.5% of your max HP per second.',
    })}</div>`;
  return `${fieldText({ width: SHOP.grid.listWidth, placeholder: 'Search team items', style: place(room, room) })}
    ${cardGrid(cards, room, room + SHOP.grid.listTop, SHOP.pane.height - room - SHOP.grid.listTop)}
    ${ownedPanel()}
    ${shopButton('Inventory', 'Neutral', SHOP.inventory.width, {
      style: place(SHOP.exit.left - SHOP.inventory.gap - SHOP.inventory.width, SHOP.buttonTop),
    })}
    ${tip}`;
}

// ---------- main.shop.tms ----------
const SHOP_TMS = [
  { name: 'Thunderbolt', type: 'electric', label: 'Buy 3k' },
  { name: 'Flamethrower', type: 'fire', label: 'Learned', disabled: true },
  { name: 'Surf', type: 'water', label: 'Known', disabled: true },
  { name: 'Ice Beam', type: 'ice', label: 'Buy 12k', refused: true },
  { name: 'Earthquake', type: 'ground', label: 'Buy 9k' },
  { name: 'Psychic', type: 'psychic', label: 'Buy 9k' },
];
const SHOP_TEAM_DEX = [25, 4, 7, 1, 94, 130];
const SHOP_BOX_DEX = [133, 143, 147, 149, 150, 152, 155, 158, 172, 175, 196, 197];
const face = (dex, size, state = {}) =>
  portraitFace({ size, stroke: 2, sample: { src: `${PORTRAIT_ART}${dex}/Portrait.png` }, ...state });
function tmsPanel() {
  const t = SHOP.tms,
    p = t.panel,
    team = SHOP_TEAM_DEX.map((dex, index) =>
      `<div style="${place(t.team.left + (index % t.team.columns) * (t.team.size + t.team.gap),
        t.team.top + Math.floor(index / t.team.columns) * (t.team.size + t.team.gap))}">${face(dex, t.team.size, {
        selected: index === 0,
      })}</div>`
    ).join(''),
    boxRows = 3,
    cells = SHOP_BOX_DEX.map((dex, index) => {
      const left = p.inset + (index % t.box.columns) * (t.box.cell + t.box.gap),
        top = t.box.top + Math.floor(index / t.box.columns) * (t.box.cell + t.box.gap),
        cell = `<div style="width:${px(t.box.cell)};height:${px(t.box.cell)};position:relative">
          <div style="${place(t.box.faceInset, t.box.faceInset)}">${face(dex, t.box.cell - 2 * t.box.faceInset)}</div></div>`;
      return index === 5 ? withCursor(left, top, cell) : `<div style="${place(left, top)}">${cell}</div>`;
    }).join(''),
    boxHeight = p.height - t.box.top - p.inset,
    chosenLeft = p.inset + (t.team.left - p.inset - t.chosen.size) / 2;
  const inner = `${shopText('Pikachu', SHOP.text.pokemonName, SHOP_COLOURS.text, place(p.inset, t.chosen.nameTop), SHOP.fonts.pokemon)}
    <div style="${place(chosenLeft, t.chosen.top)}">${face(25, t.chosen.size, { selected: true })}</div>
    ${team}
    ${divider(p.inset, p.inset, t.dividerTop)}
    ${fieldText({ width: t.finder.searchWidth, placeholder: 'Search', style: place(p.inset, t.finder.top) })}
    ${dropdownBox({ width: t.finder.filterWidth, label: 'Filter', style: place(t.finder.filterLeft, t.finder.top) })}
    <div class="lib-shop-scroll" style="${place(0, t.box.top)};width:${px(p.width)};height:${px(boxHeight)}">
      <div style="position:relative;top:${px(-t.box.top)}">${cells}</div></div>
    ${scrollBar({ height: boxHeight, fraction: boxHeight / (boxRows * (t.box.cell + t.box.gap) + 200), style: place(p.width - p.inset + 2, t.box.top) })}`;
  return cleanBox(p.left, 0, p.width, p.height, inner);
}
function tmsPane() {
  const t = SHOP.tms,
    room = SHOP.cursorRoom,
    cards = SHOP_TMS.map((tm) =>
      shopCard({
        picture: `<img class="lib-shop-glyph" src="${typeGlyph(tm.type)}" alt="" />`,
        name: tm.name,
        description: 'Placeholder: the move’s one line (G.MoveInfo.desc).',
        button: shopButton(tm.label, 'Positive', SHOP.card.buttonWidth, { refused: tm.refused, disabled: tm.disabled }),
      })
    ),
    toggleTop = room + (INPUT.height - 22) / 2;
  return `${fieldText({ width: t.bar.searchWidth, placeholder: 'Search TMs', style: place(room, room) })}
    ${dropdownBox({ width: t.bar.typeWidth, label: 'Type', style: place(t.bar.typeLeft, room) })}
    <button type="button" class="lib-toggle on lib-shop-toggle" tabindex="-1" aria-pressed="true"
      style="${toggleStyle};${place(t.bar.toggleLeft + 5, toggleTop)};font-size:${px(t.bar.labelSize)};letter-spacing:1px">
      <span class="lib-toggle-mark"><span></span></span>Able to Learn</button>
    ${cardGrid(cards, room, room + SHOP.grid.listTop, SHOP.pane.height - room - SHOP.grid.listTop)}
    ${tmsPanel()}`;
}

// ---------- the pages ----------
const SHOP_FIT = `<dt>Fit (measured, Michroma)</dt><dd>Every button label fits its box (button.glitch\u2019s 18 px with 3 px
    letter spacing, the bar inside the box). <b>Sell Pokeball</b> (183 px of text) overflowed today\u2019s 186 px, so Sell
    is ${SHOP.sell.width} px (Jess 2026-11-20). The longest card line is 5 lines of 12 px text, every item name one line
    at 14 px, both pocket lines 2 lines</dd>`;
const SHOP_COMMON_FACTS = `
  <dt>Window</dt><dd>${nameButton('panel.clean')}<span>${SHOP.window.width} x ${SHOP.window.height} px (today panel.flat),
    grey.slate edge</span></dd>
  <dt>Rail</dt><dd>Today’s icons (assets/ui/shop_icons/, the chosen tab’s -selected art) and places: 1 px in, touching
    the window’s left edge instead of covering it, ${SHOP.rail.cell} px cells from ${SHOP.rail.firstTop} px down, ${SHOP.rail.step} px apart, drawn
    ${SHOP.rail.iconScale}x (Jess 2026-11-20: unchanged but for the 1 px)</dd>
  <dt>Buttons</dt><dd>${nameButton('button.glitch')}<span>its look at any size: today’s ${SHOP.buttonHeight} px boxes outside the cards; a card’s button
    sized to its card (Pokeballs: ${SHOP.ballCard.buttonWidth} x ${SHOP.ballCard.buttonHeight} px, label
    ${SHOP.ballCard.buttonFont} px). Buy and Unlock
    Positive, Sell Negative, Exit and Inventory Neutral; a Buy you cannot afford is refused, Full, Learned and Known
    disabled. The cursor on a button is its own focus swipe (cursor.bar hides on one)</span></dd>
  <dt>Text</dt><dd>${nameButton('font.michroma')}<span>names ${SHOP.text.name} px in teal.base, lines ${SHOP.text.line} px on
    ${SHOP.text.lineHeight} px; Pokemon names in ${nameButton('font.silver')} ${SHOP.text.pokemonName}</span></dd>
  ${SHOP_FIT}
  <dt>Places</dt><dd>Today’s, from css/bw-shop.css and the tab files; nothing moved</dd>
  <dt>Pictures</dt><dd>The balls are today’s (assets/icons/pokeball/balls/, frame ${SHOP_BALL_STRIP.cardFrame} flipped
    on a card, frame ${SHOP_BALL_STRIP.beltFrame} in a well, both ${SHOP_BALL_STRIP.scale}x). Placeholders: Leftovers for
    every item, the type glyph for a TM</dd>
  <dt>Board copy</dt><dd>Every value lives in tools/library/shop-draft.js; changing one changes only the board</dd>`;
const shopSection = (page, tabKey, title, pane, facts) => `<section class="lib-story" data-draft="${page}">
    <h3>${nameButton(page)} ${draftTag(title)}</h3>
    <div class="lib-area-scroll">${shopWindow(tabKey, pane())}</div>
    <dl class="lib-facts">${facts}${SHOP_COMMON_FACTS}</dl></section>`;
const SHOP_PAGES = {
  'main.shop.pokeball': () =>
    shopSection(
      'main.shop.pokeball',
      'balls',
      'composite: the Pokeballs tab (a board copy)',
      ballsPane,
      `<dt>Pieces</dt><dd>${nameButton('card.vertical')} on ${nameButton('panel.shopCard')} in a 3-column grid, ${SHOP.ballCard.height} px
        tall (today 350; every card fits, so no ${nameButton('scroll.bar')}). The belts as ${nameButton('panel.pixel')}
        in ${nameButton('color.pocketPokeBalls')} (a belt not bought: the fainted grey ramp, as today), sized to six
        ${SHOP.belt.well} px wells ${SHOP.belt.wellGap} px apart, the berry pocket’s wells (grey.panel inside; an
        ink ring when empty, the pocket’s base when it holds a ball); the ball at 2x fills most of the well. The
        belt number in Michroma ${SHOP.text.beltNumber}, white with a 1 px ink stroke. Cards: lit (Poke, under the
        cursor), dimmed with its Unlock lit (Great), dimmed with its refused Unlock at full strength (the rest; Jess
        2026-11-20: a dimmed card never dims its button)</dd>
      <dt>For the build (#126)</dt><dd>Layout is the build\u2019s: the cards scroll in today\u2019s scroll box once all 17
        balls are listed (6 rows). Each ball is centred on its filled pixels, not its 32 px frame (the board shifts it by
        SHOP_BALL_CENTRE); the game measures the same shift from the art</dd>`
    ),
  'main.shop.character': () =>
    shopSection(
      'main.shop.character',
      'upgrades',
      'composite: the Character Upgrades tab (a board copy)',
      upgradesPane,
      `<dt>Pieces</dt><dd>Each pocket a ${nameButton('panel.pixel')} in its Bag pocket ramp (${nameButton('color.pocketBerries')},
        ${nameButton('color.pocketItems')}; today the same hues as a pixel rim; Jess 2026-11-20), its body plain grey.raised (the Shop cards\u2019 body) with no grid, its 2x2 of ${SHOP.pocket.square} px
        ${nameButton('square.clean')} (not bought: the locked 30%), a divider, its name in teal Michroma
        ${SHOP.text.pocketName}, its line, one Buy (Full once every slot is bought, disabled)</dd>`
    ),
  'main.shop.items': () =>
    shopSection(
      'main.shop.items',
      'items',
      'composite: the Team Items tab (a board copy)',
      itemsPane,
      `<dt>Pieces</dt><dd>${nameButton('field.text')} over the card grid (cards on ${nameButton('panel.shopCard')}); the owned panel as panel.clean with its own search
        and a ${SHOP.owned.columns}-wide grid of ${SHOP.owned.square} px ${nameButton('square.clean')} (owned: the teal
        filled edge; empty: the locked 30%) and ${nameButton('scroll.bar')}. The cursor (${nameButton('cursor.bar')},
        blinking) on the first owned square, its ${nameButton('tooltip')} below it after the Tooltip Delay;
        Inventory left of Exit</dd>`
    ),
  'main.shop.tms': () =>
    shopSection(
      'main.shop.tms',
      'tms',
      'composite: the TMs tab (a board copy)',
      tmsPane,
      `<dt>Pieces</dt><dd>The bar: ${nameButton('field.text')}, the Type ${nameButton('field.dropdown')} and
        ${nameButton('toggle.power')} (its label at ${SHOP.tms.bar.labelSize} px to fit beside the panel; the toggle’s own
        is 18). Cards on ${nameButton('panel.shopCard')} with the type glyph (Learned and Known
        disabled). The Pokemon panel as panel.clean: the chosen
        Pokemon (${nameButton('portrait.round.selected')} at ${SHOP.tms.chosen.size} px, its name in Silver), the team of
        six at ${SHOP.tms.team.size} px (the chosen one selected), a divider, the search and Filter, the Pokebox grid at
        rest with the cursor bar on one face</dd>`
    ),
};
// main.shop.pokeball and main.shop.character are approved (decisions 2026-11-20-155-main-shop-pokeball-look and
// 2026-11-20-155-main-shop-character-look); the other two are rough drafts
const SHOP_APPROVED = {
  'main.shop.pokeball': {
    title: 'Approved',
    note: 'APPROVED (Jess 2026-11-20): decision 2026-11-20-155-main-shop-pokeball-look. Layout (centring the balls on ' +
      'their art, the scroll bar at 17 balls) is the build\u2019s, at #126.',
  },
  'main.shop.character': {
    title: 'Approved',
    note: 'APPROVED (Jess 2026-11-20): decision 2026-11-20-155-main-shop-character-look.',
  },
};
const SHOP_DRAFT_NOTE = {
  title: 'Rough draft',
  note:
    'NOT APPROVED (Jess 2026-11-20): a rough first pass at this tab in the Unified pieces, kept as a starting point. ' +
    'Redone one tab at a time.',
};
const shopTabsOf = (page) => [{ id: 'unified', ...(SHOP_APPROVED[page] || SHOP_DRAFT_NOTE), draw: SHOP_PAGES[page] }];
const shopPage = (page) => (tab) => tabbedPage(page, shopTabsOf(page), tab);
