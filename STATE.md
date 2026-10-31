# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-31 morning (Quick, work machine; slice 5a pass 1 built, pass 2 written).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Slice 5a pass 1 BUILT and verified: stat stage trackers (COMBAT-RULES SS1 to SS13, combat-architecture:H26) on the new path. check.js 28/28; stat-stage-mutate 11/11, riders 23/23, selfcast 35/35; Jess feel-tested in game, stages behave as expected. Status and file list: slice-5-handoff.md "5a pass 1 status".
- Kept (Jess, 10-31): a tracker drops its whole stack at once when its Duration runs out (SS5), no step-down.
- New debug: `G.Debug.newcombat('id', 'id', ...)` loads any routed moves one per slot; sets `stages` and `drops` (the 6 batch-review moves).
- No save impact (stages are run state).

## Still open in 5a (small, before 5b)
1. Pass 2 WRITTEN 10-31 (maxStacks and stat duration removed; validator rejects both; the 4 buff cds gone, buffs cast on their Gate). Jess: export_moves.js, then check.js.
2. Aqua Ring: look at it before closing 5a (Jess, 10-31). Today: cd 8 override ("no cd set yet"), heal over time, not a pure buff, not on the trackers.
3. Batch re-review sign-off in move-intent-scenarios.json `batchReviewed`: Shadow Ball, Flash Cannon, Psychic, Mud Shot, Bulldoze, Bubble Beam. Use newcombat('drops').
4. Re-run persist, sim and motion mutate runners once (4 retargeted patterns).

## Next (in order)
1. Jess commits and pushes today's work.
2. Items 1 to 4 above.
3. New build chat: slice 5b (team-wide cards), from slice-5-handoff.md and the 5b map. Ask at its plan: build Delay Down and Recoil Down (1 move each) or defer; working card names OK; Count Up and Pierce Up caps as placeholders.

## Open owner decisions
- Bond tax [Proposed] (Bond branch). [Open] stage-manipulation moves, raises on foes, whole-field moves.
- HUD gap (proposed, not approved): own Atk/Def/SpA/SpD drops show only as a fading popup (and the dev overlay); idea is a line per drop in the HUD status list. TODO Backlog.
- Psychic widening [Open] (slice 6). D-ENEMY, D-COOP (7a). D-HAIL, D-BUBBLE (7b). Quick Attack priority [Open].
- Board cleanup: #16 labels; #2/#3 scope; blocked labels with no linked blocker (#5, #9, #10). Board API fetch failed at wrap-up; TODO mirror last synced 10-29.

## Docs and code still differ (approved, not built)
- This branch: team cards (5b); legacy TEAM_LIVE, ROLL_GAP, procSelf, Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b). Branch end: merge into main after 7b.

## Model use (Jess, 2026-10-29)
Medium effort throughout. Sonnet for routing, simulator CLI, docs, catch-ups; Opus for new runtime (5b, D-ENEMY, 7b); Haiku for searches.

Rules: CLAUDE.md.
