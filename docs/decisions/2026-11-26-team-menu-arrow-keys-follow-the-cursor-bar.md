---
title: "Team menu arrow keys follow the cursor bar: slot buttons, then the slot, then the grid (Jess)"
date: 2026-11-26
issues: [97]
area: ui
canonical: "js/ui/menu-window-kit.js stepFocus and js/ui/menu-team-slots.js"
---
# 2026-11-26, Team menu arrow keys follow the cursor bar (Jess)

- [Approved] Left to right reads as the slot's own buttons, then the slot (measured at its right edge, where its
  cursor bar shows), then the Pokebox grid.
- [Approved] Left from a slot lands on its Level Up. Right from a slot's right-most buttons (Level Up on top, the lock
  below) goes back to the slot.

Canonical: js/ui/menu-window-kit.js stepFocus (data-cursor-anchor, data-cursor-left, data-cursor-right) and
js/ui/menu-team-slots.js. Check: tools/smoke-team-menu-keys.js.
