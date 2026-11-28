// tools/kanto_batch1.js: Kanto import batch 1 (docs/KANTO-BOSS-MOVE-IMPORTS.md, "Maps to the schema"), 110 moves.
// Each move takes its facts from pokeapi (api_move_dataset.json) and its shape from a pattern copied off a catalog move.
// Usage: node tools/kanto_batch1.js            write tools/kanto-batch1-data.js for tools/kanto-batch1-review.html
//        node tools/kanto_batch1.js --apply    also write the moves into move-conversions-described.json (then run export_moves.js)
// Overrides: docs/move_rework_holding/kanto-batch1-overrides.json (exported from the review page). A pattern override is applied
// here; a `json` override replaces those top-level fields; plain-text notes are listed for the agent to apply by hand.
// Do not --apply again (found 2026-11-27): ring sizes were retuned in the source json after the batch, and --apply would put
// the old ones back. Later imports use tools/move_import.js.
const fs = require('fs'),
  path = require('path');
const root = path.resolve(__dirname, '..');
const { PATTERNS, entry, applyToSource, loadApi, SRC } = require('./move-import-patterns.js'); // the shared shape patterns (#141)
const OVR = path.join(root, 'docs/move_rework_holding/kanto-batch1-overrides.json');
const OUT = path.join(__dirname, 'kanto-batch1-data.js');
const LABEL = 'Kanto batch 1';
const api = loadApi();

// id: [pattern, options]. Options: heavy (bigger melee), r (radius / ring size), n (multihit count), on (multihit inner pattern),
// push (a knockback distance on a move with no damage), power (a power for a move pokeapi lists without one), ko (a wild-only
// one-hit KO chance), delay (seconds before a mark lands), acc (an accuracy that replaces pokeapi's).
const PLAN = {
  // Normal
  slash: ['melee'],
  screech: ['statusShot'],
  'lovely-kiss': ['statusShot'],
  recover: ['self'],
  supersonic: ['statusShot'],
  glare: ['statusShot'],
  swift: ['burst'],
  'double-slap': ['multi', { n: 3, on: 'melee' }],
  'mega-kick': ['melee', { heavy: 1 }],
  'spike-cannon': ['multi', { n: 3, on: 'shot' }],
  'take-down': ['melee'],
  growl: ['ring', { r: 160 }],
  leer: ['ring', { r: 160 }],
  'mega-punch': ['melee'],
  wrap: ['melee'],
  bind: ['melee'],
  'double-edge': ['melee', { heavy: 1 }],
  'fury-attack': ['multi', { n: 3, on: 'melee' }],
  'mean-look': ['statusShot'],
  'scary-face': ['statusShot'],
  sing: ['statusShot'],
  stomp: ['melee'],
  strength: ['melee'],
  'tail-whip': ['ring', { r: 160 }],
  // Fighting
  superpower: ['melee', { heavy: 1 }],
  'brick-break': ['melee'],
  'cross-chop': ['melee', { heavy: 1 }],
  'focus-blast': ['shot'],
  'close-combat': ['melee', { heavy: 1 }],
  submission: ['melee'],
  'double-kick': ['multi', { n: 2, on: 'melee' }],
  'bulk-up': ['self'],
  'drain-punch': ['melee'],
  'dynamic-punch': ['melee', { heavy: 1 }],
  'sky-uppercut': ['melee'],
  // Psychic
  hypnosis: ['statusShot'],
  'calm-mind': ['self'],
  barrier: ['self'],
  amnesia: ['self'],
  meditate: ['self'],
  // Electric
  'thunder-punch': ['melee'],
  thunder: ['strike', { r: 36 }],
  'thunder-wave': ['statusShot'],
  'wild-charge': ['melee'],
  'charge-beam': ['beam'],
  'shock-wave': ['shot', { home: 1 }],
  'thunder-fang': ['melee'],
  'volt-tackle': ['melee', { heavy: 1 }],
  'zap-cannon': ['shot'],
  // Grass
  'mega-drain': ['shot'],
  'sleep-powder': ['cloud'],
  'stun-spore': ['cloud'],
  'power-whip': ['melee', { heavy: 1 }],
  'energy-ball': ['shot'],
  spore: ['cloud'],
  'leaf-blade': ['melee'],
  synthesis: ['self'],
  // Ground
  earthquake: ['ring', { r: 260 }],
  'earth-power': ['strike', { r: 30 }],
  'bone-club': ['melee'],
  'drill-run': ['melee'],
  'sand-tomb': ['zone'],
  // Poison
  'sludge-bomb': ['shot'],
  'poison-jab': ['melee'],
  acid: ['burst'],
  'poison-fang': ['melee'],
  'sludge-wave': ['wave'],
  'acid-armor': ['self'],
  'cross-poison': ['melee'],
  'gunk-shot': ['shot'],
  'poison-powder': ['cloud'],
  // Water
  surf: ['skill'],
  waterfall: ['melee'],
  'water-pulse': ['shot'],
  scald: ['shot'],
  'aqua-tail': ['melee'],
  clamp: ['melee'],
  // Fire
  'fire-blast': ['shot'],
  'flare-blitz': ['melee', { heavy: 1 }],
  'fire-punch': ['melee'],
  overheat: ['shot'],
  'blaze-kick': ['melee'],
  'fire-fang': ['melee'],
  // Dark
  crunch: ['melee'],
  'nasty-plot': ['self'],
  // Dragon
  'dragon-pulse': ['beam'],
  'draco-meteor': ['meteors'],
  'dragon-breath': ['beam'],
  'dragon-claw': ['melee'],
  twister: ['burst'],
  // Ice
  blizzard: ['burst'],
  'ice-punch': ['melee'],
  'aurora-beam': ['beam'],
  'frost-breath': ['beam'],
  'ice-fang': ['melee'],
  // Rock
  'stone-edge': ['falls', { r: 60 }],
  'ancient-power': ['shot'],
  'rock-tomb': ['falls', { r: 60 }],
  // Bug
  'leech-life': ['melee'],
  megahorn: ['melee', { heavy: 1 }],
  'signal-beam': ['beam'],
  // Flying
  'air-slash': ['shot'],
  'air-cutter': ['burst'],
  fly: ['skill'], // joined batch 1 as a movement skill (Jess 2026-11-02)
  // Gym loop-1 additions (Jess 2026-11-02): lore moves a loop-1 leader needs, imported with the same patterns. Not batch 1's review.
  'defense-curl': ['self'], // Brock's Geodude; plays as Harden (Rollout, the move it boosts, is not imported)
  // Lore-set imports (Jess 2026-11-02, MOVE-INTENT roar, fissure, future-sight): numbers are the approved proposals.
  roar: ['ring', { r: 160, push: 140 }], // Blaine's Growlithe: no damage, pushes foes 140 px away (the player too)
  // Giovanni's Rhydon: 30% one-hit KO on wild foes only, else a power-120 hit. Mainline's 30% accuracy IS the KO roll, so accuracy is
  // 100 here (basePower = power x accuracy would make the heavy hit 36).
  fissure: ['strike', { r: 60, power: 120, ko: 30, acc: 100 }],
  'future-sight': ['mark', { r: 60, delay: 2 }], // Sabrina's Kadabra: the spot is hit 2 s after the cast
  // Ghost
  'confuse-ray': ['statusShot'],
  'shadow-punch': ['melee'],
  'shadow-claw': ['melee'],
  // Fairy
  moonblast: ['shot'],
  'play-rough': ['melee'],
  moonlight: ['self'],
  // Steel
  'iron-tail': ['melee', { heavy: 1 }],
};

