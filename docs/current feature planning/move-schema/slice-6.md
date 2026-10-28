# Slice 6: damage simulator, balance pass and stress run

Back to slice-overview.md. Prior slice: slice-5.md.

## Decision homes and conflicts
Decisions for the move system live in docs/MOVE-AXIS-SCHEMA.md (grammar), docs/current feature planning/combat-architecture.md section H and D (runtime rules), docs/MOVE-INTENT.md (per-move rulings), docs/COMBAT-RULES.md (combat rules). This slice has no decision section of its own, and the B4a conflict list found no conflicts here.
 The old "behavior harness" scope moved into the per-slice canaries and intent scenarios (validation 1.6 Stage 4); what remains here is Stage 5 and the stress run.

## Build
- A Node CLI on the real G.Stats and the real sim: inputs are move, owner species and level, stages, upgrades, enemy species and level, layout (single and crowd). Outputs: damage per hit, hits per cast, per-cast damage, time to kill, and the same against a crowd.
- Ranked table for Jess. Normalization is decided by evidence only: normalize if, after upgrades, the best and worst moves of the same balanceClass and PP differ in simulated time-to-kill by more than a factor Jess sets.
- Questions it must answer: the throughput outliers (Leaf Storm, Bubble Beam, Flame Wheel, Flamethrower, Gust, Fairy Wind, Bug Buzz, Discharge versus Tackle), whether emitted children at full power are intended (F4), and the Aura Sphere reach.
- Late-game stress run with high enemy counts. A visible framerate collapse is fixed now, not deferred.

## Proceed when
Jess has the ranked table and has decided on normalization.
