// tools/library/bars-draft.js: the Bars page tabs (Unified, Current). A plain script sharing the board's globals (it
// uses clean-draft.js's helpers and the Unified colours); index.html loads the board's files in order, board.js first
// and start.js last.
'use strict';
// ---------- Bars, Unified (Jess 2026-11-19): the same bars in Unified colours, and a grey cut piece ----------
// bar.life keeps its B2 shape; only its colours fold to Unified (the Fold Map's rules). One motion change: the piece a
// hit cuts off flashes pure white, then goes grey (grey.paper with grey.mid shade rows, Jess 2026-11-19), instead of
// keeping the band colour it had, so a green piece never hangs off a bar that has just turned yellow. It still holds
// no longer: the piece falls the moment the flash ends (Jess 2026-11-19: today's 1 s hold felt awkward). bar.timer is
// unchanged (its white is grey.white). A board copy: nothing here reads the game.
const BAR_LIFE = { artPixel: 2, artWidth: 231, artRows: 12, labelLeft: 4, labelPixels: 24, trackRightInset: 3, labelTop: -6 };
const BAR_COLOURS = {
  outline: greyTone('ink'), // #101010, the same
  body: greyTone('panel'), // #181818, the same
  checker: greyTone('raised'), // #303030, the same
  trackShade: greyTone('slate'), // was #464646
  trackLight: greyTone('mid'), // was #7f7f7f
  piece: greyTone('paper'), // new: the cut piece's middle row (was the band's fill)
  pieceShade: greyTone('mid'), // new: the cut piece's top and bottom rows (was the band's shade)
  flash: greyTone('white'), // new: the cut piece's flash, all three rows, before it goes grey
  timer: greyTone('white'), // #ffffff, the same
};
// the HP bands: high is green, middle the canon Electric ramp (as Lv), low is red
const BAR_BANDS = {
  high: { fill: unifiedTone(UNIFIED_GREEN, 'base'), shade: unifiedTone(UNIFIED_GREEN, 'dark'), token: 'color.green' },
  middle: { fill: '#FAC000', shade: '#A37D00', token: 'color.type.electric' }, // canon Electric base and dark
  low: { fill: unifiedTone(UNIFIED_RED, 'base'), shade: unifiedTone(UNIFIED_RED, 'dark'), token: 'color.red' },
};
const BAR_WAS = {
  high: ['#00fb49', '#008a28'],
  middle: ['#f3b200', '#9a6110'],
  low: ['#fb3041', '#922030'],
};
const bandOf = (fraction) => (fraction > 0.5 ? 'high' : fraction >= 0.2 ? 'middle' : 'low');
// the B2 bar's art, copied from js/ui/lib/primitives/bar/bar.js: [rip row, left offset, right offset from R]
const BAR_SPANS = {
  shadow: [[14, 4, 2], [15, 4, 3], [16, 4, 3], [17, 4, 2], [18, 4, 2], [19, 6, 1], [20, 7, 1]],
  outline: [[10, 2, 0], [11, 1, 1], [12, 1, 2], [13, 0, 2], [14, 0, 1], [15, 1, 1], [16, 2, 0], [17, 3, 0], [18, 4, -1]],
  checker: [[11, 2, 0], [12, 2, 1], [13, 1, 1], [14, 1, 0], [15, 2, 0], [16, 3, -1]],
  body: [[17, 4, -1]],
};
const barTrackLeft = () => BAR_LIFE.labelLeft + Math.ceil(BAR_LIFE.labelPixels / BAR_LIFE.artPixel) + 1;
const barRightEdge = () => BAR_LIFE.artWidth - 4;
const barInnerArt = () => barRightEdge() - BAR_LIFE.trackRightInset - barTrackLeft();
/** The fill in px for a fraction of HP: whole art pixels, at least one while alive, none once fainted. */
const barFillPixels = (fraction) =>
  (fraction > 0 ? Math.max(1, Math.round(fraction * barInnerArt())) : 0) * BAR_LIFE.artPixel;
