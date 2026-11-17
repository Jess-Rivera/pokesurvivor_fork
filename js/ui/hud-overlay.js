/* ============ hud-overlay.js: the HTML HUD above the game canvas (core) ============
 * The screen-fixed HUD is an HTML overlay (docs/HUD-STYLE.md, decision 2026-11-10-hud-on-preact-and-pngs-as-design-basis),
 * built with Preact, htm and Preact Signals (js/vendor/) and styled by css/hud-overlay.css.
 *
 * This file is the core: it mounts the layer, joins the kit every panel shares (G.HudOverlay.kit, from hud-kit.js,
 * hud-kit-items.js, hud-kit-hp-bars.js and hud-kit-chips.js in js/ui/, split out 2026-11-14) and runs the per-frame
 * read. Panels live in their own files and register with addPanel():
 *   js/ui/hud-boss-panel.js    the enemy name bar and leader portrait circles (#64)
 *   js/ui/hud-player-panel.js  the character info panel, bottom centre (#62)
 *   js/ui/hud-roster-panel.js  the team roster, held items and berry bag, lower left (#63)
 *   js/ui/hud-run-items-panel.js  the run item column, lower right (#63)
 *   js/ui/hud-map-panel.js     World Level, Region, Map and the weather card (top right), the kills line (#65)
 *   js/ui/hud-dps-panel.js     the DPS-Upgrades panel: DPS sparkline and the run's team upgrade cards (top left) (#66)
 *
 * Read only: G.HudOverlay.sync(inRun) runs once per frame from G.Game after the canvas is drawn. Each panel copies what it
 * shows into signals and never writes game state. Unchanged values touch nothing on the page.
 *
 * If a library failed to load, ready stays false, a warning is logged, and the canvas HUD keeps drawing its old pieces.
 */
G.HudOverlay = (() => {
  const KIT_FILES = [G.HudKit, G.HudKitItems, G.HudKitHpBars, G.HudKitChips];
  if (!G.HudKit.ready) return { ready: false, kit: null, addPanel() {}, sync() {}, setHidden() {}, setNameSize() {} };
  const { preact, html, signal, PALETTE } = G.HudKit,
    { batch } = window.preactSignals;

  // ---------- mount ----------
  const panels = signal([]); // { id, View, sync }
  let hiddenByDebug = false;

  function Defs() {
    return html`<svg class="hud-defs" width="0" height="0" aria-hidden="true">
      <defs>
        <pattern id="hud-bar-checker" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="2" height="2" fill=${PALETTE.checker} />
          <rect x="0" y="0" width="1" height="1" fill=${PALETTE.body} />
          <rect x="1" y="1" width="1" height="1" fill=${PALETTE.body} />
        </pattern>
        <pattern id="hud-type-checker" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="3" height="3" fill=${PALETTE.typeBodyLight} />
          <rect x="0" y="0" width="2" height="2" fill=${PALETTE.typeBodyDark} />
        </pattern>
        <pattern id="hud-slot-grid" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="4" height="4" fill=${PALETTE.typeBodyLight} />
          <rect x="0" y="0" width="3" height="3" fill=${PALETTE.typeBodyDark} />
        </pattern>
      </defs>
    </svg>`;
  }

  function Root() {
    return html`<${Defs} />${panels.value.map((panel) => html`<${panel.View} key=${panel.id} />`)}`;
  }

  const root = document.createElement('div');
  root.className = 'hud-overlay';
  root.setAttribute('translate', 'no'); // English-only text, and keeps the i18n observer off per-frame changes
  root.setAttribute('aria-hidden', 'true');
  document.body.appendChild(root);
  preact.render(html`<${Root} />`, root);

  /** A panel file registers itself: { id, View (a component), sync(inRun) }. */
  function addPanel(panel) {
    panels.value = panels.value.concat(panel);
  }

  // ---------- the per-frame read (sim to present: read only) ----------
  function sync(inRun) {
    // hidden by G.Debug.hudOverlay: no reads and no renders, so the frame rate shows the overlay's whole cost
    const showing = inRun && !hiddenByDebug;
    batch(() => {
      for (const panel of panels.value) panel.sync(showing);
    }); // one render per frame
  }

  /** ?dev only (G.Debug.hudOverlay): hide the overlay to compare the frame rate with and without it. */
  function setHidden(hidden) {
    hiddenByDebug = !!hidden;
    if (hiddenByDebug) sync(false);
  }

  /** ?dev only (G.Debug.hudNameSize): the enemy name line's text size, 20, 30 or 40 px (whole multiples of the 10 px grid). */
  function setNameSize(pixels) {
    root.style.setProperty('--name-size', pixels + 'px');
    root.style.setProperty('--font-pixel', pixels / 10 + 'px');
    return pixels;
  }

  /** The kit every panel and screen reads: each name from the kit file that holds it. */
  const KIT_NAMES = [
    'preact',
    'hooks',
    'html',
    'signal',
    'PALETTE',
    'typeColours',
    'hpBand',
    'SLOT_GRID',
    'FAINTED_RIM',
    'PixelShape',
    'moveSlotRow',
    'SLOT_BUTTON',
    'REST_RIM',
    'SlotButton',
    'TeamButton',
    'FOCUS_RIM',
    'fitToStage',
    'createButtonRow',
    'IconCanvas',
    'RunItemBox',
    'RUN_BOX_ROWS',
    'ItemSquare',
    'ItemGrid',
    'ScrollBox',
    'SearchBar',
    'showTooltip',
    'hideTooltip',
    'tooltipHandlers',
    'Cursor',
    'inputMode',
    'RosterCard',
    'ROSTER_ART_PIXEL',
    'ROSTER_ART_ROWS',
    'rosterBoxGrid',
    'rosterColours',
    'letterRows',
    'rosterFill',
    'hasChip',
    'Chip',
    'createChipReader',
    'createEffectChipReader',
    'createLifeBar',
    'Box',
    'portraitSource',
    'portraitFallback',
  ];
  const kit = {};
  for (const name of KIT_NAMES) {
    const holder = KIT_FILES.find((file) => name in file);
    if (!holder) throw new Error('[HudOverlay] no kit file holds ' + name);
    kit[name] = holder[name];
  }

  return { ready: true, kit, addPanel, sync, setHidden, setNameSize };
})();
