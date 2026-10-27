# Slice 4c: motion extras

Back to slice-overview.md. Prior slice: slice-4b.md. Next: slice-4d.md.

## Objective
The motions and lifetimes that need more than static or straight travel: returns, orbits, repositions, delay and falls, aimTrack. Path curve, oscillate and turnRate already exist from 3c; their moves are verified here.

## Split (Jess, 2026-10-27): three sub-slices, each signed off before the next
- **4c-1 persistence:** deep-freeze G.MoveDefs (I2) and the review 2.4 validator rules first, then R7 persistent upkeep, orbits, Fire Spin, Leaf Storm, Night Shade, orbit radius lens.
- **4c-2 returns and repositions:** R1, R2, R9 for repositions, Razor Leaf, Bonemerang, Quick Attack, Aerial Ace, knockback `direction: travel`.
- **4c-3 the rest:** delay and falls, aimTrack, Psychic, Confusion, Bubble Beam, Rock Slide, Aura Sphere.

## Decisions
- Psychic stays a filled wedge that grows from 0.5 to 2.0 rad, travels and steers (cast target while it lives, then the nearest enemy). No band thickness, no grammar change. (Jess, 2026-10-27, after first asking for an arc.)
- Aura Sphere reach (about 160 px by the curve math) is fine, verify only.
- Bonemerang return-leg knockback pulls enemies toward the caster (the back leg's travel direction). The pull is clamped so an enemy never ends past the caster's edge.
- Quick Attack i-frames cover the whole dash (F5). Orbit squash is rendering only. Location pick defaults to a random enemy within range.
- Orbit radius scales with the lens (D36), like the orbiting shapes' own radius.
- Night Shade (S3) arrives in 4c-1 as a persistent static circle; flat level damage with no target cap is a balance-pass item.
- Rock Slide stays one boulder in 4c (S11); String Shot shot spacing goes to the feel issue and 4d (S7 double application stays); Gust spread still open before 4d.
- All ten review 2.4 validator rules and the G.MoveDefs deep-freeze go first, in 4c-1. Rules already covered by the existing list are not duplicated; any data that violates a rule is listed before it is fixed.

- 4c-2 (Jess, 2026-10-27): landing point is the target enemy's centre (no stand-off); i-frames cover the whole dash plus a 0.3 s tail; the swept dash holds walking through the existing mvRoot flag (no player.js edit); Razor Leaf joins 4c-2 as a routed move and an R2 fixture. The pierce budget resets per leg. Quick Attack hits one enemy at the arrival point (Q3), unlike the legacy dash.
- 4c-3 (Jess, 2026-10-27): aimTrack is implemented now and changes Flamethrower (the data already says it tracks); the aimTrack target rule is sticky (the cast target while it lives and is in range, then the nearest, re-picked whenever lost); the Rock Slide telegraph is a low-opacity ring. The scout found aimTrack, location targeting, delay and falls were not implemented in the sim.
- Handoffs: slice-4c-1-codehandoff.md, slice-4c-2-codehandoff.md and slice-4c-3-codehandoff.md are written, to be built by the coding chat in that order.

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
Bonemerang, Fire Spin, Leaf Storm, Quick Attack, Aerial Ace, Rock Slide, Psychic, Aura Sphere, Bubble Beam, Confusion, plus Night Shade.

## Tests
R1: Quick Attack ends at its origin and exactly one enemy is damaged once. R2: a two-leg move gives exactly 2 hits per enemy per leg (Razor Leaf is not in the canary list, so run it on Bonemerang plus a synthetic move). R7: instance count is 1 while active, 0 after a swap, 1 after swapping back, 0 while stunned. R9: no cast when every enemy is beyond range. Aerial Ace lands within range. Rock Slide hits only after its delay. Validation 2.5 scenario 1 (decoy enemy on the path takes no hit) and scenario 2 (two hits per enemy per bone, both bones end by `returned`). Scenario 5 stays the wedge version. Fire Spin applies the trap root from 4a to an enemy. Bonemerang back-leg pull is clamped at the caster's edge. Freeze: writing to a MoveDef throws or fails the harness.

## Proceed when
Harness green and the moves play behind the flag, per sub-slice.
