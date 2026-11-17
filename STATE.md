# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-17, Claude Code (home). Branch: rework/shop (off feature/128-acquisition, not merged).
No branch rules file.

## START HERE (next session, either tool)
1. #149 Main Menu Shop rework: 149a, 149b and 149c signed off by Jess. Next: open 149d (Inventory screen restyle, mockup
   assets/excalidraw/Main-Menu-Inventory.svg; agreed: Equip fills the next open slot). Then 149e (Pokeballs layout),
   149f (TRs). Plan and rulings: docs/ASCII Concept Maps/149 - Shop Rework Opening.md. rework/shop merges into
   feature/128-acquisition before #137.
2. Then #137 (ball buying fills the Pokeballs tab), #138, #146. #150 (TR starting move) is blocked on #149 and #97.
3. Small and ready: #145. #147 waits on Jess.

## Landed on rework/shop this session (2026-11-17)
- 149b Character Upgrades: Berry and Team Items Pocket cards, one Buy each (8d5f3850).
- 149c Team Items: searchable sale grid of cards, owned panel 4 across, Inventory button, three feel-test rounds
  (2aaa1b62 to 6e966fa2). Arrows and movement keys go to the nearest item that way; Up stays in its area; search bars
  are keys-only cursor stops shown by their green rim.
- Kit: Box body colour, TeamButton disabled, ItemGrid columns and slot overlay, SearchBar. Setting: Tooltip Delay.
- Decisions: 2026-11-17-cursor-tooltips-after-a-settable-delay, 2026-11-17-no-selection-cursor-with-the-mouse.
- check.js clean; smoke-ui Shop pass 30 checks; smoke-berry-slots passes.

## Watch
- Shop cursor rules are Shop-only so far; the catch screen and others adopt them with #126.
- smoke-ui: sometimes one run fails on a local-server asset load (ERR_FAILED / ERR_NO_BUFFER_SPACE); rerun.
- Layout screenshots: serve over http, file:// headless loses the Silver font.

## Open owner decisions
- 149f TR price bands by move power (drafted at 149f). #137 ball tiers and prices. #97 purpose and shape. #131 bonus
  sizes. #49, #107, #86, #99 (rest), #93, #60. Exp Candy amounts (#139). R1 Shedinja, R4 Alcremie N.

Rules: CLAUDE.md.
