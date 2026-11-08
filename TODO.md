# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Next (from the 2026-11-08 session, on feature/gym-leader-ai)
1. Leader AI (spec docs/LEADER-AI.md): slice 1 (#22) shipped. Next #31 (slice 2, swap and dodge decisions), then #32 to #34 in
   order, each opened by agreeing its goal, done check and test (docs/branch-rules/feature-gym-leader-ai.md "Slice shape").
   Roster UI #35 can now read G.GymArena.leaderInfo.rosters(). Item reveals #36 (blocked on an item rework).
2. #28, the improve-codebase-architecture skill (ready; four open questions in the issue). #29 (CP1 rulings into docs/decisions/) needs Jess to sort settled from superseded.
3. #24 real gym loop counter.
4. Chore for Jess: delete merged branches (the assistant lists them).
The two red harnesses (gym-harness, leader-stats-harness) are expected red until #30 (branch rules); not a task now.

## Open issues by area (numbers only, titles via gh)
- Gyms: #6 #9 #20 #21 #24 #30 #31 #32 #33 #34
- Moves: #11 #13 #14
- Engine: #8 #10 #12
- UI: #25 #35
- Items: #36
- Bugs: #16 #18
- Docs: #28 #29

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
