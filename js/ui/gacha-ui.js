/* ============ gacha-ui.js: the Main Menu Shop (G.GachaUI; #149 rework) ============
 * The gacha is gone (#133, acquisition rework); the file keeps its old name. Mockups: assets/excalidraw/Shop-*.svg;
 * plan: docs/ASCII Concept Maps/149 - Shop Rework Opening.md. A window on the menu screens' 1920 x 1080 stage over the
 * dimmed Main Menu (css/bw-shop.css). Every buying rule lives in G.Items and G.Grounds; this file draws and routes input.
 *   rail     four icon tabs down the window's left edge (assets/ui/shop_icons/), top to bottom: Pokeballs (#137 fills
 *            it), Character Upgrades (team item slots, berry slots), Team Items (100k unlocks), TRs (149f fills it).
 *            Flush with the window's left edge; the chosen tab uses its -selected art. A click or Q / E switches them.
 *   Exit     the team menu's button at 3 px per art pixel, bottom right; back to the Main Menu.
 *   pockets  the Character Upgrades pane (149b, mockup Shop-Character-Upgrades.svg): the Berry Pocket and the Team Items
 *            Pocket, each a box in the pause menu's detail-panel shape with its 2x2 slot grid (unbought slots dimmed), a
 *            divider, its name and line, and one Buy button for the next slot (Full once every slot is bought).
 *   items    the Team Items pane (149c, mockup Shop-Team-Items.svg): left, a search bar over a scrolling 3-column grid of
 *            cards for every team item not owned yet (icon, divider, name, description, Buy); right, the owned panel:
 *            a search bar over a scrolling 4-wide grid of the owned items, dimmed empty squares filling its visible rows,
 *            each with its hover tooltip. Inventory (beside Exit, this tab only) opens the Inventory screen.
 *   input    the selection cursor takes no tab. With the mouse it shows only on the eligible item under it (or nowhere);
 *            a key press snaps it back to the last item it was on (the kit's inputMode). Eligible items: the Buy
 *            buttons you can press, the owned squares, Inventory and Exit. An arrow moves it to the nearest eligible
 *            item that way (scrolling it into view), Enter presses, Esc leaves. Resting on an owned square by keys
 *            shows its tooltip after the Tooltip Delay setting (G.Settings cursorTooltipDelay, 1 s by default).
 */
