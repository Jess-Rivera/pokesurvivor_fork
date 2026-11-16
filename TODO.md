# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date (either machine), from the 2026-11-15 night home session
1. `git status` must be clean. `git fetch origin`, then `git checkout feature/128-acquisition`
   (first time on a machine: `git checkout -b feature/128-acquisition origin/feature/128-acquisition`), then `git pull --ff-only`.
2. `node tools/check.js` must end with "check: all passed". Say "catch me up".
3. Before leaving a machine: commit and push (the branch and main).

## Next (queue set by Jess 2026-11-15; gym leader AI parked)
1. Owed: feel test #136 (catch phase; G.Debug.rescue() or G.Debug.catch()). Its screen works; Jess polishes the catch UI later
   (with #126). #145 (move tooltip class) is small and ready.
2. #128 acquisition on feature/128-acquisition: #137 (Shop balls, ends the belt refill) next, then #138; #146 keep-or-sell list;
   order in docs/ASCII Concept Maps/128 - Acquisition Slices Draft.md (#132 to #143).
3. #97 full redesign, shipping with the new save: Jess answers the review's calls (docs/ASCII Concept Maps/
   97 - Upgrade System Review.md). #131 Silver bonuses later, after a traced run reaches gym 1. 4. #126 UI unify (#61 first), then #127 Main Menu v3.0.
5. #129 architecture review. 6. #130 regions and map selection. Parked: #111, then #122.
7. Leftovers from earlier: #49 close or umbrella; board by hand (#86 to Accepted, #29 out of Blocked, the Triage cards);
   drafts (leader reads your cards and items as seen; buffValue reads the whole kit; trace records the leader's level; 16i
   parity; #122 comment on early gates). Any time: #121, #120, #57, #58, #110.
   Triage: needs-triage on #74 #75 #93 #99 #100 #101 #102 #105 #107.
8. Owner decisions: #49, #97 (blocks #95), #86, #99, #93, #60 (Bait), #107.
9. New issues to file: region type maps, PARKED; Kanto T6 rolls no hordes; tools/make_seo_pages.py is missing.
10. Ask Jess: smoke-pause-menu "Cards Taken keeps its 400 px box" reads 401 since #83; unknown local branch
    refactor/damage-layer on the work machine.
11. Deferred hook (#91-2 C): Region Best's "gyms" must become gyms cleared on the final loop once #24 lands.
12. Test gap (low, co-op deferred): no mutant covers hud-player-panel.js hiding Silver in co-op.

## Open issues by area (numbers only, titles on GitHub, checked 2026-11-14 evening, Quick)
#124 to #130 filed 2026-11-15 (the new queue). #109 and #123 closed 2026-11-15. Others as checked 2026-11-14.
- UI and HUD: #25 #61 #72 (deferred) #74 #75 #79 (deferred) #93 #95 (blocked by #97) #99 #100 #102 #105
- Gyms: #6 #9 #20 #21 #24 #49 #57 #58 #60 #107 #109 #111 (blocked by #109) #120 #122 (blocked by #111)
- Moves: #11 #13 #14 #16 #18 #38 #44
- Engine: #8 #10 #12 #46 #48 #86 #97 #101 (day/night, parked) #121 #123
- Items: #36
- Docs: #28 #29 #110

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
