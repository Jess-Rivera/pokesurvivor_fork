/* ============ toggle.js: the power toggle (G.Lib.Toggle; #167) ============
 *   toggle.power  PowerToggle: a real switch's power marks and a label. Off is the ring (teal.dark), on is the bar
 *                 (teal.base); a flip plays the CRT on its side. Look approved with main.shop.tms; ported from the board
 *                 (tools/library/toggle-draft.js). Props only. Style: toggle.css.
 */
G.Lib = G.Lib || {};
G.Lib.Toggle = (() => {
  const preact = window.preact,
    preactHooks = window.preactHooks,
    htmFactory = window.htm;
  if (!preact || !preactHooks || !htmFactory) return { ready: false };
  const html = htmFactory.bind(preact.h);
  const FLIP = { onMs: 140, offMs: 120 };

  /** on, label, onPress; cursor: the keys' cursor is on it. The flip plays only on a change, never on first showing. */
  function PowerToggle({ on, label, cursor, onPress, attrs }) {
    const [flip, setFlip] = preactHooks.useState(''),
      before = preactHooks.useRef(on);
    preactHooks.useEffect(() => {
      if (before.current === on) return;
      before.current = on;
      setFlip(on ? ' flipping-on' : ' flipping-off');
    }, [on]);
    return html`<button
      type="button"
      class=${'toggle-power' + (on ? ' on' : '') + flip + (cursor ? ' is-cursor' : '')}
      style=${{ '--toggle-on-time': FLIP.onMs + 'ms', '--toggle-off-time': FLIP.offMs + 'ms' }}
      aria-pressed=${on}
      tabindex="-1"
      onMouseDown=${(event) => event.preventDefault()}
      onClick=${onPress}
      ...${attrs || {}}
    >
      <span class="toggle-power-mark"><span></span></span>${label}
    </button>`;
  }

  return { ready: true, FLIP, PowerToggle };
})();
