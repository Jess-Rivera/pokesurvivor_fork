---
title: "#157 panel.slanted stays as it is, and its only place is the move slot (Jess)"
date: 2026-11-19
issues: [157]
area: ui
canonical: "js/ui/lib/primitives/panel/panel.js header, once #126 applies it; until then this file."
---
# 2026-11-19: #157 panel.slanted stays as it is, and its only place is the move slot (Jess)

- panel.slanted.rest is kept unchanged: today's shape, rim and art pixel. Its one place is run.hud.moveSlot.
- pause.pocketAsk.header leaves it and takes the clean panel, as decision
  2026-11-18-155-pixel-panels-for-one-pokemon-clean-for-the-rest already says.
- Why: ports into the panel.pixel family (its rim, its corner bumps, the card.horizontal outline) all fought the slant
  and read as more complex than the rest of the set; a move slot is one Pokemon's move, so it stays pixel.
- Applied at #126. The board's Panels, Unified tab shows it beside panel.clean, the detail background and panel.pixel.

Canonical: js/ui/lib/primitives/panel/panel.js header, once #126 applies it; until then this file.
