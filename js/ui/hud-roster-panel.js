/* ============ hud-roster-panel.js: the team roster, held items and berry bag, lower left (#63, on the HTML HUD) ============
 * A panel of js/ui/hud-overlay.js (the core and its kit). Layout: the wireframe's lower left
 * (assets/excalidraw/run_screen_mockup.png). Look and numbers: docs/HUD-STYLE.md "Roster rows" and "Berry bag".
 *
 * One row per filled team slot, top to bottom in slot order: the B2 box (b2-lower Y15 to AA16) rimmed in the Pokemon's
 * first type, its portrait in a circle, its name, a benched Pokemon's status chips, and the B2 "HP" bar (b2-lower Y16 to
 * Z16) along the bottom. The held item square sits to the right of each row. The active row wears the selection cursor;
 * the others dim under the swap cooldown. A team of one shows no roster, since the bottom panel already shows it.
 * Above the roster: the berry bag, the kit's tight 2x2 grid, only the purchased slots, no names. Reads the team once per frame, never writes it.
 *
 * Positions are fixed CSS pixels from the screen's bottom left (the wireframe is not 16:9, so the lower panels are placed
 * from the bottom).
 */
G.HudRosterPanel = (() => {
  const overlay = G.HudOverlay;
  if (!overlay.ready) return { ready: false };
  const { html, signal, FAINTED_RIM, typeColours, hpBand } = overlay.kit;
  const {
    ItemSquare,
    ItemGrid,
    Cursor,
    Chip,
    createChipReader,
    RosterCard,
    ROSTER_ART_PIXEL,
    ROSTER_ART_ROWS,
    rosterFill,
  } = overlay.kit;

  // ---------- sizes and places (HUD-STYLE "Panel sizes at 1080p", roster and berry bag) ----------
  const ART_PIXEL = ROSTER_ART_PIXEL,
    // A row: the kit's roster card at 139 art pixels, which holds the portrait, the widest species name in the HUD font
    // (116 px, measured 2026-11-10) and one status chip side by side.
    ROW = { artRows: ROSTER_ART_ROWS, artWidth: 139, left: 16, bottom: 42, gap: 4 },
    CHIP_ROW = { right: 14, top: 12, gap: 6 }, // a benched Pokemon's chips, top right inside the box
    HELD = { artSize: 24, gap: 8 }, // the held item square, right of the row, centred on it
    BERRY = { artSize: 20, gapAbove: 12 }; // the kit's tight 2x2 grid: 40 px squares, 20 px apart, no names (#90)
  const ROW_WIDTH = ROW.artWidth * ART_PIXEL,
    ROW_HEIGHT = ROW.artRows * ART_PIXEL,
    ROW_PITCH = ROW_HEIGHT + ROW.gap,
    HELD_SIZE = HELD.artSize * ART_PIXEL,
    BERRY_SIZE = BERRY.artSize * ART_PIXEL,
    BERRY_PITCH = BERRY_SIZE * 1.5; // a square and the half-square gap

  // The swap cooldown shade is clipped to the box's outline (the corners' 45 degree steps, without the bumps).
  const BOX_CLIP = (() => {
    const w = ROW_WIDTH,
      h = ROW_HEIGHT,
      top = 2 * ART_PIXEL,
      side = 6 * ART_PIXEL,
      inset = 4 * ART_PIXEL;
    return `polygon(${inset}px ${top}px, ${w - inset}px ${top}px, ${w}px ${side}px, ${w}px ${h - side}px, ${w - inset}px ${h - top}px, ${inset}px ${h - top}px, 0 ${h - side}px, 0 ${side}px)`;
  })();

  // ---------- state the page shows (signals) ----------
  const rows = signal([]), // per filled slot, top to bottom: see readRow
    berries = signal([]), // per purchased slot: { key, icon } or { key } when empty
    showRoster = signal(false),
    visible = signal(false);

  // ---------- components ----------
  function RosterRow({ row, index, count }) {
    const bottom = ROW.bottom + (count - 1 - index) * ROW_PITCH;
    return html`<${RosterCard}
        artWidth=${ROW.artWidth}
        rim=${row.rim}
        fill=${row.fill}
        band=${row.band}
        dex=${row.dex}
        shiny=${row.shiny}
        name=${row.name}
        fainted=${row.fainted}
        style=${{ left: ROW.left + 'px', bottom: bottom + 'px' }}
      >
        ${
          row.chips.length
            ? html`<div
                class="hud-roster-chips"
                style=${{ right: CHIP_ROW.right + 'px', top: CHIP_ROW.top + 'px', gap: CHIP_ROW.gap + 'px' }}
              >
                ${row.chips.map((chip) => html`<${Chip} key=${chip.key} chip=${chip} />`)}
              </div>`
            : null
        }
        ${
          row.cooldown > 0
            ? html`<div class="hud-roster-cooldown" style=${{ clipPath: BOX_CLIP }}>
                <div style=${{ transform: `scaleX(${row.cooldown})` }}></div>
              </div>`
            : null
        }
        <span class="hud-text hud-roster-key">${row.keyLabel}</span>
        ${row.active ? html`<${Cursor} />` : null}
      </${RosterCard}>
      <div
        class="hud-roster-held"
        style=${{
          left: ROW.left + ROW_WIDTH + HELD.gap + 'px',
          bottom: bottom + (ROW_HEIGHT - HELD_SIZE) / 2 + 'px',
        }}
      >
        <${ItemSquare} icon=${row.heldIcon} artSize=${HELD.artSize} />
      </div>`;
  }

  /** The bottom edge of the berry bag: above the roster, or in the corner when no roster shows. */
  const berriesBottom = (rowCount) =>
    rowCount ? ROW.bottom + rowCount * ROW_PITCH - ROW.gap + BERRY.gapAbove : ROW.bottom;

  /** The berry bag: the kit's tight 2x2 grid, only the purchased slots, no names (Jess, 2026-11-11, #90). */
  function BerryBag() {
    const list = berries.value;
    if (!list.length) return null;
    return html`<div
      class="hud-berry-bag"
      style=${{ left: ROW.left + 'px', bottom: berriesBottom(showRoster.value ? rows.value.length : 0) + 'px' }}
    >
      <${ItemGrid} slots=${list} artSize=${BERRY.artSize} />
    </div>`;
  }

  function RosterPanel() {
    if (!visible.value) return null;
    const list = showRoster.value ? rows.value : [];
    return html`<div class="hud-roster">
      ${list.map((row, index) => html`<${RosterRow} key=${row.key} row=${row} index=${index} count=${list.length} />`)}
      <${BerryBag} />
    </div>`;
  }

  // ---------- the per-frame read ----------
  const chipReaders = new Map(); // one per team slot, so each benched Pokemon's timer bars run from their own start
  let lastRowsKey = '',
    lastBerriesKey = '';

  function readRow(member, isActive, swapShade) {
    const slot = member.teamSlot,
      fainted = !!member.dead;
    if (!chipReaders.has(slot)) chipReaders.set(slot, createChipReader());
    const chipRead = chipReaders.get(slot)(member); // read every frame, so the peaks stay current while active
    const fraction = member.maxHp > 0 ? Math.min(1, Math.max(0, member.hp / member.maxHp)) : 0;
    const type = (member.mon && member.mon.types && member.mon.types[0]) || 'normal';
    const heldDef = member.item && G.Items.BY[member.item];
    return {
      key: 'slot' + slot,
      keyLabel: G.Input.keyLabel('swap_' + (slot + 1)) || String(slot + 1),
      dex: member.dex,
      shiny: !!member.shiny,
      name: (member.mon && member.mon.name) || '',
      rim: fainted ? FAINTED_RIM : typeColours(type),
      rimKey: fainted ? 'fainted' : type,
      active: isActive && !fainted,
      fainted,
      fill: rosterFill(member.hp > 0 ? fraction : 0, fainted, ROW.artWidth),
      band: hpBand(fraction),
      cooldown: !isActive && !fainted ? swapShade : 0,
      chips: isActive || fainted ? [] : chipRead.chips, // the active Pokemon's chips are on the bottom panel
      chipsKey: isActive || fainted ? '' : chipRead.key,
      heldIcon: heldDef ? heldDef.icon || member.item : null,
    };
  }

  function readRoster() {
    const roster = G.Game.roster || [],
      active = G.Game.player,
      swapShade = G.Game.swapMax > 0 ? Math.round(G.U.clamp(G.Game.swapCooldown / G.Game.swapMax, 0, 1) * 50) / 50 : 0;
    const next = roster
      .slice()
      .sort((first, second) => first.teamSlot - second.teamSlot)
      .map((member) => readRow(member, member === active, swapShade));
    const key = next
      .map((row) =>
        [
          row.key,
          row.keyLabel,
          row.dex,
          +row.shiny,
          row.rimKey,
          +row.active,
          row.fill,
          row.band,
          row.cooldown,
          row.chipsKey,
          row.heldIcon,
        ].join(':')
      )
      .join('|');
    if (key !== lastRowsKey) {
      lastRowsKey = key;
      rows.value = next;
    }
    showRoster.value = roster.length >= 2;
  }

  function readBerries(player) {
    const slotCount = G.Grounds.berrySlots(G.DB.save),
      held = player.berries || [];
    const next = [];
    for (let index = 0; index < slotCount; index++) {
      const def = held[index] && G.Grounds.BY[held[index]];
      next.push(def ? { key: 'berry' + index, icon: 'ps:' + def.icon } : { key: 'berry' + index });
    }
    const key = next.map((berry) => berry.icon || '-').join('|');
    if (key !== lastBerriesKey) {
      lastBerriesKey = key;
      berries.value = next;
    }
  }

  function sync(showing) {
    const player = showing && G.Game.player;
    visible.value = !!player;
    if (!player) return;
    readRoster();
    readBerries(player);
  }

  /** Where the canvas buff chips start (js/ui/hud.js): right of the held item squares, or of the berry bag. */
  function buffsLeft() {
    if (showRoster.value) return ROW.left + ROW_WIDTH + HELD.gap + HELD_SIZE + 12;
    const columns = Math.min(2, berries.value.length);
    return columns ? ROW.left + (columns - 1) * BERRY_PITCH + BERRY_SIZE + 12 : 16;
  }

  overlay.addPanel({ id: 'roster', View: RosterPanel, sync });
  return { ready: true, buffsLeft };
})();
