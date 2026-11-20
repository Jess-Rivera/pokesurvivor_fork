# 2026-11-19: #155 run.hud.playerActive.bar is one B2 bar for HP and EXP; EXP leaves the portrait ring; HP numbers outside, centred, current HP held still (Jess)

- One bar: the healthBar and expBar sets fold into run.hud.playerActive.bar, built from B2's EXP version of the dark HP
  bar: one holder, the HP track on top, a two-row EXP strip under it. EXP moves off the portrait ring, so the portrait
  loses its ring.
- HP numbers stay outside the bar, centred on it, Silver 20 (the Pokemon tier). The current HP holds still: a box as wide
  as the max's digits, right-aligned, so only a new max (a level-up) moves the slash or the max.
- Night tuning (Claude Code): HP and EXP in 3 x 5 pixel letters, each on an ink plate; the HP track 5 rows (one shade row
  on top, two fill, two shade under), two checker rows down, the HP letters on its rows; one grey.ink row between the
  track and the EXP plate and strip; the strip two flat rows (light over dark, no pin stripes), beside the P's bowl, 3
  art pixels short of the HP track; the bar's bottom flat with a 2-row shadow; 426 px wide, the move slots' width.
- Not taken: numbers inside the holder (no room at 20 px); a 7-row track (grew the bar outward).
- Applied at #126. Board: tools/library/hud-exp-draft.js, hud-health-draft.js.

Canonical: js/ui/hud-player-panel.js header and docs/HUD-STYLE.md, once #126 applies it; until then this file.