let barCount = 0;
/** The bar's shape (tab, body, track, shadow) as an SVG string, its checker a pattern local to this SVG. */
function barShapeSvg() {
  const id = 'board-bar-checker-' + ++barCount,
    right = barRightEdge(),
    trackLeft = barTrackLeft(),
    trackRight = right - BAR_LIFE.trackRightInset,
    rects = [];
  const rect = (x, y, width, height, fill) =>
    rects.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" />`);
  const spans = (list, fill) => {
    for (const [ripRow, leftOffset, rightOffset] of list)
      rect(leftOffset, ripRow - 9, right + rightOffset - leftOffset + 1, 1, fill);
  };
  spans(BAR_SPANS.shadow, BAR_COLOURS.checker);
  spans(BAR_SPANS.outline, BAR_COLOURS.outline);
  spans(BAR_SPANS.checker, `url(#${id})`);
  spans(BAR_SPANS.body, BAR_COLOURS.body);
  rect(trackLeft - 1, 5, trackRight - trackLeft + 2, 1, BAR_COLOURS.outline);
  rect(trackLeft - 1, 2, 1, 3, BAR_COLOURS.outline);
  rect(trackRight, 2, 1, 3, BAR_COLOURS.outline);
  [BAR_COLOURS.trackShade, BAR_COLOURS.trackLight, BAR_COLOURS.trackShade].forEach((fill, row) =>
    rect(trackLeft, 2 + row, trackRight - trackLeft, 1, fill)
  );
  const { artPixel, artWidth, artRows } = BAR_LIFE;
  return `<svg width="${artWidth * artPixel}" height="${artRows * artPixel}" viewBox="0 0 ${artWidth} ${artRows}"
    shape-rendering="crispEdges" style="display:block"><defs><pattern id="${id}" width="2" height="2"
      patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="${BAR_COLOURS.checker}" />
      <rect width="1" height="1" fill="${BAR_COLOURS.body}" /><rect x="1" y="1" width="1" height="1"
      fill="${BAR_COLOURS.body}" /></pattern></defs>${rects.join('')}</svg>`;
}
/** Three rows, shade, fill, shade, one art pixel each (the bar's fill and the cut piece). */
const barStripes = (fill, shade) => {
  const row = BAR_LIFE.artPixel;
  return `linear-gradient(${shade} 0 ${row}px, ${fill} ${row}px ${2 * row}px, ${shade} ${2 * row}px ${3 * row}px)`;
};
const barTrackStyle = (left, width, background) =>
  `left:${barTrackLeft() * BAR_LIFE.artPixel + left}px;top:${2 * BAR_LIFE.artPixel}px;width:${width}px;` +
  `height:${3 * BAR_LIFE.artPixel}px;background:${background}`;
const barFillStyle = (fraction) => {
  const band = BAR_BANDS[bandOf(fraction)];
  return barTrackStyle(0, barFillPixels(fraction), barStripes(band.fill, band.shade));
};
const barPieceStyle = (left, width) => barTrackStyle(left, width, barStripes(BAR_COLOURS.piece, BAR_COLOURS.pieceShade));
/** The whole bar as a string: shape, label, fill, and a held piece (from, to) if given. */
function lifeBarHtml(fraction, cut, animated) {
  const piece = cut
    ? `<div class="lib-bar-track lib-bar-piece${animated ? ' is-falling' : ''}" style="${barPieceStyle(
        barFillPixels(cut.to),
        barFillPixels(cut.from) - barFillPixels(cut.to)
      )}"></div>`
    : '';
  return `<div class="lib-bar" data-bar-life>${barShapeSvg()}
    <span class="lib-bar-label" style="left:${BAR_LIFE.labelLeft * BAR_LIFE.artPixel}px;top:${BAR_LIFE.labelTop}px;
      --bar-outline:${BAR_COLOURS.outline}">HP</span>
    <div class="lib-bar-track lib-bar-fill" data-bar-fill style="${barFillStyle(fraction)}"></div>${piece}</div>`;
}
const barTile = (state, title, inner) => `<figure class="lib-state">
  <div class="lib-stage lib-stage-bar" data-state="${esc(state)}" style="background:${CLEAN_STAGE}">${inner}</div>
  <figcaption>${nameButton(state.replace(':', '.'))}<br>${esc(title)}</figcaption></figure>`;
const BAR_STATES = [
  { id: 'high', title: 'Over half (green)', fraction: 0.75 },
  { id: 'middle', title: 'From a fifth to half (yellow)', fraction: 0.35 },
  { id: 'low', title: 'Under a fifth (red)', fraction: 0.1 },
  { id: 'empty', title: 'Fainted (no fill)', fraction: 0 },
  {
    id: 'cut',
    title: 'A hit just taken, 60% to 40%: the bar turns yellow, the cut piece goes grey (held, a still)',
    fraction: 0.4,
    cut: { from: 0.6, to: 0.4 },
  },
];

