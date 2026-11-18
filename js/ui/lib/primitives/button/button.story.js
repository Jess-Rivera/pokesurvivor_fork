/* ============ button.story.js: the board's stories for the buttons (G.Lib.ButtonStories; #155 155b) ============
 * Placeholder data only: what tools/library.html draws on Primitives, Buttons. One entry per button, every state it has
 * in the game. The game never loads this file. Place names follow screen.panel.part (UI Library v2 - Slice Opening.md).
 */
G.Lib = G.Lib || {};
G.Lib.ButtonStories = (() => {
  const button = G.Lib.Button;
  if (!button || !button.ready) return [];
  const MENU_ART_PIXEL = 3, // the Main Menu windows' team button (54 px tall)
    CARD_BUTTON_ART_WIDTH = 58, // the item cards' button: 174 px
    ANSWER_ART_WIDTH = 56; // the pause menu's End and No: 168 px
  const roundedProps = (id, label, extra) => ({
    id,
    label,
    artWidth: CARD_BUTTON_ART_WIDTH,
    artPixel: MENU_ART_PIXEL,
    rim: button.REST_RIM,
    focusRim: button.FOCUS_RIM,
    ...extra,
  });

  const slanted = {
    name: 'button.slanted',
    component: 'SlantedButton',
    stageClass: 'lib-stage-slanted',
    job:
      "The run screen's move slot shape at 1.5x, for the run screens' menus. White rim at rest, green under the " +
      'cursor; a screen may give its own rims and a focused body (the End and No answers keep their rim and darken ' +
      'the body).',
    files: 'js/ui/lib/primitives/button/button.js, button.css',
    tokens: ['color.hud.outline', 'color.hud.body', 'color.rim.rest', 'color.rim.focus', 'color.text.label'],
    font: { name: 'font.hudText', size: '30 px' },
    size: '315 x 66 px by default (105 x 22 art pixels at 3 px); End and No are 168 x 66',
    places: [
      'pause.menu.resume',
      'pause.menu.settings',
      'pause.review.back',
      'pause.endAsk.end',
      'pause.endAsk.no',
      'pause.pocketAsk.destroy',
      'pause.pocketAsk.no',
      'endRun.menu.review',
      'endRun.menu.learn',
      'endRun.menu.home',
      'ev.menu.learn',
      'ev.menu.goHome',
    ],
    states: [
      { id: 'rest', title: 'At rest', props: { id: 'story-slanted-rest', label: 'Resume' } },
      { id: 'focused', title: 'Focused', props: { id: 'story-slanted-focused', label: 'Settings', focused: true } },
      {
        id: 'focusedOwnRim',
        title: 'Focused, own rim and body (No)',
        props: {
          id: 'story-slanted-own-rim',
          label: 'No',
          artWidth: ANSWER_ART_WIDTH,
          focused: true,
          focusRim: button.REST_RIM,
          focusBody: button.REST_RIM.dark,
        },
      },
    ],
  };

  const rounded = {
    name: 'button.rounded',
    component: 'RoundedButton',
    stageClass: 'lib-stage-rounded',
    job:
      "The team menu's button, for the catch screen and the Main Menu windows. Disabled cannot be pressed (the " +
      'screen dims it); refused takes the press but only says why, keeping its rim with the label at 45%.',
    files: 'js/ui/lib/primitives/button/button.js, button.css',
    tokens: [
      'color.hud.outline',
      'color.hud.body',
      'color.rim.rest',
      'color.rim.focus',
      'color.text.label',
      'color.text.labelRefused',
    ],
    font: { name: 'font.game', size: "27.1429 px, placed the Shop's way here (each screen places its label)" },
    size: 'art width x 18 rows at 3 px (Main Menu windows, 54 px tall) or 4 px (catch screen); card buttons are 174 px',
    places: [
      'catch.menu.throw',
      'catch.menu.letGo',
      'main.shop.exit',
      'main.shop.inventory',
      'main.shop.pokeball.sellButton',
      'main.shop.pokeball.beltBuy',
      'main.shop.upgrades.buyButton',
      'main.inventory.shop',
      'main.inventory.exit',
    ],
    states: [
      { id: 'rest', title: 'At rest', props: roundedProps('story-rounded-rest', 'Exit') },
      { id: 'focused', title: 'Focused', props: roundedProps('story-rounded-focused', 'Buy 9k', { focused: true }) },
      { id: 'refused', title: 'Refused', props: roundedProps('story-rounded-refused', 'Buy 23k', { refused: true }) },
      { id: 'disabled', title: 'Disabled', props: roundedProps('story-rounded-disabled', 'Equip', { disabled: true }) },
    ],
  };

  return [slanted, rounded];
})();
