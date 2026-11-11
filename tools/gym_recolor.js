// tools/gym_recolor.js: recolour each gym building to its type's Bulbapedia Scarlet/Violet colour (#69, docs/HUD-STYLE.md
// "Type colours", read from G.U.TYPE_COLOR in js/core/util.js).
// The type-coloured parts (roof, flaps, door, ball, trims) are the pixels that differ widely between gyms, since the shared
// walls are the same in every gym up to export noise, minus the white emblem. Each such pixel keeps its shading: its lightness and saturation,
// measured against the gym's old roof colour (assets/tileset/gyms/gym-colors.json), carry over onto the SV base colour,
// and its hue moves by the same offset the roof's hue moves. gym-contact.png is a mask, not a gym, and is never touched.
// Usage: node tools/gym_recolor.js --sheet <file.png>   write a before/after contact sheet only (assets untouched)
//        node tools/gym_recolor.js --write              overwrite the 18 gym PNGs, then run node tools/gym_colors.js
// Run it once per palette change: a second run measures against the new roof colours, so rebake gym-colors.json first.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm'),
  { readPng } = require('./gym_contact.js'),
  { encodePng } = require('./png.js');
const root = path.resolve(__dirname, '..'),
  GYM_DIR = path.join(root, 'assets/tileset/gyms'),
  EMBLEM_MIN_CHANNEL = 226, // as tools/gym_colors.js: every channel at least this is the white emblem or white trim
  GREY_SATURATION = 0.08, // a roof below this saturation is grey (Normal): its hue means nothing, so pixels take the target hue
  // The shared walls, windows and door glass are not byte-identical between gyms (export noise and slightly tinted glass),
  // while the type parts differ by 130 or more. A pixel is a type part when one channel spreads at least this far across
  // the gyms. 60 still recoloured window glass; 120 leaves it alone (checked by eye on the before/after sheet, 2026-11-11).
  TYPE_PART_MIN_SPREAD = 120;

// ---------- colour maths (HSL, 0..1) ----------
function toHsl(red, green, blue) {
  const r = red / 255,
    g = green / 255,
    b = blue / 255,
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];
  const delta = max - min,
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const hue = max === r ? (g - b) / delta + (g < b ? 6 : 0) : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return [hue / 6, saturation, lightness];
}
function fromHsl(hue, saturation, lightness) {
  if (saturation === 0) return [lightness, lightness, lightness].map((channel) => Math.round(channel * 255));
  const upper = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation,
    lower = 2 * lightness - upper,
    channel = (offset) => {
      const position = (((hue + offset) % 1) + 1) % 1;
      if (position < 1 / 6) return lower + (upper - lower) * 6 * position;
      if (position < 1 / 2) return upper;
      if (position < 2 / 3) return lower + (upper - lower) * (2 / 3 - position) * 6;
      return lower;
    };
  return [channel(1 / 3), channel(0), channel(-1 / 3)].map((value) => Math.round(value * 255));
}
const parseHex = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));

// A value measured against the old roof's value moves onto the target's: darker than the roof scales down toward 0, lighter
// scales up toward 1, so the roof itself lands exactly on the target and the ends (0 and 1) stay where they are.
function carry(value, oldReference, newReference) {
  if (value <= oldReference) return oldReference > 0 ? (value / oldReference) * newReference : newReference;
  return oldReference < 1 ? newReference + ((value - oldReference) / (1 - oldReference)) * (1 - newReference) : 1;
}

function recolourPixel([red, green, blue], oldRoof, newRoof) {
  const [hue, saturation, lightness] = toHsl(red, green, blue),
    greyRoof = oldRoof[1] < GREY_SATURATION,
    newHue = greyRoof ? newRoof[0] : hue + (newRoof[0] - oldRoof[0]),
    newSaturation = greyRoof ? newRoof[1] : carry(saturation, oldRoof[1], newRoof[1]),
    newLightness = carry(lightness, oldRoof[2], newRoof[2]);
  return fromHsl(newHue, Math.min(1, Math.max(0, newSaturation)), Math.min(1, Math.max(0, newLightness)));
}

// ---------- inputs ----------
function svBase() {
  const sandbox = { G: {} };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/core/util.js'), 'utf8'), sandbox, { filename: 'util.js' });
  return sandbox.G.U.TYPE_COLOR;
}

function loadGyms() {
  const gyms = {};
  for (const name of fs.readdirSync(GYM_DIR).sort()) {
    const match = /^gym-([a-z]+)\.png$/.exec(name);
    if (!match || match[1] === 'contact') continue;
    const file = path.join(GYM_DIR, name),
      art = readPng(file),
      pixels = Buffer.alloc(art.w * art.h * 4);
    for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) pixels.set(art.rgba(x, y), (y * art.w + x) * 4);
    gyms[match[1]] = { file, width: art.w, height: art.h, pixels };
  }
  return gyms;
}

