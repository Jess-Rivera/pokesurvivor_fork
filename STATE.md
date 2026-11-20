# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-20 afternoon, Quick (work machine). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. `git status`; this session's commits should be pushed (`git push origin feature/128-acquisition`).
1. #155 main.shop.items next, then main.shop.tms, one piece at a time on the board. main.shop.pokeball and
   main.shop.character are approved; the Items and TMs drafts (tools/library/shop-draft.js) are a starting point only.
2. Then Fonts feel test, Colours names, the Pause composites. #156 likely moot.
3. Then #128: #138, then #146. #145 small and ready.

## Landed 2026-11-20 afternoon (Quick, board and docs only)
- main.shop.pokeball APPROVED: rail icons 1 px in; cards 224 px with 140 x 36 buttons (label 14); today's ball art,
  centred on its filled pixels; belts panel.pixel in color.pocketPokeBalls with six 52 px wells; belt number Michroma
  16 with an ink stroke; Sell 204 px; a dimmed card never dims its button; refused and disabled state classes on.
- panel.shopCard (new): panel.clean with a grey.raised body and a teal.base edge, every main.shop.* card.
- main.shop.character APPROVED: pockets panel.pixel in their pocket ramps, plain grey.raised body, no grid.
- button.glitch: rest body transparent (the swipe draws the button); disabled text grey.slate; no white sliver of
  the rest bar under focus.
- Decisions: 2026-11-20-155-main-shop-pokeball-look, -panel-shopcard-raised-body-teal-edge,
  -button-glitch-rest-body-is-transparent, -main-shop-character-look.

## Watch
- The game is unchanged: nothing in js/ or css/ edited. check.js was NOT run (Quick cannot run node); run it and
  `npm run format` before committing (shop-draft.js and hud-team-slot-draft.js have lines over 120 columns).
- Nothing was seen rendered by the assistant; the pages were only checked to build in a stub page.
- For #126: draw clean panels' 1 px edge as a real border (the board's inset edge drops a side under display
  scaling); the game's button.glitch needs the transparent rest body and the focus-bar fix.
- Board drift: #29 in Blocked with no label; #155, #86, #110, #111, #120, #121 in Triage; #156 and #158 need triage.

## Open owner decisions
- Tooltip pin and close icons (Jess drawing). Ball centring in the game (generator plus BallSprite) or wait for #126.
- #126: reveal-first and fewer dialogs; cursor.bar with the mouse. Silver italic font (offered).
- #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
