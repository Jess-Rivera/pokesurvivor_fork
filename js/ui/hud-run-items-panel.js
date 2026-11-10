/* ============ hud-run-items-panel.js: the run item column, lower right (#63, on the HTML HUD) ============
 * A panel of js/ui/hud-overlay.js (the core and its kit). Layout: the wireframe's lower right
 * (assets/excalidraw/run_screen_mockup.png). Look and numbers: docs/HUD-STYLE.md "Run items".
 *
 * One B2 box (b2-lower AD4 to AG5) per unlocked run item slot (G.Items.runSlots), slot 1 at the bottom: the item's icon
 * in the box's white patch, its name above the box at 30 px, and its live tracker (or its short description) in the box
 * right of the patch. An empty unlocked slot shows the box with an empty patch. Reads the team's items once per frame,
 * never writes them.
 *
 * Positions are fixed CSS pixels from the screen's bottom right.
 */
G.HudRunItemsPanel = (() => {
  const overlay = G.HudOverlay;
  if (!overlay.ready) return { ready: false };
  const { html, signal, PALETTE, SLOT_GRID, PixelShape, IconCanvas } = overlay.kit;

  // ---------- sizes and places (HUD-STYLE "Panel sizes at 1080p", run items) ----------
  const ART_PIXEL = 2,
    BOX = { artRows: 32, artWidth: 140, right: 24, bottom: 42 },
    NAME = { gap: 2, height: 30 }, // the name line above the box, 30 px text
    SLOT_GAP = 8, // between one slot's box and the next slot's name line
    PATCH = { artTop: 13, artWidth: 22 }, // the white patch: from the box's flat middle down to its bottom edge
    TEXT = { gap: 8, top: 8, bottom: 8, right: 20 }; // the text area right of the patch
  const BOX_WIDTH = BOX.artWidth * ART_PIXEL,
    BOX_HEIGHT = BOX.artRows * ART_PIXEL,
    SLOT_PITCH = BOX_HEIGHT + NAME.gap + NAME.height + SLOT_GAP,
    MIDDLE = (BOX.artRows - 1) / 2;

  // ---------- the run item box (b2-lower AD4 to AG5) ----------
  /** The ends' slant: flat for 6 rows in the middle, then one pixel in for every three rows out (the rip's slope). */
  const edgeOf = (row) => {
    const out = Math.abs(row - MIDDLE) - 2.5;
    return out <= 0 ? 0 : Math.ceil(out / 3);
  };
  // The left end of each row, one letter per art pixel from that row's edge; the rest of the row is its last letter's fill.
  // The right end is the mirror, the bottom rows the top's mirror.
  //   o outline, D / B / L the Lv yellow's dark, shade and fill, G the body grid, space nothing.
  const TOP_ROWS = [
    ['ooooo', ' '], // the corner bump
    ['oBBBD', 'o'],
    ['oBDooD', 'B'],
    ['oBoLLo', 'o'],
  ];
  const BODY_ROW = ['oBoLLo', 'G'];
  const PATCH_LEFT_INSET = 6; // the patch starts right inside the rim

  const BOX_GRID = (() => {
    const width = BOX.artWidth,
      rows = BOX.artRows,
      grid = [];
    for (let row = 0; row < rows; row++) {
      const fromTop = Math.min(row, rows - 1 - row),
        [left, fill] = fromTop < TOP_ROWS.length ? TOP_ROWS[fromTop] : BODY_ROW,
        edge = edgeOf(row),
        right = left.split('').reverse().join('');
      grid.push(
        (' '.repeat(edge) + left + fill.repeat(width - 2 * edge - 2 * left.length) + right + ' '.repeat(edge)).split('')
      );
    }
    // the white patch: its top edge, the paper, a shaded right edge; it runs down through the bottom rim to the outline
    for (let row = PATCH.artTop; row < rows - 1; row++) {
      const left = edgeOf(row) + PATCH_LEFT_INSET,
        right = left + PATCH.artWidth - 1;
      for (let column = left; column <= right; column++)
        grid[row][column] = row === PATCH.artTop || row === rows - 2 || column === right ? 'e' : 'P';
    }
    const bottomEdge = edgeOf(rows - 1);
    for (let column = bottomEdge; column <= edgeOf(rows - 2) + PATCH_LEFT_INSET + PATCH.artWidth; column++)
      grid[rows - 1][column] = 'o';
    return grid.map((line) => line.join(''));
  })();

  const COLOURS = {
    o: PALETTE.outline,
    D: PALETTE.lvDark,
    B: PALETTE.lvShade,
    L: PALETTE.lvFill,
    G: SLOT_GRID,
    P: PALETTE.paper,
    e: PALETTE.paperEdge,
  };
  const paintRow = (row) => {
    const line = BOX_GRID[row],
      runs = [];
    let start = 0;
    for (let column = 1; column <= line.length; column++) {
      if (column < line.length && line[column] === line[start]) continue;
      if (line[start] !== ' ') runs.push([start, column - start, COLOURS[line[start]]]);
      start = column;
    }
    return runs;
  };

  // The icon sits in the middle of the patch's paper (inside its top edge and the edges at the bottom).
  const ICON_SIZE = 32,
    PATCH_MIDDLE_ROW = Math.round((PATCH.artTop + 1 + BOX.artRows - 3) / 2),
    ICON_PLACE = {
      left: (edgeOf(PATCH_MIDDLE_ROW) + PATCH_LEFT_INSET + (PATCH.artWidth - 1) / 2) * ART_PIXEL - ICON_SIZE / 2 + 'px',
      top: ((PATCH.artTop + 1 + BOX.artRows - 2) / 2) * ART_PIXEL - ICON_SIZE / 2 + 'px',
    },
    TEXT_LEFT = (PATCH_LEFT_INSET + PATCH.artWidth) * ART_PIXEL + TEXT.gap;

  // ---------- state the page shows (signals) ----------
  const visible = signal(false),
    slots = signal([]); // per unlocked slot, slot 1 first: { key, id, name, icon, text, live } or { key } when empty

  // ---------- components ----------
  function RunItem({ slot, index }) {
    const bottom = BOX.bottom + index * SLOT_PITCH;
    return html`${
        slot.id
          ? html`<div
              class="hud-text hud-text-30 hud-run-name"
              style=${{ right: BOX.right + 'px', bottom: bottom + BOX_HEIGHT + NAME.gap + 'px', width: BOX_WIDTH + 'px' }}
            >
              ${slot.name}
            </div>`
          : null
      }
      <div
        class="hud-run-item"
        style=${{ right: BOX.right + 'px', bottom: bottom + 'px', width: BOX_WIDTH + 'px', height: BOX_HEIGHT + 'px' }}
      >
        <${PixelShape} artWidth=${BOX.artWidth} artRows=${BOX.artRows} artPixel=${ART_PIXEL} paintRow=${paintRow} />
        ${
          slot.id
            ? html`<div class="hud-run-icon" style=${ICON_PLACE}>
                  <${IconCanvas} icon=${slot.icon} size=${ICON_SIZE} />
                </div>
                <div
                  class=${'hud-text hud-run-text' + (slot.live ? ' is-live' : '')}
                  style=${{
                    left: TEXT_LEFT + 'px',
                    right: TEXT.right + 'px',
                    top: TEXT.top + 'px',
                    bottom: TEXT.bottom + 'px',
                  }}
                >
                  <span>${slot.text}</span>
                </div>`
            : null
        }
      </div>`;
  }

  function RunItemsPanel() {
    if (!visible.value) return null;
    return html`<div class="hud-run-items">
      ${slots.value.map((slot, index) => html`<${RunItem} key=${slot.key} slot=${slot} index=${index} />`)}
    </div>`;
  }

  // ---------- the per-frame read ----------
  let lastKey = '';

  function sync(showing) {
    const player = showing && G.Game.player;
    visible.value = !!player;
    if (!player) return;
    const slotCount = G.Items.runSlots(G.DB.save),
      list = player.runItems || [],
      next = [];
    for (let index = 0; index < slotCount; index++) {
      const id = list[index],
        def = id && G.Items.BY[id];
      if (!def) {
        next.push({ key: 'run' + index });
        continue;
      }
      const hud = (G.Items.runHud && G.Items.runHud(id, player)) || { name: def.name, desc: def.desc, live: null };
      next.push({
        key: 'run' + index,
        id,
        name: hud.name || def.name,
        icon: def.icon || id,
        text: hud.live || hud.desc || '',
        live: !!hud.live,
      });
    }
    const key = next.map((slot) => (slot.id ? slot.id + ':' + slot.text : '-')).join('|');
    if (key !== lastKey) {
      lastKey = key;
      slots.value = next;
    }
  }

  overlay.addPanel({ id: 'runItems', View: RunItemsPanel, sync });
  return { ready: true };
})();
