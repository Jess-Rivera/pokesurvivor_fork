# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-03, end of session (Claude Code, home; branch fix/ui-upgrade, from main).

## Where we are
- UI REWORK (menus only, in-run UI is out of scope on this branch): Black/White (Gen 5) look, snappy. Menus stay HTML/CSS.
- Committed: main menu, Team, Inventory, Upgrades popup (yellow title bar, blue cards, Prev/Next), start and loading screens, dodge on Space, coin and XP pickup sprites (16 px, assets/items/pickups, tools/cut_pickup_gifs.py).
- BUILT, NOT COMMITTED (Jess commits): region select (cards slide out over a dimmed menu, only Kanto open via REGIONS_OPEN in menu.js, Esc or click away closes), new full-screen Settings (css/bw-settings.css, js/ui/settings-ui.js; applies live, language switch removed), pickups without the glow circle (pickup.js). Headless checks pass; none feel-tested.
- Tests: check.js passes, smoke-ui passes, headless file:// probes for pickups, region select and settings. The signed-in Account tab was not rendered headless.

## Next (in order)
1. Jess: commit the uncommitted work, feel-test region select timing, Settings, pickups and the dodge.
2. Menu screens left: none planned (Pokedex is no longer a menu item, Shop waits for the meta progression). Mobile and narrow layouts last.
3. Upgrade points: buying, spending, applying in runs, saving (TODO.md "Upgrade points catalog").
4. Before the art branch: decide sprite scale, camera zoom and Pixi (benchmark first, own branch), since the tileset branch depends on it.
5. Gameplay queue: fields slice (Reflect), accuracy trackers (Smokescreen), gym loops, line of sight for cones.

## Open owner decisions
- Pixel density: Pokemon sprites at 1x or 2x, camera zoom, tile and sprite scale split (PX in js/core/sprites.js is shared). Previews were made, nothing changed; pickups are 16 px drawn at 1.5 world units per art pixel.
- Region unlock rule (all but Kanto are locked for now, Random too).
- Friends and Leaderboard rows: grey them out?
- Korataki W01 web licence: check before publishing.
- [Open] loop 2+: gym mons share stat raises. O4: badge boosts stacking. Psych Up, Baton Pass, Swagger, Psychic widening.

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js legacy hooks, regional forms (#9). Dodge: no touch button, not synced in co-op (TODO).

Rules: CLAUDE.md. file:// limits: CSS mask-image is blocked (use clip-path); headless runs must click #tap-start first or keys go to Login.
