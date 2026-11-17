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
  const { html, signal, RunItemBox, RUN_BOX_ROWS } = overlay.kit;

  // ---------- sizes and places (HUD-STYLE "Panel sizes at 1080p", run items) ----------
  // the box itself (its art, name band, patch and text area) is the kit's RunItemBox
  const ART_PIXEL = 2,
    BOX = { artWidth: 140, right: 24, bottom: 42 },
    SLOT_GAP = 8; // between one slot's box and the next
  const SLOT_PITCH = RUN_BOX_ROWS * ART_PIXEL + SLOT_GAP;

  // ---------- state the page shows (signals) ----------
  const visible = signal(false),
    slots = signal([]); // per unlocked slot, slot 1 first: { key, id, name, icon, text, live } or { key } when empty

  // ---------- components ----------
  function RunItem({ slot, index }) {
    return html`<${RunItemBox}
      artWidth=${BOX.artWidth}
      artPixel=${ART_PIXEL}
      item=${slot.id ? slot : null}
      style=${{ right: BOX.right + 'px', bottom: BOX.bottom + index * SLOT_PITCH + 'px' }}
    />`;
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
