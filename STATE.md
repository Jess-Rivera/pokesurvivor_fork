# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-22 night, home (Claude Code). Branch: feature/138-146-lost-and-full-box (covers #138 to #146).
No branch rules file.

## START HERE
The ordered next-work list is TODO.md "Next" (first item: #97, grilled 2026-11-23; its numbers in #131, then the
slice opening). #139 Part F is held for later. Run `node tools/catchup.js` for the live briefing.

## Landed 2026-11-22 (home)
- tools/catchup.js; docs/AI Outputs sorted into Issue-N and topic folders.
- #139 8a Parts A to E and G (commit 8ec7798b): the drop function in G.Drops (tiered entries), gym candy tables
  (gym 8 Common S), the elite and UberElite mixed table (replaced berry, ground item, 50% item), G.Candy (bag, levels,
  give, give until), js/data/growth-curves.js (tools/growth_data.js), copy key c, G.Debug.candy. Harnesses:
  candy-harness, drops-harness, candy-mutate 13/13; smoke-gym checks a win banks one candy.
- DEVLOG rotated (older half to docs/DEVLOG-archive.md).

## Watch
- Candy drops and is saved, but cannot be given yet (no Team menu UI). Changelog says "comes in a later update".
- The loop counter is dev-set in gym.js and the Elite Four is not built: "N rolls on loop N" is harness-proven only.
- Board fixes are in TODO.md item 6. Canvas HUD holdouts in js/ui/hud.js stay (Jess).

## Open owner decisions
- #139 Part F: the Give until input; today's Team screen or wait for #126; the XP bar as a new library piece and its
  board look. Also: type-to-material map and shop price (#163), friendship calculation, fatigue numbers, "last Elite
  Four beaten" wording.
- #97 numbers (in #131); #164 sidegrades (own grilling); #165 open items. #131, #49, #107, #86, #99, #93, #60. Tooltip pin and close icons; #156 close or keep.

Rules: CLAUDE.md.
