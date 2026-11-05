# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-05, end of session (Quick, work). Branch: feature/move-shop.

## Where we are
- MOVE SHOP build order COMPLETE (spec docs/proposals/move-shop-plan.md, maps docs/ASCII Concept Maps/Move Shop step *.txt): learnsets, Silver, buildings and arrows, shop screens, purchase confirm, Shop Rerolls (was Ban), New Move cards retired. All feel-tested except step 5.
- Pushed through 72815a5 (4b, 4c). NOT committed yet: step 5, the gyms-only comment fix (js/data/enemies.js), today's docs.
- check.js on the work machine: 39/40 before the gyms-only fix, expect 40/40. smoke-ui and npm run format have NOT run on this work (no Playwright or prettier here).

## Next (in order)
1. Work: node tools/check.js, commit step 5, push.
2. Home: pull, check.js, smoke-ui, npm run format (commit if it changes files), then git merge --no-ff feature/move-shop into main, check.js, push. origin/main cbb8481 is the branch base, no conflicts. The branch also carries 6da816f "Tileset art rearranging".
3. After the merge: re-quote the 27 STALE mutation entries (TODO.md, own commit). Run shop-screens-, shops- and silver-mutate under real node (never run there).
4. Step 5 feel test (S1): is 0:00 to 2:00 on one move dull? If so, revisit the 2:00 shop timing.
Then: tooltips (one mechanism, top confusions); encounter project (docs/Director AI Proposal.md); small: bench recharge test, Flamethrower through walls, Wide Lens.

## Watch
- Silver income unmeasured, no bot (Jess): judge by feel. Shops are the only move source after the starting move.
- Upgrades popup is display only; Shop Rerolls ranks feed rerollRank() in js/systems/shops.js (reads 0). Old Ban leftovers to remove later (TODO.md).
- Board mirror in TODO.md last synced 2026-11-04 morning; the GitHub API returned nothing from Quick all of 2026-11-05. Move Shop has no issue.
- DEVLOG.md is about 97 KB, past the ~40 KB rotation rule.
- tools/pack_itch.js ships the 308 MB _not-shipped folder; parked. Local main is behind origin here.

## Open owner decisions
- Board cleanup: stale `blocked` on #5 and #11.
- Boss pool size; sprite scale; region unlock rule; grey out Friends and Leaderboard; Korataki W01 licence.
- [Open] loop 2+ gym raises; O4 badge stacking; Psych Up, Baton Pass, Swagger, Psychic widening.
- Owed by Jess: what testers found unclear (tooltips scope), bench recharge call.

## Docs and code still differ (approved, not built)
- Pokebox 5b (parked for mockups); nicknames in runs; co-op IVs, EVs, Silver and shops (deferred); multi-mon arena (#5); gym AI Tier 2; regional forms (#9); item batch 1 steps 4 to 6; TMs on the Pokedex and Team screens.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs must click #tap-start first.
