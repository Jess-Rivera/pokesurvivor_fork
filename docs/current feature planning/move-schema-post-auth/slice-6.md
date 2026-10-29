# Slice 6: damage simulator, balance pass and stress run

Back to slice-overview.md. Prior: slice-5.md. Next: slice-7a.md.

## Objective
Stage 5 of combat-validation-and-handoff.md 1.6: measure every move on the real code, decide normalization by evidence, tune, and confirm the frame rate at late-game density.

## Build
- A Node CLI on the real G.Stats and the real sim: move, owner species and level, stages, upgrades, enemy species and level, layout (single and crowd). Outputs: damage per hit, hits per cast, per-cast damage, time to kill.
- A ranked table for Jess. Normalization only by the evidence rule in architecture section D (D37, H8).

## Questions it must answer
Throughput outliers (Leaf Storm, Bubble Beam, Flame Wheel, Flamethrower, Gust, Fairy Wind, Bug Buzz, Discharge versus Tackle); children at full parent power (H13); balance items carried from earlier slices: Night Shade flat level damage with no target cap, Fire Spin's 100 percent trap, Rock Slide value for 10 PP, Bubble Beam up to 7 hits on one target, Flamethrower burn uptime (every eligible hit rolls, H5), Hail cd versus duration if it is routed (D-HAIL).

## Scope note
Tuning changes game data, so each batch of changes is a prose plan first. Rules do not change here; only numbers.

## Stress run
Late-game density with all moves on the flag. A visible framerate collapse is fixed now (CLAUDE.md performance stance).

## Proceed when
Jess has the ranked table, has decided on normalization, and has approved the tuning batches.

## Results
(not started)
