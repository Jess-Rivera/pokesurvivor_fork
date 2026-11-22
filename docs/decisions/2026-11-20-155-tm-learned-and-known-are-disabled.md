---
title: "#155 main.shop.tms: a TM's Learned and Known buttons are disabled, not refused (Jess)"
date: 2026-11-20
issues: [155]
area: ui
canonical: "this file until #126 applies it; then the shop's spec section."
---
# 2026-11-20: #155 main.shop.tms: a TM's Learned and Known buttons are disabled, not refused (Jess)

- On a TM card, Learned (the chosen Pokemon bought it) and Known (its level-up or egg pool has it) show button.glitch
  disabled: grey.slate text, no focus swipe, no press. Only a Buy you cannot afford refuses (shakes, says why).
- Changes the game: today js/ui/shop-tms.js lets both refuse with a toast ("Already learned.", "Already in its Move
  Trainer pool."). At #126 those two buttons become disabled and drop out of the cursor's stops (the Shop's cursor
  only stops on buttons you can press).
- Risk: Known loses its explaining toast; its label alone has to carry it. A tooltip on the card can carry the
  reason later if playtests show it is unclear.
- Board: tools/library/shop-draft.js (SHOP_TMS). Applied at #126.

Canonical: this file until #126 applies it; then the shop's spec section.
