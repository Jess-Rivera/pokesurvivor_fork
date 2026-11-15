# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-15 evening, Claude Code (home). Branch: balance/124-economy-xp (off main, not merged). No branch rules file.

## START HERE (next session, either tool)
1. #124 and #125 closed 2026-11-15 (Jess). Queue: #97 upgrades (full redesign pass; review in docs/ASCII Concept Maps/
   97 - Upgrade System Review.md), #128 acquisition, #126 UI, #127 menu, #129 architecture, #130 regions. #131 (Silver
   bonuses and the shops 2 to 4 check, needs a gym 1 trace) later. #111 and #122 wait behind it.
2. #97 next: Jess sets its purpose (catch-up power, sidegrades or unlocks; per species or account-wide), then the slice
   opening (goal, done, end-goal test). Question 2 leans on #128.
3. Branch balance/124-economy-xp is done: Jess merges it into main and pushes.

## What just landed on balance/124-economy-xp
- Silver: 0 at the start, 1 per kill. Move price by slots filled: Trainer 60 / 120 / 240 / 300, TM Mart 150 / 300 / 400 / 450;
  a replacement pays the base; no run time or level in it. Decision 2026-11-15-124-move-price-by-slots-filled.
- Opening XP boost OFF by default; only ?dev G.Debug.xpBoost(true) turns it on (decision 2026-11-15-125-opening-xp-boost-off-by-default).
- Dev tools: G.Debug.runTrace (pace, shop pairs, visits), tools/run-pace-summary.js, G.Debug.xpBoost(on).
- Docs: 124 - Economy Slice Opening, 124 - Run Pace Trace Plan, 124 - Economy Rule Built, 125 - XP Boost Comparison.
- check.js clean (60 harnesses); silver 17/17, shop-screens 35/35, shops 15/15 mutations; smoke-ui and smoke-run-trace 22/22 pass.

## Watch
- Boost finding: +2.1 levels over the world at 3:00 with it, +0.7 without (model fitted to 2 short traces, 4:15 max).
- smoke-ui timed out once mid-run, then passed in full (flaky, not price related).
- Untracked, not ours: assets/excalidraw/PMD style Main Menu.png, docs/ASCII Concept Maps/tactics-conversion-uplift.md.
- From before: trace lacks the leader's level; Misty "Kite" label; 16i parity; Brock/Misty card stacks (#122).

## Open owner decisions
- #97 purpose and shape (see the review). #131 bonus sizes (after a gym 1 trace). #49, #107, #86, #99, #93, #97 (blocks #95), #60.
  Acquisition: Accelgor, Kingambit, Gholdengo, R1 Shedinja, R4 Alcremie N, ball tiers, UberElite time limit.

Rules: CLAUDE.md.
