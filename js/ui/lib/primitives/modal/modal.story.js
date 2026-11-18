/* ============ modal.story.js: the board's stories for the dialog (G.Lib.ModalStories; #155 155c-4) ============
 * Placeholder text only: what tools/library.html draws on Primitives, Modal. The game never loads this file. Place
 * names follow screen.panel.part.
 */
G.Lib = G.Lib || {};
G.Lib.ModalStories = (() => {
  const modal = G.Lib.Modal;
  if (!modal || !modal.ready) return [];
  const twoButtons = (ok, cancel) => [
    { key: 'ok', label: ok },
    { key: 'no', label: cancel },
  ];
  const dialog = {
    name: 'modal.dialog',
    component: 'ModalDialog',
    stageClass: 'lib-stage-modal',
    job:
      'The game asking you something: a flat window with a title, the question, an optional note and one or two ' +
      'buttons. The green one is what Enter or Space presses; arrows and the mouse move it; Esc cancels.',
    files: 'js/ui/lib/primitives/modal/modal.js, modal.css; the asking: js/ui/ui.js G.UI.ask',
    tokens: [
      'color.hud.body',
      'color.hud.frame',
      'color.hud.outline',
      'color.text.label',
      'color.text.secondary',
      'color.rim.rest',
      'color.rim.focus',
    ],
    font: { name: 'font.hudModule', size: '30 px title; font.game 27.1429 px message and buttons, 20 px note' },
    size: '720 px wide on the 1920 x 1080 menu stage; buttons 186 x 54 px, 24 px apart',
    places: [
      'main.shop.buyAsk',
      'main.team.sellAsk',
      'main.team.unsavedAsk',
      'catch.letGoAsk',
      'ev.goHomeAsk',
      'main.newSaveNotice',
    ],
    states: [
      {
        id: 'confirm',
        title: 'Confirm green',
        props: {
          title: 'Sell Pokémon',
          message: 'Sell Pikachu for 300 PokéCoins?',
          buttons: twoButtons('Sell', 'Cancel'),
        },
      },
      {
        id: 'withNote',
        title: "With a note (the Shop's buy ask)",
        props: {
          title: 'Buy TM',
          message: 'Spend 7,000 PokéCoins on TM Thunderbolt?',
          note: 'You will have 2,000 left.',
          buttons: twoButtons('Buy', 'Cancel'),
        },
      },
      {
        id: 'cancelFocused',
        title: 'Cancel green (after Right, or the mouse)',
        props: {
          title: 'Unsaved team',
          message: 'Leave without saving your team?',
          buttons: twoButtons('Discard', 'Keep editing'),
          focus: 1,
        },
      },
      {
        id: 'notice',
        title: 'A notice (one button)',
        props: {
          title: 'New save needed',
          message: 'This version needs a new save. Your old one was kept.',
          buttons: [{ key: 'ok', label: 'OK' }],
        },
      },
      {
        id: 'longMessage',
        title: 'A long message wraps',
        props: {
          title: 'Let it go?',
          message:
            'Let this Pokemon go? It will run off and you will not see it again this run. Your Poke Balls stay on ' +
            'your belt.',
          buttons: twoButtons('Let it go', 'Keep trying'),
        },
      },
    ],
  };

  return [dialog];
})();
