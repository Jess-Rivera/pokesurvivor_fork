// tools/library/run-shops-draft.js: run.hud.moveMart (the Move Trainer), run.hud.trMart (the TR Mart) and
// run.hud.forgetMove (the popup that picks the move to replace), the run's two walk-in shops (today js/ui/shop-ui.js,
// css/style.css mshop-). Both stack what you choose from over its answer, mirrored top to bottom (Jess 2026-11-21):
// the Move Trainer puts the team on top and the chosen Pokemon's four offers below; the TR Mart puts four TRs on top
// (the picked one under the cursor) and the team below, a status on each Pokemon. The team rows are run.hud.teamSlot's
// box, portrait and name with the Pokemon's type chips in the HP bar's place; the cards carry the move's type well and
// a Silver price, no Buy button. Silver buys do not ask; a full roster opens run.hud.forgetMove, then the Modal page's
// Replace ask. Drawn once each, in the default state: dimmed, refused and disabled looks belong to the pieces inside.
// Board copies built from the Main Menu Shop's pieces (shop-draft.js): nothing here reads the game. A plain script
// sharing the board's globals; it loads after catch-draft.js.
'use strict';
// ---------- places: px ----------
const RUN_SHOP = {
  stagePad: 24,
  inset: 24,
  header: { titleTop: 18, lineTop: 50, dividerTop: 76 },
  contentTop: 92,
  cardGap: 12,
  // both shops (Jess 2026-11-21): the team rows 3 x 2 and the four cards, one over the other; the window is as wide as
  // the team grid and as tall as its parts (runShopWidth, runShopHeight)
  stack: { columns: 3, columnGap: 12, rowGap: 10, sectionGap: 16 },
  // a team row (Jess 2026-11-21): run.hud.teamSlot's box 6 art rows taller (38, 76 px), so cursor.ring (4 px past the
  // face) has 2 px of air inside the rim on every side (the body runs 10 to 66 px, the side rim is 12 px) and the chips
  // clear the bottom rim. The face is centred on the box; the name and the chips are centred as a pair on the body.
  // chip.type:one (60 x 17), since chip.type:two (116 x 32) is too wide for two types and too tall for the box.
  // The TR Mart's status sits at the right end, in Silver 30 (whole font pixels), centred on the box.
  teamRow: {
    artRows: 38,
    faceLeft: 18,
    textLeft: 72,
    nameTop: 18,
    chipsTop: 41,
    chipGap: 6,
    statusRight: 20,
    statusSize: 30,
  },
  price: { coin: 16, gap: 6, size: 16 }, // a card's Silver line, in the card's button place
  typeWell: { card: 64, popup: 40 }, // the move's type glyph in its circle (the move slot's well), on a card and a row
  silver: { coin: 32, gap: 8, top: 14 },
  buttons: { reroll: 220, leave: 156, gap: 16 },
  // run.hud.forgetMove (Jess 2026-11-21): the four move slots 2 x 2 as run.hud.playerActive.area, then a wide card on
  // the move under cursor.ring; the popup is as wide as the slot grid plus its padding. A slot is 6 art rows taller
  // than the HUD's (28, 56 px) and its wells 6 px lower (12 px down), so the ring (4 px past the 32 px well) has 4 px
  // of air inside the dark bands above and below (2 px read as touching, Jess 2026-11-21). No key. A disabled bond is
  // darker than an inactive slot.
  popup: {
    padding: 28,
    slotsTop: 108,
    gap: 16,
    slot: { artRows: 28, wellTop: 12, disabledBrightness: 0.25 },
    card: { height: 96, inset: 16, textGap: 14, nameTop: 18, lineTop: 42 },
  },
};
// today's sample: Pikachu's roster and four moves, the Move Trainer's offers and the TR Mart's TRs alike. disc is the
// TR Mart's placeholder TM disc, its cell in the item sheet (js/data/pokesprite-index.js, as main.shop.tms)
const RUN_SHOP_TEAM = [
  { dex: 25, name: 'Pikachu', types: ['electric'] },
  { dex: 4, name: 'Charmander', types: ['fire'] },
  { dex: 7, name: 'Squirtle', types: ['water'] },
  { dex: 1, name: 'Bulbasaur', types: ['grass', 'poison'] },
  { dex: 94, name: 'Gengar', types: ['ghost', 'poison'] },
  { dex: 130, name: 'Gyarados', types: ['water', 'flying'] },
];
const RUN_SHOP_MOVES = [
  {
    name: 'Thunderbolt',
    type: 'electric',
    price: 40,
    disc: [1394, 442],
    desc: 'Chains between foes: damage, 10% paralysis, hops to more foes.',
  },
  { name: 'Flamethrower', type: 'fire', price: 40, disc: [1496, 442], desc: 'Cone: damage, 10% burn.' },
  { name: 'Ice Beam', type: 'ice', price: 40, disc: [1666, 442], desc: 'Beam: damage, 10% freeze, foe Speed -1.' },
  { name: 'Earthquake', type: 'ground', price: 60, disc: [1632, 442], desc: 'Burst around you: damage.' },
];
// the TR Mart's status on each Pokemon for the picked TR (game Silver has no check or cross: root, multiplication sign and
// equals stand in until Jess's icons). A dimmed one is refused with a toast on Enter or a click, never on the cursor.
const RUN_SHOP_STATUS = {
  learn: { symbol: '\u221a', dimmed: false, colour: unifiedTone(UNIFIED_GREEN, 'base'), words: 'Can learn it' },
  knows: { symbol: '=', dimmed: true, colour: greyTone('mid'), words: 'Knows it' },
  cannot: { symbol: '', dimmed: true, colour: greyTone('mid'), words: 'Cannot learn it' },
  full: { symbol: '\u00d7', dimmed: true, colour: unifiedTone(UNIFIED_RED, 'base'), words: 'Every slot is a bond' },
};
// for Thunderbolt, by mainline TM learnsets: Pikachu knows it, Gengar learns it, Gyarados is all bonds
const RUN_SHOP_ROSTER_STATUS = ['knows', 'cannot', 'cannot', 'cannot', 'learn', 'full'];
// the Pokemon's four slots the popup shows, in the HUD's order (I and J on top, K and L under them), as
// run.hud.playerActive.area's sample: a slot with one move is a choice, a bond (2 to 4 moves) is fixed and disabled.
// replace marks the slot under cursor.ring, the one the wide card describes
const RUN_SHOP_FORGET = [
  {
    key: 'I',
    replace: true,
    moves: [{ name: 'Quick Attack', type: 'normal', family: 'melee', desc: 'Dash at a foe: damage.' }],
  },
  {
    key: 'J',
    moves: [{ name: 'Thunder Shock', type: 'electric', family: 'projectile', desc: 'Bolt: damage, 10% paralysis.' }],
  },
  {
    key: 'K',
    moves: [
      { name: 'Iron Tail', type: 'steel', family: 'melee' },
      { name: 'Thunder', type: 'electric', family: 'beam' },
    ],
  }, // a bond
  { key: 'L', moves: [{ name: 'Surf', type: 'water', family: 'nova', desc: 'Wave around you: damage.' }] },
];

