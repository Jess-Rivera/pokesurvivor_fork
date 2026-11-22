---
title: "#155 main.shop.character: the Character Upgrades tab's look on the board (Jess)"
date: 2026-11-20
issues: [155]
area: ui
canonical: "this file until #126 applies it; then the shop's spec section."
---
# 2026-11-20: #155 main.shop.character: the Character Upgrades tab's look on the board (Jess)

- Each pocket (Berry Pocket, Team Items Pocket) is panel.pixel in its own Bag pocket ramp (color.pocketBerries,
  color.pocketItems), 260 x 392 px (panel.pixel takes even art sizes; today 390), its body plain grey.raised with no
  grid (2026-11-20-155-panel-shopcard-raised-body-teal-edge).
- Inside, unchanged from today's places: the 2x2 of 56 px square.clean slots (not bought: the locked 30%), a divider,
  the name in teal Michroma 16, the line, one Buy (Full and disabled once every slot is bought).
- The Buy is button.glitch with the transparent rest body (2026-11-20-155-button-glitch-rest-body-is-transparent).
- Board: tools/library/shop-draft.js (SHOP.pocket, shopPocket). Applied at #126.

Canonical: this file until #126 applies it; then the shop's spec section.
