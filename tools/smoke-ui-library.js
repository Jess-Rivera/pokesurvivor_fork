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
// there and opens a page. The primitive pages (155b to 155c-5; decision 2026-11-18-155-primitive-states-vs-props): each
// piece draws exactly its states (a condition it shows), each under its full name, and lists its props (how a screen
// sets it up) in a table; then each state does what its name says: rims and fills are their tokens (read from
// tokens.js), a refused label is fainter, disabled cannot be pressed, dimmed and fainted are fainter or darker, the life
// bar's fill shrinks by band and a cut leaves a piece, a timer's length follows its fraction, one dialog button is
// green, a portrait is the size asked for and its image loads. The sidebar holds Portraits and the Pause group.
// The Fonts page (155e): see checkFontsPage.
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
    for (const [id, tabs] of Object.entries(window.libTabs))
      for (const tab of tabs) texts[id + ':' + tab] = window.libShow(id, tab);
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
    'Portraits',
    'Pause',
    'pause.pokemonDetail',
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
  await checkFontsPage(page, tokens);
  await checkPrimitivePages(page, tokens);
  await context.close();
}

// ---------- the Fonts page (155e; decision 2026-11-18-155-font-scheme-three-tiers) ----------
// Relations: the scheme's own faces load; every font file in assets/fonts and every file the game's CSS loads is on
// Unified or Reference Not in Game; every face the game's CSS names in a rule has a Fold Map row; each Unified crisp
// size is a whole multiple of its face's grid, and a sample drawn at whole pixels has no half-lit pixel; each counter
// face draws every digit at one width.
const FONT_FILE = /\.(ttf|otf|woff2?)$/i;
/** Every face the game's CSS names first in a rule's font-family (var(--font) is GameFont), @font-face blocks aside. */
function gameRuleFamilies() {
  const families = new Set();
  const cssFiles = [
    ...filesUnder(path.join(root, 'css'), (name) => name.endsWith('.css')),
    ...filesUnder(path.join(root, 'js', 'ui', 'lib'), (name) => name.endsWith('.css')),
  ];
  for (const file of cssFiles) {
    const text = fs
      .readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/@font-face\s*\{[^}]*\}/g, '');
    for (const [, list] of text.matchAll(/font-family:\s*([^;]+);/g)) {
      const first = list.split(',')[0].trim().replace(/['"]/g, '');
      if (first !== 'inherit') families.add(first === 'var(--font)' ? 'GameFont' : first);
    }
  }
  return families;
}