// ---------- the window: both shops' size, frame and buttons ----------
const runShopWidth = () => {
  const stack = RUN_SHOP.stack;
  return 2 * RUN_SHOP.inset + stack.columns * teamSlotWidth() + (stack.columns - 1) * stack.columnGap;
};
const runShopRowHeight = () => RUN_SHOP.teamRow.artRows * TEAM_SLOT.box.artPixel;
const runShopTeamHeight = () => {
  const stack = RUN_SHOP.stack,
    rows = Math.ceil(RUN_SHOP_TEAM.length / stack.columns);
  return rows * (runShopRowHeight() + stack.rowGap) - stack.rowGap;
};
const runShopHeight = () => {
  const gap = RUN_SHOP.stack.sectionGap;
  return (
    RUN_SHOP.contentTop + runShopTeamHeight() + gap + SHOP.itemCard.height + gap + SHOP.buttonHeight + RUN_SHOP.inset
  );
};
const runShopSilver = (right, top, amount) =>
  `<div class="lib-area-piece lib-area-coin" style="${place(right.coinLeft, top)};
      background-image:url('${ROOT}assets/items/pickups/silver16.png')"></div>
    ${shopText(amount, 32, greyTone('white'), `right:${px(right.numberRight)};top:${px(top)}`, AREA_FONTS.counter)}`;
