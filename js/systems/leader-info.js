/* ============ leader-info.js: what a leader's AI player can see (G.LeaderInfo) ============
 * Spec: docs/LEADER-AI.md "What it can see" (Jess 2026-11-08). The one information layer: everything the AI player and (slice 4) its
 * memory read comes from here, so nothing reaches the AI around it. Slice 1 (#22), per fight:
 *   ROSTERS  both teams from the fight's start: each mon's species and whether it is active, on the bench or fainted
 *   REVEALS  per mon of yours, keyed by its copy uid (the team slot when that is null):
 *            a move, from its first cast this fight ("on screen" = cast since the fight's start, no camera check);
 *            a bond, when two different moves are cast with no slot switch seen between them (only the active slot casts, and
 *            the switch shows as your setActive ring), at any gap.
 *   THREATS  slice 2 (#31): your shapes in flight that reach the leader's body soon (threats(), read by its dodge)
 *   FIGHT    slice 3 (#32): what the screen shows of the trade, for confidence and pacing. Hits from 'move:hit' (the damage number
 *            on screen) as fractions of the struck mon's max HP; faints (an HP bar at 0, the roster) and your send-ins (the roster's
 *            active mon). events() hands them to the AI player once; windows() sums the hits over the last SHORT and LONG seconds.
 *   Held-item reveals: #36. Stale reveals across fights: slice 4 (run memory).
 * It hears the sim through G.SimBus ('move:cast', 'slot:switch', 'move:hit'), registered once here (SimBus rules); the arena points it
 * at the fight's record (create) and away from it (end), so an old fight's record never hears a new cast.
 */
G.LeaderInfo = (() => {
  let cur = null; // the fight's record, or null outside a switched gym's fight
  const SHORT = 2,
    LONG = 15; // the rolling windows, seconds (LEADER-AI ROLLING WINDOWS, TUNE)

  class Info {
    /** @param leader the leader's G.Team */
    constructor(leader) {
      this.leader = leader;
      this.mons = new Map(); // key -> { moves: [ids, first cast first], bonds: [[ids]], run: [ids since the last switch] }
      this.t = 0; // fight seconds, advanced by tick()
      this.hits = []; // { t, k: 'dealt' | 'taken', frac } inside the LONG window
      this.feed = []; // events not yet handed to the AI player: { k: 'landed' | 'taken' | 'faint' | 'sendIn', ... }
      this.lastHit = 0; // when the leader last landed a hit (the fight's start until then)
      this.downYou = (G.Game.roster || []).map((m) => !!m.dead);
      this.downOwn = leader.members.map((m) => !!m.dead);
      this.yourActive = G.Game.activeIndex;
    }
    /** One frame of the fight: faints on either side and your send-ins become events, and old hits leave the long window. */
    tick(dt) {
      this.t += dt;
      (G.Game.roster || []).forEach((m, i) => {
        if (m.dead && !this.downYou[i]) this.feed.push({ k: 'faint', side: 'yours' });
        this.downYou[i] = !!m.dead;
      });
      this.leader.members.forEach((m, i) => {
        if (m.dead && !this.downOwn[i]) this.feed.push({ k: 'faint', side: 'own' });
        this.downOwn[i] = !!m.dead;
      });
      if (G.Game.activeIndex !== this.yourActive) {
        this.yourActive = G.Game.activeIndex;
        this.feed.push({ k: 'sendIn' });
      }
      while (this.hits.length && this.hits[0].t < this.t - LONG) this.hits.shift();
    }
    /** A hit seen on screen: 'dealt' (the leader's, on you) or 'taken' (yours, on the leader), `frac` of the struck mon's max HP. */
    hit(k, frac) {
      this.hits.push({ t: this.t, k, frac });
      this.feed.push({ k: k === 'dealt' ? 'landed' : 'taken', frac });
      if (k === 'dealt') this.lastHit = this.t;
    }
    /** The events since the last call, each handed out once. */
    events() {
      return this.feed.splice(0);
    }
    /** The rolling windows: hits dealt and taken (fractions of max HP) over the last SHORT and LONG seconds, and the seconds since
     *  the leader last landed a hit. */
    windows() {
      const w = { dealt: 0, taken: 0, dealtLong: 0, takenLong: 0, sinceHit: this.t - this.lastHit };
      for (const h of this.hits) {
        w[h.k + 'Long'] += h.frac;
        if (h.t >= this.t - SHORT) w[h.k] += h.frac;
      }
      return w;
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
    /** THREATS (slice 2, #31): your shapes on the field as the screen shows them, one entry per cast of yours (a fan counts once) whose
     *  shapes reach `body` within `horizon` s: { serial, moveId, x, y, vx, vy, eta }, eta the seconds to the first contact, from its
     *  nearest shape. Positions, motion and sizes only: never a cooldown, a timer of yours or your next input. */
    threats(body, horizon, dt) {
      const out = new Map();
      for (const inst of G.MoveSim.list()) {
        const o = inst.cast && inst.cast.owner;
        if (!o || !o.isPlayer || o.isRival || inst.hitless || inst.armed === false || !inst.shape) continue;
        const v = velOf(inst, dt),
          eta = etaOf(inst, v, body, horizon);
        if (eta == null) continue;
        const k = inst.cast.serial,
          had = out.get(k);
        if (!had || eta < had.eta)
          out.set(k, { serial: k, moveId: inst.cast.moveId, x: inst.x, y: inst.y, vx: v[0], vy: v[1], eta });
      }
      return [...out.values()];
    }
  }

  /** A shape's motion on screen: its travel velocity, else how far it moved in the last step. */
  function velOf(inst, dt) {
    if (inst.vx != null) return [inst.vx, inst.vy];
    return dt > 0 && inst.prevX != null ? [(inst.x - inst.prevX) / dt, (inst.y - inst.prevY) / dt] : [0, 0];
  }
  /** Seconds until a shape first touches the body, or null when it does not within `horizon`. A still shape (a strike waiting to land,
   *  a beam, a nova) is a threat while the body is inside it and it lands in time; a moving one, when its straight path passes within
   *  its radius plus the body's. */
  function etaOf(inst, [vx, vy], b, horizon) {
    const s = inst.shape,
      wait = inst.wait || 0;
    if (wait > horizon) return null;
    const v2 = vx * vx + vy * vy;
    if (s.family === 'linear' || v2 < 1) return G.MoveGeom.contains(s, inst.x, inst.y, b.x, b.y, b.r) ? wait : null;
    const rx = b.x - inst.x,
      ry = b.y - inst.y,
      reach = s.r + b.r,
      t = G.U.clamp((rx * vx + ry * vy) / v2, 0, horizon),
      d2 = (rx - vx * t) ** 2 + (ry - vy * t) ** 2;
    if (d2 > reach * reach) return null;
    return Math.max(0, t - Math.sqrt((reach * reach - d2) / v2));
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
  // a hit on a leader mon names it (enemyId); a leader mon's hit on you names none, so its shape says whose it is
  G.SimBus.on('move:hit', (ev) => {
    if (!cur) return;
    const team = cur.leader.members;
    if (ev.enemyId != null) {
      const m = team.find((x) => x.id === ev.enemyId);
      if (m) cur.hit('taken', (ev.dmg || 0) / Math.max(1, m.maxHp));
      return;
    }
    const inst = G.MoveSim.list().find((i) => i.id === ev.instId),
      pl = G.Game.player;
    if (inst && inst.cast && team.includes(inst.cast.owner) && pl)
      cur.hit('dealt', (ev.dmg || 0) / Math.max(1, pl.maxHp));
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
