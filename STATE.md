# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-05, mid-session (Quick, work). Branch: feature/move-shop.

## Where we are
- MOVE SHOP (spec docs/proposals/move-shop-plan.md): build order COMPLETE. Steps 1 to 4c feel-tested 2026-11-05 (scale 1.5, bonds fixed, purchase confirm, Shop Rerolls; Upgrades ranks not wired). Step 5 (New Move cards retired, no income bot per Jess) BUILT 2026-11-05, feel test PENDING: does 0:00 to 2:00 on one move feel dull (S1)?
- Quick has no node; Jess runs checks. Work machine: check.js should now be 40/40 (re-run to confirm); no Playwright (smoke-ui at home) or prettier (npm install).
- POKEBOX steps 1 to 5 on main. Step 5b PARKED until Jess's mockups (docs/ASCII Concept Maps/Pokebox 5b - EV-Lowering Berries.txt).

## Next (major features, Jess picks)
1. Move Shop merge: commit step 5 + the gyms-only fix (work), then at home pull, smoke-ui, format, merge --no-ff into main (origin/main cbb8481 is the branch's base, so no conflicts). Gacha overhaul is its own later branch.
2. Tooltips and explanations: one mechanism, then the top confusions; G.MoveInfo already generates move text.
3. Encounter project: Director AI (docs/Director AI Proposal.md), routes per region, then the hard type chart.
4. Small: bench recharge test (reverses a ruling), the wall bug (Flamethrower through walls), Wide Lens.

## Watch
- Step 3: the gym's off-screen arrow now floats off the character (F1, approved). gym.js calls G.Shops guarded, since the gym harnesses load gym.js without shops.js.
- gyms-only-harness comment failure FIXED 2026-11-05 (js/data/enemies.js header comment reworded, Jess OK; fixes main too once merged). 27 pre-existing STALE mutation entries in ui-readers- and team-cards-mutate: after the merge (TODO.md).
- Silver income (1 to 2 moves per shop) is unmeasured; no bot (Jess): judge by feel. Shops are now the only move source.
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
