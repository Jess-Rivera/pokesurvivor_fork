# Slice 6: damage simulator, balance pass and stress run

Back to slice-overview.md. Prior: slice-5.md. Next: slice-7a.md.

## Objective
Stage 5 of combat-validation-and-handoff.md 1.6: measure every move on the real code, decide normalization by evidence, tune, and confirm the frame rate at late-game density.

## Build
- A Node CLI on the real G.Stats and the real sim: move, owner species and level, stages, upgrades, enemy species and level, layout (single and crowd). Outputs: damage per hit, hits per cast, per-cast damage, time to kill.
- A ranked table for Jess. Normalization only by the evidence rule in architecture section D (D37, H8).

## Questions it must answer
Throughput outliers (Leaf Storm, Bubble Beam, Flame Wheel, Flamethrower, Gust, Fairy Wind, Bug Buzz, Discharge versus Tackle); children at full parent power (H13); balance items carried from earlier slices: Night Shade flat level damage with no target cap, Fire Spin's 100 percent trap, Rock Slide value for 10 PP, Bubble Beam up to 7 hits on one target, Flamethrower burn uptime (every eligible hit rolls, H5), Hail cd versus duration if it is routed (D-HAIL).

Stat stage and card checks (from the 2026-10-30 slice 5 review): Leaf Storm's real power is about half its listed 130 (only the first hit of a cast is at full power, then x0.5 or lower; keep it if burst-then-swap is the intended play, do not "fix" it by accident); how strong +6 (x4 Attack) feels with charge-then-swap (SS8); chance foe drops that rarely climb (Flash Cannon and Psychic hold a window about 31% of the time); tunables SELF_DROP_GATE_MUL, STRONG_HOST_GATE_MUL and the Gate and Duration card step; 5b card steps, the Count Up and Pierce Up per-run caps and draw weights, the family weights, the Vitamins step, HP Regen per second.

## Scope note
Tuning changes game data, so each batch of changes is a prose plan first. Rules do not change here; only numbers.

## Stress run
Late-game density with all moves on the flag. A visible framerate collapse is fixed now (CLAUDE.md performance stance).

## Proceed when
Jess has the ranked table, has decided on normalization, and has approved the tuning batches.

## Results
(not started)
