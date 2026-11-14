// tools/gym_contact.js: bake the building contact masks into data files: the gym (assets/tileset/gyms/gym-contact.png into
// js/data/gym-contact.js) and the two Move Shop buildings (assets/tileset/move-trainer-contact.png and tm-mart-contact.png into
// js/data/shop-contact.js, Move Shop step 3). The game reads the baked data instead of reading canvas pixels at runtime, since
// Firefox blocks pixel reads of images opened from file:// (a tainted canvas). Run this after repainting a mask PNG.
// Usage: node tools/gym_contact.js            write both data files
//        node tools/gym_contact.js --check    exit 1 if a data file does not match its PNG (used by tools/check.js)
const fs = require('fs'),
  path = require('path'),
  zlib = require('zlib');
const root = path.resolve(__dirname, '..');
const PNG = path.join(root, 'assets/tileset/gyms/gym-contact.png'),
  OUT = path.join(root, 'js/data/gym-contact.js');
const SHOP_PNGS = { trainer: 'assets/tileset/move-trainer-contact.png', mart: 'assets/tileset/tm-mart-contact.png' },
  SHOP_OUT = path.join(root, 'js/data/shop-contact.js');

// Minimal PNG reader: 8-bit RGBA, non-interlaced (what the building art uses). Returns { w, h, alpha(x, y) }.
function readPng(file) {
  const buf = fs.readFileSync(file);
  let p = 8,
    w = 0,
    h = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p),
      type = buf.toString('ascii', p + 4, p + 8),
      data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0)
        throw new Error(file + ': expected 8-bit RGBA non-interlaced PNG');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)),
    bpp = 4,
    stride = w * bpp,
    px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)],
      src = y * (stride + 1) + 1,
      row = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i],
        a = i >= bpp ? px[row + i - bpp] : 0,
        b = y > 0 ? px[row - stride + i] : 0,
        c = i >= bpp && y > 0 ? px[row - stride + i - bpp] : 0;
      let v;
      if (f === 0) v = x;
      else if (f === 1) v = x + a;
      else if (f === 2) v = x + b;
      else if (f === 3) v = x + ((a + b) >> 1);
      else {
        const pp = a + b - c,
          pa = Math.abs(pp - a),
          pb = Math.abs(pp - b),
          pc = Math.abs(pp - c);
        v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      px[row + i] = v & 255;
    }
  }
  return {
    w,
    h,
    alpha: (x, y) => px[y * stride + x * bpp + 3],
    rgba: (x, y) => Array.from(px.subarray(y * stride + x * bpp, y * stride + x * bpp + 4)),
  };
}

// Each row is its solid runs "x0-x1" (x1 exclusive), comma separated; rows are joined by "/".
function maskRows(file) {
  const { w, h, alpha } = readPng(file);
  const rows = [];
  for (let y = 0; y < h; y++) {
    const runs = [];
    for (let x = 0; x < w;) {
      if (alpha(x, y) === 0) {
        x++;
        continue;
      }
      const x0 = x;
      while (x < w && alpha(x, y) > 0) x++;
      runs.push(x0 + '-' + x);
    }
    rows.push(runs.join(','));
  }
  return { w, h, rows: rows.join('/') };
}

function build() {
  const { w, h, rows } = maskRows(PNG);
  return (
    '/* ============ gym-contact.js: the gym building contact mask (GENERATED, do not edit) ============\n' +
    ' * Baked from assets/tileset/gyms/gym-contact.png by tools/gym_contact.js; rerun it after repainting the PNG.\n' +
    ' * rows: one entry per art row, top to bottom, separated by "/"; each row lists its solid runs "x0-x1" (x1 exclusive).\n' +
    ' * Read by js/systems/gym-arena.js (onBuilding).\n' +
    ' */\n' +
    'G.GymContact = {\n' +
    '  w: ' +
    w +
    ',\n' +
    '  h: ' +
    h +
    ',\n' +
    "  rows: '" +
    rows +
    "',\n" +
    '};\n'
  );
}

function buildShops() {
  let s =
    '/* ============ shop-contact.js: the Move Shop building contact masks (GENERATED, do not edit) ============\n' +
    ' * Baked from assets/tileset/move-trainer-contact.png and tm-mart-contact.png by tools/gym_contact.js; rerun it after\n' +
    ' * repainting either PNG. Per building: w and h in art pixels; rows: one entry per art row, top to bottom, separated by "/";\n' +
    ' * each row lists its solid runs "x0-x1" (x1 exclusive). Read by js/systems/shops.js (onBuilding).\n' +
    ' */\n' +
    'G.ShopContact = {\n';
  for (const [k, rel] of Object.entries(SHOP_PNGS)) {
    const m = maskRows(path.join(root, rel));
    s += '  ' + k + ': {\n    w: ' + m.w + ',\n    h: ' + m.h + ",\n    rows: '" + m.rows + "',\n  },\n";
  }
  return s + '};\n';
}

module.exports = { readPng }; // tools/gym_colors.js reads the gym art with it

const outs = require.main === module && [
  [OUT, build(), 'gym-contact.js'],
  [SHOP_OUT, buildShops(), 'shop-contact.js'],
];
if (!outs) {
  // required as a module: bake nothing
} else if (process.argv.includes('--check')) {
  let bad = 0;
  for (const [file, text, name] of outs) {
    const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
    if (cur !== text) {
      console.log('STALE js/data/' + name + ' does not match its PNG (run node tools/gym_contact.js)');
      bad++;
    }
  }
  if (bad) process.exit(1);
  console.log('building contact: current (gym, Move Trainer, TM Mart)');
} else {
  for (const [file, text, name] of outs) {
    fs.writeFileSync(file, text);
    console.log('wrote js/data/' + name);
  }
}
