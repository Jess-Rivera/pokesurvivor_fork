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
// in every state it has in the game; its rims are the rim tokens (read from tokens.js); a refused label is fainter than a
// resting one; disabled cannot be pressed and refused can; each button lists its place names.
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
  await context.close();
}

// The states each button has in the game (155b plan): the slot button has no disabled or refused today.
const BUTTON_STATES = { 'button.slot': ['rest', 'focused'], 'button.team': ['rest', 'focused', 'refused', 'disabled'] };
// The rim each state must show: refused keeps the resting rim.
const BUTTON_RIMS = {
  'button.slot:rest': 'rest',
  'button.slot:focused': 'focus',
  'button.team:rest': 'rest',
  'button.team:focused': 'focus',
  'button.team:refused': 'rest',
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

  const restBase = tokens.ramp('color.rim.rest').base.toLowerCase(),
    focusBase = tokens.ramp('color.rim.focus').base.toLowerCase();
  const rimOf = (key) => {
    const fills = (drawn.states[key] || {}).fills || [];
    if (fills.includes(focusBase) && !fills.includes(restBase)) return 'focus';
    if (fills.includes(restBase) && !fills.includes(focusBase)) return 'rest';
    return 'neither';
  };
  const wrongRims = Object.entries(BUTTON_RIMS)
    .filter(([key, rim]) => rimOf(key) !== rim)
    .map(([key]) => key + ' shows ' + rimOf(key));
  ok(
    wrongRims.length === 0,
    'the rims are the tokens: color.rim.rest at rest and refused, color.rim.focus focused' +
      (wrongRims.length ? ': ' + wrongRims.join(', ') : '')
  );

  const team = (state) => drawn.states['button.team:' + state] || {};
  ok(
    team('refused').labelAlpha !== null && team('refused').labelAlpha < team('rest').labelAlpha,
    `a refused label is fainter than a resting one (${team('refused').labelAlpha} vs ${team('rest').labelAlpha})`
  );
  ok(
    team('disabled').disabled === true && team('refused').disabled === false,
    'a disabled button cannot be pressed; a refused one still can (it says why)'
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
