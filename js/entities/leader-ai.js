/* ============ leader-ai.js: the AI player that drives a Player-entity leader (G.LeaderAI) ============
 * Spec: docs/LEADER-AI.md (Jess 2026-11-08). One AI player per leader team; it acts only through the controller your keyboard
 * answers, the seven calls of G.PlayerEntity.IDLE, so your rules (slot hold, swap lock, trap, Fly, stuns) decide every press.
 * Slice 1 (#22): the controls layer. It wraps G.Boss.GymBrain: the brain's heading becomes `axis` and its slot choice `slots`, so
 * Misty and Brock play as before. `swapSlot` answers a swap request (dev and test only until slice 2 decides swaps); `dodge`,
 * `shake`, `swapDir` and `cycles` answer nothing yet (shake-off stays the authored autoShake). What it can see: G.LeaderInfo.
 */
G.LeaderAI = class LeaderAI {
  /** @param members the leader mons it drives, in slot order; @param team their G.Team, or null for a lone mon */
  constructor(members, team = null) {
    this.members = members;
    this.team = team;
    this.slotAnswer = LeaderAI.NONE; // this frame's slot presses, set only while the brain's pick is pressed (pressSlot)
    this.swapReq = -1; // a requested team slot, waiting for the arena's swap step
    this.swapAnswer = -1; // the team slot `swapSlot` answers, set only during that step (swapFrame)
    this.controller = {
      axis: () => this.active.heading,
      dodge: () => false,
      shake: () => false,
      swapSlot: () => this.swapAnswer,
      swapDir: () => 0,
      slots: () => this.slotAnswer,
      cycles: () => LeaderAI.NONE,
    };
    for (const m of members) {
      m.ai = this;
      m.controller = this.controller;
    }
  }

  /** The mon on the field. */
  get active() {
    return this.team ? this.team.active : this.members[0];
  }

  /** One frame for mon `e`: its heading from the brain (none while stunned, when the brain does not step at all), with the body's
   *  edge unstick on top. The brain's slot choice is pressed inside its step (pressSlot), before its casts. */
  think(e, dt, pl) {
    e.heading = G.Status.stunned(e) ? [0, 0] : e.unstick(dt, this.steer(e, dt, pl));
  }
  /** Asks the brain where to go: the way to you (around walls, G.Path) and speed 1, so its answer is a heading for the controller. */
  steer(e, dt, pl) {
    let [dx, dy] = G.U.norm(pl.x - e.x, pl.y - e.y);
    const pd = G.Path.dirFor(e, pl);
    if (pd) [dx, dy] = pd;
    const [vx, vy] = e.brain.step(dt, pl, G.U.dist(e.x, e.y, pl.x, pl.y), dx, dy, 1, (i) => this.pressSlot(e, i));
    return [vx, vy];
  }
  /** The brain chose slot i (or -1): `slots` answers it for this press only, and the body reads its controller as yours does. */
  pressSlot(e, i) {
    this.slotAnswer = i >= 0 ? [i] : LeaderAI.NONE;
    e.takeSlotInput();
    this.slotAnswer = LeaderAI.NONE;
  }

  /** Asks to swap to team slot `slot` (G.Debug.leaderSwap and the harness; slice 2 makes its own). Pressed on the next swap step. */
  requestSwap(slot) {
    this.swapReq = slot;
  }
  /** The arena's swap step: `swapSlot` answers the request while `read` runs, then nothing. A refused request is dropped, as a
   *  key press of yours is: it does not wait for the lock to end. */
  swapFrame(read) {
    this.swapAnswer = this.swapReq;
    this.swapReq = -1;
    try {
      read(this.controller);
    } finally {
      this.swapAnswer = -1;
    }
  }
};
G.LeaderAI.NONE = Object.freeze([]);
