// tools/library/colours-pages.js: the Colours pages: Reference Not in Game, Unified and the Fold Map. A plain script sharing the board's globals; index.html
// loads the board's files in order, board.js first and start.js last.
'use strict';
// ---------- Reference Not in Game: the UI-PALETTES sets the game does not use (Jess 2026-11-18) ----------
// Read from the board's doc data (doc-colours.js, generated from docs/UI-PALETTES.md), so the tab follows the doc.
const unaccent = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const camelName = (text) =>
  unaccent(text)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('');
/** A UI-PALETTES section's rows as [name, [light, base, dark]] (each row is listed once per hex in the doc data). */
function paletteRows(section) {
  const lines = (window.LIBRARY_DOC_COLOURS || [])
    .filter((entry) => entry.doc === 'UI-PALETTES.md' && entry.section === section)
    .map((entry) => entry.line);
  return [...new Set(lines)]
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 4 && cells[1].startsWith('#'))
    .map(([name, lightHex, baseHex, darkHex]) => [name, [lightHex, baseHex, darkHex]]);
}
const referenceGroup = (title, section, prefix, use, keep = () => true) => ({
  title,
  swatches: paletteRows(section)
    .filter(([name]) => keep(name))
    .map(([name, tones]) =>
      canonRamp(prefix + camelName(name.replace(/ pocket$/, '')), name + '; ' + use, tones, section)
    ),
});
// the Generation IV pockets are on Unified (POCKET_SWATCHES); the rest of "Bag" is reference only
const GEN4_POCKETS = ['Items', 'Key items', 'Berries', 'Battle items', 'Mail', 'Medicine', 'Poké Balls', 'TMs and HMs'];
const isGen4Pocket = (name) => GEN4_POCKETS.includes(name.replace(/ pocket$/, ''));
const REFERENCE_GROUPS = [
  referenceGroup('Seasons', 'Seasons', 'color.season', 'a possible weather or season tint'),
  referenceGroup('Regions', 'Regions', 'color.region', 'a candidate for the Map panel (#65) and region select'),
  referenceGroup('Egg Groups', 'Egg Groups', 'color.eggGroup', 'no use yet'),
  referenceGroup(
    'Bag: pockets outside Generation IV',
    'Bag',
    'color.pocket',
    'not a Generation IV pocket',
    (name) => !isGen4Pocket(name)
  ),
  referenceGroup(
    'Pokemon Stats: Generation I Special',
    'Pokemon Stats',
    'color.stat',
    'the Gen I stat, no template',
    (name) => name.startsWith('Special (Gen I)')
  ),
];
/** Groups as headings over rows of swatches (the Unified and Reference tabs). */
const groupsHtml = (groups) =>
  groups.map((group) => `<h3>${esc(group.title)}</h3>` + swatchRow(group.swatches)).join('');
function referencePage() {
  const count = REFERENCE_GROUPS.reduce((sum, group) => sum + group.swatches.length * 3, 0);
  return `<p class="lib-dim">${count} reference colours, none used by the game</p>` + groupsHtml(REFERENCE_GROUPS);
}
const UNIFIED_GROUPS = [
  { title: 'Neutrals', swatches: [GREY_DRAFT] },
  {
    title: 'Colours',
    swatches: [UNIFIED_RED, UNIFIED_GREEN, UNIFIED_BLUE, UNIFIED_YELLOW, UNIFIED_PURPLE, UNIFIED_PINK, UNIFIED_TEAL],
  },
  // the 18 canon type ramps (Scarlet/Violet), not counted in the UI total
  { title: 'Types (canon, not counted)', swatches: TYPE_SWATCHES, canon: true },
  { title: 'Status (canon, not counted)', swatches: STATUS_TYPE_SWATCHES, canon: true },
  { title: 'Attacks (canon, not counted)', swatches: ATTACK_SWATCHES, canon: true },
  { title: 'Bag: Generation IV pockets (canon, not counted)', swatches: POCKET_SWATCHES, canon: true },
  { title: 'Pokemon Stats (canon, not counted)', swatches: STAT_CANON_SWATCHES, canon: true },
  { title: 'Time (canon, not counted)', swatches: TIME_SWATCHES, canon: true },
];
function unifiedPage() {
  const count = new Set(
    UNIFIED_GROUPS.filter((group) => !group.canon)
      .flatMap((group) => group.swatches)
      .flatMap((group) => group.colours.map(valueOf))
  ).size;
  const ramps = UNIFIED_GROUPS.filter((group) => !group.canon && group.title !== 'Neutrals').reduce(
    (sum, group) => sum + group.swatches.length,
    0
  );
  return (
    `<p class="lib-dim">${count} non-canon colours: 7 neutrals and ${ramps} ramps of 3</p>` +
    UNIFIED_GROUPS.map((group) => `<h3>${esc(group.title)}</h3>` + swatchRow(group.swatches)).join('')
  );
}

