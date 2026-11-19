# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-19 afternoon, Quick (work machine). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. Commit and push if not yet done (two commits drafted 2026-11-19, see DEVLOG). Close #157 if not yet done.
1. #155 board, Unified passes: Portraits next (the last primitive page). Then Fonts feel test, Colours names,
   smoke-ui-library rewrite, 155d, Pause composites. #156 is likely moot: close or keep, Jess.
2. Then #128: #138, then #146. #145 small and ready.

## Landed this session (2026-11-19, Quick, board and docs only)
- Panels: one Unified tab (panel.clean, the detail background, panel.pixel, panel.slanted in Unified greys).
- Squares: Unified tab (square.item with the slot grid body; square.clean filled, empty, locked) and Current.
- Cursor page: cursor.bar (blink in menus, solid in a run, CRT move). Mouse behaviour left for #126.
- Bars: Unified tab. The hit's cut piece flashes white 80 ms with a 4 px hop, goes grey (paper, mid rows) and falls
  at once with an 8 px rightward drift; no 1 s hold.
- Modal: Unified tab (panel.clean, Michroma, button.glitch, all three intents) and the new button.glitch.cancel state
  (also on Buttons). Focus shows only with the keys; from the mouse the first key only reveals it.
- Dialog rule (researched): only a loss you cannot earn back or redo gets a dialog (Sell, Delete account, Sign out as
  guest, leftover EVs), opening on Cancel. Purchases and team edits do not ask. Pending: Let it go, Move Shop replace.
- Decisions: panel.slanted move slot only; held item keeps square.item; bars and the hit flash; the dialog file.

## Watch
- The game is unchanged: nothing in js/ or css/ edited (only the six story files moved out of js/ui/lib).
- check.js and lint not run (Quick); eslint's board block covers tools/library/**. Run both before pushing.
- smoke-ui-library: still failing on Colours; the tab changes and the story move may add failures.
- The research report lives only in the Quick session workspace, not the repo.
- Board drift: #29 in Blocked with no label; #155 card sits in Triage; #156 needs triage.

## Open owner decisions
- #126: reveal-first and fewer dialogs change the menus and G.UI.ask (a game change, plan first); cursor.bar with
  the mouse; the empty move slot reads faint. #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
