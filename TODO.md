# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Getting up to date at home (Claude Code), from the 2026-11-14 midday Quick session (the merge)
Jess runs these in a terminal at the repo root (CLAUDE.md "Git and GitHub").
1. At home, `git status` must be clean. If it is not, commit what is there first (never edit on a dirty tree).
2. `git fetch origin`, then `git checkout main`, then `git pull --ff-only`. If it refuses, stop and tell the assistant.
3. Check: `git log --oneline -3` shows the merge of feature/gym-leader-ai on top.
4. `node tools/check.js` must end with "check: all passed".
5. If feature/gym-leader-ai still exists locally: `git branch -d feature/gym-leader-ai`.
6. Say "catch me up". New today: slice shape and Mermaid outputs are repo-wide rules in CLAUDE.md.
7. Before leaving home: commit and push, so work starts from the same tree.

## Next (from the 2026-11-14 Quick sessions: the gym-leader-ai merge)
1. #49: close (Decider done) or keep as umbrella. Board by hand if not done: #86 to Accepted, #29 out of Blocked,
   #95 blocked by #97 (Relationships), type label on #79, the new cards out of Triage, slice 12 blocked by the
   balance issue.
2. Brock and Misty balance issue, on its own branch off main (CLAUDE.md "Slice shape").
3. Review follow-ups (F1 merged 2026-11-14): F3 planner verb table, F5 Region Best, F6 debug.js, any time. Planner
   gaps #57 and #58 any time.
4. Slice 12 (gyms 3 to 8) after the tuning. The relations test sweep issue: one harness per pass, any time.
5. Acquisition rework (decision 2026-11-12-acquisition-no-gacha-catch-candy-legendaries): file one parent issue,
   then slices.
6. Triage: needs-triage on #74 #75 #93 #97 #99 #100 #101 #102 #105 #107 (checked 2026-11-14). #86 is `ready`.
7. Owner decisions that block or shape work: #49, #97 (blocks #95), #86, #99, #93, #60 (Bait), #107.
8. New issues to file: region type maps, PARKED;
   Kanto T6 rolls no hordes; tools/make_seo_pages.py is missing, so the publish command's last step fails.
9. Possible issue: smoke-pause-menu "Cards Taken keeps its 400 px box" reads 401 since #83. Ask Jess whether to file.
10. Chore for Jess: delete merged branches (chore/docs-cleanup, feature/entity-model, feature/gym-upgrade-authoring,
    feature/item-rework-v2, feature/leader-roster-ui, feature/pokeboxes, fix/onboarding-flow, fix/playtest-round-1,
    fix/ui-upgrade, feature/pause-menu-rework).
11. Deferred hook (#91-2 C): when the real loop counter lands (#24), Region Best's "gyms" must become gyms cleared on
    the final loop, not G.Gym.splits.length.
12. Test gap (low, co-op deferred): no mutant covers hud-player-panel.js hiding Silver in co-op.

## Open issues by area (numbers only, titles on GitHub, checked 2026-11-14 late morning, Quick)
- UI and HUD: #25 #61 #72 (deferred) #74 #75 #79 (deferred) #93 #95 #99 #100 #102 #105
- Gyms: #6 #9 #20 #21 #24 #49 #57 #58 #60 #107, plus the balance and slice 12 issues
- Moves: #11 #13 #14 #16 #18 #38 #44
- Engine: #8 #10 #12 #46 #48 #86 #97 #101 (day/night, parked)
- Items: #36
- Docs: #28 #29, plus the relations test sweep issue

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
