// tools/smoke-ui-library.js: headless check for the UI Library pages: the old page (tools/ui-library.html, #147) and, since
// #155, the board (tools/library.html; its relations are listed above checkBoard). A check, not a harness:
// check.js syntax-checks it. Playwright is NOT a repo dependency (PLAYWRIGHT_DIR, default C:\Users\boric\tools\playwright).
// Usage from the repo root: node tools/smoke-ui-library.js
// Relations checked (docs/TEST-FIRST.md): every colour docs/HUD-STYLE.md "Colour palette" and docs/UI-PALETTES.md list is shown on
// the page, every font face the page names loads, and the type chips take the game's real .type class look. The expected colours
// are read from the docs, never from the page. The page loads dev.html's game scripts (minus boot, run and network) in order,
// and the real Run and Pause panels show what the page's fake run holds (counts read from that run), without writing localStorage.
const path = require('path'),
  fs = require('fs'),
  url = require('url');
const root = path.resolve(__dirname, '..');
const PW_DIRS = [
  process.env.PLAYWRIGHT_DIR,
  path.join(require('os').homedir(), 'tools', 'playwright'),
  'C:\\Users\\boric\\tools\\playwright',
]
  .filter(Boolean)
  .map((dir) => path.join(dir, 'node_modules', 'playwright'));
const PW = PW_DIRS.find((dir) => fs.existsSync(dir)) || PW_DIRS[0];
const { chromium } = require(PW);

let failures = 0;
const ok = (condition, message) => {
  console.log((condition ? 'ok    ' : 'FAIL  ') + message);
  if (!condition) failures++;
};