// The type-coloured parts: pixels whose colour spreads widely across the gyms (the emblems too, filtered per pixel later).
function differingPixels(gyms) {
  const list = Object.values(gyms),
    { width, height } = list[0],
    differs = new Uint8Array(width * height);
  for (const gym of list)
    if (gym.width !== width || gym.height !== height)
      throw new Error(gym.file + ': not the same size as the other gyms');
  for (let index = 0; index < width * height; index++)
    for (let channel = 0; channel < 3; channel++) {
      const values = list.map((gym) => gym.pixels[index * 4 + channel]);
      if (Math.max(...values) - Math.min(...values) >= TYPE_PART_MIN_SPREAD) {
        differs[index] = 1;
        break;
      }
    }
  return differs;
}

function recolourGym(gym, differs, oldRoofHex, newRoofHex) {
  const oldRoof = toHsl(...parseHex(oldRoofHex)),
    newRoof = toHsl(...parseHex(newRoofHex)),
    pixels = Buffer.from(gym.pixels);
  let changed = 0;
  for (let index = 0; index < differs.length; index++) {
    if (!differs[index]) continue;
    const at = index * 4;
    if (pixels[at + 3] === 0) continue;
    const colour = [pixels[at], pixels[at + 1], pixels[at + 2]];
    if (Math.min(...colour) >= EMBLEM_MIN_CHANNEL) continue;
    pixels.set(recolourPixel(colour, oldRoof, newRoof), at);
    changed++;
  }
  return { pixels, changed };
}

// ---------- contact sheet: before and after side by side, three gyms per row, on a dark ground ----------
function contactSheet(gyms, after) {
  const types = Object.keys(gyms),
    { width, height } = gyms[types[0]],
    gap = 12,
    perRow = 3,
    cellWidth = width * 2 + gap,
    sheetWidth = perRow * cellWidth + (perRow + 1) * gap * 2,
    rows = Math.ceil(types.length / perRow),
    sheetHeight = rows * (height + gap * 2) + gap * 2,
    pixels = Buffer.alloc(sheetWidth * sheetHeight * 4);
  for (let index = 0; index < sheetWidth * sheetHeight; index++) pixels.set([27, 33, 48, 255], index * 4);
  const blit = (source, left, top) => {
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const from = (y * width + x) * 4,
          alpha = source[from + 3] / 255;
        if (!alpha) continue;
        const to = ((top + y) * sheetWidth + left + x) * 4;
        for (let channel = 0; channel < 3; channel++)
          pixels[to + channel] = Math.round(source[from + channel] * alpha + pixels[to + channel] * (1 - alpha));
      }
  };
  types.forEach((type, index) => {
    const left = gap * 2 + (index % perRow) * (cellWidth + gap * 2),
      top = gap * 2 + Math.floor(index / perRow) * (height + gap * 2);
    blit(gyms[type].pixels, left, top);
    blit(after[type].pixels, left + width + gap, top);
  });
  return { width: sheetWidth, height: sheetHeight, pixels };
}

// ---------- main ----------
const sheetAt = process.argv.indexOf('--sheet'),
  sheetFile = sheetAt > 0 ? process.argv[sheetAt + 1] : null,
  write = process.argv.includes('--write');
if (!sheetFile && !write) {
  console.log('usage: node tools/gym_recolor.js --sheet <file.png> | --write');
  process.exit(1);
}
const gyms = loadGyms(),
  differs = differingPixels(gyms),
  oldRoofs = JSON.parse(fs.readFileSync(path.join(GYM_DIR, 'gym-colors.json'), 'utf8')),
  targets = svBase(),
  after = {};
for (const [type, gym] of Object.entries(gyms)) {
  if (!oldRoofs[type] || !targets[type]) throw new Error(type + ': no old roof colour or no SV colour');
  after[type] = recolourGym(gym, differs, oldRoofs[type], targets[type]);
  console.log(type.padEnd(9) + oldRoofs[type] + ' -> ' + targets[type] + '  ' + after[type].changed + ' pixels');
}
if (sheetFile) {
  fs.writeFileSync(sheetFile, encodePng(contactSheet(gyms, after)));
  console.log('wrote ' + sheetFile);
}
if (write) {
  for (const [type, gym] of Object.entries(gyms))
    fs.writeFileSync(gym.file, encodePng({ width: gym.width, height: gym.height, pixels: after[type].pixels }));
  console.log('wrote ' + Object.keys(gyms).length + ' gym PNGs; now run node tools/gym_colors.js');
}
