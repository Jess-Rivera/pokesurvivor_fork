# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-21 evening, Quick (work machine). Branch: feature/138-146-lost-and-full-box (covers #138 to
#146; cut from main after feature/128-acquisition merged). No branch rules file.

## START HERE (next session, either tool)
1. #139 S8 8a build plan: candy drops (gyms, UberElites, elites), the bag, giving candy, the OOR level and meter,
   G.Debug.candy. Size table goes to Jess as a decision. Rulings: decision
   2026-11-21-139-oor-level-candy-sources-friendship-model. Use the grilling skill for open design questions.
2. Then grill #97; the starting-move picker (#150 folded in) waits on it. Then 8b evolve, grill friendship, 8c.
3. #146, #145 when convenient. Owed: confirm lost-pokemon-mutate.js caught all 10 after the format pass.

## Landed 2026-11-21 (Quick)
- #138 S7 Lost Pokemon built, feel tested, committed (ce57625, 4cf32cb), pushed; closed on GitHub. Co-op hook
  filed (#159; #160 is a duplicate to close).
- #139 grilled: S8 split 8a / 8b / 8c; OOR level (1 to 100, stage and starting moves only, runs start at 1); candy a
  rarity drop from gyms, UberElites, elites, x loop; starting moves from level-up, earlier forms and egg moves
  (unlocked by owning a parent line); friendship the 0 to 255 field with mainline thresholds, fed by alive time,
  faints and fatigue ([Open] calc). #161 fatigue stub, #162 stones as gym drops filed.
- Also: gyms-only harness reads the Lost pool's new pool(); doc-colours regenerated; S6 files formatted.

## Watch
- Board fixes are listed in TODO.md item 6.
- Canvas HUD holdouts in js/ui/hud.js stay on the canvas for now (Jess), no issue.
- Research (meta or narrative progression) is still forming; not part of #139.

## Open owner decisions
- #139: the 8a candy size table; the friendship calculation; fatigue numbers.
- #97 (blocks #95, #150), #131, #49, #107, #86, #99, #93, #60. Tooltip pin and close icons; #156 close or keep.

Rules: CLAUDE.md.
