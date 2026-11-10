# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-09, Claude Code (home): #52 closed (feel test good). #59 filed for the three blocked duels.
Branch: feature/gym-leader-ai. Branch rules: docs/branch-rules/feature-gym-leader-ai.md (read it now).

## START HERE (next session, either tool)
1. Jess pulls this branch on the other machine.
2. #59 (unblock the duels), then #53, then #39. Feel test note on #39: default weights move and dodge a lot, attack less.

4. Any time: #44, #46, #56 (stale mutation patterns), #57 and #58 (planner gaps). #48 research.

## Where we are
- Terms: every Player entity runs Decider, Controller, Body, SimPass (LEADER-AI "FRAME", GLOSSARY).
- #52: Swap to mon (first step only; worth its later steps plus its matchup over 10 s), Dash in, Draw your shot,
  Dodge your shot are planner actions; Belief's snapshot carries the bench, sleep and dodge. Old swap choice and
  gap-closing dodge gone. Decisions 2026-11-09-52-opening-stall-guards-dodge-cost-swap-value, -52-swap-matchup-window-and-duels.
- Harness 16e: Bait, counter-play and learning print BLOCKED (#59), not FAIL.
- Gyms 3 to 8 stay on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Watch
- Planner cost: about 3.4 ms per choice on average, 10.4 ms worst (Misty close), 4 times a second.
- Reflex dodges spend the charges a planned dodge needs (#59).
- Mutation counts mean nothing while their harness is red (leader-stats-mutate until #30).
- A new module loaded by the Decider must join every harness FILES list (they stub missing G members with a no-op).
- Quick cannot run node. After ANY code edit, re-check mutate patterns against the edited files.
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- Python on Windows writes CRLF (use newline=''); Bash heredocs eat backslashes (use Edit, or a .py file written with Write).
- The leader-ai harness never steps the move sim: no leader hit resolves there (16e counts in-reach casts).
- Pre-existing: 42 STALE patterns in move-motion, move-emit, move-travel, debug-movechecker, move-persist (#56).
- http smokes fail ~1 run in 3 (ERR_NO_BUFFER_SPACE); repeat first.
- Rocky Helmet bugged, rejected on leaders. Bright Powder: recheck now the AI dodges.

## Open owner decisions
- Bench recharge (changes every Player entity). Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
