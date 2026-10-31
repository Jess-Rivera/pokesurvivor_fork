# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-31 17:30 (Quick, work machine; 7a-0 commit A "gyms only" BUILT, awaiting Jess's node run, feel test and commit).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Slices 5 and 6 DONE (6 closed at batch 2; Quick Attack and Aerial Ace moved to a later fun pass, TODO Backlog). Stress run still owed before the merge.
- 7a decisions made (DECISIONS 2026-10-31): D-ENEMY (a) enemy owner on G.MoveSim, roster sets boss numbers, Brock slot 1 only; D-COOP no co-op work; boss AI split = option B (body plus brain); gyms only, D1 to D3 settled.
- 7a-0 commit A BUILT (not committed): rifts, legendary fights, Arceus's Judgment and the old boss AI removed; the gym arena is js/systems/gym-arena.js (G.GymArena). Plan: docs/ASCII Concept Maps/Slice 7a-0 - Gyms Only Plan.txt. Results: slice-7a.md.
- Tests in Quick's sandbox: 29/30 harnesses green (items-f3d2 and move-geom need real node), gyms-only mutate 6/6, move-riders mutate 22/22. Not yet run on node.

## Next (in order)
1. Jess: node tools/check.js and node docs/proposals/gyms-only-mutate.js and node docs/proposals/move-riders-mutate.js; feel test (Brock via G.Debug.gym() on ?dev and ?dev&newcombat, goals screen, gacha); then commit A.
2. 7a-0 commit B: GymBrain split into js/entities/boss-ai.js (no behavior change), then the docs sweep (GDD, BOSS-REWORK, GLOSSARY, ONBOARDING, GYM-ROSTERS, SIM-PRESENT-BOUNDARY, BALANCE, README, combat-architecture).
3. 7a slot-1 enemy-owner plan: six decisions open (cone reach, cooldowns, riders, Harden timing, contact move, wind-up). Then the UI readers.
4. Board cleanup on GitHub (TODO mirror; #15 can close).

## Open owner decisions
- Commit A side effects to confirm (slice-7a.md Results): the 'arenas' achievement removed with the rift ones; arena HUD label reads GYM; admin run-review warning now English.
- Bond tax [Proposed]. [Open] stage-manipulation moves, raises on foes, whole-field moves. HUD own-drop gap (proposed). Psychic widening [Open]. D-HAIL, D-BUBBLE (7b). Quick Attack priority [Open].

## Docs and code still differ (approved, not built)
- Sheet move rows on the folded def (slice 7); legacy TEAM_LIVE, ROLL_GAP, procSelf, Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b). Branch end: merge into main after 7b, then ESLint + Prettier (#17).

Rules: CLAUDE.md. Model use: Sonnet for routing, docs, catch-ups; Opus for new runtime (D-ENEMY, 7b).
