# Slice 7: flip and purge (PLACEHOLDER, detail at start)

Back to slice-overview.md. Prior slice: slice-6.md.
Make the new path the only path: remove the `?newcombat` routing and the legacy player-move code in combat.js, purge forgotten moves (Bubble), patch notes in js/data/changelog.js. G.Combat keeps whatever still serves enemy shots and contact damage.
Readers to migrate: combat.js, enemy.js boss casts (read kind, cd, cat, radius, arc), kinds.js, mechanics.js, icons.js, levelup.js, gyms.js (BOSS_FORMS, Moves.BY_ID, instance, addStack), gym.js, menu.js. Enemy and gym-leader use of the new definitions is not covered by any earlier slice.
Also: the DMG_SCALAR text correction is handled in the DECISIONS log conversion (B8); the rule lives in docs/COMBAT-RULES.md "Damage" (current value: see js/core/stats.js). The Checkpoint 1 to 3 decisions do not move into DECISIONS.md: they live in docs/MOVE-AXIS-SCHEMA.md (grammar), docs/current feature planning/combat-architecture.md section H and D (runtime rules), docs/MOVE-INTENT.md (per-move rulings), docs/COMBAT-RULES.md (combat rules).

## Decided (QA-13, Q18, 2026-10-28) [Approved]
Slice 7 does not implement option (a). After slice 7 the gym is Brock only (once or every time, whichever is simpler to build). Option (a) (pending import of supporting moves) and the other gyms get their own branch. The "option (a)" here is unrelated to the gym cadence "Option A".

## Decision homes and conflicts
Decisions for the move system live in the documents named above. Conflicts and gaps (B4a conflict list, approved at CP3):
- Gap: this slice is named as the removing slice for several [Legacy behavior] items, but its scope above lists none of them: Fire Spin `strip` and `burnHalf` (js/data/moves.js:61), the E1 carrier rules, the legacy "duration / cooldown is the cap" (js/systems/stages.js:17), and the legacy `norm` factor. Rules and legacy notes: docs/COMBAT-RULES.md and docs/MOVE-INTENT.md fire-spin. Resolve when the slice is detailed at start.
