// tools/library/clean-draft.js: the Panels page tabs (Unified, Clean Draft, Current) and the clean panels (#157). A
// plain script sharing the board's globals; index.html loads the board's files in order, board.js first and start.js
// last.
'use strict';
// ---------- Panels, Clean Draft (#157, Jess 2026-11-19): the clean panel, one thing at a time ----------
// Decision 2026-11-18-155-pixel-panels-for-one-pokemon-clean-for-the-rest: what the team shares and the code's own
// interface sit in a clean panel. Step one (Jess 2026-11-19): a plain panel and nothing else, no title, no contents.
// Square corners, no cut and no bar (Jess 2026-11-19: both stay the button's). Board only: no story file and no game
// file until #126.
const CLEAN_PANEL = { body: greyTone('panel'), edge: greyTone('slate'), edgeWidth: 1, width: 240, height: 120 }; // edge 1 px (Jess 2026-11-19, down from 2)
const CLEAN_STAGE = greyTone('ink'); // behind the panel on the board
const cleanColour = (part, token, value) =>
  `<dt>${esc(part)}</dt><dd>${nameButton(token)}<span>${esc(value)}</span></dd>`;

// ---------- the Pokemon detail panel's background (Jess 2026-11-19): pause.pokemonDetail without its boxes ----------
// The shape is today's (js/ui/pause-pokemon.js DETAIL, NAME_BAND, LEVEL_BOX, BOTTOM_BAR): 635 x 1028, the top bar in the
// first type's colour (a 64 px name band, the level box dropping to 104 px with a diagonal step), the bottom bar in the
// second type's (48 px, a raised tab on the left for the arrows). Restyled clean: the plain panel's body and edge, the
// bars the canon type base with no outline (today's 1 px #212121 stroke goes), the edge drawn over everything. Each
// bar has a 4 px border in its type's dark on the side that meets the body only (Jess 2026-11-19, up from 2): the
// contact line is stroked twice as wide and clipped to the bar, so the whole border sits inside it, the step included.
const DETAIL_PANEL = { width: 635, height: 1028 };
const DETAIL_TOP_BAR = [[0, 0], [635, 0], [635, 104], [500, 104], [468, 64], [0, 64]];
const DETAIL_BOTTOM_BAR = [[0, 948], [170, 948], [196, 980], [635, 980], [635, 1028], [0, 1028]];
// the side of each bar that meets the body, from one panel edge to the other
const DETAIL_TOP_CONTACT = [[635, 104], [500, 104], [468, 64], [0, 64]];
const DETAIL_BOTTOM_CONTACT = [[0, 948], [170, 948], [196, 980], [635, 980]];
const DETAIL_BAR_BORDER = 4;
const DETAIL_SAMPLE_TYPES = ['water', 'flying']; // Gyarados: a dual type, so both bars show their own colour
// A board copy of the sample types' ramps (Jess 2026-11-19), from js/ui/lib/tokens/tokens.js TYPE_COLOURS, so the
// bars can be changed on the board without touching a game file. Add a type here to show it.
const DETAIL_TYPE_RAMPS = {
  water: { light: '#74ACF5', base: '#2980EF', dark: '#1B539B' }, // color.type.water
  flying: { light: '#ADD2F5', base: '#81B9EF', dark: '#54789B' }, // color.type.flying
};
const typeBase = (type) => DETAIL_TYPE_RAMPS[type].base;
const typeDark = (type) => DETAIL_TYPE_RAMPS[type].dark;
const pointList = (points) => points.map((point) => point.join(',')).join(' ');
// one bar: its type base, then its dark border on the contact side, kept inside the bar by its own clip
const detailBar = (id, shape, contact, type) => `<clipPath id="${id}"><polygon points="${pointList(shape)}" /></clipPath>
    <polygon points="${pointList(shape)}" fill="${typeBase(type)}" />
    <polyline points="${pointList(contact)}" fill="none" stroke="${typeDark(type)}"
      stroke-width="${DETAIL_BAR_BORDER * 2}" clip-path="url(#${id})" />`;
