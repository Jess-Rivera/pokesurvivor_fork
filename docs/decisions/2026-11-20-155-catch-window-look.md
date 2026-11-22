---
title: "#155 catch.window: the catch screen's look on the board (Jess)"
date: 2026-11-20
issues: [155]
area: ui
canonical: "this file until #126 applies it; then docs/HUD-STYLE.md \"Catch screen\"."
---
# 2026-11-20: #155 catch.window: the catch screen's look on the board (Jess)

- The window panel.clean, 1020 x 424 px (2026-11-20-155-catch-result-is-a-toast-and-the-window-is-shorter).
- The Pokemon being caught: panel.pixel in its types with the two-type rim (first type left, second right, the
  middle 25% dithered, as run.hud.teamSlot), a plain grey.raised body. The flee ring is portrait.round's ring at
  160 px: the first type's dark over grey.paper, one step per miss. "{Nature} {Name}" and the ball line in Silver 30,
  the catch band in Silver 40.
- The belts are main.shop.pokeball's: panel.pixel in color.pocketPokeBalls (not bought: the fainted grey ramp), six
  52 px wells, the number in Michroma 16. The selected ball's well takes the pocket's dark inside its light ring; the
  numbered belt shows its keys 1 to 6 in Silver 20.
- Pokemon owned: panel.clean with the cards' grey.raised body, 48 px portrait.round faces at rest, cursor.bar, the
  tooltip beside the window.
- Throw (Positive) and Let It Go (Negative) are button.glitch at 54 px; the Let It Go ask is modal.dialog
  (2026-11-20-155-catch-let-it-go-ask-opens-on-keep-trying). The result is a toast.
- Board: tools/library/catch-draft.js. Applied at #126.

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md "Catch screen".