async function checkFontsPage(page, tokens) {
  const scheme = await page.evaluate(async () => ({
    ...window.libFontScheme,
    loaded: await window.libSchemeFontsReady,
    checks: await window.libFontChecks(),
  }));
  const unloaded = scheme.loaded.filter(([, loaded]) => !loaded).map(([family]) => family);
  ok(
    unloaded.length === 0,
    `the scheme's own ${scheme.loaded.length} faces load on the board` +
      (unloaded.length ? ', failed ' + unloaded.join(', ') + ' (Silver 10px: python tools/make_silver_font.py)' : '')
  );

  const onBoard = new Set(scheme.files);
  const fontFiles = fs
    .readdirSync(path.join(root, 'assets', 'fonts'))
    .filter((name) => FONT_FILE.test(name))
    .map((name) => 'assets/fonts/' + name);
  const cssFiles = [...gameFontFaces()].map((face) => face.split('|')[1]);
  const offBoard = [...new Set([...fontFiles, ...cssFiles])].filter((file) => !onBoard.has(file));
  ok(
    offBoard.length === 0,
    `every font file and every file the game's CSS loads is on Unified or Reference (${onBoard.size} on the board)` +
      (offBoard.length ? ', missing ' + offBoard.join(' ') : '')
  );

  const tokenOfFamily = new Map(tokens.fonts.map((font) => [font.family, font.name]));
  const foldedToday = new Set(scheme.folds.flatMap((fold) => fold.today));
  const families = [...gameRuleFamilies()];
  const unfolded = families.filter((family) => !foldedToday.has(tokenOfFamily.get(family)));
  ok(
    unfolded.length === 0,
    `every face the game's CSS names (${families.length}) has a Fold Map row` +
      (unfolded.length ? ', none for ' + unfolded.join(' ') : '')
  );

  const offGrid = scheme.tiers
    .filter((tier) => tier.grid)
    .flatMap((tier) => tier.sizes.filter((size) => size % tier.grid).map((size) => `${tier.family} ${size}`));
  ok(
    offGrid.length === 0,
    'every Unified crisp size is a whole multiple of its grid' + (offGrid.length ? ', off: ' + offGrid.join(', ') : '')
  );
  const blurred = scheme.checks.crisp.filter((sample) => sample.lit === 0 || sample.half > 0);
  ok(
    blurred.length === 0,
    `every Unified crisp sample draws with no half-lit pixel (${scheme.checks.crisp.length} samples)` +
      (blurred.length
        ? ': ' + blurred.map((sample) => `${sample.family} ${sample.size}px (${sample.half} half-lit)`).join(', ')
        : '')
  );
  const twitchy = Object.entries(scheme.checks.digits)
    .filter(([, widths]) => !widths || new Set(widths).size !== 1)
    .map(([family, widths]) => family + (widths ? ' ' + [...new Set(widths)].join('/') : ' (not loaded)'));
  ok(
    twitchy.length === 0,
    'each counter face draws every digit at one width' + (twitchy.length ? ': ' + twitchy.join(', ') : '')
  );
}

// ---------- the primitive pages (decision 2026-11-18-155-primitive-states-vs-props) ----------
// A state is a condition a piece shows (at rest, focused, refused, disabled, dimmed, fainted, filled, empty, an HP
// band); a prop is how a screen sets it up (size, stroke, colours, text, content). The board must draw exactly these
// states, so a prop drawn as a tile fails here.
const PRIMITIVE_STATES = {
  'primitives/buttons': {
    'button.slanted': ['rest', 'focusPositive', 'focusNegative'],
    'button.rounded': ['rest', 'focusPositive', 'focusNegative', 'refused', 'refusedFocus', 'disabled'],
  },
  'primitives/panels': {
    'panel.pixel': ['rest', 'fainted'],
    'panel.thin': ['rest'],
    'card.vertical': ['lit', 'dimmed', 'dimmedButtonLit'],
    'panel.flat': ['rest'],
    'card.horizontal': ['filled', 'empty', 'dimmed'],
    'panel.slanted': ['rest'],
  },
  'primitives/squares': { 'square.item': ['filled', 'empty'], 'grid.item': ['rest'] },
  'primitives/bars': { 'bar.life': ['high', 'middle', 'low', 'empty', 'cut'], 'bar.timer': ['rest'] },
  'primitives/modal': { 'modal.dialog': ['focusConfirm', 'focusCancel'] },
  'primitives/portraits': { 'portrait.round': ['rest', 'active', 'fainted'] },
};
// The rim each button state must show: refused keeps the resting rim; a negative focus is red.
const BUTTON_RIMS = {
  'button.slanted:rest': 'rest',
  'button.slanted:focusPositive': 'focus',
  'button.slanted:focusNegative': 'red',
  'button.rounded:rest': 'rest',
  'button.rounded:focusPositive': 'focus',
  'button.rounded:focusNegative': 'red',
  'button.rounded:refused': 'rest',
  'button.rounded:refusedFocus': 'focus',
};
const LIFE_FROM_FULLEST = ['high', 'middle', 'low', 'empty'];
const TIMER_SLACK = 0.02;
/** A token's hex as the browser writes a computed colour ("rgb(24, 24, 24)"). */
const rgbOf = (hex) => {
  const value = hex.replace('#', '');
  const channel = (index) => parseInt(value.slice(index, index + 2), 16);
  return `rgb(${channel(0)}, ${channel(2)}, ${channel(4)})`;
};

