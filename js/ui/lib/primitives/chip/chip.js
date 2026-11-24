/* ============ chip.js: the type chip (G.Lib.Chip; #167) ============
 *   chip.type  TypeChip: the B2 capsule at 1 px per art pixel, 60 x 17: the type's base fill, its dark rim, its name in
 *              capitals (Silver 10). Ported from the board (tools/library/chips-draft.js). Props only. Style: chip.css.
 */
G.Lib = G.Lib || {};
G.Lib.Chip = (() => {
  const preact = window.preact,
    htmFactory = window.htm;
  if (!preact || !htmFactory) return { ready: false };
  const html = htmFactory.bind(preact.h);
  const CHIP = { width: 60, rows: 17, rim: 2, corner: [2, 2, 1, 1] };
  const EDGES = [...CHIP.corner, ...Array(CHIP.rows - 2 * CHIP.corner.length).fill(0), ...[...CHIP.corner].reverse()];
  /** Per row: how far the fill sits in from the sides, or null for a row all rim. */
  const FILLS = EDGES.map((edge, row) => {
    if (row < CHIP.rim || row >= CHIP.rows - CHIP.rim) return null;
    return Math.max(...EDGES.slice(row - CHIP.rim, row + CHIP.rim + 1)) + CHIP.rim;
  });
  const capsuleRows = (fill, rim) => (row) => {
    const edge = EDGES[row],
      inner = FILLS[row];
    if (inner == null) return [[edge, CHIP.width - 2 * edge, rim]];
    return [
      [edge, inner - edge, rim],
      [inner, CHIP.width - 2 * inner, fill],
      [CHIP.width - inner, inner - edge, rim],
    ];
  };
  const paints = new Map(); // one painter per type

  function TypeChip({ type }) {
    if (!paints.has(type)) {
      const tone = (part) => G.Tokens.color('color.type.' + type + '.' + part);
      paints.set(type, capsuleRows(tone('base'), tone('dark')));
    }
    return html`<span class="chip-type" data-type=${type}>
      <${G.Lib.Pixels.PixelShape}
        artWidth=${CHIP.width}
        artRows=${CHIP.rows}
        artPixel=${1}
        paintRow=${paints.get(type)}
      />
      <span class="chip-type-text">${type}</span>
    </span>`;
  }

  return { ready: true, CHIP, TypeChip };
})();
