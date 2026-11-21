// tools/library/bond-draft.js: run.hud.bondSelection, the popup that spends a gym win's bond (today js/ui/run-ui.js
// showBond, the scr-bond screen). Jess 2026-11-21: a title and its line, a divider, the team of six with cursor.ring;
// once a Pokemon is picked the ring jumps to its four move slots (run.hud.forgetMove's slots and wide card) and the
// other five dim. A bond cannot be undone, so the last pick asks "Bond move?" (Bond, Cancel). Drawn on its move step,
// the case of a first gym win (two loose moves join); the Add case (one move joins a bond) is in the facts. A board
// copy built from the run shops' pieces (run-shops-draft.js) and the Modal page's dialog: nothing here reads the game.
// A plain script sharing the board's globals; it loads after run-shops-draft.js.
'use strict';
// ---------- looks: brightness ----------
// B1 to B7 (Jess 2026-11-21, docs/ASCII Concept Maps/155 - Bond Selection Layout.md). A row or slot you can still
// pick dims to the HUD's inactive brightness; one that cannot bond is darker, as run.hud.forgetMove's disabled bond.
const BOND_LOOK = {
  lit: 1,
  dimmed: AREA.inactiveBrightness,
  disabled: RUN_SHOP.popup.slot.disabledBrightness,
};
// each team row on the move step: the chosen Pokemon lit, the others dimmed, a member with no option (its slots are
// all bonds or skills) disabled
const BOND_TEAM_LOOKS = ['lit', 'dimmed', 'dimmed', 'dimmed', 'dimmed', 'disabled'];
// Pikachu's four loose moves (a first gym win: two join a new bond). pick marks the first move picked (it keeps a
// bond-pink ring, B2) and the move under cursor.ring, the one the wide card describes
const BOND_SLOTS = [
  {
    key: 'I',
    pick: 'first',
    moves: [{ name: 'Quick Attack', type: 'normal', family: 'melee' }],
  },
  {
    key: 'J',
    pick: 'ring',
    moves: [{ name: 'Thunder Shock', type: 'electric', family: 'projectile' }],
  },
  { key: 'K', moves: [{ name: 'Iron Tail', type: 'steel', family: 'melee' }] },
  { key: 'L', moves: [{ name: 'Surf', type: 'water', family: 'nova' }] },
];
const BOND_TEXT = {
  title: 'Bond moves',
  line: 'Pick a Pokemon, then the moves that will cast together. A bond is permanent.',
  card: 'Casts together with Quick Attack.',
};
// the ask (B1): Bond is a gain, so Positive; it cannot be undone, so it opens on Cancel (Neutral)
const BOND_ASK = {
  intent: 'Positive',
  title: 'Bond move?',
  message: 'Quick Attack and Thunder Shock will cast together.',
  note: 'A bond is permanent.',
  confirm: 'Bond',
  cancel: 'Cancel',
  opensOn: 1,
};

// ---------- the popup: size ----------
// the four slots in one row (Jess 2026-11-21), the HUD's column gap between them: 4 x 210 + 3 x 6 = 858 px, the
// window's width inside its insets, so the row spans the team grid edge to edge
const bondRowWidth = () => 4 * slotWidth() + 3 * AREA.slots.columnGap;
const bondSlotsTop = () => RUN_SHOP.contentTop + runShopTeamHeight() + RUN_SHOP.stack.sectionGap;
const bondCardTop = () => bondSlotsTop() + forgetSlotHeight() + RUN_SHOP.popup.gap;
const bondBackTop = () => bondCardTop() + RUN_SHOP.popup.card.height + RUN_SHOP.popup.gap;
const bondHeight = () => bondBackTop() + SHOP.buttonHeight + RUN_SHOP.inset;

// ---------- the move slots ----------
/** A first pick's ring: cursor.ring in the bond pink, so it stays while the yellow ring moves on (B2). */
const bondFirstRing = (left, top, size) =>
  `<div class="lib-cursor-host" style="${place(left, top)};width:${px(size)};height:${px(size)};${cursorStyle()};
    --cursor-colour:${pinkRamp('base')}">${staticRing()}</div>`;
/** One slot, as run.hud.forgetMove's (taller, no key): lit when it is picked or under the ring, dimmed otherwise. */
function bondSlot(slot, id, left, top) {
  const look = RUN_SHOP.popup.slot,
    rim = slot.moves.length > 1 ? 'bond' : typeRamp(slot.moves[0].type),
    wells = Array.from({ length: AREA.wells.perSlot }, (_, well) => areaWell(slot.moves[well], well)).join(''),
    brightness = slot.pick ? BOND_LOOK.lit : BOND_LOOK.dimmed;
  return `<div class="lib-area-piece" style="${place(left, top)};width:${px(slotWidth())};
    height:${px(forgetSlotHeight())};filter:brightness(${brightness})">
    ${slantedSvg({ id, rim, grid: true, artRows: look.artRows })}
    <div style="${place(0, look.wellTop - AREA.wells.top)};width:100%;height:${px(slotHeight())}">${wells}</div></div>`;
}
/** The four slots in one row, centred under the team: the yellow ring on the move under the cursor, the pink one on
 *  the first pick. stageId keeps the slots' pattern ids apart when the page draws the popup twice. */
