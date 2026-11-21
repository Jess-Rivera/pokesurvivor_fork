// tools/library/portraits-draft.js: the Portraits page tabs (Unified, Current). A plain script sharing the board's
// globals (it uses clean-draft.js's helpers and cursor-draft.js's bar), so it loads after them; index.html loads the
// board's files in order, board.js first and start.js last.
'use strict';
// ---------- Portraits, Unified (Jess 2026-11-19): portrait.round in Unified colours, four states ----------
// A face in a circle with a stroke. Four states (Jess 2026-11-19): rest (grey.ink stroke, everywhere: the catch screen
// and TMs leave their light grey), active (the one out now: its type's canon base, the boss leader circles), selected
// (what the player has chosen, which stays while the cursor moves on: the pause roster's shown member, TMs' chosen
// Pokemon; yellow.base, the cursor's colour, plus today's pause shimmer) and fainted (dimmed). The EXP ring is a prop,
// not a state: a band that fills clockwise. Under the cursor is not a portrait state: cursor.bar shows that. A board
// copy: nothing here reads the game's portrait.
const PORTRAIT_ART = '../../assets/pokemon/'; // the board's folder is tools/library/
const PORTRAIT_SAMPLES = {
  pikachu: { src: PORTRAIT_ART + '25/Portrait.png', name: 'Pikachu' },
  charmander: { src: PORTRAIT_ART + '4/Portrait.png', name: 'Charmander' },
};
const PORTRAIT_COLOURS = {
  outline: greyTone('ink'), // the rest stroke and the face's backing; was #101010 (and catch, TMs light grey)
  selected: unifiedTone(UNIFIED_YELLOW, 'base'), // the cursor's yellow (Jess 2026-11-19); today green #38d030, TMs #29ceff
  shimmer: 'rgba(255, 255, 255, 0.55)', // today's pause shimmer, kept (white at 55%)
  ringFill: unifiedTone(UNIFIED_BLUE, 'base'), // EXP; the same hex as today
  ringTrack: greyTone('mid'), // was #7f7f7f
  activeFire: '#E62829', // canon Fire base (Scarlet/Violet), a sample: active takes the Pokemon's own type base
  faintedDim: 0.65, // the ink veil's opacity, today's
};
const PORTRAIT_RING = { outline: 2, band: 12 }; // px, today's (js/ui/lib/primitives/portrait/portrait.js RING)
const PORTRAIT_SIZES = [
  { id: 'ringed', size: 116, stroke: 4, ring: 0.6, label: '116 px with the EXP ring', places: ['run.hud.playerActive.area.portrait', 'pause.pokemonDetail.portrait'] },
  { id: 'circle', size: 48, stroke: 4, label: '48 px', places: ['run.boss.leaderCircle', 'catch.window.ownedFace', 'main.shop.tms.face'] },
  { id: 'roster', size: 44, stroke: 2, label: '44 px', places: ['run.hud.teamSlot.face', 'pause.team.face'] },
];
/** One face: the circle, its stroke in the state's colour, the picture, the shimmer when selected, the veil fainted. */
function portraitFace({ size, stroke, sample, rim, selected, fainted }) {
  const style = [
    ['width', size + 'px'],
    ['height', size + 'px'],
    ['--portrait-stroke', stroke + 'px'],
    ['--portrait-rim', selected ? PORTRAIT_COLOURS.selected : rim || PORTRAIT_COLOURS.outline],
    ['--portrait-back', PORTRAIT_COLOURS.outline],
    ['--portrait-shimmer', PORTRAIT_COLOURS.shimmer],
    ['--portrait-dim', fainted ? PORTRAIT_COLOURS.faintedDim : 0],
  ]
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
  return `<div class="lib-portrait${selected ? ' is-selected' : ''}" style="${style}">
    <img src="${esc(sample.src)}" alt="" /></div>`;
}
/** The ringed face: a 2 px ink outline, the band filled clockwise to fraction, then the face inside. ring sets the
 *  band's fill and track (EXP's blue on grey.mid by default; the catch screen's flee ring passes its own). */
