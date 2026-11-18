/* ============ portrait.story.js: the board's stories for the portrait (G.Lib.PortraitStories; 155c-5) ============
 * Real portraits (Pikachu, and its shiny) from assets/pokemon, read from the board's folder (tools/). The game never
 * loads this file. Place names follow screen.panel.part.
 */
G.Lib = G.Lib || {};
G.Lib.PortraitStories = (() => {
  const portrait = G.Lib.Portrait;
  if (!portrait || !portrait.ready) return [];
  const PORTRAITS = '../assets/pokemon/';
  const face = (dex, shiny) => ({ src: PORTRAITS + dex + (shiny ? '/s' : '') + '/Portrait.png', dex });
  const PIKACHU = face(25, false);
  // the sizes the game draws them at: the character panel and pause detail (with the ring), the boss circles, the
  // roster cards, the catch and TMs owned faces (a 56 px cell less 4 px each side)
  const SIZES = { exp: 116, leader: 48, roster: 44, owned: 48 },
    STROKES = { exp: 4, leader: 4, roster: 2, owned: 2 };
  const leader = (extra) => ({ ...PIKACHU, size: SIZES.leader, stroke: STROKES.leader, ...extra });

  const round = {
    name: 'portrait.round',
    component: 'RoundPortrait',
    stageClass: 'lib-stage-portrait',
    job:
      "A Pokemon's face in a circle with a stroke in a rim colour; dimmed when fainted. With a ring (the EXP ring) " +
      'it sits inside a band that fills clockwise from the top.',
    files: 'js/ui/lib/primitives/portrait/portrait.js, portrait.css; which file to load: the kit\'s portraitSource',
    tokens: ['color.hud.outline', 'color.hud.expFill', 'color.hud.trackLight', 'color.type.*'],
    size: '116 px with the ring (an 80 px face), 48 px leader circles, 44 px roster faces, 48 px owned faces',
    places: [
      'run.hud.portrait',
      'pause.pokemonDetail.portrait',
      'run.boss.leaderCircle',
      'run.hud.teamSlot.face',
      'pause.team.face',
      'catch.window.ownedFace',
      'main.shop.tms.face',
    ],
    states: [
      {
        id: 'exp',
        title: 'With the EXP ring (60%)',
        props: { ...PIKACHU, size: SIZES.exp, stroke: STROKES.exp, ring: { fraction: 0.6 } },
      },
      { id: 'leader', title: 'A leader circle', props: leader() },
      {
        id: 'leaderActive',
        title: "The leader out now (its type's rim)",
        props: leader({ rim: G.Tokens.color('color.type.electric.base') }),
      },
      { id: 'leaderFainted', title: 'A fainted leader', props: leader({ fainted: true }) },
      { id: 'roster', title: 'A roster face', props: { ...PIKACHU, size: SIZES.roster, stroke: STROKES.roster } },
      {
        id: 'owned',
        title: 'An owned face (the catch screen, the TMs tab)',
        props: {
          ...PIKACHU,
          size: SIZES.owned,
          stroke: STROKES.owned,
          rim: G.Tokens.color('color.type.normal.light'),
        },
      },
      { id: 'shiny', title: 'A shiny', props: { ...face(25, true), size: SIZES.roster, stroke: STROKES.roster } },
    ],
  };

  return [round];
})();
