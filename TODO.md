# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Next (from the 2026-11-09 session, on feature/gym-leader-ai)
1. #49 build: #51 (slice 2, planner core, executor and overlay), then #52, #53. #50 and #54 shipped and closed 2026-11-09. Spec: LEADER-AI "The Decider (#49)". Then #39 (slice 5b, personalities, re-scoped onto #49).
   Any time: #44 (leader flat moves on you). #46 (explicit sides). Roster UI #35 can read
   G.GymArena.leaderInfo.rosters(). Item reveals #36 (blocked on an item rework). #43 and #47 shipped 2026-11-09.
2. #48 research: HumanPlayer rules out of game.js into their own files (findings doc first).
3. #38 swap keeps moves already in flight (all Player entities; its own plan and harness).
4. #28, the improve-codebase-architecture skill (ready). #29 needs Jess to sort settled from superseded CP1 rulings.
5. #24 real gym loop counter. Chore for Jess: delete merged branches (the assistant lists them).
The two red harnesses (gym-harness, leader-stats-harness) are expected red until #30 (branch rules); not a task now.

## Open issues by area (numbers only, titles via gh)
- Gyms: #6 #9 #20 #21 #24 #30 #39 #49 #50 #51 #52 #53
- Moves: #11 #13 #14 #38 #44
- Engine: #8 #10 #12 #46 #48
- UI: #25 #35 #54
- Items: #36
- Bugs: #16 #18
- Docs: #28 #29

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
