/* ============ move-route.js: which slots the new move system runs (G.MoveRoute, slice 3d) ============
 *
 * Routing by move id (decision D-4). Slice 7b (Jess 2026-11-01): the ?newcombat flag is gone, every move runs in G.MoveSim and the
 * legacy player-move code is deleted (7b-2a). 7b-2b dropped the hand-kept ROUTED list: a move is routed when it has a resolved def
 * and is not retired (G.Moves.RETIRED: Bubble, Hail).
 *
 *   routed(id)         G.MoveSim's slot filter: the id has a def in G.MoveDefs and is not retired.
 *   tick(dt, pl, now)  game.js calls it every frame: the camera view for offScreen, then G.MoveSim.tick (the player's slots, then the step).
 *   reset()            drops every live instance (run start, back to the menu).
 * Gym leaders cast through G.MoveSim too (slice 7a, D-ENEMY): their brains call G.MoveSim.castAt from the enemy update.
 */
G.MoveRoute = (() => {
  const routed = id => !!(G.MoveDefs && G.MoveDefs[id]) && !(G.Moves && G.Moves.RETIRED[id]);
  let owner = null;

  function tick(dt, pl, now) {
    const C = G.Camera;
    G.MoveSim.setView({ x: C.left(), y: C.top(), w: C.w, h: C.h });
    if (owner && owner !== pl) G.MoveSim.clear(owner);     // a Pokemon swap: the benched one's shapes, commitments, heal over time and shield end (4b)
    owner = pl;
    G.MoveSim.tick(dt, pl, now);
  }
  function reset() { owner = null; G.MoveSim.clear(); }

  G.MoveSim.setFilter(routed);
  return { routed, tick, reset };
})();
