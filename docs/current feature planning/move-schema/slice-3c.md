# Slice 3c: sim core, headless, damage only

Back to slice-overview.md. Prior slice: slice-3b.md. Next: slice-3d.md.

## Objective
G.MoveSim and the damage applier for the simplest closed set of axis values, running with no canvas, camera or audio, deterministic under a seeded rng.

## Reads
Architecture A, B (frame order steps 4, 6, 7, 9 to 12), C1 to C7, D1 to D11, D16 to D23, E (move-sim and move-effects tables), F (R3, R6 only as a boundary), docs/SIM-PRESENT-BOUNDARY.md. Search stats.js (attackFactor, applyDamage), Enemy.hurt, G.EnemyMgr.queryCircle, G.Types, G.Weather, G.SimBus (record). Review section 9.1 rows Q8, Q12, Q13, Q14 and 9.3 row F1.

## Build
- js/systems/move-sim.js and js/systems/move-effects.js (damage only), harness docs/proposals/move-sim-harness.js. Not loaded by the game.
- Covers: cooldown tick and cast (the cast gate waits for a target within range and retries every 0.05 s; a stunned owner casts nothing; fizzle spends the cooldown); CastContext; the root-instance fan (count with spread as a total fan, 2 pi / count at 2 pi or more); anchors caster, target and world; motions static and travels, including path curve, path oscillate and turnRate as a clamped turn in rad/s (D23, D24); grow (D21); endOn time, wall, offScreen and ownerDeath; pierce (0, n, UNLIMITED); hit policies oncePerInstance and interval; payload damage through the existing damage model (D6 to D11, attacker half computed at hit time); events 'move:cast', 'move:hit', 'move:end'; setRng and injected dt and time.
- Any payload effect other than damage that appears in the data is ignored in this slice (riders arrive in 4a).
- Instances take their first step the frame after they spawn (R6 boundary).

## Canary moves
Tackle, Ember, Water Gun, Hydro Pump, Heat Wave, Mud Shot, Flamethrower (aimTrack ignored until 4c).

## Tests
Tackle hits every enemy in its arc once. Ember dies on its first enemy. Water Gun passes one and dies on the second. Hydro Pump hits every enemy in the band. Heat Wave reaches each enemy once as it grows. Flamethrower hits a standing enemy 5 times in 1 s. Mud Shot fans evenly around the circle. Damage per hit equals an independent hand computation of D6 to D11 within 1e-9 for a fixed owner and enemy. Both dt 1/60 and 1/30 pass. The SimBus tape shows exactly one 'move:hit' per landed hit and one 'move:end' per instance with the right reason. The same seed gives an identical tape. Synthetic cases for curve, oscillate and turnRate against D23 and D24.

## Exclusions
Riders, emit, returns, orbits, repositions, falls, specials, chains, rendering, game wiring.

## Decisions needed
None. Jess reviews the damage numbers table.

## Proceed when
The harness is green at both timesteps and Jess has reviewed the numbers table.

## Notes carried from slice 3b
- Call G.MoveGeom.shapeOf with the lens in st; do not scale dimensions in spawnInstance (decision 2 in slice-3b.md).
- Pass maxEnemyR to boundsOf (linear shapes need it). Avoid the word kind in every new move-*.js file (the I1 guard scans comments too).
