# 2026-11-19: #155 run.hud.playerActive.area lines up on the move slots: one stack gap upward, the item's gap sideways (Jess)

- The bar's left and right pixels line up with the move slots' outer edges; the chip bands start at the slots' left
  edge too.
- One 8 px gap stacks the column: the slots' top, the bar's lowest pixel (the EXP plate), the bar's top, the bad
  band, the good band.
- The left side mirrors the right: the portrait (88 px, no ring) sits the held item's 12 px off the slots, centred on
  their height; Lv 12 px left of it (Silver 40 number on the slots' bottom, Silver 20 label 8 px over it); Silver 8 px
  over the portrait, right edges flush.
- Not a composite matter: the chip bands' reserved empty line (a behavior change; #126 if wanted).
- Open: the active portrait's stroke for a two-type Pokemon (first type, as the elite circle, or split, as the catch
  screen). Today the board uses the type by hand.
- Applied at #126. Board: tools/library/hud-area-draft.js.

Canonical: js/ui/hud-player-panel.js header and docs/HUD-STYLE.md, once #126 applies it; until then this file.
