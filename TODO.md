# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date at home (Claude Code), from the 2026-11-13 evening Quick session
Jess runs these in a terminal at the repo root (CLAUDE.md "Git and GitHub").
1. Before leaving work: commit the wrap-up and push feature/gym-leader-ai.
2. At home, `git status` must be clean. If it is not, commit what is there first (never edit on a dirty tree).
3. `git fetch origin`, then `git checkout feature/gym-leader-ai`, then `git pull --ff-only`. If it refuses, the two
   machines diverged: stop and tell the assistant.
4. Check: `git log --oneline -3` shows this wrap-up commit, then the #53 commit.
5. `node tools/check.js`: expect only gym-harness and leader-stats-harness red (until #30). Anything else is new.
6. Say "catch me up". The new skills (coding-principles, structural-review, writing-check, review-feedback) are in
   .claude/skills.
7. Before leaving home: commit and push, so work starts from the same tree.

## Next (from the 2026-11-13 evening Quick session that built and closed #53)
1. #39 personalities: open the slice (goal, done-condition, test) before any plan (STATE START HERE 1).
2. #30, then a structural review of feature/gym-leader-ai against main, then the merge to main. Planner gaps #57 and
   #58 any time.
3. #49: all four build slices shipped; close it, or keep it open on #60 (Bait).
4. Acquisition rework (decision 2026-11-12-acquisition-no-gacha-catch-candy-legendaries, map Acquisition v1): file
   one parent issue, then slices. Children: the 8-move import (T3b), 15 evolution items + Link Cable, Accelgor route.
5. Triage: needs-triage on #74 #75 #93 #97 #99 #100 #101 #102 #105 #107. #86 is `ready`; check its card left Triage.
6. Owner decisions that block or shape work: #97 (blocks #95), #86 (gym leaders round down?), #99 (menu buttons'
   font), #93 (tooltip scope), #60 (Bait), #107 (refuse a trigger's dodgeRead or predictCap, or rebuild the bag).
7. New issues to file: region type maps, PARKED (decision 2026-11-12-region-type-maps-fill-rules); Kanto T6 rolls no
   hordes; tools/make_seo_pages.py is missing, so the publish command's last step fails.
8. Possible issue: smoke-pause-menu "Cards Taken keeps its 400 px box" reads 401 since #83 (likely the smoke's 1028
   scale math, not the layout). Ask Jess whether to file.
9. Chore for Jess: delete merged branches (chore/docs-cleanup, feature/entity-model, feature/gym-upgrade-authoring,
   feature/item-rework-v2, feature/leader-roster-ui, feature/pokeboxes, fix/onboarding-flow, fix/playtest-round-1,
   fix/ui-upgrade, feature/pause-menu-rework).
10. #56 closed on a 0-STALE scan; the 13 retargeted scripts were not run after, so a missed break would first show the
    next time that script runs.
11. Deferred hook (#91-2 C): when the real loop counter lands (#24), Region Best's "gyms" must become gyms cleared on
    the final loop, not G.Gym.splits.length.
12. Test gap (low, co-op deferred): no mutant covers hud-player-panel.js hiding Silver in co-op.
The two red harnesses (gym-harness, leader-stats-harness) are expected red until #30.

## Open issues by area (numbers only, titles on GitHub, checked 2026-11-13, Quick)
- UI and HUD: #25 #61 #72 (deferred) #74 #75 #79 (deferred) #93 #95 #99 #100 #102 #105
- Gyms: #6 #9 #20 #21 #24 #30 #39 #49 #57 #58 #60 #107
- Moves: #11 #13 #14 #16 #18 #38 #44
- Engine: #8 #10 #12 #46 #48 #86 #97 #101 (day/night, parked)
- Items: #36
- Docs: #28 #29

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
