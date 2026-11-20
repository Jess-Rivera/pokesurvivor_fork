# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-19 late night, Claude Code (home). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. `git status`; tonight's commits should be pushed (`git push origin feature/128-acquisition`).
1. #155 board: Jess looks at run.hud.teamSlot and Primitives, Bars (nothing was seen rendered; no screenshots were
   possible). Then she rules the active portrait stroke for two types (first type, or split) and it shows on
   run.hud.playerActive.area with a Gyarados sample.
2. Then run.hud.playerActive.moveSlots detail (cursor, family badges), the tooltip primitive, Fonts feel test, Colours
   names, 155d, Pause composites. #156 likely moot.
3. Then #128: #138, then #146. #145 small and ready.

## Landed 2026-11-19 late night (Claude Code, board and docs only)
- run.hud.teamSlot (tools/library/hud-team-slot-draft.js, .css): two zoomed slots, the team of six, the berry pocket.
  Held item 10 px off the box (2 px from the cursor), name 2 px up, pocket = small panel.pixel in the berries ramp with a
  2x2 of dark circles, green stroke when a berry is held. Decision 2026-11-19-155-team-slot-hp-bar-cursor-gap-and-berry-pocket.
- Primitives, Bars: bar.life = the playerActive bar's HP part inside the original B2 background (14 rows). The team
  slot's HP bar is the same without the background. Decision 2026-11-19-155-bar-life-keeps-the-b2-background-with-the-new-hp-part.

## Watch
- The game is unchanged: nothing in js/ or css/ edited. check.js passes (243 files, 60 harnesses).
- Board checks: a stub-DOM harness drew the pages once (scratchpad only, not in the repo); no real render was seen.
- At #126: HELD.gap 8 to 10 (buffsLeft follows), the bar replaces the life meter and EXP ring, the portrait loses its
  ring, the chip bands start at the slots' left edge, the berry pocket becomes the circles panel.
- js/ui/lib/tokens/tokens.js line 139 still names smoke-ui-library in a comment (game code; fix at #126 or on OK).
- color.pocketBerries is a canon reference swatch, not a game token; the board reads it from POCKET_SWATCHES.
- Board drift: #29 in Blocked with no label; #155, #86, #110, #111, #120, #121 in Triage; #156 needs triage.

## Open owner decisions
- Active portrait stroke for two types. #126: reveal-first and fewer dialogs; cursor.bar with the mouse.
- Silver italic font (offered). #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
