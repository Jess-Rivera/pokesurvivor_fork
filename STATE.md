# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-15 late, Claude Code (home). Branch: feature/128-acquisition (off main, not merged). No branch rules file.

## START HERE (next session, either tool)
1. Queue: #128 acquisition, children #132 to #143 in build order, with #97 (full upgrade redesign) shipping alongside the new
   save. Then #126 UI, #127 menu, #129 architecture, #130 regions. #131 (Silver bonuses) after a gym 1 trace. #111, #122 wait.
2. #136 (catch phase) is built and in Needs Playtest: Jess feel-tests it (G.Debug.rescue(), or G.Debug.catch() to skip
   the fight). Next build: #137 (Shop balls, ends the belt refill) and #138 (Lost Pokemon); #146 keep-or-sell list. Order and rules:
   docs/ASCII Concept Maps/128 - Acquisition Slices Draft.md. Each slice opens with goal, done, end-goal test agreed first.
3. #145 (small): the pause menu move tooltip lacks Physical/Special/Status. Could go first.
4. #97 purpose is answered along the way (review: docs/ASCII Concept Maps/97 - Upgrade System Review.md).

## Landed on feature/128-acquisition (main has #124 and #125)
- Closed and playtested: #132 new save v4, #133 gacha and tickets gone (ticket payouts are coins), #134 starter pick, #135 rescue event.
- Rescue: G.Rescue, G.UberElite, js/data/stage-one.js (generated), rescue-harness.js. Clocks 60 s reach, 60 s fight, HP for 40 s.
- #136 (unplaytested): G.Catch (odds, flee, belt save.belt, held catches), G.CatchUI (BW popup, css/bw-catch.css). A win leaves
  the Stage 1 30 s; touch opens the catch. Catches reach the box at the run end only when it keeps EVs (fall, crash).
  Belt refills to 6 each run until #137 ([Legacy behavior]). Run Info "Caught this run". Catch screen look: Jess, later (#126).
- check.js clean (60 harnesses); smoke-ui (with a catch flow) passes.

## Watch
- Rescue green (#3FAE5A) is [Proposed] in HUD-STYLE (first pick by eye). All-regions runs pool every gen's Stage 1s.
- Untracked, not ours: assets/excalidraw/PMD style Main Menu.png, docs/ASCII Concept Maps/tactics-conversion-uplift.md.
- From before: trace lacks the leader's level; Misty "Kite" label; 16i parity; Brock/Misty card stacks (#122).

## Open owner decisions
- #97 purpose and shape. #131 bonus sizes. #49, #107, #86, #99, #93, #60. Exp Candy drop amounts (#139).
  Acquisition: R1 Shedinja, R4 Alcremie N, ball tiers and prices (#137); flee 5/3/1, 90% ceiling, 30 s catch wait,
  the UberElite time limit (all playtest).

Rules: CLAUDE.md.
