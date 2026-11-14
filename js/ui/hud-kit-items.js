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
   * slots: [{ key, icon, locked, tip: { name, desc }, className, attrs }]: icon null = empty; locked = dimmed (not bought);
   * tip = the hover tooltip (none on the run screen), drawn in the screen's TooltipLayer; attrs = extra attributes for
   * the slot's element (data-*, handlers). tipPlace: where the tooltip opens (showTooltip's place; above by default).
   */
  function ItemGrid({ slots, artSize = 20, className, tipPlace }) {
    const size = artSize * 2,
      gap = size / 2;
    return html`<div
      class=${'hud-item-grid' + (className ? ' ' + className : '')}
      style=${{ gridTemplateColumns: `${size}px ${size}px`, gap: gap + 'px' }}
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
          </div>`
      )}
    </div>`;
  }
  const itemTipHandlers = (tip, place) =>
    tooltipHandlers({ name: tip.name, lines: tip.desc ? [tip.desc] : [], variant: 'item' }, place);

  // ---------- the shared tooltip layer (Jess, 2026-11-12: every hover tooltip is the topmost layer) ----------
  /**
   * One tooltip at a time, drawn by TooltipLayer, which a screen mounts as the LAST child of its stage (the pause
   * menu's 1920 x 1080 stage), above everything else on it. No tooltip lives inside its panel any more: there it was
   * trapped under later panels (the team cards over the move list's tooltip) and clipped by scroll boxes.
   * showTooltip(anchor, content, place): content { name, lines, variant } (variant 'item': name and a 300 px
   *   description; 'detail': the detail panel's 558 px box; 'plain': one line, no name); nothing to show hides it.
   *   place { side: 'above' (default) | 'below' | 'leftOf', align: 'centre' (default) | 'start' | 'end', gap (px,
   *   default 8), beside: for 'leftOf', the element or a selector (closest to the anchor) whose left edge it is off }.
   * hideTooltip(): gone (a scroll, a redraw, a pick-up, the menu closing).
   * tooltipHandlers(content, place): an anchor's hover handlers; content may be a function read on each show. A
   *   pointer move re-shows it after a redraw under a still pointer (an item put down, the next Pokemon by key).
   */
  const tooltipState = signal(null); // { anchor, name, lines, variant, x, y, shift } in stage pixels
  let tooltipLayer = null; // the mounted layer's element
  function hideTooltip() {
    if (tooltipState.value) tooltipState.value = null;
  }
  function showTooltip(anchor, content, place = {}) {
    const layer = tooltipLayer;
    const lines = (content && content.lines ? content.lines : []).filter(Boolean);
    if (!layer || !anchor || !content || !(content.name || lines.length)) return hideTooltip();
    const layerBox = layer.getBoundingClientRect(),
      anchorBox = anchor.getBoundingClientRect(),
      scale = layerBox.width / (layer.offsetWidth || layerBox.width || 1); // the stage is scaled to fit the window
    const toStageX = (x) => (x - layerBox.left) / scale,
      toStageY = (y) => (y - layerBox.top) / scale;
    const side = place.side || 'above',
      align = place.align || 'centre',
      gap = place.gap != null ? place.gap : 8;
    let x, y, shift;
    if (side === 'leftOf') {
      const beside = (typeof place.beside === 'string' ? anchor.closest(place.beside) : place.beside) || anchor;
      x = toStageX(beside.getBoundingClientRect().left) - gap;
      y = toStageY(anchorBox.top);
      shift = 'translate(-100%, 0)';
    } else {
      const edge =
        align === 'start' ? anchorBox.left : align === 'end' ? anchorBox.right : (anchorBox.left + anchorBox.right) / 2;
      x = toStageX(edge);
      y = side === 'below' ? toStageY(anchorBox.bottom) + gap : toStageY(anchorBox.top) - gap;
      const shiftX = align === 'start' ? '0' : align === 'end' ? '-100%' : '-50%';
      shift = 'translate(' + shiftX + ', ' + (side === 'below' ? '0' : '-100%') + ')';
    }
    tooltipState.value = { anchor, name: content.name || '', lines, variant: content.variant || 'item', x, y, shift };
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
  /** The layer itself: mount it as the stage's last child. It never catches the pointer. */
  function TooltipLayer() {
    const ref = preactHooks.useRef(null);
    preactHooks.useLayoutEffect(() => {
      tooltipLayer = ref.current;
      return () => {
        if (tooltipLayer === ref.current) tooltipLayer = null;
      };
    }, []);
    const shown = tooltipState.value;
    return html`<div class="hud-tip-layer" ref=${ref}>
      ${
        shown
          ? html`<div
              class=${'hud-tip is-' + shown.variant}
              style=${{ left: shown.x + 'px', top: shown.y + 'px', transform: shown.shift }}
            >
              ${shown.name ? html`<div class="hud-text hud-tip-name">${shown.name}</div>` : null}
              ${shown.lines.map((line, index) => html`<div key=${index} class="hud-text hud-tip-line">${line}</div>`)}
            </div>`
          : null
      }
    </div>`;
  }

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

  return {
    ready: true,
    IconCanvas,
    ItemSquare,
    ItemGrid,
    ScrollBox,
    TooltipLayer,
    hideTooltip,
    tooltipHandlers,
  };
})();
