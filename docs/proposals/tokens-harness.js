// Design tokens (#128 S6) offline checks (Node only). Usage from the repo root:  node docs/proposals/tokens-harness.js
// Loads the real js/ui/lib/tokens/tokens.js (it runs without a page). The checks:
//   wiring  every colour token resolves through its aliases to a colour (a wrong or circular alias name throws on the
//           first screen that draws it, so it fails here first)
//   shape   the Unified palette (decision 2026-11-18-155-unified-palette) is whole: 7 greys and 7 ramps of light, base
//           and dark, every one a #rrggbb, no two the same
//   does-what-it-says  the greys run dark to light in their listed order, and every ramp's light is lighter than its
//           base and its base lighter than its dark (relations between the token values, no value copied in)
const fs = require('fs'),
  vm = require('vm');
global.window = global;
const FILE = 'js/ui/lib/tokens/tokens.js';
vm.runInThisContext(fs.readFileSync(FILE, 'utf8'), { filename: FILE });
let fail = 0,
  n = 0;
const ok = (condition, message) => {
  n++;
  if (!condition) {
    fail++;
    console.log('FAIL ' + message);
  }
};
const tokens = G.Tokens.palettes.flatMap((palette) => palette.colours);
const HEX = /^#[0-9a-f]{6}$/i,
  RGBA = /^rgba\(/;
const resolve = (name) => {
  try {
    return G.Tokens.color(name);
  } catch (error) {
    return null;
  }
};

// wiring
for (const token of tokens) {
  const colour = resolve(token.name);
  ok(colour && (HEX.test(colour) || RGBA.test(colour)), token.name + ' resolves to a colour (got ' + colour + ')');
}

// shape
const GREYS = ['ink', 'panel', 'raised', 'slate', 'mid', 'paper', 'white'],
  RAMPS = ['red', 'green', 'blue', 'yellow', 'purple', 'pink', 'teal'],
  TONES = ['light', 'base', 'dark'];
const unifiedNames = [
  ...GREYS.map((grey) => 'color.grey.' + grey),
  ...RAMPS.flatMap((ramp) => TONES.map((tone) => 'color.' + ramp + '.' + tone)),
];
const unified = unifiedNames.map(resolve);
unifiedNames.forEach((name, index) => ok(unified[index] && HEX.test(unified[index]), name + ' is a #rrggbb colour'));
ok(
  new Set(unified.map((colour) => colour && colour.toLowerCase())).size === unifiedNames.length,
  'the ' + unifiedNames.length + ' Unified colours are all different'
);

// does what it says: lightness (relative luminance) orders the greys and each ramp's tones
const luminance = (hex) => {
  const [red, green, blue] = [1, 3, 5].map((at) => {
    const value = parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};
const lighter = (lighterName, darkerName) => {
  const one = resolve(lighterName),
    two = resolve(darkerName);
  return !!one && !!two && luminance(one) > luminance(two);
};
GREYS.slice(1).forEach((grey, index) =>
  ok(lighter('color.grey.' + grey, 'color.grey.' + GREYS[index]), 'grey.' + grey + ' is lighter than grey.' + GREYS[index])
);
for (const ramp of RAMPS) {
  ok(lighter('color.' + ramp + '.light', 'color.' + ramp + '.base'), ramp + ': light is lighter than base');
  ok(lighter('color.' + ramp + '.base', 'color.' + ramp + '.dark'), ramp + ': base is lighter than dark');
}

console.log(fail ? 'tokens harness: ' + fail + ' FAILED of ' + n : 'tokens harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
