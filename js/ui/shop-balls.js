/* ============ shop-balls.js: the Main Menu Shop's Pokeballs tab (G.ShopBallsPane; #149 149e) ============
 * Look: decision 2026-11-20-155-main-shop-pokeball-look (the board's main.shop.pokeball, tools/library/shop-draft.js),
 * applied with #128 S6 (plan: docs/ASCII Concept Maps/128 - Shop Pokeballs Look Plan.md) from the UI library's pieces.
 * Earlier rulings (E1 to E5): docs/ASCII Concept Maps/149 - Shop Rework Opening.md. Drawn into #shop-balls by
 * js/ui/gacha-ui.js, which owns the window, the rail, Exit and the cursor.
 *   cards   a scrolling 3-column grid of item cards (card.vertical on panel.shopCard, BALL_CARD's sizes), one per ball
 *           in G.BALL_CATALOG: the ball (frame 9 of its strip, flipped, 2x), divider, name, line, one button.glitch
 *           (positive). An unlocked tier (G.Catch.isUnlocked) is lit with "Buy <price>"; a locked Great or Ultra is
 *           dimmed with "Unlock <price>"; the other balls are dimmed and refuse with "Coming soon.". A dimmed card
 *           never dims its button: one you cannot press yet shows button.glitch's refused look.
 *   belts   three belts of six wells packed against the pane's right edge, each numbered on its top-left corner: a
 *           panel.pixel in the Poke Balls pocket ramp (color.rim.belt) over the Unified slot grid when bought, the
 *           fainted ramp when not. A bought belt's wells hold the save's balls slot for slot (G.Catch.slots); a well
 *           holding a ball rings in the belt's base colour, an empty one in ink. The cursor on a well is cursor.ring.
 *           One "Belt <n> <price>" button left of Exit, on its row, buys the next belt (in order); gone once all are.
 *   sell    #137c: "Sell Pokeball" (button.glitch, negative) above Exit, right-aligned with it, sells the ball you are
 *           holding (picked up by click or keys, or dragged onto it) for half its price (G.Catch.sellBall); with
 *           nothing held it refuses.
 *   arrange #137b: every well of a bought belt takes the cursor. A ball moves as in the in-run Inventory
 *           (js/ui/pause-inventory.js): a click picks it up and a second click puts it down, a drag puts it down where
 *           the pointer lets go; by keys Enter or Space picks up and puts down. Onto an empty well it moves, onto a
 *           ball the two swap (G.Catch.moveBall); its own well, Esc, or anywhere else puts it back. Each move saves.
 *   buys    #137, every rule in G.Catch: every buy is instant and asks nothing (decision
 *           2026-11-19-155-dialog-clean-cancel-state-and-input-modes: coins can be earned again). A ball buy is one
 *           ball; Shift, by click or key, buys up to 10. A Buy that cannot buy takes the cursor and refuses with its
 *           reason (#151). Prices: js/data/balls.js.
 */