// ---------- the demo: take hits and heal ----------
// a hit takes 18% of max (full to yellow in three); the piece hops up during the flash and falls as it ends, so there
// is no other hold. hop: 4 px, two art pixels (Jess 2026-11-19: 2 to 4 px). drift: 8 px sideways over the whole
// hop and fall, always right, off the track's empty end (Jess 2026-11-19)
const BAR_DEMO = { hit: 0.18, flashMs: 80, fallMs: 400, hopPx: 4, driftPx: 8 };
function startBarDemo() {
  const demo = document.querySelector('[data-bar-demo]:not([data-ready])');
  if (!demo) return;
  demo.dataset.ready = '';
  const bar = demo.querySelector('[data-bar-life]'),
    fill = demo.querySelector('[data-bar-fill]'),
    readout = demo.querySelector('[data-bar-readout]');
  let hp = 1;
  const draw = () => {
    fill.setAttribute('style', barFillStyle(hp));
    readout.textContent = Math.round(hp * 100) + '% (' + bandOf(hp) + ')';
  };
  function hit() {
    if (hp <= 0) return;
    const from = hp;
    hp = Math.max(0, Math.round((hp - BAR_DEMO.hit) * 100) / 100);
    fill.classList.remove('is-growing'); // a hit cuts at once
    const piece = document.createElement('div');
    piece.className = 'lib-bar-track lib-bar-piece is-flashing is-falling';
    piece.setAttribute('style', barPieceStyle(barFillPixels(hp), barFillPixels(from) - barFillPixels(hp)));
    // the flash's end fires here too (from ::after), so only the fall removes the piece
    piece.addEventListener('animationend', (event) => {
      if (event.animationName === 'lib-bar-piece-fall') piece.remove();
    });
    bar.appendChild(piece);
    draw();
  }
  function heal() {
    hp = 1;
    fill.classList.add('is-growing'); // a heal eases the fill in
    draw();
  }
  demo.querySelector('[data-bar-hit]').addEventListener('click', hit);
  demo.querySelector('[data-bar-heal]').addEventListener('click', heal);
  draw();
}
function barDemo() {
  return `<div class="lib-stage lib-stage-bar lib-bar-demo" data-bar-demo style="background:${CLEAN_STAGE};
    --bar-hold:${BAR_DEMO.flashMs}ms;--bar-fall:${BAR_DEMO.fallMs}ms;--bar-flash:${BAR_COLOURS.flash};
    --bar-flash-ms:${BAR_DEMO.flashMs}ms;--bar-hop:${BAR_DEMO.hopPx}px;--bar-drift:${BAR_DEMO.driftPx}px">
    ${lifeBarHtml(1)}
    <div class="lib-bar-controls"><button type="button" data-bar-hit>Hit (-18%)</button>
      <button type="button" data-bar-heal>Heal to full</button>
      <span class="lib-dim lib-mono" data-bar-readout></span></div>
  </div>`;
}

// ---------- bar.timer: unchanged, shown in Unified for the record ----------
const TIMER_SAMPLES = [
  { id: 'rest', title: 'Draining, 60% left: grey.white, 4 px (the Shake Off prompt)', height: 4, fraction: 0.6 },
  {
    id: 'weather',
    title: "The weather card: its type's light over base (Water shown), 6 px, held at its right end",
    height: 6,
    fraction: 0.6,
    light: '#74ACF5', // canon Water light
    base: '#2980EF', // canon Water base
    drainsRight: true,
  },
];
function timerHtml(sample) {
  const half = sample.height / 2,
    background = sample.light
      ? `linear-gradient(${sample.light} 0 ${half}px, ${sample.base} ${half}px ${sample.height}px)`
      : BAR_COLOURS.timer;
  return `<div class="lib-bar-timer-box"><div class="lib-bar-timer" style="height:${sample.height}px;
    background:${background};transform-origin:${sample.drainsRight ? '100% 0' : '0 0'};
    transform:scaleX(${sample.fraction})"></div></div>`;
}

