/* ============ field.js: the text field and the dropdown (G.Lib.Field; #167) ============
 *   field.text      TextField: one line of typed text on panel.clean; its edge turns yellow.base under the keys' cursor
 *                   and while typing
 *   field.dropdown  DropdownBox (the closed box: a label, the count chosen, a chevron) and DropdownList (the open list:
 *                   rows, each a choice with a tick box or a mark, or an accordion header that opens its own rows)
 * Looks approved with main.shop.tms; ported from the board (tools/library/inputs-draft.js). Props only: the screen owns
 * the text, what is chosen and open, and where the cursor is. Style: field.css.
 */
G.Lib = G.Lib || {};
G.Lib.Field = (() => {
  const preact = window.preact,
    htmFactory = window.htm;
  if (!preact || !htmFactory) return { ready: false };
  const html = htmFactory.bind(preact.h);
  const FIELD = { height: 40, chevronPixel: 2, rowHeight: 32 };
  const { PixelShape, letterRows } = G.Lib.Pixels;
  const CHEVRON = ['wwwwwww', ' wwwww ', '  www  ', '   w   '];
  const CHEVRON_COLOURS = { w: G.Tokens.color('color.grey.white') };

  /**
   * field.text. value and onChange(text) keep it in the screen's state. Enter or Esc hands the keys back to the screen
   * (that press goes no further): onEnter, onEscape, or letting go of the keyboard. Player-typed, so never translated.
   */
  function TextField({ value, onChange, onEnter, onEscape, onBlur, placeholder, width, maxLength, cursor, inputRef }) {
    const leave = (event, then) => {
      event.preventDefault();
      event.stopPropagation();
      if (then) then();
      else event.currentTarget.blur();
    };
    return html`<input
      type="text"
      ref=${inputRef}
      class=${'panel-clean field-text' + (cursor ? ' is-cursor' : '')}
      translate="no"
      spellcheck="false"
      autocomplete="off"
      placeholder=${placeholder}
      maxlength=${maxLength}
      value=${value}
      style=${{ width: width + 'px', height: FIELD.height + 'px' }}
      onInput=${(event) => onChange(event.currentTarget.value, event.currentTarget)}
      onBlur=${onBlur}
      onKeyDown=${(event) => {
        if (event.key === 'Enter') leave(event, onEnter);
        else if (event.key === 'Escape') leave(event, onEscape);
      }}
    />`;
  }

  /** field.dropdown, closed. count: how many are chosen, after the label; open and cursor turn its edge yellow. */
  function DropdownBox({ label, count = 0, width, open, cursor, attrs, onClick }) {
    return html`<div
      class=${'panel-clean field-dropdown' + (open || cursor ? ' is-cursor' : '')}
      style=${{ width: width + 'px', height: FIELD.height + 'px' }}
      onClick=${onClick}
      ...${attrs || {}}
    >
      <span class="field-dropdown-label">${count ? label + ' (' + count + ')' : label}</span>
      <${PixelShape}
        artWidth=${CHEVRON[0].length}
        artRows=${CHEVRON.length}
        artPixel=${FIELD.chevronPixel}
        paintRow=${letterRows(CHEVRON, CHEVRON_COLOURS)}
      />
    </div>`;
  }

  /**
   * The rows of an open list. rows: [{ id, label, kind: 'header' | 'choice', open (a header's), on, mark, indent }];
   * a choice shows a tick box when on is a boolean, else its mark (text at its right). at: the row the cursor is on;
   * press(id), hover(id or null); attrsFor(id): more attributes for a row.
   */
  function DropdownRows({ rows, at, press, hover, attrsFor }) {
    return rows.map(
      (row) =>
        html`<div
          key=${row.id}
          class=${'field-row is-' + row.kind + (row.id === at ? ' is-cursor' : '') + (row.indent ? ' is-indented' : '')}
          style=${{ height: FIELD.rowHeight + 'px' }}
          onMouseEnter=${() => hover(row.id)}
          onMouseLeave=${() => hover(null)}
          onClick=${() => press(row.id)}
          ...${attrsFor ? attrsFor(row.id) : {}}
        >
          ${typeof row.on === 'boolean' ? html`<span class=${'field-check' + (row.on ? ' is-on' : '')}></span>` : null}
          <span class="field-row-label">${row.label}</span>
          <span class="field-row-mark">${row.kind === 'header' ? (row.open ? '-' : '+') : row.mark || ''}</span>
        </div>`
    );
  }

  return { ready: true, FIELD, TextField, DropdownBox, DropdownRows };
})();
