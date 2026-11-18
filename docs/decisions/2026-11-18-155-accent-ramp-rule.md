# 2026-11-18: #155 every accent colour is a 3-tone ramp worked out from its base (Jess)

- Every accent on Colours 2.0 Unified has three tones: light, base, dark. The base is the colour the game uses today;
  light and dark are worked out, never picked by hand.
- light = the base moved 35% of the way to white. This is exactly how the canon Scarlet/Violet type lights are made
  from their bases (checked against Fire, Electric, Water and Grass in tokens.js).
- dark = 55% of the base: HUD-STYLE "Ramps for new colours" (the B2 buttons' 55% step), the shade the game's
  rampedShade already computes for the effect chips.
- Fixed exception: EXP's dark is the canon SpA shade #0d7f9d (settled 2026-11-18, near-duplicate pairs).
- A new accent gets its ramp from this rule with no further choice. If a worked-out tone lands within about 2
  CIEDE2000 (3 in the older CIE76) of another colour, the two share one colour (shared darks) instead of keeping both.

Applied 2026-11-18 to the five accents (research report: 4 to 5 accent hues, about 12 to 15 colours). Superseded the
same day by docs/decisions/2026-11-18-155-unified-palette.md (6 ramps: red, green, blue, yellow, pink, teal); the rule
itself stands. The first table, for the record:

| Accent | light | base | dark |
| --- | --- | --- | --- |
| EXP | #59d2f7 | #00baf3 | #0d7f9d (SpA shade) |
| Cursor | #fff559 | #fff000 | #8c8400 |
| Teal | #74dfff | #29ceff | #17718c |
| Bonus | #ffe282 | #ffd23f | #8c7423 |
| Pause red | #db666b | #c8141c | #6e0b0f |

EXP also keeps its ring's empty grey (grey.mid #7f7f7f) outside the ramp. No new tone is under 3 delta E from another
board colour (nearest: EXP light 3.7 from the Ice base). Names come later. The game is unchanged until #126.

Canonical: tools/library.html, Colours 2.0 Unified (accentRamp, RAMP_LIGHT, RAMP_DARK). Research:
docs/ASCII Concept Maps/155 - Game UI Colour Count Research.html (2026-11-18).
