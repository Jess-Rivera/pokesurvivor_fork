# 2026-11-21: #155 run.hud.bondSelection: team rows, then the four move slots in one row, then a Bond ask; approved (Jess)

- The popup after a gym leader is beaten, when the team holds a bond: panel.clean as wide as the run shops, the screen
  dimmed (ink at 60%). Title "Bond moves", the line "Pick a Pokemon, then the moves that will cast together. A bond is
  permanent." in teal.base, a divider.
- The team of six as run.hud.moveMart's rows (3 x 2) with cursor.ring on the face. After a pick the ring jumps to that
  Pokemon's four slots; the other rows dim to 50%. A member that cannot bond (every slot a bond or a skill) is 25% and
  the ring skips it. With only one member able to bond, the team step is skipped.
- The four slots in ONE row (Jess, feel pass 1), drawn as run.hud.forgetMove's (28 art rows, no keys): 4 x 210 plus the
  HUD's 6 px gaps is 858 px, the window inside its insets. Under them a panel.shopCard as wide as the row on the ringed
  move, its line "Casts together with X."
- Pair (no bond yet): the first pick keeps a bond-pink cursor.ring while the yellow one moves to the second. Add (a bond
  of 2 or 3): the bond is lit in its pink rim as the target, not pickable; the ring moves over loose moves only.
- The last pick asks "Bond move?": Bond (Positive, a gain) and Cancel (Neutral), opening on Cancel since a bond cannot
  be undone. Cancel returns to the slots. Back (Neutral, Leave size, bottom right) returns to the team and is hidden
  when that step was skipped. No way to leave without bonding, as today.
- Board: tools/library/bond-draft.js (run-shops-draft.js's team row takes a brightness; forgetCard takes a move, line
  and width). Plan: docs/ASCII Concept Maps/155 - Bond Selection Layout.md. Applied at #126 (js/ui/run-ui.js showBond).

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md.
