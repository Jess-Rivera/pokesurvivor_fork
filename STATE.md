# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-22, home (Claude Code). Branch: feature/138-146-lost-and-full-box (covers #138 to #146).
No branch rules file.

## START HERE (next session, either tool)
1. #139 8a: read docs/AI Outputs/Issue-139/139a - Candy Build Plan.md (Proposed). Jess confirms the fixed
   tier-to-size rule (Uncommon S, Rare M, Epic L, Jackpot XL) and two opens: does the elite berry and ground item
   stay beside the ladder, and how many UberElites and elites a run holds. Then build Part A (the ladder in
   js/data/drops.js), tests first.
2. Then Parts B to G of the plan; the "Give until" input is decided at Part F.
3. Then grill #97; the starting-move picker (#150) waits on it. Then 8b evolve, friendship grilling, 8c.
4. #146, #145 when convenient. #163 (materials shop tab) and #162 (stones) wait on the type-to-material map.

## Landed 2026-11-22 (home)
- Branch recovered (was on the merged feature/128-acquisition); dashboard commits moved; check.js passes.
- Lost-pokemon mutate 10/10 caught (owed item cleared).
- Decision 2026-11-22-139-candy-target-and-drop-model: target 40,007 XP, canon sizes, base 44,100, drop ladder,
  elite floor, materials as separate ladders. #163 filed. Plan and opening doc updated. No game code changed.

## Watch
- The loop counter is dev-set in gym.js and the Elite Four is not built: "N rolls on loop N" is harness-proven only.
- Board fixes are in TODO.md item 6. Canvas HUD holdouts in js/ui/hud.js stay (Jess).
- Research (meta or narrative progression) is still forming; not part of #139.

## Open owner decisions
- #139: tier-to-size rule, elite berry and ground item, type-to-material map and shop price (#163), friendship
  calculation, fatigue numbers. "Last Elite Four beaten" wording.
- #97 (blocks #95, #150), #131, #49, #107, #86, #99, #93, #60. Tooltip pin and close icons; #156 close or keep.

Rules: CLAUDE.md.
