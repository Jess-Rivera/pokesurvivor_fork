# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-29 end of day (Quick, work; 4c-2 built and green, 4c-3 plan given, not approved).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Move schema: slices 1 to 3d, 4a, 4b, 4c-0, 4c-1, 4c-2 built and signed off (Jess ran check.js and both mutation runners on 4c-2: green). 28 of 63 routed behind ?dev&newcombat.
- Today: orphaned persistent group fix; Bug Buzz rulings (100% Sp. Def -1 held at -1, rehit 0.5, stays in 4r); Quick Attack dash speed read at dash start; a reposition waits while the owner's dash lives; Aerial Ace MOVE-INTENT entry.
- 4c-3 (delay, falls, aimTrack, Psychic, Confusion, Bubble Beam, Aura Sphere, Rock Slide; 33 routed) prose plan given in chat, handoff verified against today's code. NOT approved, nothing built.
- Quick (work machine) cannot run Node: Jess runs every check.
- Branch end (Jess, 2026-10-28): merge into main after slice 7b.

## Open owner decisions
- 4c-3 aimTrack tracking limit: track while within the cone's reach (250 + enemy radius, same as the cast gate; recommended) or within range 420 (handoff wording, the cone can point at an enemy it cannot hit).
- D-GUST, D-LOC (4d). D-MC5 (5). D-ENEMY, D-COOP (7a). D-HAIL (7b). Quick Attack priority [Open] (TODO Backlog).

## Docs and code still differ (approved, not built)
- In this branch: Flamethrower aimTrack, location, delay, falls (4c-3); QA-11 formula (5); legacy Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b).
- Own branches: QA-08 run loop; boss doc reorganization (Q1, QA-06); DoT on base HP for elites; Shedinja.

## Next (in order)
1. Commit and push today's work if not done (git diff --stat first: a file with every line changed is a line-ending flip).
2. Answer the aimTrack limit question and approve 4c-3 (plan: slice-4c-3.md plus ../move-schema/slice-4c-3-codehandoff.md).
3. After the build: check.js, the new motion-extras mutation runner, newcombat('extras') and ('falls'), skipTo(20), re-feel Flamethrower.

## Board note (synced 2026-10-29 5:40 PM, unchanged since noon)
- 15 issues, 13 open. Drift: #4 closed but still a blocker, #3 likely closable, #5/#9/#10 `blocked` with no link, four `needs-triage`, #15 no verdict.

Rules: CLAUDE.md.
