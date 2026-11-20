// tools/library/tooltip-draft.js: the Tooltip page (Unified): the tooltip primitive, a panel.clean with a name line, its
// text and the pin and close icons (Jess 2026-11-20). Three states: hover, pinning (the hold-to-pin bar filling) and pinned
// (the close X). The pin and close behaviour is the nested tooltip idea (tools/library/idea-holding/tooltip-poe-style.html,
// decision 2026-11-16-one-universal-tooltip-layer) and is not built in the game; the board shows the pictures only. A plain
// script sharing the board's globals (clean-draft.js's panel.clean, the Unified colours), so it loads after them. A board
// copy: nothing here reads the game.
'use strict';
// ---------- places and colours ----------
const TOOLTIP = {
  padding: { top: 8, right: 12, bottom: 10, left: 12 }, // today's item tooltip (css/hud-overlay.css .hud-tip.is-item)
  textWidth: 300, // the effect line, today's
  lineGap: 6, // name to text, today's
  nameGap: 16, // the name to the icon, at least
  // every tooltip is the game talking, so Michroma at 20, whatever it is about (Jess 2026-11-20, decision
  // 2026-11-20-155-every-tooltip-is-michroma; move and stat tooltips were Silver in the 2026-11-18 scheme)
  // the name at 20, the white text at 12, lines 16 px apart (Jess 2026-11-20; 10 was tried first)
  font: { family: "'HudModule'", size: 20, textSize: 12, textLine: 16, token: 'font.michroma' },
  pinBar: { height: 2, sample: 0.6 }, // the hold-to-pin bar along the top inside the edge; pinning shows it 60% full
  iconPixel: 2, // the icons' art pixel: 12 x 12 art, 24 x 24 px
};
const TOOLTIP_COLOURS = {
  body: CLEAN_PANEL.body, // grey.panel, panel.clean's
  edge: unifiedTone(UNIFIED_YELLOW, 'base'), // the yellow frame (Jess 2026-11-20, keeping 2026-11-11's)
  name: unifiedTone(UNIFIED_YELLOW, 'base'), // the name in yellow
  text: greyTone('white'),
  outline: greyTone('ink'), // the icons' outline
  pinRest: greyTone('mid'), // the pin at hover: there, but quiet
  pinActive: unifiedTone(UNIFIED_YELLOW, 'base'), // the pin while pinning
  close: greyTone('white'), // the X once pinned
  needle: greyTone('mid'),
};
const TOOLTIP_SAMPLE = { name: 'Leftovers', text: 'Recover 1.5% of your max HP per second.' }; // js/data/items.js
const TOOLTIP_MOVE_SAMPLE = { name: 'Thunder Shock', text: 'Placeholder move text: what it does, then the Cards: line, cd 1.2 s to 0.92 s.' };

// ---------- the icons: 12 x 12 character maps, the G.Icons style (js/ui/icons.js); k outline, w the icon's colour ----------
const TOOLTIP_ICONS = {
  // a pushpin, head up, needle down
  pin: [
    '...kkkkkk...',
    '...kwwwwk...',
    '....kwwk....',
    '....kwwk....',
    '....kwwk....',
    '...kwwwwk...',
    '..kwwwwwwk..',
    '.kkkkkkkkkk.',
    '....kssk....',
    '....kssk....',
    '.....kk.....',
    '............',
  ],
  // close: an X, 2 art px strokes in an outline
  close: [
    '.kk......kk.',
    'kwwk....kwwk',
    'kwwwk..kwwwk',
    '.kwwwkkwwwk.',
    '..kwwwwwwk..',
    '...kwwwwk...',
    '...kwwwwk...',
    '..kwwwwwwk..',
    '.kwwwkkwwwk.',
    'kwwwk..kwwwk',
    'kwwk....kwwk',
    '.kk......kk.',
  ],
};
/** One icon as an SVG string: the outline in ink, w in colour, s the needle's grey. */
function tooltipIconSvg(name, colour) {
  const rows = TOOLTIP_ICONS[name],
    px = TOOLTIP.iconPixel,
    fills = { k: TOOLTIP_COLOURS.outline, w: colour, s: TOOLTIP_COLOURS.needle },
    rects = [];
  rows.forEach((line, row) => {
    let start = 0;
    for (let x = 1; x <= line.length; x++) {
      if (x < line.length && line[x] === line[start]) continue;
      if (line[start] !== '.')
        rects.push(`<rect x="${start}" y="${row}" width="${x - start}" height="1" fill="${fills[line[start]]}" />`);
      start = x;
    }
  });
  return `<svg class="lib-tip-icon" width="${rows[0].length * px}" height="${rows.length * px}"
    viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges">${rects.join('')}</svg>`;
}

