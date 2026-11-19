// tools/library/fonts.js: the Fonts pages: Unified, Fold Map and Reference. A plain script sharing the board's globals; index.html
// loads the board's files in order, board.js first and start.js last.
'use strict';
// ---------- Fonts (Jess 2026-11-18): Unified (the scheme), Fold Map (today's text to it), Reference Not in Game ----
// Decision 2026-11-18-155-font-scheme-three-tiers. A draft on the board only: the game loads today's faces (the font
// tokens) until #126. The board declares the scheme's own faces itself (BOARD_FACES, below); tokens.js is untouched.
// grid: font pixels per em, so a size is crisp when it is a whole multiple of it (HUD-STYLE "Crisp sizes only"). The
// game's world canvas is drawn at 2x, so a canvas size is crisp at half a crisp screen size.
const CANVAS_ZOOM = 2;
const FONT_TIERS = [
  {
    tier: 'Meta, the game talking',
    name: 'font.michroma',
    family: 'HudModule',
    file: 'assets/fonts/Michroma-Regular.ttf',
    grid: 0,
    sizes: [14, 18, 24, 32],
    covers:
      'Menus, menu buttons, toasts, titles, module panels, the Main Menu, Settings, the upgrades screen, ' +
      'item tooltips',
    sample: 'Resume  Settings  End Run  Potion: restores 20 HP',
    note:
      'Smooth, so any size is crisp; the sizes shown are candidates to pick a set from at the feel test. ' +
      'Takes over font.pokeBW, and font.hudModule and font.michroma (one file, two families today) become one.',
  },
  {
    tier: 'Pokemon',
    name: 'font.silver',
    family: 'Silver 10px',
    file: 'assets/fonts/Silver-10px.ttf',
    grid: 10,
    sizes: [20, 30, 40],
    covers: 'Names, Lv, HP, moves, stats, EVs, the catch screen, the roster, move and stat tooltips',
    sample: 'Pikachu Lv 42 HP 87/120 Thunderbolt',
    counter: true,
    note:
      'Silver re-gridded to 10 font pixels per em, every digit 6 pixels wide. Body 20, headers 30, emphasis 40. ' +
      'Built by python tools/make_silver_font.py; until it runs, this card says did not load.',
  },
  {
    tier: 'World numbers',
    name: 'font.boldPixels',
    family: 'HudDigits',
    file: 'assets/fonts/BoldPixels.ttf',
    grid: 16,
    sizes: [16, 32, 48],
    covers: 'Timer, kills, World Level, counters; damage numbers at canvas 8 and crits at canvas 16',
    sample: '12:34  1,250 KOs  World 27  148',
    counter: true,
  },
  {
    tier: 'World words',
    name: 'font.monogram',
    family: 'Monogram 16px',
    file: 'assets/fonts/monogram-extended.ttf',
    grid: 16,
    sizes: [16, 32, 48],
    covers: 'Weather, map labels, region names',
    sample: 'Rain  Viridian Forest  Route 2  Kanto',
    note:
      'Grid read from the file: every letter and digit sits on 64 of its 1024 units. Its ascent (682 units) is ' +
      'not a whole font pixel, so a line can sit half a pixel off.',
  },
];

