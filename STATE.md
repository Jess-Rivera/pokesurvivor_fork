# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-30 night (home, Claude Code; design session, docs only).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Move schema: slices 1 to 4d signed off, 62 of 63 routed (Hail in 7b).
- Stat stage model APPROVED (COMBAT-RULES "Stat stages" SS1 to SS13; runtime combat-architecture:H26). Tonight SS8 gained: a pure buff casts only while its group is active (a solo buff = charge, then swap) and a swap-in cast waits while its Gate runs.
- Slice 5 fully planned: 5a trackers, then 5b team-wide cards (5b needs the 5a trackers). 5b card list ruled by axis: General, Space, Delivery, Payload (5b map section 3). Build handoff: move-schema-post-auth/slice-5-handoff.md.
- No game code or js/data touched today; check.js not needed.
- Branch end (Jess, 2026-10-28): merge into main after slice 7b.

## Open owner decisions
- Bond tax [Proposed] (Bond branch): 0.5 x Gate x chance on every move in the group, only for changes that help their side. Open: team or base Gate, several taxing moves, persistent moves.
- [Open] in COMBAT-RULES "Stat stages": stage-manipulation moves, raises on foes, whole-field moves.
- 5b, asked at its plan: build Delay Down and Recoil Down (1 move each) or defer; working card names.
- Future (TODO Backlog): New Move learning rework (learnsets; combined screen or move bank); run identity; Dodge Cooldown card.
- Psychic widening [Open] (slice 6). D-ENEMY, D-COOP (7a). D-HAIL, D-BUBBLE (7b). Quick Attack priority [Open].

## Docs and code still differ (approved, not built)
- In this branch: stat stage model and team cards (5); legacy TEAM_LIVE, ROLL_GAP, procSelf, Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b).
- Own branches: QA-08 run loop; boss doc reorganization; DoT on base HP for elites; Shedinja.

## Next (in order)
1. Jess commits and pushes tonight's docs.
2. Build chat (Opus): slice 5a, then 5b, from slice-5-handoff.md.
3. Board cleanup: #16 labels; #2/#3 scope; blocked labels with no linked blocker (#5, #9, #10). #15 waits for slice 6.

## Model use (Jess, 2026-10-29)
Medium effort throughout. Sonnet for plain routing, the simulator CLI, docs and catch-ups; Opus for new runtime (5, D-ENEMY, 7b, the stat stage model build); Haiku for searches.

Rules: CLAUDE.md.
