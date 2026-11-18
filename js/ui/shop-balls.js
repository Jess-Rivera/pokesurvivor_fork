/* ============ shop-balls.js: the Main Menu Shop's Pokeballs tab (G.ShopBallsPane; #149 149e) ============
 * Mockup: assets/excalidraw/Shop-Pokeballs.svg; plan and rulings (E1 to E5): docs/ASCII Concept Maps/149 - Shop Rework
 * Opening.md. Drawn into #shop-balls by js/ui/gacha-ui.js, which owns the window, the rail, Exit and the cursor.
 *   cards   a scrolling 3-column grid of the kit's item cards, one per ball in G.BALL_CATALOG: the ball (frame 9 of its
 *           strip, flipped, 2x), divider, name, line, one button. An unlocked tier (G.Catch.isUnlocked) is lit
 *           with "Buy <price>"; a locked Great or Ultra is dimmed with "Unlock <price>" (the button
 *           stays lit when you can afford it, #137c); the other balls are dimmed
 *           and refuse with "Coming soon.".
 *   belts   the catch screen's three belts of six slots, sized up, packed against the pane's right edge, each with its
 *           number on its top-left corner (#137c): bought belts (G.Catch.beltsBought) in the Poke Balls pocket colours
 *           holding the save's balls slot for slot (G.Catch.slots); the rest locked. One "Belt <n> <price>" left of
 *           Exit, on its row, buys the next belt (belts are bought in order) and is gone once every belt is bought.
 *   sell    #137c: "Sell Pokeball" above Exit (right-aligned with it) sells the ball you are holding (picked up by click or keys, or dragged onto
 *           it) for half its price (G.Catch.sellBall); with nothing held it refuses.
 *   arrange #137b: every slot of a bought belt takes the cursor. A ball moves as in the in-run Inventory
 *           (js/ui/pause-inventory.js): a click picks it up and a second click puts it down, a drag puts it down where
 *           the pointer lets go; by keys Enter or Space picks up and puts down. Onto an empty slot it moves, onto a ball
 *           the two swap (G.Catch.moveBall); its own slot, Esc, or anywhere else puts it back. Each move saves.
 *   buys    #137, every rule in G.Catch: a ball buy is instant (one ball; Shift, by click or key, buys up to 10); an
 *           unlock or a belt asks first (G.UI.ask) and a shift-click skips the question, as on the TMs tab. A Buy that
 *           cannot buy takes the cursor and refuses with its reason (#151). Prices: js/data/balls.js.
 */
