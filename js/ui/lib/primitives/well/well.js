/* ============ well.js: the round slot (G.Lib.Well; #128 S6) ============
 *   well  Well: a round slot that holds one thing (a ball; later a berry or a move's type glyph). A grey.panel inside
 *         and a 2 px ring: grey.ink when it is empty, the holder's colour when it holds something. What it holds is
 *         clipped to the circle, so a picture may be drawn larger than the well (a ball fills most of it). The board's
 *         berry pocket and move slot wells (decision 2026-11-19-155-team-slot-hp-bar-cursor-gap-and-berry-pocket),
 *         named by its look (decision 2026-11-18-155-library-pieces-named-by-look). First on the Main Menu Shop's
 *         ball belts; the berry pocket, the catch belts and the move slots move onto it at #126.
 * Props only: the screen places it, sizes it and gives what it holds. A cursor.ring goes beside it, in a host of the
 * well's size, never inside (the well clips). Style: well.css. Board: tools/library/hud-area-draft.css (lib-area-well).
 */
G.Lib = G.Lib || {};
G.Lib.Well = (() => {
  const preact = window.preact,
    htmFactory = window.htm;
  if (!preact || !htmFactory) return { ready: false };
  const html = htmFactory.bind(preact.h);

  /** A well size px across, at the top left of its host. ring: the colour of its ring while it holds something (pass
   *  null when empty, for the ink ring); children: what it holds. */
  function Well({ size, ring = null, className, children }) {
    return html`<div
      class=${'well' + (ring ? ' is-holding' : '') + (className ? ' ' + className : '')}
      style=${{ width: size + 'px', height: size + 'px', ...(ring ? { '--well-ring': ring } : {}) }}
    >
      ${children}
    </div>`;
  }

  return { ready: true, Well };
})();
