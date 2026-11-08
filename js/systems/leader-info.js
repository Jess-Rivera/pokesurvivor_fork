/* ============ leader-info.js: what a leader's AI player can see (G.LeaderInfo) ============
 * Spec: docs/LEADER-AI.md "What it can see" (Jess 2026-11-08). The one information layer: everything the AI player and (slice 4) its
 * memory read comes from here, so nothing reaches the AI around it. Slice 1 (#22), per fight:
 *   ROSTERS  both teams from the fight's start: each mon's species and whether it is active, on the bench or fainted
 *   REVEALS  per mon of yours, keyed by its copy uid (the team slot when that is null):
 *            a move, from its first cast this fight ("on screen" = cast since the fight's start, no camera check);
 *            a bond, when two different moves are cast with no slot switch seen between them (only the active slot casts, and
 *            the switch shows as your setActive ring), at any gap.
 *   Held-item reveals: #36. Stale reveals across fights: slice 4 (run memory).
 * It hears the sim through G.SimBus ('move:cast', 'slot:switch'), registered once here (SimBus rules); the arena points it at the
 * fight's record (create) and away from it (end), so an old fight's record never hears a new cast.
 */
G.LeaderInfo = (() => {
  let cur = null; // the fight's record, or null outside a switched gym's fight

  class Info {
    /** @param leader the leader's G.Team */
    constructor(leader) {
      this.leader = leader;
      this.mons = new Map(); // key -> { moves: [ids, first cast first], bonds: [[ids]], run: [ids since the last switch] }
    }
    /** A mon of yours: its copy uid, else its team slot. */
    keyOf(m) {
      return m.copyUid != null ? m.copyUid : 'slot:' + m.teamSlot;
    }
    rec(key) {
      let r = this.mons.get(key);
      if (!r) this.mons.set(key, (r = { moves: [], bonds: [], run: [] }));
      return r;
    }
    /** Both rosters as the screen shows them: [{ dex, state }] in slot order, state 'active', 'bench' or 'fainted'. */
    rosters() {
      const side = (list, at) =>
        list.map((m, i) => ({ dex: m.dex, state: m.dead ? 'fainted' : i === at ? 'active' : 'bench' }));
      return {
        you: side(G.Game.roster || [], G.Game.activeIndex),
        leader: side(this.leader.members, this.leader.activeIdx),
      };
    }
    /** What a mon of yours has revealed: copies of its moves and bonds. */
    reveals(m) {
      const r = this.mons.get(this.keyOf(m));
      return { moves: r ? r.moves.slice() : [], bonds: r ? r.bonds.map((b) => b.slice()) : [] };
    }
    /** A cast of yours: the move is revealed, and joins the bond of every move cast since the last switch. */
    cast(key, id) {
      const r = this.rec(key);
      if (!r.moves.includes(id)) r.moves.push(id);
      if (!r.run.includes(id)) r.run.push(id);
      if (r.run.length < 2) return;
      // a move is in one slot, so a bond that shares a move with this run is the same slot: merge them
      const mine = r.bonds.filter((b) => b.some((x) => r.run.includes(x))),
        merged = [...new Set(mine.flat().concat(r.run))];
      r.bonds = r.bonds.filter((b) => !mine.includes(b)).concat([merged]);
    }
    switched(key) {
      this.rec(key).run = [];
    }
  }

  /** The key of a SimBus owner of yours, or null for a leader mon, a wild one or a mon not on your roster. */
  function yours(ev) {
    if (ev.rival || ev.ownerSlot == null) return null;
    const m = (G.Game.roster || []).find((f) => f.teamSlot === ev.ownerSlot);
    return m && cur ? cur.keyOf(m) : null;
  }
  G.SimBus.on('move:cast', (ev) => {
    const k = cur && yours(ev);
    if (k != null) cur.cast(k, ev.moveId);
  });
  G.SimBus.on('slot:switch', (ev) => {
    const k = cur && yours(ev);
    if (k != null) cur.switched(k);
  });

  return {
    /** A switched gym's fight starts: a fresh record for the leader team `leader`, the one the bus feeds from now on. */
    create(leader) {
      return (cur = new Info(leader));
    },
    /** The fight is over (or the arena reset): the bus feeds no record. */
    end() {
      cur = null;
    },
    get current() {
      return cur;
    },
  };
})();
