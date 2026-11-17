/* ============ inventory-ui.js: the Main Menu Inventory (G.InventoryUI; #149d) ============
 * The pre-run team item loadout. Mockup: assets/excalidraw/Main-Menu-Inventory.svg; plan and rulings: docs/ASCII Concept
 * Maps/149 - Shop Rework Opening.md. The Shop's window, in the same place on the menu screens' 1920 x 1080 stage, over the
 * dimmed Main Menu (css/bw-inventory.css). Every loadout rule lives in G.Items (equip, unequip, swap, one Stone); this
 * file draws and routes input. The save: save.teamItems (unlocked), save.teamLoadout (equipped, by slot); saved at once.
 *   cards    left: a search bar over a scrolling 3-column grid of the unlocked team item cards (the Shop's, from
 *            js/ui/menu-window-kit.js), each with one button: Unequip when equipped, else Equip (to the lowest empty bought
 *            slot), or Swap when every bought slot is full
 *   slots    right: the four team item slots, the run screen's box sized up (the HUD kit's RunItemBox); slots not bought
 *            are dimmed. Pressing a filled slot unequips it
 *   swap     Swap shows "Select a slot to swap." under the slots; by keys the cursor goes to slot 1, and Enter on a slot
 *            swaps the two items; with the mouse a click on a slot does. Esc, or a click anywhere else, cancels. A second
 *            Stone skips the pick: it takes the first Stone's slot, with a toast (Jess 2026-11-17)
 *   buttons  Shop opens the Shop (the background stays dimmed); Exit returns to the Main Menu
 *   input    the Shop's selection cursor rules (the kit's createMenuCursor): the search bar, every card button, the
 *            filled slots, Shop and Exit; while picking a slot to swap, only the bought slots
 */
