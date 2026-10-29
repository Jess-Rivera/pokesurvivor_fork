# Stage 0: resolved-move report and intent scenarios (parallel)

Back to slice-overview.md. Can run any time, in its own chat. Must be done before slice-4d.md closes.

## Objective
The validation backbone described in combat-validation-and-handoff.md 1.4 and 1.6 (Stage 0): a per-move report and a scenario file whose expected outcomes Jess approves, run by the sim harness for every routed move.

## Build
- Extend the resolved report in tools/ (one row per move): basePower, cd or persistent, range used, reach, instances alive at once, emissions per cast, rider chance per chain hop, and the Power/s proxy (architecture D37, tools only, H8) with its hit-count assumption.
- docs/move_rework_holding/move-intent-scenarios.json (not the same file as MOVE-INTENT.md): one or more scenarios per move with layout, duration and checkable expected outcomes.
- Expected outcomes come from MOVE-INTENT rulings first, then validation 2.5 for the six worked moves. Use the Thunderbolt ratios from MOVE-INTENT and architecture D15 (1, 0.67, 0.4489, ...), not the 0.33 line in validation 2.5 (audit F-VAL-1).
- The harness runs every scenario whose move is routed and lists the rest as "pending".

## Scope note
Tools and a JSON data file under docs/: this changes no game behavior, but it is a new tool and data file, so it gets a short prose plan first.

## Accept when
Every move has a report row, every derived value is reproducible from the D-table, Jess has marked surprises and approved the scenario outcomes, and the harness runs inside check.js.

## Results
(not started)
