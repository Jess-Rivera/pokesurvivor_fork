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
 *   MEMORY   slice 4 (#33): with a run store (G.LeaderMemory), every observation is written to the leader's record as it shows: your
 *            casts and bonds, slot switches, swaps (tagged with the visible reasons), dodges, field time and range; at the fight's
 *            end, one lead sighting (your mon with the most field time). STALE REVEALS: a move remembered from an earlier fight counts
 *            as revealed until that mon has STALE s on the field this fight, or has cast as many other moves as a mon carries (its
 *            move set is then seen without it).
 *   GAPS     #50 (#49 slice 1): when each move of yours was last cast and the clean gaps between two casts of one move (its slot
 *            kept active between them: a slot switch spoils the gap), both measured in that mon's field time, so a benched mon's
 *            clock waits as its cooldowns do today (player.js benchUpdate; LEADER-AI [Open] bench cooldowns: this clock is the one
 *            place that mirrors the bench rule). The gaps go to run memory with the reveal. G.LeaderBelief turns them into windows.
 *   Held-item reveals: #36.
 * It hears the sim through G.SimBus ('move:cast', 'slot:switch', 'move:hit'), registered once here (SimBus rules); the arena points it
 * at the fight's record (create) and away from it (end), so an old fight's record never hears a new cast.
 */
