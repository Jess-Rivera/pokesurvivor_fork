# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-19 morning, Quick (work machine). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. Commit and push if not yet done (two commits drafted 2026-11-19, see DEVLOG).
1. #157: Jess closes it with the drafted comment; the places not drawn yet go in one follow-up issue (TODO item 0).
2. Then the rest of #155 (TODO item 0): Fonts feel test, Colours names, smoke-ui-library rewrite, 155d, Pause
   composites. #156 is likely moot (it renames the retiring buttons' classes): close or keep, Jess.
3. Then #128: #138, then #146. #145 small and ready.

## Landed this session (2026-11-19, Quick, board and docs only)
- Panels page is one Unified tab (Clean Draft and Current removed): panel.clean (grey.panel body, 1 px grey.slate
  edge, square corners, any edge colour passed in, teal.base shown), pause.pokemonDetail.background (type bars with a
  4 px type-dark border on the body side), panel.pixel and panel.slanted (four rims and the 8 x 8 px slot grid), all
  board copies folded to Unified greys.
- Squares page: Unified tab (square.item in Unified with the slot grid body; square.clean filled, empty, locked;
  a filled edge takes its pocket's colour) and Current.
- New Cursor page: cursor.bar, button.glitch's 6 px yellow.base bar right of the item; blink in menus, solid in a
  run; CRT off, move, CRT on; an arrow-key demo. Mouse behaviour left for #126.
- Buttons, Current (retiring) tab removed. Story files moved to tools/library/stories/ (js/ui/lib is game code only).
- Decisions: panel.slanted stays, move slot only; the held item keeps square.item.

## Watch
- The game is unchanged: nothing in js/ or css/ edited (only the six story files moved out of js/ui/lib).
- check.js and lint not run (Quick); eslint.config.js's board block now covers tools/library/**. Run both.
- smoke-ui-library: still failing on Colours; the tab changes and the story move may add failures.
- tools/library/stories/button.story.js and panel.story.js still load but no tab shows them (delete later).
- Board drift: #29 in Blocked with no label; #155 card sits in Triage; #156 needs triage.

## Open owner decisions
- Jess: the poor UX calls in the ask dialog. #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.
- At #126: cursor.bar with the mouse; the empty move slot (rim base now equals the body, reads faint).

Rules: CLAUDE.md.
