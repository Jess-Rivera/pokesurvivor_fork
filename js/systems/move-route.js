/* ============ move-route.js: which slots the new move system runs (G.MoveRoute, slice 3d) ============
 *
 * Routing by move id behind a dev flag (decision D-4). This is not a data bridge: nothing is derived from the legacy
 * definition, a routed slot simply belongs to G.MoveSim instead of G.Combat. Removed in slice 7.
 *
 *   on                 true only with BOTH ?dev and ?newcombat in the URL. Off, nothing here runs and the game is unchanged.
 *   ROUTED             the ONE list of move ids the new path supports. It grows with each slice.
 *   routed(id)         flag on, single-player run (co-op stays legacy) and the id is in ROUTED. combat.js skips these slots
 *                      (both its recharge loop and its cast loop), G.MoveSim runs them, so each slot timer has one owner.
 *   tick(dt, pl, now)  game.js calls it right after G.Combat.tick: the camera view for offScreen, then G.MoveSim.tick.
 *   reset()            drops every live instance (run start, back to the menu).
 */
G.MoveRoute = (() => {
  const on = /[?&]dev\b/.test(location.search) && /[?&]newcombat\b/.test(location.search);
  const ROUTED = new Set(['tackle', 'ember', 'water-gun', 'hydro-pump', 'heat-wave', 'mud-shot', 'flamethrower',     // 3c / 3d
    'body-slam', 'string-shot', 'ice-beam', 'bite', 'psycho-cut', 'giga-drain', 'bulldoze',                          // 4a riders
    'swords-dance', 'dragon-dance', 'aqua-ring', 'substitute', 'dragon-rage', 'hex', 'thunderbolt']);               // 4b self-casts, specials, chains
  const routed = id => on && !G.Coop.active && ROUTED.has(id);
  let owner = null;

  function tick(dt, pl, now) {
    if (owner && owner !== pl) G.MoveSim.clear(owner);     // a Pokemon swap: the benched one's shapes, commitments, heal over time and shield end (4b)
    owner = pl;
    const C = G.Camera;
    G.MoveSim.setView({ x: C.left(), y: C.top(), w: C.w, h: C.h });
    G.MoveSim.tick(dt, pl, now);
  }
  function reset() { owner = null; G.MoveSim.clear(); }

  G.MoveSim.setFilter(routed);
  if (on) console.log('[MoveRoute] new combat path ON for: ' + [...ROUTED].join(', '));
  return { on, ROUTED, routed, tick, reset };
})();
