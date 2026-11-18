/* ============ button.story.js: the board's stories for the buttons (G.Lib.ButtonStories; #155) ============
 * Placeholder data only: what tools/library.html draws on Primitives, Buttons. The game never loads this file.
 * Each piece shows its states as tiles and its props in a table (decision 2026-11-18-155-primitive-states-vs-props): a
 * state is a condition the piece shows; a prop is how a screen sets it up. Place names follow screen.panel.part.
 */
G.Lib = G.Lib || {};
G.Lib.ButtonStories = (() => {
  const button = G.Lib.Button;
  if (!button || !button.ready) return [];
  const MENU_ART_PIXEL = 3, // the Main Menu windows' rounded button (54 px tall)
    CARD_BUTTON_ART_WIDTH = 58, // the item cards' button: 174 px
    ANSWER_ART_WIDTH = 56; // the pause menu's End and No: 168 px
  // the red rim the game gives a button that takes something away (Sell, Let It Go, End, Destroy); its token is still
  // named color.rim.sell until the colour pass names the rims by look
  const RED_RIM = G.Tokens.ramp('color.rim.sell');
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
      "The run screen's move slot shape at 1.5x, for the run screens' menus: Resume, Settings, End Run, the answers.",
    files: 'js/ui/lib/primitives/button/button.js, button.css',
    tokens: [
      'color.hud.outline',
      'color.hud.body',
      'color.rim.rest',
      'color.rim.focus',
      'color.rim.sell',
      'color.text.label',
    ],
    font: { name: 'font.hudText', size: '30 px' },
    size: '315 x 66 px by default (105 x 22 art pixels at 3 px)',
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
      {
        id: 'focusPositive',
        title: 'Under the cursor (green rim)',
        props: { id: 'story-slanted-focus-positive', label: 'Settings', focused: true },
      },
      {
        id: 'focusNegative',
        title: 'Under the cursor, ending or destroying something (its red rim kept, the body its dark shade)',
        props: {
          id: 'story-slanted-focus-negative',
          label: 'End',
          artWidth: ANSWER_ART_WIDTH,
          focused: true,
          rim: RED_RIM,
          focusRim: RED_RIM,
          focusBody: RED_RIM.dark,
        },
      },
    ],
    props: [
      { name: 'label', values: 'text', does: 'The words on the button' },
      {
        name: 'artWidth',
        values: 'art pixels (105 by default)',
        does: 'Its width at 3 px per art pixel (56 for End and No)',
      },
      {
        name: 'rim',
        values: 'a rim ramp (white by default)',
        does: "The rim at rest: red for End and Destroy, grey for the pocket prompt's No",
      },
      { name: 'focusRim', values: 'a rim ramp (green by default)', does: 'The rim under the cursor' },
      { name: 'focusBody', values: 'a colour', does: "The body under the cursor (an answer's dark shade)" },
      { name: 'focused', values: 'true or false', does: 'Shows the focus state (the screen moves the cursor)' },
      {
        name: 'id, onPress, onEnter',
        values: 'a name, functions',
        does: 'Its action name; a click; the mouse coming over it',
      },
    ],
  };

  const rounded = {
    name: 'button.rounded',
    component: 'RoundedButton',
    stageClass: 'lib-stage-rounded',
    job:
      "The B/W bag button, for the catch screen and the Main Menu windows. Named by intent: positive moves forward " +
      'or buys, negative takes something away.',
    files: 'js/ui/lib/primitives/button/button.js, button.css',
    tokens: [
      'color.hud.outline',
      'color.hud.body',
      'color.rim.rest',
      'color.rim.focus',
      'color.rim.sell',
      'color.text.label',
      'color.text.labelRefused',
    ],
    font: { name: 'font.game', size: "27.1429 px, placed the Shop's way here (each screen places its label)" },
    size: 'art width x 18 rows at 3 px (54 px tall) or 4 px (the catch screen)',
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
    // named by intent (Jess 2026-11-18)
    states: [
      { id: 'rest', title: 'At rest', props: roundedProps('story-rounded-rest', 'Exit') },
      {
        id: 'focusPositive',
        title: 'Under the cursor (Buy, Throw, Exit)',
        props: roundedProps('story-rounded-focus-positive', 'Buy 9k', { focused: true }),
      },
      {
        id: 'focusNegative',
        title: 'Under the cursor, taking something away (Sell, Let It Go)',
        props: roundedProps('story-rounded-focus-negative', 'Sell Pokeball', {
          artWidth: 62,
          focused: true,
          focusRim: G.Tokens.ramp('color.rim.sell'),
        }),
      },
      {
        id: 'refused',
        title: 'Refused (cannot afford), at rest',
        props: roundedProps('story-rounded-refused', 'Buy 23k', { refused: true }),
      },
      {
        id: 'refusedFocus',
        title: 'Refused, under the cursor (#151: it still takes the cursor)',
        props: roundedProps('story-rounded-refused-focus', 'Buy 23k', { refused: true, focused: true }),
      },
      {
        id: 'disabled',
        title: 'Disabled (cannot be pressed)',
        props: roundedProps('story-rounded-disabled', 'Equip', { disabled: true }),
      },
    ],
    props: [
      { name: 'label', values: 'text', does: 'The words on the button (the screen places and sizes them)' },
      { name: 'artWidth', values: 'art pixels', does: 'Its width' },
      {
        name: 'artPixel',
        values: '3 or 4 (4 by default)',
        does: 'Screen pixels per art pixel: 3 in the menu windows, 4 on the catch screen',
      },
      { name: 'rim', values: 'a rim ramp', does: 'The rim at rest' },
      {
        name: 'focusRim',
        values: 'a rim ramp',
        does: 'The rim under the cursor: green, or red for Sell and Let It Go',
      },
      {
        name: 'body, focusBody',
        values: 'colours (the panel body by default)',
        does: 'The body at rest and under the cursor',
      },
      { name: 'focused, refused, disabled', values: 'true or false', does: 'Shows those states (above)' },
      {
        name: 'id, onPress, onEnter',
        values: 'a name, functions',
        does: 'Its action name; a click; the mouse coming over it',
      },
    ],
  };

  return [slanted, rounded];
})();
