# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-07, Claude Code (home). Branch: feature/entity-model.

## START HERE (next session, either tool)
Slice 6 (leader stats and cards): Jess answered D1 to D6 on 11-07; Q1 to Q5 are open in the map,
then it is redrawn as one plan: docs/ASCII Concept Maps/Entity Model Slice 6 - Leader Stats and Cards.txt.
Governing rule (COMBAT-RULES "Host model", LEADER PRINCIPLE): a leader is another player's team run by AI;
anything a player can have, it can have; every difference is hand authored. Check every leader rule against it.

## Where we are
- Entity model plan: docs/proposals/host-model-plan.md (12 slices). Slices 1 to 5 verified; slice 5's
  feel test passed 11-07 (Misty on G.GymLeader). She stutters on an arena edge now and then (TODO Up next).
- Mutation runners were repaired 11-06 (30 stale patterns).

## Next
1. Jess answers slice 6 Q1 to Q5; redraw the map; approve; build.
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
- Slice 6 Q1 to Q5 (enrage, power and tempo, built-in leader status rules, item tiers, card budget).
- Board cleanup: stale `blocked` on #5 and #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first. Smokes find Playwright via PLAYWRIGHT_DIR, then <user folder>\tools\playwright.
