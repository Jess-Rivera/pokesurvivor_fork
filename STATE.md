# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-03 (Claude Code, home). feature/item-rework-v2 is merged to main. Current branch: feature/pokeboxes.

## Where we are
- ITEM REWORK V2 is DONE for now and feel-tested good. Jess is happy with the item count.
- Shipped: one drop table (js/data/drops.js, docs/ITEMS.md); Oran and Sitrus replace the heal pickup; a gym leader drops one item; rock and small chest 6 HP; Band, Specs, Muscle Band, Wise Glasses by category; 9 new Pokemon items (45 total); pickup lines ("Oran Berry: heal 30% HP"); Space and Enter no longer restart the run.
- Playtest tune: pickup radius split (XP orbs 120 px plus the upgrade; everything else, coins included, fixed 78 px; magnet pickup and shrine hit both) and Pinap retune (+0.5 for 20 s, +1 for 10 s, +2 for 5 s). Numbers in BALANCE.md. Dropped items now draw their real sprite at 32.
- PARKED (Jess, 2026-11-03): batch 1 steps 4 to 6 (12 ground + 10 Pokemon items). Rulings stay approved and unbuilt; docs/proposals/item-rework-v2-handoff.md holds them. Do not start unless Jess reopens them.

## Next
1. POKEBOX (then IVs, natures, EVs): docs/proposals/pokebox-plan.md. Copy structure approved; nothing built. Step 1 no-code plan is with Jess, waiting on his OK.
2. Move tuning: Jess has moves to tune from the 10 min playtest, not named yet. Get the list, check each against docs/MOVE-INTENT.md, then give a no-code plan.
3. Run items second pass (9 drafted, more needed before bosses go run-only), then upgrade points (TODO.md "Upgrade points catalog").
4. Before the art branch: decide sprite scale, camera zoom and Pixi (benchmark first, own branch).
5. Gameplay queue: fields slice (Reflect), accuracy trackers (Smokescreen), gym loops, line of sight for cones.

## Watch
- smoke-ui is flaky: 1 of 4 runs on 2026-11-03 failed with net::ERR_FAILED on assets/pokemon/7/Charge.png (the file exists); cause not found.
- check.js reports 5 lint errors (warn-only), not traced.

## Open owner decisions
- Run-only boss pool: how many distinct run items first (34 with the 9 drafted, 18 are Power Stones).
- Pixel density and sprite scale; region unlock rule; grey out Friends and Leaderboard; Korataki W01 licence.
- [Open] loop 2+: gym mons share stat raises. O4: badge boosts stacking. Psych Up, Baton Pass, Swagger, Psychic widening.

## Docs and code still differ (approved, not built)
- Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js legacy hooks, regional forms (#9), item batch 1 steps 4 to 6. Dodge: no touch button, not synced in co-op (TODO).

Rules: CLAUDE.md. Run npm run format before handing over. file:// limits: CSS mask-image is blocked (use clip-path); headless runs must click #tap-start first or keys go to Login.
