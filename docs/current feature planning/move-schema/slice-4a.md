# Slice 4a: riders on hit

Back to slice-overview.md. Prior slice: slice-3d.md. Next: slice-4b.md or slice-4c.md.

## Objective
The payload effects that ride on a damaging hit: ailment, flinch, knockback, crit, heal from dealt, and stat on foes.

## Before starting (Jess)
D-2: maxStacks for Leaf Storm (recommend 1, matching the legacy hold at -2) and Metal Claw (a small cap, no number yet). Required before this slice.

## Reads
Architecture D10, D30 to D34, E (move-effects table), F (R5 hook only). Review section 9.1 rows Q4, Q5, Q12, Q14. Search status.js (apply, trap handling for non-player hosts), stages.js (add, teamAdd, ladder, src-tagged applications), Enemy.hurt.

## Build
- move-effects.js appliers, one per effect type. Chance is percent divided by 100 in this one place. Every eligible hit rolls its riders (no 0.5 s roll gap). Hit chance halving per chain hop is a hook here, used by 4b.
- Stat effects: schema keys map to stages.js keys in exactly one function (spAtk to spa, spDef to spd, spd to spe). Duration defaults to 6 s. Live applications from one move on one host are capped at maxStacks (default 6); a capped application refreshes that move's oldest. Stage is the clamped sum of live applications; multiplier per D30.
- status.js: trap on a non-player host becomes a root (movement multiplier 0). The existing player-side swap lock must not change.
- stages.js: the per-move live-application cap.
- Knockback direction: from the instance center to the enemy, or along travel when the effect says so. Heal from dealt uses HP actually removed and the Big Root multiplier.

## Canary moves
Body Slam, String Shot, Ice Beam, Bite, Psycho Cut, Giga Drain, Bulldoze. (Fire Spin was named in the architecture here, but it is an orbit and needs 4c, so its trap root is verified there.)

## Tests
Seeded rng proc counts match the chances. The Q4 stage-cap example reproduces exactly: two existing stages plus a maxStacks 1 move reapplied every 3 s with 6 s duration never exceeds 3. Speed versus Sp. Def mapping. A trapped enemy does not move. All existing status and stages harnesses still pass.

## Exclusions
Self-casts, specials, chains.

## Proceed when
Harness green and String Shot, Ice Beam, Mud Shot play correctly behind the flag.
