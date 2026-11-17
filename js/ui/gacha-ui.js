/* ============ gacha-ui.js: the Main Menu Shop (G.GachaUI; #149 rework) ============
 * The gacha is gone (#133, acquisition rework); the file keeps its old name. Mockups: assets/excalidraw/Shop-*.svg;
 * plan: docs/ASCII Concept Maps/149 - Shop Rework Opening.md. A window on the menu screens' 1920 x 1080 stage over the
 * dimmed Main Menu (css/bw-shop.css). Every buying rule lives in G.Items and G.Grounds; this file draws and routes input.
 *   rail     four icon tabs down the window's left edge (assets/ui/shop_icons/), top to bottom: Pokeballs (149e, its
 *            own file js/ui/shop-balls.js; #137 wires its buys), Character Upgrades (team item slots, berry slots), Team
 *            Items (100k unlocks), TMs (149f, its own file js/ui/shop-tms.js: moves a Pokemon learns for good).
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
 *            shows its tooltip after the Tooltip Delay setting (G.Settings cursorTooltipDelay, 1 s by default). The
 *            cursor's rules, the item card and the buttons are shared pieces (js/ui/menu-window-kit.js, #149d).
 */
G.GachaUI = (() => {
  const $ = G.UI.$;
  const kitOverlay = G.HudOverlay,
    railHost = document.getElementById('shop-rail'),
    stageHost = document.querySelector('#scr-gacha .shop-host');
  const windowKit = G.MenuWindowKit,
    ballsPane = G.ShopBallsPane;
  if (
    !kitOverlay ||
    !kitOverlay.ready ||
    !windowKit.ready ||
    !ballsPane.ready ||
    !G.ShopTmsPane.ready ||
    !railHost ||
    !stageHost
  ) {
    console.warn('[Shop] the HUD kit did not load: the Shop cannot open');
    return { init() {}, open() {} };
  }
  const { html, signal, preact, Box, ItemGrid, ScrollBox, SearchBar, fitToStage, hideTooltip, tooltipHandlers } =
    kitOverlay.kit;
  const {
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
  } = windowKit;
  const fmt = (n) => n.toLocaleString('en-US');

  // ---------- tabs (top to bottom on the rail): key, name, icon file; each key's pane is #shop-<key> ----------
  const TABS = [
    { key: 'balls', name: 'Pokeballs', icon: 'pokeball' },
    { key: 'upgrades', name: 'Character Upgrades', icon: 'character-upgrade' },
    { key: 'items', name: 'Team Items', icon: 'team-item' },
    { key: 'tms', name: 'TMs', icon: 'tm-purchase' },
  ];
  const OPENING_TAB = 'items'; // the Shop opens on Team Items, as before the rework
  const ICON_PATH = 'assets/ui/shop_icons/';
  // ---------- sizes and places (stage pixels, inside the window; css/bw-shop.css places the window) ----------
  const WINDOW = { width: 1145, height: 670 },
    RAIL = { firstTop: 70, step: 130, cell: 96 }, // flush with the window's left edge; icons up to 32 px, drawn 3x (CSS)
    EXIT = { right: 30, bottom: 24, artWidth: 52 }; // the team menu's button at 3 px per art pixel
  EXIT.width = EXIT.artWidth * BUTTON.artPixel; // 156
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
  POCKET.buyWidth = POCKET.buyArtWidth * BUTTON.artPixel; // 228
  // the pockets' colours (docs/UI-PALETTES.md "Berries pocket" and "Items pocket" ramps; the mockup's #303030 body)
  const BERRY_POCKET_RIM = { light: '#6ec188', base: '#20a048', dark: '#15682f' },
    TEAM_ITEM_POCKET_RIM = { light: '#d89db7', base: '#c86890', dark: '#82445e' },
    POCKET_BODY = '#303030';
  // the Team Items pane (149c), in pane pixels: the sale side (the kit's item cards) on the left, the owned panel on the
  // right. This pane reaches 86 px lower than the others (css/bw-shop.css .shop-pane-fixed), to the bottom of Inventory
  // and Exit: 1005 x 616 (Jess 2026-11-17)
  const SALE = {
    width: 600,
    searchWidth: 584,
    listTop: 56,
    listWidth: 584,
    columns: 3,
  };
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
  // the owned scroll box has CURSOR_ROOM around its squares, so the cursor's corners are never clipped (Jess 2026-11-17);
  // the sale side sits CURSOR_ROOM in from the pane's top and left (the cursor on its search bar shows whole); its list
  // ends level with the bottom of Inventory and Exit, the pane's bottom (616)
  SALE.listHeight = 616 - CURSOR_ROOM - SALE.listTop; // 554
  const INVENTORY_BUTTON = { artWidth: 64, gap: 16 }; // left of Exit on the Team Items tab
  INVENTORY_BUTTON.width = INVENTORY_BUTTON.artWidth * BUTTON.artPixel; // 192
  const OWNED_TIP_PLACE = { side: 'below' };
  // what a Buy that cannot buy says when pressed (#151, decision 2026-11-17-unaffordable-buttons-take-the-cursor)
  const UNAFFORDABLE = 'Unable to Afford',
    POCKET_FULL = 'All belt slots are full.';
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
  // The selection cursor (Jess, 2026-11-16; the kit's createMenuCursor): the tabs never take it (Q and E or a click
  // switch them). Resting on an owned square by keys shows its tooltip after the Tooltip Delay.
  const cursor = createMenuCursor({
    host: stageHost,
    isOpen: () => G.UI.isOpen('scr-gacha'),
    eligibleItems,
    home: 'exit',
    press,
    escape: () => (tab.value === 'tms' && tmsPane.escape()) || (tab.value === 'balls' && ballsPane.escape()) || close(),
    keys: { q: () => stepTab(-1), e: () => stepTab(1) },
    tipFor: (id) => (id.startsWith(OWNED_ID) ? itemTip(G.Items.BY[id.slice(OWNED_ID.length)]) : null),
    tipPlace: OWNED_TIP_PLACE,
  });
  // the TMs tab (149f) keeps its own state and draws itself; it reaches the cursor and redraws the Shop through these
  const tmsPane = G.ShopTmsPane.create({ cursor, refresh: () => refresh() });
  /**
   * The items the cursor may sit on now: the shown tab's Buys (one you cannot afford, or a Full pocket's, too: it refuses
   * when pressed, #151) and owned squares, then Inventory and Exit.
   */
  function eligibleItems() {
    saveTick.value; // read again after a purchase or a coin change
    if (tab.value === 'balls') return [...ballsPane.cursorItems(), 'exit'];
    if (tab.value === 'tms') return tmsPane.cursorItems(); // Exit included, unless a filter list is open
    if (tab.value === 'upgrades') return [...pockets().map((pocket) => pocket.id), 'exit'];
    if (tab.value === 'items') {
      const view = teamItemsView();
      return [
        SALE_SEARCH,
        ...view.forSale.map((item) => SALE_ID + item.id),
        OWNED_SEARCH,
        ...view.owned.map((item) => OWNED_ID + item.id),
        'inventory',
        'exit',
      ];
    }
    return ['exit'];
  }
  const tabIndex = (key) => TABS.findIndex((entry) => entry.key === key);

  function init() {
    // PokeCoins changed while the Shop is open (a purchase, a debug command): its buttons follow at once.
    G.DB.onSave(() => {
      if (G.UI.isOpen('scr-gacha')) refresh();
    });
    addEventListener('keydown', cursor.onKey);
  }

  function open() {
    G.UI.show('scr-gacha', true);
    fitStage();
    tab.value = OPENING_TAB;
    saleQuery.value = '';
    ownedQuery.value = '';
    openCount.value++;
    tmsPane.reset();
    ballsPane.reset();
    cursor.moveTo('exit');
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

  /** Q and E: the tab above or below the shown one on the rail (no wrap). */
  function stepTab(step) {
    const index = tabIndex(tab.value) + step;
    if (index >= 0 && index < TABS.length) pickTab(TABS[index].key);
  }

  /** Enter on the item the cursor is on. */
  function press(at) {
    if (at === 'exit') return close();
    if (at === 'inventory') return openInventory();
    if (tab.value === 'balls' && ballsPane.press(at)) return;
    if (tab.value === 'tms' && tmsPane.press(at)) return;
    if (at === SALE_SEARCH || at === OWNED_SEARCH) return cursor.elementOf(at).querySelector('input').focus(); // type; Enter or Esc gives the keys back
    if (at.startsWith(SALE_ID)) return buyItem(at.slice(SALE_ID.length));
    const pocket = pockets().find((entry) => entry.id === at);
    if (pocket) pocket.buy(); // a refusing Buy never gets here: the cursor's Enter refuses it (the kit)
  }

  /** Inventory (Team Items tab): the Inventory screen, over the still dimmed Main Menu. */
  function openInventory() {
    G.Audio.sfx('select');
    hideTooltip();
    G.InventoryUI.open();
  }

  // ---------- drawing the rail and Exit ----------

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
    const exitLeft = WINDOW.width - EXIT.right - EXIT.width,
      buttonTop = WINDOW.height - EXIT.bottom - BUTTON.height;
    return html`<div>
      ${TABS.map((entry, index) => html`<${Tab} key=${entry.key} entry=${entry} index=${index} />`)}
      <${cursor.CursorTip} />
      ${
        tab.value === 'items'
          ? html`<${CursorButton}
              cursor=${cursor}
              id="inventory"
              action="shop-inventory"
              label="Inventory"
              artWidth=${INVENTORY_BUTTON.artWidth}
              onPress=${openInventory}
              className="shop-inventory"
              style=${{ left: px(exitLeft - INVENTORY_BUTTON.gap - INVENTORY_BUTTON.width), top: px(buttonTop) }}
            />`
          : null
      }
      <${CursorButton}
        cursor=${cursor}
        id="exit"
        action="shop-exit"
        label="Exit"
        artWidth=${EXIT.artWidth}
        onPress=${close}
        className="shop-exit"
        style=${{ left: px(exitLeft), top: px(buttonTop) }}
      />
    </div>`;
  }

  preact.render(html`<${Rail} />`, railHost);
  const fitStage = fitToStage(stageHost);

  // ---------------- Pokeballs tab (149e, #137): drawn by js/ui/shop-balls.js, which also buys ----------------
  function BallsTab() {
    saveTick.value; // redraw after a coin or belt change
    return html`<${ballsPane.Pane} cursor=${cursor} openCount=${openCount.value} />`;
  }
  preact.render(html`<${BallsTab} />`, $('shop-balls'));

  // ---------------- TMs tab (149f): drawn by js/ui/shop-tms.js ----------------
  function TmsTab() {
    saveTick.value; // redraw after a purchase or a coin change
    if (tab.value !== 'tms') return null; // drawn only while shown: its Pokebox grid holds hundreds of portraits
    return html`<${tmsPane.Pane} openCount=${openCount.value} />`;
  }
  preact.render(html`<${TmsTab} />`, $('shop-tms'));

  // ---------------- Team Items tab (149c): cards for sale on the left, the owned panel on the right ----------------
  // function declarations, not arrows: the rail is drawn before this part of the file runs
  function itemTip(item) {
    return { name: item.name, lines: [item.desc], variant: 'item' };
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
            cursor.hover(id);
            tip.onMouseEnter(event);
          },
          onMouseMove: tip.onMouseMove,
          onMouseLeave: (event) => {
            cursor.hover(null);
            tip.onMouseLeave(event);
          },
        },
        overlay: cursor.cornersIf(at === id),
      };
    });
  }

  function TeamItemsPane() {
    saveTick.value; // redraw after a purchase or a coin change
    if (!G.DB.save) return null;
    const view = teamItemsView(),
      at = cursor.cursorOn();
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
              gridTemplateColumns: `repeat(${SALE.columns}, ${px(CARD.width)})`,
              gap: px(CARD.gap),
              paddingBottom: px(CARD.gap), // space under the last row, so its cards show whole at the end
            }}
          >
            ${view.forSale.map(
              (item) =>
                html`<${ItemCard}
                  key=${item.id}
                  cursor=${cursor}
                  item=${item}
                  buttonId=${SALE_ID + item.id}
                  buttonLabel=${'Buy ' + fmt(view.price)}
                  refusal=${view.canAfford ? null : UNAFFORDABLE}
                  onPress=${() => buyItem(item.id)}
                  area="sale"
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
      G.UI.toast(r.error === 'poor' ? UNAFFORDABLE : 'You cannot buy that');
      refresh();
      return;
    }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(`Unlocked ${it.name}! Equip it in Inventory.`);
    refresh();
  }

  // ---------------- Character Upgrades tab: the Berry Pocket and the Team Items Pocket (149b) ----------------
  /**
   * Each pocket as the save has it now: slots owned of max, the next slot's price, and its Buy's refusal (null when it
   * can buy; a Full pocket's line, or Unable to Afford, #151).
   */
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
        refusal: full ? POCKET_FULL : save.coins >= price ? null : UNAFFORDABLE,
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
      <${CursorButton}
        cursor=${cursor}
        id=${pocket.id}
        label=${pocket.full ? 'Full' : 'Buy ' + fmt(pocket.price)}
        artWidth=${POCKET.buyArtWidth}
        refusal=${pocket.refusal}
        onPress=${pocket.buy}
        className="shop-buy"
        style=${{
          left: px((POCKET.width - POCKET.buyWidth) / 2),
          top: px(POCKET.height - POCKET.buyBottom - BUTTON.height),
        }}
      />
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
      G.UI.toast(result.error === 'poor' ? UNAFFORDABLE : 'You cannot buy that');
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
      G.UI.toast(r.error === 'poor' ? UNAFFORDABLE : 'You cannot buy that');
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
