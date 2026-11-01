/* ============ simbus.js: the sim -> presentation event channel (docs/SIM-PRESENT-BOUNDARY.md) ============
 * The simulation (state and rules) EMITS events here; the presentation layer (toasts, sounds, FX, HUD) SUBSCRIBES and renders them.
 * The sim never calls Spawner.say, Audio, FX or the Animator for a fact it owns. This is what lets a harness assert on what the sim did
 * without stubbing the screen, and what a future host can serialize to guests (co-op) or a headless worker.
 *
 * Rules for events (keep these when adding more):
 *   - type is 'area:name' (for example 'gym:escalate'). One meaning per type; never overload a type.
 *   - the payload is PLAIN DATA only (numbers, strings, booleans, null). No entities, DOM nodes or functions, so every event can be
 *     JSON-serialized. The payload carries the FACTS (who, how much), never display text: the subscriber composes the words.
 *   - emit is synchronous and a throwing subscriber is isolated (logged, never allowed to break the sim).
 *   - subscribers register ONCE at boot (a ui file), not per run, and read engine globals lazily when the event arrives.
 * record()/stopRecording() capture every emitted event for harnesses.
 */
G.SimBus = (() => {
  const subs = new Map();          // type -> [handlers]
  let tape = null;                 // when recording: every emitted event, in order

  /** Subscribes to a type; returns the unsubscribe function. */
  function on(type, fn) {
    if (typeof fn !== 'function') throw new Error('SimBus.on(' + type + '): handler must be a function');
    if (!subs.has(type)) subs.set(type, []);
    subs.get(type).push(fn);
    return () => off(type, fn);
  }
  function off(type, fn) {
    const hs = subs.get(type);
    if (!hs) return;
    const i = hs.indexOf(fn);
    if (i >= 0) hs.splice(i, 1);
  }
  /** Emits an event: the payload fields plus type. Subscribers run in registration order. */
  function emit(type, data) {
    const ev = Object.assign({ type }, data);
    if (tape) tape.push(ev);
    const hs = subs.get(type);
    if (!hs) return;
    for (const h of hs.slice()) {
      try { h(ev); } catch (e) { console.error('[SimBus] a subscriber of ' + type + ' failed:', e); }
    }
  }
  /** Harness: starts recording and returns the live array of events. */
  function record() { tape = []; return tape; }
  /** Harness: stops recording and returns what was captured. */
  function stopRecording() { const t = tape || []; tape = null; return t; }

  return { on, off, emit, record, stopRecording };
})();