/** Opens a primitive page and reads each state's tile, each piece's props table, and what each state was given. */
function readPrimitivePage(page, pageId) {
  return page.evaluate(async (id) => {
    window.libShow(id);
    const settled = (image) =>
      new Promise((done) => {
        image.addEventListener('load', done);
        image.addEventListener('error', done);
      });
    const images = [...document.querySelectorAll('#main img')];
    await Promise.all(images.map((image) => (image.complete ? null : settled(image))));
    const alphaOf = (colour) => {
      const parts = colour.match(/[\d.]+/g) || [];
      return parts.length > 3 ? Number(parts[3]) : 1;
    };
    const opacityOf = (element) => (element ? Number(getComputedStyle(element).opacity) : null);
    const fillsOf = (root, selector) =>
      [...root.querySelectorAll(selector)].map((rect) => String(rect.getAttribute('fill')).toLowerCase());
    const tiles = {};
    for (const stage of document.querySelectorAll('[data-state]')) {
      const one = (selector) => stage.querySelector(selector);
      const outer = stage.firstElementChild,
        box = outer ? outer.getBoundingClientRect() : { width: 0, height: 0 },
        label = one('.hud-team-button-label, button span'),
        flat = one('.panel-flat'),
        lifeFill = one('.hud-lifebar-fill'),
        timer = one('.bar-timer'),
        face = one('.portrait-round'),
        image = one('img'),
        slots = [...stage.querySelectorAll('.hud-grid-slot')],
        dialogButtons = [...stage.querySelectorAll('.modal-button')];
      const firstTop = slots.length ? Math.round(slots[0].getBoundingClientRect().top) : null;
      tiles[stage.dataset.state] = {
        drawn: box.width > 0 && box.height > 0,
        width: outer ? outer.offsetWidth : 0,
        fills: fillsOf(stage, 'svg rect'),
        labelAlpha: label ? alphaOf(getComputedStyle(label).color) : null,
        disabled: !!one('button') && one('button').disabled,
        cardOpacity: opacityOf(one('.shop-card')),
        nameOpacity: opacityOf(one('.shop-card-name')),
        buttonOpacity: opacityOf(one('.shop-card-buy')),
        slotOpacity: opacityOf(one('.hud-run-item')),
        slotNamed: !!one('.hud-run-name'),
        lockedOpacity: opacityOf(one('.hud-grid-slot.is-locked')),
        filledOpacity: opacityOf(one('.hud-grid-slot.is-filled')),
        firstRow: slots.filter((slot) => Math.round(slot.getBoundingClientRect().top) === firstTop).length,
        flat: flat && {
          body: getComputedStyle(flat).backgroundColor,
          frame: getComputedStyle(flat).borderTopColor,
          outline: getComputedStyle(flat).boxShadow,
        },
        green: dialogButtons
          .map((entry, index) => (entry.querySelector('.focused') ? index : -1))
          .filter((index) => index >= 0),
        greenFills: fillsOf(stage, '.modal-button .focused svg rect'),
        fillDrawn: lifeFill ? lifeFill.getBoundingClientRect().width : null,
        fillImage: lifeFill ? getComputedStyle(lifeFill).backgroundImage : '',
        pieces: stage.querySelectorAll('.hud-lifebar-piece').length,
        timerFraction: timer && timer.offsetWidth ? timer.getBoundingClientRect().width / timer.offsetWidth : null,
        faceRim: face ? getComputedStyle(face).borderTopColor : null,
        dim: face ? Number(getComputedStyle(face, '::after').opacity) : null,
        loaded: !image || (image.complete && image.naturalWidth > 0),
      };
    }
    const tables = {};
    for (const section of document.querySelectorAll('.lib-story'))
      tables[section.dataset.story] = [...section.querySelectorAll('.lib-props tbody tr')].map((row) => ({
        name: row.cells[0].innerText.trim(),
        filled: [...row.cells].every((cell) => cell.innerText.trim().length > 0),
      }));
    const given = {},
      declared = {};
    for (const key of Object.keys(G.Lib).filter((name) => /Stories$/.test(name)))
      for (const story of G.Lib[key]) {
        declared[story.name] = (story.props || []).map((prop) => prop.name);
        for (const state of story.states) {
          const props = state.props || {};
          given[story.name + ':' + state.id] = {
            focus: props.focus || 0,
            columns: props.columns,
            fraction: props.fraction,
            band: props.band,
            size: props.size,
            rim: typeof props.rim === 'string' ? props.rim : null,
            title: props.title,
            message: props.message,
          };
        }
      }
    const patterns = ['hud-bar-checker', 'hud-type-checker', 'hud-slot-grid'].filter((patternId) =>
      document.getElementById(patternId)
    );
    return { tiles, tables, given, declared, patterns, text: document.getElementById('main').innerText };
  }, pageId);
}

