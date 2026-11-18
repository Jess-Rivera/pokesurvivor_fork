/* ============ square.story.js: the board's stories for the item squares (G.Lib.SquareStories; #155) ============
 * Placeholder pictures only (the board has no icon code): what tools/library.html draws on Primitives, Squares. The
 * game never loads this file. Each piece shows its states as tiles and its props in a table (decision
 * 2026-11-18-155-primitive-states-vs-props).
 */
G.Lib = G.Lib || {};
G.Lib.SquareStories = (() => {
  const square = G.Lib.Square;
  if (!square || !square.ready) return [];
  const html = window.htm.bind(window.preact.h);
  const picture = () => html`<div class="hud-item-icon lib-square-picture"></div>`;
  const POCKET_ART_SIZE = 20; // the pause menu's Run Inventory squares (40 px)
  const slot = (key, kind) => ({
    key,
    filled: kind === 'filled',
    picture: kind === 'filled' ? picture() : null,
    locked: kind === 'locked',
  });

  const item = {
    name: 'square.item',
    component: 'ItemSquare',
    stageClass: 'lib-stage-square',
    job: 'The B2 bag button: a square with chamfered corners, a rim and the checker body, with the item in its centre.',
    files: 'js/ui/lib/primitives/square/square.js, square.css',
    tokens: ['color.hud.outline', 'color.hud.lvFill', 'color.hud.slate', 'color.hud.checker', 'color.hud.body'],
    size: 'artSize 2 px art pixels square; a 32 px picture',
    places: ['run.hud.heldItem', 'run.hud.berryBag', 'pause.inventory.berrySlot', 'pause.pokemonDetail.heldItem'],
    states: [
      {
        id: 'filled',
        title: 'Filled (the Lv yellow rim)',
        props: { artSize: POCKET_ART_SIZE, filled: true, picture: picture() },
      },
      { id: 'empty', title: 'Empty (the slate rim)', props: { artSize: POCKET_ART_SIZE, filled: false } },
    ],
    props: [
      {
        name: 'artSize',
        values: '2 px art pixels',
        does: 'Its size: 20 (40 px) in the pockets; the run HUD and the Shop size it',
      },
      { name: 'picture', values: 'content', does: "The item's icon, 32 px in the centre" },
      { name: 'filled', values: 'true or false', does: 'Shows those states (above)' },
    ],
  };

  const grid = {
    name: 'grid.item',
    component: 'ItemGrid',
    stageClass: 'lib-stage-square',
    job:
      'Item squares in a grid, half a square apart, filling row by row. Each slot is filled, empty, or locked (not ' +
      'bought yet, dimmed). The screen adds each slot its tooltip and its handlers.',
    files: 'js/ui/lib/primitives/square/square.js, square.css',
    tokens: ['color.hud.lvFill', 'color.hud.slate'],
    size: 'columns x artSize',
    places: [
      'pause.inventory.berries',
      'pause.inventory.runItems',
      'pause.inventory.pocket',
      'main.shop.upgrades.pocketSlots',
      'main.shop.items.owned',
      'run.hud.berryBag',
    ],
    states: [
      {
        id: 'rest',
        title: 'At rest: filled, empty and locked slots',
        props: {
          artSize: POCKET_ART_SIZE,
          columns: 2,
          slots: [slot(1, 'filled'), slot(2, 'filled'), slot(3, 'empty'), slot(4, 'locked')],
        },
      },
    ],
    props: [
      {
        name: 'slots',
        values: '[{ key, filled, picture, locked, className, attrs, overlay }]',
        does: 'Each slot: what it holds, locked, the tooltip handlers and a cursor',
      },
      { name: 'artSize', values: '2 px art pixels (20 by default)', does: "Each square's size" },
      {
        name: 'columns',
        values: 'a count (2 by default)',
        does: "Squares per row: 2 in the pockets, 4 in the Shop's owned items",
      },
      { name: 'className', values: 'class', does: "The screen's class" },
    ],
  };

  return [item, grid];
})();
