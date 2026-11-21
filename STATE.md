# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-21 morning, Quick (work machine). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. `git status`; push this session's commits (`git push origin feature/128-acquisition`). Confirm check.js, the
   ui-readers harness and its mutate runner passed (the assistant could not run them from Quick).
1. Feel test the Ancient Power line ("10% team all stats +1") on its card and in the pause sheet; then a needs-playtest
   look at the three run-shop pages on the board.
2. #155: main.shop.tms (pick the Able to Learn label: 12, 16 or 18 px, then approve), then run.hud.teamItems.
3. Then the rest of #155 (TODO.md item 0), then #128: #138, then #146. #145 small and ready.

## Landed 2026-11-21 morning (Quick)
- Run shops, all three APPROVED on the board (decisions 2026-11-21-155-run-hud-move-mart-look, -tr-mart-look,
  -forget-move-look). moveMart: team rows on top (teamSlot's pixel box 6 art rows taller, type chips where the HP bar
  was, cursor.ring), four offer cards below with a Silver price line and no Buy button. trMart: the same, mirrored top to
  bottom (TR cards on top with TM discs, cursor.ring on the picked disc; team rows with a status symbol). forgetMove: the
  four move slots (28 art rows, no keys), ring on the move to replace, others dimmed, bonds darker and skipped, a wide
  card on the ringed move, Cancel at the shops' size. Reroll is Positive.
- Game code (approved): js/ui/move-info.js folds five matching stat raises into "all stats" in the description and the
  sheet (Ancient Power, 126 to 47 characters). Harness checks plus a 100-character fit check; two mutants; changelog.
- New dev tool tools/move_desc_lengths.js (the longest descriptions).
- Board helper: panel.slanted (clean-draft.js) takes an optional height.
- run.hud.bondSelection APPROVED (decision 2026-11-21-155-run-hud-bond-selection-look): team rows, then the four slots
  in one row with a wide card, pink first-pick ring, Bond (Positive) or Cancel ask. Board: tools/library/bond-draft.js.

## Game changes owed at #126 (ruled)
- The three run shops and the bond popup as approved. TM Learned and Known disabled. Team items HUD drops names and
  trackers. Catch result a toast, window 980 x 424, Let It Go ask. Cursor ring and no blink. G.UI.ask takes the confirm's intent only.

## Watch
- Board drift: #29 in Blocked with no label; #155, #86, #110, #111, #120, #121 in Triage; #156 and #158 need triage;
  #137 #151 #152 #153 closed but still needs-playtest.

## Open owner decisions
- Tooltip pin and close icons (Jess drawing). #156 close or keep.
- #126: reveal-first and fewer dialogs; cursor.bar with the mouse. Silver italic font (offered).
- #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
