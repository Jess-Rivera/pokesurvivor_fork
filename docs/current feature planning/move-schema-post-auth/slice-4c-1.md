# Slice 4c-1: persistence and orbits

Back to slice-overview.md. Prior: slice-4c-0.md. Next: slice-4c-2.md.

## Build plan
../move-schema/slice-4c-1-codehandoff.md (approved; Q23 keeps its build steps). Read it with the corrections below; where the two differ, this file and the owners win.

## Objective
Deep-freeze G.MoveDefs (I2), the ten validator rules of combat-validation-and-handoff.md 2.4, persistent upkeep (R7), orbits on a true circle (D25, H15), the orbit radius lens (D36), and route Fire Spin, Leaf Storm, Night Shade (24 routed).

## Decision (D-LEAF, answered 2026-10-29)
Leaf Storm's self Sp. Atk -2 refreshes its 6 s on each hit and holds at -2 (MOVE-INTENT leaf-storm, Jess 2026-10-29). That is what the handoff's P6 and Test 5 already describe, so they are built as written; the grammar gap is closed.

## Corrections to the handoff
- Startup: read combat-architecture H15 instead of "review section 9.7 item 5".
- "Decided ... (D25)": the owner is H15.
- P6 and Test 5: stand as written (D-LEAF answered: per-hit refresh).
- P10 Docs: update architecture D25 and D36, combat-validation 2.4 (mark each rule done), and this file; not the review, not ../move-schema/slice-4c.md.
- Finish: update this file and slice-overview.md in this folder.

## Canaries
Fire Spin, Leaf Storm, Night Shade.

## Proceed when
The handoff's tests pass with the corrections, check.js green, Jess signs off G.Debug.newcombat('persist').

## Results
(not started)