/** The window: panel.clean, its title and Silver counter, the line under the title, a divider, Reroll and Leave. */
function runShopWindow(title, line, inner) {
  const width = runShopWidth(),
    height = runShopHeight(),
    inset = RUN_SHOP.inset,
    header = RUN_SHOP.header,
    silver = RUN_SHOP.silver,
    coinLeft = width - inset - silver.coin;
  return cleanBox(
    0,
    0,
    width,
    height,
    `${shopText(title, 24, SHOP_COLOURS.text, place(inset, header.titleTop))}
    ${shopText(line, SHOP.text.line, SHOP_COLOURS.name, place(inset, header.lineTop))}
    ${runShopSilver({ coinLeft, numberRight: inset + silver.coin + silver.gap }, silver.top, '1,240')}
    ${divider(inset, inset, header.dividerTop)}
    ${inner}
    ${runShopButtons(width, height)}`
  );
}
const runShopButtons = (width, height) => {
  const b = RUN_SHOP.buttons,
    top = height - RUN_SHOP.inset - SHOP.buttonHeight,
    leaveLeft = width - RUN_SHOP.inset - b.leave,
    rerollLeft = leaveLeft - b.gap - b.reroll;
  return `${shopButton('Reroll (1)', 'Positive', b.reroll, { style: place(rerollLeft, top) })}
    ${shopButton('Leave', 'Neutral', b.leave, { style: place(leaveLeft, top) })}`;
};
const runShopStage = (state, width, height, inner, extra = '') =>
  `<div class="lib-area" data-state="${state}" style="width:${px(width + 2 * RUN_SHOP.stagePad)};
    height:${px(height + 2 * RUN_SHOP.stagePad)};background:${AREA_COLOURS.stage}">
    <div style="${place(RUN_SHOP.stagePad, RUN_SHOP.stagePad)};width:${px(width)};height:${px(height)}">${inner}</div>${extra}</div>`;

// ---------- the team rows: both shops ----------
/** One team row: run.hud.teamSlot's box, portrait and name, the Pokemon's type chips in the HP bar's place. chosen
 *  selects it with cursor.ring (the Move Trainer); status puts the TR Mart's symbol at the right end, and a dimmed
 *  status dims the rest of the row (the symbol stays whole so it reads). */
function runShopTeamRow(member, left, top, { chosen = false, status } = {}) {
  const { face } = TEAM_SLOT,
    row = RUN_SHOP.teamRow,
    height = runShopRowHeight(),
    faceTop = (height - face.size) / 2,
    rimRight = member.types.length === 2 ? typeRamp(member.types[1]) : undefined,
    sample = { src: `${PORTRAIT_ART}${member.dex}/Portrait.png` },
    portrait = portraitFace({ size: face.size, stroke: face.stroke, sample, selected: chosen }),
    facePiece = chosen
      ? withRing(row.faceLeft, faceTop, face.size, portrait)
      : `<div style="${place(row.faceLeft, faceTop)}">${portrait}</div>`,
    chips = member.types.map((type) => chipHtml(typeChip(type))).join(''),
    dim = status && status.dimmed ? `opacity:${SHOP.card.dimmed}` : '',
    symbolTop = (height - row.statusSize - 4) / 2, // shopText's line is the size plus 4
    symbolPlace = `position:absolute;right:${px(row.statusRight)};top:${px(symbolTop)}`,
    symbol = status ? shopText(status.symbol, row.statusSize, status.colour, symbolPlace, SHOP.fonts.pokemon) : '';
  return `<div class="lib-area-piece" style="${place(left, top)};width:${px(teamSlotWidth())};height:${px(height)}">
    <div style="position:absolute;inset:0;${dim}">
      ${teamBoxSvg(typeRamp(member.types[0]), undefined, row.artRows, rimRight)}
      ${facePiece}
      ${teamText(member.name, `left:${px(row.textLeft)};top:${px(row.nameTop)}`)}
      <div style="${place(row.textLeft, row.chipsTop)};display:flex;gap:${px(row.chipGap)}">${chips}</div></div>
    ${symbol}</div>`;
}
/** The team of six, 3 x 2, from a top; rowOptions(index) gives each row's chosen or status. */
function runShopTeam(top, rowOptions) {
  const stack = RUN_SHOP.stack;
  return RUN_SHOP_TEAM.map((member, index) =>
    runShopTeamRow(
      member,
      RUN_SHOP.inset + (index % stack.columns) * (teamSlotWidth() + stack.columnGap),
      top + Math.floor(index / stack.columns) * (runShopRowHeight() + stack.rowGap),
      rowOptions(index)
    )
  ).join('');
}

