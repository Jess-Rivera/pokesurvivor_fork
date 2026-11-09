# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-09, Claude Code (home): #47 (47a) shipped; #49 design session in progress (Belief and Strategy settled).
Branch: feature/gym-leader-ai. Branch rules: docs/branch-rules/feature-gym-leader-ai.md (read it now).

## START HERE (next session, either tool)
1. Jess pulls this branch on the other machine.
2. #49 design session continues: read docs/proposals/49-decider-design-notes.md "HANDOFF", then
   `/grilling planner details` (the notes' "Open" list). The planner's shape is settled. No code until the session closes.
3. After #49: #39 (personalities, re-scoped onto #49). #44 and #46 any time (both ready). #48 research (ready).

## Where we are
- Terms: every Player entity runs Decider, Controller, Body, SimPass (LEADER-AI "FRAME", GLOSSARY).
- #47 (47a) shipped 2026-11-09: a leader's attacks go through your cast gate (G.MoveSim.gateOpen, 0.05 s retry).
- #49 notes: Belief (learned cooldown windows, derived facts, confidence) and Strategy (seven intents, scored
  commitment, emergent not scripted) settled; the three managers were superseded by the GOAP planner the same day.
- Grilling skill now opens with Jess's overview, a play-back and the frontiers (.claude/skills/grilling).
- #38 swap keeps moves in flight: not started. #36 item reveals blocked. Roster UI #35.
- Gyms 3 to 8 stay on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30. Lint 0 errors, 72 warnings.

## Watch
- Mutation counts mean nothing while their harness is red (leader-stats-mutate until #30).
- Quick cannot run node. After ANY code edit, re-check mutate patterns against the edited files.
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- Python on Windows writes CRLF (use newline=''); Bash heredocs eat backslashes (use Edit, or a .py file written with Write).
- Pre-existing: move-sim-mutate "routing filter ignored" MISS; move-persist-mutate "survives a stun" and "a faint leaves
  the group alive" MISS; stat-stage-mutate 6/11 (2 STALE). boss-split STALE.
- http smokes fail ~1 run in 3 (ERR_NO_BUFFER_SPACE); repeat first.
- Rocky Helmet bugged, rejected on leaders. Bright Powder: recheck now the AI dodges.

## Open owner decisions
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call (also blocks the
  #49 belief about benched mons' cooldowns).

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
