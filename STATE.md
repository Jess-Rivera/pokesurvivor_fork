# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-31 late morning (Quick, work machine; slice 5b parts A and B built, NOT yet run on Jess's machine).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Slice 5b (team-wide cards) in progress. Build plan: docs/ASCII Concept Maps/Slice 5b - Build Plan.txt (section 7 = order). Status and data facts: slice-5-handoff.md "5b parts A and B status". Rulings: slice-5.md "Plan rulings".
- Built (A, B): js/systems/team-cards.js (G.TeamCards: one store per run, card field maps, lazy from-scratch rebuild, one copy per move id); move-sim.js and move-render.js read the team copy; a live orbit/aura restarts on a pick that changes it, keeping its heal clock and orb angle, with no recast. Cards cannot be picked in game yet (part E), so nothing to feel-test.
- Tests: docs/proposals/team-cards-harness.js (90) and team-cards-mutate.js (30). Green only in Quick's sandbox (bundled, no node CLI).

## Next (in order)
1. Jess: `node tools/check.js` and `node docs/proposals/team-cards-mutate.js`. Commit only if both are green.
2. New build chat: 5b parts C to G in one pass, one stop at the end. C Gate Reduction / Duration Increase (stages.js, move-effects.js); D HP Regen (bench only) and Vitamins (team value read in incOf); E level-up offer and pick (levelup.js, run-ui.js); F team sheet bonus block (sheet.js); G debug set newcombat('cards') + G.Debug.cards. Add harness rows and mutations per part.
3. Then Jess plays a full run on ?dev&newcombat with upgrades (slice 5 proceed rule).

## Open owner decisions
- Bond tax [Proposed] (Bond branch). [Open] stage-manipulation moves, raises on foes, whole-field moves.
- HUD gap (proposed): own stat drops show only as a popup and the dev overlay. TODO Backlog.
- Psychic widening [Open] (slice 6). D-ENEMY, D-COOP (7a). D-HAIL, D-BUBBLE (7b). Quick Attack priority [Open].
- Board cleanup: #2 ready while #3 still blocks it; #16 no area label; blocked labels with no link (#5, #9, #10). TODO mirror last synced 10-29 (API empty at wrap-up 10-31).

## Docs and code still differ (approved, not built)
- This branch: 5b parts C to G; legacy TEAM_LIVE, ROLL_GAP, procSelf, Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b). Branch end: merge into main after 7b, then ESLint + Prettier (DECISIONS 2026-10-31).

## Model use (Jess, 2026-10-29)
Medium effort throughout. Sonnet for routing, simulator CLI, docs, catch-ups; Opus for new runtime (5b, D-ENEMY, 7b); Haiku for searches.

Rules: CLAUDE.md.
