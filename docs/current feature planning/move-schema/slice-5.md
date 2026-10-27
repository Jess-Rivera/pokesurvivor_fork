# Slice 5: upgrades (PLACEHOLDER, detail at start)

Back to slice-overview.md. Prior slice: slice-4d.md.
Replace the kinds.js per-kind key table with upgradeable keys derived from each move's own fields, minus cardLock (4 moves). The slot's effective definition is a fresh fold of the shared definition plus the slot's upgrade stacks (D4: (def + sum add) x (1 + sum inc) / (1 + sum rate)); G.MoveDefs itself is never mutated (I2). Card keys map to schema paths. A pierce card is not offered on an UNLIMITED-pierce or shapeless move. Upgrades apply on top of basePower; there is no normalization. Biggest consumer change from dropping kind: levelup.js and the card pool. Until this slice, new-path moves ignore cards.
