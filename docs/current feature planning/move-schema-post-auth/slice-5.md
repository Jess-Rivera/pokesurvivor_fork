# Slice 5: upgrades from fields and the self-buff formula

Back to slice-overview.md. Prior: slice-4d.md. Next: slice-6.md.

## Objective
Upgrade cards work on new-path moves. Until this slice new-path moves ignore cards. Closes the QA-11 code gap.

## Rules (owners)
- Effective definition per slot: architecture D4, I2, C2 (G.MoveDefs never mutated; a fresh fold per slot when its stacks change).
- Upgradeable keys come from each move's own fields minus `cardLock` (MOVE-AXIS-SCHEMA top-level fields); a pierce card is never offered on an UNLIMITED-pierce or shapeless move (architecture F, "Other interactions").
- Lens and size: architecture D36. The parked "size upgrade on a pierce-0 point" item (MOVE-AXIS-SCHEMA "Parked decisions") is revisited here, by feel.
- Self-buff cap: COMBAT-RULES "Stat stages and maxStacks" (QA-11, Q15 formula; Q13 invariant; A.3-3 authored floor is [Proposed], not built). MOVE-INTENT dragon-dance is a per-move exception to Q13 with a floor of 1.
- No normalization: architecture D37, H8.

## Blocking decision (D-MC5)
The formula min(floor(duration / cooldown), 6) gives Metal Claw (duration 6, cd 0.5) a cap of 6 and Meteor Mash (6, 1.75) a cap of 3, but MOVE-INTENT rules both at maxStacks 1. Candidate readings: (a) the formula applies only once duration or cooldown upgrades change the ratio, and the base cap stays the authored 1; (b) the formula always applies to self-buffs, and the MOVE-INTENT rulings for Metal Claw and Meteor Mash are per-move exceptions that cap them at 1. The answer goes into COMBAT-RULES or MOVE-INTENT.

## Scope
Replace the kinds.js per-kind key table for new-path moves with field-derived keys; map card keys to schema paths; levelup.js and the card pool offer only valid cards per move; the self-buff cap uses the formula (per D-MC5) and never breaks the Dragon Dance floor. Legacy moves keep kinds.js until 7b removes it.

## Tests
Same stacks give the same effective definition in any order; G.MoveDefs unchanged after upgrades; cardLock fields never change; no pierce card on UNLIMITED or shapeless moves; Dragon Dance cap stays at least 1; the cap follows the formula after duration and cooldown cards; all earlier harnesses green.

## Proceed when
Harness green, check.js green, Jess plays a full run on the flag with upgrades.

## Results
(not started)
