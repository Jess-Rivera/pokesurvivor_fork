---
title: "#138 floater escort and the slice opening rulings (Jess)"
date: 2026-11-21
issues: [138]
area: engine
canonical: "docs/AI Outputs/Issue-128/Acquisition v2 - Spec.txt section 5 (its [Open] build detail is"
---
# 2026-11-21: #138 floater escort and the slice opening rulings (Jess)

- H1: a floating Lost Pokemon (sprites-meta hv, G.Sprites.hovers) escorts with hover movement, like hover enemies.
  Walkers keep ground collision.
- H2: a floater's spawn point and its mark may sit on liquid; walkers keep the free-ground check for both.
- D1: only the liquids that do not hurt count (water, swamp, ice); on a lava, poison or spark map floaters use
  ground like walkers.
- D2: hover skips all collision, walls included, as hover enemies do.
- D3: all five Lost Pokemon lines (lost, follows you, scared off, tired of waiting, brought home) are rewritten in
  English. An owner exception to CLAUDE.md's "leave inherited Spanish keys as-is" for these lines only.
- D4: a recruit counts in the pause menu's "Caught this run" (it is a held catch).
- D5: a Lost Pokemon's star is its pokedex rarity, 1 to 3.
- D6: a recruit's line is "You brought Eevee home! It will join you when the run ends." in place of the thanks line.
- D7: the six lang-en.js keys those lines used are deleted.
- D8: the pool is 324 species on 2026-11-21 (43 floaters), not 309; the test checks the rule, not the count.
- D9: the recruit roll happens at delivery, not at spawn.

Canonical: docs/AI Outputs/Issue-128/Acquisition v2 - Spec.txt section 5 (its [Open] build detail is
answered here) and docs/AI Outputs/Issue-138/138 - Lost Pokemon Slice Opening.md.
