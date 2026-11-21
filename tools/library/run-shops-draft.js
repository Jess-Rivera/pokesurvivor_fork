// tools/library/run-shops-draft.js: run.hud.moveMart (the Move Trainer), run.hud.trMart (the TR Mart) and run.hud.forgetMove
// (the popup that picks the move to replace), the run's two walk-in shops (today js/ui/shop-ui.js, css/style.css mshop-).
// Move Trainer, stacked (Jess 2026-11-21): the team on top as run.hud.teamSlot rows (its box, portrait and name, the
// Pokemon's type chips in the HP bar's place), the chosen Pokemon's four offers below, priced in Silver, no Buy button.
// TR Mart, mirrored for now (Jess 2026-11-20): four TRs on the left (the picked one under the cursor), the team on the
// right with a status on each Pokemon. Silver buys do not ask; a full roster opens
// run.hud.forgetMove, then the Modal page's Replace ask. Drawn once each, in the default state: dimmed, refused and
// disabled looks belong to the pieces inside. Board copies built from the Main Menu Shop's pieces (shop-draft.js): nothing
// here reads the game. A plain script sharing the board's globals; it loads after catch-draft.js.
'use strict';
// ---------- places: px ----------
const RUN_SHOP = {
  stagePad: 24,
  window: { width: 1145, martHeight: 640 }, // the TR Mart's: the Main Menu Shop's width
  inset: 24,
  header: { titleTop: 18, lineTop: 50, dividerTop: 76 },
  contentTop: 92,
  cardGap: 12,
  // the Move Trainer (Jess 2026-11-21): the team rows 3 x 2, then the offers; the window is as wide as the team grid
  // and as tall as its parts (moveMartWidth, moveMartHeight)
  trainer: { columns: 3, columnGap: 12, rowGap: 10, sectionGap: 16 },
  // a team row (Jess 2026-11-21): run.hud.teamSlot's box 6 art rows taller (38, 76 px), so cursor.ring (4 px past the
  // face) has 2 px of air inside the rim on every side (the body runs 10 to 66 px, the side rim is 12 px) and the chips
  // clear the bottom rim. The face is centred on the box; the name and the chips are centred as a pair on the body.
  // chip.type:one (60 x 17), since chip.type:two (116 x 32) is too wide for two types and too tall for the box.
  teamRow: { artRows: 38, faceLeft: 18, textLeft: 72, nameTop: 18, chipsTop: 41, chipGap: 6 },
  price: { coin: 16, gap: 6, size: 16 }, // an offer card's Silver line, in the card's button place
  typeWell: { card: 64, popup: 40 }, // the move's type glyph in its circle (the move slot's well), on a card and a row
  silver: { coin: 32, gap: 8, top: 14 },
  mart: { roster: { portrait: 72, columns: 3, columnGap: 64, rowGap: 56, nameSize: 16, symbolSize: 28 } },
  buttons: { reroll: 220, leave: 156, gap: 16 },
  popup: { width: 460, padding: 28, rowHeight: 54, rowGap: 12 },
};
// today's sample: Pikachu's roster, four offers and four TRs (art cells from js/data/pokesprite-index.js, as main.shop.tms)
const RUN_SHOP_TEAM = [
  { dex: 25, name: 'Pikachu', types: ['electric'] },
  { dex: 4, name: 'Charmander', types: ['fire'] },
  { dex: 7, name: 'Squirtle', types: ['water'] },
  { dex: 1, name: 'Bulbasaur', types: ['grass', 'poison'] },
  { dex: 94, name: 'Gengar', types: ['ghost', 'poison'] },
  { dex: 130, name: 'Gyarados', types: ['water', 'flying'] },
];
const RUN_SHOP_MOVES = [
  { name: 'Thunderbolt', type: 'electric', price: 40, desc: 'Chains between foes: damage, 10% paralysis, hops to more foes.' },
  { name: 'Flamethrower', type: 'fire', price: 40, desc: 'Cone: damage, 10% burn.' },
  { name: 'Ice Beam', type: 'ice', price: 40, desc: 'Beam: damage, 10% freeze, foe Speed -1.' },
  { name: 'Earthquake', type: 'ground', price: 60, desc: 'Burst around you: damage.' },
];
const RUN_SHOP_TRS = [
  { name: 'Thunderbolt', art: [1394, 442], label: 'Pick 40', desc: 'Chains between foes: damage, 10% paralysis, hops to more foes.' },
  { name: 'Flamethrower', art: [1496, 442], label: 'Pick 40', desc: 'Cone: damage, 10% burn.' },
  { name: 'Ice Beam', art: [1666, 442], label: 'Pick 40', desc: 'Beam: damage, 10% freeze, foe Speed -1.' },
  { name: 'Earthquake', art: [1632, 442], label: 'Pick 60', desc: 'Burst around you: damage.' },
];
// the TR Mart's status on each Pokemon for the picked TR (game Silver has no check or cross: root, multiplication sign and
// equals stand in until Jess's icons). A dimmed one is refused with a toast on Enter or a click, never on the cursor.
const RUN_SHOP_STATUS = {
  learn: { symbol: '√', dimmed: false, colour: unifiedTone(UNIFIED_GREEN, 'base'), words: 'Can learn it' },
  knows: { symbol: '=', dimmed: true, colour: greyTone('mid'), words: 'Knows it' },
  cannot: { symbol: '', dimmed: true, colour: greyTone('mid'), words: 'Cannot learn it' },
  full: { symbol: '×', dimmed: true, colour: unifiedTone(UNIFIED_RED, 'base'), words: 'Every slot is a bond' },
};
const RUN_SHOP_ROSTER_STATUS = ['learn', 'learn', 'knows', 'cannot', 'learn', 'full'];
// the Pokemon's four moves the popup lists: a loose move is a choice, a bond is fixed and disabled
const RUN_SHOP_FORGET = [
  { name: 'Quick Attack', type: 'normal', focused: true },
  { name: 'Thunder Shock', type: 'electric' },
  { name: 'Iron Tail', type: 'steel', bond: true },
  { name: 'Surf', type: 'water' },
];

