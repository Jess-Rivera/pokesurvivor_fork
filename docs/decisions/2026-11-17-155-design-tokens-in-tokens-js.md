# 2026-11-17: #155 the UI's design tokens live in one JS data file, type colours included (Jess)

- The UI library defines the look and the game follows it (#155). Its tokens (colour palettes, fonts, the page's z-index
  layers), each with a name, value and job, live in js/ui/lib/tokens/tokens.js, not a theme.css: the pixel-art buttons
  get their colours in code, so one data file feeds both code and CSS (it writes the CSS variables itself).
- The 18 type colours move into the tokens (Jess's call over keeping them in util.js); util.js reads them from there, so
  tokens.js loads first everywhere util.js does (dev.html, the tools and every harness).
- Names: type names say what a piece is (button.menu); place names say where it is used, screen.panel.part in camelCase
  (pause.pokemonDetail.portrait, run.hud.portrait, main.shop.pokeball).
- The board is tools/library.html (Jess's mockup assets/excalidraw/pokeswarm-library-html.excalidraw): it loads only the
  library's files and draws pieces with placeholder data. It replaces tools/ui-library.html once it covers it.

Canonical: js/ui/lib/tokens/tokens.js header; docs/HUD-STYLE.md "Type colours". Plan: docs/ASCII Concept Maps/155 - UI Library v2 Build Plan.md.
