# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-17 (fifth session), Claude Code (home). Branch: feature/128-acquisition (rework/shop merged in).
No branch rules file.

## START HERE (next session, either tool)
0. #137 (Shop balls) built, in Needs Playtest. Feel test: Shop, Pokeballs tab: buy a Poke Ball (Enter, click), Shift
   buys 10, unlock Great, buy Belt 2; then a run's catch throws from belt 2. Close it on Jess's OK.
1. Next on #128: #138 (Lost Pokemon pool), then #146.
2. Ready with nothing owed: #145 (small tooltip bug). #150 blocked on #97.

## Landed this session (2026-11-17, fifth)
- #153 and #147 closed. #137: balls, Great and Ultra unlocks and belts bought with PokeCoins on the Pokeballs tab and
  kept between runs; the free run-start refill is gone; the catch screen throws from every bought belt (decision
  2026-11-17-137-balls-bought-and-kept-no-refill; plan and as-built: docs/ASCII Concept Maps/137 - Shop Balls Plan.md).

## Landed earlier (2026-11-17, fourth)
- #154 closed: js/ui/menu.js split into six files (menu.js Main Menu and region select; menu-dex-grid.js,
  menu-pokedex.js, menu-team.js, menu-team-copies.js, menu-upgrades.js). G.MenuUI keeps its surface. Behavior-neutral;
  Jess feel-tested. Plan and as-built: docs/ASCII Concept Maps/154 - Split menu.js Plan.md.
- #153: Enter and Space select, arrows and movement keys move, on every menu (decision 2026-11-17-one-menu-key-set).
  Fixed: Enter or Space on Play started a run without showing the region picker (the key went on to the picker).

## Watch
- Menu key listeners: G.MenuUI.init registers the Main Menu's, then calls G.MenuTeam.init and G.MenuUpgrades.init, in
  that order. A menu window's own listener goes in its init (after menu.js's); a key it handles goes no further.
- The menu files call later files (team to copies, team to upgrades, menu.js to all) when they run, never at load.
- game.js handleKeys polls Esc for menu screens; a screen with its own Esc must be left off that list (Shop, Inventory).
- shop-screens-mutate: 2 STALE mutants on game.js predate 149f (the shop-over-another-screen and bond guards).
- smoke-ui: sometimes one run fails on a local-server asset load ("shop: no console or page errors"); rerun.
- Layout screenshots: serve over http, file:// headless loses the Silver font.
- Board drift: #147 labelled needs-playtest but in Triage; #29 in Blocked with no blocked label; #86 still in Triage.

## Open owner decisions
- #97 purpose and
  shape. #131 bonus sizes. #49, #107, #86, #99 (rest), #93, #60. Exp Candy amounts (#139). R1 Shedinja, R4 Alcremie N.

Rules: CLAUDE.md.
