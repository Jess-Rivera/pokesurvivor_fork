# Slice 3c: sim core, headless, damage only (DONE 2026-10-26)

Back to slice-overview.md. Prior slice: slice-3b.md. Next: slice-3d.md.

## Objective
G.MoveSim and the damage applier for the simplest closed set of axis values, running with no canvas, camera or audio, deterministic under a seeded rng.

## Reads
Architecture A, B (frame order steps 4, 6, 7, 9 to 12), C1 to C7, D1 to D11, D16 to D23, E (move-sim and move-effects tables), F (R3, R6 only as a boundary), docs/SIM-PRESENT-BOUNDARY.md. Search stats.js (attackFactor, applyDamage), Enemy.hurt, G.EnemyMgr.queryCircle, G.Types, G.Weather, G.SimBus (record). Review section 9.1 rows Q8, Q12, Q13, Q14 and 9.3 row F1.

## Build
- js/systems/move-sim.js and js/systems/move-effects.js (damage only), harness docs/proposals/move-sim-harness.js. Not loaded by the game.
- Covers: cooldown tick and cast (the cast gate waits for a target within range and retries every 0.05 s; a stunned owner casts nothing; fizzle spends the cooldown); CastContext; the root-instance fan (count with spread as a total fan, 2 pi / count at 2 pi or more); anchors caster, target and world; motions static and travels, including path curve, path oscillate and turnRate as a clamped turn in rad/s (D23, D24); grow (D21); endOn time, wall, offScreen and ownerDeath; pierce (0, n, UNLIMITED); hit policies oncePerInstance and interval; payload damage through the existing damage model (D6 to D11, attacker half computed at hit time); events 'move:cast', 'move:hit', 'move:end'; setRng and injected dt and time.
- Any payload effect other than damage that appears in the data is ignored in this slice (riders arrive in 4a).
- Root instances take their first step in their cast frame (S9); only children (slice 4d) are deferred to the next frame (R6).

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
- Open lens gap (left for later by Jess): legacy Wide/Zoom Lens also scaled beam length and targeting reach (combat.js reach()). shapeOf does not scale linLength yet. Decide before 3d.

## Decisions made in this slice (Jess, 2026-10-26; also in review 9.2 and architecture D23, D36, R9, E)
- S1 cast gate: a caster-anchored static shape waits until the target is within min(range, reach + target radius); reach is the shape's outer radius or length at full growth, lens included (shapeOf). Moving shapes gate on range.
- S2 `direction` waits for any live enemy within range (TUNING.RANGE when the move has none); `none` and `self` never wait.
- S3 aim for `direction` and `none` is owner.aim at cast. `nearest` is the plain nearest (no player.js boss/threat priority).
- S4 turnRate steers at the cast target, then one re-pick of the nearest live enemy within range of the instance, then straight.
- S5 offScreen uses a view rectangle passed as data (G.MoveSim.setView), 260 px margin as legacy.
- S6 G.Status.fizzle(h, rng) takes an optional rng (default Math.random, game unchanged).
- S7 defender helpers (enemy Def/SpD, defending level, defender stage, type x weather with the Power Stone floor, crit chance) copied into move-effects.js until slice 7 deletes combat.js.
- S8 pierce counts distinct enemies, spent in sweep order (distance from the previous position, ties by id); interval re-hits do not spend it.
- S9 root instances act in their cast frame; only children (none yet) are deferred (R6).
- S10 nearest ties go to the lower enemy id, so the rng carries only crits and fizzles.
- Lens gap folded in: shapeOf scales linLength (beam length), never linWidth. Orbit radius stays in 4c.
- Conventions: age advances before collision, so an endOn time T instance collides on ceil(T / dt) steps; 1e-9 tolerance on the cooldown, rehit and end-time comparisons; D3 keeps the legacy reset (no carry-over); D23 moves then turns; grow per distance uses base-path distance; wall end = G.World.projectileBlock wall or solid non-destructible prop; 'move:end' reason 'pierce' for exhaustion; 'move:hit' typeMult is the chart only; no 'move:cast' on a fizzle; persistent slots and `location` targeting are skipped until 4c/4d; no legacy aim jitter.

## What was built
- js/systems/move-sim.js (G.MoveSim: tick, step, setRng, setView, clear, list). Tables keyed by targeting (aim and gate), motion (static, travels), hit policy and endOn condition. Not loaded by the game.
- js/systems/move-effects.js (G.MoveEffects.applyHit): damage only, attacker half via owner.moveFactor at hit time, defender half through G.Stats.applyDamage, then type x weather, held items, crit 1.5 and a 1 HP floor; Enemy.hurt called as-is.
- js/systems/move-geom.js: linLength now takes the lens (harness cases updated).
- js/systems/status.js: fizzle takes an optional rng (two lines).
- docs/proposals/move-sim-harness.js (1,930 checks, picked up by check.js), move-sim-golden.py (pinned numbers written from the architecture text), move-sim-mutate.js (24 mutations, all caught; run by hand).

## Results
check.js: 19/19 harnesses, I1 guard ok on 3 files, only the old move_parity hail self-test fails. Every canary passes at dt 1/60 and 1/30 with identical hit counts and end reasons. Same seed gives an identical tape. Damage matches the python numbers exactly.

## Contracts for 3d
- Owner shape the sim reads: x, y, r, aim, level, dead, cdMul, critChance, stgTeam, moveRadiusMul, stoneType, expertBelt, typeBoost, stMajor/stCnf (via G.Status), slots (groups of { id, t }), activeGroup(), moveFactor(m), stabFor(m), onDealt(dmg), dmgDealt, id.
- Call G.MoveSim.setView each frame and G.MoveSim.tick(dt, player, now) right after G.Combat.tick. The slot timer `t` is shared with the legacy slot object, so route a slot to exactly one of the two systems.
- Open for 3d: props (do player moves hit rocks, chests, grass, and do solid props spend pierce), Tackle reach feel (no player-body term now), boss priority for ranged moves gone.
