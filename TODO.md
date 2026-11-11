# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Next (from the 2026-11-11 session that opened feature/pause-menu-rework)
1. #89: pause menu slice 2 (Pokemon detail panel, team panel). Open with goal, done-condition and test, then the plan.
2. Then #90, #91, #83, #92 in order (children of #82); merge the branch back into feature/gym-leader-ai when #82 is done.
3. Leader AI when ready: #53, then #39; planner gaps #57, #58; #30 before gym-leader-ai merges to main.
4. Triage: #93 (tooltip rework) and #75 carry needs-triage; #72 and #79 (deferred) and #74 sit in the board's Triage
   column; #86 is `ready` but its card is still in Triage; #29 carries a stale `blocked` label (blocker #27 closed).
5. Chore for Jess: delete merged branches (chore/docs-cleanup, feature/entity-model, feature/gym-upgrade-authoring,
   feature/item-rework-v2, feature/leader-roster-ui, feature/pokeboxes, fix/onboarding-flow, fix/playtest-round-1, fix/ui-upgrade).
The two red harnesses (gym-harness, leader-stats-harness) are expected red until #30.

## Open issues by area (numbers only, titles via gh)
- UI and HUD: #25 #61 #74 #75 #82 (#89 #90 #91 #83 #92) #93 #72 #79 (deferred)
- Gyms: #6 #9 #20 #21 #24 #30 #39 #49 #53 #57 #58 #60
- Moves: #11 #13 #14 #38 #44
- Engine: #8 #10 #12 #46 #48 #56 #86
- Items: #36
- Bugs: #16 #18
- Docs: #28 #29

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
