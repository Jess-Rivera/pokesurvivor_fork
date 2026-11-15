# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-15 night, Claude Code (home). Branch: feature/128-acquisition (off main, not merged). No branch rules file.

## START HERE (next session, either tool)
1. Queue: #128 acquisition, children #132 to #143 in build order, with #97 (full upgrade redesign) shipping alongside the new
   save. Then #126 UI, #127 menu, #129 architecture, #130 regions. #131 (Silver bonuses) after a gym 1 trace. #111, #122 wait.
2. Your feel tests owed: #133 (Shop opens on Team Items, no ticket pills, a chest, a mission claim) and #135 (?dev, start a run,
   G.Debug.rescue(): green arrow, toast with the nature, UBER guard, the Stage 1 beside it).
3. Next build: #136 (S5 catch phase, belt, held catches), then #137 and #138. Order: docs/ASCII Concept Maps/128 - Acquisition Slices Draft.md.
4. #97 purpose is answered along the way (review: docs/ASCII Concept Maps/97 - Upgrade System Review.md).

## Landed on feature/128-acquisition (main has #124 and #125)
- #132 closed: save version 4; older saves back up to ps.backup.preacq.<key> and reset, notice once, settings kept.
- #134 closed: the starter pick was already built.
- #133 built: gacha, slot machine and tickets removed; ticket payouts are coins (40 per x1, 400 per x10, K in js/data/drops.js).
- #135 built: G.Rescue (js/systems/rescue.js), G.UberElite, js/data/stage-one.js (generated), harness rescue-harness.js.
  A win only pays the UberElite's drops until #136. Clocks: 60 s to reach, 60 s fight; HP sized for 40 s. All tuned in playtest.
- check.js clean (60 harnesses); smoke-ui, smoke-team, smoke-berry-slots, smoke-run-trace pass.

## Watch
- Rescue green (#3FAE5A) is a first pick by eye, [Proposed] in HUD-STYLE until your feel test.
- Untracked, not ours: assets/excalidraw/PMD style Main Menu.png, docs/ASCII Concept Maps/tactics-conversion-uplift.md.
- From before: trace lacks the leader's level; Misty "Kite" label; 16i parity; Brock/Misty card stacks (#122).

## Open owner decisions
- #97 purpose and shape. #131 bonus sizes. #49, #107, #86, #99, #93, #60. Exp Candy drop amounts (#139).
  Acquisition: R1 Shedinja, R4 Alcremie N, ball tiers, flee values, the UberElite time limit (60 s, playtest).

Rules: CLAUDE.md.
