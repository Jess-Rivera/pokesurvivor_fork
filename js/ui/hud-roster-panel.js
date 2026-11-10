/* ============ hud-roster-panel.js: the team roster, held items and berry bag, lower left (#63, on the HTML HUD) ============
 * A panel of js/ui/hud-overlay.js (the core and its kit). Layout: the wireframe's lower left
 * (assets/excalidraw/run_screen_mockup.png). Look and numbers: docs/HUD-STYLE.md "Roster rows" and "Berry bag".
 *
 * One row per filled team slot, top to bottom in slot order: the B2 box (b2-lower Y15 to AA16) rimmed in the Pokemon's
 * first type, its portrait in a circle, its name, a benched Pokemon's status chips, and the B2 "HP" bar (b2-lower Y16 to
 * Z16) along the bottom. The held item square sits to the right of each row. The active row wears the selection cursor;
 * the others dim under the swap cooldown. A team of one shows no roster, since the bottom panel already shows it.
 * Above the roster: the berry bag, 2x2, only the purchased slots. Reads the team once per frame, never writes it.
 *
 * Positions are fixed CSS pixels from the screen's bottom left (the wireframe is not 16:9, so the lower panels are placed
 * from the bottom).
 */
G.HudRosterPanel = (() => {
  const overlay = G.HudOverlay;
  if (!overlay.ready) return { ready: false };
  const { html, signal, PALETTE, HP_COLOURS, SLOT_GRID, FAINTED_RIM, PixelShape, typeColours, hpBand } = overlay.kit;
  const { ItemSquare, Cursor, Chip, createChipReader, portraitSource, portraitFallback } = overlay.kit;

  // ---------- sizes and places (HUD-STYLE "Panel sizes at 1080p", roster and berry bag) ----------
  const ART_PIXEL = 2,
    // A row: the rip's corners at 2x, with the straight sides cut down to 32 rows. 139 art pixels holds the portrait, the
    // widest species name in the HUD font (116 px, measured 2026-11-10) and one status chip side by side.
    ROW = { artRows: 32, artWidth: 139, left: 16, bottom: 42, gap: 4 },
    FACE = { left: 14, top: 10, size: 44 }, // the portrait circle: a 40 px portrait inside a 2 px stroke
    NAME = { left: 66, top: 17 }, // just right of the portrait, a little below the middle of the space above the bar
    CHIP_ROW = { right: 14, top: 12, gap: 6 }, // a benched Pokemon's chips, top right inside the box
    BAR = { artLeft: 33, artTop: 19 }, // the HP bar: right of the portrait, along the bottom
    HELD = { artSize: 24, gap: 8 }, // the held item square, right of the row, centred on it
    BERRY = { artSize: 20, column: 128, rowPitch: 72, gapAbove: 12, nameGap: 4 };
  const ROW_WIDTH = ROW.artWidth * ART_PIXEL,
    ROW_HEIGHT = ROW.artRows * ART_PIXEL,
    ROW_PITCH = ROW_HEIGHT + ROW.gap,
    HELD_SIZE = HELD.artSize * ART_PIXEL,
    BERRY_SIZE = BERRY.artSize * ART_PIXEL;

  // ---------- the roster box (b2-lower Y15 to AA16) ----------
  // The left end of the rip's top 8 rows and one straight row, one letter per art pixel from the box's left edge; the
  // rest of each row is its last letter's fill. The right end is the mirror, the bottom 8 rows the top's mirror.
  //   o outline, D / B / L the rim's dark, base and light, G the body grid, space nothing.
  const LEFT_END = [
    ['      oooo', ' '], // the corner bump rises above the top edge
    ['     oDBBDo', ' '],
    ['    oDBooBD', 'o'],
    ['   oDBoLBo', 'B'],
    ['  oDBoLLL', 'o'],
    [' oDBoLLLo', 'G'],
    ['oDBoLLLo', 'G'],
    ['oBoLLL', 'G'],
  ];
  const STRAIGHT_LEFT = ['oBoLLo', 'G'];
  // The B2 small bar (b2-lower Y16 to Z16): the "HP" label is the life meter's (20 px italic HUD text, Jess 2026-11-10:
  // the same style as the centre bar), then the track's frame (t) and its empty inside (f), rows 2 to 5 of the bar.
  const LABEL_ART = 12, // "HP" at 20 px with its outline is 24 px wide, as the life meter's label (hud-overlay.js)
    TRACK_LEFT = LABEL_ART, // the track's left frame column, from the bar's left edge, right after the label
    TRACK_TOP = 2, // the track's frame rows: 2 and 5, its inside 3 and 4
    BAR_RIGHT = ROW.artWidth - 8 - BAR.artLeft, // the track's right frame column: one pixel clear of the right rim
    FILL_LEFT = BAR.artLeft + TRACK_LEFT + 1,
    FILL_ART_WIDTH = BAR_RIGHT - TRACK_LEFT - 1,
    // the label's 24 px line centred on the track's frame
    LABEL_TOP = (BAR.artTop + TRACK_TOP) * ART_PIXEL + 2 * ART_PIXEL - 12;

  /** The box and its HP bar as a grid of letters, one string per art row. */
  const BOX_GRID = (() => {
    const width = ROW.artWidth,
      rows = ROW.artRows;
    const rowOf = ([left, fill]) => {
      const right = left.split('').reverse().join('');
      return left + fill.repeat(width - 2 * left.length) + right;
    };
    const grid = [];
    for (let row = 0; row < rows; row++) {
      const fromTop = Math.min(row, rows - 1 - row);
      grid.push(rowOf(fromTop < LEFT_END.length ? LEFT_END[fromTop] : STRAIGHT_LEFT).split(''));
    }
    // stamp the HP bar's track: its frame and its empty inside (the label is text, drawn over it in the row)
    for (let trackRow = 0; trackRow < 4; trackRow++) {
      const line = grid[BAR.artTop + TRACK_TOP + trackRow],
        stamp = (column, letter) => (line[BAR.artLeft + column] = letter);
      if (trackRow === 0 || trackRow === 3)
        for (let column = TRACK_LEFT; column <= BAR_RIGHT; column++) stamp(column, 't');
      else {
        stamp(TRACK_LEFT, 't');
        for (let column = TRACK_LEFT + 1; column < BAR_RIGHT; column++) stamp(column, 'f');
        stamp(BAR_RIGHT, 't');
      }
    }
    return grid.map((line) => line.join(''));
  })();

  const letterColours = (rim) => ({
    o: PALETTE.outline,
    D: rim.dark,
    B: rim.base,
    L: rim.light,
    G: SLOT_GRID,
    f: PALETTE.frame,
    t: PALETTE.trackEdge,
  });
  /** paintRow for a grid of letters: runs of one letter become one rectangle. */
  const gridRows = (grid, colours) => (row) => {
    const line = grid[row],
      runs = [];
    let start = 0;
    for (let column = 1; column <= line.length; column++) {
      if (column < line.length && line[column] === line[start]) continue;
      if (line[start] !== ' ') runs.push([start, column - start, colours[line[start]]]);
      start = column;
    }
    return runs;
  };

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
    berries = signal([]), // per purchased slot: { key, name, icon } or { key } when empty
    showRoster = signal(false),
    visible = signal(false);

  // ---------- components ----------
  const stripes = (band) => {
    const colours = HP_COLOURS[band];
    return `linear-gradient(${colours.fill} 0 ${ART_PIXEL}px, ${colours.shade} ${ART_PIXEL}px ${2 * ART_PIXEL}px)`;
  };

  function RosterRow({ row, index, count }) {
    const bottom = ROW.bottom + (count - 1 - index) * ROW_PITCH;
    return html`<div
        class=${'hud-roster-row' + (row.fainted ? ' is-fainted' : '')}
        style=${{ left: ROW.left + 'px', bottom: bottom + 'px', width: ROW_WIDTH + 'px', height: ROW_HEIGHT + 'px' }}
      >
        <${PixelShape}
          artWidth=${ROW.artWidth}
          artRows=${ROW.artRows}
          artPixel=${ART_PIXEL}
          paintRow=${gridRows(BOX_GRID, letterColours(row.rim))}
        />
        <div
          class="hud-roster-fill"
          style=${{
            left: FILL_LEFT * ART_PIXEL + 'px',
            top: (BAR.artTop + 3) * ART_PIXEL + 'px',
            width: FILL_ART_WIDTH * ART_PIXEL + 'px',
            height: 2 * ART_PIXEL + 'px',
            background: stripes(row.band),
            transform: `scaleX(${row.fill})`,
          }}
        ></div>
        <span class="hud-hp-label" style=${{ left: BAR.artLeft * ART_PIXEL + 'px', top: LABEL_TOP + 'px' }}>HP</span>
        <div
          class="hud-roster-face"
          style=${{ left: FACE.left + 'px', top: FACE.top + 'px', width: FACE.size + 'px', height: FACE.size + 'px' }}
        >
          <img src=${portraitSource(row.dex, row.shiny)} data-dex=${row.dex} alt="" onError=${portraitFallback} />
        </div>
        <span class="hud-text hud-roster-name" style=${{ left: NAME.left + 'px', top: NAME.top + 'px' }}
          >${row.name}</span
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
      </div>
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

  function BerryBag() {
    const list = berries.value,
      gridRowCount = Math.ceil(list.length / 2),
      bottomEdge = berriesBottom(showRoster.value ? rows.value.length : 0);
    return list.map((berry, index) => {
      const column = index % 2,
        gridRow = Math.floor(index / 2),
        cellBottom = bottomEdge + (gridRowCount - 1 - gridRow) * BERRY.rowPitch,
        left = ROW.left + column * BERRY.column;
      return html`<div
          key=${berry.key}
          class="hud-berry"
          style=${{ left: left + 'px', bottom: cellBottom + 20 + BERRY.nameGap + 'px' }}
        >
          <${ItemSquare} icon=${berry.icon || null} artSize=${BERRY.artSize} />
        </div>
        ${
          berry.name
            ? html`<div
                key=${berry.key + 'name'}
                class="hud-text hud-berry-name"
                style=${{ left: left + 'px', bottom: cellBottom + 'px' }}
              >
                ${berry.name}
              </div>`
            : null
        }`;
    });
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
    const fraction = member.maxHp > 0 ? Math.min(1, Math.max(0, member.hp / member.maxHp)) : 0,
      fillUnits = fainted || member.hp <= 0 ? 0 : Math.max(1, Math.round(fraction * FILL_ART_WIDTH));
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
      fill: fillUnits / FILL_ART_WIDTH,
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
      next.push(def ? { key: 'berry' + index, name: def.name, icon: 'ps:' + def.icon } : { key: 'berry' + index });
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
    return columns ? ROW.left + (columns - 1) * BERRY.column + BERRY_SIZE + 12 : 16;
  }

  overlay.addPanel({ id: 'roster', View: RosterPanel, sync });
  return { ready: true, buffsLeft };
})();
