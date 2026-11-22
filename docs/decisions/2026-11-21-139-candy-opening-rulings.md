---
title: "#139 opening: S8 split in three, candy drop rules, candy by hand (Jess)"
date: 2026-11-21
issues: [139]
area: engine
canonical: "docs/AI Outputs/Issue-139/139 - Candy and Evolution Slice Opening.md, then spec section 6 once built."
---
# 2026-11-21: #139 opening: S8 split in three, candy drop rules, candy by hand (Jess)

- S8 splits into 8a candy (drops, the meter), 8b evolve (table, Team menu Evolve, ready popup, branch pick, copy-data
  and random rules), 8c in-run flags (friendship, party member, in-run feats, knows a move). Each opens and closes
  like a slice.
- SUPERSEDED by 2026-11-21-139-oor-level-candy-sources-friendship-model (CD1, CD3, F0, F1). History below.
- CD1 (superseded): Exp Candy by gym order: gyms 1 and 2 an S (800 XP), 3 and 4 an M (3,000), 5 and 6 an L (10,000), 7 and 8
  an XL (30,000).
- CD2: later loops multiply the drop by the loop number.
- CD3 (superseded: gyms, UberElites and elites, a rarity drop): gyms only for now.
- CD4: candy cannot be given to a copy past its final evolution's XP.
- D5: candy goes into a bag on the save; the player gives it to a chosen copy in the Team menu.
- D6: stones as gym drops get their own #128 child issue (not 8c).
- D7: the meter and later Evolve go on today's Team menu (js/ui/menu-team-copies.js), new pieces built as library
  pieces (decision 2026-11-21-unify-work-builds-final-building-blocks).
- D8: an evolution with no level in mainline (131: friendship, stones, trade, most babies) uses its normal
  requirement only, with no candy. Candy applies only to evolutions that have a level. This narrows A6 ("every
  evolution keeps its mainline requirement on top of candy") to the level-based evolutions.
- F0 and F1 (superseded: friendship is the 0 to 255 field, see 2026-11-21-139-oor-level-candy-sources-friendship-model): friendship minutes are CUMULATIVE: saved on the copy, added across runs, never reset. Supersedes T5's "in one
  run" (decision 2026-11-12). Totals are scaled to about one full clear: 45 min at base_happiness 70, inverse to
  the base, capped at 90 (Cleffa and Chansey 22.5, Snom 63, Buneary 90). Being on the team still counts (T5c).
  The rest (F2 to F8): docs/AI Outputs/Issue-139/139 - Friendship Minutes Deep Dive.md.

Canonical: docs/AI Outputs/Issue-139/139 - Candy and Evolution Slice Opening.md, then spec section 6 once built.
