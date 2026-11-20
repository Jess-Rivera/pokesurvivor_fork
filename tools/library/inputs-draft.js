// tools/library/inputs-draft.js: the Inputs page (Unified): field.text (a search bar), field.dropdown (a filter box and
// its open list) and scroll.bar (the thin bar beside a scrolling box), drawn in the board's Unified pieces for the
// Main Menu Shop (Jess 2026-11-20). Today's are the HUD kit's SearchBar, the menu window kit's Dropdown and the kit's
// ScrollBox (css/hud-overlay.css .hud-search, .hud-scroll-*; css/bw-shop.css .shop-dropdown-*). A plain script sharing
// the board's globals (clean-draft.js's panel.clean, cursor-draft.js's blink, hud-area-draft.js's charMapSvg), so it
// loads after them. A board copy: nothing here reads the game.
'use strict';
// ---------- places and colours ----------
const INPUT = {
  height: 40, // today's search bar
  padX: 12,
  font: "'HudModule'", // font.michroma: menus are the game talking
  size: 14,
  caretWidth: 2, // the typing caret, blinking as cursor.bar does
  chevronPixel: 2, // the dropdown's chevron: 7 x 4 art at 2 px
  list: { padding: 4, groupSize: 12, groupHeight: 24, rowHeight: 32, check: 16, checkGap: 10 },
  scroll: { track: 4, thumb: 8, room: 12 }, // a 4 px track, an 8 px thumb centred on it, 12 px kept for it beside a box
};
const INPUT_COLOURS = {
  body: CLEAN_PANEL.body, // grey.panel
  edge: CLEAN_PANEL.edge, // grey.slate
  cursor: CURSOR.colour, // yellow.base: the keys are on it (today the focus green #38d030)
  text: greyTone('white'),
  placeholder: greyTone('mid'), // today white at 45%
  group: unifiedTone(UNIFIED_TEAL, 'base'), // a list's group header: the secondary text (today #8cfff7)
  checkOn: unifiedTone(UNIFIED_TEAL, 'base'), // a ticked choice (today the focus green)
  track: greyTone('raised'),
  thumb: unifiedTone(UNIFIED_TEAL, 'base'), // today the mockups' teal bar with a rim
  thumbHeld: unifiedTone(UNIFIED_TEAL, 'light'),
};
const CHEVRON_ROWS = ['wwwwwww', '.wwwww.', '..www..', '...w...'];

// ---------- field.text ----------
const fieldStyle = (width, edge) =>
  [
    ['--clean-body', INPUT_COLOURS.body],
    ['--clean-edge', edge],
    ['--clean-edge-width', CLEAN_PANEL.edgeWidth + 'px'],
    ['--field-font', INPUT.font],
    ['--field-size', INPUT.size + 'px'],
    ['--field-pad', INPUT.padX + 'px'],
    ['--cursor-blink', CURSOR.blinkMs * 2 + 'ms'],
    ['width', width + 'px'],
    ['height', INPUT.height + 'px'],
  ]
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
/** A text field. state: rest, cursor (the keys are on it, Enter starts typing) or typing (the caret blinks). */
function fieldText({ width, value = '', placeholder = '', state = 'rest', style = '' }) {
  const edge = state === 'rest' ? INPUT_COLOURS.edge : INPUT_COLOURS.cursor,
    text = value
      ? `<span style="color:${INPUT_COLOURS.text}">${esc(value)}</span>`
      : state === 'typing'
        ? ''
        : `<span style="color:${INPUT_COLOURS.placeholder}">${esc(placeholder)}</span>`,
    caret =
      state === 'typing'
        ? `<span class="lib-field-caret" style="width:${INPUT.caretWidth}px;background:${INPUT_COLOURS.text}"></span>`
        : '';
  return `<div class="lib-clean lib-field" style="${fieldStyle(width, edge)};${style}">${text}${caret}</div>`;
}

// ---------- field.dropdown ----------
/** The closed box: the label (and the count chosen) and the chevron at its right end. */
function dropdownBox({ width, label, count = 0, state = 'rest', style = '' }) {
  const edge = state === 'rest' ? INPUT_COLOURS.edge : INPUT_COLOURS.cursor,
    shown = count ? `${label} (${count})` : label;
  return `<div class="lib-clean lib-field" style="${fieldStyle(width, edge)};${style}">
    <span class="lib-field-label" style="color:${INPUT_COLOURS.text}">${esc(shown)}</span>
    <span class="lib-field-chevron">${charMapSvg(CHEVRON_ROWS, { w: INPUT_COLOURS.text }, INPUT.chevronPixel)}</span></div>`;
}
/** A tick box: a 16 px square, teal when ticked. */
const checkBox = (on) =>
  `<span class="lib-clean lib-check" style="--clean-body:${on ? INPUT_COLOURS.checkOn : INPUT_COLOURS.body};
    --clean-edge:${on ? INPUT_COLOURS.checkOn : INPUT_COLOURS.edge};--clean-edge-width:${CLEAN_PANEL.edgeWidth}px;
    width:${INPUT.list.check}px;height:${INPUT.list.check}px"></span>`;