// ---------- the pieces both screens share ----------
const runShopSilver = (right, top, amount) => {
  const s = RUN_SHOP.silver;
  return `<div class="lib-area-piece lib-area-coin" style="${place(right.coinLeft, top)};
      background-image:url('${ROOT}assets/items/pickups/silver16.png')"></div>
    ${shopText(amount, 32, greyTone('white'), `right:${px(right.numberRight)};top:${px(top)}`, AREA_FONTS.counter)}`;
};
/** The window: panel.clean, its title and Silver counter, the line under the title and a divider. */
function runShopWindow(title, line, height, inner, width = RUN_SHOP.window.width) {
  const w = width,
    inset = RUN_SHOP.inset,
    h = RUN_SHOP.header,
    silver = RUN_SHOP.silver,
    coinLeft = w - inset - silver.coin;
  return cleanBox(
    0,
    0,
    w,
    height,
    `${shopText(title, 24, SHOP_COLOURS.text, place(inset, h.titleTop))}
    ${shopText(line, SHOP.text.line, SHOP_COLOURS.name, place(inset, h.lineTop))}
    ${runShopSilver({ coinLeft, numberRight: inset + silver.coin + silver.gap }, silver.top, '1,240')}
    ${divider(inset, inset, h.dividerTop)}
    ${inner}`
  );
}
const runShopButtons = (height, width = RUN_SHOP.window.width) => {
  const b = RUN_SHOP.buttons,
    w = width,
    top = height - RUN_SHOP.inset - SHOP.buttonHeight,
    leaveLeft = w - RUN_SHOP.inset - b.leave,
    rerollLeft = leaveLeft - b.gap - b.reroll;
  return `${shopButton('Reroll (1)', 'Positive', b.reroll, { style: place(rerollLeft, top) })}
    ${shopButton('Leave', 'Neutral', b.leave, { style: place(leaveLeft, top) })}`;
};
const runShopStage = (state, width, height, inner, extra = '') =>
  `<div class="lib-area" data-state="${state}" style="width:${px(width + 2 * RUN_SHOP.stagePad)};
    height:${px(height + 2 * RUN_SHOP.stagePad)};background:${AREA_COLOURS.stage}">
    <div style="${place(RUN_SHOP.stagePad, RUN_SHOP.stagePad)};width:${px(width)};height:${px(height)}">${inner}</div>${extra}</div>`;
