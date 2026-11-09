# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-09, Claude Code (home): #54 and #50 (#49 slice 1, Belief) shipped, feel-tested and closed.
Branch: feature/gym-leader-ai. Branch rules: docs/branch-rules/feature-gym-leader-ai.md (read it now).

## START HERE (next session, either tool)
1. Jess pulls this branch on the other machine.
2. #51 (ready) (#49 slice 2: planner core, executor and overlay), then #52, #53. Each opens with its goal, done-check and test.
   Spec: LEADER-AI "The Decider (#49)".
3. After #49: #39 (personalities). #44 and #46 any time (both ready). #48 research (ready).

## Where we are
- Terms: every Player entity runs Decider, Controller, Body, SimPass (LEADER-AI "FRAME", GLOSSARY).
- #50: G.LeaderBelief is the Decider's only door. Cooldown windows come from clean gaps G.LeaderInfo times in field time
  (the one place that mirrors the bench rule) and keeps in run memory; a slot switch spoils the next gap but keeps
  the last cast's time. Danger and opportunity exist but nothing reads them
  until #51. Decision 2026-11-09-50-cooldown-window-memoryuse-and-baseline.
- #54: ?dev quiet pause; auto-pause (tab hidden, portrait) still shows the menu.
- #38 swap keeps moves in flight: not started. #36 item reveals blocked. Roster UI #35.
- Gyms 3 to 8 stay on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30. Lint 0 errors, 72 warnings.

## Watch
- Mutation counts mean nothing while their harness is red (leader-stats-mutate until #30).
- A new module loaded by the Decider must join every harness FILES list (they stub missing G members with a no-op).
- Quick cannot run node. After ANY code edit, re-check mutate patterns against the edited files.
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- Python on Windows writes CRLF (use newline=''); Bash heredocs eat backslashes (use Edit, or a .py file written with Write).
- Pre-existing: move-sim-mutate "routing filter ignored" MISS; move-persist-mutate "survives a stun" and "a faint leaves
  the group alive" MISS; stat-stage-mutate 6/11 (2 STALE). boss-split STALE.
- http smokes fail ~1 run in 3 (ERR_NO_BUFFER_SPACE); repeat first.
- Rocky Helmet bugged, rejected on leaders. Bright Powder: recheck now the AI dodges.

## Open owner decisions
- Bench recharge (changes every Player entity; Belief mirrors whatever it becomes). Boss pool size; sprite scale; region
  unlock rule; Friends and Leaderboard grey-out.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
