// tools/smoke-ui-library.js: headless check for the UI Library dev page (tools/ui-library.html, #147). A check, not a harness:
// check.js syntax-checks it. Playwright is NOT a repo dependency (PLAYWRIGHT_DIR, default C:\Users\boric\tools\playwright).
// Usage from the repo root: node tools/smoke-ui-library.js
// Relations checked (docs/TEST-FIRST.md): every colour docs/HUD-STYLE.md "Colour palette" and docs/UI-PALETTES.md list is shown on
// the page, every font face the page names loads, and the type chips take the game's real .type class look. The expected colours
// are read from the docs, never from the page.
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

(async () => {
  ok(paletteStart > 0 && paletteEnd > paletteStart, 'HUD-STYLE has a "Colour palette" section before "Shapes"');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push('pageerror: ' + error.message));
  page.on('requestfailed', (request) => errors.push('requestfailed: ' + request.url()));
  await page.goto(url.pathToFileURL(path.join(root, 'tools', 'ui-library.html')).href, { waitUntil: 'load' });
  const fonts = await page.evaluate(() => window.libFontsReady);
  const shown = hexesIn(await page.evaluate(() => document.body.innerText));

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

  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