// ---------- Fold Map: every colour the game uses today and where it lands on Unified (Jess 2026-11-18) ----------
// Each colour resolves in this order: a decided fold (FOLD_TO, the status and stat chip rules), then an exact match on
// Unified, then the grey scale (GREY_FOLD). Decisions: docs/decisions/2026-11-18-155-unified-palette.md,
// -status-chip-colours.md, -accent-ramp-rule.md.
const unifiedKey = (label, part) => label.replace(/^(color|unified)\./, '') + '.' + part;
let unifiedIndex = null;
function unifiedEntries() {
  if (!unifiedIndex) {
    unifiedIndex = [];
    for (const group of UNIFIED_GROUPS)
      for (const sw of group.swatches)
        for (const colour of sw.colours)
          unifiedIndex.push({ key: unifiedKey(sw.label, colour[0]), value: valueOf(colour), canon: !!group.canon });
  }
  return unifiedIndex;
}
const FOLD_TO = {
  // red: one ramp for danger and low HP
  'rimButtonFocusNegative.base': 'red.base',
  'rimButtonFocusNegative.dark': 'red.dark',
  'hudPauseRed.base': 'red.base',
  'textPause.behind': 'red.base',
  // green: the focus rim's ramp; HP high joins it
  'rimButtonFocusPositive.light': 'green.light',
  'rimButtonFocusPositive.dark': 'green.dark',
  'hpHigh.fill': 'green.base',
  'hpHigh.shade': 'green.dark',
  'effectRegen.fill': 'green.light',
  'effectRegen.shade': 'green.dark',
  // blue: EXP, with the canon SpA light and shade; the old teal joins it
  'hudExp.shade': 'blue.dark',
  'hudPanel.teal': 'blue.light',
  'scrollMenu.thumbRim': 'blue.light',
  // pink
  'rimBond.light': 'pink.light',
  // Electric (canon): Lv, HP middle, the bonus yellow
  'hudLevel.fill': 'typeElectric.base',
  'hudLevel.shade': 'typeElectric.dark',
  'hudLevel.dark': 'typeElectric.dark',
  'hpMiddle.fill': 'typeElectric.base',
  'hpMiddle.shade': 'typeElectric.dark',
  'hudBonus.fill': 'typeElectric.light',
  'hudBonus.shade': 'typeElectric.dark',
  'effectDrop.fill': 'typeElectric.light',
  'effectDrop.shade': 'typeElectric.dark',
  'textPause.bonus': 'typeElectric.light',
  'hudPauseHex.run': 'typeElectric.light@0.75',
  // Fighting (canon): LAN
  'effectCrit.fill': 'typeFighting.light',
  'effectCrit.shade': 'typeFighting.dark',
  // the pause menu's text blues and stat hex
  'textPause.value': 'typeFlying.light',
  'textPause.edge': 'typeWater.base',
  'hudPauseHex.line': 'grey.white@0.16',
  'hudPauseHex.lineEdge': 'grey.white@0.4',
  'hudPauseHex.now': 'grey.white@0.6',
  'hudPauseHex.nowEdge': 'grey.white',
  'hudPauseBall.capSlate': 'grey.raised',
  // greys that fold by name, not by value
  'scrollRunInfo.track': 'grey.raised',
  'textMenu.labelRefused': 'grey.white@0.45',
};
const STAT_NAMES = { Atk: 'Attack', Def: 'Defense', Spa: 'SpecialAttack', Spd: 'SpecialDefense', Spe: 'Speed' };
const solidOf = (value) => (seeThrough(value) ? seeThrough(value).hex : value);
/** Where one colour lands: { key, value } on Unified, or null when nothing resolves it. */
function foldOf(name, value) {
  const swatchName = name.slice(0, name.lastIndexOf('.')),
    part = name.slice(name.lastIndexOf('.') + 1);
  let to = FOLD_TO[name];
  if (!to && /^status(Paralysis|Freeze|Burn|Poison)$/.test(swatchName))
    to = swatchName + '.' + (part === 'fill' ? 'base' : 'dark');
  const stat = swatchName.match(/^stat(Atk|Def|Spa|Spd|Spe)$/);
  if (!to && stat) to = 'stat' + STAT_NAMES[stat[1]] + '.' + (part === 'fill' ? 'base' : 'dark');
  if (!to && /^status(Sleep|Toxic|Minor)$/.test(swatchName)) to = name;
  const entries = unifiedEntries();
  if (to) {
    const [key, alpha] = to.split('@');
    const hit = entries.find((entry) => entry.key === key);
    if (!hit) return null;
    return alpha
      ? { key: key + ' at ' + Math.round(Number(alpha) * 100) + '%', value: rgbaOf(solidOf(hit.value), Number(alpha)) }
      : { key, value: hit.value };
  }
  const exact = entries.find((entry) => entry.value === value);
  if (exact) return { key: exact.key, value: exact.value };
  const step = GREY_FOLD[value];
  if (step) return { key: 'grey.' + step, value: greyTone(step) };
  return null;
}
// colours outside the kits that the scheme also covers (the old canvas HUD, copies.js) or leaves out
const FOLD_OUTSIDE = [
  ['epicRarity', '#c47bff', 'The Epic rarity tier (js/systems/copies.js)', 'purple.base'],
  ['gymGateArrow.base', '#375ab2', 'Gym gate wayfinding arrow fill (hud.js)', 'attackSpecial.base'],
  ['gymGateArrow.dark', '#243b74', 'Gym gate arrow outline', 'attackSpecial.dark'],
  ['gymGateArrow.light', '#7d94cd', 'Gym gate arrow shine', 'attackSpecial.light'],
  ['moveTrainerArrow.base', '#eb5628', 'Move Trainer and TM Mart arrow fill', 'attackPhysical.base'],
  ['moveTrainerArrow.dark', '#99381a', 'Move Trainer arrow outline', 'attackPhysical.dark'],
  ['moveTrainerArrow.light', '#f29173', 'Move Trainer arrow shine', 'attackPhysical.light'],
  ['rescueArrow.light', '#8fdda5', 'Rescue arrow shine (#135, Proposed)', 'pocketBerries.light'],
  ['rescueArrow.base', '#3fae5a', 'Rescue arrow fill', 'pocketBerries.base'],
  ['rescueArrow.dark', '#22703a', 'Rescue arrow outline', 'pocketBerries.dark'],
  ['inkShadow', '#00213a', 'Main Menu v2 ink shadow (bw-menu.css)', null, 'stays out: #127 Main Menu v3.0 redoes it'],
  ['offWhiteTrack', '#f3f3f3', 'HUD-STYLE note: the B2 off-white track', null, 'stays out: a doc note'],
  ['ripGrey', '#c6c6c6', 'HUD-STYLE note: a B2 rip grey', null, 'stays out: a doc note'],
  ['kantoNote', '#80bb1d', 'UI-PALETTES note: Kanto, a candidate use', null, 'stays out: on Reference Not in Game'],
];
const FOLD_KITS = [
  ['HUD kit', () => HUD_KIT_SWATCHES],
  ['HP kit', () => HP_SWATCHES],
  ['RIM kit', () => RIM_SWATCHES],
  ['Scroll kit', () => SCROLL_SWATCHES],
  ['Text kit', () => TEXT_SWATCHES],
  ['Status kit', () => [...STATUS_SWATCHES, ...STAT_SWATCHES, ...EFFECT_SWATCHES]],
  ['Type kit', () => TYPE_SWATCHES, true],
];
function foldMapPage() {
  const chip = (value) => (value ? `<div class="lib-colour-chip" style="background:${esc(value)}"></div>` : '');
  const tally = { same: 0, "can't see it": 0, slight: 0, visible: 0, out: 0, missing: [] };
  const row = (name, value, where, landing, note) => {
    let change = '',
      words = note || '';
    if (landing) {
      const difference = deltaE(solidOf(value), solidOf(landing.value));
      words = changeWords(Math.round(difference * 10) / 10 === 0 ? 0 : difference);
      tally[words]++;
      change = difference ? difference.toFixed(1) : '';
    } else if (note) tally.out++;
    else {
      tally.missing.push(name);
      words = 'NO HOME';
    }
    return `<tr><td>${chip(value)}</td><td class="lib-mono">${esc(shown(value))}</td><td>${esc(where)}</td>
      <td>${chip(landing && landing.value)}</td>
      <td>${landing ? nameButton(landing.key) + `<span class="lib-mono"> ${esc(shown(landing.value))}</span>` : ''}</td>
      <td class="lib-mono">${change}</td><td>${esc(words)}</td></tr>`;
  };
  const head =
    '<thead><tr><th>Today</th><th>#HEX</th><th>Name today</th><th>Unified</th><th></th>' +
    '<th>Change</th><th></th></tr></thead>';
  const table = (rows) => `<table class="lib-props lib-colour-table">${head}<tbody>${rows.join('')}</tbody></table>`;
  const sections = FOLD_KITS.map(([title, swatches, collapse]) => {
    const rows = swatches().flatMap((sw) =>
      sw.colours.map((colour) => {
        const name = unifiedKey(sw.label, colour[0]),
          value = valueOf(colour);
        return row(name, value, name, foldOf(name, value));
      })
    );
    return collapse
      ? `<h3>${esc(title)}</h3><details><summary class="lib-dim">${rows.length} canon type colours, each unchanged
          (show)</summary>${table(rows)}</details>`
      : `<h3>${esc(title)}</h3>` + table(rows);
  });
  const entries = unifiedEntries();
  const outside = FOLD_OUTSIDE.map(([name, value, where, key, note]) => {
    const hit = key && entries.find((entry) => entry.key === key);
    return row(name, value, where, hit ? { key, value: hit.value } : null, note);
  });
  sections.push('<h3>Outside the kits</h3>' + table(outside));
  const total = tally.same + tally["can't see it"] + tally.slight + tally.visible;
  const summary = `<p class="lib-dim">${total} colours land on Unified: ${tally.same} unchanged,
    ${tally["can't see it"]} too close to see, ${tally.slight} slight, ${tally.visible} visible. ${tally.out} stay out on
    purpose. ${tally.missing.length ? 'No home yet: ' + esc(tally.missing.join(', ')) : 'Every colour has a home.'}
    Change is CIEDE2000 (about ${SEEN_FROM} is the smallest visible step, over ${SLIGHT_UNDER} clearly different).</p>`;
  return summary + sections.join('');
}
const COLOUR_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note:
      'The unified colour scheme: 7 neutrals and 7 UI colours (28 non-canon colours), then the canon sets the UI ' +
      'reads. Nothing in the game changes until #126 applies it.',
    draw: unifiedPage,
  },
  {
    id: 'folds',
    title: 'Fold Map',
    note:
      'Every colour the game uses today, kit by kit, and the Unified colour it becomes, with how far it moves. Read ' +
      'from the kits and the fold decisions, so it follows any change to either.',
    draw: foldMapPage,
  },
  {
    id: 'reference',
    title: 'Reference Not in Game',
    note:
      'Every docs/UI-PALETTES.md set the game does not use: Seasons, Regions, Egg Groups, the bag pockets outside ' +
      'Generation IV and the Gen I Special stat. Read from the doc, so it follows any edit there (rerun ' +
      'tools/library_doc_colours.js).',
    draw: referencePage,
  },
];
const coloursPage = (tab) => tabbedPage('Colours', COLOUR_TABS, tab);