async function checkPrimitivePages(page, tokens) {
  const pages = {};
  for (const id of Object.keys(PRIMITIVE_STATES)) pages[id] = await readPrimitivePage(page, id);
  const tile = (id, key) => pages[id].tiles[key] || {};
  const given = (id, key) => pages[id].given[key] || {};

  // every page: exactly its states, each under its full name; every declared prop in its table, filled in
  const wrongStates = [],
    badTables = [];
  let stateCount = 0;
  for (const [id, pieces] of Object.entries(PRIMITIVE_STATES)) {
    const shown = pages[id];
    for (const [name, states] of Object.entries(pieces)) {
      stateCount += states.length;
      const here = Object.keys(shown.tiles)
        .filter((key) => key.startsWith(name + ':'))
        .map((key) => key.split(':')[1]);
      const shows = (state) =>
        here.includes(state) && tile(id, name + ':' + state).drawn && shown.text.includes(name + '.' + state);
      const missing = states.filter((state) => !shows(state));
      const extra = here.filter((state) => !states.includes(state));
      if (missing.length || extra.length)
        wrongStates.push(
          name + (missing.length ? ' missing ' + missing : '') + (extra.length ? ' extra ' + extra : '')
        );
      const table = shown.tables[name] || [],
        declared = shown.declared[name] || [];
      const unlisted = declared.filter((prop) => !table.some((row) => row.name === prop));
      if (!declared.length || unlisted.length || table.some((row) => !row.filled)) badTables.push(name);
    }
  }
  ok(
    wrongStates.length === 0,
    `every primitive page draws exactly its states, each under its full name (${stateCount})` +
      (wrongStates.length ? ': ' + wrongStates.join('; ') : '')
  );
  ok(
    badTables.length === 0,
    'every piece lists its props in a table: name, values and what it does' +
      (badTables.length ? ': not on ' + badTables.join(', ') : '')
  );

  // buttons: each state's rim is its token; refused is fainter and still pressable; disabled cannot be pressed
  const button = (key) => tile('primitives/buttons', key);
  const RIM_BASES = {
    rest: tokens.ramp('color.rim.rest').base.toLowerCase(),
    focus: tokens.ramp('color.rim.focus').base.toLowerCase(),
    red: tokens.ramp('color.rim.sell').base.toLowerCase(),
  };
  const rimOf = (key) => {
    const fills = button(key).fills || [];
    const shown = Object.keys(RIM_BASES).filter((rim) => fills.includes(RIM_BASES[rim]));
    return shown.length === 1 ? shown[0] : 'neither';
  };
  const wrongRims = Object.entries(BUTTON_RIMS)
    .filter(([key, rim]) => rimOf(key) !== rim)
    .map(([key]) => key.replace(':', '.') + ' shows ' + rimOf(key));
  ok(
    wrongRims.length === 0,
    'the button rims are the tokens: rest at rest and refused, focus focused, red on a negative focus' +
      (wrongRims.length ? ': ' + wrongRims.join(', ') : '')
  );
  const rounded = (state) => button('button.rounded:' + state);
  const faint = (refused, plain) => rounded(refused).labelAlpha < rounded(plain).labelAlpha;
  ok(
    faint('refused', 'rest') && faint('refusedFocus', 'focusPositive'),
    `a refused label is fainter than a plain one, at rest and under the cursor (${rounded('refused').labelAlpha})`
  );
  ok(
    rounded('disabled').disabled && !rounded('refused').disabled && !rounded('refusedFocus').disabled,
    'a disabled button cannot be pressed; a refused one still can (it says why)'
  );

  // panels and cards
  const panel = (key) => tile('primitives/panels', key);
  const restBase = tokens.ramp('color.rim.rest').base.toLowerCase(),
    faintedBase = tokens.ramp('color.rim.fainted').base.toLowerCase();
  const pixelRest = panel('panel.pixel:rest').fills || [],
    pixelFainted = panel('panel.pixel:fainted').fills || [];
  ok(
    pixelRest.includes(restBase) &&
      !pixelRest.includes(faintedBase) &&
      pixelFainted.includes(faintedBase) &&
      !pixelFainted.includes(restBase),
    'a pixel panel paints the rest rim at rest and the fainted rim when fainted'
  );
  const lit = panel('card.vertical:lit'),
    dimmed = panel('card.vertical:dimmed'),
    buttonLit = panel('card.vertical:dimmedButtonLit');
  ok(
    dimmed.cardOpacity < lit.cardOpacity &&
      buttonLit.buttonOpacity === lit.buttonOpacity &&
      buttonLit.nameOpacity < lit.nameOpacity,
    'a dimmed card is fainter than a lit one; dimmed with its button lit, only its text dims'
  );
  const flat = panel('panel.flat:rest').flat || {};
  ok(
    flat.body === rgbOf(tokens.color('color.hud.body')) &&
      flat.frame === rgbOf(tokens.color('color.hud.frame')) &&
      String(flat.outline).includes(rgbOf(tokens.color('color.hud.outline'))),
    `a flat panel paints the body, frame and outline tokens (${flat.body}, ${flat.frame})`
  );
  const slotFilled = panel('card.horizontal:filled'),
    slotEmpty = panel('card.horizontal:empty'),
    slotDimmed = panel('card.horizontal:dimmed');
  ok(
    slotFilled.slotNamed && !slotEmpty.slotNamed && slotDimmed.slotOpacity < slotFilled.slotOpacity,
    'a filled horizontal card shows its item and an empty one none; a dimmed one is fainter'
  );
  const slanted = panel('panel.slanted:rest').fills || [];
  ok(
    slanted.includes(restBase) && slanted.includes('url(#hud-slot-grid)'),
    'a slanted panel paints its rim and its body (the slot grid)'
  );

  // squares
  const squares = pages['primitives/squares'],
    square = (key) => tile('primitives/squares', key);
  const lvFill = tokens.color('color.hud.lvFill').toLowerCase(),
    slate = tokens.color('color.hud.slate').toLowerCase();
  const filledFills = square('square.item:filled').fills || [],
    emptyFills = square('square.item:empty').fills || [];
  ok(
    filledFills.includes(lvFill) &&
      !filledFills.includes(slate) &&
      emptyFills.includes(slate) &&
      !emptyFills.includes(lvFill),
    "a filled square's rim is color.hud.lvFill and an empty one's color.hud.slate"
  );
  ok(
    squares.patterns.length === 3 && filledFills.includes('url(#hud-bar-checker)'),
    `the board defines the shared fills and a square paints one (${squares.patterns.join(', ')})`
  );
  const grid = square('grid.item:rest');
  ok(
    grid.lockedOpacity < grid.filledOpacity && grid.firstRow === given('primitives/squares', 'grid.item:rest').columns,
    `a grid lays out its columns and a locked slot is fainter (${grid.firstRow} across)`
  );

  // bars
  const life = (state) => tile('primitives/bars', 'bar.life:' + state);
  const fills = LIFE_FROM_FULLEST.map((state) => life(state).fillDrawn);
  ok(
    fills.every((width, index) => index === 0 || width < fills[index - 1]) && fills[fills.length - 1] === 0,
    `the life bar's fill shrinks from high to middle to low, and a fainted bar has none (${fills.join(', ')})`
  );
  const wrongBands = ['high', 'middle', 'low', 'cut'].filter((state) => {
    const band = given('primitives/bars', 'bar.life:' + state).band;
    return !life(state).fillImage.includes(rgbOf(tokens.color('color.hp.' + band + '.fill')));
  });
  ok(
    wrongBands.length === 0,
    "each life bar's fill paints its band's token" + (wrongBands.length ? ': ' + wrongBands : '')
  );
  ok(
    life('cut').pieces > 0 && life('high').pieces === 0 && (life('high').fills || []).includes('url(#hud-bar-checker)'),
    'a cut life bar shows the lost piece and a steady one none; the shape paints the bar checker'
  );
  const timer = tile('primitives/bars', 'bar.timer:rest'),
    timerGiven = given('primitives/bars', 'bar.timer:rest');
  ok(
    timer.timerFraction !== null && Math.abs(timer.timerFraction - timerGiven.fraction) <= TIMER_SLACK,
    `a timer's drawn length follows its fraction (${timer.timerFraction} for ${timerGiven.fraction})`
  );

  // the dialog
  const focusBase = tokens.ramp('color.rim.focus').base.toLowerCase();
  const wrongGreen = PRIMITIVE_STATES['primitives/modal']['modal.dialog'].filter((state) => {
    const key = 'modal.dialog:' + state;
    const shown = tile('primitives/modal', key);
    const wanted = String(given('primitives/modal', key).focus);
    return String(shown.green) !== wanted || !shown.greenFills.includes(focusBase);
  });
  const dialog = tile('primitives/modal', 'modal.dialog:focusConfirm'),
    dialogGiven = given('primitives/modal', 'modal.dialog:focusConfirm');
  ok(
    wrongGreen.length === 0 && pages['primitives/modal'].text.includes(dialogGiven.message),
    'exactly one dialog button is green, the one asked for, in color.rim.focus; the message shows' +
      (wrongGreen.length ? ': ' + wrongGreen : '')
  );
  ok(
    (dialog.flat || {}).body === rgbOf(tokens.color('color.hud.body')),
    `the dialog's box is a flat panel (${(dialog.flat || {}).body})`
  );

  // portraits
  const portrait = (state) => tile('primitives/portraits', 'portrait.round:' + state);
  const portraitStates = PRIMITIVE_STATES['primitives/portraits']['portrait.round'];
  const wrongSize = portraitStates.filter(
    (state) => portrait(state).width !== given('primitives/portraits', 'portrait.round:' + state).size
  );
  ok(wrongSize.length === 0, 'each portrait is the size it was asked for' + (wrongSize.length ? ': ' + wrongSize : ''));
  const activeRim = given('primitives/portraits', 'portrait.round:active').rim;
  ok(
    portrait('active').faceRim === rgbOf(activeRim) &&
      portrait('rest').faceRim === rgbOf(tokens.color('color.hud.outline')) &&
      portrait('fainted').dim > portrait('rest').dim,
    'an active portrait takes its rim colour, a resting one the outline; a fainted one is darker'
  );
  const unloaded = portraitStates.filter((state) => !portrait(state).loaded);
  ok(unloaded.length === 0, 'every portrait image loads' + (unloaded.length ? ': ' + unloaded : ''));
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
