# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date (either machine), from the 2026-11-22 session (home)
1. On this machine: `git status`, then `git push origin feature/138-146-lost-and-full-box`. The old
   feature/128-acquisition branch is merged and can be deleted (its dashboard commits are on this branch).
2. On the other machine: `git fetch origin`, `git checkout feature/138-146-lost-and-full-box` (use
   `git checkout -b feature/138-146-lost-and-full-box origin/feature/138-146-lost-and-full-box` the first time),
   `git pull --ff-only`, then `node tools/check.js` (must end "check: all passed"). Say "catch me up".
3. Before leaving a machine: commit and push.

## Next (branch feature/138-146-lost-and-full-box covers #138 to #146; Jess 2026-11-21)
0. #139 S8 8a: Jess OKs docs/AI Outputs/Issue-139/139a - Candy Build Plan.md (the fixed tier-to-size rule, whether the
   elite berry and ground item stay beside the ladder, UberElite and elite counts), then build Parts A to G, tests
   first. Rulings: decision 2026-11-22-139-candy-target-and-drop-model.
1. Grill #97 (upgrade rework). The starting-move picker (#150 folded in) waits on it, then needs a learnset rebake
   with levels and the egg-move unlock data.
2. #139 8b evolve, then grill friendship (docs/AI Outputs/Issue-139/139 - Friendship Minutes Deep Dive.md, [Open]),
   then 8c. #161 fatigue (stub) rides with it.
3. #146 keep-or-sell list; #145 small and ready (may ride this branch). Then #140 to #143 and #162.
4. #163 evolution materials shop tab (new, with #162): needs the type-to-material map and the shop price.
5. #126 UI unify (#61 first), then #127 Main Menu v3.0. #129 architecture review. #130 regions and map selection.
   Parked: #111, then #122.
6. Board fixes (Jess, on GitHub): #160 duplicates #159 (close one); #151 #152 #153 and older closed issues still
   carry needs-playtest; #155 closed but labeled ready; no type label on #10 #79 #86 #110 #120 #121 #122 #131
   #156 #159 #160; #29 in Blocked with no label. Triage: needs-triage on #74 #75 #93 #99 #100 #101 #102 #105 #107
   #156 #158.
7. Owner decisions: #49, #97 (blocks #95, #150), #86, #99, #93, #60 (Bait), #107. Tooltip pin and close icons.
8. Small issue ideas: "A Adamant Eevee" (An before a vowel nature, rescue and Lost toasts); region type maps,
   PARKED; Kanto T6 rolls no hordes; tools/make_seo_pages.py is missing.
9. Ask Jess: smoke-pause-menu "Cards Taken keeps its 400 px box" reads 401 since #83; local branch
   refactor/damage-layer; local balance/109 (754477f) differs from origin (a1dc095).
10. Deferred hook (#91-2 C): Region Best's "gyms" must become gyms cleared on the final loop once #24 lands.

## Open issues by area (numbers only, titles on GitHub, checked 2026-11-21 evening, Quick)
Confirmed this pull: 66 open issues, #6 to #162 (#43 did not come back; it is not listed here).
- UI and HUD: #25 #61 #72 (deferred) #74 #75 #79 (deferred) #93 #95 (blocked by #97) #99 #100 #102 #105 #126 #127
  #145 #146 #156 #158
- Gyms: #6 #9 (blocked) #20 (blocked) #21 (blocked) #24 #49 #57 #58 #60 (blocked) #107 #111 (parked) #120 #122
  (blocked by #111)
- Moves: #11 #13 #14 #16 #18 #38 #44 #141 #150 (blocked by #97)
- Enemies: #143
- Engine: #8 #10 (blocked) #12 #46 #48 #86 #97 #101 (day/night, parked) #121 #128 #129 #130 #139 #142 #144
  (deferred) #159 (deferred) #160 (deferred, duplicate of #159) #161
- Items: #36 (blocked) #131 #140 #162
- Docs: #28 #29 #110

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