// ---------- the cards: both shops ----------
/** A card's price in its button's place: the Silver coin and the amount, centred (the pick is the buy).
 *  The coin is the counter's sheet at 1x, its first frame, still (eight spinning coins would be noise). */
const runShopPrice = (amount, card) => {
  const p = RUN_SHOP.price;
  return `<div style="width:${px(card.buttonWidth)};height:${px(card.buttonHeight)};display:flex;align-items:center;
    justify-content:center;gap:${px(p.gap)}"><div class="lib-area-coin" style="position:relative;width:${px(p.coin)};
    height:${px(p.coin)};background-size:144px auto;animation:none;
    background-image:url('${ROOT}assets/items/pickups/silver16.png')"></div>
    ${shopText(String(amount), p.size, greyTone('white'), 'position:relative', AREA_FONTS.counter)}</div>`;
};
/** A move's type glyph in its circle, as the move slot's well (hud-area-draft.js areaWell): the type's base in a 2 px
 *  ink ring. */
const moveTypeWell = (type, size, style = '') =>
  `<div class="lib-area-well" style="position:relative;width:${px(size)};height:${px(size)};
    --well-fill:${typeRamp(type).base};--well-ring:${AREA_COLOURS.outline};${style}"><img src="${typeGlyph(type)}"
    alt="" /></div>`;
/** The four cards in a centred row from a top; picture(move, index) draws each card's picture. */
function runShopCards(top, picture) {
  const card = SHOP.itemCard,
    rowWidth = RUN_SHOP_MOVES.length * (card.width + RUN_SHOP.cardGap) - RUN_SHOP.cardGap,
    left = (runShopWidth() - rowWidth) / 2;
  return RUN_SHOP_MOVES.map((move, index) => {
    const piece = shopCard({
        picture: picture(move, index),
        name: move.name,
        description: move.desc,
        card,
        button: runShopPrice(move.price, card),
      }),
      cardLeft = left + index * (card.width + RUN_SHOP.cardGap);
    return `<div style="${place(cardLeft, top)}">${piece}</div>`;
  }).join('');
}

// ---------- run.hud.moveMart: the team on top, the chosen Pokemon's offers below ----------
function moveMartWindow() {
  const cardsTop = RUN_SHOP.contentTop + runShopTeamHeight() + RUN_SHOP.stack.sectionGap;
  return runShopWindow('Move Trainer', 'Pick a Pokemon, then a move to learn.',
    `${runShopTeam(RUN_SHOP.contentTop, (index) => ({ chosen: index === 0 }))}${runShopCards(cardsTop, (move) =>
      moveTypeWell(move.type, RUN_SHOP.typeWell.card))}`);
}

// ---------- run.hud.trMart: the four TRs on top (the first picked), the team below with a status on each ----------
/** A TR card's picture: the placeholder disc filling the picture box; the picked one carries cursor.ring (Jess
 *  2026-11-21: cursor.bar at the card's height looked wrong). */
