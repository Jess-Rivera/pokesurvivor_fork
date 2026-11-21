// tools/library/hud-team-items-draft.js: the composite run.hud.teamItems, the lower right of the run screen: the team
// items pocket with the berry pocket stacked above it (Jess 2026-11-20). Both are bags, so both take the berry
// pocket's set up: panel.pixel in the pocket's ramp holding its bought slots as wells two to a row (teamPocket,
// hud-team-slot-draft.js). The team items pocket sits in the corner at today's run item column's place; the berry
// pocket moved here from above the roster to balance the run screen. Today's game: js/ui/hud-run-items-panel.js (one
// B2 box per slot with the name and the live tracker) and js/ui/hud-roster-panel.js (the berries). A plain script
// sharing the board's globals; it loads after hud-team-slot-draft.js and shop-draft.js (pocketRamp). A board copy:
// nothing here reads the game.
'use strict';
// ---------- places: px from the screen's bottom right ----------
const TEAM_ITEMS = {
  corner: { right: 24, bottom: 42 }, // today's run item column (hud-run-items-panel.js BOX)
  bagGap: 12, // the berry pocket above the team items pocket (its old gap above the roster)
  stage: { width: 520, top: 24 }, // the board's slice of the screen: room above the bags
};
// a bought slot holding an item is { at } (its cell in the item sheet, from js/data/pokesprite-index.js); an empty
// one is {}
const TEAM_ITEM_STATES = [
  {
    id: 'four',
    title: 'Four team item slots bought (three held, one empty) and four berry slots',
    // Amulet Coin, Lucky Egg, Snowball Badge, an empty slot
    items: [{ at: '-102px -136px' }, { at: '-1666px -136px' }, { at: '-748px -170px' }, {}],
    berries: TEAM_SLOT_BERRIES,
  },
  {
    id: 'two',
    title: 'Early on: two team item slots (one held) and two berry slots (one held)',
    items: [{ at: '-102px -136px' }, {}],
    berries: [TEAM_SLOT_BERRIES[0], {}],
  },
];
/** The lower right of the run screen at 1x: the team items pocket in the corner, the berry pocket stacked above it,
 *  both right-aligned (Jess 2026-11-20). */
function teamItemsArea(state) {
  const { corner, bagGap, stage } = TEAM_ITEMS,
    items = teamPocket(0, 0, state.items, pocketRamp('color.pocketItems')),
    berries = teamPocket(0, 0, state.berries),
    berriesBottom = corner.bottom + items.height + bagGap,
    height = berriesBottom + berries.height + stage.top,
    placed = (pocket, bottom) =>
      `<div class="lib-area-piece" style="left:${stage.width - corner.right - pocket.width}px;bottom:${bottom}px;
        width:${pocket.width}px;
        height:${pocket.height}px">${pocket.html}</div>`;
  return `<div class="lib-area" data-state="run.hud.teamItems:${state.id}" style="width:${stage.width}px;
    height:${height}px;background:${AREA_COLOURS.stage}">
    ${placed(items, corner.bottom)}${placed(berries, berriesBottom)}</div>`;
}
function teamItemsSection() {
  const states = TEAM_ITEM_STATES.map(
    (state) => `<h4>${esc(state.title)}</h4><div class="lib-area-scroll">${teamItemsArea(state)}</div>`
  ).join('');
  return `<section class="lib-story" data-draft="run.hud.teamItems">
    <h3>${nameButton('run.hud.teamItems')} ${draftTag('composite: the lower right, both bags (a board copy)')}</h3>
    ${states}
    <dl class="lib-facts">
      <dt>Pieces</dt><dd>Two bags, the berry pocket\u2019s set up (Jess 2026-11-20: a bag is a bag). The team items
        pocket: ${nameButton('panel.pixel.rest')} in ${nameButton('color.pocketItems')}, in the corner. The berry
        pocket: the same in ${nameButton('color.pocketBerries')}, stacked above it, ${TEAM_ITEMS.bagGap} px apart,
        both right-aligned. In each,
        only the bought slots, ${TEAM_SLOT.berries.wellSize} px wells two to a row ${TEAM_SLOT.berries.wellGap} px apart
        (grey.panel inside; an ink ring when empty, the pocket\u2019s base when it holds something), the 32 px icon
        at 1x, no names</dd>
      <dt>Places</dt><dd>The team items pocket at today\u2019s run item column: ${TEAM_ITEMS.corner.right} px from the
        right, ${TEAM_ITEMS.corner.bottom} px up. The berry pocket moved here from 12 px above the roster, to balance
        the run screen (the roster alone on the lower left)</dd>
      <dt>Game today</dt><dd>One B2 box per team item slot (js/ui/hud-run-items-panel.js): the item\u2019s name, its
        icon on a white patch and its live tracker or short description. The HUD drops all three; they live in the
        pause screen only, whose run item tooltip gains the live tracker at #126</dd>
      <dt>Decision</dt><dd>2026-11-20-155-team-items-and-berries-stacked-pixel-pockets-lower-right</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/hud-team-items-draft.js; the bag itself in
        hud-team-slot-draft.js (teamPocket); changing one changes only the board</dd>
    </dl></section>`;
}
const TEAM_ITEMS_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note: 'APPROVED (Jess 2026-11-21): decision 2026-11-20-155-team-items-and-berries-stacked-pixel-pockets-lower-right.',
    draw: teamItemsSection,
  },
];
const teamItemsPage = (tab) => tabbedPage('run.hud.teamItems', TEAM_ITEMS_TABS, tab);
