# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-19 night, Quick (work machine). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. `git status`; the chips commit (DEVLOG 2026-11-19 evening, "Later: Chips") should be pushed. #157 is closed.
1. #155 board, HUD sets: bar decision written (2026-11-19-155-hud-bar-one-bar-for-hp-and-exp). Next
   run.hud.playerActive: 88 px ringless portrait, the bar, Lv and the 1 px chip.status bands, in today's layout.
   It judges Portraits and the 1 px chips beside the HUD's 2 px art in place. Then moveSlots, then the tooltip.
2. After that: Fonts feel test, Colours names, smoke-ui-library rewrite, 155d, Pause composites. #156 likely moot.
3. Then #128: #138, then #146. #145 small and ready.

## Landed 2026-11-19 (Quick, board and docs only)
- Morning and afternoon: Unified tabs for Panels, Squares, Bars, Modal; the Cursor page; button.glitch.cancel; the
  dialog rule. Evening: Portraits (pinned); run.hud.playerActive.bar (HP and EXP in one B2 bar, numbers outside,
  centred, current HP held still).
- Chips page (tools/library/chips-draft.js, .css), decision 2026-11-19-155-chips-one-capsule-status-1px-type-two-scales:
  one B2 capsule for everything. chip.status (run screen) is Silver 10 at 1 px per art pixel, 40 x 17; chip.type is
  Silver 10 at 1 px (60 x 17) or Silver 20 at 2 px (116 x 32), names in capitals (reverses 2026-11-11's "Ghost").
  Colours from the Fold Map. Pokedex filter chips are toggles, not chips.
- The primitives cover most of the game. Still missing: tooltip, slider, text field, tabs (or a selected
  button.glitch), the see-through HUD panel. Composites only where layout is new: playerActive, moveSlots, the
  level-up card, pause.pokemonDetail.

## Watch
- The game is unchanged: nothing in js/ or css/ edited today. check.js, lint, smokes not run (Quick).
- smoke-ui-library still failing on Colours; the new Chips page and renames may add failures.
- At #126: hud-player-panel.js hpText (hold still), the portrait loses its ring, the chip area shrinks 114 to 86 px,
  HUD-STYLE "Type chips" casing line changes. Open: the empty band right of EXP, the level-up moment.
- Board drift: #29 in Blocked with no label; #155 card in Triage; #156 needs triage.

## Open owner decisions
- #126: reveal-first and fewer dialogs change menus and G.UI.ask (plan first); cursor.bar with the mouse.
- Silver italic font (offered, not decided). #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
