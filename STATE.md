# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-30 evening (Quick, work machine; design session, docs only).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Move schema: slices 1 to 4d signed off, 62 of 63 routed (Hail in 7b).
- Stat stage model APPROVED today: rules COMBAT-RULES "Stat stages" SS1 to SS13; runtime combat-architecture:H26; MOVE-INTENT rulings rewritten for bug-buzz, dragon-dance, ice-beam, leaf-storm, meteor-mash, metal-claw, string-shot. Proposal file is now history. Retired: maxStacks, the stat `duration` field, Q13, Q14, Q15/QA-11, D-FOECAP, D-LEAF, D-MC5.
- Strong hosts follow the model (SS13, STRONG_HOST_GATE_MUL 1): Brock's Harden reaches +6 in about 30 s instead of a few seconds.
- Built in slice 5 on this branch (Jess), not its own branch. Slice 5 is unblocked.
- No game code or js/data touched today; check.js not needed. Quick cannot run Node: Jess runs every check here.
- Branch end (Jess, 2026-10-28): merge into main after slice 7b.

## Open owner decisions
- [Open] in COMBAT-RULES "Stat stages": Bond tax (Bond branch), stage-manipulation moves, raises on foes and whole-field moves.
- Slice 5 rulings (Jess, today): retired fields removed after the harness passes, then the validator rejects them; cards go team-wide in 5b (team-wide branch folded in, Gate and Duration cards included); gym Harden goes to 7a; SLOW and HASTE stay outside the model (7b keeps their timed application).
- Psychic widening [Open] (slice 6). D-ENEMY, D-COOP (7a). D-HAIL (7b). Quick Attack priority [Open].
- Spikes on an owner faint: deferred to the MP phase.

## Docs and code still differ (approved, not built)
- In this branch: stat stage model (5); legacy TEAM_LIVE, ROLL_GAP, procSelf, Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b).
- Own branches: QA-08 run loop; boss doc reorganization; DoT on base HP for elites; Shedinja.

## Next (in order)
1. Jess commits and pushes today's docs.
2. Build slice 5a, then 5b, in a build chat: start from move-schema-post-auth/slice-5-handoff.md. Both maps ruled 2026-10-30 (home): 5b card list by axis (General, Space, Delivery, Payload); SS8 active-group and swap-in rules; Bond tax shape (Bond branch).
3. Board cleanup: #16 labels; #2/#3 scope; blocked labels with no linked blocker (#5, #9, #10). #15 waits for slice 6.

## Model use (Jess, 2026-10-29)
Medium effort throughout. Sonnet for plain routing, the simulator CLI, docs and catch-ups; Opus for new runtime (5, D-ENEMY, 7b, the stat stage model build); Haiku for searches.

Rules: CLAUDE.md.
