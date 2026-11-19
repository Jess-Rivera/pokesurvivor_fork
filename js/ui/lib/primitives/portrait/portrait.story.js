/* ============ portrait.story.js: the board's stories for the portrait (G.Lib.PortraitStories; #155) ============
 * A real portrait (Pikachu) from assets/pokemon, read from the board's folder (tools/). The game never loads this file.
 * Each piece shows its states as tiles and its props in a table (decision 2026-11-18-155-primitive-states-vs-props).
 */
G.Lib = G.Lib || {};
G.Lib.PortraitStories = (() => {
  const portrait = G.Lib.Portrait;
  if (!portrait || !portrait.ready) return [];
  // a leader circle's numbers (48 px, a 4 px stroke) for every state
  const PIKACHU = { src: '../../assets/pokemon/25/Portrait.png', dex: 25, size: 48, stroke: 4 };

  const round = {
    name: 'portrait.round',
    component: 'RoundPortrait',
    stageClass: 'lib-stage-portrait',
    job:
      "A Pokemon's face in a circle with a stroke in a rim colour. With a ring (the EXP ring) it sits inside a band " +
      'that fills clockwise from the top.',
    files: "js/ui/lib/primitives/portrait/portrait.js, portrait.css; which file to load: the kit's portraitSource",
    tokens: ['color.hud.outline', 'color.hud.expFill', 'color.hud.trackLight', 'color.type.*'],
    size: 'the screen sets it: 116 px with the ring, 48 px leader circles and owned faces, 44 px roster faces',
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
      { id: 'rest', title: 'At rest (the dark stroke)', props: PIKACHU },
      {
        id: 'active',
        title: "Active: the one out now (its type's rim)",
        props: { ...PIKACHU, rim: G.Tokens.color('color.type.electric.base') },
      },
      { id: 'fainted', title: 'Fainted (darkly dimmed)', props: { ...PIKACHU, fainted: true } },
    ],
    props: [
      { name: 'size', values: 'px across', does: "Its size: 116 with the ring, 48, 44; or the screen's CSS sizes it" },
      {
        name: 'stroke',
        values: 'px (2 by default)',
        does: 'The stroke around the face: 4 on the leader circles and ringed faces, 2 elsewhere',
      },
      {
        name: 'rim',
        values: 'a colour (the outline by default)',
        does: "The stroke's colour: a type colour when active, the light grey of the catch and TMs faces",
      },
      {
        name: 'ring',
        values: '{ fraction, fill, track }, or none',
        does: 'The EXP ring: a band around the face, filled clockwise to fraction',
      },
      {
        name: 'src, dex, onError, lazy',
        values: 'an address, a dex number, a function, true or false',
        does: "Which face (a shiny is a different address); the kit's fallback; load it lazily",
      },
      { name: 'fainted', values: 'true or false', does: 'Shows the fainted state (above)' },
      {
        name: 'className, faceClass, ringClass, style, attrs, children',
        values: 'classes, place, attributes, content',
        does: "The screen's classes and place; a cursor on top",
      },
    ],
  };

  return [round];
})();
