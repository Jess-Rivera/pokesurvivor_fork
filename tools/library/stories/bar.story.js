/* ============ bar.story.js: the board's stories for the bars (G.Lib.BarStories; #155) ============
 * Placeholder values only: what tools/library.html draws on Primitives, Bars. The game never loads this file. Each
 * piece shows its states as tiles and its props in a table (decision 2026-11-18-155-primitive-states-vs-props).
 */
G.Lib = G.Lib || {};
G.Lib.BarStories = (() => {
  const bar = G.Lib.Bar;
  if (!bar || !bar.ready) return [];
  // the character info panel's bar (231 art pixels at 2 px)
  const LIFE = { artPixel: 2, artWidth: 231, labelTop: -6 };
  const fillAt = (fraction, alive = true) => bar.lifeBarFill(LIFE.artPixel, LIFE.artWidth, fraction, alive);
  const lifeProps = (fraction, band, extra) => ({
    ...LIFE,
    fillPixels: fillAt(fraction),
    band,
    growing: false,
    pieces: [],
    ...extra,
  });

  const life = {
    name: 'bar.life',
    component: 'LifeBar',
    stageClass: 'lib-stage-bar',
    job:
      'The B2 dark HP bar: the tab and its italic HP, the track, and a fill in the HP band colours. A hit cuts the ' +
      'lost piece off; it holds a second, then falls. A heal grows the fill.',
    files: 'js/ui/lib/primitives/bar/bar.js, bar.css; the per-frame state: js/ui/hud-kit-hp-bars.js createLifeBar',
    tokens: [
      'color.hp.high.fill',
      'color.hp.middle.fill',
      'color.hp.low.fill',
      'color.hud.outline',
      'color.hud.body',
      'color.hud.checker',
      'color.hud.trackShade',
      'color.hud.trackLight',
    ],
    font: { name: 'font.hudText', size: '20 px italic HP' },
    size: 'artWidth x 12 art rows at 2 px (462 x 24 on the character panel)',
    places: ['run.hud.lifeMeter', 'run.boss.lifeBar', 'pause.pokemonDetail.lifeBar'],
    states: [
      { id: 'high', title: 'Over half (green)', props: lifeProps(0.75, 'high') },
      { id: 'middle', title: 'From a fifth to half (yellow)', props: lifeProps(0.35, 'middle') },
      { id: 'low', title: 'Under a fifth (red)', props: lifeProps(0.1, 'low') },
      { id: 'empty', title: 'Fainted (no fill)', props: lifeProps(0, 'low', { fillPixels: fillAt(0, false) }) },
      {
        id: 'cut',
        title: 'A hit just taken: the lost piece holds, then falls (once, as the page opens)',
        props: lifeProps(0.4, 'middle', {
          pieces: [{ id: 1, left: fillAt(0.4), width: fillAt(0.75) - fillAt(0.4), band: 'high' }],
        }),
      },
    ],
    props: [
      {
        name: 'artPixel, artWidth',
        values: 'px per art pixel, art pixels',
        does: 'Its size: the boss bar shrinks its width with a small window',
      },
      { name: 'labelTop', values: 'px', does: "The HP label's height on the tab (each panel sets its own)" },
      { name: 'fillPixels', values: 'px (from lifeBarFill)', does: 'How much of the track the fill covers' },
      { name: 'band', values: 'high, middle, low', does: 'Shows the HP band states (above)' },
      { name: 'growing', values: 'true or false', does: 'A heal: the fill eases to its new length' },
      {
        name: 'pieces, onPieceFallen',
        values: '[{ id, left, width, band }], a function',
        does: 'The lost pieces falling; called when one has fallen',
      },
    ],
  };

  const timer = {
    name: 'bar.timer',
    component: 'TimerBar',
    stageClass: 'lib-stage-timer',
    job: 'A thin strip that drains as time runs out: the status chips, the Shake Off prompt, the weather card.',
    files: 'js/ui/lib/primitives/bar/bar.js, bar.css',
    tokens: ['color.text.label', 'color.type.*'],
    size: 'the screen sets its width and height',
    places: ['run.hud.chipTimer', 'run.hud.shakeOffTimer', 'run.map.weatherTimer'],
    states: [
      {
        id: 'rest',
        title: 'Draining (60% left)',
        props: { fraction: 0.6, height: 4, style: { left: '0px', top: '4px', width: '160px' } },
      },
    ],
    props: [
      { name: 'fraction', values: '0 to 1', does: 'The time left: how much of the strip shows' },
      {
        name: 'height',
        values: 'px',
        does: 'Its thickness: 2 on a chip, 4 on the Shake Off prompt, 6 on the weather card',
      },
      { name: 'colour', values: 'a colour (white by default)', does: 'One colour' },
      {
        name: 'light, base',
        values: 'two colours',
        does: "Two rows instead (the weather card: its type's Light over Base)",
      },
      {
        name: 'drainsRight',
        values: 'true or false',
        does: 'Holds its right end and runs out toward it (the weather card at the screen edge)',
      },
      { name: 'className, style', values: 'class, place and width', does: "The screen's class; its place" },
    ],
  };

  const exp = {
    name: 'bar.exp',
    component: 'ExpBar',
    stageClass: 'lib-stage-timer',
    job: "A Pokemon's Exp Candy XP toward its next level: a 4 px line, two rows full and two empty.",
    files: 'js/ui/lib/primitives/bar/bar.js, bar.css',
    tokens: ['color.blue.base', 'color.blue.dark', 'color.grey.mid', 'color.grey.paper'],
    size: '4 px tall, the screen sets its width',
    places: ['team.detail.expBar'],
    states: [0, 0.4, 1].map((fraction) => ({
      id: 'at' + fraction * 100,
      title: fraction * 100 + '% of the level',
      props: { fraction, style: { width: '240px' } },
    })),
    props: [{ name: 'fraction', values: '0 to 1', does: 'How far it is to the next level' }],
  };

  return [life, timer, exp];
})();
