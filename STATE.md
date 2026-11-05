# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-05, end of session (Quick, work). Branch: fix/onboarding-flow (from main 91a0180, nothing committed on it yet).

## Where we are
- main 91a0180 = Move Shop merge + fix/stale-mutations merge (27 entries re-quoted, 19/19 and 60/60), both pushed.
- Onboarding (2026-11-04 playtest), plan: docs/ASCII Concept Maps/Onboarding - Login and Starter Pick.txt.
  - F1 BUILT: login title reads PokeSwarm in the menu title font (Korataki); subtitle and official-site line removed (dev.html, css/style.css). Login screen only.
  - F2 BUILT: js/core/input.js no longer blocks Tab, Space, arrows in text fields; runs unchanged. New input-keys harness (41 checks) and mutation runner (6); dry run here passed, NOT yet run under real node. smoke-ui gained a login pass.
  - F3 PLANNED, not built: pick a region, get its 3 starters (Jess's 3x3 layout). Waiting on S1 to S4 in the plan.
- Changelog entry added (PokeSwarm login, Tab fix). Not feel-tested yet.

## Next (in order)
1. node tools/check.js and node docs/proposals/input-keys-mutate.js (expect 6/6), then commit and push this branch.
2. Feel test on dev.html?dev (hard reload, log out): title and font, Tab name to password, Space and arrows while typing.
3. Answer F3: S1 team of 3 for new players, S2 who leads (Grass always, or click one), S3 drop Psyduck and Slowpoke from the pick, S4 all 9 regions pickable. Then build F3 with its harness and mutation runner.
4. Home: smoke-ui (login pass is new), npm run format on main, delete merged branches feature/move-shop and fix/stale-mutations.
Then: Step 5 feel test (0:00 to 2:00 on one move); Codex menu with tooltips; encounter project.

## Watch
- Old name still on the rotate prompt, noscript, legal panel, funding popup (D1 was login only). Meta and SEO tags wait for the publish phase.
- Retired lang-en.js keys (login subtitle, official line) are unused now; prune later.
- GitHub API returned nothing from Quick all of 2026-11-05; board mirror last synced 2026-11-04.
- Silver income unmeasured, judge by feel. Shop Rerolls ranks feed rerollRank() (reads 0).

## Open owner decisions
- F3 S1 to S4 (above). Board cleanup: stale `blocked` on #5 and #11; #11 likely done by Move Shop.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- [Open] loop 2+ gym raises; O4 badge stacking; Psych Up, Baton Pass, Swagger, Psychic widening.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs must click #tap-start first.
