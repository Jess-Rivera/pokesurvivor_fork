# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-22, home (Claude Code). Branch: feature/138-146-lost-and-full-box (covers #138 to #146).
No branch rules file.

## START HERE
The ordered next-work list is TODO.md "Next" (first item: #139 8a, Jess OKs the candy build plan in
docs/AI Outputs/Issue-139/). Run `node tools/catchup.js` for the live briefing.

## Landed 2026-11-22 (home)
- tools/catchup.js (the catch-me-up briefing as one command, harness docs/proposals/catchup-harness.js). docs/ASCII Concept
  Maps renamed docs/AI Outputs and sorted into Issue-N and topic folders; every path reference rewritten.
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
