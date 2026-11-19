/* ============ panel.story.js: the board's stories for the panels and the cards (G.Lib.PanelStories; #155) ============
 * Placeholder data only: what tools/library.html draws on Primitives, Panels. The game never loads this file.
 * Each piece shows its states as tiles and its props in a table (decision 2026-11-18-155-primitive-states-vs-props).
 */
G.Lib = G.Lib || {};
G.Lib.PanelStories = (() => {
  const panel = G.Lib.Panel,
    button = G.Lib.Button;
  if (!panel || !panel.ready || !button || !button.ready) return [];
  const html = window.htm.bind(window.preact.h);
  const ramp = (name) => G.Tokens.ramp(name);
  const SAMPLE_PANEL = { width: 240, height: 120 }; // even sizes: the pixel panel draws at 2 px per art pixel
  const title = (text) => html`<span class="hud-text" style=${{ left: '16px', top: '16px' }}>${text}</span>`;
  const pixelProps = (extra) => ({ left: 0, top: 0, ...SAMPLE_PANEL, children: title('Panel'), ...extra });
  const placeProps = {
    name: 'className, style, attrs, children',
    values: 'class, size and place, attributes, content',
    does: "The screen's class, size and place; what goes inside",
  };

  const pixel = {
    name: 'panel.pixel',
    component: 'PixelPanel',
    stageClass: 'lib-stage-panel',
    job:
      'The B2 roster box: corner bumps and a light / base / dark rim at 2 px per art pixel, a flat body, any even ' +
      'size.',
    files: 'js/ui/lib/primitives/panel/panel.js, panel.css',
    tokens: ['color.hud.outline', 'color.hud.body', 'color.rim.rest', 'color.rim.fainted', 'color.type.*'],
    size: 'any even width and height (2 px per art pixel)',
    places: [
      'pause.pokemonDetail.statsBox',
      'pause.pokemonDetail.movesBox',
      'catch.window.pokemon',
      'catch.window.belt',
      'main.shop.upgrades.pocket',
      'main.shop.pokeball.belt',
    ],
    states: [
      { id: 'rest', title: 'At rest', props: pixelProps({ rim: ramp('color.rim.rest') }) },
      {
        id: 'fainted',
        title: 'Fainted or locked (the grey rim)',
        props: pixelProps({ rim: ramp('color.rim.fainted') }),
      },
    ],
    props: [
      { name: 'width, height', values: 'px, even', does: 'Its size' },
      { name: 'left, top', values: 'px', does: 'Its place in the screen' },
      {
        name: 'rim',
        values: 'a rim ramp',
        does: "The rim: white, grey (fainted, locked), a Pokemon type's ramp (the pause detail), a pocket's colour",
      },
      {
        name: 'rimRight',
        values: 'a rim ramp, or none',
        does: 'A second ramp: the rim blends left to right (a dual type)',
      },
      {
        name: 'body',
        values: 'a colour (the panel body by default)',
        does: "The inside: lighter on the Shop's pocket cards",
      },
      { name: 'className, children', values: 'class, content', does: "The screen's class; what goes inside" },
    ],
  };

  const thin = {
    name: 'panel.thin',
    component: 'ThinPanel',
    stageClass: 'lib-stage-panel',
    job: "A 2 px flat teal rim on the checker body: the menu windows' cards (card.vertical is built on it).",
    files: 'js/ui/lib/primitives/panel/panel.js, panel.css',
    tokens: ['color.hud.teal', 'color.hud.checker'],
    size: 'any size; the screen sets it',
    places: ['main.shop.items.card', 'main.shop.pokeball.card', 'main.shop.tms.card', 'main.inventory.card'],
    states: [{ id: 'rest', title: 'At rest', props: { style: { width: '186px', height: '120px' } } }],
    props: [placeProps],
  };

  // the card's button: the rounded one at the card's size, placed as the screens place it
  const cardButton = (label) =>
    html`<div class="shop-card-buy" style=${{ ...panel.cardButtonPlace(), width: panel.CARD.buttonWidth + 'px' }}>
      <${button.RoundedButton}
        id=${'story-card-' + label}
        label=${label}
        artWidth=${panel.CARD.buttonArtWidth}
        artPixel=${panel.CARD.buttonArtPixel}
        rim=${button.REST_RIM}
        focusRim=${button.FOCUS_RIM}
      />
    </div>`;
  const cardProps = (label, extra) => ({
    picture: html`<div class="lib-card-picture"></div>`,
    name: 'Great Ball',
    description: 'A good ball with a higher catch rate than a Poke Ball.',
    button: cardButton(label),
    ...extra,
  });
  const card = {
    name: 'card.vertical',
    component: 'VerticalCard',
    stageClass: 'lib-stage-rounded lib-stage-card',
    job:
      'A thin panel holding a picture, a divider, a name, a description and one button at the bottom. The screen ' +
      'hands it the picture and the button (the button shows its own states).',
    files: 'js/ui/lib/primitives/panel/panel.js, panel.css',
    tokens: ['color.hud.teal', 'color.hud.checker', 'color.hud.slate', 'color.text.secondary', 'color.hud.body'],
    font: { name: 'font.game', size: '20 px text, 24 px lines' },
    size: '186 x 350 px by default; a 64 px picture; a 174 px button',
    places: ['main.shop.items.card', 'main.shop.pokeball.card', 'main.shop.tms.card', 'main.inventory.card'],
    states: [
      { id: 'lit', title: 'Lit', props: cardProps('Buy 300') },
      { id: 'dimmed', title: 'Dimmed (not unlocked yet)', props: cardProps('Unlock', { dimmed: true }) },
      {
        id: 'dimmedButtonLit',
        title: 'Dimmed, its button lit (you can afford the unlock)',
        props: cardProps('Unlock 5k', { dimmed: true, buttonLit: true }),
      },
    ],
    props: [
      { name: 'width', values: 'px (186 by default)', does: 'Its width (the Inventory passes a wider one)' },
      { name: 'picture', values: 'content', does: 'What the picture box shows: an item icon, a ball sprite' },
      { name: 'name, description', values: 'text', does: 'The two lines of text' },
      { name: 'button', values: 'content', does: 'Its one button, placed with cardButtonPlace (class shop-card-buy)' },
      { name: 'dimmed, buttonLit', values: 'true or false', does: 'Shows those states (above)' },
      { name: 'attrs', values: 'attributes', does: "The screen's item id and the cursor's whole-card mark" },
    ],
  };

  const flat = {
    name: 'panel.flat',
    component: 'FlatPanel',
    stageClass: 'lib-stage-panel',
    job:
      "The windows' flat frame: the panel body, a 1 px frame and a 2 px outline. Screens with their own markup add " +
      'the panel-flat class.',
    files: 'js/ui/lib/primitives/panel/panel.js, panel.css',
    tokens: ['color.hud.body', 'color.hud.frame', 'color.hud.outline'],
    size: 'any size; the screen sets it',
    places: [
      'pause.runInfo',
      'pause.pokemonDetail',
      'main.shop.window',
      'main.inventory.window',
      'catch.window',
      'ev.panel',
    ],
    states: [
      {
        id: 'rest',
        title: 'At rest',
        props: { style: { width: '240px', height: '120px', position: 'relative' }, children: title('Run Info') },
      },
    ],
    props: [placeProps],
  };

  // card.horizontal at the run screen's size (140 x 32 art pixels at 2)
  const RUN_SLOT = { artWidth: 140, artPixel: 2 };
  const slotPicture = (artPixel) => {
    const size = panel.HORIZONTAL_CARD.iconArt * artPixel + 'px';
    return html`<div class="lib-card-picture" style=${{ width: size, height: size }}></div>`;
  };
  const SAMPLE_ITEM = { name: 'Quick Claw', text: 'Sometimes moves first: +10% speed for the holder.' };
  const slotProps = (item, extra) => ({
    ...RUN_SLOT,
    item,
    picture: item ? slotPicture(RUN_SLOT.artPixel) : null,
    ...extra,
  });
  const horizontal = {
    name: 'card.horizontal',
    component: 'HorizontalCard',
    stageClass: 'lib-stage-card-h',
    job:
      'The B2 run item box: the picture in a white patch on the left, the name in the top band, the text beside the ' +
      'patch. A team item slot.',
    files: 'js/ui/lib/primitives/panel/panel.js, panel.css',
    tokens: [
      'color.hud.outline',
      'color.hud.lvFill',
      'color.hud.lvShade',
      'color.hud.lvDark',
      'color.hud.paper',
      'color.hud.paperEdge',
      'color.hud.expFill',
    ],
    font: { name: 'font.hudText', size: '20 px (30 px name in the Inventory)' },
    size: 'artWidth x 32 art rows: 280 x 64 on the run screen (140 at 2 px), 360 x 96 in the Inventory (120 at 3 px)',
    places: ['run.hud.runItem', 'main.inventory.slot'],
    states: [
      { id: 'filled', title: 'Filled', props: slotProps(SAMPLE_ITEM) },
      { id: 'empty', title: 'Empty', props: slotProps(null) },
      { id: 'dimmed', title: 'Dimmed (not bought yet)', props: slotProps(null, { dimmed: true }) },
    ],
    props: [
      {
        name: 'artWidth, artPixel',
        values: 'art pixels, px per art pixel',
        does: 'Its size: 140 at 2 on the run screen, 120 at 3 in the Inventory',
      },
      {
        name: 'item',
        values: '{ name, text, live } or none',
        does: 'What it holds; live draws the text as a live tracker, in EXP blue',
      },
      { name: 'picture', values: 'content', does: "The item's icon in the white patch" },
      { name: 'dimmed', values: 'true or false', does: 'Shows the dimmed state (above)' },
      {
        name: 'className, style, attrs, overlay',
        values: 'class, place, attributes, content',
        does: "The screen's class and place; a cursor on top",
      },
    ],
  };

  // panel.slanted: a run HUD move slot (105 x 22 art pixels at 2 px)
  const slanted = {
    name: 'panel.slanted',
    component: 'SlantedPanel',
    stageClass: 'lib-stage-slanted-panel',
    job:
      "The move slot's frame (button.slanted's shape, not pressable): a rim ramp at both pointed ends and a body. " +
      'The run HUD fills it with move wells; the pause menu writes the pocket prompt in it.',
    files: 'js/ui/lib/primitives/panel/panel.js, panel.css',
    tokens: [
      'color.hud.outline',
      'color.hud.body',
      'color.hud.checker',
      'color.hud.frame',
      'color.rim.rest',
      'color.type.*',
    ],
    size: 'any size: 210 x 44 px for a move slot (2 px art pixels), 390 x 66 px for the pocket prompt (3 px)',
    places: ['run.hud.moveSlot', 'pause.pocketAsk.header'],
    states: [
      {
        id: 'rest',
        title: 'At rest',
        props: {
          artWidth: 105,
          artRows: 22,
          artPixel: 2,
          rim: ramp('color.rim.rest'),
          body: G.Lib.Pixels.PATTERNS.slotGrid,
        },
      },
    ],
    props: [
      {
        name: 'artWidth, artRows, artPixel',
        values: 'art pixels, px per art pixel',
        does: 'Its size: 105 x 22 at 2 for a move slot, 130 x 22 at 3 for the pocket prompt',
      },
      { name: 'rim', values: 'a rim ramp', does: "The rim: a move's type, the dim empty rim, white" },
      {
        name: 'body',
        values: 'a colour or a pattern',
        does: 'The inside: the slot grid for a move, flat for an empty slot or the prompt',
      },
      {
        name: 'className, style, children',
        values: 'class, place, content',
        does: "The screen's class and place; the wells or the prompt's text",
      },
    ],
  };

  return [pixel, thin, card, flat, horizontal, slanted];
})();
