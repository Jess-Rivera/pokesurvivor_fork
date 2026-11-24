/* ============ menu-team.js: the Team menu (G.MenuTeam; #167) ============
 * Build the team, manage the boxes, sell. Sketch: assets/excalidraw/team-menu.excalidraw; decisions
 * 2026-11-23-97-139-team-menu-and-upgrade-popup-rulings and 2026-11-23-167-slice-a-plan-rulings win over it.
 * This file holds the screen's state, its keys and its mouse actions, and draws the frame (bars, counters, the bottom
 * buttons). The rules are G.TeamDraft's (the unsaved roster), G.TeamList's (filters, sorts) and G.Copies' (boxes, sales,
 * marks, names); the pieces are menu-team-slots.js, menu-team-grid.js, menu-team-detail.js and menu-team-sell.js, each
 * handed the `menu` object below.
 *   saving  everything saves at once except the roster, which waits for Commit
 *   mouse   click selects; double-click puts the Pokemon in the highlighted slot; drag onto a slot, the grid or a box tab;
 *           right-click frees a slot
 *   keys    arrows move; Enter or Space lifts and puts down a Pokemon or presses; 1 to 6 puts the selected Pokemon in
 *           that slot; Shift+1 to 5 moves it to that box; Esc steps back one thing, then discards
 */
