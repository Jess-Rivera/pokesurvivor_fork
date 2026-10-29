# Slice 7a: move every other reader off `kind`

Back to slice-overview.md. Prior: slice-6.md. Next: slice-7b.md.

## Why this slice exists
The legacy move table (js/data/moves.js, `kind`, `cd`, `cat`, `radius`, `arc`, `norm`) is read by more than the player path. Deleting it in 7b would break those readers. The old plan noted that enemy and gym-leader use of the new definitions is covered by no slice.

## Readers to migrate (from ../move-schema/slice-1.md and slice-7.md, re-verify by search at the start)
enemy.js boss casts (kind, cd, cat, radius, arc), gyms.js (BOSS_FORMS, Moves.BY_ID, instance, addStack), gym.js, kinds.js (also slice 5), mechanics.js, icons.js, levelup.js, menu.js, and any other `Moves.BY_ID` or `kind` reader found by search.

## Blocking decisions
- D-ENEMY: how bosses and gym leaders cast after the flip. Candidate readings: (a) they cast through G.MoveSim with an enemy owner (the sim is player-owned today; this is new runtime work and new cross-axis questions); (b) they keep their own small cast code reading resolved G.MoveDefs fields directly, with no `kind` (check against the "no bridge, no derived kind" rule in architecture I1 and MOVE-AXIS-SCHEMA). Scope is only what Brock needs (Q18); other gyms come with the gym-roster branch.
- D-COOP: co-op runs the legacy path today (move-route.js skips routing when co-op is active). After 7b there is no legacy player path. Networking is deferred scope (CLAUDE.md "Local-first"), so the choice is how co-op behaves locally until the MP phase: (a) co-op uses the new path with no new net sync, (b) co-op is disabled until the MP phase. Either way, note the deferred hook in TODO.md.

## Scope
UI readers (icons, menu, levelup) read resolved fields or a display name, never `kind`. Gym and boss code per D-ENEMY. Brock's fight works end to end on the new definitions (QA-13).

## Tests
A search guard: no `kind` read outside files 7b deletes. Existing boss and gym harnesses green. Brock fight smoke test. Menus and level-up screens show every move correctly.

## Proceed when
Every reader is migrated or listed for deletion in 7b, check.js green, Jess plays a run that reaches Brock.

## Results
(not started)