function detailBackground([firstType, secondType = firstType]) {
  const { width, height } = DETAIL_PANEL,
    edge = CLEAN_PANEL.edgeWidth;
  return `<svg width="${width}" height="${height}" style="display:block" shape-rendering="crispEdges">
    <rect width="${width}" height="${height}" fill="${CLEAN_PANEL.body}" />
    ${detailBar('clean-detail-top', DETAIL_TOP_BAR, DETAIL_TOP_CONTACT, firstType)}
    ${detailBar('clean-detail-bottom', DETAIL_BOTTOM_BAR, DETAIL_BOTTOM_CONTACT, secondType)}
    <rect x="${edge / 2}" y="${edge / 2}" width="${width - edge}" height="${height - edge}" fill="none"
      stroke="${CLEAN_PANEL.edge}" stroke-width="${edge}" /></svg>`;
}

// ---------- the sections, shared by the Unified and Clean Draft tabs ----------
const draftTag = (text) => `<span class="lib-dim lib-mono">${esc(text)}</span>`;
// a Unified ramp's tone by name (light, base, dark), as the button and toggle drafts read them
const unifiedTone = (ramp, part) => valueOf(ramp.colours.find((colour) => colour[0] === part));
// the edge colours the board shows: the default, and teal.base (Jess 2026-11-19) as one example of passing another in
const CLEAN_EDGES = [
  { id: 'rest', title: 'At rest: the default edge', token: 'color.grey.slate', edge: CLEAN_PANEL.edge },
  { id: 'edgeTeal', title: 'An edge passed in: teal.base', token: 'color.teal.base', edge: unifiedTone(UNIFIED_TEAL, 'base') },
];
function cleanPanelSection() {
  const panelStyle = (edge) =>
    [
      ['--clean-body', CLEAN_PANEL.body],
      ['--clean-edge', edge],
      ['--clean-edge-width', CLEAN_PANEL.edgeWidth + 'px'],
      ['width', CLEAN_PANEL.width + 'px'],
      ['height', CLEAN_PANEL.height + 'px'],
    ]
      .map(([name, value]) => `${name}:${value}`)
      .join(';');
  const tiles = CLEAN_EDGES.map(
    (look) => `<figure class="lib-state">
        <div class="lib-stage" data-state="panel.clean:${look.id}" style="background:${CLEAN_STAGE}">
          <div class="lib-clean" style="${panelStyle(look.edge)}"></div></div>
        <figcaption>${nameButton('panel.clean.' + look.id)}<br>${esc(look.title)}</figcaption></figure>`
  ).join('');
  return `<section class="lib-story" data-draft="panel.clean">
    <h3>${nameButton('panel.clean')} ${draftTag('clean: the interface, what the team shares')}</h3>
    <div class="lib-states">${tiles}</div>
    <dl class="lib-facts">
      ${cleanColour('Behind', 'color.grey.ink', CLEAN_STAGE)}
      ${cleanColour('Body', 'color.grey.panel', CLEAN_PANEL.body)}
      ${CLEAN_EDGES.map((look) => cleanColour(look.id === 'rest' ? 'Edge' : 'Edge, passed in', look.token, look.edge)).join('')}
      <dd class="lib-dim">grey.slate is the default. The edge takes any colour the screen passes in (a grey, a Unified accent, a
        type), as a prop; the body stays ${esc('grey.panel')}.</dd>
      <dt>Shape</dt><dd>A ${CLEAN_PANEL.edgeWidth} px edge; square corners; no cut and no bar (both stay the
        button's)</dd>
      <dt>Size</dt><dd>${CLEAN_PANEL.width} x ${CLEAN_PANEL.height} px here; any size, the screen sets it</dd>
    </dl></section>`;
}
function detailSection() {
  const [top, bottom] = DETAIL_SAMPLE_TYPES;
  return `<section class="lib-story" data-draft="pause.pokemonDetail.background">
    <h3>${nameButton('pause.pokemonDetail.background')} ${draftTag('clean: the window that holds one Pokemon')}</h3>
    <div class="lib-states">
      <figure class="lib-state">
        <div class="lib-stage" data-state="pause.pokemonDetail.background:rest" style="background:${CLEAN_STAGE}">
          ${detailBackground(DETAIL_SAMPLE_TYPES)}</div>
        <figcaption>${nameButton('pause.pokemonDetail.background.rest')}<br>A dual type (Water, Flying): the first
          type on top, the second on the bottom; a single type uses its colour for both</figcaption></figure>
    </div>
    <dl class="lib-facts">
      ${cleanColour('Body', 'color.grey.panel', CLEAN_PANEL.body)}
      ${cleanColour('Edge', 'color.grey.slate', CLEAN_PANEL.edge)}
      ${cleanColour('Top bar', 'color.type.' + top + '.base', typeBase(top))}
      ${cleanColour('Top bar border', 'color.type.' + top + '.dark', typeDark(top))}
      ${cleanColour('Bottom bar', 'color.type.' + bottom + '.base', typeBase(bottom))}
      ${cleanColour('Bottom bar border', 'color.type.' + bottom + '.dark', typeDark(bottom))}
      <dt>Shape</dt><dd>Today's: ${DETAIL_PANEL.width} x ${DETAIL_PANEL.height}; top bar 64 px with the level box
        dropping to 104 px; bottom bar 48 px with a 32 px raised tab on the left. Each bar has a ${DETAIL_BAR_BORDER} px
        border in its type's dark on the side that meets the body, the diagonal step included; nothing on its other
        sides.</dd>
    </dl></section>`;
}
// ---------- panel.pixel: a board copy (Jess 2026-11-19) ----------
// The B2 roster box, written out here so its shape and colours can be changed on the board without touching a game
// file. Copied from js/ui/lib/primitives/panel/panel.js (PIXEL_PANEL_LEFT_END, PIXEL_PANEL_STRAIGHT_LEFT,
// pixelPanelRows) and the colours from js/ui/lib/tokens/tokens.js. 2 px per art pixel at every size; any even size.
const PIXEL_PANEL_COPY = { artPixel: 2, width: 240, height: 120 };
// The left end of the top 8 rows and of every straight row below them, one letter per art pixel from the box's left
// edge; the rest of each row is the pair's second letter. The right end is the mirror, the bottom 8 rows the top's.
//   o outline, D / B / L the rim's dark, base and light, G the body, space nothing.
const PIXEL_PANEL_TOP = [
  ['      oooo', ' '], // the corner bump rises above the top edge
  ['     oDBBDo', ' '],
  ['    oDBooBD', 'o'],
  ['   oDBoLBo', 'B'],
  ['  oDBoLLL', 'o'],
  [' oDBoLLLo', 'G'],
  ['oDBoLLLo', 'G'],
  ['oBoLLL', 'G'],
];
const PIXEL_PANEL_SIDE = ['oBoLLo', 'G'];
// The Unified greys (Jess 2026-11-19). Today's values fold onto them: outline #101010 and body #181818 are the same,
// the rim's dark #848484 folds onto mid #828282 (can't see it), paper and white are the same.
const PIXEL_PANEL_TOKENS = { o: 'ink', D: 'mid', B: 'paper', L: 'white', G: 'panel' };
const PIXEL_PANEL_COLOURS = Object.fromEntries(
  Object.entries(PIXEL_PANEL_TOKENS).map(([letter, grey]) => [letter, greyTone(grey)])
);
/** The panel's letter rows for a size in art pixels. */
function pixelPanelCopyRows(artWidth, artRows) {
  const rows = [];
  for (let row = 0; row < artRows; row++) {
    const fromEdge = Math.min(row, artRows - 1 - row),
      [left, fill] = PIXEL_PANEL_TOP[fromEdge] || PIXEL_PANEL_SIDE;
    rows.push(left + fill.repeat(artWidth - 2 * left.length) + left.split('').reverse().join(''));
  }
  return rows;
}
/** The panel as an SVG string: one rect per run of a colour, in art pixels scaled to 2 px. */
function pixelPanelCopySvg({ artPixel, width, height }, colours) {
  const artWidth = width / artPixel,
    artRows = height / artPixel,
    rects = [];
  pixelPanelCopyRows(artWidth, artRows).forEach((line, row) => {
    let start = 0;
    for (let x = 1; x <= line.length; x++) {
      if (x < line.length && line[x] === line[start]) continue;
      if (line[start] !== ' ')
        rects.push(`<rect x="${start}" y="${row}" width="${x - start}" height="1" fill="${colours[line[start]]}" />`);
      start = x;
    }
  });
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${artWidth} ${artRows}" shape-rendering="crispEdges"
    style="display:block">${rects.join('')}</svg>`;
}
function pixelSection() {
  const colourFact = (part, letter) =>
    cleanColour(part, 'color.grey.' + PIXEL_PANEL_TOKENS[letter], PIXEL_PANEL_COLOURS[letter]);
  return `<section class="lib-story" data-draft="panel.pixel">
    <h3>${nameButton('panel.pixel')} ${draftTag('pixel: one Pokemon and what it owns (a board copy)')}</h3>
    <div class="lib-states">
      <figure class="lib-state">
        <div class="lib-stage" data-state="unified.panel.pixel:rest" style="background:${CLEAN_STAGE}">
          ${pixelPanelCopySvg(PIXEL_PANEL_COPY, PIXEL_PANEL_COLOURS)}</div>
        <figcaption>${nameButton('panel.pixel.rest')}<br>At rest (the white rim)</figcaption></figure>
    </div>
    <dl class="lib-facts">
      ${colourFact('Outline', 'o')}
      ${colourFact('Rim light', 'L')}
      ${colourFact('Rim base', 'B')}
      ${colourFact('Rim dark (corner bumps)', 'D')}
      ${colourFact('Body', 'G')}
      <dd class="lib-dim">Unified greys; from today only the rim's dark moves (#848484 to mid #828282, can't see it)</dd>
      <dt>Art pixel</dt><dd>${PIXEL_PANEL_COPY.artPixel} px at every size; any even width and height</dd>
      <dt>Board copy</dt><dd>Every value above lives in tools/library/clean-draft.js; changing one changes only the
        board</dd>
      <dt>Used at</dt><dd>${['pause.pokemonDetail.statsBox', 'pause.pokemonDetail.movesBox',
        'pause.pokemonDetail.heldItem', 'catch.window.pokemon'].map(nameButton).join('')}</dd>
    </dl></section>`;
}

// ---------- panel.slanted (Jess 2026-11-19): kept as it is, for the move slot only ----------
// Decision 2026-11-19-157-panel-slanted-is-the-move-slot-only: the original panel.slanted.rest stays, and its only place
// is run.hud.moveSlot. A board copy (Jess 2026-11-19): its shape, colours and grid are written out here, not read from
// the game (G.Lib.Panel, G.Tokens, the slot grid pattern), so they can be changed on the board (the Unified fold)
// without touching a game file. Copied from today's code: the shape from js/ui/lib/primitives/button/button.js
// moveSlotRow, the colours from js/ui/lib/tokens/tokens.js, the bond and empty rims from js/ui/hud-player-panel.js, the
// grid from js/ui/lib/primitives/pixels/pixels.js hud-slot-grid. The run HUD's rule: a single move takes its type's
// ramp, a bond (2 to 4 moves in one slot) the bond pink, an empty slot the B2 disabled rim on a flat body; every
// filled slot sits on the grid. Rest (the white rim) is the board's default.
const SLANTED_SLOT = { artWidth: 105, artRows: 22, artPixel: 2 }; // 210 x 44 px
// The Unified colours (Jess 2026-11-19). The grid's two greys (#292929, #393939) both fold onto raised, which would
// erase it, so the grid steps down one: the squares take panel and the lines raised (a little darker than today, the
// same pattern).
const SLANTED_COLOURS = {
  outline: greyTone('ink'), // was #101010, the same
  body: greyTone('panel'), // an empty slot's flat body; was #181818, the same
  gridSquare: greyTone('panel'), // was #292929
  gridLine: greyTone('raised'), // was #393939
};
const SLANTED_GRID = { tile: 4, square: 3 }; // art pixels: a 3 x 3 square in each 4 x 4 tile, 1 art pixel lines
const pinkRamp = (part) => unifiedTone(UNIFIED_PINK, part);
const SLANTED_RIMS = {
  rest: { light: greyTone('white'), base: greyTone('paper'), dark: greyTone('mid') }, // dark was #848484
  fire: { light: '#EF7374', base: '#E62829', dark: '#961A1B' }, // color.type.fire: canon, Unified keeps it
  bond: { light: pinkRamp('light'), base: pinkRamp('base'), dark: pinkRamp('dark') }, // pink; light was #ffd3f1
  empty: { light: greyTone('raised'), base: greyTone('panel'), dark: greyTone('panel') }, // was #303030, #212121
};
// what each rim tone is called in Unified, for the facts list
const SLANTED_RIM_NAMES = {
  rest: ['grey.white', 'grey.paper', 'grey.mid'],
  fire: ['type.fire.light', 'type.fire.base', 'type.fire.dark'],
  bond: ['pink.light', 'pink.base', 'pink.dark'],
  empty: ['grey.raised', 'grey.panel', 'grey.panel'],
};
const SLANTED_STATES = [
  { id: 'rest', title: 'At rest: the white rim (the board default)', rim: 'rest', grid: true },
  { id: 'type', title: 'One move: its type\u2019s ramp (Fire here)', rim: 'fire', grid: true },
  { id: 'bond', title: 'A bond (2 to 4 moves in one slot): the bond pink', rim: 'bond', grid: true },
  { id: 'empty', title: 'Empty: the B2 disabled rim, a flat body (no grid)', rim: 'empty', grid: false },
];
// the angled end: how far in a row's left edge sits (a short 45 degree run to a flat point, then one across per two)
const slantedLeftEdge = (row) => (row <= 5 ? 6 - row : row <= 8 ? 0 : Math.ceil((row - 8) / 2));
/** One art row as [x, width, fill]: outline, the rim's light and base at both ends, the dark under the top and over the
 *  bottom, the body between. */
function slantedRow(row, { artWidth, artRows }, rim, bodyFill) {
  const left = slantedLeftEdge(row),
    right = artWidth - 1 - slantedLeftEdge(artRows - 1 - row),
    outline = SLANTED_COLOURS.outline;
  if (row === 0 || row === artRows - 1) return [[left, right - left + 1, outline]];
  const inner = row === 1 || row === artRows - 2 ? rim.dark : bodyFill;
  return [
    [left + 4, right - 3 - (left + 4), inner],
    [left, 1, outline],
    [left + 1, 1, rim.light],
    [left + 2, 1, rim.base],
    [left + 3, 1, outline],
    [right - 3, 1, outline],
    [right - 2, 1, rim.base],
    [right - 1, 1, rim.light],
    [right, 1, outline],
  ];
}
/** The slot as an SVG string, in art pixels scaled to 2 px; the grid is its own pattern, local to this SVG. */
function slantedSvg(state) {
  const { artWidth, artRows, artPixel } = SLANTED_SLOT,
    rim = typeof state.rim === 'string' ? SLANTED_RIMS[state.rim] : state.rim, // a name here, or a ramp (composites)
    gridId = 'board-slot-grid-' + state.id,
    body = state.grid ? `url(#${gridId})` : SLANTED_COLOURS.body,
    rects = [];
  for (let row = 0; row < artRows; row++)
    for (const [x, width, fill] of slantedRow(row, SLANTED_SLOT, rim, body))
      if (width > 0) rects.push(`<rect x="${x}" y="${row}" width="${width}" height="1" fill="${fill}" />`);
  return `<svg width="${artWidth * artPixel}" height="${artRows * artPixel}" viewBox="0 0 ${artWidth} ${artRows}"
    shape-rendering="crispEdges" style="display:block">
    <defs><pattern id="${gridId}" width="${SLANTED_GRID.tile}" height="${SLANTED_GRID.tile}" patternUnits="userSpaceOnUse">
      <rect width="${SLANTED_GRID.tile}" height="${SLANTED_GRID.tile}" fill="${SLANTED_COLOURS.gridLine}" />
      <rect width="${SLANTED_GRID.square}" height="${SLANTED_GRID.square}" fill="${SLANTED_COLOURS.gridSquare}" />
    </pattern></defs>${rects.join('')}</svg>`;
}
const rampFacts = (label, rim, note) =>
  `<dt>${esc(label)}</dt><dd>${['light', 'base', 'dark']
    .map((part, index) => nameButton('color.' + SLANTED_RIM_NAMES[rim][index]) +
      `<span>${esc(part)} ${esc(SLANTED_RIMS[rim][part])}</span>`)
    .join('')}${note ? `<span class="lib-dim">${esc(note)}</span>` : ''}</dd>`;
