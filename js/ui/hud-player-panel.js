/* ============ hud-player-panel.js: the character info panel, bottom centre (#62, on the HTML HUD) ============
 * A panel of js/ui/hud-overlay.js (the core and its kit). Layout: the wireframe's bottom centre
 * (assets/excalidraw/run_screen_mockup.png). Look and numbers: docs/HUD-STYLE.md "Character info panel".
 *
 * Pieces: the portrait with the EXP ring, the held item, the life meter with current / max, the status chips, the Shake
 * Off prompt, the four move slots (B2 move buttons, bonded moves one per well), Lv, the bond count, Silver and the run
 * timer. Reads your active Pokemon once per frame, never writes game state. Keyboard only for now: touch is #72.
 *
 * Positions are fixed CSS pixels measured from the screen's bottom centre: x from the centre line, y from the bottom
 * edge up to the piece's bottom edge (the wireframe is not 16:9, so the bottom panel is placed from the bottom).
 */
G.HudPlayerPanel = (() => {
  const overlay = G.HudOverlay;
  if (!overlay.ready) return { ready: false };
  const { html, signal, hooks, PALETTE, TYPE_CHECKER, BAR_CHECKER, PixelShape, createLifeBar, typeColours } =
    overlay.kit;
  const { portraitSource, portraitFallback } = overlay.kit;

  // ---------- sizes and places (HUD-STYLE "Panel sizes at 1080p", character info panel) ----------
  const ART_PIXEL = 2, // every shape here is drawn at 2 px per B2 art pixel
    LIFE_ART_WIDTH = 231, // 462 px
    LIFE = { x: -252, y: 144 },
    HP_LABEL_TOP = -6,
    HP_TEXT = { x: 218, y: 151 },
    SLOT_ART_WIDTH = 105, // 210 x 48 px
    SLOT_ART_ROWS = 24,
    SLOT_COLUMN_GAP = 6,
    SLOT_ROW_GAP = 4,
    GRID = { x: -216, y: 36 },
    WELLS_PER_SLOT = 4, // a bond holds up to 4 moves (PlayerEntity.BOND_MAX)
    WELL_SIZE = 36,
    CHIPS = { x: -244, y: 176, width: 70, height: 24, gap: 6 },
    PROMPT = { centreX: -21, y: 212, artRows: 24, padArt: 14 },
    PORTRAIT = { centreX: -281, y: 36, size: 116 },
    ITEM = { right: -351, y: 74, artSize: 20, nameY: 48 },
    SILVER = { right: -260, coinY: 176, coinSize: 32 },
    LEVEL = { x: 222, labelY: 116, numberY: 68 },
    BOND = { x: 222, y: 36, icon: 24 },
    TIMER = { centreX: -3, y: 10 };

  // Bonded slots: the bond colour (#ff8ad8, the game's bond pink) ramped as HUD-STYLE "Ramps for new colours".
  const BOND_RIM = { light: '#ffd3f1', base: '#ff8ad8', dark: '#8c4c77' };
  const EMPTY_RIM = { light: PALETTE.checker, base: PALETTE.frame, dark: PALETTE.frame }; // the B2 disabled button (b2-lower V4)

  // Status chips: the major statuses plus poison, bad poison and burn (HUD-STYLE "Status chips"), as B2's tags.
  const CHIP_STYLES = {
    sleep: { label: 'SLP', fill: '#848484', shade: '#4a4a4a' },
    poison: { label: 'PSN', fill: '#d631de', shade: '#6b2942' },
    toxic: { label: 'PSN', fill: '#d631de', shade: '#391042' },
    burn: { label: 'BRN', fill: '#e75a4a', shade: '#b50000' },
    freeze: { label: 'FRZ', fill: '#218cf7', shade: '#005a8c' },
    paralysis: { label: 'PAR', fill: '#efad00', shade: '#ad6b00' },
  };
  const hasChip = (statusKey) => !!CHIP_STYLES[statusKey];

  // Silver: the rolling count and the pop on each gain (as the canvas counter it replaces, Jess 2026-11-05).
  const SILVER_POP = 0.18, // s, the pop settles in this long
    SILVER_ROLL = 0.25, // s, the rolling number lands in this long after the last gain
    SILVER_ROLL_MIN = 25; // coins per second, the slowest roll (small gains)

  // ---------- state the page shows (signals) ----------
  const visible = signal(false),
    centreX = signal(0),
    portrait = signal({ dex: 0, shiny: false }),
    expAngle = signal(0),
    hpText = signal(''),
    level = signal(''),
    bonds = signal(0),
    chips = signal([]), // { key, label, fill, shade, timer (0 to 1, or null) }
    prompt = signal(''), // the Shake Off text, or '' when nothing can be shaken off
    slots = signal([]), // per slot: { key, keyLabel, rim, active, moves: [{ id, icon, iconSize }] }
    moveCooldowns = signal([]), // per slot, per well: { shade (0 to 1), flash (0 to 1) }
    item = signal(null), // { id, name, icon }
    silverText = signal(''),
    silverPop = signal(0),
    silverShown = signal(true),
    silverFrame = signal(0),
    timerText = signal('');
  const lifeArtWidth = signal(LIFE_ART_WIDTH);
  const lifeBar = createLifeBar({ artPixel: ART_PIXEL, artWidth: lifeArtWidth, labelTop: HP_LABEL_TOP });

  const layout = () => (centreX.value = Math.floor(innerWidth / 2));
  const place = (x, y) => ({ left: x + 'px', bottom: y + 'px' });

  // ---------- shapes ----------
  /** The B2 move button (b2-lower F15 to J16): a point on the left, a chevron on the right, 45 degree slants. */
  function slotRow(row, rim) {
    const width = SLOT_ART_WIDTH,
      rows = SLOT_ART_ROWS,
      left = Math.abs(row - 7), // the left point is on row 7
      right = width - 1 - Math.abs(row - (rows - 1 - 7)); // the right point mirrors it (row 16)
    if (row === 0 || row === rows - 1) return [[left, right - left + 1, PALETTE.outline]];
    const inner = row === 1 || row === rows - 2 ? rim.dark : row === 2 || row === rows - 3 ? PALETTE.outline : null;
    const ends = [
      [left, 1, PALETTE.outline],
      [left + 1, 1, rim.light],
      [left + 2, 1, rim.base],
      [left + 3, 1, PALETTE.outline],
      [right - 3, 1, PALETTE.outline],
      [right - 2, 1, rim.base],
      [right - 1, 1, rim.light],
      [right, 1, PALETTE.outline],
    ];
    const body = [left + 4, right - 3 - (left + 4), inner || (rim === EMPTY_RIM ? PALETTE.body : TYPE_CHECKER)];
    return [body, ...ends];
  }

  /** The B2 "FIGHT!" badge (b2-lower B12 to D12): pointed ends, an outline, a shade rim and a shade band at the bottom. */
  function promptRow(row, artWidth, fill, shade) {
    const rows = PROMPT.artRows,
      left = Math.abs(2 * row - (rows - 1)) >> 1,
      right = artWidth - 1 - left;
    if (row === 0 || row === rows - 1) return [[left, right - left + 1, PALETTE.outline]];
    const body = row === 1 || row >= rows - 4 ? shade : fill;
    return [
      [left, 1, PALETTE.outline],
      [left + 1, right - left - 1, body],
      [right, 1, PALETTE.outline],
      ...(row > 1 && row < rows - 4
        ? [
            [left + 1, 1, shade],
            [right - 1, 1, shade],
          ]
        : []),
    ];
  }

  /** The B2 bag button (b2-lower Y4 to AB5): a square with chamfered corners, a rim and the checker body. */
  function itemRow(row, rimColour) {
    const size = ITEM.artSize,
      chamfer = row < 2 ? 2 - row : row > size - 3 ? row - (size - 3) : 0,
      left = chamfer,
      right = size - 1 - chamfer;
    if (row === 0 || row === size - 1) return [[left, right - left + 1, PALETTE.outline]];
    if (row === 1 || row === size - 2)
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

  /** The B2 selection cursor (b2-lower Z2 to AC3): four yellow corner brackets with an outline. */
  function CursorCorner({ corner }) {
    const size = 7;
    const rows = (row) => {
      if (row === 0 || row === 2) return [[0, size, PALETTE.outline]];
      if (row === 1)
        return [
          [0, 1, PALETTE.outline],
          [1, size - 2, PALETTE.cursor],
          [size - 1, 1, PALETTE.outline],
        ];
      if (row === size - 1) return [[0, 3, PALETTE.outline]];
      return [
        [0, 1, PALETTE.outline],
        [1, 1, PALETTE.cursor],
        [2, 1, PALETTE.outline],
      ];
    };
    return html`<div class=${'hud-cursor hud-cursor-' + corner}>
      <${PixelShape} artWidth=${size} artRows=${size} artPixel=${ART_PIXEL} paintRow=${rows} />
    </div>`;
  }

  // ---------- components ----------
  function Portrait() {
    const { dex, shiny } = portrait.value;
    return html`<div
      class="hud-portrait"
      style=${{ ...place(PORTRAIT.centreX - PORTRAIT.size / 2, PORTRAIT.y), '--exp': expAngle.value + 'deg' }}
    >
      <div class="hud-exp-ring hud-exp-shade-outer"></div>
      <div class="hud-exp-ring hud-exp-fill"></div>
      <div class="hud-exp-ring hud-exp-shade-inner"></div>
      <div class="hud-portrait-face">
        ${dex ? html`<img src=${portraitSource(dex, shiny)} data-dex=${dex} alt="" onError=${portraitFallback} />` : null}
      </div>
    </div>`;
  }

  let itemCanvas = null;
  function HeldItem() {
    const held = item.value,
      size = ITEM.artSize * ART_PIXEL;
    const rim = held ? PALETTE.lvFill : PALETTE.slate;
    return html`<div class="hud-item" style=${place(ITEM.right - size, ITEM.y)}>
        <${PixelShape}
          artWidth=${ITEM.artSize}
          artRows=${ITEM.artSize}
          artPixel=${ART_PIXEL}
          paintRow=${(row) => itemRow(row, rim)}
        />
        <canvas
          class="hud-item-icon"
          width="32"
          height="32"
          ref=${(element) => (itemCanvas = element)}
          style=${{ visibility: held ? 'visible' : 'hidden' }}
        ></canvas>
      </div>
      ${held ? html`<div class="hud-text hud-item-name" style=${{ right: -ITEM.right + 'px', bottom: ITEM.nameY + 'px' }}>${held.name}</div>` : null}`;
  }

  function LifeMeter() {
    return html`<div class="hud-life" style=${place(LIFE.x, LIFE.y)}><${lifeBar.View} /></div>
      <div class="hud-text hud-hp-text" style=${place(HP_TEXT.x, HP_TEXT.y)}>${hpText}</div>`;
  }

  function Chips() {
    return html`<div class="hud-chips" style=${place(CHIPS.x, CHIPS.y)}>
      ${chips.value.map(
        (chip) =>
          html`<div
            key=${chip.key}
            class="hud-chip"
            style=${{ background: chip.fill, borderColor: chip.shade, '--chip-shade': chip.shade }}
          >
            <span class="hud-text">${chip.label}</span>
            ${
              chip.timer != null
                ? html`<div class="hud-chip-timer" style=${{ transform: `scaleX(${chip.timer})` }}></div>`
                : null
            }
          </div>`
      )}
    </div>`;
  }

  function ShakePrompt() {
    const text = prompt.value;
    const textRef = hooks.useRef(null),
      [artWidth, setArtWidth] = hooks.useState(0);
    hooks.useLayoutEffect(() => {
      if (!textRef.current) return;
      const measured = Math.ceil(textRef.current.offsetWidth / ART_PIXEL) + 2 * PROMPT.padArt;
      if (measured !== artWidth) setArtWidth(measured);
    });
    if (!text) return null;
    const width = artWidth * ART_PIXEL,
      left = PROMPT.centreX - Math.round(width / 2);
    return html`<div class="hud-prompt" style=${{ ...place(left, PROMPT.y), width: width + 'px' }}>
      ${
        artWidth
          ? html`<${PixelShape}
                artWidth=${artWidth}
                artRows=${PROMPT.artRows}
                artPixel=${ART_PIXEL}
                paintRow=${(row) => promptRow(row, artWidth, PALETTE.lvFill, PALETTE.lvShade)}
              /><${PixelShape}
                className="hud-prompt-flash"
                artWidth=${artWidth}
                artRows=${PROMPT.artRows}
                artPixel=${ART_PIXEL}
                paintRow=${(row) => promptRow(row, artWidth, '#ffffff', PALETTE.lvShade)}
              />`
          : null
      }
      <span class="hud-text hud-prompt-text" ref=${textRef}>${text}</span>
    </div>`;
  }

  /** Well centres along a slot, in px from its left edge: clear of the slanted ends, evenly spread. */
  const WELL_FIRST = 47,
    WELL_LAST = SLOT_ART_WIDTH * ART_PIXEL - 47,
    wellCentre = (index) => WELL_FIRST + ((WELL_LAST - WELL_FIRST) * index) / (WELLS_PER_SLOT - 1);

  function Slot({ slot, index }) {
    const column = index % 2,
      row = Math.floor(index / 2),
      width = SLOT_ART_WIDTH * ART_PIXEL,
      height = SLOT_ART_ROWS * ART_PIXEL,
      left = GRID.x + column * (width + SLOT_COLUMN_GAP),
      bottom = GRID.y + (row === 0 ? height + SLOT_ROW_GAP : 0),
      cooldowns = moveCooldowns.value[index] || [];
    const wells = [];
    for (let well = 0; well < WELLS_PER_SLOT; well++) {
      const move = slot.moves[well],
        cooldown = cooldowns[well] || { shade: 0, flash: 0 };
      wells.push(
        html`<div class="hud-well" style=${{ left: wellCentre(well) - WELL_SIZE / 2 + 'px' }}>
          ${
            move
              ? html`<img
                    src=${move.icon}
                    alt=""
                    style=${{ width: move.iconSize + 'px', height: move.iconSize + 'px' }}
                  />
                  <div class="hud-well-shade" style=${{ transform: `scaleY(${cooldown.shade})` }}></div>
                  <div class="hud-well-flash" style=${{ opacity: cooldown.flash }}></div>`
              : null
          }
        </div>`
      );
    }
    return html`<div
      class=${'hud-slot' + (slot.active ? ' is-active' : '')}
      style=${{ ...place(left, bottom), width: width + 'px', height: height + 'px' }}
    >
      <${PixelShape}
        artWidth=${SLOT_ART_WIDTH}
        artRows=${SLOT_ART_ROWS}
        artPixel=${ART_PIXEL}
        paintRow=${(slotRowIndex) => slotRow(slotRowIndex, slot.rim)}
      />
      ${wells}
      <span class="hud-text hud-slot-key">${slot.keyLabel}</span>
      ${
        slot.active
          ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(
              (corner) => html`<${CursorCorner} key=${corner} corner=${corner} />`
            )
          : null
      }
    </div>`;
  }

  function Slots() {
    return slots.value.map((slot, index) => html`<${Slot} key=${slot.key} slot=${slot} index=${index} />`);
  }

  function Level() {
    return html`<div class="hud-text hud-lv-label" style=${place(LEVEL.x, LEVEL.labelY)}>Lv.</div>
      <div class="hud-lv-number" style=${place(LEVEL.x, LEVEL.numberY)}>${level}</div>
      ${
        bonds.value > 0
          ? html`<div class="hud-bond" style=${place(BOND.x, BOND.y)}>
              <img src=${G.Icons.url('bond')} alt="" style=${{ width: BOND.icon + 'px', height: BOND.icon + 'px' }} />
              ${bonds.value > 1 ? html`<span class="hud-text">×${bonds.value}</span>` : null}
            </div>`
          : null
      }`;
  }

  function Silver() {
    if (!silverShown.value) return null;
    const sheet = G.PickupSprites && G.PickupSprites.silver;
    const coinStyle = sheet
      ? {
          ...place(SILVER.right - SILVER.coinSize, SILVER.coinY),
          backgroundImage: `url(${sheet.src})`,
          backgroundSize: `${sheet.n * (sheet.cell + G.PickupSprites.pad) * 2}px auto`,
          backgroundPosition: `${-silverFrame.value * (sheet.cell + G.PickupSprites.pad) * 2}px ${-sheet.y * 2}px`,
        }
      : place(SILVER.right - SILVER.coinSize, SILVER.coinY);
    const scale = 1 + 0.3 * silverPop.value * silverPop.value;
    return html`<div class="hud-silver-coin" style=${coinStyle}></div>
      <div
        class="hud-text hud-silver-count"
        style=${{
          right: -(SILVER.right - SILVER.coinSize - 6) + 'px',
          bottom: SILVER.coinY + 'px',
          transform: `scale(${scale})`,
        }}
      >
        ${silverText}
      </div>`;
  }

  function PlayerPanel() {
    if (!visible.value) return null;
    return html`<div class="hud-player" style=${{ left: centreX.value + 'px' }}>
      <${LifeMeter} />
      <${Portrait} />
      <${HeldItem} />
      <${Chips} />
      <${Silver} />
      <${Slots} />
      <${Level} />
      <${ShakePrompt} />
      <div class="hud-text hud-timer" style=${place(TIMER.centreX, TIMER.y)}>${timerText}</div>
    </div>`;
  }

  // ---------- the per-frame read ----------
  const statusPeak = {}; // seconds each chip's status started with (the highest time seen since it appeared)
  const silverState = { shown: -1, target: -1, rate: 0, pop: 0, at: 0, time: 0 };
  let lastSlotsKey = '',
    lastChipsKey = '',
    lastItem = undefined,
    itemDrawnAt = 0,
    itemDraws = 0,
    drawnCanvas = null,
    lastPortraitKey = '';

  const iconSizeOf = (name) => {
    const canvas = G.Icons.canvas(name);
    return canvas && canvas.width ? canvas.width * 2 : WELL_SIZE; // the icon at exactly 2x
  };
  const moveType = (move) => move.type || (G.MoveInfo && G.MoveInfo.type(move.id));

  function readSlots(player) {
    const keyOf = (group) => group.map((move) => move.id).join('+');
    const key =
      player.active +
      '|' +
      [0, 1, 2, 3].map(
        (index) => keyOf(player.slots[index] || []) + ':' + (G.Input.keyLabel('attack_' + (index + 1)) || '')
      );
    if (key !== lastSlotsKey) {
      lastSlotsKey = key;
      slots.value = [0, 1, 2, 3].map((index) => {
        const group = player.slots[index] || [];
        const rim = !group.length ? EMPTY_RIM : group.length > 1 ? BOND_RIM : typeColours(moveType(group[0]));
        return {
          key: 'slot' + index,
          keyLabel: G.Input.keyLabel('attack_' + (index + 1)) || String(index + 1),
          rim,
          active: index === player.active && group.length > 0,
          moves: group.map((move) => ({
            id: move.id,
            icon: G.Icons.url('move:' + move.id),
            iconSize: iconSizeOf('move:' + move.id),
          })),
        };
      });
    }
    // cooldown shades and cast flashes: rounded so an unchanged look touches nothing
    const now = performance.now();
    const next = [0, 1, 2, 3].map((index) =>
      (player.slots[index] || []).map((move) => ({
        shade: Math.round(G.HUD.moveCooldownFraction(player, move) * 48) / 48,
        flash: Math.round(Math.max(0, 1 - (now - (move.castAt || 0)) / 180) * 0.55 * 20) / 20,
      }))
    );
    const previous = moveCooldowns.value;
    const changed =
      next.length !== previous.length ||
      next.some(
        (wells, index) =>
          !previous[index] ||
          wells.length !== previous[index].length ||
          wells.some(
            (well, wellIndex) =>
              well.shade !== previous[index][wellIndex].shade || well.flash !== previous[index][wellIndex].flash
          )
      );
    if (changed) moveCooldowns.value = next;
  }

  function readChips(player) {
    const list = G.Status.list(player).filter((status) => hasChip(status.k));
    for (const key in statusPeak) if (!list.some((status) => status.k === key)) delete statusPeak[key];
    const next = list.map((status) => {
      if (status.t != null) statusPeak[status.k] = Math.max(statusPeak[status.k] || 0, status.t);
      const style = CHIP_STYLES[status.k];
      const timer =
        status.t != null && statusPeak[status.k] > 0 ? Math.max(0, Math.min(1, status.t / statusPeak[status.k])) : null;
      return {
        key: status.k,
        label: style.label,
        fill: style.fill,
        shade: style.shade,
        timer: timer == null ? null : Math.round(timer * 35) / 35,
      };
    });
    const key = next.map((chip) => chip.key + ':' + chip.timer).join('|');
    if (key !== lastChipsKey) {
      lastChipsKey = key;
      chips.value = next;
    }
  }

  function readItem(player) {
    const id = player.item || null;
    const now = performance.now();
    if (id !== lastItem || itemCanvas !== drawnCanvas) {
      lastItem = id;
      drawnCanvas = itemCanvas;
      const def = id && G.Items.BY[id];
      item.value = def ? { id, name: def.name, icon: def.icon || id } : null;
      itemDraws = 0;
      itemDrawnAt = 0;
    }
    // draw the icon on a change, then twice more half a second apart: a Pokesprite cell paints once its sheet has loaded
    if (item.value && itemCanvas && itemDraws < 3 && now - itemDrawnAt > 500) {
      const context = itemCanvas.getContext('2d');
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, 32, 32);
      G.Icons.draw(context, item.value.icon, 0, 0, 32);
      itemDraws++;
      itemDrawnAt = now;
    }
  }

  function readSilver(runTime) {
    silverShown.value = !G.Coop.active; // hidden in co-op until co-op shops exist
    const now = performance.now() / 1000,
      elapsed = Math.min(0.1, Math.max(0, now - silverState.at)),
      target = G.Silver.whole;
    silverState.at = now;
    if (silverState.target < 0 || target < silverState.target || runTime < silverState.time) {
      silverState.shown = target; // first frame, a spend or a new run: no roll
      silverState.pop = 0;
    } else if (target > silverState.target) {
      silverState.pop = 1; // a gain restarts the pop
      silverState.rate = Math.max(SILVER_ROLL_MIN, (target - silverState.shown) / SILVER_ROLL);
    }
    silverState.target = target;
    silverState.time = runTime;
    if (silverState.shown < target)
      silverState.shown = Math.min(target, silverState.shown + silverState.rate * elapsed);
    silverState.pop = Math.max(0, silverState.pop - elapsed / SILVER_POP);
    silverText.value = Math.floor(silverState.shown).toLocaleString('en-US');
    silverPop.value = Math.round(silverState.pop * 20) / 20;
    const sheet = G.PickupSprites && G.PickupSprites.silver;
    if (sheet) silverFrame.value = Math.floor((runTime * 1000) / sheet.ms[0]) % sheet.n; // spins on the run clock
  }

  function sync(showing) {
    const player = showing && G.Game.player;
    visible.value = !!player;
    if (!player) {
      lifeBar.reset();
      return;
    }
    const portraitKey = player.dex + ':' + !!player.shiny;
    if (portraitKey !== lastPortraitKey) {
      lastPortraitKey = portraitKey;
      portrait.value = { dex: player.dex, shiny: !!player.shiny };
    }
    const expFraction = player.xpNext > 0 ? Math.max(0, Math.min(1, player.xp / player.xpNext)) : 0;
    expAngle.value = Math.round(expFraction * 360);
    lifeBar.update(player.hp, player.maxHp, player.dead, player);
    hpText.value = Math.ceil(Math.max(0, player.hp)) + ' / ' + Math.round(player.maxHp);
    level.value = String(player.level);
    bonds.value = player.bonds || 0;
    readChips(player);
    prompt.value = G.Status.shakeable(player)
      ? G.Settings.get('autoShake')
        ? 'Shaking off...'
        : 'Press ' + (G.Input.keyLabel('shake_off') || '?') + ' to Shake Off!'
      : '';
    readSlots(player);
    readItem(player);
    const runTime = G.Game.st.time;
    readSilver(runTime);
    timerText.value = G.U.mmss(runTime);
  }

  layout();
  addEventListener('resize', layout);
  overlay.addPanel({ id: 'player', View: PlayerPanel, sync });
  return { ready: true, hasChip };
})();
