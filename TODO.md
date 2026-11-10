# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Next (from the 2026-11-09 session, on feature/gym-leader-ai)
1. #51 built (Needs Playtest): Jess feel-tests Misty and Brock (?dev, G.Debug.hitbox() for the plan overlay) and rules the
   four [Proposed] #51 build calls in LEADER-AI "The Decider (#49)". Then #52 (slice 3: swap, dash, draw, dodge), #53, then #39.
   Any time: #44 (leader flat moves on you). #46 (explicit sides). Roster UI #35 can read
   G.GymArena.leaderInfo.rosters(). Item reveals #36 (blocked on an item rework).
2. #55 built (parallel mutation runner, Needs Playtest): Jess tries `node docs/proposals/leader-ai-mutate.js` and confirms. #56 refresh 42 stale
   mutation patterns (found by #55).
3. #48 research: HumanPlayer rules out of game.js into their own files (findings doc first).
4. #38 swap keeps moves already in flight (all Player entities; its own plan and harness).
5. #28, the improve-codebase-architecture skill (ready). #29 needs Jess to sort settled from superseded CP1 rulings.
6. #24 real gym loop counter. Chore for Jess: delete merged branches (the assistant lists them).
The two red harnesses (gym-harness, leader-stats-harness) are expected red until #30 (branch rules); not a task now.

## Open issues by area (numbers only, titles via gh)
- Gyms: #6 #9 #20 #21 #24 #30 #39 #49 #51 #52 #53
- Moves: #11 #13 #14 #38 #44
- Engine: #8 #10 #12 #46 #48 #55 #56
- UI: #25 #35
- Items: #36
- Bugs: #16 #18
- Docs: #28 #29

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
