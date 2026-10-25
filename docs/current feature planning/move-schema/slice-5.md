# Slice 5: upgrades (PLACEHOLDER)

Back to slice-overview.md. Prior slice: slice-4.md.
Replace the kinds.js per-kind key table with upgradeable keys derived from each move's own fields, minus cardLock (4 moves). Biggest consumer change from dropping kind. A pierce upgrade is meaningless on an unlimited-pierce move, so the derived keys should skip it. Upgrades apply on top of the resolver's base-normalized damage.
