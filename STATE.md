# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-01 (Claude Code, home; 7b-2a committed, 7b-2b built, uncommitted).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md; 7b detail: slice-7b.md "Steps" and "Results".
- Slices 5, 6, 7a DONE. Slice 6 stress run done (Jess; Quick did not log it). Board: #15 closed; In progress #1, #6, #17 (#17 waits for the post-7b merge).
- 7b-1 flip committed (8b7cbb7): new path always on, team cards only, Bubble and Hail retired (G.Moves.RETIRED), starters 393/728 open with Water Gun. Feel test and stress run passed.
- 7b-2a purge committed (496118a), feel test passed: legacy player-move engine, kinds.js, mechanics.js, choose screen and stack badges gone; legacy table archived at docs/move_rework_holding/legacy-moves.js.
- 7b-2b BUILT, uncommitted: ROUTED gone (routed = a def, not retired), legacy stage stacking and the norm factor removed (damage unchanged), E1 and Brock-only verified, guard has no exempt game file, 7b legacy doc lines are history notes.
- Tests: check.js 30/30, guards ok, smoke-ui and smoke-newcombat pass, mutation runners clean (3 stale mutations predate 7b, TODO).

## Next (in order)
1. Jess feel-tests 7b-2b (a run to Brock; buffs, a slow, damage feel), then commits.
2. 7b-3: docs sweep (ONBOARDING, GLOSSARY, GDD still name kinds.js / mechanics.js), changelog, merge into main.

## Open owner decisions
- Commit A side effects to confirm (slice-7a.md Results).
- [Open] loop 2+: do a gym's mons share stat raises (TODO). Enemy-owned riders on the player (TODO, gym-roster branch).
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. Quick Attack priority [Open].

## Docs and code still differ (approved, not built)
- Multi-mon arena (Loop 2+): gym-arena.js single bossId and spawn point, gym.js per-def enrage clock. Gym AI Tier 2 (own branch). js/net/coop.js calls removed legacy hooks (co-op redesign, TODO). Branch end: merge into main after 7b, then ESLint + Prettier (#17).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime (D-ENEMY, 7b).
