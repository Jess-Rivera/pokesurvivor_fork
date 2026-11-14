# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date at home (Claude Code), from the 2026-11-14 morning Quick session
Jess runs these in a terminal at the repo root (CLAUDE.md "Git and GitHub").
1. Before leaving work: commit this wrap-up and push feature/gym-leader-ai.
2. At home, `git status` must be clean. If it is not, commit what is there first (never edit on a dirty tree).
3. `git fetch origin`, then `git checkout feature/gym-leader-ai`, then `git pull --ff-only`. If it refuses, the two
   machines diverged: stop and tell the assistant.
4. Check: `git log --oneline -5` shows this wrap-up, then the #30, #39 close and 39a commits.
5. `node tools/check.js` must end with "check: all passed" (no expected reds any more).
6. Say "catch me up". New rule to know: tests check relations, not values (docs/TEST-FIRST.md step 3).
7. Before leaving home: commit and push, so work starts from the same tree.

## Next (from the 2026-11-14 morning Quick session: 39a, Bait parked, #30, the relations rule)
1. GitHub: cards B, C, F in docs/ASCII Concept Maps/39 - Issue Drafts.html; close #30; close #108 as not planned.
2. Gyms 3 to 8: merge first and migrate after, or migrate here first (STATE START HERE 2); fix host-model-plan
   line 152 to match the ruling, and file the slice-12 issue if migrating after.
3. Full leader-ai-mutate run (--full), then the structural review of feature/gym-leader-ai against main, then merge.
   Planner gaps #57 and #58 any time.
4. The Brock and Misty balance issue (once filed): retune from the overlay's goal and step in play.
5. Acquisition rework (decision 2026-11-12-acquisition-no-gacha-catch-candy-legendaries): file one parent issue,
   then slices.
6. Triage: needs-triage on #74 #75 #93 #97 #99 #100 #101 #102 #105 #107. #86 is `ready`.
7. Owner decisions that block or shape work: #97 (blocks #95), #86, #99, #93, #60 (Bait), #107.
8. New issues to file: card stacks over the level 12 budget (Brock 13, Misty 16); region type maps, PARKED;
   Kanto T6 rolls no hordes; tools/make_seo_pages.py is missing, so the publish command's last step fails.
9. Possible issue: smoke-pause-menu "Cards Taken keeps its 400 px box" reads 401 since #83. Ask Jess whether to file.
10. Chore for Jess: delete merged branches (chore/docs-cleanup, feature/entity-model, feature/gym-upgrade-authoring,
    feature/item-rework-v2, feature/leader-roster-ui, feature/pokeboxes, fix/onboarding-flow, fix/playtest-round-1,
    fix/ui-upgrade, feature/pause-menu-rework).
11. Deferred hook (#91-2 C): when the real loop counter lands (#24), Region Best's "gyms" must become gyms cleared on
    the final loop, not G.Gym.splits.length.
12. Test gap (low, co-op deferred): no mutant covers hud-player-panel.js hiding Silver in co-op.

## Open issues by area (numbers only, titles on GitHub, checked 2026-11-14, Quick)
- UI and HUD: #25 #61 #72 (deferred) #74 #75 #79 (deferred) #93 #95 #99 #100 #102 #105
- Gyms: #6 #9 #20 #21 #24 #30 #49 #57 #58 #60 #107 #108
- Moves: #11 #13 #14 #16 #18 #38 #44
- Engine: #8 #10 #12 #46 #48 #86 #97 #101 (day/night, parked)
- Items: #36
- Docs: #28 #29

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
