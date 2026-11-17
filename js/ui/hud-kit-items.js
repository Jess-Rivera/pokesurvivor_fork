/* ============ hud-kit-items.js: the HUD kit's tooltip layer, scroll box and item pieces (G.HudKitItems) ============
 * Part of the HUD kit (js/ui/hud-kit.js has the overview); it reads only G.HudKit. Panels and screens take these
 * from G.HudOverlay.kit. Split out of js/ui/hud-overlay.js on 2026-11-14 (structural review F1); the code is
 * unchanged.
 */
G.HudKitItems = (() => {
  const coreKit = G.HudKit;
  if (!coreKit.ready) return { ready: false };
  const { html, signal, hooks: preactHooks, PALETTE, BAR_CHECKER, PixelShape } = coreKit;

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

  return {
    ready: true,
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