// Six-digit hexes only: the docs also cite issue numbers like #104, which would read as three-digit colours.
const hexesIn = (text) => new Set((text.match(/#[0-9a-f]{6}\b/gi) || []).map((hex) => hex.toLowerCase()));
const hudStyle = fs.readFileSync(path.join(root, 'docs', 'HUD-STYLE.md'), 'utf8');
const paletteStart = hudStyle.indexOf('\n## Colour palette');
const paletteEnd = hudStyle.indexOf('\n## Shapes', paletteStart);
const hudStyleColours = hexesIn(hudStyle.slice(paletteStart, paletteEnd));
const referenceColours = hexesIn(fs.readFileSync(path.join(root, 'docs', 'UI-PALETTES.md'), 'utf8'));

// ---------- the board, tools/library.html (#155) ----------
// Relations (opening: docs/ASCII Concept Maps/UI Library v2 - Slice Opening.md): it loads from file:// with no errors and
// none of the game's scripts; every token in tokens.js shows with its name; every HUD-STYLE and UI-PALETTES colour shows
// (read from the docs, not from the board's copy); every font face loads, and the game's CSS loads the same font files
// under the same families; no library CSS writes a raw colour instead of a token; every sidebar entry of Jess's mockup is
// there and opens a page. Primitives, Buttons (155b, docs/ASCII Concept Maps/155b - Buttons Plan.md): each button draws
// in every state it has in the game, each under its full name; its rims are the rim tokens (read from tokens.js); a
// refused label is fainter than a plain one; disabled cannot be pressed and refused can; each lists its place names.
// Primitives, Panels (155c, docs/ASCII Concept Maps/155c - Panels Plan.md): every state draws under its full name; a
// pixel panel draws its ramp's base (from tokens.js) and a dual type blends two; a lighter body differs from the rest
// one; a dimmed card is fainter than a lit one; a card dimmed with its button lit keeps the button at full; a refused
// card button's label is fainter than a lit card's. 155c-2: a flat panel paints the body, frame and outline tokens; a
// horizontal card's live text is the EXP token and its dimmed state fainter. Primitives, Squares: the board defines the
// shared fills and a square paints one; a filled square's rim is the Lv token, an empty one slate; a locked slot is
// fainter than a filled one; the grids lay out two and four across. Primitives, Bars (155c-3): every state draws under
// its full name; the life bar's fill shrinks with its fraction and paints its band's fill token; a cut leaves a piece;
// the shape paints the bar checker; a narrow bar is narrower; a timer's drawn length follows its fraction, and the
// weather timer holds its right end and paints the two colours it was given. Primitives, Modal (155c-4): every state
// draws under its full name; the box paints the panel.flat tokens; exactly one button is green and it draws the focus
// rim; a notice has one button; the title, message and note show; a long message wraps to more lines.
const vm = require('vm');
function loadTokens() {
  const sandbox = { console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const file = path.join(root, 'js', 'ui', 'lib', 'tokens', 'tokens.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: 'tokens.js' });
  return sandbox.G.Tokens;
}
const filesUnder = (dir, test, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) filesUnder(full, test, out);
    else if (test(entry.name)) out.push(full);
  }
  return out;
};
/** Every @font-face in the game's CSS as "family|assets/fonts/file". */
function gameFontFaces() {
  const faces = new Set();
  for (const file of filesUnder(path.join(root, 'css'), (name) => name.endsWith('.css')))
    for (const [block] of fs.readFileSync(file, 'utf8').matchAll(/@font-face\s*\{[^}]*\}/g)) {
      const family = (block.match(/font-family:\s*'([^']+)'/) || [])[1],
        source = (block.match(/url\('\.\.\/([^']+)'\)/) || [])[1];
      faces.add(family + '|' + source);
    }
  return faces;
}

async function checkBoard(browser) {
  console.log('\n-- the board: tools/library.html --');
  const tokens = loadTokens();
  const boardFile = path.join(root, 'tools', 'library.html');
  const boardScripts = [...fs.readFileSync(boardFile, 'utf8').matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  const notLibrary = boardScripts.filter((src) => !/^(\.\.\/js\/ui\/lib\/|\.\.\/js\/vendor\/|library\/)/.test(src));
  ok(
    boardScripts.length > 0 && notLibrary.length === 0,
    `the board loads only library files (${boardScripts.length} scripts)` +
      (notLibrary.length ? ', game scripts: ' + notLibrary.join(' ') : '')
  );

  const tokenFaces = new Set(tokens.fonts.map((font) => font.family + '|' + font.file));
  const cssFaces = gameFontFaces();
  const notInTokens = [...cssFaces].filter((face) => !tokenFaces.has(face)),
    notInCss = [...tokenFaces].filter((face) => !cssFaces.has(face));
  ok(
    notInTokens.length === 0 && notInCss.length === 0,
    `the game's CSS and the font tokens declare the same ${tokenFaces.size} faces` +
      (notInTokens.length ? '; CSS only: ' + notInTokens.join(' ') : '') +
      (notInCss.length ? '; tokens only: ' + notInCss.join(' ') : '')
  );

  const libraryCss = filesUnder(path.join(root, 'js', 'ui', 'lib'), (name) => name.endsWith('.css'));
  const rawColours = libraryCss.filter((file) =>
    /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''))
  );
  ok(
    rawColours.length === 0,
    `no library CSS writes a raw colour (${libraryCss.length} files)` +
      (rawColours.length ? ': ' + rawColours.map((file) => path.relative(root, file)).join(' ') : '')
  );

  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push('pageerror: ' + error.message));
  page.on('requestfailed', (request) => errors.push('requestfailed: ' + request.url()));
  await page.goto(url.pathToFileURL(boardFile).href, { waitUntil: 'load' });
  const fonts = await page.evaluate(() => window.libFontsReady);
  const board = await page.evaluate(() => {
    const texts = {};
    for (const id of window.libPages) texts[id] = window.libShow(id);
    for (const tab of window.libColourTabs) texts['tokens/colours:' + tab] = window.libShow('tokens/colours', tab);
    return { texts, sidebar: document.getElementById('sidebar').innerText, stored: localStorage.length };
  });
  ok(errors.length === 0, 'the board loads with no errors' + (errors.length ? ': ' + errors.join('; ') : ''));

  const MOCKUP_ENTRIES = [
    'Tokens',
    'Colours',
    'Fonts',
    'z-index layers',
    'Primitives',
    'Buttons',
    'Panels',
    'Bars',
    'Modal',
    'Composites',
    'HUD',
    'Menus',
    'main.shop.pokeball',
    'Basic Editor',
  ];
  const missingEntries = MOCKUP_ENTRIES.filter((entry) => !board.sidebar.includes(entry));
  ok(
    missingEntries.length === 0,
    'the sidebar holds every entry of the mockup' +
      (missingEntries.length ? ', missing ' + missingEntries.join(', ') : '')
  );
  const blank = Object.entries(board.texts)
    .filter(([, text]) => text.trim().length < 20)
    .map(([id]) => id);
  ok(
    blank.length === 0,
    `every sidebar entry opens a page (${Object.keys(board.texts).length})` +
      (blank.length ? ', blank: ' + blank.join(' ') : '')
  );

  const allText = Object.values(board.texts).join('\n');
  const colourTokens = tokens.palettes.flatMap((palette) => palette.colours);
  const unshown = [
    ...colourTokens.filter((token) => !allText.includes(token.name) || !allText.includes(token.hex)).map((t) => t.name),
    ...tokens.fonts.filter((font) => !allText.includes(font.name)).map((font) => font.name),
    ...tokens.layers.filter((layer) => !allText.includes(layer.name)).map((layer) => layer.name),
  ];
  ok(
    unshown.length === 0,
    `every token shows with its name (${colourTokens.length} colours, ${tokens.fonts.length} fonts, ` +
      `${tokens.layers.length} layers)` +
      (unshown.length ? ', missing ' + unshown.join(' ') : '')
  );

  const shownHexes = hexesIn(allText);
  const missingDoc = [...hudStyleColours, ...referenceColours].filter((hex) => !shownHexes.has(hex));
  ok(
    missingDoc.length === 0,
    `every HUD-STYLE (${hudStyleColours.size}) and UI-PALETTES (${referenceColours.size}) colour shows` +
      (missingDoc.length ? ', missing ' + [...new Set(missingDoc)].join(' ') : '')
  );
  const unloaded = fonts.filter(([, loaded]) => !loaded).map(([family]) => family);
  ok(
    fonts.length === tokens.fonts.length && unloaded.length === 0,
    `all ${fonts.length} font faces load on the board` + (unloaded.length ? ', failed ' + unloaded.join(' ') : '')
  );
  ok(board.stored === 0, `the board writes nothing to localStorage (${board.stored} keys)`);
  await checkButtonsPage(page, tokens);
  await checkPanelsPage(page, tokens);
  await checkSquaresPage(page, tokens);
  await checkBarsPage(page, tokens);
  await checkModalPage(page, tokens);
  await context.close();
}

// The states each button has in the game (155b plan): the slanted button has no disabled or refused today; both have
// the red the game gives a button that takes something away (End, Destroy, Sell, Let It Go).
const BUTTON_STATES = {
  'button.slanted': ['rest', 'focused', 'red', 'redFocused'],
  'button.rounded': ['rest', 'focusPositive', 'focusNegative', 'refused', 'refusedFocus', 'disabled'],
};
// The rim each state must show: refused keeps the resting rim, and under the cursor takes the focus rim like any other
// button; a red button keeps its red when focused.
const BUTTON_RIMS = {
  'button.slanted:rest': 'rest',
  'button.slanted:focused': 'focus',
  'button.slanted:red': 'red',
  'button.slanted:redFocused': 'red',
  'button.rounded:rest': 'rest',
  'button.rounded:focusPositive': 'focus',
  'button.rounded:focusNegative': 'red',
  'button.rounded:refused': 'rest',
  'button.rounded:refusedFocus': 'focus',
};
async function checkButtonsPage(page, tokens) {
  const drawn = await page.evaluate(() => {
    window.libShow('primitives/buttons');
    const alphaOf = (colour) => {
      const parts = colour.match(/[\d.]+/g) || [];
      return parts.length > 3 ? Number(parts[3]) : 1;
    };
    const states = {};
    for (const stage of document.querySelectorAll('[data-state]')) {
      const button = stage.querySelector('button'),
        label = button && button.querySelector('span'),
        rectangles = [...stage.querySelectorAll('svg rect')];
      states[stage.dataset.state] = {
        rectangles: rectangles.length,
        fills: rectangles.map((rectangle) => (rectangle.getAttribute('fill') || '').toLowerCase()),
        disabled: !!button && button.disabled,
        labelAlpha: label ? alphaOf(getComputedStyle(label).color) : null,
      };
    }
    const stories = (G.Lib.ButtonStories || []).map((story) => ({ name: story.name, places: story.places }));
    return { states, stories, text: document.getElementById('main').innerText };
  });

  const missing = Object.entries(BUTTON_STATES).flatMap(([name, states]) =>
    states.filter((state) => !((drawn.states[name + ':' + state] || {}).rectangles > 0)).map((state) => name + ':' + state)
  );
  const stateCount = Object.values(BUTTON_STATES).flat().length;
  ok(
    missing.length === 0,
    `the Buttons page draws each button in every state it has (${stateCount})` +
      (missing.length ? ', missing ' + missing.join(' ') : '')
  );

  // each rim by its base colour, read from tokens.js; a state shows a rim when exactly that one base is drawn
  const RIM_BASES = {
    rest: tokens.ramp('color.rim.rest').base.toLowerCase(),
    focus: tokens.ramp('color.rim.focus').base.toLowerCase(),
    red: tokens.ramp('color.rim.sell').base.toLowerCase(),
  };
  const rimOf = (key) => {
    const fills = (drawn.states[key] || {}).fills || [];
    const shown = Object.keys(RIM_BASES).filter((rim) => fills.includes(RIM_BASES[rim]));
    return shown.length === 1 ? shown[0] : 'neither';
  };
  const wrongRims = Object.entries(BUTTON_RIMS)
    .filter(([key, rim]) => rimOf(key) !== rim)
    .map(([key]) => key + ' shows ' + rimOf(key));
  ok(
    wrongRims.length === 0,
    'the rims are the tokens: color.rim.rest at rest and refused, color.rim.focus focused, color.rim.sell on red' +
      (wrongRims.length ? ': ' + wrongRims.join(', ') : '')
  );

  const rounded = (state) => drawn.states['button.rounded:' + state] || {};
  const faint = (refused, plain) =>
    rounded(refused).labelAlpha !== null && rounded(refused).labelAlpha < rounded(plain).labelAlpha;
  ok(
    faint('refused', 'rest') && faint('refusedFocus', 'focusPositive'),
    'a refused label is fainter than a plain one, at rest and under the cursor (' +
      `${rounded('refused').labelAlpha} vs ${rounded('rest').labelAlpha}, ` +
      `${rounded('refusedFocus').labelAlpha} vs ${rounded('focusPositive').labelAlpha})`
  );
  ok(
    rounded('disabled').disabled === true && !rounded('refused').disabled && !rounded('refusedFocus').disabled,
    'a disabled button cannot be pressed; a refused one still can (it says why)'
  );
  const unnamed = Object.entries(BUTTON_STATES)
    .flatMap(([name, states]) => states.map((state) => name + '.' + state))
    .filter((stateName) => !drawn.text.includes(stateName));
  ok(
    unnamed.length === 0,
    'every state shows its full name (button.rounded.focusPositive)' +
      (unnamed.length ? ', missing ' + unnamed.join(' ') : '')
  );

  const placeless = drawn.stories
    .filter((story) => !story.places.length || story.places.some((place) => !drawn.text.includes(place)))
    .map((story) => story.name);
  ok(
    drawn.stories.length === Object.keys(BUTTON_STATES).length && placeless.length === 0,
    `each button lists its place names (${drawn.stories.length} buttons)` +
      (placeless.length ? ', missing on ' + placeless.join(' ') : '')
  );
}

// The states each panel has in the game (155c plan)
const PANEL_STATES = {
  'panel.pixel': ['rest', 'type', 'dualType', 'lightBody', 'fainted'],
  'panel.thin': ['rest'],
  'card.vertical': ['lit', 'dimmed', 'dimmedButtonLit', 'refusedButton'],
  'panel.flat': ['rest'],
  'card.horizontal': ['filled', 'live', 'empty', 'dimmed', 'large'],
};
/** A token's hex as the browser writes a computed colour ("rgb(24, 24, 24)"). */
const rgbOf = (hex) => {
  const value = hex.replace('#', '');
  const channel = (index) => parseInt(value.slice(index, index + 2), 16);
  return `rgb(${channel(0)}, ${channel(2)}, ${channel(4)})`;
};
// The rim ramp each one-ramp pixel panel state must draw (its base colour, read from tokens.js)
const PANEL_RIMS = { rest: 'color.rim.rest', type: 'color.type.fire', fainted: 'color.rim.fainted' };
async function checkPanelsPage(page, tokens) {
  const drawn = await page.evaluate(() => {
    window.libShow('primitives/panels');
    const alphaOf = (colour) => {
      const parts = colour.match(/[\d.]+/g) || [];
      return parts.length > 3 ? Number(parts[3]) : 1;
    };
    const opacityOf = (element) => (element ? Number(getComputedStyle(element).opacity) : null);
    const states = {};
    for (const stage of document.querySelectorAll('[data-state]')) {
      const piece = stage.firstElementChild,
        card = stage.querySelector('.shop-card'),
        label = stage.querySelector('.hud-team-button-label'),
        flat = stage.querySelector('.panel-flat'),
        slotBox = stage.querySelector('.hud-run-item'),
        slotText = stage.querySelector('.hud-run-text');
      states[stage.dataset.state] = {
        flat: flat && {
          body: getComputedStyle(flat).backgroundColor,
          frame: getComputedStyle(flat).borderTopColor,
          outline: getComputedStyle(flat).boxShadow,
        },
        slotOpacity: opacityOf(slotBox),
        slotTextColour: slotText ? getComputedStyle(slotText).color : null,
        drawn: !!piece && piece.getBoundingClientRect().width > 0,
        fills: [...stage.querySelectorAll('svg rect')].map((rect) => (rect.getAttribute('fill') || '').toLowerCase()),
        gradients: stage.querySelectorAll('linearGradient').length,
        cardOpacity: opacityOf(card),
        nameOpacity: opacityOf(card && card.querySelector('.shop-card-name')),
        buttonOpacity: opacityOf(card && card.querySelector('.shop-card-buy')),
        labelAlpha: label ? alphaOf(getComputedStyle(label).color) : null,
      };
    }
    return { states, text: document.getElementById('main').innerText };
  });
  const state = (name, id) => drawn.states[name + ':' + id] || {};

  const missing = Object.entries(PANEL_STATES).flatMap(([name, ids]) =>
    ids.filter((id) => !state(name, id).drawn || !drawn.text.includes(name + '.' + id)).map((id) => name + '.' + id)
  );
  ok(
    missing.length === 0,
    `the Panels page draws every state under its full name (${Object.values(PANEL_STATES).flat().length})` +
      (missing.length ? ', missing ' + missing.join(' ') : '')
  );

  const wrongRims = Object.entries(PANEL_RIMS)
    .filter(([id, ramp]) => !state('panel.pixel', id).fills.includes(tokens.ramp(ramp).base.toLowerCase()))
    .map(([id, ramp]) => 'panel.pixel.' + id + ' lacks ' + ramp);
  ok(
    wrongRims.length === 0,
    "each pixel panel draws its rim ramp's base from the tokens" + (wrongRims.length ? ': ' + wrongRims.join(', ') : '')
  );
  ok(
    state('panel.pixel', 'dualType').gradients > 0 && state('panel.pixel', 'rest').gradients === 0,
    'a dual-type pixel panel blends its two ramps; a one-ramp panel does not'
  );
  const restFills = new Set(state('panel.pixel', 'rest').fills);
  ok(
    state('panel.pixel', 'lightBody').fills.some((fill) => !restFills.has(fill) && fill.startsWith('#')),
    'a lighter-body pixel panel draws a body colour the resting one does not'
  );

  const lit = state('card.vertical', 'lit'),
    dimmed = state('card.vertical', 'dimmed'),
    buttonLit = state('card.vertical', 'dimmedButtonLit'),
    refused = state('card.vertical', 'refusedButton');
  ok(
    dimmed.cardOpacity < lit.cardOpacity,
    `a dimmed card is fainter than a lit one (${dimmed.cardOpacity} vs ${lit.cardOpacity})`
  );
  ok(
    buttonLit.buttonOpacity === lit.buttonOpacity && buttonLit.nameOpacity < lit.nameOpacity,
    'a card dimmed with its button lit dims its text and keeps its button (' +
      `${buttonLit.nameOpacity} text, ${buttonLit.buttonOpacity} button)`
  );
  ok(
    refused.labelAlpha !== null && refused.labelAlpha < lit.labelAlpha,
    `a refused card button's label is fainter than a lit card's (${refused.labelAlpha} vs ${lit.labelAlpha})`
  );

  const flat = state('panel.flat', 'rest').flat || {};
  ok(
    flat.body === rgbOf(tokens.color('color.hud.body')) &&
      flat.frame === rgbOf(tokens.color('color.hud.frame')) &&
      String(flat.outline).includes(rgbOf(tokens.color('color.hud.outline'))),
    `a flat panel paints the body, frame and outline tokens (${flat.body}, ${flat.frame}, ${flat.outline})`
  );
  const slotFilled = state('card.horizontal', 'filled'),
    slotLive = state('card.horizontal', 'live'),
    slotDimmed = state('card.horizontal', 'dimmed');
  ok(
    slotLive.slotTextColour === rgbOf(tokens.color('color.hud.expFill')) &&
      slotFilled.slotTextColour !== slotLive.slotTextColour,
    `a horizontal card's live text is the EXP token and plain text is not (${slotLive.slotTextColour})`
  );
  ok(
    slotDimmed.slotOpacity < slotFilled.slotOpacity,
    `a dimmed horizontal card is fainter than a filled one (${slotDimmed.slotOpacity} vs ${slotFilled.slotOpacity})`
  );
}

// The states each square piece has in the game (155c-2 plan)
const SQUARE_STATES = { 'square.item': ['filled', 'empty'], 'grid.item': ['twoColumns', 'fourColumns'] };
const GRID_COLUMNS = { twoColumns: 2, fourColumns: 4 };
async function checkSquaresPage(page, tokens) {
  const drawn = await page.evaluate(() => {
    window.libShow('primitives/squares');
    const states = {};
    for (const stage of document.querySelectorAll('[data-state]')) {
      const slots = [...stage.querySelectorAll('.hud-grid-slot')],
        firstTop = slots.length ? Math.round(slots[0].getBoundingClientRect().top) : null,
        opacityOf = (element) => (element ? Number(getComputedStyle(element).opacity) : null);
      states[stage.dataset.state] = {
        drawn: !!stage.firstElementChild && stage.firstElementChild.getBoundingClientRect().width > 0,
        fills: [...stage.querySelectorAll('svg rect')].map((rect) => String(rect.getAttribute('fill')).toLowerCase()),
        firstRow: slots.filter((slot) => Math.round(slot.getBoundingClientRect().top) === firstTop).length,
        lockedOpacity: opacityOf(stage.querySelector('.hud-grid-slot.is-locked')),
        filledOpacity: opacityOf(stage.querySelector('.hud-grid-slot.is-filled')),
      };
    }
    const patternIds = ['hud-bar-checker', 'hud-type-checker', 'hud-slot-grid'],
      patterns = patternIds.filter((id) => document.getElementById(id));
    return { states, patterns, text: document.getElementById('main').innerText };
  });
  const state = (name, id) => drawn.states[name + ':' + id] || {};

  const missing = Object.entries(SQUARE_STATES).flatMap(([name, ids]) =>
    ids.filter((id) => !state(name, id).drawn || !drawn.text.includes(name + '.' + id)).map((id) => name + '.' + id)
  );
  ok(
    missing.length === 0,
    `the Squares page draws every state under its full name (${Object.values(SQUARE_STATES).flat().length})` +
      (missing.length ? ', missing ' + missing.join(' ') : '')
  );
  ok(
    drawn.patterns.length === 3 && state('square.item', 'filled').fills.includes('url(#hud-bar-checker)'),
    `the board defines the shared fills and a square paints one (${drawn.patterns.join(', ')})`
  );
  const lvFill = tokens.color('color.hud.lvFill').toLowerCase(),
    slate = tokens.color('color.hud.slate').toLowerCase();
  const filledFills = state('square.item', 'filled').fills,
    emptyFills = state('square.item', 'empty').fills;
  ok(
    filledFills.includes(lvFill) &&
      !filledFills.includes(slate) &&
      emptyFills.includes(slate) &&
      !emptyFills.includes(lvFill),
    "a filled square's rim is color.hud.lvFill and an empty one's color.hud.slate"
  );
  const pocket = state('grid.item', 'twoColumns');
  ok(
    pocket.lockedOpacity !== null && pocket.lockedOpacity < pocket.filledOpacity,
    `a locked slot is fainter than a filled one (${pocket.lockedOpacity} vs ${pocket.filledOpacity})`
  );
  const wrongColumns = Object.entries(GRID_COLUMNS)
    .filter(([id, columns]) => state('grid.item', id).firstRow !== columns)
    .map(([id]) => id + ' has ' + state('grid.item', id).firstRow);
  ok(
    wrongColumns.length === 0,
    'the grids lay out two and four across' + (wrongColumns.length ? ': ' + wrongColumns.join(', ') : '')
  );
}

// The states each bar has in the game (155c-3 plan); the life bar's from fullest to emptiest
const BAR_STATES = {
  'bar.life': ['high', 'middle', 'low', 'empty', 'cut', 'narrow'],
  'bar.timer': ['chip', 'prompt', 'weather'],
};
const LIFE_FROM_FULLEST = ['high', 'middle', 'low', 'empty'];
async function checkBarsPage(page, tokens) {
  const drawn = await page.evaluate(() => {
    window.libShow('primitives/bars');
    const props = {};
    for (const story of G.Lib.BarStories || [])
      for (const state of story.states) {
        const { band, fraction, light, base, drainsRight } = state.props;
        props[story.name + ':' + state.id] = { band, fraction, light, base, drainsRight: !!drainsRight };
      }
    const states = {};
    for (const stage of document.querySelectorAll('[data-state]')) {
      const fill = stage.querySelector('.hud-lifebar-fill'),
        shape = stage.querySelector('.hud-lifebar svg'),
        timer = stage.querySelector('.bar-timer');
      states[stage.dataset.state] = {
        drawn: !!stage.firstElementChild && stage.firstElementChild.getBoundingClientRect().height > 0,
        fillDrawn: fill ? fill.getBoundingClientRect().width : null,
        fillImage: fill ? getComputedStyle(fill).backgroundImage : '',
        pieces: stage.querySelectorAll('.hud-lifebar-piece').length,
        shapeWidth: shape ? shape.getBoundingClientRect().width : null,
        shapeFills: [...stage.querySelectorAll('svg rect')].map((rect) => String(rect.getAttribute('fill'))),
        timerDrawn: timer ? timer.getBoundingClientRect().width : null,
        timerBox: timer ? timer.offsetWidth : null,
        timerOriginX: timer ? parseFloat(getComputedStyle(timer).transformOrigin) : null,
        timerImage: timer ? getComputedStyle(timer).backgroundImage : '',
      };
    }
    return { states, props, text: document.getElementById('main').innerText };
  });
  const state = (name, id) => drawn.states[name + ':' + id] || {};
  const given = (name, id) => drawn.props[name + ':' + id] || {};

  const missing = Object.entries(BAR_STATES).flatMap(([name, ids]) =>
    ids.filter((id) => !state(name, id).drawn || !drawn.text.includes(name + '.' + id)).map((id) => name + '.' + id)
  );
  ok(
    missing.length === 0,
    `the Bars page draws every state under its full name (${Object.values(BAR_STATES).flat().length})` +
      (missing.length ? ', missing ' + missing.join(' ') : '')
  );

  const fills = LIFE_FROM_FULLEST.map((id) => state('bar.life', id).fillDrawn);
  ok(
    fills.every((width, index) => index === 0 || width < fills[index - 1]) && fills[fills.length - 1] === 0,
    `the life bar's fill shrinks from high to middle to low, and a fainted bar has none (${fills.join(', ')})`
  );
  const wrongBands = ['high', 'middle', 'low', 'cut', 'narrow']
    .filter((id) => {
      const band = given('bar.life', id).band;
      return !state('bar.life', id).fillImage.includes(rgbOf(tokens.color('color.hp.' + band + '.fill')));
    })
    .map((id) => 'bar.life.' + id);
  ok(
    wrongBands.length === 0,
    "each life bar's fill paints its band's fill token" + (wrongBands.length ? ': ' + wrongBands.join(', ') : '')
  );
  ok(
    state('bar.life', 'cut').pieces > 0 && state('bar.life', 'high').pieces === 0,
    `a cut life bar shows the lost piece; a steady one shows none (${state('bar.life', 'cut').pieces})`
  );
  ok(
    state('bar.life', 'high').shapeFills.includes('url(#hud-bar-checker)'),
    "the life bar's shape paints the bar checker fill"
  );
  ok(
    state('bar.life', 'narrow').shapeWidth < state('bar.life', 'high').shapeWidth,
    'a narrow life bar is narrower (' +
      `${state('bar.life', 'narrow').shapeWidth} vs ${state('bar.life', 'high').shapeWidth})`
  );

  const TIMER_SLACK = 0.02;
  const offFraction = BAR_STATES['bar.timer']
    .filter((id) => {
      const shown = state('bar.timer', id);
      const drawnFraction = shown.timerBox ? shown.timerDrawn / shown.timerBox : null;
      return drawnFraction === null || Math.abs(drawnFraction - given('bar.timer', id).fraction) > TIMER_SLACK;
    })
    .map((id) => 'bar.timer.' + id);
  ok(
    offFraction.length === 0,
    "each timer's drawn length follows its fraction" + (offFraction.length ? ': ' + offFraction.join(', ') : '')
  );
  const weather = state('bar.timer', 'weather'),
    weatherGiven = given('bar.timer', 'weather'),
    chip = state('bar.timer', 'chip');
  ok(
    weatherGiven.drainsRight && weather.timerOriginX === weather.timerBox && chip.timerOriginX === 0,
    'the weather timer holds its right end; the chip timer its left (' +
      `${weather.timerOriginX} of ${weather.timerBox}, ${chip.timerOriginX})`
  );
  ok(
    weather.timerImage.includes(rgbOf(weatherGiven.light)) && weather.timerImage.includes(rgbOf(weatherGiven.base)),
    `the weather timer paints the two colours it was given (${weather.timerImage})`
  );
}

// The dialog's states (155c-4 plan)
const MODAL_STATES = ['confirm', 'withNote', 'cancelFocused', 'notice', 'longMessage'];
async function checkModalPage(page, tokens) {
  const drawn = await page.evaluate(() => {
    window.libShow('primitives/modal');
    const props = {};
    for (const state of (G.Lib.ModalStories[0] || { states: [] }).states) props[state.id] = state.props;
    const states = {};
    for (const stage of document.querySelectorAll('[data-state]')) {
      const box = stage.querySelector('.modal-dialog'),
        message = stage.querySelector('.modal-message'),
        buttons = [...stage.querySelectorAll('.modal-button')];
      states[stage.dataset.state.split(':')[1]] = {
        drawn: !!box && box.getBoundingClientRect().height > 0,
        body: box ? getComputedStyle(box).backgroundColor : '',
        frame: box ? getComputedStyle(box).borderTopColor : '',
        outline: box ? getComputedStyle(box).boxShadow : '',
        text: stage.innerText,
        buttons: buttons.length,
        green: buttons
          .map((entry, index) => (entry.querySelector('.focused') ? index : -1))
          .filter((index) => index >= 0),
        greenFills: [...stage.querySelectorAll('.modal-button .focused svg rect')].map((rect) =>
          String(rect.getAttribute('fill')).toLowerCase()
        ),
        messageLines: message ? Math.round(message.offsetHeight / parseFloat(getComputedStyle(message).lineHeight)) : 0,
      };
    }
    return { states, props, text: document.getElementById('main').innerText };
  });
  const state = (id) => drawn.states[id] || {};

  const missing = MODAL_STATES.filter((id) => !state(id).drawn || !drawn.text.includes('modal.dialog.' + id));
  ok(
    missing.length === 0,
    `the Modal page draws every state under its full name (${MODAL_STATES.length})` +
      (missing.length ? ', missing ' + missing.join(' ') : '')
  );
  const box = state('confirm');
  ok(
    box.body === rgbOf(tokens.color('color.hud.body')) &&
      box.frame === rgbOf(tokens.color('color.hud.frame')) &&
      String(box.outline).includes(rgbOf(tokens.color('color.hud.outline'))),
    `the dialog's box paints the panel.flat tokens (${box.body}, ${box.frame})`
  );
  const focusBase = tokens.ramp('color.rim.focus').base.toLowerCase();
  const wrongGreen = MODAL_STATES.filter((id) => {
    const wanted = (drawn.props[id] && drawn.props[id].focus) || 0;
    return state(id).green.join() !== String(wanted) || !state(id).greenFills.includes(focusBase);
  });
  ok(
    wrongGreen.length === 0,
    'exactly one button is green, the one asked for, and it draws color.rim.focus' +
      (wrongGreen.length ? ': ' + wrongGreen.join(', ') : '')
  );
  ok(
    state('notice').buttons === 1 && state('confirm').buttons === 2,
    `a notice has one button, a question two (${state('notice').buttons}, ${state('confirm').buttons})`
  );
  const unshown = MODAL_STATES.filter((id) => {
    const given = drawn.props[id] || {};
    return [given.title, given.message, given.note].filter(Boolean).some((text) => !state(id).text.includes(text));
  });
  ok(
    unshown.length === 0,
    'every dialog shows its title, message and note' + (unshown.length ? ': missing on ' + unshown.join(', ') : '')
  );
  ok(
    state('longMessage').messageLines > state('confirm').messageLines,
    `a long message wraps to more lines (${state('longMessage').messageLines} vs ${state('confirm').messageLines})`
  );
}

(async () => {
  ok(paletteStart > 0 && paletteEnd > paletteStart, 'HUD-STYLE has a "Colour palette" section before "Shapes"');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push('pageerror: ' + error.message));
  page.on('requestfailed', (request) => errors.push('requestfailed: ' + request.url()));
  await page.goto(url.pathToFileURL(path.join(root, 'tools', 'ui-library.html')).href, { waitUntil: 'load' });
  const fonts = await page.evaluate(() => window.libFontsReady);
  // The page shows one tab at a time, so the colours shown are gathered tab by tab (hidden text is not shown text).
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll('header nav [data-tab]')].map((tab) => tab.dataset.tab)
  );
  let shownText = '';
  for (const tab of tabs) {
    // a line break between tabs, so a hex at the end of one tab is not glued to the next tab's first word
    shownText +=
      (await page.evaluate((name) => {
        window.libShowTab(name);
        return document.body.innerText;
      }, tab)) + '\n';
  }
  const shown = hexesIn(shownText);
  ok(tabs.length >= 8, `the page has its ${tabs.length} tabs`);

  // The page loads the game's own scripts: dev.html's list in its order, minus the boot, the run and the network stack.
  const scriptsOf = (file, pattern) =>
    [...fs.readFileSync(path.join(root, file), 'utf8').matchAll(pattern)].map((match) => match[1]);
  const LEFT_OUT = /^js\/(main|game)\.js$|^js\/core\/firebase-config\.js$|^js\/net\//;
  const gameScripts = scriptsOf('dev.html', /<script defer src="([^"]+)"/g).filter((src) => !LEFT_OUT.test(src));
  const libraryScripts = scriptsOf('tools/ui-library.html', /<script src="([^"]+)"/g);
  ok(
    gameScripts.join() === libraryScripts.join(),
    `the page loads dev.html's ${gameScripts.length} game scripts in the same order` +
      (gameScripts.join() === libraryScripts.join()
        ? ''
        : ': missing ' +
          gameScripts.filter((src) => !libraryScripts.includes(src)).join(' ') +
          ', extra ' +
          libraryScripts.filter((src) => !gameScripts.includes(src)).join(' '))
  );

  ok(errors.length === 0, 'page loads with no errors' + (errors.length ? ': ' + errors.join('; ') : ''));
  const missingSpec = [...hudStyleColours].filter((hex) => !shown.has(hex));
  ok(
    missingSpec.length === 0,
    `all ${hudStyleColours.size} HUD-STYLE palette colours are shown` +
      (missingSpec.length ? ', missing ' + missingSpec.join(' ') : '')
  );
  const missingReference = [...referenceColours].filter((hex) => !shown.has(hex));
  ok(
    missingReference.length === 0,
    `all ${referenceColours.size} UI-PALETTES colours are shown` +
      (missingReference.length ? ', missing ' + missingReference.join(' ') : '')
  );
  const unloaded = fonts.filter(([, loaded]) => !loaded).map(([family]) => family);
  ok(
    fonts.length >= 6 && unloaded.length === 0,
    `all ${fonts.length} font faces load` + (unloaded.length ? ', failed ' + unloaded.join(' ') : '')
  );

  // Components: each kit piece mounts with a drawn shape (non-zero size), and every image it asks for loads.
  const pieces = await page.evaluate(() => {
    window.libShowTab('bits');
    const sized = (selector) =>
      [...document.querySelectorAll('#components-body ' + selector)].filter((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      }).length;
    const images = [...document.querySelectorAll('#components-body img')];
    return {
      slots: sized('.hud-slot'),
      cards: sized('.hud-roster-row'),
      lifeBars: sized('.hud-lifebar svg'),
      chips: sized('.hud-chip svg'),
      buttons: sized('.pm-button svg'),
      squares: sized('.hud-item-square svg'),
      cursors: sized('.hud-cursor'),
      menuRows: (window.libShowTab('menu'), document.querySelectorAll('#menu-body .bw-row').length),
      images: images.length,
      brokenImages: images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src),
    };
  });
  const expected = { slots: 4, cards: 4, lifeBars: 3, chips: 14, buttons: 4, squares: 6, cursors: 8, menuRows: 6 };
  const short = Object.keys(expected).filter((name) => pieces[name] !== expected[name]);
  ok(
    short.length === 0,
    'every component mounts with a drawn shape' +
      (short.length ? ': ' + short.map((name) => `${name} ${pieces[name]}/${expected[name]}`).join(', ') : '')
  );
  ok(
    pieces.images > 0 && pieces.brokenImages.length === 0,
    `all ${pieces.images} component images load (portraits, type glyphs)` +
      (pieces.brokenImages.length ? ', broken ' + pieces.brokenImages.join(' ') : '')
  );

  // Run panels: the real HUD panels show what the fake run holds. Each count is read from the run the page built.
  await page.evaluate(() => window.libShowTab('run'));
  await page.waitForTimeout(300);
  const hud = await page.evaluate(() => {
    const count = (selector) => document.querySelectorAll('.lib-screen .hud-overlay ' + selector).length;
    const player = G.Game.player,
      roster = G.Game.roster;
    return {
      inBox: !!document.querySelector('[data-screen-slot="run"] .lib-screen .hud-overlay'),
      rows: [count('.hud-roster-row'), roster.length],
      heldIcons: [count('.hud-roster-held .hud-item-icon'), roster.filter((member) => member.item).length],
      berryIcons: [count('.hud-berry-bag .hud-item-icon'), player.berries.length],
      runIcons: [count('.hud-run-icon'), player.runItems.length],
      moveSlots: [count('.hud-slot'), player.slots.length],
      panels: ['.hud-player', '.hud-map', '.hud-dps', '.hud-roster', '.hud-run-items'].filter(
        (selector) => !count(selector)
      ),
    };
  });
  ok(hud.inBox, 'the HUD layer sits inside the Run panels screen box');
  ok(
    hud.panels.length === 0,
    'every run panel mounts' + (hud.panels.length ? ', missing ' + hud.panels.join(' ') : '')
  );
  const hudCounts = ['rows', 'heldIcons', 'berryIcons', 'runIcons', 'moveSlots'];
  const hudWrong = hudCounts.filter((name) => hud[name][0] !== hud[name][1]);
  ok(
    hudWrong.length === 0 && hud.heldIcons[1] === 4 && hud.berryIcons[1] === 2 && hud.runIcons[1] === 1,
    'the run panels show the fake run: ' + hudCounts.map((name) => `${name} ${hud[name][0]}/${hud[name][1]}`).join(', ')
  );

  // Pause panels: the real pause menu opens over the same run.
  await page.evaluate(() => window.libShowTab('pause'));
  await page.waitForTimeout(500);
  const pause = await page.evaluate(() => {
    const menu = document.querySelector('.lib-screen .pause-menu');
    const valueOf = (label) => {
      const row = [...document.querySelectorAll('.pm-info-label')].find((cell) => cell.textContent.trim() === label);
      return row ? row.nextElementSibling && row.nextElementSibling.textContent.trim() : null;
    };
    return {
      open:
        !!menu &&
        !menu.classList.contains('pm-hidden') &&
        !!document.querySelector('[data-screen-slot="pause"] .pause-menu'),
      cards: [document.querySelectorAll('.pm-team-card').length, G.Game.roster.length],
      kills: [valueOf('Kills'), G.Game.player.kills.toLocaleString('en-US')],
      name: [(document.querySelector('.pm-detail-name') || {}).textContent, G.Game.player.mon.name],
      panels: ['.pm-panel-info', '.pm-panel-detail', '.pm-panel-team', '.pm-panel-inventory'].filter(
        (selector) => !document.querySelector(selector)
      ),
    };
  });
  ok(pause.open, 'the pause menu opens inside the Pause panels screen box');
  ok(
    pause.panels.length === 0,
    'all four pause panels mount' + (pause.panels.length ? ', missing ' + pause.panels.join(' ') : '')
  );
  ok(
    pause.cards[0] === pause.cards[1] &&
      pause.kills[0] === pause.kills[1] &&
      (pause.name[0] || '').trim() === pause.name[1],
    `the pause panels show the fake run: team cards ${pause.cards.join('/')}, Run Info kills ${pause.kills.join('/')}, detail ${pause.name.join('/')}`
  );

  // Fonts by panel: on both screens, every panel that is mounted and draws text names the face it draws in.
  const fontTables = [];
  for (const tab of ['run', 'pause']) {
    await page.evaluate((name) => window.libShowTab(name), tab);
    await page.waitForTimeout(400);
    fontTables.push(
      await page.evaluate((name) => {
        const rows = [...document.querySelectorAll(`[data-font-table="${name}"] tr[data-panel]`)];
        const unnamed = rows.filter((row) => {
          const panel = document.querySelector('.lib-screen ' + row.dataset.panel);
          const hasText = panel && panel.textContent.trim();
          return hasText && !row.querySelector('td:last-child b');
        });
        return { name, rows: rows.length, unnamed: unnamed.map((row) => row.dataset.panel) };
      }, tab)
    );
  }
  ok(
    fontTables.every((table) => table.rows >= 5 && table.unnamed.length === 0),
    'each screen lists the font of every panel that draws text: ' +
      fontTables
        .map(
          (table) =>
            `${table.name} ${table.rows} rows` +
            (table.unnamed.length ? ', no font for ' + table.unnamed.join(' ') : '')
        )
        .join('; ')
  );

  // A new random team rebuilds the run, and the page never writes the browser's save storage (file:// pages share it with the game).
  const seedBefore = await page.evaluate(() => document.querySelector('[data-team-list]').textContent);
  await page.click('#pause-panels [data-reroll]');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    team: document.querySelector('[data-team-list]').textContent,
    stored: localStorage.length,
  }));
  ok(after.team !== seedBefore, 'New random team builds a different run');
  ok(after.stored === 0, `the page writes nothing to localStorage (${after.stored} keys)`);

  // The chips use the game's .type rule: its rim is an inset box shadow, which only style.css supplies.
  const chips = await page.evaluate(() =>
    [...document.querySelectorAll('#type-chips .type')].map((chip) => getComputedStyle(chip).boxShadow)
  );
  ok(
    chips.length === 18 && chips.every((shadow) => /inset/.test(shadow)),
    `18 type chips take the game's .type rim (${chips.length} found)`
  );
  const unreadVars = await page.evaluate(
    () => [...document.querySelectorAll('#screen-vars td')].filter((cell) => cell.textContent === '(not found)').length
  );
  ok(
    unreadVars === 0,
    'every screen variable reads a value from the game CSS' + (unreadVars ? ` (${unreadVars} not found)` : '')
  );

  await checkBoard(browser);

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
