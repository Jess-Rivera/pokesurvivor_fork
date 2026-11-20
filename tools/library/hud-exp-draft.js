// tools/library/hud-exp-draft.js: the HUD set run.hud.playerActive.bar (Unified, Current). A plain script sharing
// the board's globals (it uses bars-draft.js's bar pieces and hud-health-draft.js's HP numbers, so it loads after them);
// index.html loads the board's files in order, board.js first and start.js last.
'use strict';
// ---------- run.hud.playerActive.bar (Jess 2026-11-19): one bar for HP and EXP; EXP moves off the portrait ring ----------
// The healthBar and expBar sets folded into this one (Jess 2026-11-19): the holder carries both, so they are one set.
// Built from the B2 (Pokemon Black 2 / White 2) EXP version of the dark HP bar (b2-upper A4 to L6, assets/ui/BW Pokedex
// rip/black_2_and_white_2_upper_screen_battle_system_rip..., x 8 to 122, y 41 to 58): one holder, the HP track on top, a
// thin two-row EXP strip hanging under it (vertical one-pixel stripes). Stretched to the life meter's 231 art pixels by
// repeating a two-column slice of its middle, so the checker and the stripes stay in step. Then (Jess 2026-11-19): the
// HP tab moved to the left end and the HP track grown both ways; B2's 5-pixel letters replaced by Silver 10px (the
// Pokemon tier), upright since Silver has no italic, each letter ringed by a one-pixel ink outline (the HUD text's
// eight shadows). Later (Jess 2026-11-19): HP and EXP in 3 x 5 pixel letters, each on an ink plate; EXP left of the strip,
// the strip (3 short of the HP track) beside the P's bowl, the bar's bottom flat; the HP track 5 rows thick (one shade row on top, two under), two checker rows down, the HP letters on its rows.
// The letters are drawn into the holder as pixel art, so the grid below is the whole bar, one letter per art
// pixel (o ink, b and c the checker, d the shadow, s and l the HP track, W the HP letters, E the EXP letters, m and p
// the empty strip's two rows). Made with a script in the Quick session (2026-11-19); edit the grid by hand to change it.
// A board copy: the game draws a ring today.
const EXP_ROWS = [
  '.......................................................................................................................................................................................................................',
  '...oooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo......',
  '..ocbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbo.....',
  '..obcooooooooocbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbcbo....',
  '.obcboWoWoWWoossssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssocbcbo...',
  '.ocbcoWoWoWoWollllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllobcbcbo..',
  'ocbcboWWWoWWoollllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllocbcbbo..',
  'obcbcoWoWoWooossssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssobcbbod..',
  '.obcboWoWoWooossssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssocbbbodd.',
  '..obcoooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooobcboddd.',
  '...obcbcbcbcbcbcbcbcoooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooobcbcbbodd..',
  '....obcbcbcbcbcbcbcboEEEoEoEoEEooppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppppocbcbboddd..',
  '.....obcbcbcbcbcbcbcoEoooEoEoEoEommmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmobbbbbodd...',
  '......oooooooooooooooEEoooEooEEooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooddd...',
  '........ddddddddddddoEoooEoEoEooodddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd....',
  '.........dddddddddddoEEEoEoEoEooodddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd....',
  '....................ooooooooooooo......................................................................................................................................................................................',
];
const EXP_BAR = {
  artPixel: 2,
  artWidth: EXP_ROWS[0].length,
  artRows: EXP_ROWS.length,
  hpRow: 4,
  hpRows: 5,
  hpShadeTop: 1,
  hpShadeBottom: 2,
  stripRow: 11,
};
const spanOf = (row, letters) => {
  const cells = [...EXP_ROWS[row]].map((cell, x) => (letters.includes(cell) ? x : -1)).filter((x) => x >= 0);
  return { left: cells[0], width: cells[cells.length - 1] - cells[0] + 1 };
};
const EXP_HP_TRACK = spanOf(EXP_BAR.hpRow + EXP_BAR.hpShadeTop, 'l'); // the HP track's first light row
const EXP_STRIP = spanOf(EXP_BAR.stripRow, 'mp'); // the EXP strip
// the art's letters in Unified colours (B2's own hex in the comment)
const EXP_COLOURS = {
  o: greyTone('ink'), // #101010 outline
  b: greyTone('panel'), // #161616 checker dark
  c: greyTone('raised'), // #333333 checker light
  d: greyTone('raised'), // #313129 drop shadow (today's bar shadow is raised too)
  s: BAR_COLOURS.trackShade, // #464646 HP track shade, grey.slate
  l: BAR_COLOURS.trackLight, // #7f7f7f HP track light, grey.mid
  W: greyTone('white'), // the HP letters (3 x 5 pixel art), white like the HUD text
  E: unifiedTone(UNIFIED_BLUE, 'base'), // the EXP letters (3 x 5 pixel art); B2 #00bdf7
  e: unifiedTone(UNIFIED_BLUE, 'dark'), // the full strip's dark (bottom) row; B2 #006b9c
  m: greyTone('mid'), // #9c9ca5 the empty EXP strip, dark (bottom) row
  p: greyTone('paper'), // #f7f7f7 the empty EXP strip, light (top) row
};
const EXP_FILL = { dark: EXP_COLOURS.e, light: EXP_COLOURS.E }; // the full strip: light blue on top, dark under
// the checker (c on odd x + y, b on even, as the rip) draws as a pattern, so a row is a few rectangles instead of one
// per pixel. The EXP strip is two flat rows (Jess 2026-11-19, no pin stripes): p, the lighter, on top; m under it
const expToken = (cell, x, y) => {
  if ((cell === 'c' && (x + y) % 2 === 1) || (cell === 'b' && (x + y) % 2 === 0)) return 'X';
  return cell;
};
let expShapeCount = 0;
/** The holder as an SVG string: every row as runs of one colour or pattern. */
function expShapeSvg(shapeRows = EXP_ROWS) {
  const id = 'board-exp-' + ++expShapeCount,
    fills = { ...EXP_COLOURS, X: `url(#${id}-checker)` },
    rects = [];
  shapeRows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const token = expToken(row[x], x, y);
      let end = x;
      while (end + 1 < row.length && expToken(row[end + 1], end + 1, y) === token) end++;
      if (token !== '.')
        rects.push(`<rect x="${x}" y="${y}" width="${end - x + 1}" height="1" fill="${fills[token]}" />`);
      x = end + 1;
    }
  });
  const { artPixel } = EXP_BAR,
    artWidth = shapeRows[0].length,
    artRows = shapeRows.length;
  return `<svg width="${artWidth * artPixel}" height="${artRows * artPixel}" viewBox="0 0 ${artWidth} ${artRows}"
    shape-rendering="crispEdges" style="display:block"><defs>
      <pattern id="${id}-checker" width="2" height="2" patternUnits="userSpaceOnUse">
        <rect width="2" height="2" fill="${EXP_COLOURS.b}" /><rect x="1" width="1" height="1" fill="${EXP_COLOURS.c}" />
        <rect y="1" width="1" height="1" fill="${EXP_COLOURS.c}" /></pattern></defs>${rects.join('')}</svg>`;
}
const EXP_PX = EXP_BAR.artPixel;
const expHpPixels = (fraction) => (fraction > 0 ? Math.max(1, Math.round(fraction * EXP_HP_TRACK.width)) : 0) * EXP_PX;
const expStripPixels = (fraction) => Math.round(Math.max(0, Math.min(1, fraction)) * EXP_STRIP.width) * EXP_PX;
// the HP track is 5 art rows here (the life bar's barStripes draws 3): one shade row, two fill rows, two shade rows
const expHpStripes = (fill, shade) => {
  const top = EXP_BAR.hpShadeTop * EXP_PX,
    bottom = (EXP_BAR.hpRows - EXP_BAR.hpShadeBottom) * EXP_PX;
  return `linear-gradient(${shade} 0 ${top}px, ${fill} ${top}px ${bottom}px, ${shade} ${bottom}px)`;
};
const expHpStyle = (left, width, background) =>
  `left:${EXP_HP_TRACK.left * EXP_PX + left}px;top:${EXP_BAR.hpRow * EXP_PX}px;width:${width}px;` +
  `height:${EXP_BAR.hpRows * EXP_PX}px;background:${background}`;
