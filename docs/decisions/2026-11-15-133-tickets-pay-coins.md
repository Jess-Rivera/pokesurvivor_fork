---
title: "#133: tickets are retired; every ticket payout becomes coins at 40 per x1 and 400 per x10 (Jess)"
date: 2026-11-15
issues: [133]
area: engine
canonical: "js/data/drops.js (K) and docs/AI Outputs/Issue-133-134/133-134 - Gacha Removal and Starter Pick Opening.md."
---
# 2026-11-15, #133: tickets are retired; every ticket payout becomes coins at 40 per x1 and 400 per x10 (Jess)

- The gacha, its slot machine and the Pokeball and Master Ball tickets are removed. The Shop keeps Team Items and Team Upgrades
  and opens on Team Items; the freed Pokemon tab waits for the ball Shop (#137).
- A ticket payout pays a coin pickup (or mission and achievement coins) worth its exchange rate: x1 = 40 (one pull sold for
  about 38 on average), x10 = 400 (ten pulls, a 4 star guaranteed). One constant in js/data/drops.js (K.ticketCoins, K.ticket10Coins,
  ticketCoins()). Provisional until #97 settles what PokeCoins buy.
- The wild-kill ticket drop (1 in 400) is dropped, not converted. The 100-pulls achievement is removed.
- The Pokebox sources test covered only gacha rules and went with the gacha; the drops test now checks the relations above.
- The rarity names and colours moved from G.Gacha to G.Copies.

Canonical: js/data/drops.js (K) and docs/AI Outputs/Issue-133-134/133-134 - Gacha Removal and Starter Pick Opening.md.
