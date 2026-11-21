// tools/library/colours-canon.js: the canon reference sets from docs/UI-PALETTES.md. A plain script sharing the board's globals; index.html
// loads the board's files in order, board.js first and start.js last.
'use strict';
// ---------- canon reference sets from docs/UI-PALETTES.md (Bulbapedia three-tone palettes; not counted) ----------
const PALETTES_DOC = 'docs/UI-PALETTES.md';
/** A canon set's swatch: [light, base, dark] as written in UI-PALETTES.md. */
const canonRamp = (label, job, [lightHex, baseHex, darkHex], section) => ({
  label,
  job,
  source: PALETTES_DOC + ' "' + section + '"',
  colours: [
    ['light', null, lightHex],
    ['base', null, baseHex],
    ['dark', null, darkHex],
  ],
});
const ATTACK_SWATCHES = [
  ['Physical', ['#F29173', '#EB5628', '#99381A']],
  ['Special', ['#7D94CD', '#375AB2', '#243B74']],
  ['Status', ['#AEAEAE', '#828282', '#555555']],
].map(([name, ramp]) =>
  canonRamp(
    'color.attack' + name,
    name + ' moves (the damage class mark; Masters EX icons, white text)',
    ramp,
    'Attacks'
  )
);
// the Generation IV bag pockets only (UI-PALETTES "Bag" also lists Apricorn, Cologne, Ingredients, Treasures, Z-Crystals)
const POCKET_SWATCHES = [
  ['Items', "Items pocket (today the Shop's Team Item pocket rim)", ['#D89DB7', '#C86890', '#82445E']],
  ['KeyItems', 'Key Items pocket', ['#B788E6', '#9048D8', '#5E2F8C']],
  ['Berries', "Berries pocket (today the Shop's Berry pocket rim)", ['#6EC188', '#20A048', '#15682F']],
  ['BattleItems', 'Battle Items pocket', ['#78A2EB', '#3070E0', '#1F4992']],
  ['Mail', 'Mail pocket', ['#69B7CC', '#1890B0', '#105E72']],
  ['Medicine', 'Medicine pocket', ['#EBA27E', '#E07038', '#924924']],
  ['PokeBalls', 'Poke Balls pocket (today the bought ball belt rim)', ['#DBB26E', '#C88820', '#825815']],
  ['TmsHms', 'TMs and HMs pocket', ['#ACC66E', '#80A820', '#536D15']],
].map(([name, job, ramp]) => canonRamp('color.pocket' + name, job, ramp, 'Bag'));
const STAT_CANON_SWATCHES = [
  ['Hp', 'HP', ['#9EE865', '#69DC12', '#448F0C']],
  ['Attack', 'Attack (today the ATK chip: base and dark)', ['#F5DE69', '#EFCC18', '#9B8510']],
  ['Defense', 'Defense (today the DEF chip)', ['#F09A65', '#E86412', '#97410C']],
  ['SpecialAttack', 'Special Attack (today the SPA chip)', ['#66D8F6', '#14C3F1', '#0D7F9D']],
  ['SpecialDefense', 'Special Defense (today the SPD chip)', ['#899EEA', '#4A6ADF', '#304591']],
  ['Speed', 'Speed (today the SPE chip)', ['#E46CCA', '#D51DAD', '#8B1370']],
].map(([name, job, ramp]) =>
  canonRamp('color.stat' + name, job + '; the Sun and Moon level-up screen', ramp, 'Pokemon Stats')
);
const TIME_SWATCHES = [
  ['Morning', ['#A2DFEB', '#70CEE0', '#498692']],
  ['Day', ['#AAD6FC', '#7CC0FA', '#517DA3']],
  ['Evening', ['#EFBFA4', '#E79D73', '#96664B']],
  ['Night', ['#CFC2EF', '#B5A1E6', '#766996']],
].map(([name, ramp]) => canonRamp('color.time' + name, name + ' (Pokopia); a possible time-of-day tint', ramp, 'Time'));
// Status chips (Jess 2026-11-18): from Generation VIII the paralysis, frozen, burned and poisoned icons match the
// Electric, Ice, Fire and Poison type icons (Bulbapedia "Status condition"), so those chips take the type ramps: fill is
// the base, shade the dark. The rest (Jess 2026-11-18): sleep takes the greys, bad poison a darker Poison, and the
// hollow minor chips one colour each from the types or the 7 UI colours.
const statusFromType = (status, tag, type) => ({
  label: 'color.status' + status,
  job: tag + ' chip: the canon ' + type + ' type ramp (fill = base, shade = dark)',
  source: 'the ' + type + ' type (Bulbapedia: Gen VIII+ status icons match the type icons)',
  colours: ramp('color.type.' + type.toLowerCase()),
});
/** A Unified grey's value by its part (mid, slate), read from the grey scale so the chips follow it. */
const greyTone = (part) => valueOf(GREY_DRAFT.colours.find((colour) => colour[0] === part));
const STATUS_TYPE_SWATCHES = [
  statusFromType('Paralysis', 'PAR', 'Electric'),
  statusFromType('Freeze', 'FRZ', 'Ice'),
  statusFromType('Burn', 'BRN', 'Fire'),
  statusFromType('Poison', 'PSN', 'Poison'),
  {
    label: 'color.statusSleep',
    job: 'SLP chip: the greys (the Scarlet/Violet sleep icon is grey; no type matches it)',
    from: 'grey.mid and grey.slate (Unified); no new colours',
    colours: [
      ['fill', null, greyTone('mid')],
      ['shade', null, greyTone('slate')],
    ],
  },
  {
    label: 'color.statusToxic',
    job: "Bad PSN chip: darker than poison (Bulbapedia: from Gen V bad poison's flag is darker); fill is Poison's dark",
    from: 'fill the Poison type dark; shade worked out by the ramp rule (55% of it), the one new colour',
    colours: [
      ['fill', 'color.type.poison.dark'],
      ['shade', null, rampDark(G.Tokens.color('color.type.poison.dark'))],
    ],
  },
  {
    label: 'color.statusMinor',
    job: 'The hollow minor chips, character panel only: one colour each for the rim and the text, on the grey.ink body',
    from: 'confusion yellow.base, daze blue.base (Unified); drowsy the Psychic base, trap the Normal light (types)',
    colours: [
      ['confusion', 'color.hud.cursor'],
      ['daze', 'color.hud.expFill'],
      ['drowsy', 'color.type.psychic.base'],
      ['trap', 'color.type.normal.light'],
    ],
  },
];
