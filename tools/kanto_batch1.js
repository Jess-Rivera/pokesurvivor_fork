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
  surf: ['wave'],
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
  cloud: 'Powder cloud, no damage (new)',
  zone: 'Ground patch at a foe (new)',
  wave: 'Wave: a band across the aim that widens as it travels (new)',
  meteors: 'Three falls on the nearest foe (new)',
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

// Shape rules (Jess 2026-11-02, docs/KANTO-BOSS-MOVE-IMPORTS.md "Batch 1 shape rules").
// Rule 1: Tackle (arc 1.7, reach 54) is the default swing. Each extra (ailment, flinch, crit, drain, foe stat drop) costs area:
// one small-chance extra keeps 80%, a strong one (50%+ chance, a drain, a trap) or two extras keep 65%. Drawbacks (recoil,
// own stat drops) cost nothing. The move's name picks which way it gives the area up.
const FAMILY = [
  ['narrow', /punch|chop|jab|uppercut|brick/, 'narrower arc'],
  ['short', /fang|bite|crunch|clamp|leech|bind|wrap/, 'shorter reach'],
  ['sweep', /claw|slash|blade|cross-poison/, 'wide arc, short reach'],
  ['long', /tail|whip|kick|horn|drill|stomp/, 'narrow arc, long reach'],
];
function meleeExtras(pay) {
  const x = pay.filter(
    (fx) =>
      ['ailment', 'flinch', 'crit'].includes(fx.t) ||
      (fx.t === 'heal' && fx.amount.from) ||
      (fx.t === 'stat' && fx.side === 'foe')
  );
  const strong = x.length > 1 || x.some((fx) => fx.t !== 'crit' && (fx.chance == null || fx.chance >= 50));
  return { n: x.length, f: !x.length ? 1 : strong ? 0.65 : 0.8, strong };
}
const melee = (o, c) => {
  let arc = o.heavy ? 2 : 1.7,
    r = o.heavy ? 60 : 54,
    why = o.heavy ? 'heavy swing' : 'Tackle swing';
  const x = meleeExtras(c.pay);
  if (x.f < 1) {
    const [fam, , say] = FAMILY.find(([, re]) => re.test(c.id)) || ['short', null, 'shorter reach'];
    if (fam === 'narrow') arc *= x.f;
    else if (fam === 'short') r *= Math.sqrt(x.f);
    else if (fam === 'sweep') ((arc *= 1.3), (r *= Math.sqrt(x.f / 1.3)));
    else ((r *= 1.2), (arc *= x.f / 1.44));
    why += `, ${say} (${fam === 'short' && !FAMILY.some(([, re]) => re.test(c.id)) ? 'default' : fam + ' family'}) for ${x.strong ? 'a strong extra' : 'one small extra'}, ${Math.round(x.f * 100)}% area`;
  }
  return {
    kind: 'melee',
    balanceClass: 'melee',
    space: { shape: 'radial', radArc: Math.round(arc * 100) / 100, radRadius: Math.round(r), count: 1 },
    delivery: { anchor: 'caster', targeting: 'nearest', motion: 'static', endOn: [{ time: 0.15 }] },
    hitPolicy: 'oncePerInstance',
    knock: o.heavy ? 140 : 90,
    why,
  };
};
// Rule 2: each type's shot has a look read off the original moves; power scales it (under 60: 25% smaller, 15% faster;
// 100 and up: 25% bigger, 15% slower). aim nearest steers (Confusion); kb adds knockback (Rock Throw).
const SHOT_TYPE = {
  water: { r: 6, v: 350, p: 1, spr: 0.1, say: 'pierces one, quick (Water Gun)' },
  fire: { r: 7, v: 310, p: 0, spr: 0.12, say: 'wobbles (Ember)' },
  ghost: { r: 9, v: 280, p: 1, spr: 0.1, say: 'slow, big, pierces one (Shadow Ball)' },
  electric: { r: 7, v: 480, p: 0, say: 'very fast (Thunder Shock)' },
  rock: { r: 9, v: 260, p: 0, spr: 0.12, kb: 90, say: 'slow, big, knockback (Rock Throw)' },
  psychic: { r: 7, v: 280, p: 0, aim: 1, say: 'steers to the nearest foe (Confusion)' },
  grass: { r: 8, v: 290, p: 0, say: 'medium (Giga Drain)' },
  poison: { r: 7, v: 310, p: 0, say: 'medium (Sludge)' },
  steel: { r: 9, v: 330, p: 0, say: 'big (Meteor Mash)' },
  fighting: { r: 9, v: 260, p: 0, kb: 90, say: 'slow, big, knockback' },
  flying: { r: 5, v: 420, p: 0, say: 'thin and fast' },
  fairy: { r: 8, v: 300, p: 1, say: 'pierces one' },
  normal: { r: 7, v: 320, p: 0, say: 'plain' },
};
const SHOT_DEF = { r: 8, v: 300, p: 0, say: 'plain' };
const shot = (o, c, status) => {
  const b = SHOT_TYPE[c.type] || SHOT_DEF,
    pw = status ? null : c.power,
    tier = pw == null ? 0 : pw < 60 ? -1 : pw >= 100 ? 1 : 0;
  const r = Math.round(b.r * (1 + 0.25 * tier)),
    v = Math.round((b.v * (1 - 0.15 * tier)) / 10) * 10,
    steer = b.aim || o.home;
  const space = { shape: 'radial', radRadius: r, count: 1, pierce: b.p };
  if (b.spr) space.spread = b.spr;
  const delivery = { anchor: 'caster', targeting: steer ? 'nearest' : 'direction', motion: 'travels', moveSpeed: v };
  if (steer) delivery.turnRate = 3;
  delivery.endOn = ends(status ? 1.2 : 1.5);
  return {
    kind: 'projectile',
    balanceClass: 'ranged',
    space,
    delivery,
    hitPolicy: 'oncePerInstance',
    knock: b.kb,
    why: `${c.type} shot: ${b.say}${tier ? (tier > 0 ? ', strong: bigger and slower' : ', weak: smaller and faster') : ''}${o.home ? ', homes on the nearest foe (never misses)' : ''}`,
  };
};
const BUILD = {
  melee,
  shot,
  statusShot: (o, c) => shot(o, c, true),
  // Rule 5 uniques
  cloud: () => ({
    kind: 'projectile',
    balanceClass: 'ranged',
    space: { shape: 'radial', radRadius: 22, count: 1, pierce: 'UNLIMITED' },
    delivery: {
      anchor: 'caster',
      targeting: 'direction',
      motion: 'travels',
      moveSpeed: 90,
      endOn: [{ time: 1 }, { contact: 'wall' }],
    },
    hitPolicy: 'oncePerInstance',
    why: 'powder: a short slow cloud that drifts through foes',
  }),
  // a wave (Jess 2026-11-02): a band 16 px deep across the aim, 60 px wide, widening to 260 by the end of its 300 px run.
  // Wider than long, so the range upgrade stretches its width (move-geom). Takes priority over rule 3.
  wave: () => ({
    kind: 'nova',
    balanceClass: 'ranged',
    space: { shape: 'linear', linLength: 16, linWidth: 60, pierce: 'UNLIMITED' },
    delivery: {
      anchor: 'caster',
      targeting: 'nearest',
      motion: 'travels',
      moveSpeed: 300,
      grow: { growSpeed: 0.667, dim: 'linWidth', per: 'distance', max: 260 },
      endOn: ends(1),
    },
    hitPolicy: 'oncePerInstance',
    why: 'a wave by name: a widening band',
  }),
  zone: () => ({
    kind: 'mine',
    balanceClass: 'ranged',
    space: { shape: 'radial', radRadius: 40, count: 1, pierce: 'UNLIMITED' },
    delivery: { anchor: 'world', targeting: 'location', motion: 'static', endOn: [{ time: 2.5 }] },
    hitPolicy: 'interval',
    rehit: 0.5,
    why: 'a sand patch at a foe that lasts 2.5 s and traps whoever stands in it',
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
  const s = g.space || {},
    d = g.delivery || {};
  const shape = {
    melee: `Melee arc ${s.radArc} rad, reach ${s.radRadius} px, aims at nearest`,
    shot: `One shot, radius ${s.radRadius} px${s.pierce ? ', pierces ' + s.pierce : ''}`,
    statusShot: `One shot, radius ${s.radRadius} px${s.pierce ? ', pierces ' + s.pierce : ''}, no damage`,
    cloud: 'Cloud, radius 22 px, passes through every foe, no damage',
    zone: 'Circle 40 px on the ground at a foe, hits every 0.5 s',
    wave: 'Band 16 px deep across the aim, 60 px wide growing to 260, passes through every foe',
    meteors: '3 circles of 60 px, each on the nearest foe',
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
    shot: `Travels ${d.moveSpeed} px/s ${d.turnRate ? 'steering to the nearest foe' : 'toward aim'}, ends at 1.5 s, a wall or off screen`,
    statusShot: `Travels ${d.moveSpeed} px/s ${d.turnRate ? 'steering to the nearest foe' : 'toward aim'}, ends at 1.2 s, a wall or off screen`,
    cloud: 'Drifts 90 px/s toward aim, ends at 1 s or a wall',
    zone: 'Placed on a random foe in range, lasts 2.5 s',
    wave: 'Travels 300 px/s at the nearest foe, ends at 1 s, a wall or off screen',
    meteors: 'One every 0.25 s; each warns 0.4 s, then lands for 0.2 s',
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
  return { shape, delivery, payload: pw.join(', ') || 'none', rule: g.why || '' };
}

/** One full catalog entry for id with pattern p and options o. */
function entry(id, p, o) {
  const a = api[id];
  if (!a) throw new Error('no pokeapi entry for ' + id);
  let pay = payloadOf(id, a),
    g,
    shown = null;
  const c = { id, type: a.type, power: a.source.power, pay };
  if (p === 'meteors') {
    // Rule 5 (Draco Meteor): three falls, each on the nearest foe when it is emitted; the own stat drop stays on the cast
    const own = pay.filter((fx) => fx.t === 'stat' && fx.side === 'self'),
      hit = pay.filter((fx) => !own.includes(fx));
    g = {
      kind: 'meteor',
      balanceClass: 'ranged',
      delivery: { anchor: 'caster', targeting: 'none', motion: 'static', endOn: [{ time: 0.25 * 3 + 0.2 }] },
      why: 'three meteors instead of one',
    };
    const im = {
      kind: 'meteor',
      space: { shape: 'radial', radArc: TAU, radRadius: 60, count: 1 },
      delivery: { anchor: 'target', targeting: 'nearest', motion: 'falls', delay: 0.4, endOn: [{ time: 0.2 }] },
      hitPolicy: 'oncePerInstance',
      payload: hit,
    };
    pay = own.concat([{ t: 'emit', every: 0.25, count: 3, trigger: 'cast', move: im }]);
    shown = pay.slice(0, own.length).concat(hit);
  } else if (p === 'multi') {
    const inner = BUILD[o.on](o, c);
    const ipay = pay.slice();
    if (o.on === 'melee') ipay.push({ t: 'knockback', distance: 40 });
    else if (inner.knock) ipay.push({ t: 'knockback', distance: inner.knock });
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
    g.why = `${o.n} repeats of: ${inner.why}`;
  } else {
    g = BUILD[p](o, c);
    if (p === 'statusShot' || p === 'cloud') pay = pay.filter((fx) => fx.t !== 'damage');
    else if (g.knock) pay.push({ t: 'knockback', distance: g.knock });
    // Rule 3: hits everyone around in mainline, or a sound or look, is a ring (nova); a damaging spray of objects is a burst
    if (p === 'ring')
      g.why = a.target === 'all-other-pokemon' ? 'hits everyone around in mainline: ring' : 'a sound or look: ring';
    if (p === 'burst') g.why = 'a damaging spray of objects: burst';
  }
  delete g.knock;
  const w = words(p, o, g, shown || pay);
  delete g.why;
  const e = {
    id,
    name: a.name,
    kind: g.kind,
    balanceClass: g.balanceClass,
    feel: `Kanto batch 1 proposal. ${PATTERNS[p]}${w.rule ? ' (' + w.rule + ')' : ''}. Shape: ${w.shape}. Delivery: ${w.delivery}. Payload: ${w.payload}.`,
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
  if (g.rehit) e.rehit = g.rehit;
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
