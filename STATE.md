# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-10-31 morning (Quick, work machine; slice 5a closed, committed and pushed).

## Where we are
- Branch feature-test/new-move-schema. Live plan: docs/current feature planning/move-schema-post-auth/slice-overview.md.
- Slice 5a DONE (2026-10-31): stat stage trackers on the new path (COMBAT-RULES SS1 to SS13, combat-architecture:H26); maxStacks and stat duration retired (validator rejects both); the 4 pure buffs cast on their Gate, no cd. check.js green, mutation runners green, Jess feel-tested. Detail: slice-5-handoff.md.
- Aqua Ring is a persistent heal aura (MOVE-INTENT aqua-ring, 2026-10-31): 1/16 max HP every 2 s while active, ends on slot swap, stun, Pokemon swap or faint; no cd.
- Kept (Jess): a tracker drops its whole stack at once when its Duration runs out (SS5).
- Debug: `G.Debug.newcombat('id', 'id', ...)` loads any routed moves one per slot; sets `stages`, `drops`.
- No save impact (stages are run state).

## Next (in order)
1. Batch re-review sign-off (move-intent-scenarios.json `batchReviewed`): Shadow Ball, Flash Cannon, Psychic, Mud Shot, Bulldoze, Bubble Beam. Use newcombat('drops').
2. If not run since the retargets: persist, sim and motion mutate runners (expect no "DID NOT APPLY").
3. New build chat: slice 5b (team-wide cards), from slice-5-handoff.md and the 5b map. Ask at its plan: build Delay Down and Recoil Down (1 move each) or defer; working card names OK; Count Up and Pierce Up caps as placeholders.

## Open owner decisions
- Bond tax [Proposed] (Bond branch). [Open] stage-manipulation moves, raises on foes, whole-field moves.
- HUD gap (proposed): own Atk/Def/SpA/SpD drops show only as a fading popup and the dev overlay. TODO Backlog.
- Psychic widening [Open] (slice 6). D-ENEMY, D-COOP (7a). D-HAIL, D-BUBBLE (7b). Quick Attack priority [Open].
- Board cleanup: #16 labels; #2/#3 scope; blocked labels with no linked blocker (#5, #9, #10). TODO mirror last synced 10-29 (API fetch failed today).

## Docs and code still differ (approved, not built)
- This branch: team cards incl. the Gate and Duration cards (5b); legacy TEAM_LIVE, ROLL_GAP, procSelf, Fire Spin strip/burnHalf and E1 (7b); QA-13 Brock fallback (7a, 7b). Branch end: merge into main after 7b.

## Model use (Jess, 2026-10-29)
Medium effort throughout. Sonnet for routing, simulator CLI, docs, catch-ups; Opus for new runtime (5b, D-ENEMY, 7b); Haiku for searches.

Rules: CLAUDE.md.
