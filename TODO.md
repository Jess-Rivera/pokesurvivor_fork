# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date (either machine), from the 2026-11-20 afternoon work session (Quick)
1. On the work machine: `node tools/check.js` and `npm run format`, then this session's wrap-up commits,
   then `git push origin feature/128-acquisition`.
2. On the other machine: `git fetch origin`, `git checkout feature/128-acquisition`, `git pull --ff-only`, then
   `node tools/check.js` (must end "check: all passed"). Say "catch me up".
3. Before leaving a machine: commit and push.

## Next (queue set by Jess 2026-11-15, updated 2026-11-20; gym leader AI parked)
0. #155 UI Library v2 (the 155b to 155c-6 plan docs are stale; trust the code). In order:
   - main.shop.* one tab at a time. main.shop.pokeball and main.shop.character approved 2026-11-20 (their decisions).
     Next **main.shop.items**, then main.shop.tms; both drafts are NOT APPROVED, a starting point only.
     Open: card and owned-panel edge grey.slate or teal.
   - Primitives, Inputs (field.text, field.dropdown, scroll.bar): drafted 2026-11-20, kept, not reviewed yet.
   - Tooltip: look ruled (2026-11-20-155-tooltip-is-panel-clean-yellow-frame-three-states); the pin and close icons
     are open (Jess is drawing them). Pinnable tooltips filed as #158.
   - Done 2026-11-20: two-type team slot rim, tooltip, every tooltip in Michroma (name 20, text 12), move slots and the
     rest of run.hud.playerActive.area (decisions 2026-11-20-155-*). Still owed from the HUD sets: nothing.
   - Feel test Tokens, Fonts: Michroma's size set, the 9 inferred Fold Map rows, today's new rows (tooltips, Shake Off).
   - Jess lists the poor UX calls in the 155c-4 ask dialog (look and keys) so they can be filed.
   - Colours: name the 7 UI colours and the greys (placeholders on the board); rebuild the rims from Unified.
   - Then the Pause composites (pause.pokemonDetail and the rest).
   - #156: likely moot (button.slanted and button.rounded retire at #126); Jess closes or keeps it.
   - Then #126 applies the board (the 2026-11-18, -19 and -20 #155 decisions). #126 also fixes tokens.js's backwards
     pokeBW and michroma job text, its tooltip font text, and line 139's smoke-ui-library comment.
1. #145 small and ready. #150 blocked on #97.
2. #128 acquisition: #138 next, then #146 keep-or-sell list; order in
   docs/ASCII Concept Maps/128 - Acquisition Slices Draft.md (#132 to #143).
3. #97 full redesign, shipping with the new save: Jess answers the review's calls (docs/ASCII Concept Maps/
   97 - Upgrade System Review.md). #131 Silver bonuses later, after a traced run reaches gym 1.
4. #126 UI unify (#61 first), then #127 Main Menu v3.0. 5. #129 architecture review. 6. #130 regions and map selection.
   Parked: #111 (its blocker #109 is closed), then #122.
7. Leftovers from earlier: #49 close or umbrella; board by hand (#86 to Accepted, #29 out of Blocked, the Triage cards);
   drafts (leader reads your cards and items as seen; buffValue reads the whole kit; trace records the leader's level; 16i
   parity; #122 comment on early gates). Any time: #121, #120, #57, #58, #110.
   Triage: needs-triage on #74 #75 #93 #99 #100 #101 #102 #105 #107 #156 #158. #155 card sits in Triage (move it).
8. Owner decisions: #49, #97 (blocks #95), #86, #99, #93, #60 (Bait), #107.
9. New issues to file: region type maps, PARKED; Kanto T6 rolls no hordes; tools/make_seo_pages.py is missing.
10. Ask Jess: smoke-pause-menu "Cards Taken keeps its 400 px box" reads 401 since #83; unknown local branch
    refactor/damage-layer on the work machine; local balance/109 (754477f) differs from origin (a1dc095).
11. Deferred hook (#91-2 C): Region Best's "gyms" must become gyms cleared on the final loop once #24 lands.
12. Test gap (low, co-op deferred): no mutant covers hud-player-panel.js hiding Silver in co-op.
13. Board cleanup (low): delete tools/library/stories/button.story.js and panel.story.js (no tab shows them).

## Open issues by area (numbers only, titles on GitHub, checked 2026-11-20 afternoon, Quick)
Confirmed this pull: #70 to #158. Older numbers left as checked earlier (unconfirmed).
- UI and HUD: #25 #61 #72 (deferred) #74 #75 #79 (deferred) #93 #95 (blocked by #97) #99 #100 #102 #105 #126 #127
  #145 #146 #155 #156 #158
- Gyms: #6 #9 #20 #21 #24 #49 #57 #58 #60 #107 #111 (parked) #120 #122 (blocked by #111)
- Moves: #11 #13 #14 #16 #18 #38 #44 #141 #150 (blocked by #97)
- Enemies: #143
- Engine: #8 #10 #12 #46 #48 #86 #97 #101 (day/night, parked) #121 #128 #129 #130 #138 #139 #142 #144 (deferred)
- Items: #36 #131 #140
- Docs: #28 #29 #110

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
