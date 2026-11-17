/* ============ menu-window-kit.js: pieces the Main Menu windows share (G.MenuWindowKit; #149d) ============
 * The Main Menu Shop (js/ui/gacha-ui.js) and the Inventory (js/ui/inventory-ui.js) are windows on the menu screens'
 * 1920 x 1080 stage. They share the selection cursor's rules and the item card; both moved here from gacha-ui.js
 * (149c) unchanged, so a later screen (#126) can take them too. Styles: css/bw-shop.css (the shop- class names stay).
 *   createMenuCursor  one screen's selection cursor: keys, mouse, arrows to the nearest item, areas, search stops,
 *                     scrolling into view, the delayed cursor tooltip
 *   CursorButton      the team menu button at 3 px per art pixel inside a box the cursor can sit on
 *   ItemCard          a team item card: icon, divider, name, description and one button (Buy, Equip, Swap...)
 *   SearchStop        a search bar as a cursor stop at the top of its area
 */
G.MenuWindowKit = (() => {
  const kitOverlay = G.HudOverlay;
  if (!kitOverlay || !kitOverlay.ready) return { ready: false };
  const {
    html,
    signal,
    hooks,
    IconCanvas,
    Cursor,
    inputMode,
    TeamButton,
    REST_RIM,
    FOCUS_RIM,
    showTooltip,
    hideTooltip,
  } = kitOverlay.kit;

  const px = (value) => value + 'px';
  // ---------- sizes (stage pixels) ----------
  const BUTTON = { artPixel: 3, artRows: 18 }; // the team menu button at 3 px per art pixel: 54 px tall
  BUTTON.height = BUTTON.artRows * BUTTON.artPixel;
  // the item card (149c): 186 x 350, room for a six-line description above the button
  const CARD = {
    width: 186,
    height: 350,
    gap: 12,
    textInset: 10,
    iconSize: 64,
    iconTop: 12,
    dividerTop: 88,
    nameTop: 100,
    descriptionTop: 130,
    buttonArtWidth: 58,
    buttonBottom: 10,
  };
  CARD.inner = CARD.width - 4; // inside the card's 2 px rim
  CARD.buttonWidth = CARD.buttonArtWidth * BUTTON.artPixel; // 174
  // room inside a scroll box for the cursor's corners, which sit 4 px outside an item (Jess 2026-11-17)
  const CURSOR_ROOM = 6;
  const SCROLL_COLOURS = { track: '#303030', thumb: '#29ceff', thumbRim: '#29ceff' }; // the mockups' teal bar

  // the cursor moves with the arrows and with the movement keys (Jess 2026-11-17), as bound in Settings (WASD by default)
  const MOVE_ACTIONS = [
    ['move_left', -1, 0],
    ['move_right', 1, 0],
    ['move_up', 0, -1],
    ['move_down', 0, 1],
  ];
  const ARROWS = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
  /** The way a key press moves the cursor ([x, y]), or null when it is not an arrow or a movement key. */
  function directionOf(event) {
    const code = (event.code || event.key).toLowerCase();
    if (ARROWS[code]) return ARROWS[code];
    const action = MOVE_ACTIONS.find(([name]) => G.Input.bindingsOf(name).includes(code));
    return action ? [action[1], action[2]] : null;
  }

  /**
   * One screen's selection cursor.
   *   host          the element holding the screen's drawn items (each eligible item's element carries data-cursor-id)
   *   isOpen        () => whether the screen is showing (the keys belong to it)
   *   eligibleItems () => the ids the cursor may sit on now
   *   home          where it rests when its last item can no longer take it (Exit)
   *   press(id)     Enter on the item under the cursor
   *   escape()      Esc
   *   keys          more keys: { lower-case key: () => {} } (the Shop's Q and E)
   *   tipFor(id)    the tooltip for an item the cursor rests on by keys, or null (shown after the Tooltip Delay)
   *   tipPlace      where that tooltip opens
   *
   * The cursor follows the device in use (decision 2026-11-16-selection-cursor-follows-the-device-in-use): focus is the
   * last item it was on; hovered is the eligible item under the mouse, or null. Using the keys (kit inputMode 'keys') it
   * shows on focus; with the mouse no corners show (decision 2026-11-17-no-selection-cursor-with-the-mouse), the item
   * under it shows its own green rim.
   */
  function createMenuCursor({ host, isOpen, eligibleItems, home, press, escape, keys = {}, tipFor, tipPlace }) {
    const focus = signal(home),
      hovered = signal(null);

    /** Where the cursor is: by keys, the last item it was on (home if it can no longer take it); by mouse, the item under the pointer. */
    function cursorOn() {
      const items = eligibleItems();
      if (inputMode.value === 'keys') return items.includes(focus.value) ? focus.value : home;
      return items.includes(hovered.value) ? hovered.value : null;
    }
    /** The cursor's corners, only while the keys are in use. */
    const cornersIf = (shown) => (shown && inputMode.value === 'keys' ? html`<${Cursor} />` : null);
    /** The mouse entered (an id) or left (null) an eligible item; entering also makes it the keys' starting point. */
    function hover(id) {
      hovered.value = id;
      if (id) focus.value = id;
    }
    /** Puts the cursor on an item (an opening, or a screen moving it itself). */
    function moveTo(id) {
      focus.value = id;
      hovered.value = null;
    }
    /** The element an eligible item is drawn in (it carries data-cursor-id), or null. */
    const elementOf = (id) => host.querySelector('[data-cursor-id="' + CSS.escape(id) + '"]');

    /**
     * The arrows (149c): the nearest eligible item that way, measured between the items' centres on the screen, a step
     * across the way counting double; none that way keeps the cursor where it is. What it lands on scrolls into view.
     * Up and down stay inside the item's own area (data-cursor-area) while it has an item that way, so the top item's Up
     * goes to that area's search bar (data-cursor-search), not another area (Jess 2026-11-17). The search bar comes only
     * after the area's top row (a row scrolled out of sight above still comes first), and sideways moves never land on
     * one. Up never leaves an area; Down with nothing below in the area goes on to the items outside it.
     */
    function stepFocus(directionX, directionY) {
      const from = cursorOn() || focus.value,
        fromElement = elementOf(from);
      if (!fromElement) return;
      const centre = (element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width };
      };
      const start = centre(fromElement),
        fromArea = fromElement.dataset.cursorArea;
      const nearestIn = (allowed) => {
        let best = null,
          bestScore = Infinity;
        for (const id of eligibleItems()) {
          const element = id !== from && elementOf(id);
          if (!element || !allowed(element)) continue;
          const point = centre(element);
          if (!point.width) continue; // not drawn
          const dx = point.x - start.x,
            dy = point.y - start.y;
          const along = dx * directionX + dy * directionY,
            across = Math.abs(directionX ? dy : dx);
          if (along <= 1) continue;
          const score = along + 2 * across;
          if (score < bestScore) {
            bestScore = score;
            best = { id, element };
          }
        }
        return best;
      };
      const isSearch = (element) => 'cursorSearch' in element.dataset,
        inArea = (element) => element.dataset.cursorArea === fromArea;
      const best = !directionY
        ? nearestIn((element) => !isSearch(element)) // sideways never lands on a search bar
        : fromArea
          ? nearestIn((element) => inArea(element) && !isSearch(element)) || // the next row in the area, scrolled or not
            nearestIn(inArea) || // only from the top row: the area's search bar
            (directionY > 0 ? nearestIn(() => true) : null) // Down with nothing below leaves the area
          : nearestIn(() => true);
      if (!best) return;
      focus.value = best.id;
      showInScrollBox(best.element);
      G.Audio.sfx('hover');
    }

    /**
     * Scrolls the item's own scroll box (only that box: the window never moves) so the whole of it shows: for a card's
     * button, the whole card (data-cursor-whole; Jess 2026-11-17). A few pixels of margin keep the corners in view too.
     */
    function showInScrollBox(element) {
      const box = element.closest('.hud-scroll-box');
      if (!box) return;
      const target = element.closest('[data-cursor-whole]') || element,
        boxRect = box.getBoundingClientRect(),
        targetRect = target.getBoundingClientRect(),
        screenScale = boxRect.height / box.clientHeight; // the stage is scaled to fit the window
      if (targetRect.top < boxRect.top) box.scrollTop -= (boxRect.top - targetRect.top) / screenScale + CURSOR_ROOM;
      else if (targetRect.bottom > boxRect.bottom)
        box.scrollTop += (targetRect.bottom - boxRect.bottom) / screenScale + CURSOR_ROOM;
    }

    // ---------- keys (the Main Menu screens read the page's keydown, as menu.js does) ----------
    // The screen adds onKey in its init(), after menu.js has added its own: a key that closes the screen must not then
    // reach the Main Menu's listener (Enter on Exit would press the Main Menu's selected row). A key it handles goes no
    // further either: Enter on the Shop's Inventory opens the Inventory, whose listener comes next and would otherwise
    // read the same Enter (Jess 2026-11-17: by keys the Shop closed and the Inventory never showed).
    function onKey(event) {
      if (!isOpen() || G.UI.isOpen('scr-ask') || event.target.closest('input, textarea, select')) return;
      const key = event.key,
        extraKey = keys[key.toLowerCase()],
        direction = directionOf(event);
      if (key === 'Escape') escape();
      else if (key === 'Enter') {
        const at = cursorOn();
        if (at) press(at);
      } else if (extraKey) extraKey();
      else if (direction) stepFocus(direction[0], direction[1]);
      else return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    /**
     * By keys, the cursor resting on an item with a tooltip shows it after the Tooltip Delay setting (Jess 2026-11-17:
     * keyboard and, later, controller players see tooltips too). The mouse shows them at once (ItemGrid). Drawn once by
     * the screen.
     */
    function CursorTip() {
      const at = cursorOn(),
        byKeys = inputMode.value === 'keys';
      hooks.useEffect(() => {
        const tip = byKeys && at && tipFor ? tipFor(at) : null;
        if (!tip) return undefined;
        let shown = false;
        const delaySeconds = +G.Settings.get('cursorTooltipDelay') || 1;
        const timer = setTimeout(() => {
          const element = elementOf(at);
          if (!element) return;
          showTooltip(element, tip, tipPlace);
          shown = true;
        }, delaySeconds * 1000);
        return () => {
          clearTimeout(timer);
          if (shown) hideTooltip();
        };
      }, [at, byKeys]);
      return null;
    }

    return { cursorOn, cornersIf, hover, moveTo, elementOf, onKey, CursorTip };
  }

  /**
   * The team menu button at 3 px per art pixel in a box the cursor can sit on (its corners sit on this box). A disabled
   * button never takes the cursor. style places the box; area puts it in a cursor area; action is the button's
   * data-action (the cursor id by default).
   */
  function CursorButton({
    cursor,
    id,
    action = id,
    label,
    artWidth,
    disabled = false,
    onPress,
    className,
    style,
    area,
  }) {
    const focused = cursor.cursorOn() === id;
    return html`<div
      class=${'shop-button' + (className ? ' ' + className : '')}
      data-cursor-id=${id}
      data-cursor-area=${area}
      style=${{ ...style, width: px(artWidth * BUTTON.artPixel), height: px(BUTTON.height) }}
      onMouseEnter=${() => cursor.hover(disabled ? null : id)}
      onMouseLeave=${() => cursor.hover(null)}
    >
      <${TeamButton}
        id=${action}
        label=${label}
        artWidth=${artWidth}
        artPixel=${BUTTON.artPixel}
        rim=${REST_RIM}
        focusRim=${FOCUS_RIM}
        focused=${focused}
        disabled=${disabled}
        onPress=${() => !disabled && onPress()}
      />
      ${cursor.cornersIf(focused)}
    </div>`;
  }

  /**
   * A team item card (149c): thin #29ceff rim, #303030 body, icon, divider, name, description, and one button at the
   * bottom (its id is the cursor's, in the given area).
   */
  function ItemCard({ cursor, item, buttonId, buttonLabel, disabled, onPress, area }) {
    return html`<div
      class="shop-card"
      data-item=${item.id}
      data-cursor-whole
      style=${{ width: px(CARD.width), height: px(CARD.height) }}
    >
      <div class="shop-card-icon" style=${{ left: px((CARD.inner - CARD.iconSize) / 2), top: px(CARD.iconTop) }}>
        <${IconCanvas} icon=${item.icon || item.id} size=${CARD.iconSize} />
      </div>
      <div
        class="shop-card-divider"
        style=${{ left: px(CARD.textInset), right: px(CARD.textInset), top: px(CARD.dividerTop) }}
      ></div>
      <div
        class="hud-text shop-card-name"
        style=${{ left: px(CARD.textInset), right: px(CARD.textInset), top: px(CARD.nameTop) }}
      >
        ${item.name}
      </div>
      <div
        class="hud-text shop-card-description"
        style=${{ left: px(CARD.textInset), right: px(CARD.textInset), top: px(CARD.descriptionTop) }}
      >
        ${item.desc}
      </div>
      <${CursorButton}
        cursor=${cursor}
        id=${buttonId}
        label=${buttonLabel}
        artWidth=${CARD.buttonArtWidth}
        disabled=${disabled}
        onPress=${onPress}
        className="shop-card-buy"
        area=${area}
        style=${{
          left: px((CARD.inner - CARD.buttonWidth) / 2),
          top: px(CARD.height - 4 - CARD.buttonBottom - BUTTON.height),
        }}
      />
    </div>`;
  }

  /**
   * A search bar as a cursor stop at the top of its area, for the keys only: no corners on it, its own green rim shows
   * the cursor is there (Jess 2026-11-17); Enter starts typing (the screen's press focuses its input). The mouse just
   * clicks into it.
   */
  function SearchStop({ id, area, at, className, children }) {
    return html`<div
      class=${'shop-search-host ' + className + (at === id ? ' is-cursor' : '')}
      data-cursor-id=${id}
      data-cursor-area=${area}
      data-cursor-search
    >
      ${children}
    </div>`;
  }

  /** A filter for a search bar: the item's name holds the typed text (any case); empty text keeps every item. */
  function nameHas(query) {
    const text = query.trim().toLowerCase();
    return (item) => !text || item.name.toLowerCase().includes(text);
  }

  return {
    ready: true,
    BUTTON,
    CARD,
    CURSOR_ROOM,
    SCROLL_COLOURS,
    px,
    createMenuCursor,
    CursorButton,
    ItemCard,
    SearchStop,
    nameHas,
  };
})();
