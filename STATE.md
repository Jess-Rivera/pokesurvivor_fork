# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-06, Quick (work). Branch: feature/entity-model.

## Where we are
- Entity model plan: docs/proposals/host-model-plan.md (12 slices). Slice 1 built and committed; feel test not confirmed.
- Slice 2 (Team module) BUILT and green 2026-11-06 (check.js, smoke-team, team-mutate, smoke-ui).
- Slice 3 (`PlayerEntity`, `HumanPlayer`) BUILT and green 2026-11-06 (check.js 45/45, player-entity-mutate 35/35, smoke-team, smoke-ui, smoke-newcombat). Slices 2 and 3 quick feel test OK (Jess); the gym-win link part is still owed. D1 one file; D2 `isPlayer` = follows Player entity rules; D3 berry guards stay a Player-entity rule; D4 the in-play slot keys go through the controller too. Map: docs/ASCII Concept Maps/Entity Model Slice 3 - PlayerEntity and HumanPlayer.txt.
- Slice 3 first run broke the move path: the aim method was named `foes()`, which G.MoveSim reads as a gym leader's mon (your hits skipped enemy defense, about 3x damage). Renamed `aimTargets()`.
- Slice 3 files: js/entities/player.js, js/game.js (controller reads), js/main.js (NEED), docs/proposals/player-entity-harness.js, player-entity-mutate.js.

## Next (in order)
1. Feel test still owed: win a gym, swap before spending the link, spend it on a benched member.
2. Lint and format have never run on the work machine (`npm install` first).
3. Slice 4 APPROVED 2026-11-06 (map: docs/ASCII Concept Maps/Entity Model Slice 4 - Hit Contract and Hard Typing.txt). Build 4a first: hit-parity-harness.js WRITTEN 11-06, must pass on today's code BEFORE anything moves. Then 4b (STAB everywhere, wild Power 27, mainline chart, true x0), its own commit with a changelog entry.
4. Slice 5 (`GymLeader`, Misty first): decide which select/shot/heal sounds are the human's.
Also: delete merged branches (commands given 11-06); Step 5 feel test; Codex menu with tooltips.

## Watch
- File:// font: Chromium blocks assets/fonts/Silver-game.ttf over file:// (CORS; the preload in dev.html line 52). Check whether the game font shows in Chrome from file://. A fix needs a plan (dev.html is game code).
- Leaders fire all moves at once; one active slot at slice 8 (setActive's rules and sound split there).
- Two `e.elite` checks remain in the enemy manager. boss-owner-mutate: 5 stale patterns, fixed at slice 5.
- Board mirror is from 2026-11-04; the GitHub API returned empty on 11-06.
- Director AI is not in this plan; conflicts with the GDD AI principle [Open].

## Open owner decisions
- Board cleanup: stale `blocked` on #5 and #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs must click #tap-start first.