function portraitRinged(state, size, stroke, fraction, ring = {}) {
  const inset = PORTRAIT_RING.outline + PORTRAIT_RING.band,
    face = portraitFace({ ...state, size: size - 2 * inset, stroke }),
    { fill = PORTRAIT_COLOURS.ringFill, track = PORTRAIT_COLOURS.ringTrack } = ring;
  return `<div class="lib-portrait-ringed" style="width:${size}px;height:${size}px;--portrait-back:${PORTRAIT_COLOURS.outline};
    --ring-fill:${fill};--ring-track:${track};--ring-angle:${Math.round(fraction * 360)}deg">
    <div class="lib-portrait-ring" style="inset:${PORTRAIT_RING.outline}px"></div>
    <div class="lib-portrait-ring-face" style="inset:${inset}px">${face}</div></div>`;
}
const PORTRAIT_STATES = [
  { id: 'rest', title: 'Rest: the grey.ink stroke', sample: PORTRAIT_SAMPLES.pikachu },
  {
    id: 'active',
    title: 'Active, the one out now: its type\u2019s base (Fire shown)',
    sample: PORTRAIT_SAMPLES.charmander,
    rim: PORTRAIT_COLOURS.activeFire,
  },
  { id: 'selected', title: 'Selected: yellow.base and the shimmer', sample: PORTRAIT_SAMPLES.pikachu, selected: true },
  { id: 'fainted', title: 'Fainted: dimmed', sample: PORTRAIT_SAMPLES.pikachu, fainted: true },
  {
    id: 'selectedFainted',
    title: 'Selected and fainted: the pause roster showing a fainted member',
    sample: PORTRAIT_SAMPLES.pikachu,
    selected: true,
    fainted: true,
  },
];
// which states each size shows: the ringed face is only ever at rest (or fainted on the detail panel); the leader
// circles take active; the rosters, catch and TMs take selected
const PORTRAIT_SIZE_STATES = {
  ringed: ['rest', 'fainted'],
  circle: ['rest', 'active', 'selected', 'fainted'],
  roster: ['rest', 'selected', 'fainted', 'selectedFainted'],
};
const portraitTile = (stateId, title, inner, extra = '') => `<figure class="lib-state">
  <div class="lib-stage lib-portrait-stage" data-state="portrait.round:${esc(stateId)}"
    style="background:${CLEAN_STAGE};${extra}">${inner}</div>
  <figcaption>${nameButton('portrait.round.' + stateId)}<br>${esc(title)}</figcaption></figure>`;
