# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date at home (Claude Code), from the 2026-11-14 evening Quick session
Jess runs these in a terminal at the repo root (CLAUDE.md "Git and GitHub").
1. At home, `git status` must be clean. If it is not, commit what is there first (never edit on a dirty tree).
2. `git fetch origin`, then `git checkout -b balance/109-template-check origin/balance/109-template-check` (or
   `git checkout balance/109-template-check` if it exists), then `git pull --ff-only`. If it refuses, stop.
3. Check: `git log --oneline main..balance/109-template-check` shows the round 1, T3, trace, whole-kit and wrap-up commits.
4. `node tools/check.js` must end with "check: all passed".
5. Say "catch me up". New today: triggers may set goal weights; `G.Debug.leaderTrace` and `leaderMark`.
6. Before leaving home: commit and push, so work starts from the same tree.

## Next (from the 2026-11-14 evening Quick session, #109 on balance/109-template-check)
1. #109: rule the Decider scale fix (STATE.md START HERE), plan it, then rerun round 1 with the trace at the natural gate.
2. #49: close (Decider done) or keep as umbrella. Board by hand if not done: #86 to Accepted, #29 out of Blocked,
   type label on #79, the new cards out of Triage.
3. New issues to draft: the leader reads your cards and items as seen (K2); buffValue reads the whole kit; the trace
   records the leader's level; 16i estimate-vs-real-hit parity. Comment on #122: an early gate gives a low-level leader
   its full loop card pool.
4. Any time: #121 (debug-moves split), #120 (planner verb test gap), #57, #58, #110 (relations test sweep).
5. #111 slice 12 (gyms 3 to 8) after #109. Then #122, the eight-gym tuning pass (blocked by #111; per-loop levers incl.
   cards in docs/ASCII Concept Maps/109 - Brock and Misty Target Feel.md).
6. Acquisition rework (decision 2026-11-12-acquisition-no-gacha-catch-candy-legendaries): file one parent issue,
   then slices.
7. Triage: needs-triage on #74 #75 #93 #97 #99 #100 #101 #102 #105 #107 (checked 2026-11-14). #86 is `ready`.
8. Owner decisions that block or shape work: #49, #97 (blocks #95), #86, #99, #93, #60 (Bait), #107.
9. New issues to file: region type maps, PARKED; Kanto T6 rolls no hordes; tools/make_seo_pages.py is missing, so the
   publish command's last step fails.
10. Possible issue: smoke-pause-menu "Cards Taken keeps its 400 px box" reads 401 since #83. Ask Jess whether to file.
11. Unknown local branch refactor/damage-layer on the work machine: Jess to say what it is (not in any handoff).
12. Deferred hook (#91-2 C): when the real loop counter lands (#24), Region Best's "gyms" must become gyms cleared on
    the final loop, not G.Gym.splits.length.
13. Test gap (low, co-op deferred): no mutant covers hud-player-panel.js hiding Silver in co-op.

## Open issues by area (numbers only, titles on GitHub, checked 2026-11-14 evening, Quick)
#95, #97, #107, #109 to #111 and #120 to #122 re-checked one by one; others below #85 unconfirmed. No #123 yet.
- UI and HUD: #25 #61 #72 (deferred) #74 #75 #79 (deferred) #93 #95 (blocked by #97) #99 #100 #102 #105
- Gyms: #6 #9 #20 #21 #24 #49 #57 #58 #60 #107 #109 #111 (blocked by #109) #120 #122 (blocked by #111)
- Moves: #11 #13 #14 #16 #18 #38 #44
- Engine: #8 #10 #12 #46 #48 #86 #97 #101 (day/night, parked) #121
- Items: #36
- Docs: #28 #29 #110

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
