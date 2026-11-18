/* ============ tokens.js: the UI library's design tokens (G.Tokens; #155 155a) ============
 * One home for the named values the UI is built from: colour palettes, fonts and the page's z-index layers. Each token
 * has a name (color.rim.focus.base, font.hudText, layer.tooltip), a value and a job. The game's code reads its values
 * from here (G.Tokens.color, ramp, typeTable); the library board (tools/library.html) shows every token by name.
 * Plan: docs/ASCII Concept Maps/155 - UI Library v2 Build Plan.md. Look and rules: docs/HUD-STYLE.md.
 * Loaded first (before js/core/util.js, which reads the type colours from here). Plain data and lookups, no game state,
 * so the harnesses load it in Node too; it writes the CSS variables only when there is a page.
 * A colour value may be another colour token's name (an alias): the token then always shows that token's colour.
 */
window.G = window.G || {};

G.Tokens = (() => {
  // ---------- colour palettes: [key, value or alias, job] ----------
  const COLOUR_PALETTES = [
    {
      id: 'hud',
      title: 'HUD kit',
      job: 'The base colours every HUD and menu piece is drawn with',
      source: 'HUD-STYLE "Panels and lines", "Text", "Bars"; js/ui/hud-kit.js PALETTE',
      colours: [
        ['outline', '#101010', 'Text outline, shape outlines'],
        ['body', '#181818', 'Panel body'],
        ['frame', '#212121', 'Panel frame'],
        ['checker', '#303030', 'The checker of the HP bar body'],
        ['slate', '#495151', 'Dividers, empty slots'],
        ['trackShade', '#464646', 'Empty track (dark bar)'],
        ['trackLight', '#7f7f7f', 'Empty track (light bar)'],
        ['typeBodyDark', '#292929', 'The B2 type checker body, dark square'],
        ['typeBodyLight', '#393939', 'The B2 type checker body, light square'],
        ['expFill', '#00baf3', 'EXP bar fill'],
        ['expShade', '#00799a', 'EXP bar shade'],
        ['lvFill', '#f3b200', 'Lv and gold fill'],
        ['lvShade', '#9a6110', 'Lv and gold shade'],
        ['lvDark', '#6d5000', 'The Lv yellow at 45%: the run item box corner shade'],
        ['cursor', '#fff000', 'Title yellow: the selection cursor'],
        ['trackEdge', '#313131', 'The roster HP track frame'],
        ['paperEdge', '#848484', 'The run item icon patch edge'],
        ['paper', '#e7e7e7', 'The run item icon patch'],
        ['teal', '#29ceff', "The menu windows' teal: card rims (panel.thin), the scroll thumb"],
      ],
    },
    {
      id: 'hp',
      title: 'HP bands',
      job: 'Life meters by how much HP is left: high over half, middle from a fifth to half, low under a fifth',
      source: 'HUD-STYLE "Life meters"; js/ui/hud-kit.js HP_COLOURS',
      colours: [
        ['high.fill', '#00fb49', 'HP over half, fill'],
        ['high.shade', '#008a28', 'HP over half, shade'],
        ['middle.fill', '#f3b200', 'HP from a fifth to half, fill'],
        ['middle.shade', '#9a6110', 'HP from a fifth to half, shade'],
        ['low.fill', '#fb3041', 'HP under a fifth, fill'],
        ['low.shade', '#922030', 'HP under a fifth, shade'],
      ],
    },
    {
      id: 'rim',
      title: 'Rims',
      job: 'Rim ramps (light, base, dark) for buttons, cards and belts',
      source: 'HUD-STYLE "Pause menu", "Roster rows", "Catch screen"; hud-kit.js, shop-balls.js',
      colours: [
        ['rest.light', '#ffffff', 'A menu button at rest, highlight'],
        ['rest.base', 'color.hud.paper', 'A menu button at rest'],
        ['rest.dark', 'color.hud.paperEdge', 'A menu button at rest, shade'],
        ['focus.light', '#9be895', 'The button under the cursor, highlight'],
        ['focus.base', '#38d030', 'The button under the cursor'],
        ['focus.dark', '#1d6c19', 'The button under the cursor, shade'],
        ['fainted.light', 'color.hud.trackLight', 'A fainted roster row, a locked belt, highlight'],
        ['fainted.base', 'color.hud.slate', 'A fainted roster row, a locked belt'],
        ['fainted.dark', 'color.hud.checker', 'A fainted roster row, a locked belt, shade'],
        ['sell.light', '#ff8a90', 'Sell under the cursor (Shop, Pokeballs tab), highlight'],
        ['sell.base', '#e8202a', 'Sell under the cursor (Shop, Pokeballs tab)'],
        ['sell.dark', '#7c1016', 'Sell under the cursor (Shop, Pokeballs tab), shade'],
        ['belt.light', '#DBB26E', 'A bought ball belt (the Poke Balls pocket colours), highlight'],
        ['belt.base', '#C88820', 'A bought ball belt (the Poke Balls pocket colours)'],
        ['belt.dark', '#825815', 'A bought ball belt (the Poke Balls pocket colours), shade'],
      ],
    },
    {
      id: 'scroll',
      title: 'Scroll bars',
      job: 'The scroll bar of the menu windows (the teal of the mockups)',
      source: 'js/ui/menu-window-kit.js SCROLL_COLOURS',
      colours: [
        ['track', 'color.hud.checker', 'Scroll track'],
        ['thumb', 'color.hud.teal', 'Scroll thumb'],
        ['thumbRim', 'color.scroll.thumb', 'Scroll thumb rim'],
      ],
    },
    {
      id: 'text',
      title: 'Text',
      job: "Text colours of the library's pieces",
      source: 'js/ui/lib/primitives/button/button.css and panel/panel.css (from the screens\' stylesheets, 155b, 155c)',
      colours: [
        ['label', '#ffffff', 'A button label'],
        ['labelRefused', 'rgba(255, 255, 255, 0.45)', 'The label of a button that refuses (#151): white at 45%'],
        ['secondary', '#8cfff7', "Secondary text: a card's name"],
      ],
    },
  ];

  // The 18 type colours: the Bulbapedia Scarlet/Violet palette (HUD-STYLE "Type colours", checked against that table by
  // tools/type_colors.js) as [base, light, dark]. Base for fills, projectiles and effects; Light for highlights and for
  // type-coloured text over the map (Base is too dark there for Ghost, Dark, Ground); Dark for shades and outlines.
  const TYPE_TONES = ['base', 'light', 'dark'];
  const TYPE_COLOURS = {
    normal: ['#9FA19F', '#C1C2C1', '#676967'],
    fire: ['#E62829', '#EF7374', '#961A1B'],
    water: ['#2980EF', '#74ACF5', '#1B539B'],
    grass: ['#3FA129', '#82C274', '#29691B'],
    electric: ['#FAC000', '#FCD659', '#A37D00'],
    ice: ['#3DCEF3', '#81DFF7', '#28869E'],
    fighting: ['#FF8000', '#FFAC59', '#A65300'],
    poison: ['#9141CB', '#B884DD', '#5E2A84'],
    ground: ['#915121', '#B88E6F', '#5E3515'],
    flying: ['#81B9EF', '#ADD2F5', '#54789B'],
    psychic: ['#EF4179', '#F584A8', '#9B2A4F'],
    bug: ['#91A119', '#B8C26A', '#5E6910'],
    rock: ['#AFA981', '#CBC7AD', '#726E54'],
    ghost: ['#704170', '#A284A2', '#492A49'],
    dragon: ['#5060E1', '#8D98EC', '#343E92'],
    dark: ['#624D4E', '#998B8C', '#403233'],
    steel: ['#60A1B8', '#98C2D1', '#3E6978'],
    fairy: ['#EF70EF', '#F5A2F5', '#9B499B'],
  };
  COLOUR_PALETTES.push({
    id: 'type',
    title: 'Type colours',
    job: 'The 18 Pokemon types: Base for fills, Light for highlights and text over the map, Dark for shades and outlines',
    source: 'HUD-STYLE "Type colours" (Bulbapedia Scarlet/Violet); read by js/core/util.js G.U.TYPE_COLOR',
    colours: Object.entries(TYPE_COLOURS).flatMap(([type, tones]) =>
      tones.map((value, index) => [type + '.' + TYPE_TONES[index], value, type + ', ' + TYPE_TONES[index]])
    ),
  });

  // ---------- fonts (HUD-STYLE "Fonts"): the face, its file, the sizes it is crisp at, and its job ----------
  // faceRules: the @font-face settings beyond the file, as the game's CSS declares them (the board declares each face
  // from here; smoke-ui-library checks the game's CSS loads the same file under the same family).
  const FONTS = [
    {
      name: 'font.hudText',
      family: 'HudText',
      file: 'assets/fonts/Truth-And-Ideals-10px.ttf',
      sizes: [20, 30, 40],
      job: 'Everything on or about a Pokemon: names, stats, HP, moves, labels. Body 20, headers 30, emphasis 40',
    },
    {
      name: 'font.hudDigits',
      family: 'HudDigits',
      file: 'assets/fonts/BoldPixels.ttf',
      sizes: [32, 48],
      job: 'Large display numbers: World Level, Lv',
    },
    {
      name: 'font.hudModule',
      family: 'HudModule',
      file: 'assets/fonts/Michroma-Regular.ttf',
      sizes: [],
      job: 'The game talking: module panels, titles, toasts. Smooth, any size',
    },
    {
      name: 'font.game',
      family: 'GameFont',
      file: 'assets/fonts/Silver-game.ttf',
      sizes: [20, 27.1429, 40.7143],
      faceRules: {
        fontWeight: '100 900',
        sizeAdjust: '140%',
        ascentOverride: '67%',
        descentOverride: '19%',
        lineGapOverride: '0%',
      },
      job: 'Tooltips (20) and the catch screen (crisp only at multiples of 13.5714: 27.1429 and 40.7143)',
    },
    {
      name: 'font.monogram',
      family: 'Monogram',
      file: 'assets/fonts/monogram-extended.ttf',
      sizes: [],
      faceRules: { fontWeight: '551 900' },
      job: 'Bold weights of the old menu text',
    },
    {
      name: 'font.pokeBW',
      family: 'PokeBW',
      file: 'assets/fonts/pokemon-b-w.ttf',
      sizes: [],
      job: 'Main Menu titles. Only 81 characters, so never in the HUD',
    },
    {
      name: 'font.michroma',
      family: 'Michroma',
      file: 'assets/fonts/Michroma-Regular.ttf',
      sizes: [],
      faceRules: { fontWeight: '400' },
      job: 'Main Menu text (the same file as HudModule)',
    },
  ];

  // ---------- z-index layers: the page-level stack, bottom to top, with today's numbers ----------
  // Pieces inside one panel stack with small local numbers (0 to 5) and are not layers. The CSS still writes the
  // numbers; it switches to these names in a later slice.
  const LAYERS = [
    { name: 'layer.hudOverlay', value: 5, job: 'The HTML HUD, above the game canvas', usedBy: '.hud-overlay' },
    {
      name: 'layer.runMenu',
      value: 15,
      job: 'Pause menu, End Run, EV screen',
      usedBy: '.pause-menu, .end-run, .ev-screen',
    },
    { name: 'layer.screen', value: 20, job: 'Every full screen (menus, Shop, Settings)', usedBy: '.scr' },
    { name: 'layer.confetti', value: 21, job: 'Confetti over a screen', usedBy: '.confetti-layer' },
    { name: 'layer.settings', value: 24, job: 'Settings over another screen', usedBy: '#scr-settings' },
    { name: 'layer.bars', value: 25, job: 'Main Menu top and bottom bars', usedBy: '.topbar, #botbar, .credits-line' },
    {
      name: 'layer.carry',
      value: 30,
      job: 'A dragged item; the sound panel',
      usedBy: '.shop-carry-ghost, .pm-carry-ghost, .sound-panel',
    },
    { name: 'layer.toast', value: 60, job: 'Toasts; the support screen', usedBy: '.toast, #scr-support' },
    { name: 'layer.ask', value: 62, job: 'The shared ask dialog (G.UI.ask)', usedBy: '#scr-ask' },
    { name: 'layer.legal', value: 65, job: 'The legal screen', usedBy: '#scr-legal' },
    { name: 'layer.layoutEditor', value: 66, job: 'The touch layout editor', usedBy: '#scr-layout' },
    { name: 'layer.boot', value: 70, job: 'The boot screen; invites', usedBy: '.boot, .invite-pop' },
    { name: 'layer.popup', value: 80, job: 'Achievement pop-ups; tap to start', usedBy: '.ach-pop, .tapstart' },
    { name: 'layer.noscript', value: 90, job: 'The no-script boot message', usedBy: '.boot.noscript' },
    {
      name: 'layer.rotate',
      value: 200,
      job: 'Rotate-your-phone; the old team sheet detail',
      usedBy: '#rotate, .sh-detail',
    },
    {
      name: 'layer.tooltip',
      value: 1000,
      job: 'The one tooltip layer, on top of everything',
      usedBy: '.hud-tip-layer',
    },
  ];

  // ---------- lookups ----------
  const colourByName = new Map();
  const palettes = COLOUR_PALETTES.map((palette) => ({
    id: palette.id,
    title: palette.title,
    job: palette.job,
    source: palette.source,
    colours: palette.colours.map(([key, value, job]) => {
      const token = { name: 'color.' + palette.id + '.' + key, key, value, job };
      colourByName.set(token.name, token);
      return token;
    }),
  }));
  const MAX_ALIAS_DEPTH = 8;
  /** A colour token's hex, following aliases. An unknown name is an error, so a typo fails loudly. */
  function color(name) {
    let token = colourByName.get(name);
    for (let depth = 0; token && depth < MAX_ALIAS_DEPTH; depth++) {
      if (!colourByName.has(token.value)) return token.value;
      token = colourByName.get(token.value);
    }
    throw new Error('[Tokens] no colour token named ' + name);
  }
  for (const palette of palettes) for (const token of palette.colours) token.hex = color(token.name);

  /** A rim ramp { light, base, dark } from the tokens under a name (color.rim.focus). */
  const ramp = (name) => ({ light: color(name + '.light'), base: color(name + '.base'), dark: color(name + '.dark') });
  /** One tone of the 18 type colours as { type: hex } (G.U.TYPE_COLOR and its Light and Dark tables). */
  function typeTable(tone) {
    const table = {};
    for (const type of Object.keys(TYPE_COLOURS)) table[type] = color('color.type.' + type + '.' + tone);
    return table;
  }

  // ---------- CSS variables: every colour and layer on :root (--color-rim-focus-base, --layer-tooltip) ----------
  const cssName = (name) => '--' + name.replace(/\./g, '-');
  if (typeof document !== 'undefined' && document.documentElement && document.documentElement.style) {
    const rootStyle = document.documentElement.style;
    for (const token of colourByName.values()) rootStyle.setProperty(cssName(token.name), token.hex);
    for (const layer of LAYERS) rootStyle.setProperty(cssName(layer.name), String(layer.value));
  }

  return { palettes, fonts: FONTS, layers: LAYERS, color, ramp, typeTable, cssName };
})();
