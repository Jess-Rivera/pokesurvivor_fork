# 2026-11-16: #148 catch tuning after the feel test: Steep star curve, early bonus x2 fading to x1, badge penalty unchanged (Jess)

- Star curve is Steep: 1 / 0.5 / 0.25 / 0.1 / 0.05 for 1 to 5 star (was 1 / 0.75 / 0.5 / 0.25, 5 star used the 4 star value).
  The feel test read the odds as far too high.
- Early World Level bonus starts at x2 at World Level 1 (was x3.4) and falls by the same step every level to x1 at World
  Level 13 (rescale, not a clip at x2, so there is no flat stretch at the top).
- Badge cap penalty stays as built, x1 at 0 badges under the cap. Reason: which Pokemon a rescue can be is set by time in
  the run and star, so the badges are not what keeps early catches fair.
- Expected (from the formula, Poke Ball, half the clock left, per encounter of 3 throws): 4 star 32% at World Level 1, 23%
  from World Level 13; 3 star 56% then 41%; 1 star still sure at World Level 1.

Plan: docs/ASCII Concept Maps/148 - Catch Odds Build Plan.md section 7. Supersedes the star values in
2026-11-16-148-catch-odds-mainline-shake-formula.
Canonical: js/systems/catch.js header and its ODDS table.
