/* ============ menu-team-exp-bag.js: the Team menu's EXP Bag (G.MenuTeamExpBag; #139 Part F) ============
 * The popup over the EXP Bag button: one row per Exp Candy size (count, name, icon in a well), the candy in hand and Level Up.
 * By mouse a row is dragged (Shift: 10), or Ctrl-click takes candy in hand (Ctrl+Shift: 10) and a click puts it down. By
 * keys Enter lifts it as it does a Pokemon, with the same Ctrl and Shift. The bag only goes down when candy is given.
 * Sketch: assets/excalidraw/team-menu.excalidraw; decision 2026-11-24-139-part-f-candy-in-the-team-menu. Pinning is #158.
 * The rules are G.Candy's; js/ui/menu-team.js makes one bag (create) and hands it to the drawn pieces as `menu.bag`.
 */
G.MenuTeamExpBag = (() => {
  const overlay = G.HudOverlay,
    windowKit = G.MenuWindowKit,
    lib = G.Lib;
  if (!overlay || !overlay.ready || !windowKit.ready || !lib.Well || !lib.Well.ready) return { ready: false };
  const { html, hooks, IconCanvas } = overlay.kit;
  const { px, modifiers } = windowKit;

  // ---------- sizes (panel pixels) ----------
  const PANEL = { width: 340, above: 10, padX: 18, padY: 14 },
    ROW = { height: 46, gap: 2, well: 40 },
    ICON = 32, // the sheet's own size
    GHOST = 48;
  const HEIGHT = 2 * PANEL.padY + G.Candy.SIZE_ORDER.length * (ROW.height + ROW.gap) - ROW.gap;
  const NAMES = { xs: 'Extra Small', s: 'Small', m: 'Medium', l: 'Large', xl: 'Extra Large' };
  const RIM = {};
  for (const shade of ['light', 'base', 'dark']) RIM[shade] = G.Tokens.color('color.rim.keyItems.' + shade);

  const CANDY_ID = 'candy-';
  const iconOf = (size) => 'ps:exp-candy.' + size;
  /** The popup's cursor stops. */
  const items = () => G.Candy.SIZE_ORDER.map((size) => CANDY_ID + size);
  /** The size a cursor stop is for, or null. */
  const sizeOf = (id) => (id.startsWith(CANDY_ID) ? id.slice(CANDY_ID.length) : null);

  // ---------- the bag's state and actions ----------
  const LEVELS = { press: 1, shift: 10 },
    TAKEN = { press: 1, shift: 10 },
    DRAG_PX = 5,
    JUST_GAVE_MS = 500; // a double-click that gave candy does not also move a Pokemon
  const REFUSALS = {
    none: 'Candy only goes to a Pokemon you own',
    max: 'That Pokemon is already Lv. 100',
    empty: 'Your candy bag is empty',
    size: 'That cannot be given',
    noneOfSize: 'You have no more of that candy',
    selling: 'Finish selling first',
    holding: 'Put down what you are holding first',
  };
  const takenBy = (shift) => (shift ? TAKEN.shift : TAKEN.press);
  function refuse(why) {
    G.Audio.sfx('error');
    G.UI.toast(REFUSALS[why]);
  }

  /**
   * One Team menu's bag. isLifting(): a Pokemon is lifted; isRenaming(); sell(): its sell mode; given(uid, levels) is
   * called after a give (saved by then), closed() when the popup was closed by hand, targetAt(x, y) is
   * the copy under a point ({ element, uid } or null), redraw() after any other change.
   */
  function create({ isLifting, isRenaming, sell, given, closed, targetAt, redraw }) {
    let inHand = null, // { size, count, by: 'drag', 'mouse' or 'keys' }
      isOpen = false,
      gaveAt = -Infinity;

    function release() {
      if (!inHand) return;
      inHand = null;
      redraw();
    }
    function close() {
      if (!isOpen) return;
      isOpen = false;
      inHand = null;
      redraw();
    }
    function toggle() {
      G.Audio.sfx('click');
      if (isOpen) {
        close();
        return closed();
      }
      sell().end();
      isOpen = true;
      redraw();
    }

    /** After candy went in either way. */
    function finish(uid, { level, gained }, note) {
      const copy = G.Copies.get(G.DB.save, uid),
        name = copy.nickname || G.DEX_BY[copy.speciesID].name;
      G.Audio.sfx(gained ? 'levelup' : 'confirm');
      G.DB.commit(true);
      G.UI.toast(name + (gained ? ' reached' : ' is at') + ` Lv. ${level}.` + note);
      given(uid, gained);
    }
    /** Why Level Up is turned down for this copy (the button's refused look), or null. */
    function refusal(uid) {
      const copy = uid && G.Copies.get(G.DB.save, uid);
      if (!copy) return REFUSALS.none;
      if (sell().mode()) return REFUSALS.selling;
      if (isLifting() || inHand) return REFUSALS.holding;
      if (G.Candy.levelFor(copy.speciesID, copy.candyXp) >= G.GrowthCurves.MAX_LEVEL) return REFUSALS.max;
      return G.Candy.bagIsEmpty(G.DB.save) ? REFUSALS.empty : null;
    }
    function levelUp(uid) {
      const levels = modifiers.shift ? LEVELS.shift : LEVELS.press,
        result = G.Candy.levelUp(G.DB.save, uid, levels);
      if (!result.ok) return refuse(result.error);
      finish(uid, result, result.ranOut ? ' The candy bag is empty.' : '');
    }
    /** The candy in hand goes to this copy; what it cannot take stays in the bag. */
    function give(uid) {
      const { size, count } = inHand;
      release();
      const result = uid ? G.Candy.giveMany(G.DB.save, uid, size, count) : { ok: false, error: 'none' };
      gaveAt = performance.now();
      if (!result.ok) return refuse(result.error);
      const left = count - result.given;
      finish(uid, result, left ? ` ${left} went back in the bag.` : '');
    }

    /** Takes candy in hand, added to what is there when it is the same size; never more than the bag holds. */
    function take(size, count, by) {
      if (isLifting()) return refuse('holding');
      const before = inHand && inHand.size === size ? inHand.count : 0,
        total = Math.min(G.Candy.bagOf(G.DB.save)[size], before + count);
      if (!total) return refuse('noneOfSize');
      inHand = { size, count: total, by };
      G.Audio.sfx('select');
      redraw();
    }
    /** A click on a row: with Ctrl it takes more, without it what is in hand goes back. */
    function click(size) {
      if (modifiers.ctrl) take(size, takenBy(modifiers.shift), 'mouse');
      else release();
    }
    /** Enter on a row: lifts, adds with Ctrl, and puts back what came from that row. */
    function press(size) {
      if (inHand && inHand.size === size && !modifiers.ctrl) return release();
      take(size, takenBy(modifiers.shift), 'keys');
    }
    /** A row is pressed: past a few pixels it is a drag. Not the browser's own, which never starts while Shift is down. */
    function startDrag(event, size) {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || inHand || isLifting() || isRenaming()) return;
      const start = { x: event.clientX, y: event.clientY },
        count = takenBy(event.shiftKey);
      let place = null; // the element outlined
      const mark = (element) => {
        if (place) place.classList.remove('is-drop');
        if (element) element.classList.add('is-drop');
        place = element;
      };
      const isDragging = () => inHand && inHand.by === 'drag';
      function move({ clientX, clientY, buttons }) {
        if (!buttons) return end();
        if (!inHand && Math.hypot(clientX - start.x, clientY - start.y) > DRAG_PX) take(size, count, 'drag');
        const target = isDragging() && targetAt(clientX, clientY);
        mark(target ? target.element : null);
      }
      function end() {
        mark(null);
        removeEventListener('pointermove', move);
        removeEventListener('pointerup', up);
        removeEventListener('pointercancel', end);
        if (isDragging()) release();
      }
      function up({ clientX, clientY }) {
        const target = isDragging() && targetAt(clientX, clientY);
        if (target) give(target.uid);
        end();
      }
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
      addEventListener('pointercancel', end);
    }

    return {
      inHand: () => inHand,
      isOpen: () => isOpen,
      justGave: () => performance.now() - gaveAt < JUST_GAVE_MS,
      release,
      close,
      toggle,
      refusal,
      levelUp,
      give,
      click,
      press,
      startDrag,
    };
  }

  // ---------- drawing ----------
  function Row({ menu, size, count }) {
    const id = CANDY_ID + size;
    return html`<div
      class=${'tm-candy' + (count ? '' : ' is-empty')}
      style=${{ height: px(ROW.height) }}
      data-cursor-id=${id}
      data-cursor-area="bag"
      onMouseEnter=${() => menu.cursor.hover(id)}
      onMouseLeave=${() => menu.cursor.hover(null)}
      onClick=${() => menu.bag.click(size)}
      onPointerDown=${(event) => menu.bag.startDrag(event, size)}
    >
      <span class="tm-candy-count">${count}</span>
      <span class="tm-candy-name">${NAMES[size] + ' Exp Candy'}</span>
      <${lib.Well.Well} size=${ROW.well} ring=${count ? RIM.base : null} className="tm-candy-well">
        <${IconCanvas} icon=${iconOf(size)} size=${ICON} />
      </${lib.Well.Well}>
      <${menu.Bar} id=${id} height=${ROW.height} />
    </div>`;
  }

  function Popup({ menu }) {
    if (!menu.bag.isOpen()) return null;
    const { row } = menu.layout(),
      bag = G.Candy.bagOf(G.DB.save),
      inHand = menu.bag.inHand();
    const left = row.expBagLeft + row.expBagWidth - PANEL.width,
      top = row.top - PANEL.above - HEIGHT;
    return html`<${lib.Panel.PixelPanel}
      className="tm-exp-bag"
      left=${left}
      top=${top}
      width=${PANEL.width}
      height=${HEIGHT}
      rim=${RIM}
    >
      <div
        class="tm-candies"
        style=${{
          left: px(PANEL.padX),
          top: px(PANEL.padY),
          width: px(PANEL.width - 2 * PANEL.padX),
          gap: px(ROW.gap),
        }}
      >
        ${G.Candy.SIZE_ORDER.map((size) => {
          const taken = inHand && inHand.size === size ? inHand.count : 0;
          return html`<${Row} key=${size} menu=${menu} size=${size} count=${bag[size] - taken} />`;
        })}
      </div>
    </${lib.Panel.PixelPanel}>`;
  }

  // where the mouse last was: candy taken by a click is drawn there at once
  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', (event) => Object.assign(pointer, { x: event.clientX, y: event.clientY }), true);

  /** The candy in hand: at the mouse, or (taken by keys) on the item the cursor is on. */
  function Ghost({ menu, at, stage }) {
    const ref = hooks.useRef(null),
      shown = menu.bag.inHand();
    hooks.useLayoutEffect(() => {
      if (!shown) return undefined;
      const place = (x, y) => {
        const frame = stage.getBoundingClientRect();
        ref.current.style.left = x - frame.left - GHOST / 2 + 'px';
        ref.current.style.top = y - frame.top - GHOST / 2 + 'px';
      };
      if (shown.by === 'keys') {
        const element = at && menu.cursor.elementOf(at),
          rect = element && element.getBoundingClientRect();
        if (rect) place(rect.right, rect.top);
        return undefined;
      }
      const follow = () => place(pointer.x, pointer.y);
      follow();
      addEventListener('pointermove', follow);
      return () => removeEventListener('pointermove', follow);
    });
    return html`<div ref=${ref} class=${'tm-ghost tm-candy-ghost' + (shown ? '' : ' is-hidden')}>
      ${
        shown
          ? html`<${IconCanvas} icon=${iconOf(shown.size)} size=${ICON} />
              <span class="tm-silver">${'x' + shown.count}</span>`
          : null
      }
    </div>`;
  }

  return { ready: true, create, Popup, Ghost, items, sizeOf };
})();
