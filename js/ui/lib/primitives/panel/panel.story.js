/* ============ panel.story.js: the board's stories for the panels and the card (G.Lib.PanelStories; 155c) ============
 * Placeholder data only: what tools/library.html draws on Primitives, Panels. One entry per piece, every state it has
 * in the game. The game never loads this file. Place names follow screen.panel.part (UI Library v2 - Slice Opening.md).
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

  const pixel = {
    name: 'panel.pixel',
    component: 'PixelPanel',
    stageClass: 'lib-stage-panel',
    job:
      'The B2 roster box: corner bumps and a light / base / dark rim at 2 px per art pixel, a flat body, any even ' +
      'size. A type ramp rims a Pokemon; two ramps blend left to right for a dual type.',
    files: 'js/ui/lib/primitives/panel/panel.js, panel.css',
    tokens: ['color.hud.outline', 'color.hud.body', 'color.rim.rest', 'color.rim.fainted', 'color.type.*'],
    size: 'any even width and height (2 px per art pixel); the roster rows are 32 art rows tall',
    places: [
      'pause.pokemonDetail.statsBox',
      'pause.pokemonDetail.movesBox',
      'catch.window.pokemon',
      'catch.window.belt',
      'catch.window.owned',
      'main.shop.upgrades.pocket',
      'main.shop.pokeball.belt',
    ],
    states: [
      { id: 'rest', title: 'At rest (white rim)', props: pixelProps({ rim: ramp('color.rim.rest') }) },
      { id: 'type', title: 'Type rim (Fire)', props: pixelProps({ rim: ramp('color.type.fire') }) },
      {
        id: 'dualType',
        title: 'Two types blended (Fire to Water)',
        props: pixelProps({ rim: ramp('color.type.fire'), rimRight: ramp('color.type.water') }),
      },
      {
        id: 'lightBody',
        title: 'Lighter body (the Shop pockets)',
        props: pixelProps({ rim: ramp('color.type.grass'), body: G.Tokens.color('color.hud.checker') }),
      },
      { id: 'fainted', title: 'Fainted or locked (grey)', props: pixelProps({ rim: ramp('color.rim.fainted') }) },
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
  };

  // the card's button: the rounded one at the card's size, placed as the screens place it
  const cardButton = (label, extra) =>
    html`<div class="shop-card-buy" style=${{ ...panel.cardButtonPlace(), width: panel.CARD.buttonWidth + 'px' }}>
      <${button.RoundedButton}
        id=${'story-card-' + label}
        label=${label}
        artWidth=${panel.CARD.buttonArtWidth}
        artPixel=${panel.CARD.buttonArtPixel}
        rim=${button.REST_RIM}
        focusRim=${button.FOCUS_RIM}
        ...${extra || {}}
      />
    </div>`;
  const cardPicture = html`<div class="lib-card-picture"></div>`;
  const cardProps = (label, extra, buttonExtra) => ({
    picture: cardPicture,
    name: 'Great Ball',
    description: 'A good ball with a higher catch rate than a Poke Ball.',
    button: cardButton(label, buttonExtra),
    ...extra,
  });

  const card = {
    name: 'card.vertical',
    component: 'VerticalCard',
    stageClass: 'lib-stage-rounded lib-stage-card',
    job:
      'A thin panel holding a picture, a divider, a name, a description and one button at the bottom. Dimmed for ' +
      "something you cannot have yet; dimmed with its button lit when you can pay to unlock it. The screen hands it " +
      'the picture and the button.',
    files: 'js/ui/lib/primitives/panel/panel.js, panel.css',
    tokens: ['color.hud.teal', 'color.hud.checker', 'color.hud.slate', 'color.text.secondary', 'color.hud.body'],
    font: { name: 'font.game', size: '20 px text, 24 px lines' },
    size: '186 x 350 px by default (the Inventory passes a wider width); a 64 px picture; a 174 px button',
    places: ['main.shop.items.card', 'main.shop.pokeball.card', 'main.shop.tms.card', 'main.inventory.card'],
    states: [
      { id: 'lit', title: 'Lit', props: cardProps('Buy 300') },
      { id: 'dimmed', title: 'Dimmed (not unlocked yet)', props: cardProps('Unlock', { dimmed: true }) },
      {
        id: 'dimmedButtonLit',
        title: 'Dimmed, button lit (you can afford the unlock)',
        props: cardProps('Unlock 5k', { dimmed: true, buttonLit: true }),
      },
      {
        id: 'refusedButton',
        title: 'Its button refused (cannot afford)',
        props: cardProps('Buy 23k', {}, { refused: true }),
      },
    ],
  };

  const flat = {
    name: 'panel.flat',
    component: 'FlatPanel',
    stageClass: 'lib-stage-panel',
    job:
      "The windows' flat frame: the panel body, a 1 px frame and a 2 px outline. Screens with their own markup add " +
      'the panel-flat class (the EV screen keeps it without the outline).',
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
  };

  // card.horizontal: the run screen's size (140 x 32 art pixels at 2) and the Inventory's (120 at 3)
  const RUN_SLOT = { artWidth: 140, artPixel: 2 },
    INVENTORY_SLOT = { artWidth: 120, artPixel: 3 };
  const slotPicture = (artPixel) => {
    const size = panel.HORIZONTAL_CARD.iconArt * artPixel + 'px';
    return html`<div class="lib-card-picture" style=${{ width: size, height: size }}></div>`;
  };
  const SAMPLE_ITEM = { name: 'Quick Claw', text: 'Sometimes moves first: +10% speed for the holder.' };
  const slotProps = (size, item, extra) => ({
    ...size,
    item,
    picture: item ? slotPicture(size.artPixel) : null,
    ...extra,
  });
  const horizontal = {
    name: 'card.horizontal',
    component: 'HorizontalCard',
    stageClass: 'lib-stage-card-h',
    job:
      'The B2 run item box: the picture in a white patch on the left, the name in the top band, the text beside the ' +
      'patch (a live tracker in EXP blue). Empty for a slot with nothing in it; dimmed for one not bought yet.',
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
      { id: 'filled', title: 'Filled', props: slotProps(RUN_SLOT, SAMPLE_ITEM) },
      {
        id: 'live',
        title: 'A live tracker (EXP blue)',
        props: slotProps(RUN_SLOT, { name: 'Amulet Coin', text: '+1,240 coins this run', live: true }),
      },
      { id: 'empty', title: 'Empty', props: slotProps(RUN_SLOT, null) },
      { id: 'dimmed', title: 'Dimmed (not bought yet)', props: slotProps(RUN_SLOT, null, { dimmed: true }) },
      { id: 'large', title: "The Inventory's size", props: slotProps(INVENTORY_SLOT, SAMPLE_ITEM) },
    ],
  };

  // panel.slanted: a run HUD move slot (105 x 22 art pixels at 2 px) and the pause menu's pocket prompt (130 at 3 px)
  const MOVE_SLOT = { artWidth: 105, artRows: 22, artPixel: 2 },
    POCKET_HEADER = { artWidth: 130, artRows: 22, artPixel: 3 };
  const hudColour = (key) => G.Tokens.color('color.hud.' + key);
  const EMPTY_SLOT_RIM = { light: hudColour('checker'), base: hudColour('frame'), dark: hudColour('frame') };
  const slanted = {
    name: 'panel.slanted',
    component: 'SlantedPanel',
    stageClass: 'lib-stage-slanted-panel',
    job:
      "The move slot's frame (button.slanted's shape, not pressable): a rim ramp at both pointed ends and a body, " +
      'the slot grid or flat. The run HUD fills it with move wells; the pause menu writes the pocket prompt in it.',
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
        id: 'typeRim',
        title: "A move slot (its move's type rim, the slot grid)",
        props: { ...MOVE_SLOT, rim: G.Tokens.ramp('color.type.fire'), body: G.Lib.Pixels.PATTERNS.slotGrid },
      },
      {
        id: 'empty',
        title: 'An empty slot (dim rim, flat body)',
        props: { ...MOVE_SLOT, rim: EMPTY_SLOT_RIM, body: hudColour('body') },
      },
      {
        id: 'header',
        title: 'The pocket prompt (white rim, flat body, a line of text)',
        props: {
          ...POCKET_HEADER,
          rim: G.Tokens.ramp('color.rim.rest'),
          body: hudColour('body'),
          children: html`<span class="hud-text lib-slanted-text">Destroy Items in Pocket?</span>`,
        },
      },
    ],
  };

  return [pixel, thin, card, flat, horizontal, slanted];
})();