G.LeaderInfo = (() => {
  let cur = null; // the fight's record, or null outside a switched gym's fight
  const SHORT = 2,
    LONG = 10; // the rolling windows, seconds (LEADER-AI ROLLING WINDOWS, TUNE; long 10 s from #50)
  // slice 4 (all TUNE, BALANCE.md "Leader AI"): a stale reveal's field time, the swap tags' lines (your HP fraction; seconds since a
  // leader mon arrived), and the moves a mon carries when its own count is not known
  const STALE = 10,
    LOW = 0.3,
    SENT = 2,
    FULL = 4;

  class Info {
    /** @param leader the leader's G.Team; @param gymId its gym, whose run record (G.LeaderMemory) this fight reads and writes */
    constructor(leader, gymId = null) {
      this.leader = leader;
      this.mem = G.LeaderMemory.record(gymId); // null with no run store
      this.fight = this.mem ? this.mem.fights + 1 : 1;
      this.stale = new Map(); // key -> the moves remembered from earlier fights
      if (this.mem)
        for (const [k, m] of this.mem.mons) {
          const ids = [...m.moves.keys()];
          if (ids.length) this.stale.set(k, ids);
        }
      this.field = new Map(); // key -> seconds on the field this fight
      this.dodging = false;
      this.leaderIdx = leader.activeIdx;
      this.leaderAt = 0; // when a leader mon last took the field (the first one at the fight's start)
      this.mons = new Map(); // key -> { moves: [ids, first cast first], bonds: [[ids]], run: [ids since the last switch] }
      this.lastCast = new Map(); // key -> Map(move id -> that mon's field time at its last cast this fight, since the last switch)
      this.gaps = new Map(); // key -> Map(move id -> [clean gaps, s]) this fight, used when there is no run store
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
      if (this.leader.activeIdx !== this.leaderIdx) {
        this.leaderIdx = this.leader.activeIdx;
        this.leaderAt = this.t;
      }
      if (G.Game.activeIndex !== this.yourActive) {
        this.swapped(this.yourActive, G.Game.activeIndex);
        this.yourActive = G.Game.activeIndex;
        this.feed.push({ k: 'sendIn' });
      }
      while (this.hits.length && this.hits[0].t < this.t - LONG) this.hits.shift();
      this.watchYou(dt);
    }
    /** Your mon on the field this frame: its field time, its range to the leader's mon and the start of a dodge. */
    watchYou(dt) {
      const m = (G.Game.roster || [])[G.Game.activeIndex],
        pl = G.Game.player;
      if (!m || m.dead) return;
      const key = this.keyOf(m);
      this.field.set(key, (this.field.get(key) || 0) + dt);
      const dodging = !!(pl && pl.dodgeT > 0),
        started = dodging && !this.dodging;
      this.dodging = dodging;
      if (!this.mem) return;
      const r = G.LeaderMemory.mon(this.mem, key),
        e = this.leader.active;
      r.fieldT += dt;
      if (pl && e && !e.dead) r.range += G.U.dist(pl.x, pl.y, e.x, e.y) * dt;
      if (started) r.dodges++;
    }
    /** You changed the mon on the field from roster index i0 to i1: a send-in after a faint, or a swap tagged with its reasons. */
    swapped(i0, i1) {
      const R = G.Game.roster || [],
        out = R[i0],
        into = R[i1];
      if (!this.mem || !out || !into) return;
      const kIn = this.keyOf(into);
      if (out.dead) return G.LeaderMemory.bump(this.mem.team.afterFaint, kIn);
      const r = G.LeaderMemory.mon(this.mem, this.keyOf(out));
      r.swapsOut++;
      G.LeaderMemory.bump(r.into, kIn);
      for (const k of this.tagsOf(out)) r.tags[k]++;
      G.LeaderMemory.mon(this.mem, kIn).swapsIn++;
    }
    /** LEADER-AI WHY YOU SWAPPED: what the screen showed as mon `m` of yours left: low HP (under LOW), a type disadvantage (the
     *  leader's mon on the field has a type that hits it super effectively), a status or a trap, its slot on cooldown (the HUD ring),
     *  a leader mon sent in within SENT s. */
    tagsOf(m) {
      const out = [],
        e = this.leader.active,
        types = (m.mon && m.mon.types) || (G.DEX_BY[m.dex] && G.DEX_BY[m.dex].types) || [];
      if (m.maxHp > 0 && m.hp / m.maxHp < LOW) out.push('low');
      if (e && types.length && (e.types || []).some((t) => G.Types.mult(t, types) > 1)) out.push('disadvantage');
      if (m.stMajor || m.stTrap) out.push('status');
      const g = m.slots && m.slots[m.active];
      if (g && g.length && g.every((s) => s.t > 0)) out.push('cooldown');
      if (this.t - this.leaderAt <= SENT) out.push('sentIn');
      return out;
    }
    /** The fight is over: one lead sighting for your mon with the most field time, and the fight is booked. */
    close() {
      if (!this.mem) return;
      let best = null;
      for (const [k, t] of this.field) if (t > 0 && (!best || t > best.t)) best = { k, t };
      if (best) G.LeaderMemory.bump(this.mem.team.leads, best.k);
      this.mem.fights++;
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
    keyOf(m) {
      return keyOf(m);
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
    /** What a mon of yours has revealed: copies of its moves (this fight's first, then the stale ones still counting) and bonds. */
    reveals(m) {
      const key = this.keyOf(m),
        r = this.mons.get(key),
        moves = r ? r.moves.slice() : [];
      for (const id of this.staleOf(key, m.maxMoves || FULL)) if (!moves.includes(id)) moves.push(id);
      return { moves, bonds: r ? r.bonds.map((b) => b.slice()) : [] };
    }
    /** LEADER-AI STALE REVEALS: the remembered moves of `key` that still count: none once it has STALE s on the field this fight, or
     *  once this fight has revealed `full` moves of it (its whole set, seen without the rest). */
    staleOf(key, full) {
      const old = this.stale.get(key);
      if (!old || (this.field.get(key) || 0) >= STALE - 1e-9) return [];
      const seen = (this.mons.get(key) || { moves: [] }).moves;
      return seen.length >= full ? [] : old.filter((id) => !seen.includes(id));
    }
    /** A cast of yours: the move is revealed, and joins the bond of every move cast since the last switch. */
    cast(key, id) {
      const r = this.rec(key);
      if (!r.moves.includes(id)) r.moves.push(id);
      if (!r.run.includes(id)) r.run.push(id);
      const mem = this.mem && G.LeaderMemory.mon(this.mem, key);
      if (mem) mem.moves.set(id, this.fight);
      this.timeCast(key, id, mem);
      if (r.run.length < 2) return;
      r.bonds = merge(r.bonds, r.run, (b) => b);
      if (mem)
        mem.bonds = merge(
          mem.bonds,
          r.run,
          (b) => b.ids,
          (ids) => ({ ids, fight: this.fight })
        );
    }
    /** GAPS: the mon's field time is the clock (the one place that mirrors the bench rule). A second cast of a move with no switch
     *  since the first is a clean gap, kept for the fight and, with a run store, in the mon's run record. */
    castClock(key) {
      return this.field.get(key) || 0;
    }
    timeCast(key, id, mem) {
      const at = this.castClock(key);
      let last = this.lastCast.get(key);
      if (!last) this.lastCast.set(key, (last = new Map()));
      if (last.has(id)) {
        const gap = at - last.get(id);
        if (gap > 0) {
          let own = this.gaps.get(key);
          if (!own) this.gaps.set(key, (own = new Map()));
          for (const store of mem ? [own, mem.gaps] : [own]) {
            if (!store.has(id)) store.set(id, []);
            store.get(id).push(gap);
          }
        }
      }
      last.set(id, at);
    }
    /** Seconds of that mon's field time since its last cast of move `id` this fight, or null when not cast since the last switch. */
    sinceCast(m, id) {
      const key = this.keyOf(m),
        last = this.lastCast.get(key);
      return last && last.has(id) ? this.castClock(key) - last.get(id) : null;
    }
    /** Every clean gap seen of move `id` on mon `m`: the run's (earlier fights too) with a run store, else this fight's. */
    gapsOf(m, id) {
      const key = this.keyOf(m),
        mem = this.mem && this.mem.mons.get(key),
        own = mem ? mem.gaps : this.gaps.get(key);
      return (own && own.get(id)) || [];
    }
    /** A slot switch of yours (the ring): the bond run restarts; the memory counts it and the slot it went to. */
    switched(key, slot) {
      this.rec(key).run = [];
      const last = this.lastCast.get(key);
      if (last) last.clear(); // GAPS: a switch between two casts spoils the gap
      if (!this.mem) return;
      const r = G.LeaderMemory.mon(this.mem, key);
      r.switches++;
      if (slot != null) r.toSlot[slot] = (r.toSlot[slot] || 0) + 1;
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

  /** A mon of yours: its copy uid, else its team slot (the key of its reveals and of its run memory). */
  function keyOf(m) {
    return m.copyUid != null ? m.copyUid : 'slot:' + m.teamSlot;
  }

  /** A move is in one slot, so a bond that shares a move with this run is the same slot: merge them. `ids` reads a bond's moves,
   *  `make` builds one from its moves. */
  function merge(bonds, run, ids, make = (x) => x) {
    const mine = bonds.filter((b) => ids(b).some((x) => run.includes(x))),
      merged = [...new Set(mine.map(ids).flat().concat(run))];
    return bonds.filter((b) => !mine.includes(b)).concat([make(merged)]);
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
    if (k != null) cur.switched(k, ev.slot);
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
    /** A switched gym's fight starts: a fresh record for the leader team `leader` of gym `gymId`, the one the bus feeds from now on. */
    create(leader, gymId = null) {
      return (cur = new Info(leader, gymId));
    },
    /** The fight is over (or the arena reset): its lead sighting is booked and the bus feeds no record. */
    end() {
      if (cur) cur.close();
      cur = null;
    },
    keyOf,
    STALE,
    LOW,
    SENT,
    get current() {
      return cur;
    },
  };
})();
