# Stage 0: resolved-move report and intent scenarios (parallel, no combat code)

> HISTORY (frozen 2026-10-28, Phase 4 batch B4b). This is the record of an executed slice. Its decisions are absorbed into docs/MOVE-AXIS-SCHEMA.md (grammar), docs/current feature planning/combat-architecture.md section H and D (runtime rules), docs/MOVE-INTENT.md (per-move rulings), docs/COMBAT-RULES.md (combat rules). Where this text and those documents differ, those documents win. Body below unchanged.

Back to slice-overview.md. Can run any time after slice 3a, in its own chat. Source: combat-validation-and-handoff.md sections 1.4 and 1.6.

## Build
- Extend the resolved report in tools/ with one row per move (all 63): basePower, cd or "persistent", range used, reach (travel speed x lifetime, or turnaround, or orbit radius, or grown end size), lifetime versus cd overlap (instances alive at once), emissions per cast, rider chance per chain hop, and the Power/s proxy (D37) with its hit-count assumption printed beside it.
- Intent scenario file: docs/move_rework_holding/move-intent-scenarios.json, one or more scenarios per move (enemy layout with positions, radii and movement; caster position and aim; duration; expected outcome in checkable terms: which enemies are hit, how many times, at what times within a tolerance, final caster position, instances alive, statuses present at the end). Jess approves the expected outcomes, because they are the design intent. The static tool predicts what it can analytically; the sim harness runs every scenario whose move is fully supported from slice 3c on and lists the rest as "pending axis X".

## Accept when
Every one of the 63 has a row, every derived value is reproducible by hand from the D-table, Jess has read the table and marked surprises, and the unowned issues are visible in it (Aura Sphere reach, Hail and Substitute cd versus duration, Rock Slide boulder count).
