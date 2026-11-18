/* ============ portrait.js: the round portrait (G.Lib.Portrait; #155 155c-5) ============
 * The library's portrait:
 *   portrait.round  RoundPortrait: a face in a circle with a stroke in a rim colour, dimmed when fainted; with a ring
 *                   (the EXP ring) it sits inside a band that fills clockwise from the top
 * Props only, never game state: the screen passes the image's address (the kit's portraitSource knows which shinies
 * have no face of their own), its fallback, the size and the colours. Each screen keeps its own states on top (the
 * boss circles' active rim and flicker, the pause menu's shimmer, the TMs tab's chosen and hover rims).
 * Style: portrait.css. Board: tools/library.html, Primitives, Portraits (portrait.story.js).
 * Plan: docs/ASCII Concept Maps/155c-5 - Slanted Panel and Round Portrait Plan.md. Look: docs/HUD-STYLE.md "Assets".
 */
G.Lib = G.Lib || {};
G.Lib.Portrait = (() => {
  const preact = window.preact,
    htmFactory = window.htm;
  if (!preact || !htmFactory) return { ready: false };
  const html = htmFactory.bind(preact.h);
  // the ring: a 2 px outline, then one 12 px band (the EXP blue over the empty track's grey; Jess, 2026-11-10)
  const RING = { outline: 2, band: 12 };
  const FULL_TURN = 360; // degrees

  /** The face: the circle, its stroke and the picture (src null draws an empty circle). */
  function Face({ size, stroke, rim, src, dex, onError, lazy, fainted, className, style, attrs, children }) {
    const faceStyle = { ...style };
    if (size) faceStyle.width = faceStyle.height = size + 'px';
    if (stroke != null) faceStyle['--portrait-stroke'] = stroke + 'px';
    if (rim) faceStyle['--portrait-rim'] = rim;
    return html`<div
      class=${'portrait-round' + (fainted ? ' is-fainted' : '') + (className ? ' ' + className : '')}
      style=${faceStyle}
      ...${attrs || {}}
    >
      ${src ? html`<img src=${src} data-dex=${dex} alt="" onError=${onError} loading=${lazy ? 'lazy' : null} />` : null}
      ${children}
    </div>`;
  }

  /**
   * portrait.round. size: px across (none: the screen's CSS sizes it); stroke: px; rim: the stroke's colour (the
   * outline by default); src, dex, onError, lazy: the picture; fainted: dimmed. ring: { fraction (0 to 1), fill,
   * track } draws the band around the face (size is then the whole, ring included); ringClass and faceClass add the
   * ring's and the face's classes, className the outer one's. style places it; attrs adds attributes; children are
   * drawn on top (a selection cursor).
   */
  function RoundPortrait(props) {
    const { ring, size, className, style, attrs, ringClass, faceClass, ...face } = props;
    if (!ring) return html`<${Face} ...${face} size=${size} className=${className} style=${style} attrs=${attrs} />`;
    const ringStyle = { ...style, width: size + 'px', height: size + 'px' };
    // the band's filled angle (the variable is named for the EXP ring, its first use)
    ringStyle['--exp'] = Math.round(ring.fraction * FULL_TURN) + 'deg';
    if (ring.fill) ringStyle['--ring-fill'] = ring.fill;
    if (ring.track) ringStyle['--ring-track'] = ring.track;
    const faceInset = RING.outline + RING.band;
    const ringedClass = 'portrait-ringed' + (className ? ' ' + className : '');
    return html`<div class=${ringedClass} style=${ringStyle} ...${attrs || {}}>
      <div class=${'portrait-ring' + (ringClass ? ' ' + ringClass : '')} style=${{ inset: RING.outline + 'px' }}></div>
      <${Face} ...${face} className=${faceClass} style=${{ position: 'absolute', inset: faceInset + 'px' }} />
    </div>`;
  }

  return { ready: true, RING, RoundPortrait };
})();
