# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-31 evening (Claude Code, home; 7a-0 commit B "GymBrain split" BUILT, feel test passed, awaiting Jess's commit).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Slices 5 and 6 DONE. Stress run still owed before the merge.
- 7a decisions made (DECISIONS 2026-10-31): D-ENEMY (a), D-COOP no co-op work, boss AI split option B, gyms only, D1 to D3.
- 7a-0 commit A committed (a2c0cf1). Commit B BUILT: js/entities/boss-ai.js (G.Boss, GymBrain); enemy.js only delegates; gym-arena.js spawns via G.Boss.make. Seeded old-vs-new trace identical. Results: slice-7a.md.
- Tests on node: check.js 32/32 harnesses (new boss-split, 24 checks); boss-split mutate 6/6, gyms-only 6/6, move-riders 22/22; headless Brock fight green on both flags.
- Feel test passed (Jess). Two stale tool checks updated to the Quick rulings: move_parity expects Gust cd 0.7, smoke-newcombat expects the Aqua Ring aura (1/16 every 2 s). check.js all green, smoke all passed.

## Next (in order)
1. Jess: commit B.
2. Docs sweep (GDD, BOSS-REWORK, GLOSSARY, ONBOARDING rift/judgment lines, GYM-ROSTERS, SIM-PRESENT-BOUNDARY, BALANCE, README, combat-architecture).
3. 7a slot-1 enemy-owner plan: six decisions open (cone reach, cooldowns, riders, Harden timing, contact move, wind-up). Casts land in GymBrain. Then the UI readers.
4. Board cleanup on GitHub (TODO mirror; #15 can close).

## Open owner decisions
- Commit A side effects to confirm (slice-7a.md Results): the 'arenas' achievement removed; arena HUD label reads GYM; admin run-review warning now English.
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. D-HAIL, D-BUBBLE (7b). Quick Attack priority [Open].

## Docs and code still differ (approved, not built)
- Sheet move rows on the folded def (slice 7); legacy TEAM_LIVE, ROLL_GAP, procSelf, Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b). Multi-mon arena (Loop 2+): gym-arena.js single bossId and spawn point, gym.js per-def enrage clock. Branch end: merge into main after 7b, then ESLint + Prettier (#17).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime (D-ENEMY, 7b).
