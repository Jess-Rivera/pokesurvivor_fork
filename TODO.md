# TODO, next-session handoff

Rewritten at the end of every session from what actually happened. Lines point at GitHub issue numbers;
the issue holds the detail, this file never copies it. Live backlog: `gh issue list` and the PokeSwarm board
(the board wins for "what's next"). Old long-form notes (frozen 2026-11-08): docs/TODO-notes-2026-11.md, search only.

## Next (from the 2026-11-11 session that finished feature/leader-roster-ui)
1. Jess: fast-forward feature/gym-leader-ai to feature/leader-roster-ui, push; work continues on gym-leader-ai.
2. Decide the path forward (fresh session). Candidates:
   - Finish gym-leader-ai: #53, then #39; planner gaps #57, #58; #30 before it merges to main.
   - Own branches, ready to start: #86 (whole levels at spawn), #82 pause menu (#83 team sheet), #75 map place names.
   - Any time: #44, #46, #56, #48, #38, #28, #24.
3. Triage: #75, #82, #83 carry needs-triage; #72 and #79 (deferred) sit in the board's Triage column;
   #29 carries a stale `blocked` label (its blocker #27 is closed).
4. Chore for Jess: delete merged branches (feature/leader-roster-ui once fast-forwarded; the assistant lists the rest).
The two red harnesses (gym-harness, leader-stats-harness) are expected red until #30.

## Open issues by area (numbers only, titles via gh)
- UI and HUD: #25 #61 #74 #75 #82 #83 #72 #79 (deferred)
- Gyms: #6 #9 #20 #21 #24 #30 #39 #49 #53 #57 #58 #60
- Moves: #11 #13 #14 #38 #44
- Engine: #8 #10 #12 #46 #48 #56 #86
- Items: #36
- Bugs: #16 #18
- Docs: #28 #29

## Deferred (cloud and multiplayer phase, do not start)
Open an issue labeled `deferred`; old notes are in docs/TODO-notes-2026-11.md.
