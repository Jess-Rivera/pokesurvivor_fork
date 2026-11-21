/* ============ cursor.js: the selection cursors (G.Lib.Cursor; #128 S6) ============
 * The library's cursors, named by their look (decision 2026-11-18-155-library-pieces-named-by-look):
 *   cursor.ring  CursorRing: a ring around a round piece, CURSOR_RING.width thick, CURSOR_RING.gap off its rim, in
 *                yellow.base (decision 2026-11-20-155-cursor-ring-for-round-pieces-and-no-blink). Steady at rest, no
 *                blink. On a move it plays the CRT drawn on a circle: the ring it leaves flattens to a line, then a dot
 *                (CRT off); the ring it reaches opens from the dot to the line, past full size, flickers once and
 *                settles (CRT on). useRingTravel runs that move for a screen. First on the Main Menu Shop's ball
 *                belts; the catch screen's wells and faces and the TMs box move onto it at #126.
 * cursor.bar (squares, cards and slots) is built with the first screen that draws it (#126); the B2 corners stay in
 * js/ui/hud-kit.js until then. Props only: the screen says where the cursor is. Style: cursor.css. Board:
 * tools/library.html, Cursor (tools/library/cursor-draft.js, cursor-draft.css).
 */
G.Lib = G.Lib || {};
G.Lib.Cursor = (() => {
  const preact = window.preact,
    preactHooks = window.preactHooks,
    htmFactory = window.htm,
    buttons = G.Lib.Button;
  if (!preact || !preactHooks || !htmFactory || !buttons || !buttons.ready) return { ready: false };
  const html = htmFactory.bind(preact.h);

  // px: the ring's thickness and its air off the piece's rim (the decision's numbers; the board draft draws it 2 px)
  const CURSOR_RING = { width: 3, gap: 2 };
  CURSOR_RING.reach = CURSOR_RING.width + CURSOR_RING.gap; // 5: how far the ring sits outside its piece
  // the ring's CRT plays on button.glitch's press and release (the board's CURSOR offMs and onMs)
  const RING_CRT = { offMs: buttons.GLITCH_TIMING.pressMs, onMs: buttons.GLITCH_TIMING.releaseMs };

  /** cursor.ring around the piece it is drawn in (that host must be exactly the piece's size). phase: 'off', 'on' or
   *  null (steady). */
  function CursorRing({ phase }) {
    return html`<span
      class=${'cursor-ring' + (phase ? ' crt-' + phase : '')}
      style=${{
        inset: -CURSOR_RING.reach + 'px',
        borderWidth: CURSOR_RING.width + 'px',
        '--cursor-off': RING_CRT.offMs + 'ms',
        '--cursor-on': RING_CRT.onMs + 'ms',
      }}
      aria-hidden="true"
    ></span>`;
  }

  /**
   * Where a screen draws its ring, and in which phase, as the cursor moves between round pieces. target: the id of the
   * round piece the cursor is on now, or null (it is on something else, or the mouse is in use). Leaving one piece for
   * another plays the CRT off on the one it leaves, then the CRT on where it lands. Arriving from nowhere, or moving
   * again before a move ends (a held arrow key), plays only the CRT on; null hides it at once. Returns { at, phase }.
   */
  function useRingTravel(target) {
    const [shown, setShown] = preactHooks.useState({ at: target, phase: target ? 'on' : null }),
      timer = preactHooks.useRef(null);
    preactHooks.useEffect(() => {
      if (target === shown.at && shown.phase !== 'off') return;
      clearTimeout(timer.current);
      const arrive = () => {
        setShown({ at: target, phase: target ? 'on' : null });
        if (target) timer.current = setTimeout(() => setShown({ at: target, phase: null }), RING_CRT.onMs);
      };
      if (!shown.at || !target || shown.phase) {
        arrive();
        return;
      }
      setShown({ at: shown.at, phase: 'off' });
      timer.current = setTimeout(arrive, RING_CRT.offMs);
    }, [target]);
    preactHooks.useEffect(() => () => clearTimeout(timer.current), []);
    return shown;
  }

  return { ready: true, CURSOR_RING, RING_CRT, CursorRing, useRingTravel };
})();
