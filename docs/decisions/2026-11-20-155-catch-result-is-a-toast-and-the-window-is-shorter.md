# 2026-11-20: #155 catch screen: the result is a toast, and the window is shorter (Jess)

- The throw's result leaves the Pokemon panel and becomes a G.UI.toast: "Gotcha! ... was caught!" as good news (teal
  edge), "Oh no! It broke free.", "... broke free and ran off!" and "Out of Poke Balls! ... ran off." as bad news
  (red edge). Changes the game: today catch-ui.js writes them into the panel's note line in the Lv yellow.
- With no result line and the flee ring at 160 px (today 192), the window is only as tall as a belt: 980 x 424 (today
  980 x 500; it was 1020 wide until the cursor ring, see 2026-11-20-155-cursor-ring-for-round-pieces-and-no-blink); the Pokemon panel 384 tall, Pokemon owned 244 tall (it scrolls), Throw and
  Let It Go at the bottom right.
- The belts are 84 px wide, 12 px apart (main.shop.pokeball's; the cursor ring fits their padding).
- Pokemon owned spaces its 48 px faces 20 px apart across (16 down), so the cursor ring clears the next face's.
- The Let It Go ask lies over every piece of the window (on the board it was drawn under them).
- Board: tools/library/catch-draft.js. Applied at #126; the toast's Unified look (panel.clean, teal or red edge, an ink
  outline) is drawn here first and has no board page of its own yet.

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md "Catch screen".
