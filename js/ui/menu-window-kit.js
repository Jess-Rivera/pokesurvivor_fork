/* ============ menu-window-kit.js: pieces the Main Menu windows share (G.MenuWindowKit; #149d) ============
 * The Main Menu Shop (js/ui/gacha-ui.js) and the Inventory (js/ui/inventory-ui.js) are windows on the menu screens'
 * 1920 x 1080 stage. They share the selection cursor's rules and the item card; both moved here from gacha-ui.js
 * (149c) unchanged, so a later screen (#126) can take them too. Styles: css/bw-shop.css (the shop- class names stay).
 *   createMenuCursor  one screen's selection cursor: keys, mouse, arrows to the nearest item, areas, search stops,
 *                     scrolling into view, the delayed cursor tooltip
 *   CursorButton      a button inside a box the cursor can sit on: button.rounded at 3 px per art pixel, or
 *                     button.glitch at any size (#128 S6), which shows the cursor by its own focus swipe
 *   ItemCard          a team item card (the library's card.vertical): icon, name, description, one button
 *   SearchStop        a search bar as a cursor stop at the top of its area
 *   Dropdown          a multi-select filter box whose grouped choices open in a list under it (#149 149f, the TMs tab)
 */
G.MenuWindowKit = (() => {
  const kitOverlay = G.HudOverlay,
    panel = G.Lib && G.Lib.Panel, // the card is the UI library's card.vertical (#155 155c)
    buttons = G.Lib && G.Lib.Button; // button.glitch (#128 S6)
  if (!kitOverlay || !kitOverlay.ready || !panel || !panel.ready || !buttons || !buttons.ready) return { ready: false };
  const {
    html,
    signal,
    hooks,
    IconCanvas,
    Cursor,
    inputMode,
    RoundedButton,
    REST_RIM,
    FOCUS_RIM,
    showTooltip,
    hideTooltip,
    ScrollBox,
  } = kitOverlay.kit;
  const { GlitchButton } = buttons;

  const px = (value) => value + 'px';
  // the windows' buttons write a price from 1,000 up short (G.U.compact): "Buy 9k", "Belt 2 10k", "Buy 7.5k"; the ask
  // before a buy, its note and the toasts keep the whole number (Jess 2026-11-18)
  const SHORT_PRICE_FROM = 1000;
  // ---------- sizes (stage pixels) ----------
  const BUTTON = { artPixel: 3, artRows: 18 }; // the team menu button at 3 px per art pixel: 54 px tall
  BUTTON.height = BUTTON.artRows * BUTTON.artPixel;
  // the item card's sizes (149c, 186 x 350): the library's card.vertical owns them
  const { CARD, cardButtonPlace, VerticalCard } = panel;
  const DROPDOWN_RIM = 2; // the open list's rim (css/bw-shop.css .shop-dropdown-list)
  // room inside a scroll box for the cursor's corners, which sit 4 px outside an item (Jess 2026-11-17)
  const CURSOR_ROOM = 6;
  const SCROLL_COLOURS = {
    track: G.Tokens.color('color.scroll.track'),
    thumb: G.Tokens.color('color.scroll.thumb'), // the mockups' teal bar
    thumbRim: G.Tokens.color('color.scroll.thumbRim'),
  };

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
      hovered = signal(null),
      keyPress = signal({ id: null, count: 0 }); // the last item Enter or Space pressed, so its button plays the press

    /** Where the cursor is: by keys, the last item it was on (home if it can no longer take it); by mouse, the item under the pointer. */
    function cursorOn() {
      const items = eligibleItems();
      if (inputMode.value === 'keys') return items.includes(focus.value) ? focus.value : home;
      return items.includes(hovered.value) ? hovered.value : null;
    }
    /** The cursor's corners, only while the keys are in use. */
    const cornersIf = (shown) => (shown && inputMode.value === 'keys' ? html`<${Cursor} />` : null);
    /** Whether the keys' cursor shows on this item now (a piece that draws its own cursor marks itself with it). */
    const isShownOn = (id) => inputMode.value === 'keys' && cursorOn() === id;
    /** For a cursor.ring (G.Lib.Cursor.useRingTravel): the round item the keys' cursor is on, or null. isRound(id) says
     *  which items are round. */
    function ringOn(isRound) {
      const at = inputMode.value === 'keys' ? cursorOn() : null;
      return at && isRound(at) ? at : null;
    }
    /** How many times the keys have pressed this item since the last press elsewhere (0 if that press was not it). */
    const keyPressCountOf = (id) => (keyPress.value.id === id ? keyPress.value.count : 0);
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
        ? (isSearch(fromElement) && nearestIn((element) => isSearch(element) && inArea(element))) || // the next one in its row
          nearestIn((element) => !isSearch(element)) // else sideways never lands on a search bar
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
      else if (key === 'Enter' || key === ' ') {
        // Enter and Space both press (#153, decision 2026-11-17-one-menu-key-set)
        const at = cursorOn(),
          atElement = at && elementOf(at),
          refusal = atElement && atElement.dataset.refusal;
        if (at) keyPress.value = { id: at, count: keyPress.value.count + 1 };
        if (refusal) refuse(refusal);
        else if (at) press(at);
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

    return {
      cursorOn,
      cornersIf,
      isShownOn,
      ringOn,
      keyPressCountOf,
      hover,
      moveTo,
      elementOf,
      onKey,
      CursorTip,
    };
  }

  /** A press the button turns down (#151): the error sound and the refusal's toast; nothing else happens. */
  function refuse(refusal) {
    G.Audio.sfx('error');
    G.UI.toast(refusal);
  }

  /**
   * A button in a box the cursor can sit on. A disabled button never takes the cursor. refusal (#151, decision
   * 2026-11-17-unaffordable-buttons-take-the-cursor): the toast a press shows instead of acting ("Unable to Afford", or
   * a Full pocket's line); the button still takes the cursor and shows its refused look (this box keeps its refused
   * class, which the smokes read). style places the box; area puts it in a cursor area; action is the button's
   * data-action (the cursor id by default). look:
   *   rounded  the team menu button at 3 px per art pixel, artWidth art pixels wide; the cursor's corners sit on the
   *            box; focusRim: the rim's colours under the cursor (the kit's green by default)
   *   glitch   button.glitch, width x height px (its bar included), label fontSize px, in its intent (#128 S6). It
   *            shows the cursor by its own focus swipe, so no corners; the box carries data-cursor-shown while the
   *            keys' cursor is on it, and a key press plays the button's press
   */
  function CursorButton({
    cursor,
    id,
    action = id,
    label,
    artWidth,
    disabled = false,
    refusal = null,
    onPress,
    className,
    style,
    area,
    focusRim = FOCUS_RIM,
    look = 'rounded',
    intent,
    width,
    height = BUTTON.height,
    fontSize,
  }) {
    const focused = cursor.cursorOn() === id,
      pressNow = () => (refusal ? refuse(refusal) : !disabled && onPress()),
      glitch = look === 'glitch';
    return html`<div
      class=${'shop-button' + (refusal ? ' refused' : '') + (className ? ' ' + className : '')}
      data-cursor-id=${id}
      data-cursor-area=${area}
      data-refusal=${refusal || undefined}
      data-cursor-shown=${glitch && cursor.isShownOn(id) ? '' : undefined}
      style=${{
        ...style,
        width: px(glitch ? width : artWidth * BUTTON.artPixel),
        height: px(glitch ? height : BUTTON.height),
      }}
      onMouseEnter=${() => cursor.hover(disabled ? null : id)}
      onMouseLeave=${() => cursor.hover(null)}
    >
      ${
        glitch
          ? html`<${GlitchButton}
              id=${action}
              label=${label}
              intent=${intent}
              width=${width}
              height=${height}
              fontSize=${fontSize}
              focused=${focused}
              refused=${!!refusal}
              disabled=${disabled}
              pressCount=${cursor.keyPressCountOf(id)}
              onPress=${pressNow}
            />`
          : html`<${RoundedButton}
                id=${action}
                label=${label}
                artWidth=${artWidth}
                artPixel=${BUTTON.artPixel}
                rim=${REST_RIM}
                focusRim=${focusRim}
                focused=${focused}
                disabled=${disabled}
                refused=${!!refusal}
                onPress=${pressNow}
              />
              ${cursor.cornersIf(focused)}`
      }
    </div>`;
  }

  /**
   * A team item card (149c): the library's card.vertical, handed the item's icon and a CursorButton at the bottom (its
   * id is the cursor's, in the given area). width: the Shop's 186 by default; the Inventory's are wider. refusal: as
   * CursorButton's. picture: drawn in the icon box in place of the item's icon (the Shop's ball cards, 149e); dimmed:
   * the whole card at the locked look (a ball not unlocked yet); buttonLit (#137c): with dimmed, everything but the
   * button dims, so a locked ball you can afford shows an Unlock you can press. sizes and frame: the card's (the
   * library's CARD and panel.thin by default; card.vertical); look and intent: its button's (CursorButton's), a glitch
   * button sized by sizes.buttonWidth, buttonHeight and buttonFontSize.
   */
  function ItemCard({
    cursor,
    item,
    buttonId,
    buttonLabel,
    disabled,
    refusal,
    onPress,
    area,
    width = CARD.width,
    sizes = CARD,
    frame = 'thin',
    look = 'rounded',
    intent,
    picture,
    dimmed,
    buttonLit,
  }) {
    return html`<${VerticalCard}
      width=${width}
      sizes=${sizes}
      frame=${frame}
      picture=${picture || html`<${IconCanvas} icon=${item.icon || item.id} size=${sizes.iconSize} />`}
      name=${item.name}
      description=${item.desc}
      dimmed=${dimmed}
      buttonLit=${buttonLit}
      attrs=${{ 'data-item': item.id, 'data-cursor-whole': '' }}
      button=${html`<${CursorButton}
        cursor=${cursor}
        id=${buttonId}
        label=${buttonLabel}
        artWidth=${CARD.buttonArtWidth}
        look=${look}
        intent=${intent}
        width=${sizes.buttonWidth}
        height=${sizes.buttonHeight}
        fontSize=${sizes.buttonFontSize}
        disabled=${disabled}
        refusal=${refusal}
        onPress=${onPress}
        className="shop-card-buy"
        area=${area}
        style=${cardButtonPlace(width, sizes, frame)}
      />`}
    />`;
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

  /**
   * A multi-select filter box (#149 149f): a box the height of a search bar showing its label (with the count chosen),
   * and when open, a list of choices under it, in groups with a header each. A choice toggles; within a group any chosen
   * choice matches, across groups each must (the screen's filter does the matching). The box and each choice take the
   * selection cursor (its corners; Jess 2026-11-17), the mouse shows a green rim; open, the cursor stays inside it (the screen offers only dropdownItems) and
   * Esc or a click outside closes it.
   *   id, area     the box's cursor id and area; each choice's id is id + ':' + key, in the area id while open
   *   groups       [{ name, choices: [{ key, label }] }]
   *   chosen       the chosen keys; at: the id the cursor is on
   *   box, list    places in the parent: { left, top, width } and { left, top, width, height }
   */
  function Dropdown({ cursor, id, area, label, groups, chosen, at, isOpen, onOpenChange, onToggle, box, list }) {
    const count = chosen.length;
    return html`<div
        class=${'shop-search-host shop-dropdown' + (isOpen ? ' is-open' : '')}
        data-cursor-id=${id}
        data-cursor-area=${isOpen ? id : area}
        style=${{ left: px(box.left), top: px(box.top), width: px(box.width) }}
        onMouseEnter=${() => cursor.hover(id)}
        onMouseLeave=${() => cursor.hover(null)}
        onClick=${() => onOpenChange(!isOpen)}
      >
        <div class="hud-search shop-dropdown-box">${count ? label + ' (' + count + ')' : label}</div>
        ${cursor.cornersIf(at === id)}
      </div>
      ${
        isOpen
          ? html`<div class="shop-dropdown-catcher" onClick=${() => onOpenChange(false)}></div>
              <div
                class="shop-dropdown-list"
                style=${{ left: px(list.left), top: px(list.top), width: px(list.width), height: px(list.height) }}
              >
                <${ScrollBox}
                  box=${{ left: 0, top: 0, width: list.width - 2 * DROPDOWN_RIM, height: list.height - 2 * DROPDOWN_RIM }}
                  trackRight=${0}
                  colours=${SCROLL_COLOURS}
                >
                  ${groups.map(
                    (group) =>
                      html`<div key=${group.name} class="hud-text shop-dropdown-group">${group.name}</div>
                        ${group.choices.map((choice) => {
                          const choiceId = id + ':' + choice.key;
                          return html`<div
                            key=${choice.key}
                            class="shop-dropdown-choice"
                            data-cursor-id=${choiceId}
                            data-cursor-area=${id}
                            data-choice=${choice.key}
                            onMouseEnter=${() => cursor.hover(choiceId)}
                            onMouseLeave=${() => cursor.hover(null)}
                            onClick=${() => onToggle(choice.key)}
                          >
                            <span class=${'shop-check' + (chosen.includes(choice.key) ? ' is-on' : '')}></span>
                            <span class="hud-text">${choice.label}</span>
                            ${cursor.cornersIf(at === choiceId)}
                          </div>`;
                        })}`
                  )}
                </${ScrollBox}>
              </div>`
          : null
      }`;
  }
  /** The cursor ids of an open dropdown: its box, then each choice in order. */
  const dropdownItems = (id, groups) => [
    id,
    ...groups.flatMap((group) => group.choices.map((choice) => id + ':' + choice.key)),
  ];

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
    SHORT_PRICE_FROM,
    px,
    createMenuCursor,
    CursorButton,
    ItemCard,
    SearchStop,
    Dropdown,
    dropdownItems,
    nameHas,
  };
})();