G.GachaUI = (() => {
  const $ = G.UI.$;
  const kitOverlay = G.HudOverlay,
    railHost = document.getElementById('shop-rail'),
    stageHost = document.querySelector('#scr-gacha .shop-host');
  if (!kitOverlay || !kitOverlay.ready || !railHost || !stageHost) {
    console.warn('[Shop] the HUD kit did not load: the Shop cannot open');
    return { init() {}, open() {} };
  }
  const {
    html,
    signal,
    preact,
    hooks,
    Box,
    ItemGrid,
    IconCanvas,
    ScrollBox,
    SearchBar,
    Cursor,
    inputMode,
    TeamButton,
    REST_RIM,
    FOCUS_RIM,
    fitToStage,
    showTooltip,
    hideTooltip,
    tooltipHandlers,
  } = kitOverlay.kit;
  const fmt = (n) => n.toLocaleString('en-US');

  // ---------- tabs (top to bottom on the rail): key, name, icon file; each key's pane is #shop-<key> ----------
  const TABS = [
    { key: 'balls', name: 'Pokeballs', icon: 'pokeball' },
    { key: 'upgrades', name: 'Character Upgrades', icon: 'character-upgrade' },
    { key: 'items', name: 'Team Items', icon: 'team-item' },
    { key: 'trs', name: 'TRs', icon: 'tm-purchase' },
  ];
  const OPENING_TAB = 'items'; // the Shop opens on Team Items, as before the rework
  const ICON_PATH = 'assets/ui/shop_icons/';
  // ---------- sizes and places (stage pixels, inside the window; css/bw-shop.css places the window) ----------
  const WINDOW = { width: 1145, height: 670 },
    RAIL = { firstTop: 70, step: 130, cell: 96 }, // flush with the window's left edge; icons up to 32 px, drawn 3x (CSS)
    EXIT = { right: 30, bottom: 24, artWidth: 52, artPixel: 3 }, // the team menu's button at 3 px per art pixel
    TEAM_BUTTON_ROWS = 18;
  EXIT.width = EXIT.artWidth * EXIT.artPixel; // 156
  EXIT.height = TEAM_BUTTON_ROWS * EXIT.artPixel; // 54
  // the pocket cards (149b), in pane pixels: side by side from the pane's top left; inside each, the grid, the divider
  // (short of the rim), the name and line, then Buy at the bottom (the team menu button at 3 px per art pixel)
  const POCKET = {
    left: 40,
    top: 20,
    gap: 36,
    width: 260,
    height: 390, // room for a two-line pocket line above Buy
    gridArtSize: 28, // squares of 56 px, 28 px apart: a 140 px grid
    gridTop: 30,
    dividerTop: 196,
    textInset: 18,
    nameTop: 212,
    lineTop: 244,
    buyArtWidth: 76,
    buyBottom: 18,
  };
  POCKET.gridWidth = POCKET.gridArtSize * 2 * 2 + POCKET.gridArtSize;
  POCKET.buyWidth = POCKET.buyArtWidth * EXIT.artPixel; // 228
  POCKET.buyHeight = TEAM_BUTTON_ROWS * EXIT.artPixel; // 54
  // the pockets' colours (docs/UI-PALETTES.md "Berries pocket" and "Items pocket" ramps; the mockup's #303030 body)
  const BERRY_POCKET_RIM = { light: '#6ec188', base: '#20a048', dark: '#15682f' },
    TEAM_ITEM_POCKET_RIM = { light: '#d89db7', base: '#c86890', dark: '#82445e' },
    POCKET_BODY = '#303030';
  // the Team Items pane (149c), in pane pixels: the sale side on the left, the owned panel on the right; the cards' Buy is
  // the team menu button at 3 px per art pixel. This pane reaches 86 px lower than the others (css/bw-shop.css
  // .shop-pane-fixed), to the bottom of Inventory and Exit: 1005 x 616 (Jess 2026-11-17)
  const SALE = {
    width: 600,
    searchWidth: 584,
    listTop: 56,
    listWidth: 584,
    columns: 3,
    cardWidth: 186,
    cardHeight: 350, // room for a six-line description above Buy
    cardGap: 12,
    textInset: 10,
    iconSize: 64,
    iconTop: 12,
    dividerTop: 88,
    nameTop: 100,
    descriptionTop: 130,
    buyArtWidth: 58,
    buyBottom: 10,
  };
  SALE.cardInner = SALE.cardWidth - 4; // inside the card's 2 px rim
  SALE.buyWidth = SALE.buyArtWidth * EXIT.artPixel; // 174
  const OWNED = {
    left: 624,
    width: 377, // 4 px short of the pane's right edge, so a scaled-down stage never rounds its rim away
    height: 530,
    inset: 14, // inside the panel's 2 px rim
    searchWidth: 345,
    listTop: 70,
    columns: 4, // Jess 2026-11-17: four across; content updates will add many more team items, so it scrolls
    artSize: 30, // squares of 60 px, 30 px apart
    visibleRows: 5, // dimmed empty squares fill out at least these rows
  };
  OWNED.squareSize = OWNED.artSize * 2;
  OWNED.listWidth = OWNED.columns * OWNED.squareSize + (OWNED.columns - 1) * OWNED.artSize; // 330
  OWNED.listHeight = OWNED.visibleRows * OWNED.squareSize + (OWNED.visibleRows - 1) * OWNED.artSize; // 420
  // room inside the owned scroll box for the cursor's corners, which sit 4 px outside a square (Jess 2026-11-17: they
  // were clipped at the box's edges)
  const CURSOR_ROOM = 6;
  // the sale side sits CURSOR_ROOM in from the pane's top and left (the cursor on its search bar shows whole); its list
  // ends level with the bottom of Inventory and Exit, the pane's bottom (616)
  SALE.listHeight = 616 - CURSOR_ROOM - SALE.listTop; // 554
  const INVENTORY_BUTTON = { artWidth: 64, gap: 16 }; // left of Exit on the Team Items tab
  INVENTORY_BUTTON.width = INVENTORY_BUTTON.artWidth * EXIT.artPixel; // 192
  const SCROLL_COLOURS = { track: '#303030', thumb: '#29ceff', thumbRim: '#29ceff' }; // the mockup's teal bar
  const OWNED_TIP_PLACE = { side: 'below' };
  const SALE_ID = 'sale-', // cursor ids: a card's Buy, an owned square, the two search bars
    OWNED_ID = 'own-',
    SALE_SEARCH = 'search-sale',
    OWNED_SEARCH = 'search-owned';

  // ---------- state ----------
  const tab = signal(OPENING_TAB);
  const saveTick = signal(0); // bumped on every refresh: the drawn pieces read the save again
  const saleQuery = signal(''), // the Team Items search bars' text
    ownedQuery = signal('');
  const openCount = signal(0); // each opening sends the scroll boxes back to the top
  // The selection cursor (Jess, 2026-11-16): the tabs never take it (Q and E or a click switch them). focus is the last
  // item it was on; hovered is the eligible item under the mouse, or null. Using the keys (kit inputMode 'keys') it shows
  // on focus; using the mouse it shows only on hovered, so it leaves when the mouse is over anything else. Each eligible
  // item's element carries data-cursor-id, which the arrows measure.
  const focus = signal('exit'),
    hovered = signal(null);
  /** The items the cursor may sit on now: the shown tab's pressable Buys and owned squares, then Inventory and Exit. */
  function eligibleItems() {
    saveTick.value; // read again after a purchase or a coin change
    if (tab.value === 'upgrades')
      return [
        ...pockets()
          .filter((pocket) => pocket.canBuy)
          .map((pocket) => pocket.id),
        'exit',
      ];
    if (tab.value === 'items') {
      const view = teamItemsView();
      return [
        SALE_SEARCH,
        ...(view.canAfford ? view.forSale.map((item) => SALE_ID + item.id) : []),
        OWNED_SEARCH,
        ...view.owned.map((item) => OWNED_ID + item.id),
        'inventory',
        'exit',
      ];
    }
    return ['exit'];
  }
  /**
   * Where the cursor shows: by keys, the last item it was on (Exit if that one can no longer take it); by mouse, the
   * eligible item under the pointer, or nowhere.
   */
  function cursorOn() {
    const items = eligibleItems();
    if (inputMode.value === 'keys') return items.includes(focus.value) ? focus.value : 'exit';
    return items.includes(hovered.value) ? hovered.value : null;
  }
  /** The mouse entered (an id) or left (null) an eligible item; entering also makes it the keys' starting point. */
  function hover(id) {
    hovered.value = id;
    if (id) focus.value = id;
  }
  const tabIndex = (key) => TABS.findIndex((entry) => entry.key === key);

  function init() {
    // PokeCoins changed while the Shop is open (a purchase, a debug command): its buttons follow at once.
    G.DB.onSave(() => {
      if (G.UI.isOpen('scr-gacha')) refresh();
    });
    addEventListener('keydown', onKey);
  }

  function open() {
    G.UI.show('scr-gacha', true);
    fitStage();
    tab.value = OPENING_TAB;
    saleQuery.value = '';
    ownedQuery.value = '';
    openCount.value++;
    focus.value = 'exit';
    hovered.value = null;
    refresh();
  }

  function close() {
    if (!G.UI.isOpen('scr-gacha')) return;
    G.Audio.sfx('back');
    G.MenuUI.open();
  }

  /** Shows the tab with this key and redraws it. */
  function pickTab(key) {
    if (key === tab.value) return;
    tab.value = key;
    G.Audio.sfx('select');
    refresh();
  }

  /** Redraw the current Shop tab. */
  function refresh() {
    for (const { key } of TABS) $('shop-' + key).classList.toggle('hidden', key !== tab.value);
    saveTick.value++;
    G.UI.refreshCoins();
  }

  // ---------- keys (the Main Menu screens read the page's keydown, as menu.js does) ----------
  function onKey(event) {
    if (!G.UI.isOpen('scr-gacha') || G.UI.isOpen('scr-ask') || event.target.closest('input, textarea, select')) return;
    const key = event.key,
      direction = directionOf(event);
    if (key === 'Escape') close();
    else if (key === 'Enter') press();
    else if (key === 'q' || key === 'Q') stepTab(-1);
    else if (key === 'e' || key === 'E') stepTab(1);
    else if (direction) stepFocus(direction[0], direction[1]);
    else return;
    event.preventDefault();
  }

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

  /** Q and E: the tab above or below the shown one on the rail (no wrap). */
  function stepTab(step) {
    const index = tabIndex(tab.value) + step;
    if (index >= 0 && index < TABS.length) pickTab(TABS[index].key);
  }

  /** The element an eligible item is drawn in (it carries data-cursor-id), or null. */
  const cursorElement = (id) => stageHost.querySelector('[data-cursor-id="' + CSS.escape(id) + '"]');

  /**
   * The arrows (149c): the nearest eligible item that way, measured between the items' centres on the screen, a step
   * across the way counting double; none that way keeps the cursor where it is. What it lands on scrolls into view.
   * Up and down stay inside the item's own area (data-cursor-area: the sale side, the owned panel) while it has an
   * item that way, so the top item's Up goes to that area's search bar, not the other grid (Jess 2026-11-17). Up never
   * leaves an area (on its search bar it stays put); Down with nothing below in the area goes on to Inventory and Exit.
   */
  function stepFocus(directionX, directionY) {
    const from = cursorOn() || focus.value,
      fromElement = cursorElement(from);
    if (!fromElement) return;
    const centre = (element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width };
    };
    const start = centre(fromElement),
      fromArea = fromElement.dataset.cursorArea;
    const nearestIn = (sameAreaOnly) => {
      let best = null,
        bestScore = Infinity;
      for (const id of eligibleItems()) {
        const element = id !== from && cursorElement(id);
        if (!element || (sameAreaOnly && element.dataset.cursorArea !== fromArea)) continue;
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
    const best =
      directionY && fromArea ? nearestIn(true) || (directionY > 0 ? nearestIn(false) : null) : nearestIn(false);
    if (!best) return;
    focus.value = best.id;
    showInScrollBox(best.element);
    G.Audio.sfx('hover');
  }

  /**
   * Scrolls the item's own scroll box (only that box: the pane never moves) so the whole of it shows: for a card's Buy,
   * the whole card (Jess 2026-11-17). A few pixels of margin keep the cursor's corners in view too.
   */
  function showInScrollBox(element) {
    const box = element.closest('.hud-scroll-box');
    if (!box) return;
    const target = element.closest('.shop-card') || element,
      boxRect = box.getBoundingClientRect(),
      targetRect = target.getBoundingClientRect(),
      screenScale = boxRect.height / box.clientHeight, // the stage is scaled to fit the window
      margin = CURSOR_ROOM;
    if (targetRect.top < boxRect.top) box.scrollTop -= (boxRect.top - targetRect.top) / screenScale + margin;
    else if (targetRect.bottom > boxRect.bottom)
      box.scrollTop += (targetRect.bottom - boxRect.bottom) / screenScale + margin;
  }

  /** Enter on whatever the cursor is on. */
  function press() {
    const at = cursorOn();
    if (!at) return;
    if (at === 'exit') return close();
    if (at === 'inventory') return openInventory();
    if (at === SALE_SEARCH || at === OWNED_SEARCH) return cursorElement(at).querySelector('input').focus(); // type; Enter or Esc gives the keys back
    if (at.startsWith(SALE_ID)) return buyItem(at.slice(SALE_ID.length));
    const pocket = pockets().find((entry) => entry.id === at);
    if (pocket && pocket.canBuy) pocket.buy();
  }

  /** Inventory (Team Items tab): the Inventory screen, over the still dimmed Main Menu. */
  function openInventory() {
    G.Audio.sfx('select');
    hideTooltip();
    G.MenuUI.openInventory();
  }

  /**
   * By keys, the cursor resting on an owned square shows that item's tooltip after the Tooltip Delay setting (Jess
   * 2026-11-17: keyboard and, later, controller players see tooltips too). The mouse shows them at once (ItemGrid).
   */
  function CursorTip() {
    const at = cursorOn(),
      byKeys = inputMode.value === 'keys';
    hooks.useEffect(() => {
      if (!byKeys || !at || !at.startsWith(OWNED_ID)) return undefined;
      let shown = false;
      const delaySeconds = +G.Settings.get('cursorTooltipDelay') || 1;
      const timer = setTimeout(() => {
        const element = cursorElement(at),
          item = G.Items.BY[at.slice(OWNED_ID.length)];
        if (!element || !item) return;
        showTooltip(element, itemTip(item), OWNED_TIP_PLACE);
        shown = true;
      }, delaySeconds * 1000);
      return () => {
        clearTimeout(timer);
        if (shown) hideTooltip();
      };
    }, [at, byKeys]);
    return null;
  }

  // ---------- drawing the rail and Exit ----------
  const px = (value) => value + 'px';

  function Tab({ entry, index }) {
    const selected = entry.key === tab.value;
    return html`<div
      class=${'shop-tab' + (selected ? ' is-selected' : '')}
      data-tab=${entry.key}
      style=${{ left: 0, top: px(RAIL.firstTop + index * RAIL.step), width: px(RAIL.cell), height: px(RAIL.cell) }}
      onClick=${() => pickTab(entry.key)}
    >
      <img src=${ICON_PATH + entry.icon + (selected ? '-selected' : '') + '.png'} alt=${entry.name} />
    </div>`;
  }

  function Rail() {
    const at = cursorOn(),
      exitFocused = at === 'exit',
      inventoryFocused = at === 'inventory',
      exitLeft = WINDOW.width - EXIT.right - EXIT.width,
      buttonTop = WINDOW.height - EXIT.bottom - EXIT.height;
    return html`<div>
      ${TABS.map((entry, index) => html`<${Tab} key=${entry.key} entry=${entry} index=${index} />`)}
      <${CursorTip} />
      ${
        tab.value === 'items'
          ? html`<div
              class="shop-button shop-inventory"
              data-cursor-id="inventory"
              style=${{
                left: px(exitLeft - INVENTORY_BUTTON.gap - INVENTORY_BUTTON.width),
                top: px(buttonTop),
                width: px(INVENTORY_BUTTON.width),
                height: px(EXIT.height),
              }}
              onMouseLeave=${() => hover(null)}
            >
              <${TeamButton}
                id="shop-inventory"
                label="Inventory"
                artWidth=${INVENTORY_BUTTON.artWidth}
                artPixel=${EXIT.artPixel}
                rim=${REST_RIM}
                focusRim=${FOCUS_RIM}
                focused=${inventoryFocused}
                onEnter=${() => hover('inventory')}
                onPress=${openInventory}
              />
              ${inventoryFocused ? html`<${Cursor} />` : null}
            </div>`
          : null
      }
      <div
        class="shop-button shop-exit"
        data-cursor-id="exit"
        style=${{
          left: px(exitLeft),
          top: px(buttonTop),
          width: px(EXIT.width), // the cursor's corners sit on this box
          height: px(EXIT.height),
        }}
        onMouseLeave=${() => hover(null)}
      >
        <${TeamButton}
          id="shop-exit"
          label="Exit"
          artWidth=${EXIT.artWidth}
          artPixel=${EXIT.artPixel}
          rim=${REST_RIM}
          focusRim=${FOCUS_RIM}
          focused=${exitFocused}
          onEnter=${() => hover('exit')}
          onPress=${close}
        />
        ${exitFocused ? html`<${Cursor} />` : null}
      </div>
    </div>`;
  }

  preact.render(html`<${Rail} />`, railHost);
  const fitStage = fitToStage(stageHost);

  // ---------------- Team Items tab (149c): cards for sale on the left, the owned panel on the right ----------------
  // function declarations, not arrows: the rail is drawn before this part of the file runs
  function itemTip(item) {
    return { name: item.name, lines: [item.desc], variant: 'item' };
  }
  /** A search bar's filter: the item's name holds the typed text (any case); empty text keeps every item. */
  function nameHas(query) {
    const text = query.trim().toLowerCase();
    return (item) => !text || item.name.toLowerCase().includes(text);
  }
  /** What the pane shows now: the team items for sale and owned (each narrowed by its search bar), the price. */
  function teamItemsView() {
    const save = G.DB.save,
      price = G.Items.TEAM_ITEM_PRICE;
    if (!save) return { anyForSale: false, forSale: [], owned: [], price, canAfford: false };
    const teamItems = G.Items.LIST.filter((item) => item.tier === 'run');
    const notOwned = teamItems.filter((item) => !G.Items.unlocked(save, item.id));
    return {
      anyForSale: notOwned.length > 0,
      forSale: notOwned.filter(nameHas(saleQuery.value)),
      owned: teamItems.filter((item) => G.Items.unlocked(save, item.id)).filter(nameHas(ownedQuery.value)),
      price,
      canAfford: save.coins >= price,
    };
  }

  function SaleCard({ item, price, canAfford, focused }) {
    const id = SALE_ID + item.id,
      buyHeight = TEAM_BUTTON_ROWS * EXIT.artPixel;
    return html`<div
      class="shop-card"
      data-item=${item.id}
      style=${{ width: px(SALE.cardWidth), height: px(SALE.cardHeight) }}
    >
      <div class="shop-card-icon" style=${{ left: px((SALE.cardInner - SALE.iconSize) / 2), top: px(SALE.iconTop) }}>
        <${IconCanvas} icon=${item.icon || item.id} size=${SALE.iconSize} />
      </div>
      <div
        class="shop-card-divider"
        style=${{ left: px(SALE.textInset), right: px(SALE.textInset), top: px(SALE.dividerTop) }}
      ></div>
      <div
        class="hud-text shop-card-name"
        style=${{ left: px(SALE.textInset), right: px(SALE.textInset), top: px(SALE.nameTop) }}
      >
        ${item.name}
      </div>
      <div
        class="hud-text shop-card-description"
        style=${{ left: px(SALE.textInset), right: px(SALE.textInset), top: px(SALE.descriptionTop) }}
      >
        ${item.desc}
      </div>
      <div
        class="shop-button shop-card-buy"
        data-cursor-id=${id}
        data-cursor-area="sale"
        style=${{
          left: px((SALE.cardInner - SALE.buyWidth) / 2),
          top: px(SALE.cardHeight - 4 - SALE.buyBottom - buyHeight),
          width: px(SALE.buyWidth),
          height: px(buyHeight),
        }}
        onMouseEnter=${() => hover(canAfford ? id : null)}
        onMouseLeave=${() => hover(null)}
      >
        <${TeamButton}
          id=${id}
          label=${'Buy ' + fmt(price)}
          artWidth=${SALE.buyArtWidth}
          artPixel=${EXIT.artPixel}
          rim=${REST_RIM}
          focusRim=${FOCUS_RIM}
          focused=${focused}
          disabled=${!canAfford}
          onPress=${() => canAfford && buyItem(item.id)}
        />
        ${focused ? html`<${Cursor} />` : null}
      </div>
    </div>`;
  }

  /** The owned panel's squares: owned items four across, then dimmed empties filling out at least the visible rows. */
  function ownedSlots(owned, at) {
    const rows = Math.max(OWNED.visibleRows, Math.ceil(owned.length / OWNED.columns));
    return Array.from({ length: rows * OWNED.columns }, (_, index) => {
      const item = owned[index];
      if (!item) return { key: 'empty-' + index, icon: null, locked: true };
      const id = OWNED_ID + item.id,
        tip = tooltipHandlers(itemTip(item), OWNED_TIP_PLACE);
      return {
        key: item.id,
        icon: item.icon || item.id,
        className: 'shop-owned-slot',
        attrs: {
          'data-cursor-id': id,
          'data-cursor-area': 'owned',
          onMouseEnter: (event) => {
            hover(id);
            tip.onMouseEnter(event);
          },
          onMouseMove: tip.onMouseMove,
          onMouseLeave: (event) => {
            hover(null);
            tip.onMouseLeave(event);
          },
        },
        overlay: at === id ? html`<${Cursor} />` : null,
      };
    });
  }

  /** A search bar as a cursor stop at the top of its area: the cursor's corners sit on it; Enter there starts typing. */
  function SearchStop({ id, area, at, className, children }) {
    return html`<div
      class=${'shop-search-host ' + className}
      data-cursor-id=${id}
      data-cursor-area=${area}
      onMouseEnter=${() => hover(id)}
      onMouseLeave=${() => hover(null)}
    >
      ${children} ${at === id ? html`<${Cursor} />` : null}
    </div>`;
  }

  function TeamItemsPane() {
    saveTick.value; // redraw after a purchase or a coin change
    if (!G.DB.save) return null;
    const view = teamItemsView(),
      at = cursorOn();
    const emptyLine = !view.anyForSale
      ? 'You own every team item.'
      : !view.forSale.length
        ? 'No team item matches.'
        : null;
    return html`<div class="shop-items-pane">
      <div class="shop-sale" style=${{ left: px(CURSOR_ROOM), top: px(CURSOR_ROOM), width: px(SALE.width) }}>
        <${SearchStop} id=${SALE_SEARCH} area="sale" at=${at} className="shop-sale-search-host">
          <${SearchBar}
            value=${saleQuery.value}
            onChange=${(text) => (saleQuery.value = text)}
            placeholder="Search team items"
            width=${SALE.searchWidth}
            className="shop-sale-search"
          />
        </${SearchStop}>
        <${ScrollBox}
          box=${{ left: 0, top: SALE.listTop, width: SALE.listWidth, height: SALE.listHeight }}
          trackRight=${0}
          colours=${SCROLL_COLOURS}
          resetOn=${[saleQuery.value, openCount.value]}
        >
          <div
            class="shop-sale-grid"
            style=${{
              gridTemplateColumns: `repeat(${SALE.columns}, ${px(SALE.cardWidth)})`,
              gap: px(SALE.cardGap),
              paddingBottom: px(SALE.cardGap), // space under the last row, so its cards show whole at the end
            }}
          >
            ${view.forSale.map(
              (item) =>
                html`<${SaleCard}
                  key=${item.id}
                  item=${item}
                  price=${view.price}
                  canAfford=${view.canAfford}
                  focused=${at === SALE_ID + item.id}
                />`
            )}
          </div>
          ${emptyLine ? html`<div class="hud-text shop-empty">${emptyLine}</div>` : null}
        </${ScrollBox}>
      </div>
      <div class="shop-owned" style=${{ left: px(OWNED.left), width: px(OWNED.width), height: px(OWNED.height) }}>
        <${SearchStop} id=${OWNED_SEARCH} area="owned" at=${at} className="shop-owned-search-host">
          <${SearchBar}
            value=${ownedQuery.value}
            onChange=${(text) => (ownedQuery.value = text)}
            placeholder="Search owned"
            width=${OWNED.searchWidth}
            className="shop-owned-search"
          />
        </${SearchStop}>
        <${ScrollBox}
          box=${{
            left: OWNED.inset - CURSOR_ROOM,
            top: OWNED.listTop - CURSOR_ROOM,
            width: OWNED.listWidth + 2 * CURSOR_ROOM,
            height: OWNED.listHeight + 2 * CURSOR_ROOM,
          }}
          trackRight=${OWNED.inset - CURSOR_ROOM - 6}
          colours=${SCROLL_COLOURS}
          resetOn=${[ownedQuery.value, openCount.value]}
        >
          <div class="shop-owned-room" style=${{ padding: px(CURSOR_ROOM) }}>
            <${ItemGrid}
              slots=${ownedSlots(view.owned, at)}
            artSize=${OWNED.artSize}
            columns=${OWNED.columns}
            tipPlace=${OWNED_TIP_PLACE}
              className="shop-owned-grid"
            />
          </div>
        </${ScrollBox}>
      </div>
    </div>`;
  }
  preact.render(html`<${TeamItemsPane} />`, $('shop-items'));

  async function buyItem(id) {
    const it = G.Items.BY[id],
      price = G.Items.TEAM_ITEM_PRICE;
    const yes = await G.UI.ask(`Spend ${fmt(price)} PokéCoins on ${it.name}?`, {
      title: 'Buy team item',
      ok: 'Buy',
      note: `You will have ${fmt(Math.max(0, G.DB.save.coins - price))} left.`,
    });
    if (!yes) return;
    const r = G.Items.buyTeamItem(G.DB.save, id);
    if (!r.ok) {
      G.Audio.sfx('error');
      G.UI.toast(r.error === 'poor' ? 'Not enough PokéCoins' : 'You cannot buy that');
      refresh();
      return;
    }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(`Unlocked ${it.name}! Equip it in Inventory.`);
    refresh();
  }

  // ---------------- Character Upgrades tab: the Berry Pocket and the Team Items Pocket (149b) ----------------
  /** Each pocket as the save has it now: slots owned of max, the next slot's price, whether its Buy can be pressed. */
  function pockets() {
    const save = G.DB.save;
    if (!save) return [];
    const pocket = (key, name, line, rim, owned, max, priceOf, buy) => {
      const full = owned >= max,
        price = full ? 0 : priceOf(owned + 1);
      return {
        id: 'buy-' + key,
        key,
        name,
        line,
        rim,
        owned,
        max,
        full,
        price,
        canBuy: !full && save.coins >= price,
        buy: () => buy(owned + 1),
      };
    };
    return [
      pocket(
        'berry',
        'Berry Pocket',
        'Holds Berries during a run.',
        BERRY_POCKET_RIM,
        G.Grounds.berrySlots(save),
        G.Grounds.BERRY_SLOTS_MAX,
        (slotNumber) => G.Grounds.berrySlotPrice(slotNumber),
        buyBerrySlot
      ),
      pocket(
        'item',
        'Team Items Pocket',
        'Holds Team Items during a run.',
        TEAM_ITEM_POCKET_RIM,
        G.Items.runSlots(save),
        G.Items.RUN_SLOTS_MAX,
        (slotNumber) => G.Items.slotPrice(slotNumber),
        buySlot
      ),
    ];
  }

  function Pocket({ pocket, index }) {
    const focused = cursorOn() === pocket.id;
    const slots = Array.from({ length: pocket.max }, (_, slotIndex) => ({
      key: slotIndex,
      icon: null,
      locked: slotIndex >= pocket.owned,
    }));
    return html`<${Box}
      left=${POCKET.left + index * (POCKET.width + POCKET.gap)}
      top=${POCKET.top}
      width=${POCKET.width}
      height=${POCKET.height}
      rim=${pocket.rim}
      body=${POCKET_BODY}
      className="shop-pocket"
    >
      <div
        class="shop-pocket-grid"
        data-pocket=${pocket.key}
        style=${{ left: px((POCKET.width - POCKET.gridWidth) / 2), top: px(POCKET.gridTop) }}
      >
        <${ItemGrid} slots=${slots} artSize=${POCKET.gridArtSize} />
      </div>
      <div
        class="shop-pocket-divider"
        style=${{ left: px(POCKET.textInset), right: px(POCKET.textInset), top: px(POCKET.dividerTop) }}
      ></div>
      <div class="hud-text shop-pocket-name" style=${{ left: px(POCKET.textInset), top: px(POCKET.nameTop) }}>
        ${pocket.name}
      </div>
      <div
        class="hud-text shop-pocket-line"
        style=${{ left: px(POCKET.textInset), right: px(POCKET.textInset), top: px(POCKET.lineTop) }}
      >
        ${pocket.line}
      </div>
      <div
        class="shop-button shop-buy"
        data-cursor-id=${pocket.id}
        style=${{
          left: px((POCKET.width - POCKET.buyWidth) / 2),
          top: px(POCKET.height - POCKET.buyBottom - POCKET.buyHeight),
          width: px(POCKET.buyWidth),
          height: px(POCKET.buyHeight),
        }}
        onMouseEnter=${() => hover(pocket.canBuy ? pocket.id : null)}
        onMouseLeave=${() => hover(null)}
      >
        <${TeamButton}
          id=${pocket.id}
          label=${pocket.full ? 'Full' : 'Buy ' + fmt(pocket.price)}
          artWidth=${POCKET.buyArtWidth}
          artPixel=${EXIT.artPixel}
          rim=${REST_RIM}
          focusRim=${FOCUS_RIM}
          focused=${focused}
          disabled=${!pocket.canBuy}
          onPress=${() => pocket.canBuy && pocket.buy()}
        />
        ${focused ? html`<${Cursor} />` : null}
      </div>
    </${Box}>`;
  }

  function Pockets() {
    saveTick.value; // redraw after a purchase or a coin change
    return html`<div>
      ${pockets().map((pocket, index) => html`<${Pocket} key=${pocket.key} pocket=${pocket} index=${index} />`)}
    </div>`;
  }
  preact.render(html`<${Pockets} />`, $('shop-upgrades'));

  async function buyBerrySlot(slotNumber) {
    const price = G.Grounds.berrySlotPrice(slotNumber);
    const yes = await G.UI.ask(`Spend ${fmt(price)} PokéCoins on berry slot ${slotNumber}?`, {
      title: 'Buy berry slot',
      ok: 'Buy',
      note: `You will have ${fmt(Math.max(0, G.DB.save.coins - price))} left.`,
    });
    if (!yes) return;
    const result = G.Grounds.buyBerrySlot(G.DB.save);
    if (!result.ok) {
      G.Audio.sfx('error');
      G.UI.toast(result.error === 'poor' ? 'Not enough PokéCoins' : 'You cannot buy that');
      refresh();
      return;
    }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(`Berry slot ${result.slots} unlocked!`);
    refresh();
  }

  async function buySlot(k) {
    const price = G.Items.slotPrice(k);
    const yes = await G.UI.ask(`Spend ${fmt(price)} PokéCoins on team item slot ${k}?`, {
      title: 'Buy team item slot',
      ok: 'Buy',
      note: `You will have ${fmt(Math.max(0, G.DB.save.coins - price))} left.`,
    });
    if (!yes) return;
    const r = G.Items.buySlot(G.DB.save);
    if (!r.ok) {
      G.Audio.sfx('error');
      G.UI.toast(r.error === 'poor' ? 'Not enough PokéCoins' : 'You cannot buy that');
      refresh();
      return;
    }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(`Team item slot ${r.slots} unlocked!`);
    refresh();
  }

  return { init, open };
})();
