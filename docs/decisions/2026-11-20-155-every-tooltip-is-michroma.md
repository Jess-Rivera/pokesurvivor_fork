---
title: "#155 every tooltip is Michroma, the game talking, whatever it is about (Jess)"
date: 2026-11-20
issues: [155]
area: ui
canonical: "docs/HUD-STYLE.md \"Fonts\"."
---
# 2026-11-20: #155 every tooltip is Michroma, the game talking, whatever it is about (Jess)

- Every hover tooltip (items, moves, stats, Run Stats, Cards Taken) is in Michroma (`HudModule`): the name at 20 px, the
  white text at 12 px, lines 16 px apart (Jess, the same day; 10 was tried first). A tooltip is always the game talking. Move and stat tooltips leave the Pokemon tier (Silver), where the 2026-11-18 scheme put them.
- Amends 2026-11-18-155-font-scheme-three-tiers for tooltips only; the rest of the scheme stands.
- To check at #126: Michroma is wider than Silver, but the text at 12 px fits more per line in the 558 px detail tooltip than
  Silver 20 does; readability at 12 on the scaled screens is the feel test (the board's Tooltip page).
- Applied at #126. Board: tools/library/tooltip-draft.js, the Fonts page's rows.

Canonical: docs/HUD-STYLE.md "Fonts".
