// tools/library/start.js: the page router, font loading and the wiring; loads last. A plain script sharing the board's globals; index.html
// loads the board's files in order, board.js first and start.js last.
'use strict';
const DRAW = {
  'tokens/colours': coloursPage,
  'tokens/fonts': fontsPage,
  'tokens/layers': layersPage,
  'primitives/buttons': buttonsPage,
  'primitives/toggles': togglesPage,
  'primitives/cursor': cursorPage,
  'primitives/panels': panelsPage,
  'primitives/squares': squaresPage,
  'primitives/bars': barsPage,
  'primitives/modal': modalPage,
  'primitives/portraits': primitivePage('primitives/portraits'),
};
// the shared fills the pixel shapes paint with (G.Lib.Pixels.PixelPatterns), once for the whole board
const patternHost = document.createElement('div');
document.body.appendChild(patternHost);
preact.render(libHtml`<${G.Lib.Pixels.PixelPatterns} />`, patternHost);

/** Shows a page (and, on a tabbed page, a tab). The address hash follows, so the page can be bookmarked. */
function show(id, tab) {
  const item = pages.get(id) || pages.get('tokens/colours');
  const draw = DRAW[item.id];
  $('main').innerHTML = draw && !item.later ? draw(tab) : laterPage(item);
  $('main').dataset.page = item.id;
  $('crumb').textContent = item.id;
  document
    .querySelectorAll('.nav-item')
    .forEach((button) => button.toggleAttribute('aria-current', button.dataset.page === item.id));
  const hash = '#' + item.id + (tab ? ':' + tab : '');
  if (location.hash !== hash) history.replaceState(null, '', hash);
  if (item.id === 'tokens/fonts') {
    markFonts();
    drawFontCanvas();
  }
  const primitive = PRIMITIVE_PAGES[item.id];
  const hasStories = $('main').querySelector('[data-story]');
  if (primitive && !item.later && hasStories) mountStories(primitive.stories(), primitive.pieces());
}

// ---------- fonts: declared from the tokens, as the game's CSS declares them, then the board's own faces ----------
// Monogram 16px: the token's Monogram face covers only weights 551 to 900 (the old menu's bold), so the board declares
// the same file at every weight for the World words tier.
const BOARD_FACES = [
  { family: 'Silver 10px', file: 'assets/fonts/Silver-10px.ttf' },
  { family: 'Monogram 16px', file: 'assets/fonts/monogram-extended.ttf' },
  ...REFERENCE_FONTS.filter((font) => !font.name).map(({ family, file }) => ({ family, file })),
];
const kebab = (key) => key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
const faceRule = (family, file, rules = {}) => `@font-face { font-family: '${family}'; src: url('${ROOT + file}')
  format('truetype'); font-display: block;${Object.entries(rules)
    .map(([key, value]) => ` ${kebab(key)}: ${value};`)
    .join('')} }`;
const faceStyle = document.createElement('style');
faceStyle.textContent = [
  ...G.Tokens.fonts.map((font) => faceRule(font.family, font.file, font.faceRules)),
  ...BOARD_FACES.map((face) => faceRule(face.family, face.file)),
].join('\n');
document.head.appendChild(faceStyle);
const fontResults = new Map();
/** Loads one face; resolves [family, loaded] and marks the page's cards and the canvas strip. */
const loadFace = (family, size) =>
  document.fonts
    .load(`${size}px '${family}'`)
    .then(
      (faces) => faces.length > 0,
      () => false
    )
    .then((loaded) => {
      fontResults.set(family, loaded);
      markFonts();
      drawFontCanvas();
      return [family, loaded];
    });
window.libFontsReady = Promise.all(G.Tokens.fonts.map((font) => loadFace(font.family, font.sizes[0] || 20)));
window.libSchemeFontsReady = Promise.all(BOARD_FACES.map((face) => loadFace(face.family, 20)));
function markFonts() {
  for (const [family, loaded] of fontResults) {
    const status = document.querySelector(`[data-font="${family}"] .lib-font-status`);
    if (!status) continue;
    status.textContent = loaded ? '' : 'did not load';
    status.className = 'lib-font-status' + (loaded ? '' : ' lib-fail');
  }
}
/** Draws the 2x canvas strip, when the Unified tab shows it; a face not loaded yet draws in its fallback. */
function drawFontCanvas() {
  const canvas = document.querySelector('[data-font-canvas]');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  context.setTransform(CANVAS_ZOOM, 0, 0, CANVAS_ZOOM, 0, 0);
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (const sample of CANVAS_SAMPLES) {
    context.font = `${sample.size}px '${sample.family}'`;
    context.fillStyle = CANVAS_INK;
    for (const [dx, dy] of OUTLINE_OFFSETS) context.fillText(sample.text, sample.x + dx, sample.y + dy);
    context.fillStyle = CANVAS_TEXT;
    context.fillText(sample.text, sample.x, sample.y);
  }
}
// the ticking counters on the Unified tab: a face whose digits differ in width makes its box twitch
let tickValue = 0;
setInterval(() => {
  tickValue = (tickValue + 1) % 10000;
  const shown = String(tickValue).padStart(4, '0');
  document.querySelectorAll('[data-tick]').forEach((tick) => {
    tick.textContent = shown;
  });
}, 120);

