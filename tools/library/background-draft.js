// tools/library/background-draft.js: the Backgrounds page, the tuning page of background.mosaic (#168). It runs the game's own
// piece (js/ui/lib/primitives/mosaic/mosaic.js) with its settings changed live. A plain script sharing the board's globals;
// index.html loads the board's files in order, board.js first and start.js last.
'use strict';
const MOSAIC_DEFAULTS = G.Lib.Mosaic.DEFAULTS;
const MOSAIC_FPS_SAMPLE_MS = 1000;
let mosaicRunning = null; // the started mosaic
const MOSAIC_COLOUR_LABELS = { base: 'Base', cool: 'Cool light', warm: 'Warm light', accent: 'Accent' };
const MOSAIC_TYPES = Object.keys(G.Tokens.typeTable('base'));
// [setting, label, lowest, highest, step]
const MOSAIC_SLIDERS = [
  ['driftSpeed', 'Light drift speed', 0, 5, 0.05],
  ['flickerSpeed', 'Tile flicker speed', 0, 5, 0.05],
  ['flickerAmount', 'Tile flicker amount', 0, 1, 0.01],
  ['brightness', 'Brightness', 0, 1.5, 0.01],
  ['accentAmount', 'Accent amount', 0, 1, 0.01],
  ['tileSize', 'Tile size, px', 6, 80, 1],
  ['tileGap', 'Tile gap, px', 0, 12, 0.5],
  ['tileRounding', 'Tile rounding', 0, 0.5, 0.01],
  ['steps', 'Brightness steps', 2, 24, 1],
  ['burstSeconds', 'Burst: seconds', 0.3, 4, 0.1],
  ['burstSpeed', 'Burst: speed', 0.2, 4, 0.05],
  ['burstWidth', 'Burst: width', 0.02, 0.4, 0.01],
  ['burstRays', 'Burst: rays', 3, 32, 1],
  ['burstRayReach', 'Burst: ray reach', 0, 1, 0.01],
  ['burstBrightness', 'Burst: brightness', 0, 1.5, 0.01],
  ['burstCut', 'Burst: cut through light', 0, 1, 0.01],
  ['wavePush', 'Waves: push', 0, 4, 0.05],
  ['waveRings', 'Waves: rings a second', 0, 8, 0.1],
  ['waveSpeed', 'Waves: speed', 0.1, 0.8, 0.01],
  ['waveSettle', 'Waves: settle', 0.2, 5, 0.1],
  ['waveLight', 'Waves: light', 0, 6, 0.05],
  ['waveBend', 'Waves: bend the light', 0, 0.3, 0.005],
];
const mosaicSettings = { ...MOSAIC_DEFAULTS };
// the colours a picker offers: the tokens (Unified first), then the canon sets
const mosaicColourGroups = [
  ...G.Tokens.palettes.map((palette) => ({
    title: palette.title,
    colours: palette.colours.map((token) => [token.name, token.hex]),
  })),
  {
    title: 'Canon sets',
    colours: [...ATTACK_SWATCHES, ...POCKET_SWATCHES, ...STAT_CANON_SWATCHES, ...TIME_SWATCHES].flatMap((swatch) =>
      swatch.colours.map(([tone, , hex]) => [swatch.label + '.' + tone, hex])
    ),
  },
].map((group) => ({ ...group, colours: group.colours.filter(([, hex]) => /^#[0-9a-f]{6}$/i.test(hex)) }));
const mosaicColours = new Map();
for (const group of mosaicColourGroups) for (const [name, hex] of group.colours) mosaicColours.set(name, hex);

// ---------- the Team menu stand-in ----------
// [name, left, top, width, height] in percent of the screen (the sketch, with the box tabs as ruled)
const MOSAIC_MENU_BOXES = [
  ['Team', 1.6, 10, 18.6, 77.2],
  ['Search', 21.2, 7.2, 18.2, 5.6],
  ['Filter', 40, 7.2, 14.4, 5.6],
  ['Sort', 55, 7.2, 14.6, 5.6],
  ['Box', 21.2, 14.2, 48.4, 73],
  ['Detail', 70.8, 7.4, 28, 85.2],
  ['Pokedex', 21.2, 88.4, 6, 4.2],
  ['Box 1', 27.6, 88.4, 4.6, 4.2],
  ['Box 2', 32.6, 88.4, 4.6, 4.2],
  ['Box 3', 37.6, 88.4, 4.6, 4.2],
  ['Sell Pokemon', 51, 88.4, 9.4, 4.2],
  ['EXP Bag', 61, 88.4, 8.6, 4.2],
];
const mosaicMenuBox = ([label, left, top, width, height]) =>
  `<div class="mosaic-box" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%">${esc(label)}</div>`;
const mosaicOptions = mosaicColourGroups
  .map((group) => {
    const options = group.colours.map(
      ([name, hex]) => `<option value="${esc(name)}">${esc(name)} ${esc(hex)}</option>`
    );
    return `<optgroup label="${esc(group.title)}">${options.join('')}</optgroup>`;
  })
  .join('');
const mosaicColourRow = ([name, label]) => `<label class="mosaic-control"><span>${esc(label)}</span>
  <i class="mosaic-chip" data-mosaic-chip="${name}"></i>
  <select data-mosaic-setting="${name}">${mosaicOptions}</select></label>`;
const mosaicSliderRow = ([name, label, lowest, highest, step]) => `<label class="mosaic-control">
  <span>${esc(label)}</span><input type="range" data-mosaic-setting="${name}" min="${lowest}" max="${highest}"
  step="${step}"><output data-mosaic-value="${name}"></output></label>`;

function backgroundsPage() {
  return `<h2>Backgrounds</h2>
    <p class="lib-note">background.mosaic (#168). The Team menu's lowest layer: between the teal lines,
      under every panel and button. Only a level up changes it: Level Up plays one burst in the chosen primary type. Changes here last until the page is reloaded; Copy settings
      puts them on the clipboard.</p>
    <div class="mosaic-stage" id="mosaic-stage">
      <div class="mosaic-host"></div>
      <div class="mosaic-bar top"></div><div class="mosaic-bar bottom"></div>
      <div class="mosaic-menu">${MOSAIC_MENU_BOXES.map(mosaicMenuBox).join('')}</div>
    </div>
    <p class="mosaic-tools">
      <select id="mosaic-type">${MOSAIC_TYPES.map((type) => `<option>${esc(type)}</option>`).join('')}</select>
      <button type="button" data-mosaic-do="levelUp">Level Up</button>
      <button type="button" data-mosaic-do="menu">Hide or show the menu</button>
      <button type="button" data-mosaic-do="full">Full screen</button>
      <button type="button" data-mosaic-do="reset">Reset</button>
      <button type="button" data-mosaic-do="copy">Copy settings</button>
      <span class="lib-mono lib-dim" id="mosaic-status"></span></p>
    <div class="mosaic-controls">
      <div>${Object.entries(MOSAIC_COLOUR_LABELS).map(mosaicColourRow).join('')}</div>
      <div>${MOSAIC_SLIDERS.map(mosaicSliderRow).join('')}</div>
    </div>`;
}

/** Shows the settings in the controls, and the base colour behind the canvas (what shows without WebGL). */
function refreshMosaicControls() {
  for (const control of document.querySelectorAll('[data-mosaic-setting]'))
    control.value = mosaicSettings[control.dataset.mosaicSetting];
  for (const output of document.querySelectorAll('[data-mosaic-value]'))
    output.textContent = mosaicSettings[output.dataset.mosaicValue];
  for (const chip of document.querySelectorAll('[data-mosaic-chip]'))
    chip.style.background = mosaicColours.get(mosaicSettings[chip.dataset.mosaicChip]);
  $('mosaic-stage').style.background = mosaicColours.get(mosaicSettings.base);
}
/** Called by start.js once the page's markup is in place. */
function mountBackgrounds() {
  refreshMosaicControls();
  const status = $('mosaic-status');
  let sampleStart = performance.now(),
    sampleFrames = 0;
  if (mosaicRunning) mosaicRunning.stop();
  mosaicRunning = G.Lib.Mosaic.start($('mosaic-stage').querySelector('.mosaic-host'), {
    settings: mosaicSettings,
    colourOf: (name) => mosaicColours.get(name),
    onFrame(now, canvas) {
      sampleFrames++;
      if (now - sampleStart < MOSAIC_FPS_SAMPLE_MS) return;
      const fps = Math.round((sampleFrames * 1000) / (now - sampleStart));
      status.textContent = `${fps} fps (capped at 30), ${canvas.width} x ${canvas.height}`;
      sampleStart = now;
      sampleFrames = 0;
    },
  });
  if (!mosaicRunning.running()) status.textContent = 'no WebGL: base colour only';
}
const MOSAIC_ACTIONS = {
  levelUp: () => mosaicRunning.burst($('mosaic-type').value),
  menu: () => $('mosaic-stage').classList.toggle('menu-hidden'),
  full: () => $('mosaic-stage').requestFullscreen(),
  reset: () => {
    Object.assign(mosaicSettings, MOSAIC_DEFAULTS);
    refreshMosaicControls();
  },
  copy: () => copyName(JSON.stringify(mosaicSettings, null, 2)),
};
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-mosaic-do]');
  if (button) MOSAIC_ACTIONS[button.dataset.mosaicDo]();
});
document.addEventListener('input', (event) => {
  const name = event.target.dataset.mosaicSetting;
  if (!name) return;
  mosaicSettings[name] = event.target.type === 'range' ? Number(event.target.value) : event.target.value;
  refreshMosaicControls();
});