// Every text place in the game today and where it lands (P3: by place, by hand). today: the font tokens it uses now.
// to: the Unified face it lands on (null: decided per call at #126). how: why it lands there; "inferred" rows are the
// board's reading of the scheme, for Jess to confirm. Sizes in px; canvas sizes are before the 2x zoom.
const FONT_FOLDS = [
  // meta
  {
    place: 'Menu buttons: pause menu, End Run, EV screen',
    where: 'button.css .pm-button .hud-text',
    today: ['font.hudText'],
    size: '30',
    to: 'font.michroma',
    toSize: 'feel test',
    how: 'ruled: menu buttons',
  },
  {
    place: 'End Run title (EXPEDITION OVER)',
    where: 'pause-menu.css .er-title',
    today: ['font.hudModule'],
    size: '88',
    to: 'font.michroma',
    toSize: '88',
    how: 'scheme: titles',
  },
  {
    place: 'Run Info panel',
    where: 'pause-menu.css .pm-info',
    today: ['font.hudModule'],
    size: '24',
    to: 'font.michroma',
    toSize: '24',
    how: 'scheme: module panels',
  },
  {
    place: 'DPS-Upgrades panel',
    where: 'hud-overlay.css .hud-dps-header, .hud-dps-cards',
    today: ['font.hudModule'],
    size: '14 to 24',
    to: 'font.michroma',
    toSize: '14 to 24',
    how: 'scheme: modules',
  },
  {
    place: 'Toasts',
    where: 'style.css .toast',
    today: ['font.hudModule'],
    size: '20',
    to: 'font.michroma',
    toSize: '20',
    how: 'scheme: toasts',
  },
  {
    place: 'Dialog title',
    where: 'modal.css .modal-title',
    today: ['font.hudModule'],
    size: '30',
    to: 'font.michroma',
    toSize: '30',
    how: 'scheme: titles',
  },
  {
    place: 'Dialog message and note',
    where: 'modal.css .modal-message, .modal-note',
    today: ['font.game'],
    size: '27.1429, 20',
    to: 'font.michroma',
    toSize: 'feel test',
    how: 'inferred: a message is the game talking',
  },
  {
    place: 'Dialog buttons',
    where: 'modal.css .modal-button label',
    today: ['font.game'],
    size: '27.1429',
    to: 'font.michroma',
    toSize: 'feel test',
    how: 'inferred: a button',
  },
  {
    place: 'Item tooltips',
    where: 'hud-overlay.css .hud-tip',
    today: ['font.game'],
    size: '20',
    to: 'font.michroma',
    toSize: '20',
    how: 'ruled: item tooltips',
  },
  {
    place: 'Pause inventory pocket headers',
    where: 'pause-menu.css .pm-pocket-header .hud-text',
    today: ['font.hudText'],
    size: '24',
    to: 'font.michroma',
    toSize: '24',
    how: 'inferred: items are meta',
  },
  {
    place: 'Inventory pane',
    where: 'bw-inventory.css .inv-pane',
    today: ['font.game'],
    size: 'inherits',
    to: 'font.michroma',
    toSize: 'inherits',
    how: 'inferred: items are meta',
  },
  {
    place: 'Search box',
    where: 'hud-overlay.css .hud-search',
    today: ['font.hudText'],
    size: '20',
    to: 'font.michroma',
    toSize: '20',
    how: 'inferred: a menu control',
  },
  {
    place: 'Shop panes',
    where: 'bw-shop.css .shop-rail, .shop-pocket, .shop-items-pane, .shop-balls-pane, ...',
    today: ['font.game'],
    size: 'inherits',
    to: 'font.michroma',
    toSize: 'inherits',
    how: 'inferred: a menu screen (names on its cards may want Silver)',
  },
  {
    place: 'Main Menu text',
    where: 'bw-menu.css #scr-menu, #topbar, #botbar, .rg-card, #credits-line',
    today: ['font.pokeBW'],
    size: 'fluid',
    to: 'font.michroma',
    toSize: 'fluid',
    how: 'ruled: PokeBW retires',
  },
  {
    place: 'Main Menu and login title (PokeSwarm)',
    where: 'bw-menu.css .bw-title, style.css .logo .t1.swarm',
    today: ['font.michroma'],
    size: 'fluid',
    to: 'font.michroma',
    toSize: 'fluid',
    how: 'scheme: one Michroma family',
  },
  {
    place: 'Loading screen',
    where: 'bw-menu.css .boot-in h1, .boot-in p',
    today: ['font.michroma', 'font.pokeBW'],
    size: 'fluid',
    to: 'font.michroma',
    toSize: 'fluid',
    how: 'ruled: PokeBW retires',
  },
  {
    place: 'Settings',
    where: 'bw-settings.css .st, .st-h, .st-opt, .st-info, .st-note, .st-box, .st-hint',
    today: ['font.monogram', 'font.pokeBW'],
    size: 'fluid',
    to: 'font.michroma',
    toSize: 'fluid',
    how: 'ruled: Settings is meta',
  },
  {
    place: 'Team screen buttons',
    where: 'bw-team.css .bw-btn',
    today: ['font.pokeBW'],
    size: '18',
    to: 'font.michroma',
    toSize: '18',
    how: 'ruled: menu buttons',
  },
  {
    place: 'Upgrades screen',
    where: 'bw-upgrades.css .upgw',
    today: ['font.pokeBW'],
    size: 'inherits',
    to: 'font.michroma',
    toSize: 'inherits',
    how: 'ruled: upgrades',
  },
  {
    place: 'FPS readout (setting)',
    where: 'game.js canvas',
    today: ['font.game'],
    size: '11',
    to: 'font.michroma',
    toSize: '11',
    how: 'inferred: a dev readout',
  },
  // pokemon
  {
    place: 'Roster: names, HP, moves',
    where: 'hud-overlay.css .hud-overlay (the HUD default)',
    today: ['font.hudText'],
    size: '20',
    to: 'font.silver',
    toSize: '20',
    how: 'scheme: on a Pokemon',
  },
  {
    place: 'Lv number',
    where: 'hud-overlay.css .hud-lv-number',
    today: ['font.hudDigits'],
    size: '48',
    to: 'font.silver',
    toSize: '40',
    how: 'ruled: Lv is Pokemon; nearest crisp',
  },
  {
    place: 'Pokemon detail and team panels',
    where: 'pause-menu.css .pm-panel-detail, .pm-panel-team',
    today: ['font.hudText'],
    size: '20, 30',
    to: 'font.silver',
    toSize: '20, 30',
    how: 'scheme: on a Pokemon',
  },
  {
    place: 'Move and stat tooltips',
    where: 'hud-overlay.css .hud-tip',
    today: ['font.game'],
    size: '20',
    to: 'font.silver',
    toSize: '20',
    how: 'ruled; Silver 10px at 20 is the catch screen look, larger than today',
  },
  {
    place: 'Catch screen',
    where: 'bw-catch.css .catch-stage',
    today: ['font.game'],
    size: '27.1429, 40.7143',
    to: 'font.silver',
    toSize: '20, 30',
    how: 'same look, new grid',
  },
  {
    place: 'Player name tag and revive label',
    where: 'player.js canvas (co-op, deferred)',
    today: ['font.game'],
    size: 'canvas 7, 6',
    to: 'font.silver',
    toSize: 'canvas 5',
    how: 'nearest crisp',
  },
  // world numbers
  {
    place: 'Run timer',
    where: 'hud-overlay.css .hud-timer',
    today: ['font.hudText'],
    size: '20',
    to: 'font.boldPixels',
    toSize: '16',
    how: 'scheme; nearest crisp',
  },
  {
    place: 'Kill count',
    where: 'hud-overlay.css .hud-kills',
    today: ['font.hudText'],
    size: '20',
    to: 'font.boldPixels',
    toSize: '16',
    how: 'scheme; nearest crisp',
  },
  {
    place: 'Silver count',
    where: 'hud-overlay.css .hud-silver-count',
    today: ['font.hudText'],
    size: '30',
    to: 'font.boldPixels',
    toSize: '32',
    how: 'scheme: counters',
  },
  {
    place: 'World Level',
    where: 'hud-overlay.css .hud-world-level',
    today: ['font.hudDigits'],
    size: '48',
    to: 'font.boldPixels',
    toSize: '48',
    how: 'scheme',
  },
  {
    place: 'Damage numbers',
    where: 'fx.js canvas',
    today: ['font.game'],
    size: 'canvas 13, 15',
    to: 'font.boldPixels',
    toSize: 'canvas 8',
    how: 'ruled',
  },
  {
    place: 'Crits (big hits)',
    where: 'fx.js canvas',
    today: ['font.game'],
    size: 'canvas 20',
    to: 'font.boldPixels',
    toSize: 'canvas 16',
    how: 'ruled',
  },
  // world words
  {
    place: 'Weather',
    where: 'hud-overlay.css .hud-weather',
    today: ['font.hudText'],
    size: '20',
    to: 'font.monogram',
    toSize: '16',
    how: 'scheme; nearest crisp',
  },
  {
    place: 'Map labels',
    where: 'hud-map-panel.js',
    today: ['font.hudText'],
    size: '20',
    to: 'font.monogram',
    toSize: '16',
    how: 'scheme; nearest crisp',
  },
  {
    place: 'Wayfinding labels',
    where: 'hud.js WAYFINDING_FONT',
    today: ['font.hudText'],
    size: '20',
    to: 'font.monogram',
    toSize: '16',
    how: 'inferred: a world label',
  },
  {
    place: '"!" markers (events, rescues)',
    where: 'events.js, rescue.js canvas',
    today: ['font.game'],
    size: 'canvas 16',
    to: 'font.monogram',
    toSize: 'canvas 16',
    how: 'inferred: a world sign (BoldPixels would also fit)',
  },
  // per call at #126
  {
    place: 'Canvas HUD text (about 40 calls)',
    where: 'hud.js F()',
    today: ['font.game'],
    size: '9 to 26',
    to: null,
    toSize: '',
    how: 'mixed jobs: decided call by call',
  },
  {
    place: 'Stat hex labels',
    where: 'statchart.js canvas',
    today: ['font.game'],
    size: 'varies',
    to: null,
    toSize: '',
    how: 'Silver by the scheme; its sizes scale',
  },
  {
    place: 'Sleep Z',
    where: 'status-fx.js canvas',
    today: ['font.game'],
    size: 'varies',
    to: null,
    toSize: '',
    how: 'Silver by the scheme; its size scales',
  },
  {
    place: 'Older screens (the page default)',
    where: 'style.css body, select.field (var(--font))',
    today: ['font.game'],
    size: '16',
    to: null,
    toSize: '',
    how: 'each screen lands with its own tier',
  },
];

