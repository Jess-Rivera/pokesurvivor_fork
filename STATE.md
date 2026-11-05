# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-05 afternoon (Quick, work). Branch: fix/stale-mutations (cut from main 68fea95).

## Where we are
- MOVE SHOP MERGED to main: 68fea95 (--no-ff, parents cbb8481 + 4a1c9f5), pushed, origin/main matches. Spec docs/proposals/move-shop-plan.md.
- The merge also brought 6da816f "Tileset art rearranging" and the DEVLOG rotation (4a1c9f5) into main.
- DEVLOG rotated: entries 2026-10-25 to 2026-11-02 moved verbatim to docs/DEVLOG-archive.md; DEVLOG.md now about 30 KB.
- Merged at work, so smoke-ui and npm run format have NOT run on this code (no Playwright or prettier here). Only check.js has.

## Next (in order)
1. Home: pull main, node tools/check.js, smoke-ui, npm run format. If format changes files, commit them as their own "format" commit on main. A smoke-ui failure gets fixed on main.
2. fix/stale-mutations: the 27 STALE entries are re-quoted (ui-readers 6, team-cards 21), pending Jess running both runners (19/19, 60/60) and check.js, then commit, push, merge to main. Scope stops at these 27 (Jess).
3. Later: the two older stale entries (move-sim-mutate, stat-stage-mutate, TODO.md Backlog); run shop-screens-, shops- and silver-mutate under real node (never run there).
4. Step 5 feel test (S1): is 0:00 to 2:00 on one move dull? If so, revisit the 2:00 shop timing.
Then: tooltips (one mechanism, top confusions); encounter project (docs/Director AI Proposal.md); small: bench recharge test, Flamethrower through walls, Wide Lens.

## Watch
- Silver income unmeasured, no bot (Jess): judge by feel. Shops are the only move source after the starting move.
- Upgrades popup is display only; Shop Rerolls ranks feed rerollRank() in js/systems/shops.js (reads 0). Old Ban leftovers to remove later (TODO.md).
- Board mirror in TODO.md last synced 2026-11-04 morning; the GitHub API returned nothing from Quick on 2026-11-05. Move Shop has no issue.
- feature/move-shop can be deleted locally and on origin once home checks pass (Jess's call).
- tools/pack_itch.js ships the 308 MB _not-shipped folder; parked.

## Open owner decisions
- Board cleanup: stale `blocked` on #5 and #11; #11 (canonical learnsets) may be done by Move Shop step 1, close or narrow it.
- Boss pool size; sprite scale; region unlock rule; grey out Friends and Leaderboard; Korataki W01 licence.
- [Open] loop 2+ gym raises; O4 badge stacking; Psych Up, Baton Pass, Swagger, Psychic widening.
- Owed by Jess: what testers found unclear (tooltips scope), bench recharge call.

## Docs and code still differ (approved, not built)
- Pokebox 5b (parked for mockups); nicknames in runs; co-op IVs, EVs, Silver and shops (deferred); multi-mon arena (#5); gym AI Tier 2; regional forms (#9); item batch 1 steps 4 to 6; TMs on the Pokedex and Team screens.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs must click #tap-start first.
