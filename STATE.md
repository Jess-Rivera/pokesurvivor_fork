# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-01 (Claude Code, home; 7a done, sweep committed, board cleaned).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Slices 5, 6 and 7a DONE. Stress run still owed before the merge. 7a commits: a2c0cf1, 120d4ce (7a-0), bc24717 (slot 1), e6465d4 (UI readers). Proceed when met: feel test passed, a run reached Brock (Jess).
- 7a guard (tools/kind-guard.js) in check.js; 14 legacy-7b lines are 7b's work list. Play and badge changes: slice-7a.md Results.
- Docs sweep done: GDD, GLOSSARY, ONBOARDING, README, GYM-ROSTERS, SIM-PRESENT-BOUNDARY, TODO (rift items closed). Uncommitted.
- Tests: check.js 34/34, I1 and 7a guards ok; tools/smoke-ui.js and smoke-newcombat all passed.

## Next (in order)
1. Sweep committed (dfa5c9b). Board cleaned (Jess, 2026-10-31): #15 closed; In progress = #1, #6, #17.
2. Slice 7b in three steps (slice-7b.md "Steps"). 7b-1 flip BUILT, uncommitted; owed: Jess's run to Brock and the stress run with no flag. Then 7b-2 purge, 7b-3 merge.
   Unblocked. D-HAIL resolved (Hail pulled, old saves get Water Gun). D-BUBBLE resolved (retire Bubble, starters get Water Gun). Slice 6 stress run done (Jess; Quick did not log it).

## Open owner decisions
- Commit A side effects to confirm (slice-7a.md Results).
- [Open] loop 2+: do a gym's mons share stat raises (TODO). Enemy-owned riders on the player (TODO, gym-roster branch).
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. Quick Attack priority [Open].

## Docs and code still differ (approved, not built)
- Legacy TEAM_LIVE, ROLL_GAP, procSelf, Fire Spin strip/burnHalf and E1 (7b); the legacy-7b lines (7b). Multi-mon arena (Loop 2+): gym-arena.js single bossId and spawn point, gym.js per-def enrage clock. Gym AI Tier 2 (own branch). Branch end: merge into main after 7b, then ESLint + Prettier (#17).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime (D-ENEMY, 7b).
