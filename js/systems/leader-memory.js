/* ============ leader-memory.js: what each leader remembers of you for the rest of the run (G.LeaderMemory) ============
 * Spec: docs/LEADER-AI.md "Run memory and behavior tracking" (Jess 2026-11-08). Slice 4 (#33). In memory only, run-scoped like
 * Silver: start() at G.Game.startRun makes an empty store, end() at endRun drops it, and nothing is ever written to the save. With no
 * store (outside a run, and in a harness that never starts one) record() is null and nothing is remembered.
 *   RECORD  one per leader, keyed by gym id: { fights, mons, team, cap }. `fights` counts the fights booked so far (the one running is
 *           fights + 1); `cap` is the leader's prediction cap bag (G.LeaderAI), kept here so its 7 in 10 runs across the fights.
 *   MON     one per mon of yours, keyed as G.LeaderInfo keys it (copy uid, else the team slot): the moves seen (id -> the fight it was
 *           last confirmed in), bonds ({ ids, fight }), slot switches (and how often to each slot), swaps out and in, whom it was swapped
 *           into, the reason tags counted against its swaps, dodges, seconds on the field and range (distance x seconds, so range /
 *           fieldT is its average fighting range).
 *   TEAM    lead sightings (each fight books the mon of yours with the most field time) and who you send in after a faint.
 * Only observations are stored, and only G.LeaderInfo writes them (it hears the screen; this module hears nothing). Which patterns a
 * leader believes is derived from the counts with its settings at each fight (lead() below), so retuning applies to old observations.
 */
G.LeaderMemory = (() => {
  let store = null; // gym id -> record, or null outside a run
  /** The visible reasons a swap of yours is tagged with (LEADER-AI WHY YOU SWAPPED; G.LeaderInfo reads them). */
  const TAGS = Object.freeze(['low', 'disadvantage', 'status', 'cooldown', 'sentIn']);

  function mon(rec, key) {
    let m = rec.mons.get(key);
    if (!m) {
      const tags = {};
      for (const k of TAGS) tags[k] = 0;
      m = {
        moves: new Map(),
        bonds: [],
        switches: 0,
        toSlot: [],
        swapsOut: 0,
        swapsIn: 0,
        into: new Map(),
        tags,
        dodges: 0,
        fieldT: 0,
        range: 0,
      };
      rec.mons.set(key, m);
    }
    return m;
  }
  const bump = (map, key) => map.set(key, (map.get(key) || 0) + 1);

  return {
    TAGS,
    /** A run starts: an empty store. */
    start() {
      store = new Map();
    },
    /** The run is over: the store is dropped. */
    end() {
      store = null;
    },
    get on() {
      return !!store;
    },
    /** The record of the leader of gym `id` (made empty on first use), or null with no store. */
    record(id) {
      if (!store || id == null) return null;
      let r = store.get(id);
      if (!r)
        store.set(
          id,
          (r = { id, fights: 0, mons: new Map(), team: { leads: new Map(), afterFaint: new Map() }, cap: null })
        );
      return r;
    },
    mon,
    bump,
    /** LEADER-AI slice 4: the lead pattern a leader with this `learnRate` believes: the mon of yours with the most lead sightings,
     *  once it has `learnRate` or more and no other mon ties it. { key, n }, or null. */
    lead(rec, learnRate) {
      let best = null,
        tie = false;
      for (const [key, n] of rec ? rec.team.leads : []) {
        if (!best || n > best.n) {
          best = { key, n };
          tie = false;
        } else if (n === best.n) tie = true;
      }
      return best && !tie && best.n >= learnRate ? best : null;
    },
    /** Dev: the store as plain data (G.Debug.leaderMemory). */
    dump() {
      if (!store) return null;
      const out = {};
      for (const [id, r] of store) {
        const mons = {};
        for (const [k, m] of r.mons)
          mons[k] = Object.assign({}, m, {
            moves: Object.fromEntries(m.moves),
            into: Object.fromEntries(m.into),
            avgRange: m.fieldT > 0 ? Math.round(m.range / m.fieldT) : null,
          });
        out[id] = {
          fights: r.fights,
          leads: Object.fromEntries(r.team.leads),
          afterFaint: Object.fromEntries(r.team.afterFaint),
          mons,
        };
      }
      return out;
    },
  };
})();
