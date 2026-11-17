/* ============ hud-kit-items.js: the HUD kit's tooltip layer, scroll box and item pieces (G.HudKitItems) ============
 * Part of the HUD kit (js/ui/hud-kit.js has the overview); it reads only G.HudKit. Panels and screens take these
 * from G.HudOverlay.kit. Split out of js/ui/hud-overlay.js on 2026-11-14 (structural review F1); the code is
 * unchanged.
 */
G.HudKitItems = (() => {
  const coreKit = G.HudKit;
  if (!coreKit.ready) return { ready: false };
  const { html, signal, hooks: preactHooks, PALETTE, BAR_CHECKER, SLOT_GRID, PixelShape } = coreKit;

  // ---------- the B2 bag button (b2-lower Y4 to AB5): a square with chamfered corners, a rim and the checker body ----------
  function bagButtonRow(row, artSize, rimColour) {
    const chamfer = row < 2 ? 2 - row : row > artSize - 3 ? row - (artSize - 3) : 0,
      left = chamfer,
      right = artSize - 1 - chamfer;
    if (row === 0 || row === artSize - 1) return [[left, right - left + 1, PALETTE.outline]];
    if (row === 1 || row === artSize - 2)
      return [
        [left, 1, PALETTE.outline],
        [left + 1, right - left - 1, rimColour],
        [right, 1, PALETTE.outline],
      ];
    return [
      [left, 1, PALETTE.outline],
      [left + 1, 1, rimColour],
      [left + 2, right - left - 3, BAR_CHECKER],
      [right - 1, 1, rimColour],
      [right, 1, PALETTE.outline],
    ];
  }

  /**
   * An item icon (Pokesprite cell or app icon, through G.Icons.draw) painted on a small canvas at 1x. It paints on a change,
   * then again at 0.5, 1, 2 and 4 s, since a Pokesprite cell paints only once its sheet has loaded.
   */
  function IconCanvas({ icon, size, className }) {
    const canvasRef = preactHooks.useRef(null);
    preactHooks.useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return undefined;
      const paint = () => {
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        context.clearRect(0, 0, size, size);
        if (icon) G.Icons.draw(context, icon, 0, 0, size);
      };
      paint();
      const timers = [500, 1000, 2000, 4000].map((delay) => setTimeout(paint, delay));
      return () => timers.forEach(clearTimeout);
    }, [icon, size]);
    return html`<canvas class=${className || ''} width=${size} height=${size} ref=${canvasRef}></canvas>`;
  }

  /**
   * The held item square: the bag button with the item's icon at 1x in its centre; the Lv yellow rim when it holds
   * something, slate when empty (HUD-STYLE "Character info panel"). artSize is in 2 px art pixels.
   */
  function ItemSquare({ icon, artSize }) {
    const size = artSize * 2,
      rim = icon ? PALETTE.lvFill : PALETTE.slate;
    return html`<div class="hud-item-square" style=${{ width: size + 'px', height: size + 'px' }}>
      <${PixelShape}
        artWidth=${artSize}
        artRows=${artSize}
        artPixel=${2}
        paintRow=${(row) => bagButtonRow(row, artSize, rim)}
      />
      ${icon ? html`<${IconCanvas} icon=${icon} size=${32} className="hud-item-icon" />` : null}
    </div>`;
  }

  /**
   * The tight 2x2 item grid (#90, HUD-STYLE "Berry bag"): item squares in two columns, half a square between them, filling
   * row by row. Used by the run screen's berry bag and the pause menu's Run Inventory.
   * slots: [{ key, icon, locked, tip: { name, desc }, className, attrs, overlay }]: icon null = empty; locked = dimmed
   * (not bought); tip = the hover tooltip (none on the run screen), drawn in the page's tooltip layer; attrs = extra
   * attributes for the slot's element (data-*, handlers); overlay = drawn over the square (a selection cursor).
   * tipPlace: where the tooltip opens (showTooltip's place; above by default). columns: squares per row (2 by default;
   * the Main Menu Shop's owned items use 4, #149c).
   */
  function ItemGrid({ slots, artSize = 20, columns = 2, className, tipPlace }) {
    const size = artSize * 2,
      gap = size / 2;
    return html`<div
      class=${'hud-item-grid' + (className ? ' ' + className : '')}
      style=${{ gridTemplateColumns: `repeat(${columns}, ${size}px)`, gap: gap + 'px' }}
    >
      ${slots.map(
        (slot) =>
          html`<div
            key=${slot.key}
            class=${
              'hud-grid-slot' +
              (slot.icon ? ' is-filled' : '') +
              (slot.locked ? ' is-locked' : '') +
              (slot.className ? ' ' + slot.className : '')
            }
            ...${slot.tip && slot.icon ? itemTipHandlers(slot.tip, tipPlace) : {}}
            ...${slot.attrs || {}}
          >
            <${ItemSquare} icon=${slot.icon || null} artSize=${artSize} />
            ${slot.overlay || null}
          </div>`
      )}
    </div>`;
  }
  const itemTipHandlers = (tip, place) =>
    tooltipHandlers({ name: tip.name, lines: tip.desc ? [tip.desc] : [], variant: 'item' }, place);

  // ---------- the tooltip layer: one for the whole page, always on top (Jess, 2026-11-16, decision 2026-11-16-one-universal-tooltip-layer) ----------
  /**
   * One tooltip at a time, drawn in ONE layer the kit puts on the page itself: fixed over the whole window, the body's
   * last child, z-index 1000 (nothing else on the page may reach it), never catching the pointer. Screens do not mount
   * a layer of their own. Before 2026-11-16 each screen mounted one and the kit remembered only the last, so closing the
   * catch screen left the pause menu's tooltips with nowhere to draw. Nested tooltips (Path of Exile style) are not built;
   * when they are, tooltipState becomes a stack and nothing else here changes shape.
   * showTooltip(anchor, content, place): content { name, lines, variant } (variant 'item': name and a 300 px
   *   description; 'detail': the detail panel's 558 px box; 'plain': one line, no name); nothing to show hides it.
   *   place { side: 'above' (default) | 'below' | 'leftOf' | 'rightOf', align: 'centre' (default) | 'start' | 'end', gap
   *   (px at the screen's own size, default 8), beside: for 'leftOf' / 'rightOf', the element or a selector (closest to
   *   the anchor) whose left / right edge it is off; level with the anchor's top }.
   * The tooltip is drawn at the hovered screen's scale (a menu stage fitted to the window draws its tooltips fitted too).
   * While one shows, the layer re-places it every frame from its anchor (a sliding panel carries it along) and hides it
   * when the anchor is removed or hidden, so a closing screen can never leave one behind.
   * hideTooltip(): gone (a scroll, a redraw, a pick-up, the menu closing).
   * tooltipHandlers(content, place): an anchor's hover handlers; content may be a function read on each show. A
   *   pointer move re-shows it after a redraw under a still pointer (an item put down, the next Pokemon by key).
   */
  const tooltipState = signal(null); // { anchor, name, lines, variant, place }
  const tooltipPlace = signal(null); // { x, y, shift, scale } in window pixels, from the anchor this frame
  function hideTooltip() {
    if (tooltipState.value) tooltipState.value = null;
    tooltipPlace.value = null;
  }
  /** The scale the anchor's screen is drawn at: a menu stage is scaled to fit the window (--pm-scale); 1 elsewhere. */
  function anchorScale(anchor) {
    const stage = anchor.closest('.pm-stage');
    if (!stage || !stage.offsetWidth) return 1;
    return stage.getBoundingClientRect().width / stage.offsetWidth;
  }
  /** Where the tooltip goes for its anchor now, or null when the anchor is gone or hidden. */
  function placeFor(anchor, place) {
    if (!anchor.isConnected || !anchor.getClientRects().length || getComputedStyle(anchor).visibility === 'hidden')
      return null;
    const anchorBox = anchor.getBoundingClientRect(),
      scale = anchorScale(anchor);
    const side = place.side || 'above',
      align = place.align || 'centre',
      gap = (place.gap != null ? place.gap : 8) * scale;
    if (side === 'leftOf' || side === 'rightOf') {
      const beside = (typeof place.beside === 'string' ? anchor.closest(place.beside) : place.beside) || anchor,
        besideBox = beside.getBoundingClientRect();
      return {
        x: side === 'leftOf' ? besideBox.left - gap : besideBox.right + gap,
        y: anchorBox.top,
        shift: side === 'leftOf' ? 'translate(-100%, 0)' : 'none',
        scale,
      };
    }
    const edge =
      align === 'start' ? anchorBox.left : align === 'end' ? anchorBox.right : (anchorBox.left + anchorBox.right) / 2;
    const shiftX = align === 'start' ? '0' : align === 'end' ? '-100%' : '-50%';
    return {
      x: edge,
      y: side === 'below' ? anchorBox.bottom + gap : anchorBox.top - gap,
      shift: 'translate(' + shiftX + ', ' + (side === 'below' ? '0' : '-100%') + ')',
      scale,
    };
  }
  const samePlace = (a, b) => a && b && a.x === b.x && a.y === b.y && a.shift === b.shift && a.scale === b.scale;
  let following = false; // the per-frame follow runs only while a tooltip shows
  function follow() {
    const shown = tooltipState.value;
    if (!shown) {
      following = false;
      return;
    }
    const next = placeFor(shown.anchor, shown.place);
    if (!next) {
      following = false;
      return hideTooltip();
    }
    if (!samePlace(next, tooltipPlace.value)) tooltipPlace.value = next;
    requestAnimationFrame(follow);
  }
  function showTooltip(anchor, content, place = {}) {
    const lines = (content && content.lines ? content.lines : []).filter(Boolean);
    if (!anchor || !content || !(content.name || lines.length)) return hideTooltip();
    const at = placeFor(anchor, place);
    if (!at) return hideTooltip();
    if (layerElement !== document.body.lastElementChild) document.body.appendChild(layerElement); // stay the body's last child
    tooltipState.value = { anchor, name: content.name || '', lines, variant: content.variant || 'item', place };
    tooltipPlace.value = at;
    if (!following) {
      following = true;
      requestAnimationFrame(follow);
    }
  }
  function tooltipHandlers(content, place) {
    const contentNow = () => (typeof content === 'function' ? content() : content);
    const show = (event) => showTooltip(event.currentTarget, contentNow(), place);
    return {
      onMouseEnter: show,
      onMouseMove: (event) => {
        const shown = tooltipState.value;
        if (!shown || shown.anchor !== event.currentTarget) show(event);
      },
      onMouseLeave: (event) => {
        const shown = tooltipState.value;
        if (shown && shown.anchor === event.currentTarget) hideTooltip();
      },
    };
  }
  /** The page's one layer: the tooltip at its anchor's place, drawn at its screen's scale from the anchor point. */
  function TooltipLayer() {
    const shown = tooltipState.value,
      at = tooltipPlace.value;
    if (!shown || !at) return null;
    return html`<div
      class=${'hud-tip is-' + shown.variant}
      style=${{ left: at.x + 'px', top: at.y + 'px', transform: 'scale(' + at.scale + ') ' + at.shift }}
    >
      ${shown.name ? html`<div class="hud-text hud-tip-name">${shown.name}</div>` : null}
      ${shown.lines.map((line, index) => html`<div key=${index} class="hud-text hud-tip-line">${line}</div>`)}
    </div>`;
  }
  const layerElement = document.createElement('div');
  layerElement.className = 'hud-tip-layer';
  layerElement.setAttribute('translate', 'no'); // English-only text
  document.body.appendChild(layerElement);
  coreKit.preact.render(html`<${TooltipLayer} />`, layerElement);

  /**
   * A scrolling box with the pause menu's thin scroll bar (dex-buttons AF2-AF20). Made for the move list in #89,
   * shared in #91-2 so Run Info and Cards Taken use the same one. The page's own bar is hidden; the thumb follows
   * the scroll, at least 24 px tall, and hides when the content fits. The wheel scrolls it, and the thumb can be
   * dragged (#91-2 DD1).
   * box: { left, top, width, height } in px, the scrolling area; trackRight: the bar's gap to the parent's right edge;
   * colours: { track, thumb, thumbRim }; resetOn: values that send it back to the top when one changes (fixed length);
   * onScroll: called on every scroll, before the thumb moves (the move list drops its hover tooltip there).
   */
  function ScrollBox({ box, trackRight, colours, resetOn = [], onScroll, children }) {
    const scrollRef = preactHooks.useRef(null),
      thumbState = preactHooks.useRef({ top: 0, height: 0 }); // the thumb, in px
    const [, redraw] = preactHooks.useState(0);
    const drag = preactHooks.useRef(null); // { pointerY, scrollTop } while the thumb is held
    const measure = () => {
      const element = scrollRef.current;
      if (!element) return;
      const ratio = element.clientHeight / Math.max(1, element.scrollHeight);
      const next =
        ratio >= 1
          ? { top: 0, height: 0 }
          : {
              top: (element.scrollTop / element.scrollHeight) * element.clientHeight,
              height: Math.max(24, ratio * element.clientHeight),
            };
      if (next.top !== thumbState.current.top || next.height !== thumbState.current.height) {
        thumbState.current = next;
        redraw((count) => count + 1);
      }
    };
    preactHooks.useLayoutEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      measure();
    }, resetOn);
    const holdThumb = (event) => {
      const element = scrollRef.current;
      if (!element) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { pointerY: event.clientY, scrollTop: element.scrollTop };
    };
    const dragThumb = (event) => {
      const element = scrollRef.current;
      if (!drag.current || !element) return;
      const screenScale = element.getBoundingClientRect().height / element.clientHeight; // the menu is scaled to fit
      const movedThumb = (event.clientY - drag.current.pointerY) / screenScale;
      element.scrollTop = drag.current.scrollTop + movedThumb * (element.scrollHeight / element.clientHeight);
    };
    const dropThumb = () => (drag.current = null);
    const thumbNow = thumbState.current;
    return html`<div
        class="hud-scroll-box"
        ref=${scrollRef}
        onScroll=${() => {
          if (onScroll) onScroll();
          measure();
        }}
        style=${{ left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' }}
      >
        ${children}
      </div>
      <div
        class="hud-scroll-track"
        style=${{ right: trackRight + 'px', top: box.top + 'px', height: box.height + 'px', background: colours.track }}
      >
        ${
          thumbNow.height
            ? html`<div
                class="hud-scroll-thumb"
                onPointerDown=${holdThumb}
                onPointerMove=${dragThumb}
                onPointerUp=${dropThumb}
                onPointerCancel=${dropThumb}
                style=${{
                  top: thumbNow.top + 'px',
                  height: thumbNow.height + 'px',
                  background: colours.thumb,
                  borderColor: colours.thumbRim,
                }}
              ></div>`
            : null
        }
      </div>`;
  }

  /**
   * A search box (#149c, the Main Menu Shop's mockups): one line of HUD text on the panel body with a thin white rim.
   * value and onChange(text) keep it in the screen's own state; Enter or Esc while typing hands the keys back to the
   * screen (the box lets go of the keyboard; that key press itself goes no further). Player-typed text, so never translated.
   */
  function SearchBar({ value, onChange, placeholder = 'Search', width, className }) {
    return html`<input
      type="text"
      class=${'hud-search' + (className ? ' ' + className : '')}
      translate="no"
      spellcheck="false"
      autocomplete="off"
      placeholder=${placeholder}
      value=${value}
      style=${width ? { width: width + 'px' } : null}
      onInput=${(event) => onChange(event.currentTarget.value)}
      onKeyDown=${(event) => {
        if (event.key !== 'Enter' && event.key !== 'Escape') return;
        event.stopPropagation(); // this key belongs to the box: the screen must not also read it (Esc would close it)
        event.currentTarget.blur();
      }}
    />`;
  }

  // ---------- the run item box (b2-lower AD4 to AG5): a team item slot ----------
  // Moved here from js/ui/hud-run-items-panel.js for #149d (the run screen draws it at 2 px per art pixel and 140 wide;
  // the Main Menu Inventory sizes it up). Look and numbers: docs/HUD-STYLE.md "Run items".
  const RUN_BOX_ROWS = 32,
    RUN_BOX_MIDDLE = (RUN_BOX_ROWS - 1) / 2,
    // the name inside the box's top band (#94, Jess 2026-11-11): from just inside the top rim down to the patch, left
    // aligned over the patch and running across the band, squeezed sideways when it is wider
    RUN_NAME = { artTop: 4, inset: 1 }, // art rows: the rim's first inside row; art pixels: how far into the slant
    RUN_PATCH = { artTop: 13, artWidth: 22 }, // the white patch: from the box's flat middle down to its bottom edge
    RUN_TEXT = { gap: 4, bottom: 3, right: 10 }, // art pixels: the text area right of the patch, from the patch's top down
    RUN_ICON_ART = 16, // the icon's size in art pixels (32 px at the run screen's 2)
    RUN_PATCH_LEFT_INSET = 6; // the patch starts right inside the rim
  /** The ends' slant: flat for 6 rows in the middle, then one pixel in for every three rows out (the rip's slope). */
  const runBoxEdge = (row) => {
    const out = Math.abs(row - RUN_BOX_MIDDLE) - 2.5;
    return out <= 0 ? 0 : Math.ceil(out / 3);
  };
  // The left end of each row, one letter per art pixel from that row's edge; the rest of the row is its last letter's fill.
  // The right end is the mirror, the bottom rows the top's mirror.
  //   o outline, D / B / L the Lv yellow's dark, shade and fill, G the body grid, space nothing.
  const RUN_BOX_TOP_ROWS = [
    ['ooooo', ' '], // the corner bump
    ['oBBBD', 'o'],
    ['oBDooD', 'B'],
    ['oBoLLo', 'o'],
  ];
  const RUN_BOX_BODY_ROW = ['oBoLLo', 'G'];
  const RUN_BOX_COLOURS = {
    o: PALETTE.outline,
    D: PALETTE.lvDark,
    B: PALETTE.lvShade,
    L: PALETTE.lvFill,
    G: SLOT_GRID,
    P: PALETTE.paper,
    e: PALETTE.paperEdge,
  };

  /** The box's letter grid, one string per art row, for a box artWidth art pixels wide. */
  function runBoxGrid(artWidth) {
    const rows = RUN_BOX_ROWS,
      grid = [];
    for (let row = 0; row < rows; row++) {
      const fromTop = Math.min(row, rows - 1 - row),
        [left, fill] = fromTop < RUN_BOX_TOP_ROWS.length ? RUN_BOX_TOP_ROWS[fromTop] : RUN_BOX_BODY_ROW,
        edge = runBoxEdge(row),
        right = left.split('').reverse().join('');
      grid.push(
        (' '.repeat(edge) + left + fill.repeat(artWidth - 2 * edge - 2 * left.length) + right + ' '.repeat(edge)).split(
          ''
        )
      );
    }
    // the white patch: its top edge, the paper, a shaded right edge; it runs down through the bottom rim to the outline
    for (let row = RUN_PATCH.artTop; row < rows - 1; row++) {
      const left = runBoxEdge(row) + RUN_PATCH_LEFT_INSET,
        right = left + RUN_PATCH.artWidth - 1;
      for (let column = left; column <= right; column++)
        grid[row][column] = row === RUN_PATCH.artTop || row === rows - 2 || column === right ? 'e' : 'P';
    }
    const bottomEdge = runBoxEdge(rows - 1);
    for (let column = bottomEdge; column <= runBoxEdge(rows - 2) + RUN_PATCH_LEFT_INSET + RUN_PATCH.artWidth; column++)
      grid[rows - 1][column] = 'o';
    return grid.map((line) => line.join(''));
  }

  /** Everything a box of this width and art pixel needs (made once per size): its row painter and its places. */
  const runBoxShapes = new Map();
  function runBoxShape(artWidth, artPixel) {
    const sizeKey = artWidth + 'x' + artPixel;
    if (runBoxShapes.has(sizeKey)) return runBoxShapes.get(sizeKey);
    const grid = runBoxGrid(artWidth);
    const paintRow = (row) => {
      const line = grid[row],
        runs = [];
      let start = 0;
      for (let column = 1; column <= line.length; column++) {
        if (column < line.length && line[column] === line[start]) continue;
        if (line[start] !== ' ') runs.push([start, column - start, RUN_BOX_COLOURS[line[start]]]);
        start = column;
      }
      return runs;
    };
    const width = artWidth * artPixel,
      iconSize = RUN_ICON_ART * artPixel,
      patchMiddleRow = Math.round((RUN_PATCH.artTop + 1 + RUN_BOX_ROWS - 3) / 2);
    // The name band: its left edge lines up with the patch, kept clear of the slanted end at the band's top row.
    const nameSide = Math.max(
      (runBoxEdge(RUN_PATCH.artTop) + RUN_PATCH_LEFT_INSET) * artPixel,
      (runBoxEdge(RUN_NAME.artTop) + RUN_PATCH_LEFT_INSET - RUN_NAME.inset) * artPixel
    );
    const shape = {
      paintRow,
      width,
      height: RUN_BOX_ROWS * artPixel,
      iconSize,
      // the icon sits in the middle of the patch's paper (inside its top edge and the edges at the bottom)
      iconPlace: {
        left:
          (runBoxEdge(patchMiddleRow) + RUN_PATCH_LEFT_INSET + (RUN_PATCH.artWidth - 1) / 2) * artPixel -
          iconSize / 2 +
          'px',
        top: ((RUN_PATCH.artTop + 1 + RUN_BOX_ROWS - 2) / 2) * artPixel - iconSize / 2 + 'px',
      },
      namePlace: {
        left: nameSide + 'px',
        right: nameSide + 'px',
        top: RUN_NAME.artTop * artPixel + 'px',
        height: (RUN_PATCH.artTop - RUN_NAME.artTop) * artPixel + 'px',
      },
      nameRoom: width - 2 * nameSide,
      textPlace: {
        left: (RUN_PATCH_LEFT_INSET + RUN_PATCH.artWidth + RUN_TEXT.gap) * artPixel + 'px',
        right: RUN_TEXT.right * artPixel + 'px',
        top: RUN_PATCH.artTop * artPixel + 'px',
        bottom: RUN_TEXT.bottom * artPixel + 'px',
      },
    };
    runBoxShapes.set(sizeKey, shape);
    return shape;
  }

  /** The item's name, squeezed sideways (held at its left edge) when it is wider than the band. */
  function RunItemName({ text, place, room }) {
    const ref = preactHooks.useRef(null);
    preactHooks.useLayoutEffect(() => {
      const element = ref.current;
      if (!element) return;
      element.style.transform = '';
      const width = element.scrollWidth;
      if (width > room) element.style.transform = `scaleX(${room / width})`;
    });
    return html`<div class="hud-text hud-run-name" style=${place}>
      <span ref=${ref}>${text}</span>
    </div>`;
  }

  /**
   * One team item slot: the B2 box with the item's icon in its white patch, its name in the top band and its text (a live
   * tracker or the short description) right of the patch. item: { name, icon, text, live } or null for an empty slot.
   * artWidth and artPixel size it (the run screen: 140 and 2); dimmed draws a slot not bought yet; style places it;
   * attrs adds attributes (data-*, handlers); overlay is drawn on top (a selection cursor).
   */
  function RunItemBox({ artWidth, artPixel, item, dimmed, className, style, attrs, overlay }) {
    const shape = runBoxShape(artWidth, artPixel);
    return html`<div
      class=${'hud-run-item' + (dimmed ? ' is-dimmed' : '') + (className ? ' ' + className : '')}
      style=${{ ...style, width: shape.width + 'px', height: shape.height + 'px' }}
      ...${attrs || {}}
    >
      <${PixelShape} artWidth=${artWidth} artRows=${RUN_BOX_ROWS} artPixel=${artPixel} paintRow=${shape.paintRow} />
      ${
        item
          ? html`<${RunItemName} text=${item.name} place=${shape.namePlace} room=${shape.nameRoom} />
              <div class="hud-run-icon" style=${shape.iconPlace}>
                <${IconCanvas} icon=${item.icon} size=${shape.iconSize} />
              </div>
              <div class=${'hud-text hud-run-text' + (item.live ? ' is-live' : '')} style=${shape.textPlace}>
                <span>${item.text}</span>
              </div>`
          : null
      }
      ${overlay || null}
    </div>`;
  }

  return {
    ready: true,
    RunItemBox,
    RUN_BOX_ROWS,
    IconCanvas,
    ItemSquare,
    ItemGrid,
    ScrollBox,
    SearchBar,
    showTooltip,
    hideTooltip,
    tooltipHandlers,
  };
})();
