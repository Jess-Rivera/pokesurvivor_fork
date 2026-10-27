# Slice 7: flip and purge (PLACEHOLDER, detail at start)

Back to slice-overview.md. Prior slice: slice-6.md.
Make the new path the only path: remove the `?newcombat` routing and the legacy player-move code in combat.js, purge forgotten moves (Bubble), patch notes in js/data/changelog.js. G.Combat keeps whatever still serves enemy shots and contact damage.
Readers to migrate: combat.js, enemy.js boss casts (read kind, cd, cat, radius, arc), kinds.js, mechanics.js, icons.js, levelup.js, gyms.js (BOSS_FORMS, Moves.BY_ID, instance, addStack), gym.js, menu.js. Enemy and gym-leader use of the new definitions is not covered by any earlier slice.
Also: correct the DMG_SCALAR text in DECISIONS (code is 1.0) and move the Checkpoint 1 to 3 decisions into DECISIONS.md.