const runShopFace = (dex, size, state = {}) => face(dex, size, state);

// ---------- run.hud.moveMart: the team on top, the chosen Pokemon's offers below (stacked, Jess 2026-11-21) ----------
const moveMartWidth = () => {
  const t = RUN_SHOP.trainer;
  return 2 * RUN_SHOP.inset + t.columns * teamSlotWidth() + (t.columns - 1) * t.columnGap;
};
const moveMartRowHeight = () => RUN_SHOP.teamRow.artRows * TEAM_SLOT.box.artPixel;
const moveMartCardsTop = () => {
  const t = RUN_SHOP.trainer,
    rows = Math.ceil(RUN_SHOP_TEAM.length / t.columns);
  return RUN_SHOP.contentTop + rows * (moveMartRowHeight() + t.rowGap) - t.rowGap + t.sectionGap;
};
const moveMartHeight = () =>
  moveMartCardsTop() + SHOP.itemCard.height + RUN_SHOP.trainer.sectionGap + SHOP.buttonHeight + RUN_SHOP.inset;
/** One team row: run.hud.teamSlot's box, portrait and name, the Pokemon's type chips in the HP bar's place. The chosen
 *  one is selected and carries cursor.ring. */
function moveMartTeamRow(member, left, top, chosen) {
  const { face } = TEAM_SLOT,
    row = RUN_SHOP.teamRow,
    height = moveMartRowHeight(),
    faceTop = (height - face.size) / 2,
    rimRight = member.types.length === 2 ? typeRamp(member.types[1]) : undefined,
    sample = { src: `${PORTRAIT_ART}${member.dex}/Portrait.png` },
    portrait = portraitFace({ size: face.size, stroke: face.stroke, sample, selected: chosen }),
    facePiece = chosen
      ? withRing(row.faceLeft, faceTop, face.size, portrait)
      : `<div style="${place(row.faceLeft, faceTop)}">${portrait}</div>`,
    chips = member.types.map((type) => chipHtml(typeChip(type))).join('');
  return `<div class="lib-area-piece" style="${place(left, top)};width:${px(teamSlotWidth())};height:${px(height)}">
    ${teamBoxSvg(typeRamp(member.types[0]), undefined, row.artRows, rimRight)}
    ${facePiece}
    ${teamText(member.name, `left:${px(row.textLeft)};top:${px(row.nameTop)}`)}
    <div style="${place(row.textLeft, row.chipsTop)};display:flex;gap:${px(row.chipGap)}">${chips}</div></div>`;
}
function moveMartTeam() {
  const t = RUN_SHOP.trainer;
  return RUN_SHOP_TEAM.map((member, index) =>
    moveMartTeamRow(
      member,
      RUN_SHOP.inset + (index % t.columns) * (teamSlotWidth() + t.columnGap),
      RUN_SHOP.contentTop + Math.floor(index / t.columns) * (moveMartRowHeight() + t.rowGap),
      index === 0
    )
  ).join('');
}
/** An offer card's price in its button's place: the Silver coin and the amount, centred (picking the card buys).
 *  The coin is the counter's sheet at 1x, its first frame, still (eight spinning coins would be noise). */
