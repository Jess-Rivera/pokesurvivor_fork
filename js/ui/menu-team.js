/* ============ menu-team.js: the Team menu (G.MenuTeam; #167) ============
 * Build the team, manage the boxes, sell. Sketch: assets/excalidraw/team-menu.excalidraw; decisions
 * 2026-11-23-97-139-team-menu-and-upgrade-popup-rulings and 2026-11-23-167-slice-a-plan-rulings win over it.
 * This file holds the screen's state, its keys and its mouse actions, and draws the frame (bars, counters, the bottom
 * buttons). The rules are G.TeamDraft's (the roster), G.TeamList's (filters, sorts) and G.Copies' (boxes, sales,
 * marks, names); the pieces are menu-team-slots.js, menu-team-grid.js, menu-team-detail.js and menu-team-sell.js, each
 * handed the `menu` object below.
 *   saving  everything saves at once; Back (and Esc) leaves, Revert puts the roster back as it was on opening
 *   layout  the bars are a fixed size in real pixels; the team column is on the left, the detail panel on the right, and
 *           the grid takes the room between them. A window too small for that scales the panels down, never the bars
 *   candy   Level Up (Shift: +10) and the EXP Bag's candy, put on a slot, a portrait or the detail panel (#139 Part F)
 *   upgrade a slot's Upgrade opens the Upgrade popup for that copy (#97, js/ui/menu-upgrades.js); inside it, the arrows,
 *           Q and E, and 1 to 6 switch to another caught team member
 *   mouse   click selects; double-click puts the Pokemon in the highlighted slot; drag onto a slot, the grid or a box tab;
 *           right-click frees a slot
 *   keys    arrows move; Enter or Space lifts and puts down a Pokemon or presses; 1 to 6 puts the selected Pokemon in
 *           that slot; Shift+1 to 5 moves it to that box; Esc steps back one thing, then out
 */