const trMartDisc = (move, index) => {
  const size = SHOP.itemCard.iconSize,
    disc = `<div style="${place(0, 0)}">${itemIcon(2, move.disc)}</div>`;
  return index === 0 ? withRing(0, 0, size, disc) : disc;
};
function trMartWindow() {
  const teamTop = RUN_SHOP.contentTop + SHOP.itemCard.height + RUN_SHOP.stack.sectionGap;
  return runShopWindow('TR Mart', 'Pick a TR, then the Pokemon that learns it.',
    `${runShopCards(RUN_SHOP.contentTop, trMartDisc)}${runShopTeam(teamTop, (index) => ({
      status: RUN_SHOP_STATUS[RUN_SHOP_ROSTER_STATUS[index]],
    }))}`);
}

// ---------- run.hud.forgetMove: the popup over the shop, the four slots and the move to replace ----------
const forgetSlotHeight = () => RUN_SHOP.popup.slot.artRows * SLANTED_SLOT.artPixel;
const forgetSlotsWidth = () => 2 * slotWidth() + AREA.slots.columnGap;
const forgetSlotsHeight = () => 2 * forgetSlotHeight() + AREA.slots.rowGap;
/** One slot, taller than the HUD's and with no key: panel.slanted in its move's type (a bond in the bond pink) and
 *  the HUD's wells and badges, moved down to the taller slot's well line. The slot under the ring draws normally, the
 *  others dim to the HUD's inactive brightness, a bond (disabled) darker still. The popup opens only on a full
 *  roster, so no slot is empty. */
function forgetSlot(slot, index, left, top) {
  const look = RUN_SHOP.popup.slot,
    bond = slot.moves.length > 1,
    rim = bond ? 'bond' : typeRamp(slot.moves[0].type),
    wells = Array.from({ length: AREA.wells.perSlot }, (_, well) => areaWell(slot.moves[well], well)).join(''),
    brightness = bond ? look.disabledBrightness : slot.replace ? 1 : AREA.inactiveBrightness;
  return `<div class="lib-area-piece" style="${place(left, top)};width:${px(slotWidth())};
    height:${px(forgetSlotHeight())};filter:brightness(${brightness})">
    ${slantedSvg({ id: 'forget-' + index, rim, grid: true, artRows: look.artRows })}
    <div style="${place(0, look.wellTop - AREA.wells.top)};width:100%;height:${px(slotHeight())}">${wells}</div></div>`;
}
/** The four slots 2 x 2 (run.hud.playerActive.area's order), cursor.ring on the well of the move to replace. A bond is
 *  disabled, so the ring never lands on it. */
function forgetSlots(left, top) {
  const size = AREA.wells.size;
  return RUN_SHOP_FORGET.map((slot, index) => {
    const x = left + (index % 2) * (slotWidth() + AREA.slots.columnGap),
      y = top + Math.floor(index / 2) * (forgetSlotHeight() + AREA.slots.rowGap),
      ringLeft = x + AREA.wells.first - size / 2,
      ring = slot.replace ? withRing(ringLeft, y + RUN_SHOP.popup.slot.wellTop, size, '') : '';
    return forgetSlot(slot, index, x, y) + ring;
  }).join('');
}
/** The wide card under the slots: the move under the ring, its type well, its name and its line (panel.shopCard). */
function forgetCard(left, top) {
  const c = RUN_SHOP.popup.card,
    move = RUN_SHOP_FORGET.find((slot) => slot.replace).moves[0],
    well = RUN_SHOP.typeWell.card,
    textLeft = c.inset + well + c.textGap,
    width = forgetSlotsWidth(),
    textStyle = (textTop) => `${place(textLeft, textTop)};right:${px(c.inset)}`;
  return cleanBox(
    left,
    top,
    width,
    c.height,
    `${moveTypeWell(move.type, well, `position:absolute;left:${px(c.inset)};top:${px((c.height - well) / 2)}`)}
    ${shopText(move.name, SHOP.text.name, SHOP_COLOURS.name, textStyle(c.nameTop))}
    ${shopText(move.desc, SHOP.text.line, SHOP_COLOURS.text, textStyle(c.lineTop))}`,
    { body: SHOP_CARD_PANEL.body, edge: SHOP_CARD_PANEL.edge }
  );
}
function forgetMovePopup() {
  const p = RUN_SHOP.popup,
    popupWidth = forgetSlotsWidth() + 2 * p.padding,
    cardTop = p.slotsTop + forgetSlotsHeight() + p.gap,
    cancelTop = cardTop + p.card.height + p.gap,
    popupHeight = cancelTop + SHOP.buttonHeight + p.padding,
    cancelWidth = RUN_SHOP.buttons.leave; // the shops' Leave size, at the bottom right as theirs
  const popup = cleanBox(
    (runShopWidth() - popupWidth) / 2,
    (runShopHeight() - popupHeight) / 2,
    popupWidth,
    popupHeight,
    `${shopText('Replace which move?', 24, SHOP_COLOURS.text, place(p.padding, p.padding - 4))}
    ${shopText('Pikachu knows four moves. Pick one to replace with Thunderbolt.', SHOP.text.line, SHOP_COLOURS.name,
      `${place(p.padding, p.padding + 36)};width:${px(popupWidth - 2 * p.padding)}`)}
    ${divider(p.padding, p.padding, 92)}
    ${forgetSlots(p.padding, p.slotsTop)}
    ${forgetCard(p.padding, cardTop)}
    ${shopButton('Cancel', 'Neutral', cancelWidth, { style: place(popupWidth - p.padding - cancelWidth, cancelTop) })}`
  );
  return `<div style="position:absolute;inset:0;background:${rgbaOf(greyTone('ink'), 0.6)};z-index:10"></div>
    <div style="position:absolute;inset:0;z-index:11">${popup}</div>`;
}

