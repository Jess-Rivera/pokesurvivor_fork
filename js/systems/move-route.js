/* ============ move-route.js: which slots the new move system runs (G.MoveRoute, slice 3d) ============
 *
 * Routing by move id (decision D-4). Slice 7b flip (Jess 2026-11-01): the ?newcombat flag is gone and every move runs in G.MoveSim;
 * 7b-2a deleted the legacy player-move code. Bubble and Hail are retired (G.Moves.RETIRED), so every move in the pool is in ROUTED.
 * ROUTED itself goes in 7b-2b (the intent harness and tools/move_report.js still read it as text).
 *
 *   ROUTED             the list of move ids the new path runs.
 *   routed(id)         the id is in ROUTED (G.MoveSim's slot filter).
 *   tick(dt, pl, now)  game.js calls it every frame: the camera view for offScreen, then G.MoveSim.tick (the player's slots, then the step).
 *   reset()            drops every live instance (run start, back to the menu).
 * Gym leaders cast through G.MoveSim too (slice 7a, D-ENEMY): their brains call G.MoveSim.castAt from the enemy update.
 */
G.MoveRoute = (() => {
  const ROUTED = new Set(['tackle', 'ember', 'water-gun', 'hydro-pump', 'heat-wave', 'mud-shot', 'flamethrower',     // 3c / 3d
    'body-slam', 'string-shot', 'ice-beam', 'bite', 'psycho-cut', 'giga-drain', 'bulldoze',                          // 4a riders
    'swords-dance', 'dragon-dance', 'aqua-ring', 'substitute', 'dragon-rage', 'hex', 'thunderbolt',                  // 4b self-casts, specials, chains
    'fire-spin', 'leaf-storm', 'night-shade',                                                                        // 4c-1 persistence and orbits
    'razor-leaf', 'bonemerang', 'quick-attack', 'aerial-ace',                                                        // 4c-2 returns and repositions
    'vine-whip', 'karate-chop', 'lick', 'metal-claw', 'powder-snow', 'wing-attack', 'bug-bite',                      // 4r plain moves: arcs
    'dazzling-gleam', 'hyper-voice', 'dark-pulse', 'bug-buzz', 'flash-cannon', 'psybeam',                            // novas and beams
    'poison-sting', 'rock-throw', 'shadow-ball', 'thunder-shock', 'sludge', 'agility', 'harden',                     // shots and self-casts
    'psychic', 'confusion', 'bubble-beam', 'aura-sphere', 'rock-slide',                                              // 4c-3 travelling moves, location and delay
    'discharge', 'gust', 'fairy-wind', 'toxic', 'flame-wheel', 'toxic-spikes', 'will-o-wisp', 'meteor-mash', 'spikes']);  // 4d emitters, mines and the cap
  const routed = id => ROUTED.has(id);
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
  return { ROUTED, routed, tick, reset };
})();
