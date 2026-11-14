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
  const { html, signal, hooks, PALETTE, SLOT_GRID, PixelShape, moveSlotRow, createLifeBar, typeColours } = overlay.kit;
  const { ItemSquare, Cursor, Chip, hasChip, createEffectChipReader } = overlay.kit;
  const { portraitSource, portraitFallback } = overlay.kit;

  // ---------- sizes and places (HUD-STYLE "Panel sizes at 1080p", character info panel) ----------
  const ART_PIXEL = 2, // every shape here is drawn at 2 px per B2 art pixel
    LIFE_ART_WIDTH = 231, // 462 px
    LIFE = { x: -252, y: 140 },
    HP_LABEL_TOP = -6,
    HP_TEXT = { x: 218, y: 147 },
    SLOT_ART_WIDTH = 105, // 210 x 44 px
    SLOT_ART_ROWS = 22, // the rip's 44 rows at half height
    SLOT_COLUMN_GAP = 6,
    SLOT_ROW_GAP = 4,
    GRID = { x: -216, y: 36 },
    WELLS_PER_SLOT = 4, // a bond holds up to 4 moves (PlayerEntity.BOND_MAX)
    WELL_SIZE = 36,
    // #76: two chip bands of two lines each at fixed heights; the good band sits 12 px above the bad band's top line
    CHIP_BANDS = { x: -244, badY: 172, goodY: 238, chipsPerLine: 6, width: 70, gap: 6 },
    PROMPT = { centreX: -21, y: 304, artRows: 24, padArt: 14 }, // above the four chip lines (#76)
    // the draining bar (Jess, 2026-11-11): white, on the two lowest shade rows inside the outline, clear of the pointed ends
    PROMPT_TIMER = { bottomArt: 1, heightArt: 2, insetArt: 11 },
    PORTRAIT = { centreX: -281, y: 36, size: 116 },
    ITEM = { x: 222, y: 74, artSize: 20, nameY: 48 }, // right of the slots (Jess, 2026-11-10: swapped with Lv)
    SILVER = { right: -260, coinY: 160, coinSize: 32 }, // 12 px below the chips' line (Jess, 2026-11-10)
    // Lv: left of the portrait, right-aligned 12 px clear of its ring (Jess, 2026-11-10: swapped with the held item). The
    // label sits 8 px clear of the number's tall glyphs; the bond count stays under the number.
    LEVEL = { right: -351, labelY: 116, numberY: 60 },
    BOND = { right: -351, y: 36, icon: 24 },
    TIMER = { centreX: -3, y: 10 },
    LEVEL_RATTLE_MS = 650; // the rattle's 0.6 s (css/hud-overlay.css hud-lv-rattle) and a frame to spare

  // Bonded slots: the bond colour (#ff8ad8, the game's bond pink) ramped as HUD-STYLE "Ramps for new colours".
  const BOND_RIM = { light: '#ffd3f1', base: '#ff8ad8', dark: '#8c4c77' };
  const EMPTY_RIM = { light: PALETTE.checker, base: PALETTE.frame, dark: PALETTE.frame }; // the B2 disabled button (b2-lower V4)

  // Silver: the rolling count and the pop on each gain (as the canvas counter it replaces, Jess 2026-11-05).
  const SILVER_POP = 0.18, // s, the pop settles in this long
    SILVER_POP_GROWTH = 0.5, // the count grows up to 1.5x on a gain (Jess, 2026-11-10; was 1.3x)
    SILVER_ROLL = 0.25, // s, the rolling number lands in this long after the last gain
    SILVER_ROLL_MIN = 25; // coins per second, the slowest roll (small gains)

  // ---------- state the page shows (signals) ----------
  const visible = signal(false),
    centreX = signal(0),
    portrait = signal({ dex: 0, shiny: false }),
    expAngle = signal(0),
    hpText = signal(''),
    level = signal(''),
    levelRattle = signal(0), // counts level-ups; each one remounts the number, which replays its rattle
    levelRattling = signal(false), // true for the rattle's length after a level-up
    bonds = signal(0),
    badChips = signal([]), // { key, label, fill, shade, text, timer (0 to 1, or null) }: statuses, then stat drops
    goodChips = signal([]), // stat raises, the team's timed effects, the altar power
    prompt = signal(''), // the Shake Off text, or '' when nothing can be shaken off
    promptTimer = signal(null), // 0 to 1: time left on the status a Shake Off tap would shorten, or null
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
  /** A piece whose RIGHT edge sits at x (from the centre line). */
  const placeRight = (x, y) => ({ right: -x + 'px', bottom: y + 'px' });

  // ---------- shapes ----------
  /** The B2 move button (the kit's moveSlotRow): the B2 grid with its dark squares 50% larger (Jess, 2026-11-10); flat
   *  black for an empty slot. */
  const slotRow = (row, rim) =>
    moveSlotRow(row, SLOT_ART_WIDTH, SLOT_ART_ROWS, rim, rim === EMPTY_RIM ? PALETTE.body : SLOT_GRID);

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

  // ---------- components ----------
  function Portrait() {
    const { dex, shiny } = portrait.value;
    return html`<div
      class="hud-portrait"
      style=${{ ...place(PORTRAIT.centreX - PORTRAIT.size / 2, PORTRAIT.y), '--exp': expAngle.value + 'deg' }}
    >
      <div class="hud-exp-ring"></div>
      <div class="hud-portrait-face">
        ${dex ? html`<img src=${portraitSource(dex, shiny)} data-dex=${dex} alt="" onError=${portraitFallback} />` : null}
      </div>
    </div>`;
  }

  function HeldItem() {
    const held = item.value;
    return html`<div class="hud-item" style=${place(ITEM.x, ITEM.y)}>
        <${ItemSquare} icon=${held ? held.icon : null} artSize=${ITEM.artSize} />
      </div>
      ${held ? html`<div class="hud-text hud-item-name" style=${place(ITEM.x, ITEM.nameY)}>${held.name}</div>` : null}`;
  }

  function LifeMeter() {
    return html`<div class="hud-life" style=${place(LIFE.x, LIFE.y)}><${lifeBar.View} /></div>
      <div class="hud-text hud-hp-text" style=${place(HP_TEXT.x, HP_TEXT.y)}>${hpText}</div>`;
  }

  const CHIP_BAND_WIDTH = CHIP_BANDS.chipsPerLine * CHIP_BANDS.width + (CHIP_BANDS.chipsPerLine - 1) * CHIP_BANDS.gap;
  /** One band: up to 12 chips, filling its lower line first (wrap-reverse), left to right. */
  function ChipBand({ band, chips, y }) {
    return html`<div
      class=${'hud-chips hud-chip-band is-' + band}
      style=${{ ...place(CHIP_BANDS.x, y), width: CHIP_BAND_WIDTH + 'px' }}
    >
      ${chips.map((chip) => html`<${Chip} key=${chip.key} chip=${chip} />`)}
    </div>`;
  }
  function Chips() {
    return html`<${ChipBand} band="bad" chips=${badChips.value} y=${CHIP_BANDS.badY} /><${ChipBand}
        band="good"
        chips=${goodChips.value}
        y=${CHIP_BANDS.goodY}
      />`;
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
      ${
        artWidth && promptTimer.value != null
          ? html`<div
              class="hud-prompt-timer"
              style=${{
                left: PROMPT_TIMER.insetArt * ART_PIXEL + 'px',
                width: (artWidth - 2 * PROMPT_TIMER.insetArt) * ART_PIXEL + 'px',
                bottom: PROMPT_TIMER.bottomArt * ART_PIXEL + 'px',
                height: PROMPT_TIMER.heightArt * ART_PIXEL + 'px',
                transform: 'scaleX(' + promptTimer.value + ')',
              }}
            ></div>`
          : null
      }
      <span class="hud-text hud-prompt-text" ref=${textRef}>${text}</span>
    </div>`;
  }

  /** The Shake Off bar (Jess, 2026-11-11): the status a tap would shorten, from the most time seen since it became the target
   *  down to the shake floor, where the prompt leaves. A stronger status taking over starts a full bar again. */
  let promptTimerKey = null,
    promptTimerPeak = 0;
  function readPromptTimer(player) {
    const target = G.Status.shakeTarget(player);
    if (!target) {
      promptTimerKey = null;
      promptTimer.value = null;
      return;
    }
    if (target.k !== promptTimerKey) {
      promptTimerKey = target.k;
      promptTimerPeak = 0;
    }
    promptTimerPeak = Math.max(promptTimerPeak, target.t);
    const span = promptTimerPeak - target.floor,
      fraction = span > 0 ? Math.max(0, Math.min(1, (target.t - target.floor) / span)) : 0;
    promptTimer.value = Math.round(fraction * 100) / 100;
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
      // a move: its type colour filling the well, the type glyph (assets/icons/types/<Type>_icon.png) at half size, the
      // cooldown as a clock wipe, the cast flash, and the family badge at 2x on the well's bottom right
      wells.push(
        html`<div class="hud-well" style=${{ left: wellCentre(well) - WELL_SIZE / 2 + 'px' }}>
          <div class="hud-well-disc" style=${move ? { background: move.fill } : null}>
            ${
              move
                ? html`<img src=${move.glyph} alt="" />
                    <div
                      class="hud-well-shade"
                      style=${{ '--wipe': Math.round((1 - cooldown.shade) * 360) + 'deg' }}
                    ></div>
                    <div class="hud-well-flash" style=${{ opacity: cooldown.flash }}></div>`
                : null
            }
          </div>
          ${move && move.badge ? html`<img class="hud-well-badge" src=${move.badge} alt="" />` : null}
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
      ${slot.active ? html`<${Cursor} />` : null}
    </div>`;
  }

  function Slots() {
    return slots.value.map((slot, index) => html`<${Slot} key=${slot.key} slot=${slot} index=${index} />`);
  }

  function Level() {
    return html`<div class="hud-text hud-lv-label" style=${placeRight(LEVEL.right, LEVEL.labelY)}>Lv.</div>
      <div
        key=${'lv' + levelRattle.value}
        class=${'hud-lv-number' + (levelRattling.value ? ' is-rattling' : '')}
        style=${placeRight(LEVEL.right, LEVEL.numberY)}
      >
        ${level}
      </div>
      ${
        bonds.value > 0
          ? html`<div class="hud-bond" style=${placeRight(BOND.right, BOND.y)}>
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
    const scale = 1 + SILVER_POP_GROWTH * silverPop.value * silverPop.value;
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
  const readChipsOf = createEffectChipReader(); // statuses (minors too, #78), stat changes and timed effects (#76)
  const silverState = { shown: -1, target: -1, rate: 0, pop: 0, at: 0, time: 0 };
  let lastSlotsKey = '',
    lastChipsKey = '',
    lastItem = undefined,
    lastPortraitKey = '',
    lastLevel = 0,
    lastPlayer = null,
    rattleEndsAt = 0;

  const moveType = (move) => move.type || (G.MoveInfo && G.MoveInfo.type(move.id)) || 'normal';
  const TYPE_GLYPH_PATH = 'assets/icons/types/';
  const glyphOf = (type) => TYPE_GLYPH_PATH + type.charAt(0).toUpperCase() + type.slice(1) + '_icon.png';

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
            fill: typeColours(moveType(move)).base,
            glyph: glyphOf(moveType(move)),
            badge: G.Icons.badge(G.MoveInfo.badge(move.id)),
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
    const read = readChipsOf(player);
    if (read.key !== lastChipsKey) {
      lastChipsKey = read.key;
      badChips.value = read.bad;
      goodChips.value = read.good;
    }
  }

  function readItem(player) {
    const id = player.item || null;
    if (id === lastItem) return;
    lastItem = id;
    const def = id && G.Items.BY[id];
    item.value = def ? { id, name: def.name, icon: def.icon || id } : null;
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
    // level up: the number rattles. A level gained while the panel was hidden (the level-up cards) rattles as it comes
    // back; a new run (a new player) starts quiet.
    const now = performance.now();
    if (player !== lastPlayer) {
      lastPlayer = player;
      lastLevel = player.level;
    } else if (player.level > lastLevel) {
      lastLevel = player.level;
      levelRattle.value = levelRattle.value + 1;
      rattleEndsAt = now + LEVEL_RATTLE_MS;
    }
    levelRattling.value = now < rattleEndsAt;
    level.value = String(player.level);
    bonds.value = player.bonds || 0;
    readChips(player);
    readPromptTimer(player);
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
  // what this panel shows as a chip, so the canvas status list (js/ui/hud.js) leaves it out
  return { ready: true, hasChip: (statusKey) => hasChip(statusKey, true) };
})();
