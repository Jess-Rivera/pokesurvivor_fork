# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-07 wrap-up, Quick (work machine). Branch: feature/entity-model.

## START HERE (next session, either tool)
1. If not done: run the slice 7b checks (node tools/check.js, then the leader-items, leader-team and leader-stats
   mutate runners in docs/proposals/). Built in Quick, never run (the Quick sandbox has no node).
2. Plan slice 8 (leader AI, slot choice) from docs/proposals/host-model-plan.md slice 8, then a map under
   docs/ASCII Concept Maps/. The plan's tests section names every new file and why (CLAUDE.md edit workflow).
   Slice 8 also owns: the leader melee cushion (player.js hurt, "Off for a gym leader until slice 8") and the
   leader flinch rule (gym-leader.js applyFlinch, D5). Expect leader damage to drop (power or tempo may need a raise).

## Where we are
- Entity model slices 1 to 7b built. 7a checks green and loop 2 feel test passed. 7b built, checks owed.
- Misty: Zinc 3, hpMult {1: 25, 2: 19}, no enrage, edge unstick. Loop 2 fields Staryu then Seel (dev only).
- No gym authors the team items or Regen yet (7b Q6, tuning later).
- Lint: 0 errors, 69 warnings in inherited code (do not --fix).

## Next
1. 7b checks, then slice 8.
2. A real gym loop counter (loop is dev-set only: G.Gym.debugLoop), so leader teams reach a normal run.
3. Owed feel tests: win a gym, swap before spending the link, spend it on a benched member; slice 1 Elite fight.
Also: delete merged branches; Codex menu with tooltips.

## Watch
- Quick cannot run node: Jess runs every check after a Quick build. After ANY code edit, re-check every
  mutate runner's patterns against the edited files (the edge unstick left one STALE, caught a slice later).
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- Smokes over http (smoke-ui, smoke-newcombat) fail about 1 run in 3 with ERR_NO_BUFFER_SPACE; repeat first.
- Rocky Helmet is bugged (body touch only) and rejected on leaders; fix needs its own plan (TODO).
- Bright Powder does nothing on a leader until the AI dodges (slice 10).
- File:// font: Chromium blocks Silver-game.ttf (dev.html line 52); a fix needs a plan.
- `move-sim-mutate` "routing filter ignored" is a real MISS (28/29), older than slice 5.
- GitHub API empty all session: TODO.md board mirror is still from 2026-11-04.

## Open owner decisions
- Board cleanup: close #5 (slice 7a replaced it); stale `blocked` on #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first. Smokes find Playwright via PLAYWRIGHT_DIR, then <user folder>\tools\playwright.
