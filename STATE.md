# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-19 night, Claude Code (home). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. `git status`; tonight's commit should be pushed (`git push origin feature/128-acquisition`).
1. #155 board: Jess rules the active portrait stroke for two types (first type, as the elite circle, or split, as the
   catch screen); then show it on run.hud.playerActive.area with a two-type sample (Gyarados).
2. Then run.hud.playerActive.moveSlots detail (cursor, family badges), the tooltip primitive, then Fonts feel test,
   Colours names, 155d, Pause composites. #156 likely moot.
3. Then #128: #138, then #146. #145 small and ready.

## Landed 2026-11-19 night (Claude Code, board and docs only)
- run.hud.playerActive.bar tuned: 3 x 5 HP and EXP letters on ink plates, a 5-row shaded HP track, an ink row under it,
  the EXP strip light over dark beside the P and shorter than the track, 426 px (the slots' width). Decision
  2026-11-19-155-hud-bar-one-bar-for-hp-and-exp (also records the evening ruling Quick never wrote).
- New composite run.hud.playerActive.area (tools/library/hud-area-draft.js, .css): slots and wells, portrait, Lv, bar,
  chip bands, held item, Silver, lined up on the slots with one 8 px stack gap and the item's 12 px gap on the left.
  Decision 2026-11-19-155-player-active-area-aligns-to-the-slots.
- The library board has no tests: tools/smoke-ui-library.js and the board's test hooks removed. Decision
  2026-11-19-155-no-tests-for-the-library-board.

## Watch
- The game is unchanged: nothing in js/ or css/ edited. check.js passes.
- js/ui/lib/tokens/tokens.js line 139 still names smoke-ui-library in a comment (game code; fix at #126 or on OK).
- At #126: the bar replaces the life meter and EXP ring (hpText held still), the portrait loses its ring, the chip bands
  start at the slots' left edge. Possible behavior change for #126: collapse a chip band's empty reserved line.
- Board drift: #29 in Blocked with no label; #155, #86, #110, #111, #120, #121 in Triage; #156 needs triage.

## Open owner decisions
- Active portrait stroke for two types (above). #126: reveal-first and fewer dialogs; cursor.bar with the mouse.
- Silver italic font (offered). #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
