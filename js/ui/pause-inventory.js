/* ============ pause-inventory.js: the pause menu's Run Inventory and held item moves (#82, slice 3 #90) ============
 * Spec: docs/PAUSE-MENU.md section 3 (the Run Inventory) and section 4 (moving held items). js/ui/pause-menu.js mounts
 * the inventory into its top panel and the carried item's ghost over the stage; js/ui/pause-pokemon.js marks its held
 * slot and team cards as places an item can go.
 *
 * The Run Inventory: three of the kit's tight 2x2 grids in a row, no frame and no labels (every item's name and effect is
 * in its hover tooltip): the Berry Pocket (slots not bought dimmed), the run items (team item slots not bought dimmed)
 * and the Temporary Pocket (4 slots, always open). Berries and run items move only between their own grid and the
 * pocket (to set them aside and destroy them on resume, Jess 2026-11-12); places "berry:<index>", "run:<index>".
 *
 * Moving held items (Jess, 2026-11-11): click, or drag and drop, between the detail panel's held slot, the Temporary
 * Pocket and the team cards. A click picks the item up and a second click puts it down; a drag puts it down where the
 * pointer lets go. Anywhere that is not a fitting place, Esc, or the item's own slot returns it; nothing highlights where
 * it can go. Onto a Pokemon holding an item, the two swap. Places carry data-drop: "held:<slot>", "team:<slot>",
 * "pocket:<index>". The moves themselves are the Team's (swapWithPocket, swapPocketSlots) and the Player's
 * (swapHeldItem), so every item's on / off effects stay exact.
 */