const moveMartPrice = (amount, card) => {
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
const moveMartCards = () => {
  const card = SHOP.itemCard,
    rowWidth = RUN_SHOP_MOVES.length * (card.width + RUN_SHOP.cardGap) - RUN_SHOP.cardGap,
    left = (moveMartWidth() - rowWidth) / 2;
  return RUN_SHOP_MOVES.map((move, index) =>
    `<div style="${place(left + index * (card.width + RUN_SHOP.cardGap), moveMartCardsTop())}">${shopCard({
      picture: moveTypeWell(move.type, RUN_SHOP.typeWell.card),
      name: move.name,
      description: move.desc,
      card,
      button: moveMartPrice(move.price, card),
    })}</div>`
  ).join('');
};
function moveMartWindow() {
  const width = moveMartWidth(),
    height = moveMartHeight();
  return runShopWindow('Move Trainer', 'Pick a Pokemon, then a move to learn.', height,
    `${moveMartTeam()}${moveMartCards()}${runShopButtons(height, width)}`, width);
}

// ---------- run.hud.trMart: four TRs left (one picked), the team right with a status on each ----------
function trMartCards() {
  const card = SHOP.itemCard;
  return RUN_SHOP_TRS.map((tr, index) =>
    `<div style="${place(RUN_SHOP.inset + (index % 2) * (card.width + RUN_SHOP.cardGap),
      RUN_SHOP.contentTop + Math.floor(index / 2) * (card.height + RUN_SHOP.cardGap))}">${shopCard({
      picture: `<div style="${place(0, 0)}">${itemIcon(2, tr.art)}</div>`,
      name: tr.name,
      description: tr.desc,
      card,
      button: shopButton(tr.label, 'Neutral', card.buttonWidth, {
        focused: index === 0, // the cursor on the picked TR: a button's own focus swipe
        height: card.buttonHeight,
        fontSize: card.buttonFont,
      }),
    })}</div>`
  ).join('');
}
function trMartRoster() {
  const r = RUN_SHOP.mart.roster,
    card = SHOP.itemCard,
    left = RUN_SHOP.inset + 2 * card.width + RUN_SHOP.cardGap + RUN_SHOP.inset,
    width = RUN_SHOP.window.width - RUN_SHOP.inset - left,
    height = RUN_SHOP.window.martHeight - RUN_SHOP.contentTop - RUN_SHOP.inset - SHOP.buttonHeight - 16,
    gridWidth = r.columns * r.portrait + (r.columns - 1) * r.columnGap,
    gridLeft = (width - gridWidth) / 2,
    cells = RUN_SHOP_TEAM.map((member, index) => {
      const status = RUN_SHOP_STATUS[RUN_SHOP_ROSTER_STATUS[index]],
        x = gridLeft + (index % r.columns) * (r.portrait + r.columnGap),
        y = 64 + Math.floor(index / r.columns) * (r.portrait + r.rowGap + 40),
        textWidth = r.portrait + r.columnGap;
      return `<div style="${place(x, y)};${status.dimmed ? `opacity:${SHOP.card.dimmed}` : ''}">
        ${runShopFace(member.dex, r.portrait)}</div>
        ${shopText(member.name, r.nameSize, SHOP_COLOURS.text,
          `${place(x - r.columnGap / 2, y + r.portrait + 8)};width:${px(textWidth)};text-align:center`, SHOP.fonts.pokemon)}
        ${shopText(status.symbol, r.symbolSize, status.colour,
          `${place(x - r.columnGap / 2, y + r.portrait + 30)};width:${px(textWidth)};text-align:center`, SHOP.fonts.pokemon)}`;
    }).join('');
  const inner = `${shopText('Who learns Thunderbolt?', SHOP.text.pocketName, SHOP_COLOURS.name, place(20, 18))}
    ${divider(20, 20, 50)}
    ${cells}`;
  return cleanBox(left, RUN_SHOP.contentTop, width, height, inner, { body: SHOP_CARD_PANEL.body });
}
function trMartWindow() {
  const height = RUN_SHOP.window.martHeight;
  return runShopWindow('TR Mart', 'Pick a TR, then the Pokemon that learns it.', height,
    `${trMartCards()}${trMartRoster()}${runShopButtons(height)}`);
}

// ---------- run.hud.forgetMove: the popup over the Move Trainer, one loose move to replace ----------
function forgetMovePopup() {
  const p = RUN_SHOP.popup,
    w = moveMartWidth(),
    height = moveMartHeight(),
    rows = RUN_SHOP_FORGET.map((move, index) =>
      `<div style="${place(p.padding, 108 + index * (p.rowHeight + p.rowGap))};display:flex;gap:12px;align-items:center">
        ${moveTypeWell(move.type, RUN_SHOP.typeWell.popup, `flex:none;opacity:${move.bond ? SHOP.card.dimmed : 1}`)}
        ${shopButton(move.bond ? `${move.name} (bond)` : move.name, 'Neutral', p.width - 2 * p.padding - 52, {
          focused: move.focused,
          disabled: move.bond,
          style: 'position:relative',
        })}</div>`
    ).join(''),
    bottom = 108 + RUN_SHOP_FORGET.length * (p.rowHeight + p.rowGap) + 8,
    popupHeight = bottom + SHOP.buttonHeight + p.padding;
  const popup = cleanBox(
    (w - p.width) / 2,
    (height - popupHeight) / 2,
    p.width,
    popupHeight,
    `${shopText('Replace which move?', 24, SHOP_COLOURS.text, place(p.padding, p.padding - 4))}
    ${shopText('Pikachu has four moves. Pick one to replace with Thunderbolt.', SHOP.text.line, SHOP_COLOURS.name,
      `${place(p.padding, p.padding + 36)};width:${px(p.width - 2 * p.padding)}`)}
    ${divider(p.padding, p.padding, 92)}
    ${rows}
    ${shopButton('Cancel', 'Neutral', p.width - 2 * p.padding, { style: place(p.padding, bottom) })}`
  );
  return `<div style="position:absolute;inset:0;background:${rgbaOf(greyTone('ink'), 0.6)};z-index:10"></div>
    <div style="position:absolute;inset:0;z-index:11">${popup}</div>`;
}

// ---------- the pages ----------
const runShopFact = (title, body) => `<dt>${title}</dt><dd>${body}</dd>`;
const RUN_SHOP_COMMON = `
  ${runShopFact('Frame', `${nameButton('panel.clean')}: the TR Mart ${RUN_SHOP.window.width} px wide like the Main Menu
    Shop’s window, the Move Trainer as wide as its team grid; the
    title in Michroma 24, the line under it Michroma 12 in teal.base, a divider under both. The Silver counter top right: the
    spinning silver coin and the count in ${nameButton('font.boldPixels')} 32 (the run screen’s counter)`)}
  ${runShopFact('Buttons', `${nameButton('button.glitch')}: Reroll (Positive, its free count in the label) and
    Leave (Neutral), at the bottom right. A Silver buy asks nothing (Jess 2026-11-20); a full roster opens
    ${nameButton('run.hud.forgetMove')}`)}
  ${runShopFact('Layout', `What you choose from comes first, the answer after it: the Move Trainer stacks them
    (Jess 2026-11-21), the TR Mart mirrors them left and right (Jess 2026-11-20). Plan: docs/ASCII Concept
    Maps/155 - Run Shops Layout.md`)}`;
function moveMartSection() {
  return `<section class="lib-story" data-draft="run.hud.moveMart">
    <h3>${nameButton('run.hud.moveMart')} ${draftTag('composite: the Move Trainer (a board copy)')}</h3>
    <div class="lib-area-scroll">${runShopStage('run.hud.moveMart:default', moveMartWidth(), moveMartHeight(),
      moveMartWindow())}</div>
    <dl class="lib-facts">
      ${runShopFact('Pieces', `On top, the team of six as ${nameButton('run.hud.teamSlot')} rows,
        ${RUN_SHOP.trainer.columns} across: its ${nameButton('panel.pixel')} box in the first type (the two-type
        seam), 6 art rows taller so the ring and the chips clear the rim, the ${nameButton('portrait.round')} and the
        name in ${nameButton('font.silver')}; the HP bar, key, held item, status chip and swap shade dropped, the
        Pokemon’s ${nameButton('chip.type')} chips (1 px scale) under the name. The chosen one is selected with
        ${nameButton('cursor.ring')}. Below, its four offered moves as ${nameButton('card.vertical')} on
        ${nameButton('panel.shopCard')} (the Team Items card, ${SHOP.itemCard.width} x ${SHOP.itemCard.height} px): the
        move’s type glyph in its circle (the move slot’s well), its name, its generated line and its Silver price
        where the button was. No Buy button: picking the card is the buy`)}
      ${RUN_SHOP_COMMON}
    </dl></section>`;
}
function trMartSection() {
  return `<section class="lib-story" data-draft="run.hud.trMart">
    <h3>${nameButton('run.hud.trMart')} ${draftTag('composite: the TR Mart (a board copy)')}</h3>
    <div class="lib-area-scroll">${runShopStage('run.hud.trMart:default', RUN_SHOP.window.width,
      RUN_SHOP.window.martHeight, trMartWindow())}</div>
    <dl class="lib-facts">
      ${runShopFact('Pieces', `Left, four TRs as ${nameButton('card.vertical')} on ${nameButton('panel.shopCard')} (the Team Items
        card, ${SHOP.itemCard.width} x ${SHOP.itemCard.height} px, a placeholder TM disc), the first picked: its Neutral Pick button
        shows its own focus. Right, the team as ${nameButton('portrait.round')} at ${RUN_SHOP.mart.roster.portrait} px on a
        ${nameButton('panel.clean')} with the cards’ body, each with its name and a status under it`)}
      ${runShopFact('Status', `${RUN_SHOP_STATUS.learn.symbol} can learn it (a Pokemon with four loose moves too: the buy opens the
        forget popup); ${RUN_SHOP_STATUS.knows.symbol} already knows it; ${RUN_SHOP_STATUS.full.symbol} every slot is a bond;
        nothing: it cannot learn it. The last three are dimmed and refuse with a toast on Enter or a click, never when the cursor
        only moves onto them. The symbols are game Silver’s stand-ins until Jess’s icons (it has no check or cross)`)}
      ${runShopFact('Price', `Shown on the card’s button (Pick 40), since the buy happens when a Pokemon is picked. A design
        call for Jess: the other option is a coin and number line above the button`)}
      ${RUN_SHOP_COMMON}
    </dl></section>`;
}
function forgetMoveSection() {
  return `<section class="lib-story" data-draft="run.hud.forgetMove">
    <h3>${nameButton('run.hud.forgetMove')} ${draftTag('popup: choose the move to replace (a board copy)')}</h3>
    <div class="lib-area-scroll">${runShopStage('run.hud.forgetMove:default', moveMartWidth(), moveMartHeight(),
      `${moveMartWindow()}${forgetMovePopup()}`)}</div>
    <dl class="lib-facts">
      ${runShopFact('Pieces', `${nameButton('panel.clean')} over the shop, the screen under it dimmed (ink at 60%) as the catch
        screen’s ask. Its title in Michroma 24 and a teal.base line; the Pokemon’s four moves as Neutral
        ${nameButton('button.glitch')} rows with the move’s type glyph, the first focused; a bonded move is disabled and
        marked (bond); Cancel below`)}
      ${runShopFact('Next', `Choosing a move opens the Modal page’s Negative ask, “Replace X with Y?”: Replace (red) and Go
        Back (teal), opening on Go Back. Decision 2026-11-20-155-move-shop-replace-a-move-asks-replace-or-go-back`)}
      ${runShopFact('Opens when', `A buy into a full roster. A free slot learns the move at once, with no popup and no ask`)}
    </dl></section>`;
}
const runShopTabs = (note, draw) => [{ id: 'unified', title: 'Rough draft', note, draw }];
const RUN_SHOP_NOTE = 'NOT APPROVED (Jess 2026-11-20): a first pass from the Main Menu Shop’s pieces, laid out mirrored.';
const MOVE_MART_NOTE = 'APPROVED (Jess 2026-11-21): decision 2026-11-21-155-run-hud-move-mart-look.';
const moveMartPage = (tab) => tabbedPage('run.hud.moveMart', runShopTabs(MOVE_MART_NOTE, moveMartSection), tab);
const trMartPage = (tab) => tabbedPage('run.hud.trMart', runShopTabs(RUN_SHOP_NOTE, trMartSection), tab);
const forgetMovePage = (tab) => tabbedPage('run.hud.forgetMove', runShopTabs(RUN_SHOP_NOTE, forgetMoveSection), tab);
