# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-17 (third session), Claude Code (home). Branch: rework/shop (off feature/128-acquisition, not merged).
No branch rules file.

## START HERE (next session, either tool)
1. #149 Main Menu Shop is DONE and closed (149a to 149f signed off). Jess merges rework/shop into feature/128-acquisition
   (R5; commands in TODO.md), then work moves to feature/128-acquisition.
2. #137 (Shop balls: restock, Great and Ultra unlocks, belt size; wires the Pokeballs tab's buys) opens next; it needs
   Jess's ball tiers and prices. Then #138, #146.
3. #153 (menu keys) needs Jess's key set. #154 (split menu.js) ready. #150 blocked on #97. Small: #145. #147 waits on Jess.

## Landed on rework/shop (2026-11-17)
- #151 #152 unaffordable buttons refuse with a toast. 149e Pokeballs tab. 149f TMs tab: G.TMs (js/systems/tms.js), a
  copy's learned TMs (copies.js key j), the Move Trainer pool adds them (shops.js), js/ui/shop-tms.js, kit Dropdown.
- Decision 2026-11-17-tm-for-good-tr-for-one-run (in-run TM Mart is the TR Shop). check.js clean; smoke-ui all passed.

## Watch
- A menu window's key listener goes in its init (after menu.js's), and a key it handles goes no further.
- game.js handleKeys polls Esc for menu screens; a screen with its own Esc must be left off that list (Shop, Inventory).
- A list the cursor's eligibleItems reads is computed per drawn button: remember it (shop-tms.js remembered).
- shop-screens-mutate: 2 STALE mutants on game.js predate 149f (the shop-over-another-screen and bond guards).
- smoke-ui: sometimes one run fails on a local-server asset load (ERR_FAILED); rerun.
- Layout screenshots: serve over http, file:// headless loses the Silver font.

## Open owner decisions
- #137 ball tiers and prices. #153 menu key set. #151: does a Full button take the cursor (default no). #97 purpose and
  shape. #131 bonus sizes. #49, #107, #86, #99 (rest), #93, #60. Exp Candy amounts (#139). R1 Shedinja, R4 Alcremie N.

Rules: CLAUDE.md.
