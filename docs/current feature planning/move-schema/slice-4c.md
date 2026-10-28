# Slice 4c: motion extras

Back to slice-overview.md. Prior slice: slice-4b.md. Next: slice-4d.md.

## Objective
The motions and lifetimes that need more than static or straight travel: returns, orbits, repositions, delay and falls, aimTrack. Path curve, oscillate and turnRate already exist from 3c; their moves are verified here.

## Split (Jess, 2026-10-27): three sub-slices, each signed off before the next
- **4c-1 persistence:** deep-freeze G.MoveDefs (I2) and the review 2.4 validator rules first, then R7 persistent upkeep, orbits, Fire Spin, Leaf Storm, Night Shade, orbit radius lens.
- **4c-2 returns and repositions:** R1, R2, R9 for repositions, Razor Leaf, Bonemerang, Quick Attack, Aerial Ace, knockback `direction: travel`.
- **4c-3 the rest:** delay and falls, aimTrack, Psychic, Confusion, Bubble Beam, Rock Slide, Aura Sphere.

## Decisions (moved)
Decisions formerly listed here (answered by Jess, 2026-10-27, and since reconciled) now live in docs/MOVE-AXIS-SCHEMA.md (grammar), docs/current feature planning/combat-architecture.md section H and D (runtime rules), docs/MOVE-INTENT.md (per-move rulings), docs/COMBAT-RULES.md (combat rules). The removed text is preserved verbatim in temp-audit-outputs/phase-4-ledger.md (B4b rows). Build steps are unchanged (Q23).

Conflicts with the owning documents (B4a conflict list, approved at CP3). Resolve these when the slice is built; do not follow the old text where it conflicts:
- slice-4c.md "Reads": "Review section 9.1 rows Q2, Q3, Q8, Q17" points at text that is now history. Read instead: combat-architecture F R1, R2 and H1; MOVE-INTENT quick-attack and rock-slide; MOVE-AXIS-SCHEMA `range` and `delay`.

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
