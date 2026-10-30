# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-29 late night (Claude Code, home; 4c-3 built, uncommitted).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Move schema: slices 1 to 3d, 4a, 4b, 4c-0, 4c-1, 4c-2, 4r signed off and committed. Slice 4c-3 BUILT (aimTrack, location, delay, falls; Psychic, Confusion, Bubble Beam, Aura Sphere, Rock Slide routed, 53 of 63), not yet feel-tested. All of 4c is built. Results and whole-4c summary in slice-4c-3.md.
- Tests: check.js 26/26, travel harness 79/79, travel runner 26/26 (other runners green), intent 608/608, smoke all passed.
- Quick (work machine) cannot run Node: Jess runs every check there. Home can run Node and the smoke.
- Branch end (Jess, 2026-10-28): merge into main after slice 7b.

## Open owner decisions
- Psychic widening [Open] (MOVE-INTENT psychic): side enemies are never caught by the widening wedge; keep or retune in slice 6.
- D-GUST, D-LOC (4d). D-MC5 (5). D-ENEMY, D-COOP (7a). D-HAIL (7b). Quick Attack priority [Open] (TODO Backlog).

## Docs and code still differ (approved, not built)
- In this branch: QA-11 formula (5); legacy Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b).
- Own branches: QA-08 run loop; boss doc reorganization (Q1, QA-06); DoT on base HP for elites; Shedinja.

## Next (in order)
1. Jess feel-tests G.Debug.newcombat('falls') (re-playtest Flamethrower: it now swings) and ('extras'), signs off 4c-3, reviews the Confusion and Bubble Beam batch (tools/move_report.js), commits.
2. Plan slice 4d (needs D-GUST and D-LOC).
3. Log the animation sync issue to the board (TODO line 60). Loose end: gym-harness failed once in a check.js run, not reproducible.

## Model use (Jess, 2026-10-29)
Medium effort throughout. Sonnet for plain routing, the simulator CLI, docs and catch-ups; Opus for new runtime (4d, 5, D-ENEMY, 7b); Haiku for searches.

## Board note (synced 2026-10-29 5:40 PM, unchanged since noon)
- 15 issues, 13 open. Drift: #4 closed but still a blocker, #3 likely closable, #5/#9/#10 `blocked` with no link, four `needs-triage`, #15 no verdict.

Rules: CLAUDE.md.
