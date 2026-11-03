# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-02 (Claude Code, home; branch fix/ui-upgrade, from main).

## Where we are
- UI REWORK started: Black/White (Gen 5) look for every screen, cohesive, "snappy, quick" (instant highlight, ~120 ms slides, preloaded art). Menus stay HTML/CSS; PixiJS only ever for the in-run canvas, after an fps test.
- Main menu BUILT (css/bw-menu.css): PokeSwarm title (Korataki ExtraBold), pokemon-b-w font, faded grid panel (lines 30%), chevron rows from assets/ui/menu, keyboard cursor, top bar with 3 counters, bottom bar with credits and stats. Sound, fullscreen, sign out and patch notes moved into Settings. Restyled to the Team card blues: rows drawn by tools/make_menu_rows.py at the cards' 2 px scale (chevron, 3-line border, see-through fill, 45 degree band), navy grid, cyan bar lines.
- Team screen BUILT (css/bw-team.css): diagonal gradient (#04060a corners, #0a1520 band), main menu top bar kept, flat bottom bar with Back / Commit (icon_cancel_narrow art). Left: 6 floating slots, column scrolls under ~1000 px tall (panel_round lead, panel_rect, panel_blank under, dimmed when empty, swap art on drag). Centre: party cards (tools/make_party_cards.py). Slots drawn by tools/make_party_cards.py (384x146, card border), Upgrade on each slot. Right: yellow name row, then alternating blues (rarity+types, BST+hex, ability, moves), no buttons. Put = double-click, drag or Enter; free = right-click or drag to grid; shiny = click the slot's shiny icon; controls in the slot tooltip.
- Magnet: base 120 px, upgrade +20% per level (committed).
- Kanto batch 1 and gym loop-1 lore sets merged into main (Roar, Fissure, Future Sight not yet feel-tested).
- Tests: check.js 30/30; headless menu and Team checks on file:// at 4 sizes, no page errors.

## Next (in order)
1. Jess: feel the main menu and the Team screen; commit.
2. Other screens, one at a time (Shop, Inventory, Missions, Settings, Pokedex, pause, end of run, level-up cards). Narrow phones: the 3 bar buttons overflow below ~420 px wide.
3. In-run HUD from assets/ui/In Run Mockup.png (own stage).
4. Gameplay queue still waiting: fields slice (Reflect), accuracy trackers (Smokescreen), later gym loops, line of sight for cones.

## Open owner decisions
- Friends and Leaderboard rows: they still open as before; grey them out?
- Korataki W01 web licence: check before publishing.
- [Open] loop 2+: do a gym's mons share stat raises. O4: badge boosts stacking. Psych Up, Baton Pass, Swagger, Psychic widening.

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js legacy hooks, regional forms (#9).

Rules: CLAUDE.md. file:// limits: CSS mask-image is blocked (use clip-path); @font-face loads fine; rel=preload font links fail (harmless).
