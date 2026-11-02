// tools/kanto_batch1.js: Kanto import batch 1 (docs/KANTO-BOSS-MOVE-IMPORTS.md, "Maps to the schema"), 110 moves.
// Each move takes its facts from pokeapi (api_move_dataset.json) and its shape from a pattern copied off a catalog move.
// Usage: node tools/kanto_batch1.js            write tools/kanto-batch1-data.js for tools/kanto-batch1-review.html
//        node tools/kanto_batch1.js --apply    also write the moves into move-conversions-described.json (then run export_moves.js)
// Overrides: docs/move_rework_holding/kanto-batch1-overrides.json (exported from the review page). A pattern override is applied
// here; a `json` override replaces those top-level fields; plain-text notes are listed for the agent to apply by hand.
const fs = require('fs'),
  path = require('path');
const root = path.resolve(__dirname, '..');
const HOLD = path.join(root, 'docs/move_rework_holding');
const SRC = path.join(HOLD, 'move-conversions-described.json');
const OVR = path.join(HOLD, 'kanto-batch1-overrides.json');
const OUT = path.join(__dirname, 'kanto-batch1-data.js');
const TAU = 6.2832;

const api = {};
for (const m of Object.values(require(path.join(HOLD, 'api_move_dataset.json')).moves)) api[m.source.identifier] = m;

// id: [pattern, options]. Options: heavy (bigger melee), r (radius / ring size), n (multihit count), on (multihit inner pattern).
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
  'focus-blast': ['shot', { r: 12 }],
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
  'shock-wave': ['shot'],
  'thunder-fang': ['melee'],
  'volt-tackle': ['melee', { heavy: 1 }],
  'zap-cannon': ['shot', { r: 12 }],
  // Grass
  'mega-drain': ['shot'],
  'sleep-powder': ['statusShot'],
  'stun-spore': ['statusShot'],
  'power-whip': ['melee', { heavy: 1 }],
  'energy-ball': ['shot', { r: 10 }],
  spore: ['statusShot'],
  'leaf-blade': ['melee'],
  synthesis: ['self'],
  // Ground
  earthquake: ['ring', { r: 260 }],
  'earth-power': ['strike', { r: 30 }],
  'bone-club': ['melee'],
  'drill-run': ['melee'],
  'sand-tomb': ['strike', { r: 30 }],
  // Poison
  'sludge-bomb': ['shot', { r: 10 }],
  'poison-jab': ['melee'],
  acid: ['burst'],
  'poison-fang': ['melee'],
  'sludge-wave': ['ring', { r: 220 }],
  'acid-armor': ['self'],
  'cross-poison': ['melee'],
  'gunk-shot': ['shot', { r: 12 }],
  'poison-powder': ['statusShot'],
  // Water
  surf: ['ring', { r: 240 }],
  waterfall: ['melee'],
  'water-pulse': ['shot', { r: 10 }],
  scald: ['shot'],
  'aqua-tail': ['melee'],
  clamp: ['melee'],
  // Fire
  'fire-blast': ['shot', { r: 12 }],
  'flare-blitz': ['melee', { heavy: 1 }],
  'fire-punch': ['melee'],
  overheat: ['shot', { r: 12 }],
  'blaze-kick': ['melee'],
  'fire-fang': ['melee'],
  // Dark
  crunch: ['melee'],
  'nasty-plot': ['self'],
  // Dragon
  'dragon-pulse': ['beam'],
  'draco-meteor': ['falls', { r: 80 }],
  'dragon-breath': ['beam'],
  'dragon-claw': ['melee'],
  twister: ['ring', { r: 180 }],
  // Ice
  blizzard: ['ring', { r: 240 }],
  'ice-punch': ['melee'],
  'aurora-beam': ['beam'],
  'frost-breath': ['beam'],
  'ice-fang': ['melee'],
  // Rock
  'stone-edge': ['falls', { r: 60 }],
  'ancient-power': ['shot', { r: 10 }],
  'rock-tomb': ['falls', { r: 60 }],
  // Bug
  'leech-life': ['melee'],
  megahorn: ['melee', { heavy: 1 }],
  'signal-beam': ['beam'],
  // Flying
  'air-slash': ['shot'],
  'air-cutter': ['burst'],
  // Ghost
  'confuse-ray': ['statusShot'],
  'shadow-punch': ['melee'],
  'shadow-claw': ['melee'],
  // Fairy
  moonblast: ['shot', { r: 10 }],
  'play-rough': ['melee'],
  moonlight: ['self'],
  // Steel
  'iron-tail': ['melee', { heavy: 1 }],
};

