# Slice 4r: route the remaining plain moves

Back to slice-overview.md. Prior: slice-4c-3.md (needs only 4c-1 for Bug Buzz). Next: slice-4d.md.

## Why this slice exists
Routing is an explicit id list (js/systems/move-route.js). The old plan routed only each slice's canaries and assumed the rest would follow, so 20 moves that need no new axis have no slice that routes them. Without this slice the flip in 7b would drop them.

## Objective
Route 20 moves whose axes are all built by 4c-1 (53 routed). No new axis, no new rule.

## Moves (axes from the resolved data, 2026-10-28)
- Static arcs and circles, nearest or none: vine-whip, karate-chop, lick, metal-claw, powder-snow, dazzling-gleam, wing-attack, bug-bite, hyper-voice, dark-pulse.
- Linear: flash-cannon, psybeam.
- Travelling points: poison-sting, rock-throw, shadow-ball, thunder-shock, sludge.
- Self-casts: agility, harden.
- Persistent static circle: bug-buzz (R7 from 4c-1; its foe Sp. Def cap of 1 is a MOVE-INTENT ruling, built in 4c-0).

## Rulings to respect
MOVE-INTENT bug-bite (cd 0.42, berrySteal stays a stub: routing must not throw on the stub), karate-chop (Fighting), metal-claw (maxStacks 1 after 4c-0), bug-buzz. Nova start sizes (MOVE-AXIS-SCHEMA Q1) for hyper-voice and dark-pulse.

## Scope
- move-route.js: add the 20 ids.
- A generic harness pass: every routed id casts headlessly against a standard dummy layout without throwing, hits what its geometry says, its damage matches an independent D6 to D11 computation, and its riders roll at the data chance (seeded).
- If any move exposes a gap in an existing axis, fix it in the sim and say so; a new rule is a stop-and-ask.
- Debug: G.Debug.newcombat('rest') loading the 20 in batches of the slot count.

## Exclusions
Emitters, mines and Spikes (4d). Hail (D-HAIL, 7b). Balance (6).

## Proceed when
Harness green, check.js green, Jess plays the batches and logs feel issues to the board.

## Results
(not started)
