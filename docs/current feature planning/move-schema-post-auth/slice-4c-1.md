# Slice 4c-1: persistence and orbits

Back to slice-overview.md. Prior: slice-4c-0.md. Next: slice-4c-2.md.

## Build plan
../move-schema/slice-4c-1-codehandoff.md (approved; Q23 keeps its build steps). Read it with the corrections below; where the two differ, this file and the owners win.

## Objective
Deep-freeze G.MoveDefs (I2), the ten validator rules of combat-validation-and-handoff.md 2.4, persistent upkeep (R7), orbits on a true circle (D25, H15), the orbit radius lens (D36), and route Fire Spin, Leaf Storm, Night Shade (24 routed).

## Decision (D-LEAF, answered 2026-10-29)
Leaf Storm's self Sp. Atk -2 refreshes its 6 s on each hit and holds at -2 (MOVE-INTENT leaf-storm, Jess 2026-10-29). That is what the handoff's P6 and Test 5 already describe, so they are built as written; the grammar gap is closed.

## Lifecycle change (Jess, 2026-10-29)
`persistent` owns a move's slot-level life and `endOn` holds only instance ends (combat-architecture:H25; MOVE-AXIS-SCHEMA `persistent` row). This replaces the handoff's P3 rule 1 ("persistent requires endOn notActive") with four rules (`needs-end`, `self-has-no-end`, `persistent-no-cd`, `persistent-no-notactive`), adds a respawn after an instance end and an ownerDeath end on a faint to P4, and removes notActive from the six persistent moves (Fire Spin, Leaf Storm, Night Shade, Bug Buzz, Toxic, Flame Wheel).

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

## Results (built 2026-10-29)
- js/data/move-resolver.js: G.MoveDefs deep-frozen at load (I2); resolve() still returns fresh objects. A search of js/ found no code that writes a def. move-sim-harness and move-selfcast-harness add their synthetic moves to a copy of the container (one line each); the real defs stay frozen.
- js/data/move-attributes.js and tools/validate_moves.js: the ten 2.4 rules (ids in combat-validation-and-handoff:2.4) plus the lifecycle rules, each with a failing self-test fixture (self-test 48/48). All 63 moves valid raw and resolved; no data had to change for a rule except the planned notActive removal.
- Source JSON: notActive removed from the six persistent moves; js/data/moves-generated.js regenerated (only those six entries differ).
- js/systems/move-sim.js: upkeepPersistent and spawnPersistent (H25: one group per slot, notActive on a swap or stun, ownerDeath on a faint, respawn next tick after an instance end, no cooldown, no fizzle); MOTION.orbits (D25, true circle, follows the owner, orbit radius x lens, each shape placed on the ring at spawn); a persisted(owner) read for the overlay. The group unit is the `count` shapes of one spawn, the same model as a cast.
- js/systems/move-route.js: Fire Spin, Leaf Storm, Night Shade routed (24).
- js/systems/move-render.js: orbit shapes drawn with the 0.7 squash around the owner (H15, drawing only); a persistent standing patch drawn at a third of the usual fill; the dev line over the player lists live persistent groups and "stunned".
- js/core/debug.js: G.Debug.newcombat('persist'), two rings of 8 slow awake dummies at 90 and 150 px.
- Tests (sandbox copy of the repo; Jess confirms with check.js): new docs/proposals/move-persist-harness.js 49/49 (R7, orbit geometry at both steps, swept hits, nothing inside the ring, cadence, Fire Spin, Leaf Storm refresh and 6 s tail, Night Shade flat 37 and 120 px reach, a synthetic pulse, the freeze, determinism); new docs/proposals/move-persist-mutate.js, all 16 mutations caught; move-intent 302/302 (the four Fire Spin, Night Shade and Leaf Storm scenarios now run); move-riders 103/103; move-selfcast 83/83; move-sim 1980/1980.
- tools/move_parity.js: labels persistence by the flag instead of notActive.
- Not run here: the Playwright smoke (handoff test 11, home machine) and the G.Debug.skipTo(20) framerate check (P11). Both are for Jess in the browser.
- Fix 2026-10-29 (Jess feel-test): switching G.Debug.newcombat sets left Night Shade running, because the debug call rebuilt the slot list and the orphaned group had no slot left to end it. upkeepPersistent now ends any persistent group whose slot is gone (H25); newcombat() clears the owner first, like a Pokemon swap. Harness: slot reorder keeps the group, slot removal ends it (notActive); mutation 'a removed slot leaves its group alive' added. Not run here (this machine's tools cannot run Node); Jess runs check.js and move-persist-mutate.js.
- Feel to judge: Leaf Storm's self Sp. Atk -2 also halves its own special damage from the first hit; Fire Spin's 100 percent trap roots anything it touches; Night Shade's flat level damage has no target cap. Balance pass (slice 6).
