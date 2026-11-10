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
  const { html, signal, typeColours } = overlay.kit;

  // ---------- timings (ms; the CSS keyframes in css/hud-overlay.css use the same lengths) ----------
  const CARD_ENTER_MS = 600, // slide in from off screen, overshoot, settle
    CARD_EXIT_MS = 380, // slide back off the right edge
    CLEAR_HOLD_MS = 2000, // Clear Sky stays this long after it lands
    CLEAR_FADE_MS = 700;

  // ---------- what each weather's card says (new English text, HUD only) ----------
  // icon: a white Bulbapedia weather icon in assets/icons/weather/; rimType: the SV type colour of the card's rim.
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
    cardTimeLeft = signal(1); // 1 to 0, the weather's time left; the bar under the card

  // ---------- components ----------
  function WeatherCard() {
    const shown = card.value;
    if (!shown) return null;
    const info = CARDS[shown.kind] || CARDS.clear,
      rim = typeColours(info.rimType);
    return html`<div
      key=${shown.key}
      class=${'hud-weather is-' + shown.phase}
      style=${{ '--rim': rim.base, '--rim-dark': rim.dark }}
    >
      <img class="hud-weather-icon" src=${ICON_PATH + info.icon + '.png'} alt="" />
      <div class="hud-weather-words">
        <div class="hud-text">${info.name}</div>
        <div class="hud-text hud-dim">${info.effect}</div>
      </div>
      ${
        shown.kind !== 'clear'
          ? html`<div class="hud-weather-timer" style=${{ transform: 'scaleX(' + cardTimeLeft.value + ')' }}></div>`
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
