# Implementation evidence (Phase 2)

Selective mapping of documented requirements to implementation and test evidence. This is not a code review. No test or harness was executed in this phase (tools/check.js was deliberately not run because it executes every harness and may write build output). 'Exists' means the file is present; it does not mean the test exercises the requirement.

Legend: documented and implemented / documented, not implemented / implemented, not documented / not verified by tests / contradictory or unknown.

| Requirement | Status | Implementation evidence | Test evidence and gaps | Finding |
|---|---|---|---|---|
| BOSS-REWORK s1: rifts, timed bosses and Arceus Judgment replaced by gyms and elites | Documented and implemented in part | js/systems/judgment.js:34 ENABLED=false; rift.js:27 RANDOM_RIFTS=false; gym.js, elites.js, gyms.js present; BOSS_SLOTS and judgment.js not yet deleted (s5 cleanup deferred) | docs/proposals/gym-harness.js, gym-reward-harness.js, elites-harness.js exist; not executed, contents not inspected | F-001, F-002 |
| BOSS-REWORK s2: elite cadence tied to gym cycles | Documented, implemented as TEMP placeholder | elites.js K.first=120, K.every=360 (TEMP); no G.Gym reference | Elites harness exists; cadence assertion not checked | F-025 |
| BOSS-REWORK 3e: multi-mon gyms, loop N fields N mons at once | Documented, partly implemented | gym.js roster(g) uses G.Gyms.lineup(..., loop, ...); loop is dev-set (debugLoop); real loop counter absent; set-based win condition not verified | gym-harness.js exists; coverage not inspected | F-004 |
| Gym gate escalation: GRACE 37 s, ESC_STEP 10 s, uncapped (DECISIONS:18, BALANCE:223-227) | Documented and implemented (values match) | gym.js:17 GRACE=37, ESC_STEP=10; gym.js:12 FIRST_AT=240, GAP=240; ASCII Gym Flow.txt:9 FIRST_AT=240 | Board issue #6 'Harness for the gym-gate escalation clock/bump' is listed open in TODO.md mirror: possible verification gap (board not inspected) | (PQ-03 NOT_A_CONFLICT) |
| DMG_SCALAR value | Documented value conflicts with code | stats.js:79 DMG_SCALAR=1.0; DECISIONS.md:101 says 2.0; BALANCE.md final state 1.0 | None specific | F-009 |
| HP_SCALAR = 2.0 (DECISIONS:100) | Documented and implemented | stats.js:17 HP_SCALAR=2.0 | None specific | (PQ-03 NOT_A_CONFLICT) |
| Move grammar: hitPolicy, repositionMode, returnToOrigin, returnHits (MOVE-AXIS-SCHEMA, DECISIONS 2026-10-24, architecture R1/R2) | Documented and implemented (fields match) | move-attributes.js:73, 168, 175, cross-field rules at 144-150 | tools/validate_moves.js and check.js exist; not executed | F-008 |
| Move tunables RANGE 420, INSTANCE_CAP 8 (review Q8, slice-overview) | Documented and implemented as constants | move-resolver.js:19 TUNING { RANGE: 420, INSTANCE_CAP: 8 }; INSTANCE_CAP read by the executor in slice 4d (not built) | None for INSTANCE_CAP (slice 4d) | (PQ-03 NOT_A_CONFLICT) |
| Slice 4a riders on hit | Documented and implemented | Riders in move-effects.js; trap roots enemies (per slice-overview) | move-riders-harness.js, move-riders-mutate.js exist; not executed | F-010 |
| Slice 4b self-casts, specials, sequential chains | Documented and implemented, with a documented stub | move-effects.js:143-147 executors for statusBonus, chainDamageFalloff, setWeather; berrySteal is a stub (move-handler.js:5) | move-selfcast-harness.js, move-selfcast-mutate.js exist; not executed | F-010 |
| Slice 4c motion extras: aimTrack, location targeting, delay, falls | Documented in schema and architecture, not implemented (planned) | No aimTrack, delay or falls match in move-sim.js or move-effects.js (grep); STATE.md scout finding says grammar only | Not applicable until slice 4c | (planned work, not a defect) |
| fix/attack-calc slices 1, 2, 3a+3b, 3c and Upgrade rework slices 1 to 2d recorded as APPLIED in DECISIONS | Documented as applied; corroborated by git commits only | Commits b1a4048, 5257eea, 4eace39, 3c32bc6, 6254cd2, 0f64991, bca831d, e071cb2, 923b63f, 24f676f; combat.js:23-26 implements the swap rule referenced to DECISIONS 2026-10-18 | Behavior not re-tested; tests not executed | F-011 |
| Run via dev.html; index.html, js/app.min.js, version.json gitignored (DECISIONS 2026-10-17) | Documented and implemented | Files absent from working tree; dev.html and tools/build.js present | n/a | F-017 |

## Verification gaps

- No harness result is available for any requirement above; the existence of harness files is recorded only.
- Implemented but not documented: not systematically searched. Phase 1 and Phase 2 started from documents, so undocumented code behavior is out of scope.
- Gym escalation clock and bump: the board lists a harness issue (#6) as open; whether gym-harness.js already covers it was not inspected.
- Elite and gym harness assertions were not read, so no claim is made that they verify BOSS-REWORK rules.
- Move-schema equations D1 to D37 and the R1 to R9 rule table were not compared with code (large documents).