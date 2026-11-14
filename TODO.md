# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date at home (Claude Code), from the 2026-11-14 afternoon Quick session
Jess runs these in a terminal at the repo root (CLAUDE.md "Git and GitHub").
1. At home, `git status` must be clean. If it is not, commit what is there first (never edit on a dirty tree).
2. `git fetch origin`, then `git checkout main`, then `git pull --ff-only`. If it refuses, stop and tell the assistant.
3. Check: `git log --oneline -8` shows this wrap-up, then the merges of refactor/debug-split,
   refactor/planner-verb-table, refactor/hud-kit-split and feature/gym-leader-ai.
4. `node tools/check.js` must end with "check: all passed" (debug-registry-harness is new in the list).
5. Prune merged branches: `git branch --merged main`, then `git branch -d <name>` for each one listed except main.
6. Say "catch me up". New today: slice shape, Mermaid outputs and the debug-files NEED exception are repo-wide rules.
7. Before leaving home: commit and push, so work starts from the same tree.

## Next (from the 2026-11-14 Quick sessions: the merge and the structural review follow-ups)
1. #109 Brock and Misty tuning: open the slice on its own branch off main (CLAUDE.md "Slice shape").
2. #49: close (Decider done) or keep as umbrella. Board by hand if not done: #86 to Accepted, #29 out of Blocked,
   #95 blocked by #97 (Relationships), type label on #79, the new cards out of Triage, #111 blocked by #109.
3. GitHub: close #112 #113 #114 #115 as duplicates of #116 #117 #118 #119 (all four originals are closed;
   F5 #118 closed not planned).
4. Any time: #121 (debug-moves split), #120 (planner verb test gap), #57, #58, #110 (relations test sweep).
5. #111 slice 12 (gyms 3 to 8) after the tuning.
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

## Open issues by area (numbers only, titles on GitHub, checked 2026-11-14 afternoon, Quick)
Confirmed from #85 to #121. The API cut off below #85, so lower numbers stay as they were (unconfirmed).
"(dup)" marks #112 to #115, open twins of the closed #116 to #119; they go when Jess closes them.
- UI and HUD: #25 #61 #72 (deferred) #74 #75 #79 (deferred) #93 #95 (blocked by #97) #99 #100 #102 #105 #112 (dup)
- Gyms: #6 #9 #20 #21 #24 #49 #57 #58 #60 #107 #109 #111 (blocked by #109) #113 (dup) #120
- Moves: #11 #13 #14 #16 #18 #38 #44
- Engine: #8 #10 #12 #46 #48 #86 #97 #101 (day/night, parked) #114 (dup) #115 (dup) #121
- Items: #36
- Docs: #28 #29 #110

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