G.ShopBallsPane = (() => {
  const kitOverlay = G.HudOverlay,
    windowKit = G.MenuWindowKit,
    library = G.Lib || {};
  const pieces = [library.Panel, library.Pixels, library.Cursor, library.Well];
  const piecesReady = pieces.every((piece) => piece && piece.ready);
  if (!kitOverlay || !kitOverlay.ready || !windowKit.ready || !G.BALL_CATALOG || !piecesReady) return { ready: false };
  const { html, signal, ScrollBox, BallSprite, FAINTED_RIM } = kitOverlay.kit;
  const { BUTTON, CARD, CURSOR_ROOM, SCROLL_COLOURS, SHORT_PRICE_FROM, px, CursorButton, ItemCard } = windowKit;
  const { PixelPanel } = library.Panel,
    { CursorRing, useRingTravel } = library.Cursor,
    { Well } = library.Well;

  // ---------- sizes and places (pane pixels; the pane is 1005 x 616, down to the bottom of Exit) ----------
  const PANE_WIDTH = 1005,
    PANE_HEIGHT = 616;
  // Exit (drawn by js/ui/gacha-ui.js, EXIT, 156 px wide) sits in the pane's bottom right corner, on its last 54 px
  const EXIT_PLACE = { width: 156, top: PANE_HEIGHT - BUTTON.height };
  EXIT_PLACE.left = PANE_WIDTH - EXIT_PLACE.width; // 849
  // the cards: the Team Items sale side's width (3 cards of CARD.width and their gaps, 582, then the scroll bar 8 px
  // clear of them; at 584 it covered the third card's rim, 2026-11-18), CURSOR_ROOM in from the pane's top and left
  const GRID = { columns: 3, width: 600 };
  GRID.height = PANE_HEIGHT - 2 * CURSOR_ROOM;
  // the ball card (Jess 2026-11-20): shorter than the library's card, its button.glitch sized to it, the text clean in
  // Michroma (name 14, line 12 on 16 px lines)
  const BALL_CARD = {
    ...CARD,
    height: 224,
    nameTop: 98,
    descriptionTop: 122,
    nameSize: 14,
    descriptionSize: 12,
    lineHeight: 16,
    buttonWidth: 140,
    buttonHeight: 36,
    buttonFontSize: 14,
  };
  // the ball on a card: frame 9 of its strip (the last frame before it opens; Jess 2026-11-17, E5), flipped, at 2x
  const CARD_BALL = { frame: 9, scale: 2 };
  const BALL_FRONT = G.BALL_SPRITES.animations.front[0]; // a ball in a well, and a carried one
  // a well (Jess 2026-11-20): 52 px, 8 px apart, the ball at 2x filling most of it (the well clips it), its 64 px
  // frame centred on the well
  const WELL = { size: 52, gap: 8, ballScale: 2 };
  WELL.ballAt = (WELL.size - G.BALL_SPRITES.size * WELL.ballScale) / 2; // -6
  // the belts: a panel.pixel sized to six wells, their inset the rim's 12 px plus 4 px of padding (the board's
  // teamPocketPanel, 84 x 384); three belts 20 px apart, belt 3 ending 12 px in from the pane's right edge
  const BELT = { inset: 16, gap: 20, rightPad: 12, count: 3, slots: 6 };
  BELT.width = WELL.size + 2 * BELT.inset; // 84
  BELT.height = BELT.slots * WELL.size + (BELT.slots - 1) * WELL.gap + 2 * BELT.inset; // 384
  BELT.step = BELT.width + BELT.gap;
  BELT.left = PANE_WIDTH - BELT.rightPad - BELT.count * BELT.width - (BELT.count - 1) * BELT.gap; // 701
  const BELT_NUMBER = { left: 4, top: 0 }; // the belt's number on its top-left corner (Michroma 16, bw-shop.css)
  // the one belt Buy, left of Exit on its row: "Belt 3 15k" (no "Buy", a short price; Jess 2026-11-18)
  const BELT_BUY = { width: 186, gap: 12 };
  BELT_BUY.left = EXIT_PLACE.left - BELT_BUY.gap - BELT_BUY.width; // 651
  // Sell, right above Exit and right-aligned with it, 204 px so "Sell Pokeball" fits (Jess 2026-11-20)
  const SELL = { width: 204, gap: 8 };
  SELL.left = PANE_WIDTH - SELL.width; // 801
  SELL.top = EXIT_PLACE.top - SELL.gap - BUTTON.height; // 500, under the belts' bottom (390)
  const SHIFT_BUY_COUNT = 10; // balls one Shift press buys (B6)
  // the Poke Balls pocket colours (docs/UI-PALETTES.md "Bag", kept canon), the belt's body the Unified slot grid
  const BELT_RIM = G.Tokens.ramp('color.rim.belt'),
    BELT_BODY = library.Pixels.PATTERNS.slotGridUnified;
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
  // cursor ids: a card's button, the next belt's Buy, a belt well (its place across the belts), Sell
  const BALL_ID = 'ball-',
    BELT_ID = 'belt-',
    SLOT_ID = 'slot-',
    SELL_ID = 'sell';
  const isSlotId = (id) => id.startsWith(SLOT_ID); // the round items: cursor.ring goes round them
  const DRAG_START_DISTANCE = 6; // px the pointer moves before a press becomes a drag (as the in-run Inventory)
  const fmt = (n) => n.toLocaleString('en-US'); // the whole number: toasts
  const shortPrice = (n) => G.U.compact(n, SHORT_PRICE_FROM); // a button's price: "9k"

  // Shift on the press, by click or by key: it buys up to SHIFT_BUY_COUNT balls (B6, B12)
  let shiftPress = false;
  addEventListener(
    'pointerdown',
    (event) => {
      shiftPress = event.shiftKey;
    },
    true
  );
  addEventListener(
    'keydown',
    (event) => {
      shiftPress = event.shiftKey;
    },
    true
  );

  /** The next belt's number, or null when every belt is bought. */
  const nextBelt = () => (G.Catch.nextBeltPrice() ? G.Catch.beltsBought() + 1 : null);
  /** What the cursor may reach on this tab, in reading order: every card's button, every well of the bought belts,
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

  /** A slot position's place in the pane: its belt (0 to 2), its row (0 to 5) and its well's centre. */
  function slotPlace(position) {
    const belt = Math.floor(position / BELT.slots),
      row = position % BELT.slots;
    return {
      belt,
      row,
      x: BELT.left + belt * BELT.step + BELT.inset + WELL.size / 2,
      y: CURSOR_ROOM + BELT.inset + row * (WELL.size + WELL.gap) + WELL.size / 2,
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
  // a press anywhere but a well or Sell while a ball is carried by click puts it back
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

  /** Enter or Space on a well: picks its ball up, or puts the carried ball down there. */
  function pressSlot(position) {
    if (carried.value) putDown(position);
    else pickUp(position, 'keys');
  }

  /** The carried ball: under the pointer, or by keys over the well the cursor is on. */
  function CarryGhost({ cursor }) {
    const holding = carried.value;
    if (!holding) return null;
    let at = ghostAt.value;
    if (holding.mode === 'keys') {
      const on = cursor.cursorOn();
      if (!on || !isSlotId(on)) return null;
      at = slotPlace(+on.slice(SLOT_ID.length));
    }
    return html`<div class="shop-carry-ghost" style=${{ left: px(at.x), top: px(at.y) }}>
      <${BallSprite} ball=${holding.ball} frame=${BALL_FRONT} scale=${WELL.ballScale} />
    </div>`;
  }

  /** "Unable to Afford" when the save's coins are under price, else null. */
  const coinsShort = (price) => ((G.DB.save.coins || 0) < price ? REFUSALS.poor : null);

  /** A card's button: its label, what it says when it cannot buy (null when it can), and whether the card is lit. */
  function cardButton(ball) {
    if (G.Catch.isUnlocked(ball.id))
      return {
        label: 'Buy ' + shortPrice(ball.price),
        refusal: G.Catch.room() <= 0 ? REFUSALS.full : coinsShort(ball.price),
        lit: true,
      };
    if (ball.unlockPrice)
      return { label: 'Unlock ' + shortPrice(ball.unlockPrice), refusal: coinsShort(ball.unlockPrice) };
    return { label: 'Unlock', refusal: REFUSALS.soon };
  }

  /** One ball's card; a dimmed card keeps its button at full strength (decision 2026-11-20). */
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
      sizes=${BALL_CARD}
      frame="shopCard"
      look="glitch"
      intent="positive"
      dimmed=${!button.lit}
      buttonLit=${!button.lit}
      picture=${html`<${BallSprite} ball=${ball.id} frame=${CARD_BALL.frame} scale=${CARD_BALL.scale} flipped />`}
    />`;
  }

  // ---------- buying (every rule is G.Catch's; a buy saves, and the save redraws the Shop) ----------

  /** Enter or a click on one of this tab's buttons or wells; false when the id is not this tab's (Exit). */
  function press(id) {
    if (isSlotId(id)) {
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

  function unlock(ballId) {
    const ball = tierOf(ballId);
    if (!ball || !ball.unlockPrice) return;
    settle(G.Catch.unlockBall(G.DB.save, ballId), () => `${ball.name}s unlocked!`);
  }

  function buyBelt() {
    if (!G.Catch.nextBeltPrice()) return;
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

  /** One belt: a panel.pixel holding a column of wells; ring is the pane's cursor.ring ({ at, phase }). */
  function Belt({ cursor, number, balls, ring }) {
    const locked = number > G.Catch.beltsBought(),
      firstSlot = (number - 1) * BELT.slots,
      holding = carried.value;
    return html`<${PixelPanel}
      left=${BELT.left + (number - 1) * BELT.step}
      top=${CURSOR_ROOM}
      width=${BELT.width}
      height=${BELT.height}
      rim=${locked ? FAINTED_RIM : BELT_RIM}
      body=${BELT_BODY}
      className=${'shop-belt' + (locked ? ' is-locked' : '')}
    >
      <div class="shop-belt-number" style=${{ left: px(BELT_NUMBER.left), top: px(BELT_NUMBER.top) }}>${number}</div>
      ${Array.from({ length: BELT.slots }, (_, slot) => {
        const position = firstSlot + slot,
          ball = locked ? null : balls[position],
          id = SLOT_ID + position,
          lifted = holding && holding.from === position;
        return html`<div
          key=${slot}
          class=${'shop-belt-slot' + (ball ? ' is-full' : '') + (lifted ? ' is-lifted' : '')}
          data-belt=${number}
          data-ball-slot=${locked ? undefined : position}
          data-cursor-id=${locked ? undefined : id}
          data-cursor-area=${'belt-' + number}
          data-cursor-shown=${!locked && cursor.isShownOn(id) ? '' : undefined}
          style=${{
            left: px(BELT.inset),
            top: px(BELT.inset + slot * (WELL.size + WELL.gap)),
            width: px(WELL.size),
            height: px(WELL.size),
          }}
          onMouseEnter=${() => !locked && cursor.hover(id)}
          onMouseLeave=${() => cursor.hover(null)}
          onPointerDown=${(event) => !locked && onSlotPointerDown(event, position)}
        >
          <${Well} size=${WELL.size} ring=${ball ? BELT_RIM.base : null}>
            ${
              ball
                ? html`<${BallSprite}
                    ball=${ball}
                    frame=${BALL_FRONT}
                    scale=${WELL.ballScale}
                    style=${{ left: px(WELL.ballAt), top: px(WELL.ballAt) }}
                  />`
                : null
            }
          </${Well}>
          ${ring.at === id ? html`<${CursorRing} phase=${ring.phase} />` : null}
        </div>`;
      })}
    </${PixelPanel}>`;
  }

  /** The tab: cards on the left, the belts on the right, Sell above Exit and the belt Buy left of it. openCount sends
   *  the cards back to the top. */
  function Pane({ cursor, openCount }) {
    const ring = useRingTravel(cursor.ringOn(isSlotId));
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
              gridTemplateColumns: `repeat(${GRID.columns}, ${px(BALL_CARD.width)})`,
              gap: px(BALL_CARD.gap),
              paddingBottom: px(BALL_CARD.gap), // space under the last row, so its cards show whole at the end
            }}
          >
            ${G.BALL_CATALOG.map((ball) => html`<${BallCard} key=${ball.id} cursor=${cursor} ball=${ball} />`)}
          </div>
        </${ScrollBox}>
      </div>
      ${Array.from(
        { length: BELT.count },
        (_, index) =>
          html`<${Belt} key=${index} cursor=${cursor} number=${index + 1} balls=${balls} ring=${ring} />`
      )}
      ${
        belt
          ? html`<${CursorButton}
              cursor=${cursor}
              id=${BELT_ID + belt}
              label=${'Belt ' + belt + ' ' + shortPrice(G.BELT_PRICES[belt])}
              look="glitch"
              intent="positive"
              width=${BELT_BUY.width}
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
      look="glitch"
      intent="negative"
      width=${SELL.width}
      refusal=${carried.value ? null : REFUSALS.nothingHeld}
      onPress=${() => press(SELL_ID)}
      className="shop-sell"
      area="sell"
      style=${{ left: px(SELL.left), top: px(SELL.top) }}
    />`;
  }

  return { ready: true, Pane, cursorItems, press, escape, reset };
})();
