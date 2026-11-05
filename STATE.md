# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-05, mid-session (Quick, work). Branch: feature/move-shop.

## Where we are
- MOVE SHOP (spec docs/proposals/move-shop-plan.md): steps 1 to 4 BUILT and feel-tested (scale 1.5, bonds fixed). Step 4b (purchase confirm, H2) and 4c (Ban becomes Shop Rerolls, R1 to R5 as proposed) BUILT 2026-11-05, feel test PENDING (4c map section 6). Next: plan step 5 (remove New Move cards, fix and run the income bot, smoke-ui, docs).
- node is not reachable from Quick here: Jess runs check.js, the silver and shops mutation runners, smoke-ui and `npm run format`. Quick runs the new harnesses and mutations in a shim.
- POKEBOX steps 1 to 5 on main. Step 5b PARKED until Jess's mockups (docs/ASCII Concept Maps/Pokebox 5b - EV-Lowering Berries.txt).

## Next (major features, Jess picks)
1. Move Shop step 5. Gacha overhaul is its own later branch.
2. Tooltips and explanations: one mechanism, then the top confusions; G.MoveInfo already generates move text.
3. Encounter project: Director AI (docs/Director AI Proposal.md), routes per region, then the hard type chart.
4. Small: bench recharge test (reverses a ruling), the wall bug (Flamethrower through walls), Wide Lens.

## Watch
- Step 3: the gym's off-screen arrow now floats off the character (F1, approved). gym.js calls G.Shops guarded, since the gym harnesses load gym.js without shops.js.
- check.js ONE known failure (on main too): gyms-only-harness trips on a comment at js/data/enemies.js:34. One-line fix awaiting Jess's OK. Also STALE, pre-existing: team-cards-mutate:78 and ui-readers-mutate:31 (TODO.md).
- Silver income estimate (1 to 2 moves per shop) is unmeasured; the income bot stalls (fix in step 5).
- tools/pack_itch.js ships the 308 MB _not-shipped folder; parked by Jess.
- smoke-ui can be flaky (rerun); lint is warn-only. Board mirror in TODO.md last synced 2026-11-04 morning; the GitHub API returned nothing from Quick on 2026-11-05.
- Local main and feature/pokeboxes are behind origin on the work machine (Jess pulls).

## Open owner decisions
- Board cleanup: stale `blocked` on #5 and #11; Pokebox and Move Shop have no issue.
- Boss pool size; sprite scale; region unlock rule; grey out Friends and Leaderboard; Korataki W01 licence.
- [Open] loop 2+ gym raises; O4 badge stacking; Psych Up, Baton Pass, Swagger, Psychic widening.
- Owed by Jess: what testers found unclear (tooltips scope), bench recharge call.

## Docs and code still differ (approved, not built)
- Step 5b; nicknames in runs and search; co-op IVs, EVs and Silver (deferred). Multi-mon arena (#5), gym AI Tier 2, js/net/coop.js hooks, regional forms (#9), item batch 1 steps 4 to 6.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs must click #tap-start first.
