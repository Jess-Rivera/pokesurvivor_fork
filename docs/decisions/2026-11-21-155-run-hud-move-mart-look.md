---
title: "#155 run.hud.moveMart: the Move Trainer, stacked; approved (Jess)"
date: 2026-11-21
issues: [155]
area: ui
canonical: "this file until #126 applies it; then docs/HUD-STYLE.md \"Move Shop\"."
---
# 2026-11-21: #155 run.hud.moveMart: the Move Trainer, stacked; approved (Jess)

- Stacked, not mirrored: the team on top, the chosen Pokemon's four offers below, Reroll and Leave bottom right. Replaces
  the 2026-11-20 mirrored layout for the Move Trainer only; the TR Mart is still open.
- Team rows: run.hud.teamSlot's panel.pixel box in the first type (two-type seam), 6 art rows taller (76 px) so
  cursor.ring clears the rim; portrait.round, the name in Silver 20 and the chip.type chips (1 px scale) under it. No
  HP bar, key, held item, status chip or swap shade. The chosen one is selected with cursor.ring.
- Offers: card.vertical on panel.shopCard (the Team Items card), the move's type glyph in the move slot's well, its name
  and line. No Buy button: picking the card is the buy; the price is the Silver coin and number in the button's place.
- Reroll Positive, Leave Neutral (button.glitch). The window is as wide as the team grid.
- Board: tools/library/run-shops-draft.js. Applied at #126.

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md "Move Shop".
