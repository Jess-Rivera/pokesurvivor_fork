# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-31 noon (Quick, work machine; slice 5b parts A to G built, node checks green on Jess's machine).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Slice 5b (team-wide cards) BUILT, parts A to G. Plans: docs/ASCII Concept Maps/Slice 5b - Build Plan.txt and Slice 5b - Parts C to G Plan.txt. Status: slice-5-handoff.md "5b parts C to G status".
- On ?dev&newcombat level-ups offer only team cards and new moves; Vitamins picks a stat on the card screen; the team sheet has a Run Cards tab. Debug: newcombat('cards'), G.Debug.cards(id, n).
- 2-buff learn limit on the new path: self-only buffs (DECISIONS 2026-10-31).
- Tests: check.js, team-cards-mutate (61), stat-stage, move-sim, move-persist and move-selfcast mutate all green on node (Jess, 2026-10-31).

## Next (in order)
1. Jess feel-tests 5b: dev.html?dev&newcombat, a full run with upgrades (slice 5 proceed rule); then newcombat('stages') with G.Debug.cards('gate', 3), and cards('regen', 5) while swapping.
2. Feel verdicts close 5b (handoff + DEVLOG). Then slice 6 (tuning: card steps, caps, family weights, HP Regen rate).
3. Board cleanup on GitHub (TODO mirror lists the inconsistencies).

## Open owner decisions
- Bond tax [Proposed] (Bond branch). [Open] stage-manipulation moves, raises on foes, whole-field moves.
- HUD gap (proposed): own stat drops show only as a popup and the dev overlay. TODO Backlog.
- Psychic widening [Open] (slice 6). D-ENEMY, D-COOP (7a). D-HAIL, D-BUBBLE (7b). Quick Attack priority [Open].

## Docs and code still differ (approved, not built)
- This branch: sheet move rows on the folded def (deferred to slice 7, TODO); legacy TEAM_LIVE, ROLL_GAP, procSelf, Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b). Branch end: merge into main after 7b, then ESLint + Prettier (#17).

## Model use (Jess, 2026-10-29)
Medium effort throughout. Sonnet for routing, simulator CLI, docs, catch-ups; Opus for new runtime (5b, D-ENEMY, 7b); Haiku for searches.

Rules: CLAUDE.md.