function lifeBarSection() {
  const tiles = BAR_STATES.map((state) =>
    barTile('bar.life:' + state.id, state.title, lifeBarHtml(state.fraction, state.cut))
  ).join('');
  const bandFacts = Object.entries(BAR_BANDS)
    .map(
      ([band, colours]) => `${cleanColour('HP ' + band + ', fill', colours.token + '.base', colours.fill)}
      ${cleanColour('HP ' + band + ', shade', colours.token + '.dark', colours.shade)}
      <dd class="lib-dim">was ${BAR_WAS[band].join(' and ')}</dd>`
    )
    .join('');
  return `<section class="lib-story" data-draft="bar.life">
    <h3>${nameButton('bar.life')} ${draftTag('pixel: one Pokemon\u2019s HP (a board copy)')}</h3>
    <div class="lib-states">${tiles}</div>
    <h4 class="lib-dim">Try it: hit three times from full to watch a piece cut off a green bar as it turns yellow</h4>
    ${barDemo()}
    <dl class="lib-facts">
      ${cleanColour('Outline, HP label outline', 'color.grey.ink', BAR_COLOURS.outline)}
      ${cleanColour('Body', 'color.grey.panel', BAR_COLOURS.body)}
      ${cleanColour('Checker, shadow', 'color.grey.raised', BAR_COLOURS.checker)}
      ${cleanColour('Track shade', 'color.grey.slate', BAR_COLOURS.trackShade)}
      <dd class="lib-dim">was #464646 (slight)</dd>
      ${cleanColour('Track light', 'color.grey.mid', BAR_COLOURS.trackLight)}
      <dd class="lib-dim">was #7f7f7f (slight)</dd>
      ${bandFacts}
      ${cleanColour('Cut piece', 'color.grey.paper', BAR_COLOURS.piece)}
      ${cleanColour('Cut piece, shade', 'color.grey.mid', BAR_COLOURS.pieceShade)}
      ${cleanColour('Cut piece, flash', 'color.grey.white', BAR_COLOURS.flash)}
      <dd class="lib-dim">New: paper in the middle row, mid above and below (the fill's three rows), whatever band the bar was in</dd>
    </dl>
    <dl class="lib-facts">
      <dt>Hit</dt><dd>The piece the hit took flashes pure white for ${BAR_DEMO.flashMs} ms (a hard cut, no fade), then
        hopping up ${BAR_DEMO.hopPx} px as it flashes; it goes grey (paper, mid shade rows) and falls at once, to 40 px
        below the track and fading over ${BAR_DEMO.fallMs} ms (today's fall), drifting ${BAR_DEMO.driftPx} px right
        (off the track's empty end) at a steady rate the whole way (a thrown arc). No hold: today's piece waits 1 s first.
        Today it also keeps the band colour it had, so a
        green piece can hang off a yellow bar (Jess 2026-11-19).</dd>
      <dt>Heal</dt><dd>Unchanged: the fill eases to its new length over 0.3 s</dd>
      <dt>Shape</dt><dd>Unchanged: the B2 dark HP bar, ${BAR_LIFE.artWidth} x ${BAR_LIFE.artRows} art pixels at
        ${BAR_LIFE.artPixel} px</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/bars-draft.js; changing one changes only the board</dd>
      <dt>Used at</dt><dd>${['run.hud.lifeMeter', 'run.boss.lifeBar', 'pause.pokemonDetail.lifeBar'].map(nameButton).join('')}</dd>
    </dl></section>`;
}
function timerSection() {
  const tiles = TIMER_SAMPLES.map((sample) => barTile('bar.timer:' + sample.id, sample.title, timerHtml(sample))).join('');
  return `<section class="lib-story" data-draft="bar.timer">
    <h3>${nameButton('bar.timer')} ${draftTag('clean: no change')}</h3>
    <div class="lib-states">${tiles}</div>
    <dl class="lib-facts">
      ${cleanColour('Strip', 'color.grey.white', BAR_COLOURS.timer)}
      <dd class="lib-dim">The same white; the weather card keeps its canon type ramp</dd>
      <dt>Used at</dt><dd>${['run.hud.chipTimer', 'run.hud.shakeOffTimer', 'run.map.weatherTimer'].map(nameButton).join('')}</dd>
    </dl></section>`;
}

const BAR_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note:
      'The bars going forward: today\u2019s shapes in Unified colours. The one motion change: a hit\u2019s cut piece ' +
      'flashes white, then goes grey.',
    draw: () => {
      queueMicrotask(startBarDemo);
      return lifeBarSection() + timerSection();
    },
  },
  {
    id: 'current',
    title: 'Current',
    note: 'What the game draws today, for comparing.',
    draw: () => primitiveBody('primitives/bars'),
  },
];
const barsPage = (tab) => tabbedPage('Bars', BAR_TABS, tab);