// ---------- wiring ----------
document.addEventListener('click', (event) => {
  const copy = event.target.closest('[data-copy]');
  if (copy) return copyName(copy.dataset.copy);
  // tabs first: the main area itself carries data-page (the page it shows), so a tab click also finds it
  const tab = event.target.closest('[data-tab]');
  if (tab) return show($('main').dataset.page, tab.dataset.tab);
  const nav = event.target.closest('.nav-item[data-page]');
  if (nav) return show(nav.dataset.page);
});
// a swatch's footer: the hovered colour's name and #HEX, cleared when the mouse leaves the colours
document.addEventListener('pointerover', (event) => {
  const colour = event.target.closest('.swatch-color');
  if (!colour) return;
  const footer = colour.closest('.swatch');
  footer.querySelector('.swatch-part').textContent = colour.dataset.part;
  footer.querySelector('.swatch-hex').textContent = colour.dataset.show || colour.dataset.copy;
});
document.addEventListener('pointerout', (event) => {
  const palette = event.target.closest('.swatch-palette');
  if (!palette || palette.contains(event.relatedTarget)) return;
  const footer = palette.closest('.swatch');
  footer.querySelector('.swatch-part').textContent = '';
  footer.querySelector('.swatch-hex').textContent = '';
});
// The board writes nothing to localStorage: file:// pages share it with the game's save.
function setSidebar(open) {
  document.body.classList.toggle('sidebar-closed', !open);
  $('toggle-sidebar').innerHTML = open ? '&larr;' : '&rarr;';
}
$('toggle-sidebar').addEventListener('click', () => setSidebar(document.body.classList.contains('sidebar-closed')));

const fromHash = () => {
  const [id, tab] = decodeURIComponent(location.hash.slice(1)).split(':');
  show(id || 'tokens/colours', tab);
};
addEventListener('hashchange', fromHash);
fromHash();

// for tools/smoke-ui-library.js
window.libPages = [...pages.keys()];
window.libTabs = Object.fromEntries(
  [
    ['tokens/colours', COLOUR_TABS],
    ['tokens/fonts', FONT_TABS],
    ['primitives/buttons', BUTTON_TABS],
  ].map(([id, tabs]) => [id, tabs.map((tab) => tab.id)])
);
window.libFontScheme = {
  tiers: FONT_TIERS,
  folds: FONT_FOLDS,
  files: [...FONT_TIERS, ...REFERENCE_FONTS].map((font) => font.file),
};
/** Each Unified crisp sample drawn at whole pixels (lit and half-lit pixel counts), and each counter face's digits. */
window.libFontChecks = async () => {
  await Promise.all([window.libFontsReady, window.libSchemeFontsReady]);
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 120;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const loaded = (family) => fontResults.get(family) === true;
  const crisp = FONT_TIERS.filter((tier) => tier.grid).flatMap((tier) =>
    tier.sizes.map((size) => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = `${size}px '${tier.family}'`;
      context.fillStyle = CANVAS_TEXT;
      context.fillText(tier.sample, 4, 2 * size);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let lit = 0,
        half = 0;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] === 255) lit++;
        else if (pixels[index] > 0) half++;
      }
      return { family: tier.family, size, lit: loaded(tier.family) ? lit : 0, half };
    })
  );
  const digits = {};
  for (const tier of FONT_TIERS.filter((entry) => entry.counter)) {
    context.font = `${tier.sizes[0]}px '${tier.family}'`;
    const widths = [...'0123456789'].map((digit) => context.measureText(digit).width);
    digits[tier.family] = loaded(tier.family) ? widths : null;
  }
  return { crisp, digits };
};
window.libShow = (id, tab) => {
  show(id, tab);
  return $('main').innerText;
};
