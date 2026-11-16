# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-16, Claude Code (home). Branch: feature/128-acquisition (off main, not merged); rework/shop is to be
cut from it by Jess for #149. No branch rules file.

## START HERE (next session, either tool)
1. #149 Shop menu UI rework on rework/shop (off feature/128-acquisition). Waits on Jess's Shop mockup. Opening needs: the
   look, the Shop's tabs and where balls go, and whether rework/shop merges back before #137 (suggested: yes).
   Offered: a Mermaid map of today's js/ui/shop-ui.js layout for Jess to mark up.
2. Then #137 (Shop balls: restock, Great and Ultra, ends the belt refill; tiers and prices are Jess's call), #138, #146.
   Order: docs/ASCII Concept Maps/128 - Acquisition Slices Draft.md. #97 ships with the new save.
3. Small and ready: #145 (pause move tooltip lacks Physical/Special/Status). #147 UI Library waits on Jess's look.

## Landed on feature/128-acquisition (main has #124 and #125)
- Closed: #132 save v4, #133 gacha gone, #134 starter pick, #135 rescue event, #136 catch phase, #148 catch odds.
- 136b catch screen (Jess's mockup), text in Silver on its pixel grid, the first screen of #99; all 17 balls cut.
- #148 Jess's shake formula (capture rate, faster win = easier, critical from 31 species, wobble per shake), 148b flee ring
  and G.Debug.catchMath, 148c tuning: Steep curve, early bonus x2 fading to x1 at WL 13 (feel-tested, good).
  Decisions 2026-11-16-148-catch-odds-mainline-shake-formula and -148-catch-tuning-steep-curve-x2-fading-bonus.
- One universal tooltip layer (decision 2026-11-16-one-universal-tooltip-layer).
- check.js clean (60 harnesses); smoke-ui passes.

## Watch
- smoke-ui: back-to-back runs sometimes fail login/onboarding/region on local-server asset loads (ERR_NO_BUFFER_SPACE).
- Untracked, not ours: assets/excalidraw/PMD style Main Menu.png, docs/ASCII Concept Maps/tactics-conversion-uplift.md.
- #149 is on the board with no column yet; #102 may be done by the tooltip layer decision (check at triage).

## Open owner decisions
- #149 Shop look and tabs. #137 ball tiers (Timer Ball ruled: long fights, 4x cap) and prices. #97 purpose and shape.
  #131 bonus sizes. #49, #107, #86, #99 (rest), #93, #60. Exp Candy amounts (#139). R1 Shedinja, R4 Alcremie N.
  Flee 5/3/1 and the 30 s catch wait (playtest).

Rules: CLAUDE.md.
