# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-07 late, Quick (work machine). Branch: feature/entity-model.

## START HERE (next session, either tool)
1. Run the owed checks (none run yet; Quick has no node): `node tools/check.js`, then the mutate runners in
   docs/proposals/: leader-items, leader-team, leader-stats (slice 7b), and leader-slots, gym-leader,
   player-entity (slice 8). Paste any FAIL, MISSED or STALE line.
2. Run `node docs/proposals/leader-dps-report.js` (a report, never fails): it prints Misty's slice 7 vs slice 8
   output at 60, 160, 250 px. That number decides slice 8 Q10 (a tempo or power raise, or none).
3. Feel test: `G.Debug.gym()` to Misty, then `G.Gym.debugLoop = 2`. Does she read as a player switching moves?
4. Then plan slice 9 (voluntary swaps) from docs/proposals/host-model-plan.md.

## Where we are
- Entity model slices 1 to 8 built. 7a checks green and feel test passed. 7b and 8 built, checks owed.
- Slice 8 (map: docs/ASCII Concept Maps/Entity Model Slice 8 - Leader Slot Choice.txt): one slot per move line,
  one active slot under your 0.4 s hold, stay unless 1.5x, buff and heal visits, authored bonds, your melee
  cushion and your flinch rule on leaders. Old brain (gyms 2 to 8) untouched.
- Misty: Zinc 3, hpMult {1: 25, 2: 19}, no enrage, no bonds. Loop 2: Staryu then Seel (dev only).
- Lint: 0 errors, 69 warnings in inherited code (do not --fix).

## Next
1. Checks + DPS report + feel test above, then slice 9.
2. A real gym loop counter (loop is dev-set only: G.Gym.debugLoop).
3. Owed feel tests: win a gym, swap before spending the link, spend it on a benched member; slice 1 Elite fight.
Also: delete merged branches; Codex menu.

## Watch
- Quick cannot run node. After ANY code edit, re-check mutate patterns against the edited files (slice 8: none STALE).
- Keep new code within Prettier's 120 columns, or a format pass makes mutation patterns STALE.
- http smokes fail ~1 run in 3 (ERR_NO_BUFFER_SPACE); repeat first.
- Rocky Helmet bugged (body touch only), rejected on leaders; fix needs its own plan (TODO).
- Bright Powder does nothing on a leader until the AI dodges (slice 10).
- File:// font: Chromium blocks Silver-game.ttf (dev.html line 52); a fix needs a plan.
- `move-sim-mutate` "routing filter ignored" is a real MISS (28/29), older than slice 5.
- GitHub API empty again this session: TODO.md board mirror is still from 2026-11-04.

## Open owner decisions
- Board cleanup: close #5 (slice 7a replaced it); stale `blocked` on #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first. Smokes find Playwright via PLAYWRIGHT_DIR, then <user folder>\tools\playwright.
