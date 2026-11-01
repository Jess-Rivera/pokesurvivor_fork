# Slice 7b: flip, purge and merge into main

Back to slice-overview.md. Prior: slice-7a.md. This is the last slice of the branch.

## Objective
The new path is the only player-move path. The legacy code and its legacy behaviors are gone. The branch merges into main.

## Decision D-HAIL (resolved)
- [Approved] (c): Hail leaves the player pool until its toggle skill item exists (MOVE-INTENT hail). Old saves that hold Hail load with Water Gun in its place. (Jess, 2026-11-01; (a) build the toggle here and (b) a plain setWeather cast were declined, since snow chips the player's own team.)

## Scope
- Remove the `?newcombat` flag and routing (H7, D-4); every move runs through G.MoveSim. G.Combat keeps enemy shots, wall cover and contact damage.
- Delete the legacy player-move code in combat.js and the legacy fields it alone used; kinds.js once slice 5 and 7a no longer need it.
- Legacy behaviors removed (each is a [Legacy behavior] naming slice 7): Fire Spin `strip` and `burnHalf` (COMBAT-RULES "Trap, enemies", MOVE-INTENT fire-spin), the `norm` factor (COMBAT-RULES "Damage"), the "duration / cooldown is the cap" stacking with TEAM_LIVE, ROLL_GAP and procSelf (COMBAT-RULES "Stat stages", legacy path), and E1 (verify that enemies can now be trapped on the only path, QA-10). KEEP when the legacy stage code goes: a small fixed-timer stage application for the carrier statuses SLOW and HASTE (COMBAT-RULES "Stat stages", carrier statuses; Jess, 2026-10-30).
- Purge Bubble and any other forgotten move. Save-data safety (CLAUDE.md): a save that holds a purged or pulled move must still load, with a backward-compatible default.
- Brock-only gym fallback (QA-13, Q18), using 7a.
- Patch notes in js/data/changelog.js (free edit; it must still parse).
- Docs: mark the [Legacy behavior] lines removed in COMBAT-RULES and MOVE-INTENT; clear the matching STATE.md gaps; architecture D7 and C8 lose their legacy notes.

- [Approved] D-BUBBLE: Bubble is retired as a move. The starters that open with it (js/data/starters.js: dex 393 and dex 728) open with Water Gun instead, and Bubble leaves the pool. Saves that hold Bubble must still load (Water Gun is the natural default). (Jess, 2026-11-01; found 2026-10-30)

## Tests
All harnesses green with no flag; the I1 guard extended to every file that remains; old saves (with Bubble, Hail and pre-branch move ids) load; a full run to Brock; the stress run from slice 6 repeated with no flag.

## Merge into main (Jess runs all git)
check.js green on the branch, STATE.md and DEVLOG.md updated, a DECISIONS.md log line for the flip, then the assistant gives Jess the exact merge commands (merge main into the branch first if main moved, then the branch into main). After the merge, open the gym-roster move-import branch.

## Results
(not started)
