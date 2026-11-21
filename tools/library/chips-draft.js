// tools/library/chips-draft.js: the Chips page (Unified). A plain script sharing the board's globals (it uses the Fold
// Map's foldOf, the colour sets in colours-today.js and clean-draft.js's helpers), so it loads after them; index.html
// loads the board's files in order, board.js first and start.js last.
'use strict';
// ---------- Chips, Unified (Jess 2026-11-19): one capsule for statuses, effects and types ----------
// Today the game has two chips: the HUD's status and effect chips (js/ui/hud-kit-chips.js: the B2 capsule tag, 70 x 24,
// a 2 art pixel shade rim, a sliding glow, a 2 px timer) and the menus' type chips (G.UI.typeChip in js/ui/ui.js and
// css/style.css .type: a CSS box with a 6 px radius and 12 px bold text). A chip names something one Pokemon has (its
// status, its effects, its types), so it is pixel (decision 2026-11-18-155-pixel-panels-for-one-pokemon-clean-for-
// the-rest): one shape, the capsule, for all three. Two chips, two scales (Jess 2026-11-19): chip.status, the run
// screen's status and effect chips, is 1 px per art pixel with Silver 10, so the chip's pixel and the font's match;
// chip.type comes at either scale, 1 px with Silver 10 or 2 px with Silver 20. The colours are the Fold Map's (foldOf),
// so the chips follow it. A board copy: nothing here reads the game's chips.
const CHIP = {
  rim: 2, // art pixels: the shade rim (Jess 2026-11-10), today's
  corner: [2, 2, 1, 1], // art pixels each top row sits in from the sides (the B2 capsule); the bottom mirrors it
  timer: 1, // art pixel tall, along the lowest fill row, today's
  drainSeconds: 6, // the board's timer demo
  glow: { left: -10, width: 6, travel: 55 }, // art pixels: today's glow (-20, 12 and 110 px at 2 px per art pixel)
};
// Each scale's text sits on whole pixels: line-height is the face's own height at that size (no half leading at 10,
// a 5 px negative one at 20), and textTop puts the capitals in the middle of the fill.
const CHIP_SCALES = {
  // Silver 10: 9 px capitals with a 1 px outline need 11 fill rows, so 17 rows with the rim; capitals on rows 4 to 12
  one: { artPixel: 1, rows: 17, font: 10, lineHeight: 15, textTop: 1, widths: { tag: 40, type: 60 } },
  // Silver 20: 18 px capitals with a 2 px outline need 22 px of fill, so 16 art rows (32 px); capitals on 7 to 24.
  // 116 px wide so ELECTRIC (94 px, 98 with its outline) clears the rim on the stepped rows too
  two: { artPixel: 2, rows: 16, font: 20, lineHeight: 20, textTop: 6, widths: { type: 116 } },
  // today's HUD chip, for comparing: 12 art rows (24 px), HudText 20
  today: { artPixel: 2, rows: 12, font: 20, lineHeight: 20, textTop: 1, widths: { tag: 70 }, family: 'HudText' },
};
const CHIP_COLOURS = {
  outline: greyTone('ink'), // the text's 8 hard shadows; was #101010, the same
  text: greyTone('white'),
  timer: greyTone('white'),
  hollowBody: greyTone('ink'), // the minor chips' body; was #101010, the same
};
const chipEdges = (rows) => [
  ...CHIP.corner,
  ...Array(rows - 2 * CHIP.corner.length).fill(0),
  ...[...CHIP.corner].reverse(),
];
/** Per row: the fill's inset from each side (inside the rim's reach of the outline), or null for a row all rim. */
function chipFillInsets(edges) {
  return edges.map((_, row) => {
    if (row < CHIP.rim || row >= edges.length - CHIP.rim) return null;
    let deepest = 0;
    for (let near = row - CHIP.rim; near <= row + CHIP.rim; near++) deepest = Math.max(deepest, edges[near]);
    return deepest + CHIP.rim;
  });
}
/** The capsule as an SVG: each art row the shade rim at both ends and the fill between. */
function chipSvg(artWidth, edges, fills, fill, shade, px) {
  const rects = edges.flatMap((edge, row) => {
    const inner = fills[row];
    const spans =
      inner == null
        ? [[edge, artWidth - 2 * edge, shade]]
        : [
            [edge, inner - edge, shade],
            [inner, artWidth - 2 * inner, fill],
            [artWidth - inner, inner - edge, shade],
          ];
    return spans.map(
      ([x, width, colour]) => `<rect x="${x}" y="${row}" width="${width}" height="1" fill="${colour}" />`
    );
  });
  return `<svg class="lib-chip-shape" width="${artWidth * px}" height="${edges.length * px}"
    viewBox="0 0 ${artWidth} ${edges.length}" shape-rendering="crispEdges">${rects.join('')}</svg>`;
}
/** The glow's clip: the fill's stepped outline in screen pixels, so the glow never crosses the rim. */
function chipClip(width, fills, px) {
  const leftSide = [],
    rightSide = [];
  fills.forEach((inset, row) => {
    if (inset == null) return;
    const top = row * px,
      bottom = top + px,
      left = inset * px,
      right = width - left;
    leftSide.push(`${left}px ${top}px`, `${left}px ${bottom}px`);
    rightSide.unshift(`${right}px ${top}px`, `${right}px ${bottom}px`);
  });
  return 'polygon(' + leftSide.concat(rightSide).join(', ') + ')';
}
/** The timer: along the lowest fill row, inside the cut corners, draining in whole art pixels. */
function chipTimer(width, edges, fills, px) {
  const inset = fills[edges.length - CHIP.rim - 1] * px,
    steps = (width - 2 * inset) / px;
  return `<div class="lib-chip-timer" style="left:${inset}px;width:${width - 2 * inset}px;height:${CHIP.timer * px}px;
    bottom:${CHIP.rim * px}px;background:${CHIP_COLOURS.timer};
    animation-duration:${CHIP.drainSeconds}s;animation-timing-function:steps(${steps}, end)"></div>`;
}
/** One chip: { label, fill, shade (each { value }), text (a hollow chip's colour), scale (a CHIP_SCALES key),
 *  width, timer, glow }. */
