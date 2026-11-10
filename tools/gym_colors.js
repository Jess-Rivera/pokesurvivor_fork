// tools/gym_colors.js: bake each gym's colour (the dominant colour of its roof) from assets/tileset/gyms/gym-<type>.png into
// assets/tileset/gyms/gym-colors.json, keyed by the gym's type. gym-contact.png is a contact mask, not a gym, so it is skipped.
// The roof colour is the most common exact colour in the roof area, ignoring see-through pixels and the white emblem.
// Run this after repainting or adding a gym PNG.
// Usage: node tools/gym_colors.js            write the JSON
//        node tools/gym_colors.js --check    exit 1 if the JSON does not match the PNGs (used by tools/check.js)
const fs = require('fs'),
  path = require('path'),
  { readPng } = require('./gym_contact.js');
const root = path.resolve(__dirname, '..'),
  GYM_DIR = path.join(root, 'assets/tileset/gyms'),
  OUT = path.join(GYM_DIR, 'gym-colors.json');

// The roof area of the 288 x 248 gym art: its top panel and side flaps, above the doorway and below the top edge.
const ROOF_LEFT = 50,
  ROOF_RIGHT = 240,
  ROOF_TOP = 10,
  ROOF_BOTTOM = 120,
  EMBLEM_MIN_CHANNEL = 226; // a pixel whose every channel is at least this is the white emblem or the white wall trim

const hex = (red, green, blue) =>
  '#' + [red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('');

function roofColor(file) {
  const art = readPng(file),
    counts = new Map();
  for (let y = ROOF_TOP; y < Math.min(ROOF_BOTTOM, art.h); y++)
    for (let x = ROOF_LEFT; x < Math.min(ROOF_RIGHT, art.w); x++) {
      const [red, green, blue, alpha] = art.rgba(x, y);
      if (alpha < 255 || Math.min(red, green, blue) >= EMBLEM_MIN_CHANNEL) continue;
      const key = hex(red, green, blue);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  let best = null;
  for (const [key, count] of counts) if (!best || count > best[1]) best = [key, count];
  if (!best) throw new Error(file + ': no opaque roof pixels found');
  return best[0];
}

function build() {
  const colors = {};
  for (const name of fs.readdirSync(GYM_DIR).sort()) {
    const match = /^gym-([a-z]+)\.png$/.exec(name);
    if (!match || match[1] === 'contact') continue;
    colors[match[1]] = roofColor(path.join(GYM_DIR, name));
  }
  return JSON.stringify(colors, null, 2) + '\n';
}

const text = build();
if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
  if (current !== text) {
    console.log('STALE assets/tileset/gyms/gym-colors.json does not match the gym PNGs (run node tools/gym_colors.js)');
    process.exit(1);
  }
  console.log('gym colors: current (' + Object.keys(JSON.parse(text)).length + ' gyms)');
} else {
  fs.writeFileSync(OUT, text);
  console.log('wrote assets/tileset/gyms/gym-colors.json');
}
