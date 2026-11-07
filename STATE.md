# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-06 night, Claude Code (home). Branch: feature/entity-model.

## START HERE (next session, either tool)
Slice 5 is BUILT: Misty is a real `G.GymLeader` (a Player entity) behind a per-gym switch. Every other gym stays on the old body.
Owed by Jess: the feel test, `G.Debug.gym(2)` in dev.html?dev: same fight, no touch damage, her status pills showing, sleep and freeze holding longer; watch for her catching on an arena rock (the wild stuck side-step was not carried over); take the badge. Then `G.Debug.gym(1)`: Brock must feel exactly as before.
Good: Jess commits. Bad: the way out is removing `playerEntity` from Misty in js/data/gyms.js.
What changed, every deviation and every test edit: docs/ASCII Concept Maps/Entity Model Slice 5 - GymLeader, Misty First.txt, "AS BUILT".

## Where we are
- Entity model plan: docs/proposals/host-model-plan.md (12 slices). Slices 1 to 4b verified and committed; 5 built.
- 4b is green: Jess's feel test passed 11-06.
- Mutation runners were repaired 11-06 (30 stale patterns). `move-sim-mutate` used to stop at its first stale one.

## Next
1. Slice 6 (stat pipeline and cards): leader stats match a player built the same way, Misty's Zinc x3, the fight-time report tunes `hpMult`. Plan as an ASCII map.
2. Owed feel tests: win a gym, swap before spending the link, spend it on a benched member; slice 1 Elite fight.
3. Work machine: `npm install` once so lint and format run.
Also: delete merged branches (commands given 11-06); Codex menu with tooltips.

## Watch
- Smokes over http (smoke-ui, smoke-newcombat) fail about 1 run in 3 with `ERR_NO_BUFFER_SPACE`, a Windows socket limit, not the game. Repeat before believing a resource failure. smoke-team and smoke-gym use file://.
- Slice 8 decisions parked: melee cushion on leaders, your flinch rule on leaders, select and shot sounds (recommended human only).
- 4b feel risks: double weaknesses one-shot; an Elite immune to all your team's types cannot be hurt.
- File:// font: Chromium blocks Silver-game.ttf (preload, dev.html line 52). Check in Chrome; a fix needs a plan.
- `move-sim-mutate` "routing filter ignored" is a real MISS (28/29), older than slice 5.
- TODO.md board mirror is from 2026-11-04.

## Open owner decisions
- Board cleanup: stale `blocked` on #5 and #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first. Smokes find Playwright via PLAYWRIGHT_DIR, then <user folder>\tools\playwright.