// The files no Unified face uses, and what each is.
const REFERENCE_FONTS = [
  {
    file: 'assets/fonts/Truth-And-Ideals-10px.ttf',
    family: 'HudText',
    name: 'font.hudText',
    status: 'Retired: hard to read in a fast game (Jess, playtests). The game uses it until #126.',
  },
  {
    file: 'assets/fonts/Truth-And-Ideals.ttf',
    family: 'Truth And Ideals source',
    name: '',
    status: 'The source of the 10px file (tools/make_hud_font.py).',
  },
  {
    file: 'assets/fonts/pokemon-b-w.ttf',
    family: 'PokeBW',
    name: 'font.pokeBW',
    status: 'Retired: its Main Menu, Settings and upgrades text goes to Michroma. Only 81 characters.',
  },
  {
    file: 'assets/fonts/Silver-game.ttf',
    family: 'GameFont',
    name: 'font.game',
    status: "The game's Silver until #126 (19 font pixels per em, enlarged 140%); the source of Silver-10px.ttf.",
  },
  {
    file: 'assets/fonts/Silver.ttf',
    family: 'Silver source',
    name: '',
    status: 'Full Silver, about 13,800 characters; tools/subset_silver.py trims it to Silver-game.ttf.',
  },
  {
    file: 'assets/fonts/PixelifySans.ttf',
    family: 'Pixelify Sans',
    name: '',
    status: 'No longer used in the game (CREDITS.md).',
  },
  {
    file: 'assets/fonts/PixelifyPS-400.ttf',
    family: 'Pixelify PS 400',
    name: '',
    status: 'No longer used in the game; Pixelify with redrawn numbers (tools/make_font.py).',
  },
  {
    file: 'assets/fonts/PixelifyPS-700.ttf',
    family: 'Pixelify PS 700',
    name: '',
    status: 'No longer used in the game; the bold of Pixelify PS.',
  },
];

