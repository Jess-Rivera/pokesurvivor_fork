# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date (either machine)
Run `node tools/catchup.js` (prints the briefing and the exact sync commands, writes catchup-latest.md). Quick cannot run
node or gh: Jess runs it and points Quick at catchup-latest.md. Before leaving a machine: commit and push.

## Next (branch feature/138-146-lost-and-full-box covers #138 to #146; Jess 2026-11-21)
0. Held catch compare closed 2026-11-27 (feel test passed). Branch work left: #141 and #140, #139 8b and 8c, #142, #143 (order in
   item 3); #144 is deferred. Merge to main after #143. #174 shiny catches needs its slice opening.
   #171 (circling rim for selected portraits) is an idea, needs triage.
1. #172 (split from the closed upgrades rework): Character Upgrades (account-wide list: Magnet, Card Reroll, Veto, PokeCoin %, Silver %, pockets),
   then the #150 starting-move picker (needs a learnset rebake with levels and egg-move unlock data). Split out: #164
   (97b sidegrades), #165 (Mints, Capsules, Bottle Caps), #169 (leaders with upgrades, blocked on slice C).
1c. #166 run telemetry (ongoing data collection; feeds the #172 and #131 numbers). Slice opening first.
2. #139 8b evolve, then grill friendship (docs/AI Outputs/Issue-139/139 - Friendship Minutes Deep Dive.md, [Open]),
   then 8c. #161 fatigue (stub) rides with it.
3. Then #141 and #140 (moves and items 8b needs), #139 8b, #142, #143, #162. #144 is deferred (cloud).
4. #163 evolution materials shop tab (new, with #162): needs the type-to-material map and the shop price.
5. #126 UI unify (#61 first), then #127 Main Menu v3.0. #129 architecture review. #130 regions and map selection.
   Parked: #111, then #122.
6. Board fixes (Jess, on GitHub): #160 duplicates #159 (close one); #151 #152 #153 and older closed issues still
   carry needs-playtest; #155 closed but labeled ready; no type label on #10 #79 #86 #110 #120 #121 #122 #131
   #156 #159 #160; #29 in Blocked with no label. Triage: needs-triage on #74 #75 #93 #99 #100 #101 #102 #105 #107
   #156 #158. Tooltips: Jess to say what is wrong in general (new issue, or #102 and #158 under #126).
7. Owner decisions: the full list is in STATE.md "Open owner decisions" (catchup.js prints it with titles).
8. #170: smoke-pause-menu throws in its EV screen section; its stat hex check fails with per-copy upgrades (needs-triage).
   Small issue ideas: "A Adamant Eevee" (An before a vowel nature, rescue and Lost toasts); region type maps,
   PARKED; Kanto T6 rolls no hordes; tools/make_seo_pages.py is missing;
   the 15 old tools/smoke-ui.js failures (run shops, catch window height, Shop balls) have no issue.
9. Ask Jess: smoke-pause-menu "Cards Taken keeps its 400 px box" reads 401 since the closed #83; local branch
   refactor/damage-layer; local balance/109 (754477f) differs from origin (a1dc095).
10. Deferred hook (closed #91, part 2 C): Region Best's "gyms" must become gyms cleared on the final loop once #24 lands.

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
