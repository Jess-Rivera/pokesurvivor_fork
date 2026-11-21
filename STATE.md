# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-20 night, Claude Code (home). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. `git status`; push this session's commit (`git push origin feature/128-acquisition`). check.js and format passed.
1. Redraw run.hud.moveMart, run.hud.trMart and run.hud.forgetMove to Jess's mockups: assets/excalidraw/move-trainer.excalidraw
   and tr-mart.excalidraw (found at wrap-up, not read while drafting). They show a small window (about 635 px wide), the
   team as six panel.pixel rows (193 x 57), 2 x 2 cards (177 x 154) with a type or TR icon, and two buttons below. The
   current rough drafts (run-shops-draft.js) use a 1145 px window and a portrait grid: wrong shape.
2. Then #155: main.shop.tms (Able to Learn label, then approve), run.hud.teamItems, the shop menus Jess named (ask
   which), Fonts feel test, Colours names, the Pause composites. #156 likely moot.
3. Then #128: #138, then #146. #145 small and ready.

## Landed 2026-11-20 night (board, docs and tools only)
- cursor.ring (cursor-draft.js): 3 px, 2 px off the rim, for round pieces; neither cursor blinks; the ring plays the CRT.
  On main.shop.pokeball (belt ball), main.shop.tms (Pokebox face), catch.window (belts and owned). Catch belts back to
  84 px, window 980 px wide.
- Dialog rule: a binary ask's answers never share an intent; the confirm takes the action's intent, the back-out is
  always Neutral; button.glitch.cancel retired. Let It Go: red Let it go, teal Keep trying, opens on Keep trying.
- Run shops ruled (docs/ASCII Concept Maps/155 - Run Shops Layout.md): mirrored (choose left, answer right); TR Mart
  statuses use game Silver's root, multiplication sign and equals; refusals toast on Enter or click, not on cursor
  move; no purchase ask; replace-a-move is pick, popup, then a Replace or Go Back ask.
- Decision files: 2026-11-20-155-dialog-answers-never-share-an-intent, -cursor-ring-for-round-pieces-and-no-blink,
  -move-shop-replace-a-move-asks-replace-or-go-back.

## Game changes owed at #126 (ruled)
- TM Learned and Known disabled, not refused. Team items: HUD drops names and trackers; berry pocket lower right.
  Catch: result is a toast, window 980 x 424, Let It Go ask as above. Cursor ring and no blink everywhere. G.UI.ask
  takes the confirm's intent only. Run shops redrawn mirrored.

## Watch
- Nothing in js/ or css/ edited. The run-shop pages were never rendered by the assistant.
- Board drift: #29 in Blocked with no label; #155, #86, #110, #111, #120, #121 in Triage; #156 and #158 need triage;
  #137 #151 #152 #153 closed but still needs-playtest.

## Open owner decisions
- Tooltip pin and close icons (Jess drawing). Run shops: TR price placement; forgetMove's name.
- #126: reveal-first and fewer dialogs; cursor.bar with the mouse. Silver italic font (offered).
- #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