// ---------- the pages ----------
const runShopFact = (title, body) => `<dt>${title}</dt><dd>${body}</dd>`;
const RUN_SHOP_ROW_FACT = `${nameButton('run.hud.teamSlot')} rows, ${RUN_SHOP.stack.columns} across: its
  ${nameButton('panel.pixel')} box in the first type (the two-type seam), 6 art rows taller so the ring and the chips
  clear the rim, the ${nameButton('portrait.round')} and the name in ${nameButton('font.silver')}; the HP bar, key,
  held item, status chip and swap shade dropped, the Pokemon’s ${nameButton('chip.type')} chips (1 px scale) under
  the name`;
const RUN_SHOP_CARD_FACT = `${nameButton('card.vertical')} on ${nameButton('panel.shopCard')} (the Team Items card,
  ${SHOP.itemCard.width} x ${SHOP.itemCard.height} px): the move’s type glyph in its circle (the move slot’s well),
  its name, its generated line and its Silver price where the button was. No Buy button`;
const RUN_SHOP_COMMON = `
  ${runShopFact('Frame', `${nameButton('panel.clean')} as wide as the team grid; the title in Michroma 24, the line
    under it Michroma 12 in teal.base, a divider under both. The Silver counter top right: the spinning silver coin and
    the count in ${nameButton('font.boldPixels')} 32 (the run screen’s counter)`)}
  ${runShopFact('Buttons', `${nameButton('button.glitch')}: Reroll (Positive, its free count in the label) and
    Leave (Neutral), at the bottom right. A Silver buy asks nothing (Jess 2026-11-20); a full roster opens
    ${nameButton('run.hud.forgetMove')}`)}
  ${runShopFact('Layout', `What you choose from comes first, the answer after it, one over the other: the two shops
    mirror each other top to bottom (Jess 2026-11-21). Plan: docs/ASCII Concept Maps/155 - Run Shops Layout.md`)}`;