G.MenuTeam = (() => {
  const overlay = G.HudOverlay,
    windowKit = G.MenuWindowKit,
    stage = document.querySelector('#scr-roster .tm-stage'),
    mosaicHost = document.querySelector('#scr-roster .tm-mosaic'),
    parts = [G.MenuTeamSlots, G.MenuTeamGrid, G.MenuTeamDetail, G.MenuTeamExpBag, G.MenuUpgrades];
  if (!overlay || !overlay.ready || !windowKit.ready || !stage || !parts.every((part) => part.ready)) {
    console.warn('[Team] the HUD kit or the UI library did not load: the Team menu cannot open');
    return { init() {}, open() {}, roster: () => [] };
  }
  const { html, signal, hooks, preact, inputMode, hideTooltip, RoundPortrait, portraitSource, portraitFallback } =
    overlay.kit;
  const { px, createMenuCursor, CursorButton } = windowKit;
  const { CursorBar, useRingTravel } = G.Lib.Cursor;
  const Draft = G.TeamDraft,
    List = G.TeamList,
    ExpBag = G.MenuTeamExpBag,
    { coinText } = G.MenuTeamSell;

  // ---------- sizes and places (stage pixels) ----------
  // the frame, in real pixels whatever the window: each bar, deeper on the right, down a slope
  const BAR = { height: 30, deep: 44, slopeDegrees: 30 },
    BAR_CONTENTS_RIGHT = 24, // as in css/team-menu.css .tm-bar-contents
    FRAME_BUTTON = { width: 150, height: 34, fontSize: 14 },
    // the panels, in panel pixels
    COLUMN_LEAST = 762, // the six slots at their closest
    DETAIL = { width: 549, right: 20, gap: 8, leastHeight: 856 },
    BOX = { left: 404, gapRight: 16, finderGap: 24, finderHeight: 57, leastWidth: 810, fullWidth: 931 },
    ROW = { height: 44, above: 11, below: 12, tabWidth: 88, sellFont: 12, expBagFont: 12 },
    ROW_LEAST = { sell: 150, sellGap: 8, tabGap: 2, expBag: 104 }, // at the least grid width
    ROW_FULL = { sell: 174, sellGap: 16, tabGap: 6, expBag: 170 }, // from the full grid width on
    GHOST = { size: 56 };
  const SLOT_ID = 'slot-',
    COPY_ID = 'copy-',
    DEX_ID = 'dex-',
    LEVEL_UP_ID = 'levelup-';
  const MARK_ID = /^(favorite|lock)-(\d)$/;
  const REFUSALS = {
    lead: 'Slot 1 is the lead and cannot be left empty',
    full: 'That box is full',
    none: 'That Pokemon cannot go there',
  };
  const PICK_A_COPY = 'Pick a copy from a box';
  const BURSTS = { gapMs: 150, allMs: 3000 }; // one starburst per level, closer together when there are many

  // ---------- the layout ----------
  const STEP_WIDTH = (BAR.deep - BAR.height) / Math.tan((BAR.slopeDegrees * Math.PI) / 180);
  /** Where everything sits in a window this size: the panels' scale, then their places in panel pixels. */
  function layoutFor(windowWidth, windowHeight) {
    const aroundRow = ROW.above + ROW.height + ROW.below,
      leastWidth = BOX.left + BOX.leastWidth + BOX.gapRight + DETAIL.width + DETAIL.right;
    const scale = Math.min(
      1,
      windowWidth / leastWidth,
      (windowHeight - 2 * BAR.height) / (BOX.finderGap + COLUMN_LEAST + aroundRow),
      (windowHeight - 2 * BAR.deep) / (DETAIL.leastHeight + 2 * DETAIL.gap)
    );
    const width = windowWidth / scale,
      height = windowHeight / scale,
      bar = BAR.height / scale,
      detailTop = BAR.deep / scale + DETAIL.gap,
      detailLeft = width - DETAIL.right - DETAIL.width,
      finderTop = bar + BOX.finderGap,
      rowTop = height - bar - ROW.below - ROW.height,
      boxTop = finderTop + BOX.finderHeight,
      boxBottom = rowTop - ROW.above,
      boxWidth = detailLeft - BOX.gapRight - BOX.left;
    const spread = Math.max(0, Math.min(1, (boxWidth - BOX.leastWidth) / (BOX.fullWidth - BOX.leastWidth))),
      sized = (key) => ROW_LEAST[key] + (ROW_FULL[key] - ROW_LEAST[key]) * spread;
    return {
      windowWidth,
      windowHeight,
      scale,
      width,
      height,
      column: { top: finderTop, height: boxBottom - finderTop },
      grid: { left: BOX.left, top: boxTop, width: boxWidth, height: boxBottom - boxTop, finderTop },
      row: {
        top: rowTop,
        sellWidth: sized('sell'),
        tabsLeft: BOX.left + sized('sell') + sized('sellGap'),
        tabWidth: ROW.tabWidth,
        tabGap: sized('tabGap'),
        expBagLeft: BOX.left + boxWidth - sized('expBag'),
        expBagWidth: sized('expBag'),
      },
      slopeLeft: detailLeft * scale,
      slopeRight: detailLeft * scale + STEP_WIDTH,
      detail: { left: detailLeft, top: detailTop, width: DETAIL.width, height: height - 2 * detailTop },
    };
  }
  const layout = signal(layoutFor(innerWidth, innerHeight));
  function fitLayout() {
    layout.value = layoutFor(innerWidth, innerHeight);
  }

  // ---------- state ----------
  const tick = signal(0); // bumped on every change: the drawn pieces read the state again
  const state = {
    draft: { team: [null, null, null, null, null, null] },
    opened: { team: [] }, // the roster when the menu opened: what Revert goes back to
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
    upgrade: null, // the Upgrade popup's copy and the slot it opened from: { uid, slot }
    renaming: false,
    showHex: false,
  };
  let saveVersion = 0; // bumped when the save may have changed: the shown list is made again
  const redraw = () => tick.value++;
  const isOpen = () => G.UI.isOpen('scr-roster');

  // ---------- what the grid shows ----------
  const listKey = () => JSON.stringify([state.tab, state.filter, state.sort]);
  let shownKey = null,
    shown = { entries: [], ids: [], uids: new Set() };
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
    if (!result.moved) return saveRoster();
    G.DB.commit();
    G.UI.toast('Moved to Box ' + (target.box + 1));
    saved();
  }
  /** The roster saves after every change to it. */
  function saveRoster() {
    if (Draft.differs(state.draft, G.DB.save)) {
      Draft.commit(state.draft, G.DB.save);
      G.DB.commit();
    }
    saved();
  }
  function freeSlot(slot) {
    if (bag.inHand()) return bag.release();
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
    if (!held.uid || state.held || bag.inHand() || state.renaming) return event.preventDefault();
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
  const uidOfCell = (id) => (id.startsWith(COPY_ID) ? id.slice(COPY_ID.length) : null);

  // ---------- candy (#139 Part F) ----------
  const bag = ExpBag.create({
    isLifting: () => !!state.held,
    isRenaming: () => state.renaming,
    sell: () => sell,
    /** A copy was given candy: it is then the one selected. */
    given(uid, levels) {
      const species = G.DEX_BY[G.Copies.get(G.DB.save, uid).speciesID],
        slot = Draft.slotOfUid(state.draft, uid);
      if (slot >= 0) state.slot = slot;
      select(species.dex, uid);
      playBursts(levels, species.types[0]);
      saved();
    },
    closed: () => cursor.moveTo('expbag'),
    targetAt: candyTargetAt,
    redraw,
  });
  /** The copy a candy let go at this point of the window would go to, { element, uid }, or null. */
  function candyTargetAt(x, y) {
    const under = document.elementFromPoint(x, y),
      element = under && under.closest('.tm-slot, .tm-cell, .tm-detail');
    if (!element) return null;
    const { slot, cursorId } = element.dataset,
      member = slot != null && state.draft.team[+slot];
    let uid = state.selected.uid; // the detail panel's
    if (slot != null) uid = member && member.uid;
    else if (cursorId) uid = uidOfCell(cursorId);
    return uid ? { element, uid } : null;
  }
  const burstTimers = new Set();
  /** One starburst per level. */
  function playBursts(levels, type) {
    const gap = Math.min(BURSTS.gapMs, BURSTS.allMs / levels);
    for (let level = 0; level < levels; level++) {
      const timer = setTimeout(() => {
        burstTimers.delete(timer);
        if (mosaic) mosaic.burst(type);
      }, level * gap);
      burstTimers.add(timer);
    }
  }
  function clickDetail() {
    if (bag.inHand()) bag.give(state.selected.uid);
  }

  // ---------- clicks ----------
  function clickSlot(slot) {
    if (state.held) return putDown({ kind: 'slot', slot });
    const member = state.draft.team[slot];
    if (bag.inHand()) return bag.give(member && member.uid);
    if (sell.mode()) return sell.pressCopy(member && member.uid);
    selectSlot(slot);
    redraw();
  }
  function clickCell(id) {
    if (state.held) return putDown({ kind: 'grid' });
    if (bag.inHand()) return bag.give(uidOfCell(id));
    if (sell.mode()) return sell.pressCopy(id.startsWith(COPY_ID) ? id.slice(COPY_ID.length) : null);
    selectCell(id);
    redraw();
  }
  function doubleClickCell(id) {
    if (sell.mode() || bag.justGave()) return;
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
    return 'No Pokemon match.';
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
    bag.release();
    state.movesOpen = true;
    cursor.moveTo('moves-close');
    redraw();
  }
  function closeMoves() {
    state.movesOpen = false;
    cursor.moveTo('moves');
    redraw();
  }
  /** The team slots that hold a caught copy, in slot order (the members the Upgrade popup can show). */
  const upgradeSlots = () => state.draft.team.flatMap((member, slot) => (member && member.uid ? [slot] : []));
  const canSwitchUpgrade = () => upgradeSlots().length > 1;
  /** The Upgrade popup's stops for the copy it shows. */
  const upgradeItems = () => G.MenuUpgrades.items(G.Copies.get(G.DB.save, state.upgrade.uid), canSwitchUpgrade());

  /** The Upgrade popup for the copy in team slot `slot` (only team members are upgraded; a slot with no copy refuses). */
  function openUpgrades(slot) {
    if (!upgradeSlots().includes(slot)) return refuseUpgradeSlot();
    bag.close();
    sell.end();
    showUpgradeSlot(slot);
  }
  function refuseUpgradeSlot() {
    G.Audio.sfx('error');
    G.UI.toast(G.MenuUpgrades.REFUSALS.none);
  }
  /** Points the popup at team slot `slot` (holding a copy); the cursor stays put unless the new copy lacks its stop. */
  function showUpgradeSlot(slot) {
    state.upgrade = { uid: state.draft.team[slot].uid, slot };
    G.Audio.sfx('click');
    const stops = upgradeItems();
    if (!stops.includes(cursor.cursorOn())) cursor.moveTo(stops[0]);
    redraw();
  }
  /** The arrows and Q / E: the previous (-1) or next (+1) caught team member, wrapping. */
  function stepUpgrade(step) {
    if (!state.upgrade || !canSwitchUpgrade()) return;
    const slots = upgradeSlots(),
      at = slots.indexOf(state.upgrade.slot);
    showUpgradeSlot(slots[(at + step + slots.length) % slots.length]);
  }
  function closeUpgrades() {
    if (!state.upgrade) return;
    const { slot } = state.upgrade;
    state.upgrade = null;
    hideTooltip();
    cursor.moveTo('upgrade-' + slot);
    redraw();
  }
  /** Buys a card's next level; when the card has no live button left, the cursor moves on to the next card or Close. */
  function buyUpgrade(cardKey) {
    if (!state.upgrade || !G.MenuUpgrades.buy(state.upgrade.uid, cardKey)) return;
    const nextStop = G.MenuUpgrades.stopAfterBuy(G.Copies.get(G.DB.save, state.upgrade.uid), cardKey);
    if (nextStop) cursor.moveTo(nextStop);
    saved();
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

  function pressSell() {
    bag.close();
    sell.pressButton();
  }

  // ---------- leaving ----------
  const back = () => leave('back');
  /** What Revert did, for its toast. */
  function revertText({ ok, missing }) {
    if (!ok) return 'Nothing to revert to: you no longer own any of that team.';
    if (!missing.length) return 'Team changes reverted.';
    const gone = 'You no longer own the Pokemon from slot ' + missing.map((slot) => slot + 1).join(', ') + '.';
    return gone + (missing[0] === 0 ? ' Another Pokemon moved up to lead.' : ' Left empty.');
  }
  function revert() {
    const changed = Draft.differs(state.draft, state.opened),
      result = changed && Draft.revert(state.draft, state.opened, G.DB.save);
    saveRoster();
    back();
    if (changed) G.UI.toast(revertText(result));
  }
  function leave(sound) {
    hideTooltip();
    sell.end();
    bag.close();
    stopMosaic();
    G.Audio.sfx(sound);
    G.MenuUI.open();
  }
  /** Esc: back one thing, then out. */
  function escape() {
    if (state.openList) return closeList();
    if (state.upgrade) return closeUpgrades();
    if (state.movesOpen) return closeMoves();
    if (state.held) {
      state.held = null;
      return redraw();
    }
    if (bag.inHand()) return bag.release();
    if (bag.isOpen()) return bag.toggle();
    if (sell.mode()) return sell.end();
    back();
  }

  // ---------- the cursor ----------
  const slotIds = [0, 1, 2, 3, 4, 5].map((slot) => SLOT_ID + slot);
  function memberItems() {
    return state.draft.team.flatMap((member, slot) =>
      member ? ['upgrade-' + slot, LEVEL_UP_ID + slot, 'favorite-' + slot, 'lock-' + slot] : []
    );
  }
  function detailItems() {
    const { dex, uid } = state.selected;
    if (dex == null || (!uid && !G.DB.save.owned[dex])) return [];
    return uid ? ['rename', 'detail-favorite', 'detail-lock', 'levelup', 'hex', 'moves'] : ['hex', 'moves'];
  }
  function eligibleItems() {
    tick.value; // read again after a change
    if (!G.DB.save) return [];
    if (state.upgrade) return upgradeItems();
    if (state.movesOpen) return G.MenuTeamDetail.movesItems(G.DEX_BY[state.selected.dex]);
    if (state.openList) return [state.openList, ...G.MenuTeamGrid.ROWS_OF[state.openList](menu).map((row) => row.id)];
    const places = [...slotIds, ...shownNow().ids, ...G.MenuTeamGrid.tabs().map((tab) => tab.id)];
    if (state.held) return places;
    const rows = bag.isOpen() ? ExpBag.items() : [];
    if (bag.inHand()) return [...places, ...rows];
    const bottom = ['sell', 'expbag', 'revert', 'back'];
    return ['search', 'filter', 'sort', ...places, ...rows, ...memberItems(), ...detailItems(), ...bottom];
  }
  /** Enter or Space on the item under the cursor. */
  function press(id) {
    if (state.upgrade) return pressInUpgrades(id);
    if (state.openList) {
      const row = G.MenuTeamGrid.ROWS_OF[state.openList](menu).find((entry) => entry.id === id);
      return row ? row.press() : closeList();
    }
    if (id.startsWith(SLOT_ID)) return pressSlot(+id.slice(SLOT_ID.length));
    if (id.startsWith(COPY_ID) || id.startsWith(DEX_ID)) return pressCell(id);
    const tab = G.MenuTeamGrid.tabs().find((entry) => entry.id === id);
    if (tab) return pressTab(tab);
    if (ExpBag.sizeOf(id)) return bag.press(ExpBag.sizeOf(id));
    if (id.startsWith(LEVEL_UP_ID)) return bag.levelUp(state.draft.team[+id.slice(LEVEL_UP_ID.length)].uid);
    const mark = MARK_ID.exec(id);
    if (mark) return toggleMark(state.draft.team[+mark[2]].uid, mark[1]);
    if (/^upgrade-\d$/.test(id)) return openUpgrades(+id.slice('upgrade-'.length));
    const action = PRESSES[id];
    if (action) action();
  }
  /** Enter or Space while the Upgrade popup is open: a card's buy button or Close. Anything else (the Team menu behind
   *  the popup) does nothing. */
  function pressInUpgrades(id) {
    if (id === G.MenuUpgrades.CLOSE_ID) return closeUpgrades();
    if (id === G.MenuUpgrades.PREVIOUS_ID) return stepUpgrade(-1);
    if (id === G.MenuUpgrades.NEXT_ID) return stepUpgrade(1);
    const cardKey = G.MenuUpgrades.cardKeyOf(id);
    if (cardKey) buyUpgrade(cardKey);
  }
  const PRESSES = {
    search: () => cursor.elementOf('search').querySelector('input').focus(),
    filter: () => toggleList('filter'),
    sort: () => toggleList('sort'),
    rename: startRename,
    'detail-favorite': () => toggleMark(state.selected.uid, 'favorite'),
    'detail-lock': () => toggleMark(state.selected.uid, 'lock'),
    levelup: () => bag.levelUp(state.selected.uid),
    hex: toggleHex,
    moves: openMoves,
    'moves-close': closeMoves,
    sell: pressSell,
    expbag: bag.toggle,
    revert,
    back,
  };
  function toggleHex() {
    state.showHex = !state.showHex;
    redraw();
  }
  /** By keys a slot or a portrait is selected and lifted in one press. */
  function pressSlot(slot) {
    const busy = state.held || bag.inHand() || sell.mode(),
      member = state.draft.team[slot];
    clickSlot(slot);
    if (!busy && member && member.uid) lift({ uid: member.uid, fromSlot: slot });
  }
  function pressCell(id) {
    const busy = state.held || bag.inHand() || sell.mode();
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
    keys: { q: () => stepUpgrade(-1), e: () => stepUpgrade(1) }, // the Upgrade popup's arrows (as the Gacha tabs)
    tipFor: (id) => (id.startsWith(COPY_ID) || id.startsWith(DEX_ID) ? G.MenuTeamGrid.tipOf(menu, id) : null),
  });

  /** 1 to 6 puts the selected (or lifted) Pokemon in that slot; Shift+1 to 5 moves it to that box. */
  function onNumberKey(event) {
    const digit = /^(?:Digit|Numpad)([1-6])$/.exec(event.code);
    if (!digit || !isOpen() || G.UI.isOpen('scr-ask') || event.target.closest('input, textarea, select')) return;
    if (state.upgrade && !event.shiftKey) return showUpgradeByKey(event, +digit[1] - 1);
    if (state.openList || state.movesOpen || state.upgrade || bag.inHand() || sell.mode()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const held = state.held || { uid: state.selected.uid, fromSlot: null },
      index = +digit[1] - 1;
    state.held = null;
    if (!held.uid) return G.UI.toast(PICK_A_COPY);
    if (!event.shiftKey) return drop(held, { kind: 'slot', slot: index });
    if (index < G.Copies.BOX_MAX) drop(held, { kind: 'box', box: index });
  }

  /** 1 to 6 while the Upgrade popup is open: show that team slot's copy, as the slot numbers do in a run. */
  function showUpgradeByKey(event, slot) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (slot === state.upgrade.slot) return;
    if (upgradeSlots().includes(slot)) showUpgradeSlot(slot);
    else refuseUpgradeSlot();
  }

  /** cursor.bar beside the item it is on, with its CRT; drawn by each piece that is not its own cursor. */
  const bar = signal({ at: null, phase: null });
  function Bar({ id, height }) {
    return bar.value.at === id ? html`<${CursorBar} phase=${bar.value.phase} height=${height} />` : null;
  }
  const hasBar = (id) =>
    !!id &&
    (id.startsWith(SLOT_ID) ||
      !!ExpBag.sizeOf(id) ||
      MARK_ID.test(id) ||
      ['rename', 'detail-favorite', 'detail-lock'].includes(id));
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
  const watchedRefusal = (uid) => {
    tick.value;
    return bag.refusal(uid);
  };
  const menu = {
    cursor,
    sell,
    Bar,
    byKeys: () => inputMode.value === 'keys',
    layout: () => layout.value,
    draft: watched(() => state.draft),
    slot: watched(() => state.slot),
    tab: watched(() => state.tab),
    held: watched(() => state.held),
    selected: watched(() => state.selected),
    bag: { ...bag, inHand: watched(bag.inHand), isOpen: watched(bag.isOpen), refusal: watchedRefusal },
    filter: watched(() => state.filter),
    openList: watched(() => state.openList),
    movesOpen: watched(() => state.movesOpen),
    upgradeUid: watched(() => state.upgrade && state.upgrade.uid),
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
    clickDetail,
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
    closeUpgrades,
    buyUpgrade,
    canSwitchUpgrade,
    stepUpgrade,
  };

  // ---------- drawing ----------
  const points = (list) => list.map(([x, y]) => x + ',' + y).join(' ');
  /** The bars; their step starts where the detail panel does. */
  function FrameBars() {
    const { windowWidth, windowHeight, slopeLeft, slopeRight } = layout.value;
    const top = [
      [0, BAR.height],
      [slopeLeft, BAR.height],
      [slopeRight, BAR.deep],
      [windowWidth, BAR.deep],
    ];
    const bottom = top.map(([x, y]) => [x, windowHeight - y]);
    const closed = (edge, y) => points([...edge, [windowWidth, y], [0, y]]);
    return html`<svg class="tm-bars" width=${windowWidth} height=${windowHeight}>
      <polygon points=${closed(top, 0)} />
      <polygon points=${closed(bottom, windowHeight)} />
      <polyline points=${points(top)} />
      <polyline points=${points(bottom)} />
    </svg>`;
  }

  /** What a bar holds, at its right end: shrunk to the room right of the slope when it is wider than that. */
  function BarContents({ side, className, children }) {
    const ref = hooks.useRef(null),
      { windowWidth, slopeRight } = layout.value;
    hooks.useLayoutEffect(() => {
      const room = windowWidth - BAR_CONTENTS_RIGHT - slopeRight,
        fit = Math.min(1, room / ref.current.offsetWidth);
      ref.current.style.transform = `scale(${fit})`;
    });
    return html`<div
      ref=${ref}
      class=${'tm-bar-contents is-' + side + ' ' + className}
      style=${{ height: px(BAR.deep) }}
    >
      ${children}
    </div>`;
  }

  function Counters() {
    tick.value;
    const save = G.DB.save;
    const [place, count] =
      state.tab === 'dex'
        ? ['Pokedex', G.DEX.filter((species) => save.owned[species.dex]).length + ' / ' + G.DEX.length]
        : ['Box ' + (state.tab + 1), G.Copies.inBox(save, state.tab) + ' / ' + G.Copies.BOX_SIZE];
    return html`<${BarContents} side="top" className="tm-counters">
      <span><span class="tm-place">${place}</span>${count}</span>
      <span class="tm-coins"><span class="coin"></span> ${coinText(save.coins || 0)}</span>
    </${BarContents}>`;
  }

  /** The lifted Pokemon, on the item the cursor is on. */
  function Ghost({ at }) {
    const ref = hooks.useRef(null);
    hooks.useLayoutEffect(() => {
      const element = ref.current && at && cursor.elementOf(at);
      if (!element) return;
      const place = element.getBoundingClientRect(),
        frame = stage.getBoundingClientRect();
      ref.current.style.left = place.right - frame.left - GHOST.size / 2 + 'px';
      ref.current.style.top = place.top - frame.top - GHOST.size / 2 + 'px';
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

  /** A bottom bar button, or one of the row under the grid. */
  function FrameButton({ id, width, height, fontSize, ...rest }) {
    return html`<${CursorButton}
      cursor=${cursor}
      id=${id}
      action=${'team-' + id}
      look="glitch"
      width=${width}
      height=${height}
      fontSize=${fontSize}
      ...${rest}
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
    const { scale, width, height, row, grid } = layout.value,
      body = { width: px(width), height: px(height), transform: `scale(${scale})` };
    return html`<${FrameBars} />
      <${BarTravel} at=${byKeys} />
      <${Counters} />
      <${BarContents} side="bottom" className="tm-bar-buttons">
        <${FrameButton} id="revert" label="Revert" intent="negative" onPress=${revert} ...${FRAME_BUTTON} />
        <${FrameButton} id="back" label="Back" intent="positive" onPress=${back} ...${FRAME_BUTTON} />
      </${BarContents}>
      <div class="pm-stage tm-body" style=${body}>
        <${G.MenuTeamSlots.Column} menu=${menu} />
        <${G.MenuTeamGrid.Finder} menu=${menu} at=${byKeys} />
        <${G.MenuTeamGrid.Grid} menu=${menu} at=${at} />
        <${FrameButton}
          id="sell"
          label=${sellLabel()}
          intent="negative"
          held=${!!sell.mode()}
          width=${row.sellWidth}
          height=${ROW.height}
          fontSize=${ROW.sellFont}
          onPress=${pressSell}
          style=${{ left: px(grid.left), top: px(row.top) }}
        />
        <${G.MenuTeamGrid.Tabs} menu=${menu} />
        <${FrameButton}
          id="expbag"
          label="EXP Bag"
          width=${row.expBagWidth}
          height=${ROW.height}
          fontSize=${ROW.expBagFont}
          held=${bag.isOpen()}
          onPress=${bag.toggle}
          style=${{ left: px(row.expBagLeft), top: px(row.top) }}
        />
        <${G.MenuTeamDetail.Detail} menu=${menu} at=${byKeys} />
        <${ExpBag.Popup} menu=${menu} />
        <${G.MenuTeamGrid.OpenList} menu=${menu} at=${byKeys} />
        <${G.MenuTeamDetail.MovesPopup} menu=${menu} at=${byKeys} />
        <${G.MenuUpgrades.Popup} menu=${menu} />
      </div>
      <${Ghost} at=${at} />
      <${ExpBag.Ghost} menu=${menu} at=${at} stage=${stage} />
      <${cursor.CursorTip} />`;
  }

  // ---------- the background (#168) ----------
  let mosaic = null;
  function stopMosaic() {
    burstTimers.forEach(clearTimeout);
    burstTimers.clear();
    if (mosaic) mosaic.stop();
    mosaic = null;
  }
  function startMosaic() {
    stopMosaic();
    mosaic = G.Lib.Mosaic.start(mosaicHost, {
      still: !G.Settings.get('teamBackgroundMoves'),
      starburst: G.Settings.get('levelUpStarburst'),
      isWanted: () => G.UI.isOpen('scr-roster'),
    });
  }

  // ---------- opening ----------
  function open() {
    const save = G.DB.save;
    G.DB.normalizeTeam(save);
    state.draft = Draft.open(save);
    state.opened = Draft.open(save);
    Object.assign(state, { held: null, drag: null, openList: null, movesOpen: false, upgrade: null, renaming: false });
    if (state.tab !== 'dex' && state.tab >= G.Copies.boxCount(save)) state.tab = 0;
    G.UI.chrome(false); // it has its own counters
    G.UI.show('scr-roster');
    fitLayout();
    startMosaic();
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
  addEventListener('resize', fitLayout);

  return { init, open, roster: () => state.draft.team };
})();