/** The open list: panel.clean, groups with a teal header, a row per choice; at is the choice the keys are on. */
function dropdownList({ width, height, groups, chosen = [], at = null, scrollAt = 0, style = '' }) {
  const { padding, groupHeight, rowHeight, checkGap } = INPUT.list,
    rows = groups
      .map(
        (group) => `<div class="lib-list-group" style="height:${groupHeight}px;font-size:${INPUT.list.groupSize}px;
          color:${INPUT_COLOURS.group}">${esc(group.name)}</div>${group.choices
          .map(
            (choice) => `<div class="lib-clean lib-list-row" style="--clean-body:${INPUT_COLOURS.body};
              --clean-edge:${choice.key === at ? INPUT_COLOURS.cursor : INPUT_COLOURS.body};
              --clean-edge-width:${CLEAN_PANEL.edgeWidth}px;height:${rowHeight}px;gap:${checkGap}px">
              ${checkBox(chosen.includes(choice.key))}<span style="color:${INPUT_COLOURS.text}">${esc(choice.label)}</span></div>`
          )
          .join('')}`
      )
      .join(''),
    contentHeight = groups.reduce((sum, group) => sum + groupHeight + group.choices.length * rowHeight, 0),
    inner = height - 2 * (CLEAN_PANEL.edgeWidth + padding),
    bar =
      contentHeight > inner
        ? scrollBar({ height: inner, fraction: inner / contentHeight, at: scrollAt, style: `right:${padding}px;top:${padding}px` })
        : '';
  return `<div class="lib-clean lib-list" style="--clean-body:${INPUT_COLOURS.body};--clean-edge:${INPUT_COLOURS.edge};
      --clean-edge-width:${CLEAN_PANEL.edgeWidth}px;--field-font:${INPUT.font};--field-size:${INPUT.size}px;
      width:${width}px;height:${height}px;padding:${padding}px;${style}">
    <div class="lib-list-rows" style="right:${padding + (bar ? INPUT.scroll.room : 0)}px;left:${padding}px;top:${padding}px;
      bottom:${padding}px">${rows}</div>${bar}</div>`;
}

// ---------- scroll.bar ----------
/** The thin bar beside a scrolling box: a 4 px track, an 8 px thumb fraction of it long, at (0 top to 1 bottom). */
function scrollBar({ height, fraction, at = 0, held = false, style = '' }) {
  const { track, thumb } = INPUT.scroll,
    thumbHeight = Math.max(thumb * 3, Math.round(height * Math.min(1, fraction))),
    thumbTop = Math.round((height - thumbHeight) * Math.min(1, Math.max(0, at)));
  return `<div class="lib-scroll" style="width:${thumb}px;height:${height}px;${style}">
    <div class="lib-scroll-track" style="left:${(thumb - track) / 2}px;width:${track}px;background:${INPUT_COLOURS.track}"></div>
    <div class="lib-scroll-thumb" style="top:${thumbTop}px;height:${thumbHeight}px;width:${thumb}px;
      background:${held ? INPUT_COLOURS.thumbHeld : INPUT_COLOURS.thumb}"></div></div>`;
}

// ---------- the page ----------
const inputTile = (state, title, inner, stage = '') => `<figure class="lib-state">
  <div class="lib-stage lib-input-stage" data-state="${esc(state)}" style="background:${CLEAN_STAGE};${stage}">${inner}</div>
  <figcaption>${nameButton(state.replace(':', '.'))}<br>${esc(title)}</figcaption></figure>`;
