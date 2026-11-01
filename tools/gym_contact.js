// tools/gym_contact.js: bake the gym contact mask (assets/tileset/gyms/gym-contact.png) into js/data/gym-contact.js.
// The game reads the baked data instead of reading canvas pixels at runtime, since Firefox blocks pixel reads of images
// opened from file:// (a tainted canvas). Run this after repainting the PNG.
// Usage: node tools/gym_contact.js            write js/data/gym-contact.js
//        node tools/gym_contact.js --check    exit 1 if the data file does not match the PNG (used by tools/check.js)
const fs = require('fs'),
  path = require('path'),
  zlib = require('zlib');
const root = path.resolve(__dirname, '..');
const PNG = path.join(root, 'assets/tileset/gyms/gym-contact.png'),
  OUT = path.join(root, 'js/data/gym-contact.js');

// Minimal PNG reader: 8-bit RGBA, non-interlaced (what the gym art uses). Returns { w, h, alpha(x, y) }.
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
  return { w, h, alpha: (x, y) => px[y * stride + x * bpp + 3] };
}

// Each row is its solid runs "x0-x1" (x1 exclusive), comma separated; rows are joined by "/".
function build() {
  const { w, h, alpha } = readPng(PNG);
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
    rows.join('/') +
    "',\n" +
    '};\n'
  );
}

const text = build();
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
  if (cur !== text) {
    console.log('STALE js/data/gym-contact.js does not match gym-contact.png (run node tools/gym_contact.js)');
    process.exit(1);
  }
  console.log('gym contact: current');
} else {
  fs.writeFileSync(OUT, text);
  console.log('wrote js/data/gym-contact.js');
}
