// tools/library/hud-top-draft.js: the run screen's top, three composites (Jess 2026-11-20). run.hud.gymLeader: the
// enemy name bar during a gym fight (or an overworld elite) with the leader's portrait circles under it; it is the
// approved bar.life, bigger, with portrait.round. run.hud.worldInfo (Jess 2026-11-20; run.hud.runInfo is the
// DPS-Upgrades panel, top left): the map panel (top right) and the kills line (top centre), today's look in the
// Unified colours and the font scheme's tiers. run.hud.runInfo: the DPS-Upgrades panel (top left), today's look,
// Unified. Places are today's (js/ui/hud-boss-panel.js, hud-map-panel.js, hud-dps-panel.js, css/hud-overlay.css).
// A plain script sharing the board's globals;
// it loads after every draft it uses (bars, portraits, hud-exp, hud-area, shop: place). A board copy: nothing here
// reads the game.
'use strict';
// ---------- run.hud.gymLeader: today's numbers (hud-boss-panel.js) ----------
const GYM_LEADER = {
  stage: { width: 820, height: 170 }, // the board's crop of the screen's top centre
  barScale: 1.5, // bar.life at 3 px per art pixel (2 x 1.5), today's boss bar's ART_PIXEL; 693 px wide (today 696)
  nameTop: 43, // the name line's top (NAME_LINE_TOP); the bar under it, the circles under the bar
  nameSize: 20, // Silver 20, a Pokemon talking (today HudText 20)
  circle: { size: 48, stroke: 4, gap: 6, top: 4 }, // a 4 px stroke round the 40 px portrait, 6 px apart, 4 px below
};
const GYM_LEADER_STATES = [
  {
    id: 'gym',
    title: 'A gym fight: Brock\u2019s second Pokemon out, his first fainted',
    name: 'Brock\u2019s Onix',
    level: 14,
    hp: 0.62,
    gymType: 'rock', // the active circle's stroke: the gym's type
    team: [
      { dex: 74, fainted: true },
      { dex: 95, active: true },
      { dex: 75 },
      { dex: 111 },
    ],
  },
  {
    id: 'elite',
    title: 'An overworld elite: the same bar, no circles',
    name: 'Elite Onix',
    level: 23,
    hp: 0.15,
    team: [],
  },
];
function gymLeaderHtml(state) {
  const { stage, barScale, nameTop, nameSize, circle } = GYM_LEADER,
    barWidth = LIFE_BAR.artWidth * LIFE_BAR.artPixel * barScale,
    barHeight = lifeRows().length * LIFE_BAR.artPixel * barScale,
    nameLine = (text, side) =>
      areaText(text, nameSize, AREA_FONTS.silver, `position:relative;${side === 'right' ? 'margin-left:auto' : ''}`),
    circles = state.team
      .map((member) =>
        portraitFace({
          size: circle.size,
          stroke: circle.stroke,
          sample: { src: `${PORTRAIT_ART}${member.dex}/Portrait.png` },
          rim: member.active ? typeRamp(state.gymType).base : undefined,
          fainted: member.fainted,
        })
      )
      .join('');
  return `<div class="lib-area" data-state="run.hud.gymLeader:${state.id}" style="width:${stage.width}px;
    height:${stage.height}px;background:${AREA_COLOURS.stage}">
    <div class="lib-area-piece" style="left:${(stage.width - barWidth) / 2}px;top:${nameTop}px;width:${barWidth}px">
      <div style="display:flex;height:${nameSize}px">
        ${nameLine(state.name)}${nameLine('Lv. ' + state.level, 'right')}</div>
      <div style="position:relative;width:${barWidth}px;height:${barHeight}px">
        <div style="transform:scale(${barScale});transform-origin:0 0">${lifeBarHtml(state.hp)}</div></div>
      <div style="display:flex;gap:${circle.gap}px;margin-top:${circle.top}px">${circles}</div>
    </div></div>`;
}
function gymLeaderSection() {
  const states = GYM_LEADER_STATES.map(
    (state) => `<h4>${esc(state.title)}</h4><div class="lib-area-scroll">${gymLeaderHtml(state)}</div>`
  ).join('');
  return `<section class="lib-story" data-draft="run.hud.gymLeader">
    <h3>${nameButton('run.hud.gymLeader')}
      ${draftTag('composite: the enemy name bar and leader circles (a board copy)')}</h3>
    ${states}
    <dl class="lib-facts">
      <dt>Pieces</dt><dd>${nameButton('bar.life')} at ${GYM_LEADER.barScale}x (3 px per art pixel, as today\u2019s boss
        bar), its green, yellow and red bands; the name and Lv above it in ${nameButton('font.silver')}
        ${GYM_LEADER.nameSize} (a Pokemon talking); one ${nameButton('portrait.round')} per filled leader slot under
        it, ${GYM_LEADER.circle.size} px with a ${GYM_LEADER.circle.stroke} px stroke, ${GYM_LEADER.circle.gap} px apart
        (the active one in the gym\u2019s type base, the rest ink, a fainted one dimmed)</dd>
      <dt>Places</dt><dd>Today\u2019s: centred, the name line ${GYM_LEADER.nameTop} px down, the circles
        ${GYM_LEADER.circle.top} px under the bar. The bar is 693 px wide (today 696: bar.life is 231 art pixels, the
        boss bar 232)</dd>
      <dt>Elites</dt><dd>\u201cElite Onix\u201d and its level for run time, no circles (as today)</dd>
      <dt>Not shown</dt><dd>The circle\u2019s pulse while the active Pokemon is invulnerable; the enrage line (on the
        canvas)</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/hud-top-draft.js; changing one changes only the
        board</dd>
    </dl></section>`;
}