G.MenuTeam = (() => {
  const overlay = G.HudOverlay,
    windowKit = G.MenuWindowKit,
    stageHost = document.querySelector('#scr-roster .tm-host'),
    stage = document.querySelector('#scr-roster .tm-stage'),
    parts = [G.MenuTeamSlots, G.MenuTeamGrid, G.MenuTeamDetail];
  if (!overlay || !overlay.ready || !windowKit.ready || !stage || !parts.every((part) => part.ready)) {
    console.warn('[Team] the HUD kit or the UI library did not load: the Team menu cannot open');
    return { init() {}, open() {}, roster: () => [] };
  }
  const {
    html,
    signal,
    hooks,
    preact,
    fitToStage,
    inputMode,
    hideTooltip,
    RoundPortrait,
    portraitSource,
    portraitFallback,
  } = overlay.kit;
  const { px, createMenuCursor, CursorButton } = windowKit;
  const { CursorBar, useRingTravel } = G.Lib.Cursor;
  const Draft = G.TeamDraft,
    List = G.TeamList,
    { coinText } = G.MenuTeamSell;

  // ---------- sizes and places (stage pixels) ----------
  const STAGE = { width: 1920, height: 1080 },
    OVERRUN = 4000, // the bars run past the stage on a wider or taller window
    BAR = { top: 52, topRight: 66, bottom: 1027, bottomRight: 1014, stepLeft: 1350, stepRight: 1374 },
    BOTTOM_BUTTON = { width: 174, height: 44, fontSize: 15 },
    SELL = { left: 404, top: 954, width: 174, fontSize: 12 },
    EXP_BAG = { left: 1165, top: 954, width: 170 },
    DISCARD = { left: 1516, top: 1025 },
    COMMIT = { left: 1706, top: 1025 },
    GHOST = { size: 56 };
  const SLOT_ID = 'slot-',
    COPY_ID = 'copy-',
    DEX_ID = 'dex-';
  const MARK_ID = /^(favorite|lock)-(\d)$/;
  const REFUSALS = {
    lead: 'Slot 1 is the lead and cannot be left empty',
    full: 'That box is full',
    none: 'That Pokemon cannot go there',
  };
  const PICK_A_COPY = 'Pick a copy from a box';

  // ---------- state ----------
  const tick = signal(0); // bumped on every change: the drawn pieces read the state again
  const state = {
    draft: { team: [null, null, null, null, null, null] },
    tab: 0, // 'dex', or a box counted from 0
    filter: List.newFilter(),
    sort: { key: 'dex', direction: 1 },
    selected: { dex: null, uid: null }, // what the detail panel shows
    slot: 0, // the highlighted slot: where a double-click puts a Pokemon
    held: null, // a Pokemon lifted by keyboard: { uid, fromSlot, dex, shiny }
    drag: null, // a Pokemon dragged by mouse, the same
    openList: null, // 'filter' or 'sort'
    openGroups: new Set(),
    movesOpen: false,
    renaming: false,
    showHex: false,
  };
  let saveVersion = 0; // bumped when the save may have changed: the shown list is made again
  const redraw = () => tick.value++;
  const isOpen = () => G.UI.isOpen('scr-roster') && !G.UI.isOpen('scr-upgrades');

  // ---------- what the grid shows ----------
  const listKey = () => JSON.stringify([state.tab, state.filter, state.sort]);
  let shownKey = null,
    shown = { entries: [], ids: [], uids: new Set(), total: 0 };
  /** The grid's entries, made once per change: the cursor asks for them on every drawn button. */
  function shownNow() {
    const key = saveVersion + listKey();
    if (key === shownKey) return shown;
    shownKey = key;
    const save = G.DB.save,
      all = state.tab === 'dex' ? List.speciesEntries() : List.boxEntries(save, state.tab),
      entries = List.sorted(List.filtered(all, state.filter, save), state.sort.key, state.sort.direction);
    shown = {
      entries,
      ids: entries.map(G.MenuTeamGrid.idOf),
      uids: new Set(entries.filter(({ copy }) => copy).map(({ copy }) => copy.pokemonUUID)),
      total: all.length,
    };
    return shown;
  }
  /** After a change to the save. */
  function saved() {
    saveVersion++;
    redraw();
  }

  // ---------- selecting ----------
  function select(dex, uid) {
    state.selected = { dex, uid: uid || null };
    state.renaming = false;
  }
  function selectSlot(slot) {
    const member = state.draft.team[slot];
    state.slot = slot;
    select(member ? member.dex : null, member && member.uid);
  }
  function selectCell(id) {
    if (id.startsWith(DEX_ID)) return select(+id.slice(DEX_ID.length), null);
    const uid = id.slice(COPY_ID.length);
    select(G.Copies.get(G.DB.save, uid).speciesID, uid);
  }
  const isSelected = (uid, dex) =>
    uid ? state.selected.uid === uid : !state.selected.uid && state.selected.dex === dex && state.tab === 'dex';

  // ---------- moving a Pokemon: every way ends in drop() ----------
  function drop(held, target) {
    const result = Draft.drop(state.draft, G.DB.save, held, target);
    if (!result.ok) {
      G.Audio.sfx('error');
      G.UI.toast(REFUSALS[result.error]);
      return redraw();
    }
    G.Audio.sfx('select');
    if (target.kind === 'slot') selectSlot(target.slot);
    if (result.swapped) G.UI.toast('Swapped slots');
    if (!result.moved) return redraw();
    G.DB.commit();
    G.UI.toast('Moved to Box ' + (target.box + 1));
    saved();
  }
  function freeSlot(slot) {
    const member = state.draft.team[slot];
    if (member) drop({ uid: member.uid, fromSlot: slot }, { kind: 'grid' });
    if (!state.draft.team[slot]) selectSlot(slot);
    redraw();
  }
  function lift(held) {
    const copy = G.Copies.get(G.DB.save, held.uid);
    state.held = { ...held, dex: copy.speciesID, shiny: copy.isShiny };
    G.Audio.sfx('select');
    redraw();
  }
  function putDown(target) {
    const held = state.held;
    state.held = null;
    drop(held, target);
  }
  function startDrag(event, held) {
    if (!held.uid || state.held || state.renaming) return event.preventDefault();
    state.drag = held;
    event.dataTransfer.setData('text/plain', held.uid);
    event.dataTransfer.effectAllowed = 'move';
  }
  function endDrag() {
    state.drag = null;
  }
  /** A place a Pokemon can be dragged onto. */
  const dropHandlers = (target) => ({
    onDragOver: (event) => {
      if (!state.drag) return;
      event.preventDefault();
      event.currentTarget.classList.add('is-drop');
    },
    onDragLeave: (event) => event.currentTarget.classList.remove('is-drop'),
    onDrop: (event) => {
      event.preventDefault();
      event.currentTarget.classList.remove('is-drop');
      const held = state.drag;
      state.drag = null;
      if (held) drop(held, target);
    },
  });

  // ---------- clicks ----------
  function clickSlot(slot) {
    if (state.held) return putDown({ kind: 'slot', slot });
    const member = state.draft.team[slot];
    if (sell.mode()) return sell.pressCopy(member && member.uid);
    selectSlot(slot);
    redraw();
  }
  function clickCell(id) {
    if (state.held) return putDown({ kind: 'grid' });
    if (sell.mode()) return sell.pressCopy(id.startsWith(COPY_ID) ? id.slice(COPY_ID.length) : null);
    selectCell(id);
    redraw();
  }
  function doubleClickCell(id) {
    if (sell.mode()) return;
    if (id.startsWith(COPY_ID))
      drop({ uid: id.slice(COPY_ID.length), fromSlot: null }, { kind: 'slot', slot: state.slot });
    else G.UI.toast(PICK_A_COPY);
  }
  /** Saved at once, like a box move. */
  function toggleMark(uid, which) {
    const save = G.DB.save,
      copy = uid && G.Copies.get(save, uid);
    if (!copy) return;
    if (which === 'lock') G.Copies.setLocked(save, uid, !copy.isLocked);
    else G.Copies.setFavorite(save, uid, !copy.isFavorite);
    G.Audio.sfx('click');
    G.DB.commit(true);
    saved();
  }

  // ---------- filter and sort ----------
  function refilter(change) {
    state.filter = { ...state.filter, ...change };
    redraw();
  }
  /** A list's value goes in or out; own takes one value or 'all'; favorite and locked flip. */
  function toggleFilter(key, value) {
    const now = state.filter[key];
    if (key === 'own') return refilter({ own: now === value ? 'all' : value });
    if (!Array.isArray(now)) return refilter({ [key]: !now });
    refilter({ [key]: now.includes(value) ? now.filter((other) => other !== value) : [...now, value] });
  }
  /** A new sort goes up; the sort in use turns round. */
  function chooseSort(key) {
    const same = state.sort.key === key;
    state.sort = { key, direction: same ? -state.sort.direction : 1 };
    redraw();
  }
  const sortUsed = () => List.sortInUse(state.sort.key, state.sort.direction, state.tab === 'dex');
  function toggleList(which) {
    state.openList = state.openList === which ? null : which;
    cursor.moveTo(which);
    redraw();
  }
  function closeList() {
    const which = state.openList;
    state.openList = null;
    if (which) cursor.moveTo(which);
    redraw();
  }
  function toggleGroup(key) {
    if (!state.openGroups.delete(key)) state.openGroups.add(key);
    redraw();
  }
  function emptyText() {
    return shownNow().total ? 'No Pokemon match.' : 'This box is empty.';
  }

  // ---------- tabs ----------
  /** Why a press on this tab is turned down (the button's refused look), or null. */
  function tabRefusal(tab) {
    if (tab.kind !== 'buy') return null;
    const have = G.Copies.boxCount(G.DB.save);
    if (tab.box !== have) return 'Buy Box ' + (have + 1) + ' first';
    return G.DB.save.coins >= G.Copies.boxPrice(tab.box + 1) ? null : 'Unable to Afford';
  }
  function pressTab(tab) {
    if (state.held) return putDown(tab.kind === 'dex' ? { kind: 'grid' } : { kind: 'box', box: tab.box });
    if (tab.kind === 'buy') return buyBox(tab.box + 1);
    const next = tab.kind === 'dex' ? 'dex' : tab.box;
    if (next !== state.tab) sell.end(); // leaving a box ends selling (pokebox 3b D9)
    state.tab = next;
    G.Audio.sfx('click');
    redraw();
  }
  async function buyBox(number) {
    const save = G.DB.save,
      price = G.Copies.boxPrice(number);
    const yes = await G.UI.ask(`Spend ${coinText(price)} PokeCoins on Box ${number}?`, {
      title: 'Buy box',
      ok: 'Buy',
      intent: 'positive',
      note: `You have ${coinText(save.coins)}. You will have ${coinText(save.coins - price)} left.`,
    });
    if (!yes) return;
    const result = G.Copies.buyBox(save);
    if (!result.ok) {
      G.Audio.sfx('error');
      return G.UI.toast('Unable to Afford');
    }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(`Box ${result.boxes} unlocked!`);
    state.tab = result.boxes - 1;
    saved();
  }

  // ---------- renaming, moves, upgrades ----------
  function startRename() {
    state.renaming = true;
    redraw();
  }
  /** text: the new name (empty for the species name), or null to leave it. */
  function finishRename(text) {
    if (!state.renaming) return; // closing the field also blurs it
    state.renaming = false;
    if (text != null && G.Copies.setNickname(G.DB.save, state.selected.uid, text) != null) {
      G.Audio.sfx('confirm');
      G.DB.commit(true);
    }
    saved();
  }
  function openMoves() {
    state.movesOpen = true;
    cursor.moveTo('moves-close');
    redraw();
  }
  function closeMoves() {
    state.movesOpen = false;
    cursor.moveTo('moves');
    redraw();
  }
  function openUpgrades(dex) {
    G.MenuUpgrades.open(dex, () => {
      G.UI.hide('scr-upgrades');
      saved();
    });
  }

  // ---------- selling ----------
  const sell = G.MenuTeamSell.create({
    draft: () => state.draft,
    shownUids: () => shownNow().uids,
    sold(uids) {
      if (uids.includes(state.selected.uid)) select(state.selected.dex, null); // the species, never the next copy
      saved();
    },
    redraw,
  });

  // ---------- leaving ----------
  function commit() {
    if (Draft.isDirty(state.draft, G.DB.save)) {
      Draft.commit(state.draft, G.DB.save);
      G.DB.commit();
      G.UI.toast('Team saved');
    }
    leave('confirm');
  }
  function discard() {
    const changed = Draft.isDirty(state.draft, G.DB.save);
    Draft.discard(state.draft, G.DB.save);
    leave('back');
    if (changed) G.UI.toast('Changes discarded.');
  }
  function leave(sound) {
    hideTooltip();
    sell.end();
    G.Audio.sfx(sound);
    G.MenuUI.open();
  }
  /** Esc: back one thing, then out. */
  function escape() {
    if (state.openList) return closeList();
    if (state.movesOpen) return closeMoves();
    if (state.held) {
      state.held = null;
      return redraw();
    }
    if (sell.mode()) return sell.end();
    discard();
  }

  // ---------- the cursor ----------
  const slotIds = [0, 1, 2, 3, 4, 5].map((slot) => SLOT_ID + slot);
  function memberItems() {
    return state.draft.team.flatMap((member, slot) =>
      member ? ['upgrade-' + slot, 'favorite-' + slot, 'lock-' + slot] : []
    );
  }
  function detailItems() {
    const { dex, uid } = state.selected;
    if (dex == null || (!uid && !G.DB.save.owned[dex])) return [];
    return uid ? ['rename', 'detail-favorite', 'detail-lock', 'hex', 'moves'] : ['hex', 'moves'];
  }
  function eligibleItems() {
    tick.value; // read again after a change
    if (!G.DB.save) return [];
    if (state.movesOpen) return G.MenuTeamDetail.movesItems(G.DEX_BY[state.selected.dex]);
    if (state.openList) return [state.openList, ...G.MenuTeamGrid.ROWS_OF[state.openList](menu).map((row) => row.id)];
    const places = [...slotIds, ...shownNow().ids, ...G.MenuTeamGrid.tabs().map((tab) => tab.id)];
    if (state.held) return places;
    return ['search', 'filter', 'sort', ...places, ...memberItems(), ...detailItems(), 'sell', 'discard', 'commit'];
  }
  /** Enter or Space on the item under the cursor. */
  function press(id) {
    if (state.openList) {
      const row = G.MenuTeamGrid.ROWS_OF[state.openList](menu).find((entry) => entry.id === id);
      return row ? row.press() : closeList();
    }
    if (id.startsWith(SLOT_ID)) return pressSlot(+id.slice(SLOT_ID.length));
    if (id.startsWith(COPY_ID) || id.startsWith(DEX_ID)) return pressCell(id);
    const tab = G.MenuTeamGrid.tabs().find((entry) => entry.id === id);
    if (tab) return pressTab(tab);
    const mark = MARK_ID.exec(id);
    if (mark) return toggleMark(state.draft.team[+mark[2]].uid, mark[1]);
    if (id.startsWith('upgrade-')) return openUpgrades(state.draft.team[+id.slice('upgrade-'.length)].dex);
    const action = PRESSES[id];
    if (action) action();
  }
  const PRESSES = {
    search: () => cursor.elementOf('search').querySelector('input').focus(),
    filter: () => toggleList('filter'),
    sort: () => toggleList('sort'),
    rename: startRename,
    'detail-favorite': () => toggleMark(state.selected.uid, 'favorite'),
    'detail-lock': () => toggleMark(state.selected.uid, 'lock'),
    hex: toggleHex,
    moves: openMoves,
    'moves-close': closeMoves,
    sell: () => sell.pressButton(),
    discard,
    commit,
  };
  function toggleHex() {
    state.showHex = !state.showHex;
    redraw();
  }
  /** By keys a slot or a portrait is selected and lifted in one press. */
  function pressSlot(slot) {
    const busy = state.held || sell.mode(),
      member = state.draft.team[slot];
    clickSlot(slot);
    if (!busy && member && member.uid) lift({ uid: member.uid, fromSlot: slot });
  }
  function pressCell(id) {
    const busy = state.held || sell.mode();
    clickCell(id);
    if (!busy && id.startsWith(COPY_ID)) lift({ uid: id.slice(COPY_ID.length), fromSlot: null });
  }
  const cursor = createMenuCursor({
    host: stage,
    isOpen,
    eligibleItems,
    home: SLOT_ID + 0,
    press,
    escape,
    tipFor: (id) => (id.startsWith(COPY_ID) || id.startsWith(DEX_ID) ? G.MenuTeamGrid.tipOf(menu, id) : null),
  });

  /** 1 to 6 puts the selected (or lifted) Pokemon in that slot; Shift+1 to 5 moves it to that box. */
  function onNumberKey(event) {
    const digit = /^(?:Digit|Numpad)([1-6])$/.exec(event.code);
    if (!digit || !isOpen() || G.UI.isOpen('scr-ask') || event.target.closest('input, textarea, select')) return;
    if (state.openList || state.movesOpen || sell.mode()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const held = state.held || { uid: state.selected.uid, fromSlot: null },
      index = +digit[1] - 1;
    state.held = null;
    if (!held.uid) return G.UI.toast(PICK_A_COPY);
    if (!event.shiftKey) return drop(held, { kind: 'slot', slot: index });
    if (index < G.Copies.BOX_MAX) drop(held, { kind: 'box', box: index });
  }

  /** cursor.bar beside the item it is on, with its CRT; drawn by each piece that is not its own cursor. */
  const bar = signal({ at: null, phase: null });
  function Bar({ id, height }) {
    return bar.value.at === id ? html`<${CursorBar} phase=${bar.value.phase} height=${height} />` : null;
  }
  const hasBar = (id) =>
    !!id && (id.startsWith(SLOT_ID) || MARK_ID.test(id) || ['rename', 'detail-favorite', 'detail-lock'].includes(id));
  function BarTravel({ at }) {
    const travel = useRingTravel(hasBar(at) ? at : null);
    hooks.useLayoutEffect(() => {
      bar.value = travel;
    }, [travel.at, travel.phase]);
    return null;
  }

  // ---------- what the pieces are handed ----------
  // a piece drawn from a signal skips a redraw its own reads did not ask for, so reading the state here asks for it
  const watched = (read) => () => {
    tick.value;
    return read();
  };
  const menu = {
    cursor,
    sell,
    Bar,
    byKeys: () => inputMode.value === 'keys',
    draft: watched(() => state.draft),
    slot: watched(() => state.slot),
    tab: watched(() => state.tab),
    held: watched(() => state.held),
    selected: watched(() => state.selected),
    filter: watched(() => state.filter),
    openList: watched(() => state.openList),
    movesOpen: watched(() => state.movesOpen),
    renaming: watched(() => state.renaming),
    showHex: watched(() => state.showHex),
    isGroupOpen: (key) => state.openGroups.has(key),
    entries: watched(() => shownNow().entries),
    search: (query) => refilter({ query }),
    clearFilter: () => refilter({ ...List.newFilter() }),
    listKey,
    sortUsed,
    emptyText,
    isSelected,
    tabRefusal,
    clickSlot,
    clickCell,
    doubleClickCell,
    freeSlot,
    startDrag,
    endDrag,
    dropHandlers,
    toggleMark,
    toggleFilter,
    toggleGroup,
    toggleList,
    closeList,
    chooseSort,
    pressTab,
    startRename,
    finishRename,
    toggleHex,
    openMoves,
    closeMoves,
    openUpgrades,
  };

  // ---------- drawing ----------
  const points = (list) => list.map(([x, y]) => x + ',' + y).join(' ');
  const TOP_EDGE = [
    [-OVERRUN, BAR.top],
    [BAR.stepLeft, BAR.top],
    [BAR.stepRight, BAR.topRight],
    [STAGE.width + OVERRUN, BAR.topRight],
  ];
  const BOTTOM_EDGE = [
    [-OVERRUN, BAR.bottom],
    [BAR.stepLeft, BAR.bottom],
    [BAR.stepRight, BAR.bottomRight],
    [STAGE.width + OVERRUN, BAR.bottomRight],
  ];
  const beyond = (y) => [
    [STAGE.width + OVERRUN, y],
    [-OVERRUN, y],
  ];
  const FrameBars = () =>
    html`<svg class="tm-bars" width=${STAGE.width} height=${STAGE.height}>
      <polygon points=${points([...TOP_EDGE, ...beyond(-OVERRUN)])} />
      <polygon points=${points([...BOTTOM_EDGE, ...beyond(STAGE.height + OVERRUN)])} />
      <polyline points=${points(TOP_EDGE)} />
      <polyline points=${points(BOTTOM_EDGE)} />
    </svg>`;

  function Counters() {
    tick.value;
    const save = G.DB.save;
    const place =
      state.tab === 'dex'
        ? 'Pokedex ' + G.DEX.filter((species) => save.owned[species.dex]).length + ' / ' + G.DEX.length
        : 'Box ' + (state.tab + 1) + '  ' + G.Copies.inBox(save, state.tab) + ' / ' + G.Copies.BOX_SIZE;
    return html`<div class="tm-counters">
      <span>${place}</span><span class="tm-coins"><span class="coin"></span> ${coinText(save.coins || 0)}</span>
    </div>`;
  }

  /** The lifted Pokemon, on the item the cursor is on. */
  function Ghost({ at }) {
    const ref = hooks.useRef(null);
    hooks.useLayoutEffect(() => {
      const element = ref.current && at && cursor.elementOf(at);
      if (!element) return;
      const place = element.getBoundingClientRect(),
        frame = stage.getBoundingClientRect(),
        scale = frame.width / STAGE.width;
      ref.current.style.left = (place.right - frame.left) / scale - GHOST.size / 2 + 'px';
      ref.current.style.top = (place.top - frame.top) / scale - GHOST.size / 2 + 'px';
    });
    const held = menu.held();
    return html`<div ref=${ref} class=${'tm-ghost' + (held ? '' : ' is-hidden')}>
      ${
        held
          ? html`<${RoundPortrait}
              size=${GHOST.size}
              stroke=${3}
              src=${portraitSource(held.dex, held.shiny)}
              dex=${held.dex}
              onError=${portraitFallback}
              state="cursor"
            />`
          : null
      }
    </div>`;
  }

  function BottomButton({ id, label, intent, place, disabled, onPress }) {
    return html`<${CursorButton}
      cursor=${cursor}
      id=${id}
      action=${'team-' + id}
      label=${label}
      look="glitch"
      intent=${intent}
      width=${place.width || BOTTOM_BUTTON.width}
      height=${BOTTOM_BUTTON.height}
      fontSize=${place.fontSize || BOTTOM_BUTTON.fontSize}
      disabled=${disabled}
      onPress=${onPress}
      style=${{ left: px(place.left), top: px(place.top) }}
    />`;
  }

  function sellLabel() {
    return sell.mode() === 'bulk' && sell.pickedCount() ? 'Sell ' + sell.pickedCount() : 'Sell Pokemon';
  }

  function TeamScreen() {
    tick.value; // redraw after a change
    if (!G.DB.save || !G.UI.isOpen('scr-roster')) return null;
    const at = cursor.cursorOn(),
      byKeys = menu.byKeys() ? at : null;
    return html`<${FrameBars} />
      <${BarTravel} at=${byKeys} />
      <${Counters} />
      <${G.MenuTeamSlots.Column} menu=${menu} />
      <${G.MenuTeamGrid.Finder} menu=${menu} at=${byKeys} />
      <${G.MenuTeamGrid.Grid} menu=${menu} at=${at} />
      <${BottomButton} id="sell" label=${sellLabel()} intent="negative" place=${SELL} onPress=${sell.pressButton} />
      <${G.MenuTeamGrid.Tabs} menu=${menu} />
      <${BottomButton} id="expbag" label="EXP Bag" place=${EXP_BAG} disabled />
      <${G.MenuTeamDetail.Detail} menu=${menu} at=${byKeys} />
      <${BottomButton} id="discard" label="Discard" intent="negative" place=${DISCARD} onPress=${discard} />
      <${BottomButton} id="commit" label="Commit" intent="positive" place=${COMMIT} onPress=${commit} />
      <${G.MenuTeamGrid.OpenList} menu=${menu} at=${byKeys} />
      <${G.MenuTeamDetail.MovesPopup} menu=${menu} at=${byKeys} />
      <${Ghost} at=${at} />
      <${cursor.CursorTip} />`;
  }

  // ---------- opening ----------
  function open() {
    const save = G.DB.save;
    G.DB.normalizeTeam(save);
    state.draft = Draft.open(save);
    Object.assign(state, { held: null, drag: null, openList: null, movesOpen: false, renaming: false });
    if (state.tab !== 'dex' && state.tab >= G.Copies.boxCount(save)) state.tab = 0;
    G.UI.chrome(false); // it has its own counters
    G.UI.show('scr-roster');
    fitStage();
    selectSlot(0);
    cursor.moveTo(SLOT_ID + 0);
    saved();
  }

  function init() {
    // the save changed while the menu is open (a debug command): it follows at once
    G.DB.onSave(() => {
      if (G.UI.isOpen('scr-roster')) saved();
    });
    addEventListener('keydown', onNumberKey);
    addEventListener('keydown', cursor.onKey); // after menu.js's listener (createMenuCursor's onKey says why)
  }

  preact.render(html`<${TeamScreen} />`, stage);
  const fitStage = fitToStage(stageHost);

  return { init, open, roster: () => state.draft.team };
})();
