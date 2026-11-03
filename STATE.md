# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-02 (Claude Code, home; branch fix/ui-upgrade, from main).

## Where we are
- UI REWORK started: Black/White (Gen 5) look for every screen, cohesive, "snappy, quick" (instant highlight, ~120 ms slides, preloaded art). Menus stay HTML/CSS; PixiJS only ever for the in-run canvas, after an fps test.
- Main menu BUILT (css/bw-menu.css): PokeSwarm title, pokemon-b-w font, navy grid panel, rows from tools/make_menu_rows.py (card style), keyboard cursor, top bar with 3 counters, bottom bar. Sound, fullscreen, sign out, patch notes moved into Settings.
- Team screen BUILT (css/bw-team.css): diagonal gradient, menu top bar, bottom bar Back / Commit. Left: 6 slots from tools/make_party_cards.py (384x146), Upgrade and shiny switch on each slot; column scrolls under ~1000 px tall. Right: yellow name row, alternating blues, no buttons. Put = double-click, drag, Enter; free = right-click or drag to grid.
- Inventory BUILT (css/bw-inventory.css): popup in the card frame over the gradient, yellow title, slot tiles and item cards from the same script (assets/ui/inventory), no buttons: double-click equips / moves / unequips, right-click empties a slot.
- Magnet: base 120 px, upgrade +20% per level (committed).
- Kanto batch 1 and gym loop-1 lore sets merged into main (Roar, Fissure, Future Sight not yet feel-tested).
- Tests: check.js 30/30, smoke-ui passes; headless menu, Team, Inventory checks on file:// at 4 sizes.

## Next (in order)
1. Jess: feel the main menu, Team and Inventory; commit.
2. Other screens, one at a time (Shop, Missions, Settings, Pokedex, pause, end of run, level-up cards). Mobile layout is a last-pass concern.
3. In-run HUD from assets/ui/In Run Mockup.png (own stage).
4. Gameplay queue still waiting: fields slice (Reflect), accuracy trackers (Smokescreen), later gym loops, line of sight for cones.

## Open owner decisions
- Friends and Leaderboard rows: they still open as before; grey them out?
- Korataki W01 web licence: check before publishing.
- [Open] loop 2+: do a gym's mons share stat raises. O4: badge boosts stacking. Psych Up, Baton Pass, Swagger, Psychic widening.

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js legacy hooks, regional forms (#9).

Rules: CLAUDE.md. file:// limits: CSS mask-image is blocked (use clip-path); @font-face loads fine; rel=preload font links fail (harmless).