const ovr = fs.existsSync(OVR) ? JSON.parse(fs.readFileSync(OVR, 'utf8')).moves || {} : {};
// the resolved cd of each move as exported now (run after --apply and export_moves.js to see new numbers)
let RES = {};
try {
  global.G = {};
  for (const f of ['move-attributes', 'moves-generated', 'move-overrides', 'move-handler', 'move-resolver'])
    require(path.join(root, 'js/data', f + '.js'));
  RES = G.MoveDefs;
} catch (err) {
  console.log('no resolved cds (' + err.message + ')');
}
const rows = [],
  moves = {},
  notes = [];
for (const [id, [p0, o0 = {}]] of Object.entries(PLAN)) {
  const ov = ovr[id] || {};
  const p = ov.pattern || p0,
    o = Object.assign({}, p === p0 ? o0 : {}, ov.options || {});
  if (p === 'multi' && !o.n) Object.assign(o, { n: 3, on: 'melee' });
  const { e } = entry(api, id, p, o, LABEL);
  if (ov.json) Object.assign(e, ov.json);
  if (ov.shape || ov.delivery || ov.payload || ov.note || ov.cd) notes.push(id); // cd goes in move-overrides.js by hand
  moves[id] = e;
  const mine = entry(api, id, p0, o0, LABEL), // the row shows the agent's proposal; the review page shows the override beside it
    a = api[id];
  rows.push({
    id,
    name: a.name,
    type: a.type,
    category: a.damage_class,
    power: a.source.power,
    pp: a.source.pp,
    cd: RES[id] ? RES[id].cd : null,
    target: a.target,
    effect: a.effect.short_effect.replace(/\$effect_chance%/g, (a.source.effect_chance || '') + '%'),
    pattern: p0,
    words: mine.w,
    proposed: {
      kind: mine.e.kind,
      space: mine.e.space,
      delivery: mine.e.delivery,
      hitPolicy: mine.e.hitPolicy,
      payload: mine.e.payload,
    },
  });
}

fs.writeFileSync(
  OUT,
  '// generated by tools/kanto_batch1.js, do not edit\nwindow.KANTO_B1 = ' +
    JSON.stringify({ patterns: PATTERNS, rows }, null, 1) +
    ';\n'
);
console.log('kanto batch 1: ' + rows.length + ' moves -> ' + path.relative(root, OUT));
if (Object.keys(ovr).length)
  console.log(
    'overrides: ' +
      Object.keys(ovr).length +
      (notes.length ? '; plain-text notes to apply by hand: ' + notes.join(', ') : '')
  );

if (process.argv.includes('--apply')) {
  const count = applyToSource(moves);
  console.log('applied to ' + path.relative(root, SRC) + ' (' + count + ' moves); now run node tools/export_moves.js');
}
