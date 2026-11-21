/* ============ modal.story.js: the board's stories for the dialog (G.Lib.ModalStories; #155) ============
 * Placeholder text only (rebuilt for the clean dialog, #128 catch.window): what tools/library.html draws on Primitives, Modal. The game never loads this file. Each
 * piece shows its states as tiles and its props in a table (decision 2026-11-18-155-primitive-states-vs-props).
 */
G.Lib = G.Lib || {};
G.Lib.ModalStories = (() => {
  const modal = G.Lib.Modal;
  if (!modal || !modal.ready) return [];
  const ask = (intent, focus, byKeys = true) => ({
    title: intent === 'positive' ? 'Buy TM' : 'Let it go?',
    message: intent === 'positive' ? 'Spend 7,000 Pok\u00e9Coins on TM Thunderbolt?' : 'Let Oddish go? It runs off.',
    note: intent === 'positive' ? 'You will have 2,000 left.' : null,
    buttons: [
      { key: 'ok', label: intent === 'positive' ? 'Buy' : 'Let it go', intent },
      { key: 'no', label: intent === 'positive' ? 'Cancel' : 'Keep trying', intent: 'neutral' },
    ],
    focus,
    byKeys,
  });
  const dialog = {
    name: 'modal.dialog',
    component: 'ModalDialog',
    stageClass: 'lib-stage-modal',
    job:
      'The game asking you something: a clean window with a title, the question, an optional note and one or two ' +
      'button.glitch. The confirm takes the ask\'s intent, the back-out is neutral; a loss opens on the back-out. ' +
      'The focus shows only with the keys; Esc cancels.',
    files: 'js/ui/lib/primitives/modal/modal.js, modal.css; the asking: js/ui/ui.js G.UI.ask',
    tokens: ['color.grey.panel', 'color.grey.slate', 'color.grey.white', 'color.teal.base', 'color.red.base', 'color.green.base'],
    font: { name: 'font.hudModule', size: '24 px title, 18 px message, 14 px note; buttons 18 px' },
    size: '720 px wide on the 1920 x 1080 menu stage; buttons fitted to their labels, 24 px apart',
    places: [
      'main.shop.buyAsk',
      'main.team.sellAsk',
      'main.team.unsavedAsk',
      'catch.letGoAsk',
      'ev.goHomeAsk',
      'main.newSaveNotice',
    ],
    states: [
      { id: 'positive', title: 'Positive: opens on its confirm', props: ask('positive', 0) },
      { id: 'negative', title: 'Negative: opens on its back-out', props: ask('negative', 1) },
      { id: 'mouse', title: 'The mouse in use: no focus shows', props: ask('negative', -1, false) },
    ],
    props: [
      { name: 'title', values: 'text', does: 'The heading' },
      { name: 'message', values: 'text', does: 'The question; it wraps' },
      { name: 'note', values: 'text, or none', does: 'A second line (what you will have left)' },
      {
        name: 'buttons',
        values: '[{ key, label, intent, elementId }], one or two',
        does: 'The answers: one neutral for a notice (noCancel), two for a question',
      },
      { name: 'focus', values: 'a button index, or -1', does: 'The focused button (none with the mouse)' },
      { name: 'byKeys', values: 'true or false', does: 'With the keys a pointer on the other button does not swipe it' },
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