const expHpFillStyle = (fraction) => {
  const band = BAR_BANDS[bandOf(fraction)];
  return expHpStyle(0, expHpPixels(fraction), expHpStripes(band.fill, band.shade));
};
const expPieceStyle = (left, width) => expHpStyle(left, width, expHpStripes(BAR_COLOURS.piece, BAR_COLOURS.pieceShade));
const expStripStyle = (fraction) => {
  // the full strip: the light blue row on top, the dark one under it, as the empty strip's two greys
  return (
    `left:${EXP_STRIP.left * EXP_PX}px;top:${EXP_BAR.stripRow * EXP_PX}px;width:${expStripPixels(fraction)}px;` +
    `height:${2 * EXP_PX}px;background:linear-gradient(${EXP_FILL.light} 0 ${EXP_PX}px, ${EXP_FILL.dark} ${EXP_PX}px)`
  );
};
// the HP numbers: right of the bar as today, centred on the whole bar's height (Jess 2026-11-19: outside the bar, not
// in the band under the HP track). Silver's 20 px line box centres its 18 px capitals, so centring the box centres the
// digits: (36 - 20) / 2 = 8 px up from the bar's bottom, a whole art pixel step.
const HP_LINE = 20; // px, the numbers' line height (hud-health-draft.css .lib-hb-text)
const EXP_SET = { max: 120, textRaise: (EXP_BAR.artRows * EXP_PX - HP_LINE) / 2, gain: 0.2 };
function expSetHtml(hp, max, exp, cut) {
  const barWidth = EXP_BAR.artWidth * EXP_PX,
    width = barWidth + HEALTH_SET.textGap + HEALTH_SET.textWidth,
    height = EXP_BAR.artRows * EXP_PX;
  const piece = cut
    ? `<div class="lib-bar-track lib-bar-piece" style="${expPieceStyle(
        expHpPixels(cut.to / max),
        expHpPixels(cut.from / max) - expHpPixels(cut.to / max)
      )}"></div>`
    : '';
  return `<div class="lib-hb" style="--hb-outline:${BAR_COLOURS.outline};--hb-font:'${HEALTH_FONT.family}';width:${width}px;
    height:${height}px"><div class="lib-hb-bar lib-exp-bar" data-exp-bar>${expShapeSvg()}
      <div class="lib-bar-track" data-exp-hp style="${expHpFillStyle(hp / max)}"></div>${piece}
      <div class="lib-bar-track lib-exp-fill" data-exp-fill style="${expStripStyle(exp)}"></div></div>
    <span class="lib-hb-text" data-hb-text style="left:${barWidth + HEALTH_SET.textGap}px;bottom:${EXP_SET.textRaise}px"
      >${hpLine(hp, max)}</span></div>`;
}
const EXP_STATES = [
  { id: 'high', title: 'HP over half, EXP 40%', hp: 87, exp: 0.4 },
  { id: 'middle', title: 'HP yellow, EXP nearly full', hp: 42, exp: 0.9 },
  { id: 'low', title: 'HP red, EXP just after a level-up', hp: 18, exp: 0.05 },
  { id: 'fainted', title: 'Fainted: no HP fill, the EXP strip stays', hp: 0, exp: 0.4 },
  {
    id: 'cut',
    title: 'A hit just taken, 72 to 50: the cut piece is grey (a still)',
    hp: 50,
    exp: 0.4,
    cut: { from: 72, to: 50 },
  },
];
const expTile = (state, title, inner) => `<figure class="lib-state">
  <div class="lib-stage lib-hb-stage" data-state="run.hud.playerActive.bar:${esc(state)}"
    style="background:${CLEAN_STAGE}">${inner}</div>
  <figcaption>${nameButton('run.hud.playerActive.bar.' + state)}<br>${esc(title)}</figcaption></figure>`;

