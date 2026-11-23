---
title: "#97 upgrade redesign: per-copy upgrades in the Upgrade tab, account-wide ones in Character Upgrades; the four flat stat upgrades and Wisdom go (Jess)"
date: 2026-11-23
issues: [97, 95, 150]
area: engine
canonical: "docs/AI Outputs/Issue-97/97 - Upgrade System Design.md until the #97 build lands, then the js/data/upgrades.js header and docs/COMBAT-RULES.md."
---
# 2026-11-23, #97 upgrade redesign (Jess, grilling rounds 1 to 4)

- Purpose: catch-up power and sidegrades. All upgrades cost PokeCoins; numbers are set in #131.
- Per copy (the copy's Upgrade tab): base stat % for all six stats (through G.Stats, carried through evolution),
  Critical Hit (a base crit chance), Reflexes (move cooldowns only), Synthesis (% of max HP per second, ticks on the
  bench), Starting moves (1st buy: change it; 2nd: start with 2). Caps rise with the OOR level; rarer species pay more.
- Account-wide (Character Upgrades): Magnet, Card Reroll, Veto, PokeCoin %, Silver %, Berry Pocket, Team Items Pocket.
- Cut: Vitality, Strength, Carapace, Stride, Wisdom. Mints, Ability Capsules and Bottle Caps are shop items.
- #95: the stat hex's starting band is everything the copy owns before the run. Sidegrades: child issue (97b).

Canonical: docs/AI Outputs/Issue-97/97 - Upgrade System Design.md until the #97 build lands, then the js/data/upgrades.js header and docs/COMBAT-RULES.md.
