---
title: "#155 main.shop.pokeball: the Pokeballs tab's look on the board (Jess)"
date: 2026-11-20
issues: [155]
area: ui
canonical: "this file until #126 applies it; then the shop's spec section."
---
# 2026-11-20: #155 main.shop.pokeball: the Pokeballs tab's look on the board (Jess)

- The rail's icons sit 1 px in, touching the window's 1 px edge instead of covering it (every shop tab).
- Cards: 224 px tall (down from 350), their button.glitch sized to the card (140 x 36 px, label 14 px); button.glitch is
  a look at any size, not fixed boxes. Buttons outside the cards keep 54 px; Sell is 204 px so Sell Pokeball fits.
- Balls: today's art (assets/icons/pokeball/balls/, frame 9 flipped on a card, frame 0 in a well, both 2x), not the extras.
- Belts: panel.pixel in color.pocketPokeBalls (not bought: the fainted grey ramp), sized to six 52 px wells 8 px apart,
  the berry pocket's wells (grey.panel; ink ring empty, the pocket's base holding a ball). A ball fills most of its well.
- Belt number: Michroma 16, white with a 1 px ink stroke, on the belt's top-left corner.
- A dimmed card (locked or coming soon) never dims its button: Great's Unlock stays lit, a refused Unlock stays at
  button.glitch's refused look at full strength (refusedFocusPositive under the cursor, the shake on a press).
- button.glitch under the cursor or the mouse draws its rest bar in the focus bar's colour too, so no 1 px sliver of
  the white rest bar shows past the focus bar (board fix in glitch-draft.css; the game's button.glitch needs the same).
- Later the same day: button.glitch's rest body went transparent
  (2026-11-20-155-button-glitch-rest-body-is-transparent), so these buttons show only their bar and label at rest.
- Left to the build: each ball centred on its art's visible box (the art sits 1 art px off its frame's centre); the cards
  scroll in today's scroll box once all 17 balls are listed.
- Board: tools/library/shop-draft.js (SHOP.ballCard, SHOP.belt, SHOP.sell). Applied at #126.

Canonical: this file until #126 applies it; then the shop's spec section.
