/* ============ modal.story.js: the board's stories for the dialog (G.Lib.ModalStories; #155) ============
 * Placeholder text only: what tools/library.html draws on Primitives, Modal. The game never loads this file. Each
 * piece shows its states as tiles and its props in a table (decision 2026-11-18-155-primitive-states-vs-props).
 */
G.Lib = G.Lib || {};
G.Lib.ModalStories = (() => {
  const modal = G.Lib.Modal;
  if (!modal || !modal.ready) return [];
  const sample = (focus) => ({
    title: 'Buy TM',
    message: 'Spend 7,000 PokéCoins on TM Thunderbolt?',
    note: 'You will have 2,000 left.',
    buttons: [
      { key: 'ok', label: 'Buy' },
      { key: 'no', label: 'Cancel' },
    ],
    focus,
  });
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
      { id: 'focusConfirm', title: 'Confirm green (as it opens)', props: sample(0) },
      { id: 'focusCancel', title: 'Cancel green (after Right, or the mouse)', props: sample(1) },
    ],
    props: [
      { name: 'title', values: 'text', does: 'The heading' },
      { name: 'message', values: 'text', does: 'The question; it wraps' },
      { name: 'note', values: 'text, or none', does: 'A second line (what you will have left)' },
      {
        name: 'buttons',
        values: '[{ key, label, elementId }], one or two',
        does: 'The answers: one for a notice (noCancel), two for a question',
      },
      { name: 'focus', values: 'a button index', does: 'Shows those states (above)' },
      { name: 'onPress, onHover', values: 'functions', does: 'A button pressed; the mouse over a button' },
      {
        name: 'partIds',
        values: '{ title, message, note }',
        does: "Ids for the parts (the smokes' ask-title, ask-msg, ask-note)",
      },
    ],
  };

  return [dialog];
})();
