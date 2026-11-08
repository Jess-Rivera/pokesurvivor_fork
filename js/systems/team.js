/* ============ team.js: a team of fighters (G.Team, entity model slice 2) ============
 *
 * Who is on the field, the 5 s team swap lock, the swap and faint rules, bench ticking, and the stores every member shares
 * (team stages, team cards, run items, dodge charges, the berry bag, the unspent links). Plan: docs/proposals/host-model-plan.md
 * slice 2. Pure rules: no sound, camera, text or input here. game.js shows the effects and passes in the run-progress carry, so a
 * GymLeader can own a Team later (slice 7) with its own carry.
 *
 * Not here: the "slot hold" (Player.swapT, the hold before switching MOVE slots) belongs to each fighter (slice 3).
 */
G.Team = (() => {
  const SWAP_LOCK = 5, // s before another manual swap
    SWAP_IFRAME = 0.5; // s of invulnerability for the member coming in

  class Team {
    /**
     * @param members  fighters in slot order, each with its teamSlot (0-5); members[0] leads
     * @param carry    (from, to): copies the run progress onto the member coming in (game.js), or null
     */
    constructor(members, carry = null) {
      this.members = members;
      this.activeIdx = 0;
      this.lock = 0; // s until a manual swap is allowed again
      this.bonds = 0; // unspent links (gym wins): one count for the whole team, Player.bonds reads and writes it
      this.carry = carry;
      this.link();
    }

    /** One object per store, the same on every member and never reassigned. Team stages are the lead's own store. */
    link() {
      const m = this.members;
      if (!m.length) return;
      this.stages = m[0].stgTeam;
      this.cards = G.TeamCards.store();
      this.runItems = [];
      this.dodges = { cd: [0, 0], gap: 0 }; // a swap never hands you fresh dodge charges
      this.berries = [];
      for (const f of m) {
        f.stgTeam = this.stages;
        f.teamCards = this.cards;
        f.runItems = this.runItems;
        f.dodges = this.dodges;
        f.berries = this.berries;
        f.team = this;
      }
    }

    /** The member on the field. */
    get active() {
      return this.members[this.activeIdx];
    }

    living() {
      return this.members.filter((f) => !f.dead);
    }

    /**
     * May the member on the field swap to index i now? 'ok', 'locked' (the 5 s lock), 'trapped', or 'no' (same slot, an empty or
     * fainted target, not playing, fainted, in the air). Checked in this order, so a locked swap never reports the trap.
     */
    canSwap(i, playing = true) {
      const m = this.members,
        pl = this.active;
      if (i < 0 || i >= m.length || i === this.activeIdx) return 'no';
      const next = m[i];
      if (!next || next.dead) return 'no';
      if (this.lock > 0) return 'locked';
      if (!playing || pl.dead) return 'no';
      if (pl.flyT > 0) return 'no'; // no team swaps in the air (Fly)
      if (G.Status.swapLocked(pl)) return 'trapped';
      return 'ok';
    }

    /**
     * Member i takes the field: the outgoing body ends its dodge, the incoming one takes its position and aim, the run progress
     * (carry) and a short invulnerability window. Shared by the manual swap, the faint swap and Re-Do so they never drift apart.
     */
    takeField(i) {
      const pl = this.active,
        next = this.members[i];
      pl.endDodge(); // the outgoing body grows back; the incoming one starts on foot
      next.x = pl.x;
      next.y = pl.y;
      next.aim = pl.aim;
      if (this.carry) this.carry(pl, next);
      next.invuln = Math.max(next.invuln || 0, SWAP_IFRAME);
      this.activeIdx = i;
      return next;
    }

    /** Manual swap: takes the field and locks swapping. Check canSwap first. */
    swap(i) {
      const next = this.takeField(i);
      this.lock = SWAP_LOCK;
      return next;
    }

    /** Faint swap or Re-Do: takes the field and clears the lock. */
    sendIn(i) {
      const next = this.takeField(i);
      this.lock = 0;
      return next;
    }

    /** After a faint: the living member with the LOWEST slot number (slot 1 first), or -1 when none is left. */
    nextOnFaint() {
      const pl = this.active,
        alive = this.members.filter((f) => !f.dead && f !== pl);
      if (!alive.length) return -1;
      const next = alive.reduce((a, b) => (b.teamSlot < a.teamSlot ? b : a));
      return this.members.indexOf(next);
    }

    /**
     * The member index a controller's swap input asks for this frame, or -1 (slice 3; LEADER-AI "Your controls only": yours and a
     * leader's AI player read the same way). Direct keys are by SLOT number, an empty slot or a fainted member does nothing; a
     * direction steps from the member on the field, skipping the fainted. Check canSwap before swapping.
     */
    requested(c) {
      const m = this.members,
        n = c.swapSlot();
      if (n >= 0) return m.findIndex((f) => f.teamSlot === n);
      const dir = c.swapDir();
      if (!dir) return -1;
      for (let step = 1; step <= m.length; step++) {
        const j = (this.activeIdx + dir * step + m.length * step) % m.length;
        if (!m[j].dead && j !== this.activeIdx) return j;
      }
      return -1;
    }

    tickLock(dt) {
      if (this.lock > 0) this.lock = Math.max(0, this.lock - dt);
    }

    /** Benched, standing members tick (statuses, DoT, stage drops); onFaint(f) runs right after one faints on the bench. */
    benchTick(dt, onFaint) {
      const pl = this.active;
      for (const f of this.members) {
        if (f === pl || f.dead) continue;
        f.benchUpdate(dt);
        if (f.dead && onFaint) onFaint(f);
      }
    }
  }

  return {
    Team,
    SWAP_LOCK,
    SWAP_IFRAME,
    create: (members, carry) => new Team(members, carry),
  };
})();