function chipHtml(chip) {
  const scale = CHIP_SCALES[chip.scale || 'one'],
    px = scale.artPixel,
    width = chip.width || scale.widths.tag,
    edges = chipEdges(scale.rows),
    fills = chipFillInsets(edges),
    vars = [
      ['width', width + 'px'],
      ['height', scale.rows * px + 'px'],
      ['--chip-outline', CHIP_COLOURS.outline],
      ['--chip-text', chip.text ? chip.text.value : CHIP_COLOURS.text],
      ['--chip-font', `'${scale.family || 'Silver 10px'}'`], // quoted: an unquoted family can't start with a digit
      ['--chip-size', scale.font + 'px'],
      ['--chip-line', scale.lineHeight + 'px'],
      ['--chip-text-top', scale.textTop + 'px'],
      ['--chip-font-pixel', scale.font / 10 + 'px'],
      ['--chip-glow-left', CHIP.glow.left * px + 'px'],
      ['--chip-glow-width', CHIP.glow.width * px + 'px'],
      ['--chip-glow-travel', CHIP.glow.travel * px + 'px'],
    ];
  return `<div class="lib-chip" style="${vars.map(([name, value]) => `${name}:${value}`).join(';')}">
    ${chipSvg(width / px, edges, fills, chip.fill.value, chip.shade.value, px)}
    <span class="lib-chip-text">${esc(chip.label)}</span>
    ${chip.glow === false ? '' : `<div class="lib-chip-glow" style="clip-path:${chipClip(width, fills, px)}"></div>`}
    ${chip.timer ? chipTimer(width, edges, fills, px) : ''}</div>`;
}