// ---------- run.hud.worldInfo: today's numbers (hud-map-panel.js, hud-overlay.css .hud-map) ----------
const WORLD_INFO = {
  stage: { width: 1100, height: 330, screenLeft: 820 }, // the right of the screen from x 820: the kills line's centre
  // (screen x 960) is 140 px in
  panel: { top: 24, right: 24, gap: 6 }, // right-aligned, top to bottom
  kills: { top: 12, size: 16 }, // font.boldPixels 16 (Fold Map; today HudText 20), dim
  worldLevel: { size: 48 }, // font.boldPixels 48, as today
  label: { size: 16 }, // font.monogram 16: World Level's label, Region, Map (Fold Map; today HudText 20)
  card: {
    artPixel: 3,
    artRows: 46,
    gapAbove: 12, // under the map lines; it runs into the screen's right edge
    tabRight: 42,
    stripeRows: [14, 31], // drawn over the icon
    icon: { size: 54, left: 54, top: 9 },
    name: { left: 42, top: 54, size: 32 }, // font.monogram 32 in the weather's light (today HudText 30)
    effect: { left: 48, top: 99, size: 16 }, // font.monogram 16 in white (today HudText 20)
    timer: { artLeft: 16, artRow: 41, artRows: 2 }, // just inside the lower rim: light over base, draining right
    rightPadding: 6, // art px past the longest text
  },
};
// each row's left edge, in art px from the pointed end: the B2 tab's (b2-lower Y1 to AA3), copied from
// hud-map-panel.js LEFT_EDGE
const WORLD_INFO_LEFT_EDGE = [
  13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6, 4, 4, 3, 3, 2, 2, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 6, 7, 7, 8,
  8, 9, 9, 10, 10, 11, 11, 12, 12, 13,
];
const WORLD_INFO_STATES = [
  {
    id: 'rain',
    title: 'A weather on: Rain, about half its time left',
    worldLevel: 27,
    region: 'Kanto',
    map: 'Viridian Forest',
    kills: '1248 Kills',
    weather: { name: 'Rain', effect: 'Water x1.5 \u00b7 Electric x1.2 \u00b7 Fire x0.5', icon: 'rain', type: 'water' },
    timeLeft: 0.55,
  },
  {
    id: 'clear',
    title: 'The weather has passed: Clear Sky (no timer; it holds about 2 s, then fades)',
    worldLevel: 31,
    region: 'Kanto',
    map: 'Route 2',
    kills: '1517 Kills',
    weather: { name: 'Clear Sky', effect: 'The weather has passed', icon: 'clear', type: 'normal' },
  },
];
const worldInfoTabRight = (row) =>
  row === 0 ? WORLD_INFO.card.tabRight - 2 : WORLD_INFO.card.tabRight + 12 - WORLD_INFO_LEFT_EDGE[row];
/** The card's rows as letters (o outline, D B L the weather's dark, base and light, G the slate body, . none), copied
 *  from hud-map-panel.js cardRows. */
