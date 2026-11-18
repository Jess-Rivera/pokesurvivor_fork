/* ============ square.story.js: the board's stories for the item squares (G.Lib.SquareStories; 155c-2) ============
 * Placeholder data only: what tools/library.html draws on Primitives, Squares. The board has no icon code, so a picture
 * is a placeholder disc. The game never loads this file. Place names follow screen.panel.part.
 */
G.Lib = G.Lib || {};
G.Lib.SquareStories = (() => {
  const square = G.Lib.Square;
  if (!square || !square.ready) return [];
  const html = window.htm.bind(window.preact.h);
  const picture = () => html`<div class="hud-item-icon lib-square-picture"></div>`;
  const POCKET_ART_SIZE = 20, // the pause menu's Run Inventory squares (40 px)
    OWNED_ART_SIZE = 30; // the Shop's owned team items (60 px)
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
    job:
      'The B2 bag button: a square with chamfered corners, a rim and the checker body, with the item in its centre. ' +
      'The Lv yellow rim when it holds something, slate when empty.',
    files: 'js/ui/lib/primitives/square/square.js, square.css',
    tokens: ['color.hud.outline', 'color.hud.lvFill', 'color.hud.slate', 'color.hud.checker', 'color.hud.body'],
    size: 'artSize 2 px art pixels square (20 is 40 px, the pockets; the run HUD and the Shop size it); 32 px picture',
    places: ['run.hud.heldItem', 'run.hud.berryBag', 'pause.inventory.berrySlot', 'pause.pokemonDetail.heldItem'],
    states: [
      {
        id: 'filled',
        title: 'Filled (holds an item)',
        props: { artSize: POCKET_ART_SIZE, filled: true, picture: picture() },
      },
      { id: 'empty', title: 'Empty', props: { artSize: POCKET_ART_SIZE, filled: false } },
    ],
  };

  const grid = {
    name: 'grid.item',
    component: 'ItemGrid',
    stageClass: 'lib-stage-square',
    job:
      'Item squares in a grid, half a square apart, filling row by row. A slot not bought yet is locked (dimmed). ' +
      'The screen adds each slot its tooltip and its handlers.',
    files: 'js/ui/lib/primitives/square/square.js, square.css',
    tokens: ['color.hud.lvFill', 'color.hud.slate'],
    size: 'columns x artSize; two across in the pockets, four in the Shop',
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
        id: 'twoColumns',
        title: 'Two across: filled, empty, locked (a pocket)',
        props: {
          artSize: POCKET_ART_SIZE,
          slots: [slot(1, 'filled'), slot(2, 'filled'), slot(3, 'empty'), slot(4, 'locked')],
        },
      },
      {
        id: 'fourColumns',
        title: "Four across (the Shop's owned team items)",
        props: {
          artSize: OWNED_ART_SIZE,
          columns: 4,
          slots: ['filled', 'filled', 'filled', 'empty', 'empty', 'empty', 'empty', 'empty'].map((kind, index) =>
            slot(index, kind)
          ),
        },
      },
    ],
  };

  return [item, grid];
})();
