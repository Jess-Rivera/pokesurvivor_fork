# Slice 3b: geometry module (NEXT)

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
