# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-29 late night (Claude Code, home; 4r planned and approved, nothing built).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Move schema: slices 1 to 3d, 4a, 4b, 4c-0, 4c-1, 4c-2 built, signed off and committed (4c-2 review fixes in 40fca06). 28 of 63 routed behind ?dev&newcombat.
- Slice 4r swapped ahead of 4c-3. Plan approved by Jess (slice-4r.md "Approved plan"): route 20 plain moves (to 48), a new move-plain-harness.js, intent scenarios for the batch, four debug sets (arcs, novas, shots, buffs), smoke pages. Build in a Sonnet session.
- 4c-3 prose plan given (Quick), NOT approved; comes after 4r.
- Quick (work machine) cannot run Node: Jess runs every check there. Home can run Node and the smoke.
- Branch end (Jess, 2026-10-28): merge into main after slice 7b.

## Open owner decisions
- 4c-3 aimTrack tracking limit: within the cone's reach (250 + enemy radius; recommended) or within range 420.
- D-GUST, D-LOC (4d). D-MC5 (5). D-ENEMY, D-COOP (7a). D-HAIL (7b). Quick Attack priority [Open] (TODO Backlog).

## Docs and code still differ (approved, not built)
- In this branch: the 4r routing (slice-4r.md); Flamethrower aimTrack, location, delay, falls (4c-3); QA-11 formula (5); legacy Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b).
- Own branches: QA-08 run loop; boss doc reorganization (Q1, QA-06); DoT on base HP for elites; Shedinja.

## Next (in order)
1. Commit this docs change. Then a Sonnet chat builds 4r from slice-4r.md (read only that file, the overview and the owner sections it names).
2. After the build: check.js, smoke, feel-test newcombat('arcs'), ('novas'), ('shots'), ('buffs'); review the move_report table and sign off the batch in `batchReviewed`.
3. Answer the aimTrack question and approve 4c-3.

## Model use (Jess, 2026-10-29)
Medium effort throughout. Sonnet for plain routing, the simulator CLI, docs and catch-ups; Opus for new runtime (4c-3, 4d, 5, D-ENEMY, 7b); Haiku for searches.

## Board note (synced 2026-10-29 5:40 PM, unchanged since noon)
- 15 issues, 13 open. Drift: #4 closed but still a blocker, #3 likely closable, #5/#9/#10 `blocked` with no link, four `needs-triage`, #15 no verdict.

Rules: CLAUDE.md.
