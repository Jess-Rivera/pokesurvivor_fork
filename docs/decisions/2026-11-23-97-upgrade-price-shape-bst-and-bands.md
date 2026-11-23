---
title: "#97 upgrade prices: exponential per level, scaled by BST stars, caps open in bands at OOR 1/10/20/40/80 (Jess)"
date: 2026-11-23
issues: [97, 131, 166]
area: engine
canonical: "docs/AI Outputs/Issue-97/97 - Upgrade System Design.md \"Numbers (draft)\" until the #97 build lands, then the js/data/upgrades.js header."
---
# 2026-11-23, #97 upgrade price shape (Jess, in #131)

- [Approved] Per-copy prices grow exponentially per level: the first level or two are cheap, then each costs more.
- [Approved] Every per-copy upgrade, starting moves included, scales with the copy's BST stars (not rarity).
- [Approved] Caps open in bands at OOR 1, 10, 20, 40 and 80, to start with.
- [Approved] Maxing a copy takes many runs; no fixed count, since coins also go to Character Upgrades, shop items, Pokeballs.
- [Proposed] The draft numbers (x1.6 base stat, x2 crit/cooldown/regen, stars / 3 factor); checked against #166 data.
- Pockets start at 1 slot; account-wide prices stay temporary until #166 has data.

Canonical: docs/AI Outputs/Issue-97/97 - Upgrade System Design.md "Numbers (draft)" until the #97 build lands.
