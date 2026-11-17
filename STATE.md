# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-17 (sixth session), Claude Code (home). Branch: feature/128-acquisition (rework/shop merged in).
No branch rules file.

## START HERE (next session, either tool)
0. #137 (Shop balls) with 137b (ball slots) and 137c (belts packed right and numbered, one "Buy Belt N" beside Exit,
   Sell above Exit at half price, an affordable Unlock lit), in Needs Playtest. Feel test: buy, arrange and sell balls
   by keys and mouse; buy belts 2 and 3 from the one button; a run's catch shows your layout. Close it on Jess's OK.
1. Next on #128: #138 (Lost Pokemon pool), then #146.
2. Ready with nothing owed: #145 (small tooltip bug). #150 blocked on #97.

## Landed this session (2026-11-17, fifth)
- #153 and #147 closed. #137: balls, Great and Ultra unlocks and belts bought with PokeCoins on the Pokeballs tab and
  kept between runs; the free run-start refill is gone; the catch screen throws from every bought belt (decision
  2026-11-17-137-balls-bought-and-kept-no-refill; plan and as-built: docs/ASCII Concept Maps/137 - Shop Balls Plan.md).
  137b: save.belt is now a slot layout (old saves convert on load); decision 2026-11-17-137b-ball-slots-kept-and-arranged.
  137c: Pokeballs tab layout, Sell at half price, lit Unlock; decision 2026-11-17-137c-sell-balls-at-half-price.

## Landed earlier (2026-11-17, fourth)
- #154 (menu.js split into six files) and #153 (one menu key set) closed; detail in DEVLOG.

## Watch
- Preact signals: a component that reads a signal skips redraws when its props are unchanged; read signals in a small
  child component, not in a pane that must redraw on every save (137c's Sell).
- Menu key listeners: G.MenuUI.init registers the Main Menu's, then calls G.MenuTeam.init and G.MenuUpgrades.init, in
  that order. A menu window's own listener goes in its init (after menu.js's); a key it handles goes no further.
- The menu files call later files (team to copies, team to upgrades, menu.js to all) when they run, never at load.
- game.js handleKeys polls Esc for menu screens; a screen with its own Esc must be left off that list (Shop, Inventory).
- shop-screens-mutate: 2 STALE mutants on game.js predate 149f (the shop-over-another-screen and bond guards).
- smoke-ui: sometimes one run fails on a local-server asset load ("shop: no console or page errors"); rerun.
- Layout screenshots: serve over http, file:// headless loses the Silver font.
- Board drift: #29 in Blocked with no blocked label; #86, #110, #111, #120, #121 in Triage though labelled ready.

## Open owner decisions
- #97 purpose and
  shape. #131 bonus sizes. #49, #107, #86, #99 (rest), #93, #60. Exp Candy amounts (#139). R1 Shedinja, R4 Alcremie N.

Rules: CLAUDE.md.
