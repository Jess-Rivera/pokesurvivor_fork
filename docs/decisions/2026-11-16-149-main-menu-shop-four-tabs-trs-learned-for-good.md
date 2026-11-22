---
title: "#149 is the Main Menu Shop, four tabs; a TR bought there is learned for good and sold by the Move Trainer (Jess)"
date: 2026-11-16
issues: [149]
area: ui
canonical: "that plan until 149f lands; then js/systems/shops.js header (Trainer pool) and the TR module's header."
---
# 2026-11-16: #149 is the Main Menu Shop, four tabs; a TR bought there is learned for good and sold by the Move Trainer (Jess)

- #149 reworks the Main Menu Shop (scr-gacha, between runs, PokeCoins) and the Inventory screen, from Jess's mockups
  (commit 0ea72871). The in-run Move Trainer and TM Mart screen keeps its look.
- Four tabs on an icon rail: Pokeballs, Character Upgrades, Team Items, TRs. The Pokeballs tab is drawn in #149; #137 wires
  ball and belt buying. rework/shop merges into feature/128-acquisition before #137 starts.
- TRs: the Shop sells every TM; "Able to Learn" is the Pokemon's TM compatibility. A TR teaches a Pokebox Pokemon the move
  for good. In a run that move joins the Pokemon's Move Trainer pool (random, like its level-up and egg moves) at Trainer
  prices, not the TM Mart's. TR prices go by move power (temporary bands, tuned with #131).
- Picking a learned TR as the starting move is a later Team, Upgrade purchase (own issue, deferred).
- Build order: 149a shell, b Character Upgrades, c Team Items, d Inventory, e Pokeballs layout, f TRs.

Plan: docs/AI Outputs/Issue-149/149 - Shop Rework Opening.md.
Canonical: that plan until 149f lands; then js/systems/shops.js header (Trainer pool) and the TR module's header.
