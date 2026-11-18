/* ============ bar.story.js: the board's stories for the bars (G.Lib.BarStories; #155 155c-3) ============
 * Placeholder values only: what tools/library.html draws on Primitives, Bars. The game never loads this file. Place
 * names follow screen.panel.part.
 */
G.Lib = G.Lib || {};
G.Lib.BarStories = (() => {
  const bar = G.Lib.Bar;
  if (!bar || !bar.ready) return [];
  // the character info panel's bar (231 art pixels at 2 px), and the boss bar shrunk for a small window
  const LIFE = { artPixel: 2, artWidth: 231, labelTop: -6 },
    NARROW_ART_WIDTH = 120;
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
      'The B2 dark HP bar: the tab and its italic HP, the track, and a fill in the HP band colours (green over half, ' +
      'yellow from a fifth, red below). A hit cuts the lost piece off; it holds a second, then falls. A heal grows.',
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
    size: 'artWidth x 12 art rows at 2 px (462 x 24 on the character panel); the boss bar shrinks with the window',
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
      {
        id: 'narrow',
        title: 'Narrow (the boss bar in a small window)',
        props: lifeProps(0.75, 'high', {
          artWidth: NARROW_ART_WIDTH,
          fillPixels: bar.lifeBarFill(LIFE.artPixel, NARROW_ART_WIDTH, 0.75, true),
        }),
      },
    ],
  };

  const TIMER_WIDTH = 160;
  const timerStyle = { left: '0px', top: '4px', width: TIMER_WIDTH + 'px' };
  const weatherRamp = G.Tokens.ramp('color.type.water');
  const timer = {
    name: 'bar.timer',
    component: 'TimerBar',
    stageClass: 'lib-stage-timer',
    job:
      'A thin strip that drains as time runs out: white on the chips and the Shake Off prompt, two rows of the ' +
      "weather's type colours on the weather card, which holds its right end at the screen edge.",
    files: 'js/ui/lib/primitives/bar/bar.js, bar.css',
    tokens: ['color.text.label', 'color.type.*'],
    size: 'the screen sets its width: 2 px tall on a chip, 4 on the Shake Off prompt, 6 on the weather card',
    places: ['run.hud.chipTimer', 'run.hud.shakeOffTimer', 'run.map.weatherTimer'],
    states: [
      { id: 'chip', title: 'A chip (2 px, half left)', props: { fraction: 0.5, height: 2, style: timerStyle } },
      { id: 'prompt', title: 'Shake Off (4 px, most left)', props: { fraction: 0.8, height: 4, style: timerStyle } },
      {
        id: 'weather',
        title: 'The weather card (6 px, two colours, drains toward the right)',
        props: {
          fraction: 0.6,
          height: 6,
          light: weatherRamp.light,
          base: weatherRamp.base,
          drainsRight: true,
          style: timerStyle,
        },
      },
    ],
  };

  return [life, timer];
})();
