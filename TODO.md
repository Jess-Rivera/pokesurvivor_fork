# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date in Amazon Quick (work machine), from the 2026-11-12 home session
Jess runs these in a terminal at the repo root; the Quick agent does not (CLAUDE.md "Git and GitHub").
1. Before leaving home: `git push origin feature/pause-menu-rework` (the last commit there is the session end commit).
2. At work, `git status` must be clean. If it is not, commit what is there first (never edit on a dirty tree).
3. `git fetch origin`
4. `git checkout feature/pause-menu-rework`. If the branch does not exist on this machine yet:
   `git checkout -b feature/pause-menu-rework origin/feature/pause-menu-rework` (skip step 5).
5. `git pull --ff-only`. If it refuses, the two machines diverged: stop and tell the agent, do not merge or force.
6. Check: `git log --oneline -3` shows the "Session end: STATE, TODO, DEVLOG, decision for #90 pocket kinds, #94, #98"
   commit on top. `git log --oneline feature/pause-menu-rework..origin/main` should print nothing (main has not moved).
7. `node tools/check.js`: expect "check: FAILED (2 harness)", only gym-harness and leader-stats-harness (red until #30).
   Any other failure is new: tell the agent.
8. Open dev.html?dev from disk and start a run: pause it, check the Run Inventory and that a berry or run item can be
   dragged into the Temporary Pocket.
9. Tell the Quick agent "catch me up". It has no gh, so it reads STATE.md and this file; the board and issue list are
   not visible to it, and the open items below are its source.
10. Before leaving work: commit and `git push origin feature/pause-menu-rework`, so home starts from the same tree.

## Next (from the 2026-11-12 session that closed #90, #94, #98)
1. #91: pause menu Run Info panel and Per Pokemon Run Stats (new tracking). Then #83, then #92 (children of #82);
   merge the branch back into feature/gym-leader-ai when #82 is done.
2. Owner decisions that block or shape work: #97 (permanent upgrade rework, blocks #95), #86 (gym leaders round down?),
   #99 (menu font), #93 (tooltip scope).
3. Triage: #97 and #99 new in Triage; #93 and #75 carry needs-triage; #72, #79 (deferred) and #74 sit in Triage; #86 is
   `ready` but its card is in Triage; #29 has a stale `blocked` label (blocker #27 closed).
4. Leader AI when ready: #53, then #39; planner gaps #57, #58; #30 before gym-leader-ai merges to main.
5. Chore for Jess: delete merged branches (chore/docs-cleanup, feature/entity-model, feature/gym-upgrade-authoring,
   feature/item-rework-v2, feature/leader-roster-ui, feature/pokeboxes, fix/onboarding-flow, fix/playtest-round-1, fix/ui-upgrade).
The two red harnesses (gym-harness, leader-stats-harness) are expected red until #30.

## Open issues by area (numbers only, titles via gh)
- UI and HUD: #25 #61 #74 #75 #82 (#91 #83 #92) #93 #95 #99 #72 #79 (deferred)
- Gyms: #6 #9 #20 #21 #24 #30 #39 #49 #53 #57 #58 #60
- Moves: #11 #13 #14 #38 #44
- Engine: #8 #10 #12 #46 #48 #56 #86 #97
- Items: #36
- Bugs: #16 #18
- Docs: #28 #29

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
