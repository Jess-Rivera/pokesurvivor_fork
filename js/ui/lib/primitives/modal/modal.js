/* ============ modal.js: the dialog (G.Lib.Modal; #155 155c-4, rebuilt #128 catch.window) ============
 * The library's dialog:
 *   modal.dialog  ModalDialog: a panel.clean box centred on the 1920 x 1080 menu stage, with a title, a message, an
 *                 optional note and one or two button.glitch fitted to their labels: every line in Michroma, the
 *                 note in teal.base. Each button brings its own intent (the confirm the ask's, the back-out
 *                 neutral); the focused one shows its focus swipe. Decisions
 *                 2026-11-19-155-dialog-clean-cancel-state-and-input-modes and
 *                 2026-11-20-155-dialog-answers-never-share-an-intent.
 * Props only, never game state: the caller passes the text, the buttons, which one is focused and whether the keys are
 * in use, and what a press and a hover do. G.UI.ask (js/ui/ui.js) keeps the asking (the promise, the keys, the input
 * modes, the sounds) and draws this. Style: modal.css. Board: tools/library.html, Modal (tools/library/modal-draft.js).
 */
G.Lib = G.Lib || {};
G.Lib.Modal = (() => {
  const preact = window.preact,
    htmFactory = window.htm,
    panel = G.Lib.Panel,
    button = G.Lib.Button;
  if (!preact || !htmFactory || !panel || !panel.ready || !button || !button.ready) return { ready: false };
  const html = htmFactory.bind(preact.h);

  /**
   * A dialog. buttons: [{ key, label, intent, elementId }] (elementId: an id for the button's box, for the caller's
   * checks); focus: the index of the focused button, or -1 for none; byKeys: the keyboard is in use, so a pointer
   * resting on the other button does not swipe it (modal.css); onPress(index), onHover(index); partIds: ids for the
   * title, message and note ({ title, message, note }), for the same reason as elementId.
   */
  function ModalDialog({ title, message, note, buttons, focus = 0, byKeys = true, onPress, onHover, partIds = {} }) {
    return html`<${panel.CleanPanel}
      className=${'modal-dialog' + (byKeys ? ' is-keys' : '')}
      attrs=${{ role: 'dialog' }}
    >
      <div class="modal-title" id=${partIds.title}>${title}</div>
      <p class="modal-message" id=${partIds.message}>${message}</p>
      ${note ? html`<p class="modal-note" id=${partIds.note}>${note}</p>` : null}
      <div class="modal-buttons">
        ${buttons.map(
          (entry, index) =>
            html`<div key=${entry.key} class="modal-button" id=${entry.elementId}>
              <${button.GlitchButton}
                id=${entry.key}
                label=${entry.label}
                intent=${entry.intent}
                focused=${index === focus}
                onEnter=${onHover && (() => onHover(index))}
                onPress=${onPress && (() => onPress(index))}
              />
            </div>`
        )}
      </div>
    </${panel.CleanPanel}>`;
  }

  return { ready: true, ModalDialog };
})();