function portraitSizeRow(sizeSpec) {
  const tiles = PORTRAIT_SIZE_STATES[sizeSpec.id]
    .map((id) => {
      const state = PORTRAIT_STATES.find((entry) => entry.id === id),
        inner = sizeSpec.ring
          ? portraitRinged(state, sizeSpec.size, sizeSpec.stroke, sizeSpec.ring)
          : portraitFace({ ...state, size: sizeSpec.size, stroke: sizeSpec.stroke });
      return portraitTile(id, state.title, inner);
    })
    .join('');
  return `<h4 class="lib-dim">${esc(sizeSpec.label)}: ${sizeSpec.places.map(nameButton).join('')}</h4>
    <div class="lib-states">${tiles}</div>`;
}
// selected and the cursor together: the face stays selected while the cursor bar sits beside another face
function portraitWithCursor() {
  const roster = PORTRAIT_SIZES.find((entry) => entry.id === 'roster'),
    face = (selected) => portraitFace({ size: roster.size, stroke: roster.stroke, sample: PORTRAIT_SAMPLES.pikachu, selected });
  const inner = `<div class="lib-portrait-row">
      <div class="lib-cursor-host">${face(true)}</div>
      <div class="lib-cursor-host">${face(false)}${staticBar()}</div></div>`;
  return portraitTile(
    'selectedWithCursor',
    'The pause roster: the first face is selected (its detail shows), the cursor has moved to the second',
    inner,
    'padding-right:24px;' + cursorStyle()
  );
}
function portraitSection() {
  return `<section class="lib-story" data-draft="portrait.round">
    <h3>${nameButton('portrait.round')} ${draftTag('pixel: one Pokemon\u2019s face (a board copy)')}</h3>
    ${PORTRAIT_SIZES.map(portraitSizeRow).join('')}
    <h4 class="lib-dim">Selected and the cursor: two different things on one screen</h4>
    <div class="lib-states">${portraitWithCursor()}</div>
    <dl class="lib-facts">
      ${cleanColour('Rest stroke, backing', 'color.grey.ink', PORTRAIT_COLOURS.outline)}
      <dd class="lib-dim">Everywhere: the catch screen's and TMs' light grey rest stroke goes (Jess 2026-11-19)</dd>
      ${cleanColour('Selected stroke', 'color.yellow.base', PORTRAIT_COLOURS.selected)}
      <dd class="lib-dim">The cursor's yellow (Jess 2026-11-19): selected and the cursor are both selection. Today the pause
        roster's green #38d030 and TMs' #29ceff</dd>
      ${cleanColour('Selected shimmer', 'white at 55%', PORTRAIT_COLOURS.shimmer)}
      <dd class="lib-dim">Today's pause shimmer: a band sliding top left to bottom right, 1.5 s, half of it a pause</dd>
      ${cleanColour('Active stroke', 'color.type.*.base', PORTRAIT_COLOURS.activeFire)}
      <dd class="lib-dim">The Pokemon's own canon type base (Fire shown); passed in by the screen</dd>
      ${cleanColour('EXP ring fill', 'color.blue.base', PORTRAIT_COLOURS.ringFill)}
      ${cleanColour('EXP ring track', 'color.grey.mid', PORTRAIT_COLOURS.ringTrack)}
      <dd class="lib-dim">was #7f7f7f (slight)</dd>
      <dt>Fainted</dt><dd>An ink veil at ${PORTRAIT_COLOURS.faintedDim * 100}%, over whatever stroke the face has</dd>
    </dl>
    <dl class="lib-facts">
      <dt>Selected vs the cursor</dt><dd>The cursor is where the keys are now; it moves every press and hides with the
        mouse. Selected is what you chose, and stays while the cursor moves on (the pause roster's shown member, the
        Pokemon a TM is for). The catch screen's owned faces choose nothing, so they never take selected.</dd>
      <dt>Ring</dt><dd>A prop, not a state: a ${PORTRAIT_RING.outline} px ink outline, a ${PORTRAIT_RING.band} px band
        filled clockwise from the top, then the face</dd>
      <dt>Strokes</dt><dd>4 px at 116 and 48, 2 px at 44 (today's)</dd>
      <dt>Swap flicker</dt><dd>The leader circles' i-frame flicker (45% and full, 9 a second) is the screen's, not a
        state; unchanged</dd>
      <dt>Open at #126</dt><dd>TMs' mouse hover (today a green stroke) needs a look once the rest stroke is ink and the
        cursor hides with the mouse; an Electric Pokemon's active stroke (#FAC000) sits near the selected yellow, but
        active (the boss circles) and selected (rosters, TMs) never share a screen</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/portraits-draft.js; changing one changes only the board</dd>
    </dl></section>`;
}

const PORTRAIT_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note:
      'The portraits going forward: portrait.round in four states (rest, active, selected, fainted), the EXP ring as ' +
      'a prop.',
    draw: portraitSection,
  },
  {
    id: 'current',
    title: 'Current',
    note: 'What the game draws today, for comparing.',
    draw: () => primitiveBody('primitives/portraits'),
  },
];
const portraitsPage = (tab) => tabbedPage('Portraits', PORTRAIT_TABS, tab);