function bondSlots(stageId) {
  const size = AREA.wells.size,
    left = (runShopWidth() - bondRowWidth()) / 2,
    y = bondSlotsTop();
  return BOND_SLOTS.map((slot, index) => {
    const x = left + index * (slotWidth() + AREA.slots.columnGap),
      ringLeft = x + AREA.wells.first - size / 2,
      ringTop = y + RUN_SHOP.popup.slot.wellTop,
      rings = {
        ring: () => withRing(ringLeft, ringTop, size, ''),
        first: () => bondFirstRing(ringLeft, ringTop, size),
      };
    return bondSlot(slot, `bond-${stageId}-${index}`, x, y) + (slot.pick ? rings[slot.pick]() : '');
  }).join('');
}

// ---------- the popup ----------
function bondPopup(stageId) {
  const width = runShopWidth(),
    inset = RUN_SHOP.inset,
    header = RUN_SHOP.header,
    backWidth = RUN_SHOP.buttons.leave, // the shops' Leave size, as run.hud.forgetMove's Cancel
    ringed = BOND_SLOTS.find((slot) => slot.pick === 'ring').moves[0],
    card = { move: ringed, line: BOND_TEXT.card, width: bondRowWidth() };
  return cleanBox(
    0,
    0,
    width,
    bondHeight(),
    `${shopText(BOND_TEXT.title, 24, SHOP_COLOURS.text, place(inset, header.titleTop))}
    ${shopText(BOND_TEXT.line, SHOP.text.line, SHOP_COLOURS.name, place(inset, header.lineTop))}
    ${divider(inset, inset, header.dividerTop)}
    ${runShopTeam(RUN_SHOP.contentTop, (index) => ({ brightness: BOND_LOOK[BOND_TEAM_LOOKS[index]] }))}
    ${bondSlots(stageId)}
    ${forgetCard((width - bondRowWidth()) / 2, bondCardTop(), card)}
    ${shopButton('Back', 'Neutral', backWidth, { style: place(width - inset - backWidth, bondBackTop()) })}`
  );
}
/** The ask over the popup, the popup dimmed under it (ink at 60%, as the catch screen's ask). */
const bondAsk = () =>
  `<div style="position:absolute;inset:0;background:${rgbaOf(greyTone('ink'), 0.6)};z-index:10"></div>
    <div style="position:absolute;inset:0;z-index:11;display:flex;align-items:center;justify-content:center">
    ${modalHtml(BOND_ASK)}</div>`;

// ---------- the page ----------
const bondFact = (title, body) => `<dt>${title}</dt><dd>${body}</dd>`;
function bondSelectionSection() {
  const width = runShopWidth(),
    height = bondHeight();
  return `<section class="lib-story" data-draft="run.hud.bondSelection">
    <h3>${nameButton('run.hud.bondSelection')} ${draftTag('popup: spend a gym win\u2019s bond (a board copy)')}</h3>
    <h4>The move step: Pikachu picked, Quick Attack picked first, the ring on Thunder Shock</h4>
    <div class="lib-area-scroll">${runShopStage('run.hud.bondSelection:default', width, height,
      bondPopup('step'))}</div>
    <h4>The last pick asks</h4>
    <div class="lib-area-scroll">${runShopStage('run.hud.bondSelection:ask', width, height,
      `${bondPopup('ask')}${bondAsk()}`)}</div>
    <dl class="lib-facts">
      ${bondFact('Opens when', `The gym leader is beaten and the team holds a bond, over the arena with the screen
        dimmed (ink at 60%). A bond belongs to the team: any living member that can bond may take it. With only one, the
        team step is skipped and the popup opens on its moves`)}
      ${bondFact('Pieces', `${nameButton('panel.clean')} as wide as the run shops, the title in Michroma 24, its line in
        teal.base, a divider. The team of six as ${nameButton('run.hud.moveMart')}\u2019s rows with
        ${nameButton('cursor.ring')} on the face. Once a Pokemon is picked the ring jumps to its four slots, drawn as
        ${nameButton('run.hud.forgetMove')}\u2019s but in one row (the team grid\u2019s width), and the other rows
        dim to ${BOND_LOOK.dimmed * 100}%; a member that cannot bond (every slot a bond or a skill) is darker
        (${BOND_LOOK.disabled * 100}%) and the ring skips it. Under the slots the ${nameButton('panel.shopCard')}, as
        wide as the row, on the ringed move says what it will cast with. Back (Neutral) at the bottom right, the
        shops\u2019 Leave size`)}
      ${bondFact('Two picks', `No bond yet (a first gym win): two loose moves join a new slot. The first pick keeps a
        bond-pink ${nameButton('cursor.ring')} while the yellow one moves to the second. The picked and ringed slots
        are lit, the rest dimmed. A skill never bonds, so its slot is disabled`)}
      ${bondFact('Adding', `A bond of 2 or 3 moves already: one loose move joins it (4 at most). The bond is lit as the
        target in its pink rim but cannot be picked; the ring moves over the loose moves only`)}
      ${bondFact('Ask', `The last pick opens the Modal page\u2019s dialog: \u201cBond move?\u201d with Bond (Positive, a
        gain) and Cancel (Neutral), opening on Cancel since a bond cannot be undone. Cancel returns to the slots`)}
      ${bondFact('Back', `Returns to the team (and clears a first pick); hidden when the team step was skipped.
        There is no way to leave without bonding, as today`)}
    </dl></section>`;
}
const BOND_NOTE = 'APPROVED (Jess 2026-11-21): decision 2026-11-21-155-run-hud-bond-selection-look.';
const bondSelectionPage = (tab) =>
  tabbedPage('run.hud.bondSelection', [{ id: 'unified', title: 'Rough draft', note: BOND_NOTE,
    draw: bondSelectionSection }], tab);