function worldInfoCardRows(artWidth) {
  const rows = [],
    edge = artWidth - 1;
  for (let row = 0; row < WORLD_INFO.card.artRows; row++) {
    const line = new Array(artWidth).fill('.'),
      left = WORLD_INFO_LEFT_EDGE[row],
      tabRight = worldInfoTabRight(row),
      put = (x, letters) => letters.split('').forEach((letter, index) => (line[x + index] = letter)),
      fill = (from, to, letter) => {
        for (let x = from; x <= to && x < artWidth; x++) line[x] = letter;
      },
      upperRim = row % 2 ? 'oDBBo' : 'oBBDo',
      lowerRim = row % 2 ? 'oBBDo' : 'oDBBo';
    if (row === 0) fill(left, tabRight, 'o');
    else if (row === 1) (fill(left, tabRight, 'B'), put(left, 'oD'), put(tabRight - 1, 'Do'));
    else if (row === 2) (fill(left, tabRight, 'o'), put(left, 'oBBD'), put(tabRight - 3, 'DBBo'));
    else if (row <= 13) {
      fill(left, edge, 'G');
      put(left, upperRim);
      if (row <= 9) put(tabRight - 4, upperRim.split('').reverse().join(''));
      if (row <= 8) fill(tabRight + 1, edge, '.');
      if (row === 9) fill(tabRight + 1, edge, 'o');
      if (row === 10) (put(tabRight - 4, 'oDBB'), fill(tabRight, edge, 'B'));
      if (row === 11) fill(worldInfoTabRight(10) - 4, edge, 'o');
    } else if (row === 14 || row === 31) (fill(left, edge, 'o'), put(left + 3, 'BBD'));
    else if (row === 15 || row === 30) (fill(left, edge, 'L'), put(left, 'o'));
    else if (row <= 29) (fill(left, edge, 'o'), put(left, row % 2 ? 'oLLLB' : 'oBLLL'));
    else if (row <= 42) (fill(left, edge, 'G'), put(left, lowerRim));
    else if (row === 43) (fill(left, edge, 'o'), put(left, 'oBBDo'));
    else if (row === 44) (fill(left, edge, 'B'), put(left, 'oDBB'));
    else fill(left, edge, 'o');
    rows.push(line.join(''));
  }
  return rows;
}
const worldInfoMeasure = document.createElement('canvas').getContext('2d');
/** A text's width in px in a face, with its outline on both sides (a face not loaded yet measures in its fallback). */
function worldInfoTextWidth(text, size, font) {
  worldInfoMeasure.font = `${size}px ${font}, monospace`;
  return Math.ceil(worldInfoMeasure.measureText(text).width) + 4;
}
function worldInfoCard(weather, timeLeft) {
  const c = WORLD_INFO.card,
    ramp = typeRamp(weather.type),
    widest = Math.max(
      c.name.left + worldInfoTextWidth(weather.name, c.name.size, AREA_FONTS.world),
      c.effect.left + worldInfoTextWidth(weather.effect, c.effect.size, AREA_FONTS.world)
    ),
    artWidth = Math.max(c.tabRight + 24, Math.ceil(widest / c.artPixel) + c.rightPadding),
    rows = worldInfoCardRows(artWidth),
    fills = { o: greyTone('panel'), D: ramp.dark, B: ramp.base, L: ramp.light, G: greyTone('slate') },
    // two layers of one shape: everything but the stripe under the icon, the stripe over it
    layer = (stripe) =>
      rows.map((line, row) =>
        (row >= c.stripeRows[0] && row <= c.stripeRows[1]) === stripe ? line : '.'.repeat(artWidth)
      ),
    width = artWidth * c.artPixel,
    timerWidth = (artWidth - c.timer.artLeft) * c.artPixel,
    timer =
      timeLeft == null
        ? ''
        : `<div style="position:absolute;left:${c.timer.artLeft * c.artPixel}px;top:${c.timer.artRow * c.artPixel}px;
          width:${timerWidth}px;height:${c.timer.artRows * c.artPixel}px"><div style="position:absolute;right:0;top:0;
          height:100%;width:${Math.round(timeLeft * timerWidth)}px;
          background:linear-gradient(${ramp.light} 50%, ${ramp.base} 50%)"></div></div>`,
    svgAt = (shape) => `<div style="position:absolute;left:0;top:0">${charMapSvg(shape, fills, c.artPixel)}</div>`;
  return `<div style="position:relative;width:${width}px;height:${c.artRows * c.artPixel}px;
    margin-top:${c.gapAbove}px;margin-right:${-WORLD_INFO.panel.right}px">
    ${svgAt(layer(false))}
    <img src="${ROOT}assets/icons/weather/${weather.icon}-white.png" alt=""
      style="position:absolute;left:${c.icon.left}px;
      top:${c.icon.top}px;width:${c.icon.size}px;height:${c.icon.size}px;image-rendering:pixelated" />
    ${svgAt(layer(true))}
    ${areaText(weather.name, c.name.size, AREA_FONTS.world, place(c.name.left, c.name.top), ramp.light, 16)}
    ${areaText(
      weather.effect,
      c.effect.size,
      AREA_FONTS.world,
      place(c.effect.left, c.effect.top),
      AREA_COLOURS.text,
      16
    )}
    ${timer}</div>`;
}
function worldInfoHtml(state) {
  const { stage, panel, kills, worldLevel, label } = WORLD_INFO,
    dim = greyTone('mid'),
    line = (text, size, font, colour) => areaText(text, size, font, 'position:relative', colour, 16);
  return `<div class="lib-area" data-state="run.hud.worldInfo:${state.id}" style="width:${stage.width}px;
    height:${stage.height}px;background:${AREA_COLOURS.stage}">
    ${areaText(state.kills, kills.size, AREA_FONTS.counter, `left:${960 - stage.screenLeft}px;top:${kills.top}px;
      transform:translateX(-50%)`, dim, 16)}
    <div class="lib-area-piece" style="top:${panel.top}px;right:${panel.right}px;display:flex;flex-direction:column;
      align-items:flex-end;gap:${panel.gap}px">
      ${line(String(state.worldLevel), worldLevel.size, AREA_FONTS.counter, AREA_COLOURS.text)}
      ${line('World Level', label.size, AREA_FONTS.world, AREA_COLOURS.text)}
      ${state.region ? line(state.region, label.size, AREA_FONTS.world, dim) : ''}
      ${line(state.map, label.size, AREA_FONTS.world, dim)}
      ${worldInfoCard(state.weather, state.timeLeft)}
    </div></div>`;
}
function worldInfoSection() {
  const states = WORLD_INFO_STATES.map(
    (state) => `<h4>${esc(state.title)}</h4><div class="lib-area-scroll">${worldInfoHtml(state)}</div>`
  ).join('');
  return `<section class="lib-story" data-draft="run.hud.worldInfo">
    <h3>${nameButton('run.hud.worldInfo')}
      ${draftTag('composite: the map panel and the kills line (a board copy)')}</h3>
    ${states}
    <dl class="lib-facts">
      <dt>As today</dt><dd>The layout, the places and the weather card\u2019s shape are today\u2019s (Jess 2026-11-20:
        it stays pretty much as it is). Only the colours fold to Unified and the fonts take their tiers</dd>
      <dt>Fonts</dt><dd>${nameButton('font.boldPixels')}<span>World Level 48, the kills line 16 (world numbers)</span>
        ${nameButton('font.monogram')}<span>the World Level label, Region and Map 16, the weather\u2019s name 32 and
        effect 16 (world words; today HudText 20 and 30)</span></dd>
      <dt>Colours</dt><dd>The card\u2019s greens are the weather\u2019s type ramp (rain Water, sun Fire, sand Rock, snow
        Ice, fog Ghost, Clear Sky Normal); its outline grey.panel (today Frame #212121), its body grey.slate; dim text
        grey.mid</dd>
      <dt>Not shown</dt><dd>The card\u2019s slide in and out; the kills line hides during gym fights</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/hud-top-draft.js; changing one changes only the
        board</dd>
    </dl></section>`;
}
// all three approved (Jess 2026-11-20): decision 2026-11-20-155-run-hud-gym-leader-world-info-run-info-look
const HUD_TOP_TABS = (draw, note) => [{ id: 'unified', title: 'Approved', note, draw }];
const gymLeaderPage = (tab) =>
  tabbedPage(
    'run.hud.gymLeader',
    HUD_TOP_TABS(gymLeaderSection, 'APPROVED (Jess 2026-11-20): bar.life bigger, the leader circles under it.'),
    tab
  );
