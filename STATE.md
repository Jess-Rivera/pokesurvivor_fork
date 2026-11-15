# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-15 afternoon, Claude Code (home). Branch: balance/124-economy-xp (off main, not merged). No branch rules file.

## START HERE (next session, either tool)
1. Queue set by Jess 2026-11-15 (leader AI parked): #124 economy, #125 XP, #128 acquisition, #97 upgrades, #126 UI, #127 menu,
   #129 architecture, #130 regions. #111 and #122 wait behind it.
2. #124 Needs Playtest: feel test the new prices. Its elite/boss bonuses and the shops 2 to 4 check wait for a traced run
   that reaches gym 1.
3. #125 next: Jess plays 1 or 2 runs with G.Debug.xpBoost(false), saves each with G.Debug.runTrace('save') into tools/cache/,
   then node tools/run-pace-summary.js. Then the #125 slice opening (goal, done, end-goal test).

## What just landed on balance/124-economy-xp
- Silver: 0 at the start, 1 per kill. Move price by slots filled: Trainer 60 / 120 / 240 / 300, TM Mart 150 / 300 / 400 / 450;
  a replacement pays the base; no run time or level in it. Decision 2026-11-15-124-move-price-by-slots-filled.
- Dev tools: G.Debug.runTrace (pace, shop pairs, visits), tools/run-pace-summary.js, G.Debug.xpBoost(on).
- Docs: 124 - Economy Slice Opening, 124 - Run Pace Trace Plan, 124 - Economy Rule Built, 125 - XP Boost Comparison.
- check.js clean (60 harnesses); silver 17/17, shop-screens 35/35, shops 15/15 mutations; smoke-ui and smoke-run-trace pass.

## Watch
- Boost finding: +2.1 levels over the world at 3:00 with it, +0.7 without (model fitted to 2 short traces, 4:15 max).
- smoke-ui timed out once mid-run, then passed in full (flaky, not price related).
- Untracked, not ours: assets/excalidraw/PMD style Main Menu.png, docs/ASCII Concept Maps/tactics-conversion-uplift.md.
- From before: trace lacks the leader's level; Misty "Kite" label; 16i parity; Brock/Misty card stacks (#122).

## Open owner decisions
- #124 bonus sizes (after a gym 1 trace). #125 targets in numbers. #49, #107, #86, #99, #93, #97 (blocks #95), #60.
  Acquisition: Accelgor, Kingambit, Gholdengo, R1 Shedinja, R4 Alcremie N, ball tiers, UberElite time limit.

Rules: CLAUDE.md.
