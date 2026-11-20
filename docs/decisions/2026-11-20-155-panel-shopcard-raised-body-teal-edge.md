# 2026-11-20: #155 panel.shopCard: panel.clean with a grey.raised body and a teal.base edge, for every Shop card (Jess)

- New primitive panel.shopCard: panel.clean's shape (1 px edge, square corners, no cut, no bar) with a grey.raised body
  and a color.teal.base edge. Every card on main.shop.pokeball, main.shop.items and main.shop.tms uses it.
- main.shop.character's pockets stay panel.pixel in their pocket ramp, with a plain grey.raised body and no grid (the
  grid on a panel that big is not pleasant).
- For the build: draw the clean panels' 1 px edge as a real CSS border. The board's trick (the edge colour showing
  past an inset body) drops an edge to 0 px under Windows display scaling or browser zoom; seen on the board 2026-11-20.
- Board: tools/library/clean-draft.js (SHOP_CARD_PANEL), shop-draft.js. Applied at #126.

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md (panels).
