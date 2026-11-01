# Slice 6: projectile spacing and nova sizing

Back to slice-overview.md. Prior: slice-5.md. Next: slice-7a.md.

## Objective (rescoped by Jess, 2026-10-31, DECISIONS)
A feel fix on the new path: multi-shot moves whose shots overlap or read as one (String Shot, issue #15, and others), and nova sizes. Numbers in move data only, no rule changes. Map: docs/ASCII Concept Maps/Slice 6 - Plan.txt.

## Moved out (to the first balance branch, after playtesters)
The damage simulator and balance pass. Carried questions: throughput outliers (Leaf Storm, Bubble Beam, Flame Wheel, Flamethrower, Gust, Fairy Wind, Bug Buzz, Discharge versus Tackle); children at full parent power (H13); Night Shade flat level damage with no target cap; Fire Spin's 100 percent trap; Rock Slide value for 10 PP; Bubble Beam up to 7 hits on one target; Flamethrower burn uptime (H5); Hail cd versus duration (D-HAIL); Leaf Storm's real power about half its listed 130; +6 charge-then-swap feel (SS8); chance foe drops that rarely climb; SELF_DROP_GATE_MUL, STRONG_HOST_GATE_MUL, Gate and Duration card steps; 5b card steps, Count Up and Pierce Up caps, draw and family weights, Vitamins step, HP Regen per second. A formula-only DPS table from 2026-10-31 is in move-dps-table.md (reference, median mon, no DoT).

## Stress run
Still owed before the merge: late-game density with all moves on the flag. A visible framerate collapse is fixed immediately (CLAUDE.md performance stance).

## Proceed when
Jess has feel-tested the spacing and nova changes.

## Results
DONE at batch 2 (Jess, 2026-10-31).
- Tool: G.Debug.movechecker(id, ... up to 6, [px]) with range rings (debug.js, move-render.js).
- Batch 1: String Shot and Bubble Beam spacing and wobble, Tackle 54, Toxic Spikes burst, Gust cd 0.7, Discharge 110. Plan: docs/ASCII Concept Maps/Slice 6 - Batch 1 Plan.txt.
- Batch 2: path.loop (combat-architecture:D38), Fairy Wind radius 70, 0.6667 Hz, 90 px/s, 3 s. Plan: Slice 6 - Batch 2 Plan.txt. Both batches green on node and feel-tested OK.
- Batch 3 DROPPED: Quick Attack and Aerial Ace work as intended but are not fun; moved to a later fun pass (TODO Backlog, DECISIONS 2026-10-31). The stress run above is still owed before the merge.
