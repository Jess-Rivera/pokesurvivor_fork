# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date (either machine), from the 2026-11-15 home session
1. `git status` must be clean. `git fetch origin`, then `git checkout main`, then `git pull --ff-only`.
2. `node tools/check.js` must end with "check: all passed". Say "catch me up".
3. Before leaving a machine: commit and push.

## Next (queue set by Jess 2026-11-15; gym leader AI parked)
1. #124 economy pass, with #125 XP pass (shop price is 5 x world level x run level; you outlevel the world by about Lv 4).
   Slice opening first (goal, done, end-goal test).
2. #128 acquisition rework, then #97 upgrade system.
3. #126 UI unify umbrella (#61 style guide first), then #127 Main Menu v3.0.
4. #129 architecture review. 5. #130 later regions and map selection.
6. Parked: #111 (gyms 3 to 8), then #122 (blocked by #111).
3. #49: close (Decider done) or keep as umbrella. Board by hand: #86 to Accepted, #29 out of Blocked, the Triage cards.
4. New issues to draft: the leader reads your cards and items as seen (K2); buffValue reads the whole kit; the trace
   records the leader's level; 16i estimate-vs-real-hit parity. Comment on #122: an early gate gives a low-level leader
   its full loop card pool.
5. Any time: #121 (debug-moves split), #120 (planner verb test gap), #57, #58, #110 (relations test sweep).
6. Acquisition rework (decision 2026-11-12-acquisition-no-gacha-catch-candy-legendaries): file one parent issue, then slices.
7. Triage: needs-triage on #74 #75 #93 #97 #99 #100 #101 #102 #105 #107.
8. Owner decisions: #49, #97 (blocks #95), #86, #99, #93, #60 (Bait), #107.
9. New issues to file: region type maps, PARKED; Kanto T6 rolls no hordes; tools/make_seo_pages.py is missing.
10. Ask Jess: smoke-pause-menu "Cards Taken keeps its 400 px box" reads 401 since #83; unknown local branch
    refactor/damage-layer on the work machine.
11. Deferred hook (#91-2 C): Region Best's "gyms" must become gyms cleared on the final loop once #24 lands.
12. Test gap (low, co-op deferred): no mutant covers hud-player-panel.js hiding Silver in co-op.

## Open issues by area (numbers only, titles on GitHub, checked 2026-11-14 evening, Quick)
#123 filed 2026-11-15 (speed band, Needs Playtest). Others as checked 2026-11-14.
- UI and HUD: #25 #61 #72 (deferred) #74 #75 #79 (deferred) #93 #95 (blocked by #97) #99 #100 #102 #105
- Gyms: #6 #9 #20 #21 #24 #49 #57 #58 #60 #107 #109 #111 (blocked by #109) #120 #122 (blocked by #111)
- Moves: #11 #13 #14 #16 #18 #38 #44
- Engine: #8 #10 #12 #46 #48 #86 #97 #101 (day/night, parked) #121 #123
- Items: #36
- Docs: #28 #29 #110

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