const PATTERNS = {
  melee: 'Melee swing (like Tackle / Body Slam)',
  shot: 'Single shot (like Sludge / Shadow Ball)',
  beam: 'Beam (like Ice Beam / Psybeam)',
  strike: 'Strike on the target (like Thunderbolt, no chain)',
  falls: 'Falls from above (like Rock Slide)',
  ring: 'Ring around the user (like Bulldoze)',
  burst: 'Burst of 6 shots in a circle (like Mud Shot)',
  statusShot: 'Status shot, no damage (like String Shot)',
  self: 'Self-cast, no hitbox (like Swords Dance)',
  multi: 'Multi-hit, quick repeats (like String Shot)',
};

const STAT = { 2: 'atk', 3: 'def', 4: 'spAtk', 5: 'spDef', 6: 'spd' }; // 7 accuracy, 8 evasion: none in this batch
const STAT_WORD = { atk: 'Attack', def: 'Defense', spAtk: 'Sp. Atk', spDef: 'Sp. Def', spd: 'Speed' };

/** The payload from the mainline effect (damage first, as the catalog does). */
function payloadOf(id, a) {
  const m = a.meta,
    out = [],
    dmg = a.source.power != null;
  if (dmg) out.push({ t: 'damage' });
  if (id === 'mean-look') out.push({ t: 'ailment', id: 'trap', chance: 100, side: 'foe' }); // pokeapi files it as a unique effect
  if (m.ailment !== 'none') {
    const chance = m.ailment_chance || 100;
    out.push({ t: 'ailment', id: m.ailment, chance, side: 'foe' });
  }
  if (m.flinch_chance) out.push({ t: 'flinch', chance: m.flinch_chance });
  if (m.crit_rate) out.push({ t: 'crit', critChance: id === 'frost-breath' ? 100 : 15 });
  if (m.drain > 0) out.push({ t: 'heal', amount: { from: 'dealt', fraction: m.drain / 100 }, side: 'self' });
  if (m.drain < 0) out.push({ t: 'recoil', fraction: Math.round(-m.drain) / 100, trigger: 'hit' });
  if (m.healing > 0)
    out.push({ t: 'heal', amount: { fraction: m.healing / 100, of: 'maxHP' }, per: 0.1, duration: 0.1, side: 'self' });
  for (const s of a.stat_changes || []) {
    const stat = STAT[s.stat_id];
    if (!stat) continue;
    const self = a.target === 'user' || m.category === 'damage-raise';
    const fx = {
      t: 'stat',
      stat,
      stages: s.change,
      side: self ? 'self' : 'foe',
      scope: self ? (s.change > 0 ? 'team' : 'individual') : 'individual',
    };
    if (m.stat_chance && m.stat_chance < 100) fx.chance = m.stat_chance;
    out.push(fx);
  }
  return out;
}

