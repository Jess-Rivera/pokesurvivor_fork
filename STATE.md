# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-06 end of day, Quick (work). Branch: feature/entity-model.

## START HERE (next session, either tool)
Slice 4b is BUILT and committed but has NEVER RUN. Before anything else:
1. `git pull --ff-only`, then: `node tools/check.js` (47/47), `node docs/proposals/type-chart-mutate.js` (25/25), `node docs/proposals/hit-parity-mutate.js` (31/31), `node docs/proposals/move-sim-mutate.js` (no STALE), `node tools/smoke-newcombat.js`, `node tools/smoke-team.js`, `node tools/smoke-ui.js`.
2. On a FAIL: work out from the game code and COMBAT-RULES whether the test or the game is wrong, and tell Jess which, before editing. Never move an expected value to match output without that proof. List every test edit made after a run.
3. Jess's balance feel test: Ember on Bulbasaur (x2), Water Gun on Geodude (x4), a Normal move on Gastly (0 and a grey Immune), horde damage about as before, every `G.Debug.newcombat()` set still lands (dummies are typeless).
4. Green and feels right: Jess commits "4b verified". Then plan slice 5.
What 4b changed, and every deliberate test edit: docs/ASCII Concept Maps/Entity Model Slice 4 - Hit Contract and Hard Typing.txt, "4b PRE-BUILD SCAN" and "4b AS BUILT". Rules: COMBAT-RULES "Damage", "Type chart".

## Where we are
- Entity model plan: docs/proposals/host-model-plan.md (12 slices). Slices 1, 2, 3, 4a built, green, committed.
- 4b: mainline chart with true x0 immunity, STAB everywhere, ENEMY_POWER 40 to 27, typeless test dummies.

## Next (after 4b)
1. Slice 5 (`GymLeader`, Misty first): plan as an ASCII map; decide which select, shot and heal sounds are the human's.
2. Owed feel tests: win a gym, swap before spending the link, spend it on a benched member; slice 1 Elite fight.
3. Work machine: `npm install` once so lint and format run.
Also: delete merged branches (commands given 11-06); Codex menu with tooltips.

## Watch
- 4b feel risks: a lead weak to a gym's type takes x2; double weaknesses one-shot; an Elite immune to all your team's types cannot be hurt.
- File:// font: Chromium blocks Silver-game.ttf over file:// (preload, dev.html line 52). Check in Chrome; a fix needs a plan.
- Leaders fire all moves at once; one active slot at slice 8. boss-owner-mutate: 5 stale patterns, fix at slice 5.
- TODO.md board mirror is from 2026-11-04; the GitHub API returned empty all of 11-06.

## Open owner decisions
- Board cleanup: stale `blocked` on #5 and #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first. Smokes find Playwright via PLAYWRIGHT_DIR, then <user folder>\tools\playwright.
