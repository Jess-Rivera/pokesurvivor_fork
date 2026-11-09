# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-09, Claude Code (home): #43 shipped (feel test passed).
Branch: feature/gym-leader-ai. Branch rules: docs/branch-rules/feature-gym-leader-ai.md (read it now).

## START HERE (next session, either tool)
1. Jess pulls this branch on the other machine.
2. #47 (cast gate, move-in score), then #39. #44 and #46 any time (both ready). #48 research (ready).

## Where we are
- Terms: every Player entity runs Decider, Controller, Body, SimPass (LEADER-AI "FRAME", GLOSSARY).
- #43 shipped 2026-11-09 (decision 2026-11-09-43-movement-split-opening). Step A, behavior-neutral: the Body's checks
  acceptHeading, acceptDodge, acceptsCast; G.PlayerEntity.SimPass (js/entities/player-sim-pass.js) moves, ticks, aims.
  Step B: a leader's frame runs your order (G.GymArena.swapStep, fieldFrame, shakeStep, tickSlotLock; G.EnemyMgr.replace).
  Misty2 5a trace re-recorded (swap one frame earlier). Test: player-move-trace-harness 95, mutate 29.
- Test: leader-ai-harness 544, gym-leader 161, leader-slots 41; mutate 113, 59, 22, player-entity 37, team 46, boss-owner 62.
- #48 filed: research, HumanPlayer rules out of game.js into their own files.
- #38 swap keeps moves in flight: not started. #36 item reveals blocked. Roster UI #35.
- Gyms 3 to 8 stay on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30. Lint 0 errors, 72 warnings.

## Watch
- Mutation counts mean nothing while their harness is red (leader-stats-mutate until #30).
- Quick cannot run node. After ANY code edit, re-check mutate patterns against the edited files.
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- Python on Windows writes CRLF (use newline=''); Bash heredocs eat backslashes (use Edit, or a .py file written with Write).
- Older than #43, seen on the pre-change code too: move-sim-mutate "routing filter ignored" MISS; move-persist-mutate
  "survives a stun" and "a faint leaves the group alive" MISS; stat-stage-mutate 6/11 (2 STALE). boss-split STALE.
- http smokes fail ~1 run in 3 (ERR_NO_BUFFER_SPACE); repeat first.
- Rocky Helmet bugged, rejected on leaders. Bright Powder: recheck now the AI dodges.

## Open owner decisions
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