// ---------- the states ----------
const TOOLTIP_STATES = [
  {
    id: 'hover',
    title: 'Hover: the pin is there but quiet (grey.mid)',
    icon: ['pin', TOOLTIP_COLOURS.pinRest],
  },
  {
    id: 'pinning',
    title: 'Pinning: held on the anchor, the bar fills along the top; full pins it',
    icon: ['pin', TOOLTIP_COLOURS.pinActive],
    bar: TOOLTIP.pinBar.sample,
  },
  {
    id: 'pinned',
    title: 'Pinned: it stays when the anchor goes; the X closes it',
    icon: ['close', TOOLTIP_COLOURS.close],
  },
];
/** One tooltip: panel.clean with the yellow edge, the name and icon line, the text, the pin bar while pinning. */
function tooltipHtml(state, sample = TOOLTIP_SAMPLE) {
  const { padding, textWidth, lineGap, nameGap, pinBar } = TOOLTIP,
    font = TOOLTIP.font,
    style = [
      ['--clean-body', TOOLTIP_COLOURS.body],
      ['--clean-edge', TOOLTIP_COLOURS.edge],
      ['--clean-edge-width', CLEAN_PANEL.edgeWidth + 'px'],
      ['--tip-font', font.family],
      ['--tip-size', font.size + 'px'],
      ['padding', `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`],
    ]
      .map(([name, value]) => `${name}:${value}`)
      .join(';'),
    bar =
      state.bar !== undefined
        ? `<div class="lib-tip-bar" style="top:${CLEAN_PANEL.edgeWidth}px;left:${CLEAN_PANEL.edgeWidth}px;height:${pinBar.height}px;
            width:calc((100% - ${2 * CLEAN_PANEL.edgeWidth}px) * ${state.bar});background:${TOOLTIP_COLOURS.pinActive}"></div>`
        : '';
  return `<div class="lib-clean lib-tip" style="${style}">${bar}
    <div class="lib-tip-head" style="gap:${nameGap}px">
      <span class="lib-tip-name" style="color:${TOOLTIP_COLOURS.name}">${esc(sample.name)}</span>
      ${tooltipIconSvg(...state.icon)}</div>
    <div class="lib-tip-line" style="margin-top:${lineGap}px;width:${textWidth}px;color:${TOOLTIP_COLOURS.text};
      font-size:${font.textSize}px;line-height:${font.textLine}px">${esc(sample.text)}</div>
  </div>`;
}
function tooltipSection() {
  const tiles = TOOLTIP_STATES.map(
    (state) => `<figure class="lib-state">
      <div class="lib-stage" data-state="tooltip:${state.id}" style="background:${CLEAN_STAGE}">${tooltipHtml(state)}</div>
      <figcaption>${nameButton('tooltip.' + state.id)}<br>${esc(state.title)}</figcaption></figure>`
  ).join('');
  const moveTile = `<figure class="lib-state">
      <div class="lib-stage" data-state="tooltip:hoverPokemon" style="background:${CLEAN_STAGE}">${tooltipHtml(
        TOOLTIP_STATES[0],
        TOOLTIP_MOVE_SAMPLE
      )}</div>
      <figcaption>${nameButton('tooltip.hover')}<br>On a move: still Michroma (placeholder text)</figcaption></figure>`;
  const icons = Object.keys(TOOLTIP_ICONS)
    .map(
      (name) => `<figure class="lib-state">
      <div class="lib-stage lib-tip-icons" data-state="tooltip.icon:${name}" style="background:${CLEAN_STAGE}">
        ${tooltipIconSvg(name, name === 'pin' ? TOOLTIP_COLOURS.pinActive : TOOLTIP_COLOURS.close)}
        <div style="transform:scale(3);transform-origin:0 0;width:72px;height:72px">${tooltipIconSvg(
          name,
          name === 'pin' ? TOOLTIP_COLOURS.pinActive : TOOLTIP_COLOURS.close
        )}</div></div>
      <figcaption>${nameButton('icon.' + name)}<br>12 x 12 art at ${TOOLTIP.iconPixel} px, and zoomed 3x</figcaption></figure>`
    )
    .join('');
  return `<section class="lib-story" data-draft="tooltip">
    <h3>${nameButton('tooltip')} ${draftTag('clean: a hover tooltip on panel.clean (a board copy)')}</h3>
    <div class="lib-states">${tiles}</div>
    <h4 class="lib-dim">One font for every tooltip: Michroma, here on a move (the longer text and numbers to check)</h4>
    <div class="lib-states">${moveTile}</div>
    <h4 class="lib-dim">The icons, new pixel icons in the G.Icons style</h4>
    <div class="lib-states">${icons}</div>
    <dl class="lib-facts">
      <dt>Pieces</dt><dd>${nameButton('panel.clean')}<span>with the edge passed in yellow</span></dd>
      ${cleanColour('Body', 'color.grey.panel', TOOLTIP_COLOURS.body)}
      ${cleanColour('Frame', 'color.yellow.base', TOOLTIP_COLOURS.edge)}
      ${cleanColour('Name', 'color.yellow.base', TOOLTIP_COLOURS.name)}
      <dd class="lib-dim">The yellow frame and name (Jess 2026-11-20, keeping 2026-11-11). Today the frame is #f3b200 at
        2 px with a 2 px ink ring outside, the name #ffd23f; here the frame is panel.clean's ${CLEAN_PANEL.edgeWidth} px edge
        and both are the Unified yellow</dd>
      ${cleanColour('Text', 'color.grey.white', TOOLTIP_COLOURS.text)}
      ${cleanColour('Pin at hover', 'color.grey.mid', TOOLTIP_COLOURS.pinRest)}
      ${cleanColour('Pin while pinning, the bar', 'color.yellow.base', TOOLTIP_COLOURS.pinActive)}
      ${cleanColour('Close X', 'color.grey.white', TOOLTIP_COLOURS.close)}
      <dt>Font</dt><dd>${nameButton(TOOLTIP.font.token)}<span>every tooltip: the name at ${TOOLTIP.font.size} px, the text at ${TOOLTIP.font.textSize} px (lines ${TOOLTIP.font.textLine} px apart)</span></dd>
      <dd class="lib-dim">A tooltip is always the game talking, whatever it is about (Jess 2026-11-20); move and stat tooltips
        were Silver in the 2026-11-18 scheme</dd>
      <dt>Places</dt><dd>Today's item tooltip: padding ${TOOLTIP.padding.top} px top, ${TOOLTIP.padding.left} px sides, the
        text ${TOOLTIP.textWidth} px wide, ${TOOLTIP.lineGap} px under the name; the icon at the name line's right end,
        ${TOOLTIP.nameGap} px clear of the name at least</dd>
      <dt>Pin bar</dt><dd>${TOOLTIP.pinBar.height} px along the top inside the edge, filling left to right while the anchor
        is held (the idea file's 1.2 s); shown ${TOOLTIP.pinBar.sample * 100}% full</dd>
      <dt>Icons</dt><dd>Open (Jess 2026-11-20: still working on them); these are placeholders. 12 x 12 character maps at
        ${TOOLTIP.iconPixel} px (24 px), the G.Icons style; not in js/ui/icons.js (game code, on approval with the pin feature)</dd>
      <dt>Decided</dt><dd>2026-11-20-155-tooltip-is-panel-clean-yellow-frame-three-states</dd>
      <dt>Layer</dt><dd>${nameButton('layer.tooltip')}<span>the one tooltip layer, on top of everything (2026-11-16)</span></dd>
      <dt>Not built</dt><dd>Pinning, closing, dragging and nested tooltips are the nested tooltip idea, not in the game; the
        board shows the pictures only</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/tooltip-draft.js; changing one changes only the board</dd>
    </dl></section>`;
}
const TOOLTIP_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note: 'The tooltip going forward: panel.clean with the yellow frame, three states (hover, pinning, pinned) and two new icons.',
    draw: tooltipSection,
  },
];
const tooltipPage = (tab) => tabbedPage('Tooltip', TOOLTIP_TABS, tab);
