/* ============ pause-pokemon.js: the pause menu's Pokemon detail panel and team panel (#82, slice 2 #89) ============
 * Spec: docs/PAUSE-MENU.md sections 4 and 5 (mockup assets/ui/In Run Menu Reduced.png). js/ui/pause-menu.js mounts the
 * two components into its right and bottom panels and hands the keys over (Move_Left / Move_Right: previous and next).
 *
 * Detail panel (635 x 1028), the mockup's two-tier bars: the top bar in the first type's colour holds the name, the
 * level box (deeper than the name band, a diagonal step down to it) and the HP bar under the name; the bottom bar in the
 * second type's colour (the first for a single type) has a raised tab on the left with the previous and next arrows.
 * Left column: the portrait with the EXP ring, the held item, then the Run Stats (#91-3: twelve 26 px rows that scroll
 * in the box, Jess 2026-11-12) and Cards Taken (#83) boxes.
 * Right column: the stat hex, then the move list (bonded groups framed together, a type coloured scroll bar). The boxes
 * are the roster card's box with a flat body, rimmed in the first type.
 *
 * Stat hex (Jess, 2026-11-11): the real stats from the game's formula (G.Stats, HP at mainline size) with the species'
 * base stats and this copy's IVs, EVs and nature, as three bands growing out from each other: the first type's colour at
 * 60% = the stats at level 1 (every member starts the run there); white = the growth from level 1 to its level now;
 * yellow = what cards and run effects add (the bonus combat uses: incOf, and the real max HP). The edge is 300, 600 or
 * 1000 (the smallest that holds the highest drawn stat), printed in a break of the outer line between HP and Atk; every
 * value is drawn between 10% and 100% of the radius. Each corner shows the final stat (HP as the game has it) with the
 * yellow "+X%"; hovering it shows the copy's make-up, "Base: N, IV: N, EV: N".
 *
 * Team panel (548 x 160): the six team slots in 3 columns by 2 rows, in slot order, as the run screen's roster cards
 * narrowed to fit (no status chips). A missing member is an empty frame. Clicking a card shows it on the detail panel;
 * the shown one's portrait gets a green stroke and a shimmer. The Pokemon on the field wears the selection cursor.
 *
 * The held item slot is the square only (name and effect in its tooltip); it and the team cards are places a held item
 * can be clicked or dragged to (js/ui/pause-inventory.js does the moves, #90).
 *
 * The game is paused while this shows, so it reads the team when the menu opens, when another Pokemon is picked and
 * after a held item moves, never per frame. It never writes game state (the moves are pause-inventory.js's).
 */
