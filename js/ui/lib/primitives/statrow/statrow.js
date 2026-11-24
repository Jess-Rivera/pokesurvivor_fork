/* ============ statrow.js: one stat's row (G.Lib.StatRow; #167) ============
 *   row.stat  StatRow: the stat's name in its base colour, the nature's arrows (raised or lowered), the base stat, then
 *             two thin bars, the IV (the stat's light, 0 to 31) over the EV (its dark, 0 to 252), and their values
 * Pattern: assets/screenshots/reference-for-team-menu.jpg; decision 2026-11-23-97-139-team-menu-and-upgrade-popup-rulings.
 * Props only. Style: statrow.css.
 */
G.Lib = G.Lib || {};
G.Lib.StatRow = (() => {
  const preact = window.preact,
    htmFactory = window.htm;
  if (!preact || !htmFactory) return { ready: false };
  const html = htmFactory.bind(preact.h);
  const ARROW = ['   w   ', '  www  ', ' ww ww ', 'ww   ww', '   w   ', '  www  ', ' ww ww ', 'ww   ww'];
  const ARROW_ROWS = { up: ARROW, down: [...ARROW].reverse() };
  const ARROW_COLOURS = {
    up: { w: G.Tokens.color('color.red.light') }, // the main games: raised red, lowered blue
    down: { w: G.Tokens.color('color.blue.light') },
  };
  const { PixelShape, letterRows } = G.Lib.Pixels;

  const Bar = ({ value, most, colour }) =>
    html`<div class="stat-row-track">
      <div style=${{ width: (100 * Math.min(1, value / most)).toFixed(2) + '%', background: colour }}></div>
    </div>`;

  /** stat: a color.stat key; nature: 'up', 'down' or null; iv and ev: { value, most }, or null when there is no copy. */
  function StatRow({ stat, label, nature, base, iv, ev }) {
    const tone = (part) => G.Tokens.color('color.stat.' + stat + '.' + part);
    return html`<div class="stat-row" data-stat=${stat}>
      <span class="stat-row-name" style=${{ color: tone('base') }}>${label}</span>
      <span class="stat-row-nature" data-nature=${nature || ''}>
        ${
          nature
            ? html`<${PixelShape}
                artWidth=${ARROW[0].length}
                artRows=${ARROW.length}
                artPixel=${2}
                paintRow=${letterRows(ARROW_ROWS[nature], ARROW_COLOURS[nature])}
              />`
            : null
        }
      </span>
      <span class="stat-row-base">${base}</span>
      <span class="stat-row-bars">
        <${Bar} value=${iv ? iv.value : 0} most=${iv ? iv.most : 1} colour=${tone('light')} />
        <${Bar} value=${ev ? ev.value : 0} most=${ev ? ev.most : 1} colour=${tone('dark')} />
      </span>
      <span class="stat-row-values">${iv ? iv.value + '/' + ev.value : ''}</span>
    </div>`;
  }

  return { ready: true, StatRow };
})();
