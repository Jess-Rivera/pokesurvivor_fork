/* ============ input.js — keyboard and mouse (touch is in touch.js) ============
 * Physical keys resolve through an ACTION layer so the gameplay controls can be
 * remapped (Settings -> Controls). An action (e.g. 'attack_1', 'cycle_next',
 * 'pause', 'move_up') maps to one or more key codes; the game asks for actions,
 * not raw keys. Defaults match the classic layout (WASD/arrows, 1-4, Q/E, P/Esc).
 *
 * Only GAMEPLAY controls go through the action layer. The contextual menu keys
 * (1-3 to pick a level card, Esc to go back, Enter/Space to skip a cinematic)
 * stay as raw tap() checks: they are tied to on-screen labels, not remappable.
 *
 * Bindings are saved per device via G.Settings ('keybinds'), like the other
 * controls; they are not stored in the cloud account.
 */
G.Input = (() => {
  const down = new Set();
  const pressed = new Set();   // cleared every frame
  let mx = 0, my = 0, mdown = false;

  // Default bindings: action -> list of key codes (lowercased e.code).
  const DEFAULTS = {
    move_up:    ['keyw', 'arrowup'],
    move_down:  ['keys', 'arrowdown'],
    move_left:  ['keya', 'arrowleft'],
    move_right: ['keyd', 'arrowright'],
    attack_1:   ['digit1', 'numpad1'],
    attack_2:   ['digit2', 'numpad2'],
    attack_3:   ['digit3', 'numpad3'],
    attack_4:   ['digit4', 'numpad4'],
    cycle_prev: ['keyq'],
    cycle_next: ['keye', 'tab'],
    pause:      ['keyp', 'escape']
  };
  // The order and labels used by the Settings rebind screen.
  const ACTIONS = [
    'move_up', 'move_down', 'move_left', 'move_right',
    'attack_1', 'attack_2', 'attack_3', 'attack_4',
    'cycle_prev', 'cycle_next', 'pause'
  ];

  // Keys that must never be bound (would soft-lock or fight the browser).
  const RESERVED = new Set(['f5', 'f11', 'f12', 'escape', 'metaleft', 'metaright', 'controlleft', 'controlright', 'altleft', 'altright']);

  let binds = loadBinds();

  function loadBinds() {
    const b = {};
    for (const a of ACTIONS) b[a] = DEFAULTS[a].slice();
    try {
      const saved = G.Settings && G.Settings.get('keybinds');
      if (saved && typeof saved === 'object') {
        for (const a of ACTIONS) if (Array.isArray(saved[a])) b[a] = saved[a].slice();
      }
    } catch (e) { /* defaults */ }
    return b;
  }
  function saveBinds() { try { G.Settings.set('keybinds', binds); } catch (e) { /* nada */ } }

  function code(e) { return (e.code || e.key).toLowerCase(); }

  addEventListener('keydown', e => {
    const c = code(e);
    if (!down.has(c)) pressed.add(c);
    down.add(c);
    // Prevents the browser from scrolling with arrows/space during the game.
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space', 'tab'].includes(c)) e.preventDefault();
  });
  addEventListener('keyup', e => down.delete(code(e)));
  addEventListener('blur', () => { down.clear(); });
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  addEventListener('mousedown', () => mdown = true);
  addEventListener('mouseup', () => mdown = false);

  return {
    /** Player movement vector (keyboard actions or touch joystick). */
    axis() {
      const t = G.Touch && G.Touch.vector();
      if (t && (t[0] || t[1])) return t;
      let x = 0, y = 0;
      if (this.actionHeld('move_left')) x -= 1;
      if (this.actionHeld('move_right')) x += 1;
      if (this.actionHeld('move_up')) y -= 1;
      if (this.actionHeld('move_down')) y += 1;
      return G.U.norm(x, y);
    },

    // --- raw keys (contextual menu shortcuts, not remappable) ---
    held(c) { return down.has(c); },
    /** true only on the frame it was pressed. */
    tap(c) { return pressed.has(c); },

    // --- actions (remappable gameplay controls) ---
    /** true on the frame any key bound to `name` was pressed. */
    action(name) {
      const ks = binds[name];
      return !!ks && ks.some(k => pressed.has(k));
    },
    /** true while any key bound to `name` is held. */
    actionHeld(name) {
      const ks = binds[name];
      return !!ks && ks.some(k => down.has(k));
    },

    // --- rebinding API (used by settings-ui.js) ---
    get actionList() { return ACTIONS.slice(); },
    bindingsOf(name) { return (binds[name] || []).slice(); },
    isReserved(c) { return RESERVED.has(c); },
    /** Short display label for an action's first bound key (e.g. 'J', '1', '↑'). */
    keyLabel(name) {
      const c = (binds[name] || [])[0];
      if (!c) return '';
      const MAP = { arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→',
        space: 'Spc', escape: 'Esc', tab: 'Tab', enter: 'Ent' };
      if (MAP[c]) return MAP[c];
      let m;
      if ((m = /^key([a-z])$/.exec(c))) return m[1].toUpperCase();
      if ((m = /^digit(\d)$/.exec(c))) return m[1];
      if ((m = /^numpad(\d)$/.exec(c))) return m[1];
      return c.toUpperCase();
    },
    /** Bind key `c` to `name` (removing it from any other action first). */
    rebind(name, c) {
      c = (c || '').toLowerCase();
      if (!binds[name] || RESERVED.has(c)) return false;
      for (const a of ACTIONS) binds[a] = binds[a].filter(k => k !== c);
      binds[name] = [c];
      saveBinds();
      return true;
    },
    resetBindings() { binds = {}; for (const a of ACTIONS) binds[a] = DEFAULTS[a].slice(); saveBinds(); },
    defaultsFor(name) { return (DEFAULTS[name] || []).slice(); },

    mouse() { return { x: mx, y: my, down: mdown }; },
    endFrame() { pressed.clear(); }
  };
})();