// ---------- the colours: today's, and where the Fold Map lands them ----------
/** One chip colour: { today, value, key }; value is the Fold Map's landing, or today's when nothing folds it. */
function chipTone(swatches, label, part) {
  const swatch = swatches.find((entry) => entry.label === label),
    today = valueOf(swatch.colours.find((colour) => colour[0] === part)),
    fold = foldOf(unifiedKey(label, part), today);
  return { today, value: fold ? fold.value : today, key: fold ? fold.key : 'unchanged' };
}
const capitalised = (type) => type[0].toUpperCase() + type.slice(1);
/** A canon type tone (base or dark); types are canon, so today and Unified are the same. */
function typeTone(type, part) {
  const value = valueOf([part, 'color.type.' + type + '.' + part]);
  return { today: value, value, key: 'type' + capitalised(type) + '.' + part };
}
const greyChipTone = (part, today) => ({ today, value: greyTone(part), key: 'grey.' + part });
const solidChip = (label, swatches, swatchLabel, extra = {}) => ({
  label,
  fill: chipTone(swatches, swatchLabel, 'fill'),
  shade: chipTone(swatches, swatchLabel, 'shade'),
  ...extra,
});
function hollowChip(label, part, extra = {}) {
  const tone = chipTone(STATUS_SWATCHES, 'color.statusMinor', part),
    body = { today: CHIP_COLOURS.hollowBody, value: CHIP_COLOURS.hollowBody, key: 'grey.ink' };
  return { label, fill: body, shade: tone, text: tone, hollow: true, ...extra };
}
// type names in capitals (Jess 2026-11-19, reversing 2026-11-11's “Ghost”): no letter falls below the line
const typeChip = (type, extra = {}) => ({
  label: type.toUpperCase(),
  fill: typeTone(type, 'base'),
  shade: typeTone(type, 'dark'),
  width: CHIP_SCALES.one.widths.type,
  glow: false,
  ...extra,
});
const CHIP_GROUPS = [
  {
    id: 'status',
    name: 'chip.status',
    title: 'The major statuses: solid, fill over shade (a timer while it runs out)',
    chips: [
      solidChip('PAR', STATUS_SWATCHES, 'color.statusParalysis', { timer: true }),
      solidChip('FRZ', STATUS_SWATCHES, 'color.statusFreeze', { timer: true }),
      solidChip('BRN', STATUS_SWATCHES, 'color.statusBurn', { timer: true }),
      solidChip('PSN', STATUS_SWATCHES, 'color.statusPoison'),
      { ...solidChip('PSN', STATUS_SWATCHES, 'color.statusToxic'), note: 'bad poison' },
      solidChip('SLP', STATUS_SWATCHES, 'color.statusSleep', { timer: true }),
    ],
  },
  {
    id: 'minor',
    name: 'chip.status',
    title:
      'The minor statuses: hollow, a grey.ink body inside a rim of the colour, the text in it (character panel only)',
    chips: [
      hollowChip('CNF', 'confusion', { timer: true }),
      hollowChip('DZE', 'daze', { timer: true }),
      hollowChip('DRW', 'drowsy'),
      hollowChip('TRP', 'trap', { timer: true }),
    ],
  },
  {
    id: 'stats',
    name: 'chip.status',
    title: 'Stat raises and drops: the canon stat ramps (the band says which way)',
    chips: [
      solidChip('ATK', STAT_SWATCHES, 'color.statAtk', { timer: true }),
      solidChip('DEF', STAT_SWATCHES, 'color.statDef', { timer: true }),
      solidChip('SPA', STAT_SWATCHES, 'color.statSpa'),
      solidChip('SPD', STAT_SWATCHES, 'color.statSpd', { timer: true }),
      solidChip('SPE', STAT_SWATCHES, 'color.statSpe'),
    ],
  },
  {
    id: 'team',
    name: 'chip.status',
    title: 'The team\u2019s timed effects, a type guard and the overflow count',
    chips: [
      solidChip('REG', EFFECT_SWATCHES, 'color.effectRegen', { timer: true }),
      { ...solidChip('KEE', STAT_SWATCHES, 'color.statDef', { timer: true }), note: 'Defense\u2019s ramp' },
      { ...solidChip('MAR', STAT_SWATCHES, 'color.statSpd'), note: 'Sp. Def\u2019s ramp' },
      solidChip('LAN', EFFECT_SWATCHES, 'color.effectCrit', { timer: true }),
      solidChip('PIN', EFFECT_SWATCHES, 'color.effectDrop'),
      { ...typeChip('fire', { timer: true }), label: 'OCC', width: null, glow: true, note: 'Fire guard' },
      {
        label: '+3',
        fill: greyChipTone('slate', '#495151'),
        shade: greyChipTone('panel', '#212121'),
        note: 'a band past 12 chips',
      },
    ],
  },
];
const typeChipsAt = (scale) =>
  TYPE_NAMES.map((type) => typeChip(type, { scale, width: CHIP_SCALES[scale].widths.type }));

