# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-16 (late), Claude Code (home). Branch: rework/shop (off feature/128-acquisition, not merged).
No branch rules file.

## START HERE (next session, either tool)
1. #149 Main Menu Shop rework, slice 149a (shell) built, Needs Playtest, NOT closed. Jess feel-tested it three times
   tonight; fixes landed (no tab cursor or tooltip, flush fixed tabs, Q / E, smaller Exit, cursor follows mouse or keys).
   Next: Jess's next feel test of 149a, then close 149a and open 149b (Character Upgrades: Berry and Team Item Pockets).
   Plan and rulings: docs/ASCII Concept Maps/149 - Shop Rework Opening.md. Order: a, b, c, d (Inventory), e (Pokeballs
   layout), f (TRs). rework/shop merges into feature/128-acquisition before #137.
2. Then #137 (ball buying fills the Pokeballs tab), #138, #146. #150 (TR starting move) is blocked on #149 and #97.
3. Small and ready: #145. #147 waits on Jess.

## Landed on rework/shop this session
- Shop mockups and tab icons (0ea72871). 149a shell (74dfe142), feel-test fixes (7a9b08bf), cursor follows the device
  (f142b793). HUD kit: TeamButton artPixel option; page-wide inputMode signal.
- Decisions: 2026-11-16-149-main-menu-shop-four-tabs-trs-learned-for-good,
  2026-11-16-selection-cursor-follows-the-device-in-use.
- check.js clean (60 harnesses); smoke-ui passes (Shop pass, 11 checks); smoke-berry-slots passes.

## Landed earlier on feature/128-acquisition
#132 to #136, #148 (catch odds and tuning), one universal tooltip layer. Main has #124 and #125.

## Watch
- The catch screen keeps the old cursor (stays put under the mouse); it adopts inputMode with #126 unless Jess wants it now.
- In 149a the panes' cards and Buy buttons take no cursor yet (149b, 149c).
- smoke-ui: back-to-back runs sometimes fail on local-server asset loads (ERR_NO_BUFFER_SPACE).

## Open owner decisions
- 149f TR price bands by move power (drafted at 149f). #137 ball tiers and prices. #97 purpose and shape. #131 bonus
  sizes. #49, #107, #86, #99 (rest), #93, #60. Exp Candy amounts (#139). R1 Shedinja, R4 Alcremie N.

Rules: CLAUDE.md.