function slantedSection() {
  const tiles = SLANTED_STATES.map(
    (state) => `<figure class="lib-state">
      <div class="lib-stage" data-state="unified.panel.slanted:${state.id}" style="background:${CLEAN_STAGE}">
        ${slantedSvg(state)}</div>
      <figcaption>${nameButton('panel.slanted.' + state.id)}<br>${esc(state.title)}</figcaption></figure>`
  ).join('');
  const tilePx = SLANTED_GRID.tile * SLANTED_SLOT.artPixel,
    squarePx = SLANTED_GRID.square * SLANTED_SLOT.artPixel;
  return `<section class="lib-story" data-draft="panel.slanted">
    <h3>${nameButton('panel.slanted')} ${draftTag('pixel: the move slot, and nothing else (a board copy)')}</h3>
    <div class="lib-states">${tiles}</div>
    <h4 class="lib-dim">The rim: what the run HUD passes</h4>
    <dl class="lib-facts">
      <dt>Picked by</dt><dd>The moves in the slot: none is empty; one takes that move's type; two to four (a bond)
        take the bond pink. A bond's wells still show each move's own type colour.</dd>
      <dt>Ramp</dt><dd>Three tones on the ends: light and base inside the outline, dark on the row under the top and
        over the bottom</dd>
      ${rampFacts('Rest', 'rest', 'dark was #848484')}
      ${rampFacts('Type (any of 18)', 'fire', 'canon, unchanged; Fire shown')}
      ${rampFacts('Bond', 'bond', 'the Unified pink; light was #ffd3f1, a little deeper now')}
      ${rampFacts('Empty', 'empty', 'was #303030, #212121: its base now matches the flat body, so only the light shows')}
    </dl>
    <h4 class="lib-dim">The body: the slot grid</h4>
    <dl class="lib-facts">
      <dt>Tile</dt><dd>${SLANTED_GRID.tile} x ${SLANTED_GRID.tile} art pixels (${tilePx} x ${tilePx} px): a
        ${SLANTED_GRID.square} x ${SLANTED_GRID.square} square in the top-left, the line colour in what is left
        (${squarePx} px squares, ${tilePx - squarePx} px lines); from the B2 type checker (Jess 2026-11-10)</dd>
      ${cleanColour('Squares', 'color.grey.panel', SLANTED_COLOURS.gridSquare)}
      ${cleanColour('Lines', 'color.grey.raised', SLANTED_COLOURS.gridLine)}
      <dd class="lib-dim">Was #292929 and #393939; both fold onto raised, so the grid steps down one grey to keep it</dd>
      <dt>When</dt><dd>Every filled slot (one move or a bond). An empty slot takes the flat
        ${nameButton('color.grey.panel')} instead.</dd>
      <dt>On top</dt><dd>The move wells (one per move, up to 4), drawn by the run HUD, not the panel</dd>
    </dl>
    <dl class="lib-facts">
      <dt>Size</dt><dd>${SLANTED_SLOT.artWidth * SLANTED_SLOT.artPixel} x ${SLANTED_SLOT.artRows * SLANTED_SLOT.artPixel}
        px (${SLANTED_SLOT.artWidth} x ${SLANTED_SLOT.artRows} art pixels at ${SLANTED_SLOT.artPixel})</dd>
      <dt>Board copy</dt><dd>Every value above lives at the top of tools/library/clean-draft.js; changing one changes
        only the board</dd>
      <dt>Used at</dt><dd>${nameButton('run.hud.moveSlot')}<span>only; the pocket prompt header moves to clean</span></dd>
    </dl></section>`;
}

// One tab (Jess 2026-11-19): Clean Draft and Current are gone; Unified is the panel set going forward. The game's
// panels still ship as they are until #126 applies these.
const PANEL_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note:
      'The panel set: clean for the interface and what the team shares, pixel for one Pokemon and what it owns ' +
      '(decision 2026-11-18-155-pixel-panels-for-one-pokemon-clean-for-the-rest).',
    draw: () => cleanPanelSection() + detailSection() + pixelSection() + slantedSection(),
  },
];
const panelsPage = (tab) => tabbedPage('Panels', PANEL_TABS, tab);
