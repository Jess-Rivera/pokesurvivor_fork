# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-26 (Claude Desktop, coding chat; slice 3b built).

## Where we are
- ON BRANCH feature-test/new-move-schema. Slices 1, 2, 3a and 3b BUILT. None change gameplay; the game loads none of the new move files.
- Planning docs (all in docs/current feature planning/): combat-architecture.md (APPROVED), combat-validation-and-handoff.md, move-consistency-review.md. Section 9 of the review is the single source for every decision and open item. Slice files: docs/current feature planning/move-schema/, start at slice-overview.md.
- Slice 3b built and committed: js/systems/move-geom.js (G.MoveGeom: segDist2, shapeOf, contains, boundsOf; not in dev.html), docs/proposals/move-geom-harness.js (23,746 checks), and the I1 guard in tools/check.js (the word kind is banned in js/systems/move-*.js, comments included). Doc edits: slice-3b.md, slice-3c.md, slice-overview.md, review 9.2, architecture D18.
- Decided in 3b: D18 apex rule (enemy covering the arc origin is inside at any angle); the lens is applied in shapeOf (spawnInstance must not pre-scale); boundsOf takes the largest enemy radius for linear shapes; radial with no radArc is a point.
- check.js: 18/18 harnesses, I1 guard ok, export current, 63/63 valid, resolved 63/63 valid. ONE known failure: move_parity self-test "empty override" hard-codes hail (test defect, fix not yet done).

## Next (in order)
1. Slice 3c (G.MoveSim and damage-only G.MoveEffects, headless) in a fresh coding chat. Read slice-3c.md; its "Notes carried from slice 3b" section matters.
2. Still undecided, left out of 3a: fix the move_parity hail self-test; add the review section 2.4 validator rules; deep-freeze G.MoveDefs (architecture I2).
3. Still open: LENS GAP (Jess chose to leave it, 2026-10-26): legacy Wide/Zoom Lens also scales beam length (the old radius field), targeting reach and orbit radius; shapeOf scales only radius and arc, so beams lose the lens. Fix before 3d (linLength x lens in shapeOf, reach in 3c, orbit in 4c). Also maxStacks for Leaf Storm and Metal Claw (before 4a), Gust per-shot spread (before 4d), six unowned issues (review 9.7). Set locationPick per move if wanted (Rock Slide, Spikes, Toxic Spikes, Will-O-Wisp use the enemy default).

## Board note
- Treat #2 as OPEN. #4 closing as not relevant. #3 closes once #2 consumes described.json. #11 has its dataset.

## Standing rules (full text: CLAUDE.md)
Local-first. English-native (Spanish literals are i18n keys). No em-dashes. Prose plan with no code, Jess OKs, then build; changelog.js + Markdown docs free-edit. Read-only git and `git fetch` OK; never run `gh` or any repo-changing git: draft commands, Jess runs them. New save fields backward compatible. Debug on dev.html?dev.
