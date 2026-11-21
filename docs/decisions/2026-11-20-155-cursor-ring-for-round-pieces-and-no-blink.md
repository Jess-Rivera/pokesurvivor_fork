# 2026-11-20: #155 cursor.ring for round pieces; neither cursor blinks; the ring plays the CRT (Jess)

- The bar beside a round portrait read as the next face's, so a new piece, cursor.ring, goes around round pieces: 3 px
  thick, 2 px off the rim, yellow.base (reach 5 px). It is on main.shop.pokeball's belt wells, main.shop.tms's
  Pokebox faces and catch.window's belt wells and Pokemon owned faces. The bar stays for squares, cards and slots.
- Neither cursor blinks any more; each is steady at rest and plays the CRT only on a move. The ring's CRT is the bar's
  drawn on a circle: it flattens to a line, then a dot; on, it opens back past full size with one flicker.
- The ring fits the belts' padding, so catch.window's belts go back to 84 px and the window to 980 px wide (the cursor
  bar's room had made them 100 and 1020). The TMs box faces are 60 px, 22 px apart across, 14 down.
- Changes the game at #126 (hud-kit.js CursorCorner and every selection cursor). Board: tools/library/cursor-draft.js,
  cursor-draft.css, catch-draft.js, shop-draft.js.

Canonical: this file until #126 applies it.