const worldInfoPage = (tab) =>
  tabbedPage(
    'run.hud.worldInfo',
    HUD_TOP_TABS(worldInfoSection, 'APPROVED (Jess 2026-11-20): today\u2019s look, Unified.'),
    tab
  );

// ---------- run.hud.runInfo: the DPS-Upgrades panel, top left (hud-dps-panel.js, hud-overlay.css .hud-dps) ----------
// Today's layout and sizes in the Unified colours (Jess 2026-11-20). Every word is Michroma already (a module panel,
// the game talking). The whole panel takes Settings > DPS Panel Opacity (60% by default).
const RUN_INFO = {
  stage: { width: 420, height: 400 }, // the board's crop of the screen's top left
  panel: { left: 16, top: 16, width: 320, padding: 12, gap: 10, edge: 2, bodyAlpha: 0.5, opacity: 0.6 },
  header: { nameSize: 16, numberSize: 24, unitSize: 14, lineHeight: 24 },
  spark: { seconds: 30, width: 292, height: 40, outline: 2, line: 2, tickAlpha: 0.35 },
  cards: { size: 14, lineHeight: 18, gap: 6 },
};
const RUN_INFO_COLOURS = {
  body: rgbaOf(greyTone('panel'), RUN_INFO.panel.bodyAlpha), // today #181818 at 50%
  edge: greyTone('slate'), // today #495151
  number: unifiedTone(UNIFIED_YELLOW, 'base'), // today Title yellow #fff000
  count: unifiedTone(UNIFIED_TEAL, 'base'), // today Secondary text #8cfff7
  strip: greyTone('panel'), // today Frame #212121, the recessed strip
  outline: greyTone('ink'),
  text: greyTone('white'),
  tick: rgbaOf(greyTone('white'), RUN_INFO.spark.tickAlpha),
};
// the sparkline's sample: 30 seconds of team damage and who was out, oldest first (Pikachu, then Charmander, Squirtle,
// back to Pikachu), drawn in each one's first type's base
const RUN_INFO_SPARK_TYPES = ['electric', 'fire', 'water'];
const RUN_INFO_SPARK = {
  damage: [
    120, 135, 128, 150, 162, 158, 171, 166, 90, 84, 102, 118, 131, 140, 137, 152, 149, 60, 72, 88, 95, 110, 124, 180,
    196, 205, 188, 214, 220, 209,
  ],
  outSlot: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0],
};
const RUN_INFO_STATES = [
  {
    id: 'early',
    title: 'Early in a run: no card picked yet (no divider, no list)',
    name: 'Pikachu',
    dps: 42,
    cards: [],
  },
  {
    id: 'mid',
    title: 'Mid-run: three swaps on the sparkline and six cards',
    name: 'Pikachu',
    dps: 214,
    spark: RUN_INFO_SPARK,
    cards: [
      ['Attack Speed Up', 3],
      ['All Damage Up', 2],
      ['Projectile Count Up', 1],
      ['Protein', 2],
      ['Pierce Up', 1],
      ['Bench Regeneration Up', 1],
    ],
  },
];
/** The sparkline as an SVG: swap ticks under the line, each segment changing colour at its midpoint (as the game's). */
function runInfoSparkSvg(spark) {
  const { seconds, width, height, line } = RUN_INFO.spark;
  if (!spark) return `<svg width="${width}" height="${height}"></svg>`;
  const count = spark.damage.length,
    highest = Math.max(...spark.damage),
    step = (width - line) / (seconds - 1),
    xAt = (index) => width - line / 2 - (count - 1 - index) * step,
    yAt = (index) => height - line / 2 - (spark.damage[index] / highest) * (height - line),
    colourAt = (index) => typeRamp(RUN_INFO_SPARK_TYPES[spark.outSlot[index]]).base,
    segment = (x1, y1, x2, y2, colour) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colour}" stroke-width="${line}"
        stroke-linecap="round" />`,
    parts = [];
  for (let index = 1; index < count; index++) {
    if (spark.outSlot[index] === spark.outSlot[index - 1]) continue;
    const tickX = Math.round((xAt(index - 1) + xAt(index)) / 2) - 1;
    parts.push(`<rect x="${tickX}" y="0" width="2" height="${height}" fill="${RUN_INFO_COLOURS.tick}" />`);
  }
  for (let index = 1; index < count; index++) {
    const middleX = (xAt(index - 1) + xAt(index)) / 2,
      middleY = (yAt(index - 1) + yAt(index)) / 2;
    parts.push(segment(xAt(index - 1), yAt(index - 1), middleX, middleY, colourAt(index - 1)));
    parts.push(segment(middleX, middleY, xAt(index), yAt(index), colourAt(index)));
  }
  return `<svg width="${width}" height="${height}" style="display:block">${parts.join('')}</svg>`;
}
function runInfoHtml(state) {
  const { stage, panel, header, spark, cards } = RUN_INFO,
    c = RUN_INFO_COLOURS,
    // today's soft text shadow (hud-overlay.css .hud-dps-header)
    textStyle = `font-family:${AREA_FONTS.meta},sans-serif;color:${c.text};white-space:nowrap;
      text-shadow:0 0 2px ${c.outline},1px 1px 0 ${c.outline},0 1px 2px ${c.outline}`,
    list = state.cards.length
      ? `<div style="height:${panel.edge}px;background:${c.edge}"></div>
        <div style="${textStyle};display:flex;flex-direction:column;gap:${cards.gap}px;font-size:${cards.size}px;
          line-height:${cards.lineHeight}px">${state.cards
            .map(
              ([name, picks]) => `<div style="display:flex;justify-content:space-between;gap:8px">
                <span>${esc(name)}</span><span style="color:${c.count}">x${picks}</span></div>`
            )
            .join('')}</div>`
      : '';
  // a real border, not panel.clean's edge-behind-body: the body is see-through, so the edge colour must not sit
  // under it
  return `<div class="lib-area" data-state="run.hud.runInfo:${state.id}" style="width:${stage.width}px;
    height:${stage.height}px;background:${AREA_COLOURS.stage}">
    <div class="lib-area-piece" style="left:${panel.left}px;top:${panel.top}px;width:${panel.width}px;
      box-sizing:border-box;padding:${panel.padding}px;display:flex;flex-direction:column;gap:${panel.gap}px;
      background:${c.body};border:${panel.edge}px solid ${c.edge};opacity:${panel.opacity}">
      <div style="${textStyle};display:flex;align-items:baseline;justify-content:space-between;gap:8px;
        min-height:${header.lineHeight}px">
        <span style="font-size:${header.nameSize}px;line-height:${header.lineHeight}px">${esc(state.name)}</span>
        <span><span style="font-size:${header.numberSize}px;line-height:${header.lineHeight}px;color:${c.number}"
          >${state.dps}</span><span style="font-size:${header.unitSize}px"> DPS</span></span></div>
      <div style="width:${spark.width + 2 * spark.outline}px;height:${spark.height + 2 * spark.outline}px;
        box-sizing:border-box;border:${spark.outline}px solid ${c.outline};background:${c.strip}"
        >${runInfoSparkSvg(state.spark)}</div>
      ${list}
    </div></div>`;
}
function runInfoSection() {
  const states = RUN_INFO_STATES.map(
    (state) => `<h4>${esc(state.title)}</h4><div class="lib-area-scroll">${runInfoHtml(state)}</div>`
  ).join('');
  return `<section class="lib-story" data-draft="run.hud.runInfo">
    <h3>${nameButton('run.hud.runInfo')}
      ${draftTag('composite: the DPS-Upgrades panel, top left (a board copy)')}</h3>
    ${states}
    <dl class="lib-facts">
      <dt>As today</dt><dd>Layout, places, sizes and the Michroma text are today\u2019s (Jess 2026-11-20); only the
        colours fold to Unified. Both states at the default ${RUN_INFO.panel.opacity * 100}% panel opacity</dd>
      <dt>Colours</dt><dd>The box grey.panel at ${RUN_INFO.panel.bodyAlpha * 100}% with a ${RUN_INFO.panel.edge} px
        grey.slate edge (today #181818 and #495151); the DPS number ${nameButton('color.yellow.base')} (today Title
        yellow #fff000); the pick counts ${nameButton('color.teal.base')} (today #8cfff7); the sparkline strip
        grey.panel in an ink outline (today Frame #212121); the line each Pokemon\u2019s first type base, the swap
        ticks white at ${RUN_INFO.spark.tickAlpha * 100}%</dd>
      <dt>Box</dt><dd>${nameButton('panel.clean')}\u2019s look with square corners (today 4 px stepped corners), its
        edge a real border because the body is see-through (panel.clean draws its edge behind the body)</dd>
      <dt>Board copy</dt><dd>Every value lives in tools/library/hud-top-draft.js; changing one changes only the
        board</dd>
    </dl></section>`;
}
const runInfoPage = (tab) =>
  tabbedPage(
    'run.hud.runInfo',
    HUD_TOP_TABS(runInfoSection, 'APPROVED (Jess 2026-11-20): today\u2019s DPS-Upgrades panel, Unified.'),
    tab
  );
