# Stage 0: resolved-move report and intent scenarios (parallel)

Back to slice-overview.md. Built 2026-10-29, ahead of slice 4c-1, so the 4c scenarios guard the 4c builds.

## Objective
The validation backbone described in combat-validation-and-handoff:1.4 and combat-validation-and-handoff:1.6 (Stage 0): a per-move report and a scenario file whose expected outcomes Jess approves, run by the sim harness for every routed move.

## Build
- Extend the resolved report in tools/ (one row per move): basePower, cd or persistent, range used, reach, instances alive at once, emissions per cast, rider chance per chain hop, and the Power/s proxy (combat-architecture:D37, tools only, combat-architecture:H8) with its hit-count assumption.
- docs/move_rework_holding/move-intent-scenarios.json (not the same file as MOVE-INTENT.md): one or more scenarios per move with layout, duration and checkable expected outcomes.
- Expected outcomes come from MOVE-INTENT rulings first, then combat-validation-and-handoff:2.5 for the six worked moves, then the move data and the D-table. Thunderbolt ratios are 1, 0.67, 0.4489, ... (combat-architecture:D15); validation 2.5 was corrected to match on 2026-10-29.
- The harness runs every scenario whose move is routed and lists the rest as "pending".

## Review rule (Jess, 2026-10-29)
- A move is reviewed when it has a MOVE-INTENT entry and its data and the new-path code both match that entry (its scenarios pass).
- A move without an entry is reviewed with the batch that routes it: Jess reviews the batch's scenario table when the batch is added. No separate per-move pass beforehand.
- Anything that needs specific disambiguation during a batch review becomes a new MOVE-INTENT entry, so it is owned from then on.
- A scenario whose outcome depends on an open owner decision is marked blocked on that decision, never guessed.

## Scope note
Tools and a JSON data file under docs/: this changes no game behavior, but it is a new tool and data file, so it gets a short prose plan first.

## Accept when
Every move has a report row, every derived value is reproducible from the D-table, Jess has marked surprises and approved the scenario outcomes, and the harness runs inside check.js.

## Built (2026-10-29)
- tools/move_report.js: the resolved-move report, one row per move (all 63) with the derived values above, the review state under the review rule, the scenarios per move, and cd parity against legacy js/data/moves.js. `--report` writes docs/current feature planning/move-report.md (generated, do not edit). Informational, never fails. It replaces the deferred F-REP-1 cd rulings: a cd difference counts as explained when the move is persistent, its override `why` gives a reason, or its MOVE-INTENT entry covers its cooldown; the rest are listed for a ruling, and rulings go in MOVE-INTENT.
- docs/move_rework_holding/move-intent-scenarios.json: 38 scenarios over the 33 moves that are routed or routed by 4c. Each names its source (`MOVE-INTENT:<id>` or `data`), a layout, a duration and checkable expectations (hits per enemy, first-hit time window, damage ratios, flat damage, crit, end reasons, casts, enemy and owner stages, timed owner stages, root, status, owner HP, shield, heal fraction, caster end point). Expected values are hand-derived, never copied from the code. `batchReviewed` lists moves Jess has signed off without a MOVE-INTENT entry.
- docs/proposals/move-intent-harness.js: runs every scenario whose move is routed (the ROUTED list read from js/systems/move-route.js) against the real sim, effects, stages, status, enemy and player code at dt 1/60 and 1/30, and lists `waitsFor` (later slice) and `blockedBy` (open decision) scenarios without running them. It also checks every MOVE-INTENT source names a real entry and that every routed move has a scenario. Picked up by tools/check.js through its name; engine setup copied from move-selfcast-harness.js.

## Results
- Harness 2026-10-29 (run in a sandbox copy of the repo; Jess confirms with check.js): 24 scenarios run on the 21 routed moves, 269 of 269 checks pass. 12 pending on 4c (fire-spin, night-shade; razor-leaf, bonemerang, quick-attack, aerial-ace; flamethrower sticky aimTrack, psychic, confusion, bubble-beam, aura-sphere, rock-slide). 2 blocked: leaf-storm (D-LEAF), psychic re-pick (D-PSY). A planted pierce off-by-one made 4 checks fail, so the harness catches drift.
- Report 2026-10-29: 12 routed moves need the first batch review (bite, body-slam, bulldoze, dragon-rage, ember, giga-drain, heat-wave, hydro-pump, mud-shot, psycho-cut, swords-dance, water-gun). cd differs from legacy on 13, 4 need a ruling: dragon-rage 3.5 vs 1, gust 0.5 vs 0.26, spikes 1.1 vs 1.2, string-shot 0.5 vs 1.1.
- Correction found while writing scenarios: a `direction` move only casts with an enemy in range (combat-architecture:H11 S2), so a range test needs an in-range decoy off the aim line.
- Batch 1 reviewed 2026-10-29: Jess playtested all 12 in-game (G.Debug.newcombat) and signed them off; ids added to `batchReviewed`.
- cd rulings 2026-10-29: Dragon Rage 3.5, Gust 0.5 and Spikes 1.1 intended (MOVE-INTENT entries). String Shot 0.5 was a REGRESSION (legacy 1.1): restored to 1.1 in move-overrides.js on Jess's approval, with a MOVE-INTENT entry. Later batches add their scenarios when their slice routes them.