// ---------- the page ----------
// a line holds 6 chips, as the HUD's bands do; the row is as wide as 6 of its first chip and 5 gaps
const CHIP_ROW = { perLine: 6, gap: 6 };
function chipRow(chips) {
  const first = chips[0],
    width = first.width || CHIP_SCALES[first.scale || 'one'].widths.tag,
    lineWidth = CHIP_ROW.perLine * width + (CHIP_ROW.perLine - 1) * CHIP_ROW.gap;
  return `<div class="lib-chip-row" style="max-width:${lineWidth}px;gap:${CHIP_ROW.gap}px">${chips
    .map(chipHtml)
    .join('')}</div>`;
}
const chipTile = (state, title, inner) => `<figure class="lib-state">
  <div class="lib-stage lib-chip-stage" data-state="${esc(state)}" style="background:${CLEAN_STAGE}">${inner}</div>
  <figcaption>${nameButton(state.replace(':', '.'))}<br>${esc(title)}</figcaption></figure>`;
const toneCell = (tone) => `<td><div class="lib-colour-chip" style="background:${esc(tone.value)}"></div></td>
  <td class="lib-mono">${esc(tone.key)} ${esc(tone.value)}${
    tone.today.toLowerCase() === tone.value.toLowerCase()
      ? ''
      : ` <span class="lib-dim">(was ${esc(tone.today)})</span>`
  }</td>`;
