# Slice 4b: self-casts, specials and chains

Back to slice-overview.md. Prior slice: slice-4a.md. Can run before or after slice-4c.

## Objective
Shapeless self casts, the special handlers, and chain hits.

## Decisions (default accepted unless Jess changes it)
Thunderbolt overlap: the targeted enemy starts the chain and other enemies inside the strike circle take the strike but do not branch. Burn and poison count as major ailments for Hex (D13).
Unowned, settle during planning: Hail cd 1.2 against duration 10, and Substitute cd 4 against its 6 s shield (review 9.7 item 6).

## Reads
Architecture D12 to D15, D34, D35, E (special handlers), F (R5). Review section 9.1 rows Q9, Q10. The Substitute worked example in docs/MOVE-AXIS-SCHEMA.md.

## Build
- Self casts: stat with team and individual scope, heal over time, recoil plus shield with formula references (cast.paid, effect.max), setWeather.
- Handlers: fixedDamage (D12), levelDamage (D14), statusBonus (D13, checked per target on every hop), chainDamageFalloff with chains (D15: nearest not-yet-hit enemy within hopRange of the previous hop, constant falloff, rider chance halves per hop). berrySteal stays a stub. An unknown handler name fails at load.
- evalFormula supports multiply and ref only; no eval or Function.

## Canary moves
Swords Dance, Dragon Dance, Aqua Ring, Substitute, Hail, Dragon Rage, Night Shade (as a single pulse until persistence arrives in 4c), Hex, Thunderbolt.

## Tests
Substitute numbers from the schema example. Hex doubles only on a major ailment, on each hop. Thunderbolt with 6 enemies in a line 100 px apart: 5 distinct enemies hit, damage ratios 1 : 0.33 : 0.33 : 0.33 : 0.33, and with a seeded rng over 10,000 casts paralysis frequency per hop within 1 point of 10, 5, 2.5, 1.25 and 0.625 percent. Night Shade equals the owner's level. Hail sets snow.

## Proceed when
Harness green and the moves play behind the flag.
