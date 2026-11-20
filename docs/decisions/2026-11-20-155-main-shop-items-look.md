# 2026-11-20: #155 main.shop.items: the Team Items tab's look on the board (Jess)

- Sale cards carry the Pokeballs card over (2026-11-20-155-main-shop-pokeball-look): card.vertical on panel.shopCard,
  the ball card's places, 256 px tall (the longest line, 5 lines of 12 px, clears the Buy), a 140 x 36 Buy with a 14 px
  label. Each card shows its item's own art (its icon's cell in the item sheet) at 2x. Owned items leave the grid.
- The owned panel is panel.clean with a grey.raised body (the cards' body) and a grey.slate edge; its squares keep
  grey.panel (square.clean 60 px, owned: the teal edge; empty: the locked 30%), as the pockets' slots do.
- Unchanged from today's places: both searches (field.text), scroll.bar, the owned tooltip below its square, and
  Inventory (Neutral, 192 px) left of Exit.
- Board: tools/library/shop-draft.js (SHOP.itemCard, itemsPane, ownedPanel). Applied at #126.

Canonical: this file until #126 applies it; then the shop's spec section.