const ends = (t) => [{ time: t }, { contact: 'wall' }, { offScreen: true }];
const melee = (o) => ({
  kind: 'melee',
  balanceClass: 'melee',
  space: { shape: 'radial', radArc: o.heavy ? 2 : 1.7, radRadius: o.heavy ? 60 : 54, count: 1 },
  delivery: { anchor: 'caster', targeting: 'nearest', motion: 'static', endOn: [{ time: 0.15 }] },
  hitPolicy: 'oncePerInstance',
  knock: o.heavy ? 140 : 90,
});
const shot = (o) => ({
  kind: 'projectile',
  balanceClass: 'ranged',
  space: { shape: 'radial', radRadius: o.r || 8, count: 1, pierce: 0 },
  delivery: { anchor: 'caster', targeting: 'direction', motion: 'travels', moveSpeed: 300, endOn: ends(1.5) },
  hitPolicy: 'oncePerInstance',
});
const BUILD = {
  melee,
  shot,
  statusShot: (o) =>
    Object.assign(shot(o), {
      delivery: { anchor: 'caster', targeting: 'direction', motion: 'travels', moveSpeed: 320, endOn: ends(1.2) },
    }),
  beam: () => ({
    kind: 'beam',
    balanceClass: 'ranged',
    space: { shape: 'linear', linLength: 290, linWidth: 20, pierce: 'UNLIMITED' },
    delivery: { anchor: 'caster', targeting: 'nearest', motion: 'static', endOn: [{ time: 0.5 }] },
    hitPolicy: 'oncePerInstance',
  }),
  strike: (o) => ({
    kind: 'projectile',
    balanceClass: 'ranged',
    space: { shape: 'radial', radRadius: o.r || 30, count: 1 },
    delivery: { anchor: 'target', targeting: 'nearest', motion: 'static', endOn: [{ time: 0 }] },
    hitPolicy: 'oncePerInstance',
  }),
  falls: (o) => ({
    kind: 'meteor',
    balanceClass: 'ranged',
    space: { shape: 'radial', radArc: TAU, radRadius: o.r || 70, count: 1 },
    delivery: { anchor: 'world', targeting: 'location', motion: 'falls', delay: 0.4, endOn: [{ time: 0.2 }] },
    hitPolicy: 'oncePerInstance',
  }),
  ring: (o) => ({
    kind: 'nova',
    balanceClass: 'ranged',
    space: { shape: 'radial', radArc: TAU, radRadius: 1 },
    delivery: {
      anchor: 'caster',
      targeting: 'none',
      motion: 'static',
      grow: { growSpeed: Math.round((o.r || 200) * 2.5), dim: 'radRadius', per: 'time', max: o.r || 200 },
      endOn: [{ time: 0.4 }],
    },
    hitPolicy: 'oncePerInstance',
  }),
  burst: () => ({
    kind: 'nova',
    balanceClass: 'ranged',
    space: { shape: 'radial', radRadius: 7, count: 6, pierce: 0, spread: TAU },
    delivery: { anchor: 'caster', targeting: 'direction', motion: 'travels', moveSpeed: 300, endOn: ends(1.2) },
    hitPolicy: 'oncePerInstance',
  }),
  self: () => ({ kind: 'buff', balanceClass: 'other', delivery: { anchor: 'self', targeting: 'self' } }),
};

function words(p, o, g, pay) {
  const shape = {
    melee: `Melee arc ${g.space && g.space.radArc} rad, reach ${g.space && g.space.radRadius} px, aims at nearest`,
    shot: `One shot, radius ${o.r || 8} px`,
    statusShot: `One shot, radius ${o.r || 8} px, no damage`,
    beam: 'Line 290 x 20 px, pierces everything',
    strike: `Circle ${o.r || 30} px on the nearest foe`,
    falls: `Circle ${o.r || 70} px that lands on a spot`,
    ring: `Ring growing to ${o.r || 200} px around the user`,
    burst: '6 shots in a full circle, radius 7 px each',
    self: 'None (self-cast)',
    multi: `${o.n} quick ${o.on === 'shot' ? 'shots' : 'melee swings'}, 0.11 s apart`,
  }[p];
  const delivery = {
    melee: 'Instant, lasts 0.15 s',
    shot: 'Travels 300 px/s toward aim, ends at 1.5 s, a wall or off screen',
    statusShot: 'Travels 320 px/s toward aim, ends at 1.2 s, a wall or off screen',
    beam: 'Instant at nearest, lasts 0.5 s',
    strike: 'Instant on the nearest foe',
    falls: '0.4 s warning, then lands for 0.2 s',
    ring: 'Grows out from the user over 0.4 s',
    burst: 'Travels 300 px/s outward, ends at 1.2 s, a wall or off screen',
    self: 'Instant on the user',
    multi: 'Each repeat as its pattern',
  }[p];
  const pw = pay.map((fx) => {
    if (fx.t === 'damage') return 'Damage';
    if (fx.t === 'ailment') return `${fx.id} ${fx.chance}%`;
    if (fx.t === 'flinch') return `flinch ${fx.chance}%`;
    if (fx.t === 'crit') return fx.critChance >= 100 ? 'always crits' : `high crit (+${fx.critChance}%)`;
    if (fx.t === 'knockback') return `knockback ${fx.distance}`;
    if (fx.t === 'recoil') return `recoil ${Math.round(fx.fraction * 100)}% of damage dealt`;
    if (fx.t === 'heal')
      return fx.amount.from
        ? `drains ${fx.amount.fraction * 100}% of damage dealt`
        : `heals ${fx.amount.fraction * 100}% max HP`;
    if (fx.t === 'stat')
      return `${fx.side === 'self' ? 'own' : 'foe'} ${STAT_WORD[fx.stat]} ${fx.stages > 0 ? '+' : ''}${fx.stages}${fx.chance ? ` (${fx.chance}%)` : ''}${fx.side === 'self' && fx.scope === 'team' ? ', team-wide' : ''}`;
    return fx.t;
  });
  return { shape, delivery, payload: pw.join(', ') || 'none' };
}