// ---------- the demo: hits, a heal and EXP gains on one holder ----------
function startExpDemo() {
  const demo = document.querySelector('[data-exp-demo]:not([data-ready])');
  if (!demo) return;
  demo.dataset.ready = '';
  const max = EXP_SET.max,
    bar = demo.querySelector('[data-exp-bar]'),
    hpFill = demo.querySelector('[data-exp-hp]'),
    expFill = demo.querySelector('[data-exp-fill]'),
    current = demo.querySelector('[data-hb-current-hp]');
  let hp = max,
    exp = 0.3;
  const drawHp = () => {
    hpFill.setAttribute('style', expHpFillStyle(hp / max));
    current.textContent = hpCurrent(hp);
  };
  demo.querySelector('[data-exp-hit]').addEventListener('click', () => {
    if (hp <= 0) return;
    const from = hp;
    hp = Math.max(0, hp - HEALTH_SET.hit);
    hpFill.classList.remove('is-growing');
    const piece = document.createElement('div'),
      left = expHpPixels(hp / max);
    piece.className = 'lib-bar-track lib-bar-piece is-flashing is-falling';
    piece.setAttribute('style', expPieceStyle(left, expHpPixels(from / max) - left));
    piece.addEventListener('animationend', (event) => {
      if (event.animationName === 'lib-bar-piece-fall') piece.remove();
    });
    bar.appendChild(piece);
    drawHp();
  });
  demo.querySelector('[data-exp-heal]').addEventListener('click', () => {
    hp = max;
    hpFill.classList.add('is-growing');
    drawHp();
  });
  demo.querySelector('[data-exp-gain]').addEventListener('click', () => {
    exp += EXP_SET.gain;
    if (exp >= 1) {
      // a level-up: the strip fills to the end, then starts again from what is left over
      expFill.classList.add('is-growing');
      expFill.setAttribute('style', expStripStyle(1));
      const left = exp - 1;
      exp = left;
      setTimeout(() => {
        expFill.classList.remove('is-growing');
        expFill.setAttribute('style', expStripStyle(0));
        void expFill.offsetWidth;
        expFill.classList.add('is-growing');
        expFill.setAttribute('style', expStripStyle(left));
      }, 320);
      return;
    }
    expFill.classList.add('is-growing');
    expFill.setAttribute('style', expStripStyle(exp));
  });
  drawHp();
}
function expDemo() {
  return `<div class="lib-stage lib-hb-stage lib-hb-demo" data-exp-demo style="background:${CLEAN_STAGE};
    --bar-hold:${BAR_DEMO.flashMs}ms;--bar-fall:${BAR_DEMO.fallMs}ms;--bar-flash:${BAR_COLOURS.flash};
    --bar-flash-ms:${BAR_DEMO.flashMs}ms;--bar-hop:${BAR_DEMO.hopPx}px;--bar-drift:${BAR_DEMO.driftPx}px">
    ${expSetHtml(EXP_SET.max, EXP_SET.max, 0.3)}
    <div class="lib-bar-controls"><button type="button" data-exp-hit>Hit (-${HEALTH_SET.hit} HP)</button>
      <button type="button" data-exp-heal>Heal to full</button>
      <button type="button" data-exp-gain>Gain EXP (+${EXP_SET.gain * 100}%)</button></div></div>`;
}

