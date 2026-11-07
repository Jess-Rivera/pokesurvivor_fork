# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-07 late afternoon, Quick (work machine). Branch: feature/entity-model.

## START HERE (next session, either tool)
Slice 7a (leader team and faint swaps) is BUILT, NOT YET CHECKED: the Quick sandbox cannot run node.
Jess runs: node tools/check.js, node docs/proposals/leader-team-mutate.js, node docs/proposals/gym-leader-mutate.js,
node tools/smoke-gym.js; then feel test G.Gym.debugLoop(2) + G.Debug.gym(2) in dev.html?dev.
Map and AS BUILT: docs/ASCII Concept Maps/Entity Model Slice 7 - Leader Team and Faint Swaps.txt (its 3 calls answered and built).
Then 7b: the team-reading run items and Regen on leaders.

## Where we are
- Entity model slices 1 to 6 built and feel-tested; 7a built. Misty: Zinc 3, hpMult {1: 25, 2: 19}, no enrage.
- Edge unstick fixed and committed. Its close-out missed one STALE gym-leader-mutate pattern, re-pointed now.
- Loop 2+ is dev-only (no real loop counter): the leader teams are invisible in a normal run (TODO).
- Lint: 0 errors, 69 warnings in inherited code (do not --fix).

## Next
1. Checks and the loop 2 feel test for 7a.
2. Slice 7b.
3. Owed feel tests: win a gym, swap before spending the link, spend it on a benched member; slice 1 Elite fight.
Also: delete merged branches; Codex menu with tooltips.

## Watch
- The Quick sandbox cannot run node: Jess runs every check after a Quick build.
- Mutation patterns match exact code lines: keep new code within Prettier's 120 columns; re-check mutate runners after any edit.
- Smokes over http (smoke-ui, smoke-newcombat) fail about 1 run in 3 with ERR_NO_BUFFER_SPACE; repeat first.
- Rocky Helmet is bugged (body touch only) and rejected on leaders; fix needs its own plan (TODO).
- Bright Powder does nothing on a leader until the AI dodges (slice 10).
- File:// font: Chromium blocks Silver-game.ttf (dev.html line 52); a fix needs a plan.
- `move-sim-mutate` "routing filter ignored" is a real MISS (28/29), older than slice 5.
- GitHub API returned empty again: TODO.md board mirror is still from 2026-11-04.

## Open owner decisions
- Board cleanup: #5 (slice 7a replaces it, close it) and stale `blocked` on #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first. Smokes find Playwright via PLAYWRIGHT_DIR, then <user folder>\tools\playwright.