G.PauseInventory = (() => {
  const overlay = G.HudOverlay;
  if (!overlay || !overlay.ready) return { ready: false };
  const { html, signal, ItemGrid, IconCanvas } = overlay.kit;

  const GRID_ART_SIZE = 20, // the berry bag's squares (40 px), Jess 2026-11-11: the same grid object
    DRAG_START_DISTANCE = 6; // px the pointer moves before a press becomes a drag

  // ---------- state ----------
  const version = signal(0), // bumped on each read and after each move, so the inventory redraws from the team
    carried = signal(null), // { from, icon, mode: 'click' | 'drag' } while an item is picked up
    ghostAt = signal({ x: 0, y: 0 }); // the pointer, for the carried item's ghost
  let pressed = null, // { from, icon, x, y } between a press on an item and its drag or click
    swallowNextClick = false; // a put-down or cancel by pointer must not also press what is under it

  const team = () => (G.Game && G.Game.player && G.Game.player.team) || null;
  const memberIn = (slot) => ((G.Game && G.Game.roster) || []).find((member) => member.teamSlot === slot) || null;
  const save = () => (G.DB && G.DB.save) || null;
  const heldTip = (id) => {
    const item = G.Items.BY[id];
    return item ? { name: item.name, desc: item.desc } : null;
  };
  const heldIcon = (id) => {
    const item = G.Items.BY[id];
    return item ? item.icon || id : null;
  };
  const berryTip = (id) => {
    const berry = G.Grounds.BY[id];
    return berry ? { name: berry.name, desc: berry.desc } : null;
  };
  const berryIcon = (id) => {
    const berry = G.Grounds.BY[id];
    return berry ? 'ps:' + berry.icon : null;
  };
  // Held items and run items are both G.Items entries; berries are ground items.
  const iconOf = (kind, id) => (kind === 'berry' ? berryIcon(id) : heldIcon(id));
  const tipOf = (kind, id) => (kind === 'berry' ? berryTip(id) : heldTip(id));
  /** How many store slots of a kind are bought (the berry bag or the run items). */
  const boughtSlots = (kind) =>
    !save() ? 0 : kind === 'berry' ? G.Grounds.berrySlots(save()) : kind === 'run' ? G.Items.runSlots(save()) : 0;

  /** What sits at a place key: { icon } for an item that can be picked up, or null. Team cards only take items (a
   *  press on one picks which Pokemon the detail panel shows). */
  function itemAt(place) {
    const [kind, number] = place.split(':'),
      index = +number;
    if (kind === 'team') return null;
    if (kind === 'pocket') {
      const entry = team() && team().pocket[index];
      return entry ? { icon: iconOf(entry.kind, entry.id) } : null;
    }
    if (kind === 'berry' || kind === 'run') {
      const id = team() && team().storeOf(kind)[index];
      return id ? { icon: iconOf(kind, id) } : null;
    }
    const member = memberIn(index);
    return member && member.item ? { icon: heldIcon(member.item) } : null;
  }

  // ---------- the moves ----------
  /** Put the item from place `from` down on place `to`. True when it moved (false returns it, nothing changes). */
  function move(from, to) {
    if (!from || !to || from === to) return false;
    const [fromKind, fromNumber] = from.split(':'),
      [toKind, toNumber] = to.split(':');
    const owner = team();
    if (!owner) return false;
    const isStore = (kind) => kind === 'berry' || kind === 'run';
    // berries and run items: only between their own store and the pocket (Team checks kinds, copies and groups)
    if (isStore(fromKind)) return toKind === 'pocket' && owner.storeToPocket(fromKind, +fromNumber, +toNumber);
    if (isStore(toKind))
      return fromKind === 'pocket' && owner.pocketToStore(toKind, +fromNumber, +toNumber, boughtSlots(toKind));
    if (fromKind === 'pocket') {
      if (toKind === 'pocket') return owner.swapPocketSlots(+fromNumber, +toNumber);
      const receiver = memberIn(+toNumber);
      return !!receiver && owner.swapWithPocket(receiver, +fromNumber);
    }
    const giver = memberIn(+fromNumber);
    if (!giver || !giver.item) return false;
    if (toKind === 'pocket') return owner.swapWithPocket(giver, +toNumber);
    const receiver = memberIn(+toNumber);
    return !!receiver && receiver !== giver && !!giver.swapHeldItem(receiver);
  }

  function changed() {
    version.value = version.value + 1;
    if (G.PausePokemon && G.PausePokemon.refresh) G.PausePokemon.refresh();
  }
  /** Put the carried item down on `place` (or return it when that is not a fitting place). */
  function putDown(place) {
    const holding = carried.value;
    carried.value = null;
    if (!holding) return;
    if (place && move(holding.from, place)) {
      G.Audio.sfx('confirm');
      changed();
    } else G.Audio.sfx('back');
  }
  /** Esc while an item is picked up: it goes back. True when there was one (the menu then stays open). */
  function cancelCarry() {
    pressed = null;
    if (!carried.value) return false;
    carried.value = null;
    G.Audio.sfx('back');
    return true;
  }
  const placeUnder = (x, y) => {
    const element = document.elementFromPoint(x, y);
    const target = element && element.closest('[data-drop]');
    return target ? target.getAttribute('data-drop') : null;
  };
  const menuReady = () => G.PauseMenu && G.PauseMenu.isFullyOpen() && !G.PauseMenu.isAsking();

  /** A press on a place: with an item there, it may become a click or a drag. */
  function pressPlace(event, place) {
    if (event.button !== 0 || carried.value || !menuReady()) return;
    const item = itemAt(place);
    if (!item) return;
    pressed = { from: place, icon: item.icon, x: event.clientX, y: event.clientY };
  }
  /** The attributes that make an element a place an item can go (and, with an item there, a place to pick one up). */
  const placeAttributes = (place) => ({
    'data-drop': place,
    onPointerDown: (event) => pressPlace(event, place),
  });

  // Document listeners: while an item is carried by click, the next press anywhere puts it down (capture, before the
  // menu's own buttons see it); a press that moves far enough becomes a drag, and letting go puts it down.
  document.addEventListener(
    'pointerdown',
    (event) => {
      swallowNextClick = false;
      const holding = carried.value;
      if (!holding || holding.mode !== 'click') return;
      event.stopPropagation();
      event.preventDefault();
      swallowNextClick = true;
      putDown(placeUnder(event.clientX, event.clientY));
    },
    true
  );
  document.addEventListener('pointermove', (event) => {
    if (pressed && !carried.value) {
      const distance = Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y);
      if (distance >= DRAG_START_DISTANCE) {
        carried.value = { from: pressed.from, icon: pressed.icon, mode: 'drag' };
        pressed = null;
        G.Audio.sfx('select');
      }
    }
    if (carried.value) ghostAt.value = { x: event.clientX, y: event.clientY };
  });
  document.addEventListener('pointerup', (event) => {
    const holding = carried.value;
    if (holding && holding.mode === 'drag') {
      swallowNextClick = true;
      putDown(placeUnder(event.clientX, event.clientY));
    } else if (pressed) {
      // a click: the item is picked up until the next press
      carried.value = { from: pressed.from, icon: pressed.icon, mode: 'click' };
      ghostAt.value = { x: event.clientX, y: event.clientY };
      G.Audio.sfx('select');
    }
    pressed = null;
  });
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

  // ---------- components ----------
  /** One slot for the grids: `place` makes it a place items can go; `from` greys it while its item is carried. */
  function slotOf({ key, icon, locked, tip, place, className }) {
    const holding = carried.value;
    const lifted = holding && place && holding.from === place;
    return {
      key,
      icon,
      locked,
      tip: holding ? null : tip,
      className: (className || '') + (lifted ? ' is-lifted' : ''),
      attrs: place ? placeAttributes(place) : null,
    };
  }

  function InventoryPanel() {
    version.value; // redraw on each read and move
    const owner = team(),
      saved = save();
    if (!owner || !saved) return null;
    const berryCount = G.Grounds.berrySlots(saved),
      runCount = G.Items.runSlots(saved);
    const berrySlots = [],
      runSlots = [],
      pocketSlots = [];
    for (let index = 0; index < 4; index++) {
      // bought berry and run item slots are places too (#90 feel test, Jess 2026-11-12: set them aside to destroy)
      const berry = owner.berries[index];
      berrySlots.push(
        slotOf({
          key: 'berry' + index,
          icon: berry ? berryIcon(berry) : null,
          locked: index >= berryCount,
          tip: berry ? berryTip(berry) : null,
          place: index < berryCount ? 'berry:' + index : null,
          className: 'pm-store-slot',
        })
      );
      const runItem = owner.runItems[index];
      runSlots.push(
        slotOf({
          key: 'run' + index,
          icon: runItem ? heldIcon(runItem) : null,
          locked: index >= runCount,
          tip: runItem ? heldTip(runItem) : null,
          place: index < runCount ? 'run:' + index : null,
          className: 'pm-store-slot',
        })
      );
      const entry = owner.pocket[index];
      pocketSlots.push(
        slotOf({
          key: 'pocket' + index,
          icon: entry ? iconOf(entry.kind, entry.id) : null,
          tip: entry ? tipOf(entry.kind, entry.id) : null,
          place: 'pocket:' + index,
          className: 'pm-pocket-slot',
        })
      );
    }
    return html`<div class="pm-inventory">
      <${ItemGrid} slots=${berrySlots} artSize=${GRID_ART_SIZE} className="pm-inv-berries" />
      <${ItemGrid} slots=${runSlots} artSize=${GRID_ART_SIZE} className="pm-inv-run-items" />
      <${ItemGrid} slots=${pocketSlots} artSize=${GRID_ART_SIZE} className="pm-inv-pocket" />
    </div>`;
  }

  /** The carried item, following the pointer (over the stage, outside its scaling). */
  function CarryGhost() {
    const holding = carried.value;
    if (!holding) return null;
    const at = ghostAt.value;
    return html`<div class="pm-carry-ghost" style=${{ left: at.x + 'px', top: at.y + 'px' }}>
      <${IconCanvas} icon=${holding.icon} size=${32} className="hud-item-icon" />
    </div>`;
  }

  /** The menu opened: drop anything half picked up and redraw. */
  function read() {
    pressed = null;
    carried.value = null;
    changed();
  }

  /** How many items the Temporary Pocket holds (the resume gate). */
  const pocketCount = () => (team() ? team().pocketCount() : 0);
  /** Destroy the Temporary Pocket's items (the in-ball prompt's Destroy). */
  function destroyPocket() {
    const lost = team() ? team().emptyPocket() : 0;
    changed();
    return lost;
  }

  return {
    ready: true,
    InventoryPanel,
    CarryGhost,
    placeAttributes,
    isCarried: (place) => !!carried.value && carried.value.from === place,
    isCarrying: () => !!carried.value,
    carriedSignal: carried,
    cancelCarry,
    read,
    pocketCount,
    destroyPocket,
    move,
  };
})();
