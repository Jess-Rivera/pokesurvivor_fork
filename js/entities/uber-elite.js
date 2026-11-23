/* ============ uber-elite.js: the rescue event's guard (G.UberElite) ============
 * An elite (js/entities/elite.js) with a bigger HP budget, built and placed by G.Rescue (js/systems/rescue.js), not by G.Elites: it
 * does not take the single "alive elite" slot, the elite cadence or the wild-cap dip. Its power is the elite's, fixed (no enrage).
 * Its fight clock starts on the player's first hit and G.Rescue reads it; it only tells G.Rescue when it is hit and when it falls.
 * Acquisition spec section 2 (docs/AI Outputs/Issue-128/Acquisition v2 - Spec.txt), #135.
 */
G.UberElite = class UberElite extends G.Elite {
  constructor(def, x, y, sc) {
    super(def, x, y, sc);
    this.uber = true;
    this.atkFactor = this.atkFactor0 * def.elite.pow; // fixed: the elite enrage ramp is not applied to it
  }

  /** The first damage starts the fight clock (G.Rescue). */
  onDamaged() {
    G.Rescue.onUberHit(this);
  }

  /** The elite's loot, then the result goes to G.Rescue (it hands a win to the catch phase, #136). */
  dropLoot() {
    G.Camera.kick(0.8);
    G.Pickups.dropXp(this.x, this.y, this.xp, true);
    G.Candy.saveAndAnnounce(G.Drops.roll('elite', this.x, this.y, { loop: G.Gym.loop })); // #139 8a
    G.Rescue.onUberDown(this);
  }

  /** The name tag shows the fight clock once it runs, "UBER" before. */
  drawBarTag(ctx, y) {
    const left = G.Rescue.fightLeft();
    const text = 'UBER ' + this.name.toUpperCase() + (left != null ? ' · ' + Math.ceil(left) + 's' : '');
    ctx.save();
    ctx.font = '700 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillText(text, this.x + 1, y - 2 + 1);
    ctx.fillStyle = left != null && left < 10 ? '#ff5050' : '#9ae6b4';
    ctx.fillText(text, this.x, y - 2);
    ctx.restore();
  }
};