G.PausePokemon = (() => {
  // ---------- the Run Stats box's numbers and rows (#91-3; pure, so the offline harness loads them) ----------
  /** One Pokemon's run, from the run's record (G.RunStats) and the DPS record (G.DpsHistory), at run time `now`. */
  function runStatsNumbers(record, history, slot, now) {
    const counters = G.RunStats.member(record, slot);
    return {
      kills: counters.kills,
      field: G.DpsHistory.fieldSeconds(history, slot),
      damage: G.DpsHistory.totalDamage(history, slot),
      teamDamage: G.DpsHistory.totalDamage(history),
      bestHit: counters.bestHit,
      superDamage: counters.superDamage,
      dotDamage: counters.dotDamage,
      taken: counters.taken,
      healed: counters.healed,
      faints: counters.faints,
      down: G.RunStats.downTime(record, slot, now),
      statuses: counters.statuses,
    };
  }

  /** The box's twelve rows in the 91d order. Zeros always show (RS3), so the box reads the same for every Pokemon. */
  function runStatsRows(numbers) {
    const compact = G.U.compact,
      clock = G.U.mmss;
    const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) + '%' : '--');
    const statuses = G.PauseRunInfo.statusList(numbers.statuses); // Run Info's order (one list)
    const statusTotal = statuses.reduce((sum, status) => sum + status.count, 0);
    const statusTip = statuses.map((status) => status.name + ' ' + status.count).join(', ');
    const hitDamage = numbers.damage - numbers.dotDamage; // RS1: a tick is never super effective
    return [
      { label: 'Kills', value: compact(numbers.kills) },
      { label: 'Field', value: clock(numbers.field) },
      { label: 'Damage', value: compact(numbers.damage) },
      { label: 'Share', value: percent(numbers.damage, numbers.teamDamage) },
      { label: 'Best hit', value: compact(numbers.bestHit) },
      { label: 'Super eff.', value: percent(numbers.superDamage, hitDamage) },
      { label: 'Taken', value: compact(numbers.taken) },
      { label: 'Healed', value: compact(numbers.healed) },
      { label: 'Faints', value: compact(numbers.faints) },
      { label: 'Down', value: clock(numbers.down) },
      { label: 'Statuses', value: compact(statusTotal), tip: statusTip || null }, // P3: per kind on hover
      { label: 'DoT dmg', value: compact(numbers.dotDamage) },
    ];
  }

  const overlay = G.HudOverlay;
  if (!overlay || !overlay.ready) return { ready: false, runStatsNumbers, runStatsRows };
  const { html, signal, hooks, PALETTE, FAINTED_RIM, PixelShape, typeColours, hpBand } = overlay.kit;
  const { IconCanvas, Cursor, RosterCard, rosterBoxGrid, rosterColours, letterRows, rosterFill } = overlay.kit;
  const { createLifeBar, portraitSource, portraitFallback, ItemGrid, ScrollBox } = overlay.kit;
  const inventory = G.PauseInventory && G.PauseInventory.ready ? G.PauseInventory : null; // held item moves (#90)

  // ---------- sizes and places (1080p pixels inside each panel) ----------
  const DETAIL = { width: 635, height: 1028 },
    NAME_BAND = 64, // the top bar's name band
    LEVEL_BOX = { left: 500, depth: 104, stepLeft: 468 }, // the level box drops below the band, a diagonal step down to it
    BOTTOM_BAR = { top: 980, tabTop: 948, tabRight: 170, stepRight: 196 }, // the bottom bar and its raised arrow tab
    LIFE = { left: 10, top: 70, artWidth: 160, labelTop: -6 },
    HP_TEXT = { left: 340, top: 72 },
    COLUMN_LEFT = { x: 16, width: 200 },
    COLUMN_RIGHT = { x: 230, width: 390 },
    PORTRAIT = { top: 124, size: 116 },
    HELD = { top: 256, artSize: 24 },
    RUN_STATS = { top: 44, rowHeight: 26 }, // #91-3: the rows start under the box title
    RUN_STATS_BOX = { top: 320, height: 200 },
    CARDS_BOX = { top: 536, height: 400 },
    HEX_BOX = { top: 124, height: 376 },
    MOVES_BOX = { top: 516, height: 420 },
    BOX_PAD = 16, // inside a box, clear of its rim
    // radius: as big as the box allows with room for the widest labels, a 4 digit stat under "SpA +100%" (Jess,
    // 2026-11-11); pad: the hex uses the box out to its rim
    HEX = { radius: 110, labelGap: 12, pad: 8, bonusLine: 20 }, // bonusLine: the side corners' own +X% line (#98)
    EDGE_LABEL = { charWidth: 10, pad: 10 }, // the edge number's gap in the outer line: 20 px text, a little air
    ARROW = { size: 13, artPixel: 3, top: 960, prevLeft: 30, nextLeft: 98 };
  const TEAM = { columns: 3, cardArtWidth: 84, gap: 9, padLeft: 13, padTop: 12, rowGap: 8 };
  const TEAM_CARD_WIDTH = TEAM.cardArtWidth * 2,
    TEAM_CARD_HEIGHT = 64,
    TEAM_SLOTS = 6,
    TEAM_NAME_ROOM = TEAM_CARD_WIDTH - 66 - 12; // from the name's left to the right rim
  const EMPTY_RIM = { light: PALETTE.checker, base: PALETTE.frame, dark: PALETTE.frame }; // the B2 disabled button
  const BOND_PINK = '#ff8ad8'; // the game's bond colour (the run screen's bonded slots)
  // Clockwise from the top, as the main games' summary: [index into the stat arrays, label, incOf key]
  const HEX_AXES = [
    [0, 'HP', 'hp'],
    [1, 'Atk', 'atk'],
    [2, 'Def', 'def'],
    [5, 'Spe', 'spe'],
    [4, 'SpD', 'spd'],
    [3, 'SpA', 'spa'],
  ];

  // ---------- state ----------
  const shownSlot = signal(0), // the team slot the detail panel shows
    readCount = signal(0), // bumped on each read, so the panels redraw from the team as it is now
    hoveredMove = signal(null); // { lines, top } for the move tooltip, or null
  const life = createLifeBar({ artPixel: 2, artWidth: signal(LIFE.artWidth), labelTop: LIFE.labelTop });

  const team = () => (G.Game && G.Game.roster) || [];
  const memberIn = (slot) => team().find((member) => member.teamSlot === slot) || null;
  const filledSlots = () =>
    team()
      .map((member) => member.teamSlot)
      .sort((first, second) => first - second);
  /** English type name from the type id (G.U.TYPE_NAME is the Spanish source text, and this menu is English only). */
  const typeName = (type) =>
    String(type || 'normal')
      .charAt(0)
      .toUpperCase() + String(type || 'normal').slice(1);
  const typesOf = (member) => (member.mon && member.mon.types) || ['normal'];

  // ---------- the stat hex's numbers ----------
  // HP is drawn at its mainline size (Jess, 2026-11-11): the game doubles every HP (HP_SCALAR, COMBAT-RULES), which would
  // make HP tower over the other five; mainline matches the online calculators and the other stats' scale.
  const mainlineHp = (gameHp) => gameHp / (G.Stats.HP_SCALAR || 1);
  /** The six stats ([HP, Atk, Def, SpA, SpD, Spe]) at `level` from base stats, IVs, EVs and nature (G.Stats), HP mainline. */
  function statsAt(member, level) {
    const base = (member.mon && member.mon.stats) || [0, 0, 0, 0, 0, 0];
    return base.map((baseStat, index) =>
      index === 0
        ? mainlineHp(G.Stats.hpForLevel(baseStat, level, member.statIv(0), member.statEv(0)))
        : G.Stats.statValue(baseStat, level, member.statIv(index), member.statEv(index), member.statNat(index))
    );
  }
  /** { start, now, withRun, bonus }: six numbers each (bonus a fraction, 0.1 = +10%). */
  function hexNumbers(member) {
    const start = statsAt(member, 1),
      now = statsAt(member, member.level),
      maxHp = mainlineHp(Math.round(member.maxHp)); // the real max HP: HP Up cards and flat perks on top
    const bonus = now.map((value, index) => {
      if (index === 0) return value > 0 ? Math.max(0, maxHp / value - 1) : 0;
      const key = HEX_AXES.find(([statIndex]) => statIndex === index)[2];
      return Math.max(0, member.incOf(key));
    });
    const withRun = now.map((value, index) =>
      index === 0 ? Math.max(value, maxHp) : Math.round(value * (1 + bonus[index]))
    );
    return { start, now, withRun, bonus };
  }
  /** The hex's edge (Jess, 2026-11-11): 300 up to a highest drawn stat of 300, 600 up to 600, else 1000 (past 1000 the
   *  values clamp to the rim). */
  const hexEdge = (highest) => (highest <= 300 ? 300 : highest <= 600 ? 600 : 1000);
  const HEX_MIN_FRACTION = 0.1; // every drawn value is at least 10% of the radius, so a level 1 stat is not a dot

  // ---------- small pieces ----------
  /** Text that squeezes sideways to fit `room` px when it is wider (long species names). origin: the edge it holds. */
  function FitText({ text, room, className, style, origin = '0 50%' }) {
    const ref = hooks.useRef(null);
    hooks.useLayoutEffect(() => {
      const element = ref.current;
      if (!element) return;
      element.style.transform = '';
      const width = element.scrollWidth;
      if (width > room) element.style.transform = `scaleX(${room / width})`;
    });
    return html`<span
      ref=${ref}
      class=${'pm-fit' + (className ? ' ' + className : '')}
      style=${{ ...style, transformOrigin: origin }}
      >${text}</span
    >`;
  }

  /** A box: the roster card's box at any size with a flat body, rimmed in `rim`; its contents go inside. */
  function Box({ left, top, width, height, rim, className, children }) {
    return html`<div
      class=${'pm-box' + (className ? ' ' + className : '')}
      style=${{ left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' }}
    >
      <${PixelShape}
        artWidth=${width / 2}
        artRows=${height / 2}
        artPixel=${2}
        paintRow=${letterRows(rosterBoxGrid(width / 2, height / 2, false), rosterColours(rim, PALETTE.body))}
      />
      ${children}
    </div>`;
  }

  /** A pixel arrow (after b2-lower AC8 to AD8): a filled triangle with an outline, pointing left or right. */
  function arrowRow(row, pointsRight) {
    const size = ARROW.size,
      middle = (size - 1) / 2,
      reach = middle - Math.abs(row - middle), // 0 at the top and bottom rows, widest in the middle
      length = Math.round(reach * 1.3) + 1;
    const start = pointsRight ? 0 : size - length;
    if (length <= 1) return [[start, 1, PALETTE.outline]];
    return [
      [start, 1, PALETTE.outline],
      [start + 1, length - 2, '#ffffff'],
      [start + length - 1, 1, PALETTE.outline],
    ];
  }
  function Arrow({ direction, left }) {
    const pointsRight = direction > 0;
    return html`<button
      type="button"
      tabindex="-1"
      class="pm-arrow"
      data-step=${pointsRight ? 'next' : 'prev'}
      style=${{ left: left + 'px', top: ARROW.top + 'px' }}
      onMouseDown=${(event) => event.preventDefault()}
      onClick=${() => step(direction)}
    >
      <${PixelShape}
        artWidth=${ARROW.size}
        artRows=${ARROW.size}
        artPixel=${ARROW.artPixel}
        paintRow=${(row) => arrowRow(row, pointsRight)}
      />
    </button>`;
  }

  // ---------- the detail panel ----------
  const topBarPoints = [
    [0, 0],
    [DETAIL.width, 0],
    [DETAIL.width, LEVEL_BOX.depth],
    [LEVEL_BOX.left, LEVEL_BOX.depth],
    [LEVEL_BOX.stepLeft, NAME_BAND],
    [0, NAME_BAND],
  ];
  const bottomBarPoints = [
    [0, BOTTOM_BAR.tabTop],
    [BOTTOM_BAR.tabRight, BOTTOM_BAR.tabTop],
    [BOTTOM_BAR.stepRight, BOTTOM_BAR.top],
    [DETAIL.width, BOTTOM_BAR.top],
    [DETAIL.width, DETAIL.height],
    [0, DETAIL.height],
  ];
  const pointList = (points) => points.map(([x, y]) => x + ',' + y).join(' ');

  function Bars({ firstType, secondType }) {
    const top = typeColours(firstType),
      bottom = typeColours(secondType);
    return html`<svg class="pm-detail-bars" width=${DETAIL.width} height=${DETAIL.height}>
      <polygon class="pm-detail-top" data-type=${firstType} points=${pointList(topBarPoints)} fill=${top.base} />
      <polygon
        class="pm-detail-bottom"
        data-type=${secondType}
        points=${pointList(bottomBarPoints)}
        fill=${bottom.base}
      />
    </svg>`;
  }

  function Hex({ member }) {
    const numbers = hexNumbers(member),
      rim = typeColours(typesOf(member)[0]);
    const edge = hexEdge(Math.max(...numbers.withRun));
    const width = COLUMN_RIGHT.width - 2 * HEX.pad,
      height = HEX_BOX.height - 2 * HEX.pad,
      centreX = width / 2,
      centreY = height / 2 + 4;
    const corner = (axis, fraction) => {
      const angle = -Math.PI / 2 + (axis * Math.PI) / 3;
      return [centreX + Math.cos(angle) * HEX.radius * fraction, centreY + Math.sin(angle) * HEX.radius * fraction];
    };
    const shapePoints = (values) =>
      HEX_AXES.map(([statIndex], axis) =>
        corner(axis, Math.max(HEX_MIN_FRACTION, Math.min(1, values[statIndex] / edge))).map((value) => value.toFixed(1))
      );
    const shape = (values) =>
      shapePoints(values)
        .map((point) => point.join(','))
        .join(' ');
    const outline = (values) =>
      'M' +
      shapePoints(values)
        .map((point) => point.join(' '))
        .join(' L') +
      ' Z';
    /** The band between two shapes: only the growth, so the layers never mix their colours. */
    const band = (outer, inner) => outline(outer) + ' ' + outline(inner);
    const ring = (fraction) => HEX_AXES.map((axisEntry, axis) => corner(axis, fraction).join(',')).join(' ');
    const anyBonus = numbers.bonus.some((value) => value > 0);
    const labels = HEX_AXES.map(([statIndex, label], axis) => {
      const [x, y] = corner(axis, 1),
        side = Math.abs(x - centreX) < 4 ? 'middle' : x > centreX ? 'right' : 'left';
      const percent = Math.round(numbers.bonus[statIndex] * 100),
        bonusBelow = side !== 'middle' && percent > 0; // #98: the side corners carry the +X% on a line of its own
      // the side corners centre their block on the corner: name and number, plus the +X% line when there is one
      const sideTop = y - 22 - (bonusBelow ? HEX.bonusLine / 2 : 0);
      const style =
        side === 'middle'
          ? { left: x + 'px', top: (y < centreY ? y - HEX.labelGap - 44 : y + HEX.labelGap) + 'px' }
          : side === 'right'
            ? { left: x + HEX.labelGap + 'px', top: sideTop + 'px' }
            : { right: width - x + HEX.labelGap + 'px', top: sideTop + 'px' };
      // the room a value line has before it squeezes: the whole width in the middle, else out to the box's edge
      const room = side === 'middle' ? width : side === 'right' ? width - x - HEX.labelGap : x - HEX.labelGap;
      const sideOrigin = side === 'left' ? '100% 50%' : side === 'middle' ? '50% 50%' : '0 50%';
      const baseStat = ((member.mon && member.mon.stats) || [])[statIndex] || 0;
      // The corner shows the final stat (Jess, 2026-11-11): HP as the game has it (after HP_SCALAR, the HP bar's number)
      // though the shape draws it at mainline size; the others with nature, level and run effects. The yellow "+X%"
      // rides on the name line at HP and Spe, and sits under the number on the side corners (#98, Jess 2026-11-11).
      // Hover: the copy's make-up.
      const finalStat = statIndex === 0 ? Math.round(member.maxHp) : Math.round(numbers.withRun[statIndex]);
      return html`<div key=${label} class=${'pm-hex-label is-' + side} data-stat=${label} style=${style}>
        <div class="hud-text pm-hex-name">
          ${label}${percent > 0 && !bonusBelow ? html`<span class="pm-hex-bonus"> +${percent}%</span>` : null}
        </div>
        <${FitText} text=${String(finalStat)} room=${room} className="hud-text pm-hex-value" origin=${sideOrigin} />
        ${
          bonusBelow
            ? html`<div class="pm-hex-bonus-line">
                <${FitText}
                  text=${'+' + percent + '%'}
                  room=${room}
                  className="hud-text pm-hex-bonus"
                  origin=${sideOrigin}
                />
              </div>`
            : null
        }
        <div class="hud-text pm-hex-tip">
          ${'Base: ' + baseStat + ', IV: ' + member.statIv(statIndex) + ', EV: ' + member.statEv(statIndex)}
        </div>
      </div>`;
    });
    // The edge's number sits in a break of the outer line between HP and Atk, turned to run along it (Jess, 2026-11-11).
    const [hpX, hpY] = corner(0, 1),
      [atkX, atkY] = corner(1, 1);
    const edgeText = String(edge),
      gapHalf = (edgeText.length * EDGE_LABEL.charWidth + EDGE_LABEL.pad) / 2 / HEX.radius; // as a fraction of the side
    const along = (fraction) => [hpX + (atkX - hpX) * fraction, hpY + (atkY - hpY) * fraction];
    const edgeLine = [along(0.5 + gapHalf), ...[1, 2, 3, 4, 5, 0].map((axis) => corner(axis, 1)), along(0.5 - gapHalf)]
      .map((point) => point.map((value) => value.toFixed(1)).join(' '))
      .join(' L');
    const [labelX, labelY] = along(0.5),
      edgeAngle = (Math.atan2(atkY - hpY, atkX - hpX) * 180) / Math.PI;
    return html`<div
      class="pm-hex"
      data-edge=${edge}
      data-radius=${HEX.radius}
      style=${{ left: HEX.pad + 'px', top: HEX.pad + 'px', width: width + 'px', height: height + 'px' }}
    >
      <svg width=${width} height=${height}>
        ${[0.25, 0.5, 0.75].map((fraction) => html`<polygon class="pm-hex-ring" points=${ring(fraction)} />`)}
        <path class="pm-hex-ring is-edge" d=${'M' + edgeLine} />
        ${HEX_AXES.map((axisEntry, axis) => {
          const [x, y] = corner(axis, 1);
          return html`<line class="pm-hex-spoke" x1=${centreX} y1=${centreY} x2=${x} y2=${y} />`;
        })}
        <polygon class="pm-hex-start" points=${shape(numbers.start)} style=${{ fill: rim.base, stroke: rim.light }} />
        <path class="pm-hex-now" d=${band(numbers.now, numbers.start)} />
        ${anyBonus ? html`<path class="pm-hex-run" d=${band(numbers.withRun, numbers.now)} />` : null}
      </svg>
      <div
        class="hud-text pm-hex-edge"
        style=${{
          left: labelX.toFixed(1) + 'px',
          top: labelY.toFixed(1) + 'px',
          transform: `translate(-50%, -50%) rotate(${edgeAngle.toFixed(1)}deg)`,
        }}
      >
        ${edgeText}
      </div>
      ${labels}
    </div>`;
  }

  /** The detail panel's hover tooltip (MoveTooltip), level with the hovered row; nothing with no lines. The move list
   *  and the Run Stats box share it, since a tooltip inside a scrolling box would be clipped by it. */
  function showTip(event, name, lines) {
    const panel = event.currentTarget.closest('.pm-detail');
    const rowBox = event.currentTarget.getBoundingClientRect(),
      panelBox = panel.getBoundingClientRect(),
      scale = panelBox.height / DETAIL.height;
    hoveredMove.value = lines.length ? { name, lines, top: (rowBox.top - panelBox.top) / scale } : null;
  }

  /** The move list: every move grouped by bond, each with its summary line; hover shows the full numbers. */
  function MoveList({ member, rim }) {
    const groups = member.slots.length ? member.slots : member.moves.map((move) => [move]);
    const width = COLUMN_RIGHT.width - 2 * BOX_PAD - 14,
      height = MOVES_BOX.height - 2 * BOX_PAD;
    const showDetail = (move, event) => {
      const lines = G.Sheet.detailOf(member, move);
      showTip(event, move.name, [lines.raw, lines.ail, lines.hit].filter(Boolean));
    };
    const rows = groups.map((group, groupIndex) => {
      const bonded = group.length > 1;
      return html`<div key=${groupIndex} class=${'pm-move-group' + (bonded ? ' is-bonded' : '')}>
        ${bonded ? html`<div class="hud-text pm-bond-caption" style=${{ color: BOND_PINK }}>Cast together</div>` : null}
        ${group.map(
          (move) =>
            html`<div
              key=${move.id}
              class="pm-move"
              data-move=${move.id}
              onMouseEnter=${(event) => showDetail(move, event)}
              onMouseLeave=${() => (hoveredMove.value = null)}
            >
              <${IconCanvas} icon=${'move:' + move.id} size=${32} className="pm-move-icon" />
              <div class="pm-move-text">
                <div class="pm-move-head">
                  <span class="hud-text pm-move-name">${move.name}</span>
                  <span
                    class="hud-text pm-type-pill"
                    style=${{ background: G.U.TYPE_COLOR[move.type], borderColor: G.U.TYPE_COLOR_DARK[move.type] }}
                    >${typeName(move.type)}</span
                  >
                </div>
                <div class="hud-text pm-move-summary">${G.Sheet.summaryOf(member, move)}</div>
              </div>
            </div>`
        )}
      </div>`;
    });
    return html`<${ScrollBox}
      box=${{ left: BOX_PAD, top: BOX_PAD, width, height }}
      trackRight=${BOX_PAD}
      colours=${{ track: rim.dark, thumb: rim.base, thumbRim: rim.light }}
      resetOn=${[member, readCount.value]}
      onScroll=${() => (hoveredMove.value = null)}
    >
      ${rows.length ? rows : html`<div class="hud-text pm-empty-note">No moves yet.</div>`}
    </${ScrollBox}>`;
  }

  /** The Run Stats box (#91-3): the shown Pokemon's run, read when the panel redraws (open, a Pokemon picked, an item
   *  moved), never per frame. Twelve 26 px rows scroll in the box (Jess, 2026-11-12); Statuses lists kinds on hover. */
  function RunStatsBox({ member, rim }) {
    const game = G.Game,
      history = member.team && member.team.dpsHistory;
    const rows = runStatsRows(runStatsNumbers(game.runStats, history, member.teamSlot, game.st.time));
    const width = COLUMN_LEFT.width - 2 * BOX_PAD - 14,
      height = RUN_STATS_BOX.height - RUN_STATS.top - BOX_PAD;
    return html`<div class="hud-text pm-box-title">Run Stats</div>
      <${ScrollBox}
        box=${{ left: BOX_PAD, top: RUN_STATS.top, width, height }}
        trackRight=${BOX_PAD}
        colours=${{ track: rim.dark, thumb: rim.base, thumbRim: rim.light }}
        resetOn=${[member, readCount.value]}
        onScroll=${() => (hoveredMove.value = null)}
      >
        ${rows.map(
          (row) =>
            html`<div
              key=${row.label}
              class="pm-stats-row"
              style=${{ height: RUN_STATS.rowHeight + 'px', lineHeight: RUN_STATS.rowHeight + 'px' }}
              onMouseEnter=${row.tip ? (event) => showTip(event, row.label, [row.tip]) : null}
              onMouseLeave=${row.tip ? () => (hoveredMove.value = null) : null}
            >
              <span class="hud-text pm-stats-label">${row.label}</span>
              <span class="hud-text pm-stats-value">${row.value}</span>
            </div>`
        )}
      </${ScrollBox}>`;
  }

  function MoveTooltip() {
    const hovered = hoveredMove.value;
    if (!hovered) return null;
    return html`<div class="pm-move-tooltip" style=${{ top: hovered.top + 'px' }}>
      <div class="hud-text pm-tooltip-name">${hovered.name}</div>
      ${hovered.lines.map((line, index) => html`<div key=${index} class="hud-text pm-tooltip-line">${line}</div>`)}
    </div>`;
  }

  /** The held item slot (#90): the square only, its name and effect in the tooltip, a place items can be moved to and
   *  from (js/ui/pause-inventory.js). */
  function heldSlot(member, held) {
    const place = 'held:' + member.teamSlot,
      lifted = inventory && inventory.isCarried(place),
      carrying = inventory && inventory.isCarrying();
    return {
      key: 'held',
      icon: held ? held.icon || member.item : null,
      tip: held && !carrying ? { name: held.name, desc: held.desc } : null,
      className: 'pm-held-slot' + (lifted ? ' is-lifted' : ''),
      attrs: inventory ? inventory.placeAttributes(place) : null,
    };
  }

  function DetailPanel() {
    readCount.value; // redraw on each read
    if (inventory) inventory.carriedSignal.value; // and when an item is picked up or put down
    const member = memberIn(shownSlot.value);
    if (!member) return null;
    const [firstType, secondType = firstType] = typesOf(member);
    const rim = typeColours(firstType);
    const active = G.Game.player;
    const expFraction = active && active.xpNext > 0 ? Math.max(0, Math.min(1, active.xp / active.xpNext)) : 0; // run XP is shared
    const held = member.item && G.Items.BY[member.item];
    const hp = Math.ceil(Math.max(0, member.hp)),
      maxHp = Math.round(member.maxHp);
    const box = (column, place, extra) =>
      html`<${Box}
        left=${column.x}
        top=${place.top}
        width=${column.width}
        height=${place.height}
        rim=${rim}
        className=${extra.className}
        >${extra.children}<//
      >`;
    return html`<div class="pm-detail" data-slot=${member.teamSlot} data-dex=${member.dex}>
      <${Bars} firstType=${firstType} secondType=${secondType} />
      <${FitText} text=${member.mon.name} room=${LEVEL_BOX.stepLeft - 28} className="pm-detail-name" />
      <div class="hud-text pm-detail-lv-label">Lv.</div>
      <div class="hud-lv-number pm-detail-lv">${member.level}</div>
      <div class="pm-detail-life" style=${{ left: LIFE.left + 'px', top: LIFE.top + 'px' }}><${life.View} /></div>
      <div
        class="hud-text pm-detail-hp"
        data-hp=${hp}
        data-max-hp=${maxHp}
        style=${{ left: HP_TEXT.left + 'px', top: HP_TEXT.top + 'px' }}
      >
        ${hp} / ${maxHp}
      </div>
      ${member.dead ? html`<div class="hud-text pm-detail-fainted">Fainted</div>` : null}
      <div
        class="hud-portrait pm-detail-portrait"
        style=${{
          left: COLUMN_LEFT.x + (COLUMN_LEFT.width - PORTRAIT.size) / 2 + 'px',
          top: PORTRAIT.top + 'px',
          '--exp': Math.round(expFraction * 360) + 'deg',
        }}
      >
        <div class="hud-exp-ring"></div>
        <div class="hud-portrait-face">
          <img
            src=${portraitSource(member.dex, member.shiny)}
            data-dex=${member.dex}
            alt=""
            onError=${portraitFallback}
          />
        </div>
      </div>
      <div
        class="pm-detail-held"
        style=${{ left: COLUMN_LEFT.x + (COLUMN_LEFT.width - HELD.artSize * 2) / 2 + 'px', top: HELD.top + 'px' }}
      >
        <${ItemGrid} slots=${[heldSlot(member, held)]} artSize=${HELD.artSize} />
      </div>
      ${box(COLUMN_LEFT, RUN_STATS_BOX, {
        className: 'pm-box-run-stats',
        children: html`<${RunStatsBox} member=${member} rim=${rim} />`,
      })}
      ${box(COLUMN_LEFT, CARDS_BOX, {
        className: 'pm-box-cards',
        children: html`<div class="hud-text pm-box-title">Cards Taken</div>`,
      })}
      ${box(COLUMN_RIGHT, HEX_BOX, { className: 'pm-box-hex', children: html`<${Hex} member=${member} />` })}
      ${box(COLUMN_RIGHT, MOVES_BOX, {
        className: 'pm-box-moves',
        children: html`<${MoveList} member=${member} rim=${rim} />`,
      })}
      <${MoveTooltip} />
      <${Arrow} direction=${-1} left=${ARROW.prevLeft} />
      <${Arrow} direction=${1} left=${ARROW.nextLeft} />
    </div>`;
  }

  // ---------- the team panel ----------
  function TeamCard({ slot }) {
    const member = memberIn(slot),
      column = slot % TEAM.columns,
      row = Math.floor(slot / TEAM.columns);
    const style = {
      left: TEAM.padLeft + column * (TEAM_CARD_WIDTH + TEAM.gap) + 'px',
      top: TEAM.padTop + row * (TEAM_CARD_HEIGHT + TEAM.rowGap) + 'px',
    };
    if (!member)
      return html`<div class="pm-team-empty" data-slot=${slot} style=${style}>
        <${PixelShape}
          artWidth=${TEAM.cardArtWidth}
          artRows=${32}
          artPixel=${2}
          paintRow=${letterRows(rosterBoxGrid(TEAM.cardArtWidth, 32, false), rosterColours(EMPTY_RIM, PALETTE.body))}
        />
      </div>`;
    const fainted = !!member.dead,
      fraction = member.maxHp > 0 ? Math.max(0, Math.min(1, member.hp / member.maxHp)) : 0,
      shown = slot === shownSlot.value;
    return html`<${RosterCard}
      artWidth=${TEAM.cardArtWidth}
      rim=${fainted ? FAINTED_RIM : typeColours(typesOf(member)[0])}
      fill=${rosterFill(member.hp > 0 ? fraction : 0, fainted, TEAM.cardArtWidth)}
      band=${hpBand(fraction)}
      dex=${member.dex}
      shiny=${!!member.shiny}
      name=${html`<${FitText} text=${member.mon.name} room=${TEAM_NAME_ROOM} />`}
      fainted=${fainted}
      className=${'pm-team-card' + (shown ? ' is-shown' : '')}
      faceClass=${shown ? 'pm-face-shown' : ''}
      style=${style}
      onClick=${() => select(slot)}
      attrs=${inventory ? { 'data-drop': 'team:' + slot } : null}
    >
      <span class="hud-text hud-roster-key">${G.Input.keyLabel('swap_' + (slot + 1)) || String(slot + 1)}</span>
      ${member === G.Game.player && !fainted ? html`<${Cursor} />` : null}
    <//>`;
  }

  function TeamPanel() {
    readCount.value;
    const cards = [];
    for (let slot = 0; slot < TEAM_SLOTS; slot++) cards.push(html`<${TeamCard} key=${slot} slot=${slot} />`);
    return html`<div class="pm-team" data-shown=${shownSlot.value}>${cards}</div>`;
  }

  // ---------- reading and picking ----------
  function refreshLife() {
    const member = memberIn(shownSlot.value);
    if (member) life.update(member.hp, member.maxHp, member.dead, member);
  }
  /** The menu opened: show the Pokemon on the field. */
  function read() {
    const active = G.Game && G.Game.player;
    const slots = filledSlots();
    shownSlot.value = active && active.teamSlot != null ? active.teamSlot : slots.length ? slots[0] : 0;
    hoveredMove.value = null;
    life.reset();
    refreshLife();
    readCount.value = readCount.value + 1;
  }
  function select(slot) {
    if (!memberIn(slot) || slot === shownSlot.value) return;
    shownSlot.value = slot;
    hoveredMove.value = null;
    refreshLife();
    G.Audio.sfx('select');
  }
  /** Previous (-1) or next (+1) Pokemon, wrapping, skipping empty slots. */
  function step(direction) {
    const slots = filledSlots();
    if (slots.length < 2) return;
    const here = Math.max(0, slots.indexOf(shownSlot.value));
    select(slots[(here + direction + slots.length) % slots.length]);
  }

  /** Redraw from the team as it is now (a held item moved, js/ui/pause-inventory.js). */
  function refresh() {
    readCount.value = readCount.value + 1;
  }

  const shown = () => shownSlot.value;
  const runStats = { runStatsNumbers, runStatsRows };
  const panels = { ready: true, DetailPanel, TeamPanel, read, refresh, step, select, shownSlot: shown };
  return Object.assign(panels, runStats);
})();
