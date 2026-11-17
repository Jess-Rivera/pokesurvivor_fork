# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-17 (third session), Claude Code (home). Branch: rework/shop (off feature/128-acquisition, not merged).
No branch rules file.

## START HERE (next session, either tool)
1. #149 Main Menu Shop: 149a to 149e signed off. 149f (TMs tab) BUILT, needs Jess's feel test. Plan, rulings and
   build notes (B1 to B7): docs/ASCII Concept Maps/149 - Shop Rework Opening.md. After sign-off, #149 closes and
   rework/shop merges into feature/128-acquisition (R5), then #137.
2. #153 (menu keys) needs Jess's key set. #154 (split menu.js) ready.
3. Then #137, #138, #146. #150 blocked on #97. Small and ready: #145. #147 waits on Jess.

## Landed on rework/shop (2026-11-17)
- #151 #152 unaffordable buttons refuse with a toast; 149e Pokeballs tab (signed off).
- 149f TMs tab: G.TMs (js/systems/tms.js: price bands, teach), a copy's learned TMs (copies.js key j), the Move Trainer
  pool adds them (shops.js); js/ui/shop-tms.js pane; kit Dropdown (multi-select). In-run TM Mart renamed TR Shop.
- Decision 2026-11-17-tm-for-good-tr-for-one-run. check.js clean; smoke-ui all passed.

## Watch
- A menu window's key listener goes in its init (after menu.js's), and a key it handles goes no further.
- game.js handleKeys polls Esc for menu screens; a screen with its own Esc must be left off that list (Shop, Inventory).
- shop-screens-mutate: 2 STALE mutants on game.js predate 149f (the shop-over-another-screen and bond guards).
- smoke-ui: sometimes one run fails on a local-server asset load (ERR_FAILED); rerun.
- Layout screenshots: serve over http, file:// headless loses the Silver font.

## Open owner decisions
- #153 menu key set. #151: does a Full button take the cursor (default no). #137 ball tiers and prices. #97 purpose and
  shape. #131 bonus sizes. #49, #107, #86, #99 (rest), #93, #60. Exp Candy amounts (#139). R1 Shedinja, R4 Alcremie N.

Rules: CLAUDE.md.
