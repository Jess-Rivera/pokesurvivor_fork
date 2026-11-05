# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-05, mid-session (Quick, work). Branch: feature/move-shop.

## Where we are
- MOVE SHOP (spec docs/proposals/move-shop-plan.md, handoff docs/proposals/move-shop-handoff.md): step 1 BUILT, feel test passed (Jess 2026-11-05). Step 2 Silver BUILT 2026-11-05; Jess's feel test found the coin and number bottoms misaligned, fixed in 2b (number-only pop, no coin bounce, then +50% size, docs/ASCII Concept Maps/Move Shop step 2b - Silver bounce and alignment.txt). Re-check PENDING. Next: plan step 3 (buildings and arrows) as an ASCII map; then 4 and 5.
- Step 2 not yet run on this machine: node is not reachable from Quick here, so Jess runs `node tools/check.js`, `node docs/proposals/silver-mutate.js`, smoke-ui and `npm run format`. Quick ran the silver harness (30/30) and all 15 mutations (15/15) in a shim, and parse-checked every edited file.
- POKEBOX steps 1 to 5 on main. Step 5b PARKED until Jess's mockups (docs/ASCII Concept Maps/Pokebox 5b - EV-Lowering Berries.txt).

## Next (major features, Jess picks)
1. Move Shop steps 3 to 5. Gacha overhaul is its own later branch.
2. Tooltips and explanations: one mechanism, then the top confusions; G.MoveInfo already generates move text.
3. Encounter project: Director AI (docs/Director AI Proposal.md), routes per region, then the hard type chart.
4. Small: bench recharge test (reverses a ruling), the wall bug (Flamethrower through walls), Wide Lens.

## Watch
- Step 3 plan: the gym arrow moving from the screen edge to near the character changes existing behavior, so it gets its own decision.
- check.js ONE known failure (on main too): gyms-only-harness trips on a comment at js/data/enemies.js:34. One-line fix awaiting Jess's OK.
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
