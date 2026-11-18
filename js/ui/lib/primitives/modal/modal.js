/* ============ modal.js: the dialog (G.Lib.Modal; #155 155c-4) ============
 * The library's dialog:
 *   modal.dialog  ModalDialog: a panel.flat box centred on the 1920 x 1080 menu stage, with a title, a message, an
 *                 optional note and a row of one or two button.rounded; one button is green (the one Enter presses)
 * Props only, never game state: the caller passes the text, the buttons, which one is green, and what a press and a
 * hover do. G.UI.ask (js/ui/ui.js) keeps the asking (the promise, the keys, the sounds) and draws this.
 * Style: modal.css. Board: tools/library.html, Primitives, Modal (modal.story.js).
 * Plan: docs/ASCII Concept Maps/155c-4 - Modal Plan.md.
 */
G.Lib = G.Lib || {};
G.Lib.Modal = (() => {
  const preact = window.preact,
    htmFactory = window.htm,
    panel = G.Lib.Panel,
    button = G.Lib.Button;
  if (!preact || !htmFactory || !panel || !panel.ready || !button || !button.ready) return { ready: false };
  const html = htmFactory.bind(preact.h);
  // the buttons: the rounded one at 3 px per art pixel, Sell's width, so "Keep editing" fits
  const MODAL_BUTTON = { artWidth: 62, artPixel: 3 };
  MODAL_BUTTON.width = MODAL_BUTTON.artWidth * MODAL_BUTTON.artPixel; // 186
  MODAL_BUTTON.height = button.ROUNDED_BUTTON.artRows * MODAL_BUTTON.artPixel; // 54

  /**
   * A dialog. buttons: [{ key, label, elementId }] (elementId: an id for the button's box, for the caller's checks);
   * focus: the index of the green button; onPress(index), onHover(index); partIds: ids for the title, message and
   * note ({ title, message, note }), for the same reason.
   */
  function ModalDialog({ title, message, note, buttons, focus = 0, onPress, onHover, partIds = {} }) {
    return html`<${panel.FlatPanel} className="modal-dialog" attrs=${{ role: 'dialog' }}>
      <div class="modal-title" id=${partIds.title}>${title}</div>
      <p class="modal-message" id=${partIds.message}>${message}</p>
      ${note ? html`<p class="modal-note" id=${partIds.note}>${note}</p>` : null}
      <div class="modal-buttons">
        ${buttons.map(
          (entry, index) =>
            html`<div
              key=${entry.key}
              class="modal-button"
              id=${entry.elementId}
              style=${{ width: MODAL_BUTTON.width + 'px', height: MODAL_BUTTON.height + 'px' }}
            >
              <${button.RoundedButton}
                id=${entry.key}
                label=${entry.label}
                artWidth=${MODAL_BUTTON.artWidth}
                artPixel=${MODAL_BUTTON.artPixel}
                rim=${button.REST_RIM}
                focusRim=${button.FOCUS_RIM}
                focused=${index === focus}
                onEnter=${onHover && (() => onHover(index))}
                onPress=${onPress && (() => onPress(index))}
              />
            </div>`
        )}
      </div>
    </${panel.FlatPanel}>`;
  }

  return { ready: true, MODAL_BUTTON, ModalDialog };
})();
