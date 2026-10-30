# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-30 morning (Quick, work machine; slice 4d built and signed off).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Move schema: slices 1 to 4d signed off. 4d (emitters with all five triggers incl. termination, contact mines, the instance cap of 8) routed Discharge, Gust, Fairy Wind, Toxic, Flame Wheel, Toxic Spikes, Will-O-Wisp, Meteor Mash, Spikes: 62 of 63 (Hail in 7b). All nine feel-tested OK and batch-reviewed; tuning goes to slice 6. Results in slice-4d.md.
- Rulings today: D-GUST (3 shots at once, 0.5 rad fan), D-LOC (Spikes, Toxic Spikes, Will-O-Wisp at the caster's feet), Will-O-Wisp shot range 300, termination bursts on natural ends incl. offScreen, never on ownerDeath, notActive or cap. All in MOVE-INTENT / combat-architecture D29.
- Tests: check.js green (Jess, work machine), new move-emit harness, move-emit-mutate 25/25. Mutation runners are NOT run by check.js (it only picks up *harness*.js); run them by hand.
- Quick (work machine) cannot run Node: Jess runs every check there. Home review of 4d skipped by Jess.
- Branch end (Jess, 2026-10-28): merge into main after slice 7b.

## Open owner decisions
- Psychic widening [Open] (MOVE-INTENT psychic): keep or retune in slice 6.
- D-MC5 (5). D-ENEMY, D-COOP (7a). D-HAIL (7b). Quick Attack priority [Open] (TODO Backlog).
- Spikes on an owner faint: deferred to the MP phase (TODO).

## Docs and code still differ (approved, not built)
- In this branch: QA-11 formula (5); legacy Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b).
- Own branches: QA-08 run loop; boss doc reorganization (Q1, QA-06); DoT on base HP for elites; Shedinja.

## Next (in order)
1. Jess commits and pushes 4d (if not done).
2. Slice 5: rule D-MC5, then plan it (targeted read first, per-move prose plan with files and spots, tests section naming every new file).
3. Log the animation sync issue to the board (TODO line 60). #15 String Shot spacing waits for the slice 6 balance pass. Loose end: gym-harness failed once, not reproducible.

## Model use (Jess, 2026-10-29)
Medium effort throughout. Sonnet for plain routing, the simulator CLI, docs and catch-ups; Opus for new runtime (5, D-ENEMY, 7b); Haiku for searches.

## Board note
- API fetch failed at the 10-30 wrap-up; verified unchanged at 10-30 5:29 AM. 15 issues, 13 open, same drift as before (#4 closed but still a blocker, #3 likely closable, #5/#9/#10 `blocked` with no link, four `needs-triage`).

Rules: CLAUDE.md.
