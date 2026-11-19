# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-19 evening, Quick (work machine). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. `git status`; commit and push the evening commit (DEVLOG 2026-11-19 evening) if not done. #157 is closed.
1. #155 board, HUD sets: write the decision for run.hud.playerActive.bar first (not written yet). Then
   run.hud.playerActive (88 px ringless portrait, the bar, Lv; judges Portraits in place), then moveSlots.
   After that: Fonts feel test, Colours names, smoke-ui-library rewrite, 155d, Pause composites. #156 likely moot.
2. Then #128: #138, then #146. #145 small and ready.

## Landed 2026-11-19 (Quick, board and docs only)
- Morning and afternoon (pushed or in the morning commits): Unified tabs for Panels, Squares, Bars, Modal; the Cursor
  page; button.glitch.cancel; the dialog rule; four decision files.
- Portraits (pinned): portrait.round rest, active, selected (yellow plus the pause shimmer), fainted; ring is a prop.
- run.hud.playerActive.bar (tools/library/hud-exp-draft.js; hud-health-draft.js keeps only the HP numbers): one
  B2-style holder 462x36 for HP and EXP. HP tab and track, the EXP strip hanging under it, upright Silver labels.
  EXP leaves the portrait ring (116 to 88 px face). HP numbers stay outside, right of the bar, centred on its height
  (8 px up), current HP held still in a max-digits box. Tried and dropped: numbers inside the holder (needs 3 more
  art rows at 20 px; 10 px too small).

## Watch
- The game is unchanged: nothing in js/ or css/ edited today. check.js, lint, smokes not run (Quick).
- smoke-ui-library still failing on Colours; the board's page renames may add failures.
- At #126 the bar costs: hud-player-panel.js hpText (hold still), chips move up 12 px, portrait loses its ring on
  the run HUD and pause detail. Open: the empty band right of EXP, the level-up moment.
- Board drift: #29 in Blocked with no label; #155 card in Triage; #156 needs triage.

## Open owner decisions
- #126: reveal-first and fewer dialogs change menus and G.UI.ask (plan first); cursor.bar with the mouse.
- Silver italic font (offered, not decided). #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
