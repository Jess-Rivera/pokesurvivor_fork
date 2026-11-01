# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-31 late night (Claude Code, home; 7a done, docs sweep done, sweep not yet committed).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Slices 5, 6 and 7a DONE. Stress run still owed before the merge. 7a commits: a2c0cf1, 120d4ce (7a-0), bc24717 (slot 1), e6465d4 (UI readers). Proceed when met: feel test passed, a run reached Brock (Jess).
- 7a guard (tools/kind-guard.js) in check.js; 14 legacy-7b lines are 7b's work list. Play and badge changes: slice-7a.md Results.
- Docs sweep done: GDD, GLOSSARY, ONBOARDING, README, GYM-ROSTERS, SIM-PRESENT-BOUNDARY, TODO (rift items closed). Uncommitted.
- Tests: check.js 34/34, I1 and 7a guards ok; tools/smoke-ui.js and smoke-newcombat all passed.

## Next (in order)
1. Jess commits the sweep.
2. Board cleanup on GitHub (TODO mirror; #15 can close; #1 gym gate still draws the rift prop).
3. Slice 7b plan (flip, purge, merge). Blocking: D-HAIL, D-BUBBLE. Owed: the slice 6 stress run.

## Open owner decisions
- Commit A side effects to confirm (slice-7a.md Results).
- D-HAIL, D-BUBBLE (7b). [Open] loop 2+: do a gym's mons share stat raises (TODO). Enemy-owned riders on the player (TODO, gym-roster branch).
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. Quick Attack priority [Open].

## Docs and code still differ (approved, not built)
- Legacy TEAM_LIVE, ROLL_GAP, procSelf, Fire Spin strip/burnHalf and E1 (7b); the legacy-7b lines (7b). Multi-mon arena (Loop 2+): gym-arena.js single bossId and spawn point, gym.js per-def enrage clock. Gym AI Tier 2 (own branch). Branch end: merge into main after 7b, then ESLint + Prettier (#17).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime (D-ENEMY, 7b).
