/* ============ keep-sell-ui.js: the keep-or-sell list (G.KeepSellUI; #146) ============
 * When a run's kept catches do not all fit the Pokebox, G.Catch.settle holds them in save.heldCatches and the Main Menu
 * opens this list instead of placing them. Every rule is G.Catch's (resolve) and G.Copies' (free places); this file draws
 * and routes input. Look: board page main.keepOrSell (tools/library/keep-sell-draft.js); rulings: decision
 * 2026-11-26-146-keep-or-sell-open-decisions. On the menu screens' 1920 x 1080 stage, over the dimmed Main Menu.
 *   rows     one per held catch: portrait.round (a Sell row takes the sale state), "{Nature} {Name}" in Silver, the
 *            species' rarity stars, "Sells for N", toggle.power Keep or Sell. The first catches that fit start as Keep.
 *            Keep is refused (the error sound and a red toast) once the Keeps fill the free places. Past five rows the
 *            list scrolls (#173).
 *   buttons  Make Room opens the Team menu as normal; anything that leaves it comes back here, the free places counted
 *            again and the marks kept. Confirm (and Esc) places every Keep and sells the rest, then one notice.
 *   input    the menu windows' selection cursor (createMenuCursor) over every control. Enter or Space, or a click,
 *            flips a row's mark.
 *   compare  #173 (decisions 2026-11-27-173-*; mockup docs/AI Outputs/Issue-173/keep-or-sell-panel.excalidraw): the
 *            owned box right of the list holds every copy of the selected row's species (team copies too, best IV + EV
 *            total first) and follows the row. Two short detail panels (G.MenuTeamDetail.ShortPanel) sit outside the
 *            window: left, with Detail on, the selected row's held copy; right, the owned face under the cursor, else
 *            the pinned one (a click, Enter or Space pins; the same face again unpins; Esc unpins before it confirms).
 *            The owned panel's favorite and lock switch, and its Sell sells that copy after a dialog, by the Team
 *            menu's rules (never a team or locked copy), freeing a place. Detail and Hex are remembered on this device
 *            (G.Settings keepSellDetail, keepSellHex).
 */
