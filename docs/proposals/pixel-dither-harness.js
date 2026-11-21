// Two-type rim dither (#128 catch.window) offline checks (Node only). Usage from the repo root:
//   node docs/proposals/pixel-dither-harness.js
// Loads the real js/ui/lib/primitives/pixels/pixels.js (or PD_PIXELS, for docs/proposals/pixel-dither-mutate.js)
// twice, each in a fresh context with no Preact, so only its pure part is there. Expected outcomes are the rule in
// decision 2026-11-20-155-two-type-team-slot-rim-dithered-middle-band, never copied from the code's output:
//   - the first type everywhere left of the dithered band and the second everywhere right of it, the band being the
//     middle quarter of the width (rounded), dithered (both types inside it)
//   - across a row the second type's share never falls from one 8 px block to the next (the density climbs evenly)
//   - the same size always gives the same pattern (seeded), and the top and bottom rows are shuffled differently
//   - a painted rim pixel is one ramp's colour whole; every other letter keeps its own colour; a second colouring of
//     the same grid paints with its own colours (the paint cache keys on both ramps)
const fs = require('fs'),
  vm = require('vm');
const FILE = process.env.PD_PIXELS || 'js/ui/lib/primitives/pixels/pixels.js';
const source = fs.readFileSync(FILE, 'utf8');
/** pixels.js's pure part, loaded into a fresh context (its caches start empty). */
function load() {
  const sandbox = { G: {} };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: FILE });
  return sandbox.G.Lib.Pixels;
}
let fail = 0,
  n = 0;
const ok = (condition, message) => {
  n++;
  if (!condition) {
    fail++;
    console.log('FAIL ' + message);
  }
};
const RULE = { band: 0.25, block: 8 }; // the decision's middle 25%; the board's 8 px shuffle block
// art sizes: the run HUD roster row (139 x 32), the catch screen's Pokemon panel (170 x 192), a small box
const SIZES = [
  [139, 32],
  [170, 192],
  [60, 20],
];
const first = load(),
  second = load();
ok(first && first.ready === false && typeof first.twoTypeRimMask === 'function', 'pixels.js gives its pure part with no Preact');

for (const [width, rows] of SIZES) {
  const size = width + ' x ' + rows,
    mask = first.twoTypeRimMask(width, rows),
    band = Math.round(RULE.band * width),
    bandStart = (width - band) / 2,
    bandEnd = bandStart + band;
  ok(mask.length === rows && mask.every((line) => line.length === width), size + ': one mask cell per pixel');
  let leftPure = true,
    rightPure = true,
    seenFirst = false,
    seenSecond = false;
  mask.forEach((line) =>
    line.forEach((takesSecond, x) => {
      if (x + 1 <= bandStart && takesSecond) leftPure = false;
      if (x >= bandEnd && !takesSecond) rightPure = false;
      if (x + 1 > bandStart && x < bandEnd) {
        if (takesSecond) seenSecond = true;
        else seenFirst = true;
      }
    })
  );
  ok(leftPure, size + ': every pixel left of the middle quarter is the first type');
  ok(rightPure, size + ': every pixel right of the middle quarter is the second type');
  ok(seenFirst && seenSecond, size + ': the middle quarter is dithered (both types inside it)');
  let climbs = true;
  mask.forEach((line) => {
    let previous = -1;
    for (let start = 0; start < width; start += RULE.block) {
      const block = line.slice(start, start + RULE.block),
        share = block.filter(Boolean).length / block.length;
      if (share < previous) climbs = false;
      previous = share;
    }
  });
  ok(climbs, size + ": across every row the second type's share never falls from one block to the next");
  ok(
    JSON.stringify(second.twoTypeRimMask(width, rows)) === JSON.stringify(mask),
    size + ': the same size gives the same pattern in a fresh load (seeded)'
  );
  ok(
    JSON.stringify(mask[0]) !== JSON.stringify(mask[rows - 1]),
    size + ': the top and bottom rows are shuffled differently'
  );
}

// painting: a rim of every rim letter (L, B, D) round an outline and a body, two ramps
const [width, rows] = SIZES[0];
const grid = Array.from({ length: rows }, (_, row) => {
  const rimLetter = 'LBD'[row % 3];
  return 'o' + rimLetter + 'G'.repeat(width - 4) + rimLetter + 'o';
});
const colours = { o: '#000001', L: '#0000a1', B: '#0000b1', D: '#0000d1', G: '#000009' };
const rampOne = { light: '#a10000', base: '#b10000', dark: '#d10000' },
  rampTwo = { light: '#00a100', base: '#00b100', dark: '#00d100' };
const PART = { L: 'light', B: 'base', D: 'dark' };
function paintedRightly(ramp) {
  const mask = first.twoTypeRimMask(width, rows),
    paint = first.twoTypeLetterRows(grid, colours, ramp);
  return grid.every((line, row) => {
    const pixels = [];
    for (const [x, runWidth, fill] of paint(row)) for (let step = 0; step < runWidth; step++) pixels[x + step] = fill;
    return [...line].every((letter, x) => {
      const rim = letter in PART;
      return pixels[x] === (rim && mask[row][x] ? ramp[PART[letter]] : colours[letter]);
    });
  });
}
ok(paintedRightly(rampOne), 'every rim pixel is one ramp\'s colour whole, every other letter its own colour');
ok(paintedRightly(rampTwo), 'a second colouring of the same grid paints with its own ramp (the cache keys on both)');

console.log(fail ? 'pixel-dither harness: ' + fail + ' FAILED of ' + n : 'pixel-dither harness: ' + n + '/' + n + ' checks passed');
process.exit(fail ? 1 : 0);
