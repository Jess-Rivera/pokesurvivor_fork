# 2026-11-19: #155 run.hud.playerActive.bar is one B2 bar for HP and EXP; EXP leaves the portrait ring; HP numbers outside, centred, current HP held still (Jess)

- One bar: the healthBar and expBar sets fold into run.hud.playerActive.bar, built from B2's EXP version of the dark HP
  bar. One holder, the HP track on top, a thin two-row EXP strip under it. Stretched to the life meter's 231 art pixels.
- EXP moves off the portrait ring onto the strip, so the portrait loses its ring.
- Labels: the HP tab at the left end; HP and EXP in upright Silver 10px with a one-pixel ink outline, drawn into the holder.
- HP numbers stay outside the bar, centred on it, Silver 20 (the Pokemon tier). The current HP holds still: it sits in a
  box as wide as the max's digits, right-aligned, so only a new max (a level-up) moves the slash or the max.
- Not taken: the numbers inside the holder (no room at 20 px).
- Applied at #126 (js/ui/hud-player-panel.js hpText, the ring). Board: tools/library/hud-exp-draft.js, hud-health-draft.js.

Canonical: js/ui/hud-player-panel.js header and docs/HUD-STYLE.md, once #126 applies it; until then this file.
