# Slice 4c: motion extras

Back to slice-overview.md. Prior slice: slice-4a.md (4b optional first). Next: slice-4d.md.

## Objective
The motions and lifetimes that need more than static or straight travel: returns, orbits, repositions, delay and falls, aimTrack. Path curve, oscillate and turnRate already exist from 3c; their moves are verified here.

## Decisions (default accepted unless Jess changes it)
Psychic is a filled wedge that steers at the cast target while it lives, then the nearest enemy. Quick Attack i-frames cover the whole dash (F5). Orbit squash is rendering only. Location pick defaults to a random enemy within range.
Unowned, settle during planning: Aura Sphere reach (about 160 px by the curve math) and Bonemerang's return-leg knockback pulling toward the caster (review 9.7 item 6).

## Reads
Architecture D23 to D28, F (R1, R2, R7, R8, R9), E (move, upkeepPersistent, eligible, checkEnd). Review section 9.1 rows Q2, Q3, Q8, Q17. Validation 2.5 scenarios 1, 2 and 5.

## Build
- returns with leg-keyed hit records (a turnaround or arrival back starts a new leg with fresh eligibility), the turnaround at `range`, `returned` ending the instance.
- orbits on a true circle, persistent instances: one live instance per slot while the slot is in the active group and the owner is not stunned; swapping away ends it (notActive), swapping back recreates it.
- repositions swept and teleport: distance capped by `range`; swept dash speed is dashMult times the owner's final move speed; pierce exhaustion disarms the hitbox but does not end the instance (R1); returnToOrigin and returnHits; casterState iframes.
- delay and falls: no hitbox until `delivery.delay` ends; telegraph is a render phase.
- aimTrack rotates a static shape's facing toward the nearest enemy.
- Anchor rules R8 and the cast gate rule R9 (range) complete here.

## Canary moves
Bonemerang, Fire Spin, Leaf Storm, Quick Attack, Aerial Ace, Rock Slide, Psychic, Aura Sphere, Bubble Beam, Confusion.

## Tests
R1: Quick Attack ends at its origin and exactly one enemy is damaged once. R2: Razor Leaf gives exactly 2 hits per enemy per leaf, one per leg. R7: instance count is 1 while active, 0 after a swap, 1 after swapping back, 0 while stunned. R9: no cast when every enemy is beyond range. Aerial Ace lands within range. Rock Slide hits only after its delay. Validation 2.5 scenario 1 (decoy enemy on the path takes no hit) and scenario 2 (two hits per enemy per bone, both bones end by `returned`). Fire Spin applies the trap root from 4a to an enemy.

## Proceed when
Harness green and the moves play behind the flag.