/** One full catalog entry for id with pattern p and options o. */
function entry(id, p, o) {
  const a = api[id];
  if (!a) throw new Error('no pokeapi entry for ' + id);
  let pay = payloadOf(id, a),
    g,
    shown = null;
  if (p === 'multi') {
    const inner = BUILD[o.on](o);
    const ipay = pay.slice();
    if (o.on === 'melee') ipay.push({ t: 'knockback', distance: 40 });
    g = {
      kind: inner.kind,
      balanceClass: inner.balanceClass,
      delivery: { anchor: 'caster', targeting: 'direction', motion: 'static', endOn: [{ time: 0.11 * o.n + 0.2 }] },
    };
    const im = {
      kind: inner.kind,
      space: inner.space,
      delivery: inner.delivery,
      hitPolicy: inner.hitPolicy,
      payload: ipay,
    };
    pay = [{ t: 'emit', every: 0.11, count: o.n, trigger: 'cast', move: im }];
    shown = ipay; // the words describe one repeat
  } else {
    g = BUILD[p](o);
    if (p === 'melee') pay.push({ t: 'knockback', distance: g.knock });
    if (p === 'statusShot') pay = pay.filter((fx) => fx.t !== 'damage');
  }
  delete g.knock;
  const w = words(p, o, g, shown || pay);
  const e = {
    id,
    name: a.name,
    kind: g.kind,
    balanceClass: g.balanceClass,
    feel: `Kanto batch 1 proposal. ${PATTERNS[p]}. Shape: ${w.shape}. Delivery: ${w.delivery}. Payload: ${w.payload}.`,
    type: a.type,
    category: a.damage_class,
    power: a.source.power,
    pp: a.source.pp,
    accuracy: a.source.accuracy,
    priority: a.source.priority,
    flavor_text: a.flavor_text ? a.flavor_text.flavor_text.replace(/\s+/g, ' ') : '',
  };
  if (g.space) e.space = g.space;
  e.delivery = g.delivery;
  if (g.hitPolicy) e.hitPolicy = g.hitPolicy;
  e.payload = pay;
  e.reviewStatus = 'proposed';
  return { e, w };
}

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
  const { e } = entry(id, p, o);
  if (ov.json) Object.assign(e, ov.json);
  if (ov.shape || ov.delivery || ov.payload || ov.note || ov.cd) notes.push(id); // cd goes in move-overrides.js by hand
  moves[id] = e;
  const mine = entry(id, p0, o0), // the row shows the agent's proposal; the review page shows the override beside it
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
  // Spliced as text, not re-serialized: the file is hand/Python formatted (2.0 stays 2.0), so the other moves keep their bytes.
  const raw = fs.readFileSync(SRC, 'utf8'),
    crlf = raw.includes('\r\n');
  let text = raw.replace(/\r\n/g, '\n');
  const block = (id) =>
    '    ' + JSON.stringify(id) + ': ' + JSON.stringify(moves[id], null, 2).replace(/\n/g, '\n    ');
  const add = [];
  for (const id of Object.keys(moves)) {
    const re = new RegExp('\\n    "' + id + '": \\{[\\s\\S]*?\\n    \\}');
    if (re.test(text)) text = text.replace(re, () => '\n' + block(id));
    else add.push(block(id));
  }
  const tail = '\n  },\n  "forgottenSkips"';
  if (add.length) {
    if (!text.includes(tail)) throw new Error('cannot find the end of "moves" in ' + SRC);
    text = text.replace(tail, () => ',\n' + add.join(',\n') + tail);
  }
  const n = Object.keys(JSON.parse(text).moves).length; // parse check before writing
  fs.writeFileSync(SRC, crlf ? text.replace(/\n/g, '\r\n') : text);
  console.log('applied to ' + path.relative(root, SRC) + ' (' + n + ' moves); now run node tools/export_moves.js');
}
