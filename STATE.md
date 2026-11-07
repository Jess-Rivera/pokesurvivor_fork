# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-07 late afternoon, Quick (work machine). Branch: feature/entity-model.

## START HERE (next session, either tool)
Slice 7b (team items and Regen on leaders) is BUILT, NOT YET CHECKED (the Quick sandbox cannot run node).
Jess runs: node tools/check.js, node docs/proposals/leader-items-mutate.js, node docs/proposals/leader-team-mutate.js,
node docs/proposals/leader-stats-mutate.js. Feel test: a run of yours with Brass Knuckles or Pikachu's Tear, unchanged.
Map and AS BUILT: docs/ASCII Concept Maps/Entity Model Slice 7b - Leader Team Items and Regen.txt. Then slice 8.

## Where we are
- Entity model slices 1 to 7a built and feel-tested; 7b built. No gym authors the team items or Regen yet (Q6). Misty: Zinc 3, hpMult {1: 25, 2: 19}, no enrage.
- Edge unstick fixed and committed. Its close-out missed one STALE gym-leader-mutate pattern, re-pointed now.
- Loop 2+ is dev-only (no real loop counter): the leader teams are invisible in a normal run (TODO).
- Lint: 0 errors, 69 warnings in inherited code (do not --fix).

## Next
1. Checks for 7b.
2. Slice 8 (leader AI, slot choice).
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
- Board cleanup: #5 (slice 7a replaced it, close it) and stale `blocked` on #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first. Smokes find Playwright via PLAYWRIGHT_DIR, then <user folder>\tools\playwright.
