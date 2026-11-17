# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-17 (second session), Claude Code (home). Branch: rework/shop (off feature/128-acquisition, not merged).
No branch rules file.

## START HERE (next session, either tool)
1. #149 Main Menu Shop rework: 149a to 149d signed off by Jess. Next: open 149e (Pokeballs layout, mockup
   assets/excalidraw/Shop-Pokeballs.svg; cards and belt drawn, buys inert until #137), then 149f (TRs). Plan and rulings:
   docs/ASCII Concept Maps/149 - Shop Rework Opening.md. rework/shop merges into feature/128-acquisition before #137.
2. #151 and #152 (unaffordable buttons take the cursor and toast "Unable to Afford"; pocket Buy look) fit before or with 149e,
   since 149e adds more buy buttons. #153 (menu keys) needs Jess's call on the key set.
3. Then #137, #138, #146. #150 blocked on #149 and #97. Small and ready: #145. #147 waits on Jess.

## Landed on rework/shop this session (2026-11-17, second)
- 149d Inventory screen (ea18f90b, ad7d8812, ad098140): cards with Equip / Unequip / Swap, slot panels like the run
  screen's, swap pick, Shop and Exit in the Shop's Exit place.
- Shared pieces: js/ui/menu-window-kit.js (createMenuCursor, CursorButton, ItemCard, SearchStop); the kit's RunItemBox.
  Equip rules in G.Items (equipTeamItem, unequipTeamItem, swapTeamItem, firstEmptySlot).
- Decision 2026-11-17-unaffordable-buttons-take-the-cursor (built by #151).
- check.js clean; smoke-ui Shop 30 and Inventory 20; items-f3d2-harness section 6.

## Watch
- A menu window's key listener goes in its init (after menu.js's), and a key it handles goes no further.
- Shop cursor rules are Shop and Inventory only so far; others adopt them with #126.
- smoke-ui: sometimes one run fails on a local-server asset load (ERR_FAILED / ERR_NO_BUFFER_SPACE); rerun.
- Layout screenshots: serve over http, file:// headless loses the Silver font.

## Open owner decisions
- #153 menu key set. #151: does a Full button take the cursor (default no). 149f TR price bands. #137 ball tiers and
  prices. #97 purpose and shape. #131 bonus sizes. #49, #107, #86, #99 (rest), #93, #60. Exp Candy amounts (#139).
  R1 Shedinja, R4 Alcremie N.

Rules: CLAUDE.md.
