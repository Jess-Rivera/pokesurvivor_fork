# Slice 3b: geometry module (DONE 2026-10-26)

> HISTORY (frozen 2026-10-28, Phase 4 batch B4b). This is the record of an executed slice. Its decisions are absorbed into docs/MOVE-AXIS-SCHEMA.md (grammar), docs/current feature planning/combat-architecture.md section H and D (runtime rules), docs/MOVE-INTENT.md (per-move rulings), docs/COMBAT-RULES.md (combat rules). Where this text and those documents differ, those documents win. Body below unchanged.

Back to slice-overview.md. Prior slice: slice-3a.md. Next: slice-3c.md.

## Objective
G.MoveGeom: the one implementation of collision geometry (invariant I6). Pure math, no state, no canvas. Everything later (the sim, the harness, the hitbox overlay, the renderer) calls it.

## Reads
Architecture A (I1, I3, I6, I7, I9), D17 to D22, the move-geom.js table in E, B (the simulation and presentation boundary). In combat.js search segDist2 and inArc only. Review section 9.1 rows Q1 and Q13.

## Build
- js/systems/move-geom.js (new, NOT added to dev.html or the NEED array). Functions: segDist2 (squared distance from a point to a segment, same results as legacy); shapeOf (builds the step's plain shape object from the instance's dimensions with the grown value applied, position, heading and the lens multiplier; radArc clamped to 2 pi); contains (is an enemy circle inside or swept through the shape, chosen by a table keyed by shape family: radial point, radial arc including full circle, linear); boundsOf (a query circle that over-covers the swept shape, never under).
- Containment rules: radial point uses the swept test (D17); radial arc uses distance plus an angular offset with the enemy-size tolerance (D18); full circle is the arc without the angle (D19); linear projects onto the band axis with both ends and the sides widened by the enemy radius (D20). A growing shape is tested at its current size each step (D22); the grown value itself comes from D21 (start is the authored dimension, capped by grow.max).
- Harness: docs/proposals/move-geom-harness.js, in the style of the existing harnesses (picked up by tools/check.js).
- check.js gains the I1 guard: a step that fails if any new combat file (js/systems/move-*.js) reads or mentions `kind` as a move property. (The architecture put this in 3c and the validation plan in 3b; it lands here because it is cheap and guards every file from the first one.)

## Tests
Hand-computed truth tables for each shape family; a fast point that would tunnel without the sweep; arc edges with the enemy radius; linear band ends and sides; a growing ring contains an enemy from the step where the D21 radius first reaches it; segDist2 agrees with legacy on random cases (load the function from combat.js in a stub G as other harnesses do, or compare against a transcribed copy).

## Exclusions
No instances, no sim, no game wiring, no payloads.

## Decisions needed
None.

## Proceed when
The harness passes inside check.js and the I1 guard is in place.

## What was built (2026-10-26)
- js/systems/move-geom.js (G.MoveGeom, not loaded by the game): segDist2 (a copy of the legacy function), shapeOf, contains, boundsOf. Containment and bounds are tables keyed by shape family: point (radial, no radArc), arc, circle (radArc at 2 pi or more, after the lens and the clamp), linear.
- docs/proposals/move-geom-harness.js: 23,746 checks. Truth tables per family, point sweep versus tunneling, arc edges with the enemy radius, the apex rule, heading wrap, linear ends and sides, a growing ring first reaching an enemy on step 11 and a capped one on step 30, shapeOf purity, segDist2 parity with the legacy source read from combat.js (3000 seeded cases), boundsOf never under-covering contains (6000 random shapes).
- tools/check.js: the I1 guard (step 2b). It fails if the whole word kind appears anywhere in a js/systems/move-*.js file, comments included. Do not use that word in new combat files.

## Decisions made in this slice (Jess, 2026-10-26)
1. D18 amended: an enemy that covers the arc apex (distance at or below its radius) is inside at any angle. Also avoids dividing by zero.
2. The lens is applied inside shapeOf, to the grown radius and radArc only (radArc clamped to 2 pi). Linear dimensions are not scaled. AMENDED in slice 3c: linLength is scaled too (beam length), linWidth never. The authored grow.max number is left alone, but the lens multiplies the grown value after the cap, so a ring still ends at max x lens. spawnInstance (3c) must NOT pre-scale dimensions.
3. A radial shape with no radArc is a point. Confirmed against the data: 25 points, 21 arcs, 7 full circles, 5 linear, 12 shapeless.

## Contracts for 3c and later
- shapeOf(space, grow, st), st = { x, y, heading, age, dist, lens }. age counts from activation and is clamped at 0, so a delayed instance shows its start size.
- contains(shape, prevX, prevY, ex, ey, er): only the point family reads prev. Moving arcs and linear shapes are tested at the current position only (no substeps, as the architecture says, until a test shows a miss).
- boundsOf(shape, prevX, prevY, maxEnemyR): the result is for a query that adds each enemy radius (EnemyMgr.queryCircleEach does, checked in enemy.js). maxEnemyR is read only for linear shapes, whose D20 test widens both axes by the enemy radius (square corners). The caller must pass at least the largest enemy radius it can meet.
- D20 is a box, legacy beam was a rounded capsule, so corners differ slightly. Accepted as D20 is written.

## Results
check.js: 18/18 harnesses, I1 guard ok, export current, 63/63 valid, resolved 63/63 valid. The only failure is the old move_parity hail self-test.