function expUnifiedSection() {
  const tiles = EXP_STATES.map((state) =>
    expTile(state.id, state.title, expSetHtml(state.hp, EXP_SET.max, state.exp, state.cut))
  ).join('');
  const height = EXP_BAR.artRows * EXP_PX;
  return `<section class="lib-story" data-draft="run.hud.playerActive.bar">
    <h3>${nameButton('run.hud.playerActive.bar')} ${draftTag('pixel: the active Pokemon\u2019s HP and EXP (a board copy)')}</h3>
    <div class="lib-states">${tiles}</div>
    <h4 class="lib-dim">Try it: hits and a heal work as on the health bar; Gain EXP fills the strip, and a level-up fills it
      to the end and starts again</h4>
    ${expDemo()}
    <dl class="lib-facts">
      <dt>Shape</dt><dd>B2's EXP bar (Pokemon Black 2 / White 2, b2-upper A4 to L6), stretched to ${EXP_BAR.artWidth}
        art pixels: ${EXP_BAR.artWidth * EXP_PX} x ${height} px (today's bar is 462 x 24)</dd>
      <dt>HP</dt><dd>${nameButton('font.silver')}<span>Silver 10px drawn into the holder (9 art pixels tall, 18 px),
        upright (Silver has no italic), a one-pixel ink outline; at the left end on a tab. The HP track
        ${EXP_HP_TRACK.width} art pixels (${EXP_HP_TRACK.width * EXP_PX} px; today's is 207)</span></dd>
      ${cleanColour('HP letters', 'color.grey.white', EXP_COLOURS.W)}
      <dt>EXP</dt><dd>${nameButton('font.silver')}<span>the same, in blue, under the HP track's left end and hanging a
        little below the holder. The strip starts under the P, beside its stem: ${EXP_STRIP.width} art pixels, two
        rows, light over dark</span></dd>
      ${cleanColour('EXP letters, strip full (light)', 'color.blue.base', EXP_COLOURS.E)}
      ${cleanColour('Strip full (dark)', 'color.blue.dark', EXP_COLOURS.e)}
      ${cleanColour('Strip empty (dark)', 'color.grey.mid', EXP_COLOURS.m)}
      ${cleanColour('Strip empty (light)', 'color.grey.paper', EXP_COLOURS.p)}
      ${cleanColour('Holder checker', 'color.grey.panel, color.grey.raised', EXP_COLOURS.b + ', ' + EXP_COLOURS.c)}
      <dt>Numbers</dt><dd>Right of the bar as today (Silver 20 px, the hold-still box), centred on the bar's height,
        ${EXP_SET.textRaise} px up from its bottom (Jess 2026-11-19). B2 prints them inside the holder; here they stay
        outside, so the band under the HP track is left empty</dd>
    </dl>
    <dl class="lib-facts">
      <dt>What changes if this is taken</dt><dd>The portrait loses its EXP ring (116 px to an 88 px face with its 4 px
        stroke) on ${nameButton('run.hud.portrait')} and ${nameButton('pause.pokemonDetail.portrait')}; the pause
        detail panel's bar takes the EXP strip too. The holder is 12 px taller: on the run HUD its top would reach 176
        px, past the bad chip band at 172, so the chips move up 12 px (or the bar down). A game change at #126.</dd>
      <dt>Open</dt><dd>The empty band right of EXP, under the HP track (B2 prints the numbers there); the level-up
        moment on the strip</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/hud-exp-draft.js; changing one changes only the board</dd>
    </dl></section>`;
}

