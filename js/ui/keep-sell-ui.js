/* ============ keep-sell-ui.js: the keep-or-sell list (G.KeepSellUI; #146) ============
 * When a run's kept catches do not all fit the Pokebox, G.Catch.settle holds them in save.heldCatches and the Main Menu
 * opens this list instead of placing them. Every rule is G.Catch's (resolve) and G.Copies' (free places); this file draws
 * and routes input. Look: board page main.keepOrSell (tools/library/keep-sell-draft.js); rulings: decision
 * 2026-11-26-146-keep-or-sell-open-decisions. On the menu screens' 1920 x 1080 stage, over the dimmed Main Menu.
 *   rows     one per held catch: portrait.round (a Sell row takes the sale state), "{Nature} {Name}" in Silver, the
 *            species' rarity stars, "Sells for N", toggle.power Keep or Sell. The first catches that fit start as Keep.
 *            Keep is refused (the error sound and a red toast) once the Keeps fill the free places.
 *   buttons  Make Room opens the Team menu as normal; anything that leaves it comes back here, the free places counted
 *            again and the marks kept. Confirm (and Esc) places every Keep and sells the rest, then one notice.
 *   input    the menu windows' selection cursor (createMenuCursor): the rows, then Make Room and Confirm. Enter or Space,
 *            or a click, flips a row's mark.
 */
G.KeepSellUI = (() => {
  const kitOverlay = G.HudOverlay,
    windowKit = G.MenuWindowKit,
    library = G.Lib || {},
    windowHost = document.getElementById('ks-window'),
    stageHost = document.querySelector('#scr-keepsell .ks-host');
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
  const { html, signal, preact, fitToStage, portraitSource, portraitFallback } = kitOverlay.kit;
  const { px, createMenuCursor, CursorButton } = windowKit;
  const { CleanPanel, ShopCardPanel } = library.Panel,
    { RoundPortrait } = library.Portrait,
    { PowerToggle } = library.Toggle,
    { CursorBar } = library.Cursor;

  // ---------- sizes and places (px in the window; the board's KEEP_SELL) ----------
  const WINDOW = { width: 760, height: 560 },
    INSET = 24,
    TITLE = { top: 20, size: 20 },
    LINE = { top: 54, size: 12 },
    COUNTER = { top: 22, size: 14 },
    LIST = { top: 88, rowHeight: 64, gap: 8 },
    ROW = { face: 48, stroke: 2, faceLeft: 12, nameLeft: 76, nameSize: 20, starsTop: 38, starSize: 12, priceLeft: 440 },
    TOGGLE = { left: 580, width: 110 }, // a fixed column, so the mark never moves as the label changes (label 14 px: css)
    BUTTON = { width: 220, height: 54, bottom: 20 },
    SELL_DIM = 0.55, // a Sell row's text, so the Keeps read first
    RARITY_STARS = 5;
  ROW.width = WINDOW.width - 2 * INSET;
  const ROW_ID = 'row-',
    MAKE_ROOM_ID = 'make-room',
    CONFIRM_ID = 'confirm',
    NO_ROOM = 'No free places left. Set one to Sell, or Make Room.',
    BAD_NEWS = 'bad', // G.UI.toast's red tone
    NOTICE_MS = 5000;

  // ---------- state ----------
  const shown = signal(null); // { list: held catches, keeps: [bool], free } while open, else null
  let onDone = null; // called once the list is answered (or there was nothing to answer)

  const isOpen = () => G.UI.isOpen('scr-keepsell');
  const keptCount = (view) => view.keeps.filter(Boolean).length;
  const cursor = createMenuCursor({
    host: stageHost,
    isOpen,
    eligibleItems,
    home: ROW_ID + 0,
    press,
    escape: confirm, // Esc acts as Confirm (Jess 2026-11-26)
  });
  function eligibleItems() {
    const view = shown.value;
    return view ? [...view.list.map((h, i) => ROW_ID + i), MAKE_ROOM_ID, CONFIRM_ID] : [];
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
    shown.value = { list, keeps: list.map((h, i) => i < free), free };
    G.UI.show('scr-keepsell', true);
    fitStage();
    cursor.moveTo(ROW_ID + 0);
  }

  /** Back from Make Room: the free places counted again, the marks kept (dropped from the bottom if they no longer fit). */
  function reopen() {
    const view = shown.value;
    if (!view) return;
    const free = G.Copies.freePlaces(G.DB.save),
      keeps = view.keeps.slice();
    for (let i = keeps.length - 1; i >= 0 && keeps.filter(Boolean).length > free; i--) keeps[i] = false;
    shown.value = { ...view, keeps, free };
    G.UI.show('scr-keepsell', true);
    fitStage();
    cursor.moveTo(MAKE_ROOM_ID);
    G.UI.toast(`You have ${free} free place${free === 1 ? '' : 's'}.`);
  }

  function press(at) {
    if (at === MAKE_ROOM_ID) return makeRoom();
    if (at === CONFIRM_ID) return confirm();
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
      style=${{ left: px(INSET), top: px(LIST.top + index * (LIST.rowHeight + LIST.gap)), width: px(ROW.width), height: px(LIST.rowHeight) }}
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
        <div class="ks-toggle" style=${{ left: px(TOGGLE.left), width: px(TOGGLE.width), height: px(LIST.rowHeight) }}>
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

  function KeepSellWindow() {
    const view = shown.value;
    if (!view) return null;
    cursor.cursorOn(); // redraw when the cursor moves
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
      ${view.list.map((held, index) => html`<${Row} key=${index} held=${held} index=${index} view=${view} />`)}
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

  preact.render(html`<${KeepSellWindow} />`, windowHost);
  const fitStage = fitToStage(stageHost);

  return { init, open, noticeOf, isOpen };
})();
