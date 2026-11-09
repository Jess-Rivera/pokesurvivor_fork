# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-09, Claude Code (home): #41, #42, #45, #37 closed; #43 next.
Branch: feature/gym-leader-ai. Branch rules: docs/branch-rules/feature-gym-leader-ai.md (read it now).

## START HERE (next session, either tool)
1. Jess pulls this branch on the other machine.
2. #43 (movement split, plus #42 item 13), then #47 (cast gate, move-in score), then #39. #44 any time.

## Where we are
- Terms (2026-11-09): every Player entity runs Decider, Controller, Body, SimPass (LEADER-AI "FRAME", GLOSSARY).
  Authoring layers: Player, class, instance (COMBAT-RULES "Host model").
- #41 shipped 2026-11-09 (initial playtest reports good). The Caster is gone: Body
  G.GymLeader (state, acceptsAttack), SimPass G.GymLeader.SimPass, Decider G.LeaderAI (attackScore, slot, heal,
  edge unstick). `wildStatusDivisor` restriction (off): your status-category hits on leaders use their Def.
- #40 shipped. 5a (#34) and slices 1 to 4 shipped.
- Test: leader-ai-harness 544, gym-leader 161, leader-slots 41; mutate 113, 59, 22. Parity traces unchanged.
- #42 ruled and closed 2026-11-09 (items 11 to 15: decision files 2026-11-09-42-*). Shipped 2026-11-09: #45 strongHost out, #37 Michroma font. Filed
  #46 explicit sides (after #43), #47 leader attacks on your cast gate (after #43). #43 ready (unblocked). #44 ready.
- #38 swap keeps moves in flight: not started. #36 item reveals blocked. Roster UI #35.
- Gyms 3 to 8 stay on the old brain until slice 12. Slice 8 DPS report (Q10) closed as superseded.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30. Lint 0 errors, 72 warnings.

## Watch
- Mutation counts mean nothing while their harness is red (leader-stats-mutate until #30).
- Quick cannot run node. After ANY code edit, re-check mutate patterns against the edited files.
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- Python on Windows writes CRLF (use newline=''); Bash heredocs eat backslashes (use Edit).
- boss-split-mutate "the arena spawns a plain enemy" is STALE (older than slice 1).
- http smokes fail ~1 run in 3 (ERR_NO_BUFFER_SPACE); repeat first.
- Rocky Helmet bugged, rejected on leaders. Bright Powder: recheck now the AI dodges.
- `move-sim-mutate` "routing filter ignored" is a real MISS (28/29), older than slice 5.

## Open owner decisions
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