function moveMartSection() {
  return `<section class="lib-story" data-draft="run.hud.moveMart">
    <h3>${nameButton('run.hud.moveMart')} ${draftTag('composite: the Move Trainer (a board copy)')}</h3>
    <div class="lib-area-scroll">${runShopStage('run.hud.moveMart:default', runShopWidth(), runShopHeight(),
      moveMartWindow())}</div>
    <dl class="lib-facts">
      ${runShopFact('Pieces', `On top, the team of six as ${RUN_SHOP_ROW_FACT}. The chosen one is selected with
        ${nameButton('cursor.ring')}. Below, its four offered moves as ${RUN_SHOP_CARD_FACT}: picking the card is the
        buy`)}
      ${RUN_SHOP_COMMON}
    </dl></section>`;
}
function trMartSection() {
  return `<section class="lib-story" data-draft="run.hud.trMart">
    <h3>${nameButton('run.hud.trMart')} ${draftTag('composite: the TR Mart (a board copy)')}</h3>
    <div class="lib-area-scroll">${runShopStage('run.hud.trMart:default', runShopWidth(), runShopHeight(),
      trMartWindow())}</div>
    <dl class="lib-facts">
      ${runShopFact('Pieces', `On top, four TRs as ${RUN_SHOP_CARD_FACT}, the picture a placeholder TM disc in place of
        the type well; the picked one has ${nameButton('cursor.ring')} on its disc. Below, the team of six as
        ${RUN_SHOP_ROW_FACT}, with a status at the right end of each row: picking a Pokemon that can learn it is
        the buy`)}
      ${runShopFact('Status', `${RUN_SHOP_STATUS.learn.symbol} can learn it (a Pokemon with four loose moves too: the
        buy opens the forget popup); ${RUN_SHOP_STATUS.knows.symbol} already knows it; ${RUN_SHOP_STATUS.full.symbol}
        every slot is a bond; nothing: it cannot learn it. The last three dim the row (not the symbol) and refuse with a
        toast on Enter or a click, never when the cursor only moves onto them. The symbols are game Silver’s
        stand-ins until Jess’s icons (it has no check or cross)`)}
      ${RUN_SHOP_COMMON}
    </dl></section>`;
}
function forgetMoveSection() {
  return `<section class="lib-story" data-draft="run.hud.forgetMove">
    <h3>${nameButton('run.hud.forgetMove')} ${draftTag('popup: choose the move to replace (a board copy)')}</h3>
    <div class="lib-area-scroll">${runShopStage('run.hud.forgetMove:default', runShopWidth(), runShopHeight(),
      `${moveMartWindow()}${forgetMovePopup()}`)}</div>
    <dl class="lib-facts">
      ${runShopFact('Pieces', `${nameButton('panel.clean')} over the shop, the screen under it dimmed (ink at 60%) as
        the catch screen’s ask. Its title in Michroma 24 and a teal.base line. The Pokemon’s four slots 2 x 2 as
        ${nameButton('run.hud.playerActive.area')} draws them (${nameButton('panel.slanted')}, the wells and family
        badges), 6 art rows taller so the ring clears the rim, no keys: ${nameButton('cursor.ring')} on the move
        to replace, its slot drawn normally and the others dimmed, as the HUD’s active slot; a bond is disabled,
        darker than the dimmed slots, and the ring skips it. Under them, a wide
        ${nameButton('panel.shopCard')} on the move under the ring: its type well, name and line, updating as the ring
        moves. Cancel (Neutral) at the bottom right, the shops' Leave size`)}
      ${runShopFact('Next', `Choosing a move opens the Modal page’s Negative ask, “Replace X with Y?”: Replace
        (red) and Go Back (teal), opening on Go Back. Decision
        2026-11-20-155-move-shop-replace-a-move-asks-replace-or-go-back`)}
      ${runShopFact('Opens when', `A buy into a full roster, from either shop. A free slot learns the move at once, with
        no popup and no ask`)}
    </dl></section>`;
}
const runShopTabs = (note, draw) => [{ id: 'unified', title: 'Rough draft', note, draw }];
const FORGET_MOVE_NOTE = 'APPROVED (Jess 2026-11-21): decision 2026-11-21-155-run-hud-forget-move-look.';
const TR_MART_NOTE = 'APPROVED (Jess 2026-11-21): decision 2026-11-21-155-run-hud-tr-mart-look.';
const MOVE_MART_NOTE = 'APPROVED (Jess 2026-11-21): decision 2026-11-21-155-run-hud-move-mart-look.';
const moveMartPage = (tab) => tabbedPage('run.hud.moveMart', runShopTabs(MOVE_MART_NOTE, moveMartSection), tab);
const trMartPage = (tab) => tabbedPage('run.hud.trMart', runShopTabs(TR_MART_NOTE, trMartSection), tab);
const forgetMovePage = (tab) => tabbedPage('run.hud.forgetMove', runShopTabs(FORGET_MOVE_NOTE, forgetMoveSection), tab);
