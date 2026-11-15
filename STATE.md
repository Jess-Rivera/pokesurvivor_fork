# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-15 night, Claude Code (home). Branch: feature/128-acquisition (off main, not merged). No branch rules file.

## START HERE (next session, either tool)
1. Queue: #128 acquisition, children #132 to #143 in build order, with #97 (full upgrade redesign) shipping alongside the new
   save. Then #126 UI, #127 menu, #129 architecture, #130 regions. #131 (Silver bonuses) after a gym 1 trace. #111, #122 wait.
2. Next build: #136 (S5 catch phase, belt, held catches), then #137 (Shop balls) and #138 (Lost Pokemon). Order and rules:
   docs/ASCII Concept Maps/128 - Acquisition Slices Draft.md. Each slice opens with goal, done, end-goal test agreed first.
3. #145 (small): the pause menu move tooltip lacks Physical/Special/Status. Could go first.
4. #97 purpose is answered along the way (review: docs/ASCII Concept Maps/97 - Upgrade System Review.md).

## Landed on feature/128-acquisition (main has #124 and #125)
- Closed and playtested: #132 new save v4, #133 gacha and tickets gone (ticket payouts are coins), #134 starter pick, #135 rescue event.
- Rescue: G.Rescue, G.UberElite, js/data/stage-one.js (generated), rescue-harness.js. A win pays only drops until #136.
  Clocks 60 s reach, 60 s fight, HP sized for 40 s; all tuned in playtest. G.Debug.rescue() starts one (?dev).
- check.js clean (60 harnesses); smoke-ui, smoke-team, smoke-berry-slots, smoke-run-trace pass.

## Watch
- Rescue green (#3FAE5A) is [Proposed] in HUD-STYLE (first pick by eye). All-regions runs pool every gen's Stage 1s.
- Untracked, not ours: assets/excalidraw/PMD style Main Menu.png, docs/ASCII Concept Maps/tactics-conversion-uplift.md.
- From before: trace lacks the leader's level; Misty "Kite" label; 16i parity; Brock/Misty card stacks (#122).

## Open owner decisions
- #97 purpose and shape. #131 bonus sizes. #49, #107, #86, #99, #93, #60. Exp Candy drop amounts (#139).
  Acquisition: R1 Shedinja, R4 Alcremie N, ball tiers, flee values, catch-odds ceiling, the UberElite time limit.

Rules: CLAUDE.md.