const TYPE_GROUPS = [
  { name: 'Physical', choices: [{ key: 'normal', label: 'Normal' }, { key: 'fighting', label: 'Fighting' }] },
  { name: 'Special', choices: [{ key: 'fire', label: 'Fire' }, { key: 'water', label: 'Water' }] },
  { name: 'Other', choices: [{ key: 'grass', label: 'Grass' }, { key: 'electric', label: 'Electric' }, { key: 'ice', label: 'Ice' }] },
];
function inputsSection() {
  const fields = [
    inputTile('field.text:rest', 'Rest: the placeholder in grey.mid', fieldText({ width: 260, placeholder: 'Search team items' })),
    inputTile(
      'field.text:cursor',
      'The keys are on it: the yellow edge (Enter starts typing)',
      fieldText({ width: 260, placeholder: 'Search team items', state: 'cursor' })
    ),
    inputTile('field.text:typing', 'Typing: the yellow edge and the blinking caret', fieldText({ width: 260, value: 'Lucky', state: 'typing' })),
    inputTile('field.text:filled', 'Filled, the keys elsewhere', fieldText({ width: 260, value: 'Lucky' })),
  ].join('');
  const dropdowns = [
    inputTile('field.dropdown:rest', 'Closed: the label and the chevron', dropdownBox({ width: 170, label: 'Type' })),
    inputTile('field.dropdown:chosen', 'Closed with two chosen', dropdownBox({ width: 170, label: 'Type', count: 2 })),
    inputTile('field.dropdown:cursor', 'The keys are on it', dropdownBox({ width: 170, label: 'Type', state: 'cursor' })),
    inputTile(
      'field.dropdown:open',
      'Open: the list under it, groups and ticks, the keys on Water; it scrolls',
      `<div style="position:relative;width:220px;height:300px">${dropdownBox({ width: 170, label: 'Type', count: 2, state: 'cursor' })}
        ${dropdownList({ width: 220, height: 250, groups: TYPE_GROUPS, chosen: ['fire', 'water'], at: 'water', style: 'position:absolute;left:0;top:48px' })}</div>`
    ),
  ].join('');
  const bars = [
    inputTile('scroll.bar:rest', 'At rest, a third of the list shown, scrolled a little', scrollBar({ height: 200, fraction: 0.35, at: 0.2 })),
    inputTile('scroll.bar:held', 'Held (dragged): teal.light', scrollBar({ height: 200, fraction: 0.35, at: 0.6, held: true })),
  ].join('');
  return `<section class="lib-story" data-draft="field.text">
    <h3>${nameButton('field.text')} ${draftTag('clean: a search bar (a board copy)')}</h3>
    <div class="lib-states">${fields}</div>
    <h3>${nameButton('field.dropdown')} ${draftTag('clean: a filter box and its list (a board copy)')}</h3>
    <div class="lib-states">${dropdowns}</div>
    <h3>${nameButton('scroll.bar')} ${draftTag('clean: the bar beside a scrolling box (a board copy)')}</h3>
    <div class="lib-states">${bars}</div>
    <dl class="lib-facts">
      <dt>Pieces</dt><dd>${nameButton('panel.clean')}<span>the field, the list and the tick boxes; ${CLEAN_PANEL.edgeWidth} px edge</span></dd>
      ${cleanColour('Body', 'color.grey.panel', INPUT_COLOURS.body)}
      ${cleanColour('Edge', 'color.grey.slate', INPUT_COLOURS.edge)}
      ${cleanColour('The keys on it', 'color.yellow.base', INPUT_COLOURS.cursor)}
      <dd class="lib-dim">A field shows the cursor as its edge, not with ${nameButton('cursor.bar')} beside it (as today’s
        search bar takes its own rim, Jess 2026-11-17); yellow is selection, so today’s focus green goes. A list’s choice
        under the keys takes the same yellow edge</dd>
      ${cleanColour('Text', 'color.grey.white', INPUT_COLOURS.text)}
      ${cleanColour('Placeholder', 'color.grey.mid', INPUT_COLOURS.placeholder)}
      ${cleanColour('Group header, tick', 'color.teal.base', INPUT_COLOURS.group)}
      ${cleanColour('Scroll track', 'color.grey.raised', INPUT_COLOURS.track)}
      ${cleanColour('Scroll thumb', 'color.teal.base', INPUT_COLOURS.thumb)}
      ${cleanColour('Thumb held', 'color.teal.light', INPUT_COLOURS.thumbHeld)}
      <dt>Font</dt><dd>${nameButton('font.michroma')}<span>${INPUT.size} px (group headers ${INPUT.list.groupSize})</span></dd>
      <dt>Sizes</dt><dd>Fields ${INPUT.height} px tall (today’s), ${INPUT.padX} px in; list rows ${INPUT.list.rowHeight} px; the
        caret ${INPUT.caretWidth} px, blinking at cursor.bar’s ${CURSOR.blinkMs} ms; the scroll bar a ${INPUT.scroll.track} px
        track under an ${INPUT.scroll.thumb} px thumb, square, no rim, ${INPUT.scroll.room} px kept beside a box</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/inputs-draft.js; changing one changes only the board</dd>
    </dl></section>`;
}
const INPUT_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note:
      'Drafts, not reviewed yet (Jess 2026-11-20: kept, judged on their own later): the text field, the dropdown and ' +
      'the scroll bar for the Main Menu Shop and the menus after it.',
    draw: inputsSection,
  },
];
const inputsPage = (tab) => tabbedPage('Inputs', INPUT_TABS, tab);
