# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-29 night (Claude Code, home; 4c-2 review fixes built and green, not yet committed).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Move schema: slices 1 to 3d, 4a, 4b, 4c-0, 4c-1, 4c-2 built and signed off. 28 of 63 routed behind ?dev&newcombat.
- 4c-2 review fixes built tonight (Jess approved): harness gaps closed, Quick Attack 3 s cap, swept-needs-time rule, one-way dash ends `arrived`, a root holds every reposition, G.Enemy.KNOCK_DECAY, player unrootedSpd. All checks green (see DEVLOG).
- 4c-3 prose plan given in chat (Quick). NOT approved, nothing built.
- Quick (work machine) cannot run Node: Jess runs every check there. Home can run Node and the smoke.
- Branch end (Jess, 2026-10-28): merge into main after slice 7b.

## Open owner decisions
- 4c-3 aimTrack tracking limit: within the cone's reach (250 + enemy radius; recommended) or within range 420.
- D-GUST, D-LOC (4d). D-MC5 (5). D-ENEMY, D-COOP (7a). D-HAIL (7b). Quick Attack priority [Open] (TODO Backlog).

## Docs and code still differ (approved, not built)
- In this branch: Flamethrower aimTrack, location, delay, falls (4c-3); QA-11 formula (5); legacy Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b).
- Own branches: QA-08 run loop; boss doc reorganization (Q1, QA-06); DoT on base HP for elites; Shedinja.

## Next (in order)
1. Feel-test newcombat('motion') (Quick Attack and Aerial Ace should feel unchanged), then commit tonight's work (two commits, commands in chat).
2. Answer the aimTrack question and approve 4c-3 (slice-4c-3.md plus ../move-schema/slice-4c-3-codehandoff.md).
3. After the 4c-3 build: check.js, the new motion-extras mutation runner, newcombat('extras') and ('falls'), skipTo(20), re-feel Flamethrower.

## Board note (synced 2026-10-29 5:40 PM, unchanged since noon)
- 15 issues, 13 open. Drift: #4 closed but still a blocker, #3 likely closable, #5/#9/#10 `blocked` with no link, four `needs-triage`, #15 no verdict.

Rules: CLAUDE.md.
