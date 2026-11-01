# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-31 night (Claude Code, home; 7a slot-1 enemy owner BUILT, awaiting Jess's feel test and commit).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Slices 5 and 6 DONE. Stress run still owed before the merge. 7a-0 commits A and B are in (a2c0cf1, 120d4ce).
- 7a slot-1 BUILT (uncommitted): Brock's Geodude plays like the player (DECISIONS 2026-10-31, D-ENEMY amendment): player size, moves cast through G.MoveSim, own cards (Damage 3, Count 2, Velocity 3, Area 2), tells with locked aim, Harden on its Gate (+6 in about 30 s), Tier 1 movement. Results: slice-7a.md.
- Tests: check.js 33/33; boss-owner harness 89 checks, mutate 29/29; boss-split mutate 6/6; headless Brock fight green on both flags.

## Next (in order)
1. Jess: feel test Brock (dev.html?dev and ?dev&newcombat), then commit. Watch: x4 Defense from 30 s, 377 px/s rocks, Tackle/Rock Throw alternating up close.
2. 7a UI readers (icons, menu, levelup off `kind`), then the 7a search guard.
3. Docs sweep (GDD, GLOSSARY, ONBOARDING rift/judgment lines, GYM-ROSTERS, SIM-PRESENT-BOUNDARY, README).
4. Board cleanup on GitHub (TODO mirror; #15 can close).

## Open owner decisions
- Commit A side effects to confirm (slice-7a.md Results).
- [Open] loop 2+: do a gym's mons share stat raises (TODO). Enemy-owned riders on the player (TODO, gym-roster branch).
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. D-HAIL, D-BUBBLE (7b). Quick Attack priority [Open].

## Docs and code still differ (approved, not built)
- Sheet move rows on the folded def (slice 7); legacy TEAM_LIVE, ROLL_GAP, procSelf, Fire Spin strip/burnHalf and E1 (7b). Multi-mon arena (Loop 2+): gym-arena.js single bossId and spawn point, gym.js per-def enrage clock. Gym AI Tier 2 (own branch). Branch end: merge into main after 7b, then ESLint + Prettier (#17).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime (D-ENEMY, 7b).
