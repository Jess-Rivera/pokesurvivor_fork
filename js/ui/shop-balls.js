/* ============ shop-balls.js: the Main Menu Shop's Pokeballs tab (G.ShopBallsPane; #149 149e) ============
 * Mockup: assets/excalidraw/Shop-Pokeballs.svg; plan and rulings (E1 to E5): docs/ASCII Concept Maps/149 - Shop Rework
 * Opening.md. Drawn into #shop-balls by js/ui/gacha-ui.js, which owns the window, the rail, Exit and the cursor.
 *   cards   a scrolling 3-column grid of the kit's item cards, one per ball in G.BALL_CATALOG: the ball (frame 9 of its
 *           strip, flipped, 2x), divider, name, line, one button. An unlocked tier (G.Catch.isUnlocked) is lit
 *           with "Buy <price>"; a locked Great or Ultra is dimmed with "Unlock <price>"; the other balls are dimmed
 *           and refuse with "Coming soon.".
 *   belts   the catch screen's three belts of six slots, sized up: bought belts (G.Catch.beltsBought) in the Poke Balls
 *           pocket colours holding the save's balls, best tier first; the rest locked, the next one with a Buy and its
 *           price under it (belts are bought in order).
 *   buys    #137, every rule in G.Catch: a ball buy is instant (one ball; Shift, by click or key, buys up to 10); an
 *           unlock or a belt asks first (G.UI.ask) and a shift-click skips the question, as on the TMs tab. A Buy that
 *           cannot buy takes the cursor and refuses with its reason (#151). Prices: js/data/balls.js.
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
  const SHIFT_BUY_COUNT = 10; // balls one Shift press buys (B6)
  // the Poke Balls pocket colours (docs/UI-PALETTES.md "Bag"), the catch screen's bought belt
  const BELT_RIM = { light: '#DBB26E', base: '#C88820', dark: '#825815' };
  // what a button that cannot buy says when pressed (#151); "Unable to Afford" is the Shop's other tabs' line
  const REFUSALS = {
    soon: 'Coming soon.',
    poor: 'Unable to Afford',
    full: 'Your belts are full.',
    locked: 'Unlock it first.',
    done: 'Already bought.',
    none: 'You cannot buy that.',
  };
  const BALL_ID = 'ball-', // cursor ids: a card's button, the next belt's Buy
    BELT_ID = 'belt-';
  const fmt = (n) => n.toLocaleString('en-US');

  // Shift on the press: by click or by key it buys up to SHIFT_BUY_COUNT balls (B6, B12); only a shift-click skips an
  // unlock's or a belt's question (B9; as on the TMs tab, a key press never does)
  let shiftPress = false,
    shiftClick = false;
  addEventListener(
    'pointerdown',
    (event) => {
      shiftPress = shiftClick = event.shiftKey;
    },
    true
  );
  addEventListener(
    'keydown',
    (event) => {
      shiftPress = event.shiftKey;
      shiftClick = false;
    },
    true
  );

  /** The next belt's number, or null when every belt is bought. */
  const nextBelt = () => (G.Catch.nextBeltPrice() ? G.Catch.beltsBought() + 1 : null);
  /** What the cursor may reach on this tab, in reading order: every card's button, then the next belt's Buy. */
  function cursorItems() {
    const belt = nextBelt();
    return [...G.BALL_CATALOG.map((ball) => BALL_ID + ball.id), ...(belt ? [BELT_ID + belt] : [])];
  }

  /** Every bought slot's ball id or null, best tier first (the catch screen's order), across the bought belts. */
  function beltBalls() {
    const balls = G.Catch.ballsBestFirst();
    return Array.from({ length: G.Catch.beltsBought() * BELT.slots }, (_, slot) => balls[slot] || null);
  }

  /** "Unable to Afford" when the save's coins are under price, else null. */
  const coinsShort = (price) => ((G.DB.save.coins || 0) < price ? REFUSALS.poor : null);

  /** A card's button: its label, what it says when it cannot buy (null when it can), and whether the card is lit. */
  function cardButton(ball) {
    if (G.Catch.isUnlocked(ball.id))
      return {
        label: 'Buy ' + fmt(ball.price),
        refusal: G.Catch.room() <= 0 ? REFUSALS.full : coinsShort(ball.price),
        lit: true,
      };
    if (ball.unlockPrice) return { label: 'Unlock ' + fmt(ball.unlockPrice), refusal: coinsShort(ball.unlockPrice) };
    return { label: 'Unlock', refusal: REFUSALS.soon };
  }

  function BallCard({ cursor, ball }) {
    const button = cardButton(ball);
    return html`<${ItemCard}
      cursor=${cursor}
      item=${ball}
      buttonId=${BALL_ID + ball.id}
      buttonLabel=${button.label}
      refusal=${button.refusal}
      onPress=${() => press(BALL_ID + ball.id)}
      area="balls"
      dimmed=${!button.lit}
      picture=${html`<${BallSprite} ball=${ball.id} frame=${CARD_BALL.frame} scale=${CARD_BALL.scale} flipped />`}
    />`;
  }

  // ---------- buying (every rule is G.Catch's; a buy saves, and the save redraws the Shop) ----------

  /** Enter or a click on one of this tab's buttons; false when the id is not this tab's (Exit). */
  function press(id) {
    if (id.startsWith(BALL_ID)) {
      const ballId = id.slice(BALL_ID.length);
      if (G.Catch.isUnlocked(ballId)) buyBalls(ballId);
      else unlock(ballId);
      return true;
    }
    if (id.startsWith(BELT_ID)) {
      buyBelt();
      return true;
    }
    return false;
  }

  /** A buy's result: a refusal toast, or the sound, the save (which redraws the Shop) and the toast it earned. */
  function settle(result, boughtText) {
    if (!result.ok) {
      G.Audio.sfx('error');
      G.UI.toast(REFUSALS[result.error] || REFUSALS.none);
      return;
    }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(boughtText(result));
  }

  const tierOf = (ballId) => G.Catch.BALLS.find((ball) => ball.id === ballId);

  function buyBalls(ballId) {
    const ball = tierOf(ballId);
    settle(
      G.Catch.buyBalls(G.DB.save, ballId, shiftPress ? SHIFT_BUY_COUNT : 1),
      (result) => `Bought ${result.bought} ${ball.name}${result.bought > 1 ? 's' : ''}.`
    );
  }

  /** Asks before a big spend, unless shift-clicked (B9). */
  function confirmSpend(price, what, title) {
    if (shiftClick) return Promise.resolve(true);
    return G.UI.ask(`Spend ${fmt(price)} PokéCoins on ${what}?`, {
      title,
      ok: 'Buy',
      note: `You will have ${fmt(Math.max(0, G.DB.save.coins - price))} left.`,
    });
  }

  async function unlock(ballId) {
    const ball = tierOf(ballId);
    if (!ball || !ball.unlockPrice) return;
    if (!(await confirmSpend(ball.unlockPrice, 'the ' + ball.name, 'Unlock ' + ball.name))) return;
    settle(G.Catch.unlockBall(G.DB.save, ballId), () => `${ball.name}s unlocked!`);
  }

  async function buyBelt() {
    const price = G.Catch.nextBeltPrice(),
      number = nextBelt();
    if (!price) return;
    if (!(await confirmSpend(price, 'belt ' + number, 'Buy a belt'))) return;
    settle(G.Catch.buyBelt(G.DB.save), (result) => `Belt ${result.belts} bought: six more ball slots.`);
  }

  function Belt({ number, balls }) {
    const locked = number > G.Catch.beltsBought(),
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
    const balls = beltBalls(),
      belt = nextBelt();
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
      ${
        belt
          ? html`<${CursorButton}
              cursor=${cursor}
              id=${BELT_ID + belt}
              label=${'Buy ' + fmt(G.BELT_PRICES[belt])}
              artWidth=${BELT_BUY.artWidth}
              refusal=${coinsShort(G.BELT_PRICES[belt])}
              onPress=${() => press(BELT_ID + belt)}
              className="shop-belt-buy"
              area="belts"
              style=${{
                left: px(BELT.left + (belt - 1) * BELT.step + (BELT.width - BELT_BUY.width) / 2),
                top: px(CURSOR_ROOM + BELT.height + BELT_BUY.gap),
              }}
            />`
          : null
      }
    </div>`;
  }

  return { ready: true, Pane, cursorItems, press };
})();
