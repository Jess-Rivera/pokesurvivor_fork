// tools/library/run-shops-draft.js: run.hud.moveMart (the Move Trainer), run.hud.trMart (the TR Mart) and run.hud.forgetMove
// (the popup that picks the move to replace), the run's two walk-in shops (today js/ui/shop-ui.js, css/style.css mshop-).
// Mirrored (Jess 2026-11-20): what you choose from on the left, the answer on the right. Move Trainer: the team on the left
// (the chosen Pokemon selected), its four offered moves on the right. TR Mart: four TRs on the left (the picked one under
// the cursor), the team on the right with a status on each Pokemon. Silver buys do not ask; a full roster opens
// run.hud.forgetMove, then the Modal page's Replace ask. Drawn once each, in the default state: dimmed, refused and
// disabled looks belong to the pieces inside. Board copies built from the Main Menu Shop's pieces (shop-draft.js): nothing
// here reads the game. A plain script sharing the board's globals; it loads after catch-draft.js.
'use strict';
// ---------- places: px ----------
const RUN_SHOP = {
  stagePad: 24,
  window: { width: 1145, trainerHeight: 470, martHeight: 640 }, // the Main Menu Shop's width
  inset: 24,
  header: { titleTop: 18, lineTop: 50, dividerTop: 76 },
  contentTop: 92,
  card: { width: 180, buttonWidth: 156 }, // a 4-wide row of cards (the Move Trainer)
  cardGap: 12,
  teamPanel: { width: 300, height: 316 }, // the Move Trainer's team, as main.shop.tms's Pokemon panel
  chosen: { size: 88, top: 44, nameTop: 12 },
  team: { size: 52, gap: 10, columns: 3, top: 160 },
  silver: { coin: 32, gap: 8, top: 14 },
  mart: { roster: { portrait: 72, columns: 3, columnGap: 64, rowGap: 56, nameSize: 16, symbolSize: 28 } },
  buttons: { reroll: 220, leave: 156, gap: 16 },
  popup: { width: 460, padding: 28, rowHeight: 54, rowGap: 12 },
};
// today's sample: Pikachu's roster, four offers and four TRs (art cells from js/data/pokesprite-index.js, as main.shop.tms)
const RUN_SHOP_TEAM = [
  { dex: 25, name: 'Pikachu' },
  { dex: 4, name: 'Charmander' },
  { dex: 7, name: 'Squirtle' },
  { dex: 1, name: 'Bulbasaur' },
  { dex: 94, name: 'Gengar' },
  { dex: 130, name: 'Gyarados' },
];
const RUN_SHOP_MOVES = [
  { name: 'Thunderbolt', type: 'electric', label: 'Buy 40', desc: 'Chains between foes: damage, 10% paralysis, hops to more foes.' },
  { name: 'Flamethrower', type: 'fire', label: 'Buy 40', desc: 'Cone: damage, 10% burn.' },
  { name: 'Ice Beam', type: 'ice', label: 'Buy 40', desc: 'Beam: damage, 10% freeze, foe Speed -1.' },
  { name: 'Earthquake', type: 'ground', label: 'Buy 60', desc: 'Burst around you: damage.' },
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
function runShopWindow(title, line, height, inner) {
  const w = RUN_SHOP.window.width,
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
const runShopButtons = (height) => {
  const b = RUN_SHOP.buttons,
    w = RUN_SHOP.window.width,
    top = height - RUN_SHOP.inset - SHOP.buttonHeight,
    leaveLeft = w - RUN_SHOP.inset - b.leave,
    rerollLeft = leaveLeft - b.gap - b.reroll;
  return `${shopButton('Reroll (1)', 'Neutral', b.reroll, { style: place(rerollLeft, top) })}
    ${shopButton('Leave', 'Neutral', b.leave, { style: place(leaveLeft, top) })}`;
};
const runShopStage = (state, width, height, inner, extra = '') =>
  `<div class="lib-area" data-state="${state}" style="width:${px(width + 2 * RUN_SHOP.stagePad)};
    height:${px(height + 2 * RUN_SHOP.stagePad)};background:${AREA_COLOURS.stage}">
    <div style="${place(RUN_SHOP.stagePad, RUN_SHOP.stagePad)};width:${px(width)};height:${px(height)}">${inner}</div>${extra}</div>`;
const runShopFace = (dex, size, state = {}) => face(dex, size, state);

// ---------- run.hud.moveMart: the team left, the chosen Pokemon's four offers right ----------
function moveMartTeamPanel() {
  const p = RUN_SHOP.teamPanel,
    c = RUN_SHOP.chosen,
    t = RUN_SHOP.team,
    inset = RUN_SHOP.inset - 10,
    chosenLeft = (p.width - c.size) / 2,
    gridWidth = t.columns * t.size + (t.columns - 1) * t.gap,
    cells = RUN_SHOP_TEAM.map((member, index) => {
      const left = (p.width - gridWidth) / 2 + (index % t.columns) * (t.size + t.gap),
        top = t.top + Math.floor(index / t.columns) * (t.size + t.gap),
        piece = runShopFace(member.dex, t.size, { selected: index === 0 });
      return index === 0 ? withRing(left, top, t.size, piece) : `<div style="${place(left, top)}">${piece}</div>`;
    }).join('');
  const inner = `${shopText(RUN_SHOP_TEAM[0].name, SHOP.text.pokemonName, SHOP_COLOURS.text,
      `${place(inset, c.nameTop)};width:${px(p.width - 2 * inset)};text-align:center`, SHOP.fonts.pokemon)}
    <div style="${place(chosenLeft, c.top + 28)}">${runShopFace(RUN_SHOP_TEAM[0].dex, c.size, { selected: true })}</div>
    ${cells}`;
  return cleanBox(RUN_SHOP.inset, RUN_SHOP.contentTop, p.width, p.height + 40, inner, { body: SHOP_CARD_PANEL.body });
}
const moveMartCards = () => {
  const card = { ...SHOP.itemCard, ...RUN_SHOP.card },
    left = RUN_SHOP.inset + RUN_SHOP.teamPanel.width + RUN_SHOP.inset;
  return RUN_SHOP_MOVES.map((move, index) =>
    `<div style="${place(left + index * (card.width + RUN_SHOP.cardGap), RUN_SHOP.contentTop)}">${shopCard({
      picture: `<img src="${typeGlyph(move.type)}" alt="" style="width:64px;height:64px;image-rendering:pixelated" />`,
      name: move.name,
      description: move.desc,
      card,
      button: shopButton(move.label, 'Positive', card.buttonWidth, {
        height: card.buttonHeight,
        fontSize: card.buttonFont,
      }),
    })}</div>`
  ).join('');
};
function moveMartWindow() {
  const height = RUN_SHOP.window.trainerHeight;
  return runShopWindow('Move Trainer', 'Pick a Pokemon, then a move to learn.', height,
    `${moveMartTeamPanel()}${moveMartCards()}${runShopButtons(height)}`);
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
    w = RUN_SHOP.window.width,
    height = RUN_SHOP.window.trainerHeight,
    rows = RUN_SHOP_FORGET.map((move, index) =>
      `<div style="${place(p.padding, 108 + index * (p.rowHeight + p.rowGap))};display:flex;gap:12px;align-items:center">
        <img src="${typeGlyph(move.type)}" alt="" style="width:40px;height:40px;image-rendering:pixelated;
          opacity:${move.bond ? SHOP.card.dimmed : 1}" />
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
  ${runShopFact('Frame', `${nameButton('panel.clean')}, ${RUN_SHOP.window.width} px wide like the Main Menu Shop’s window; the
    title in Michroma 24, the line under it Michroma 12 in teal.base, a divider under both. The Silver counter top right: the
    spinning silver coin and the count in ${nameButton('font.boldPixels')} 32 (the run screen’s counter)`)}
  ${runShopFact('Buttons', `${nameButton('button.glitch')}: Reroll (its free count in the label) and Leave, Neutral, at the
    bottom right. A Silver buy asks nothing (Jess 2026-11-20); a full roster opens ${nameButton('run.hud.forgetMove')}`)}
  ${runShopFact('Mirrored', `What you choose from sits left, the answer sits right (Jess 2026-11-20). Plan:
    docs/ASCII Concept Maps/155 - Run Shops Layout.md`)}`;
function moveMartSection() {
  return `<section class="lib-story" data-draft="run.hud.moveMart">
    <h3>${nameButton('run.hud.moveMart')} ${draftTag('composite: the Move Trainer (a board copy)')}</h3>
    <div class="lib-area-scroll">${runShopStage('run.hud.moveMart:default', RUN_SHOP.window.width,
      RUN_SHOP.window.trainerHeight, moveMartWindow())}</div>
    <dl class="lib-facts">
      ${runShopFact('Pieces', `Left, the team as main.shop.tms’s Pokemon panel: ${nameButton('panel.clean')} with the cards’
        grey.raised body, the chosen Pokemon ${nameButton('portrait.round.selected')} at ${RUN_SHOP.chosen.size} px with its name in
        ${nameButton('font.silver')}, the team of six at ${RUN_SHOP.team.size} px with ${nameButton('cursor.ring')} on the chosen
        one. Right, its four offered moves as ${nameButton('card.vertical')} on ${nameButton('panel.shopCard')}, ${RUN_SHOP.card.width}
        px wide: the move’s type glyph, its name, its generated line and a Positive Buy with its Silver price`)}
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
    <div class="lib-area-scroll">${runShopStage('run.hud.forgetMove:default', RUN_SHOP.window.width,
      RUN_SHOP.window.trainerHeight, `${moveMartWindow()}${forgetMovePopup()}`)}</div>
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
const moveMartPage = (tab) => tabbedPage('run.hud.moveMart', runShopTabs(RUN_SHOP_NOTE, moveMartSection), tab);
const trMartPage = (tab) => tabbedPage('run.hud.trMart', runShopTabs(RUN_SHOP_NOTE, trMartSection), tab);
const forgetMovePage = (tab) => tabbedPage('run.hud.forgetMove', runShopTabs(RUN_SHOP_NOTE, forgetMoveSection), tab);
