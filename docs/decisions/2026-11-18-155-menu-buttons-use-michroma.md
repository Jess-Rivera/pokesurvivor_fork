---
title: "#155 the menu buttons use Michroma (HudModule), the game's own UI face (Jess)"
date: 2026-11-18
issues: [155]
area: ui
canonical: "docs/HUD-STYLE.md \"Fonts\", \"Which face for what\"."
---
# 2026-11-18: #155 the menu buttons use Michroma (HudModule), the game's own UI face (Jess)

- The menu buttons (pause menu, End Run, EV screen) are the game talking, not text about a Pokemon, so they take
  Michroma (`HudModule`) under "Which face for what" (2026-11-13). Closes that rule's `[Open]` note.
- Today they draw in `HudText` 30 px. The game changes when #126 applies the font scheme; until then the Fonts board
  (tools/library.html, Tokens, Fonts) shows the change on its Fold Map. The size is picked at that feel test, since
  Michroma is smooth and much wider than the pixel face.

Canonical: docs/HUD-STYLE.md "Fonts", "Which face for what".
