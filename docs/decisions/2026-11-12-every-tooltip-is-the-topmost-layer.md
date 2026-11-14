## 2026-11-12, every hover tooltip is the topmost layer; the pause menu draws all of its tooltips in one shared layer (Jess)
Rule: every hover tooltip is the topmost layer of the screen it is on; nothing on that screen may paint over it.
Pause menu (built now): one shared tooltip layer, the HUD kit's TooltipLayer, mounted as the stage's last child at z-index 100. Every tooltip there (Run Inventory items, the held item, the stat hex corners, moves, Run Stats, Cards Taken) is shown and hidden by code into it; none lives in its panel any more. Found when the team cards painted over a move's tooltip. Chosen over a CSS-only lift (raising the hovered panel) because it cannot be broken by a later panel's styling.
Everywhere else (the old team sheet's move tooltips, browser title tips): #102, not built now.
Canonical: docs/HUD-STYLE.md "Fonts" (tooltips); docs/PAUSE-MENU.md section 4.
