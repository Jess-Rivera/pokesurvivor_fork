/* ============ hud-map-panel.js: the map panel (top right) and the kills line (top centre) (#65, on the HTML HUD) ============
 * A panel of js/ui/hud-overlay.js (the core and its kit). Layout: the wireframe's top right and top centre
 * (assets/excalidraw/run_screen_mockup.png). Look and numbers: docs/HUD-STYLE.md "Map panel and kills line".
 *
 * Top right, right-aligned: World Level (the level enemies spawn at, G.Enemies.levelForTime, a large BoldPixels number
 * over its label), then Region and Map in dim text, then the weather card while a weather is on.
 * Top centre: "NNN Kills" in dim text, hidden during arena fights (gym leaders).
 *
 * The weather card slides in from past the right edge with a small stopping bounce and slides back off when its weather
 * ends. When a weather ends with no new one, a Clear Sky card slides in the same way, holds about 2 s and fades out; that
 * fade is the only exit that is not a slide (Jess, 2026-11-10). Card timing is wall-clock (performance.now), since the
 * card is presentation only; the weather itself is read from G.Weather once per frame and never written.
 */
G.HudMapPanel = (() => {
  const overlay = G.HudOverlay;
  if (!overlay.ready) return { ready: false };
  const { html, signal, typeColours, PixelShape, PALETTE } = overlay.kit;

  // ---------- timings (ms; the CSS keyframes in css/hud-overlay.css use the same lengths) ----------
  const CARD_ENTER_MS = 600, // slide in from off screen, overshoot, settle
    CARD_EXIT_MS = 380, // slide back off the right edge
    CLEAR_HOLD_MS = 2000, // Clear Sky stays this long after it lands
    CLEAR_FADE_MS = 700;

  // ---------- what each weather's card says (new English text, HUD only) ----------
  // icon: a white Bulbapedia weather icon in assets/icons/weather/; rimType: the SV type whose colours replace the rip's greens.
  const ICON_PATH = 'assets/icons/weather/';
  const CARDS = {
    sun: { name: 'Harsh Sunlight', effect: 'Fire x1.5 · Water x0.5', icon: 'harsh-sunlight-white', rimType: 'fire' },
    rain: { name: 'Rain', effect: 'Water x1.5 · Electric x1.2 · Fire x0.5', icon: 'rain-white', rimType: 'water' },
    sand: {
      name: 'Sandstorm',
      effect: 'Rock, Ground, Steel x1.3 · others chip',
      icon: 'sandstorm-white',
      rimType: 'rock',
    },
    snow: { name: 'Snow', effect: 'Ice x1.5 · others chip and slow', icon: 'snow-white', rimType: 'ice' },
    fog: { name: 'Fog', effect: 'Ghost, Fairy, Psychic x1.3', icon: 'fog-white', rimType: 'ghost' },
    clear: { name: 'Clear Sky', effect: 'The weather has passed', icon: 'clear-white', rimType: 'normal' },
  };

  // ---------- state the page shows (signals) ----------
  const visible = signal(false),
    worldLevel = signal(''),
    regionName = signal(''),
    mapName = signal(''),
    killsText = signal(''),
    killsVisible = signal(false),
    card = signal(null), // { key, kind, phase: 'enter' | 'exit' | 'fade' } or null
    cardTimeLeft = signal(1); // 1 to 0, the weather's time left; the timer inside the card's lower rim

  // ---------- the weather card's shape: b2-lower Y1 to AA3 (HUD-STYLE "Map panel and kills line") ----------
  // The B2 tab: a raised tab top left (the rip's katakana, here the icon), a dark stripe with a pointed left end between
  // two Light lines (the rip's "POKEMON", here the weather's name), and a body under it. The rip's right side is cut
  // flat, so the card runs into the screen's right edge. Drawn at 3 px per art pixel. The rip's greens are the weather's
  // type colours (Dark, Base, Light); its grid body is solid Slate (Jess, 2026-11-10).
  const ART_PIXEL = 3,
    ART_ROWS = 46,
    // each row's left edge, in art pixels from the pointed end (rip rows 6 to 51, copied pixel for pixel)
    LEFT_EDGE = [
      13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6, 4, 4, 3, 3, 2, 2, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 6, 7, 7, 8,
      8, 9, 9, 10, 10, 11, 11, 12, 12, 13,
    ],
    TAB_RIGHT = 42, // the tab's right end on its second row; it widens by the left edge's slope going down
    STRIPE_ROWS = [14, 31], // first and last row drawn over the icon
    ICON = { size: 54, left: 54, top: 9 }, // px: in the tab, its lower part tucked behind the stripe
    NAME_PLACE = { left: 42, top: 54 }, // px: 30 px text in the stripe
    EFFECT_PLACE = { left: 48, top: 99 }, // px: 20 px text in the body
    TIMER = { artLeft: 16, artRow: 41 }, // two art rows just inside the lower rim: Light over Base
    RIGHT_PADDING = 6; // art pixels between the longest text and the screen edge

  const tabRightAt = (row) => (row === 0 ? TAB_RIGHT - 2 : TAB_RIGHT + 12 - LEFT_EDGE[row]);

  /** The card's rows as letters: o outline, D / B / L the weather's Dark, Base and Light, G the Slate body, space none. */
  function cardRows(artWidth) {
    const rows = [],
      edge = artWidth - 1;
    for (let row = 0; row < ART_ROWS; row++) {
      const line = new Array(artWidth).fill(' '),
        left = LEFT_EDGE[row],
        tabRight = tabRightAt(row);
      const put = (x, letters) => letters.split('').forEach((letter, index) => (line[x + index] = letter));
      const fill = (from, to, letter) => {
        for (let x = from; x <= to && x < artWidth; x++) line[x] = letter;
      };
      const upperRim = row % 2 ? 'oDBBo' : 'oBBDo',
        lowerRim = row % 2 ? 'oBBDo' : 'oDBBo';
      if (row === 0) fill(left, tabRight, 'o');
      else if (row === 1) {
        fill(left, tabRight, 'B');
        put(left, 'oD');
        put(tabRight - 1, 'Do');
      } else if (row === 2) {
        fill(left, tabRight, 'o');
        put(left, 'oBBD');
        put(tabRight - 3, 'DBBo');
      } else if (row <= 13) {
        // the tab's sides, then (rows 9 to 11) the top rim of the part right of the tab, then the body
        fill(left, edge, 'G');
        put(left, upperRim);
        if (row <= 9) put(tabRight - 4, upperRim.split('').reverse().join(''));
        if (row <= 8) fill(tabRight + 1, edge, ' ');
        if (row === 9) fill(tabRight + 1, edge, 'o');
        if (row === 10) {
          put(tabRight - 4, 'oDBB');
          fill(tabRight, edge, 'B');
        }
        if (row === 11) fill(tabRightAt(10) - 4, edge, 'o');
      } else if (row === 14 || row === 31) {
        fill(left, edge, 'o');
        put(left + 3, 'BBD');
      } else if (row === 15 || row === 30) {
        fill(left, edge, 'L');
        put(left, 'o');
      } else if (row <= 29) {
        fill(left, edge, 'o'); // the stripe's dark inside
        put(left, row % 2 ? 'oLLLB' : 'oBLLL');
      } else if (row <= 42) {
        fill(left, edge, 'G');
        put(left, lowerRim);
      } else if (row === 43) (fill(left, edge, 'o'), put(left, 'oBBDo'));
      else if (row === 44) (fill(left, edge, 'B'), put(left, 'oDBB'));
      else fill(left, edge, 'o');
      rows.push(line.join(''));
    }
    return rows;
  }

  const textMeasure = document.createElement('canvas').getContext('2d');
  function textWidth(text, size) {
    textMeasure.font = size + 'px HudText, monospace';
    return Math.ceil(textMeasure.measureText(text).width) + 4; // and the outline on both sides
  }

  /** A card's art width and rows; kept once the HUD font has loaded (its widths are final then). */
  const shapeCache = new Map();
  function cardShape(kind) {
    if (shapeCache.has(kind)) return shapeCache.get(kind);
    const info = CARDS[kind] || CARDS.clear,
      widest = Math.max(NAME_PLACE.left + textWidth(info.name, 30), EFFECT_PLACE.left + textWidth(info.effect, 20)),
      artWidth = Math.max(TAB_RIGHT + 24, Math.ceil(widest / ART_PIXEL) + RIGHT_PADDING),
      shape = { artWidth, rows: cardRows(artWidth) };
    if (document.fonts && document.fonts.check && document.fonts.check('20px HudText')) shapeCache.set(kind, shape);
    return shape;
  }

  // ---------- components ----------
  function WeatherCard() {
    const shown = card.value;
    if (!shown) return null;
    const info = CARDS[shown.kind] || CARDS.clear,
      colours = typeColours(info.rimType),
      letterColour = { o: PALETTE.frame, D: colours.dark, B: colours.base, L: colours.light, G: PALETTE.slate },
      { artWidth, rows } = cardShape(shown.kind);
    // two layers of the same shape: everything but the stripe under the icon, the stripe over it
    const paintLayer = (stripeLayer) => (row) => {
      if ((row >= STRIPE_ROWS[0] && row <= STRIPE_ROWS[1]) !== stripeLayer) return [];
      const line = rows[row],
        runs = [];
      let start = 0;
      for (let x = 1; x <= line.length; x++) {
        if (x < line.length && line[x] === line[start]) continue;
        if (line[start] !== ' ') runs.push([start, x - start, letterColour[line[start]]]);
        start = x;
      }
      return runs;
    };
    return html`<div
      key=${shown.key}
      class=${'hud-weather is-' + shown.phase}
      style=${{ width: artWidth * ART_PIXEL + 'px', height: ART_ROWS * ART_PIXEL + 'px' }}
    >
      <${PixelShape} artWidth=${artWidth} artRows=${ART_ROWS} artPixel=${ART_PIXEL} paintRow=${paintLayer(false)} />
      <img
        class="hud-weather-icon"
        src=${ICON_PATH + info.icon + '.png'}
        alt=""
        style=${{ left: ICON.left + 'px', top: ICON.top + 'px', width: ICON.size + 'px', height: ICON.size + 'px' }}
      />
      <${PixelShape} artWidth=${artWidth} artRows=${ART_ROWS} artPixel=${ART_PIXEL} paintRow=${paintLayer(true)} />
      <div
        class="hud-text hud-text-30 hud-weather-name"
        style=${{ left: NAME_PLACE.left + 'px', top: NAME_PLACE.top + 'px', color: colours.light }}
      >
        ${info.name}
      </div>
      <div
        class="hud-text hud-weather-effect"
        style=${{ left: EFFECT_PLACE.left + 'px', top: EFFECT_PLACE.top + 'px' }}
      >
        ${info.effect}
      </div>
      ${
        shown.kind !== 'clear'
          ? html`<div
              class="hud-weather-timer"
              style=${{
                left: TIMER.artLeft * ART_PIXEL + 'px',
                top: TIMER.artRow * ART_PIXEL + 'px',
                width: (artWidth - TIMER.artLeft) * ART_PIXEL + 'px',
                '--timer-light': colours.light,
                '--timer-base': colours.base,
                transform: 'scaleX(' + cardTimeLeft.value + ')',
              }}
            ></div>`
          : null
      }
    </div>`;
  }

  function MapPanel() {
    if (!visible.value) return null;
    return html`<div class="hud-map">
        <div class="hud-world-level">${worldLevel.value}</div>
        <div class="hud-text">World Level</div>
        ${regionName.value ? html`<div class="hud-text hud-dim">${regionName.value}</div>` : null}
        <div class="hud-text hud-dim">${mapName.value}</div>
        <${WeatherCard} />
      </div>
      ${killsVisible.value ? html`<div class="hud-kills hud-text hud-dim">${killsText.value}</div>` : null}`;
  }

  // ---------- the weather card's steps ----------
  let cardKey = 0,
    phaseStart = 0,
    nextKind = null; // what slides in once the current card has slid off

  function showCard(kind, now) {
    cardKey++;
    card.value = { key: cardKey, kind, phase: 'enter' };
    phaseStart = now;
  }

  function stepCard(weatherKind, now) {
    const shown = card.value;
    if (!shown) {
      if (weatherKind) showCard(weatherKind, now);
      return;
    }
    const elapsed = now - phaseStart;
    if (shown.phase === 'exit') {
      if (weatherKind && weatherKind !== nextKind) nextKind = weatherKind; // a new weather started during the slide off
      if (elapsed < CARD_EXIT_MS) return;
      if (nextKind) showCard(nextKind, now);
      else card.value = null;
      return;
    }
    if (shown.kind === 'clear') {
      if (weatherKind) {
        // a weather started while Clear Sky is up: it slides off and the weather slides in
        nextKind = weatherKind;
        card.value = { ...shown, phase: 'exit' };
        phaseStart = now;
      } else if (shown.phase === 'enter' && elapsed >= CARD_ENTER_MS + CLEAR_HOLD_MS) {
        card.value = { ...shown, phase: 'fade' };
        phaseStart = now;
      } else if (shown.phase === 'fade' && elapsed >= CLEAR_FADE_MS) {
        card.value = null;
      }
      return;
    }
    if (weatherKind === shown.kind) return;
    // the weather ended (Clear Sky follows) or changed (the new one follows)
    nextKind = weatherKind || 'clear';
    card.value = { ...shown, phase: 'exit' };
    phaseStart = now;
  }

  function resetCard() {
    card.value = null;
    nextKind = null;
  }

  // ---------- the per-frame read ----------
  function sync(showing) {
    const player = showing && G.Game.player;
    visible.value = !!player;
    if (!player) {
      resetCard();
      return;
    }
    const runTime = G.Game.st.time || 0;
    worldLevel.value = String(Math.floor(G.Enemies.levelForTime(runTime)));
    const region = G.Enemies.region,
      regionNames = G.MenuUI && G.MenuUI.GEN_NAMES;
    regionName.value = region && regionNames && regionNames[region - 1] ? G.T(regionNames[region - 1]) : '';
    mapName.value = G.T(G.World.biomeName());
    killsVisible.value = !(G.GymArena && G.GymArena.inArena);
    killsText.value = (player.kills || 0) + ' Kills';

    const weather = G.Weather.current;
    stepCard(weather ? weather.kind : null, performance.now());
    cardTimeLeft.value = weather && weather.dur ? Math.round((weather.left / weather.dur) * 200) / 200 : 0;
  }

  overlay.addPanel({ id: 'map', View: MapPanel, sync });
  return { ready: true };
})();