function chipTable() {
  const rows = CHIP_GROUPS.flatMap((group) => group.chips).map(
    (chip) => `<tr><td class="lib-mono">${esc(chip.label)}</td><td class="lib-dim">${esc(chip.note || '')}</td>
      ${toneCell(chip.fill)}${toneCell(chip.shade)}</tr>`
  );
  return `<table class="lib-chip-table"><thead><tr><th>Tag</th><th></th><th colspan="2">Fill (hollow: body)</th>
    <th colspan="2">Shade (hollow: rim and text)</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}
function chipSizeSection() {
  const sample = CHIP_GROUPS[0].chips[0];
  return `<div class="lib-states">
      ${chipTile('chip.status:today', 'Today: 70 x 24, 2 px per art pixel, HudText 20 (retiring)',
        chipHtml({ ...sample, scale: 'today' }))}
      ${chipTile('chip.status:rest', 'Unified: 40 x 17, 1 px per art pixel, Silver 10 (font and chip pixels match)',
        chipHtml(sample))}
    </div>`;
}
function chipLooksSection() {
  const one = CHIP_SCALES.one,
    tiles = CHIP_GROUPS.map((group) => chipTile(group.name + ':' + group.id, group.title, chipRow(group.chips)));
  return `<section class="lib-story" data-draft="chip.status">
    <h3>${nameButton('chip.status')} ${draftTag('pixel: one Pokemon\u2019s statuses and effects, the run screen')}</h3>
    ${chipSizeSection()}
    <h4 class="lib-dim">The run screen's chips: solid and hollow, ${one.widths.tag} x ${one.rows}, the glow on, a
      timer where the effect runs out (the board drains them every ${CHIP.drainSeconds} s)</h4>
    <div class="lib-states">${tiles.join('')}</div>
    <dl class="lib-facts">
      <dt>Looks</dt><dd>${nameButton('chip.status.solid')} fill over shade; ${nameButton('chip.status.hollow')} a
        grey.ink body inside the colour's rim, the text in the colour (the minor statuses only, today's rule)</dd>
      <dt>Props</dt><dd>label, the colours, timer (a fraction, or none); always 1 px per art pixel, Silver 10, the
        glow on (Jess 2026-11-19)</dd>
      <dt>Shape</dt><dd>The B2 capsule: corners stepped ${CHIP.corner.join(', ')} art pixels in, a ${CHIP.rim} art
        pixel shade rim; ${one.rows} rows at 1 px per art pixel (today 12 at 2 px, 24 px tall)</dd>
      <dt>Text</dt><dd>Silver 10, white (hollow: its colour) with 8 hard grey.ink shadows 1 px out; was HudText 20.
        Capitals 9 px, every tag 18 px wide, centred in the ${one.widths.tag} px tag</dd>
      <dt>Glow</dt><dd>Today's at the chip's scale: a white band at 45%, ${CHIP.glow.width} art pixels wide, sliding
        left to right every 1.6 s, clipped to the fill</dd>
      <dt>Timer</dt><dd>${CHIP.timer} art pixel grey.white along the lowest fill row, inside the corners, stepping in
        whole art pixels as today's does</dd>
      <dt>Shrinks</dt><dd>The HUD's chip area (4 lines, 6 px gaps) goes from 114 px tall to 86, a line of 6 from 450 px
        wide to 270; the playerActive composite places it</dd>
      <dt>Open</dt><dd>The HUD's other pixel art (the bar, the held item, the portrait) is 2 px per art pixel; judge the
        1 px chips beside it in the composite. PIN is 17 px of text, so it centres half a pixel off on the board (the
        game places it on a whole pixel)</dd>
    </dl>
    ${chipTable()}
    <dl class="lib-facts">
      <dt>Colours</dt><dd>Read from the Fold Map (Colours, Fold Map), so a change there changes the chips: the
        statuses take the canon type ramps (decision 2026-11-18-155-status-chip-colours), REG green, LAN Fighting, PIN
        Electric light (decision 2026-11-18-155-unified-palette). The stat chips and the type guards stay canon.</dd>
      <dt>Not shown</dt><dd>The altar power chips (FRY THN MAG HST) take the power's own data colour, ramped;
        unchanged</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/chips-draft.js; changing one changes only the board</dd>
    </dl></section>`;
}
function typeChipSection() {
  const one = CHIP_SCALES.one,
    two = CHIP_SCALES.two;
  return `<section class="lib-story" data-draft="chip.type">
    <h3>${nameButton('chip.type')} ${draftTag('pixel: a Pokemon\u2019s or a move\u2019s type, at two scales')}</h3>
    <div class="lib-states">
      ${chipTile('chip.type:one', `1 px per art pixel: ${one.widths.type} x ${one.rows}, Silver 10`,
        chipRow(typeChipsAt('one')))}
      ${chipTile('chip.type:two', `2 px per art pixel: ${two.widths.type} x ${two.rows * two.artPixel}, Silver 20`,
        chipRow(typeChipsAt('two')))}
    </div>
    <dl class="lib-facts">
      <dt>Two scales</dt><dd>Jess 2026-11-19: chip.type is either 1 px per art pixel with Silver 10 or 2 px with
        Silver 20, so each matches its own font. The same capsule as chip.status, base over dark, no glow, no timer.
        Which place takes which is decided in the composites</dd>
      <dt>Props</dt><dd>type, scale (one or two)</dd>
      <dt>Capitals</dt><dd>Jess 2026-11-19: FIGHTING, not Fighting, reversing 2026-11-11's \u201cGhost\u201d. Capitals
        never fall below the line, so the g, y and p tails stay off the bottom rim at both scales</dd>
      <dt>Was</dt><dd>css/style.css .type: the same base and dark (the 2 px rim), a 6 px rounded CSS box, 12 px bold
        mixed-case text with a 1 px shadow, about 18 px tall</dd>
      <dt>Width</dt><dd>One width per scale, so a column lines up: ELECTRIC, the widest, is 47 px in Silver 10 and 94
        in Silver 20. Seven names are an odd number of font pixels (FIRE, ELECTRIC, ICE, POISON, FLYING, PSYCHIC,
        FAIRY), so they centre half a font pixel off on the board; the game places them on a whole one</dd>
      <dt>Not chips</dt><dd>The Pokedex filter chips (.chip.type-chip, on and off) are toggles, so they go with the
        buttons and toggles at #126. The level-up card's tag is text without a rim, unchanged</dd>
      <dt>Used at</dt><dd>${['pause.pokemonDetail.types', 'main.team.types', 'main.pokedex.types', 'sheet.move.type']
        .map(nameButton)
        .join('')}</dd>
    </dl></section>`;
}

const CHIP_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note:
      'The chips going forward: one B2 capsule for the statuses, the effects and the types, in Silver and the ' +
      'Fold Map\u2019s colours. HUD chips at 1 px per art pixel; type chips at 1 px and 2 px. Today\u2019s chips ' +
      'are on the Colours page (Status kit) and in the game.',
    draw: () => chipLooksSection() + typeChipSection(),
  },
];
const chipsPage = (tab) => tabbedPage('Chips', CHIP_TABS, tab);
