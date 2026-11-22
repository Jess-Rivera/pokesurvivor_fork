---
title: "#155 button.glitch: the rest body is transparent, so the swipe draws the button (Jess)"
date: 2026-11-20
issues: [155]
area: ui
canonical: "this file until #126 applies it; then docs/HUD-STYLE.md (buttons)."
---
# 2026-11-20: #155 button.glitch: the rest body is transparent, so the swipe draws the button (Jess)

- At rest a button.glitch is its white bar and label only. The body takes the colour of whatever it sits on (the
  window, a dialog, panel.shopCard, a pocket), and the focus swipe is what draws the full button under the cursor.
  It was grey.raised, which matched panel.shopCard and hid the shape there anyway.
- Disabled text goes from grey.ink to grey.slate, so it still shows on grey.panel and stays fainter than refused
  (grey.mid).
- Unchanged: the bar, the focus, refused and cancel looks, the swipe, press, release and the refused shake.
- Every button.glitch, every screen. Feel test: with the mouse, a button's full size only shows on hover.
- Board: tools/library/glitch-draft.js (GLITCH_REST, GLITCH_DISABLED). Applied at #126.

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md (buttons).