// The 2x canvas strip: world text at the scheme's canvas sizes, drawn the game's way (no smoothing, hard outline).
const CANVAS_SAMPLES = [
  { family: 'HudDigits', size: 8, text: '12', x: 12, y: 24 },
  { family: 'HudDigits', size: 8, text: '37', x: 34, y: 34 },
  { family: 'HudDigits', size: 16, text: '148', x: 62, y: 36 },
  { family: 'Silver 10px', size: 10, text: 'Pikachu Lv 42', x: 140, y: 22 },
  { family: 'Monogram 16px', size: 8, text: 'Rain', x: 140, y: 44 },
  { family: 'Monogram 16px', size: 16, text: '!', x: 240, y: 40 },
];
const CANVAS_INK = '#101010'; // grey.ink (Unified)
const CANVAS_TEXT = '#ffffff';
const OUTLINE_OFFSETS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]; // one canvas pixel each way, the HUD's hard outline

const fontSample = (family, size, text) =>
  `<p class="lib-font-sample" style="font-family:'${esc(family)}';font-size:${size}px">${size} px: ${esc(text)}</p>`;
const tierCrispSizes = (tier) => {
  if (!tier.grid) return 'any (smooth face)';
  const canvas = tier.sizes.map((size) => size / CANVAS_ZOOM).join(', ');
  return `${tier.sizes.join(', ')} px, canvas ${canvas} (${tier.grid} font pixels per em)`;
};
function tierCard(tier) {
  const counter = tier.counter
    ? `<p class="lib-font-sample lib-tick" style="font-family:'${esc(tier.family)}';font-size:${tier.sizes[0]}px">` +
      'Ticking: <span data-tick>0000</span></p>'
    : '';
  return `<div class="lib-font" data-font="${esc(tier.family)}">
    <h3>${esc(tier.tier)}</h3>
    ${nameButton(tier.name)} <span class="lib-mono">'${esc(tier.family)}'</span>
    <span class="lib-dim lib-mono">${esc(tier.file)}</span> <span class="lib-font-status"></span>
    <div>${esc(tier.covers)}</div>
    <div class="lib-dim">Crisp sizes: ${tierCrispSizes(tier)}</div>
    ${tier.note ? `<div class="lib-dim">${esc(tier.note)}</div>` : ''}
    ${tier.sizes.map((size) => fontSample(tier.family, size, tier.sample)).join('')}${counter}
  </div>`;
}
function fontUnifiedPage() {
  return (
    FONT_TIERS.map(tierCard).join('') +
    `<h3>On the 2x canvas</h3>
    <canvas class="lib-font-canvas" width="560" height="120" data-font-canvas></canvas>
    <p class="lib-dim">Damage 12 and 37 (BoldPixels, canvas 8), a crit 148 (canvas 16), a name (Silver, canvas
      10), a weather word (monogram, canvas 8) and a "!" marker (monogram, canvas 16), each with a hard outline.</p>`
  );
}

