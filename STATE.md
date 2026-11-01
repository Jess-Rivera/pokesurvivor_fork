# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-31 late night (Claude Code, home; 7a UI readers built, not yet committed or feel-tested).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Slices 5 and 6 DONE. Stress run still owed before the merge. 7a-0 (a2c0cf1, 120d4ce) and 7a slot 1 (bc24717) committed.
- 7a UI readers BUILT, uncommitted (picks 1c, 2a, 3a, 4a; DECISIONS 2026-10-31). New js/ui/move-info.js (G.MoveInfo); icons, menus, level-up cards, HUD, sheet, stats.moveCat and player.js read the resolved def. 7a guard (tools/kind-guard.js) in check.js; 14 legacy-7b lines left for 7b. Play changes and badge changes: slice-7a.md Results.
- Tests: check.js 34/34, I1 and 7a guards ok; ui-readers harness 119 and mutate 20/20; tools/smoke-ui.js (both flags) and smoke-newcombat all passed.
- docs/GYM-ROSTERS.md had an uncommitted edit at session start (not from this session).

## Next (in order)
1. Jess feel-tests the UI readers (cards, icons, pause sheet, Life Orb, melee moves) and commits.
2. 7a "Proceed when": a run that reaches Brock.
3. Docs sweep (GDD, GLOSSARY, ONBOARDING rift/judgment lines and move-info.js, GYM-ROSTERS, SIM-PRESENT-BOUNDARY, README).
4. Board cleanup on GitHub (TODO mirror; #15 can close).

## Open owner decisions
- Commit A side effects to confirm (slice-7a.md Results).
- [Open] loop 2+: do a gym's mons share stat raises (TODO). Enemy-owned riders on the player (TODO, gym-roster branch).
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. D-HAIL, D-BUBBLE (7b). Quick Attack priority [Open].

## Docs and code still differ (approved, not built)
- Legacy TEAM_LIVE, ROLL_GAP, procSelf, Fire Spin strip/burnHalf and E1 (7b); the legacy-7b lines (7b). Multi-mon arena (Loop 2+): gym-arena.js single bossId and spawn point, gym.js per-def enrage clock. Gym AI Tier 2 (own branch). Branch end: merge into main after 7b, then ESLint + Prettier (#17).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime (D-ENEMY, 7b).
