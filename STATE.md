# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-29 night (Claude Code, home; 4r built and signed off, uncommitted).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Move schema: slices 1 to 3d, 4a, 4b, 4c-0, 4c-1, 4c-2 signed off and committed. Slice 4r BUILT, feel-tested and batch-signed-off by Jess (2026-10-29; animation sync issue noted, not a 4r item): 20 plain moves routed (48 of 63 behind ?dev&newcombat), move-plain-harness.js (1247 checks), 33 intent scenarios, debug sets arcs, novas, shots, buffs, smoke pages. check.js 25/25, intent 562/562, smoke all passed. Results in slice-4r.md.
- 4c-3 prose plan given (Quick), NOT approved; comes after 4r sign-off.
- Quick (work machine) cannot run Node: Jess runs every check there. Home can run Node and the smoke.
- Branch end (Jess, 2026-10-28): merge into main after slice 7b.

## Open owner decisions
- 4c-3 aimTrack tracking limit: within the cone's reach (250 + enemy radius; recommended) or within range 420.
- D-GUST, D-LOC (4d). D-MC5 (5). D-ENEMY, D-COOP (7a). D-HAIL (7b). Quick Attack priority [Open] (TODO Backlog).

## Docs and code still differ (approved, not built)
- In this branch: Flamethrower aimTrack, location, delay, falls (4c-3); QA-11 formula (5); legacy Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b).
- Own branches: QA-08 run loop; boss doc reorganization (Q1, QA-06); DoT on base HP for elites; Shedinja.

## Next (in order)
1. Jess commits the 4r build. Log the animation sync issue to the board.
2. Answer the aimTrack question and approve 4c-3.
3. Loose end: gym-harness.js failed once in a check.js run (unseeded boss picker?), not reproducible in 28 reruns.

## Model use (Jess, 2026-10-29)
Medium effort throughout. Sonnet for plain routing, the simulator CLI, docs and catch-ups; Opus for new runtime (4c-3, 4d, 5, D-ENEMY, 7b); Haiku for searches.

## Board note (synced 2026-10-29 5:40 PM, unchanged since noon)
- 15 issues, 13 open. Drift: #4 closed but still a blocker, #3 likely closable, #5/#9/#10 `blocked` with no link, four `needs-triage`, #15 no verdict.

Rules: CLAUDE.md.
