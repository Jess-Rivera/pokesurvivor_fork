# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date at home (Claude Code), from the 2026-11-13 morning Quick session
Jess runs these in a terminal at the repo root (CLAUDE.md "Git and GitHub").
1. Before leaving work: commit the wrap-up, push, and (if done) merge into feature/gym-leader-ai and push that.
2. At home, `git status` must be clean. If it is not, commit what is there first (never edit on a dirty tree).
3. `git fetch origin`, then `git checkout feature/gym-leader-ai` (the pause menu work is merged into it),
   then `git pull --ff-only`. If it refuses, the two machines diverged: stop and tell the assistant.
4. Check: `git log --oneline -3` shows this handoff commit, then the merge (78d69120).
5. `node tools/check.js`: expect only gym-harness and leader-stats-harness red (until #30). Anything else is new.
6. Say "catch me up".
7. Before leaving home: commit and push, so work starts from the same tree.

## Next (from the 2026-11-13 morning Quick session that closed #104 and #82)
1. Delete feature/pause-menu-rework (merged into feature/gym-leader-ai 2026-11-13, 78d69120).
2. Board fixes drafted 2026-11-13: comment on #99 with the font rule, close #106 as a duplicate of #99, comment on
   #102 (the old team sheet is co-op only now).
3. Acquisition rework (decision 2026-11-12-acquisition-no-gacha-catch-candy-legendaries, map Acquisition v1): file
   one parent issue, then slices. Children: the 8-move import (T3b), 15 evolution items + Link Cable, Accelgor route.
4. Triage: needs-triage on #75 #93 #97 #99 #100 #101 #102 #105 #106 (#101 has no type or area label); #72, #74,
   #79 sit in Triage; #86 is `ready` but carded in Triage; #29 has a stale `blocked` label (blocker #27 closed).
5. Owner decisions that block or shape work: #97 (blocks #95), #86 (gym leaders round down?), #99 (menu buttons'
   font), #93 (tooltip scope), #60 (Bait).
6. New issue to file: region type maps, PARKED (decision 2026-11-12-region-type-maps-fill-rules). Also: Kanto T6
   rolls no hordes; tools/make_seo_pages.py is missing, so the publish command's last step fails.
7. Possible issue: smoke-pause-menu "Cards Taken keeps its 400 px box" reads 401 since #83 (likely the smoke's
   1028 scale math, not the layout). Ask Jess whether to file.
8. Leader AI when ready: #53, then #39; planner gaps #57, #58; #30 before gym-leader-ai merges to main.
9. Chore for Jess: delete merged branches (chore/docs-cleanup, feature/entity-model, feature/gym-upgrade-authoring,
   feature/item-rework-v2, feature/leader-roster-ui, feature/pokeboxes, fix/onboarding-flow, fix/playtest-round-1,
   fix/ui-upgrade, and feature/pause-menu-rework once merged).
10. #56 closed 2026-11-13 on a 0-STALE scan (63 retargeted, 1 removed). The 13 scripts were not run after the
    retarget, so a MISSED retargeted break would first show the next time that script runs.
11. Deferred hook (#91-2 C): when the real loop counter lands (#24), Region Best's "gyms" must become gyms cleared on
    the final loop, not G.Gym.splits.length.
12. Test gap (low, co-op deferred): no mutant covers hud-player-panel.js hiding Silver in co-op.
The two red harnesses (gym-harness, leader-stats-harness) are expected red until #30.

## Open issues by area (numbers only, titles on GitHub, checked 2026-11-13, Quick)
- UI and HUD: #25 #61 #74 #75 #93 #95 #99 #100 #102 #105 #106 #72 #79 (deferred)
- Gyms: #6 #9 #20 #21 #24 #30 #39 #49 #53 #57 #58 #60
- Moves: #11 #13 #14 #38 #44
- Engine: #8 #10 #12 #46 #48 #56 #86 #97 #101 (day/night, parked)
- Items: #36
- Bugs: #16 #18
- Docs: #28 #29

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
