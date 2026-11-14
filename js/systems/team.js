/* ============ team.js: a team of fighters (G.Team, entity model slice 2) ============
 *
 * Who is on the field, the 5 s team swap lock, the swap and faint rules, bench ticking, and the stores every member shares
 * (team stages, team cards, run items, dodge charges, the berry bag, the unspent links, the Temporary Pocket). Plan: docs/proposals/host-model-plan.md
 * slice 2. Pure rules: no sound, camera, text or input here. game.js shows the effects and passes in the run-progress carry, so a
 * GymLeader can own a Team later (slice 7) with its own carry.
 *
 * Not here: the "slot hold" (Player.swapT, the hold before switching MOVE slots) belongs to each fighter (slice 3).
 */
G.Team = (() => {
  const SWAP_LOCK = 5, // s before another manual swap
    SWAP_IFRAME = 0.5, // s of invulnerability for the member coming in
    POCKET_SLOTS = 4, // the Temporary Pocket's slots (#90)
    NO_SASH_SAVE = -999; // Player.sashT with no Focus Sash save yet

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
      // The Temporary Pocket (#90, PAUSE-MENU section 3): items set aside in the pause menu, by slot. Each entry is
      // { kind: 'held', id, sashT } (a held item; the Focus Sash cooldown travels with it), { kind: 'berry', id },
      // { kind: 'run', id } (a run item), or null. Run only, never saved.
      this.pocket = new Array(POCKET_SLOTS).fill(null);
    }

    // ---------- berries and run items between their stores and the Temporary Pocket ----------
    /** The shared store for a pocket kind: the berry bag or the run items (a compact list, slot order). */
    storeOf(kind) {
      return kind === 'berry' ? this.berries : kind === 'run' ? this.runItems : null;
    }
    /** A run item's effect on or off for every member (berries have no standing effect). */
    turnStoreItem(kind, id, on) {
      if (kind !== 'run') return;
      const def = G.Items.BY[id];
      if (!def) return;
      for (const member of this.members) def[on ? 'on' : 'off'](member);
    }
    /** May `id` join the store of `kind`, taking the place of the item at `replacingIndex` (or none, -1)? No copy of the
     *  same item, and for run items only one of a group (the Stones) at once. */
    storeAccepts(kind, id, replacingIndex = -1) {
      const others = this.storeOf(kind).filter((other, index) => index !== replacingIndex);
      if (others.includes(id)) return false;
      const group = kind === 'run' && G.Items.BY[id] && G.Items.BY[id].group;
      return !group || !others.some((other) => G.Items.BY[other] && G.Items.BY[other].group === group);
    }
    /** Store item `storeIndex` of `kind` into pocket slot `pocketIndex`. An empty pocket slot takes it (the store closes
     *  the gap); one holding the same kind swaps with it in place. True when something moved. */
    storeToPocket(kind, storeIndex, pocketIndex) {
      const store = this.storeOf(kind);
      if (!store || pocketIndex < 0 || pocketIndex >= POCKET_SLOTS) return false;
      const id = store[storeIndex],
        incoming = this.pocket[pocketIndex];
      if (!id) return false;
      if (incoming) {
        if (incoming.kind !== kind || !this.storeAccepts(kind, incoming.id, storeIndex)) return false;
        this.turnStoreItem(kind, id, false);
        this.turnStoreItem(kind, incoming.id, true);
        store[storeIndex] = incoming.id;
      } else {
        this.turnStoreItem(kind, id, false);
        store.splice(storeIndex, 1);
      }
      this.pocket[pocketIndex] = { kind, id };
      return true;
    }
    /** Pocket slot `pocketIndex` into store slot `storeIndex` of `kind` (`slotCount` bought). A filled store slot swaps;
     *  an empty bought one takes it at the end of the list. True when something moved. */
    pocketToStore(kind, pocketIndex, storeIndex, slotCount) {
      const store = this.storeOf(kind),
        incoming = this.pocket[pocketIndex];
      if (!store || !incoming || incoming.kind !== kind || storeIndex < 0 || storeIndex >= slotCount) return false;
      if (store[storeIndex]) return this.storeToPocket(kind, storeIndex, pocketIndex);
      if (store.length >= slotCount || !this.storeAccepts(kind, incoming.id)) return false;
      this.turnStoreItem(kind, incoming.id, true);
      store.push(incoming.id);
      this.pocket[pocketIndex] = null;
      return true;
    }

    // ---------- held items between members and the Temporary Pocket (the pause menu's moves) ----------
    /** How many items the Temporary Pocket holds. */
    pocketCount() {
      return this.pocket.filter(Boolean).length;
    }
    /** Swap `member`'s held item with pocket slot `index` (either side may be empty, not both). Each item goes through
     *  the Player's equip, so its on / off effects stay exact. True when something moved. */
    swapWithPocket(member, index) {
      if (!member || index < 0 || index >= POCKET_SLOTS) return false;
      const incoming = this.pocket[index];
      if (incoming && incoming.kind !== 'held') return false; // berries and run items never go on a Pokemon
      if (!incoming && !member.item) return false;
      const outgoing = member.item ? { kind: 'held', id: member.item, sashT: member.sashT } : null;
      member.equip(incoming ? incoming.id : null);
      member.sashT = incoming ? incoming.sashT : NO_SASH_SAVE;
      this.pocket[index] = outgoing;
      return true;
    }
    /** Swap two pocket slots (a move into an empty one). True when something moved. */
    swapPocketSlots(fromIndex, toIndex) {
      const pocket = this.pocket;
      if (fromIndex === toIndex || !pocket[fromIndex] || toIndex < 0 || toIndex >= POCKET_SLOTS) return false;
      [pocket[fromIndex], pocket[toIndex]] = [pocket[toIndex], pocket[fromIndex]];
      return true;
    }
    /** Destroy everything in the Temporary Pocket; returns how many items were lost. */
    emptyPocket() {
      const lost = this.pocketCount();
      this.pocket.fill(null);
      return lost;
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
    POCKET_SLOTS,
    create: (members, carry) => new Team(members, carry),
  };
})();
