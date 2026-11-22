/* ============ debug-leader.js: the leader AI's dev tools (dev only, with ?dev) ============
 * The leader AI's own switches, its swap request and its run memory (Leader AI slices 1 to 4).
 * Split out of js/core/debug.js on 2026-11-14 (structural review F6, docs/AI Outputs/F6 - Debug Split
 * Plan.md); the code is unchanged. It adds its commands onto G.Debug, so every caller uses them as before, and
 * reads only G.Debug.on, the ?dev flag. Loads right after debug.js. Not in the NEED array: like debug.js it is
 * dev-only and inert without ?dev (decision 2026-11-14-debug-split-files-stay-out-of-need).
 *
 *   G.Debug.leaderSwap(slot)  in a switched gym's fight, the leader AI asks to swap to its team slot (1 is the first); your swap rules decide it (Leader AI slice 1)
 *   G.Debug.leaderAI({ swaps, dodges, confidence, pacing, triggers, memory })  turn the leader AI's own decisions on or off (true / false); no argument prints them, its status and its last decisions (slices 2 to 4)
 *   G.Debug.leaderMemory()  print what every leader remembers of you this run (Leader AI slice 4)
 *   G.Debug.leaderLead(leader, slot, n)  seed n lead sightings of your team slot `slot` (1 is the first) into that leader's memory, e.g. leaderLead('Misty', 1, 2): her next fight reads it (slice 4 feel test)
 */
(() => {
  const on = G.Debug.on;

  /** In a switched gym's fight (dev only): the leader's AI player asks to swap to team slot `slot` (1 is the first). Your swap rules
   *  decide it on the next frame: refused while locked, trapped or in the air, as yours (LEADER-AI slice 1). */
  function leaderSwap(slot) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const ai = G.GymArena.leaderAI;
    if (!ai) {
      console.warn('[Debug] no switched gym fight is running (Misty or Brock).');
      return false;
    }
    ai.requestSwap(slot - 1);
    return true;
  }

  /** Dev only (Leader AI slice 2): turn the leader AI's own swap or dodge decisions on or off, for every fight from now on. With no
   *  argument it prints the switches and, in a fight, the AI player's last decisions. */
  function leaderAI(opts) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const off = G.LeaderAI.off,
      KEYS = ['planner', 'swaps', 'dodges', 'confidence', 'triggers', 'memory']; // #51: planner replaces pacing
    if (opts) for (const k of KEYS) if (opts[k] != null) off[k] = !opts[k];
    const ai = G.GymArena.leaderAI;
    console.log('[LeaderAI] ' + KEYS.map((k) => k + ' ' + (off[k] ? 'off' : 'on')).join(', '));
    if (ai) console.log('  ' + ai.status());
    if (ai) for (const d of ai.log.slice(-12)) console.log('  ' + d.t.toFixed(2) + ' s  ' + d.act + ': ' + d.text);
    const out = {};
    for (const k of KEYS) out[k] = !off[k];
    return out;
  }

  /** Dev only (Leader AI slice 4): what every leader remembers of you this run, as plain data (null outside a run). */
  function leaderMemory() {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const d = G.LeaderMemory.dump();
    console.log('[LeaderMemory] ' + (d ? JSON.stringify(d, null, 2) : 'no run store'));
    return d;
  }

  /** Dev only (Leader AI slice 4 feel test): n lead sightings of your team slot `slot` (1-based) for the named leader, as if you had
   *  led with it in n earlier fights. It writes around the information layer, so it is a dev tool only. */
  function leaderLead(leader, slot = 1, n = 1) {
    if (!on) {
      console.warn('[Debug] add ?dev to the URL to enable debug tools.');
      return false;
    }
    const g = G.Gyms.listFor(null).find((x) => String(x.leader).toLowerCase() === String(leader).toLowerCase()),
      m = (G.Game.roster || [])[slot - 1],
      rec = g && G.LeaderMemory.record(g.id);
    if (!rec || !m) {
      console.warn('[Debug] leaderLead needs a run, a known leader and a filled team slot');
      return false;
    }
    const key = G.LeaderInfo.keyOf(m);
    for (let i = 0; i < n; i++) G.LeaderMemory.bump(rec.team.leads, key);
    console.log(
      '[LeaderMemory] ' + g.leader + ' lead sightings: ' + JSON.stringify(Object.fromEntries(rec.team.leads))
    );
    return true;
  }

  Object.assign(G.Debug, {
    leaderSwap,
    leaderAI,
    leaderMemory,
    leaderLead,
  });
})();
