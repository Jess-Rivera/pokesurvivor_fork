# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-07, Quick (work machine). Branch: feature/entity-model.

## START HERE (next session, either tool)
Slice 6 (leader stats and cards) is BUILT and closed out. Next is slice 7 (leader team and faint swaps):
plan it from docs/proposals/host-model-plan.md slice 7, then draw its map under docs/ASCII Concept Maps/.
Governing rule: COMBAT-RULES "Host model", LEADER PRINCIPLE (anything a player can have, a leader can have;
every difference hand authored). Slice 6 rules: same section, LEADER STATS, CARDS, ITEMS AND RESTRICTIONS.

## Where we are
- Entity model plan: slices 1 to 6 built and feel-tested. Misty: Zinc 3, hpMult 25, no enrage, old leader
  status values now authored restrictions. Map and as-built reports: Entity Model Slice 6 - Leader Stats and Cards.txt.
- Slice 7 inherits: Regen card on leaders, the team-reading run items (their math reads YOUR roster), shared
  stages (SS13 open question). TODO.md Up next has the line.
- Prettier and ESLint now run on this machine (npm ci done). Lint: 0 errors, 69 warnings in inherited code
  (warn-only by design; do not run --fix).

## Next
1. Plan slice 7.
2. Misty's arena-edge stutter (TODO Up next), still present after slice 6.
3. Owed feel tests: win a gym, swap before spending the link, spend it on a benched member; slice 1 Elite fight.
Also: delete merged branches; Codex menu with tooltips.

## Watch
- Mutation patterns match exact code lines: keep new code within Prettier's 120 columns, or the next format
  pass makes them STALE (happened once this session, 5 re-pointed).
- Smokes over http (smoke-ui, smoke-newcombat) fail about 1 run in 3 with ERR_NO_BUFFER_SPACE; repeat first.
- Rocky Helmet is bugged (fires on body touch only) and rejected on leaders; fix needs its own plan (TODO).
- Bright Powder does nothing on a leader until the AI dodges (slice 10).
- File:// font: Chromium blocks Silver-game.ttf (dev.html line 52); a fix needs a plan.
- `move-sim-mutate` "routing filter ignored" is a real MISS (28/29), older than slice 5.
- GitHub API returned empty all session: TODO.md board mirror is still from 2026-11-04.

## Open owner decisions
- Board cleanup: stale `blocked` on #5 (slice 7 retires it) and #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs click #tap-start first. Smokes find Playwright via PLAYWRIGHT_DIR, then <user folder>\tools\playwright.
