# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-15 evening, Claude Code (home). Branch: balance/124-economy-xp (off main, not merged). No branch rules file.

## START HERE (next session, either tool)
1. #124 and #125 closed 2026-11-15 (Jess). Queue: #128 acquisition, built as children #132 (S1) to #143 (S12), with #97
   (full upgrade redesign) shipping alongside the new save. Then #126 UI, #127 menu, #129 architecture, #130 regions.
   #131 (Silver bonuses, needs a gym 1 trace) later. #111 and #122 wait behind it.
2. Next: merge balance/124-economy-xp into main, branch feature/128-acquisition, then the #132 (S1, new save) slice opening.
   #97 purpose (review: docs/ASCII Concept Maps/97 - Upgrade System Review.md) is answered along the way.
3. Rulings 2026-11-15: Exp Candy drops unparked (#139); #97 ships with the new save.

## Landed on feature/128-acquisition
- #133 (S2) built: gacha, slot machine and tickets removed; ticket payouts are coins (40 per x1, 400 per x10, K in js/data/drops.js);
  Shop opens on Team Items; rarity names live in G.Copies. Needs your feel test: Shop, a run, a chest, a mission claim. #134 closed (pick already built).
- #132 (S1, closed) built: save version 4; v3 and pre-Pokebox saves back up to ps.backup.preacq.<key> and reset, notice once, settings kept.
  Your dev.html save resets on first load (backup kept). Next after your feel test: #133 (S2) and #134 (S3).

## What just landed on balance/124-economy-xp
- Silver: 0 at the start, 1 per kill. Move price by slots filled: Trainer 60 / 120 / 240 / 300, TM Mart 150 / 300 / 400 / 450;
  a replacement pays the base; no run time or level in it. Decision 2026-11-15-124-move-price-by-slots-filled.
- Opening XP boost OFF by default; only ?dev G.Debug.xpBoost(true) turns it on (decision 2026-11-15-125-opening-xp-boost-off-by-default).
- Dev tools: G.Debug.runTrace (pace, shop pairs, visits), tools/run-pace-summary.js, G.Debug.xpBoost(on).
- check.js clean (60 harnesses); silver 17/17, shop-screens 35/35, shops 15/15 mutations; smoke-ui and smoke-run-trace 22/22 pass.

## Watch
- Boost finding: +2.1 levels over the world at 3:00 with it, +0.7 without (model fitted to 2 short traces, 4:15 max).
- Untracked, not ours: assets/excalidraw/PMD style Main Menu.png, docs/ASCII Concept Maps/tactics-conversion-uplift.md.
- From before: trace lacks the leader's level; Misty "Kite" label; 16i parity; Brock/Misty card stacks (#122).

## Open owner decisions
- #97 purpose and shape (see the review). #131 bonus sizes (after a gym 1 trace). #49, #107, #86, #99, #93, #97 (blocks #95), #60.
  Acquisition: Accelgor, Kingambit, Gholdengo, R1 Shedinja, R4 Alcremie N, ball tiers, UberElite time limit.

Rules: CLAUDE.md.
