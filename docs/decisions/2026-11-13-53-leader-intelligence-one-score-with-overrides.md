## 2026-11-13, #53: one intelligence score per leader drives its sharpness, with overrides; misjudge on by default (Jess)
Replaces the per-setting shape of decision 2026-11-09-49-leader-sharpness-base-plus-loop-growth (that file stays as history).
- Score: each leader has one `intelligence`, 0 to 1 (default 0.5) = a base plus a fixed per-loop growth, held inside 0 to 1. Growth is
  0 to 0.2 per loop, never negative (D2). 12 leaders need 24 numbers, not 120; leaders compare on one number (loop 6 Brock can still
  out-think loop 1 Lance).
- It drives five settings: `misjudge`, `reflex`, `dodgeRead`, `memoryUse`, `aimError` (aimError added same day). Not driven: the
  fairness ceilings (`predictCap`, the cooldown window's minimum width, tells, stall guards) and every style setting (goal weights, tag
  multipliers, signature actions, `range`, `swapWill`, `risk`, `aggression`).
- Curves: each is two straight lines meeting at the default (0.5): the default keeps today's reflex, dodgeRead and memoryUse, the dull
  end is wide, and the top stops short of perfect (no perfect thinking at loop 6: every setting keeps some error at 1). `reflex` never
  goes below 0.1 s. Values are TUNE, [Proposed] in the #53 build plan.
- `dodgeRead` may be fractional (6.4 reads per 10), met exactly by a counter across bags, so every loop's growth counts.
- `aimError` stays planning-only (the planner's read of its own hit chance), never a scatter on its casts.
- `misjudge` (D1): one seeded draw per plan per think tick from its own source; the plan's cost is read as cost x (1 + misjudge x a
  draw in -1 to 1) before the ranking, so a leader can pick a worse plan and a worse goal.
- Overrides: a leader may author any of the five directly (a number, or keyed by loop); that setting leaves the curve and its growth.
  3 or more overrides on one leader give a dev warning.
- Rule changes at the default: misjudge 0 -> about 0.1 (approved, so Misty and Brock misjudge a little before #39); aimError 0 -> 10 px
  [Proposed], to confirm with the #53 plan.
- Sharpness duel (D3): the harness gives Brock a test growth on his loop 1 team, so it measures intelligence alone.
Chosen over intelligence with no overrides (cannot say "Misty reads you fast but plans no better", which #39 asks for) and over the
per-setting shape (too many numbers to tune by feel, no single difficulty number). Maps: docs/ASCII Concept Maps/53 - Intelligence vs
Per-Setting Sharpness.txt (the comparison), 53 - How Intelligence Drives the Four Settings.txt (the curves; it covers all five),
53 - Intelligence and Misjudge Build Plan.txt (the plan).
Canonical: docs/LEADER-AI.md "The Decider (#49)" (MISJUDGMENT, INTELLIGENCE AND STYLE, TESTS) and "Authoring a leader".