G.KeepSellUI = (() => {
  const kitOverlay = G.HudOverlay,
    windowKit = G.MenuWindowKit,
    library = G.Lib || {},
    windowHost = document.getElementById('ks-window'),
    stageHost = document.querySelector('#scr-keepsell .ks-host'),
    stage = document.querySelector('#scr-keepsell .ks-stage');
  const pieces = [library.Panel, library.Portrait, library.Toggle, library.Cursor];
  if (
    !kitOverlay ||
    !kitOverlay.ready ||
    !windowKit.ready ||
    !windowHost ||
    !stageHost ||
    !pieces.every((p) => p && p.ready)
  ) {
    console.warn('[KeepSell] the HUD kit or the UI library did not load: the keep-or-sell list cannot open');
    return { init() {}, open: (done) => done && done(), noticeOf: () => '' };
  }
  const { html, signal, hooks, preact, fitToStage, portraitSource, portraitFallback, ScrollBox } = kitOverlay.kit;
  const { px, createMenuCursor, CursorButton } = windowKit;
  const { CleanPanel, ShopCardPanel } = library.Panel,
    { RoundPortrait } = library.Portrait,
    { PowerToggle } = library.Toggle,
    { CursorBar, CursorRing, CURSOR_RING } = library.Cursor;
  // #173: the side panels; without the Team menu's pieces the list still works, without them
  const panelKit = G.MenuTeamDetail && G.MenuTeamDetail.ready && G.MenuTeamSlots.ready ? G.MenuTeamDetail : null;

  // ---------- sizes and places (px in the window; the board's KEEP_SELL) ----------
  const STAGE = { width: 1920, height: 1080 },
    WINDOW = { width: 948, height: 600 }, // as wide as the catch window (#173), so the side panels fit the same way
    INSET = 24,
    TITLE = { top: 20, size: 20 },
    LINE = { top: 54, size: 12 },
    COUNTER = { top: 22, size: 14 },
    LIST = { top: 88, rowHeight: 64, gap: 8, visibleRows: 5 },
    ROW = { face: 48, stroke: 2, faceLeft: 12, nameLeft: 76, nameSize: 20, starsTop: 38, starSize: 12, priceLeft: 330 },
    TOGGLE = { width: 110, right: 12 }, // a fixed column, so the mark never moves as the label changes (label 14 px: css)
    BUTTON = { width: 220, height: 54, bottom: 20 },
    DETAIL = { top: 456 }, // the Detail toggle, under the list
    // the owned box: the catch screen's look (48 px faces, four across, scrolling)
    OWNED = { width: 284, inset: 16, columns: 4, face: 48, faceStroke: 2, columnGap: 20, rowGap: 16, trackRight: 3 },
    SIDE = { scale: 0.85, gap: 10 }, // the side panels, as on the catch screen
    SELL_BUTTON = { left: 8, width: 120, height: 44, fontSize: 15 },
    SELL_DIM = 0.55, // a Sell row's text, so the Keeps read first
    RARITY_STARS = 5;
  OWNED.left = WINDOW.width - INSET - OWNED.width;
  OWNED.top = LIST.top;
  OWNED.height = LIST.visibleRows * (LIST.rowHeight + LIST.gap) - LIST.gap;
  OWNED.room = CURSOR_RING.reach; // the scroll box is a ring's reach bigger all round, so the ring is never clipped
  OWNED.rowPitch = OWNED.face + OWNED.rowGap;
  OWNED.gridWidth = OWNED.columns * OWNED.face + (OWNED.columns - 1) * OWNED.columnGap;
  ROW.width = OWNED.left - INSET - INSET;
  const ROW_ID = 'row-',
    FACE_ID = 'own-',
    MAKE_ROOM_ID = 'make-room',
    CONFIRM_ID = 'confirm',
    DETAIL_ID = 'ks-detail',
    HELD_PREFIX = 'ks-held',
    OWNED_PREFIX = 'ks-owned',
    PANEL_ITEMS = ['favorite', 'lock', 'hex'].map((item) => OWNED_PREFIX + '-' + item),
    SELL_ID = OWNED_PREFIX + '-sell',
    NO_DRAFT = { team: [] }, // G.TeamDraft's refusals with no Team menu edits open
    NO_ROOM = 'No free places left. Set one to Sell, or Make Room.',
    BAD_NEWS = 'bad', // G.UI.toast's red tone
    NOTICE_MS = 5000;

  // ---------- state ----------
  const shown = signal(null); // { list: held catches, keeps: [bool], free, version } while open, else null
  const detailOn = signal(false), // G.Settings keepSellDetail
    hexOn = signal(false), // both side panels' Hex (G.Settings keepSellHex)
    pinned = signal(null), // the pinned owned copy's UUID, or null
    rowSelected = signal(0); // the selected row: the last row the cursor was on
  let onDone = null; // called once the list is answered (or there was nothing to answer)

  const isOpen = () => G.UI.isOpen('scr-keepsell');
  const keptCount = (view) => view.keeps.filter(Boolean).length;
  const cursor = createMenuCursor({
    host: stageHost,
    isOpen,
    eligibleItems,
    home: ROW_ID + 0,
    press,
    escape: () => (pinned.value ? unpin() : confirm()), // Esc unpins a face first, then acts as Confirm
  });
  function eligibleItems() {
    const view = shown.value;
    if (!view) return [];
    const faces = ownedCopies().map((copy, index) => FACE_ID + index);
    const held = panelKit && detailOn.value ? [HELD_PREFIX + '-hex'] : [];
    const ownedPanel = pinnedIndex() >= 0 ? [...PANEL_ITEMS, SELL_ID] : [];
    return [
      ...view.list.map((h, i) => ROW_ID + i),
      ...(panelKit ? [DETAIL_ID] : []),
      ...faces,
      MAKE_ROOM_ID,
      CONFIRM_ID,
      ...held,
      ...ownedPanel,
    ];
  }

  // ---------- the selected row and its species' owned copies ----------
  /** The selected row: the last row the cursor was on (KeepSellWindow notes it after each draw; not read from the cursor
   *  here, since the cursor asks eligibleItems, which needs this, where it is). */
  const selectedRow = () => (shown.value ? Math.min(rowSelected.value, shown.value.list.length - 1) : 0);
  let ownedCache = { key: null, list: [] };
  /** Every copy owned of the selected row's species, best IV + EV total first (read again after a sale or a mark). */
  function ownedCopies() {
    const view = shown.value;
    if (!view) return [];
    const dex = view.list[selectedRow()].dex,
      key = dex + ':' + view.version;
    if (ownedCache.key === key) return ownedCache.list;
    const ivEv = (copy) => copy.iv.reduce((sum, value) => sum + value, 0) + copy.evTotal;
    const list = G.Copies.all(G.DB.save).filter((copy) => copy.speciesID === dex);
    list.sort((a, b) => ivEv(b) - ivEv(a));
    ownedCache = { key, list };
    return list;
  }
  const pinnedIndex = () => ownedCopies().findIndex((copy) => copy.pokemonUUID === pinned.value);
  /** The owned copy the right panel shows: the face under the cursor (keys or mouse), else the pinned one. */
  function previewCopy() {
    const at = cursor.cursorOn(),
      list = ownedCopies();
    if (at && at.startsWith(FACE_ID)) return list[+at.slice(FACE_ID.length)] || null;
    return list[pinnedIndex()] || null;
  }

  function init() {
    addEventListener('keydown', cursor.onKey); // after menu.js's listener (createMenuCursor's onKey says why)
  }

  /** Opens the list for the save's held catches; done() runs once they are answered (at once when there are none). */
  function open(done) {
    const list = G.DB.save ? G.Catch.heldCatches(G.DB.save) : [];
    if (!list.length) return done && done();
    onDone = done;
    const free = G.Copies.freePlaces(G.DB.save);
    shown.value = { list, keeps: list.map((h, i) => i < free), free, version: 0 };
    detailOn.value = !!G.Settings.get('keepSellDetail');
    hexOn.value = !!G.Settings.get('keepSellHex');
    pinned.value = null;
    rowSelected.value = 0;
    G.UI.show('scr-keepsell', true);
    fitStage();
    cursor.moveTo(ROW_ID + 0);
  }

  /** The free places counted again, the marks kept (dropped from the bottom if they no longer fit), the box read again. */
  function recount() {
    const view = shown.value,
      free = G.Copies.freePlaces(G.DB.save),
      keeps = view.keeps.slice();
    for (let i = keeps.length - 1; i >= 0 && keeps.filter(Boolean).length > free; i--) keeps[i] = false;
    shown.value = { ...view, keeps, free, version: view.version + 1 };
    return free;
  }

  /** Back from Make Room: the free places counted again, the marks kept. */
  function reopen() {
    if (!shown.value) return;
    const free = recount();
    G.UI.show('scr-keepsell', true);
    fitStage();
    cursor.moveTo(MAKE_ROOM_ID);
    G.UI.toast(`You have ${free} free place${free === 1 ? '' : 's'}.`);
  }

  function press(at) {
    if (at === MAKE_ROOM_ID) return makeRoom();
    if (at === CONFIRM_ID) return confirm();
    if (at === DETAIL_ID) return toggleDetail();
    if (at === SELL_ID) return sellOwned();
    if (at.endsWith('-hex')) return toggleHex();
    if (at === PANEL_ITEMS[0] || at === PANEL_ITEMS[1]) return markOwned(at.slice(OWNED_PREFIX.length + 1));
    if (at.startsWith(FACE_ID)) return pinFace(+at.slice(FACE_ID.length));
    if (at.startsWith(ROW_ID)) flip(+at.slice(ROW_ID.length));
  }

  /** A row's mark: Keep to Sell always; Sell to Keep only while a free place is left. */
  function flip(index) {
    const view = shown.value;
    if (!view) return;
    const keeping = !view.keeps[index];
    if (keeping && keptCount(view) >= view.free) {
      G.Audio.sfx('error');
      G.UI.toast(NO_ROOM, undefined, BAD_NEWS);
      return;
    }
    const keeps = view.keeps.slice();
    keeps[index] = keeping;
    shown.value = { ...view, keeps };
    G.Audio.sfx('select');
  }

  // ---------- the owned box and the side panels (#173) ----------
  /** A face pressed: pins it, or unpins it when it is the pinned one. */
  function pinFace(index) {
    const copy = ownedCopies()[index];
    if (!copy || !panelKit) return;
    pinned.value = pinned.value === copy.pokemonUUID ? null : copy.pokemonUUID;
    G.Audio.sfx('select');
  }
  /** Esc with a face pinned: unpins it (the cursor back on its face if it was in the panel). */
  function unpin() {
    const index = pinnedIndex(),
      at = cursor.cursorOn();
    if (index >= 0 && at && at.startsWith(OWNED_PREFIX)) cursor.moveTo(FACE_ID + index);
    pinned.value = null;
    G.Audio.sfx('back');
  }
  function toggleDetail() {
    detailOn.value = !detailOn.value;
    G.Settings.set('keepSellDetail', detailOn.value);
    G.Audio.sfx('click');
  }
  function toggleHex() {
    hexOn.value = !hexOn.value;
    G.Settings.set('keepSellHex', hexOn.value);
    G.Audio.sfx('click');
  }
  const redrawBox = () => (shown.value = { ...shown.value, version: shown.value.version + 1 });
  /** The shown owned copy's favorite or lock, switched and saved at once. */
  function markOwned(which) {
    const copy = previewCopy();
    if (copy && G.MenuTeamSlots.toggleCopyMark(copy.pokemonUUID, which)) redrawBox();
  }
  function refuse(why) {
    G.Audio.sfx('error');
    G.UI.toast(why, undefined, BAD_NEWS);
  }
  /** Sell on the owned panel: the Team menu's rules and dialog; a sale frees a place for the Keeps. */
  async function sellOwned() {
    const save = G.DB.save,
      copy = previewCopy();
    if (!copy) return;
    const why = G.TeamDraft.sellRefusal(NO_DRAFT, save, copy);
    if (why) return refuse(why);
    const name = copy.nickname || G.DEX_BY[copy.speciesID].name;
    if (!(await G.MenuTeamSell.askToSell(copy, name)) || !shown.value) return;
    const result = G.Copies.sell(save, copy.pokemonUUID);
    if (!result.ok) return refuse('Nothing was sold.');
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.refreshCoins();
    G.UI.toast(`Sold ${name} for ${G.MenuTeamSell.coinText(result.coins)} PokeCoins`);
    pinned.value = null;
    cursor.moveTo(ROW_ID + selectedRow());
    recount();
  }

  /** Make Room: the Team menu as normal; leaving it in any way comes back here. */
  function makeRoom() {
    G.Audio.sfx('select');
    G.MenuTeam.open({ onLeave: reopen });
  }

  /** Confirm (and Esc): every Keep placed, the rest sold, saved, one notice, then the Main Menu. */
  function confirm() {
    const view = shown.value;
    if (!view) return;
    const result = G.Catch.resolve(view.keeps, G.DB.save);
    if (!result.ok) {
      G.Audio.sfx('error');
      G.UI.toast(NO_ROOM, undefined, BAD_NEWS);
      return;
    }
    G.DB.commit();
    G.UI.refreshCoins();
    G.Audio.sfx('confirm');
    shown.value = null;
    G.UI.hide('scr-keepsell');
    G.UI.toast(noticeOf(result), NOTICE_MS);
    const done = onDone;
    onDone = null;
    if (done) done();
  }

  /** "A, B and C" */
  function namesText(names) {
    if (names.length < 2) return names.join('');
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }
  /** The one notice for a resolve or a sale on load: who joined the Pokebox, who was sold and for how much. */
  function noticeOf(result) {
    const lines = [];
    if (result.placed.length) lines.push(namesText(result.placed) + ' joined your Pokebox.');
    if (result.sold.length) {
      const verb = result.sold.length === 1 ? 'was' : 'were';
      lines.push(`${namesText(result.sold.map((line) => line.name))} ${verb} sold for ${result.coins} PokeCoins.`);
    }
    return lines.join(' ');
  }

  // ---------- drawing ----------
  const text = (content, { size, colour = 'var(--color-grey-white)', font = 'HudModule', style = {} }) =>
    html`<div
      class="ks-text"
      style=${{ fontFamily: `'${font}', sans-serif`, fontSize: px(size), lineHeight: px(size + 4), color: colour, ...style }}
    >
      ${content}
    </div>`;

  function Row({ held, index, view }) {
    const id = ROW_ID + index,
      keep = view.keeps[index],
      dim = keep ? {} : { opacity: SELL_DIM },
      species = G.DEX_BY && G.DEX_BY[held.dex],
      rarity = Math.max(1, Math.min(RARITY_STARS, (species && species.rarity) || 1)),
      Frame = keep ? ShopCardPanel : CleanPanel;
    return html`<div
      class="ks-row"
      data-cursor-id=${id}
      style=${{ left: 0, top: px(index * (LIST.rowHeight + LIST.gap)), width: px(ROW.width), height: px(LIST.rowHeight) }}
      onMouseEnter=${() => cursor.hover(id)}
      onMouseLeave=${() => cursor.hover(null)}
      onClick=${() => flip(index)}
    >
      <${Frame} className=${keep ? 'ks-frame' : 'ks-frame ks-frame-sell'} style=${{ width: '100%', height: '100%' }}>
        <${RoundPortrait}
          size=${ROW.face}
          stroke=${ROW.stroke}
          src=${portraitSource(held.dex, false)}
          dex=${held.dex}
          onError=${portraitFallback}
          state=${keep ? null : 'sale'}
          style=${{ position: 'absolute', left: px(ROW.faceLeft), top: px((LIST.rowHeight - ROW.face) / 2) }}
        />
        ${text(`${held.natureName} ${held.name}`, {
          size: ROW.nameSize,
          font: 'Silver 10px',
          style: { left: px(ROW.nameLeft), top: px(10), ...dim },
        })}
        ${text('★'.repeat(rarity) + '☆'.repeat(RARITY_STARS - rarity), {
          size: ROW.starSize,
          colour: 'var(--color-yellow-base)',
          style: { left: px(ROW.nameLeft), top: px(ROW.starsTop), ...dim },
        })}
        ${text(`Sells for ${G.Copies.priceFor(held.dex, false)}`, {
          size: COUNTER.size,
          style: {
            left: px(ROW.priceLeft),
            top: 0,
            height: px(LIST.rowHeight),
            display: 'flex',
            alignItems: 'center',
            ...dim,
          },
        })}
        <div
          class="ks-toggle"
          style=${{ left: px(ROW.width - TOGGLE.right - TOGGLE.width), width: px(TOGGLE.width), height: px(LIST.rowHeight) }}
        >
          <${PowerToggle}
            on=${keep}
            label=${keep ? 'Keep' : 'Sell'}
            cursor=${cursor.isShownOn(id)}
          />
        </div>
      </${Frame}>
      ${cursor.isShownOn(id) ? html`<${CursorBar} phase=${null} height=${LIST.rowHeight} />` : null}
    </div>`;
  }

  function List({ view }) {
    const pitch = LIST.rowHeight + LIST.gap;
    return html`<${ScrollBox}
      box=${{ left: INSET, top: LIST.top, width: ROW.width + 16, height: OWNED.height }}
      trackRight=${0}
      look="clean"
      resetOn=${[view.list]}
    >
      <div class="ks-list" style=${{ height: px(view.list.length * pitch - LIST.gap) }}>
        ${view.list.map((held, index) => html`<${Row} key=${index} held=${held} index=${index} view=${view} />`)}
      </div>
    </${ScrollBox}>`;
  }

  function OwnedBox() {
    const list = ownedCopies(),
      room = OWNED.room,
      rows = Math.ceil(list.length / OWNED.columns);
    const cells = list.map((copy, index) => {
      const id = FACE_ID + index;
      return html`<div
        key=${copy.pokemonUUID}
        class="ks-owned-cell"
        data-cursor-id=${id}
        style=${{
          left: px(room + (index % OWNED.columns) * (OWNED.face + OWNED.columnGap)),
          top: px(room + Math.floor(index / OWNED.columns) * OWNED.rowPitch),
          width: px(OWNED.face),
          height: px(OWNED.face),
        }}
        onMouseEnter=${() => cursor.hover(id)}
        onMouseLeave=${() => cursor.hover(null)}
        onClick=${() => pinFace(index)}
      >
        <${RoundPortrait}
          size=${OWNED.face}
          stroke=${OWNED.faceStroke}
          src=${portraitSource(copy.speciesID, copy.isShiny)}
          dex=${copy.speciesID}
          onError=${portraitFallback}
        />
        ${cursor.isShownOn(id) ? html`<${CursorRing} phase=${null} />` : null}
      </div>`;
    });
    return html`<div
      class="ks-owned panel-clean"
      style=${{ left: px(OWNED.left), top: px(OWNED.top), width: px(OWNED.width), height: px(OWNED.height) }}
    >
      <${ScrollBox}
        box=${{
          left: OWNED.inset - room,
          top: OWNED.inset - room,
          width: OWNED.gridWidth + 2 * room,
          height: OWNED.height - 2 * OWNED.inset + 2 * room,
        }}
        trackRight=${OWNED.trackRight}
        look="clean"
        resetOn=${[selectedRow()]}
      >
        <div class="ks-owned-grid" style=${{ height: px(rows * OWNED.rowPitch - OWNED.rowGap + 2 * room) }}>${cells}</div>
      </${ScrollBox}>
      ${list.length ? null : text('None owned yet', { size: COUNTER.size, style: { left: px(OWNED.inset), top: px(OWNED.inset) } })}
    </div>`;
  }

  function KeepSellWindow() {
    const view = shown.value;
    const at = cursor.cursorOn(); // and redraw when the cursor moves
    hooks.useEffect(() => {
      if (at && at.startsWith(ROW_ID)) rowSelected.value = +at.slice(ROW_ID.length);
    }, [at]);
    if (!view) return null;
    const kept = keptCount(view),
      full = kept >= view.free,
      buttonTop = WINDOW.height - BUTTON.bottom - BUTTON.height;
    return html`<div class="ks-pane">
      ${text('Your Pokebox is full', { size: TITLE.size, colour: 'var(--color-yellow-base)', style: { left: px(INSET), top: px(TITLE.top) } })}
      ${text('Choose who to keep. The rest are sold for PokeCoins.', { size: LINE.size, style: { left: px(INSET), top: px(LINE.top) } })}
      ${text(`Keep ${kept} of ${view.free} free place${view.free === 1 ? '' : 's'}`, {
        size: COUNTER.size,
        colour: full ? 'var(--color-red-base)' : 'var(--color-teal-base)',
        style: { right: px(INSET), top: px(COUNTER.top) },
      })}
      <${List} view=${view} />
      <${OwnedBox} />
      ${
        panelKit
          ? html`<div class="ks-detail" style=${{ left: px(INSET), top: px(DETAIL.top) }}>
              <${PowerToggle}
                on=${detailOn.value}
                label="Detail"
                cursor=${cursor.isShownOn(DETAIL_ID)}
                onPress=${toggleDetail}
                attrs=${{
                  'data-cursor-id': DETAIL_ID,
                  onMouseEnter: () => cursor.hover(DETAIL_ID),
                  onMouseLeave: () => cursor.hover(null),
                }}
              />
            </div>`
          : null
      }
      <${CursorButton}
        cursor=${cursor}
        id=${MAKE_ROOM_ID}
        action="ks-make-room"
        label="Make Room"
        look="glitch"
        intent="neutral"
        width=${BUTTON.width}
        height=${BUTTON.height}
        onPress=${makeRoom}
        style=${{ left: px(INSET), top: px(buttonTop) }}
      />
      <${CursorButton}
        cursor=${cursor}
        id=${CONFIRM_ID}
        action="ks-confirm"
        label=${`Keep ${kept}, sell ${view.list.length - kept}`}
        look="glitch"
        intent="positive"
        width=${BUTTON.width}
        height=${BUTTON.height}
        onPress=${confirm}
        style=${{ left: px(WINDOW.width - INSET - BUTTON.width), top: px(buttonTop) }}
      />
    </div>`;
  }

  /** A side panel's cursor, in G.MenuTeamDetail.ShortPanel's shape. */
  function panelCursor(ids) {
    const at = ids.find((id) => cursor.isShownOn(id)) || null;
    return {
      at,
      hover: cursor.hover,
      Bar: ({ id, height }) => (at === id ? html`<${CursorBar} phase=${null} height=${height} />` : null),
    };
  }

  /** The two short panels outside the window: the held copy (Detail on) and an owned copy (with Sell). */
  function SidePanels() {
    const view = shown.value;
    if (!view || !panelKit) return null;
    cursor.cursorOn(); // redraw when the cursor moves
    const { ShortPanel, SHORT_PANEL } = panelKit,
      width = SHORT_PANEL.width * SIDE.scale,
      windowLeft = (STAGE.width - WINDOW.width) / 2;
    const place = (left) => ({
      left: px(left),
      top: px((STAGE.height - SHORT_PANEL.height * SIDE.scale) / 2),
      transform: 'scale(' + SIDE.scale + ')',
    });
    const hexOf = (prefix) => ({ on: hexOn.value, toggle: toggleHex, id: prefix + '-hex' });
    const held = view.list[selectedRow()],
      heldCopy = held.copy ? G.Copies.read(held.copy, G.DB.save) : null, // an old save's catch has no copy
      owned = previewCopy();
    return html`${
      detailOn.value
        ? html`<div class="ks-side" style=${place(windowLeft - SIDE.gap - width)}>
            <${ShortPanel}
              species=${G.DEX_BY[held.dex]}
              copy=${heldCopy}
              idPrefix=${HELD_PREFIX}
              hex=${hexOf(HELD_PREFIX)}
              cursor=${panelCursor([HELD_PREFIX + '-hex'])}
            />
          </div>`
        : null
    }
    ${
      owned
        ? html`<div class="ks-side" style=${place(windowLeft + WINDOW.width + SIDE.gap)}>
            <${ShortPanel}
              key=${owned.pokemonUUID}
              species=${G.DEX_BY[owned.speciesID]}
              copy=${owned}
              idPrefix=${OWNED_PREFIX}
              hex=${hexOf(OWNED_PREFIX)}
              cursor=${panelCursor(PANEL_ITEMS)}
              toggleMark=${markOwned}
            >
              <${CursorButton}
                cursor=${cursor}
                id=${SELL_ID}
                label="Sell"
                look="glitch"
                intent="negative"
                width=${SELL_BUTTON.width}
                height=${SELL_BUTTON.height}
                fontSize=${SELL_BUTTON.fontSize}
                onPress=${sellOwned}
                style=${{ left: px(SELL_BUTTON.left), bottom: px(12) }}
              />
            </${ShortPanel}>
          </div>`
        : null
    }`;
  }

  preact.render(html`<${KeepSellWindow} />`, windowHost);
  const sideHost = document.createElement('div');
  sideHost.className = 'ks-sides';
  stage.appendChild(sideHost);
  preact.render(html`<${SidePanels} />`, sideHost);
  const fitStage = fitToStage(stageHost);

  return { init, open, noticeOf, isOpen };
})();
