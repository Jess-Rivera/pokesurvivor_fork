/* ============ elite.js: the overworld elite (G.Elite) ============
 * A wild entity scaled up, with its mods on top (entity model slice 1, Jess 2026-11-05). Everything not listed here is inherited from
 * G.WildEntity (enemy.js), so a change to wild entities reaches elites by itself. G.Spawner.placeElite builds it; spawning, the HP model,
 * cadence and enrage live in G.Elites (systems/elites.js). COMBAT-RULES "Host model".
 */
G.Elite = class Elite extends G.WildEntity {
  /** @param def a wild def carrying the `elite` descriptor (G.Elites.spawn) */
  constructor(def, x, y, sc) {
    super(def, x, y, sc, false);
    this.elite = def.elite;
    this.xpMul *= this.elite.xpMul;
    this.carrier = null;
    this.carrierSec = false;
    this.immovable = true;
    this.koImmune = true;
    this.strongStatus = true;
    this.noMorale = true;
    this.ignoresLiquid = true;
    this.bigFx = true;
    this.barColor = '#ff9f43';
  }

  sizeFor(def) {
    return Math.max(1.5, G.WildEntity.bossScale(def.dex));
  }

  /** Gym-gate escalation is for plain wild entities. */
  spawnBump() {
    return 0;
  }

  spawnHp(def) {
    return def.elite.hp;
  }

  /** Never golden. */
  makeGolden() {}

  /** The player's first damage starts its enrage clock. */
  onDamaged() {
    G.Elites.engage(this);
  }

  /** A burst of big XP orbs (plain: no x10 ticket / magnet), a guaranteed Berry, a chance at an item, a TTK readout. */
  dropLoot() {
    G.Camera.kick(0.6);
    G.Pickups.dropXp(this.x, this.y, this.xp, true);
    G.Drops.roll('elite', this.x, this.y); // the guaranteed Berry, a ground roll, a chance at an item (data/drops.js)
    G.Elites.noteDeath(this);
  }

  /** Name tag over the bar; it turns red with the enrage countdown once engaged. */
  drawBarTag(ctx, y) {
    const left = G.Elites.enrageIn(this),
      enr = left === 0;
    ctx.save();
    ctx.font = '700 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    ctx.fillText(
      this.name.toUpperCase() + (enr ? ' · ENRAGED' : left != null ? ' · ' + Math.ceil(left) + 's' : ''),
      this.x + 1,
      y - 2 + 1
    );
    ctx.fillStyle = enr ? '#ff5050' : '#ffd9a8';
    ctx.fillText(
      this.name.toUpperCase() + (enr ? ' · ENRAGED' : left != null ? ' · ' + Math.ceil(left) + 's' : ''),
      this.x,
      y - 2
    );
    ctx.restore();
  }
};
