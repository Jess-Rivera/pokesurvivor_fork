/* ============ combat.js: enemy attacks on the player ============
 * Enemy shots (walls and solid objects give cover) and enemy contact damage. Slice 7b-2a (Jess 2026-11-01): the
 * player's moves all run in G.MoveSim, so the legacy player-move code (per-kind execution, ground fields, orbs,
 * player-shot collisions and the co-op ghost replay) is gone from this file.
 *
 * Everything happens on the ground plane: (x, y) are feet / shadow.
 */
G.Combat = (() => {
  /** STAB on a hit of type t from attacker a (slice 4b, H1 and S1): x1.5 when t is one of the attacker's types. */
  const stabOf = (a, t) => (a && t && a.types && a.types.includes(t) ? G.Stats.STAB : 1);

  function resolve(dt, pl, now) {
    const projectiles = G.Projectiles.all();

    // --- enemy shots: walls and solid objects give cover ---
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      if (G.World.projectileBlock(p.x, p.y, p.r)) {
        G.FX.burst(p.x, p.y - G.LIFT, p.color, 5, 70);
        projectiles.splice(i, 1);
        continue;
      }
      if (!(pl.flyT > 0) && G.U.dist2(p.x, p.y, pl.x, pl.y) < (p.r + pl.r) * (p.r + pl.r)) {
        // a flying player (Fly) is passed by
        const w = G.Log.on ? G.Log.who(p.src, 'shot') : null;
        const landed = pl.invuln <= 0;
        let res;
        if (p.atkFactor != null)
          res = pl.takeHit({ A: p.atkFactor, cat: p.atkCat, type: p.mtype, stab: stabOf(p.src, p.mtype), mul: p.mul, who: w });
        else res = pl.hurt(p.dmg, p.mtype, false, null, w);
        if (p.ail && landed && !pl.dead && res !== 'immune') pl.inflict(p.ail, p.ailHalf); // a Status carrier's shot (slice E1)
        G.FX.burst(p.x, p.y - G.LIFT, p.color, 7, 110);
        projectiles.splice(i, 1);
      }
    }

    // --- enemy <-> player contact ---
    if (pl.dead || pl.flyT > 0) return; // nothing touches a flying player
    for (const e of G.EnemyMgr.queryCircle(pl.x, pl.y, pl.r + 40)) {
      // Contact gap: wild melee reaches CONTACT.hit x the radius sum (it stops at CONTACT.stop x); bosses keep 1.0.
      const reach = (e.r + pl.r) * (e.boss ? 1 : G.Enemies.CONTACT.hit);
      if (G.U.dist2(e.x, e.y, pl.x, pl.y) > reach * reach) continue;
      if (e.touchCd > 0 || e.behavior === 'thief') continue;
      if (G.Status.stunned(e)) continue; // frozen or asleep enemies do not hit
      if (e.gym && e.mvRoot) continue; // a leader's dash (Quick Attack) hits only at its landing spot, never by touch (Jess 2026-11-02)
      // An active flanker only hits in its strike phase, and waits out your invulnerability instead of wasting the hit.
      if (e.fl && (e.fl.ph !== 'strike' || pl.invuln > 0)) continue;
      e.touchCd = 0.55;
      if (G.Status.fizzle(e)) continue; // paralysis / confusion: the strike fizzles
      e.strike(pl);
      // Wild: enemy attack factor + category via the A/D ratio. Boss: flat def.dmg (deferred).
      const w = G.Log.on ? G.Log.who(e, 'contact') : null;
      let res;
      if (e.atkFactor != null)
        res = pl.takeHit({ A: e.atkFactor, cat: e.atkCat, type: e.atkType, stab: stabOf(e, e.atkType), mul: e.contactMul(), who: w });
      else res = pl.hurt(e.dmg, e.atkType, false, null, w);
      if (e.carrierSec && !pl.dead && res !== 'immune') {
        const k = e.secAil();
        if (k) pl.inflict(k, true);
      } // a secondary carrier's touch (slice E1)
      if (e.fl) e.flankStruck();
      if (pl.hasItem('rockyhelmet')) e.hurt(15 + pl.level * 4, '#9aa6b5', e.x - pl.x, e.y - pl.y, 80);
      const [nx, ny] = G.U.norm(e.x - pl.x, e.y - pl.y);
      e.kx += nx * 150;
      e.ky += ny * 150;
    }
  }

  return { resolve };
})();
