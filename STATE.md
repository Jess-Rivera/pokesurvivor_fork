# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-03, end of session (Claude Code, home). Branch: feature/pokeboxes, not merged to main.

## Where we are
- POKEBOX (unique Pokemon copies, then IVs, natures, EVs). Spec, rulings and the step 3 handoff: docs/proposals/pokebox-plan.md. Read it first for this work.
- Steps 1 and 2 built, committed through 3beb78d, feel-tested by Jess: copies in save.box read only through G.Copies (js/systems/copies.js), a clean save checkpoint in place of migration, Team screen tabs (Pokedex, Box 1, Box 2), slots by copy UUID, repeats on a team, gender, Nature, Ability, Height, Weight rows, and the IV band on the hexagon.
- Game font is Silver by Poppy Works, trimmed to js-used characters plus Latin (assets/fonts/Silver-game.ttf, 37 KB, tools/subset_silver.py), face GameFont in css/style.css. The B/W menus keep PokeBW and Korataki; Settings labels keep Monogram.
- IVs, nature and ability show but do nothing in combat until step 4.

## Next
1. Pokebox step 3: no-code plan first (handoff in the plan). Its three priced rulings are settled; the [Open] list there still needs Jess.
2. Step 4 (IVs and natures apply, first balance change), then step 5 (EVs).
3. Move tuning: Jess has moves to tune from the 10 min playtest, not named yet. Check each against docs/MOVE-INTENT.md, then a no-code plan.
4. Run items second pass, then upgrade points (TODO.md "Upgrade points catalog").
5. Gameplay queue: fields slice (Reflect), accuracy trackers (Smokescreen), gym loops, line of sight for cones.
PARKED: item batch 1 steps 4 to 6 (docs/proposals/item-rework-v2-handoff.md). Do not start unless Jess reopens them.

## Watch
- smoke-ui is flaky: twice on 2026-11-03, once ERR_FAILED on assets/pokemon/7/Charge.png (the file exists), once a 30 s waitForFunction timeout. Both passed on rerun; cause not found.
- check.js reports 5 lint errors (warn-only), not traced. Run npm run format before handing over.
- At 1280 x 720 the Team detail pane shows about two rows of moves before scrolling.

## Open owner decisions
- Run-only boss pool: how many distinct run items first (34 with the 9 drafted, 18 are Power Stones).
- Pixel density and sprite scale; region unlock rule; grey out Friends and Leaderboard; Korataki W01 licence.
- [Open] loop 2+: gym mons share stat raises. O4: badge boosts stacking. Psych Up, Baton Pass, Swagger, Psychic widening.

## Docs and code still differ (approved, not built)
- Pokebox steps 3 to 5. Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js legacy hooks, regional forms (#9), item batch 1 steps 4 to 6. Dodge: no touch button, not synced in co-op (TODO).

Rules: CLAUDE.md. file:// limits: CSS mask-image is blocked (use clip-path); headless runs must click #tap-start first or keys go to Login.