G.InventoryUI = (() => {
  const kitOverlay = G.HudOverlay,
    windowKit = G.MenuWindowKit,
    windowHost = document.getElementById('inv-window'),
    stageHost = document.querySelector('#scr-inventory .inv-host');
  if (!kitOverlay || !kitOverlay.ready || !windowKit.ready || !windowHost || !stageHost) {
    console.warn('[Inventory] the HUD kit did not load: the Inventory cannot open');
    return { init() {}, open() {} };
  }
  const { html, signal, preact, ScrollBox, SearchBar, RunItemBox, RUN_BOX_ROWS, fitToStage } = kitOverlay.kit;
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

  // ---------- sizes and places (stage pixels, inside the window, which is the Shop's: 1145 x 670) ----------
  const WINDOW = { width: 1145, height: 670 },
    FRAME = { inset: 30 }, // the thin #29ceff rim around the cards and the slots
    CARDS = { inset: 14, width: 600, searchWidth: 584, listTop: 56, listWidth: 584, columns: 3 },
    SLOTS = { artWidth: 120, artPixel: 3, gap: 12, top: 20 }, // 360 x 96 each (Jess 2026-11-17)
    SWAP_LINE = { gap: 14, height: 30 },
    BUTTONS = { shopArtWidth: 52, exitArtWidth: 52, gap: 16, bottom: 14 };
  FRAME.width = WINDOW.width - 2 * FRAME.inset;
  FRAME.height = WINDOW.height - 2 * FRAME.inset;
  CARDS.listHeight = FRAME.height - 4 - 2 * CARDS.inset - CARDS.listTop;
  SLOTS.width = SLOTS.artWidth * SLOTS.artPixel;
  SLOTS.height = RUN_BOX_ROWS * SLOTS.artPixel;
  // the slot column: centred in the room right of the cards
  SLOTS.left = Math.round((CARDS.inset + CARDS.width + FRAME.width - 4 - SLOTS.width) / 2);
  const SEARCH_ID = 'inv-search',
    CARD_ID = 'item-', // cursor ids: a card's button, a slot
    SLOT_ID = 'slot-',
    SWAP_PROMPT = 'Select a slot to swap.',
    ONE_STONE = 'Can only have One Stone equipped.';

  // ---------- state ----------
  const saveTick = signal(0); // bumped on every refresh: the drawn pieces read the save again
  const query = signal(''); // the search bar's text
  const openCount = signal(0); // each opening sends the card list back to the top
  const swapping = signal(null); // the item whose Swap was pressed, while a slot is picked; else null

  /** What the window shows now: the unlocked team items (narrowed by the search bar), the loadout, the slot counts. */
  function inventoryView() {
    const save = G.DB.save;
    if (!save) return { anyUnlocked: false, items: [], loadout: [], slotCount: 0, full: false };
    const unlocked = G.Items.LIST.filter((item) => item.tier === 'run' && G.Items.unlocked(save, item.id));
    return {
      anyUnlocked: unlocked.length > 0,
      items: unlocked.filter(nameHas(query.value)),
      loadout: save.teamLoadout,
      slotCount: G.Items.runSlots(save),
      full: G.Items.firstEmptySlot(save) < 0,
    };
  }

  // The selection cursor (the Shop's rules, js/ui/menu-window-kit.js).
  const cursor = createMenuCursor({
    host: stageHost,
    isOpen: () => G.UI.isOpen('scr-inventory'),
    eligibleItems,
    home: 'exit',
    press,
    escape,
  });
  /** The items the cursor may sit on now; while a slot is picked for a swap, only the bought slots. */
  function eligibleItems() {
    saveTick.value; // read again after a change
    const view = inventoryView(),
      slotIds = [];
    for (let slot = 0; slot < view.slotCount; slot++)
      if (swapping.value || view.loadout[slot]) slotIds.push(SLOT_ID + slot);
    if (swapping.value) return slotIds;
    return [SEARCH_ID, ...view.items.map((item) => CARD_ID + item.id), ...slotIds, 'shop', 'exit'];
  }

  function init() {
    // the save changed while the Inventory is open (a debug command): it follows at once
    G.DB.onSave(() => {
      if (G.UI.isOpen('scr-inventory')) refresh();
    });
    addEventListener('keydown', cursor.onKey); // after menu.js's listener (createMenuCursor's onKey says why)
  }

  function open() {
    G.UI.show('scr-inventory', true);
    fitStage();
    if (G.DB.save) G.Items.cleanLoadout(G.DB.save);
    query.value = '';
    swapping.value = null;
    openCount.value++;
    cursor.moveTo('exit');
    refresh();
  }

  function close() {
    if (!G.UI.isOpen('scr-inventory')) return;
    G.Audio.sfx('back');
    G.MenuUI.open();
  }

  /** Shop: the Shop opens over the still dimmed Main Menu. */
  function openShop() {
    G.Audio.sfx('select');
    G.GachaUI.open();
  }

  function refresh() {
    saveTick.value++;
    G.UI.refreshCoins();
  }

  /** Esc: a swap in progress is cancelled (the cursor goes back to its Swap); otherwise the Inventory closes. */
  function escape() {
    if (swapping.value) return cancelSwap();
    close();
  }

  /** Enter on the item the cursor is on. */
  function press(at) {
    if (at === 'exit') return close();
    if (at === 'shop') return openShop();
    if (at === SEARCH_ID) return cursor.elementOf(at).querySelector('input').focus(); // type; Enter or Esc gives the keys back
    if (at.startsWith(CARD_ID)) return pressCard(at.slice(CARD_ID.length));
    if (at.startsWith(SLOT_ID)) pressSlot(+at.slice(SLOT_ID.length));
  }

  /** A card's button: Unequip, Equip, or Swap (which starts picking a slot, unless a second Stone takes the first's). */
  function pressCard(id) {
    const save = G.DB.save;
    if (!save) return;
    cancelSwap(false);
    if (save.teamLoadout.includes(id)) return changed(G.Items.unequipTeamItem(save, id));
    const result = G.Items.equipTeamItem(save, id);
    if (result.ok || result.error !== 'full') return changed(result, id);
    swapping.value = id; // every bought slot is full: pick the slot to swap with
    cursor.moveTo(SLOT_ID + 0);
    G.Audio.sfx('select');
  }

  /** A slot: while picking for a swap, the swap; otherwise a filled slot's item is unequipped. */
  function pressSlot(slot) {
    const save = G.DB.save;
    if (!save) return;
    if (swapping.value) {
      const id = swapping.value;
      swapping.value = null;
      return changed(G.Items.swapTeamItem(save, id, slot), id);
    }
    const id = save.teamLoadout[slot];
    if (id) changed(G.Items.unequipTeamItem(save, id));
  }

  /** Ends picking a slot for a swap; by default the cursor goes back to that item's Swap. */
  function cancelSwap(cursorBack = true) {
    const id = swapping.value;
    if (!id) return;
    swapping.value = null;
    if (cursorBack) cursor.moveTo(CARD_ID + id);
    refresh();
  }

  /** After a loadout rule ran: save and redraw, or the error sound. A second Stone replacing the first gets its toast. */
  function changed(result, id) {
    if (!result.ok) {
      G.Audio.sfx('error');
      refresh();
      return;
    }
    const replaced = result.replaced && G.Items.BY[result.replaced],
      item = id && G.Items.BY[id];
    if (replaced && item && item.group && replaced.group === item.group) G.UI.toast(ONE_STONE);
    G.Audio.sfx('select');
    G.DB.commit();
    refresh();
  }

  // ---------- drawing ----------
  /** One slot panel: its item (name, icon, short description), dimmed when not bought; a cursor stop when pressable. */
  function Slot({ slot, view, at }) {
    const id = SLOT_ID + slot,
      bought = slot < view.slotCount,
      itemId = bought ? view.loadout[slot] : null,
      def = itemId && G.Items.BY[itemId],
      pressable = bought && (!!swapping.value || !!def);
    const attrs = pressable
      ? {
          'data-cursor-id': id,
          'data-cursor-area': 'slots',
          'data-slot': slot,
          onMouseEnter: () => cursor.hover(id),
          onMouseLeave: () => cursor.hover(null),
          onClick: () => pressSlot(slot),
        }
      : { 'data-slot': slot };
    return html`<${RunItemBox}
      artWidth=${SLOTS.artWidth}
      artPixel=${SLOTS.artPixel}
      item=${def ? { name: def.name, icon: def.icon || def.id, text: def.desc, live: false } : null}
      dimmed=${!bought}
      className=${pressable ? 'is-pressable' : ''}
      style=${{ left: px(0), top: px(slot * (SLOTS.height + SLOTS.gap)) }}
      attrs=${attrs}
      overlay=${cursor.cornersIf(at === id)}
    />`;
  }

  /** A card's button label: Unequip when equipped, Swap when every bought slot is full, else Equip. */
  function buttonLabelFor(item, view) {
    if (view.loadout.includes(item.id)) return 'Unequip';
    return view.full ? 'Swap' : 'Equip';
  }

  function InventoryWindow() {
    saveTick.value; // redraw after a change
    if (!G.DB.save) return null;
    const view = inventoryView(),
      at = cursor.cursorOn(),
      innerHeight = FRAME.height - 4;
    const emptyLine = !view.anyUnlocked
      ? 'Nothing unlocked yet. Gym leaders and bosses can drop team items.'
      : !view.items.length
        ? 'No team item matches.'
        : null;
    const slotsBottom = SLOTS.top + G.Items.RUN_SLOTS_MAX * (SLOTS.height + SLOTS.gap) - SLOTS.gap,
      buttonTop = innerHeight - BUTTONS.bottom - BUTTON.height,
      exitLeft = SLOTS.left + SLOTS.width - BUTTONS.exitArtWidth * BUTTON.artPixel,
      shopLeft = exitLeft - BUTTONS.gap - BUTTONS.shopArtWidth * BUTTON.artPixel;
    // a mouse press anywhere but a pressable slot cancels a swap (its Swap button starts the next one on the click)
    const cancelOnMouse = (event) => {
      if (swapping.value && !event.target.closest('.inv-slots .is-pressable')) cancelSwap(false);
    };
    return html`<div class="inv-pane" onMouseDown=${cancelOnMouse}>
      <div
        class="inv-frame"
        style=${{ left: px(FRAME.inset), top: px(FRAME.inset), width: px(FRAME.width), height: px(FRAME.height) }}
      >
        <div
          class="inv-cards"
          style=${{ left: px(CARDS.inset), top: px(CARDS.inset), width: px(CARDS.width), height: px(innerHeight) }}
        >
          <${SearchStop} id=${SEARCH_ID} area="cards" at=${at} className="inv-search-host">
            <${SearchBar}
              value=${query.value}
              onChange=${(text) => (query.value = text)}
              placeholder="Search team items"
              width=${CARDS.searchWidth}
              className="inv-search"
            />
          </${SearchStop}>
          <${ScrollBox}
            box=${{ left: 0, top: CARDS.listTop, width: CARDS.listWidth, height: CARDS.listHeight }}
            trackRight=${0}
            colours=${SCROLL_COLOURS}
            resetOn=${[query.value, openCount.value]}
          >
            <div
              class="inv-card-grid"
              style=${{
                gridTemplateColumns: `repeat(${CARDS.columns}, ${px(CARD.width)})`,
                gap: px(CARD.gap),
                padding: px(CURSOR_ROOM) + ' 0 ' + px(CARD.gap), // the cursor's corners at the top, whole last cards
              }}
            >
              ${view.items.map(
                (item) =>
                  html`<${ItemCard}
                    key=${item.id}
                    cursor=${cursor}
                    item=${item}
                    buttonId=${CARD_ID + item.id}
                    buttonLabel=${buttonLabelFor(item, view)}
                    disabled=${false}
                    onPress=${() => pressCard(item.id)}
                    area="cards"
                  />`
              )}
            </div>
            ${emptyLine ? html`<div class="hud-text shop-empty">${emptyLine}</div>` : null}
          </${ScrollBox}>
        </div>
        <div class="inv-slots" style=${{ left: px(SLOTS.left), top: px(SLOTS.top), width: px(SLOTS.width) }}>
          ${Array.from(
            { length: G.Items.RUN_SLOTS_MAX },
            (_, slot) => html`<${Slot} key=${slot} slot=${slot} view=${view} at=${at} />`
          )}
        </div>
        ${
          swapping.value
            ? html`<div
                class="hud-text inv-swap-line"
                style=${{
                  left: px(SLOTS.left),
                  top: px(slotsBottom + SWAP_LINE.gap),
                  width: px(SLOTS.width),
                  height: px(SWAP_LINE.height),
                }}
              >
                ${SWAP_PROMPT}
              </div>`
            : null
        }
        <${CursorButton}
          cursor=${cursor}
          id="shop"
          action="inv-shop"
          label="Shop"
          artWidth=${BUTTONS.shopArtWidth}
          onPress=${openShop}
          style=${{ left: px(shopLeft), top: px(buttonTop) }}
        />
        <${CursorButton}
          cursor=${cursor}
          id="exit"
          action="inv-exit"
          label="Exit"
          artWidth=${BUTTONS.exitArtWidth}
          onPress=${close}
          style=${{ left: px(exitLeft), top: px(buttonTop) }}
        />
      </div>
    </div>`;
  }

  preact.render(html`<${InventoryWindow} />`, windowHost);
  const fitStage = fitToStage(stageHost);

  return { init, open };
})();