G.ShopBallsPane = (() => {
  const kitOverlay = G.HudOverlay,
    windowKit = G.MenuWindowKit;
  if (!kitOverlay || !kitOverlay.ready || !windowKit.ready || !G.BALL_CATALOG) return { ready: false };
  const { html, signal, Box, ScrollBox, BallSprite, FAINTED_RIM } = kitOverlay.kit;
  const { BUTTON, CARD, CURSOR_ROOM, SCROLL_COLOURS, SHORT_PRICE_FROM, px, CursorButton, ItemCard } = windowKit;

  // ---------- sizes and places (pane pixels; the pane is 1005 x 616, down to the bottom of Exit) ----------
  const PANE_WIDTH = 1005,
    PANE_HEIGHT = 616;
  // Exit (drawn by js/ui/gacha-ui.js, EXIT) sits in the pane's bottom right corner: its row is the pane's last 54 px
  const EXIT_PLACE = { artWidth: 52, top: PANE_HEIGHT - BUTTON.height };
  EXIT_PLACE.left = PANE_WIDTH - EXIT_PLACE.artWidth * BUTTON.artPixel; // 849
  // the cards: the Team Items sale side's width (3 cards of CARD.width and their gaps, 582, then the scroll bar 8 px
  // clear of them; at 584 it covered the third card's rim, 2026-11-18), CURSOR_ROOM in from the pane's top and left so
  // the cursor's corners show whole
  const GRID = { columns: 3, width: 600 };
  GRID.height = PANE_HEIGHT - 2 * CURSOR_ROOM;
  // the ball on a card: frame 9 of its strip (the last frame before it opens; Jess 2026-11-17, E5), flipped, at 2x
  // (CARD.iconSize, 64 px)
  const CARD_BALL = { frame: 9, scale: 2 };
  // the belts: the catch screen's (js/ui/catch-ui.js SLOT and BELT) sized up, its ball drawn at 2x in a 68 px slot;
  // three belts 20 px apart, belt 3 ending 12 px in from the pane's right edge (Jess 2026-11-17, #137c P1 and P2)
  const SLOT = { size: 68, gap: 10, left: 14, top: 14, ballScale: 2 },
    BELT = { width: 96, gap: 20, rightPad: 12, count: 3, slots: 6 };
  BELT.step = BELT.width + BELT.gap;
  BELT.left = PANE_WIDTH - BELT.rightPad - BELT.count * BELT.width - (BELT.count - 1) * BELT.gap; // 665
  BELT.height = 2 * SLOT.top + BELT.slots * SLOT.size + (BELT.slots - 1) * SLOT.gap; // 486
  const BELT_NUMBER = { left: 2, top: -3 }; // the belt's number on its top-left rim corner, in the 14 px above slot 1
  // the one belt Buy, left of Exit on its row: "Belt 3 15k" (no "Buy", a short price; Jess 2026-11-18) at Sell's width
  const BELT_BUY = { artWidth: 62, gap: 12 };
  BELT_BUY.width = BELT_BUY.artWidth * BUTTON.artPixel; // 186
  BELT_BUY.left = EXIT_PLACE.left - BELT_BUY.gap - BELT_BUY.width;
  // Sell, right above Exit and right-aligned with it, a little wider so "Sell Pokeball" fits (#137c); its focus rim is
  // red (Jess 2026-11-17, P5)
  const SELL = { artWidth: 62, gap: 8 };
  SELL.left = PANE_WIDTH - SELL.artWidth * BUTTON.artPixel; // 819
  SELL.top = EXIT_PLACE.top - SELL.gap - BUTTON.height; // 500, 8 px under the belts' bottom (492)
  const SELL_RIM = G.Tokens.ramp('color.rim.sell');
  const SHIFT_BUY_COUNT = 10; // balls one Shift press buys (B6)
  // the Poke Balls pocket colours (docs/UI-PALETTES.md "Bag"), the catch screen's bought belt
  const BELT_RIM = G.Tokens.ramp('color.rim.belt');
  // what a button that cannot buy says when pressed (#151); "Unable to Afford" is the Shop's other tabs' line
  const REFUSALS = {
    soon: 'Coming soon.',
    poor: 'Unable to Afford',
    full: 'Your belts are full.',
    locked: 'Unlock it first.',
    done: 'Already bought.',
    none: 'You cannot buy that.',
    nothingHeld: 'Pick up a ball first.',
  };
  const BALL_ID = 'ball-', // cursor ids: a card's button, the next belt's Buy, a belt slot (its place across the belts),
    BELT_ID = 'belt-', // Sell
    SLOT_ID = 'slot-',
    SELL_ID = 'sell';
  const DRAG_START_DISTANCE = 6; // px the pointer moves before a press becomes a drag (as the in-run Inventory)
  const fmt = (n) => n.toLocaleString('en-US'); // the whole number: asks, notes and toasts
  const shortPrice = (n) => G.U.compact(n, SHORT_PRICE_FROM); // a button's price: "9k"

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
  /** What the cursor may reach on this tab, in reading order: every card's button, every slot of the bought belts,
   *  Sell, then the next belt's Buy. */
  function cursorItems() {
    const belt = nextBelt();
    return [
      ...G.BALL_CATALOG.map((ball) => BALL_ID + ball.id),
      ...G.Catch.slots().map((_, position) => SLOT_ID + position),
      SELL_ID,
      ...(belt ? [BELT_ID + belt] : []),
    ];
  }

  // ---------- arranging the balls (#137b) ----------
  // carried: { from (slot position), ball (id), mode: 'click' | 'drag' | 'keys' } while a ball is picked up
  const carried = signal(null),
    ghostAt = signal({ x: 0, y: 0 }); // the pointer in pane pixels, for the carried ball
  let pressed = null, // { from, ball, x, y }: a press on a ball, not yet a click or a drag
    swallowNextClick = false;

  /** A slot position's place in the pane: its belt (0 to 2), its row (0 to 5) and its centre. */
  function slotPlace(position) {
    const belt = Math.floor(position / BELT.slots),
      row = position % BELT.slots;
    return {
      belt,
      row,
      x: BELT.left + belt * BELT.step + SLOT.left + SLOT.size / 2,
      y: CURSOR_ROOM + SLOT.top + row * (SLOT.size + SLOT.gap) + SLOT.size / 2,
    };
  }
  /** The slot position under a page point, or null. */
  function slotUnder(clientX, clientY) {
    const element = document.elementFromPoint(clientX, clientY),
      slot = element && element.closest('[data-ball-slot]');
    return slot ? +slot.dataset.ballSlot : null;
  }
  /** A page point in pane pixels (the Shop's stage is scaled to fit). */
  function panePoint(clientX, clientY) {
    const pane = document.querySelector('.shop-balls-pane');
    if (!pane || !pane.offsetWidth) return { x: 0, y: 0 };
    const rect = pane.getBoundingClientRect(),
      scale = rect.width / pane.offsetWidth;
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  }

  function pickUp(from, mode) {
    const ball = G.Catch.slots()[from];
    if (!ball) return;
    carried.value = { from, ball, mode };
    G.Audio.sfx('select');
  }
  /** Puts the carried ball down on slot to: a move or a swap, saved. Its own slot or no slot puts it back. */
  function putDown(to) {
    const holding = carried.value;
    carried.value = null;
    if (!holding || to == null || to === holding.from) return;
    if (!G.Catch.moveBall(G.DB.save, holding.from, to).ok) return;
    G.Audio.sfx('confirm');
    G.DB.commit(true);
  }
  /** Esc: a carried ball goes back. True when there was one (the Shop then stays open). */
  function escape() {
    if (!carried.value) return false;
    carried.value = null;
    G.Audio.sfx('back');
    return true;
  }
  /** The Shop opened: nothing half picked up. */
  function reset() {
    carried.value = null;
    pressed = null;
  }

  function onSlotPointerDown(event, position) {
    if (event.button !== 0) return;
    const holding = carried.value;
    if (holding && holding.mode !== 'drag') return putDown(position); // the second click of a click move
    const ball = G.Catch.slots()[position];
    if (ball) pressed = { from: position, x: event.clientX, y: event.clientY };
  }
  document.addEventListener('pointermove', (event) => {
    if (pressed && !carried.value) {
      const distance = Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y);
      if (distance >= DRAG_START_DISTANCE) {
        pickUp(pressed.from, 'drag');
        pressed = null;
      }
    }
    if (carried.value && carried.value.mode !== 'keys') ghostAt.value = panePoint(event.clientX, event.clientY);
  });
  document.addEventListener('pointerup', (event) => {
    const holding = carried.value;
    if (holding && holding.mode === 'drag') {
      swallowNextClick = true;
      if (overSell(event.clientX, event.clientY)) sellHeld();
      else putDown(slotUnder(event.clientX, event.clientY));
    } else if (pressed) {
      pickUp(pressed.from, 'click'); // a click: the ball is picked up until the next press
      ghostAt.value = panePoint(event.clientX, event.clientY);
    }
    pressed = null;
  });
  /** True when a page point is on Sell. */
  function overSell(clientX, clientY) {
    const element = document.elementFromPoint(clientX, clientY);
    return !!(element && element.closest('.shop-sell'));
  }
  // a press anywhere but a slot or Sell while a ball is carried by click puts it back
  document.addEventListener(
    'pointerdown',
    (event) => {
      const holding = carried.value;
      if (holding && holding.mode !== 'drag' && !event.target.closest('[data-ball-slot], .shop-sell'))
        carried.value = null;
    },
    true
  );
  document.addEventListener(
    'click',
    (event) => {
      if (!swallowNextClick) return;
      swallowNextClick = false;
      event.stopPropagation();
      event.preventDefault();
    },
    true
  );

  /** Enter or Space on a slot: picks its ball up, or puts the carried ball down there. */
  function pressSlot(position) {
    if (carried.value) putDown(position);
    else pickUp(position, 'keys');
  }

  /** The carried ball: under the pointer, or by keys over the slot the cursor is on. */
  function CarryGhost({ cursor }) {
    const holding = carried.value;
    if (!holding) return null;
    let at = ghostAt.value;
    if (holding.mode === 'keys') {
      const on = cursor.cursorOn();
      if (!on || !on.startsWith(SLOT_ID)) return null;
      at = slotPlace(+on.slice(SLOT_ID.length));
    }
    return html`<div class="shop-carry-ghost" style=${{ left: px(at.x), top: px(at.y) }}>
      <${BallSprite} ball=${holding.ball} frame=${G.BALL_SPRITES.animations.front[0]} scale=${SLOT.ballScale} />
    </div>`;
  }

  /** "Unable to Afford" when the save's coins are under price, else null. */
  const coinsShort = (price) => ((G.DB.save.coins || 0) < price ? REFUSALS.poor : null);

  /** A card's button: its label, what it says when it cannot buy (null when it can), whether the card is lit, and
   *  whether a dimmed card's button stays lit (an Unlock you can afford). */
  function cardButton(ball) {
    if (G.Catch.isUnlocked(ball.id))
      return {
        label: 'Buy ' + shortPrice(ball.price),
        refusal: G.Catch.room() <= 0 ? REFUSALS.full : coinsShort(ball.price),
        lit: true,
      };
    if (ball.unlockPrice) {
      const refusal = coinsShort(ball.unlockPrice);
      return { label: 'Unlock ' + shortPrice(ball.unlockPrice), refusal, buttonLit: !refusal }; // #137c
    }
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
      buttonLit=${button.buttonLit}
      picture=${html`<${BallSprite} ball=${ball.id} frame=${CARD_BALL.frame} scale=${CARD_BALL.scale} flipped />`}
    />`;
  }

  // ---------- buying (every rule is G.Catch's; a buy saves, and the save redraws the Shop) ----------

  /** Enter or a click on one of this tab's buttons or slots; false when the id is not this tab's (Exit). */
  function press(id) {
    if (id.startsWith(SLOT_ID)) {
      pressSlot(+id.slice(SLOT_ID.length));
      return true;
    }
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
    if (id === SELL_ID) {
      sellHeld();
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

  /** Sells the ball being held (#137c); the hold ends either way. */
  function sellHeld() {
    const holding = carried.value;
    carried.value = null;
    if (!holding) return settle({ ok: false, error: 'nothingHeld' });
    const ball = tierOf(holding.ball);
    settle(G.Catch.sellBall(G.DB.save, holding.from), (result) => `Sold a ${ball.name} for ${fmt(result.refund)}.`);
  }

  function Belt({ cursor, number, balls }) {
    const locked = number > G.Catch.beltsBought(),
      firstSlot = (number - 1) * BELT.slots,
      holding = carried.value,
      at = cursor.cursorOn();
    return html`<${Box}
      left=${BELT.left + (number - 1) * BELT.step}
      top=${CURSOR_ROOM}
      width=${BELT.width}
      height=${BELT.height}
      rim=${locked ? FAINTED_RIM : BELT_RIM}
      className=${'catch-belt shop-belt' + (locked ? ' is-locked' : '')}
    >
      <div class="hud-text shop-belt-number" style=${{ left: px(BELT_NUMBER.left), top: px(BELT_NUMBER.top) }}>${number}</div>
      ${Array.from({ length: BELT.slots }, (_, slot) => {
        const position = firstSlot + slot,
          ball = locked ? null : balls[position],
          id = SLOT_ID + position,
          lifted = holding && holding.from === position;
        return html`<div
          key=${slot}
          class=${'catch-slot' + (ball ? ' is-full' : '') + (lifted ? ' is-lifted' : '')}
          data-belt=${number}
          data-ball-slot=${locked ? undefined : position}
          data-cursor-id=${locked ? undefined : id}
          data-cursor-area=${'belt-' + number}
          style=${{
            left: px(SLOT.left),
            top: px(SLOT.top + slot * (SLOT.size + SLOT.gap)),
            width: px(SLOT.size),
            height: px(SLOT.size),
          }}
          onMouseEnter=${() => !locked && cursor.hover(id)}
          onMouseLeave=${() => cursor.hover(null)}
          onPointerDown=${(event) => !locked && onSlotPointerDown(event, position)}
        >
          ${ball ? html`<${BallSprite} ball=${ball} frame=${G.BALL_SPRITES.animations.front[0]} scale=${SLOT.ballScale} />` : null}
          ${locked ? null : cursor.cornersIf(at === id)}
        </div>`;
      })}
    </${Box}>`;
  }

  /** The tab: cards on the left, the belts on the right, Sell above Exit and the belt Buy left of it. openCount sends the cards back to the top. */
  function Pane({ cursor, openCount }) {
    if (!G.DB.save) return null;
    const balls = G.Catch.slots(),
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
      ${Array.from(
        { length: BELT.count },
        (_, index) => html`<${Belt} key=${index} cursor=${cursor} number=${index + 1} balls=${balls} />`
      )}
      ${
        belt
          ? html`<${CursorButton}
              cursor=${cursor}
              id=${BELT_ID + belt}
              label=${'Belt ' + belt + ' ' + shortPrice(G.BELT_PRICES[belt])}
              artWidth=${BELT_BUY.artWidth}
              refusal=${coinsShort(G.BELT_PRICES[belt])}
              onPress=${() => press(BELT_ID + belt)}
              className="shop-belt-buy"
              area="belts"
              style=${{ left: px(BELT_BUY.left), top: px(EXIT_PLACE.top) }}
            />`
          : null
      }
      <${SellButton} cursor=${cursor} />
      <${CarryGhost} cursor=${cursor} />
    </div>`;
  }

  /** Sell (#137c): refuses until a ball is held. Its own component, so only it reads the held ball: a component that
   *  reads a signal is redrawn only when its props or that signal change, and Pane must redraw on every save. */
  function SellButton({ cursor }) {
    return html`<${CursorButton}
      cursor=${cursor}
      id=${SELL_ID}
      label="Sell Pokeball"
      artWidth=${SELL.artWidth}
      refusal=${carried.value ? null : REFUSALS.nothingHeld}
      onPress=${() => press(SELL_ID)}
      className="shop-sell"
      area="sell"
      focusRim=${SELL_RIM}
      style=${{ left: px(SELL.left), top: px(SELL.top) }}
    />`;
  }

  return { ready: true, Pane, cursorItems, press, escape, reset };
})();