// ---------- Current: the life meter and the portrait's EXP ring, as the game draws them today ----------
function mountExpCurrent() {
  const barHost = document.querySelector('[data-exp-current-bar]:not([data-ready])'),
    ringHost = document.querySelector('[data-exp-current-ring]:not([data-ready])'),
    lib = G.Lib || {};
  if (barHost && lib.Bar && lib.Bar.ready) {
    barHost.dataset.ready = '';
    const { artPixel, artWidth, labelTop } = BAR_LIFE,
      fraction = HEALTH_SET.hp / HEALTH_SET.max;
    preact.render(
      libHtml`<${lib.Bar.LifeBar} artPixel=${artPixel} artWidth=${artWidth} labelTop=${labelTop}
        fillPixels=${lib.Bar.lifeBarFill(artPixel, artWidth, fraction, true)} band=${bandOf(fraction)} growing=${false} pieces=${[]} />`,
      barHost
    );
  }
  if (ringHost && lib.Portrait && lib.Portrait.ready) {
    ringHost.dataset.ready = '';
    preact.render(
      libHtml`<${lib.Portrait.RoundPortrait} size=${116} stroke=${4} ring=${{ fraction: 0.4 }}
        src=${'../../assets/pokemon/25/Portrait.png'} dex=${25} />`,
      ringHost
    );
  }
}
function expCurrentSection() {
  return `<section class="lib-story">
    <h3>${nameButton('run.hud.playerActive')} <span class="lib-dim lib-mono">today: EXP is the portrait's ring</span></h3>
    <div class="lib-states">
      <figure class="lib-state"><div class="lib-stage lib-hb-stage lib-stage-portrait" style="background:${CLEAN_STAGE}">
        <div style="position:relative;width:116px;height:116px" data-exp-current-ring></div></div>
        <figcaption>The portrait with its EXP ring, 40% (116 px)</figcaption></figure>
      <figure class="lib-state"><div class="lib-stage lib-hb-stage lib-stage-bar" style="background:${CLEAN_STAGE}">
        <div style="position:relative;width:462px;height:24px" data-exp-current-bar></div></div>
        <figcaption>The life meter, HP only</figcaption></figure>
    </div></section>`;
}

const EXP_TABS = [
  {
    id: 'unified',
    title: 'Unified',
    note: 'A possible change: EXP leaves the portrait\u2019s ring for B2\u2019s EXP bar, a strip under the HP in one holder.',
    draw: () => {
      queueMicrotask(startExpDemo);
      return expUnifiedSection();
    },
  },
  {
    id: 'current',
    title: 'Current',
    note: 'What the game draws today, for comparing: EXP is the ring around the portrait.',
    draw: () => {
      queueMicrotask(mountExpCurrent);
      return expCurrentSection();
    },
  },
];
const activeBarPage = (tab) => tabbedPage('run.hud.playerActive.bar', EXP_TABS, tab);
