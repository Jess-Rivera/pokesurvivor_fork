# Slice 5: upgrades (PLACEHOLDER, detail at start)

Back to slice-overview.md. Prior slice: slice-4d.md.

## Decision homes and conflicts
Decisions for the move system live in docs/MOVE-AXIS-SCHEMA.md (grammar), docs/current feature planning/combat-architecture.md section H and D (runtime rules), docs/MOVE-INTENT.md (per-move rulings), docs/COMBAT-RULES.md (combat rules). This slice has no decision section of its own.
Gap (not a contradiction, B4a conflict list, approved at CP3): this placeholder does not mention the QA-11 upgrade formula (self-buff maxStacks = min(floor(duration / cooldown), 6), new path only) or the Q13 invariant (a self-buff's duration is never shorter than its cooldown). Both are in docs/COMBAT-RULES.md "Stat stages and maxStacks". The build needs its own prose plan when the slice starts.
Replace the kinds.js per-kind key table with upgradeable keys derived from each move's own fields, minus cardLock (4 moves). The slot's effective definition is a fresh fold of the shared definition plus the slot's upgrade stacks (D4: (def + sum add) x (1 + sum inc) / (1 + sum rate)); G.MoveDefs itself is never mutated (I2). Card keys map to schema paths. A pierce card is not offered on an UNLIMITED-pierce or shapeless move. Upgrades apply on top of basePower; there is no normalization. Biggest consumer change from dropping kind: levelup.js and the card pool. Until this slice, new-path moves ignore cards.
