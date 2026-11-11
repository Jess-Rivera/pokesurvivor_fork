# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Updated 2026-11-11, Claude Code (home): feature/leader-roster-ui finished (#35 closed) and is being fast-forwarded into
feature/gym-leader-ai. No branch rules file for leader-roster-ui; docs/branch-rules/feature-gym-leader-ai.md governs gym-leader-ai.

## START HERE (next session, either tool)
1. Jess fast-forwards feature/gym-leader-ai to feature/leader-roster-ui and pushes (commands in the last chat; TODO.md item 1).
2. Work on feature/gym-leader-ai from now on. Next session's job: decide the path forward (TODO.md).
3. Before gym-leader-ai merges to main: #30 (re-baseline the two red harnesses until check.js is all green).

## Where we are
- Run screen rework (#35) done: character panel, roster, run items, boss and elite name bar, map, DPS panel, arrows, chips.
  #61 (docs/HUD-STYLE.md) stays open as the style guide's standing tracker.
- Upgrade cards (#84): renamed with one-line hints; Attack, Stat Climb and Impact Speed are rate cards named as speeds;
  All Damage Up +5%. Reference: docs/UPGRADE-CARDS.md. DPS panel lists cards by pick count (#77).
- Species names are stored in English (#73); tools/species_names.js in check.js. Spawner messages are English in code.
- Shake Off prompt has a white draining bar (#87, G.Status.shakeTarget).
- Leader AI (carried): #59 closed; next #53, then #39. Bait parked on #60.
- check.js: red only on gym-harness and leader-stats-harness, by design until #30.

## Watch
- Headless frame-rate checks need the GPU flags (see tools/smoke-status-fx.js).
- Headless file:// blocks fonts: screenshot HUD text over http. Python on Windows writes CRLF (use newline='').
- Untracked art in assets/raw and assets/excalidraw (Jess's; never staged by the assistant).

## Open owner decisions
- #86 whole levels: gym leaders round to nearest, switch to round down too? Bait (#60).
- Team sheet Run Cards display (#83, pause menu branch #82); #82 scope.
- Bench recharge; boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out. #74 spare weather art.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first.
