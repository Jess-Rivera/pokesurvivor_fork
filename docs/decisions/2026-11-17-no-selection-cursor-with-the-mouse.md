---
title: "no selection cursor with the mouse; none on search bars (Jess)"
date: 2026-11-17
issues: []
area: ui
canonical: "js/ui/gacha-ui.js header and cornersIf; js/ui/hud-kit.js \"the input mode\" comment."
---
# 2026-11-17: no selection cursor with the mouse; none on search bars (Jess)

- Using the mouse, the selection cursor's corners show nowhere. The button under the mouse shows its own green (focus) rim.
  This replaces the mouse half of 2026-11-16-selection-cursor-follows-the-device-in-use (corners under the mouse); the
  keys half stands: a key press brings the corners back on the last item.
- A search bar never takes the corners. When the keys' cursor reaches one, the bar shows its focus green rim; Enter
  starts typing, Enter or Esc gives the keys back.
- Going up, a grid's search bar comes only after its top row (a row scrolled out of sight above comes first).
- Built in the Main Menu Shop (#149c); other cursor screens follow with the UI unification (#126).

Canonical: js/ui/gacha-ui.js header and cornersIf; js/ui/hud-kit.js "the input mode" comment.
