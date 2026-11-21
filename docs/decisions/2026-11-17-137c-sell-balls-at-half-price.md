# 2026-11-17: #137c balls sell back at half price; one belt Buy beside Exit (Jess)

- "Sell Pokeball", above Exit on the Shop's Pokeballs tab, sells the ball you are holding (picked up by click or keys,
  or dragged onto it) for half its price, rounded down (Poke 25, Great 75, Ultra 150). One at a time, no question;
  with nothing held it refuses "Pick up a ball first." Its focus rim is red (#ff8a90, #e8202a, #7c1016).
- The belts are bought by one button left of Exit, "Buy Belt <n> <price>", which moves on to the next belt and is gone
  after Belt 3. The belts sit against the pane's right edge, 20 px apart, each numbered on its top-left corner.
- A locked Great or Ultra you can afford keeps its dimmed card but its Unlock button is lit.

Canonical: js/ui/shop-balls.js header; sell share G.BALL_SELL_SHARE in js/data/balls.js. Plan: docs/ASCII Concept Maps/137c - Belts, Sell and Unlock Plan.md.
