/* ============ hud-kit-chips.js: the HUD kit's status and effect chips (G.HudKitChips) ============
 * Part of the HUD kit (js/ui/hud-kit.js has the overview); it reads only G.HudKit. Panels and screens take these
 * from G.HudOverlay.kit. Split out of js/ui/hud-overlay.js on 2026-11-14 (structural review F1); the code is
 * unchanged.
 */
G.HudKitChips = (() => {
  const coreKit = G.HudKit;
  if (!coreKit.ready) return { ready: false };
  const { html, PALETTE, typeColours, PixelShape } = coreKit;

  // ---------- status chips (HUD-STYLE "Status chips"): the major statuses plus poison, bad poison and burn, solid; ----------
  // the minor ones hollow (a dark body inside the coloured rim, coloured text), in the character panel only (#78)
  const MINOR_CHIP_BODY = '#101010';
  const CHIP_STYLES = {
    sleep: { label: 'SLP', fill: '#848484', shade: '#4a4a4a' },
    poison: { label: 'PSN', fill: '#d631de', shade: '#6b2942' },
    toxic: { label: 'PSN', fill: '#d631de', shade: '#391042' },
    burn: { label: 'BRN', fill: '#e75a4a', shade: '#b50000' },
    freeze: { label: 'FRZ', fill: '#218cf7', shade: '#005a8c' },
    paralysis: { label: 'PAR', fill: '#efad00', shade: '#ad6b00' },
    // minors: the rim and text take each animation's own colour (assets/status/)
    confusion: { label: 'CNF', fill: MINOR_CHIP_BODY, shade: '#d8b000', text: '#d8b000', minor: true },
    daze: { label: 'DZE', fill: MINOR_CHIP_BODY, shade: '#1f9fe7', text: '#1f9fe7', minor: true },
    drowsy: { label: 'DRW', fill: MINOR_CHIP_BODY, shade: '#e73963', text: '#e73963', minor: true },
    trap: { label: 'TRP', fill: MINOR_CHIP_BODY, shade: '#adb5bd', text: '#adb5bd', minor: true },
  };
  /** Does this status get a chip? Minor ones only where the caller shows them (the character panel). */
  const hasChip = (statusKey, includeMinors = false) =>
    !!CHIP_STYLES[statusKey] && (includeMinors || !CHIP_STYLES[statusKey].minor);
  // Chip outline: the B2 capsule buttons (b2-lower Y17 to Z17), stepped corners at the rip's 12 rows. Each entry is how
  // many art pixels that row's edge sits in from the chip's sides. The shade rim is 2 art pixels thick (Jess, 2026-11-10:
  // the shade border made thicker, in place of the rip's dark outline); the fill is the outline shrunk by the rim.
  const CHIP_ART_PIXEL = 2,
    CHIP_WIDTH = 70,
    CHIP_EDGE_INSETS = [2, 2, 1, 1, 0, 0, 0, 0, 1, 1, 2, 2],
    CHIP_RIM_ART = 2,
    CHIP_ART_WIDTH = CHIP_WIDTH / CHIP_ART_PIXEL,
    CHIP_ART_ROWS = CHIP_EDGE_INSETS.length;
  // Per row: the fill's inset from each side (a pixel is fill when every pixel within the rim's reach is inside the
  // outline), or null for a row that is all rim.
  const CHIP_FILL_INSETS = CHIP_EDGE_INSETS.map((_, row) => {
    if (row < CHIP_RIM_ART || row >= CHIP_ART_ROWS - CHIP_RIM_ART) return null;
    let deepest = 0;
    for (let near = row - CHIP_RIM_ART; near <= row + CHIP_RIM_ART; near++)
      deepest = Math.max(deepest, CHIP_EDGE_INSETS[near]);
    return deepest + CHIP_RIM_ART;
  });
  const chipShapeRows = (fill, shade) => (row) => {
    const edge = CHIP_EDGE_INSETS[row],
      inner = CHIP_FILL_INSETS[row];
    if (inner == null) return [[edge, CHIP_ART_WIDTH - 2 * edge, shade]];
    return [
      [edge, inner - edge, shade],
      [inner, CHIP_ART_WIDTH - 2 * inner, fill],
      [CHIP_ART_WIDTH - inner, inner - edge, shade],
    ];
  };
  // The sliding glow stays on the fill: clipped to the fill's stepped outline, in screen pixels.
  const CHIP_FILL_CLIP = (() => {
    const rows = CHIP_FILL_INSETS.map((inset, row) => ({ inset, row })).filter((entry) => entry.inset != null),
      leftSide = [],
      rightSide = [];
    for (const { inset, row } of rows) {
      const top = row * CHIP_ART_PIXEL,
        bottom = (row + 1) * CHIP_ART_PIXEL,
        left = inset * CHIP_ART_PIXEL,
        right = CHIP_WIDTH - inset * CHIP_ART_PIXEL;
      leftSide.push(left + 'px ' + top + 'px', left + 'px ' + bottom + 'px');
      rightSide.unshift(right + 'px ' + top + 'px', right + 'px ' + bottom + 'px');
    }
    return 'polygon(' + leftSide.concat(rightSide).join(', ') + ')';
  })();
  // The timer bar runs along the lowest fill row, inside the cut corners.
  const CHIP_TIMER_PLACE = (() => {
    const lowestRow = CHIP_ART_ROWS - CHIP_RIM_ART - 1,
      inset = CHIP_FILL_INSETS[lowestRow] * CHIP_ART_PIXEL;
    return {
      left: inset + 'px',
      width: CHIP_WIDTH - 2 * inset + 'px',
      bottom: CHIP_RIM_ART * CHIP_ART_PIXEL + 'px',
    };
  })();

  /** One chip: { key, label, fill, shade, text (a minor's text colour, or null), timer (0 to 1, or null) }. */
  function Chip({ chip }) {
    return html`<div class="hud-chip">
      <${PixelShape}
        artWidth=${CHIP_ART_WIDTH}
        artRows=${CHIP_ART_ROWS}
        artPixel=${CHIP_ART_PIXEL}
        paintRow=${chipShapeRows(chip.fill, chip.shade)}
        className="hud-chip-shape"
      />
      <span class="hud-text" style=${chip.text ? { color: chip.text } : null}>${chip.label}</span>
      <div class="hud-chip-glow" style=${{ clipPath: CHIP_FILL_CLIP }}></div>
      ${
        chip.timer != null
          ? html`<div
              class="hud-chip-timer"
              style=${{ ...CHIP_TIMER_PLACE, transform: `scaleX(${chip.timer})` }}
            ></div>`
          : null
      }
    </div>`;
  }

  /**
   * Reads one Pokemon's chips each frame. Each reader remembers the time each status started with (the highest seen since
   * it appeared), so the timer bar runs from full to empty. read(entity) returns { chips, key }; key changes only when
   * what the chips show changes (timers rounded to the bar's 35 art pixels).
   */
  function createChipReader(includeMinors = false) {
    const statusPeak = {};
    return function read(entity) {
      // G.Status.list puts the major first and the minors after it, so majors sit at the left
      const list = G.Status.list(entity).filter((status) => hasChip(status.k, includeMinors));
      for (const key in statusPeak) if (!list.some((status) => status.k === key)) delete statusPeak[key];
      const chips = list.map((status) => {
        if (status.t != null) statusPeak[status.k] = Math.max(statusPeak[status.k] || 0, status.t);
        const style = CHIP_STYLES[status.k];
        const timer =
          status.t != null && statusPeak[status.k] > 0
            ? Math.max(0, Math.min(1, status.t / statusPeak[status.k]))
            : null;
        return {
          key: status.k,
          label: style.label,
          fill: style.fill,
          shade: style.shade,
          text: style.text || null,
          timer: timer == null ? null : Math.round(timer * CHIP_ART_WIDTH) / CHIP_ART_WIDTH,
        };
      });
      return { chips, key: chips.map((chip) => chip.key + ':' + chip.timer).join('|') };
    };
  }

  // ---------- effect chips (#76, HUD-STYLE "Effect chips: good and bad bands"): statuses and stat drops in the bad ----------
  // band, stat raises, the team's timed effects and the altar power in the good band. All solid; tags are 3 letters.
  // Stat chips: UI-PALETTES "Pokemon Stats" Base and Dark, the colours of the #78 stat effects on the sprite.
  const STAT_CHIP_STYLES = {
    atk: { label: 'ATK', fill: '#EFCC18', shade: '#9B8510' },
    def: { label: 'DEF', fill: '#E86412', shade: '#97410C' },
    spa: { label: 'SPA', fill: '#14C3F1', shade: '#0D7F9D' },
    spd: { label: 'SPD', fill: '#4A6ADF', shade: '#304591' },
    spe: { label: 'SPE', fill: '#D51DAD', shade: '#8B1370' },
  };
  /** A bright colour's shade at about 55% of it (HUD-STYLE "Ramps for new colours"). */
  function rampedShade(brightHex) {
    const value = parseInt(brightHex.slice(1), 16);
    const channel = (shift) =>
      Math.round(((value >> shift) & 255) * 0.55)
        .toString(16)
        .padStart(2, '0');
    return '#' + channel(16) + channel(8) + channel(0);
  }
  const rampedStyle = (label, fill) => ({ label, fill, shade: rampedShade(fill) });
  // The team store's timed keys that are not stat stages, in the good band's order (the berries by their names)
  const TEAM_EFFECT_STYLES = {
    regen: rampedStyle('REG', '#5fe08a'),
    pct_def: { ...STAT_CHIP_STYLES.def, label: 'KEE' },
    pct_spd: { ...STAT_CHIP_STYLES.spd, label: 'MAR' },
    crit: rampedStyle('LAN', '#ffb347'),
    drop: rampedStyle('PIN', '#ffd23f'),
  };
  const ALTAR_POWER_TAGS = { dmg: 'FRY', spd: 'THN', mag: 'MAG', cd: 'HST' };
  const GUARD_KEY_PREFIX = 'guard_';
  let guardTagOfType = null; // type -> its guard berry's tag, built from G.Grounds.GUARD on first use
  function guardTag(type) {
    if (!guardTagOfType) {
      guardTagOfType = {};
      for (const berry in G.Grounds.GUARD) guardTagOfType[G.Grounds.GUARD[berry]] = berry.slice(0, 3).toUpperCase();
    }
    return guardTagOfType[type] || type.slice(0, 3).toUpperCase();
  }
  const EFFECT_BAND_CAPACITY = 12; // two lines of 6; past it the last slot reads "+N"
  const OVERFLOW_STYLE = { fill: PALETTE.slate, shade: PALETTE.frame };

  /** A band of chips that fits its 12 slots: when more are live, the last slot counts the ones left out. */
  function fitBand(chips) {
    if (chips.length <= EFFECT_BAND_CAPACITY) return chips;
    const shown = chips.slice(0, EFFECT_BAND_CAPACITY - 1);
    const hiddenCount = chips.length - shown.length;
    shown.push({ key: 'overflow', label: '+' + hiddenCount, ...OVERFLOW_STYLE, text: null, timer: null });
    return shown;
  }

  /**
   * Reads the active Pokemon's effect chips each frame: read(entity) returns { bad, good, key }. bad holds the status
   * chips (majors, then minors) and then the stats below 0; good holds the stats above 0, REG, the berries (Kee, Maranga,
   * Lansat, Pinap, then each type guard in the order picked up) and the altar power. A stat's chip is its net stage (own
   * plus team); its timer is the longest time left among the changes pushing it that way. Timers run against the most
   * time seen since the chip appeared, as the status chips do.
   */
  function createEffectChipReader() {
    const readStatusChips = createChipReader(true);
    const timePeak = {};
    return function read(entity) {
      const seenKeys = new Set();
      const timerFraction = (key, timeLeft) => {
        seenKeys.add(key);
        if (!(timeLeft > 0)) return null;
        timePeak[key] = Math.max(timePeak[key] || 0, timeLeft);
        return Math.round(Math.min(1, timeLeft / timePeak[key]) * CHIP_ART_WIDTH) / CHIP_ART_WIDTH;
      };
      const bad = readStatusChips(entity).chips.slice(),
        good = [],
        teamStore = entity.stgTeam;
      for (const stat of G.Stages.STATS) {
        const stage = G.Stages.stage(entity, stat);
        if (!stage) continue;
        const direction = Math.sign(stage);
        let timeLeft = G.Stages.remaining(entity, stat, direction);
        const teamTimer = direction > 0 && teamStore ? G.Stages.teamTimer(teamStore, stat) : null;
        if (teamTimer) timeLeft = Math.max(timeLeft, teamTimer.t);
        const key = 'stat_' + stat + (direction > 0 ? '_up' : '_down');
        (direction > 0 ? good : bad).push({
          key,
          ...STAT_CHIP_STYLES[stat],
          text: null,
          timer: timerFraction(key, timeLeft),
        });
      }
      if (teamStore) {
        for (const effectKey in TEAM_EFFECT_STYLES) {
          if (!G.Stages.teamLive(teamStore, effectKey)) continue;
          const teamTimer = G.Stages.teamTimer(teamStore, effectKey);
          good.push({
            key: effectKey,
            ...TEAM_EFFECT_STYLES[effectKey],
            text: null,
            timer: timerFraction(effectKey, teamTimer && teamTimer.t),
          });
        }
        for (const storeKey of G.Stages.teamKeys(teamStore)) {
          if (!storeKey.startsWith(GUARD_KEY_PREFIX) || !G.Stages.teamLive(teamStore, storeKey)) continue;
          const type = storeKey.slice(GUARD_KEY_PREFIX.length),
            colours = typeColours(type),
            teamTimer = G.Stages.teamTimer(teamStore, storeKey);
          good.push({
            key: storeKey,
            label: guardTag(type),
            fill: colours.base,
            shade: colours.dark,
            text: null,
            timer: timerFraction(storeKey, teamTimer && teamTimer.t),
          });
        }
      }
      const power = entity.power;
      if (power && power.def) {
        const key = 'altar_' + power.def.id;
        seenKeys.add(key);
        good.push({
          key,
          ...rampedStyle(ALTAR_POWER_TAGS[power.def.id] || power.def.id.slice(0, 3).toUpperCase(), power.def.color),
          text: null,
          timer:
            power.dur > 0
              ? Math.round(Math.max(0, Math.min(1, power.t / power.dur)) * CHIP_ART_WIDTH) / CHIP_ART_WIDTH
              : null,
        });
      }
      for (const key in timePeak) if (!seenKeys.has(key)) delete timePeak[key];
      const badBand = fitBand(bad),
        goodBand = fitBand(good);
      const keyOf = (band) => band.map((chip) => chip.key + ':' + chip.label + ':' + chip.timer).join('|');
      return { bad: badBand, good: goodBand, key: keyOf(badBand) + '#' + keyOf(goodBand) };
    };
  }

  return {
    ready: true,
    hasChip,
    Chip,
    createChipReader,
    createEffectChipReader,
  };
})();
