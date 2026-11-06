# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-05, end of session (Claude Desktop). Branch: fix/onboarding-flow (from main 91a0180); edits uncommitted.

## Where we are
- main 91a0180 = Move Shop merge + fix/stale-mutations merge, both pushed.
- Onboarding (2026-11-04 playtest), plan: docs/ASCII Concept Maps/Onboarding - Login and Starter Pick.txt. All three BUILT, none feel-tested:
  - F1: login title reads PokeSwarm (Korataki); box widened to 520px, title 30px under 420px wide.
  - F2: text fields keep Tab, Space, arrows (js/core/input.js). input-keys harness 41, mutation 6/6.
  - F3: new players pick a region (3x3 cards), get its 3 starters, Grass leads, team of 3; no lead change on the home screen. Psyduck and Slowpoke dropped from the pick. All 9 regions pickable. js/ui/test.js, G.STARTER_REGIONS, starter-regions harness 164 and mutation 7/7.
- check.js all green, smoke-ui passed (login and onboarding passes), file:// checked at 3 sizes.

## Next (in order)
1. Feel test on dev.html?dev (hard reload): Play as guest, see the region pick, pick one, check the menu and Team screen; login title fit; Tab in login. Then commit and push.
2. Home: npm run format on main if drifted, delete merged branches feature/move-shop and fix/stale-mutations.
Then: Step 5 feel test (0:00 to 2:00 on one move); Codex menu with tooltips; encounter project.

## Watch
- Old name still on the rotate prompt, noscript, legal panel, funding popup (D1 was login only). Meta and SEO tags wait for the publish phase.
- Retired lang-en.js keys (login subtitle, official line, old picker copy) are unused; prune later. Quiz and result markup in dev.html and the quiz data in starters.js are unused.
- GitHub API returned nothing from Quick all of 2026-11-05; board mirror last synced 2026-11-04.
- Silver income unmeasured, judge by feel. Shop Rerolls ranks feed rerollRank() (reads 0).
- Starting with 3 Pokemon changes early balance (bench and swap from minute 0): judge by feel.

## Open owner decisions
- Board cleanup: stale `blocked` on #5 and #11; #11 likely done by Move Shop.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- [Open] loop 2+ gym raises; O4 badge stacking; Psych Up, Baton Pass, Swagger, Psychic widening.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs must click #tap-start first.
