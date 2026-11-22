---
title: "#155 run.hud.teamSlot: a two-type Pokemon's rim is first type left, second type right, the middle 25% dithered (Jess)"
date: 2026-11-20
issues: [155]
area: ui
canonical: "this file until #126 applies it; then docs/HUD-STYLE.md \"Roster, berry bag and run items\"."
---
# 2026-11-20: #155 run.hud.teamSlot: a two-type Pokemon's rim is first type left, second type right, the middle 25% dithered (Jess)

- The portrait stroke of the Pokemon out now stays its first type's base only (a split, a gradient and stepped bands were
  tried and dropped).
- A two-type Pokemon's panel.pixel rim takes the first type's ramp on the left and the second's on the right, joined by a
  dithered band across the middle 25% of the width (about 35 art px on the 139 art px box). Every rim pixel is one type's
  light, base or dark whole, never a mix, so it stays on the palette. The dither is shuffled per 8 px block, seeded, the top
  and bottom rows shuffled differently.
- Every two-type slot, not only the active one; fainted stays grey. One-type Pokemon are unchanged.
- Dropped: smooth and stepped gradients (a straight RGB mix greys the middle; a hue-wheel mix went rainbow) and a full-width
  dither (on the 1 px top and bottom rim it read as dashes).
- Applied at #126. Board: tools/library/hud-team-slot-draft.js (TEAM_SLOT.rimDither).

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md "Roster, berry bag and run items".
