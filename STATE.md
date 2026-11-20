# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-20 evening, Quick (work machine). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. `git status`; this session's commits should be pushed (`git push origin feature/128-acquisition`). check.js and
   `npm run format` were NOT run today (Quick): run both first.
1. #155: finish main.shop.tms (Able to Learn label: 12 px one line, 16 px two lines, or 18 px with a narrower
   search; then approve), approve run.hud.teamItems, then the shop menus Jess named (which screens: ask).
2. Then Fonts feel test, Colours names, the Pause composites (pause.runInfo is the pause menu's left panel; the HUD's
   top-left DPS panel is now run.hud.runInfo). #156 likely moot.
3. Then #128: #138, then #146. #145 small and ready.

## Landed 2026-11-20 evening (Quick, board and docs only)
- APPROVED on the board: main.shop.items (Pokeballs card carried over at 256 px, each item's own art, owned panel
  body grey.raised), run.hud.gymLeader (bar.life at 3 px per art pixel, circles under), run.hud.worldInfo (the map
  panel, today's look), run.hud.runInfo (the DPS-Upgrades panel, today's look), catch.window.
- Drafted, not approved: main.shop.tms (Items card, TM discs, real move lines, Pokemon panel grey.raised),
  run.hud.teamItems (both bags stacked lower right as pixel pockets).
- run.hud.portrait removed (part of run.hud.playerActive.area). field.dropdown's label no longer clips descenders.
- Seven decision files (2026-11-20-155-*): main-shop-items-look, tm-learned-and-known-are-disabled,
  team-items-and-berries-stacked-pixel-pockets-lower-right, run-hud-gym-leader-world-info-run-info-look,
  catch-let-it-go-ask-opens-on-keep-trying, catch-result-is-a-toast-and-the-window-is-shorter, catch-window-look.

## Game changes owed at #126 (ruled today)
- TM Learned and Known disabled, not refused. Team items: the HUD drops names and trackers; the pause tooltip must
  gain the live tracker. Berry pocket moves lower right. Catch: result is a toast, window 1020 x 424, Let It Go ask
  opens on Keep trying.

## Watch
- Nothing in js/ or css/ edited. Nothing seen rendered by the assistant except Jess's catch screenshots.
- No toast page on the board yet (catch-draft.js draws it first).
- Board drift: #29 in Blocked with no label; #155, #86, #110, #111, #120, #121 in Triage; #156 and #158 need triage;
  #137 #151 #152 #153 closed but still needs-playtest.

## Open owner decisions
- Tooltip pin and close icons (Jess drawing). Move Shop replace-a-move ask (the last dialog-rule case).
- #126: reveal-first and fewer dialogs; cursor.bar with the mouse. Silver italic font (offered).
- #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
