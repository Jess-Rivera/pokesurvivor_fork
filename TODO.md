# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Next (from the 2026-11-09 session, on feature/gym-leader-ai)
1. Leader AI, in order: #41 built (Needs Playtest, playtesters). #42 ruled and closed 2026-11-09. Next #43
   (movement split, all Player entities, plus the #42 item 13 swap order); then #47 (leader attacks wait on your cast
   gate, move-in score); then #39 (slice 5b, personalities). Any time: #45 (strongHost out), #44 (leader flat moves on
   you). After #43: #46 (explicit sides, leaders off the enemy list).
   Roster UI #35 can read G.GymArena.leaderInfo.rosters(). Item reveals #36 (blocked on an item rework).
2. #38 swap keeps moves already in flight (all Player entities; its own plan and harness).
3. #37 replace Korataki with Michroma (licence; before any hosting).
4. #28, the improve-codebase-architecture skill (ready; four open questions in the issue). #29 (CP1 rulings into docs/decisions/) needs Jess to sort settled from superseded.
5. #24 real gym loop counter.
6. Chore for Jess: delete merged branches (the assistant lists them).
The two red harnesses (gym-harness, leader-stats-harness) are expected red until #30 (branch rules); not a task now.

## Open issues by area (numbers only, titles via gh)
- Gyms: #6 #9 #20 #21 #24 #30 #39 #41 #47
- Moves: #11 #13 #14 #38 #44
- Engine: #8 #10 #12 #43 #45 #46
- UI: #25 #35 #37
- Items: #36
- Bugs: #16 #18
- Docs: #28 #29

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