/** How a place changes: a new face (another file), its size only, nothing, or decided per call (no landing yet). */
function foldChange(fold) {
  if (!fold.to) return 'per call';
  const tier = FONT_TIERS.find((entry) => entry.name === fold.to);
  const todayFiles = fold.today.map((name) => G.Tokens.fonts.find((font) => font.name === name).file);
  if (todayFiles.some((file) => file !== tier.file)) return 'new face';
  return fold.size === fold.toSize ? 'unchanged' : 'size only';
}
const FOLD_HEAD =
  '<thead><tr><th>Place</th><th>Where</th><th>Today</th><th>Size</th><th>Lands on</th><th>Size</th>' +
  '<th>Why</th><th>Change</th></tr></thead>';
const foldRow = (fold) => `<tr><td>${esc(fold.place)}</td><td class="lib-dim">${esc(fold.where)}</td>
  <td>${fold.today.map(nameButton).join(' ')}</td><td>${esc(fold.size)}</td>
  <td>${fold.to ? nameButton(fold.to) : ''}</td><td>${esc(fold.toSize)}</td><td>${esc(fold.how)}</td>
  <td>${foldChange(fold)}</td></tr>`;
function fontFoldPage() {
  const changes = FONT_FOLDS.map(foldChange);
  const count = (change) => changes.filter((entry) => entry === change).length;
  const inferred = FONT_FOLDS.filter((fold) => fold.how.startsWith('inferred')).length;
  const summary =
    `<p class="lib-dim">${FONT_FOLDS.length} places: ${count('unchanged')} unchanged, ` +
    `${count('size only')} size only, ${count('new face')} new face, ${count('per call')} decided per call. ` +
    `${inferred} are inferred from the scheme, for Jess to confirm.</p>`;
  const groups = [...FONT_TIERS.map((tier) => [tier.tier, tier.name]), ['Decided per call at #126', null]];
  return (
    summary +
    groups
      .map(
        ([title, name]) => `<h3>${esc(title)}</h3><table class="lib-props">${FOLD_HEAD}
    ${FONT_FOLDS.filter((fold) => fold.to === name)
      .map(foldRow)
      .join('')}</table>`
      )
      .join('')
  );
}

function fontReferencePage() {
  const rows = REFERENCE_FONTS.map(
    (font) => `<tr data-font="${esc(font.family)}">
    <td class="lib-mono">${esc(font.file)} <span class="lib-font-status"></span></td>
    <td>${font.name ? nameButton(font.name) : ''}</td><td>${esc(font.status)}</td>
    <td style="font-family:'${esc(font.family)}';font-size:20px;white-space:nowrap">Pikachu Lv 42 HP 87/120</td></tr>`
  );
  return `<table class="lib-props"><thead><tr><th>File</th><th>Token today</th><th>What it is</th><th>Sample, 20 px</th>
    </tr></thead>${rows.join('')}</table>`;
}

const FONT_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note:
      'The font scheme: four faces in three tiers (decision 2026-11-18-155-font-scheme-three-tiers). A draft on ' +
      'the board; the game changes when #126 applies it.',
    draw: fontUnifiedPage,
  },
  {
    id: 'folds',
    title: 'Fold Map',
    note:
      'Every text place in the game today, the face and size it lands on, and why. Window-scaled sizes on a ' +
      'pixel face land on its nearest crisp size; smooth Michroma keeps them.',
    draw: fontFoldPage,
  },
  {
    id: 'reference',
    title: 'Reference Not in Game',
    note: 'The font files no Unified face uses: retired faces, sources of the files the game loads, and old fonts.',
    draw: fontReferencePage,
  },
];
const fontsPage = (tab) => tabbedPage('Fonts', FONT_TABS, tab);
