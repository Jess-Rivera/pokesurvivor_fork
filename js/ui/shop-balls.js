/* ============ shop-balls.js: the Main Menu Shop's Pokeballs tab (G.ShopBallsPane; #149 149e) ============
 * Mockup: assets/excalidraw/Shop-Pokeballs.svg; plan and rulings (E1 to E5): docs/ASCII Concept Maps/149 - Shop Rework
 * Opening.md. Drawn into #shop-balls by js/ui/gacha-ui.js, which owns the window, the rail, Exit and the cursor.
 *   cards   a scrolling 3-column grid of the kit's item cards, one per ball in G.BALL_CATALOG: the ball (frame 9 of its
 *           strip, flipped, 2x), divider, name, line, one button. A ball a throw can use today (G.Catch.BALLS) is lit
 *           with Buy; the rest are dimmed with Unlock. No prices yet (E1, #137).
 *   belts   the catch screen's three belts of six slots, sized up: bought belts (save.belt.size, six slots each) in the
 *           Poke Balls pocket colours holding the save's balls, best tier first; the rest locked, each with a Buy and
 *           the mockup's temporary price under it.
 *   buys    every button takes the cursor and refuses with "Coming soon." (E3): buying balls and belts is #137's.
 */
G.ShopBallsPane = (() => {
  const kitOverlay = G.HudOverlay,
    windowKit = G.MenuWindowKit;
  if (!kitOverlay || !kitOverlay.ready || !windowKit.ready || !G.BALL_CATALOG) return { ready: false };
  const { html, Box, ScrollBox, BallSprite, FAINTED_RIM } = kitOverlay.kit;
  const { BUTTON, CARD, CURSOR_ROOM, SCROLL_COLOURS, px, CursorButton, ItemCard } = windowKit;

  // ---------- sizes and places (pane pixels; the pane is 1005 x 616, down to the bottom of Exit) ----------
  const PANE_HEIGHT = 616;
  // the cards: the Team Items sale grid's sizes (3 cards of CARD.width and the scroll bar), CURSOR_ROOM in from the
  // pane's top and left so the cursor's corners show whole
  const GRID = { columns: 3, width: 584 };
  GRID.height = PANE_HEIGHT - 2 * CURSOR_ROOM;
  // the ball on a card: frame 9 of its strip (the last frame before it opens; Jess 2026-11-17, E5), flipped, at 2x
  // (CARD.iconSize, 64 px)
  const CARD_BALL = { frame: 9, scale: 2 };
  // the belts: the catch screen's (js/ui/catch-ui.js SLOT and BELT) sized up, its ball drawn at 2x in a 68 px slot;
  // three belts 145 px apart so a Buy fits under each of belts 2 and 3, belt 3's Buy ending at the pane's right edge
  const SLOT = { size: 68, gap: 10, left: 14, top: 14, ballScale: 2 },
    BELT = { left: 596, step: 145, width: 96, count: 3, slots: 6 };
  BELT.height = 2 * SLOT.top + BELT.slots * SLOT.size + (BELT.slots - 1) * SLOT.gap; // 486
  const BELT_BUY = { artWidth: 47, gap: 12 }; // 141 px wide, under its belt
  BELT_BUY.width = BELT_BUY.artWidth * BUTTON.artPixel;
  // the mockup's temporary belt prices (Jess 2026-11-16), by belt number (belt 1 comes with every save); #137 owns them
  const BELT_PRICE = { 2: 10000, 3: 15000 };
  // the Poke Balls pocket colours (docs/UI-PALETTES.md "Bag"), the catch screen's bought belt
  const BELT_RIM = { light: '#DBB26E', base: '#C88820', dark: '#825815' };
  const COMING_SOON = 'Coming soon.'; // what every Buy says until #137 (E3)
  const BALL_ID = 'ball-', // cursor ids: a card's button, a belt's Buy
    BELT_ID = 'belt-';
  const fmt = (n) => n.toLocaleString('en-US');

  /** How many belts the save has bought: six slots each, belt 1 always. */
  function boughtBelts() {
    const save = G.DB.save;
    return Math.max(1, Math.floor(((save && save.belt && save.belt.size) || BELT.slots) / BELT.slots));
  }
  /** The belts not bought yet, by number (2 and 3 on a new save): each has a Buy under it. */
  function beltsForSale() {
    const numbers = [];
    for (let number = boughtBelts() + 1; number <= BELT.count; number++) numbers.push(number);
    return numbers;
  }
  /** What the cursor may reach on this tab, in reading order: every card's button, then the belt Buys. */
  function cursorItems() {
    return [...G.BALL_CATALOG.map((ball) => BALL_ID + ball.id), ...beltsForSale().map((number) => BELT_ID + number)];
  }

  /** Every bought slot's ball id or null, best tier first (the catch screen's order), across the bought belts. */
  function beltBalls() {
    const balls = [];
    for (const ball of [...G.Catch.BALLS].reverse())
      for (let count = G.Catch.count(ball.id); count > 0; count--) balls.push(ball.id);
    return Array.from({ length: boughtBelts() * BELT.slots }, (_, slot) => balls[slot] || null);
  }

  function BallCard({ cursor, ball }) {
    const usable = G.Catch.BALLS.some((entry) => entry.id === ball.id);
    return html`<${ItemCard}
      cursor=${cursor}
      item=${ball}
      buttonId=${BALL_ID + ball.id}
      buttonLabel=${usable ? 'Buy' : 'Unlock'}
      refusal=${COMING_SOON}
      onPress=${() => {}}
      area="balls"
      dimmed=${!usable}
      picture=${html`<${BallSprite} ball=${ball.id} frame=${CARD_BALL.frame} scale=${CARD_BALL.scale} flipped />`}
    />`;
  }

  function Belt({ number, balls }) {
    const locked = number > boughtBelts(),
      firstSlot = (number - 1) * BELT.slots;
    return html`<${Box}
      left=${BELT.left + (number - 1) * BELT.step}
      top=${CURSOR_ROOM}
      width=${BELT.width}
      height=${BELT.height}
      rim=${locked ? FAINTED_RIM : BELT_RIM}
      className=${'catch-belt shop-belt' + (locked ? ' is-locked' : '')}
    >
      ${Array.from({ length: BELT.slots }, (_, slot) => {
        const ball = locked ? null : balls[firstSlot + slot];
        return html`<div
          key=${slot}
          class=${'catch-slot' + (ball ? ' is-full' : '')}
          data-belt=${number}
          style=${{
            left: px(SLOT.left),
            top: px(SLOT.top + slot * (SLOT.size + SLOT.gap)),
            width: px(SLOT.size),
            height: px(SLOT.size),
          }}
        >
          ${ball ? html`<${BallSprite} ball=${ball} frame=${G.BALL_SPRITES.animations.front[0]} scale=${SLOT.ballScale} />` : null}
        </div>`;
      })}
    </${Box}>`;
  }

  /** The tab: cards on the left, the belts and their Buys on the right. openCount sends the cards back to the top. */
  function Pane({ cursor, openCount }) {
    if (!G.DB.save) return null;
    const balls = beltBalls();
    return html`<div class="shop-balls-pane">
      <div
        class="shop-ball-list"
        style=${{ left: px(CURSOR_ROOM), top: px(CURSOR_ROOM), width: px(GRID.width), height: px(GRID.height) }}
      >
        <${ScrollBox}
          box=${{ left: 0, top: 0, width: GRID.width, height: GRID.height }}
          trackRight=${0}
          colours=${SCROLL_COLOURS}
          resetOn=${[openCount]}
        >
          <div
            class="shop-sale-grid"
            style=${{
              gridTemplateColumns: `repeat(${GRID.columns}, ${px(CARD.width)})`,
              gap: px(CARD.gap),
              paddingBottom: px(CARD.gap), // space under the last row, so its cards show whole at the end
            }}
          >
            ${G.BALL_CATALOG.map((ball) => html`<${BallCard} key=${ball.id} cursor=${cursor} ball=${ball} />`)}
          </div>
        </${ScrollBox}>
      </div>
      ${Array.from({ length: BELT.count }, (_, index) => html`<${Belt} key=${index} number=${index + 1} balls=${balls} />`)}
      ${beltsForSale().map(
        (number) =>
          html`<${CursorButton}
            key=${number}
            cursor=${cursor}
            id=${BELT_ID + number}
            label=${'Buy ' + fmt(BELT_PRICE[number])}
            artWidth=${BELT_BUY.artWidth}
            refusal=${COMING_SOON}
            onPress=${() => {}}
            className="shop-belt-buy"
            area="belts"
            style=${{
              left: px(BELT.left + (number - 1) * BELT.step + (BELT.width - BELT_BUY.width) / 2),
              top: px(CURSOR_ROOM + BELT.height + BELT_BUY.gap),
            }}
          />`
      )}
    </div>`;
  }

  return { ready: true, Pane, cursorItems };
})();
