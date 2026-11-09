# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-09, Claude Code (home), #40 built.
Branch: feature/gym-leader-ai. Branch rules: docs/branch-rules/feature-gym-leader-ai.md (read it now).

## START HERE (next session, either tool)
1. Jess pulls this branch on the other machine.
2. Jess feel-tests #40 (Needs Playtest): leaders attack at once (firstWait 0); a sleep mid wind-up cancels it.
3. Then #41 (cleanup, ready): open it with goal, done check and test. Then #42 (Jess rules each item), then #39.

## Where we are
- #40 built 2026-11-09: the leader's frame runs your flow (decide, hands, body, sim pass; decision
  2026-11-09-every-player-entity-runs-one-flow-decide-hands-body-sim; LEADER-AI "FRAME"). The AI has no stun gate;
  the body refuses movement, dodge and a new wind-up; slot presses and swaps land; timers keep running; a stun mid
  wind-up cancels it. `firstWait` restriction, 0 when absent (2026-11-09-leader-first-attack-wait-defaults-to-0).
- Both parity traces re-recorded on #40 (order shift alone: at most 2 frames, 5.5 px; then firstWait 0).
- 5a (#34) shipped: GymBrain out of Player-entity leaders. Slices 1 to 4 shipped (#22, #31, #32, #33).
- Test: leader-ai-harness.js (508), leader-ai-mutate.js (102/102), gym-leader-mutate 58/58, leader-team-mutate 17/17.
- #38 swap keeps moves in flight, #37 font swap: filed, not started. #36 item reveals blocked. Roster UI #35.
- Gyms 3 to 8 stay on the old brain until slice 12. Slice 8 DPS report (Q10) still unread.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30. Lint 0 errors, 72 warnings.

## Watch
- Quick cannot run node. After ANY code edit, re-check mutate patterns against the edited files.
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- Python on Windows writes CRLF (use newline=''); Bash heredocs eat backslashes (use Edit).
- boss-split-mutate "the arena spawns a plain enemy" is STALE (older than slice 1).
- http smokes fail ~1 run in 3 (ERR_NO_BUFFER_SPACE); repeat first.
- Rocky Helmet bugged, rejected on leaders. Bright Powder: recheck now the AI dodges.
- File:// font: Chromium blocks Silver-game.ttf (dev.html line 52).
- `move-sim-mutate` "routing filter ignored" is a real MISS (28/29), older than slice 5.

## Open owner decisions
- #42 items 10 to 15 (before #39). Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
