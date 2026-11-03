# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-02, end of session (Claude Code, home; branch fix/ui-upgrade, from main).

## Where we are
- DODGE BUILT (not committed): Space, 150 px in 0.5 s, 2 team charges with 7 s cooldowns (paused while dodging), 0.2 s gap, body circle 20% for the first 0.3 s (no i-frames), ice glide at 300 px/s, two charge rings right of the Pokemon. Rules: docs/COMBAT-RULES.md "Dodge"; numbers: Player.DODGE. Not feel-tested yet.
- UI REWORK in progress: Black/White (Gen 5) look, snappy. Menus stay HTML/CSS; PixiJS only for the in-run canvas, after an fps test.
- Built and committed: main menu (css/bw-menu.css), Team screen (css/bw-team.css), Inventory popup (css/bw-inventory.css), Upgrades popup over Team (display only, 19 boxes, 0 / 40 points, Q/E), start and loading screens (PokeSwarm title).
- Uncommitted from Jess: start screen English text in dev.html, new fonts, category icons, raw item gifs, upgrade screen mock.
- Tests: check.js 30/30, smoke-ui passes, headless dodge probe on file:// (distance, timing, charges, gap, pause, narrow gap, wall, ice, push cancel).

## Next (in order)
1. Jess: feel the dodge (cooldown in the 5 to 10 s band, ring visibility on grass), commit.
2. Upgrades screen from assets/ui/picked/upgrade-screen-mock.png, then other screens one at a time (Shop, Missions, Settings, Pokedex, pause, end of run, level-up cards). Mobile last.
3. In-run HUD from assets/ui/In Run Mockup.png (own stage).
4. Gameplay queue: fields slice (Reflect), accuracy trackers (Smokescreen), later gym loops, line of sight for cones.

## Open owner decisions
- Friends and Leaderboard rows: they still open as before; grey them out?
- Korataki W01 web licence: check before publishing.
- [Open] loop 2+: do a gym's mons share stat raises. O4: badge boosts stacking. Psych Up, Baton Pass, Swagger, Psychic widening.

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js legacy hooks, regional forms (#9). Dodge: no touch button, not synced in co-op (TODO).

Rules: CLAUDE.md. file:// limits: CSS mask-image is blocked (use clip-path); headless runs must click #tap-start first or keys go to Login.
