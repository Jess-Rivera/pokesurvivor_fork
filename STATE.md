# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-09, Claude Code (home): #51 built, needs Jess's feel test. #55 (parallel mutation runner) built, needs Jess's try.
Branch: feature/gym-leader-ai. Branch rules: docs/branch-rules/feature-gym-leader-ai.md (read it now).

## START HERE (next session, either tool)
1. Jess pulls this branch on the other machine.
2. #51 feel test (Needs Playtest): Misty and Brock with ?dev, G.Debug.hitbox() for the plan overlay, G.Debug.quietPause()
   to read it frozen. Then rule the four [Proposed] #51 build calls (LEADER-AI "The Decider (#49)").
3. Then #52 (swap, dash, draw, dodge), #53, then #39. #44, #46, #56 any time. #48 research.

## Where we are
- Terms: every Player entity runs Decider, Controller, Body, SimPass (LEADER-AI "FRAME", GLOSSARY).
- #51: G.LeaderPlanner (js/systems/leader-planner.js) picks one of nine goals and a plan of up to 4 actions each think
  tick from Belief's snapshot; the executor in G.LeaderAI steers it. Old slot choice, pacing and forced trigger actions
  gone; slot stance not read (range 220). Decision 2026-11-09-51-opening-stance-traces-and-set-trigger.
- Swap choice, lead exploit, reflex dodges, gap-closing dodge unchanged until #52.
- Gyms 3 to 8 stay on the old brain until slice 12.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Watch
- Planner cost: about 4.4 ms per choice for a 4-slot mon, 4 times a second. Watch for hitches at high density.
- Mutation counts mean nothing while their harness is red (leader-stats-mutate until #30).
- A new module loaded by the Decider must join every harness FILES list (they stub missing G members with a no-op).
- Quick cannot run node. After ANY code edit, re-check mutate patterns against the edited files.
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- Python on Windows writes CRLF (use newline=''); Bash heredocs eat backslashes (use Edit, or a .py file written with Write).
- Mutate scripts run through tools/mutate-runner.js (#55): parallel, low priority, full results; leader-ai-mutate ~6 min.
- Pre-existing: 42 STALE patterns in move-motion, move-emit, move-travel, debug-movechecker, move-persist (#56);
  move-sim "routing filter ignored" MISS; move-persist 2 MISS; stat-stage 2 STALE; boss-split STALE.
- http smokes fail ~1 run in 3 (ERR_NO_BUFFER_SPACE); repeat first.
- Rocky Helmet bugged, rejected on leaders. Bright Powder: recheck now the AI dodges.

## Open owner decisions
- #51 build calls (a) to (d), [Proposed] in LEADER-AI. Bench recharge (changes every Player entity). Boss pool size;
  sprite scale; region unlock rule; Friends and Leaderboard grey-out.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
